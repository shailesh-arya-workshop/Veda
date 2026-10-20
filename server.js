// AI Everything Workspace — server (Node + Express, no build step)
// BYOK: API keys sirf request header `x-ai-keys` me aati hain
// (JSON: {gemini:[...], llama:"", custom:{baseUrl,key,model}}).
// Server keys ko kabhi save/log nahi karta; logs me key-like strings redact hoti hain.
// Endpoints: /api/health, /api/chat (SSE), /api/models, /api/news (RSS, keyless),
// /api/image (Pollinations proxy, keyless), /api/dl/* (yt-dlp), /api/pdf/merge.
// By Shailesh Arya.
"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { Readable } = require("stream");
const { PDFDocument } = require("pdf-lib");
const {
  fetchWithRetry, Breaker, geminiToOpenAI, pipeOpenAIAsGemini,
  GEMINI_MODELS, LLAMA_MODELS, LLAMA_BASE, LLAMA_MODEL_DEFAULT, GEMINI_API,
} = require("./providers");

const app = express();
const PORT = process.env.PORT || 3000;
const APP_NAME = "AI Everything Workspace";
const APP_VERSION = "1.0.0";

// ---------- log redaction: key-like strings kabhi log me nahi ----------
function redactStr(s) {
  return String(s)
    .replace(/AIza[0-9A-Za-z\-_]{10,}/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/(x-ai-keys|x-goog-api-key|api[-_ ]?key|token|secret|password)(["'\s:=]+)[A-Za-z0-9._\-]{6,}/gi, "$1$2[REDACTED]");
}
for (const m of ["log", "warn", "error"]) {
  const orig = console[m].bind(console);
  console[m] = (...args) => orig(...args.map((a) => (typeof a === "string" ? redactStr(a) : a)));
}

// ---------- yt-dlp boot check ----------
let YTDLP = false;
let YTDLP_VERSION = "";
try {
  const r = spawnSync("yt-dlp", ["--version"], { timeout: 8000, encoding: "utf8" });
  if (r.status === 0 && r.stdout) { YTDLP = true; YTDLP_VERSION = String(r.stdout).trim(); }
} catch {}

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(cors());
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "SAMEORIGIN",
    "Permissions-Policy": "microphone=(self), camera=(self), geolocation=()",
  });
  next();
});
app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "public"), { maxAge: "5m" }));

const ok = (res, obj) => res.json({ ok: true, ...obj });
const fail = (res, code, error, extra = {}) => res.status(code).json({ error, ...extra });

// ---------- rate limit (har IP+route par 1 minute me N request) ----------
const hits = new Map();
function limiter(max) {
  return (req, res, next) => {
    const k = (req.ip || "x") + "|" + req.path.split("/").slice(0, 3).join("/");
    const now = Date.now();
    const arr = (hits.get(k) || []).filter((t) => now - t < 60000);
    if (arr.length >= max) return fail(res, 429, "Bahut zyada request bhej di. Ek minute ruk kar dobara try karo.", { retryable: true });
    arr.push(now);
    hits.set(k, arr);
    next();
  };
}
const rateLimit = limiter(90);
const imgLimit = limiter(20);
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of hits) if (!arr.some((t) => now - t < 60000)) hits.delete(k);
}, 120000).unref();

// ---------- health / models ----------
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    name: APP_NAME,
    version: APP_VERSION,
    features: { ytdlp: YTDLP, chat: true, news: true, image: true, pdfMerge: true },
    time: new Date().toISOString(),
  });
});
app.get("/healthz", (req, res) => res.send("ok"));

app.get("/api/models", (req, res) => {
  ok(res, {
    providers: {
      gemini: GEMINI_MODELS,
      llama: LLAMA_MODELS,
      custom: [], // custom provider ka model user Settings me deta hai
    },
  });
});

// ---------- news: Google News RSS aggregation (keyless, 10-min in-memory cache) ----------
// Imaandaar label: ye RSS headlines hain, grounded search nahi.
const newsCache = new Map(); // "cat|lang" -> {t, data}
function newsFeedUrl(cat, lang) {
  const hl = lang === "hi" ? "hi" : "en-IN";
  const ceid = lang === "hi" ? "IN:hi" : "IN:en";
  const topics = {
    world: "world news", tech: "technology", sports: "sports", business: "business",
    entertainment: "entertainment", science: "science", health: "health",
  };
  if (!cat || cat === "india" || cat === "top") return "https://news.google.com/rss?hl=" + hl + "&gl=IN&ceid=" + ceid;
  const q = topics[cat] || cat;
  return "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=" + hl + "&gl=IN&ceid=" + ceid;
}
const unesc = (s) => String(s || "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
function parseRss(xml, limit) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < limit) {
    const b = m[1];
    const pick = (tag) => { const x = b.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">")); return x ? unesc(x[1]) : ""; };
    const src = b.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const title = pick("title");
    if (!title) continue;
    const pd = pick("pubDate");
    const d = pd ? new Date(pd) : null;
    items.push({ title, link: pick("link"), source: src ? unesc(src[1]) : "", time: d && !isNaN(d) ? d.toISOString() : pd });
  }
  return items;
}
app.get("/api/news", rateLimit, async (req, res) => {
  try {
    const cat = String(req.query.cat || "india").toLowerCase().slice(0, 30);
    const lang = String(req.query.lang || "hi").toLowerCase() === "en" ? "en" : "hi";
    const ck = cat + "|" + lang;
    const c = newsCache.get(ck);
    if (c && Date.now() - c.t < 10 * 60 * 1000) return ok(res, { ...c.data, cached: true });
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 15000);
    let xml;
    try {
      const r = await fetch(newsFeedUrl(cat, lang), { signal: ctrl.signal, headers: { "User-Agent": "AIEverything/1.0" } });
      clearTimeout(to);
      if (!r.ok) return fail(res, 502, "News feed abhi nahi mil paayi (" + r.status + "). Thodi der baad try karo.", { retryable: true });
      xml = await r.text();
    } catch {
      clearTimeout(to);
      return fail(res, 502, "News feed tak pahunch nahi paaye. Internet check karo.", { retryable: true });
    }
    const items = parseRss(xml, 30);
    if (!items.length) return fail(res, 502, "News feed khali mili. Thodi der baad try karo.", { retryable: true });
    const data = { cat, lang, label: "Google News RSS headlines", fetchedAt: new Date().toISOString(), items };
    newsCache.set(ck, { t: Date.now(), data });
    ok(res, { ...data, cached: false });
  } catch (e) {
    fail(res, 500, "News lane me dikkat aayi: " + String((e && e.message) || e).slice(0, 140));
  }
});

// ---------- BYOK keys: sirf x-ai-keys header se; kabhi store/log nahi ----------
function parseKeys(req) {
  const out = { gemini: [], llama: "", custom: null };
  try {
    const raw = req.get("x-ai-keys");
    if (!raw) return out;
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object") return out;
    if (j.gemini) out.gemini = (Array.isArray(j.gemini) ? j.gemini : [j.gemini]).map((s) => String(s || "").trim()).filter(Boolean).slice(0, 5);
    if (typeof j.llama === "string") out.llama = j.llama.trim();
    if (j.custom && typeof j.custom === "object") {
      out.custom = {
        baseUrl: String(j.custom.baseUrl || "").trim().replace(/\/+$/, ""),
        key: String(j.custom.key || "").trim(),
        model: String(j.custom.model || "").trim(),
      };
    }
  } catch {}
  return out;
}
const NO_KEY = (res) => res.status(402).json({ error: "NO_KEY", message: "Settings me apni API key daalo" });

function sseHeaders(res, modelUsed, providerName) {
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    "X-Model-Used": modelUsed || "",
    "X-Provider": providerName || "",
    "Access-Control-Expose-Headers": "X-Model-Used, X-Provider",
  });
  if (res.flushHeaders) res.flushHeaders();
}
function sseError(res, modelUsed, providerName, obj) {
  if (!res.headersSent) sseHeaders(res, modelUsed, providerName);
  res.write("data: " + JSON.stringify(obj) + "\n\n");
  res.end();
}
async function errText(r) {
  try {
    const j = await r.json();
    return (j.error && j.error.message) || JSON.stringify(j).slice(0, 300);
  } catch {
    return "HTTP " + r.status;
  }
}

// OpenAI-style messages -> Gemini-style contents (dono client format chalein;
// images data URL se inlineData me badalte hain)
function messagesToContents(messages) {
  const contents = [];
  let system = "";
  for (const m of messages || []) {
    if (!m) continue;
    if (m.role === "system") {
      if (typeof m.content === "string") system += (system ? "\n" : "") + m.content;
      continue;
    }
    const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
    const parts = [];
    if (typeof m.content === "string") parts.push({ text: m.content });
    else if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (!p) continue;
        if (p.type === "text" && typeof p.text === "string") parts.push({ text: p.text });
        else if (p.type === "image_url" && p.image_url && typeof p.image_url.url === "string") {
          const mm = p.image_url.url.match(/^data:([^;,]+);base64,([\s\S]+)$/);
          if (mm) parts.push({ inlineData: { mimeType: mm[1], data: mm[2] } });
        }
      }
    }
    if (parts.length) contents.push({ role, parts });
  }
  return { contents, system };
}

const breakers = { gemini: new Breaker("gemini"), llama: new Breaker("llama"), custom: new Breaker("custom") };

// ---------- chat (SSE streaming) ----------
app.post("/api/chat", rateLimit, async (req, res) => {
  try {
    const keys = parseKeys(req);
    const body = req.body || {};
    let contents = Array.isArray(body.contents) && body.contents.length ? body.contents : null;
    let system = typeof body.system === "string" ? body.system : "";
    if (!contents && Array.isArray(body.messages)) {
      const conv = messagesToContents(body.messages);
      contents = conv.contents;
      if (!system) system = conv.system;
    }
    if (!contents || !contents.length) return fail(res, 400, "Khali message bheja gaya.");

    const wantProv = String(body.provider || "").toLowerCase();
    const provider = ["gemini", "llama", "custom"].includes(wantProv)
      ? wantProv
      : (keys.custom && keys.custom.baseUrl && keys.custom.key ? "custom" : (keys.llama ? "llama" : "gemini"));
    const breaker = breakers[provider];
    if (!breaker.canRun()) return fail(res, 503, "AI service abhi bahut busy hai. Ek minute baad dobara try karo.", { retryable: true });

    const temperature = typeof body.temperature === "number" ? body.temperature : 0.7;
    const controller = new AbortController();
    res.on("close", () => controller.abort());

    // ================= Gemini: multi-key failover + 429 -> next model =================
    if (provider === "gemini") {
      if (!keys.gemini.length) return NO_KEY(res); // key nahi -> turant 402, hang nahi
      const want = body.model && body.model !== "auto" ? String(body.model) : null;
      const candidates = [...new Set(want ? [want, ...GEMINI_MODELS] : GEMINI_MODELS)].slice(0, 3);
      const gBody = {
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: { temperature, maxOutputTokens: 65536 },
      };
      const tried = [];
      let lastErr = "";
      let allQuota = true;
      for (const key of keys.gemini) {
        let keyDead = false;
        for (const m of candidates) {
          if (!tried.includes(m)) tried.push(m);
          let up;
          try {
            // skip429: is model ko retry karna storm hai — turant agla model/key
            up = await fetchWithRetry(GEMINI_API + "/models/" + m + ":streamGenerateContent?alt=sse",
              { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(gBody) },
              { retries: 2, skip429: true, timeoutMs: 60000 });
          } catch (e) {
            if (controller.signal.aborted) return;
            lastErr = m + ": " + String((e && e.message) || e).slice(0, 120);
            allQuota = false;
            continue;
          }
          if (up.ok) {
            breaker.ok();
            sseHeaders(res, m, "gemini");
            Readable.fromWeb(up.body).pipe(res);
            return;
          }
          lastErr = m + ": " + (await errText(up));
          if (up.status === 429) continue; // is model ka quota khatm -> agla model (max 3)
          allQuota = false;
          if (up.status === 401 || up.status === 403) { keyDead = true; break; } // key galat -> agli key
          if (up.status === 404) continue; // model nahi mila -> agla model
          if (up.status === 400) return fail(res, 400, lastErr);
          // 5xx: fetchWithRetry pehle hi retry kar chuka hai -> agla model
        }
        if (keyDead) allQuota = false;
      }
      breaker.fail();
      if (allQuota && tried.length) {
        return sseError(res, "", "gemini", {
          error: "API quota khatm (free limit) — saare models/keys try kiye gaye. Thodi der baad try karo ya doosri key daalo.",
          retryable: false, tried,
        });
      }
      return fail(res, 502, "AI service abhi busy hai. Thodi der baad dobara try karo. (" + String(lastErr).slice(0, 160) + ")", { retryable: true, tried });
    }

    // ================= OpenAI-compatible: Meta Llama / custom =================
    const isLlama = provider === "llama";
    const base = isLlama ? LLAMA_BASE : keys.custom.baseUrl;
    const key = isLlama ? keys.llama : keys.custom.key;
    const model = isLlama
      ? (body.model && body.model !== "auto" ? String(body.model) : LLAMA_MODEL_DEFAULT)
      : (keys.custom.model || (body.model && body.model !== "auto" ? String(body.model) : ""));
    if (!key || !base || !model) return NO_KEY(res);
    const oBody = { model, messages: geminiToOpenAI(contents, system), temperature, stream: true };
    let up;
    try {
      up = await fetchWithRetry(base.replace(/\/+$/, "") + "/chat/completions",
        { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify(oBody) },
        { retries: 1, skip429: true, timeoutMs: 60000 });
    } catch (e) {
      breaker.fail();
      if (controller.signal.aborted) return;
      return fail(res, 502, "AI API tak pahunch nahi paaye: " + String((e && e.message) || e).slice(0, 160), { retryable: true });
    }
    if (!up.ok) {
      const msg = await errText(up);
      if (up.status === 429) {
        breaker.fail();
        return sseError(res, model, provider, { error: "Rate limit / quota (429): " + msg, retryable: false, tried: [model] });
      }
      if (up.status === 401 || up.status === 403) return fail(res, up.status, "API key galat ya permission nahi: " + msg);
      if (up.status === 400) return fail(res, 400, msg);
      breaker.fail();
      return fail(res, 502, "AI API se jawab nahi aaya (" + up.status + "): " + msg, { retryable: true });
    }
    breaker.ok();
    sseHeaders(res, model, provider);
    await pipeOpenAIAsGemini(up, res);
  } catch (e) {
    if (!res.headersSent) fail(res, 500, "Server me gadbad hui: " + String((e && e.message) || e).slice(0, 160));
  }
});

// ---------- image: Pollinations proxy (keyless, bytes stream) ----------
// arya-ai v1.3 me proven approach; credit burn yahan nahi, client side hoga.
app.get("/api/image", imgLimit, async (req, res) => {
  const prompt = String(req.query.prompt || "").slice(0, 600).trim();
  if (!prompt) return fail(res, 400, "Prompt khali hai.");
  const w = Math.min(Math.max(parseInt(req.query.w) || 1024, 256), 2048);
  const h = Math.min(Math.max(parseInt(req.query.h) || 1024, 256), 2048);
  const seed = parseInt(req.query.seed) || Math.floor(Math.random() * 1e9);
  const url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) + "?width=" + w + "&height=" + h + "&seed=" + seed + "&nologo=true&model=flux";
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 110000);
  try {
    const up = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "AIEverything/1.0" } });
    clearTimeout(to);
    if (!up.ok) return fail(res, 502, "Image service se jawab nahi aaya, dobara try karo.");
    const buf = Buffer.from(await up.arrayBuffer());
    if (buf.length < 5000) return fail(res, 502, "Image bani nahi, dobara try karo.");
    res.set({ "Content-Type": up.headers.get("content-type") || "image/jpeg", "Cache-Control": "no-store", "Content-Length": String(buf.length) });
    res.send(buf);
  } catch (e) {
    clearTimeout(to);
    if (controller.signal.aborted) return fail(res, 504, "Image banne me bahut time laga, dobara try karo.");
    fail(res, 502, "Image banate waqt dikkat aayi.");
  }
});

// ---------- downloader (yt-dlp) — downloader-app v1.1 se proven logic ----------
// yt-dlp binary sirf Docker image me hota hai (Dockerfile dekho). Render free
// Node env par ye 501 dega — kabhi nakli download link nahi banayega.
const FORMAT_RE = /^[A-Za-z0-9][A-Za-z0-9_\-+]*$/;
const DL_501 = (res) => res.status(501).json({ error: "YTDLP_MISSING", message: "Server par yt-dlp nahi hai — Docker deploy chahiye (Dockerfile included)" });
function cleanUrl(u) {
  const s = String(u || "").trim();
  if (!s || s.length > 2000) return null;
  try {
    const x = new URL(s);
    return (x.protocol === "http:" || x.protocol === "https:") ? x.href : null;
  } catch { return null; }
}
const isYouTube = (u) => /(^|\.)(youtube\.com|youtu\.be)$/i.test(new URL(u).hostname);
function platformOf(u) {
  const h = new URL(u).hostname.toLowerCase();
  if (/youtube|youtu\.be/.test(h)) return "YouTube";
  if (/instagram/.test(h)) return "Instagram";
  if (/pinterest|pin\.it/.test(h)) return "Pinterest";
  if (/facebook|fb\.watch/.test(h)) return "Facebook";
  if (/tiktok/.test(h)) return "TikTok";
  return h;
}
function shortErr(m) {
  m = String(m || "");
  if (/not a bot|sign in to confirm/i.test(m)) return "YouTube ne server ko temporarily rok diya hai. Thodi der baad dobara try karo.";
  if (/private|login|cookies/i.test(m)) return "Ye private/login wala content hai — public link try karo.";
  if (/unsupported url|no video|not available/i.test(m)) return "Is link se video nahi mili. Link sahi hai?";
  if (/timed out|timeout/i.test(m)) return "Site se jawab nahi aaya. Dobara try karo.";
  if (/429|too many requests/i.test(m)) return "Site ne thodi der ke liye roka hai. 2-3 minute baad try karo.";
  return m.slice(0, 140) || "Pata nahi chala.";
}
function ytdlp(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const p = spawn("yt-dlp", args, { timeout: timeoutMs || 60000 });
    let out = "", err = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(err.slice(-600) || ("yt-dlp exit " + code)));
    });
  });
}
// yt-dlp formats -> saaf quality list (single file: audio+video dono wale)
function pickQualities(formats) {
  const seen = new Map();
  for (const f of formats || []) {
    if (!f || !f.url) continue;
    if (!f.vcodec || f.vcodec === "none" || !f.acodec || f.acodec === "none") continue;
    const h = Number(f.height) || 0;
    if (!h) continue;
    const score = (f.ext === "mp4" ? 2 : 1) + (Number(f.tbr) || 0) / 100000;
    const cur = seen.get(h);
    if (!cur || score > cur._s) seen.set(h, { ...f, _s: score });
  }
  return [...seen.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([h, f]) => ({
      id: String(f.format_id),
      label: h >= 2160 ? "4K" : h + "p",
      ext: f.ext || "mp4",
      size: f.filesize || f.filesize_approx || 0,
    }));
}
function pickAudio(formats) {
  const auds = (formats || [])
    .filter((f) => f && f.url && (!f.vcodec || f.vcodec === "none") && f.acodec && f.acodec !== "none")
    .sort((a, b) => (Number(b.abr) || 0) - (Number(a.abr) || 0));
  const a = auds[0];
  if (!a) return null;
  return {
    id: String(a.format_id),
    label: "Audio" + (a.abr ? " (" + Math.round(Number(a.abr)) + "kbps)" : ""),
    ext: a.ext || "m4a",
    size: a.filesize || a.filesize_approx || 0,
  };
}

// Link se info: title, thumbnail, qualities.
// v1.1 proven: YouTube par android player client (bot-check bypass karta hai, 360p merged deta hai)
app.post("/api/dl/info", rateLimit, async (req, res) => {
  if (!YTDLP) return DL_501(res);
  const url = cleanUrl(req.body && req.body.url);
  if (!url) return fail(res, 400, "Ye link support nahi hota. YouTube / Instagram / Pinterest / Facebook / TikTok ka link do.");
  const ytClient = isYouTube(url) ? "android" : "default";
  const extra = ytClient === "android" ? ["--extractor-args", "youtube:player_client=android"] : [];
  try {
    const raw = await ytdlp(["--dump-json", "--no-playlist", "--no-warnings", "--socket-timeout", "20", ...extra, url], 90000);
    const j = JSON.parse(raw);
    ok(res, {
      title: j.title || "Video",
      thumbnail: j.thumbnail || null,
      duration: Math.round(Number(j.duration) || 0),
      uploader: j.uploader || j.channel || "",
      platform: platformOf(url),
      ytClient,
      qualities: pickQualities(j.formats),
      audio: pickAudio(j.formats),
    });
  } catch (e) {
    fail(res, 502, "Link se info nahi nikli: " + shortErr(e.message));
  }
});

// Quality -> seedha download link (client seedha CDN se download karega = tez)
// v1.1 proven: ytClient (android) resolve me bhi lagta hai
app.get("/api/dl/resolve", rateLimit, async (req, res) => {
  if (!YTDLP) return DL_501(res);
  const url = cleanUrl(req.query.url);
  const fid = String(req.query.format_id || "");
  const ytClient = String(req.query.ytClient || "default");
  if (!url) return fail(res, 400, "Link support nahi hota.");
  if (!FORMAT_RE.test(fid) || fid.length > 40) return fail(res, 400, "Galat format.");
  try {
    const args = ["-g", "-f", fid, "--no-playlist", "--no-warnings", "--socket-timeout", "20"];
    if (ytClient === "android" && isYouTube(url)) args.push("--extractor-args", "youtube:player_client=android");
    args.push(url);
    const raw = await ytdlp(args, 90000);
    const direct = raw.split("\n").map((s) => s.trim()).filter(Boolean)[0];
    if (!direct || !/^https?:\/\//.test(direct)) throw new Error("Direct link nahi mila.");
    ok(res, { url: direct });
  } catch (e) {
    fail(res, 502, "Download link nahi bana: " + shortErr(e.message));
  }
});

// Direct file URL ka proxy download (yt-dlp ki zaroorat nahi), ~100MB size cap
app.get("/api/dl/file", rateLimit, async (req, res) => {
  const url = cleanUrl(req.query.url);
  if (!url) return fail(res, 400, "Sahi http(s) file URL do.");
  const CAP = 100 * 1024 * 1024;
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 120000);
  try {
    const up = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "AIEverything/1.0" }, redirect: "follow" });
    if (!up.ok) { clearTimeout(to); return fail(res, 502, "File nahi mili (" + up.status + ")."); }
    const len = Number(up.headers.get("content-length") || 0);
    if (len > CAP) { clearTimeout(to); return fail(res, 413, "File bahut badi hai (100MB tak)."); }
    let fname = "download";
    try { fname = decodeURIComponent(new URL(url).pathname.split("/").pop() || "download"); } catch {}
    fname = fname.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "download";
    res.set({
      "Content-Type": up.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": 'attachment; filename="' + fname + '"',
      ...(len ? { "Content-Length": String(len) } : {}),
    });
    let sent = 0;
    const src = Readable.fromWeb(up.body);
    src.on("data", (chunk) => {
      sent += chunk.length;
      if (sent > CAP) { src.destroy(); controller.abort(); res.destroy(); }
    });
    src.on("end", () => clearTimeout(to));
    src.on("error", () => { clearTimeout(to); if (!res.writableEnded) res.destroy(); });
    src.pipe(res);
  } catch (e) {
    clearTimeout(to);
    if (!res.headersSent) fail(res, 502, "File download nahi ho paayi: " + String((e && e.message) || e).slice(0, 120));
  }
});

// ---------- PDF merge (pdf-lib, server-side) ----------
app.post("/api/pdf/merge", rateLimit, async (req, res) => {
  try {
    const pdfs = (req.body && req.body.pdfs) || [];
    if (!Array.isArray(pdfs) || pdfs.length < 2) return fail(res, 400, "Kam se kam 2 PDF chahiye.");
    if (pdfs.length > 20) return fail(res, 400, "Ek baar me 20 PDF tak.");
    const out = await PDFDocument.create();
    for (const b64 of pdfs) {
      const buf = Buffer.from(String(b64 || ""), "base64");
      if (!buf.length || buf.length > 15 * 1024 * 1024) return fail(res, 400, "Ek PDF 15MB se badi hai ya khali hai.");
      if (!(buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) return fail(res, 400, "Ek file PDF nahi hai (%PDF signature nahi mila).");
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      for (const p of pages) out.addPage(p);
    }
    const bytes = await out.save();
    ok(res, { pdf: Buffer.from(bytes).toString("base64"), pages: out.getPageCount(), bytes: bytes.length });
  } catch (e) {
    fail(res, 400, "PDF merge nahi ho paaya: " + String((e && e.message) || e).slice(0, 160));
  }
});

// ---------- errors ----------
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const tooBig = err && err.type === "entity.too.large";
  fail(res, tooBig ? 413 : 400, tooBig ? "Data bahut bada hai (25MB se kam rakho)." : "Request sahi nahi thi.");
});

// ---------- boot ----------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(APP_NAME + " v" + APP_VERSION + " chal raha hai: port " + PORT + " (BYOK mode — server par koi key nahi; yt-dlp: " + (YTDLP ? YTDLP_VERSION : "nahi mila") + ")");
  });
}
module.exports = app;

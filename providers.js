// providers.js — provider client logic (SERVER-SIDE ONLY)
// Ported from the proven Veda AI providers: fetchWithRetry (exponential
// backoff + jitter + per-attempt timeout, skip429), circuit breaker, and
// Gemini <-> OpenAI message/stream translation.
// No API key is ever stored, logged, or sent anywhere except upstream.
"use strict";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function backoffMs(attempt, base = 800, cap = 8000) {
  return Math.min(cap, base * 2 ** attempt) + Math.random() * 400;
}
function retryableStatus(s) {
  return s === 408 || s === 425 || s === 429 || s >= 500;
}

// Transient failure (429/5xx/network/timeout) par retry; fatal 4xx turant.
// skip429: quota retry bekaar hai — turant return, caller agla model/key try karega.
async function fetchWithRetry(url, opts = {}, { retries = 3, baseMs = 800, skip429 = false, timeoutMs = 0 } = {}) {
  const signal = opts.signal;
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    if (signal && signal.aborted) throw new DOMException("aborted", "AbortError");
    let to = null, useSignal = signal;
    if (timeoutMs > 0) {
      const ctrl = new AbortController();
      to = setTimeout(() => { try { ctrl.abort(new DOMException("timeout", "TimeoutError")); } catch {} }, timeoutMs);
      if (signal) {
        if (signal.aborted) { clearTimeout(to); throw new DOMException("aborted", "AbortError"); }
        useSignal = ctrl.signal;
        signal.addEventListener("abort", () => { try { ctrl.abort(signal.reason); } catch {} }, { once: true });
      } else {
        useSignal = ctrl.signal;
      }
    }
    try {
      const r = await fetch(url, useSignal ? { ...opts, signal: useSignal } : opts);
      if (to) clearTimeout(to);
      if (r.status === 429 && skip429) return r;
      if (retryableStatus(r.status) && i < retries) {
        try { await r.arrayBuffer(); } catch {}
        await sleep(backoffMs(i, baseMs));
        continue;
      }
      return r;
    } catch (e) {
      if (to) clearTimeout(to);
      lastErr = e;
      if (signal && signal.aborted) throw e;
      if (e && (e.name === "TimeoutError" || e.name === "AbortError") && i < retries) {
        await sleep(backoffMs(i, baseMs));
        continue;
      }
      if (i < retries && !(e && e.name === "AbortError")) { await sleep(backoffMs(i, baseMs)); continue; }
      throw e;
    }
  }
  throw lastErr || new Error("request failed");
}

// Circuit breaker: lagatar failures par provider cooldown, request storm se bachav.
class Breaker {
  constructor(name, { threshold = 5, cooldownMs = 60000 } = {}) {
    this.name = name; this.threshold = threshold; this.cooldownMs = cooldownMs;
    this.failures = 0; this.openedAt = 0;
  }
  canRun() {
    if (!this.openedAt) return true;
    if (Date.now() - this.openedAt > this.cooldownMs) { this.openedAt = 0; this.failures = 0; return true; }
    return false;
  }
  ok() { this.failures = 0; this.openedAt = 0; }
  fail() { if (++this.failures >= this.threshold) this.openedAt = Date.now(); }
}

// ---------- model lists (static; /api/models ke liye, key nahi chahiye) ----------
const GEMINI_MODELS = [
  "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro",
  "gemini-2.0-flash", "gemini-flash-latest", "gemini-flash-lite-latest",
];
const LLAMA_MODELS = [
  "Llama-4-Maverick-17B-128E-Instruct-FP8",
  "Llama-4-Scout-17B-16E-Instruct-FP8",
  "Llama-3.3-70B-Instruct",
];
const LLAMA_BASE = process.env.LLAMA_API_BASE || "https://api.meta.ai/v1";
const LLAMA_MODEL_DEFAULT = LLAMA_MODELS[0];
const GEMINI_API = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta";

// ---------- Gemini <-> OpenAI translation ----------
function geminiToOpenAI(contents, system) {
  const msgs = [];
  if (system) msgs.push({ role: "system", content: system });
  for (const c of contents || []) {
    const role = c.role === "model" ? "assistant" : "user";
    const parts = [];
    for (const p of c.parts || []) {
      if (typeof p.text === "string") parts.push({ type: "text", text: p.text });
      else if (p.inlineData || p.inline_data) {
        const d = p.inlineData || p.inline_data;
        const mime = d.mimeType || d.mime_type || "image/jpeg";
        parts.push({ type: "image_url", image_url: { url: `data:${mime};base64,${d.data}` } });
      }
    }
    if (parts.length === 1 && parts[0].type === "text") msgs.push({ role, content: parts[0].text });
    else if (parts.length) msgs.push({ role, content: parts });
  }
  return msgs;
}

// OpenAI-compatible SSE stream ko Gemini-shaped SSE me translate karke pipe karo,
// taaki client ek hi format samjhe.
async function pipeOpenAIAsGemini(upstreamRes, clientRes) {
  const reader = upstreamRes.body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = "";
  const send = (obj) => clientRes.write(enc.encode("data: " + JSON.stringify(obj) + "\n\n"));
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const j = JSON.parse(d);
          const ch = (j.choices || [])[0] || {};
          const text = (ch.delta && ch.delta.content) || (ch.message && ch.message.content) || "";
          if (text) send({ candidates: [{ content: { parts: [{ text }], role: "model" } }] });
          if (ch.finish_reason) {
            send({ candidates: [{ finishReason: ch.finish_reason === "length" ? "MAX_TOKENS" : "STOP" }] });
          }
        } catch {}
      }
    }
  } finally {
    try { reader.releaseLock(); } catch {}
    if (!clientRes.writableEnded) clientRes.end();
  }
}

module.exports = {
  fetchWithRetry, backoffMs, retryableStatus, Breaker,
  geminiToOpenAI, pipeOpenAIAsGemini,
  GEMINI_MODELS, LLAMA_MODELS, LLAMA_BASE, LLAMA_MODEL_DEFAULT, GEMINI_API,
};

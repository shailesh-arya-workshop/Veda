/* =========================================================================
 * AI Everything Workspace — TOOLS shared utilities (_shared.js)
 * Subagent C (tools views). Must load BEFORE other tool files (or via
 * their defensive tsReady() bootstrap). Exposes window.TS.
 *
 * Provides: App-ready registration queue, Hindi-first styled components
 * (ts-* CSS), blob download, VPDF/pdflib/pdf.js lazy loaders,
 * VPDF-HTML -> real PDF bytes (SVG foreignObject -> canvas -> pdf-lib,
 * same proven approach as Veda AI v1.1), library save helper,
 * chat-key detection + /api/chat call for generators.
 * ========================================================================= */
(function () {
  "use strict";
  if (window.TS && window.TS.__v === 3) return;
  var BASE = (function () {
    try {
      var cs = document.currentScript;
      if (cs && cs.src) return cs.src.replace(/[^\/]*$/, "");
    } catch (e) {}
    return "js/tools/";
  })();
  var VENDOR_BASES = [BASE + "../../vendor/", BASE + "../vendor/", "vendor/", "js/vendor/", "../vendor/"];

  /* ----------------------------- CSS (ts-*) ----------------------------- */
  var CSS =
    ".ts-wrap{max-width:820px;margin:0 auto;padding:12px 12px 40px;color:var(--ts-ink,#141414);}" +
    ".ts-h{font-size:1.25rem;font-weight:800;margin:4px 0 2px;}" +
    ".ts-sub{font-size:.86rem;opacity:.72;margin:0 0 12px;line-height:1.5;}" +
    ".ts-card{background:var(--ts-card,#ffffff);border:1px solid var(--ts-line,#e4d9b8);border-radius:14px;padding:14px;margin:12px 0;box-shadow:0 2px 10px rgba(0,0,0,.05);}" +
    ".ts-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 10px;margin-bottom:4px;-webkit-overflow-scrolling:touch;}" +
    ".ts-tab{flex:0 0 auto;border:1.5px solid #d9c88a;background:#fff8e6;border-radius:999px;padding:8px 14px;font-size:.85rem;font-weight:700;cursor:pointer;color:#5b4a12;}" +
    ".ts-tab.on{background:linear-gradient(135deg,#f5d76e,#e8b93c);color:#231a00;border-color:#b8912a;box-shadow:0 2px 8px rgba(184,145,42,.35);}" +
    ".ts-lab{display:block;font-size:.82rem;font-weight:700;margin:10px 0 5px;color:#3d3208;}" +
    ".ts-in,.ts-sel,.ts-ta{width:100%;box-sizing:border-box;border:1.5px solid #d9c88a;border-radius:10px;padding:10px 12px;font-size:.92rem;background:#fffdf6;color:#141414;font-family:inherit;}" +
    ".ts-ta{min-height:130px;resize:vertical;line-height:1.6;}" +
    ".ts-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0;}" +
    ".ts-btn{border:none;border-radius:10px;padding:11px 18px;font-size:.92rem;font-weight:800;cursor:pointer;background:linear-gradient(135deg,#f5d76e,#e8b93c);color:#231a00;box-shadow:0 2px 8px rgba(184,145,42,.35);}" +
    ".ts-btn:active{transform:scale(.98);}" +
    ".ts-btn.sec{background:#f4f1e6;color:#3d3208;box-shadow:none;border:1.5px solid #d9c88a;}" +
    ".ts-btn.dark{background:#1c1c1e;color:#f5d76e;box-shadow:none;}" +
    ".ts-btn[disabled]{opacity:.45;cursor:not-allowed;box-shadow:none;}" +
    ".ts-btn.sm{padding:7px 12px;font-size:.8rem;}" +
    ".ts-st{font-size:.85rem;line-height:1.55;margin:10px 0;padding:10px 12px;border-radius:10px;background:#fff8e6;border:1px dashed #c9a227;color:#4a3c0c;}" +
    ".ts-st.err{background:#fdecea;border-color:#c0392b;color:#7a1f14;}" +
    ".ts-st.ok{background:#e7f5ef;border-color:#1f7a5c;color:#145a43;}" +
    ".ts-note{font-size:.8rem;opacity:.75;line-height:1.55;margin:8px 0;}" +
    ".ts-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}" +
    ".ts-kv{display:flex;justify-content:space-between;font-size:.85rem;padding:5px 0;border-bottom:1px dotted #e0d3a1;}" +
    ".ts-prog{height:10px;border-radius:6px;background:#eee4c2;overflow:hidden;margin:8px 0;}" +
    ".ts-prog>div{height:100%;width:0;background:linear-gradient(90deg,#e8b93c,#f5d76e);transition:width .25s;}" +
    ".ts-out{white-space:pre-wrap;word-break:break-word;background:#14161b;color:#e8ecf4;border-radius:10px;padding:12px;font-size:.85rem;line-height:1.6;max-height:320px;overflow:auto;margin:10px 0;font-family:ui-monospace,Menlo,Consolas,monospace;}" +
    ".ts-tbl{width:100%;border-collapse:collapse;font-size:.82rem;margin:10px 0;}" +
    ".ts-tbl th{background:#231a00;color:#f5d76e;padding:7px 9px;text-align:left;position:sticky;top:0;}" +
    ".ts-tbl td{padding:6px 9px;border-bottom:1px solid #eee4c2;}" +
    ".ts-tblwrap{overflow:auto;max-height:300px;border:1px solid #eee4c2;border-radius:10px;}" +
    ".ts-file{display:block;width:100%;box-sizing:border-box;border:2px dashed #c9a227;border-radius:12px;padding:18px 12px;text-align:center;background:#fffdf6;font-size:.88rem;color:#4a3c0c;cursor:pointer;}" +
    ".ts-chip{display:inline-block;background:#f4f1e6;border:1px solid #d9c88a;border-radius:999px;padding:4px 12px;font-size:.78rem;margin:2px 4px 2px 0;}" +
    "canvas.ts-cv{max-width:100%;border-radius:10px;border:1px solid #e0d3a1;background:#fff;}" +
    "@media (max-width:560px){.ts-grid2{grid-template-columns:1fr;}}";
  function injectCss() {
    if (document.getElementById("ts-style")) return;
    var s = document.createElement("style");
    s.id = "ts-style"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ----------------------- App registration queue ----------------------- */
  var queue = [];
  function flushQueue() {
    if (!window.App || !App.registerView) return false;
    while (queue.length) {
      var r = queue.shift();
      try { App.registerView(r.id, r.def); } catch (e) { console.error("[TS] registerView fail:", r.id, e); }
    }
    return true;
  }
  function reg(id, def) { queue.push({ id: id, def: def }); if (!flushQueue()) setTimeout(flushQueue, 800); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", flushQueue);
  setTimeout(flushQueue, 1500);

  /* ------------------------------- DOM ---------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function tabs(host, names, onPick) {
    var bar = el("div", "ts-tabs");
    names.forEach(function (n, i) {
      var b = el("button", "ts-tab" + (i === 0 ? " on" : ""), esc(n));
      b.type = "button";
      b.onclick = function () {
        bar.querySelectorAll(".ts-tab").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on"); onPick(i, b);
      };
      bar.appendChild(b);
    });
    host.appendChild(bar);
    return bar;
  }
  function status(host, msg, kind) {
    var s = el("div", "ts-st" + (kind ? " " + kind : ""), esc(msg));
    host.appendChild(s);
    return s;
  }

  /* ------------------------------ notify -------------------------------- */
  function notify(t, b) {
    try { if (window.App && App.notify) { App.notify(t, b); return; } } catch (e) {}
    try { alert(t + (b ? "\n" + b : "")); } catch (e2) {}
  }

  /* ------------------------------ download ------------------------------ */
  function downloadBlob(name, blob) {
    var a = document.createElement("a");
    var url = URL.createObjectURL(blob);
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  function safeName(s, ext) {
    s = String(s || "document").trim().replace(/[^\w\u0900-\u097F\- ]+/g, "").replace(/\s+/g, "-").slice(0, 60) || "document";
    return s + (ext || "");
  }

  /* ------------------------------ loaders ------------------------------- */
  function loadScript(url) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + url + '"]')) return res();
      var s = document.createElement("script");
      s.src = url; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { s.remove(); rej(new Error("load fail: " + url)); };
      document.head.appendChild(s);
    });
  }
  function loadFirst(urls) {
    var p = Promise.reject(new Error("none"));
    urls.forEach(function (u) { p = p.catch(function () { return loadScript(u); }); });
    return p;
  }
  function cand(file) { return VENDOR_BASES.map(function (b) { return b + file; }); }

  var vpdfP = null;
  function ensureVpdf() {
    if (window.VPDF) return Promise.resolve(window.VPDF);
    if (!vpdfP) {
      vpdfP = loadFirst(cand("vpdf.js").concat([BASE + "vpdf.js", "js/tools/vpdf.js"]))
        .then(function () { if (!window.VPDF) throw new Error("VPDF load nahi hua"); return window.VPDF; })
        .catch(function (e) { vpdfP = null; throw e; });
    }
    return vpdfP;
  }
  var pdflibP = null;
  function ensurePdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!pdflibP) {
      pdflibP = loadFirst(cand("pdf-lib.min.js").concat([
        "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
        "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"
      ])).then(function () {
        if (!window.PDFLib) throw new Error("pdf-lib load nahi hua");
        return window.PDFLib;
      }).catch(function (e) { pdflibP = null; throw e; });
    }
    return pdflibP;
  }
  var pdfjsP = null;
  function ensurePdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfjsP) {
      pdfjsP = loadFirst(cand("pdf.min.js").concat(["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"]))
        .then(function () {
          var wsrc = null;
          var tryW = cand("pdf.worker.min.js").concat(["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"]);
          try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = tryW[0]; wsrc = tryW[0]; } catch (e) {}
          return window.pdfjsLib;
        }).catch(function (e) { pdfjsP = null; throw e; });
    }
    return pdfjsP;
  }

  /* ------------------ VPDF HTML -> real PDF bytes (pdf-lib) ------------- */
  function xhtmlOf(html) {
    var wrap = document.createElement("div");
    wrap.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    wrap.innerHTML = html;
    return new XMLSerializer().serializeToString(wrap);
  }
  function svgPage(xhtml, cutTop, pageH, totalW, totalH, W) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + Math.ceil(pageH) + '">' +
      '<foreignObject x="0" y="' + (-cutTop) + '" width="' + W + '" height="' + Math.ceil(totalH) + '">' +
      xhtml + "</foreignObject></svg>";
  }
  function renderSvgToCanvas(svg, W, H, scale) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        try {
          var cv = document.createElement("canvas");
          cv.width = Math.round(W * scale); cv.height = Math.max(1, Math.round(H * scale));
          var cx = cv.getContext("2d");
          cx.fillStyle = "#ffffff"; cx.fillRect(0, 0, cv.width, cv.height);
          cx.drawImage(img, 0, 0, cv.width, cv.height);
          res(cv);
        } catch (e) { rej(e); }
      };
      img.onerror = function () { rej(new Error("page render fail")); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  /**
   * vpdfHtml: VPDF.toHtml() output (includes <style>). Returns Uint8Array PDF.
   * Hindi-safe: pages are rasterized from the browser's own rendering, so
   * Devanagari shapes perfectly. Honest label: "vector text nahi, high-res
   * image pages" — crisp at SC scale (see quality param).
   */
  function htmlToPdfBytes(vpdfHtml, title, onProgress, quality) {
    return ensurePdfLib().then(function (L) {
      return new Promise(function (res, rej) {
        var fr = document.createElement("div");
        fr.style.cssText = "position:fixed;left:-99999px;top:0;width:794px;background:#fff;pointer-events:none;";
        fr.innerHTML = vpdfHtml;
        document.body.appendChild(fr);
        setTimeout(function () {
          var total = fr.scrollHeight || 1123;
          var PAGE_H = 1040; // content px per A4 page at 794px width
          var n = Math.max(1, Math.ceil(total / PAGE_H));
          var xhtml;
          try { xhtml = xhtmlOf(vpdfHtml); }
          catch (e) { fr.remove(); rej(e); return; }
          var SC = quality === "high" ? 1.75 : 1.3;
          (function next(i, pages) {
            if (i >= n) {
              fr.remove();
              var doc = L.PDFDocument.create();
              try { doc.setTitle(title || "Document"); doc.setCreator("AI Everything Workspace"); doc.setAuthor("By Shailesh Arya"); } catch (e2) {}
              var font = null;
              try { font = doc.embedFont(L.StandardFonts.Helvetica); } catch (e3) {}
              var chain = Promise.resolve();
              pages.forEach(function (pg, k) {
                chain = chain.then(function () {
                  return pg.canvas.convertToBlob
                    ? pg.canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 })
                    : new Promise(function (r) { pg.canvas.toBlob(r, "image/jpeg", 0.9); });
                }).then(function (blob) { return blob.arrayBuffer(); })
                  .then(function (ab) { return doc.embedJpg(ab); })
                  .then(function (emb) {
                    var P = doc.addPage([595.28, 841.89]);
                    var hPt = 841.89 - 72;
                    P.drawImage(emb, { x: 36, y: 36, width: 595.28 - 72, height: hPt });
                    if (font) {
                      P.drawText("By Shailesh Arya", { x: 36, y: 20, size: 8, font: font, color: L.rgb(0.45, 0.47, 0.55) });
                      var t = (k + 1) + " / " + n;
                      P.drawText(t, { x: 595.28 / 2 - font.widthOfTextAtSize(t, 9) / 2, y: 20, size: 9, font: font, color: L.rgb(0.5, 0.52, 0.58) });
                    }
                    onProgress && onProgress(k + 1, n);
                  });
              });
              chain.then(function () { return doc.save(); }).then(res, rej);
              return;
            }
            var cut = i * PAGE_H;
            var ph = Math.min(PAGE_H, total - cut);
            renderSvgToCanvas(svgPage(xhtml, cut, ph, total, 794, ph), 794, ph, SC).then(
              function (cv) { pages.push({ canvas: cv }); next(i + 1, pages); },
              rej
            );
          })(0, []);
        }, 120);
      });
    });
  }
  /** vpdf markup text -> themed PDF bytes (one call). */
  function markupToPdf(markup, theme, title, onProgress) {
    return ensureVpdf().then(function (V) {
      var vd = V.toHtml(markup, { forceTheme: theme || V.DEFAULT_THEME });
      return htmlToPdfBytes(vd.html, title || vd.title, onProgress);
    });
  }

  /* ------------------------------ library ------------------------------- */
  function saveToLibrary(name, blob) {
    try {
      if (window.App && App.library && App.library.add) {
        return Promise.resolve(App.library.add({ name: name, blob: blob, type: blob.type, at: Date.now() }))
          .catch(function () { return saveLocal(name, blob); });
      }
    } catch (e) {}
    return Promise.resolve(saveLocal(name, blob));
  }
  function saveLocal(name, blob) {
    // localStorage fallback: store as dataURL (small files only)
    try {
      if (blob.size > 4 * 1024 * 1024) return "too-big";
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var arr = JSON.parse(localStorage.getItem("ts-lib") || "[]");
          arr.unshift({ name: name, data: rd.result, type: blob.type, at: Date.now() });
          localStorage.setItem("ts-lib", JSON.stringify(arr.slice(0, 20)));
        } catch (e) {}
      };
      rd.readAsDataURL(blob);
      return "saved-local";
    } catch (e) { return "fail"; }
  }

  /* --------------------------- chat for generators ---------------------- */
  function hasChatKey() {
    // Real store: App.state.apiKeys = {gemini:[], llama:'', custom:{baseUrl,key,model}}.
    // (Legacy localStorage names kept as fallback for older builds.)
    try {
      if (window.App && App.state && App.state.apiKeys) {
        var k = App.state.apiKeys;
        if (Array.isArray(k.gemini) && k.gemini.some(function (x) { return String(x || "").trim().length > 8; })) return true;
        if (typeof k.llama === "string" && k.llama.trim().length > 8) return true;
        if (k.custom && typeof k.custom.key === "string" && k.custom.key.trim().length > 8) return true;
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem("aiw-settings") || localStorage.getItem("settings") || "{}";
      var s = JSON.parse(raw);
      var keys = ["apiKey", "geminiKey", "chatKey", "key", "openaiKey", "providerKey"];
      for (var i = 0; i < keys.length; i++) {
        var v = s[keys[i]];
        if (typeof v === "string" && v.trim().length > 8) return true;
      }
      var arr = s.keys || s.apiKeys || s.geminiKeys;
      if (Array.isArray(arr) && arr.some(function (k) { return typeof k === "string" && k.trim().length > 8; })) return true;
    } catch (e2) {}
    return false;
  }
  /** POST /api/chat (real contract: body {messages}, header x-ai-keys; reply arrives as SSE).
   * Returns a Promise of the generated text, or throws an honest error. */
  function callChat(prompt, maxTok) {
    var keysHeader = "";
    try { if (window.App && App.getKeysHeader) keysHeader = App.getKeysHeader(); } catch (e) {}
    function sseDelta(j) {
      var d = j.delta != null ? j.delta : j.text != null ? j.text :
        (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || "";
      if (!d && j.candidates && j.candidates[0] && j.candidates[0].content && Array.isArray(j.candidates[0].content.parts))
        d = j.candidates[0].content.parts.map(function (p) { return p.text || ""; }).join("");
      return d || "";
    }
    return fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ai-keys": keysHeader },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "auto" })
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) {
        var msg = t;
        try { var j = JSON.parse(t); msg = j.error || j.message || t; } catch (e) {}
        throw new Error("server " + r.status + (msg ? ": " + String(msg).slice(0, 160) : ""));
      });
      var reader = r.body.getReader(), dec = new TextDecoder(), buf = "", text = "";
      function step() {
        return reader.read().then(function (x) {
          if (x.done) {
            if (!text.trim()) throw new Error("khali jawab");
            return text.trim();
          }
          buf += dec.decode(x.value, { stream: true });
          var lines = buf.split("\n"); buf = lines.pop();
          lines.forEach(function (ln) {
            var line = ln.trim(); if (line.indexOf("data:") !== 0) return;
            var payload = line.slice(5).trim(); if (payload === "[DONE]") return;
            try {
              var j = JSON.parse(payload);
              if (j.error) throw new Error(String(j.error).slice(0, 160));
              text += sseDelta(j);
            } catch (e) { if (e && e.message && !/^Unexpected/.test(e.message)) throw e; }
          });
          return step();
        });
      }
      return step();
    });
  }
  /** Generator helper: AI path or honest manual-mode path. Both end in real PDF. */
  function genPdfFlow(cfg) {
    // cfg: {title, hint, formHtml(build), aiPrompt(values)->string, manualHelp, fileName(values)}
    return function (host) {
      var wrap = el("div", "ts-wrap");
      wrap.appendChild(el("h2", "ts-h", esc(cfg.title)));
      wrap.appendChild(el("p", "ts-sub", cfg.hint));
      var form = el("div", "ts-card"); wrap.appendChild(form);
      cfg.formHtml(form);
      var aiOn = hasChatKey();
      var modeRow = el("div", "ts-row"); form.appendChild(modeRow);
      var aiBtn = el("button", "ts-btn", "🤖 AI se content banao" + (aiOn ? "" : " (key nahi मिली — manual mode)"));
      aiBtn.type = "button"; aiBtn.disabled = !aiOn;
      var manBtn = el("button", "ts-btn sec", "✍️ Manual mode (khud content likho)");
      manBtn.type = "button";
      modeRow.appendChild(aiBtn); modeRow.appendChild(manBtn);
      if (!aiOn) {
        form.appendChild(el("p", "ts-note", "⚠️ Chat me koi API key configure nahi mili. AI generation ke liye Settings me key daalo. Tab tak Manual mode use karo — content tum likho/paste karo, themed PDF hum banayenge."));
      }
      var taCard = el("div", "ts-card"); taCard.style.display = "none"; wrap.appendChild(taCard);
      taCard.appendChild(el("label", "ts-lab", "📝 Content (VPDF markup support: ## heading, - bullet, **bold**, [mcq]…[/mcq], [diagram]…[/diagram])"));
      var ta = el("textarea", "ts-ta"); ta.style.minHeight = "220px"; taCard.appendChild(ta);
      var thRow = el("div", "ts-row"); taCard.appendChild(thRow);
      thRow.appendChild(el("label", "ts-lab", "🎨 Theme: "));
      var sel = el("select", "ts-sel"); sel.style.width = "auto";
      ensureVpdf().then(function (V) {
        Object.keys(V.THEMES).forEach(function (k) {
          var o = document.createElement("option"); o.value = k; o.textContent = V.THEMES[k].label; sel.appendChild(o);
        });
      }).catch(function () {
        ["navy-gold", "ocean", "emerald", "sunset", "minimal"].forEach(function (k) {
          var o = document.createElement("option"); o.value = k; o.textContent = k; sel.appendChild(o);
        });
      });
      thRow.appendChild(sel);
      var goBtn = el("button", "ts-btn", "📄 Themed PDF banao"); goBtn.type = "button"; thRow.appendChild(goBtn);
      var stBox = el("div"); taCard.appendChild(stBox);
      function openManual(prefill) {
        taCard.style.display = ""; if (prefill) ta.value = prefill;
        taCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      manBtn.onclick = function () { openManual(cfg.manualPrefill ? cfg.manualPrefill(cfg.readValues ? cfg.readValues(form) : {}) : ""); };
      aiBtn.onclick = function () {
        var vals = cfg.readValues ? cfg.readValues(form) : {};
        var p = cfg.aiPrompt(vals);
        aiBtn.disabled = true; aiBtn.textContent = "⏳ AI likh raha hai…";
        callChat(p, cfg.maxTokens || 6000).then(function (txt) {
          openManual(txt); notify("✅ Content taiyar", "Ab 'Themed PDF banao' dabao.");
        }).catch(function (e) {
          notify("⚠️ AI fail", (e && e.message) || "error");
          status(form, "⚠️ AI se content nahi bana (" + ((e && e.message) || "error") + "). Manual mode use karo — neeche textarea me likho/paste karo.", "err");
        }).finally(function () { aiBtn.disabled = !aiOn; aiBtn.textContent = "🤖 AI se content banao"; });
      };
      goBtn.onclick = function () {
        var txt = ta.value.trim();
        if (!txt) { notify("⚠️ Pehle content likho"); return; }
        var vals = cfg.readValues ? cfg.readValues(form) : {};
        goBtn.disabled = true; goBtn.textContent = "⏳ PDF ban rahi hai…";
        var st = status(stBox, "📄 PDF ban rahi hai…");
        var theme = sel.value || "navy-gold";
        markupToPdf(txt, theme, cfg.fileName(vals), function (i, n) { st.textContent = "📄 PDF ban rahi hai… page " + i + "/" + n; })
          .then(function (bytes) {
            var name = safeName(cfg.fileName(vals), ".pdf");
            var blob = new Blob([bytes], { type: "application/pdf" });
            try { if (window.App && App.setCurrentPdf) App.setCurrentPdf(bytes, name); } catch (e) {}
            downloadBlob(name, blob);
            saveToLibrary(name, blob);
            st.className = "ts-st ok"; st.textContent = "✅ PDF taiyar + download ho gayi (" + Math.round(blob.size / 1024) + " KB). Library me bhi save ki.";
            notify("✅ PDF taiyar", name);
          })
          .catch(function (e) {
            st.className = "ts-st err";
            st.textContent = "⚠️ PDF nahi bani: " + ((e && e.message) || "error") + ". VPDF/pdflib load ke liye internet chahiye (CDN).";
          })
          .finally(function () { goBtn.disabled = false; goBtn.textContent = "📄 Themed PDF banao"; });
      };
      host.appendChild(wrap);
    };
  }
  /** common form field helpers for generators */
  function field(form, label, id, placeholder, def) {
    form.appendChild(el("label", "ts-lab", esc(label)));
    var i = el("input", "ts-in"); i.id = id; i.placeholder = placeholder || ""; i.value = def || "";
    form.appendChild(i); return i;
  }
  function fieldRow(form, pairs) {
    var r = el("div", "ts-grid2"); form.appendChild(r);
    return pairs.map(function (p) {
      var d = el("div"); r.appendChild(d);
      d.appendChild(el("label", "ts-lab", esc(p[0])));
      var i = el("input", "ts-in"); i.id = p[1]; i.placeholder = p[2] || ""; i.value = p[3] || ""; d.appendChild(i);
      return i;
    });
  }

  injectCss();
  window.TS = {
    __v: 3, BASE: BASE,
    reg: reg, $: $, el: el, esc: esc, tabs: tabs, status: status,
    notify: notify, downloadBlob: downloadBlob, safeName: safeName,
    loadScript: loadScript, loadFirst: loadFirst,
    ensureVpdf: ensureVpdf, ensurePdfLib: ensurePdfLib, ensurePdfJs: ensurePdfJs,
    htmlToPdfBytes: htmlToPdfBytes, markupToPdf: markupToPdf,
    saveToLibrary: saveToLibrary, hasChatKey: hasChatKey, callChat: callChat,
    genPdfFlow: genPdfFlow, field: field, fieldRow: fieldRow,
    THEME_HINT: "theme: navy-gold"
  };
  // defensive: if App already ready, flush now
  flushQueue();
})();

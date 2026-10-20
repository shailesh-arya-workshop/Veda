/* AI Everything — PDF Studio (Create/Edit/Merge/Split/Compress/Watermark/Rotate/N-up) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }

  ready(function (TS) {
    TS.reg("pdf-studio", {
      title: "PDF Studio", icon: "📕",
      render: function (host, params) {
        params = params || {};
        // Actions handled by dedicated views are routed by App.openPdfTool before we get here;
        // tab actions (create/edit/merge/split...) select the right tab directly.
        var TAB_BY_ACTION = { create: 0, edit: 1, merge: 2, split: 3, compress: 4, watermark: 5, rotate: 6, nup: 7 };
        var startTab = TAB_BY_ACTION[params.action || "create"]; if (startTab == null) startTab = 0;
        if (params.prefill) pendingPrefill = String(params.prefill);
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "📕 PDF Studio"));
        wrap.appendChild(TS.el("p", "ts-sub", "Sab kuch isi phone me, offline. Har action ka result ek asli PDF file hai — download + Library."));
        var tabsBar = TS.el("div"); wrap.appendChild(tabsBar);
        var body = TS.el("div"); wrap.appendChild(body);
        TS.tabs(tabsBar, ["✍️ Create", "🛠️ Edit", "🔗 Merge", "✂️ Split", "🗜️ Compress", "💧 Watermark", "🔄 Rotate", "🗐 N-up"], function (i) { show(i); });
        function show(i) { body.innerHTML = ""; [tCreate, tEdit, tMerge, tSplit, tCompress, tWatermark, tRotate, tNup][i](body); }
        // sync tab highlight with the action param (TS.tabs marks tab 0 by default)
        var tabEls = tabsBar.querySelectorAll(".ts-tab");
        tabEls.forEach(function (x) { x.classList.remove("on"); });
        if (tabEls[startTab]) tabEls[startTab].classList.add("on");
        host.appendChild(wrap); show(startTab);
      }
    });

    /* ---------- helpers ---------- */
    var pendingPrefill = ""; // set by render() from params.prefill, consumed by tCreate
    function fileInput(multi, accept) {
      var l = TS.el("label", "ts-file", "📁 File chuno" + (multi ? " (ek se zyada)" : ""));
      var inp = document.createElement("input");
      inp.type = "file"; inp.accept = accept || "application/pdf"; inp.multiple = !!multi; inp.hidden = true;
      inp.onchange = function () {
        var n = Array.prototype.map.call(inp.files, function (f) { return f.name; }).join(", ");
        l.childNodes[0].textContent = "✅ " + (n || "chuni gayi") + " ";
      };
      l.appendChild(inp); l._inp = inp; return l;
    }
    function readAsAB(f) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsArrayBuffer(f); }); }
    function done(host, blob, name, extra) {
      host.appendChild(TS.el("div", "ts-st ok", "✅ " + TS.esc(name) + " taiyar (" + Math.round(blob.size / 1024) + " KB)" + (extra ? " — " + TS.esc(extra) : "")));
      var row = TS.el("div", "ts-row"); host.appendChild(row);
      var dl = TS.el("button", "ts-btn", "⬇️ Download"); dl.type = "button";
      dl.onclick = function () { TS.downloadBlob(name, blob); };
      var lib = TS.el("button", "ts-btn sec", "📚 Library me save"); lib.type = "button";
      lib.onclick = function () { TS.saveToLibrary(name, blob); TS.notify("✅ Library me save", name); };
      row.appendChild(dl); row.appendChild(lib);
      try { if (window.App && App.setCurrentPdf) blob.arrayBuffer().then(function (b) { App.setCurrentPdf(new Uint8Array(b), name); }).catch(function () {}); } catch (e) {}
    }

    /* ---------- 1. CREATE ---------- */
    function tCreate(host) {
      var c = TS.el("div", "ts-card"); host.appendChild(c);
      c.appendChild(TS.el("label", "ts-lab", "📝 Content likho (VPDF markup: ## heading, - bullet, **bold**, | table |, [mcq]…[/mcq], [diagram type=flow title=\"..\"] A -> B [/diagram], ::: highlight … :::)"));
      var ta = TS.el("textarea", "ts-ta");
      ta.value = pendingPrefill || "theme: navy-gold\n[cover]\n# मेरी PDF\nClass 8 • विज्ञान\n[/cover]\n\n## परिचय\n- पहला बिंदु **bold** me\n- दूसरा बिंदु\n\n::: highlight\n⭐ Ye highlight box hai.\n:::\n\n[diagram type=flow title=\"प्रक्रिया\"]\nशुरुआत -> मध्य -> अंत\n[/diagram]";
      pendingPrefill = "";
      ta.style.minHeight = "200px"; c.appendChild(ta);
      var row = TS.el("div", "ts-row"); c.appendChild(row);
      row.appendChild(TS.el("label", "ts-lab", "🎨 Theme:"));
      var sel = TS.el("select", "ts-sel"); sel.style.width = "auto"; row.appendChild(sel);
      var go = TS.el("button", "ts-btn", "📄 PDF banao"); go.type = "button"; row.appendChild(go);
      var st = TS.el("div"); c.appendChild(st);
      TS.ensureVpdf().then(function (V) {
        Object.keys(V.THEMES).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = V.THEMES[k].label; sel.appendChild(o); });
      }).catch(function () { st.appendChild(TS.el("div", "ts-st err", "⚠️ vpdf.js load nahi hua — internet chahiye (pehli baar).")); });
      go.onclick = function () {
        var txt = ta.value.trim(); if (!txt) { TS.notify("⚠️ Content khali hai"); return; }
        go.disabled = true; go.textContent = "⏳ ban rahi hai…";
        var s = TS.status(st, "📄 PDF ban rahi hai…");
        TS.markupToPdf(txt, sel.value || "navy-gold", "document", function (i, n) { s.textContent = "📄 page " + i + "/" + n; })
          .then(function (bytes) { st.innerHTML = ""; done(st, new Blob([bytes], { type: "application/pdf" }), TS.safeName("pdf-studio-create", ".pdf"), "Hindi-safe high-res pages"); })
          .catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + ((e && e.message) || "PDF nahi bani"), "err"); })
          .finally(function () { go.disabled = false; go.textContent = "📄 PDF banao"; });
      };
    }

    /* ---------- 2. EDIT ---------- */
    function tEdit(host) {
      var c = TS.el("div", "ts-card"); host.appendChild(c);
      c.appendChild(fileInput(false));
      var fi = c.querySelector("input");
      var info = TS.el("div", "ts-note"); c.appendChild(info);
      var doc = null, fileName = "";
      fi.onchange = function () {
        var f = fi.files[0]; if (!f) return; fileName = f.name;
        TS.ensurePdfLib().then(function (L) { return readAsAB(f).then(function (ab) { return L.PDFDocument.load(ab); }); })
          .then(function (d) { doc = d; info.textContent = "📄 " + f.name + " — " + d.getPageCount() + " pages load ho gaye."; })
          .catch(function (e) { info.textContent = "⚠️ PDF nahi khuli: " + (e.message || "error"); });
      };
      c.appendChild(TS.el("label", "ts-lab", "➕ Text add karo (page ke top ya bottom par)"));
      var r2 = TS.el("div", "ts-grid2"); c.appendChild(r2);
      var tIn = TS.el("input", "ts-in"); tIn.placeholder = "Text likho…"; r2.appendChild(tIn);
      var pos = TS.el("select", "ts-sel");
      ["top", "bottom"].forEach(function (p) { var o = document.createElement("option"); o.value = p; o.textContent = p === "top" ? "⬆️ Top" : "⬇️ Bottom"; pos.appendChild(o); });
      r2.appendChild(pos);
      var addT = TS.el("button", "ts-btn sec", "✏️ Text add karo (sab pages par)"); addT.type = "button"; c.appendChild(addT);
      addT.onclick = function () {
        if (!doc) { TS.notify("⚠️ Pehle PDF file chuno"); return; }
        var txt = tIn.value.trim(); if (!txt) { TS.notify("⚠️ Text likho"); return; }
        TS.ensurePdfLib().then(function (L) {
          try {
            var font = doc.embedFont(L.StandardFonts.Helvetica);
            doc.getPages().forEach(function (pg) {
              var w = pg.getWidth(), h = pg.getHeight();
              var y = pos.value === "top" ? h - 30 : 24;
              pg.drawText(txt.slice(0, 120), { x: 36, y: y, size: 12, font: font, color: L.rgb(0.1, 0.1, 0.1) });
            });
            info.textContent = "✅ Text add ho gaya. Ab 'Save PDF' dabao.";
          } catch (e) {
            TS.notify("⚠️ Hindi/Devanagari text is editor me support nahi (font embed nahi hai). Latin/English text use karo.");
          }
        });
      };
      c.appendChild(TS.el("label", "ts-lab", "📃 Blank page add / pages delete karo"));
      var r3 = TS.el("div", "ts-grid2"); c.appendChild(r3);
      var addP = TS.el("button", "ts-btn sec", "＋ Blank page (end me)"); addP.type = "button"; r3.appendChild(addP);
      addP.onclick = function () { if (!doc) { TS.notify("⚠️ Pehle PDF file chuno"); return; } doc.addPage(); info.textContent = "✅ Blank page add ho gaya. Ab 'Save PDF' dabao."; };
      var delIn = TS.el("input", "ts-in"); delIn.placeholder = "Delete: page no. jaise 2 ya 2,5"; r3.appendChild(delIn);
      var delB = TS.el("button", "ts-btn sec", "🗑️ Pages delete karo"); delB.type = "button"; c.appendChild(delB);
      delB.onclick = function () {
        if (!doc) { TS.notify("⚠️ Pehle PDF file chuno"); return; }
        var nums = delIn.value.split(",").map(function (x) { return parseInt(x.trim(), 10); }).filter(function (x) { return x >= 1 && x <= doc.getPageCount(); }).sort(function (a, b) { return b - a; });
        if (!nums.length) { TS.notify("⚠️ Sahi page number likho"); return; }
        nums.forEach(function (n) { doc.removePage(n - 1); });
        info.textContent = "✅ " + nums.length + " page(s) delete. Ab 'Save PDF' dabao.";
      };
      var save = TS.el("button", "ts-btn", "💾 Edited PDF save karo"); save.type = "button"; c.appendChild(save);
      var st = TS.el("div"); c.appendChild(st);
      save.onclick = function () {
        if (!doc) { TS.notify("⚠️ Pehle PDF file chuno"); return; }
        save.disabled = true;
        doc.save().then(function (bytes) { st.innerHTML = ""; done(st, new Blob([bytes], { type: "application/pdf" }), TS.safeName(fileName.replace(/\.pdf$/i, "") + "-edited", ".pdf")); })
          .catch(function (e) { TS.status(st, "⚠️ " + (e.message || "save fail"), "err"); })
          .finally(function () { save.disabled = false; });
      };
      c.appendChild(TS.el("p", "ts-note", "ℹ️ Text add karna Latin/English tak seemit hai — Hindi font embed is version me nahi hai. Watermark/rotate/merge sab par kaam karta hai."));
    }

    /* ---------- 3. MERGE ---------- */
    function tMerge(host) {
      var c = TS.el("div", "ts-card"); host.appendChild(c);
      var fi = fileInput(true); c.appendChild(fi);
      var inp = fi._inp;
      var go = TS.el("button", "ts-btn", "🔗 Merge karo (chune hue order me)"); go.type = "button"; c.appendChild(go);
      var st = TS.el("div"); c.appendChild(st);
      go.onclick = function () {
        var fs = Array.prototype.slice.call(inp.files);
        if (fs.length < 2) { TS.notify("⚠️ Kam se kam 2 PDF files chuno"); return; }
        go.disabled = true; var s = TS.status(st, "🔗 Merge ho raha hai…");
        TS.ensurePdfLib().then(function (L) {
          var out = L.PDFDocument.create();
          var chain = Promise.resolve();
          fs.forEach(function (f) {
            chain = chain.then(function () { return readAsAB(f); })
              .then(function (ab) { return L.PDFDocument.load(ab); })
              .then(function (d) { return out.copyPages(d, d.getPageIndices()); })
              .then(function (ps) { ps.forEach(function (p) { out.addPage(p); }); });
          });
          return chain.then(function () { return out.save(); });
        }).then(function (bytes) { st.innerHTML = ""; done(st, new Blob([bytes], { type: "application/pdf" }), TS.safeName("merged", ".pdf"), fs.length + " files"); })
          .catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + (e.message || "merge fail"), "err"); })
          .finally(function () { go.disabled = false; });
      };
    }

    /* ---------- 4. SPLIT ---------- */
    function tSplit(host) {
      var c = TS.el("div", "ts-card"); host.appendChild(c);
      var fi = fileInput(false); c.appendChild(fi); var inp = fi._inp;
      c.appendChild(TS.el("label", "ts-lab", "📄 Page range (jaise: 1-3,5,8-10)"));
      var rg = TS.el("input", "ts-in"); rg.placeholder = "1-3,5"; c.appendChild(rg);
      var go = TS.el("button", "ts-btn", "✂️ Split karo"); go.type = "button"; c.appendChild(go);
      var st = TS.el("div"); c.appendChild(st);
      function parseRange(s, max) {
        var out = [];
        s.split(",").forEach(function (part) {
          part = part.trim(); if (!part) return;
          var m = part.match(/^(\d+)\s*-\s*(\d+)$/);
          if (m) { for (var i = +m[1]; i <= +m[2] && i <= max; i++) if (i >= 1) out.push(i - 1); }
          else { var n = parseInt(part, 10); if (n >= 1 && n <= max) out.push(n - 1); }
        });
        return out.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      }
      go.onclick = function () {
        var f = inp.files[0]; if (!f) { TS.notify("⚠️ PDF file chuno"); return; }
        go.disabled = true; var s = TS.status(st, "✂️ Split ho raha hai…");
        TS.ensurePdfLib().then(function (L) {
          return readAsAB(f).then(function (ab) { return L.PDFDocument.load(ab); }).then(function (d) {
            var idx = parseRange(rg.value, d.getPageCount());
            if (!idx.length) throw new Error("range khali/galat — jaise '1-3,5' likho (total " + d.getPageCount() + " pages)");
            var out = L.PDFDocument.create();
            return out.copyPages(d, idx).then(function (ps) { ps.forEach(function (p) { out.addPage(p); }); return out.save(); });
          });
        }).then(function (bytes) { st.innerHTML = ""; done(st, new Blob([bytes], { type: "application/pdf" }), TS.safeName(f.name.replace(/\.pdf$/i, "") + "-split", ".pdf")); })
          .catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + (e.message || "split fail"), "err"); })
          .finally(function () { go.disabled = false; });
      };
    }

    /* ---------- 5. COMPRESS (honest) ---------- */
    function tCompress(host) {
      var c = TS.el("div", "ts-card"); host.appendChild(c);
      c.appendChild(TS.el("div", "ts-st", "ℹ️ Ye 're-save compression' hai: PDF ko dobara save karke faltu data hatata hai. Bahut badi image wali PDF par 5–20% tak chhoti ho sakti hai — guarantee nahi."));
      var fi = fileInput(false); c.appendChild(fi); var inp = fi._inp;
      var go = TS.el("button", "ts-btn", "🗜️ Compress karo"); go.type = "button"; c.appendChild(go);
      var st = TS.el("div"); c.appendChild(st);
      go.onclick = function () {
        var f = inp.files[0]; if (!f) { TS.notify("⚠️ PDF file chuno"); return; }
        go.disabled = true; var s = TS.status(st, "🗜️ Compress ho raha hai… (" + Math.round(f.size / 1024) + " KB)");
        TS.ensurePdfLib().then(function (L) {
          return readAsAB(f).then(function (ab) { return L.PDFDocument.load(ab, { ignoreEncryption: true }); })
            .then(function (d) { return d.save({ useObjectStreams: true }); });
        }).then(function (bytes) {
          st.innerHTML = "";
          var before = Math.round(f.size / 1024), after = Math.round(bytes.length / 1024);
          done(st, new Blob([bytes], { type: "application/pdf" }), TS.safeName(f.name.replace(/\.pdf$/i, "") + "-compressed", ".pdf"), before + " KB → " + after + " KB");
        }).catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + (e.message || "compress fail"), "err"); })
          .finally(function () { go.disabled = false; });
      };
    }

    /* ---------- 6. WATERMARK ---------- */
    function tWatermark(host) {
      var c = TS.el("div", "ts-card"); host.appendChild(c);
      var fi = fileInput(false); c.appendChild(fi); var inp = fi._inp;
      c.appendChild(TS.el("label", "ts-lab", "💧 Watermark text (English/Latin — Hindi font is version me nahi)"));
      var tIn = TS.el("input", "ts-in"); tIn.placeholder = "jaise: CONFIDENTIAL ya apna naam"; tIn.value = "By Shailesh Arya"; c.appendChild(tIn);
      var go = TS.el("button", "ts-btn", "💧 Watermark lagao (diagonal)"); go.type = "button"; c.appendChild(go);
      var st = TS.el("div"); c.appendChild(st);
      go.onclick = function () {
        var f = inp.files[0]; if (!f) { TS.notify("⚠️ PDF file chuno"); return; }
        var txt = tIn.value.trim() || "WATERMARK";
        go.disabled = true; var s = TS.status(st, "💧 Watermark lag raha hai…");
        TS.ensurePdfLib().then(function (L) {
          return readAsAB(f).then(function (ab) { return L.PDFDocument.load(ab); }).then(function (d) {
            var font = d.embedFont(L.StandardFonts.HelveticaBold);
            d.getPages().forEach(function (pg) {
              var w = pg.getWidth(), h = pg.getHeight();
              pg.drawText(txt.slice(0, 60), {
                x: w / 2 - txt.length * 7, y: h / 2, size: 42, font: font,
                color: L.rgb(0.75, 0.75, 0.75), opacity: 0.35, rotate: L.degrees(45)
              });
            });
            return d.save();
          });
        }).then(function (bytes) { st.innerHTML = ""; done(st, new Blob([bytes], { type: "application/pdf" }), TS.safeName(f.name.replace(/\.pdf$/i, "") + "-watermarked", ".pdf")); })
          .catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + (e.message || "watermark fail") + ". Hindi text ho to English me likho.", "err"); })
          .finally(function () { go.disabled = false; });
      };
    }

    /* ---------- 7. ROTATE ---------- */
    function tRotate(host) {
      var c = TS.el("div", "ts-card"); host.appendChild(c);
      var fi = fileInput(false); c.appendChild(fi); var inp = fi._inp;
      c.appendChild(TS.el("label", "ts-lab", "🔄 Kitna ghumana hai?"));
      var sel = TS.el("select", "ts-sel");
      [["90", "90° (clockwise)"], ["180", "180°"], ["270", "270° (counter-clockwise)"]].forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op); });
      c.appendChild(sel);
      var go = TS.el("button", "ts-btn", "🔄 Rotate karo (sab pages)"); go.type = "button"; c.appendChild(go);
      var st = TS.el("div"); c.appendChild(st);
      go.onclick = function () {
        var f = inp.files[0]; if (!f) { TS.notify("⚠️ PDF file chuno"); return; }
        go.disabled = true; var s = TS.status(st, "🔄 Rotate ho raha hai…");
        TS.ensurePdfLib().then(function (L) {
          return readAsAB(f).then(function (ab) { return L.PDFDocument.load(ab); }).then(function (d) {
            var deg = parseInt(sel.value, 10);
            d.getPages().forEach(function (pg) { pg.setRotation(L.degrees((pg.getRotation().angle + deg) % 360)); });
            return d.save();
          });
        }).then(function (bytes) { st.innerHTML = ""; done(st, new Blob([bytes], { type: "application/pdf" }), TS.safeName(f.name.replace(/\.pdf$/i, "") + "-rotated", ".pdf")); })
          .catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + (e.message || "rotate fail"), "err"); })
          .finally(function () { go.disabled = false; });
      };
    }

    /* ---------- 8. N-UP ---------- */
    function tNup(host) {
      var c = TS.el("div", "ts-card"); host.appendChild(c);
      var fi = fileInput(false); c.appendChild(fi); var inp = fi._inp;
      c.appendChild(TS.el("label", "ts-lab", "🗐 Ek page par kitne?"));
      var sel = TS.el("select", "ts-sel");
      [["2", "2 pages per sheet (side by side)"], ["4", "4 pages per sheet (2×2 grid)"]].forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op); });
      c.appendChild(sel);
      var go = TS.el("button", "ts-btn", "🗐 N-up PDF banao"); go.type = "button"; c.appendChild(go);
      var st = TS.el("div"); c.appendChild(st);
      go.onclick = function () {
        var f = inp.files[0]; if (!f) { TS.notify("⚠️ PDF file chuno"); return; }
        var per = parseInt(sel.value, 10);
        go.disabled = true; var s = TS.status(st, "🗐 N-up ban raha hai…");
        TS.ensurePdfLib().then(function (L) {
          return readAsAB(f).then(function (ab) { return L.PDFDocument.load(ab); }).then(function (src) {
            var n = src.getPageCount();
            var out = L.PDFDocument.create();
            var PW = 595.28, PH = 841.89;
            var cells = per === 2 ? [[0, 0, PW / 2, PH], [PW / 2, 0, PW / 2, PH]] :
              [[0, PH / 2, PW / 2, PH / 2], [PW / 2, PH / 2, PW / 2, PH / 2], [0, 0, PW / 2, PH / 2], [PW / 2, 0, PW / 2, PH / 2]];
            var chain = Promise.resolve();
            for (var i = 0; i < n; i += per) {
              (function (start) {
                chain = chain.then(function () {
                  var idx = []; for (var k = 0; k < per && start + k < n; k++) idx.push(start + k);
                  return out.copyPages(src, idx).then(function (cps) {
                    var sheet = out.addPage([PW, PH]);
                    cps.forEach(function (cp, j) {
                      var emb = out.embedPage(cp);
                      var cell = cells[j];
                      var cw = emb.width, ch = emb.height;
                      var sc = Math.min(cell[2] / cw, cell[3] / ch);
                      var dw = cw * sc, dh = ch * sc;
                      sheet.drawPage(emb, { x: cell[0] + (cell[2] - dw) / 2, y: cell[1] + (cell[3] - dh) / 2, width: dw, height: dh });
                      try {
                        var font = out.embedFont(L.StandardFonts.Helvetica);
                        sheet.drawRectangle({ x: cell[0] + 2, y: cell[1] + 2, width: cell[2] - 4, height: cell[3] - 4, borderColor: L.rgb(0.8, 0.8, 0.8), borderWidth: 0.8 });
                      } catch (e) {}
                    });
                  });
                });
              })(i);
            }
            return chain.then(function () { return out.save(); });
          });
        }).then(function (bytes) { st.innerHTML = ""; done(st, new Blob([bytes], { type: "application/pdf" }), TS.safeName(f.name.replace(/\.pdf$/i, "") + "-" + per + "up", ".pdf")); })
          .catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + (e.message || "n-up fail"), "err"); })
          .finally(function () { go.disabled = false; });
      };
    }
  });
})();

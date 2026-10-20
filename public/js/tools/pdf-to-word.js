/* AI Everything — PDF → Word (.docx, text-based) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  function loadDocx() {
    if (window.docx) return Promise.resolve(window.docx);
    var urls = ["https://cdn.jsdelivr.net/npm/docx@9/dist/index.umd.cjs", "https://unpkg.com/docx@8.5.0/build/index.js"];
    return new Promise(function (res, rej) {
      (function next(i) {
        if (i >= urls.length) { rej(new Error("docx library load nahi hui — internet chahiye.")); return; }
        var s = document.createElement("script");
        s.src = urls[i];
        s.onload = function () { window.docx ? res(window.docx) : next(i + 1); };
        s.onerror = function () { s.remove(); next(i + 1); };
        document.head.appendChild(s);
      })(0);
    });
  }
  ready(function (TS) {
    TS.reg("pdf-to-word", {
      title: "PDF → Word", icon: "🔄",
      render: function (host) {
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "📄➡️📝 PDF se Word"));
        wrap.appendChild(TS.el("p", "ts-sub", "PDF ka text nikaal kar .docx (Word) file banegi. Ye text-based conversion hai — asli design/tables ki formatting simplified ho jayegi, lekin saara text edit karne layak milega."));
        var c = TS.el("div", "ts-card"); wrap.appendChild(c);
        var lab = TS.el("label", "ts-file", "📁 PDF file chuno");
        var inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/pdf"; inp.hidden = true; lab.appendChild(inp);
        c.appendChild(lab);
        var st = TS.el("div"); c.appendChild(st);
        var go = TS.el("button", "ts-btn", "📝 Word (.docx) banao"); go.type = "button"; c.appendChild(go);
        go.onclick = function () {
          var f = inp.files[0]; if (!f) { TS.notify("⚠️ Pehle PDF chuno"); return; }
          go.disabled = true; st.innerHTML = "";
          var s = TS.status(st, "⏳ PDF padh rahi hai… (pdf.js load ho raha hai)");
          Promise.all([TS.ensurePdfJs(), loadDocx()])
            .then(function (pair) {
              var lib = pair[0], D = pair[1];
              return f.arrayBuffer().then(function (ab) { return lib.getDocument({ data: ab }).promise; }).then(function (pdf) {
                var pages = [], chain = Promise.resolve();
                for (var p = 1; p <= pdf.numPages; p++) (function (pn) {
                  chain = chain.then(function () { return pdf.getPage(pn); }).then(function (pg) { return pg.getTextContent(); })
                    .then(function (tc) {
                      var lines = [], cur = "", lastY = null;
                      tc.items.forEach(function (it) {
                        var y = it.transform ? it.transform[5] : 0;
                        if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(cur); cur = ""; }
                        cur += it.str + " "; lastY = y;
                        if (it.hasEOL) { lines.push(cur); cur = ""; lastY = null; }
                      });
                      if (cur.trim()) lines.push(cur);
                      pages.push(lines);
                      s.textContent = "⏳ Page " + pn + "/" + pdf.numPages + " ka text nikaala…";
                    });
                })(p);
                return chain.then(function () { return pages; });
              });
            })
            .then(function (pages) {
              var D = window.docx;
              var children = [];
              pages.forEach(function (lines, pi) {
                if (pi > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
                lines.forEach(function (ln) {
                  ln = ln.trim(); if (!ln) { children.push(new D.Paragraph({})); return; }
                  children.push(new D.Paragraph({ children: [new D.TextRun({ text: ln, font: "Nirmala UI" })], spacing: { after: 120 } }));
                });
              });
              var docxDoc = new D.Document({ sections: [{ properties: {}, children: children }] });
              return D.Packer.toBlob(docxDoc);
            })
            .then(function (blob) {
              st.innerHTML = "";
              var name = TS.safeName(f.name.replace(/\.pdf$/i, ""), ".docx");
              st.appendChild(TS.el("div", "ts-st ok", "✅ Word file taiyar (" + Math.round(blob.size / 1024) + " KB) — " + TS.esc(name)));
              TS.downloadBlob(name, blob); TS.saveToLibrary(name, blob);
            })
            .catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + ((e && e.message) || "conversion fail") + " (docx library ke liye internet chahiye).", "err"); })
            .finally(function () { go.disabled = false; });
        };
        wrap.appendChild(TS.el("p", "ts-note", "ℹ️ Scanned/image-only PDF me text nahi hota — uske liye pehle OCR tool use karo."));
        host.appendChild(wrap);
      }
    });
  });
})();

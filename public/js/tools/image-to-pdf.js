/* AI Everything — Image → PDF (pdf-lib, one image per page) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  ready(function (TS) {
    TS.reg("image-to-pdf", {
      title: "Image → PDF", icon: "🖼️",
      render: function (host) {
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "🖼️➡️📄 Images se PDF"));
        wrap.appendChild(TS.el("p", "ts-sub", "Ek ya zyada photos chuno — har photo ek page banegi (A4 par fit). Notes ki photos ko ek PDF me jodne ke liye best."));
        var c = TS.el("div", "ts-card"); wrap.appendChild(c);
        var lab = TS.el("label", "ts-file", "🖼️ Images chuno (multiple)");
        var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = true; inp.hidden = true; lab.appendChild(inp);
        c.appendChild(lab);
        var thumbs = TS.el("div", "ts-note"); c.appendChild(thumbs);
        var st = TS.el("div"); c.appendChild(st);
        var go = TS.el("button", "ts-btn", "📄 PDF banao"); go.type = "button"; c.appendChild(go);
        inp.onchange = function () {
          thumbs.textContent = inp.files.length ? "✅ " + inp.files.length + " image(s): " + Array.prototype.map.call(inp.files, function (f) { return f.name; }).join(", ") : "";
          lab.childNodes[0].textContent = "✅ " + inp.files.length + " images ";
        };
        go.onclick = function () {
          var fs = Array.prototype.slice.call(inp.files);
          if (!fs.length) { TS.notify("⚠️ Pehle images chuno"); return; }
          go.disabled = true; st.innerHTML = "";
          var s = TS.status(st, "📄 PDF ban rahi hai…");
          TS.ensurePdfLib().then(function (L) {
            var doc = L.PDFDocument.create();
            try { doc.setTitle("Images PDF"); doc.setAuthor("By Shailesh Arya"); } catch (e) {}
            var chain = Promise.resolve();
            fs.forEach(function (f, i) {
              chain = chain.then(function () {
                s.textContent = "📄 Image " + (i + 1) + "/" + fs.length + " add ho rahi hai…";
                return f.arrayBuffer().then(function (ab) {
                  var isPng = f.type === "image/png";
                  return isPng ? doc.embedPng(ab) : doc.embedJpg(ab).catch(function () { return doc.embedPng(ab); });
                }).then(function (emb) {
                  var PW = 595.28, PH = 841.89, M = 28;
                  var sc = Math.min((PW - 2 * M) / emb.width, (PH - 2 * M) / emb.height);
                  var dw = emb.width * sc, dh = emb.height * sc;
                  var pg = doc.addPage([PW, PH]);
                  pg.drawImage(emb, { x: (PW - dw) / 2, y: (PH - dh) / 2, width: dw, height: dh });
                });
              });
            });
            return chain.then(function () { return doc.save(); });
          }).then(function (bytes) {
            st.innerHTML = "";
            var name = TS.safeName("images", ".pdf");
            var blob = new Blob([bytes], { type: "application/pdf" });
            TS.status(st, "✅ PDF taiyar (" + Math.round(blob.size / 1024) + " KB, " + fs.length + " pages)", "ok");
            TS.downloadBlob(name, blob); TS.saveToLibrary(name, blob);
            try { if (window.App && App.setCurrentPdf) App.setCurrentPdf(bytes, name); } catch (e) {}
          }).catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + ((e && e.message) || "PDF nahi bani") + " — WEBP/HEIC images kabhi-kabhi support nahi hoti; JPG/PNG use karo.", "err"); })
            .finally(function () { go.disabled = false; });
        };
        host.appendChild(wrap);
      }
    });
  });
})();

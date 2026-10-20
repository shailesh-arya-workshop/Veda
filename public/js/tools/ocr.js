/* AI Everything — OCR (Tesseract.js, hin+eng) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      s.onload = function () { window.Tesseract ? res(window.Tesseract) : rej(new Error("Tesseract nahi mila")); };
      s.onerror = function () { rej(new Error("Tesseract.js load nahi hua — OCR ke liye internet chahiye (pehli baar ~10MB language data bhi download hota hai).")); };
      document.head.appendChild(s);
    });
  }
  ready(function (TS) {
    TS.reg("ocr", {
      title: "OCR — Photo se Text", icon: "🔍",
      render: function (host) {
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "🔍 OCR — Photo se Text"));
        wrap.appendChild(TS.el("p", "ts-sub", "Photo/screenshot se Hindi + English text nikaalo. Pehli baar internet chahiye (language data download hota hai); saaf, seedhi photo par sabse achha result milta hai."));
        var c = TS.el("div", "ts-card"); wrap.appendChild(c);
        var lab = TS.el("label", "ts-file", "🖼️ Image chuno (photo/screenshot)");
        var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.hidden = true; lab.appendChild(inp);
        c.appendChild(lab);
        var prev = TS.el("img"); prev.style.cssText = "max-width:100%;border-radius:10px;margin-top:10px;display:none;"; c.appendChild(prev);
        var prog = TS.el("div", "ts-prog"); var bar = TS.el("div"); prog.appendChild(bar); prog.style.display = "none"; c.appendChild(prog);
        var st = TS.el("div"); c.appendChild(st);
        var go = TS.el("button", "ts-btn", "🔍 Text nikaalo (OCR)"); go.type = "button"; c.appendChild(go);
        var out = TS.el("textarea", "ts-ta"); out.placeholder = "OCR ka text yahan aayega… (edit bhi kar sakte ho)"; out.style.display = "none"; wrap.appendChild(out);
        var row = TS.el("div", "ts-row"); row.style.display = "none"; wrap.appendChild(row);
        var cp = TS.el("button", "ts-btn sec", "📋 Copy karo"); cp.type = "button"; row.appendChild(cp);
        var pdfB = TS.el("button", "ts-btn", "📄 PDF banao"); pdfB.type = "button"; row.appendChild(pdfB);
        inp.onchange = function () {
          var f = inp.files[0]; if (!f) return;
          prev.src = URL.createObjectURL(f); prev.style.display = "";
          lab.childNodes[0].textContent = "✅ " + f.name + " ";
        };
        go.onclick = function () {
          var f = inp.files[0]; if (!f) { TS.notify("⚠️ Pehle image chuno"); return; }
          go.disabled = true; st.innerHTML = ""; prog.style.display = "";
          var s = TS.status(st, "⏳ Tesseract load ho raha hai…");
          loadTesseract().then(function (T) {
            return T.recognize(f, "hin+eng", {
              logger: function (m) {
                if (m.status === "recognizing text") { bar.style.width = Math.round(m.progress * 100) + "%"; s.textContent = "🔍 Text pehchana ja raha hai… " + Math.round(m.progress * 100) + "%"; }
                else s.textContent = "⏳ " + m.status + "…";
              }
            });
          }).then(function (res) {
            out.value = (res.data.text || "").trim();
            out.style.display = ""; row.style.display = "";
            st.innerHTML = ""; TS.status(st, "✅ OCR ho gaya — " + out.value.split(/\s+/).filter(Boolean).length + " shabd mile. Galtiyan ho to edit kar lo.", "ok");
          }).catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + ((e && e.message) || "OCR fail"), "err"); })
            .finally(function () { go.disabled = false; prog.style.display = "none"; bar.style.width = "0"; });
        };
        cp.onclick = function () {
          if (!out.value.trim()) return;
          if (navigator.clipboard) navigator.clipboard.writeText(out.value).then(function () { TS.notify("✅ Copy ho gaya"); }).catch(function () { out.select(); document.execCommand("copy"); TS.notify("✅ Copy ho gaya"); });
          else { out.select(); document.execCommand("copy"); TS.notify("✅ Copy ho gaya"); }
        };
        pdfB.onclick = function () {
          var txt = out.value.trim(); if (!txt) { TS.notify("⚠️ Pehle OCR karo"); return; }
          pdfB.disabled = true;
          var markup = "theme: navy-gold\n# OCR Text\n\n" + txt.replace(/\n{2,}/g, "\n\n");
          TS.markupToPdf(markup, "navy-gold", "OCR Text").then(function (bytes) {
            var name = TS.safeName("ocr-text", ".pdf");
            var blob = new Blob([bytes], { type: "application/pdf" });
            TS.downloadBlob(name, blob); TS.saveToLibrary(name, blob);
            try { if (window.App && App.setCurrentPdf) App.setCurrentPdf(bytes, name); } catch (e) {}
            TS.notify("✅ PDF taiyar", name);
          }).catch(function (e) { TS.notify("⚠️ PDF nahi bani", (e && e.message) || ""); })
            .finally(function () { pdfB.disabled = false; });
        };
        host.appendChild(wrap);
      }
    });
  });
})();

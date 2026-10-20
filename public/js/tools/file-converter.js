/* AI Everything — File Converter (txt/md/html→PDF, png↔jpg via canvas) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  ready(function (TS) {
    TS.reg("file-converter", {
      title: "File Converter", icon: "🔃",
      render: function (host) {
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "🔃 File Converter"));
        wrap.appendChild(TS.el("p", "ts-sub", "Har conversion ka type saaf likha hai — jo hota hai wahi dikhega. Sab conversions isi phone me hote hain."));
        var tb = TS.el("div"); wrap.appendChild(tb);
        var body = TS.el("div"); wrap.appendChild(body);
        TS.tabs(tb, ["📝 Text/MD/HTML → PDF", "🖼️ PNG ↔ JPG"], function (i) { body.innerHTML = ""; (i === 0 ? tabText : tabImg)(body); });
        function readText(f) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsText(f); }); }

        function tabText(host2) {
          var c = TS.el("div", "ts-card"); host2.appendChild(c);
          c.appendChild(TS.el("div", "ts-st", "ℹ️ Conversion type: file ka text nikaal kar VPDF themed PDF. .txt = plain text, .md = markdown headings/lists support, .html = tags hatakar text (design nahi aayega)."));
          var lab = TS.el("label", "ts-file", "📁 .txt / .md / .html file chuno");
          var inp = document.createElement("input"); inp.type = "file"; inp.accept = ".txt,.md,.html,.htm,text/plain,text/html"; inp.hidden = true; lab.appendChild(inp);
          c.appendChild(lab);
          c.appendChild(TS.el("label", "ts-lab", "…ya seedha yahan likho/paste karo:"));
          var ta = TS.el("textarea", "ts-ta"); ta.placeholder = "Content yahan…"; c.appendChild(ta);
          var row = TS.el("div", "ts-row"); c.appendChild(row);
          var sel = TS.el("select", "ts-sel"); sel.style.width = "auto"; row.appendChild(sel);
          var go = TS.el("button", "ts-btn", "📄 PDF banao"); go.type = "button"; row.appendChild(go);
          var st = TS.el("div"); c.appendChild(st);
          TS.ensureVpdf().then(function (V) { Object.keys(V.THEMES).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = V.THEMES[k].label; sel.appendChild(o); }); }).catch(function () {});
          inp.onchange = function () {
            var f = inp.files[0]; if (!f) return;
            lab.childNodes[0].textContent = "✅ " + f.name + " ";
            readText(f).then(function (t) {
              if (/\.html?$/i.test(f.name)) { var d = document.createElement("div"); d.innerHTML = t; ta.value = (d.textContent || "").replace(/\n{3,}/g, "\n\n"); }
              else ta.value = t;
            }).catch(function () { TS.notify("⚠️ File nahi padh paya"); });
          };
          go.onclick = function () {
            var txt = ta.value.trim(); if (!txt) { TS.notify("⚠️ Content khali hai"); return; }
            go.disabled = true; var s = TS.status(st, "📄 PDF ban rahi hai…");
            var theme = sel.value || "navy-gold";
            var markup = (/^theme\s*:/im.test(txt) || /^#{1,3}\s|^-\s|^\d+[.)]\s/m.test(txt)) ? txt : "theme: " + theme + "\n# Document\n\n" + txt;
            TS.markupToPdf(markup, theme, "converted", function (i, n) { s.textContent = "📄 page " + i + "/" + n; })
              .then(function (bytes) {
                st.innerHTML = ""; var name = TS.safeName("converted-file", ".pdf");
                var blob = new Blob([bytes], { type: "application/pdf" });
                TS.status(st, "✅ PDF taiyar (" + Math.round(blob.size / 1024) + " KB)", "ok");
                TS.downloadBlob(name, blob); TS.saveToLibrary(name, blob);
                try { if (window.App && App.setCurrentPdf) App.setCurrentPdf(bytes, name); } catch (e) {}
              })
              .catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + ((e && e.message) || "fail"), "err"); })
              .finally(function () { go.disabled = false; });
          };
        }
        function tabImg(host2) {
          var c = TS.el("div", "ts-card"); host2.appendChild(c);
          c.appendChild(TS.el("div", "ts-st", "ℹ️ Conversion type: canvas re-encode. PNG → JPG me transparency safed background ban jayegi; JPG → PNG me size badh sakta hai (lossless format)."));
          var lab = TS.el("label", "ts-file", "🖼️ PNG ya JPG image chuno");
          var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/png,image/jpeg"; inp.hidden = true; lab.appendChild(inp);
          c.appendChild(lab);
          var to = TS.el("select", "ts-sel");
          [["image/jpeg", "→ JPG (.jpg)"], ["image/png", "→ PNG (.png)"]].forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; to.appendChild(op); });
          c.appendChild(TS.el("label", "ts-lab", "Target format:"));
          c.appendChild(to);
          var img = TS.el("img"); img.style.cssText = "max-width:100%;border-radius:10px;margin-top:10px;display:none;"; c.appendChild(img);
          var go = TS.el("button", "ts-btn", "🔃 Convert + Download"); go.type = "button"; c.appendChild(go);
          var st = TS.el("div"); c.appendChild(st);
          inp.onchange = function () { var f = inp.files[0]; if (!f) return; img.src = URL.createObjectURL(f); img.style.display = ""; lab.childNodes[0].textContent = "✅ " + f.name + " "; };
          go.onclick = function () {
            var f = inp.files[0]; if (!f) { TS.notify("⚠️ Pehle image chuno"); return; }
            var im = new Image();
            im.onload = function () {
              var cv = document.createElement("canvas"); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
              var cx = cv.getContext("2d");
              if (to.value === "image/jpeg") { cx.fillStyle = "#ffffff"; cx.fillRect(0, 0, cv.width, cv.height); }
              cx.drawImage(im, 0, 0);
              cv.toBlob(function (b) {
                if (!b) { TS.status(st, "⚠️ Convert fail", "err"); return; }
                var ext = to.value === "image/jpeg" ? ".jpg" : ".png";
                var name = TS.safeName(f.name.replace(/\.(png|jpe?g)$/i, ""), ext);
                TS.downloadBlob(name, b); TS.saveToLibrary(name, b);
                TS.status(st, "✅ Convert ho gaya: " + name + " (" + Math.round(b.size / 1024) + " KB)", "ok");
              }, to.value, 0.92);
            };
            im.onerror = function () { TS.status(st, "⚠️ Image load nahi hui", "err"); };
            im.src = URL.createObjectURL(f);
          };
        }
        tabText(body);
        host.appendChild(wrap);
      }
    });
  });
})();

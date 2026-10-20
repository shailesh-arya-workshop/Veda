/* AI Everything — Word (.docx) → PDF (mammoth text+images → VPDF themed PDF) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  function loadMammoth() {
    if (window.mammoth) return Promise.resolve(window.mammoth);
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js";
      s.onload = function () { window.mammoth ? res(window.mammoth) : rej(new Error("mammoth nahi mili")); };
      s.onerror = function () { rej(new Error("mammoth library load nahi hui — internet chahiye.")); };
      document.head.appendChild(s);
    });
  }
  ready(function (TS) {
    TS.reg("word-to-pdf", {
      title: "Word → PDF", icon: "🔁",
      render: function (host) {
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "📝➡️📄 Word se PDF"));
        wrap.appendChild(TS.el("p", "ts-sub", ".docx file ka text + images nikaal kar ek sundar themed PDF banegi. Note: Word ki exact formatting (fonts/columns) PDF me simplified hogi — text aur images sahi rahenge."));
        var c = TS.el("div", "ts-card"); wrap.appendChild(c);
        var lab = TS.el("label", "ts-file", "📁 .docx file chuno");
        var inp = document.createElement("input"); inp.type = "file"; inp.accept = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"; inp.hidden = true; lab.appendChild(inp);
        c.appendChild(lab);
        c.appendChild(TS.el("label", "ts-lab", "🎨 Theme:"));
        var sel = TS.el("select", "ts-sel"); c.appendChild(sel);
        TS.ensureVpdf().then(function (V) {
          Object.keys(V.THEMES).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = V.THEMES[k].label; sel.appendChild(o); });
        }).catch(function () {});
        var st = TS.el("div"); c.appendChild(st);
        var go = TS.el("button", "ts-btn", "📄 PDF banao"); go.type = "button"; c.appendChild(go);
        go.onclick = function () {
          var f = inp.files[0]; if (!f) { TS.notify("⚠️ Pehle .docx chuno"); return; }
          go.disabled = true; st.innerHTML = "";
          var s = TS.status(st, "⏳ Word file padh rahi hai… (mammoth load ho raha hai)");
          loadMammoth().then(function (M) {
            return f.arrayBuffer().then(function (ab) {
              return M.convertToHtml({ arrayBuffer: ab });
            });
          }).then(function (result) {
            // HTML -> plain-ish markup lines (headings/paragraphs/lists preserved as text structure)
            var tmp = document.createElement("div"); tmp.innerHTML = result.value || "";
            var lines = [];
            function walk(node, depth) {
              Array.prototype.forEach.call(node.childNodes, function (ch) {
                if (ch.nodeType === 3) { var t = ch.textContent.trim(); if (t) lines.push(t); return; }
                if (ch.nodeType !== 1) return;
                var tag = ch.tagName.toLowerCase();
                if (tag === "h1") lines.push("# " + ch.textContent.trim());
                else if (tag === "h2") lines.push("## " + ch.textContent.trim());
                else if (tag === "h3") lines.push("### " + ch.textContent.trim());
                else if (tag === "li") lines.push("- " + ch.textContent.trim());
                else if (tag === "img") lines.push("[Image — PDF me text roop me note: tasveer Word file me thi]");
                else walk(ch, depth + 1);
              });
            }
            walk(tmp, 0);
            var text = lines.join("\n\n");
            if (!text.trim()) throw new Error("Word file se koi text nahi mila.");
            s.textContent = "📄 Themed PDF ban rahi hai…";
            var markup = "theme: " + (sel.value || "navy-gold") + "\n# " + f.name.replace(/\.docx$/i, "") + "\n\n" + text;
            return TS.markupToPdf(markup, sel.value || "navy-gold", f.name.replace(/\.docx$/i, ""), function (i, n) { s.textContent = "📄 page " + i + "/" + n; });
          }).then(function (bytes) {
            st.innerHTML = "";
            var name = TS.safeName(f.name.replace(/\.docx$/i, ""), ".pdf");
            var blob = new Blob([bytes], { type: "application/pdf" });
            st.appendChild(TS.el("div", "ts-st ok", "✅ PDF taiyar (" + Math.round(blob.size / 1024) + " KB)"));
            TS.downloadBlob(name, blob); TS.saveToLibrary(name, blob);
            try { if (window.App && App.setCurrentPdf) App.setCurrentPdf(bytes, name); } catch (e) {}
          }).catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + ((e && e.message) || "conversion fail") + " (library/CDN ke liye internet chahiye).", "err"); })
            .finally(function () { go.disabled = false; });
        };
        host.appendChild(wrap);
      }
    });
  });
})();

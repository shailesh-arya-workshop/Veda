/* AI Everything — Image Studio (Generate via /api/image + Canvas Edit) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  ready(function (TS) {
    TS.reg("image-studio", {
      title: "Image Studio", icon: "🎨",
      render: function (host) {
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "🎨 Image Studio"));
        wrap.appendChild(TS.el("p", "ts-sub", "AI se image banao (server ka image API) ya apni photo ko canvas par edit karo — crop, rotate, filters, text."));
        var tb = TS.el("div"); wrap.appendChild(tb);
        var body = TS.el("div"); wrap.appendChild(body);
        TS.tabs(tb, ["✨ Generate", "🖌️ Edit (Canvas)"], function (i) { body.innerHTML = ""; (i === 0 ? tabGen : tabEdit)(body); });

        /* ---------------- Generate ---------------- */
        function tabGen(b) {
          var c = TS.el("div", "ts-card"); b.appendChild(c);
          c.appendChild(TS.el("label", "ts-lab", "✨ Image ka description (prompt) — English me behtar result:"));
          var ta = TS.el("textarea", "ts-ta"); ta.style.minHeight = "70px"; ta.placeholder = "jaise: a cute robot reading a book, golden light, digital art"; c.appendChild(ta);
          var row = TS.el("div", "ts-grid2"); c.appendChild(row);
          var wd = TS.el("div"); row.appendChild(wd); wd.appendChild(TS.el("label", "ts-lab", "Width"));
          var wIn = TS.el("input", "ts-in"); wIn.type = "number"; wIn.value = "1024"; wd.appendChild(wIn);
          var hd = TS.el("div"); row.appendChild(hd); hd.appendChild(TS.el("label", "ts-lab", "Height"));
          var hIn = TS.el("input", "ts-in"); hIn.type = "number"; hIn.value = "1024"; hd.appendChild(hIn);
          var go = TS.el("button", "ts-btn", "✨ Image banao"); go.type = "button"; c.appendChild(go);
          var st = TS.el("div"); c.appendChild(st);
          var imgWrap = TS.el("div"); c.appendChild(imgWrap);
          go.onclick = function () {
            var p = ta.value.trim(); if (!p) { TS.notify("⚠️ Prompt likho"); return; }
            var w = Math.max(256, Math.min(2048, +wIn.value || 1024)), h = Math.max(256, Math.min(2048, +hIn.value || 1024));
            go.disabled = true; imgWrap.innerHTML = "";
            var s = TS.status(st, "✨ Image ban rahi hai… (30–60 sec lag sakte hain)");
            var url = "/api/image?prompt=" + encodeURIComponent(p) + "&w=" + w + "&h=" + h;
            fetch(url).then(function (r) {
              if (!r.ok) throw new Error("server " + r.status + " — image service abhi uplabdh nahi");
              return r.blob();
            }).then(function (blob) {
              st.innerHTML = "";
              var objUrl = URL.createObjectURL(blob);
              var im = TS.el("img"); im.src = objUrl; im.style.cssText = "max-width:100%;border-radius:12px;";
              imgWrap.appendChild(im);
              var r2 = TS.el("div", "ts-row"); imgWrap.appendChild(r2);
              var dl = TS.el("button", "ts-btn", "⬇️ Download"); dl.type = "button";
              dl.onclick = function () { TS.downloadBlob(TS.safeName("ai-image", ".png"), blob); };
              var lib = TS.el("button", "ts-btn sec", "📚 Library me save"); lib.type = "button";
              lib.onclick = function () { TS.saveToLibrary("ai-image.png", blob); TS.notify("✅ Library me save"); };
              var vid = TS.el("button", "ts-btn dark", "🎬 Video me use karo"); vid.type = "button";
              vid.onclick = function () {
                TS.saveToLibrary("ai-image.png", blob);
                try { if (window.__videoSeed === undefined) window.__videoSeed = []; window.__videoSeed.push(blob); } catch (e) {}
                TS.notify("🎬 Video tool kholo", "Slideshow me ye image Library se milegi.");
                try { if (window.App && App.show) App.show("video"); } catch (e) {}
              };
              r2.appendChild(dl); r2.appendChild(lib); r2.appendChild(vid);
              TS.status(st, "✅ Image ban gayi (" + Math.round(blob.size / 1024) + " KB)", "ok");
            }).catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ " + ((e && e.message) || "image nahi bani") + ". Server par image service band ho sakti hai — thodi der baad try karo.", "err"); })
              .finally(function () { go.disabled = false; });
          };
        }

        /* ---------------- Edit ---------------- */
        function tabEdit(b) {
          var c = TS.el("div", "ts-card"); b.appendChild(c);
          var keyOn = TS.hasChatKey();
          if (!keyOn) {
            c.appendChild(TS.el("div", "ts-st", "ℹ️ AI-edit (jaise background badalna, object hatana) is version me uplabdh nahi — iske liye koi chat/API key configure nahi mili aur koi fake button nahi lagaya gaya. Neeche ke canvas tools (crop/rotate/filter/text) bilkul asal hain aur bina key ke chalte hain."));
          } else {
            c.appendChild(TS.el("div", "ts-st", "ℹ️ AI-edit ke liye server par dedicated image-edit API chahiye jo abhi configure nahi hai — isliye ye button band hai. Canvas tools neeche asal hain."));
          }
          var lab = TS.el("label", "ts-file", "🖼️ Image chuno");
          var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.hidden = true; lab.appendChild(inp);
          c.appendChild(lab);
          var cv = TS.el("canvas", "ts-cv"); cv.width = 640; cv.height = 400; c.appendChild(cv);
          var cx = cv.getContext("2d");
          cx.fillStyle = "#f7f2df"; cx.fillRect(0, 0, cv.width, cv.height);
          cx.fillStyle = "#8a7a2a"; cx.font = "16px sans-serif"; cx.fillText("Pehle image chuno…", 20, 40);
          var img = null, base = null;
          function redraw() { if (!img) return; var sc = Math.min(cv.width / img.naturalWidth, cv.height / img.naturalHeight, 1); cv.width = Math.max(50, Math.round(img.naturalWidth * sc)); cv.height = Math.max(50, Math.round(img.naturalHeight * sc)); cx.drawImage(img, 0, 0, cv.width, cv.height); base = document.createElement("canvas"); base.width = cv.width; base.height = cv.height; base.getContext("2d").drawImage(cv, 0, 0); }
          inp.onchange = function () {
            var f = inp.files[0]; if (!f) return;
            var im = new Image();
            im.onload = function () { img = im; redraw(); lab.childNodes[0].textContent = "✅ " + f.name + " "; };
            im.src = URL.createObjectURL(f);
          };
          var ops = TS.el("div", "ts-row"); c.appendChild(ops);
          function opBtn(label, fn) { var bt = TS.el("button", "ts-btn sec sm", label); bt.type = "button"; bt.onclick = function () { if (!img) { TS.notify("⚠️ Pehle image chuno"); return; } fn(); }; ops.appendChild(bt); return bt; }
          opBtn("↻ Rotate 90°", function () {
            var t = document.createElement("canvas"); t.width = cv.height; t.height = cv.width;
            var tx = t.getContext("2d"); tx.translate(t.width / 2, t.height / 2); tx.rotate(Math.PI / 2); tx.drawImage(cv, -cv.width / 2, -cv.height / 2);
            cv.width = t.width; cv.height = t.height; cx.drawImage(t, 0, 0);
          });
          opBtn("✂️ Center crop (square)", function () {
            var s = Math.min(cv.width, cv.height), sx = (cv.width - s) / 2, sy = (cv.height - s) / 2;
            var t = document.createElement("canvas"); t.width = s; t.height = s; t.getContext("2d").drawImage(cv, sx, sy, s, s, 0, 0, s, s);
            cv.width = s; cv.height = s; cx.drawImage(t, 0, 0);
          });
          opBtn("◐ Grayscale", function () { applyFilter("grayscale(1)"); });
          opBtn("🟤 Sepia", function () { applyFilter("sepia(0.8)"); });
          opBtn("🌓 Invert", function () { applyFilter("invert(1)"); });
          opBtn("☀️ Brightness +", function () { applyFilter("brightness(1.25)"); });
          opBtn("↩️ Reset", function () { if (base) { cv.width = base.width; cv.height = base.height; cx.drawImage(base, 0, 0); } });
          function applyFilter(f) {
            var t = document.createElement("canvas"); t.width = cv.width; t.height = cv.height;
            var tx = t.getContext("2d"); tx.filter = f; tx.drawImage(cv, 0, 0);
            cx.filter = "none"; cx.clearRect(0, 0, cv.width, cv.height); cx.drawImage(t, 0, 0);
          }
          var rs = TS.el("div", "ts-grid2"); c.appendChild(rs);
          var rw = TS.el("input", "ts-in"); rw.type = "number"; rw.placeholder = "Nayi width (px)"; rs.appendChild(rw);
          var rsB = TS.el("button", "ts-btn sec", "📐 Resize"); rsB.type = "button"; rs.appendChild(rsB);
          rsB.onclick = function () {
            if (!img) { TS.notify("⚠️ Pehle image chuno"); return; }
            var nw = +rw.value; if (!nw || nw < 10) { TS.notify("⚠️ Sahi width likho"); return; }
            var nh = Math.round(cv.height * nw / cv.width);
            var t = document.createElement("canvas"); t.width = nw; t.height = nh; t.getContext("2d").drawImage(cv, 0, 0, nw, nh);
            cv.width = nw; cv.height = nh; cx.drawImage(t, 0, 0);
          };
          c.appendChild(TS.el("label", "ts-lab", "✍️ Text overlay (neeche-beech me bada text):"));
          var txIn = TS.el("input", "ts-in"); txIn.placeholder = "jaise: Happy Birthday!"; c.appendChild(txIn);
          var txB = TS.el("button", "ts-btn sec", "✍️ Text lagao"); txB.type = "button"; c.appendChild(txB);
          txB.onclick = function () {
            if (!img) { TS.notify("⚠️ Pehle image chuno"); return; }
            var t = txIn.value.trim(); if (!t) return;
            cx.font = "bold " + Math.max(20, Math.round(cv.width / 14)) + "px sans-serif";
            cx.textAlign = "center";
            cx.lineWidth = 6; cx.strokeStyle = "rgba(0,0,0,.65)";
            var y = cv.height - 24;
            cx.strokeText(t, cv.width / 2, y); cx.fillStyle = "#f5d76e"; cx.fillText(t, cv.width / 2, y);
          };
          var ex = TS.el("div", "ts-row"); c.appendChild(ex);
          var ePng = TS.el("button", "ts-btn", "⬇️ PNG export"); ePng.type = "button"; ex.appendChild(ePng);
          var eJpg = TS.el("button", "ts-btn sec", "⬇️ JPG export"); eJpg.type = "button"; ex.appendChild(eJpg);
          function exp(type, ext) { if (!img) { TS.notify("⚠️ Pehle image chuno"); return; } cv.toBlob(function (bl) { if (bl) { TS.downloadBlob(TS.safeName("edited-image", ext), bl); TS.saveToLibrary("edited-image" + ext, bl); TS.notify("✅ Export ho gaya"); } }, type, 0.92); }
          ePng.onclick = function () { exp("image/png", ".png"); };
          eJpg.onclick = function () { exp("image/jpeg", ".jpg"); };
        }
        tabGen(body);
        host.appendChild(wrap);
      }
    });
  });
})();

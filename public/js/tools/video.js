/* AI Everything — Slideshow Video Maker (canvas + MediaRecorder, honest label) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  ready(function (TS) {
    TS.reg("video", {
      title: "Slideshow Video", icon: "🎬",
      render: function (host) {
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "🎬 Slideshow Video Maker"));
        wrap.appendChild(TS.el("p", "ts-sub", "⚠️ Saaf baat: ye AI-video generator NAHI hai. Ye tumhari photos ko Ken Burns (halka pan/zoom) animation + captions ke saath ek asli .webm video me badalta hai — isi phone me, koi server nahi."));
        var c = TS.el("div", "ts-card"); wrap.appendChild(c);
        var lab = TS.el("label", "ts-file", "🖼️ Slide images chuno (2–10, order = video order)");
        var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = true; inp.hidden = true; lab.appendChild(inp);
        c.appendChild(lab);
        wrap.appendChild(TS.el("p", "ts-note", "💡 Image Studio se bani images Library me hain — wahan se download karke yahan upload kar sakte ho."));
        var listHost = TS.el("div"); c.appendChild(listHost);
        var slides = []; // {file, img, caption, dur}
        inp.onchange = function () {
          var fs = Array.prototype.slice.call(inp.files).slice(0, 10);
          slides = [];
          listHost.innerHTML = "";
          fs.forEach(function (f, i) {
            var im = new Image();
            var it = { file: f, img: im, caption: "", dur: 3 };
            im.src = URL.createObjectURL(f);
            slides.push(it);
            var row = TS.el("div", "ts-card");
            row.appendChild(TS.el("div", "ts-note", "🖼️ Slide " + (i + 1) + ": " + TS.esc(f.name)));
            row.appendChild(TS.el("label", "ts-lab", "✍️ Is slide ka caption:"));
            var cap = TS.el("input", "ts-in"); cap.placeholder = "Caption (khali bhi chalega)"; row.appendChild(cap);
            cap.oninput = function () { it.caption = cap.value; };
            row.appendChild(TS.el("label", "ts-lab", "⏱️ Duration (second):"));
            var du = TS.el("input", "ts-in"); du.type = "number"; du.value = "3"; du.min = "1"; du.max = "10"; row.appendChild(du);
            du.oninput = function () { it.dur = Math.max(1, Math.min(10, +du.value || 3)); };
            listHost.appendChild(row);
          });
          lab.childNodes[0].textContent = "✅ " + fs.length + " slides ";
        };
        var cv = TS.el("canvas", "ts-cv"); cv.width = 720; cv.height = 1280; cv.style.maxHeight = "420px"; cv.style.objectFit = "contain"; c.appendChild(cv);
        var cx = cv.getContext("2d");
        if (cx) {
          cx.fillStyle = "#14161b"; cx.fillRect(0, 0, cv.width, cv.height);
          cx.fillStyle = "#f5d76e"; cx.font = "28px sans-serif"; cx.textAlign = "center";
          cx.fillText("Preview yahan chalega", cv.width / 2, cv.height / 2);
        }
        var st = TS.el("div"); c.appendChild(st);
        var row2 = TS.el("div", "ts-row"); c.appendChild(row2);
        var go = TS.el("button", "ts-btn", "🎬 Video banao (.webm)"); go.type = "button"; row2.appendChild(go);
        var vidHost = TS.el("div"); c.appendChild(vidHost);
        function drawSlide(ctx2, s, t01, W, H) {
          ctx2.fillStyle = "#000"; ctx2.fillRect(0, 0, W, H);
          if (!s.img || !s.img.complete || !s.img.naturalWidth) return;
          // Ken Burns: alternate zoom-in / zoom-out per slide index parity via scale 1.0->1.15
          var zoomIn = (slides.indexOf(s) % 2 === 0);
          var scale0 = zoomIn ? 1.0 : 1.15, scale1 = zoomIn ? 1.15 : 1.0;
          var sc = scale0 + (scale1 - scale0) * t01;
          var iw = s.img.naturalWidth, ih = s.img.naturalHeight;
          var cover = Math.max(W / iw, H / ih) * sc;
          var dw = iw * cover, dh = ih * cover;
          var pan = (t01 - 0.5) * 24 * (zoomIn ? 1 : -1);
          ctx2.drawImage(s.img, (W - dw) / 2 + pan, (H - dh) / 2, dw, dh);
          if (s.caption && s.caption.trim()) {
            ctx2.font = "bold 34px sans-serif"; ctx2.textAlign = "center";
            var txt = s.caption.trim();
            ctx2.lineWidth = 8; ctx2.strokeStyle = "rgba(0,0,0,.7)";
            ctx2.strokeText(txt, W / 2, H - 60);
            ctx2.fillStyle = "#ffffff"; ctx2.fillText(txt, W / 2, H - 60);
            ctx2.fillStyle = "rgba(0,0,0,.35)"; ctx2.fillRect(0, H - 110, W, 110);
            ctx2.fillStyle = "#ffffff"; ctx2.fillText(txt, W / 2, H - 60);
          }
        }
        go.onclick = function () {
          if (slides.length < 1) { TS.notify("⚠️ Pehle kam se kam 1 image chuno"); return; }
          if (!window.MediaRecorder) { TS.status(st, "⚠️ Is browser me MediaRecorder nahi hai — Chrome/Android browser me kholo.", "err"); return; }
          go.disabled = true; vidHost.innerHTML = "";
          var s0 = TS.status(st, "🎬 Video record ho raha hai… (slides ke total time ke barabar lagega)");
          var stream = cv.captureStream(30);
          var mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
          var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 });
          var chunks = [];
          rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          rec.onstop = function () {
            var blob = new Blob(chunks, { type: "video/webm" });
            var v = document.createElement("video");
            v.controls = true; v.src = URL.createObjectURL(blob); v.style.cssText = "max-width:100%;border-radius:12px;margin-top:10px;";
            vidHost.appendChild(v);
            st.innerHTML = "";
            TS.status(st, "✅ Video taiyar (" + Math.round(blob.size / 1024) + " KB, .webm). Kuch phones par .webm gallery me nahi dikhta — Files app se kholo ya share karo.", "ok");
            TS.downloadBlob(TS.safeName("slideshow", ".webm"), blob);
            TS.saveToLibrary("slideshow.webm", blob);
            go.disabled = false;
          };
          rec.start(250);
          // play slides in sequence with rAF
          var idx = 0;
          function playSlide() {
            if (idx >= slides.length) { setTimeout(function () { try { rec.stop(); } catch (e) {} }, 300); return; }
            var s = slides[idx];
            var durMs = s.dur * 1000, t0 = performance.now();
            (function frame(now) {
              var t = Math.min(1, (now - t0) / durMs);
              drawSlide(cx, s, t, cv.width, cv.height);
              if (t < 1 && rec.state === "recording") requestAnimationFrame(frame);
              else { idx++; playSlide(); }
            })(t0);
          }
          // ensure images decoded
          Promise.all(slides.map(function (s) { return s.img.decode ? s.img.decode().catch(function () {}) : Promise.resolve(); })).then(playSlide);
        };
        // Optional external video API (hidden unless configured in settings)
        try {
          var sraw = localStorage.getItem("aiw-settings") || "{}";
          var stg = JSON.parse(sraw);
          if (stg.videoApiUrl) {
            var ext = TS.el("div", "ts-card"); wrap.appendChild(ext);
            ext.appendChild(TS.el("h2", "ts-h", "🌐 External Video API (configured)"));
            ext.appendChild(TS.el("p", "ts-sub", "Settings me video API URL mila hai — prompt bhejkar real API video banane ki koshish hogi. API ka apna format alag ho sakta hai; fail ho to error dikhega, fake video nahi banegi."));
            var pr = TS.el("input", "ts-in"); pr.placeholder = "Video prompt…"; ext.appendChild(pr);
            var eb = TS.el("button", "ts-btn dark", "🌐 API se video banao"); eb.type = "button"; ext.appendChild(eb);
            var es = TS.el("div"); ext.appendChild(es);
            eb.onclick = function () {
              if (!pr.value.trim()) { TS.notify("⚠️ Prompt likho"); return; }
              eb.disabled = true;
              fetch(stg.videoApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (stg.videoApiKey || "") }, body: JSON.stringify({ prompt: pr.value.trim() }) })
                .then(function (r) { if (!r.ok) throw new Error("API " + r.status); return r.blob(); })
                .then(function (bl) { TS.downloadBlob(TS.safeName("api-video", ".mp4"), bl); TS.status(es, "✅ API video download ho gaya.", "ok"); })
                .catch(function (e) { TS.status(es, "⚠️ API fail: " + ((e && e.message) || "") + " — slideshow maker upar hai, wahi asli vikalp hai.", "err"); })
                .finally(function () { eb.disabled = false; });
            };
          }
        } catch (e) {}
        host.appendChild(wrap);
      }
    });
  });
})();

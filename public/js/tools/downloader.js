/* AI Everything — Downloader (direct files + yt-dlp when server supports it) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  ready(function (TS) {
    TS.reg("downloader", {
      title: "Downloader", icon: "⬇️",
      render: function (host) {
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "⬇️ Downloader"));
        wrap.appendChild(TS.el("p", "ts-sub", "Direct file links (mp4/pdf/jpg/zip…) seedha download hote hain. YouTube/Instagram ke liye server par yt-dlp chahiye — neeche status khud check hota hai, jhootha download button nahi dikhega."));
        var c = TS.el("div", "ts-card"); wrap.appendChild(c);
        c.appendChild(TS.el("label", "ts-lab", "🔗 Link paste karo:"));
        var inp = TS.el("input", "ts-in"); inp.placeholder = "https://… (video/file/YouTube/Instagram link)"; c.appendChild(inp);
        var row = TS.el("div", "ts-row"); c.appendChild(row);
        var paste = TS.el("button", "ts-btn sec sm", "📋 Paste"); paste.type = "button"; row.appendChild(paste);
        var go = TS.el("button", "ts-btn", "⬇️ Download / Check karo"); go.type = "button"; row.appendChild(go);
        var st = TS.el("div"); c.appendChild(st);
        var resHost = TS.el("div"); c.appendChild(resHost);
        var healthBox = TS.el("div"); c.appendChild(healthBox);
        paste.onclick = function () {
          if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) { inp.value = t || inp.value; }).catch(function () { TS.notify("⚠️ Clipboard permission nahi mili — paste long-press se karo"); });
          else TS.notify("⚠️ Is browser me auto-paste nahi hota — input me long-press karke paste karo");
        };
        function isDirect(url) { return /\.(mp4|webm|mov|mp3|m4a|wav|pdf|zip|rar|jpg|jpeg|png|gif|webp|apk|txt)(\?|#|$)/i.test(url); }
        function isSocial(url) { return /(youtube\.com|youtu\.be|instagram\.com|facebook\.com\/watch|fb\.watch)/i.test(url); }
        function checkHealth() {
          return fetch("/api/health").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
        }
        checkHealth().then(function (h) {
          if (!h) { healthBox.appendChild(TS.el("div", "ts-st err", "⚠️ Server health check fail — /api/health nahi mila. Direct file download phir bhi try ho sakta hai.")); return; }
          var ytdlp = !!(h.features && h.features.ytdlp);
          healthBox.appendChild(TS.el("div", "ts-st" + (ytdlp ? " ok" : ""), ytdlp ? "✅ Server par yt-dlp uplabdh hai — YouTube/Instagram download chalega." : "ℹ️ Server par yt-dlp NAHI hai (features.ytdlp = false). YouTube/Instagram download is deploy par nahi chalega — neeche wajah aur hal hai."));
        });
        go.onclick = function () {
          var url = inp.value.trim();
          resHost.innerHTML = ""; st.innerHTML = "";
          if (!/^https?:\/\//i.test(url)) { TS.status(st, "⚠️ Sahi link daalo (http:// ya https:// se shuru).", "err"); return; }
          if (isDirect(url) && !isSocial(url)) {
            var s = TS.status(st, "⬇️ Direct file hai — download shuru kar rahe hain…");
            var a = document.createElement("a"); a.href = url; a.download = ""; a.target = "_blank"; a.rel = "noopener";
            document.body.appendChild(a); a.click(); a.remove();
            var fb = TS.el("button", "ts-btn sec", "🔁 Nahi hua? Server proxy se try karo (/api/dl/file)"); fb.type = "button"; resHost.appendChild(fb);
            fb.onclick = function () {
              TS.status(st, "⏳ Proxy se la rahe hain…");
              fetch("/api/dl/file?url=" + encodeURIComponent(url)).then(function (r) { if (!r.ok) throw new Error("proxy " + r.status); return r.blob(); })
                .then(function (bl) { var nm = (url.split("/").pop() || "file").split("?")[0]; TS.downloadBlob(nm, bl); TS.saveToLibrary(nm, bl); TS.status(st, "✅ Proxy se download ho gaya (" + Math.round(bl.size / 1024) + " KB)", "ok"); })
                .catch(function (e) { TS.status(st, "⚠️ Proxy bhi fail: " + ((e && e.message) || "") + " — site direct download rok rahi hogi (hotlink protection).", "err"); });
            };
            return;
          }
          if (isSocial(url)) {
            go.disabled = true;
            var s2 = TS.status(st, "⏳ Server check ho raha hai (yt-dlp hai ya nahi)…");
            checkHealth().then(function (h) {
              var ytdlp = !!(h && h.features && h.features.ytdlp);
              if (!ytdlp) {
                st.innerHTML = "";
                var p = TS.el("div", "ts-card"); resHost.appendChild(p);
                p.appendChild(TS.el("div", "ts-st err", "🚫 Server par yt-dlp nahi hai — is deploy par YouTube/Instagram download NAHI chalega. Button band hai kyunki fake download nahi dikhayenge."));
                p.appendChild(TS.el("p", "ts-note", "Hal: app ko Docker deploy karo (project me Dockerfile shamil hai — Render par 'Docker' environment chuno, 'Node' nahi). Docker image me yt-dlp + ffmpeg pehle se install hota hai, tab yehi page apne aap kaam karne lagega. Tab tak: direct file links upar wale tareeke se download ho jayenge."));
                go.disabled = false; return;
              }
              st.innerHTML = "";
              var s3 = TS.status(st, "⏳ Video ki info la rahe hain (/api/dl/info)…");
              fetch("/api/dl/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url }) })
                .then(function (r) { if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error((j && j.error) || ("info " + r.status)); }); return r.json(); })
                .then(function (info) {
                  st.innerHTML = "";
                  var card = TS.el("div", "ts-card"); resHost.appendChild(card);
                  card.appendChild(TS.el("div", "ts-h", "🎬 " + TS.esc(info.title || "Video")));
                  if (info.thumbnail) { var im = TS.el("img"); im.src = info.thumbnail; im.style.cssText = "max-width:100%;border-radius:10px;"; card.appendChild(im); }
                  var fmts = info.formats || info.qualities || [];
                  if (info.audio) fmts = fmts.concat([{ id: info.audio.id, label: "🎵 " + (info.audio.label || "Audio") }]);
                  if (!fmts.length && info.url) fmts = [{ label: "Best quality", url: info.url }];
                  if (!fmts.length) { card.appendChild(TS.el("div", "ts-st err", "⚠️ Koi downloadable format nahi mila. Video private/age-restricted ho sakta hai.")); go.disabled = false; return; }
                  fmts.forEach(function (fm) {
                    var b = TS.el("button", "ts-btn sec", "⬇️ " + TS.esc(fm.label || fm.quality || fm.format || "Download")); b.type = "button";
                    b.style.margin = "4px 4px 4px 0";
                    b.onclick = function () {
                      b.disabled = true; b.textContent = "⏳ Link taiyar ho raha hai…";
                      fetch("/api/dl/resolve?url=" + encodeURIComponent(url) + "&format_id=" + encodeURIComponent(fm.id || fm.format_id || "") + "&ytClient=" + encodeURIComponent(info.ytClient || "default"))
                        .then(function (r) { if (!r.ok) throw new Error("resolve " + r.status); return r.json(); })
                        .then(function (rj) {
                          var du = rj.url || rj.downloadUrl || fm.url;
                          if (!du) throw new Error("download URL nahi mila");
                          var a2 = document.createElement("a"); a2.href = du; a2.download = ""; a2.target = "_blank"; a2.rel = "noopener";
                          document.body.appendChild(a2); a2.click(); a2.remove();
                          b.textContent = "✅ Download shuru"; 
                        })
                        .catch(function (e) { b.disabled = false; b.textContent = "⬇️ Dobara try"; TS.notify("⚠️ Fail", (e && e.message) || ""); });
                    };
                    card.appendChild(b);
                  });
                  go.disabled = false;
                })
                .catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ Info nahi mili: " + ((e && e.message) || "") + " — link private ho sakta hai ya server par yt-dlp block ho raha hai (YouTube kabhi-kabhi datacenter IP rokta hai).", "err"); go.disabled = false; });
            });
            return;
          }
          // unknown link type
          var s4 = TS.status(st, "ℹ️ Ye link na direct file hai, na pehchana hua social link. Proxy se download try karte hain…");
          fetch("/api/dl/file?url=" + encodeURIComponent(url)).then(function (r) { if (!r.ok) throw new Error("proxy " + r.status); return r.blob(); })
            .then(function (bl) { var nm = (url.split("/").pop() || "download").split("?")[0] || "download"; TS.downloadBlob(nm, bl); TS.saveToLibrary(nm, bl); st.innerHTML = ""; TS.status(st, "✅ Download ho gaya (" + Math.round(bl.size / 1024) + " KB)", "ok"); })
            .catch(function (e) { st.innerHTML = ""; TS.status(st, "⚠️ Download nahi hua: " + ((e && e.message) || "") + ". Agar ye ek web page hai (file nahi), to download hone layak kuch nahi hai.", "err"); });
        };
        host.appendChild(wrap);
      }
    });
  });
})();

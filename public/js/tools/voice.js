/* AI Everything — Voice (Text-to-Speech, speechSynthesis) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  ready(function (TS) {
    TS.reg("voice", {
      title: "Voice — Bolkar Suno", icon: "🔊",
      render: function (host) {
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "🔊 Voice — Text-to-Speech"));
        wrap.appendChild(TS.el("p", "ts-sub", "Likha hua text bolkar suno. Awaazein tumhare phone/browser ki hain (offline bhi chalti hain, quality device par nirbhar)."));
        wrap.appendChild(TS.el("div", "ts-st", "🎤 Voice Input (bolkar likhna) chat/home ke mic button par hai — wahi se bolo, text chat me aa jayega. Ye page sirf sunane (TTS) ke liye hai."));
        var c = TS.el("div", "ts-card"); wrap.appendChild(c);
        c.appendChild(TS.el("label", "ts-lab", "📝 Jo sunna hai, woh likho:"));
        var ta = TS.el("textarea", "ts-ta"); ta.style.minHeight = "110px";
        ta.value = "नमस्ते! मैं तुम्हारी पढ़ाई में मदद के लिए हूँ। आज हम विज्ञान का एक नया पाठ पढ़ेंगे।";
        c.appendChild(ta);
        c.appendChild(TS.el("label", "ts-lab", "🗣️ Awaaz (voice):"));
        var vsel = TS.el("select", "ts-sel"); c.appendChild(vsel);
        var grid = TS.el("div", "ts-grid2"); c.appendChild(grid);
        var rd = TS.el("div"); grid.appendChild(rd); rd.appendChild(TS.el("label", "ts-lab", "⏩ Speed (rate): <span id='vr'>1.0</span>"));
        var rate = TS.el("input", "ts-in"); rate.type = "range"; rate.min = "0.5"; rate.max = "2"; rate.step = "0.1"; rate.value = "1"; rd.appendChild(rate);
        var pd = TS.el("div"); grid.appendChild(pd); pd.appendChild(TS.el("label", "ts-lab", "🎵 Pitch: <span id='vp'>1.0</span>"));
        var pitch = TS.el("input", "ts-in"); pitch.type = "range"; pitch.min = "0"; pitch.max = "2"; pitch.step = "0.1"; pitch.value = "1"; pd.appendChild(pitch);
        rate.oninput = function () { var s = document.getElementById("vr"); if (s) s.textContent = (+rate.value).toFixed(1); };
        pitch.oninput = function () { var s = document.getElementById("vp"); if (s) s.textContent = (+pitch.value).toFixed(1); };
        var row = TS.el("div", "ts-row"); c.appendChild(row);
        var speak = TS.el("button", "ts-btn", "▶️ Bolo (Speak)"); speak.type = "button"; row.appendChild(speak);
        var stop = TS.el("button", "ts-btn sec", "⏹️ Roko (Stop)"); stop.type = "button"; row.appendChild(stop);
        var st = TS.el("div"); c.appendChild(st);
        function fillVoices() {
          if (!("speechSynthesis" in window)) { vsel.innerHTML = ""; var o = document.createElement("option"); o.textContent = "Is browser me TTS nahi hai"; vsel.appendChild(o); speak.disabled = true; return; }
          var vs = speechSynthesis.getVoices();
          vsel.innerHTML = "";
          if (!vs.length) { var o2 = document.createElement("option"); o2.textContent = "Awaazein load ho rahi hain…"; vsel.appendChild(o2); return; }
          vs.forEach(function (v, i) {
            var o = document.createElement("option"); o.value = String(i);
            o.textContent = v.name + " (" + v.lang + ")" + (/hi/i.test(v.lang) ? " ⭐ Hindi" : "");
            vsel.appendChild(o);
          });
          // prefer Hindi voice
          var hi = vs.findIndex(function (v) { return /^hi/i.test(v.lang); });
          if (hi >= 0) vsel.value = String(hi);
        }
        if ("speechSynthesis" in window) { fillVoices(); speechSynthesis.onvoiceschanged = fillVoices; }
        else TS.status(st, "⚠️ Is browser me speechSynthesis nahi hai — Chrome me kholo.", "err");
        speak.onclick = function () {
          if (!("speechSynthesis" in window)) return;
          var txt = ta.value.trim(); if (!txt) { TS.notify("⚠️ Pehle text likho"); return; }
          speechSynthesis.cancel();
          var u = new SpeechSynthesisUtterance(txt);
          var vs = speechSynthesis.getVoices();
          var v = vs[+vsel.value]; if (v) { u.voice = v; u.lang = v.lang; }
          u.rate = +rate.value; u.pitch = +pitch.value;
          u.onend = function () { TS.status(st, "✅ Bolna khatm.", "ok"); };
          u.onerror = function (e) { TS.status(st, "⚠️ Awaaz fail: " + (e.error || "error") + " — kuch devices par screen off hone par TTS rukta hai.", "err"); };
          speechSynthesis.speak(u);
          TS.status(st, "🔊 Bol raha hai… lamba text ho to beech me ruk sakta hai (browser limit).", "ok");
        };
        stop.onclick = function () { if ("speechSynthesis" in window) speechSynthesis.cancel(); };
        host.appendChild(wrap);
      },
      onHide: function () { try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) {} }
    });
  });
})();

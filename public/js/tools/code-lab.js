/* AI Everything — Code Lab (sandboxed iframe runner + JS console) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  ready(function (TS) {
    TS.reg("code-lab", {
      title: "Code Lab", icon: "💻",
      render: function (host, params) {
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "💻 Code Lab"));
        wrap.appendChild(TS.el("p", "ts-sub", "HTML/CSS/JS likho aur turant chalao — sandbox iframe me (tumhari app ko koi nuksan nahi). JS Console mode me sirf JavaScript chalega aur output dikhega."));
        var mode = TS.el("div", "ts-row"); wrap.appendChild(mode);
        var mWeb = TS.el("button", "ts-btn", "🌐 Web (HTML/CSS/JS)"); mWeb.type = "button"; mode.appendChild(mWeb);
        var mJs = TS.el("button", "ts-btn sec", "⌨️ JS Console"); mJs.type = "button"; mode.appendChild(mJs);
        var samples = TS.el("div", "ts-row"); wrap.appendChild(samples);
        samples.appendChild(TS.el("span", "ts-note", "Samples: "));
        [["Green Button", "web"], ["Table 7", "js"], ["Star Pattern", "js"]].forEach(function (sm) {
          var b = TS.el("button", "ts-btn sec sm", sm[0]); b.type = "button"; samples.appendChild(b);
          b.onclick = function () { loadSample(sm[0]); };
        });
        var code = TS.el("textarea", "ts-ta");
        code.style.cssText = "min-height:220px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.85rem;";
        code.value = (params && params.code) ? String(params.code) : "<!DOCTYPE html>\n<html><body style=\"font-family:sans-serif;text-align:center;padding:30px\">\n<h1 style=\"color:#b8912a\">Namaste! 🙏</h1>\n<p>Ye mera pehla web page hai.</p>\n<button onclick=\"alert('Button chala!')\">Click karo</button>\n</body></html>";
        wrap.appendChild(code);
        var isJs = false;
        var run = TS.el("button", "ts-btn", "▶️ Run karo"); run.type = "button"; wrap.appendChild(run);
        var outLab = TS.el("div", "ts-lab", "🖥️ Output:"); wrap.appendChild(outLab);
        var frame = document.createElement("iframe");
        frame.setAttribute("sandbox", "allow-scripts");
        frame.style.cssText = "width:100%;height:340px;border:1.5px solid #d9c88a;border-radius:12px;background:#fff;";
        wrap.appendChild(frame);
        var con = TS.el("div", "ts-out"); con.textContent = "Console output yahan dikhega…"; wrap.appendChild(con);
        var logs = [];
        function pushLog(kind, args) {
          logs.push((kind === "error" ? "❌ " : kind === "warn" ? "⚠️ " : "› ") + args.map(function (a) {
            try { return typeof a === "object" ? JSON.stringify(a) : String(a); } catch (e) { return String(a); }
          }).join(" "));
          con.textContent = logs.slice(-200).join("\n");
          con.scrollTop = con.scrollHeight;
        }
        window.addEventListener("message", function (ev) {
          if (!ev.data || ev.data.__codelab !== 1) return;
          pushLog(ev.data.kind, ev.data.args || []);
        });
        var HOOK = "<script>(function(){var send=function(k,args){try{parent.postMessage({__codelab:1,kind:k,args:args.map(function(a){try{return typeof a==='object'?JSON.parse(JSON.stringify(a)):String(a);}catch(e){return String(a);}})},'*');}catch(e){}};" +
          "['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){send(k,[].slice.call(arguments));o&&o.apply(console,arguments);};});" +
          "window.addEventListener('error',function(e){send('error',[e.message]);});})();<\/script>";
        function loadSample(name) {
          if (name === "Green Button") { isJs = false; setMode(); code.value = "<!DOCTYPE html>\n<html><body style=\"text-align:center;padding:40px;font-family:sans-serif\">\n<button id=\"b\" style=\"background:green;color:#fff;padding:16px 28px;font-size:18px;border:none;border-radius:10px\">Green Button</button>\n<p id=\"m\"></p>\n<script>document.getElementById('b').onclick=function(){document.getElementById('m').textContent='Button daba! 🎉';console.log('click hua');};<\/script>\n</body></html>"; }
          if (name === "Table 7") { isJs = true; setMode(); code.value = "// 7 ka pahada (table)\nfor (let i = 1; i <= 10; i++) {\n  console.log('7 x ' + i + ' = ' + (7 * i));\n}"; }
          if (name === "Star Pattern") { isJs = true; setMode(); code.value = "// Star pattern\nfor (let i = 1; i <= 5; i++) {\n  console.log('*'.repeat(i));\n}"; }
          runIt();
        }
        function setMode() {
          mWeb.className = "ts-btn" + (isJs ? " sec" : "");
          mJs.className = "ts-btn" + (isJs ? "" : " sec");
          frame.style.display = isJs ? "none" : "";
          outLab.textContent = isJs ? "🖥️ Console output:" : "🖥️ Output (console bhi neeche):";
        }
        mWeb.onclick = function () { isJs = false; setMode(); };
        mJs.onclick = function () { isJs = true; setMode(); };
        function runIt() {
          logs = []; con.textContent = "";
          var src = code.value;
          if (isJs) {
            var jsHtml = "<!DOCTYPE html><html><body>" + HOOK + "<script>try{\n" + src + "\n}catch(e){console.error(e.message);}<\/script></body></html>";
            frame.style.display = "none";
            // run in hidden sandboxed iframe so console hook captures output
            frame.srcdoc = jsHtml;
          } else {
            frame.style.display = "";
            var injected = src;
            if (/<head[^>]*>/i.test(injected)) injected = injected.replace(/<head[^>]*>/i, function (m) { return m + HOOK; });
            else if (/<html[^>]*>/i.test(injected)) injected = injected.replace(/<html[^>]*>/i, function (m) { return m + "<head>" + HOOK + "</head>"; });
            else injected = HOOK + injected;
            frame.srcdoc = injected;
          }
        }
        run.onclick = runIt;
        setMode();
        host.appendChild(wrap);
      }
    });
  });
})();

/* AI Everything — Data Analysis (CSV/JSON → table + stats + bar chart) */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  ready(function (TS) {
    TS.reg("data-analysis", {
      title: "Data Analysis", icon: "📊",
      render: function (host) {
        var wrap = TS.el("div", "ts-wrap");
        wrap.appendChild(TS.el("h2", "ts-h", "📊 Data Analysis"));
        wrap.appendChild(TS.el("p", "ts-sub", "CSV ya JSON file upload karo — sortable table, har numeric column ke stats (count, sum, average, min, max) aur bar chart milega. Sab isi phone me hota hai."));
        var c = TS.el("div", "ts-card"); wrap.appendChild(c);
        var lab = TS.el("label", "ts-file", "📁 .csv ya .json file chuno");
        var inp = document.createElement("input"); inp.type = "file"; inp.accept = ".csv,.json,text/csv,application/json"; inp.hidden = true; lab.appendChild(inp);
        c.appendChild(lab);
        c.appendChild(TS.el("label", "ts-lab", "…ya data yahan paste karo (CSV):"));
        var ta = TS.el("textarea", "ts-ta"); ta.style.minHeight = "90px";
        ta.value = "Naam,Ank,Rank\nAarav,92,1\nMeera,88,2\nKabir,75,3\nAnaya,95,0\nVihaan,60,4";
        c.appendChild(ta);
        var go = TS.el("button", "ts-btn", "📊 Analyse karo"); go.type = "button"; c.appendChild(go);
        var out = TS.el("div"); wrap.appendChild(out);
        function parseCSV(text) {
          var rows = [], row = [], cur = "", inQ = false;
          for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += ch; }
            else if (ch === '"') inQ = true;
            else if (ch === ",") { row.push(cur); cur = ""; }
            else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
            else cur += ch;
          }
          row.push(cur); if (row.length > 1 || row[0] !== "") rows.push(row);
          if (!rows.length) return null;
          var heads = rows[0].map(function (h, i) { return h.trim() || "Col" + (i + 1); });
          return { heads: heads, rows: rows.slice(1).filter(function (r) { return r.join("").trim() !== ""; }) };
        }
        function parseData(text, isJson) {
          if (isJson || /^\s*[\[{]/.test(text)) {
            try {
              var j = JSON.parse(text);
              if (!Array.isArray(j)) j = [j];
              if (!j.length) return null;
              var heads = Object.keys(j[0]);
              return { heads: heads, rows: j.map(function (o) { return heads.map(function (h) { return o[h] == null ? "" : String(o[h]); }); }) };
            } catch (e) { return null; }
          }
          return parseCSV(text);
        }
        function num(v) { var n = parseFloat(String(v).replace(/,/g, "")); return isNaN(n) ? null : n; }
        inp.onchange = function () {
          var f = inp.files[0]; if (!f) return;
          lab.childNodes[0].textContent = "✅ " + f.name + " ";
          var r = new FileReader();
          r.onload = function () { ta.value = String(r.result).slice(0, 200000); analyse(/\.(json)$/i.test(f.name)); };
          r.readAsText(f);
        };
        function analyse(forceJson) {
          out.innerHTML = "";
          var d = parseData(ta.value, !!forceJson || /\.json$/i.test((inp.files[0] || {}).name || ""));
          if (!d) { out.appendChild(TS.el("div", "ts-st err", "⚠️ Data parse nahi hua. CSV ka pehla row headers hona chahiye, ya sahi JSON array do.")); return; }
          out.appendChild(TS.el("div", "ts-st ok", "✅ " + d.rows.length + " rows × " + d.heads.length + " columns mile."));
          // sortable table
          var tw = TS.el("div", "ts-tblwrap"); out.appendChild(tw);
          var tbl = TS.el("table", "ts-tbl"); tw.appendChild(tbl);
          var sortIdx = -1, sortAsc = true;
          function drawTable() {
            var rows = d.rows.slice();
            if (sortIdx >= 0) rows.sort(function (a, b) {
              var x = a[sortIdx], y = b[sortIdx], nx = num(x), ny = num(y);
              var cmp = (nx !== null && ny !== null) ? nx - ny : String(x).localeCompare(String(y));
              return sortAsc ? cmp : -cmp;
            });
            var h = "<thead><tr>" + d.heads.map(function (hd, i) { return "<th data-i='" + i + "' style='cursor:pointer'>" + TS.esc(hd) + (i === sortIdx ? (sortAsc ? " ▲" : " ▼") : " ↕") + "</th>"; }).join("") + "</tr></thead><tbody>" +
              rows.slice(0, 200).map(function (r) { return "<tr>" + r.map(function (cell) { return "<td>" + TS.esc(cell) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody>";
            tbl.innerHTML = h;
            tbl.querySelectorAll("th").forEach(function (th) {
              th.onclick = function () { var i = +th.getAttribute("data-i"); if (sortIdx === i) sortAsc = !sortAsc; else { sortIdx = i; sortAsc = true; } drawTable(); };
            });
          }
          drawTable();
          if (d.rows.length > 200) out.appendChild(TS.el("p", "ts-note", "ℹ️ Table me pehli 200 rows hi dikh rahi hain (speed ke liye) — stats saari rows par hain."));
          // stats
          var sc = TS.el("div", "ts-card"); out.appendChild(sc);
          sc.appendChild(TS.el("h2", "ts-h", "🔢 Column Stats"));
          var numericCols = [];
          d.heads.forEach(function (hd, ci) {
            var vals = d.rows.map(function (r) { return num(r[ci]); }).filter(function (v) { return v !== null; });
            if (!vals.length) { sc.appendChild(TS.el("div", "ts-kv", "<span>" + TS.esc(hd) + "</span><span>text column (stats nahi)</span>")); return; }
            var sum = vals.reduce(function (a, b) { return a + b; }, 0);
            numericCols.push({ name: hd, ci: ci, vals: vals });
            var row = TS.el("div");
            row.innerHTML = "<div class='ts-kv'><span><b>" + TS.esc(hd) + "</b> — count</span><span>" + vals.length + "</span></div>" +
              "<div class='ts-kv'><span>Sum (योग)</span><span>" + (Math.round(sum * 100) / 100) + "</span></div>" +
              "<div class='ts-kv'><span>Average (औसत)</span><span>" + (Math.round((sum / vals.length) * 100) / 100) + "</span></div>" +
              "<div class='ts-kv'><span>Min (न्यूनतम)</span><span>" + Math.min.apply(null, vals) + "</span></div>" +
              "<div class='ts-kv'><span>Max (अधिकतम)</span><span>" + Math.max.apply(null, vals) + "</span></div>";
            sc.appendChild(row);
          });
          // chart
          if (numericCols.length) {
            var cc = TS.el("div", "ts-card"); out.appendChild(cc);
            cc.appendChild(TS.el("h2", "ts-h", "📊 Bar Chart"));
            cc.appendChild(TS.el("label", "ts-lab", "Numeric column chuno:"));
            var csel = TS.el("select", "ts-sel"); cc.appendChild(csel);
            numericCols.forEach(function (nc, i) { var o = document.createElement("option"); o.value = String(i); o.textContent = nc.name; csel.appendChild(o); });
            var labelCol = d.heads.findIndex(function (h, i) { return numericCols.every(function (nc) { return nc.ci !== i; }); });
            var cv = TS.el("canvas", "ts-cv"); cv.width = 720; cv.height = 380; cc.appendChild(cv);
            var dl = TS.el("button", "ts-btn sec", "⬇️ Chart PNG download"); dl.type = "button"; cc.appendChild(dl);
            dl.onclick = function () { cv.toBlob(function (b) { if (b) { TS.downloadBlob(TS.safeName("chart", ".png"), b); TS.saveToLibrary("chart.png", b); } }); };
            function drawChart() {
              var nc = numericCols[+csel.value || 0];
              var ctx = cv.getContext("2d");
              ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cv.width, cv.height);
              var data = d.rows.slice(0, 20).map(function (r, i) { return { label: labelCol >= 0 ? String(r[labelCol]).slice(0, 10) : "Row " + (i + 1), v: num(r[nc.ci]) || 0 }; });
              var max = Math.max.apply(null, data.map(function (x) { return x.v; }).concat([1]));
              var bw = (cv.width - 60) / Math.max(1, data.length);
              ctx.strokeStyle = "#999"; ctx.beginPath(); ctx.moveTo(40, 10); ctx.lineTo(40, cv.height - 50); ctx.lineTo(cv.width - 10, cv.height - 50); ctx.stroke();
              data.forEach(function (x, i) {
                var bh = (x.v / max) * (cv.height - 80);
                var grad = ctx.createLinearGradient(0, cv.height - 50 - bh, 0, cv.height - 50);
                grad.addColorStop(0, "#e8b93c"); grad.addColorStop(1, "#b8912a");
                ctx.fillStyle = grad;
                ctx.fillRect(45 + i * bw, cv.height - 50 - bh, bw - 8, bh);
                ctx.fillStyle = "#222"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
                ctx.fillText(String(x.v), 45 + i * bw + (bw - 8) / 2, cv.height - 56 - bh);
                ctx.save();
                ctx.translate(45 + i * bw + (bw - 8) / 2, cv.height - 38);
                ctx.rotate(-0.0); ctx.fillText(x.label, 0, 10); ctx.restore();
              });
              ctx.fillStyle = "#666"; ctx.font = "13px sans-serif"; ctx.textAlign = "left";
              ctx.fillText(nc.name + " (pehli " + data.length + " rows)", 45, 22);
            }
            csel.onchange = drawChart;
            drawChart();
          } else {
            out.appendChild(TS.el("div", "ts-st", "ℹ️ Koi numeric column nahi mila — chart/stats ke liye numbers wala column chahiye."));
          }
        }
        go.onclick = function () { analyse(false); };
        host.appendChild(wrap);
      }
    });
  });
})();

// server-smoke.mjs — QUICK self-test for AI Everything Workspace server.
// Boots the app on a random port and asserts:
//   1. GET /api/health -> 200
//   2. POST /api/chat without key -> 402 NO_KEY in < 2s (no hang)
//   3. GET /api/news -> JSON with items array
//   4. GET /api/image?prompt=test -> image bytes (or honest failure line if offline)
//   5. POST /api/dl/info -> 501 YTDLP_MISSING when yt-dlp is absent
//   6. POST /api/pdf/merge -> merges two generated PDFs into 2 pages
// Run: node tests/server-smoke.mjs   (or: npm run smoke)
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../server.js");
const { PDFDocument } = require("pdf-lib");

let passed = 0;
let failed = 0;
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log("PASS  " + name + (extra ? "  (" + extra + ")" : "")); }
  else { failed++; console.log("FAIL  " + name + (extra ? "  (" + extra + ")" : "")); }
}

const server = app.listen(0);
await new Promise((r) => server.on("listening", r));
const base = "http://127.0.0.1:" + server.address().port;
console.log("Smoke test server: " + base + "\n");

try {
  // 1. health
  {
    const r = await fetch(base + "/api/health");
    const j = await r.json();
    check("GET /api/health -> 200 ok:true", r.status === 200 && j.ok === true, "features.ytdlp=" + j.features.ytdlp);
    var ytdlpPresent = !!j.features.ytdlp;
  }

  // 2. chat without key -> 402 NO_KEY fast
  {
    const t0 = Date.now();
    const r = await fetch(base + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "namaste" }] }] }),
    });
    const ms = Date.now() - t0;
    const j = await r.json().catch(() => ({}));
    check("POST /api/chat without key -> 402 NO_KEY in <2s", r.status === 402 && j.error === "NO_KEY" && ms < 2000, "status=" + r.status + ", " + ms + "ms");
  }

  // 3. news -> items array
  {
    const r = await fetch(base + "/api/news?cat=india&lang=hi");
    const j = await r.json().catch(() => ({}));
    check("GET /api/news -> items array", r.status === 200 && Array.isArray(j.items) && j.items.length > 0,
      "status=" + r.status + ", items=" + (Array.isArray(j.items) ? j.items.length : "n/a") + (j.items && j.items[0] ? ", first=" + JSON.stringify(j.items[0]).slice(0, 120) : ""));
  }

  // 4. image -> bytes (honest failure accepted when the sandbox is offline)
  {
    try {
      const r = await fetch(base + "/api/image?prompt=test");
      const ct = r.headers.get("content-type") || "";
      const buf = Buffer.from(await r.arrayBuffer());
      check("GET /api/image?prompt=test -> image bytes", r.status === 200 && ct.startsWith("image/") && buf.length > 5000,
        "status=" + r.status + ", content-type=" + ct + ", bytes=" + buf.length);
    } catch (e) {
      check("GET /api/image?prompt=test -> image bytes", false, "network error (offline?): " + String(e.message || e).slice(0, 100));
    }
  }

  // 5. dl/info -> 501 when yt-dlp absent
  {
    const r = await fetch(base + "/api/dl/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://youtu.be/dQw4w9WgXcQ" }),
    });
    const j = await r.json().catch(() => ({}));
    if (!ytdlpPresent) {
      check("POST /api/dl/info without yt-dlp -> 501 YTDLP_MISSING", r.status === 501 && j.error === "YTDLP_MISSING", "status=" + r.status);
    } else {
      check("POST /api/dl/info with yt-dlp present -> not 501", r.status !== 501, "status=" + r.status);
    }
  }

  // 6. pdf merge -> 2 pages
  {
    async function onePagePdf() {
      const d = await PDFDocument.create();
      d.addPage([300, 300]);
      return Buffer.from(await d.save()).toString("base64");
    }
    const p1 = await onePagePdf();
    const p2 = await onePagePdf();
    const r = await fetch(base + "/api/pdf/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfs: [p1, p2] }),
    });
    const j = await r.json().catch(() => ({}));
    check("POST /api/pdf/merge -> merged 2-page PDF", r.status === 200 && j.ok === true && j.pages === 2 && typeof j.pdf === "string" && j.pdf.length > 100,
      "status=" + r.status + ", pages=" + j.pages);
  }
} finally {
  server.close();
}

console.log("\nResult: " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

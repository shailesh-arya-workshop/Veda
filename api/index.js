use strict";

// Vercel serverless adapter — BEST EFFORT only.
// Tested path is Render: `npm start` (server.js listens directly, see render.yaml / Dockerfile).
// On Vercel, vercel.json rewrites /api/* to this function and static files come from public/.
// Limits on serverless: long SSE streams and the yt-dlp binary are not available there —
// /api/dl/* will honestly return 501 YTDLP_MISSING in that environment.
module.exports = require("../server.js");

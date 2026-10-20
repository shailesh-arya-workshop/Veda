# AI Everything Workspace — By Shailesh Arya

Ek hi app me sab AI tools: चैट, PDF लैब, इमेज बनाना, कोड चलाना, न्यूज़,
डाउनलोडर, OCR और स्टडी जनरेटर — फोन-फर्स्ट डिज़ाइन, डार्क-गोल्ड थीम।

## ये ऐप क्या है

- **BYOK (अपनी key खुद)**: Server पर कोई API key नहीं रहती। तुम Settings में
  अपनी Gemini / Llama / Custom (OpenAI-compatible) key डालते हो — key सिर्फ
  तुम्हारे फोन के ब्राउज़र में रहती है और हर request के साथ `x-ai-keys`
  header से server तक जाती है। Repo में कोई असली key कभी नहीं है।
- **Server (Express)**: `/api/health`, `/api/chat` (SSE streaming),
  `/api/models`, `/api/news` (RSS), `/api/image` (Pollinations proxy),
  `/api/dl/*` (yt-dlp), `/api/pdf/merge`।
- **Frontend**: बिना framework के vanilla JS — एक shell (`public/index.html`)
  + 26 views (8 मुख्य + 18 tools)।

## Features

- 💬 **AI Chat** — Gemini (multi-key failover + 429 पर अगला model अपने आप),
  Meta Llama, या कोई भी OpenAI-compatible API। Streaming जवाब, attach
  (image/PDF/ZIP), mic, TTS।
- 📕 **PDF Studio** — Create (VPDF markup → themed PDF), Edit, Merge, Split,
  Compress, Watermark, Rotate, N-up — सब फोन पर ही, offline।
- 🪄 **Generators** — Question Paper, Question Bank, Study Material,
  Study Guide, Notes Maker, Templates — AI key हो तो AI से content,
  न हो तो honest manual mode; दोनों का अंत असली themed PDF में।
- 📝 **PDF ↔ Word** — PDF से text-आधारित .docx, Word (.docx) से themed PDF।
- 🖼️ **Image Studio + Image to PDF**, 🔤 **OCR** (Tesseract.js, हिंदी+English),
  💻 **Code Lab** (sandboxed HTML/JS runner), 📊 **Data Analysis**,
  🎤 **Voice** (speech recognition + TTS), 🎬 **Video** (slideshow maker),
  ⬇️ **Downloader** (direct files + yt-dlp), 📰 **Live News** (RSS),
  📚 **Library / Memory / History** (localStorage)।

## ईमानदार सीमाएं (Honest Limitations)

- **PDF → Word** text-based है: PDF से सिर्फ़ text निकलता है — original
  design/tables की formatting .docx में simplified हो जाती है।
- **YouTube/Instagram डाउनलोड** के लिए server पर **yt-dlp चाहिए** — वो सिर्फ़
  **Docker deploy** (साथ में दिया `Dockerfile`) में मिलता है। Render के plain
  Node deploy पर `/api/dl/*` ईमानदारी से `501 YTDLP_MISSING` देता है — कोई
  fake download button नहीं दिखता।
- **AI Video असली AI video नहीं है** — ये एक **slideshow maker** है: तुम्हारी
  images + caption से `.webm` slideshow बनता है। (Settings में अपनी video-API
  URL/key डालो तो external API call का slot तैयार है।)
- **Vercel deploy best-effort है** — असली tested रास्ता **Render** है
  (`npm start`, `render.yaml` / `Dockerfile`)। Vercel serverless पर लंबे SSE
  stream और yt-dlp उपलब्ध नहीं होते।
- **PDF edit / watermark में text सिर्फ़ Latin/English** — pdf-lib के standard
  font में Devanagari glyph नहीं होते; Hindi text वहाँ error के साथ रुकता है,
  झूठा success नहीं दिखाता। (PDF *बनाना* VPDF से पूरी Hindi-safe है।)
- **Compress = re-save** — PDF को दोबारा save करके फालतू data हटाता है;
  आमतौर पर 5–20% तक छोटा होता है, guarantee नहीं।
- **OCR / Word→PDF / PDF→Word** पहली बार CDN से library लोड करते हैं —
  पहली बार internet चाहिए।
- Repo में **कोई असली API key कभी नहीं** — keys सिर्फ़ तुम्हारे फोन की
  Settings में रहती हैं।

## Logo बदलना हो तो

अपनी app image/logo यहां रखो: **`public/logo.svg`** — इसी file को replace
करना है; topbar और favicon दोनों इसी से आते हैं।

## Deploy

- **Render (tested)**: `render.yaml` blueprint या Docker service — विस्तार
  के लिए `TESTING.md` देखो।
- **Vercel (best-effort)**: `vercel.json` + `api/index.js` तैयार है, सीमाएं
  ऊपर लिखी हैं।

पूरी testing जानकारी: `TESTING.md` • QA की पूरी report: `docs/TEST_REPORT.md`

By Shailesh Arya 💛

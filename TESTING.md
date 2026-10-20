# TESTING — AI Everything Workspace (स्टेप-बाय-स्टेप)

## 1. Local चलाना (अपने PC/phone-Termux पर)

```bash
npm install     # पहली बार — dependencies आएंगी
npm start       # server चलेगा (default port 3000)
```

ब्राउज़र में खोलो: **http://localhost:3000**

खुद का smoke test भी तैयार है:

```bash
npm run smoke   # 6/6 pass आना चाहिए
```

## 2. Settings में Gemini key डालना

1. App खोलो → ⚙️ **Settings** (ऊपर दायां या sidebar)।
2. **Gemini Keys** वाले box में अपनी free key डालो
   (aistudio.google.com से मिलती है)। एक line में एक key — कई keys डालो तो
   एक fail/quota होने पर अगली अपने आप चलती है।
3. **💾 Keys सेव करें** दबाओ। (Key सिर्फ़ तुम्हारे browser में रहती है,
   server पर save नहीं होती।)
4. चाहो तो Llama key या Custom API (Base URL + Key + Model) भी डाल सकते हो,
   और ऊपर से default model चुन सकते हो।

## 3. हर feature try करने की checklist

- [ ] **Chat**: कोई सवाल पूछो — जवाब 3–5 सेकंड में आना शुरू होना चाहिए
      (streaming)। Mic 🎤, attach 📎 (image/PDF) भी try करो।
- [ ] **बिना key** chat भेजो → फौरन "Settings me apni API key daalo" (402)
      आना चाहिए, hang नहीं होना चाहिए।
- [ ] **PDF Studio → Create**: default content से "PDF banao" → असली PDF
      download होनी चाहिए।
- [ ] **PDF Studio → Merge/Split**: 2 PDF जोड़ो, फिर range से अलग करो।
- [ ] **Sidebar → PDF to Word / Word to PDF**: छोटी file से try करो
      (पहली बार internet चाहिए — CDN library)।
- [ ] **Generators → Question Paper**: form भरो — key हो तो "🤖 AI se
      content banao", न हो तो "✍️ Manual mode" → PDF।
- [ ] **Live News**: headlines लोड होनी चाहिए (internet चाहिए)।
- [ ] **Image Studio**: prompt लिखकर image बनाओ (internet चाहिए)।
- [ ] **Code Lab**: "▶️ Run karo" — sample HTML चलना चाहिए।
- [ ] **OCR**: साफ़ photo चुनकर text निकालो (पहली बार ~10MB language
      data download होगा)।
- [ ] **Downloader**: direct file link (जैसे कोई .mp4 URL) download होना
      चाहिए। YouTube link पर — अगर server Docker पर नहीं है तो honest
      "yt-dlp नहीं है" message आएगा; ये सही behavior है, bug नहीं।
- [ ] **Voice**: 🎤 बोलकर देखो (Chrome सबसे अच्छा), TTS से text सुनो।
- [ ] **Video**: 2–3 images चुनकर slideshow (.webm) बनाओ।

## 4. Render पर deploy (tested रास्ता)

**तरीका A — Node (Downloader के बिना बाकी सब चलेगा):**
1. GitHub पर ये project upload करो।
2. Render → New → Blueprint → repo चुनो — `render.yaml` अपने आप पढ़ा
   जाएगा (build: `npm install`, start: `npm start`)।
3. Deploy पूरा होने पर मिली URL खोलो → ऊपर वाली checklist दोहराओ।

**तरीका B — Docker (Downloader समेत सब कुछ):**
1. Render → New → Web Service → repo चुनो → Environment: **Docker**
   (`Dockerfile` अपने आप इस्तेमाल होगा — उसमें yt-dlp + ffmpeg है)।
2. Deploy → URL पर Downloader भी काम करेगा।

ध्यान: Render free tier सोता है — पहली request पर ~30–50 सेकंड लग सकते
हैं, उसके बाद तेज़।

## 5. Vercel नोट (best-effort)

- `vercel.json` + `api/index.js` तैयार हैं; static files `public/` से और
  API serverless function से चलेंगे।
- **सीमाएं**: serverless पर yt-dlp नहीं होता (Downloader 501 देगा) और
  लंबे SSE chat streams कट सकते हैं। पक्का अनुभव चाहिए तो **Render**
  इस्तेमाल करो — वही tested रास्ता है।

## 6. दिक्कत आए तो

- **Chat पर 402**: Settings में key नहीं डाली / गलत है।
- **Chat धीमा**: free quota या Render cold-start हो सकता है; दूसरा model
  या दूसरी key try करो (app अपने आप 3 models तक try करता है)।
- **PDF नहीं बनी**: अगर "vpdf.js load nahi hua" आए तो internet on करके
  दोबारा खोलो (पहली बार library CDN से आती है)।
- **Downloader 501**: server Docker पर नहीं है — तरीका B अपनाओ।

By Shailesh Arya 💛

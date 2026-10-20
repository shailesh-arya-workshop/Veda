# public/vendor — vendored client libraries

Copied verbatim from the proven Veda AI public folder (do not edit the originals):

| File | Library | Use |
| --- | --- | --- |
| `pdf.min.js` | PDF.js (Mozilla) | PDF rendering / page images in the browser |
| `pdf.worker.min.js` | PDF.js worker | Must sit next to `pdf.min.js`; set `pdfjsLib.GlobalWorkerOptions.workerSrc` to it |
| `pdf-lib.min.js` | pdf-lib (UMD) | Client-side PDF create/merge/split (`window.PDFLib`) |
| `vpdf.js` | Veda AI VPDF design system | Tiny markup → themed print-ready HTML for the client PDF pipeline (no DOM, pure strings) |

## Not vendored — load from CDN when a tool needs them

- **tesseract.js** (browser OCR): `https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js`
  (worker/core files are fetched by the library itself from the same CDN by default.)
- **docx** (Word .docx generation, browser UMD build): `https://cdn.jsdelivr.net/npm/docx@9/dist/index.umd.cjs`
  (verified against the installed package layout; exposes `window.docx`). Also installed as a server dependency.
- **mammoth** (Word .docx → HTML/text in the browser): `https://cdn.jsdelivr.net/npm/mammoth@1/mammoth.browser.min.js`
  (exposes `window.mammoth`). Also installed as a server dependency.

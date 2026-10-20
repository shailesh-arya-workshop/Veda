/* =====================================================================
 * AI Everything Workspace — app.js (UI SHELL, subagent B)
 * Plain JS, no frameworks, no build step.
 *
 * ================= APP CONTRACT (for tools subagent) =================
 * window.App = {
 *   registerView(id, {title, icon, render(el), onShow(el,params), onHide()}),
 *   show(id, params),                 // show a view; unknown id -> honest toast
 *   notify(title, body),              // bell badge + panel + localStorage log
 *   toast(msg),
 *   dialog({title, html, buttons:[{label, primary, onClick}]}) -> close fn,
 *   openChat(text, opts),             // opens Chat w/ slide-in, emits hook below
 *   openPdfTool(action),              // show('pdf-studio',{action}) w/ fallback toast
 *   setCurrentPdf(uint8bytes, name),  // renders preview via pdf.js (vendor/)
 *   getCurrentPdf() -> {bytes, name} | null,
 *   library: {
 *     save(type, item) -> Promise<id>,   // type: 'chat' | 'pdf' | 'image'
 *     getAll(type) -> Promise<items[]>,  // newest first
 *     get(type, id) -> Promise<item|null>,
 *     remove(type, id) -> Promise<void>,
 *     pin(type, id, pinned), archive(type, id, archived),
 *   },
 *   memory: {
 *     getSystemAddition() -> string,  // injected into chat system prompt
 *     getInstructions()/setInstructions(t), getFacts()/addFact(t)/removeFact(i),
 *   },
 *   events: { on(evt,fn), off(evt,fn), emit(evt,data) },
 *   t(key),                            // i18n (hi default, en toggle)
 *   getKeysHeader() -> JSON string for `x-ai-keys` header,
 *   state, views,
 * }
 * ------------- HOOK / EVENT NAMES (tools agent: listen via App.events) -------------
 *   'hero:quickAction'   {action:'voice'|'pdf'|'image'|'code'|'news'|'upload'}
 *   'hero:suggestion'    {flow:'pdf-preset'|'image-to-pdf'|'notes'|'news'|'code-sample', prompt, topic}
 *   'chat:send'          {text, model, attachments:[{name,type,dataUrl}]}
 *   'chat:openedWithText'{text, opts}
 *   'pdflab:open'        {action:'create'|'edit'|'merge'|'split'|'pdf-to-word'|
 *                                  'word-to-pdf'|'ocr'|'compress'|'watermark'|'templates'|
 *                                  'question-paper'|'notes'|'study'}
 *   'pdf:ready'          {id, name}            // tools agent emits when a PDF is saved
 *   'library:changed'    {type}               // re-render library/history views
 *   'notify'             {title, body}
 *   'lang:changed'       {lang}               // re-render tool views too
 *   'theme:changed'      {theme}
 * SSE chat endpoint: POST /api/chat, body {messages, model}, header x-ai-keys.
 * pdf.js vendor expected at public/vendor/pdf.min.js (+ worker). If missing,
 * setCurrentPdf falls back to an honest "preview unavailable" note.
 * ===================================================================== */
'use strict';
(function(){
/* ---------------- STRINGS (Hindi-first) ---------------- */
const STRINGS = {
  hi: {
    searchPlaceholder:'कुछ भी पूछें... PDF बनाना हो, जानकारी चाहिए, कोड लिखना हो...',
    liveNews:'लाइव न्यूज़', home:'होम', chat:'चैट', pdfStudio:'PDF स्टूडियो',
    imageStudio:'इमेज स्टूडियो', codeLab:'कोड लैब', aiTools:'AI टूल्स',
    library:'लाइब्रेरी', memory:'मेमोरी', settings:'सेटिंग्स', news:'लाइव न्यूज़',
    history:'हिस्ट्री', profile:'प्रोफाइल',
    heroTitle:'AI Everything Workspace',
    heroTag:'एक ही जगह पर सभी AI टूल्स — आपकी कल्पना, हमारी शक्ति',
    heroBy:'By Shailesh Arya Developer',
    quickVoice:'वॉइस इनपुट', quickPdf:'PDF बनाएं', quickImage:'इमेज बनाएं',
    quickCode:'कोड चलाएं', quickNews:'ताज़ा खबर', quickUpload:'फाइल अपलोड',
    askAnything:'कुछ भी पूछें...', features50:'50+ Powerful Features',
    comingSoon:'जल्द आ रहा है — tools module load हो रहा है',
    pdfPreview:'PDF Preview', quickPdfActions:'Quick PDF Actions',
    noPdfYet:'अभी कोई PDF नहीं — PDF Studio से बनाएं या खोलें',
    print:'प्रिंट', savePdf:'सेव', download:'डाउनलोड', share:'शेयर',
    notifications:'Notifications', clearAll:'सब साफ़ करें', noNotifs:'कोई notification नहीं',
    sbMain:'मुख्य', sbPdf:'PDF टूल्स', sbAi:'AI', sbMore:'अधिक',
    moreTools:'और टूल्स', proFeatures:'Pro Features', subscription:'सब्सक्रिप्शन',
    instruction:'निर्देश', voiceAssistant:'वॉइस असिस्टेंट', downloader:'डाउनलोडर',
    toolsListTitle:'सभी टूल्स', searchNoResults:'कोई नतीजा नहीं मिला',
    actCreate:'बनाएं', actEdit:'एडिट', actMerge:'मर्ज', actSplit:'स्प्लिट',
    actPdf2Word:'PDF→Word', actWord2Pdf:'Word→PDF', actOcr:'OCR', actCompress:'कंप्रेस', actWatermark:'वॉटरमार्क',
    shareNotSupported:'शेयर supported नहीं — डाउनलोड कर दिया गया',
    savedToLib:'लाइब्रेरी में सेव हो गया', printed:'प्रिंट डायलॉग खुल रहा है',
  },
  en: {
    searchPlaceholder:'Ask anything... make a PDF, get info, write code...',
    liveNews:'Live News', home:'Home', chat:'Chat', pdfStudio:'PDF Studio',
    imageStudio:'Image Studio', codeLab:'Code Lab', aiTools:'AI Tools',
    library:'Library', memory:'Memory', settings:'Settings', news:'Live News',
    history:'History', profile:'Profile',
    heroTitle:'AI Everything Workspace',
    heroTag:'All AI tools in one place — your imagination, our power',
    heroBy:'By Shailesh Arya Developer',
    quickVoice:'Voice Input', quickPdf:'Make PDF', quickImage:'Make Image',
    quickCode:'Run Code', quickNews:'Latest News', quickUpload:'Upload File',
    askAnything:'Ask anything...', features50:'50+ Powerful Features',
    comingSoon:'Coming soon — tools module is loading',
    pdfPreview:'PDF Preview', quickPdfActions:'Quick PDF Actions',
    noPdfYet:'No PDF yet — create or open one in PDF Studio',
    print:'Print', savePdf:'Save', download:'Download', share:'Share',
    notifications:'Notifications', clearAll:'Clear all', noNotifs:'No notifications',
    sbMain:'Main', sbPdf:'PDF Tools', sbAi:'AI', sbMore:'More',
    moreTools:'More Tools', proFeatures:'Pro Features', subscription:'Subscription',
    instruction:'Instructions', voiceAssistant:'Voice Assistant', downloader:'Downloader',
    toolsListTitle:'All Tools', searchNoResults:'No results found',
    actCreate:'Create', actEdit:'Edit', actMerge:'Merge', actSplit:'Split',
    actPdf2Word:'PDF→Word', actWord2Pdf:'Word→PDF', actOcr:'OCR', actCompress:'Compress', actWatermark:'Watermark',
    shareNotSupported:'Share not supported — downloaded instead',
    savedToLib:'Saved to library', printed:'Opening print dialog',
  }
};
/* ---------------- utils ---------------- */
const $ = (s, r)=> (r||document).querySelector(s);
const $$ = (s, r)=> Array.from((r||document).querySelectorAll(s));
window.$ = $; window.$$ = $$; // views (separate <script> files) use these helpers
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = ()=> 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const debounce = (fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};
const store = {
  get(k, d){ try{ const v = localStorage.getItem('aiew-'+k); return v==null?d:JSON.parse(v);}catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('aiew-'+k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem('aiew-'+k);}catch(e){} },
};
/* ---------------- state ---------------- */
const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = Object.assign({
  lang:'hi', theme:'dark', background:'golden',
  animations: !reducedMotion,
  model:'auto',
  profileName:'Shailesh Arya',
  apiKeys:{ gemini:[], llama:'', custom:{baseUrl:'', key:'', model:''} },
}, store.get('settings', {}));
if (reducedMotion && store.get('settings', {}).animations === undefined) state.animations = false;
function saveState(){ store.set('settings', state); }

/* ---------------- events ---------------- */
const _ev = {};
const events = {
  on(e,fn){ (_ev[e]=_ev[e]||[]).push(fn); },
  off(e,fn){ _ev[e]=(_ev[e]||[]).filter(f=>f!==fn); },
  emit(e,d){ (_ev[e]||[]).forEach(f=>{ try{ f(d); }catch(err){ console.error('event',e,err);} }); },
};

/* ---------------- toast + dialog ---------------- */
function toast(msg){
  const root = $('#toast-root'); const el = document.createElement('div');
  el.className='toast'; el.textContent = msg; root.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .4s'; setTimeout(()=>el.remove(), 420); }, 2600);
}
function dialog(opts){
  const root = $('#dialog-root'); root.innerHTML=''; root.classList.add('open');
  const d = document.createElement('div'); d.className='dialog';
  d.innerHTML = '<h3>'+esc(opts.title||'')+'</h3><div class="dlg-body"></div><div class="row" style="display:flex;gap:10px"></div>';
  const body = $('.dlg-body', d); if (typeof opts.html==='string') body.innerHTML = opts.html; else if (opts.html) body.appendChild(opts.html);
  const row = $('.row', d);
  const close = ()=>{ root.classList.remove('open'); root.innerHTML=''; document.removeEventListener('keydown', onKey); };
  const onKey = e=>{ if(e.key==='Escape') close(); }; document.addEventListener('keydown', onKey);
  (opts.buttons||[{label:'OK', primary:true}]).forEach(b=>{
    const btn=document.createElement('button'); btn.className='btn'+(b.primary?' primary':''); btn.textContent=b.label;
    btn.onclick=()=>{ if(b.onClick) b.onClick(body); if(b.keepOpen!==true) close(); };
    row.appendChild(btn);
  });
  root.onclick = e=>{ if(e.target===root) close(); };
  d.appendChild(row); root.appendChild(d); return close;
}

/* ---------------- notifications ---------------- */
function getNotifs(){ return store.get('notifs', []); }
function notify(title, body){
  const list = getNotifs();
  list.unshift({id:uid(), title, body, ts:Date.now(), read:false});
  store.set('notifs', list.slice(0,50));
  updateBell(); renderNotifPanel();
  events.emit('notify', {title, body});
}
function updateBell(){
  const unread = getNotifs().filter(n=>!n.read).length;
  const dot = $('#notif-dot'); dot.textContent = unread>99?'99+':unread;
  dot.classList.toggle('show', unread>0);
}
function renderNotifPanel(){
  const p = $('#notif-panel'); const list = getNotifs();
  p.innerHTML = '<div class="notif-head"><span>'+esc(App.t('notifications'))+'</span>'+
    '<button class="btn small ghost" id="notif-clear">'+esc(App.t('clearAll'))+'</button></div>'+
    (list.length? list.map(n=>'<div class="notif-item"><div class="t">'+esc(n.title)+'</div><div class="b">'+esc(n.body)+'</div><div class="ts">'+new Date(n.ts).toLocaleString()+'</div></div>').join('')
      : '<div class="notif-item hint">'+esc(App.t('noNotifs'))+'</div>');
  $('#notif-clear').onclick = ()=>{ store.set('notifs', []); updateBell(); renderNotifPanel(); };
}

/* ---------------- i18n ---------------- */
function t(key){ return (STRINGS[state.lang]&&STRINGS[state.lang][key]) || STRINGS.hi[key] || key; }
function applyI18n(){
  document.documentElement.lang = state.lang;
  $$('[data-i18n]').forEach(el=>{ el.textContent = t(el.getAttribute('data-i18n')); });
  $$('[data-i18n-input]').forEach(el=>{ el.placeholder = t(el.getAttribute('data-i18n-input')); });
  $('#lang-select').value = state.lang;
}

/* ---------------- backgrounds (4 real canvas animations) ---------------- */
const bg = { token:0, running:false };
function stopBg(){ bg.token++; bg.running=false; try{ const c=$('#bg-canvas'); const x=c.getContext('2d'); if(x) x.clearRect(0,0,c.width,c.height); }catch(e){} }
function sizeCanvas(c){ const d=Math.min(2,window.devicePixelRatio||1); c.width=innerWidth*d; c.height=innerHeight*d; c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; const x=c.getContext('2d'); if(!x) return null; x.setTransform(d,0,0,d,0,0); return x; }
function startBg(){
  stopBg(); const c=$('#bg-canvas'); const x=sizeCanvas(c); if(!x){ bg.running=true; return; } const my=++bg.token; bg.running=true;
  const reduced = !state.animations;
  const loop = fn => { const step=()=>{ if(my!==bg.token) return; fn(); if(!reduced) requestAnimationFrame(step); }; step(); };
  const W=()=>innerWidth, H=()=>innerHeight;
  if (state.background==='golden'){
    const P=Array.from({length:70},()=>({x:Math.random()*W(),y:Math.random()*H(),vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,r:1+Math.random()*2.4}));
    loop(()=>{ x.clearRect(0,0,W(),H());
      P.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; if(p.x<0)p.x=W(); if(p.x>W())p.x=0; if(p.y<0)p.y=H(); if(p.y>H())p.y=0;
        x.beginPath(); x.arc(p.x,p.y,p.r,0,7); x.fillStyle='rgba(212,175,55,.55)'; x.fill(); });
      x.strokeStyle='rgba(212,175,55,.10)'; x.lineWidth=1;
      for(let i=0;i<P.length;i++) for(let j=i+1;j<P.length;j++){ const dx=P[i].x-P[j].x, dy=P[i].y-P[j].y, d=dx*dx+dy*dy;
        if(d<130*130){ x.beginPath(); x.moveTo(P[i].x,P[i].y); x.lineTo(P[j].x,P[j].y); x.stroke(); } }
    });
  } else if (state.background==='matrix'){
    const chars='アイカキクケコサシスセソ0123456789$#*+<>/\\|'; const fs=16; const cols=Math.ceil(W()/fs);
    const drops=Array.from({length:cols},()=>Math.random()*-H()/fs);
    loop(()=>{ x.fillStyle='rgba(5,8,5,.08)'; x.fillRect(0,0,W(),H()); x.font=fs+'px monospace';
      for(let i=0;i<cols;i++){ const ch=chars[Math.floor(Math.random()*chars.length)];
        x.fillStyle='#d4af37'; x.fillText(ch, i*fs, drops[i]*fs);
        x.fillStyle='rgba(53,196,141,.7)'; x.fillText(ch, i*fs, (drops[i]-1)*fs);
        drops[i]++; if(drops[i]*fs>H() && Math.random()>.975) drops[i]=0; }
    });
  } else if (state.background==='ocean'){
    let tm=0; const waves=[{a:46,l:.006,s:.9,c:'rgba(40,90,160,.16)'},{a:34,l:.009,s:-.7,c:'rgba(60,140,200,.13)'},{a:24,l:.014,s:1.2,c:'rgba(212,175,55,.08)'}];
    loop(()=>{ x.clearRect(0,0,W(),H()); tm+=.02;
      waves.forEach(w=>{ x.beginPath(); x.moveTo(0,H());
        for(let px=0;px<=W();px+=6){ x.lineTo(px, H()*.62 + Math.sin(px*w.l + tm*w.s)*w.a); }
        x.lineTo(W(),H()); x.closePath(); x.fillStyle=w.c; x.fill(); });
      const g=x.createRadialGradient(W()*.85,H()*.16,10,W()*.85,H()*.16,190);
      g.addColorStop(0,'rgba(245,197,66,.30)'); g.addColorStop(1,'rgba(245,197,66,0)');
      x.fillStyle=g; x.fillRect(0,0,W(),H());
    });
  } else { /* minimal: static vignette, drawn once */
    const g=x.createRadialGradient(W()/2,H()*.35,60,W()/2,H()*.35,Math.max(W(),H())*.75);
    g.addColorStop(0,'rgba(212,175,55,.07)'); g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g; x.fillRect(0,0,W(),H());
  }
}
window.addEventListener('resize', debounce(()=>{ if(bg.running) startBg(); }, 250));
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) bg.token++; else if(bg.running) startBg(); });

/* ---------------- IndexedDB backing store for library ---------------- */
const dbp = new Promise((resolve,reject)=>{
  try{
    if (typeof indexedDB === 'undefined') throw new Error('indexedDB not available');
    const req = indexedDB.open('aiew-db', 1);
    req.onupgradeneeded = ()=>{ const db=req.result;
      ['chats','files'].forEach(s=>{ if(!db.objectStoreNames.contains(s)) db.createObjectStore(s,{keyPath:'id'}); }); };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  }catch(e){ reject(e); }
});
dbp.catch(()=>{}); // derived chains handle their own rejections; avoid unhandled-rejection noise
const dbTx = (storeName, mode, fn)=> dbp.then(db=> new Promise((res,rej)=>{
  const tx = db.transaction(storeName, mode); const st = tx.objectStore(storeName);
  let out; fn(st, v=>{ out=v; });
  tx.oncomplete = ()=>res(out); tx.onerror = ()=>rej(tx.error);
}));
const typeStore = type => type==='chat' ? 'chats' : 'files';
const library = {
  async save(type, item){
    item = Object.assign({}, item); item.id = item.id || uid();
    item.type = type; item.savedAt = item.savedAt || Date.now();
    try{ await dbTx(typeStore(type), 'readwrite', (st)=>{ st.put(item); }); }
    catch(e){ /* localStorage fallback (metadata only) */
      const all = store.get('lib-'+type, []); all.push(item); store.set('lib-'+type, all); }
    events.emit('library:changed', {type}); return item.id;
  },
  async getAll(type){
    let rows;
    try{ rows = await dbTx(typeStore(type), 'readonly', (st, done)=>{ const r=st.getAll(); r.onsuccess=()=>done(r.result); }); }
    catch(e){ rows = store.get('lib-'+type, []); }
    return (rows||[]).filter(r=> type==='chat' ? true : r.type===type)
      .sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));
  },
  async get(type, id){
    try{ return await dbTx(typeStore(type), 'readonly', (st, done)=>{ const r=st.get(id); r.onsuccess=()=>done(r.result); }) || null; }
    catch(e){ const all = store.get('lib-'+type, []); return all.find(x=>x.id===id)||null; }
  },
  async remove(type, id){
    try{ await dbTx(typeStore(type), 'readwrite', (st)=>{ st.delete(id); }); }
    catch(e){ store.set('lib-'+type, store.get('lib-'+type, []).filter(x=>x.id!==id)); }
    events.emit('library:changed', {type});
  },
  async pin(type, id, pinned){ const it = await library.get(type,id); if(it){ it.pinned=!!pinned; await library.save(type,it); } },
  async archive(type, id, archived){ const it = await library.get(type,id); if(it){ it.archived=!!archived; await library.save(type,it); } },
};

/* ---------------- memory ---------------- */
const memory = {
  _raw(){ return store.get('memory', {instructions:'', facts:[]}); },
  getInstructions(){ return memory._raw().instructions||''; },
  setInstructions(txt){ const m=memory._raw(); m.instructions=txt; store.set('memory', m); },
  getFacts(){ return memory._raw().facts||[]; },
  addFact(txt){ const m=memory._raw(); m.facts=m.facts||[]; m.facts.push(txt); store.set('memory', m); },
  removeFact(i){ const m=memory._raw(); (m.facts||[]).splice(i,1); store.set('memory', m); },
  getSystemAddition(){
    const m = memory._raw(); const parts=[];
    if (m.instructions && m.instructions.trim()) parts.push('User instructions: '+m.instructions.trim());
    if (m.facts && m.facts.length) parts.push('Remembered facts about the user: '+m.facts.join('; '));
    return parts.join('\n');
  },
};

/* ---------------- current PDF + right panel (pdf.js lazy) ---------------- */
let currentPdf = null; // {bytes:Uint8Array, name:string}
let pdfjsPromise = null;
function loadPdfJs(){
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve,reject)=>{
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const s = document.createElement('script'); s.src='vendor/pdf.min.js';
    s.onload = ()=>{ try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js'; }catch(e){}
      window.pdfjsLib ? resolve(window.pdfjsLib) : reject(new Error('pdf.js missing')); };
    s.onerror = ()=>reject(new Error('pdf.js vendor file not found'));
    document.head.appendChild(s);
  });
  pdfjsPromise.catch(()=>{}); return pdfjsPromise;
}
function pdfBlob(){ return new Blob([currentPdf.bytes], {type:'application/pdf'}); }
async function renderPdfPreview(){
  const box = $('#pdf-preview'); const nameEl = $('#pdf-name');
  if (!currentPdf){ box.innerHTML = '<div class="pdf-empty">'+esc(t('noPdfYet'))+'</div>'; nameEl.textContent=''; return; }
  nameEl.textContent = currentPdf.name||'document.pdf';
  try{
    const lib = await loadPdfJs();
    const pdf = await lib.getDocument({data: currentPdf.bytes.slice()}).promise;
    const page = await pdf.getPage(1);
    const vp = page.getViewport({scale:1});
    const scale = Math.min(1.6, (box.clientWidth||260)/vp.width);
    const view = page.getViewport({scale});
    const cv = document.createElement('canvas'); cv.width=view.width; cv.height=view.height;
    box.innerHTML=''; box.appendChild(cv);
    await page.render({canvasContext: cv.getContext('2d'), viewport: view}).promise;
  }catch(e){
    box.innerHTML = '<div class="pdf-empty">📄<br>'+esc(currentPdf.name||'PDF')+'<br><span class="hint">Preview unavailable (pdf.js vendor load nahi hua)</span></div>';
  }
}
function setCurrentPdf(bytes, name){ currentPdf = {bytes: bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), name: name||'document.pdf'}; renderPdfPreview(); }
function getCurrentPdf(){ return currentPdf; }

/* ---------------- views & router ---------------- */
const views = {}; let currentView = null, currentParams = null;
function registerView(id, def){ views[id] = def; }
function show(id, params){
  params = params||{};
  if (!views[id]){ toast(t('comingSoon')); return false; }
  if (currentView && views[currentView] && views[currentView].onHide){ try{ views[currentView].onHide(); }catch(e){} }
  currentView = id; currentParams = params;
  const root = $('#view-root'); root.innerHTML='';
  const wrap = document.createElement('div'); wrap.className='view'+(params.animate==='slide'?' slide-in':''); root.appendChild(wrap);
  try{ views[id].render(wrap, params); }catch(err){ console.error('view render', id, err); wrap.innerHTML='<div class="card" style="padding:20px">Error: '+esc(err.message)+'</div>'; }
  if (views[id].onShow){ try{ views[id].onShow(wrap, params); }catch(e){} }
  $$('#top-tabs .tab').forEach(tb=> tb.classList.toggle('active', tb.dataset.view===id || tb.dataset.view===(TABS.find(x=>x.view===id)||{}).id));
  $$('#sidebar .sb-item').forEach(si=> si.classList.toggle('active', si.dataset.sview===id));
  root.scrollTop = 0;
  $('#sidebar').classList.add('collapsed-check');
  if (innerWidth<=820) $('#sidebar').classList.add('collapsed');
  events.emit('view:shown', {id, params});
  return true;
}
function openChat(text, opts){
  show('chat', {animate:'slide'});
  events.emit('chat:openedWithText', {text: text||'', opts: opts||{}});
}
/* Actions that have their own dedicated registered view (not a pdf-studio tab). */
const PDF_TOOL_ROUTES = {
  'pdf-to-word':'pdf-to-word', 'word-to-pdf':'word-to-pdf',
  'question-paper':'question-paper', 'study':'study-material',
  'notes':'notes-maker', 'templates':'templates'
};
function openPdfTool(action, params){
  action = action || 'create';
  const target = PDF_TOOL_ROUTES[action];
  if (target) return show(target, params||{});
  if (!show('pdf-studio', Object.assign({action: action}, params||{}))) return false;
  events.emit('pdflab:open', {action: action}); return true;
}
function getKeysHeader(){
  const k = state.apiKeys||{};
  return JSON.stringify({ gemini: (k.gemini||[]).filter(Boolean), llama: k.llama||'',
    custom: { baseUrl:(k.custom||{}).baseUrl||'', key:(k.custom||{}).key||'', model:(k.custom||{}).model||'' },
    model: state.model||'auto', lang: state.lang });
}

/* ---------------- voice (Web Speech API) ----------------
   BUG B LESSON: mic button onclick MUST use an arrow-function wrapper,
   never pass the click event as the target element. */
let recognition = null;
function startVoice(resultFn, langOverride){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR){ toast('🎤 Is browser mein voice input support nahi hai. Chrome use karein.'); return null; }
  try{ recognition && recognition.abort(); }catch(e){}
  recognition = new SR(); recognition.lang = langOverride || (state.lang==='hi' ? 'hi-IN' : 'en-IN');
  recognition.interimResults = true; recognition.continuous = false;
  recognition.onresult = e=>{ let txt=''; for (const r of e.results) txt += r[0].transcript; resultFn && resultFn(txt, e.results[e.results.length-1].isFinal); };
  recognition.onerror = e=>{ toast('🎤 Mic error: '+e.error+' — browser settings mein mic permission allow karein.'); };
  recognition.start(); return recognition;
}

/* ---------------- nav data (tabs + sidebar) ---------------- */
const TABS = [
  {id:'tab-chat', view:'chat', key:'chat', icon:'💬'},
  {id:'tab-pdf', view:'pdf-studio', key:'pdfStudio', icon:'📄'},
  {id:'tab-img', view:'image-studio', key:'imageStudio', icon:'🖼️'},
  {id:'tab-code', view:'code-lab', key:'codeLab', icon:'💻'},
  {id:'tab-tools', view:'__tools__', key:'aiTools', icon:'🧰'},
  {id:'tab-news', view:'news', key:'liveNews', icon:'📰'},
  {id:'tab-lib', view:'library', key:'library', icon:'📚'},
  {id:'tab-mem', view:'memory', key:'memory', icon:'🧠'},
  {id:'tab-set', view:'settings', key:'settings', icon:'⚙️'},
];
const SIDEBAR = [
  {group:'sbMain'},
  {id:'home', icon:'🏠', key:'home'},
  {id:'pdf-studio', icon:'📄', key:'pdfStudio'},
  {group:'sbPdf'},
  {id:'pdf-studio', icon:'🪄', label:'PDF Generator', params:{action:'create'}},
  {id:'pdf-studio', icon:'✏️', label:'PDF Editor', params:{action:'edit'}},
  {id:'word-to-pdf', icon:'📘', label:'Word to PDF'},
  {id:'pdf-to-word', icon:'📝', label:'PDF to Word'},
  {id:'pdf-studio', icon:'🧩', label:'Merge PDF', params:{action:'merge'}},
  {id:'pdf-studio', icon:'✂️', label:'Split PDF', params:{action:'split'}},
  {id:'ocr', icon:'🔤', label:'OCR (Image to Text)'},
  {id:'templates', icon:'🎨', label:'PDF Templates'},
  {id:'question-paper', icon:'📝', label:'Question Paper'},
  {id:'study-material', icon:'📚', label:'Study Material'},
  {id:'notes-maker', icon:'🗒️', label:'Notes Maker'},
  {group:'sbAi'},
  {id:'chat', icon:'💬', label:'AI Chat'},
  {id:'image-studio', icon:'🖼️', label:'AI Image'},
  {id:'video', icon:'🎬', label:'AI Video'},
  {id:'code-lab', icon:'▶️', label:'Code Runner'},
  {id:'downloader', icon:'⬇️', key:'downloader'},
  {id:'news', icon:'📰', key:'news'},
  {id:'library', icon:'📚', key:'library'},
  {id:'memory', icon:'🧠', key:'memory'},
  {id:'voice', icon:'🎤', key:'voiceAssistant'},
  {id:'history', icon:'🕘', key:'history'},
  {id:'memory', icon:'📋', key:'instruction', params:{section:'instructions'}},
  {group:'sbMore'},
  {id:'profile', icon:'⭐', key:'subscription', params:{section:'plan'}},
  {id:'profile', icon:'👤', key:'profile'},
  {id:'__tools__', icon:'🧰', key:'moreTools'},
  {id:'profile', icon:'👑', key:'proFeatures', params:{section:'plan'}},
];
function renderTabs(){
  const nav = $('#top-tabs'); nav.innerHTML='';
  TABS.forEach(tb=>{
    const b = document.createElement('button'); b.className='tab'; b.dataset.view = tb.view;
    b.textContent = tb.icon+' '+t(tb.key);
    b.onclick = ()=>{ if (tb.view==='__tools__') openToolsDialog(); else show(tb.view); };
    nav.appendChild(b);
  });
}
function renderSidebar(){
  const sb = $('#sidebar'); sb.innerHTML='';
  SIDEBAR.forEach(item=>{
    if (item.group){ const g=document.createElement('div'); g.className='sb-group'; g.dataset.group=item.group; g.textContent=t(item.group); sb.appendChild(g); return; }
    const b = document.createElement('button'); b.className='sb-item'; b.dataset.sview = item.id;
    const label = item.label || t(item.key);
    b.innerHTML = '<span class="ic">'+item.icon+'</span><span>'+esc(label)+'</span>'+(views[item.id]?'':'<span class="soon">soon</span>');
    b.onclick = ()=>{ if (item.id==='__tools__') openToolsDialog(); else show(item.id, item.params||{}); };
    sb.appendChild(b);
  });
}
function openToolsDialog(){
  const list = SIDEBAR.filter(x=>!x.group).map(x=>({id:x.id,label:x.label||t(x.key),icon:x.icon,params:x.params}));
  const grid = document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px';
  list.forEach(x=>{ const el=document.createElement('div'); el.className='feature-tile';
    el.innerHTML='<div class="ic">'+x.icon+'</div><div class="lb">'+esc(x.label)+'</div>';
    el.onclick=()=>{ document.dispatchEvent(new CustomEvent('aiew-close-dialog')); show(x.id, x.params||{}); }; grid.appendChild(el); });
  const close = dialog({title:t('toolsListTitle'), html:grid, buttons:[{label:'✕ Close'}]});
  document.addEventListener('aiew-close-dialog', ()=>close(), {once:true});
}

/* ---------------- search (local: chats + library + tools) ---------------- */
function searchAll(q){
  q = q.trim().toLowerCase(); if(!q) return [];
  const hits = [];
  SIDEBAR.filter(x=>!x.group).forEach(x=>{ const label=(x.label||t(x.key)||'').toLowerCase();
    if (label.includes(q)) hits.push({kind:'tool', title:x.label||t(x.key), icon:x.icon, go:()=>show(x.id, x.params||{})}); });
  const seen = new Set();
  hits.filter(h=>h.kind==='tool').forEach(h=>{ seen.add(h.title.toLowerCase()); });
  return Promise.resolve().then(()=> library.getAll('chat')).then(chats=>{
    (chats||[]).forEach(c=>{ if((c.title||'').toLowerCase().includes(q)) hits.push({kind:'chat', title:c.title, icon:'💬', go:()=>show('chat',{loadChatId:c.id})}); });
    return library.getAll('pdf').then(pdfs=>{ (pdfs||[]).forEach(p=>{ if((p.name||'').toLowerCase().includes(q)) hits.push({kind:'pdf', title:p.name, icon:'📄', go:()=>show('library')}); });
      return library.getAll('image').then(imgs=>{ (imgs||[]).forEach(p=>{ if((p.name||'').toLowerCase().includes(q)) hits.push({kind:'image', title:p.name, icon:'🖼️', go:()=>show('library')}); });
        return hits.slice(0,12); }); });
  });
}
function initSearch(){
  const inp = $('#search-input'), dd = $('#search-dropdown');
  let activeIdx = -1, currentHits = [];
  const renderDD = ()=>{
    if (!inp.value.trim()){ dd.classList.remove('open'); return; }
    dd.innerHTML = currentHits.length
      ? currentHits.map((h,i)=>'<div class="sr-item'+(i===activeIdx?' active':'')+'" data-i="'+i+'" role="option"><span>'+h.icon+'</span><span>'+esc(h.title)+'</span><span class="kind">'+h.kind+'</span></div>').join('')
      : '<div class="sr-item"><span>🔍</span><span class="hint">'+esc(t('searchNoResults'))+'</span></div>';
    dd.classList.add('open');
    $$('.sr-item', dd).forEach(el=>{ el.onclick = ()=>{ const h=currentHits[+el.dataset.i]; dd.classList.remove('open'); inp.value=''; h && h.go(); }; });
  };
  inp.addEventListener('input', debounce(()=>{ activeIdx=-1; searchAll(inp.value).then(h=>{ currentHits=h; renderDD(); }); }, 220));
  inp.addEventListener('keydown', e=>{
    if (e.key==='ArrowDown'){ e.preventDefault(); activeIdx=Math.min(activeIdx+1,currentHits.length-1); renderDD(); }
    else if (e.key==='ArrowUp'){ e.preventDefault(); activeIdx=Math.max(activeIdx-1,-1); renderDD(); }
    else if (e.key==='Enter' && currentHits[activeIdx]){ const h=currentHits[activeIdx]; dd.classList.remove('open'); inp.value=''; h.go(); }
    else if (e.key==='Escape'){ dd.classList.remove('open'); }
  });
  document.addEventListener('click', e=>{ if(!e.target.closest('.topbar-search')) dd.classList.remove('open'); });
}

/* ---------------- right panel ---------------- */
function renderRightPanel(){
  const rp = $('#rightpanel');
  const acts = [
    ['create',t('actCreate'),'🪄'],['edit',t('actEdit'),'✏️'],['merge',t('actMerge'),'🧩'],
    ['split',t('actSplit'),'✂️'],['pdf-to-word',t('actPdf2Word'),'📝'],['word-to-pdf',t('actWord2Pdf'),'📘'],
    ['ocr',t('actOcr'),'🔤'],['compress',t('actCompress'),'🗜️'],['watermark',t('actWatermark'),'💧'],
  ];
  rp.innerHTML =
    '<div class="rp-title">'+esc(t('pdfPreview'))+'</div>'+
    '<div class="pdf-preview" id="pdf-preview"><div class="pdf-empty">'+esc(t('noPdfYet'))+'</div></div>'+
    '<div class="pdf-name" id="pdf-name"></div>'+
    '<div class="rp-title">'+esc(t('quickPdfActions'))+'</div>'+
    '<div class="rp-actions">'+acts.map(a=>'<button class="btn small" data-act="'+a[0]+'">'+a[2]+' '+esc(a[1])+'</button>').join('')+'</div>'+
    '<div class="rp-title">Tools</div>'+
    '<div class="rp-tools">'+
      '<button class="btn small" id="rp-print">🖨️ '+esc(t('print'))+'</button>'+
      '<button class="btn small" id="rp-save">💾 '+esc(t('savePdf'))+'</button>'+
      '<button class="btn small" id="rp-download">⬇️ '+esc(t('download'))+'</button>'+
      '<button class="btn small" id="rp-share">🔗 '+esc(t('share'))+'</button>'+
    '</div>';
  $$('[data-act]', rp).forEach(b=> b.onclick = ()=> openPdfTool(b.dataset.act));
  $('#rp-print').onclick = printCurrentPdf;
  $('#rp-save').onclick = async ()=>{
    if(!currentPdf){ toast(t('noPdfYet')); return; }
    await library.save('pdf', {name:currentPdf.name, blob:pdfBlob(), size:currentPdf.bytes.length});
    toast(t('savedToLib')); notify('📄 PDF saved', (currentPdf.name||'document.pdf')+' → Library');
  };
  $('#rp-download').onclick = ()=>{
    if(!currentPdf){ toast(t('noPdfYet')); return; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(pdfBlob()); a.download=currentPdf.name||'document.pdf'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  };
  $('#rp-share').onclick = async ()=>{
    if(!currentPdf){ toast(t('noPdfYet')); return; }
    const file = new File([pdfBlob()], currentPdf.name||'document.pdf', {type:'application/pdf'});
    if (navigator.canShare && navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file], title:currentPdf.name}); }catch(e){}
    } else { toast(t('shareNotSupported')); $('#rp-download').click(); }
  };
}
function printCurrentPdf(){
  if(!currentPdf){ toast(t('noPdfYet')); return; }
  const fr = document.createElement('iframe'); fr.style.display='none';
  fr.src = URL.createObjectURL(pdfBlob()); document.body.appendChild(fr);
  fr.onload = ()=>{ toast(t('printed')); setTimeout(()=>{ fr.contentWindow.print(); setTimeout(()=>{ URL.revokeObjectURL(fr.src); fr.remove(); }, 3000); }, 300); };
}

/* ---------------- topbar wiring ---------------- */
function applyTheme(){
  document.documentElement.setAttribute('data-theme', state.theme);
  $('#btn-theme').textContent = state.theme==='dark' ? '🌙' : '☀️';
  document.body.style.background = state.theme==='dark' ? '#0a0a0d' : '#faf7ef';
}
function updateProfileChip(){
  $('#profile-name').textContent = state.profileName || 'Shailesh Arya';
  $('#profile-avatar').textContent = (state.profileName||'S').trim().charAt(0).toUpperCase();
}
function initTopbar(){
  $('#btn-live-news').onclick = ()=> show('news');
  $('#btn-theme').onclick = ()=>{ state.theme = state.theme==='dark'?'light':'dark'; saveState(); applyTheme(); events.emit('theme:changed',{theme:state.theme}); };
  $('#lang-select').onchange = e=>{ state.lang = e.target.value; saveState(); applyI18n(); renderTabs(); renderSidebar(); renderRightPanel(); show(currentView||'home', currentParams||{}); events.emit('lang:changed',{lang:state.lang}); };
  $('#btn-bell').onclick = e=>{ e.stopPropagation(); const p=$('#notif-panel'); const open=p.classList.toggle('open'); if(open){ const list=store.get('notifs',[]); list.forEach(n=>n.read=true); store.set('notifs',list); setTimeout(updateBell,600);} };
  document.addEventListener('click', e=>{ if(!e.target.closest('#notif-panel') && !e.target.closest('#btn-bell')) $('#notif-panel').classList.remove('open'); });
  $('#profile-chip').onclick = ()=> show('profile');
  $('#profile-chip').onkeydown = e=>{ if(e.key==='Enter'||e.key===' ') show('profile'); };
  $('#brand-home').onclick = ()=> show('home');
  $('#brand-home').onkeydown = e=>{ if(e.key==='Enter') show('home'); };
  $('#hamburger').onclick = ()=> $('#sidebar').classList.toggle('collapsed');
  if (innerWidth<=820) $('#sidebar').classList.add('collapsed');
}

/* ---------------- boot ---------------- */
function boot(){
  applyTheme(); applyI18n(); updateProfileChip(); updateBell(); renderNotifPanel();
  document.body.classList.toggle('no-anim', !state.animations);
  renderTabs(); renderSidebar(); renderRightPanel(); initTopbar(); initSearch();
  startBg();
  events.on('pdf:ready', d=>{ if(d && d.id){ library.get('pdf', d.id).then(p=>{ if(p && p.blob) p.blob.arrayBuffer().then(buf=> setCurrentPdf(new Uint8Array(buf), p.name)); }); }
    else notify('📄 PDF ready', d&&d.name?d.name:''); });
  events.on('library:changed', ()=>{ if(currentView==='library'||currentView==='history') show(currentView, currentParams||{}); });
  events.on('theme:changed', ()=> startBg());
  events.on('bg:changed', ()=> startBg());
  show('home');
  console.log('%cAI Everything Workspace shell ready — By Shailesh Arya','color:#d4af37;font-weight:bold');
}

/* ---------------- public API ---------------- */
window.App = {
  registerView, show, notify, toast, dialog, openChat, openPdfTool,
  setCurrentPdf, getCurrentPdf,
  library, memory, events, t, getKeysHeader, startVoice,
  state, views,
  get currentView(){ return currentView; },
  openToolsDialog,
  saveState,
};
document.addEventListener('DOMContentLoaded', boot);
})();

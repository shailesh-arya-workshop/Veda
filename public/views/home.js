/* AI Everything Workspace — HOME view (hero, quick actions, features grid) */
(function(){
const FEATURES = [
  {icon:'💬', hi:'AI Chat', en:'AI Chat', hiD:'स्मार्ट बातचीत', enD:'Smart conversation', go:()=>App.show('chat')},
  {icon:'🪄', hi:'PDF Generator', en:'PDF Generator', hiD:'सेकंडों में PDF बनाएं', enD:'Make PDFs in seconds', go:()=>App.openPdfTool('create')},
  {icon:'✏️', hi:'PDF Editor', en:'PDF Editor', hiD:'PDF एडिट करें', enD:'Edit PDFs', go:()=>App.openPdfTool('edit')},
  {icon:'🎨', hi:'Templates', en:'Templates', hiD:'तैयार डिज़ाइन', enD:'Ready designs', go:()=>App.openPdfTool('templates')},
  {icon:'📚', hi:'Study Guide', en:'Study Guide', hiD:'पढ़ाई की गाइड', enD:'Study guides', go:()=>App.show('study-guide')},
  {icon:'📝', hi:'Question Bank', en:'Question Bank', hiD:'प्रश्न-पत्र बनाएं', enD:'Make question papers', go:()=>App.show('question-bank')},
  {icon:'🖼️', hi:'Image Generator', en:'Image Generator', hiD:'AI से इमेज बनाएं', enD:'AI image generation', go:()=>App.show('image-studio')},
  {icon:'🎬', hi:'Video AI', en:'Video AI', hiD:'AI वीडियो टूल्स', enD:'AI video tools', go:()=>App.show('video')},
  {icon:'▶️', hi:'Code Runner', en:'Code Runner', hiD:'कोड चलाएं', enD:'Run code', go:()=>App.show('code-lab')},
  {icon:'📰', hi:'Live News', en:'Live News', hiD:'ताज़ा खबरें', enD:'Latest headlines', go:()=>App.show('news')},
  {icon:'🎤', hi:'Voice Assistant', en:'Voice Assistant', hiD:'बोलकर कमांड', enD:'Voice commands', go:()=>App.show('voice')},
  {icon:'⬇️', hi:'Download Tools', en:'Download Tools', hiD:'वीडियो/फाइल डाउनलोड', enD:'Video/file downloads', go:()=>App.show('downloader')},
  {icon:'🤖', hi:'Multi AI Models', en:'Multi AI Models', hiD:'Gemini, Llama और Custom', enD:'Gemini, Llama & custom', go:()=>App.show('settings')},
  {icon:'🔊', hi:'Text to Speech', en:'Text to Speech', hiD:'टेक्स्ट को आवाज़ दें', enD:'Speak any text', go:()=>App.show('voice')},
  {icon:'🔄', hi:'File Converter', en:'File Converter', hiD:'फॉर्मेट बदलें', enD:'Convert formats', go:()=>App.show('file-converter')},
  {icon:'🔤', hi:'OCR Scanner', en:'OCR Scanner', hiD:'इमेज से टेक्स्ट', enD:'Image to text', go:()=>App.show('ocr')},
  {icon:'🖼️', hi:'Image to PDF', en:'Image to PDF', hiD:'इमेज से PDF', enD:'Images to PDF', go:()=>App.show('image-to-pdf')},
  {icon:'🧩', hi:'PDF Merge', en:'PDF Merge', hiD:'PDF जोड़ें', enD:'Merge PDFs', go:()=>App.openPdfTool('merge')},
  {icon:'✂️', hi:'PDF Split', en:'PDF Split', hiD:'PDF अलग करें', enD:'Split PDFs', go:()=>App.openPdfTool('split')},
  {icon:'🧠', hi:'Chat Memory', en:'Chat Memory', hiD:'यादें और निर्देश', enD:'Memory & instructions', go:()=>App.show('memory')},
  {icon:'🗒️', hi:'Notes Maker', en:'Notes Maker', hiD:'स्मार्ट नोट्स', enD:'Smart notes', go:()=>App.openPdfTool('notes')},
  {icon:'🌐', hi:'HTML Preview', en:'HTML Preview', hiD:'HTML लाइव देखें', enD:'Live HTML preview', go:()=>App.show('code-lab')},
  {icon:'📊', hi:'Data Analysis', en:'Data Analysis', hiD:'डेटा समझें', enD:'Understand data', go:()=>App.show('data-analysis')},
  {icon:'✨', hi:'Much More', en:'Much More', hiD:'पूरी लिस्ट देखें', enD:'See full list', go:()=>App.openToolsDialog()},
];
const SUGGESTIONS = [
  {hi:'बिहार बोर्ड के लिए PDF बनाओ', en:'Make a PDF for Bihar Board', run:()=>App.openPdfTool('create', {prefill:'theme: navy-gold\n[cover]\n# बिहार बोर्ड परीक्षा — Study PDF\nClass 8\n[/cover]\n\n## परिचय\n- अपना content yahan likho…'})},
  {hi:'इस इमेज से PDF बनाओ', en:'Make PDF from this image', run:()=>App.show('image-to-pdf')},
  {hi:'जलवायु परिवर्तन पर नोट्स', en:'Notes on climate change', run:()=>App.openPdfTool('notes', {topic:'जलवायु परिवर्तन'})},
  {hi:'आज की ताज़ा खबर बताओ', en:'Tell me today\'s news', run:()=>App.show('news')},
  {hi:'HTML कोड चलाओ', en:'Run HTML code', run:()=>App.show('code-lab', {code:'<h1 style="color:gold">नमस्ते! 👋</h1><p>यह HTML preview है।</p>'})},
];
function render(el){
  const hi = App.state.lang==='hi';
  el.innerHTML =
  '<section class="hero">'+
    '<h1 class="gold-text">'+App.t('heroTitle')+'</h1>'+
    '<div class="tagline">'+App.t('heroTag')+'</div>'+
    '<div class="byline">✦ '+App.t('heroBy')+' ✦</div>'+
    '<div class="quick-grid" id="quick-grid"></div>'+
    '<div class="hero-input">'+
      '<input id="hero-input" type="text" aria-label="Ask">'+
      '<button class="hi-btn" id="hero-mic" aria-label="Voice">🎤</button>'+
      '<button class="hi-btn" id="hero-attach" aria-label="Attach">📎</button>'+
      '<button class="hi-btn send" id="hero-send" aria-label="Send">➤</button>'+
    '</div>'+
    '<div class="chips-row" id="sugg-chips"></div>'+
  '</section>'+
  '<h2 class="section-title">✨ '+App.t('features50')+'</h2>'+
  '<div class="features-grid" id="feat-grid"></div>';
  el.querySelector('#hero-input').placeholder = App.t('searchPlaceholder');
  const quick = [
    {icon:'🎤', lb:App.t('quickVoice'), act:()=>{ App.events.emit('hero:quickAction',{action:'voice'}); App.show('voice'); App.events.emit('voice:start',{}); }},
    {icon:'📄', lb:App.t('quickPdf'), act:()=>{ App.events.emit('hero:quickAction',{action:'pdf'}); App.openPdfTool('create'); }},
    {icon:'🖼️', lb:App.t('quickImage'), act:()=>{ App.events.emit('hero:quickAction',{action:'image'}); App.show('image-studio'); }},
    {icon:'💻', lb:App.t('quickCode'), act:()=>{ App.events.emit('hero:quickAction',{action:'code'}); App.show('code-lab'); }},
    {icon:'📰', lb:App.t('quickNews'), act:()=>{ App.events.emit('hero:quickAction',{action:'news'}); App.show('news'); }},
    {icon:'📎', lb:App.t('quickUpload'), act:()=>{ App.events.emit('hero:quickAction',{action:'upload'}); App.openChat('', {pickFile:true}); }},
  ];
  const qg = el.querySelector('#quick-grid');
  quick.forEach(q=>{ const c=document.createElement('div'); c.className='quick-card';
    c.innerHTML='<div class="ic">'+q.icon+'</div><div class="lb">'+q.lb+'</div>'; c.onclick=q.act; qg.appendChild(c); });
  const chips = el.querySelector('#sugg-chips');
  SUGGESTIONS.forEach(s=>{ const c=document.createElement('button'); c.className='chip'; c.textContent = hi?s.hi:s.en; c.onclick=s.run; chips.appendChild(c); });
  const fg = el.querySelector('#feat-grid');
  FEATURES.forEach(f=>{ const d=document.createElement('div'); d.className='feature-tile';
    d.innerHTML='<div class="ic">'+f.icon+'</div><div class="lb">'+(hi?f.hi:f.en)+'</div><div class="ds">'+(hi?f.hiD:f.enD)+'</div>';
    d.onclick=f.go; fg.appendChild(d); });
  const input = el.querySelector('#hero-input');
  const send = ()=>{ const txt=input.value.trim(); if(txt) App.openChat(txt); };
  el.querySelector('#hero-send').onclick = send;
  input.onkeydown = e=>{ if(e.key==='Enter') send(); };
  // Mic: arrow-function wrapper (Bug B lesson) — never pass the event as target
  el.querySelector('#hero-mic').onclick = ()=>{
    App.startVoice((txt, isFinal)=>{ input.value = txt; input.focus(); if(isFinal && txt.trim()) send(); });
  };
  el.querySelector('#hero-attach').onclick = ()=> App.openChat('', {pickFile:true});
}
App.registerView('home', {title:'Home', icon:'🏠', render});
})();

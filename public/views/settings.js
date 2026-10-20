/* AI Everything Workspace — SETTINGS view (keys stay in localStorage only) */
(function(){
const BGS = [
  {id:'golden', icon:'✨', hi:'Golden Particles', en:'Golden Particles'},
  {id:'matrix', icon:'🟢', hi:'Matrix Rain', en:'Matrix Rain'},
  {id:'ocean', icon:'🌊', hi:'Ocean Waves', en:'Ocean Waves'},
  {id:'minimal', icon:'◻️', hi:'Minimal', en:'Minimal'},
];
function render(el){
  const hi = App.state.lang==='hi';
  const st = App.state, k = st.apiKeys;
  el.innerHTML =
    '<h2 class="section-title">⚙️ '+App.t('settings')+'</h2>'+
    '<div class="set-card"><h3>🔑 '+(hi?'API Keys':'API Keys')+'</h3>'+
      '<div class="set-row"><label>Gemini Keys '+(hi?'(एक पंक्ति = एक key, कई keys हों तो हर पंक्ति में एक)':'(one key per line)')+'</label>'+
      '<textarea id="sk-gemini" rows="3" placeholder="AIza..."></textarea>'+
      '<div class="hint">'+(hi?'Free key: aistudio.google.com से बनाएं।':'Free key: create at aistudio.google.com.')+'</div></div>'+
      '<div class="set-row"><label>Llama Key</label><input id="sk-llama" type="password" placeholder="llama key"></div>'+
      '<div class="set-row"><label>Custom API — Base URL</label><input id="sk-cbase" placeholder="https://..."></div>'+
      '<div class="row"><div style="flex:1"><label>Custom Key</label><input id="sk-ckey" type="password"></div><div style="flex:1"><label>Custom Model</label><input id="sk-cmodel"></div></div>'+
      '<div style="margin-top:12px"><button class="btn primary small" id="sk-save">💾 '+(hi?'Keys सेव करें':'Save keys')+'</button></div>'+
      '<div class="plan-note">🔒 '+(hi?'ईमानदार बात: Keys <b>सिर्फ आपके फोन/ब्राउज़र के localStorage</b> में रहती हैं — कोड में नहीं, किसी server पर store नहीं होतीं। चैट के समय सिर्फ header में भेजी जाती हैं।':'Honest note: keys live <b>only in your browser\'s localStorage</b> — never in code, never stored on any server. They are only sent in the request header when chatting.')+'</div>'+
    '</div>'+
    '<div class="set-card"><h3>🤖 '+(hi?'मॉडल':'Model')+'</h3>'+
      '<select id="sk-model">'+
        ['auto','gemini-flash','gemini-pro','llama','custom'].map(m=>'<option value="'+m+'">'+m+'</option>').join('')+
      '</select></div>'+
    '<div class="set-card"><h3>🎨 '+(hi?'दिखावट':'Appearance')+'</h3>'+
      '<div class="set-row"><label>'+(hi?'थीम':'Theme')+'</label>'+
      '<select id="sk-theme"><option value="dark">🌙 Dark Gold</option><option value="light">☀️ Light</option></select></div>'+
      '<div class="set-row"><label>'+(hi?'बैकग्राउंड':'Background')+'</label><div class="bg-picker" id="sk-bg"></div></div>'+
      '<div class="toggle-row"><span>'+(hi?'एनिमेशन चालू':'Animations on')+'</span>'+
        '<label class="switch"><input type="checkbox" id="sk-anim"><span class="sl"></span></label></div>'+
      '<div class="set-row"><label>'+(hi?'भाषा':'Language')+'</label>'+
      '<select id="sk-lang"><option value="hi">हिंदी</option><option value="en">English</option></select></div>'+
    '</div>'+
    '<div class="set-card"><h3>🔊 '+(hi?'आवाज़ (TTS)':'Voice (TTS)')+'</h3>'+
      '<div class="hint">'+(hi?'Text-to-Speech आपके ब्राउज़र की built-in आवाज़ से चलती है — कोई key नहीं चाहिए। Voice Assistant व्यू में माइक/स्पीकर से बात कर सकते हैं। हिंदी आवाज़ के लिए Chrome में hi-IN voice हो तो वही चुनी जाती है।':'Text-to-Speech uses your browser\'s built-in voices — no key needed. If a hi-IN voice is installed in Chrome, it is picked automatically.')+'</div>'+
      '<div style="margin-top:10px"><button class="btn small" id="sk-tts-test">▶️ '+(hi?'टेस्ट आवाज़':'Test voice')+'</button></div></div>'+
    '<div class="set-card"><h3>🗂️ '+(hi?'डेटा':'Data')+'</h3>'+
      '<div class="row" style="flex-wrap:wrap">'+
        '<button class="btn small" id="sk-export">⬇️ '+(hi?'एक्सपोर्ट (JSON)':'Export (JSON)')+'</button>'+
        '<button class="btn small" id="sk-import">⬆️ '+(hi?'इम्पोर्ट':'Import')+'</button>'+
        '<button class="btn small danger" id="sk-clear">🗑 '+(hi?'सब डेटा मिटाएं':'Clear all data')+'</button>'+
      '</div><input type="file" id="sk-import-file" class="hidden" accept="application/json"></div>';
  el.querySelector('#sk-gemini').value = (k.gemini||[]).join('\n');
  el.querySelector('#sk-llama').value = k.llama||'';
  el.querySelector('#sk-cbase').value = (k.custom||{}).baseUrl||'';
  el.querySelector('#sk-ckey').value = (k.custom||{}).key||'';
  el.querySelector('#sk-cmodel').value = (k.custom||{}).model||'';
  el.querySelector('#sk-model').value = st.model||'auto';
  el.querySelector('#sk-theme').value = st.theme||'dark';
  el.querySelector('#sk-anim').checked = !!st.animations;
  el.querySelector('#sk-lang').value = st.lang||'hi';
  const bgp = el.querySelector('#sk-bg');
  BGS.forEach(b=>{ const d=document.createElement('div'); d.className='bg-opt'+(st.background===b.id?' sel':'');
    d.innerHTML=b.icon+'<br>'+(hi?b.hi:b.en); d.onclick=()=>{ App.state.background=b.id; App.saveState(); App.events.emit('bg:changed',{bg:b.id}); render(el); }; bgp.appendChild(d); });
  el.querySelector('#sk-save').onclick=()=>{
    App.state.apiKeys = {
      gemini: el.querySelector('#sk-gemini').value.split('\n').map(s=>s.trim()).filter(Boolean),
      llama: el.querySelector('#sk-llama').value.trim(),
      custom: { baseUrl:el.querySelector('#sk-cbase').value.trim(), key:el.querySelector('#sk-ckey').value.trim(), model:el.querySelector('#sk-cmodel').value.trim() },
    };
    App.saveState(); App.toast('💾 '+(hi?'Keys सेव हो गईं':'Keys saved'));
  };
  el.querySelector('#sk-model').onchange=e=>{ App.state.model=e.target.value; App.saveState(); };
  el.querySelector('#sk-theme').onchange=e=>{ App.state.theme=e.target.value; App.saveState(); App.events.emit('theme:changed',{theme:App.state.theme}); document.documentElement.setAttribute('data-theme',App.state.theme); document.querySelector('#btn-theme').textContent = App.state.theme==='dark'?'🌙':'☀️'; };
  el.querySelector('#sk-anim').onchange=e=>{ App.state.animations=e.target.checked; App.saveState(); document.body.classList.toggle('no-anim',!App.state.animations); App.events.emit('bg:changed',{bg:App.state.background}); };
  el.querySelector('#sk-lang').onchange=e=>{ const sel=document.querySelector('#lang-select'); sel.value=e.target.value; sel.dispatchEvent(new Event('change')); };
  el.querySelector('#sk-tts-test').onclick=()=>{ try{ const u=new SpeechSynthesisUtterance(hi?'नमस्ते! AI Everything तैयार है।':'Hello! AI Everything is ready.'); u.lang=hi?'hi-IN':'en-IN'; speechSynthesis.speak(u); }catch(e){ App.toast('🔊 TTS unavailable'); } };
  el.querySelector('#sk-export').onclick=async ()=>{
    const data = {version:1, exportedAt:new Date().toISOString(), settings:App.state, memory:(function(){ try{ return JSON.parse(localStorage.getItem('aiew-memory')||'null'); }catch(e){ return null; } })(),
      chats: await App.library.getAll('chat'), notifs:(function(){ try{ return JSON.parse(localStorage.getItem('aiew-notifs')||'[]'); }catch(e){ return []; } })()};
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ai-everything-data.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000); App.toast('⬇️ '+(hi?'एक्सपोर्ट हो गया':'Exported'));
  };
  const impFile = el.querySelector('#sk-import-file');
  el.querySelector('#sk-import').onclick=()=>impFile.click();
  impFile.onchange=()=>{ const f=impFile.files[0]; if(!f) return; const rd=new FileReader();
    rd.onload=()=>{ try{ const d=JSON.parse(rd.result);
      if(d.settings){ Object.assign(App.state,d.settings); App.saveState(); }
      if(d.memory) localStorage.setItem('aiew-memory', JSON.stringify(d.memory));
      if(d.notifs) localStorage.setItem('aiew-notifs', JSON.stringify(d.notifs));
      if(Array.isArray(d.chats)) d.chats.forEach(c=>App.library.save('chat', c));
      App.toast('⬆️ '+(hi?'इम्पोर्ट हो गया — ऐप refresh हो रहा है':'Imported — refreshing app')); setTimeout(()=>location.reload(), 800);
    }catch(e){ App.toast('⚠️ '+(hi?'गलत फाइल':'Invalid file')); } };
    rd.readAsText(f); impFile.value=''; };
  el.querySelector('#sk-clear').onclick=()=>{
    App.dialog({title:'🗑 '+(hi?'सब डेटा मिटाएं?':'Clear all data?'),
      html:'<p class="hint" style="font-size:14px">'+(hi?'सेटिंग्स, keys, memory, notifications और लाइब्रेरी — सब कुछ मिट जाएगा। यह वापस नहीं आएगा।':'Settings, keys, memory, notifications and library — everything will be deleted. This cannot be undone.')+'</p>',
      buttons:[{label:hi?'रहने दो':'Cancel'},{label:hi?'हाँ, सब मिटाओ':'Yes, clear all', primary:true, onClick:()=>{
        Object.keys(localStorage).filter(kk=>kk.startsWith('aiew-')).forEach(kk=>localStorage.removeItem(kk));
        try{ indexedDB.deleteDatabase('aiew-db'); }catch(e){}
        App.toast('🗑 '+(hi?'सब मिट गया — refresh हो रहा है':'Cleared — refreshing')); setTimeout(()=>location.reload(), 900);
      }}]});
  };
}
App.registerView('settings', {title:'Settings', icon:'⚙️', render});
})();

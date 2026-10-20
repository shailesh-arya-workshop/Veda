/* AI Everything Workspace — CHAT view (SSE streaming, vision, model selector) */
(function(){
const MODELS = [
  {id:'auto', hi:'Auto (सबसे अच्छा)', en:'Auto (best)'},
  {id:'gemini-flash', hi:'Gemini Flash', en:'Gemini Flash'},
  {id:'gemini-pro', hi:'Gemini Pro', en:'Gemini Pro'},
  {id:'llama', hi:'Llama', en:'Llama'},
  {id:'custom', hi:'Custom', en:'Custom'},
];
function md(src){
  let h = src.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  h = h.replace(/```([\s\S]*?)```/g, (m,c)=>'<pre style="background:#0a0a0d;border:1px solid rgba(212,175,55,.25);border-radius:8px;padding:10px;overflow:auto;margin:8px 0"><code>'+c.replace(/^\n/,'')+'</code></pre>');
  h = h.replace(/`([^`]+)`/g, '<code style="background:rgba(212,175,55,.15);padding:1px 6px;border-radius:5px">$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>');
  h = h.replace(/^### (.*)$/gm, '<b style="color:#f5c542">$1</b>').replace(/^## (.*)$/gm, '<b style="font-size:1.08em">$1</b>');
  h = h.replace(/\n/g, '<br>');
  return h;
}
let S = null; // per-view session state
function hasAnyKey(){
  try{ const k = JSON.parse(App.getKeysHeader());
    return (k.gemini&&k.gemini.length) || k.llama || (k.custom&&k.custom.key); }catch(e){ return false; }
}
function render(el, params){
  const hi = App.state.lang==='hi';
  S = { el, msgs:[], streaming:false, abort:null, chatId:null, pendingFiles:[], title: hi?'नई चैट':'New chat' };
  el.innerHTML =
  '<div class="chat-wrap">'+
    '<div class="chat-head">'+
      '<select class="model-select" id="chat-model" aria-label="Model"></select>'+
      '<button class="btn small ghost" id="chat-new">＋ '+(hi?'नई चैट':'New chat')+'</button>'+
      '<span class="badge" id="chat-title">'+''+'</span>'+
    '</div>'+
    '<div class="chat-msgs" id="chat-msgs"></div>'+
    '<div class="chat-bar">'+
      '<button class="hi-btn" id="chat-attach" aria-label="Attach" title="Attach">📎</button>'+
      '<button class="hi-btn" id="chat-img" aria-label="Image" title="Image">🖼️</button>'+
      '<button class="hi-btn" id="chat-mic" aria-label="Voice">🎤</button>'+
      '<textarea id="chat-input" rows="1" aria-label="Message"></textarea>'+
      '<button class="hi-btn send" id="chat-send" aria-label="Send">➤</button>'+
      '<button class="hi-btn hidden" id="chat-stop" aria-label="Stop" title="Stop">⏹</button>'+
    '</div>'+
    '<input type="file" id="chat-file" class="hidden" accept="image/*,.pdf,.txt,.md" multiple>'+
  '</div>';
  const ms = $('#chat-model', el);
  MODELS.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=hi?m.hi:m.en; ms.appendChild(o); });
  ms.value = App.state.model || 'auto';
  ms.onchange = ()=>{ App.state.model=ms.value; App.saveState(); };
  const input = $('#chat-input', el);
  input.placeholder = App.t('askAnything');
  input.addEventListener('input', ()=>{ input.style.height='auto'; input.style.height=Math.min(130,input.scrollHeight)+'px'; });
  $('#chat-send', el).onclick = ()=> doSend();
  input.onkeydown = e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); doSend(); } };
  $('#chat-new', el).onclick = ()=>{ S.msgs=[]; S.chatId=null; S.title=hi?'नई चैट':'New chat'; paintTitle(); paintMsgs(); };
  $('#chat-stop', el).onclick = ()=>{ if(S.abort) S.abort.abort(); };
  // Mic: arrow-function wrapper (Bug B lesson)
  $('#chat-mic', el).onclick = ()=>{ App.startVoice((txt)=>{ input.value = txt; input.focus(); }); };
  const fileInp = $('#chat-file', el);
  $('#chat-attach', el).onclick = ()=>{ fileInp.accept='image/*,.pdf,.txt,.md'; fileInp.click(); };
  $('#chat-img', el).onclick = ()=>{ fileInp.accept='image/*'; fileInp.click(); };
  fileInp.onchange = ()=>{
    Array.from(fileInp.files).forEach(f=>{
      const rd = new FileReader();
      rd.onload = ()=>{ S.pendingFiles.push({name:f.name, type:f.type, dataUrl:rd.result}); paintPending(); };
      rd.readAsDataURL(f);
    });
    fileInp.value='';
  };
  if (params && params.loadChatId){ App.library.get('chat', params.loadChatId).then(c=>{ if(c){ S.msgs=c.messages||[]; S.chatId=c.id; S.title=c.title||S.title; paintTitle(); paintMsgs(); } }); }
  App.events.on('chat:openedWithText', onOpenedWithText);
  if (params && params.pickFile){ setTimeout(()=> $('#chat-attach', el).click(), 350); }
  paintMsgs();
  function paintTitle(){ const t=$('#chat-title', el); if(t) t.textContent = S.title; }
  function onOpenedWithText(d){ if(d && d.text && d.text.trim()) doSend(d.text.trim()); if(d && d.opts && d.opts.pickFile) setTimeout(()=> $('#chat-attach', el).click(), 350); }
  S._cleanup = ()=> App.events.off('chat:openedWithText', onOpenedWithText);
  function paintPending(){
    let bar = $('#pending-bar', el); if(!bar){ bar=document.createElement('div'); bar.id='pending-bar'; bar.style.cssText='display:flex;gap:8px;flex-wrap:wrap;padding:6px 2px'; el.querySelector('.chat-bar').before(bar); }
    bar.innerHTML = S.pendingFiles.map((f,i)=>'<span class="chip">📎 '+f.name.replace(/</g,'')+' <b data-x="'+i+'" style="cursor:pointer">✕</b></span>').join('');
    bar.querySelectorAll('[data-x]').forEach(x=> x.onclick=()=>{ S.pendingFiles.splice(+x.dataset.x,1); paintPending(); });
  }
  function addMsg(role, text, attachments){
    S.msgs.push({role, text, attachments:attachments||[]}); paintMsgs(); return S.msgs[S.msgs.length-1];
  }
  function paintMsgs(){
    const box = $('#chat-msgs', el); box.innerHTML='';
    if(!S.msgs.length){ box.innerHTML='<div class="chat-empty">👋 '+(hi?'कुछ भी पूछें — PDF, जानकारी, कोड, खबर...':'Ask anything — PDFs, info, code, news...')+'</div>'; return; }
    S.msgs.forEach((m,idx)=>{
      const d=document.createElement('div'); d.className='msg '+m.role+(m.streaming?' streaming':'');
      let inner='';
      (m.attachments||[]).forEach(a=>{ if(a.type.startsWith('image/')) inner+='<img class="attach" src="'+a.dataUrl+'" alt="attachment">'; else inner+='<div class="hint">📎 '+a.name.replace(/</g,'')+'</div>'; });
      inner += m.role==='user' ? md(m.text) : md(m.text);
      if(m.role==='ai' && !m.streaming) inner += '<div class="meta"><button data-cp="'+idx+'">📋 '+(hi?'कॉपी':'Copy')+'</button><button data-rg="'+idx+'">🔁 '+(hi?'फिर से':'Regenerate')+'</button></div>';
      d.innerHTML = inner; box.appendChild(d);
    });
    box.querySelectorAll('[data-cp]').forEach(b=> b.onclick=()=>{ const m=S.msgs[+b.dataset.cp]; navigator.clipboard.writeText(m.text).then(()=>App.toast(hi?'कॉपी हो गया':'Copied')); });
    box.querySelectorAll('[data-rg]').forEach(b=> b.onclick=()=> regenerate());
    box.scrollTop = box.scrollHeight;
  }
  function regenerate(){
    let lastUser=-1; S.msgs.forEach((m,i)=>{ if(m.role==='user') lastUser=i; });
    if(lastUser<0) return; S.msgs = S.msgs.slice(0,lastUser+1); paintMsgs(); streamReply();
  }
  function doSend(presetText){
    const text = (presetText!=null?presetText:input.value).trim();
    if(!text && !S.pendingFiles.length) return;
    if(S.streaming) return;
    if(!hasAnyKey()){
      addMsg('ai', hi
        ? '🔑 **API key नहीं मिली।**\n\nचैट के लिए Settings में अपनी Gemini key डालें (aistudio.google.com से free मिलती है)। Key सिर्फ आपके फोन के localStorage में रहती है — कहीं भेजी नहीं जाती।\n\nSettings खोली जा रही है...'
        : '🔑 **No API key found.**\n\nAdd your Gemini key in Settings (free from aistudio.google.com). Keys stay in your phone\'s localStorage only.\n\nOpening Settings...');
      setTimeout(()=>App.show('settings'), 900); return;
    }
    const atts = S.pendingFiles.slice(); S.pendingFiles=[]; const pb=$('#pending-bar',el); if(pb) pb.innerHTML='';
    if(!presetText){ input.value=''; input.style.height='auto'; }
    if(S.msgs.length===0) S.title = text.slice(0,42) || (hi?'नई चैट':'New chat');
    addMsg('user', text, atts); paintTitle(); streamReply();
    App.events.emit('chat:send', {text, model:App.state.model, attachments:atts.map(a=>({name:a.name,type:a.type}))});
  }
  async function streamReply(){
    const box = $('#chat-msgs', el);
    const aiMsg = {role:'ai', text:'', streaming:true}; S.msgs.push(aiMsg);
    S.streaming = true; $('#chat-stop', el).classList.remove('hidden'); $('#chat-send', el).classList.add('hidden');
    const ctrl = new AbortController(); S.abort = ctrl;
    const sysExtra = App.memory.getSystemAddition();
    const sys = (hi?'तुम AI Everything Workspace के सहायक हो। जवाब मुख्यतः हिंदी में दो, जब तक user English न मांगे।':'You are the AI Everything Workspace assistant. Answer mainly in Hindi unless the user asks in English.')
      + (sysExtra?'\n'+sysExtra:'');
    const apiMsgs = [{role:'system', content:sys}];
    S.msgs.filter(m=>!m.streaming).forEach(m=>{
      if(m.role==='user' && m.attachments && m.attachments.length){
        const parts=[{type:'text', text:m.text||''}];
        m.attachments.forEach(a=>{ if(a.type.startsWith('image/')) parts.push({type:'image_url', image_url:{url:a.dataUrl}}); });
        apiMsgs.push({role:'user', content:parts});
      } else apiMsgs.push({role:m.role, content:m.text});
    });
    const bubble = document.createElement('div'); bubble.className='msg ai streaming'; box.appendChild(bubble); box.scrollTop=box.scrollHeight;
    try{
      const res = await fetch('/api/chat', {method:'POST', signal:ctrl.signal,
        headers:{'Content-Type':'application/json','x-ai-keys':App.getKeysHeader()},
        body: JSON.stringify({messages:apiMsgs, model:App.state.model})});
      if(!res.ok){ const t2 = await res.text().catch(()=> ''); throw new Error('Server error '+res.status+(t2?' — '+t2.slice(0,120):'')); }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf='';
      const paint = ()=>{ bubble.innerHTML = md(aiMsg.text||' '); box.scrollTop=box.scrollHeight; };
      while(true){
        const {done, value} = await reader.read(); if(done) break;
        buf += dec.decode(value, {stream:true});
        const lines = buf.split('\n'); buf = lines.pop();
        for(const ln of lines){
          const line = ln.trim(); if(!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim(); if(payload==='[DONE]') continue;
          try{ const j = JSON.parse(payload);
            if(j.error) throw new Error(j.error);
            // Server SSE shapes: Gemini passthrough + Llama pipe both emit
            // {candidates:[{content:{parts:[{text}]}}]}; delta/text/choices kept for safety.
            let delta = j.delta!=null?j.delta : j.text!=null?j.text : (j.choices&&j.choices[0]&&j.choices[0].delta&&j.choices[0].delta.content)||'';
            if(!delta && j.candidates && j.candidates[0] && j.candidates[0].content && Array.isArray(j.candidates[0].content.parts))
              delta = j.candidates[0].content.parts.map(p=>p.text||'').join('');
            if(delta){ aiMsg.text += delta; paint(); }
          }catch(e){ if(e.message && !e.message.startsWith('Unexpected')) throw e; }
        }
      }
    }catch(e){
      if(e.name==='AbortError'){ aiMsg.text += '\n\n⏹ '+(hi?'रोक दिया गया।':'Stopped.'); }
      else aiMsg.text = '⚠️ '+(hi?'जवाब नहीं आ पाया: ':'Could not get a reply: ')+e.message+(hi?'\n\nKey/quota जांचें — Settings में key सही है क्या?':'\n\nCheck your key/quota in Settings.');
    }
    aiMsg.streaming=false; S.streaming=false; S.abort=null;
    $('#chat-stop', el).classList.add('hidden'); $('#chat-send', el).classList.remove('hidden');
    paintMsgs(); persistChat();
  }
  async function persistChat(){
    const clean = S.msgs.filter(m=>!m.streaming).map(m=>({role:m.role, text:m.text,
      attachments:(m.attachments||[]).map(a=> a.dataUrl&&a.dataUrl.length>300000 ? {name:a.name,type:a.type,dataUrl:'',note:'image too large — omitted'} : a)}));
    const item = {id:S.chatId||undefined, title:S.title, messages:clean, savedAt:Date.now()};
    S.chatId = await App.library.save('chat', item);
  }
}
function onShow(){}
function onHide(){ if(S && S._cleanup) S._cleanup(); if(S && S.abort) S.abort.abort(); }
App.registerView('chat', {title:'Chat', icon:'💬', render, onShow, onHide});
})();

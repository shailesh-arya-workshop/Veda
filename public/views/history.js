/* AI Everything Workspace — HISTORY view (pin/archive/search/new) */
(function(){
let q='';
function render(el){
  const hi = App.state.lang==='hi';
  el.innerHTML =
    '<h2 class="section-title">🕘 '+App.t('history')+'</h2>'+
    '<div class="hist-tools">'+
      '<input id="hist-q" placeholder="'+(hi?'चैट खोजें...':'Search chats...')+'" value="'+q.replace(/"/g,'&quot;')+'">'+
      '<button class="btn primary small" id="hist-new">＋ '+(hi?'नई चैट':'New chat')+'</button>'+
    '</div>'+
    '<div id="hist-list"><div class="hint">'+(hi?'लोड हो रहा है...':'Loading...')+'</div></div>';
  const inp=el.querySelector('#hist-q');
  inp.addEventListener('input', ()=>{ q=inp.value; clearTimeout(inp._t); inp._t=setTimeout(()=>paint(el),300); });
  el.querySelector('#hist-new').onclick=()=>App.show('chat');
  paint(el);
}
async function paint(el){
  const hi = App.state.lang==='hi';
  const list=el.querySelector('#hist-list');
  const chats = (await App.library.getAll('chat')).filter(c=>!c.archived && (!q || (c.title||'').toLowerCase().includes(q.toLowerCase())));
  const pinned = chats.filter(c=>c.pinned), rest = chats.filter(c=>!c.pinned);
  const archived = (await App.library.getAll('chat')).filter(c=>c.archived);
  if(!chats.length){ list.innerHTML='<div class="hint">'+(hi?'कोई चैट हिस्ट्री नहीं।':'No chat history.')+'</div>'; return; }
  list.innerHTML='';
  const row = c=>{
    const d=document.createElement('div'); d.className='hist-item';
    d.innerHTML='<span>'+(c.pinned?'📌':'💬')+'</span><span class="tt">'+String(c.title||'(untitled)').replace(/</g,'&lt;')+'</span><span class="dt">'+new Date(c.savedAt||Date.now()).toLocaleString()+'</span><span class="acts" style="display:flex;gap:6px"></span>';
    const acts=d.querySelector('.acts');
    const mk=(label,fn)=>{ const b=document.createElement('button'); b.className='btn small ghost'; b.textContent=label; b.onclick=e=>{e.stopPropagation();fn();}; acts.appendChild(b); };
    mk(c.pinned?'📍':'📌', ()=>App.library.pin('chat',c.id,!c.pinned).then(()=>paint(el)));
    mk('🗄', ()=>App.library.archive('chat',c.id,true).then(()=>paint(el)));
    mk('🗑', ()=>{ if(confirm(hi?'डिलीट करें?':'Delete?')) App.library.remove('chat',c.id).then(()=>paint(el)); });
    d.onclick=()=>App.show('chat',{loadChatId:c.id});
    return d;
  };
  pinned.forEach(c=>list.appendChild(row(c)));
  rest.forEach(c=>list.appendChild(row(c)));
  if(archived.length){
    const h=document.createElement('div'); h.className='section-title'; h.style.fontSize='15px'; h.textContent='🗄 '+(hi?'आर्काइव्ड':'Archived');
    list.appendChild(h);
    archived.forEach(c=>{
      const d=document.createElement('div'); d.className='hist-item'; d.style.opacity='.65';
      d.innerHTML='<span>🗄</span><span class="tt">'+String(c.title||'(untitled)').replace(/</g,'&lt;')+'</span><span class="acts" style="display:flex;gap:6px"></span>';
      const acts=d.querySelector('.acts');
      const mk=(label,fn)=>{ const b=document.createElement('button'); b.className='btn small ghost'; b.textContent=label; b.onclick=e=>{e.stopPropagation();fn();}; acts.appendChild(b); };
      mk(hi?'वापस लाएं':'Restore', ()=>App.library.archive('chat',c.id,false).then(()=>paint(el)));
      mk('🗑', ()=>{ if(confirm(hi?'डिलीट करें?':'Delete?')) App.library.remove('chat',c.id).then(()=>paint(el)); });
      d.onclick=()=>App.show('chat',{loadChatId:c.id});
      list.appendChild(d);
    });
  }
}
App.registerView('history', {title:'History', icon:'🕘', render});
})();

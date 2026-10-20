/* AI Everything Workspace — LIBRARY view (saved chats, PDFs, images) */
(function(){
let tab='chat';
function render(el){
  const hi = App.state.lang==='hi';
  el.innerHTML =
    '<h2 class="section-title">📚 '+App.t('library')+'</h2>'+
    '<div class="lib-tabs" id="lib-tabs"></div>'+
    '<div id="lib-list"><div class="hint">'+(hi?'लोड हो रहा है...':'Loading...')+'</div></div>';
  const tabs=[['chat',hi?'💬 चैट':'💬 Chats'],['pdf',hi?'📄 PDFs':'📄 PDFs'],['image',hi?'🖼️ इमेज':'🖼️ Images']];
  const tb=el.querySelector('#lib-tabs');
  tabs.forEach(x=>{ const b=document.createElement('button'); b.className='chip'+(x[0]===tab?'':' ');
    if(x[0]===tab){ b.style.borderColor='var(--gold)'; }
    b.textContent=x[1]; b.onclick=()=>{ tab=x[0]; render(el); }; tb.appendChild(b); });
  load(el);
}
async function load(el){
  const hi = App.state.lang==='hi';
  const list = el.querySelector('#lib-list');
  const items = await App.library.getAll(tab);
  if(!items.length){ list.innerHTML='<div class="hint">'+(hi?'यहाँ अभी कुछ नहीं है।':'Nothing saved here yet.')+'</div>'; return; }
  list.innerHTML='';
  items.forEach(it=>{
    const d=document.createElement('div'); d.className='lib-item';
    const icon = tab==='chat'?'💬':tab==='pdf'?'📄':'🖼️';
    const name = it.title||it.name||'(untitled)';
    const meta = new Date(it.savedAt||Date.now()).toLocaleString()+(it.size?' • '+Math.round(it.size/1024)+' KB':'');
    d.innerHTML='<div class="ic">'+icon+'</div><div class="info"><div class="nm">'+String(name).replace(/</g,'&lt;')+'</div><div class="mt">'+meta+'</div></div><div class="acts"></div>';
    const acts=d.querySelector('.acts');
    const mk=(label,fn,cls)=>{ const b=document.createElement('button'); b.className='btn small'+(cls?' '+cls:''); b.textContent=label; b.onclick=e=>{e.stopPropagation();fn();}; acts.appendChild(b); };
    if(tab==='chat'){ mk(hi?'खोलें':'Open',()=>App.show('chat',{loadChatId:it.id})); }
    else{
      mk(hi?'व्यू':'View',()=>viewFile(it));
      mk(hi?'डाउनलोड':'Download',()=>downloadFile(it));
    }
    mk('🗑',()=>{ if(confirm(hi?'डिलीट करें?':'Delete?')) App.library.remove(tab,it.id).then(()=>render(el)); },'danger');
    if(tab==='chat') d.onclick=()=>App.show('chat',{loadChatId:it.id});
    list.appendChild(d);
  });
  function viewFile(it){
    if(tab==='pdf' && it.blob){
      it.blob.arrayBuffer().then(buf=>{ App.setCurrentPdf(new Uint8Array(buf), it.name); App.toast(App.t('pdfPreview')+' ✓'); });
    } else if(tab==='image' && it.blob){
      const url=URL.createObjectURL(it.blob);
      App.dialog({title:it.name||'Image', html:'<img src="'+url+'" style="max-width:100%;border-radius:10px">', buttons:[{label:'OK',primary:true}]});
    } else App.toast(hi?'फाइल डेटा उपलब्ध नहीं':'File data unavailable');
  }
  function downloadFile(it){
    if(!it.blob){ App.toast(hi?'फाइल डेटा उपलब्ध नहीं':'File data unavailable'); return; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(it.blob); a.download=it.name||'file'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }
}
App.registerView('library', {title:'Library', icon:'📚', render});
})();

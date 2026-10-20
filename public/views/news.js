/* AI Everything Workspace — NEWS view (calls /api/news, graceful fallback) */
(function(){
const CATS = [
  {id:'top', hi:'मुख्य खबरें', en:'Top'},
  {id:'india', hi:'भारत', en:'India'},
  {id:'world', hi:'दुनिया', en:'World'},
  {id:'tech', hi:'टेक्नोलॉजी', en:'Tech'},
  {id:'sports', hi:'खेल', en:'Sports'},
  {id:'education', hi:'शिक्षा', en:'Education'},
];
let cat='top';
function render(el){
  const hi = App.state.lang==='hi';
  el.innerHTML =
    '<h2 class="section-title">📰 '+App.t('news')+' <span class="live-dot" style="display:inline-block"></span></h2>'+
    '<div class="news-cats" id="news-cats"></div>'+
    '<div id="news-list"><div class="hint">'+(hi?'खबरें लोड हो रही हैं...':'Loading news...')+'</div></div>';
  const box = el.querySelector('#news-cats');
  CATS.forEach(c=>{ const b=document.createElement('button'); b.className='chip'+(c.id===cat?'':' ');
    if(c.id===cat){ b.style.borderColor='var(--gold)'; b.style.boxShadow='0 0 10px rgba(212,175,55,.35)'; }
    b.textContent = hi?c.hi:c.en;
    b.onclick=()=>{ cat=c.id; render(el); }; box.appendChild(b); });
  load(el);
}
async function load(el){
  const hi = App.state.lang==='hi';
  const list = el.querySelector('#news-list');
  try{
    const res = await fetch('/api/news?cat='+encodeURIComponent(cat)+'&lang='+(hi?'hi':'en'));
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    const items = data.items || data.articles || data.news || [];
    if(!items.length){ list.innerHTML='<div class="hint">'+(hi?'अभी कोई खबर नहीं मिली। बाद में फिर कोशिश करें।':'No news right now. Try again later.')+'</div>'; return; }
    list.innerHTML='';
    items.slice(0,30).forEach(n=>{
      const d=document.createElement('div'); d.className='news-card';
      const title = n.title||n.headline||'', src = n.source||n.site||'', dt = n.publishedAt||n.time||n.date||'', url=n.url||n.link||'';
      d.innerHTML='<h4>'+title.replace(/</g,'&lt;')+'</h4><div><span class="src">'+String(src).replace(/</g,'&lt;')+'</span><span class="dt">'+String(dt).replace(/</g,'&lt;')+'</span></div>'+(n.summary?'<div class="hint" style="margin-top:6px">'+String(n.summary).replace(/</g,'&lt;')+'</div>':'');
      if(url) d.onclick=()=>window.open(url,'_blank','noopener');
      list.appendChild(d);
    });
  }catch(e){
    list.innerHTML='<div class="card" style="padding:20px"><b>⚠️ '+(hi?'खबरें लोड नहीं हो पाईं':'Could not load news')+'</b><div class="hint" style="margin-top:8px">'+(hi?'Server se jawab nahi aaya — internet aur server check karo.':'No response from the server — check your internet and server.')+': '+String(e.message).replace(/</g,'&lt;')+'</div><button class="btn small" style="margin-top:10px" id="news-retry">🔁 '+(hi?'फिर कोशिश करें':'Retry')+'</button></div>';
    const r=el.querySelector('#news-retry'); if(r) r.onclick=()=>load(el);
  }
}
App.registerView('news', {title:'News', icon:'📰', render});
})();

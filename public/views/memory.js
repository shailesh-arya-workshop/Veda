/* AI Everything Workspace — MEMORY view (instructions + remembered facts) */
(function(){
function render(el, params){
  const hi = App.state.lang==='hi';
  el.innerHTML =
    '<h2 class="section-title">🧠 '+App.t('memory')+'</h2>'+
    '<div class="mem-card" id="instr-card">'+
      '<h3 style="margin-bottom:8px">📋 '+(hi?'मेरे निर्देश (Personal Instructions)':'My Instructions')+'</h3>'+
      '<div class="hint" style="margin-bottom:10px">'+(hi?'ये निर्देश हर चैट में AI को भेजे जाते हैं। उदाहरण: "हमेशा आसान हिंदी में समझाओ", "जवाब छोटे रखो", "मैं कक्षा 8 का छात्र हूँ"।':'These instructions go to the AI in every chat. E.g. "Explain in simple Hindi", "Keep answers short", "I am a Class 8 student".')+'</div>'+
      '<textarea id="mem-instr" rows="4" placeholder="'+(hi?'यहाँ अपने निर्देश लिखें...':'Write your instructions here...')+'"></textarea>'+
      '<div style="margin-top:10px"><button class="btn primary small" id="mem-save-instr">💾 '+(hi?'सेव करें':'Save')+'</button></div>'+
    '</div>'+
    '<div class="mem-card">'+
      '<h3 style="margin-bottom:8px">💡 '+(hi?'याद की गई बातें (Remembered Facts)':'Remembered Facts')+'</h3>'+
      '<div class="hint" style="margin-bottom:12px">'+(hi?'चैट में "याद रखो कि..." कहने पर या यहाँ लिखने पर AI इन बातों को याद रखता है। ये बातें चैट system prompt में जुड़ती हैं।':'Add facts here or say "remember that..." in chat. They are injected into the chat system prompt.')+'</div>'+
      '<div id="mem-facts"></div>'+
      '<div class="row"><input id="mem-new-fact" placeholder="'+(hi?'नई बात लिखें... जैसे: मुझे क्रिकेट पसंद है':'New fact... e.g. I like cricket')+'"><button class="btn primary small" id="mem-add">＋ '+(hi?'जोड़ें':'Add')+'</button></div>'+
    '</div>'+
    '<div class="hint">'+(hi?'सब कुछ सिर्फ आपके ब्राउज़र के localStorage में रहता है — किसी server पर नहीं जाता (चैट के समय सिर्फ context के रूप में AI को मिलता है)।':'Everything stays in your browser\'s localStorage — never sent to any server (only passed to the AI as context when chatting).')+'</div>';
  const ta = el.querySelector('#mem-instr');
  ta.value = App.memory.getInstructions();
  el.querySelector('#mem-save-instr').onclick = ()=>{ App.memory.setInstructions(ta.value); App.toast('💾 '+(hi?'निर्देश सेव हो गए':'Instructions saved')); App.notify('🧠 Memory update', hi?'निर्देश सेव हो गए':'Instructions saved'); };
  const paintFacts = ()=>{
    const facts = App.memory.getFacts(); const box = el.querySelector('#mem-facts');
    box.innerHTML = facts.length ? '' : '<div class="hint" style="margin-bottom:10px">'+(hi?'अभी कोई बात याद नहीं है।':'No facts remembered yet.')+'</div>';
    facts.forEach((f,i)=>{ const r=document.createElement('div'); r.className='fact-row';
      r.innerHTML='<span>💡</span><span>'+String(f).replace(/</g,'&lt;')+'</span>';
      const x=document.createElement('button'); x.textContent='✕'; x.title='Remove';
      x.onclick=()=>{ App.memory.removeFact(i); paintFacts(); }; r.appendChild(x); box.appendChild(r); });
  };
  paintFacts();
  const add=()=>{ const v=el.querySelector('#mem-new-fact').value.trim(); if(!v) return;
    App.memory.addFact(v); el.querySelector('#mem-new-fact').value=''; paintFacts(); App.toast('🧠 '+(hi?'याद कर लिया':'Remembered')); };
  el.querySelector('#mem-add').onclick=add;
  el.querySelector('#mem-new-fact').onkeydown=e=>{ if(e.key==='Enter') add(); };
  if (params && params.section==='instructions'){ setTimeout(()=> ta.focus(), 300); ta.scrollIntoView({behavior:'smooth'}); }
}
App.registerView('memory', {title:'Memory', icon:'🧠', render});
})();

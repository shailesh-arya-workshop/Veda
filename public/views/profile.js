/* AI Everything Workspace — PROFILE / SUBSCRIPTION view */
(function(){
function render(el, params){
  const hi = App.state.lang==='hi';
  el.innerHTML =
    '<h2 class="section-title">👤 '+App.t('profile')+'</h2>'+
    '<div class="set-card">'+
      '<div class="profile-top">'+
        '<div class="avatar big" id="pf-avatar">S</div>'+
        '<div><h3 id="pf-name" style="color:var(--text);font-size:20px">Shailesh Arya</h3>'+
        '<span class="badge-premium">👑 PRO PLAN</span></div>'+
      '</div>'+
      '<div class="set-row"><label>'+(hi?'नाम (ऐप में दिखेगा)':'Name (shown in app)')+'</label>'+
      '<input id="pf-name-input" maxlength="40"></div>'+
      '<button class="btn primary small" id="pf-save">💾 '+(hi?'सेव करें':'Save')+'</button>'+
    '</div>'+
    '<div class="set-card" id="plan-card">'+
      '<h3>⭐ '+(hi?'सब्सक्रिप्शन':'Subscription')+'</h3>'+
      '<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px">'+
        '<div><b>👑 Pro Plan</b><div class="hint">'+(hi?'सभी फीचर्स अनलॉक':'All features unlocked')+'</div></div>'+
        '<button class="btn" id="pf-upgrade">⬆️ '+(hi?'अपग्रेड':'Upgrade')+'</button>'+
      '</div>'+
      '<div class="plan-note">ℹ️ '+(hi
        ? 'ईमानदार जानकारी: यह प्लान बैज सिर्फ local demo info है — <b>कोई payment नहीं, कोई असली subscription नहीं</b>। ऐप पूरी तरह free चलता है। "अपग्रेड" बटन सिर्फ यही जानकारी दिखाता है, कोई checkout नहीं खोलता।'
        : 'Honest note: this plan badge is only local demo info — <b>no payment, no real subscription</b>. The app runs fully free. The "Upgrade" button shows only this info, no checkout.')+'</div>'+
    '</div>'+
    '<div class="set-card"><h3>📊 '+(hi?'मेरा डेटा':'My Data')+'</h3>'+
      '<div class="hint" id="pf-stats">'+(hi?'गिनती हो रही है...':'Counting...')+'</div></div>';
  const nm = el.querySelector('#pf-name-input');
  nm.value = App.state.profileName||'Shailesh Arya';
  const paintName=()=>{ const n=App.state.profileName||'Shailesh Arya';
    el.querySelector('#pf-name').textContent=n; el.querySelector('#pf-avatar').textContent=n.trim().charAt(0).toUpperCase(); };
  paintName();
  el.querySelector('#pf-save').onclick=()=>{
    App.state.profileName = nm.value.trim()||'Shailesh Arya'; App.saveState(); paintName();
    // update topbar chip without full re-render
    document.querySelector('#profile-name').textContent = App.state.profileName;
    document.querySelector('#profile-avatar').textContent = App.state.profileName.trim().charAt(0).toUpperCase();
    App.toast('💾 '+(hi?'नाम सेव हो गया':'Name saved')); App.notify('👤 Profile', hi?'नाम अपडेट हो गया':'Name updated');
  };
  el.querySelector('#pf-upgrade').onclick=()=>{
    App.dialog({title:'⬆️ '+(hi?'अपग्रेड':'Upgrade'), html:
      '<p class="hint" style="font-size:14px;line-height:1.7">'+(hi
      ? 'यहाँ कोई असली अपग्रेड नहीं है — आप पहले से ही <b>Pro Plan</b> पर हैं और ऐप की सारी सुविधाएं free हैं। कोई payment page, कोई checkout, कोई hidden charge नहीं। By Shailesh Arya Developer ✦'
      : 'There is nothing real to upgrade to — you are already on <b>Pro Plan</b> and every feature is free. No payment page, no checkout, no hidden charges. By Shailesh Arya Developer ✦')+'</p>',
      buttons:[{label:'👍 OK', primary:true}]});
  };
  Promise.all([App.library.getAll('chat'),App.library.getAll('pdf'),App.library.getAll('image')]).then(r=>{
    el.querySelector('#pf-stats').innerHTML = (hi?'💬 चैट: <b>'+r[0].length+'</b> &nbsp;•&nbsp; 📄 PDF: <b>'+r[1].length+'</b> &nbsp;•&nbsp; 🖼️ इमेज: <b>'+r[2].length+'</b>':'💬 Chats: <b>'+r[0].length+'</b> &nbsp;•&nbsp; 📄 PDFs: <b>'+r[1].length+'</b> &nbsp;•&nbsp; 🖼️ Images: <b>'+r[2].length+'</b>');
  }).catch(()=>{ try{ el.querySelector('#pf-stats').textContent = hi?'—':'—'; }catch(e){} });
  if (params && params.section==='plan'){ setTimeout(()=> el.querySelector('#plan-card').scrollIntoView({behavior:'smooth'}), 250); }
}
App.registerView('profile', {title:'Profile', icon:'👤', render});
})();

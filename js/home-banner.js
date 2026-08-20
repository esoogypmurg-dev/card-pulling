/* ===== Home Countdown Banner ===== */
const HB_STORAGE_KEY='pokemonHomeCountdownBanner';
let homeCountdownBanner=null, hbTimer=null;
function hbLocalDateValue(v){if(!v)return '';const d=new Date(v);if(!isFinite(d.getTime()))return '';const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())}
function hbParseLocal(v){if(!v)return null;const d=new Date(v);return isFinite(d.getTime())?d.toISOString():null}
function hbSaveLocal(){try{localStorage.setItem(HB_STORAGE_KEY,JSON.stringify(homeCountdownBanner||null))}catch(e){}}
function hbLoadLocal(){try{const r=localStorage.getItem(HB_STORAGE_KEY);homeCountdownBanner=r?JSON.parse(r):null}catch(e){homeCountdownBanner=null}}
async function hbLoadCloud(){
  if(!sb)return;
  try{
    const {data,error}=await sb.from('home_banners').select('*').eq('id','home').maybeSingle();
    if(error)throw error;
    if(data){homeCountdownBanner={id:'home',title:data.title||'',kicker:data.kicker||'COMING SOON',message:data.message||'',target_at:data.target_at,expires_at:data.expires_at,accent:data.accent||'gold',button_text:data.button_text||'',button_link:data.button_link||'',enabled:data.enabled!==false};hbSaveLocal()}
  }catch(e){console.warn('[home-banner] cloud load skipped',e.message||e)}
}
async function hbSaveCloud(){
  if(!sb||!currentUser||!currentUser.is_admin||!homeCountdownBanner)return false;
  try{const {error}=await sb.from('home_banners').upsert({...homeCountdownBanner,id:'home',updated_at:new Date().toISOString()});if(error)throw error;return true}
  catch(e){console.warn('[home-banner] cloud save skipped',e.message||e);return false}
}
async function initHomeBanner(){hbLoadLocal();await hbLoadCloud();hbRender();if(!hbTimer)hbTimer=setInterval(hbRender,1000)}
function hbRemaining(target){
  const diff=new Date(target).getTime()-Date.now();if(!isFinite(diff))return null;
  const t=Math.max(0,Math.floor(diff/1000));return{total:t,days:Math.floor(t/86400),hours:Math.floor(t%86400/3600),minutes:Math.floor(t%3600/60),seconds:t%60}
}
function hbRender(){
  const box=document.getElementById('home-countdown-banner');if(!box)return;
  const b=homeCountdownBanner;if(!b||b.enabled===false||!b.target_at){box.style.display='none';return}
  const now=Date.now(),target=new Date(b.target_at).getTime(),expires=b.expires_at?new Date(b.expires_at).getTime():Infinity;
  if(!isFinite(target)||(isFinite(expires)&&now>=expires)){box.style.display='none';return}
  box.style.display='';box.className='home-countdown-banner hcb-'+(b.accent||'gold');
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('hcb-kicker',b.kicker||'COMING SOON');set('hcb-title',b.title||'Something is coming...');set('hcb-message',b.message||'');
  const r=hbRemaining(b.target_at);set('hcb-days',String(r.days).padStart(2,'0'));set('hcb-hours',String(r.hours).padStart(2,'0'));set('hcb-minutes',String(r.minutes).padStart(2,'0'));set('hcb-seconds',String(r.seconds).padStart(2,'0'));
  const btn=document.getElementById('hcb-button'),txt=(b.button_text||'').trim(),link=(b.button_link||'').trim();
  if(btn&&txt&&link){btn.style.display='';btn.textContent=txt;if(link.startsWith('#')){btn.href='#';btn.target='';btn.onclick=e=>{e.preventDefault();if(typeof navGo==='function')navGo(link.slice(1))}}else{btn.href=link;btn.target='_blank';btn.rel='noopener noreferrer';btn.onclick=null}}
  else if(btn)btn.style.display='none';
  if(r.total<=0){set('hcb-kicker',b.kicker||'NOW LIVE');set('hcb-days','00');set('hcb-hours','00');set('hcb-minutes','00');set('hcb-seconds','00')}
}
function hbFillAdmin(){
  const b=homeCountdownBanner||{},set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??''};
  set('hb-title',b.title||'');set('hb-kicker',b.kicker||'COMING SOON');set('hb-message',b.message||'');set('hb-target',hbLocalDateValue(b.target_at));set('hb-expires',hbLocalDateValue(b.expires_at));set('hb-accent',b.accent||'gold');set('hb-button-text',b.button_text||'');set('hb-button-link',b.button_link||'');
  const en=document.getElementById('hb-enabled');if(en)en.checked=b.enabled!==false;
}
function hbAdminLoad(){hbFillAdmin();const m=document.getElementById('hb-admin-msg');if(m)m.textContent=homeCountdownBanner?'Saved banner loaded.':'No banner saved yet.'}
async function hbAdminSave(){
  if(!currentUser?.is_admin){const m=document.getElementById('hb-admin-msg');if(m)m.textContent='Admin only';return}
  const target=hbParseLocal((document.getElementById('hb-target')||{}).value),expires=hbParseLocal((document.getElementById('hb-expires')||{}).value),m=document.getElementById('hb-admin-msg');
  if(!target){if(m){m.textContent='Choose a countdown date and time.';m.style.color='#f87171'}return}
  if(expires&&new Date(expires)<=new Date(target)){if(m){m.textContent='End / hide date must be after the countdown date.';m.style.color='#f87171'}return}
  homeCountdownBanner={id:'home',title:((document.getElementById('hb-title')||{}).value||'').trim(),kicker:((document.getElementById('hb-kicker')||{}).value||'COMING SOON').trim(),message:((document.getElementById('hb-message')||{}).value||'').trim(),target_at:target,expires_at:expires,accent:(document.getElementById('hb-accent')||{}).value||'gold',button_text:((document.getElementById('hb-button-text')||{}).value||'').trim(),button_link:((document.getElementById('hb-button-link')||{}).value||'').trim(),enabled:(document.getElementById('hb-enabled')||{}).checked!==false};
  hbSaveLocal();const cloud=await hbSaveCloud();hbRender();
  if(m){m.textContent=cloud?'✓ Banner published to the cloud.':'✓ Banner saved on this device. Add the SQL table to enable cloud sync.';m.style.color='#4ade80'}
}
async function hbAdminDisable(){
  if(!homeCountdownBanner)hbLoadLocal();if(!homeCountdownBanner)homeCountdownBanner={id:'home'};homeCountdownBanner.enabled=false;hbSaveLocal();const cloud=await hbSaveCloud();hbRender();
  const m=document.getElementById('hb-admin-msg');if(m){m.textContent=cloud?'Banner hidden for everyone.':'Banner hidden on this device.';m.style.color='#fbbf24'}
}

async function hbAdminDelete(){
  if(!currentUser?.is_admin)return;
  homeCountdownBanner=null;
  try{localStorage.removeItem(HB_STORAGE_KEY)}catch(e){}
  try{if(sb){await sb.from('home_banners').delete().eq('id','home')}}catch(e){console.warn(e)}
  hbRender();
  const m=document.getElementById('hb-admin-msg');
  if(m){m.textContent='Banner deleted.';m.style.color='#f87171'}
}

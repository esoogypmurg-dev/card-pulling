/* ===== App update notices (admin-published) ===== */
async function adminPublishUpdate(){
  const ver = ((document.getElementById('upd-version')||{}).value||'').trim();
  const title = ((document.getElementById('upd-title')||{}).value||'').trim() || "What's new";
  const body = ((document.getElementById('upd-body')||{}).value||'').trim();
  const msg = document.getElementById('upd-admin-msg');
  if(!ver || !body){ if(msg){ msg.textContent='Version and message required'; msg.style.color='#f87171'; } return; }
  if(!sb){ if(msg){ msg.textContent='Not connected'; msg.style.color='#f87171'; } return; }
  try{
    const notice = { version: ver, title: title, body: body, at: new Date().toISOString() };
    const { error } = await sb.from('shop_settings').upsert({
      id: 1,
      app_notice: notice,
      updated_at: new Date().toISOString()
    });
    if(error) throw error;
    if(msg){ msg.textContent='Published v'+ver+' — players will see it on next check'; msg.style.color='#4ade80'; }
    showToast('Update notice published');
  }catch(e){
    console.error(e);
    if(msg){ msg.textContent=e.message||'Failed — run SQL for app_notice column'; msg.style.color='#f87171'; }
  }
}
async function adminClearUpdate(){
  if(!sb) return;
  try{
    await sb.from('shop_settings').upsert({ id: 1, app_notice: null, updated_at: new Date().toISOString() });
    const msg = document.getElementById('upd-admin-msg');
    if(msg){ msg.textContent='Notice cleared'; msg.style.color='#4ade80'; }
    showToast('Update notice cleared');
  }catch(e){ showToast(e.message||'Failed'); }
}
async function checkAppAnnouncement(){
  if(!sb) return;
  try{
    const { data, error } = await sb.from('shop_settings').select('app_notice').eq('id', 1).maybeSingle();
    if(error) throw error;
    const notice = data && data.app_notice;
    if(!notice || !notice.version || !notice.body) return;
    const seen = localStorage.getItem('appNoticeSeenVersion');
    if(seen && String(seen) === String(notice.version)) return;
    showAppUpdateModal(notice);
  }catch(e){ console.warn('app notice', e); }
}
function showAppUpdateModal(notice){
  const modal = document.getElementById('app-update-modal');
  if(!modal || !notice) return;
  const v = document.getElementById('upd-modal-ver');
  const t = document.getElementById('upd-modal-title');
  const b = document.getElementById('upd-modal-body');
  if(v) v.textContent = 'Version ' + (notice.version||'');
  if(t) t.textContent = notice.title || "What's new";
  if(b) b.textContent = notice.body || '';
  modal.dataset.version = notice.version || '';
  modal.style.display = 'flex';
  modal.classList.add('open');
}
function dismissAppUpdate(){
  const modal = document.getElementById('app-update-modal');
  if(!modal) return;
  const ver = modal.dataset.version || '';
  if(ver) try{ localStorage.setItem('appNoticeSeenVersion', ver); }catch(_){}
  modal.style.display = 'none';
  modal.classList.remove('open');
}
let appConfigChannel = null;
function startAppConfigWatcher(){
  if(!sb || !currentUser) return;
  try{ if(appConfigChannel) sb.removeChannel(appConfigChannel); }catch(_){}
  try{
    appConfigChannel = sb.channel('shop-settings-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shop_settings', filter: 'id=eq.1' }, (payload) => {
        const row = payload.new || {};
        if(Array.isArray(row.achievement_catalog) && row.achievement_catalog.length){
          achievementCatalog = row.achievement_catalog;
          try{ localStorage.setItem(ACH_STORAGE_KEY, JSON.stringify(achievementCatalog)); }catch(_){}
          if(typeof renderAchievements === 'function') renderAchievements();
        }
        if(row.app_notice && row.app_notice.version){
          const seen = localStorage.getItem('appNoticeSeenVersion');
          if(!seen || String(seen) !== String(row.app_notice.version)){
            showAppUpdateModal(row.app_notice);
          }
        }
      })
      .subscribe();
  }catch(e){ console.warn('config watcher', e); }
}


/* ===== Live flash announcements (online only, 5s) ===== */
const LIVE_FLASH_CH = 'live-flash-v1';
const LIVE_FLASH_MS = 5000;
let liveFlashChannel = null;
let liveFlashTimer = null;
let liveFlashTick = null;

function showLiveFlashAnnouncement(message, meta){
  const el = document.getElementById('live-flash-announcement');
  const textEl = document.getElementById('live-flash-text');
  const timerEl = document.getElementById('live-flash-timer');
  if(!el || !textEl) return;
  const msg = String(message || '').trim();
  if(!msg) return;
  textEl.textContent = msg;
  // Color class
  textEl.className = 'live-flash-text';
  const color = (meta && meta.color) ? String(meta.color) : 'gold';
  if(color && color !== 'white') textEl.classList.add('color-' + color);
  el.classList.add('show');
  if(liveFlashTimer) clearTimeout(liveFlashTimer);
  if(liveFlashTick) clearInterval(liveFlashTick);
  let left = Math.ceil(LIVE_FLASH_MS / 1000);
  if(timerEl) timerEl.textContent = 'Closing in ' + left + 's';
  liveFlashTick = setInterval(function(){
    left--;
    if(timerEl) timerEl.textContent = left > 0 ? ('Closing in ' + left + 's') : 'Closing…';
    if(left <= 0){
      clearInterval(liveFlashTick);
      liveFlashTick = null;
    }
  }, 1000);
  liveFlashTimer = setTimeout(function(){
    el.classList.remove('show');
    liveFlashTimer = null;
    if(liveFlashTick){ clearInterval(liveFlashTick); liveFlashTick = null; }
  }, LIVE_FLASH_MS);
}

function startLiveFlashWatcher(){
  if(!sb || !currentUser || liveFlashChannel) return;
  try{
    liveFlashChannel = sb.channel(LIVE_FLASH_CH, { config: { broadcast: { self: true } } });
    liveFlashChannel
      .on('broadcast', { event: 'flash' }, ({ payload }) => {
        if(!payload || !payload.message) return;
        showLiveFlashAnnouncement(payload.message, payload);
      })
      .subscribe();
  }catch(e){ console.warn('[live-flash] channel', e); }
}

async function adminSendLiveFlash(){
  const ta = document.getElementById('flash-msg');
  const colorEl = document.getElementById('flash-color');
  const msgEl = document.getElementById('flash-admin-msg');
  const message = ((ta && ta.value) || '').trim();
  const color = ((colorEl && colorEl.value) || 'gold');
  if(!message){
    if(msgEl){ msgEl.textContent = 'Enter a message'; msgEl.style.color = '#f87171'; }
    return;
  }
  if(!currentUser || !currentUser.is_admin){
    if(msgEl){ msgEl.textContent = 'Admin only'; msgEl.style.color = '#f87171'; }
    return;
  }
  if(!sb){
    if(msgEl){ msgEl.textContent = 'Not connected'; msgEl.style.color = '#f87171'; }
    return;
  }
  // Ensure channel is up
  if(!liveFlashChannel) startLiveFlashWatcher();
  const payload = {
    message: message.slice(0, 200),
    color: color,
    by: currentUser.display_name || currentUser.username || 'Admin',
    at: Date.now()
  };
  try{
    // Small delay if channel just created
    if(liveFlashChannel){
      await liveFlashChannel.send({ type: 'broadcast', event: 'flash', payload });
    }
    // Also show for admin immediately (self:true should, but guarantee)
    showLiveFlashAnnouncement(payload.message, payload);
    if(msgEl){ msgEl.textContent = 'Sent to online players'; msgEl.style.color = '#4ade80'; }
    showToast('Live flash sent');
  }catch(e){
    console.error(e);
    if(msgEl){ msgEl.textContent = e.message || 'Send failed'; msgEl.style.color = '#f87171'; }
  }
}


/* ===== Force refresh (admin-triggered, non-dismissible) ===== */
const FORCE_REFRESH_CH = 'force-refresh-v1';
let forceRefreshChannel = null;

function showForceRefreshModal(flagAt){
  const modal = document.getElementById('force-refresh-modal');
  if(!modal) return;
  if(flagAt) modal.dataset.flagAt = String(flagAt);
  modal.classList.add('show');
}

function applyForceRefresh(){
  try{
    const modal = document.getElementById('force-refresh-modal');
    const seenAt = modal && modal.dataset.flagAt;
    if(seenAt) localStorage.setItem('forceRefreshSeenAt', seenAt);
  }catch(_){}
  const url = new URL(location.href);
  url.searchParams.set('_v', String(Date.now()));
  location.replace(url.toString());
}

function startForceRefreshWatcher(){
  if(!sb || !currentUser || forceRefreshChannel) return;
  try{
    forceRefreshChannel = sb.channel(FORCE_REFRESH_CH, { config: { broadcast: { self: false } } });
    forceRefreshChannel
      .on('broadcast', { event: 'refresh' }, ({ payload }) => {
        showForceRefreshModal(payload && payload.at);
      })
      .subscribe();
  }catch(e){ console.warn('[force-refresh] channel', e); }
}

/* Catches players who were offline/backgrounded (e.g. iPad locked) when the
   broadcast went out — checked on login and whenever the tab regains focus. */
async function checkForceRefreshFlag(){
  if(!sb) return;
  try{
    const { data, error } = await sb.from('shop_settings').select('force_refresh_at').eq('id', 1).maybeSingle();
    if(error) throw error;
    const flagAt = data && data.force_refresh_at;
    if(!flagAt) return;
    const flagTime = new Date(flagAt).getTime();
    const seenAt = Number(localStorage.getItem('forceRefreshSeenAt') || 0);
    if(flagTime > seenAt){
      showForceRefreshModal(flagTime);
    }
  }catch(e){ console.warn('[force-refresh] flag check', e); }
}
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'visible') checkForceRefreshFlag();
});

async function adminForceRefresh(){
  const msgEl = document.getElementById('force-refresh-admin-msg');
  if(!currentUser || !currentUser.is_admin){
    if(msgEl){ msgEl.textContent = 'Admin only'; msgEl.style.color = '#f87171'; }
    return;
  }
  if(!sb){
    if(msgEl){ msgEl.textContent = 'Not connected'; msgEl.style.color = '#f87171'; }
    return;
  }
  if(!forceRefreshChannel) startForceRefreshWatcher();
  const at = Date.now();
  try{
    // Persisted flag — catches players who are offline/backgrounded right now
    // (e.g. iPad locked) and only reconnect later.
    const { error } = await sb.from('shop_settings').upsert({
      id: 1,
      force_refresh_at: new Date(at).toISOString(),
      updated_at: new Date(at).toISOString()
    });
    if(error) throw error;
    // Live broadcast — instant popup for anyone currently connected
    if(forceRefreshChannel){
      await forceRefreshChannel.send({ type: 'broadcast', event: 'refresh', payload: { at } });
    }
    if(msgEl){ msgEl.textContent = 'Sent — online players prompted now, others on their next visit'; msgEl.style.color = '#4ade80'; }
    showToast('Force refresh sent');
  }catch(e){
    console.error(e);
    if(msgEl){ msgEl.textContent = e.message || 'Failed — run SQL for force_refresh_at column'; msgEl.style.color = '#f87171'; }
  }
}



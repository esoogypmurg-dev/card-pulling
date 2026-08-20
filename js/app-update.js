/* ========== APP UPDATE CHECK (Cloudflare Pages) ========== */
const APP_VERSION = (document.querySelector('meta[name="app-version"]') || {}).content || '0';
let __appUpdateFound = false;
let __appUpdateChecking = false;

function showAppUpdateModal(newVer){
  if(__appUpdateFound) return;
  __appUpdateFound = true;
  const modal = document.getElementById('app-update-modal');
  const label = document.getElementById('au-ver-label');
  if(label) label.textContent = 'Current: ' + APP_VERSION + (newVer ? ' → ' + newVer : '');
  if(modal) modal.classList.add('show');
}

function applyAppUpdate(){
  // Bust caches and reload
  const url = new URL(location.href);
  url.searchParams.set('_v', String(Date.now()));
  location.replace(url.toString());
}

async function checkForAppUpdate(){
  if(__appUpdateFound || __appUpdateChecking) return;
  // Don't nag during pack reveal
  if(typeof opening !== 'undefined' && opening && opening.active) return;
  __appUpdateChecking = true;
  try{
    const res = await fetch(location.pathname + '?_cb=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if(!res.ok) return;
    const html = await res.text();
    const m = html.match(/<meta\s+name=["']app-version["']\s+content=["']([^"']+)["']/i)
          || html.match(/content=["']([^"']+)["']\s+name=["']app-version["']/i);
    const remote = m ? m[1].trim() : null;
    if(remote && remote !== APP_VERSION){
      showAppUpdateModal(remote);
    }
  }catch(e){
    /* offline / blocked — ignore */
  }finally{
    __appUpdateChecking = false;
  }
}

function startAppUpdateWatcher(){
  // First check after a short delay, then every 60s
  setTimeout(checkForAppUpdate, 8000);
  setInterval(checkForAppUpdate, 60000);
  // Also check when tab becomes visible again
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible') checkForAppUpdate();
  });
}
startAppUpdateWatcher();



// Guess the Pull Count — public counter (works for guests too)
setTimeout(function(){
  if(typeof startGpcWatcher === 'function') startGpcWatcher();
}, 600);

(function(){
  const art = (typeof randomPackArt==='function'?randomPackArt():DEFAULT_PACK_ART);
  setPackArt(art);
})();
// Bind swipe after layout paints (fixes first-load)
initPackSwipe();
requestAnimationFrame(function(){ initPackSwipe(); });
setTimeout(function(){ initPackSwipe(); }, 100);
// Market timer still runs, but data only after login
setInterval(function(){
  if(!currentUser) return;
  if(state.marketLastRefresh && (Date.now() - state.marketLastRefresh) >= MARKET_REFRESH_MS){
    refreshMarket(false);
  }
  updateMarketTimer();
}, 1000);




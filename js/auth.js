/* ========== SUPABASE + AUTH CONFIG ========== */
const SUPABASE_URL = 'https://occsqnecudgqaevqozoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jY3NxbmVjdWRncWFldnFvem9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NzIwMjMsImV4cCI6MjEwMjE0ODAyM30.a7zZ5mjh-aGYSG88fKsVPK4EcCowvFVAhlwIRTuuCLg';

let sb = null;            // Supabase client (renamed to avoid conflict with the CDN library)
let currentUser = null;   // { id, username, display_name, is_admin }

// Global trainer presence. This is ephemeral Realtime presence, so "online"
// means the trainer currently has the site open and connected.
let playerPresenceChannel = null;
let playerPresenceMap = {};

function getOnlinePlayerIds(){
  return new Set(Object.keys(playerPresenceMap || {}));
}

function isPlayerOnline(id){
  return !!(id && playerPresenceMap && playerPresenceMap[id]);
}

function renderPlayersOnlineSummary(){
  const el = document.getElementById('pl-sum-count');
  if(el) el.textContent = String(getOnlinePlayerIds().size);
}

function refreshPresenceViews(){
  renderPlayersOnlineSummary();
  if(document.getElementById('players')?.classList.contains('active')){
    try{ loadPlayersList(); }catch(_){}
  }
  if(document.getElementById('teams')?.classList.contains('active')){
    try{ renderTeams(); }catch(_){}
  }
}

async function startPlayerPresence(){
  if(!sb || !currentUser?.id) return;
  stopPlayerPresence();
  playerPresenceMap = {};
  try{
    playerPresenceChannel = sb.channel('trainer-presence', {
      config: { presence: { key: String(currentUser.id) } }
    });

    const sync = () => {
      const state = playerPresenceChannel.presenceState();
      const next = {};
      Object.entries(state || {}).forEach(([key, metas]) => {
        if(metas && metas.length) next[key] = metas[0] || {};
      });
      playerPresenceMap = next;
      refreshPresenceViews();
    };

    playerPresenceChannel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe(async status => {
        if(status === 'SUBSCRIBED'){
          try{
            await playerPresenceChannel.track({
              user_id: String(currentUser.id),
              username: currentUser.username || '',
              display_name: currentUser.display_name || currentUser.username || 'Trainer',
              online_at: new Date().toISOString()
            });
          }catch(e){ console.warn('[presence] track failed', e); }
        }
      });
  }catch(e){
    console.warn('[presence] channel failed', e);
  }
}

function stopPlayerPresence(){
  if(playerPresenceChannel && sb){
    try{ sb.removeChannel(playerPresenceChannel); }catch(_){}
  }
  playerPresenceChannel = null;
  playerPresenceMap = {};
}

function initSupabase(){
  if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
    console.warn('Supabase keys missing.');
    return false;
  }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}


// ========== Phase 2: Supabase Auth (username + password) ==========
// Email is a synthetic address: username@pokemon-cards.local
const AUTH_EMAIL_DOMAIN = 'pokemon-cards.local';

function usernameToEmail(username){
  const s = String(username || '').trim().toLowerCase();
  // Already a full email? use as-is
  if(s.includes('@')) return s;
  return s + '@' + AUTH_EMAIL_DOMAIN;
}

function normalizeUsernameInput(raw){
  const s = String(raw || '').trim().toLowerCase();
  // "name@pokemon-cards.local" → "name"
  if(s.endsWith('@' + AUTH_EMAIL_DOMAIN)) return s.slice(0, -(AUTH_EMAIL_DOMAIN.length + 1));
  if(s.includes('@')) return s.split('@')[0];
  return s;
}

async function doLogin(){
  const rawUser = (document.getElementById('login-username').value || '').trim();
  const username = normalizeUsernameInput(rawUser);
  const pin = (document.getElementById('login-pin').value || '').trim();
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');
  errEl.textContent = '';

  if(!username || !pin){
    errEl.textContent = 'Enter both username and password';
    return;
  }
  if(!sb && !initSupabase()){
    errEl.textContent = 'Cloud not connected. Check SUPABASE_URL / anon key.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try{
    const email = usernameToEmail(rawUser);
    const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
      email,
      password: pin
    });
    if(authErr) throw authErr;
    if(!authData?.user){
      errEl.textContent = 'Wrong username or password';
      btn.disabled = false;
      btn.textContent = 'Sign In';
      return;
    }

    await loadProfileForAuthUser(authData.user);
    await afterLogin();
  }catch(e){
    console.error(e);
    const msg = (e && e.message) ? e.message : 'Sign in failed';
    if(/invalid login credentials/i.test(msg)){
      errEl.textContent = 'Wrong username or password';
    } else {
      errEl.textContent = msg;
    }
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function loadProfileForAuthUser(user){
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if(error) throw error;

  let row = data;
  if(!row){
    // Trigger may not have fired yet — create profile row
    const uname = (user.user_metadata && user.user_metadata.username)
      || (user.email ? user.email.split('@')[0] : 'player');
    const dname = (user.user_metadata && user.user_metadata.display_name) || uname;
    const { data: created, error: insErr } = await sb.from('profiles').insert({
      id: user.id,
      username: String(uname).toLowerCase(),
      display_name: dname,
      is_admin: false,
      money: 25,
      packs: 0,
      collection: {},
      stats: { packQueue: [] }
    }).select().single();
    if(insErr) throw insErr;
    row = created;
  }

  currentUser = {
    id: row.id,
    username: row.username,
    display_name: row.display_name || row.username,
    is_admin: !!row.is_admin
  };

  state.money = Number(row.money) || 25;
  state.packs = Number(row.packs) || 0;
  state.collection = row.collection || {};
  const cloudStats = row.stats || {};
  state.stats = {
    packsOpened: cloudStats.packsOpened || 0,
    sells: cloudStats.sells || 0,
    holosPulled: cloudStats.holosPulled || 0
  };
  state.dailyClaim = cloudStats.dailyClaim || null;
  state.promoClaim = cloudStats.promoClaim || null;
  state.dailyProgress = cloudStats.dailyProgress || null;
  state.dailyGoalSettings = cloudStats.dailyGoalSettings || null;
  state.questNotified = cloudStats.questNotified || {};
  state.priceUnlocked = cloudStats.priceUnlocked || {};
  state.researchJobs = cloudStats.researchJobs || {};
  state.packQueue = Array.isArray(cloudStats.packQueue) ? cloudStats.packQueue : [];
  state.claimed = cloudStats.claimed || {};
  state.marketLastRefresh = cloudStats.marketLastRefresh || 0;
  state.marketHistory = Array.isArray(cloudStats.marketHistory) ? cloudStats.marketHistory : [];
  state.marketOffersCache = cloudStats.marketOffersCache || null;
  state.binderLayout = cloudStats.binderLayout || null;
  state.grades = cloudStats.grades || {};
  state.cosmeticsOwned = Array.isArray(cloudStats.cosmeticsOwned) ? cloudStats.cosmeticsOwned : [];
  state.cosmeticsEquipped = cloudStats.cosmeticsEquipped || {};
  state.mysteryBoxLimits = cloudStats.mysteryBoxLimits || null;
  state.tradeUpLimits = cloudStats.tradeUpLimits || null;
  state.achievementClaims = cloudStats.achievementClaims || {};
  state.dailyWheelClaim = cloudStats.dailyWheelClaim || null;
  state.luckBuffs = cloudStats.luckBuffs || null;
  state.wantList = row.want_list || [];
  state.pendingOffers = row.pending_offers || {};

  try{
    await sb.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', row.id);
  }catch(e){}
}

async function tryRestoreSession(){
  if(!sb && !initSupabase()) return false;
  try{
    const { data, error } = await sb.auth.getSession();
    if(error || !data?.session?.user) return false;
    await loadProfileForAuthUser(data.session.user);
    await afterLogin();
    return true;
  }catch(e){
    console.warn('Session restore failed', e);
    return false;
  }
}

/* doLogout defined later (full cleanup + Supabase signOut) */



async function afterLogin(){
  document.getElementById('login-screen').classList.add('hidden');

  // Daily-claim state is already loaded (loadProfileForAuthUser ran before this).
  // Sync the claim button immediately — it doesn't depend on the card catalog,
  // and leaving it in its default-enabled markup state during the slower
  // Phase 1/2 loads below let a click through before we'd disabled it.
  if(typeof updateDailyUI === 'function') updateDailyUI();

  // Phase 1: load card catalog from Supabase before any UI that needs CARDS
  try {
    if (sb) {
      await loadSetsAndCards();
      if (migrateCollectionKeys()) {
        console.log('[cards] migrated collection/grades to string keys');
        try { save(); } catch(e) {}
      }
      if (typeof rebuildSetPickers === 'function') {
        try { rebuildSetPickers(); } catch(e) { console.warn('[sets] failed to rebuild set pickers', e); }
      }
    }
  } catch (e) {
    console.error('Failed to load card catalog', e);
    showToast('Could not load card catalog — check sets/cards tables');
  }

  // Start ephemeral realtime presence before rendering player/team directories.
  await startPlayerPresence();

  // Enable admin tools if needed
  console.log('[auth] user', currentUser?.username, 'is_admin=', currentUser?.is_admin, 'id=', currentUser?.id);
  if(currentUser && currentUser.is_admin){
    const navAdmin = document.getElementById('nav-admin');
    if(navAdmin){
      navAdmin.style.display = '';
      console.log('[auth] admin nav shown');
    } else {
      console.warn('[auth] nav-admin element missing');
    }
  }
  updateUI();
  renderCollection();
  renderSellList();
  renderBinder();
  populateTradeSelects();
  if(typeof updateDailyUI === 'function') updateDailyUI();
  if(typeof renderQuests === 'function') renderQuests();
  if(typeof ensureMarketFresh === 'function') ensureMarketFresh();
  applyCosmetics();
  renderCosmeticsShop();
  updateHomeWelcome();
  showToast(`Welcome, ${currentUser.display_name}!`);
  // Offline trade requests waiting while we were away
  fetchPendingTradeRequests();
  startTradeRequestWatcher();
  startPullAlertWatcher();
  if(typeof startFirstZardWatcher==='function') startFirstZardWatcher();
  if(typeof startGpcWatcher === 'function') startGpcWatcher();
  if(typeof updateMailBadge === 'function') updateMailBadge();
  if(typeof startMailWatcher === 'function') startMailWatcher();
  // Await cloud admin data so Home / Shop match what admin scheduled
  if(typeof initEventSchedule === 'function') await initEventSchedule();
  if(typeof initHomeBanner === 'function') await initHomeBanner();
  if(typeof loadShopSettings === 'function') await loadShopSettings();
  if(typeof startEchoWatcher === 'function') startEchoWatcher();
  // Random Black Star Promo pack chance
  setTimeout(maybeShowPromoOnLogin, 900);
  // Live Event invite channel (popup when admin invites you)
  if(typeof lwEnsureInviteChannel === 'function') lwEnsureInviteChannel();
  if(typeof achLoadCatalogFromCloud === 'function') await achLoadCatalogFromCloud();
  if(typeof checkAppAnnouncement === 'function') await checkAppAnnouncement();
  if(typeof checkForceRefreshFlag === 'function') await checkForceRefreshFlag();
  if(typeof startAppConfigWatcher === 'function') startAppConfigWatcher();
  if(typeof startLiveFlashWatcher === 'function') startLiveFlashWatcher();
  if(typeof startForceRefreshWatcher === 'function') startForceRefreshWatcher();
  if(typeof startMarketSoldWatcher === 'function') startMarketSoldWatcher();
  if(typeof startAuctionWatcher === 'function') startAuctionWatcher();
  if(typeof resolveEndedAuctions === 'function') setTimeout(resolveEndedAuctions, 1500);
  if(typeof checkMissedMarketSales === 'function') setTimeout(checkMissedMarketSales, 1200);
}


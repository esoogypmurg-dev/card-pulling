/* ===== Event Schedule (Home center block) ===== */
const EV_STORAGE_KEY = 'pokemonScheduledEvents';
const EVENT_TYPES = {
  mystery_box: {
    label: 'Mystery Box Friday',
    icon: '🎁',
    art: 'art/mystery-box-home.webp',
    blurb: 'Flat-price mixed-set box — junk to chase.',
    cta: 'View Mystery Box',
    action: 'mystery'
  },
  prize_wheel: {
    label: 'Prize Wheel',
    icon: '🎡',
    art: 'art/prize-wheel.webp',
    blurb: 'Live spin event — join when invited.',
    cta: 'Open Live Events',
    action: 'wheel'
  },
  guess_pull: {
    label: 'Guess the Pull Count',
    icon: '🎯',
    art: 'art/guess-the-pull.webp',
    blurb: 'Guess packs until the next chase — closest wins credit.',
    cta: 'Make a Guess',
    action: 'gpc'
  },
  trade_up: {
    label: 'Tuesday Trade-up',
    icon: '🔄',
    art: null,
    blurb: 'Trade in 3 cards and get back one random card of a better rarity.',
    cta: 'Trade Up',
    action: 'tradeup'
  },
  echo_pulls: {
    label: 'Echo Pulls',
    icon: '⚡',
    art: null,
    blurb: 'Hit a Rare Holo to start a family-wide pack luck Echo.',
    cta: 'Open Packs',
    action: 'open'
  },
  team_rocket: {
    label: 'Team Rocket Attack',
    icon: '🚀',
    art: null,
    blurb: 'Wager a card, battle Team Rocket, win one of theirs.',
    cta: 'Battle Team Rocket',
    action: 'rocket'
  },
  custom: {
    label: 'Special Event',
    icon: '✨',
    art: null,
    blurb: 'A special event is on the calendar.',
    cta: 'Got it',
    action: 'none'
  }
};

let scheduledEvents = [];

function evLoadLocal(){
  try{
    const raw = localStorage.getItem(EV_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    scheduledEvents = Array.isArray(list) ? list : [];
  }catch(e){ scheduledEvents = []; }
}
function evSaveLocal(){
  try{ localStorage.setItem(EV_STORAGE_KEY, JSON.stringify(scheduledEvents)); }catch(e){}
}
async function evLoadCloud(){
  if(!sb) return;
  try{
    const { data, error } = await sb.from('scheduled_events')
      .select('*')
      .order('starts_at', { ascending: true });
    if(error) throw error;
    if(Array.isArray(data)){
      scheduledEvents = data.map(r => ({
        id: r.id,
        type: r.type,
        title: r.title || '',
        notes: r.notes || '',
        starts_at: r.starts_at,
        ends_at: r.ends_at,
        enabled: r.enabled !== false
      }));
      evSaveLocal();
    }
  }catch(e){
    // Table optional — local schedule still works
    console.warn('[events] cloud load skipped', e.message || e);
  }
}
async function evSaveCloud(ev){
  if(!sb || !currentUser || !currentUser.is_admin) return false;
  try{
    const row = {
      id: ev.id,
      type: ev.type,
      title: ev.title || null,
      notes: ev.notes || null,
      starts_at: ev.starts_at,
      ends_at: ev.ends_at,
      enabled: ev.enabled !== false,
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('scheduled_events').upsert(row);
    if(error) throw error;
    return true;
  }catch(e){
    console.warn('[events] cloud save skipped', e.message || e);
    return false;
  }
}
async function evDeleteCloud(id){
  if(!sb || !currentUser || !currentUser.is_admin) return;
  try{ await sb.from('scheduled_events').delete().eq('id', id); }catch(e){}
}

function evUid(){
  return 'ev_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function evTypeMeta(type){
  return EVENT_TYPES[type] || EVENT_TYPES.custom;
}
function evParseLocalInput(val){
  if(!val) return null;
  const d = new Date(val);
  return isFinite(d.getTime()) ? d.toISOString() : null;
}
function evToLocalInput(iso){
  if(!iso) return '';
  const d = new Date(iso);
  if(!isFinite(d.getTime())) return '';
  const pad = n => String(n).padStart(2,'0');
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
}
function evFormatWhen(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  if(!isFinite(d.getTime())) return '—';
  try{
    return d.toLocaleString(undefined, { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
  }catch(e){
    return d.toLocaleString();
  }
}
function evStatus(ev){
  const now = Date.now();
  const a = new Date(ev.starts_at).getTime();
  const b = new Date(ev.ends_at).getTime();
  if(!isFinite(a) || !isFinite(b)) return 'invalid';
  if(now < a) return 'upcoming';
  if(now > b) return 'ended';
  return 'live';
}
function evDisplayTitle(ev){
  if(ev.title && String(ev.title).trim()) return String(ev.title).trim();
  return evTypeMeta(ev.type).label;
}

function getLiveScheduledEvent(){
  const list = (scheduledEvents || []).filter(e => e.enabled !== false);
  return list.find(e => evStatus(e) === 'live') || null;
}
function getNextScheduledEvent(){
  const now = Date.now();
  return (scheduledEvents || [])
    .filter(e => e.enabled !== false && new Date(e.starts_at).getTime() > now)
    .sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at))[0] || null;
}

/** Home center: live scheduled > built-in mystery Friday > next upcoming > default cards */
function getHomeFeatureEvent(){
  const live = getLiveScheduledEvent();
  if(live) return { mode:'live', event: live };
  // Next scheduled event takes the center when nothing is live
  const next = getNextScheduledEvent();
  if(next) return { mode:'upcoming', event: next };
  // Built-in Mystery Box Fridays only if the calendar is empty of upcoming/live
  if(typeof isMysteryBoxDay === 'function' && isMysteryBoxDay()){
    return {
      mode: 'live',
      event: {
        id: 'builtin_mystery',
        type: 'mystery_box',
        title: 'Mystery Box Friday',
        notes: 'Available in Shop — mixed Base / Jungle / Fossil.',
        starts_at: null,
        ends_at: null,
        enabled: true,
        _builtin: true
      }
    };
  }
  return { mode:'default', event: null };
}

function evRunAction(action){
  if(action === 'mystery'){ openMysteryBoxModal(); return; }
  if(action === 'wheel'){ navGo('live'); return; }
  if(action === 'gpc'){ openGpcModal(); return; }
  if(action === 'tradeup'){ openTradeUpModal(); return; }
  if(action === 'open'){ navGo('open'); return; }
  if(action === 'rocket'){ navGo('rocket'); return; }
}

function evTypeChanged(){
  const type = (document.getElementById('ev-type') || {}).value || 'mystery_box';
  const title = document.getElementById('ev-title');
  if(title && !title.value) title.placeholder = evTypeMeta(type).label;
}

function evFormReset(){
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.value = v; };
  set('ev-type', 'mystery_box');
  set('ev-title', '');
  set('ev-notes', '');
  set('ev-start', '');
  set('ev-end', '');
  const msg = document.getElementById('ev-admin-msg');
  if(msg) msg.textContent = '';
}

async function evScheduleSave(){
  const type = (document.getElementById('ev-type') || {}).value || 'custom';
  const title = ((document.getElementById('ev-title') || {}).value || '').trim();
  const notes = ((document.getElementById('ev-notes') || {}).value || '').trim();
  const starts = evParseLocalInput((document.getElementById('ev-start') || {}).value);
  const ends = evParseLocalInput((document.getElementById('ev-end') || {}).value);
  const msg = document.getElementById('ev-admin-msg');
  if(!starts || !ends){
    if(msg){ msg.textContent = 'Start and end date/time are required.'; msg.style.color = '#f87171'; }
    return;
  }
  if(new Date(ends) <= new Date(starts)){
    if(msg){ msg.textContent = 'End must be after start.'; msg.style.color = '#f87171'; }
    return;
  }
  const ev = {
    id: evUid(),
    type,
    title,
    notes,
    starts_at: starts,
    ends_at: ends,
    enabled: true
  };
  scheduledEvents.push(ev);
  scheduledEvents.sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at));
  evSaveLocal();
  const cloud = await evSaveCloud(ev);
  if(msg){
    msg.textContent = cloud ? 'Scheduled (saved to cloud + this device).' : 'Scheduled on this device. Run sql/007_scheduled_events.sql for cloud sync.';
    msg.style.color = '#4ade80';
  }
  evFormReset();
  evAdminRender();
  if(typeof renderHomeRareShowcase === 'function') renderHomeRareShowcase();
  if(typeof renderHomeUpcoming === 'function') renderHomeUpcoming();
}

async function evDelete(id){
  scheduledEvents = (scheduledEvents || []).filter(e => e.id !== id);
  evSaveLocal();
  await evDeleteCloud(id);
  evAdminRender();
  if(typeof renderHomeRareShowcase === 'function') renderHomeRareShowcase();
  if(typeof renderHomeUpcoming === 'function') renderHomeUpcoming();
}

function evAdminRender(){
  const list = document.getElementById('ev-admin-list');
  if(!list) return;
  const rows = (scheduledEvents || []).slice().sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at));
  if(!rows.length){
    list.innerHTML = '<p style="color:var(--muted);font-size:.85rem;margin:0">No events scheduled yet.</p>';
    return;
  }
  list.innerHTML = rows.map(ev => {
    const st = evStatus(ev);
    const meta = evTypeMeta(ev.type);
    const color = st === 'live' ? '#4ade80' : (st === 'upcoming' ? 'var(--gold)' : 'var(--muted)');
    return `<div style="display:flex;gap:.75rem;align-items:flex-start;justify-content:space-between;padding:.65rem .75rem;border-radius:10px;border:1px solid #2a314d;background:#0f1320">
      <div>
        <div style="font-weight:700;color:#fff">${meta.icon} ${evDisplayTitle(ev)}</div>
        <div style="font-size:.78rem;color:var(--muted);margin-top:.2rem">${evFormatWhen(ev.starts_at)} → ${evFormatWhen(ev.ends_at)}</div>
        ${ev.notes ? `<div style="font-size:.78rem;color:#b7bbca;margin-top:.25rem">${String(ev.notes).replace(/</g,'&lt;')}</div>` : ''}
        <div style="font-size:.72rem;font-weight:700;color:${color};margin-top:.3rem;text-transform:uppercase;letter-spacing:.4px">${st}</div>
      </div>
      <button class="btn btn-secondary" type="button" style="padding:.3rem .55rem;font-size:.75rem" onclick="evDelete('${ev.id}')">Remove</button>
    </div>`;
  }).join('');
}


function getUpcomingScheduledEvents(limit){
  const now = Date.now();
  const lim = limit || 4;
  return (scheduledEvents || [])
    .filter(e => e.enabled !== false && new Date(e.ends_at).getTime() > now)
    .sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at))
    .slice(0, lim);
}

function renderHomeUpcoming(){
  const box = document.getElementById('home-upcoming');
  const list = document.getElementById('home-upcoming-list');
  if(!box || !list) return;
  const rows = (typeof getUpcomingScheduledEvents === 'function') ? getUpcomingScheduledEvents(5) : [];
  // Always show scheduled items (live + upcoming). Built-in mystery is not a schedule row unless also scheduled.
  if(!rows.length){
    box.classList.remove('visible');
    box.style.display = 'none';
    list.innerHTML = '';
    return;
  }
  box.classList.add('visible');
  box.style.display = '';
  list.innerHTML = rows.map(ev => {
    const st = evStatus(ev);
    const meta = evTypeMeta(ev.type);
    const when = st === 'live'
      ? ('Live now · ends ' + evFormatWhen(ev.ends_at))
      : ('Starts ' + evFormatWhen(ev.starts_at));
    const tag = st === 'live' ? 'Live' : 'Soon';
    return `<div class="home-upcoming-row ${st === 'live' ? 'live' : ''}">
      <div class="eu-ico">${meta.icon}</div>
      <div class="eu-body">
        <div class="eu-title">${evDisplayTitle(ev)}</div>
        <div class="eu-when">${when}${ev.notes ? ' · ' + String(ev.notes).replace(/</g,'&lt;') : ''}</div>
      </div>
      <span class="eu-tag">${tag}</span>
    </div>`;
  }).join('');
}

async function initEventSchedule(){
  evLoadLocal();
  await evLoadCloud();
  if(typeof renderHomeRareShowcase === 'function') renderHomeRareShowcase();
  if(typeof renderHomeUpcoming === 'function') renderHomeUpcoming();
  // Refresh home block every minute for live/upcoming transitions
  if(!window.__evTick){
    window.__evTick = setInterval(function(){
      if(typeof renderHomeRareShowcase === 'function') renderHomeRareShowcase();
      if(typeof renderHomeUpcoming === 'function') renderHomeUpcoming();
    }, 60000);
  }
}


function updateHomeDashboard(){
  if(typeof state === 'undefined' || typeof CARDS === 'undefined') return;
  if(typeof renderHomeRareShowcase==='function') renderHomeRareShowcase();
  if(typeof renderHomeUpcoming==='function') renderHomeUpcoming();
  if(typeof ensureHomeRailOpen==='function') ensureHomeRailOpen();
  const ownedCards = CARDS.filter(c => colGet(state.collection, c) > 0);
  const owned = ownedCards.length;
  const total = CARDS.length || 1;
  const pct = Math.round(owned / total * 100);
  const setText = (id, value) => { const el = document.getElementById(id); if(el) el.textContent = value; };
  setText('home-money', '$' + (Number(state.money) || 0).toFixed(2));
  setText('home-packs', state.packs || 0);
  setText('home-collection', owned + ' / ' + total);
  setText('home-progress-pct', pct + '%');
  setText('home-progress-count', owned + ' / ' + total);
  setText('home-progress-remaining', owned ? Math.max(0, total - owned) + ' more to complete the set' : 'Start opening packs to fill your binder.');
  const ring = document.getElementById('home-progress-ring');
  if(ring) ring.style.setProperty('--progress', pct);
  const fill = document.getElementById('home-progress-fill');
  if(fill) fill.style.width = pct + '%';

  const dailyGoals = typeof todaysDailyQuests === 'function' ? todaysDailyQuests().map(q => ({...q, _daily:true})) : [];
  // Home only surfaces goals that are still in progress.  A completed goal moves
  // off the rail and remains claimable in the full Daily Goals page.
  const homeGoal = dailyGoals.find(q => !questClaimed(q) && !questDone(q));
  const homeQuestCard = document.getElementById('home-quest-card');
  if(homeQuestCard) homeQuestCard.style.display = homeGoal ? '' : 'none';
  if(homeGoal){
    const target = questTarget(homeGoal);
    const progress = Math.min(questProgress(homeGoal), target);
    const complete = questDone(homeGoal);
    setText('home-quest-title', homeGoal.title);
    setText('home-quest-copy', complete ? 'Complete — claim your reward in Daily Goals.' : homeGoal.desc);
    setText('home-quest-progress', progress + ' / ' + target);
    const icon = document.getElementById('home-quest-icon');
    if(icon) icon.textContent = homeGoal.icon || (DAILY_GOAL_TYPES[homeGoal.type] && DAILY_GOAL_TYPES[homeGoal.type].icon) || '🎁';
    setText('home-quest-reward', 'Reward: ' + rewardText(homeGoal));
    const questFill = document.querySelector('.home-quest-bar i');
    if(questFill) questFill.style.width = (progress / Math.max(1,target) * 100) + '%';
  } else {
    setText('home-quest-title', 'No daily goal');
    setText('home-quest-copy', 'Check back tomorrow for a new goal.');
    setText('home-quest-progress', '—');
    setText('home-quest-reward', '');
  }

  const pullWrap = document.getElementById('home-recent-pulls');
  if(pullWrap){
    pullWrap.innerHTML = '';
    const cards = (lastPackCards && lastPackCards.length ? lastPackCards : ownedCards.slice(-4)).slice(0,4);
    if(cards.length){
      const grid = document.createElement('div'); grid.className = 'home-pulls-grid';
      cards.forEach(card => {
        const el = document.createElement('button'); el.type = 'button'; el.className = 'home-pull';
        el.title = card.name; el.onclick = () => openZoom(card);
        if(card.art) el.innerHTML = '<img src="' + card.art + '" alt="' + card.name + '">';
        else el.innerHTML = '<div class="home-pull-fallback">' + (card.emoji || '🃏') + '</div>';
        if(card.isNew) el.innerHTML += '<span class="home-pull-new">NEW</span>';
        grid.appendChild(el);
      });
      pullWrap.appendChild(grid);
    }else{
      pullWrap.innerHTML = '<div style="padding:1.05rem 0 .2rem;color:var(--muted);font-size:.84rem">Your newest pulls will appear here.</div>';
    }
  }
  refreshHomeLeaderboard();
}

let homeLeaderboardLoading = false;
async function refreshHomeLeaderboard(){
  const list = document.getElementById('home-mini-leaderboard');
  if(!list || homeLeaderboardLoading) return;
  const paint = rows => {
    list.innerHTML = '';
    if(!rows.length){ list.innerHTML = '<li><span class="home-leader-name">No player rankings yet.</span></li>'; return; }
    rows.slice(0,5).forEach((p, index) => {
      const li = document.createElement('li');
      const rank = document.createElement('span'); rank.className = 'home-rank'; rank.textContent = index + 1;
      const name = document.createElement('span'); name.className = 'home-leader-name'; name.textContent = p.display_name || p.username || 'Trainer';
      const score = document.createElement('strong'); score.textContent = '$' + (Number(p.money) || 0).toFixed(0);
      li.append(rank, name, score); list.appendChild(li);
    });
  };
  if(Array.isArray(lbCache) && lbCache.length){ paint(lbCache.slice().sort((a,b)=>(b.money||0)-(a.money||0))); return; }
  if(!sb || !currentUser){ return; }
  homeLeaderboardLoading = true;
  try{
    const { data, error } = await sb.from('profiles').select('username, display_name, money, is_admin').order('money',{ascending:false}).limit(5);
    if(error) throw error;
    paint((data || []).filter(p => !p.is_admin));
  }catch(e){ console.warn('Home leaderboard unavailable',e); }
  finally{ homeLeaderboardLoading = false; }
}

function openSidebar(){
  const sb = document.getElementById('app-sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  if(sb) sb.classList.add('open');
  if(bd) bd.classList.add('show');
}
function closeSidebar(){
  const sb = document.getElementById('app-sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  if(sb) sb.classList.remove('open');
  if(bd) bd.classList.remove('show');
}
function toggleSidebar(){
  const sb = document.getElementById('app-sidebar');
  if(sb && sb.classList.contains('open')) closeSidebar();
  else openSidebar();
}

function placeHomeRailForViewport(){
  const rail = document.getElementById('home-side-rail');
  const desktopMount = document.getElementById('home-rail-desktop-mount');
  const mobileMount = document.getElementById('home-mobile-rail-mount');
  if(!rail || !desktopMount || !mobileMount) return;
  const target = window.matchMedia('(max-width: 1050px)').matches ? mobileMount : desktopMount;
  if(rail.parentElement !== target) target.appendChild(rail);
}

function switchTab(tab){
  if(opening.active && tab !== 'open') return;
  if(!tab || !document.getElementById(tab)) return;

  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.app-nav-btn').forEach(b=>b.classList.remove('active'));

  const panel = document.getElementById(tab);
  if(panel) panel.classList.add('active');
  document.body.classList.toggle('home-active', tab === 'home');
  document.body.classList.toggle('market-active', tab === 'market');
  document.body.classList.toggle('collection-active', tab === 'collection');
  document.body.classList.toggle('catalog-active', tab === 'catalog');
  document.body.classList.toggle('quests-active', tab === 'quests');
  document.body.classList.toggle('shop-active', tab === 'shop');
  document.body.classList.toggle('open-active', tab === 'open');
  document.body.classList.toggle('binder-active', tab === 'binder');
  document.body.classList.toggle('admin-active', tab === 'admin');
  placeHomeRailForViewport();

  const navBtn = document.querySelector('.app-nav-btn[data-tab="'+tab+'"]');
  if(navBtn) navBtn.classList.add('active');

  const title = document.getElementById('top-title');
  if(title) title.textContent = TAB_TITLES[tab] || tab;

  closeSidebar();

  if(tab==='trade'){ populateTradeSelects(); renderTradePicks(); }
  if(tab==='binder'){ renderBinder(); }
  if(tab==='quests'){ renderQuests(); }
  if(tab==='achievements'){ if(typeof renderAchievements==='function') renderAchievements(); }
  if(tab==='leaderboard'){ renderLeaderboard(); }
  if(tab==='teams'){ renderTeams(); }
  if(tab==='mail'){ renderMail(); }
  if(tab==='catalog'){ renderCatalog(); }
  if(tab==='market'){ marketShowSection('player'); }
  if(tab==='shop'){ shopShowSection('packs'); }
  if(tab==='admin'){ populateDevSelect(); adminLoadUsers(); if(typeof adminShowSection==='function') adminShowSection('accounts'); }
  if(tab==='open'){ initPackSwipe(); }
  if(tab==='players'){ viewingProfilePlayer=null; closePlayerView(); loadPlayersList(); }
  if(tab==='profile'){ if(typeof renderPlayerProfile==='function') renderPlayerProfile(); }
  if(tab==='rocket'){ if(typeof renderRocketScreen==='function') renderRocketScreen(); }
  if(tab==='admin'){ /* handled above */ }
}

placeHomeRailForViewport();
window.addEventListener('resize', placeHomeRailForViewport);

// Nav uses onclick="navGo(...)" / navToggle(...) — no extra data-tab listeners

document.querySelectorAll('#col-filters .filter-btn[data-filter]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('#col-filters .filter-btn[data-filter]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter=btn.dataset.filter;
    renderCollection();
  });
});
// Collection set tabs are now rebuilt from Supabase (see rebuildSetPickers() in core.js),
// with onclick="selectCollectionSet(...)" attached directly on each generated button.

// Initialize Supabase + show login screen
initSupabase();
document.addEventListener('keydown', function(e){
  if(e.key === 'Enter'){
    const modal = document.getElementById('catalog-confirm-modal');
    if(modal && modal.style.display === 'flex'){ submitCatalogConfirm(); }
  }
});

setInterval(function(){
  if(typeof completeResearchJobs === 'function' && completeResearchJobs()){
    if(typeof updateUI === 'function') updateUI();
    if(typeof renderCatalog === 'function') renderCatalog();
  } else if(typeof renderCatalog === 'function' && document.getElementById('catalog') && document.getElementById('catalog').classList.contains('active')){
    renderCatalog(); // refresh timers
  }
  if(zoomCardId != null && typeof renderZoomCopyUI === 'function'){
    const c = CARDS.find(x => x.id === zoomCardId);
    if(c) renderZoomCopyUI(c);
  }
}, 15000);

// Do NOT auto-load a collection until someone logs in
// (load() is called inside afterLogin or for local-admin)

// Allow Enter key on login form
document.getElementById('login-pin')?.addEventListener('keydown', e => {
  if(e.key === 'Enter') doLogin();
});
document.getElementById('login-username')?.addEventListener('keydown', e => {
  if(e.key === 'Enter') document.getElementById('login-pin').focus();
});

// Phase 2: restore Auth session if present
initSupabase();
tryRestoreSession();


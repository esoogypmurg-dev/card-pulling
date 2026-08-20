async function save(){
  // Always keep a local backup
  try{ localStorage.setItem('pokemonCardsBaseSet', JSON.stringify(state)); }catch(e){}

  if(!sb || !currentUser || currentUser.id === 'local-admin') return;

  try{
    // Bundle progress fields into stats so they persist across devices/logins
    const statsToSave = {
      packsOpened: (state.stats && state.stats.packsOpened) || 0,
      sells: (state.stats && state.stats.sells) || 0,
      holosPulled: (state.stats && state.stats.holosPulled) || 0,
      dailyClaim: state.dailyClaim || null,
      promoClaim: state.promoClaim || null,
      dailyProgress: state.dailyProgress || null,
      dailyGoalSettings: state.dailyGoalSettings || null,
      questNotified: state.questNotified || {},
      priceUnlocked: state.priceUnlocked || {},
      researchJobs: state.researchJobs || {},
      packQueue: state.packQueue || [],
      claimed: state.claimed || {},
      marketLastRefresh: state.marketLastRefresh || 0,
      marketHistory: state.marketHistory || [],
      marketOffersCache: state.marketOffersCache || null,
      binderLayout: state.binderLayout || null,
      grades: state.grades || {},
      cosmeticsOwned: state.cosmeticsOwned || [],
      cosmeticsEquipped: state.cosmeticsEquipped || {},
      binderCosmetics: state.binderCosmetics || {},
      mysteryBoxLimits: state.mysteryBoxLimits || null,
      achievementClaims: state.achievementClaims || {},
      dailyWheelClaim: state.dailyWheelClaim || null,
      luckBuffs: state.luckBuffs || null,
      tradeUpLimits: state.tradeUpLimits || null
    };
    await sb.from('profiles').update({
      money: state.money,
      packs: state.packs,
      collection: state.collection,
      stats: statsToSave,
      want_list: state.wantList || [],
      pending_offers: state.pendingOffers || {},
      updated_at: new Date().toISOString()
    }).eq('id', currentUser.id);
  }catch(e){
    console.error('Cloud save failed', e);
    showToast('Could not save to cloud (will retry later)');
  }
}

// Override the old local-only load
function load(){
  // Cloud version loads during login. This is only a fallback for local-admin / offline.
  const s = localStorage.getItem('pokemonCardsBaseSet');
  if(s){ try{ state = JSON.parse(s); }catch(e){} }
  if(typeof ensureStateDefaults === 'function') ensureStateDefaults();
}

let state = {money:25.00, packs:0, collection:{}, pendingOffers:{}, stats:{packsOpened:0,sells:0,holosPulled:0}, claimed:{}, dailyClaim:null, wantList:[], marketLastRefresh:0, marketHistory:[], marketOffersCache:null, tradeUpLimits:null};
let opening = {active:false, cards:[], index:0, flipped:false, revealed:new Set()};
let packSwipe = {active:false, startX:0, startY:0, progress:0};
let lastPackCards = []; // cards from most recent finished pack
let binderPage = 0;
let binderView = 'shelf'; // 'shelf' | 'open'
let binderSet = null; // set name when open
const BINDER_PER_PAGE = 9;
// Fallback defaults, used until rebuildSetPickers() replaces this from the Supabase `sets` table.
let BINDER_SETS = [
  { id:'base-set', name:'Base Set', cover:'art/packs/charizard.webp', total:102 },
  { id:'jungle', name:'Jungle', cover:'art/jungle/001-clefable.webp', total:64 },
  { id:'fossil', name:'Fossil', cover:'art/fossil/005-gengar.webp', total:62 },
  { id:'wizards-black-star-promos', name:'Wizards Black Star Promos', cover:'art/wizards-black-star-promos/001-pikachu.webp', total:53 },
];
let currentFilter = 'all';
let showMissing = false;
let currentSet = 'all';


function pullTierForCard(card){
  const price = Number(card && card.price) || 0;
  const rar = card && card.rarity;
  if(rar === 'legendary' && price >= 100) return 'jackpot';
  if(price >= 100) return 'jackpot';
  if(rar === 'legendary') return 'amazing';
  if(rar === 'epic') return 'great';
  if(rar === 'uncommon') return 'nice';
  return null;
}
function triggerPullCelebration(revealCard, card, opts){
  const tier = pullTierForCard(card);
  if(!tier || !revealCard) return;
  const wrapper = revealCard.parentElement;
  if(!wrapper) return;
  opts = opts || {};

  // Clear prior
  revealCard.classList.remove('holo-glow','tier-glow-nice','tier-glow-great','tier-glow-amazing','tier-glow-jackpot');
  wrapper.querySelectorAll('.holo-banner,.pull-banner,.holo-sparkle').forEach(e => e.remove());

  // Fire the instant the flip lands (transitionend), not after an extra pause
  let fired = false;
  const runCelebration = () => {
    if(fired) return;
    fired = true;
    if(!revealCard || !revealCard.isConnected) return;
    const rect = wrapper.getBoundingClientRect();
    const cxPct = ((rect.left + rect.width / 2) / window.innerWidth * 100).toFixed(2) + '%';
    const cyPct = ((rect.top + rect.height / 2) / window.innerHeight * 100).toFixed(2) + '%';
    const cxPx = rect.left + rect.width / 2;
    const cyPx = rect.top + rect.height / 2;

    // Full-screen burst — always, including Open Packs (above the card)
    const burst = document.createElement('div');
    burst.className = 'pull-burst tier-' + tier;
    burst.style.setProperty('--burst-x', cxPct);
    burst.style.setProperty('--burst-y', cyPct);
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 1600);

    // Card glow
    revealCard.classList.add('tier-glow-' + tier);
    if(tier === 'amazing' || tier === 'jackpot') revealCard.classList.add('holo-glow');

    // Banner text
    const labels = {
      nice: 'NICE!',
      great: '★ GREAT PULL ★',
      amazing: '★ RARE HOLO ★',
      jackpot: '✦ JACKPOT ✦'
    };
    const banner = document.createElement('div');
    banner.className = 'pull-banner tier-' + tier;
    banner.textContent = labels[tier] || '★';
    wrapper.style.position = 'relative';
    wrapper.appendChild(banner);

    // Sparkles for great+ (origin at card center)
    const sparkleCount = tier === 'nice' ? 6 : (tier === 'great' ? 10 : (tier === 'amazing' ? 14 : 20));
    for(let i = 0; i < sparkleCount; i++){
      const s = document.createElement('div');
      s.className = 'holo-sparkle';
      const angle = (i / sparkleCount) * Math.PI * 2;
      const dist = 50 + Math.random() * 90;
      s.style.setProperty('--sx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--sy', Math.sin(angle) * dist + 'px');
      s.style.left = '50%';
      s.style.top = '50%';
      if(tier === 'nice') s.style.background = '#4ade80';
      if(tier === 'great') s.style.background = '#60a5fa';
      if(tier === 'jackpot') s.style.background = i % 2 ? '#ec4899' : '#f5c518';
      wrapper.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    }

    // Confetti for jackpot — spawn around the card
    if(tier === 'jackpot'){
      const colors = ['#ffcb05','#ec4899','#a855f7','#60a5fa','#4ade80','#fff'];
      for(let i = 0; i < 28; i++){
        const p = document.createElement('div');
        p.className = 'pull-confetti';
        p.style.background = colors[i % colors.length];
        p.style.left = (cxPx + (Math.random() * 80 - 40)) + 'px';
        p.style.top = (cyPx + (Math.random() * 60 - 30)) + 'px';
        p.style.setProperty('--cx', (Math.random() * 200 - 100) + 'px');
        p.style.setProperty('--cy', (80 + Math.random() * 180) + 'px');
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1500);
      }
    }

    if(tier === 'amazing' || tier === 'jackpot'){
      const front = document.getElementById('reveal-front');
      if(front) front.classList.add('holo-force');
    }
  };

  if(opts.immediate){
    // Already face-up (e.g. next card) — celebrate right away
    requestAnimationFrame(runCelebration);
  } else {
    // Fire as soon as the face is showing — don't wait past the flip
    const onEnd = (e) => {
      if(e && e.propertyName && e.propertyName !== 'transform') return;
      revealCard.removeEventListener('transitionend', onEnd);
      runCelebration();
    };
    revealCard.addEventListener('transitionend', onEnd);
    // Card face is readable ~halfway through the ease-out; hit then (not after)
    setTimeout(() => {
      revealCard.removeEventListener('transitionend', onEnd);
      runCelebration();
    }, 320);
  }
}
function triggerHoloEffect(revealCard){
  // Back-compat: treat as amazing holo
  const card = opening && opening.cards && opening.cards[opening.index];
  triggerPullCelebration(revealCard, card || { rarity: 'legendary', price: 0 });
}


function psaGradeText(g){
  const n = Number(g);
  if(n >= 10) return 'GEM MT';
  if(n >= 9) return 'MINT';
  if(n >= 8) return 'NM-MT';
  if(n >= 7) return 'NM';
  if(n >= 6) return 'EX-MT';
  if(n >= 5) return 'EX';
  if(n >= 4) return 'VG-EX';
  return 'VG';
}

/* Zoom modal state — must be declared (reading undeclared vars throws ReferenceError) */
let zoomCardId = null;
let zoomCopies = [];
let zoomCopyIndex = 0;


/* ===== Data-driven set pickers =====
   Everything below rebuilds the set-related UI (binder shelf, Open Packs tabs,
   Shop set dropdown, Collection set tabs) straight from the Supabase `sets`
   table, so adding a new set only requires rows in `sets` + `cards` — no more
   hand-editing BINDER_SETS or the HTML for every new set. Called once from
   afterLogin() in auth.js, right after loadSetsAndCards() finishes. */

function isPromoSet(set){
  const name = (set && (typeof set === 'string' ? set : set.name)) || '';
  const code = (set && set.code) || '';
  return /promo/i.test(name) || /promo/i.test(code);
}

/** Sets that should appear as buyable/openable booster packs (excludes promo-only sets). */
function boosterEligibleSets(){
  if(!SETS || !SETS.length) return [];
  return SETS.filter(s => !isPromoSet(s));
}

function rebuildBinderSetsFromData(){
  if(!SETS || !SETS.length) return; // keep fallback defaults if sets haven't loaded
  BINDER_SETS = SETS.map(s => ({
    id: s.code,
    name: s.name,
    cover: s.cover_art || 'art/packs/poke-ball.webp',
    total: s.card_count || (CARDS_BY_SET[s.code] ? CARDS_BY_SET[s.code].length : 0)
  }));
}

function selectCollectionSet(setName){
  currentSet = setName;
  document.querySelectorAll('#col-set-tabs .set-filter').forEach(b => {
    b.classList.toggle('active', (b.dataset.set || '') === setName);
  });
  if(typeof renderCollection === 'function') renderCollection();
}

function rebuildSetPickers(){
  if(!SETS || !SETS.length) return;
  rebuildBinderSetsFromData();

  // Open Packs tabs
  const rail = document.getElementById('open-set-rail');
  if(rail){
    const mysteryBtn = document.getElementById('open-set-mystery'); // preserve node + its show/hide state
    const boosters = boosterEligibleSets();
    rail.innerHTML = boosters.map(s =>
      `<button type="button" data-open-set="${s.name}" onclick="selectOpenSet('${s.name.replace(/'/g,"\\'")}')">${s.name}</button>`
    ).join('');
    if(mysteryBtn) rail.appendChild(mysteryBtn);
    if(typeof selectedOpenSet !== 'undefined' && !boosters.some(s => s.name === selectedOpenSet)){
      selectedOpenSet = boosters[0] ? boosters[0].name : selectedOpenSet;
    }
    rail.querySelectorAll('button[data-open-set]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-open-set') === (typeof selectedOpenSet !== 'undefined' ? selectedOpenSet : ''));
    });
  }

  // Shop → Buy Packs set dropdown
  const shopSel = document.getElementById('shop-pack-set');
  if(shopSel){
    const prev = shopSel.value;
    shopSel.innerHTML = boosterEligibleSets().map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    if(prev && Array.from(shopSel.options).some(o => o.value === prev)) shopSel.value = prev;
  }

  // Collection set-filter tabs ("All Sets" + one per set)
  const colTabs = document.getElementById('col-set-tabs');
  if(colTabs){
    const allActive = (typeof currentSet === 'undefined' || currentSet === 'all') ? ' active' : '';
    let html = `<button type="button" class="mkt-tab${allActive} set-filter" data-set="all" onclick="selectCollectionSet('all')">All Sets</button>`;
    html += SETS.map(s => {
      const label = isPromoSet(s) ? (s.name.replace(/wizards\s*/i,'').trim() || s.name) : s.name;
      const active = (typeof currentSet !== 'undefined' && currentSet === s.name) ? ' active' : '';
      return `<button type="button" class="mkt-tab${active} set-filter" data-set="${s.name}" onclick="selectCollectionSet('${s.name.replace(/'/g,"\\'")}')">${label}</button>`;
    }).join('');
    colTabs.innerHTML = html;
  }
}



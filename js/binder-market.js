/* ===== Binder inspect (pull card out — tilt + glare only) ===== */
let binderInspectBound = false;

function openBinderInspect(card){
  if(!card) return;
  const modal = document.getElementById('binder-inspect-modal');
  const stage = document.getElementById('binder-inspect-stage');
  const cardEl = document.getElementById('binder-inspect-card');
  const img = document.getElementById('binder-inspect-img');
  const nameEl = document.getElementById('binder-inspect-name');
  if(!modal || !stage || !cardEl || !img) return;

  if(card.art){
    img.src = card.art;
    img.style.display = 'block';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
  }
  if(nameEl) nameEl.textContent = (card.cardNumber ? card.cardNumber + ' · ' : '') + (card.name || '');

  cardEl.classList.remove('is-holo', 'is-rare');
  if(card.rarity === 'legendary') cardEl.classList.add('is-holo');
  else if(card.rarity === 'epic' || card.rarity === 'rare') cardEl.classList.add('is-rare');

  stage.style.transform = 'rotateX(0deg) rotateY(0deg)';
  cardEl.style.setProperty('--gx', '50%');
  cardEl.style.setProperty('--gy', '40%');
  cardEl.style.setProperty('--sx', '40%');
  cardEl.style.setProperty('--sy', '40%');

  modal.classList.add('open');
  if(!binderInspectBound){
    binderInspectBound = true;
    stage.addEventListener('pointermove', onBinderInspectPointer);
    stage.addEventListener('pointerleave', resetBinderInspectTilt);
  }
}

function onBinderInspectPointer(e){
  const stage = document.getElementById('binder-inspect-stage');
  const cardEl = document.getElementById('binder-inspect-card');
  if(!stage || !cardEl) return;
  const r = stage.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;   // 0..1
  const py = (e.clientY - r.top) / r.height;
  const rotY = (px - 0.5) * 28;  // tilt left/right
  const rotX = (0.5 - py) * 22;  // tilt up/down
  stage.style.transform = 'rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';
  cardEl.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
  cardEl.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
  cardEl.style.setProperty('--sx', ((1 - px) * 100).toFixed(1) + '%');
  cardEl.style.setProperty('--sy', ((1 - py) * 100).toFixed(1) + '%');
}

function resetBinderInspectTilt(){
  const stage = document.getElementById('binder-inspect-stage');
  const cardEl = document.getElementById('binder-inspect-card');
  if(stage) stage.style.transform = 'rotateX(0deg) rotateY(0deg)';
  if(cardEl){
    cardEl.style.setProperty('--gx', '50%');
    cardEl.style.setProperty('--gy', '40%');
  }
}

function closeBinderInspect(){
  const modal = document.getElementById('binder-inspect-modal');
  if(modal) modal.classList.remove('open');
  resetBinderInspectTilt();
}

function closeZoom(){
  document.getElementById('zoom-modal').classList.remove('open');
  zoomCardId = null;
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const dw = document.getElementById('daily-wheel-modal');
    if(dw && dw.classList.contains('open')){ closeDailyWheel(); return; }
    const gr = document.getElementById('grade-result-modal');
    if(gr && gr.classList.contains('open')){ closeGradeResult(); return; }
    const bi = document.getElementById('binder-inspect-modal');
    if(bi && bi.classList.contains('open')){ closeBinderInspect(); return; }
    closeTradeModal();
    closeZoom();
  }
});

function sellFromZoom(mode){
  // Legacy entry — routes to shop sink
  sellToShopFromZoom();
}

/* ========== GRADING + SHOP SINK + PLAYER MARKET ========== */
// Tiered shop buyback by market value of the copy being sold
// $1–50 → 10% · $51–100 → 8% · $101–200 → 5% · $200+ → 3%
function shopBuyRateForValue(marketValue){
  const v = Number(marketValue) || 0;
  if(v <= 50) return 0.10;
  if(v <= 100) return 0.08;
  if(v <= 200) return 0.05;
  return 0.03;
}
function shopPayoutFor(card, grade){
  const mv = cardMarketValue(card, grade);
  return +(mv * shopBuyRateForValue(mv)).toFixed(2);
}
const SHOP_BUY_RATE = 0.10;       // legacy fallback (prefer shopBuyRateForValue)
const GRADE_FEE_RATE = 0.08;      // 8% of market price to grade
const GRADE_FEE_MIN = 2.00;

function ensureGradesState(){
  if(!state.grades || typeof state.grades !== 'object') state.grades = {};
}

function getGrades(cardId){
  ensureGradesState();
  const key = toCardKey(cardId) || String(cardId);
  const g = state.grades[key] || state.grades[String(cardId)] || state.grades[cardId];
  return Array.isArray(g) ? g.slice().map(Number) : [];
}

function setGrades(cardId, arr){
  ensureGradesState();
  const key = String(cardId);
  // BUGFIX: do NOT also delete state.grades[cardId] when cardId is a number —
  // grades[1] and grades["1"] are the same property, so that deleted the grade we just saved.
  if(!arr || !arr.length){
    delete state.grades[key];
  } else {
    state.grades[key] = arr.map(Number);
  }
}

function ungradedCount(cardId){
  const owned = colGet(state.collection, cardId);
  return Math.max(0, owned - getGrades(cardId).length);
}

function gradeLabel(g){
  const n = Number(g);
  if(n >= 10) return 'PSA 10';
  if(n >= 9) return 'PSA 9';
  if(n >= 8) return 'PSA 8';
  if(n >= 7) return 'PSA 7';
  if(n >= 6) return 'PSA 6';
  if(n >= 5) return 'PSA 5';
  if(n >= 4) return 'PSA 4';
  return 'PSA '+n;
}

function gradeMultiplier(g){
  const n = Number(g);
  if(n >= 10) return 1.40;
  if(n >= 9) return 1.10;
  if(n >= 8) return 0.90;
  if(n >= 7) return 0.70;
  if(n >= 6) return 0.55;
  if(n >= 5) return 0.40;
  if(n >= 4) return 0.25;
  return 0.15;
}

function cardMarketValue(card, grade){
  const base = Number(card && card.price) || 0;
  if(grade == null || grade === '') return base;
  return base * gradeMultiplier(grade);
}

function gradeFeeForCard(card){
  const base = Number(card && card.price) || 0;
  return Math.max(GRADE_FEE_MIN, +(base * GRADE_FEE_RATE).toFixed(2));
}

function rollGrade(){
  const r = Math.random();
  if(r < 0.05) return 10;      // 5% pristine
  if(r < 0.20) return 9;       // 15%
  if(r < 0.40) return 8;       // 20%
  if(r < 0.60) return 7;       // 20%
  if(r < 0.75) return 6;       // 15%
  if(r < 0.88) return 5;       // 13%
  if(r < 0.95) return 4;       // 7%
  return 3;                    // 5%
}

/** Prefer selling a graded copy with lowest grade, else one raw extra (keep ≥1 total). */
function pickSellCandidate(cardId){
  const owned = colGet(state.collection, cardId);
  if(owned <= 1) return null; // always keep 1
  const grades = getGrades(cardId);
  if(grades.length > 0){
    // Can sell a graded copy if owned > grades.length OR owned > 1 with grades
    // Selling graded reduces both count and grade list
    const sorted = grades.slice().sort((a,b)=>a-b);
    return { grade: sorted[0], kind: 'graded' };
  }
  if(ungradedCount(cardId) >= 1 && owned > 1){
    return { grade: null, kind: 'raw' };
  }
  return null;
}

function previewShopPayout(cardId){
  const card = resolveCard(cardId);
  if(!card) return 0;
  const cand = pickSellCandidate(cardId);
  if(!cand) return 0;
  return shopPayoutFor(card, cand.grade);
}

function removeOwnedCopy(cardId, grade){
  const owned = colGet(state.collection, cardId);
  if(owned < 1) return false;
  if(grade != null && grade !== ''){
    const grades = getGrades(cardId);
    const idx = grades.indexOf(Number(grade));
    if(idx < 0){
      // grade not found — try any
      if(!grades.length) return false;
      grades.pop();
      setGrades(cardId, grades);
    } else {
      grades.splice(idx, 1);
      setGrades(cardId, grades);
    }
  } else {
    // removing raw: must have ungraded
    if(ungradedCount(cardId) < 1){
      // fall back to removing lowest grade
      const grades = getGrades(cardId).sort((a,b)=>a-b);
      if(!grades.length) return false;
      grades.shift();
      setGrades(cardId, grades);
    }
  }
  colSet(state.collection, cardId, owned - 1);
  /* colSet already removes zero */
  // Clamp grades length
  const g2 = getGrades(cardId);
  const left = colGet(state.collection, cardId);
  if(g2.length > left) setGrades(cardId, g2.slice(0, left));
  return true;
}

function showGradeResult(card, grade, fee){
  const modal = document.getElementById('grade-result-modal');
  if(!modal) return;
  const val = cardMarketValue(card, grade);
  document.getElementById('gr-card-name').textContent = card.name;
  document.getElementById('gr-score').textContent = String(grade);
  document.getElementById('gr-label').textContent = gradeLabel(grade);
  document.getElementById('gr-value').textContent =
    'Graded value: $'+val.toFixed(2)+' · Fee paid $'+fee.toFixed(2);
  modal.classList.add('open');
}
function closeGradeResult(){
  const modal = document.getElementById('grade-result-modal');
  if(modal) modal.classList.remove('open');
}

function gradeFromZoom(){
  if(zoomCardId == null) return;
  const id = zoomCardId;
  const card = resolveCard(id);
  if(!card) return;
  if(typeof isPriceUnlocked === 'function' && !isPriceUnlocked(id)){
    showToast('Research the price first (Catalog or Research) before grading');
    return;
  }
  const copy = currentZoomCopy();
  if(copy.grade != null){
    showToast('This copy is already graded — switch to a Raw copy');
    return;
  }
  const raw = ungradedCount(id);
  if(raw < 1){
    showToast('No ungraded copies left');
    openZoom(card, zoomCopyIndex);
    return;
  }
  const fee = gradeFeeForCard(card);
  if(state.money < fee){ showToast('Not enough money (need $'+fee.toFixed(2)+')'); return; }
  state.money = +(state.money - fee).toFixed(2);
  const grade = rollGrade();
  const grades = getGrades(id);
  grades.push(grade);
  setGrades(id, grades);
  if(!state.stats) state.stats = {};
  state.stats.gradesDone = (state.stats.gradesDone || 0) + 1;
  if(grade >= 10) state.stats.gradeTens = (state.stats.gradeTens || 0) + 1;
  if(typeof markMilestone === 'function') markMilestone('firstGraded');
  save(); updateUI(); renderCollection(); renderBinder();
  if(typeof checkNewlyCompletedAchievements === 'function') checkNewlyCompletedAchievements();
  // Jump to the new graded copy (sorted high-first in buildZoomCopies)
  zoomCopies = buildZoomCopies(id);
  zoomCopyIndex = Math.max(0, zoomCopies.findIndex(c => c.grade === grade));
  openZoom(card, zoomCopyIndex);
  showGradeResult(card, grade, fee);
}

function sellToShopFromZoom(){
  if(zoomCardId == null) return;
  const id = zoomCardId;
  const card = resolveCard(id);
  if(!card) return;
  
  if(typeof isPriceUnlocked === 'function' && !isPriceUnlocked(id)){
    showToast('Research the price first (Catalog or Research) before selling to the shop');
    return;
  }
  const owned = colGet(state.collection, id);
  if(owned <= 1){ showToast('Keep at least 1 copy'); return; }
  const copy = currentZoomCopy();
  let payout = shopPayoutFor(card, copy.grade);
  if(state.luckBuffs && state.luckBuffs.sellBonus){
    payout = +(payout * 1.25).toFixed(2);
    state.luckBuffs.sellBonus = false;
  }
  if(!removeOwnedCopy(id, copy.grade)){ showToast('Could not sell'); return; }
  state.money = +(state.money + payout).toFixed(2);
  if(!state.stats) state.stats = {};
  state.stats.sells = (state.stats.sells || 0) + 1;
  if(typeof trackDaily==='function'){ trackDaily('sells',1); trackDaily('saleMoney', payout); }
  save(); updateUI(); renderCollection(); renderBinder(); renderQuests();
  const tag = copy.grade != null ? gradeLabel(copy.grade) : 'raw';
  showToast('Shop bought '+card.name+' ('+tag+') for $'+payout.toFixed(2));
  if((colGet(state.collection, id)) > 0) openZoom(card, 0);
  else closeZoom();
}

let bulkSellMaxCache = 0;

function openBulkSellModal(){
  if(zoomCardId == null) return;
  const id = zoomCardId;
  const card = resolveCard(id);
  if(!card) return;
  if(typeof isPriceUnlocked === 'function' && !isPriceUnlocked(id)){
    showToast('Research the price first (Catalog or Research) before selling to the shop');
    return;
  }
  const owned = colGet(state.collection, id);
  const maxSellable = Math.max(0, owned - 1); // keep at least 1 copy, same rule as single sell
  if(maxSellable < 1){ showToast('Keep at least 1 copy'); return; }
  bulkSellMaxCache = maxSellable;
  const nameEl = document.getElementById('bulk-sell-card-name');
  const labelEl = document.getElementById('bulk-sell-max-label');
  const input = document.getElementById('bulk-sell-qty');
  if(nameEl) nameEl.textContent = card.name;
  if(labelEl) labelEl.textContent = 'You can sell up to ' + maxSellable + ' cop' + (maxSellable===1?'y':'ies') + ' (keeping at least 1).';
  if(input){
    input.value = String(maxSellable);
    input.min = '1';
    input.max = String(maxSellable);
  }
  const modal = document.getElementById('bulk-sell-modal');
  if(modal) modal.classList.add('open');
  if(input){ input.focus(); input.select(); }
}

function closeBulkSellModal(){
  const modal = document.getElementById('bulk-sell-modal');
  if(modal) modal.classList.remove('open');
}

function confirmBulkSell(){
  if(zoomCardId == null){ closeBulkSellModal(); return; }
  const id = zoomCardId;
  const card = resolveCard(id);
  if(!card){ closeBulkSellModal(); return; }
  const input = document.getElementById('bulk-sell-qty');
  let n = Math.floor(Number(input && input.value));
  if(!isFinite(n) || n < 1){ showToast('Enter a number of at least 1'); return; }
  if(n > bulkSellMaxCache) n = bulkSellMaxCache;

  let total = 0, sold = 0;
  for(let i=0;i<n;i++){
    const cand = pickSellCandidate(id);
    if(!cand) break;
    const payout = shopPayoutFor(card, cand.grade);
    if(!removeOwnedCopy(id, cand.grade)) break;
    total += payout;
    sold++;
  }
  if(sold < 1){ showToast('Keep at least 1 copy'); closeBulkSellModal(); return; }

  if(state.luckBuffs && state.luckBuffs.sellBonus){
    total = +(total * 1.25).toFixed(2);
    state.luckBuffs.sellBonus = false;
  }
  state.money = +(state.money + total).toFixed(2);
  if(!state.stats) state.stats = {};
  state.stats.sells = (state.stats.sells || 0) + sold;
  if(typeof trackDaily==='function'){ trackDaily('sells', sold); trackDaily('saleMoney', total); }
  save(); updateUI(); renderCollection(); renderBinder(); renderQuests();
  if(typeof checkNewlyCompletedQuests === 'function') checkNewlyCompletedQuests();
  if(typeof checkNewlyCompletedAchievements === 'function') checkNewlyCompletedAchievements();
  closeBulkSellModal();
  showToast('Shop bought ×' + sold + ' ' + card.name + ' for $' + total.toFixed(2));
  if((colGet(state.collection, id)) > 0) openZoom(card, 0);
  else closeZoom();
}

function listOnMarketFromZoom(){
  if(zoomCardId == null || !currentUser || !sb){ showToast('Login required for player market'); return; }
  const id = zoomCardId;
  const card = resolveCard(id);
  if(!card) return;
  const owned = colGet(state.collection, id);
  if(owned < 1){ showToast('You do not own this card'); return; }

  // List the copy currently on screen
  const copy = currentZoomCopy();
  const grade = copy.grade != null ? Number(copy.grade) : null;

  const base = cardMarketValue(card, grade);
  const defAsk = +(base).toFixed(2);
  const tag = grade != null ? gradeLabel(grade) : 'Raw';
  const askStr = prompt('List this copy ('+tag+') — asking price?\n(market ~$'+defAsk.toFixed(2)+')', String(defAsk));
  if(askStr === null) return;
  const ask = parseFloat(askStr);
  if(!(ask > 0)){ showToast('Invalid price'); return; }

  if(!removeOwnedCopy(id, grade)){ showToast('Could not list'); return; }

  (async () => {
    try{
      const { error } = await sb.from('market_listings').insert({
        seller_id: currentUser.id,
        card_id: id,
        grade: grade,
        ask_price: ask,
        status: 'open'
      });
      if(error) throw error;
      save(); updateUI(); renderCollection(); renderBinder();
      showToast('Listed '+card.name+(grade!=null?' '+gradeLabel(grade):'')+' for $'+ask.toFixed(2));
      loadPlayerMarket();
      if((colGet(state.collection, id)) > 0) openZoom(card, 0);
      else closeZoom();
    }catch(e){
      console.error(e);
      colSet(state.collection, id, colGet(state.collection, id) + 1);
      if(grade != null){
        const g = getGrades(id); g.push(grade); setGrades(id, g);
      }
      save(); updateUI();
      showToast((e.message && e.message.includes('relation'))
        ? 'Run market_listings SQL in Supabase first'
        : 'Could not list card');
    }
  })();
}

let playerMarketCache = [];
let playerMarketNames = {};

function updateMarketSummary(){
  const open = playerMarketCache.length;
  const mine = currentUser ? playerMarketCache.filter(r => r.seller_id === currentUser.id).length : 0;
  const trainerN = (typeof marketOffers !== 'undefined' && Array.isArray(marketOffers))
    ? marketOffers.filter(o => !o.taken).length : 0;
  const set = (id, t) => { const el = document.getElementById(id); if(el) el.textContent = t; };
  const setHtml = (id, t) => { const el = document.getElementById(id); if(el) el.innerHTML = t; };
  setHtml('mkt-overall-count', open + ' <span>open</span>');
  set('mkt-sum-player', String(open));
  set('mkt-sum-trainer', String(trainerN));
  set('mkt-sum-mine', String(mine));
  const meter = document.getElementById('mkt-overall-meter');
  if(meter) meter.style.width = Math.min(100, open ? Math.max(8, open * 4) : 0) + '%';
  const pct = document.getElementById('mkt-overall-pct');
  if(pct) pct.textContent = open ? (open + ' listing' + (open===1?'':'s') + ' live') : 'No open listings';
}

function populatePlayerMarketSetFilter(){
  const sel = document.getElementById('pm-set');
  if(!sel) return;
  const cur = sel.value || 'all';
  const sets = new Set();
  playerMarketCache.forEach(row => {
    const card = resolveCard(row.card_id);
    if(card && card.set) sets.add(card.set);
  });
  const order = ['Base Set','Jungle','Fossil','Wizards Black Star Promos'];
  const list = [...sets].sort((a,b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if(ia >= 0 || ib >= 0) return (ia<0?99:ia) - (ib<0?99:ib);
    return a.localeCompare(b);
  });
  sel.innerHTML = '<option value="all">All sets</option>' + list.map(s =>
    '<option value="'+String(s).replace(/"/g,'&quot;')+'">'+(s==='Wizards Black Star Promos'?'Black Star Promos':s)+'</option>'
  ).join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function populatePlayerMarketSellerFilter(){
  const sel = document.getElementById('pm-seller');
  if(!sel) return;
  const cur = sel.value || 'all';
  const names = Object.entries(playerMarketNames)
    .map(([id, name]) => ({ id, name: name || 'Trainer' }))
    .sort((a,b) => a.name.localeCompare(b.name));
  sel.innerHTML = '<option value="all">All usernames</option>' + names.map(n =>
    '<option value="'+String(n.id).replace(/"/g,'&quot;')+'">'+String(n.name).replace(/</g,'&lt;')+'</option>'
  ).join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
}

function applyPlayerMarketFilters(){
  const el = document.getElementById('player-market-list');
  if(!el) return;
  if(!playerMarketCache.length){
    el.innerHTML = '<span style="color:var(--muted)">No player listings yet — list a card from your collection (zoom → List on market)</span>';
    updateMarketSummary();
    return;
  }
  const q = ((document.getElementById('pm-search')||{}).value || '').trim().toLowerCase();
  const sellerF = ((document.getElementById('pm-seller')||{}).value || 'all');
  const setF = ((document.getElementById('pm-set')||{}).value || 'all');
  const gradeF = ((document.getElementById('pm-grade')||{}).value || 'all');
  const whoF = ((document.getElementById('pm-who')||{}).value || 'all');
  const sortF = ((document.getElementById('pm-sort')||{}).value || 'newest');

  let list = playerMarketCache.slice();
  list = list.filter(row => {
    const card = resolveCard(row.card_id);
    const seller = playerMarketNames[row.seller_id] || '';
    if(q){
      const hay = ((card && card.name) || '') + ' ' + (card && card.cardNumber || '');
      if(!hay.toLowerCase().includes(q)) return false;
    }
    if(sellerF !== 'all' && String(row.seller_id) !== String(sellerF)) return false;
    if(setF !== 'all' && (!card || card.set !== setF)) return false;
    const g = row.grade != null && row.grade !== '' ? Number(row.grade) : null;
    if(gradeF === 'raw' && g != null) return false;
    if(gradeF === 'graded' && g == null) return false;
    if(gradeF === '10' || gradeF === '9' || gradeF === '8' || gradeF === '7'){
      if(g !== Number(gradeF)) return false;
    }
    if(whoF === 'mine' && (!currentUser || row.seller_id !== currentUser.id)) return false;
    if(whoF === 'others' && currentUser && row.seller_id === currentUser.id) return false;
    return true;
  });

  list.sort((a,b) => {
    const ca = resolveCard(a.card_id), cb = resolveCard(b.card_id);
    const pa = Number(a.ask_price)||0, pb = Number(b.ask_price)||0;
    if(sortF === 'price-low') return pa - pb;
    if(sortF === 'price-high') return pb - pa;
    if(sortF === 'name') return ((ca&&ca.name)||'').localeCompare((cb&&cb.name)||'');
    // newest
    return String(b.created_at||'').localeCompare(String(a.created_at||''));
  });

  if(!list.length){
    el.innerHTML = '<span style="color:var(--muted)">No listings match these filters</span>';
    updateMarketSummary();
    return;
  }

  el.innerHTML = list.map(row => {
    const card = resolveCard(row.card_id);
    const nm = card ? card.name : ('#'+row.card_id);
    const setLabel = card && card.set ? (card.set === 'Wizards Black Star Promos' ? 'Promos' : card.set) : '';
    const g = row.grade != null ? gradeLabel(row.grade) : 'Raw';
    const seller = playerMarketNames[row.seller_id] || 'Trainer';
    const isMine = currentUser && row.seller_id === currentUser.id;
    const price = Number(row.ask_price).toFixed(2);
    const btn = isMine
      ? `<button class="btn btn-secondary" style="padding:.35rem .6rem;font-size:.78rem" onclick="cancelMarketListing('${row.id}')">Cancel</button>`
      : `<button class="btn" style="padding:.35rem .6rem;font-size:.78rem" onclick="buyMarketListing('${row.id}')">Buy</button>`;
    const thumb = card && card.art ? `<img src="${card.art}" alt="">` : '<div style="width:44px;height:62px;background:#1a1f2e;border-radius:6px"></div>';
    return `<div class="mkt-listing-row">
      ${thumb}
      <div class="mkt-listing-meta">
        <div class="nm">${String(nm).replace(/</g,'&lt;')} · ${g}</div>
        <div class="sub">${seller}${setLabel ? ' · '+setLabel : ''}${card && card.cardNumber ? ' · #'+card.cardNumber : ''}${isMine?' · <span style="color:var(--gold)">Yours</span>':''}</div>
      </div>
      <div class="mkt-listing-price">$${price}</div>
      ${btn}
    </div>`;
  }).join('');
  updateMarketSummary();
}

async function loadPlayerMarket(){
  const el = document.getElementById('player-market-list');
  if(!el) return;
  if(!sb){ el.innerHTML = '<span style="color:var(--muted)">Cloud not connected</span>'; return; }
  el.textContent = 'Loading…';
  try{
    const { data, error } = await sb.from('market_listings')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100);
    if(error) throw error;
    playerMarketCache = data || [];
    playerMarketNames = {};
    const sellerIds = [...new Set(playerMarketCache.map(r => r.seller_id))];
    if(sellerIds.length){
      const { data: profs } = await sb.from('profiles').select('id, username, display_name').in('id', sellerIds);
      (profs||[]).forEach(p => { playerMarketNames[p.id] = p.display_name || p.username; });
    }
    populatePlayerMarketSetFilter();
    populatePlayerMarketSellerFilter();
    applyPlayerMarketFilters();
  }catch(e){
    console.error(e);
    el.innerHTML = '<span style="color:#f87171">Could not load listings (check market_listings table)</span>';
  }
}

async function cancelMarketListing(listingId){
  if(!sb || !currentUser) return;
  try{
    const { data: row, error } = await sb.from('market_listings').select('*').eq('id', listingId).single();
    if(error) throw error;
    if(row.seller_id !== currentUser.id){ showToast('Not your listing'); return; }
    if(row.status !== 'open'){ showToast('Already closed'); return; }
    await sb.from('market_listings').update({ status: 'cancelled' }).eq('id', listingId);
    // Return card
    const cid = Number(row.card_id);
    colSet(state.collection, cid, colGet(state.collection, cid) + 1);
    if(row.grade != null){
      const g = getGrades(cid); g.push(Number(row.grade)); setGrades(cid, g);
    }
    save(); updateUI(); renderCollection(); renderBinder();
    showToast('Listing cancelled — card returned');
    loadPlayerMarket();
  }catch(e){
    console.error(e);
    showToast('Could not cancel');
  }
}




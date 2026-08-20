/* ===== Tuesday Trade-up: trade 3 cards for one random card of a better rarity ===== */
const TRADEUP_RARITY_ORDER = ['common','uncommon','epic','legendary'];
let tuSelected = []; // array of card ids currently picked for the trade (max 3)
let tuRarityFilter = 'all'; // rarity filter pill currently active in the browse list

// Per-event caps on completed trade-ups, by the rarity of cards traded IN.
// Resets automatically whenever the live "Tuesday Trade-up" scheduled event changes (i.e. when it ends and a new one begins).
const TRADEUP_LIMITS = { common:12, uncommon:6, epic:4, legendary:2 };
const TRADEUP_RARITY_DISPLAY = { common:'Common', uncommon:'Uncommon', epic:'Rare', legendary:'Rare Holo' };
function tuCurrentEventId(){
  try{
    const live = (typeof getLiveScheduledEvent === 'function') ? getLiveScheduledEvent() : null;
    return live ? live.id : null;
  }catch(e){ return null; }
}
function ensureTradeUpLimits(){
  const id = tuCurrentEventId();
  if(!state.tradeUpLimits || typeof state.tradeUpLimits !== 'object' || state.tradeUpLimits.eventId !== id){
    state.tradeUpLimits = { eventId: id, counts: { common:0, uncommon:0, epic:0, legendary:0 } };
  }
  if(!state.tradeUpLimits.counts || typeof state.tradeUpLimits.counts !== 'object'){
    state.tradeUpLimits.counts = { common:0, uncommon:0, epic:0, legendary:0 };
  }
  return state.tradeUpLimits;
}
function tuLimitFor(rarity){
  return TRADEUP_LIMITS[rarity] != null ? TRADEUP_LIMITS[rarity] : Infinity;
}
function tuUsed(rarity){
  const lim = ensureTradeUpLimits();
  return lim.counts[rarity] || 0;
}
function tuRemaining(rarity){
  const limit = tuLimitFor(rarity);
  if(limit === Infinity) return Infinity;
  return Math.max(0, limit - tuUsed(rarity));
}
function tuRecordTradeUp(rarity){
  const lim = ensureTradeUpLimits();
  lim.counts[rarity] = (lim.counts[rarity] || 0) + 1;
  state.tradeUpLimits = lim;
}

function tuRarityRank(card){
  const r = TRADEUP_RARITY_ORDER.indexOf((card && card.rarity) || 'common');
  return r < 0 ? 0 : r;
}
function tuCardTileHTML(card, remaining, picked, locked, compact){
  const safeName = String(card.name||'').replace(/"/g,'');
  const label = safeName + ' · ' + (card.rarityLabel||card.rarity) + (remaining!=null ? ' (×'+remaining+')' : '') + (locked ? ' — must match rarity of cards already picked' : '') + (picked ? ' — tap to remove' : '');
  const inner = card.art
    ? '<img src="'+card.art+'" alt="'+safeName+'">'
    : (card.emoji || '🃏');
  const badge = remaining!=null ? '<span class="tu-tile-badge">×'+remaining+'</span>' : '';
  const onclick = locked ? '' : (picked ? "tuRemovePick('"+card.id+"')" : "tuSelectCard('"+card.id+"')");
  const wrapStyle = locked ? 'opacity:.35;filter:grayscale(65%)' : '';
  return '<div class="tu-tile-wrap'+(locked ? ' tu-locked' : '')+(compact ? ' tu-compact' : '')+'" title="'+label+'" style="'+wrapStyle+'" onclick="'+onclick+'">'+
      '<div class="mini-card shown tu-tile">'+inner+badge+'</div>'+
      '<div class="tu-tile-name">'+safeName+'</div>'+
      '<div class="tu-tile-meta">'+(card.rarityLabel||card.rarity)+'</div>'+
    '</div>';
}
function tuSetRarityFilter(rarity){
  tuRarityFilter = rarity;
  renderTradeUpModal();
}
function closeTuRewardOverlay(){
  const overlay = document.getElementById('tu-reward-overlay');
  if(overlay) overlay.style.display = 'none';
}
function openTradeUpModal(){
  const modal = document.getElementById('tradeup-modal');
  if(!modal) return;
  tuSelected = [];
  tuRarityFilter = 'all';
  closeTuRewardOverlay();
  renderTradeUpModal();
  modal.classList.add('open');
}
function closeTradeUpModal(){
  const modal = document.getElementById('tradeup-modal');
  if(modal) modal.classList.remove('open');
}
function renderTradeUpModal(){
  const picksEl = document.getElementById('tu-picks');
  const listEl = document.getElementById('tu-collection-list');
  const filtersEl = document.getElementById('tu-rarity-filters');
  const countEl = document.getElementById('tu-count');
  const submitBtn = document.getElementById('tu-submit-btn');
  if(!picksEl || !listEl || !countEl || !submitBtn) return;

  countEl.textContent = tuSelected.length;
  submitBtn.disabled = tuSelected.length !== 3;

  const limitsStatusEl = document.getElementById('tu-limits-status');
  if(limitsStatusEl){
    limitsStatusEl.textContent = TRADEUP_RARITY_ORDER
      .map(r => (TRADEUP_RARITY_DISPLAY[r]||r)+': '+tuRemaining(r)+'/'+tuLimitFor(r)+' left')
      .join('  ·  ');
  }

  picksEl.innerHTML = tuSelected.length
    ? tuSelected.map(id => {
        const c = resolveCard(id);
        return c ? tuCardTileHTML(c, null, true) : '';
      }).join('')
    : '<span style="color:var(--muted);font-size:.85rem">Tap cards below to add them to the trade</span>';

  const usedCounts = {};
  tuSelected.forEach(id => { usedCounts[id] = (usedCounts[id]||0) + 1; });

  const owned = (typeof CARDS !== 'undefined' && state && state.collection)
    ? CARDS.filter(c => (colGet(state.collection, c) || 0) > 0)
    : [];

  // Once a card is picked, only cards of that same rarity can be added -
  // auto-lock the filter row to that rarity for clarity.
  const lockedRarity = tuSelected.length
    ? (resolveCard(tuSelected[0]) || {}).rarity
    : null;
  if(lockedRarity != null) tuRarityFilter = lockedRarity;

  // Build the rarity filter pills from the rarities actually present in the collection
  if(filtersEl){
    const rarityOrder = TRADEUP_RARITY_ORDER.slice();
    owned.forEach(c => { if(c.rarity && !rarityOrder.includes(c.rarity)) rarityOrder.push(c.rarity); });
    const seen = new Set();
    const presentRarities = owned.map(c => c.rarity).filter(r => {
      if(!r || seen.has(r)) return false;
      seen.add(r); return true;
    });
    const orderedPresent = rarityOrder.filter(r => presentRarities.includes(r));
    const pills = ['<button type="button" class="tu-rarity-pill'+(tuRarityFilter==='all'?' active':'')+'"'+(lockedRarity!=null?' disabled':'')+' onclick="tuSetRarityFilter(\'all\')">All</button>']
      .concat(orderedPresent.map(r => {
        const sample = owned.find(c => c.rarity === r);
        const rLabel = (sample && sample.rarityLabel) || r;
        const remaining = tuRemaining(r);
        const capped = remaining !== Infinity;
        const disabled = (lockedRarity != null && lockedRarity !== r) || remaining <= 0;
        const note = capped ? (remaining > 0 ? ' ('+remaining+' left)' : ' (limit reached)') : '';
        return '<button type="button" class="tu-rarity-pill'+(tuRarityFilter===r?' active':'')+'"'+(disabled?' disabled':'')+' onclick="tuSetRarityFilter(\''+r+'\')">'+rLabel+note+'</button>';
      }));
    filtersEl.innerHTML = pills.join('');
  }

  const searchInput = document.getElementById('tu-search');
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  let searched = searchTerm
    ? owned.filter(c => String(c.name||'').toLowerCase().includes(searchTerm))
    : owned;
  if(tuRarityFilter !== 'all'){
    searched = searched.filter(c => c.rarity === tuRarityFilter);
  }

  const tiles = searched.map(c => {
    const total = colGet(state.collection, c) || 0;
    const remaining = total - (usedCounts[c.id] || 0);
    if(remaining <= 0) return '';
    const locked = lockedRarity != null && c.rarity !== lockedRarity;
    return tuCardTileHTML(c, remaining, false, locked);
  }).filter(Boolean).join('');

  listEl.innerHTML = tiles || (searchTerm
    ? '<span style="color:var(--muted);font-size:.85rem">No cards match your search.</span>'
    : '<span style="color:var(--muted);font-size:.85rem">No cards available to trade yet.</span>');
}
function tuSelectCard(cardId){
  if(tuSelected.length >= 3){ showToast('You can only trade in 3 cards'); return; }
  const card = resolveCard(cardId);
  if(!card) return;
  if(tuRemaining(card.rarity) <= 0){
    showToast("You've used all "+tuLimitFor(card.rarity)+' '+(TRADEUP_RARITY_DISPLAY[card.rarity]||card.rarity)+' trade-ups for this event');
    return;
  }
  if(tuSelected.length){
    const firstCard = resolveCard(tuSelected[0]);
    if(firstCard && firstCard.rarity !== card.rarity){
      showToast('Trade-up requires 3 cards of the same rarity');
      return;
    }
  }
  const owned = colGet(state.collection, cardId) || 0;
  const alreadyUsed = tuSelected.filter(id => id === cardId).length;
  if(alreadyUsed >= owned){ showToast("You don't have another copy of that card"); return; }
  tuSelected.push(cardId);
  renderTradeUpModal();
}
function tuRemovePick(cardId){
  const idx = tuSelected.indexOf(cardId);
  if(idx >= 0) tuSelected.splice(idx, 1);
  renderTradeUpModal();
}
function tradeUpSubmit(){
  if(tuSelected.length !== 3){ showToast('Pick exactly 3 cards to trade'); return; }

  const counts = {};
  tuSelected.forEach(id => { counts[id] = (counts[id]||0) + 1; });
  for(const id in counts){
    if((colGet(state.collection, id) || 0) < counts[id]){
      showToast('Missing cards for this trade');
      renderTradeUpModal();
      return;
    }
  }

  const pickedCards = tuSelected.map(id => resolveCard(id)).filter(Boolean);
  const rarities = new Set(pickedCards.map(c => c.rarity));
  if(rarities.size !== 1){
    showToast('Trade-up requires 3 cards of the same rarity');
    renderTradeUpModal();
    return;
  }
  const tradeRarity = pickedCards[0].rarity;
  if(tuRemaining(tradeRarity) <= 0){
    showToast("You've used all "+tuLimitFor(tradeRarity)+' '+(TRADEUP_RARITY_DISPLAY[tradeRarity]||tradeRarity)+' trade-ups for this event');
    tuSelected = [];
    renderTradeUpModal();
    return;
  }
  const sourceRank = tuRarityRank(pickedCards[0]);
  const targetRank = Math.min(sourceRank + 1, TRADEUP_RARITY_ORDER.length - 1);
  const targetRarity = TRADEUP_RARITY_ORDER[targetRank];
  const eligibleForReward = c => {
    if(!c) return false;
    if(typeof PROMO_SET_NAME !== 'undefined' && c.set === PROMO_SET_NAME) return false;
    const rarityStr = String(c.rarity||'').toLowerCase();
    const rarityLabelStr = String(c.rarityLabel||'').toLowerCase();
    if(rarityStr.includes('promo') || rarityLabelStr.includes('promo')) return false;
    if(String(c.name||'').trim().toLowerCase() === 'charizard') return false;
    return true;
  };
  let pool = CARDS.filter(c => c.rarity === targetRarity && eligibleForReward(c));
  if(!pool.length) pool = CARDS.filter(c => c.rarity === TRADEUP_RARITY_ORDER[sourceRank] && eligibleForReward(c));
  if(!pool.length) pool = CARDS.filter(eligibleForReward);
  const reward = pool[Math.floor(Math.random() * pool.length)] || CARDS[0];

  for(const id in counts){
    colSet(state.collection, id, (colGet(state.collection, id) || 0) - counts[id]);
  }
  colSet(state.collection, reward.id, (colGet(state.collection, reward.id) || 0) + 1);
  tuRecordTradeUp(tradeRarity);

  tuSelected = [];
  if(typeof save === 'function') save();
  if(typeof updateUI === 'function') updateUI();
  if(typeof renderCollection === 'function') renderCollection();

  const overlay = document.getElementById('tu-reward-overlay');
  const cardEl = document.getElementById('tu-reward-card');
  if(overlay && cardEl){
    cardEl.innerHTML =
      '<div style="font-size:.8rem;color:var(--muted);margin-bottom:.65rem;letter-spacing:.4px;text-transform:uppercase">You traded up and got</div>'+
      '<div class="tcg-card full-art" style="width:min(78vw,280px);aspect-ratio:5/7;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 14px 44px rgba(0,0,0,.6)">'+
        (reward.art
          ? '<img class="full-card-img" src="'+reward.art+'" alt="'+String(reward.name||'').replace(/"/g,'')+'">'
          : tcgHTML(reward, true))+
      '</div>'+
      '<div class="tu-reward-name">'+String(reward.name||'')+'</div>'+
      '<div class="tu-reward-rarity">'+(reward.rarityLabel||reward.rarity)+'</div>'+
      '<div class="tu-reward-hint">Tap anywhere outside the card to continue</div>';
    overlay.style.display = 'flex';
  }
  showToast('Traded up for a '+(reward.rarityLabel||reward.rarity)+' '+reward.name+'!');
  renderTradeUpModal();
}



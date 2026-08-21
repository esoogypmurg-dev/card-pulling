/* ========== LIVE TRADE ROOM ========== */
let liveRoom = null;       // current room row
let liveChannel = null;    // supabase realtime channel
let liveIsCreator = false;

function randomRoomCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i=0;i<4;i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}

async function liveCreateRoom(){
  const msg = document.getElementById('live-lobby-msg');
  msg.textContent = '';
  if(!sb || !currentUser){
    msg.textContent = 'You must be logged in';
    return;
  }
  if(liveRoom){ msg.textContent = 'Leave the current room first'; return; }

  const code = randomRoomCode();
  try{
    const { data, error } = await sb.from('trade_rooms').insert({
      room_code: code,
      status: 'open',
      creator_id: currentUser.id,
      creator_offer: [],
      joiner_offer: [],
      creator_accepted: false,
      joiner_accepted: false
    }).select().single();
    if(error) throw error;
    liveRoom = data;
    liveIsCreator = true;
    enterLiveRoom();
  }catch(e){
    console.error(e);
    msg.textContent = 'Could not create room';
  }
}

async function liveJoinRoom(){
  const msg = document.getElementById('live-lobby-msg');
  msg.textContent = '';
  if(!sb || !currentUser){
    msg.textContent = 'You must be logged in';
    return;
  }
  const code = (document.getElementById('live-join-code').value || '').trim().toUpperCase();
  if(!code){ msg.textContent = 'Enter a room code'; return; }

  try{
    const { data, error } = await sb.from('trade_rooms')
      .select('*')
      .eq('room_code', code)
      .in('status', ['open','active'])
      .maybeSingle();
    if(error) throw error;
    if(!data){ msg.textContent = 'Room not found or already closed'; return; }
    if(data.creator_id === currentUser.id){ msg.textContent = 'You are already the host'; return; }
    if(data.joiner_id && data.joiner_id !== currentUser.id){ msg.textContent = 'Room is full'; return; }

    const { data: updated, error: upErr } = await sb.from('trade_rooms')
      .update({ joiner_id: currentUser.id, status: 'active' })
      .eq('id', data.id)
      .select().single();
    if(upErr) throw upErr;

    liveRoom = updated;
    liveIsCreator = false;
    enterLiveRoom();
  }catch(e){
    console.error(e);
    msg.textContent = 'Could not join room';
  }
}

function enterLiveRoom(){
  document.getElementById('live-trade-lobby').style.display = 'none';
  document.getElementById('live-trade-room').style.display = 'block';
  const badge = document.getElementById('live-trade-room-badge');
  if(badge) badge.style.display = 'flex';
  document.getElementById('live-room-code').textContent = liveRoom.room_code;
  const msg = document.getElementById('live-trade-msg');
  if(msg) msg.textContent = '';
  const nameEl = document.getElementById('tr-you-name');
  if(nameEl && currentUser) nameEl.textContent = currentUser.display_name || currentUser.username || 'You';
  if(typeof populateLiveSelect === 'function') populateLiveSelect();
  if(typeof populateTradePickerFilters === 'function') populateTradePickerFilters();
  if(typeof trPickerFilter === 'function') trPickerFilter();
  else if(typeof renderTradePicker === 'function') renderTradePicker();
  populateLiveSelect();
  livePartnerNames = { creator: null, joiner: null };
  if(typeof fetchLivePartnerNames === 'function') fetchLivePartnerNames();
  else if(typeof updateTradePartnerUI === 'function') updateTradePartnerUI();
  renderLiveOffers();
  subscribeLiveRoom();
  updateLiveStatus();
  // If user clicked "Trade this card" before joining, auto-add it
  if(window._pendingTradeCardId){
    const pid = window._pendingTradeCardId;
    window._pendingTradeCardId = null;
    liveAddCard(pid);
  }
}

function populateLiveSelect(){
  const sel = document.getElementById('live-my-select');
  if(!sel) return;
  const opts = buildOwnedCopyOptions();
  sel.innerHTML = '<option value="">Choose a card (raw or PSA)…</option>' +
    opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
}

function liveOfferCardHtml(o, removable){
  const c = (typeof resolveCard === 'function' ? resolveCard(o.cardId) : null)
    || (CARDS && CARDS.find(x => x.id === o.cardId || x.id === Number(o.cardId)))
    || null;
  const name = c ? c.name : '?';
  const art = c && c.art ? c.art : '';
  const rarity = c ? (c.rarity || '') : '';
  const g = (o.grade != null && o.grade !== '') ? Number(o.grade) : null;
  const gradeTag = g != null ? (' · PSA ' + g) : '';
  const inspectId = c ? (c.id != null ? c.id : o.cardId) : o.cardId;

  // Do not inject quoted JS arguments into onclick. Card IDs may be strings,
  // which can break the HTML attribute. Store them safely as data attributes.
  const encodedCardId = encodeURIComponent(String(o.cardId));
  const removeHint = removable
    ? ('<button type="button" class="live-remove" ' +
       'data-card-id="' + encodedCardId + '" ' +
       'data-grade="' + (g != null ? String(g) : '') + '" ' +
       'onpointerdown="event.stopPropagation()" ' +
       'onclick="return liveRemoveFromButton(event,this)" ' +
       'aria-label="Remove from trade" title="Remove from trade">✕</button>')
    : '';

  const safeId = String(inspectId).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const safeName = String(name).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  return '<div class="live-card-pick" data-rarity="' + rarity + '" data-card-id="' + String(inspectId).replace(/"/g,'&quot;') + '" onclick="liveInspectTableCard(event,\'' + safeId + '\')" title="Click to inspect ' + safeName + '">' 
    + (art ? ('<img src="' + art + '" alt="' + safeName + '">') : '')
    + '<div class="live-card-meta"><strong>' + name + gradeTag + '</strong><span>×' + (o.qty||1) + '</span></div>'
    + removeHint
    + '</div>';
}

function liveRemoveFromButton(event, button){
  if(event){
    event.preventDefault();
    event.stopPropagation();
  }
  if(!button) return false;
  const cardId = decodeURIComponent(button.dataset.cardId || '');
  const gradeRaw = button.dataset.grade;
  const grade = (gradeRaw != null && gradeRaw !== '') ? Number(gradeRaw) : null;
  if(!cardId){
    showToast('Could not identify that card');
    return false;
  }
  liveRemoveCard(cardId, grade);
  return false;
}

function liveInspectTableCard(e, cardId){
  // The remove button lives inside the clickable card. Never let a remove click open zoom.
  if(e && e.target && e.target.closest && e.target.closest('.live-remove')){
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  if(e){ e.preventDefault(); e.stopPropagation(); }
  let card = null;
  if(typeof resolveCard === 'function') card = resolveCard(cardId);
  if(!card && typeof CARDS !== 'undefined'){
    const n = Number(cardId);
    card = CARDS.find(x => x.id == cardId || x.id === n || x.key === cardId || String(x.id) === String(cardId)) || null;
  }
  if(!card){ showToast('Could not load that card'); return; }
  if(typeof openBinderInspect === 'function') openBinderInspect(card);
  else if(typeof openZoom === 'function') openZoom(card);
}

function renderLiveOffers(){
  if(!liveRoom) return;
  const myOffer = liveIsCreator ? (liveRoom.creator_offer||[]) : (liveRoom.joiner_offer||[]);
  const theirOffer = liveIsCreator ? (liveRoom.joiner_offer||[]) : (liveRoom.creator_offer||[]);
  const myAcc = liveIsCreator ? liveRoom.creator_accepted : liveRoom.joiner_accepted;
  const theirAcc = liveIsCreator ? liveRoom.joiner_accepted : liveRoom.creator_accepted;

  const myEl = document.getElementById('live-my-offer');
  const theirEl = document.getElementById('live-their-offer');
  if(myEl){
    myEl.classList.toggle('empty', !myOffer.length);
    myEl.classList.toggle('accepted', !!myAcc);
    const myBanner = myAcc ? '<div class="tr-zone-accept-banner">✓ ACCEPTED</div>' : '';
    myEl.innerHTML = myBanner + (myOffer.length ? myOffer.map(o => liveOfferCardHtml(o, true)).join('') : '');
  }
  if(theirEl){
    theirEl.classList.toggle('empty', !theirOffer.length);
    theirEl.classList.toggle('accepted', !!theirAcc);
    const theirBanner = theirAcc ? '<div class="tr-zone-accept-banner">✓ ACCEPTED</div>' : '';
    theirEl.innerHTML = theirBanner + (theirOffer.length ? theirOffer.map(o => liveOfferCardHtml(o, false)).join('') : '');
  }

  const youAcc = document.getElementById('live-you-accepted');
  const youNo = document.getElementById('tr-you-ready-no');
  if(youAcc) youAcc.style.display = myAcc ? 'inline' : 'none';
  if(youNo) youNo.style.display = myAcc ? 'none' : 'inline';
  const themAcc = document.getElementById('live-them-accepted');
  if(themAcc) themAcc.style.display = theirAcc ? 'inline' : 'none';
  const accBtn = document.getElementById('live-accept-btn');
  const canBtn = document.getElementById('live-cancel-accept-btn');
  if(accBtn) accBtn.style.display = myAcc ? 'none' : '';
  if(canBtn) canBtn.style.display = myAcc ? '' : 'none';
  const cnt = document.getElementById('tr-my-count');
  if(cnt) cnt.textContent = String(myOffer.length);
  if(typeof renderTradePicker === 'function') renderTradePicker();
  if(typeof updateTradePartnerUI === 'function') updateTradePartnerUI();
}

function updateLiveStatus(){
  const el = document.getElementById('live-room-status');
  if(!liveRoom) return;
  if(liveRoom.status === 'completed') el.textContent = 'Trade complete!';
  else if(liveRoom.joiner_id) el.textContent = 'Both players connected';
  else el.textContent = 'Waiting for friend…';
}


let trPickList = [];
let trPickIndex = 0;

function getOwnedCardsForTrade(){
  if(typeof CARDS === 'undefined' || !state || !state.collection) return [];
  return CARDS.filter(c => (colGet(state.collection, c) || 0) > 0)
    .sort((a,b) => (a.name||'').localeCompare(b.name||''));
}
function populateTradePickerFilters(){
  const cards = getOwnedCardsForTrade();
  const setSel = document.getElementById('tr-set-filter');
  const rarSel = document.getElementById('tr-rarity-filter');

  if(setSel){
    const current = setSel.value || 'all';
    const sets = [...new Set(cards.map(c => c.set).filter(Boolean))]
      .sort((a,b) => String(a).localeCompare(String(b)));
    setSel.innerHTML = '<option value="all">All Sets</option>' + sets.map(v =>
      '<option value="' + escapeTradeFilterValue(v) + '">' + escapeTradeFilterText(v) + '</option>'
    ).join('');
    setSel.value = sets.includes(current) ? current : 'all';
  }

  if(rarSel){
    const current = rarSel.value || 'all';
    const rarities = [...new Set(cards.map(c => c.rarityLabel || c.rarity).filter(Boolean))]
      .sort((a,b) => String(a).localeCompare(String(b)));
    rarSel.innerHTML = '<option value="all">All Rarities</option>' + rarities.map(v =>
      '<option value="' + escapeTradeFilterValue(v) + '">' + escapeTradeFilterText(v) + '</option>'
    ).join('');
    rarSel.value = rarities.includes(current) ? current : 'all';
  }
}

function escapeTradeFilterText(v){
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeTradeFilterValue(v){
  return escapeTradeFilterText(v).replace(/'/g,'&#39;');
}

function trPickerFilter(){
  const q = ((document.getElementById('tr-search')||{}).value || '').toLowerCase().trim();
  const setValue = ((document.getElementById('tr-set-filter')||{}).value || 'all');
  const rarityValue = ((document.getElementById('tr-rarity-filter')||{}).value || 'all');
  let cards = getOwnedCardsForTrade();

  if(setValue !== 'all') cards = cards.filter(c => String(c.set || '') === setValue);
  if(rarityValue !== 'all') cards = cards.filter(c => String(c.rarityLabel || c.rarity || '') === rarityValue);
  if(q) cards = cards.filter(c =>
    (c.name||'').toLowerCase().includes(q) ||
    String(c.cardNumber||'').toLowerCase().includes(q) ||
    (c.set||'').toLowerCase().includes(q) ||
    String(c.rarityLabel||c.rarity||'').toLowerCase().includes(q)
  );

  trPickList = cards;
  trPickIndex = 0;
  renderTradePicker();
}
function trPickerStep(dir){
  if(!trPickList.length) return;
  trPickIndex = (trPickIndex + dir + trPickList.length) % trPickList.length;
  renderTradePicker();
}
function renderTradePicker(){
  const hasSearch = !!((document.getElementById('tr-search')||{}).value || '').trim();
  const hasSetFilter = ((document.getElementById('tr-set-filter')||{}).value || 'all') !== 'all';
  const hasRarityFilter = ((document.getElementById('tr-rarity-filter')||{}).value || 'all') !== 'all';
  if(!trPickList.length && !hasSearch && !hasSetFilter && !hasRarityFilter){
    trPickList = getOwnedCardsForTrade();
    trPickIndex = 0;
  }
  const artEl = document.getElementById('tr-single-art');
  const nameEl = document.getElementById('tr-single-name');
  const idxEl = document.getElementById('tr-single-idx');
  if(!artEl) return;
  const card = trPickList[trPickIndex];
  if(!card){
    artEl.className = 'tr-single-art empty';
    artEl.innerHTML = 'No owned cards';
    if(nameEl) nameEl.textContent = '';
    if(idxEl) idxEl.textContent = '0 / 0';
    return;
  }
  artEl.className = 'tr-single-art';
  if(card.art){
    artEl.innerHTML = '<img src="' + card.art + '" alt="' + (card.name||'') + '">';
  } else {
    artEl.innerHTML = '<div style="display:grid;place-items:center;height:100%;font-size:2.5rem">' + (card.emoji||'🃏') + '</div>';
  }
  if(nameEl) nameEl.textContent = (card.cardNumber ? card.cardNumber + ' · ' : '') + (card.name||'');
  if(idxEl) idxEl.textContent = (trPickIndex + 1) + ' / ' + trPickList.length;
}
function trPlaceSelected(){
  const card = trPickList[trPickIndex];
  if(!card){ showToast('No card selected'); return; }
  liveAddCard(card.id);
}
function renderTradeHand(){ /* legacy no-op — single picker under profile */ }
let livePartnerNames = { creator: null, joiner: null };

async function fetchLivePartnerNames(){
  if(!sb || !liveRoom) return;
  const ids = [liveRoom.creator_id, liveRoom.joiner_id].filter(Boolean);
  if(!ids.length) return;
  try{
    const { data } = await sb.from('profiles').select('id, username, display_name').in('id', ids);
    (data || []).forEach(p => {
      const nm = p.display_name || p.username || 'Trainer';
      if(p.id === liveRoom.creator_id) livePartnerNames.creator = nm;
      if(p.id === liveRoom.joiner_id) livePartnerNames.joiner = nm;
    });
  }catch(e){ console.warn('partner names', e); }
  updateTradePartnerUI();
}

function updateTradePartnerUI(){
  if(!liveRoom) return;
  const joined = !!liveRoom.joiner_id;
  const nameEl = document.getElementById('tr-them-name');
  const onlineEl = document.getElementById('tr-them-online');
  const waitEl = document.getElementById('tr-them-waiting');
  const joinedPanel = document.getElementById('tr-them-joined-panel');
  const countEl = document.getElementById('tr-them-count');
  const readyEl = document.getElementById('tr-them-ready');
  const theirOffer = liveIsCreator ? (liveRoom.joiner_offer||[]) : (liveRoom.creator_offer||[]);
  const theirAcc = liveIsCreator ? liveRoom.joiner_accepted : liveRoom.creator_accepted;
  if(countEl) countEl.textContent = String(theirOffer.length);
  if(readyEl){
    readyEl.textContent = joined ? (theirAcc ? 'Yes ✓' : 'No') : '—';
    readyEl.style.color = theirAcc ? '#22c55e' : 'var(--muted)';
  }
  if(joined){
    const partnerId = liveIsCreator ? liveRoom.joiner_id : liveRoom.creator_id;
    const partnerName = liveIsCreator
      ? (livePartnerNames.joiner || liveRoom.joiner_name || 'Partner')
      : (livePartnerNames.creator || liveRoom.creator_name || 'Host');
    if(nameEl) nameEl.textContent = partnerName;
    // If we still only have generic name, fetch
    if((partnerName === 'Partner' || partnerName === 'Host') && partnerId){
      fetchLivePartnerNames();
    }
    if(onlineEl){ onlineEl.textContent = '● ONLINE'; onlineEl.style.color = '#4ade80'; }
    if(waitEl) waitEl.style.display = 'none';
    if(joinedPanel) joinedPanel.style.display = 'flex';
  } else {
    if(nameEl) nameEl.textContent = 'Waiting…';
    if(onlineEl){ onlineEl.textContent = '○ OFFLINE'; onlineEl.style.color = 'var(--muted)'; }
    if(waitEl) waitEl.style.display = 'flex';
    if(joinedPanel) joinedPanel.style.display = 'none';
  }
}

async function liveAddCard(forcedCardId){
  if(!liveRoom || !sb) return;
  const sel = document.getElementById('live-my-select');
  let cardId, grade = null;
  if(forcedCardId != null){
    cardId = Number(forcedCardId);
    grade = null; // zoom "trade this" adds a raw/any copy
  } else {
    const parsed = parseCopyOptionValue(sel && sel.value);
    if(!parsed) return;
    cardId = parsed.cardId;
    grade = parsed.grade;
  }
  if(!cardId) return;
  const owned = colGet(state.collection, cardId);
  if(owned < 1){ showToast('You do not own that card'); return; }

  let offer = liveIsCreator ? [...(liveRoom.creator_offer||[])] : [...(liveRoom.joiner_offer||[])];
  if(grade != null){
    const grades = getGrades(cardId);
    const used = offer.filter(o => o.cardId === cardId && Number(o.grade) === Number(grade)).reduce((s,o)=>s+(o.qty||1),0);
    if(used >= grades.filter(g => Number(g)===Number(grade)).length){
      showToast('That PSA copy is already in the offer'); return;
    }
    offer.push({ cardId, qty: 1, grade: Number(grade) });
  } else {
    const raw = ungradedCount(cardId);
    const usedRaw = offer.filter(o => o.cardId === cardId && (o.grade==null||o.grade==='')).reduce((s,o)=>s+(o.qty||1),0);
    // If forced from zoom with no raw, still allow if owned (legacy)
    if(raw > 0 && usedRaw + 1 > raw){ showToast('Not enough raw copies'); return; }
    if(raw < 1 && owned < 1){ showToast('Not enough copies'); return; }
    const existing = offer.find(o => o.cardId === cardId && (o.grade==null||o.grade===''));
    if(existing) existing.qty += 1;
    else offer.push({ cardId, qty: 1, grade: null });
  }

  const patch = liveIsCreator
    ? { creator_offer: offer, creator_accepted: false, joiner_accepted: false }
    : { joiner_offer: offer, creator_accepted: false, joiner_accepted: false };

  const { data, error } = await sb.from('trade_rooms').update(patch).eq('id', liveRoom.id).select().single();
  if(error){ console.error(error); showToast('Could not update offer'); return; }
  liveRoom = data;
  renderLiveOffers();
  if(sel) sel.value = '';
  const card = resolveCard(cardId);
  if(card) showToast('Added ' + card.name + (grade!=null?' PSA '+grade:'') + ' to your offer');
}

async function liveRemoveCard(cardId, grade){
  if(!liveRoom || !sb){ showToast('Not in a trade room'); return; }
  // Clone offer deeply enough to mutate qty
  let offer = (liveIsCreator ? (liveRoom.creator_offer||[]) : (liveRoom.joiner_offer||[])).map(o => Object.assign({}, o));
  const g = (grade != null && grade !== 'null' && grade !== '' && !isNaN(Number(grade))) ? Number(grade) : null;
  function sameId(a,b){
    if(a == null || b == null) return false;
    if(String(a) === String(b)) return true;
    const na = Number(a), nb = Number(b);
    return !isNaN(na) && !isNaN(nb) && na === nb;
  }
  let removed = false;
  for(let i = 0; i < offer.length; i++){
    const o = offer[i];
    if(!sameId(o.cardId, cardId)) continue;
    const og = (o.grade != null && o.grade !== '') ? Number(o.grade) : null;
    if(og !== g) continue;
    // X removes the whole offered entry from the table, regardless of quantity.
    offer.splice(i, 1);
    removed = true;
    break;
  }
  if(!removed){
    // Fallback: remove first matching cardId regardless of grade
    for(let i = 0; i < offer.length; i++){
      if(sameId(offer[i].cardId, cardId)){
        offer.splice(i, 1);
        removed = true;
        break;
      }
    }
  }
  if(!removed){ showToast('Could not remove that card'); return; }
  const patch = liveIsCreator
    ? { creator_offer: offer, creator_accepted: false, joiner_accepted: false }
    : { joiner_offer: offer, creator_accepted: false, joiner_accepted: false };
  const { data, error } = await sb.from('trade_rooms').update(patch).eq('id', liveRoom.id).select().single();
  if(error){ console.error(error); showToast('Could not update offer'); return; }
  liveRoom = data;
  renderLiveOffers();
  showToast('Removed from table');
}

async function liveAccept(){
  if(!liveRoom || !sb) return;
  const myOffer = liveIsCreator ? (liveRoom.creator_offer||[]) : (liveRoom.joiner_offer||[]);
  const theirOffer = liveIsCreator ? (liveRoom.joiner_offer||[]) : (liveRoom.creator_offer||[]);
  if(!myOffer.length && !theirOffer.length){
    document.getElementById('live-trade-msg').textContent = 'Add at least one card on either side';
    return;
  }

  const patch = liveIsCreator ? { creator_accepted: true } : { joiner_accepted: true };
  const { data, error } = await sb.from('trade_rooms').update(patch).eq('id', liveRoom.id).select().single();
  if(error){ console.error(error); return; }
  liveRoom = data;
  renderLiveOffers();

  // If both accepted → execute
  if(liveRoom.creator_accepted && liveRoom.joiner_accepted){
    await liveExecuteTrade();
  } else {
    document.getElementById('live-trade-msg').textContent = 'Waiting for the other player to accept…';
  }
}

async function liveCancelAccept(){
  if(!liveRoom || !sb) return;
  const patch = liveIsCreator ? { creator_accepted: false } : { joiner_accepted: false };
  const { data, error } = await sb.from('trade_rooms').update(patch).eq('id', liveRoom.id).select().single();
  if(error){ console.error(error); return; }
  liveRoom = data;
  renderLiveOffers();
  document.getElementById('live-trade-msg').textContent = '';
}

let liveExecuting = false;


function playTradeCollectAnimation(creatorOffer, joinerOffer){
  return new Promise(resolve => {
    try{
      // Only the cards THIS player is receiving (the other side's offer)
      const theirOffer = liveIsCreator ? (joinerOffer||[]) : (creatorOffer||[]);
      const layer = document.createElement('div');
      layer.className = 'tr-fly-layer';
      document.body.appendChild(layer);

      const label = document.createElement('div');
      label.className = 'tr-collect-label';
      label.textContent = '→ COLLECTION';
      layer.appendChild(label);
      requestAnimationFrame(() => label.classList.add('show'));

      // Source cards: only from their zone (what we receive)
      const theirZone = document.getElementById('live-their-offer');
      let picks = theirZone ? [...theirZone.querySelectorAll('.live-card-pick')] : [];
      // If empty DOM (already cleared), synthesize from offer data
      if(!picks.length && theirOffer.length){
        picks = theirOffer.map(o => {
          const c = (typeof resolveCard === 'function' ? resolveCard(o.cardId) : null)
            || (CARDS && CARDS.find(x => x.id == o.cardId));
          const fake = document.createElement('div');
          fake.className = 'live-card-pick';
          fake.style.position = 'fixed';
          fake.style.left = (window.innerWidth / 2 - 40) + 'px';
          fake.style.top = (window.innerHeight / 2 - 56) + 'px';
          fake.style.width = '80px';
          fake.style.height = '112px';
          if(c && c.art) fake.innerHTML = '<img src="' + c.art + '" alt="">';
          document.body.appendChild(fake);
          return fake;
        });
      }

      if(!picks.length){
        setTimeout(() => { layer.remove(); resolve(); }, 600);
        return;
      }

      // Fly up toward the Collection label (center-top)
      const destX = window.innerWidth / 2;
      const destY = window.innerHeight * 0.18;
      picks.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const img = el.querySelector('img');
        const clone = document.createElement('div');
        clone.className = 'tr-fly-card';
        clone.style.left = r.left + 'px';
        clone.style.top = r.top + 'px';
        clone.style.width = Math.max(r.width, 70) + 'px';
        if(img) clone.innerHTML = '<img src="' + img.src + '" alt="">';
        const dx = destX - r.left - r.width / 2;
        const dy = destY - r.top - r.height / 2;
        clone.style.setProperty('--fx', dx + 'px');
        clone.style.setProperty('--fy', dy + 'px');
        layer.appendChild(clone);
        setTimeout(() => clone.classList.add('fly-out'), 100 + i * 100);
        el.style.opacity = '0';
      });
      setTimeout(() => {
        // clean synthetic nodes
        picks.forEach(el => { if(el.parentNode === document.body) el.remove(); });
        layer.remove();
        resolve();
      }, 120 + picks.length * 100 + 1150);
    }catch(e){
      console.warn('trade anim', e);
      resolve();
    }
  });
}

async function liveExecuteTrade(){
  if(liveExecuting) return;
  liveExecuting = true;
  const msg = document.getElementById('live-trade-msg');
  msg.textContent = 'Completing trade…';
  msg.style.color = 'var(--gold)';

  try{
    // Re-fetch room so we don't double-execute a completed one
    const { data: roomNow } = await sb.from('trade_rooms').select('*').eq('id', liveRoom.id).single();
    if(!roomNow || roomNow.status === 'completed'){
      msg.textContent = '✓ Trade already completed.';
      msg.style.color = '#22c55e';
      setTimeout(() => liveLeaveRoom(), 1500);
      return;
    }

    const creatorOffer = roomNow.creator_offer || [];
    const joinerOffer = roomNow.joiner_offer || [];

    const { data: profiles, error } = await sb.from('profiles')
      .select('*')
      .in('id', [roomNow.creator_id, roomNow.joiner_id]);
    if(error) throw error;
    const creator = profiles.find(p => p.id === roomNow.creator_id);
    const joiner = profiles.find(p => p.id === roomNow.joiner_id);
    if(!creator || !joiner) throw new Error('Players not found');

    function normCol(col){
      const out = {};
      for(const [k,v] of Object.entries(col || {})){
        const qty = Number(v) || 0;
        if(qty <= 0) continue;
        const key = toCardKey(k) || String(k);
        out[key] = (out[key] || 0) + qty;
      }
      return out;
    }
    let creatorCol = normCol(creator.collection);
    let joinerCol = normCol(joiner.collection);
    let creatorGrades = gradesGetMap(creator.stats);
    let joinerGrades = gradesGetMap(joiner.stats);

    function apply(fromCol, toCol, fromGrades, toGrades, offer){
      for(const o of offer){
        const id = o.cardId;
        const qty = Number(o.qty) || 0;
        if(qty <= 0) continue;
        // Collection keys are stable strings (e.g. "BS-004"), not raw numeric ids
        const have = colGet(fromCol, id);
        if(have < qty){
          const label = (resolveCard(id) && resolveCard(id).name) || ('#' + id);
          throw new Error('Not enough cards (need ' + qty + ' of ' + label + ', have ' + have + ')');
        }
        colSet(fromCol, id, have - qty);
        colSet(toCol, id, colGet(toCol, id) + qty);
        if(o.grade != null && o.grade !== ''){
          for(let i=0;i<qty;i++){
            if(!gradesRemoveOne(fromGrades, id, Number(o.grade))){
              throw new Error('Missing graded copy PSA '+o.grade+' of '+((resolveCard(id)||{}).name||id));
            }
            gradesAddOne(toGrades, id, Number(o.grade));
          }
        }
      }
    }
    apply(creatorCol, joinerCol, creatorGrades, joinerGrades, creatorOffer);
    apply(joinerCol, creatorCol, joinerGrades, creatorGrades, joinerOffer);

    const creatorStats = Object.assign({}, creator.stats || {}, { grades: creatorGrades });
    const joinerStats = Object.assign({}, joiner.stats || {}, { grades: joinerGrades });
    await sb.from('profiles').update({ collection: creatorCol, stats: creatorStats }).eq('id', creator.id);
    await sb.from('profiles').update({ collection: joinerCol, stats: joinerStats }).eq('id', joiner.id);

    await sb.from('trade_rooms').update({ status: 'completed' }).eq('id', roomNow.id);

    if(currentUser.id === creator.id){
      state.collection = creatorCol;
      state.grades = creatorGrades;
    } else {
      state.collection = joinerCol;
      state.grades = joinerGrades;
    }
    if(typeof ensureStateDefaults === 'function') ensureStateDefaults();
    save();
    updateUI();
    renderCollection();
    renderSellList();
    renderBinder();

    msg.textContent = '✓ Trade complete! Cards have been exchanged.';
    msg.style.color = '#22c55e';
    state.stats = state.stats || {};
    state.stats.tradesCompleted = (Number(state.stats.tradesCompleted)||0) + 1;
    showToast('Trade complete!');
    await playTradeCollectAnimation(creatorOffer, joinerOffer);
    setTimeout(() => liveLeaveRoom(), 400);
  }catch(e){
    console.error(e);
    msg.textContent = 'Trade failed: ' + (e.message || 'unknown error');
    msg.style.color = '#f87171';
    try{
      await sb.from('trade_rooms').update({ creator_accepted: false, joiner_accepted: false }).eq('id', liveRoom.id);
    }catch(_){}
  }finally{
    liveExecuting = false;
  }
}

function subscribeLiveRoom(){
  if(liveChannel){
    sb.removeChannel(liveChannel);
    liveChannel = null;
  }
  if(!sb || !liveRoom) return;

  liveChannel = sb.channel('room-' + liveRoom.id)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'trade_rooms',
      filter: `id=eq.${liveRoom.id}`
    }, payload => {
      liveRoom = payload.new;
      if(liveRoom.joiner_id && !livePartnerNames.joiner) fetchLivePartnerNames();
      renderLiveOffers();
      updateLiveStatus();
      if(liveRoom.status === 'completed'){
        // Refresh local collection in case the other side executed
        if(currentUser){
          sb.from('profiles').select('collection').eq('id', currentUser.id).single()
            .then(({ data }) => {
              if(data){
                state.collection = data.collection || {};
                if(typeof ensureStateDefaults === 'function') ensureStateDefaults();
                save(); updateUI(); renderCollection(); renderSellList(); renderBinder();
              }
            });
        }
        const msg = document.getElementById('live-trade-msg');
        if(msg){ msg.textContent = '✓ Trade complete!'; msg.style.color = '#22c55e'; }
        const co = liveRoom.creator_offer || [];
        const jo = liveRoom.joiner_offer || [];
        if(typeof playTradeCollectAnimation === 'function'){
          playTradeCollectAnimation(co, jo).then(() => setTimeout(() => liveLeaveRoom(), 300));
        } else {
          setTimeout(() => liveLeaveRoom(), 1800);
        }
      } else if(liveRoom.creator_accepted && liveRoom.joiner_accepted && liveRoom.status !== 'completed'){
        // Both accepted — only creator executes to avoid double-run
        if(liveIsCreator) liveExecuteTrade();
      }
    })
    .subscribe();
}

async function liveLeaveRoom(){
  if(liveChannel){
    sb.removeChannel(liveChannel);
    liveChannel = null;
  }
  if(liveRoom && sb && liveRoom.status !== 'completed'){
    // Optional: mark cancelled if we are the only one / creator
    try{
      await sb.from('trade_rooms').update({ status: 'cancelled' }).eq('id', liveRoom.id);
    }catch(e){}
  }
  liveRoom = null;
  liveIsCreator = false;
  document.getElementById('live-trade-room').style.display = 'none';
  const _trBadge = document.getElementById('live-trade-room-badge');
  if(_trBadge) _trBadge.style.display = 'none';
  document.getElementById('live-trade-lobby').style.display = 'block';
  document.getElementById('live-lobby-msg').textContent = '';
  document.getElementById('live-join-code').value = '';
}

async function doLogout(){
  try{ stopPlayerPresence(); }catch(_){}
  try{ if(typeof stopMailWatcher === 'function') stopMailWatcher(); }catch(_){}
  try{ if(typeof stopTradeRequestWatcher === 'function') stopTradeRequestWatcher(); }catch(_){}
  try{ if(typeof stopPullAlertWatcher === 'function') stopPullAlertWatcher(); }catch(_){}
  try{ if(typeof hidePullAlert === 'function') hidePullAlert(); }catch(_){}
  try{ if(typeof liveLeaveRoom === 'function') liveLeaveRoom(); }catch(_){}
  try{ if(typeof lwLeaveEvent === 'function') await lwLeaveEvent(); }catch(_){}
  try{ if(sb) await sb.auth.signOut(); }catch(e){ console.warn('signOut', e); }

  incomingTradeQueue = [];
  incomingTradeCurrent = null;
  tradeNoticeQueue = [];
  tradeNoticeCurrent = null;
  const itm = document.getElementById('incoming-trade-modal');
  if(itm) itm.classList.remove('open');
  const tnm = document.getElementById('trade-notice-modal');
  if(tnm) tnm.classList.remove('open');
  currentUser = null;
  // Reset so next person doesn't see previous collection
  state = {money:25.00, packs:0, collection:{}, pendingOffers:{}, stats:{packsOpened:0,sells:0,holosPulled:0}, claimed:{}, dailyClaim:null, wantList:[], marketLastRefresh:0, marketHistory:[], marketOffersCache:null, tradeUpLimits:null};
  try{ localStorage.removeItem('pokemonCardsBaseSet'); }catch(_){}

  const login = document.getElementById('login-screen');
  if(login) login.classList.remove('hidden');
  const userEl = document.getElementById('login-username');
  const pinEl = document.getElementById('login-pin');
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');
  if(userEl) userEl.value = '';
  if(pinEl) pinEl.value = '';
  if(errEl) errEl.textContent = '';
  if(btn){ btn.disabled = false; btn.textContent = 'Sign In'; }
  const badge = document.getElementById('user-badge');
  if(badge) badge.innerHTML = '';
  const navAdmin = document.getElementById('nav-admin');
  if(navAdmin) navAdmin.style.display = 'none';
  showToast('Logged out');
}

function buildZoomCopies(cardId){
  const owned = colGet(state.collection, cardId);
  const grades = getGrades(cardId).map(Number);
  const copies = [];
  // Graded copies first (highest grade first for flex), then raw
  grades.slice().sort((a,b)=>b-a).forEach(g => copies.push({ grade: g }));
  const raw = Math.max(0, owned - grades.length);
  for(let i = 0; i < raw; i++) copies.push({ grade: null });
  if(!copies.length && owned > 0) copies.push({ grade: null });
  return copies;
}

function currentZoomCopy(){
  return zoomCopies[zoomCopyIndex] || { grade: null };
}



/* ========== PRICE RESEARCH / CATALOG ========== */
const RESEARCH_MS = 5 * 60 * 1000; // 5 minutes (zoom / binder path only)
const RESEARCH_FEE_RATE = 0.05;
const RESEARCH_FEE_MIN = 0.25;

function isPriceUnlocked(cardId){
  return !!(state.priceUnlocked && state.priceUnlocked[cardId]);
}
function researchFeeForCard(card){
  const base = Math.max(0, Number(card && card.price) || 0);
  return Math.max(RESEARCH_FEE_MIN, +(base * RESEARCH_FEE_RATE).toFixed(2));
}
function formatCardPrice(card, grade){
  if(!card) return '???';
  if(!isPriceUnlocked(card.id)) return '???';
  const v = grade != null ? cardMarketValue(card, grade) : (Number(card.price)||0);
  return '$'+Number(v).toFixed(2);
}
function getResearchJob(cardId){
  if(!state.researchJobs) return null;
  return state.researchJobs[cardId] || null;
}
function researchTimeLeft(cardId){
  const job = getResearchJob(cardId);
  if(!job || !job.doneAt) return 0;
  return Math.max(0, job.doneAt - Date.now());
}
function completeResearchJobs(){
  if(!state.researchJobs) return false;
  let changed = false;
  const now = Date.now();
  Object.keys(state.researchJobs).forEach(id => {
    const job = state.researchJobs[id];
    if(job && job.doneAt && job.doneAt <= now){
      if(!state.priceUnlocked) state.priceUnlocked = {};
      state.priceUnlocked[id] = true;
      delete state.researchJobs[id];
      changed = true;
      const card = CARDS.find(c => String(c.id) === String(id));
      showToast('Research complete: '+(card ? card.name : 'card')+' price unlocked!');
    }
  });
  if(changed){ save(); }
  return changed;
}

/** Paid timed research — from collection/binder card zoom only */
function startResearch(cardId){
  completeResearchJobs();
  const card = CARDS.find(c => c.id === cardId || String(c.id) === String(cardId));
  if(!card) return;
  if(isPriceUnlocked(card.id)){ showToast('Already researched'); return; }
  if((colGet(state.collection, card)) < 1){ showToast('You must own the card to research it'); return; }
  if(getResearchJob(card.id)){ showToast('Research already in progress'); return; }
  const fee = researchFeeForCard(card);
  const freeResearch = !!(state.luckBuffs && state.luckBuffs.freeResearch);
  if(!freeResearch && state.money < fee){ showToast('Not enough money for research'); return; }
  if(freeResearch){
    state.luckBuffs.freeResearch = false;
  } else {
    state.money = Math.round((state.money - fee)*100)/100;
  }
  if(!state.researchJobs) state.researchJobs = {};
  // Free research from wheel completes instantly
  if(freeResearch){
    if(!state.priceUnlocked) state.priceUnlocked = {};
    state.priceUnlocked[card.id] = true;
    save(); updateUI();
    if(typeof renderCatalog === 'function') renderCatalog();
    if(zoomCardId === card.id) renderZoomCopyUI(card);
    showToast('Luck Wheel research complete — price unlocked!');
    return;
  }
  state.researchJobs[card.id] = { doneAt: Date.now() + RESEARCH_MS, fee };
  save(); updateUI();
  if(typeof renderCatalog === 'function') renderCatalog();
  if(zoomCardId === card.id) renderZoomCopyUI(card);
  showToast('Lab research started · 5 min (fee charged)');
}
function startResearchFromZoom(){
  if(zoomCardId == null) return;
  startResearch(zoomCardId);
}
function researchStatusText(card){
  if(isPriceUnlocked(card.id)) return 'Price known';
  const left = researchTimeLeft(card.id);
  if(left > 0){
    const s = Math.ceil(left/1000);
    return 'Researching '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  }
  return 'Research (5% · 5 min)';
}

/* Catalog: free confirm-by-typing the listed price */
let _catalogConfirmId = null;
function openCatalogConfirm(cardId){
  const card = CARDS.find(c => c.id === cardId || String(c.id) === String(cardId));
  if(!card) return;
  if(isPriceUnlocked(card.id)){ showToast('Already unlocked'); return; }
  if((colGet(state.collection, card)) < 1){ showToast('Own the card to confirm its price'); return; }
  _catalogConfirmId = card.id;
  const modal = document.getElementById('catalog-confirm-modal');
  const name = document.getElementById('cc-card-name');
  const input = document.getElementById('cc-price-input');
  if(name) name.textContent = (card.cardNumber ? card.cardNumber+' ' : '') + card.name + ' · look it up, then type the price';
  if(input){ input.value = ''; }
  if(modal) modal.style.display = 'flex';
  if(input) setTimeout(() => input.focus(), 50);
}
function closeCatalogConfirm(){
  const modal = document.getElementById('catalog-confirm-modal');
  if(modal) modal.style.display = 'none';
  _catalogConfirmId = null;
}
function openKidPriceGuide(){
  const modal = document.getElementById('kid-price-guide-modal');
  const search = document.getElementById('kid-guide-search');
  if(search) search.value = '';
  renderKidPriceGuide();
  if(modal) modal.style.display = 'flex';
  if(search) setTimeout(() => search.focus(), 40);
}
function closeKidPriceGuide(){
  const modal = document.getElementById('kid-price-guide-modal');
  if(modal) modal.style.display = 'none';
}
function renderKidPriceGuide(){
  const box = document.getElementById('kid-guide-list');
  if(!box) return;
  const q = ((document.getElementById('kid-guide-search')||{}).value || '').trim().toLowerCase();
  const sets = (SETS && SETS.length) ? SETS.map(s => s.name) : [...new Set((CARDS||[]).map(c => c.set).filter(Boolean))];
  const order = ['Base Set','Jungle','Fossil','Wizards Black Star Promos'];
  sets.sort((a,b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if(ia >= 0 || ib >= 0) return (ia<0?99:ia) - (ib<0?99:ib);
    return a.localeCompare(b);
  });
  let html = '';
  sets.forEach(setName => {
    let list = (CARDS||[]).filter(c => c.set === setName);
    if(q){
      list = list.filter(c =>
        (c.name||'').toLowerCase().includes(q) ||
        String(c.cardNumber||'').toLowerCase().includes(q)
      );
    }
    if(!list.length) return;
    list.sort((a,b) => {
      const na = parseInt(a.cardNumber,10), nb = parseInt(b.cardNumber,10);
      if(!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a.cardNumber||'').localeCompare(String(b.cardNumber||''));
    });
    const setLabel = setName === 'Wizards Black Star Promos' ? 'Black Star Promos' : setName;
    html += '<div style="padding:.55rem .7rem .25rem;font-weight:800;color:var(--gold);font-size:.82rem;position:sticky;top:0;background:#12141c;border-bottom:1px solid #2a314d">'+setLabel+'</div>';
    html += list.map(c => {
      const price = (Number(c.price)||0).toFixed(2);
      return '<div style="display:grid;grid-template-columns:3rem 1fr auto;gap:.5rem;align-items:center;padding:.4rem .7rem;border-bottom:1px solid #1a1f2e;font-size:.85rem">'+
        '<span style="color:var(--muted);font-variant-numeric:tabular-nums">'+(c.cardNumber||'')+'</span>'+
        '<span style="font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+String(c.name||'').replace(/</g,'&lt;')+
        ' <span style="color:var(--muted);font-weight:600;font-size:.72rem">'+(c.rarityLabel||c.rarity||'')+'</span></span>'+
        '<span style="font-weight:800;color:var(--gold);white-space:nowrap">$'+price+'</span></div>';
    }).join('');
  });
  box.innerHTML = html || '<div style="padding:1rem;color:var(--muted);text-align:center">No cards match</div>';
}
function parsePriceInput(str){
  if(str == null) return NaN;
  const cleaned = String(str).replace(/[^0-9.]/g,'').trim();
  if(!cleaned) return NaN;
  return Number(cleaned);
}
function submitCatalogConfirm(){
  if(_catalogConfirmId == null) return;
  const card = resolveCard(_catalogConfirmId);
  if(!card){ closeCatalogConfirm(); return; }
  const input = document.getElementById('cc-price-input');
  const typed = parsePriceInput(input && input.value);
  const actual = Number(card.price) || 0;
  if(isNaN(typed)){ showToast('Enter a price'); return; }
  // Allow small rounding tolerance (1 cent or 0.5%)
  const tol = Math.max(0.01, actual * 0.005);
  if(Math.abs(typed - actual) > tol){
    showToast('That doesn\'t match the catalog — check the guide and try again');
    return;
  }
  if(!state.priceUnlocked) state.priceUnlocked = {};
  state.priceUnlocked[card.id] = true;
  // clear any paid job
  if(state.researchJobs) delete state.researchJobs[card.id];
  save(); updateUI(); renderCatalog();
  if(zoomCardId === card.id) renderZoomCopyUI(card);
  closeCatalogConfirm();
  showToast('Price unlocked: '+card.name+' · $'+actual.toFixed(2));
}

let catalogSetFilter = 'all';

function renderCatalog(){
  completeResearchJobs();
  const filters = document.getElementById('catalog-set-filters');
  const content = document.getElementById('catalog-content');
  if(!content) return;
  try{
    const releasedSetCodes = (typeof SETS !== 'undefined' && SETS.length) ? new Set(SETS.map(s => s.code)) : null;
    const released = releasedSetCodes ? (CARDS||[]).filter(c => releasedSetCodes.has(c.setCode)) : (CARDS||[]);
    const total = released.length;
    const unlocked = released.filter(c => isPriceUnlocked(c.id)).length;
    const set = (id,t)=>{ const el=document.getElementById(id); if(el) el.textContent=t; };
    set('cat-sum-total', String(total));
    set('cat-sum-unlocked', String(unlocked));
    set('cat-sum-locked', String(Math.max(0, total - unlocked)));
  }catch(_){}
  const sets = (SETS && SETS.length) ? SETS.map(s => s.name) : [...new Set(CARDS.map(c => c.set).filter(Boolean))];
  const order = ['Base Set','Jungle','Fossil','Wizards Black Star Promos'];
  sets.sort((a,b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if(ia >= 0 || ib >= 0) return (ia<0?99:ia) - (ib<0?99:ib);
    return a.localeCompare(b);
  });
  if(filters){
    const opts = ['all', ...sets];
    filters.innerHTML = opts.map(s => {
      const label = s === 'all' ? 'All sets' : (s === 'Wizards Black Star Promos' ? 'Black Star Promos' : s);
      const active = catalogSetFilter === s ? ' active' : '';
      return `<button type="button" class="filter-btn${active}" onclick="setCatalogSetFilter('${String(s).replace(/'/g,"\\'")}')">${label}</button>`;
    }).join('');
  }
  const showSets = catalogSetFilter === 'all' ? sets : sets.filter(s => s === catalogSetFilter);
  content.innerHTML = showSets.map(setName => {
    const list = CARDS.filter(c => c.set === setName).slice().sort((a,b) => {
      const na = parseInt(a.cardNumber,10), nb = parseInt(b.cardNumber,10);
      if(!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a.cardNumber||'').localeCompare(String(b.cardNumber||''));
    });
    const unlocked = list.filter(c => isPriceUnlocked(c.id)).length;
    const rows = list.map(c => {
      const owned = (colGet(state.collection, c)) > 0;
      const unlockedP = isPriceUnlocked(c.id);
      let priceCell, act;
      if(unlockedP){
        priceCell = '<span class="c-price">$'+(Number(c.price)||0).toFixed(2)+'</span>';
        act = '<span style="color:#4ade80;font-size:.72rem">In your notes ✓</span>';
      } else {
        priceCell = '<span class="c-price locked">???</span>';
        if(owned) act = `<button class="btn" onclick="openCatalogConfirm(${c.id})">Confirm from guide</button>`;
        else act = '<span style="color:var(--muted);font-size:.72rem">Own to unlock</span>';
      }
      return `<tr>
        <td class="c-num">${c.cardNumber||''}</td>
        <td><div class="c-name">${c.name}</div><div class="c-rar">${c.rarityLabel||c.rarity||''}</div></td>
        <td>${priceCell}</td>
        <td class="c-act">${act}</td>
      </tr>`;
    }).join('');
    return `<div class="catalog-set">
      <div class="catalog-set-head">
        <h3>${setName === 'Wizards Black Star Promos' ? 'Black Star Promos' : setName}</h3>
        <span>${unlocked}/${list.length} in your notes</span>
      </div>
      <table class="catalog-table">
        <thead><tr><th>#</th><th>Card</th><th>Price</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('') || '<div class="empty-state">No cards</div>';
}
function setCatalogSetFilter(s){
  catalogSetFilter = s;
  renderCatalog();
}

function openZoom(card, preferIndex){
  hideHoverPreview();
  const modal=document.getElementById('zoom-modal');
  const img=document.getElementById('zoom-img');
  const wrap=document.getElementById('zoom-art-wrap');
  const label=document.getElementById('zoom-label');
  zoomCardId = card.id;
  zoomCopies = buildZoomCopies(card.id);
  if(typeof preferIndex === 'number' && preferIndex >= 0 && preferIndex < zoomCopies.length){
    zoomCopyIndex = preferIndex;
  } else if(typeof zoomCopyIndex !== 'number' || zoomCopyIndex >= zoomCopies.length || zoomCopyIndex < 0){
    zoomCopyIndex = Math.max(0, zoomCopies.length - 1);
  }
  if(wrap) wrap.classList.remove('holo-force','rare-force','uncommon-force','is-slab');
  if(card.art){
    img.src=card.art;
    img.style.display='block';
    img.classList.remove('holo-force','rare-force','uncommon-force');
    if(card.rarity==='legendary'){
      img.classList.add('holo-force');
      if(wrap) wrap.classList.add('holo-force');
    } else if(card.rarity==='epic'){
      img.classList.add('rare-force');
      if(wrap) wrap.classList.add('rare-force');
    } else if(card.rarity==='uncommon'){
      img.classList.add('uncommon-force');
      if(wrap) wrap.classList.add('uncommon-force');
    }
  } else {
    img.src='';
    img.style.display='none';
  }

  renderZoomCopyUI(card);
  modal.classList.add('open');
}

function renderZoomCopyUI(card){
  if(!card) card = resolveCard(zoomCardId);
  if(!card) return;
  const wrap = document.getElementById('zoom-art-wrap');
  const label = document.getElementById('zoom-label');
  const owned = Number(colGet(state.collection, card) || 0);
  const price = card.price || 0;
  const grades = getGrades(card.id);
  const ungraded = ungradedCount(card.id);
  const copy = currentZoomCopy();
  const isGraded = copy.grade != null;

  // Slab chrome
  if(wrap){
    wrap.classList.toggle('is-slab', isGraded);
  }
  if(isGraded){
    const setEl = document.getElementById('psa-set');
    const lineEl = document.getElementById('psa-card-line');
    const txtEl = document.getElementById('psa-grade-text');
    const numEl = document.getElementById('psa-grade-num');
    const certEl = document.getElementById('psa-cert');
    if(setEl) setEl.textContent = (card.set || 'BASE SET').toUpperCase();
    if(lineEl){
      const holo = (card.rarity === 'legendary') ? ' — HOLO' : '';
      lineEl.textContent = (card.name || '').toUpperCase() + holo;
    }
    if(txtEl) txtEl.textContent = psaGradeText(copy.grade);
    if(numEl) numEl.textContent = String(copy.grade);
    // Stable fake cert from card id + grade
    if(certEl){
      const seed = (Number(card.id) * 7919 + Number(copy.grade) * 9973 + 10000000) % 90000000 + 10000000;
      certEl.textContent = String(seed);
    }
  }

  // Copy nav
  const nav = document.getElementById('copy-nav');
  const navLabel = document.getElementById('copy-nav-label');
  const prevBtn = document.getElementById('copy-prev');
  const nextBtn = document.getElementById('copy-next');
  if(nav){
    if(zoomCopies.length > 1){
      nav.classList.add('show');
      const tag = isGraded ? gradeLabel(copy.grade) : 'Raw';
      if(navLabel) navLabel.innerHTML = `<strong>${zoomCopyIndex+1}</strong> / ${zoomCopies.length} · ${tag}`;
      if(prevBtn) prevBtn.disabled = zoomCopyIndex <= 0;
      if(nextBtn) nextBtn.disabled = zoomCopyIndex >= zoomCopies.length - 1;
    } else {
      nav.classList.remove('show');
    }
  }

  let labelHtml = `${card.cardNumber||''} ${card.name}`;
  if(!card.art){
    labelHtml = `<div style="font-size:5rem;margin-bottom:.5rem">${card.emoji}</div>${card.cardNumber||''} ${card.name}`;
  }
  if(isGraded){
    labelHtml += `<div class="zoom-grade-slab">${gradeLabel(copy.grade)} · ${psaGradeText(copy.grade)}</div>`;
  }
  if(label) label.innerHTML = labelHtml;

  const rarityEl = document.getElementById('zm-rarity');
  if(rarityEl){
    rarityEl.textContent = card.rarityLabel||card.rarity||'—';
    rarityEl.style.color = card.rarity==='legendary' ? '#ffcb05'
      : card.rarity==='epic' ? '#60a5fa'
      : card.rarity==='uncommon' ? '#4ade80'
      : 'var(--text)';
  }
  const setMeta = document.getElementById('zm-set');
  if(setMeta) setMeta.textContent = card.set||'—';
  const priceUnlocked = typeof isPriceUnlocked === 'function' ? isPriceUnlocked(card.id) : true;
  if(typeof completeResearchJobs === 'function') completeResearchJobs();
  const priceEl = document.getElementById('zm-price');
  if(priceEl){
    if(!priceUnlocked){
      const left = typeof researchTimeLeft === 'function' ? researchTimeLeft(card.id) : 0;
      if(left > 0){
        const s = Math.ceil(left/1000);
        priceEl.textContent = '??? · '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
      } else {
        priceEl.textContent = '???';
      }
      priceEl.style.color = 'var(--muted)';
    } else {
      const shown = isGraded ? cardMarketValue(card, copy.grade) : price;
      priceEl.textContent = '$'+Number(shown).toFixed(2) + (isGraded ? ' graded' : '');
      priceEl.style.color = '';
    }
  }
  const researchBtn = document.getElementById('zm-research');
  if(researchBtn && typeof isPriceUnlocked === 'function'){
    const ownedN = Number(colGet(state.collection, card));
    if(isPriceUnlocked(card.id)){
      researchBtn.disabled = true;
      researchBtn.textContent = 'Price known';
    } else if(typeof researchTimeLeft === 'function' && researchTimeLeft(card.id) > 0){
      researchBtn.disabled = true;
      researchBtn.textContent = researchStatusText(card);
    } else if(ownedN < 1){
      researchBtn.disabled = true;
      researchBtn.textContent = 'Own to research';
    } else {
      // Do NOT show dollar fee — that leaks the market price
      researchBtn.disabled = false;
      researchBtn.textContent = 'Lab research (5% fee · 5 min)';
    }
  }
  const ownedEl = document.getElementById('zm-owned');
  // Match collection/binder: show total owned; current copy is what the slab/arrows show
  if(ownedEl) ownedEl.textContent = '×'+owned;
  const gEl = document.getElementById('zm-grades');
  // Only THIS copy's grade (not every grade you own of this card)
  if(gEl) gEl.textContent = isGraded ? gradeLabel(copy.grade) : (ungraded > 0 ? 'Raw' : '—');

  // Shop pay for THIS copy if selling it would leave ≥1
  const canSellThis = owned > 1;
  const thisPayout = canSellThis
    ? shopPayoutFor(card, copy.grade)
    : 0;
  const sp = document.getElementById('zm-shop-pay');
  if(sp){
    const unlockedPay = typeof isPriceUnlocked === 'function' ? isPriceUnlocked(card.id) : true;
    if(!unlockedPay){
      sp.textContent = thisPayout > 0 ? '???' : '— (keep 1)';
      sp.style.color = 'var(--muted)';
    } else {
      sp.textContent = thisPayout > 0 ? '$'+thisPayout.toFixed(2) : '— (keep 1)';
      sp.style.color = '#4ade80';
    }
  }

  const gradeBtn = document.getElementById('zm-grade');
  const sellShop = document.getElementById('zm-sell-shop');
  const listBtn = document.getElementById('zm-list-market');
  const tradeBtn = document.getElementById('zm-trade');
  // Grade only when viewing a raw copy AND price is known (fee is % of market value)
  const canGrade = !isGraded && ungraded >= 1;
  const fee = gradeFeeForCard(card);
  if(gradeBtn){
    const unlockedG = typeof isPriceUnlocked === 'function' ? isPriceUnlocked(card.id) : true;
    gradeBtn.disabled = !canGrade || !unlockedG || state.money < fee;
    if(isGraded) gradeBtn.textContent = 'Already graded';
    else if(!canGrade) gradeBtn.textContent = 'Grade (need raw copy)';
    else if(!unlockedG) gradeBtn.textContent = 'Research price first';
    else if(state.money < fee) gradeBtn.textContent = 'Grade ($'+fee.toFixed(2)+')';
    else gradeBtn.textContent = 'Grade ($'+fee.toFixed(2)+')';
  }
  if(sellShop){
    const unlockedSell = typeof isPriceUnlocked === 'function' ? isPriceUnlocked(card.id) : true;
    // Hard lock: must know catalog price (same rule as grading)
    sellShop.disabled = thisPayout <= 0 || !unlockedSell;
    if(thisPayout <= 0) sellShop.textContent = 'Sell to shop';
    else if(!unlockedSell) sellShop.textContent = 'Research price first';
    else sellShop.textContent = 'Sell this copy ($'+thisPayout.toFixed(2)+')';
  }
  if(listBtn) listBtn.disabled = owned < 1;
  const aucBtn = document.getElementById('zm-list-auction');
  if(aucBtn) aucBtn.disabled = owned < 1;
  if(tradeBtn){
    tradeBtn.disabled = owned < 1;
    tradeBtn.textContent = owned >= 1 ? 'Trade this card' : 'Not owned';
  }
}

function zoomCopyStep(dir){
  if(!zoomCopies.length) return;
  const next = zoomCopyIndex + dir;
  if(next < 0 || next >= zoomCopies.length) return;
  zoomCopyIndex = next;
  const card = resolveCard(zoomCardId);
  if(card) renderZoomCopyUI(card);
}


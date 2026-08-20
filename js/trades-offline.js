/* ========== OFFLINE TRADE REQUESTS ========== */
let otTargetUserId = null;
let otWantCardId = null;
let otWantGrade = null;
let otOffer = []; // [{cardId, qty}]
let incomingTradeQueue = [];
let incomingTradeCurrent = null;
let tradeRequestChannel = null;
let tradeRequestPollTimer = null;

function colGet(col, idOrKey){
  if(!col) return 0;
  const key = toCardKey(idOrKey) || String(idOrKey);
  return Number(col[key] || col[idOrKey] || col[String(idOrKey)] || 0);
}
function colSet(col, idOrKey, qty){
  const key = toCardKey(idOrKey) || String(idOrKey);
  // clean any legacy numeric key for the same card
  const card = resolveCard(idOrKey);
  if(card){
    delete col[card.id];
    delete col[String(card.id)];
  }
  if(qty <= 0){ delete col[key]; }
  else { col[key] = qty; }
}

/** Grades map helpers (profiles.stats.grades) for trades */
function gradesGetMap(statsOrGrades){
  if(!statsOrGrades) return {};
  if(statsOrGrades.grades && typeof statsOrGrades.grades === 'object') return Object.assign({}, statsOrGrades.grades);
  return Object.assign({}, statsOrGrades);
}
function gradesList(gmap, cardId){
  const key = toCardKey(cardId) || String(cardId);
  const g = gmap[key] || gmap[String(cardId)] || gmap[cardId] || [];
  return Array.isArray(g) ? g.map(Number) : [];
}
function gradesRemoveOne(gmap, cardId, grade){
  const key = toCardKey(cardId) || String(cardId);
  let arr = gradesList(gmap, cardId);
  if(grade != null && grade !== ''){
    const idx = arr.indexOf(Number(grade));
    if(idx < 0) return false;
    arr.splice(idx, 1);
  } else {
    return true;
  }
  if(arr.length) gmap[key] = arr; else { delete gmap[key]; delete gmap[cardId]; delete gmap[String(cardId)]; }
  return true;
}
function gradesAddOne(gmap, cardId, grade){
  if(grade == null || grade === '') return;
  const key = toCardKey(cardId) || String(cardId);
  const arr = gradesList(gmap, cardId);
  arr.push(Number(grade));
  gmap[key] = arr;
  // clean legacy
  const card = resolveCard(cardId);
  if(card){ delete gmap[card.id]; delete gmap[String(card.id)]; }
}
function offerLabel(o){
  const c = resolveCard(o.cardId);
  const name = c ? c.name : ('#'+o.cardId);
  const g = (o.grade != null && o.grade !== '') ? (' · PSA '+o.grade) : '';
  return name + g + ' ×'+(o.qty||1);
}
/** Build <option> list of each copy: raw slots + each graded copy */
function buildOwnedCopyOptions(){
  const opts = [];
  CARDS.forEach(c => {
    const owned = colGet(state.collection, c);
    if(owned < 1) return;
    const grades = getGrades(c.id);
    const raw = Math.max(0, owned - grades.length);
    grades.forEach(g => {
      opts.push({ value: c.id+':'+g, cardId: c.id, grade: Number(g),
        label: c.name+' · PSA '+g+' ('+(c.rarityLabel||c.rarity)+')' });
    });
    if(raw > 0){
      opts.push({ value: String(c.id), cardId: c.id, grade: null,
        label: c.name+' · Raw ×'+raw+' ('+(c.rarityLabel||c.rarity)+')' });
    }
  });
  opts.sort((a,b) => a.label.localeCompare(b.label));
  return opts;
}
function parseCopyOptionValue(val){
  if(val == null || val === '') return null;
  const s = String(val);
  if(s.includes(':')){
    const [id, g] = s.split(':');
    return { cardId: parseInt(id,10), grade: parseInt(g,10) };
  }
  return { cardId: parseInt(s,10), grade: null };
}

function theirCopyOptions(collection, gradesMap, cardId){
  const owned = Number((collection||{})[cardId]||(collection||{})[String(cardId)]||0);
  if(owned < 1) return [];
  const gmap = gradesMap || {};
  const grades = Array.isArray(gmap[String(cardId)]||gmap[cardId]) ? (gmap[String(cardId)]||gmap[cardId]).map(Number) : [];
  const opts = [];
  grades.forEach(g => opts.push({ value: String(cardId)+':'+g, cardId: Number(cardId), grade: Number(g), label: 'PSA '+g }));
  const raw = Math.max(0, owned - grades.length);
  if(raw > 0) opts.push({ value: String(cardId), cardId: Number(cardId), grade: null, label: 'Raw ×'+raw });
  if(!opts.length && owned > 0) opts.push({ value: String(cardId), cardId: Number(cardId), grade: null, label: 'Any copy ×'+owned });
  return opts;
}
function allTheirCopyOptions(collection, gradesMap){
  const col = collection || {};
  const out = [];
  Object.keys(col).forEach(k => {
    const n = Number(col[k]||0);
    if(n < 1) return;
    const id = Number(k);
    const card = resolveCard(id);
    if(!card) return;
    theirCopyOptions(col, gradesMap, id).forEach(o => {
      out.push({ ...o, label: card.name+' · '+o.label+' ('+(card.rarityLabel||card.rarity)+')' });
    });
  });
  out.sort((a,b) => a.label.localeCompare(b.label));
  return out;
}

function openOfflineTradeRequest(cardId){
  if(!viewingPlayer || !currentUser){ showToast('Not logged in'); return; }
  if(viewingPlayer.id === currentUser.id){ showToast('That’s your own collection'); return; }
  if(!sb){ showToast('Cloud not connected'); return; }
  const card = resolveCard(cardId);
  if(!card) return;
  otTargetUserId = viewingPlayer.id;
  otWantCardId = cardId;
  otWantGrade = null;
  otOffer = [];
  const img = document.getElementById('ot-want-img');
  if(img){ img.src = card.art||''; img.style.display = card.art?'block':'none'; }
  document.getElementById('ot-want-name').textContent = card.name;
  const theirGrades = (viewingPlayer.stats && viewingPlayer.stats.grades) || {};
  const theirCol = viewingPlayer.collection || {};
  const copies = theirCopyOptions(theirCol, theirGrades, cardId);
  document.getElementById('ot-want-meta').textContent =
    (card.rarityLabel||card.rarity||'')+' · '+(card.set||'')+' · owned by '+(viewingPlayer.display_name||viewingPlayer.username)+
    (copies.length ? (' · '+copies.map(c=>c.label).join(', ')) : '');
  const copySel = document.getElementById('ot-want-copy');
  if(copySel){
    if(!copies.length){
      copySel.innerHTML = '<option value="'+cardId+'">Any copy</option>';
    } else {
      copySel.innerHTML = copies.map(c =>
        `<option value="${c.value}">${c.label}</option>`
      ).join('');
    }
  }
  const sel = document.getElementById('ot-offer-select');
  if(sel){
    const opts = buildOwnedCopyOptions();
    sel.innerHTML = '<option value="">— your card (raw or PSA) —</option>' +
      opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  }
  renderOtOfferChips();
  const msg = document.getElementById('ot-msg');
  if(msg){ msg.textContent = ''; msg.style.color = 'var(--muted)'; }
  document.getElementById('offline-trade-modal').classList.add('open');
}

function closeOfflineTradeModal(){
  document.getElementById('offline-trade-modal').classList.remove('open');
  otTargetUserId = null;
  otWantCardId = null;
  otWantGrade = null;
  otOffer = [];
}

function renderOtOfferChips(){
  const el = document.getElementById('ot-offer-chips');
  if(!el) return;
  if(!otOffer.length){
    el.innerHTML = '<span style="color:var(--muted);font-size:.82rem">Add at least one card you’re willing to give</span>';
    return;
  }
  el.innerHTML = otOffer.map((o,i) => {
    return `<span class="trade-chip">${offerLabel(o)} <button type="button" onclick="otOffer.splice(${i},1);renderOtOfferChips()">✕</button></span>`;
  }).join('');
}

function otAddOffer(){
  const sel = document.getElementById('ot-offer-select');
  const parsed = parseCopyOptionValue(sel && sel.value);
  if(!parsed || !parsed.cardId) return;
  const cardId = parsed.cardId;
  const grade = parsed.grade;
  const owned = colGet(state.collection, cardId);
  if(owned < 1){ showToast('You do not own that card'); return; }
  if(grade != null){
    const grades = getGrades(cardId);
    const used = otOffer.filter(o => o.cardId === cardId && Number(o.grade) === Number(grade)).reduce((s,o)=>s+(o.qty||1),0);
    if(used >= grades.filter(g => Number(g)===Number(grade)).length){
      showToast('That PSA copy is already in the offer'); return;
    }
    otOffer.push({ cardId, qty: 1, grade: Number(grade) });
  } else {
    const raw = ungradedCount(cardId);
    const usedRaw = otOffer.filter(o => o.cardId === cardId && (o.grade==null||o.grade==='')).reduce((s,o)=>s+(o.qty||1),0);
    if(usedRaw + 1 > raw){ showToast('Not enough raw copies'); return; }
    const existing = otOffer.find(o => o.cardId === cardId && (o.grade==null||o.grade===''));
    if(existing) existing.qty += 1;
    else otOffer.push({ cardId, qty: 1, grade: null });
  }
  renderOtOfferChips();
  if(sel) sel.value = '';
}

async function otSendRequest(){
  const msg = document.getElementById('ot-msg');
  if(!sb || !currentUser || !otTargetUserId || !otWantCardId){
    if(msg){ msg.textContent = 'Missing trade info'; msg.style.color = '#f87171'; }
    return;
  }
  if(!otOffer.length){
    if(msg){ msg.textContent = 'Add at least one card to offer'; msg.style.color = '#f87171'; }
    return;
  }
  // Verify we still own what we're offering
  for(const o of otOffer){
    if((colGet(state.collection, o.cardId)) < o.qty){
      if(msg){ msg.textContent = 'You no longer have enough of a card in your offer'; msg.style.color = '#f87171'; }
      return;
    }
  }
  try{
    const copySel = document.getElementById('ot-want-copy');
    const parsedWant = parseCopyOptionValue(copySel && copySel.value);
    const wantGrade = parsedWant && parsedWant.grade != null ? Number(parsedWant.grade) : null;
    otWantGrade = wantGrade;
    const payload = {
      from_user_id: currentUser.id,
      to_user_id: otTargetUserId,
      want_card_id: otWantCardId,
      offer_cards: otOffer,
      status: 'pending',
      want_grade: wantGrade
    };
    let { error } = await sb.from('trade_requests').insert(payload);
    // Fallback if want_grade column not migrated yet
    if(error && error.message && error.message.toLowerCase().includes('want_grade')){
      delete payload.want_grade;
      // stash grade on first offer as _wantGrade meta is bad; store in offer_cards wrapper
      payload.offer_cards = { items: otOffer, want_grade: wantGrade };
      ({ error } = await sb.from('trade_requests').insert(payload));
    }
    if(error) throw error;
    const card = resolveCard(otWantCardId);
    const gTag = wantGrade != null ? (' PSA '+wantGrade) : '';
    showToast('Trade request sent for '+(card?card.name:'card')+gTag);
    closeOfflineTradeModal();
  }catch(e){
    console.error(e);
    if(msg){
      msg.textContent = (e && e.message && e.message.includes('relation'))
        ? 'Run the new trade_requests SQL in Supabase first'
        : 'Could not send request';
      msg.style.color = '#f87171';
    }
  }
}

let itCounterOffer = []; // [{cardId, qty}] for counter form
let tradeNoticeQueue = [];
let tradeNoticeCurrent = null;

function showIncomingTradeModal(req){
  incomingTradeCurrent = req;
  itCounterOffer = [];
  itHideCounter();
  const card = resolveCard(req.want_card_id);
  const fromName = req.from_name || 'A trainer';
  const title = document.getElementById('it-title');
  if(title) title.textContent = req.parent_id ? '🔁 Counter offer' : '📩 Trade Request';
  document.getElementById('it-from-line').textContent = fromName + (req.parent_id ? ' sent a counter offer.' : ' wants to trade with you.');
  const img = document.getElementById('it-want-img');
  if(img){ img.src = card&&card.art||''; img.style.display = card&&card.art?'block':'none'; }
  // Support offer_cards as array OR { items, want_grade } fallback
  let offerPayload = req.offer_cards;
  let wantGradeShow = (req.want_grade != null && req.want_grade !== '') ? Number(req.want_grade) : null;
  if(offerPayload && !Array.isArray(offerPayload) && Array.isArray(offerPayload.items)){
    if(wantGradeShow == null && offerPayload.want_grade != null) wantGradeShow = Number(offerPayload.want_grade);
    offerPayload = offerPayload.items;
  }
  req._resolvedWantGrade = wantGradeShow;
  document.getElementById('it-want-name').textContent = card
    ? (card.name + (wantGradeShow != null ? ' · PSA '+wantGradeShow : ''))
    : ('Card #'+req.want_card_id);
  document.getElementById('it-want-meta').textContent = card
    ? ((card.rarityLabel||card.rarity)+' · '+(card.set||'')+(wantGradeShow!=null?' · graded copy':''))
    : '';
  const offers = Array.isArray(offerPayload) ? offerPayload : [];
  document.getElementById('it-offer-list').innerHTML = offers.length
    ? offers.map(o => `<span class="trade-chip">${offerLabel(o)}</span>`).join('')
    : '<span style="color:var(--muted)">No cards listed</span>';
  const st = document.getElementById('it-status');
  if(st){ st.textContent = ''; st.style.color = 'var(--muted)'; }
  const btn = document.getElementById('it-accept-btn');
  if(btn) btn.disabled = false;
  document.getElementById('incoming-trade-modal').classList.add('open');
}

function itDismiss(){
  document.getElementById('incoming-trade-modal').classList.remove('open');
  incomingTradeCurrent = null;
  itCounterOffer = [];
  itHideCounter();
  // Show next pending request, else outbound notices
  if(incomingTradeQueue.length){
    const next = incomingTradeQueue.shift();
    setTimeout(() => showIncomingTradeModal(next), 300);
  } else {
    setTimeout(showNextTradeNotice, 250);
  }
}

async function itShowCounter(){
  if(!incomingTradeCurrent) return;
  const req = incomingTradeCurrent;
  itCounterOffer = []; // empty — user chooses both sides

  const wantSel = document.getElementById('it-counter-want');
  const offerSel = document.getElementById('it-counter-offer-select');
  const cs = document.getElementById('it-counter-status');
  if(wantSel) wantSel.innerHTML = '<option value="">Loading their collection…</option>';
  if(cs){ cs.textContent = ''; cs.style.color = 'var(--muted)'; }

  document.getElementById('it-main-view').style.display = 'none';
  document.getElementById('it-counter-view').style.display = 'block';
  renderItCounterChips();

  // Load THEIR full collection (not only cards from the original offer)
  let theirCol = {};
  try{
    if(sb){
      const { data, error } = await sb.from('profiles')
        .select('collection,stats')
        .eq('id', req.from_user_id)
        .single();
      if(error) throw error;
      theirCol = data.collection || {};
      window._itCounterTheirGrades = (data.stats && data.stats.grades) || {};
    }
  }catch(e){
    console.error(e);
    if(wantSel) wantSel.innerHTML = '<option value="">Could not load their collection</option>';
    if(cs){ cs.textContent = 'Could not load their cards'; cs.style.color = '#f87171'; }
  }

  const theirGrades = window._itCounterTheirGrades || {};
  const theirOpts = allTheirCopyOptions(theirCol, theirGrades);
  if(wantSel){
    if(!theirOpts.length){
      wantSel.innerHTML = '<option value="">— they have no cards —</option>';
    } else {
      wantSel.innerHTML = '<option value="">— choose a copy (raw or PSA) —</option>' +
        theirOpts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    }
  }

  if(offerSel){
    const opts = buildOwnedCopyOptions();
    offerSel.innerHTML = '<option value="">— your card (raw or PSA) —</option>' +
      opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  }
}

function itHideCounter(){
  const main = document.getElementById('it-main-view');
  const cv = document.getElementById('it-counter-view');
  if(main) main.style.display = '';
  if(cv) cv.style.display = 'none';
}

function renderItCounterChips(){
  const el = document.getElementById('it-counter-offer-chips');
  if(!el) return;
  if(!itCounterOffer.length){
    el.innerHTML = '<span style="color:var(--muted);font-size:.82rem">Add cards you’re willing to give</span>';
    return;
  }
  el.innerHTML = itCounterOffer.map((o,i) => {
    return `<span class="trade-chip">${offerLabel(o)} <button type="button" onclick="itCounterOffer.splice(${i},1);renderItCounterChips()">✕</button></span>`;
  }).join('');
}

function itCounterAddOffer(){
  const sel = document.getElementById('it-counter-offer-select');
  const parsed = parseCopyOptionValue(sel && sel.value);
  if(!parsed || !parsed.cardId) return;
  const cardId = parsed.cardId;
  const grade = parsed.grade;
  const owned = colGet(state.collection, cardId);
  if(owned < 1){ showToast('You do not own that card'); return; }
  if(grade != null){
    const grades = getGrades(cardId);
    const used = itCounterOffer.filter(o => o.cardId === cardId && Number(o.grade)===Number(grade)).reduce((s,o)=>s+(o.qty||1),0);
    if(used >= grades.filter(g => Number(g)===Number(grade)).length){
      showToast('That PSA copy is already in the offer'); return;
    }
    itCounterOffer.push({ cardId, qty: 1, grade: Number(grade) });
  } else {
    const raw = ungradedCount(cardId);
    const usedRaw = itCounterOffer.filter(o => o.cardId === cardId && (o.grade==null||o.grade==='')).reduce((s,o)=>s+(o.qty||1),0);
    if(usedRaw + 1 > raw){ showToast('Not enough raw copies'); return; }
    const existing = itCounterOffer.find(o => o.cardId === cardId && (o.grade==null||o.grade===''));
    if(existing) existing.qty += 1;
    else itCounterOffer.push({ cardId, qty: 1, grade: null });
  }
  renderItCounterChips();
  if(sel) sel.value = '';
}

async function itSendCounter(){
  if(!incomingTradeCurrent || !sb || !currentUser) return;
  const req = incomingTradeCurrent;
  const st = document.getElementById('it-counter-status');
  const parsedWant = parseCopyOptionValue((document.getElementById('it-counter-want')||{}).value);
  const wantId = parsedWant && parsedWant.cardId;
  const wantGrade = parsedWant && parsedWant.grade != null ? Number(parsedWant.grade) : null;
  if(!wantId){
    if(st){ st.textContent = 'Pick a copy you want from them (raw or PSA)'; st.style.color = '#f87171'; }
    return;
  }
  if(!itCounterOffer.length){
    if(st){ st.textContent = 'Add at least one card to offer'; st.style.color = '#f87171'; }
    return;
  }
  for(const o of itCounterOffer){
    if((colGet(state.collection, o.cardId)) < o.qty){
      if(st){ st.textContent = 'You do not have enough of a card in your offer'; st.style.color = '#f87171'; }
      return;
    }
  }
  try{
    // Mark original as countered (notifies original sender)
    await sb.from('trade_requests').update({
      status: 'countered',
      sender_notified: false
    }).eq('id', req.id);

    // New request going the other way
    const counterPayload = {
      from_user_id: currentUser.id,
      to_user_id: req.from_user_id,
      want_card_id: wantId,
      offer_cards: itCounterOffer,
      status: 'pending',
      parent_id: req.id,
      sender_notified: false,
      want_grade: wantGrade
    };
    let { error } = await sb.from('trade_requests').insert(counterPayload);
    if(error && error.message && error.message.toLowerCase().includes('want_grade')){
      delete counterPayload.want_grade;
      counterPayload.offer_cards = { items: itCounterOffer, want_grade: wantGrade };
      ({ error } = await sb.from('trade_requests').insert(counterPayload));
    }
    if(error) throw error;
    showToast('Counter offer sent');
    itDismiss();
  }catch(e){
    console.error(e);
    if(st){
      st.textContent = (e && e.message && String(e.message).includes('sender_notified'))
        ? 'Run the latest trade_requests SQL update in Supabase'
        : 'Could not send counter';
      st.style.color = '#f87171';
    }
  }
}

async function itDecline(){
  if(!incomingTradeCurrent || !sb){ itDismiss(); return; }
  const id = incomingTradeCurrent.id;
  try{
    await sb.from('trade_requests').update({
      status: 'declined',
      sender_notified: false
    }).eq('id', id);
    showToast('Trade declined — they’ll be notified');
  }catch(e){ console.error(e); }
  itDismiss();
}

async function itAccept(){
  if(!incomingTradeCurrent || !sb || !currentUser) return;
  const req = incomingTradeCurrent;
  const st = document.getElementById('it-status');
  const btn = document.getElementById('it-accept-btn');
  if(btn) btn.disabled = true;
  if(st){ st.textContent = 'Completing trade…'; st.style.color = 'var(--gold)'; }

  try{
    const { data: me, error: meErr } = await sb.from('profiles')
      .select('collection,money,packs,stats').eq('id', currentUser.id).single();
    if(meErr) throw meErr;
    const { data: them, error: themErr } = await sb.from('profiles')
      .select('collection,username,display_name,stats').eq('id', req.from_user_id).single();
    if(themErr) throw themErr;

    const myCol = Object.assign({}, me.collection || {});
    const theirCol = Object.assign({}, them.collection || {});
    const myGrades = gradesGetMap(me.stats);
    const theirGrades = gradesGetMap(them.stats);
    const wantId = Number(req.want_card_id);
    let wantGrade = (req._resolvedWantGrade != null) ? Number(req._resolvedWantGrade)
      : ((req.want_grade != null && req.want_grade !== '') ? Number(req.want_grade) : null);
    let offersRaw = req.offer_cards;
    if(offersRaw && !Array.isArray(offersRaw) && Array.isArray(offersRaw.items)){
      if(wantGrade == null && offersRaw.want_grade != null) wantGrade = Number(offersRaw.want_grade);
      offersRaw = offersRaw.items;
    }
    const offers = Array.isArray(offersRaw) ? offersRaw : [];

    if(colGet(myCol, wantId) < 1){
      if(st){ st.textContent = 'You no longer own that card'; st.style.color = '#f87171'; }
      if(btn) btn.disabled = false;
      return;
    }
    if(wantGrade != null){
      const gl = gradesList(myGrades, wantId);
      if(!gl.includes(wantGrade)){
        if(st){ st.textContent = 'You no longer have that PSA grade'; st.style.color = '#f87171'; }
        if(btn) btn.disabled = false;
        return;
      }
    }
    for(const o of offers){
      const cid = Number(o.cardId);
      const q = Number(o.qty)||1;
      if(colGet(theirCol, cid) < q){
        if(st){ st.textContent = 'They no longer have enough of a card they offered'; st.style.color = '#f87171'; }
        if(btn) btn.disabled = false;
        return;
      }
      if(o.grade != null && o.grade !== ''){
        const gl = gradesList(theirGrades, cid);
        const need = q;
        const have = gl.filter(g => Number(g) === Number(o.grade)).length;
        if(have < need){
          if(st){ st.textContent = 'They no longer have that graded copy'; st.style.color = '#f87171'; }
          if(btn) btn.disabled = false;
          return;
        }
      }
    }

    // Move wanted card: me → them
    colSet(myCol, wantId, colGet(myCol, wantId) - 1);
    colSet(theirCol, wantId, colGet(theirCol, wantId) + 1);
    if(wantGrade != null){
      gradesRemoveOne(myGrades, wantId, wantGrade);
      gradesAddOne(theirGrades, wantId, wantGrade);
    } else {
      // Prefer leaving graded copies with owner if transferring "any"/raw —
      // only strip a grade if they have no raw (all copies graded)
      // raw transfer: grades map unchanged
    }
    for(const o of offers){
      const cid = Number(o.cardId);
      const q = Number(o.qty)||1;
      colSet(theirCol, cid, colGet(theirCol, cid) - q);
      colSet(myCol, cid, colGet(myCol, cid) + q);
      if(o.grade != null && o.grade !== ''){
        for(let i=0;i<q;i++){
          gradesRemoveOne(theirGrades, cid, Number(o.grade));
          gradesAddOne(myGrades, cid, Number(o.grade));
        }
      }
    }

    const myStats = Object.assign({}, me.stats || {}, { grades: myGrades });
    const theirStats = Object.assign({}, them.stats || {}, { grades: theirGrades });
    const { error: upMe } = await sb.from('profiles').update({ collection: myCol, stats: myStats }).eq('id', currentUser.id);
    if(upMe) throw upMe;
    const { error: upThem } = await sb.from('profiles').update({ collection: theirCol, stats: theirStats }).eq('id', req.from_user_id);
    if(upThem) throw upThem;
    await sb.from('trade_requests').update({
      status: 'accepted',
      sender_notified: false
    }).eq('id', req.id);

    state.collection = {};
    for(const k of Object.keys(myCol)){
      const n = Number(myCol[k]);
      if(n > 0) state.collection[toCardKey(k) || String(k)] = n;
    }
    state.grades = myGrades;
    save();
    updateUI();
    renderCollection();
    renderBinder();
    showToast('Trade complete!');
    itDismiss();
  }catch(e){
    console.error(e);
    if(st){ st.textContent = 'Trade failed — try again'; st.style.color = '#f87171'; }
    if(btn) btn.disabled = false;
  }
}

function showTradeNotice(n){
  tradeNoticeCurrent = n;
  const title = document.getElementById('tn-title');
  const body = document.getElementById('tn-body');
  if(title) title.textContent = n.title || 'Trade update';
  if(body) body.textContent = n.body || '';
  document.getElementById('trade-notice-modal').classList.add('open');
}

async function closeTradeNotice(){
  document.getElementById('trade-notice-modal').classList.remove('open');
  const was = tradeNoticeCurrent;
  if(was && was.id && sb){
    try{
      await sb.from('trade_requests').update({ sender_notified: true }).eq('id', was.id);
    }catch(e){ console.error(e); }
  }
  // If trade was accepted, refresh our collection from cloud
  if(was && was.status === 'accepted' && sb && currentUser){
    try{
      const { data } = await sb.from('profiles').select('collection,money,packs').eq('id', currentUser.id).single();
      if(data){
        state.collection = {};
        const col = data.collection || {};
        for(const k of Object.keys(col)){
          const n = Number(col[k]);
          if(n > 0) state.collection[toCardKey(k) || String(k)] = n;
        }
        if(data.money != null) state.money = Number(data.money);
        if(data.packs != null) state.packs = Number(data.packs);
        save(); updateUI(); renderCollection(); renderBinder();
      }
    }catch(e){ console.error(e); }
  }
  // If countered, pull pending requests so their counter appears
  if(was && was.status === 'countered'){
    setTimeout(() => fetchPendingTradeRequests(), 200);
  }
  tradeNoticeCurrent = null;
  if(tradeNoticeQueue.length){
    const next = tradeNoticeQueue.shift();
    setTimeout(() => showTradeNotice(next), 250);
  }
}

function showNextTradeNotice(){
  if(tradeNoticeCurrent) return;
  if(document.getElementById('incoming-trade-modal').classList.contains('open')) return;
  if(document.getElementById('trade-notice-modal').classList.contains('open')) return;
  if(!tradeNoticeQueue.length) return;
  showTradeNotice(tradeNoticeQueue.shift());
}

async function fetchOutboundTradeUpdates(){
  if(!sb || !currentUser || currentUser.id === 'local-admin') return;
  try{
    const { data, error } = await sb.from('trade_requests')
      .select('*')
      .eq('from_user_id', currentUser.id)
      .in('status', ['declined','accepted','countered'])
      .eq('sender_notified', false)
      .order('updated_at', { ascending: true });
    if(error){
      if(error.message && (error.message.includes('relation') || error.message.includes('sender_notified'))) return;
      throw error;
    }
    if(!data || !data.length) return;

    const toIds = [...new Set(data.map(r => r.to_user_id))];
    let nameMap = {};
    if(toIds.length){
      const { data: profiles } = await sb.from('profiles')
        .select('id, username, display_name')
        .in('id', toIds);
      (profiles||[]).forEach(p => { nameMap[p.id] = p.display_name || p.username; });
    }

    const seen = new Set([
      ...(tradeNoticeCurrent ? [tradeNoticeCurrent.id] : []),
      ...tradeNoticeQueue.map(n => n.id)
    ]);

    for(const r of data){
      if(seen.has(r.id)) continue;
      const who = nameMap[r.to_user_id] || 'A trainer';
      const card = resolveCard(r.want_card_id);
      const cardName = card ? card.name : ('card #'+r.want_card_id);
      let title = 'Trade update';
      let body = '';
      if(r.status === 'declined'){
        title = 'Trade declined';
        body = who + ' declined your request for ' + cardName + '.';
      } else if(r.status === 'accepted'){
        title = 'Trade accepted!';
        body = who + ' accepted your trade for ' + cardName + '. Cards have been swapped.';
      } else if(r.status === 'countered'){
        title = 'Counter offer';
        body = who + ' countered your trade for ' + cardName + '. Check incoming requests for their new offer.';
      }
      tradeNoticeQueue.push({ id: r.id, title, body, status: r.status });
    }
    showNextTradeNotice();
  }catch(e){
    console.error('fetchOutboundTradeUpdates', e);
  }
}

async function fetchPendingTradeRequests(){
  if(!sb || !currentUser || currentUser.id === 'local-admin') return;
  try{
    const { data, error } = await sb.from('trade_requests')
      .select('*')
      .eq('to_user_id', currentUser.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if(error){
      if(error.message && error.message.includes('relation')) return;
      throw error;
    }
    if(!data || !data.length){
      await fetchOutboundTradeUpdates();
      return;
    }

    const fromIds = [...new Set(data.map(r => r.from_user_id))];
    let nameMap = {};
    if(fromIds.length){
      const { data: profiles } = await sb.from('profiles')
        .select('id, username, display_name')
        .in('id', fromIds);
      (profiles||[]).forEach(p => {
        nameMap[p.id] = p.display_name || p.username;
      });
    }

    const seen = new Set([
      ...(incomingTradeCurrent ? [incomingTradeCurrent.id] : []),
      ...incomingTradeQueue.map(r => r.id)
    ]);
    const fresh = data.filter(r => !seen.has(r.id)).map(r => ({
      ...r,
      from_name: nameMap[r.from_user_id] || 'A trainer'
    }));
    if(fresh.length){
      if(!incomingTradeCurrent && !document.getElementById('incoming-trade-modal').classList.contains('open')){
        const first = fresh.shift();
        incomingTradeQueue.push(...fresh);
        showIncomingTradeModal(first);
      } else {
        incomingTradeQueue.push(...fresh);
      }
    }
    await fetchOutboundTradeUpdates();
  }catch(e){
    console.error('fetchPendingTradeRequests', e);
  }
}

function startTradeRequestWatcher(){
  stopTradeRequestWatcher();
  if(!sb || !currentUser || currentUser.id === 'local-admin') return;

  tradeRequestPollTimer = setInterval(() => {
    fetchPendingTradeRequests();
  }, 15000);

  try{
    tradeRequestChannel = sb.channel('trade-requests-'+currentUser.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trade_requests'
      }, payload => {
        const row = payload.new || payload.old;
        if(!row) return;
        if(row.to_user_id === currentUser.id && row.status === 'pending'){
          fetchPendingTradeRequests();
        }
        if(row.from_user_id === currentUser.id && ['declined','accepted','countered'].includes(row.status)){
          fetchOutboundTradeUpdates();
        }
      })
      .subscribe();
  }catch(e){
    console.warn('Realtime trade_requests subscribe failed', e);
  }
}

function stopTradeRequestWatcher(){
  if(tradeRequestPollTimer){ clearInterval(tradeRequestPollTimer); tradeRequestPollTimer = null; }
  if(tradeRequestChannel && sb){
    try{ sb.removeChannel(tradeRequestChannel); }catch(e){}
    tradeRequestChannel = null;
  }
}


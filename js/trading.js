/* ===== TRADING ===== */
let tradeGive = []; // card ids player will give
let tradeWant = []; // card ids player wants
let pendingAccept = null; // decoded offer when reviewing

/* cardById now provided by data layer */

function encodeTrade(obj){
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}
function decodeTrade(str){
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
  } catch(e){ return null; }
}

function populateTradeSelects(){
  const giveSel = document.getElementById('give-select');
  const wantSel = document.getElementById('want-select');
  if(!giveSel||!wantSel) return;
  giveSel.innerHTML = '';
  wantSel.innerHTML = '';
  // Give: only cards you own at least 1 of
  const owned = CARDS.filter(c => (colGet(state.collection, c)) > 0)
    .sort((a,b)=>a.id-b.id);
  owned.forEach(c=>{
    const o=document.createElement('option');
    o.value=c.id;
    o.textContent=`${c.cardNumber} ${c.name} (×${colGet(state.collection, c)})`;
    giveSel.appendChild(o);
  });
  if(!owned.length){
    const o=document.createElement('option');
    o.textContent='No cards owned';
    o.value='';
    giveSel.appendChild(o);
  }
  // Want: any card in the game
  [...CARDS].sort((a,b)=>a.id-b.id).forEach(c=>{
    const o=document.createElement('option');
    o.value=c.id;
    o.textContent=`${c.cardNumber} ${c.name}`;
    wantSel.appendChild(o);
  });
}

function renderTradePicks(){
  const giveEl=document.getElementById('give-picks');
  const wantEl=document.getElementById('want-picks');
  if(!giveEl) return;
  giveEl.innerHTML = tradeGive.map((id,i)=>{
    const c=cardById(id);
    return `<span class="trade-chip">${c.emoji} ${c.name} <button onclick="tradeGive.splice(${i},1);renderTradePicks()">✕</button></span>`;
  }).join('') || '<span style="color:var(--muted);font-size:.8rem">None</span>';
  wantEl.innerHTML = tradeWant.map((id,i)=>{
    const c=cardById(id);
    return `<span class="trade-chip">${c.emoji} ${c.name} <button onclick="tradeWant.splice(${i},1);renderTradePicks()">✕</button></span>`;
  }).join('') || '<span style="color:var(--muted);font-size:.8rem">None</span>';
}

function addGive(){
  const sel=document.getElementById('give-select');
  const id=parseInt(sel.value,10);
  if(!id) return;
  const owned=colGet(state.collection, id);
  const already=tradeGive.filter(x=>x===id).length;
  if(already>=owned){ showToast("You don't have more of that card"); return; }
  tradeGive.push(id);
  renderTradePicks();
}
function addWant(){
  const sel=document.getElementById('want-select');
  const id=parseInt(sel.value,10);
  if(!id) return;
  tradeWant.push(id);
  renderTradePicks();
}

function createOffer(){
  if(!tradeGive.length || !tradeWant.length){
    showToast('Add at least one card on each side');
    return;
  }
  // Verify still own give cards
  const counts={};
  for(const id of tradeGive){
    counts[id]=(counts[id]||0)+1;
    if((colGet(state.collection, id)) < counts[id]){
      showToast('You no longer own all cards you are offering');
      return;
    }
  }
  const offerId = 'O'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const offer = {
    t: 'offer',
    id: offerId,
    give: tradeGive.slice(),
    want: tradeWant.slice(),
  };
  // Remember so we can complete later
  if(!state.pendingOffers) state.pendingOffers={};
  // migrate old coin saves to money
  if(state.coins!==undefined && state.money===undefined){ state.money=25.00; delete state.coins; }
  if(state.money===undefined) state.money=25.00;
  state.pendingOffers[offerId] = { give: tradeGive.slice(), want: tradeWant.slice() };
  save();

  const code = encodeTrade(offer);
  document.getElementById('offer-code').value = code;
  document.getElementById('offer-result').style.display = 'block';
  showToast('Offer code ready — send it to your friend');
}

function previewAccept(){
  const raw = document.getElementById('accept-input').value;
  const offer = decodeTrade(raw);
  const preview = document.getElementById('accept-preview');
  const status = document.getElementById('accept-status');
  const btn = document.getElementById('accept-btn');
  document.getElementById('completion-result').style.display='none';

  if(!offer || offer.t!=='offer' || !offer.give || !offer.want){
    showToast('Invalid offer code');
    preview.style.display='none';
    return;
  }
  pendingAccept = offer;

  // From acceptor POV: they GIVE offer.want, they RECEIVE offer.give
  const giveEl=document.getElementById('accept-give');
  const recvEl=document.getElementById('accept-recv');
  giveEl.innerHTML = offer.want.map(id=>{
    const c=cardById(id);
    const own=colGet(state.collection, id);
    return `<span class="trade-chip">${c?c.emoji:''} ${c?c.name:'?'}${own<1?' ⚠️':''}</span>`;
  }).join('');
  recvEl.innerHTML = offer.give.map(id=>{
    const c=cardById(id);
    return `<span class="trade-chip">${c?c.emoji:''} ${c?c.name:'?'}</span>`;
  }).join('');

  // Check ownership of what we must give
  const need={};
  for(const id of offer.want) need[id]=(need[id]||0)+1;
  let ok=true;
  const missing=[];
  for(const [id,n] of Object.entries(need)){
    if((colGet(state.collection, id)) < n){
      ok=false;
      const c=cardById(+id);
      missing.push(c?c.name:id);
    }
  }
  if(ok){
    status.style.color='#22c55e';
    status.textContent='You have the required cards. Accept to proceed.';
    btn.disabled=false;
  } else {
    status.style.color='#f66';
    status.textContent='Missing: '+missing.join(', ');
    btn.disabled=true;
  }
  preview.style.display='block';
}

function acceptOffer(){
  if(!pendingAccept) return;
  const offer = pendingAccept;
  // Remove cards we give (offer.want), add cards we receive (offer.give)
  const need={};
  for(const id of offer.want) need[id]=(need[id]||0)+1;
  for(const [id,n] of Object.entries(need)){
    if((colGet(state.collection, id)) < n){ showToast('Missing cards'); return; }
  }
  for(const id of offer.want){
    colSet(state.collection, id, colGet(state.collection, id) - 1);
  }
  for(const id of offer.give){
    colSet(state.collection, id, colGet(state.collection, id) + 1);
  }
  save(); updateUI(); renderCollection(); renderSellList(); renderBinder(); populateTradeSelects();

  const completion = {
    t: 'complete',
    id: offer.id,
    give: offer.give,
    want: offer.want,
  };
  document.getElementById('completion-code').value = encodeTrade(completion);
  document.getElementById('completion-result').style.display = 'block';
  showToast('Trade applied on your side! Send completion code back.');
  pendingAccept = null;
}

function completeTrade(){
  const raw = document.getElementById('complete-input').value;
  const data = decodeTrade(raw);
  if(!data || data.t!=='complete' || !data.id){
    showToast('Invalid completion code');
    return;
  }
  if(!state.pendingOffers || !state.pendingOffers[data.id]){
    showToast('No matching pending offer (already completed or different device?)');
    return;
  }
  const pending = state.pendingOffers[data.id];
  // Verify matches
  if(JSON.stringify(pending.give)!==JSON.stringify(data.give) ||
     JSON.stringify(pending.want)!==JSON.stringify(data.want)){
    showToast('Completion does not match your offer');
    return;
  }
  // Apply A's side: lose give, gain want
  const need={};
  for(const id of pending.give) need[id]=(need[id]||0)+1;
  for(const [id,n] of Object.entries(need)){
    if((colGet(state.collection, id)) < n){
      showToast('You no longer have the cards to complete this trade');
      return;
    }
  }
  for(const id of pending.give){
    colSet(state.collection, id, colGet(state.collection, id) - 1);
  }
  for(const id of pending.want){
    colSet(state.collection, id, colGet(state.collection, id) + 1);
  }
  delete state.pendingOffers[data.id];
  save(); updateUI(); renderCollection(); renderSellList(); renderBinder(); populateTradeSelects();
  document.getElementById('complete-input').value='';
  showToast('Trade complete! Cards updated.');
}

function copyCode(id){
  const el=document.getElementById(id);
  el.select();
  navigator.clipboard.writeText(el.value).then(()=>showToast('Copied!')).catch(()=>showToast('Select and copy manually'));
}

// load() and save() are defined earlier in the auth/cloud section.
// This block kept only the default-normalization helper.
function ensureStateDefaults(){
  if(!state.pendingOffers) state.pendingOffers={};
  if(!state.stats) state.stats={packsOpened:0,sells:0,holosPulled:0};
  if(state.stats.packsOpened===undefined) state.stats.packsOpened=0;
  if(!state.stats.packsOpenedBySet) state.stats.packsOpenedBySet={};
  if(state.stats.sells===undefined) state.stats.sells=0;
  if(state.stats.holosPulled===undefined) state.stats.holosPulled=0;
  if(!state.claimed) state.claimed={};
  if(state.dailyClaim===undefined) state.dailyClaim=null;
  if(state.promoClaim===undefined) state.promoClaim=null;
  if(!Array.isArray(state.packQueue)) state.packQueue=[];
  // Legacy: packs without queue entries count as Base Set
  while(state.packQueue.length < (state.packs||0)) state.packQueue.push('Base Set');
  // Queue is source of truth for set types
  state.packs = state.packQueue.length;
  if(!Array.isArray(state.wantList)) state.wantList=[];
  if(!state.marketLastRefresh) state.marketLastRefresh=0;
  if(!Array.isArray(state.marketHistory)) state.marketHistory=[];
  if(state.marketOffersCache===undefined) state.marketOffersCache=null;
  if(state.binderLayout===undefined) state.binderLayout=null;
  if(state.money===undefined) state.money=25.00;
  if(state.packs===undefined) state.packs=0;
  if(!state.collection) state.collection={};
  if(!state.grades || typeof state.grades !== 'object') state.grades={};
  if(!Array.isArray(state.cosmeticsOwned)) state.cosmeticsOwned=[];
  if(!state.mysteryBoxLimits || typeof state.mysteryBoxLimits !== 'object') state.mysteryBoxLimits = null;
  if(!state.tradeUpLimits || typeof state.tradeUpLimits !== 'object') state.tradeUpLimits = null;
  if(!state.priceUnlocked || typeof state.priceUnlocked !== 'object') state.priceUnlocked={};
  if(!state.researchJobs || typeof state.researchJobs !== 'object') state.researchJobs={};
  if(state.dailyWheelClaim===undefined) state.dailyWheelClaim=null;
  if(!state.luckBuffs || typeof state.luckBuffs !== 'object') state.luckBuffs={};
  if(!state.cosmeticsEquipped || typeof state.cosmeticsEquipped !== 'object'){
    state.cosmeticsEquipped = { title:null, nameColor:null, frame:null, packSleeve:null, binderTheme:null, cardBack:null, badge:null };
  }
  if(!state.binderCosmetics || typeof state.binderCosmetics !== 'object' || Array.isArray(state.binderCosmetics)) state.binderCosmetics = {};
  if(state.cosmeticsEquipped && state.cosmeticsEquipped.badge === undefined){
    state.cosmeticsEquipped.badge = null;
  }
  /* sparse collection: do not pre-fill empty slots */
}


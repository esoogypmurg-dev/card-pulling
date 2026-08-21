/* ===== RANDOM TRADING MARKET ===== */
let marketOffers = [];
let marketSort = 'want';
const MARKET_REFRESH_MS = 2 * 60 * 60 * 1000; // 2 hours — device clock, works offline
const MARKET_NAMES = ['Ash','Misty','Brock','Gary','Erika','Lt. Surge','Sabrina','Koga','Blaine','Giovanni','Lance','Blue','Red','Oak','Bill','Todd','Jenny','Joy'];

function isMissing(cardId){
  return (colGet(state.collection, cardId)) === 0;
}
function isWanted(cardId){
  return (state.wantList||[]).includes(cardId);
}
function offerFillsNeed(offer){
  // Internal only (featured picks missing rares) — not shown as a market filter
  if(offer.type==='trade') return isMissing(offer.giveId);
  if(offer.type==='buy') return isMissing(offer.cardId);
  return false;
}
function offerFillsWant(offer){
  if(offer.type==='trade') return isWanted(offer.giveId);
  if(offer.type==='buy') return isWanted(offer.cardId);
  return false;
}
function offerPrice(offer){
  if(offer.type==='trade'){
    const g = CARDS.find(c=>c.id===offer.giveId);
    const w = CARDS.find(c=>c.id===offer.wantId);
    return Math.max(g?.price||0, w?.price||0);
  }
  return offer.price||0;
}
function offerValueScore(offer){
  // Higher = better for player
  if(offer.type==='buy'){
    const c = CARDS.find(x=>x.id===offer.cardId);
    const fair = c?.price||1;
    return fair - offer.price; // positive if under fair
  }
  if(offer.type==='sell'){
    const c = CARDS.find(x=>x.id===offer.cardId);
    const fair = c?.price||1;
    return offer.price - fair; // positive if overpaying you
  }
  // trade: prefer receiving higher value than giving
  const g = CARDS.find(c=>c.id===offer.giveId);
  const w = CARDS.find(c=>c.id===offer.wantId);
  return (g?.price||0) - (w?.price||0);
}

function weightedRandomCard(){
  // Bias toward mid/high value occasionally
  const source = (typeof obtainableCards === 'function') ? obtainableCards() : CARDS;
  const r = Math.random();
  let pool;
  if(r < 0.12) pool = source.filter(c=>c.rarity==='legendary');
  else if(r < 0.35) pool = source.filter(c=>c.rarity==='epic');
  else if(r < 0.6) pool = source.filter(c=>c.rarity==='uncommon');
  else pool = source.filter(c=>c.rarity==='common');
  if(!pool.length) pool = source;
  return pool[Math.floor(Math.random()*pool.length)];
}

function makeFeaturedOffer(){
  const pool = (typeof obtainableCards === 'function') ? obtainableCards() : CARDS;
  // Rare/Holo you don't own, priced at 2× market
  const missingRares = pool.filter(c =>
    (c.rarity==='epic' || c.rarity==='legendary') && isMissing(c.id)
  );
  let card;
  if(missingRares.length){
    card = missingRares[Math.floor(Math.random()*missingRares.length)];
  } else {
    // fallback any rare
    const rares = pool.filter(c=>c.rarity==='epic'||c.rarity==='legendary');
    card = rares[Math.floor(Math.random()*rares.length)] || pool[0];
  }
  const price = Math.round((card.price||1) * 2 * 100) / 100;
  const trainer = MARKET_NAMES[Math.floor(Math.random()*MARKET_NAMES.length)];
  return {
    id: 'feat-'+Date.now(),
    type: 'buy',
    trainer,
    cardId: card.id,
    price,
    featured: true,
    taken: false
  };
}

function generateMarketOffers(){
  const offers = [];
  // Featured first
  offers.push(makeFeaturedOffer());
  for(let i=0;i<MARKET_SLOTS;i++){
    const trainer = MARKET_NAMES[Math.floor(Math.random()*MARKET_NAMES.length)];
    const roll = Math.random();
    let offer;
    if(roll < 0.55){
      let give = weightedRandomCard();
      let want = weightedRandomCard();
      let guard=0;
      while(want.id===give.id && guard++<10) want = weightedRandomCard();
      offer = {id:'m'+Date.now()+'-'+i, type:'trade', trainer, giveId:give.id, wantId:want.id, taken:false};
    } else if(roll < 0.8){
      const card = weightedRandomCard();
      const price = Math.max(0.5, Math.round((card.price||1) * (0.7 + Math.random()*0.6) * 100)/100);
      offer = {id:'m'+Date.now()+'-'+i, type:'buy', trainer, cardId:card.id, price, taken:false};
    } else {
      const card = weightedRandomCard();
      const price = Math.max(0.5, Math.round((card.price||1) * (0.8 + Math.random()*0.5) * 100)/100);
      offer = {id:'m'+Date.now()+'-'+i, type:'sell', trainer, cardId:card.id, price, taken:false};
    }
    offers.push(offer);
  }
  return offers;
}

function marketMsLeft(){
  const last = state.marketLastRefresh || 0;
  const elapsed = Date.now() - last;
  return Math.max(0, MARKET_REFRESH_MS - elapsed);
}

function formatMs(ms){
  const s = Math.ceil(ms/1000);
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  const sec = s%60;
  if(h>0) return h+'h '+m+'m';
  if(m>0) return m+'m '+sec+'s';
  return sec+'s';
}

function updateMarketTimer(){
  const el = document.getElementById('market-timer');
  const btn = document.getElementById('market-refresh-btn');
  if(!el) return;
  const left = marketMsLeft();
  if(left <= 0){
    el.innerHTML = 'Next refresh: <strong>Ready</strong>';
    if(btn){ btn.disabled = false; btn.textContent = '🔄 Refresh Market'; }
  } else {
    el.innerHTML = 'Next refresh: <strong>'+formatMs(left)+'</strong>';
    if(btn){ btn.disabled = true; btn.textContent = '🔄 Refresh in '+formatMs(left); }
  }
}

function ensureMarketFresh(){
  // Offline-friendly: uses device clock + localStorage timestamp
  if(!state.marketLastRefresh || marketMsLeft() <= 0 || !state.marketOffersCache || !state.marketOffersCache.length){
    marketOffers = generateMarketOffers();
    state.marketOffersCache = marketOffers;
    state.marketLastRefresh = Date.now();
    save();
  } else {
    marketOffers = state.marketOffersCache;
  }
  updateMarketTimer();
}

function refreshMarket(manual){
  if(manual){
    if(marketMsLeft() > 0){
      showToast('Market refreshes every 2 hours');
      updateMarketTimer();
      return;
    }
  }
  marketOffers = generateMarketOffers();
  state.marketOffersCache = marketOffers;
  state.marketLastRefresh = Date.now();
  save();
  renderMarket();
  updateMarketTimer();
  if(manual) showToast('Market refreshed — new random offers!');
}

function setMarketSort(v){
  marketSort = v || 'want';
  renderMarket();
}

function sortedMarketOffers(){
  const list = marketOffers.slice();
  list.sort((a,b)=>{
    // Featured always first
    if(a.featured && !b.featured) return -1;
    if(b.featured && !a.featured) return 1;
    if(a.taken !== b.taken) return a.taken ? 1 : -1;
    if(marketSort === 'want'){
      const an = offerFillsWant(a) ? 1 : 0;
      const bn = offerFillsWant(b) ? 1 : 0;
      if(an !== bn) return bn - an;
      return offerValueScore(b) - offerValueScore(a);
    }
    if(marketSort === 'value') return offerValueScore(b) - offerValueScore(a);
    if(marketSort === 'price-high') return offerPrice(b) - offerPrice(a);
    if(marketSort === 'price-low') return offerPrice(a) - offerPrice(b);
    return 0;
  });
  return list;
}

function marketCardThumb(card, sideLabel){
  if(!card) return '<div class="market-side"></div>';
  const img = card.art
    ? '<img src="'+card.art+'" alt="'+card.name+'"/>'
    : '<div style="width:56px;height:78px;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:1.4rem;background:#111;border-radius:6px;border:2px solid #3a4560">'+(card.emoji||'🃏')+'</div>';
  const setShort = card.set === 'Wizards Black Star Promos' ? 'Promo'
    : (card.set === 'Base Set' ? 'Base' : (card.set || ''));
  const setLine = setShort
    ? '<div class="m-set" style="font-size:.65rem;color:var(--gold);margin-top:.15rem;opacity:.9">'+setShort+'</div>'
    : '';
  return '<div class="market-side" data-card-id="'+card.id+'" title="'+(card.name||'')+' · '+(card.set||'')+'">'
    + img
    + '<div class="m-name">'+(card.cardNumber||'')+' '+card.name+'</div>'
    + setLine
    + '</div>';
}

function bindMarketHover(el){
  el.querySelectorAll('.market-side[data-card-id]').forEach(side=>{
    const id = side.getAttribute('data-card-id');
    const card = resolveCard(id);
    if(!card) return;
    side.onmouseenter = () => showHoverPreview(card);
    side.onmouseleave = () => hideHoverPreview();
    side.onclick = (e) => { e.stopPropagation(); openZoom(card); };
  });
}

function renderMarketHistory(){
  const ul = document.getElementById('market-history-list');
  if(!ul) return;
  const hist = state.marketHistory || [];
  if(!hist.length){
    ul.innerHTML = '<li>No trades yet</li>';
    return;
  }
  ul.innerHTML = hist.slice(0, 20).map(h =>
    '<li><span>'+h.text+'</span> · '+new Date(h.at).toLocaleString()+'</li>'
  ).join('');
}

function pushMarketHistory(text){
  if(!state.marketHistory) state.marketHistory = [];
  state.marketHistory.unshift({ text, at: Date.now() });
  state.marketHistory = state.marketHistory.slice(0, 30);
}

function renderMarket(){
  const grid = document.getElementById('market-grid');
  if(!grid) return;
  ensureMarketFresh();
  const sortEl = document.getElementById('market-sort');
  if(sortEl) sortEl.value = marketSort;
  if(typeof updateMarketSummary === 'function') updateMarketSummary();

  grid.innerHTML = '';
  const list = sortedMarketOffers();
  list.forEach(offer=>{
    const el = document.createElement('div');
    const wanted = offerFillsWant(offer);
    el.className = 'market-card'
      + (offer.taken ? ' done' : '')
      + (offer.featured ? ' featured' : '')
      + (wanted && !offer.taken ? ' needed' : '');

    let dealHTML = '';
    let status = '';
    let can = !offer.taken;
    let btnLabel = 'Accept';
    let badges = '';

    if(offer.featured) badges += '<span class="m-badge feat">Featured · 2×</span> ';
    if(wanted) badges += '<span class="m-badge want">Want list</span> ';

    if(offer.type==='trade'){
      const give = CARDS.find(c=>c.id===offer.giveId);
      const want = CARDS.find(c=>c.id===offer.wantId);
      dealHTML = '<div class="market-deal">'
        + marketCardThumb(want)
        + '<div class="market-arrow">⇄</div>'
        + marketCardThumb(give)
        + '</div>';
      status = 'You give ← left · You get → right';
      can = can && (colGet(state.collection, offer.wantId)) >= 1;
      btnLabel = can ? 'Trade' : 'Need their card';
      if((colGet(state.collection, offer.wantId))<1) btnLabel = "You don't have "+(want?want.name:'card');
    } else if(offer.type==='buy'){
      const card = CARDS.find(c=>c.id===offer.cardId);
      const fair = card?.price||0;
      dealHTML = '<div class="market-deal">'
        + '<div class="market-side m-cash">$'+offer.price.toFixed(2)
        + (offer.featured ? '<div style="font-size:.65rem;color:var(--muted)">fair $'+fair.toFixed(2)+'</div>' : '')
        + '</div>'
        + '<div class="market-arrow">→</div>'
        + marketCardThumb(card)
        + '</div>';
      status = offer.featured ? 'Featured rare at 2× market price' : 'They sell · you buy';
      can = can && state.money >= offer.price;
      btnLabel = can ? 'Buy' : 'Need $'+offer.price.toFixed(2);
    } else {
      const card = CARDS.find(c=>c.id===offer.cardId);
      dealHTML = '<div class="market-deal">'
        + marketCardThumb(card)
        + '<div class="market-arrow">→</div>'
        + '<div class="market-side m-cash">$'+offer.price.toFixed(2)+'</div>'
        + '</div>';
      status = 'They buy · you sell (need duplicate)';
      can = can && (colGet(state.collection, offer.cardId)) > 1;
      btnLabel = can ? 'Sell' : 'Need duplicate';
    }

    el.innerHTML = `
      <div class="m-head">
        <span class="m-trainer">${offer.trainer}</span>
        <span class="m-type">${offer.featured?'Featured':(offer.type==='trade'?'Swap':(offer.type==='buy'?'Selling':'Buying'))}</span>
      </div>
      <div style="display:flex;gap:.35rem;flex-wrap:wrap">${badges}</div>
      ${dealHTML}
      <div style="font-size:.75rem;color:var(--muted)">${status}</div>
      <div class="m-actions">
        <button class="btn" style="width:100%;padding:.45rem;font-size:.85rem" ${can?'':'disabled'} onclick="acceptMarket('${offer.id}')">${btnLabel}</button>
      </div>`;
    grid.appendChild(el);
    bindMarketHover(el);
  });
  renderMarketHistory();
  updateMarketTimer();
}

function acceptMarket(id){
  const offer = marketOffers.find(o=>o.id===id);
  if(!offer || offer.taken) return;

  let hist = '';
  if(offer.type==='trade'){
    if((colGet(state.collection, offer.wantId)) < 1){ showToast('You do not have that card'); return; }
    const give = CARDS.find(c=>c.id===offer.giveId);
    const want = CARDS.find(c=>c.id===offer.wantId);
    colSet(state.collection, offer.wantId, colGet(state.collection, offer.wantId) - 1);
    colSet(state.collection, offer.giveId, colGet(state.collection, offer.giveId) + 1);
    hist = 'Traded '+(want?want.name:'?')+' for '+(give?give.name:'?')+' with '+offer.trainer;
    showToast('Trade complete with '+offer.trainer+'!');
  } else if(offer.type==='buy'){
    if(state.money < offer.price){ showToast('Not enough money'); return; }
    const card = CARDS.find(c=>c.id===offer.cardId);
    state.money = Math.round((state.money - offer.price)*100)/100;
    colSet(state.collection, offer.cardId, colGet(state.collection, offer.cardId) + 1);
    hist = 'Bought '+(card?card.name:'card')+' for $'+offer.price.toFixed(2)+' from '+offer.trainer;
    showToast('Bought card for $'+offer.price.toFixed(2));
  } else {
    if((colGet(state.collection, offer.cardId)) <= 1){ showToast('Need a duplicate to sell'); return; }
    const card = CARDS.find(c=>c.id===offer.cardId);
    colSet(state.collection, offer.cardId, colGet(state.collection, offer.cardId) - 1);
    state.money = Math.round((state.money + offer.price)*100)/100;
    state.stats.sells = (state.stats.sells||0)+1;
    hist = 'Sold '+(card?card.name:'card')+' for $'+offer.price.toFixed(2)+' to '+offer.trainer;
    showToast('Sold to '+offer.trainer+' for $'+offer.price.toFixed(2));
  }
  offer.taken = true;
  pushMarketHistory(hist);
  state.marketOffersCache = marketOffers;
  save(); updateUI(); renderCollection(); renderSellList(); renderBinder(); renderQuests(); renderMarket();
}


async function loadShopSettings(){
  // defaults already in SHOP; try cloud
  if(sb){
    try{
      const { data, error } = await sb.from('shop_settings').select('*').eq('id', 1).maybeSingle();
      if(!error && data){
        SHOP.pack_single = Number(data.pack_single) || SHOP.pack_single;
        SHOP.pack_bundle = Number(data.pack_bundle) || SHOP.pack_bundle;
        SHOP.pack_box = Number(data.pack_box) || SHOP.pack_box;
        SHOP.sale_percent = Number(data.sale_percent) || 0;
        SHOP.sale_ends_at = data.sale_ends_at || null;
        SHOP.cosmetic_sale_percent = Number(data.cosmetic_sale_percent) || 0;
        SHOP.cosmetic_sale_ends_at = data.cosmetic_sale_ends_at || null;
      }
    }catch(e){ console.warn('shop_settings load', e); }
  }
  try{
    const local = localStorage.getItem('pokemonShopSettings');
    if(local && !sb){
      Object.assign(SHOP, JSON.parse(local));
    }
  }catch(e){}
  shopSyncAliases();
  updateShopPackUI();
  if(typeof renderCosmeticsShop === 'function') renderCosmeticsShop();
  if(typeof updateUI === 'function') updateUI();
}

async function saveShopSettings(){
  shopSyncAliases();
  try{ localStorage.setItem('pokemonShopSettings', JSON.stringify(SHOP)); }catch(e){}
  if(!sb || !currentUser?.is_admin) return false;
  try{
    const row = {
      id: 1,
      pack_single: Number(SHOP.pack_single),
      pack_bundle: Number(SHOP.pack_bundle),
      pack_box: Number(SHOP.pack_box),
      sale_percent: Number(SHOP.sale_percent)||0,
      sale_ends_at: SHOP.sale_ends_at || null,
      cosmetic_sale_percent: Number(SHOP.cosmetic_sale_percent)||0,
      cosmetic_sale_ends_at: SHOP.cosmetic_sale_ends_at || null,
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('shop_settings').upsert(row);
    if(error) throw error;
    return true;
  }catch(e){
    console.error(e);
    showToast('Saved locally — run sql/004_shop_settings.sql for cloud sync');
    return false;
  }
}

function updateShopPackUI(){
  const single = shopPackCost(1);
  const bundle = shopPackCost(3);
  const box = shopPackCost(36);
  const baseS = Number(SHOP.pack_single)||4;
  const baseB = Number(SHOP.pack_bundle)||10;
  const baseX = Number(SHOP.pack_box)||99;
  const pct = shopSaleActive('pack');
  const set = (id, text) => { const el = document.getElementById(id); if(el) el.textContent = text; };
  set('shop-price-1', '$' + single.toFixed(2));
  set('shop-price-3', '$' + bundle.toFixed(2));
  set('shop-price-36', '$' + box.toFixed(2));
  set('shop-per-1', '$' + single.toFixed(2) + ' / pack');
  set('shop-per-3', '$' + (bundle/3).toFixed(2) + ' / pack');
  set('shop-per-36', '$' + (box/36).toFixed(2) + ' / pack');
  if(typeof updateMysteryBoxUI === 'function') updateMysteryBoxUI();
  // badges
  const save3 = baseS*3 > baseB ? Math.round((1 - baseB/(baseS*3))*100) : 0;
  const save36 = baseS*36 > baseX ? Math.round((1 - baseX/(baseS*36))*100) : 0;
  const b3 = document.getElementById('shop-badge-3');
  const b36 = document.getElementById('shop-badge-36');
  if(b3){ b3.textContent = save3 > 0 ? ('Save ~'+save3+'%') : '3 packs'; b3.className = 'shop-pack-badge' + (save3>0?' save':''); }
  if(b36){ b36.textContent = save36 > 0 ? ('Best value') : '36 packs'; b36.className = 'shop-pack-badge' + (save36>0?' best':''); }
  // sale banner
  let banner = document.getElementById('shop-sale-banner');
  if(!banner){
    const packsSec = document.getElementById('shop-sec-packs');
    if(packsSec){
      banner = document.createElement('div');
      banner.id = 'shop-sale-banner';
      packsSec.insertBefore(banner, packsSec.firstChild);
    }
  }
  if(banner){
    if(pct > 0){
      const ends = SHOP.sale_ends_at ? (' · ends ' + new Date(SHOP.sale_ends_at).toLocaleString()) : '';
      banner.style.cssText = 'margin-bottom:.75rem;padding:.55rem .8rem;border-radius:10px;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.35);color:#4ade80;font-size:.85rem;font-weight:700';
      banner.textContent = '🏷 Pack sale: ' + pct + '% off' + ends;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  }
  // strike base prices if on sale
  const strike = (id, base, now) => {
    const el = document.getElementById(id);
    if(!el) return;
    if(pct > 0 && now < base){
      el.innerHTML = '<span style="text-decoration:line-through;color:#8b9bb8;font-size:.85rem;margin-right:.35rem">$'+base.toFixed(2)+'</span>$'+now.toFixed(2);
    } else {
      el.textContent = '$' + now.toFixed(2);
    }
  };
  strike('shop-price-1', baseS, single);
  strike('shop-price-3', baseB, bundle);
  strike('shop-price-36', baseX, box);
}

function adminFillShopForm(){
  const setv = (id, v) => { const el = document.getElementById(id); if(el) el.value = v == null ? '' : v; };
  setv('admin-pack-single', SHOP.pack_single);
  setv('admin-pack-bundle', SHOP.pack_bundle);
  setv('admin-pack-box', SHOP.pack_box);
  setv('admin-pack-sale', SHOP.sale_percent || 0);
  setv('admin-pack-sale-end', SHOP.sale_ends_at ? SHOP.sale_ends_at.slice(0,16) : '');
  setv('admin-cosmo-sale', SHOP.cosmetic_sale_percent || 0);
  setv('admin-cosmo-sale-end', SHOP.cosmetic_sale_ends_at ? SHOP.cosmetic_sale_ends_at.slice(0,16) : '');
}

async function adminSaveShopPrices(){
  const num = (id, fallback) => {
    const el = document.getElementById(id);
    const v = parseFloat(el && el.value);
    return isFinite(v) ? v : fallback;
  };
  const dt = (id) => {
    const el = document.getElementById(id);
    if(!el || !el.value) return null;
    const d = new Date(el.value);
    return isFinite(d.getTime()) ? d.toISOString() : null;
  };
  SHOP.pack_single = Math.max(0.01, num('admin-pack-single', 4));
  SHOP.pack_bundle = Math.max(0.01, num('admin-pack-bundle', 10));
  SHOP.pack_box = Math.max(0.01, num('admin-pack-box', 99));
  SHOP.sale_percent = Math.max(0, Math.min(90, num('admin-pack-sale', 0)));
  SHOP.sale_ends_at = dt('admin-pack-sale-end');
  SHOP.cosmetic_sale_percent = Math.max(0, Math.min(90, num('admin-cosmo-sale', 0)));
  SHOP.cosmetic_sale_ends_at = dt('admin-cosmo-sale-end');
  shopSyncAliases();
  const ok = await saveShopSettings();
  updateShopPackUI();
  if(typeof renderCosmeticsShop === 'function') renderCosmeticsShop();
  const msg = document.getElementById('admin-shop-msg');
  if(msg){ msg.textContent = ok ? 'Prices saved for everyone' : 'Saved on this device (cloud table missing?)'; msg.className = 'lw-msg ' + (ok?'ok':'err'); }
  showToast('Shop prices updated');
}

function adminClearSales(){
  SHOP.sale_percent = 0;
  SHOP.sale_ends_at = null;
  SHOP.cosmetic_sale_percent = 0;
  SHOP.cosmetic_sale_ends_at = null;
  adminFillShopForm();
  adminSaveShopPrices();
}

function ensurePackQueue(){ if(!Array.isArray(state.packQueue)) state.packQueue=[]; }
function buyShopPacks(qty){
  const sel = document.getElementById('shop-pack-set');
  const setName = (sel && sel.value) || 'Base Set';
  let cost = shopPackCost(qty);
  let usedDiscount = false;
  if(state.luckBuffs && state.luckBuffs.shopDiscount && qty >= 1){
    cost = Math.round(cost * 0.75 * 100) / 100;
    usedDiscount = true;
  }
  if(state.money < cost){ showToast('Not enough money!'); return; }
  state.money = Math.round((state.money - cost) * 100) / 100;
  if(usedDiscount){
    state.luckBuffs.shopDiscount = false;
    showToast('Luck Wheel shop discount applied (−25%)');
  }
  ensurePackQueue();
  for(let i = 0; i < qty; i++) state.packQueue.push(setName);
  state.packs = state.packQueue.length;
  if(!state.stats) state.stats = {};
  state.stats.weekSpend = Math.round(((state.stats.weekSpend||0) + cost) * 100) / 100;
  save(); updateUI();
  if(typeof updateOpenSetStatus === 'function') updateOpenSetStatus();
  // Guess the Pull Count — grow prize pool from real spend
  if(typeof gpcRecordSpend === 'function'){
    try { gpcRecordSpend(cost); } catch(e) { console.warn('[gpc]', e); }
  }
  const label = qty === 1 ? '1 ' + setName + ' pack' : qty + ' ' + setName + ' packs';
  showToast(label + ' purchased for $' + cost.toFixed(2));
}
// Back-compat aliases
function buyPack(){ const s=document.getElementById('shop-pack-set'); if(s) s.value='Base Set'; buyShopPacks(1); }
function buyJunglePack(){ const s=document.getElementById('shop-pack-set'); if(s) s.value='Jungle'; buyShopPacks(1); }
function buyBundle(){ buyShopPacks(3); }
function buyBox(){ buyShopPacks(BOX_PACKS); }
function devGiveMoney(){ /* removed */ }

/* ===== Mystery Box Fridays ===== */
/* Limits: 1 free + up to 2 paid per Friday (per user) */
const MYSTERY_BOX_PAID_CAP = 2;

function isMysteryBoxDay(){
  if(SHOP && SHOP.mystery_box_force) return true;
  return new Date().getDay() === 5;
}
function mysteryBoxFridayKey(d){
  d = d || new Date();
  // Key = the Friday date (YYYY-MM-DD) of the current/most recent Friday window
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay(); // 0 Sun .. 5 Fri
  const diff = (day >= 5) ? (day - 5) : (day + 2); // days since Friday
  x.setDate(x.getDate() - diff);
  const pad = n => String(n).padStart(2,'0');
  return x.getFullYear() + '-' + pad(x.getMonth()+1) + '-' + pad(x.getDate());
}
function ensureMysteryBoxLimits(){
  if(!state.mysteryBoxLimits || typeof state.mysteryBoxLimits !== 'object'){
    state.mysteryBoxLimits = { week: null, freeClaimed: false, paidCount: 0 };
  }
  const key = mysteryBoxFridayKey();
  if(state.mysteryBoxLimits.week !== key){
    state.mysteryBoxLimits = { week: key, freeClaimed: false, paidCount: 0 };
  }
  return state.mysteryBoxLimits;
}
function mysteryBoxPrice(){
  const base = Number(SHOP && SHOP.mystery_box_price) || 25;
  return shopApplySale(base, 'pack');
}
function mysteryBoxRemaining(){
  const lim = ensureMysteryBoxLimits();
  const freeLeft = lim.freeClaimed ? 0 : 1;
  const paidLeft = Math.max(0, MYSTERY_BOX_PAID_CAP - (lim.paidCount || 0));
  return { freeLeft, paidLeft, totalLeft: freeLeft + paidLeft, lim };
}
function updateMysteryBoxUI(){
  const priceEl = document.getElementById('shop-price-mystery');
  const btn = document.getElementById('mystery-box-buy-btn');
  const status = document.getElementById('mystery-box-status');
  const badge = document.getElementById('mystery-box-badge');
  const openBtn = document.getElementById('open-set-mystery');
  const mPrice = document.getElementById('mb-modal-price');
  const mBtn = document.getElementById('mb-modal-buy-btn');
  const mStatus = document.getElementById('mb-modal-status');
  const price = mysteryBoxPrice();
  const open = isMysteryBoxDay();
  const { freeLeft, paidLeft, totalLeft } = mysteryBoxRemaining();

  if(priceEl){
    priceEl.textContent = freeLeft > 0 ? 'FREE + $' + price.toFixed(2) : '$' + price.toFixed(2);
  }
  if(mPrice){
    mPrice.textContent = freeLeft > 0 ? 'FREE (then $' + price.toFixed(2) + ')' : '$' + price.toFixed(2);
  }

  let btnLabel = 'Opens Friday';
  let can = false;
  if(open){
    if(freeLeft > 0){ btnLabel = 'Claim Free Box'; can = true; }
    else if(paidLeft > 0){ btnLabel = 'Buy Mystery Box $' + price.toFixed(0); can = true; }
    else { btnLabel = 'Limit reached'; can = false; }
  }
  if(btn){ btn.disabled = !can; btn.textContent = btnLabel; }
  if(mBtn){ mBtn.disabled = !can; mBtn.textContent = btnLabel; }
  if(badge) badge.textContent = open ? 'LIVE · Friday' : 'Fridays only';

  const limitLine = open
    ? ('This Friday: ' + (freeLeft ? '1 free left' : 'free claimed') + ' · ' + paidLeft + ' paid left (max ' + MYSTERY_BOX_PAID_CAP + ' paid).')
    : 'Come back Friday. Boxes you already own can still be opened any day.';
  if(status){
    status.textContent = open
      ? 'Mixed Base / Jungle / Fossil. ' + limitLine
      : limitLine;
  }
  if(mStatus) mStatus.textContent = limitLine;

  if(openBtn){
    const n = (typeof countPacksForSet === 'function') ? countPacksForSet(MYSTERY_BOX_SET) : 0;
    openBtn.style.display = n > 0 ? '' : 'none';
  }
}
function buyMysteryBox(){
  if(!isMysteryBoxDay()){
    showToast('Mystery Box is Fridays only');
    updateMysteryBoxUI();
    return;
  }
  const { freeLeft, paidLeft, lim } = mysteryBoxRemaining();
  if(freeLeft <= 0 && paidLeft <= 0){
    showToast('Friday limit reached (1 free + ' + MYSTERY_BOX_PAID_CAP + ' paid)');
    updateMysteryBoxUI();
    return;
  }
  let cost = 0;
  let usedFree = false;
  if(freeLeft > 0){
    cost = 0;
    usedFree = true;
  } else {
    cost = mysteryBoxPrice();
    if(state.money < cost){ showToast('Not enough money!'); return; }
    state.money = Math.round((state.money - cost) * 100) / 100;
  }
  if(usedFree) lim.freeClaimed = true;
  else lim.paidCount = (lim.paidCount || 0) + 1;
  state.mysteryBoxLimits = lim;

  // Resolve the box's 11 cards immediately (same moment normal packs commit cards to the
  // collection) — the reveal modal below is just presentation on top of an already-settled pull.
  const packCards = buildMysteryPack();
  if(typeof consumeLuckBuffOnPackOpen === 'function') consumeLuckBuffOnPackOpen();
  const cards = [];
  for(const card of packCards){
    const wasNew = colGet(state.collection, card) === 0;
    colSet(state.collection, card, colGet(state.collection, card) + 1);
    cards.push({...card, isNew: wasNew});
  }
  lastPackCards = cards.slice();
  if(typeof recordPackOpenedStats === 'function') recordPackOpenedStats(cards, MYSTERY_BOX_SET);
  save(); updateUI();
  if(typeof updateMysteryBoxUI === 'function') updateMysteryBoxUI();
  if(cost > 0 && typeof gpcRecordSpend === 'function'){
    try { gpcRecordSpend(cost); } catch(e) { console.warn('[gpc]', e); }
  }
  if(typeof renderCollection === 'function') renderCollection();
  if(typeof renderSellList === 'function') renderSellList();
  if(typeof renderBinder === 'function') renderBinder();
  if(typeof renderQuests === 'function') renderQuests();
  if(typeof renderSealedPackPreview === 'function') renderSealedPackPreview();
  if(typeof checkNewlyCompletedQuests === 'function') checkNewlyCompletedQuests();
  if(typeof checkNewlyCompletedAchievements === 'function') checkNewlyCompletedAchievements();
  openMysteryBoxRevealModal(cards);
}

/* ===== Mystery Box explode-reveal modal ===== */
let _mbRevealCards = [];
let _mbRevealBusy = false;

function openMysteryBoxRevealModal(cards){
  _mbRevealCards = cards || [];
  _mbRevealBusy = false;
  const modal = document.getElementById('mystery-box-reveal-modal');
  if(!modal) return;
  const box = document.getElementById('mb-reveal-box');
  const grid = document.getElementById('mb-reveal-grid');
  const hint = document.getElementById('mb-reveal-hint');
  const doneBtn = document.getElementById('mb-reveal-done-btn');
  if(box){ box.classList.remove('exploding'); box.style.display = ''; }
  if(grid) grid.innerHTML = '';
  if(hint) hint.style.display = '';
  if(doneBtn) doneBtn.style.display = 'none';
  modal.classList.add('open');
}

function mysteryBoxReveal(){
  if(_mbRevealBusy || !_mbRevealCards.length) return;
  _mbRevealBusy = true;
  const box = document.getElementById('mb-reveal-box');
  const hint = document.getElementById('mb-reveal-hint');
  if(hint) hint.style.display = 'none';
  if(box) box.classList.add('exploding');
  setTimeout(() => {
    if(box) box.style.display = 'none';
    renderMysteryBoxRevealGrid();
    const doneBtn = document.getElementById('mb-reveal-done-btn');
    if(doneBtn) doneBtn.style.display = '';
  }, 550);
}

function renderMysteryBoxRevealGrid(){
  const grid = document.getElementById('mb-reveal-grid');
  if(!grid) return;
  grid.innerHTML = '';
  _mbRevealCards.forEach((card, i) => {
    const el = document.createElement('div');
    el.className = 'lp-card mb-reveal-card' + (card.isNew ? ' new-pull' : '');
    el.style.borderColor = TYPE_COLORS[card.type1] || '#888';
    el.style.animationDelay = (i * 70) + 'ms';
    if(card.art){
      el.innerHTML = '<img src="'+card.art+'" alt="'+card.name+'"/>';
    } else {
      el.textContent = card.emoji || '🃏';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '1.6rem';
    }
    el.onmouseenter = () => showHoverPreview(card);
    el.onmouseleave = () => hideHoverPreview();
    el.onclick = () => openZoom(card);
    el.title = (card.cardNumber||'') + ' ' + card.name + (card.isNew ? ' · NEW' : '');
    grid.appendChild(el);
  });
}

function closeMysteryBoxRevealModal(){
  const modal = document.getElementById('mystery-box-reveal-modal');
  if(modal) modal.classList.remove('open');
  _mbRevealCards = [];
  _mbRevealBusy = false;
}

function mysteryCardPullWeight(card){
  // Softer curve than normal packs → wider swing from junk to chase
  const price = Math.max(0, Number(card.price) || 0);
  return 1 / Math.pow(price + 1.5, 0.9);
}
function pickMysteryWeighted(pool, used){
  const available = pool.filter(c => !used.has(c.id));
  const source = available.length ? available : pool.slice();
  if(!source.length) return null;
  let total = 0;
  const weights = source.map(c => {
    const w = mysteryCardPullWeight(c);
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for(let i = 0; i < source.length; i++){
    r -= weights[i];
    if(r <= 0){
      used.add(source[i].id);
      return source[i];
    }
  }
  const last = source[source.length - 1];
  used.add(last.id);
  return last;
}
function buildMysteryPack(){
  // Mixed-set pack: 1 rare-slot + 3 uncommon + 7 common across Base/Jungle/Fossil
  const sets = availableBoosterSets();
  const inSets = (c) => sets.includes(c.set);
  const used = new Set();
  const cards = [];
  const rarePool = CARDS.filter(c => inSets(c) && (c.rarity === 'epic' || c.rarity === 'legendary'));
  const uncPool = CARDS.filter(c => inSets(c) && c.rarity === 'uncommon');
  const comPool = CARDS.filter(c => inSets(c) && c.rarity === 'common');
  const rare = pickMysteryWeighted(rarePool, used);
  if(rare) cards.push(rare);
  for(let i = 0; i < 3; i++){
    const c = pickMysteryWeighted(uncPool, used);
    if(c) cards.push(c);
  }
  for(let i = 0; i < 7; i++){
    const c = pickMysteryWeighted(comPool, used);
    if(c) cards.push(c);
  }
  for(let i = cards.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  cards._packSet = MYSTERY_BOX_SET;
  window._lastPackSet = MYSTERY_BOX_SET;
  return cards;
}


function cardsForBinderSet(){
  if(!binderSet) return [];
  return CARDS.filter(c => c.set === binderSet);
}
function binderPageCount(){
  const list = cardsForBinderSet();
  return Math.max(1, Math.ceil(list.length / BINDER_PER_PAGE));
}
function binderPrev(){
  binderPage = Math.max(0, binderPage-1);
  renderBinderPages();
}
function binderNext(){
  binderPage = Math.min(binderPageCount()-1, binderPage+1);
  renderBinderPages();
}
function openBinderSet(setName){
  binderSet = setName;
  binderView = 'open';
  binderPage = 0;
  renderBinder();
  populateBinderStylePicker();
}
function closeBinderSet(){
  binderView = 'shelf';
  binderSet = null;
  binderPage = 0;
  renderBinder();
}

function binderLabelIsDarkText(artUrl){
  const lightBottoms = ['electric','fairy','flying','ground','ice','normal','steel','bug','rock'];
  const src = (artUrl || '') + '';
  for(const key of lightBottoms){
    if(src.indexOf(key + '_binder') !== -1) return true;
  }
  const item = (typeof getEquippedBinderCosmetic === 'function') ? getEquippedBinderCosmetic() : null;
  if(item && item.id){
    const id = String(item.id).replace(/^binder_/, '');
    if(lightBottoms.indexOf(id) !== -1) return true;
  }
  if(!item) return true; // default Normal
  return false;
}
function binderCoverLabel(setName){
  // Short labels so text fits the gold plate on binder art
  const map = {
    'Base Set': 'Base Set',
    'Jungle': 'Jungle',
    'Fossil': 'Fossil',
    'Wizards Black Star Promos': 'Black Star Promos',
    'Team Rocket': 'Team Rocket',
    'Gym Heroes': 'Gym Heroes',
    'Gym Challenge': 'Gym Challenge'
  };
  if(map[setName]) return map[setName];
  if(setName && setName.length > 20) return setName.replace(/^Wizards\s+/i,'').trim();
  return setName || '';
}
function getBinderStyleIdForSet(setName){
  const map = (state && state.binderCosmetics) || {};
  return map[setName] || null;
}
function getBinderCosmeticForSet(setName){
  const id = getBinderStyleIdForSet(setName);
  if(id && typeof COSMETICS !== 'undefined') return COSMETICS.find(c => c.id === id) || null;
  return null;
}
function getBinderArtForSet(setName){
  const item = getBinderCosmeticForSet(setName);
  if(item){
    if(item.art) return item.art;
    if(item.value && String(item.value).startsWith('art/')) return item.value;
  }
  return (typeof getEquippedBinderArt === 'function') ? getEquippedBinderArt() : null;
}
function getBinderClassForSet(setName){
  const item = getBinderCosmeticForSet(setName);
  if(item && item.value && String(item.value).startsWith('cosmo-binder-')) return String(item.value);
  return null;
}
function populateBinderStylePicker(){
  const sel = document.getElementById('binder-style-select');
  if(!sel || !binderSet) return;
  const owned = (state.cosmeticsOwned || []);
  const items = (typeof COSMETICS !== 'undefined' ? COSMETICS : []).filter(c => c.cat === 'binderTheme' && owned.includes(c.id));
  const current = getBinderStyleIdForSet(binderSet) || '';
  sel.innerHTML = '<option value="">Default / Equipped</option>' + items.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sel.value = current;
}
function setCurrentBinderStyle(id){
  if(!binderSet) return;
  if(!state.binderCosmetics || typeof state.binderCosmetics !== 'object') state.binderCosmetics = {};
  if(id){
    const item = (typeof COSMETICS !== 'undefined' ? COSMETICS : []).find(c => c.id === id);
    if(!item || item.cat !== 'binderTheme' || !(state.cosmeticsOwned || []).includes(id)){ showToast('You do not own that binder style'); populateBinderStylePicker(); return; }
    state.binderCosmetics[binderSet] = id;
  } else { delete state.binderCosmetics[binderSet]; }
  save();
  renderBinderShelf();
  renderBinderPages();
  showToast(id ? 'Binder style updated' : 'Binder style reset');
}
function renderBinderShelf(){
  const el = document.getElementById('binder-covers');
  if(!el) return;
  el.innerHTML = '';
  BINDER_SETS.forEach(set=>{
    const setCards = CARDS.filter(c => c.set === set.name);
    const owned = setCards.filter(c => (colGet(state.collection, c)) > 0).length;
    const total = setCards.length || set.total;
    const pct = total ? Math.round(owned/total*100) : 0;
    const cover = document.createElement('div');
    cover.className = 'set-cover';
    cover.onclick = () => openBinderSet(set.name);
    const binderArt = getBinderArtForSet(set.name);
    if(binderArt){
      cover.classList.add('set-cover-themed');
      const label = (typeof binderCoverLabel === 'function') ? binderCoverLabel(set.name) : set.name;
      const lenClass = label.length > 18 ? ' xlong' : (label.length > 12 ? ' long' : '');
      const darkClass = (typeof binderLabelIsDarkText === 'function' && binderLabelIsDarkText(binderArt)) ? ' dark-text' : '';
      cover.innerHTML = `
        <div class="set-cover-book set-cover-art">
          <img class="sc-binder-img" src="${binderArt}" alt="${set.name} binder"/>
          <div class="sc-set-label${lenClass}${darkClass}">${label}</div>
        </div>
        <div class="sc-meta"><strong>${owned}</strong> / ${total} · ${pct}%</div>`;
    } else {
      cover.innerHTML = `
        <div class="set-cover-book">
          <span class="sc-spine-label">${set.name.toUpperCase()}</span>
          <img src="${set.cover}" alt="${set.name}"/>
          <div class="sc-title">${set.name}</div>
        </div>
        <div class="sc-meta"><strong>${owned}</strong> / ${total} · ${pct}%</div>`;
    }
    el.appendChild(cover);
  });
}
let binderEditMode = false;
let binderPickSlot = null; // global slot index when placing

function getBinderLayout(){
  // Returns array of cardIds (or null) length = set size
  const list = cardsForBinderSet();
  if(state.binderLayout && typeof state.binderLayout === 'object'){
    const out = [];
    for(let i=0;i<list.length;i++){
      const id = state.binderLayout[String(i)];
      out.push(id != null ? Number(id) : null);
    }
    return out;
  }
  // Default: set order — only show owned cards in their natural slot
  return list.map(c => ((colGet(state.collection, c)) > 0 ? c.id : null));
}

function toggleBinderEdit(){
  binderEditMode = !binderEditMode;
  const btn = document.getElementById('binder-edit-btn');
  const hint = document.getElementById('binder-hint');
  if(btn) btn.textContent = binderEditMode ? '✓ Done' : '✏️ Arrange';
  if(hint) hint.textContent = binderEditMode
    ? 'Edit mode: click empty slot to place · click placed card to remove'
    : '9 cards per page · click empty slot to place a card';
  renderBinderPages();
}

function resetBinderLayout(){
  if(!confirm('Reset binder to default set order?')) return;
  state.binderLayout = null;
  binderEditMode = false;
  save();
  renderBinderPages();
  showToast('Binder reset to set order');
}

let binderPickSetFilter = 'all';

function openBinderPick(globalSlot){
  binderPickSlot = globalSlot;
  binderPickSetFilter = binderSet || 'all';
  const modal = document.getElementById('binder-pick-modal');
  if(!modal) return;
  const search = document.getElementById('binder-pick-search');
  if(search) search.value = '';

  // Build set filter buttons from owned sets + current binder set
  const setFilters = document.getElementById('binder-pick-set-filters');
  if(setFilters){
    const sets = (SETS && SETS.length) ? SETS.map(s => s.name) : [...new Set(CARDS.map(c => c.set).filter(Boolean))].sort();
    const allSets = ['all', ...sets];
    setFilters.innerHTML = allSets.map(s => {
      const label = s === 'all' ? 'All sets' : s;
      const active = (s === binderPickSetFilter) ? ' active' : '';
      return `<button type="button" class="filter-btn${active}" data-pick-set="${s}" onclick="setBinderPickSetFilter('${s.replace(/'/g,"\\'")}')">${label}</button>`;
    }).join('');
  }

  renderBinderPickList();
  modal.style.display = 'flex';
  if(search) setTimeout(() => search.focus(), 50);
}

function setBinderPickSetFilter(setName){
  binderPickSetFilter = setName;
  document.querySelectorAll('#binder-pick-set-filters .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-pick-set') === setName);
  });
  renderBinderPickList();
}

function renderBinderPickList(){
  const listEl = document.getElementById('binder-pick-list');
  if(!listEl) return;
  const q = ((document.getElementById('binder-pick-search') || {}).value || '').trim().toLowerCase();
  const layout = getBinderLayout();
  const placed = new Set(layout.filter(id => id != null));

  let owned = CARDS.filter(c => (colGet(state.collection, c)) > 0);
  // Always restrict to current binder set
  const lockSet = binderSet || binderPickSetFilter;
  if(lockSet && lockSet !== 'all'){
    owned = owned.filter(c => c.set === lockSet);
  }
  if(q){
    owned = owned.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.cardNumber || '').toLowerCase().includes(q) ||
      (c.set || '').toLowerCase().includes(q) ||
      String(c.num || '').includes(q)
    );
  }

  listEl.innerHTML = owned.map(c => {
    const inBinder = placed.has(c.id);
    return `<div class="live-card-pick" style="cursor:pointer;opacity:${inBinder?0.45:1}" onclick="placeBinderCard(${c.id})" title="${c.name}${inBinder?' (already placed)':''} · ${c.set||''}">
      ${c.art ? `<img src="${c.art}" alt="${c.name}">` : ''}
      <div class="live-card-meta"><strong>${c.name}</strong><span>×${colGet(state.collection, c)}${c.set && binderPickSetFilter==='all' ? ' · '+c.set : ''}</span></div>
    </div>`;
  }).join('') || '<span style="color:var(--muted)">No matching owned cards</span>';
}

function closeBinderPick(){
  const modal = document.getElementById('binder-pick-modal');
  if(modal) modal.style.display = 'none';
  binderPickSlot = null;
}

function placeBinderCard(cardId){
  if(binderPickSlot == null) return;
  if(!state.binderLayout) state.binderLayout = {};
  // Remove this card from any other slot first
  for(const k of Object.keys(state.binderLayout)){
    if(Number(state.binderLayout[k]) === cardId) delete state.binderLayout[k];
  }
  state.binderLayout[String(binderPickSlot)] = cardId;
  save();
  closeBinderPick();
  renderBinderPages();
  showToast('Card placed');
}

function removeBinderCard(globalSlot){
  if(!state.binderLayout) return;
  delete state.binderLayout[String(globalSlot)];
  // If layout is empty, set back to null
  if(Object.keys(state.binderLayout).length === 0) state.binderLayout = null;
  save();
  renderBinderPages();
  showToast('Card removed from slot');
}

function renderBinderPages(){
  const pageEl = document.getElementById('binder-page');
  const label = document.getElementById('binder-page-label');
  const prog = document.getElementById('binder-progress');
  const title = document.getElementById('binder-set-title');
  if(!pageEl) return;
  pageEl.classList.remove('binder-local-gold','binder-local-midnight','binder-local-forest','binder-local-art');
  pageEl.style.removeProperty('--binder-local-art');
  const localClass = getBinderClassForSet(binderSet);
  const localArt = getBinderArtForSet(binderSet);
  const localItem = getBinderCosmeticForSet(binderSet);
  if(localClass) pageEl.classList.add(localClass.replace('cosmo-binder-','binder-local-'));
  else if(localItem && localArt && (localItem.art || String(localItem.value||'').startsWith('art/'))){ pageEl.classList.add('binder-local-art'); pageEl.style.setProperty('--binder-local-art','url("'+localArt+'")'); }
  const list = cardsForBinderSet();
  if(title) title.textContent = binderSet || 'Binder';
  const totalPages = binderPageCount();
  if(binderPage >= totalPages) binderPage = totalPages-1;
  if(binderPage < 0) binderPage = 0;
  if(label) label.textContent = 'Page '+(binderPage+1)+' / '+totalPages;
  const start = binderPage * BINDER_PER_PAGE;
  const layout = getBinderLayout();
  pageEl.innerHTML = '';
  for(let i=0;i<BINDER_PER_PAGE;i++){
    const globalSlot = start + i;
    const slot = document.createElement('div');
    if(globalSlot >= list.length){
      slot.className='binder-slot';
      slot.style.opacity='0.25';
      slot.innerHTML='';
      pageEl.appendChild(slot);
      continue;
    }
    const cardId = layout[globalSlot];
    const card = cardId != null ? resolveCard(cardId) : null;
    if(card && (colGet(state.collection, card)) > 0){
      const count = colGet(state.collection, card);
      slot.className='binder-slot owned';
      slot.dataset.rarity = card.rarity||'';
      if(card.art){
        slot.innerHTML = '<div class="bs-art"><img src="'+card.art+'" alt="'+card.name+'"/></div>'+(count>1?'<div class="bs-count">×'+count+'</div>':'');
      } else {
        slot.innerHTML = '<div class="bs-placeholder">'+(card.emoji||'?')+'</div><div class="bs-num">'+(card.cardNumber||'')+'</div><div class="bs-name">'+card.name+'</div>';
      }
      slot.title = card.name + ' · ×' + count;
      if(binderEditMode){
        slot.onclick = () => removeBinderCard(globalSlot);
        slot.title += ' (click to remove)';
      } else {
        slot.onclick = () => openBinderInspect(card);
      }
    } else {
      slot.className='binder-slot missing';
      slot.innerHTML = '<div class="bs-placeholder" style="opacity:.25;font-size:1.8rem">'+(binderEditMode?'＋':'?')+'</div>';
      slot.title = binderEditMode ? 'Click to place a card' : 'Empty slot';
      if(binderEditMode || true){
        slot.style.cursor = 'pointer';
        slot.onclick = () => openBinderPick(globalSlot);
      }
    }
    pageEl.appendChild(slot);
  }
  const owned = list.filter(c=>(colGet(state.collection, c))>0).length;
  if(prog) prog.textContent = owned+' / '+list.length+' collected · '+(binderSet||'');
}
function renderBinder(){
  const shelf = document.getElementById('binder-shelf');
  const open = document.getElementById('binder-open');
  if(!shelf || !open) return;
  if(binderView === 'open' && binderSet){
    shelf.style.display = 'none';
    open.style.display = 'block';
    renderBinderPages();
  } else {
    shelf.style.display = 'block';
    open.style.display = 'none';
    renderBinderShelf();
  }
}

function toggleShowMissing(){
  showMissing = !showMissing;
  const btn = document.getElementById('show-missing-btn');
  if(btn){
    btn.classList.toggle('active', showMissing);
    btn.textContent = showMissing ? 'Showing missing' : 'Show missing';
  }
  renderCollection();
}

function updateCollectionProgress(){
  const releasedSetCodes = (typeof SETS !== 'undefined' && SETS.length) ? new Set(SETS.map(s => s.code)) : null;
  const released = releasedSetCodes ? CARDS.filter(c => releasedSetCodes.has(c.setCode)) : CARDS;
  const pool = currentSet && currentSet !== 'all'
    ? released.filter(c => c.set === currentSet)
    : released;
  const owned = pool.filter(c => (colGet(state.collection, c)) > 0).length;
  const total = pool.length || 1;
  const pct = Math.round(owned / total * 100);
  const fill = document.getElementById('progress-fill');
  if(fill) fill.style.width = pct + '%';
  const pt = document.getElementById('progress-text');
  if(pt){
    if(currentSet && currentSet !== 'all'){
      const label = currentSet === 'Wizards Black Star Promos' ? 'Black Star Promos' : currentSet;
      pt.textContent = pct + '% complete · ' + label + ' (' + owned + '/' + total + ')';
    } else {
      pt.textContent = pct + '% complete · All Sets (' + owned + '/' + total + ')';
    }
  }
  const overall = document.getElementById('col-overall-count');
  if(overall) overall.innerHTML = owned + ' <span>/ ' + total + '</span>';

  // Global collection stats (all sets)
  let unique = 0, copies = 0, holos = 0;
  (CARDS||[]).forEach(c => {
    const n = colGet(state.collection, c) || 0;
    if(n > 0){
      unique++;
      copies += n;
      if(c.rarity === 'legendary') holos += n;
    }
  });
  const setTxt = (id, t) => { const el = document.getElementById(id); if(el) el.textContent = t; };
  setTxt('col-sum-unique', String(unique));
  setTxt('col-sum-copies', String(copies));
  setTxt('col-sum-holos', String(holos));

  // Keep set tabs in sync
  document.querySelectorAll('#col-set-tabs .set-filter').forEach(b => {
    b.classList.toggle('active', (b.dataset.set || '') === currentSet);
  });
}

function renderCollection(){
  const grid=document.getElementById('collection-grid');
  if(!grid) return;
  grid.innerHTML='';
  updateCollectionProgress();
  let list=[...CARDS];
  if(currentSet!=='all') list=list.filter(c=>c.set===currentSet);
  if(currentFilter!=='all') list=list.filter(c=>c.rarity===currentFilter);
  const q = ((document.getElementById('col-search')||{}).value || '').trim().toLowerCase();
  if(q){
    list = list.filter(c =>
      (c.name||'').toLowerCase().includes(q) ||
      String(c.cardNumber||'').toLowerCase().includes(q)
    );
  }
  // Owned only unless "show missing"
  if(!showMissing) list = list.filter(c => (colGet(state.collection, c)) > 0);
  const countEl = document.getElementById('col-list-count');
  if(countEl) countEl.textContent = list.length ? (list.length + ' shown') : '';
  const titleEl = document.getElementById('col-list-title');
  if(titleEl){
    const setLabel = currentSet === 'all' ? 'YOUR CARDS'
      : (currentSet === 'Wizards Black Star Promos' ? 'BLACK STAR PROMOS' : String(currentSet).toUpperCase());
    titleEl.textContent = setLabel;
  }
  if(!list.length){
    grid.innerHTML='<div class="empty-state">'+(showMissing?'Nothing matches these filters.':'No cards yet — open a pack!')+'</div>';
    return;
  }
  list.forEach(card=>{
    const count=colGet(state.collection, card);
    const el=document.createElement('div');
    el.className='tcg-card'+(count===0?' missing':'')+(card.art?' full-art':'');
    el.dataset.rarity = card.rarity||'';
    el.style.position = 'relative';
    const rarityChip = count>0 && card.rarity
      ? `<div class="rarity-chip ${card.rarity}">${card.rarityLabel||card.rarity}</div>`
      : '';
    const grades = count>0 ? getGrades(card.id) : [];
    const best = grades.length ? Math.max(...grades.map(Number)) : null;
    const gradeBadge = best != null
      ? `<div class="grade-badge">${gradeLabel(best)}</div>`
      : '';
    if(count===0){
      el.innerHTML=tcgHTML(card,false)+'<div class="owned-count" style="opacity:.7">Missing</div>';
      el.title='Missing · '+(card.cardNumber||'')+' '+card.name;
      el.onclick=()=>openZoom(card);
    } else {
      el.innerHTML=tcgHTML(card,false)+`<div class="owned-count">×${count}</div>`+rarityChip+gradeBadge;
      el.title=(card.cardNumber||'')+' '+card.name+(best!=null?' · '+gradeLabel(best):'');
      el.onclick=()=>openZoom(card);
    }
    grid.appendChild(el);
  });
}

function renderSellList(){
  // Sell UI removed from Shop — selling is done from the card detail modal only
  const list=document.getElementById('sell-list');
  const empty=document.getElementById('sell-empty');
  if(!list) return;
  list.innerHTML='';
  const dups=CARDS.filter(c=>colGet(state.collection, c)>1);
  if(empty){
    if(!dups.length){ empty.style.display='block'; return; }
    empty.style.display='none';
  }
  dups.forEach(card=>{
    const extras=colGet(state.collection, card)-1;
    const value=card.price||1;
    const row=document.createElement('div');
    row.className='sell-row';
    row.innerHTML=`<div class="mini-art">${card.emoji}</div>
      <div class="sell-info"><div class="name">${card.name}</div>
      <div class="rarity">${card.rarityLabel||card.rarity} · $${value.toFixed(2)} · ${card.cardNumber||''}</div></div>
      <div class="sell-actions"><span style="color:var(--muted);font-size:.82rem">×${extras}</span>
      <button class="sell-btn" onclick="sellOne(${card.id})">Sell 1</button>
      <button class="sell-btn" onclick="sellAll(${card.id})">Sell All</button></div>`;
    list.appendChild(row);
  });
}
function sellOne(id){
  const card = resolveCard(id);
  if(!card) return;
  if(typeof isPriceUnlocked === 'function' && !isPriceUnlocked(id)){
    showToast('Research the price first (Catalog or Research) before selling to the shop');
    return;
  }
  const cand = pickSellCandidate(id);
  if(!cand){ showToast('Keep at least 1 copy'); return; }
  let payout = shopPayoutFor(card, cand.grade);
  if(state.luckBuffs && state.luckBuffs.sellBonus){
    payout = +(payout * 1.25).toFixed(2);
    state.luckBuffs.sellBonus = false;
  }
  if(!removeOwnedCopy(id, cand.grade)) return;
  state.money = +(state.money + payout).toFixed(2);
  if(!state.stats) state.stats = {};
  state.stats.sells = (state.stats.sells||0) + 1;
  if(typeof trackDaily==='function'){ trackDaily('sells',1); trackDaily('saleMoney', payout); }
  save(); updateUI(); renderCollection(); renderBinder(); renderQuests();
  if(typeof checkNewlyCompletedQuests === 'function') checkNewlyCompletedQuests();
  if(typeof checkNewlyCompletedAchievements === 'function') checkNewlyCompletedAchievements();
  showToast('Shop bought '+card.name+' for $'+payout.toFixed(2));
}
function sellAll(id){
  const card = resolveCard(id);
  if(!card) return;
  if(typeof isPriceUnlocked === 'function' && !isPriceUnlocked(id)){
    showToast('Research the price first (Catalog or Research) before selling to the shop');
    return;
  }
  let total = 0, n = 0;
  while(pickSellCandidate(id) && n < 99){
    const cand = pickSellCandidate(id);
    const payout = shopPayoutFor(card, cand.grade);
    if(!removeOwnedCopy(id, cand.grade)) break;
    total += payout;
    n++;
  }
  if(n < 1){ showToast('Keep at least 1 copy'); return; }
  if(state.luckBuffs && state.luckBuffs.sellBonus){
    total = +(total * 1.25).toFixed(2);
    state.luckBuffs.sellBonus = false;
  }
  state.money = +(state.money + total).toFixed(2);
  if(!state.stats) state.stats = {};
  state.stats.sells = (state.stats.sells||0) + n;
  if(typeof trackDaily==='function'){ trackDaily('sells', n); trackDaily('saleMoney', total); }
  save(); updateUI(); renderCollection(); renderBinder(); renderQuests();
  if(typeof checkNewlyCompletedQuests === 'function') checkNewlyCompletedQuests();
  if(typeof checkNewlyCompletedAchievements === 'function') checkNewlyCompletedAchievements();
  showToast('Shop bought ×'+n+' '+card.name+' for $'+total.toFixed(2));
}

function populateDevSelect(){
  const sel=document.getElementById('dev-card-select');
  if(!sel) return;
  sel.innerHTML='';
  [...CARDS].sort((a,b)=>a.id-b.id).forEach(c=>{
    const opt=document.createElement('option');
    opt.value=c.id;
    opt.textContent=`${c.cardNumber||''} ${c.name} — ${c.rarityLabel||c.rarity||''} · ${c.set||''}`;
    sel.appendChild(opt);
  });
}
function devPullCard(){
  if(!currentUser || !currentUser.is_admin){ showToast('Admin only'); return; }
  const sel=document.getElementById('dev-card-select');
  if(!sel) return;
  const id=parseInt(sel.value,10);
  const card=resolveCard(id);
  if(!card||opening.active){ showToast(opening.active?'Finish current pack first':'Card not found'); return; }
  const wasNew=colGet(state.collection, card)===0;
  colSet(state.collection, card, colGet(state.collection, card) + 1);
  if(card.rarity==='legendary') state.stats.holosPulled=(state.stats.holosPulled||0)+1;
  save(); updateUI();
  opening={active:true,cards:[{...card,isNew:wasNew}],index:0,flipped:false,revealed:new Set()};
  document.getElementById('pack-idle').style.display='none';
  document.getElementById('rip-stage').style.display='none';
  document.getElementById('reveal-stage').classList.add('active');
  switchTab('open');
  const summary=document.getElementById('opened-summary');
  if(summary){ summary.innerHTML=''; const m=document.createElement('div'); m.className='mini-card'; m.id='mini-0'; summary.appendChild(m); }
  showCard(0, false);
  showToast('DEV pulled: '+card.name);
}

const TAB_TITLES = {
  profile: 'Profile',
  home:'Home', open:'Open Packs', collection:'Collection', binder:'Binders',
  market:'Market', trade:'Trade', leaderboard:'Leaderboard', teams:'Teams', mail:'Mail',
  shop:'Shop', players:'Players', admin:'Admin'
, achievements: 'Achievements'};

function navToggle(which){
  const sub = document.getElementById('nav-sub-'+which);
  if(!sub){ navGo(which); return; }
  const opening = !sub.classList.contains('open');
  document.querySelectorAll('.app-nav-sub').forEach(s => s.classList.remove('open'));
  if(opening) sub.classList.add('open');
  // Also highlight parent
  document.querySelectorAll('.app-nav-btn').forEach(b => b.classList.remove('active'));
  const parent = document.querySelector('.app-nav-btn[data-tab="'+which+'"]');
  if(parent) parent.classList.add('active');
}



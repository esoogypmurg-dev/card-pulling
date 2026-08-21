/* ===== AUCTION HOUSE ===== */
let auctionCache = [];
let auctionNames = {};
let auctionChannel = null;
let auctionTickTimer = null;
let myBidAuctionIds = new Set();

function aucBidIncrement(current){
  const c = Number(current) || 0;
  if(c < 10) return 0.25;
  if(c < 50) return 0.50;
  return Math.max(1, +(c * 0.05).toFixed(2));
}
function aucMinNextBid(row){
  const cur = Number(row.current_bid) || 0;
  const start = Number(row.start_bid) || 0;
  if(cur <= 0) return +start.toFixed(2);
  return +(cur + aucBidIncrement(cur)).toFixed(2);
}
function aucFormatTimeLeft(endsAt){
  const ms = new Date(endsAt).getTime() - Date.now();
  if(!(ms > 0)) return 'Ended';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if(h > 0) return h + 'h ' + m + 'm';
  if(m > 0) return m + 'm ' + sec + 's';
  return sec + 's';
}
function aucDurationChoices(){
  return [
    { label: '30 minutes', ms: 30 * 60 * 1000 },
    { label: '2 hours', ms: 2 * 60 * 60 * 1000 },
    { label: '12 hours', ms: 12 * 60 * 60 * 1000 },
    { label: '24 hours', ms: 24 * 60 * 60 * 1000 }
  ];
}

function listAuctionFromZoom(){
  if(zoomCardId == null || !currentUser || !sb){ showToast('Login required for auctions'); return; }
  const id = zoomCardId;
  const card = resolveCard(id);
  if(!card) return;
  if(colGet(state.collection, id) < 1){ showToast('You do not own this card'); return; }
  const copy = currentZoomCopy();
  const grade = copy.grade != null ? Number(copy.grade) : null;
  const base = cardMarketValue(card, grade);
  const tag = grade != null ? gradeLabel(grade) : 'Raw';

  const startStr = prompt('Auction starting bid for '+card.name+' ('+tag+')?\n(market ~$'+base.toFixed(2)+')', String(+base.toFixed(2)));
  if(startStr === null) return;
  const startBid = parseFloat(startStr);
  if(!(startBid > 0)){ showToast('Invalid starting bid'); return; }

  const buyStr = prompt('Buyout price? (optional — leave blank for no buyout)', String(+(startBid * 1.5).toFixed(2)));
  if(buyStr === null) return;
  let buyout = null;
  if(String(buyStr).trim() !== ''){
    buyout = parseFloat(buyStr);
    if(!(buyout > startBid)){ showToast('Buyout must be higher than starting bid'); return; }
  }

  const durs = aucDurationChoices();
  const durStr = prompt('Duration?\n1) 30 minutes\n2) 2 hours\n3) 12 hours\n4) 24 hours', '2');
  if(durStr === null) return;
  const di = Math.max(1, Math.min(4, parseInt(durStr, 10) || 2)) - 1;
  const endsAt = new Date(Date.now() + durs[di].ms).toISOString();

  if(!removeOwnedCopy(id, grade)){ showToast('Could not list'); return; }

  (async () => {
    try{
      const row = {
        seller_id: currentUser.id,
        card_id: id,
        grade: grade,
        start_bid: startBid,
        current_bid: 0,
        current_bidder_id: null,
        buyout: buyout,
        ends_at: endsAt,
        status: 'open',
        bid_count: 0
      };
      const { error } = await sb.from('auctions').insert(row);
      if(error) throw error;
      save(); updateUI(); renderCollection(); renderBinder();
      showToast('Auction listed: '+card.name+' · starts $'+startBid.toFixed(2));
      if(typeof loadAuctions === 'function') loadAuctions();
      if((colGet(state.collection, id)) > 0) openZoom(card, 0);
      else closeZoom();
    }catch(e){
      console.error(e);
      colSet(state.collection, id, colGet(state.collection, id) + 1);
      if(grade != null){
        const g = getGrades(id); g.push(grade); setGrades(id, g);
      }
      save(); updateUI();
      showToast((e.message && (e.message.includes('relation') || e.message.includes('schema')))
        ? 'Run auctions SQL in Supabase first'
        : (e.message || 'Could not list auction'));
    }
  })();
}

function renderAuctionList(rows, elId, mode){
  const el = document.getElementById(elId);
  if(!el) return;
  if(!rows || !rows.length){
    el.innerHTML = mode === 'bids'
      ? '<span style="color:var(--muted)">No active bids — bid on an auction from the Auctions tab</span>'
      : '<span style="color:var(--muted)">No open auctions — list one from collection (zoom → List auction)</span>';
    return;
  }
  el.innerHTML = rows.map(row => {
    const card = resolveCard(row.card_id);
    const nm = card ? card.name : ('#'+row.card_id);
    const setLabel = card && card.set ? (card.set === 'Wizards Black Star Promos' ? 'Promos' : card.set) : '';
    const g = row.grade != null ? gradeLabel(row.grade) : 'Raw';
    const seller = auctionNames[row.seller_id] || 'Trainer';
    const isMine = currentUser && row.seller_id === currentUser.id;
    const isHigh = currentUser && row.current_bidder_id === currentUser.id;
    const cur = Number(row.current_bid) || 0;
    const start = Number(row.start_bid) || 0;
    const displayBid = cur > 0 ? cur : start;
    const buyout = row.buyout != null ? Number(row.buyout) : null;
    const minNext = aucMinNextBid(row);
    const timeLeft = aucFormatTimeLeft(row.ends_at);
    const ended = timeLeft === 'Ended';
    const thumb = card && card.art
      ? `<img src="${card.art}" alt="">`
      : '<div style="width:44px;height:62px;background:#1a1f2e;border-radius:6px"></div>';
    let badge = '';
    if(isMine) badge = '<span class="auc-badge mine">Your listing</span>';
    else if(isHigh) badge = '<span class="auc-badge winning">Winning</span>';
    else if(mode === 'bids' && myBidAuctionIds.has(String(row.id))) badge = '<span class="auc-badge outbid">Outbid</span>';

    let actions = '';
    if(isMine){
      if((Number(row.bid_count)||0) === 0 && !ended){
        actions = `<button class="btn btn-secondary" style="padding:.35rem .6rem;font-size:.78rem" onclick="cancelAuction('${row.id}')">Cancel</button>`;
      } else {
        actions = `<span style="font-size:.75rem;color:var(--muted)">${(Number(row.bid_count)||0)?'Bids locked':'—'}</span>`;
      }
    } else if(!ended){
      actions = `<div class="auc-actions">
        <input type="number" id="auc-bid-${row.id}" min="${minNext}" step="0.01" value="${minNext.toFixed(2)}" placeholder="Bid">
        <button class="btn" style="padding:.35rem .6rem;font-size:.78rem" onclick="placeAuctionBid('${row.id}')">Bid</button>
        ${buyout != null ? `<button class="btn btn-secondary" style="padding:.35rem .6rem;font-size:.78rem" onclick="buyoutAuction('${row.id}')">Buyout $${buyout.toFixed(2)}</button>` : ''}
      </div>`;
    } else {
      actions = `<span style="font-size:.75rem;color:var(--muted)">Ended</span>`;
    }

    return `<div class="mkt-listing-row auc-row" data-auc-id="${row.id}">
      ${thumb}
      <div class="mkt-listing-meta" style="flex:1">
        <div class="nm">${String(nm).replace(/</g,'&lt;')} · ${g} ${badge}</div>
        <div class="sub">${seller}${setLabel ? ' · '+setLabel : ''}${isMine?' · <span style="color:var(--gold)">Yours</span>':''}</div>
        <div class="auc-meta-line">Current: <strong>$${displayBid.toFixed(2)}</strong>${cur<=0?' (start)':''}
          ${buyout!=null?' · Buyout <strong>$'+buyout.toFixed(2)+'</strong>':''}</div>
        <div class="auc-meta-line">Time left: <span class="auc-time" data-ends="${row.ends_at}">${timeLeft}</span>
          · Bids: ${Number(row.bid_count)||0}</div>
      </div>
      ${actions}
    </div>`;
  }).join('');
}

function startAuctionTicker(){
  if(auctionTickTimer) return;
  auctionTickTimer = setInterval(function(){
    document.querySelectorAll('.auc-time[data-ends]').forEach(el => {
      el.textContent = aucFormatTimeLeft(el.getAttribute('data-ends'));
    });
    // Periodically resolve ended auctions
    if(typeof resolveEndedAuctions === 'function') resolveEndedAuctions();
  }, 1000);
}

async function loadAuctions(){
  const el = document.getElementById('auction-house-list');
  if(!el) return;
  if(!sb){ el.innerHTML = '<span style="color:var(--muted)">Cloud not connected</span>'; return; }
  el.textContent = 'Loading…';
  try{
    await resolveEndedAuctions();
    const { data, error } = await sb.from('auctions')
      .select('*')
      .eq('status', 'open')
      .order('ends_at', { ascending: true })
      .limit(100);
    if(error) throw error;
    auctionCache = data || [];
    auctionNames = {};
    const ids = [...new Set(auctionCache.map(r => r.seller_id).concat(auctionCache.map(r => r.current_bidder_id).filter(Boolean)))];
    if(ids.length){
      const { data: profs } = await sb.from('profiles').select('id, username, display_name').in('id', ids);
      (profs||[]).forEach(p => { auctionNames[p.id] = p.display_name || p.username; });
    }
    if(currentUser){
      try{
        const { data: myBids } = await sb.from('auction_bids').select('auction_id').eq('bidder_id', currentUser.id);
        myBidAuctionIds = new Set((myBids||[]).map(b => String(b.auction_id)));
      }catch(_){ myBidAuctionIds = new Set(); }
    }
    renderAuctionList(auctionCache, 'auction-house-list', 'browse');
    startAuctionTicker();
    startAuctionWatcher();
  }catch(e){
    console.error(e);
    el.innerHTML = '<span style="color:#f87171">Could not load auctions (check auctions table in Supabase)</span>';
  }
}

async function loadMyAuctionBids(){
  const el = document.getElementById('auction-bids-list');
  if(!el) return;
  if(!sb || !currentUser){ el.innerHTML = '<span style="color:var(--muted)">Login required</span>'; return; }
  el.textContent = 'Loading…';
  try{
    await resolveEndedAuctions();
    const { data: myBids, error: bErr } = await sb.from('auction_bids')
      .select('auction_id')
      .eq('bidder_id', currentUser.id);
    if(bErr) throw bErr;
    const ids = [...new Set((myBids||[]).map(b => b.auction_id))];
    myBidAuctionIds = new Set(ids.map(String));
    if(!ids.length){
      renderAuctionList([], 'auction-bids-list', 'bids');
      return;
    }
    const { data, error } = await sb.from('auctions')
      .select('*')
      .in('id', ids)
      .eq('status', 'open')
      .order('ends_at', { ascending: true });
    if(error) throw error;
    const rows = data || [];
    auctionNames = auctionNames || {};
    const sellerIds = [...new Set(rows.map(r => r.seller_id))];
    if(sellerIds.length){
      const { data: profs } = await sb.from('profiles').select('id, username, display_name').in('id', sellerIds);
      (profs||[]).forEach(p => { auctionNames[p.id] = p.display_name || p.username; });
    }
    renderAuctionList(rows, 'auction-bids-list', 'bids');
    startAuctionTicker();
    startAuctionWatcher();
  }catch(e){
    console.error(e);
    el.innerHTML = '<span style="color:#f87171">Could not load bids (check auction_bids table)</span>';
  }
}

async function placeAuctionBid(auctionId){
  if(!sb || !currentUser) return;
  try{
    const { data: row, error } = await sb.from('auctions').select('*').eq('id', auctionId).single();
    if(error) throw error;
    if(row.status !== 'open'){ showToast('Auction closed'); loadAuctions(); return; }
    if(row.seller_id === currentUser.id){ showToast('Cannot bid on your own auction'); return; }
    if(new Date(row.ends_at).getTime() <= Date.now()){
      await resolveEndedAuctions();
      showToast('Auction ended');
      loadAuctions();
      return;
    }
    const input = document.getElementById('auc-bid-' + auctionId);
    let amount = input ? parseFloat(input.value) : aucMinNextBid(row);
    const minNext = aucMinNextBid(row);
    if(!(amount >= minNext)){ showToast('Minimum bid is $'+minNext.toFixed(2)); return; }
    if(state.money < amount){ showToast('Not enough money'); return; }

    // Soft reserve: money stays with bidder until win — for family simplicity we only check balance at bid time
    // and charge winner at end / buyout. (No escrow freeze in v1.)

    const { error: bidErr } = await sb.from('auction_bids').insert({
      auction_id: auctionId,
      bidder_id: currentUser.id,
      amount: amount
    });
    if(bidErr) throw bidErr;

    // Soft close: last 2 min + bid => +2 min
    let endsAt = row.ends_at;
    const left = new Date(row.ends_at).getTime() - Date.now();
    if(left > 0 && left < 2 * 60 * 1000){
      endsAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    }

    const { error: upErr } = await sb.from('auctions').update({
      current_bid: amount,
      current_bidder_id: currentUser.id,
      bid_count: (Number(row.bid_count)||0) + 1,
      ends_at: endsAt
    }).eq('id', auctionId).eq('status', 'open');
    if(upErr) throw upErr;

    myBidAuctionIds.add(String(auctionId));
    showToast('Bid placed: $'+amount.toFixed(2));
    if(typeof broadcastAuctionUpdate === 'function') broadcastAuctionUpdate(auctionId);
    loadAuctions();
    loadMyAuctionBids();
  }catch(e){
    console.error(e);
    showToast(e.message || 'Bid failed');
  }
}

async function buyoutAuction(auctionId){
  if(!sb || !currentUser) return;
  try{
    const { data: row, error } = await sb.from('auctions').select('*').eq('id', auctionId).single();
    if(error) throw error;
    if(row.status !== 'open'){ showToast('Auction closed'); return; }
    if(row.seller_id === currentUser.id){ showToast('That is your auction'); return; }
    const buyout = Number(row.buyout);
    if(!(buyout > 0)){ showToast('No buyout on this auction'); return; }
    if(state.money < buyout){ showToast('Not enough money'); return; }

    // Charge buyer
    state.money = +(state.money - buyout).toFixed(2);
    const cid = Number(row.card_id);
    colSet(state.collection, cid, colGet(state.collection, cid) + 1);
    if(row.grade != null){
      const g = getGrades(cid); g.push(Number(row.grade)); setGrades(cid, g);
    }

    // Credit seller
    const { data: seller } = await sb.from('profiles').select('money').eq('id', row.seller_id).single();
    if(seller){
      await sb.from('profiles').update({ money: Number(seller.money||0) + buyout }).eq('id', row.seller_id);
    }

    await sb.from('auctions').update({
      status: 'sold',
      winner_id: currentUser.id,
      sold_price: buyout,
      sold_at: new Date().toISOString(),
      current_bid: buyout,
      current_bidder_id: currentUser.id
    }).eq('id', auctionId);

    // Record bid history
    try{
      await sb.from('auction_bids').insert({
        auction_id: auctionId,
        bidder_id: currentUser.id,
        amount: buyout
      });
    }catch(_){}

    save(); updateUI(); renderCollection(); renderBinder();
    const card = resolveCard(cid);
    showToast('Buyout! '+(card?card.name:'Card')+' for $'+buyout.toFixed(2));

    // Notify seller (reuse market sold popup shape)
    if(typeof notifyMarketSellerOfSale === 'function'){
      notifyMarketSellerOfSale({
        listingId: 'auc-'+auctionId,
        sellerId: row.seller_id,
        buyerId: currentUser.id,
        buyerName: currentUser.display_name || currentUser.username || 'A trainer',
        cardId: cid,
        cardName: card ? card.name : 'Card',
        grade: row.grade,
        price: buyout,
        art: card && card.art ? card.art : null,
        soldAt: new Date().toISOString()
      });
    }
    if(typeof broadcastAuctionUpdate === 'function') broadcastAuctionUpdate(auctionId);
    loadAuctions();
    loadMyAuctionBids();
  }catch(e){
    console.error(e);
    showToast(e.message || 'Buyout failed');
  }
}

async function cancelAuction(auctionId){
  if(!sb || !currentUser) return;
  try{
    const { data: row, error } = await sb.from('auctions').select('*').eq('id', auctionId).single();
    if(error) throw error;
    if(row.seller_id !== currentUser.id){ showToast('Not your auction'); return; }
    if(row.status !== 'open'){ showToast('Already closed'); return; }
    if((Number(row.bid_count)||0) > 0){ showToast('Cannot cancel after bids'); return; }

    await sb.from('auctions').update({ status: 'cancelled' }).eq('id', auctionId);

    // Return card to seller
    const cid = Number(row.card_id);
    colSet(state.collection, cid, colGet(state.collection, cid) + 1);
    if(row.grade != null){
      const g = getGrades(cid); g.push(Number(row.grade)); setGrades(cid, g);
    }
    save(); updateUI(); renderCollection(); renderBinder();
    showToast('Auction cancelled — card returned');
    loadAuctions();
  }catch(e){
    console.error(e);
    showToast('Cancel failed');
  }
}

let aucResolveLock = false;
async function resolveEndedAuctions(){
  if(!sb || !currentUser || aucResolveLock) return;
  aucResolveLock = true;
  try{
    const now = new Date().toISOString();
    const { data: ended, error } = await sb.from('auctions')
      .select('*')
      .eq('status', 'open')
      .lte('ends_at', now)
      .limit(20);
    if(error || !ended || !ended.length){ aucResolveLock = false; return; }

    for(const row of ended){
      try{
        if(row.current_bidder_id && Number(row.current_bid) > 0){
          // Winner pays, gets card; seller gets money
          const price = Number(row.current_bid);
          const cid = Number(row.card_id);

          // Charge winner if still has money in profile
          const { data: winner } = await sb.from('profiles').select('money,collection,stats').eq('id', row.current_bidder_id).single();
          if(!winner){
            // No winner profile — return to seller
            await sb.from('auctions').update({ status: 'expired' }).eq('id', row.id);
            if(row.seller_id === currentUser.id){
              colSet(state.collection, cid, colGet(state.collection, cid) + 1);
              if(row.grade != null){ const g = getGrades(cid); g.push(Number(row.grade)); setGrades(cid, g); }
              save(); updateUI();
            }
            continue;
          }
          const wMoney = Number(winner.money)||0;
          if(wMoney < price){
            // Insufficient funds at settle — expire and return card to seller
            await sb.from('auctions').update({ status: 'expired' }).eq('id', row.id);
            if(row.seller_id === currentUser.id){
              colSet(state.collection, cid, colGet(state.collection, cid) + 1);
              if(row.grade != null){ const g = getGrades(cid); g.push(Number(row.grade)); setGrades(cid, g); }
              save(); updateUI();
              showToast('Auction expired — bidder could not pay, card returned');
            }
            continue;
          }

          // Update winner profile
          const wCol = Object.assign({}, winner.collection || {});
          const key = String(cid);
          wCol[key] = (Number(wCol[key])||0) + 1;
          // grades in stats
          const wStats = winner.stats || {};
          if(row.grade != null){
            if(!wStats.grades) wStats.grades = {};
            const gk = key;
            if(!Array.isArray(wStats.grades[gk])) wStats.grades[gk] = [];
            wStats.grades[gk].push(Number(row.grade));
          }
          await sb.from('profiles').update({
            money: +(wMoney - price).toFixed(2),
            collection: wCol,
            stats: wStats
          }).eq('id', row.current_bidder_id);

          // Credit seller
          const { data: seller } = await sb.from('profiles').select('money').eq('id', row.seller_id).single();
          if(seller){
            await sb.from('profiles').update({ money: Number(seller.money||0) + price }).eq('id', row.seller_id);
          }

          await sb.from('auctions').update({
            status: 'sold',
            winner_id: row.current_bidder_id,
            sold_price: price,
            sold_at: new Date().toISOString()
          }).eq('id', row.id);

          // Local update if we are winner or seller
          if(row.current_bidder_id === currentUser.id){
            state.money = +(state.money - price).toFixed(2);
            colSet(state.collection, cid, colGet(state.collection, cid) + 1);
            if(row.grade != null){ const g = getGrades(cid); g.push(Number(row.grade)); setGrades(cid, g); }
            save(); updateUI(); renderCollection(); renderBinder();
            const card = resolveCard(cid);
            showToast('You won the auction: '+(card?card.name:'Card')+' for $'+price.toFixed(2));
          }
          if(row.seller_id === currentUser.id){
            if(typeof refreshMyMoneyFromCloud === 'function') refreshMyMoneyFromCloud();
            const card = resolveCard(cid);
            if(typeof enqueueMarketSoldPopup === 'function'){
              let buyerName = 'A trainer';
              try{
                const { data: b } = await sb.from('profiles').select('display_name,username').eq('id', row.current_bidder_id).maybeSingle();
                if(b) buyerName = b.display_name || b.username || buyerName;
              }catch(_){}
              enqueueMarketSoldPopup({
                listingId: 'auc-'+row.id,
                sellerId: row.seller_id,
                buyerId: row.current_bidder_id,
                buyerName: buyerName,
                cardId: cid,
                cardName: card ? card.name : 'Card',
                grade: row.grade,
                price: price,
                art: card && card.art ? card.art : null
              });
            }
          }
        } else {
          // No bids — return to seller
          await sb.from('auctions').update({ status: 'expired' }).eq('id', row.id);
          if(row.seller_id === currentUser.id){
            const cid = Number(row.card_id);
            colSet(state.collection, cid, colGet(state.collection, cid) + 1);
            if(row.grade != null){ const g = getGrades(cid); g.push(Number(row.grade)); setGrades(cid, g); }
            save(); updateUI(); renderCollection(); renderBinder();
            showToast('Auction expired — card returned');
          }
        }
      }catch(e){ console.warn('[auc resolve]', e); }
    }
  }catch(e){ console.warn('[auc resolve batch]', e); }
  aucResolveLock = false;
}

function startAuctionWatcher(){
  if(!sb || auctionChannel) return;
  try{
    auctionChannel = sb.channel('auctions-live-v1')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, () => {
        const aucSec = document.getElementById('market-sec-auctions');
        const bidSec = document.getElementById('market-sec-bids');
        if(aucSec && aucSec.style.display !== 'none') loadAuctions();
        if(bidSec && bidSec.style.display !== 'none') loadMyAuctionBids();
      })
      .on('broadcast', { event: 'auc-update' }, () => {
        const aucSec = document.getElementById('market-sec-auctions');
        const bidSec = document.getElementById('market-sec-bids');
        if(aucSec && aucSec.style.display !== 'none') loadAuctions();
        if(bidSec && bidSec.style.display !== 'none') loadMyAuctionBids();
      })
      .subscribe();
  }catch(e){ console.warn('[auc watch]', e); }
}
async function broadcastAuctionUpdate(auctionId){
  try{
    if(!auctionChannel) startAuctionWatcher();
    if(auctionChannel){
      await auctionChannel.send({ type: 'broadcast', event: 'auc-update', payload: { id: auctionId, at: Date.now() } });
    }
  }catch(e){}
}

/* ===== Market sale popup (seller notification) ===== */
const MARKET_SOLD_CH = 'market-sold-v1';
const MARKET_SOLD_SEEN_KEY = 'marketSoldSeenIds';
let marketSoldChannel = null;
let marketSoldQueue = [];
let marketSoldShowing = false;

function marketSoldSeenGet(){
  try{
    const raw = localStorage.getItem(MARKET_SOLD_SEEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  }catch(e){ return []; }
}
function marketSoldSeenAdd(id){
  try{
    const arr = marketSoldSeenGet();
    const s = String(id);
    if(arr.includes(s)) return;
    arr.push(s);
    while(arr.length > 40) arr.shift();
    localStorage.setItem(MARKET_SOLD_SEEN_KEY, JSON.stringify(arr));
  }catch(e){}
}
function marketSoldAlreadySeen(id){
  return marketSoldSeenGet().includes(String(id));
}

function showMarketSoldModal(payload){
  if(!payload) return;
  const modal = document.getElementById('market-sold-modal');
  if(!modal) return;
  const cardLine = document.getElementById('ms-card-line');
  const buyerLine = document.getElementById('ms-buyer-line');
  const priceEl = document.getElementById('ms-price');
  const art = document.getElementById('ms-art');
  const gradeTag = (payload.grade != null && payload.grade !== '')
    ? (' · ' + (typeof gradeLabel === 'function' ? gradeLabel(Number(payload.grade)) : ('PSA '+payload.grade)))
    : '';
  if(cardLine) cardLine.textContent = (payload.cardName || 'Card') + gradeTag;
  if(buyerLine) buyerLine.textContent = 'Bought by ' + (payload.buyerName || 'a trainer');
  if(priceEl) priceEl.textContent = '$' + (Number(payload.price) || 0).toFixed(2);
  if(art){
    if(payload.art){
      art.src = payload.art;
      art.classList.remove('hidden');
    } else {
      art.removeAttribute('src');
      art.classList.add('hidden');
    }
  }
  modal.classList.add('open');
  marketSoldShowing = true;
  if(payload.listingId) marketSoldSeenAdd(payload.listingId);
}

function dismissMarketSoldModal(){
  const modal = document.getElementById('market-sold-modal');
  if(modal) modal.classList.remove('open');
  marketSoldShowing = false;
  // Credit local money if we were told a sale amount (seller side refresh)
  if(typeof updateUI === 'function') updateUI();
  // If more piled up while this one was showing, summarize the rest in one popup
  // instead of walking through them one card at a time.
  if(marketSoldQueue.length > 1){
    const rest = marketSoldQueue.splice(0, marketSoldQueue.length);
    setTimeout(function(){ showMarketSoldBatchModal(rest); }, 280);
  } else if(marketSoldQueue.length === 1){
    const next = marketSoldQueue.shift();
    setTimeout(function(){ enqueueMarketSoldPopup(next); }, 280);
  }
}

/** Combined "N of your cards sold" popup — used when several sales piled up at once
 *  (offline catch-up, or multiple sales landing while one popup was already showing). */
function showMarketSoldBatchModal(rows){
  if(!rows || !rows.length) return;
  if(rows.length === 1){ showMarketSoldModal(rows[0]); return; }
  const modal = document.getElementById('market-sold-batch-modal');
  if(!modal) return;
  const title = document.getElementById('msb-title');
  const list = document.getElementById('msb-list');
  const totalEl = document.getElementById('msb-total');
  let total = 0;
  if(title) title.textContent = rows.length + ' of your cards sold!';
  if(list){
    list.innerHTML = rows.map(r => {
      const price = Number(r.price) || 0;
      total += price;
      const gradeTag = (r.grade != null && r.grade !== '')
        ? (' · ' + (typeof gradeLabel === 'function' ? gradeLabel(Number(r.grade)) : ('PSA '+r.grade)))
        : '';
      return '<div style="display:flex;justify-content:space-between;gap:.6rem;font-size:.85rem;padding:.3rem 0;border-bottom:1px solid rgba(255,255,255,.08)">'+
        '<span>' + String(r.cardName||'Card').replace(/</g,'&lt;') + gradeTag + '</span>'+
        '<span style="font-weight:800;color:var(--gold);white-space:nowrap">$' + price.toFixed(2) + '</span></div>';
    }).join('');
  }
  if(totalEl) totalEl.textContent = '$' + total.toFixed(2) + ' total';
  modal.classList.add('open');
  rows.forEach(r => { if(r.listingId) marketSoldSeenAdd(r.listingId); });
  if(typeof refreshMyMoneyFromCloud === 'function') refreshMyMoneyFromCloud();
}

function dismissMarketSoldBatchModal(){
  const modal = document.getElementById('market-sold-batch-modal');
  if(modal) modal.classList.remove('open');
  if(typeof updateUI === 'function') updateUI();
}

function enqueueMarketSoldPopup(payload){
  if(!payload || !currentUser) return;
  // Only the seller should see this
  if(payload.sellerId && String(payload.sellerId) !== String(currentUser.id)) return;
  if(payload.listingId && marketSoldAlreadySeen(payload.listingId)) return;
  if(marketSoldShowing){
    marketSoldQueue.push(payload);
    return;
  }
  showMarketSoldModal(payload);
  // Refresh seller money from cloud so balance matches
  if(typeof refreshMyMoneyFromCloud === 'function'){
    refreshMyMoneyFromCloud();
  }
}

async function refreshMyMoneyFromCloud(){
  if(!sb || !currentUser) return;
  try{
    const { data } = await sb.from('profiles').select('money').eq('id', currentUser.id).maybeSingle();
    if(data && data.money != null){
      state.money = Number(data.money) || state.money;
      if(typeof save === 'function') save();
      if(typeof updateUI === 'function') updateUI();
    }
  }catch(e){}
}

async function notifyMarketSellerOfSale(payload){
  if(!payload || !payload.sellerId) return;
  // Broadcast so seller client (if online) pops immediately
  try{
    if(!marketSoldChannel && typeof startMarketSoldWatcher === 'function') startMarketSoldWatcher();
    if(marketSoldChannel){
      await marketSoldChannel.send({
        type: 'broadcast',
        event: 'sold',
        payload: payload
      });
    }
  }catch(e){ console.warn('[market-sold] broadcast', e); }
}

function startMarketSoldWatcher(){
  if(!sb || !currentUser) return;
  // Broadcast channel
  if(!marketSoldChannel){
    try{
      marketSoldChannel = sb.channel(MARKET_SOLD_CH, { config: { broadcast: { self: false } } });
      marketSoldChannel
        .on('broadcast', { event: 'sold' }, ({ payload }) => {
          enqueueMarketSoldPopup(payload);
        })
        .subscribe();
    }catch(e){ console.warn('[market-sold] channel', e); }
  }
  // Also watch DB updates (sold) for this user as seller
  try{
    sb.channel('market-listings-sold-' + currentUser.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'market_listings',
        filter: 'seller_id=eq.' + currentUser.id
      }, async (payload) => {
        const row = payload.new;
        if(!row || row.status !== 'sold') return;
        if(marketSoldAlreadySeen(row.id)) return;
        let buyerName = 'A trainer';
        let art = null;
        let cardName = 'Card';
        try{
          if(row.buyer_id){
            const { data: b } = await sb.from('profiles').select('display_name,username').eq('id', row.buyer_id).maybeSingle();
            if(b) buyerName = b.display_name || b.username || buyerName;
          }
        }catch(_){}
        try{
          const card = typeof resolveCard === 'function' ? resolveCard(row.card_id) : null;
          if(card){
            cardName = card.name || cardName;
            art = card.art || null;
          }
        }catch(_){}
        enqueueMarketSoldPopup({
          listingId: row.id,
          sellerId: row.seller_id,
          buyerId: row.buyer_id,
          buyerName: buyerName,
          cardId: row.card_id,
          cardName: cardName,
          grade: row.grade,
          price: Number(row.ask_price) || 0,
          art: art,
          soldAt: row.sold_at
        });
      })
      .subscribe();
  }catch(e){ console.warn('[market-sold] pg watch', e); }
}

/** On login: surface recent sales the seller might have missed while offline.
 *  A single missed sale gets the normal detailed popup; several at once get one
 *  combined summary instead of popping up once per card. */
async function checkMissedMarketSales(){
  if(!sb || !currentUser) return;
  try{
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb.from('market_listings')
      .select('*')
      .eq('seller_id', currentUser.id)
      .eq('status', 'sold')
      .gte('sold_at', since)
      .order('sold_at', { ascending: false })
      .limit(25);
    if(error || !data || !data.length) return;
    const unseen = data.filter(row => !marketSoldAlreadySeen(row.id));
    if(!unseen.length) return;

    const buyerCache = {};
    const payloads = [];
    for(const row of unseen){
      let buyerName = 'A trainer';
      try{
        if(row.buyer_id){
          if(!buyerCache[row.buyer_id]){
            const { data: b } = await sb.from('profiles').select('display_name,username').eq('id', row.buyer_id).maybeSingle();
            buyerCache[row.buyer_id] = b ? (b.display_name || b.username || buyerName) : buyerName;
          }
          buyerName = buyerCache[row.buyer_id];
        }
      }catch(_){}
      const card = typeof resolveCard === 'function' ? resolveCard(row.card_id) : null;
      payloads.push({
        listingId: row.id,
        sellerId: row.seller_id,
        buyerId: row.buyer_id,
        buyerName: buyerName,
        cardId: row.card_id,
        cardName: card ? card.name : 'Card',
        grade: row.grade,
        price: Number(row.ask_price) || 0,
        art: card && card.art ? card.art : null,
        soldAt: row.sold_at
      });
    }

    if(payloads.length === 1) enqueueMarketSoldPopup(payloads[0]);
    else showMarketSoldBatchModal(payloads);
  }catch(e){ console.warn('[market-sold] missed', e); }
}


async function buyMarketListing(listingId){
  if(!sb || !currentUser) return;
  try{
    const { data: row, error } = await sb.from('market_listings').select('*').eq('id', listingId).single();
    if(error) throw error;
    if(row.status !== 'open'){ showToast('No longer available'); loadPlayerMarket(); return; }
    if(row.seller_id === currentUser.id){ showToast('That is your listing'); return; }
    const price = Number(row.ask_price);
    if(state.money < price){ showToast('Not enough money'); return; }

    // Pay
    state.money = +(state.money - price).toFixed(2);
    const cid = Number(row.card_id);
    colSet(state.collection, cid, colGet(state.collection, cid) + 1);
    if(row.grade != null){
      const g = getGrades(cid); g.push(Number(row.grade)); setGrades(cid, g);
    }

    // Credit seller
    const { data: seller } = await sb.from('profiles').select('money,collection').eq('id', row.seller_id).single();
    if(seller){
      await sb.from('profiles').update({
        money: Number(seller.money||0) + price
      }).eq('id', row.seller_id);
    }

    const soldAt = new Date().toISOString();
    await sb.from('market_listings').update({
      status: 'sold',
      buyer_id: currentUser.id,
      sold_at: soldAt
    }).eq('id', listingId);

    save(); updateUI(); renderCollection(); renderBinder();
    const card = resolveCard(cid);
    const buyerName = currentUser.display_name || currentUser.username || 'A trainer';
    showToast('Bought '+(card?card.name:'card')+' for $'+price.toFixed(2));
    loadPlayerMarket();

    // Notify seller (live popup if online)
    if(typeof notifyMarketSellerOfSale === 'function'){
      try{
        notifyMarketSellerOfSale({
          listingId: listingId,
          sellerId: row.seller_id,
          buyerId: currentUser.id,
          buyerName: buyerName,
          cardId: cid,
          cardName: card ? card.name : 'Card',
          grade: row.grade,
          price: price,
          art: card && card.art ? card.art : null,
          soldAt: soldAt
        });
      }catch(e){ console.warn('[market-sold] notify', e); }
    }
  }catch(e){
    console.error(e);
    showToast('Purchase failed');
  }
}

let tmGiveId = null;
let tmWant = [];

function toggleWantFromZoom(){
  if(!zoomCardId) return;
  if(!state.wantList) state.wantList=[];
  const i = state.wantList.indexOf(zoomCardId);
  if(i>=0) state.wantList.splice(i,1);
  else state.wantList.push(zoomCardId);
  save();
  const wantBtn = document.getElementById('zm-want');
  if(wantBtn) wantBtn.textContent = state.wantList.includes(zoomCardId) ? '✓ On want list' : 'Add to want list';
  showToast(state.wantList.includes(zoomCardId) ? 'Added to want list' : 'Removed from want list');
  renderMarket();
}
function tradeFromZoom(){
  if(zoomCardId==null) return;
  const id = zoomCardId;
  const owned = colGet(state.collection, id);
  if(owned < 1){ showToast('You do not own this card'); return; }
  closeZoom();
  switchTab('trade');
  if(liveRoom){
    liveAddCard(id);
  } else {
    const card = resolveCard(id);
    const name = card ? card.name : 'Card';
    showToast(name + ' — create or join a Live Trade Room, then add it from the list');
    // Pre-select in live select once room is entered (store pending)
    window._pendingTradeCardId = id;
  }
}

function openTradeModal(cardId){
  const card = resolveCard(cardId);
  if(!card) return;
  tmGiveId = cardId;
  tmWant = [];
  const img = document.getElementById('tm-give-img');
  if(card.art){ img.src = card.art; img.style.display='block'; }
  else { img.style.display='none'; }
  document.getElementById('tm-give-name').textContent = `${card.cardNumber||''} ${card.name}`;
  document.getElementById('tm-give-meta').textContent = `${card.rarityLabel||card.rarity} · $${(card.price||0).toFixed(2)} · Owned ×${colGet(state.collection, cardId)}`;
  // Populate want select
  const sel = document.getElementById('tm-want-select');
  sel.innerHTML = '';
  [...CARDS].sort((a,b)=>a.id-b.id).forEach(c=>{
    if(c.id===cardId) return; // don't want the same card you're giving
    const o=document.createElement('option');
    o.value=c.id;
    o.textContent=`${c.cardNumber} ${c.name} — ${c.rarityLabel}`;
    sel.appendChild(o);
  });
  document.getElementById('tm-result').style.display='none';
  document.getElementById('tm-offer-code').value='';
  document.getElementById('tm-accept-input').value='';
  document.getElementById('tm-accept-preview').style.display='none';
  document.getElementById('tm-completion-box').style.display='none';
  document.getElementById('tm-complete-input').value='';
  tmPendingAccept = null;
  renderTmWant();
  document.getElementById('trade-modal').classList.add('open');
}

function closeTradeModal(){
  document.getElementById('trade-modal').classList.remove('open');
  tmGiveId = null;
  tmWant = [];
}

function renderTmWant(){
  const el = document.getElementById('tm-want-chips');
  if(!tmWant.length){
    el.innerHTML = '<span style="color:var(--muted);font-size:.8rem">None selected</span>';
    return;
  }
  el.innerHTML = tmWant.map((id,i)=>{
    const c=cardById(id);
    return `<span class="trade-chip">${c.emoji} ${c.name} <button onclick="tmWant.splice(${i},1);renderTmWant()">✕</button></span>`;
  }).join('');
}

function tmAddWant(){
  const sel=document.getElementById('tm-want-select');
  const id=parseInt(sel.value,10);
  if(!id) return;
  tmWant.push(id);
  renderTmWant();
}

function tmCreateOffer(){
  if(tmGiveId==null){ showToast('No card selected'); return; }
  if(!tmWant.length){ showToast('Add at least one card you want'); return; }
  const owned = colGet(state.collection, tmGiveId);
  if(owned < 1){ showToast('You no longer own this card'); return; }
  const offerId = 'O'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const payload = {
    t: 'offer',
    id: offerId,
    give: [tmGiveId],
    want: tmWant.slice()
  };
  if(!state.pendingOffers) state.pendingOffers={};
  state.pendingOffers[offerId] = { give: [tmGiveId], want: tmWant.slice() };
  save();
  const code = encodeTrade(payload);
  document.getElementById('tm-offer-code').value = code;
  document.getElementById('tm-result').style.display = 'block';
  showToast('Offer code ready — share it!');
}

let tmPendingAccept = null;

function tmPreviewAccept(){
  const raw = document.getElementById('tm-accept-input').value;
  const offer = decodeTrade(raw);
  const preview = document.getElementById('tm-accept-preview');
  const status = document.getElementById('tm-accept-status');
  const btn = document.getElementById('tm-accept-btn');
  document.getElementById('tm-completion-box').style.display='none';

  if(!offer || offer.t!=='offer' || !offer.give || !offer.want){
    showToast('Invalid offer code');
    preview.style.display='none';
    return;
  }
  tmPendingAccept = offer;

  // Check ownership of what acceptor must give (offer.want)
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
  const giveNames = offer.want.map(id=>{ const c=cardById(id); return c?c.name:id; }).join(', ');
  const recvNames = offer.give.map(id=>{ const c=cardById(id); return c?c.name:id; }).join(', ');
  if(ok){
    status.style.color='#22c55e';
    status.innerHTML = `You give: <strong>${giveNames}</strong><br/>You receive: <strong>${recvNames}</strong><br/>You have the required cards.`;
    btn.style.display='inline-block';
    btn.disabled=false;
  } else {
    status.style.color='#f66';
    status.innerHTML = `You would give: ${giveNames}<br/>You would receive: ${recvNames}<br/>Missing: ${missing.join(', ')}`;
    btn.style.display='inline-block';
    btn.disabled=true;
  }
  preview.style.display='block';
}

function tmConfirmAccept(){
  if(!tmPendingAccept) return;
  const offer = tmPendingAccept;
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
  document.getElementById('tm-completion-code').value = encodeTrade(completion);
  document.getElementById('tm-completion-box').style.display = 'block';
  showToast('Trade applied on your side! Send completion code back.');
  tmPendingAccept = null;
  document.getElementById('tm-accept-btn').style.display='none';
}

function tmCompleteTrade(){
  const raw = document.getElementById('tm-complete-input').value;
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
  if(JSON.stringify(pending.give)!==JSON.stringify(data.give) ||
     JSON.stringify(pending.want)!==JSON.stringify(data.want)){
    showToast('Completion does not match your offer');
    return;
  }
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
  document.getElementById('tm-complete-input').value='';
  showToast('Trade complete! Cards updated.');
}

function showHoverPreview(card){
  const el = document.getElementById('hover-preview');
  const img = document.getElementById('hover-preview-img');
  const label = document.getElementById('hover-preview-label');
  if(!el || !card) return;
  if(card.art){
    img.src = card.art;
    img.style.display = 'block';
    label.textContent = `${card.cardNumber||''} ${card.name} · ${card.rarityLabel||card.rarity}`;
  } else {
    img.style.display = 'none';
    label.innerHTML = `<div style="font-size:4.5rem;margin-bottom:.4rem">${card.emoji||'🃏'}</div>${card.cardNumber||''} ${card.name} · ${card.rarityLabel||card.rarity}`;
  }
  // During pack open, sit the preview on top of the center pulled card
  const revealWrap = document.querySelector('#reveal-stage.active .reveal-card-wrapper');
  const inner = el.querySelector('.hp-inner');
  if(opening && opening.active && revealWrap && inner){
    const r = revealWrap.getBoundingClientRect();
    el.classList.add('over-reveal');
    inner.style.left = (r.left + r.width / 2) + 'px';
    inner.style.top = (r.top + r.height / 2) + 'px';
  } else {
    el.classList.remove('over-reveal');
    if(inner){ inner.style.left = ''; inner.style.top = ''; }
  }
  el.classList.add('visible');
  el.setAttribute('aria-hidden','false');
}
function hideHoverPreview(){
  const el = document.getElementById('hover-preview');
  if(el){
    el.classList.remove('visible','over-reveal');
    el.setAttribute('aria-hidden','true');
    const inner = el.querySelector('.hp-inner');
    if(inner){ inner.style.left = ''; inner.style.top = ''; }
  }
  // Clean up any leftover celebration layers that might linger
  document.querySelectorAll('.pull-burst,.pull-confetti,.holo-burst').forEach(e => {
    try{ e.remove(); }catch(_){}
  });
}



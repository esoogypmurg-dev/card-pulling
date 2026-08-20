/* ========== LIVE PULL ALERTS (family — online only) ========== */
let pullAlertChannel = null;
let pullAlertHideTimer = null;
const PULL_ALERT_CHANNEL = 'family-pull-alerts';

function startPullAlertWatcher(){
  stopPullAlertWatcher();
  if(!sb || !currentUser || currentUser.id === 'local-admin') return;
  try{
    pullAlertChannel = sb.channel(PULL_ALERT_CHANNEL, {
      config: { broadcast: { self: false } }
    })
    .on('broadcast', { event: 'good-pull' }, ({ payload }) => {
      if(!payload) return;
      // Ignore own events (self:false should already filter, belt-and-suspenders)
      if(payload.userId && currentUser && payload.userId === currentUser.id) return;
      showPullAlert(payload);
    })
    .subscribe((status) => {
      if(status === 'SUBSCRIBED'){
        /* ready */
      }
    });
  }catch(e){
    console.warn('Pull alert channel failed', e);
  }
}

function stopPullAlertWatcher(){
  if(pullAlertChannel && sb){
    try{ sb.removeChannel(pullAlertChannel); }catch(e){}
    pullAlertChannel = null;
  }
}

function shouldBroadcastPull(card){
  if(!card) return false;
  // Kids care about Rare Holos — not high-dollar non-holo promos (e.g. Pokémon Center)
  const label = String(card.rarityLabel || card.rarity || '').toLowerCase();
  return label.includes('rare holo') || label === 'holo';
}

function broadcastGoodPull(card){
  if(!sb || !currentUser || !pullAlertChannel || !card) return;
  if(!shouldBroadcastPull(card)) return;
  const payload = {
    userId: currentUser.id,
    name: currentUser.display_name || currentUser.username || 'Someone',
    cardId: card.id,
    cardName: card.name,
    cardNumber: card.cardNumber || '',
    rarity: card.rarityLabel || card.rarity || '',
    set: card.set || '',
    art: card.art || null,
    emoji: card.emoji || '🃏',
    price: Number(card.price) || 0,
    tier: 'amazing',
    at: Date.now()
  };
  try{
    pullAlertChannel.send({
      type: 'broadcast',
      event: 'good-pull',
      payload
    });
  }catch(e){
    console.warn('broadcastGoodPull failed', e);
  }
}


/* ========== FIRST CHARIZARD MILESTONE ========== */
const FIRST_ZARD_KEY = 'first_charizard';
const FIRST_ZARD_SEEN_LS = 'seen_first_charizard_v1';
let firstZardHideTimer = null;
let firstZardChannel = null;
let firstZardClaiming = false;

function isCharizardCard(card){
  if(!card) return false;
  const n = String(card.name || '').toLowerCase();
  // Match Charizard but not things like "Charizard ex Spirit Link" if unwanted — name includes Charizard is fine
  return n.includes('charizard');
}

function showFirstZardBanner(p, opts){
  const el = document.getElementById('first-zard-banner');
  if(!el || !p) return;
  const who = document.getElementById('fz-who');
  const sub = document.getElementById('fz-sub');
  const art = document.getElementById('fz-art');
  const name = p.display_name || p.name || p.username || 'A trainer';
  if(who) who.innerHTML = '<strong>' + String(name).replace(/</g,'&lt;') + '</strong> pulled it!';
  if(sub){
    const when = p.created_at ? new Date(p.created_at).toLocaleString() : '';
    sub.textContent = when
      ? ('The first Charizard on this server · ' + when)
      : 'The first Charizard on this server.';
  }
  if(art){
    if(p.card_art || p.art){
      art.src = p.card_art || p.art;
      art.style.display = 'block';
    } else {
      art.removeAttribute('src');
    }
  }
  el.classList.add('show');
  // gold flash already via CSS; optional soft beep
  try{
    if(!opts || opts.sound !== false){
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = 523.25;
      g.gain.value = 0.03;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(() => { o.frequency.value = 784; }, 120);
      setTimeout(() => { try{ o.stop(); ctx.close(); }catch(_){} }, 400);
    }
  }catch(_){}

  if(firstZardHideTimer) clearTimeout(firstZardHideTimer);
  const ms = (opts && opts.duration) || 25000;
  firstZardHideTimer = setTimeout(dismissFirstZardBanner, ms);

  // Mark seen so login replay doesn't spam forever
  try{
    const id = p.created_at || p.at || '1';
    localStorage.setItem(FIRST_ZARD_SEEN_LS, String(id));
  }catch(_){}
}

function dismissFirstZardBanner(){
  const el = document.getElementById('first-zard-banner');
  if(el) el.classList.remove('show');
  if(firstZardHideTimer){ clearTimeout(firstZardHideTimer); firstZardHideTimer = null; }
}

async function fetchFirstZardMilestone(){
  if(!sb) return null;
  try{
    const { data, error } = await sb.from('app_milestones')
      .select('*')
      .eq('key', FIRST_ZARD_KEY)
      .maybeSingle();
    if(error) throw error;
    return data || null;
  }catch(e){
    console.warn('[first-zard] fetch', e.message || e);
    return null;
  }
}

async function maybeShowFirstZardOnLogin(){
  const row = await fetchFirstZardMilestone();
  if(!row) return;
  let seen = '';
  try{ seen = localStorage.getItem(FIRST_ZARD_SEEN_LS) || ''; }catch(_){}
  const token = String(row.created_at || row.user_id || '1');
  if(seen === token) return;
  showFirstZardBanner({
    display_name: row.display_name || row.username,
    name: row.display_name || row.username,
    card_art: row.card_art,
    art: row.card_art,
    created_at: row.created_at
  }, { duration: 20000 });
}

async function claimFirstCharizard(card){
  if(!card || !isCharizardCard(card)) return false;
  if(!currentUser || currentUser.id === 'local-admin') return false;
  if(currentUser.is_admin) return false; // non-admin only
  if(!sb || firstZardClaiming) return false;
  firstZardClaiming = true;
  try{
    const existing = await fetchFirstZardMilestone();
    if(existing) return false;

    const row = {
      key: FIRST_ZARD_KEY,
      user_id: currentUser.id,
      username: currentUser.username || null,
      display_name: currentUser.display_name || currentUser.username || 'Trainer',
      card_name: card.name || 'Charizard',
      card_art: card.art || null,
      card_key: card.key || (card.setCode ? (card.setCode + '-' + card.num) : null)
    };
    const { data, error } = await sb.from('app_milestones').insert(row).select().maybeSingle();
    if(error){
      // unique violation = someone else won the race
      console.warn('[first-zard] claim failed', error.message || error);
      return false;
    }
    const payload = {
      userId: currentUser.id,
      name: row.display_name,
      display_name: row.display_name,
      card_art: row.card_art,
      art: row.card_art,
      card_name: row.card_name,
      created_at: (data && data.created_at) || new Date().toISOString(),
      at: Date.now()
    };
    // Show for the puller too
    showFirstZardBanner(payload, { duration: 28000 });
    // Broadcast to everyone online
    try{
      if(firstZardChannel){
        firstZardChannel.send({ type: 'broadcast', event: 'first-charizard', payload });
      } else if(pullAlertChannel){
        pullAlertChannel.send({ type: 'broadcast', event: 'first-charizard', payload });
      }
    }catch(e){ console.warn('[first-zard] broadcast', e); }
    return true;
  }finally{
    firstZardClaiming = false;
  }
}

function startFirstZardWatcher(){
  if(!sb || !currentUser || currentUser.id === 'local-admin') return;
  try{
    if(firstZardChannel){
      try{ sb.removeChannel(firstZardChannel); }catch(_){}
      firstZardChannel = null;
    }
    firstZardChannel = sb.channel('milestone-first-zard', {
      config: { broadcast: { self: false } }
    })
    .on('broadcast', { event: 'first-charizard' }, ({ payload }) => {
      if(!payload) return;
      showFirstZardBanner(payload, { duration: 25000 });
    })
    .subscribe();
  }catch(e){
    console.warn('[first-zard] channel', e);
  }
  // Offline catch-up
  setTimeout(function(){ maybeShowFirstZardOnLogin(); }, 1200);
}


function showPullAlert(p){
  const el = document.getElementById('pull-alert');
  if(!el || !p) return;
  const who = document.getElementById('pa-who');
  const msg = document.getElementById('pa-msg');
  const meta = document.getElementById('pa-meta');
  const art = document.getElementById('pa-art');
  const emoji = document.getElementById('pa-emoji');

  if(who) who.textContent = (p.name || 'Someone') + ' just pulled';
  const name = p.cardName || 'a card';
  if(msg) msg.innerHTML = '<strong>' + String(name).replace(/</g,'&lt;') + '</strong>';
  const bits = [];
  if(p.rarity) bits.push(p.rarity);
  if(p.set) bits.push(p.set === 'Wizards Black Star Promos' ? 'Promos' : p.set);
  bits.push('★ RARE HOLO');
  if(meta) meta.textContent = bits.join(' · ');

  if(p.art && art){
    art.src = p.art;
    art.style.display = 'block';
    if(emoji) emoji.style.display = 'none';
  } else {
    if(art) art.style.display = 'none';
    if(emoji){
      emoji.textContent = p.emoji || '🃏';
      emoji.style.display = 'flex';
    }
  }

  el.classList.remove('tier-great','tier-amazing','tier-jackpot');
  if(p.tier) el.classList.add('tier-' + p.tier);
  el.classList.add('show');

  if(pullAlertHideTimer) clearTimeout(pullAlertHideTimer);
  pullAlertHideTimer = setTimeout(hidePullAlert, 6500);
}

function hidePullAlert(){
  const el = document.getElementById('pull-alert');
  if(el) el.classList.remove('show');
  if(pullAlertHideTimer){ clearTimeout(pullAlertHideTimer); pullAlertHideTimer = null; }
}



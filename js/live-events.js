/* ===== ECHO PULLS (scheduled live event) ===== */
const ECHO_DURATION_MS = 150000; // 2 min 30 sec
const ECHO_LS_KEY = 'pokemonEchoEndsAt';
const ECHO_CHANNEL = 'echo-buff-v1';
let echoEndsAt = 0;
let echoChannel = null;
let echoTickTimer = null;
let echoLastBy = '';
let echoLastCard = '';

function echoIsEventArmed(){
  // Armed when a scheduled echo_pulls event is currently live
  if(typeof scheduledEvents === 'undefined' || !Array.isArray(scheduledEvents)) return false;
  if(typeof evStatus !== 'function') return false;
  return scheduledEvents.some(ev => {
    if(!ev || ev.enabled === false) return false;
    if(ev.type !== 'echo_pulls') return false;
    return evStatus(ev) === 'live';
  });
}
function echoIsActive(){
  return Date.now() < (Number(echoEndsAt) || 0);
}
function echoMsLeft(){
  return Math.max(0, (Number(echoEndsAt) || 0) - Date.now());
}
function echoFormatMs(ms){
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + String(r).padStart(2, '0');
}
function echoPersistLocal(){
  try{
    if(echoIsActive()) localStorage.setItem(ECHO_LS_KEY, String(echoEndsAt));
    else localStorage.removeItem(ECHO_LS_KEY);
  }catch(e){}
}
function echoLoadLocal(){
  try{
    const v = Number(localStorage.getItem(ECHO_LS_KEY) || 0);
    if(v > Date.now()) echoEndsAt = v;
  }catch(e){}
}
function updateEchoBanner(){
  const banner = document.getElementById('echo-banner');
  const timerEl = document.getElementById('echo-banner-timer');
  const subEl = document.getElementById('echo-banner-sub');
  if(!banner) return;
  const active = echoIsActive();
  document.body.classList.toggle('echo-active', active);
  if(!active){
    banner.classList.remove('show');
    if(timerEl) timerEl.textContent = '0:00';
    return;
  }
  banner.classList.add('show');
  const left = echoMsLeft();
  if(timerEl){
    timerEl.textContent = echoFormatMs(left);
    timerEl.classList.toggle('urgent', left <= 30000);
  }
  if(subEl){
    const who = echoLastBy ? (echoLastBy + ' hit ' + (echoLastCard || 'a Holo')) : 'Rare Holo Echo';
    subEl.textContent = who + ' · all packs boosted for everyone';
  }
}
function startEchoTicker(){
  if(echoTickTimer) return;
  echoTickTimer = setInterval(function(){
    if(echoIsActive()){
      updateEchoBanner();
    } else {
      // Just expired
      if(echoEndsAt){
        echoEndsAt = 0;
        echoPersistLocal();
        updateEchoBanner();
      }
    }
  }, 250);
}
function applyEchoState(endsAt, meta){
  const t = Number(endsAt) || 0;
  if(t <= Date.now()){
    if(echoEndsAt && echoEndsAt <= Date.now()){
      echoEndsAt = 0;
      echoPersistLocal();
      updateEchoBanner();
    }
    return;
  }
  // Take the later end so refresh extends for everyone
  if(t > echoEndsAt){
    echoEndsAt = t;
    if(meta){
      if(meta.by) echoLastBy = meta.by;
      if(meta.card) echoLastCard = meta.card;
    }
    echoPersistLocal();
    updateEchoBanner();
    startEchoTicker();
  }
}
function broadcastEchoState(){
  if(!echoChannel || !echoIsActive()) return;
  try{
    echoChannel.send({
      type: 'broadcast',
      event: 'echo-state',
      payload: {
        endsAt: echoEndsAt,
        by: echoLastBy || '',
        card: echoLastCard || '',
        at: Date.now()
      }
    });
  }catch(e){ console.warn('[echo] broadcast', e); }
}
function startEchoWatcher(){
  echoLoadLocal();
  updateEchoBanner();
  startEchoTicker();
  if(!sb || echoChannel) return;
  try{
    echoChannel = sb.channel(ECHO_CHANNEL, { config: { broadcast: { self: true } } });
    echoChannel
      .on('broadcast', { event: 'echo-state' }, ({ payload }) => {
        if(!payload) return;
        applyEchoState(payload.endsAt, { by: payload.by, card: payload.card });
      })
      .on('broadcast', { event: 'echo-request-sync' }, () => {
        // Answer if we have an active echo so late joiners catch up
        if(echoIsActive()) broadcastEchoState();
      })
      .subscribe((status) => {
        if(status === 'SUBSCRIBED'){
          try{
            echoChannel.send({ type: 'broadcast', event: 'echo-request-sync', payload: {} });
          }catch(e){}
          // Re-share our local state if still valid
          if(echoIsActive()) broadcastEchoState();
        }
      });
  }catch(e){ console.warn('[echo] channel', e); }
}
/** Called when a legendary (Rare Holo) is pulled during an armed Echo event */
function triggerEchoFromHolo(card){
  if(!echoIsEventArmed()) return false;
  if(!card || card.rarity !== 'legendary') return false;
  const name = (currentUser && (currentUser.display_name || currentUser.username)) || 'Someone';
  const cardName = (card && card.name) || 'Rare Holo';
  echoLastBy = name;
  echoLastCard = cardName;
  echoEndsAt = Date.now() + ECHO_DURATION_MS;
  echoPersistLocal();
  updateEchoBanner();
  startEchoTicker();
  broadcastEchoState();
  showToast('⚡ Echo! Family pack luck for ' + echoFormatMs(ECHO_DURATION_MS));
  return true;
}

/* ===== DAILY LUCK WHEEL ===== */
const DW_SLOTS = [
  { id:'pack1', label:'1 Pack', icon:'📦', weight:18, color:'#ef4444' },
  { id:'box', label:'Booster Box', icon:'🎁', weight:1, color:'#3b82f6' },
  { id:'rareLuck', label:'Rare Luck', icon:'✨', weight:10, color:'#22c55e' },
  { id:'holoLuck', label:'Holo Luck', icon:'💎', weight:8, color:'#f59e0b' },
  { id:'coins', label:'Coin Pouch', icon:'💰', weight:16, color:'#a855f7' },
  { id:'bundle3', label:'3-Pack', icon:'🎴', weight:6, color:'#ec4899' },
  { id:'catalog', label:'Catalog Assist', icon:'📰', weight:10, color:'#06b6d4' },
  { id:'discount', label:'Shop −25%', icon:'🏷️', weight:12, color:'#f97316' },
  { id:'sellBonus', label:'Sell +25%', icon:'📈', weight:8, color:'#6366f1' },
  { id:'mystery', label:'Mystery Card', icon:'❓', weight:11, color:'#16a34a' }
];
let dwCurrentRotation = 0; // radians
let dwAnimFrame = null;


let dwSpinning = false;
let dwBuilt = false;

function ensureLuckBuffs(){
  if(!state.luckBuffs || typeof state.luckBuffs !== 'object'){
    state.luckBuffs = { rarePacksLeft:0, holoPacksLeft:0, shopDiscount:false, sellBonus:false, freeResearch:false };
  }
  ['rarePacksLeft','holoPacksLeft'].forEach(k => {
    if(typeof state.luckBuffs[k] !== 'number') state.luckBuffs[k] = 0;
  });
  ['shopDiscount','sellBonus','freeResearch'].forEach(k => {
    state.luckBuffs[k] = !!state.luckBuffs[k];
  });
}
function canSpinDailyWheel(){
  return state.dailyWheelClaim !== todayKey();
}
function dwRandomSet(){
  const sets = (typeof availableBoosterSets === 'function') ? availableBoosterSets() : ['Base Set','Jungle','Fossil'];
  return sets[Math.floor(Math.random()*sets.length)] || 'Base Set';
}
function dwPickSlot(){
  const total = DW_SLOTS.reduce((a,s)=>a+(s.weight||1),0);
  let r = Math.random() * total;
  for(const s of DW_SLOTS){
    r -= (s.weight||1);
    if(r <= 0) return s;
  }
  return DW_SLOTS[DW_SLOTS.length-1];
}
function dwSlotIndex(id){
  return DW_SLOTS.findIndex(s => s.id === id);
}
function dwGetCanvas(){
  return document.getElementById('dw-canvas');
}
function drawDailyWheel(){
  const canvas = dwGetCanvas();
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const n = DW_SLOTS.length;
  const sliceAngle = (2 * Math.PI) / n;
  const radius = canvas.width / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Start angle offset so slice 0 is centered under the top pointer at rotation 0
  // Canvas 0 rad = right; top pointer = -PI/2. Center of slice 0 at top when rotation=0:
  // first slice starts at -PI/2 - sliceAngle/2
  const base = -Math.PI / 2 - sliceAngle / 2;

  DW_SLOTS.forEach((prize, index) => {
    const angle = base + index * sliceAngle + dwCurrentRotation;

    // Slice fill
    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius - 2, angle, angle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = prize.color || '#444';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Icon centered on the mid-radius of the slice (your technique)
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(angle + sliceAngle / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Icon sits in the visual middle of the slice band
    const iconR = radius * 0.62;
    ctx.font = '32px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    ctx.fillText(prize.icon || '★', iconR, 0);
    ctx.restore();
  });

  // Outer gold rim hint
  ctx.beginPath();
  ctx.arc(radius, radius, radius - 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(201,162,39,0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();
}
function buildDailyWheelVisual(){
  const canvas = dwGetCanvas();
  if(!canvas) return;
  // Keep internal resolution sharp
  if(canvas.width !== 500){ canvas.width = 500; canvas.height = 500; }
  dwCurrentRotation = dwCurrentRotation || 0;
  drawDailyWheel();
  const legend = document.getElementById('dw-legend');
  if(legend){
    legend.innerHTML = DW_SLOTS.map(s =>
      '<div class="dw-leg-item"><span class="dw-leg-swatch" style="background:'+(s.color||'#666')+'"></span>'+
      '<span class="dw-leg-ico">'+(s.icon||'')+'</span><span>'+s.label+'</span></div>'
    ).join('');
  }
  dwBuilt = true;
}

function luckBuffSummary(){
  ensureLuckBuffs();
  const b = state.luckBuffs;
  const parts = [];
  if(b.rarePacksLeft > 0) parts.push('Rare Luck ×' + b.rarePacksLeft);
  if(b.holoPacksLeft > 0) parts.push('Holo Luck ×' + b.holoPacksLeft);
  if(b.shopDiscount) parts.push('Shop −25%');
  if(b.sellBonus) parts.push('Sell +25%');
  if(b.freeResearch) parts.push('Free research');
  return parts.length ? parts.join(' · ') : '';
}
function updateDailyWheelUI(){
  ensureLuckBuffs();
  const can = canSpinDailyWheel();
  const sideBtn = document.getElementById('daily-wheel-btn-side');
  const sideNote = document.getElementById('daily-wheel-note-side');
  const homeStatVal = document.getElementById('home-dw-stat-value');
  const homeStat = document.getElementById('home-dw-stat');
  const spinBtn = document.getElementById('dw-spin-btn');
  const buffEl = document.getElementById('dw-active-buffs');
  const summary = luckBuffSummary();
  if(sideBtn){
    sideBtn.disabled = !can || dwSpinning;
    sideBtn.textContent = can ? '🎡 Daily Luck Wheel' : '✓ Wheel used today';
    sideBtn.classList.toggle('dw-ready', !!(can && !dwSpinning));
  }
  if(sideNote) sideNote.textContent = can ? '1 free spin per day' : 'Come back tomorrow';
  if(homeStatVal) homeStatVal.textContent = can ? 'Spin' : 'Done';
  if(homeStat){
    homeStat.style.opacity = can ? '1' : '.72';
    homeStat.title = can ? 'Daily Luck Wheel — free spin available' : (summary ? 'Active: '+summary : 'Already spun today');
    homeStat.classList.toggle('dw-ready', !!(can && !dwSpinning));
  }
  if(spinBtn){
    spinBtn.disabled = !can || dwSpinning;
    spinBtn.textContent = dwSpinning ? 'SPINNING…' : (can ? 'SPIN' : 'Come back tomorrow');
  }
  const hubBtn = document.getElementById('dw-hub-btn');
  if(hubBtn){
    hubBtn.disabled = !can || dwSpinning;
    hubBtn.textContent = dwSpinning ? '…' : 'SPIN';
  }
  if(buffEl) buffEl.textContent = summary ? ('Active: ' + summary) : '';
}
function openDailyWheel(){
  const modal = document.getElementById('daily-wheel-modal');
  if(!modal) return;
  if(!dwBuilt) buildDailyWheelVisual();
  const res = document.getElementById('dw-result');
  if(res) res.classList.remove('show');
  const timerEl = document.getElementById('dw-result-timer');
  if(timerEl) timerEl.textContent = '';
  modal.classList.add('open');
  updateDailyWheelUI();
}
function closeDailyWheel(){
  if(dwSpinning) return;
  if(window._dwCloseTimer){ clearInterval(window._dwCloseTimer); window._dwCloseTimer = null; }
  const modal = document.getElementById('daily-wheel-modal');
  if(modal) modal.classList.remove('open');
}
function consumeLuckBuffOnPackOpen(){
  ensureLuckBuffs();
  let changed = false;
  if(state.luckBuffs.rarePacksLeft > 0){ state.luckBuffs.rarePacksLeft--; changed = true; }
  if(state.luckBuffs.holoPacksLeft > 0){ state.luckBuffs.holoPacksLeft--; changed = true; }
  if(changed && typeof updateDailyWheelUI === 'function') updateDailyWheelUI();
}
function applyDailyWheelReward(slot){
  ensureLuckBuffs();
  ensurePackQueue();
  const setName = dwRandomSet();
  let title = slot.label;
  let desc = '';
  switch(slot.id){
    case 'pack1': {
      state.packQueue.push(setName);
      state.packs = state.packQueue.length;
      title = '1 Pack!';
      desc = 'You received 1× ' + setName + ' pack.';
      break;
    }
    case 'box': {
      const n = (typeof BOX_PACKS === 'number' ? BOX_PACKS : 36);
      for(let i=0;i<n;i++) state.packQueue.push(setName);
      state.packs = state.packQueue.length;
      title = 'Booster Box!';
      desc = 'Jackpot — ' + n + '× ' + setName + ' packs added to your queue!';
      break;
    }
    case 'rareLuck': {
      state.luckBuffs.rarePacksLeft = (state.luckBuffs.rarePacksLeft||0) + 3;
      title = 'Rare Luck';
      desc = 'Next 3 packs: higher chance at rares (epic).';
      break;
    }
    case 'holoLuck': {
      state.luckBuffs.holoPacksLeft = (state.luckBuffs.holoPacksLeft||0) + 2;
      title = 'Holo Luck';
      desc = 'Next 2 packs: higher holo odds (Charizard excluded from the boost).';
      break;
    }
    case 'coins': {
      const amt = Math.round((8 + Math.random()*7) * 100) / 100; // $8–$15
      state.money = Math.round((state.money + amt) * 100) / 100;
      title = 'Coin Pouch';
      desc = 'You gained $' + amt.toFixed(2) + '.';
      break;
    }
    case 'bundle3': {
      for(let i=0;i<3;i++) state.packQueue.push(setName);
      state.packs = state.packQueue.length;
      title = '3-Pack Bundle';
      desc = '3× ' + setName + ' packs added.';
      break;
    }
    case 'catalog': {
      state.luckBuffs.freeResearch = true;
      title = 'Catalog Assist';
      desc = 'Your next Lab research is free and instant — open a card you own and Research.';
      break;
    }
    case 'discount': {
      state.luckBuffs.shopDiscount = true;
      title = 'Shop Discount';
      desc = 'Next pack purchase in the Shop is 25% off.';
      break;
    }
    case 'sellBonus': {
      state.luckBuffs.sellBonus = true;
      title = 'Sell Bonus';
      desc = 'Your next sell to the shop pays +25% (price must be researched).';
      break;
    }
    case 'mystery': {
      const pool = CARDS.filter(c => c.rarity === 'common' || c.rarity === 'uncommon');
      const card = pool.length ? pool[Math.floor(Math.random()*pool.length)] : null;
      if(card){
        const wasNew = colGet(state.collection, card) === 0;
        colSet(state.collection, card, colGet(state.collection, card) + 1);
        title = 'Mystery Card';
        desc = (wasNew ? 'NEW · ' : '') + (card.cardNumber ? card.cardNumber + ' ' : '') + card.name + ' (' + (card.rarityLabel||card.rarity) + ')';
      } else {
        state.money = Math.round((state.money + 5) * 100) / 100;
        title = 'Mystery Card';
        desc = 'No card pool — $5 consolation.';
      }
      break;
    }
    default:
      desc = 'Something fun happened!';
  }
  return { title, desc };
}
function spinDailyWheel(){
  if(dwSpinning) return;
  if(!canSpinDailyWheel()){ showToast('Already spun today'); updateDailyWheelUI(); return; }
  if(typeof markEventParticipation === 'function') markEventParticipation('daily_wheel');
  if(typeof markMilestone === 'function') markMilestone('daily_wheel_seen');
  if(typeof bumpAchStat === 'function') bumpAchStat('dailyWheelSpins', 1);
  if(!dwBuilt) buildDailyWheelVisual();
  const canvas = dwGetCanvas();
  if(!canvas) return;

  const slot = dwPickSlot();
  const idx = dwSlotIndex(slot.id);
  if(idx < 0) return;

  const n = DW_SLOTS.length;
  const sliceAngle = (2 * Math.PI) / n;
  // We want slice idx centered under the top pointer after spin.
  // With base = -PI/2 - sliceAngle/2, slice idx mid at:
  //   base + idx*sliceAngle + sliceAngle/2 + rotation  ≡  -PI/2  (mod 2PI)
  // → -PI/2 - sliceAngle/2 + idx*sliceAngle + sliceAngle/2 + rotation ≡ -PI/2
  // → rotation ≡ -idx*sliceAngle  (mod 2PI)
  const targetMod = -idx * sliceAngle;
  // Normalize current
  let cur = dwCurrentRotation % (2 * Math.PI);
  if(cur < 0) cur += 2 * Math.PI;
  let tgt = targetMod % (2 * Math.PI);
  if(tgt < 0) tgt += 2 * Math.PI;
  // Spin forward (clockwise visually on canvas = increasing angle in our draw)
  let delta = tgt - cur;
  // Always go at least 5 full turns forward
  const minTurns = 5 + Math.floor(Math.random() * 3);
  while(delta <= minTurns * 2 * Math.PI) delta += 2 * Math.PI;
  // Small jitter within half-slice so it still lands on same prize
  const jitter = (Math.random() - 0.5) * sliceAngle * 0.35;
  delta += jitter;

  const startRot = dwCurrentRotation;
  const endRot = startRot + delta;
  const duration = 4200;
  const startTime = performance.now();

  dwSpinning = true;
  updateDailyWheelUI();
  const res = document.getElementById('dw-result');
  if(res) res.classList.remove('show');
  if(dwAnimFrame) cancelAnimationFrame(dwAnimFrame);

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function animate(now){
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    dwCurrentRotation = startRot + (endRot - startRot) * easeOutCubic(progress);
    drawDailyWheel();
    if(progress < 1){
      dwAnimFrame = requestAnimationFrame(animate);
    } else {
      dwAnimFrame = null;
      dwCurrentRotation = endRot;
      drawDailyWheel();
      // Award predetermined slot (weights already applied)
      state.dailyWheelClaim = todayKey();
      const outcome = applyDailyWheelReward(slot);
      save();
      dwSpinning = false;
      updateUI();
      if(typeof renderCollection === 'function') renderCollection();
      const titleEl = document.getElementById('dw-result-title');
      const descEl = document.getElementById('dw-result-desc');
      const timerEl = document.getElementById('dw-result-timer');
      if(titleEl) titleEl.textContent = outcome.title;
      if(descEl) descEl.textContent = outcome.desc;
      if(res) res.classList.add('show');
      showToast(outcome.title + ' — ' + outcome.desc);
      updateDailyWheelUI();
      let left = 5;
      if(timerEl) timerEl.textContent = 'Closing in ' + left + 's…';
      if(window._dwCloseTimer) clearInterval(window._dwCloseTimer);
      window._dwCloseTimer = setInterval(function(){
        left--;
        if(timerEl) timerEl.textContent = left > 0 ? ('Closing in ' + left + 's…') : 'Closing…';
        if(left <= 0){
          clearInterval(window._dwCloseTimer);
          window._dwCloseTimer = null;
          closeDailyWheel();
        }
      }, 1000);
    }
  }
  dwAnimFrame = requestAnimationFrame(animate);
}



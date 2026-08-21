/* ===== WIZARDS BLACK STAR PROMO PACK ===== */
const PROMO_SET_NAME = 'Wizards Black Star Promos';
const PROMO_CHANCE = 0.28; // ~28% chance on login if not already claimed today

function canClaimPromo(){
  return state.promoClaim !== todayKey();
}
function maybeShowPromoOnLogin(){
  if(!currentUser || !canClaimPromo()) return;
  if(Math.random() > PROMO_CHANCE) return;
  const m = document.getElementById('promo-modal');
  if(m) m.style.display = 'flex';
}
function dismissPromoModal(){
  const m = document.getElementById('promo-modal');
  if(m) m.style.display = 'none';
  // Don't mark claimed — they can get another chance next login same day? 
  // User asked for random on login; mark so it only tries once per day after dismiss too.
  state.promoClaim = todayKey();
  save();
}
function pickPromoCard(){
  const pool = CARDS.filter(c => c.set === PROMO_SET_NAME);
  if(!pool.length) return null;
  // Inverse-price weight (same idea as base packs)
  const weights = pool.map(c => 1 / Math.pow((c.price||1) + 2, 1.35));
  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random() * total;
  for(let i=0;i<pool.length;i++){
    r -= weights[i];
    if(r <= 0) return pool[i];
  }
  return pool[pool.length-1];
}
function openPromoPack(){
  const m = document.getElementById('promo-modal');
  if(m) m.style.display = 'none';
  const card = pickPromoCard();
  if(!card){ showToast('No promo cards found'); return; }

  state.promoClaim = todayKey();
  colSet(state.collection, card, colGet(state.collection, card) + 1);
  if(card.rarity === 'legendary') state.stats.holosPulled = (state.stats.holosPulled||0) + 1;
  state.stats.packsOpened = (state.stats.packsOpened||0) + 1;
  save(); updateUI(); renderCollection(); renderBinder();

  const rev = document.getElementById('promo-reveal');
  const box = document.getElementById('promo-reveal-card');
  const name = document.getElementById('promo-reveal-name');
  const meta = document.getElementById('promo-reveal-meta');
  if(box){
    box.innerHTML = card.art
      ? `<img src="${card.art}" alt="${card.name}" style="width:100%;border-radius:12px;border:2px solid #ffcb05;box-shadow:0 0 30px rgba(255,203,5,.35)">`
      : `<div style="font-size:4rem">${card.emoji||'⭐'}</div>`;
  }
  if(name) name.textContent = card.name;
  if(meta) meta.textContent = `Promo #${card.cardNumber} · ${card.rarityLabel} · $${(card.price||0).toFixed(2)}`;
  if(rev) rev.style.display = 'flex';
  showToast('Promo pack opened!');
}
function closePromoReveal(){
  const rev = document.getElementById('promo-reveal');
  if(rev) rev.style.display = 'none';
}



/* ===== Daily Quests: 33 easy / 33 medium / 33 hard =====
   One quest is active per tier per day (easy -> medium -> hard), unlocking
   sequentially as each is claimed. Rewards are fixed per tier, not per-quest
   (see DAILY_TIER_REWARDS). `dayPacksSet` quests reference "today's featured
   set", auto-picked once per day from whichever booster sets are currently
   live (availableBoosterSets()) — a newly released set becomes eligible with
   no code changes here. */
const DAILY_QUESTS_EASY = [
  { id:'e_pack_0', title:'Warm-up Rip', desc:'Open 1 pack today', type:'dayPacks', target:1, tier:'easy' },
  { id:'e_pack_1', title:'Quick Rip', desc:'Open 1 pack today', type:'dayPacks', target:1, tier:'easy' },
  { id:'e_pack_2', title:'Morning Pull', desc:'Open 1 pack today', type:'dayPacks', target:1, tier:'easy' },
  { id:'e_pack_3', title:'First Rip of the Day', desc:'Open 1 pack today', type:'dayPacks', target:1, tier:'easy' },
  { id:'e_pack_4', title:'Just One More', desc:'Open 1 pack today', type:'dayPacks', target:1, tier:'easy' },
  { id:'e_pack_5', title:'Double Pull', desc:'Open 2 packs today', type:'dayPacks', target:2, tier:'easy' },
  { id:'e_fset_0', title:'Featured Set Sampler', desc:'Open 1 pack from today\'s featured set: {set}', type:'dayPacksSet', target:1, tier:'easy', set:'auto' },
  { id:'e_fset_1', title:'Set of the Day', desc:'Open 1 pack from today\'s featured set: {set}', type:'dayPacksSet', target:1, tier:'easy', set:'auto' },
  { id:'e_fset_2', title:'Today\'s Pick', desc:'Open 1 pack from today\'s featured set: {set}', type:'dayPacksSet', target:1, tier:'easy', set:'auto' },
  { id:'e_fset_3', title:'Spotlight Rip', desc:'Open 1 pack from today\'s featured set: {set}', type:'dayPacksSet', target:1, tier:'easy', set:'auto' },
  { id:'e_fset_4', title:'Featured First Rip', desc:'Open 1 pack from today\'s featured set: {set}', type:'dayPacksSet', target:1, tier:'easy', set:'auto' },
  { id:'e_fset_5', title:'Set Spotlight', desc:'Open 2 packs from today\'s featured set: {set}', type:'dayPacksSet', target:2, tier:'easy', set:'auto' },
  { id:'e_sell_0', title:'Quick Sale', desc:'Sell 1 duplicate today', type:'daySells', target:1, tier:'easy' },
  { id:'e_sell_1', title:'Clear a Dupe', desc:'Sell 1 duplicate today', type:'daySells', target:1, tier:'easy' },
  { id:'e_sell_2', title:'Tidy the Binder', desc:'Sell 1 duplicate today', type:'daySells', target:1, tier:'easy' },
  { id:'e_sell_3', title:'Small Cash-in', desc:'Sell 1 duplicate today', type:'daySells', target:1, tier:'easy' },
  { id:'e_sell_4', title:'Spring Cleaning', desc:'Sell 2 duplicates today', type:'daySells', target:2, tier:'easy' },
  { id:'e_new_0', title:'Something New', desc:'Collect 1 new unique card today', type:'dayNew', target:1, tier:'easy' },
  { id:'e_new_1', title:'Fresh Find', desc:'Collect 1 new unique card today', type:'dayNew', target:1, tier:'easy' },
  { id:'e_new_2', title:'New Face', desc:'Collect 1 new unique card today', type:'dayNew', target:1, tier:'easy' },
  { id:'e_new_3', title:'First Timer', desc:'Collect 1 new unique card today', type:'dayNew', target:1, tier:'easy' },
  { id:'e_new_4', title:'A New Addition', desc:'Collect 2 new unique cards today', type:'dayNew', target:2, tier:'easy' },
  { id:'e_money_0', title:'Pocket Change', desc:'Earn $2 from shop sales today', type:'daySaleMoney', target:2, tier:'easy' },
  { id:'e_money_1', title:'Loose Change', desc:'Earn $2 from shop sales today', type:'daySaleMoney', target:2, tier:'easy' },
  { id:'e_money_2', title:'A Few Bucks', desc:'Earn $3 from shop sales today', type:'daySaleMoney', target:3, tier:'easy' },
  { id:'e_money_3', title:'Small Payday', desc:'Earn $3 from shop sales today', type:'daySaleMoney', target:3, tier:'easy' },
  { id:'e_money_4', title:'Coffee Money', desc:'Earn $4 from shop sales today', type:'daySaleMoney', target:4, tier:'easy' },
  { id:'e_holo_0', title:'Daily Shine', desc:'Pull 1 Rare Holo today', type:'dayHolos', target:1, tier:'easy' },
  { id:'e_holo_1', title:'A Little Sparkle', desc:'Pull 1 Rare Holo today', type:'dayHolos', target:1, tier:'easy' },
  { id:'e_holo_2', title:'Shiny Start', desc:'Pull 1 Rare Holo today', type:'dayHolos', target:1, tier:'easy' },
  { id:'e_holo_3', title:'First Shine', desc:'Pull 1 Rare Holo today', type:'dayHolos', target:1, tier:'easy' },
  { id:'e_holo_4', title:'Glimmer of Hope', desc:'Pull 1 Rare Holo today', type:'dayHolos', target:1, tier:'easy' },
  { id:'e_holo_5', title:'Holo Hopeful', desc:'Pull 1 Rare Holo today', type:'dayHolos', target:1, tier:'easy' },
];

const DAILY_QUESTS_MEDIUM = [
  { id:'m_pack_0', title:'Triple Rip', desc:'Open 3 packs today', type:'dayPacks', target:3, tier:'medium' },
  { id:'m_pack_1', title:'Pack Habit', desc:'Open 3 packs today', type:'dayPacks', target:3, tier:'medium' },
  { id:'m_pack_2', title:'Steady Rips', desc:'Open 4 packs today', type:'dayPacks', target:4, tier:'medium' },
  { id:'m_pack_3', title:'Booster Binge', desc:'Open 4 packs today', type:'dayPacks', target:4, tier:'medium' },
  { id:'m_pack_4', title:'Ripping Away', desc:'Open 5 packs today', type:'dayPacks', target:5, tier:'medium' },
  { id:'m_pack_5', title:'Midday Rip Session', desc:'Open 5 packs today', type:'dayPacks', target:5, tier:'medium' },
  { id:'m_fset_0', title:'Featured Set Focus', desc:'Open 3 packs from today\'s featured set: {set}', type:'dayPacksSet', target:3, tier:'medium', set:'auto' },
  { id:'m_fset_1', title:'Deep Dive: Featured Set', desc:'Open 3 packs from today\'s featured set: {set}', type:'dayPacksSet', target:3, tier:'medium', set:'auto' },
  { id:'m_fset_2', title:'Set Loyalist', desc:'Open 4 packs from today\'s featured set: {set}', type:'dayPacksSet', target:4, tier:'medium', set:'auto' },
  { id:'m_fset_3', title:'Spotlight Streak', desc:'Open 4 packs from today\'s featured set: {set}', type:'dayPacksSet', target:4, tier:'medium', set:'auto' },
  { id:'m_fset_4', title:'Committed to the Set', desc:'Open 5 packs from today\'s featured set: {set}', type:'dayPacksSet', target:5, tier:'medium', set:'auto' },
  { id:'m_sell_0', title:'Vendor Day', desc:'Sell 3 duplicates today', type:'daySells', target:3, tier:'medium' },
  { id:'m_sell_1', title:'Market Flipper', desc:'Sell 4 duplicates today', type:'daySells', target:4, tier:'medium' },
  { id:'m_sell_2', title:'Clearing House', desc:'Sell 4 duplicates today', type:'daySells', target:4, tier:'medium' },
  { id:'m_sell_3', title:'Dupe Dump', desc:'Sell 5 duplicates today', type:'daySells', target:5, tier:'medium' },
  { id:'m_sell_4', title:'Steady Seller', desc:'Sell 5 duplicates today', type:'daySells', target:5, tier:'medium' },
  { id:'m_sell_5', title:'Afternoon Flip', desc:'Sell 6 duplicates today', type:'daySells', target:6, tier:'medium' },
  { id:'m_new_0', title:'Binder Filler', desc:'Collect 3 new unique cards today', type:'dayNew', target:3, tier:'medium' },
  { id:'m_new_1', title:'New Arrivals', desc:'Collect 4 new unique cards today', type:'dayNew', target:4, tier:'medium' },
  { id:'m_new_2', title:'Collection Boost', desc:'Collect 4 new unique cards today', type:'dayNew', target:4, tier:'medium' },
  { id:'m_new_3', title:'Fresh Wave', desc:'Collect 5 new unique cards today', type:'dayNew', target:5, tier:'medium' },
  { id:'m_new_4', title:'Building the Binder', desc:'Collect 5 new unique cards today', type:'dayNew', target:5, tier:'medium' },
  { id:'m_new_5', title:'Widening the Binder', desc:'Collect 6 new unique cards today', type:'dayNew', target:6, tier:'medium' },
  { id:'m_money_0', title:'Solid Payday', desc:'Earn $8 from shop sales today', type:'daySaleMoney', target:8, tier:'medium' },
  { id:'m_money_1', title:'Good Haul', desc:'Earn $10 from shop sales today', type:'daySaleMoney', target:10, tier:'medium' },
  { id:'m_money_2', title:'Steady Income', desc:'Earn $12 from shop sales today', type:'daySaleMoney', target:12, tier:'medium' },
  { id:'m_money_3', title:'Market Momentum', desc:'Earn $15 from shop sales today', type:'daySaleMoney', target:15, tier:'medium' },
  { id:'m_money_4', title:'Nice Earner', desc:'Earn $18 from shop sales today', type:'daySaleMoney', target:18, tier:'medium' },
  { id:'m_holo_0', title:'Shine Streak', desc:'Pull 2 Rare Holos today', type:'dayHolos', target:2, tier:'medium' },
  { id:'m_holo_1', title:'Holo Hunter', desc:'Pull 2 Rare Holos today', type:'dayHolos', target:2, tier:'medium' },
  { id:'m_holo_2', title:'Sparkle Run', desc:'Pull 2 Rare Holos today', type:'dayHolos', target:2, tier:'medium' },
  { id:'m_holo_3', title:'Double Shine', desc:'Pull 3 Rare Holos today', type:'dayHolos', target:3, tier:'medium' },
  { id:'m_holo_4', title:'Shine Seeker', desc:'Pull 3 Rare Holos today', type:'dayHolos', target:3, tier:'medium' },
];

const DAILY_QUESTS_HARD = [
  { id:'h_pack_0', title:'Pack Marathon', desc:'Open 6 packs today', type:'dayPacks', target:6, tier:'hard' },
  { id:'h_pack_1', title:'Booster Addict', desc:'Open 7 packs today', type:'dayPacks', target:7, tier:'hard' },
  { id:'h_pack_2', title:'Ripper\'s Challenge', desc:'Open 8 packs today', type:'dayPacks', target:8, tier:'hard' },
  { id:'h_pack_3', title:'All-Out Rip Session', desc:'Open 9 packs today', type:'dayPacks', target:9, tier:'hard' },
  { id:'h_pack_4', title:'Pack Overload', desc:'Open 10 packs today', type:'dayPacks', target:10, tier:'hard' },
  { id:'h_pack_5', title:'Rip \'Til You Drop', desc:'Open 10 packs today', type:'dayPacks', target:10, tier:'hard' },
  { id:'h_fset_0', title:'Featured Set Devotion', desc:'Open 5 packs from today\'s featured set: {set}', type:'dayPacksSet', target:5, tier:'hard', set:'auto' },
  { id:'h_fset_1', title:'All In On the Feature', desc:'Open 6 packs from today\'s featured set: {set}', type:'dayPacksSet', target:6, tier:'hard', set:'auto' },
  { id:'h_fset_2', title:'Set Superfan', desc:'Open 6 packs from today\'s featured set: {set}', type:'dayPacksSet', target:6, tier:'hard', set:'auto' },
  { id:'h_fset_3', title:'Featured Set Grind', desc:'Open 7 packs from today\'s featured set: {set}', type:'dayPacksSet', target:7, tier:'hard', set:'auto' },
  { id:'h_fset_4', title:'Spotlight Marathon', desc:'Open 8 packs from today\'s featured set: {set}', type:'dayPacksSet', target:8, tier:'hard', set:'auto' },
  { id:'h_sell_0', title:'Liquidation Day', desc:'Sell 6 duplicates today', type:'daySells', target:6, tier:'hard' },
  { id:'h_sell_1', title:'Market Overhaul', desc:'Sell 7 duplicates today', type:'daySells', target:7, tier:'hard' },
  { id:'h_sell_2', title:'Full Clearance', desc:'Sell 8 duplicates today', type:'daySells', target:8, tier:'hard' },
  { id:'h_sell_3', title:'Wholesale Push', desc:'Sell 9 duplicates today', type:'daySells', target:9, tier:'hard' },
  { id:'h_sell_4', title:'Vendor Marathon', desc:'Sell 10 duplicates today', type:'daySells', target:10, tier:'hard' },
  { id:'h_sell_5', title:'Total Liquidation', desc:'Sell 10 duplicates today', type:'daySells', target:10, tier:'hard' },
  { id:'h_new_0', title:'Collector\'s Push', desc:'Collect 6 new unique cards today', type:'dayNew', target:6, tier:'hard' },
  { id:'h_new_1', title:'Binder Expansion', desc:'Collect 7 new unique cards today', type:'dayNew', target:7, tier:'hard' },
  { id:'h_new_2', title:'New Card Rush', desc:'Collect 8 new unique cards today', type:'dayNew', target:8, tier:'hard' },
  { id:'h_new_3', title:'Major Haul', desc:'Collect 9 new unique cards today', type:'dayNew', target:9, tier:'hard' },
  { id:'h_new_4', title:'Collection Overhaul', desc:'Collect 10 new unique cards today', type:'dayNew', target:10, tier:'hard' },
  { id:'h_new_5', title:'Total Binder Rebuild', desc:'Collect 10 new unique cards today', type:'dayNew', target:10, tier:'hard' },
  { id:'h_money_0', title:'Big Payday', desc:'Earn $20 from shop sales today', type:'daySaleMoney', target:20, tier:'hard' },
  { id:'h_money_1', title:'Serious Income', desc:'Earn $25 from shop sales today', type:'daySaleMoney', target:25, tier:'hard' },
  { id:'h_money_2', title:'Market Mogul', desc:'Earn $30 from shop sales today', type:'daySaleMoney', target:30, tier:'hard' },
  { id:'h_money_3', title:'Heavy Hitter', desc:'Earn $35 from shop sales today', type:'daySaleMoney', target:35, tier:'hard' },
  { id:'h_money_4', title:'Top Earner', desc:'Earn $40 from shop sales today', type:'daySaleMoney', target:40, tier:'hard' },
  { id:'h_holo_0', title:'Holo Overload', desc:'Pull 3 Rare Holos today', type:'dayHolos', target:3, tier:'hard' },
  { id:'h_holo_1', title:'Shine Master', desc:'Pull 4 Rare Holos today', type:'dayHolos', target:4, tier:'hard' },
  { id:'h_holo_2', title:'Holo Gauntlet', desc:'Pull 4 Rare Holos today', type:'dayHolos', target:4, tier:'hard' },
  { id:'h_holo_3', title:'Blinding Streak', desc:'Pull 5 Rare Holos today', type:'dayHolos', target:5, tier:'hard' },
  { id:'h_holo_4', title:'Holo Frenzy', desc:'Pull 5 Rare Holos today', type:'dayHolos', target:5, tier:'hard' },
];

const DAILY_TIER_REWARDS = {
  easy:   { packs:1,  money:5 },
  medium: { packs:3,  money:15 },
  hard:   { packs:10, money:25 }
};
const DAILY_TIER_ICON = { easy:'⭐', medium:'✨', hard:'🏆' };

function hashStr(s){
  let h = 0;
  for(let i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function ensureDailyState(){
  if(!state.dailyProgress || state.dailyProgress.date !== todayKey()){
    state.dailyProgress = {
      date: todayKey(),
      packsOpened: 0,
      sells: 0,
      newCards: 0,
      saleMoney: 0,
      holos: 0,
      claimed: {},
      questIds: null,
      featuredSet: null
    };
  }
  if(!state.dailyProgress.claimed) state.dailyProgress.claimed = {};
}

function questDefById(id){
  return DAILY_QUESTS_EASY.find(q => q.id === id)
    || DAILY_QUESTS_MEDIUM.find(q => q.id === id)
    || DAILY_QUESTS_HARD.find(q => q.id === id)
    || null;
}

// Picks today's easy/medium/hard quest ids + a featured set, seeded by the date
// so they stay stable across reloads/devices for the same day.
function ensureTodayQuestChain(){
  ensureDailyState();
  if(Array.isArray(state.dailyProgress.questIds) && state.dailyProgress.questIds.length === 3){
    return state.dailyProgress.questIds;
  }
  const seed = hashStr(todayKey() + '-daily-v2');
  let s = seed || 1;
  const next = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s; };
  const easy = DAILY_QUESTS_EASY[next() % DAILY_QUESTS_EASY.length];
  const medium = DAILY_QUESTS_MEDIUM[next() % DAILY_QUESTS_MEDIUM.length];
  const hard = DAILY_QUESTS_HARD[next() % DAILY_QUESTS_HARD.length];
  state.dailyProgress.questIds = [easy.id, medium.id, hard.id];
  const sets = typeof availableBoosterSets === 'function' ? availableBoosterSets() : [];
  state.dailyProgress.featuredSet = sets.length ? sets[next() % sets.length] : 'Base Set';
  return state.dailyProgress.questIds;
}

// Resolves a def's dynamic bits (today's featured set) into a concrete, displayable copy.
function resolveQuestDef(def){
  if(!def || def.set !== 'auto') return def;
  ensureTodayQuestChain();
  const setName = state.dailyProgress.featuredSet || 'Base Set';
  return Object.assign({}, def, {
    set: setName,
    title: def.title.replace('{set}', setName),
    desc: def.desc.replace('{set}', setName)
  });
}

function todaysDailyQuests(){
  return ensureTodayQuestChain().map(id => resolveQuestDef(questDefById(id))).filter(Boolean);
}

function trackDaily(field, amount){
  ensureDailyState();
  state.dailyProgress[field] = (state.dailyProgress[field]||0) + amount;
}

function questProgress(def){
  ensureDailyState();
  if(def.type==='dayPacks') return state.dailyProgress.packsOpened||0;
  if(def.type==='dayPacksSet') return state.dailyProgress['packsBySet_'+def.set]||0;
  if(def.type==='daySells') return state.dailyProgress.sells||0;
  if(def.type==='dayNew') return state.dailyProgress.newCards||0;
  if(def.type==='daySaleMoney') return Math.floor(state.dailyProgress.saleMoney||0);
  if(def.type==='dayHolos') return state.dailyProgress.holos||0;
  return 0;
}
function questTarget(def){
  return def.target||1;
}
function questDone(def){
  return questProgress(def) >= questTarget(def);
}
function questClaimed(def){
  ensureDailyState();
  return !!state.dailyProgress.claimed[def.id];
}

function grantDailyQuestReward(def){
  const rew = DAILY_TIER_REWARDS[def.tier] || { packs:0, money:0 };
  const packs = rew.packs;
  const money = rew.money;
  let setName = def.set || selectedOpenSet || 'Base Set';
  if(setName === 'Wizards Black Star Promos') setName = 'Base Set';
  if(packs > 0){
    ensurePackQueue();
    for(let i=0;i<packs;i++) state.packQueue.push(setName);
    state.packs = state.packQueue.length;
  }
  if(money > 0){
    state.money = Math.round((state.money + money)*100)/100;
  }
  let msg = 'Reward claimed!';
  if(packs) msg += ' +'+packs+' pack'+(packs>1?'s':'');
  if(money) msg += (packs?' ·':'')+' +$'+money.toFixed(0);
  return msg;
}

function claimQuest(id){
  const defs = todaysDailyQuests();
  const def = defs.find(q => q.id === id);
  if(!def) return;
  if(questClaimed(def)){ showToast('Already claimed'); return; }
  if(!questDone(def)){ showToast('Not complete yet'); return; }
  const idx = defs.findIndex(q => q.id === id);
  for(let i=0;i<idx;i++){
    if(!questClaimed(defs[i])){ showToast('Complete the previous quest first'); return; }
  }
  ensureDailyState();
  state.dailyProgress.claimed[id] = true;
  const msg = grantDailyQuestReward(def);
  save(); updateUI(); renderQuests();
  showToast(msg);
}

function rewardText(def){
  const rew = DAILY_TIER_REWARDS[def.tier] || { packs:0, money:0 };
  const parts = [];
  if(rew.packs) parts.push('+'+rew.packs+' pack'+(rew.packs>1?'s':''));
  if(rew.money) parts.push('+$'+rew.money);
  return parts.join(' · ') || '—';
}

// Updates the "Today's Quest" widget on Home with whichever tier is currently active.
function renderQuests(){
  const defs = todaysDailyQuests();
  const idx = defs.findIndex(q => !questClaimed(q));
  const setText = (id, t) => { const el = document.getElementById(id); if(el) el.textContent = t; };
  const claimBtn = document.getElementById('home-quest-claim-btn');
  const icon = document.getElementById('home-quest-icon');
  const fill = document.querySelector('.home-quest-bar i');
  if(idx === -1){
    setText('home-quest-title', 'All done for today!');
    setText('home-quest-copy', 'New quests tomorrow.');
    setText('home-quest-progress', '—');
    setText('home-quest-reward', '');
    if(icon) icon.textContent = '✅';
    if(fill) fill.style.width = '100%';
    if(claimBtn) claimBtn.style.display = 'none';
  } else {
    const def = defs[idx];
    const target = questTarget(def);
    const progress = Math.min(questProgress(def), target);
    const done = questDone(def);
    setText('home-quest-title', def.title);
    setText('home-quest-copy', done ? 'Complete — claim your reward!' : def.desc);
    setText('home-quest-progress', progress + ' / ' + target);
    setText('home-quest-reward', 'Reward: ' + rewardText(def));
    if(icon) icon.textContent = DAILY_TIER_ICON[def.tier] || '🎁';
    if(fill) fill.style.width = (progress / Math.max(1,target) * 100) + '%';
    if(claimBtn){
      claimBtn.style.display = done ? '' : 'none';
      claimBtn.onclick = () => claimQuest(def.id);
    }
  }
  if(typeof completeResearchJobs === 'function'){
    if(completeResearchJobs()){
      if(typeof renderCatalog === 'function') renderCatalog();
      if(zoomCardId != null){
        const c = CARDS.find(x => x.id === zoomCardId);
        if(c && typeof renderZoomCopyUI === 'function') renderZoomCopyUI(c);
      }
    }
  }
}

let _questNotifyQueue = [];
let _questNotifyOpen = false;

let _popupQuestId = null;

function showQuestCompletePopup(def){
  if(!def) return;
  _questNotifyQueue.push(def);
  pumpQuestNotify();
}

function pumpQuestNotify(){
  if(_questNotifyOpen) return;
  const def = _questNotifyQueue.shift();
  if(!def){ _popupQuestId = null; return; }
  _questNotifyOpen = true;
  _popupQuestId = def.id;
  const m = document.getElementById('quest-complete-modal');
  const title = document.getElementById('qc-title');
  const desc = document.getElementById('qc-desc');
  const rew = document.getElementById('qc-reward');
  const claimBtn = document.getElementById('qc-claim-btn');
  if(title) title.textContent = 'Daily Quest Complete!';
  if(desc) desc.textContent = def.title + (def.desc ? ' — ' + def.desc : '');
  if(rew) rew.textContent = (typeof rewardText === 'function' ? rewardText(def) : 'Reward ready');
  if(claimBtn){
    claimBtn.style.display = '';
    claimBtn.disabled = false;
    claimBtn.textContent = 'Claim Reward';
  }
  if(m) m.classList.add('open');
}

function claimFromQuestPopup(){
  if(!_popupQuestId){ closeQuestCompleteModal(); return; }
  const id = _popupQuestId;
  claimQuest(id);
  closeQuestCompleteModal();
}

function closeQuestCompleteModal(){
  const m = document.getElementById('quest-complete-modal');
  if(m) m.classList.remove('open');
  _questNotifyOpen = false;
  _popupQuestId = null;
  setTimeout(pumpQuestNotify, 200);
}

function ensureQuestNotified(){
  if(!state.questNotified) state.questNotified = {};
  // clear daily keys from other days
  const day = typeof todayKey==='function' ? todayKey() : '';
  Object.keys(state.questNotified).forEach(k => {
    if(k.startsWith('d_') && state.questNotified[k] !== day && state.questNotified[k] !== true){
      // keep structure simple: values are true or date string for dailies
    }
  });
}

function checkNewlyCompletedQuests(){
  try {
    ensureQuestNotified();
    const defs = todaysDailyQuests();
    const def = defs.find(q => !questClaimed(q));
    if(!def || !questDone(def)) return;
    const key = def.id + '@' + todayKey();
    if(state.questNotified[key]) return;
    state.questNotified[key] = todayKey();
    save();
    showQuestCompletePopup(def);
  } catch(e){ console.warn('quest notify', e); }
}

// Shared stat/quest bookkeeping for a resolved pack's cards, used by both the
// one-by-one Open Packs reveal (finishOpening) and the Mystery Box explode-reveal modal.
function recordPackOpenedStats(cards, setName){
  state.stats.packsOpened = (state.stats.packsOpened||0) + 1;
  if(!state.stats.packsOpenedBySet) state.stats.packsOpenedBySet = {};
  const ps = setName || window._lastPackSet || selectedOpenSet || 'Base Set';
  state.stats.packsOpenedBySet[ps] = (state.stats.packsOpenedBySet[ps]||0) + 1;
  const holos = cards.filter(c=>c.rarity==='legendary').length;
  if(holos) state.stats.holosPulled = (state.stats.holosPulled||0) + holos;
  try{
    const maxV = Math.max(0, ...(cards||[]).map(c => Number(c.price)||0));
    state.stats.bestPullValue = Math.max(Number(state.stats.bestPullValue)||0, maxV);
  }catch(_){}
  // week-scoped stats for the admin-generated Weekly Pull Stats Recap (reset when a recap is sent)
  try{
    state.stats.weekPacksOpened = (state.stats.weekPacksOpened||0) + 1;
    const best = (cards||[]).slice().sort((a,b) => (Number(b.price)||0) - (Number(a.price)||0))[0];
    if(best && (!state.stats.weekBestPull || (Number(best.price)||0) > (Number(state.stats.weekBestPull.price)||0))){
      state.stats.weekBestPull = { name: best.name, price: Number(best.price)||0, art: best.art||null, rarityLabel: best.rarityLabel||best.rarity||'' };
    }
  }catch(_){}
  if(typeof trackDaily === 'function'){
    trackDaily('packsOpened', 1);
    trackDaily('packsBySet_'+ps, 1);
    if(holos) trackDaily('holos', holos);
    const news = cards.filter(c => c.isNew).length;
    if(news) trackDaily('newCards', news);
  }
  // Guess the Pull Count — increment (and maybe end round on Chase)
  if(typeof gpcRecordOpen === 'function'){
    try { gpcRecordOpen(cards.slice()); } catch(e) { console.warn('[gpc]', e); }
  }
}

function finishOpening(){
  opening.active=false;
  hideHoverPreview();
  lastPackCards = opening.cards.slice();
  const openedSet = (opening.cards && opening.cards._packSet) || (opening.packSet) || selectedOpenSet || 'Base Set';
  recordPackOpenedStats(opening.cards, openedSet);
  // Echo Pulls now triggers at reveal time (see fillPreviewCard in cosmetics.js),
  // the instant a holo is actually shown to the player — not here on Done —
  // so the timer can't be delayed by sitting on a revealed card.
  save();
  document.getElementById('reveal-stage').classList.remove('active');
  resetPackVisual();
  document.getElementById('pack-idle').style.display='block';
  updateUI(); renderCollection(); renderSellList(); renderBinder(); renderQuests();
  renderSealedPackPreview();
  if(typeof checkNewlyCompletedQuests === 'function') checkNewlyCompletedQuests();
  if(typeof checkNewlyCompletedAchievements === 'function') checkNewlyCompletedAchievements();
  showToast('Pack complete!');
}


function renderLastPack(){
  const wrap = document.getElementById('last-pack');
  const grid = document.getElementById('last-pack-grid');
  if(!wrap || !grid) return;
  if(!lastPackCards.length){
    wrap.classList.remove('visible');
    grid.innerHTML='';
    return;
  }
  grid.innerHTML='';
  lastPackCards.forEach(card=>{
    const el=document.createElement('div');
    el.className='lp-card'+(card.isNew?' new-pull':'');
    el.style.borderColor=TYPE_COLORS[card.type1]||'#888';
    if(card.art){
      el.innerHTML='<img src="'+card.art+'" alt="'+card.name+'"/>';
    } else {
      el.textContent=card.emoji||'🃏';
      el.style.display='flex';
      el.style.alignItems='center';
      el.style.justifyContent='center';
      el.style.fontSize='1.6rem';
    }
    el.onmouseenter=()=>showHoverPreview(card);
    el.onmouseleave=()=>hideHoverPreview();
    el.onclick=()=>openZoom(card);
    el.title=(card.cardNumber||'')+' '+card.name+(card.isNew?' · NEW':'');
    grid.appendChild(el);
  });
  wrap.classList.add('visible');
}

function dismissLastPack(){
  hideHoverPreview();
  const wrap=document.getElementById('last-pack');
  if(wrap) wrap.classList.remove('visible');
}




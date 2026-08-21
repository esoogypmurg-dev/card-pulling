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



function uniqueOwned(setName){
  return CARDS.filter(c => (!setName || c.set === setName) && (colGet(state.collection, c)) > 0).length;
}
function countByRarity(r, setName){
  return CARDS.filter(c => c.rarity===r && (!setName || c.set === setName) && (colGet(state.collection, c))>0).length;
}
function totalByRarity(r, setName){
  return CARDS.filter(c => c.rarity===r && (!setName || c.set === setName)).length;
}
function totalInSet(setName){
  return CARDS.filter(c => c.set === setName).length;
}

/* Sequential set quest chains — next unlocks after previous is claimed */
const SET_QUEST_CHAINS = {
  'Base Set': [
    { id:'bs_open_3', title:'First Rips', desc:'Open 3 Base Set packs', type:'packsOpened', target:3, rewardPacks:1, rewardMoney:2, set:'Base Set' },
    { id:'bs_open_10', title:'Pack Habit', desc:'Open 10 Base Set packs', type:'packsOpened', target:10, rewardPacks:1, rewardMoney:5, set:'Base Set' },
    { id:'bs_open_25', title:'Booster Addict', desc:'Open 25 Base Set packs', type:'packsOpened', target:25, rewardPacks:2, rewardMoney:10, set:'Base Set' },
    { id:'bs_own_20', title:'Growing Binder', desc:'Own 20 different Base Set cards', type:'uniqueOwned', target:20, rewardPacks:1, rewardMoney:3, set:'Base Set' },
    { id:'bs_own_50', title:'Serious Collector', desc:'Own 50 different Base Set cards', type:'uniqueOwned', target:50, rewardPacks:1, rewardMoney:8, set:'Base Set' },
    { id:'bs_own_80', title:'Almost There', desc:'Own 80 different Base Set cards', type:'uniqueOwned', target:80, rewardPacks:2, rewardMoney:15, set:'Base Set' },
    { id:'bs_holo_3', title:'Holo Hunter', desc:'Pull 3 Rare Holos (any set)', type:'holosPulled', target:3, rewardPacks:1, rewardMoney:5, set:'Base Set' },
    { id:'bs_sell_10', title:'Market Flipper', desc:'Sell 10 duplicate cards', type:'sells', target:10, rewardPacks:1, rewardMoney:4, set:'Base Set' }
  ],
  'Jungle': [
    { id:'ju_open_3', title:'Jungle First Rips', desc:'Open 3 Jungle packs', type:'packsOpened', target:3, rewardPacks:1, rewardMoney:2, set:'Jungle' },
    { id:'ju_open_10', title:'Jungle Habit', desc:'Open 10 Jungle packs', type:'packsOpened', target:10, rewardPacks:1, rewardMoney:5, set:'Jungle' },
    { id:'ju_open_25', title:'Jungle Addict', desc:'Open 25 Jungle packs', type:'packsOpened', target:25, rewardPacks:2, rewardMoney:10, set:'Jungle' },
    { id:'ju_own_15', title:'Jungle Starter', desc:'Own 15 different Jungle cards', type:'uniqueOwned', target:15, rewardPacks:1, rewardMoney:3, set:'Jungle' },
    { id:'ju_own_35', title:'Jungle Collector', desc:'Own 35 different Jungle cards', type:'uniqueOwned', target:35, rewardPacks:1, rewardMoney:8, set:'Jungle' },
    { id:'ju_own_50', title:'Deep Jungle', desc:'Own 50 different Jungle cards', type:'uniqueOwned', target:50, rewardPacks:2, rewardMoney:12, set:'Jungle' },
    { id:'ju_holo_2', title:'Jungle Shine', desc:'Pull 2 Rare Holos (any set)', type:'holosPulled', target:2, rewardPacks:1, rewardMoney:5, set:'Jungle' },
    { id:'ju_sell_5', title:'Jungle Trader', desc:'Sell 5 duplicate cards', type:'sells', target:5, rewardPacks:1, rewardMoney:3, set:'Jungle' }
  ],
  'Fossil': [
    { id:'fo_open_3', title:'Fossil First Rips', desc:'Open 3 Fossil packs', type:'packsOpened', target:3, rewardPacks:1, rewardMoney:2, set:'Fossil' },
    { id:'fo_open_10', title:'Fossil Habit', desc:'Open 10 Fossil packs', type:'packsOpened', target:10, rewardPacks:1, rewardMoney:5, set:'Fossil' },
    { id:'fo_open_25', title:'Fossil Addict', desc:'Open 25 Fossil packs', type:'packsOpened', target:25, rewardPacks:2, rewardMoney:10, set:'Fossil' },
    { id:'fo_own_15', title:'Fossil Starter', desc:'Own 15 different Fossil cards', type:'uniqueOwned', target:15, rewardPacks:1, rewardMoney:3, set:'Fossil' },
    { id:'fo_own_35', title:'Fossil Collector', desc:'Own 35 different Fossil cards', type:'uniqueOwned', target:35, rewardPacks:1, rewardMoney:8, set:'Fossil' },
    { id:'fo_own_50', title:'Deep Fossil', desc:'Own 50 different Fossil cards', type:'uniqueOwned', target:50, rewardPacks:2, rewardMoney:12, set:'Fossil' },
    { id:'fo_holo_2', title:'Fossil Shine', desc:'Pull 2 Rare Holos (any set)', type:'holosPulled', target:2, rewardPacks:1, rewardMoney:5, set:'Fossil' },
    { id:'fo_sell_5', title:'Fossil Trader', desc:'Sell 5 duplicate cards', type:'sells', target:5, rewardPacks:1, rewardMoney:3, set:'Fossil' }
  ],
  'Wizards Black Star Promos': [
    { id:'pr_own_5', title:'Promo Starter', desc:'Own 5 different Promo cards', type:'uniqueOwned', target:5, rewardPacks:1, rewardMoney:5, set:'Wizards Black Star Promos' },
    { id:'pr_own_15', title:'Promo Hunter', desc:'Own 15 different Promo cards', type:'uniqueOwned', target:15, rewardPacks:1, rewardMoney:10, set:'Wizards Black Star Promos' },
    { id:'pr_own_30', title:'Promo Collector', desc:'Own 30 different Promo cards', type:'uniqueOwned', target:30, rewardPacks:2, rewardMoney:20, set:'Wizards Black Star Promos' },
    { id:'pr_own_53', title:'Promo Master', desc:'Own every Black Star Promo', type:'uniqueOwned', target:53, rewardPacks:3, rewardMoney:50, set:'Wizards Black Star Promos' }
  ]
};

const ACHIEVEMENT_DEFS = [
  { id:'a_bs_common', title:'Base Commons', desc:'Own every Common in Base Set', type:'rarityOwned', rarity:'common', set:'Base Set', rewardPacks:1, rewardMoney:5 },
  { id:'a_bs_uncommon', title:'Base Uncommons', desc:'Own every Uncommon in Base Set', type:'rarityOwned', rarity:'uncommon', set:'Base Set', rewardPacks:1, rewardMoney:8 },
  { id:'a_bs_rare', title:'Base Rares', desc:'Own every non-holo Rare in Base Set', type:'rarityOwned', rarity:'epic', set:'Base Set', rewardPacks:2, rewardMoney:12 },
  { id:'a_bs_holo', title:'Base Holo Master', desc:'Own every Rare Holo in Base Set', type:'rarityOwned', rarity:'legendary', set:'Base Set', rewardPacks:3, rewardMoney:25 },
  { id:'a_bs_set', title:'Base Set Master', desc:'Own all 102 Base Set cards', type:'uniqueOwned', target:102, set:'Base Set', rewardPacks:5, rewardMoney:40 },
  { id:'a_ju_set', title:'Jungle Master', desc:'Own all 64 Jungle cards', type:'uniqueOwned', target:64, set:'Jungle', rewardPacks:4, rewardMoney:35 },
  { id:'a_fo_set', title:'Fossil Master', desc:'Own all 62 Fossil cards', type:'uniqueOwned', target:62, set:'Fossil', rewardPacks:4, rewardMoney:35 },
  { id:'a_open_50', title:'Half Century', desc:'Open 50 packs total', type:'packsOpened', target:50, rewardPacks:3, rewardMoney:15 },
  { id:'a_open_100', title:'Century Club', desc:'Open 100 packs total', type:'packsOpened', target:100, rewardPacks:5, rewardMoney:30 }
];

/* Daily rotating quest pool */
const DAILY_QUEST_POOL = [
  { id:'d_open_1', title:'Warm-up Rip', desc:'Open 1 pack today', type:'dayPacks', target:1, rewardPacks:1, rewardMoney:1 },
  { id:'d_open_2', title:'Double Pull', desc:'Open 2 packs today', type:'dayPacks', target:2, rewardPacks:1, rewardMoney:2 },
  { id:'d_open_3', title:'Triple Rip', desc:'Open 3 packs today', type:'dayPacks', target:3, rewardPacks:1, rewardMoney:3 },
  { id:'d_sell_1', title:'Quick Sale', desc:'Sell 1 duplicate today', type:'daySells', target:1, rewardPacks:0, rewardMoney:2 },
  { id:'d_sell_3', title:'Vendor Day', desc:'Sell 3 duplicates today', type:'daySells', target:3, rewardPacks:1, rewardMoney:3 },
  { id:'d_new_1', title:'Something New', desc:'Collect 1 new unique card today', type:'dayNew', target:1, rewardPacks:0, rewardMoney:2 },
  { id:'d_new_3', title:'Fresh Finds', desc:'Collect 3 new unique cards today', type:'dayNew', target:3, rewardPacks:1, rewardMoney:4 },
  { id:'d_money_5', title:'Pocket Change', desc:'Earn $5 from shop sales today', type:'daySaleMoney', target:5, rewardPacks:0, rewardMoney:3 },
  { id:'d_holo_1', title:'Daily Shine', desc:'Pull 1 Rare Holo today', type:'dayHolos', target:1, rewardPacks:1, rewardMoney:5 }
];

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
      claimed: {}
    };
  }
  if(!state.dailyProgress.claimed) state.dailyProgress.claimed = {};
}

let DAILY_GOAL_SETTINGS = { goals: [] };
const DAILY_GOAL_TYPES = {
  dayPacks: { label:'Open packs', icon:'🎴', desc:'Open packs today' },
  daySells: { label:'Sell duplicates', icon:'💰', desc:'Sell duplicates today' },
  dayNew: { label:'Collect new cards', icon:'✨', desc:'Collect new unique cards today' },
  daySaleMoney: { label:'Earn sale money', icon:'💵', desc:'Earn money from sales today' },
  dayHolos: { label:'Pull rare holos', icon:'🌟', desc:'Pull rare holos today' }
};

function normalizeDailyGoal(def){
  if(!def || !DAILY_GOAL_TYPES[def.type]) return null;
  const target = Math.max(1, Math.min(9999, Math.floor(Number(def.target) || 1)));
  return {
    id: String(def.id || ('admin_daily_' + Math.random().toString(36).slice(2,10))),
    title: String(def.title || DAILY_GOAL_TYPES[def.type].label).trim().slice(0,48),
    desc: String(def.desc || DAILY_GOAL_TYPES[def.type].desc).trim().slice(0,110),
    type: def.type,
    target,
    rewardPacks: Math.max(0, Math.min(20, Math.floor(Number(def.rewardPacks) || 0))),
    rewardMoney: Math.max(0, Math.min(9999, Math.round((Number(def.rewardMoney) || 0) * 100) / 100)),
    icon: DAILY_GOAL_TYPES[def.type].icon,
    active: def.active !== false
  };
}

function activeCustomDailyGoals(){
  const goals = Array.isArray(DAILY_GOAL_SETTINGS && DAILY_GOAL_SETTINGS.goals) ? DAILY_GOAL_SETTINGS.goals : [];
  return goals.map(normalizeDailyGoal).filter(Boolean).filter(q => q.active).slice(0,3);
}

async function loadDailyGoalSettings(){
  let raw = currentUser && currentUser.is_admin ? state.dailyGoalSettings : null;
  if(!raw && sb){
    try{
      const { data, error } = await sb.from('profiles').select('stats,updated_at').eq('is_admin', true).order('updated_at',{ascending:false}).limit(1);
      if(!error && data && data[0] && data[0].stats) raw = data[0].stats.dailyGoalSettings || null;
    }catch(e){ console.warn('daily goal settings load', e); }
  }
  if(!raw){
    try{ raw = JSON.parse(localStorage.getItem('pokemonDailyGoalSettings') || 'null'); }catch(e){}
  }
  DAILY_GOAL_SETTINGS = { goals: Array.isArray(raw && raw.goals) ? raw.goals.map(normalizeDailyGoal).filter(Boolean).slice(0,3) : [] };
  if(currentUser && currentUser.is_admin) state.dailyGoalSettings = DAILY_GOAL_SETTINGS;
  if(typeof updateHomeDashboard === 'function') updateHomeDashboard();
  if(typeof renderQuests === 'function') renderQuests();
  if(typeof renderAdminDailyGoals === 'function') renderAdminDailyGoals();
}

function todaysDailyQuests(){
  ensureDailyState();
  const custom = activeCustomDailyGoals();
  if(custom.length) return custom;
  const seed = hashStr(todayKey() + '-daily-v1');
  // pick 3 unique from pool
  const pool = DAILY_QUEST_POOL.slice();
  const picks = [];
  let s = seed;
  while(picks.length < 3 && pool.length){
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const idx = s % pool.length;
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

function adminDailyGoalDraft(){
  return normalizeDailyGoal({
    id:'admin_daily_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    title:'New daily goal', desc:'Open packs today', type:'dayPacks', target:1, rewardPacks:1, rewardMoney:0
  });
}

function renderAdminDailyGoals(){
  const wrap = document.getElementById('admin-daily-goals-list');
  if(!wrap) return;
  const goals = Array.isArray(DAILY_GOAL_SETTINGS.goals) ? DAILY_GOAL_SETTINGS.goals : [];
  if(!goals.length){
    wrap.innerHTML = '<div style="padding:.7rem .8rem;margin-bottom:.8rem;border:1px dashed #3a4256;border-radius:9px;color:var(--muted);font-size:.84rem">Using the built-in rotating daily goals. Add a goal to create your own set.</div>';
    return;
  }
  wrap.innerHTML = goals.map((goal, index) => {
    const q = normalizeDailyGoal(goal) || adminDailyGoalDraft();
    const typeOptions = Object.entries(DAILY_GOAL_TYPES).map(([value, meta]) => '<option value="'+value+'" '+(q.type===value?'selected':'')+'>'+meta.icon+' '+meta.label+'</option>').join('');
    return '<div class="trade-box" data-daily-goal-id="'+escapeHtml(q.id)+'" style="margin:0 0 .7rem;padding:.8rem">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.6rem"><strong style="color:var(--gold)">Daily goal '+(index+1)+'</strong><button type="button" class="btn btn-secondary" style="padding:.28rem .55rem;font-size:.74rem" onclick="adminRemoveDailyGoal(\''+q.id.replace(/'/g,"\\'")+'\')">Remove</button></div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.55rem">'
      + '<label style="font-size:.75rem;color:var(--muted)">Title<input data-dg="title" value="'+escapeHtml(q.title)+'" maxlength="48" style="width:100%;margin-top:.2rem;padding:.42rem .5rem;border-radius:7px;border:1px solid #2a314d;background:#0f1320;color:var(--text)"></label>'
      + '<label style="font-size:.75rem;color:var(--muted)">Activity<select data-dg="type" style="width:100%;margin-top:.2rem;padding:.42rem .5rem;border-radius:7px;border:1px solid #2a314d;background:#0f1320;color:var(--text)">'+typeOptions+'</select></label>'
      + '<label style="font-size:.75rem;color:var(--muted)">Target<input data-dg="target" type="number" min="1" max="9999" value="'+q.target+'" style="width:100%;margin-top:.2rem;padding:.42rem .5rem;border-radius:7px;border:1px solid #2a314d;background:#0f1320;color:var(--text)"></label>'
      + '<label style="font-size:.75rem;color:var(--muted)">Pack reward<input data-dg="rewardPacks" type="number" min="0" max="20" value="'+q.rewardPacks+'" style="width:100%;margin-top:.2rem;padding:.42rem .5rem;border-radius:7px;border:1px solid #2a314d;background:#0f1320;color:var(--text)"></label>'
      + '<label style="font-size:.75rem;color:var(--muted)">Money reward<input data-dg="rewardMoney" type="number" min="0" max="9999" step="0.01" value="'+q.rewardMoney+'" style="width:100%;margin-top:.2rem;padding:.42rem .5rem;border-radius:7px;border:1px solid #2a314d;background:#0f1320;color:var(--text)"></label>'
      + '</div><label style="display:block;font-size:.75rem;color:var(--muted);margin-top:.55rem">Description<input data-dg="desc" value="'+escapeHtml(q.desc)+'" maxlength="110" style="width:100%;margin-top:.2rem;padding:.42rem .5rem;border-radius:7px;border:1px solid #2a314d;background:#0f1320;color:var(--text)"></label>'
      + '</div>';
  }).join('');
}

function adminAddDailyGoal(){
  if(!currentUser || !currentUser.is_admin) return;
  const goals = Array.isArray(DAILY_GOAL_SETTINGS.goals) ? DAILY_GOAL_SETTINGS.goals : [];
  if(goals.length >= 3){ showToast('You can have up to three active daily goals'); return; }
  goals.push(adminDailyGoalDraft());
  DAILY_GOAL_SETTINGS.goals = goals;
  renderAdminDailyGoals();
}

function adminRemoveDailyGoal(id){
  DAILY_GOAL_SETTINGS.goals = (DAILY_GOAL_SETTINGS.goals || []).filter(q => q.id !== id);
  renderAdminDailyGoals();
}

async function adminSaveDailyGoals(){
  if(!currentUser || !currentUser.is_admin){ showToast('Admin only'); return; }
  const cards = Array.from(document.querySelectorAll('#admin-daily-goals-list [data-daily-goal-id]'));
  const goals = cards.map(card => {
    const value = key => { const el = card.querySelector('[data-dg="'+key+'"]'); return el ? el.value : ''; };
    return normalizeDailyGoal({ id:card.dataset.dailyGoalId, title:value('title'), desc:value('desc'), type:value('type'), target:value('target'), rewardPacks:value('rewardPacks'), rewardMoney:value('rewardMoney') });
  }).filter(Boolean).slice(0,3);
  DAILY_GOAL_SETTINGS = { goals };
  state.dailyGoalSettings = DAILY_GOAL_SETTINGS;
  try{ localStorage.setItem('pokemonDailyGoalSettings', JSON.stringify(DAILY_GOAL_SETTINGS)); }catch(e){}
  await save();
  renderAdminDailyGoals();
  updateHomeDashboard();
  renderQuests();
  const msg = document.getElementById('admin-daily-goals-msg');
  if(msg){ msg.textContent = goals.length ? 'Daily goals saved for all trainers.' : 'Rotating default daily goals restored.'; msg.className='lw-msg ok'; }
  showToast('Daily goals saved');
}

async function adminUseDefaultDailyGoals(){
  if(!currentUser || !currentUser.is_admin){ showToast('Admin only'); return; }
  DAILY_GOAL_SETTINGS = { goals: [] };
  state.dailyGoalSettings = DAILY_GOAL_SETTINGS;
  renderAdminDailyGoals();
  await adminSaveDailyGoals();
}

function trackDaily(field, amount){
  ensureDailyState();
  state.dailyProgress[field] = (state.dailyProgress[field]||0) + amount;
}

function questProgress(def){
  if(def.type==='packsOpened'){
    if(def.set && state.stats && state.stats.packsOpenedBySet){
      return state.stats.packsOpenedBySet[def.set] || 0;
    }
    return state.stats.packsOpened||0;
  }
  if(def.type==='sells') return state.stats.sells||0;
  if(def.type==='holosPulled') return state.stats.holosPulled||0;
  if(def.type==='uniqueOwned') return uniqueOwned(def.set||null);
  if(def.type==='rarityOwned') return countByRarity(def.rarity, def.set||null);
  if(def.type==='dayPacks'){ ensureDailyState(); return state.dailyProgress.packsOpened||0; }
  if(def.type==='daySells'){ ensureDailyState(); return state.dailyProgress.sells||0; }
  if(def.type==='dayNew'){ ensureDailyState(); return state.dailyProgress.newCards||0; }
  if(def.type==='daySaleMoney'){ ensureDailyState(); return Math.floor(state.dailyProgress.saleMoney||0); }
  if(def.type==='dayHolos'){ ensureDailyState(); return state.dailyProgress.holos||0; }
  return 0;
}
function questTarget(def){
  if(def.type==='rarityOwned') return totalByRarity(def.rarity, def.set||null);
  if(def.type==='uniqueOwned' && def.set && !def.target) return totalInSet(def.set);
  return def.target||1;
}
function questDone(def){
  return questProgress(def) >= questTarget(def);
}
function questClaimed(def){
  if(def._daily){
    ensureDailyState();
    return !!state.dailyProgress.claimed[def.id];
  }
  return !!(state.claimed && state.claimed[def.id]);
}

function isQuestUnlocked(def, chain){
  if(!chain) return true;
  const idx = chain.findIndex(q => q.id === def.id);
  if(idx <= 0) return true;
  const prev = chain[idx-1];
  return questClaimed(prev);
}

function grantQuestReward(def){
  const packs = def.rewardPacks || def.reward || 0;
  const money = def.rewardMoney || 0;
  const setName = def.set || selectedOpenSet || 'Base Set';
  if(packs > 0){
    ensurePackQueue();
    for(let i=0;i<packs;i++) state.packQueue.push(setName === 'Wizards Black Star Promos' ? 'Base Set' : setName);
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
  // Daily?
  const daily = todaysDailyQuests().find(q => q.id === id);
  if(daily){
    daily._daily = true;
    if(questClaimed(daily)){ showToast('Already claimed'); return; }
    if(!questDone(daily)){ showToast('Not complete yet'); return; }
    ensureDailyState();
    state.dailyProgress.claimed[id] = true;
    const msg = grantQuestReward(daily);
    save(); updateUI(); renderQuests();
    showToast(msg);
    return;
  }
  const all = [...Object.values(SET_QUEST_CHAINS).flat(), ...ACHIEVEMENT_DEFS];
  const def = all.find(q => q.id === id);
  if(!def) return;
  if(questClaimed(def)){ showToast('Already claimed'); return; }
  if(!questDone(def)){ showToast('Not complete yet'); return; }
  // check unlock for set chains
  for(const chain of Object.values(SET_QUEST_CHAINS)){
    if(chain.some(q => q.id === id) && !isQuestUnlocked(def, chain)){
      showToast('Complete the previous quest first');
      return;
    }
  }
  if(!state.claimed) state.claimed = {};
  state.claimed[id] = true;
  const msg = grantQuestReward(def);
  save(); updateUI(); renderQuests();
  showToast(msg);
}

function rewardText(def){
  const packs = def.rewardPacks || def.reward || 0;
  const money = def.rewardMoney || 0;
  const parts = [];
  if(packs) parts.push('+'+packs+' pack'+(packs>1?'s':''));
  if(money) parts.push('+$'+money);
  return parts.join(' · ') || '—';
}

function renderQuestCard(def, opts){
  opts = opts || {};
  const locked = !!opts.locked;
  const prog = questProgress(def);
  const target = questTarget(def);
  const done = !locked && questDone(def);
  const claimed = questClaimed(def);
  const pct = Math.min(100, Math.round((prog/Math.max(1,target))*100));
  let cls = 'quest-card';
  if(locked) cls += ' locked';
  if(claimed) cls += ' claimed';
  else if(done) cls += ' claimable';
  let btn;
  if(locked) btn = '<button class="btn btn-secondary" disabled style="padding:.4rem .75rem;font-size:.8rem">Locked</button>';
  else if(claimed) btn = '<button class="btn btn-secondary" disabled style="padding:.4rem .75rem;font-size:.8rem">Claimed</button>';
  else if(done) btn = '<button class="btn" style="padding:.4rem .75rem;font-size:.8rem" onclick="claimQuest(\''+def.id+'\')">Claim</button>';
  else btn = '<button class="btn btn-secondary" disabled style="padding:.4rem .75rem;font-size:.8rem">In progress</button>';
  return `<div class="${cls}">
    <div class="quest-info">
      <h4>${locked ? '???' : def.title}</h4>
      <p>${locked ? 'Complete the previous quest to unlock' : def.desc}</p>
      ${locked ? '' : `<div class="quest-progress"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
      <div class="quest-meta">${Math.min(prog,target)} / ${target}</div>`}
    </div>
    <div class="quest-reward">
      <div class="rew">${locked ? '???' : rewardText(def)}</div>
      ${btn}
    </div>
  </div>`;
}

let openQuestAccordions = { 'Base Set': true };

function toggleQuestAccordion(setName){
  openQuestAccordions[setName] = !openQuestAccordions[setName];
  renderQuests();
}

function renderQuests(){
  ensureDailyState();
  // Daily
  const dEl = document.getElementById('daily-quest-list');
  if(dEl){
    const dailies = todaysDailyQuests().map(q => { q._daily = true; return q; });
    dEl.innerHTML = dailies.map(q => renderQuestCard(q)).join('') || '<div class="empty-state">No daily goals</div>';
  }
  // Set chains as accordions
  const wrap = document.getElementById('set-quest-accordions');
  if(wrap){
    wrap.innerHTML = Object.keys(SET_QUEST_CHAINS).map(setName => {
      const chain = SET_QUEST_CHAINS[setName];
      const claimedCount = chain.filter(q => questClaimed(q)).length;
      const isOpen = openQuestAccordions[setName] !== false && (openQuestAccordions[setName] || setName === 'Base Set');
      if(openQuestAccordions[setName] === undefined && setName === 'Base Set') openQuestAccordions[setName] = true;
      const open = !!openQuestAccordions[setName];
      const cards = chain.map(q => {
        const unlocked = isQuestUnlocked(q, chain);
        // Only show unlocked + the next locked one
        const idx = chain.findIndex(x => x.id === q.id);
        const prevClaimed = idx === 0 || questClaimed(chain[idx-1]);
        const show = prevClaimed || questClaimed(q);
        // sequential: show claimed ones, the current unlocked, and one locked teaser
        let visible = false;
        if(questClaimed(q)) visible = true;
        else if(unlocked) visible = true;
        else if(idx > 0 && questClaimed(chain[idx-1]) === false && isQuestUnlocked(chain[idx-1], chain)){
          // previous is current - show this as locked teaser only if previous is unlocked but not claimed? 
          visible = false;
        } else if(idx > 0 && !questClaimed(chain[idx-1]) && isQuestUnlocked(chain[idx-1], chain)){
          visible = false;
        }
        return { q, unlocked, idx };
      });
      // Only the current active quest (saves space). Claimed ones stay hidden behind progress count.
      let body = '';
      if(claimedCount === chain.length){
        body = '<div style="color:var(--muted);font-size:.85rem;padding:.35rem 0">All quests in this set claimed ✓</div>';
      } else {
        for(let i=0;i<chain.length;i++){
          const q = chain[i];
          if(questClaimed(q)) continue;
          if(isQuestUnlocked(q, chain)){
            body = renderQuestCard(q);
            break;
          }
        }
        if(!body) body = '<div style="color:var(--muted);font-size:.85rem">No active quest</div>';
      }
      return `<div class="quest-accordion ${open?'open':''}">
        <button type="button" class="quest-acc-head" onclick="toggleQuestAccordion('${setName.replace(/'/g,"\\'")}')">
          <span>
            <div class="acc-title">${setName}</div>
            <div class="acc-meta">${claimedCount} / ${chain.length} claimed</div>
          </span>
          <span class="acc-chev">▼</span>
        </button>
        <div class="quest-acc-body">${body}</div>
      </div>`;
    }).join('');
  }
  // Achievements
  const aEl = document.getElementById('achievement-list');
  if(aEl) aEl.innerHTML = ACHIEVEMENT_DEFS.map(q => renderQuestCard(q)).join('');
  if(typeof updateQuestBadge === 'function') updateQuestBadge();
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


function allQuestDefs(){
  const dailies = (typeof todaysDailyQuests==='function' ? todaysDailyQuests() : []).map(q => { q._daily = true; return q; });
  const setQs = typeof SET_QUEST_CHAINS !== 'undefined'
    ? Object.entries(SET_QUEST_CHAINS).flatMap(([set, chain]) => chain.map(q => ({...q, _chain: chain})))
    : [];
  const ach = typeof ACHIEVEMENT_DEFS !== 'undefined' ? ACHIEVEMENT_DEFS.slice() : [];
  return [...dailies, ...setQs, ...ach];
}

function isQuestVisibleClaimable(def){
  if(questClaimed(def)) return false;
  if(!questDone(def)) return false;
  if(def._chain && !isQuestUnlocked(def, def._chain)) return false;
  return true;
}

function countClaimableQuests(){
  try {
    return allQuestDefs().filter(isQuestVisibleClaimable).length;
  } catch(e){ return 0; }
}

function updateQuestBadge(){
  const badge = document.getElementById('quest-nav-badge');
  if(!badge) return;
  const n = countClaimableQuests();
  if(n > 0){
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.classList.add('show', 'pulse');
    badge.title = n + ' reward' + (n>1?'s':'') + ' ready to claim';
  } else {
    badge.classList.remove('show', 'pulse');
    badge.textContent = '★';
    badge.title = '';
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
  if(title) title.textContent = (def._daily ? 'Daily Goal Complete!' : 'Quest Complete!');
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
    const newly = [];
    allQuestDefs().forEach(def => {
      if(!isQuestVisibleClaimable(def)) return;
      const key = def._daily ? (def.id + '@' + todayKey()) : def.id;
      if(state.questNotified[key]) return;
      state.questNotified[key] = def._daily ? todayKey() : true;
      newly.push(def);
    });
    if(newly.length){
      save();
      newly.forEach(showQuestCompletePopup);
    }
    updateQuestBadge();
  } catch(e){ console.warn('quest notify', e); }
}

function finishOpening(){
  opening.active=false;
  hideHoverPreview();
  lastPackCards = opening.cards.slice();
  state.stats.packsOpened = (state.stats.packsOpened||0) + 1;
  if(!state.stats.packsOpenedBySet) state.stats.packsOpenedBySet = {};
  const openedSet = (opening.cards && opening.cards._packSet) || (opening.packSet) || selectedOpenSet || 'Base Set';
  // pack set from last buildPack
  const ps = window._lastPackSet || selectedOpenSet || 'Base Set';
  state.stats.packsOpenedBySet[ps] = (state.stats.packsOpenedBySet[ps]||0) + 1;
  const holos = opening.cards.filter(c=>c.rarity==='legendary').length;
  if(holos) state.stats.holosPulled = (state.stats.holosPulled||0) + holos;
  // Echo Pulls now triggers at reveal time (see fillPreviewCard in cosmetics.js),
  // the instant a holo is actually shown to the player — not here on Done —
  // so the timer can't be delayed by sitting on a revealed card.
  // best single-card pull value
  try{
    const maxV = Math.max(0, ...(opening.cards||[]).map(c => Number(c.price)||0));
    state.stats.bestPullValue = Math.max(Number(state.stats.bestPullValue)||0, maxV);
  }catch(_){}
  // week-scoped stats for the admin-generated Weekly Pull Stats Recap (reset when a recap is sent)
  try{
    state.stats.weekPacksOpened = (state.stats.weekPacksOpened||0) + 1;
    const best = (opening.cards||[]).slice().sort((a,b) => (Number(b.price)||0) - (Number(a.price)||0))[0];
    if(best && (!state.stats.weekBestPull || (Number(best.price)||0) > (Number(state.stats.weekBestPull.price)||0))){
      state.stats.weekBestPull = { name: best.name, price: Number(best.price)||0, art: best.art||null, rarityLabel: best.rarityLabel||best.rarity||'' };
    }
  }catch(_){}
  if(typeof trackDaily === 'function'){
    trackDaily('packsOpened', 1);
    if(holos) trackDaily('holos', holos);
    // new cards in this pack
    const news = opening.cards.filter(c => c.isNew).length;
    if(news) trackDaily('newCards', news);
  }
  // Guess the Pull Count — increment (and maybe end round on Chase)
  if(typeof gpcRecordOpen === 'function'){
    try { gpcRecordOpen(opening.cards.slice()); } catch(e) { console.warn('[gpc]', e); }
  }
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




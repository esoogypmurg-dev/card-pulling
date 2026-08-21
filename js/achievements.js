/* ===== Achievements (admin-defined catalog) ===== */
const ACH_STORAGE_KEY = 'pokemonAchievementCatalog';
const ACH_CATS = ['All','Getting Started','Volume Grind','Rarity & Luck','Set Completion','Streaks & Timing','Collection','Packs','Trading','Events','Heroic Feats','Hidden'];
const ACH_CAT_ICONS = {
  All:'▦', 'Getting Started':'🌱', 'Volume Grind':'📦', 'Rarity & Luck':'✨', 'Set Completion':'📘',
  'Streaks & Timing':'🔥', Collection:'📚', Packs:'📦', Trading:'↔',
  Events:'🏆', 'Heroic Feats':'👑', Hidden:'◈'
};
let achievementCatalog = [];
let achActiveCat = 'All';
let achActiveSet = '';
let achSelectedId = null;

/* Custom icon art — sliced by hand from art/achievement icons.png into art/achievement_icons/.
   Filenames carry no category info, so they're picked freely per-achievement via the admin
   icon picker rather than auto-assigned. */
const ACH_ICON_FILES = Array.from({length:159}, (_,i) => 'art/achievement_icons/achievments ('+(i+1)+').webp');

function achIconIsImage(icon){
  return typeof icon === 'string' && icon.indexOf('art/achievement_icons/') === 0;
}
function achIconHtml(icon){
  const val = (icon || '').trim() || '🏅';
  if(achIconIsImage(val)) return '<img class="ach-icon-img" src="'+encodeURI(val)+'" alt="" loading="lazy"/>';
  return String(val).replace(/</g,'&lt;');
}
// Custom icon art already has its own framing baked in — drop the emoji-era badge
// background/border for those so the icon blends into the panel instead of double-framing.
function achIconBadgeClass(icon){
  return achIconIsImage(icon) ? ' has-img' : '';
}
function achIconPreviewUpdate(){
  const val = ((document.getElementById('ach-admin-icon')||{}).value||'').trim() || '🏅';
  const prev = document.getElementById('ach-admin-icon-preview');
  if(prev) prev.innerHTML = achIconHtml(val);
}
function achOpenIconPicker(){
  const modal = document.getElementById('ach-icon-picker-modal');
  const grid = document.getElementById('ach-icon-picker-grid');
  if(!modal || !grid) return;
  if(!grid.childElementCount){
    grid.innerHTML = ACH_ICON_FILES.map(src =>
      '<button type="button" class="ach-icon-pick" data-src="'+src.replace(/"/g,'&quot;')+'"><img src="'+encodeURI(src)+'" alt="" loading="lazy"/></button>'
    ).join('');
    grid.querySelectorAll('.ach-icon-pick').forEach(btn => {
      btn.onclick = () => achPickIcon(btn.getAttribute('data-src'));
    });
  }
  modal.classList.add('open');
}
function achCloseIconPicker(){
  const modal = document.getElementById('ach-icon-picker-modal');
  if(modal) modal.classList.remove('open');
}
function achPickIcon(src){
  const input = document.getElementById('ach-admin-icon');
  if(input) input.value = src;
  achIconPreviewUpdate();
  achCloseIconPicker();
}
function achClearIconToEmoji(){
  const input = document.getElementById('ach-admin-icon');
  if(input) input.value = '🏅';
  achIconPreviewUpdate();
  achCloseIconPicker();
}

function achLoadCatalog(){
  try{
    const raw = localStorage.getItem(ACH_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    achievementCatalog = Array.isArray(list) ? list : [];
  }catch(e){ achievementCatalog = []; }
}
function achSaveCatalog(){
  try{ localStorage.setItem(ACH_STORAGE_KEY, JSON.stringify(achievementCatalog)); }catch(e){}
  if(sb && currentUser && currentUser.is_admin){
    sb.from('shop_settings').upsert({
      id: 1,
      achievement_catalog: achievementCatalog,
      updated_at: new Date().toISOString()
    }).then(function(res){ if(res.error) console.warn('ach cloud save', res.error); })
      .catch(function(e){ console.warn('ach cloud save', e); });
  }
}
async function achLoadCatalogFromCloud(){
  if(!sb) return;
  try{
    const { data, error } = await sb.from('shop_settings').select('achievement_catalog').eq('id', 1).maybeSingle();
    if(error) throw error;
    if(data && Array.isArray(data.achievement_catalog) && data.achievement_catalog.length){
      achievementCatalog = data.achievement_catalog;
      try{ localStorage.setItem(ACH_STORAGE_KEY, JSON.stringify(achievementCatalog)); }catch(_){}
      if(typeof renderAchievements === 'function') renderAchievements();
    }
  }catch(e){ console.warn('ach cloud load', e); }
}
function achUid(){ return 'ach_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function achEnsureClaims(){
  if(!state.achievementClaims || typeof state.achievementClaims !== 'object') state.achievementClaims = {};
  return state.achievementClaims;
}
function achCardsOwned(setName){
  if(typeof CARDS === 'undefined' || !state.collection) return 0;
  return CARDS.filter(c => (!setName || c.set === setName) && (typeof colGet === 'function' ? colGet(state.collection, c) : 0) > 0).length;
}
function countCompletedSets(){
  if(typeof SETS === 'undefined' || !SETS.length || typeof CARDS === 'undefined') return 0;
  let n = 0;
  SETS.forEach(s => {
    const setCards = CARDS.filter(c => c.set === s.name);
    if(!setCards.length) return;
    const owned = setCards.filter(c => (typeof colGet === 'function' ? colGet(state.collection, c) : 0) > 0).length;
    if(owned >= setCards.length) n++;
  });
  return n;
}
function achProgressValue(a){
  if(!a) return 0;
  const st = state.stats || {};
  if(a.goalType === 'packs_opened'){
    if(a.setFilter){
      const by = st.packsOpenedBySet || {};
      return Number(by[a.setFilter]) || 0;
    }
    return Number(st.packsOpened) || 0;
  }
  if(a.goalType === 'cards_owned') return achCardsOwned(a.setFilter || null);
  if(a.goalType === 'rarity_owned'){
    if(typeof CARDS === 'undefined' || !state.collection) return 0;
    return CARDS.filter(c =>
      (a.rarityLabelFilter ? c.rarityLabel === a.rarityLabelFilter : c.rarity === a.rarityFilter) &&
      (!a.setFilter || c.set === a.setFilter) &&
      (typeof colGet === 'function' ? colGet(state.collection, c) : 0) > 0
    ).length;
  }
  if(a.goalType === 'holos_pulled') return Number(st.holosPulled) || 0;
  if(a.goalType === 'trades_completed') return Number(st.tradesCompleted) || 0;
  if(a.goalType === 'collection_value'){
    if(typeof collectionTotalValue === 'function') return Number(collectionTotalValue()) || 0;
    // fallback: sum owned card prices
    if(typeof CARDS === 'undefined' || !state.collection) return 0;
    let v = 0;
    CARDS.forEach(c => {
      const n = typeof colGet === 'function' ? colGet(state.collection, c) : 0;
      if(n > 0) v += (Number(c.price)||0) * n;
    });
    return v;
  }
  if(a.goalType === 'best_pull_value') return Number(st.bestPullValue) || 0;
  if(a.goalType === 'sets_completed'){
    if(typeof countCompletedSets === 'function') return countCompletedSets();
    return Number(st.setsCompleted) || 0;
  }
  if(a.goalType === 'manual'){
    const c = achEnsureClaims()[a.id];
    return (c && c.granted) ? (Number(a.target) || 1) : 0;
  }
  return 0;
}
function achIsVisible(a){
  if(!a) return false;
  if(!a.hiddenUntil) return true;
  // Show if prerequisite is claimed or complete
  const pre = achievementCatalog.find(x => x.id === a.hiddenUntil);
  if(!pre) return true;
  return achIsClaimed(pre.id) || achIsComplete(pre);
}
function achSeriesDone(x){
  return achIsClaimed(x.id) || achIsComplete(x);
}
function achFormatClaimedAt(id){
  const c = achEnsureClaims()[id];
  if(!c || !c.claimedAt) return '';
  try{
    const d = new Date(c.claimedAt);
    if(isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      year:'numeric', month:'short', day:'numeric',
      hour:'numeric', minute:'2-digit'
    });
  }catch(_){ return ''; }
}
function achSeriesDots(a){
  if(!a || !a.series) return '';
  const chain = achievementCatalog.filter(x => x.series === a.series).sort((x,y)=>(Number(x.tier)||0)-(Number(y.tier)||0));
  if(chain.length < 2) return '';
  const idx = chain.findIndex(x => x.id === a.id);
  return '<div class="ach-series-dots" title="Click a green dot to view a past tier">'+
    chain.map((x,i) => {
      const done = achSeriesDone(x);
      const cls = (i===idx?' current':'') + (done?' done on':'') + (!done && i<idx?' on':'');
      const tip = (x.name||'') + (done ? ' — click to view' : (i===idx?' (current)':' (locked)'));
      if(done){
        return '<button type="button" class="ach-dot'+cls+'" data-ach-id="'+x.id+'" title="'+String(tip).replace(/"/g,'&quot;')+'"></button>';
      }
      return '<span class="ach-dot'+cls+'" title="'+String(tip).replace(/"/g,'&quot;')+'"></span>';
    }).join('')+
    '</div>';
}
function achIsClaimed(id){
  const c = achEnsureClaims()[id];
  return !!(c && c.claimed);
}
function achIsComplete(a){
  const target = Math.max(1, Number(a.target) || 1);
  return achProgressValue(a) >= target;
}
function achRatio(a){
  const target = Math.max(1, Number(a.target) || 1);
  return Math.min(100, Math.round(achProgressValue(a) / target * 100));
}

function renderAchievements(){
  achLoadCatalog();
  achEnsureClaims();
  const list = achievementCatalog.slice();
  const done = list.filter(a => achIsClaimed(a.id) || achIsComplete(a)).length;
  const claimedPts = list.filter(a => achIsClaimed(a.id)).reduce((s,a) => s + (Number(a.pts)||0), 0);
  const inProg = list.filter(a => !achIsClaimed(a.id) && achProgressValue(a) > 0 && !achIsComplete(a)).length;
  const pct = list.length ? Math.round(done / list.length * 100) : 0;

  const set = (id, t) => { const el = document.getElementById(id); if(el) el.innerHTML = t; };
  set('ach-overall-count', done + ' <span>/ ' + list.length + '</span>');
  const meter = document.getElementById('ach-overall-meter');
  if(meter) meter.style.width = pct + '%';
  set('ach-overall-pct', pct + '% completed');
  set('ach-sum-pts', String(claimedPts));
  set('ach-sum-done', String(list.filter(a => achIsClaimed(a.id)).length));
  set('ach-sum-prog', String(inProg));

  // categories
  const catsEl = document.getElementById('ach-categories');
  if(catsEl){
    catsEl.innerHTML = ACH_CATS.map(c =>
      '<button type="button" class="ach-cat-btn'+(c===achActiveCat?' active':'')+'" data-cat="'+c+'">'+
      '<span>'+(ACH_CAT_ICONS[c]||'•')+'</span>'+c+'</button>'
    ).join('');
    catsEl.querySelectorAll('.ach-cat-btn').forEach(b => {
      b.onclick = () => { achActiveCat = b.getAttribute('data-cat'); renderAchievements(); };
    });
  }

  // set filter dropdown (only shows sets that actually have achievements)
  const setSelEl = document.getElementById('ach-set-filter');
  if(setSelEl){
    const setsWithAch = Array.from(new Set(list.map(a => a.setFilter).filter(Boolean))).sort();
    const prev = achActiveSet;
    setSelEl.innerHTML = '<option value="">All sets</option>' + setsWithAch.map(s =>
      '<option value="'+String(s).replace(/"/g,'&quot;')+'">'+s+'</option>'
    ).join('');
    if(prev && setsWithAch.includes(prev)) setSelEl.value = prev; else achActiveSet = '';
  }

  let items = list.filter(a => (achActiveCat === 'All' || a.category === achActiveCat) && (!achActiveSet || a.setFilter === achActiveSet) && achIsVisible(a));
  // Series: only show the current active tier (hide earlier completed ones)
  items = items.filter(a => {
    if(!a.series) return true;
    const chain = list.filter(x => x.series === a.series).sort((x,y)=>(Number(x.tier)||0)-(Number(y.tier)||0));
    const next = chain.find(x => !achSeriesDone(x));
    if(next) return next.id === a.id;
    // whole series done — keep the last tier visible
    return chain.length > 0 && chain[chain.length - 1].id === a.id;
  });
  const listEl = document.getElementById('ach-list');
  const emptyHint = document.getElementById('ach-list-empty');
  if(emptyHint) emptyHint.textContent = list.length ? '' : 'No achievements yet — admin can add some.';
  if(listEl){
    if(!items.length){
      listEl.innerHTML = '<p style="color:var(--muted);font-size:.88rem;padding:.75rem">Nothing in this category.</p>';
    } else {
      if(!achSelectedId || !list.find(a => a.id === achSelectedId)){
        achSelectedId = items[0].id;
      }
      listEl.innerHTML = items.map(a => {
        const claimed = achIsClaimed(a.id);
        const complete = achIsComplete(a);
        const locked = a.goalType === 'manual' && !complete && !claimed;
        const cls = (a.id===achSelectedId?' selected':'') + ((claimed||complete)?' done':'') + (locked?' locked':'');
        const right = (claimed || complete)
          ? '<div style="color:#ffe17b;font-size:1.4rem">✓</div>'
          : '<div class="ach-score">'+(Number(a.pts)||0)+'<small>PTS</small></div>';
        return '<article class="ach-item'+cls+'" data-id="'+a.id+'" role="button" tabindex="0">'+
          '<div class="ach-badge'+(locked?'':achIconBadgeClass(a.icon))+'">'+(locked?'🔒':achIconHtml(a.icon))+'</div>'+
          '<div><h3>'+String(a.name||'').replace(/</g,'&lt;')+'</h3>'+
          '<p>'+String(a.desc||'').replace(/</g,'&lt;')+'</p>'+
          '<div class="ach-meter"><i style="width:'+achRatio(a)+'%"></i></div></div>'+
          right+'</article>';
      }).join('');
      listEl.querySelectorAll('.ach-item').forEach(el => {
        el.addEventListener('click', function(e){
          e.preventDefault();
          const id = this.getAttribute('data-id');
          if(!id) return;
          achSelectedId = id;
          // Update selected styles without full re-filter issues
          listEl.querySelectorAll('.ach-item').forEach(n => n.classList.toggle('selected', n.getAttribute('data-id')===id));
          renderAchDetail();
        });
      });
    }
  }
  renderAchDetail();
  renderAchRecent();
}

function achSetFilterChange(setName){
  achActiveSet = setName || '';
  renderAchievements();
}

function renderAchDetail(){
  const panel = document.getElementById('ach-detail');
  if(!panel) return;
  const a = achievementCatalog.find(x => x.id === achSelectedId);
  if(!a){
    panel.innerHTML = '<div class="ach-detail-empty">'+(achievementCatalog.length?'Select an achievement':'Catalog is empty — create achievements in Admin')+'</div>';
    return;
  }
  const claimed = achIsClaimed(a.id);
  const complete = achIsComplete(a);
  const now = achProgressValue(a);
  const target = Math.max(1, Number(a.target)||1);
  const rewards = [];
  if(Number(a.pts)) rewards.push(['✦', a.pts, 'Points']);
  if(Number(a.rewardMoney)) rewards.push(['💰', '$'+Number(a.rewardMoney).toFixed(2), 'Cash']);
  if(Number(a.rewardPacks)) rewards.push(['📦', a.rewardPacks, 'Packs']);
  if(a.rewardCard){
    const rc = typeof resolveCard === 'function' ? resolveCard(a.rewardCard) : null;
    rewards.push(['🃏', rc ? rc.name : a.rewardCard, 'Card']);
  }
  if(!rewards.length) rewards.push(['✦', '—', 'Bragging rights']);

  let btnLabel = 'In progress';
  let canClaim = false;
  if(claimed){ btnLabel = 'Completed'; }
  else if(complete){ btnLabel = 'Claim reward'; canClaim = true; }
  else if(a.goalType === 'manual'){ btnLabel = 'Admin grant only'; }

  const when = achFormatClaimedAt(a.id);
  const stampHtml = claimed && when
    ? '<div class="ach-claimed-at">Completed · '+when+'</div>'
    : (complete && !claimed ? '<div class="ach-claimed-at">Goal reached — claim your reward</div>' : '');

  panel.innerHTML =
    '<div class="ach-eyebrow">'+(a.category||'General')+' Achievement</div>'+
    '<h2>'+String(a.name||'').replace(/</g,'&lt;')+'</h2>'+
    '<div class="ach-hero-badge'+achIconBadgeClass(a.icon)+'">'+achIconHtml(a.icon)+'</div>'+
    '<p>'+String(a.desc||'').replace(/</g,'&lt;')+'</p>'+
    stampHtml+
    '<div class="ach-rule"></div>'+
    '<div class="ach-reward-title">Progress</div>'+
    '<div class="ach-meter" style="margin:.5rem auto;max-width:220px"><i style="width:'+achRatio(a)+'%"></i></div>'+
    '<b style="color:#f6d373">'+now+' / '+target+'</b>'+
    achSeriesDots(a)+
    '<div class="ach-rule"></div>'+
    '<div class="ach-reward-title">Reward</div>'+
    '<div class="ach-rewards">'+rewards.map(r =>
      '<div class="ach-reward"><span style="font-size:1.2rem">'+r[0]+'</span><b>'+r[1]+'</b>'+r[2]+'</div>'
    ).join('')+'</div>'+
    '<button type="button" class="ach-claim-btn" id="ach-claim-btn" '+(canClaim?'':'disabled')+'>'+btnLabel+'</button>';
  const btn = document.getElementById('ach-claim-btn');
  if(btn && canClaim) btn.onclick = () => achClaim(a.id);
  // Green dots open past tiers in this series
  panel.querySelectorAll('.ach-dot[data-ach-id]').forEach(dot => {
    dot.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = dot.getAttribute('data-ach-id');
      if(id){ achSelectedId = id; renderAchDetail(); }
    };
  });
}

function renderAchRecent(){
  const row = document.getElementById('ach-recent');
  if(!row) return;
  const claims = achEnsureClaims();
  const recent = achievementCatalog
    .filter(a => claims[a.id] && claims[a.id].claimed)
    .sort((a,b) => (claims[b.id].claimedAt||0) - (claims[a.id].claimedAt||0))
    .slice(0, 10);
  if(!recent.length){
    row.innerHTML = '<span style="color:var(--muted);font-size:.85rem">No unlocks yet — claim completed achievements to see them here.</span>';
    return;
  }
  row.innerHTML = recent.map(a => {
    const t = claims[a.id].claimedAt;
    let when = '';
    if(t){
      try{
        when = typeof gpcRelativeTime === 'function'
          ? gpcRelativeTime(new Date(t).toISOString())
          : achFormatClaimedAt(a.id);
      }catch(_){ when = achFormatClaimedAt(a.id); }
    }
    return '<button type="button" class="ach-recent-item" data-ach-id="'+a.id+'" title="View '+String(a.name||'').replace(/"/g,'&quot;')+'">'+
      '<div class="mini'+achIconBadgeClass(a.icon)+'">'+achIconHtml(a.icon)+'</div>'+
      String(a.name||'').replace(/</g,'&lt;')+'<br><span style="color:#827c76">'+(when||'Completed')+'</span></button>';
  }).join('');
  row.querySelectorAll('.ach-recent-item[data-ach-id]').forEach(el => {
    el.onclick = () => {
      achSelectedId = el.getAttribute('data-ach-id');
      renderAchDetail();
      // soft highlight if still in grid
      const listEl = document.getElementById('ach-list');
      if(listEl){
        listEl.querySelectorAll('.ach-item').forEach(n =>
          n.classList.toggle('selected', n.getAttribute('data-id')===achSelectedId)
        );
      }
    };
  });
}

function achClaim(id){
  const a = achievementCatalog.find(x => x.id === id);
  if(!a || achIsClaimed(id) || !achIsComplete(a)) return;
  const claims = achEnsureClaims();
  const nowTs = Date.now();
  claims[id] = { claimed: true, claimedAt: nowTs, granted: true };
  // Backfill timestamps on earlier series tiers that were already complete but never claimed
  if(a.series){
    achievementCatalog.filter(x => x.series === a.series && (Number(x.tier)||0) < (Number(a.tier)||0)).forEach(prev => {
      if((achIsComplete(prev) || achIsClaimed(prev.id)) && !(claims[prev.id] && claims[prev.id].claimedAt)){
        claims[prev.id] = Object.assign({}, claims[prev.id], {
          claimed: true,
          claimedAt: (claims[prev.id] && claims[prev.id].claimedAt) || nowTs,
          granted: true,
          backfill: true
        });
      }
    });
  }
  state.achievementClaims = claims;
  const money = Number(a.rewardMoney) || 0;
  const packs = Number(a.rewardPacks) || 0;
  if(money > 0) state.money = Math.round((state.money + money) * 100) / 100;
  if(packs > 0){
    if(typeof ensurePackQueue === 'function') ensurePackQueue();
    let setName = a.setFilter || (typeof selectedOpenSet !== 'undefined' && selectedOpenSet) || 'Base Set';
    if(setName === 'Wizards Black Star Promos') setName = 'Base Set';
    for(let i=0;i<packs;i++) state.packQueue.push(setName);
    state.packs = state.packQueue.length;
  }
  let cardNote = '';
  if(a.rewardCard){
    const card = typeof resolveCard === 'function' ? resolveCard(a.rewardCard) : null;
    if(card){
      const key = typeof toCardKey === 'function' ? toCardKey(card) : card.id;
      const have = typeof colGet === 'function' ? colGet(state.collection, card) : 0;
      if(typeof colSet === 'function') colSet(state.collection, card, have + 1);
      else {
        if(!state.collection) state.collection = {};
        state.collection[key] = (Number(state.collection[key])||0) + 1;
      }
      cardNote = ' +' + (card.name || a.rewardCard);
    } else {
      cardNote = ' (card reward missing: ' + a.rewardCard + ')';
    }
  }
  if(typeof save === 'function') save();
  if(typeof updateUI === 'function') updateUI();
  showToast('Achievement unlocked: ' + (a.name||'') + (money?(' +$'+money):'') + (packs?(' +'+packs+' packs'):'') + cardNote);
  renderAchievements();
}

/* Admin CRUD */
let achEditingId = null;
function achAdminClearForm(){
  achEditingId = null;
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.value=v; };
  set('ach-admin-name',''); set('ach-admin-icon','🏅'); set('ach-admin-desc','');
  set('ach-admin-target','10'); set('ach-admin-pts','25'); set('ach-admin-money','0'); set('ach-admin-packs','0');
  set('ach-admin-series',''); set('ach-admin-tier','0'); set('ach-admin-hidden',''); set('ach-admin-card','');
  const s = document.getElementById('ach-admin-set'); if(s) s.value='';
  const r = document.getElementById('ach-admin-rarity'); if(r) r.value='';
  set('ach-admin-rarity-label','');
  const cat = document.getElementById('ach-admin-cat'); if(cat) cat.value='Collection';
  const goal = document.getElementById('ach-admin-goal'); if(goal) goal.value='packs_opened';
  const msg = document.getElementById('ach-admin-msg'); if(msg) msg.textContent='';
  const btn = document.getElementById('ach-admin-savebtn'); if(btn) btn.textContent='Add achievement';
  const cancelBtn = document.getElementById('ach-admin-cancelbtn'); if(cancelBtn) cancelBtn.style.display='none';
  achIconPreviewUpdate();
}
function achAdminEdit(id){
  achLoadCatalog();
  const a = achievementCatalog.find(x => x.id === id);
  if(!a) return;
  achEditingId = id;
  const set = (elId,v) => { const el=document.getElementById(elId); if(el) el.value = (v==null?'':v); };
  set('ach-admin-name', a.name); set('ach-admin-icon', a.icon||'🏅'); set('ach-admin-desc', a.desc);
  set('ach-admin-cat', a.category||'Collection'); set('ach-admin-goal', a.goalType||'packs_opened');
  set('ach-admin-target', a.target||1); set('ach-admin-pts', a.pts||0);
  set('ach-admin-money', a.rewardMoney||0); set('ach-admin-packs', a.rewardPacks||0);
  set('ach-admin-set', a.setFilter||''); set('ach-admin-rarity', a.rarityFilter||'');
  set('ach-admin-rarity-label', a.rarityLabelFilter||'');
  set('ach-admin-series', a.series||''); set('ach-admin-tier', a.tier||0);
  set('ach-admin-hidden', a.hiddenUntil||''); set('ach-admin-card', a.rewardCard||'');
  const btn = document.getElementById('ach-admin-savebtn'); if(btn) btn.textContent='Save changes';
  const cancelBtn = document.getElementById('ach-admin-cancelbtn'); if(cancelBtn) cancelBtn.style.display='';
  const msg = document.getElementById('ach-admin-msg');
  if(msg){ msg.textContent = 'Editing "'+(a.name||'')+'" — change fields above and Save.'; msg.style.color='#7dd3fc'; }
  const form = document.getElementById('ach-admin-name');
  if(form && form.scrollIntoView) form.scrollIntoView({behavior:'smooth', block:'center'});
  achIconPreviewUpdate();
}
function achAdminReadForm(){
  const name = ((document.getElementById('ach-admin-name')||{}).value||'').trim();
  const icon = ((document.getElementById('ach-admin-icon')||{}).value||'🏅').trim() || '🏅';
  const desc = ((document.getElementById('ach-admin-desc')||{}).value||'').trim();
  const category = ((document.getElementById('ach-admin-cat')||{}).value||'Collection');
  const goalType = ((document.getElementById('ach-admin-goal')||{}).value||'packs_opened');
  const target = Math.max(1, parseInt((document.getElementById('ach-admin-target')||{}).value,10)||1);
  const pts = Math.max(0, parseInt((document.getElementById('ach-admin-pts')||{}).value,10)||0);
  const rewardMoney = Math.max(0, parseFloat((document.getElementById('ach-admin-money')||{}).value)||0);
  const rewardPacks = Math.max(0, parseInt((document.getElementById('ach-admin-packs')||{}).value,10)||0);
  const setFilter = ((document.getElementById('ach-admin-set')||{}).value||'').trim();
  const rarityFilter = ((document.getElementById('ach-admin-rarity')||{}).value||'').trim();
  const rarityLabelFilter = ((document.getElementById('ach-admin-rarity-label')||{}).value||'').trim();
  const series = ((document.getElementById('ach-admin-series')||{}).value||'').trim();
  const tier = Math.max(0, parseInt((document.getElementById('ach-admin-tier')||{}).value,10)||0);
  const hiddenUntil = ((document.getElementById('ach-admin-hidden')||{}).value||'').trim();
  const rewardCard = ((document.getElementById('ach-admin-card')||{}).value||'').trim();
  return { name, icon, desc, category, goalType, target, pts, rewardMoney, rewardPacks, setFilter, rarityFilter, rarityLabelFilter, series, tier, hiddenUntil, rewardCard };
}
function achAdminSave(){
  achLoadCatalog();
  const f = achAdminReadForm();
  const msg = document.getElementById('ach-admin-msg');
  if(!f.name){ if(msg){ msg.textContent='Name required'; msg.style.color='#f87171'; } return; }

  if(achEditingId){
    const existing = achievementCatalog.find(x => x.id === achEditingId);
    if(!existing){ if(msg){ msg.textContent='That achievement no longer exists'; msg.style.color='#f87171'; } achAdminClearForm(); achAdminRender(); return; }
    Object.assign(existing, f);
    if(!existing.setFilter) delete existing.setFilter;
    if(!existing.rarityFilter) delete existing.rarityFilter;
    if(!existing.rarityLabelFilter) delete existing.rarityLabelFilter;
    if(!existing.series) delete existing.series;
    if(!existing.tier) delete existing.tier;
    if(!existing.hiddenUntil) delete existing.hiddenUntil;
    if(!existing.rewardCard) delete existing.rewardCard;
    achSaveCatalog();
    if(msg){ msg.textContent='Updated "'+f.name+'"'; msg.style.color='#4ade80'; }
    achAdminClearForm();
    achAdminRender();
    if(typeof renderAchievements==='function') renderAchievements();
    return;
  }

  const a = Object.assign({ id: achUid() }, f);
  if(!a.setFilter) delete a.setFilter;
  if(!a.rarityFilter) delete a.rarityFilter;
  if(!a.rarityLabelFilter) delete a.rarityLabelFilter;
  if(!a.series) delete a.series;
  if(!a.tier) delete a.tier;
  if(!a.hiddenUntil) delete a.hiddenUntil;
  if(!a.rewardCard) delete a.rewardCard;
  achievementCatalog.push(a);
  achSaveCatalog();
  if(msg){ msg.textContent='Added "'+f.name+'"'; msg.style.color='#4ade80'; }
  achAdminClearForm();
  achAdminRender();
  if(typeof renderAchievements==='function') renderAchievements();
}
function achAdminDelete(id){
  achLoadCatalog();
  achievementCatalog = achievementCatalog.filter(a => a.id !== id);
  achSaveCatalog();
  if(achSelectedId === id) achSelectedId = null;
  if(achEditingId === id) achAdminClearForm();
  achAdminRender();
  if(typeof renderAchievements==='function') renderAchievements();
}
function achAdminGrant(id){
  const claims = achEnsureClaims();
  claims[id] = Object.assign({}, claims[id], { granted: true });
  state.achievementClaims = claims;
  if(typeof save==='function') save();
  showToast('Granted progress on this account');
  achAdminRender();
  if(typeof renderAchievements==='function') renderAchievements();
}
function achAdminRender(){
  achLoadCatalog();
  achRebuildSetSelects();
  const list = document.getElementById('ach-admin-list');
  const cnt = document.getElementById('ach-admin-count');
  if(cnt) cnt.textContent = String(achievementCatalog.length);
  if(!list) return;
  if(!achievementCatalog.length){
    list.innerHTML = '<p style="color:var(--muted);font-size:.85rem;margin:0">Catalog empty — add achievements above or Import CSV.</p>';
    return;
  }
  const sorted = achievementCatalog.slice().sort((a,b)=>{
    const ca = (a.category||'').localeCompare(b.category||'');
    if(ca) return ca;
    const sa = (a.series||'').localeCompare(b.series||'');
    if(sa) return sa;
    return (Number(a.tier)||0) - (Number(b.tier)||0);
  });
  list.innerHTML = sorted.map(a =>
    '<div style="display:flex;gap:.65rem;align-items:flex-start;justify-content:space-between;padding:.6rem .7rem;border-radius:10px;border:1px solid #2a314d;background:#0f1320">'+
    '<div><div style="font-weight:700">'+achIconHtml(a.icon)+' '+String(a.name||'').replace(/</g,'&lt;')+
    ' <span style="color:var(--muted);font-weight:600;font-size:.78rem">· '+(a.category||'')+'</span></div>'+
    '<div style="font-size:.78rem;color:var(--muted);margin-top:.2rem">'+String(a.goalType)+' ≥ '+a.target+
    (a.setFilter?(' · set: '+a.setFilter):'')+
    (a.rarityLabelFilter?(' · rarity label: '+a.rarityLabelFilter):(a.rarityFilter?(' · rarity: '+a.rarityFilter):''))+
    (a.series?(' · series: '+a.series+' t'+a.tier):'')+
    (a.hiddenUntil?(' · after: '+a.hiddenUntil):'')+
    (a.pts?(' · '+a.pts+' pts'):'')+
    (a.rewardMoney?(' · $'+a.rewardMoney):'')+
    (a.rewardPacks?(' · '+a.rewardPacks+' packs'):'')+
    (a.rewardCard?(' · card: '+a.rewardCard):'')+'</div>'+
    (a.desc?'<div style="font-size:.78rem;color:#b7bbca;margin-top:.15rem">'+String(a.desc).replace(/</g,'&lt;')+'</div>':'')+
    '</div><div style="display:flex;flex-direction:column;gap:.3rem">'+
    '<button class="btn btn-secondary" type="button" style="padding:.25rem .5rem;font-size:.72rem" onclick="achAdminEdit(\''+a.id+'\')">Edit</button>'+
    (a.goalType==='manual'?'<button class="btn btn-secondary" type="button" style="padding:.25rem .5rem;font-size:.72rem" onclick="achAdminGrant(\''+a.id+'\')">Grant me</button>':'')+
    '<button class="btn btn-secondary" type="button" style="padding:.25rem .5rem;font-size:.72rem" onclick="achAdminDelete(\''+a.id+'\')">Remove</button>'+
    '</div></div>'
  ).join('');
}
function achParseCsv(text){
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if(lines.length < 2) return [];
  function splitRow(line){
    const out = []; let cur = ''; let q = false;
    for(let i=0;i<line.length;i++){
      const ch = line[i];
      if(ch === '"'){ if(q && line[i+1]==='"'){ cur+='"'; i++; } else q=!q; }
      else if(ch === ',' && !q){ out.push(cur); cur=''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }
  const headers = splitRow(lines[0]).map(h => h.trim().toLowerCase());
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cols = splitRow(lines[i]);
    const obj = {};
    headers.forEach((h,j) => { obj[h] = (cols[j]||'').trim(); });
    rows.push(obj);
  }
  return rows;
}
function achRowFromCsv(r){
  const goalMap = {
    counter:'packs_opened', packs_opened:'packs_opened', cards_owned:'cards_owned',
    holos_pulled:'holos_pulled', trades_completed:'trades_completed',
    collection_value:'collection_value', best_pull_value:'best_pull_value', max_value:'best_pull_value',
    sets_completed:'sets_completed', set_complete:'sets_completed', manual:'manual', event:'manual'
  };
  let goalType = (r.check_type || r.goaltype || r.goal_type || 'packs_opened').toLowerCase();
  if(goalMap[goalType]) goalType = goalMap[goalType];
  if(r.stat === 'packsOpened') goalType = 'packs_opened';
  if(r.stat === 'holosPulled') goalType = 'holos_pulled';
  if(r.stat === 'tradesCompleted') goalType = 'trades_completed';
  if(r.stat === 'uniqueOwned') goalType = 'cards_owned';
  if(r.stat === 'collectionValue') goalType = 'collection_value';
  if(r.stat === 'bestPullValue') goalType = 'best_pull_value';
  if(r.stat === 'setsCompleted') goalType = 'sets_completed';
  const rewardType = (r.reward_type || '').toLowerCase();
  let rewardMoney = parseFloat(r.reward_money || 0) || 0;
  let rewardPacks = parseInt(r.reward_packs || 0, 10) || 0;
  let rewardCard = (r.reward_card || '').trim();
  if(rewardType === 'money') rewardMoney = parseFloat(r.reward_value || rewardMoney) || rewardMoney;
  if(rewardType === 'packs') rewardPacks = parseInt(r.reward_value || rewardPacks, 10) || rewardPacks;
  if(rewardType === 'card') rewardCard = (r.reward_value || rewardCard || '').trim();
  const a = {
    id: (r.id || '').trim() || achUid(),
    name: (r.name || '').trim(),
    icon: (r.icon || '🏅').trim() || '🏅',
    desc: (r.description || r.desc || '').trim(),
    category: (r.category || 'Collection').trim(),
    goalType,
    target: Math.max(1, parseInt(r.target, 10) || 1),
    pts: Math.max(0, parseInt(r.pts || r.points || 25, 10) || 0),
    rewardMoney, rewardPacks
  };
  if((r.set || '').trim()) a.setFilter = r.set.trim();
  if((r.series || '').trim()) a.series = r.series.trim();
  if(r.tier) a.tier = parseInt(r.tier, 10) || 0;
  if((r.hidden_until || '').trim()) a.hiddenUntil = r.hidden_until.trim();
  if(rewardCard) a.rewardCard = rewardCard;
  return a.name ? a : null;
}
function achAdminImportCsv(ev){
  const file = ev.target && ev.target.files && ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const rows = achParseCsv(String(reader.result||''));
      const incoming = rows.map(achRowFromCsv).filter(Boolean);
      if(!incoming.length){ showToast('No valid rows in CSV'); return; }
      achLoadCatalog();
      const byId = {};
      achievementCatalog.forEach(a => { byId[a.id] = a; });
      let added = 0, updated = 0;
      incoming.forEach(a => {
        if(byId[a.id]){ Object.assign(byId[a.id], a); updated++; }
        else { achievementCatalog.push(a); added++; }
      });
      achSaveCatalog();
      achAdminRender();
      if(typeof renderAchievements==='function') renderAchievements();
      const msg = document.getElementById('ach-admin-msg');
      if(msg){ msg.textContent = 'Imported +'+added+' / updated '+updated; msg.style.color='#4ade80'; }
      showToast('CSV import complete');
    }catch(e){
      console.error(e);
      showToast('CSV import failed');
    }
    ev.target.value = '';
  };
  reader.readAsText(file);
}
function achAdminExportCsv(){
  achLoadCatalog();
  const headers = ['id','name','description','category','icon','check_type','stat','target','set','series','tier','hidden_until','reward_type','reward_value','pts'];
  const lines = [headers.join(',')];
  function esc(v){
    const s = String(v==null?'':v);
    if(/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  }
  achievementCatalog.forEach(a => {
    let rewardType = 'none', rewardValue = '';
    if(a.rewardCard){ rewardType='card'; rewardValue=a.rewardCard; }
    else if(a.rewardPacks){ rewardType='packs'; rewardValue=a.rewardPacks; }
    else if(a.rewardMoney){ rewardType='money'; rewardValue=a.rewardMoney; }
    const stat = a.goalType === 'packs_opened' ? 'packsOpened'
      : a.goalType === 'holos_pulled' ? 'holosPulled'
      : a.goalType === 'cards_owned' ? 'uniqueOwned'
      : a.goalType === 'trades_completed' ? 'tradesCompleted'
      : a.goalType === 'collection_value' ? 'collectionValue'
      : a.goalType === 'best_pull_value' ? 'bestPullValue'
      : a.goalType === 'sets_completed' ? 'setsCompleted' : a.goalType;
    lines.push([
      a.id, a.name, a.desc, a.category, a.icon, a.goalType, stat, a.target,
      a.setFilter||'', a.series||'', a.tier||'', a.hiddenUntil||'',
      rewardType, rewardValue, a.pts||0
    ].map(esc).join(','));
  });
  const blob = new Blob([lines.join('\n')], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'achievements-export.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ===== Data-driven set achievements =====
   Populates the "Set" dropdowns from the Supabase `sets` table (instead of
   the old hardcoded <option> list), and lets an admin one-click generate the
   standard Set Master + per-rarity achievements for any set, using its real
   card counts. Safe to click multiple times — already-generated ones (matched
   by id) are skipped, so it only fills in what's missing (e.g. after adding
   more cards to a set later). */
function achRebuildSetSelects(){
  if(typeof SETS === 'undefined' || !SETS.length) return;
  const fillSelect = (id, includeAny) => {
    const sel = document.getElementById(id);
    if(!sel) return;
    const prev = sel.value;
    let opts = includeAny ? '<option value="">Any set</option>' : '<option value="">— choose a set —</option>';
    opts += SETS.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    sel.innerHTML = opts;
    if(prev && Array.from(sel.options).some(o => o.value === prev)) sel.value = prev;
  };
  fillSelect('ach-admin-set', true);
  fillSelect('ach-admin-gen-set', false);

  const dl = document.getElementById('ach-rarity-label-options');
  if(dl && typeof CARDS !== 'undefined' && CARDS.length){
    const labels = Array.from(new Set(CARDS.map(c => c.rarityLabel).filter(Boolean))).sort();
    dl.innerHTML = labels.map(l => `<option value="${String(l).replace(/"/g,'&quot;')}">`).join('');
  }
}

function achGenerateForSet(setName){
  if(!setName){ showToast('Pick a set first'); return; }
  achLoadCatalog();
  const setInfo = (typeof SETS !== 'undefined') ? SETS.find(s => s.name === setName) : null;
  const code = (setInfo && setInfo.code) ? setInfo.code : setName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const setCards = (typeof CARDS !== 'undefined') ? CARDS.filter(c => c.set === setName) : [];
  const total = setCards.length || (setInfo && setInfo.card_count) || 0;
  if(!total){ showToast('No cards found for that set yet — add cards first'); return; }

  const shortName = setName.replace(/wizards\s*/i, '').trim() || setName;
  const byId = {};
  achievementCatalog.forEach(a => { byId[a.id] = a; });
  let added = 0;

  const masterId = 'gen_' + code + '_master';
  if(!byId[masterId]){
    achievementCatalog.push({
      id: masterId,
      name: shortName + ' Master',
      icon: '📘',
      desc: 'Own all ' + total + ' ' + shortName + ' cards',
      category: 'Set Completion',
      goalType: 'cards_owned',
      target: total,
      setFilter: setName,
      pts: 100,
      rewardMoney: Math.max(10, Math.round(total * 0.4)),
      rewardPacks: Math.max(2, Math.round(total / 20))
    });
    added++;
  }

  const rarities = [
    { key:'common', label:'Common', icon:'⚪' },
    { key:'uncommon', label:'Uncommon', icon:'🟢' },
    { key:'epic', label:'Rare', icon:'🔷' },
    { key:'legendary', label:'Rare Holo', icon:'⭐' }
  ];
  rarities.forEach(r => {
    const count = setCards.filter(c => c.rarity === r.key).length;
    if(!count) return;
    const id = 'gen_' + code + '_' + r.key;
    if(byId[id]) return;
    achievementCatalog.push({
      id,
      name: shortName + ' ' + r.label + ' Master',
      icon: r.icon,
      desc: 'Own every ' + r.label + ' card in ' + shortName,
      category: 'Set Completion',
      goalType: 'rarity_owned',
      rarityFilter: r.key,
      target: count,
      setFilter: setName,
      pts: 40,
      rewardMoney: Math.max(3, Math.round(count * 0.3)),
      rewardPacks: Math.max(1, Math.round(count / 15))
    });
    added++;
  });

  if(!added){
    showToast('Already generated for ' + shortName);
    return;
  }
  achSaveCatalog();
  achAdminRender();
  if(typeof renderAchievements === 'function') renderAchievements();
  const msg = document.getElementById('ach-admin-msg');
  if(msg){ msg.textContent = 'Generated ' + added + ' achievement(s) for ' + shortName; msg.style.color = '#4ade80'; }
  showToast('Generated ' + added + ' achievement(s) for ' + shortName);
}

// boot catalog
achLoadCatalog();

/* ========== Proactive "achievement unlocked" popup (mirrors the quest-complete popup) ========== */
let _achNotifyQueue = [];
let _achNotifyOpen = false;
let _popupAchId = null;

function checkNewlyCompletedAchievements(){
  try{
    achLoadCatalog();
    if(!state.achNotified) state.achNotified = {};
    const newly = [];
    achievementCatalog.forEach(a => {
      if(!achIsVisible(a)) return;
      if(achIsClaimed(a.id)) return;
      if(!achIsComplete(a)) return;
      if(state.achNotified[a.id]) return;
      state.achNotified[a.id] = true;
      newly.push(a);
    });
    if(newly.length){
      if(typeof save === 'function') save();
      newly.forEach(showAchievementCompletePopup);
    }
  }catch(e){ console.warn('ach notify', e); }
}

function showAchievementCompletePopup(a){
  if(!a) return;
  _achNotifyQueue.push(a);
  pumpAchNotify();
}

function pumpAchNotify(){
  if(_achNotifyOpen) return;
  const a = _achNotifyQueue.shift();
  if(!a){ _popupAchId = null; return; }
  _achNotifyOpen = true;
  _popupAchId = a.id;
  const m = document.getElementById('achievement-complete-modal');
  const icon = document.getElementById('ac-icon');
  const title = document.getElementById('ac-title');
  const desc = document.getElementById('ac-desc');
  const rew = document.getElementById('ac-reward');
  if(icon) icon.innerHTML = achIconHtml(a.icon || '🏆');
  if(title) title.textContent = a.name || 'Achievement complete!';
  if(desc) desc.textContent = a.desc || '';
  const bits = [];
  if(a.rewardMoney) bits.push('+$' + Number(a.rewardMoney));
  if(a.rewardPacks) bits.push('+' + a.rewardPacks + ' pack' + (a.rewardPacks===1?'':'s'));
  if(a.rewardCard){ const c = typeof resolveCard==='function' ? resolveCard(a.rewardCard) : null; bits.push('+' + (c ? c.name : a.rewardCard)); }
  if(a.pts) bits.push(a.pts + ' pts');
  if(rew) rew.textContent = bits.join(' · ') || 'Claim it in Achievements';
  if(m) m.classList.add('open');
}

function claimFromAchievementPopup(){
  if(!_popupAchId){ closeAchievementCompleteModal(); return; }
  const id = _popupAchId;
  if(typeof achClaim === 'function') achClaim(id);
  closeAchievementCompleteModal();
}

function closeAchievementCompleteModal(){
  const m = document.getElementById('achievement-complete-modal');
  if(m) m.classList.remove('open');
  _achNotifyOpen = false;
  _popupAchId = null;
  setTimeout(pumpAchNotify, 200);
}


/* ========== LIVE WHEEL EVENT ========== */
let lwEvent = null;          // current live_events row
let lwChannel = null;        // realtime channel
let lwIsHost = false;
let lwMembers = [];          // [{id, username, display_name}]
let lwSlots = [];            // local builder state [{type, card_key, label}]
let lwWheels = [];            // saved rounds: array of slot arrays for multi-wheel events
let lwPickingSlotIdx = -1;
let lwSpinning = false;
let lwPresenceMap = {};      // user_id -> meta
let lwInviteChannel = null;  // global invites channel
let lwPendingInvite = null;  // { eventId, title, code } when popup shown


function lwRandomCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i=0;i<5;i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}

function lwOnAdminOpen(){
  if(currentUser && currentUser.is_admin){
    lwRenderBuilder();
    lwRefreshInviteList();
  }
}

function lwShowRoom(){
  const ov = document.getElementById('lw-event-overlay');
  if(ov) ov.style.display = 'block';
}

function lwHideRoom(){
  const ov = document.getElementById('lw-event-overlay');
  if(ov) ov.style.display = 'none';
}

async function lwRefreshInviteList(){
  const sel = document.getElementById('lw-invite-select');
  if(!sel || !sb) return;
  try{
    const { data, error } = await sb.from('profiles')
      .select('id, username, display_name, is_admin')
      .order('username');
    if(error) throw error;
    const me = currentUser && currentUser.id;
    sel.innerHTML = (data||[])
      .filter(u => u.id !== me)
      .map(u => `<option value="${u.id}">${u.display_name || u.username}${u.is_admin?' (admin)':''}</option>`)
      .join('');
  }catch(e){
    console.warn('lwRefreshInviteList', e);
    sel.innerHTML = '<option disabled>Could not load players</option>';
  }
}

function lwGetSelectedInviteeIds(){
  const sel = document.getElementById('lw-invite-select');
  if(!sel) return [];
  return Array.from(sel.selectedOptions).map(o => o.value).filter(Boolean);
}


function lwOnModeChange(){
  const mode = (document.getElementById('lw-mode')||{}).value || 'curated';
  const pool = document.getElementById('lw-pack-pool-builder');
  const grid = document.getElementById('lw-builder-grid');
  if(pool) pool.style.display = mode === 'pack_pick' ? 'block' : 'none';
  if(grid) grid.style.opacity = mode === 'pack_pick' ? '.35' : '1';
  if(mode === 'pack_pick') lwRenderPackPoolBuilder();
}
function lwDefaultPackSets(){
  if(typeof SETS !== 'undefined' && SETS.length){
    return SETS.filter(s => s.name && s.name !== 'Wizards Black Star Promos').map(s => s.name).slice(0, 8);
  }
  return ['Base Set','Jungle','Fossil'];
}
let lwPackDrafts = [];
let lwEditingPackDraftIdx = -1;
let lwPackPickMode = 'card'; // 'card' | 'mystery' | 'cosmetic'
function lwNormalizePackItems(d){
  if(!d) return [];
  // Migrate legacy `cards: string[]` → items objects
  if(Array.isArray(d.items) && d.items.length) return d.items;
  if(Array.isArray(d.cards) && d.cards.length){
    d.items = d.cards.map(function(k){
      if(typeof k === 'string') return { type:'card', card_key:k, weight:1 };
      if(k && typeof k === 'object') return k;
      return null;
    }).filter(Boolean);
    return d.items;
  }
  if(!Array.isArray(d.items)) d.items = [];
  return d.items;
}
function lwPackArtForSet(setName){
  const map = {
    'Base Set': 'art/packs/charizard.webp',
    'Jungle': 'art/packs/03-green-ball.webp',
    'Fossil': 'art/packs/12-moon-ball.webp',
    'Wizards Black Star Promos': 'art/packs/poke-ball.webp'
  };
  if(map[setName]) return map[setName];
  if(typeof SETS !== 'undefined'){
    const s = SETS.find(x => x.name === setName);
    if(s && (s.cover_art || s.cover)) return s.cover_art || s.cover;
  }
  return 'art/packs/poke-ball.webp';
}
function lwRenderPackPoolBuilder(){
  if(!lwPackDrafts.length){
    for(let i=0;i<3;i++){
      lwPackDrafts.push({ id: 'draft_'+Math.random().toString(36).slice(2,8), set: 'Mystery', items: [] });
    }
  }
  lwRenderPackDraftRows();
}
function lwRenderPackDraftRows(){
  const wrap = document.getElementById('lw-pack-pool-rows');
  if(!wrap) return;
  wrap.innerHTML = lwPackDrafts.map((d,i) => {
    const items = lwNormalizePackItems(d);
    const n = items.length || 0;
    return '<div class="lw-admin-row" style="gap:.5rem;align-items:center;flex-wrap:wrap;padding:.45rem;border:1px solid #2a3555;border-radius:8px">'+
      '<span style="font-weight:800;color:#ffcb05">Mystery Pack '+(i+1)+'</span>'+
      '<span style="font-size:.8rem;color:'+(n>=1?'#7df':'#f87171')+'">'+n+'/10 prizes</span>'+
      '<button type="button" class="btn btn-secondary" style="padding:.25rem .5rem;font-size:.75rem" onclick="lwOpenPackCardPicker('+i+')">Edit prizes</button>'+
      '<button type="button" class="btn btn-secondary" style="padding:.25rem .5rem;font-size:.75rem" onclick="lwPackDrafts.splice('+i+',1);lwRenderPackDraftRows()">Remove</button>'+
      '</div>';
  }).join('') || '<span style="color:var(--muted);font-size:.85rem">No packs yet — add one.</span>';
}
function lwAddPackPoolRow(){
  lwPackDrafts.push({ id: 'draft_'+Math.random().toString(36).slice(2,8), set: 'Mystery', items: [] });
  lwRenderPackDraftRows();
}
function lwSetPackPickMode(mode){
  lwPackPickMode = mode || 'card';
  ['card','mystery','cosmetic'].forEach(function(m){
    const btn = document.getElementById('lw-pack-pick-mode-'+m);
    if(btn){
      btn.style.outline = (m === lwPackPickMode) ? '2px solid #ffcb05' : 'none';
      btn.style.opacity = (m === lwPackPickMode) ? '1' : '0.85';
    }
  });
  const search = document.getElementById('lw-pack-card-search');
  if(search){
    search.placeholder = lwPackPickMode === 'cosmetic' ? 'Search cosmetics…' : (lwPackPickMode === 'mystery' ? 'Mystery cards (click to add)' : 'Search cards…');
    search.style.display = lwPackPickMode === 'mystery' ? 'none' : 'block';
  }
  lwRenderPackCardPicker();
}
function lwOpenPackCardPicker(idx){
  lwEditingPackDraftIdx = idx;
  const wrap = document.getElementById('lw-pack-card-picker-wrap');
  if(wrap) wrap.style.display = 'block';
  const title = document.getElementById('lw-pack-card-picker-title');
  if(title) title.textContent = 'Fill Mystery Pack '+(idx+1)+' (max 10 prizes · cards / mystery / cosmetics)';
  lwSetPackPickMode(lwPackPickMode || 'card');
}
function lwClosePackCardPicker(){
  lwEditingPackDraftIdx = -1;
  const wrap = document.getElementById('lw-pack-card-picker-wrap');
  if(wrap) wrap.style.display = 'none';
  lwRenderPackDraftRows();
}
function lwPackItemLabel(it){
  if(!it) return '?';
  if(it.type === 'mystery') return '??? Mystery';
  if(it.type === 'cosmetic'){
    const item = (typeof COSMETICS !== 'undefined' ? COSMETICS : []).find(c => c.id === it.cosmetic_id);
    return item ? ('✨ '+item.name) : ('✨ '+(it.cosmetic_id||'Cosmetic'));
  }
  if(it.card_key){
    const c = typeof cardByKey === 'function' ? cardByKey(it.card_key) : null;
    return c ? c.name : it.card_key;
  }
  return 'Prize';
}
function lwRenderPackSelectedList(){
  const listEl = document.getElementById('lw-pack-selected-list');
  if(!listEl || lwEditingPackDraftIdx < 0) return;
  const d = lwPackDrafts[lwEditingPackDraftIdx];
  const items = lwNormalizePackItems(d);
  if(!items.length){
    listEl.innerHTML = '<span style="color:var(--muted);font-size:.78rem">No prizes yet</span>';
    return;
  }
  listEl.innerHTML = items.map(function(it, i){
    const label = lwPackItemLabel(it);
    return '<span style="display:inline-flex;align-items:center;gap:.25rem;background:#12182a;border:1px solid #2a3555;border-radius:6px;padding:.2rem .4rem;font-size:.75rem">'+
      String(label).replace(/</g,'&lt;')+
      ' <button type="button" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:.85rem;padding:0 .15rem" onclick="lwRemovePackDraftItem('+i+')" title="Remove">×</button></span>';
  }).join('');
}
function lwRemovePackDraftItem(i){
  if(lwEditingPackDraftIdx < 0) return;
  const d = lwPackDrafts[lwEditingPackDraftIdx];
  const items = lwNormalizePackItems(d);
  if(i < 0 || i >= items.length) return;
  items.splice(i, 1);
  d.items = items;
  lwRenderPackCardPicker();
}
function lwRenderPackCardPicker(){
  const box = document.getElementById('lw-pack-card-picker');
  const countEl = document.getElementById('lw-pack-card-picker-count');
  if(!box || lwEditingPackDraftIdx < 0) return;
  const d = lwPackDrafts[lwEditingPackDraftIdx];
  if(!d) return;
  const items = lwNormalizePackItems(d);
  if(countEl) countEl.textContent = items.length + ' / 10 selected';
  lwRenderPackSelectedList();

  const q = ((document.getElementById('lw-pack-card-search')||{}).value || '').trim().toLowerCase();

  if(lwPackPickMode === 'mystery'){
    box.innerHTML = '<button type="button" class="live-card-pick" style="outline:2px solid #a78bfa" onclick="lwAddPackDraftMystery()">'+
      '<div class="lw-ci-emoji" style="font-size:1.6rem">❓</div>'+
      '<div class="live-card-meta"><strong>Mystery card</strong><span>Random card at spin time</span></div></button>'+
      '<p style="color:var(--muted);font-size:.78rem;margin:.5rem 0 0">Click to add a mystery card slot to this pack. It resolves to a random catalog card when spun.</p>';
    return;
  }

  if(lwPackPickMode === 'cosmetic'){
    let list = (typeof COSMETICS !== 'undefined' ? COSMETICS : []).slice();
    if(q) list = list.filter(c => (c.name||'').toLowerCase().includes(q) || (c.id||'').toLowerCase().includes(q) || (c.cat||'').toLowerCase().includes(q));
    list = list.slice(0, 80);
    box.innerHTML = list.map(function(c){
      const art = c.art || (c.value && String(c.value).startsWith('art/') ? c.value : '');
      return '<button type="button" class="live-card-pick" onclick="lwAddPackDraftCosmetic(\''+String(c.id).replace(/'/g,"\\'")+'\')">'+
        (art ? '<img src="'+art+'" alt="">' : '<div class="lw-ci-emoji">✨</div>')+
        '<div class="live-card-meta"><strong>'+String(c.name||c.id).replace(/</g,'&lt;')+'</strong><span>'+(c.cat||'cosmetic')+'</span></div></button>';
    }).join('') || '<span style="color:var(--muted)">No cosmetics</span>';
    return;
  }

  // card mode
  let list = ((typeof obtainableCards === 'function') ? obtainableCards() : (typeof CARDS !== 'undefined' ? CARDS : [])).slice();
  if(q) list = list.filter(c => (c.name||'').toLowerCase().includes(q) || String(c.cardNumber||'').includes(q));
  list = list.slice(0, 80);
  box.innerHTML = list.map(function(c){
    return '<button type="button" class="live-card-pick" onclick="lwAddPackDraftCard(\''+String(c.key).replace(/'/g,"\\'")+'\')">'+
      (c.art ? '<img src="'+c.art+'" alt="">' : '')+
      '<div class="live-card-meta"><strong>'+String(c.name||'').replace(/</g,'&lt;')+'</strong><span>'+(c.rarityLabel||c.rarity||'')+'</span></div></button>';
  }).join('') || '<span style="color:var(--muted)">No cards</span>';
}
function lwAddPackDraftCard(key){
  if(lwEditingPackDraftIdx < 0) return;
  const d = lwPackDrafts[lwEditingPackDraftIdx];
  if(!d) return;
  const items = lwNormalizePackItems(d);
  if(items.length >= 10){ showToast('Max 10 prizes per pack'); return; }
  items.push({ type:'card', card_key: key, weight: 1 });
  d.items = items;
  lwRenderPackCardPicker();
}
function lwAddPackDraftMystery(){
  if(lwEditingPackDraftIdx < 0) return;
  const d = lwPackDrafts[lwEditingPackDraftIdx];
  if(!d) return;
  const items = lwNormalizePackItems(d);
  if(items.length >= 10){ showToast('Max 10 prizes per pack'); return; }
  // Higher default weight so mystery hits more often than common cards (commons ~3)
  items.push({ type:'mystery', card_key: null, label: 'Mystery card', weight: 6 });
  d.items = items;
  lwRenderPackCardPicker();
}
function lwAddPackDraftCosmetic(id){
  if(lwEditingPackDraftIdx < 0 || !id) return;
  const d = lwPackDrafts[lwEditingPackDraftIdx];
  if(!d) return;
  const items = lwNormalizePackItems(d);
  if(items.length >= 10){ showToast('Max 10 prizes per pack'); return; }
  const item = (typeof COSMETICS !== 'undefined' ? COSMETICS : []).find(c => c.id === id);
  items.push({
    type: 'cosmetic',
    cosmetic_id: id,
    label: item ? item.name : id,
    weight: 1
  });
  d.items = items;
  lwRenderPackCardPicker();
}
function lwReadPackPoolFromBuilder(){
  const pool = [];
  lwPackDrafts.forEach((d, n) => {
    const items = lwNormalizePackItems(d).slice(0, 10);
    // Keep legacy `cards` keys for any old consumers; primary is `items`
    const cardKeys = items.filter(it => it.type === 'card' && it.card_key).map(it => it.card_key);
    pool.push({
      id: 'p'+(n+1)+'_mystery_'+Math.random().toString(36).slice(2,8),
      set: 'Mystery',
      label: 'Mystery Pack '+(n+1),
      items: items,
      cards: cardKeys,
      claimed_by: null,
      claimed_name: null
    });
  });
  return pool;
}


/* ===== Curated / hybrid slot builder (wheel slots) ===== */
function lwAddCardSlot(){
  lwSlots.push({ type:'card', card_key:null, label:'Pick a card…', weight:1 });
  lwRenderBuilder();
  lwPickingSlotIdx = lwSlots.length - 1;
  lwShowCardPicker();
}
function lwAddMysterySlot(){
  lwSlots.push({ type:'mystery', card_key:null, label:'Mystery card', weight:6 });
  lwRenderBuilder();
}
function lwAddRandomSlot(){
  lwSlots.push({ type:'random', card_key:null, label:'Random card', weight:3 });
  lwRenderBuilder();
}
function lwAddPackSlot(){
  lwSlots.push({ type:'pack', pack_set:'Base Set', pack_qty:1, label:'📦 Base Set ×1', weight:1 });
  lwRenderBuilder();
}
function lwAddCosmeticSlot(){
  lwSlots.push({ type:'cosmetic', cosmetic_id:null, label:'Pick a cosmetic…', weight:1 });
  lwRenderBuilder();
  lwPickingSlotIdx = lwSlots.length - 1;
  lwShowCosmeticPicker();
}
function lwFillRandomSlots(){
  const n = Math.max(6, Math.min(24, parseInt((document.getElementById('lw-slot-count')||{}).value,10) || 12));
  lwSlots = Array.from({length:n}, function(){ return { type:'random', card_key:null, label:'Random card', weight:1 }; });
  lwRenderBuilder();
  showToast('Filled '+n+' random slots');
}
function lwClearSlots(){
  lwSlots = [];
  lwPickingSlotIdx = -1;
  const wrap = document.getElementById('lw-card-picker-wrap');
  if(wrap) wrap.style.display = 'none';
  lwRenderBuilder();
}
function lwRenderBuilder(){
  const grid = document.getElementById('lw-builder-grid');
  if(!grid) return;
  if(!lwSlots.length){
    grid.innerHTML = '<span style="color:var(--muted);font-size:.85rem">No slots yet — add cards, mystery, packs, or cosmetics.</span>';
    lwUpdateOddsSummary();
    return;
  }
  grid.innerHTML = lwSlots.map(function(s, i){
    const label = lwSlotLabel(s);
    const art = lwSlotArt(s);
    let extra = '';
    if(s.type === 'pack'){
      extra = '<div style="display:flex;gap:.35rem;margin-top:.35rem;flex-wrap:wrap">'+
        '<select onchange="lwSlots['+i+'].pack_set=this.value;lwSlots['+i+'].label=\'📦 \'+this.value+\' ×\'+(lwSlots['+i+'].pack_qty||1);lwRenderBuilder()" style="font-size:.72rem;background:#0a0e1a;border:1px solid #2a3555;color:#fff;border-radius:6px;padding:.2rem">'+
        (typeof SETS!=='undefined'?SETS:[{name:'Base Set'},{name:'Jungle'},{name:'Fossil'}]).map(function(set){
          const nm = set.name||set;
          return '<option value="'+nm+'"'+(s.pack_set===nm?' selected':'')+'>'+nm+'</option>';
        }).join('')+
        '</select>'+
        '<input type="number" min="1" max="20" value="'+(s.pack_qty||1)+'" onchange="lwSlots['+i+'].pack_qty=Math.max(1,Math.min(20,+this.value||1));lwSlots['+i+'].label=\'📦 \'+(lwSlots['+i+'].pack_set||\'Pack\')+\' ×\'+lwSlots['+i+'].pack_qty;lwRenderBuilder()" style="width:52px;font-size:.72rem;background:#0a0e1a;border:1px solid #2a3555;color:#fff;border-radius:6px;padding:.2rem">'+
        '</div>';
    }
    if(s.type === 'card' && !s.card_key){
      extra = '<button type="button" class="btn btn-secondary" style="margin-top:.35rem;padding:.2rem .45rem;font-size:.72rem" onclick="lwPickingSlotIdx='+i+';lwShowCardPicker()">Pick card</button>';
    }
    if(s.type === 'cosmetic' && !s.cosmetic_id){
      extra = '<button type="button" class="btn btn-secondary" style="margin-top:.35rem;padding:.2rem .45rem;font-size:.72rem" onclick="lwPickingSlotIdx='+i+';lwShowCosmeticPicker()">Pick cosmetic</button>';
    }
    return '<div class="lw-slot-card'+(s.type==='mystery'?' mystery':'')+'" style="position:relative">'+
      (art ? '<img src="'+art+'" alt="" style="width:48px;height:68px;object-fit:contain;border-radius:4px">' : '<div style="font-size:1.4rem">'+(s.type==='pack'?'📦':s.type==='cosmetic'?'✨':s.type==='mystery'||s.type==='random'?'❓':'🎴')+'</div>')+
      '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+String(label).replace(/</g,'&lt;')+'</div>'+
      '<div style="font-size:.72rem;color:var(--muted)">'+s.type+' · weight <input type="number" min="1" max="99" value="'+(s.weight||1)+'" onchange="lwSlots['+i+'].weight=Math.max(1,+this.value||1);lwUpdateOddsSummary()" style="width:40px;font-size:.72rem;background:#0a0e1a;border:1px solid #2a3555;color:#fff;border-radius:4px;padding:.1rem .2rem"></div>'+
      extra+'</div>'+
      '<button type="button" title="Remove" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:1rem;position:absolute;top:4px;right:6px" onclick="lwSlots.splice('+i+',1);lwRenderBuilder()">×</button>'+
      '</div>';
  }).join('');
  lwUpdateOddsSummary();
}
function lwUpdateOddsSummary(){
  const el = document.getElementById('lw-odds-summary');
  if(!el) return;
  if(!lwSlots.length){ el.textContent = ''; return; }
  const total = lwSlots.reduce(function(a,s){ return a + (Number(s.weight)>0?Number(s.weight):1); }, 0);
  el.textContent = lwSlots.length + ' slots · total weight ' + total + ' · each weight ÷ ' + total + ' = odds';
}
function lwShowCardPicker(){
  const wrap = document.getElementById('lw-card-picker-wrap');
  if(wrap) wrap.style.display = 'block';
  const hint = document.getElementById('lw-picker-hint');
  if(hint) hint.textContent = 'Pick a card for slot ' + (lwPickingSlotIdx+1) + ':';
  lwRenderPicker();
}
function lwShowCosmeticPicker(){
  const wrap = document.getElementById('lw-card-picker-wrap');
  if(wrap) wrap.style.display = 'block';
  const hint = document.getElementById('lw-picker-hint');
  if(hint) hint.textContent = 'Pick a cosmetic for slot ' + (lwPickingSlotIdx+1) + ':';
  lwRenderPicker(true);
}
function lwRenderPicker(forCosmetic){
  const box = document.getElementById('lw-card-picker');
  if(!box) return;
  const q = ((document.getElementById('lw-card-search')||{}).value || '').trim().toLowerCase();
  if(forCosmetic || (lwPickingSlotIdx>=0 && lwSlots[lwPickingSlotIdx] && lwSlots[lwPickingSlotIdx].type==='cosmetic')){
    let list = (typeof COSMETICS !== 'undefined' ? COSMETICS : []).slice();
    if(q) list = list.filter(c => (c.name||'').toLowerCase().includes(q) || (c.id||'').toLowerCase().includes(q));
    list = list.slice(0, 80);
    box.innerHTML = list.map(function(c){
      const art = c.art || (c.value && String(c.value).startsWith('art/') ? c.value : '');
      return '<button type="button" class="live-card-pick" onclick="lwPickCosmeticForSlot(\''+String(c.id).replace(/'/g,"\\'")+'\')">'+
        (art?'<img src="'+art+'" alt="">':'<div class="lw-ci-emoji">✨</div>')+
        '<div class="live-card-meta"><strong>'+String(c.name||c.id).replace(/</g,'&lt;')+'</strong><span>'+(c.cat||'')+'</span></div></button>';
    }).join('') || '<span style="color:var(--muted)">No cosmetics</span>';
    return;
  }
  let list = ((typeof obtainableCards === 'function') ? obtainableCards() : (typeof CARDS !== 'undefined' ? CARDS : [])).slice();
  if(q) list = list.filter(c => (c.name||'').toLowerCase().includes(q) || String(c.cardNumber||'').includes(q));
  list = list.slice(0, 80);
  box.innerHTML = list.map(function(c){
    return '<button type="button" class="live-card-pick" onclick="lwPickCardForSlot(\''+String(c.key).replace(/'/g,"\\'")+'\')">'+
      (c.art?'<img src="'+c.art+'" alt="">':'')+
      '<div class="live-card-meta"><strong>'+String(c.name||'').replace(/</g,'&lt;')+'</strong><span>'+(c.rarityLabel||c.rarity||'')+'</span></div></button>';
  }).join('') || '<span style="color:var(--muted)">No cards</span>';
}
function lwPickCardForSlot(key){
  if(lwPickingSlotIdx < 0 || !lwSlots[lwPickingSlotIdx]) return;
  const c = typeof cardByKey === 'function' ? cardByKey(key) : null;
  lwSlots[lwPickingSlotIdx].type = 'card';
  lwSlots[lwPickingSlotIdx].card_key = key;
  lwSlots[lwPickingSlotIdx].label = c ? c.name : key;
  lwPickingSlotIdx = -1;
  const wrap = document.getElementById('lw-card-picker-wrap');
  if(wrap) wrap.style.display = 'none';
  lwRenderBuilder();
}
function lwPickCosmeticForSlot(id){
  if(lwPickingSlotIdx < 0 || !lwSlots[lwPickingSlotIdx]) return;
  const item = (typeof COSMETICS !== 'undefined' ? COSMETICS : []).find(c => c.id === id);
  lwSlots[lwPickingSlotIdx].type = 'cosmetic';
  lwSlots[lwPickingSlotIdx].cosmetic_id = id;
  lwSlots[lwPickingSlotIdx].label = item ? item.name : id;
  lwPickingSlotIdx = -1;
  const wrap = document.getElementById('lw-card-picker-wrap');
  if(wrap) wrap.style.display = 'none';
  lwRenderBuilder();
}

function lwSaveWheelRound(){
  if(!lwSlots.length){ showToast('Add at least one slot before saving a wheel'); return; }
  try{
    const snap = JSON.parse(JSON.stringify(lwSlots));
    lwWheels.push(snap);
    lwSlots = [];
    lwRenderBuilder();
    lwRenderWheelsSummary();
    showToast('Wheel ' + lwWheels.length + ' saved — build the next set of prizes');
  }catch(e){ showToast('Could not save wheel'); }
}
function lwClearWheelRounds(){
  lwWheels = [];
  lwRenderWheelsSummary();
  showToast('Saved wheels cleared');
}
function lwRenderWheelsSummary(){
  const el = document.getElementById('lw-wheels-summary');
  if(!el) return;
  if(!lwWheels.length){ el.textContent = 'No extra wheels saved (single wheel event)'; return; }
  el.textContent = lwWheels.length + ' wheel(s) saved' + (lwSlots.length ? ' · editing next…' : ' · ready (or build another)');
}
function lwGetActiveSlots(config){
  if(!config) return [];
  if(Array.isArray(config.wheels) && config.wheels.length){
    const idx = Math.max(0, Math.min(config.wheels.length - 1, Number(config.wheel_index) || 0));
    const w = config.wheels[idx];
    return (w && w.slots) ? w.slots : (Array.isArray(w) ? w : (config.slots || []));
  }
  return config.slots || [];
}
function lwUpdateWheelRoundPill(){
  const el = document.getElementById('lw-wheel-round-pill');
  if(!el || !lwEvent) return;
  const cfg = lwEvent.wheel_config || {};
  const wheels = cfg.wheels;
  if(!Array.isArray(wheels) || wheels.length < 2){
    el.style.display = 'none';
    return;
  }
  const idx = Math.max(0, Number(cfg.wheel_index) || 0);
  el.style.display = 'inline';
  el.textContent = 'Wheel ' + (idx + 1) + ' / ' + wheels.length;
}
async function lwAdvanceToNextWheel(){
  if(!lwIsHost || !lwEvent || !sb) return false;
  const cfg = Object.assign({}, lwEvent.wheel_config || {});
  const wheels = cfg.wheels;
  if(!Array.isArray(wheels) || wheels.length < 2) return false;
  const idx = Math.max(0, Number(cfg.wheel_index) || 0);
  if(idx + 1 >= wheels.length){
    showToast('All wheels complete');
    return false;
  }
  const next = idx + 1;
  cfg.wheel_index = next;
  const w = wheels[next];
  cfg.slots = (w && w.slots) ? w.slots : (Array.isArray(w) ? w : cfg.slots);
  try{
    const { data, error } = await sb.from('live_events').update({
      wheel_config: cfg,
      status: 'active',
      last_spin: lwEvent.last_spin || null
    }).eq('id', lwEvent.id).select().maybeSingle();
    if(error) throw error;
    if(data) lwEvent = data;
    else lwEvent.wheel_config = cfg;
    lwRenderWheelFromConfig(cfg);
    lwUpdateWheelRoundPill();
    if(lwChannel){
      try{ await lwChannel.send({ type:'broadcast', event:'wheel_advance', payload:{ wheel_config: cfg } }); }catch(_){}
    }
    showToast('Next wheel ready (' + (next+1) + '/' + wheels.length + ')');
    return true;
  }catch(e){
    console.warn('advance wheel', e);
    return false;
  }
}

function lwNormalizeSlots(slots){
  for(const s of slots){
    // Card slots need a pick; mystery/random may be empty (resolved at spin time)
    if(s.type === 'card' && !s.card_key){
      throw new Error('Every card slot needs a card picked');
    }
    if(s.type === 'cosmetic' && !s.cosmetic_id){
      throw new Error('Every cosmetic slot needs a cosmetic picked');
    }
    if(s.type === 'pack'){
      s.pack_set = s.pack_set || 'Base Set';
      s.pack_qty = Math.max(1, Math.min(20, Number(s.pack_qty) || 1));
    }
    const w = Number(s.weight);
    s.weight = (isFinite(w) && w > 0) ? w : 1;
  }
  return slots;
}
function lwBuildConfigFromBuilder(){
  const mode = (document.getElementById('lw-mode')||{}).value || 'curated';
  const slotCount = Math.max(6, Math.min(24, parseInt((document.getElementById('lw-slot-count')||{}).value,10) || 12));

  if(mode === 'pack_pick'){
    const pack_pool = lwReadPackPoolFromBuilder();
    if(pack_pool.length < 1) throw new Error('Add at least one pack to the pool');
    pack_pool.forEach(p => {
      const hasItems = Array.isArray(p.items) && p.items.length;
      const hasCards = Array.isArray(p.cards) && p.cards.length;
      if(!hasItems && !hasCards){
        // Auto-fill: 7 random cards + 3 mystery (mystery weight 6 so ~35–45% chance overall)
        const slots = lwSlotsFromPackSet(null, 7);
        p.items = slots.map(s => ({ type:'card', card_key: s.card_key, label: s.label, weight: s.weight||1 }));
        for(let m = 0; m < 3; m++){
          p.items.push({ type:'mystery', card_key: null, label: 'Mystery card', weight: 6 });
        }
        p.cards = p.items.filter(it => it.type === 'card' && it.card_key).map(it => it.card_key);
      }
    });
    return {
      mode: 'pack_pick',
      pack_pool,
      picks_locked: false,
      results: [],
      slot_count: 0,
      slots: [],
      wheels: [],
      wheel_index: 0
    };
  }

  let slots = lwSlots.slice();
  if(mode === 'random' && !slots.length){
    slots = Array.from({length: slotCount}, () => ({ type:'random', card_key:null, label:'Random card', weight:1 }));
  }
  const rounds = [];
  for(const saved of lwWheels){
    rounds.push({ slots: lwNormalizeSlots(JSON.parse(JSON.stringify(saved))) });
  }
  if(slots.length){
    rounds.push({ slots: lwNormalizeSlots(slots) });
  }
  if(!rounds.length) throw new Error('Add at least one slot (or save a wheel)');
  const first = rounds[0].slots;
  return {
    mode,
    slot_count: first.length,
    slots: first,
    wheels: rounds,
    wheel_index: 0,
    results: []
  };
}


function lwSlotsFromPackSet(setName, count){
  count = count || 10;
  let pool = (typeof CARDS !== 'undefined' ? CARDS : []);
  if(setName && setName !== 'Mystery'){
    const filtered = pool.filter(c => c && c.set === setName);
    if(filtered.length) pool = filtered;
  }
  const use = pool.length ? pool : (typeof CARDS !== 'undefined' ? CARDS : []);
  if(!use.length){
    return Array.from({length: count}, () => ({ type:'random', card_key:null, label:'Random', weight:1 }));
  }
  const slots = [];
  for(let i=0;i<count;i++){
    const c = use[Math.floor(Math.random()*use.length)];
    const r = String(c.rarity||c.rarityLabel||'').toLowerCase();
    let w = 4;
    if(r.includes('legend') || r.includes('secret') || r.includes('holo')) w = 1;
    else if(r.includes('rare')) w = 2;
    else if(r.includes('uncommon')) w = 3;
    slots.push({ type:'card', card_key: c.key, label: c.name, weight: w });
  }
  return slots;
}
function lwSlotsFromPack(pack){
  if(!pack) return lwSlotsFromPackSet('Base Set', 10);
  // Prefer mixed `items` (cards + mystery + cosmetics)
  if(Array.isArray(pack.items) && pack.items.length){
    return pack.items.map(function(it){
      if(!it || typeof it !== 'object') return { type:'random', card_key:null, label:'Random', weight:1 };
      if(it.type === 'cosmetic'){
        return {
          type: 'cosmetic',
          cosmetic_id: it.cosmetic_id,
          label: it.label || it.cosmetic_id || 'Cosmetic',
          weight: Number(it.weight) > 0 ? Number(it.weight) : 1
        };
      }
      if(it.type === 'mystery' || it.type === 'random'){
        // Mystery defaults to weight 6 so it competes with commons (weight ~3) and hits often
        const mw = Number(it.weight);
        return {
          type: it.type === 'random' ? 'random' : 'mystery',
          card_key: null,
          label: it.label || (it.type === 'random' ? 'Random card' : 'Mystery card'),
          weight: (isFinite(mw) && mw > 0) ? mw : 6
        };
      }
      // card (or legacy plain object with card_key)
      const key = it.card_key || it.key;
      const c = key && typeof cardByKey === 'function' ? cardByKey(key) : null;
      if(!c){
        return { type:'card', card_key: key || null, label: it.label || key || 'Card', weight: Number(it.weight) > 0 ? Number(it.weight) : 1 };
      }
      const r = String(c.rarity||c.rarityLabel||'').toLowerCase();
      let w = Number(it.weight);
      if(!(w > 0)){
        w = 3;
        if(r.includes('legend') || r.includes('secret') || r.includes('holo')) w = 1;
        else if(r.includes('rare')) w = 2;
      }
      return { type:'card', card_key: c.key, label: c.name, weight: w };
    });
  }
  // Legacy: cards as string keys only
  if(Array.isArray(pack.cards) && pack.cards.length){
    return pack.cards.map(function(key){
      if(typeof key === 'object' && key){
        // accidentally stored item objects in cards
        if(key.type === 'cosmetic') return { type:'cosmetic', cosmetic_id:key.cosmetic_id, label:key.label||key.cosmetic_id, weight:1 };
        if(key.type === 'mystery' || key.type === 'random') return { type:key.type, card_key:null, label:key.label||'Mystery', weight:1 };
        key = key.card_key || key.key;
      }
      const c = typeof cardByKey === 'function' ? cardByKey(key) : null;
      if(!c) return { type:'card', card_key: key, label: key, weight: 1 };
      const r = String(c.rarity||c.rarityLabel||'').toLowerCase();
      let w = 3;
      if(r.includes('legend') || r.includes('secret') || r.includes('holo')) w = 1;
      else if(r.includes('rare')) w = 2;
      return { type:'card', card_key: c.key, label: c.name, weight: w };
    });
  }
  return lwSlotsFromPackSet(pack.set, 10);
}
function lwIsPackPickEvent(){
  return !!(lwEvent && lwEvent.wheel_config && lwEvent.wheel_config.mode === 'pack_pick');
}
function lwGetMyClaimedPack(){
  if(!lwEvent || !currentUser) return null;
  const pool = (lwEvent.wheel_config && lwEvent.wheel_config.pack_pool) || [];
  return pool.find(p => p.claimed_by && String(p.claimed_by) === String(currentUser.id)) || null;
}
function lwMyPackArt(){
  try{
    if(typeof randomPackArt === 'function') return randomPackArt();
  }catch(_){}
  return (typeof DEFAULT_PACK_ART !== 'undefined' && DEFAULT_PACK_ART) ? DEFAULT_PACK_ART : 'art/packs/poke-ball.webp';
}
function lwRenderPackPickBoard(){
  const board = document.getElementById('lw-pick-board');
  const grid = document.getElementById('lw-pick-grid');
  const status = document.getElementById('lw-pick-status');
  const ov = document.getElementById('lw-event-overlay');
  if(!board || !grid) return;
  if(!lwIsPackPickEvent()){
    board.style.display = 'none';
    if(ov){ ov.classList.remove('lw-picking'); ov.classList.remove('lw-live'); }
    return;
  }
  const cfg = lwEvent.wheel_config || {};
  const pool = cfg.pack_pool || [];
  const locked = !!cfg.picks_locked;
  if(ov){
    ov.classList.toggle('lw-picking', !locked);
    ov.classList.toggle('lw-live', locked);
  }
  // After lock: hide pack board completely — only the wheel remains
  if(locked){
    board.style.display = 'none';
    return;
  }
  board.style.display = 'block';
  const my = lwGetMyClaimedPack();
  const defaultArt = (typeof DEFAULT_PACK_ART !== 'undefined' && DEFAULT_PACK_ART) ? DEFAULT_PACK_ART : 'art/packs/poke-ball.webp';
  grid.innerHTML = pool.map(p => {
    const taken = !!p.claimed_by;
    const isMine = taken && String(p.claimed_by) === String(currentUser && currentUser.id);
    const cls = (isMine?' mine':'') + (taken && !isMine ? ' taken' : '');
    const claim = taken
      ? ('Taken by ' + (p.claimed_name || 'trainer'))
      : 'Click to claim';
    const canClick = !taken && !my;
    const art = (taken && p.pack_art) ? p.pack_art : defaultArt;
    return '<button type="button" class="lw-pick-tile'+cls+'" '+(canClick?('onclick="lwClaimPack(\''+String(p.id).replace(/'/g,"\\'")+'\')"'):'disabled')+'>'+
      '<img class="lw-pick-art" src="'+art+'" alt="">'+
      '<div class="lw-pick-set">Mystery Pack</div>'+
      '<div class="lw-pick-claim">'+String(claim).replace(/</g,'&lt;')+'</div></button>';
  }).join('');
  const claimed = pool.filter(p => p.claimed_by).length;
  if(status){
    status.textContent = my
      ? ('You claimed a pack · waiting for host to lock')
      : ('Claim a pack · '+claimed+'/'+pool.length+' taken');
  }
}
async function lwApplyPackClaim(packId, userId, userName, packArt){
  if(!lwEvent || !sb) return { ok:false, error:'no event' };
  const cfg = Object.assign({}, lwEvent.wheel_config || {});
  if(cfg.picks_locked) return { ok:false, error:'locked' };
  const pool = (cfg.pack_pool || []).map(p => Object.assign({}, p));
  if(pool.some(p => String(p.claimed_by) === String(userId))) return { ok:false, error:'already' };
  const target = pool.find(p => p.id === packId);
  if(!target) return { ok:false, error:'missing' };
  if(target.claimed_by) return { ok:false, error:'taken' };
  target.claimed_by = userId;
  target.claimed_name = userName;
  if(packArt) target.pack_art = packArt;
  cfg.pack_pool = pool;
  try{
    const { data, error } = await sb.from('live_events').update({ wheel_config: cfg })
      .eq('id', lwEvent.id).select().maybeSingle();
    if(error) throw error;
    if(!data){
      lwEvent.wheel_config = cfg;
      if(lwChannel){
        try{ await lwChannel.send({ type:'broadcast', event:'pack_picks', payload:{ wheel_config: cfg } }); }catch(_){}
      }
      return { ok:true, optimistic:true };
    }
    lwEvent = data;
    if(lwChannel){
      try{ await lwChannel.send({ type:'broadcast', event:'pack_picks', payload:{ wheel_config: lwEvent.wheel_config } }); }catch(_){}
    }
    return { ok:true };
  }catch(e){
    return { ok:false, error: e.message || 'write failed' };
  }
}
async function lwClaimPack(packId){
  if(!lwEvent || !currentUser || !lwIsPackPickEvent()) return;
  const cfg = lwEvent.wheel_config || {};
  if(cfg.picks_locked){ showToast('Picks are locked'); return; }
  if((cfg.pack_pool||[]).some(p => String(p.claimed_by) === String(currentUser.id))){
    showToast('You already claimed a pack'); return;
  }
  const target = (cfg.pack_pool||[]).find(p => p.id === packId);
  if(!target){ showToast('Pack not found'); return; }
  if(target.claimed_by){ showToast('Already taken'); return; }
  const name = currentUser.display_name || currentUser.username;
  const packArt = typeof lwMyPackArt === 'function' ? lwMyPackArt() : ((typeof randomPackArt === 'function') ? randomPackArt() : 'art/packs/poke-ball.webp');
  // Always ask host to apply (prevents two clients owning the same pack)
  if(lwChannel){
    try{
      await lwChannel.send({
        type:'broadcast',
        event:'claim_request',
        payload:{ packId, userId: currentUser.id, userName: name, packArt: packArt }
      });
    }catch(_){}
  }
  // Host also applies locally; non-host waits for pack_picks broadcast
  if(lwIsHost){
    const res = await lwApplyPackClaim(packId, currentUser.id, name, packArt);
    if(!res.ok){
      if(res.error === 'taken') showToast('Already taken');
      else if(res.error === 'already') showToast('You already claimed a pack');
      else showToast(res.error || 'Could not claim');
      lwRenderPackPickBoard();
      return;
    }
    showToast('Pack claimed');
    lwRenderPackPickBoard();
  } else {
    showToast('Claiming…');
    // brief optimistic highlight only if still free
    const pool = (cfg.pack_pool || []).map(p => Object.assign({}, p));
    const t = pool.find(p => p.id === packId);
    if(t && !t.claimed_by && !pool.some(p => String(p.claimed_by)===String(currentUser.id))){
      t.claimed_by = currentUser.id;
      t.claimed_name = name;
      t.pack_art = packArt;
      lwEvent.wheel_config = Object.assign({}, cfg, { pack_pool: pool });
      lwRenderPackPickBoard();
    }
  }
}
async function lwLockPackPicks(){
  if(!lwIsHost || !lwEvent || !sb) return;
  if(!lwIsPackPickEvent()){ showToast('Not a pack-pick event'); return; }
  const cfg = Object.assign({}, lwEvent.wheel_config || {});
  const pool = (cfg.pack_pool || []).map(p => Object.assign({}, p));
  const hostId = lwEvent.created_by || currentUser.id;
  const hostName = (currentUser.display_name || currentUser.username || 'Host') + ' (host)';
  const hostArt = typeof lwMyPackArt === 'function' ? lwMyPackArt() : ((typeof randomPackArt === 'function') ? randomPackArt() : 'art/packs/poke-ball.webp');
  // Leftovers → host
  pool.forEach(p => {
    if(!p.claimed_by){
      p.claimed_by = hostId;
      p.claimed_name = hostName;
      p.leftover = true;
      p.pack_art = hostArt;
    }
  });
  // One spin per pack — shuffle order randomly
  const turnOrder = pool.map(p => ({
    packId: p.id,
    userId: p.claimed_by,
    userName: p.claimed_name
  }));
  for(let i = turnOrder.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = turnOrder[i]; turnOrder[i] = turnOrder[j]; turnOrder[j] = tmp;
  }
  cfg.pack_pool = pool;
  cfg.picks_locked = true;
  cfg.turn_order = turnOrder;
  cfg.turn_index = 0;
  const first = turnOrder[0];
  const firstPack = first ? pool.find(p => p.id === first.packId) : null;
  if(firstPack){
    const slots = typeof lwSlotsFromPack === 'function' ? lwSlotsFromPack(firstPack) : lwSlotsFromPackSet(null, 10);
    cfg.slots = slots;
    cfg.wheels = [{ slots }];
    cfg.wheel_index = 0;
  }
  try{
    const { data, error } = await sb.from('live_events').update({
      wheel_config: cfg,
      status: 'active',
      current_spinner_id: first ? first.userId : null
    }).eq('id', lwEvent.id).select().maybeSingle();
    if(error) throw error;
    if(data) lwEvent = data;
    else { lwEvent.wheel_config = cfg; lwEvent.current_spinner_id = first ? first.userId : null; lwEvent.status = 'active'; }
    // Queue = remaining turns after the first
    lwSpinnerQueue = turnOrder.slice(1).map(t => t.userId);
    lwTurnOrder = turnOrder.slice();
    lwTurnIndex = 0;
    lwRenderPackPickBoard();
    lwRenderWheelFromConfig(cfg);
    lwUpdateSpinButton();
    lwRenderPresence();
    lwRenderSpinnerQueue();
    if(lwChannel){
      try{
        await lwChannel.send({
          type:'broadcast',
          event:'pack_picks',
          payload:{
            wheel_config: cfg,
            current_spinner_id: first ? first.userId : null,
            status:'active',
            turn_order: turnOrder
          }
        });
      }catch(_){}
    }
    const nm = first ? (first.userName || 'trainer') : 'nobody';
    showToast('Picks locked · ' + nm + ' spins first · ' + turnOrder.length + ' pack(s) total');
  }catch(e){
    console.error(e);
    showToast(e.message || 'Lock failed');
  }
}
function lwPacksForUser(userId){
  if(!lwEvent) return [];
  return ((lwEvent.wheel_config && lwEvent.wheel_config.pack_pool) || []).filter(p => String(p.claimed_by)===String(userId));
}
function lwPrepareReelForSpinner(userId){
  if(!lwIsPackPickEvent() || !lwEvent) return null;
  const cfg = lwEvent.wheel_config || {};
  // Prefer the pack assigned to the current turn
  if(Array.isArray(cfg.turn_order) && cfg.turn_order.length){
    const idx = Number(cfg.turn_index) || 0;
    const turn = cfg.turn_order[idx];
    if(turn && String(turn.userId) === String(userId)){
      const pack = (cfg.pack_pool || []).find(p => p.id === turn.packId);
      if(pack){
        const slots = typeof lwSlotsFromPack === 'function' ? lwSlotsFromPack(pack) : lwSlotsFromPackSet(null, 10);
        return { pack, slots };
      }
    }
  }
  const packs = lwPacksForUser(userId);
  if(!packs.length) return null;
  const pack = packs.find(p => !p.consumed) || packs[0];
  const slots = typeof lwSlotsFromPack === 'function' ? lwSlotsFromPack(pack) : lwSlotsFromPackSet(null, 10);
  return { pack, slots };
}
async function lwMarkPackConsumed(userId){
  if(!lwEvent || !lwIsPackPickEvent()) return;
  const cfg = Object.assign({}, lwEvent.wheel_config || {});
  const pool = (cfg.pack_pool || []).map(p => Object.assign({}, p));
  // Prefer the pack for the current turn
  let pack = null;
  if(Array.isArray(cfg.turn_order) && cfg.turn_order[cfg.turn_index || 0]){
    const tid = cfg.turn_order[cfg.turn_index || 0].packId;
    pack = pool.find(p => p.id === tid);
  }
  if(!pack) pack = pool.find(p => String(p.claimed_by)===String(userId) && !p.consumed);
  if(pack) pack.consumed = true;
  cfg.pack_pool = pool;
  try{
    const { data } = await sb.from('live_events').update({ wheel_config: cfg }).eq('id', lwEvent.id).select().maybeSingle();
    if(data) lwEvent = data;
    else lwEvent.wheel_config = cfg;
  }catch(e){ console.warn(e); }
}
async function lwAppendResult(spin){
  if(!lwEvent || !spin) return;
  const cfg = Object.assign({}, lwEvent.wheel_config || {});
  const results = Array.isArray(cfg.results) ? cfg.results.slice() : [];
  let entry = results.find(r => String(r.userId)===String(spin.winnerId));
  if(!entry){
    entry = { userId: spin.winnerId, userName: spin.winnerName, prizes: [] };
    results.push(entry);
  }
  entry.prizes.push({
    kind: spin.kind,
    cardKey: spin.cardKey || null,
    cardName: spin.cardName || spin.prizeLabel || null,
    pack_set: spin.pack_set || null,
    wasMystery: !!spin.wasMystery,
    at: spin.at || new Date().toISOString()
  });
  cfg.results = results;
  try{
    const { data } = await sb.from('live_events').update({ wheel_config: cfg }).eq('id', lwEvent.id).select().single();
    if(data) lwEvent = data;
    if(lwChannel){
      try{ await lwChannel.send({ type:'broadcast', event:'results', payload:{ results } }); }catch(_){}
    }
  }catch(e){ console.warn('results', e); }
}
function lwShowResultsBoard(){
  const ov = document.getElementById('lw-results-overlay');
  const body = document.getElementById('lw-results-body');
  if(!ov || !body) return;
  const results = (lwEvent && lwEvent.wheel_config && lwEvent.wheel_config.results) || (typeof lwResultsSnapshot!=='undefined' && lwResultsSnapshot) || [];
  if(!results.length){
    body.innerHTML = '<p style="color:var(--muted)">No prizes recorded yet.</p>';
  } else {
    body.innerHTML = results.map(r => {
      const cards = (r.prizes||[]).map(p => {
        let art = '', name = p.cardName || p.cardKey || p.kind || 'Prize';
        if(p.cardKey && typeof cardByKey === 'function'){
          const c = cardByKey(p.cardKey);
          if(c){ art = c.art||''; name = c.name||name; }
        }
        return '<div class="lw-results-card">'+(art?('<img src="'+art+'" alt="">'):('<div style="height:126px;display:grid;place-items:center;font-size:2rem;border:1px solid #3a4560;border-radius:8px">🎴</div>'))+
          '<span>'+String(name).replace(/</g,'&lt;')+'</span></div>';
      }).join('');
      return '<div class="lw-results-row"><h3>'+String(r.userName||'Trainer').replace(/</g,'&lt;')+' · '+(r.prizes||[]).length+' prize(s)</h3><div class="lw-results-cards">'+
        (cards || '<span style="color:var(--muted)">No cards</span>')+'</div></div>';
    }).join('');
  }
  ov.classList.add('show');
}


async function lwCreateEvent(){
  const msg = document.getElementById('lw-create-msg');
  if(msg){ msg.textContent = ''; msg.className = 'lw-msg'; }
  if(!sb || !currentUser?.is_admin){ if(msg){ msg.textContent = 'Admin only'; msg.className='lw-msg err'; } return; }
  let config;
  try{ config = lwBuildConfigFromBuilder(); }
  catch(e){ if(msg){ msg.textContent = e.message; msg.className='lw-msg err'; } return; }

  const inviteeIds = lwGetSelectedInviteeIds();
  if(!inviteeIds.length){
    if(msg){ msg.textContent = 'Select at least one player who can enter'; msg.className='lw-msg err'; }
    return;
  }
  config.invited_ids = inviteeIds;

  const title = ((document.getElementById('lw-title')||{}).value || 'Live Prize Wheel').trim() || 'Live Prize Wheel';
  const code = lwRandomCode(); // internal id only — players never type this
  try{
    const { data, error } = await sb.from('live_events').insert({
      code,
      title,
      created_by: currentUser.id,
      status: 'lobby',
      wheel_config: config,
      current_spinner_id: null,
      last_spin: null
    }).select().single();
    if(error) throw error;
    lwEvent = data;
    lwIsHost = true;

    // Broadcast invites to selected players
    await lwBroadcastInvites(data, inviteeIds);

    // Host enters the overlay room
    await lwEnterRoom();
    if(msg){ msg.textContent = 'Event started — invites sent to ' + inviteeIds.length + ' player(s)'; msg.className='lw-msg ok'; }
    showToast('Live event started · invites sent');
  }catch(e){
    console.error(e);
    if(msg){
      msg.textContent = e.message || 'Could not create event (did you run sql/003_live_wheel.sql?)';
      msg.className = 'lw-msg err';
    }
  }
}

async function lwBroadcastInvites(eventRow, inviteeIds){
  // Ensure global invite channel
  if(!lwInviteChannel){
    await lwEnsureInviteChannel();
  }
  if(!lwInviteChannel) return;
  const payload = {
    eventId: eventRow.id,
    code: eventRow.code,
    title: eventRow.title || 'Live Prize Wheel',
    invitedIds: inviteeIds,
    from: currentUser.display_name || currentUser.username,
    at: new Date().toISOString()
  };
  try{
    await lwInviteChannel.send({ type: 'broadcast', event: 'invite', payload });
  }catch(e){ console.warn('invite broadcast', e); }
}

async function lwEnsureInviteChannel(){
  if(!sb || !currentUser) return;
  if(lwInviteChannel) return;
  lwInviteChannel = sb.channel('live-event-invites-global');
  lwInviteChannel
    .on('broadcast', { event: 'invite' }, ({ payload }) => {
      if(!payload || !currentUser) return;
      const ids = payload.invitedIds || [];
      if(!ids.includes(currentUser.id)) return;
      // Don't popup for host
      if(payload.eventId && lwEvent && lwEvent.id === payload.eventId) return;
      lwShowInvitePopup(payload);
    })
    .subscribe();
}

function lwShowInvitePopup(payload){
  lwPendingInvite = payload;
  const modal = document.getElementById('lw-invite-modal');
  if(!modal) return;
  const title = document.getElementById('lw-invite-title');
  const body = document.getElementById('lw-invite-body');
  if(title) title.textContent = 'You\'re invited!';
  if(body) body.textContent = (payload.from || 'Admin') + ' invited you to “' + (payload.title || 'Live Event') + '”. Join to watch and spin live.';
  modal.style.display = 'flex';
}

function lwDismissInvite(){
  lwPendingInvite = null;
  const modal = document.getElementById('lw-invite-modal');
  if(modal) modal.style.display = 'none';
}

async function lwAcceptInvite(){
  const inv = lwPendingInvite;
  lwDismissInvite();
  if(!inv || !inv.eventId || !sb || !currentUser) return;
  try{
    const { data, error } = await sb.from('live_events')
      .select('*')
      .eq('id', inv.eventId)
      .in('status', ['lobby','active','spinning'])
      .maybeSingle();
    if(error) throw error;
    if(!data){ showToast('Event already ended'); return; }
    // Verify still invited
    const invited = (data.wheel_config && data.wheel_config.invited_ids) || [];
    if(invited.length && !invited.includes(currentUser.id) && data.created_by !== currentUser.id && !currentUser.is_admin){
      showToast('You are not on the invite list');
      return;
    }
    lwEvent = data;
    lwIsHost = (data.created_by === currentUser.id) || !!currentUser.is_admin;
    await lwEnterRoom();
  }catch(e){
    console.error(e);
    showToast(e.message || 'Could not join event');
  }
}


async function lwEnterRoom(){
  if(!lwEvent || !sb || !currentUser) return;
  try{
    await sb.from('live_event_members').upsert({
      event_id: lwEvent.id,
      user_id: currentUser.id
    }, { onConflict: 'event_id,user_id' });
  }catch(e){ console.warn('member upsert', e); }

  lwShowRoom();
  const titleEl = document.getElementById('lw-room-title');
  if(titleEl) titleEl.textContent = lwEvent.title || 'Live Prize Wheel';
  const ovTitle = document.getElementById('lw-overlay-title');
  if(ovTitle) ovTitle.textContent = lwEvent.title || 'Live Prize Wheel';
  const hostCtrl = document.getElementById('lw-host-controls');
  if(hostCtrl) hostCtrl.style.display = lwIsHost ? 'block' : 'none';
  const badge = document.getElementById('lw-hero-badge');
  if(badge){ badge.textContent = '🔴 LIVE EVENT'; badge.classList.add('live'); }

  lwRenderWheelFromConfig(lwEvent.wheel_config);
  lwUpdateStatusPill(lwEvent.status);
  lwUpdateWheelRoundPill();
  lwUpdateSpinButton();
  lwRenderPackPickBoard();
  await lwSubscribe();
  await lwRefreshMembers();
  if(lwEvent.last_spin) lwShowLastResult(lwEvent.last_spin, false);
}

async function lwSubscribe(){
  if(lwChannel){ try{ await sb.removeChannel(lwChannel); }catch(e){} lwChannel = null; }
  if(!lwEvent) return;

  lwChannel = sb.channel('live-wheel-'+lwEvent.id, {
    config: { presence: { key: currentUser.id } }
  });

  lwChannel
    .on('presence', { event: 'sync' }, () => {
      const state = lwChannel.presenceState();
      lwPresenceMap = {};
      Object.values(state).forEach(arr => {
        (arr||[]).forEach(p => { if(p.user_id) lwPresenceMap[p.user_id] = p; });
      });
      lwRenderPresence();
      lwRefreshMembers();
    })
    .on('broadcast', { event: 'spinner' }, ({ payload }) => {
      if(!payload || !lwEvent) return;
      if(payload.current_spinner_id) lwEvent.current_spinner_id = payload.current_spinner_id;
      if(payload.status) lwEvent.status = payload.status;
      lwUpdateSpinButton();
      lwRenderPresence();
    })
    .on('broadcast', { event: 'event_ended' }, ({ payload }) => {
      lwForceCloseRoom((payload && payload.reason) || 'ended');
    })
    .on('broadcast', { event: 'wheel_advance' }, ({ payload }) => {
      if(!payload || !payload.wheel_config || !lwEvent) return;
      lwEvent.wheel_config = payload.wheel_config;
      lwRenderWheelFromConfig(payload.wheel_config);
      lwUpdateWheelRoundPill();
      showToast('Next wheel is ready');
    })
    .on('broadcast', { event: 'claim_request' }, ({ payload }) => {
      if(!payload || !lwEvent || !lwIsHost) return;
      if(!payload.packId || !payload.userId) return;
      // Host is authority — only one claim per pack and per user
      lwApplyPackClaim(payload.packId, payload.userId, payload.userName || 'Trainer', payload.packArt).then(res => {
        lwRenderPackPickBoard();
        if(res && !res.ok && res.error === 'taken'){
          // push corrected state so client drops optimistic claim
          if(lwChannel && lwEvent.wheel_config){
            lwChannel.send({ type:'broadcast', event:'pack_picks', payload:{ wheel_config: lwEvent.wheel_config } }).catch(function(){});
          }
        }
      });
    })
    .on('broadcast', { event: 'pack_picks' }, ({ payload }) => {
      if(!payload || !lwEvent) return;
      if(payload.wheel_config) lwEvent.wheel_config = payload.wheel_config;
      if(payload.current_spinner_id != null) lwEvent.current_spinner_id = payload.current_spinner_id;
      if(payload.status) lwEvent.status = payload.status;
      if(payload.turn_order){
        lwTurnOrder = payload.turn_order;
        lwTurnIndex = Number(payload.turn_index) || 0;
        lwSpinnerQueue = lwTurnOrder.slice(lwTurnIndex + 1).map(t => t.userId);
      }
      lwRenderPackPickBoard();
      if(payload.wheel_config && payload.wheel_config.picks_locked) lwRenderWheelFromConfig(payload.wheel_config);
      lwUpdateSpinButton();
      lwRenderPresence();
      if(typeof lwRenderSpinnerQueue === 'function') lwRenderSpinnerQueue();
    })
    .on('broadcast', { event: 'show_results' }, ({ payload }) => {
      if(payload && payload.results && lwEvent){
        if(!lwEvent.wheel_config) lwEvent.wheel_config = {};
        lwEvent.wheel_config.results = payload.results;
      }
      if(payload && payload.results) lwResultsSnapshot = payload.results;
      lwShowResultsBoard();
    })
    .on('broadcast', { event: 'results' }, ({ payload }) => {
      if(!payload || !lwEvent) return;
      if(!lwEvent.wheel_config) lwEvent.wheel_config = {};
      if(payload.results) lwEvent.wheel_config.results = payload.results;
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_events', filter: `id=eq.${lwEvent.id}` }, payload => {
      if(payload.new){
        const prevSpin = lwEvent && lwEvent.last_spin;
        lwEvent = payload.new;
        if(lwEvent.status === 'ended'){
          lwForceCloseRoom('ended');
          return;
        }
        lwUpdateStatusPill(lwEvent.status);
        lwUpdateSpinButton();
        if(lwEvent.wheel_config) lwRenderWheelFromConfig(lwEvent.wheel_config);
        lwUpdateWheelRoundPill();
        lwRenderPackPickBoard();
        lwRefreshMembers();
        // If another client triggered a spin, play it (avoid double-play for the spinner)
        if(payload.eventType === 'UPDATE' && payload.new.last_spin){
          const ns = payload.new.last_spin;
          const same = prevSpin && prevSpin.at === ns.at && prevSpin.seed === ns.seed;
          if(!same && ns.winnerId !== currentUser.id){
            lwPlaySynchronizedSpin(ns);
          }
        }
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_event_members', filter: `event_id=eq.${lwEvent.id}` }, () => {
      lwRefreshMembers();
    })
    .on('broadcast', { event: 'spin' }, ({ payload }) => {
      if(payload && payload.winnerId !== currentUser?.id){
        lwPlaySynchronizedSpin(payload);
      }
    })
    .on('broadcast', { event: 'spin_done' }, async ({ payload }) => {
      // Host: a player finished their spin — advance to next
      if(!lwIsHost || !payload) return;
      if(payload.winnerId === currentUser?.id) return;
      try{
        if(lwIsPackPickEvent()){
          await lwAdvanceSpinnerQueue();
          const pool = (lwEvent && lwEvent.wheel_config && lwEvent.wheel_config.pack_pool) || [];
          if(pool.length && pool.every(p => p.consumed)){
            showToast('All packs opened');
            const results = (lwEvent.wheel_config && lwEvent.wheel_config.results) || [];
            lwResultsSnapshot = results;
            if(lwChannel){
              try{ await lwChannel.send({ type:'broadcast', event:'show_results', payload:{ results } }); }catch(_){}
            }
            lwShowResultsBoard();
          }
        } else {
          if(lwSpinnerQueue.length) await lwAdvanceSpinnerQueue();
        }
      }catch(e){ console.warn('spin_done advance', e); }
    })
    .subscribe(async (status) => {
      if(status === 'SUBSCRIBED'){
        await lwChannel.track({
          user_id: currentUser.id,
          username: currentUser.username,
          display_name: currentUser.display_name || currentUser.username,
          online_at: new Date().toISOString()
        });
      }
    });
}

async function lwRefreshMembers(){
  if(!lwEvent || !sb) return;
  try{
    const idSet = new Set();
    // DB members
    try{
      const { data: mems } = await sb.from('live_event_members')
        .select('user_id, joined_at')
        .eq('event_id', lwEvent.id);
      (mems||[]).forEach(m => { if(m.user_id) idSet.add(m.user_id); });
    }catch(e){ console.warn('members table', e); }
    // Presence (players in the room right now)
    Object.keys(lwPresenceMap || {}).forEach(id => idSet.add(id));
    // Always include self + current spinner
    if(currentUser && currentUser.id) idSet.add(currentUser.id);
    if(lwEvent.current_spinner_id) idSet.add(lwEvent.current_spinner_id);
    if(lwEvent.host_id) idSet.add(lwEvent.host_id);
    if(lwEvent.creator_id) idSet.add(lwEvent.creator_id);

    const ids = [...idSet];
    if(!ids.length){ lwMembers = []; lwRenderPresence(); lwFillSpinnerSelect(); return; }

    let profiles = [];
    try{
      const { data } = await sb.from('profiles')
        .select('id, username, display_name')
        .in('id', ids);
      profiles = data || [];
    }catch(e){ console.warn('profiles fetch', e); }

    // Merge presence metadata so we still show names if RLS hides some profiles
    const byId = {};
    profiles.forEach(p => { byId[p.id] = p; });
    ids.forEach(id => {
      if(byId[id]) return;
      const p = lwPresenceMap[id];
      byId[id] = {
        id,
        username: (p && (p.username || p.display_name)) || ('trainer_'+String(id).slice(0,6)),
        display_name: (p && (p.display_name || p.username)) || null
      };
      if(currentUser && id === currentUser.id){
        byId[id].display_name = currentUser.display_name || currentUser.username;
        byId[id].username = currentUser.username;
      }
    });
    lwMembers = ids.map(id => byId[id]).filter(Boolean);
    lwRenderPresence();
    lwFillSpinnerSelect();
  }catch(e){ console.warn('lwRefreshMembers', e); }
}

function lwRenderPresence(){
  const el = document.getElementById('lw-presence');
  if(!el) return;
  const spinnerId = lwEvent && lwEvent.current_spinner_id;
  if(!lwMembers.length){
    el.innerHTML = '<span style="color:var(--muted);font-size:.85rem">Waiting for trainers…</span>';
    return;
  }
  el.innerHTML = lwMembers.map(m => {
    const isYou = m.id === currentUser?.id;
    const isSpinner = String(m.id) === String(spinnerId||'');
    const online = !!lwPresenceMap[m.id];
    return `<span class="lw-presence-chip ${isYou?'you':''} ${isSpinner?'spinner':''}">
      <span class="dot" style="${online?'':'background:#5a6480;box-shadow:none'}"></span>
      ${m.display_name || m.username}${isYou?' (you)':''}${isSpinner?' · SPINNER':''}
    </span>`;
  }).join('');
}

function lwFillSpinnerSelect(){
  const sel = document.getElementById('lw-spinner-select');
  if(!sel) return;
  const cur = lwEvent && lwEvent.current_spinner_id;
  sel.innerHTML = '<option value="">— choose player —</option>' +
    lwMembers.map(m => `<option value="${m.id}" ${String(m.id)===String(cur)?'selected':''}>${m.display_name||m.username}</option>`).join('');
  if(typeof lwRenderSpinnerQueue==='function') lwRenderSpinnerQueue();
}


let lwSpinnerQueue = []; // ordered user ids for successive spins
let lwTurnOrder = []; // [{packId,userId,userName}] for pack-pick
let lwTurnIndex = 0;
let lwResultsSnapshot = null;

function lwRenderSpinnerQueue(){
  const el = document.getElementById('lw-spinner-queue');
  if(!el) return;
  if(!lwSpinnerQueue.length){
    el.innerHTML = 'Spin queue empty — set a spinner or add players to the queue for back-to-back turns.';
    return;
  }
  el.innerHTML = '<b style="color:var(--gold)">Spin queue:</b> ' + lwSpinnerQueue.map((id,i) => {
    const m = lwMembers.find(x => String(x.id)===String(id));
    const nm = m ? (m.display_name||m.username) : String(id).slice(0,6);
    const cur = lwEvent && String(lwEvent.current_spinner_id)===String(id);
    return '<span style="display:inline-block;margin:2px 4px;padding:2px 8px;border-radius:999px;border:1px solid '+(cur?'var(--gold)':'#35415d')+';color:'+(cur?'var(--gold)':'#c8c3bd')+'">'+(i+1)+'. '+nm+(cur?' ← spinning':'')+'</span>';
  }).join('') +
  ' <button type="button" class="btn btn-secondary" style="padding:.2rem .45rem;font-size:.72rem;margin-left:.35rem" onclick="lwSpinnerQueue=[];lwRenderSpinnerQueue()">Clear queue</button>';
}
function lwQueueAddSpinner(){
  const sel = document.getElementById('lw-spinner-select');
  const uid = sel && sel.value;
  if(!uid){ showToast('Pick a player first'); return; }
  if(lwSpinnerQueue.some(id => String(id)===String(uid))){ showToast('Already in queue'); return; }
  lwSpinnerQueue.push(uid);
  lwRenderSpinnerQueue();
  // If no current spinner, set them now
  if(lwEvent && !lwEvent.current_spinner_id) lwSetSpinner();
  else showToast('Added to spin queue');
}
async function lwAdvanceSpinnerQueue(){
  if(!lwIsHost || !lwEvent) return;
  // Restore turn order from event config if local state was lost (refresh / race)
  const cfgRestore = lwEvent.wheel_config || {};
  if(lwIsPackPickEvent() && (!Array.isArray(lwTurnOrder) || !lwTurnOrder.length) && Array.isArray(cfgRestore.turn_order) && cfgRestore.turn_order.length){
    lwTurnOrder = cfgRestore.turn_order.slice();
    lwTurnIndex = Number(cfgRestore.turn_index) || 0;
  }
  // Pack-pick: advance turn_order by pack
  if(lwIsPackPickEvent() && Array.isArray(lwTurnOrder) && lwTurnOrder.length){
    lwTurnIndex = (Number(lwTurnIndex) || 0) + 1;
    if(lwTurnIndex >= lwTurnOrder.length){
      lwSpinnerQueue = [];
      // Clear spinner so nobody keeps spinning
      try{
        await sb.from('live_events').update({ current_spinner_id: null, status: 'active' }).eq('id', lwEvent.id);
        if(lwEvent) lwEvent.current_spinner_id = null;
      }catch(_){}
      lwUpdateSpinButton();
      lwRenderSpinnerQueue();
      showToast('All pack spins complete');
      return;
    }
    const next = lwTurnOrder[lwTurnIndex];
    const cfg = Object.assign({}, lwEvent.wheel_config || {});
    cfg.turn_index = lwTurnIndex;
    const pool = cfg.pack_pool || [];
    const pack = pool.find(p => p.id === next.packId);
    if(pack){
      const slots = typeof lwSlotsFromPack === 'function' ? lwSlotsFromPack(pack) : lwSlotsFromPackSet(null, 10);
      cfg.slots = slots;
      cfg.wheels = [{ slots }];
      cfg.wheel_index = 0;
    }
    try{
      const { data, error } = await sb.from('live_events').update({
        wheel_config: cfg,
        current_spinner_id: next.userId,
        status: 'active'
      }).eq('id', lwEvent.id).select().maybeSingle();
      if(error) throw error;
      if(data) lwEvent = data;
      else {
        lwEvent.wheel_config = cfg;
        lwEvent.current_spinner_id = next.userId;
        lwEvent.status = 'active';
      }
      lwSpinnerQueue = lwTurnOrder.slice(lwTurnIndex + 1).map(t => t.userId);
      if(cfg.slots) lwRenderWheelFromConfig(cfg);
      lwUpdateSpinButton();
      lwRenderPresence();
      lwRenderSpinnerQueue();
      if(lwChannel){
        try{
          await lwChannel.send({
            type:'broadcast',
            event:'pack_picks',
            payload:{
              wheel_config: cfg,
              current_spinner_id: next.userId,
              status:'active',
              turn_order: lwTurnOrder,
              turn_index: lwTurnIndex
            }
          });
        }catch(_){}
      }
      showToast('Next up: ' + (next.userName || 'trainer'));
    }catch(e){ console.warn('advance pack turn', e); }
    return;
  }

  if(lwSpinnerQueue.length && String(lwSpinnerQueue[0]) === String(lwEvent.current_spinner_id)){
    lwSpinnerQueue.shift();
  }
  if(!lwSpinnerQueue.length){
    lwRenderSpinnerQueue();
    return;
  }
  const nextId = lwSpinnerQueue[0];
  let patch = { current_spinner_id: nextId, status: 'active' };
  try{
    const { data, error } = await sb.from('live_events').update(patch).eq('id', lwEvent.id).select().maybeSingle();
    if(error) throw error;
    if(data) lwEvent = data;
    else { lwEvent.current_spinner_id = nextId; lwEvent.status = 'active'; }
    lwUpdateSpinButton();
    lwRenderPresence();
    lwRenderSpinnerQueue();
    if(lwChannel){
      try{ await lwChannel.send({ type:'broadcast', event:'spinner', payload:{ current_spinner_id: nextId, status:'active' } }); }catch(_){}
    }
    const m = lwMembers.find(x => String(x.id)===String(nextId));
    showToast('Next spinner: ' + (m ? (m.display_name||m.username) : 'trainer'));
  }catch(e){ console.warn('advance spinner', e); }
}

function lwUpdateStatusPill(status){
  const el = document.getElementById('lw-status-pill');
  if(!el) return;
  el.className = 'lw-status-pill';
  const map = { lobby:'Lobby', active:'Live', spinning:'Spinning…', ended:'Ended' };
  el.textContent = map[status] || status;
  if(status === 'spinning') el.classList.add('spinning');
  if(status === 'ended') el.classList.add('ended');
}

function lwIsCurrentSpinner(){
  if(!lwEvent || !currentUser) return false;
  return String(lwEvent.current_spinner_id || '') === String(currentUser.id || '');
}
/** True if this player's current pack-turn is already consumed */
function lwMyCurrentPackConsumed(){
  if(!lwIsPackPickEvent() || !lwEvent || !currentUser) return false;
  const cfg = lwEvent.wheel_config || {};
  const pool = cfg.pack_pool || [];
  if(Array.isArray(cfg.turn_order) && cfg.turn_order.length){
    const idx = Number(cfg.turn_index) || 0;
    const turn = cfg.turn_order[idx];
    if(turn && String(turn.userId) === String(currentUser.id)){
      const pack = pool.find(p => p.id === turn.packId);
      return !!(pack && pack.consumed);
    }
  }
  const mine = pool.find(p => String(p.claimed_by) === String(currentUser.id) && !p.consumed);
  return !mine;
}
function lwUpdateSpinButton(){
  const btn = document.getElementById('lw-spin-btn');
  if(!btn || !lwEvent) return;
  const isSpinner = lwIsCurrentSpinner();
  const statusOk = (lwEvent.status === 'active' || lwEvent.status === 'lobby');
  const packDone = lwIsPackPickEvent() && lwMyCurrentPackConsumed();
  const canSpin = isSpinner && statusOk && !lwSpinning && !packDone;
  btn.disabled = !canSpin;
  if(lwSpinning) btn.textContent = 'SPINNING…';
  else if(packDone && isSpinner) btn.textContent = 'Already spun';
  else if(isSpinner && statusOk) btn.textContent = 'SPIN';
  else if(isSpinner) btn.textContent = 'Waiting for event…';
  else btn.textContent = 'Waiting for your turn…';
}

function lwSegColors(i){
  const palette = ['#1a2744','#1e1a3a','#1a2e2a','#2a1e28','#1a2438','#221a30','#182838','#2a2030'];
  return palette[i % palette.length];
}

const LW_ITEM_W = 128; // 120 + 8 margin

/** Weighted random index into slots array (uses slot.weight, default 1). */
function lwWeightedIndex(slots){
  if(!slots || !slots.length) return 0;
  let total = 0;
  for(let i = 0; i < slots.length; i++){
    const w = Number(slots[i] && slots[i].weight);
    total += (isFinite(w) && w > 0) ? w : 1;
  }
  if(total <= 0) return Math.floor(Math.random() * slots.length);
  let r = Math.random() * total;
  for(let i = 0; i < slots.length; i++){
    const w = Number(slots[i] && slots[i].weight);
    r -= (isFinite(w) && w > 0) ? w : 1;
    if(r <= 0) return i;
  }
  return slots.length - 1;
}

function lwSlotRarityClass(slot){
  if(!slot) return 'rarity-common';
  if(slot.type === 'mystery' || slot.type === 'random') return 'mystery';
  if(slot.type === 'pack') return 'rarity-uncommon';
  if(slot.type === 'cosmetic') return 'rarity-rare';
  const c = slot.card_key ? (typeof cardByKey === 'function' ? cardByKey(slot.card_key) : null) : null;
  const r = (c && (c.rarity || c.rarityLabel) || '').toLowerCase();
  if(r.includes('legend') || r.includes('holo') || r.includes('secret')) return 'rarity-legendary';
  if(r.includes('rare') || r.includes('epic')) return 'rarity-rare';
  if(r.includes('uncommon')) return 'rarity-uncommon';
  return 'rarity-common';
}
function lwSlotLabel(s){
  if(!s) return '???';
  if(s.type === 'pack') return '📦 ' + (s.pack_set || 'Pack') + ((s.pack_qty||1)>1 ? (' ×'+s.pack_qty) : '');
  if(s.type === 'cosmetic') return s.label || '✨ Cosmetic';
  if(s.type === 'random') return '🎲 Random';
  if(s.type === 'mystery') return '??? Mystery';
  if(s.label) return s.label;
  if(s.card_key){ const c = typeof cardByKey === 'function' ? cardByKey(s.card_key) : null; return c ? c.name : s.card_key; }
  return 'Prize';
}
function lwSlotArt(s){
  if(!s) return '';
  if(s.type === 'mystery' || s.type === 'random') return '';
  if(s.type === 'pack') return '';
  if(s.type === 'cosmetic'){
    const item = (typeof COSMETICS !== 'undefined' ? COSMETICS : []).find(c => c.id === s.cosmetic_id);
    return (item && (item.art || (item.value && String(item.value).startsWith('art/') ? item.value : ''))) || '';
  }
  if(s.card_key){
    const c = typeof cardByKey === 'function' ? cardByKey(s.card_key) : null;
    return (c && c.art) || '';
  }
  return '';
}
function lwCaseItemHtml(slot, extraClass){
  const rar = lwSlotRarityClass(slot);
  const label = lwSlotLabel(slot);
  const art = lwSlotArt(slot);
  const typeClass = (slot && (slot.type === 'mystery' || slot.type === 'random')) ? ' mystery' :
    (slot && slot.type === 'cosmetic') ? ' cosmetic' :
    (slot && slot.type === 'pack') ? ' pack' : '';
  let body = art ? ('<img src="'+art+'" alt="">') : ('<div class="lw-ci-emoji">'+(slot && slot.type==='pack'?'📦':(slot && slot.type==='cosmetic'?'✨':'❓'))+'</div>');
  return '<div class="lw-case-item '+rar+typeClass+(extraClass?(' '+extraClass):'')+'">'+body+'<div class="lw-ci-label">'+String(label).replace(/</g,'&lt;')+'</div></div>';
}

/** Build a long strip of items for the reel; winnerIndexInStrip is where the prize lands under the marker */
function lwBuildCaseStrip(slots, landingIndex, loops){
  loops = loops || 8;
  const n = Math.max(1, slots.length);
  const strip = [];
  for(let L=0; L<loops; L++){
    for(let i=0;i<n;i++) strip.push({ slot: slots[i], srcIndex: i });
  }
  // ensure landingIndex appears near the end
  const targetLoop = loops - 2;
  const winnerPos = targetLoop * n + (landingIndex % n);
  return { strip, winnerPos };
}

function lwRenderWheelFromConfig(config){
  const track = document.getElementById('lw-case-track');
  if(!track || !config) return;
  const slots = typeof lwGetActiveSlots === 'function' ? lwGetActiveSlots(config) : (config.slots || []);
  if(!slots.length){
    track.innerHTML = '<div class="lw-case-item rarity-common"><div class="lw-ci-emoji">🎴</div><div class="lw-ci-label">No prizes</div></div>';
    track.style.transition = 'none';
    track.style.transform = 'translate3d(0,0,0)';
    return;
  }
  // Idle preview: one of each slot, repeated to fill
  const { strip } = lwBuildCaseStrip(slots, 0, 4);
  track.style.transition = 'none';
  track.style.transform = 'translate3d(0,0,0)';
  track.innerHTML = strip.map(x => lwCaseItemHtml(x.slot)).join('');
}

function lwResolveSlotCard(slot){
  if(!slot) return null;
  if(slot.card_key){
    const c = typeof cardByKey === 'function' ? cardByKey(slot.card_key) : null;
    if(c) return c;
  }
  // mystery / random / empty → pick a real card so the reveal has art + name
  if(slot.type === 'mystery' || slot.type === 'random' || (!slot.card_key && slot.type !== 'pack' && slot.type !== 'cosmetic')){
    const pool = (typeof obtainableCards === 'function') ? obtainableCards() : ((typeof CARDS !== 'undefined' && CARDS.length) ? CARDS : []);
    if(!pool.length) return null;
    return pool[Math.floor(Math.random()*pool.length)];
  }
  return null;
}

function lwResolvePrize(slot){
  // Returns { kind: 'card'|'pack'|'cosmetic', ... }
  if(!slot) return null;
  if(slot.type === 'pack'){
    return {
      kind: 'pack',
      pack_set: slot.pack_set || 'Base Set',
      pack_qty: Math.max(1, Number(slot.pack_qty) || 1),
      label: '📦 ' + (slot.pack_set || 'Base Set') + ' ×' + (slot.pack_qty || 1)
    };
  }
  if(slot.type === 'cosmetic'){
    const item = (typeof COSMETICS !== 'undefined' ? COSMETICS : []).find(c => c.id === slot.cosmetic_id);
    return {
      kind: 'cosmetic',
      cosmetic_id: slot.cosmetic_id,
      label: item ? ('✨ ' + item.name) : (slot.label || slot.cosmetic_id),
      name: item ? item.name : slot.cosmetic_id
    };
  }
  const card = lwResolveSlotCard(slot);
  if(!card) return null;
  return {
    kind: 'card',
    cardKey: card.key,
    cardName: card.name,
    label: card.name,
    wasMystery: slot.type === 'mystery' || slot.type === 'random'
  };
}

async function lwSetSpinner(){
  const msg = document.getElementById('lw-host-msg');
  if(!lwIsHost || !lwEvent) return;
  const sel = document.getElementById('lw-spinner-select');
  const uid = sel && sel.value;
  if(!uid){ msg.textContent = 'Pick a player'; msg.className='lw-msg err'; return; }
  try{
    const { data, error } = await sb.from('live_events').update({
      current_spinner_id: uid,
      status: lwEvent.status === 'lobby' ? 'active' : lwEvent.status
    }).eq('id', lwEvent.id).select().single();
    if(error) throw error;
    lwEvent = data;
    msg.textContent = 'Spinner set — they can press SPIN';
    msg.className = 'lw-msg ok';
    lwUpdateSpinButton();
    lwRenderPresence();
    // Broadcast so clients without realtime lag still update
    if(lwChannel){
      try{
        await lwChannel.send({ type:'broadcast', event:'spinner', payload:{ current_spinner_id: uid, status: lwEvent.status } });
      }catch(_){}
    }
  }catch(e){
    msg.textContent = e.message || 'Failed';
    msg.className = 'lw-msg err';
  }
}

async function lwActivateEvent(){
  if(!lwIsHost || !lwEvent) return;
  const msg = document.getElementById('lw-host-msg');
  try{
    const { data, error } = await sb.from('live_events').update({ status: 'active' }).eq('id', lwEvent.id).select().single();
    if(error) throw error;
    lwEvent = data;
    msg.textContent = 'Event is live — spinner can spin';
    msg.className = 'lw-msg ok';
    lwUpdateStatusPill('active');
    lwUpdateSpinButton();
  }catch(e){ msg.textContent = e.message; msg.className='lw-msg err'; }
}

async function lwEndEvent(){
  if(!lwIsHost || !lwEvent) return;
  try{
    const results = (lwEvent.wheel_config && lwEvent.wheel_config.results) || [];
    lwResultsSnapshot = results;
    if(lwChannel){
      try{ await lwChannel.send({ type:'broadcast', event:'show_results', payload:{ results } }); }catch(_){}
    }
    lwShowResultsBoard();
    await sb.from('live_events').update({ status: 'ended', current_spinner_id: null }).eq('id', lwEvent.id);
    if(lwChannel){
      try{ await lwChannel.send({ type:'broadcast', event:'event_ended', payload:{ reason:'host_ended' } }); }catch(_){}
    }
    lwEvent.status = 'ended';
    setTimeout(function(){ lwForceCloseRoom('ended'); }, 100);
  }catch(e){ console.error(e); }
}

async function lwRequestSpin(){
  if(!lwEvent || lwSpinning) return;
  if(!lwIsCurrentSpinner()){ showToast('You are not the spinner'); return; }
  if(lwEvent.status !== 'active' && lwEvent.status !== 'lobby'){ showToast('Event not active'); return; }
  if(lwIsPackPickEvent() && lwMyCurrentPackConsumed()){
    showToast('You already spun this pack — waiting for next turn');
    lwUpdateSpinButton();
    return;
  }

  const config = lwEvent.wheel_config || {};
  let slots = typeof lwGetActiveSlots === 'function' ? lwGetActiveSlots(config) : (config.slots || []);

  // Pack-pick: rebuild reel from this spinner's claimed pack
  if(config.mode === 'pack_pick'){
    const prep = lwPrepareReelForSpinner(currentUser.id);
    if(!prep){ showToast('No pack claimed for you'); return; }
    slots = prep.slots;
    // Persist reel so others see the same strip during spin
    try{
      const cfg = Object.assign({}, config, { slots: slots, wheels: [{ slots }], wheel_index: 0 });
      await sb.from('live_events').update({ wheel_config: cfg }).eq('id', lwEvent.id);
      lwEvent.wheel_config = cfg;
      if(lwChannel){
        try{ await lwChannel.send({ type:'broadcast', event:'pack_picks', payload:{ wheel_config: cfg } }); }catch(_){}
      }
    }catch(e){ console.warn('reel sync', e); }
  }

  if(!slots.length){ showToast('Wheel has no slots'); return; }

  const landingIndex = lwWeightedIndex(slots);
  const slot = slots[landingIndex];
  const prize = lwResolvePrize(slot);
  if(!prize){ showToast('Could not resolve prize'); return; }

  const seed = Date.now() % 100000 + Math.floor(Math.random()*1000);
  const spinPayload = {
    seed,
    landingIndex,
    kind: prize.kind,
    cardKey: prize.cardKey || null,
    cardName: prize.cardName || null,
    pack_set: prize.pack_set || null,
    pack_qty: prize.pack_qty || null,
    cosmetic_id: prize.cosmetic_id || null,
    prizeLabel: prize.label || prize.name || prize.cardName || 'Prize',
    winnerId: currentUser.id,
    winnerName: currentUser.display_name || currentUser.username,
    wasMystery: !!prize.wasMystery || slot.type === 'mystery' || slot.type === 'random',
    at: new Date().toISOString()
  };

  lwSpinning = true;
  lwUpdateSpinButton();

  try{
    await sb.from('live_events').update({ status: 'spinning', last_spin: spinPayload }).eq('id', lwEvent.id);
    if(lwChannel){
      await lwChannel.send({ type: 'broadcast', event: 'spin', payload: spinPayload });
    }
    await lwPlaySynchronizedSpin(spinPayload);
    await lwAwardPrize(spinPayload);
    await lwAppendResult(spinPayload);
    if(lwIsPackPickEvent()) await lwMarkPackConsumed(currentUser.id);
    // Immediately clear spinner so the same person cannot spin again
    try{
      await sb.from('live_events').update({ status: 'active', current_spinner_id: null }).eq('id', lwEvent.id);
      if(lwEvent){ lwEvent.status = 'active'; lwEvent.current_spinner_id = null; }
    }catch(_){
      if(lwEvent){ lwEvent.status = 'active'; lwEvent.current_spinner_id = null; }
    }
    lwUpdateSpinButton();
    // Host advances to next spinner; non-host broadcasts so host can advance
    if(lwIsHost){
      try{
        if(lwIsPackPickEvent()){
          await lwAdvanceSpinnerQueue();
          const pool = (lwEvent.wheel_config && lwEvent.wheel_config.pack_pool) || [];
          if(pool.length && pool.every(p => p.consumed)){
            showToast('All packs opened');
            const results = (lwEvent.wheel_config && lwEvent.wheel_config.results) || [];
            lwResultsSnapshot = results;
            if(lwChannel){
              try{ await lwChannel.send({ type:'broadcast', event:'show_results', payload:{ results } }); }catch(_){}
            }
            lwShowResultsBoard();
          }
        } else {
          const advanced = await lwAdvanceToNextWheel();
          if(lwSpinnerQueue.length || (lwTurnOrder && lwTurnOrder.length)) await lwAdvanceSpinnerQueue();
          else if(advanced) showToast('Set the next spinner for this wheel');
        }
      }catch(e){ console.warn('post-spin advance', e); }
    } else if(lwChannel){
      // Tell host this spin finished so they can advance the queue
      try{
        await lwChannel.send({ type:'broadcast', event:'spin_done', payload:{ winnerId: currentUser.id, at: spinPayload.at } });
      }catch(_){}
    }
  }catch(e){
    console.error(e);
    showToast('Spin failed: ' + (e.message||'error'));
  }finally{
    lwSpinning = false;
    lwUpdateSpinButton();
  }
}

function lwPlaySynchronizedSpin(spin){
  return new Promise(resolve => {
    const track = document.getElementById('lw-case-track');
    const caseEl = document.getElementById('lw-case');
    const resultEl = document.getElementById('lw-result');
    if(!track || !spin){ resolve(); return; }

    const config = lwEvent && lwEvent.wheel_config;
    const slots = (config && (typeof lwGetActiveSlots === 'function' ? lwGetActiveSlots(config) : config.slots)) || [];
    const n = Math.max(1, slots.length);
    const landing = ((spin.landingIndex % n) + n) % n;
    const loops = 10 + ((spin.seed || 0) % 4);
    const { strip, winnerPos } = lwBuildCaseStrip(slots, landing, loops);

    if(resultEl){ resultEl.textContent = ''; resultEl.className = 'lw-result'; }

    // Keep mystery/random tiles hidden during the spin — reveal only after it lands.
    // Gate strictly on spin.kind (not just presence of a cardKey/cardName) so a
    // cosmetic (or pack) prize is never mistaken for a card reveal.
    const revealSlot = (spin.kind === 'card' && (spin.cardKey || spin.cardName))
      ? { type: 'card', card_key: spin.cardKey, label: spin.cardName || spin.prizeLabel }
      : slots[landing];
    const isMysteryWin = !!(spin.wasMystery || (slots[landing] && (slots[landing].type === 'mystery' || slots[landing].type === 'random')));

    track.style.transition = 'none';
    track.style.transform = 'translate3d(0,0,0)';
    // Always render original slots while spinning (mystery stays ???)
    track.innerHTML = strip.map(x => lwCaseItemHtml(x.slot, '')).join('');
    void track.offsetWidth;

    const caseW = caseEl ? caseEl.clientWidth : 800;
    const itemCenter = winnerPos * LW_ITEM_W + (LW_ITEM_W / 2);
    const targetX = (caseW / 2) - itemCenter;
    const jitter = ((spin.seed || 0) % 21) - 10;
    const durationMs = 8200;

    requestAnimationFrame(() => {
      track.style.transition = 'transform '+(durationMs/1000)+'s cubic-bezier(.07,.65,.05,1)';
      track.style.transform = 'translate3d(' + (targetX + jitter) + 'px,0,0)';
    });

    setTimeout(() => {
      const items = track.querySelectorAll('.lw-case-item');
      const winnerEl = items[winnerPos];
      if(winnerEl){
        winnerEl.classList.add('winner');
        // After land: flip mystery tile → real card
        if(isMysteryWin && revealSlot){
          const revealedHtml = lwCaseItemHtml(revealSlot, 'winner mystery-reveal');
          const tmp = document.createElement('div');
          tmp.innerHTML = revealedHtml;
          const newEl = tmp.firstElementChild;
          if(newEl){
            newEl.classList.add('winner', 'mystery-reveal');
            winnerEl.replaceWith(newEl);
          }
        }
      }
      lwShowLastResult(spin, true);
      // Slight delay so players see the tile flip before the big showcase
      setTimeout(() => {
        lwShowWinShowcase(spin);
        resolve();
      }, isMysteryWin ? 450 : 80);
    }, durationMs + 150);
  });
}

function lwShowWinShowcase(spin){
  if(!spin) return;
  let art = '';
  let name = spin.prizeLabel || spin.cardName || 'Prize';
  if(spin.kind === 'card' && spin.cardKey && typeof cardByKey === 'function'){
    const c = cardByKey(spin.cardKey);
    if(c){ art = c.art || ''; name = c.name || name; }
  } else if(spin.kind === 'cosmetic' && spin.cosmetic_id && typeof COSMETICS !== 'undefined'){
    const item = COSMETICS.find(c => c.id === spin.cosmetic_id);
    if(item){
      name = item.name || name;
      art = item.art || (item.value && String(item.value).startsWith('art/') ? item.value : '') || '';
    }
  }
  let overlay = document.getElementById('lw-win-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'lw-win-overlay';
    overlay.innerHTML = '<div class="lw-win-card"><div class="lw-win-burst"></div><div class="lw-win-art"></div><div class="lw-win-name"></div><div class="lw-win-sub"></div><button type="button" class="btn" id="lw-win-close">Nice!</button></div>';
    document.body.appendChild(overlay);
  }
  const artEl = overlay.querySelector('.lw-win-art');
  const nameEl = overlay.querySelector('.lw-win-name');
  const subEl = overlay.querySelector('.lw-win-sub');
  if(artEl){
    artEl.innerHTML = art
      ? ('<img src="'+art+'" alt="">')
      : ('<div style="font-size:4rem">'+(spin.kind==='pack'?'📦':(spin.kind==='cosmetic'?'✨':'🎴'))+'</div>');
  }
  if(nameEl) nameEl.textContent = name;
  if(subEl) subEl.textContent = (spin.winnerName || 'Trainer') + ' won' + (spin.wasMystery ? ' (mystery reveal)' : '');
  overlay.classList.add('show');
  const close = () => overlay.classList.remove('show');
  const btn = document.getElementById('lw-win-close');
  if(btn) btn.onclick = close;
  overlay.onclick = (e) => { if(e.target === overlay) close(); };
  setTimeout(close, 5000);
}

function lwShowLastResult(spin, animate){
  const resultEl = document.getElementById('lw-result');
  if(!resultEl || !spin) return;
  const mystery = spin.wasMystery;
  let label = spin.prizeLabel || spin.cardName || spin.cardKey || 'Prize';
  if(spin.kind === 'card' && spin.cardKey && typeof cardByKey === 'function'){
    const c = cardByKey(spin.cardKey);
    if(c && c.name) label = c.name;
  }
  const sub = spin.kind === 'pack'
    ? ((spin.pack_qty||1) + ' pack(s) · ' + (spin.pack_set||''))
    : (spin.kind === 'cosmetic' ? (spin.cosmetic_id || 'cosmetic')
      : ((mystery ? 'Mystery reveal · ' : '') + (spin.cardKey || '')));
  resultEl.className = 'lw-result' + (animate ? ' mystery-reveal' : '');
  resultEl.innerHTML =
    '<div style="color:var(--muted);font-size:.85rem;margin-bottom:.25rem">'+
    (spin.winnerName || 'Trainer') + ' won</div>' +
    '<div class="prize-name">'+(mystery ? '✨ ' : '')+String(label).replace(/</g,'&lt;')+'</div>' +
    '<div style="font-size:.78rem;color:#8b9bb8;margin-top:.2rem">'+String(sub).replace(/</g,'&lt;')+'</div>';
}

async function lwAwardPrize(spin){
  if(!spin || !spin.winnerId || !sb) return;
  if(spin.winnerId !== currentUser?.id) return;
  const kind = spin.kind || (spin.cardKey ? 'card' : null);
  if(!kind) return;
  try{
    if(kind === 'card'){
      if(!spin.cardKey) return;
      const { data: row } = await sb.from('profiles').select('collection').eq('id', currentUser.id).single();
      const col = Object.assign({}, (row && row.collection) || state.collection || {});
      col[spin.cardKey] = (Number(col[spin.cardKey]) || 0) + 1;
      state.collection = col;
      await sb.from('profiles').update({
        collection: col,
        updated_at: new Date().toISOString()
      }).eq('id', currentUser.id);
      try{ if(typeof save === 'function') await save(); }catch(_){}
      if(typeof renderCollection === 'function') renderCollection();
      if(typeof updateUI === 'function') updateUI();
      if(typeof updateStatsUI === 'function') updateStatsUI();
      showToast('Card added: ' + (spin.cardName || spin.cardKey));
    } else if(kind === 'pack'){
      const setName = spin.pack_set || 'Base Set';
      const qty = Math.max(1, Number(spin.pack_qty) || 1);
      if(typeof ensurePackQueue === 'function') ensurePackQueue();
      if(!Array.isArray(state.packQueue)) state.packQueue = [];
      for(let i=0;i<qty;i++) state.packQueue.push(setName === 'Wizards Black Star Promos' ? 'Base Set' : setName);
      state.packs = state.packQueue.length;
      await save();
      if(typeof updateStatsUI === 'function') updateStatsUI();
      if(typeof updateUI === 'function') updateUI();
      if(typeof updateOpenSetStatus === 'function') updateOpenSetStatus();
      showToast('Packs awarded: ' + qty + ' × ' + setName);
    } else if(kind === 'cosmetic'){
      const id = spin.cosmetic_id;
      if(!id) return;
      // Re-fetch the latest saved stats first (same pattern as the card branch above)
      // so a stale in-memory `state` can't clobber cosmetics/other stats saved
      // elsewhere, and so the win can never silently fail to persist.
      let ownedList = [];
      let equippedMap = {};
      try{
        const { data: row } = await sb.from('profiles').select('stats').eq('id', currentUser.id).single();
        const remoteStats = (row && row.stats) || {};
        ownedList = Array.isArray(remoteStats.cosmeticsOwned) ? remoteStats.cosmeticsOwned.slice()
          : (Array.isArray(state.cosmeticsOwned) ? state.cosmeticsOwned.slice() : []);
        equippedMap = Object.assign({}, remoteStats.cosmeticsEquipped || state.cosmeticsEquipped || {});
      }catch(_){
        ownedList = Array.isArray(state.cosmeticsOwned) ? state.cosmeticsOwned.slice() : [];
        equippedMap = Object.assign({}, state.cosmeticsEquipped || {});
      }
      if(!ownedList.includes(id)) ownedList.push(id);
      const item = (typeof COSMETICS !== 'undefined' ? COSMETICS : []).find(c => c.id === id);
      if(item && item.cat) equippedMap[item.cat] = id;
      state.cosmeticsOwned = ownedList;
      state.cosmeticsEquipped = equippedMap;
      await save();
      if(typeof applyCosmetics === 'function') applyCosmetics();
      if(typeof renderCosmeticsShop === 'function') renderCosmeticsShop();
      showToast('Cosmetic unlocked: ' + (item ? item.name : (spin.prizeLabel || id)));
    }
    try{ localStorage.setItem('pokemonCardsBaseSet', JSON.stringify(state)); }catch(e){}
    if(typeof updateStatsUI === 'function') updateStatsUI();
  }catch(e){
    console.error('award prize', e);
    showToast('Could not save prize — contact admin');
  }
}

async function lwLeaveEvent(){
  const wasHost = lwIsHost || (lwEvent && currentUser && (lwEvent.created_by === currentUser.id || currentUser.is_admin));
  const eventId = lwEvent && lwEvent.id;

  // Host leave → shut down for everyone
  if(wasHost && eventId && sb){
    try{
      await sb.from('live_events').update({
        status: 'ended',
        current_spinner_id: null
      }).eq('id', eventId);
    }catch(e){ console.warn('end on leave', e); }
    if(lwChannel){
      try{
        await lwChannel.send({ type:'broadcast', event:'event_ended', payload:{ reason: 'host_left' } });
      }catch(_){}
    }
  }

  if(lwChannel){
    try{ await lwChannel.untrack(); }catch(e){}
    try{ await sb.removeChannel(lwChannel); }catch(e){}
    lwChannel = null;
  }
  if(eventId && currentUser && sb){
    try{
      await sb.from('live_event_members').delete()
        .eq('event_id', eventId)
        .eq('user_id', currentUser.id);
    }catch(e){}
  }
  lwEvent = null;
  lwIsHost = false;
  lwMembers = [];
  lwSpinning = false;
  lwSpinnerQueue = [];
  const badge = document.getElementById('lw-hero-badge');
  if(badge){ badge.textContent = '🔴 LIVE EVENT'; badge.classList.remove('live'); }
  lwHideRoom();
  if(wasHost) showToast('Event ended for everyone');
}

function lwForceCloseRoom(reason){
  // Snapshot results before clearing
  const hadResults = lwEvent && lwEvent.wheel_config && (lwEvent.wheel_config.results||[]).length;
  if(hadResults){
    try{ lwShowResultsBoard(); }catch(_){}
  }
  if(lwChannel){
    try{ lwChannel.untrack(); }catch(e){}
    try{ if(sb) sb.removeChannel(lwChannel); }catch(e){}
    lwChannel = null;
  }
  // keep wheel_config results on a temp for board already open
  lwEvent = null;
  lwIsHost = false;
  lwMembers = [];
  lwSpinning = false;
  lwHideRoom();
  showToast(reason === 'host_left' ? 'Host ended the event' : 'Event ended');
}


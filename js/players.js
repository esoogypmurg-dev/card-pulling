/* ========== PLAYERS (view others) ========== */
let viewingPlayer = null;
let playerBinderPage = 0;

async function loadPlayersList(){
  const el = document.getElementById('players-list');
  if(!el || !sb){ if(el) el.textContent = 'Not connected'; return; }
  el.innerHTML = '<div class="pp-empty">Loading trainers…</div>';
  try{
    const { data, error } = await sb.from('profiles')
      .select('id, username, display_name, is_admin, money, packs, collection, stats, last_login')
      .order('username');
    if(error) throw error;
    if(!data || !data.length){
      el.innerHTML = '<div class="pp-empty">No players yet.</div>';
      renderPlayersOnlineSummary();
      return;
    }

    const onlineIds = getOnlinePlayerIds();
    const onlineCount = data.filter(p => onlineIds.has(String(p.id))).length;
    const summary = document.getElementById('pl-sum-count');
    if(summary) summary.textContent = String(onlineCount);

    const onlineFirst = data.slice().sort((a,b) => {
      const ao = onlineIds.has(String(a.id)) ? 1 : 0;
      const bo = onlineIds.has(String(b.id)) ? 1 : 0;
      return bo - ao || String(a.username||'').localeCompare(String(b.username||''));
    });

    el.innerHTML = `
      <div class="pp-player-directory">
        <div class="pp-directory-head">
          <div>
            <h2>Trainers</h2>
            <p><span class="pp-online-dot"></span>${onlineCount} online now · ${data.length} total</p>
          </div>
          <span class="pp-directory-note">Select a trainer to inspect their collection.</span>
        </div>
        <div class="pp-player-grid">
          ${onlineFirst.map(p => {
            const col = p.collection || {};
            const owned = Object.values(col).filter(n => Number(n) > 0).length;
            const isYou = currentUser && p.id === currentUser.id;
            const online = onlineIds.has(String(p.id));
            const name = escapeHtml(p.display_name || p.username || 'Trainer');
            const username = escapeHtml(p.username || 'trainer');
            const role = p.is_admin ? '<span class="pp-player-badge admin">ADMIN</span>' : '';
            const you = isYou ? '<span class="pp-player-badge">YOU</span>' : '';
            const status = online ? 'Online now' : (p.last_login ? 'Offline' : 'Never online');
            return `
              <button type="button" class="pp-player-card ${online?'is-online':''}" onclick="viewPlayer('${p.id}')">
                <span class="pp-player-avatar">${online?'⚡':'◇'}</span>
                <span class="pp-player-main">
                  <span class="pp-player-name">${name} ${you}${role}</span>
                  <span class="pp-player-handle">@${username}</span>
                  <span class="pp-player-status"><i class="pp-status-dot ${online?'online':''}"></i>${status}</span>
                  <span class="pp-player-stats">${owned} cards · $${Number(p.money||0).toFixed(2)} · ${p.packs||0} packs</span>
                </span>
                <span class="pp-player-arrow">View ›</span>
              </button>`;
          }).join('')}
        </div>
      </div>`;
  }catch(e){
    console.error(e);
    el.innerHTML = '<div class="pp-empty">Could not load players.</div>';
  }
}

async function viewPlayer(id){
  if(!sb) return;
  try{
    const { data, error } = await sb.from('profiles').select('*').eq('id', id).single();
    if(error) throw error;
    viewingPlayer = data;
    playerCollectionSetFilter = 'all';
    playerBinderPage = 0;
    document.getElementById('players-list').style.display = 'none';
    document.getElementById('players-view').style.display = 'flex';
    const titleEl = document.getElementById('players-view-title');
    if(titleEl) titleEl.textContent = data.display_name || data.username || 'Trainer';
    const statsEl = document.getElementById('players-view-stats');
    if(statsEl){
      const owned = (typeof CARDS !== 'undefined' ? CARDS : []).filter(c => colGet(data.collection||{}, c) > 0).length;
      const stats = data.stats || {};
      statsEl.textContent = owned + ' cards collected · ' + (stats.tradesCompleted||0) + ' trades completed';
    }
    const searchEl = document.getElementById('players-collection-search');
    if(searchEl) searchEl.value = '';
    setupPlayerSetFilters();
    showPlayerTab('collection');
    renderPlayerCollection();
    renderPlayerBinder();
  }catch(e){
    console.error(e);
    showToast('Could not load player');
  }
}

function closePlayerView(){
  viewingPlayer = null;
  document.getElementById('players-view').style.display = 'none';
  document.getElementById('players-list').style.display = 'block';
  loadPlayersList();
}

let playerCollectionSetFilter = 'all';

function showPlayerTab(tab){
  document.getElementById('players-view-collection').style.display = tab==='collection'?'':'none';
  document.getElementById('players-view-binder').style.display = tab==='binder'?'':'none';
  const tools = document.getElementById('players-collection-tools');
  if(tools) tools.style.display = tab==='collection' ? '' : 'none';
  document.getElementById('pv-tab-collection').classList.toggle('active', tab==='collection');
  document.getElementById('pv-tab-binder').classList.toggle('active', tab==='binder');
}

function setupPlayerSetFilters(){
  const el = document.getElementById('players-set-filters');
  if(!el) return;
  const sets = (SETS && SETS.length)
    ? SETS.map(s => s.name)
    : [...new Set(CARDS.map(c => c.set).filter(Boolean))].sort();
  const all = ['all', ...sets];
  el.innerHTML = all.map(s => {
    const label = s === 'all' ? 'All sets' : s;
    const active = s === playerCollectionSetFilter ? ' active' : '';
    return `<button type="button" class="filter-btn${active}" data-pv-set="${s}" onclick="setPlayerCollectionSetFilter('${s.replace(/'/g,"\\'")}')">${label}</button>`;
  }).join('');
}

function setPlayerCollectionSetFilter(setName){
  playerCollectionSetFilter = setName;
  document.querySelectorAll('#players-set-filters .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-pv-set') === setName);
  });
  renderPlayerCollection();
}

function renderPlayerCollection(){
  const el = document.getElementById('players-view-collection');
  if(!el || !viewingPlayer) return;
  const col = viewingPlayer.collection || {};
  const q = ((document.getElementById('players-collection-search') || {}).value || '').trim().toLowerCase();
  let owned = CARDS.filter(c => colGet(col, c) > 0);
  if(playerCollectionSetFilter && playerCollectionSetFilter !== 'all'){
    owned = owned.filter(c => c.set === playerCollectionSetFilter);
  }
  if(q){
    owned = owned.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.cardNumber || '').toLowerCase().includes(q) ||
      (c.set || '').toLowerCase().includes(q) ||
      String(c.num || '').includes(q)
    );
  }
  if(!owned.length){ el.innerHTML = '<div class="empty-state">No matching cards</div>'; return; }
  const isSelf = currentUser && viewingPlayer && viewingPlayer.id === currentUser.id;
  const theirGrades = (viewingPlayer.stats && viewingPlayer.stats.grades) || {};
  el.innerHTML = owned.map(c => {
    const n = colGet(col, c);
    const canTrade = !isSelf;
    const gl = Array.isArray(theirGrades[String(c.id)]||theirGrades[c.id]) ? (theirGrades[String(c.id)]||theirGrades[c.id]) : [];
    const best = gl.length ? Math.max(...gl.map(Number)) : null;
    const gradeHint = best != null ? (' · PSA '+best+(gl.length>1?'+':'')) : '';
    return `<div class="card-tile" style="cursor:${canTrade?'pointer':'default'}" ${canTrade?`onclick="openOfflineTradeRequest(${c.id})" title="Request trade for ${c.name}${gradeHint}"`:''}>
      ${c.art?`<img src="${c.art}" alt="${c.name}">`:`<div style="font-size:2rem">${c.emoji||'?'}</div>`}
      ${best!=null?`<div class="grade-badge">PSA ${best}</div>`:''}
      <div class="ct-name">${c.name}</div>
      <div class="ct-meta">×${n}${gradeHint} · ${c.rarityLabel||c.rarity}${c.set?' · '+c.set:''}${canTrade?' · tap to trade':''}</div>
    </div>`;
  }).join('');
}

function renderPlayerBinder(){
  const pageEl = document.getElementById('players-binder-page');
  const label = document.getElementById('players-binder-label');
  if(!pageEl || !viewingPlayer) return;
  const list = CARDS.filter(c => c.set === 'Base Set');
  const totalPages = Math.max(1, Math.ceil(list.length / BINDER_PER_PAGE));
  if(playerBinderPage >= totalPages) playerBinderPage = totalPages-1;
  if(playerBinderPage < 0) playerBinderPage = 0;
  if(label) label.textContent = 'Page '+(playerBinderPage+1)+' / '+totalPages;

  const stats = viewingPlayer.stats || {};
  const layout = stats.binderLayout;
  const col = viewingPlayer.collection || {};
  const start = playerBinderPage * BINDER_PER_PAGE;

  pageEl.innerHTML = '';
  for(let i=0;i<BINDER_PER_PAGE;i++){
    const globalSlot = start + i;
    const slot = document.createElement('div');
    if(globalSlot >= list.length){
      slot.className='binder-slot'; slot.style.opacity='0.25';
      pageEl.appendChild(slot); continue;
    }
    let cardId = null;
    if(layout && layout[String(globalSlot)] != null) cardId = Number(layout[String(globalSlot)]);
    else {
      const natural = list[globalSlot];
      if(natural && (col[natural.id]||col[String(natural.id)]||0) > 0) cardId = natural.id;
    }
    const card = cardId != null ? resolveCard(cardId) : null;
    const count = card ? (col[card.id]||col[String(card.id)]||0) : 0;
    if(card && count > 0){
      slot.className='binder-slot owned';
      slot.dataset.rarity = card.rarity||'';
      slot.innerHTML = card.art
        ? `<div class="bs-art"><img src="${card.art}" alt="${card.name}"/></div>${count>1?'<div class="bs-count">×'+count+'</div>':''}`
        : `<div class="bs-placeholder">${card.emoji||'?'}</div>`;
      slot.title = card.name;
    } else {
      slot.className='binder-slot missing';
      slot.innerHTML = '<div class="bs-placeholder" style="opacity:.25;font-size:1.8rem">?</div>';
    }
    pageEl.appendChild(slot);
  }
}

function playerBinderPrev(){ playerBinderPage = Math.max(0, playerBinderPage-1); renderPlayerBinder(); }
function playerBinderNext(){
  const list = CARDS.filter(c => c.set === 'Base Set');
  const totalPages = Math.max(1, Math.ceil(list.length / BINDER_PER_PAGE));
  playerBinderPage = Math.min(totalPages-1, playerBinderPage+1);
  renderPlayerBinder();
}


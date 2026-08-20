/* ========== Phase 3: Leaderboard ========== */
let lbMode = 'money';
let lbCache = null; // raw profile rows

async function setLeaderboardMode(mode){
  lbMode = mode || 'money';
  document.querySelectorAll('#lb-tabs .lb-tab, #lb-tabs .mkt-tab').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-lb') === lbMode);
  });
  const modeLabel = { money:'$', collectors:'📚', graded:'⭐', teams:'👥' };
  const el = document.getElementById('lb-sum-mode');
  if(el) el.textContent = modeLabel[lbMode] || '—';
  const list = document.getElementById('lb-list');
  if(lbMode === 'teams'){
    if(list) list.innerHTML = 'Loading…';
    try{
      if(!lbTeamCache) await loadTeamLeaderboard();
    }catch(e){
      console.error(e);
      if(list) list.innerHTML = '<div class="lb-empty">Could not load team rankings. Run sql/003_teams.sql?</div>';
      return;
    }
  }
  paintLeaderboard();
}

function lbUniqueCount(col){
  if(!col || typeof col !== 'object') return 0;
  let n = 0;
  for(const [k,v] of Object.entries(col)){
    const qty = (v && typeof v === 'object' && v.count != null) ? Number(v.count) : Number(v);
    if(qty > 0) n++;
  }
  return n;
}

function lbGradedCount(stats){
  const g = (stats && stats.grades) ? stats.grades : (stats || {});
  if(!g || typeof g !== 'object') return 0;
  // grades map: { cardKey: [10,9] } or nested under stats.grades
  const map = (stats && stats.grades && typeof stats.grades === 'object') ? stats.grades : {};
  let n = 0;
  for(const arr of Object.values(map)){
    if(Array.isArray(arr)) n += arr.length;
  }
  return n;
}

let lbTeamCache = null; // aggregated team rows for team leaderboard

async function renderLeaderboard(){
  const list = document.getElementById('lb-list');
  const myEl = document.getElementById('lb-my-rank');
  if(!list) return;
  list.innerHTML = 'Loading…';
  if(myEl) myEl.style.display = 'none';

  if(!sb || !currentUser){
    list.innerHTML = '<div class="lb-empty">Sign in to view the leaderboard.</div>';
    return;
  }

  try{
    const { data, error } = await sb
      .from('profiles')
      .select('id, username, display_name, money, collection, stats, is_admin')
      .order('money', { ascending: false });
    if(error) throw error;
    // Keep admins off the public player leaderboard
    lbCache = (data || []).filter(p => !p.is_admin);
    lbTeamCache = null; // refresh teams when opening / switching
    if(lbMode === 'teams') await loadTeamLeaderboard();
    paintLeaderboard();
  }catch(e){
    console.error(e);
    list.innerHTML = '<div class="lb-empty">Could not load leaderboard.</div>';
  }
}

/** Build team rankings. Teams with any admin member are excluded. */
async function loadTeamLeaderboard(){
  const { data: teams, error: tErr } = await sb.from('teams').select('id, name, tag, leader_id');
  if(tErr) throw tErr;
  if(!teams || !teams.length){ lbTeamCache = []; return; }

  const { data: members, error: mErr } = await sb
    .from('team_members')
    .select('team_id, user_id, role');
  if(mErr) throw mErr;

  const userIds = [...new Set((members || []).map(m => m.user_id))];
  let profiles = [];
  if(userIds.length){
    const { data: profs, error: pErr } = await sb
      .from('profiles')
      .select('id, username, display_name, money, collection, stats, is_admin')
      .in('id', userIds);
    if(pErr) throw pErr;
    profiles = profs || [];
  }
  const byId = {};
  profiles.forEach(p => { byId[p.id] = p; });

  const membersByTeam = {};
  (members || []).forEach(m => {
    (membersByTeam[m.team_id] = membersByTeam[m.team_id] || []).push(m);
  });

  const rows = [];
  for(const team of teams){
    const mems = membersByTeam[team.id] || [];
    // Exclude team if ANY member is an admin
    let hasAdmin = false;
    let totalMoney = 0, totalUnique = 0, totalGraded = 0;
    const names = [];
    for(const m of mems){
      const p = byId[m.user_id];
      if(!p) continue;
      if(p.is_admin){ hasAdmin = true; break; }
      totalMoney += Number(p.money) || 0;
      totalUnique += lbUniqueCount(p.collection);
      totalGraded += lbGradedCount(p.stats);
      names.push(p.display_name || p.username || 'Trainer');
    }
    if(hasAdmin) continue;
    if(!mems.length) continue;

    rows.push({
      id: team.id,
      name: team.name,
      tag: team.tag,
      memberCount: mems.length,
      money: totalMoney,
      unique: totalUnique,
      graded: totalGraded,
      me: mems.some(m => m.user_id === currentUser.id)
    });
  }
  lbTeamCache = rows;
}

function paintLeaderboard(){
  const list = document.getElementById('lb-list');
  const myEl = document.getElementById('lb-my-rank');
  if(!list) return;

  // ----- Team rankings -----
  if(lbMode === 'teams'){
    if(!lbTeamCache){ list.innerHTML = 'Loading…'; return; }
    const rows = lbTeamCache.map(t => ({
      id: t.id,
      name: '[' + t.tag + '] ' + t.name,
      score: t.money,
      label: '$' + t.money.toFixed(2),
      sub: t.memberCount + ' members · ' + t.unique + ' unique · ' + t.graded + ' graded',
      me: t.me
    }));
    rows.sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
    let rank = 0, lastScore = null, seen = 0;
    rows.forEach(r => {
      seen++;
      if(lastScore === null || r.score !== lastScore){ rank = seen; lastScore = r.score; }
      r.rank = rank;
    });
    const top = rows.slice(0, 20);
    const myRow = rows.find(r => r.me);
    if(myEl){
      if(myRow){
        myEl.style.display = '';
        myEl.innerHTML = `Your team rank: <strong>#${myRow.rank}</strong> · ${myRow.label}` +
          (myRow.sub ? ` <span class="lb-sub">(${myRow.sub})</span>` : '');
      } else {
        myEl.style.display = '';
        myEl.innerHTML = `Your team is not ranked <span class="lb-sub">(not on a team, or team has an admin)</span>`;
      }
    }
    if(!top.length){
      list.innerHTML = '<div class="lb-empty">No eligible teams yet. (Teams with an admin member are hidden.)</div>';
      return;
    }
    list.innerHTML = top.map(r => {
      const rankClass = r.rank === 1 ? 'top1' : r.rank === 2 ? 'top2' : r.rank === 3 ? 'top3' : '';
      return `<div class="lb-row${r.me ? ' me' : ''}">
        <div class="lb-rank ${rankClass}">#${r.rank}</div>
        <div>
          <div class="lb-name">${escapeHtml(r.name)}${r.me ? '<span class="lb-you">you</span>' : ''}</div>
          ${r.sub ? `<div class="lb-sub">${escapeHtml(r.sub)}</div>` : ''}
        </div>
        <div class="lb-score">${escapeHtml(r.label)}</div>
      </div>`;
    }).join('');
    return;
  }

  // ----- Player rankings -----
  if(!lbCache) return;

  const totalCards = (typeof CARDS !== 'undefined' && CARDS.length) ? CARDS.length : 0;

  const rows = lbCache.map(p => {
    const unique = lbUniqueCount(p.collection);
    const graded = lbGradedCount(p.stats);
    const money = Number(p.money) || 0;
    let score = money;
    let label = '$' + money.toFixed(2);
    let sub = '';
    if(lbMode === 'collectors'){
      score = unique;
      label = unique + ' unique';
      sub = totalCards ? ((unique / totalCards) * 100).toFixed(1) + '% of catalog' : '';
    } else if(lbMode === 'graded'){
      score = graded;
      label = graded + ' graded';
      sub = unique ? (unique + ' unique owned') : '';
    } else {
      sub = unique ? (unique + ' cards') : '';
    }
    return {
      id: p.id,
      name: p.display_name || p.username || 'Trainer',
      username: p.username,
      score,
      label,
      sub,
      me: currentUser && p.id === currentUser.id
    };
  });

  rows.sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));

  // ranks (dense by score ties optional — use competition rank)
  let rank = 0;
  let lastScore = null;
  let seen = 0;
  rows.forEach(r => {
    seen++;
    if(lastScore === null || r.score !== lastScore){
      rank = seen;
      lastScore = r.score;
    }
    r.rank = rank;
  });

  const top = rows.slice(0, 20);
  const myRow = rows.find(r => r.me);

  if(myEl){
    if(myRow){
      myEl.style.display = '';
      const modeLabel = lbMode === 'money' ? 'Richest' : lbMode === 'collectors' ? 'Collectors' : 'Graded';
      myEl.innerHTML = `Your rank on <strong>${modeLabel}</strong>: <strong>#${myRow.rank}</strong> · ${myRow.label}` +
        (myRow.sub ? ` <span class="lb-sub">(${myRow.sub})</span>` : '');
    } else {
      myEl.style.display = 'none';
    }
  }

  if(!top.length){
    list.innerHTML = '<div class="lb-empty">No players yet.</div>';
    return;
  }

  list.innerHTML = top.map(r => {
    const rankClass = r.rank === 1 ? 'top1' : r.rank === 2 ? 'top2' : r.rank === 3 ? 'top3' : '';
    return `<div class="lb-row${r.me ? ' me' : ''}">
      <div class="lb-rank ${rankClass}">#${r.rank}</div>
      <div>
        <div class="lb-name">${escapeHtml(r.name)}${r.me ? '<span class="lb-you">you</span>' : ''}</div>
        ${r.sub ? `<div class="lb-sub">${escapeHtml(r.sub)}</div>` : ''}
      </div>
      <div class="lb-score">${escapeHtml(r.label)}</div>
    </div>`;
  }).join('');
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}




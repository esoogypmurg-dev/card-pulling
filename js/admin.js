/* ========== ADMIN FUNCTIONS ========== */


function marketShowSection(sec){
  document.querySelectorAll('#mkt-categories .mkt-tab, #mkt-categories .ach-cat-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-mkt') === sec);
  });
  const player = document.getElementById('market-sec-player');
  const trainer = document.getElementById('market-sec-trainer');
  const auctions = document.getElementById('market-sec-auctions');
  const bids = document.getElementById('market-sec-bids');
  if(player) player.style.display = sec === 'player' ? 'flex' : 'none';
  if(trainer) trainer.style.display = sec === 'trainer' ? 'flex' : 'none';
  if(auctions) auctions.style.display = sec === 'auctions' ? 'flex' : 'none';
  if(bids) bids.style.display = sec === 'bids' ? 'flex' : 'none';
  if(sec === 'player' && typeof loadPlayerMarket === 'function') loadPlayerMarket();
  if(sec === 'trainer' && typeof renderMarket === 'function') renderMarket();
  if(sec === 'auctions' && typeof loadAuctions === 'function') loadAuctions();
  if(sec === 'bids' && typeof loadMyAuctionBids === 'function') loadMyAuctionBids();
  if(typeof updateMarketSummary === 'function') updateMarketSummary();
}
function openTradeHistoryModal(){
  if(typeof renderMarketHistory === 'function') renderMarketHistory();
  const m = document.getElementById('trade-history-modal');
  if(m) m.style.display = 'flex';
}
function closeTradeHistoryModal(){
  const m = document.getElementById('trade-history-modal');
  if(m) m.style.display = 'none';
}

function shopShowSection(sec){
  document.querySelectorAll('#shop-menu .mkt-tab, #shop-menu .admin-menu-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-shop-sec') === sec);
  });
  document.querySelectorAll('#shop .admin-section').forEach(s => {
    const on = s.id === 'shop-sec-' + sec;
    s.classList.toggle('active', on);
    s.style.display = on ? 'flex' : 'none';
  });
  if(sec === 'cosmetics' && typeof renderCosmeticsShop === 'function') renderCosmeticsShop();
  if(sec === 'packs' && typeof updateShopPackUI === 'function') updateShopPackUI();
  try{
    const set = (id,t)=>{ const el=document.getElementById(id); if(el) el.textContent=t; };
    set('shop-sum-packs', String(state.packs||0));
    set('shop-sum-money', '$'+Number(state.money||0).toFixed(0));
    set('shop-sum-cosmo', String((state.cosmeticsOwned||[]).length));
  }catch(_){}
}

function adminShowSection(sec){
  document.querySelectorAll('#admin-menu .admin-menu-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-admin-sec') === sec);
  });
  document.querySelectorAll('#admin .admin-section').forEach(s => {
    const on = s.id === 'admin-sec-' + sec;
    s.classList.toggle('active', on);
    s.style.display = on ? 'block' : 'none';
  });
  const sc = document.getElementById('admin-scroll');
  if(sc) sc.scrollTop = 0;
  if(sec === 'accounts' && typeof adminLoadUsers === 'function'){
    // optional auto-refresh
  }
  if(sec === 'liveevent' && typeof lwOnAdminOpen === 'function'){
    try{ lwOnAdminOpen(); }catch(e){ console.warn(e); }
  }
  if(sec === 'events' && typeof evAdminRender === 'function'){
    try{ evAdminRender(); }catch(e){ console.warn(e); }
  }
  if(sec === 'banners' && typeof hbAdminLoad === 'function'){
    try{ hbAdminLoad(); }catch(e){ console.warn(e); }
  }
  if(sec === 'achievements' && typeof achAdminRender === 'function'){
    try{ achAdminRender(); }catch(e){ console.warn(e); }
  }
  if(sec === 'devtools' && typeof populateDevSelect === 'function'){
    try{ populateDevSelect(); }catch(e){}
  }
  if(sec === 'devtools' && typeof adminFillShopForm === 'function'){
    adminFillShopForm();
  }
  if(sec === 'dailygoals' && typeof renderAdminDailyGoals === 'function'){
    renderAdminDailyGoals();
  }
  if(sec === 'sets' && typeof setsAdminRender === 'function'){
    setsAdminRender();
  }
  if(sec === 'recap' && typeof weeklyRecapPreview === 'function'){
    weeklyRecapPreview();
  }
}

function adminToggleAcc(btn){
  if(!btn || btn.disabled) return;
  const body = btn.nextElementSibling;
  const open = btn.classList.contains('open');
  btn.classList.toggle('open', !open);
  if(body) body.classList.toggle('open', !open);
}


async function adminCreateAccount(){
  const msg = document.getElementById('admin-create-msg');
  msg.textContent = '';
  msg.style.color = 'var(--muted)';

  if(!currentUser?.is_admin || !sb){
    msg.textContent = 'Admin only';
    msg.style.color = '#f87171';
    return;
  }

  const username = (document.getElementById('admin-new-user').value || '').trim().toLowerCase();
  const pin = (document.getElementById('admin-new-pin').value || '').trim();
  const display = (document.getElementById('admin-new-display').value || '').trim() || username;

  if(!username || username.length < 2){
    msg.textContent = 'Username must be at least 2 characters';
    msg.style.color = '#f87171';
    return;
  }
  if(!pin || pin.length < 4){
    msg.textContent = 'Password must be at least 4 characters';
    msg.style.color = '#f87171';
    return;
  }

  try{
    const email = usernameToEmail(username);
    // signUp creates auth.users row; trigger creates profiles row
    const { data, error } = await sb.auth.signUp({
      email,
      password: pin,
      options: {
        data: { username, display_name: display }
      }
    });
    if(error) throw error;

    // Ensure profile row has display_name (trigger may only set defaults)
    if(data?.user?.id){
      await sb.from('profiles').upsert({
        id: data.user.id,
        username,
        display_name: display,
        is_admin: false,
        money: 25,
        packs: 0
      });
    }

    msg.textContent = `✓ Created account “${username}” — have them sign in with that username + password. (You may need to sign in again as admin.)`;
    msg.style.color = '#22c55e';
    document.getElementById('admin-new-user').value = '';
    document.getElementById('admin-new-pin').value = '';
    document.getElementById('admin-new-display').value = '';

    // signUp switches session to the new user — restore admin session by signing out new user note
    // Admin should re-login. Sign out the new session so admin isn't stuck as the kid.
    await sb.auth.signOut();
    showToast('Account created. Please sign in again as admin.');
    setTimeout(() => location.reload(), 1200);

    adminLoadUsers();
  }catch(e){
    console.error(e);
    const t = (e && e.message) ? e.message : 'Failed to create account';
    msg.textContent = t;
    msg.style.color = '#f87171';
  }
}

async function adminLoadUsers(){
  const list = document.getElementById('admin-user-list');
  if(!list) return;
  if(!sb || !currentUser?.is_admin){
    list.textContent = 'Admin only';
    return;
  }
  list.textContent = 'Loading…';
  try{
    const { data, error } = await sb.from('profiles')
      .select('id, username, display_name, is_admin, money, packs, last_login, created_at')
      .order('created_at', { ascending: true });
    if(error) throw error;
    if(!data || !data.length){
      list.textContent = 'No users yet.';
      return;
    }

    // Populate grant user select
    const grantSel = document.getElementById('admin-grant-user');
    if(grantSel){
      const prev = grantSel.value;
      grantSel.innerHTML = '<option value="">— select user —</option>' +
        data.map(u => `<option value="${u.id}">${u.username}${u.is_admin?' (admin)':''}</option>`).join('');
      if(prev) grantSel.value = prev;
    }

    // Populate card select once
    const cardSel = document.getElementById('admin-grant-card');
    if(cardSel && cardSel.options.length <= 1){
      cardSel.innerHTML = '<option value="">— select card —</option>' +
        CARDS.map(c => `<option value="${c.id}">${c.cardNumber||c.num||''} ${c.name} (${c.rarityLabel||c.rarity})</option>`).join('');
    }

    list.innerHTML = data.map(u => {
      const isSelf = currentUser && u.id === currentUser.id;
      const uname = (u.username || '').replace(/\\/g,'\\\\').replace(/'/g, "\\'");
      const adminBtn = isSelf ? '' : (u.is_admin
        ? `<button class="btn btn-secondary" style="padding:.3rem .55rem;font-size:.75rem" onclick="adminSetAdmin('${u.id}', false, '${uname}')">Demote</button>`
        : `<button class="btn btn-secondary" style="padding:.3rem .55rem;font-size:.75rem" onclick="adminSetAdmin('${u.id}', true, '${uname}')">Make admin</button>`);
      const delBtn = isSelf ? '' : `<button class="btn" style="padding:.3rem .55rem;font-size:.75rem;background:#7f1d1d;border-color:#991b1b" onclick="adminDeleteUser('${u.id}','${uname}')">Delete</button>`;
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.55rem .7rem;background:#0f1320;border:1px solid #2a314d;border-radius:8px;margin-bottom:.4rem">
        <div style="min-width:0;flex:1">
          <strong style="color:var(--gold)">${u.username}</strong>
          ${u.is_admin ? ' <span style="color:var(--accent);font-size:.75rem">ADMIN</span>' : ''}
          <div style="font-size:.78rem;color:var(--muted)">${u.display_name || ''} · $${Number(u.money||0).toFixed(2)} · ${u.packs||0} packs</div>
          <div style="font-size:.72rem;color:var(--muted)">${u.last_login ? 'Last: ' + new Date(u.last_login).toLocaleDateString() : 'Never logged in'}</div>
        </div>
        <div style="display:flex;gap:.35rem;flex-wrap:wrap">
          <button class="btn btn-secondary" style="padding:.3rem .55rem;font-size:.75rem" onclick="adminSelectUser('${u.id}')">Select</button>
          ${adminBtn}
          ${delBtn}
        </div>
      </div>`;
    }).join('');
  }catch(e){
    console.error(e);
    list.textContent = 'Could not load users';
  }
}

function adminSelectUser(id){
  const sel = document.getElementById('admin-grant-user');
  if(sel){ sel.value = id; showToast('User selected for grants'); }
}

async function adminGrantMoneyPacks(){
  const msg = document.getElementById('admin-grant-msg');
  if(!sb || !currentUser?.is_admin){ if(msg){ msg.textContent='Admin only'; msg.style.color='#f87171'; } return; }
  const userId = (document.getElementById('admin-grant-user')||{}).value;
  const moneyAdd = parseFloat((document.getElementById('admin-grant-money')||{}).value) || 0;
  const packsAdd = parseInt((document.getElementById('admin-grant-packs')||{}).value, 10) || 0;
  if(!userId){ if(msg){ msg.textContent='Select a player'; msg.style.color='#f87171'; } return; }
  if(moneyAdd <= 0 && packsAdd <= 0){ if(msg){ msg.textContent='Enter money and/or packs to add'; msg.style.color='#f87171'; } return; }
  try{
    const { data: row, error } = await sb.from('profiles').select('money,packs,username').eq('id', userId).single();
    if(error) throw error;
    const patch = {
      money: Number(row.money||0) + moneyAdd,
      packs: Number(row.packs||0) + packsAdd
    };
    const { error: upErr } = await sb.from('profiles').update(patch).eq('id', userId);
    if(upErr) throw upErr;
    if(msg){ msg.textContent = `Gave ${row.username}: +$${moneyAdd.toFixed(2)} · +${packsAdd} packs`; msg.style.color='#4ade80'; }
    document.getElementById('admin-grant-money').value = '';
    document.getElementById('admin-grant-packs').value = '';
    // If granting to self, refresh local state
    if(currentUser && userId === currentUser.id){
      state.money = patch.money;
      state.packs = patch.packs;
      save(); updateUI();
    }
    adminLoadUsers();
  }catch(e){
    console.error(e);
    if(msg){ msg.textContent='Failed to grant'; msg.style.color='#f87171'; }
  }
}

async function adminGrantCard(){
  const msg = document.getElementById('admin-grant-msg');
  if(!sb || !currentUser?.is_admin){ if(msg){ msg.textContent='Admin only'; msg.style.color='#f87171'; } return; }
  const userId = (document.getElementById('admin-grant-user')||{}).value;
  const cardId = parseInt((document.getElementById('admin-grant-card')||{}).value, 10);
  const qty = Math.max(1, parseInt((document.getElementById('admin-grant-card-qty')||{}).value, 10) || 1);
  if(!userId){ if(msg){ msg.textContent='Select a player'; msg.style.color='#f87171'; } return; }
  if(!cardId){ if(msg){ msg.textContent='Select a card'; msg.style.color='#f87171'; } return; }
  const card = resolveCard(cardId);
  try{
    const { data: row, error } = await sb.from('profiles').select('collection,username').eq('id', userId).single();
    if(error) throw error;
    const col = Object.assign({}, row.collection || {});
    const key = String(cardId);
    // Support both string and number keys
    const prev = Number(col[cardId]||col[key]||0);
    col[key] = prev + qty;
    if(col[cardId] != null && key !== String(cardId)) delete col[cardId];
    const { error: upErr } = await sb.from('profiles').update({ collection: col }).eq('id', userId);
    if(upErr) throw upErr;
    if(msg){ msg.textContent = `Gave ${row.username}: ×${qty} ${card?card.name:('#'+cardId)}`; msg.style.color='#4ade80'; }
    if(currentUser && userId === currentUser.id){
      colSet(state.collection, cardId, colGet(state.collection, cardId) + qty);
      save(); updateUI(); renderCollection(); renderBinder();
    }
    adminLoadUsers();
  }catch(e){
    console.error(e);
    if(msg){ msg.textContent='Failed to give card'; msg.style.color='#f87171'; }
  }
}

async function adminDeleteUser(userId, username){
  if(!sb || !currentUser?.is_admin){ showToast('Admin only'); return; }
  if(currentUser && userId === currentUser.id){ showToast('Cannot delete yourself'); return; }
  if(!confirm('Delete user "'+(username||userId)+'" permanently?\n\nThis removes their profile, market listings, trades, team data, and login if possible.')) return;
  try{
    const { data, error } = await sb.rpc('admin_delete_user', { target_id: userId });
    if(error) throw error;
    const authOk = data && data.auth_deleted;
    showToast('Deleted '+(username||'user') + (authOk ? '' : ' (profile ok — remove Auth user in Dashboard if they can still log in)'));
    adminLoadUsers();
  }catch(e){
    console.error(e);
    showToast(e.message || 'Could not delete user — run sql/004_admin_rpcs.sql?');
  }
}

async function adminSetAdmin(userId, makeAdmin, username){
  if(!sb || !currentUser?.is_admin){ showToast('Admin only'); return; }
  if(currentUser && userId === currentUser.id && !makeAdmin){ showToast('Cannot demote yourself'); return; }
  const action = makeAdmin ? 'Promote' : 'Demote';
  if(!confirm(action + ' "'+(username||userId)+'" ' + (makeAdmin ? 'to admin?' : 'to normal user?'))) return;
  try{
    const { data, error } = await sb.rpc('admin_set_admin', {
      target_id: userId,
      make_admin: !!makeAdmin
    });
    if(error) throw error;
    showToast((username||'User') + (makeAdmin ? ' is now an admin' : ' is no longer an admin'));
    adminLoadUsers();
  }catch(e){
    console.error(e);
    showToast(e.message || 'Failed — run sql/004_admin_rpcs.sql?');
  }
}

/* ========== Sets visibility (admin) ========== */
let setsAdminCache = null; // unfiltered — includes hidden sets, unlike the player-facing SETS array

async function setsAdminLoad(){
  if(!sb) return [];
  const { data, error } = await sb
    .from('sets')
    .select('code,name,card_count,sort_order,hidden')
    .order('sort_order', { ascending: true });
  if(error){
    console.error(error);
    const msg = document.getElementById('sets-admin-msg');
    if(msg){ msg.textContent = 'Could not load sets — run sql/009_sets_hidden.sql? (' + error.message + ')'; msg.style.color = '#f87171'; }
    return [];
  }
  setsAdminCache = data || [];
  return setsAdminCache;
}

async function setsAdminRender(){
  if(!currentUser?.is_admin) return;
  const list = document.getElementById('sets-admin-list');
  const cnt = document.getElementById('sets-admin-count');
  if(!list) return;
  if(!setsAdminCache){
    list.innerHTML = '<p style="color:var(--muted);font-size:.85rem;margin:0">Loading…</p>';
    await setsAdminLoad();
  }
  const q = (document.getElementById('sets-admin-search')?.value || '').trim().toLowerCase();
  const rows = (setsAdminCache || []).filter(s =>
    !q || (s.name||'').toLowerCase().includes(q) || (s.code||'').toLowerCase().includes(q)
  );
  if(cnt) cnt.textContent = rows.length + ' of ' + (setsAdminCache||[]).length + ' sets · ' +
    (setsAdminCache||[]).filter(s=>!s.hidden).length + ' visible to players';
  if(!rows.length){
    list.innerHTML = '<p style="color:var(--muted);font-size:.85rem;margin:0">No sets match.</p>';
    return;
  }
  list.innerHTML = rows.map(s =>
    '<div style="display:flex;gap:.65rem;align-items:center;justify-content:space-between;padding:.5rem .65rem;border-radius:9px;border:1px solid #2a314d;background:#0f1320">'+
    '<div><div style="font-weight:700">'+String(s.name||s.code).replace(/</g,'&lt;')+
    ' <span style="color:var(--muted);font-weight:600;font-size:.76rem">· '+s.code+' · '+(s.card_count||0)+' cards</span></div></div>'+
    '<button type="button" class="btn '+(s.hidden?'':'btn-secondary')+'" style="padding:.3rem .65rem;font-size:.75rem" onclick="setsAdminToggle(\''+s.code+'\')">'+
    (s.hidden ? 'Show to players' : 'Hide from players') + '</button>'+
    '</div>'
  ).join('');
}

async function setsAdminToggle(code){
  if(!sb || !currentUser?.is_admin) return;
  const row = (setsAdminCache||[]).find(s => s.code === code);
  if(!row) return;
  const nextHidden = !row.hidden;
  const { error } = await sb.from('sets').update({ hidden: nextHidden }).eq('code', code);
  const msg = document.getElementById('sets-admin-msg');
  if(error){
    console.error(error);
    if(msg){ msg.textContent = 'Update failed: ' + error.message; msg.style.color = '#f87171'; }
    return;
  }
  row.hidden = nextHidden;
  if(msg){ msg.textContent = row.name + ' is now ' + (nextHidden ? 'hidden' : 'visible') + '.'; msg.style.color = '#4ade80'; }
  setsAdminRender();
}

async function setsAdminBulk(hidden){
  if(!sb || !currentUser?.is_admin) return;
  const q = (document.getElementById('sets-admin-search')?.value || '').trim().toLowerCase();
  const rows = (setsAdminCache || []).filter(s =>
    !q || (s.name||'').toLowerCase().includes(q) || (s.code||'').toLowerCase().includes(q)
  );
  if(!rows.length) return;
  if(!confirm((hidden ? 'Hide ' : 'Show ') + rows.length + ' set(s) from players?')) return;
  const codes = rows.map(s => s.code);
  const { error } = await sb.from('sets').update({ hidden }).in('code', codes);
  const msg = document.getElementById('sets-admin-msg');
  if(error){
    console.error(error);
    if(msg){ msg.textContent = 'Bulk update failed: ' + error.message; msg.style.color = '#f87171'; }
    return;
  }
  rows.forEach(s => { s.hidden = hidden; });
  if(msg){ msg.textContent = 'Updated ' + rows.length + ' set(s).'; msg.style.color = '#4ade80'; }
  setsAdminRender();
}

/* ========== Weekly Pull Stats Recap ========== */
async function weeklyRecapFetchProfiles(){
  const { data, error } = await sb.from('profiles').select('id, username, display_name, stats');
  if(error) throw error;
  return data || [];
}

function weeklyRecapBuildBulletin(profiles){
  const rows = profiles.map(p => {
    const st = p.stats || {};
    return {
      id: p.id,
      name: p.display_name || p.username || 'Trainer',
      packs: Number(st.weekPacksOpened) || 0,
      spend: Number(st.weekSpend) || 0,
      best: st.weekBestPull || null
    };
  }).filter(r => r.packs > 0 || r.spend > 0);

  rows.sort((a,b) => b.packs - a.packs);

  let overallBest = null;
  rows.forEach(r => {
    if(r.best && (!overallBest || r.best.price > overallBest.price)){
      overallBest = { ...r.best, owner: r.name };
    }
  });

  const dateLabel = new Date().toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
  let body = `📊 WEEKLY PULL STATS — ${dateLabel}\n\n`;

  if(!rows.length){
    body += 'No pack activity since the last recap — quiet week!\n';
  } else {
    if(overallBest){
      body += `🏆 Best pull of the week: ${overallBest.owner} — ${overallBest.name} ($${overallBest.price.toFixed(2)})\n\n`;
    }
    body += 'LEADERBOARD\n';
    rows.forEach((r, i) => {
      const bestTxt = r.best ? `best: ${r.best.name} ($${(Number(r.best.price)||0).toFixed(2)})` : 'best: —';
      body += `${i+1}. ${r.name} — ${r.packs} pack${r.packs===1?'':'s'} opened, $${r.spend.toFixed(2)} spent, ${bestTxt}\n`;
    });
  }

  return { subject: `📊 Weekly Pull Recap — ${dateLabel}`, body, rows, overallBest };
}

async function weeklyRecapPreview(){
  const el = document.getElementById('recap-preview');
  if(!el) return;
  el.textContent = 'Loading…';
  try{
    const profiles = await weeklyRecapFetchProfiles();
    const { body, rows } = weeklyRecapBuildBulletin(profiles);
    el.innerHTML = '<pre style="white-space:pre-wrap;font-family:inherit;margin:0;background:#0f1320;border:1px solid #2a314d;border-radius:8px;padding:.65rem">'+
      String(body).replace(/</g,'&lt;') + '</pre>' +
      '<div style="margin-top:.4rem">' + rows.length + ' player(s) with activity this week.</div>';
  }catch(e){
    console.error(e);
    el.textContent = 'Could not load preview: ' + (e.message||e);
  }
}

async function weeklyRecapGenerate(){
  if(!sb || !currentUser?.is_admin){ showToast('Admin only'); return; }
  if(!confirm('Send this week\'s recap mail to every player and reset weekly counters?')) return;
  const msg = document.getElementById('recap-msg');
  if(msg){ msg.textContent = 'Sending…'; msg.style.color = 'var(--muted)'; }
  try{
    const profiles = await weeklyRecapFetchProfiles();
    const { subject, body } = weeklyRecapBuildBulletin(profiles);

    let sent = 0, failed = 0;
    for(const p of profiles){
      try{
        const { error } = await sb.rpc('mail_send', {
          p_to_user_id: p.id,
          p_subject: subject,
          p_body: body,
          p_attachments: [],
          p_gift_wrapped: false,
          p_as_admin_grant: false
        });
        if(error) throw error;
        sent++;
      }catch(e){
        console.warn('[recap] send failed for', p.id, e.message||e);
        failed++;
      }
    }

    // reset weekly counters for everyone, win or lose on send (avoids double-counting next week)
    for(const p of profiles){
      const st = { ...(p.stats||{}), weekPacksOpened: 0, weekSpend: 0, weekBestPull: null };
      try{ await sb.from('profiles').update({ stats: st }).eq('id', p.id); }
      catch(e){ console.warn('[recap] reset failed for', p.id, e.message||e); }
    }

    if(msg){ msg.textContent = 'Sent to ' + sent + ' player(s)' + (failed ? (', ' + failed + ' failed') : '') + '. Weekly counters reset.'; msg.style.color = '#4ade80'; }
    showToast('Weekly recap sent to ' + sent + ' player(s)');
    weeklyRecapPreview();
  }catch(e){
    console.error(e);
    if(msg){ msg.textContent = 'Failed: ' + (e.message||e); msg.style.color = '#f87171'; }
  }
}


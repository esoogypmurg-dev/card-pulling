/* ========== Mail system ========== */
let mailTab = 'inbox';
let mailCache = { inbox: null, sent: null };
let mailComposeAtt = []; // [{card_key, qty, name}]

function mailShowTab(tab){
  mailTab = tab || 'inbox';
  ['inbox','sent','compose'].forEach(t => {
    const b = document.getElementById('mail-tab-'+t);
    if(b) b.classList.toggle('active', t === mailTab);
  });
  renderMail();
}

async function renderMail(){
  const el = document.getElementById('mail-view');
  if(!el) return;
  if(!sb || !currentUser){
    el.innerHTML = '<p style="color:var(--muted)">Sign in to use mail.</p>';
    return;
  }
  if(mailTab === 'compose'){
    renderMailCompose(el);
    return;
  }
  el.innerHTML = 'Loading…';
  try{
    const isInbox = mailTab === 'inbox';
    const col = isInbox ? 'to_user_id' : 'from_user_id';
    const { data, error } = await sb
      .from('mail_messages')
      .select('id, from_user_id, to_user_id, subject, body, is_read, gift_wrapped, gift_opened, created_at')
      .eq(col, currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if(error) throw error;
    if(isInbox) mailCache.inbox = data || [];
    else mailCache.sent = data || [];

    const otherIds = [...new Set((data||[]).map(m => isInbox ? m.from_user_id : m.to_user_id).filter(Boolean))];
    let names = {};
    if(otherIds.length){
      const { data: profs } = await sb.from('profiles').select('id, username, display_name').in('id', otherIds);
      (profs||[]).forEach(p => { names[p.id] = p.display_name || p.username; });
    }

    if(!data || !data.length){
      el.innerHTML = '<div class="lb-empty">No messages.</div>';
      return;
    }

    el.innerHTML = '<div class="mail-list">' + data.map(m => {
      const who = names[isInbox ? m.from_user_id : m.to_user_id] || (isInbox ? 'System' : 'Unknown');
      const unread = isInbox && !m.is_read;
      const gift = m.gift_wrapped && !m.gift_opened ? ' 🎁' : (m.gift_opened ? ' ✨' : '');
      const when = m.created_at ? new Date(m.created_at).toLocaleString() : '';
      return `<button type="button" class="mail-row${unread?' unread':''}" onclick="mailOpen('${m.id}')">
        <div>
          <strong>${escapeHtml(m.subject || '(no subject)')}${gift}</strong>
          <div class="mail-sub">${isInbox?'From':'To'}: ${escapeHtml(who)}</div>
        </div>
        <div class="mail-meta">${when}</div>
      </button>`;
    }).join('') + '</div>';

    if(isInbox) updateMailBadge();
  }catch(e){
    console.error(e);
    el.innerHTML = '<p style="color:#f87171">Could not load mail. Run sql/005_mail.sql?</p>';
  }
}


let mailRealtimeChannel = null;

function startMailWatcher(){
  if(!sb || !currentUser) return;
  stopMailWatcher();
  try{
    mailRealtimeChannel = sb.channel('mail-inbox-'+currentUser.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mail_messages',
        filter: 'to_user_id=eq.' + currentUser.id
      }, (payload) => {
        const row = payload.new || {};
        const subj = row.subject || 'New mail';
        const gift = row.gift_wrapped ? ' 🎁' : '';
        showToast('✉️ Mail: ' + subj + gift);
        updateMailBadge();
        // Browser notification if permitted
        if(typeof Notification !== 'undefined' && Notification.permission === 'granted'){
          try{
            new Notification('Pokémon Card Collector', {
              body: 'New mail: ' + subj + gift,
              icon: 'art/logo.png'
            });
          }catch(e){}
        }
        // Refresh inbox if viewing it
        if(mailTab === 'inbox' && document.getElementById('mail')?.classList.contains('active')){
          renderMail();
        }
      })
      .subscribe((status) => {
        console.log('[mail] realtime', status);
      });
  }catch(e){
    console.warn('mail realtime failed', e);
  }
  // Ask for notification permission once (non-blocking)
  if(typeof Notification !== 'undefined' && Notification.permission === 'default'){
    try{ Notification.requestPermission(); }catch(e){}
  }
}

function stopMailWatcher(){
  if(mailRealtimeChannel && sb){
    try{ sb.removeChannel(mailRealtimeChannel); }catch(e){}
  }
  mailRealtimeChannel = null;
}


async function updateMailBadge(){
  const badge = document.getElementById('mail-nav-badge');
  const btn = document.getElementById('mail-top-btn');
  if(!sb || !currentUser) return;
  try{
    const { count, error } = await sb
      .from('mail_messages')
      .select('*', { count: 'exact', head: true })
      .eq('to_user_id', currentUser.id)
      .eq('is_read', false);
    if(error) throw error;
    if(count > 0){
      if(badge){ badge.style.display = ''; badge.textContent = count > 9 ? '9+' : String(count); }
      if(btn) btn.classList.add('has-mail');
    } else {
      if(badge) badge.style.display = 'none';
      if(btn) btn.classList.remove('has-mail');
    }
  }catch(e){}
}

async function mailOpen(messageId){
  const el = document.getElementById('mail-view');
  if(!el || !sb) return;
  el.innerHTML = 'Loading…';
  try{
    const { data: msg, error } = await sb.from('mail_messages').select('*').eq('id', messageId).single();
    if(error) throw error;

    const { data: atts } = await sb.from('mail_attachments').select('*').eq('message_id', messageId);

    // Mark read if recipient
    if(msg.to_user_id === currentUser.id && !msg.is_read){
      await sb.rpc('mail_mark_read', { p_message_id: messageId });
      updateMailBadge();
    }

    let fromName = 'System', toName = 'You';
    const ids = [msg.from_user_id, msg.to_user_id].filter(Boolean);
    if(ids.length){
      const { data: profs } = await sb.from('profiles').select('id, username, display_name').in('id', ids);
      (profs||[]).forEach(p => {
        const n = p.display_name || p.username;
        if(p.id === msg.from_user_id) fromName = n;
        if(p.id === msg.to_user_id) toName = n;
      });
    }

    const isRecipient = msg.to_user_id === currentUser.id;
    const hasAtt = atts && atts.length > 0;
    const wrapped = msg.gift_wrapped && !msg.gift_opened && hasAtt;
    const opened = msg.gift_opened && hasAtt;

    let attHtml = '';
    if(hasAtt){
      if(wrapped){
        attHtml = `<div class="mail-gift-box">
          <div style="font-size:2rem;margin-bottom:.4rem">🎁</div>
          <div style="font-weight:700;color:var(--gold)">Gift-wrapped package</div>
          <div style="color:var(--muted);font-size:.88rem;margin:.35rem 0 .8rem">${atts.length} card stack(s) inside — open to claim</div>
          ${isRecipient ? `<button type="button" class="btn" onclick="mailOpenGift('${msg.id}')">Open gift</button>` : '<div class="lb-sub">Waiting for recipient to open</div>'}
        </div>`;
      } else {
        attHtml = `<div class="mail-gift-box${opened?' opened':''}">
          <div style="font-weight:700;margin-bottom:.5rem">${opened?'Claimed cards':'Attached cards'}</div>
          <div class="mail-att-grid">${atts.map(a => {
            const card = typeof resolveCard === 'function' ? resolveCard(a.card_key) : null;
            const name = card ? card.name : a.card_key;
            const art = card && card.art ? `<img src="${card.art}" alt="">` : '';
            return `<div class="mail-att-card">${art}<div>${escapeHtml(name)}</div><div>×${a.qty}</div></div>`;
          }).join('')}</div>
        </div>`;
      }
    }

    el.innerHTML = `<div class="mail-detail">
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">
        <button type="button" class="btn btn-secondary" style="padding:.3rem .65rem;font-size:.8rem" onclick="renderMail()">← Back</button>
        <button type="button" class="btn btn-secondary" style="padding:.3rem .65rem;font-size:.8rem;border-color:#f87171;color:#f87171" onclick="mailDelete('${msg.id}')">Delete</button>
      </div>
      <h3>${escapeHtml(msg.subject || '(no subject)')}</h3>
      <div class="mail-sub" style="margin-bottom:.8rem">From <strong>${escapeHtml(fromName)}</strong> → <strong>${escapeHtml(toName)}</strong>
        · ${msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</div>
      <div style="white-space:pre-wrap;line-height:1.45;margin-bottom:.5rem">${escapeHtml(msg.body || '')}</div>
      ${attHtml}
    </div>`;
  }catch(e){
    console.error(e);
    el.innerHTML = '<p style="color:#f87171">Could not open message.</p><button class="btn btn-secondary" onclick="renderMail()">Back</button>';
  }
}

async function mailDelete(messageId){
  if(!sb || !currentUser || !messageId) return;
  if(!confirm('Delete this message?')) return;
  try{
    // Attachments first (if FK restricts)
    try{ await sb.from('mail_attachments').delete().eq('message_id', messageId); }catch(_){}
    const { error } = await sb.from('mail_messages').delete().eq('id', messageId);
    if(error) throw error;
    showToast('Mail deleted');
    updateMailBadge();
    renderMail();
  }catch(e){
    console.error(e);
    showToast(e.message || 'Could not delete mail (check RLS policies)');
  }
}

async function mailOpenGift(messageId){
  if(!sb) return;
  try{
    const { data: atts } = await sb.from('mail_attachments').select('*').eq('message_id', messageId);
    const { data, error } = await sb.rpc('mail_open_gift', { p_message_id: messageId });
    if(error) throw error;
    // refresh local collection
    const { data: row } = await sb.from('profiles').select('collection').eq('id', currentUser.id).single();
    if(row) state.collection = row.collection || {};
    if(typeof migrateCollectionKeys === 'function') migrateCollectionKeys();
    if(typeof save === 'function') try{ save(); }catch(e){}
    if(typeof updateUI === 'function') updateUI();
    if(typeof renderCollection === 'function') renderCollection();
    updateMailBadge();

    // Build reveal queue (expand qty)
    const queue = [];
    (atts || []).forEach(a => {
      const card = typeof resolveCard === 'function' ? resolveCard(a.card_key) : null;
      const n = Math.max(1, a.qty || 1);
      for(let i=0;i<n;i++) queue.push({ key: a.card_key, card });
    });
    if(queue.length){
      startGiftReveal(queue, messageId);
    } else {
      showToast('Gift opened!');
      mailOpen(messageId);
    }
  }catch(e){
    console.error(e);
    showToast(e.message || 'Could not open gift');
  }
}

let giftRevealQueue = [];
let giftRevealIndex = 0;
let giftRevealFlipped = false;
let giftRevealMessageId = null;

function startGiftReveal(queue, messageId){
  giftRevealQueue = queue || [];
  giftRevealIndex = 0;
  giftRevealFlipped = false;
  giftRevealMessageId = messageId;
  const overlay = document.getElementById('gift-reveal');
  if(!overlay){ showToast('Gift opened!'); return; }
  overlay.style.display = 'flex';
  document.getElementById('gift-reveal-done').style.display = 'none';
  document.getElementById('gift-reveal-next').style.display = 'none';
  document.getElementById('gift-reveal-hint').textContent = 'Tap the package to open';
  document.getElementById('gift-reveal-name').textContent = '';
  document.getElementById('gift-reveal-meta').textContent = '';
  giftShowCurrentBack();
}

function giftShowCurrentBack(){
  const cardEl = document.getElementById('gift-reveal-card');
  const front = document.getElementById('gift-reveal-front');
  const counter = document.getElementById('gift-reveal-counter');
  giftRevealFlipped = false;
  if(cardEl) cardEl.classList.remove('flipped');
  if(front) front.innerHTML = '';
  document.getElementById('gift-reveal-name').textContent = '';
  document.getElementById('gift-reveal-meta').textContent = '';
  document.getElementById('gift-reveal-next').style.display = 'none';
  document.getElementById('gift-reveal-done').style.display = 'none';
  document.getElementById('gift-reveal-hint').style.display = '';
  document.getElementById('gift-reveal-hint').textContent = 'Tap the package to open';
  if(counter){
    counter.textContent = giftRevealQueue.length > 1
      ? ('Card ' + (giftRevealIndex + 1) + ' of ' + giftRevealQueue.length)
      : 'Gift card';
  }
}

function giftRevealFlip(){
  if(giftRevealFlipped) return;
  if(!giftRevealQueue.length) return;
  const item = giftRevealQueue[giftRevealIndex];
  const card = item && item.card;
  const front = document.getElementById('gift-reveal-front');
  if(front){
    if(card && card.art){
      front.innerHTML = '<img src="'+card.art+'" alt="'+escapeHtml(card.name||'')+'">';
    } else {
      const label = card ? (card.name || item.key) : (item ? item.key : '?');
      front.innerHTML = '<div class="gift-no-art">'+escapeHtml(label)+'</div>';
    }
  }
  const nameEl = document.getElementById('gift-reveal-name');
  const metaEl = document.getElementById('gift-reveal-meta');
  if(nameEl) nameEl.textContent = card ? card.name : (item ? item.key : '');
  if(metaEl){
    metaEl.textContent = card
      ? ((card.cardNumber || card.num || '') + ' · ' + (card.rarityLabel || card.rarity || '') + ' · ' + (card.set || card.setCode || ''))
      : '';
  }
  document.getElementById('gift-reveal-card')?.classList.add('flipped');
  giftRevealFlipped = true;
  document.getElementById('gift-reveal-hint').style.display = 'none';
  const isLast = giftRevealIndex >= giftRevealQueue.length - 1;
  document.getElementById('gift-reveal-next').style.display = isLast ? 'none' : '';
  document.getElementById('gift-reveal-done').style.display = isLast ? '' : 'none';
}

function giftRevealNext(){
  if(giftRevealIndex < giftRevealQueue.length - 1){
    giftRevealIndex++;
    giftShowCurrentBack();
  }
}

function closeGiftReveal(){
  const overlay = document.getElementById('gift-reveal');
  if(overlay) overlay.style.display = 'none';
  giftRevealQueue = [];
  giftRevealFlipped = false;
  showToast('Cards added to your collection!');
  if(giftRevealMessageId) mailOpen(giftRevealMessageId);
  giftRevealMessageId = null;
}


function renderMailCompose(el){
  const isAdmin = currentUser && currentUser.is_admin;
  mailComposeAtt = [];
  mailAdminExtraAtt = [];

  el.innerHTML = `<div class="mail-compose team-card">
    <label>To</label>
    <select id="mail-to"><option value="">Loading players…</option></select>
    <label>Subject</label>
    <input type="text" id="mail-subject" maxlength="80" placeholder="e.g. Event prize">
    <label>Message</label>
    <textarea id="mail-body" maxlength="2000" placeholder="Write a message…"></textarea>
    <label>Attach cards</label>
    <input type="search" class="mail-card-search" id="mail-card-search" placeholder="Search cards by name…" oninput="mailFilterCardList()">
    <div class="mail-att-picker" id="mail-att-picker"></div>
    <div class="mail-att-selected" id="mail-att-selected"></div>
    ${isAdmin ? `<label style="display:flex;align-items:center;gap:.45rem;color:var(--text)">
      <input type="checkbox" id="mail-admin-grant" onchange="mailComposeAtt=[];mailRenderSelectedChips();mailRebuildCardPicker()"> Admin grant (spawn cards — not taken from your collection)
    </label>` : ''}
    <label style="display:flex;align-items:center;gap:.45rem;color:var(--text);margin-top:.35rem">
      <input type="checkbox" id="mail-gift-wrap" checked> Gift-wrap attachments (hidden until opened)
    </label>
    <div class="team-actions">
      <button type="button" class="btn" onclick="mailSend()">Send</button>
    </div>
    <div id="mail-send-msg" style="margin-top:.6rem;font-size:.88rem;min-height:1.2em"></div>
  </div>`;

  mailRebuildCardPicker();

  (async () => {
    const sel = document.getElementById('mail-to');
    if(!sel) return;
    try{
      const { data, error } = await sb.from('profiles').select('id, username, display_name').order('username');
      if(error) throw error;
      let players = data || [];
      // Admins can mail themselves for testing
      if(!isAdmin) players = players.filter(p => p.id !== currentUser.id);
      sel.innerHTML = '<option value="">— select player —</option>' +
        players.map(p => {
          const self = p.id === currentUser.id ? ' (you — test)' : '';
          return `<option value="${p.id}">${escapeHtml(p.display_name || p.username)} (@${escapeHtml(p.username)})${self}</option>`;
        }).join('');
    }catch(e){
      sel.innerHTML = '<option value="">Could not load players</option>';
    }
  })();
}

function mailRebuildCardPicker(filter){
  const picker = document.getElementById('mail-att-picker');
  if(!picker) return;
  const isAdmin = currentUser && currentUser.is_admin;
  const adminGrant = !!document.getElementById('mail-admin-grant')?.checked;
  const q = (filter || document.getElementById('mail-card-search')?.value || '').trim().toLowerCase();

  let list = [];
  if(isAdmin && adminGrant){
    list = (typeof CARDS !== 'undefined' ? CARDS : []).slice();
  } else {
    list = (typeof CARDS !== 'undefined' ? CARDS : []).filter(c => colGet(state.collection, c) > 0);
  }
  if(q){
    list = list.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.cardNumber || '').toLowerCase().includes(q) ||
      (c.set || '').toLowerCase().includes(q) ||
      (c.setCode || '').toLowerCase().includes(q)
    );
  }
  list = list.slice(0, 80); // keep DOM light

  if(!list.length){
    picker.innerHTML = '<div class="lb-sub">No cards match. ' +
      (isAdmin && !adminGrant ? 'Turn on Admin grant to attach any card.' : '') + '</div>';
    return;
  }

  picker.innerHTML = list.map(c => {
    const key = c.key || (c.setCode + '-' + c.num);
    const n = colGet(state.collection, c);
    const selected = mailComposeAtt.some(a => a.card_key === key);
    const label = (isAdmin && adminGrant)
      ? `${escapeHtml(c.cardNumber||c.num||'')} ${escapeHtml(c.name)} <span class="lb-sub">(${escapeHtml(c.set||c.setCode||'')})</span>`
      : `${escapeHtml(c.cardNumber||c.num||'')} ${escapeHtml(c.name)} (×${n})`;
    return `<label><input type="checkbox" data-mail-key="${key}" data-mail-name="${escapeHtml(c.name)}" ${selected?'checked':''} onchange="mailToggleAtt(this)"> ${label}</label>`;
  }).join('');
}

function mailFilterCardList(){
  mailRebuildCardPicker();
}

function mailToggleAtt(cb){
  const key = cb.getAttribute('data-mail-key');
  const name = cb.getAttribute('data-mail-name') || key;
  if(cb.checked){
    if(!mailComposeAtt.some(a => a.card_key === key)){
      mailComposeAtt.push({ card_key: key, qty: 1, name });
    }
  } else {
    mailComposeAtt = mailComposeAtt.filter(a => a.card_key !== key);
  }
  mailRenderSelectedChips();
}

function mailRenderSelectedChips(){
  const el = document.getElementById('mail-att-selected');
  if(!el) return;
  if(!mailComposeAtt.length){ el.innerHTML = ''; return; }
  el.innerHTML = mailComposeAtt.map(a =>
    `<span class="mail-att-chip">${escapeHtml(a.name)} ×${a.qty} <button type="button" onclick="mailRemoveAtt('${a.card_key}')" title="Remove">×</button></span>`
  ).join('');
}

function mailRemoveAtt(key){
  mailComposeAtt = mailComposeAtt.filter(a => a.card_key !== key);
  mailRenderSelectedChips();
  mailRebuildCardPicker();
}


async function mailSend(){
  const msg = document.getElementById('mail-send-msg');
  const toId = document.getElementById('mail-to')?.value;
  const subject = document.getElementById('mail-subject')?.value || '';
  const body = document.getElementById('mail-body')?.value || '';
  const giftWrap = !!document.getElementById('mail-gift-wrap')?.checked;
  const adminGrant = !!document.getElementById('mail-admin-grant')?.checked;
  if(msg){ msg.textContent = ''; msg.style.color = 'var(--muted)'; }
  if(!toId){ if(msg){ msg.textContent = 'Choose a recipient'; msg.style.color = '#f87171'; } return; }

  const atts = (mailComposeAtt || []).map(a => ({ card_key: a.card_key, qty: a.qty || 1 }));

  if(!subject.trim() && !body.trim() && !atts.length){
    if(msg){ msg.textContent = 'Add a subject, message, or attachment'; msg.style.color = '#f87171'; }
    return;
  }

  try{
    const { data, error } = await sb.rpc('mail_send', {
      p_to_user_id: toId,
      p_subject: subject,
      p_body: body,
      p_attachments: atts,
      p_gift_wrapped: giftWrap,
      p_as_admin_grant: adminGrant
    });
    if(error) throw error;

    // refresh local collection if we spent cards
    if(atts.length && !adminGrant){
      const { data: row } = await sb.from('profiles').select('collection').eq('id', currentUser.id).single();
      if(row) state.collection = row.collection || {};
      if(typeof updateUI === 'function') updateUI();
      if(typeof renderCollection === 'function') renderCollection();
    }

    if(!adminGrant){
      if(typeof bumpAchStat === 'function') bumpAchStat('mailSent', 1);
      if(typeof markMilestone === 'function') markMilestone('firstMailSent');
      if(atts.length && giftWrap){
        if(typeof bumpAchStat === 'function') bumpAchStat('giftsSent', 1);
        if(typeof markMilestone === 'function') markMilestone('firstGiftSent');
      }
      if(typeof save === 'function') save();
      if(typeof checkNewlyCompletedAchievements === 'function') checkNewlyCompletedAchievements();
    }

    showToast('Mail sent!');
    mailTab = 'sent';
    mailShowTab('sent');
  }catch(e){
    console.error(e);
    if(msg){ msg.textContent = e.message || 'Send failed — run sql/005_mail.sql?'; msg.style.color = '#f87171'; }
  }
}


function navGo(tab){
  document.querySelectorAll('.app-nav-sub').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.app-nav-subbtn').forEach(b => b.classList.remove('active'));
  switchTab(tab);
}

let selectedOpenSet = 'Base Set';

function selectOpenSet(setName){
  selectedOpenSet = setName;
  document.querySelectorAll('#open-set-rail button[data-open-set]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-open-set') === setName);
  });
  updateOpenSetStatus();
  showToast(setName + ' selected');
}

function countPacksForSet(setName){
  ensurePackQueue();
  return (state.packQueue || []).filter(s => s === setName).length;
}

function updateOpenSetStatus(){
  const el = document.getElementById('open-set-status');
  if(!el) return;
  const n = countPacksForSet(selectedOpenSet);
  const total = state.packs || 0;
  el.textContent = selectedOpenSet + ' packs ready: ' + n + (total !== n ? '  ·  total packs: ' + total : '');
  const openBtn = document.getElementById('open-btn');
  if(openBtn && !opening.active){
    openBtn.disabled = n < 1;
    openBtn.textContent = n < 1 ? 'No ' + selectedOpenSet + ' packs' : 'Open Pack (1)';
  }
  const premiumName = document.getElementById('premium-set-name');
  const premiumCount = document.getElementById('premium-pack-count');
  if(premiumName) premiumName.textContent = selectedOpenSet + ' Packs';
  if(premiumCount) premiumCount.textContent = n;
  if(!opening.active && typeof renderSealedPackPreview === 'function') renderSealedPackPreview();
  if(typeof updateMysteryBoxUI === 'function') updateMysteryBoxUI();
}

function renderSealedPackPreview(){
  const summary = document.getElementById('opened-summary');
  if(!summary || (opening && opening.active)) return;
  // Drop any leftover celebration layers when returning to idle pack view
  document.querySelectorAll('.pull-burst,.pull-confetti,.holo-burst').forEach(e => {
    try{ e.remove(); }catch(_){}
  });
  summary.innerHTML = '';
  for(let i=0;i<11;i++){
    const slot = document.createElement('div');
    slot.className = 'mini-card placeholder';
    slot.setAttribute('aria-label', 'Empty card slot ' + (i+1));
    summary.appendChild(slot);
  }
  const allButton = document.getElementById('reveal-all-btn');
  if(allButton) allButton.style.display = 'none';
}


function toggleHomeRail(force){
  /* Activity rail is permanent — keep open */
  const rail = document.getElementById('home-side-rail');
  if(rail){
    rail.classList.add('open');
    rail.setAttribute('aria-hidden', 'false');
  }
  const btn = document.getElementById('home-rail-toggle');
  if(btn) btn.style.display = 'none';
  const backdrop = document.getElementById('home-rail-backdrop');
  if(backdrop) backdrop.classList.remove('show');
}

function ensureHomeRailOpen(){
  toggleHomeRail(true);
}

function updateHomeWelcome(){
  const el = document.getElementById('home-welcome');
  if(!el) return;
  let name = (currentUser && (currentUser.display_name || currentUser.username)) || 'Trainer';
  name = String(name).replace(/\w\S*/g, function(w){ return w.charAt(0).toUpperCase() + w.slice(1); });
  el.textContent = 'Welcome back, ' + name;
  updateHomeDashboard();
}


function renderHomeRareShowcase(){
  const wrap = document.getElementById('home-rare-showcase');
  if(!wrap || typeof CARDS === 'undefined') return;
  const feature = document.getElementById('home-feature-card');
  const titleEl = document.getElementById('home-feature-title');
  const copyEl = document.getElementById('home-feature-copy');
  const btnEl = document.getElementById('home-feature-btn');
  const feat = (typeof getHomeFeatureEvent === 'function') ? getHomeFeatureEvent() : { mode:'default', event:null };

  function setDefaultCards(){
    wrap.classList.remove('mystery-mode');
    wrap.setAttribute('aria-hidden', 'true');
    if(feature) feature.classList.remove('mystery-live');
    if(titleEl) titleEl.textContent = 'Ready to rip?';
    if(copyEl) copyEl.textContent = 'Choose a pack, tear it open, and add new cards to your collection.';
    if(btnEl){
      btnEl.innerHTML = '📦&nbsp; Open a Pack';
      btnEl.onclick = function(){ navGo('open'); };
    }
    const rank = {legendary:4, epic:3, rare:2, uncommon:1, common:0};
    const withArt = CARDS.filter(c => c.art && (c.rarity === 'legendary' || c.rarity === 'epic' || c.rarity === 'rare'));
    withArt.sort((a,b) => (rank[b.rarity]||0) - (rank[a.rarity]||0) || (Number(b.price)||0) - (Number(a.price)||0));
    const picks = [];
    const prefer = [/charizard/i, /blastoise/i, /venusaur/i, /mewtwo/i, /mew\b/i, /gyarados/i];
    for(const re of prefer){
      const hit = withArt.find(c => re.test(c.name) && !picks.includes(c));
      if(hit) picks.push(hit);
      if(picks.length >= 3) break;
    }
    for(const c of withArt){
      if(picks.length >= 3) break;
      if(!picks.includes(c)) picks.push(c);
    }
    if(!picks.length){
      wrap.innerHTML = '<div class="home-rare"></div><div class="home-rare"></div><div class="home-rare"></div>';
      return;
    }
    wrap.innerHTML = picks.slice(0,3).map(c =>
      '<div class="home-rare" title="'+String(c.name||'').replace(/"/g,'')+'"><img src="'+c.art+'" alt="'+String(c.name||'').replace(/"/g,'')+'"></div>'
    ).join('');
  }

  // Park GPC card back in side host unless this render mounts it
  if(typeof evUnmountGpcFromFeature === 'function') evUnmountGpcFromFeature();

  if(feat.mode === 'live' || feat.mode === 'upcoming'){
    const ev = feat.event;
    const meta = evTypeMeta(ev.type);
    const isLive = feat.mode === 'live';
    const whenLine = ev._builtin
      ? (isLive ? 'Live now · Friday' : '')
      : (isLive
          ? ('Live now · ends ' + evFormatWhen(ev.ends_at))
          : ('Starts ' + evFormatWhen(ev.starts_at)));
    const notes = (ev.notes && String(ev.notes).trim()) || meta.blurb;

    if(btnEl) btnEl.style.display = '';
    if(feature) feature.classList.remove('gpc-feature-host');
    wrap.classList.add('mystery-mode');
    wrap.setAttribute('aria-hidden', 'false');
    if(feature) feature.classList.toggle('mystery-live', isLive);
    if(titleEl) titleEl.textContent = (isLive ? '' : 'Up next · ') + evDisplayTitle(ev);
    if(copyEl){
      copyEl.textContent = (whenLine ? whenLine + ' — ' : '') + notes;
    }
    if(btnEl){
      btnEl.innerHTML = (isLive ? meta.icon + '&nbsp; ' + meta.cta : '📅&nbsp; ' + whenLine);
      btnEl.onclick = function(){
        if(isLive) evRunAction(meta.action);
        else showToast(evDisplayTitle(ev) + ' · ' + whenLine);
      };
    }
    if(meta.art){
      const click = isLive && meta.action === 'mystery'
        ? 'openMysteryBoxModal()'
        : (isLive ? "evRunAction('"+meta.action+"')" : "showToast('"+String(evDisplayTitle(ev)).replace(/'/g,"\'")+" · "+String(whenLine).replace(/'/g,"\'")+"')");
      wrap.innerHTML =
        '<button type="button" class="home-mystery-box" onclick="'+click+'" title="'+String(evDisplayTitle(ev)).replace(/"/g,'')+'">'+
          '<img src="'+meta.art+'" alt="'+String(evDisplayTitle(ev)).replace(/"/g,'')+'"/>'+
        '</button>';
    } else {
      const emoji = meta.icon || '✨';
      wrap.innerHTML =
        '<button type="button" class="home-mystery-box home-event-emoji" onclick="'+(isLive ? "evRunAction('"+meta.action+"')" : "showToast('Scheduled')")+'">'+
          '<span style="font-size:5rem;line-height:1;filter:drop-shadow(0 8px 20px rgba(255,203,5,.35))">'+emoji+'</span>'+
        '</button>';
    }
    return;
  }

  if(btnEl) btnEl.style.display = '';
  if(feature) feature.classList.remove('gpc-feature-host');
  setDefaultCards();
}

function evMountGpcInFeature(){
  const host = document.getElementById('home-rare-showcase');
  const gpc = document.getElementById('gpc-card');
  if(!host || !gpc) return;
  host.classList.add('mystery-mode');
  host.setAttribute('aria-hidden', 'false');
  host.innerHTML = '';
  gpc.style.display = '';
  gpc.style.width = '100%';
  gpc.style.maxWidth = '320px';
  gpc.style.margin = '0 auto';
  gpc.setAttribute('aria-hidden', 'false');
  host.appendChild(gpc);
}
function evUnmountGpcFromFeature(){
  const gpc = document.getElementById('gpc-card');
  const park = document.getElementById('gpc-side-park');
  if(!gpc) return;
  const host = document.getElementById('home-rare-showcase');
  if(host && host.contains(gpc) && park){
    gpc.style.display = 'none';
    gpc.style.width = '';
    gpc.style.maxWidth = '';
    gpc.setAttribute('aria-hidden', 'true');
    park.appendChild(gpc);
  } else if(!park){
    gpc.style.display = 'none';
  }
}

function openGpcModal(){
  const modal = document.getElementById('gpc-modal');
  if(!modal) return;
  modal.classList.add('open');
  if(typeof gpcRefresh === 'function') gpcRefresh();
  else if(typeof gpcPaint === 'function') gpcPaint();
}
function closeGpcModal(){
  const modal = document.getElementById('gpc-modal');
  if(modal) modal.classList.remove('open');
}
function gpcSubmitGuessFromModal(){
  const src = document.getElementById('gpc-m-input');
  const dest = document.getElementById('gpc-guess-input');
  if(src && dest) dest.value = src.value;
  if(typeof gpcSubmitGuess === 'function') gpcSubmitGuess();
}
function openMysteryBoxModal(){
  const modal = document.getElementById('mystery-box-modal');
  if(!modal) return;
  if(typeof updateMysteryBoxUI === 'function') updateMysteryBoxUI();
  modal.classList.add('open');
}
function closeMysteryBoxModal(){
  const modal = document.getElementById('mystery-box-modal');
  if(modal) modal.classList.remove('open');
}
function buyMysteryBoxFromModal(){
  if(typeof buyMysteryBox === 'function') buyMysteryBox();
  closeMysteryBoxModal();
  if(typeof renderHomeRareShowcase === 'function') renderHomeRareShowcase();
  if(typeof renderHomeUpcoming === 'function') renderHomeUpcoming();
}


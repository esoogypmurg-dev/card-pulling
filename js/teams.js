/* ========== Phase 4: Teams ========== */
const TEAM_MAX_MEMBERS = 6;

function genInviteCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

async function renderTeams(){
  const el = document.getElementById('teams-view');
  if(!el) return;
  if(!sb || !currentUser){
    el.innerHTML = '<p style="color:var(--muted)">Sign in to use teams.</p>';
    return;
  }
  el.innerHTML = 'Loading…';
  try{
    const { data: membership, error: mErr } = await sb
      .from('team_members')
      .select('team_id, role, joined_at')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if(mErr) throw mErr;

    if(membership){
      await renderMyTeam(el, membership.team_id, membership.role);
    } else {
      renderTeamsNoTeam(el);
    }
  }catch(e){
    console.error(e);
    el.innerHTML = '<p style="color:#f87171">Could not load teams. Did you run sql/003_teams.sql?</p>';
  }
}

function renderTeamsNoTeam(el){
  el.innerHTML = `
    <div class="team-card team-form">
      <h3>Create a team</h3>
      <label>Team name</label>
      <input type="text" id="team-create-name" maxlength="32" placeholder="e.g. Rocket Squad">
      <label>Tag (2–5 letters)</label>
      <input type="text" id="team-create-tag" maxlength="5" placeholder="e.g. RKT" style="text-transform:uppercase">
      <label>Description (optional)</label>
      <textarea id="team-create-desc" maxlength="200" placeholder="What is your team about?"></textarea>
      <div class="team-actions">
        <button type="button" class="btn" onclick="teamCreate()">Create team</button>
      </div>
      <div id="team-create-msg" style="margin-top:.6rem;font-size:.88rem;min-height:1.2em"></div>
    </div>
    <div class="team-card team-form">
      <h3>Join with invite code</h3>
      <label>Invite code</label>
      <input type="text" id="team-join-code" maxlength="8" placeholder="e.g. AB3K7Q" style="text-transform:uppercase;letter-spacing:.1em">
      <div class="team-actions">
        <button type="button" class="btn" onclick="teamJoin()">Join team</button>
      </div>
      <div id="team-join-msg" style="margin-top:.6rem;font-size:.88rem;min-height:1.2em"></div>
    </div>`;
}

async function renderMyTeam(el, teamId, myRole){
  const { data: team, error: tErr } = await sb.from('teams').select('*').eq('id', teamId).single();
  if(tErr) throw tErr;

  const { data: members, error: memErr } = await sb
    .from('team_members')
    .select('user_id, role, joined_at')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });
  if(memErr) throw memErr;

  const ids = (members || []).map(m => m.user_id);
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, username, display_name, money, collection, stats')
    .in('id', ids);
  const byId = {};
  (profiles || []).forEach(p => { byId[p.id] = p; });

  let totalMoney = 0, totalUnique = 0, totalGraded = 0;
  const memberRows = (members || []).map(m => {
    const p = byId[m.user_id] || {};
    const unique = typeof lbUniqueCount === 'function' ? lbUniqueCount(p.collection) : 0;
    const graded = typeof lbGradedCount === 'function' ? lbGradedCount(p.stats) : 0;
    const money = Number(p.money) || 0;
    totalMoney += money;
    totalUnique += unique;
    totalGraded += graded;
    return { ...m, profile: p, unique, graded, money };
  });

  const isLeader = myRole === 'leader' || team.leader_id === currentUser.id;
  const onlineCount = memberRows.filter(m => isPlayerOnline(m.user_id)).length;

  el.innerHTML = `
    <div class="pp-team-profile">
      <section class="pp-hero pp-team-hero">
        <div class="pp-top">
          <div class="pp-avatar pp-team-avatar">👥</div>
          <div class="pp-identity">
            <h1 class="pp-name"><span class="team-tag">${escapeHtml(team.tag)}</span>${escapeHtml(team.name)}</h1>
            <p class="pp-tag">${escapeHtml(team.description || 'No description')} · <b>${onlineCount} online</b></p>
            <div class="pp-rank"><i>♛</i> <span>${isLeader ? 'Team Leader' : 'Team Member'}</span></div>
          </div>
          <div class="pp-actions">
            <button type="button" class="btn btn-secondary" onclick="teamCopyInvite()">Invite · <span id="team-invite-code">${escapeHtml(team.invite_code)}</span></button>
            <button type="button" class="btn btn-secondary" onclick="teamLeave()">Leave Team</button>
            ${isLeader ? `<button type="button" class="btn" style="background:#7f1d1d;border-color:#991b1b" onclick="teamDisband()">Disband</button>` : ''}
          </div>
        </div>
        <div class="pp-stats">
          <div class="pp-stat"><span>Members</span><b>${memberRows.length}/${TEAM_MAX_MEMBERS}</b></div>
          <div class="pp-stat"><span>Online</span><b>${onlineCount}</b></div>
          <div class="pp-stat"><span>Unique cards</span><b>${totalUnique}</b></div>
          <div class="pp-stat"><span>Graded</span><b>${totalGraded}</b></div>
        </div>
      </section>

      <section class="pp-panel pp-team-members-panel">
        <div class="pp-panel-head">
          <h2>Team trainers</h2>
          <span>${onlineCount} online now · $${totalMoney.toFixed(2)} combined</span>
        </div>
        <div class="pp-team-member-grid">
          ${memberRows.map(m => {
            const name = m.profile.display_name || m.profile.username || 'Trainer';
            const role = m.role === 'leader' || m.user_id === team.leader_id ? 'leader' : 'member';
            const online = isPlayerOnline(m.user_id);
            const kickBtn = (isLeader && m.user_id !== currentUser.id)
              ? `<button type="button" class="btn" style="padding:.25rem .5rem;font-size:.72rem;background:#7f1d1d;border-color:#991b1b" onclick="teamKick('${m.user_id}','${escapeHtml(name).replace(/'/g,"\\'")}')">Kick</button>`
              : '';
            const transferBtn = (isLeader && m.user_id !== currentUser.id)
              ? `<button type="button" class="btn btn-secondary" style="padding:.25rem .5rem;font-size:.72rem" onclick="teamTransfer('${m.user_id}','${escapeHtml(name).replace(/'/g,"\\'")}')">Make leader</button>`
              : '';
            return `
              <article class="pp-team-member ${online?'is-online':''}">
                <div class="pp-team-member-top">
                  <div class="pp-team-member-avatar">${online?'⚡':'◇'}</div>
                  <div class="pp-team-member-identity">
                    <h3>${escapeHtml(name)} ${role === 'leader' ? '<span class="team-role">leader</span>' : ''}</h3>
                    <p><i class="pp-status-dot ${online?'online':''}"></i>${online?'Online now':'Offline'}</p>
                  </div>
                </div>
                <div class="pp-team-member-stats">$${m.money.toFixed(2)} · ${m.unique} unique · ${m.graded} graded</div>
                <div class="pp-team-member-actions">${transferBtn}${kickBtn}</div>
              </article>`;
          }).join('')}
        </div>
      </section>
      <div id="team-action-msg" style="margin-top:.6rem;font-size:.88rem;min-height:1.2em"></div>
    </div>`;
}

async function teamCreate(){
  const msg = document.getElementById('team-create-msg');
  const name = (document.getElementById('team-create-name')?.value || '').trim();
  let tag = (document.getElementById('team-create-tag')?.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const description = (document.getElementById('team-create-desc')?.value || '').trim();
  if(msg){ msg.textContent = ''; msg.style.color = 'var(--muted)'; }
  if(!name || name.length < 2){ if(msg){ msg.textContent = 'Name must be at least 2 characters'; msg.style.color = '#f87171'; } return; }
  if(tag.length < 2 || tag.length > 5){ if(msg){ msg.textContent = 'Tag must be 2–5 letters/numbers'; msg.style.color = '#f87171'; } return; }
  if(!sb || !currentUser) return;

  try{
    // already on a team?
    const { data: existing } = await sb.from('team_members').select('team_id').eq('user_id', currentUser.id).maybeSingle();
    if(existing){ if(msg){ msg.textContent = 'You are already on a team'; msg.style.color = '#f87171'; } return; }

    let invite = genInviteCode();
    let team = null;
    for(let attempt = 0; attempt < 5; attempt++){
      const { data, error } = await sb.from('teams').insert({
        name, tag, description, leader_id: currentUser.id, invite_code: invite
      }).select().single();
      if(!error){ team = data; break; }
      if(error.code === '23505'){ invite = genInviteCode(); continue; }
      throw error;
    }
    if(!team) throw new Error('Could not create team');

    const { error: memErr } = await sb.from('team_members').insert({
      team_id: team.id, user_id: currentUser.id, role: 'leader'
    });
    if(memErr){
      // rollback team
      await sb.from('teams').delete().eq('id', team.id);
      throw memErr;
    }
    showToast('Team created!');
    renderTeams();
  }catch(e){
    console.error(e);
    if(msg){ msg.textContent = e.message || 'Failed to create team'; msg.style.color = '#f87171'; }
  }
}

async function teamJoin(){
  const msg = document.getElementById('team-join-msg');
  const code = (document.getElementById('team-join-code')?.value || '').trim().toUpperCase();
  if(msg){ msg.textContent = ''; }
  if(!code){ if(msg){ msg.textContent = 'Enter an invite code'; msg.style.color = '#f87171'; } return; }
  if(!sb || !currentUser) return;

  try{
    const { data: existing } = await sb.from('team_members').select('team_id').eq('user_id', currentUser.id).maybeSingle();
    if(existing){ if(msg){ msg.textContent = 'You are already on a team — leave first'; msg.style.color = '#f87171'; } return; }

    const { data: team, error: tErr } = await sb.from('teams').select('*').eq('invite_code', code).maybeSingle();
    if(tErr) throw tErr;
    if(!team){ if(msg){ msg.textContent = 'Invalid invite code'; msg.style.color = '#f87171'; } return; }

    const { count, error: cErr } = await sb.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', team.id);
    if(cErr) throw cErr;
    if((count || 0) >= TEAM_MAX_MEMBERS){
      if(msg){ msg.textContent = 'Team is full (max '+TEAM_MAX_MEMBERS+')'; msg.style.color = '#f87171'; }
      return;
    }

    const { error } = await sb.from('team_members').insert({
      team_id: team.id, user_id: currentUser.id, role: 'member'
    });
    if(error) throw error;
    showToast('Joined '+team.name+'!');
    renderTeams();
  }catch(e){
    console.error(e);
    if(msg){ msg.textContent = e.message || 'Could not join'; msg.style.color = '#f87171'; }
  }
}

async function teamLeave(){
  if(!sb || !currentUser) return;
  if(!confirm('Leave this team?')) return;
  try{
    const { data: membership } = await sb.from('team_members').select('team_id, role').eq('user_id', currentUser.id).maybeSingle();
    if(!membership){ renderTeams(); return; }

    const { data: team } = await sb.from('teams').select('*').eq('id', membership.team_id).single();
    const isLeader = membership.role === 'leader' || (team && team.leader_id === currentUser.id);

    if(isLeader){
      // If other members exist, must transfer first
      const { data: others } = await sb.from('team_members').select('user_id').eq('team_id', membership.team_id).neq('user_id', currentUser.id);
      if(others && others.length){
        showToast('Transfer leadership before leaving, or disband the team');
        return;
      }
      // last member — delete team
      await sb.from('team_members').delete().eq('user_id', currentUser.id);
      await sb.from('teams').delete().eq('id', membership.team_id);
    } else {
      await sb.from('team_members').delete().eq('user_id', currentUser.id).eq('team_id', membership.team_id);
    }
    showToast('Left the team');
    renderTeams();
  }catch(e){
    console.error(e);
    showToast('Could not leave team');
  }
}

async function teamKick(userId, name){
  if(!sb || !currentUser) return;
  if(!confirm('Kick '+name+' from the team?')) return;
  try{
    const { data: membership } = await sb.from('team_members').select('team_id').eq('user_id', currentUser.id).maybeSingle();
    if(!membership) return;
    const { error } = await sb.from('team_members').delete().eq('team_id', membership.team_id).eq('user_id', userId);
    if(error) throw error;
    showToast('Kicked '+name);
    renderTeams();
  }catch(e){
    console.error(e);
    showToast('Could not kick member');
  }
}

async function teamTransfer(userId, name){
  if(!sb || !currentUser) return;
  if(!confirm('Transfer leadership to '+name+'?')) return;
  try{
    const { data: membership } = await sb.from('team_members').select('team_id').eq('user_id', currentUser.id).maybeSingle();
    if(!membership) return;
    const teamId = membership.team_id;

    // Update team leader_id
    const { error: tErr } = await sb.from('teams').update({ leader_id: userId }).eq('id', teamId).eq('leader_id', currentUser.id);
    if(tErr) throw tErr;

    // Swap roles
    await sb.from('team_members').update({ role: 'member' }).eq('team_id', teamId).eq('user_id', currentUser.id);
    await sb.from('team_members').update({ role: 'leader' }).eq('team_id', teamId).eq('user_id', userId);

    showToast(name+' is now the leader');
    renderTeams();
  }catch(e){
    console.error(e);
    showToast('Could not transfer leadership');
  }
}

async function teamDisband(){
  if(!sb || !currentUser) return;
  if(!confirm('Disband this team for everyone? This cannot be undone.')) return;
  try{
    const { data: membership } = await sb.from('team_members').select('team_id').eq('user_id', currentUser.id).maybeSingle();
    if(!membership) return;
    // members cascade when team deleted
    const { error } = await sb.from('teams').delete().eq('id', membership.team_id).eq('leader_id', currentUser.id);
    if(error) throw error;
    showToast('Team disbanded');
    renderTeams();
  }catch(e){
    console.error(e);
    showToast('Could not disband team');
  }
}

function teamCopyInvite(){
  const el = document.getElementById('team-invite-code');
  const code = el ? el.textContent.trim() : '';
  if(!code) return;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(code).then(() => showToast('Invite code copied')).catch(() => showToast(code));
  } else {
    showToast(code);
  }
}




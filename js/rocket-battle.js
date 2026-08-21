/* ===== TEAM ROCKET DUEL EVENT ===== */
// Team Rocket's deck is the "TR" set in the main catalog (visible in Collection/Binder
// once won, but excluded from packs/trade-up/wheel/market via event_exclusive on `sets`).
let ROCKET_CARDS = [];
let rocketCardsLoaded = false;

async function loadRocketCards(){
  if(rocketCardsLoaded) return;
  if(typeof CARDS === 'undefined' || !CARDS.length) return;
  ROCKET_CARDS = CARDS.filter(c => c.setCode === 'TR').map(c => ({
    id: c.id, key: c.key, name: c.name,
    cardType: (Number(c.hp) || 0) > 0 ? 'pokemon' : 'trainer',
    rarity: c.rarity, type1: c.type1, hp: Number(c.hp) || 0,
    attacks: Array.isArray(c.attacks) ? c.attacks : [],
    art: c.art, price: Number(c.price) || 0,
    battleEligible: c.battleEligible !== false
  }));
  rocketCardsLoaded = ROCKET_CARDS.length > 0;
}

/* ---- Grunt -> Jessie & James -> Giovanni ladder ---- */
function rocketLadderState(){
  if(!state.rocketLadder) state.rocketLadder = { gruntWins: 0, jessieBeat: false, jamesBeat: false };
  return state.rocketLadder;
}

/** Which persona the player currently faces, based on ladder progress. */
function rocketCurrentPersona(){
  const l = rocketLadderState();
  if(l.gruntWins < 5) return 'grunt';
  if(!l.jessieBeat && !l.jamesBeat) return Math.random() < 0.5 ? 'jessie' : 'james';
  if(!l.jessieBeat) return 'jessie';
  if(!l.jamesBeat) return 'james';
  return 'giovanni';
}

const ROCKET_PERSONAS = {
  grunt:    { label: 'Team Rocket Grunt', rarities: ['common','uncommon'] },
  jessie:   { label: 'Jessie', rarities: ['epic'] },
  james:    { label: 'James', rarities: ['epic'] },
  giovanni: { label: 'Giovanni', rarities: ['legendary'] }
};

function rocketLadderLabel(){
  const l = rocketLadderState();
  return 'Grunt ' + Math.min(l.gruntWins,5) + '/5 · Jessie ' + (l.jessieBeat?'✓':'✗') +
    ' · James ' + (l.jamesBeat?'✓':'✗') + ' · Giovanni ' + (l.gruntWins>=5 && l.jessieBeat && l.jamesBeat ? 'Ready' : '🔒');
}

function rocketRenderLadder(){
  const el = document.getElementById('rocket-ladder');
  if(el) el.textContent = rocketLadderLabel();
}

function rocketAdvanceLadder(persona){
  const l = rocketLadderState();
  if(persona === 'grunt') l.gruntWins = Math.min(5, l.gruntWins + 1);
  else if(persona === 'jessie') l.jessieBeat = true;
  else if(persona === 'james') l.jamesBeat = true;
  else if(persona === 'giovanni'){
    // Cleared the whole ladder — reset so they can run it again.
    state.rocketStats = state.rocketStats || { wins:0, losses:0, streak:0 };
    state.rocketStats.giovanniClears = (state.rocketStats.giovanniClears||0) + 1;
    state.rocketLadder = { gruntWins: 0, jessieBeat: false, jamesBeat: false };
  }
}

function rocketResetLadder(){
  state.rocketLadder = { gruntWins: 0, jessieBeat: false, jamesBeat: false };
}

function rocketIsEventArmed(){
  if(typeof scheduledEvents === 'undefined' || !Array.isArray(scheduledEvents)) return false;
  if(typeof evStatus !== 'function') return false;
  return scheduledEvents.some(ev => {
    if(!ev || ev.enabled === false) return false;
    if(ev.type !== 'team_rocket') return false;
    return evStatus(ev) === 'live';
  });
}

let rb = {
  wagerKey: null,
  opponent: null,
  persona: null,
  playerHp: 0, playerMaxHp: 0,
  oppHp: 0, oppMaxHp: 0,
  active: false
};

function rocketPowerScore(hp, attacks){
  const avgDmg = (attacks && attacks.length) ? attacks.reduce((s,a)=>s+(Number(a.damage)||0),0) / attacks.length : 20;
  return (hp || 50) + avgDmg * 3;
}

function rocketOwnedBattleCards(){
  if(!Array.isArray(CARDS)) return [];
  return CARDS.filter(c => c.battleEligible !== false && c.attacks && c.attacks.length &&
    colGet(state.collection, c.key || c.id) > 0);
}

function renderRocketScreen(){
  loadRocketCards().then(rocketRenderWagerList);
  rocketRenderWagerList();
  rocketUpdateStatsBar();
  rocketRenderPreview();
  rocketRenderLadder();
}

function rocketUpdateStatsBar(){
  const rs = state.rocketStats || { wins:0, losses:0, streak:0 };
  const w = document.getElementById('rocket-wins');
  const l = document.getElementById('rocket-losses');
  const s = document.getElementById('rocket-streak');
  if(w) w.textContent = rs.wins || 0;
  if(l) l.textContent = rs.losses || 0;
  if(s) s.textContent = rs.streak || 0;
}

function rocketRenderWagerList(){
  const wrap = document.getElementById('rocket-wager-list');
  if(!wrap) return;
  const owned = rocketOwnedBattleCards();
  wrap.innerHTML = '';
  if(!owned.length){
    wrap.innerHTML = '<div style="color:var(--muted);font-size:.85rem;padding:.5rem">No battle-eligible cards in your collection yet — pull some Pokémon with real attacks first.</div>';
    return;
  }
  owned.forEach(c => {
    const key = c.key || c.id;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rocket-wager-pick' + (rb.wagerKey === key ? ' active' : '');
    btn.disabled = rb.active;
    const img = c.art ? `<img src="${c.art}" onerror="this.style.display='none'">` : `<div style="font-size:1.5rem">${c.emoji||'🎴'}</div>`;
    btn.innerHTML = `${img}<span>${c.name}</span><small>x${colGet(state.collection, key)}</small>`;
    btn.onclick = () => rocketSelectWager(key);
    wrap.appendChild(btn);
  });
}

function rocketSelectWager(key){
  if(rb.active) return;
  rb.wagerKey = key;
  rb.persona = rocketCurrentPersona();
  rb.opponent = rocketPickOpponent(key, rb.persona);
  rocketRenderWagerList();
  rocketRenderPreview();
}

function rocketClearWager(){
  if(rb.active) return;
  rb.wagerKey = null;
  rb.opponent = null;
  rb.persona = null;
  rocketRenderWagerList();
  rocketRenderPreview();
  const log = document.getElementById('rocket-log');
  if(log) log.textContent = '';
}

function rocketPickOpponent(key, persona){
  const card = resolveCard(key);
  if(!card) return null;
  const rarities = new Set((ROCKET_PERSONAS[persona] || ROCKET_PERSONAS.grunt).rarities);
  let pool = ROCKET_CARDS.filter(r => r.battleEligible && r.cardType === 'pokemon' && rarities.has(r.rarity));
  if(!pool.length) pool = ROCKET_CARDS.filter(r => r.battleEligible && r.cardType === 'pokemon');
  if(!pool.length) return null;
  const myScore = rocketPowerScore(card.hp, card.attacks);
  // sort by closeness to my power score, pick from the closest few for some variance
  const sorted = pool.slice().sort((a,b) =>
    Math.abs(rocketPowerScore(a.hp,a.attacks) - myScore) - Math.abs(rocketPowerScore(b.hp,b.attacks) - myScore));
  const candidates = sorted.slice(0, Math.min(4, sorted.length));
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  if(picked) picked.personaLabel = (ROCKET_PERSONAS[persona] || ROCKET_PERSONAS.grunt).label;
  return picked;
}

function rocketRenderPreview(){
  const card = rb.wagerKey ? resolveCard(rb.wagerKey) : null;
  const playerFace = document.getElementById('rocket-player-face');
  const playerName = document.getElementById('rocket-player-name');
  const battleBtn = document.getElementById('rocket-battle-btn');

  if(card){
    playerFace.innerHTML = card.art ? `<img src="${card.art}" onerror="this.style.display='none'">` : `<div style="font-size:2.2rem">${card.emoji||'🎴'}</div>`;
    playerName.textContent = card.name;
  }else{
    playerFace.innerHTML = '<div style="color:var(--muted);text-align:center">Select a card below</div>';
    playerName.textContent = 'No card selected';
  }

  const oppFace = document.getElementById('rocket-opp-face');
  const oppName = document.getElementById('rocket-opp-name');
  if(rb.opponent){
    oppFace.innerHTML = rb.opponent.art ? `<img src="${rb.opponent.art}" onerror="this.style.display='none'">` : '<div style="font-size:2.2rem">🚀</div>';
    oppName.textContent = (rb.opponent.personaLabel ? rb.opponent.personaLabel + ' sent out ' : '') + rb.opponent.name;
  }else{
    oppFace.innerHTML = '<div style="color:var(--muted);text-align:center">🚀<br>Opponent</div>';
    oppName.textContent = 'Waiting for battle';
  }

  const pHp = card ? (card.hp || 50) : 0;
  const oHp = rb.opponent ? (rb.opponent.hp || 50) : 0;
  rocketSetHpDisplay('player', pHp, pHp);
  rocketSetHpDisplay('opp', oHp, oHp);

  document.getElementById('rocket-attack-row').innerHTML = '';
  battleBtn.disabled = !(card && rb.opponent) || rb.active;
}

function rocketSetHpDisplay(side, cur, max){
  const label = document.getElementById('rocket-' + side + '-hp-label');
  const bar = document.getElementById('rocket-' + side + '-hpbar');
  if(label) label.textContent = max ? (Math.max(0,cur) + ' / ' + max) : '—';
  if(bar) bar.style.width = max ? (Math.max(0, cur / max * 100) + '%') : '100%';
}

function rocketLog(msg){
  const log = document.getElementById('rocket-log');
  if(log) log.textContent = msg;
}

function rocketStartBattle(){
  const card = rb.wagerKey ? resolveCard(rb.wagerKey) : null;
  if(!card || !rb.opponent || rb.active) return;

  rb.active = true;
  rb.playerMaxHp = card.hp || 50;
  rb.playerHp = rb.playerMaxHp;
  rb.oppMaxHp = rb.opponent.hp || 50;
  rb.oppHp = rb.oppMaxHp;

  document.getElementById('rocket-battle-btn').disabled = true;
  rocketRenderWagerList();
  rocketSetHpDisplay('player', rb.playerHp, rb.playerMaxHp);
  rocketSetHpDisplay('opp', rb.oppHp, rb.oppMaxHp);
  rocketLog(rb.opponent.name + ' is ready to fight!');

  const row = document.getElementById('rocket-attack-row');
  row.innerHTML = '';
  (card.attacks || []).forEach((atk, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = atk.name + ' (' + atk.damage + ')';
    btn.onclick = () => rocketPlayerAttack(idx);
    row.appendChild(btn);
  });
}

function rocketPlayerAttack(idx){
  const card = resolveCard(rb.wagerKey);
  if(!card || !rb.active) return;
  const atk = card.attacks[idx];
  if(!atk) return;

  document.querySelectorAll('#rocket-attack-row .btn').forEach(b => b.disabled = true);

  const variance = 0.8 + Math.random() * 0.4; // 80%-120%
  const dmg = Math.round((Number(atk.damage) || 0) * variance);
  rb.oppHp = Math.max(0, rb.oppHp - dmg);
  rocketSetHpDisplay('opp', rb.oppHp, rb.oppMaxHp);
  rocketLog(card.name + ' used ' + atk.name + ' for ' + dmg + ' damage!');

  setTimeout(() => {
    if(rb.oppHp <= 0){ rocketFinishBattle(true); return; }
    rocketOpponentTurn();
  }, 900);
}

function rocketOpponentTurn(){
  const attacks = rb.opponent.attacks || [];
  if(!attacks.length){ rocketFinishBattle(true); return; }
  // weighted toward higher-damage attack, but not exclusively
  const atk = Math.random() < 0.65
    ? attacks.slice().sort((a,b) => (b.damage||0)-(a.damage||0))[0]
    : attacks[Math.floor(Math.random()*attacks.length)];

  const variance = 0.8 + Math.random() * 0.4;
  const dmg = Math.round((Number(atk.damage) || 0) * variance);
  rb.playerHp = Math.max(0, rb.playerHp - dmg);
  rocketSetHpDisplay('player', rb.playerHp, rb.playerMaxHp);
  rocketLog(rb.opponent.name + ' used ' + atk.name + ' for ' + dmg + ' damage!');

  setTimeout(() => {
    if(rb.playerHp <= 0){ rocketFinishBattle(false); return; }
    document.querySelectorAll('#rocket-attack-row .btn').forEach(b => b.disabled = false);
  }, 900);
}

async function rocketFinishBattle(won){
  rb.active = false;
  const card = resolveCard(rb.wagerKey);
  const opp = rb.opponent;

  state.rocketStats = state.rocketStats || { wins:0, losses:0, streak:0 };

  if(won){
    state.rocketStats.wins = (state.rocketStats.wins||0) + 1;
    state.rocketStats.streak = (state.rocketStats.streak||0) + 1;

    // award the Team Rocket card
    if(opp && opp.key){
      colSet(state.collection, opp.key, colGet(state.collection, opp.key) + 1);
    }

    // bonus roll: small chance at a Trainer/Energy Team Rocket card too
    let bonusMsg = '';
    if(Math.random() < 0.2){
      const bonusPool = ROCKET_CARDS.filter(r => r.cardType !== 'pokemon');
      if(bonusPool.length){
        const bonus = bonusPool[Math.floor(Math.random()*bonusPool.length)];
        colSet(state.collection, bonus.key, colGet(state.collection, bonus.key) + 1);
        bonusMsg = ' Bonus drop: ' + bonus.name + '!';
      }
    }

    const wasGiovanni = rb.persona === 'giovanni';
    rocketAdvanceLadder(rb.persona);

    rocketLog('You won! ' + opp.name + ' joins your collection.' + bonusMsg +
      (wasGiovanni ? ' Giovanni is defeated — the ladder resets, go again!' : ''));
    showToast(wasGiovanni ? 'Giovanni defeated! Ladder reset — run it again.' : 'Victory! Won ' + opp.name + (bonusMsg ? ' + bonus card' : ''));
  }else{
    state.rocketStats.losses = (state.rocketStats.losses||0) + 1;
    state.rocketStats.streak = 0;
    rocketResetLadder();

    if(card){
      const key = card.key || card.id;
      colSet(state.collection, key, Math.max(0, colGet(state.collection, key) - 1));
    }

    rocketLog('You lost! ' + (card ? card.name : 'Your card') + ' was taken by Team Rocket. Ladder reset — back to Grunt 1.');
    showToast('Defeat — your wagered card was lost. Ladder reset.');
  }

  if(typeof save === 'function') await save();
  if(typeof updateUI === 'function') updateUI();
  if(typeof renderCollection === 'function') renderCollection();

  rocketUpdateStatsBar();
  rocketRenderLadder();
  rb.wagerKey = null;
  rb.opponent = null;
  rb.persona = null;

  setTimeout(() => {
    rocketRenderWagerList();
    rocketRenderPreview();
  }, 1500);
}

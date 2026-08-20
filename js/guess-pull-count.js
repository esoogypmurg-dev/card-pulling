/* ========== GUESS THE PULL COUNT ========== */
const GPC_CHASE_PRICE = 75; // legendary AND price >= this
let gpcState = null;
let gpcChannel = null;
let gpcPollTimer = null;
let gpcSubmitting = false;

function isChaseCard(card){
  if(!card) return false;
  // Chase = Rare Holo (legendary) AND price >= $75
  if(card.rarity !== 'legendary') return false;
  const price = Number(card.price) || 0;
  return price >= GPC_CHASE_PRICE;
}

function gpcBestChase(cards){
  if(!Array.isArray(cards) || !cards.length) return null;
  const chases = cards.filter(isChaseCard);
  if(!chases.length) return null;
  chases.sort((a,b) => (Number(b.price)||0) - (Number(a.price)||0));
  return chases[0];
}

function gpcCardKey(card){
  if(!card) return null;
  if(card.setCode && card.num) return String(card.setCode) + '-' + String(card.num);
  if(typeof toCardKey === 'function'){
    try { return toCardKey(card); } catch(e) {}
  }
  return card.id != null ? String(card.id) : null;
}

function gpcFormatMoney(n){
  const v = Number(n) || 0;
  return '$' + v.toFixed(v % 1 === 0 ? 0 : 2);
}

function gpcRelativeTime(iso){
  if(!iso) return '';
  const t = new Date(iso).getTime();
  if(!t) return '';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if(sec < 60) return 'just now';
  if(sec < 3600) return Math.floor(sec/60) + 'm ago';
  if(sec < 86400) return Math.floor(sec/3600) + 'h ago';
  return Math.floor(sec/86400) + 'd ago';
}

function gpcPaint(){
  const countEl = document.getElementById('gpc-count');
  const prizeEl = document.getElementById('gpc-prize');
  const lastEl = document.getElementById('gpc-last');
  const statusEl = document.getElementById('gpc-status');
  const guessRow = document.getElementById('gpc-guess-row');
  const signinEl = document.getElementById('gpc-signin');
  const input = document.getElementById('gpc-guess-input');
  const btn = document.getElementById('gpc-guess-btn');
  if(!countEl) return;

  const active = gpcState && gpcState.active ? gpcState.active : null;
  const last = gpcState && gpcState.last_ended ? gpcState.last_ended : null;
  const myGuess = gpcState ? gpcState.my_guess : null;
  const closest = gpcState ? gpcState.closest : null;
  const guessCount = gpcState ? (gpcState.guess_count || 0) : 0;

  const count = active ? (Number(active.current_count) || 0) : 0;
  const prize = active ? (Number(active.prize_pool) || 20) : 20;
  countEl.innerHTML = '<span>' + count + '</span>';
  if(prizeEl) prizeEl.textContent = gpcFormatMoney(prize) + ' prize';

  if(lastEl){
    if(last && last.last_chase_card_name){
      const who = last.last_chase_username || 'Someone';
      const when = gpcRelativeTime(last.last_chase_at);
      const price = last.last_chase_card_price != null ? ' · ' + gpcFormatMoney(last.last_chase_card_price) : '';
      let winLine = '';
      if(last.winner_username && last.winning_guess != null){
        winLine = '<br>Winner: <strong>' + String(last.winner_username).replace(/</g,'&lt;') + '</strong> guessed ' + last.winning_guess +
          ' (hit at ' + (last.current_count || '?') + ') · won ' + gpcFormatMoney(last.prize_pool);
      }
      lastEl.innerHTML = 'Last Chase: <span class="gpc-chase-name">' + String(last.last_chase_card_name).replace(/</g,'&lt;') + '</span>' + price +
        '<br>by <strong>' + String(who).replace(/</g,'&lt;') + '</strong>' + (when ? ' · ' + when : '') + winLine;
    } else {
      lastEl.textContent = 'Waiting for the first Chase…';
    }
  }

  const loggedIn = !!(currentUser && currentUser.id && currentUser.id !== 'local-admin');
  if(signinEl) signinEl.style.display = loggedIn ? 'none' : 'block';
  if(guessRow) guessRow.style.display = loggedIn ? 'flex' : 'none';

  if(statusEl){
    statusEl.className = 'gpc-status';
    if(!loggedIn){
      statusEl.textContent = '';
    } else if(myGuess != null){
      statusEl.classList.add('mine');
      let extra = '';
      if(closest && closest.guess != null){
        extra = ' · closest so far: ' + closest.guess + (closest.username ? ' (' + closest.username + ')' : '');
      }
      statusEl.textContent = 'You guessed ' + myGuess + ' · ' + guessCount + ' guess' + (guessCount===1?'':'es') + extra;
      if(input){ input.disabled = true; input.value = myGuess; }
      if(btn) btn.disabled = true;
    } else {
      let extra = guessCount ? (guessCount + ' guess' + (guessCount===1?'':'es') + ' in') : 'No guesses yet';
      if(closest && closest.guess != null) extra += ' · closest: ' + closest.guess;
      statusEl.textContent = extra;
      if(input){ input.disabled = false; }
      if(btn) btn.disabled = false;
    }
  }


  // Mirror into clean event modal (if present)
  const mCount = document.getElementById('gpc-m-count');
  const mPrize = document.getElementById('gpc-m-prize');
  const mLast = document.getElementById('gpc-m-last');
  const mStatus = document.getElementById('gpc-m-status');
  const mRow = document.getElementById('gpc-m-guess-row');
  const mSignin = document.getElementById('gpc-m-signin');
  const mInput = document.getElementById('gpc-m-input');
  const mBtn = document.getElementById('gpc-m-btn');
  if(mCount) mCount.textContent = String(count);
  if(mPrize) mPrize.textContent = gpcFormatMoney(prize) + ' prize';
  if(mLast && lastEl) mLast.innerHTML = lastEl.innerHTML;
  if(mSignin) mSignin.style.display = loggedIn ? 'none' : 'block';
  if(mRow) mRow.style.display = loggedIn ? 'flex' : 'none';
  if(mStatus){
    mStatus.className = 'gpc-modal-status';
    if(!loggedIn){
      mStatus.textContent = '';
    } else if(myGuess != null){
      mStatus.classList.add('mine');
      let extra = '';
      if(closest && closest.guess != null){
        extra = ' · closest so far: ' + closest.guess + (closest.username ? ' (' + closest.username + ')' : '');
      }
      mStatus.textContent = 'You guessed ' + myGuess + ' · ' + guessCount + ' guess' + (guessCount===1?'':'es') + extra;
      if(mInput){ mInput.disabled = true; mInput.value = myGuess; }
      if(mBtn) mBtn.disabled = true;
    } else {
      let extra = guessCount ? (guessCount + ' guess' + (guessCount===1?'':'es') + ' in') : 'No guesses yet';
      if(closest && closest.guess != null) extra += ' · closest: ' + closest.guess;
      mStatus.textContent = extra;
      if(mInput) mInput.disabled = false;
      if(mBtn) mBtn.disabled = false;
    }
  }

}

async function gpcRefresh(){
  if(!sb) return;
  try{
    const { data, error } = await sb.rpc('gpc_get_state');
    if(error) throw error;
    gpcState = data;
    gpcPaint();
  }catch(e){
    console.warn('[gpc] refresh failed', e);
    const statusEl = document.getElementById('gpc-status');
    if(statusEl && !gpcState) statusEl.textContent = 'Event loading…';
  }
}

async function gpcRecordOpen(cards){
  if(!sb || !currentUser || currentUser.id === 'local-admin') return;
  const chase = gpcBestChase(cards);
  const uname = currentUser.display_name || currentUser.username || 'Trainer';
  try{
    const { data, error } = await sb.rpc('gpc_record_open', {
      p_user_id: currentUser.id,
      p_username: uname,
      p_chase_card_key: chase ? gpcCardKey(chase) : null,
      p_chase_card_name: chase ? chase.name : null,
      p_chase_card_price: chase ? (Number(chase.price) || 0) : null
    });
    if(error) throw error;
    if(data && data.event === 'chase'){
      gpcState = {
        active: data.new_round,
        last_ended: data.ended_round,
        my_guess: null,
        guess_count: 0,
        closest: null
      };
      gpcPaint();
      const w = data.winner;
      if(w){
        showToast('Chase! ' + (w.username || 'Someone') + ' wins ' + gpcFormatMoney(w.prize) + ' (guessed ' + w.guess + ', hit at ' + w.actual + ')');
        if(w.user_id === currentUser.id){
          // Refresh own balance after prize credit
          try{
            const { data: me } = await sb.from('profiles').select('money').eq('id', currentUser.id).single();
            if(me && me.money != null){ state.money = Number(me.money); save(); updateUI(); }
          }catch(e2){}
        }
      } else {
        showToast('Chase pulled! New Pull Count round started.');
      }
      // Reload full state for guess counts etc.
      setTimeout(gpcRefresh, 400);
    } else if(data && data.round){
      if(!gpcState) gpcState = {};
      gpcState.active = data.round;
      gpcPaint();
    } else {
      gpcRefresh();
    }
  }catch(e){
    console.warn('[gpc] record_open failed', e);
  }
}

async function gpcRecordSpend(amount){
  if(!sb || !currentUser || currentUser.id === 'local-admin') return;
  const amt = Number(amount) || 0;
  if(amt <= 0) return;
  try{
    const { data, error } = await sb.rpc('gpc_record_spend', { p_amount: amt });
    if(error) throw error;
    if(data){
      if(!gpcState) gpcState = {};
      gpcState.active = data;
      gpcPaint();
    }
  }catch(e){
    console.warn('[gpc] record_spend failed', e);
  }
}

async function gpcSubmitGuess(){
  if(gpcSubmitting) return;
  if(!sb || !currentUser || currentUser.id === 'local-admin'){
    showToast('Sign in to guess');
    return;
  }
  const input = document.getElementById('gpc-guess-input');
  if(!input) return;
  const raw = String(input.value || '').trim();
  if(raw === '' || isNaN(Number(raw))){ showToast('Enter a number'); return; }
  const guess = Math.floor(Number(raw));
  if(guess < 0 || guess > 100000){ showToast('Guess must be 0–100000'); return; }

  gpcSubmitting = true;
  const btn = document.getElementById('gpc-guess-btn');
  if(btn) btn.disabled = true;
  try{
    const { data, error } = await sb.rpc('gpc_submit_guess', { p_guess: guess });
    if(error) throw error;
    if(data && data.ok === false && data.error === 'already_guessed'){
      showToast('You already guessed this round');
      await gpcRefresh();
      return;
    }
    if(data && data.ok){
      showToast('Guess locked in: ' + guess);
      await gpcRefresh();
    } else {
      await gpcRefresh();
    }
  }catch(e){
    console.error('[gpc] submit failed', e);
    showToast('Could not submit guess');
    if(btn) btn.disabled = false;
  }finally{
    gpcSubmitting = false;
  }
}

function startGpcWatcher(){
  stopGpcWatcher();
  gpcRefresh();
  if(!sb) return;
  try{
    gpcChannel = sb.channel('gpc-rounds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pull_count_rounds' }, () => {
        gpcRefresh();
      })
      .subscribe();
  }catch(e){
    console.warn('[gpc] realtime subscribe failed', e);
  }
  // Fallback poll so guests and non-realtime still stay live
  gpcPollTimer = setInterval(gpcRefresh, 12000);
}

function stopGpcWatcher(){
  if(gpcChannel && sb){
    try{ sb.removeChannel(gpcChannel); }catch(e){}
    gpcChannel = null;
  }
  if(gpcPollTimer){ clearInterval(gpcPollTimer); gpcPollTimer = null; }
}

// Allow Enter key in guess input
document.addEventListener('keydown', function(e){
  if(e.key === 'Enter' && e.target && e.target.id === 'gpc-guess-input'){
    e.preventDefault();
    gpcSubmitGuess();
  }
});



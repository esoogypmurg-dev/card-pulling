/* ===== DAILY + QUESTS / ACHIEVEMENTS ===== */
function todayKey(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function canClaimDaily(){
  return state.dailyClaim !== todayKey();
}
function updateDailyUI(){
  const btns = [document.getElementById('daily-btn'), document.getElementById('daily-btn-side')].filter(Boolean);
  const notes = [document.getElementById('daily-note'), document.getElementById('daily-note-side')].filter(Boolean);
  if(!btns.length) return;
  if(canClaimDaily()){
    btns.forEach(btn => { btn.disabled = false; btn.textContent = '🎁 Daily Free Pack'; });
    notes.forEach(note => { note.textContent = 'Available now'; });
  } else {
    btns.forEach(btn => { btn.disabled = true; btn.textContent = '✓ Claimed today'; });
    notes.forEach(note => { note.textContent = 'Come back tomorrow'; });
  }
}
function claimDailyPack(){
  if(!canClaimDaily()){ showToast('Already claimed today'); return; }
  state.dailyClaim = todayKey();
  state.packs += 1;
  ensurePackQueue();
  state.packQueue.push(selectedOpenSet || 'Base Set');
  save(); updateUI(); renderQuests();
  showToast('Daily free pack claimed! (+1 ' + (selectedOpenSet||'Base Set') + ' pack)');
}


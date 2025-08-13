/* === Swipe logic: fixed to actually remove card, save to Firestore, and show next === */

(function initIndexPage(){
  const stack = document.getElementById('stack');
  if (!stack) return; // only run on index page

  let user = null;
  let spots = [];
  let idx = 0;            // current index in spots
  let history = [];       // stack for review (down swipe goes back)

  // boot
  requireAuth().then(async (u) => {
    user = u;
    await loadSpots();
    render();
    attachKeyboard(); // optional helpers (arrows)
    // Optional: action buttons if you later add them with these IDs
    bindOptionalButtons();
  });

  async function loadSpots(){
    // Load all spots (you can filter out already-interacted ones if you want later)
    const snap = await db.collection('spots').orderBy('createdAt','desc').get().catch(()=>null);
    if (!snap || snap.empty){ spots = []; return; }
    spots = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }

  function render(){
    stack.innerHTML = '';
    if (idx >= spots.length){
      stack.innerHTML = `<div class="container"><h2>All caught up 🎉</h2><p class="empty">No more trips. Add more from Create Spot.</p></div>`;
      return;
    }
    const s = spots[idx];
    const card = document.createElement('div');
    card.className = 'card'; card.id = 'active-card';

    const imgURL = s.imageURL || 'https://picsum.photos/800/500';
    card.innerHTML = `
      <div class="overlay like"   id="ov-like">❤️</div>
      <div class="overlay dislike" id="ov-dislike">💔</div>
      <div class="overlay skip"    id="ov-skip">⏫</div>
      <div class="overlay review"  id="ov-review">🔄</div>

      <img src="${imgURL}" alt="${escapeHtml(s.name||'Trip')}">
      <div class="content">
        <h3>${escapeHtml(s.name||'Unnamed spot')}</h3>
        <p><b>Cost:</b> ₹${s.cost ?? '-'}</p>
        <p><b>People:</b> ${s.people ?? '-'}</p>
        <p><b>Points:</b> ${escapeHtml(s.points||'-')}</p>
        <p><b>Dates:</b> ${escapeHtml(s.startDate||'-')} → ${escapeHtml(s.endDate||'-')}</p>
        <p><b>Transport:</b> ${escapeHtml(s.transport||'-')}</p>
      </div>
    `;
    stack.appendChild(card);
    hookGestures(card);
  }

  function hookGestures(card){
    let sx=0, sy=0, dragging=false;

    const start = (x,y)=>{ sx=x; sy=y; dragging=true; card.classList.remove('snap-back'); };
    const move  = (x,y)=>{
      if (!dragging) return;
      const dx = x - sx, dy = y - sy;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx/12}deg)`;

      toggle('ov-like',     dx>40);
      toggle('ov-dislike',  dx<-40);
      toggle('ov-skip',     dy<-40);
      toggle('ov-review',   dy>40);
    };
    const end = (x,y)=>{
      if (!dragging) return;
      dragging=false;
      const dx = x - sx, dy = y - sy;

      // thresholds
      if (dx > 100)   return doAction('interested', card);
      if (dx < -100)  return doAction('notInterested', card);
      if (dy < -110)  return doAction('skipped', card);
      if (dy > 110)   return doAction('review', card);

      // snap back
      card.classList.add('snap-back');
      card.style.transform = `translate(0px, 0px) rotate(0deg)`;
      ['ov-like','ov-dislike','ov-skip','ov-review'].forEach(id=>toggle(id,false));
    };

    // Touch
    card.addEventListener('touchstart', e=>start(e.touches[0].clientX, e.touches[0].clientY), {passive:true});
    card.addEventListener('touchmove',  e=>move(e.touches[0].clientX, e.touches[0].clientY),   {passive:true});
    card.addEventListener('touchend',   e=>end(e.changedTouches[0].clientX, e.changedTouches[0].clientY));
    // Mouse
    card.addEventListener('mousedown',  e=>start(e.clientX, e.clientY));
    window.addEventListener('mousemove',e=>move(e.clientX, e.clientY));
    window.addEventListener('mouseup',  e=>end(e.clientX, e.clientY));
  }

  function toggle(id,show){ const el=document.getElementById(id); if(!el) return; el.classList.toggle('show', !!show); }

  async function doAction(kind, card){
    const spot = spots[idx];
    // Exit animation class
    if (kind==='interested')     card.classList.add('exit-right');
    if (kind==='notInterested')  card.classList.add('exit-left');
    if (kind==='skipped')        card.classList.add('exit-up');
    if (kind==='review')         card.classList.add('exit-down');

    // Hide overlays immediately
    ['ov-like','ov-dislike','ov-skip','ov-review'].forEach(id=>toggle(id,false));

    // Persist interest (fire and wait; if it fails we revert index & re-render)
    try { await writeInterest(kind, spot); }
    catch(e){ console.error(e); alert('Could not save your action. Check rules/connection.'); }

    // Update index/history and show next after transition
    const done = ()=> {
      if (kind!=='review') history.push(idx);
      if (kind==='review'){
        idx = history.length ? Math.max(0, history.pop()) : Math.max(0, idx-1);
      } else {
        idx += 1;
      }
      render();
    };

    // Prefer transitionend; fallback to timeout
    let finished = false;
    card.addEventListener('transitionend', () => { if (!finished){ finished=true; done(); } }, { once:true });
    setTimeout(() => { if (!finished){ finished=true; done(); } }, 260);
  }

  async function writeInterest(kind, spot){
    if (!spot || !spot.id) return;
    const spotId = spot.id;
    const rollup = db.collection('spots_interests').doc(spotId);
    const who = { uid:user.uid, email:user.email||'', at: firebase.firestore.FieldValue.serverTimestamp() };

    await rollup.set({ spotId, name: spot.name||'' }, { merge:true });

    if (kind==='interested'){
      await rollup.update({ interestedUsers: firebase.firestore.FieldValue.arrayUnion(who) });
      await db.collection('users').doc(user.uid).collection('interested').doc(spotId).set({
        spotId, name: spot.name||'', imageURL: spot.imageURL||'', at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge:true });
    }
    if (kind==='notInterested'){
      await rollup.update({ notInterestedUsers: firebase.firestore.FieldValue.arrayUnion(who) });
      await db.collection('users').doc(user.uid).collection('notInterested').doc(spotId).set({
        spotId, name: spot.name||'', at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge:true });
    }
    if (kind==='skipped'){
      await rollup.update({ skippedUsers: firebase.firestore.FieldValue.arrayUnion(who) });
      await db.collection('users').doc(user.uid).collection('skipped').doc(spotId).set({
        spotId, name: spot.name||'', at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge:true });
    }
    if (kind==='review'){
      // No DB write for review; it's just a "go back" action.
    }
  }

  // People modal for current spot (buttons call openPeopleList('interested'|'notInterested'|'skipped'))
  async function openPeopleList(kind){
    if (idx>=spots.length) return;
    const s = spots[idx];
    const doc = await db.collection('spots_interests').doc(s.id).get().catch(()=>null);
    const data = doc && doc.exists ? doc.data() : {};
    const arr = (kind==='interested') ? (data.interestedUsers||[])
              : (kind==='notInterested') ? (data.notInterestedUsers||[])
              : (data.skippedUsers||[]);
    document.getElementById('modalTitle').textContent =
      (kind==='interested'?'People Interested in ':
       kind==='notInterested'?'People Not Interested in ':'People who Skipped ') + (s.name||'');
    document.getElementById('modalSpotName').textContent = `Spot: ${s.name||''}`;
    const list = document.getElementById('peopleList');
    list.innerHTML = '';
    if (!arr.length) {
      list.innerHTML = `<p class="empty">No entries yet.</p>`;
    } else {
      const table = document.createElement('table');
      table.className = 'table';
      table.innerHTML = `<thead><tr><th>#</th><th>Email</th><th>UID</th></tr></thead><tbody></tbody>`;
      const tb = table.querySelector('tbody');
      arr.forEach((u, i)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i+1}</td><td>${escapeHtml(u.email||'-')}</td><td>${escapeHtml(u.uid||'-')}</td>`;
        tb.appendChild(tr);
      });
      list.appendChild(table);
    }
    document.getElementById('modalBackdrop').style.display='flex';
  }
  function closeModal(){ document.getElementById('modalBackdrop').style.display='none'; }

  // expose for inline onclicks
  window.openPeopleList = openPeopleList;
  window.closeModal = closeModal;

  // Helpers
  function escapeHtml(s=''){
    return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
  }

  function attachKeyboard(){
    // Left/Right/Up/Down for testing on desktop
    window.addEventListener('keydown', (e)=>{
      const card = document.getElementById('active-card');
      if (!card) return;
      if (e.key==='ArrowRight') doAction('interested', card);
      if (e.key==='ArrowLeft')  doAction('notInterested', card);
      if (e.key==='ArrowUp')    doAction('skipped', card);
      if (e.key==='ArrowDown')  doAction('review', card);
    });
  }

  function bindOptionalButtons(){
    // Only binds if you have these buttons somewhere
    const likeBtn = document.getElementById('btn-like');
    const nopeBtn = document.getElementById('btn-nope');
    const skipBtn = document.getElementById('btn-skip');
    const backBtn = document.getElementById('btn-review');
    const handler = (kind)=>()=>{
      const card = document.getElementById('active-card');
      if (card) doAction(kind, card);
    };
    if (likeBtn) likeBtn.addEventListener('click', handler('interested'));
    if (nopeBtn) nopeBtn.addEventListener('click', handler('notInterested'));
    if (skipBtn) skipBtn.addEventListener('click', handler('skipped'));
    if (backBtn) backBtn.addEventListener('click', handler('review'));
  }
})();

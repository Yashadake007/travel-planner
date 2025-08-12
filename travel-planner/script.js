// script.js — fixed & robust swipe + lists + auth UI updates

// DOM references
const cardStack = document.getElementById('card-stack');
const emptyState = document.getElementById('empty-state');
const overlay = document.getElementById('swipe-overlay');
const overlayIcon = document.getElementById('overlay-icon');

const btnInterested = document.getElementById('btn-interested');
const btnNot = document.getElementById('btn-not');
const btnSkip = document.getElementById('btn-skip');
const btnReview = document.getElementById('btn-review');
const btnLogout = document.getElementById('btn-logout');

const modal = document.getElementById('list-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

const topLogin = document.getElementById('top-login');
const topSignup = document.getElementById('top-signup');

modalClose && modalClose.addEventListener('click', ()=> modal.classList.add('hidden'));

// state
let spots = [];
let uid = 'anon';
let activeCard = null;
let isDragging = false;
let startX = 0, startY = 0, currentX = 0, currentY = 0;

// escape helper
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// hide/show top buttons on auth state
auth.onAuthStateChanged(user => {
  if(user){
    uid = user.uid;
    if(topLogin) topLogin.style.display = 'none';
    if(topSignup) topSignup.style.display = 'none';
  } else {
    uid = 'anon';
    if(topLogin) topLogin.style.display = '';
    if(topSignup) topSignup.style.display = '';
  }
  loadSpots();
});

// navigations
topLogin && (topLogin.onclick = () => window.location.href = 'login.html');
topSignup && (topSignup.onclick = () => window.location.href = 'signup.html');

// load spots
function loadSpots(){
  db.collection('spots').orderBy('departureDate').get()
    .then(snapshot => {
      spots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderStack();
    })
    .catch(err => {
      console.error('loadSpots', err);
      cardStack.innerHTML = '<div style="color:var(--muted)">Error loading spots</div>';
    });
}

// render
function renderStack(){
  cardStack.innerHTML = '';
  if(!spots || spots.length === 0){
    emptyState.style.display = 'block';
    return;
  } else emptyState.style.display = 'none';

  // create cards bottom to top (so last is top)
  for(let i=0;i<spots.length;i++){
    const spot = spots[i];
    const card = document.createElement('div');
    card.className = 'trip-card';
    card.dataset.id = spot.id;
    card.dataset.index = i;
    const imageUrl = escapeHtml(spot.imageUrl || spot.image || '');
    const title = escapeHtml(spot.title || spot.name || 'Untitled');
    const desc = escapeHtml(spot.description || spot.desc || '');
    card.innerHTML = `
      <div class="trip-image" style="background-image:url('${imageUrl}')"></div>
      <div class="trip-content">
        <div class="trip-title">${title}</div>
        <div class="trip-sub">${desc}</div>
      </div>
    `;
    const offset = spots.length - i - 1;
    card.style.zIndex = 100 + offset;
    card.style.transform = `scale(${1 - offset*0.02}) translateY(${offset*6}px)`;
    cardStack.appendChild(card);
  }

  // attach to top card
  attachTopCardHandlers();
}

function attachTopCardHandlers(){
  const top = cardStack.querySelector('.trip-card:last-child');
  if(!top) return;

  // ensure we don't double-attach by removing previous listeners
  top.removeEventListener('pointerdown', startDrag);
  top.addEventListener('pointerdown', startDrag);
  // use window listeners for move/up so pointer capture works across viewport
  window.removeEventListener('pointermove', onDrag);
  window.removeEventListener('pointerup', endDrag);
  window.addEventListener('pointermove', onDrag);
  window.addEventListener('pointerup', endDrag);

  // touch fallback (should be handled by pointer events on modern browsers)
  top.addEventListener('touchstart', (e)=> e.preventDefault(), { passive:false });
}

function getPoint(e){
  if(e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if(e.clientX !== undefined) return { x: e.clientX, y: e.clientY };
  return { x:0, y:0 };
}

function startDrag(e){
  isDragging = true;
  activeCard = e.currentTarget || e.target.closest('.trip-card');
  if(!activeCard) return;
  const p = getPoint(e);
  startX = p.x; startY = p.y; currentX = startX; currentY = startY;
  activeCard.style.transition = 'transform 0s';
  showOverlay(null,false);
  // capture pointer (best-effort)
  if(e.pointerId) activeCard.setPointerCapture && activeCard.setPointerCapture(e.pointerId);
}

function onDrag(e){
  if(!isDragging || !activeCard) return;
  const p = getPoint(e);
  currentX = p.x; currentY = p.y;
  const dx = currentX - startX;
  const dy = currentY - startY;
  const rot = dx / 12;
  activeCard.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
  // overlay selection
  if(Math.abs(dx) > Math.abs(dy)){
    if(dx > 30) showOverlay('interested');
    else if(dx < -30) showOverlay('not');
    else showOverlay(null,false);
  } else {
    if(dy < -30) showOverlay('skip');
    else if(dy > 30) showOverlay('review');
    else showOverlay(null,false);
  }
}

function endDrag(e){
  if(!isDragging || !activeCard) return;
  isDragging = false;
  const dx = currentX - startX;
  const dy = currentY - startY;
  const absX = Math.abs(dx), absY = Math.abs(dy);

  if(absX > 120 && absX > absY){
    if(dx > 0) doChoice('interested');
    else doChoice('not_interested');
  } else if(absY > 120 && absY > absX){
    if(dy < 0) doChoice('skipped');
    else doChoice('review');
  } else {
    // reset
    activeCard.style.transition = 'transform 300ms ease';
    activeCard.style.transform = '';
    showOverlay(null,false);
  }

  // release pointer capture gracefully
  if(e && e.pointerId) {
    try { activeCard.releasePointerCapture && activeCard.releasePointerCapture(e.pointerId); } catch(_) {}
  }
}

function doChoice(choice){
  if(!activeCard) return;
  const spotId = activeCard.dataset.id;
  let tx=0, ty=0, rot=0;
  if(choice==='interested'){ tx = 520; rot=20; showOverlay('interested', true); }
  if(choice==='not_interested'){ tx = -520; rot=-20; showOverlay('not', true); }
  if(choice==='skipped'){ ty = -520; rot=0; showOverlay('skip', true); }
  if(choice==='review'){ ty = 520; rot=0; showOverlay('review', true); }

  activeCard.style.transition = 'transform 420ms cubic-bezier(.2,.9,.2,1), opacity 350ms';
  activeCard.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
  activeCard.style.opacity = '0';

  const payload = {
    userId: uid || 'anon',
    spotId: spotId,
    choice: choice,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  db.collection('userChoices').add(payload).catch(err => console.error('save choice', err));

  setTimeout(() => {
    // remove top element from spots (it is last in DOM)
    spots.pop();
    if(activeCard && activeCard.parentNode) activeCard.parentNode.removeChild(activeCard);
    activeCard = null;
    showOverlay(null,false);

    if(spots.length > 0){
      attachTopCardHandlers();
      // refresh transforms for remaining cards
      const cards = document.querySelectorAll('.trip-card');
      cards.forEach((c, idx) => {
        const offset = spots.length - idx - 1;
        c.style.zIndex = 100 + offset;
        c.style.transform = `scale(${1 - offset*0.02}) translateY(${offset*6}px)`;
      });
    } else {
      emptyState.style.display = 'block';
    }
  }, 420);
}

function showOverlay(kind, keepVisible = true){
  if(!kind){
    overlay.classList.add('hidden');
    overlayIcon.className = 'overlay-icon';
    return;
  }
  overlay.classList.remove('hidden');
  overlayIcon.className = 'overlay-icon show';
  switch(kind){
    case 'interested': overlayIcon.textContent = '❤️'; break;
    case 'not': overlayIcon.textContent = '💔'; break;
    case 'skip': overlayIcon.textContent = '⏩'; break;
    case 'review': overlayIcon.textContent = '🔄'; break;
    default: overlayIcon.textContent = ''; break;
  }
}

// side buttons
btnInterested && btnInterested.addEventListener('click', ()=> openList('interested'));
btnNot && btnNot.addEventListener('click', ()=> openList('not_interested'));
btnSkip && btnSkip.addEventListener('click', ()=> openList('skipped'));
btnReview && btnReview.addEventListener('click', ()=> openList('review'));
btnLogout && btnLogout.addEventListener('click', ()=> auth.signOut().then(()=> window.location.href='login.html').catch(()=> window.location.href='login.html'));

// modal list loader
function openList(choice){
  modal.classList.remove('hidden');
  modalTitle.textContent = choice === 'interested' ? 'Interested Spots' : choice === 'not_interested' ? 'Not Interested' : choice === 'skipped' ? 'Skipped' : 'Review';
  modalBody.innerHTML = '<p>Loading…</p>';

  db.collection('userChoices')
    .where('userId','==', uid || 'anon')
    .where('choice','==', choice)
    .orderBy('timestamp','desc')
    .get()
    .then(snap => {
      if(snap.empty){ modalBody.innerHTML = '<p>No items found.</p>'; return; }
      const promises = [];
      snap.forEach(doc => {
        const d = doc.data();
        if(d && d.spotId) promises.push(db.collection('spots').doc(d.spotId).get().then(s => s.exists ? ({ id: s.id, ...s.data() }) : null));
      });
      Promise.all(promises).then(results => {
        const filtered = results.filter(r => r !== null);
        if(filtered.length === 0){ modalBody.innerHTML = '<p>No spot details available.</p>'; return; }
        modalBody.innerHTML = '';
        const grid = document.createElement('div'); grid.className = 'list-grid';
        filtered.forEach(r => {
          const el = document.createElement('div'); el.className = 'list-card';
          el.dataset.spotId = r.id;
          el.innerHTML = `<div class="avatar">${escapeHtml((r.title||r.name||'S').charAt(0))}</div>
                          <div style="flex:1">
                            <strong>${escapeHtml(r.title || r.name || 'Untitled')}</strong>
                            <div class="trip-sub">${escapeHtml(r.description || r.desc || '')}</div>
                            <div style="margin-top:8px;color:var(--muted);font-size:12px">Click to see who else liked this</div>
                          </div>`;
          grid.appendChild(el);
        });
        modalBody.appendChild(grid);
      });
    })
    .catch(err => { console.error('openList', err); modalBody.innerHTML = '<p>Error loading list.</p>'; });
}

// delegated click: show other users who liked the spot
modalBody.addEventListener('click', (e) => {
  const card = e.target.closest('.list-card');
  if(!card) return;
  const spotId = card.dataset.spotId;
  if(!spotId) return;

  modalBody.innerHTML = '<p>Loading users…</p>';
  db.collection('userChoices').where('spotId','==', spotId).where('choice','==','interested').get()
    .then(snap => {
      if(snap.empty){ modalBody.innerHTML = '<p>No other users found who liked this spot.</p>'; return; }
      const uids = new Set();
      snap.forEach(d => { const data = d.data(); if(data && data.userId) uids.add(data.userId); });
      const arr = Array.from(uids).slice(0, 30);
      if(arr.length === 0){ modalBody.innerHTML = '<p>No users found.</p>'; return; }
      const userPromises = arr.map(u => db.collection('users').doc(u).get().then(doc => ({ id:u, data: doc.exists ? doc.data() : null })));
      Promise.all(userPromises).then(users => {
        modalBody.innerHTML = '';
        const info = document.createElement('div');
        info.innerHTML = `<h3 style="margin-top:0">Users who liked this spot</h3>`;
        const list = document.createElement('div');
        list.style.display = 'grid';
        list.style.gridTemplateColumns = 'repeat(auto-fill,minmax(160px,1fr))';
        list.style.gap = '8px';
        users.forEach(u => {
          const c = document.createElement('div');
          c.style.background = 'rgba(255,255,255,0.03)'; c.style.padding = '8px'; c.style.borderRadius = '8px';
          const name = u.data && (u.data.displayName || u.data.name) ? escapeHtml(u.data.displayName || u.data.name) : escapeHtml(u.id);
          const city = u.data && u.data.city ? escapeHtml(u.data.city) : '';
          c.innerHTML = `<div style="font-weight:700">${name}</div><div style="font-size:12px;color:var(--muted)">${city}</div>`;
          list.appendChild(c);
        });
        modalBody.appendChild(info);
        modalBody.appendChild(list);
      });
    })
    .catch(err => { console.error('who liked', err); modalBody.innerHTML = '<p>Error fetching users.</p>'; });
});

// initial load
loadSpots();

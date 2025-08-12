// script.js — Swipe logic (mouse + touch), overlays, Firestore writes, list modal.
// Requires: firebase.js (auth and db defined), included before this file.

// DOM elements
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

// app state
let spots = [];
let uid = 'anon';
let activeCard = null;
let isDragging = false;
let startX = 0, startY = 0, currentX = 0, currentY = 0;

// basic escape
function escapeHtml(s){
  if(!s) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// Auth UI
topLogin && (topLogin.onclick = () => window.location.href = 'login.html');
topSignup && (topSignup.onclick = () => window.location.href = 'signup.html');

auth.onAuthStateChanged(user => {
  if(user){ uid = user.uid; }
  else { uid = 'anon'; }
  loadSpots();
});

// load spots from Firestore
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

// render stack
function renderStack(){
  cardStack.innerHTML = '';
  if(!spots || spots.length === 0){
    emptyState.style.display = 'block';
    return;
  } else emptyState.style.display = 'none';

  for(let i=0;i<spots.length;i++){
    const spot = spots[i];
    const card = document.createElement('div');
    card.className = 'trip-card';
    card.dataset.id = spot.id;
    card.dataset.index = i;
    card.innerHTML = `
      <div class="trip-image" style="background-image:url('${escapeHtml(spot.imageUrl || '')}')"></div>
      <div class="trip-content">
        <div class="trip-title">${escapeHtml(spot.title || 'Untitled')}</div>
        <div class="trip-sub">${escapeHtml(spot.description || '')}</div>
      </div>
    `;
    const offset = spots.length - i - 1;
    card.style.zIndex = 100 + offset;
    card.style.transform = `scale(${1 - offset*0.02}) translateY(${offset*6}px)`;
    cardStack.appendChild(card);
  }
  attachTopCardHandlers();
}

function attachTopCardHandlers(){
  const top = cardStack.querySelector('.trip-card:last-child');
  if(!top) return;
  // pointer events
  top.onpointerdown = startDrag;
  window.onpointermove = onDrag;
  window.onpointerup = endDrag;
  // touch fallback
  top.ontouchstart = (e) => e.preventDefault();
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
}

function onDrag(e){
  if(!isDragging || !activeCard) return;
  const p = getPoint(e);
  currentX = p.x; currentY = p.y;
  const dx = currentX - startX;
  const dy = currentY - startY;
  const rot = dx / 12;
  activeCard.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
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

function endDrag(){
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
    activeCard.style.transition = 'transform 300ms ease';
    activeCard.style.transform = '';
    showOverlay(null,false);
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
    spots.pop();
    if(activeCard && activeCard.parentNode) activeCard.parentNode.removeChild(activeCard);
    activeCard = null;
    showOverlay(null,false);
    if(spots.length > 0){
      attachTopCardHandlers();
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

// Side buttons
btnInterested && btnInterested.addEventListener('click', ()=> openList('interested'));
btnNot && btnNot.addEventListener('click', ()=> openList('not_interested'));
btnSkip && btnSkip.addEventListener('click', ()=> openList('skipped'));
btnReview && btnReview.addEventListener('click', ()=> openList('review'));
btnLogout && btnLogout.addEventListener('click', ()=> auth.signOut().then(()=> window.location.href='login.html'));

// Modal: load user's choices
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
      snap.forEach(doc => { const d = doc.data(); promises.push(db.collection('spots').doc(d.spotId).get().then(s=>({ id: s.id, ...s.data() })))});
      Promise.all(promises).then(results => {
        modalBody.innerHTML = '';
        const grid = document.createElement('div'); grid.className = 'list-grid';
        results.forEach(r => {
          const el = document.createElement('div'); el.className = 'list-card';
          el.dataset.spotId = r.id;
          el.innerHTML = `<div class="avatar">${escapeHtml((r.title||'S').charAt(0))}</div>
                          <div style="flex:1">
                            <strong>${escapeHtml(r.title||'Untitled')}</strong>
                            <div class="trip-sub">${escapeHtml(r.description||'')}</div>
                            <div style="margin-top:8px;color:var(--muted);font-size:12px">Click to see who else liked this</div>
                          </div>`;
          grid.appendChild(el);
        });
        modalBody.appendChild(grid);
      });
    })
    .catch(err => { console.error('openList', err); modalBody.innerHTML = '<p>Error loading list.</p>'; });
}

// Delegated click inside modal to fetch other users who liked the same spot
modalBody.addEventListener('click', (e) => {
  const card = e.target.closest('.list-card');
  if(!card) return;
  const spotId = card.dataset.spotId;
  if(!spotId) return;

  db.collection('userChoices').where('spotId','==', spotId).where('choice','==','interested').get()
    .then(snap => {
      if(snap.empty){ alert('No other users found who liked this spot.'); return; }
      const uids = new Set();
      snap.forEach(d => uids.add(d.data().userId));
      const arr = Array.from(uids).slice(0, 20);
      if(arr.length === 0){ alert('No users found.'); return; }
      const userPromises = arr.map(u => db.collection('users').doc(u).get().then(doc => ({ id: u, data: doc.exists ? doc.data() : null })));
      Promise.all(userPromises).then(users => {
        modalBody.innerHTML = '';
        const info = document.createElement('div');
        info.innerHTML = `<h3 style="margin-top:0">Users who liked this spot</h3>`;
        const list = document.createElement('div');
        list.style.display = 'grid';
        list.style.gridTemplateColumns = 'repeat(auto-fill,minmax(160px,1fr))';
        list.style.gap = '8px';
        users.forEach(u => {
          const card = document.createElement('div');
          card.style.background = 'rgba(255,255,255,0.03)';
          card.style.padding = '8px';
          card.style.borderRadius = '8px';
          card.innerHTML = `<div style="font-weight:700">${u.data && (u.data.displayName || u.data.name) ? escapeHtml(u.data.displayName || u.data.name) : escapeHtml(u.id)}</div>
                            <div style="font-size:12px;color:var(--muted)">${u.data && u.data.city ? escapeHtml(u.data.city) : ''}</div>`;
          list.appendChild(card);
        });
        modalBody.appendChild(info);
        modalBody.appendChild(list);
      });
    })
    .catch(err => { console.error('who liked', err); alert('Error fetching users.'); });
});

// ensure initial load
loadSpots();

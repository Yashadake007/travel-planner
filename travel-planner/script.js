// script.js — unified, production-ready swipe + lists + auth UI

// DOM
const stackEl = document.getElementById('card-stack');
const emptyEl = document.getElementById('empty-state');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');

const modal = document.getElementById('list-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

const btnOpenInterested = document.getElementById('btn-open-interested');
const btnOpenNot = document.getElementById('btn-open-not');
const btnOpenSkipped = document.getElementById('btn-open-skipped');
const btnReview = document.getElementById('btn-review');

// State
let user = null;
let spots = [];
let idx = 0;                  // index of current card
let historyIdx = [];          // to support "review" (rewind)
let gestureHandlersBound = false;

// Helpers
const esc = (s='') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// Auth UI
auth.onAuthStateChanged(async u => {
  user = u || null;
  loginBtn.style.display = user ? 'none':'';
  signupBtn.style.display = user ? 'none':'';
  logoutBtn.style.display = user ? '' : 'none';
  await loadSpots();
  render();
});

loginBtn.onclick = () => location.href = 'login.html';
signupBtn.onclick = () => location.href = 'signup.html';
logoutBtn.onclick = () => auth.signOut().then(()=>location.href='index.html');

// Load spots from Firestore
async function loadSpots(){
  try{
    const snap = await db.collection('spots').orderBy('createdAt','desc').get();
    spots = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    idx = 0;
    historyIdx = [];
  }catch(e){
    console.error('loadSpots error', e);
    spots = [];
  }
}

// Render current card
function render(){
  stackEl.innerHTML = '';

  if (!spots.length || idx >= spots.length){
    emptyEl.style.display = 'block';
    return;
  } else {
    emptyEl.style.display = 'none';
  }

  const s = spots[idx];
  const card = document.createElement('div');
  card.className = 'trip-card';
  card.id = 'active-card';

  const imgSrc = s.imageURL || s.image || '';
  card.innerHTML = `
    <div class="overlay like">❤️</div>
    <div class="overlay dislike">💔</div>
    <div class="overlay skip">⏩</div>
    <div class="overlay review">🔄</div>

    <img src="${esc(imgSrc)}" alt="${esc(s.name || 'Spot')}">
    <div class="content">
      <h3>${esc(s.name || 'Untitled spot')}</h3>
      <p><b>Cost:</b> ₹${esc(s.cost ?? '-')}</p>
      <p><b>People:</b> ${esc(s.people ?? '-')}</p>
      <p><b>Points:</b> ${esc(s.points || '-')}</p>
      <p><b>Dates:</b> ${esc(s.startDate || '-')} → ${esc(s.endDate || '-')}</p>
      <p><b>Transport:</b> ${esc(s.transport || '-')}</p>
    </div>
  `;

  stackEl.appendChild(card);
  attachSwipe(card);
}

// Pointer-gesture swipe (desktop + mobile)
function attachSwipe(card){
  let sx=0, sy=0, dragging=false;

  const ov = {
    like: card.querySelector('.overlay.like'),
    dislike: card.querySelector('.overlay.dislike'),
    skip: card.querySelector('.overlay.skip'),
    review: card.querySelector('.overlay.review'),
  };

  const show = (el, on)=> el && (el.style.opacity = on ? '1':'0');

  const start = (e)=>{
    dragging = true;
    sx = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    sy = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
    card.classList.remove('snap-back');
  };
  const move = (e)=>{
    if(!dragging) return;
    const x = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    const y = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
    const dx = x - sx, dy = y - sy;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx/12}deg)`;
    show(ov.like, dx>50);
    show(ov.dislike, dx<-50);
    show(ov.skip, dy<-50);
    show(ov.review, dy>50);
  };
  const end = (e)=>{
    if(!dragging) return;
    dragging = false;
    const ex = e.clientX ?? (e.changedTouches ? e.changedTouches[0].clientX : sx);
    const ey = e.clientY ?? (e.changedTouches ? e.changedTouches[0].clientY : sy);
    const dx = ex - sx, dy = ey - sy;

    if (dx > 110) return doAction('interested', card);
    if (dx < -110) return doAction('not_interested', card);
    if (dy < -110) return doAction('skipped', card);
    if (dy > 110) return doAction('review', card);

    // snap back
    card.classList.add('snap-back');
    card.style.transform = '';
    show(ov.like,false); show(ov.dislike,false); show(ov.skip,false); show(ov.review,false);
  };

  // Pointer events cover mouse+touch on modern browsers
  card.addEventListener('pointerdown', start);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
}

// Save choice + animate out
async function doAction(kind, card){
  const s = spots[idx];

  // Animate exit
  if (kind==='interested') card.classList.add('exit-right');
  if (kind==='not_interested') card.classList.add('exit-left');
  if (kind==='skipped') card.classList.add('exit-up');
  if (kind==='review') card.classList.add('exit-down');

  // Hide overlays immediately
  card.querySelectorAll('.overlay').forEach(o => o.style.opacity='0');

  // Persist (except review)
  if (kind !== 'review' && user){
    const payload = {
      userId: user.uid,
      spotId: s.id,
      choice: kind,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };
    try { await db.collection('userChoices').add(payload); }
    catch(e){ console.error('save choice failed', e); /* continue UI anyway */ }
  }

  // Move index (review = rewind one previous)
  const after = ()=>{
    if (kind === 'review'){
      if (historyIdx.length > 0) idx = Math.max(0, historyIdx.pop());
      else idx = Math.max(0, idx-1);
    } else {
      historyIdx.push(idx);
      idx = Math.min(spots.length, idx+1);
    }
    render();
  };

  // Prefer transitionend; fallback to timeout
  let done=false;
  card.addEventListener('transitionend', ()=>{ if(!done){ done=true; after(); } }, { once:true });
  setTimeout(()=>{ if(!done){ done=true; after(); } }, 300);
}

/* ---------- Lists Modal ---------- */
// Open lists (interested / not_interested / skipped) of the *current user*
btnOpenInterested.onclick = () => openList('interested');
btnOpenNot.onclick = () => openList('not_interested');
btnOpenSkipped.onclick = () => openList('skipped');
btnReview.onclick = () => {
  // Rewind button (down swipe behavior)
  const active = document.getElementById('active-card');
  if (active) doAction('review', active);
};
modalClose.onclick = () => modal.classList.add('hidden');

async function openList(choice){
  if (!user){ alert('Please login first.'); return; }
  modal.classList.remove('hidden');
  modalTitle.textContent =
    choice==='interested' ? 'My Interested Spots':
    choice==='not_interested' ? 'My Not Interested Spots' : 'My Skipped Spots';
  modalBody.innerHTML = '<p>Loading…</p>';

  try{
    const snap = await db.collection('userChoices')
      .where('userId','==', user.uid)
      .where('choice','==', choice)
      .orderBy('timestamp','desc')
      .get();

    if (snap.empty){ modalBody.innerHTML = '<p class="muted">Nothing here yet.</p>'; return; }

    // Fetch spot docs
    const gets = [];
    snap.forEach(d => { const x = d.data(); if (x.spotId) gets.push(db.collection('spots').doc(x.spotId).get()); });
    const results = await Promise.all(gets);

    const items = results
      .filter(doc => doc && doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    if (!items.length){ modalBody.innerHTML = '<p class="muted">No spot details found.</p>'; return; }

    const wrap = document.createElement('div');
    wrap.className = 'list-grid';
    items.forEach(s => {
      const div = document.createElement('div');
      div.className = 'list-item';
      const img = esc(s.imageURL || s.image || '');
      div.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center">
          <img src="${img}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:8px; background:#0b1220" onerror="this.style.display='none'">
          <div>
            <div><strong>${esc(s.name||'Untitled')}</strong></div>
            <div style="font-size:12px;color:#9aa4b2">${esc(s.points||'')}</div>
          </div>
        </div>`;
      wrap.appendChild(div);
    });
    modalBody.innerHTML = '';
    modalBody.appendChild(wrap);
  }catch(e){
    console.error('openList', e);
    modalBody.innerHTML = '<p class="muted">Error loading list.</p>';
  }
}

// Keyboard shortcuts (optional, desktop)
window.addEventListener('keydown', (e)=>{
  const card = document.getElementById('active-card');
  if (!card) return;
  if (e.key === 'ArrowRight') doAction('interested', card);
  if (e.key === 'ArrowLeft')  doAction('not_interested', card);
  if (e.key === 'ArrowUp')    doAction('skipped', card);
  if (e.key === 'ArrowDown')  doAction('review', card);
});

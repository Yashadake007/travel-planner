// Unified swipe deck + lists + people modal + auth toggle

// DOM
const stackEl = document.getElementById('card-stack');
const emptyEl = document.getElementById('empty-state');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');

const listModal = document.getElementById('list-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

const peopleModal = document.getElementById('people-modal');
const peopleTitle = document.getElementById('people-title');
const peopleBody = document.getElementById('people-body');
const peopleClose = document.getElementById('people-close');

const btnOpenInterested = document.getElementById('btn-open-interested');
const btnOpenNot = document.getElementById('btn-open-not');
const btnOpenSkipped = document.getElementById('btn-open-skipped');
const btnReview = document.getElementById('btn-review');

// State
let user = null;
let spots = [];
let idx = 0;
let historyIdx = [];

// Utils
const esc = (s='') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// Auth UI + initial load
auth.onAuthStateChanged(async u => {
  user = u || null;
  // Toggle buttons
  loginBtn.style.display = user ? 'none':'';
  signupBtn.style.display = user ? 'none':'';
  logoutBtn.style.display = user ? '' : 'none';

  await loadSpots();
  render();
});

loginBtn && (loginBtn.onclick = () => location.href = 'login.html');
signupBtn && (signupBtn.onclick = () => location.href = 'signup.html');
logoutBtn && (logoutBtn.onclick = () => auth.signOut().then(()=>location.href='index.html'));

// Load spots (prefer createdAt; fallback to name)
async function loadSpots(){
  spots = [];
  idx = 0;
  historyIdx = [];
  try{
    let q;
    try{
      // quick probe to see if createdAt is valid
      await db.collection('spots').orderBy('createdAt','desc').limit(1).get();
      q = db.collection('spots').orderBy('createdAt','desc');
    }catch{
      q = db.collection('spots').orderBy('name');
    }
    const snap = await q.get();
    spots = snap.docs.map(d => ({ id:d.id, ...d.data() }));
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
  }
  emptyEl.style.display = 'none';

  const s = spots[idx] || {};
  const imgSrc = s.imageURL || s.image || '';

  const card = document.createElement('div');
  card.className = 'trip-card';
  card.id = 'active-card';
  card.innerHTML = `
    <div class="overlay like">❤️</div>
    <div class="overlay dislike">💔</div>
    <div class="overlay skip">⏩</div>
    <div class="overlay review">🔄</div>

    <img src="${esc(imgSrc)}" alt="${esc(s.name || 'Spot')}" onerror="this.style.display='none'">
    <div class="content">
      <h3>${esc(s.name || 'Untitled spot')}</h3>
      <p><b>Cost:</b> ₹${esc(s.cost ?? '-')}</p>
      <p><b>People:</b> ${esc(s.people ?? '-')}</p>
      <p><b>Points:</b> ${esc(s.points || '-')}</p>
      <p><b>Dates:</b> ${esc(s.startDate || '-')} → ${esc(s.endDate || '-')}</p>
      <p><b>Transport:</b> ${esc(s.transport || '-')}</p>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="ghost-btn" id="btn-people-interested">View people ❤️</button>
        <button class="ghost-btn" id="btn-people-not">People 💔</button>
        <button class="ghost-btn" id="btn-people-skipped">People ⏩</button>
      </div>
    </div>
  `;
  stackEl.appendChild(card);
  attachSwipe(card);

  // People buttons
  document.getElementById('btn-people-interested')?.addEventListener('click', ()=> openPeopleForSpot('interested'));
  document.getElementById('btn-people-not')?.addEventListener('click', ()=> openPeopleForSpot('not_interested'));
  document.getElementById('btn-people-skipped')?.addEventListener('click', ()=> openPeopleForSpot('skipped'));
}

// Pointer-based swipe
function attachSwipe(card){
  let sx=0, sy=0, dragging=false;

  const ov = {
    like: card.querySelector('.overlay.like'),
    dislike: card.querySelector('.overlay.dislike'),
    skip: card.querySelector('.overlay.skip'),
    review: card.querySelector('.overlay.review'),
  };
  const show = (el, on)=> el && (el.style.opacity = on ? '1':'0');

  const getXY = e => ({
    x: e.clientX ?? (e.touches ? e.touches[0].clientX : sx),
    y: e.clientY ?? (e.touches ? e.touches[0].clientY : sy),
  });

  const start = e => { const p=getXY(e); dragging=true; sx=p.x; sy=p.y; card.classList.remove('snap-back'); };
  const move  = e => {
    if(!dragging) return;
    const p = getXY(e);
    const dx = p.x - sx, dy = p.y - sy;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx/12}deg)`;
    show(ov.like, dx>50);
    show(ov.dislike, dx<-50);
    show(ov.skip, dy<-50);
    show(ov.review, dy>50);
  };
  const end = e => {
    if(!dragging) return;
    dragging=false;
    const p = getXY(e);
    const dx = p.x - sx, dy = p.y - sy;

    if (dx > 110) return doAction('interested', card);
    if (dx < -110) return doAction('not_interested', card);
    if (dy < -110) return doAction('skipped', card);
    if (dy > 110) return doAction('review', card);

    card.classList.add('snap-back');
    card.style.transform = '';
    Object.values(ov).forEach(o=>o && (o.style.opacity='0'));
  };

  card.addEventListener('pointerdown', start, {passive:true});
  window.addEventListener('pointermove', move, {passive:true});
  window.addEventListener('pointerup', end, {passive:true});
}

// Save + animate + paginate
async function doAction(kind, card){
  const s = spots[idx];

  // Exit animation
  if (kind==='interested') card.classList.add('exit-right');
  if (kind==='not_interested') card.classList.add('exit-left');
  if (kind==='skipped') card.classList.add('exit-up');
  if (kind==='review') card.classList.add('exit-down');

  // Persist choice except review
  if (kind !== 'review' && user && s && s.id){
    const payload = {
      userId: user.uid,
      spotId: s.id,
      choice: kind,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };
    try { await db.collection('userChoices').add(payload); }
    catch(e){ console.error('save choice failed', e); }
  }

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

  let done=false;
  card.addEventListener('transitionend', ()=>{ if(!done){ done=true; after(); } }, { once:true });
  setTimeout(()=>{ if(!done){ done=true; after(); } }, 320);
}

/* ---------- Lists (current user) ---------- */
document.getElementById('modal-close')?.addEventListener('click', ()=> listModal.classList.add('hidden'));

document.getElementById('btn-open-interested')?.addEventListener('click', ()=> openList('interested'));
document.getElementById('btn-open-not')?.addEventListener('click', ()=> openList('not_interested'));
document.getElementById('btn-open-skipped')?.addEventListener('click', ()=> openList('skipped'));
document.getElementById('btn-review')?.addEventListener('click', ()=> {
  const c=document.getElementById('active-card'); if(c) doAction('review', c);
});

async function openList(choice){
  if (!user){ alert('Please login first.'); return; }
  listModal.classList.remove('hidden');
  modalTitle.textContent =
    choice==='interested' ? 'My Interested Spots' :
    choice==='not_interested' ? 'My Not Interested Spots' :
    'My Skipped Spots';
  modalBody.innerHTML = '<p>Loading…</p>';

  try{
    const snap = await db.collection('userChoices')
      .where('userId','==', user.uid)
      .where('choice','==', choice)
      .orderBy('timestamp','desc')
      .get();

    if (snap.empty){ modalBody.innerHTML = '<p class="muted">Nothing here yet.</p>'; return; }

    // Fetch spot docs referenced in choices
    const docGets = [];
    snap.forEach(d => { const x=d.data(); if (x.spotId) docGets.push(db.collection('spots').doc(x.spotId).get()); });
    const results = await Promise.all(docGets);

    const items = results.filter(g=>g && g.exists).map(g=>({ id:g.id, ...g.data() }));

    if (!items.length){ modalBody.innerHTML = '<p class="muted">No spot details found.</p>'; return; }

    const wrap = document.createElement('div');
    wrap.className = 'list-grid';
    items.forEach(s => {
      const div = document.createElement('div');
      div.className = 'list-item';
      const img = esc(s.imageURL || s.image || '');
      div.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center">
          <img src="${img}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:8px;background:#0b1220" onerror="this.style.display='none'">
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
    console.error('openList error', e);
    modalBody.innerHTML = '<p class="muted">Error loading list.</p>';
  }
}

/* ---------- People interested in current spot ---------- */
peopleClose?.addEventListener('click', ()=> peopleModal.classList.add('hidden'));

async function openPeopleForSpot(choiceKind){
  if (idx>=spots.length) return;
  const s = spots[idx];
  if (!s || !s.id){ alert('No spot selected.'); return; }

  peopleModal.classList.remove('hidden');
  peopleTitle.textContent =
    choiceKind==='interested' ? `People Interested in ${s.name||''}` :
    choiceKind==='not_interested' ? `People Not Interested in ${s.name||''}` :
    `People who Skipped ${s.name||''}`;
  peopleBody.innerHTML = '<p>Loading…</p>';

  try{
    // Query userChoices for this spot+choice
    const snap = await db.collection('userChoices')
      .where('spotId','==', s.id)
      .where('choice','==', choiceKind)
      .orderBy('timestamp','desc')
      .get();

    if (snap.empty){ peopleBody.innerHTML = '<p class="muted">No entries yet.</p>'; return; }

    const list = document.createElement('div');
    list.className = 'list-grid';
    let i = 0;
    snap.forEach(doc=>{
      const x = doc.data();
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div><strong>#${++i}</strong></div>
        <div style="font-size:13px;color:#9aa4b2">UID: ${esc(x.userId||'-')}</div>
        <div style="font-size:12px;color:#9aa4b2">${x.timestamp ? '' : ''}</div>
      `;
      list.appendChild(item);
    });
    peopleBody.innerHTML = '';
    peopleBody.appendChild(list);
  }catch(e){
    console.error('openPeopleForSpot error', e);
    peopleBody.innerHTML = '<p class="muted">Error loading.</p>';
  }
}

// Keyboard shortcuts (desktop)
window.addEventListener('keydown', (e)=>{
  const card = document.getElementById('active-card');
  if (!card) return;
  if (e.key === 'ArrowRight') doAction('interested', card);
  if (e.key === 'ArrowLeft')  doAction('not_interested', card);
  if (e.key === 'ArrowUp')    doAction('skipped', card);
  if (e.key === 'ArrowDown')  doAction('review', card);
});

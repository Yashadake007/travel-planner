import {
  auth, db, provider,
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  query, where, orderBy, serverTimestamp, onSnapshot,
  onAuthStateChanged, signInWithPopup, signOut
} from "./firebase.js";

/* ---------------- DOM ---------------- */
const stackEl = document.getElementById("card-stack");
const emptyEl = document.getElementById("empty-state");

const btnLogin  = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const btnAdmin  = document.getElementById("btn-admin");

const btnLike   = document.getElementById("btn-like");
const btnNope   = document.getElementById("btn-nope");
const btnSkip   = document.getElementById("btn-skip");
const btnReview = document.getElementById("btn-review");

const openInterested = document.getElementById("open-interested");
const openNot        = document.getElementById("open-not");
const openSkipped    = document.getElementById("open-skipped");

const listBack  = document.getElementById("list-backdrop");
const listTitle = document.getElementById("list-title");
const listBody  = document.getElementById("list-body");
document.getElementById("list-close").onclick = ()=> listBack.style.display="none";

const peopleBack  = document.getElementById("people-backdrop");
const peopleTitle = document.getElementById("people-title");
const peopleBody  = document.getElementById("people-body");
document.getElementById("people-close").onclick = ()=> peopleBack.style.display="none";

/* ---------------- State ---------------- */
let user = null;
let spots = [];
let idx = 0;
let historyIdx = [];

/* ---------------- Helpers ---------------- */
const esc = (s='') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

/* ---------------- Auth ---------------- */
btnLogin.onclick  = async ()=> { await signInWithPopup(auth, provider); };
btnLogout.onclick = async ()=> { await signOut(auth); };
btnAdmin.onclick  = ()=> alert("Admin screen is not included here. Use Create to add spots.");

onAuthStateChanged(auth, async (u)=>{
  user = u || null;
  btnLogin.style.display  = user ? "none" : "";
  btnLogout.style.display = user ? ""     : "none";
  await loadSpots();
  render();
});

/* ---------------- Data ---------------- */
async function loadSpots(){
  spots = []; idx=0; historyIdx=[];
  // Prefer createdAt desc; fallback to name
  try{
    const q = query(collection(db,"spots"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    if (!snap.empty){
      spots = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      return;
    }
  }catch(_){}
  try{
    const q = query(collection(db,"spots"), orderBy("name"));
    const snap = await getDocs(q);
    spots = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }catch(e){
    console.error("loadSpots error", e);
  }
}

/* ---------------- UI: Card render + swipe ---------------- */
function render(){
  stackEl.innerHTML = "";
  if (!spots.length || idx >= spots.length){
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  const s = spots[idx];
  const img = s.imageURL || s.image || "";

  const card = document.createElement("div");
  card.className = "trip-card";
  card.id = "active-card";
  card.innerHTML = `
    <div class="overlay like">❤️</div>
    <div class="overlay dislike">💔</div>
    <div class="overlay skip">⏩</div>
    <div class="overlay review">🔄</div>

    <img src="${esc(img)}" alt="${esc(s.name||'Spot')}" onerror="this.style.display='none'">
    <div class="content">
      <h3>${esc(s.name||"Untitled spot")}</h3>
      <p><b>Cost:</b> ₹${esc(s.cost ?? "-")}</p>
      <p><b>People:</b> ${esc(s.people ?? "-")}</p>
      <p><b>Points:</b> ${esc(s.points || "-")}</p>
      <p><b>Dates:</b> ${esc(s.startDate || "-")} → ${esc(s.endDate || "-")}</p>
      <p><b>Transport:</b> ${esc(s.transport || "-")}</p>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="pill" id="btn-spot-people-int">People ❤️</button>
        <button class="pill" id="btn-spot-people-no">People 💔</button>
        <button class="pill" id="btn-spot-people-skip">People ⏩</button>
      </div>
    </div>
  `;
  stackEl.appendChild(card);
  attachSwipe(card);

  document.getElementById("btn-spot-people-int").onclick = ()=> openPeopleForSpot("interested");
  document.getElementById("btn-spot-people-no").onclick  = ()=> openPeopleForSpot("not_interested");
  document.getElementById("btn-spot-people-skip").onclick= ()=> openPeopleForSpot("skipped");
}

function attachSwipe(card){
  let sx=0, sy=0, dragging=false;
  const oLike   = card.querySelector(".overlay.like");
  const oNope   = card.querySelector(".overlay.dislike");
  const oSkip   = card.querySelector(".overlay.skip");
  const oReview = card.querySelector(".overlay.review");

  const start = e => { dragging=true; sx=e.clientX??e.touches[0].clientX; sy=e.clientY??e.touches[0].clientY; card.classList.remove("snap-back"); };
  const move  = e => {
    if(!dragging) return;
    const x=e.clientX??e.touches[0].clientX, y=e.clientY??e.touches[0].clientY;
    const dx=x-sx, dy=y-sy;
    card.style.transform = `translate(${dx}px,${dy}px) rotate(${dx/12}deg)`;
    oLike.style.opacity   = dx>50 ? "1":"0";
    oNope.style.opacity   = dx<-50? "1":"0";
    oSkip.style.opacity   = dy<-50? "1":"0";
    oReview.style.opacity = dy>50 ? "1":"0";
  };
  const end   = e => {
    if(!dragging) return; dragging=false;
    const x=e.clientX??e.changedTouches[0].clientX, y=e.clientY??e.changedTouches[0].clientY;
    const dx=x-sx, dy=y-sy;
    if (dx>110)  return doAction("interested", card);
    if (dx<-110) return doAction("not_interested", card);
    if (dy<-110) return doAction("skipped", card);
    if (dy>110)  return doAction("review", card);

    card.classList.add("snap-back");
    card.style.transform = "";
    oLike.style.opacity=oNope.style.opacity=oSkip.style.opacity=oReview.style.opacity="0";
  };

  card.addEventListener("pointerdown", start, {passive:true});
  window.addEventListener("pointermove",  move,  {passive:true});
  window.addEventListener("pointerup",    end,   {passive:true});
}

async function doAction(kind, card){
  const s = spots[idx];
  if (kind==="interested") card.classList.add("exit-right");
  if (kind==="not_interested") card.classList.add("exit-left");
  if (kind==="skipped") card.classList.add("exit-up");
  if (kind==="review") card.classList.add("exit-down");

  // Persist choice (userChoices)
  if (kind!=="review" && user && s?.id){
    try{
      await addDoc(collection(db,"userChoices"), {
        userId: user.uid,
        spotId: s.id,
        choice: kind,
        timestamp: serverTimestamp()
      });
    }catch(e){ console.error("save choice failed", e); }
  }

  const after=()=>{
    if (kind==="review"){
      if (historyIdx.length>0) idx = Math.max(0, historyIdx.pop());
      else idx = Math.max(0, idx-1);
    } else {
      historyIdx.push(idx);
      idx = Math.min(spots.length, idx+1);
    }
    render();
  };
  let done=false;
  card.addEventListener("transitionend", ()=>{ if(!done){done=true;after();} }, {once:true});
  setTimeout(()=>{ if(!done){done=true;after();} }, 280);
}

/* --------------- Lists (live) --------------- */
openInterested.onclick = ()=> openList("interested");
openNot.onclick        = ()=> openList("not_interested");
openSkipped.onclick    = ()=> openList("skipped");

function openList(choice){
  if (!user){ alert("Please login first."); return; }
  listBack.style.display="flex";
  listTitle.textContent =
    choice==="interested" ? "My Interested Spots" :
    choice==="not_interested" ? "My Not Interested Spots" :
    "My Skipped Spots";
  listBody.textContent="Loading…";

  const qChoices = query(
    collection(db,"userChoices"),
    where("userId","==", user.uid),
    where("choice","==", choice),
    orderBy("timestamp","desc")
  );

  onSnapshot(qChoices, async snap=>{
    if (snap.empty){ listBody.innerHTML = `<p class="muted">Nothing here yet.</p>`; return; }

    const gets = [];
    snap.forEach(d=> { const x=d.data(); if (x.spotId) gets.push(getDoc(doc(db,"spots",x.spotId))); });
    const results = await Promise.all(gets);
    const items = results.filter(r=>r.exists()).map(r=>({ id:r.id, ...r.data() }));

    const wrap = document.createElement("div");
    wrap.className="list-grid";
    items.forEach(s=>{
      const div=document.createElement("div");
      div.className="list-item";
      const img = esc(s.imageURL||s.image||"");
      div.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center">
          <img src="${img}" alt="" style="width:68px;height:52px;object-fit:cover;border-radius:8px;background:#0b1220" onerror="this.style.display='none'">
          <div>
            <div><strong>${esc(s.name||"Untitled")}</strong></div>
            <div class="muted" style="font-size:12px">${esc(s.points||"")}</div>
          </div>
        </div>`;
      wrap.appendChild(div);
    });
    listBody.innerHTML=""; listBody.appendChild(wrap);
  }, err=>{
    console.error(err);
    listBody.innerHTML = `<p class="muted">Error loading list.</p>`;
  });
}

/* --------------- People for current spot --------------- */
function openPeopleForSpot(kind){
  if (idx>=spots.length) return;
  const s = spots[idx]; if (!s?.id) return;

  peopleBack.style.display="flex";
  peopleTitle.textContent =
    kind==="interested" ? `People Interested in ${s.name||""}` :
    kind==="not_interested" ? `People Not Interested in ${s.name||""}` :
    `People who Skipped ${s.name||""}`;
  peopleBody.textContent="Loading…";

  const qPeople = query(
    collection(db,"userChoices"),
    where("spotId","==", s.id),
    where("choice","==", kind),
    orderBy("timestamp","desc")
  );

  onSnapshot(qPeople, snap=>{
    if (snap.empty){ peopleBody.innerHTML = `<p class="muted">No entries yet.</p>`; return; }
    const list = document.createElement("div"); list.className="list-grid";
    let i=0;
    snap.forEach(doc=>{
      const x=doc.data();
      const row=document.createElement("div");
      row.className="list-item";
      row.innerHTML = `
        <div><strong>#${++i}</strong></div>
        <div class="muted" style="font-size:13px">UID: ${esc(x.userId||"-")}</div>`;
      list.appendChild(row);
    });
    peopleBody.innerHTML=""; peopleBody.appendChild(list);
  }, err=>{
    console.error(err);
    peopleBody.innerHTML = `<p class="muted">Error loading.</p>`;
  });
}

/* --------------- Buttons + keys --------------- */
btnLike.onclick   = ()=> { const c=document.getElementById("active-card"); if(c) doAction("interested", c); };
btnNope.onclick   = ()=> { const c=document.getElementById("active-card"); if(c) doAction("not_interested", c); };
btnSkip.onclick   = ()=> { const c=document.getElementById("active-card"); if(c) doAction("skipped", c); };
btnReview.onclick = ()=> { const c=document.getElementById("active-card"); if(c) doAction("review", c); };

window.addEventListener("keydown", (e)=>{
  const c=document.getElementById("active-card");
  if(!c) return;
  if (e.key==="ArrowRight") doAction("interested", c);
  if (e.key==="ArrowLeft")  doAction("not_interested", c);
  if (e.key==="ArrowUp")    doAction("skipped", c);
  if (e.key==="ArrowDown")  doAction("review", c);
});

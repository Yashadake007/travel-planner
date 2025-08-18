import {
  auth, db, provider,
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  query, where, orderBy, serverTimestamp, onSnapshot,
  onAuthStateChanged, signInWithPopup, signOut
} from "./firebase.js";

// DOM Elements
const stackEl = document.getElementById("card-stack");
const emptyEl = document.getElementById("empty-state");
const loginOptionsDiv = document.getElementById("login-options");
const btnLoginGoogle = document.getElementById("btn-login-google");
const btnLogout = document.getElementById("btn-logout");
const btnAdmin = document.getElementById("btn-admin");
const btnLike = document.getElementById("btn-like");
const btnNope = document.getElementById("btn-nope");
const btnSkip = document.getElementById("btn-skip");
const btnReview = document.getElementById("btn-review");
const openInterested = document.getElementById("open-interested");
const openNot = document.getElementById("open-not");
const openSkipped = document.getElementById("open-skipped");
const listBack = document.getElementById("list-backdrop");
const listTitle = document.getElementById("list-title");
const listBody = document.getElementById("list-body");
const peopleBack = document.getElementById("people-backdrop");
const peopleTitle = document.getElementById("people-title");
const peopleBody = document.getElementById("people-body");

// Modal close handlers
document.getElementById("list-close").onclick = () => listBack.style.display = "none";
document.getElementById("people-close").onclick = () => peopleBack.style.display = "none";

// State variables
let user = null;
let allSpots = [];
let currentSpots = [];
let currentSpotIndex = 0;
let historyIndex = [];

// Authentication handlers
btnLoginGoogle.onclick = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Sign-in error:", error);
  }
};

btnLogout.onclick = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out error:", error);
  }
};

btnAdmin.onclick = () => {
  window.location.href = 'admin-login.html';
};

// Auth state observer
onAuthStateChanged(auth, (u) => {
  user = u || null;
  if (user) {
    loginOptionsDiv.style.display = "none";
    btnLogout.style.display = "";
  } else {
    loginOptionsDiv.style.display = "flex";
    btnLogout.style.display = "none";
  }
  loadAllSpots();
});

// List button handlers
openInterested.onclick = () => openUserList("interested");
openNot.onclick = () => openUserList("not_interested");
openSkipped.onclick = () => openUserList("skipped");

function openUserList(choice) {
  if (!user) {
    alert("Please login first to view your lists.");
    return;
  }
  listBack.style.display = "flex";
  listTitle.textContent = 
    choice === "interested" ? "My Interested Spots" :
    choice === "not_interested" ? "My Not Interested Spots" :
    "My Skipped Spots";
  listBody.textContent = "Loading...";

  const q = query(
    collection(db, "userChoices"),
    where("userId", "==", user.uid),
    where("choice", "==", choice),
    orderBy("timestamp", "desc")
  );

  onSnapshot(q, async (snap) => {
    if (snap.empty) {
      listBody.innerHTML = `<p class="muted">Nothing here yet.</p>`;
      return;
    }

    const spotIds = snap.docs.map(d => d.data().spotId);
    const spotPromises = spotIds.map(id => getDoc(doc(db, "spots", id)));
    const spotResults = await Promise.all(spotPromises);
    
    const wrap = document.createElement("div");
    wrap.className = "list-grid";
    spotResults.forEach(doc => {
      if (!doc.exists()) return;
      const s = doc.data();
      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `
        <img src="${s.imageURL || ''}" alt="${s.name || ''}" onerror="this.style.display='none'">
        <div>
          <strong>${s.name || "Untitled"}</strong>
          <div class="muted">${s.points || ""}</div>
        </div>
      `;
      wrap.appendChild(div);
    });
    listBody.innerHTML = "";
    listBody.appendChild(wrap);
  });
}

// Data loading and rendering
async function loadAllSpots() {
  try {
    const q = query(collection(db, "spots"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allSpots = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    filterSpotsForUser();
    renderCurrentSpot();
  } catch (error) {
    console.error("Error loading spots:", error);
    allSpots = [];
    renderCurrentSpot();
  }
}

function renderCurrentSpot() {
  stackEl.innerHTML = "";
  if (!currentSpots.length || currentSpotIndex >= currentSpots.length) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  const spot = currentSpots[currentSpotIndex];
  const card = document.createElement("div");
  card.className = "trip-card";
  card.innerHTML = `
    <div class="overlay like">❤️</div>
    <div class="overlay dislike">💔</div>
    <div class="overlay skip">⏩</div>
    <div class="overlay review">🔄</div>
    <img src="${spot.imageURL || ''}" alt="${spot.name || ''}">
    <div class="content">
      <h3>${spot.name || "Untitled"}</h3>
      <p><b>Cost:</b> ₹${spot.cost || "-"}</p>
      <p><b>People:</b> ${spot.people || "-"}</p>
      <p><b>Points:</b> ${spot.points || "-"}</p>
      <p><b>Dates:</b> ${spot.startDate || "-"} → ${spot.endDate || "-"}</p>
      <p><b>Transport:</b> ${spot.transport || "-"}</p>
      <p><b>Hotel:</b> ${spot.hotel || "-"}</p>
      <div class="spot-actions">
        <button class="pill" id="btn-spot-people-int">Interested ❤️</button>
        <button class="pill" id="btn-spot-people-no">Not Interested 💔</button>
        <button class="pill" id="btn-spot-people-skip">Skipped ⏩</button>
      </div>
    </div>
  `;
  stackEl.appendChild(card);

  // Attach spot people buttons
  document.getElementById("btn-spot-people-int").onclick = () => 
    openPeopleForSpot("interested");
  document.getElementById("btn-spot-people-no").onclick = () => 
    openPeopleForSpot("not_interested");
  document.getElementById("btn-spot-people-skip").onclick = () => 
    openPeopleForSpot("skipped");
}

// Button action handlers
btnLike.onclick = () => performAction("interested");
btnNope.onclick = () => performAction("not_interested");
btnSkip.onclick = () => performAction("skipped");
btnReview.onclick = () => performAction("review");

async function performAction(action) {
  if (!currentSpots[currentSpotIndex]) return;

  try {
    const spotId = currentSpots[currentSpotIndex].id;
    
    if (user && action !== "review") {
      await setDoc(doc(db, "userChoices", `${user.uid}_${spotId}`), {
        userId: user.uid,
        spotId: spotId,
        choice: action,
        timestamp: serverTimestamp(),
        userName: user.displayName || user.email,
        userEmail: user.email
      });
    }

    // Update UI
    if (action === "review") {
      if (historyIndex.length > 0) {
        currentSpotIndex = historyIndex.pop();
      }
    } else {
      historyIndex.push(currentSpotIndex);
      currentSpotIndex++;
    }
    renderCurrentSpot();

  } catch (error) {
    console.error("Action error:", error);
  }
}

// Initialize
loadAllSpots();

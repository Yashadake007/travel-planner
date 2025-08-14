// script.js — swipe logic, Firestore spot handling, list buttons

let spots = [];
let currentIndex = 0;

// Firestore collections
const spotsRef = db.collection("spots");
const interestedRef = db.collection("interested");
const notInterestedRef = db.collection("notInterested");
const reviewRef = db.collection("review");

// DOM Elements
const spotCard = document.querySelector("#spotCard");
const interestedBtn = document.querySelector("#interestedBtn");
const notInterestedBtn = document.querySelector("#notInterestedBtn");
const skipBtn = document.querySelector("#skipBtn");
const reviewBtn = document.querySelector("#reviewBtn");

const interestedListBtn = document.querySelector("#interestedListBtn");
const notInterestedListBtn = document.querySelector("#notInterestedListBtn");
const reviewListBtn = document.querySelector("#reviewListBtn");

const listModal = document.querySelector("#listModal");
const listContent = document.querySelector("#listContent");
const listClose = document.querySelector("#listClose");

// Fetch spots from Firestore
async function loadSpots() {
  try {
    const snapshot = await spotsRef.get();
    spots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    currentIndex = 0;
    renderSpot();
  } catch (err) {
    console.error("Error loading spots:", err);
  }
}

// Render current spot
function renderSpot() {
  if (currentIndex >= spots.length) {
    spotCard.innerHTML = `<p>No more spots available.</p>`;
    return;
  }
  const spot = spots[currentIndex];
  spotCard.innerHTML = `
    <div class="spot-card">
      <img src="${spot.image}" alt="${spot.name}" />
      <h2>${spot.name}</h2>
      <p>${spot.description}</p>
    </div>
  `;
}

// Save choice to Firestore
async function saveChoice(type, spot) {
  if (!window.currentUser) return;
  const refMap = {
    interested: interestedRef,
    notInterested: notInterestedRef,
    review: reviewRef
  };
  try {
    await refMap[type].doc(`${window.currentUser.uid}_${spot.id}`).set({
      userId: window.currentUser.uid,
      spotId: spot.id,
      name: spot.name,
      image: spot.image,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error(`Error saving ${type}:`, err);
  }
}

// Handle button actions
function handleAction(type) {
  if (currentIndex >= spots.length) return;
  const spot = spots[currentIndex];
  saveChoice(type, spot);
  currentIndex++;
  renderSpot();
}

// Load list from Firestore
async function loadList(type) {
  if (!window.currentUser) return;
  const refMap = {
    interested: interestedRef,
    notInterested: notInterestedRef,
    review: reviewRef
  };
  try {
    const snapshot = await refMap[type].where("userId", "==", window.currentUser.uid).get();
    if (snapshot.empty) {
      listContent.innerHTML = `<p>No items found in ${type} list.</p>`;
      return;
    }
    let html = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      html += `
        <div class="list-item">
          <img src="${data.image}" alt="${data.name}" />
          <span>${data.name}</span>
        </div>
      `;
    });
    listContent.innerHTML = html;
  } catch (err) {
    console.error(`Error loading ${type} list:`, err);
  }
}

// Event listeners
if (interestedBtn) interestedBtn.addEventListener("click", () => handleAction("interested"));
if (notInterestedBtn) notInterestedBtn.addEventListener("click", () => handleAction("notInterested"));
if (skipBtn) skipBtn.addEventListener("click", () => handleAction("review"));
if (reviewBtn) reviewBtn.addEventListener("click", () => handleAction("review"));

if (interestedListBtn) interestedListBtn.addEventListener("click", () => {
  loadList("interested");
  listModal.style.display = "block";
});
if (notInterestedListBtn) notInterestedListBtn.addEventListener("click", () => {
  loadList("notInterested");
  listModal.style.display = "block";
});
if (reviewListBtn) reviewListBtn.addEventListener("click", () => {
  loadList("review");
  listModal.style.display = "block";
});
if (listClose) listClose.addEventListener("click", () => {
  listModal.style.display = "none";
});

// Swipe logic (basic)
let startX, startY;
spotCard.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
});
spotCard.addEventListener("touchend", e => {
  if (!startX || !startY) return;
  let endX = e.changedTouches[0].clientX;
  let endY = e.changedTouches[0].clientY;
  let diffX = endX - startX;
  let diffY = endY - startY;

  if (Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 50) handleAction("interested"); // swipe right
    else if (diffX < -50) handleAction("notInterested"); // swipe left
  } else {
    if (diffY > 50) handleAction("review"); // swipe down
    else if (diffY < -50) handleAction("review"); // swipe up → skip/review
  }
  startX = null;
  startY = null;
});

// Load spots after login
auth.onAuthStateChanged(user => {
  if (user) loadSpots();
});

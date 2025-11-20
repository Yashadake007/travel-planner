import {
  auth, db, provider,
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc,
  query, where, orderBy, limit, serverTimestamp, onSnapshot,
  onAuthStateChanged, signInWithPopup, signOut
} from "./firebase.js";

/* ---------------- State Variables & Helper Functions ---------------- */
let user = null; // Current authenticated user
let spots = [];  // All spots available for swiping
let currentSpotIndex = 0;
let isDragging = false;
let startX = 0;
let startY = 0;
let listUnsub = null;   // To store unsubscribe function for the user list modal
let peopleUnsub = null; // To store unsubscribe function for the people list modal
let spotUnsub = null;   // To store unsubscribe function for the main spot list

// Basic HTML escaping helper
const esc = (html) => {
  return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

// Simple custom notification (replacing alert())
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => notification.remove());
    }, 3000);
}

/* ---------------- DOM Elements ---------------- */
const stackEl = document.getElementById("card-stack");
const emptyEl = document.getElementById("empty-state");

// Login/Logout elements
const loginOptionsDiv = document.getElementById("login-options");
const btnLoginGoogle  = document.getElementById("btn-login-google");
const btnLogout = document.getElementById("btn-logout");
const btnAdmin  = document.getElementById("btn-admin");

// Action buttons
const btnLike   = document.getElementById("btn-like");
const btnNope   = document.getElementById("btn-nope");
const btnSkip   = document.getElementById("btn-skip");
const btnReview = document.getElementById("btn-review");

// List launchers
const openInterested = document.getElementById("open-interested");
const openNot        = document.getElementById("open-not");
const openSkipped    = document.getElementById("open-skipped");

// User List Modal elements
const listBack  = document.getElementById("list-backdrop");
const listTitle = document.getElementById("list-title");
const listBody  = document.getElementById("list-body");
document.getElementById("list-close").onclick = ()=> {
    listBack.style.display="none";
    if(listUnsub) { listUnsub(); listUnsub = null; } // CRITICAL FIX: Unsubscribe on close
};

// People List Modal elements
const peopleBack  = document.getElementById("people-backdrop");
const peopleTitle = document.getElementById("people-title");
const peopleBody  = document.getElementById("people-body");
document.getElementById("people-close").onclick = ()=> {
    peopleBack.style.display="none";
    if(peopleUnsub) { peopleUnsub(); peopleUnsub = null; } // CRITICAL FIX: Unsubscribe on close
};

/* ---------------- Authentication ---------------- */

onAuthStateChanged(auth, async u => {
  user = u;
  if (user) {
    // Show user-specific UI
    loginOptionsDiv.style.display = "none";
    btnLogout.style.display = "block";
    btnAdmin.style.display = "block"; // Assuming all logged in users see the admin button

    // Load spots only after user is authenticated
    if (!spotUnsub) {
        loadSpots();
    }
  } else {
    // Show anonymous UI
    loginOptionsDiv.style.display = "flex";
    btnLogout.style.display = "none";
    btnAdmin.style.display = "none";
    
    // Clear spots and unsubscribe
    spots = [];
    currentSpotIndex = 0;
    if (spotUnsub) {
        spotUnsub(); 
        spotUnsub = null;
    }
    renderCurrentSpot();
  }
});

btnLogout.onclick = async () => {
  await signOut(auth);
};

btnLoginGoogle.onclick = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("Google sign in failed:", err);
    showNotification("Login failed: " + err.message);
  }
};

/* ---------------- Core App Logic (Swiping) ---------------- */

async function loadSpots() {
  if (!user) return;
  
  // 1. Get IDs of spots the user has already seen (interested, not_interested, skipped, review)
  const choicesRef = collection(db, 'choices');
  const qChoices = query(choicesRef, where('userId', '==', user.uid));
  
  const choicesSnapshot = await getDocs(qChoices);
  const seenSpotIds = choicesSnapshot.docs.map(doc => doc.data().spotId);

  // 2. Fetch all spots that have NOT been seen
  const spotsRef = collection(db, 'spots');
  let qSpots = query(spotsRef, orderBy('createdAt', 'desc'));

  // NOTE: Firestore doesn't support 'where not in' for arrays larger than 10.
  // For simplicity here, we'll fetch all and filter in memory, which is inefficient 
  // but works for small datasets. For large scale, you'd need a different data structure.
  
  // CRITICAL FIX: Use onSnapshot for real-time list
  if (spotUnsub) spotUnsub(); // Unsubscribe existing listener

  spotUnsub = onSnapshot(qSpots, (snap) => {
    const allSpots = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter out spots already seen by the user
    spots = allSpots.filter(spot => !seenSpotIds.includes(spot.id));
    
    currentSpotIndex = 0;
    renderCurrentSpot();
  }, (err) => {
    console.error("Error loading spots:", err);
    showNotification("Error loading spots: " + err.message);
  });
}

function renderCurrentSpot() {
  stackEl.innerHTML = "";
  emptyEl.style.display = "none";

  if (spots.length === 0 || currentSpotIndex >= spots.length) {
    emptyEl.style.display = "block";
    return;
  }

  const spot = spots[currentSpotIndex];
  const card = document.createElement("div");
  card.className = "card";
  card.id = "active-card";
  card.dataset.spotId = spot.id;
  card.dataset.index = currentSpotIndex;

  // Helper elements for drag feedback
  const oLike = document.createElement("div");
  oLike.className = "overlay overlay-like";
  oLike.textContent = "INTERESTED";
  
  const oNope = document.createElement("div");
  oNope.className = "overlay overlay-nope";
  oNope.textContent = "NOT INTERESTED";
  
  const oSkip = document.createElement("div");
  oSkip.className = "overlay overlay-skip";
  oSkip.textContent = "SKIP";

  const oReview = document.createElement("div");
  oReview.className = "overlay overlay-review";
  oReview.textContent = "REVIEW LATER";

  card.innerHTML = `
    <div class="card-image" style="background-image:url('${esc(spot.imageURL)}');"></div>
    <div class="card-content">
      <h3>${esc(spot.name)} <span class="location">${esc(spot.location)}</span></h3>
      <p><strong>Duration:</strong> ${esc(spot.startDate)} to ${esc(spot.endDate)}</p>
      <p><strong>Cost:</strong> Approx. ${esc(spot.cost)} | <strong>People:</strong> ${esc(spot.people)}</p>
      <p><strong>Key Points:</strong> ${esc(spot.points)}</p>
      <p class="muted">Transport: ${esc(spot.transport)}</p>
      <button class="list-link" data-spot-id="${spot.id}" data-choice="interested">
        Who's interested?
      </button>
    </div>
  `;
  card.appendChild(oLike);
  card.appendChild(oNope);
  card.appendChild(oSkip);
  card.appendChild(oReview);

  stackEl.appendChild(card);
  
  // Add listeners for the 'Who's interested' button on the new card
  const listLink = card.querySelector('.list-link');
  listLink.onclick = () => openPeopleList(spot.id, 'interested');

  // Set up dragging listeners
  setupCardDragging(card, oLike, oNope, oSkip, oReview);
}

function performAction(choice, card) {
  if (!user) {
    showNotification("Please log in to make a choice.");
    return;
  }
  
  const spotId = card.dataset.spotId;
  
  // 1. Save the user's choice to Firestore
  const choicesRef = collection(db, 'choices');
  const choiceDocRef = doc(choicesRef, `${user.uid}_${spotId}`); // Unique ID for user-spot pair
  
  const choiceData = {
      userId: user.uid,
      userEmail: user.email,
      spotId: spotId,
      choice: choice,
      timestamp: serverTimestamp()
  };
  
  // Use setDoc to create or overwrite the choice
  setDoc(choiceDocRef, choiceData)
    .then(() => {
      // 2. Animate the swipe and move to the next spot
      card.classList.remove("snap-back");
      let angle = 0;
      let x = 0;
      let y = 0;
      
      switch(choice) {
        case "interested": // Right
          angle = 15; x = window.innerWidth;
          break;
        case "not_interested": // Left
          angle = -15; x = -window.innerWidth;
          break;
        case "skipped": // Up
          y = -window.innerHeight;
          break;
        case "review": // Down
          y = window.innerHeight;
          break;
      }
      
      card.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
      card.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
      card.style.opacity = 0;
      
      // Remove card after animation and render next
      setTimeout(() => {
        card.remove();
        currentSpotIndex++;
        renderCurrentSpot();
      }, 400);

    })
    .catch(err => {
      console.error("Error saving choice:", err);
      showNotification("Error saving choice: " + err.message);
    });
}

/* ---------------- Dragging Functions ---------------- */

// Declared outside to prevent function re-creation inside renderCurrentSpot
let activeCard = null;
let oLike = null;
let oNope = null;
let oSkip = null;
let oReview = null;

const drag = (e) => {
  if (!isDragging || !activeCard) return;
  e.preventDefault(); // Prevent text selection, etc.

  const currentX = e.pageX || e.touches[0].pageX;
  const currentY = e.pageY || e.touches[0].pageY;
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  // Rotation based on horizontal drag
  const rotation = deltaX / 20;
  
  activeCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;

  // Update opacity for overlays
  const opacityHorizontal = Math.min(1, Math.abs(deltaX) / 100);
  const opacityVertical = Math.min(1, Math.abs(deltaY) / 100);
  
  if (opacityHorizontal > opacityVertical) {
    // Horizontal swipe dominant
    oSkip.style.opacity = oReview.style.opacity = "0";
    if (deltaX > 0) { // Right swipe (Like)
      oLike.style.opacity = opacityHorizontal;
      oNope.style.opacity = "0";
    } else { // Left swipe (Nope)
      oNope.style.opacity = opacityHorizontal;
      oLike.style.opacity = "0";
    }
  } else {
    // Vertical swipe dominant
    oLike.style.opacity = oNope.style.opacity = "0";
    if (deltaY < 0) { // Up swipe (Skip)
      oSkip.style.opacity = opacityVertical;
      oReview.style.opacity = "0";
    } else { // Down swipe (Review)
      oReview.style.opacity = opacityVertical;
      oSkip.style.opacity = "0";
    }
  }
};

const endDrag = (e) => {
  if (!isDragging || !activeCard) return;
  isDragging = false;
  
  // CRITICAL FIX: Always remove global listeners when drag ends
  window.removeEventListener("pointermove", drag, {passive: true});
  window.removeEventListener("pointerup", endDrag, {passive: true});
  
  activeCard.classList.remove("no-transition"); // Re-enable transition for snap-back

  const currentX = e.pageX || (e.changedTouches && e.changedTouches[0].pageX) || startX;
  const currentY = e.pageY || (e.changedTouches && e.changedTouches[0].pageY) || startY;
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  const performThreshold = 110;
  
  let action = null;
  
  // Determine action based on max delta
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > performThreshold) action = "interested";
      else if (deltaX < -performThreshold) action = "not_interested";
  } else {
      if (deltaY < -performThreshold) action = "skipped";
      else if (deltaY > performThreshold) action = "review";
  }

  if (action) {
    // Action was performed
    performAction(action, activeCard);
  } else {
    // No action, snap back
    activeCard.classList.add("snap-back");
    activeCard.style.transform = "";
    oLike.style.opacity = oNope.style.opacity = oSkip.style.opacity = oReview.style.opacity = "0";
  }
  
  // Reset active variables
  activeCard = null;
  oLike = oNope = oSkip = oReview = null;
};


function setupCardDragging(card, likeEl, nopeEl, skipEl, reviewEl) {
  // Pass the overlay elements to the global scope for use in drag()
  oLike = likeEl;
  oNope = nopeEl;
  oSkip = skipEl;
  oReview = reviewEl;

  const startDrag = (e) => {
    // Only drag with primary mouse button (0) or touch
    if (e.buttons > 1 || (e.type === 'pointerdown' && e.button !== 0 && !e.touches)) return;
    
    isDragging = true;
    activeCard = card;
    
    // Store initial touch/cursor position
    startX = e.pageX || e.touches[0].pageX;
    startY = e.pageY || e.touches[0].pageY;

    card.classList.remove("snap-back");
    card.classList.add("no-transition");
    
    // CRITICAL FIX: Add listeners to the window once, and remove them in endDrag
    window.addEventListener("pointermove", drag, {passive: true});
    window.addEventListener("pointerup", endDrag, {passive: true});
  };

  card.addEventListener("pointerdown", startDrag, {passive: true});
  card.addEventListener("touchstart", startDrag, {passive: true});
}

/* ---------------- List Modals & Handlers ---------------- */

// Handlers for the small list launcher buttons
openInterested.onclick = ()=> openUserList("interested", "My Interested Spots");
openNot.onclick        = ()=> openUserList("not_interested", "My Not Interested Spots");
openSkipped.onclick    = ()=> openUserList("skipped", "My Skipped Spots");

// Generic function to open the user's personal list
function openUserList(choice, title){
    if (!user){ showNotification('Login required to view your list.'); return; }
    
    listBack.style.display="flex";
    listTitle.textContent = title;
    listBody.innerHTML = "Loading...";

    // CRITICAL FIX: Unsubscribe from the previous listener before setting up a new one
    if (listUnsub) listUnsub();

    const choicesRef = collection(db, 'choices');
    const qChoices = query(
        choicesRef, 
        where('userId', '==', user.uid),
        where('choice', '==', choice),
        orderBy('timestamp', 'desc')
    );

    // Listen for real-time updates to user's choices
    listUnsub = onSnapshot(qChoices, async (snap)=>{ // Store the unsub function
        if(snap.empty){
            listBody.innerHTML = `<p class="empty">You have no spots marked as ${choice.replace('_',' ')}.</p>`;
            return;
        }

        const spotIds = snap.docs.map(d=>d.data().spotId);
        
        // Fetch the actual spot data for these IDs
        const spotDetails = await Promise.all(spotIds.map(id => getDoc(doc(db, 'spots', id))));

        const table = document.createElement('table');
        table.className = 'table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>#</th>
                    <th>Spot</th>
                    <th>Location</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');
        let i = 0;

        spotDetails.forEach(spotDoc=>{
            if(spotDoc.exists()){
                const spot = spotDoc.data();
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${++i}</td>
                    <td>${esc(spot.name)}</td>
                    <td>${esc(spot.location)}</td>
                    <td><button class="primary-btn list-link" data-spot-id="${spotDoc.id}" data-choice="${choice}">
                        People who ${choice.replace('_', ' ')}
                    </button></td>
                `;
                // Add listener to the link button
                row.querySelector('.list-link').onclick = () => openPeopleList(spotDoc.id, choice);
            }
        });

        listBody.innerHTML="";
        listBody.appendChild(table);

    }, (err)=>{
        console.error("Error loading user list:", err);
        listBody.innerHTML = `<p class="muted">Error loading list: ${err.message}</p>`;
    });
}


// Function to open the list of people interested in a specific spot
function openPeopleList(spotId, choice){
    if (!user){ showNotification('Login required to view this list.'); return; }
    
    peopleBack.style.display="flex";
    peopleTitle.textContent = `People who ${choice.replace('_', ' ')}:`;
    peopleBody.innerHTML = "Loading...";

    // CRITICAL FIX: Unsubscribe from the previous listener before setting up a new one
    if (peopleUnsub) peopleUnsub();

    // Fetch spot name first for display title
    getDoc(doc(db, 'spots', spotId)).then(spotDoc => {
        if(spotDoc.exists()){
            peopleTitle.textContent = `${choice.replace('_', ' ')} ${esc(spotDoc.data().name)}`;
        }
    });

    const choicesRef = collection(db, 'choices');
    const qChoices = query(
        choicesRef,
        where('spotId', '==', spotId),
        where('choice', '==', choice)
    );

    // Get a real-time list of users who made this choice on this spot
    peopleUnsub = onSnapshot(qChoices, (snap)=>{ // Store the unsub function
        if(snap.empty){
            peopleBody.innerHTML = `<p class="empty">No one else has marked this spot as ${choice.replace('_',' ')}.</p>`;
            return;
        }

        const list = document.createElement("div");
        list.className = "people-list-container";
        let i = 0;

        snap.docs.forEach(d=>{
            const x = d.data();
            const row = document.createElement("div");
            row.className="list-item"; // Reusing list-item for styling
            row.style.display = 'block'; // Override flex for simple list
            row.innerHTML = `
                <div><strong>#${++i}</strong></div>
                <div class="muted" style="font-size:13px">Email: ${esc(x.userEmail||\"-\")}</div>
                <div class="muted" style="font-size:11px">UID: ${esc(x.userId||\"-\")}</div>`;
            list.appendChild(row);
        });
        
        peopleBody.innerHTML="";
        peopleBody.appendChild(list);

    }, (err)=>{
        console.error("Error loading people list:", err);
        peopleBody.innerHTML = `<p class="muted">Error loading people: ${err.message}</p>`;
    });
}

/* --------------- Buttons & Keyboard Shortcuts --------------- */
btnLike.onclick   = ()=> { const c=document.getElementById("active-card"); if(c) performAction("interested", c); };
btnNope.onclick   = ()=> { const c=document.getElementById("active-card"); if(c) performAction("not_interested", c); };
btnSkip.onclick   = ()=> { const c=document.getElementById("active-card"); if(c) performAction("skipped", c); };
btnReview.onclick = ()=> { const c=document.getElementById("active-card"); if(c) performAction("review", c); };

window.addEventListener("keydown", (e)=>{
  const c=document.getElementById("active-card");
  if(!c) return;
  if (e.key==="ArrowRight") performAction("interested", c);
  if (e.key==="ArrowLeft")  performAction("not_interested", c);
  if (e.key==="ArrowUp")    performAction("skipped", c);
  if (e.key==="ArrowDown")  performAction("review", c);
});

// Initial spot rendering once the script runs (though it will wait for auth)
renderCurrentSpot();

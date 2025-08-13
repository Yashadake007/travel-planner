// Firebase init
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.getAuth(app);
const db = firebase.getFirestore(app);

// DOM elements
const cardContainer = document.getElementById('card-container');
const btnInterested = document.getElementById('btn-interested');
const btnNot = document.getElementById('btn-not');
const btnSkip = document.getElementById('btn-skip');
const btnReview = document.getElementById('btn-review');
const openInterested = document.getElementById('open-interested');
const openNot = document.getElementById('open-not');
const openSkipped = document.getElementById('open-skipped');
const listModal = document.getElementById('list-modal');
const listTitle = document.getElementById('list-title');
const listContent = document.getElementById('list-content');
const closeModal = document.getElementById('close-modal');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let spots = [];
let currentIndex = 0;

// Load spots from Firestore
async function loadSpots() {
  const q = await firebase.getDocs(firebase.collection(db, 'spots'));
  spots = q.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderCard();
}

function renderCard() {
  cardContainer.innerHTML = '';
  if (currentIndex >= spots.length) {
    cardContainer.innerHTML = '<p>No more spots!</p>';
    return;
  }
  const spot = spots[currentIndex];
  const card = document.createElement('div');
  card.className = 'spot-card';
  card.innerHTML = `
    <img src="${spot.image}" alt="${spot.name}" />
    <h3>${spot.name}</h3>
    <p>${spot.description}</p>
  `;
  cardContainer.appendChild(card);
}

async function saveChoice(spotId, choice) {
  if (!currentUser) return;
  await firebase.setDoc(firebase.doc(db, `users/${currentUser.uid}/choices`, spotId), { choice });
}

// Button handlers
btnInterested.onclick = () => handleChoice('interested');
btnNot.onclick = () => handleChoice('not');
btnSkip.onclick = () => handleChoice('skipped');
btnReview.onclick = () => handleChoice('review');

function handleChoice(choice) {
  saveChoice(spots[currentIndex].id, choice);
  currentIndex++;
  renderCard();
}

// List modals
function openList(choice) {
  if (!currentUser) return;
  listTitle.textContent = choice.charAt(0).toUpperCase() + choice.slice(1) + " Spots";
  listContent.innerHTML = '';
  firebase.getDocs(firebase.collection(db, `users/${currentUser.uid}/choices`))
    .then(snapshot => {
      snapshot.forEach(doc => {
        if (doc.data().choice === choice) {
          const spot = spots.find(s => s.id === doc.id);
          if (spot) {
            const li = document.createElement('li');
            li.textContent = spot.name;
            listContent.appendChild(li);
          }
        }
      });
      listModal.style.display = 'block';
    });
}

openInterested.onclick = () => openList('interested');
openNot.onclick = () => openList('not');
openSkipped.onclick = () => openList('skipped');
closeModal.onclick = () => listModal.style.display = 'none';

// Auth
firebase.onAuthStateChanged(auth, user => {
  currentUser = user;
  logoutBtn.style.display = user ? 'inline-block' : 'none';
  if (user) loadSpots();
});

logoutBtn.onclick = () => firebase.signOut(auth);

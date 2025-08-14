// Initialize Firebase App
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// Keep track of logged-in user
window.currentUser = null;

// Auth state listener
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("User logged in:", user.email);
    window.currentUser = user;
    document.getElementById("loginBtn").style.display = "none";
    document.getElementById("signupBtn").style.display = "none";
    document.getElementById("logoutBtn").style.display = "inline-block";
    loadSpots(); // Load spots after login
  } else {
    console.log("No user logged in");
    window.currentUser = null;
    document.getElementById("loginBtn").style.display = "inline-block";
    document.getElementById("signupBtn").style.display = "inline-block";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("spotCard").innerHTML = "<p>Please log in to see travel spots.</p>";
  }
});

// Login button
document.getElementById("loginBtn").addEventListener("click", () => {
  const email = prompt("Enter email:");
  const password = prompt("Enter password:");
  if (email && password) {
    auth.signInWithEmailAndPassword(email, password)
      .catch(err => alert(err.message));
  }
});

// Signup button
document.getElementById("signupBtn").addEventListener("click", () => {
  const email = prompt("Enter email:");
  const password = prompt("Enter password:");
  if (email && password) {
    auth.createUserWithEmailAndPassword(email, password)
      .catch(err => alert(err.message));
  }
});

// Logout button
document.getElementById("logoutBtn").addEventListener("click", () => {
  auth.signOut();
});

// Load spots from Firestore
function loadSpots() {
  db.collection("spots").get().then(snapshot => {
    const spots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    window.allSpots = spots;
    console.log("Loaded spots:", spots);
    if (typeof renderSpot === "function") {
      renderSpot(0); // Show first spot
    }
  }).catch(err => {
    console.error("Error loading spots:", err);
  });
}

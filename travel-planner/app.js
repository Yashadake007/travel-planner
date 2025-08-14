// app.js
import { auth, db, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, collection, getDocs } from "./firebase.js";

window.currentUser = null;

// Auth state listener
onAuthStateChanged(auth, user => {
  if (user) {
    console.log("User logged in:", user.email);
    window.currentUser = user;
    document.getElementById("loginBtn").style.display = "none";
    document.getElementById("signupBtn").style.display = "none";
    document.getElementById("logoutBtn").style.display = "inline-block";
    loadSpots();
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
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = prompt("Enter email:");
  const password = prompt("Enter password:");
  if (email && password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert(err.message);
    }
  }
});

// Signup button
document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = prompt("Enter email:");
  const password = prompt("Enter password:");
  if (email && password) {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert(err.message);
    }
  }
});

// Logout button
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
});

// Load spots from Firestore
async function loadSpots() {
  try {
    const snapshot = await getDocs(collection(db, "spots"));
    const spots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    window.allSpots = spots;
    console.log("Loaded spots:", spots);
    if (typeof renderSpot === "function") {
      renderSpot(0);
    }
  } catch (err) {
    console.error("Error loading spots:", err);
  }
}

// MultipleFiles/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { 
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signInAnonymously, signInWithCustomToken 
}
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { 
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc, updateDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, writeBatch, FieldValue 
}
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// --- MANDATORY CANVAS ENVIRONMENT VARIABLES ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// Use appId for constructing Firestore paths for multi-user data
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

if (!firebaseConfig) {
  console.error("Firebase Config is missing. Cannot initialize Firebase.");
}

// 1. Initialize App
export const app = firebaseConfig ? initializeApp(firebaseConfig) : null;

// 2. Initialize Services
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const provider = new GoogleAuthProvider(); // Exported for Google Sign-In

// 3. Mandatory Custom Token Authentication Logic (Run once on load)
async function authenticateUser() {
  if (!auth) {
    console.error("Firebase Auth not initialized.");
    return;
  }
  try {
    if (initialAuthToken) {
      await signInWithCustomToken(auth, initialAuthToken);
      console.log("Authenticated using custom token.");
    } else {
      await signInAnonymously(auth);
      console.warn("No custom token found. Signed in anonymously.");
    }
  } catch (error) {
    console.error("Authentication failed:", error);
  }
}

if (app) {
  authenticateUser();
}

// --- Re-Export all necessary Firebase functions ---
export {
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signInWithCustomToken,
  collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc, updateDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, writeBatch, FieldValue
};

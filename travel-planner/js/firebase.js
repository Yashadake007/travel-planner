// Firebase bootstrap (v10 ESM over CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc,
         query, where, orderBy, serverTimestamp, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// === YOUR CONFIG (fixed storageBucket) ===
const firebaseConfig = {
  apiKey: "AIzaSyBU7SRrijoXJzNJdOhQLmSh_9mdoklxLPA",
  authDomain: "travel-planner-bbd7b.firebaseapp.com",
  projectId: "travel-planner-bbd7b",
  storageBucket: "travel-planner-bbd7b.appspot.com",
  messagingSenderId: "901740451346",
  appId: "1:901740451346:web:b0cb6372d6a7432e932acb"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const provider = new GoogleAuthProvider();

// re-export helpers
export {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  query, where, orderBy, serverTimestamp, onSnapshot,
  onAuthStateChanged, signInWithPopup, signOut
};

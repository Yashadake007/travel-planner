// firebaseConfig.js — Firebase initialization

const firebaseConfig = {
  apiKey: "AIzaSyBU7SRrijoXJzNJdOhQLmSh_9mdoklxLPA",
  authDomain: "travel-planner-bbd7b.firebaseapp.com",
  projectId: "travel-planner-bbd7b",
  storageBucket: "travel-planner-bbd7b.firebasestorage.app",
  messagingSenderId: "901740451346",
  appId: "1:901740451346:web:b0cb6372d6a7432e932acb"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore reference
const db = firebase.firestore();

// Auth reference
const auth = firebase.auth();

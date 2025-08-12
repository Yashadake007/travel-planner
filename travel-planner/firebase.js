// firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyBU7SRrijoXJzNJdOhQLmSh_9mdoklxLPA",
  authDomain: "travel-planner-bbd7b.firebaseapp.com",
  projectId: "travel-planner-bbd7b",
  storageBucket: "travel-planner-bbd7b.firebasestorage.app",
  messagingSenderId: "901740451346",
  appId: "1:901740451346:web:b0cb6372d6a7432e932acb"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

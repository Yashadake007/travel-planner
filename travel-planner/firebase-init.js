import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBU7SRrijoXJzNJdOhQLmSh_9mdoklxLPA",
  authDomain: "travel-planner-bbd7b.firebaseapp.com",
  projectId: "travel-planner-bbd7b",
  storageBucket: "travel-planner-bbd7b.appspot.com",
  messagingSenderId: "901740451346",
  appId: "1:901740451346:web:b0cb6372d6a7432e932acb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

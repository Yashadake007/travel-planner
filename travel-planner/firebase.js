// firebase.js

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBU7SRrijoXJzNJdOhQLmSh_9mdoklxLPA",
  authDomain: "travel-planner-bbd7b.firebaseapp.com",
  projectId: "travel-planner-bbd7b",
  storageBucket: "travel-planner-bbd7b.appspot.com", // fixed
  messagingSenderId: "901740451346",
  appId: "1:901740451346:web:b0cb6372d6a7432e932acb"
};

// Include Firebase SDKs in HTML BEFORE this file:
// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-storage.js"></script>
// <script src="firebase.js"></script>

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

window.firebaseApp = firebase;
window.auth = auth;
window.db = db;
window.storage = storage;

window.getCurrentUserEmail = function () {
  return auth.currentUser ? auth.currentUser.email : null;
};

window.uploadImageFile = async function (file, pathInStorage) {
  if (!file) throw new Error("No file provided");
  const ref = storage.ref().child(pathInStorage);
  await ref.put(file);
  return await ref.getDownloadURL();
};

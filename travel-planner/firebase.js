// firebase.js
// Firebase v8 compat (loaded via script tags in each HTML)

const firebaseConfig = {
  apiKey: "AIzaSyBU7SRrijoXJzNJdOhQLmSh_9mdoklxLPA",
  authDomain: "travel-planner-bbd7b.firebaseapp.com",
  projectId: "travel-planner-bbd7b",
  storageBucket: "travel-planner-bbd7b.appspot.com", // important: appspot.com
  messagingSenderId: "901740451346",
  appId: "1:901740451346:web:b0cb6372d6a7432e932acb"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

window.auth = firebase.auth();
window.db = firebase.firestore();
window.storage = firebase.storage();

// Helpers
window.requireAuth = (redirect = 'login.html') =>
  new Promise(resolve => {
    auth.onAuthStateChanged(u => {
      if (!u) window.location.href = redirect;
      else resolve(u);
    });
  });

window.signOutGo = (to = 'login.html') =>
  auth.signOut().then(() => (window.location.href = to));

// Upload helper (returns downloadURL)
window.uploadImageFile = async (file, path) => {
  const ref = storage.ref().child(path);
  await ref.put(file);
  return await ref.getDownloadURL();
};

let currentUser = null;
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    currentUser = user;
    loadCards();
  }
});

function loadCards() {
  db.collection("spots").get().then(snapshot => {
    const container = document.getElementById("card-container");
    container.innerHTML = '';
    snapshot.forEach(doc => {
      const spot = doc.data();
      const card = document.createElement("div");
      card.classList.add("card");
      card.dataset.id = doc.id;
      card.innerHTML = `<img src="${spot.image}" alt="">
                        <h3>${spot.name}</h3>`;
      container.appendChild(card);
    });
    initSwipe();
  });
}

function initSwipe() {
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    let startX, startY;

    card.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });

    card.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX > absY) {
        if (dx > 50) handleChoice(card, "interested");
        else if (dx < -50) handleChoice(card, "not_interested");
      } else {
        if (dy < -50) handleChoice(card, "skipped");
        else if (dy > 50) handleChoice(card, "review");
      }
    });
  });
}

function handleChoice(card, choice) {
  const overlays = {
    interested: document.getElementById('overlay-like'),
    not_interested: document.getElementById('overlay-dislike'),
    skipped: document.getElementById('overlay-skip'),
    review: document.getElementById('overlay-review')
  };
  overlays[choice].classList.add('show-overlay');
  setTimeout(() => overlays[choice].classList.remove('show-overlay'), 800);

  db.collection("userChoices").add({
    userId: currentUser.uid,
    spotId: card.dataset.id,
    choice: choice,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  card.remove();
}

function openModal(title, filter) {
  const modal = document.getElementById('modal');
  const list = document.getElementById('modal-list');
  const titleEl = document.getElementById('modal-title');
  titleEl.textContent = title;
  list.innerHTML = '';

  db.collection("userChoices")
    .where("userId", "==", currentUser.uid)
    .where("choice", "==", filter)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const li = document.createElement('li');
        li.textContent = doc.data().spotId;
        list.appendChild(li);
      });
      modal.style.display = 'block';
    });
}

document.getElementById('btn-interested').onclick = () => openModal("Interested Spots", "interested");
document.getElementById('btn-not-interested').onclick = () => openModal("Not Interested", "not_interested");
document.getElementById('btn-skipped').onclick = () => openModal("Skipped Spots", "skipped");
document.getElementById('btn-review').onclick = () => openModal("Review Later", "review");
document.getElementById('btn-logout').onclick = () => auth.signOut();

document.querySelector('.close').onclick = () => document.getElementById('modal').style.display = 'none';
window.onclick = e => {
  if (e.target == document.getElementById('modal')) document.getElementById('modal').style.display = 'none';
};

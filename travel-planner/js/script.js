// js/script.js — updated to use TravelAPI + compat firebase

document.addEventListener("DOMContentLoaded", async () => {
  const cardsContainer = document.querySelector("#cardsContainer");
  const modal = document.querySelector("#peopleModal");
  const modalList = document.querySelector("#peopleList");
  const modalTitle = document.querySelector("#modalTitle");
  const modalClose = document.querySelector("#modalClose");

  let spots = [];
  let currentIndex = 0;

  // --- Modal helpers ---
  function showModal(title, people) {
    modalTitle.textContent = title;
    modalList.innerHTML = "";
    if (!people.length) {
      modalList.innerHTML = `<li class="empty">No entries yet</li>`;
    } else {
      people.forEach(p => {
        const li = document.createElement("li");
        li.textContent = `${p.userId} — ${p.when ? formatWhen(p.when) : ""}`;
        modalList.appendChild(li);
      });
    }
    modal.classList.add("open");
  }
  modalClose.addEventListener("click", () => modal.classList.remove("open"));

  // --- Render current card ---
  function renderCard() {
    cardsContainer.innerHTML = "";
    if (!spots.length || currentIndex >= spots.length) {
      cardsContainer.innerHTML = `<p class="empty">No more spots to show.</p>`;
      return;
    }

    const spot = spots[currentIndex];
    const card = document.createElement("div");
    card.className = "spot-card";
    card.innerHTML = `
      <h2>${spot.name || "Unnamed spot"}</h2>
      <img src="${spot.imageUrl || "placeholder.jpg"}" alt="${spot.name}" />
      <p>${spot.description || ""}</p>
      <div class="actions">
        <button id="btnInterested">Interested</button>
        <button id="btnNotInterested">Not Interested</button>
        <button id="btnSkip">Skip</button>
      </div>
      <div class="lists">
        <button id="btnShowInterested">Show Interested</button>
        <button id="btnShowNotInterested">Show Not Interested</button>
        <button id="btnShowSkipped">Show Skipped</button>
      </div>
    `;
    cardsContainer.appendChild(card);

    // Bind buttons for this card
    card.querySelector("#btnInterested").addEventListener("click", () => handleChoice("interested"));
    card.querySelector("#btnNotInterested").addEventListener("click", () => handleChoice("not_interested"));
    card.querySelector("#btnSkip").addEventListener("click", () => handleChoice("skipped"));

    card.querySelector("#btnShowInterested").addEventListener("click", () => handleShowList("interested"));
    card.querySelector("#btnShowNotInterested").addEventListener("click", () => handleShowList("not_interested"));
    card.querySelector("#btnShowSkipped").addEventListener("click", () => handleShowList("skipped"));
  }

  // --- Handle a choice ---
  async function handleChoice(choice) {
    try {
      await TravelAPI.saveChoice(spots[currentIndex].id, choice);
      currentIndex++;
      renderCard();
    } catch (e) {
      alert("Error saving choice: " + e.message);
      console.error(e);
    }
  }

  // --- Handle show list for current spot ---
  async function handleShowList(choice) {
    try {
      const people = await TravelAPI.getPeopleForSpot(spots[currentIndex].id, choice);
      showModal(`People who are ${choice.replace("_", " ")}`, people);
    } catch (e) {
      alert("Error loading list: " + e.message);
      console.error(e);
    }
  }

  // --- Initial load ---
  async function init() {
    try {
      spots = await TravelAPI.getSpots();
      currentIndex = 0;
      renderCard();
    } catch (e) {
      cardsContainer.innerHTML = `<p class="error">Failed to load spots: ${e.message}</p>`;
      console.error(e);
    }
  }

  // Run init after auth is ready
  if (window.currentUser) {
    init();
  } else {
    document.addEventListener("auth:changed", e => {
      if (e.detail.user) {
        init();
      } else {
        cardsContainer.innerHTML = `<p class="empty">Please log in to view spots.</p>`;
      }
    });
  }
});

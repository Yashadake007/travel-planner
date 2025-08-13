let spots = [];
let idx = 0;
let historyIdx = [];

document.addEventListener("DOMContentLoaded", () => {
  loadSpots().then(() => {
    renderCard();
    attachButtonEvents();
  });
});

async function loadSpots() {
  // Demo mode: no Firebase, using static data
  spots = [
    {
      id: "1",
      name: "Manali Adventure",
      imageURL: "https://via.placeholder.com/400x300",
      cost: 15000,
      people: 4,
      points: "Snow, Trekking, Hot Springs",
      startDate: "2025-08-20",
      endDate: "2025-08-27",
      transport: "Car"
    },
    {
      id: "2",
      name: "Goa Beach Trip",
      imageURL: "https://via.placeholder.com/400x300/00ff99",
      cost: 10000,
      people: 2,
      points: "Beach, Nightlife, Seafood",
      startDate: "2025-09-05",
      endDate: "2025-09-10",
      transport: "Flight"
    }
  ];
  idx = 0;
  historyIdx = [];
}

function renderCard() {
  const container = document.getElementById("card-container");
  container.innerHTML = "";

  if (idx >= spots.length) {
    container.innerHTML = `<p class="muted">No more spots to show</p>`;
    return;
  }

  const spot = spots[idx];
  const card = document.createElement("div");
  card.className = "spot-card";
  card.innerHTML = `
    <img src="${spot.imageURL}" alt="${spot.name}">
    <h3>${spot.name}</h3>
    <p>💰 Cost: ₹${spot.cost}</p>
    <p>👥 People: ${spot.people}</p>
    <p>📍 Points: ${spot.points}</p>
    <p>📅 ${spot.startDate} → ${spot.endDate}</p>
    <p>🚗 Transport: ${spot.transport}</p>
  `;

  container.appendChild(card);
}

function attachButtonEvents() {
  document.getElementById("btn-like").addEventListener("click", () => doAction("interested"));
  document.getElementById("btn-dislike").addEventListener("click", () => doAction("not_interested"));
  document.getElementById("btn-skip").addEventListener("click", () => doAction("skip"));
  document.getElementById("btn-review").addEventListener("click", () => doAction("review"));
}

function doAction(kind) {
  const container = document.getElementById("card-container");
  const card = container.querySelector(".spot-card");
  if (!card) return;

  // Save history for review
  if (kind !== "review") historyIdx.push(idx);

  // Animation feedback
  const feedback = document.createElement("div");
  feedback.className = "feedback";
  feedback.textContent = kind === "interested" ? "❤️" :
                         kind === "not_interested" ? "💔" :
                         kind === "skip" ? "⏩" : "🔄";
  card.appendChild(feedback);
  setTimeout(() => feedback.remove(), 800);

  if (kind === "review" && historyIdx.length > 0) {
    idx = historyIdx.pop();
  } else {
    idx++;
  }

  renderCard();
}

// Modal buttons
function openList(kind) {
  const modalBody = document.getElementById("modal-body");
  modalBody.innerHTML = `<p class="muted">Feature not available in demo mode.</p>`;
}

function openPeopleForSpot(spotId) {
  const peopleBody = document.getElementById("people-body");
  peopleBody.innerHTML = `<p class="muted">Feature not available in demo mode.</p>`;
}

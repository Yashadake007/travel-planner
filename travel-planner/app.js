import { db } from "./firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const cardContainer = document.getElementById("card-container");
let currentIndex = 0;
let spots = [];

// Load spots from Firestore
async function loadSpots() {
    const querySnapshot = await getDocs(collection(db, "spots"));
    spots = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCard();
}

function renderCard() {
    if (currentIndex >= spots.length) {
        cardContainer.innerHTML = "<h2>No more trips available</h2>";
        return;
    }

    const spot = spots[currentIndex];
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
        <img src="${spot.imageUrl || 'https://via.placeholder.com/400x250?text=No+Image'}" alt="${spot.name}">
        <div class="card-content">
            <h2>${spot.name}</h2>
            <p><b>Cost:</b> ₹${spot.cost}</p>
            <p><b>People Required:</b> ${spot.peopleRequired}</p>
            <p><b>Points to Visit:</b> ${spot.pointsToVisit.join(", ")}</p>
            <p><b>Transport:</b> ${spot.transportMode}</p>
            <p><b>Departure:</b> ${spot.departureDate}</p>
            <p><b>Arrival:</b> ${spot.arrivalDate}</p>
        </div>
    `;

    cardContainer.innerHTML = "";
    cardContainer.appendChild(card);
}

document.getElementById("yes-btn").addEventListener("click", () => {
    console.log(`Interested in: ${spots[currentIndex].name}`);
    currentIndex++;
    renderCard();
});

document.getElementById("no-btn").addEventListener("click", () => {
    console.log(`Not Interested in: ${spots[currentIndex].name}`);
    currentIndex++;
    renderCard();
});

loadSpots();

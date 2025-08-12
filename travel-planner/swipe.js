const container = document.getElementById('swipe-container');
let spots = [];
let currentIndex = 0;

// Redirect to login if not logged in
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        loadSpots();
    }
});

function loadSpots() {
    db.collection("spots").orderBy("departureDate").get().then(snapshot => {
        spots = snapshot.docs.map(doc => doc.data());
        if (spots.length > 0) {
            showSpot(currentIndex);
        }
    });
}

function showSpot(index) {
    container.innerHTML = ""; // Clear previous card
    if (index >= spots.length) {
        container.innerHTML = "<h3>No more trips!</h3>";
        return;
    }

    const spot = spots[index];
    const card = document.createElement("div");
    card.classList.add("trip-card");
    card.innerHTML = `
        <h3>${spot.name}</h3>
        <p><i class="fa-solid fa-indian-rupee-sign"></i> ${spot.cost}</p>
        <p><i class="fa-solid fa-users"></i> ${spot.peopleRequired} people</p>
        <p><i class="fa-solid fa-map-location-dot"></i> ${spot.pointsToVisit.join(", ")}</p>
        <p><i class="fa-solid fa-plane"></i> ${spot.transportMode}</p>
        <p>🗓 ${new Date(spot.departureDate.seconds * 1000).toLocaleString()}</p>
        <p>🏁 ${new Date(spot.arrivalDate.seconds * 1000).toLocaleString()}</p>
    `;
    container.appendChild(card);

    // Swipe gesture
    let startX = 0;
    card.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
    });

    card.addEventListener("touchend", e => {
        let endX = e.changedTouches[0].clientX;
        if (endX - startX > 100) {
            swipeRight();
        } else if (startX - endX > 100) {
            swipeLeft();
        }
    });
}

function swipeRight() {
    animateSwipe("right");
}

function swipeLeft() {
    animateSwipe("left");
}

function animateSwipe(direction) {
    const card = document.querySelector(".trip-card");
    card.style.transform = direction === "right" ? "translateX(200%) rotate(15deg)" : "translateX(-200%) rotate(-15deg)";
    card.style.opacity = "0";
    setTimeout(() => {
        currentIndex++;
        showSpot(currentIndex);
    }, 300);
}

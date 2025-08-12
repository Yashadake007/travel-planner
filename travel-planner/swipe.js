let spots = [];
let currentIndex = 0;
const container = document.getElementById("trip-container");

function loadSpots() {
    db.collection("spots").orderBy("departureDate").get().then(snapshot => {
        spots = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        if (spots.length > 0) {
            showSpot(currentIndex);
        }
    });
}

function showSpot(index) {
    container.innerHTML = "";
    if (index >= spots.length) {
        container.innerHTML = "<h3>No more trips!</h3>";
        return;
    }

    const spot = spots[index];
    const card = document.createElement("div");
    card.classList.add("trip-card");
    card.innerHTML = `
        <div class="trip-image" style="background-image:url('${spot.imageUrl}')"></div>
        <div class="trip-content">
            <h3>${spot.name}</h3>
            <p><i class="fas fa-rupee-sign"></i> ${spot.cost}</p>
            <p><i class="fas fa-users"></i> ${spot.peopleRequired} people</p>
            <p><i class="fas fa-map-marker-alt"></i> ${spot.pointsToVisit.join(", ")}</p>
            <p><i class="fas fa-bus"></i> ${spot.transportMode}</p>
            <p>🗓 ${new Date(spot.departureDate.seconds * 1000).toLocaleString()}</p>
            <p>🏁 ${new Date(spot.arrivalDate.seconds * 1000).toLocaleString()}</p>
        </div>
    `;
    container.appendChild(card);

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
    saveUserChoice("interestedUsers");
    animateSwipe("right");
}

function swipeLeft() {
    saveUserChoice("notInterestedUsers");
    animateSwipe("left");
}

function saveUserChoice(field) {
    const user = auth.currentUser;
    if (!user) return;
    const spotId = spots[currentIndex].id;
    db.collection("spots").doc(spotId).update({
        [field]: firebase.firestore.FieldValue.arrayUnion(user.email)
    });
}

function animateSwipe(direction) {
    const card = document.querySelector(".trip-card");
    if (!card) return;
    card.style.transform = direction === "right" ? "translateX(300px) rotate(15deg)" : "translateX(-300px) rotate(-15deg)";
    card.style.opacity = "0";
    setTimeout(() => {
        currentIndex++;
        showSpot(currentIndex);
    }, 300);
}

document.getElementById("yesBtn").addEventListener("click", swipeRight);
document.getElementById("noBtn").addEventListener("click", swipeLeft);

loadSpots();

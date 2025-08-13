const spots = [
    { name: "Beach Paradise", img: "beach.jpg" },
    { name: "Mountain View", img: "mountain.jpg" },
    { name: "City Lights", img: "city.jpg" }
];

let currentIndex = 0;
const container = document.querySelector(".container");
const interestedList = document.getElementById("interested-list");
const notInterestedList = document.getElementById("not-interested-list");

function loadCard(index) {
    if (index >= spots.length) {
        container.innerHTML = "<p>No more spots to show!</p>";
        return;
    }

    container.innerHTML = `
        <div class="card" draggable="true">
            <img src="${spots[index].img}" alt="${spots[index].name}">
            <h3>${spots[index].name}</h3>
        </div>
    `;

    const card = document.querySelector(".card");
    let startX = 0;

    card.addEventListener("dragstart", (e) => {
        startX = e.clientX;
    });

    card.addEventListener("dragend", (e) => {
        const endX = e.clientX;
        const diffX = endX - startX;

        if (diffX > 100) {
            addToList("interested");
        } else if (diffX < -100) {
            addToList("notInterested");
        }
    });
}

function addToList(type) {
    const spot = spots[currentIndex];

    if (type === "interested") {
        interestedList.innerHTML += `<p>${spot.name}</p>`;
        showAnimation("❤️");
    } else {
        notInterestedList.innerHTML += `<p>${spot.name}</p>`;
        showAnimation("💔");
    }

    const card = document.querySelector(".card");
    card.style.transform = type === "interested" ? "translateX(200%)" : "translateX(-200%)";
    card.style.opacity = 0;

    setTimeout(() => {
        currentIndex++;
        loadCard(currentIndex);
    }, 300);
}

function showAnimation(symbol) {
    const anim = document.createElement("div");
    anim.className = symbol === "❤️" ? "heart-animation" : "broken-heart-animation";
    anim.textContent = symbol;
    container.appendChild(anim);

    setTimeout(() => {
        anim.remove();
    }, 600);
}

// Buttons
document.getElementById("like-btn").addEventListener("click", () => addToList("interested"));
document.getElementById("dislike-btn").addEventListener("click", () => addToList("notInterested"));

// Load first card
loadCard(currentIndex);

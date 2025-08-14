// create.js
// Make sure firebaseConfig.js is loaded before this file

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("create-spot-form");
    const statusMsg = document.getElementById("status-msg");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("spot-name").value.trim();
        const location = document.getElementById("spot-location").value.trim();
        const description = document.getElementById("spot-description").value.trim();
        const imageUrl = document.getElementById("spot-image").value.trim();

        if (!name || !location || !description || !imageUrl) {
            statusMsg.textContent = "Please fill in all fields.";
            statusMsg.style.color = "red";
            return;
        }

        try {
            await db.collection("spots").add({
                name,
                location,
                description,
                imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            statusMsg.textContent = "Spot created successfully!";
            statusMsg.style.color = "green";
            form.reset();
        } catch (error) {
            console.error("Error adding spot:", error);
            statusMsg.textContent = "Error creating spot. Check console.";
            statusMsg.style.color = "red";
        }
    });
});

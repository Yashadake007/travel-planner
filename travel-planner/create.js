// js/create.js — add new travel spots to Firestore via TravelAPI

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#createSpotForm");
  const statusMsg = document.querySelector("#statusMsg");

  if (!form) {
    console.error("Create form not found!");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!window.currentUser) {
      alert("You must be logged in to create a spot.");
      return;
    }

    const name = form.querySelector("#spotName").value.trim();
    const description = form.querySelector("#spotDescription").value.trim();
    const imageUrl = form.querySelector("#spotImage").value.trim();

    if (!name) {
      alert("Spot name is required.");
      return;
    }

    statusMsg.textContent = "Saving spot...";
    statusMsg.className = "loading";

    try {
      const docRef = await firebase.firestore().collection("spots").add({
        name,
        description: description || "",
        imageUrl: imageUrl || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: window.currentUser.uid || null,
        interested: [],
        not_interested: [],
        skipped: []
      });

      statusMsg.textContent = "Spot created successfully!";
      statusMsg.className = "success";
      form.reset();
      console.log("New spot ID:", docRef.id);
    } catch (err) {
      console.error(err);
      statusMsg.textContent = "Error creating spot: " + err.message;
      statusMsg.className = "error";
    }
  });
});

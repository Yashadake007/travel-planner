// app.js  — compat bootstrap + shared helpers
(function () {
  // --- Guard: ensure compat SDKs are loaded ---
  if (typeof firebase === "undefined" ||
      !firebase.app && !firebase.initializeApp) {
    console.error(
      "[app.js] Firebase compat SDKs not found. " +
      "Make sure you loaded:\n" +
      "firebase-app-compat.js, firebase-auth-compat.js, firebase-firestore-compat.js"
    );
    return;
  }

  // --- Initialize Firebase once ---
  try {
    if (firebase.apps.length === 0) {
      firebase.initializeApp(window.firebaseConfig);
    }
  } catch (e) {
    console.warn("[app.js] initializeApp warning:", e);
  }

  // --- Globals for convenience (minimize changes in your other files) ---
  const auth = firebase.auth();
  const db   = firebase.firestore();
  window.auth = auth;
  window.db   = db;

  // current user mirror for easy access
  window.currentUser = null;
  auth.onAuthStateChanged(u => {
    window.currentUser = u || null;
    // You can optionally broadcast a custom event for pages to react to:
    document.dispatchEvent(new CustomEvent("auth:changed", { detail: { user: u || null } }));
  });

  // ---- TravelAPI: minimal helpers shared across pages ----
  const TravelAPI = {
    /**
     * Load spots ordered by createdAt desc, fallback to name
     * Returns [{id, ...data}]
     */
    async getSpots() {
      try {
        // Try createdAt first
        let snap;
        try {
          snap = await db.collection("spots").orderBy("createdAt", "desc").get();
        } catch (_) {
          snap = await db.collection("spots").orderBy("name").get();
        }
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error("[TravelAPI.getSpots] error:", e);
        return [];
      }
    },

    /**
     * Save a choice for the current user
     * choice = 'interested' | 'not_interested' | 'skipped'
     * Writes a new doc to userChoices
     */
    async saveChoice(spotId, choice) {
      const u = auth.currentUser;
      if (!u) throw new Error("Not authenticated");
      if (!spotId) throw new Error("Missing spotId");
      if (!["interested", "not_interested", "skipped"].includes(choice)) {
        throw new Error("Invalid choice");
      }
      const payload = {
        userId: u.uid,
        spotId,
        choice,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("userChoices").add(payload);
      return true;
    },

    /**
     * Load the current user's list for a given choice
     * Returns array of full spot docs (merged)
     */
    async getUserList(choice) {
      const u = auth.currentUser;
      if (!u) throw new Error("Not authenticated");

      // Get choice docs
      const q = await db.collection("userChoices")
        .where("userId", "==", u.uid)
        .where("choice", "==", choice)
        .orderBy("timestamp", "desc")
        .get();

      if (q.empty) return [];

      // Fetch referenced spots
      const spotGets = [];
      q.forEach(doc => {
        const { spotId } = doc.data() || {};
        if (spotId) spotGets.push(db.collection("spots").doc(spotId).get());
      });

      const spotSnaps = await Promise.all(spotGets);
      return spotSnaps
        .filter(s => s && s.exists)
        .map(s => ({ id: s.id, ...s.data() }));
    },

    /**
     * People who chose a given spot (for modal on the current card)
     * choice = 'interested' | 'not_interested' | 'skipped'
     */
    async getPeopleForSpot(spotId, choice) {
      if (!spotId) return [];
      const snap = await db.collection("userChoices")
        .where("spotId", "==", spotId)
        .where("choice", "==", choice)
        .orderBy("timestamp", "desc")
        .get();

      if (snap.empty) return [];
      const people = [];
      snap.forEach(d => {
        const x = d.data();
        people.push({
          userId: x.userId || "-",
          when: x.timestamp ? x.timestamp.toDate?.() : null
        });
      });
      return people;
    }
  };

  // expose
  window.TravelAPI = TravelAPI;

  // ---- Optional: tiny utility for formatted date ----
  window.formatWhen = function (dt) {
    if (!dt) return "";
    try { return dt.toLocaleString(); } catch { return ""; }
  };

  console.log("[app.js] Firebase initialized (compat).");
})();

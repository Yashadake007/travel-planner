// app.js — handles auth state, login, signup, logout UI updates

window.currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("#loginForm");
  const signupForm = document.querySelector("#signupForm");
  const logoutBtn = document.querySelector("#logoutBtn");
  const userInfo = document.querySelector("#userInfo");

  // Login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector("#loginEmail").value.trim();
      const password = loginForm.querySelector("#loginPassword").value.trim();

      try {
        await auth.signInWithEmailAndPassword(email, password);
        loginForm.reset();
      } catch (err) {
        alert("Login failed: " + err.message);
      }
    });
  }

  // Signup
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = signupForm.querySelector("#signupEmail").value.trim();
      const password = signupForm.querySelector("#signupPassword").value.trim();

      try {
        await auth.createUserWithEmailAndPassword(email, password);
        signupForm.reset();
      } catch (err) {
        alert("Signup failed: " + err.message);
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await auth.signOut();
      } catch (err) {
        console.error("Logout error:", err);
      }
    });
  }

  // Auth State Change
  auth.onAuthStateChanged((user) => {
    window.currentUser = user;
    if (user) {
      if (userInfo) userInfo.textContent = `Logged in as: ${user.email}`;
      toggleUI(true);
    } else {
      if (userInfo) userInfo.textContent = "";
      toggleUI(false);
    }
  });
});

// Show/hide UI sections based on auth state
function toggleUI(loggedIn) {
  const authSection = document.querySelector("#authSection");
  const appSection = document.querySelector("#appSection");

  if (authSection) authSection.style.display = loggedIn ? "none" : "block";
  if (appSection) appSection.style.display = loggedIn ? "block" : "none";
}

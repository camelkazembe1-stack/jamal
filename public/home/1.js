import { auth, authReady } from "../firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const logout = document.getElementById("logout");
const businessButton = document.getElementById("business-button");

(async () => {
  try {
    await authReady;
    await auth.authStateReady();

    onAuthStateChanged(auth, (user) => {
      if (logout) {
        logout.hidden = !user;
        logout.disabled = false;
      }

      if (!user) {
        // Do not redirect to index.html from inside the dashboard.
        // The parent login page handles the signed-out state.
        return;
      }
    });
  } catch (error) {
    console.error("Dashboard authentication error:", error);
    if (logout) logout.hidden = true;
  }
})();

if (logout) {
  logout.addEventListener("click", async () => {
    logout.disabled = true;

    try {
      await authReady;
      await signOut(auth);

      // The parent page observes sign-out and shows the login button.
      // Keep the browser at the website's root URL.
    } catch (error) {
      console.error("Sign-out failed:", error);
      logout.disabled = false;
    }
  });
}

if (businessButton) {
  businessButton.addEventListener("click", () => {
    window.location.href = "/business/3.html";
  });
}

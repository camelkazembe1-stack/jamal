import { auth, authReady } from "../firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const logoutButton = document.getElementById("logout");
const businessButton = document.getElementById("business-button");
const dashboardStatus = document.getElementById("dashboard-status");

function showStatus(message = "") {
  if (dashboardStatus) {
    dashboardStatus.textContent = message;
  }
}

async function initializeDashboard() {
  try {
    await authReady;
    await auth.authStateReady();

    onAuthStateChanged(auth, (user) => {
      if (logoutButton) {
        logoutButton.hidden = !user;
        logoutButton.disabled = false;
      }

      if (!user) {
        showStatus("Your session has ended. Please sign in again.");
        return;
      }

      showStatus("");
    });
  } catch (error) {
    console.error("Dashboard authentication initialization failed:", error);
    showStatus("Unable to check your login session. Please refresh and try again.");
  }
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    showStatus("");

    try {
      await authReady;
      await signOut(auth);
      // The parent application manages the signed-out state.
      // Keep the browser's top-level URL unchanged.
    } catch (error) {
      console.error("Sign-out failed:", error);
      showStatus("Sign-out failed. Please try again.");
      logoutButton.disabled = false;
    }
  });
}

if (businessButton) {
  businessButton.addEventListener("click", () => {
    showStatus("");
    window.location.href = "/business/3.html";
  });
}

initializeDashboard();

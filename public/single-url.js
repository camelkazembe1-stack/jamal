import { auth, googleProvider, authReady } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const loginButton = document.getElementById("google-login");
const application = document.getElementById("application");
const status = document.getElementById("status");

function showStatus(message = "") {
  if (status) status.textContent = message;
}

function showLogin() {
  if (application) {
    application.style.display = "none";
  }

  if (loginButton) {
    loginButton.hidden = false;
    loginButton.disabled = false;
  }

  showStatus("");
}

function showApplication(user) {
  if (!user) {
    showLogin();
    return;
  }

  if (loginButton) {
    loginButton.hidden = true;
    loginButton.disabled = false;
  }

  showStatus("");

  if (application) {
    application.style.display = "block";

    if (!application.getAttribute("src") ||
        !application.getAttribute("src").endsWith("/home/1.html")) {
      application.src = "/home/1.html";
    }
  }
}

if (loginButton) {
  loginButton.addEventListener("click", async () => {
    loginButton.disabled = true;
    showStatus("");

    try {
      await authReady;
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google sign-in failed:", error);
      showStatus(
        error.code
          ? `${error.code}: ${error.message}`
          : error.message || "Google sign-in failed."
      );
      loginButton.disabled = false;
    }
  });
}

(async () => {
  try {
    await authReady;

    onAuthStateChanged(auth, (user) => {
      showApplication(user);
    });
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    showLogin();
    showStatus("Unable to restore your login session. Please try again.");
  }
})();

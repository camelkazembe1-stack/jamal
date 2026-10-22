import { auth, googleProvider, authReady } from "./public/firebase.js";
import {
  onAuthStateChanged,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const loginButton = document.getElementById("google-login");
const application = document.getElementById("application");
const status = document.getElementById("status");

const PAGE_KEY = "jamali:current-application-page";
const DEFAULT_PAGE = "/home/1.html";

function showStatus(message = "") {
  if (status) status.textContent = message;
}

function getSavedPage() {
  try {
    const saved = sessionStorage.getItem(PAGE_KEY);

    if (
      saved &&
      saved.startsWith("/") &&
      !saved.startsWith("//") &&
      !saved.startsWith("/index.html") &&
      saved !== "/"
    ) {
      return saved;
    }
  } catch (error) {
    console.warn("Unable to restore the previous page:", error);
  }

  return DEFAULT_PAGE;
}

function saveCurrentPage() {
  if (!application) return;

  try {
    const current = application.contentWindow.location;
    const path = current.pathname + current.search + current.hash;

    if (
      path.startsWith("/") &&
      !path.startsWith("//") &&
      path !== "/" &&
      !path.startsWith("/index.html")
    ) {
      sessionStorage.setItem(PAGE_KEY, path);
    }
  } catch (error) {
    // Ignore pages that cannot be inspected because of browser security.
  }
}

function showLogin() {
  if (application) application.style.display = "none";

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

  if (loginButton) loginButton.hidden = true;

  showStatus("");

  if (application) {
    application.style.display = "block";

    const wantedPage = getSavedPage();

    if (application.getAttribute("src") !== wantedPage) {
      application.src = wantedPage;
    }
  }
}

if (application) {
  application.addEventListener("load", saveCurrentPage);
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
      showStatus(error.message || "Google sign-in failed.");
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
    console.error("Unable to initialize authentication:", error);
    showLogin();
    showStatus("Unable to restore your login session. Please try again.");
  }
})();

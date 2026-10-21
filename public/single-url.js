import {
  auth,
  authReady,
  googleProvider
} from "./firebase.js";

import {
  onAuthStateChanged,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const loginScreen = document.getElementById("login-screen");
const application = document.getElementById("application");
const loginButton = document.getElementById("google-login");
const status = document.getElementById("status");

let loadedApplication = false;

function showLogin(message = "") {
  loginScreen.style.display = "grid";
  application.style.display = "none";
  status.textContent = message;
}

function showApplication() {
  loginScreen.style.display = "none";
  application.style.display = "block";

  // The home page stays in its own folder and runs in an iframe.
  // The browser's top-level address remains https://jamali-lime.vercel.app/
  if (!loadedApplication) {
    application.src = "/home/1.html";
    loadedApplication = true;
  }
}

loginButton.addEventListener("click", async () => {
  loginButton.disabled = true;
  status.textContent = "Connecting to Google...";
  try {
    await authReady;
    await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged displays the application without changing the URL.
  } catch (error) {
    console.error("JAMALI Google sign-in failed:", error);
    status.textContent = error.message || "Google sign-in failed. Please try again.";
  } finally {
    loginButton.disabled = false;
  }
});

try {
  await authReady;
  onAuthStateChanged(auth, (user) => {
    if (user) {
      showApplication();
    } else {
      showLogin();
    }
  });
} catch (error) {
  console.error("JAMALI authentication initialization failed:", error);
  showLogin("Unable to initialize login. Please refresh and try again.");
}

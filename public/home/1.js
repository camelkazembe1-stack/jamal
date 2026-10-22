import { auth } from "../firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const email = document.getElementById("account-email");
const status = document.getElementById("home-status");
const businessButton = document.getElementById("business-button");
document.getElementById("year").textContent = new Date().getFullYear();

let authenticated = false;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    authenticated = false;
    window.location.replace("../index.html");
    return;
  }

  authenticated = true;
  email.textContent = user.email || "Google account signed in";
  email.hidden = false;
});

businessButton.addEventListener("click", () => {
  if (!authenticated) {
    window.location.replace("../index.html");
    return;
  }

  status.textContent =
    "The Business button is ready. The Business page has not been created yet.";
});

import { auth, authReady } from "./firebase.js";
    import {
      onAuthStateChanged,
      signOut
    } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

    const heading = document.getElementById("heading");
    const details = document.getElementById("details");
    const logout = document.getElementById("logout");

    try {
      await authReady;
      await auth.authStateReady();

      const user = auth.currentUser;

      if (!user) {
        heading.textContent = "Login session not found";
        details.textContent =
          "No active Google login was found in this browser. Please sign in again.";
        const link = document.createElement("a");
        link.href = "./index.html";
        link.textContent = "Return to login";
        details.appendChild(document.createElement("br"));
        details.appendChild(link);
      } else {
        heading.textContent = "You are successfully logged in!";
        details.textContent = "Welcome, " + (user.displayName || user.email || "user") +
          ". Your Google account is authenticated.";
        logout.hidden = false;
      }
    } catch (error) {
      heading.textContent = "Unable to verify login";
      details.textContent = error.code
        ? error.code + ": " + error.message
        : error.message;
      console.error("Home authentication check:", error);
    }

    logout.addEventListener("click", async () => {
      logout.disabled = true;
      try {
        await signOut(auth);
        window.location.replace("./index.html");
      } catch (error) {
        details.textContent = "Sign-out failed: " + error.message;
        logout.disabled = false;
      }
    });

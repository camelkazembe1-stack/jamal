// home page v1 — guarded by Firebase auth
import { requireAuth, auth, signOut } from "/firebase.js";

const user = await requireAuth(); // not logged in? → bounced to "/"

const nameEl  = document.getElementById("u-name");
const mailEl  = document.getElementById("u-email");
const picEl   = document.getElementById("u-pic");

nameEl.textContent = user.displayName || "Welcome";
mailEl.textContent = user.email || "";

if (user.photoURL) {
  picEl.src = user.photoURL;
} else {
  picEl.removeAttribute("src");
  picEl.alt = (user.displayName || "U").charAt(0).toUpperCase();
  picEl.style.background = "#38bdf8";
  picEl.style.display = "flex";
  picEl.style.alignItems = "center";
  picEl.style.justifyContent = "center";
  picEl.style.color = "#fff";
  picEl.style.fontWeight = "800";
  picEl.textContent = picEl.alt;
}

document.getElementById("logout").addEventListener("click", async () => {
  await signOut(auth);
  location.href = "/";
});

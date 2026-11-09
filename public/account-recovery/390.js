import { auth, provider, signInWithPopup, db, doc, getDoc, updateDoc } from "/firebase.js";

const SALT = "JAMALI::v1::";
const $ = (id) => document.getElementById(id);
function say(el, m, ok) { el.textContent = m || ""; el.className = "status" + (ok ? " ok" : ""); }
function sha(v) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(SALT + v))
    .then((b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join(""));
}

function friendly(err) {
  const code = err && err.code ? String(err.code) : "";
  if (code.indexOf("permission-denied") !== -1 || (err && err.message && String(err.message).indexOf("insufficient permissions") !== -1)) {
    return "the database rules are not published yet. Open the Firebase console -> Firestore Database -> Rules, replace everything there with the contents of the file firestore.rules from the project folder, press Publish, then try again.";
  }
  return (err && err.message) ? err.message : code;
}

// ---------- the three desks of the recovery chain ----------
const MODES = ["token", "password", "phone"];
function show(mode) {
  MODES.forEach((m) => {
    $("mode-" + m).classList.toggle("on", m === mode);
    $("tab-" + m).classList.toggle("on", m === mode);
  });
  try {
    const q = new URLSearchParams(location.search);
    q.set("mode", mode);
    history.replaceState({}, "", "/account-recovery/390?" + q.toString());
  } catch (e) {}
}

const carried = new URLSearchParams(location.search).get("u");
if (carried) {
  $("ft-username").value = carried;
  $("fp-username").value = carried;
  $("fph-username").value = carried;
}

const start = new URLSearchParams(location.search).get("mode");
show(MODES.indexOf(start) !== -1 ? start : "token");

 $("tab-token").addEventListener("click", () => show("token"));
 $("tab-password").addEventListener("click", () => show("password"));
 $("tab-phone").addEventListener("click", () => show("phone"));

 $("go-forgot-password").addEventListener("click", () => {
  const u = $("ft-username").value.trim();
  if (u) $("fp-username").value = u;
  show("password");
});

 $("go-forgot-phone").addEventListener("click", () => {
  const u = $("fp-username").value.trim();
  if (u) $("fph-username").value = u;
  show("phone");
});

// ---------- the token desk: the password proves it is you, a new token comes out ----------
 $("ft-btn").addEventListener("click", async () => {
  const btn = $("ft-btn");
  const status = $("status-token");
  const username = $("ft-username").value.trim();
  const password = $("ft-password").value;
  if (!username) { say(status, "Enter your username."); return; }
  if (!password) { say(status, "Enter your password."); return; }
  btn.disabled = true; say(status, "");

  try {
    if (!auth.currentUser) await signInWithPopup(auth, provider);

    const id = username.toLowerCase();
    const accSnap = await getDoc(doc(db, "systemAccounts", id));
    if (!accSnap.exists()) {
      const gone = await getDoc(doc(db, "systemDeleted", id));
      if (gone.exists() && gone.data().was === "approved") {
        say(status, "This account was disapproved by the administrator and deleted from the system. Please create a new account.");
      } else if (gone.exists()) {
        say(status, "This registration was deleted by the administrator before approval. Please create a new account.");
      } else {
        say(status, "No account with this username.");
      }
      btn.disabled = false; return;
    }

    const credRef = doc(db, "systemCredentials", id);
    const credSnap = await getDoc(credRef);
    if (!credSnap.exists()) { say(status, "Account data is incomplete. Ask the administrator."); btn.disabled = false; return; }

    const passHash = await sha(password);
    if (credSnap.data().passHash !== passHash) { say(status, "Wrong password."); btn.disabled = false; return; }

    const newToken = String(Math.floor(1000 + Math.random() * 9000));
    const newHash = await sha(newToken);
    await updateDoc(credRef, { tokenHash: newHash });

    $("token-value").textContent = newToken;

    $("ft-form").style.display = "none";
    $("token-box").style.display = "block";
    say(status, "");
    btn.disabled = false;
  } catch (err) {
    say(status, "Could not reset the token: " + friendly(err));
    btn.disabled = false;
  }
});

// ---------- the password desk: the phone number proves it is you, then a new password ----------
let verifiedId = null;

 $("fp-btn").addEventListener("click", async () => {
  const btn = $("fp-btn");
  const status = $("status-password");
  const username = $("fp-username").value.trim();
  const phone = $("fp-phone").value.trim();
  if (!username) { say(status, "Enter your username."); return; }
  if (!phone) { say(status, "Enter your phone number."); return; }
  btn.disabled = true; say(status, "");

  try {
    if (!auth.currentUser) await signInWithPopup(auth, provider);

    const id = username.toLowerCase();
    const accSnap = await getDoc(doc(db, "systemAccounts", id));
    if (!accSnap.exists()) {
      const gone = await getDoc(doc(db, "systemDeleted", id));
      if (gone.exists() && gone.data().was === "approved") {
        say(status, "This account was disapproved by the administrator and deleted from the system. Please create a new account.");
      } else if (gone.exists()) {
        say(status, "This registration was deleted by the administrator before approval. Please create a new account.");
      } else {
        say(status, "No account with this username.");
      }
      btn.disabled = false; return;
    }

    const credSnap = await getDoc(doc(db, "systemCredentials", id));
    if (!credSnap.exists()) { say(status, "Account data is incomplete. Ask the administrator."); btn.disabled = false; return; }
    if (credSnap.data().phone !== phone) { say(status, "That phone number does not match the account."); btn.disabled = false; return; }

    verifiedId = id;
    $("step-verify").classList.add("hidden");
    $("step-new").classList.remove("hidden");
    say(status, "Phone verified. Now choose a new password.", true);
    btn.disabled = false;
  } catch (err) {
    say(status, "Could not verify: " + friendly(err));
    btn.disabled = false;
  }
});

 $("fp-save").addEventListener("click", async () => {
  const btn = $("fp-save");
  const status = $("status-password");
  const p1 = $("fp-new1").value, p2 = $("fp-new2").value;
  if (!verifiedId) { say(status, "Verify your phone number first."); return; }
  if (p1.length < 6) { say(status, "Password must be at least 6 characters."); return; }
  if (p1 !== p2) { say(status, "The two passwords do not match."); return; }
  btn.disabled = true; say(status, "");

  try {
    const passHash = await sha(p1);
    await updateDoc(doc(db, "systemCredentials", verifiedId), { passHash: passHash });

    $("fp-next").style.display = "none";
    say(status, "Password saved. Go back and login with your username and token.", true);
    $("step-new").classList.add("hidden");
    btn.disabled = false;
  } catch (err) {
    say(status, "Could not save the password: " + friendly(err));
    btn.disabled = false;
  }
});

// ---------- the phone desk: the chain ends at the administrator's office ----------
 $("fph-btn").addEventListener("click", () => {
  $("fph-form").style.display = "none";
  $("message").style.display = "block";
});

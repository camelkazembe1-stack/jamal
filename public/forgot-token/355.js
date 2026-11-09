<<<<<<< Updated upstream:public/account-recovery/355.js
    import { auth, provider, signInWithPopup, db, doc, getDoc, updateDoc } from "/firebase.js";

    const SALT = "JAMALI::v1::";
    const $ = (id) => document.getElementById(id);
    const status = $("status");
    function say(m, ok) { status.textContent = m || ""; status.className = "status" + (ok ? " ok" : ""); }
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


    const carried = new URLSearchParams(location.search).get("u");
    if (carried) $("ft-username").value = carried;

    $("go-forgot-password").addEventListener("click", () => {
      const u = $("ft-username").value.trim();
      location.href = "/account-recovery/356" + (u ? "?u=" + encodeURIComponent(u) : "");
    });

    $("ft-btn").addEventListener("click", async () => {
      const btn = $("ft-btn");
      const username = $("ft-username").value.trim();
      const password = $("ft-password").value;
      if (!username) { say("Enter your username."); return; }
      if (!password) { say("Enter your password."); return; }
      btn.disabled = true; say("");

      try {
        if (!auth.currentUser) await signInWithPopup(auth, provider);

        const id = username.toLowerCase();
        const accSnap = await getDoc(doc(db, "systemAccounts", id));
        if (!accSnap.exists()) {
          const gone = await getDoc(doc(db, "systemDeleted", id));
          if (gone.exists() && gone.data().was === "approved") {
            say("This account was disapproved by the administrator and deleted from the system. Please create a new account.");
          } else if (gone.exists()) {
            say("This registration was deleted by the administrator before approval. Please create a new account.");
          } else {
            say("No account with this username.");
          }
          btn.disabled = false; return;
        }
        const acc = accSnap.data();

        const credRef = doc(db, "systemCredentials", id);
        const credSnap = await getDoc(credRef);
        if (!credSnap.exists()) { say("Account data is incomplete. Ask the administrator."); btn.disabled = false; return; }

        const passHash = await sha(password);
        if (credSnap.data().passHash !== passHash) { say("Wrong password."); btn.disabled = false; return; }

        const newToken = String(Math.floor(1000 + Math.random() * 9000));
        const newHash = await sha(newToken);
        await updateDoc(credRef, { tokenHash: newHash });

        $("token-value").textContent = newToken;


        $("ft-form").style.display = "none";
        $("token-box").style.display = "block";
        say("");
        btn.disabled = false;
      } catch (err) {
        say("Could not reset the token: " + friendly(err));
        btn.disabled = false;
      }
    });
  
=======
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Account Recovery — JAMALI</title>
<link rel="stylesheet" href="/account-recovery/390.css">
</head>
<body>
  <div class="card">
    <h1>Account <span>Recovery</span></h1>
    <p class="sub">One page for the whole recovery chain: a lost token, a lost password or a changed phone number.</p>

    <div class="tabs">
      <button type="button" id="tab-token" class="on">Forgot Token</button>
      <button type="button" id="tab-password">Forgot Password</button>
      <button type="button" id="tab-phone">Forgot Phone</button>
    </div>

    <section class="mode on" id="mode-token">
      <p class="sub">Prove it is you with your password, and a new four-digit token will be issued.</p>
      <div id="ft-form">
        <label for="ft-username">Username</label>
        <input id="ft-username" type="text" autocomplete="username" placeholder="Your username">
        <label for="ft-password">Password</label>
        <input id="ft-password" type="password" autocomplete="current-password" placeholder="Your password">
        <button class="wide" id="ft-btn" type="button">Submit</button>
        <p class="status" id="status-token"></p>
        <p class="next">Still stuck? <a id="go-forgot-password">Forgot Password?</a></p>
      </div>
      <div class="token-box" id="token-box">
        <p>Your new four-digit token — write it down now, it is shown only once:</p>
        <div class="tk" id="token-value">••••</div>
      </div>
    </section>

    <section class="mode" id="mode-password">
      <p class="sub">Prove it is you with your phone number, then set a new password.</p>
      <section id="step-verify">
        <label for="fp-username">Username</label>
        <input id="fp-username" type="text" autocomplete="username" placeholder="Your username">
        <label for="fp-phone">Phone number</label>
        <input id="fp-phone" type="tel" placeholder="The phone number on the account">
        <button class="wide" id="fp-btn" type="button">Submit</button>
      </section>
      <section id="step-new" class="hidden">
        <label for="fp-new1">New password</label>
        <input id="fp-new1" type="password" autocomplete="new-password" placeholder="At least 6 characters">
        <label for="fp-new2">Repeat the new password</label>
        <input id="fp-new2" type="password" autocomplete="new-password" placeholder="Same again">
        <button class="wide" id="fp-save" type="button">Save New Password</button>
      </section>
      <p class="status" id="status-password"></p>
      <p class="next" id="fp-next">Cannot remember the phone number? <a id="go-forgot-phone">Forgot Phone Number?</a></p>
    </section>

    <section class="mode" id="mode-phone">
      <p class="sub">The last step of the recovery chain.</p>
      <div id="fph-form">
        <label for="fph-username">Username</label>
        <input id="fph-username" type="text" autocomplete="username" placeholder="Your username">
        <button class="wide" id="fph-btn" type="button">Submit</button>
      </div>
      <div class="message" id="message">
        Please go to the system administrator's office.
      </div>
    </section>

    <a class="back" href="/">&larr; Back to Login</a>
  </div>

  <script type="module" src="/account-recovery/390.js"></script>
</body>
</html>
>>>>>>> Stashed changes:public/account-recovery/390.html

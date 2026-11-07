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
  

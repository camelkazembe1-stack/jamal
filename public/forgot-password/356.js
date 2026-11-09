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
    if (carried) $("fp-username").value = carried;

    $("go-forgot-phone").addEventListener("click", () => {
      const u = $("fp-username").value.trim();
      location.href = "/account-recovery/357" + (u ? "?u=" + encodeURIComponent(u) : "");
    });

    let verifiedId = null;

    $("fp-btn").addEventListener("click", async () => {
      const btn = $("fp-btn");
      const username = $("fp-username").value.trim();
      const phone = $("fp-phone").value.trim();
      if (!username) { say("Enter your username."); return; }
      if (!phone) { say("Enter your phone number."); return; }
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

        const credSnap = await getDoc(doc(db, "systemCredentials", id));
        if (!credSnap.exists()) { say("Account data is incomplete. Ask the administrator."); btn.disabled = false; return; }
        if (credSnap.data().phone !== phone) { say("That phone number does not match the account."); btn.disabled = false; return; }

        verifiedId = id;
        $("step-verify").classList.add("hidden");
        $("step-new").classList.remove("hidden");
        say("Phone verified. Now choose a new password.", true);
        btn.disabled = false;
      } catch (err) {
        say("Could not verify: " + friendly(err));
        btn.disabled = false;
      }
    });

    $("fp-save").addEventListener("click", async () => {
      const btn = $("fp-save");
      const p1 = $("fp-new1").value, p2 = $("fp-new2").value;
      if (!verifiedId) { say("Verify your phone number first."); return; }
      if (p1.length < 6) { say("Password must be at least 6 characters."); return; }
      if (p1 !== p2) { say("The two passwords do not match."); return; }
      btn.disabled = true; say("");

      try {
        const passHash = await sha(p1);
        await updateDoc(doc(db, "systemCredentials", verifiedId), { passHash: passHash });


        $("fp-next").style.display = "none";
        say("Password saved. Go back and login with your username and token.", true);
        $("step-new").classList.add("hidden");
        btn.disabled = false;
      } catch (err) {
        say("Could not save the password: " + friendly(err));
        btn.disabled = false;
      }
    });
  

// JAMALI — Account Administration (380) — T74 BUTTONS ACTIVE
// The table paints instantly and the Approve / Remove-approval buttons
// are ACTIVE from the first paint — no disabled state, no waiting.
// The update itself is guarded by the Firestore rules (only a real
// systemAdmin can change a status). T74 also fixes the T73 bug: the
// background admin check subscribed but never called verifyAdmin,
// which left the buttons stuck disabled.
let F = null;          // firebase module
let IS_ADMIN = false;  // true only for the real administrator (notes only)
let ROWS = [];
let PHONES = {};

boot();

async function boot() {
  try { F = await import("/firebase.js"); }
  catch (e) { showErr("Could not load the database module: " + txt(e)); return; }
  readAll();
  checkAdmin();
}

function txt(e) {
  return e && (e.code || e.message)
    ? (e.code || "") + " " + (e.message || "")
    : String(e);
}

function showErr(m) {
  const el = document.getElementById("err");
  if (el) { el.textContent = m; el.hidden = false; }
}

function note(m) {
  const el = document.getElementById("note");
  if (el) { el.textContent = m; el.hidden = !m; }
}

async function readAll() {
  try {
    const snap = await F.getDocs(F.collection(F.db, "systemAccounts"));
    ROWS = [];
    snap.forEach((d) => ROWS.push({ id: d.id, a: d.data() }));
    ROWS.sort((x, y) =>
      String(x.a.usernameDisplay || x.id).toLowerCase()
        .localeCompare(String(y.a.usernameDisplay || y.id).toLowerCase()));
    PHONES = {};
    paint(); // instant paint — phones fill in below, one by one
    for (const r of ROWS) {
      try {
        const cs = await F.getDoc(F.doc(F.db, "systemCredentials", r.id));
        PHONES[r.id] = cs.exists() ? (cs.data().phone || "") : "";
      } catch (e) { PHONES[r.id] = ""; }
      const cell = document.querySelector("[data-phone=\"" + r.id + "\"]");
      if (cell) cell.textContent = PHONES[r.id] || "—";
    }
  } catch (e) {
    showErr("Could not read the accounts: " + txt(e));
    const body = document.getElementById("rows");
    if (body) body.innerHTML = "<tr><td colspan=\"7\">Failed — see the message under the table.</td></tr>";
  }
}

function checkAdmin() {
  if (F.auth.currentUser) { verifyAdmin(F.auth.currentUser); return; }
  const t = setTimeout(() => { unsub(); verifyAdmin(F.auth.currentUser); }, 4000);
  const unsub = F.onAuthStateChanged(F.auth, (u) => {
    if (!u) return;              // keep waiting — timeout is the backstop
    clearTimeout(t);
    unsub();
    verifyAdmin(u);              // THE FIX: actually verify the admin
  });
}

async function verifyAdmin(u) {
  if (!u) { note("Not signed in — you can look, but the database will refuse changes."); return; }
  try {
    const adm = await F.getDoc(F.doc(F.db, "systemAdmins", u.uid));
    IS_ADMIN = adm.exists();
    note(IS_ADMIN ? "" : "This Google account is not the administrator — the database will refuse changes.");
  } catch (e) {
    note("Admin check failed: " + txt(e));
  }
}

function paint() {
  const body = document.getElementById("rows");
  if (!body) return;
  body.innerHTML = "";
  if (!ROWS.length) {
    body.innerHTML = "<tr><td colspan=\"7\">No registered accounts yet.</td></tr>";
    return;
  }
  for (const r of ROWS) {
    const a = r.a;
    const st = a.status || "pending";
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = a.usernameDisplay || a.username || r.id;
    tr.appendChild(tdName);

    const tdPos = document.createElement("td");
    tdPos.textContent = a.position || "";
    tr.appendChild(tdPos);

    const tdPhone = document.createElement("td");
    tdPhone.dataset.phone = r.id;
    tdPhone.textContent = "—";
    tr.appendChild(tdPhone);

    const tdMail = document.createElement("td");
    tdMail.textContent = a.googleEmail || "";
    tr.appendChild(tdMail);

    const tdAt = document.createElement("td");
    try { tdAt.textContent = a.at && a.at.toDate ? a.at.toDate().toLocaleString() : ""; }
    catch (e) { tdAt.textContent = ""; }
    tr.appendChild(tdAt);

    const tdSt = document.createElement("td");
    tdSt.textContent = st.charAt(0).toUpperCase() + st.slice(1);
    tdSt.className = "st-" + st;
    tr.appendChild(tdSt);

    const tdAct = document.createElement("td");
    const b = document.createElement("button");
    b.type = "button";
    if (st === "approved") {
      b.textContent = "Remove approval";
      b.className = "act";
      b.addEventListener("click", () => decide(r.id, "pending", b));
    } else {
      b.textContent = "Approve";
      b.className = "act approve";
      b.addEventListener("click", () => decide(r.id, "approved", b));
    }
    tdAct.appendChild(b);
    tr.appendChild(tdAct);

    body.appendChild(tr);
  }
}

async function decide(id, next, btn) {
  if (btn) btn.disabled = true;
  try {
    await F.updateDoc(F.doc(F.db, "systemAccounts", id), { status: next });
    readAll(); // re-read and repaint with the new status
  } catch (e) {
    const m = txt(e);
    showErr("Could not update " + id + ": " + m +
      (m.indexOf("permission-denied") >= 0
        ? " — the database allows this only for the administrator."
        : ""));
    if (btn) btn.disabled = false;
  }
}

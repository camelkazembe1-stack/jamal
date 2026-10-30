// JAMALI — Account Administration (380) — T72 TABLE BUILD
// One table: every registered account with the fields filled at
// registration (username, position, phone, Google email, registered
// date), its status, and ONE action button that follows the status:
//   pending / rejected -> "Approve"          (status -> approved)
//   approved           -> "Remove approval"  (status -> pending)
// The admin gate stays: valid admin session AND a systemAdmins
// document in the database, otherwise bounce to the start.
const SESSION_KEY = "JAMALI_SYSTEM_SESSION";
let F = null; // the firebase module, loaded once in boot()

let session = null;
try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
catch (e) { session = null; }
if (!session || session.role !== "admin") {
  location.replace("/?denied=" + encodeURIComponent("system-admin"));
} else {
  boot();
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

async function boot() {
  try {
    F = await import("/firebase.js");
    const u = F.auth.currentUser;
    if (!u) { location.replace("/?denied=" + encodeURIComponent("system-admin")); return; }
    const adm = await F.getDoc(F.doc(F.db, "systemAdmins", u.uid));
    if (!adm.exists()) { location.replace("/?denied=" + encodeURIComponent("system-admin")); return; }
  } catch (e) { showErr("Gate check failed: " + txt(e)); return; }

  try {
    const snap = await F.getDocs(F.collection(F.db, "systemAccounts"));
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, a: d.data() }));
    rows.sort((x, y) =>
      String(x.a.usernameDisplay || x.id).toLowerCase()
        .localeCompare(String(y.a.usernameDisplay || y.id).toLowerCase()));
    // phones live in systemCredentials under the same ids
    const phones = {};
    for (const r of rows) {
      try {
        const cs = await F.getDoc(F.doc(F.db, "systemCredentials", r.id));
        phones[r.id] = cs.exists() ? (cs.data().phone || "") : "";
      } catch (e) { phones[r.id] = ""; }
    }
    paint(rows, phones);
  } catch (e) {
    showErr("Could not read the accounts: " + txt(e));
    const body = document.getElementById("rows");
    if (body) body.innerHTML = "<tr><td colspan=\"7\">Failed — see the message under the table.</td></tr>";
  }
}

function paint(rows, phones) {
  const body = document.getElementById("rows");
  if (!body) return;
  body.innerHTML = "";
  if (!rows.length) {
    body.innerHTML = "<tr><td colspan=\"7\">No registered accounts yet.</td></tr>";
    return;
  }
  for (const r of rows) {
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
    tdPhone.textContent = phones[r.id] || "—";
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
    boot(); // re-read and repaint with the new status
  } catch (e) {
    showErr("Could not update " + id + ": " + txt(e));
    if (btn) btn.disabled = false;
  }
}

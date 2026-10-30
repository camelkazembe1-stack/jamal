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
    if (st === "approved" && a.role !== "admin") {
      const ms = document.createElement("button");
      ms.type = "button";
      ms.textContent = "Select Modules";
      ms.className = "act";
      ms.style.marginLeft = "6px";
      ms.addEventListener("click", () => openModsel(r.id, a.usernameDisplay || a.username || r.id));
      tdAct.appendChild(ms);
    }
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


// ============ T76 - PER-USER MODULE SELECTION ============
// One "Select Modules" button per approved non-admin row. Main
// modules (menu depth 1), their submodules (depth 2) and pages
// (depth 3). Ticking a module reveals its submodules; a granted
// child always carries its parents. Saved to systemAccounts.grants -
// the SAME array the sidebar, home and the page guards read.
let MODSEL_ID = "";

function menuTree() {
  const M = window.JAMALI_MENU || [];
  const tops = [];
  let c1 = null, c2 = null;
  for (const it of M) {
    if (it.folder === "home" || it.folder === "system-admin") continue;
    if (it.d === 1) { c1 = { folder: it.folder, label: it.label, icon: it.icon, n: it.n, kids: [] }; tops.push(c1); c2 = null; }
    else if (it.d === 2 && c1) { c2 = { folder: it.folder, label: it.label, icon: it.icon, n: it.n, kids: [] }; c1.kids.push(c2); }
    else if (it.d === 3 && c1) { (c2 ? c2.kids : c1.kids).push({ folder: it.folder, label: it.label, icon: it.icon, n: it.n }); }
  }
  return tops;
}

function parentsOf(tops) {
  const map = {};
  for (const t of tops) {
    map[t.folder] = [];
    for (const k of t.kids) {
      map[k.folder] = [t.folder];
      for (const g3 of k.kids) map[g3.folder] = [t.folder, k.folder];
    }
  }
  return map;
}

function mkCheck(labelText, folder, grants, indent) {
  const lab = document.createElement("label");
  lab.style.display = "flex";
  lab.style.alignItems = "center";
  lab.style.gap = "8px";
  lab.style.margin = indent ? "4px 0 4px " + indent + "px" : "6px 0";
  lab.style.fontWeight = indent ? "400" : "700";
  lab.style.cursor = "pointer";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.dataset.folder = folder;
  cb.checked = grants.indexOf(folder) !== -1;
  const sp = document.createElement("span");
  sp.textContent = labelText;
  lab.appendChild(cb); lab.appendChild(sp);
  return lab;
}

async function openModsel(id, name) {
  MODSEL_ID = id;
  document.getElementById("modsel-who").textContent = name;
  const panel = document.getElementById("modsel");
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
  let grants = [];
  try {
    const s = await F.getDoc(F.doc(F.db, "systemAccounts", id));
    if (s.exists()) {
      const g = s.data().grants;
      if (Array.isArray(g)) grants = g.slice();
    }
  } catch (e) { showErr("Could not read the grants: " + txt(e)); }
  renderModsel(grants);
}

function renderModsel(grants) {
  const body = document.getElementById("modsel-body");
  body.innerHTML = "";
  const tops = menuTree();
  for (const t of tops) {
    const box = document.createElement("div");
    box.style.border = "1px solid #e2e8f0";
    box.style.borderRadius = "10px";
    box.style.padding = "8px 12px";
    box.style.margin = "8px 0";
    const mainLab = mkCheck((t.icon || "") + " " + t.label, t.folder, grants, 0);
    const mainCb = mainLab.querySelector("input");
    const kidBox = document.createElement("div");
    kidBox.style.display = "none";
    const reveals = [];
    for (const k of t.kids) {
      const kLab = mkCheck((k.icon || "") + " " + k.label, k.folder, grants, 22);
      const kCb = kLab.querySelector("input");
      kidBox.appendChild(kLab);
      if (k.kids.length) {
        const g3Box = document.createElement("div");
        g3Box.style.display = "none";
        for (const g3 of k.kids) g3Box.appendChild(mkCheck(g3.label, g3.folder, grants, 44));
        kidBox.appendChild(g3Box);
        kCb.addEventListener("change", () => { g3Box.style.display = kCb.checked ? "block" : "none"; });
        reveals.push([kCb, g3Box]);
      }
    }
    mainCb.addEventListener("change", () => { kidBox.style.display = mainCb.checked ? "block" : "none"; });
    box.appendChild(mainLab);
    box.appendChild(kidBox);
    body.appendChild(box);
    if (mainCb.checked) kidBox.style.display = "block";
    for (const r of reveals) if (r[0].checked) r[1].style.display = "block";
  }
  if (!tops.length) body.textContent = "The menu tree is empty.";
}

async function saveModsel() {
  if (!MODSEL_ID) return;
  const btn = document.getElementById("modsel-save");
  btn.disabled = true;
  try {
    const par = parentsOf(menuTree());
    const set = {};
    document.querySelectorAll("#modsel-body input[type=checkbox]:checked").forEach((cb) => {
      set[cb.dataset.folder] = true;
      (par[cb.dataset.folder] || []).forEach((x) => { set[x] = true; });
    });
    await F.updateDoc(F.doc(F.db, "systemAccounts", MODSEL_ID), { grants: Object.keys(set) });
    const ok = document.getElementById("modsel-ok");
    ok.hidden = false;
    setTimeout(() => { ok.hidden = true; }, 2200);
  } catch (e) {
    showErr("Could not save the modules: " + txt(e));
  }
  btn.disabled = false;
}

document.getElementById("modsel-all").addEventListener("click", () => {
  document.querySelectorAll("#modsel-body input[type=checkbox]").forEach((cb) => {
    cb.checked = true;
    cb.dispatchEvent(new Event("change"));
  });
});
document.getElementById("modsel-save").addEventListener("click", saveModsel);
document.getElementById("modsel-close").addEventListener("click", () => {
  document.getElementById("modsel").hidden = true;
});

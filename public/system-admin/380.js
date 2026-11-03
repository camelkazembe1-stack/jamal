






let F = null;          
let IS_ADMIN = false;  
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
    paint(); 
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
    if (!u) return;              
    clearTimeout(t);
    unsub();
    verifyAdmin(u);              
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
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.className = "act";
    del.style.marginLeft = "6px";
    del.style.background = "#dc2626";
    del.style.color = "#ffffff";
    del.style.borderColor = "#dc2626";
    del.addEventListener("click", () => delAccount(r.id, a, del));
    tdAct.appendChild(del);
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

async function delAccount(id, a, btn) {
  const name = a.usernameDisplay || a.username || id;
  if (!window.confirm("Delete " + name + " from the system? The account disappears from this page and can never log in again.")) return;
  if (btn) btn.disabled = true;
  try {
    const batch = F.writeBatch(F.db);
    batch.delete(F.doc(F.db, "systemAccounts", id));
    batch.delete(F.doc(F.db, "systemCredentials", id));
    batch.delete(F.doc(F.db, "systemNotifications", id));
    batch.set(F.doc(F.db, "systemDeleted", id), {
      username: name,
      usernameLower: id,
      googleEmail: a.googleEmail || "",
      was: a.status || "pending",
      at: F.serverTimestamp()
    });
    await batch.commit();
    note(name + " was deleted from the system. If they try to log in, they will be told to create a new account.");
    readAll();
  } catch (e) {
    const m = txt(e);
    showErr("Could not delete " + id + ": " + m +
      (m.indexOf("permission-denied") >= 0
        ? " — the database allows this only for the administrator."
        : ""));
    if (btn) btn.disabled = false;
  }
}

async function decide(id, next, btn) {
  if (btn) btn.disabled = true;
  try {
    await F.updateDoc(F.doc(F.db, "systemAccounts", id), { status: next });
    readAll(); 
  } catch (e) {
    const m = txt(e);
    showErr("Could not update " + id + ": " + m +
      (m.indexOf("permission-denied") >= 0
        ? " — the database allows this only for the administrator."
        : ""));
    if (btn) btn.disabled = false;
  }
}








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
    const kids = [];
    for (const k of t.kids) {
      const kLab = mkCheck((k.icon || "") + " " + k.label, k.folder, grants, 22);
      const kCb = kLab.querySelector("input");
      kidBox.appendChild(kLab);
      const g3s = [];
      let g3Box = null;
      if (k.kids.length) {
        g3Box = document.createElement("div");
        g3Box.style.display = "none";
        for (const g3 of k.kids) {
          const g3Lab = mkCheck(g3.label, g3.folder, grants, 44);
          const g3Cb = g3Lab.querySelector("input");
          g3Box.appendChild(g3Lab);
          g3s.push(g3Cb);
          g3Cb.addEventListener("change", () => {
            if (!g3Cb.checked) return;
            if (!kCb.checked) kCb.checked = true;
            if (!mainCb.checked) mainCb.checked = true;
            g3Box.style.display = "block";
            kidBox.style.display = "block";
          });
        }
        kidBox.appendChild(g3Box);
      }
      kCb.addEventListener("change", () => {
        if (g3Box) g3Box.style.display = kCb.checked ? "block" : "none";
        if (kCb.checked && !mainCb.checked) {
          mainCb.checked = true;
          kidBox.style.display = "block";
        }
      });
      kids.push([kCb, g3s]);
    }
    mainCb.addEventListener("change", () => {
      kidBox.style.display = mainCb.checked ? "block" : "none";
      for (const kk of kids) {
        const kCb = kk[0];
        if (kCb.checked !== mainCb.checked) {
          kCb.checked = mainCb.checked;
          kCb.dispatchEvent(new Event("change"));
        }
        for (const g3 of kk[1]) {
          if (g3.checked !== mainCb.checked) {
            g3.checked = mainCb.checked;
            g3.dispatchEvent(new Event("change"));
          }
        }
      }
    });
    box.appendChild(mainLab);
    box.appendChild(kidBox);
    body.appendChild(box);
    if (mainCb.checked) kidBox.style.display = "block";
    for (const k of t.kids) {
      const kCb = kidBox.querySelector("input[data-folder='" + k.folder + "']");
      if (!kCb || !kCb.checked) continue;
      const wrap = kCb.closest("label");
      if (wrap && wrap.nextElementSibling && wrap.nextElementSibling.tagName === "DIV") {
        wrap.nextElementSibling.style.display = "block";
      }
    }
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
document.getElementById("modsel-none").addEventListener("click", () => {
  document.querySelectorAll("#modsel-body input[type=checkbox]").forEach((cb) => {
    if (!cb.checked) return;
    cb.checked = false;
    cb.dispatchEvent(new Event("change"));
  });
});
document.getElementById("modsel-save").addEventListener("click", saveModsel);
document.getElementById("modsel-close").addEventListener("click", () => {
  document.getElementById("modsel").hidden = true;
});

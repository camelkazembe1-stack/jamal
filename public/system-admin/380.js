






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

/* ==================== Data Deletion Requests ====================
   Organisation users submit deletion requests from Settings >
   Show Delete Data; they land in systemDeletionRequests. This
   section lists every request live for the administrator:
     - Approve: a final confirmation shows exactly which data will be
       deleted (fresh live counts). Approving claims the request in a
       transaction (only one administrator can take it, and never the
       requester themself), executes the permanent deletion from here -
       retention archive first, then the documents - records the
       approving administrator with the date and time, marks the request
       COMPLETED (or FAILED if nothing could be deleted), and notifies
       the requesting user.
     - Reject: a reason is required, no data is touched, the request is
       recorded as REJECTED and the user is notified with the reason.
   Pending / Approved / Rejected / Completed / Failed tabs, plus the
   per-collection execution results on every decided request. The
   database rules carry the real authority: reads and decisions are
   refused server-side for anyone who is not the administrator. */
/* DEL-ADMIN-MODULE-START */
let DELFB = null;
let DEL_REQS = [];
let DEL_TAB = "pending";
let DEL_UNSUB = null;
let DEL_BUSY = false;

const DEL_TABS = [
  ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"],
  ["completed", "Completed"], ["failed", "Failed"]
];

const DEL_SCOPE_LIB = {
  business: { key: "business", label: "Business & accounting", collections: ["transactions"] },
  stock: { key: "stock", label: "Stock management", collections: ["stockItems", "stockChanges"] },
  health: { key: "health", label: "Hospital & health records", collections: [
    "healthRegistrations", "healthTriage", "healthNurseConsultations",
    "healthDoctorConsultations", "healthPrescriptions", "healthTreatmentOrders",
    "healthDestinations", "healthWards", "healthBeds", "healthBedAssignments",
    "healthBedTransfers", "healthBedMaintenance", "healthAdmissions",
    "healthDischarges", "healthLabRequests", "healthImagingRequests",
    "healthQueueConfig"
  ] }
};

delStart();

function delTxt(e) {
  return e && (e.code || e.message) ? (e.code || "") + " " + (e.message || "") : String(e);
}

function delTs(t) {
  try { return t && t.toDate ? t.toDate().getTime() : 0; } catch (e) { return 0; }
}

function delWhen(t) {
  const ms = delTs(t);
  return ms ? new Date(ms).toLocaleString() : "—";
}

function delHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function delSession() {
  try { return JSON.parse(sessionStorage.getItem("JAMALI_SYSTEM_SESSION") || "null"); }
  catch (e) { return null; }
}

function delColsOf(r) {
  const out = [];
  const scopes = Array.isArray(r && r.scopes) ? r.scopes : [];
  for (const k of scopes) {
    const s = DEL_SCOPE_LIB[k];
    if (!s) continue;
    for (const c of s.collections) if (out.indexOf(c) === -1) out.push(c);
  }
  return out;
}

function delFinalStatus(td, tf) {
  // everything deleted -> completed; nothing deleted -> failed;
  // partially deleted -> completed with the failures recorded
  return tf === 0 || td > 0 ? "completed" : "failed";
}

function delStart() {
  const sec = document.getElementById("delreq");
  if (!sec || DEL_UNSUB) return;
  import("/firebase.js").then((fb) => {
    DELFB = fb;
    sec.hidden = false;
    delPaintTabs();
    delPaint();
    DEL_UNSUB = fb.onSnapshot(fb.collection(fb.db, "systemDeletionRequests"), (snap) => {
      DEL_REQS = [];
      snap.forEach((d) => DEL_REQS.push({ id: d.id, r: d.data() }));
      DEL_REQS.sort((x, y) => delTs(y.r.createdAt) - delTs(x.r.createdAt));
      delPaintTabs();
      delPaint();
      delPendingNote();
    }, (e) => {
      const rows = document.getElementById("delreq-rows");
      if (!rows) return;
      const m = delTxt(e);
      rows.innerHTML = "<tr><td colspan=\"8\">The database refused reading the requests: " + delHtml(m) +
        (m.indexOf("permission-denied") !== -1
          ? " - reading deletion requests is allowed only for the administrator (systemAdmins)."
          : "") + "</td></tr>";
    });
  }).catch((e) => {
    const rows = document.getElementById("delreq-rows");
    if (rows) rows.innerHTML = "<tr><td colspan=\"8\">Could not load the database module: " + delHtml(delTxt(e)) + "</td></tr>";
  });
}

function delPendingNote() {
  const el = document.getElementById("delreq-note");
  if (!el) return;
  const n = DEL_REQS.filter((x) => x.r.status === "pending").length;
  el.hidden = n === 0;
  el.textContent = n
    ? (n + " pending deletion request" + (n > 1 ? "s" : "") +
       " waiting for review - approving one executes the permanent deletion immediately.")
    : "";
}

function delPaintTabs() {
  const host = document.getElementById("delreq-tabs");
  if (!host) return;
  host.innerHTML = "";
  for (const t of DEL_TABS) {
    const n = DEL_REQS.filter((x) => x.r.status === t[0]).length;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tab" + (DEL_TAB === t[0] ? " on" : "");
    b.innerHTML = delHtml(t[1]) + " <span class=\"n\">" + n + "</span>";
    b.addEventListener("click", () => { DEL_TAB = t[0]; delPaintTabs(); delPaint(); });
    host.appendChild(b);
  }
}

function delPaint() {
  const body = document.getElementById("delreq-rows");
  if (!body) return;
  const rows = DEL_REQS.filter((x) => x.r.status === DEL_TAB);
  body.innerHTML = "";
  if (!rows.length) {
    body.innerHTML = "<tr><td colspan=\"8\">No " + delHtml(DEL_TAB) + " requests.</td></tr>";
    return;
  }
  for (const row of rows) body.appendChild(delRow(row));
}

function delScopeHtml(r) {
  const det = Array.isArray(r.scopeDetails) ? r.scopeDetails : [];
  if (!det.length) {
    return delHtml((Array.isArray(r.scopes) ? r.scopes : []).join(", "));
  }
  return det.map((s) =>
    "<b>" + delHtml(s.label || s.key) + "</b>" +
    "<i style=\"display:block;color:#64748b;font-size:11.5px\">" +
    delHtml((s.collections || []).join(", ")) +
    (typeof s.docsAtRequest === "number" ? " - " + s.docsAtRequest + " docs at request" : "") +
    "</i>").join("");
}

function delRow(row) {
  const r = row.r;
  const tr = document.createElement("tr");

  const tdAt = document.createElement("td");
  tdAt.textContent = delWhen(r.createdAt);
  tr.appendChild(tdAt);

  const tdUser = document.createElement("td");
  tdUser.textContent = r.requesterUsername || "—";
  tr.appendChild(tdUser);

  const tdPos = document.createElement("td");
  tdPos.textContent = r.requesterPosition || "—";
  tr.appendChild(tdPos);

  const tdMail = document.createElement("td");
  tdMail.textContent = r.requesterEmail || "—";
  tr.appendChild(tdMail);

  const tdScope = document.createElement("td");
  tdScope.innerHTML = delScopeHtml(r);
  tr.appendChild(tdScope);

  const tdWhy = document.createElement("td");
  tdWhy.textContent = r.reason || "";
  tdWhy.style.cssText = "max-width:260px;white-space:normal;";
  tr.appendChild(tdWhy);

  const tdSt = document.createElement("td");
  tdSt.textContent = String(r.status || "pending").toUpperCase();
  tdSt.className = "st-" + (r.status || "pending");
  tr.appendChild(tdSt);

  const tdAct = document.createElement("td");
  tdAct.style.cssText = "max-width:280px;white-space:normal;";
  if (r.status === "pending") {
    const ap = document.createElement("button");
    ap.type = "button";
    ap.className = "act approve";
    ap.textContent = "Approve";
    ap.addEventListener("click", () => delApprove(row, ap));
    tdAct.appendChild(ap);
    const rj = document.createElement("button");
    rj.type = "button";
    rj.className = "act";
    rj.style.cssText = "margin-left:6px;background:#dc2626;color:#ffffff;border-color:#dc2626;";
    rj.textContent = "Reject";
    rj.addEventListener("click", () => delReject(row, rj));
    tdAct.appendChild(rj);
  } else if (r.decision) {
    const d = r.decision;
    const who = document.createElement("div");
    who.style.cssText = "color:#475569;font-size:12.5px;";
    who.innerHTML = "by " + delHtml(d.adminUsername || d.adminEmail || "—") +
      "<br>" + delHtml(delWhen(d.at)) +
      (d.outcome === "rejected" && d.reason ? "<br>Reason: " + delHtml(d.reason) : "");
    tdAct.appendChild(who);
  }
  if (r.execution) {
    const ex = r.execution;
    const line = document.createElement("div");
    line.style.cssText = "font-size:12px;color:#475569;margin-top:4px;";
    const parts = Array.isArray(ex.results)
      ? ex.results.map((x) => x.collection + " " + x.deleted + "/" + x.found).join(", ")
      : "";
    line.textContent = "Deleted " + (ex.totalDeleted || 0) + ", failed " + (ex.totalFailed || 0) +
      (parts ? " — " + parts : "") +
      (ex.error ? " — " + ex.error : "");
    tdAct.appendChild(line);
  }
  if (r.status === "approved" || r.status === "failed") {
    const rs = document.createElement("button");
    rs.type = "button";
    rs.className = "act";
    rs.style.cssText = "margin-top:6px;";
    rs.textContent = "Resume execution";
    rs.addEventListener("click", () => delResume(row, rs));
    tdAct.appendChild(rs);
  }
  tr.appendChild(tdAct);
  return tr;
}

async function delApprove(row, btn) {
  if (DEL_BUSY) return;
  if (!IS_ADMIN) {
    showErr("Only the administrator (systemAdmins) can decide deletion requests - the database will refuse it.");
    return;
  }
  const me = DELFB && DELFB.auth && DELFB.auth.currentUser;
  if (me && row.r.requesterUid === me.uid) {
    showErr("You cannot approve your own deletion request.");
    return;
  }
  DEL_BUSY = true;
  btn.disabled = true;
  try {
    // exactly which data will be deleted: fresh live counts, right now
    const cols = delColsOf(row.r);
    if (!cols.length) throw new Error("This request carries no data groups.");
    const counted = [];
    let total = 0;
    for (const c of cols) {
      const snap = await DELFB.getDocs(DELFB.collection(DELFB.db, c));
      counted.push(c + ": " + snap.size + " document" + (snap.size === 1 ? "" : "s"));
      total += snap.size;
    }
    const summary = "FINAL CONFIRMATION\n\n" +
      "Request by " + (row.r.requesterUsername || row.r.requesterEmail || "user") +
      "\nReason: " + (row.r.reason || "") +
      "\n\nThis will PERMANENTLY DELETE " + total + " document" + (total === 1 ? "" : "s") + ":" +
      "\n  " + counted.join("\n  ") +
      "\n\nA retention copy is archived into the deletion audit first, then every document is removed. " +
      "The requesting user is notified afterwards, and the decision records you as the administrator " +
      "with the date and time.\n\nApprove and execute now?";
    if (!window.confirm(summary)) return;

    // claim the request: one administrator takes it from pending, and
    // the transaction refuses anything that is not still pending
    const ref = DELFB.doc(DELFB.db, "systemDeletionRequests", row.id);
    const ses = delSession();
    await DELFB.runTransaction(DELFB.db, async (txn) => {
      const s = await txn.get(ref);
      if (!s.exists()) throw new Error("The request no longer exists.");
      const d = s.data();
      if (d.status !== "pending") {
        throw new Error("This request was already handled - its status is now '" + d.status + "'.");
      }
      txn.update(ref, {
        status: "approved",
        decision: {
          outcome: "approved",
          reason: "",
          adminUid: me.uid,
          adminEmail: String(me.email || "").toLowerCase(),
          adminUsername: (ses && ses.username) || "",
          at: DELFB.serverTimestamp()
        },
        decidedAt: DELFB.serverTimestamp()
      });
    });

    // archive, then delete; the result, the notification and the error
    // handling are shared with delResume below
    await delRunExecution(row, btn);
  } catch (e) {
    showErr("Could not approve the request: " + delTxt(e));
  } finally {
    DEL_BUSY = false;
    if (btn) btn.disabled = false;
  }
}

// Shared tail of every approval: execute the permanent deletion, record
// the result on the request and notify the requesting user.
async function delRunExecution(row, btn) {
  DEL_BUSY = true;
  if (btn) btn.disabled = true;
  const ref = DELFB.doc(DELFB.db, "systemDeletionRequests", row.id);
  try {
    const cols = delColsOf(row.r);
    if (!cols.length) throw new Error("This request carries no data groups.");
    let fin;
    try {
      fin = await delExecute(row, cols);
    } catch (exErr) {
      await DELFB.updateDoc(ref, {
        status: "failed",
        execution: { results: [], totalDeleted: 0, totalFailed: 0, error: delTxt(exErr), at: DELFB.serverTimestamp() },
        executedAt: DELFB.serverTimestamp()
      }).catch(() => {});
      await delNotify(row, "failed",
        "Your data deletion request was approved but the deletion FAILED - your data was not deleted. " +
        "The administrator can see the error in Data Deletion Requests, and can resume the execution once it is fixed.");
      showErr("The deletion failed: " + delTxt(exErr) +
        " The request is recorded as FAILED; no data was removed and the user was notified.");
      return;
    }

    // record the completed execution
    await DELFB.updateDoc(ref, {
      status: delFinalStatus(fin.totalDeleted, fin.totalFailed),
      execution: {
        results: fin.results,
        totalDeleted: fin.totalDeleted,
        totalFailed: fin.totalFailed,
        at: DELFB.serverTimestamp()
      },
      executedAt: DELFB.serverTimestamp()
    });

    // tell the requesting user
    await delNotify(row, "approved",
      "Your data deletion request was approved and executed" +
      (fin.totalFailed ? " with failures" : "") + ": " + fin.totalDeleted +
      " document" + (fin.totalDeleted === 1 ? "" : "s") + " permanently deleted" +
      (fin.totalFailed ? (", " + fin.totalFailed + " failed") : "") + ".");

    note("Deletion executed: " + fin.totalDeleted + " deleted, " + fin.totalFailed +
      " failed. The decision is recorded and the user has been notified.");
  } catch (e) {
    showErr("Could not execute the deletion: " + delTxt(e));
  } finally {
    DEL_BUSY = false;
    if (btn) btn.disabled = false;
  }
}

// Resume an execution that was approved but interrupted (the browser
// closed mid-run) or that failed earlier: nothing is claimed again, the
// same archive-first execution runs, and the result is recorded.
async function delResume(row, btn) {
  if (DEL_BUSY) return;
  if (!IS_ADMIN) {
    showErr("Only the administrator (systemAdmins) can execute deletion requests - the database will refuse it.");
    return;
  }
  const me = DELFB && DELFB.auth && DELFB.auth.currentUser;
  if (me && row.r.requesterUid === me.uid) {
    showErr("You cannot execute your own deletion request.");
    return;
  }
  if (!window.confirm(
    "RESUME DELETION\n\nThe request by " + (row.r.requesterUsername || row.r.requesterEmail || "user") +
    " is " + String(row.r.status || "approved").toUpperCase() + ".\n\n" +
    "The retention archive is written first, then the remaining documents are permanently " +
    "deleted, and the requesting user is notified of the result.\n\nContinue?")) return;
  await delRunExecution(row, btn);
}

async function delReject(row, btn) {
  if (!IS_ADMIN) {
    showErr("Only the administrator (systemAdmins) can decide deletion requests.");
    return;
  }
  const me = DELFB && DELFB.auth && DELFB.auth.currentUser;
  if (me && row.r.requesterUid === me.uid) {
    showErr("You cannot decide your own deletion request.");
    return;
  }
  const reason = window.prompt("Rejection reason (required - the requesting user will read it):", "");
  if (reason === null) return;
  if (!String(reason).trim()) {
    showErr("A rejection reason is required - the user must know why the request was refused.");
    return;
  }
  btn.disabled = true;
  try {
    const ref = DELFB.doc(DELFB.db, "systemDeletionRequests", row.id);
    const ses = delSession();
    await DELFB.runTransaction(DELFB.db, async (txn) => {
      const s = await txn.get(ref);
      if (!s.exists()) throw new Error("The request no longer exists.");
      const d = s.data();
      if (d.status !== "pending") {
        throw new Error("This request was already handled - its status is now '" + d.status + "'.");
      }
      txn.update(ref, {
        status: "rejected",
        decision: {
          outcome: "rejected",
          reason: String(reason).trim(),
          adminUid: me.uid,
          adminEmail: String(me.email || "").toLowerCase(),
          adminUsername: (ses && ses.username) || "",
          at: DELFB.serverTimestamp()
        },
        decidedAt: DELFB.serverTimestamp()
      });
    });
    await delNotify(row, "rejected",
      "Your data deletion request was REJECTED. Nothing was deleted. Reason from the administrator: " +
      String(reason).trim());
    note("Request rejected - no data was touched and the user has been notified.");
  } catch (e) {
    showErr("Could not reject the request: " + delTxt(e));
  }
  btn.disabled = false;
}

// The permanent-deletion executor for approved requests. Fixed order:
// read everything, write the retention archive BEFORE removing anything,
// then delete in batches. If any read or the archive write fails, an
// error is thrown and nothing has been deleted.
async function delExecute(row, cols) {
  const groups = [];
  for (const c of cols) {
    const snap = await DELFB.getDocs(DELFB.collection(DELFB.db, c));
    const docs = [];
    snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));
    groups.push({ collection: c, docs: docs });
  }
  const CAP = 150;
  const archive = {};
  for (const g of groups) {
    archive[g.collection] = {
      count: g.docs.length,
      truncated: g.docs.length > CAP,
      docs: g.docs.slice(0, CAP).map((x) => ({ id: x.id, data: x.data }))
    };
  }
  const me = DELFB.auth.currentUser;
  const ses = delSession();
  const auditId = "da-" + String(row.id).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 20) + "-" + Date.now().toString(36);
  await DELFB.setDoc(DELFB.doc(DELFB.db, "systemDeletionAudit", auditId), {
    kind: "approved",
    requestId: row.id,
    actorUid: me.uid,
    actorEmail: String(me.email || "").toLowerCase(),
    actorLabel: (ses && ses.username) || "administrator",
    requesterUid: row.r.requesterUid || "",
    requesterUsername: row.r.requesterUsername || "",
    scopes: Array.isArray(row.r.scopes) ? row.r.scopes : [],
    collections: cols,
    archive: archive,
    results: [],
    status: "executing",
    at: DELFB.serverTimestamp()
  });
  const results = [];
  for (const g of groups) {
    let deleted = 0, failed = 0, error = "";
    for (let start = 0; start < g.docs.length; start += 400) {
      const slice = g.docs.slice(start, start + 400);
      const batch = DELFB.writeBatch(DELFB.db);
      slice.forEach((x) => batch.delete(DELFB.doc(DELFB.db, g.collection, x.id)));
      try {
        await batch.commit();
        deleted += slice.length;
      } catch (e) {
        failed += slice.length;
        error = delTxt(e);
        break;
      }
    }
    results.push({ collection: g.collection, found: g.docs.length, deleted: deleted, failed: failed, error: error });
  }
  let td = 0, tf = 0;
  results.forEach((r) => { td += r.deleted; tf += r.failed; });
  await DELFB.updateDoc(DELFB.doc(DELFB.db, "systemDeletionAudit", auditId), {
    results: results,
    status: tf ? (td ? "partial" : "failed") : "completed",
    totalDeleted: td,
    totalFailed: tf,
    finishedAt: DELFB.serverTimestamp()
  }).catch(() => {});
  return { results: results, totalDeleted: td, totalFailed: tf };
}

async function delNotify(row, outcome, message) {
  try {
    await DELFB.addDoc(DELFB.collection(DELFB.db, "systemNotifications"), {
      type: "deletion",
      status: "unread",
      googleUid: (row.r && row.r.requesterUid) || "",
      googleEmail: (row.r && row.r.requesterEmail) || "",
      username: (row.r && row.r.requesterUsername) || "",
      requestId: row.id,
      outcome: outcome,
      message: message,
      at: DELFB.serverTimestamp()
    });
  } catch (e) {
    showErr("Could not store the user notification: " + delTxt(e) +
      " The decision itself is already recorded on the request.");
  }
}
/* DEL-ADMIN-MODULE-END */


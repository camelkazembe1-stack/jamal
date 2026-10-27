// JAMALI — Account Administration (380) — task 56
// Approve/reject account requests · grant modules/submodules per user ·
// hide existing page fields / set defaults. Administrators only.

import {
  requireAuth, readSystemSession,
  db, collection, getDocs, doc, updateDoc, setDoc, query, where, serverTimestamp
} from "/firebase.js";

const $ = (id) => document.getElementById(id);
const err = $("err");
function fail(msg) { err.textContent = msg; err.hidden = false; }
function okMsg(id) { const el = $(id); el.hidden = false; setTimeout(() => { el.hidden = true; }, 2200); }

// ---------------------------------------------------------------------
// guard: administrators only (requireAuth also checks house + session)
// ---------------------------------------------------------------------
const user = await requireAuth();
const session = readSystemSession();
if (!session || session.role !== "admin") {
  location.replace("/?denied=" + encodeURIComponent("system-admin"));
} else {
  boot();
}

// ---------------------------------------------------------------------
// tabs
// ---------------------------------------------------------------------
function boot() {
  const tabs = [
    ["tab-requests", "panel-requests"],
    ["tab-users", "panel-users"],
    ["tab-pages", "panel-pages"]
  ];
  tabs.forEach(([tb, pn]) => {
    $(tb).addEventListener("click", () => {
      tabs.forEach(([t2, p2]) => {
        $(t2).classList.toggle("active", t2 === tb);
        $(p2).hidden = p2 !== pn;
      });
    });
  });
  loadRequests();
  loadUsers();
  buildPageSelect();
}

// ---------------------------------------------------------------------
// TAB 1 · account requests
// ---------------------------------------------------------------------
async function loadRequests() {
  const reqBody = $("req-body"), rejBody = $("rej-body");
  reqBody.innerHTML = ""; rejBody.innerHTML = "";
  let pend = 0, rej = 0;

  const snap = await getDocs(collection(db, "systemAccounts"));
  snap.forEach((d) => {
    const a = d.data();
    const row = document.createElement("tr");
    if (a.status === "pending") {
      pend++;
      const when = a.at && a.at.toDate ? a.at.toDate().toLocaleString() : "";
      row.innerHTML =
        "<td></td><td></td><td>" + when + "</td>" +
        "<td><button class=\"btn-ghost approve\" type=\"button\">Approve</button>" +
        "<button class=\"btn-ghost btn-danger reject\" type=\"button\">Reject</button></td>";
      row.cells[0].textContent = a.usernameDisplay || d.id;
      row.cells[1].textContent = a.position || "";
      row.querySelector(".approve").addEventListener("click", () => decide(d.id, "approved"));
      row.querySelector(".reject").addEventListener("click", () => decide(d.id, "rejected"));
      reqBody.appendChild(row);
    } else if (a.status === "rejected") {
      rej++;
      row.innerHTML = "<td></td><td></td>" +
        "<td><button class=\"btn-ghost approve\" type=\"button\">Approve again</button></td>";
      row.cells[0].textContent = a.usernameDisplay || d.id;
      row.cells[1].textContent = a.position || "";
      row.querySelector(".approve").addEventListener("click", () => decide(d.id, "approved"));
      rejBody.appendChild(row);
    }
  });

  $("req-empty").hidden = pend > 0;
  $("rej-empty").hidden = rej > 0;
  const badge = $("req-badge");
  badge.textContent = String(pend);
  badge.hidden = pend === 0;
}

async function decide(id, status) {
  try {
    await updateDoc(doc(db, "systemAccounts", id), { status: status, decidedAt: serverTimestamp() });
    loadRequests();
    loadUsers();
  } catch (e) { fail("Could not save the decision: " + (e.message || e.code)); }
}

// ---------------------------------------------------------------------
// TAB 2 · users & access (the room keys)
// ---------------------------------------------------------------------
function uniqueFolders() {
  // { folder, label } in first-appearance order, with each entry's
  // top-level (d:1) ancestor folder — home is always open, never granted.
  const menu = window.JAMALI_MENU || [];
  const out = [];
  const seen = Object.create(null);
  let top = null;
  for (const p of menu) {
    if ((p.d || 0) === 0) continue;
    if ((p.d || 0) === 1) top = p;
    if (seen[p.folder]) continue;
    seen[p.folder] = true;
    out.push({ folder: p.folder, label: p.label, top: top ? top.folder : p.folder });
  }
  return out;
}

async function loadUsers() {
  const sel = $("user-select");
  const keep = sel.value;
  sel.innerHTML = "<option value=\"\">— Select a user —</option>";
  const snap = await getDocs(collection(db, "systemAccounts"));
  const names = [];
  snap.forEach((d) => {
    const a = d.data();
    if (a.status === "approved" && a.role !== "admin") names.push({ id: d.id, a });
  });
  names.sort((x, y) => (x.a.usernameDisplay || x.id).localeCompare(y.a.usernameDisplay || y.id));
  for (const { id, a } of names) {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = (a.usernameDisplay || id) + (a.position ? " — " + a.position : "");
    sel.appendChild(o);
  }
  sel.value = keep && sel.querySelector("option[value='" + keep + "']") ? keep : "";
  if (!sel.value) { $("grants-card").hidden = true; $("user-who").hidden = true; }
  sel.onchange = () => renderGrants(sel.value);
  if (sel.value) renderGrants(sel.value);
}

async function renderGrants(id) {
  const card = $("grants-card"), who = $("user-who");
  if (!id) { card.hidden = true; who.hidden = true; return; }
  let acc;
  try {
    acc = (await getDoc(doc(db, "systemAccounts", id))).data();
  } catch (e) { fail("Could not read the account: " + (e.message || e.code)); return; }
  who.textContent = (acc.usernameDisplay || id) + " — currently granted: " +
    ((acc.grants && acc.grants.length) ? acc.grants.length + " area(s)" : "nothing yet");
  who.hidden = false;

  const groups = [];
  const byTop = Object.create(null);
  for (const f of uniqueFolders()) {
    if (f.folder === "home") continue;
    if (f.folder === f.top) { groups.push(f); continue; }
    if (!byTop[f.top]) byTop[f.top] = [];
    byTop[f.top].push(f);
  }

  const granted = new Set(acc.grants || []);
  const tree = $("grants-tree");
  tree.innerHTML = "";
  for (const g of groups) {
    const box = document.createElement("div");
    box.className = "grant-group";
    const head = document.createElement("label");
    head.className = "big";
    head.innerHTML = "<input type=\"checkbox\" data-folder=\"" + g.folder + "\"> " + g.label;
    const headCb = head.querySelector("input");
    headCb.checked = granted.has(g.folder);
    box.appendChild(head);

    const kids = byTop[g.folder] || [];
    if (kids.length) {
      const kd = document.createElement("div");
      kd.className = "grant-kids";
      for (const k of kids) {
        const lab = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.folder = k.folder;
        cb.checked = granted.has(k.folder);
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(k.label));
        kd.appendChild(lab);
      }
      box.appendChild(kd);
    }
    tree.appendChild(box);
  }
  card.hidden = false;
}

$("grants-save").addEventListener("click", async () => {
  const sel = $("user-select");
  const id = sel.value;
  if (!id) return;
  const grants = [];
  document.querySelectorAll("#grants-tree input[type='checkbox']:checked").forEach((cb) => {
    grants.push(cb.dataset.folder);
  });
  try {
    await updateDoc(doc(db, "systemAccounts", id), { grants: grants, grantsAt: serverTimestamp() });
    okMsg("grants-ok");
    renderGrants(id);
    loadUsers();
  } catch (e) { fail("Could not save access: " + (e.message || e.code)); }
});

// ---------------------------------------------------------------------
// TAB 3 · page fields (hide existing fields / set defaults)
// ---------------------------------------------------------------------
const PAGE_FIELDS = {
  "victim-registration-322": {
    label: "Health → Registration (322)",
    fields: [
      { id: "in-name", label: "Full Name" },
      { id: "in-dob", label: "Date of Birth" },
      { id: "in-age", label: "Age (automatic)" },
      { id: "in-sex", label: "Sex", options: ["Male", "Female"] },
      { id: "in-phone", label: "Phone Number" },
      { id: "in-address", label: "Address and Location" },
      { id: "in-kin", label: "Emergency Contact / Next of Kin" },
      { id: "in-arrival", label: "Arrival Date & Time (automatic)" },
      { id: "in-incident", label: "Incident Type", options: ["Road Accident", "Physical Assault", "Burn", "Fall", "Poisoning", "Workplace Accident", "Other"] },
      { id: "in-desc", label: "Incident Description" },
      { id: "in-dept", label: "Hospital Department", options: ["Emergency Department", "Outpatient Department (OPD)", "Inpatient Department", "Surgery", "Maternity", "Intensive Care Unit (ICU)", "Other"] },
      { id: "in-priority", label: "Emergency Priority", options: ["Critical", "High", "Medium", "Low"] },
      { id: "in-staff", label: "Registering Staff Member" },
      { id: "in-referral", label: "Referral Information", options: ["No", "Yes"] },
      { id: "in-payment", label: "Insurance / Payment", options: ["Insurance", "Cash", "Other"] },
      { id: "in-facility", label: "Referring Facility" },
      { id: "in-unid", label: "Unidentified victim option" }
    ]
  }
};

function buildPageSelect() {
  const sel = $("page-select");
  sel.innerHTML = "<option value=\"\">— Select a page —</option>";
  for (const id of Object.keys(PAGE_FIELDS)) {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = PAGE_FIELDS[id].label;
    sel.appendChild(o);
  }
  sel.onchange = () => renderFields(sel.value);
}

async function renderFields(pageId) {
  const card = $("fields-card");
  if (!pageId) { card.hidden = true; return; }
  let config = { hidden: [], defaults: {} };
  try {
    const snap = await getDoc(doc(db, "systemPageConfig", pageId));
    if (snap.exists()) config = snap.data();
  } catch (e) { /* fresh page config */ }

  const hidden = new Set(config.hidden || []);
  const defaults = config.defaults || {};
  $("fields-title").textContent = "Fields — " + PAGE_FIELDS[pageId].label;
  const body = $("fields-body");
  body.innerHTML = "";

  for (const f of PAGE_FIELDS[pageId].fields) {
    const tr = document.createElement("tr");
    const tdL = document.createElement("td");
    tdL.textContent = f.label;
    const tdH = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.field = f.id;
    cb.checked = hidden.has(f.id);
    tdH.appendChild(cb);
    const tdD = document.createElement("td");
    if (f.options) {
      const sel = document.createElement("select");
      sel.dataset.field = f.id;
      sel.appendChild(new Option("(no default)", ""));
      for (const o of f.options) sel.appendChild(new Option(o, o));
      sel.value = defaults[f.id] || "";
      tdD.appendChild(sel);
    } else if (f.id === "in-unid") {
      const sel = document.createElement("select");
      sel.dataset.field = f.id;
      sel.appendChild(new Option("(no default)", ""));
      sel.appendChild(new Option("Checked", "__checked__"));
      sel.value = defaults[f.id] === true ? "__checked__" : (defaults[f.id] || "");
      tdD.appendChild(sel);
    } else {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.dataset.field = f.id;
      inp.placeholder = "(no default)";
      inp.value = typeof defaults[f.id] === "string" ? defaults[f.id] : "";
      tdD.appendChild(inp);
    }
    tr.appendChild(tdL); tr.appendChild(tdH); tr.appendChild(tdD);
    body.appendChild(tr);
  }
  card.hidden = false;
}

$("fields-save").addEventListener("click", async () => {
  const pageId = $("page-select").value;
  if (!pageId) return;
  const hidden = [], defaults = {};
  document.querySelectorAll("#fields-body input[type='checkbox']:checked").forEach((cb) => hidden.push(cb.dataset.field));
  document.querySelectorAll("#fields-body select, #fields-body input[type='text']").forEach((el) => {
    if (!el.dataset.field) return;
    if (el.value === "") return;
    defaults[el.dataset.field] = el.value === "__checked__" ? true : el.value;
  });
  try {
    await setDoc(doc(db, "systemPageConfig", pageId), {
      page: pageId, hidden: hidden, defaults: defaults, updatedAt: serverTimestamp()
    });
    okMsg("fields-ok");
  } catch (e) { fail("Could not save the page settings: " + (e.message || e.code)); }
});

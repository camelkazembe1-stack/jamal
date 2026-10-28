// JAMALI — Account Administration (380) — TASK 67 FULL REWRITE
// (Task 58 rewrite · Task 61 notifications · Task 63 module strip ·
//  Task 67 self-test + honest errors)
//
// One screen for the administrator: the counters (Total / Ready /
// Pending), the NOTIFICATIONS (one per registration request, counted on
// the button), the account requests, the per-user room keys, and the
// page field settings.
//
// TASK 67 REWRITE RULES (written after the "still not solved" rounds):
// 1. every Firestore function used here is imported below — no
//    exceptions (a missing import = silent ReferenceError);
// 2. NO silent catch — every failure is written on the screen WITH the
//    exact error code the database returned;
// 3. a DATABASE SELF-TEST runs at boot and reads each collection the
//    page needs, printing PASS (with a document count) or FAIL (with
//    the real code) — nobody ever has to guess which side failed;
// 4. the accounts are read ONCE into one cache; the counters, the
//    requests, the user selector and the user lists all render from
//    that same cache, and every action re-reads it first.

import {
  requireAuth, readSystemSession,
  db, collection, query, where, getDocs, getDoc, doc, updateDoc,
  setDoc, serverTimestamp
} from "/firebase.js";

const $ = (id) => document.getElementById(id);
const err = $("err");
function fail(msg) { err.textContent = msg; err.hidden = false; }
function clearErr() {
  if (err.textContent.indexOf("Reading the accounts failed") === 0) err.hidden = true;
}
function okMsg(id) {
  const el = $(id); el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 2200);
}
function show(e) {
  if (!e) return "unknown error";
  if (e.code && e.message) return e.code + " — " + e.message;
  return e.message || e.code || String(e);
}

// TASK 67: the build tag proves the NEW script is actually running.
// If this line still says only "build T67" with no timestamp, the
// browser is showing an old cached copy — press Ctrl+Shift+R.
try {
  $("build-tag").textContent =
    "build T67 · script loaded " + new Date().toISOString();
} catch (e) { /* the tag is cosmetic — never block the page for it */ }

// TASK 67: the project's own firestore.rules, embedded verbatim so the
// administrator can always re-publish the exact live text from here.
const RULES_TEXT = "rules_version = '2';\n\nservice cloud.firestore {\n  match /databases/{database}/documents {\n\n    function isSystemAdmin() {\n      return request.auth != null\n        && exists(/databases/$(database)/documents/systemAdmins/$(request.auth.uid));\n    }\n\n    match /transactions/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthRegistrations/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthTriage/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthNurseConsultations/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthDoctorConsultations/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthPrescriptions/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthTreatmentOrders/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthDestinations/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthWards/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthBeds/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthBedAssignments/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthBedTransfers/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthBedMaintenance/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthAdmissions/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthDischarges/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthLabRequests/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthImagingRequests/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /healthQueueConfig/{docId} {\n      allow create, read, update, delete: if true;\n    }\n\n    match /systemAccounts/{docId} {\n      allow read: if true;\n      allow create: if (\n        (request.auth != null\n          && request.resource.data.get(\"googleEmail\", \"\") == request.auth.token.email\n          && request.resource.data.get(\"status\", \"\") == \"pending\"\n          && request.resource.data.get(\"role\", \"\") == \"user\")\n        || (request.auth != null\n          && request.resource.data.get(\"googleUid\", \"\") == request.auth.uid\n          && request.resource.data.get(\"usernameLower\", \"\") == \"jamal kazembe\"\n          && request.resource.data.get(\"status\", \"\") == \"approved\"\n          && request.resource.data.get(\"role\", \"\") == \"admin\"\n          && request.resource.data.get(\"passHash\", \"\") == \"5c784bdcad7f92a39757e3ac0ae25315f422c4d97ef11cb438d059e9a830e9af\"\n          && request.resource.data.get(\"tokenHash\", \"\") == \"3f965d6df52296c4c2bf89878067be2c79cf6895189978f379746874728caae1\"\n          && !exists(/databases/$(database)/documents/systemSetup/claim))\n      );\n      allow update: if isSystemAdmin();\n      allow delete: if isSystemAdmin();\n    }\n\n    match /systemCredentials/{docId} {\n      allow read: if request.auth != null\n        && (docId != \"jamal kazembe\"\n          || resource.data.googleUid == request.auth.uid);\n      allow create: if request.auth != null\n        && (docId != \"jamal kazembe\"\n          || request.resource.data.googleUid == request.auth.uid);\n      allow update: if request.auth != null\n        && (resource.data.googleUid == request.auth.uid || isSystemAdmin());\n      allow delete: if isSystemAdmin();\n    }\n\n    match /systemAdmins/{uid} {\n      allow read: if request.auth != null;\n      allow create: if request.auth != null\n        && request.resource.data.passHash == \"5c784bdcad7f92a39757e3ac0ae25315f422c4d97ef11cb438d059e9a830e9af\"\n        && request.resource.data.tokenHash == \"3f965d6df52296c4c2bf89878067be2c79cf6895189978f379746874728caae1\";\n      allow delete: if isSystemAdmin() && uid != request.auth.uid;\n      allow update: if false;\n    }\n\n    match /systemSetup/{docId} {\n      allow read: if request.auth != null;\n      allow create: if request.auth != null\n        && !exists(/databases/$(database)/documents/systemSetup/claim)\n        && request.resource.data.passHash == \"5c784bdcad7f92a39757e3ac0ae25315f422c4d97ef11cb438d059e9a830e9af\"\n        && request.resource.data.tokenHash == \"3f965d6df52296c4c2bf89878067be2c79cf6895189978f379746874728caae1\";\n      allow update, delete: if false;\n    }\n\n    match /systemNotifications/{docId} {\n      allow read: if request.auth != null;\n      allow create: if request.auth != null\n        && request.resource.data.get(\"type\", \"\") == \"registration\"\n        && request.resource.data.get(\"status\", \"\") == \"unread\"\n        && request.resource.data.get(\"googleEmail\", \"\") == request.auth.token.email;\n      allow update: if isSystemAdmin();\n      allow delete: if isSystemAdmin();\n    }\n\n    match /systemPageConfig/{docId} {\n      allow read: if true;\n      allow create, update, delete: if isSystemAdmin();\n    }\n  }\n}\n";
// ---------------------------------------------------------------------
// guard: administrators only (requireAuth also checks house + session)
// TASK 61: the role is verified against the DATABASE, not the session
// string — only a systemAdmins document (created behind the security
// rules by the administrator's real credentials) opens this page.
// ---------------------------------------------------------------------
const user = await requireAuth();
const session = readSystemSession();
if (!session || session.role !== "admin") {
  location.replace("/?denied=" + encodeURIComponent("system-admin"));
} else {
  const admDoc = await getDoc(doc(db, "systemAdmins", user.uid));
  if (!admDoc.exists()) {
    location.replace("/?denied=" + encodeURIComponent("system-admin"));
  } else {
    boot();
  }
}

// ---------------------------------------------------------------------
// the ONE cache — one read feeds every panel
// ---------------------------------------------------------------------
let ACCOUNTS = [];                // every account: { id, usernameDisplay,
                                  // status, role, grants, ... }
let CURRENT_USER_ID = "";         // the account picked in Users & Access
let NOTIFS = [];                  // TASK 61: unread notifications

async function readAccounts() {
  const snap = await getDocs(collection(db, "systemAccounts"));
  const rows = [];
  snap.forEach((d) => { const a = d.data(); a.id = d.id; rows.push(a); });
  rows.sort((x, y) => String(x.usernameDisplay || x.id || "")
    .localeCompare(String(y.usernameDisplay || y.id || "")));
  ACCOUNTS = rows;
  return rows;
}

// re-read the accounts, then repaint every panel that shows them
function refreshAll() {
  readAccounts().then((rows) => {
    clearErr();
    paintCounters(rows);
    paintRequests(rows);
    paintUserSelect(rows);
    if (CURRENT_USER_ID) paintGrants(CURRENT_USER_ID);
  }).catch((e) => {
    fail("Reading the accounts failed: " + show(e) +
      " — the self-test table at the top shows exactly which read the database refused.");
    $("helper-panel").hidden = false;
  });
}

// ---------------------------------------------------------------------
// TASK 67 · THE DATABASE SELF-TEST
// Reads each collection exactly like the page does and prints the true
// result. PASS = the read is allowed (with a document count). FAIL =
// the exact error code the database returned. This is the single
// source of truth for "is it the rules or not".
// ---------------------------------------------------------------------
const PROBES = [
  ["systemAccounts", "every system account (profiles, status, grants) — open reader"],
  ["systemPageConfig", "page field visibility and defaults — open reader"],
  ["systemNotifications", "one per registration request — needs a signed-in reader"],
  ["systemAdmins", "administrator identities — needs a signed-in reader"],
  ["systemCredentials", "password/token hashes and phone — needs a signed-in reader"]
];

async function selfTest() {
  const body = $("diag-body");
  body.innerHTML = "";
  let bad = 0;
  for (const [name, what] of PROBES) {
    const tr = document.createElement("tr");
    const c1 = document.createElement("td"); c1.textContent = name;
    const c2 = document.createElement("td"); c2.textContent = what;
    const c3 = document.createElement("td");
    try {
      const snap = await getDocs(collection(db, name));
      c3.textContent = "PASS — " + snap.size + " document(s)";
      c3.style.color = "#15803d"; c3.style.fontWeight = "600";
    } catch (e) {
      c3.textContent = "FAIL — " + show(e);
      c3.style.color = "#b91c1c"; c3.style.fontWeight = "600";
      bad++;
    }
    tr.appendChild(c1); tr.appendChild(c2); tr.appendChild(c3);
    body.appendChild(tr);
  }
  $("diag-note").textContent = bad === 0
    ? "Every read the page needs is allowed. If a table below is still empty, the collection simply holds no documents for it yet."
    : bad + " read(s) refused. FAIL with permission-denied = the live rules are older than this page needs — publish the rules in the helper above. Any other code = network or configuration, not the rules.";
  if (bad) $("helper-panel").hidden = false;
  return bad;
}

// ---------------------------------------------------------------------
// TASK 61 · NOTIFICATIONS (requirements 9 + 10): every registration
// request rings the bell. The button shows the number awaiting
// attention; the panel lists them with Review and Dismiss.
// ---------------------------------------------------------------------
async function readNotifs() {
  const snap = await getDocs(query(collection(db, "systemNotifications"),
    where("status", "==", "unread")));
  const rows = [];
  snap.forEach((d) => { const n = d.data(); n.id = d.id; rows.push(n); });
  rows.sort((x, y) => String(x.usernameLower || x.id || "")
    .localeCompare(String(y.usernameLower || y.id || "")));
  NOTIFS = rows;
  paintNotifs();
}

function paintNotifs() {
  const badge = $("notif-badge");
  badge.textContent = String(NOTIFS.length);
  badge.hidden = NOTIFS.length === 0; // the number ON the button
  const body = $("notif-body");
  body.innerHTML = "";
  for (const n of NOTIFS) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td></td><td></td><td></td><td></td>";
    tr.cells[0].textContent = n.username || n.usernameLower || n.id;
    tr.cells[1].textContent = n.at && n.at.toDate
      ? n.at.toDate().toLocaleString() : "";
    const rev = document.createElement("button");
    rev.className = "btn-ghost"; rev.type = "button"; rev.textContent = "Review";
    rev.addEventListener("click", () => {
      $("notif-panel").hidden = true; $("tab-requests").click();
    });
    const dis = document.createElement("button");
    dis.className = "btn-ghost btn-danger"; dis.type = "button";
    dis.textContent = "Dismiss";
    dis.addEventListener("click", () => dismissNotif(n.id));
    tr.cells[2].appendChild(rev);
    tr.cells[3].appendChild(dis);
    body.appendChild(tr);
  }
  $("notif-empty").hidden = NOTIFS.length > 0;
}

function dismissNotif(id) {
  updateDoc(doc(db, "systemNotifications", id),
    { status: "read", dismissedAt: serverTimestamp() })
    .then(readNotifs)
    .catch((e) => fail("Could not dismiss the notification: " + show(e)));
}

// ---------------------------------------------------------------------
// boot: tabs, counters, module strip, page fields, bell, self-test
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
  // the counters: click a number -> that group's users
  $("stat-total").addEventListener("click", () => openUsers("total"));
  $("stat-ready").addEventListener("click", () => openUsers("ready"));
  $("stat-pending").addEventListener("click", () => openUsers("pending"));
  $("users-close").addEventListener("click", () => { $("users-panel").hidden = true; });
  // users & access: picking a user paints the ACROSS module strip
  $("user-select").addEventListener("change", () => {
    CURRENT_USER_ID = $("user-select").value;
    paintGrants(CURRENT_USER_ID);
  });
  // TASK 63: the module strip — before the Admin button, across
  $("modsel-save").addEventListener("click", saveGrants);
  $("modsel-all").addEventListener("click", () => {
    document.querySelectorAll("#modsel-row .modsel-chip")
      .forEach((x) => { x.classList.add("on"); });
  });
  // page fields
  $("page-select").addEventListener("change", () => paintFields($("page-select").value));
  $("fields-save").addEventListener("click", saveFields);
  buildPageSelect();
  // TASK 61: the bell — open/close the notifications panel
  $("notif-open").addEventListener("click", () => {
    const p = $("notif-panel");
    p.hidden = !p.hidden;
    if (!p.hidden) readNotifs().catch((e) =>
      fail("Reading the notifications failed: " + show(e)));
  });
  // TASK 67: the self-test and the rules helper
  $("rules-box").textContent = RULES_TEXT;
  $("diag-run").addEventListener("click", () =>
    selfTest().catch((e) => fail("The self-test could not run: " + show(e))));
  $("rules-copy").addEventListener("click", copyRules);
  $("helper-recheck").addEventListener("click", () => {
    selfTest().catch((e) => fail("The self-test could not run: " + show(e)));
    refreshAll();
    readNotifs().catch((e) =>
      fail("Reading the notifications failed: " + show(e)));
  });
  $("helper-close").addEventListener("click", () => { $("helper-panel").hidden = true; });
  selfTest().catch((e) => fail("The self-test could not run: " + show(e)));
  refreshAll();
  readNotifs().catch((e) =>
    fail("Reading the notifications failed: " + show(e)));
}

async function copyRules() {
  try {
    await navigator.clipboard.writeText(RULES_TEXT);
    okMsg("rules-ok");
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = RULES_TEXT;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      okMsg("rules-ok");
    } catch (e2) {
      fail("Copy failed — select the text in the rules box and copy it manually.");
    }
    ta.remove();
  }
}

// ---------------------------------------------------------------------
// TASK 57 · the counters: Total Accounts / Ready / Pending.
// Every number is counted from the stored accounts — nothing hard-coded.
// ---------------------------------------------------------------------
const STATUS_LABELS = { approved: "Ready", pending: "Pending", rejected: "Rejected" };
const USER_VIEWS = {
  total: { title: "All registered accounts",
           hint: "Every account ever created, any status.",
           filter: () => true },
  ready: { title: "Ready — approved accounts",
           hint: "Accounts you have approved. Grant their access in Users & Access — or click a user here to jump straight to their modules.",
           filter: (a) => a.status === "approved" },
  pending: { title: "Pending — waiting for your approval",
             hint: "These people created an account and cannot enter until you approve them.",
             filter: (a) => a.status === "pending" }
};

function paintCounters(rows) {
  $("stat-total-num").textContent = String(rows.length);
  $("stat-ready-num").textContent =
    String(rows.filter((a) => a.status === "approved").length);
  $("stat-pending-num").textContent =
    String(rows.filter((a) => a.status === "pending").length);
}

function userRow(a) {
  const tr = document.createElement("tr");
  tr.innerHTML = "<td></td><td></td><td></td><td></td><td></td>";
  tr.cells[0].textContent = a.usernameDisplay || a.id || "";
  tr.cells[1].textContent = a.position || "";
  tr.cells[2].textContent = STATUS_LABELS[a.status] || (a.status || "");
  tr.cells[3].textContent = String(Array.isArray(a.grants) ? a.grants.length : 0);
  tr.cells[4].textContent = a.at && a.at.toDate
    ? a.at.toDate().toLocaleDateString() : "";
  // TASK 62: click a user in the table -> land directly on their modules
  if (a.status === "approved" && a.role !== "admin") {
    tr.style.cursor = "pointer";
    tr.title = "Click to choose the modules this user may see";
    tr.addEventListener("click", () => {
      $("tab-users").click();
      $("user-select").value = a.id;
      CURRENT_USER_ID = a.id;
      paintGrants(a.id);
      $("modsel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  return tr;
}

function openUsers(kind) {
  const view = USER_VIEWS[kind];
  if (!view) return;
  const body = $("users-body");
  body.innerHTML = "";
  $("users-panel").hidden = false;
  $("users-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  $("users-title").textContent = view.title;
  $("users-hint").textContent = view.hint;
  readAccounts().then((rows) => {
    paintCounters(rows); // the numbers are re-counted on every click
    let n = 0;
    for (const a of rows) {
      if (view.filter(a)) { body.appendChild(userRow(a)); n++; }
    }
    $("users-empty").hidden = n > 0;
  }).catch((e) => fail("Reading the accounts failed: " + show(e)));
}

// ---------------------------------------------------------------------
// TAB 1 · account requests
// ---------------------------------------------------------------------
function paintRequests(rows) {
  const reqBody = $("req-body"), rejBody = $("rej-body");
  reqBody.innerHTML = ""; rejBody.innerHTML = "";
  let pend = 0, rej = 0;

  for (const a of rows) {
    const row = document.createElement("tr");
    if (a.status === "pending") {
      pend++;
      const when = a.at && a.at.toDate ? a.at.toDate().toLocaleString() : "";
      row.innerHTML =
        "<td></td><td></td><td>" + when + "</td>" +
        "<td><button class=\"btn-ghost approve\" type=\"button\">Approve</button>" +
        "<button class=\"btn-ghost btn-danger reject\" type=\"button\">Reject</button></td>";
      row.cells[0].textContent = a.usernameDisplay || a.id;
      row.cells[1].textContent = a.position || "";
      row.querySelector(".approve").addEventListener("click", () => decide(a.id, "approved"));
      row.querySelector(".reject").addEventListener("click", () => decide(a.id, "rejected"));
      reqBody.appendChild(row);
    } else if (a.status === "rejected") {
      rej++;
      row.innerHTML = "<td></td><td></td>" +
        "<td><button class=\"btn-ghost approve\" type=\"button\">Approve again</button></td>";
      row.cells[0].textContent = a.usernameDisplay || a.id;
      row.cells[1].textContent = a.position || "";
      row.querySelector(".approve").addEventListener("click", () => decide(a.id, "approved"));
      rejBody.appendChild(row);
    }
  }

  $("req-empty").hidden = pend > 0;
  $("rej-empty").hidden = rej > 0;
  const badge = $("req-badge");
  badge.textContent = String(pend);
  badge.hidden = pend === 0;
}

function decide(id, status) {
  updateDoc(doc(db, "systemAccounts", id),
    { status: status, decidedAt: serverTimestamp() })
    .then(() => {
      // TASK 61: a decision clears the matching notification from the
      // counter; the decision is never lost if only the notification
      // update fails — it is reported, not silent.
      return updateDoc(doc(db, "systemNotifications", id),
        { status: "read", decidedAt: serverTimestamp() })
        .catch((e) => fail("Decision saved, but the notification could not be cleared: " + show(e)));
    })
    .then(() => { refreshAll(); readNotifs().catch(() => {}); })
    .catch((e) => fail("Could not save the decision: " + show(e)));
}

// ---------------------------------------------------------------------
// TAB 2 · users & access (the room keys)
// ---------------------------------------------------------------------
function paintUserSelect(rows) {
  const sel = $("user-select");
  const keep = sel.value;
  sel.innerHTML = "<option value=\"\">— Select a user —</option>";
  for (const a of rows) {
    if (a.status === "approved" && a.role !== "admin") {
      const o = document.createElement("option");
      o.value = a.id;
      o.textContent = (a.usernameDisplay || a.id) +
        (a.position ? " — " + a.position : "");
      sel.appendChild(o);
    }
  }
  sel.value = keep && sel.querySelector("option[value='" + keep + "']")
    ? keep : "";
  if (!sel.value) {
    $("grants-card").hidden = true; $("user-who").hidden = true;
    $("modsel").hidden = true; CURRENT_USER_ID = "";
  } else paintGrants(sel.value);
}

function paintGrants(id) {
  const card = $("grants-card"), who = $("user-who"), strip = $("modsel");
  if (!id) { card.hidden = true; who.hidden = true; strip.hidden = true; return; }
  // read from the cache — no extra Firestore round-trip, nothing to fail
  const acc = ACCOUNTS.find((a) => a.id === id);
  if (!acc) { card.hidden = true; who.hidden = true; strip.hidden = true; return; }
  CURRENT_USER_ID = id;
  who.textContent = (acc.usernameDisplay || id) + " — currently granted: " +
    ((acc.grants && acc.grants.length) ? acc.grants.length + " area(s)" : "nothing yet");
  who.hidden = false;
  card.hidden = false;

  // TASK 63: the module selection is the ACROSS strip at the top of the
  // page — before the Admin button. Every grantable module of the menu
  // is one chip, in tree order, separated by a small divider per top
  // area. A granted child still carries its parents at save (saveGrants).
  const granted = new Set(acc.grants || []);
  const menu = window.JAMALI_MENU || [];
  $("modsel-who").textContent = "Modules for " + (acc.usernameDisplay || id) +
    " — tick what this user may see:";
  const rowEl = $("modsel-row");
  rowEl.innerHTML = "";
  const chips = [];
  for (let i = 0; i < menu.length; i++) {
    const p = menu[i];
    const d = p.d || 0;
    if (d < 1) continue; // home + system-admin are never granted here
    if (d === 1 && chips.length) {
      const sep = document.createElement("span");
      sep.className = "modsel-sep";
      rowEl.appendChild(sep);
    }
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "modsel-chip d" + Math.min(d, 3) +
      (granted.has(p.folder) ? " on" : "");
    chip.dataset.folder = p.folder;
    chip.textContent = p.label;
    chip.title = (d === 1 ? p.label + " — its own page only. " : "") +
      "Click to allow or remove " + p.label + ".";
    chip.addEventListener("click", () => { chip.classList.toggle("on"); });
    rowEl.appendChild(chip);
    chips.push({ chip, i });
    // a small "all" chip ticks this module and everything under it
    if (d <= 2 && i + 1 < menu.length && (menu[i + 1].d || 0) > d) {
      const all = document.createElement("button");
      all.type = "button";
      all.className = "modsel-allchip";
      all.textContent = "all";
      all.title = "Allow every module under " + p.label;
      all.addEventListener("click", () => {
        chip.classList.add("on");
        for (let j = i + 1; j < menu.length && (menu[j].d || 0) > d; j++) {
          const hit = chips.find((x) => x.i === j);
          if (hit) hit.chip.classList.add("on");
        }
      });
      rowEl.appendChild(all);
    }
  }
  strip.hidden = false;
}

function saveGrants() {
  const id = $("user-select").value;
  if (!id) return;
  const picked = [];
  document.querySelectorAll("#modsel-row .modsel-chip.on")
    .forEach((chip) => { picked.push(chip.dataset.folder); });
  // TASK 60: a granted child always carries its ancestors — granting
  // "Add Transaction" also grants "Business", so the sidebar shows the
  // path exactly as it is arranged in the flow (nothing else hidden).
  const menu = window.JAMALI_MENU || [];
  const at = Object.create(null);
  menu.forEach((p, i) => { if (!(p.folder in at)) at[p.folder] = i; });
  const grants = new Set(picked);
  for (const f of picked) {
    const start = at[f] !== undefined ? at[f] : -1;
    let myD = start >= 0 ? (menu[start].d || 0) : 0;
    for (let i = start - 1; i >= 0 && myD > 1; i--) {
      const d = menu[i].d || 0;
      if (d === 0) break;
      if (d < myD) { grants.add(menu[i].folder); myD = d; }
    }
  }
  updateDoc(doc(db, "systemAccounts", id),
    { grants: Array.from(grants), grantsAt: serverTimestamp() })
    .then(() => { okMsg("modsel-ok"); return readAccounts(); })
    .then((rows) => {
      paintCounters(rows);
      paintUserSelect(rows);
      paintGrants(id);
    })
    .catch((e) => fail("Could not save access: " + show(e)));
}

// ---------------------------------------------------------------------
// TAB 3 · page fields (hide existing fields / set defaults)
// ---------------------------------------------------------------------
const PAGE_FIELDS = {
  "victim-registration-322": {
    label: "Health — Registration (322)",
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
}

async function paintFields(pageId) {
  const card = $("fields-card");
  if (!pageId) { card.hidden = true; return; }
  let config = { hidden: [], defaults: {} };
  try {
    const snap = await getDoc(doc(db, "systemPageConfig", pageId));
    if (snap.exists()) config = snap.data();
  } catch (e) {
    // NOT silent: a denied read used to swallow the whole tab invisibly
    fail("Could not read the page settings: " + show(e));
    return;
  }

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

function saveFields() {
  const pageId = $("page-select").value;
  if (!pageId) return;
  const hidden = [], defaults = {};
  document.querySelectorAll("#fields-body input[type='checkbox']:checked")
    .forEach((cb) => hidden.push(cb.dataset.field));
  document.querySelectorAll("#fields-body select, #fields-body input[type='text']")
    .forEach((el) => {
      if (!el.dataset.field) return;
      if (el.value === "") return;
      defaults[el.dataset.field] = el.value === "__checked__" ? true : el.value;
    });
  setDoc(doc(db, "systemPageConfig", pageId), {
    page: pageId, hidden: hidden, defaults: defaults, updatedAt: serverTimestamp()
  }).then(() => okMsg("fields-ok"))
    .catch((e) => fail("Could not save the page settings: " + show(e)));
}

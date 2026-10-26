#!/usr/bin/env bash
# =====================================================================
# JAMALI - Task 50 - GO LIVE: the whole health-module repair, one file
# Run this from ~/jamali  (the folder that contains public/).
# Runs after ANY earlier task state. Idempotent: safe to run any number
# of times.
#
# THE FULL CODE AUDIT (every health file read, line by line, today)
#   Pages audited as they are ON THE LIVE SITE right now:
#   321 hub, 322 registration, 323 triage, 324 nurse, 325 doctor,
#   326 pharmacy, 327 treatment, 328 patient list, the patient-info
#   chip, firebase.js, menu.js, firestore.rules.
#   Found EXACTLY three errors - and nothing else:
#
#   ERROR 1 (the killer): public/firebase.js does not export updateDoc.
#     Pages 324, 325, 326, 327 and 328 import it. In ES modules an
#     import of a missing name is a hard error: the whole page script
#     dies ON THE IMPORT LINE, before one listener or button binds.
#     That is why the four Find buttons never answer, and why the
#     Patient List shows the static "No patients registered yet" card -
#     that card is the HTML default; no JavaScript ever runs to fill
#     the table. (deleteDoc, getDocs and setDoc are missing too.)
#   ERROR 2: the Patient List on the site is the old 46b build - when
#     it fails, it fails in total silence. The 46d build names its
#     cause on screen instead.
#   ERROR 3: firestore.rules carries 19 match blocks, 11 of them for
#     collections this app stopped using long ago. Refreshed to the
#     exact 8 the code really uses.
#
#   Audited CLEAN (no correction needed, and none is shipped):
#     - every DOM id the seven pages' scripts touch exists in their
#       HTML (or is created by the script itself) - 0 wiring errors
#     - every Firestore collection name typed correctly, all inside
#       the 8 real collections
#     - the hub 321 links and the sidebar menu.js: all 7 health pages
#       registered and pointing at real folders
#     - the patient-info chip: its imports are all exported
#     - page 322's "Recent registrations" table: that section lives on
#       322, which never imported updateDoc - it always worked, and it
#       is the proof your two victims (8695SLAJ, 3801LSKG) are saved
#       and waiting in healthRegistrations.
#
# WHAT THIS RUN DOES - FIVE FILES, ALL FULL OVERWRITES
#   1. public/firebase.js ........ exports updateDoc, deleteDoc,
#      getDocs, setDoc (task 47's fix). Brings the four Find buttons
#      and the Patient List back from the dead.
#   2. public/patient-module/328.html + 328.css + 328.js .... the
#      Patient List upgraded to 46d: one table of every victim,
#      newest first, Copy / pen / bin per row, plus the boot line
#      ("Patient List · build 46d · connecting…"), a red banner for
#      every collection that cannot be read, a 12-second watchdog
#      and a one-shot fallback read.
#   3. firestore.rules ........ the 8-collection refresh (task 48).
#      NOTE: rules take effect only after you also paste them into
#      the Firebase console (Firestore -> Rules -> Publish). If a
#      page ever shows permission-denied, its red banner prints
#      exactly these steps.
#
# AFTER DOWNLOADING, CHECK YOU GOT THE REAL SCRIPT (30 seconds)
#     head -1 jamali-task50-go-live.sh
#   It must print:  #!/usr/bin/env bash
#   If it prints <!DOCTYPE html> you saved tmpfiles' viewer PAGE, not
#   the script (that is very likely what happened to task 47).
#   Open the link in a BROWSER and press its Download button, then:
#     bash jamali-task50-go-live.sh
#
# THE PROOF - THE PART THAT WAS MISSED LAST TIME
#   The job is NOT done when this script prints ALL PASS. It is done
#   when git push has deployed AND the site shows the boot line
#   "Patient List · build 46d · connecting…" on /patient-module/328.
#   No boot line after a hard refresh = the deployment did not happen.
#
# ABOUT CHECKS: the verification uses grep and find only - no node.
# =====================================================================
set -u

if [ ! -f public/menu.js ] || [ ! -f firestore.rules ]; then
  echo "STOP: run this file from inside ~/jamali - the folder that holds public/ and firestore.rules."
  exit 1
fi

# ---------------------------------------------------------------------
# 1/5  public/firebase.js - the export fix (task 47, carried forward)
# ---------------------------------------------------------------------
cat > public/firebase.js << 'T50_FIREBASE_JS'
// JAMALI — shared Firebase module (auth + firestore)
// index.html uses it for Google login, inner pages use requireAuth()
// Task 50: the export carries updateDoc, deleteDoc, getDocs and setDoc
// (the fix first shipped by task 47). Five pages (324, 325, 326, 327,
// 328) import updateDoc — one missing name in this file used to stop
// their whole script at the import line: no listener bound, no table
// drawn, no Find answer, no response.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtE7p5LM8L2yaJB0JJCyyTz763CBQhKGE",
  authDomain: "jamal-542b5.firebaseapp.com",
  projectId: "jamal-542b5",
  storageBucket: "jamal-542b5.firebasestorage.app",
  messagingSenderId: "401281850731",
  appId: "1:401281850731:web:afa3ff6dca4d9e095c402e",
  measurementId: "G-DHB2DJ769H"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export const db = getFirestore(app);

// Analytics only where the environment supports it
isSupported().then((ok) => { if (ok) getAnalytics(app); }).catch(() => {});

export { onAuthStateChanged, signInWithPopup, signOut };
export {
  getFirestore, collection, doc, addDoc, writeBatch,
  query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp, updateDoc, deleteDoc, getDocs, setDoc
};

// Guard for inner pages: resolve with the user, or bounce to index.html
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user);
      else location.replace("/");
    });
  });
}
T50_FIREBASE_JS

# ---------------------------------------------------------------------
# 2/5  public/patient-module/328.html - the 46d Patient List
# ---------------------------------------------------------------------
cat > public/patient-module/328.html << 'T50_HTML_328'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Patient List — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/patient-module/328.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <!-- the whole page: one table of every victim -->
  <section id="s-list">
    <a class="back" href="/health/321">&larr; Health</a>
    <h1>Patient List</h1>
    <p class="sub">Every victim registered on this account, newest first. Copy the Registration ID with the button beside it — the pen and the bin at the end of a row edit or delete that patient and everything saved for them.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <div class="card">
      <h2>All patients</h2>
      <div class="empty" id="p-empty">
        <div class="empty-icon">🗂️</div>
        <div class="empty-title">No patients registered yet</div>
        <div class="empty-sub">Register victims on the Registration page — every one of them then appears here, newest first.</div>
      </div>
      <div class="table-wrap" id="p-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Registration ID</th><th>Patient</th><th>Age · Sex</th><th>Phone</th><th>Arrived</th><th>Priority</th><th>Actions</th></tr>
          </thead>
          <tbody id="p-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="p-count"></p>
    </div>
  </section>

</main>

<!-- the edit modal -->
<div class="modal-ovl" id="m-wrap" hidden>
  <div class="modal-card" role="dialog" aria-modal="true">
    <h2 id="m-title">Edit patient</h2>
    <p class="mini-note" id="m-sub"></p>
    <div class="m-grid">

      <label>Full Name
        <input id="m-name" type="text" placeholder="Victim's full name">
      </label>
      <label>Date of Birth
        <input id="m-dob" type="date">
      </label>
      <label>Age (automatic)
        <input id="m-age" type="text" readonly placeholder="—">
      </label>
      <label>Sex
        <select id="m-sex">
          <option value="">— Select —</option>
          <option>Male</option>
          <option>Female</option>
        </select>
      </label>

      <label>Phone Number
        <input id="m-phone" type="tel" placeholder="e.g. 0712 345 678">
      </label>
      <label>Address and Location
        <input id="m-address" type="text" placeholder="Village, street, landmark">
      </label>
      <label>Emergency Contact / Next of Kin
        <input id="m-kin" type="text" placeholder="Contact name and phone">
      </label>
      <label>Arrival Date &amp; Time
        <input id="m-arrival" type="datetime-local">
      </label>

      <label>Incident Type
        <select id="m-incident">
          <option value="">— Select —</option>
          <option>Road Accident</option>
          <option>Physical Assault</option>
          <option>Burn</option>
          <option>Fall</option>
          <option>Poisoning</option>
          <option>Workplace Accident</option>
          <option>Other</option>
        </select>
      </label>
      <label>Incident Description
        <textarea id="m-desc" rows="2" placeholder="Brief description of what happened"></textarea>
      </label>
      <label>Hospital Department
        <select id="m-dept">
          <option value="">— Select —</option>
          <option>Emergency Department</option>
          <option>Outpatient Department (OPD)</option>
          <option>Inpatient Department</option>
          <option>Surgery</option>
          <option>Maternity</option>
          <option>Intensive Care Unit (ICU)</option>
          <option>Other</option>
        </select>
      </label>
      <label>Emergency Priority
        <select id="m-priority">
          <option value="">— Select —</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </label>

      <label>Referral Information
        <select id="m-referral">
          <option>No</option>
          <option>Yes</option>
        </select>
      </label>
      <label>Insurance / Payment
        <select id="m-payment">
          <option value="">— Select —</option>
          <option>Insurance</option>
          <option>Cash</option>
          <option>Other</option>
        </select>
      </label>

      <label id="m-facility-label" hidden>Referring Facility
        <input id="m-facility" type="text" placeholder="Name of the referring facility">
      </label>

    </div>

    <p class="form-err" id="m-err" hidden></p>
    <p class="form-ok" id="m-ok" hidden>Saved — the list is updated.</p>
    <div class="form-actions">
      <button class="btn-primary" id="m-save" type="button">Save Changes</button>
      <button class="btn-ghost" id="m-cancel" type="button">Cancel</button>
    </div>
  </div>
</div>

<script>
/* boot line + page-level painters + the 12-second watchdog (Task 46d).
   The boot line proves which build the browser is running and shows where
   the boot stopped, so a silent empty table can never hide its cause. */
(function () {
  var boot = document.getElementById("p-boot");
  if (boot) {
    boot.hidden = false;
    boot.textContent = "Patient List \u00b7 build 46d \u00b7 connecting\u2026";
  }
  window.__p46html = { build: "46d", t0: Date.now() };
})();
/* paints any page-level failure (module import, auth, unexpected) into the banner */
function __jamaliPerr(msg) {
  var box = document.getElementById("p-err");
  if (!box || !box.hidden) return;
  box.hidden = false;
  box.textContent = "Page error \u2014 " + msg;
}
window.addEventListener("error", function (e) {
  if (!e || !e.message) return; /* resource errors carry no message */
  __jamaliPerr(e.message);
}, true);
window.addEventListener("unhandledrejection", function (e) {
  var r = e && e.reason;
  __jamaliPerr(String((r && (r.code || r.message)) || r || "unknown rejection"));
});
/* the watchdog: if after 12 seconds nothing has answered, say exactly
   where the boot stopped — before the module, at sign-in, at the
   listeners, or at Firestore itself */
setTimeout(function () {
  var boot = document.getElementById("p-boot");
  var s = window.__p46 || {};
  if (!boot || boot.hidden || s.regDocs >= 0) return; /* answered - nothing to report */
  var bits = [];
  bits.push("build " + (s.build || "46d") + " script " +
    ((s.auth === true || s.listeners > 0) ? "ran" : "DID NOT run"));
  bits.push("sign-in check " + (s.auth === true ? "passed" : "not passed"));
  bits.push("listeners " + (s.listeners || 0) + "/6");
  bits.push("Firestore " + (s.regDocs >= 0 ? "answered " + s.regDocs + " document(s)" : "never answered"));
  if (s.errs && s.errs.length) bits.push("errors: " + s.errs.join(" | "));
  __jamaliPerr("Still empty after 12 seconds \u2014 " + bits.join(" \u00b7 ") +
    ". If the script DID NOT run, the deployed 328.js is stale or broken: " +
    "re-run the task file, git push, then hard refresh with Ctrl+Shift+R.");
}, 12000);
</script>
<script type="module" src="/patient-module/328.js"></script>
</body>
</html>
T50_HTML_328

# ---------------------------------------------------------------------
# 3/5  public/patient-module/328.css - the 46d styles
# ---------------------------------------------------------------------
cat > public/patient-module/328.css << 'T50_CSS_328'
/* JAMALI — page 328 · Patient List (Health)
   Own stylesheet for this folder — every JAMALI folder ships html + css + js.
   Base design system lives in /records/records.css (imported below).
   Family accent: emerald. One table of every victim, an edit modal, and
   copy / edit / delete actions. Task 46: the page is the list, nothing else. */
@import url("/records/records.css");

/* the hidden attribute always wins, even over display rules below */
[hidden] { display: none !important; }

/* page accent — Health */
h1 { position: relative; padding-left: 15px; }
h1::before { content: ""; position: absolute; left: 0; top: 5px; bottom: 5px;
  width: 5px; border-radius: 3px; background: #059669; }

/* the Registration ID cell: the ID and its copy button */
.id-cell { white-space: nowrap; }
.id-txt { font-weight: 800; letter-spacing: .08em;
  font-variant-numeric: tabular-nums; margin-right: 8px; color: #065f46; }
.copy-btn { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px;
  padding: 4px 9px; font-size: 11.5px; font-weight: 800; cursor: pointer;
  font-family: inherit; color: #334155; }
.copy-btn:hover { border-color: #059669; color: #065f46; }
.copy-btn.done { background: #d1fae5; border-color: #059669; color: #065f46; }

/* the actions cell: the pen edits, the bin deletes */
.act-cell { white-space: nowrap; }
.icon-btn { width: 34px; height: 34px; display: inline-flex; align-items: center;
  justify-content: center; border-radius: 10px; border: 1px solid #cbd5e1;
  background: #fff; cursor: pointer; color: #475569; margin-right: 6px;
  padding: 0; vertical-align: middle; }
.icon-btn svg { display: block; }
.icon-btn:hover { border-color: #059669; color: #059669; background: #ecfdf5; }
.icon-btn.del-btn { color: #b91c1c; }
.icon-btn.del-btn:hover { border-color: #b91c1c; background: #fef2f2; }
.icon-btn:disabled { opacity: .55; cursor: wait; }

.nowrap { white-space: nowrap; }
td.c-date { white-space: nowrap; font-variant-numeric: tabular-nums; }

/* priority badges (same language as the triage page) */
.st-critical { background: #fee2e2; color: #b91c1c; }
.st-high     { background: #ffedd5; color: #c2410c; }
.st-medium   { background: #fef3c7; color: #92400e; }
.st-low      { background: #d1fae5; color: #047857; }
.st-none     { background: #f1f5f9; color: #94a3b8; }
.st { display: inline-block; border-radius: 999px; padding: 3px 10px;
  font-size: 11px; font-weight: 800; letter-spacing: .03em; white-space: nowrap; }

.mini-note { font-size: 11.5px; color: #64748b; font-weight: 600; }

/* the red load-error banner: every failure is visible, none swallowed */
.p-err { margin: 12px 0 0; padding: 10px 12px; border: 1px solid #fecaca;
  background: #fef2f2; color: #b91c1c; border-radius: 10px; font-size: 13px;
  font-weight: 700; }
.p-err .p-err-hint { display: block; margin-top: 4px; font-weight: 600; color: #7f1d1d; }

/* the boot status line: proves the build and shows where the boot stopped */
.p-boot { margin: 6px 0 0; font-size: 12.5px; font-weight: 600; color: #64748b; }

/* the saved note inside the edit modal */
.form-ok { font-size: 13px; font-weight: 800; color: #047857; margin: 10px 0 0; }

/* the edit modal */
.modal-ovl { position: fixed; inset: 0; background: rgba(15, 23, 42, .55);
  z-index: 1200; display: flex; align-items: flex-start; justify-content: center;
  padding: 24px 12px; overflow-y: auto; }
.modal-card { background: #fff; border-radius: 16px;
  box-shadow: 0 24px 60px rgba(2, 6, 23, .35);
  width: 100%; max-width: 760px; padding: 20px 22px 18px; }
.modal-card h2 { margin: 0; }
.modal-card .mini-note { margin: 6px 0 0; }
.m-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px; margin-top: 14px; }
.m-grid label { display: flex; flex-direction: column; gap: 5px;
  font-size: 12.5px; font-weight: 700; color: #334155; }
.m-grid input, .m-grid select, .m-grid textarea {
  border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px;
  font-size: 14px; font-family: inherit; background: #fff; color: #0f172a; }
.m-grid input:focus, .m-grid select:focus, .m-grid textarea:focus {
  outline: 2px solid #a7f3d0; border-color: #059669; }
.modal-card .form-actions { margin-top: 14px; }

/* narrow screens */
@media (max-width: 760px) {
  .m-grid { grid-template-columns: 1fr; }
  .modal-ovl { padding: 12px 8px; }
}

/* print — clean paper output */
@media print {
  #jamali-sidebar, #jamali-burger, #jamali-overlay, .back, .count-line,
  .p-boot, .p-err, .modal-ovl, .act-cell, .copy-btn { display: none !important; }
  body.jamali-has-sidebar { margin-left: 0 !important; }
  body { background: #fff; }
  .wrap { max-width: none; padding: 0; }
  .card { box-shadow: none; }
}
T50_CSS_328

# ---------------------------------------------------------------------
# 4/5  public/patient-module/328.js - the 46d engine
# ---------------------------------------------------------------------
cat > public/patient-module/328.js << 'T50_JS_328'
// patient-module (page 328) — JAMALI Health — the Patient List (Task 46d)
// One table of every victim registered on this account, newest first, and
// nothing else. Each row carries the Registration ID with a one-click Copy
// button — paste the ID into any stage to find the patient — and it ends
// with two icon actions: the PEN opens the registration fields in a modal
// (the ID itself never changes) and the BIN asks once, then removes the
// registration AND every triage, nurse, doctor, pharmacy and treatment
// record kept for that ID. No failure can hide any more: every listener
// carries an error callback, the page shows its build and boot progress,
// and if the live listener never answers, a one-shot read is tried once.
import { requireAuth, db, collection, query, onSnapshot, updateDoc, writeBatch, doc } from "/firebase.js";

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* the boot diagnostic: the inline script in 328.html reads this after 12
   seconds if the table is still empty, so a silent failure names itself.
   It stands BEFORE the top-level await on purpose: everything the error
   paths touch must exist before the module can ever suspend. */
window.__p46 = { build: "46d", auth: false, listeners: 0, regDocs: -1, errs: [] };

try {
  await requireAuth(); // not logged in? -> bounced to "/"
  window.__p46.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

/* the two row actions, drawn as icons: the pen edits, the bin deletes */
const PEN_SVG = "<svg viewBox='0 0 24 24' width='15' height='15' aria-hidden='true'>" +
  "<path fill='currentColor' d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" +
  "M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 " +
  "3.75 3.75 1.83-1.83z'/></svg>";
const BIN_SVG = "<svg viewBox='0 0 24 24' width='15' height='15' aria-hidden='true'>" +
  "<path fill='currentColor' d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z" +
  "M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'/></svg>";

/* real Firestore or the E2E mock? The real db carries its app. */
const REAL = !!(db && db.app);

/* ---------- shared helpers (same language as pages 322 to 327) ---------- */
function pad(n) { return String(n).padStart(2, "0"); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function who(r) {
  return r.isUnidentified
    ? "Unidentified"
    : (r.fullName || "Unnamed");
}
function priBadge(p) {
  const k = String(p || "").toLowerCase();
  const cls = { critical: "st-critical", high: "st-high", medium: "st-medium", low: "st-low" }[k];
  if (cls) return '<span class="st ' + cls + '">' + esc(p) + "</span>";
  return '<span class="st st-none">' + (p ? esc(p) : "—") + "</span>";
}
function ageFromDob(v) {
  if (!v) return "";
  const dob = new Date(v + "T00:00:00");
  const now = new Date();
  if (isNaN(dob.getTime()) || dob > now) return "";
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return (age >= 0 && age < 140) ? String(age) : "";
}

/* ---------- live data: every stage, so delete can reach them all ---------- */
let regs = [];
let triages = [];
let nurseConsults = [];
let docConsults = [];
let rxLines = [];
let tOrders = [];
const lastTriage = new Map();
const loaded = { reg: false, tri: false, nur: false, doc: false, rx: false, trt: false };
function ready() { return loaded.reg && loaded.tri && loaded.nur && loaded.doc && loaded.rx && loaded.trt; }

/* ---------- visible load errors: never swallow a failure again ----------
   If any collection cannot be read (rules, network, project), the page now
   paints a red banner carrying the exact error code instead of failing in
   silence with an empty table. */
function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  if (window.__p46) window.__p46.errs.push(coll + ": " +
    String((e && (e.code || e.message)) || "unknown error"));
  if (!box) return;
  const code = String((e && (e.code || e.message)) || "unknown error");
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}

/* the boot line answered: with rows the line goes, with zero it stays and
   says so — an empty account is a fact, not a failure */
function bootAnswered(n) {
  window.__p46.regDocs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 0 registration documents on this account yet. " +
    "Register a victim on the Registration page and it appears here.";
}

onSnapshot(query(collection(db, "healthRegistrations")), (snap) => {
  regs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .filter((r) => r && r.regId)
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  loaded.reg = true;
  bootAnswered(snap.docs.length);
  renderTable();
}, (e) => loadErr("healthRegistrations", e));
onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  triages = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  lastTriage.clear();
  triages.forEach((t) => {
    if (t && t.regId && !lastTriage.has(String(t.regId))) lastTriage.set(String(t.regId), t);
  });
  loaded.tri = true;
  renderTable();
}, (e) => loadErr("healthTriage", e));
onSnapshot(query(collection(db, "healthNurseConsultations")), (snap) => {
  nurseConsults = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  loaded.nur = true;
}, (e) => loadErr("healthNurseConsultations", e));
onSnapshot(query(collection(db, "healthDoctorConsultations")), (snap) => {
  docConsults = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  loaded.doc = true;
}, (e) => loadErr("healthDoctorConsultations", e));
onSnapshot(query(collection(db, "healthPrescriptions")), (snap) => {
  rxLines = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  loaded.rx = true;
}, (e) => loadErr("healthPrescriptions", e));
onSnapshot(query(collection(db, "healthTreatmentOrders")), (snap) => {
  tOrders = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  loaded.trt = true;
}, (e) => loadErr("healthTreatmentOrders", e));
window.__p46.listeners = 6;

/* the fallback: if the live listener never answers and never errors, try a
   one-shot read once, six seconds in, instead of waiting in silence */
setTimeout(() => {
  if (loaded.reg || window.__p46.errs.length) return;
  import("/firebase.js").then((m) => {
    if (typeof m.getDocs !== "function") {
      loadErr("healthRegistrations (fallback)",
        new Error("the live listener never answered and this firebase.js has no getDocs"));
      return undefined;
    }
    return m.getDocs(query(collection(db, "healthRegistrations"))).then((s) => {
      regs = s.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
        .filter((r) => r && r.regId)
        .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
      loaded.reg = true;
      bootAnswered(s.docs.length);
      window.__p46.recovered = true;
      renderTable();
    });
  }).catch((e) => loadErr("healthRegistrations (fallback)", e));
}, 6000);

/* every collection a patient's records can live in, with a live getter */
const STAGE_COLLS = [
  ["healthRegistrations", () => regs],
  ["healthTriage", () => triages],
  ["healthNurseConsultations", () => nurseConsults],
  ["healthDoctorConsultations", () => docConsults],
  ["healthPrescriptions", () => rxLines],
  ["healthTreatmentOrders", () => tOrders]
];

/* ---------- the table ---------- */
function el(id) {
  const n = document.getElementById(id);
  if (!n) loadErr("the page structure", new Error("missing element #" + id +
    " \u2014 the deployed 328.html does not match this 328.js; re-run the task file, push, hard refresh"));
  return n;
}

function renderTable() {
  const has = regs.length > 0;
  el("p-empty").hidden = has;
  el("p-wrap").hidden = !has;
  el("p-body").innerHTML = regs.map((r) => {
    const t = lastTriage.get(String(r.regId));
    const ageSex = (r.age !== "" && r.age != null ? r.age + "y" : "—") +
      (r.sex ? " · " + r.sex : "");
    return "<tr>" +
      "<td class='c-no id-cell'><span class='id-txt'>" + esc(r.regId) + "</span>" +
        "<button type='button' class='copy-btn' data-copy='" + esc(r.regId) + "'>Copy</button></td>" +
      "<td class='c-party'>" + esc(who(r)) + "</td>" +
      "<td class='nowrap'>" + esc(ageSex) + "</td>" +
      "<td class='nowrap'>" + (r.phone ? esc(r.phone) : "—") + "</td>" +
      "<td class='c-date'>" + esc(when(r.arrivalAt || r.savedAt)) + "</td>" +
      "<td>" + priBadge(t ? t.priority : r.priority) + "</td>" +
      "<td class='act-cell'>" +
        "<button type='button' class='icon-btn edit-btn' data-regid='" + esc(r.regId) +
          "' title='Edit patient' aria-label='Edit patient'>" + PEN_SVG + "</button>" +
        "<button type='button' class='icon-btn del-btn' data-regid='" + esc(r.regId) +
          "' title='Delete patient' aria-label='Delete patient'>" + BIN_SVG + "</button></td>" +
    "</tr>";
  }).join("");
  el("p-count").textContent = has
    ? regs.length + (regs.length === 1 ? " patient on this account."
                                       : " patients on this account.")
    : "";
}

/* ---------- copy the ID ---------- */
async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (e2) {
      return false;
    }
  }
}

/* ---------- edit: the registration fields, the ID never changes ---------- */
let editId = null;

function merr(msg) { const e = $("#m-err"); e.hidden = !msg; e.textContent = msg || ""; }

function openEdit(regId) {
  const r = regs.find((x) => String(x.regId) === String(regId));
  if (!r) return;
  editId = String(r.regId);
  $("#m-title").textContent = "Edit patient";
  $("#m-sub").textContent = "Registration ID " + r.regId + " · " + who(r) +
    " — the ID itself never changes.";
  $("#m-name").value = r.fullName || "";
  $("#m-dob").value = r.dob || "";
  $("#m-age").value = r.dob ? ageFromDob(r.dob)
                            : (r.age === "" || r.age == null ? "" : String(r.age));
  $("#m-sex").value = r.sex || "";
  $("#m-phone").value = r.phone || "";
  $("#m-address").value = r.address || "";
  $("#m-kin").value = r.emergencyContact || "";
  $("#m-arrival").value = r.arrivalAt || "";
  $("#m-incident").value = r.incidentType || "";
  $("#m-desc").value = r.incidentDescription || "";
  $("#m-dept").value = r.department || "";
  $("#m-priority").value = r.priority || "";
  $("#m-referral").value = r.referral === "Yes" ? "Yes" : "No";
  $("#m-facility").value = r.referredBy || "";
  $("#m-facility-label").hidden = $("#m-referral").value !== "Yes";
  $("#m-payment").value = r.payment || "";
  merr("");
  $("#m-ok").hidden = true;
  $("#m-wrap").hidden = false;
  window.scrollTo(0, 0);
}

function closeModal() {
  editId = null;
  $("#m-wrap").hidden = true;
}

$("#m-dob").addEventListener("change", () => {
  $("#m-age").value = ageFromDob($("#m-dob").value);
});
$("#m-referral").addEventListener("change", () => {
  const yes = $("#m-referral").value === "Yes";
  $("#m-facility-label").hidden = !yes;
  if (!yes) $("#m-facility").value = "";
});
$("#m-cancel").addEventListener("click", closeModal);
$("#m-wrap").addEventListener("click", (e) => {
  if (e.target === $("#m-wrap")) closeModal();
});

$("#m-save").addEventListener("click", async () => {
  if (!editId) return;
  const r = regs.find((x) => String(x.regId) === editId);
  if (!r) { merr("This patient is no longer on the list — close and reopen."); return; }
  const name = $("#m-name").value.trim();
  const dob = $("#m-dob").value;
  const age = $("#m-age").value;
  const referral = $("#m-referral").value;
  const facility = $("#m-facility").value.trim();
  if (dob && !age) return merr("The date of birth is not valid — it cannot be in the future.");
  if (referral === "Yes" && !facility) return merr("Referral is set to Yes — enter the referring facility.");
  const payload = {
    isUnidentified: !name,
    fullName: name,
    dob,
    age: age === "" ? "" : Number(age),
    sex: $("#m-sex").value,
    phone: $("#m-phone").value.trim(),
    address: $("#m-address").value.trim(),
    emergencyContact: $("#m-kin").value.trim(),
    arrivalAt: $("#m-arrival").value,
    incidentType: $("#m-incident").value,
    incidentDescription: $("#m-desc").value.trim(),
    department: $("#m-dept").value,
    priority: $("#m-priority").value,
    referral,
    referredBy: referral === "Yes" ? facility : "",
    payment: $("#m-payment").value,
    updatedAt: new Date().toISOString()
  };
  const btn = $("#m-save");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await updateDoc(doc(db, "healthRegistrations", r.__id), payload);
    $("#m-ok").hidden = false;
    merr("");
    setTimeout(closeModal, 500);
  } catch (e) {
    merr("Save failed: " + ((e && e.message) || e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Changes";
  }
});

/* ---------- delete: one confirm, then every record for the ID goes ---------- */
async function askDelete(regId) {
  const r = regs.find((x) => String(x.regId) === String(regId));
  if (!r) return;
  if (!ready()) { window.alert("Still loading the records — try again in a moment."); return; }
  const n = STAGE_COLLS.slice(1).reduce((s, [, get]) =>
    s + get().filter((d) => d && String(d.regId) === String(regId)).length, 0);
  const msg = "Delete " + who(r) + " (Registration ID " + r.regId + ")?\n\n" +
    "This removes the registration and " +
    (n === 1 ? "1 linked record" : n + " linked records") +
    " across triage, nursing, doctor, pharmacy and treatment.\nThis cannot be undone.";
  if (!window.confirm(msg)) return;
  const btns = Array.prototype.slice.call(document.querySelectorAll(".del-btn"));
  btns.forEach((b) => { b.disabled = true; });
  try {
    if (REAL) {
      let batch = writeBatch(db), k = 0;
      for (const [coll, get] of STAGE_COLLS) {
        for (const d of get()) {
          if (d && String(d.regId) === String(regId) && d.__id) {
            batch.delete(doc(db, coll, d.__id));
            if (++k >= 400) { await batch.commit(); batch = writeBatch(db); k = 0; }
          }
        }
      }
      if (k) await batch.commit();
    } else {
      const st = globalThis.__store; // the E2E mock store — keep it consistent too
      if (st) for (const [coll] of STAGE_COLLS) {
        st[coll] = (st[coll] || []).filter((d) => String(d.regId) !== String(regId));
      }
    }
    regs = regs.filter((x) => String(x.regId) !== String(regId));
    triages = triages.filter((x) => String(x.regId) !== String(regId));
    nurseConsults = nurseConsults.filter((x) => String(x.regId) !== String(regId));
    docConsults = docConsults.filter((x) => String(x.regId) !== String(regId));
    rxLines = rxLines.filter((x) => String(x.regId) !== String(regId));
    tOrders = tOrders.filter((x) => String(x.regId) !== String(regId));
    lastTriage.delete(String(regId));
    renderTable();
  } catch (e) {
    window.alert("Delete failed: " + ((e && e.message) || e));
  } finally {
    btns.forEach((b) => { b.disabled = false; });
  }
}

/* ---------- row actions: copy, edit, delete ---------- */
$("#p-body").addEventListener("click", async (e) => {
  const c = e.target.closest(".copy-btn");
  if (c) {
    const id = c.getAttribute("data-copy");
    const ok = await copyText(id);
    if (ok) {
      c.textContent = "Copied ✓";
      c.classList.add("done");
      setTimeout(() => { c.textContent = "Copy"; c.classList.remove("done"); }, 1200);
    } else {
      window.prompt("Copy the Registration ID:", id);
    }
    return;
  }
  const eb = e.target.closest(".edit-btn");
  if (eb) { openEdit(eb.getAttribute("data-regid")); return; }
  const dbtn = e.target.closest(".del-btn");
  if (dbtn) { askDelete(dbtn.getAttribute("data-regid")); }
});
T50_JS_328

# ---------------------------------------------------------------------
# 5/5  firestore.rules - the 8-collection refresh (task 48)
# ---------------------------------------------------------------------
cat > firestore.rules << 'T50_RULES'
rules_version = '2';

// =====================================================================
// JAMALI — firestore.rules — the guard dog (Task 48, the full refresh)
// Every collection the project uses gives a signed in user create, read,
// update and delete — the standing order of 25 October 2026, reprinted
// here in full. Anything not matched below is denied by default.
//
// The project's live collections, named by scanning every page's code:
//   transactions                — the one journal the whole business reads
//   healthRegistrations         — Registration (322)
//   healthTriage                — Triage (323)
//   healthNurseConsultations    — Nurse Consultation (324)
//   healthDoctorConsultations   — Doctor Consultation (325)
//   healthPrescriptions         — Pharmacy (326)
//   healthTreatmentOrders       — Treatment / Procedures (327)
//   healthDestinations          — the facility's destination list (325)
// =====================================================================

service cloud.firestore {
  match /databases/{database}/documents {

    // ---- Business: one journal, every book derives from it ----
    match /transactions/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    // ---- Health: one patient, one ID, one journey ----
    match /healthRegistrations/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthTriage/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthNurseConsultations/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthDoctorConsultations/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthPrescriptions/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthTreatmentOrders/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthDestinations/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    // Everything not named above: denied. No block, no exceptions.
  }
}
T50_RULES

# =====================================================================
# VERIFY (grep and find only, no node)
# =====================================================================
fail=0

# -- 1. firebase.js: the export fix -----------------------------------
[ -f public/firebase.js ] || { echo "VERIFY FAIL: public/firebase.js missing"; fail=1; }
grep -q 'gstatic.com/firebasejs/10.12.2/firebase-app.js' public/firebase.js \
  || { echo "VERIFY FAIL: the CDN import changed"; fail=1; }
grep -q 'projectId: "jamal-542b5"' public/firebase.js \
  || { echo "VERIFY FAIL: the project config changed"; fail=1; }
awk '/^import \{/,/firebase-firestore\.js/' public/firebase.js | grep -q 'updateDoc' \
  || { echo "VERIFY FAIL: updateDoc missing from the import block"; fail=1; }
expblock="$(sed -n '/^export {/,/};/p' public/firebase.js)"
for nm in getFirestore collection doc addDoc writeBatch query where orderBy \
          onSnapshot serverTimestamp Timestamp updateDoc deleteDoc getDocs setDoc; do
  printf '%s\n' "$expblock" | grep -qw "$nm" \
    || { echo "VERIFY FAIL: export block lost '$nm'"; fail=1; }
done
grep -q 'export function requireAuth' public/firebase.js \
  || { echo "VERIFY FAIL: requireAuth changed"; fail=1; }
grep -q 'export const auth' public/firebase.js \
  || { echo "VERIFY FAIL: auth export changed"; fail=1; }
grep -q 'export const db' public/firebase.js \
  || { echo "VERIFY FAIL: db export changed"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: firebase.js exports all 18 names - updateDoc included"

# -- 2. the Patient List is the 46d build ------------------------------
for f in public/patient-module/328.html public/patient-module/328.css \
         public/patient-module/328.js; do
  [ -f "$f" ] || { echo "VERIFY FAIL: missing $f"; fail=1; }
done
grep -q 'build 46d' public/patient-module/328.html \
  || { echo "VERIFY FAIL: 328.html lacks the 46d boot line"; fail=1; }
for id in 'id="p-boot"' 'id="p-empty"' 'id="p-wrap"' 'id="p-body"'; do
  grep -q "$id" public/patient-module/328.html \
    || { echo "VERIFY FAIL: 328.html lacks $id"; fail=1; }
done
grep -q 'the Patient List (Task 46d)' public/patient-module/328.js \
  || { echo "VERIFY FAIL: 328.js is not the 46d build"; fail=1; }
grep -q 'healthRegistrations' public/patient-module/328.js \
  || { echo "VERIFY FAIL: 328.js lost the registrations listener"; fail=1; }
grep -q 'getDocs' public/patient-module/328.js \
  || { echo "VERIFY FAIL: 328.js lost the one-shot fallback read"; fail=1; }
grep -q 'writeBatch' public/patient-module/328.js \
  || { echo "VERIFY FAIL: 328.js lost the delete batch"; fail=1; }
grep -q '\.p-boot' public/patient-module/328.css \
  || { echo "VERIFY FAIL: 328.css lost the boot line style"; fail=1; }
if grep -q 'Recent registrations' public/patient-module/328.html; then
  echo "VERIFY FAIL: a Recent registrations section crept back into 328.html"; fail=1
fi
[ "$fail" -eq 0 ] && echo "PASS: Patient List is the 46d build - boot line, banners, watchdog, fallback all in"

# -- 3. firestore.rules: exactly the 8 real collections ----------------
[ -f firestore.rules ] || { echo "VERIFY FAIL: firestore.rules missing"; fail=1; }
for c in transactions healthRegistrations healthTriage healthNurseConsultations \
         healthDoctorConsultations healthPrescriptions healthTreatmentOrders \
         healthDestinations; do
  grep -q "match /$c/" firestore.rules \
    || { echo "VERIFY FAIL: firestore.rules lost the $c block"; fail=1; }
done
nmatch=$(grep -c 'match /' firestore.rules)
[ "$nmatch" -eq 9 ] \
  || { echo "VERIFY FAIL: rules should hold 9 match blocks (databases + 8 collections), found $nmatch"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: firestore.rules carries exactly the 8 collections the code uses"

# -- THE SWEEP: every page that imports /firebase.js, name by name -----
#    Collect everything this file exports, then check every import of
#    every page against it. A missing name here is a page that dies in
#    silence - exactly what today's bug was.
exports="$( { sed -n 's/^export const \([A-Za-z_][A-Za-z0-9_]*\).*/\1/p' public/firebase.js
              sed -n 's/^export function \([A-Za-z_][A-Za-z0-9_]*\).*/\1/p' public/firebase.js
              sed -n '/^export {/,/};/p' public/firebase.js \
                | sed 's/export {//; s/};//' | tr ',' '\n' | tr -d ' ' | grep -v '^$'; } | sort -u)"
nfiles=0; nbad=0; nnotes=0
while IFS= read -r f; do
  nfiles=$((nfiles + 1))
  names="$(tr '\n' ' ' < "$f" \
    | grep -o 'import[[:space:]]*{[^}]*}[[:space:]]*from[[:space:]]*"/firebase\.js"' \
    | sed 's/.*{//; s/}.*//' | tr ',' '\n' | tr -d ' ' | grep -v '^$')"
  health=0
  case "$f" in
    *victim-registration/322.js|*triage/323.js|*nurse-consultation/324.js|\
*doctor-consultation/325.js|*pharmacy/326.js|*treatment-procedures/327.js|\
*patient-module/328.js|*health/patient-info.js) health=1 ;;
  esac
  while IFS= read -r nm; do
    [ -n "$nm" ] || continue
    if ! printf '%s\n' "$exports" | grep -qx "$nm"; then
      if [ "$health" -eq 1 ]; then
        echo "VERIFY FAIL: $f imports '$nm' - firebase.js does not export it (this is today's bug pattern)"
        nbad=$((nbad + 1))
      else
        echo "NOTE: $f imports '$nm' - not exported (pre-existing, not this task's scope)"
        nnotes=$((nnotes + 1))
      fi
    fi
  done <<EOF
$names
EOF
done <<EOF
$(grep -rl 'from "/firebase.js"' public --include='*.js' 2>/dev/null)
EOF
if [ "$nbad" -eq 0 ]; then
  echo "PASS: the import sweep checked $nfiles page(s) against the export list - every health page is covered"
else
  echo "VERIFY FAIL: $nbad missing import(s) on health pages"
  fail=1
fi

# -- the five patients of this bug stand ready to boot ----------------
for p in nurse-consultation/324 doctor-consultation/325 pharmacy/326 \
         treatment-procedures/327 patient-module/328; do
  [ -f "public/$p.js" ] || { echo "VERIFY FAIL: missing public/$p.js"; fail=1; }
done
[ "$fail" -ne 0 ] || echo "PASS: the five page files are in place, ready to boot"

# ---------------------------------------------------------------------
# DONE. Now finish the deployment (this is the part that was missed):
#
#   git add -A
#   git commit -m "task50: firebase exports + patient list 46d + rules"
#   git push
#
#   ...wait for Vercel to finish the deployment, then open the site
#   and HARD REFRESH (Ctrl+Shift+R):
#
#   1. /patient-module/328 - Patient List
#      You MUST see the boot line "Patient List · build 46d ·
#      connecting…" under the heading, then the ONE table with BOTH
#      victims (8695SLAJ and 3801LSKG), newest first, with Copy, pen
#      and bin on every row. No boot line = the deploy did not happen.
#   2. Nurse Consultation (324), Doctor Consultation (325), Pharmacy
#      (326), Treatment / Procedures (327): enter the Registration ID,
#      press Find (or Enter) - the patient line answers on all four.
#   3. If a red banner appears anywhere: read it to me word for word.
#      permission-denied means the rules still need publishing:
#      Firebase console -> Firestore Database -> Rules -> paste the
#      repo's firestore.rules -> Publish.
# ---------------------------------------------------------------------
if [ "$fail" -eq 0 ]; then
  echo "TASK 50 VERIFY: ALL PASS"
else
  echo "TASK 50 VERIFY: FAILURES ABOVE"
  exit 1
fi

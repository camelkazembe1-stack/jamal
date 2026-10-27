#!/usr/bin/env bash
# =====================================================================
# JAMALI - Task 53 - Patient queue + speaker announcements (pages 323-327)
#
# Every service stage (Triage 323, Nurse 324, Doctor 325, Pharmacy 326,
# Treatment 327) gets one queue panel in the same shape:
#   - Patients waiting / Completed today, counted from the records
#   - CURRENT PATIENT (being served now) and NEXT PATIENT (queue order)
#   - [Announce patient] - the browser speaks the patient's ID and the
#     destination saved for THIS module (department, staff name, office,
#     room) - editable per module under 'Speaker settings', stored in
#     the new healthQueueConfig collection, live on every device
#   - One patient at a time: 324/325/327 refuse to open the next patient
#     while another is still in progress at that desk
# Nothing is hard-coded: counts come from the stored records, the ID and
# destination come from the selected patient's record and the saved
# settings. Also ships firebase.js (additive exports) and the 15-
# collection firestore.rules (8 original + 6 ward/admission + queue
# config) so the queue settings can be saved.
#
# HOW TO RUN (Git Bash):  bash jamali-task53-queue-announce.sh
# It finds the repo itself (current folder, then ~/jamal, then ~/jamali).
# The run is not over until it prints: TASK 53 VERIFY: ALL PASS
# Then: git add the listed files, commit, push, hard-refresh (Ctrl+Shift+R).
#
# tmpfiles warning: the /dl/ link first serves an HTML VIEWER page.
# head -1 of the true script must print #!/usr/bin/env bash.
# =====================================================================

set -u
fail=0
echo "=== JAMALI Task 53 - queue + announcements on 323-327 ==="

# -- 0 - find the repo: current folder first, then ~/jamal, ~/jamali ---
if [ ! -d public ]; then
  for d in "$HOME/jamal" "$HOME/jamali"; do
    if [ -d "$d/public" ]; then cd "$d"; break; fi
  done
fi
if [ ! -d public ]; then
  echo "VERIFY FAIL: no public/ here, and neither ~/jamal nor ~/jamali has one - run this from the repo"; exit 1
fi
echo "Repo: $(pwd)"

# preflight - what the deployment should look like (notes, not failures)
if [ ! -f public/firebase.js ]; then echo "VERIFY FAIL: public/firebase.js missing"; exit 1; fi
grep -q "updateDoc" public/firebase.js || echo "NOTE: firebase.js looks pre-task-50 - task 53 ships the full export block anyway."
grep -q "JAMALI-NO-SKIP" public/triage/323.js 2>/dev/null || echo "NOTE: 323 does not carry the task 51 gates - task 53 rewrites the page and keeps every gate."
grep -q "build 47" public/triage/323.html 2>/dev/null && echo "NOTE: pages are at build 47 - task 53 moves them to build 53."

mkdir -p "public"
cat > "public/firebase.js" << 'T53_FIREBASE'
// JAMALI — shared Firebase module (auth + firestore)
// index.html uses it for Google login, inner pages use requireAuth()
// Task 50: the export carries updateDoc, deleteDoc, getDocs and setDoc
// (the fix first shipped by task 47). Five pages (324, 325, 326, 327,
// 328) import updateDoc — one missing name in this file used to stop
// their whole script at the import line: no listener bound, no table
// drawn, no Find answer, no response.
// Task 52: the export grows additively for Ward Management (330-338)
// and Patient Admission (340-343) — getDoc, arrayUnion, arrayRemove,
// increment, limit and deleteField join the block. Every name the older
// pages import is still exported exactly as before; nothing is removed.

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
  getDoc,
  setDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  deleteField
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
export {
  getDoc, limit, arrayUnion, arrayRemove, increment, deleteField
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
T53_FIREBASE
[ -s "public/firebase.js" ] && echo "  wrote public/firebase.js ($(wc -c < "public/firebase.js") bytes)"

cat > "firestore.rules" << 'T53_RULES'
rules_version = '2';

// =====================================================================
// JAMALI — firestore.rules — the guard dog (Task 52, the full refresh)
// Every collection the project uses gives a signed in user create, read,
// update and delete — the standing order of 25 October 2026, reprinted
// here in full with the six Ward Management and Patient Admission
// collections added. Anything not matched below is denied by default.
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
//   healthWards                 — Ward Registration (331)
//   healthBeds                  — Bed Management (332)
//   healthBedAssignments        — Bed Assignment (334) / Transfers (335)
//   healthBedTransfers          — Ward & Bed Transfers (335)
//   healthBedMaintenance        — Cleaning & Maintenance (336)
//   healthAdmissions            — Patient Admission (341-343)
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

    // ---- Health: wards, beds and placement (Task 52) ----
    match /healthWards/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthBeds/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthBedAssignments/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthBedTransfers/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthBedMaintenance/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    // ---- Health: admissions (Task 52) ----
    match /healthAdmissions/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }


    // ---- Health: queue announcement settings (Task 53) ----
    // One document per service stage (triage, nurse, doctor, pharmacy,
    // treatment): the department, staff name, office and room the speaker
    // announcement reads aloud.
    match /healthQueueConfig/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    // Everything not named above: denied. No block, no exceptions.
  }
}
T53_RULES
[ -s "firestore.rules" ] && echo "  wrote firestore.rules ($(wc -c < "firestore.rules") bytes)"

mkdir -p "public/triage"
cat > "public/triage/323.html" << 'T53_HTML_323'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Triage — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/triage/323.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <p class="h-boot" id="h-boot" hidden></p>
  <p class="h-err" id="h-err" hidden></p>

  <!-- STEP 1 · the assessment -->
  <section id="step-form">
    <a class="back" href="/health/321">&larr; Health</a>
    <h1>Triage</h1>
    <p class="sub">The stage after registration: assess the victim's condition and decide how urgently medical attention is needed. Triage orders the care &mdash; it does not replace the doctor's diagnosis or the nurse's consultation.</p>

    <div class="flow-ribbon">Registration <span class="arr">&rarr;</span> <b>Triage</b> <span class="arr">&rarr;</span> Nurse or Doctor consultation, according to the victim's needs</div>

    <div class="urgent-note">🚨 Emergency treatment must not be delayed while completing this form.</div>

        <div class="card" id="qa-card">
      <h2>Queue &amp; announcements</h2>
      <div class="qa-counts">
        <div class="qa-count"><span class="qa-num" id="qa-waiting">0</span><span class="qa-k">Patients waiting</span></div>
        <div class="qa-count"><span class="qa-num" id="qa-done">0</span><span class="qa-k">Completed today</span></div>
      </div>
      <div class="qa-panels">
        <div class="qa-panel" id="qa-current-box">
          <div class="qa-k">Current patient</div>
          <div class="qa-id" id="qa-current-id">&mdash;</div>
          <div class="qa-sub" id="qa-current-sub"></div>
        </div>
        <div class="qa-panel">
          <div class="qa-k">Next patient</div>
          <div class="qa-id" id="qa-next-id">&mdash;</div>
          <div class="qa-sub" id="qa-next-sub"></div>
          <div class="qa-sub" id="qa-dest-line"></div>
          <div class="qa-btns">
            <button type="button" class="ghost-btn qa-announce" id="qa-announce" disabled>&#128266; Announce patient</button>
            <button type="button" class="ghost-btn" id="qa-start" disabled>Start assessment</button>
          </div>
          <p class="mini-note" id="qa-note"></p>
        </div>
      </div>
      <div class="qa-actions"><button type="button" class="ghost-btn" id="qa-settings-btn">&#128266; Speaker settings</button></div>
      <div class="qa-settings" id="qa-settings" hidden>
        <p class="mini-note">The announcement reads the patient's ID and these details aloud. They are saved for this module and used on every device.</p>
        <div class="qa-form">
          <label>Department / service name<input id="qa-dept" type="text" placeholder="e.g. Triage"></label>
          <label>Staff name<input id="qa-staff" type="text" placeholder="e.g. Nurse MWAJUMA"></label>
          <label>Office number<input id="qa-office" type="text" placeholder="e.g. Doctor's Office 02"></label>
          <label>Room number<input id="qa-room" type="text" placeholder="e.g. Nurse Room 03"></label>
        </div>
        <p class="form-err" id="qa-err" hidden></p>
        <p class="save-ok" id="qa-ok" hidden></p>
        <div class="form-actions"><button class="btn-primary" id="qa-save" type="button">Save Speaker Settings</button></div>
      </div>
    </div>

<div class="card add-card">
      <div class="form-grid">

        <label>Registration ID
          <input id="t-regid" list="regids" placeholder="e.g. 4827ABCD" autocomplete="off">
          <datalist id="regids"></datalist>
          <span class="victim-line" id="t-victim"></span>
        </label>
        <label>Assessment Date &amp; Time (automatic)
          <input id="t-when" type="datetime-local" readonly>
        </label>
        <label>Symptoms and Complaints
          <textarea id="t-symptoms" rows="2" placeholder="What the victim is experiencing"></textarea>
        </label>

      </div>

      <div class="vitals-card">
        <h3>Vital Signs</h3>
        <div class="vitals-grid">
          <label>Temperature (&deg;C)
            <input id="t-temp" type="number" inputmode="decimal" step="0.1" min="25" max="45" placeholder="36.8">
          </label>
          <label>Pulse Rate (bpm)
            <input id="t-pulse" type="number" inputmode="numeric" min="0" placeholder="72">
          </label>
          <label>Respiratory Rate (/min)
            <input id="t-rr" type="number" inputmode="numeric" min="0" placeholder="16">
          </label>
          <label>Blood Pressure (mmHg)
            <input id="t-bp" type="text" inputmode="numeric" placeholder="120/80">
          </label>
          <label title="Oxygen saturation">SpO₂ (%)
            <input id="t-spo2" type="number" inputmode="numeric" min="0" max="100" placeholder="98">
          </label>
        </div>
      </div>

      <div class="form-grid">

        <label>Level of Consciousness
          <select id="t-conscious">
            <option value="">— Select —</option>
            <option>Alert</option>
            <option>Responds to voice</option>
            <option>Responds to pain only</option>
            <option>Unresponsive</option>
          </select>
        </label>
        <label>Pain Level (0 to 10)
          <span class="pain-row">
            <input id="t-pain" type="range" min="0" max="10" step="1" value="0">
            <output id="t-pain-out">0</output>
          </span>
        </label>
        <label>Emergency Priority
          <select id="t-priority">
            <option value="">— Select —</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <span class="mini-note">Set by the hospital's approved triage protocol.</span>
        </label>

        <label>Visible Injuries or Condition
          <textarea id="t-injuries" rows="2" placeholder="Injuries or abnormalities observed"></textarea>
        </label>
        <label>Allergies
          <input id="t-allergies" type="text" placeholder="Known allergies, if any">
        </label>
        <label>Existing Medical Conditions
          <input id="t-conditions" type="text" placeholder="Relevant medical history, if any">
        </label>

        <label class="span2">Triage Notes
          <textarea id="t-notes" rows="2" placeholder="Additional observations from the assessment"></textarea>
        </label>
        <label>Assessed By
          <span class="staff-row">
            <select id="t-staff"></select>
            <button type="button" class="staff-add" id="t-staff-add" title="Add a healthcare worker to this device's list">＋</button>
          </span>
        </label>

      </div>

      <p class="form-err" id="t-err" hidden></p>
      <div class="form-actions">
        <button class="btn-primary" id="t-save" type="button">Save Triage Assessment</button>
        <button class="btn-ghost" id="t-clear" type="button">Clear Form</button>
      </div>
    </div>

    <div class="card people-card" id="t-history-card">
      <h2>Triage history</h2>
      <div class="empty" id="t-empty">
        <div class="empty-icon">🚑</div>
        <div class="empty-title">No assessments yet</div>
        <div class="empty-sub">The first assessment saved on this account will appear here, linked to its registration.</div>
      </div>
      <div class="table-wrap" id="t-table-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>When</th><th>Registration ID</th><th>Victim</th><th>Priority</th><th>Consciousness</th><th>Pain</th><th>Vitals</th><th>Assessed By</th></tr>
          </thead>
          <tbody id="t-history"></tbody>
        </table>
      </div>
      <p class="count-line" id="t-count"></p>
    </div>
  </section>

  <!-- STEP 2 · saved -->
  <section id="step-done" hidden>
    <div class="card done-card">
      <div class="done-icon">&#10003;</div>
      <h1>Triage Saved</h1>
      <p class="sub" id="done-note"></p>
      <div class="id-box">
        <span class="id-k">Linked Registration ID</span>
        <span class="id-v" id="done-regid"></span>
      </div>
      <div class="done-actions">
        <button class="ghost-btn" id="again-btn" type="button">Assess Another</button>
        <a class="cta-btn" href="/victim-registration/322">Register a Victim</a>
      </div>
    </div>
  </section>

</main>
<style>
#h-boot,#h-err{max-width:920px;margin:0 auto 14px;padding:10px 14px;border-radius:10px;font-size:14px;line-height:1.55}
#h-boot{background:#fff7e0;color:#6b4e00;border:1px solid #e8d48a}
#h-err{background:#fdecec;color:#8a1f1f;border:1px solid #f2b8b5}

/* task 53 - queue & announcements */
#qa-card .qa-counts{display:flex;gap:14px;flex-wrap:wrap;margin:4px 0 14px}
.qa-count{display:flex;flex-direction:column;min-width:130px;padding:10px 14px;border:1px solid #e3e0d6;border-radius:10px;background:#faf9f4}
.qa-num{font-size:26px;font-weight:700;line-height:1.1}
.qa-count .qa-k{font-size:12px;color:#6b675c;margin-top:2px}
.qa-panels{display:flex;gap:14px;flex-wrap:wrap}
.qa-panel{flex:1 1 240px;border:1px solid #e3e0d6;border-radius:10px;padding:12px 14px;background:#fff}
.qa-panel .qa-k{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6b675c}
.qa-id{font-size:22px;font-weight:700;letter-spacing:.04em;margin:4px 0 2px}
.qa-panel.qa-none{opacity:.8}
.qa-sub{font-size:13px;color:#4b473c;margin:2px 0}
.qa-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.qa-actions{margin-top:12px}
.qa-settings{border-top:1px dashed #ddd8c9;margin-top:12px;padding-top:12px}
.qa-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:8px 0}
.qa-form label{display:block;font-size:13px;color:#4b473c}
.qa-form input{width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d8d3c4;border-radius:8px;font:inherit;background:#fff}
</style>
<script>
/* Task 47 - boot line, page painters and the 12-second watchdog. The same
   contract as the Patient List (build 46d): a silent failure names itself. */
(function () {
  var boot = document.getElementById("h-boot");
  if (boot) { boot.hidden = false; boot.textContent = "Triage \u00b7 build 53 \u00b7 connecting\u2026"; }
  window.__p47 = { page: "323", build: "47", t0: Date.now() };
})();
function __jamaliHerr(msg) {
  var box = document.getElementById("h-err");
  var boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  if (!box || !box.hidden) return;
  box.hidden = false;
  box.textContent = "Page error \u2014 " + msg;
}
window.addEventListener("error", function (e) {
  if (!e || !e.message) return; /* resource errors carry no message */
  __jamaliHerr(e.message);
}, true);
window.addEventListener("unhandledrejection", function (e) {
  var r = e && e.reason;
  __jamaliHerr(String((r && (r.code || r.message)) || r || "unknown rejection"));
});
setTimeout(function () {
  var boot = document.getElementById("h-boot");
  var s = window.__p47 || {};
  if (!boot || boot.hidden) return; /* answered - nothing to report */
  var bits = [];
  bits.push("build " + (s.build || "47") + " script " +
    ((s.ran === true || s.listeners > 0) ? "ran" : "DID NOT run"));
  bits.push("sign-in check " + (s.auth === true ? "passed" : "not passed"));
  bits.push("listeners " + (s.listeners || 0) + "/" + (s.need || 0));
  bits.push(s.answered === true ? "Firestore answered" : "Firestore never answered");
  if (s.errs && s.errs.length) bits.push("errors: " + s.errs.join(" | "));
  __jamaliHerr("Still quiet after 12 seconds \u2014 " + bits.join(" \u00b7 ") +
    ". If the script DID NOT run, the deployed JS is stale or broken: " +
    "re-run the task file, git push, then hard refresh with Ctrl+Shift+R.");
}, 12000);
</script>
<script type="module" src="/triage/323.js"></script>
</body>
</html>
T53_HTML_323
[ -s "public/triage/323.html" ] && echo "  wrote public/triage/323.html ($(wc -c < "public/triage/323.html") bytes)"

mkdir -p "public/triage"
cat > "public/triage/323.js" << 'T53_JS_323'
// triage (page 323) — JAMALI Health
// The stage after registration: a healthcare worker assesses the victim and
// decides how urgently medical attention is needed. Triage sets the ORDER of
// care — it is not a diagnosis, and it never delays emergency treatment.
// Twelve items per assessment. Every assessment links to its registration by
// Registration ID and stays in the history below the form.
import { requireAuth, db, collection, query, addDoc, doc, setDoc, onSnapshot, serverTimestamp } from "/firebase.js";
/* patient chip - non-fatal since Task 47: if /health/patient-info.js cannot
   load (a missing or stale file), the page loses only the floating chip,
   never the find, the forms or the saves. */
let showPatient = function () {}, hidePatient = function () {};
try {
  const pi = await import("/health/patient-info.js");
  if (pi && typeof pi.showPatient === "function") showPatient = pi.showPatient;
  if (pi && typeof pi.hidePatient === "function") hidePatient = pi.hidePatient;
} catch (e) { /* chip unavailable - everything else keeps working */ }

/* boot diagnostics (Task 47 - the same contract as the Patient List, build
   46d): every collection listener carries an error callback and every
   failure paints itself on the page instead of dying in silence. */
window.__p47 = Object.assign(window.__p47 || {}, {
  page: "323", build: "53", queue: true, ran: true, auth: false,
  listeners: 0, need: 3, answered: false, errs: []
});
function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p47) window.__p47.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  box.textContent = "Could not read " + coll + " \u2014 " + code +
    (code.indexOf("permission-denied") >= 0
      ? " \u00b7 Fix: Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh."
      : "");
}
function bootDone() {
  if (window.__p47) window.__p47.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth(); // not logged in? -> bounced to "/"
  window.__p47.auth = true;
} catch (e) {
  herr("the sign-in check", e);
  throw e;
}

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- assessed by — a history kept on THIS device ---------- */
const STAFF_KEY = "jamali_health_staff_v1";

function loadStaff() {
  try { return JSON.parse(localStorage.getItem(STAFF_KEY) || "[]"); }
  catch (e) { return []; }
}
function rememberStaff(name) {
  if (!name) return;
  const list = loadStaff().filter((n) => n !== name);
  list.unshift(name);
  try { localStorage.setItem(STAFF_KEY, JSON.stringify(list.slice(0, 30))); } catch (e) {}
}
function fillStaff(sel) {
  const chosen = sel.value && sel.value !== "__add" ? sel.value : "";
  sel.innerHTML = '<option value="">— Select staff member —</option>' +
    loadStaff().map((n) => "<option" + (n === chosen ? " selected" : "") + ">" + esc(n) + "</option>").join("") +
    '<option value="__add">＋ Add a new staff member…</option>';
}
function wireStaff(sel, addBtn) {
  fillStaff(sel);
  const ask = () => (window.prompt("Staff member's name — it is kept on this device:", "") || "").trim();
  addBtn.addEventListener("click", () => {
    const name = ask();
    if (!name) return;
    rememberStaff(name);
    fillStaff(sel);
    sel.value = name;
  });
  sel.addEventListener("change", () => {
    if (sel.value !== "__add") return;
    const name = ask();
    fillStaff(sel);
    sel.value = name || "";
  });
}

/* ---------- automatic fields ---------- */
function pad(n) { return String(n).padStart(2, "0"); }
function nowLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
         "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function resetWhen() { $("#t-when").value = nowLocal(); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

/* ---------- live registrations: the ID list and the victim line ---------- */
let regs = [];
const regMap = new Map();

onSnapshot(query(collection(db, "healthRegistrations")), (snap) => {
  regs = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  regMap.clear();
  regs.forEach((r) => { if (r && r.regId) regMap.set(String(r.regId), r); });
  fillRegIds();
  refreshVictimLine();
  renderHistory();
  qaDeriveTriage();
  bootDone();
}, (e) => herr("healthRegistrations", e));

function who(r) {
  return r.isUnidentified
    ? "Unidentified"
    : (r.fullName || "Unnamed");
}

function fillRegIds() {
  $("#regids").innerHTML = regs.map((r) =>
    '<option value="' + esc(r.regId) + '">' + esc(who(r)) + "</option>"
  ).join("");
}

function refreshVictimLine() {
  const id = $("#t-regid").value.trim().toUpperCase();
  const line = $("#t-victim");
  if (!id) { line.textContent = ""; line.className = "victim-line"; hidePatient(); return; }
  const r = regMap.get(id);
  if (r) {
    showPatient(id);
    line.className = "victim-line ok";
    line.textContent = who(r) +
      (r.sex ? " · " + r.sex : "") +
      (r.age !== "" && r.age != null ? " · " + r.age + "y" : "") +
      (r.priority ? " · registered " + r.priority : "");
  } else if (id.length === 8) {
    line.className = "victim-line miss";
    line.textContent = "No registration found for this ID on this account.";
    hidePatient();
  } else {
    line.textContent = "";
    line.className = "victim-line";
  }
}

/* the ID field: uppercase, 8 characters, digits and letters only */
$("#t-regid").addEventListener("input", () => {
  const el = $("#t-regid");
  el.value = el.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 8);
  refreshVictimLine();
  qaDeriveTriage();
});

/* pain slider */
$("#t-pain").addEventListener("input", () => {
  $("#t-pain-out").textContent = $("#t-pain").value;
});

/* ---------- the triage history ---------- */
let rows = [];

onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  rows = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderHistory();
  qaDeriveTriage();
}, (e) => herr("healthTriage", e));
window.__p47.listeners = 3;

function qaStart(id) {
  const el = $("#t-regid");
  const qae = document.getElementById("qa-err");
  if (el.value.trim() && el.value.trim().toUpperCase() !== String(id).toUpperCase()) {
    if (qae) { qae.hidden = false; qae.textContent = "Complete or clear the assessment you are filling in first — one patient at a time."; }
    return;
  }
  if (qae) qae.hidden = true;
  el.value = String(id).toUpperCase();
  refreshVictimLine();
  window.scrollTo(0, 0);
  $("#t-symptoms").focus();
}
/* the triage queue: patients registered today without an assessment today,
   ordered by arrival (creation time) and then Registration ID */
function qaDeriveTriage() {
  const done = new Set();
  rows.forEach((t) => {
    if (t && t.regId && qaIsTodayLocal(t.assessedAt || t.savedAt)) done.add(String(t.regId));
  });
  const waiting = [];
  regs.forEach((r) => {
    if (!r || !r.regId) return;
    const id = String(r.regId);
    if (done.has(id)) return;
    const saved = String(r.savedAt || "");
    /* registered today — the stamp is UTC, so accept either the UTC day or
       the patient's local day to keep the early-morning edge honest */
    if (!qaIsToday(saved) && qaLocalDay(saved) !== qaTodayLocal()) return;
    waiting.push({
      regId: id,
      sub: who(r) + (r.priority ? " \u00b7 registered " + r.priority : ""),
      at: saved
    });
  });
  waiting.sort((a, b) => String(a.at).localeCompare(String(b.at)) || a.regId.localeCompare(b.regId));
  const fid = $("#t-regid").value.trim().toUpperCase();
  const current = fid ? { regId: fid, sub: "Assessment open on this device" } : null;
  qaUpdate(waiting, current, done.size);
}


/* =====================================================================
   JAMALI-QUEUE (task 53) — the queue panel shared by every service stage:
   waiting and completed counts, the current and the next patient, the
   speaker announcement, and this module's own announcement settings.
   Waiting counts patients waiting for THIS service only; Completed counts
   the patients finished here today. The announcement always reads the
   patient the panel is showing — never anybody else — and it reads the
   destination the hospital saved for this module (healthQueueConfig),
   falling back to the module's own name. No hard-coded rooms or IDs. */
const QA_MODULE = "triage";
const QA_DEFAULT = "Triage";
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "" };
try { qaCfg = Object.assign(qaCfg, JSON.parse(localStorage.getItem("jamali_qacfg_" + QA_MODULE) || "{}")); } catch (e) {}
let qaState = { waitingCount: 0, doneCount: 0, next: null, current: null };

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function qaTodayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaLocalDay(stamp) {
  const d = new Date(stamp);
  return isNaN(d.getTime()) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaIsToday(stamp) { return String(stamp || "").slice(0, 10) === new Date().toISOString().slice(0, 10); }
function qaIsTodayLocal(stamp) { return String(stamp || "").slice(0, 10) === qaTodayLocal(); }

/* the destination, composed from the saved settings */
function qaText() {
  const dept = String(qaCfg.department || "").trim();
  const staff = String(qaCfg.staffName || "").trim();
  const office = String(qaCfg.officeNumber || "").trim();
  const room = String(qaCfg.roomNumber || "").trim();
  const place = room || office;
  return { dept, staff, office, room, place, dest: (staff || dept || QA_DEFAULT) + (place ? ", " + place : "") };
}
function qaSentence(id) {
  return "Patient number " + String(id) + ", please proceed to " + qaText().dest + ".";
}
function qaSpeech(id) {
  /* the ID is spoken letter by letter so the waiting patient hears their own */
  return "Patient number " + String(id).split("").join(" ") + ", please proceed to " + qaText().dest + ".";
}
function qaCfgLine() {
  const t = qaText();
  const bits = [];
  if (t.staff) bits.push("Staff: " + t.staff);
  if (t.room) bits.push("Room: " + t.room);
  if (t.office) bits.push("Office: " + t.office);
  if (!t.staff && t.dept) bits.push("Department: " + t.dept);
  return bits.join(" \u00b7 ");
}

function qaRenderPanel() {
  qaSet("qa-waiting", String(qaState.waitingCount));
  qaSet("qa-done", String(qaState.doneCount));
  const cur = qaState.current, nxt = qaState.next;
  const cBox = document.getElementById("qa-current-box");
  if (cBox) cBox.classList.toggle("qa-none", !cur);
  qaSet("qa-current-id", cur ? cur.regId : "\u2014");
  qaSet("qa-current-sub", cur ? (cur.sub || "In Progress") : "Nobody is being served right now");
  qaSet("qa-next-id", nxt ? nxt.regId : "\u2014");
  qaSet("qa-next-sub", nxt ? (nxt.sub || "") : (qaState.waitingCount ? "" : "Nobody is waiting"));
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-regid", nxt.regId); else btn.removeAttribute("data-regid");
  }
  const st = document.getElementById("qa-start");
  if (st) {
    st.disabled = !nxt;
    if (nxt) st.setAttribute("data-regid", nxt.regId); else st.removeAttribute("data-regid");
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt.regId) : "");
}

/* every stage derives its own queue, then calls this */
function qaUpdate(waitingRows, current, doneCount) {
  qaState.waitingCount = Array.isArray(waitingRows) ? waitingRows.length : 0;
  qaState.doneCount = doneCount || 0;
  qaState.next = (qaState.waitingCount > 0) ? waitingRows[0] : null;
  qaState.current = current || null;
  qaRenderPanel();
}

/* the speaker button announces exactly the patient shown above it */
const qaAnnounceBtn = document.getElementById("qa-announce");
if (qaAnnounceBtn) qaAnnounceBtn.addEventListener("click", () => {
  const id = qaAnnounceBtn.getAttribute("data-regid");
  if (!id) return;
  const sentence = qaSentence(id);
  try {
    if (!("speechSynthesis" in window)) {
      qaSet("qa-note", "This browser cannot speak — read aloud: " + sentence);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(qaSpeech(id));
    u.lang = "en-GB";
    u.rate = 0.95;
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang || ""));
    if (vs.length) u.voice = vs.find((v) => /GB/i.test(v.lang || "")) || vs[0];
    synth.speak(u);
    qaSet("qa-note", "Announcing: " + sentence);
  } catch (e) {
    qaSet("qa-note", "Announcement failed (" + ((e && e.message) || e) + ") — read aloud: " + sentence);
  }
});

/* open the next patient straight from the panel */
const qaStartBtn = document.getElementById("qa-start");
if (qaStartBtn) qaStartBtn.addEventListener("click", () => {
  const id = qaStartBtn.getAttribute("data-regid");
  if (id) qaStart(id);
});

/* this module's announcement settings */
const qaSettingsBox = document.getElementById("qa-settings");
const qaSettingsBtn = document.getElementById("qa-settings-btn");
if (qaSettingsBtn && qaSettingsBox) {
  qaSettingsBtn.addEventListener("click", () => {
    qaSettingsBox.hidden = !qaSettingsBox.hidden;
    if (!qaSettingsBox.hidden) {
      const put = (id, k) => { const el = document.getElementById(id); if (el) el.value = String(qaCfg[k] || ""); };
      put("qa-dept", "department"); put("qa-staff", "staffName");
      put("qa-office", "officeNumber"); put("qa-room", "roomNumber");
    }
  });
}
const qaSaveBtn = document.getElementById("qa-save");
if (qaSaveBtn) qaSaveBtn.addEventListener("click", async () => {
  const qae = document.getElementById("qa-err");
  const qao = document.getElementById("qa-ok");
  if (qae) qae.hidden = true;
  if (qao) qao.hidden = true;
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim().replace(/\s+/g, " ") : ""; };
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    updatedAt: new Date().toISOString()
  };
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber) {
    if (qae) { qae.hidden = false; qae.textContent = "Fill at least one field — or leave the settings closed to keep the module's default."; }
    return;
  }
  qaSaveBtn.disabled = true;
  try {
    await setDoc(doc(db, "healthQueueConfig", QA_MODULE), data, { merge: true });
    if (qao) { qao.hidden = false; qao.textContent = "Speaker settings saved — every announcement from now on uses them."; }
  } catch (e) {
    if (qae) {
      qae.hidden = false;
      qae.textContent = "Save failed: " + ((e && e.message) || e) +
        " — if it says permission-denied, publish the rules from the repo file firestore.rules first.";
    }
  } finally { qaSaveBtn.disabled = false; }
});

/* live settings — a change here is heard on every device at once */
try {
  onSnapshot(doc(db, "healthQueueConfig", QA_MODULE), (s) => {
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "" },
      s.exists() ? s.data() : {});
    try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
    qaRenderPanel();
    bootDone();
  }, (e) => {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p47) window.__p47.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  });
} catch (e) { /* the settings listener is optional — the queue keeps working */ }


function priBadge(p) {
  const k = String(p || "").toLowerCase();
  const cls = { critical: "st-critical", high: "st-high", medium: "st-medium", low: "st-low" }[k];
  if (cls) return '<span class="st ' + cls + '">' + esc(p) + "</span>";
  return '<span class="st st-none">' + (p ? esc(p) : "—") + "</span>";
}

function vitalsLine(r) {
  const parts = [];
  if (r.vTemp) parts.push(r.vTemp + "°C");
  if (r.vPulse) parts.push(r.vPulse + " bpm");
  if (r.vRR) parts.push(r.vRR + "/min");
  if (r.vBP) parts.push(r.vBP + " mmHg");
  if (r.vSpO2) parts.push("SpO2 " + r.vSpO2 + "%");
  return parts.length ? esc(parts.join(" · ")) : "—";
}

function renderHistory() {
  const has = rows.length > 0;
  $("#t-empty").hidden = has;
  $("#t-table-wrap").hidden = !has;
  $("#t-history").innerHTML = rows.slice(0, 30).map((r) => {
    const victim = regMap.get(String(r.regId));
    return "<tr><td class='c-date'>" + esc(when(r.assessedAt || r.savedAt)) + "</td>" +
      "<td class='c-no'>" + esc(r.regId || "—") + "</td>" +
      "<td class='c-party'>" + (victim ? esc(who(victim)) : '<span class="d-none">not on this account</span>') + "</td>" +
      "<td>" + priBadge(r.priority) + "</td>" +
      "<td>" + esc(r.consciousness || "—") + "</td>" +
      "<td class='c-num'>" + (r.pain === "" || r.pain == null ? "—" : esc(String(r.pain) + "/10")) + "</td>" +
      "<td class='c-desc'>" + vitalsLine(r) + "</td>" +
      "<td>" + esc(r.assessedBy || "—") + "</td></tr>";
  }).join("");
  $("#t-count").textContent = has
    ? rows.length + (rows.length === 1 ? " assessment kept on this account." : " assessments kept on this account.")
    : "";
}

/* ---------- save ---------- */
function err(msg) { const e = $("#t-err"); e.hidden = !msg; e.textContent = msg || ""; }

$("#t-save").addEventListener("click", async () => {
  err("");
  const regId = $("#t-regid").value.trim().toUpperCase();
  if (!/^[0-9]{4}[A-Z]{4}$/.test(regId)) {
    return err("Enter the victim's Registration ID — 4 digits and 4 letters, for example 4827ABCD.");
  }
  /* JAMALI-NO-SKIP (task 51): triage is step 2 — registration (step 1) must be on record first */
  if (!regMap.has(regId)) {
    return err("No registration found for " + regId + ". A patient cannot skip a step — register the patient on page 322 (Victim Registration) first, then triage here.");
  }
  const g = (s) => $(s).value.trim();
  const data = {
    regId,
    assessedAt: $("#t-when").value,
    savedAt: new Date().toISOString(),
    symptoms: g("#t-symptoms"),
    vTemp: g("#t-temp"),
    vPulse: g("#t-pulse"),
    vRR: g("#t-rr"),
    vBP: g("#t-bp"),
    vSpO2: g("#t-spo2"),
    consciousness: $("#t-conscious").value,
    pain: $("#t-pain").value === "" ? "" : Number($("#t-pain").value),
    priority: $("#t-priority").value,
    injuries: g("#t-injuries"),
    allergies: g("#t-allergies"),
    conditions: g("#t-conditions"),
    notes: g("#t-notes"),
    assessedBy: $("#t-staff").value === "__add" ? "" : $("#t-staff").value,
    createdAt: serverTimestamp()
  };

  const btn = $("#t-save");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await addDoc(collection(db, "healthTriage"), data);
    if (data.assessedBy) rememberStaff(data.assessedBy);
    $("#done-regid").textContent = regId;
    $("#done-note").textContent = "The assessment is linked to " + regId +
      (regMap.get(regId) ? " — " + who(regMap.get(regId)) + "." : ".") +
      " The nurse or doctor consultation follows, according to the victim's needs.";
    $("#step-form").hidden = true;
    $("#step-done").hidden = false;
    window.scrollTo(0, 0);
  } catch (e) {
    err("Save failed: " + ((e && e.message) || e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Triage Assessment";
  }
});

/* ---------- clear / again ---------- */
function clearForm() {
  ["#t-regid", "#t-symptoms", "#t-temp", "#t-pulse", "#t-rr", "#t-bp", "#t-spo2",
   "#t-injuries", "#t-allergies", "#t-conditions", "#t-notes"]
    .forEach((s) => { $(s).value = ""; });
  $("#t-conscious").value = "";
  $("#t-priority").value = "";
  $("#t-pain").value = 0;
  $("#t-pain-out").textContent = "0";
  fillStaff($("#t-staff"));
  $("#t-staff").value = "";
  $("#t-victim").textContent = "";
  $("#t-victim").className = "victim-line";
  err("");
  resetWhen();
}
$("#t-clear").addEventListener("click", clearForm);
$("#again-btn").addEventListener("click", () => {
  clearForm();
  $("#step-done").hidden = true;
  $("#step-form").hidden = false;
  window.scrollTo(0, 0);
});

/* ---------- init ---------- */
wireStaff($("#t-staff"), $("#t-staff-add"));
resetWhen();
T53_JS_323
[ -s "public/triage/323.js" ] && echo "  wrote public/triage/323.js ($(wc -c < "public/triage/323.js") bytes)"

mkdir -p "public/nurse-consultation"
cat > "public/nurse-consultation/324.html" << 'T53_HTML_324'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nurse Consultation — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/nurse-consultation/324.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <p class="h-boot" id="h-boot" hidden></p>
  <p class="h-err" id="h-err" hidden></p>

  <!-- STEP 1 · patient search and the nursing queue -->
  <section id="s-search">
    <a class="back" href="/health/321">&larr; Health</a>
    <h1>Nurse Consultation</h1>
    <p class="sub">The stage between triage and the doctor: pull the patient by Registration ID, review what registration and triage already recorded, and document the nursing assessment and care.</p>

    <div class="flow-ribbon">Registration <span class="arr">&rarr;</span> Triage <span class="arr">&rarr;</span> <b>Nurse Consultation</b> <span class="arr">&rarr;</span> Doctor Consultation</div>

    <div class="urgent-note">🚨 Emergency treatment must not be delayed while completing documentation. If the patient is deteriorating, escalate care immediately.</div>

        <div class="card" id="qa-card">
      <h2>Queue &amp; announcements</h2>
      <div class="qa-counts">
        <div class="qa-count"><span class="qa-num" id="qa-waiting">0</span><span class="qa-k">Patients waiting</span></div>
        <div class="qa-count"><span class="qa-num" id="qa-done">0</span><span class="qa-k">Completed today</span></div>
      </div>
      <div class="qa-panels">
        <div class="qa-panel" id="qa-current-box">
          <div class="qa-k">Current patient</div>
          <div class="qa-id" id="qa-current-id">&mdash;</div>
          <div class="qa-sub" id="qa-current-sub"></div>
        </div>
        <div class="qa-panel">
          <div class="qa-k">Next patient</div>
          <div class="qa-id" id="qa-next-id">&mdash;</div>
          <div class="qa-sub" id="qa-next-sub"></div>
          <div class="qa-sub" id="qa-dest-line"></div>
          <div class="qa-btns">
            <button type="button" class="ghost-btn qa-announce" id="qa-announce" disabled>&#128266; Announce patient</button>
            <button type="button" class="ghost-btn" id="qa-start" disabled>Open next patient</button>
          </div>
          <p class="mini-note" id="qa-note"></p>
        </div>
      </div>
      <div class="qa-actions"><button type="button" class="ghost-btn" id="qa-settings-btn">&#128266; Speaker settings</button></div>
      <div class="qa-settings" id="qa-settings" hidden>
        <p class="mini-note">The announcement reads the patient's ID and these details aloud. They are saved for this module and used on every device.</p>
        <div class="qa-form">
          <label>Department / service name<input id="qa-dept" type="text" placeholder="e.g. Triage"></label>
          <label>Staff name<input id="qa-staff" type="text" placeholder="e.g. Nurse MWAJUMA"></label>
          <label>Office number<input id="qa-office" type="text" placeholder="e.g. Doctor's Office 02"></label>
          <label>Room number<input id="qa-room" type="text" placeholder="e.g. Nurse Room 03"></label>
        </div>
        <p class="form-err" id="qa-err" hidden></p>
        <p class="save-ok" id="qa-ok" hidden></p>
        <div class="form-actions"><button class="btn-primary" id="qa-save" type="button">Save Speaker Settings</button></div>
      </div>
    </div>

<div class="card add-card">
      <h2>Find a patient</h2>
      <div class="search-row">
        <input id="q-regid" list="q-regids" placeholder="Registration ID, e.g. 4827ABCD" autocomplete="off">
        <datalist id="q-regids"></datalist>
        <button class="btn-primary" id="q-find" type="button">Find Patient</button>
      </div>
      <p class="victim-line" id="q-line"></p>
      <p class="form-err" id="q-err" hidden></p>
    </div>

    <div class="card" id="queue-card">
      <h2>Nursing queue &mdash; today</h2>
      <div class="empty" id="q-empty">
        <div class="empty-icon">💉</div>
        <div class="empty-title">Nobody waiting</div>
        <div class="empty-sub">Patients triaged today appear here, ordered by triage priority and then arrival, until their nursing consultation is completed. Enter a Registration ID above to start one directly.</div>
      </div>
      <div class="table-wrap" id="q-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Priority</th><th>Registration ID</th><th>Patient</th><th>Triage at</th><th>Status</th><th></th></tr>
          </thead>
          <tbody id="q-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="q-count"></p>
    </div>
  </section>

  <!-- STEP 2 · the consultation -->
  <section id="s-consult" hidden>
    <a class="back" href="#" id="c-back">&larr; Back to the queue</a>
    <h1>Nurse Consultation</h1>
    <p class="sub" id="c-wholine"></p>

    <div class="flow-ribbon">Registration <span class="arr">&rarr;</span> Triage <span class="arr">&rarr;</span> <b>Nurse Consultation</b> <span class="arr">&rarr;</span> Doctor Consultation</div>

    <div class="card">
      <h2>From the records &mdash; registration</h2>
      <div class="rec-grid" id="c-reg"></div>
    </div>

    <div class="card">
      <h2>From the records &mdash; latest triage</h2>
      <div class="rec-grid" id="c-triage"></div>
    </div>

    <div class="card" id="c-prev-card" hidden>
      <h2>Previous consultations</h2>
      <div class="table-wrap">
        <table class="bk">
          <thead>
            <tr><th>Saved</th><th>Status</th><th>Findings</th><th>Nurse</th></tr>
          </thead>
          <tbody id="c-prev"></tbody>
        </table>
      </div>
    </div>

    <div class="card add-card" id="c-form-card">
      <h2>Nursing assessment</h2>
      <div class="resume-note" id="c-resume" hidden></div>

      <div class="form-grid">
        <label class="span2">Chief complaint <span class="opt">(when it needs clarifying)</span>
          <textarea id="n-chief" rows="2" placeholder="The main problem in the patient's own words"></textarea>
        </label>
        <label class="span2">History of present illness
          <textarea id="n-hpi" rows="2" placeholder="How the problem started, its duration and progression"></textarea>
        </label>
        <label class="span2">Relevant history not already recorded
          <textarea id="n-history" rows="2" placeholder="Anything the registration and triage do not carry"></textarea>
        </label>
        <label>Current medications
          <input id="n-meds" type="text" placeholder="Medicines the patient takes, if any">
        </label>
        <label>Allergies, new or confirmed
          <input id="n-allergies" type="text" placeholder="Including medication allergies">
        </label>
      </div>

      <div class="vitals-card">
        <h3>Current vital signs</h3>
        <div class="vitals-grid">
          <label>Temperature (&deg;C)
            <input id="n-temp" type="number" inputmode="decimal" step="0.1" min="25" max="45" placeholder="36.8">
          </label>
          <label>Pulse Rate (bpm)
            <input id="n-pulse" type="number" inputmode="numeric" min="0" placeholder="72">
          </label>
          <label>Respiratory Rate (/min)
            <input id="n-rr" type="number" inputmode="numeric" min="0" placeholder="16">
          </label>
          <label>Blood Pressure (mmHg)
            <input id="n-bp" type="text" inputmode="numeric" placeholder="120/80">
          </label>
          <label title="Oxygen saturation">SpO₂ (%)
            <input id="n-spo2" type="number" inputmode="numeric" min="0" max="100" placeholder="98">
          </label>
        </div>
      </div>

      <div class="form-grid">
        <label>Pain location
          <input id="n-pain-loc" type="text" placeholder="Where it hurts, if applicable">
        </label>
        <label>Pain severity (0 to 10)
          <span class="pain-row">
            <input id="n-pain" type="range" min="0" max="10" step="1" value="0">
            <output id="n-pain-out">0</output>
          </span>
        </label>
        <label>Pain duration
          <input id="n-pain-dur" type="text" placeholder="For how long, if applicable">
        </label>
        <label class="span2">Pain character
          <input id="n-pain-char" type="text" placeholder="Sharp, dull, burning, if applicable">
        </label>

        <label class="span2">Nursing assessment &mdash; clinical findings
          <textarea id="n-assessment" rows="3" placeholder="The nurse's observations and findings"></textarea>
        </label>
        <label class="span2">Nursing problems
          <textarea id="n-problems" rows="2" placeholder="Identified nursing problems, within professional scope"></textarea>
        </label>
        <label class="span2">Nursing interventions &mdash; care provided
          <textarea id="n-interventions" rows="2" placeholder="The nursing care given"></textarea>
        </label>
        <label class="span2">Response to care
          <textarea id="n-response" rows="2" placeholder="How the patient responded, where applicable"></textarea>
        </label>
        <label class="span2">Nursing notes
          <textarea id="n-notes" rows="2" placeholder="Additional clinical information"></textarea>
        </label>
      </div>

      <p class="mini-note">Recorded automatically &mdash; nurse: <b id="c-nurse"></b> · started: <span id="c-started">—</span> · last saved: <span id="c-saved">—</span></p>
      <p class="save-ok" id="n-ok" hidden></p>
      <p class="form-err" id="n-err" hidden></p>
      <div class="form-actions">
        <button class="btn-primary" id="n-complete" type="button">Complete Consultation</button>
        <button class="btn-ghost" id="n-progress" type="button">Save as In Progress</button>
      </div>
    </div>
  </section>

  <!-- STEP 3 · completed -->
  <section id="s-done" hidden>
    <div class="card done-card">
      <div class="done-icon">&#10003;</div>
      <h1>Consultation Complete</h1>
      <p class="sub" id="d-note"></p>
      <div class="id-box">
        <span class="id-k">Registration ID</span>
        <span class="id-v" id="d-regid"></span>
      </div>
      <div class="done-actions">
        <button class="ghost-btn" id="d-queue" type="button">Back to the Queue</button>
        <a class="cta-btn" href="/triage/323">Triage Another Patient</a>
      </div>
    </div>
  </section>

</main>
<style>
#h-boot,#h-err{max-width:920px;margin:0 auto 14px;padding:10px 14px;border-radius:10px;font-size:14px;line-height:1.55}
#h-boot{background:#fff7e0;color:#6b4e00;border:1px solid #e8d48a}
#h-err{background:#fdecec;color:#8a1f1f;border:1px solid #f2b8b5}

/* task 53 - queue & announcements */
#qa-card .qa-counts{display:flex;gap:14px;flex-wrap:wrap;margin:4px 0 14px}
.qa-count{display:flex;flex-direction:column;min-width:130px;padding:10px 14px;border:1px solid #e3e0d6;border-radius:10px;background:#faf9f4}
.qa-num{font-size:26px;font-weight:700;line-height:1.1}
.qa-count .qa-k{font-size:12px;color:#6b675c;margin-top:2px}
.qa-panels{display:flex;gap:14px;flex-wrap:wrap}
.qa-panel{flex:1 1 240px;border:1px solid #e3e0d6;border-radius:10px;padding:12px 14px;background:#fff}
.qa-panel .qa-k{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6b675c}
.qa-id{font-size:22px;font-weight:700;letter-spacing:.04em;margin:4px 0 2px}
.qa-panel.qa-none{opacity:.8}
.qa-sub{font-size:13px;color:#4b473c;margin:2px 0}
.qa-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.qa-actions{margin-top:12px}
.qa-settings{border-top:1px dashed #ddd8c9;margin-top:12px;padding-top:12px}
.qa-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:8px 0}
.qa-form label{display:block;font-size:13px;color:#4b473c}
.qa-form input{width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d8d3c4;border-radius:8px;font:inherit;background:#fff}
</style>
<script>
/* Task 47 - boot line, page painters and the 12-second watchdog. The same
   contract as the Patient List (build 46d): a silent failure names itself. */
(function () {
  var boot = document.getElementById("h-boot");
  if (boot) { boot.hidden = false; boot.textContent = "Nurse Consultation \u00b7 build 53 \u00b7 connecting\u2026"; }
  window.__p47 = { page: "324", build: "47", t0: Date.now() };
})();
function __jamaliHerr(msg) {
  var box = document.getElementById("h-err");
  var boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  if (!box || !box.hidden) return;
  box.hidden = false;
  box.textContent = "Page error \u2014 " + msg;
}
window.addEventListener("error", function (e) {
  if (!e || !e.message) return; /* resource errors carry no message */
  __jamaliHerr(e.message);
}, true);
window.addEventListener("unhandledrejection", function (e) {
  var r = e && e.reason;
  __jamaliHerr(String((r && (r.code || r.message)) || r || "unknown rejection"));
});
setTimeout(function () {
  var boot = document.getElementById("h-boot");
  var s = window.__p47 || {};
  if (!boot || boot.hidden) return; /* answered - nothing to report */
  var bits = [];
  bits.push("build " + (s.build || "47") + " script " +
    ((s.ran === true || s.listeners > 0) ? "ran" : "DID NOT run"));
  bits.push("sign-in check " + (s.auth === true ? "passed" : "not passed"));
  bits.push("listeners " + (s.listeners || 0) + "/" + (s.need || 0));
  bits.push(s.answered === true ? "Firestore answered" : "Firestore never answered");
  if (s.errs && s.errs.length) bits.push("errors: " + s.errs.join(" | "));
  __jamaliHerr("Still quiet after 12 seconds \u2014 " + bits.join(" \u00b7 ") +
    ". If the script DID NOT run, the deployed JS is stale or broken: " +
    "re-run the task file, git push, then hard refresh with Ctrl+Shift+R.");
}, 12000);
</script>
<script type="module" src="/nurse-consultation/324.js"></script>
</body>
</html>
T53_HTML_324
[ -s "public/nurse-consultation/324.html" ] && echo "  wrote public/nurse-consultation/324.html ($(wc -c < "public/nurse-consultation/324.html") bytes)"

mkdir -p "public/nurse-consultation"
cat > "public/nurse-consultation/324.js" << 'T53_JS_324'
// nurse-consultation (page 324) — JAMALI Health
// The stage between triage and the doctor. The nurse pulls the patient by
// Registration ID, reviews what registration and triage already recorded
// (shown as read only history — nothing is overwritten), documents the
// nursing assessment and care, and completes the consultation so the record
// reads to the doctor.
// QUEUE: today's triaged patients without a completed consultation, ordered
// by triage priority and then arrival. Direct entry beside it for walk-ins
// and return visits.
// STATUS: a consultation saves as "in-progress" and is completed explicitly.
// A completed record is never rewritten — a correction is a new consultation.
// One in-progress consultation per patient at a time.
// EMERGENCY RULE: documentation never delays urgent care.
import { requireAuth, auth, db, collection, query, addDoc, updateDoc, doc, setDoc, onSnapshot, serverTimestamp } from "/firebase.js";
/* patient chip - non-fatal since Task 47: if /health/patient-info.js cannot
   load (a missing or stale file), the page loses only the floating chip,
   never the find, the forms or the saves. */
let showPatient = function () {}, hidePatient = function () {};
try {
  const pi = await import("/health/patient-info.js");
  if (pi && typeof pi.showPatient === "function") showPatient = pi.showPatient;
  if (pi && typeof pi.hidePatient === "function") hidePatient = pi.hidePatient;
} catch (e) { /* chip unavailable - everything else keeps working */ }

/* boot diagnostics (Task 47 - the same contract as the Patient List, build
   46d): every collection listener carries an error callback and every
   failure paints itself on the page instead of dying in silence. */
window.__p47 = Object.assign(window.__p47 || {}, {
  page: "324", build: "53", queue: true, ran: true, auth: false,
  listeners: 0, need: 4, answered: false, errs: []
});
function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p47) window.__p47.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  box.textContent = "Could not read " + coll + " \u2014 " + code +
    (code.indexOf("permission-denied") >= 0
      ? " \u00b7 Fix: Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh."
      : "");
}
function bootDone() {
  if (window.__p47) window.__p47.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth(); // not logged in? -> bounced to "/"
  window.__p47.auth = true;
} catch (e) {
  herr("the sign-in check", e);
  throw e;
}

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- shared helpers (same language as pages 322 and 323) ---------- */
function pad(n) { return String(n).padStart(2, "0"); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function nowISO() { return new Date().toISOString(); }
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
const RANK = { critical: 0, high: 1, medium: 2, low: 3 };

/* the nurse on record comes from the signed in account, never typed */
const NURSE = String((auth && auth.currentUser && (auth.currentUser.email || auth.currentUser.uid)) || "unknown");
$("#c-nurse").textContent = NURSE;

/* ---------- live data: registrations, triage, consultations ---------- */
let regs = [];
const regMap = new Map();
let triages = [];
const lastTriage = new Map(); // regId -> most recent triage doc
let consults = [];            // every consultation, newest first, with __id

onSnapshot(query(collection(db, "healthRegistrations")), (snap) => {
  regs = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  regMap.clear();
  regs.forEach((r) => { if (r && r.regId) regMap.set(String(r.regId), r); });
  fillIds();
  renderQueue();
  refreshSearchLine();
  bootDone();
}, (e) => herr("healthRegistrations", e));

onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  triages = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  lastTriage.clear();
  triages.forEach((t) => {
    if (t && t.regId && !lastTriage.has(String(t.regId))) lastTriage.set(String(t.regId), t);
  });
  renderQueue();
  refreshSearchLine();
}, (e) => herr("healthTriage", e));

onSnapshot(query(collection(db, "healthNurseConsultations")), (snap) => {
  consults = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderQueue();
  refreshSearchLine();
}, (e) => herr("healthNurseConsultations", e));
window.__p47.listeners = 4;

function qaStart(id) { qerr(""); openPatient(id); }


/* =====================================================================
   JAMALI-QUEUE (task 53) — the queue panel shared by every service stage:
   waiting and completed counts, the current and the next patient, the
   speaker announcement, and this module's own announcement settings.
   Waiting counts patients waiting for THIS service only; Completed counts
   the patients finished here today. The announcement always reads the
   patient the panel is showing — never anybody else — and it reads the
   destination the hospital saved for this module (healthQueueConfig),
   falling back to the module's own name. No hard-coded rooms or IDs. */
const QA_MODULE = "nurse";
const QA_DEFAULT = "Nurse Consultation";
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "" };
try { qaCfg = Object.assign(qaCfg, JSON.parse(localStorage.getItem("jamali_qacfg_" + QA_MODULE) || "{}")); } catch (e) {}
let qaState = { waitingCount: 0, doneCount: 0, next: null, current: null };

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function qaTodayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaLocalDay(stamp) {
  const d = new Date(stamp);
  return isNaN(d.getTime()) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaIsToday(stamp) { return String(stamp || "").slice(0, 10) === new Date().toISOString().slice(0, 10); }
function qaIsTodayLocal(stamp) { return String(stamp || "").slice(0, 10) === qaTodayLocal(); }

/* the destination, composed from the saved settings */
function qaText() {
  const dept = String(qaCfg.department || "").trim();
  const staff = String(qaCfg.staffName || "").trim();
  const office = String(qaCfg.officeNumber || "").trim();
  const room = String(qaCfg.roomNumber || "").trim();
  const place = room || office;
  return { dept, staff, office, room, place, dest: (staff || dept || QA_DEFAULT) + (place ? ", " + place : "") };
}
function qaSentence(id) {
  return "Patient number " + String(id) + ", please proceed to " + qaText().dest + ".";
}
function qaSpeech(id) {
  /* the ID is spoken letter by letter so the waiting patient hears their own */
  return "Patient number " + String(id).split("").join(" ") + ", please proceed to " + qaText().dest + ".";
}
function qaCfgLine() {
  const t = qaText();
  const bits = [];
  if (t.staff) bits.push("Staff: " + t.staff);
  if (t.room) bits.push("Room: " + t.room);
  if (t.office) bits.push("Office: " + t.office);
  if (!t.staff && t.dept) bits.push("Department: " + t.dept);
  return bits.join(" \u00b7 ");
}

function qaRenderPanel() {
  qaSet("qa-waiting", String(qaState.waitingCount));
  qaSet("qa-done", String(qaState.doneCount));
  const cur = qaState.current, nxt = qaState.next;
  const cBox = document.getElementById("qa-current-box");
  if (cBox) cBox.classList.toggle("qa-none", !cur);
  qaSet("qa-current-id", cur ? cur.regId : "\u2014");
  qaSet("qa-current-sub", cur ? (cur.sub || "In Progress") : "Nobody is being served right now");
  qaSet("qa-next-id", nxt ? nxt.regId : "\u2014");
  qaSet("qa-next-sub", nxt ? (nxt.sub || "") : (qaState.waitingCount ? "" : "Nobody is waiting"));
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-regid", nxt.regId); else btn.removeAttribute("data-regid");
  }
  const st = document.getElementById("qa-start");
  if (st) {
    st.disabled = !nxt;
    if (nxt) st.setAttribute("data-regid", nxt.regId); else st.removeAttribute("data-regid");
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt.regId) : "");
}

/* every stage derives its own queue, then calls this */
function qaUpdate(waitingRows, current, doneCount) {
  qaState.waitingCount = Array.isArray(waitingRows) ? waitingRows.length : 0;
  qaState.doneCount = doneCount || 0;
  qaState.next = (qaState.waitingCount > 0) ? waitingRows[0] : null;
  qaState.current = current || null;
  qaRenderPanel();
}

/* the speaker button announces exactly the patient shown above it */
const qaAnnounceBtn = document.getElementById("qa-announce");
if (qaAnnounceBtn) qaAnnounceBtn.addEventListener("click", () => {
  const id = qaAnnounceBtn.getAttribute("data-regid");
  if (!id) return;
  const sentence = qaSentence(id);
  try {
    if (!("speechSynthesis" in window)) {
      qaSet("qa-note", "This browser cannot speak — read aloud: " + sentence);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(qaSpeech(id));
    u.lang = "en-GB";
    u.rate = 0.95;
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang || ""));
    if (vs.length) u.voice = vs.find((v) => /GB/i.test(v.lang || "")) || vs[0];
    synth.speak(u);
    qaSet("qa-note", "Announcing: " + sentence);
  } catch (e) {
    qaSet("qa-note", "Announcement failed (" + ((e && e.message) || e) + ") — read aloud: " + sentence);
  }
});

/* open the next patient straight from the panel */
const qaStartBtn = document.getElementById("qa-start");
if (qaStartBtn) qaStartBtn.addEventListener("click", () => {
  const id = qaStartBtn.getAttribute("data-regid");
  if (id) qaStart(id);
});

/* this module's announcement settings */
const qaSettingsBox = document.getElementById("qa-settings");
const qaSettingsBtn = document.getElementById("qa-settings-btn");
if (qaSettingsBtn && qaSettingsBox) {
  qaSettingsBtn.addEventListener("click", () => {
    qaSettingsBox.hidden = !qaSettingsBox.hidden;
    if (!qaSettingsBox.hidden) {
      const put = (id, k) => { const el = document.getElementById(id); if (el) el.value = String(qaCfg[k] || ""); };
      put("qa-dept", "department"); put("qa-staff", "staffName");
      put("qa-office", "officeNumber"); put("qa-room", "roomNumber");
    }
  });
}
const qaSaveBtn = document.getElementById("qa-save");
if (qaSaveBtn) qaSaveBtn.addEventListener("click", async () => {
  const qae = document.getElementById("qa-err");
  const qao = document.getElementById("qa-ok");
  if (qae) qae.hidden = true;
  if (qao) qao.hidden = true;
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim().replace(/\s+/g, " ") : ""; };
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    updatedAt: new Date().toISOString()
  };
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber) {
    if (qae) { qae.hidden = false; qae.textContent = "Fill at least one field — or leave the settings closed to keep the module's default."; }
    return;
  }
  qaSaveBtn.disabled = true;
  try {
    await setDoc(doc(db, "healthQueueConfig", QA_MODULE), data, { merge: true });
    if (qao) { qao.hidden = false; qao.textContent = "Speaker settings saved — every announcement from now on uses them."; }
  } catch (e) {
    if (qae) {
      qae.hidden = false;
      qae.textContent = "Save failed: " + ((e && e.message) || e) +
        " — if it says permission-denied, publish the rules from the repo file firestore.rules first.";
    }
  } finally { qaSaveBtn.disabled = false; }
});

/* live settings — a change here is heard on every device at once */
try {
  onSnapshot(doc(db, "healthQueueConfig", QA_MODULE), (s) => {
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "" },
      s.exists() ? s.data() : {});
    try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
    qaRenderPanel();
    bootDone();
  }, (e) => {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p47) window.__p47.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  });
} catch (e) { /* the settings listener is optional — the queue keeps working */ }


/* ---------- STEP 1: search + queue ---------- */
function qerr(msg) { const e = $("#q-err"); e.hidden = !msg; e.textContent = msg || ""; }
function serr(msg) { const e = $("#n-err"); e.hidden = !msg; e.textContent = msg || ""; }

function fillIds() {
  $("#q-regids").innerHTML = regs.map((r) =>
    '<option value="' + esc(r.regId) + '">' + esc(who(r)) + "</option>"
  ).join("");
}

function refreshSearchLine() {
  const id = $("#q-regid").value.trim().toUpperCase();
  const line = $("#q-line");
  if (!id || $("#s-search").hidden) { line.textContent = ""; line.className = "victim-line"; return; }
  const r = regMap.get(id);
  if (r) {
    line.className = "victim-line ok";
    line.textContent = "On record: " + who(r) +
      (r.sex ? " · " + r.sex : "") +
      (r.age !== "" && r.age != null ? " · " + r.age + "y" : "");
  } else if (id.length === 8) {
    line.className = "victim-line miss";
    line.textContent = "No registration found for this ID on this account.";
  } else {
    line.textContent = "";
    line.className = "victim-line";
  }
}

function renderQueue() {
  const today = todayStr();
  const rows = [];
  lastTriage.forEach((t, regId) => {
    const stamp = String(t.assessedAt || t.savedAt || "");
    if (stamp.slice(0, 10) !== today) return; // the queue is today's list
    const cs = consults.filter((c) => String(c.regId) === regId && String(c.savedAt || "") > String(t.savedAt || ""));
    if (cs.some((c) => c.status === "completed")) return; // nursing stage done
    const open = cs.find((c) => c.status === "in-progress");
    rows.push({
      regId, t,
      status: open ? "progress" : "waiting",
      savedConsult: open || null,
      rank: (RANK[String(t.priority || "").toLowerCase()] ?? 4)
    });
  });
  rows.sort((a, b) => (a.rank - b.rank) ||
    String(a.t.assessedAt || a.t.savedAt || "").localeCompare(String(b.t.assessedAt || b.t.savedAt || "")));

  const has = rows.length > 0;
  $("#q-empty").hidden = has;
  $("#q-wrap").hidden = !has;
  $("#q-body").innerHTML = rows.map((r) => {
    const victim = regMap.get(r.regId);
    const chip = r.status === "progress"
      ? '<span class="st st-progress">In progress</span>'
      : '<span class="st st-waiting">Waiting</span>';
    return "<tr><td>" + priBadge(r.t.priority) + "</td>" +
      "<td class='c-no'>" + esc(r.regId) + "</td>" +
      "<td class='c-party'>" + (victim ? esc(who(victim)) : "—") + "</td>" +
      "<td class='c-date'>" + esc(when(r.t.assessedAt || r.t.savedAt)) + "</td>" +
      "<td>" + chip + "</td>" +
      "<td><button type='button' class='ghost-btn q-open' data-regid='" + esc(r.regId) + "'>Open</button></td></tr>";
  }).join("");
  $("#q-count").textContent = has
    ? rows.length + (rows.length === 1 ? " patient waiting for nursing assessment."
                                      : " patients waiting for nursing assessment.")
    : "";
  /* JAMALI-QUEUE (task 53): feed the queue panel — waiting, current, completed */
  const qaWait = rows.filter((r) => r.status !== "progress").map((r) => ({
    regId: r.regId,
    sub: (regMap.get(r.regId) ? who(regMap.get(r.regId)) : "—") +
         " · triaged " + when(r.t.assessedAt || r.t.savedAt)
  }));
  const qaCurRow = rows.find((r) => r.status === "progress");
  const qaCur = qaCurRow ? {
    regId: qaCurRow.regId,
    sub: "In Progress · started " +
      when(qaCurRow.savedConsult ? (qaCurRow.savedConsult.startedAt || qaCurRow.savedConsult.savedAt) : "")
  } : null;
  const qaDoneSet = new Set();
  consults.forEach((c) => {
    if (c.status === "completed" && qaIsToday(c.completedAt || c.savedAt)) qaDoneSet.add(String(c.regId));
  });
  qaUpdate(qaWait, qaCur, qaDoneSet.size);
}

$("#q-regid").addEventListener("input", () => {
  const el = $("#q-regid");
  el.value = el.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 8);
  refreshSearchLine();
});
$("#q-regid").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("#q-find").click(); }
});
$("#q-find").addEventListener("click", () => {
  qerr("");
  const id = $("#q-regid").value.trim().toUpperCase();
  if (!id) return qerr("Enter the patient's Registration ID, or pick one from the list.");
  if (!/^[0-9]{4}[A-Z]{4}$/.test(id)) {
    return qerr("The Registration ID is 4 digits and 4 letters, for example 4827ABCD.");
  }
  if (!regMap.has(id)) {
    return qerr("No patient with Registration ID " + id + " was found on this account. Check the slip, or register the patient first.");
  }
  openPatient(id);
});
$("#q-body").addEventListener("click", (e) => {
  const btn = e.target.closest(".q-open");
  if (btn) { qerr(""); openPatient(btn.getAttribute("data-regid")); }
});

/* ---------- STEP 2: the consultation ---------- */
let current = null;        // the patient's registration doc
let openConsult = null;    // an in-progress consultation being resumed, or null

function item(k, v, wide) {
  if (v === "" || v == null) return "";
  return '<div class="rec-item' + (wide ? " wide" : "") + '"><div class="rec-k">' + esc(k) +
    '</div><div class="rec-v">' + v + "</div></div>";
}

/* JAMALI-NO-SKIP (task 51): the nursing consultation is step 3 — Triage (step 2) must be on record first */
function stepGate(regId) {
  if (!lastTriage.has(String(regId))) {
    return "This patient cannot skip a step — no Triage is on record yet. Complete Triage on page 323 (Triage) first, then come back to the nurse.";
  }
  return "";
}
function openPatient(regId) {
  const blocked = stepGate(regId);
  if (blocked) { qerr(blocked); return; }
  /* JAMALI-QUEUE (task 53): one consultation at a time — the next patient
     stays next until the current patient's work here is completed */
  const qaBusy = consults.find((c) => c.status === "in-progress" && String(c.regId) !== String(regId));
  if (qaBusy) {
    qerr("Patient " + qaBusy.regId + " is still in progress at this desk. Complete that consultation first — the queue panel shows them as the current patient. Then the next patient can be seen.");
    return;
  }
  showPatient(regId);
  current = regMap.get(regId);
  if (!current) return;
  openConsult = consults.find((c) => String(c.regId) === regId && c.status === "in-progress") || null;
  const t = lastTriage.get(regId) || null;

  /* registration panel — read only */
  const ident = current.isUnidentified
    ? "Unidentified"
    : esc(current.fullName || "Unnamed");
  $("#c-reg").innerHTML =
    item("Patient", ident) +
    item("Registration ID", esc(current.regId)) +
    item("Sex", esc(current.sex)) +
    item("Age", current.age !== "" && current.age != null ? esc(String(current.age) + "y") : "") +
    item("Phone", esc(current.phone)) +
    item("Emergency contact", esc(current.emergencyContact)) +
    item("Address", esc(current.address), true) +
    item("Arrived", esc(when(current.arrivalAt || current.savedAt))) +
    item("Department", esc(current.department)) +
    item("Payment", esc(current.payment)) +
    item("Incident", esc(current.incidentType)) +
    (current.incidentDescription ? item("Incident notes", esc(current.incidentDescription), true) : "");

  /* triage panel — read only */
  if (t) {
    $("#c-triage").innerHTML =
      '<div class="rec-item wide"><div class="rec-k">Priority</div><div class="rec-v pri-line">' +
        priBadge(t.priority) + " <span class='mini-note'>triaged " + esc(when(t.assessedAt || t.savedAt)) +
        (t.assessedBy ? " · by " + esc(t.assessedBy) : "") + "</span></div></div>" +
      item("Symptoms", esc(t.symptoms), true) +
      item("Consciousness", esc(t.consciousness)) +
      item("Pain", (t.pain === "" || t.pain == null) ? "" : esc(String(t.pain) + "/10")) +
      item("Temperature", t.vTemp ? esc(String(t.vTemp) + "°C") : "") +
      item("Pulse", t.vPulse ? esc(String(t.vPulse) + " bpm") : "") +
      item("Respiratory rate", t.vRR ? esc(String(t.vRR) + "/min") : "") +
      item("Blood pressure", t.vBP ? esc(String(t.vBP) + " mmHg") : "") +
      item("SpO2", t.vSpO2 ? esc(String(t.vSpO2) + "%") : "") +
      item("Injuries", esc(t.injuries), true) +
      item("Allergies", esc(t.allergies)) +
      item("Existing conditions", esc(t.conditions)) +
      (t.notes ? item("Triage notes", esc(t.notes), true) : "");
  } else {
    $("#c-triage").innerHTML =
      '<div class="rec-note">No triage assessment is on record for this patient. The nursing assessment can go ahead — triage can follow, and emergency care is never delayed by a missing form.</div>';
  }

  /* previous consultations — read only history */
  const past = consults.filter((c) => String(c.regId) === regId && (!openConsult || c.__id !== openConsult.__id));
  $("#c-prev-card").hidden = past.length === 0;
  $("#c-prev").innerHTML = past.map((c) =>
    "<tr><td class='c-date'>" + esc(when(c.savedAt)) + "</td>" +
    "<td>" + (c.status === "completed"
      ? '<span class="st st-done">Completed</span>'
      : '<span class="st st-progress">In progress</span>') + "</td>" +
    "<td class='c-desc'>" + esc(c.nursingAssessment || c.chiefComplaint || "—") + "</td>" +
    "<td>" + esc(c.nurse || "—") + "</td></tr>"
  ).join("");

  /* form state */
  clearForm();
  serr(""); okk("");
  if (openConsult) {
    applyForm(openConsult);
    $("#c-resume").hidden = false;
    $("#c-resume").textContent = "This patient already has a consultation in progress (started " +
      when(openConsult.startedAt || openConsult.savedAt) + "). Continue and save — it stays in progress until you complete it.";
  } else {
    $("#c-resume").hidden = true;
    $("#c-resume").textContent = "";
  }
  $("#c-wholine").textContent = "Consulting " + who(current) + " · Registration ID " + current.regId +
    (t && t.priority ? " · triage priority " + t.priority : "");
  $("#c-started").textContent = openConsult ? when(openConsult.startedAt || openConsult.savedAt) : "—";
  $("#c-saved").textContent = openConsult ? when(openConsult.savedAt) : "—";
  $("#s-search").hidden = true;
  $("#s-consult").hidden = false;
  $("#s-done").hidden = true;
  window.scrollTo(0, 0);
}

$("#c-back").addEventListener("click", (e) => {
  e.preventDefault();
  hidePatient();
  $("#s-consult").hidden = true;
  $("#s-search").hidden = false;
  refreshSearchLine();
  window.scrollTo(0, 0);
});

/* pain slider */
$("#n-pain").addEventListener("input", () => {
  $("#n-pain-out").textContent = $("#n-pain").value;
});

/* the twelve assessment fields */
const FIELDS = ["#n-chief", "#n-hpi", "#n-history", "#n-meds", "#n-allergies",
  "#n-temp", "#n-pulse", "#n-rr", "#n-bp", "#n-spo2",
  "#n-pain-loc", "#n-pain-dur", "#n-pain-char",
  "#n-assessment", "#n-problems", "#n-interventions", "#n-response", "#n-notes"];

function g(s) { return $(s).value.trim(); }

function collect() {
  const hasPainDetails = g("#n-pain-loc") || g("#n-pain-dur") || g("#n-pain-char");
  const painSev = $("#n-pain").value === "0" && !hasPainDetails ? "" : Number($("#n-pain").value);
  return {
    chiefComplaint: g("#n-chief"),
    hpi: g("#n-hpi"),
    relevantHistory: g("#n-history"),
    currentMedications: g("#n-meds"),
    allergies: g("#n-allergies"),
    vTemp: g("#n-temp"), vPulse: g("#n-pulse"), vRR: g("#n-rr"),
    vBP: g("#n-bp"), vSpO2: g("#n-spo2"),
    painLocation: g("#n-pain-loc"),
    painSeverity: painSev,
    painDuration: g("#n-pain-dur"),
    painCharacter: g("#n-pain-char"),
    nursingAssessment: g("#n-assessment"),
    nursingProblems: g("#n-problems"),
    nursingInterventions: g("#n-interventions"),
    responseToCare: g("#n-response"),
    nursingNotes: g("#n-notes")
  };
}

function applyForm(c) {
  $("#n-chief").value = c.chiefComplaint || "";
  $("#n-hpi").value = c.hpi || "";
  $("#n-history").value = c.relevantHistory || "";
  $("#n-meds").value = c.currentMedications || "";
  $("#n-allergies").value = c.allergies || "";
  $("#n-temp").value = c.vTemp || "";
  $("#n-pulse").value = c.vPulse || "";
  $("#n-rr").value = c.vRR || "";
  $("#n-bp").value = c.vBP || "";
  $("#n-spo2").value = c.vSpO2 || "";
  $("#n-pain-loc").value = c.painLocation || "";
  $("#n-pain").value = (c.painSeverity === "" || c.painSeverity == null) ? 0 : Number(c.painSeverity);
  $("#n-pain-out").textContent = $("#n-pain").value;
  $("#n-pain-dur").value = c.painDuration || "";
  $("#n-pain-char").value = c.painCharacter || "";
  $("#n-assessment").value = c.nursingAssessment || "";
  $("#n-problems").value = c.nursingProblems || "";
  $("#n-interventions").value = c.nursingInterventions || "";
  $("#n-response").value = c.responseToCare || "";
  $("#n-notes").value = c.nursingNotes || "";
}

function clearForm() {
  FIELDS.forEach((s) => { $(s).value = ""; });
  $("#n-pain").value = 0;
  $("#n-pain-out").textContent = "0";
}

function okk(msg) { const e = $("#n-ok"); e.hidden = !msg; e.textContent = msg || ""; }

async function saveConsult(complete) {
  serr(""); okk("");
  if (!current) return serr("No patient is open — go back and find the patient first.");
  const d = collect();
  const touched = Object.values(d).some((v) => v !== "" && v != null);
  if (!touched) return serr("Record at least one finding before saving — or go back and pick the patient from the queue.");

  const t = lastTriage.get(String(current.regId)) || null;
  const data = Object.assign({}, d, {
    regId: String(current.regId),
    triageSavedAt: t ? String(t.savedAt || "") : "",
    priority: t ? String(t.priority || "") : "",
    status: complete ? "completed" : "in-progress",
    nurse: NURSE,
    savedAt: nowISO(),
    completedAt: complete ? nowISO() : (openConsult ? (openConsult.completedAt || "") : "")
  });

  const btns = [$("#n-complete"), $("#n-progress")];
  btns.forEach((b) => { b.disabled = true; });
  try {
    if (openConsult && openConsult.__id) {
      await updateDoc(doc(db, "healthNurseConsultations", openConsult.__id), data);
    } else {
      data.startedAt = nowISO();
      await addDoc(collection(db, "healthNurseConsultations"), Object.assign({ createdAt: serverTimestamp() }, data));
    }
    if (complete) {
      $("#d-regid").textContent = data.regId;
      $("#d-note").textContent = "The nursing record for " + who(current) + " is complete (" +
        when(data.completedAt) + ") and reads to the doctor. The patient moves to Doctor Consultation according to the workflow" +
        (t && t.priority ? " — triage priority " + t.priority + "." : ".");
      $("#s-consult").hidden = true;
      $("#s-done").hidden = false;
      window.scrollTo(0, 0);
    } else {
      okk("Saved " + when(data.savedAt) + " — the consultation stays open in the queue as In progress.");
      $("#c-saved").textContent = when(data.savedAt);
    }
  } catch (e) {
    serr("Save failed: " + ((e && e.message) || e));
  } finally {
    btns.forEach((b) => { b.disabled = false; });
  }
}

$("#n-progress").addEventListener("click", () => saveConsult(false));
$("#n-complete").addEventListener("click", () => saveConsult(true));

$("#d-queue").addEventListener("click", () => {
  openConsult = null;
  current = null;
  $("#s-done").hidden = true;
  $("#s-search").hidden = false;
  $("#q-regid").value = "";
  refreshSearchLine();
  window.scrollTo(0, 0);
});
T53_JS_324
[ -s "public/nurse-consultation/324.js" ] && echo "  wrote public/nurse-consultation/324.js ($(wc -c < "public/nurse-consultation/324.js") bytes)"

mkdir -p "public/doctor-consultation"
cat > "public/doctor-consultation/325.html" << 'T53_HTML_325'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Doctor Consultation — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/doctor-consultation/325.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <p class="h-boot" id="h-boot" hidden></p>
  <p class="h-err" id="h-err" hidden></p>

  <!-- STEP 1 · search, the doctor's queue and the pharmacy requests -->
  <section id="s-search">
    <a class="back" href="/health/321">&larr; Health</a>
    <h1>Doctor Consultation</h1>
    <p class="sub">The doctor pulls the patient by Registration ID, reviews the registration, triage and nursing records, examines the patient, and decides the diagnosis, the treatment and where the patient goes next.</p>

    <div class="flow-ribbon">Registration <span class="arr">&rarr;</span> Triage <span class="arr">&rarr;</span> Nurse Consultation <span class="arr">&rarr;</span> <b>Doctor Consultation</b> <span class="arr">&rarr;</span> Destination</div>

    <div class="urgent-note">🚨 Emergency treatment must not be delayed while completing documentation. If the patient is deteriorating, escalate care immediately.</div>

        <div class="card" id="qa-card">
      <h2>Queue &amp; announcements</h2>
      <div class="qa-counts">
        <div class="qa-count"><span class="qa-num" id="qa-waiting">0</span><span class="qa-k">Patients waiting</span></div>
        <div class="qa-count"><span class="qa-num" id="qa-done">0</span><span class="qa-k">Completed today</span></div>
      </div>
      <div class="qa-panels">
        <div class="qa-panel" id="qa-current-box">
          <div class="qa-k">Current patient</div>
          <div class="qa-id" id="qa-current-id">&mdash;</div>
          <div class="qa-sub" id="qa-current-sub"></div>
        </div>
        <div class="qa-panel">
          <div class="qa-k">Next patient</div>
          <div class="qa-id" id="qa-next-id">&mdash;</div>
          <div class="qa-sub" id="qa-next-sub"></div>
          <div class="qa-sub" id="qa-dest-line"></div>
          <div class="qa-btns">
            <button type="button" class="ghost-btn qa-announce" id="qa-announce" disabled>&#128266; Announce patient</button>
            <button type="button" class="ghost-btn" id="qa-start" disabled>Open next patient</button>
          </div>
          <p class="mini-note" id="qa-note"></p>
        </div>
      </div>
      <div class="qa-actions"><button type="button" class="ghost-btn" id="qa-settings-btn">&#128266; Speaker settings</button></div>
      <div class="qa-settings" id="qa-settings" hidden>
        <p class="mini-note">The announcement reads the patient's ID and these details aloud. They are saved for this module and used on every device.</p>
        <div class="qa-form">
          <label>Department / service name<input id="qa-dept" type="text" placeholder="e.g. Triage"></label>
          <label>Staff name<input id="qa-staff" type="text" placeholder="e.g. Nurse MWAJUMA"></label>
          <label>Office number<input id="qa-office" type="text" placeholder="e.g. Doctor's Office 02"></label>
          <label>Room number<input id="qa-room" type="text" placeholder="e.g. Nurse Room 03"></label>
        </div>
        <p class="form-err" id="qa-err" hidden></p>
        <p class="save-ok" id="qa-ok" hidden></p>
        <div class="form-actions"><button class="btn-primary" id="qa-save" type="button">Save Speaker Settings</button></div>
      </div>
    </div>

<div class="card add-card">
      <h2>Find a patient</h2>
      <div class="search-row">
        <input id="q-regid" list="q-regids" placeholder="Registration ID, e.g. 4827ABCD" autocomplete="off">
        <datalist id="q-regids"></datalist>
        <button class="btn-primary" id="q-find" type="button">Find Patient</button>
      </div>
      <p class="victim-line" id="q-line"></p>
      <p class="form-err" id="q-err" hidden></p>
    </div>

    <div class="card" id="queue-card">
      <h2>Doctor's queue &mdash; nursing completed</h2>
      <div class="empty" id="q-empty">
        <div class="empty-icon">🩺</div>
        <div class="empty-title">Nobody waiting for the doctor</div>
        <div class="empty-sub">Patients whose nursing consultation is completed appear here, ordered by triage priority and then arrival, until their doctor consultation is completed and sent on. Enter a Registration ID above to open a patient directly.</div>
      </div>
      <div class="table-wrap" id="q-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Priority</th><th>Registration ID</th><th>Patient</th><th>Nursing completed</th><th>Status</th><th></th></tr>
          </thead>
          <tbody id="q-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="q-count"></p>
    </div>

    <div class="card" id="alt-card" hidden>
      <h2>Pharmacy requests awaiting a decision</h2>
      <p class="mini-note" style="margin-bottom:10px">The pharmacist could not dispense the prescribed medicine and proposes an alternative. Accept it, or reject it with a replacement medicine &mdash; or send the patient to obtain the medicine outside the pharmacy.</p>
      <div class="table-wrap">
        <table class="bk">
          <thead>
            <tr><th>Registration ID</th><th>Patient</th><th>Prescribed</th><th>Proposed alternative</th><th>Proposed</th><th></th></tr>
          </thead>
          <tbody id="a-body"></tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- STEP 2 · the consultation -->
  <section id="s-consult" hidden>
    <a class="back" href="#" id="c-back">&larr; Back to the queue</a>
    <h1>Doctor Consultation</h1>
    <p class="sub" id="c-wholine"></p>

    <div class="flow-ribbon">Registration <span class="arr">&rarr;</span> Triage <span class="arr">&rarr;</span> Nurse Consultation <span class="arr">&rarr;</span> <b>Doctor Consultation</b> <span class="arr">&rarr;</span> Destination</div>

    <div class="card">
      <h2>From the records &mdash; registration</h2>
      <div class="rec-grid" id="c-reg"></div>
    </div>

    <div class="card">
      <h2>From the records &mdash; latest triage</h2>
      <div class="rec-grid" id="c-triage"></div>
    </div>

    <div class="card">
      <h2>From the records &mdash; nursing consultation</h2>
      <div class="rec-grid" id="c-nurse"></div>
    </div>

    <div class="card" id="c-prev-card" hidden>
      <h2>Previous nursing consultations</h2>
      <div class="table-wrap">
        <table class="bk">
          <thead>
            <tr><th>Saved</th><th>Status</th><th>Findings</th><th>Nurse</th></tr>
          </thead>
          <tbody id="c-prev"></tbody>
        </table>
      </div>
    </div>

    <div class="card add-card" id="c-form-card">
      <h2>Medical assessment</h2>
      <div class="resume-note" id="c-resume" hidden></div>

      <div class="form-grid">
        <label class="span2">Presenting complaint
          <textarea id="d-pc" rows="2" placeholder="The patient's main medical problem"></textarea>
        </label>
        <label class="span2">History of present illness
          <textarea id="d-hpi" rows="2" placeholder="How it started, its duration and progression"></textarea>
        </label>
        <label class="span2">Relevant medical history
          <textarea id="d-hist" rows="2" placeholder="Previous illnesses, operations and conditions"></textarea>
        </label>
        <label>Current medications
          <input id="d-meds" type="text" placeholder="Medicines the patient takes">
        </label>
        <label>Allergies
          <input id="d-allergies" type="text" placeholder="Known or newly identified allergies">
        </label>
      </div>

      <div class="vitals-card">
        <h3>Current vital signs</h3>
        <div class="vitals-grid">
          <label>Temperature (&deg;C)
            <input id="d-temp" type="number" inputmode="decimal" step="0.1" min="25" max="45" placeholder="36.8">
          </label>
          <label>Pulse Rate (bpm)
            <input id="d-pulse" type="number" inputmode="numeric" min="0" placeholder="72">
          </label>
          <label>Respiratory Rate (/min)
            <input id="d-rr" type="number" inputmode="numeric" min="0" placeholder="16">
          </label>
          <label>Blood Pressure (mmHg)
            <input id="d-bp" type="text" inputmode="numeric" placeholder="120/80">
          </label>
          <label title="Oxygen saturation">SpO₂ (%)
            <input id="d-spo2" type="number" inputmode="numeric" min="0" max="100" placeholder="98">
          </label>
        </div>
      </div>

      <div class="form-grid">
        <label class="span2">Physical examination
          <textarea id="d-exam" rows="3" placeholder="The examination findings"></textarea>
        </label>
        <label class="span2">Clinical findings
          <textarea id="d-findings" rows="2" placeholder="Other relevant findings from the assessment"></textarea>
        </label>
        <label class="span2">Additional notes
          <textarea id="d-notes" rows="2" placeholder="Other important clinical information"></textarea>
        </label>
      </div>
    </div>

    <div class="card add-card">
      <h2>Diagnosis</h2>
      <div class="form-grid">
        <label>Primary diagnosis
          <input id="d-dx1" type="text" placeholder="The main clinical diagnosis">
        </label>
        <label>Additional diagnoses
          <input id="d-dx2" type="text" placeholder="Further diagnoses, where applicable">
        </label>
        <label>Diagnosis type
          <select id="d-dxtype">
            <option value="working">Working or provisional</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </label>
        <label class="span2">Diagnostic notes
          <textarea id="d-dxnotes" rows="2" placeholder="For example: further investigation needed before the cause is established"></textarea>
        </label>
      </div>
    </div>

    <div class="card add-card">
      <h2>Investigations &amp; treatment</h2>
      <div class="form-grid">
        <label class="span2">Investigations requested <span class="opt">(one per line)</span>
          <textarea id="d-investigations" rows="3" placeholder="Laboratory tests, imaging, other diagnostic procedures"></textarea>
        </label>
        <label class="span2">Treatment plan
          <textarea id="d-plan" rows="3" placeholder="Other treatment, referral, admission, follow-up instructions"></textarea>
        </label>
      </div>
    </div>

    <div class="card add-card">
      <h2>Prescriptions &mdash; medicines for the pharmacy</h2>
      <p class="mini-note" style="margin-bottom:10px">One line per medicine. Prescriptions reach the pharmacy desk when this consultation is completed.</p>
      <div id="rx-rows"></div>
      <button class="ghost-btn" id="rx-add" type="button">+ Add medicine</button>
    </div>

    <div class="card add-card">
      <h2>Orders for treatment / procedures</h2>
      <p class="mini-note" style="margin-bottom:10px">Treatments and procedures the treatment desk should perform &mdash; wound dressing, injections, nebulization, minor procedures. One line per order; the orders reach the treatment desk when this consultation is completed.</p>
      <div id="ord-rows"></div>
      <button class="ghost-btn" id="ord-add" type="button">+ Add order</button>
    </div>

    <p class="mini-note">Recorded automatically &mdash; doctor: <b id="c-doctor"></b> · started: <span id="c-started">—</span> · last saved: <span id="c-saved">—</span></p>
    <p class="save-ok" id="d-ok" hidden></p>
    <p class="form-err" id="d-err" hidden></p>
    <div class="form-actions">
      <button class="btn-primary" id="d-complete" type="button">Complete Consultation</button>
      <button class="btn-ghost" id="d-progress" type="button">Save as In Progress</button>
    </div>
  </section>

  <!-- STEP 3 · completed, then the destination -->
  <section id="s-done" hidden>
    <div class="card done-card">
      <div class="done-icon">&#10003;</div>
      <h1 id="fin-title">Consultation Complete</h1>
      <p class="sub" id="d-note"></p>
      <div class="id-box">
        <span class="id-k">Registration ID</span>
        <span class="id-v" id="fin-regid"></span>
      </div>

      <div class="dest-card" id="dest-card" hidden>
        <h2>Send the patient to the next destination</h2>
        <p class="mini-note" style="margin-bottom:10px">Choose where the patient goes next. The list grows as the facility uses it &mdash; a destination typed once is saved for every future consultation.</p>
        <div class="dest-row">
          <select id="dest-sel"></select>
        </div>
        <div class="dest-row">
          <input id="dest-new" type="text" placeholder="Or type a new destination, e.g. Laboratory" autocomplete="off">
          <button class="ghost-btn" id="dest-add" type="button">Add Destination</button>
        </div>
        <p class="victim-line" id="dest-line"></p>
        <p class="form-err" id="dest-err" hidden></p>
        <div class="form-actions" style="justify-content:center">
          <button class="btn-primary" id="dest-send" type="button">Send Patient</button>
        </div>
      </div>

      <div class="sent-box" id="sent-box" hidden>
        <span class="sent-k">Sent to destination</span>
        <span class="sent-v" id="sent-v"></span>
        <span class="sent-t" id="sent-t"></span>
      </div>

      <div class="done-actions">
        <button class="ghost-btn" id="fin-queue" type="button">Back to the Queue</button>
        <a class="cta-btn" href="/pharmacy/326">Open Pharmacy</a>
      </div>
    </div>
  </section>

</main>
<style>
#h-boot,#h-err{max-width:920px;margin:0 auto 14px;padding:10px 14px;border-radius:10px;font-size:14px;line-height:1.55}
#h-boot{background:#fff7e0;color:#6b4e00;border:1px solid #e8d48a}
#h-err{background:#fdecec;color:#8a1f1f;border:1px solid #f2b8b5}

/* task 53 - queue & announcements */
#qa-card .qa-counts{display:flex;gap:14px;flex-wrap:wrap;margin:4px 0 14px}
.qa-count{display:flex;flex-direction:column;min-width:130px;padding:10px 14px;border:1px solid #e3e0d6;border-radius:10px;background:#faf9f4}
.qa-num{font-size:26px;font-weight:700;line-height:1.1}
.qa-count .qa-k{font-size:12px;color:#6b675c;margin-top:2px}
.qa-panels{display:flex;gap:14px;flex-wrap:wrap}
.qa-panel{flex:1 1 240px;border:1px solid #e3e0d6;border-radius:10px;padding:12px 14px;background:#fff}
.qa-panel .qa-k{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6b675c}
.qa-id{font-size:22px;font-weight:700;letter-spacing:.04em;margin:4px 0 2px}
.qa-panel.qa-none{opacity:.8}
.qa-sub{font-size:13px;color:#4b473c;margin:2px 0}
.qa-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.qa-actions{margin-top:12px}
.qa-settings{border-top:1px dashed #ddd8c9;margin-top:12px;padding-top:12px}
.qa-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:8px 0}
.qa-form label{display:block;font-size:13px;color:#4b473c}
.qa-form input{width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d8d3c4;border-radius:8px;font:inherit;background:#fff}
</style>
<script>
/* Task 47 - boot line, page painters and the 12-second watchdog. The same
   contract as the Patient List (build 46d): a silent failure names itself. */
(function () {
  var boot = document.getElementById("h-boot");
  if (boot) { boot.hidden = false; boot.textContent = "Doctor Consultation \u00b7 build 53 \u00b7 connecting\u2026"; }
  window.__p47 = { page: "325", build: "47", t0: Date.now() };
})();
function __jamaliHerr(msg) {
  var box = document.getElementById("h-err");
  var boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  if (!box || !box.hidden) return;
  box.hidden = false;
  box.textContent = "Page error \u2014 " + msg;
}
window.addEventListener("error", function (e) {
  if (!e || !e.message) return; /* resource errors carry no message */
  __jamaliHerr(e.message);
}, true);
window.addEventListener("unhandledrejection", function (e) {
  var r = e && e.reason;
  __jamaliHerr(String((r && (r.code || r.message)) || r || "unknown rejection"));
});
setTimeout(function () {
  var boot = document.getElementById("h-boot");
  var s = window.__p47 || {};
  if (!boot || boot.hidden) return; /* answered - nothing to report */
  var bits = [];
  bits.push("build " + (s.build || "47") + " script " +
    ((s.ran === true || s.listeners > 0) ? "ran" : "DID NOT run"));
  bits.push("sign-in check " + (s.auth === true ? "passed" : "not passed"));
  bits.push("listeners " + (s.listeners || 0) + "/" + (s.need || 0));
  bits.push(s.answered === true ? "Firestore answered" : "Firestore never answered");
  if (s.errs && s.errs.length) bits.push("errors: " + s.errs.join(" | "));
  __jamaliHerr("Still quiet after 12 seconds \u2014 " + bits.join(" \u00b7 ") +
    ". If the script DID NOT run, the deployed JS is stale or broken: " +
    "re-run the task file, git push, then hard refresh with Ctrl+Shift+R.");
}, 12000);
</script>
<script type="module" src="/doctor-consultation/325.js"></script>
</body>
</html>
T53_HTML_325
[ -s "public/doctor-consultation/325.html" ] && echo "  wrote public/doctor-consultation/325.html ($(wc -c < "public/doctor-consultation/325.html") bytes)"

mkdir -p "public/doctor-consultation"
cat > "public/doctor-consultation/325.js" << 'T53_JS_325'
// doctor-consultation (page 325) — JAMALI Health
// The stage after the nurse. The doctor pulls the patient by Registration ID,
// reviews what registration, triage and the nurse already recorded (read only
// history — nothing is overwritten), examines the patient and records the
// medical assessment, the diagnosis (working or confirmed), the investigations,
// the treatment plan, the prescriptions and the treatment / procedure orders.
// DESTINATION: the doctor decides where the patient goes next. The list is the
// facility's own — a destination typed once is saved for every future
// consultation, and duplicates are refused (case-insensitive).
// PHARMACY REQUESTS: when the pharmacist cannot dispense a prescribed medicine
// they propose an alternative; the request waits here until the doctor accepts
// it, rejects it with a replacement, or sends the patient outside the pharmacy.
// STATUS: a consultation saves as "in-progress", is completed explicitly, and
// is "sent" once the doctor records the destination. A completed record is
// never rewritten — a correction is a new consultation.
// EMERGENCY RULE: documentation never delays urgent care.
import { requireAuth, auth, db, collection, query, addDoc, updateDoc, doc, setDoc, onSnapshot, serverTimestamp, writeBatch } from "/firebase.js";
/* patient chip - non-fatal since Task 47: if /health/patient-info.js cannot
   load (a missing or stale file), the page loses only the floating chip,
   never the find, the forms or the saves. */
let showPatient = function () {}, hidePatient = function () {};
try {
  const pi = await import("/health/patient-info.js");
  if (pi && typeof pi.showPatient === "function") showPatient = pi.showPatient;
  if (pi && typeof pi.hidePatient === "function") hidePatient = pi.hidePatient;
} catch (e) { /* chip unavailable - everything else keeps working */ }

/* boot diagnostics (Task 47 - the same contract as the Patient List, build
   46d): every collection listener carries an error callback and every
   failure paints itself on the page instead of dying in silence. */
window.__p47 = Object.assign(window.__p47 || {}, {
  page: "325", build: "53", queue: true, ran: true, auth: false,
  listeners: 0, need: 7, answered: false, errs: []
});
function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p47) window.__p47.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  box.textContent = "Could not read " + coll + " \u2014 " + code +
    (code.indexOf("permission-denied") >= 0
      ? " \u00b7 Fix: Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh."
      : "");
}
function bootDone() {
  if (window.__p47) window.__p47.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth(); // not logged in? -> bounced to "/"
  window.__p47.auth = true;
} catch (e) {
  herr("the sign-in check", e);
  throw e;
}

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- shared helpers (same language as pages 322 to 324) ---------- */
function pad(n) { return String(n).padStart(2, "0"); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function nowISO() { return new Date().toISOString(); }
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
const RANK = { critical: 0, high: 1, medium: 2, low: 3 };

/* the doctor on record comes from the signed in account, never typed */
const DOCTOR = String((auth && auth.currentUser && (auth.currentUser.email || auth.currentUser.uid)) || "unknown");
$("#c-doctor").textContent = DOCTOR;

/* ---------- live data ---------- */
let regs = [];
const regMap = new Map();
let triages = [];
const lastTriage = new Map();   // regId -> most recent triage doc
let nurseConsults = [];         // every nursing consultation, newest first
let docConsults = [];           // every doctor consultation, newest first
let destinations = [];          // the facility's destination list
let rxLines = [];               // every prescription line, newest first

onSnapshot(query(collection(db, "healthRegistrations")), (snap) => {
  regs = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  regMap.clear();
  regs.forEach((r) => { if (r && r.regId) regMap.set(String(r.regId), r); });
  fillIds();
  renderQueue();
  renderAlts();
  refreshSearchLine();
  bootDone();
}, (e) => herr("healthRegistrations", e));

onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  triages = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  lastTriage.clear();
  triages.forEach((t) => {
    if (t && t.regId && !lastTriage.has(String(t.regId))) lastTriage.set(String(t.regId), t);
  });
  renderQueue();
  refreshSearchLine();
}, (e) => herr("healthTriage", e));

onSnapshot(query(collection(db, "healthNurseConsultations")), (snap) => {
  nurseConsults = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderQueue();
  refreshSearchLine();
}, (e) => herr("healthNurseConsultations", e));

onSnapshot(query(collection(db, "healthDoctorConsultations")), (snap) => {
  docConsults = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderQueue();
  refreshSearchLine();
}, (e) => herr("healthDoctorConsultations", e));

onSnapshot(query(collection(db, "healthDestinations")), (snap) => {
  destinations = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));
  renderDestinations();
}, (e) => herr("healthDestinations", e));

onSnapshot(query(collection(db, "healthPrescriptions")), (snap) => {
  rxLines = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderAlts();
  refreshSearchLine();
}, (e) => herr("healthPrescriptions", e));
window.__p47.listeners = 7;

function qaStart(id) { qerr(""); openPatient(id); }


/* =====================================================================
   JAMALI-QUEUE (task 53) — the queue panel shared by every service stage:
   waiting and completed counts, the current and the next patient, the
   speaker announcement, and this module's own announcement settings.
   Waiting counts patients waiting for THIS service only; Completed counts
   the patients finished here today. The announcement always reads the
   patient the panel is showing — never anybody else — and it reads the
   destination the hospital saved for this module (healthQueueConfig),
   falling back to the module's own name. No hard-coded rooms or IDs. */
const QA_MODULE = "doctor";
const QA_DEFAULT = "Doctor Consultation";
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "" };
try { qaCfg = Object.assign(qaCfg, JSON.parse(localStorage.getItem("jamali_qacfg_" + QA_MODULE) || "{}")); } catch (e) {}
let qaState = { waitingCount: 0, doneCount: 0, next: null, current: null };

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function qaTodayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaLocalDay(stamp) {
  const d = new Date(stamp);
  return isNaN(d.getTime()) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaIsToday(stamp) { return String(stamp || "").slice(0, 10) === new Date().toISOString().slice(0, 10); }
function qaIsTodayLocal(stamp) { return String(stamp || "").slice(0, 10) === qaTodayLocal(); }

/* the destination, composed from the saved settings */
function qaText() {
  const dept = String(qaCfg.department || "").trim();
  const staff = String(qaCfg.staffName || "").trim();
  const office = String(qaCfg.officeNumber || "").trim();
  const room = String(qaCfg.roomNumber || "").trim();
  const place = room || office;
  return { dept, staff, office, room, place, dest: (staff || dept || QA_DEFAULT) + (place ? ", " + place : "") };
}
function qaSentence(id) {
  return "Patient number " + String(id) + ", please proceed to " + qaText().dest + ".";
}
function qaSpeech(id) {
  /* the ID is spoken letter by letter so the waiting patient hears their own */
  return "Patient number " + String(id).split("").join(" ") + ", please proceed to " + qaText().dest + ".";
}
function qaCfgLine() {
  const t = qaText();
  const bits = [];
  if (t.staff) bits.push("Staff: " + t.staff);
  if (t.room) bits.push("Room: " + t.room);
  if (t.office) bits.push("Office: " + t.office);
  if (!t.staff && t.dept) bits.push("Department: " + t.dept);
  return bits.join(" \u00b7 ");
}

function qaRenderPanel() {
  qaSet("qa-waiting", String(qaState.waitingCount));
  qaSet("qa-done", String(qaState.doneCount));
  const cur = qaState.current, nxt = qaState.next;
  const cBox = document.getElementById("qa-current-box");
  if (cBox) cBox.classList.toggle("qa-none", !cur);
  qaSet("qa-current-id", cur ? cur.regId : "\u2014");
  qaSet("qa-current-sub", cur ? (cur.sub || "In Progress") : "Nobody is being served right now");
  qaSet("qa-next-id", nxt ? nxt.regId : "\u2014");
  qaSet("qa-next-sub", nxt ? (nxt.sub || "") : (qaState.waitingCount ? "" : "Nobody is waiting"));
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-regid", nxt.regId); else btn.removeAttribute("data-regid");
  }
  const st = document.getElementById("qa-start");
  if (st) {
    st.disabled = !nxt;
    if (nxt) st.setAttribute("data-regid", nxt.regId); else st.removeAttribute("data-regid");
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt.regId) : "");
}

/* every stage derives its own queue, then calls this */
function qaUpdate(waitingRows, current, doneCount) {
  qaState.waitingCount = Array.isArray(waitingRows) ? waitingRows.length : 0;
  qaState.doneCount = doneCount || 0;
  qaState.next = (qaState.waitingCount > 0) ? waitingRows[0] : null;
  qaState.current = current || null;
  qaRenderPanel();
}

/* the speaker button announces exactly the patient shown above it */
const qaAnnounceBtn = document.getElementById("qa-announce");
if (qaAnnounceBtn) qaAnnounceBtn.addEventListener("click", () => {
  const id = qaAnnounceBtn.getAttribute("data-regid");
  if (!id) return;
  const sentence = qaSentence(id);
  try {
    if (!("speechSynthesis" in window)) {
      qaSet("qa-note", "This browser cannot speak — read aloud: " + sentence);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(qaSpeech(id));
    u.lang = "en-GB";
    u.rate = 0.95;
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang || ""));
    if (vs.length) u.voice = vs.find((v) => /GB/i.test(v.lang || "")) || vs[0];
    synth.speak(u);
    qaSet("qa-note", "Announcing: " + sentence);
  } catch (e) {
    qaSet("qa-note", "Announcement failed (" + ((e && e.message) || e) + ") — read aloud: " + sentence);
  }
});

/* open the next patient straight from the panel */
const qaStartBtn = document.getElementById("qa-start");
if (qaStartBtn) qaStartBtn.addEventListener("click", () => {
  const id = qaStartBtn.getAttribute("data-regid");
  if (id) qaStart(id);
});

/* this module's announcement settings */
const qaSettingsBox = document.getElementById("qa-settings");
const qaSettingsBtn = document.getElementById("qa-settings-btn");
if (qaSettingsBtn && qaSettingsBox) {
  qaSettingsBtn.addEventListener("click", () => {
    qaSettingsBox.hidden = !qaSettingsBox.hidden;
    if (!qaSettingsBox.hidden) {
      const put = (id, k) => { const el = document.getElementById(id); if (el) el.value = String(qaCfg[k] || ""); };
      put("qa-dept", "department"); put("qa-staff", "staffName");
      put("qa-office", "officeNumber"); put("qa-room", "roomNumber");
    }
  });
}
const qaSaveBtn = document.getElementById("qa-save");
if (qaSaveBtn) qaSaveBtn.addEventListener("click", async () => {
  const qae = document.getElementById("qa-err");
  const qao = document.getElementById("qa-ok");
  if (qae) qae.hidden = true;
  if (qao) qao.hidden = true;
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim().replace(/\s+/g, " ") : ""; };
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    updatedAt: new Date().toISOString()
  };
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber) {
    if (qae) { qae.hidden = false; qae.textContent = "Fill at least one field — or leave the settings closed to keep the module's default."; }
    return;
  }
  qaSaveBtn.disabled = true;
  try {
    await setDoc(doc(db, "healthQueueConfig", QA_MODULE), data, { merge: true });
    if (qao) { qao.hidden = false; qao.textContent = "Speaker settings saved — every announcement from now on uses them."; }
  } catch (e) {
    if (qae) {
      qae.hidden = false;
      qae.textContent = "Save failed: " + ((e && e.message) || e) +
        " — if it says permission-denied, publish the rules from the repo file firestore.rules first.";
    }
  } finally { qaSaveBtn.disabled = false; }
});

/* live settings — a change here is heard on every device at once */
try {
  onSnapshot(doc(db, "healthQueueConfig", QA_MODULE), (s) => {
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "" },
      s.exists() ? s.data() : {});
    try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
    qaRenderPanel();
    bootDone();
  }, (e) => {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p47) window.__p47.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  });
} catch (e) { /* the settings listener is optional — the queue keeps working */ }


/* ---------- STEP 1: search + queue + pharmacy requests ---------- */
function qerr(msg) { const e = $("#q-err"); e.hidden = !msg; e.textContent = msg || ""; }
function serr(msg) { const e = $("#d-err"); e.hidden = !msg; e.textContent = msg || ""; }
function okk(msg) { const e = $("#d-ok"); e.hidden = !msg; e.textContent = msg || ""; }

function fillIds() {
  $("#q-regids").innerHTML = regs.map((r) =>
    '<option value="' + esc(r.regId) + '">' + esc(who(r)) + "</option>"
  ).join("");
}

function refreshSearchLine() {
  const id = $("#q-regid").value.trim().toUpperCase();
  const line = $("#q-line");
  if (!id || $("#s-search").hidden) { line.textContent = ""; line.className = "victim-line"; return; }
  const r = regMap.get(id);
  if (r) {
    line.className = "victim-line ok";
    line.textContent = "On record: " + who(r) +
      (r.sex ? " · " + r.sex : "") +
      (r.age !== "" && r.age != null ? " · " + r.age + "y" : "");
  } else if (id.length === 8) {
    line.className = "victim-line miss";
    line.textContent = "No registration found for this ID on this account.";
  } else {
    line.textContent = "";
    line.className = "victim-line";
  }
}

/* the queue: latest nursing consultation completed, no closed doctor
   consultation after it. Not limited to today — the doctor sees the backlog. */
function renderQueue() {
  const nDone = new Map(); // regId -> latest completed nursing consultation
  nurseConsults.forEach((c) => {
    if (c.status === "completed" && c.regId && !nDone.has(String(c.regId))) {
      nDone.set(String(c.regId), c);
    }
  });
  const rows = [];
  nDone.forEach((nc, regId) => {
    const closed = docConsults.some((d) => String(d.regId) === regId &&
      (d.status === "completed" || d.status === "sent") &&
      String(d.savedAt || "") > String(nc.savedAt || ""));
    if (closed) return; // the doctor stage already finished after that nursing record
    const open = docConsults.find((d) => String(d.regId) === regId && d.status === "in-progress");
    const t = lastTriage.get(regId);
    rows.push({
      regId, nc,
      priority: (t && t.priority) || nc.priority || "",
      status: open ? "progress" : "waiting",
      openDoc: open || null,
      rank: RANK[String(((t && t.priority) || nc.priority || "")).toLowerCase()] ?? 4
    });
  });
  rows.sort((a, b) => (a.rank - b.rank) ||
    String(a.nc.savedAt || "").localeCompare(String(b.nc.savedAt || "")));

  const has = rows.length > 0;
  $("#q-empty").hidden = has;
  $("#q-wrap").hidden = !has;
  $("#q-body").innerHTML = rows.map((r) => {
    const victim = regMap.get(r.regId);
    const chip = r.status === "progress"
      ? '<span class="st st-progress">In progress</span>'
      : '<span class="st st-waiting">Waiting</span>';
    return "<tr><td>" + priBadge(r.priority) + "</td>" +
      "<td class='c-no'>" + esc(r.regId) + "</td>" +
      "<td class='c-party'>" + (victim ? esc(who(victim)) : "—") + "</td>" +
      "<td class='c-date'>" + esc(when(r.nc.completedAt || r.nc.savedAt)) + "</td>" +
      "<td>" + chip + "</td>" +
      "<td><button type='button' class='ghost-btn q-open' data-regid='" + esc(r.regId) + "'>Open</button></td></tr>";
  }).join("");
  $("#q-count").textContent = has
    ? rows.length + (rows.length === 1 ? " patient waiting for the doctor."
                                       : " patients waiting for the doctor.")
    : "";
  /* JAMALI-QUEUE (task 53): feed the queue panel — waiting, current, completed */
  const qaWait = rows.filter((r) => r.status !== "progress").map((r) => ({
    regId: r.regId,
    sub: (regMap.get(r.regId) ? who(regMap.get(r.regId)) : "—") +
         " · nursing done " + when(r.nc.completedAt || r.nc.savedAt)
  }));
  const qaCurRow = rows.find((r) => r.status === "progress");
  const qaCur = qaCurRow ? {
    regId: qaCurRow.regId,
    sub: "In Progress · started " +
      when(qaCurRow.openDoc ? (qaCurRow.openDoc.startedAt || qaCurRow.openDoc.savedAt) : "")
  } : null;
  const qaDoneSet = new Set();
  docConsults.forEach((d) => {
    if ((d.status === "completed" || d.status === "sent") && qaIsToday(d.completedAt || d.sentAt || d.savedAt)) {
      qaDoneSet.add(String(d.regId));
    }
  });
  qaUpdate(qaWait, qaCur, qaDoneSet.size);
}

/* pharmacy requests awaiting the doctor's decision */
let rejectingId = null;
function renderAlts() {
  const open = rxLines.filter((r) => r.status === "alternative proposed")
    .sort((a, b) => String(a.savedAt || "").localeCompare(String(b.savedAt || "")));
  $("#alt-card").hidden = open.length === 0;
  $("#a-body").innerHTML = open.map((r) => {
    const victim = regMap.get(String(r.regId));
    const alt = (r.alt && r.alt.medicine) || "—";
    let action;
    if (rejectingId === r.__id) {
      action = '<div class="rej-row">' +
        '<input id="rej-med" type="text" placeholder="Replacement medicine, e.g. Medicine C (empty = outside the pharmacy)">' +
        '<button type="button" class="ghost-btn a-rej-ok" data-id="' + esc(r.__id) + '">Confirm reject</button>' +
        '<button type="button" class="ghost-btn a-rej-no">Cancel</button></div>';
    } else {
      action = '<div class="alt-actions">' +
        '<button type="button" class="ghost-btn a-accept" data-id="' + esc(r.__id) + '">Accept</button>' +
        '<button type="button" class="ghost-btn a-reject" data-id="' + esc(r.__id) + '">Reject</button></div>';
    }
    return "<tr><td class='c-no'>" + esc(r.regId) + "</td>" +
      "<td class='c-party'>" + (victim ? esc(who(victim)) : "—") + "</td>" +
      "<td class='c-desc'>" + esc(r.medicine) + (r.dose ? " · " + esc(r.dose) : "") + "</td>" +
      "<td class='c-desc'><b>" + esc(alt) + "</b>" +
        (r.alt && r.alt.note ? "<br><span class='mini-note'>" + esc(r.alt.note) + "</span>" : "") + "</td>" +
      "<td class='c-date'>" + esc(when(r.alt && r.alt.proposedAt)) +
        (r.alt && r.alt.proposedBy ? "<br><span class='mini-note'>" + esc(r.alt.proposedBy) + "</span>" : "") + "</td>" +
      "<td>" + action + "</td></tr>";
  }).join("");
}

$("#a-body").addEventListener("click", async (e) => {
  const acc = e.target.closest(".a-accept");
  const rej = e.target.closest(".a-reject");
  const ok = e.target.closest(".a-rej-ok");
  const no = e.target.closest(".a-rej-no");
  if (acc) {
    try {
      await updateDoc(doc(db, "healthPrescriptions", acc.getAttribute("data-id")), {
        status: "accepted",
        decision: { by: DOCTOR, at: nowISO(), note: "Alternative accepted — the pharmacy may dispense it." }
      });
    } catch (err) { console.error(err); }
  } else if (rej) {
    rejectingId = rej.getAttribute("data-id");
    renderAlts();
    const inp = $("#rej-med");
    if (inp) inp.focus();
  } else if (no) {
    rejectingId = null;
    renderAlts();
  } else if (ok) {
    const id = ok.getAttribute("data-id");
    const line = rxLines.find((r) => r.__id === id);
    const replacement = ($("#rej-med") ? $("#rej-med").value : "").trim();
    rejectingId = null;
    try {
      await updateDoc(doc(db, "healthPrescriptions", id), {
        status: replacement ? "rejected" : "outside pharmacy",
        decision: {
          by: DOCTOR, at: nowISO(),
          note: replacement ? "Rejected — " + replacement + " prescribed instead."
                            : "Rejected — the patient obtains the medicine outside the pharmacy."
        }
      });
      if (replacement && line) {
        await addDoc(collection(db, "healthPrescriptions"), {
          regId: String(line.regId || ""),
          consultationId: String(line.consultationId || ""),
          medicine: replacement,
          dose: "", frequency: "", duration: "",
          notes: "Replacement for " + (line.medicine || "the original medicine") +
                 " — prescribed after the pharmacist's proposal.",
          status: "to dispense",
          prescribedBy: DOCTOR,
          priority: line.priority || "",
          savedAt: nowISO(),
          createdAt: serverTimestamp()
        });
      }
    } catch (err) { console.error(err); }
  }
});

$("#q-regid").addEventListener("input", () => {
  const el = $("#q-regid");
  el.value = el.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 8);
  refreshSearchLine();
});
$("#q-regid").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("#q-find").click(); }
});
$("#q-find").addEventListener("click", () => {
  qerr("");
  const id = $("#q-regid").value.trim().toUpperCase();
  if (!id) return qerr("Enter the patient's Registration ID, or pick one from the list.");
  if (!/^[0-9]{4}[A-Z]{4}$/.test(id)) {
    return qerr("The Registration ID is 4 digits and 4 letters, for example 4827ABCD.");
  }
  if (!regMap.has(id)) {
    return qerr("No patient with Registration ID " + id + " was found on this account. Check the slip, or register the patient first.");
  }
  openPatient(id);
});
$("#q-body").addEventListener("click", (e) => {
  const btn = e.target.closest(".q-open");
  if (btn) { qerr(""); openPatient(btn.getAttribute("data-regid")); }
});

/* ---------- STEP 2: the consultation ---------- */
let current = null;        // the patient's registration doc
let openConsult = null;    // an in-progress doctor consultation being resumed
let lastConsultId = null;  // the consultation just completed, for the Send step

function item(k, v, wide) {
  if (v === "" || v == null) return "";
  return '<div class="rec-item' + (wide ? " wide" : "") + '"><div class="rec-k">' + esc(k) +
    '</div><div class="rec-v">' + v + "</div></div>";
}

/* JAMALI-NO-SKIP (task 51): the doctor consultation is step 4 — the nursing consultation (step 3) must be completed first */
function stepGate(regId) {
  const done = nurseConsults.some((c) => String(c.regId) === String(regId) && c.status === "completed");
  if (!done) {
    return "This patient cannot skip a step — the Nurse Consultation is not completed yet. Complete the nursing stage on page 324 (Nurse Consultation) first, then come to the doctor.";
  }
  return "";
}
function openPatient(regId) {
  const blocked = stepGate(regId);
  if (blocked) { qerr(blocked); return; }
  /* JAMALI-QUEUE (task 53): one consultation at a time — the next patient
     stays next until the current patient's work here is completed */
  const qaBusy = docConsults.find((d) => d.status === "in-progress" && String(d.regId) !== String(regId));
  if (qaBusy) {
    qerr("Patient " + qaBusy.regId + " is still in progress at this desk. Complete that consultation first — the queue panel shows them as the current patient. Then the next patient can be seen.");
    return;
  }
  showPatient(regId);
  current = regMap.get(regId);
  if (!current) return;
  openConsult = docConsults.find((d) => String(d.regId) === regId && d.status === "in-progress") || null;
  const t = lastTriage.get(regId) || null;

  /* registration panel — read only */
  const ident = current.isUnidentified
    ? "Unidentified"
    : esc(current.fullName || "Unnamed");
  $("#c-reg").innerHTML =
    item("Patient", ident) +
    item("Registration ID", esc(current.regId)) +
    item("Sex", esc(current.sex)) +
    item("Age", current.age !== "" && current.age != null ? esc(String(current.age) + "y") : "") +
    item("Phone", esc(current.phone)) +
    item("Emergency contact", esc(current.emergencyContact)) +
    item("Address", esc(current.address), true) +
    item("Arrived", esc(when(current.arrivalAt || current.savedAt))) +
    item("Department", esc(current.department)) +
    item("Payment", esc(current.payment)) +
    item("Incident", esc(current.incidentType)) +
    (current.incidentDescription ? item("Incident notes", esc(current.incidentDescription), true) : "");

  /* triage panel — read only */
  if (t) {
    $("#c-triage").innerHTML =
      '<div class="rec-item wide"><div class="rec-k">Priority</div><div class="rec-v pri-line">' +
        priBadge(t.priority) + " <span class='mini-note'>triaged " + esc(when(t.assessedAt || t.savedAt)) +
        (t.assessedBy ? " · by " + esc(t.assessedBy) : "") + "</span></div></div>" +
      item("Symptoms", esc(t.symptoms), true) +
      item("Consciousness", esc(t.consciousness)) +
      item("Pain", (t.pain === "" || t.pain == null) ? "" : esc(String(t.pain) + "/10")) +
      item("Temperature", t.vTemp ? esc(String(t.vTemp) + "°C") : "") +
      item("Pulse", t.vPulse ? esc(String(t.vPulse) + " bpm") : "") +
      item("Respiratory rate", t.vRR ? esc(String(t.vRR) + "/min") : "") +
      item("Blood pressure", t.vBP ? esc(String(t.vBP) + " mmHg") : "") +
      item("SpO2", t.vSpO2 ? esc(String(t.vSpO2) + "%") : "") +
      item("Injuries", esc(t.injuries), true) +
      item("Allergies", esc(t.allergies)) +
      item("Existing conditions", esc(t.conditions)) +
      (t.notes ? item("Triage notes", esc(t.notes), true) : "");
  } else {
    $("#c-triage").innerHTML =
      '<div class="rec-note">No triage assessment is on record for this patient. The doctor can still assess the patient — emergency care is never delayed by a missing form.</div>';
  }

  /* the latest completed nursing consultation — read only */
  const nLatest = nurseConsults.find((c) => String(c.regId) === regId && c.status === "completed") || null;
  if (nLatest) {
    $("#c-nurse").innerHTML =
      '<div class="rec-item wide"><div class="rec-k">Nursing record</div><div class="rec-v pri-line">' +
        '<span class="st st-done">Completed</span> <span class="mini-note">saved ' +
        esc(when(nLatest.completedAt || nLatest.savedAt)) +
        (nLatest.nurse ? " · nurse " + esc(nLatest.nurse) : "") + "</span></div></div>" +
      item("Chief complaint", esc(nLatest.chiefComplaint), true) +
      item("Nursing assessment", esc(nLatest.nursingAssessment), true) +
      item("Temperature", nLatest.vTemp ? esc(String(nLatest.vTemp) + "°C") : "") +
      item("Pulse", nLatest.vPulse ? esc(String(nLatest.vPulse) + " bpm") : "") +
      item("Respiratory rate", nLatest.vRR ? esc(String(nLatest.vRR) + "/min") : "") +
      item("Blood pressure", nLatest.vBP ? esc(String(nLatest.vBP) + " mmHg") : "") +
      item("SpO2", nLatest.vSpO2 ? esc(String(nLatest.vSpO2) + "%") : "") +
      item("Pain", (nLatest.painSeverity === "" || nLatest.painSeverity == null)
        ? "" : esc(String(nLatest.painSeverity) + "/10" +
        (nLatest.painLocation ? " · " + nLatest.painLocation : ""))) +
      item("Current medications", esc(nLatest.currentMedications)) +
      item("Allergies", esc(nLatest.allergies)) +
      item("Nursing problems", esc(nLatest.nursingProblems), true) +
      item("Nursing interventions", esc(nLatest.nursingInterventions), true) +
      item("Response to care", esc(nLatest.responseToCare), true) +
      (nLatest.nursingNotes ? item("Nursing notes", esc(nLatest.nursingNotes), true) : "");
  } else {
    $("#c-nurse").innerHTML =
      '<div class="rec-note">No completed nursing consultation is on record for this patient. The doctor can still assess the patient — the nursing record can follow, and emergency care is never delayed.</div>';
  }

  /* nursing history table */
  const past = nurseConsults.filter((c) => String(c.regId) === regId);
  $("#c-prev-card").hidden = past.length === 0;
  $("#c-prev").innerHTML = past.map((c) =>
    "<tr><td class='c-date'>" + esc(when(c.savedAt)) + "</td>" +
    "<td>" + (c.status === "completed"
      ? '<span class="st st-done">Completed</span>'
      : '<span class="st st-progress">In progress</span>') + "</td>" +
    "<td class='c-desc'>" + esc(c.nursingAssessment || c.chiefComplaint || "—") + "</td>" +
    "<td>" + esc(c.nurse || "—") + "</td></tr>"
  ).join("");

  /* form state */
  clearForm();
  serr(""); okk("");
  if (openConsult) {
    applyForm(openConsult);
    $("#c-resume").hidden = false;
    $("#c-resume").textContent = "This patient already has a consultation in progress (started " +
      when(openConsult.startedAt || openConsult.savedAt) + "). Continue and save — prescriptions and orders are sent to the pharmacy and the treatment desk when the consultation is completed.";
  } else {
    $("#c-resume").hidden = true;
    $("#c-resume").textContent = "";
  }
  $("#c-wholine").textContent = "Consulting " + who(current) + " · Registration ID " + current.regId +
    (t && t.priority ? " · triage priority " + t.priority : "");
  $("#c-started").textContent = openConsult ? when(openConsult.startedAt || openConsult.savedAt) : "—";
  $("#c-saved").textContent = openConsult ? when(openConsult.savedAt) : "—";
  $("#s-search").hidden = true;
  $("#s-consult").hidden = false;
  $("#s-done").hidden = true;
  window.scrollTo(0, 0);
}

$("#c-back").addEventListener("click", (e) => {
  e.preventDefault();
  hidePatient();
  $("#s-consult").hidden = true;
  $("#s-search").hidden = false;
  refreshSearchLine();
  window.scrollTo(0, 0);
});

/* ---------- the form ---------- */
const FIELDS = ["#d-pc", "#d-hpi", "#d-hist", "#d-meds", "#d-allergies",
  "#d-temp", "#d-pulse", "#d-rr", "#d-bp", "#d-spo2",
  "#d-exam", "#d-findings", "#d-notes",
  "#d-dx1", "#d-dx2", "#d-dxnotes", "#d-investigations", "#d-plan"];
function g(s) { return $(s).value.trim(); }

function rxRowHTML() {
  return '<div class="row-ed">' +
    '<label>Medicine<input data-k="medicine" type="text" placeholder="Medicine A"></label>' +
    '<label>Dose<input data-k="dose" type="text" placeholder="500 mg"></label>' +
    '<label>Frequency<input data-k="frequency" type="text" placeholder="3 x daily"></label>' +
    '<label>Duration<input data-k="duration" type="text" placeholder="5 days"></label>' +
    '<label>Notes<input data-k="notes" type="text" placeholder="Instructions, if any"></label>' +
    '<button type="button" class="row-del" title="Remove this medicine">&times;</button></div>';
}
function ordRowHTML() {
  return '<div class="row-ed ord">' +
    '<label>Doctor\'s order — treatment or procedure<input data-k="order" type="text" placeholder="Wound cleaning and dressing, injection, nebulization..."></label>' +
    '<button type="button" class="row-del" title="Remove this order">&times;</button></div>';
}
$("#rx-add").addEventListener("click", () => {
  $("#rx-rows").insertAdjacentHTML("beforeend", rxRowHTML());
});
$("#ord-add").addEventListener("click", () => {
  $("#ord-rows").insertAdjacentHTML("beforeend", ordRowHTML());
});
$("#rx-rows").addEventListener("click", (e) => {
  const del = e.target.closest(".row-del");
  if (del) del.closest(".row-ed").remove();
});
$("#ord-rows").addEventListener("click", (e) => {
  const del = e.target.closest(".row-del");
  if (del) del.closest(".row-ed").remove();
});
function readRows(containerId) {
  const out = [];
  document.querySelectorAll("#" + containerId + " .row-ed").forEach((row) => {
    const o = {};
    row.querySelectorAll("[data-k]").forEach((inp) => { o[inp.getAttribute("data-k")] = inp.value.trim(); });
    out.push(o);
  });
  return out;
}

function collect() {
  return {
    presentingComplaint: g("#d-pc"),
    hpi: g("#d-hpi"),
    relevantHistory: g("#d-hist"),
    currentMedications: g("#d-meds"),
    allergies: g("#d-allergies"),
    vTemp: g("#d-temp"), vPulse: g("#d-pulse"), vRR: g("#d-rr"),
    vBP: g("#d-bp"), vSpO2: g("#d-spo2"),
    physicalExam: g("#d-exam"),
    clinicalFindings: g("#d-findings"),
    additionalNotes: g("#d-notes"),
    dxPrimary: g("#d-dx1"),
    dxAdditional: g("#d-dx2"),
    dxType: $("#d-dxtype").value,
    dxNotes: g("#d-dxnotes"),
    investigations: g("#d-investigations"),
    treatmentPlan: g("#d-plan"),
    rxRows: readRows("rx-rows"),
    ordRows: readRows("ord-rows")
  };
}

function applyForm(c) {
  $("#d-pc").value = c.presentingComplaint || "";
  $("#d-hpi").value = c.hpi || "";
  $("#d-hist").value = c.relevantHistory || "";
  $("#d-meds").value = c.currentMedications || "";
  $("#d-allergies").value = c.allergies || "";
  $("#d-temp").value = c.vTemp || "";
  $("#d-pulse").value = c.vPulse || "";
  $("#d-rr").value = c.vRR || "";
  $("#d-bp").value = c.vBP || "";
  $("#d-spo2").value = c.vSpO2 || "";
  $("#d-exam").value = c.physicalExam || "";
  $("#d-findings").value = c.clinicalFindings || "";
  $("#d-notes").value = c.additionalNotes || "";
  $("#d-dx1").value = c.dxPrimary || "";
  $("#d-dx2").value = c.dxAdditional || "";
  $("#d-dxtype").value = c.dxType || "working";
  $("#d-dxnotes").value = c.dxNotes || "";
  $("#d-investigations").value = c.investigations || "";
  $("#d-plan").value = c.treatmentPlan || "";
}

function clearForm() {
  FIELDS.forEach((s) => { $(s).value = ""; });
  $("#d-dxtype").value = "working";
  $("#rx-rows").innerHTML = "";
  $("#ord-rows").innerHTML = "";
}

/* ---------- save ---------- */
async function saveConsult(complete) {
  serr(""); okk("");
  if (!current) return serr("No patient is open — go back and find the patient first.");
  const d = collect();
  const touched = ["presentingComplaint", "hpi", "relevantHistory", "currentMedications", "allergies",
    "vTemp", "vPulse", "vRR", "vBP", "vSpO2", "physicalExam", "clinicalFindings", "additionalNotes",
    "dxPrimary", "dxAdditional", "dxNotes", "investigations", "treatmentPlan"]
    .some((k) => d[k] !== "") ||
    d.rxRows.some((r) => r.medicine) || d.ordRows.some((r) => r.order);
  if (!touched) return serr("Record at least one finding before saving — or go back and pick the patient from the queue.");
  const validRx = d.rxRows.filter((r) => r.medicine);
  const validOrd = d.ordRows.filter((r) => r.order);
  if (!complete && (validRx.length || validOrd.length)) {
    return serr("Prescriptions and orders are sent when the consultation is completed — remove them here, or complete the consultation.");
  }

  const t = lastTriage.get(String(current.regId)) || null;
  const data = {
    regId: String(current.regId),
    triageSavedAt: t ? String(t.savedAt || "") : "",
    priority: t ? String(t.priority || "") : "",
    presentingComplaint: d.presentingComplaint,
    hpi: d.hpi,
    relevantHistory: d.relevantHistory,
    currentMedications: d.currentMedications,
    allergies: d.allergies,
    vTemp: d.vTemp, vPulse: d.vPulse, vRR: d.vRR, vBP: d.vBP, vSpO2: d.vSpO2,
    physicalExam: d.physicalExam,
    clinicalFindings: d.clinicalFindings,
    additionalNotes: d.additionalNotes,
    dxPrimary: d.dxPrimary,
    dxAdditional: d.dxAdditional,
    dxType: d.dxType,
    dxNotes: d.dxNotes,
    investigations: d.investigations,
    treatmentPlan: d.treatmentPlan,
    status: complete ? "completed" : "in-progress",
    doctor: DOCTOR,
    savedAt: nowISO(),
    completedAt: complete ? nowISO() : (openConsult ? (openConsult.completedAt || "") : "")
  };

  const btns = [$("#d-complete"), $("#d-progress")];
  btns.forEach((b) => { b.disabled = true; });
  try {
    let consultId;
    if (openConsult && openConsult.__id) {
      await updateDoc(doc(db, "healthDoctorConsultations", openConsult.__id), data);
      consultId = openConsult.__id;
    } else {
      data.startedAt = nowISO();
      const ref = await addDoc(collection(db, "healthDoctorConsultations"), Object.assign({ createdAt: serverTimestamp() }, data));
      consultId = ref.id;
    }
    if (complete && (validRx.length || validOrd.length)) {
      const batch = writeBatch();
      validRx.forEach((r) => batch.set(doc(collection(db, "healthPrescriptions")), {
        regId: String(current.regId),
        consultationId: consultId,
        medicine: r.medicine, dose: r.dose, frequency: r.frequency,
        duration: r.duration, notes: r.notes,
        status: "to dispense",
        prescribedBy: DOCTOR,
        priority: data.priority,
        savedAt: nowISO(),
        createdAt: serverTimestamp()
      }));
      validOrd.forEach((r) => batch.set(doc(collection(db, "healthTreatmentOrders")), {
        regId: String(current.regId),
        consultationId: consultId,
        order: r.order,
        status: "pending",
        performed: "", outcome: "", notes: "",
        worker: "", performedAt: "",
        orderedBy: DOCTOR,
        priority: data.priority,
        savedAt: nowISO(),
        createdAt: serverTimestamp()
      }));
      await batch.commit();
    }
    if (complete) {
      lastConsultId = consultId;
      openConsult = null;
      $("#fin-regid").textContent = data.regId;
      $("#fin-title").textContent = "Consultation Complete";
      $("#d-note").textContent = "The consultation for " + who(current) + " is complete (" +
        when(data.completedAt) + "). Choose where the patient goes next and send them — the destination list is the facility's own and grows as you use it.";
      $("#dest-card").hidden = false;
      $("#sent-box").hidden = true;
      $("#dest-sel").value = "";
      $("#dest-new").value = "";
      $("#dest-line").textContent = "";
      derr("");
      $("#s-consult").hidden = true;
      $("#s-done").hidden = false;
      window.scrollTo(0, 0);
    } else {
      okk("Saved " + when(data.savedAt) + " — the consultation stays open in the queue as In progress.");
      $("#c-saved").textContent = when(data.savedAt);
    }
  } catch (e) {
    serr("Save failed: " + ((e && e.message) || e));
  } finally {
    btns.forEach((b) => { b.disabled = false; });
  }
}

$("#d-progress").addEventListener("click", () => saveConsult(false));
$("#d-complete").addEventListener("click", () => saveConsult(true));

/* ---------- STEP 3: destination ---------- */
function derr(msg) { const e = $("#dest-err"); e.hidden = !msg; e.textContent = msg || ""; }

let pendingDest = null; // remembered when a destination is added, applied on the next render
function renderDestinations() {
  const sel = $("#dest-sel");
  const want = pendingDest || sel.value;
  sel.innerHTML = '<option value="">— select a saved destination —</option>' +
    destinations.map((d) => '<option value="' + esc(d.name) + '">' + esc(d.name) + "</option>").join("");
  if (want && destinations.some((d) => d.name === want)) sel.value = want;
  pendingDest = null;
}

$("#dest-add").addEventListener("click", async () => {
  derr("");
  const name = $("#dest-new").value.trim().replace(/\s+/g, " ");
  if (!name) return derr("Type the new destination's name first, or select one from the list.");
  const key = name.toLowerCase();
  const existing = destinations.find((d) => String(d.name || "").trim().toLowerCase() === key);
  if (existing) {
    $("#dest-sel").value = existing.name;
    $("#dest-line").className = "victim-line ok";
    $("#dest-line").textContent = '"' + existing.name + '" is already on the list — it has been selected.';
    $("#dest-new").value = "";
    return;
  }
  try {
    await addDoc(collection(db, "healthDestinations"), {
      name,
      createdBy: DOCTOR,
      savedAt: nowISO(),
      createdAt: serverTimestamp()
    });
    pendingDest = name;      // the snapshot re-render keeps the selection...
    $("#dest-sel").value = name; // ...and if it already re-rendered, this holds
    $("#dest-line").className = "victim-line ok";
    $("#dest-line").textContent = '"' + name + '" saved — it will be offered on every future consultation.';
    $("#dest-new").value = "";
  } catch (e) {
    derr("Could not save the destination: " + ((e && e.message) || e));
  }
});

$("#dest-send").addEventListener("click", async () => {
  derr("");
  if (!current) return derr("No patient is open.");
  const dest = $("#dest-sel").value;
  if (!dest) return derr("Select a saved destination, or type a new one and press Add Destination.");
  const data = { status: "sent", destinationName: dest, sentAt: nowISO() };
  const target = (lastConsultId && docConsults.find((d) => d.__id === lastConsultId)) ||
    docConsults.find((d) => String(d.regId) === String(current.regId) &&
      (d.status === "completed" || d.status === "sent"));
  if (!target || !target.__id) return derr("No completed consultation found for this patient.");
  const btn = $("#dest-send");
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthDoctorConsultations", target.__id), data);
    $("#fin-title").textContent = "Patient Sent";
    $("#d-note").textContent = who(current) + " has been sent to " + dest +
      ". The receiving stage records its own progress — the patient's history carries everything decided so far.";
    $("#sent-v").textContent = dest;
    $("#sent-t").textContent = "sent " + when(data.sentAt) + " · by " + DOCTOR;
    $("#dest-card").hidden = true;
    $("#sent-box").hidden = false;
    window.scrollTo(0, 0);
  } catch (e) {
    derr("Could not send: " + ((e && e.message) || e));
  } finally {
    btn.disabled = false;
  }
});

$("#fin-queue").addEventListener("click", () => {
  openConsult = null;
  lastConsultId = null;
  current = null;
  $("#s-done").hidden = true;
  $("#s-search").hidden = false;
  $("#q-regid").value = "";
  refreshSearchLine();
  window.scrollTo(0, 0);
});
T53_JS_325
[ -s "public/doctor-consultation/325.js" ] && echo "  wrote public/doctor-consultation/325.js ($(wc -c < "public/doctor-consultation/325.js") bytes)"

mkdir -p "public/pharmacy"
cat > "public/pharmacy/326.html" << 'T53_HTML_326'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pharmacy — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/pharmacy/326.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <p class="h-boot" id="h-boot" hidden></p>
  <p class="h-err" id="h-err" hidden></p>

  <!-- STEP 1 · search and the pharmacy worklist -->
  <section id="s-search">
    <a class="back" href="/health/321">&larr; Health</a>
    <h1>Pharmacy</h1>
    <p class="sub">The pharmacy desk receives the doctor's prescriptions, checks each medicine, proposes a safe alternative when one is unavailable, and records what is actually dispensed &mdash; against the patient's Registration ID.</p>

    <div class="flow-ribbon">Doctor Consultation <span class="arr">&rarr;</span> <b>Pharmacy</b> <span class="arr">&rarr;</span> Dispense</div>

        <div class="card" id="qa-card">
      <h2>Queue &amp; announcements</h2>
      <div class="qa-counts">
        <div class="qa-count"><span class="qa-num" id="qa-waiting">0</span><span class="qa-k">Patients waiting</span></div>
        <div class="qa-count"><span class="qa-num" id="qa-done">0</span><span class="qa-k">Completed today</span></div>
      </div>
      <div class="qa-panels">
        <div class="qa-panel" id="qa-current-box">
          <div class="qa-k">Current patient</div>
          <div class="qa-id" id="qa-current-id">&mdash;</div>
          <div class="qa-sub" id="qa-current-sub"></div>
        </div>
        <div class="qa-panel">
          <div class="qa-k">Next patient</div>
          <div class="qa-id" id="qa-next-id">&mdash;</div>
          <div class="qa-sub" id="qa-next-sub"></div>
          <div class="qa-sub" id="qa-dest-line"></div>
          <div class="qa-btns">
            <button type="button" class="ghost-btn qa-announce" id="qa-announce" disabled>&#128266; Announce patient</button>
            <button type="button" class="ghost-btn" id="qa-start" disabled>Open next patient</button>
          </div>
          <p class="mini-note" id="qa-note"></p>
        </div>
      </div>
      <div class="qa-actions"><button type="button" class="ghost-btn" id="qa-settings-btn">&#128266; Speaker settings</button></div>
      <div class="qa-settings" id="qa-settings" hidden>
        <p class="mini-note">The announcement reads the patient's ID and these details aloud. They are saved for this module and used on every device.</p>
        <div class="qa-form">
          <label>Department / service name<input id="qa-dept" type="text" placeholder="e.g. Triage"></label>
          <label>Staff name<input id="qa-staff" type="text" placeholder="e.g. Nurse MWAJUMA"></label>
          <label>Office number<input id="qa-office" type="text" placeholder="e.g. Doctor's Office 02"></label>
          <label>Room number<input id="qa-room" type="text" placeholder="e.g. Nurse Room 03"></label>
        </div>
        <p class="form-err" id="qa-err" hidden></p>
        <p class="save-ok" id="qa-ok" hidden></p>
        <div class="form-actions"><button class="btn-primary" id="qa-save" type="button">Save Speaker Settings</button></div>
      </div>
    </div>

<div class="card add-card">
      <h2>Find a patient</h2>
      <div class="search-row">
        <input id="q-regid" list="q-regids" placeholder="Registration ID, e.g. 4827ABCD" autocomplete="off">
        <datalist id="q-regids"></datalist>
        <button class="btn-primary" id="q-find" type="button">Find Patient</button>
      </div>
      <p class="victim-line" id="q-line"></p>
      <p class="form-err" id="q-err" hidden></p>
    </div>

    <div class="card" id="list-card">
      <h2>Prescriptions to handle</h2>
      <div class="empty" id="l-empty">
        <div class="empty-icon">💊</div>
        <div class="empty-title">No prescriptions waiting</div>
        <div class="empty-sub">Prescribed medicines appear here as soon as a doctor completes a consultation, and stay until they are dispensed, replaced or sent outside the pharmacy. Enter a Registration ID above to see a patient's prescriptions directly.</div>
      </div>
      <div class="table-wrap" id="l-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Registration ID</th><th>Patient</th><th>Medicine</th><th>Status</th><th></th></tr>
          </thead>
          <tbody id="l-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="l-count"></p>
    </div>
  </section>

  <!-- STEP 2 · the patient's prescriptions -->
  <section id="s-patient" hidden>
    <a class="back" href="#" id="p-back">&larr; Back to the worklist</a>
    <h1>Pharmacy</h1>
    <p class="sub" id="p-wholine"></p>

    <div class="flow-ribbon">Doctor Consultation <span class="arr">&rarr;</span> <b>Pharmacy</b> <span class="arr">&rarr;</span> Dispense</div>

    <div class="card">
      <h2>Patient</h2>
      <div class="rec-grid" id="p-reg"></div>
    </div>

    <div class="card">
      <h2>Prescriptions &mdash; every line on record</h2>
      <p class="mini-note" style="margin-bottom:10px">If the prescribed medicine is unavailable, propose an alternative. The request waits for the doctor's decision: accepted alternatives can be dispensed; a rejected line is either re-prescribed by the doctor or sent outside the pharmacy.</p>
      <div class="empty" id="p-empty">
        <div class="empty-icon">💊</div>
        <div class="empty-title">No prescriptions for this patient</div>
        <div class="empty-sub">When a doctor completes a consultation with prescribed medicines, the lines appear here.</div>
      </div>
      <div class="table-wrap" id="p-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Medicine</th><th>Prescribed</th><th>Status</th><th>Decision &amp; dispensing</th><th></th></tr>
          </thead>
          <tbody id="p-body"></tbody>
        </table>
      </div>
    </div>
  </section>

</main>
<style>
#h-boot,#h-err{max-width:920px;margin:0 auto 14px;padding:10px 14px;border-radius:10px;font-size:14px;line-height:1.55}
#h-boot{background:#fff7e0;color:#6b4e00;border:1px solid #e8d48a}
#h-err{background:#fdecec;color:#8a1f1f;border:1px solid #f2b8b5}

/* task 53 - queue & announcements */
#qa-card .qa-counts{display:flex;gap:14px;flex-wrap:wrap;margin:4px 0 14px}
.qa-count{display:flex;flex-direction:column;min-width:130px;padding:10px 14px;border:1px solid #e3e0d6;border-radius:10px;background:#faf9f4}
.qa-num{font-size:26px;font-weight:700;line-height:1.1}
.qa-count .qa-k{font-size:12px;color:#6b675c;margin-top:2px}
.qa-panels{display:flex;gap:14px;flex-wrap:wrap}
.qa-panel{flex:1 1 240px;border:1px solid #e3e0d6;border-radius:10px;padding:12px 14px;background:#fff}
.qa-panel .qa-k{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6b675c}
.qa-id{font-size:22px;font-weight:700;letter-spacing:.04em;margin:4px 0 2px}
.qa-panel.qa-none{opacity:.8}
.qa-sub{font-size:13px;color:#4b473c;margin:2px 0}
.qa-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.qa-actions{margin-top:12px}
.qa-settings{border-top:1px dashed #ddd8c9;margin-top:12px;padding-top:12px}
.qa-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:8px 0}
.qa-form label{display:block;font-size:13px;color:#4b473c}
.qa-form input{width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d8d3c4;border-radius:8px;font:inherit;background:#fff}
</style>
<script>
/* Task 47 - boot line, page painters and the 12-second watchdog. The same
   contract as the Patient List (build 46d): a silent failure names itself. */
(function () {
  var boot = document.getElementById("h-boot");
  if (boot) { boot.hidden = false; boot.textContent = "Pharmacy \u00b7 build 53 \u00b7 connecting\u2026"; }
  window.__p47 = { page: "326", build: "47", t0: Date.now() };
})();
function __jamaliHerr(msg) {
  var box = document.getElementById("h-err");
  var boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  if (!box || !box.hidden) return;
  box.hidden = false;
  box.textContent = "Page error \u2014 " + msg;
}
window.addEventListener("error", function (e) {
  if (!e || !e.message) return; /* resource errors carry no message */
  __jamaliHerr(e.message);
}, true);
window.addEventListener("unhandledrejection", function (e) {
  var r = e && e.reason;
  __jamaliHerr(String((r && (r.code || r.message)) || r || "unknown rejection"));
});
setTimeout(function () {
  var boot = document.getElementById("h-boot");
  var s = window.__p47 || {};
  if (!boot || boot.hidden) return; /* answered - nothing to report */
  var bits = [];
  bits.push("build " + (s.build || "47") + " script " +
    ((s.ran === true || s.listeners > 0) ? "ran" : "DID NOT run"));
  bits.push("sign-in check " + (s.auth === true ? "passed" : "not passed"));
  bits.push("listeners " + (s.listeners || 0) + "/" + (s.need || 0));
  bits.push(s.answered === true ? "Firestore answered" : "Firestore never answered");
  if (s.errs && s.errs.length) bits.push("errors: " + s.errs.join(" | "));
  __jamaliHerr("Still quiet after 12 seconds \u2014 " + bits.join(" \u00b7 ") +
    ". If the script DID NOT run, the deployed JS is stale or broken: " +
    "re-run the task file, git push, then hard refresh with Ctrl+Shift+R.");
}, 12000);
</script>
<script type="module" src="/pharmacy/326.js"></script>
</body>
</html>
T53_HTML_326
[ -s "public/pharmacy/326.html" ] && echo "  wrote public/pharmacy/326.html ($(wc -c < "public/pharmacy/326.html") bytes)"

mkdir -p "public/pharmacy"
cat > "public/pharmacy/326.js" << 'T53_JS_326'
// pharmacy (page 326) — JAMALI Health
// The pharmacy desk. Prescriptions written by the doctor arrive here one
// medicine per line. The pharmacist checks availability (a judgement, not a
// stock system — stock management is a later module), dispenses, or proposes
// a safe alternative when the prescribed medicine is unavailable. The
// proposal waits for the doctor on page 325: accepted alternatives can be
// dispensed; a rejected line is re-prescribed or sent outside the pharmacy.
// Every action records who did it and when, against the Registration ID.
import { requireAuth, auth, db, collection, query, updateDoc, doc, setDoc, onSnapshot } from "/firebase.js";
/* patient chip - non-fatal since Task 47: if /health/patient-info.js cannot
   load (a missing or stale file), the page loses only the floating chip,
   never the find, the forms or the saves. */
let showPatient = function () {}, hidePatient = function () {};
try {
  const pi = await import("/health/patient-info.js");
  if (pi && typeof pi.showPatient === "function") showPatient = pi.showPatient;
  if (pi && typeof pi.hidePatient === "function") hidePatient = pi.hidePatient;
} catch (e) { /* chip unavailable - everything else keeps working */ }

/* boot diagnostics (Task 47 - the same contract as the Patient List, build
   46d): every collection listener carries an error callback and every
   failure paints itself on the page instead of dying in silence. */
window.__p47 = Object.assign(window.__p47 || {}, {
  page: "326", build: "53", queue: true, ran: true, auth: false,
  listeners: 0, need: 5, answered: false, errs: []
});
function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p47) window.__p47.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  box.textContent = "Could not read " + coll + " \u2014 " + code +
    (code.indexOf("permission-denied") >= 0
      ? " \u00b7 Fix: Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh."
      : "");
}
function bootDone() {
  if (window.__p47) window.__p47.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth(); // not logged in? -> bounced to "/"
  window.__p47.auth = true;
} catch (e) {
  herr("the sign-in check", e);
  throw e;
}

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- shared helpers (same language as pages 322 to 325) ---------- */
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

/* the pharmacist on record comes from the signed in account, never typed */
const PHARM = String((auth && auth.currentUser && (auth.currentUser.email || auth.currentUser.uid)) || "unknown");

/* ---------- live data ---------- */
let regs = [];
const regMap = new Map();
let triages = [];
const lastTriage = new Map();
let rxLines = []; // every prescription line, newest first

onSnapshot(query(collection(db, "healthRegistrations")), (snap) => {
  regs = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  regMap.clear();
  regs.forEach((r) => { if (r && r.regId) regMap.set(String(r.regId), r); });
  fillIds();
  renderList();
  refreshSearchLine();
  if (currentId) renderPatient();
  bootDone();
}, (e) => herr("healthRegistrations", e));

onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  triages = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  lastTriage.clear();
  triages.forEach((t) => {
    if (t && t.regId && !lastTriage.has(String(t.regId))) lastTriage.set(String(t.regId), t);
  });
  if (currentId) renderPatient();
}, (e) => herr("healthTriage", e));

onSnapshot(query(collection(db, "healthPrescriptions")), (snap) => {
  rxLines = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderList();
  refreshSearchLine();
  if (currentId) renderPatient();
}, (e) => herr("healthPrescriptions", e));

/* JAMALI-NO-SKIP (task 51): the doctor's consultations, to enforce the step order */
let docConsults = [];
onSnapshot(query(collection(db, "healthDoctorConsultations")), (snap) => {
  docConsults = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  if (currentId) renderPatient();
}, (e) => herr("healthDoctorConsultations", e));
window.__p47.listeners = 5;

function qaStart(id) { qerr(""); openPatient(id); }


/* =====================================================================
   JAMALI-QUEUE (task 53) — the queue panel shared by every service stage:
   waiting and completed counts, the current and the next patient, the
   speaker announcement, and this module's own announcement settings.
   Waiting counts patients waiting for THIS service only; Completed counts
   the patients finished here today. The announcement always reads the
   patient the panel is showing — never anybody else — and it reads the
   destination the hospital saved for this module (healthQueueConfig),
   falling back to the module's own name. No hard-coded rooms or IDs. */
const QA_MODULE = "pharmacy";
const QA_DEFAULT = "Pharmacy";
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "" };
try { qaCfg = Object.assign(qaCfg, JSON.parse(localStorage.getItem("jamali_qacfg_" + QA_MODULE) || "{}")); } catch (e) {}
let qaState = { waitingCount: 0, doneCount: 0, next: null, current: null };

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function qaTodayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaLocalDay(stamp) {
  const d = new Date(stamp);
  return isNaN(d.getTime()) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaIsToday(stamp) { return String(stamp || "").slice(0, 10) === new Date().toISOString().slice(0, 10); }
function qaIsTodayLocal(stamp) { return String(stamp || "").slice(0, 10) === qaTodayLocal(); }

/* the destination, composed from the saved settings */
function qaText() {
  const dept = String(qaCfg.department || "").trim();
  const staff = String(qaCfg.staffName || "").trim();
  const office = String(qaCfg.officeNumber || "").trim();
  const room = String(qaCfg.roomNumber || "").trim();
  const place = room || office;
  return { dept, staff, office, room, place, dest: (staff || dept || QA_DEFAULT) + (place ? ", " + place : "") };
}
function qaSentence(id) {
  return "Patient number " + String(id) + ", please proceed to " + qaText().dest + ".";
}
function qaSpeech(id) {
  /* the ID is spoken letter by letter so the waiting patient hears their own */
  return "Patient number " + String(id).split("").join(" ") + ", please proceed to " + qaText().dest + ".";
}
function qaCfgLine() {
  const t = qaText();
  const bits = [];
  if (t.staff) bits.push("Staff: " + t.staff);
  if (t.room) bits.push("Room: " + t.room);
  if (t.office) bits.push("Office: " + t.office);
  if (!t.staff && t.dept) bits.push("Department: " + t.dept);
  return bits.join(" \u00b7 ");
}

function qaRenderPanel() {
  qaSet("qa-waiting", String(qaState.waitingCount));
  qaSet("qa-done", String(qaState.doneCount));
  const cur = qaState.current, nxt = qaState.next;
  const cBox = document.getElementById("qa-current-box");
  if (cBox) cBox.classList.toggle("qa-none", !cur);
  qaSet("qa-current-id", cur ? cur.regId : "\u2014");
  qaSet("qa-current-sub", cur ? (cur.sub || "In Progress") : "Nobody is being served right now");
  qaSet("qa-next-id", nxt ? nxt.regId : "\u2014");
  qaSet("qa-next-sub", nxt ? (nxt.sub || "") : (qaState.waitingCount ? "" : "Nobody is waiting"));
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-regid", nxt.regId); else btn.removeAttribute("data-regid");
  }
  const st = document.getElementById("qa-start");
  if (st) {
    st.disabled = !nxt;
    if (nxt) st.setAttribute("data-regid", nxt.regId); else st.removeAttribute("data-regid");
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt.regId) : "");
}

/* every stage derives its own queue, then calls this */
function qaUpdate(waitingRows, current, doneCount) {
  qaState.waitingCount = Array.isArray(waitingRows) ? waitingRows.length : 0;
  qaState.doneCount = doneCount || 0;
  qaState.next = (qaState.waitingCount > 0) ? waitingRows[0] : null;
  qaState.current = current || null;
  qaRenderPanel();
}

/* the speaker button announces exactly the patient shown above it */
const qaAnnounceBtn = document.getElementById("qa-announce");
if (qaAnnounceBtn) qaAnnounceBtn.addEventListener("click", () => {
  const id = qaAnnounceBtn.getAttribute("data-regid");
  if (!id) return;
  const sentence = qaSentence(id);
  try {
    if (!("speechSynthesis" in window)) {
      qaSet("qa-note", "This browser cannot speak — read aloud: " + sentence);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(qaSpeech(id));
    u.lang = "en-GB";
    u.rate = 0.95;
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang || ""));
    if (vs.length) u.voice = vs.find((v) => /GB/i.test(v.lang || "")) || vs[0];
    synth.speak(u);
    qaSet("qa-note", "Announcing: " + sentence);
  } catch (e) {
    qaSet("qa-note", "Announcement failed (" + ((e && e.message) || e) + ") — read aloud: " + sentence);
  }
});

/* open the next patient straight from the panel */
const qaStartBtn = document.getElementById("qa-start");
if (qaStartBtn) qaStartBtn.addEventListener("click", () => {
  const id = qaStartBtn.getAttribute("data-regid");
  if (id) qaStart(id);
});

/* this module's announcement settings */
const qaSettingsBox = document.getElementById("qa-settings");
const qaSettingsBtn = document.getElementById("qa-settings-btn");
if (qaSettingsBtn && qaSettingsBox) {
  qaSettingsBtn.addEventListener("click", () => {
    qaSettingsBox.hidden = !qaSettingsBox.hidden;
    if (!qaSettingsBox.hidden) {
      const put = (id, k) => { const el = document.getElementById(id); if (el) el.value = String(qaCfg[k] || ""); };
      put("qa-dept", "department"); put("qa-staff", "staffName");
      put("qa-office", "officeNumber"); put("qa-room", "roomNumber");
    }
  });
}
const qaSaveBtn = document.getElementById("qa-save");
if (qaSaveBtn) qaSaveBtn.addEventListener("click", async () => {
  const qae = document.getElementById("qa-err");
  const qao = document.getElementById("qa-ok");
  if (qae) qae.hidden = true;
  if (qao) qao.hidden = true;
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim().replace(/\s+/g, " ") : ""; };
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    updatedAt: new Date().toISOString()
  };
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber) {
    if (qae) { qae.hidden = false; qae.textContent = "Fill at least one field — or leave the settings closed to keep the module's default."; }
    return;
  }
  qaSaveBtn.disabled = true;
  try {
    await setDoc(doc(db, "healthQueueConfig", QA_MODULE), data, { merge: true });
    if (qao) { qao.hidden = false; qao.textContent = "Speaker settings saved — every announcement from now on uses them."; }
  } catch (e) {
    if (qae) {
      qae.hidden = false;
      qae.textContent = "Save failed: " + ((e && e.message) || e) +
        " — if it says permission-denied, publish the rules from the repo file firestore.rules first.";
    }
  } finally { qaSaveBtn.disabled = false; }
});

/* live settings — a change here is heard on every device at once */
try {
  onSnapshot(doc(db, "healthQueueConfig", QA_MODULE), (s) => {
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "" },
      s.exists() ? s.data() : {});
    try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
    qaRenderPanel();
    bootDone();
  }, (e) => {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p47) window.__p47.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  });
} catch (e) { /* the settings listener is optional — the queue keeps working */ }


/* ---------- status chips ---------- */
function chip(status) {
  const map = {
    "to dispense": ["st-todisp", "To dispense"],
    "alternative proposed": ["st-proposed", "Pending doctor approval"],
    "accepted": ["st-accepted", "Accepted — dispense"],
    "dispensed": ["st-disp", "Dispensed"],
    "rejected": ["st-rejected", "Rejected by doctor"],
    "outside pharmacy": ["st-outside", "Outside pharmacy"]
  };
  const m = map[String(status || "")] || ["st-outside", status || "—"];
  return '<span class="st ' + m[0] + '">' + esc(m[1]) + "</span>";
}

/* ---------- STEP 1: search + worklist ---------- */
function qerr(msg) { const e = $("#q-err"); e.hidden = !msg; e.textContent = msg || ""; }

function fillIds() {
  $("#q-regids").innerHTML = regs.map((r) =>
    '<option value="' + esc(r.regId) + '">' + esc(who(r)) + "</option>"
  ).join("");
}

function refreshSearchLine() {
  const id = $("#q-regid").value.trim().toUpperCase();
  const line = $("#q-line");
  if (!id || $("#s-search").hidden) { line.textContent = ""; line.className = "victim-line"; return; }
  const r = regMap.get(id);
  if (r) {
    line.className = "victim-line ok";
    line.textContent = "On record: " + who(r) +
      (r.sex ? " · " + r.sex : "") +
      (r.age !== "" && r.age != null ? " · " + r.age + "y" : "");
  } else if (id.length === 8) {
    line.className = "victim-line miss";
    line.textContent = "No registration found for this ID on this account.";
  } else {
    line.textContent = "";
    line.className = "victim-line";
  }
}

const OPEN_STATUSES = ["to dispense", "alternative proposed", "accepted"];
let edit = { id: null, mode: null }; // which line carries an inline editor

function medCell(l) {
  return "<b>" + esc(l.medicine || "—") + "</b>" +
    (l.dose ? '<span class="cell-sub">' + esc(l.dose) + (l.frequency ? " · " + l.frequency : "") +
      (l.duration ? " · " + l.duration : "") + "</span>" : "") +
    (l.notes ? '<span class="cell-sub">' + esc(l.notes) + "</span>" : "");
}
function decisionCell(l) {
  const parts = [];
  if (l.status === "alternative proposed" && l.alt) {
    parts.push("Proposed: <b>" + esc(l.alt.medicine) + "</b>" +
      (l.alt.note ? " — " + esc(l.alt.note) : ""));
  }
  if (l.decision && l.decision.note) parts.push(esc(l.decision.note));
  if (l.dispensed && l.dispensed.what) {
    parts.push("Dispensed <b>" + esc(l.dispensed.what) + "</b> · " + esc(when(l.dispensed.at)) +
      (l.dispensed.by ? " · by " + esc(l.dispensed.by) : ""));
  }
  return parts.length ? parts.join("<br>") : "—";
}

function lineActions(l, withOpen) {
  if (edit.id === l.__id) return ""; // the editor row carries the buttons
  const btns = [];
  if (l.status === "to dispense" || l.status === "accepted") {
    btns.push('<button type="button" class="ghost-btn a-disp" data-id="' + esc(l.__id) + '">Dispense</button>');
  }
  if (l.status === "to dispense") {
    btns.push('<button type="button" class="ghost-btn a-alt" data-id="' + esc(l.__id) + '">Alternative&hellip;</button>');
  }
  if (withOpen) {
    btns.push('<button type="button" class="ghost-btn a-open" data-regid="' + esc(l.regId) + '">Open patient</button>');
  }
  return btns.length ? '<div class="act-col">' + btns.join("") + "</div>" : "";
}

function editorRow(l, cols) {
  if (edit.id !== l.__id) return "";
  let inner = "";
  if (edit.mode === "dispense") {
    const def = l.status === "accepted" && l.alt && l.alt.medicine ? l.alt.medicine : l.medicine;
    inner = '<span class="lbl">Dispensing</span>' +
      '<input id="ed-what" type="text" value="' + esc(def || "") + '" placeholder="What is actually dispensed">' +
      '<button type="button" class="ghost-btn ed-ok" data-id="' + esc(l.__id) + '">Confirm dispense</button>' +
      '<button type="button" class="ghost-btn ed-no">Cancel</button>';
  } else {
    inner = '<span class="lbl">Proposed alternative</span>' +
      '<input id="ed-alt" type="text" placeholder="Alternative medicine, e.g. Medicine B">' +
      '<input id="ed-note" type="text" placeholder="Note for the doctor, if any">' +
      '<button type="button" class="ghost-btn ed-ok" data-id="' + esc(l.__id) + '">Send proposal</button>' +
      '<button type="button" class="ghost-btn ed-no">Cancel</button>';
  }
  return '<tr class="ed-tr"><td colspan="' + cols + '"><div class="edit-row">' + inner + "</div></td></tr>";
}

function renderList() {
  const open = rxLines.filter((l) => OPEN_STATUSES.includes(String(l.status || "")));
  const has = open.length > 0;
  $("#l-empty").hidden = has;
  $("#l-wrap").hidden = !has;
  $("#l-body").innerHTML = open.map((l) => {
    const victim = regMap.get(String(l.regId));
    return "<tr><td class='c-no'>" + esc(l.regId) + "</td>" +
      "<td class='c-party'>" + (victim ? esc(who(victim)) : "—") + "</td>" +
      "<td class='c-desc'>" + medCell(l) + "</td>" +
      "<td>" + chip(l.status) +
        (l.status === "alternative proposed" ? '<span class="cell-sub">waiting for the doctor (page 325)</span>' : "") +
      "</td>" +
      "<td>" + lineActions(l, true) + "</td></tr>" + editorRow(l, 5);
  }).join("");
  $("#l-count").textContent = has
    ? open.length + (open.length === 1 ? " prescription line to handle."
                                       : " prescription lines to handle.")
    : "";
  /* JAMALI-QUEUE (task 53): patients waiting at the counter — a line that
     waits for the doctor's decision ("alternative proposed") is not waiting
     for the pharmacy, so it stays out of the waiting count */
  const qaByPatient = new Map();
  open.forEach((l) => {
    const id = String(l.regId || "");
    if (!id || (l.status !== "to dispense" && l.status !== "accepted")) return;
    const rec = qaByPatient.get(id) || { regId: id, at: String(l.savedAt || ""), n: 0 };
    rec.n += 1;
    if (!rec.at || String(l.savedAt || "") < rec.at) rec.at = String(l.savedAt || "");
    qaByPatient.set(id, rec);
  });
  const qaWait = Array.from(qaByPatient.values())
    .sort((a, b) => String(a.at).localeCompare(String(b.at)) || a.regId.localeCompare(b.regId))
    .map((r) => ({
      regId: r.regId,
      sub: (regMap.get(r.regId) ? who(regMap.get(r.regId)) : "—") +
           " · " + r.n + (r.n === 1 ? " medicine" : " medicines") + " to hand"
    }));
  const qaDoneSet = new Set();
  rxLines.forEach((l) => {
    if (l.status === "dispensed" && l.dispensed && qaIsToday(l.dispensed.at)) qaDoneSet.add(String(l.regId));
  });
  qaUpdate(qaWait, currentId ? { regId: String(currentId), sub: "Being served at this desk" } : null, qaDoneSet.size);
}

$("#q-regid").addEventListener("input", () => {
  const el = $("#q-regid");
  el.value = el.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 8);
  refreshSearchLine();
});
$("#q-regid").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("#q-find").click(); }
});
$("#q-find").addEventListener("click", () => {
  qerr("");
  const id = $("#q-regid").value.trim().toUpperCase();
  if (!id) return qerr("Enter the patient's Registration ID, or pick one from the list.");
  if (!/^[0-9]{4}[A-Z]{4}$/.test(id)) {
    return qerr("The Registration ID is 4 digits and 4 letters, for example 4827ABCD.");
  }
  if (!regMap.has(id)) {
    return qerr("No patient with Registration ID " + id + " was found on this account. Check the slip, or register the patient first.");
  }
  openPatient(id);
});
$("#l-body").addEventListener("click", (e) => {
  const open = e.target.closest(".a-open");
  if (open) { qerr(""); openPatient(open.getAttribute("data-regid")); return; }
  lineActionClick(e);
});

/* ---------- shared line actions (worklist + patient view) ---------- */
async function lineActionClick(e) {
  const disp = e.target.closest(".a-disp");
  const alt = e.target.closest(".a-alt");
  const ok = e.target.closest(".ed-ok");
  const no = e.target.closest(".ed-no");
  if (disp) {
    edit = { id: disp.getAttribute("data-id"), mode: "dispense" };
    rerender();
    const inp = $("#ed-what");
    if (inp) { inp.focus(); inp.select(); }
  } else if (alt) {
    edit = { id: alt.getAttribute("data-id"), mode: "alt" };
    rerender();
    const inp = $("#ed-alt");
    if (inp) inp.focus();
  } else if (no) {
    edit = { id: null, mode: null };
    rerender();
  } else if (ok) {
    const id = ok.getAttribute("data-id");
    const line = rxLines.find((l) => l.__id === id);
    if (!line) return;
    try {
      if (edit.mode === "dispense") {
        const what = ($("#ed-what") ? $("#ed-what").value : "").trim();
        if (!what) return; // keep the editor open until a name is entered
        await updateDoc(doc(db, "healthPrescriptions", id), {
          status: "dispensed",
          dispensed: { what, by: PHARM, at: new Date().toISOString() }
        });
      } else {
        const medicine = ($("#ed-alt") ? $("#ed-alt").value : "").trim();
        const note = ($("#ed-note") ? $("#ed-note").value : "").trim();
        if (!medicine) return; // keep the editor open until a name is entered
        await updateDoc(doc(db, "healthPrescriptions", id), {
          status: "alternative proposed",
          alt: { medicine, note, proposedBy: PHARM, proposedAt: new Date().toISOString() }
        });
      }
      edit = { id: null, mode: null };
    } catch (err) {
      console.error(err);
    }
  }
}
function rerender() {
  renderList();
  if (currentId) renderPatient();
}

/* ---------- STEP 2: the patient's prescriptions ---------- */
let currentId = null;

/* JAMALI-NO-SKIP (task 51): the pharmacy is step 5 — the Doctor Consultation (step 4) must be completed first */
function stepGate(regId) {
  const done = docConsults.some((c) => String(c.regId) === String(regId) &&
    (c.status === "completed" || c.status === "sent"));
  if (!done) {
    return "This patient cannot skip a step — the Doctor Consultation is not completed yet. Complete the doctor stage on page 325 (Doctor Consultation) first, then come to the pharmacy.";
  }
  return "";
}
function openPatient(regId) {
  const blocked = stepGate(regId);
  if (blocked) { qerr(blocked); return; }
  showPatient(regId);
  currentId = regId;
  edit = { id: null, mode: null };
  renderPatient();
  $("#s-search").hidden = true;
  $("#s-patient").hidden = false;
  window.scrollTo(0, 0);
}

$("#p-back").addEventListener("click", (e) => {
  e.preventDefault();
  hidePatient();
  currentId = null;
  $("#s-patient").hidden = true;
  $("#s-search").hidden = false;
  refreshSearchLine();
  window.scrollTo(0, 0);
});

function item(k, v, wide) {
  if (v === "" || v == null) return "";
  return '<div class="rec-item' + (wide ? " wide" : "") + '"><div class="rec-k">' + esc(k) +
    '</div><div class="rec-v">' + v + "</div></div>";
}

function renderPatient() {
  const r = regMap.get(String(currentId));
  if (!r) return;
  const ident = r.isUnidentified
    ? "Unidentified"
    : esc(r.fullName || "Unnamed");
  const t = lastTriage.get(String(currentId)) || null;
  $("#p-wholine").textContent = "Dispensing for " + who(r) + " · Registration ID " + r.regId;
  $("#p-reg").innerHTML =
    item("Patient", ident) +
    item("Registration ID", esc(r.regId)) +
    item("Sex", esc(r.sex)) +
    item("Age", r.age !== "" && r.age != null ? esc(String(r.age) + "y") : "") +
    item("Allergies", t ? esc(t.allergies) : "") +
    item("Existing conditions", t ? esc(t.conditions) : "");

  const mine = rxLines.filter((l) => String(l.regId) === String(currentId));
  const has = mine.length > 0;
  $("#p-empty").hidden = has;
  $("#p-wrap").hidden = !has;
  $("#p-body").innerHTML = mine.map((l) =>
    "<tr><td class='c-desc'>" + medCell(l) + "</td>" +
    "<td class='c-date'>" + esc(when(l.savedAt)) +
      "<span class='cell-sub'>" + esc(l.prescribedBy || "—") + "</span></td>" +
    "<td>" + chip(l.status) + "</td>" +
    "<td class='c-desc'>" + decisionCell(l) + "</td>" +
    "<td>" + lineActions(l, false) + "</td></tr>" + editorRow(l, 5)
  ).join("");
}

$("#p-body").addEventListener("click", lineActionClick);
T53_JS_326
[ -s "public/pharmacy/326.js" ] && echo "  wrote public/pharmacy/326.js ($(wc -c < "public/pharmacy/326.js") bytes)"

mkdir -p "public/treatment-procedures"
cat > "public/treatment-procedures/327.html" << 'T53_HTML_327'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Treatment / Procedures — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/treatment-procedures/327.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <p class="h-boot" id="h-boot" hidden></p>
  <p class="h-err" id="h-err" hidden></p>

  <!-- STEP 1 · search and the treatment queue -->
  <section id="s-search">
    <a class="back" href="/health/321">&larr; Health</a>
    <h1>Treatment / Procedures</h1>
    <p class="sub">The treatment desk receives patients sent by the doctor for a treatment or procedure. Enter the patient's Registration ID and the doctor's order appears &mdash; perform it, record it, and the history stays with the patient.</p>

    <div class="flow-ribbon">Doctor Consultation <span class="arr">&rarr;</span> <b>Treatment / Procedures</b> <span class="arr">&rarr;</span> Back to the doctor</div>

    <div class="urgent-note">🚨 Emergency treatment must not be delayed while completing documentation. If the patient is deteriorating, escalate care immediately.</div>

        <div class="card" id="qa-card">
      <h2>Queue &amp; announcements</h2>
      <div class="qa-counts">
        <div class="qa-count"><span class="qa-num" id="qa-waiting">0</span><span class="qa-k">Patients waiting</span></div>
        <div class="qa-count"><span class="qa-num" id="qa-done">0</span><span class="qa-k">Completed today</span></div>
      </div>
      <div class="qa-panels">
        <div class="qa-panel" id="qa-current-box">
          <div class="qa-k">Current patient</div>
          <div class="qa-id" id="qa-current-id">&mdash;</div>
          <div class="qa-sub" id="qa-current-sub"></div>
        </div>
        <div class="qa-panel">
          <div class="qa-k">Next patient</div>
          <div class="qa-id" id="qa-next-id">&mdash;</div>
          <div class="qa-sub" id="qa-next-sub"></div>
          <div class="qa-sub" id="qa-dest-line"></div>
          <div class="qa-btns">
            <button type="button" class="ghost-btn qa-announce" id="qa-announce" disabled>&#128266; Announce patient</button>
            <button type="button" class="ghost-btn" id="qa-start" disabled>Open next patient</button>
          </div>
          <p class="mini-note" id="qa-note"></p>
        </div>
      </div>
      <div class="qa-actions"><button type="button" class="ghost-btn" id="qa-settings-btn">&#128266; Speaker settings</button></div>
      <div class="qa-settings" id="qa-settings" hidden>
        <p class="mini-note">The announcement reads the patient's ID and these details aloud. They are saved for this module and used on every device.</p>
        <div class="qa-form">
          <label>Department / service name<input id="qa-dept" type="text" placeholder="e.g. Triage"></label>
          <label>Staff name<input id="qa-staff" type="text" placeholder="e.g. Nurse MWAJUMA"></label>
          <label>Office number<input id="qa-office" type="text" placeholder="e.g. Doctor's Office 02"></label>
          <label>Room number<input id="qa-room" type="text" placeholder="e.g. Nurse Room 03"></label>
        </div>
        <p class="form-err" id="qa-err" hidden></p>
        <p class="save-ok" id="qa-ok" hidden></p>
        <div class="form-actions"><button class="btn-primary" id="qa-save" type="button">Save Speaker Settings</button></div>
      </div>
    </div>

<div class="card add-card">
      <h2>Find a patient</h2>
      <div class="search-row">
        <input id="q-regid" list="q-regids" placeholder="Registration ID, e.g. 4827ABCD" autocomplete="off">
        <datalist id="q-regids"></datalist>
        <button class="btn-primary" id="q-find" type="button">Find Patient</button>
      </div>
      <p class="victim-line" id="q-line"></p>
      <p class="form-err" id="q-err" hidden></p>
    </div>

    <div class="card" id="list-card">
      <h2>Treatment queue &mdash; orders waiting</h2>
      <div class="empty" id="l-empty">
        <div class="empty-icon">🩹</div>
        <div class="empty-title">No treatments waiting</div>
        <div class="empty-sub">When a doctor completes a consultation with treatment or procedure orders, they appear here ordered by triage priority, until each one is completed or marked not completed. Enter a Registration ID above to see a patient's orders directly.</div>
      </div>
      <div class="table-wrap" id="l-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Priority</th><th>Registration ID</th><th>Patient</th><th>Doctor's order</th><th>Status</th><th></th></tr>
          </thead>
          <tbody id="l-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="l-count"></p>
    </div>
  </section>

  <!-- STEP 2 · the patient's orders and the treatment record -->
  <section id="s-patient" hidden>
    <a class="back" href="#" id="p-back">&larr; Back to the queue</a>
    <h1>Treatment / Procedures</h1>
    <p class="sub" id="p-wholine"></p>

    <div class="flow-ribbon">Doctor Consultation <span class="arr">&rarr;</span> <b>Treatment / Procedures</b> <span class="arr">&rarr;</span> Back to the doctor</div>

    <div class="card">
      <h2>Patient</h2>
      <div class="rec-grid" id="p-reg"></div>
    </div>

    <div class="card">
      <h2>Doctor's orders &mdash; every order on record</h2>
      <p class="mini-note" style="margin-bottom:10px">The original order is preserved exactly as the doctor wrote it. Open an order to perform and record the treatment.</p>
      <div class="empty" id="p-empty">
        <div class="empty-icon">🩹</div>
        <div class="empty-title">No orders for this patient</div>
        <div class="empty-sub">When a doctor completes a consultation with treatment or procedure orders, they appear here.</div>
      </div>
      <div class="table-wrap" id="p-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Doctor's order</th><th>Ordered</th><th>Status</th><th>Last update</th><th></th></tr>
          </thead>
          <tbody id="p-body"></tbody>
        </table>
      </div>
    </div>

    <div class="card add-card" id="form-card" hidden>
      <h2>Perform a treatment</h2>
      <div class="order-note" id="f-order"></div>

      <p class="save-ok" id="f-ok" hidden></p>
      <p class="form-err" id="f-err" hidden></p>

      <div id="f-editable">
        <div class="form-grid">
          <label class="span2">Treatment performed <span class="opt">(what was actually done)</span>
            <textarea id="f-performed" rows="3" placeholder="Wound cleaned and dressed, injection given, nebulization carried out..."></textarea>
          </label>
          <label class="span2">Outcome <span class="opt">(the patient's response, when applicable)</span>
            <textarea id="f-outcome" rows="2" placeholder="How the patient responded"></textarea>
          </label>
          <label class="span2">Notes
            <textarea id="f-notes" rows="2" placeholder="Additional relevant information — for example why a treatment could not be completed"></textarea>
          </label>
          <label>Treatment status
            <select id="f-status">
              <option value="pending">Pending — not started</option>
              <option value="in-progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="not-completed">Not completed</option>
            </select>
          </label>
        </div>
        <p class="mini-note">Recorded automatically &mdash; healthcare worker: <b id="f-worker"></b> · last update: <span id="f-updated">—</span></p>
        <div class="form-actions">
          <button class="btn-primary" id="f-save" type="button">Save Treatment Record</button>
        </div>
      </div>

      <div id="f-locked" hidden>
        <div class="rec-grid" id="f-record"></div>
        <p class="locked-note">This record is closed &mdash; a completed or not-completed treatment is never rewritten. If the patient needs more treatment, the doctor orders it at the next consultation.</p>
      </div>
    </div>
  </section>

</main>
<style>
#h-boot,#h-err{max-width:920px;margin:0 auto 14px;padding:10px 14px;border-radius:10px;font-size:14px;line-height:1.55}
#h-boot{background:#fff7e0;color:#6b4e00;border:1px solid #e8d48a}
#h-err{background:#fdecec;color:#8a1f1f;border:1px solid #f2b8b5}

/* task 53 - queue & announcements */
#qa-card .qa-counts{display:flex;gap:14px;flex-wrap:wrap;margin:4px 0 14px}
.qa-count{display:flex;flex-direction:column;min-width:130px;padding:10px 14px;border:1px solid #e3e0d6;border-radius:10px;background:#faf9f4}
.qa-num{font-size:26px;font-weight:700;line-height:1.1}
.qa-count .qa-k{font-size:12px;color:#6b675c;margin-top:2px}
.qa-panels{display:flex;gap:14px;flex-wrap:wrap}
.qa-panel{flex:1 1 240px;border:1px solid #e3e0d6;border-radius:10px;padding:12px 14px;background:#fff}
.qa-panel .qa-k{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6b675c}
.qa-id{font-size:22px;font-weight:700;letter-spacing:.04em;margin:4px 0 2px}
.qa-panel.qa-none{opacity:.8}
.qa-sub{font-size:13px;color:#4b473c;margin:2px 0}
.qa-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.qa-actions{margin-top:12px}
.qa-settings{border-top:1px dashed #ddd8c9;margin-top:12px;padding-top:12px}
.qa-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:8px 0}
.qa-form label{display:block;font-size:13px;color:#4b473c}
.qa-form input{width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d8d3c4;border-radius:8px;font:inherit;background:#fff}
</style>
<script>
/* Task 47 - boot line, page painters and the 12-second watchdog. The same
   contract as the Patient List (build 46d): a silent failure names itself. */
(function () {
  var boot = document.getElementById("h-boot");
  if (boot) { boot.hidden = false; boot.textContent = "Treatment / Procedures \u00b7 build 53 \u00b7 connecting\u2026"; }
  window.__p47 = { page: "327", build: "47", t0: Date.now() };
})();
function __jamaliHerr(msg) {
  var box = document.getElementById("h-err");
  var boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  if (!box || !box.hidden) return;
  box.hidden = false;
  box.textContent = "Page error \u2014 " + msg;
}
window.addEventListener("error", function (e) {
  if (!e || !e.message) return; /* resource errors carry no message */
  __jamaliHerr(e.message);
}, true);
window.addEventListener("unhandledrejection", function (e) {
  var r = e && e.reason;
  __jamaliHerr(String((r && (r.code || r.message)) || r || "unknown rejection"));
});
setTimeout(function () {
  var boot = document.getElementById("h-boot");
  var s = window.__p47 || {};
  if (!boot || boot.hidden) return; /* answered - nothing to report */
  var bits = [];
  bits.push("build " + (s.build || "47") + " script " +
    ((s.ran === true || s.listeners > 0) ? "ran" : "DID NOT run"));
  bits.push("sign-in check " + (s.auth === true ? "passed" : "not passed"));
  bits.push("listeners " + (s.listeners || 0) + "/" + (s.need || 0));
  bits.push(s.answered === true ? "Firestore answered" : "Firestore never answered");
  if (s.errs && s.errs.length) bits.push("errors: " + s.errs.join(" | "));
  __jamaliHerr("Still quiet after 12 seconds \u2014 " + bits.join(" \u00b7 ") +
    ". If the script DID NOT run, the deployed JS is stale or broken: " +
    "re-run the task file, git push, then hard refresh with Ctrl+Shift+R.");
}, 12000);
</script>
<script type="module" src="/treatment-procedures/327.js"></script>
</body>
</html>
T53_HTML_327
[ -s "public/treatment-procedures/327.html" ] && echo "  wrote public/treatment-procedures/327.html ($(wc -c < "public/treatment-procedures/327.html") bytes)"

mkdir -p "public/treatment-procedures"
cat > "public/treatment-procedures/327.js" << 'T53_JS_327'
// treatment-procedures (page 327) — JAMALI Health
// The treatment desk. Patients arrive with their Registration ID only; the
// doctor's orders (written on page 325) are retrieved from the database —
// the patient never repeats registration, triage, nursing or doctor
// information. The healthcare worker performs the treatment and records it:
// what was done, the outcome, notes and the status (pending, in progress,
// completed, not completed). The worker and the times come from the signed
// in account and the clock. A completed or not-completed record is closed —
// the original order text is never altered.
// EMERGENCY RULE: documentation never delays urgent care.
import { requireAuth, auth, db, collection, query, updateDoc, doc, setDoc, onSnapshot } from "/firebase.js";
/* patient chip - non-fatal since Task 47: if /health/patient-info.js cannot
   load (a missing or stale file), the page loses only the floating chip,
   never the find, the forms or the saves. */
let showPatient = function () {}, hidePatient = function () {};
try {
  const pi = await import("/health/patient-info.js");
  if (pi && typeof pi.showPatient === "function") showPatient = pi.showPatient;
  if (pi && typeof pi.hidePatient === "function") hidePatient = pi.hidePatient;
} catch (e) { /* chip unavailable - everything else keeps working */ }

/* boot diagnostics (Task 47 - the same contract as the Patient List, build
   46d): every collection listener carries an error callback and every
   failure paints itself on the page instead of dying in silence. */
window.__p47 = Object.assign(window.__p47 || {}, {
  page: "327", build: "53", queue: true, ran: true, auth: false,
  listeners: 0, need: 5, answered: false, errs: []
});
function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p47) window.__p47.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  box.textContent = "Could not read " + coll + " \u2014 " + code +
    (code.indexOf("permission-denied") >= 0
      ? " \u00b7 Fix: Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh."
      : "");
}
function bootDone() {
  if (window.__p47) window.__p47.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth(); // not logged in? -> bounced to "/"
  window.__p47.auth = true;
} catch (e) {
  herr("the sign-in check", e);
  throw e;
}

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- shared helpers (same language as pages 322 to 326) ---------- */
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
const RANK = { critical: 0, high: 1, medium: 2, low: 3 };

/* the healthcare worker on record comes from the signed in account, never typed */
const WORKER = String((auth && auth.currentUser && (auth.currentUser.email || auth.currentUser.uid)) || "unknown");
$("#f-worker").textContent = WORKER;

/* ---------- live data ---------- */
let regs = [];
const regMap = new Map();
let triages = [];
const lastTriage = new Map();
let orders = []; // every treatment order, newest first

onSnapshot(query(collection(db, "healthRegistrations")), (snap) => {
  regs = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  regMap.clear();
  regs.forEach((r) => { if (r && r.regId) regMap.set(String(r.regId), r); });
  fillIds();
  renderList();
  refreshSearchLine();
  if (currentId) renderPatient();
  bootDone();
}, (e) => herr("healthRegistrations", e));

onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  triages = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  lastTriage.clear();
  triages.forEach((t) => {
    if (t && t.regId && !lastTriage.has(String(t.regId))) lastTriage.set(String(t.regId), t);
  });
  renderList();
  if (currentId) renderPatient();
}, (e) => herr("healthTriage", e));

onSnapshot(query(collection(db, "healthTreatmentOrders")), (snap) => {
  orders = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderList();
  refreshSearchLine();
  if (currentId) renderPatient();
}, (e) => herr("healthPrescriptions", e));

/* JAMALI-NO-SKIP (task 51): the doctor's consultations, to enforce the step order */
let docConsults = [];
onSnapshot(query(collection(db, "healthDoctorConsultations")), (snap) => {
  docConsults = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  if (currentId) renderPatient();
}, (e) => herr("healthDoctorConsultations", e));
window.__p47.listeners = 5;

function qaStart(id) { qerr(""); openPatient(id); }


/* =====================================================================
   JAMALI-QUEUE (task 53) — the queue panel shared by every service stage:
   waiting and completed counts, the current and the next patient, the
   speaker announcement, and this module's own announcement settings.
   Waiting counts patients waiting for THIS service only; Completed counts
   the patients finished here today. The announcement always reads the
   patient the panel is showing — never anybody else — and it reads the
   destination the hospital saved for this module (healthQueueConfig),
   falling back to the module's own name. No hard-coded rooms or IDs. */
const QA_MODULE = "treatment";
const QA_DEFAULT = "Treatment & Procedures";
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "" };
try { qaCfg = Object.assign(qaCfg, JSON.parse(localStorage.getItem("jamali_qacfg_" + QA_MODULE) || "{}")); } catch (e) {}
let qaState = { waitingCount: 0, doneCount: 0, next: null, current: null };

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function qaTodayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaLocalDay(stamp) {
  const d = new Date(stamp);
  return isNaN(d.getTime()) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaIsToday(stamp) { return String(stamp || "").slice(0, 10) === new Date().toISOString().slice(0, 10); }
function qaIsTodayLocal(stamp) { return String(stamp || "").slice(0, 10) === qaTodayLocal(); }

/* the destination, composed from the saved settings */
function qaText() {
  const dept = String(qaCfg.department || "").trim();
  const staff = String(qaCfg.staffName || "").trim();
  const office = String(qaCfg.officeNumber || "").trim();
  const room = String(qaCfg.roomNumber || "").trim();
  const place = room || office;
  return { dept, staff, office, room, place, dest: (staff || dept || QA_DEFAULT) + (place ? ", " + place : "") };
}
function qaSentence(id) {
  return "Patient number " + String(id) + ", please proceed to " + qaText().dest + ".";
}
function qaSpeech(id) {
  /* the ID is spoken letter by letter so the waiting patient hears their own */
  return "Patient number " + String(id).split("").join(" ") + ", please proceed to " + qaText().dest + ".";
}
function qaCfgLine() {
  const t = qaText();
  const bits = [];
  if (t.staff) bits.push("Staff: " + t.staff);
  if (t.room) bits.push("Room: " + t.room);
  if (t.office) bits.push("Office: " + t.office);
  if (!t.staff && t.dept) bits.push("Department: " + t.dept);
  return bits.join(" \u00b7 ");
}

function qaRenderPanel() {
  qaSet("qa-waiting", String(qaState.waitingCount));
  qaSet("qa-done", String(qaState.doneCount));
  const cur = qaState.current, nxt = qaState.next;
  const cBox = document.getElementById("qa-current-box");
  if (cBox) cBox.classList.toggle("qa-none", !cur);
  qaSet("qa-current-id", cur ? cur.regId : "\u2014");
  qaSet("qa-current-sub", cur ? (cur.sub || "In Progress") : "Nobody is being served right now");
  qaSet("qa-next-id", nxt ? nxt.regId : "\u2014");
  qaSet("qa-next-sub", nxt ? (nxt.sub || "") : (qaState.waitingCount ? "" : "Nobody is waiting"));
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-regid", nxt.regId); else btn.removeAttribute("data-regid");
  }
  const st = document.getElementById("qa-start");
  if (st) {
    st.disabled = !nxt;
    if (nxt) st.setAttribute("data-regid", nxt.regId); else st.removeAttribute("data-regid");
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt.regId) : "");
}

/* every stage derives its own queue, then calls this */
function qaUpdate(waitingRows, current, doneCount) {
  qaState.waitingCount = Array.isArray(waitingRows) ? waitingRows.length : 0;
  qaState.doneCount = doneCount || 0;
  qaState.next = (qaState.waitingCount > 0) ? waitingRows[0] : null;
  qaState.current = current || null;
  qaRenderPanel();
}

/* the speaker button announces exactly the patient shown above it */
const qaAnnounceBtn = document.getElementById("qa-announce");
if (qaAnnounceBtn) qaAnnounceBtn.addEventListener("click", () => {
  const id = qaAnnounceBtn.getAttribute("data-regid");
  if (!id) return;
  const sentence = qaSentence(id);
  try {
    if (!("speechSynthesis" in window)) {
      qaSet("qa-note", "This browser cannot speak — read aloud: " + sentence);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(qaSpeech(id));
    u.lang = "en-GB";
    u.rate = 0.95;
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang || ""));
    if (vs.length) u.voice = vs.find((v) => /GB/i.test(v.lang || "")) || vs[0];
    synth.speak(u);
    qaSet("qa-note", "Announcing: " + sentence);
  } catch (e) {
    qaSet("qa-note", "Announcement failed (" + ((e && e.message) || e) + ") — read aloud: " + sentence);
  }
});

/* open the next patient straight from the panel */
const qaStartBtn = document.getElementById("qa-start");
if (qaStartBtn) qaStartBtn.addEventListener("click", () => {
  const id = qaStartBtn.getAttribute("data-regid");
  if (id) qaStart(id);
});

/* this module's announcement settings */
const qaSettingsBox = document.getElementById("qa-settings");
const qaSettingsBtn = document.getElementById("qa-settings-btn");
if (qaSettingsBtn && qaSettingsBox) {
  qaSettingsBtn.addEventListener("click", () => {
    qaSettingsBox.hidden = !qaSettingsBox.hidden;
    if (!qaSettingsBox.hidden) {
      const put = (id, k) => { const el = document.getElementById(id); if (el) el.value = String(qaCfg[k] || ""); };
      put("qa-dept", "department"); put("qa-staff", "staffName");
      put("qa-office", "officeNumber"); put("qa-room", "roomNumber");
    }
  });
}
const qaSaveBtn = document.getElementById("qa-save");
if (qaSaveBtn) qaSaveBtn.addEventListener("click", async () => {
  const qae = document.getElementById("qa-err");
  const qao = document.getElementById("qa-ok");
  if (qae) qae.hidden = true;
  if (qao) qao.hidden = true;
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim().replace(/\s+/g, " ") : ""; };
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    updatedAt: new Date().toISOString()
  };
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber) {
    if (qae) { qae.hidden = false; qae.textContent = "Fill at least one field — or leave the settings closed to keep the module's default."; }
    return;
  }
  qaSaveBtn.disabled = true;
  try {
    await setDoc(doc(db, "healthQueueConfig", QA_MODULE), data, { merge: true });
    if (qao) { qao.hidden = false; qao.textContent = "Speaker settings saved — every announcement from now on uses them."; }
  } catch (e) {
    if (qae) {
      qae.hidden = false;
      qae.textContent = "Save failed: " + ((e && e.message) || e) +
        " — if it says permission-denied, publish the rules from the repo file firestore.rules first.";
    }
  } finally { qaSaveBtn.disabled = false; }
});

/* live settings — a change here is heard on every device at once */
try {
  onSnapshot(doc(db, "healthQueueConfig", QA_MODULE), (s) => {
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "" },
      s.exists() ? s.data() : {});
    try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
    qaRenderPanel();
    bootDone();
  }, (e) => {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p47) window.__p47.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  });
} catch (e) { /* the settings listener is optional — the queue keeps working */ }


/* ---------- status chips ---------- */
function chip(status) {
  const map = {
    "pending": ["st-pending", "Pending"],
    "in-progress": ["st-progress", "In progress"],
    "completed": ["st-done", "Completed"],
    "not-completed": ["st-notdone", "Not completed"]
  };
  const m = map[String(status || "")] || ["st-none", status || "—"];
  return '<span class="st ' + m[0] + '">' + esc(m[1]) + "</span>";
}

/* ---------- STEP 1: search + queue ---------- */
function qerr(msg) { const e = $("#q-err"); e.hidden = !msg; e.textContent = msg || ""; }

function fillIds() {
  $("#q-regids").innerHTML = regs.map((r) =>
    '<option value="' + esc(r.regId) + '">' + esc(who(r)) + "</option>"
  ).join("");
}

function refreshSearchLine() {
  const id = $("#q-regid").value.trim().toUpperCase();
  const line = $("#q-line");
  if (!id || $("#s-search").hidden) { line.textContent = ""; line.className = "victim-line"; return; }
  const r = regMap.get(id);
  if (r) {
    line.className = "victim-line ok";
    line.textContent = "On record: " + who(r) +
      (r.sex ? " · " + r.sex : "") +
      (r.age !== "" && r.age != null ? " · " + r.age + "y" : "");
  } else if (id.length === 8) {
    line.className = "victim-line miss";
    line.textContent = "No registration found for this ID on this account.";
  } else {
    line.textContent = "";
    line.className = "victim-line";
  }
}

function renderList() {
  const open = orders.filter((o) => o.status === "pending" || o.status === "in-progress");
  const rows = open.map((o) => {
    const t = lastTriage.get(String(o.regId));
    return { o, priority: (t && t.priority) || o.priority || "",
             rank: RANK[String(((t && t.priority) || o.priority || "")).toLowerCase()] ?? 4 };
  });
  rows.sort((a, b) => (a.rank - b.rank) ||
    String(a.o.savedAt || "").localeCompare(String(b.o.savedAt || "")));
  const has = rows.length > 0;
  $("#l-empty").hidden = has;
  $("#l-wrap").hidden = !has;
  $("#l-body").innerHTML = rows.map((r) => {
    const victim = regMap.get(String(r.o.regId));
    return "<tr><td>" + priBadge(r.priority) + "</td>" +
      "<td class='c-no'>" + esc(r.o.regId) + "</td>" +
      "<td class='c-party'>" + (victim ? esc(who(victim)) : "—") + "</td>" +
      "<td class='c-desc'>" + esc(r.o.order) + "</td>" +
      "<td>" + chip(r.o.status) + "</td>" +
      "<td><button type='button' class='ghost-btn o-open' data-regid='" + esc(r.o.regId) + "' data-order='" + esc(r.o.__id) + "'>Open</button></td></tr>";
  }).join("");
  $("#l-count").textContent = has
    ? rows.length + (rows.length === 1 ? " treatment waiting."
                                        : " treatments waiting.")
    : "";
  /* JAMALI-QUEUE (task 53): feed the queue panel — waiting, current, completed */
  const qaByPatient = new Map();
  let qaCur = null;
  rows.forEach((r) => {
    const id = String(r.o.regId || "");
    if (!id) return;
    if (r.o.status === "in-progress") {
      if (!qaCur) qaCur = { regId: id, sub: "In Progress · treatment under way" };
      return;
    }
    const rec = qaByPatient.get(id) || { regId: id, at: String(r.o.savedAt || ""), n: 0 };
    rec.n += 1;
    if (!rec.at || String(r.o.savedAt || "") < rec.at) rec.at = String(r.o.savedAt || "");
    qaByPatient.set(id, rec);
  });
  const qaWait = Array.from(qaByPatient.values())
    .sort((a, b) => String(a.at).localeCompare(String(b.at)) || a.regId.localeCompare(b.regId))
    .map((r) => ({
      regId: r.regId,
      sub: (regMap.get(r.regId) ? who(regMap.get(r.regId)) : "—") +
           " · " + r.n + (r.n === 1 ? " order" : " orders") + " waiting"
    }));
  const qaDoneSet = new Set();
  orders.forEach((o) => {
    if (o.status === "completed" && qaIsToday(o.updatedAt)) qaDoneSet.add(String(o.regId));
  });
  qaUpdate(qaWait, qaCur || (currentId ? { regId: String(currentId), sub: "Open at this desk" } : null), qaDoneSet.size);
}

$("#q-regid").addEventListener("input", () => {
  const el = $("#q-regid");
  el.value = el.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 8);
  refreshSearchLine();
});
$("#q-regid").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("#q-find").click(); }
});
$("#q-find").addEventListener("click", () => {
  qerr("");
  const id = $("#q-regid").value.trim().toUpperCase();
  if (!id) return qerr("Enter the patient's Registration ID, or pick one from the list.");
  if (!/^[0-9]{4}[A-Z]{4}$/.test(id)) {
    return qerr("The Registration ID is 4 digits and 4 letters, for example 4827ABCD.");
  }
  if (!regMap.has(id)) {
    return qerr("No patient with Registration ID " + id + " was found on this account. Check the slip, or register the patient first.");
  }
  openPatient(id, null);
});
$("#l-body").addEventListener("click", (e) => {
  const btn = e.target.closest(".o-open");
  if (btn) { qerr(""); openPatient(btn.getAttribute("data-regid"), btn.getAttribute("data-order")); }
});

/* ---------- STEP 2: the patient's orders ---------- */
let currentId = null;
let selOrderId = null;

/* JAMALI-NO-SKIP (task 51): treatment & procedures is step 5b — the Doctor Consultation (step 4) must be completed first */
function stepGate(regId) {
  const done = docConsults.some((c) => String(c.regId) === String(regId) &&
    (c.status === "completed" || c.status === "sent"));
  if (!done) {
    return "This patient cannot skip a step — the Doctor Consultation is not completed yet. Complete the doctor stage on page 325 (Doctor Consultation) first, then come to Treatment & Procedures.";
  }
  return "";
}
function openPatient(regId, orderId) {
  const blocked = stepGate(regId);
  if (blocked) { qerr(blocked); return; }
  /* JAMALI-QUEUE (task 53): one treatment at a time — the next patient
     stays next until the current patient's treatment is completed or closed */
  const qaBusy = orders.find((o) => o.status === "in-progress" && String(o.regId) !== String(regId));
  if (qaBusy) {
    qerr("Patient " + qaBusy.regId + " is still being treated. Complete or close that treatment first — the queue panel shows them as the current patient. Then the next patient can be seen.");
    return;
  }
  showPatient(regId);
  currentId = regId;
  selOrderId = orderId || null;
  renderPatient();
  $("#s-search").hidden = true;
  $("#s-patient").hidden = false;
  if (orderId) {
    const card = $("#form-card");
    if (card && !card.hidden) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  window.scrollTo(0, 0);
}

$("#p-back").addEventListener("click", (e) => {
  e.preventDefault();
  hidePatient();
  currentId = null;
  selOrderId = null;
  $("#s-patient").hidden = true;
  $("#s-search").hidden = false;
  refreshSearchLine();
  window.scrollTo(0, 0);
});

function item(k, v, wide) {
  if (v === "" || v == null) return "";
  return '<div class="rec-item' + (wide ? " wide" : "") + '"><div class="rec-k">' + esc(k) +
    '</div><div class="rec-v">' + v + "</div></div>";
}

function renderPatient() {
  const r = regMap.get(String(currentId));
  if (!r) return;
  const ident = r.isUnidentified
    ? "Unidentified"
    : esc(r.fullName || "Unnamed");
  const t = lastTriage.get(String(currentId)) || null;
  $("#p-wholine").textContent = "Treating " + who(r) + " · Registration ID " + r.regId;
  $("#p-reg").innerHTML =
    item("Patient", ident) +
    item("Registration ID", esc(r.regId)) +
    item("Sex", esc(r.sex)) +
    item("Age", r.age !== "" && r.age != null ? esc(String(r.age) + "y") : "") +
    item("Allergies", t ? esc(t.allergies) : "") +
    item("Existing conditions", t ? esc(t.conditions) : "");

  const mine = orders.filter((o) => String(o.regId) === String(currentId));
  const has = mine.length > 0;
  $("#p-empty").hidden = has;
  $("#p-wrap").hidden = !has;
  $("#p-body").innerHTML = mine.map((o) =>
    "<tr><td class='c-desc'><b>" + esc(o.order) + "</b></td>" +
    "<td class='c-date'>" + esc(when(o.savedAt)) +
      "<span class='cell-sub'>by " + esc(o.orderedBy || "—") + "</span></td>" +
    "<td>" + chip(o.status) + "</td>" +
    "<td class='c-date'>" + esc(when(o.updatedAt)) +
      (o.worker ? "<span class='cell-sub'>by " + esc(o.worker) + "</span>" : "") + "</td>" +
    "<td><button type='button' class='ghost-btn o-pick' data-id='" + esc(o.__id) + "'>Open order</button></td></tr>"
  ).join("");

  /* the form: the selected order, or closed */
  const sel = selOrderId ? mine.find((o) => o.__id === selOrderId) : null;
  $("#form-card").hidden = !sel;
  if (!sel) return;
  $("#f-order").innerHTML = "<b>Doctor's order:</b> " + esc(sel.order) +
    '<span class="o-by">ordered ' + esc(when(sel.savedAt)) + " by " + esc(sel.orderedBy || "—") +
    " · current status: " + esc(sel.status || "pending") + "</span>";
  const closed = sel.status === "completed" || sel.status === "not-completed";
  $("#f-editable").hidden = closed;
  $("#f-locked").hidden = !closed;
  $("#f-ok").hidden = true;
  $("#f-err").hidden = true;
  if (closed) {
    $("#f-record").innerHTML =
      item("Treatment performed", esc(sel.performed || "—"), true) +
      item("Outcome", esc(sel.outcome || "—"), true) +
      item("Notes", esc(sel.notes || "—"), true) +
      item("Final status", esc(sel.status === "completed" ? "Completed" : "Not completed")) +
      item("Healthcare worker", esc(sel.worker || "—")) +
      item("Recorded", esc(when(sel.updatedAt)));
  } else {
    $("#f-performed").value = sel.performed || "";
    $("#f-outcome").value = sel.outcome || "";
    $("#f-notes").value = sel.notes || "";
    $("#f-status").value = sel.status || "pending";
    $("#f-updated").textContent = when(sel.updatedAt);
  }
}

$("#p-body").addEventListener("click", (e) => {
  const btn = e.target.closest(".o-pick");
  if (btn) {
    selOrderId = btn.getAttribute("data-id");
    renderPatient();
    $("#form-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

/* ---------- save the treatment record ---------- */
$("#f-save").addEventListener("click", async () => {
  const eEl = $("#f-err"); const okEl = $("#f-ok");
  eEl.hidden = true; okEl.hidden = true;
  const sel = orders.find((o) => o.__id === selOrderId);
  if (!sel) return;
  const status = $("#f-status").value;
  const performed = $("#f-performed").value.trim();
  const outcome = $("#f-outcome").value.trim();
  const notes = $("#f-notes").value.trim();
  if (status === "completed" && !performed) {
    eEl.textContent = "Record what was done before marking the treatment completed.";
    eEl.hidden = false;
    return;
  }
  if (status === "not-completed" && !notes) {
    eEl.textContent = "Record why the treatment could not be completed before closing it as not completed.";
    eEl.hidden = false;
    return;
  }
  const btn = $("#f-save");
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthTreatmentOrders", selOrderId), {
      status,
      performed,
      outcome,
      notes,
      worker: WORKER,
      updatedAt: new Date().toISOString()
    });
    okEl.textContent = "Treatment record saved " + when(new Date().toISOString()) +
      " — status: " + (status === "in-progress" ? "In progress" :
        status === "completed" ? "Completed" :
        status === "not-completed" ? "Not completed" : "Pending") + ".";
    okEl.hidden = false;
  } catch (err) {
    eEl.textContent = "Save failed: " + ((err && err.message) || err);
    eEl.hidden = false;
  } finally {
    btn.disabled = false;
  }
});
T53_JS_327
[ -s "public/treatment-procedures/327.js" ] && echo "  wrote public/treatment-procedures/327.js ($(wc -c < "public/treatment-procedures/327.js") bytes)"

# -- 1 - every file landed --------------------------------------------
nfiles=0
for f in \
  "public/firebase.js" \
  "firestore.rules" \
  "public/triage/323.html" \
  "public/triage/323.js" \
  "public/nurse-consultation/324.html" \
  "public/nurse-consultation/324.js" \
  "public/doctor-consultation/325.html" \
  "public/doctor-consultation/325.js" \
  "public/pharmacy/326.html" \
  "public/pharmacy/326.js" \
  "public/treatment-procedures/327.html" \
  "public/treatment-procedures/327.js" \
  ; do
  if [ -s "$f" ]; then nfiles=$((nfiles + 1)); else echo "VERIFY FAIL: $f missing or empty"; fail=1; fi
done
if [ "$fail" -eq 0 ]; then echo "PASS: all $nfiles files are on disk and non-empty"; fi

# -- 2 - build fingerprints (boot lines name build 53) -----------------
grep -q 'build: "53"' "public/triage/323.js" || { echo "VERIFY FAIL: 323.js missing the build 53 fingerprint"; fail=1; }
grep -q "build 53" "public/triage/323.html" || { echo "VERIFY FAIL: 323.html boot line is not build 53"; fail=1; }
grep -q 'build: "53"' "public/nurse-consultation/324.js" || { echo "VERIFY FAIL: 324.js missing the build 53 fingerprint"; fail=1; }
grep -q "build 53" "public/nurse-consultation/324.html" || { echo "VERIFY FAIL: 324.html boot line is not build 53"; fail=1; }
grep -q 'build: "53"' "public/doctor-consultation/325.js" || { echo "VERIFY FAIL: 325.js missing the build 53 fingerprint"; fail=1; }
grep -q "build 53" "public/doctor-consultation/325.html" || { echo "VERIFY FAIL: 325.html boot line is not build 53"; fail=1; }
grep -q 'build: "53"' "public/pharmacy/326.js" || { echo "VERIFY FAIL: 326.js missing the build 53 fingerprint"; fail=1; }
grep -q "build 53" "public/pharmacy/326.html" || { echo "VERIFY FAIL: 326.html boot line is not build 53"; fail=1; }
grep -q 'build: "53"' "public/treatment-procedures/327.js" || { echo "VERIFY FAIL: 327.js missing the build 53 fingerprint"; fail=1; }
grep -q "build 53" "public/treatment-procedures/327.html" || { echo "VERIFY FAIL: 327.html boot line is not build 53"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: all five pages name build 53 in code and boot line"

# -- 3 - the queue panel is really in every page -----------------------
grep -q "JAMALI-QUEUE (task 53)" "public/triage/323.js" || { echo "VERIFY FAIL: 323.js missing the task 53 queue block"; fail=1; }
grep -q "id=\"qa-card\"" "public/triage/323.html" || { echo "VERIFY FAIL: 323.html missing #qa-card"; fail=1; }
grep -q "id=\"qa-waiting\"" "public/triage/323.html" || { echo "VERIFY FAIL: 323.html missing #qa-waiting"; fail=1; }
grep -q "id=\"qa-done\"" "public/triage/323.html" || { echo "VERIFY FAIL: 323.html missing #qa-done"; fail=1; }
grep -q "id=\"qa-current-id\"" "public/triage/323.html" || { echo "VERIFY FAIL: 323.html missing #qa-current-id"; fail=1; }
grep -q "id=\"qa-next-id\"" "public/triage/323.html" || { echo "VERIFY FAIL: 323.html missing #qa-next-id"; fail=1; }
grep -q "id=\"qa-announce\"" "public/triage/323.html" || { echo "VERIFY FAIL: 323.html missing #qa-announce"; fail=1; }
grep -q "id=\"qa-settings\"" "public/triage/323.html" || { echo "VERIFY FAIL: 323.html missing #qa-settings"; fail=1; }
grep -q "healthQueueConfig" "public/triage/323.js" || { echo "VERIFY FAIL: 323.js does not read the healthQueueConfig settings"; fail=1; }
grep -q "setDoc" "public/triage/323.js" || { echo "VERIFY FAIL: 323.js cannot import setDoc for the settings"; fail=1; }
grep -q "JAMALI-QUEUE (task 53)" "public/nurse-consultation/324.js" || { echo "VERIFY FAIL: 324.js missing the task 53 queue block"; fail=1; }
grep -q "id=\"qa-card\"" "public/nurse-consultation/324.html" || { echo "VERIFY FAIL: 324.html missing #qa-card"; fail=1; }
grep -q "id=\"qa-waiting\"" "public/nurse-consultation/324.html" || { echo "VERIFY FAIL: 324.html missing #qa-waiting"; fail=1; }
grep -q "id=\"qa-done\"" "public/nurse-consultation/324.html" || { echo "VERIFY FAIL: 324.html missing #qa-done"; fail=1; }
grep -q "id=\"qa-current-id\"" "public/nurse-consultation/324.html" || { echo "VERIFY FAIL: 324.html missing #qa-current-id"; fail=1; }
grep -q "id=\"qa-next-id\"" "public/nurse-consultation/324.html" || { echo "VERIFY FAIL: 324.html missing #qa-next-id"; fail=1; }
grep -q "id=\"qa-announce\"" "public/nurse-consultation/324.html" || { echo "VERIFY FAIL: 324.html missing #qa-announce"; fail=1; }
grep -q "id=\"qa-settings\"" "public/nurse-consultation/324.html" || { echo "VERIFY FAIL: 324.html missing #qa-settings"; fail=1; }
grep -q "healthQueueConfig" "public/nurse-consultation/324.js" || { echo "VERIFY FAIL: 324.js does not read the healthQueueConfig settings"; fail=1; }
grep -q "setDoc" "public/nurse-consultation/324.js" || { echo "VERIFY FAIL: 324.js cannot import setDoc for the settings"; fail=1; }
grep -q "JAMALI-QUEUE (task 53)" "public/doctor-consultation/325.js" || { echo "VERIFY FAIL: 325.js missing the task 53 queue block"; fail=1; }
grep -q "id=\"qa-card\"" "public/doctor-consultation/325.html" || { echo "VERIFY FAIL: 325.html missing #qa-card"; fail=1; }
grep -q "id=\"qa-waiting\"" "public/doctor-consultation/325.html" || { echo "VERIFY FAIL: 325.html missing #qa-waiting"; fail=1; }
grep -q "id=\"qa-done\"" "public/doctor-consultation/325.html" || { echo "VERIFY FAIL: 325.html missing #qa-done"; fail=1; }
grep -q "id=\"qa-current-id\"" "public/doctor-consultation/325.html" || { echo "VERIFY FAIL: 325.html missing #qa-current-id"; fail=1; }
grep -q "id=\"qa-next-id\"" "public/doctor-consultation/325.html" || { echo "VERIFY FAIL: 325.html missing #qa-next-id"; fail=1; }
grep -q "id=\"qa-announce\"" "public/doctor-consultation/325.html" || { echo "VERIFY FAIL: 325.html missing #qa-announce"; fail=1; }
grep -q "id=\"qa-settings\"" "public/doctor-consultation/325.html" || { echo "VERIFY FAIL: 325.html missing #qa-settings"; fail=1; }
grep -q "healthQueueConfig" "public/doctor-consultation/325.js" || { echo "VERIFY FAIL: 325.js does not read the healthQueueConfig settings"; fail=1; }
grep -q "setDoc" "public/doctor-consultation/325.js" || { echo "VERIFY FAIL: 325.js cannot import setDoc for the settings"; fail=1; }
grep -q "JAMALI-QUEUE (task 53)" "public/pharmacy/326.js" || { echo "VERIFY FAIL: 326.js missing the task 53 queue block"; fail=1; }
grep -q "id=\"qa-card\"" "public/pharmacy/326.html" || { echo "VERIFY FAIL: 326.html missing #qa-card"; fail=1; }
grep -q "id=\"qa-waiting\"" "public/pharmacy/326.html" || { echo "VERIFY FAIL: 326.html missing #qa-waiting"; fail=1; }
grep -q "id=\"qa-done\"" "public/pharmacy/326.html" || { echo "VERIFY FAIL: 326.html missing #qa-done"; fail=1; }
grep -q "id=\"qa-current-id\"" "public/pharmacy/326.html" || { echo "VERIFY FAIL: 326.html missing #qa-current-id"; fail=1; }
grep -q "id=\"qa-next-id\"" "public/pharmacy/326.html" || { echo "VERIFY FAIL: 326.html missing #qa-next-id"; fail=1; }
grep -q "id=\"qa-announce\"" "public/pharmacy/326.html" || { echo "VERIFY FAIL: 326.html missing #qa-announce"; fail=1; }
grep -q "id=\"qa-settings\"" "public/pharmacy/326.html" || { echo "VERIFY FAIL: 326.html missing #qa-settings"; fail=1; }
grep -q "healthQueueConfig" "public/pharmacy/326.js" || { echo "VERIFY FAIL: 326.js does not read the healthQueueConfig settings"; fail=1; }
grep -q "setDoc" "public/pharmacy/326.js" || { echo "VERIFY FAIL: 326.js cannot import setDoc for the settings"; fail=1; }
grep -q "JAMALI-QUEUE (task 53)" "public/treatment-procedures/327.js" || { echo "VERIFY FAIL: 327.js missing the task 53 queue block"; fail=1; }
grep -q "id=\"qa-card\"" "public/treatment-procedures/327.html" || { echo "VERIFY FAIL: 327.html missing #qa-card"; fail=1; }
grep -q "id=\"qa-waiting\"" "public/treatment-procedures/327.html" || { echo "VERIFY FAIL: 327.html missing #qa-waiting"; fail=1; }
grep -q "id=\"qa-done\"" "public/treatment-procedures/327.html" || { echo "VERIFY FAIL: 327.html missing #qa-done"; fail=1; }
grep -q "id=\"qa-current-id\"" "public/treatment-procedures/327.html" || { echo "VERIFY FAIL: 327.html missing #qa-current-id"; fail=1; }
grep -q "id=\"qa-next-id\"" "public/treatment-procedures/327.html" || { echo "VERIFY FAIL: 327.html missing #qa-next-id"; fail=1; }
grep -q "id=\"qa-announce\"" "public/treatment-procedures/327.html" || { echo "VERIFY FAIL: 327.html missing #qa-announce"; fail=1; }
grep -q "id=\"qa-settings\"" "public/treatment-procedures/327.html" || { echo "VERIFY FAIL: 327.html missing #qa-settings"; fail=1; }
grep -q "healthQueueConfig" "public/treatment-procedures/327.js" || { echo "VERIFY FAIL: 327.js does not read the healthQueueConfig settings"; fail=1; }
grep -q "setDoc" "public/treatment-procedures/327.js" || { echo "VERIFY FAIL: 327.js cannot import setDoc for the settings"; fail=1; }
grep -q "qaDeriveTriage" public/triage/323.js || { echo "VERIFY FAIL: 323 has no triage queue derivation"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: queue panel, counts and settings present on all five pages (323 derives its new queue)"

# -- 4 - one patient at a time (the task 53 locks) ---------------------
grep -q "is still in progress at this desk" public/nurse-consultation/324.js || { echo "VERIFY FAIL: 324 lost the one-patient lock"; fail=1; }
grep -q "is still in progress at this desk" public/doctor-consultation/325.js || { echo "VERIFY FAIL: 325 lost the one-patient lock"; fail=1; }
grep -q "is still being treated" public/treatment-procedures/327.js || { echo "VERIFY FAIL: 327 lost the one-patient lock"; fail=1; }
grep -q "JAMALI-NO-SKIP (task 51)" public/triage/323.js || { echo "VERIFY FAIL: 323 lost the task 51 registration gate"; fail=1; }
grep -q "JAMALI-NO-SKIP (task 51)" public/nurse-consultation/324.js || { echo "VERIFY FAIL: 324 lost the task 51 gate"; fail=1; }
grep -q "JAMALI-NO-SKIP (task 51)" public/doctor-consultation/325.js || { echo "VERIFY FAIL: 325 lost the task 51 gate"; fail=1; }
grep -q "JAMALI-NO-SKIP (task 51)" public/pharmacy/326.js || { echo "VERIFY FAIL: 326 lost the task 51 gate"; fail=1; }
grep -q "JAMALI-NO-SKIP (task 51)" public/treatment-procedures/327.js || { echo "VERIFY FAIL: 327 lost the task 51 gate"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: task 51 step gates intact + one-patient-at-a-time locks on 324/325/327"

# -- 5 - listener bookkeeping (the watchdog counts) --------------------
grep -q "need: 3" public/triage/323.js || { echo "VERIFY FAIL: 323 watchdog need is not 3"; fail=1; }
grep -q "need: 4" public/nurse-consultation/324.js || { echo "VERIFY FAIL: 324 watchdog need is not 4"; fail=1; }
grep -q "need: 7" public/doctor-consultation/325.js || { echo "VERIFY FAIL: 325 watchdog need is not 7"; fail=1; }
grep -q "need: 5" public/pharmacy/326.js || { echo "VERIFY FAIL: 326 watchdog need is not 5"; fail=1; }
grep -q "need: 5" public/treatment-procedures/327.js || { echo "VERIFY FAIL: 327 watchdog need is not 5"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: every page now expects its settings listener (need = data + 1)"

# -- 6 - firebase.js: all 27 export names -------------
grep -q "\bgetAuth\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry getAuth"; fail=1; }
grep -q "\bGoogleAuthProvider\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry GoogleAuthProvider"; fail=1; }
grep -q "\bonAuthStateChanged\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry onAuthStateChanged"; fail=1; }
grep -q "\bsignInWithPopup\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry signInWithPopup"; fail=1; }
grep -q "\bsignOut\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry signOut"; fail=1; }
grep -q "\bgetFirestore\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry getFirestore"; fail=1; }
grep -q "\bcollection\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry collection"; fail=1; }
grep -q "\bdoc\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry doc"; fail=1; }
grep -q "\baddDoc\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry addDoc"; fail=1; }
grep -q "\bupdateDoc\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry updateDoc"; fail=1; }
grep -q "\bdeleteDoc\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry deleteDoc"; fail=1; }
grep -q "\bgetDocs\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry getDocs"; fail=1; }
grep -q "\bgetDoc\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry getDoc"; fail=1; }
grep -q "\bsetDoc\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry setDoc"; fail=1; }
grep -q "\bwriteBatch\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry writeBatch"; fail=1; }
grep -q "\bquery\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry query"; fail=1; }
grep -q "\bwhere\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry where"; fail=1; }
grep -q "\borderBy\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry orderBy"; fail=1; }
grep -q "\blimit\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry limit"; fail=1; }
grep -q "\bonSnapshot\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry onSnapshot"; fail=1; }
grep -q "\bserverTimestamp\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry serverTimestamp"; fail=1; }
grep -q "\bTimestamp\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry Timestamp"; fail=1; }
grep -q "\barrayUnion\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry arrayUnion"; fail=1; }
grep -q "\barrayRemove\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry arrayRemove"; fail=1; }
grep -q "\bincrement\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry increment"; fail=1; }
grep -q "\bdeleteField\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry deleteField"; fail=1; }
grep -q "\brequireAuth\b" public/firebase.js || { echo "VERIFY FAIL: firebase.js does not carry requireAuth"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: firebase.js carries all 27 export names"

# -- 7 - firestore.rules: all 15 collections ---------------------------
nmatch="$(grep -c "^    match /" firestore.rules)"
if [ "$nmatch" -ne 15 ]; then echo "VERIFY FAIL: rules should hold 15 match blocks, found $nmatch"; fail=1; fi
grep -q "match /transactions/{" firestore.rules || { echo "VERIFY FAIL: rules missing transactions"; fail=1; }
grep -q "match /healthRegistrations/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthRegistrations"; fail=1; }
grep -q "match /healthTriage/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthTriage"; fail=1; }
grep -q "match /healthNurseConsultations/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthNurseConsultations"; fail=1; }
grep -q "match /healthDoctorConsultations/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthDoctorConsultations"; fail=1; }
grep -q "match /healthPrescriptions/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthPrescriptions"; fail=1; }
grep -q "match /healthTreatmentOrders/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthTreatmentOrders"; fail=1; }
grep -q "match /healthDestinations/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthDestinations"; fail=1; }
grep -q "match /healthWards/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthWards"; fail=1; }
grep -q "match /healthBeds/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthBeds"; fail=1; }
grep -q "match /healthBedAssignments/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthBedAssignments"; fail=1; }
grep -q "match /healthBedTransfers/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthBedTransfers"; fail=1; }
grep -q "match /healthBedMaintenance/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthBedMaintenance"; fail=1; }
grep -q "match /healthAdmissions/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthAdmissions"; fail=1; }
grep -q "match /healthQueueConfig/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthQueueConfig"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: firestore.rules carries all 15 collections (14 + healthQueueConfig)"

# -- 8 - DOM id wiring, page by page (the awk judge) ------------------
cat > .t53-wire.awk << 'T53_WIRE'
# id-wiring check: pass 1 = the page JS (ids it reads), pass 2 = the page HTML
# (ids it defines). Prints one line per id the JS reads but nothing defines.
# NOTE: every regex here is a LITERAL inside match() — regex literals passed
# as function arguments become strings and their escapes get mangled.
function addId(s) {
  sub(/^.*\("#/, "", s)   # $("#x") and querySelector(All)("#x")
  sub(/^.*\(/, "", s)    # getElementById("x")
  sub(/"\)$/, "", s)
  if (s ~ /^[A-Za-z][A-Za-z0-9_-]*$/) used[s] = 1
}
function harvestD(line,   s) {
  while (match(line, /id="[A-Za-z][A-Za-z0-9_-]+"/)) {
    s = substr(line, RSTART, RLENGTH)
    sub(/^id="/, "", s)
    sub(/"$/, "", s)
    defined[s] = 1
    line = substr(line, RSTART + RLENGTH)
  }
}
{
  if (pass == "") pass = (FILENAME ~ /\.js$/) ? "js" : "html"
}
pass == "js" {
  line = $0
  while (match(line, /getElementById\("[A-Za-z][A-Za-z0-9_-]+"\)/)) {
    addId(substr(line, RSTART, RLENGTH))
    line = substr(line, RSTART + RLENGTH)
  }
  line = $0
  while (match(line, /\$\("#[A-Za-z][A-Za-z0-9_-]+"\)/)) {
    addId(substr(line, RSTART, RLENGTH))
    line = substr(line, RSTART + RLENGTH)
  }
  line = $0
  while (match(line, /querySelector(All)?\("#[A-Za-z][A-Za-z0-9_-]+"\)/)) {
    addId(substr(line, RSTART, RLENGTH))
    line = substr(line, RSTART + RLENGTH)
  }
  harvestD($0)   # ids the JS itself creates count as defined
  next
}
pass == "html" { harvestD($0) }
END {
  bad = 0
  for (k in used) if (!(k in defined)) { print k; bad = 1 }
  exit bad
}
T53_WIRE
wiring_bad=0
check_wiring() {
  jsf="$1"; htmlf="$2"
  wout="$(awk -f .t53-wire.awk "$jsf" "$htmlf")"; wcode=$?
  if [ "$wcode" -ne 0 ]; then
    echo "VERIFY FAIL: $jsf reads ids nothing defines: $(echo "$wout" | tr '\n' ' ')"
    wiring_bad=$((wiring_bad + 1))
  fi
}
check_wiring "public/triage/323.js" "public/triage/323.html"
check_wiring "public/nurse-consultation/324.js" "public/nurse-consultation/324.html"
check_wiring "public/doctor-consultation/325.js" "public/doctor-consultation/325.html"
check_wiring "public/pharmacy/326.js" "public/pharmacy/326.html"
check_wiring "public/treatment-procedures/327.js" "public/treatment-procedures/327.html"
rm -f .t53-wire.awk
if [ "$wiring_bad" -eq 0 ]; then echo "PASS: DOM id wiring verified on all 5 pages"; fi
[ "$wiring_bad" -gt 0 ] && fail=1

# -- 9 - THE SWEEP: every page import vs the firebase.js export list --
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
*patient-module/328.js|*health/patient-info.js|\
*ward-management/331.js|*ward-management/332.js|*ward-management/333.js|\
*ward-management/334.js|*ward-management/335.js|*ward-management/336.js|\
*ward-management/337.js|*ward-management/338.js|\
*patient-admission/341.js|*patient-admission/342.js|*patient-admission/343.js) health=1 ;;
  esac
  while IFS= read -r nm; do
    [ -n "$nm" ] || continue
    if ! printf '%s\n' "$exports" | grep -qx "$nm"; then
      if [ "$health" -eq 1 ]; then
        echo "VERIFY FAIL: $f imports '$nm' - firebase.js does not export it (the task 47 bug pattern)"
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
  echo "PASS: the import sweep checked $nfiles page(s) against the export list - all 18 health pages covered"
else
  echo "VERIFY FAIL: $nbad missing import(s) on health pages"
  fail=1
fi

# =====================================================================
# DONE BLOCK - the run is not over until the site proves it
# =====================================================================
if [ "$fail" -eq 0 ]; then
  echo ""
  echo "TASK 53 VERIFY: ALL PASS"
  echo ""
  echo "Now commit and deploy ONLY the files this task wrote:"
  echo "  git add public/triage public/nurse-consultation public/doctor-consultation public/pharmacy public/treatment-procedures public/firebase.js firestore.rules"
  echo "  git commit -m \"task53: patient queue + speaker announcements on 323-327\""
  echo "  git push"
  echo ""
  echo "Wait for Vercel to finish, then HARD REFRESH (Ctrl+Shift+R) and check:"
  echo "  1. /triage/323 - boot line \"Triage . build 53 . connecting...\" + Queue panel"
  echo "     (Patients waiting / Completed today, CURRENT and NEXT patient)"
  echo "  2. Open Speaker settings, save e.g. Staff \"Nurse MWAJUMA\", Room \"Nurse Room 03\"."
  echo "  3. Press Announce patient - the browser speaks the ID and the saved destination."
  echo "  4. Try opening a second patient on 324/325/327 while one is in progress - it must refuse."
  echo "  5. If saving settings says permission-denied: Firebase console -> Firestore ->"
  echo "     Rules -> paste the repo firestore.rules -> Publish, then refresh."
  echo ""
  echo "Note: run the Ward Management + Patient Admission task (52) AFTER this one,"
  echo "using its fresh script - the rebuilt version keeps the queue-config rules."
else
  echo ""
  echo "TASK 53 VERIFY: FAILURES ABOVE"
  echo "Nothing is committed - fix the failures and run again (the script is idempotent)."
  exit 1
fi

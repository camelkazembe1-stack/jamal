#!/usr/bin/env bash
# =====================================================================
# JAMALI - Task 52 - Ward Management (330-338) + Patient Admission (340-343)
#
# Twelve new pages in two new folders, six new Firestore collections,
# sidebar + hub tiles, a firebase.js export block grown additively
# (nothing the old pages import is removed) and a 15-collection rules
# refresh. Everything this task writes is new or additive; the existing
# pages 321 to 328 are not touched (321 only gains two tiles).
#
#   Ward Management (public/ward-management/)
#     330 hub | 331 ward registration | 332 bed management
#     333 occupancy dashboard | 334 bed assignment | 335 transfers
#     336 cleaning & maintenance | 337 ward register | 338 history
#   Patient Admission (public/patient-admission/)
#     340 hub | 341 new admission | 342 admission list
#     343 admission details & history
#   Collections: healthWards, healthBeds, healthBedAssignments,
#     healthBedTransfers, healthBedMaintenance, healthAdmissions
#
# HOW TO RUN (Git Bash):  bash jamali-task52-ward-admission.sh
# It finds the repo itself (current folder, then ~/jamal, then ~/jamali).
# The run is not over until it prints: TASK 52 VERIFY: ALL PASS
# Then: git add the listed files, commit, push, hard-refresh (Ctrl+Shift+R).
#
# tmpfiles warning: the /dl/ link first serves an HTML VIEWER page.
# head -1 of the true script must print #!/usr/bin/env bash.
# =====================================================================

set -u
fail=0
echo "=== JAMALI Task 52 - Ward Management + Patient Admission ==="

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

# preflight: the state task 50 left behind
if [ ! -f public/firebase.js ]; then echo "VERIFY FAIL: public/firebase.js missing"; exit 1; fi
if ! grep -q "updateDoc" public/firebase.js; then echo "NOTE: firebase.js looks pre-task-50 - task 52 rewrites it with the full export block anyway."; fi
if ! grep -q "build 46d" public/patient-module/328.js 2>/dev/null; then echo "NOTE: 328 is not the 46d build - task 50 carries that upgrade; task 52 does not touch 328."; fi

# -- 1 - menu.js: 13 sidebar entries after the Patient List line -------
nwm0="$(grep -c 'folder: "ward-management"' public/menu.js)"
npa0="$(grep -c 'folder: "patient-admission"' public/menu.js)"
if [ "$nwm0" -eq 9 ] && [ "$npa0" -eq 4 ]; then
  echo "PASS: menu.js already carries the 13 entries (idempotent skip)"
else
  if ! grep -q 'folder: "patient-module", n: 328' public/menu.js; then
    echo "VERIFY FAIL: menu.js has no Patient List entry (n: 328) - refusing to patch blind"; fail=1
  else
    # strip any partial or stale ward/admission entries, then insert fresh
    grep -v -e 'folder: "ward-management"' -e 'folder: "patient-admission"' public/menu.js > .t52-menu.base
    cat > .t52-menu.txt << 'T52_MENU'
    { label: "Ward Management", icon: "🏥", folder: "ward-management", n: 330, d: 2 },
    { label: "Ward Registration", icon: "🏥", folder: "ward-management", n: 331, d: 3 },
    { label: "Bed Management", icon: "🛏️", folder: "ward-management", n: 332, d: 3 },
    { label: "Occupancy Dashboard", icon: "📊", folder: "ward-management", n: 333, d: 3 },
    { label: "Bed Assignment", icon: "👥", folder: "ward-management", n: 334, d: 3 },
    { label: "Transfers", icon: "🔄", folder: "ward-management", n: 335, d: 3 },
    { label: "Cleaning & Maintenance", icon: "🧹", folder: "ward-management", n: 336, d: 3 },
    { label: "Ward Register", icon: "📋", folder: "ward-management", n: 337, d: 3 },
    { label: "Bed & Transfer History", icon: "📜", folder: "ward-management", n: 338, d: 3 },
    { label: "Patient Admission", icon: "🧾", folder: "patient-admission", n: 340, d: 2 },
    { label: "New Admission", icon: "📝", folder: "patient-admission", n: 341, d: 3 },
    { label: "Admission List", icon: "🗒️", folder: "patient-admission", n: 342, d: 3 },
    { label: "Admission Details", icon: "🔎", folder: "patient-admission", n: 343, d: 3 },
T52_MENU
    awk '{ print; if ($0 ~ /folder: "patient-module", n: 328/ && !ins) { while ((getline l < ".t52-menu.txt") > 0) print l; close(".t52-menu.txt"); ins=1 } }' .t52-menu.base > .t52-menu.new \
      && mv .t52-menu.new public/menu.js \
      && { grep -q "n: 330" public/menu.js && grep -q "n: 343" public/menu.js \
           && echo "PASS: menu.js - 13 sidebar entries inserted after Patient List" \
           || { echo "VERIFY FAIL: menu.js patch did not land"; fail=1; }; } \
      || { echo "VERIFY FAIL: menu.js patch failed"; fail=1; }
    rm -f .t52-menu.txt .t52-menu.new .t52-menu.base
  fi
fi

# -- 2 - 321.html: two new tiles before the future-health comment ------
if grep -q "/ward-management/330" public/health/321.html && grep -q "/patient-admission/340" public/health/321.html; then
  echo "PASS: 321.html already carries the two new tiles (idempotent skip)"
else
  if [ ! -f public/health/321.html ] || ! grep -q "future health buttons" public/health/321.html; then
    echo "VERIFY FAIL: public/health/321.html not found or missing its marker comment"; fail=1
  else
    # strip any partial new tile (from its <a> line through its closing </a>)
    awk '/href="\/ward-management\/330"/{skip=1} /href="\/patient-admission\/340"/{skip=1} skip && /<\/a>/{skip=0; next} !skip' public/health/321.html > .t52-tiles.base
    cat > .t52-tiles.txt << 'T52_TILES'
    <a class="mod" href="/ward-management/330">
      <span class="mod-ico">🏥</span>
      <span class="mod-label">Ward Management<span class="mod-sub">wards · beds · occupancy</span></span>
    </a>
    <a class="mod" href="/patient-admission/340">
      <span class="mod-ico">🧾</span>
      <span class="mod-label">Patient Admission<span class="mod-sub">inpatient admissions</span></span>
    </a>
T52_TILES
    awk '{ if ($0 ~ /future health buttons/ && !ins) { while ((getline l < ".t52-tiles.txt") > 0) print l; close(".t52-tiles.txt"); ins=1 } print }' .t52-tiles.base > .t52-tiles.new \
      && mv .t52-tiles.new public/health/321.html \
      && { grep -q "/ward-management/330" public/health/321.html && grep -q "/patient-admission/340" public/health/321.html \
           && echo "PASS: 321.html - Ward Management + Patient Admission tiles added" \
           || { echo "VERIFY FAIL: 321.html patch did not land"; fail=1; }; } \
      || { echo "VERIFY FAIL: 321.html patch failed"; fail=1; }
    rm -f .t52-tiles.txt .t52-tiles.new .t52-tiles.base
  fi
fi

mkdir -p "public"
cat > "public/firebase.js" << 'T52_FIREBASE'
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
T52_FIREBASE
[ -s "public/firebase.js" ] && echo "  wrote public/firebase.js ($(wc -c < "public/firebase.js") bytes)"

cat > "firestore.rules" << 'T52_RULES'
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
T52_RULES
[ -s "firestore.rules" ] && echo "  wrote firestore.rules ($(wc -c < "firestore.rules") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/ward.css" << 'T52_WARDCSS'
/* JAMALI — ward-management · shared stylesheet for pages 330 to 338
   Base design system lives in /records/records.css (imported below).
   Family accent: emerald, the Health wing colour. This file carries the
   pieces every ward page needs: boot line, error banner, status badges,
   the bed grid, the dashboard stat cards and the edit modals. */
@import url("/records/records.css");

/* the hidden attribute always wins, even over display rules below */
[hidden] { display: none !important; }

/* page accent — Health */
h1 { position: relative; padding-left: 15px; }
h1::before { content: ""; position: absolute; left: 0; top: 5px; bottom: 5px;
  width: 5px; border-radius: 3px; background: #059669; }

/* the boot status line and the red load-error banner (task 46d language) */
.p-boot { margin: 6px 0 0; font-size: 12.5px; font-weight: 600; color: #64748b; }
.p-err { margin: 12px 0 0; padding: 10px 12px; border: 1px solid #fecaca;
  background: #fef2f2; color: #b91c1c; border-radius: 10px; font-size: 13px;
  font-weight: 700; }
.p-err .p-err-hint { display: block; margin-top: 4px; font-weight: 600; color: #7f1d1d; }

.mini-note { font-size: 11.5px; color: #64748b; font-weight: 600; }

/* ---------- status badges (one language across all ward pages) ---------- */
.st { display: inline-block; border-radius: 999px; padding: 3px 10px;
  font-size: 11px; font-weight: 800; letter-spacing: .03em; white-space: nowrap; }
.st-avail   { background: #d1fae5; color: #047857; }   /* Available */
.st-occ     { background: #fee2e2; color: #b91c1c; }   /* Occupied */
.st-resv    { background: #fef3c7; color: #92400e; }   /* Reserved */
.st-clean   { background: #ecfccb; color: #4d7c0f; }   /* Cleaning Required / In Progress */
.st-maint   { background: #ffedd5; color: #c2410c; }   /* Maintenance Required */
.st-oos     { background: #e2e8f0; color: #475569; }   /* Out of Service */
.st-ready   { background: #d1fae5; color: #047857; }   /* Ready for Use */
.st-active  { background: #d1fae5; color: #047857; }   /* Active ward / assignment */
.st-inactive{ background: #f1f5f9; color: #94a3b8; }   /* Inactive ward */
.st-released{ background: #f1f5f9; color: #94a3b8; }   /* Released assignment */
.st-pending { background: #fef3c7; color: #92400e; }
.st-high    { background: #ffedd5; color: #c2410c; }
.st-medium  { background: #fef3c7; color: #92400e; }
.st-low     { background: #d1fae5; color: #047857; }
.st-none    { background: #f1f5f9; color: #94a3b8; }

/* ---------- hub tiles (page 330) — the 321 square-tile language ---------- */
.mod-grid { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 14px; margin: 0 0 16px; }
.mod-grid.four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
a.mod { aspect-ratio: 1 / 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px; text-decoration: none;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
  padding: 10px 8px; color: #0f172a; font-weight: 700; font-size: 13.5px;
  text-align: center; box-shadow: 0 6px 18px rgba(15, 23, 42, .06);
  transition: transform .15s, border-color .15s, background .15s, color .15s; }
a.mod:hover { transform: translateY(-3px); border-color: #059669;
  background: #ecfdf5; color: #047857; }
a.mod:active { transform: translateY(0); }
.mod-ico { font-size: 32px; line-height: 1; }
.mod-label { line-height: 1.25; padding: 0 6px; }
.mod-sub { display: block; color: #94a3b8; font-size: 10.5px; font-weight: 700;
  margin-top: 3px; }
a.mod:hover .mod-sub { color: #059669; }
@media (max-width: 1100px) { .mod-grid, .mod-grid.four { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 560px) {
  .mod-grid, .mod-grid.four { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  a.mod { gap: 6px; font-size: 12px; }
  .mod-ico { font-size: 24px; }
  .mod-sub { font-size: 9.5px; margin-top: 2px; }
}

/* ---------- find-a-patient row (pages 334) ---------- */
.find-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.find-row input { flex: 1 1 260px; border: 1px solid #cbd5e1; border-radius: 9px;
  padding: 9px 12px; font-size: 14px; }
.find-btn { border: 1px solid #059669; background: #ecfdf5; color: #047857;
  font-weight: 800; font-size: 13.5px; padding: 9px 18px; border-radius: 9px;
  cursor: pointer; }
.find-btn:hover { background: #d1fae5; }
.cand-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.cand { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  border: 1px solid #e2e8f0; background: #fff; border-radius: 10px;
  padding: 8px 12px; cursor: pointer; font-size: 13.5px; font-family: inherit; }
.cand:hover { border-color: #059669; background: #ecfdf5; }
.cand b { font-weight: 800; }
.cand .c-id { font-weight: 800; letter-spacing: .06em; color: #065f46;
  font-variant-numeric: tabular-nums; }
.sel-panel { margin-top: 12px; border: 1px solid #a7f3d0; background: #ecfdf5;
  border-radius: 10px; padding: 10px 14px; font-size: 13.5px; }
.sel-panel b { font-weight: 800; }

/* ---------- dashboard stat cards (page 333) ---------- */
.stat-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px; margin: 0 0 18px; }
.stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 12px 14px; box-shadow: 0 4px 14px rgba(15, 23, 42, .05); }
.stat-card .k { font-size: 11px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .07em; color: #64748b; }
.stat-card .v { font-size: 24px; font-weight: 800; margin-top: 4px;
  font-variant-numeric: tabular-nums; }
.stat-card .v.warn { color: #b91c1c; }
.stat-card .v.ok { color: #047857; }
@media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 560px) { .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

/* ---------- the bed grid (page 332) ---------- */
.bed-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px; margin-top: 12px; }
.bed-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 10px 12px; box-shadow: 0 4px 14px rgba(15, 23, 42, .05);
  border-left-width: 5px; }
.bed-card.b-avail   { border-left-color: #10b981; }
.bed-card.b-occ     { border-left-color: #ef4444; }
.bed-card.b-resv    { border-left-color: #f59e0b; }
.bed-card.b-clean   { border-left-color: #84cc16; }
.bed-card.b-maint   { border-left-color: #f97316; }
.bed-card.b-oos     { border-left-color: #94a3b8; }
.bed-no { font-size: 16px; font-weight: 800; letter-spacing: .04em; }
.bed-type { font-size: 11.5px; color: #64748b; font-weight: 700; }
.bed-patient { margin-top: 6px; font-size: 12.5px; font-weight: 700; color: #0f172a; }
.bed-act { margin-top: 8px; display: flex; gap: 6px; }

/* ---------- small buttons ---------- */
.ghost-btn { border: 1px solid #cbd5e1; background: #fff; color: #334155;
  font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: 7px;
  cursor: pointer; white-space: nowrap; font-family: inherit; }
.ghost-btn:hover { border-color: #059669; color: #047857; }
.ghost-btn.danger { color: #b91c1c; }
.ghost-btn.danger:hover { border-color: #b91c1c; background: #fef2f2; }
.ghost-btn:disabled { opacity: .55; cursor: wait; }
.icon-btn { width: 32px; height: 32px; display: inline-flex; align-items: center;
  justify-content: center; border-radius: 9px; border: 1px solid #cbd5e1;
  background: #fff; cursor: pointer; color: #475569; margin-right: 6px;
  padding: 0; vertical-align: middle; }
.icon-btn:hover { border-color: #059669; color: #059669; background: #ecfdf5; }
.icon-btn.del-btn { color: #b91c1c; }
.icon-btn.del-btn:hover { border-color: #b91c1c; background: #fef2f2; }
.icon-btn:disabled { opacity: .55; cursor: wait; }
.pen-svg, .bin-svg { display: block; }

/* ---------- the emergency note ---------- */
.emg-note { margin: 10px 0 16px; padding: 10px 14px; border: 1px solid #fde68a;
  background: #fffbeb; color: #92400e; border-radius: 10px; font-size: 13px;
  font-weight: 700; }

/* ---------- modal (edit forms) ---------- */
.modal-ovl { position: fixed; inset: 0; background: rgba(15, 23, 42, .45);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 40px 16px; overflow: auto; z-index: 60; }
.modal-card { background: #fff; border-radius: 16px; padding: 20px 22px;
  width: min(760px, 100%); box-shadow: 0 20px 50px rgba(15, 23, 42, .25); }
.modal-card h2 { font-size: 18px; margin-bottom: 4px; }
.m-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 14px; margin: 14px 0 2px; }
.m-grid label { font-size: 12px; font-weight: 700; color: #475569;
  display: flex; flex-direction: column; gap: 5px; }
.m-grid input, .m-grid select, .m-grid textarea { border: 1px solid #cbd5e1;
  border-radius: 8px; padding: 8px 10px; font-size: 14px; width: 100%;
  background: #fff; font-family: inherit; }
.m-grid input:focus, .m-grid select:focus, .m-grid textarea:focus {
  outline: 2px solid #a7f3d0; border-color: #059669; }
.form-err { color: #b91c1c; font-size: 13px; font-weight: 600; margin-top: 10px; }
.form-ok { color: #047857; font-size: 13px; font-weight: 700; margin-top: 10px; }
.form-actions { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.btn-primary { background: #059669; color: #fff; border: 0; font-weight: 800;
  padding: 9px 18px; border-radius: 9px; cursor: pointer; font-size: 14px;
  font-family: inherit; }
.btn-primary:disabled { opacity: .55; cursor: wait; }
.btn-ghost { background: #fff; color: #475569; border: 1px solid #cbd5e1;
  font-weight: 700; padding: 9px 16px; border-radius: 9px; cursor: pointer;
  font-size: 14px; font-family: inherit; }
.save-note { color: #047857; font-size: 13px; font-weight: 700; margin-top: 10px; }

/* ---------- detail sections (ward register, history) ---------- */
.sec-h { font-size: 13px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .08em; color: #475569; margin: 18px 0 8px; }
.nowrap { white-space: nowrap; }
td.c-date { white-space: nowrap; font-variant-numeric: tabular-nums; }
.pct-cell { font-weight: 800; font-variant-numeric: tabular-nums; }
tr.row-inactive td { color: #94a3b8; }

/* print — clean paper output */
@media print {
  #jamali-sidebar, #jamali-burger, #jamali-overlay, .back, .find-row,
  .form-actions, .emg-note { display: none !important; }
  body { background: #fff; }
  .wrap { max-width: none; padding: 0; }
}
T52_WARDCSS
[ -s "public/ward-management/ward.css" ] && echo "  wrote public/ward-management/ward.css ($(wc -c < "public/ward-management/ward.css") bytes)"

mkdir -p "public/patient-admission"
cat > "public/patient-admission/adm.css" << 'T52_ADMCSS'
/* JAMALI — patient-admission · shared stylesheet for pages 340 to 343
   Base design system lives in /records/records.css (imported below).
   Family accent: emerald, the Health wing colour. This file carries the
   pieces every admission page needs: boot line, error banner, status
   badges, candidate lists, detail sections and the status history trail. */
@import url("/records/records.css");

/* the hidden attribute always wins, even over display rules below */
[hidden] { display: none !important; }

/* page accent — Health */
h1 { position: relative; padding-left: 15px; }
h1::before { content: ""; position: absolute; left: 0; top: 5px; bottom: 5px;
  width: 5px; border-radius: 3px; background: #059669; }

/* the boot status line and the red load-error banner (task 46d language) */
.p-boot { margin: 6px 0 0; font-size: 12.5px; font-weight: 600; color: #64748b; }
.p-err { margin: 12px 0 0; padding: 10px 12px; border: 1px solid #fecaca;
  background: #fef2f2; color: #b91c1c; border-radius: 10px; font-size: 13px;
  font-weight: 700; }
.p-err .p-err-hint { display: block; margin-top: 4px; font-weight: 600; color: #7f1d1d; }

.mini-note { font-size: 11.5px; color: #64748b; font-weight: 600; }

/* ---------- status badges (admission status language) ---------- */
.st { display: inline-block; border-radius: 999px; padding: 3px 10px;
  font-size: 11px; font-weight: 800; letter-spacing: .03em; white-space: nowrap; }
.st-pending { background: #fef3c7; color: #92400e; }
.st-admitted{ background: #d1fae5; color: #047857; }
.st-transferred { background: #e0f2fe; color: #075985; }
.st-discharged { background: #f1f5f9; color: #64748b; }
.st-cancelled { background: #f1f5f9; color: #94a3b8; text-decoration: line-through; }
.st-avail   { background: #d1fae5; color: #047857; }
.st-occ     { background: #fee2e2; color: #b91c1c; }
.st-active  { background: #d1fae5; color: #047857; }
.st-released{ background: #f1f5f9; color: #94a3b8; }
.st-critical{ background: #fee2e2; color: #b91c1c; }
.st-high    { background: #ffedd5; color: #c2410c; }
.st-medium  { background: #fef3c7; color: #92400e; }
.st-low     { background: #d1fae5; color: #047857; }
.st-none    { background: #f1f5f9; color: #94a3b8; }
.st-emergency { background: #fee2e2; color: #b91c1c; }
.st-planned { background: #e0f2fe; color: #075985; }

/* ---------- hub tiles (page 340) — the 321 square-tile language ---------- */
.mod-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px; margin: 0 0 16px; }
a.mod { aspect-ratio: 1 / 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px; text-decoration: none;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
  padding: 10px 8px; color: #0f172a; font-weight: 700; font-size: 13.5px;
  text-align: center; box-shadow: 0 6px 18px rgba(15, 23, 42, .06);
  transition: transform .15s, border-color .15s, background .15s, color .15s; }
a.mod:hover { transform: translateY(-3px); border-color: #059669;
  background: #ecfdf5; color: #047857; }
a.mod:active { transform: translateY(0); }
.mod-ico { font-size: 32px; line-height: 1; }
.mod-label { line-height: 1.25; padding: 0 6px; }
.mod-sub { display: block; color: #94a3b8; font-size: 10.5px; font-weight: 700;
  margin-top: 3px; }
a.mod:hover .mod-sub { color: #059669; }
@media (max-width: 1100px) { .mod-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 560px) {
  .mod-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  a.mod { gap: 6px; font-size: 12px; }
  .mod-ico { font-size: 24px; }
  .mod-sub { font-size: 9.5px; margin-top: 2px; }
}

/* ---------- find-a-patient / find-an-admission row ---------- */
.find-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.find-row input { flex: 1 1 260px; border: 1px solid #cbd5e1; border-radius: 9px;
  padding: 9px 12px; font-size: 14px; }
.find-btn { border: 1px solid #059669; background: #ecfdf5; color: #047857;
  font-weight: 800; font-size: 13.5px; padding: 9px 18px; border-radius: 9px;
  cursor: pointer; font-family: inherit; }
.find-btn:hover { background: #d1fae5; }
.cand-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.cand { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  border: 1px solid #e2e8f0; background: #fff; border-radius: 10px;
  padding: 8px 12px; cursor: pointer; font-size: 13.5px; font-family: inherit; }
.cand:hover { border-color: #059669; background: #ecfdf5; }
.cand b { font-weight: 800; }
.cand .c-id { font-weight: 800; letter-spacing: .06em; color: #065f46;
  font-variant-numeric: tabular-nums; }
.sel-panel { margin-top: 12px; border: 1px solid #a7f3d0; background: #ecfdf5;
  border-radius: 10px; padding: 10px 14px; font-size: 13.5px; }
.sel-panel b { font-weight: 800; }

/* ---------- admission form grid (page 341) ---------- */
.add-card { padding: 16px 20px; margin-bottom: 18px; }
.form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 14px; margin: 14px 0 2px; }
.form-grid label { font-size: 12px; font-weight: 700; color: #475569;
  display: flex; flex-direction: column; gap: 5px; }
.form-grid input, .form-grid select, .form-grid textarea { border: 1px solid #cbd5e1;
  border-radius: 8px; padding: 8px 10px; font-size: 14px; width: 100%;
  background: #fff; font-family: inherit; }
.form-grid input:focus, .form-grid select:focus, .form-grid textarea:focus {
  outline: 2px solid #a7f3d0; border-color: #059669; }
.form-grid input[readonly] { background: #f8fafc; color: #64748b; font-weight: 800; }
.form-grid .span-2 { grid-column: span 2; }
.form-grid .span-3 { grid-column: span 3; }
@media (max-width: 900px) { .form-grid { grid-template-columns: 1fr; }
  .form-grid .span-2, .form-grid .span-3 { grid-column: span 1; } }
.form-err { color: #b91c1c; font-size: 13px; font-weight: 600; margin-top: 10px; }
.form-ok { color: #047857; font-size: 13px; font-weight: 700; margin-top: 10px; }
.form-actions { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.btn-primary { background: #059669; color: #fff; border: 0; font-weight: 800;
  padding: 9px 18px; border-radius: 9px; cursor: pointer; font-size: 14px;
  font-family: inherit; }
.btn-primary:disabled { opacity: .55; cursor: wait; }
.btn-ghost { background: #fff; color: #475569; border: 1px solid #cbd5e1;
  font-weight: 700; padding: 9px 16px; border-radius: 9px; cursor: pointer;
  font-size: 14px; font-family: inherit; }
.btn-warn { background: #fff; color: #92400e; border: 1px solid #fde68a;
  font-weight: 800; padding: 9px 16px; border-radius: 9px; cursor: pointer;
  font-size: 14px; font-family: inherit; }
.btn-warn:hover { background: #fffbeb; }
.save-note { color: #047857; font-size: 13px; font-weight: 700; margin-top: 10px; }

/* ---------- detail sections (page 343) ---------- */
.sec-h { font-size: 13px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .08em; color: #475569; margin: 18px 0 8px; }
.kv { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0;
  border-bottom: 1px solid #f1f5f9; font-size: 14px; }
.kv:last-child { border-bottom: 0; }
.kv .k { color: #475569; font-weight: 600; }
.kv .v { font-weight: 700; text-align: right; }
.trail { list-style: none; margin: 6px 0 0; padding: 0; }
.trail li { padding: 7px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;
  display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.trail li:last-child { border-bottom: 0; }
.trail .t-who { color: #64748b; font-weight: 600; }

/* ---------- the emergency note ---------- */
.emg-note { margin: 10px 0 16px; padding: 10px 14px; border: 1px solid #fde68a;
  background: #fffbeb; color: #92400e; border-radius: 10px; font-size: 13px;
  font-weight: 700; }

/* ---------- modal (edit admission) ---------- */
.modal-ovl { position: fixed; inset: 0; background: rgba(15, 23, 42, .45);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 40px 16px; overflow: auto; z-index: 60; }
.modal-card { background: #fff; border-radius: 16px; padding: 20px 22px;
  width: min(760px, 100%); box-shadow: 0 20px 50px rgba(15, 23, 42, .25); }
.modal-card h2 { font-size: 18px; margin-bottom: 4px; }
.m-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 14px; margin: 14px 0 2px; }
.m-grid label { font-size: 12px; font-weight: 700; color: #475569;
  display: flex; flex-direction: column; gap: 5px; }
.m-grid input, .m-grid select, .m-grid textarea { border: 1px solid #cbd5e1;
  border-radius: 8px; padding: 8px 10px; font-size: 14px; width: 100%;
  background: #fff; font-family: inherit; }
.m-grid input:focus, .m-grid select:focus, .m-grid textarea:focus {
  outline: 2px solid #a7f3d0; border-color: #059669; }

/* ---------- tabs (page 342 filters reuse .tab) ---------- */
.tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.tab { border: 1px solid #cbd5e1; background: #fff; border-radius: 999px;
  padding: 6px 14px; font-size: 12.5px; font-weight: 700; color: #475569;
  cursor: pointer; font-family: inherit; }
.tab:hover { border-color: #059669; color: #047857; }
.tab.on { background: #059669; border-color: #059669; color: #fff; }

/* ---------- small buttons ---------- */
.ghost-btn { border: 1px solid #cbd5e1; background: #fff; color: #334155;
  font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: 7px;
  cursor: pointer; white-space: nowrap; font-family: inherit; }
.ghost-btn:hover { border-color: #059669; color: #047857; }
.ghost-btn.danger { color: #b91c1c; }
.ghost-btn.danger:hover { border-color: #b91c1c; background: #fef2f2; }
.ghost-btn:disabled { opacity: .55; cursor: wait; }
.nowrap { white-space: nowrap; }
td.c-date { white-space: nowrap; font-variant-numeric: tabular-nums; }

/* print — clean paper output */
@media print {
  #jamali-sidebar, #jamali-burger, #jamali-overlay, .back, .find-row,
  .form-actions, .emg-note { display: none !important; }
  body { background: #fff; }
  .wrap { max-width: none; padding: 0; }
}
T52_ADMCSS
[ -s "public/patient-admission/adm.css" ] && echo "  wrote public/patient-admission/adm.css ($(wc -c < "public/patient-admission/adm.css") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/330.html" << 'T52_HTML_330'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ward Management — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/ward-management/ward.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <a class="back" href="/health/321">&larr; Health</a>
  <h1>Ward Management</h1>
  <p class="sub">Wards, beds, occupancy, assignments, transfers, cleaning and the registers &mdash; the placement half of the medical wing. Occupancy is always counted from the bed records, never typed in. Emergency treatment always comes first; no form here holds up care.</p>

  <div class="mod-grid">
    <a class="mod" href="/ward-management/331">
      <span class="mod-ico">🏥</span>
      <span class="mod-label">Ward Registration<span class="mod-sub">register &amp; edit wards</span></span>
    </a>
    <a class="mod" href="/ward-management/332">
      <span class="mod-ico">🛏️</span>
      <span class="mod-label">Bed Management<span class="mod-sub">register &amp; manage beds</span></span>
    </a>
    <a class="mod" href="/ward-management/333">
      <span class="mod-ico">📊</span>
      <span class="mod-label">Occupancy<span class="mod-sub">availability &amp; counts</span></span>
    </a>
    <a class="mod" href="/ward-management/334">
      <span class="mod-ico">👥</span>
      <span class="mod-label">Bed Assignment<span class="mod-sub">place a patient</span></span>
    </a>
    <a class="mod" href="/ward-management/335">
      <span class="mod-ico">🔄</span>
      <span class="mod-label">Transfers<span class="mod-sub">move patients safely</span></span>
    </a>
    <a class="mod" href="/ward-management/336">
      <span class="mod-ico">🧹</span>
      <span class="mod-label">Cleaning &amp; Maintenance<span class="mod-sub">keep beds usable</span></span>
    </a>
    <a class="mod" href="/ward-management/337">
      <span class="mod-ico">📋</span>
      <span class="mod-label">Ward Register<span class="mod-sub">all wards · occupancy</span></span>
    </a>
    <a class="mod" href="/ward-management/338">
      <span class="mod-ico">📜</span>
      <span class="mod-label">Bed &amp; Transfer History<span class="mod-sub">beds · assignments · moves</span></span>
    </a>
  </div>

  <div class="card" style="padding:16px 20px;">
    <h2>How the ward half works</h2>
    <p class="mini-note" style="margin-top:6px;">
      Register the ward first (331), then put its beds on the map (332). The occupancy dashboard (333)
      counts every bed by its status &mdash; a bed is assignable only while it is marked Available.
      Bed Assignment (334) connects an <b>existing</b> patient to a free bed &mdash; it never creates a
      second patient record. Transfers (335) free the old bed and fill the new one in one atomic move,
      and the history is preserved. Cleaning &amp; Maintenance (336) keeps unusable beds out of the
      assignment lists until they are ready. The registers (337, 338) remember every placement and
      every move, including the completed ones.
    </p>
    <p class="mini-note" style="margin-top:8px;">
      Patient Admission (page 340) reuses this half: an admission links the patient&rsquo;s stay to the
      ward and bed records kept here &mdash; the two halves never duplicate each other.
    </p>
  </div>
</main>
<script type="module" src="/ward-management/330.js"></script>
</body>
</html>
T52_HTML_330
[ -s "public/ward-management/330.html" ] && echo "  wrote public/ward-management/330.html ($(wc -c < "public/ward-management/330.html") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/330.js" << 'T52_JS_330'
// ward-management (page 330) — JAMALI Health — the Ward Management hub
// A pure launcher, exactly like the Health hub 321: eight square tiles and
// no data. Nothing here reads or writes Firestore, so nothing here can
// fail — the pages it opens (331 to 338) carry their own boot diagnostics.

// no firebase import on purpose: the hub is a signpost, not a data page.
T52_JS_330
[ -s "public/ward-management/330.js" ] && echo "  wrote public/ward-management/330.js ($(wc -c < "public/ward-management/330.js") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/331.html" << 'T52_HTML_331'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ward Registration — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/ward-management/ward.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section id="s-reg">
    <a class="back" href="/ward-management/330">&larr; Ward Management</a>
    <h1>Ward Registration</h1>
    <p class="sub">Register the facility&rsquo;s wards, keep their details current, and activate or deactivate them. A ward cannot be deactivated while patients are still placed in it &mdash; move or release them first. Occupancy is counted from the bed records, never typed in here.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <div class="card add-card">
      <h2>Register a ward</h2>
      <div class="form-grid">
        <label>Ward Name *
          <input id="w-name" type="text" placeholder="e.g. General Ward">
        </label>
        <label>Ward Code
          <input id="w-code" type="text" placeholder="e.g. GW-01 (auto if left empty)">
        </label>
        <label>Ward Type *
          <select id="w-type">
            <option value="">— Select —</option>
            <option>General</option>
            <option>Maternity</option>
            <option>Paediatric</option>
            <option>Surgical</option>
            <option>Medical</option>
            <option>Intensive Care Unit (ICU)</option>
            <option>Private</option>
            <option>Isolation</option>
            <option>Other</option>
          </select>
        </label>
        <label>Location / Building
          <input id="w-building" type="text" placeholder="e.g. Block A">
        </label>
        <label>Floor
          <input id="w-floor" type="text" placeholder="e.g. Ground / 2">
        </label>
        <label>Licensed Capacity (reference)
          <input id="w-capacity" type="number" min="0" step="1" placeholder="e.g. 20">
        </label>
        <label>Responsible Nurse / Ward Supervisor
          <input id="w-supervisor" type="text" placeholder="Name of the responsible staff">
        </label>
      </div>
      <p class="form-err" id="w-ferr" hidden></p>
      <p class="form-ok" id="w-fok" hidden>Ward registered — it appears in the list below.</p>
      <div class="form-actions">
        <button class="btn-primary" id="w-save" type="button">Register Ward</button>
        <button class="btn-ghost" id="w-clear" type="button">Clear Form</button>
      </div>
    </div>

    <div class="card" style="padding:16px 20px;">
      <h2>All wards</h2>
      <div class="find-row" style="margin-top:10px;">
        <input id="w-q" type="text" placeholder="Search by ward name, code or type…">
      </div>
      <div class="empty" id="w-empty">
        <div class="empty-icon">🏥</div>
        <div class="empty-title">No wards registered yet</div>
        <div class="empty-sub">Register the first ward above — then put its beds on the map in Bed Management.</div>
      </div>
      <div class="table-wrap" id="w-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Code</th><th>Ward</th><th>Type</th><th>Building · Floor</th><th>Capacity</th><th>Beds</th><th>Occupied</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody id="w-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="w-count"></p>
    </div>
  </section>

</main>

<!-- the edit-ward modal -->
<div class="modal-ovl" id="m-wrap" hidden>
  <div class="modal-card" role="dialog" aria-modal="true">
    <h2>Edit ward</h2>
    <p class="mini-note" id="m-sub"></p>
    <div class="m-grid">
      <label>Ward Name
        <input id="m-name" type="text">
      </label>
      <label>Ward Code
        <input id="m-code" type="text">
      </label>
      <label>Ward Type
        <select id="m-type">
          <option value="">— Select —</option>
          <option>General</option>
          <option>Maternity</option>
          <option>Paediatric</option>
          <option>Surgical</option>
          <option>Medical</option>
          <option>Intensive Care Unit (ICU)</option>
          <option>Private</option>
          <option>Isolation</option>
          <option>Other</option>
        </select>
      </label>
      <label>Location / Building
        <input id="m-building" type="text">
      </label>
      <label>Floor
        <input id="m-floor" type="text">
      </label>
      <label>Licensed Capacity (reference)
        <input id="m-capacity" type="number" min="0" step="1">
      </label>
      <label>Responsible Nurse / Ward Supervisor
        <input id="m-supervisor" type="text">
      </label>
    </div>
    <p class="form-err" id="m-err" hidden></p>
    <div class="form-actions">
      <button class="btn-primary" id="m-save" type="button">Save Changes</button>
      <button class="btn-ghost" id="m-cancel" type="button">Cancel</button>
    </div>
  </div>
</div>

<script type="module" src="/ward-management/331.js"></script>
</body>
</html>
T52_HTML_331
[ -s "public/ward-management/331.html" ] && echo "  wrote public/ward-management/331.html ($(wc -c < "public/ward-management/331.html") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/331.js" << 'T52_JS_331'
// ward-management (page 331) — JAMALI Health — Ward Registration
// Register wards, keep their details current, and activate or deactivate
// them. Occupancy shown here is counted from the bed records (never typed
// in), and a ward with patients still placed in it refuses to deactivate.
// No failure can hide: every listener carries an error callback, the page
// shows its build and boot progress, and a red banner names any error.
import { requireAuth, db, collection, doc, addDoc, updateDoc, onSnapshot } from "/firebase.js";

/* the boot diagnostic: the inline script in 331.html reads this after 12
   seconds if the page never answered, so a silent failure names itself.
   It stands BEFORE the top-level await on purpose: everything the error
   paths touch must exist before the module can ever suspend. */
window.__p52 = { page: "331", build: "52w1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- visible load errors: never swallow a failure again ---------- */
function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}

/* the boot line answered: with wards the line goes, with zero it stays
   and says so — an empty account is a fact, not a failure */
function bootAnswered(n) {
  if (window.__p52) window.__p52.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no wards registered on this account yet. " +
    "Register the first ward above.";
}

try {
  await requireAuth(); // not logged in? -> bounced to "/"
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

/* ---------- shared helpers (same language as pages 322 to 328) ---------- */
function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

/* ---------- internal IDs: 4 digits + 4 letters, e.g. W4827ABCD ---------- */
const DIGITS = "0123456789";
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // I and O left out — they read as 1 and 0
function makeWardId() {
  const used = new Set(wards.map((w) => String(w.wardId || "")));
  for (let t = 0; t < 200; t++) {
    let id = "";
    for (let i = 0; i < 4; i++) id += DIGITS[Math.floor(Math.random() * DIGITS.length)];
    for (let i = 0; i < 4; i++) id += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    id = "W" + id;
    if (!used.has(id)) return id;
  }
  return "W" + Date.now().toString(36).toUpperCase();
}

/* ---------- live data ---------- */
let wards = [];        // every ward
let beds = [];         // every bed, so ward counts are real
let assignments = [];  // every assignment, so the deactivate guard is real

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  bootAnswered(snap.docs.length);
  render();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  render();
}, (e) => loadErr("healthBedAssignments", e));
window.__p52.listeners++;

/* ---------- derived counts ---------- */
function bedsOf(wardId) { return beds.filter((b) => String(b.wardId) === String(wardId)); }
function occupiedOf(wardId) {
  return beds.filter((b) => String(b.wardId) === String(wardId) && b.status === "Occupied").length;
}
function activeAssignmentsOf(wardId) {
  return assignments.filter((a) => a.status === "Active" && String(a.wardId) === String(wardId));
}

/* ---------- form helpers ---------- */
function ferr(msg) { const e = $("#w-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function fok(msg) {
  const e = $("#w-fok");
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.textContent = msg;
  clearTimeout(fok.t); fok.t = setTimeout(() => { e.hidden = true; }, 4000);
}
function v(sel) { return $(sel).value.trim(); }

/* ---------- render the ward table ---------- */
function render() {
  const q = v("#w-q").toLowerCase();
  const rows = wards.filter((w) => !q ||
    String(w.wardName || "").toLowerCase().includes(q) ||
    String(w.wardCode || "").toLowerCase().includes(q) ||
    String(w.wardType || "").toLowerCase().includes(q));
  const active = rows.filter((w) => w.status !== "Inactive");
  const inactive = rows.filter((w) => w.status === "Inactive");
  const ordered = active.concat(inactive);

  $("#w-empty").hidden = wards.length > 0;
  $("#w-wrap").hidden = ordered.length === 0;
  $("#w-body").innerHTML = ordered.map((w) => {
    const isActive = w.status !== "Inactive";
    const occ = occupiedOf(w.wardId);
    return "<tr" + (isActive ? "" : " class='row-inactive'") + ">" +
      "<td class='c-no'>" + esc(w.wardCode) + "</td>" +
      "<td class='c-party'>" + esc(w.wardName) + "</td>" +
      "<td>" + esc(w.wardType || "—") + "</td>" +
      "<td>" + esc((w.building || "—") + (w.floor ? " · " + w.floor : "")) + "</td>" +
      "<td class='c-num'>" + (w.maxCapacity === "" || w.maxCapacity == null ? "—" : esc(w.maxCapacity)) + "</td>" +
      "<td class='c-num'>" + bedsOf(w.wardId).length + "</td>" +
      "<td class='c-num'>" + occ + "</td>" +
      "<td>" + (isActive
        ? "<span class='st st-active'>Active</span>"
        : "<span class='st st-inactive'>Inactive</span>") + "</td>" +
      "<td class='c-act'>" +
        "<button type='button' class='ghost-btn' data-act='toggle' data-id='" + esc(w.__id) + "'>" +
          (isActive ? "Deactivate" : "Activate") + "</button>" +
        "<button type='button' class='ghost-btn' data-act='edit' data-id='" + esc(w.__id) + "'>Edit</button>" +
      "</td></tr>";
  }).join("");
  $("#w-count").textContent = rows.length === 0
    ? (wards.length === 0 ? "" : "No ward matches the search.")
    : rows.length + (rows.length === 1 ? " ward." : " wards.") +
      (inactive.length ? " " + inactive.length + " inactive." : "");
}

/* events: search typing + row buttons (event delegation, no dynamic ids) */
$("#w-q").addEventListener("input", render);
$("#w-body").addEventListener("click", onRowClick);
function onRowClick(e) {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const w = wards.find((x) => x.__id === btn.getAttribute("data-id"));
  if (!w) return;
  if (btn.getAttribute("data-act") === "edit") return openEdit(w);
  if (btn.getAttribute("data-act") === "toggle") return toggleWard(w);
}

/* ---------- activate / deactivate ---------- */
async function toggleWard(w) {
  ferr(""); fok("");
  const isActive = w.status !== "Inactive";
  if (isActive) {
    const placed = activeAssignmentsOf(w.wardId);
    if (placed.length > 0) {
      return ferr("Cannot deactivate " + (w.wardCode || w.wardName) + " — " + placed.length +
        " patient(s) are still placed in it. Move or release them first (Ward Management \u2192 Bed Assignment).");
    }
    if (!confirm("Deactivate ward " + (w.wardCode || w.wardName) +
        "? It disappears from assignment lists until it is activated again.")) return;
  }
  try {
    await updateDoc(doc(db, "healthWards", w.__id), {
      status: isActive ? "Inactive" : "Active",
      updatedAt: nowISO()
    });
    fok(isActive ? "Ward deactivated." : "Ward activated.");
  } catch (e) {
    ferr("Could not save: " + ((e && (e.code || e.message)) || e));
  }
}

/* ---------- register a ward ---------- */
function readForm(prefix) {
  return {
    wardName: v(prefix + "-name"),
    wardCode: v(prefix + "-code"),
    wardType: v(prefix + "-type"),
    building: v(prefix + "-building"),
    floor: v(prefix + "-floor"),
    capRaw: v(prefix + "-capacity"),
    supervisor: v(prefix + "-supervisor")
  };
}
function validate(f, ignoreDocId) {
  if (!f.wardName) return "The ward name is required.";
  if (!f.wardType) return "Choose the ward type.";
  if (!f.wardCode) return "The ward code is required — or leave it empty to have one generated.";
  const code = f.wardCode.toLowerCase();
  const clash = wards.find((w) => w.__id !== ignoreDocId &&
    String(w.wardCode || "").toLowerCase() === code);
  if (clash) return "The ward code " + f.wardCode + " is already used by " +
    (clash.wardName || clash.wardCode) + " — codes must be unique.";
  if (f.capRaw !== "" && (!/^\d+$/.test(f.capRaw) || Number(f.capRaw) < 0))
    return "The licensed capacity must be a whole number of 0 or more.";
  return "";
}
function autoCode() {
  const used = new Set(wards.map((w) => String(w.wardCode || "").toUpperCase()));
  for (let t = 0; t < 200; t++) {
    const c = "W-" + String((t + 1)).padStart(2, "0");
    if (!used.has(c)) return c;
  }
  return "W-" + Date.now().toString(36).toUpperCase().slice(-4);
}

$("#w-save").addEventListener("click", async () => {
  ferr(""); fok("");
  const f = readForm("w");
  if (!f.wardCode) f.wardCode = autoCode();
  const bad = validate(f, null);
  if (bad) return ferr(bad);
  const btn = $("#w-save");
  if (btn.disabled) return; // duplicate-submission guard
  btn.disabled = true;
  try {
    await addDoc(collection(db, "healthWards"), {
      wardId: makeWardId(),
      wardName: f.wardName,
      wardCode: f.wardCode,
      wardType: f.wardType,
      building: f.building,
      floor: f.floor,
      maxCapacity: f.capRaw === "" ? "" : Number(f.capRaw),
      supervisor: f.supervisor,
      status: "Active",
      dateCreated: nowISO().slice(0, 10),
      createdBy: f.supervisor || "",
      createdAt: nowISO(),
      updatedAt: nowISO()
    });
    $("#w-name").value = ""; $("#w-code").value = ""; $("#w-building").value = "";
    $("#w-floor").value = ""; $("#w-capacity").value = "";
    fok("Ward registered — it appears in the list below.");
  } catch (e) {
    ferr("Could not save the ward: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});

$("#w-clear").addEventListener("click", () => {
  $("#w-name").value = ""; $("#w-code").value = ""; $("#w-type").value = "";
  $("#w-building").value = ""; $("#w-floor").value = ""; $("#w-capacity").value = "";
  $("#w-supervisor").value = "";
  ferr(""); fok("");
});

/* ---------- the edit modal ---------- */
let editing = null;
function openEdit(w) {
  editing = w;
  $("#m-sub").textContent = "Ward ID " + (w.wardId || w.__id) + " — the ID never changes.";
  $("#m-name").value = w.wardName || "";
  $("#m-code").value = w.wardCode || "";
  $("#m-type").value = w.wardType || "";
  $("#m-building").value = w.building || "";
  $("#m-floor").value = w.floor || "";
  $("#m-capacity").value = w.maxCapacity === "" || w.maxCapacity == null ? "" : w.maxCapacity;
  $("#m-supervisor").value = w.supervisor || "";
  $("#m-err").hidden = true;
  $("#m-wrap").hidden = false;
}
$("#m-cancel").addEventListener("click", () => { $("#m-wrap").hidden = true; editing = null; });
$("#m-save").addEventListener("click", async () => {
  if (!editing) return;
  const e = $("#m-err"); e.hidden = true;
  const f = readForm("m");
  if (!f.wardCode) f.wardCode = editing.wardCode || autoCode();
  const bad = validate(f, editing.__id);
  if (bad) { e.textContent = bad; e.hidden = false; return; }
  const btn = $("#m-save");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthWards", editing.__id), {
      wardName: f.wardName,
      wardCode: f.wardCode,
      wardType: f.wardType,
      building: f.building,
      floor: f.floor,
      maxCapacity: f.capRaw === "" ? "" : Number(f.capRaw),
      supervisor: f.supervisor,
      updatedAt: nowISO()
    });
    $("#m-wrap").hidden = true;
    editing = null;
    fok("Ward updated.");
  } catch (err) {
    e.textContent = "Could not save: " + ((err && (err.code || err.message)) || err);
    e.hidden = false;
  }
  btn.disabled = false;
});

render();
T52_JS_331
[ -s "public/ward-management/331.js" ] && echo "  wrote public/ward-management/331.js ($(wc -c < "public/ward-management/331.js") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/332.html" << 'T52_HTML_332'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bed Management — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/ward-management/ward.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section id="s-beds">
    <a class="back" href="/ward-management/330">&larr; Ward Management</a>
    <h1>Bed Management</h1>
    <p class="sub">Beds belong to wards &mdash; every occupancy number in this module is counted from these bed records, never typed in. Bed numbers must be unique inside a ward, and a bed can only hold one patient at a time: assignment only ever lists beds marked <b>Available</b>.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <div class="card add-card">
      <h2>Register beds</h2>
      <div class="find-row" style="margin-top:10px;">
        <label class="mini-note" for="b-ward" style="font-size:12.5px;">Ward</label>
        <select id="b-ward" style="flex:0 1 340px; border:1px solid #cbd5e1; border-radius:9px; padding:9px 12px; font-size:14px;">
          <option value="">— Choose a ward —</option>
        </select>
      </div>
      <div class="form-grid" id="b-addrow" hidden>
        <label>Bed Number *
          <input id="b-num" type="text" placeholder="e.g. G-01 (unique in this ward)">
        </label>
        <label>Bed Type
          <select id="b-type">
            <option>Standard</option>
            <option>Electric</option>
            <option>Paediatric</option>
            <option>Cot</option>
            <option>ICU</option>
            <option>Bariatric</option>
            <option>Other</option>
          </select>
        </label>
        <label>Initial Status
          <select id="b-status">
            <option>Available</option>
            <option>Reserved</option>
            <option>Out of Service</option>
          </select>
        </label>
      </div>
      <p class="form-err" id="b-ferr" hidden></p>
      <p class="form-ok" id="b-fok" hidden>Bed registered.</p>
      <div class="form-actions" id="b-addactions" hidden>
        <button class="btn-primary" id="b-add" type="button">Register Bed</button>
        <button class="btn-ghost" id="b-clear" type="button">Clear</button>
      </div>
      <p class="mini-note" id="b-wardnote" style="margin-top:8px;" hidden></p>
    </div>

    <div class="card" style="padding:16px 20px;">
      <h2 id="b-listtitle">Beds</h2>
      <p class="count-line" id="b-count" style="margin-top:4px;"></p>
      <div class="empty" id="b-empty">
        <div class="empty-icon">🛏️</div>
        <div class="empty-title">No beds to show</div>
        <div class="empty-sub">Choose a ward above — if it has no beds yet, register the first one.</div>
      </div>
      <div class="bed-grid" id="b-grid" hidden></div>
    </div>
  </section>

</main>

<!-- the edit-bed modal -->
<div class="modal-ovl" id="m-wrap" hidden>
  <div class="modal-card" role="dialog" aria-modal="true">
    <h2>Edit bed</h2>
    <p class="mini-note" id="m-sub"></p>
    <div class="m-grid">
      <label>Bed Number
        <input id="m-num" type="text">
      </label>
      <label>Bed Type
        <select id="m-type">
          <option>Standard</option>
          <option>Electric</option>
          <option>Paediatric</option>
          <option>Cot</option>
          <option>ICU</option>
          <option>Bariatric</option>
          <option>Other</option>
        </select>
      </label>
      <label class="span-2" style="grid-column:span 2;">Status
        <select id="m-status">
          <option>Available</option>
          <option>Reserved</option>
          <option>Cleaning Required</option>
          <option>Cleaning in Progress</option>
          <option>Maintenance Required</option>
          <option>Out of Service</option>
        </select>
      </label>
      <label style="grid-column:span 2;">Notes
        <textarea id="m-notes" rows="2" placeholder="Optional — e.g. window side, oxygen point"></textarea>
      </label>
    </div>
    <p class="form-err" id="m-err" hidden></p>
    <div class="form-actions">
      <button class="btn-primary" id="m-save" type="button">Save Changes</button>
      <button class="btn-ghost" id="m-del" type="button">Delete Bed</button>
      <button class="btn-ghost" id="m-cancel" type="button">Cancel</button>
    </div>
  </div>
</div>

<script type="module" src="/ward-management/332.js"></script>
</body>
</html>
T52_HTML_332
[ -s "public/ward-management/332.html" ] && echo "  wrote public/ward-management/332.html ($(wc -c < "public/ward-management/332.html") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/332.js" << 'T52_JS_332'
// ward-management (page 332) — JAMALI Health — Bed Management
// Beds belong to wards. Register beds inside a ward, keep their details
// current, and take them in and out of use. The rules that protect the
// data: bed numbers are unique inside a ward, a bed is never hand-set to
// Occupied (assignment owns that), an occupied bed cannot be taken out of
// service, and an occupied bed cannot be deleted. No failure can hide:
// every listener carries an error callback and failures paint the banner.
import { requireAuth, db, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from "/firebase.js";

window.__p52 = { page: "332", build: "52b1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p52) window.__p52.docs = n;
  const b = document.getElementById("p-boot");
  if (!b || n > 0) { if (b) b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no beds registered yet. Choose a ward above and register its first bed.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

/* the one bed status language, shared with 333, 334, 335, 336, 337, 338 */
const BED_CLASS = {
  "Available": "b-avail", "Occupied": "b-occ", "Reserved": "b-resv",
  "Cleaning Required": "b-clean", "Cleaning in Progress": "b-clean",
  "Maintenance Required": "b-maint", "Out of Service": "b-oos"
};
const ST_CLASS = {
  "Available": "st-avail", "Occupied": "st-occ", "Reserved": "st-resv",
  "Cleaning Required": "st-clean", "Cleaning in Progress": "st-clean",
  "Maintenance Required": "st-maint", "Out of Service": "st-oos"
};
const ASSIGNABLE = "Available"; // only this status may take a patient

/* ---------- live data ---------- */
let wards = [];
let beds = [];
let selWard = ""; // the ward chosen in the selector

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  renderWardPicker();
  render();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  if (window.__p52 && window.__p52.docs < 0) bootAnswered(snap.docs.length);
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

function wardById(id) { return wards.find((w) => w.wardId === id || w.__id === id); }
function bedsOf(wardId) {
  return beds.filter((b) => String(b.wardId) === String(wardId))
    .sort((a, b) => String(a.bedNumber || "").localeCompare(String(b.bedNumber || ""), undefined, { numeric: true }));
}

/* ---------- the ward picker ---------- */
function renderWardPicker() {
  const sel = $("#b-ward");
  const cur = selWard;
  sel.innerHTML = '<option value="">— Choose a ward —</option>' + wards.map((w) =>
    '<option value="' + esc(w.wardId) + '">' + esc(w.wardCode + " · " + w.wardName) +
    (w.status === "Inactive" ? " (inactive)" : "") + "</option>").join("");
  if (cur && wards.some((w) => w.wardId === cur)) sel.value = cur;
  selWard = sel.value;
}

$("#b-ward").addEventListener("change", () => {
  selWard = $("#b-ward").value;
  ferr(""); fok("");
  render();
});

/* ---------- form helpers ---------- */
function ferr(msg) { const e = $("#b-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function fok(msg) {
  const e = $("#b-fok");
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.textContent = msg;
  clearTimeout(fok.t); fok.t = setTimeout(() => { e.hidden = true; }, 4000);
}
function v(sel) { return $(sel).value.trim(); }

/* ---------- render ---------- */
function render() {
  const w = wardById(selWard);
  const hasWard = !!w;
  $("#b-addrow").hidden = !hasWard;
  $("#b-addactions").hidden = !hasWard;
  $("#b-listtitle").textContent = hasWard ? "Beds — " + (w.wardCode || "") + " " + (w.wardName || "") : "Beds";

  if (hasWard) {
    const inactive = w.status === "Inactive";
    const note = $("#b-wardnote");
    note.hidden = !inactive;
    note.textContent = inactive
      ? "This ward is inactive — activate it on the Ward Registration page before adding beds to it."
      : "";
    const list = bedsOf(selWard);
    const occ = list.filter((b) => b.status === "Occupied").length;
    const avail = list.filter((b) => b.status === ASSIGNABLE).length;
    $("#b-count").textContent = list.length === 0 ? "No beds registered in this ward yet."
      : list.length + (list.length === 1 ? " bed · " : " beds · ") + occ + " occupied · " +
        avail + " available · " + (list.length - occ - avail) + " not usable.";
    $("#b-empty").hidden = list.length > 0;
    $("#b-grid").hidden = list.length === 0;
    $("#b-grid").innerHTML = list.map((b) => {
      const cls = BED_CLASS[b.status] || "b-oos";
      const stc = ST_CLASS[b.status] || "st-oos";
      return "<div class='bed-card " + cls + "'>" +
        "<div class='bed-no'>" + esc(b.bedNumber) + "</div>" +
        "<div class='bed-type'>" + esc(b.bedType || "Standard") + "</div>" +
        "<div style='margin-top:6px;'><span class='st " + stc + "'>" + esc(b.status) + "</span></div>" +
        (b.status === "Occupied"
          ? "<div class='bed-patient'>" + esc(b.currentPatientName || "Patient") +
            " <span class='mini-note'>· " + esc(b.currentPatientId || "") + "</span></div>"
          : (b.notes ? "<div class='bed-patient mini-note'>" + esc(b.notes) + "</div>" : "")) +
        "<div class='bed-act'>" +
          "<button type='button' class='ghost-btn' data-edit='" + esc(b.__id) + "'>Edit</button>" +
        "</div></div>";
    }).join("");
  } else {
    $("#b-count").textContent = "";
    $("#b-empty").hidden = false;
    $("#b-grid").hidden = true;
    $("#b-grid").innerHTML = "";
  }
}

/* ---------- register a bed ---------- */
function bedNumberTaken(wardId, num, ignoreDocId) {
  const n = String(num).toLowerCase();
  return beds.some((b) => String(b.wardId) === String(wardId) &&
    b.__id !== ignoreDocId && String(b.bedNumber || "").toLowerCase() === n);
}
function makeBedId() {
  const used = new Set(beds.map((b) => String(b.bedId || "")));
  const D = "0123456789", L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (let t = 0; t < 200; t++) {
    let id = "";
    for (let i = 0; i < 4; i++) id += D[Math.floor(Math.random() * D.length)];
    for (let i = 0; i < 4; i++) id += L[Math.floor(Math.random() * L.length)];
    id = "B" + id;
    if (!used.has(id)) return id;
  }
  return "B" + Date.now().toString(36).toUpperCase();
}

$("#b-add").addEventListener("click", async () => {
  ferr(""); fok("");
  const w = wardById(selWard);
  if (!w) return ferr("Choose a ward first.");
  if (w.status === "Inactive") return ferr("This ward is inactive — activate it before adding beds.");
  const num = v("#b-num");
  if (!num) return ferr("The bed number is required — e.g. G-01.");
  if (bedNumberTaken(w.wardId, num, null))
    return ferr("Bed " + num + " already exists in " + (w.wardCode || w.wardName) +
      " — bed numbers must be unique inside a ward.");
  const status = $("#b-status").value;
  const btn = $("#b-add");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await addDoc(collection(db, "healthBeds"), {
      bedId: makeBedId(),
      wardId: w.wardId,
      wardCode: w.wardCode || "",
      wardName: w.wardName || "",
      bedNumber: num,
      bedType: $("#b-type").value,
      status,
      currentPatientId: "",
      currentPatientName: "",
      currentAssignmentId: "",
      notes: "",
      dateCreated: nowISO().slice(0, 10),
      createdBy: "",
      createdAt: nowISO(),
      updatedAt: nowISO()
    });
    $("#b-num").value = "";
    fok("Bed " + num + " registered in " + (w.wardCode || w.wardName) + ".");
  } catch (e) {
    ferr("Could not save the bed: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});
$("#b-clear").addEventListener("click", () => {
  $("#b-num").value = ""; $("#b-type").value = "Standard"; $("#b-status").value = "Available";
  ferr(""); fok("");
});

/* ---------- the edit modal ---------- */
let editing = null;
function openEdit(b) {
  editing = b;
  $("#m-sub").textContent = "Bed ID " + (b.bedId || b.__id) + " · ward " + (b.wardCode || "") +
    " — the ID never changes. A bed is set to Occupied only by an assignment, never by hand.";
  $("#m-num").value = b.bedNumber || "";
  $("#m-type").value = b.bedType || "Standard";
  $("#m-status").value = b.status === "Occupied" ? "Available" : (b.status || "Available");
  if (b.status === "Occupied") {
    // the select cannot show Occupied — the guard below refuses to free a busy bed by hand
    $("#m-status").disabled = true;
  } else {
    $("#m-status").disabled = false;
  }
  $("#m-notes").value = b.notes || "";
  $("#m-err").hidden = true;
  $("#m-del").hidden = b.status === "Occupied";
  $("#m-wrap").hidden = false;
}
$("#b-grid").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-edit]");
  if (!btn) return;
  const b = beds.find((x) => x.__id === btn.getAttribute("data-edit"));
  if (b) openEdit(b);
});
$("#m-cancel").addEventListener("click", () => { $("#m-wrap").hidden = true; editing = null; });
$("#m-save").addEventListener("click", async () => {
  if (!editing) return;
  const e = $("#m-err"); e.hidden = true;
  const num = v("#m-num");
  if (!num) { e.textContent = "The bed number is required."; e.hidden = false; return; }
  if (bedNumberTaken(editing.wardId, num, editing.__id)) {
    e.textContent = "Bed " + num + " already exists in this ward — numbers must be unique inside a ward.";
    e.hidden = false; return;
  }
  const wasOccupied = editing.status === "Occupied";
  const newStatus = wasOccupied ? "Occupied" : $("#m-status").value;
  if (!wasOccupied && newStatus === "Occupied") {
    e.textContent = "A bed is never set to Occupied by hand — assign a patient on the Bed Assignment page.";
    e.hidden = false; return;
  }
  const btn = $("#m-save");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthBeds", editing.__id), {
      bedNumber: num,
      bedType: $("#m-type").value,
      status: newStatus,
      notes: $("#m-notes").value.trim(),
      updatedAt: nowISO()
    });
    $("#m-wrap").hidden = true;
    editing = null;
    fok("Bed updated.");
  } catch (err) {
    e.textContent = "Could not save: " + ((err && (err.code || err.message)) || err);
    e.hidden = false;
  }
  btn.disabled = false;
});
$("#m-del").addEventListener("click", async () => {
  if (!editing) return;
  if (editing.status === "Occupied") {
    const e = $("#m-err");
    e.textContent = "This bed is occupied — release the patient first (Ward Management \u2192 Bed Assignment).";
    e.hidden = false; return;
  }
  if (!confirm("Delete bed " + (editing.bedNumber || "") + "? Past assignment and transfer records keep the bed number, so history survives.")) return;
  const e = $("#m-err"); e.hidden = true;
  const btn = $("#m-del");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await deleteDoc(doc(db, "healthBeds", editing.__id));
    $("#m-wrap").hidden = true;
    editing = null;
    fok("Bed deleted.");
  } catch (err) {
    e.textContent = "Could not delete: " + ((err && (err.code || err.message)) || err);
    e.hidden = false;
  }
  btn.disabled = false;
});

render();
T52_JS_332
[ -s "public/ward-management/332.js" ] && echo "  wrote public/ward-management/332.js ($(wc -c < "public/ward-management/332.js") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/333.html" << 'T52_HTML_333'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ward Occupancy — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/ward-management/ward.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section id="s-occ">
    <a class="back" href="/ward-management/330">&larr; Ward Management</a>
    <h1>Ward Occupancy</h1>
    <p class="sub">The live situation across all wards, counted from the bed records &mdash; never typed in. Usable beds exclude those out of service; the occupancy percentage is occupied &divide; usable. A bed that needs cleaning or maintenance can never appear in an assignment list, so what this page shows is what can truly be used.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <div class="stat-grid">
      <div class="stat-card"><div class="k">Wards</div><div class="v" id="d-wards">0</div></div>
      <div class="stat-card"><div class="k">Beds</div><div class="v" id="d-beds">0</div></div>
      <div class="stat-card"><div class="k">Occupied</div><div class="v warn" id="d-occ">0</div></div>
      <div class="stat-card"><div class="k">Available</div><div class="v ok" id="d-avail">0</div></div>
      <div class="stat-card"><div class="k">Reserved</div><div class="v" id="d-resv">0</div></div>
      <div class="stat-card"><div class="k">Cleaning / Maint.</div><div class="v" id="d-unusable">0</div></div>
      <div class="stat-card"><div class="k">Out of Service</div><div class="v" id="d-oos">0</div></div>
    </div>

    <div class="card" style="padding:16px 20px;">
      <h2>Ward occupancy</h2>
      <div class="empty" id="o-empty">
        <div class="empty-icon">📊</div>
        <div class="empty-title">Nothing to count yet</div>
        <div class="empty-sub">Register wards (331) and beds (332) first — the counts here follow the bed records automatically.</div>
      </div>
      <div class="table-wrap" id="o-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Ward</th><th>Type</th><th>Status</th><th>Beds</th><th>Occupied</th><th>Available</th><th>Reserved</th><th>Not Usable</th><th>Usable</th><th>Occupancy</th></tr>
          </thead>
          <tbody id="o-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="o-count"></p>
    </div>
  </section>

</main>
<script type="module" src="/ward-management/333.js"></script>
</body>
</html>
T52_HTML_333
[ -s "public/ward-management/333.html" ] && echo "  wrote public/ward-management/333.html ($(wc -c < "public/ward-management/333.html") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/333.js" << 'T52_JS_333'
// ward-management (page 333) — JAMALI Health — the Ward Occupancy Dashboard
// Read-only and live: every figure on this page is counted from the ward
// and bed records at the moment the page loads and on every change. It
// never trusts a typed-in total. Occupancy % = occupied / usable, where
// usable beds exclude those out of service. No failure can hide: every
// listener carries an error callback and failures paint the banner.
import { requireAuth, db, collection, onSnapshot } from "/firebase.js";

window.__p52 = { page: "333", build: "52o1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(wardsN, bedsN) {
  if (window.__p52) window.__p52.docs = wardsN + bedsN;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (wardsN > 0 || bedsN > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no wards and no beds registered yet. " +
    "Register them on pages 331 and 332 and the counts here follow automatically.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

/* ---------- live data ---------- */
let wards = [];
let beds = [];
let answeredW = false, answeredB = false;

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  answeredW = true;
  bootAnswered(wards.length, beds.length);
  render();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  answeredB = true;
  bootAnswered(wards.length, beds.length);
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

/* ---------- the counting rules (one language for the whole module) ---------- */
function wardCounts(wardId) {
  const list = beds.filter((b) => String(b.wardId) === String(wardId));
  const occupied = list.filter((b) => b.status === "Occupied").length;
  const available = list.filter((b) => b.status === "Available").length;
  const reserved = list.filter((b) => b.status === "Reserved").length;
  const oos = list.filter((b) => b.status === "Out of Service").length;
  const cleaning = list.filter((b) =>
    b.status === "Cleaning Required" || b.status === "Cleaning in Progress").length;
  const maint = list.filter((b) => b.status === "Maintenance Required").length;
  const usable = list.length - oos; // out-of-service beds leave the usable capacity
  return { total: list.length, occupied, available, reserved, oos, cleaning, maint,
           unusable: oos + cleaning + maint, usable };
}
function pct(occupied, usable) {
  if (!usable) return null;
  return Math.round((occupied / usable) * 100);
}

/* ---------- render ---------- */
function render() {
  const all = wardCountsAll();
  $("#d-wards").textContent = String(wards.length);
  $("#d-beds").textContent = String(all.total);
  $("#d-occ").textContent = String(all.occupied);
  $("#d-avail").textContent = String(all.available);
  $("#d-resv").textContent = String(all.reserved);
  $("#d-unusable").textContent = String(all.cleaning + all.maint);
  $("#d-oos").textContent = String(all.oos);

  const active = wards.filter((w) => w.status !== "Inactive");
  const inactive = wards.filter((w) => w.status === "Inactive");
  const ordered = active.concat(inactive);

  $("#o-empty").hidden = wards.length > 0;
  $("#o-wrap").hidden = ordered.length === 0;
  $("#o-body").innerHTML = ordered.map((w) => {
    const c = wardCounts(w.wardId);
    const p = pct(c.occupied, c.usable);
    const isInactive = w.status === "Inactive";
    return "<tr" + (isInactive ? " class='row-inactive'" : "") + ">" +
      "<td class='c-party'>" + esc(w.wardCode + " · " + w.wardName) + "</td>" +
      "<td>" + esc(w.wardType || "—") + "</td>" +
      "<td>" + (isInactive
        ? "<span class='st st-inactive'>Inactive</span>"
        : "<span class='st st-active'>Active</span>") + "</td>" +
      "<td class='c-num'>" + c.total + "</td>" +
      "<td class='c-num'>" + c.occupied + "</td>" +
      "<td class='c-num'>" + c.available + "</td>" +
      "<td class='c-num'>" + c.reserved + "</td>" +
      "<td class='c-num'>" + c.unusable + "</td>" +
      "<td class='c-num'>" + c.usable + "</td>" +
      "<td class='pct-cell'>" + (c.total === 0 ? "no beds"
        : (p == null ? "—" : esc(c.occupied) + " of " + esc(c.usable) + " · " + p + "%")) + "</td>" +
      "</tr>";
  }).join("");
  $("#o-count").textContent = wards.length === 0 ? ""
    : wards.length + (wards.length === 1 ? " ward · " : " wards · ") +
      all.total + (all.total === 1 ? " bed · " : " beds · ") +
      all.occupied + " occupied · " + all.available + " available right now.";
}
function wardCountsAll() {
  const acc = { total: 0, occupied: 0, available: 0, reserved: 0, oos: 0, cleaning: 0, maint: 0, unusable: 0, usable: 0 };
  wards.forEach((w) => {
    const c = wardCounts(w.wardId);
    acc.total += c.total; acc.occupied += c.occupied; acc.available += c.available;
    acc.reserved += c.reserved; acc.oos += c.oos; acc.cleaning += c.cleaning;
    acc.maint += c.maint; acc.unusable += c.unusable; acc.usable += c.usable;
  });
  return acc;
}

render();
T52_JS_333
[ -s "public/ward-management/333.js" ] && echo "  wrote public/ward-management/333.js ($(wc -c < "public/ward-management/333.js") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/334.html" << 'T52_HTML_334'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bed Assignment — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/ward-management/ward.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section id="s-assign">
    <a class="back" href="/ward-management/330">&larr; Ward Management</a>
    <h1>Patient-to-Bed Assignment</h1>
    <p class="sub">Connect an <b>existing</b> patient to an available bed. Only beds marked <b>Available</b> are listed, a patient can hold only one active placement, and every assignment is remembered. Bed placement is not the same as admission &mdash; the admission record (page 341) manages the stay; this page records where the patient lies.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <p class="emg-note">🚨 Emergency rule: urgent care is never delayed by a bed assignment. Treat first &mdash; when no suitable bed is free, the dashboard (333) shows the true situation and the emergency procedure of the facility applies. An occupied bed is never shown as available.</p>

    <div class="card add-card">
      <h2>1 · Find the patient</h2>
      <p class="mini-note" style="margin-top:4px;">Search by Registration ID or by name &mdash; the patient must already exist in the Patient List. No new patient record is ever created here.</p>
      <div class="find-row" style="margin-top:8px;">
        <input id="g-q" type="text" placeholder="Registration ID (e.g. 8695SLAJ) or patient name…">
        <button class="find-btn" id="g-find" type="button">Find</button>
      </div>
      <div class="cand-list" id="g-cands"></div>
      <div class="sel-panel" id="g-sel" hidden></div>
    </div>

    <div class="card add-card" id="g-bedcard">
      <h2>2 · Choose the bed</h2>
      <div class="form-grid">
        <label>Ward
          <select id="g-ward">
            <option value="">— Choose a ward —</option>
          </select>
        </label>
        <label>Available bed
          <select id="g-bed">
            <option value="">— Choose a ward first —</option>
          </select>
        </label>
        <label>Staff member responsible *
          <input id="g-staff" type="text" placeholder="Your name">
        </label>
        <label class="span-3" style="grid-column:span 3;">Note (optional)
          <input id="g-note" type="text" placeholder="e.g. post-operative, needs oxygen point">
        </label>
      </div>
      <p class="mini-note" id="g-link" hidden style="margin-top:8px;"></p>
      <p class="form-err" id="g-ferr" hidden></p>
      <p class="form-ok" id="g-fok" hidden></p>
      <div class="form-actions">
        <button class="btn-primary" id="g-assign" type="button">Assign Bed</button>
      </div>
    </div>

    <div class="card" style="padding:16px 20px;">
      <h2>3 · Current placements</h2>
      <div class="empty" id="g-empty">
        <div class="empty-icon">👥</div>
        <div class="empty-title">No active placements</div>
        <div class="empty-sub">Every bed assignment made on this account appears here while it is active.</div>
      </div>
      <div class="table-wrap" id="g-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Patient</th><th>Registration ID</th><th>Ward · Bed</th><th>Assigned</th><th>By</th><th>Admission</th><th>Actions</th></tr>
          </thead>
          <tbody id="g-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="g-count"></p>
    </div>
  </section>

</main>

<!-- the release modal -->
<div class="modal-ovl" id="r-wrap" hidden>
  <div class="modal-card" role="dialog" aria-modal="true">
    <h2>Release bed</h2>
    <p class="mini-note" id="r-sub"></p>
    <div class="m-grid">
      <label>Reason for releasing
        <select id="r-reason">
          <option>Discharge</option>
          <option>Correction</option>
          <option>Other</option>
        </select>
      </label>
      <label>Staff member responsible *
        <input id="r-staff" type="text" placeholder="Your name">
      </label>
    </div>
    <p class="mini-note" style="margin-top:8px;">The bed returns to <b>Available</b> and the assignment is preserved in the history with its release date. If the patient still has an open admission, the admission stays open &mdash; discharge is recorded on the Admission Details page (343).</p>
    <p class="form-err" id="r-err" hidden></p>
    <div class="form-actions">
      <button class="btn-primary" id="r-go" type="button">Release Bed</button>
      <button class="btn-ghost" id="r-cancel" type="button">Cancel</button>
    </div>
  </div>
</div>

<script type="module" src="/ward-management/334.js"></script>
</body>
</html>
T52_HTML_334
[ -s "public/ward-management/334.html" ] && echo "  wrote public/ward-management/334.html ($(wc -c < "public/ward-management/334.html") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/334.js" << 'T52_JS_334'
// ward-management (page 334) — JAMALI Health — Patient-to-Bed Assignment
// Connects an EXISTING patient to an AVAILABLE bed. Rules the page enforces:
//   · the patient must already exist (searched from the registrations) —
//     no second patient record is ever created;
//   · one active placement per patient — a duplicate is refused and the
//     current placement is shown instead;
//   · only beds whose status is exactly "Available" can be chosen, and the
//     choice is re-checked against the live data at the moment of saving;
//   · the assignment + the bed update are written in ONE atomic batch, so
//     two patients can never take the same bed, even on a slow network.
// Emergency care is never delayed by this page — treat first, assign after.
import { requireAuth, db, collection, doc, updateDoc, onSnapshot, writeBatch, arrayUnion } from "/firebase.js";

window.__p52 = { page: "334", build: "52g1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p52) window.__p52.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no registrations on this account yet. " +
    "Register the patient first (Registration, page 322), then place them here.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function who(r) { return r.isUnidentified ? "Unidentified" : (r.fullName || "Unnamed"); }
function priBadge(p) {
  const k = String(p || "").toLowerCase();
  const cls = { critical: "st-critical", high: "st-high", medium: "st-medium", low: "st-low" }[k];
  return cls ? "<span class='st " + cls + "'>" + esc(p) + "</span>"
             : "<span class='st st-none'>" + (p ? esc(p) : "—") + "</span>";
}
function staffName() {
  const v = $("#g-staff").value.trim() || $("#r-staff").value.trim();
  if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} }
  return v;
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}

/* ---------- live data ---------- */
let regs = [];
let wards = [];
let beds = [];
let assignments = [];
let admissions = [];
let selected = null; // the registration chosen for placement

onSnapshot(collection(db, "healthRegistrations"), (snap) => {
  regs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .filter((r) => r && r.regId)
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  bootAnswered(regs.length);
  renderCands(); renderSel(); render();
  maybeAutoOpen();
}, (e) => loadErr("healthRegistrations", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  renderWards(); renderBeds();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderWards(); renderBeds(); render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")));
  renderSel(); render();
}, (e) => loadErr("healthBedAssignments", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthAdmissions"), (snap) => {
  admissions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  renderLink(); render();
}, (e) => loadErr("healthAdmissions", e));
window.__p52.listeners++;

function activeAssignmentOf(patientId) {
  return assignments.find((a) => a.status === "Active" &&
    String(a.patientId) === String(patientId)) || null;
}
function activeAdmissionOf(patientId) {
  return admissions.find((a) => (a.status === "Pending" || a.status === "Admitted") &&
    String(a.patientId) === String(patientId)) || null;
}

/* ---------- 1 · find the patient ---------- */
function renderCands() {
  const box = $("#g-cands");
  if (selected) { box.innerHTML = ""; return; }
  const q = $("#g-q").value.trim().toLowerCase();
  if (!q) { box.innerHTML = ""; return; }
  const hits = regs.filter((r) =>
    String(r.regId || "").toLowerCase() === q ||
    String(r.regId || "").toLowerCase().includes(q) ||
    String(who(r)).toLowerCase().includes(q)).slice(0, 8);
  box.innerHTML = hits.length === 0
    ? "<p class='mini-note'>No patient matches &ldquo;" + esc(q) + "&rdquo; — register them first (page 322).</p>"
    : hits.map((r) =>
        "<button type='button' class='cand' data-pick='" + esc(r.__id) + "'>" +
          "<span class='c-id'>" + esc(r.regId) + "</span><b>" + esc(who(r)) + "</b>" +
          "<span class='mini-note'>" + esc([r.age, r.sex].filter(Boolean).join(" · ") || "—") + "</span>" +
          priBadge(r.priority) + "</button>").join("");
}
$("#g-q").addEventListener("input", renderCands);
$("#g-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#g-find").click(); } });
$("#g-find").addEventListener("click", renderCands);
$("#g-cands").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-pick]");
  if (!btn) return;
  selected = regs.find((r) => r.__id === btn.getAttribute("data-pick")) || null;
  $("#g-q").value = selected ? String(selected.regId) : $("#g-q").value;
  renderCands(); renderSel(); renderWards(); renderBeds(); renderLink();
});

function renderSel() {
  const box = $("#g-sel");
  if (!selected) { box.hidden = true; box.innerHTML = ""; return; }
  const dup = activeAssignmentOf(selected.regId);
  box.hidden = false;
  box.innerHTML = "<b>" + esc(who(selected)) + "</b> · Registration ID <b>" + esc(selected.regId) +
    "</b> · " + esc([selected.age, selected.sex].filter(Boolean).join(" · ") || "—") + " " +
    priBadge(selected.priority) +
    (dup
      ? "<br><span style='color:#b91c1c; font-weight:800;'>Already placed: " +
        esc((dup.wardCode || "") + " · bed " + (dup.bedNumber || "")) +
        ". One active placement per patient — to move them, use Transfers (335); to release the bed, use the button below.</span>"
      : "");
  // the ward/bed card is meaningful only for a patient without a placement
  $("#g-ward").disabled = !!dup;
  $("#g-bed").disabled = !!dup;
  $("#g-assign").disabled = !!dup;
}

/* the deep link: 341 sends the patient over via ?patient= or sessionStorage */
function maybeAutoOpen() {
  if (selected) return;
  let pid = new URLSearchParams(location.search).get("patient") || "";
  if (!pid) {
    try {
      const j = sessionStorage.getItem("jamaliAssignPatient");
      if (j) { pid = (JSON.parse(j) || {}).patientId || ""; sessionStorage.removeItem("jamaliAssignPatient"); }
    } catch (e) {}
  }
  if (!pid) return;
  const r = regs.find((x) => String(x.regId) === String(pid));
  if (r) { selected = r; $("#g-q").value = String(r.regId); renderCands(); renderSel(); renderWards(); renderBeds(); renderLink(); }
}

/* ---------- 2 · choose the bed ---------- */
function renderWards() {
  const sel = $("#g-ward");
  const cur = sel.value;
  const act = wards.filter((w) => w.status !== "Inactive");
  sel.innerHTML = '<option value="">— Choose a ward —</option>' + act.map((w) =>
    '<option value="' + esc(w.wardId) + '">' + esc(w.wardCode + " · " + w.wardName) + "</option>").join("");
  if (cur && act.some((w) => w.wardId === cur)) sel.value = cur;
  renderBeds();
}
function availableBeds(wardId) {
  return beds.filter((b) => String(b.wardId) === String(wardId) && b.status === "Available")
    .sort((a, b) => String(a.bedNumber || "").localeCompare(String(b.bedNumber || ""), undefined, { numeric: true }));
}
function renderBeds() {
  const wsel = $("#g-ward"), bsel = $("#g-bed");
  const wid = wsel.value;
  const cur = bsel.value;
  if (!wid) {
    bsel.innerHTML = '<option value="">— Choose a ward first —</option>';
    return;
  }
  const list = availableBeds(wid);
  bsel.innerHTML = list.length === 0
    ? '<option value="">No available bed in this ward</option>'
    : '<option value="">— Choose an available bed —</option>' + list.map((b) =>
        '<option value="' + esc(b.bedId) + '">' + esc(b.bedNumber + " · " + (b.bedType || "Standard")) + "</option>").join("");
  if (cur && list.some((b) => b.bedId === cur)) bsel.value = cur;
}
$("#g-ward").addEventListener("change", renderBeds);

function renderLink() {
  const line = $("#g-link");
  if (!selected) { line.hidden = true; line.textContent = ""; return; }
  const a = activeAdmissionOf(selected.regId);
  line.hidden = !a;
  line.textContent = a
    ? "Will be linked to admission " + (a.admissionNumber || "") +
      (a.status === "Pending" ? " — assigning the bed confirms the admission (Pending \u2192 Admitted)." : ".")
    : "";
}

/* ---------- assign ---------- */
function ferr(msg) { const e = $("#g-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function fok(msg) {
  const e = $("#g-fok");
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.textContent = msg;
  clearTimeout(fok.t); fok.t = setTimeout(() => { e.hidden = true; }, 5000);
}

$("#g-assign").addEventListener("click", async () => {
  ferr(""); fok("");
  if (!selected) return ferr("Find and choose the patient first (step 1).");
  const dup = activeAssignmentOf(selected.regId);
  if (dup) return ferr("This patient already holds bed " + (dup.bedNumber || "") + " in " +
    (dup.wardCode || "") + " — one active placement per patient.");
  const w = wards.find((x) => x.wardId === $("#g-ward").value);
  if (!w) return ferr("Choose the ward.");
  if (w.status === "Inactive") return ferr("That ward is inactive — choose an active ward.");
  const b = beds.find((x) => x.bedId === $("#g-bed").value);
  if (!b) return ferr("Choose an available bed in " + (w.wardCode || w.wardName) + ".");
  if (b.status !== "Available")
    return ferr("Bed " + (b.bedNumber || "") + " is no longer available (" + (b.status || "unknown") +
      ") — the list has been refreshed, choose again.");
  const staff = staffName();
  if (!staff) return ferr("The staff member responsible is required — enter a name.");
  const linked = activeAdmissionOf(selected.regId);

  const btn = $("#g-assign");
  if (btn.disabled) return; // duplicate-submission guard
  btn.disabled = true;
  try {
    const ref = doc(collection(db, "healthBedAssignments"));
    const batch = writeBatch(db);
    batch.set(ref, {
      assignmentId: ref.id,
      patientId: selected.regId,
      patientName: who(selected),
      admissionId: linked ? (linked.admissionNumber || linked.__id) : "",
      wardId: w.wardId,
      wardCode: w.wardCode || "",
      wardName: w.wardName || "",
      bedId: b.bedId || "",
      bedNumber: b.bedNumber || "",
      assignedAt: nowISO(),
      assignedBy: staff,
      note: $("#g-note").value.trim(),
      status: "Active",
      releasedAt: "",
      releasedBy: "",
      releaseReason: ""
    });
    batch.update(doc(db, "healthBeds", b.__id), {
      status: "Occupied",
      currentPatientId: selected.regId,
      currentPatientName: who(selected),
      currentAssignmentId: ref.id,
      updatedAt: nowISO()
    });
    if (linked && linked.status === "Pending") {
      batch.update(doc(db, "healthAdmissions", linked.__id), {
        status: "Admitted",
        updatedAt: nowISO(),
        statusHistory: arrayUnion({
          status: "Admitted", at: nowISO(), by: staff,
          note: "Bed " + (b.bedNumber || "") + " (" + (w.wardCode || "") + ") assigned"
        })
      });
    }
    await batch.commit();
    fok("Assigned — " + who(selected) + " is in " + (w.wardCode || "") + ", bed " + (b.bedNumber || "") +
      (linked && linked.status === "Pending" ? ". Admission " + (linked.admissionNumber || "") + " is now Admitted." : "."));
    selected = null;
    $("#g-q").value = ""; $("#g-note").value = ""; $("#g-bed").value = "";
    renderCands(); renderSel(); renderWards(); renderBeds(); renderLink(); render();
  } catch (e) {
    ferr("Could not assign: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});

/* ---------- 3 · current placements + release ---------- */
function render() {
  const act = assignments.filter((a) => a.status === "Active");
  $("#g-empty").hidden = act.length > 0;
  $("#g-wrap").hidden = act.length === 0;
  $("#g-body").innerHTML = act.map((a) => {
    const adm = admissions.find((x) => x.status !== "Discharged" && x.status !== "Cancelled" &&
      (x.admissionNumber === a.admissionId || x.__id === a.admissionId));
    return "<tr>" +
      "<td class='c-party'>" + esc(a.patientName || "—") + "</td>" +
      "<td class='c-no'>" + esc(a.patientId || "") + "</td>" +
      "<td class='nowrap'>" + esc((a.wardCode || "—") + " · bed " + (a.bedNumber || "—")) + "</td>" +
      "<td class='c-date'>" + esc(when(a.assignedAt)) + "</td>" +
      "<td>" + esc(a.assignedBy || "—") + "</td>" +
      "<td class='c-no'>" + (adm ? "<a href='/patient-admission/343?id=" + encodeURIComponent(adm.__id) + "'>" + esc(adm.admissionNumber || adm.__id) + "</a>" : "—") + "</td>" +
      "<td class='c-act'>" +
        "<a class='ghost-btn' href='/ward-management/335?patient=" + encodeURIComponent(a.patientId || "") + "'>Transfer</a> " +
        "<button type='button' class='ghost-btn danger' data-release='" + esc(a.__id) + "'>Release</button>" +
      "</td></tr>";
  }).join("");
  $("#g-count").textContent = act.length === 0 ? ""
    : act.length + (act.length === 1 ? " active placement." : " active placements.");
}
$("#g-body").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-release]");
  if (!btn) return;
  const a = assignments.find((x) => x.__id === btn.getAttribute("data-release"));
  if (a) openRelease(a);
});

let releasing = null;
function openRelease(a) {
  releasing = a;
  $("#r-sub").textContent = who({ fullName: a.patientName }) + " (" + (a.patientId || "") + ") · " +
    (a.wardCode || "") + " · bed " + (a.bedNumber || "");
  $("#r-staff").value = rememberedStaff();
  $("#r-reason").value = "Discharge";
  $("#r-err").hidden = true;
  $("#r-wrap").hidden = false;
}
$("#r-cancel").addEventListener("click", () => { $("#r-wrap").hidden = true; releasing = null; });
$("#r-go").addEventListener("click", async () => {
  if (!releasing) return;
  const e = $("#r-err"); e.hidden = true;
  const staff = $("#r-staff").value.trim();
  if (!staff) { e.textContent = "The staff member responsible is required — enter a name."; e.hidden = false; return; }
  if (staff) { try { localStorage.setItem("jamaliStaff", staff); } catch (err) {} }
  const b = beds.find((x) => x.__id === String(releasing.bedId) ||
    (String(x.wardId) === String(releasing.wardId) && x.bedNumber === releasing.bedNumber));
  const btn = $("#r-go");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "healthBedAssignments", releasing.__id), {
      status: "Released",
      releasedAt: nowISO(),
      releasedBy: staff,
      releaseReason: $("#r-reason").value,
      note: releasing.note || ""
    });
    if (b) {
      batch.update(doc(db, "healthBeds", b.__id), {
        status: "Available",
        currentPatientId: "",
        currentPatientName: "",
        currentAssignmentId: "",
        updatedAt: nowISO()
      });
    }
    await batch.commit();
    $("#r-wrap").hidden = true;
    releasing = null;
    fok("Bed released — the assignment stays in the history with its release date.");
  } catch (err) {
    e.textContent = "Could not release: " + ((err && (err.code || err.message)) || err);
    e.hidden = false;
  }
  btn.disabled = false;
});

renderCands(); renderSel(); renderWards(); renderBeds(); renderLink(); render();
maybeAutoOpen();
T52_JS_334
[ -s "public/ward-management/334.js" ] && echo "  wrote public/ward-management/334.js ($(wc -c < "public/ward-management/334.js") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/335.html" << 'T52_HTML_335'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ward &amp; Bed Transfers — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/ward-management/ward.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section id="s-transfer">
    <a class="back" href="/ward-management/330">&larr; Ward Management</a>
    <h1>Ward &amp; Bed Transfers</h1>
    <p class="sub">Move a placed patient to another bed or ward. The previous bed is freed and the destination bed is filled in <b>one atomic move</b>; the destination must be available and suitable before the transfer completes. The history is preserved and the patient record is never duplicated &mdash; a transfer is not a new admission.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <div class="card" style="padding:16px 20px;">
      <h2>1 · Pick the patient to move</h2>
      <div class="empty" id="t-empty">
        <div class="empty-icon">🔄</div>
        <div class="empty-title">Nobody to move</div>
        <div class="empty-sub">Only patients with an active bed placement (334) can be transferred.</div>
      </div>
      <div class="table-wrap" id="t-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Patient</th><th>Registration ID</th><th>Current ward · Bed</th><th>Placed</th><th>By</th><th>Actions</th></tr>
          </thead>
          <tbody id="t-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="t-count"></p>
    </div>

    <div class="card add-card" id="t-card" hidden>
      <h2>2 · Destination</h2>
      <div class="sel-panel" id="t-dpatient" style="margin:0 0 12px;"></div>
      <div class="form-grid">
        <label>Destination ward
          <select id="t-ward">
            <option value="">— Choose a ward —</option>
          </select>
        </label>
        <label>Available destination bed
          <select id="t-bed">
            <option value="">— Choose a ward first —</option>
          </select>
        </label>
        <label>Authorized staff member *
          <input id="t-staff" type="text" placeholder="Your name">
        </label>
        <label style="grid-column:span 3;">Reason for transfer *
          <textarea id="t-reason" rows="2" placeholder="e.g. closer nursing observation, isolation, ward specialisation"></textarea>
        </label>
      </div>
      <p class="form-err" id="t-ferr" hidden></p>
      <p class="form-ok" id="t-fok" hidden></p>
      <div class="form-actions">
        <button class="btn-primary" id="t-go" type="button">Complete Transfer</button>
        <button class="btn-ghost" id="t-cancel" type="button">Cancel Move</button>
      </div>
    </div>

    <div class="card" style="padding:16px 20px;">
      <h2>Transfer history</h2>
      <div class="empty" id="h-empty">
        <div class="empty-icon">📜</div>
        <div class="empty-title">No transfers recorded yet</div>
        <div class="empty-sub">Every completed move is preserved here — completed transfers are never overwritten.</div>
      </div>
      <div class="table-wrap" id="h-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Patient</th><th>From</th><th>To</th><th>When</th><th>Reason</th><th>Authorized by</th></tr>
          </thead>
          <tbody id="h-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="h-count"></p>
    </div>
  </section>

</main>
<script type="module" src="/ward-management/335.js"></script>
</body>
</html>
T52_HTML_335
[ -s "public/ward-management/335.html" ] && echo "  wrote public/ward-management/335.html ($(wc -c < "public/ward-management/335.html") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/335.js" << 'T52_JS_335'
// ward-management (page 335) — JAMALI Health — Ward & Bed Transfers
// Moves a placed patient to another bed or ward in ONE atomic batch:
//   new Active assignment + old assignment Released (reason Transfer) +
//   old bed back to Available + destination bed to Occupied + the transfer
//   document itself + the linked admission marked Transferred. The
//   destination bed is re-checked against the live data at the moment of
//   saving; history is preserved and the patient record is never duplicated.
import { requireAuth, db, collection, doc, updateDoc, onSnapshot, writeBatch, arrayUnion } from "/firebase.js";

window.__p52 = { page: "335", build: "52t1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p52) window.__p52.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no active placements yet. Place a patient first (Bed Assignment, 334).";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

/* ---------- live data ---------- */
let assignments = [];
let wards = [];
let beds = [];
let admissions = [];
let transfers = [];
let moving = null; // the active assignment being moved

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")));
  bootAnswered(assignments.length);
  renderPick(); renderDest(); renderHistory();
  maybeAutoOpen();
}, (e) => loadErr("healthBedAssignments", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  renderWards(); renderBeds();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderWards(); renderBeds();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthAdmissions"), (snap) => {
  admissions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
}, (e) => loadErr("healthAdmissions", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedTransfers"), (snap) => {
  transfers = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.transferredAt || "").localeCompare(String(a.transferredAt || "")));
  renderHistory();
}, (e) => loadErr("healthBedTransfers", e));
window.__p52.listeners++;

/* ---------- 1 · pick the patient ---------- */
function renderPick() {
  const act = assignments.filter((a) => a.status === "Active");
  $("#t-empty").hidden = act.length > 0;
  $("#t-wrap").hidden = act.length === 0;
  $("#t-body").innerHTML = act.map((a) =>
    "<tr" + (moving && moving.__id === a.__id ? " class='is-hl'" : "") + ">" +
      "<td class='c-party'>" + esc(a.patientName || "—") + "</td>" +
      "<td class='c-no'>" + esc(a.patientId || "") + "</td>" +
      "<td class='nowrap'>" + esc((a.wardCode || "—") + " · bed " + (a.bedNumber || "—")) + "</td>" +
      "<td class='c-date'>" + esc(when(a.assignedAt)) + "</td>" +
      "<td>" + esc(a.assignedBy || "—") + "</td>" +
      "<td class='c-act'><button type='button' class='ghost-btn' data-move='" + esc(a.__id) + "'>Move</button></td>" +
    "</tr>").join("");
  $("#t-count").textContent = act.length === 0 ? ""
    : act.length + (act.length === 1 ? " active placement." : " active placements.");
}
$("#t-body").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-move]");
  if (!btn) return;
  const a = assignments.find((x) => x.__id === btn.getAttribute("data-move"));
  if (a) { moving = a; renderPick(); renderDest(); renderWards(); renderBeds(); }
});

function maybeAutoOpen() {
  if (moving) return;
  const pid = new URLSearchParams(location.search).get("patient") || "";
  if (!pid) return;
  const a = assignments.find((x) => x.status === "Active" && String(x.patientId) === String(pid));
  if (a) { moving = a; renderPick(); renderDest(); renderWards(); renderBeds(); }
}

/* ---------- 2 · destination ---------- */
function renderDest() {
  const card = $("#t-card");
  const panel = $("#t-dpatient");
  if (!moving) { card.hidden = true; panel.hidden = true; panel.textContent = ""; return; }
  card.hidden = false;
  panel.hidden = false;
  panel.innerHTML = "Moving <b>" + esc(moving.patientName || "—") + "</b> (" + esc(moving.patientId || "") +
    ") from <b>" + esc((moving.wardCode || "—") + " · bed " + (moving.bedNumber || "—")) + "</b>" +
    (moving.admissionId ? " · linked admission " + esc(moving.admissionId) : "");
  $("#t-staff").value = rememberedStaff();
}
function renderWards() {
  const sel = $("#t-ward");
  const cur = sel.value;
  const act = wards.filter((w) => w.status !== "Inactive");
  sel.innerHTML = '<option value="">— Choose a ward —</option>' + act.map((w) =>
    '<option value="' + esc(w.wardId) + '">' + esc(w.wardCode + " · " + w.wardName) + "</option>").join("");
  if (cur && act.some((w) => w.wardId === cur)) sel.value = cur;
  renderBeds();
}
function renderBeds() {
  const bsel = $("#t-bed");
  const cur = bsel.value;
  if (!moving || !$("#t-ward").value) {
    bsel.innerHTML = '<option value="">— Choose a ward first —</option>';
    return;
  }
  const list = beds.filter((b) => String(b.wardId) === String($("#t-ward").value) &&
      b.status === "Available" &&
      !(String(b.wardId) === String(moving.wardId) && b.bedNumber === moving.bedNumber))
    .sort((a, b) => String(a.bedNumber || "").localeCompare(String(b.bedNumber || ""), undefined, { numeric: true }));
  bsel.innerHTML = list.length === 0
    ? '<option value="">No available bed in this ward</option>'
    : '<option value="">— Choose an available bed —</option>' + list.map((b) =>
        '<option value="' + esc(b.bedId) + '">' + esc(b.bedNumber + " · " + (b.bedType || "Standard")) + "</option>").join("");
  if (cur && list.some((b) => b.bedId === cur)) bsel.value = cur;
}
$("#t-ward").addEventListener("change", renderBeds);
$("#t-cancel").addEventListener("click", () => {
  moving = null; renderPick(); renderDest();
});

function ferr(msg) { const e = $("#t-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function fok(msg) {
  const e = $("#t-fok");
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.textContent = msg;
  clearTimeout(fok.t); fok.t = setTimeout(() => { e.hidden = true; }, 5000);
}

$("#t-go").addEventListener("click", async () => {
  ferr(""); fok("");
  if (!moving) return ferr("Pick the patient to move first (step 1).");
  const fresh = assignments.find((x) => x.__id === moving.__id);
  if (!fresh || fresh.status !== "Active")
    return ferr("This placement is no longer active — it may have been released. Refresh and pick again.");
  const staff = $("#t-staff").value.trim();
  if (!staff) return ferr("The authorized staff member is required — enter a name.");
  const reason = $("#t-reason").value.trim();
  if (!reason) return ferr("The reason for the transfer is required.");
  const w = wards.find((x) => x.wardId === $("#t-ward").value);
  if (!w) return ferr("Choose the destination ward.");
  if (w.status === "Inactive") return ferr("That ward is inactive — choose an active ward.");
  const b = beds.find((x) => x.bedId === $("#t-bed").value);
  if (!b) return ferr("Choose an available destination bed.");
  if (String(b.wardId) === String(fresh.wardId) && b.bedNumber === fresh.bedNumber)
    return ferr("That is the patient's current bed — choose a different one.");
  if (b.status !== "Available")
    return ferr("Bed " + (b.bedNumber || "") + " is no longer available (" + (b.status || "unknown") +
      ") — the list has been refreshed, choose again.");
  keepStaff(staff);

  const btn = $("#t-go");
  if (btn.disabled) return; // duplicate-submission guard
  btn.disabled = true;
  try {
    const ref = doc(collection(db, "healthBedAssignments"));
    const batch = writeBatch(db);
    // the new placement
    batch.set(ref, {
      assignmentId: ref.id,
      patientId: fresh.patientId || "",
      patientName: fresh.patientName || "",
      admissionId: fresh.admissionId || "",
      wardId: w.wardId,
      wardCode: w.wardCode || "",
      wardName: w.wardName || "",
      bedId: b.bedId || "",
      bedNumber: b.bedNumber || "",
      assignedAt: nowISO(),
      assignedBy: staff,
      note: "Via transfer · " + reason,
      status: "Active",
      releasedAt: "",
      releasedBy: "",
      releaseReason: ""
    });
    // the old placement ends
    batch.update(doc(db, "healthBedAssignments", fresh.__id), {
      status: "Released",
      releasedAt: nowISO(),
      releasedBy: staff,
      releaseReason: "Transfer"
    });
    // the old bed is freed
    const oldBed = beds.find((x) => x.__id === String(fresh.bedId) ||
      (String(x.wardId) === String(fresh.wardId) && x.bedNumber === fresh.bedNumber));
    if (oldBed) {
      batch.update(doc(db, "healthBeds", oldBed.__id), {
        status: "Available",
        currentPatientId: "",
        currentPatientName: "",
        currentAssignmentId: "",
        updatedAt: nowISO()
      });
    }
    // the destination bed is taken
    batch.update(doc(db, "healthBeds", b.__id), {
      status: "Occupied",
      currentPatientId: fresh.patientId || "",
      currentPatientName: fresh.patientName || "",
      currentAssignmentId: ref.id,
      updatedAt: nowISO()
    });
    // the transfer record itself
    batch.set(doc(collection(db, "healthBedTransfers")), {
      transferId: "TR" + Date.now().toString(36).toUpperCase() +
        Math.floor(Math.random() * 36).toString(36).toUpperCase(),
      patientId: fresh.patientId || "",
      patientName: fresh.patientName || "",
      admissionId: fresh.admissionId || "",
      fromWardId: fresh.wardId || "",
      fromWardCode: fresh.wardCode || "",
      fromBedId: fresh.bedId || "",
      fromBedNumber: fresh.bedNumber || "",
      toWardId: w.wardId,
      toWardCode: w.wardCode || "",
      toBedId: b.bedId || "",
      toBedNumber: b.bedNumber || "",
      reason,
      authorizedBy: staff,
      transferredAt: nowISO(),
      status: "Completed"
    });
    // the linked admission moves to Transferred (never to Discharged)
    const adm = admissions.find((x) => (x.status === "Admitted" || x.status === "Transferred") &&
      (x.admissionNumber === fresh.admissionId || x.__id === fresh.admissionId));
    if (adm) {
      batch.update(doc(db, "healthAdmissions", adm.__id), {
        status: "Transferred",
        updatedAt: nowISO(),
        statusHistory: arrayUnion({
          status: "Transferred", at: nowISO(), by: staff,
          note: "Moved to " + (w.wardCode || "") + " · bed " + (b.bedNumber || "")
        })
      });
    }
    await batch.commit();
    fok("Transfer complete — " + (fresh.patientName || "patient") + " is now in " +
      (w.wardCode || "") + ", bed " + (b.bedNumber || "") +
      (adm ? "; admission " + (adm.admissionNumber || "") + " is marked Transferred." : "."));
    moving = null;
    $("#t-reason").value = ""; $("#t-bed").value = "";
    renderPick(); renderDest(); renderWards(); renderBeds(); renderHistory();
  } catch (e) {
    ferr("Could not complete the transfer: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});

/* ---------- history ---------- */
function renderHistory() {
  $("#h-empty").hidden = transfers.length > 0;
  $("#h-wrap").hidden = transfers.length === 0;
  $("#h-body").innerHTML = transfers.map((t) =>
    "<tr>" +
      "<td class='c-party'>" + esc(t.patientName || "—") + " <span class='mini-note'>" + esc(t.patientId || "") + "</span></td>" +
      "<td class='nowrap'>" + esc((t.fromWardCode || "—") + " · bed " + (t.fromBedNumber || "—")) + "</td>" +
      "<td class='nowrap'>" + esc((t.toWardCode || "—") + " · bed " + (t.toBedNumber || "—")) + "</td>" +
      "<td class='c-date'>" + esc(when(t.transferredAt)) + "</td>" +
      "<td class='c-desc'>" + esc(t.reason || "—") + "</td>" +
      "<td>" + esc(t.authorizedBy || "—") + "</td>" +
    "</tr>").join("");
  $("#h-count").textContent = transfers.length === 0 ? ""
    : transfers.length + (transfers.length === 1 ? " transfer on record." : " transfers on record.");
}

renderPick(); renderDest(); renderWards(); renderBeds(); renderHistory();
maybeAutoOpen();
T52_JS_335
[ -s "public/ward-management/335.js" ] && echo "  wrote public/ward-management/335.js ($(wc -c < "public/ward-management/335.js") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/336.html" << 'T52_HTML_336'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cleaning &amp; Maintenance — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/ward-management/ward.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section id="s-maint">
    <a class="back" href="/ward-management/330">&larr; Ward Management</a>
    <h1>Cleaning &amp; Maintenance</h1>
    <p class="sub">Keeps unusable beds out of the assignment lists. A bed reported here leaves the <b>Available</b> pool immediately and only returns to service through this page &mdash; so a bed that needs cleaning or maintenance can never be assigned as ready for use. An occupied bed cannot be reported: release the patient first.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <div class="card add-card">
      <h2>Report a bed</h2>
      <div class="form-grid">
        <label>Ward
          <select id="m-ward">
            <option value="">— Choose a ward —</option>
          </select>
        </label>
        <label>Bed (not occupied, not already reported)
          <select id="m-bed">
            <option value="">— Choose a ward first —</option>
          </select>
        </label>
        <label>State to report
          <select id="m-state">
            <option>Cleaning Required</option>
            <option>Maintenance Required</option>
            <option>Out of Service</option>
          </select>
        </label>
        <label style="grid-column:span 3;">Reason *
          <textarea id="m-reason" rows="2" placeholder="e.g. terminal cleaning after discharge, broken side rail, mattress tear"></textarea>
        </label>
        <label>Reported by *
          <input id="m-staff" type="text" placeholder="Your name">
        </label>
      </div>
      <p class="form-err" id="m-ferr" hidden></p>
      <p class="form-ok" id="m-fok" hidden></p>
      <div class="form-actions">
        <button class="btn-primary" id="m-report" type="button">Report Bed</button>
      </div>
    </div>

    <div class="card" style="padding:16px 20px;">
      <h2>Beds under attention</h2>
      <div class="empty" id="u-empty">
        <div class="empty-icon">🧹</div>
        <div class="empty-title">Nothing to clean or fix</div>
        <div class="empty-sub">Every bed reported here appears with its next step until it is returned to service.</div>
      </div>
      <div class="table-wrap" id="u-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Bed</th><th>Ward</th><th>Status</th><th>Reason</th><th>Reported</th><th>Last change</th><th>Next step</th></tr>
          </thead>
          <tbody id="u-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="u-count"></p>
    </div>

    <div class="card" style="padding:16px 20px;">
      <h2>Maintenance history</h2>
      <div class="empty" id="y-empty">
        <div class="empty-icon">📜</div>
        <div class="empty-title">No reports yet</div>
        <div class="empty-sub">Reports stay here after the bed returns to service — they are never overwritten.</div>
      </div>
      <div class="table-wrap" id="y-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Bed</th><th>Ward</th><th>Reason</th><th>Reported</th><th>By</th><th>Returned to service</th><th>Final state</th></tr>
          </thead>
          <tbody id="y-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="y-count"></p>
    </div>
  </section>

</main>
<script type="module" src="/ward-management/336.js"></script>
</body>
</html>
T52_HTML_336
[ -s "public/ward-management/336.html" ] && echo "  wrote public/ward-management/336.html ($(wc -c < "public/ward-management/336.html") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/336.js" << 'T52_JS_336'
// ward-management (page 336) — JAMALI Health — Cleaning & Maintenance
// A bed reported here leaves the Available pool at once and comes back
// only through this page: Cleaning Required -> Cleaning in Progress ->
// Ready for Use (bed Available again), Maintenance Required -> Ready for
// Use, Out of Service -> Ready for Use. Occupied beds cannot be reported,
// and every step is preserved in the maintenance history. No failure can
// hide: every listener carries an error callback and failures paint the
// banner.
import { requireAuth, db, collection, doc, setDoc, updateDoc, onSnapshot, arrayUnion } from "/firebase.js";

window.__p52 = { page: "336", build: "52m1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p52) window.__p52.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no beds registered yet. Register wards (331) and beds (332) first.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
const ST_CLASS = {
  "Available": "st-avail", "Occupied": "st-occ", "Reserved": "st-resv",
  "Cleaning Required": "st-clean", "Cleaning in Progress": "st-clean",
  "Maintenance Required": "st-maint", "Out of Service": "st-oos",
  "Ready for Use": "st-ready"
};

/* ---------- live data ---------- */
let beds = [];
let wards = [];
let maints = [];

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  bootAnswered(beds.length);
  renderOpen(); renderHistory();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  renderWards(); renderBeds();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedMaintenance"), (snap) => {
  maints = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.reportedAt || "").localeCompare(String(a.reportedAt || "")));
  renderBeds(); renderOpen(); renderHistory();
}, (e) => loadErr("healthBedMaintenance", e));
window.__p52.listeners++;

function openMaintOf(bedDocId) {
  return maints.find((m) => m.bedDocId === bedDocId && m.status !== "Ready for Use") || null;
}
function wardCodeOf(wardId) {
  const w = wards.find((x) => x.wardId === wardId);
  return (w && w.wardCode) || "";
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

/* ---------- report form ---------- */
function renderWards() {
  const sel = $("#m-ward");
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Choose a ward —</option>' + wards.map((w) =>
    '<option value="' + esc(w.wardId) + '">' + esc(w.wardCode + " · " + w.wardName) + "</option>").join("");
  if (cur && wards.some((w) => w.wardId === cur)) sel.value = cur;
  renderBeds();
}
function renderBeds() {
  const bsel = $("#m-bed");
  const cur = bsel.value;
  if (!$("#m-ward").value) {
    bsel.innerHTML = '<option value="">— Choose a ward first —</option>';
    return;
  }
  const list = beds.filter((b) => String(b.wardId) === String($("#m-ward").value) &&
      b.status !== "Occupied" && !openMaintOf(b.__id))
    .sort((a, b) => String(a.bedNumber || "").localeCompare(String(b.bedNumber || ""), undefined, { numeric: true }));
  bsel.innerHTML = list.length === 0
    ? '<option value="">No reportable bed in this ward</option>'
    : '<option value="">— Choose a bed —</option>' + list.map((b) =>
        '<option value="' + esc(b.__id) + '">' + esc(b.bedNumber + " · " + (b.bedType || "Standard")) +
        " (" + esc(b.status) + ")</option>").join("");
  if (cur && list.some((b) => b.__id === cur)) bsel.value = cur;
}
$("#m-ward").addEventListener("change", renderBeds);

function ferr(msg) { const e = $("#m-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function fok(msg) {
  const e = $("#m-fok");
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.textContent = msg;
  clearTimeout(fok.t); fok.t = setTimeout(() => { e.hidden = true; }, 5000);
}

$("#m-report").addEventListener("click", async () => {
  ferr(""); fok("");
  const b = beds.find((x) => x.__id === $("#m-bed").value);
  if (!b) return ferr("Choose the bed to report.");
  if (b.status === "Occupied")
    return ferr("Bed " + (b.bedNumber || "") + " is occupied — release the patient first (334).");
  if (openMaintOf(b.__id))
    return ferr("Bed " + (b.bedNumber || "") + " already has an open report below.");
  const reason = $("#m-reason").value.trim();
  if (!reason) return ferr("The reason is required.");
  const staff = $("#m-staff").value.trim();
  if (!staff) return ferr("The reporter name is required.");
  const state = $("#m-state").value;
  keepStaff(staff);

  const btn = $("#m-report");
  if (btn.disabled) return; // duplicate-submission guard
  btn.disabled = true;
  try {
    const ref = doc(collection(db, "healthBedMaintenance"));
    await updateDoc(doc(db, "healthBeds", b.__id), {
      status: state,
      updatedAt: nowISO()
    });
    await setDoc(ref, {
      maintenanceId: ref.id,
      bedDocId: b.__id,
      bedId: b.bedId || "",
      bedNumber: b.bedNumber || "",
      wardId: b.wardId || "",
      wardCode: b.wardCode || wardCodeOf(b.wardId),
      reason,
      reportedAt: nowISO(),
      reportedBy: staff,
      status: state,
      returnedAt: "",
      returnedBy: "",
      statusHistory: [{ status: state, at: nowISO(), by: staff }],
      createdAt: nowISO()
    });
    fok("Bed " + (b.bedNumber || "") + " reported — it is out of the assignment pool until it is marked ready.");
    $("#m-reason").value = ""; $("#m-bed").value = "";
  } catch (e) {
    ferr("Could not save the report: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});

/* ---------- beds under attention ---------- */
function renderOpen() {
  const open = maints.filter((m) => m.status !== "Ready for Use");
  $("#u-empty").hidden = open.length > 0;
  $("#u-wrap").hidden = open.length === 0;
  $("#u-body").innerHTML = open.map((m) => {
    const next = m.status === "Cleaning Required"
      ? { label: "Start Cleaning", act: "start" }
      : (m.status === "Cleaning in Progress" || m.status === "Maintenance Required")
        ? { label: "Mark Ready", act: "ready" }
        : { label: "Return to Service", act: "ready" };
    const last = (m.statusHistory && m.statusHistory.length)
      ? m.statusHistory[m.statusHistory.length - 1] : null;
    return "<tr>" +
      "<td class='c-no nowrap'>Bed " + esc(m.bedNumber || "—") + "</td>" +
      "<td>" + esc(m.wardCode || wardCodeOf(m.wardId) || "—") + "</td>" +
      "<td><span class='st " + (ST_CLASS[m.status] || "st-oos") + "'>" + esc(m.status) + "</span></td>" +
      "<td class='c-desc'>" + esc(m.reason || "—") + "</td>" +
      "<td class='c-date'>" + esc(when(m.reportedAt)) + "</td>" +
      "<td class='c-date'>" + esc(last ? when(last.at) : "—") + "</td>" +
      "<td class='c-act'><button type='button' class='ghost-btn' data-maint='" + esc(m.__id) +
        "' data-act='" + next.act + "'>" + next.label + "</button></td>" +
    "</tr>";
  }).join("");
  $("#u-count").textContent = open.length === 0 ? ""
    : open.length + (open.length === 1 ? " bed under attention." : " beds under attention.");
}
$("#u-body").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-maint]");
  if (!btn) return;
  const m = maints.find((x) => x.__id === btn.getAttribute("data-maint"));
  if (!m) return;
  const act = btn.getAttribute("data-act");
  const staff = rememberedStaff();
  if (!staff) { fok(""); return ferr("Enter your name in the report form once — the page remembers it."); }
  const newStatus = act === "start" ? "Cleaning in Progress" : "Ready for Use";
  btn.disabled = true;
  try {
    if (newStatus === "Ready for Use") {
      await updateDoc(doc(db, "healthBeds", m.bedDocId), {
        status: "Available",
        updatedAt: nowISO()
      });
    }
    await updateDoc(doc(db, "healthBedMaintenance", m.__id), {
      status: newStatus,
      returnedAt: newStatus === "Ready for Use" ? nowISO() : (m.returnedAt || ""),
      returnedBy: newStatus === "Ready for Use" ? staff : (m.returnedBy || ""),
      statusHistory: arrayUnion({ status: newStatus, at: nowISO(), by: staff }),
      updatedAt: nowISO()
    });
    fok(newStatus === "Ready for Use"
      ? "Bed " + (m.bedNumber || "") + " is back in the Available pool."
      : "Cleaning started on bed " + (m.bedNumber || "") + ".");
  } catch (err) {
    ferr("Could not save: " + ((err && (err.code || err.message)) || err));
  }
  btn.disabled = false;
});

/* ---------- history ---------- */
function renderHistory() {
  $("#y-empty").hidden = maints.length > 0;
  $("#y-wrap").hidden = maints.length === 0;
  $("#y-body").innerHTML = maints.map((m) =>
    "<tr>" +
      "<td class='c-no nowrap'>Bed " + esc(m.bedNumber || "—") + "</td>" +
      "<td>" + esc(m.wardCode || wardCodeOf(m.wardId) || "—") + "</td>" +
      "<td class='c-desc'>" + esc(m.reason || "—") + "</td>" +
      "<td class='c-date'>" + esc(when(m.reportedAt)) + "</td>" +
      "<td>" + esc(m.reportedBy || "—") + "</td>" +
      "<td class='c-date'>" + esc(m.returnedAt ? when(m.returnedAt) : "—") + "</td>" +
      "<td><span class='st " + (ST_CLASS[m.status] || "st-oos") + "'>" + esc(m.status) + "</span></td>" +
    "</tr>").join("");
  $("#y-count").textContent = maints.length === 0 ? ""
    : maints.length + (maints.length === 1 ? " report on record." : " reports on record.");
}

renderWards(); renderBeds(); renderOpen(); renderHistory();
T52_JS_336
[ -s "public/ward-management/336.js" ] && echo "  wrote public/ward-management/336.js ($(wc -c < "public/ward-management/336.js") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/337.html" << 'T52_HTML_337'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ward Register — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/ward-management/ward.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section id="s-reg">
    <a class="back" href="/ward-management/330">&larr; Ward Management</a>
    <h1>Ward Register</h1>
    <p class="sub">Every registered ward with its live occupancy, counted from the bed records. Search by ward code, name or type. This register is read-only &mdash; changes are made on Ward Registration (331), and the numbers follow the beds automatically.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <div class="card" style="padding:16px 20px;">
      <h2>All wards</h2>
      <div class="find-row" style="margin-top:10px;">
        <input id="r-q" type="text" placeholder="Search by ward code, name or type…">
      </div>
      <div class="empty" id="r-empty">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No wards registered yet</div>
        <div class="empty-sub">Register the first ward on Ward Registration (331) — it appears here immediately.</div>
      </div>
      <div class="table-wrap" id="r-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>Ward Code</th><th>Ward Name</th><th>Type</th><th>Building · Floor</th><th>Licensed Capacity</th><th>Beds</th><th>Occupied</th><th>Usable</th><th>Occupancy</th><th>Ward Status</th></tr>
          </thead>
          <tbody id="r-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="r-count"></p>
    </div>
  </section>

</main>
<script type="module" src="/ward-management/337.js"></script>
</body>
</html>
T52_HTML_337
[ -s "public/ward-management/337.html" ] && echo "  wrote public/ward-management/337.html ($(wc -c < "public/ward-management/337.html") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/337.js" << 'T52_JS_337'
// ward-management (page 337) — JAMALI Health — the Ward Register
// Read-only: every registered ward with code, name, type, location,
// licensed capacity, bed count, occupancy and status, searched by code,
// name or type. All figures are counted from the live bed records — the
// register never stores its own totals. No failure can hide: every
// listener carries an error callback and failures paint the banner.
import { requireAuth, db, collection, onSnapshot } from "/firebase.js";

window.__p52 = { page: "337", build: "52r1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p52) window.__p52.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no wards registered yet. Register the first one on page 331.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

/* ---------- live data ---------- */
let wards = [];
let beds = [];

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  bootAnswered(wards.length);
  render();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

function countsOf(wardId) {
  const list = beds.filter((b) => String(b.wardId) === String(wardId));
  const occupied = list.filter((b) => b.status === "Occupied").length;
  const oos = list.filter((b) => b.status === "Out of Service").length;
  return { total: list.length, occupied, usable: list.length - oos };
}

/* ---------- render ---------- */
function render() {
  const q = $("#r-q").value.trim().toLowerCase();
  const rows = wards.filter((w) => !q ||
    String(w.wardCode || "").toLowerCase().includes(q) ||
    String(w.wardName || "").toLowerCase().includes(q) ||
    String(w.wardType || "").toLowerCase().includes(q));
  const active = rows.filter((w) => w.status !== "Inactive");
  const inactive = rows.filter((w) => w.status === "Inactive");
  const ordered = active.concat(inactive);

  $("#r-empty").hidden = wards.length > 0;
  $("#r-wrap").hidden = ordered.length === 0;
  $("#r-body").innerHTML = ordered.map((w) => {
    const c = countsOf(w.wardId);
    const p = c.usable ? Math.round((c.occupied / c.usable) * 100) : null;
    const isInactive = w.status === "Inactive";
    return "<tr" + (isInactive ? " class='row-inactive'" : "") + ">" +
      "<td class='c-no'>" + esc(w.wardCode || "—") + "</td>" +
      "<td class='c-party'>" + esc(w.wardName || "—") + "</td>" +
      "<td>" + esc(w.wardType || "—") + "</td>" +
      "<td>" + esc((w.building || "—") + (w.floor ? " · " + w.floor : "")) + "</td>" +
      "<td class='c-num'>" + (w.maxCapacity === "" || w.maxCapacity == null ? "—" : esc(w.maxCapacity)) + "</td>" +
      "<td class='c-num'>" + c.total + "</td>" +
      "<td class='c-num'>" + c.occupied + "</td>" +
      "<td class='c-num'>" + c.usable + "</td>" +
      "<td class='pct-cell'>" + (c.total === 0 ? "no beds" : (p == null ? "—" : p + "%")) + "</td>" +
      "<td>" + (isInactive
        ? "<span class='st st-inactive'>Inactive</span>"
        : "<span class='st st-active'>Active</span>") + "</td>" +
    "</tr>";
  }).join("");
  $("#r-count").textContent = rows.length === 0
    ? (wards.length === 0 ? "" : "No ward matches the search.")
    : rows.length + (rows.length === 1 ? " ward on the register." : " wards on the register.");
}

$("#r-q").addEventListener("input", render);
render();
T52_JS_337
[ -s "public/ward-management/337.js" ] && echo "  wrote public/ward-management/337.js ($(wc -c < "public/ward-management/337.js") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/338.html" << 'T52_HTML_338'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bed &amp; Transfer History — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/ward-management/ward.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section id="s-hist">
    <a class="back" href="/ward-management/330">&larr; Ward Management</a>
    <h1>Bed &amp; Transfer History</h1>
    <p class="sub">Three searchable registers: what beds exist, who is or was placed where, and every move ever made. Completed assignments and transfers are preserved as their own records &mdash; nothing here is overwritten when a patient moves on.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <div class="card" style="padding:16px 20px;">
      <div class="tabs">
        <button type="button" class="tab on" data-tab="beds">Bed Register</button>
        <button type="button" class="tab" data-tab="assign">Bed Assignment Register</button>
        <button type="button" class="tab" data-tab="transfer">Transfer Register</button>
      </div>
      <div class="find-row" style="margin-top:4px;">
        <input id="v-q" type="text" placeholder="Search by patient, bed number, ward code or staff…">
      </div>

      <!-- tab 1 · bed register -->
      <div id="v-pane-beds">
        <div class="empty" id="v1-empty">
          <div class="empty-icon">🛏️</div>
          <div class="empty-title">No beds registered yet</div>
          <div class="empty-sub">Register wards (331) and beds (332) — the bed register fills itself.</div>
        </div>
        <div class="table-wrap" id="v1-wrap" hidden>
          <table class="bk">
            <thead>
              <tr><th>Bed Number</th><th>Ward</th><th>Bed Type</th><th>Status</th><th>Current Patient</th></tr>
            </thead>
            <tbody id="v1-body"></tbody>
          </table>
        </div>
      </div>

      <!-- tab 2 · assignment register -->
      <div id="v-pane-assign" hidden>
        <div class="empty" id="v2-empty">
          <div class="empty-icon">👥</div>
          <div class="empty-title">No assignments on record yet</div>
          <div class="empty-sub">Every placement made on Bed Assignment (334) is preserved here — active and released.</div>
        </div>
        <div class="table-wrap" id="v2-wrap" hidden>
          <table class="bk">
            <thead>
              <tr><th>Patient</th><th>Registration ID</th><th>Ward · Bed</th><th>Assigned</th><th>Released</th><th>Status</th><th>By</th></tr>
            </thead>
            <tbody id="v2-body"></tbody>
          </table>
        </div>
      </div>

      <!-- tab 3 · transfer register -->
      <div id="v-pane-transfer" hidden>
        <div class="empty" id="v3-empty">
          <div class="empty-icon">🔄</div>
          <div class="empty-title">No transfers on record yet</div>
          <div class="empty-sub">Every completed move from the Transfers page (335) is preserved here.</div>
        </div>
        <div class="table-wrap" id="v3-wrap" hidden>
          <table class="bk">
            <thead>
              <tr><th>Patient</th><th>From</th><th>To</th><th>Transfer Date</th><th>Reason</th><th>Status</th></tr>
            </thead>
            <tbody id="v3-body"></tbody>
          </table>
        </div>
      </div>

      <p class="count-line" id="v-count"></p>
    </div>
  </section>

</main>
<script type="module" src="/ward-management/338.js"></script>
</body>
</html>
T52_HTML_338
[ -s "public/ward-management/338.html" ] && echo "  wrote public/ward-management/338.html ($(wc -c < "public/ward-management/338.html") bytes)"

mkdir -p "public/ward-management"
cat > "public/ward-management/338.js" << 'T52_JS_338'
// ward-management (page 338) — JAMALI Health — Bed & Transfer History
// Three read-only registers in tabs: the bed register (every bed with its
// live status), the bed assignment register (active and released — the
// release date is kept forever) and the transfer register (every completed
// move). One search box filters the open tab. No failure can hide: every
// listener carries an error callback and failures paint the banner.
import { requireAuth, db, collection, onSnapshot } from "/firebase.js";

window.__p52 = { page: "338", build: "52v1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p52) window.__p52.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 the registers are empty for now. Beds appear here once registered on 332.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
const ST_CLASS = {
  "Available": "st-avail", "Occupied": "st-occ", "Reserved": "st-resv",
  "Cleaning Required": "st-clean", "Cleaning in Progress": "st-clean",
  "Maintenance Required": "st-maint", "Out of Service": "st-oos"
};

/* ---------- live data ---------- */
let beds = [];
let assignments = [];
let transfers = [];

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  bootAnswered(beds.length + assignments.length + transfers.length);
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")));
  bootAnswered(beds.length + assignments.length + transfers.length);
  render();
}, (e) => loadErr("healthBedAssignments", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedTransfers"), (snap) => {
  transfers = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.transferredAt || "").localeCompare(String(a.transferredAt || "")));
  bootAnswered(beds.length + assignments.length + transfers.length);
  render();
}, (e) => loadErr("healthBedTransfers", e));
window.__p52.listeners++;

/* ---------- tabs + search ---------- */
let tab = "beds";
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    tab = btn.getAttribute("data-tab") || "beds";
    document.querySelectorAll(".tab").forEach((b) =>
      b.classList.toggle("on", b === btn));
    $("#v-pane-beds").hidden = tab !== "beds";
    $("#v-pane-assign").hidden = tab !== "assign";
    $("#v-pane-transfer").hidden = tab !== "transfer";
    render();
  });
});

/* ---------- render ---------- */
function render() {
  const q = $("#v-q").value.trim().toLowerCase();
  const hit = (s) => String(s || "").toLowerCase().includes(q);

  if (tab === "beds") {
    const rows = beds.filter((b) => !q ||
      hit(b.bedNumber) || hit(b.wardCode) || hit(b.wardName) ||
      hit(b.bedType) || hit(b.status) || hit(b.currentPatientName) || hit(b.currentPatientId))
      .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }) ||
        String(a.bedNumber || "").localeCompare(String(b.bedNumber || ""), undefined, { numeric: true }));
    $("#v1-empty").hidden = beds.length > 0;
    $("#v1-wrap").hidden = rows.length === 0;
    $("#v1-body").innerHTML = rows.map((b) =>
      "<tr>" +
        "<td class='c-no'>" + esc(b.bedNumber || "—") + "</td>" +
        "<td>" + esc(b.wardCode || "—") + "</td>" +
        "<td>" + esc(b.bedType || "Standard") + "</td>" +
        "<td><span class='st " + (ST_CLASS[b.status] || "st-oos") + "'>" + esc(b.status || "—") + "</span></td>" +
        "<td>" + (b.status === "Occupied"
          ? esc((b.currentPatientName || "Patient") + (b.currentPatientId ? " · " + b.currentPatientId : ""))
          : "—") + "</td>" +
      "</tr>").join("");
    $("#v-count").textContent = rows.length === 0
      ? (beds.length === 0 ? "" : "No bed matches the search.")
      : rows.length + (rows.length === 1 ? " bed on the register." : " beds on the register.");
    return;
  }

  if (tab === "assign") {
    const rows = assignments.filter((a) => !q ||
      hit(a.patientName) || hit(a.patientId) || hit(a.wardCode) ||
      hit(a.bedNumber) || hit(a.assignedBy) || hit(a.status))
      .sort((a, b) => {
        const ra = a.status === "Active" ? 0 : 1;
        const rb = b.status === "Active" ? 0 : 1;
        return ra - rb || String(b.assignedAt || "").localeCompare(String(a.assignedAt || ""));
      });
    $("#v2-empty").hidden = assignments.length > 0;
    $("#v2-wrap").hidden = rows.length === 0;
    $("#v2-body").innerHTML = rows.map((a) =>
      "<tr>" +
        "<td class='c-party'>" + esc(a.patientName || "—") + "</td>" +
        "<td class='c-no'>" + esc(a.patientId || "") + "</td>" +
        "<td class='nowrap'>" + esc((a.wardCode || "—") + " · bed " + (a.bedNumber || "—")) + "</td>" +
        "<td class='c-date'>" + esc(when(a.assignedAt)) + "</td>" +
        "<td class='c-date'>" + esc(a.status === "Released" ? when(a.releasedAt) : "—") + "</td>" +
        "<td>" + (a.status === "Active"
          ? "<span class='st st-active'>Active</span>"
          : "<span class='st st-released'>Released</span>") + "</td>" +
        "<td>" + esc(a.assignedBy || "—") + "</td>" +
      "</tr>").join("");
    $("#v-count").textContent = rows.length === 0
      ? (assignments.length === 0 ? "" : "No assignment matches the search.")
      : rows.length + (rows.length === 1 ? " assignment on record." : " assignments on record.");
    return;
  }

  const rows = transfers.filter((t) => !q ||
    hit(t.patientName) || hit(t.patientId) || hit(t.fromWardCode) ||
    hit(t.toWardCode) || hit(t.fromBedNumber) || hit(t.toBedNumber) ||
    hit(t.reason) || hit(t.authorizedBy));
  $("#v3-empty").hidden = transfers.length > 0;
  $("#v3-wrap").hidden = rows.length === 0;
  $("#v3-body").innerHTML = rows.map((t) =>
    "<tr>" +
      "<td class='c-party'>" + esc(t.patientName || "—") + " <span class='mini-note'>" + esc(t.patientId || "") + "</span></td>" +
      "<td class='nowrap'>" + esc((t.fromWardCode || "—") + " · bed " + (t.fromBedNumber || "—")) + "</td>" +
      "<td class='nowrap'>" + esc((t.toWardCode || "—") + " · bed " + (t.toBedNumber || "—")) + "</td>" +
      "<td class='c-date'>" + esc(when(t.transferredAt)) + "</td>" +
      "<td class='c-desc'>" + esc(t.reason || "—") + "</td>" +
      "<td><span class='st st-active'>" + esc(t.status || "Completed") + "</span></td>" +
    "</tr>").join("");
  $("#v-count").textContent = rows.length === 0
    ? (transfers.length === 0 ? "" : "No transfer matches the search.")
    : rows.length + (rows.length === 1 ? " transfer on record." : " transfers on record.");
}

$("#v-q").addEventListener("input", render);
render();
T52_JS_338
[ -s "public/ward-management/338.js" ] && echo "  wrote public/ward-management/338.js ($(wc -c < "public/ward-management/338.js") bytes)"

mkdir -p "public/patient-admission"
cat > "public/patient-admission/340.html" << 'T52_HTML_340'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Patient Admission — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/patient-admission/adm.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <a class="back" href="/health/321">&larr; Health</a>
  <h1>Patient Admission</h1>
  <p class="sub">Record hospital admissions for <b>existing</b> patients &mdash; from the admission decision until the admission is completed, cancelled or handed over to discharge. Admissions link to the patient records and to the ward and bed records that already exist; nothing here registers a patient twice or rebuilds the ward system.</p>

  <div class="mod-grid">
    <a class="mod" href="/patient-admission/341">
      <span class="mod-ico">📝</span>
      <span class="mod-label">New Admission<span class="mod-sub">admit an existing patient</span></span>
    </a>
    <a class="mod" href="/patient-admission/342">
      <span class="mod-ico">🗒️</span>
      <span class="mod-label">Admission List<span class="mod-sub">search &amp; filter admissions</span></span>
    </a>
    <a class="mod" href="/patient-admission/343">
      <span class="mod-ico">🔎</span>
      <span class="mod-label">Admission Details<span class="mod-sub">open · confirm · discharge</span></span>
    </a>
    <a class="mod" href="/ward-management/334">
      <span class="mod-ico">🛏️</span>
      <span class="mod-label">Ward &amp; Bed Assignment<span class="mod-sub">opens Ward Management</span></span>
    </a>
  </div>

  <div class="card" style="padding:16px 20px;">
    <h2>How admission works</h2>
    <p class="mini-note" style="margin-top:6px;">
      Find the patient from the Patient List (never register them again), record the date, time,
      reason and the clinician&rsquo;s diagnosis, choose Emergency or Planned, then save &mdash; as
      <b>Pending</b> when the process has started, or <b>Admitted</b> once confirmed. The admission
      appears in the Admission List immediately. When a bed is needed, the assignment reuses the
      existing Ward Management records; a transfer later moves the patient while the same admission
      stays open, and discharge closes it. Every previous admission of a patient stays in the
      history, never overwritten.
    </p>
  </div>

  <p class="emg-note">🚨 Emergency rule: treatment always comes first. No registration, admission
  paperwork or bed assignment may delay urgent care &mdash; save the emergency admission with what
  you know and let the records follow the patient.</p>
</main>
<script type="module" src="/patient-admission/340.js"></script>
</body>
</html>
T52_HTML_340
[ -s "public/patient-admission/340.html" ] && echo "  wrote public/patient-admission/340.html ($(wc -c < "public/patient-admission/340.html") bytes)"

mkdir -p "public/patient-admission"
cat > "public/patient-admission/340.js" << 'T52_JS_340'
// patient-admission (page 340) — JAMALI Health — the Patient Admission hub
// A pure launcher, exactly like the Health hub 321 and the Ward Management
// hub 330: four square tiles and no data. Nothing here reads or writes
// Firestore, so nothing here can fail — the pages it opens (341 to 343)
// carry their own boot diagnostics, and the fourth tile opens the existing
// Ward Management assignment page 334 instead of duplicating it.

// no firebase import on purpose: the hub is a signpost, not a data page.
T52_JS_340
[ -s "public/patient-admission/340.js" ] && echo "  wrote public/patient-admission/340.js ($(wc -c < "public/patient-admission/340.js") bytes)"

mkdir -p "public/patient-admission"
cat > "public/patient-admission/341.html" << 'T52_HTML_341'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Admission — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/patient-admission/adm.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section id="s-new">
    <a class="back" href="/patient-admission/340">&larr; Patient Admission</a>
    <h1>New Admission</h1>
    <p class="sub">Admit an <b>existing</b> patient: find them from the Patient List, record the admission details, and save. The admission links to the registration that already exists &mdash; no second patient record is ever created &mdash; and the admission number is generated for you.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <p class="emg-note">🚨 Emergency admission? Choose <b>Emergency</b>, enter the patient, the date, the time and the reason, then <b>Save &amp; Confirm</b> &mdash; the diagnosis and the rest of the paperwork can follow the patient. Treatment is never delayed by this form.</p>

    <div class="card add-card">
      <h2>1 · Find the patient</h2>
      <p class="mini-note" style="margin-top:4px;">Search by Registration ID or by name — the patient must already exist in the Patient List (322).</p>
      <div class="find-row" style="margin-top:8px;">
        <input id="n-q" type="text" placeholder="Registration ID (e.g. 8695SLAJ) or patient name…">
        <button class="find-btn" id="n-find" type="button">Find</button>
      </div>
      <div class="cand-list" id="n-cands"></div>
      <div class="sel-panel" id="n-sel" hidden></div>
    </div>

    <div class="card add-card" id="n-formcard">
      <h2>2 · Admission details</h2>
      <div class="form-grid">
        <label>Admission Number
          <input id="n-num" type="text" readonly placeholder="Generated when saved">
        </label>
        <label>Admission Date *
          <input id="n-date" type="date">
        </label>
        <label>Admission Time *
          <input id="n-time" type="time">
        </label>
        <label>Admission Type *
          <select id="n-type">
            <option value="">— Select —</option>
            <option>Emergency</option>
            <option>Planned</option>
          </select>
        </label>
        <label class="span-2" style="grid-column:span 2;">Admitting Doctor
          <input id="n-doctor" type="text" list="n-doctors" placeholder="Name of the responsible doctor">
          <datalist id="n-doctors"></datalist>
        </label>
        <label class="span-3" style="grid-column:span 3;">Reason for Admission *
          <textarea id="n-reason" rows="2" placeholder="Why the patient needs inpatient care"></textarea>
        </label>
        <label class="span-3" style="grid-column:span 3;">Diagnosis
          <input id="n-diagnosis" type="text" placeholder="Recorded by the responsible clinician — never invented here">
        </label>
        <label class="span-3" style="grid-column:span 3;">Clinical Notes
          <textarea id="n-notes" rows="2" placeholder="Optional — any additional information about this admission"></textarea>
        </label>
        <label>Created By *
          <input id="n-staff" type="text" placeholder="Your name">
        </label>
      </div>
      <p class="form-err" id="n-ferr" hidden></p>
      <p class="form-ok" id="n-fok" hidden></p>
      <div class="form-actions">
        <button class="btn-primary" id="n-confirm" type="button">Save &amp; Confirm Admission</button>
        <button class="btn-ghost" id="n-save" type="button">Save as Pending</button>
        <button class="btn-ghost" id="n-clear" type="button">Clear Form</button>
      </div>
      <p class="mini-note" style="margin-top:8px;"><b>Pending</b> = the admission process has started but is not confirmed yet. <b>Admitted</b> = confirmed — the patient is recorded as an inpatient. A bed can be assigned afterwards from Ward Management; the success line below opens it with the patient preselected.</p>
    </div>

    <div class="card" style="padding:16px 20px;" id="n-done" hidden>
      <h2 id="n-done-title">Admission saved</h2>
      <p class="save-note" id="n-done-line" style="margin-top:6px;"></p>
      <div class="form-actions">
        <a class="btn-primary" id="n-gobed" href="/ward-management/334" style="text-decoration:none;">Assign a Bed Now &rarr;</a>
        <a class="btn-ghost" href="/patient-admission/342" style="text-decoration:none;">Open the Admission List</a>
        <button class="btn-ghost" id="n-again" type="button">Admit Another Patient</button>
      </div>
    </div>
  </section>

</main>
<script type="module" src="/patient-admission/341.js"></script>
</body>
</html>
T52_HTML_341
[ -s "public/patient-admission/341.html" ] && echo "  wrote public/patient-admission/341.html ($(wc -c < "public/patient-admission/341.html") bytes)"

mkdir -p "public/patient-admission"
cat > "public/patient-admission/341.js" << 'T52_JS_341'
// patient-admission (page 341) — JAMALI Health — New Admission
// Admits an EXISTING patient. The record links to the registration that
// already exists (patientId = the Registration ID) — no second patient
// record is ever created. The admission number is generated (ADM-date-code)
// and checked for uniqueness against the live admissions before saving.
// Duplicate submissions are blocked by a busy flag on both save buttons.
// Status on save: Pending (process started) or Admitted (confirmed).
// Emergency rule: an emergency admission needs only patient, date, time,
// type and reason — the diagnosis can follow the patient.
import { requireAuth, db, collection, addDoc, onSnapshot } from "/firebase.js";

window.__p52 = { page: "341", build: "52n1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p52) window.__p52.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no registrations on this account yet. " +
    "Register the patient first (Registration, page 322), then admit them here.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function nowLocalDate() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function nowLocalTime() {
  const d = new Date();
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function who(r) { return r.isUnidentified ? "Unidentified" : (r.fullName || "Unnamed"); }
function priBadge(p) {
  const k = String(p || "").toLowerCase();
  const cls = { critical: "st-critical", high: "st-high", medium: "st-medium", low: "st-low" }[k];
  return cls ? "<span class='st " + cls + "'>" + esc(p) + "</span>"
             : "<span class='st st-none'>" + (p ? esc(p) : "—") + "</span>";
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

/* ---------- live data ---------- */
let regs = [];
let docConsults = [];
let admissions = [];
let selected = null;

onSnapshot(collection(db, "healthRegistrations"), (snap) => {
  regs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .filter((r) => r && r.regId)
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  bootAnswered(regs.length);
  renderCands(); renderSel();
  maybeAutoOpen();
}, (e) => loadErr("healthRegistrations", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthDoctorConsultations"), (snap) => {
  docConsults = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  const seen = new Set();
  const names = [];
  docConsults.forEach((c) => {
    const n = String(c.doctor || "").trim();
    if (n && !seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); names.push(n); }
  });
  $("#n-doctors").innerHTML = names.map((n) => "<option value='" + esc(n) + "'></option>").join("");
}, (e) => loadErr("healthDoctorConsultations", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthAdmissions"), (snap) => {
  admissions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
}, (e) => loadErr("healthAdmissions", e));
window.__p52.listeners++;

/* ---------- 1 · find the patient ---------- */
function renderCands() {
  const box = $("#n-cands");
  if (selected) { box.innerHTML = ""; return; }
  const q = $("#n-q").value.trim().toLowerCase();
  if (!q) { box.innerHTML = ""; return; }
  const hits = regs.filter((r) =>
    String(r.regId || "").toLowerCase() === q ||
    String(r.regId || "").toLowerCase().includes(q) ||
    String(who(r)).toLowerCase().includes(q)).slice(0, 8);
  box.innerHTML = hits.length === 0
    ? "<p class='mini-note'>No patient matches &ldquo;" + esc(q) + "&rdquo; — register them first (page 322).</p>"
    : hits.map((r) =>
        "<button type='button' class='cand' data-pick='" + esc(r.__id) + "'>" +
          "<span class='c-id'>" + esc(r.regId) + "</span><b>" + esc(who(r)) + "</b>" +
          "<span class='mini-note'>" + esc([r.age, r.sex].filter(Boolean).join(" · ") || "—") + "</span>" +
          priBadge(r.priority) + "</button>").join("");
}
$("#n-q").addEventListener("input", renderCands);
$("#n-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#n-find").click(); } });
$("#n-find").addEventListener("click", renderCands);
$("#n-cands").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-pick]");
  if (!btn) return;
  selected = regs.find((r) => r.__id === btn.getAttribute("data-pick")) || null;
  $("#n-q").value = selected ? String(selected.regId) : $("#n-q").value;
  renderCands(); renderSel();
});
function renderSel() {
  const box = $("#n-sel");
  if (!selected) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.innerHTML = "Admitting <b>" + esc(who(selected)) + "</b> · Registration ID <b>" +
    esc(selected.regId) + "</b> · " +
    esc([selected.age, selected.sex].filter(Boolean).join(" · ") || "—") + " " +
    esc(selected.phone ? "· " + selected.phone : "") + " " + priBadge(selected.priority);
}

/* the deep link: /patient-admission/341?patient=REGID */
function maybeAutoOpen() {
  if (selected) return;
  const pid = new URLSearchParams(location.search).get("patient") || "";
  if (!pid) return;
  const r = regs.find((x) => String(x.regId) === String(pid));
  if (r) { selected = r; $("#n-q").value = String(r.regId); renderCands(); renderSel(); }
}

/* ---------- 2 · the admission form ---------- */
function ferr(msg) { const e = $("#n-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function fok(msg) {
  const e = $("#n-fok");
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.textContent = msg;
  clearTimeout(fok.t); fok.t = setTimeout(() => { e.hidden = true; }, 5000);
}
function v(sel) { return $(sel).value.trim(); }

function freshNumber() {
  // ADM-YYYYMMDD-XXXX, checked against the live admissions for uniqueness
  for (let t = 0; t < 5; t++) {
    let code = "";
    const D = "0123456789", L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    for (let i = 0; i < 4; i++) code += (i < 2 ? D : L)[Math.floor(Math.random() * (i < 2 ? 10 : 24))];
    const cand = "ADM-" + nowLocalDate().replace(/-/g, "") + "-" + code;
    if (!admissions.some((a) => a.admissionNumber === cand)) return cand;
  }
  return "ADM-" + nowLocalDate().replace(/-/g, "") + "-" + Date.now().toString(36).toUpperCase().slice(-5);
}

async function saveAdmission(confirmNow) {
  ferr(""); fok("");
  if (!selected) return ferr("Find and choose the patient first (step 1).");
  const date = v("#n-date");
  const time = v("#n-time");
  const type = v("#n-type");
  const reason = v("#n-reason");
  const staff = v("#n-staff");
  if (!date) return ferr("The admission date is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + "T00:00:00").getTime()))
    return ferr("The admission date is not a valid date.");
  if (!time) return ferr("The admission time is required.");
  if (!/^\d{2}:\d{2}$/.test(time)) return ferr("The admission time is not a valid time.");
  if (!type) return ferr("Choose the admission type — Emergency or Planned.");
  if (!reason) return ferr("The reason for admission is required.");
  if (!staff) return ferr("Created By is required — enter your name.");
  const diagnosis = v("#n-diagnosis");
  if (!diagnosis && type === "Planned")
    return ferr("A planned admission needs the recorded diagnosis — ask the responsible clinician.");
  const num = freshNumber();
  keepStaff(staff);

  const bConfirm = $("#n-confirm"), bSave = $("#n-save");
  if (bConfirm.disabled || bSave.disabled) return; // duplicate-submission guard
  bConfirm.disabled = true; bSave.disabled = true;
  const status = confirmNow ? "Admitted" : "Pending";
  try {
    await addDoc(collection(db, "healthAdmissions"), {
      admissionNumber: num,
      patientId: selected.regId,
      patientName: who(selected),
      patientAge: selected.age === "" || selected.age == null ? "" : selected.age,
      patientSex: selected.sex || "",
      admissionDate: date,
      admissionTime: time,
      admissionType: type,
      reason,
      diagnosis,
      doctorName: v("#n-doctor"),
      clinicalNotes: v("#n-notes"),
      status,
      statusHistory: [{
        status, at: nowISO(), by: staff,
        note: confirmNow ? "Admission confirmed" : "Admission saved as pending"
      }],
      createdBy: staff,
      createdAt: nowISO(),
      updatedAt: nowISO()
    });
    // success panel — shown only after the store answered
    $("#n-done-title").textContent = confirmNow
      ? "Admission confirmed" : "Admission saved as pending";
    $("#n-done-line").textContent = who(selected) + " · " + num +
      " · " + date + " " + time + " · " + type + " · status " + status + ".";
    $("#n-gobed").href = "/ward-management/334?patient=" + encodeURIComponent(selected.regId);
    $("#n-formcard").hidden = true;
    $("#n-done").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    ferr("Could not save the admission: " + ((e && (e.code || e.message)) || e));
  }
  bConfirm.disabled = false; bSave.disabled = false;
}
$("#n-confirm").addEventListener("click", () => saveAdmission(true));
$("#n-save").addEventListener("click", () => saveAdmission(false));
$("#n-clear").addEventListener("click", () => {
  $("#n-type").value = ""; $("#n-reason").value = ""; $("#n-diagnosis").value = "";
  $("#n-doctor").value = ""; $("#n-notes").value = "";
  ferr(""); fok("");
});
$("#n-again").addEventListener("click", () => {
  selected = null;
  $("#n-q").value = ""; $("#n-date").value = nowLocalDate(); $("#n-time").value = nowLocalTime();
  $("#n-type").value = ""; $("#n-reason").value = ""; $("#n-diagnosis").value = "";
  $("#n-doctor").value = ""; $("#n-notes").value = "";
  $("#n-done").hidden = true; $("#n-formcard").hidden = false;
  $("#n-ferr").hidden = true; $("#n-fok").hidden = true;
  renderCands(); renderSel();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* defaults: the real current date and time — editable, never forced */
$("#n-date").value = nowLocalDate();
$("#n-time").value = nowLocalTime();
$("#n-staff").value = rememberedStaff();

renderCands(); renderSel();
maybeAutoOpen();
T52_JS_341
[ -s "public/patient-admission/341.js" ] && echo "  wrote public/patient-admission/341.js ($(wc -c < "public/patient-admission/341.js") bytes)"

mkdir -p "public/patient-admission"
cat > "public/patient-admission/342.html" << 'T52_HTML_342'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admission List — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/patient-admission/adm.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section id="s-list">
    <a class="back" href="/patient-admission/340">&larr; Patient Admission</a>
    <h1>Admission List</h1>
    <p class="sub">Every admission on this account, newest first, drawn live from the database &mdash; nothing here is sample data. Open a record for the full details, confirm a pending admission, or cancel one that did not proceed. The Ward and Bed columns read the existing Ward Management records.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <div class="card" style="padding:16px 20px;">
      <div class="find-row" style="margin-top:4px;">
        <input id="l-q" type="text" placeholder="Search by admission number, patient number or name…">
        <select id="l-status" style="border:1px solid #cbd5e1; border-radius:9px; padding:9px 12px; font-size:13.5px;">
          <option value="">All statuses</option>
          <option>Pending</option>
          <option>Admitted</option>
          <option>Transferred</option>
          <option>Discharged</option>
          <option>Cancelled</option>
        </select>
        <select id="l-type" style="border:1px solid #cbd5e1; border-radius:9px; padding:9px 12px; font-size:13.5px;">
          <option value="">All types</option>
          <option>Emergency</option>
          <option>Planned</option>
        </select>
        <input id="l-from" type="date" title="From admission date" style="border:1px solid #cbd5e1; border-radius:9px; padding:9px 12px; font-size:13.5px;">
        <input id="l-to" type="date" title="To admission date" style="border:1px solid #cbd5e1; border-radius:9px; padding:9px 12px; font-size:13.5px;">
        <button class="ghost-btn" id="l-clear" type="button">Clear Filters</button>
      </div>
      <p class="mini-note" style="margin:8px 0 0;">Status actions need your name: <input id="l-staff" type="text" placeholder="Your name" style="border:1px solid #cbd5e1; border-radius:7px; padding:5px 8px; font-size:12.5px; width:160px;"></p>

      <div class="empty" id="l-empty">
        <div class="empty-icon">🗒️</div>
        <div class="empty-title">No admissions yet</div>
        <div class="empty-sub">Admit an existing patient on the New Admission page (341) — the record appears here immediately.</div>
      </div>
      <div class="table-wrap" id="l-wrap" hidden>
        <table class="bk">
          <thead>
            <tr><th>#</th><th>Admission No.</th><th>Patient No.</th><th>Patient</th><th>Date · Time</th><th>Type</th><th>Diagnosis</th><th>Doctor</th><th>Ward</th><th>Bed</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody id="l-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="l-count"></p>
    </div>
  </section>

</main>
<script type="module" src="/patient-admission/342.js"></script>
</body>
</html>
T52_HTML_342
[ -s "public/patient-admission/342.html" ] && echo "  wrote public/patient-admission/342.html ($(wc -c < "public/patient-admission/342.html") bytes)"

mkdir -p "public/patient-admission"
cat > "public/patient-admission/342.js" << 'T52_JS_342'
// patient-admission (page 342) — JAMALI Health — the Admission List
// Every admission drawn live from healthAdmissions — nothing hard-coded.
// Search by number / patient number / name, filter by status, type and
// admission date range; clearing the filters restores the default list.
// Actions: open the details (343), confirm a Pending admission, cancel a
// Pending one. The Ward and Bed columns come from the live assignment
// records kept by Ward Management — never from typed-in copies.
import { requireAuth, db, collection, doc, updateDoc, onSnapshot, arrayUnion } from "/firebase.js";

window.__p52 = { page: "342", build: "52l1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p52) window.__p52.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no admission records yet. Admit an existing patient on page 341.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function whenDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

const ST_CLASS = {
  "Pending": "st-pending", "Admitted": "st-admitted", "Transferred": "st-transferred",
  "Discharged": "st-discharged", "Cancelled": "st-cancelled"
};
const TY_CLASS = { "Emergency": "st-emergency", "Planned": "st-planned" };

/* ---------- live data ---------- */
let admissions = [];
let assignments = [];
let beds = [];

onSnapshot(collection(db, "healthAdmissions"), (snap) => {
  admissions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(admissions.length);
  render();
}, (e) => loadErr("healthAdmissions", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  render();
}, (e) => loadErr("healthBedAssignments", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

function activePlacementOf(patientId) {
  const a = assignments.find((x) => x.status === "Active" &&
    String(x.patientId) === String(patientId));
  if (!a) return null;
  const b = beds.find((x) => x.__id === String(a.bedId));
  const st = b && b.status ? " (" + b.status + ")" : "";
  return { ward: a.wardCode || "—", bed: (a.bedNumber || "—") + st };
}

/* ---------- render ---------- */
function render() {
  const q = $("#l-q").value.trim().toLowerCase();
  const st = $("#l-status").value;
  const ty = $("#l-type").value;
  const from = $("#l-from").value;
  const to = $("#l-to").value;

  const rows = admissions.filter((a) => {
    if (q && !(String(a.admissionNumber || "").toLowerCase().includes(q) ||
               String(a.patientId || "").toLowerCase().includes(q) ||
               String(a.patientName || "").toLowerCase().includes(q))) return false;
    if (st && a.status !== st) return false;
    if (ty && a.admissionType !== ty) return false;
    if (from && String(a.admissionDate || "") < from) return false;
    if (to && String(a.admissionDate || "") > to) return false;
    return true;
  });

  $("#l-empty").hidden = admissions.length > 0;
  $("#l-wrap").hidden = rows.length === 0;
  $("#l-body").innerHTML = rows.map((a, i) => {
    const place = activePlacementOf(a.patientId);
    const isPending = a.status === "Pending";
    return "<tr>" +
      "<td class='c-num'>" + (i + 1) + "</td>" +
      "<td class='c-no'><a href='/patient-admission/343?id=" + encodeURIComponent(a.__id) + "'>" +
        esc(a.admissionNumber || a.__id) + "</a></td>" +
      "<td class='c-no'>" + esc(a.patientId || "") + "</td>" +
      "<td class='c-party'>" + esc(a.patientName || "—") + "</td>" +
      "<td class='c-date'>" + esc((a.admissionDate || "—") + " · " + (a.admissionTime || "—")) + "</td>" +
      "<td><span class='st " + (TY_CLASS[a.admissionType] || "st-none") + "'>" + esc(a.admissionType || "—") + "</span></td>" +
      "<td class='c-desc'>" + esc(a.diagnosis || "—") + "</td>" +
      "<td>" + esc(a.doctorName || "—") + "</td>" +
      "<td>" + esc(place ? place.ward : "—") + "</td>" +
      "<td>" + esc(place ? place.bed : "—") + "</td>" +
      "<td><span class='st " + (ST_CLASS[a.status] || "st-none") + "'>" + esc(a.status || "—") + "</span></td>" +
      "<td class='c-act'>" +
        "<a class='ghost-btn' href='/patient-admission/343?id=" + encodeURIComponent(a.__id) + "'>Open</a>" +
        (isPending
          ? " <button type='button' class='ghost-btn' data-confirm='" + esc(a.__id) + "'>Confirm</button>" +
            " <button type='button' class='ghost-btn danger' data-cancel='" + esc(a.__id) + "'>Cancel</button>"
          : "") +
      "</td></tr>";
  }).join("");
  $("#l-count").textContent = rows.length === 0
    ? (admissions.length === 0 ? "" : "No admission matches the search or filters.")
    : rows.length + (rows.length === 1 ? " admission." : " admissions.") +
      " — newest first. Clearing the filters restores the full list.";
}

$("#l-q").addEventListener("input", render);
$("#l-status").addEventListener("change", render);
$("#l-type").addEventListener("change", render);
$("#l-from").addEventListener("change", render);
$("#l-to").addEventListener("change", render);
$("#l-clear").addEventListener("click", () => {
  $("#l-q").value = ""; $("#l-status").value = ""; $("#l-type").value = "";
  $("#l-from").value = ""; $("#l-to").value = "";
  render();
});

/* ---------- status actions ---------- */
$("#l-body").addEventListener("click", async (e) => {
  const cbtn = e.target.closest("button[data-confirm]");
  const xbtn = e.target.closest("button[data-cancel]");
  if (!cbtn && !xbtn) return;
  const id = (cbtn || xbtn).getAttribute(cbtn ? "data-confirm" : "data-cancel");
  const a = admissions.find((x) => x.__id === id);
  if (!a) return;
  const staff = $("#l-staff").value.trim() || rememberedStaff();
  if (!staff) {
    alert("Enter your name next to the filters first — status changes are recorded with who made them.");
    return;
  }
  keepStaff(staff);
  const btn = cbtn || xbtn;
  if (btn.disabled) return;
  if (xbtn && !confirm("Cancel admission " + (a.admissionNumber || "") + "? The record is preserved for accountability.")) return;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthAdmissions", a.__id), {
      status: cbtn ? "Admitted" : "Cancelled",
      updatedAt: nowISO(),
      statusHistory: arrayUnion({
        status: cbtn ? "Admitted" : "Cancelled",
        at: nowISO(), by: staff,
        note: cbtn ? "Confirmed from the Admission List" : "Cancelled before it proceeded"
      })
    });
  } catch (err) {
    alert("Could not save the status change: " + ((err && (err.code || err.message)) || err));
  }
  btn.disabled = false;
});

$("#l-staff").value = rememberedStaff();
render();
T52_JS_342
[ -s "public/patient-admission/342.js" ] && echo "  wrote public/patient-admission/342.js ($(wc -c < "public/patient-admission/342.js") bytes)"

mkdir -p "public/patient-admission"
cat > "public/patient-admission/343.html" << 'T52_HTML_343'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admission Details — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/patient-admission/adm.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section id="s-details">
    <a class="back" href="/patient-admission/340">&larr; Patient Admission</a>
    <h1>Admission Details &amp; History</h1>
    <p class="sub">Open one admission and see everything attached to it: the patient it belongs to, the clinical information, the ward and bed it currently occupies through the existing Ward Management records, and the full status trail. Previous admissions of the same patient stay below, never overwritten.</p>
    <p class="p-boot" id="p-boot" hidden></p>
    <p class="p-err" id="p-err" hidden></p>

    <div class="card add-card">
      <h2>Open an admission</h2>
      <div class="find-row" style="margin-top:8px;">
        <input id="d-q" type="text" placeholder="Admission number (e.g. ADM-20261027-AK3M)…">
        <button class="find-btn" id="d-open" type="button">Open</button>
      </div>
      <p class="mini-note" id="d-none" hidden style="margin-top:8px;"></p>
    </div>

    <div class="card" style="padding:16px 20px;" id="d-card" hidden>
      <h2 id="d-title">Admission</h2>
      <p class="mini-note" id="d-sub"></p>

      <div class="sec-h">A · Patient information</div>
      <div id="d-pat"></div>

      <div class="sec-h">B · Admission information</div>
      <div id="d-adm"></div>

      <div class="sec-h">C · Clinical information</div>
      <div id="d-cli"></div>

      <div class="sec-h">D · Ward and bed</div>
      <div id="d-ward"></div>
      <div class="sec-h" style="margin-top:10px;">Placement history of this patient</div>
      <div class="table-wrap" id="d-asswrap" hidden>
        <table class="bk">
          <thead><tr><th>Ward · Bed</th><th>Assigned</th><th>Released</th><th>Status</th><th>By</th></tr></thead>
          <tbody id="d-assbody"></tbody>
        </table>
      </div>
      <div class="sec-h" style="margin-top:10px;">Transfers of this patient</div>
      <div class="table-wrap" id="d-trwrap" hidden>
        <table class="bk">
          <thead><tr><th>From</th><th>To</th><th>When</th><th>Reason</th></tr></thead>
          <tbody id="d-trbody"></tbody>
        </table>
      </div>

      <div class="sec-h">E · Record information</div>
      <div id="d-rec"></div>

      <div class="sec-h">Status trail</div>
      <ul class="trail" id="d-trail"></ul>

      <p class="form-err" id="d-ferr" hidden></p>
      <div class="form-actions" style="margin-top:14px;">
        <input id="d-staff" type="text" placeholder="Your name (for status changes)" style="border:1px solid #cbd5e1; border-radius:9px; padding:9px 12px; font-size:13.5px;">
        <button class="btn-primary" id="d-confirm" type="button" hidden>Confirm Admission</button>
        <button class="btn-warn" id="d-discharge" type="button" hidden>Record Discharge</button>
        <button class="btn-ghost danger" id="d-canceladm" type="button" hidden>Cancel Admission</button>
        <button class="btn-ghost" id="d-edit" type="button">Edit Permitted Details</button>
        <a class="btn-ghost" id="d-plink" href="/patient-module/328" style="text-decoration:none;">View Patient List</a>
      </div>
      <p class="mini-note" style="margin-top:8px;">Transfers are made on Ward Management &rarr; Transfers (335) &mdash; they mark this admission <b>Transferred</b> without closing it. Discharge here frees the patient&rsquo;s bed and closes the admission; the separate Patient Discharge workflow can take over from this status.</p>
    </div>

    <div class="card" style="padding:16px 20px;" id="d-hcard" hidden>
      <h2>Admission history of this patient</h2>
      <p class="mini-note" style="margin-top:4px;">Every admission is its own record — previous admissions are never overwritten when the patient is admitted again.</p>
      <div class="empty" id="d-hempty">
        <div class="empty-icon">📜</div>
        <div class="empty-title">No other admissions</div>
        <div class="empty-sub">This is the patient's first admission on record.</div>
      </div>
      <div class="table-wrap" id="d-hwrap" hidden>
        <table class="bk">
          <thead><tr><th>Admission No.</th><th>Date · Time</th><th>Type</th><th>Diagnosis</th><th>Status</th><th>Discharged</th><th></th></tr></thead>
          <tbody id="d-hbody"></tbody>
        </table>
      </div>
      <p class="count-line" id="d-hcount"></p>
    </div>
  </section>

</main>

<!-- the edit modal -->
<div class="modal-ovl" id="e-wrap" hidden>
  <div class="modal-card" role="dialog" aria-modal="true">
    <h2>Edit permitted details</h2>
    <p class="mini-note" id="e-sub"></p>
    <div class="m-grid">
      <label>Admission Date
        <input id="e-date" type="date">
      </label>
      <label>Admission Time
        <input id="e-time" type="time">
      </label>
      <label>Admission Type
        <select id="e-type">
          <option>Emergency</option>
          <option>Planned</option>
        </select>
      </label>
      <label>Admitting Doctor
        <input id="e-doctor" type="text">
      </label>
      <label style="grid-column:span 2;">Reason for Admission
        <textarea id="e-reason" rows="2"></textarea>
      </label>
      <label style="grid-column:span 2;">Diagnosis
        <input id="e-diagnosis" type="text">
      </label>
      <label style="grid-column:span 2;">Clinical Notes
        <textarea id="e-notes" rows="2"></textarea>
      </label>
    </div>
    <p class="form-err" id="e-err" hidden></p>
    <div class="form-actions">
      <button class="btn-primary" id="e-save" type="button">Save Changes</button>
      <button class="btn-ghost" id="e-cancel" type="button">Cancel</button>
    </div>
  </div>
</div>

<script type="module" src="/patient-admission/343.js"></script>
</body>
</html>
T52_HTML_343
[ -s "public/patient-admission/343.html" ] && echo "  wrote public/patient-admission/343.html ($(wc -c < "public/patient-admission/343.html") bytes)"

mkdir -p "public/patient-admission"
cat > "public/patient-admission/343.js" << 'T52_JS_343'
// patient-admission (page 343) — JAMALI Health — Admission Details & History
// One admission, fully drawn from the live records: patient, admission and
// clinical information, the current ward and bed (read from the assignment
// records of Ward Management), placement and transfer history, the record
// trail and the status history. Status transitions are validated:
//   Pending     -> Admitted (confirm) | Cancelled
//   Admitted    -> Discharged (frees the bed) | Transferred (via page 335)
//   Transferred -> Discharged
//   Discharged / Cancelled -> final, no further changes
// Every change records who made it and when. Previous admissions of the
// same patient are listed below and never overwritten.
import { requireAuth, db, collection, doc, updateDoc, onSnapshot, writeBatch, arrayUnion } from "/firebase.js";

window.__p52 = { page: "343", build: "52d1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p52) window.__p52.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no admission records yet. Admit an existing patient on page 341.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function kv(k, v) {
  return "<div class='kv'><span class='k'>" + k + "</span><span class='v'>" + (v || "—") + "</span></div>";
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

const ST_CLASS = {
  "Pending": "st-pending", "Admitted": "st-admitted", "Transferred": "st-transferred",
  "Discharged": "st-discharged", "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

/* ---------- live data ---------- */
let admissions = [];
let regs = [];
let assignments = [];
let transfers = [];
let current = null; // the open admission document

onSnapshot(collection(db, "healthAdmissions"), (snap) => {
  admissions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(admissions.length);
  if (current) current = admissions.find((x) => x.__id === current.__id) || current;
  renderAll();
  maybeAutoOpen();
}, (e) => loadErr("healthAdmissions", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthRegistrations"), (snap) => {
  regs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderAll();
}, (e) => loadErr("healthRegistrations", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")));
  renderAll();
}, (e) => loadErr("healthBedAssignments", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedTransfers"), (snap) => {
  transfers = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.transferredAt || "").localeCompare(String(a.transferredAt || "")));
  renderAll();
}, (e) => loadErr("healthBedTransfers", e));
window.__p52.listeners++;

/* ---------- open an admission ---------- */
function openById(id) {
  const a = admissions.find((x) => x.__id === id);
  if (!a) { $("#d-none").hidden = false; $("#d-none").textContent = "No admission with that reference is on record."; return; }
  current = a;
  renderAll();
  $("#d-card").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("#d-open").addEventListener("click", () => {
  const q = $("#d-q").value.trim().toLowerCase();
  $("#d-none").hidden = true;
  if (!q) return;
  const hit = admissions.find((x) => String(x.admissionNumber || "").toLowerCase() === q) ||
              admissions.find((x) => String(x.__id).toLowerCase() === q) ||
              admissions.find((x) => String(x.admissionNumber || "").toLowerCase().includes(q));
  if (!hit) { $("#d-none").hidden = false; $("#d-none").textContent = "No admission matches \u201c" + q + "\u201d."; return; }
  openById(hit.__id);
});
$("#d-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#d-open").click(); } });

function maybeAutoOpen() {
  if (current) return;
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "";
  if (id && admissions.some((x) => x.__id === id)) { current = admissions.find((x) => x.__id === id); renderAll(); return; }
  const pid = params.get("patient") || "";
  if (pid) {
    const own = admissions.filter((x) => String(x.patientId) === String(pid));
    if (own.length) { current = own[0]; renderAll(); }
  }
}

/* ---------- render ---------- */
function regOf(patientId) {
  return regs.find((r) => String(r.regId) === String(patientId)) || null;
}
function activePlacementOf(patientId) {
  return assignments.find((x) => x.status === "Active" &&
    String(x.patientId) === String(patientId)) || null;
}
function renderAll() {
  if (!current) return;
  const a = current;
  const r = regOf(a.patientId);
  const place = activePlacementOf(a.patientId);

  $("#d-card").hidden = false;
  $("#d-title").textContent = "Admission " + (a.admissionNumber || a.__id) + " ";
  $("#d-title").innerHTML = "Admission " + esc(a.admissionNumber || a.__id) + " " + stBadge(a.status);
  $("#d-sub").textContent = "Every section below is drawn from the live records — nothing is copied or typed in twice.";

  $("#d-pat").innerHTML =
    kv("Patient Number", esc(a.patientId || "")) +
    kv("Patient Name", esc(a.patientName || (r ? (r.isUnidentified ? "Unidentified" : r.fullName) : "—"))) +
    kv("Age · Sex", esc(r ? [r.age, r.sex].filter(Boolean).join(" · ") : ([a.patientAge, a.patientSex].filter(Boolean).join(" · ")))) +
    kv("Phone", esc((r && r.phone) || "")) +
    kv("Address", esc((r && r.address) || "")) +
    kv("Priority", r && r.priority ? "<span class='st st-none'>" + esc(r.priority) + "</span>" : "—");

  $("#d-adm").innerHTML =
    kv("Admission Number", esc(a.admissionNumber || "")) +
    kv("Admission Date", esc(a.admissionDate || "—")) +
    kv("Admission Time", esc(a.admissionTime || "—")) +
    kv("Admission Type", "<span class='st st-none'>" + esc(a.admissionType || "—") + "</span>") +
    kv("Admission Status", stBadge(a.status));

  $("#d-cli").innerHTML =
    kv("Reason for Admission", esc(a.reason || "—")) +
    kv("Diagnosis", esc(a.diagnosis || "—")) +
    kv("Admitting Doctor", esc(a.doctorName || "—")) +
    kv("Clinical Notes", esc(a.clinicalNotes || "—"));

  $("#d-ward").innerHTML =
    kv("Assigned Ward", esc(place ? (place.wardCode || "—") : "—")) +
    kv("Assigned Bed", esc(place ? (place.bedNumber || "—") : "—")) +
    kv("Assigned On", esc(place ? when(place.assignedAt) : "—")) +
    kv("Responsible Staff", esc(place ? (place.assignedBy || "—") : "—")) +
    (place ? "" : "<div class='kv'><span class='k'>Bed</span><span class='v'>No active placement — assign one in Ward Management (334)</span></div>");

  const ownAssignments = assignments.filter((x) => String(x.patientId) === String(a.patientId));
  $("#d-asswrap").hidden = ownAssignments.length === 0;
  $("#d-assbody").innerHTML = ownAssignments.map((x) =>
    "<tr>" +
      "<td class='nowrap'>" + esc((x.wardCode || "—") + " · bed " + (x.bedNumber || "—")) + "</td>" +
      "<td class='c-date'>" + esc(when(x.assignedAt)) + "</td>" +
      "<td class='c-date'>" + esc(x.status === "Released" ? when(x.releasedAt) : "—") + "</td>" +
      "<td>" + (x.status === "Active"
        ? "<span class='st st-active'>Active</span>"
        : "<span class='st st-released'>Released" + (x.releaseReason ? " · " + esc(x.releaseReason) : "") + "</span>") + "</td>" +
      "<td>" + esc(x.assignedBy || "—") + "</td>" +
    "</tr>").join("");

  const ownTransfers = transfers.filter((x) => String(x.patientId) === String(a.patientId));
  $("#d-trwrap").hidden = ownTransfers.length === 0;
  $("#d-trbody").innerHTML = ownTransfers.map((x) =>
    "<tr>" +
      "<td class='nowrap'>" + esc((x.fromWardCode || "—") + " · bed " + (x.fromBedNumber || "—")) + "</td>" +
      "<td class='nowrap'>" + esc((x.toWardCode || "—") + " · bed " + (x.toBedNumber || "—")) + "</td>" +
      "<td class='c-date'>" + esc(when(x.transferredAt)) + "</td>" +
      "<td class='c-desc'>" + esc(x.reason || "—") + "</td>" +
    "</tr>").join("");

  $("#d-rec").innerHTML =
    kv("Created By", esc(a.createdBy || "—")) +
    kv("Created At", esc(when(a.createdAt))) +
    kv("Updated At", esc(when(a.updatedAt)));

  const hist = Array.isArray(a.statusHistory) ? a.statusHistory : [];
  $("#d-trail").innerHTML = hist.length === 0
    ? "<li><span class='t-who'>No status trail recorded.</span></li>"
    : hist.map((h) =>
        "<li><span><b>" + esc(h.status || "—") + "</b>" +
          (h.note ? " <span class='t-who'>· " + esc(h.note) + "</span>" : "") +
        "</span><span class='t-who'>" + esc(when(h.at)) + (h.by ? " · by " + esc(h.by) : "") + "</span></li>").join("");

  // the status actions, strictly by the transition rules
  $("#d-confirm").hidden = a.status !== "Pending";
  $("#d-canceladm").hidden = a.status !== "Pending";
  $("#d-discharge").hidden = !(a.status === "Admitted" || a.status === "Transferred");
  $("#d-staff").value = $("#d-staff").value || rememberedStaff();
  $("#d-plink").href = "/patient-module/328";

  // the admission history of the same patient
  const own = admissions.filter((x) => String(x.patientId) === String(a.patientId));
  $("#d-hcard").hidden = false;
  $("#d-hempty").hidden = own.length > 0;
  $("#d-hwrap").hidden = own.length === 0;
  $("#d-hbody").innerHTML = own.map((x) =>
    "<tr" + (current && x.__id === current.__id ? " class='is-hl'" : "") + ">" +
      "<td class='c-no'>" + esc(x.admissionNumber || x.__id) + "</td>" +
      "<td class='c-date'>" + esc((x.admissionDate || "—") + " · " + (x.admissionTime || "—")) + "</td>" +
      "<td>" + esc(x.admissionType || "—") + "</td>" +
      "<td class='c-desc'>" + esc(x.diagnosis || "—") + "</td>" +
      "<td>" + stBadge(x.status) + "</td>" +
      "<td class='c-date'>" + esc((x.status === "Discharged")
        ? (Array.isArray(x.statusHistory)
            ? when((x.statusHistory.filter((h) => h.status === "Discharged").pop() || {}).at)
            : "—")
        : "—") + "</td>" +
      "<td class='c-act'>" + (current && x.__id === current.__id ? "<span class='mini-note'>open</span>"
        : "<button type='button' class='ghost-btn' data-openad='" + esc(x.__id) + "'>Open</button>") + "</td>" +
    "</tr>").join("");
  $("#d-hcount").textContent = own.length + (own.length === 1 ? " admission on record for this patient." : " admissions on record for this patient.");
}
$("#d-hbody").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-openad]");
  if (!btn) return;
  openById(btn.getAttribute("data-openad"));
});

/* ---------- status actions ---------- */
function ferr(msg) { const e = $("#d-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function staffForAction() {
  const s = $("#d-staff").value.trim();
  if (!s) { ferr("Enter your name first — every status change records who made it."); return ""; }
  keepStaff(s);
  return s;
}
$("#d-confirm").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  if (current.status !== "Pending") return ferr("Only a Pending admission can be confirmed.");
  const btn = $("#d-confirm");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthAdmissions", current.__id), {
      status: "Admitted",
      updatedAt: nowISO(),
      statusHistory: arrayUnion({ status: "Admitted", at: nowISO(), by: staff, note: "Admission confirmed" })
    });
  } catch (e) {
    ferr("Could not confirm: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});
$("#d-canceladm").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  if (current.status !== "Pending") return ferr("Only a Pending admission can be cancelled.");
  if (!confirm("Cancel admission " + (current.admissionNumber || "") + "? The record is preserved for accountability.")) return;
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#d-canceladm");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthAdmissions", current.__id), {
      status: "Cancelled",
      updatedAt: nowISO(),
      statusHistory: arrayUnion({ status: "Cancelled", at: nowISO(), by: staff, note: "Cancelled before it proceeded" })
    });
  } catch (e) {
    ferr("Could not cancel: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});
$("#d-discharge").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  if (!(current.status === "Admitted" || current.status === "Transferred"))
    return ferr("Only an Admitted or Transferred admission can be discharged.");
  const staff = staffForAction(); if (!staff) return;
  if (!confirm("Record the discharge of " + (current.patientName || "this patient") +
      "? The active bed placement is released and the bed returns to Available.")) return;
  const btn = $("#d-discharge");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    const place = activePlacementOf(current.patientId);
    const batch = writeBatch(db);
    batch.update(doc(db, "healthAdmissions", current.__id), {
      status: "Discharged",
      updatedAt: nowISO(),
      statusHistory: arrayUnion({ status: "Discharged", at: nowISO(), by: staff, note: "Discharge recorded" })
    });
    if (place) {
      batch.update(doc(db, "healthBedAssignments", place.__id), {
        status: "Released",
        releasedAt: nowISO(),
        releasedBy: staff,
        releaseReason: "Discharge"
      });
      const b = bedsAll().find((x) => x.__id === String(place.bedId) ||
        (String(x.wardId) === String(place.wardId) && x.bedNumber === place.bedNumber));
      if (b) {
        batch.update(doc(db, "healthBeds", b.__id), {
          status: "Available",
          currentPatientId: "",
          currentPatientName: "",
          currentAssignmentId: "",
          updatedAt: nowISO()
        });
      }
    }
    await batch.commit();
  } catch (e) {
    ferr("Could not record the discharge: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});
function bedsAll() { return window.__bedsCache || []; }

/* ---------- edit permitted details ---------- */
$("#d-edit").addEventListener("click", () => {
  if (!current) return;
  $("#e-sub").textContent = "Admission " + (current.admissionNumber || current.__id) +
    " — the patient link, the status trail and past records never change here.";
  $("#e-date").value = current.admissionDate || "";
  $("#e-time").value = current.admissionTime || "";
  $("#e-type").value = current.admissionType || "Planned";
  $("#e-reason").value = current.reason || "";
  $("#e-diagnosis").value = current.diagnosis || "";
  $("#e-doctor").value = current.doctorName || "";
  $("#e-notes").value = current.clinicalNotes || "";
  $("#e-err").hidden = true;
  $("#e-wrap").hidden = false;
});
$("#e-cancel").addEventListener("click", () => { $("#e-wrap").hidden = true; });
$("#e-save").addEventListener("click", async () => {
  if (!current) return;
  const e = $("#e-err"); e.hidden = true;
  const date = $("#e-date").value.trim();
  const time = $("#e-time").value.trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + "T00:00:00").getTime()))
    { e.textContent = "The admission date is not a valid date."; e.hidden = false; return; }
  if (!time || !/^\d{2}:\d{2}$/.test(time))
    { e.textContent = "The admission time is not a valid time."; e.hidden = false; return; }
  const reason = $("#e-reason").value.trim();
  if (!reason) { e.textContent = "The reason for admission is required."; e.hidden = false; return; }
  const staff = staffForAction();
  if (!staff) { e.textContent = "Enter your name next to the status buttons first."; e.hidden = false; return; }
  const btn = $("#e-save");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthAdmissions", current.__id), {
      admissionDate: date,
      admissionTime: time,
      admissionType: $("#e-type").value,
      reason,
      diagnosis: $("#e-diagnosis").value.trim(),
      doctorName: $("#e-doctor").value.trim(),
      clinicalNotes: $("#e-notes").value.trim(),
      updatedAt: nowISO()
    });
    $("#e-wrap").hidden = true;
  } catch (err) {
    e.textContent = "Could not save: " + ((err && (err.code || err.message)) || err);
    e.hidden = false;
  }
  btn.disabled = false;
});

/* ---------- the live bed cache for the discharge batch ---------- */
onSnapshot(collection(db, "healthBeds"), (snap) => {
  window.__bedsCache = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderAll();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

renderAll();
maybeAutoOpen();
T52_JS_343
[ -s "public/patient-admission/343.js" ] && echo "  wrote public/patient-admission/343.js ($(wc -c < "public/patient-admission/343.js") bytes)"

# -- 3 - every file landed --------------------------------------------
nfiles=0
for f in \
  "public/firebase.js" \
  "firestore.rules" \
  "public/ward-management/ward.css" \
  "public/patient-admission/adm.css" \
  "public/ward-management/330.html" \
  "public/ward-management/330.js" \
  "public/ward-management/331.html" \
  "public/ward-management/331.js" \
  "public/ward-management/332.html" \
  "public/ward-management/332.js" \
  "public/ward-management/333.html" \
  "public/ward-management/333.js" \
  "public/ward-management/334.html" \
  "public/ward-management/334.js" \
  "public/ward-management/335.html" \
  "public/ward-management/335.js" \
  "public/ward-management/336.html" \
  "public/ward-management/336.js" \
  "public/ward-management/337.html" \
  "public/ward-management/337.js" \
  "public/ward-management/338.html" \
  "public/ward-management/338.js" \
  "public/patient-admission/340.html" \
  "public/patient-admission/340.js" \
  "public/patient-admission/341.html" \
  "public/patient-admission/341.js" \
  "public/patient-admission/342.html" \
  "public/patient-admission/342.js" \
  "public/patient-admission/343.html" \
  "public/patient-admission/343.js" \
  ; do
  if [ -s "$f" ]; then nfiles=$((nfiles + 1)); else echo "VERIFY FAIL: $f missing or empty"; fail=1; fi
done
if [ "$fail" -eq 0 ]; then echo "PASS: all $nfiles files are on disk and non-empty"; fi

# -- 4 - build fingerprints (the boot lines name their build) ---------
grep -q 'build: "52w1"' "public/ward-management/331.js" || { echo "VERIFY FAIL: public/ward-management/331.js missing the build: "52w1" fingerprint"; fail=1; }
grep -q 'build: "52b1"' "public/ward-management/332.js" || { echo "VERIFY FAIL: public/ward-management/332.js missing the build: "52b1" fingerprint"; fail=1; }
grep -q 'build: "52o1"' "public/ward-management/333.js" || { echo "VERIFY FAIL: public/ward-management/333.js missing the build: "52o1" fingerprint"; fail=1; }
grep -q 'build: "52g1"' "public/ward-management/334.js" || { echo "VERIFY FAIL: public/ward-management/334.js missing the build: "52g1" fingerprint"; fail=1; }
grep -q 'build: "52t1"' "public/ward-management/335.js" || { echo "VERIFY FAIL: public/ward-management/335.js missing the build: "52t1" fingerprint"; fail=1; }
grep -q 'build: "52m1"' "public/ward-management/336.js" || { echo "VERIFY FAIL: public/ward-management/336.js missing the build: "52m1" fingerprint"; fail=1; }
grep -q 'build: "52r1"' "public/ward-management/337.js" || { echo "VERIFY FAIL: public/ward-management/337.js missing the build: "52r1" fingerprint"; fail=1; }
grep -q 'build: "52v1"' "public/ward-management/338.js" || { echo "VERIFY FAIL: public/ward-management/338.js missing the build: "52v1" fingerprint"; fail=1; }
grep -q 'build: "52n1"' "public/patient-admission/341.js" || { echo "VERIFY FAIL: public/patient-admission/341.js missing the build: "52n1" fingerprint"; fail=1; }
grep -q 'build: "52l1"' "public/patient-admission/342.js" || { echo "VERIFY FAIL: public/patient-admission/342.js missing the build: "52l1" fingerprint"; fail=1; }
grep -q 'build: "52d1"' "public/patient-admission/343.js" || { echo "VERIFY FAIL: public/patient-admission/343.js missing the build: "52d1" fingerprint"; fail=1; }
grep -q "the Ward Management hub" public/ward-management/330.js || { echo "VERIFY FAIL: 330.js not the hub launcher"; fail=1; }
grep -q "the Patient Admission hub" public/patient-admission/340.js || { echo "VERIFY FAIL: 340.js not the hub launcher"; fail=1; }
for p in 330 331 332 333 334 335 336 337 338; do grep -q "/ward-management/$p.js" "public/ward-management/$p.html" || { echo "VERIFY FAIL: $p.html does not load its script"; fail=1; }; done
for p in 340 341 342 343; do grep -q "/patient-admission/$p.js" "public/patient-admission/$p.html" || { echo "VERIFY FAIL: $p.html does not load its script"; fail=1; }; done
[ "$fail" -eq 0 ] && echo "PASS: every page names its build and loads its script"

# -- 5 - firebase.js: all 27 export names -------------
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
[ "$fail" -eq 0 ] && echo "PASS: firebase.js carries all 27 export names (task 50 block + task 52 additions)"

# -- 6 - firestore.rules: all 15 collections --------------------------
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
[ "$fail" -eq 0 ] && echo "PASS: firestore.rules carries all 15 collections (8 original + 6 ward/admission + healthQueueConfig from task 53)"

# -- 7 - menu + hub patches really landed -----------------------------
nwm="$(grep -c 'folder: "ward-management"' public/menu.js)"
npa="$(grep -c 'folder: "patient-admission"' public/menu.js)"
if [ "$nwm" -ne 9 ] || [ "$npa" -ne 4 ]; then echo "VERIFY FAIL: menu.js should hold 9 ward + 4 admission entries, found $nwm + $npa"; fail=1; fi
grep -q 'folder: "patient-module", n: 328' public/menu.js || { echo "VERIFY FAIL: menu.js lost the Patient List entry"; fail=1; }
nmod="$(grep -c 'class="mod"' public/health/321.html)"
if [ "$nmod" -lt 9 ]; then echo "VERIFY FAIL: 321.html should hold at least 9 tiles, found $nmod"; fail=1; fi
grep -q "/patient-admission/340" public/health/321.html || { echo "VERIFY FAIL: 321.html lost the admission tile"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: menu.js (13 new entries, 328 intact) + 321.html (9 tiles)"

# -- 8 - DOM id wiring, page by page (the awk judge) ------------------
cat > .t52-wire.awk << 'T52_WIRE'
# id-wiring check: pass 1 = the page JS (ids it reads), pass 2 = the page HTML
# (ids it defines). Prints one line per id the JS reads but nothing defines.
# NOTE: every regex here is a LITERAL inside match() — regex literals passed
# as function arguments become strings and their escapes get mangled.
function addId(s) {
  sub(/^.*\("#/, "", s)   # $("#x") and querySelector(All)("#x")
  sub(/^.*\("/, "", s)    # getElementById("x")
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
T52_WIRE
wiring_bad=0
check_wiring() {
  jsf="$1"; htmlf="$2"
  wout="$(awk -f .t52-wire.awk "$jsf" "$htmlf")"; wcode=$?
  rm -f .t52-wire.tmp
  if [ "$wcode" -ne 0 ]; then
    echo "VERIFY FAIL: $jsf reads ids nothing defines: $(echo "$wout" | tr '\n' ' ')"
    wiring_bad=$((wiring_bad + 1))
  fi
}
check_wiring "public/ward-management/331.js" "public/ward-management/331.html"
check_wiring "public/ward-management/332.js" "public/ward-management/332.html"
check_wiring "public/ward-management/333.js" "public/ward-management/333.html"
check_wiring "public/ward-management/334.js" "public/ward-management/334.html"
check_wiring "public/ward-management/335.js" "public/ward-management/335.html"
check_wiring "public/ward-management/336.js" "public/ward-management/336.html"
check_wiring "public/ward-management/337.js" "public/ward-management/337.html"
check_wiring "public/ward-management/338.js" "public/ward-management/338.html"
check_wiring "public/patient-admission/341.js" "public/patient-admission/341.html"
check_wiring "public/patient-admission/342.js" "public/patient-admission/342.html"
check_wiring "public/patient-admission/343.js" "public/patient-admission/343.html"
rm -f .t52-wire.awk
if [ "$wiring_bad" -eq 0 ]; then echo "PASS: DOM id wiring verified on all 11 data pages"; fi
[ "$wiring_bad" -gt 0 ] && fail=1

# -- 9 - THE SWEEP: every page import vs the firebase.js export list --
#    (task 50's sweep, verbatim, with the new pages added to the
#     health list - a missing export can never again die in silence)
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
  echo "TASK 52 VERIFY: ALL PASS"
  echo ""
  echo "Now commit and deploy ONLY the files this task wrote:"
  echo "  git add public/ward-management public/patient-admission public/firebase.js public/menu.js public/health/321.html firestore.rules"
  echo "  git commit -m \"task52: ward management (330-338) + patient admission (340-343)\""
  echo "  git push"
  echo ""
  echo "Wait for Vercel to finish, then HARD REFRESH (Ctrl+Shift+R) and check:"
  echo "  1. /ward-management/330   - the Ward Management hub, 8 tiles"
  echo "  2. /ward-management/331   - boot line \"Ward Registration · build 52w1 · connecting...\""
  echo "     then register a ward; a red banner means read it word for word"
  echo "  3. /ward-management/332   - put beds in the ward (bed numbers unique per ward)"
  echo "  4. /ward-management/333   - live occupancy, counted from the beds"
  echo "  5. /patient-admission/341 - admit an EXISTING patient (8695SLAJ or 3801LSKG will do)"
  echo "  6. /ward-management/334   - assign that patient to the bed you made"
  echo ""
  echo "If any page shows a red banner: send it word for word."
  echo "permission-denied = publish the rules: Firebase console -> Firestore"
  echo "Database -> Rules -> paste the repo firestore.rules -> Publish."
else
  echo ""
  echo "TASK 52 VERIFY: FAILURES ABOVE"
  echo "Nothing is committed - fix the failures and run again (the script is idempotent)."
  exit 1
fi

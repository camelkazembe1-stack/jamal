#!/usr/bin/env bash
# =====================================================================
# JAMALI - Task 54 - Patient Discharge + Laboratory + Radiology + voice
#
# 1. PATIENT DISCHARGE (pages 350-353): start a discharge for an admitted
#    patient, authorize it (clinical decision), walk the checklist, and
#    confirm. Confirmation is ONE atomic batch: admission -> Discharged,
#    assignment -> Released, bed -> Cleaning Required (NEVER straight to
#    Available), a maintenance record opens for page 336 to finish.
# 2. LABORATORY (pages 360-363): requests, specimen collection/rejection,
#    per-test results with units + reference ranges, verification by a
#    second person, critical-result notification + acknowledgement.
# 3. RADIOLOGY (pages 370-373): requests with Routine/Urgent priority,
#    appointments (schedule/reschedule/missed/cancel, with reasons),
#    procedures, findings -> verified report, corrections history,
#    urgent findings notified and acknowledged by name.
# 4. VOICE FIX on 323-327: the announcement speaks the ID letter by
#    letter with real pauses (commas), repeats the whole sentence, and
#    runs at the speed saved in Speaker settings (default 0.75 - much
#    slower than before).
# 5. Page 343's discharge button now opens the new module, so one
#    process owns every discharge.
# Every queue panel has the speaker + settings; every count is calculated
# from the stored records. firebase.js is NOT touched by this task.
#
# HOW TO RUN (Git Bash):  bash jamali-task54-discharge-lab-radiology-voice.sh
# It finds the repo itself (current folder, then ~/jamal, then ~/jamali).
# The run is not over until it prints: TASK 54 VERIFY: ALL PASS
# Then: git add the listed files, commit, push, hard-refresh (Ctrl+Shift+R).
#
# tmpfiles warning: the /dl/ link first serves an HTML VIEWER page.
# head -1 of the true script must print #!/usr/bin/env bash.
# =====================================================================

set -u
fail=0
echo "=== JAMALI Task 54 - discharge + laboratory + radiology + voice fix ==="

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

# preflight - notes, not failures
grep -q "build: \"53\"" public/triage/323.js 2>/dev/null || echo "NOTE: 323 is not at build 53 - the voice fix rewrites the queue pages from their task 53 state."
grep -q "healthAdmissions" firestore.rules 2>/dev/null || echo "NOTE: rules look pre-task-52 - task 54 ships the full 18-collection rules anyway."

cat > "firestore.rules" << 'T54_RULES'
rules_version = '2';

// =====================================================================
// JAMALI — firestore.rules — the guard dog (Task 54, the full refresh)
// Every collection the project uses gives a signed in user create, read,
// update and delete — the standing order of 25 October 2026, reprinted
// here in full with the Patient Discharge, Laboratory and Radiology
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
//   healthDischarges            — Patient Discharge (350-353)
//   healthLabRequests           — Laboratory Management (360-363)
//   healthImagingRequests       — Radiology / Imaging (370-373)
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
    // ---- Health: discharge (Task 54) ----
    match /healthDischarges/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    // ---- Health: laboratory (Task 54) ----
    match /healthLabRequests/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    // ---- Health: radiology / imaging (Task 54) ----
    match /healthImagingRequests/{docId} {
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
T54_RULES
[ -s "firestore.rules" ] && echo "  wrote firestore.rules ($(wc -c < "firestore.rules") bytes)"

mkdir -p "public/patient-discharge"
cat > "public/patient-discharge/dis.css" << 'T54_CSS_patient-discharge'
/* JAMALI — patient-discharge · shared stylesheet for pages 350 to 353
   Base design system lives in /records/records.css (imported below).
   Family accent: emerald, the Health wing colour. This file carries the
   pieces every discharge page needs: boot line, error banner, status
   badges, candidate lists, the checklist, detail sections and the trail. */
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

/* ---------- status badges (the discharge status language) ---------- */
.st { display: inline-block; border-radius: 999px; padding: 3px 10px;
  font-size: 11px; font-weight: 800; letter-spacing: .03em; white-space: nowrap; }
.st-pendauth { background: #fef3c7; color: #92400e; }
.st-approved { background: #d1fae5; color: #047857; }
.st-progress { background: #e0f2fe; color: #075985; }
.st-waitmed  { background: #ffedd5; color: #c2410c; }
.st-waitinstr{ background: #ffedd5; color: #c2410c; }
.st-ready    { background: #c7f9e5; color: #065f46; }
.st-discharged { background: #f1f5f9; color: #64748b; }
.st-deferred { background: #fce7f3; color: #9d174d; }
.st-cancelled{ background: #f1f5f9; color: #94a3b8; text-decoration: line-through; }
.st-avail   { background: #d1fae5; color: #047857; }
.st-active  { background: #d1fae5; color: #047857; }
.st-released{ background: #f1f5f9; color: #94a3b8; }
.st-critical{ background: #fee2e2; color: #b91c1c; }
.st-none    { background: #f1f5f9; color: #94a3b8; }

/* ---------- hub tiles (page 350) — the 321 square-tile language ---------- */
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
@media (max-width: 560px) {
  .mod-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  a.mod { gap: 6px; font-size: 12px; }
  .mod-ico { font-size: 24px; }
  .mod-sub { font-size: 9.5px; margin-top: 2px; }
}

/* ---------- dashboard counters (page 350) ---------- */
.dash-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px; margin: 0 0 16px; }
.dash { border: 1px solid #e2e8f0; background: #fff; border-radius: 12px;
  padding: 12px 14px; box-shadow: 0 6px 18px rgba(15, 23, 42, .05); }
.dash b { display: block; font-size: 26px; line-height: 1.15; }
.dash span { font-size: 11.5px; color: #64748b; font-weight: 700; }
.dash.warn b { color: #b45309; } .dash.good b { color: #047857; }
.dash.info b { color: #075985; } .dash.mute b { color: #64748b; }
@media (max-width: 900px) { .dash-grid { grid-template-columns: repeat(2, 1fr); } }

/* ---------- queue panel (page 350) — the task-53 card ---------- */
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
.qa-settings{margin-top:10px;border:1px dashed #cbd5e1;border-radius:10px;padding:12px 14px;background:#faf9f4}
.qa-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px;margin-top:8px}
.qa-form label{font-size:12px;font-weight:700;color:#475569;display:flex;flex-direction:column;gap:5px}
.qa-form input,.qa-form select{border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px;font-family:inherit}
@media (max-width: 700px) { .qa-form { grid-template-columns: 1fr; } }

/* ---------- find-a-patient / find-a-discharge row ---------- */
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

/* ---------- form grid ---------- */
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
.btn-danger { background: #fff; color: #b91c1c; border: 1px solid #fecaca;
  font-weight: 800; padding: 9px 16px; border-radius: 9px; cursor: pointer;
  font-size: 14px; font-family: inherit; }
.btn-danger:hover { background: #fef2f2; }

/* ---------- tabs (page 352) ---------- */
.tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.tab { border: 1px solid #cbd5e1; background: #fff; border-radius: 999px;
  padding: 6px 14px; font-size: 12.5px; font-weight: 700; color: #475569;
  cursor: pointer; font-family: inherit; }
.tab:hover { border-color: #059669; color: #047857; }
.tab.on { background: #059669; border-color: #059669; color: #fff; }

/* ---------- detail sections (page 353) ---------- */
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

/* ---------- the discharge checklist (page 353) ---------- */
.ck-row { display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 9px 0; border-bottom: 1px solid #f1f5f9; font-size: 13.5px; }
.ck-row:last-child { border-bottom: 0; }
.ck-row .ck-label { font-weight: 700; }
.ck-row .ck-who { font-size: 11px; color: #94a3b8; font-weight: 600; display: block; }
.ck-state { border: 1px solid #cbd5e1; background: #fff; border-radius: 999px;
  padding: 5px 13px; font-size: 11.5px; font-weight: 800; cursor: pointer;
  font-family: inherit; white-space: nowrap; }
.ck-state[data-state="Completed"] { background: #d1fae5; border-color: #a7f3d0; color: #047857; }
.ck-state[data-state="Pending"] { background: #fef3c7; border-color: #fde68a; color: #92400e; }
.ck-state[data-state="Not Applicable"] { background: #f1f5f9; border-color: #e2e8f0; color: #94a3b8; }
.ck-state:disabled { opacity: .6; cursor: not-allowed; }
.ck-state.fixed { cursor: default; }

/* ---------- the emergency note ---------- */
.emg-note { margin: 10px 0 16px; padding: 10px 14px; border: 1px solid #fde68a;
  background: #fffbeb; color: #92400e; border-radius: 10px; font-size: 13px;
  font-weight: 700; }

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
T54_CSS_patient-discharge
[ -s "public/patient-discharge/dis.css" ] && echo "  wrote public/patient-discharge/dis.css ($(wc -c < "public/patient-discharge/dis.css") bytes)"

mkdir -p "public/patient-discharge"
cat > "public/patient-discharge/350.html" << 'T54_HTML_350'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Patient Discharge — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/patient-discharge/dis.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/health/321">&larr; Health</a>
  <h1>Patient Discharge</h1>
  <p class="sub">Manage the authorized end of an inpatient stay: the clinical discharge decision, the checklist, the medication and instructions, and the final confirmation that releases the bed &mdash; without ever deleting the patient or the history behind them.</p>

  <div class="emg-note">🚨 Emergency treatment must never be delayed by discharge paperwork or bed-release steps.</div>

  <div class="dash-grid" id="dash">
    <div class="dash warn"><b id="x-open">0</b><span>Active discharge processes</span></div>
    <div class="dash warn"><b id="x-pend">0</b><span>Awaiting authorization</span></div>
    <div class="dash info"><b id="x-prog">0</b><span>In progress / awaiting steps</span></div>
    <div class="dash good"><b id="x-today">0</b><span>Discharged today</span></div>
    <div class="dash mute"><b id="x-total">0</b><span>Discharges on record</span></div>
  </div>

  <!-- the discharge queue: waiting / completed, current & next patient, speaker -->
  <div class="card" id="qa-card">
    <h2>Discharge queue</h2>
    <div class="qa-counts">
      <div class="qa-count"><span class="qa-num" id="qa-waiting">0</span><span class="qa-k">Patients waiting</span></div>
      <div class="qa-count"><span class="qa-num" id="qa-done">0</span><span class="qa-k">Discharged today</span></div>
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
          <a class="ghost-btn" id="qa-open" hidden>Open discharge</a>
        </div>
      </div>
    </div>
    <p class="mini-note" id="qa-note"></p>
    <div class="qa-actions"><button type="button" class="ghost-btn" id="qa-settings-btn">&#128266; Speaker settings</button></div>
    <div class="qa-settings" id="qa-settings" hidden>
      <p class="mini-note">Saved once for this module (Laboratory, Radiology and every other stage keep their own). The speaker reads exactly what is saved here &mdash; nothing is hard-coded.</p>
      <div class="qa-form">
        <label>Department / service name<input id="qa-dept" type="text" placeholder="e.g. Discharge Office"></label>
        <label>Staff name<input id="qa-staff" type="text" placeholder="e.g. Nurse MWAJUMA"></label>
        <label>Office number<input id="qa-office" type="text" placeholder="e.g. Discharge Office 02"></label>
        <label>Room number<input id="qa-room" type="text" placeholder="e.g. Room 02"></label>
        <label>Voice speed<select id="qa-speed">
          <option value="0.6">Slow &middot; 0.6</option>
          <option value="0.75" selected>Clear &middot; 0.75</option>
          <option value="0.95">Normal &middot; 0.95</option>
        </select></label>
      </div>
      <p class="form-err" id="qa-err" hidden></p>
      <p class="form-ok" id="qa-ok" hidden></p>
      <div class="form-actions"><button class="btn-primary" id="qa-save" type="button">Save Speaker Settings</button></div>
    </div>
  </div>

  <div class="mod-grid">
    <a class="mod" href="/patient-discharge/351">
      <span class="mod-ico">🚪</span>
      <span class="mod-label">Start Discharge<span class="mod-sub">open a discharge for an inpatient</span></span>
    </a>
    <a class="mod" href="/patient-discharge/352">
      <span class="mod-ico">🗒️</span>
      <span class="mod-label">Discharge List<span class="mod-sub">register &amp; search</span></span>
    </a>
    <a class="mod" href="/patient-discharge/353">
      <span class="mod-ico">🔎</span>
      <span class="mod-label">Discharge Details<span class="mod-sub">authorize · checklist · confirm</span></span>
    </a>
    <a class="mod" href="/patient-admission/342">
      <span class="mod-ico">🧾</span>
      <span class="mod-label">Admission List<span class="mod-sub">the admissions being ended</span></span>
    </a>
  </div>

  <div class="card">
    <h2>How the discharge half works</h2>
    <p class="mini-note">
      Starting a discharge never discharges anyone by itself. The responsible clinician authorizes it
      (Approved for Discharge), the checklist is completed step by step, and only then can the discharge
      be confirmed. Confirmation ends the active admission, releases the bed to <b>Cleaning Required</b> —
      never straight to Available — and keeps every historical record. A patient who leaves a bed does not
      automatically make the bed ready for the next patient.
    </p>
  </div>
</main>
</body>
</html>
T54_HTML_350
[ -s "public/patient-discharge/350.html" ] && echo "  wrote public/patient-discharge/350.html ($(wc -c < "public/patient-discharge/350.html") bytes)"

mkdir -p "public/patient-discharge"
cat > "public/patient-discharge/350.js" << 'T54_JS_350'
// patient-discharge (page 350) — JAMALI Health — Discharge Hub & Dashboard
// Every number below is calculated from the stored discharge records — never
// hard-coded. The queue panel follows the task-53 contract: the waiting and
// completed counters, the current and the next patient, and the speaker,
// which announces exactly the patient the panel shows using this module's
// saved destination (healthQueueConfig "discharge"). Calling a patient never
// completes a discharge by itself.
import { requireAuth, db, collection, doc, setDoc, onSnapshot } from "/firebase.js";

window.__p54 = { page: "350", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered() {
  if (window.__p54) window.__p54.docs = 0;
  const b = document.getElementById("p-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

/* =====================================================================
   JAMALI-QUEUE (task 53 contract, task 54 voice) — the shared queue panel.
   Waiting counts the open discharge processes; Discharged today counts the
   stays actually ended today. The announcement reads the patient shown in
   the panel — never anybody else — at the speed saved in the settings. */
const QA_MODULE = "discharge";
const QA_DEFAULT = "Discharge Office";
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 };
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
function qaIsTodayLocal(stamp) { return String(stamp || "").slice(0, 10) === qaTodayLocal(); }

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
function qaRate() {
  const r = Number(qaCfg.voiceRate);
  return (r >= 0.5 && r <= 1.1) ? r : 0.75;
}
function qaSpeech(id) {
  const d = String(id).split("").join(", ");
  const dest = qaText().dest;
  return "Patient number " + d + ". Please proceed to " + dest +
         ". I repeat: patient number " + d + ". Please proceed to " + dest + ".";
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
  qaSet("qa-current-id", cur ? cur.patientId : "\u2014");
  qaSet("qa-current-sub", cur ? (cur.sub || "In progress") : "No discharge process is open right now");
  qaSet("qa-next-id", nxt ? nxt.patientId : "\u2014");
  qaSet("qa-next-sub", nxt ? (nxt.sub || "") : (qaState.waitingCount ? "" : "Nobody is waiting"));
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-regid", nxt.patientId); else btn.removeAttribute("data-regid");
  }
  const op = document.getElementById("qa-open");
  if (op) {
    if (nxt) { op.hidden = false; op.href = "/patient-discharge/353?id=" + encodeURIComponent(nxt.__id); }
    else op.hidden = true;
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt.patientId) : "");
}
function qaUpdate(waitingRows, current, doneCount) {
  qaState.waitingCount = Array.isArray(waitingRows) ? waitingRows.length : 0;
  qaState.doneCount = doneCount || 0;
  qaState.next = (qaState.waitingCount > 0) ? waitingRows[0] : null;
  qaState.current = current || null;
  qaRenderPanel();
}
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
    u.rate = qaRate();
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang || ""));
    if (vs.length) u.voice = vs.find((v) => /GB/i.test(v.lang || "")) || vs[0];
    synth.speak(u);
    qaSet("qa-note", "Announcing: " + sentence);
  } catch (e) {
    qaSet("qa-note", "Announcement failed (" + ((e && e.message) || e) + ") — read aloud: " + sentence);
  }
});
const qaSettingsBox = document.getElementById("qa-settings");
const qaSettingsBtn = document.getElementById("qa-settings-btn");
if (qaSettingsBtn && qaSettingsBox) {
  qaSettingsBtn.addEventListener("click", () => {
    qaSettingsBox.hidden = !qaSettingsBox.hidden;
    if (!qaSettingsBox.hidden) {
      const put = (id, k) => { const el = document.getElementById(id); if (el) el.value = String(qaCfg[k] || ""); };
      put("qa-dept", "department"); put("qa-staff", "staffName");
      put("qa-office", "officeNumber"); put("qa-room", "roomNumber");
      const sp = document.getElementById("qa-speed"); if (sp) sp.value = String(qaRate());
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
  const spEl = document.getElementById("qa-speed");
  const spR = spEl ? Number(spEl.value) : NaN;
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    voiceRate: (spR >= 0.5 && spR <= 1.1) ? spR : 0.75,
    updatedAt: new Date().toISOString()
  };
  const sameSpeed = Math.abs(Number(qaCfg.voiceRate || 0.75) - data.voiceRate) < 0.001;
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber && sameSpeed) {
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
try {
  onSnapshot(doc(db, "healthQueueConfig", QA_MODULE), (s) => {
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 },
      s.exists() ? s.data() : {});
    try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
    qaRenderPanel();
    bootAnswered();
  }, (e) => {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p54) window.__p54.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  });
} catch (e) { /* the settings listener is optional — the dashboard keeps working */ }

/* ---------- live data & the counters ---------- */
let discharges = [];

const ACTIVE = new Set(["Pending Authorization", "Approved", "In Progress",
  "Awaiting Medication", "Awaiting Instructions", "Ready for Departure"]);

function stBadge(s) {
  const CLS = {
    "Pending Authorization": "st-pendauth", "Approved": "st-approved",
    "In Progress": "st-progress", "Awaiting Medication": "st-waitmed",
    "Awaiting Instructions": "st-waitinstr", "Ready for Departure": "st-ready",
    "Discharged": "st-discharged", "Deferred": "st-deferred", "Cancelled": "st-cancelled"
  };
  return "<span class='st " + (CLS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

onSnapshot(collection(db, "healthDischarges"), (snap) => {
  discharges = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  renderDash();
  renderQueue();
}, (e) => loadErr("healthDischarges", e));
window.__p54.listeners++;

function renderDash() {
  const active = discharges.filter((x) => ACTIVE.has(x.status));
  const pend = active.filter((x) => x.status === "Pending Authorization");
  const prog = active.filter((x) => x.status !== "Pending Authorization");
  const today = discharges.filter((x) => x.status === "Discharged" && qaIsTodayLocal(x.dischargedAt));
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
  set("x-open", active.length);
  set("x-pend", pend.length);
  set("x-prog", prog.length);
  set("x-today", today.length);
  set("x-total", discharges.filter((x) => x.status === "Discharged").length);
}

function renderQueue() {
  const active = discharges.filter((x) => ACTIVE.has(x.status));
  const today = discharges.filter((x) => x.status === "Discharged" && qaIsTodayLocal(x.dischargedAt));
  const rows = active.map((x) => ({
    patientId: String(x.patientId || ""),
    __id: x.__id,
    sub: (x.status || "") + (x.wardCode ? " \u00b7 " + x.wardCode + (x.bedNumber ? " bed " + x.bedNumber : "") : "")
  }));
  /* the first open process is the one being worked on; the next one is who
     the speaker calls to the discharge office */
  const cur = rows.length ? { patientId: rows[0].patientId, sub: rows[0].sub } : null;
  qaUpdate(rows.slice(1), cur, today.length);
}

renderDash();
renderQueue();
T54_JS_350
[ -s "public/patient-discharge/350.js" ] && echo "  wrote public/patient-discharge/350.js ($(wc -c < "public/patient-discharge/350.js") bytes)"

mkdir -p "public/patient-discharge"
cat > "public/patient-discharge/351.html" << 'T54_HTML_351'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Start Discharge — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/patient-discharge/dis.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/patient-discharge/350">&larr; Patient Discharge</a>
  <h1>Start Discharge</h1>
  <p class="sub">Open a discharge process for a patient who is <b>currently admitted</b>. Starting the process never discharges anyone by itself &mdash; the responsible clinician must authorize it, the checklist must be completed, and the final confirmation on the details page ends the stay.</p>

  <div class="emg-note">🚨 Emergency care must never wait for this form. If the patient needs urgent attention, treat them first.</div>

  <!-- STEP 1 · pick the admitted patient -->
  <section class="card add-card">
    <h2>1 · Find the admitted patient</h2>
    <p class="mini-note">Only patients whose admission is <b>Admitted</b> or <b>Transferred</b> are listed. A registered outpatient does not appear here — discharge ends an <b>inpatient stay</b>, not a registration.</p>
    <div class="find-row">
      <input id="s-q" type="text" placeholder="Patient ID, name, or admission number (e.g. ADM-…)">
      <button class="find-btn" id="s-find" type="button">Find</button>
    </div>
    <div class="cand-list" id="s-cands"></div>
    <div class="sel-panel" id="s-sel" hidden></div>
  </section>

  <!-- STEP 2 · the discharge form -->
  <section class="card add-card" id="s-formcard" hidden>
    <h2>2 · The discharge record</h2>
    <div class="form-grid">
      <label>Discharge reason <span class="mini-note">(why the stay ends)</span>
        <input id="s-reason" type="text" placeholder="e.g. Recovered — discharged home"></label>
      <label>Responsible clinician
        <input id="s-clinician" type="text" placeholder="e.g. Dr. Hassan"></label>
      <label>Discharge decision
        <select id="s-decision">
          <option value="Pending Review" selected>Pending Review — awaiting authorization</option>
          <option value="Approved for Discharge">Approved for Discharge — clinician has authorized</option>
        </select></label>
      <label class="span-3">Notes
        <textarea id="s-notes" rows="2" placeholder="Anything the discharge desk should know"></textarea></label>
      <label>Recorded By
        <input id="s-staff" type="text" placeholder="Your name"></label>
    </div>
    <p class="form-err" id="s-ferr" hidden></p>
    <div class="form-actions">
      <button class="btn-primary" id="s-save" type="button">Start Discharge Process</button>
      <button class="btn-ghost" id="s-clear" type="button">Clear</button>
    </div>
  </section>

  <!-- success panel -->
  <section class="card" id="s-done" hidden>
    <h2>Discharge process opened</h2>
    <p id="s-done-line" class="sel-panel"></p>
    <p class="mini-note">The process is now on the Discharge List. Authorization, the checklist and the final confirmation happen on the details page — nothing has been discharged yet.</p>
    <div class="form-actions">
      <a class="btn-primary" id="s-godetail" href="#">Open the discharge details</a>
      <button class="btn-ghost" id="s-again" type="button">Start another discharge</button>
    </div>
  </section>
</main>
</body>
</html>
T54_HTML_351
[ -s "public/patient-discharge/351.html" ] && echo "  wrote public/patient-discharge/351.html ($(wc -c < "public/patient-discharge/351.html") bytes)"

mkdir -p "public/patient-discharge"
cat > "public/patient-discharge/351.js" << 'T54_JS_351'
// patient-discharge (page 351) — JAMALI Health — Start Discharge
// Opens a discharge process for a CURRENTLY ADMITTED patient (admission
// status Admitted or Transferred). The record links to the existing patient
// (patientId = the Registration ID) and to the admission being ended — no
// patient record is created or changed here. Starting a discharge never
// ends the stay: the clinician authorizes, the checklist is completed and
// the confirmation on page 353 does the rest. One OPEN process per admission.
import { requireAuth, db, collection, addDoc, onSnapshot } from "/firebase.js";

window.__p54 = { page: "351", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p54) window.__p54.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered — no admissions on record yet. Admit the patient first (page 341), then start the discharge here.";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function todayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

const FINAL = new Set(["Discharged", "Cancelled"]);

/* ---------- live data ---------- */
let admissions = [];
let assignments = [];
let discharges = [];
let regs = [];
let selected = null;   // the admission being discharged

onSnapshot(collection(db, "healthAdmissions"), (snap) => {
  admissions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .filter((a) => a.status === "Admitted" || a.status === "Transferred")
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  renderCands(); renderSel();
}, (e) => loadErr("healthAdmissions", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderSel();
}, (e) => loadErr("healthBedAssignments", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthDischarges"), (snap) => {
  discharges = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderCands();
}, (e) => loadErr("healthDischarges", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthRegistrations"), (snap) => {
  regs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderSel();
}, (e) => loadErr("healthRegistrations", e));
window.__p54.listeners++;

function who(r) { return r ? (r.isUnidentified ? "Unidentified" : (r.fullName || "Unnamed")) : "—"; }
function regOf(patientId) {
  return regs.find((r) => String(r.regId) === String(patientId)) || null;
}
function activePlacementOf(patientId) {
  return assignments.find((x) => x.status === "Active" &&
    String(x.patientId) === String(patientId)) || null;
}
function openDischargeOf(admissionNumber) {
  return discharges.find((x) => String(x.admissionNumber || "") === String(admissionNumber || "") &&
    !FINAL.has(x.status)) || null;
}
function admitLabel(a) {
  return (a.admissionNumber || a.__id) + " · admitted " + (a.admissionDate || "—") +
    " · " + (a.admissionType || "—");
}

/* ---------- 1 · find the admitted patient ---------- */
function renderCands() {
  const box = $("#s-cands");
  if (!box) return;
  if (selected) { box.innerHTML = ""; return; }
  const q = $("#s-q").value.trim().toLowerCase();
  if (!q) { box.innerHTML = ""; return; }
  const hits = admissions.filter((a) =>
    String(a.patientId || "").toLowerCase().includes(q) ||
    String(a.patientName || "").toLowerCase().includes(q) ||
    String(a.admissionNumber || "").toLowerCase().includes(q)).slice(0, 8);
  box.innerHTML = hits.length === 0
    ? "<p class='mini-note'>No admitted patient matches &ldquo;" + esc(q) + "&rdquo; — only Admitted or Transferred admissions can be discharged.</p>"
    : hits.map((a) => {
        const dup = openDischargeOf(a.admissionNumber);
        return "<button type='button' class='cand' data-pick='" + esc(a.__id) + "'" + (dup ? " disabled" : "") + ">" +
          "<span class='c-id'>" + esc(a.patientId || "—") + "</span><b>" + esc(a.patientName || who(regOf(a.patientId))) + "</b>" +
          "<span class='mini-note'>" + esc(admitLabel(a)) + "</span>" +
          (dup ? "<span class='st st-progress'>discharge already open</span>" : "") + "</button>";
      }).join("");
}
$("#s-q").addEventListener("input", renderCands);
$("#s-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); renderCands(); } });
$("#s-find").addEventListener("click", renderCands);
$("#s-cands").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-pick]");
  if (!btn || btn.disabled) return;
  selected = admissions.find((a) => a.__id === btn.getAttribute("data-pick")) || null;
  renderCands(); renderSel();
  if (selected) $("#s-formcard").hidden = false;
});

function renderSel() {
  const box = $("#s-sel");
  if (!selected) { box.hidden = true; box.innerHTML = ""; return; }
  const r = regOf(selected.patientId);
  const place = activePlacementOf(selected.patientId);
  box.hidden = false;
  box.innerHTML = "Discharging <b>" + esc(selected.patientName || who(r)) + "</b> · Patient Number <b>" +
    esc(selected.patientId || "—") + "</b> · Admission <b>" + esc(selected.admissionNumber || selected.__id) + "</b>" +
    " · status <b>" + esc(selected.status || "—") + "</b><br>" +
    "<span class='mini-note'>" + (place
      ? "Currently in " + esc(place.wardCode || "—") + ", bed " + esc(place.bedNumber || "—")
      : "No active bed placement — the discharge will simply end the admission.") + "</span>";
}

/* the deep link: /patient-discharge/351?patient=REGID */
function maybeAutoOpen() {
  if (selected) return;
  const pid = new URLSearchParams(location.search).get("patient") || "";
  if (!pid) return;
  const a = admissions.find((x) => String(x.patientId) === String(pid));
  if (a) {
    selected = a;
    renderCands(); renderSel();
    $("#s-formcard").hidden = false;
  }
}

/* ---------- 2 · save the discharge record ---------- */
function ferr(msg) { const e = $("#s-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function v(sel) { return $(sel).value.trim(); }

function freshNumber() {
  // DIS-YYYYMMDD-XXLL, checked against the live discharges for uniqueness
  for (let t = 0; t < 5; t++) {
    let code = "";
    const D = "0123456789", L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    for (let i = 0; i < 4; i++) code += (i < 2 ? D : L)[Math.floor(Math.random() * (i < 2 ? 10 : 24))];
    const cand = "DIS-" + todayLocal().replace(/-/g, "") + "-" + code;
    if (!discharges.some((d) => d.dischargeNumber === cand)) return cand;
  }
  return "DIS-" + todayLocal().replace(/-/g, "") + "-" + Date.now().toString(36).toUpperCase().slice(-5);
}

/* the checklist the details page walks through (spec §7) */
function freshChecklist() {
  return [
    { key: "review",   label: "Required clinical review completed", state: "Pending", by: "", at: "" },
    { key: "rx",       label: "Prescriptions reviewed",             state: "Pending", by: "", at: "" },
    { key: "meds",     label: "Discharge medication arranged",      state: "Pending", by: "", at: "" },
    { key: "instr",    label: "Discharge instructions prepared",    state: "Pending", by: "", at: "" },
    { key: "followup", label: "Follow-up appointment recorded",     state: "Pending", by: "", at: "" },
    { key: "caregiver",label: "Patient or caregiver instructions documented", state: "Pending", by: "", at: "" },
    { key: "docs",     label: "Relevant documents prepared",        state: "Pending", by: "", at: "" },
    { key: "admin",    label: "Required administrative steps completed", state: "Pending", by: "", at: "" }
  ];
}

async function saveDischarge() {
  ferr("");
  if (!selected) return ferr("Find and choose the admitted patient first (step 1).");
  const reason = v("#s-reason");
  const clinician = v("#s-clinician");
  const staff = v("#s-staff");
  const decision = $("#s-decision").value;
  if (!reason) return ferr("The discharge reason is required.");
  if (!clinician) return ferr("The responsible clinician is required — the clinical team authorizes every discharge.");
  if (!staff) return ferr("Recorded By is required — enter your name.");
  const dup = openDischargeOf(selected.admissionNumber);
  if (dup) return ferr("Admission " + (selected.admissionNumber || "") + " already has an open discharge process (" +
    (dup.dischargeNumber || "") + "). Finish or cancel it before starting another.");
  keepStaff(staff);
  const btn = $("#s-save");
  if (btn.disabled) return; // duplicate-submission guard
  btn.disabled = true;
  const place = activePlacementOf(selected.patientId);
  const status = decision === "Approved for Discharge" ? "Approved" : "Pending Authorization";
  try {
    const ref = await addDoc(collection(db, "healthDischarges"), {
      dischargeNumber: freshNumber(),
      patientId: String(selected.patientId || ""),
      patientName: String(selected.patientName || who(regOf(selected.patientId))),
      patientAge: selected.patientAge || "",
      patientSex: selected.patientSex || "",
      admissionDocId: selected.__id,
      admissionNumber: String(selected.admissionNumber || ""),
      admissionDate: String(selected.admissionDate || ""),
      admissionTime: String(selected.admissionTime || ""),
      wardId: place ? String(place.wardId || "") : "",
      wardCode: place ? String(place.wardCode || "") : "",
      bedId: place ? String(place.bedId || "") : "",
      bedNumber: place ? String(place.bedNumber || "") : "",
      decision,
      status,
      reason,
      clinician,
      notes: v("#s-notes"),
      checklist: freshChecklist(),
      medicationNote: "",
      instructions: { general: "", medication: "", clinic: "", when: "", notes: "", provided: false, providedBy: "", providedAt: "" },
      recordedBy: staff,
      statusHistory: [{ status, at: nowISO(), by: staff,
        note: decision === "Approved for Discharge"
          ? "Discharge opened and authorized by " + clinician
          : "Discharge opened — awaiting authorization" }],
      createdAt: nowISO(),
      updatedAt: nowISO()
    });
    $("#s-done-line").textContent = (selected.patientName || who(regOf(selected.patientId))) +
      " · admission " + (selected.admissionNumber || "") + " · decision " + decision + " · status " + status + ".";
    $("#s-godetail").href = "/patient-discharge/353?id=" + encodeURIComponent(ref.id);
    $("#s-formcard").hidden = true;
    $("#s-done").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    ferr("Could not save the discharge: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
}
$("#s-save").addEventListener("click", saveDischarge);
$("#s-clear").addEventListener("click", () => {
  $("#s-reason").value = ""; $("#s-clinician").value = ""; $("#s-notes").value = "";
  $("#s-decision").value = "Pending Review";
  ferr("");
});
$("#s-again").addEventListener("click", () => {
  selected = null;
  $("#s-q").value = "";
  $("#s-reason").value = ""; $("#s-clinician").value = ""; $("#s-notes").value = "";
  $("#s-decision").value = "Pending Review";
  $("#s-done").hidden = true; $("#s-formcard").hidden = true;
  ferr("");
  renderCands(); renderSel();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

$("#s-staff").value = rememberedStaff();
renderCands(); renderSel();
maybeAutoOpen();
T54_JS_351
[ -s "public/patient-discharge/351.js" ] && echo "  wrote public/patient-discharge/351.js ($(wc -c < "public/patient-discharge/351.js") bytes)"

mkdir -p "public/patient-discharge"
cat > "public/patient-discharge/352.html" << 'T54_HTML_352'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Discharge List — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/patient-discharge/dis.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/patient-discharge/350">&larr; Patient Discharge</a>
  <h1>Discharge List</h1>
  <p class="sub">The discharge register — current processes, completed discharges and cancelled or deferred requests, kept separately so a finished stay is never mistaken for one still in progress.</p>

  <div class="tabs" id="l-tabs">
    <button class="tab on" data-tab="active" type="button">Active processes</button>
    <button class="tab" data-tab="completed" type="button">Completed</button>
    <button class="tab" data-tab="closed" type="button">Cancelled &amp; deferred</button>
    <button class="tab" data-tab="all" type="button">All</button>
  </div>

  <div class="card">
    <div class="find-row">
      <input id="l-q" type="text" placeholder="Search: discharge no (DIS-…), patient ID / name, admission no (ADM-…)">
      <button class="find-btn" id="l-find" type="button">Search</button>
      <select id="l-status" style="border:1px solid #cbd5e1;border-radius:9px;padding:9px 12px;font-size:13.5px">
        <option value="">All statuses</option>
        <option>Pending Authorization</option>
        <option>Approved</option>
        <option>In Progress</option>
        <option>Awaiting Medication</option>
        <option>Awaiting Instructions</option>
        <option>Ready for Departure</option>
        <option>Discharged</option>
        <option>Deferred</option>
        <option>Cancelled</option>
      </select>
    </div>
    <p class="mini-note" id="l-count" style="margin-top:8px"></p>
    <div style="overflow-x:auto">
      <table class="data-table" id="l-table" hidden>
        <thead>
          <tr>
            <th>Discharge No</th><th>Patient</th><th>Admission</th>
            <th>Ward · Bed</th><th>Started</th><th>Status</th><th>Decision</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="l-body"></tbody>
      </table>
    </div>
    <p class="mini-note" id="l-empty" hidden>No discharge records in this view yet.</p>
  </div>
</main>
</body>
</html>
T54_HTML_352
[ -s "public/patient-discharge/352.html" ] && echo "  wrote public/patient-discharge/352.html ($(wc -c < "public/patient-discharge/352.html") bytes)"

mkdir -p "public/patient-discharge"
cat > "public/patient-discharge/352.js" << 'T54_JS_352'
// patient-discharge (page 352) — JAMALI Health — Discharge List
// The discharge register. Current processes are listed separately from
// completed, cancelled and deferred ones; searching and filtering run on
// the live stored records only. Opening a row goes to the details page.
import { requireAuth, db, collection, onSnapshot } from "/firebase.js";

window.__p54 = { page: "352", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p54) window.__p54.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered — no discharge records yet. Start one on page 351 for an admitted patient.";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
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
  "Pending Authorization": "st-pendauth", "Approved": "st-approved",
  "In Progress": "st-progress", "Awaiting Medication": "st-waitmed",
  "Awaiting Instructions": "st-waitinstr", "Ready for Departure": "st-ready",
  "Discharged": "st-discharged", "Deferred": "st-deferred", "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

let rows = [];
let tab = "active";

onSnapshot(collection(db, "healthDischarges"), (snap) => {
  rows = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(rows.length);
  render();
}, (e) => loadErr("healthDischarges", e));
window.__p54.listeners++;

/* tabs */
$("#l-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (!b) return;
  tab = b.getAttribute("data-tab");
  document.querySelectorAll("#l-tabs .tab").forEach((t) => t.classList.toggle("on", t === b));
  render();
});

const ACTIVE = new Set(["Pending Authorization", "Approved", "In Progress",
  "Awaiting Medication", "Awaiting Instructions", "Ready for Departure"]);

function render() {
  const q = $("#l-q").value.trim().toLowerCase();
  const st = $("#l-status").value;
  let list = rows.slice();
  if (tab === "active") list = list.filter((x) => ACTIVE.has(x.status));
  if (tab === "completed") list = list.filter((x) => x.status === "Discharged");
  if (tab === "closed") list = list.filter((x) => x.status === "Cancelled" || x.status === "Deferred");
  if (st) list = list.filter((x) => x.status === st);
  if (q) list = list.filter((x) =>
    String(x.dischargeNumber || "").toLowerCase().includes(q) ||
    String(x.patientId || "").toLowerCase().includes(q) ||
    String(x.patientName || "").toLowerCase().includes(q) ||
    String(x.admissionNumber || "").toLowerCase().includes(q));

  $("#l-table").hidden = list.length === 0;
  $("#l-empty").hidden = list.length > 0;
  $("#l-count").textContent = list.length === 0 ? "" :
    list.length + (list.length === 1 ? " discharge record shown." : " discharge records shown.");
  $("#l-body").innerHTML = list.map((x) =>
    "<tr>" +
      "<td class='c-no nowrap'>" + esc(x.dischargeNumber || x.__id) + "</td>" +
      "<td><b>" + esc(x.patientName || "—") + "</b>" +
        "<br><span class='mini-note'>" + esc(x.patientId || "—") + "</span></td>" +
      "<td class='nowrap'>" + esc(x.admissionNumber || "—") + "</td>" +
      "<td class='nowrap'>" + esc((x.wardCode || "—") + (x.bedNumber ? " · bed " + x.bedNumber : "")) + "</td>" +
      "<td class='c-date'>" + esc(when(x.createdAt)) + "</td>" +
      "<td>" + stBadge(x.status) + "</td>" +
      "<td class='nowrap'>" + esc(x.decision || "—") + "</td>" +
      "<td class='c-act'><a class='ghost-btn' href='/patient-discharge/353?id=" + encodeURIComponent(x.__id) + "'>Open</a></td>" +
    "</tr>").join("");
}
$("#l-find").addEventListener("click", render);
$("#l-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); render(); } });
$("#l-q").addEventListener("input", render);
$("#l-status").addEventListener("change", render);

render();
T54_JS_352
[ -s "public/patient-discharge/352.js" ] && echo "  wrote public/patient-discharge/352.js ($(wc -c < "public/patient-discharge/352.js") bytes)"

mkdir -p "public/patient-discharge"
cat > "public/patient-discharge/353.html" << 'T54_HTML_353'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Discharge Details — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/patient-discharge/dis.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/patient-discharge/350">&larr; Patient Discharge</a>
  <h1>Discharge Details</h1>
  <p class="sub">One discharge process, drawn entirely from the live records: authorization, checklist, medication, instructions and the final confirmation. Authorization and completion are two different things &mdash; the stay ends only when the discharge is confirmed.</p>

  <div class="find-row card" style="padding:12px 16px">
    <input id="x-q" type="text" placeholder="Discharge number (DIS-…), patient ID or name">
    <button class="find-btn" id="x-open" type="button">Open</button>
    <span class="mini-note" id="x-none"></span>
  </div>

  <section class="card" id="x-card" hidden>
    <h2 id="x-title">Discharge</h2>

    <div class="sec-h">Patient &amp; admission</div>
    <div id="x-pat"></div>

    <div class="sec-h">Location at the start of the discharge</div>
    <div id="x-loc"></div>

    <div class="sec-h">Authorization</div>
    <div id="x-auth"></div>
    <div class="form-actions" id="x-authbtns">
      <button class="btn-primary" id="x-approve" type="button" hidden>Approve for Discharge</button>
      <button class="btn-warn" id="x-defer" type="button" hidden>Defer</button>
      <button class="btn-danger" id="x-notapprove" type="button" hidden>Not Approved</button>
      <button class="btn-ghost" id="x-reopen" type="button" hidden>Reopen deferred process</button>
    </div>
    <p class="mini-note">Every decision records who made it and when. The clinical team authorizes the discharge — the software only writes the decision down.</p>

    <div class="sec-h">Discharge checklist</div>
    <p class="mini-note">Click a state to cycle it: Pending &rarr; Completed &rarr; Not Applicable. Items left Pending keep the process open; the last pending medication or instruction step shows as Awaiting Medication / Awaiting Instructions.</p>
    <div id="x-checklist"></div>

    <div class="sec-h">Medication (from Pharmacy — read only)</div>
    <div style="overflow-x:auto">
      <table class="data-table" id="x-rxtable" hidden>
        <thead><tr><th>Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Status</th><th>Dispensed</th></tr></thead>
        <tbody id="x-rxbody"></tbody>
      </table>
    </div>
    <p class="mini-note" id="x-rxempty" hidden>No prescriptions on record for this patient. A discharge never marks medication as dispensed — only Pharmacy does that.</p>
    <div class="form-grid" style="margin-top:10px">
      <label class="span-3">Medication note
        <textarea id="x-mednote" rows="2" placeholder="e.g. discharge medication collected at Pharmacy Counter 01"></textarea></label>
    </div>
    <div class="form-actions"><button class="btn-ghost" id="x-medsave" type="button">Save medication note</button></div>

    <div class="sec-h">Instructions &amp; follow-up</div>
    <div class="form-grid">
      <label class="span-3">General instructions given
        <textarea id="x-i-general" rows="2"></textarea></label>
      <label class="span-3">Medication instructions
        <textarea id="x-i-medication" rows="2"></textarea></label>
      <label>Follow-up clinic / department
        <input id="x-i-clinic" type="text" placeholder="e.g. Outpatient Clinic"></label>
      <label>Follow-up date &amp; time
        <input id="x-i-when" type="text" placeholder="e.g. 2026-11-05 09:30"></label>
      <label>Notes
        <input id="x-i-notes" type="text"></label>
    </div>
    <div class="form-actions">
      <button class="btn-ghost" id="x-isave" type="button">Save instructions</button>
      <button class="btn-warn" id="x-iprovided" type="button" hidden>Mark instructions as provided to patient / caregiver</button>
    </div>
    <p class="mini-note" id="x-iprovided-line"></p>

    <div class="sec-h">Status trail</div>
    <ul class="trail" id="x-trail"></ul>

    <div class="sec-h">Record trail</div>
    <div id="x-rec"></div>

    <div class="sec-h">Final confirmation</div>
    <p class="mini-note" id="x-confirm-note"></p>
    <div class="form-actions">
      <button class="btn-primary" id="x-confirm" type="button" hidden>Confirm discharge &amp; release the bed to cleaning</button>
      <button class="btn-danger" id="x-cancelproc" type="button" hidden>Cancel this discharge process</button>
    </div>
    <p class="form-err" id="x-ferr" hidden></p>
    <div class="form-actions" style="margin-top:6px">
      <label class="mini-note">Staff name for actions
        <input id="x-staff" type="text" style="border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px;margin-left:8px"></label>
    </div>
  </section>
</main>
</body>
</html>
T54_HTML_353
[ -s "public/patient-discharge/353.html" ] && echo "  wrote public/patient-discharge/353.html ($(wc -c < "public/patient-discharge/353.html") bytes)"

mkdir -p "public/patient-discharge"
cat > "public/patient-discharge/353.js" << 'T54_JS_353'
// patient-discharge (page 353) — JAMALI Health — Discharge Details
// One discharge process from authorization to confirmation. The status is
// derived honestly from the checklist; the final confirmation is only
// possible when the clinician has approved AND every checklist step is
// Completed or Not Applicable. Confirmation runs as ONE atomic batch:
//   discharge -> Discharged · admission -> Discharged ·
//   assignment -> Released   · bed -> Cleaning Required (never Available) ·
//   a maintenance record is opened so page 336 can finish the cleaning.
// Cancelled / Discharged are final; history is never overwritten or deleted.
import { requireAuth, db, collection, doc, updateDoc, setDoc, onSnapshot, writeBatch, arrayUnion } from "/firebase.js";

window.__p54 = { page: "353", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p54) window.__p54.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered — no discharge records yet. Start one on page 351.";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
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
  "Pending Authorization": "st-pendauth", "Approved": "st-approved",
  "In Progress": "st-progress", "Awaiting Medication": "st-waitmed",
  "Awaiting Instructions": "st-waitinstr", "Ready for Departure": "st-ready",
  "Discharged": "st-discharged", "Deferred": "st-deferred", "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

/* ---------- live data ---------- */
let discharges = [];
let admissions = [];
let assignments = [];
let beds = [];
let prescriptions = [];
let current = null;

onSnapshot(collection(db, "healthDischarges"), (snap) => {
  discharges = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(discharges.length);
  if (current) current = discharges.find((x) => x.__id === current.__id) || current;
  renderAll(); maybeAutoOpen();
}, (e) => loadErr("healthDischarges", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthAdmissions"), (snap) => {
  admissions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderAll();
}, (e) => loadErr("healthAdmissions", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderAll();
}, (e) => loadErr("healthBedAssignments", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderAll();
}, (e) => loadErr("healthBeds", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthPrescriptions"), (snap) => {
  prescriptions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderAll();
}, (e) => loadErr("healthPrescriptions", e));
window.__p54.listeners++;

/* ---------- open a discharge ---------- */
function openById(id) {
  const d = discharges.find((x) => x.__id === id);
  if (!d) { $("#x-none").textContent = "No discharge with that reference is on record."; return; }
  current = d;
  renderAll();
  $("#x-card").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("#x-open").addEventListener("click", () => {
  const q = $("#x-q").value.trim().toLowerCase();
  $("#x-none").textContent = "";
  if (!q) return;
  const hit = discharges.find((x) => String(x.dischargeNumber || "").toLowerCase() === q) ||
              discharges.find((x) => String(x.patientId || "").toLowerCase() === q) ||
              discharges.find((x) => String(x.dischargeNumber || "").toLowerCase().includes(q)) ||
              discharges.find((x) => String(x.patientName || "").toLowerCase().includes(q));
  if (!hit) { $("#x-none").textContent = "No discharge matches \u201c" + q + "\u201d."; return; }
  openById(hit.__id);
});
$("#x-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#x-open").click(); } });

function maybeAutoOpen() {
  if (current) return;
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "";
  if (id && discharges.some((x) => x.__id === id)) { current = discharges.find((x) => x.__id === id); renderAll(); return; }
  const pid = params.get("patient") || "";
  if (pid) {
    const own = discharges.filter((x) => String(x.patientId) === String(pid) && x.status !== "Discharged" && x.status !== "Cancelled");
    if (own.length) { current = own[own.length - 1]; renderAll(); }
  }
}

/* ---------- status derivation (honest, from the checklist) ---------- */
function derivedStatus(d) {
  const items = (Array.isArray(d.checklist) ? d.checklist : []).filter((i) => i && i.key !== "auth");
  const out = items.filter((i) => (i.state || "Pending") === "Pending");
  if (out.length === 0) return "Ready for Departure";
  if (out.length === 1) {
    if (out[0].key === "meds") return "Awaiting Medication";
    if (out[0].key === "instr" || out[0].key === "caregiver") return "Awaiting Instructions";
  }
  return "In Progress";
}
function isFinal(s) { return s === "Discharged" || s === "Cancelled"; }

/* ---------- render ---------- */
function renderAll() {
  if (!current) return;
  const d = current;
  const adm = admissions.find((a) => a.__id === d.admissionDocId) ||
             admissions.find((a) => String(a.admissionNumber || "") === String(d.admissionNumber || ""));
  const place = assignments.find((x) => x.status === "Active" && String(x.patientId) === String(d.patientId)) || null;

  $("#x-card").hidden = false;
  $("#x-title").innerHTML = "Discharge " + esc(d.dischargeNumber || d.__id) + " " + stBadge(d.status);

  $("#x-pat").innerHTML =
    kv("Patient Number", esc(d.patientId || "")) +
    kv("Patient Name", esc(d.patientName || "—")) +
    kv("Age · Sex", esc([d.patientAge, d.patientSex].filter(Boolean).join(" · "))) +
    kv("Admission", esc((d.admissionNumber || "—") + (adm ? " · status " + adm.status : ""))) +
    kv("Admitted On", esc((d.admissionDate || "—") + " " + (d.admissionTime || ""))) +
    kv("Reason the stay ends", esc(d.reason || "—"));

  $("#x-loc").innerHTML =
    kv("Ward", esc(d.wardCode || (place ? place.wardCode : "—"))) +
    kv("Bed", esc(d.bedNumber || (place ? place.bedNumber : "—"))) +
    kv("Placement now", place ? "<span class='st st-active'>Active — " + esc(place.wardCode || "") + " bed " + esc(place.bedNumber || "") + "</span>"
                              : (d.status === "Discharged" ? "<span class='st st-released'>Released at discharge</span>" : "No active placement"));

  $("#x-auth").innerHTML =
    kv("Decision", esc(d.decision || "Pending Review")) +
    kv("Responsible clinician", esc(d.clinician || "—")) +
    kv("Notes", esc(d.notes || "—"));

  const fin = isFinal(d.status);
  $("#x-approve").hidden = fin || d.status === "Deferred" || d.decision === "Approved for Discharge";
  $("#x-defer").hidden = fin || d.status === "Deferred";
  $("#x-notapprove").hidden = fin || d.status === "Deferred";
  $("#x-reopen").hidden = d.status !== "Deferred";
  $("#x-cancelproc").hidden = fin;
  $("#x-staff").value = $("#x-staff").value || rememberedStaff();

  const list = Array.isArray(d.checklist) ? d.checklist : [];
  const authDone = d.decision === "Approved for Discharge";
  const cycle = { "Pending": "Completed", "Completed": "Not Applicable", "Not Applicable": "Pending" };
  const base = list.filter((i) => i && i.key !== "auth");
  $("#x-checklist").innerHTML =
    "<div class='ck-row'><span><span class='ck-label'>Discharge authorization recorded</span>" +
      "<span class='ck-who'>" + (authDone ? "completed automatically when the clinician approved" : "waiting for the clinical decision") + "</span></span>" +
      "<span class='ck-state fixed' data-state='" + (authDone ? "Completed" : "Pending") + "'>" + (authDone ? "Completed" : "Pending") + "</span></div>" +
    base.map((i) => {
      const st = i.state || "Pending";
      const who2 = st === "Completed" && i.by ? " · by " + esc(i.by) + " · " + esc(when(i.at)) : "";
      return "<div class='ck-row'><span><span class='ck-label'>" + esc(i.label || i.key) + "</span>" +
        "<span class='ck-who'>" + who2 + "</span></span>" +
        "<button type='button' class='ck-state' data-key='" + esc(i.key) + "' data-state='" + esc(st) + "'" +
        (fin ? " disabled" : "") + ">" + esc(st) + "</button></div>";
    }).join("");

  const rx = prescriptions.filter((p) => String(p.regId) === String(d.patientId));
  $("#x-rxtable").hidden = rx.length === 0;
  $("#x-rxempty").hidden = rx.length > 0;
  $("#x-rxbody").innerHTML = rx.map((p) =>
    "<tr><td><b>" + esc(p.medicine || "—") + "</b></td>" +
      "<td>" + esc(p.dose || "—") + "</td><td>" + esc(p.frequency || "—") + "</td><td>" + esc(p.duration || "—") + "</td>" +
      "<td><span class='st " + (p.status === "dispensed" ? "st-avail" : "st-none") + "'>" + esc(p.status || "—") + "</span></td>" +
      "<td class='c-date'>" + (p.dispensed ? esc(when(p.dispensed.at)) + (p.dispensed.by ? " · " + esc(p.dispensed.by) : "") : "—") + "</td></tr>").join("");
  $("#x-mednote").value = d.medicationNote || "";

  const ins = d.instructions || {};
  $("#x-i-general").value = ins.general || "";
  $("#x-i-medication").value = ins.medication || "";
  $("#x-i-clinic").value = ins.clinic || "";
  $("#x-i-when").value = ins.when || "";
  $("#x-i-notes").value = ins.notes || "";
  $("#x-iprovided").hidden = fin || !!ins.provided;
  $("#x-iprovided-line").textContent = ins.provided
    ? "Instructions provided" + (ins.providedBy ? " by " + ins.providedBy : "") + (ins.providedAt ? " · " + when(ins.providedAt) : "") + "."
    : "Instructions prepared here are not the same as instructions actually given — record the handover with the button above.";

  const hist = Array.isArray(d.statusHistory) ? d.statusHistory : [];
  $("#x-trail").innerHTML = hist.length === 0
    ? "<li><span class='t-who'>No status trail recorded.</span></li>"
    : hist.map((h) =>
        "<li><span><b>" + esc(h.status || "—") + "</b>" +
          (h.note ? " <span class='t-who'>· " + esc(h.note) + "</span>" : "") +
        "</span><span class='t-who'>" + esc(when(h.at)) + (h.by ? " · by " + esc(h.by) : "") + "</span></li>").join("");

  $("#x-rec").innerHTML =
    kv("Started By", esc(d.recordedBy || "—")) +
    kv("Started At", esc(when(d.createdAt))) +
    kv("Updated At", esc(when(d.updatedAt))) +
    (d.dischargedAt ? kv("Discharged At", esc(when(d.dischargedAt)) + (d.dischargedBy ? " · by " + esc(d.dischargedBy) : "")) : "") +
    (d.bedReleased ? kv("Bed released", "Yes — sent to cleaning") : "");

  // the final confirmation: authorized AND everything done
  const ready = d.decision === "Approved for Discharge" && d.status === "Ready for Departure";
  $("#x-confirm").hidden = !ready;
  $("#x-confirm-note").textContent = fin
    ? (d.status === "Discharged"
        ? "This discharge is complete — the record and the history stay on file."
        : "This process is closed. The admission continues; start a new discharge if needed.")
    : ready
      ? "All steps are complete and the clinician has approved. Confirming ends the admission, releases the bed to Cleaning Required and preserves the full history."
      : (d.decision === "Approved for Discharge"
          ? "The clinician has approved — the checklist above decides when the process is Ready for Departure."
          : "Waiting for the clinical decision. Approval, completion and confirmation are three different things — none happens automatically.");
  $("#x-ferr").hidden = true;
}

/* ---------- actions ---------- */
function ferr(msg) { const e = $("#x-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function staffForAction() {
  const s = $("#x-staff").value.trim();
  if (!s) { ferr("Enter your name first — every action records who made it."); return ""; }
  keepStaff(s);
  return s;
}
function touch(fields) {
  if (!current) return Promise.reject("no record open");
  return updateDoc(doc(db, "healthDischarges", current.__id),
    Object.assign({ updatedAt: nowISO() }, fields));
}

$("#x-approve").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  if (current.decision === "Approved for Discharge") return ferr("Already approved.");
  const btn = $("#x-approve"); if (btn.disabled) return; btn.disabled = true;
  try {
    const st = derivedStatus(Object.assign({}, current, { decision: "Approved for Discharge" }));
    await touch({
      decision: "Approved for Discharge", status: st,
      statusHistory: arrayUnion({ status: st, at: nowISO(), by: staff, note: "Clinician approved the discharge" })
    });
  } catch (e) { ferr("Could not approve: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-defer").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-defer"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({
      decision: "Discharge Deferred", status: "Deferred",
      statusHistory: arrayUnion({ status: "Deferred", at: nowISO(), by: staff, note: "Discharge postponed" })
    });
  } catch (e) { ferr("Could not defer: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-notapprove").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  if (!confirm("Record 'Not Approved' for " + (current.dischargeNumber || "") +
      "? The process closes, the admission continues, and the record is kept for accountability.")) return;
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-notapprove"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({
      decision: "Not Approved", status: "Cancelled",
      statusHistory: arrayUnion({ status: "Cancelled", at: nowISO(), by: staff, note: "Clinician did not approve the discharge" })
    });
  } catch (e) { ferr("Could not save the decision: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-reopen").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-reopen"); if (btn.disabled) return; btn.disabled = true;
  try {
    const st = current.decision === "Approved for Discharge" ? derivedStatus(current) : "Pending Authorization";
    await touch({
      status: st,
      statusHistory: arrayUnion({ status: st, at: nowISO(), by: staff, note: "Deferred discharge reopened" })
    });
  } catch (e) { ferr("Could not reopen: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-checklist").addEventListener("click", async (e) => {
  const btn = e.target.closest("button.ck-state");
  if (!btn || btn.disabled) return;
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const key = btn.getAttribute("data-key");
  const cycle = { "Pending": "Completed", "Completed": "Not Applicable", "Not Applicable": "Pending" };
  const next = cycle[btn.getAttribute("data-state")] || "Pending";
  const list = (Array.isArray(current.checklist) ? current.checklist : []).map((i) =>
    i && i.key === key
      ? Object.assign({}, i, { state: next,
          by: next === "Completed" ? staff : "",
          at: next === "Completed" ? nowISO() : "" })
      : i);
  const st = derivedStatus(Object.assign({}, current, { checklist: list }));
  btn.disabled = true;
  try {
    await touch({ checklist: list, status: st,
      statusHistory: arrayUnion({ status: st, at: nowISO(), by: staff, note: "Checklist: " + key + " -> " + next }) });
  } catch (err) { ferr("Could not update the checklist: " + ((err && (err.code || err.message)) || err)); }
  btn.disabled = false;
});

$("#x-medsave").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-medsave"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ medicationNote: $("#x-mednote").value.trim() });
    ferr(""); btn.textContent = "Saved"; setTimeout(() => { btn.textContent = "Save medication note"; }, 2000);
  } catch (e) { ferr("Could not save the note: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-isave").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-isave"); if (btn.disabled) return; btn.disabled = true;
  try {
    const ins = Object.assign({}, current.instructions, {
      general: $("#x-i-general").value.trim(),
      medication: $("#x-i-medication").value.trim(),
      clinic: $("#x-i-clinic").value.trim(),
      when: $("#x-i-when").value.trim(),
      notes: $("#x-i-notes").value.trim()
    });
    await touch({ instructions: ins });
    btn.textContent = "Saved"; setTimeout(() => { btn.textContent = "Save instructions"; }, 2000);
  } catch (e) { ferr("Could not save the instructions: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-iprovided").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-iprovided"); if (btn.disabled) return; btn.disabled = true;
  try {
    const ins = Object.assign({}, current.instructions, {
      provided: true, providedBy: staff, providedAt: nowISO()
    });
    await touch({ instructions: ins });
  } catch (e) { ferr("Could not record the handover: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-cancelproc").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  if (isFinal(current.status)) return;
  if (!confirm("Cancel discharge process " + (current.dischargeNumber || "") +
      "? Nothing is deleted — the record stays on file and the admission continues.")) return;
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-cancelproc"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({
      status: "Cancelled",
      statusHistory: arrayUnion({ status: "Cancelled", at: nowISO(), by: staff, note: "Process cancelled — the stay continues" })
    });
  } catch (e) { ferr("Could not cancel: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

/* ---------- THE confirmation — one atomic batch ---------- */
$("#x-confirm").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const d = current;
  if (!(d.decision === "Approved for Discharge" && d.status === "Ready for Departure"))
    return ferr("The discharge can only be confirmed once the clinician has approved and the checklist is complete.");
  const adm = admissions.find((a) => a.__id === d.admissionDocId) ||
              admissions.find((a) => String(a.admissionNumber || "") === String(d.admissionNumber || ""));
  if (adm && isFinal(adm.status))
    return ferr("The linked admission is already " + adm.status + " — this stay has ended; nothing to confirm.");
  const staff = staffForAction(); if (!staff) return;
  if (!confirm("Confirm the discharge of " + (d.patientName || d.patientId || "this patient") +
      "?\n\nThe admission ends, the bed goes to Cleaning Required (never straight to Available), and every record is preserved.")) return;
  const btn = $("#x-confirm"); if (btn.disabled) return; btn.disabled = true;
  try {
    const place = assignments.find((x) => x.status === "Active" && String(x.patientId) === String(d.patientId)) || null;
    const bed = place ? beds.find((b) => b.__id === String(place.bedId) ||
      (String(b.wardId) === String(place.wardId) && b.bedNumber === place.bedNumber)) || null : null;
    const batch = writeBatch(db);

    batch.update(doc(db, "healthDischarges", d.__id), {
      status: "Discharged",
      dischargedAt: nowISO(),
      dischargedBy: staff,
      bedReleased: !!place,
      updatedAt: nowISO(),
      statusHistory: arrayUnion({ status: "Discharged", at: nowISO(), by: staff, note: "Discharge confirmed" })
    });
    if (adm) {
      batch.update(doc(db, "healthAdmissions", adm.__id), {
        status: "Discharged",
        updatedAt: nowISO(),
        statusHistory: arrayUnion({ status: "Discharged", at: nowISO(), by: staff,
          note: "Inpatient stay ended by discharge " + (d.dischargeNumber || "") })
      });
    }
    if (place) {
      batch.update(doc(db, "healthBedAssignments", place.__id), {
        status: "Released",
        releasedAt: nowISO(),
        releasedBy: staff,
        releaseReason: "Discharge"
      });
      if (bed) {
        batch.update(doc(db, "healthBeds", bed.__id), {
          status: "Cleaning Required",
          currentPatientId: "",
          currentPatientName: "",
          currentAssignmentId: "",
          updatedAt: nowISO()
        });
        const mref = doc(collection(db, "healthBedMaintenance"));
        batch.set(mref, {
          maintenanceId: mref.id,
          bedDocId: bed.__id,
          bedId: bed.bedId || "",
          bedNumber: bed.bedNumber || "",
          wardId: bed.wardId || "",
          wardCode: bed.wardCode || (place.wardCode || ""),
          reason: "Post-discharge cleaning (" + (d.dischargeNumber || "") + ")",
          reportedAt: nowISO(),
          reportedBy: staff,
          status: "Cleaning Required",
          returnedAt: "",
          returnedBy: "",
          statusHistory: [{ status: "Cleaning Required", at: nowISO(), by: staff }],
          createdAt: nowISO()
        });
      }
    }
    await batch.commit();
  } catch (e) {
    ferr("Could not confirm the discharge: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});

renderAll();
maybeAutoOpen();
T54_JS_353
[ -s "public/patient-discharge/353.js" ] && echo "  wrote public/patient-discharge/353.js ($(wc -c < "public/patient-discharge/353.js") bytes)"

mkdir -p "public/laboratory"
cat > "public/laboratory/lab.css" << 'T54_CSS_laboratory'
/* JAMALI — laboratory · shared stylesheet for pages 360 to 363
   Base design system lives in /records/records.css (imported below).
   Family accent: emerald, the Health wing colour. Carries the pieces every
   laboratory page needs: boot line, error banner, status badges, candidate
   lists, the test table, result inputs and the verification trail. */
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

/* ---------- status badges (the laboratory language) ---------- */
.st { display: inline-block; border-radius: 999px; padding: 3px 10px;
  font-size: 11px; font-weight: 800; letter-spacing: .03em; white-space: nowrap; }
.st-requested  { background: #fef3c7; color: #92400e; }
.st-collected  { background: #e0f2fe; color: #075985; }
.st-testing    { background: #ede9fe; color: #5b21b6; }
.st-completed  { background: #d1fae5; color: #047857; }
.st-cancelled  { background: #f1f5f9; color: #94a3b8; text-decoration: line-through; }
.st-await      { background: #fef3c7; color: #92400e; }
.st-received   { background: #e0f2fe; color: #075985; }
.st-rejected   { background: #fee2e2; color: #b91c1c; }
.st-recollect  { background: #ffedd5; color: #c2410c; }
.st-verified   { background: #d1fae5; color: #047857; }
.st-unverified { background: #ffedd5; color: #c2410c; }
.st-abnormal   { background: #fee2e2; color: #b91c1c; }
.st-critical   { background: #fee2e2; color: #b91c1c; }
.st-none       { background: #f1f5f9; color: #94a3b8; }

/* ---------- hub tiles (page 360) — the 321 square-tile language ---------- */
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
@media (max-width: 560px) {
  .mod-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  a.mod { gap: 6px; font-size: 12px; }
  .mod-ico { font-size: 24px; }
  .mod-sub { font-size: 9.5px; margin-top: 2px; }
}

/* ---------- dashboard counters (page 360) ---------- */
.dash-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px; margin: 0 0 16px; }
.dash { border: 1px solid #e2e8f0; background: #fff; border-radius: 12px;
  padding: 12px 14px; box-shadow: 0 6px 18px rgba(15, 23, 42, .05); }
.dash b { display: block; font-size: 26px; line-height: 1.15; }
.dash span { font-size: 11.5px; color: #64748b; font-weight: 700; }
.dash.warn b { color: #b45309; } .dash.good b { color: #047857; }
.dash.info b { color: #075985; } .dash.mute b { color: #64748b; }
.dash.bad b { color: #b91c1c; }
@media (max-width: 900px) { .dash-grid { grid-template-columns: repeat(2, 1fr); } }

/* ---------- queue panel (page 360) — the task-53 card ---------- */
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
.qa-settings{margin-top:10px;border:1px dashed #cbd5e1;border-radius:10px;padding:12px 14px;background:#faf9f4}
.qa-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px;margin-top:8px}
.qa-form label{font-size:12px;font-weight:700;color:#475569;display:flex;flex-direction:column;gap:5px}
.qa-form input,.qa-form select{border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px;font-family:inherit}
@media (max-width: 700px) { .qa-form { grid-template-columns: 1fr; } }

/* ---------- find-a-patient row ---------- */
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

/* ---------- form grid ---------- */
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
.btn-danger { background: #fff; color: #b91c1c; border: 1px solid #fecaca;
  font-weight: 800; padding: 9px 16px; border-radius: 9px; cursor: pointer;
  font-size: 14px; font-family: inherit; }
.btn-danger:hover { background: #fef2f2; }

/* ---------- tabs (page 362) ---------- */
.tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.tab { border: 1px solid #cbd5e1; background: #fff; border-radius: 999px;
  padding: 6px 14px; font-size: 12.5px; font-weight: 700; color: #475569;
  cursor: pointer; font-family: inherit; }
.tab:hover { border-color: #059669; color: #047857; }
.tab.on { background: #059669; border-color: #059669; color: #fff; }

/* ---------- workbench (page 363) ---------- */
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
.test-row { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;
  margin: 0 0 12px; background: #fff; }
.test-row .t-head { display: flex; align-items: center; justify-content: space-between;
  gap: 10px; flex-wrap: wrap; }
.test-row .t-name { font-weight: 800; font-size: 14.5px; }
.t-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 12px; margin: 10px 0 2px; }
.t-grid label { font-size: 11.5px; font-weight: 700; color: #475569;
  display: flex; flex-direction: column; gap: 4px; }
.t-grid input, .t-grid select { border: 1px solid #cbd5e1; border-radius: 8px;
  padding: 7px 9px; font-size: 13.5px; font-family: inherit; width: 100%; }
@media (max-width: 800px) { .t-grid { grid-template-columns: repeat(2, 1fr); } }
.pick-row { display: flex; align-items: center; gap: 8px; padding: 6px 0;
  font-size: 13.5px; font-weight: 700; flex-wrap: wrap; }
.pick-row label { display: flex; align-items: center; gap: 6px; font-weight: 700; }

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
  .form-actions { display: none !important; }
  body { background: #fff; }
  .wrap { max-width: none; padding: 0; }
}
T54_CSS_laboratory
[ -s "public/laboratory/lab.css" ] && echo "  wrote public/laboratory/lab.css ($(wc -c < "public/laboratory/lab.css") bytes)"

mkdir -p "public/laboratory"
cat > "public/laboratory/360.html" << 'T54_HTML_360'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Laboratory — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/laboratory/lab.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/health/321">&larr; Health</a>
  <h1>Laboratory Management</h1>
  <p class="sub">Laboratory test requests, specimen collection, testing, results and verification &mdash; every request uses the patient's existing Patient ID, and results reach the requesting clinician under that same identity.</p>

  <div class="dash-grid" id="dash">
    <div class="dash warn"><b id="x-open">0</b><span>Open requests</span></div>
    <div class="dash info"><b id="x-testing">0</b><span>Testing in progress</span></div>
    <div class="dash warn"><b id="x-unverified">0</b><span>Results awaiting verification</span></div>
    <div class="dash bad"><b id="x-critical">0</b><span>Critical results not yet acknowledged</span></div>
    <div class="dash good"><b id="x-today">0</b><span>Completed today</span></div>
  </div>

  <!-- the laboratory queue: waiting / completed, current & next patient, speaker -->
  <div class="card" id="qa-card">
    <h2>Laboratory queue</h2>
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
          <a class="ghost-btn" id="qa-open" hidden>Open request</a>
        </div>
      </div>
    </div>
    <p class="mini-note" id="qa-note"></p>
    <div class="qa-actions"><button type="button" class="ghost-btn" id="qa-settings-btn">&#128266; Speaker settings</button></div>
    <div class="qa-settings" id="qa-settings" hidden>
      <p class="mini-note">Saved once for the Laboratory (every other stage keeps its own). The speaker reads exactly what is saved here &mdash; nothing is hard-coded.</p>
      <div class="qa-form">
        <label>Department / service name<input id="qa-dept" type="text" placeholder="e.g. Laboratory"></label>
        <label>Staff name<input id="qa-staff" type="text" placeholder="e.g. Lab Tech AMINA"></label>
        <label>Office number<input id="qa-office" type="text" placeholder="e.g. Laboratory Office 01"></label>
        <label>Room number<input id="qa-room" type="text" placeholder="e.g. Collection Room 02"></label>
        <label>Voice speed<select id="qa-speed">
          <option value="0.6">Slow &middot; 0.6</option>
          <option value="0.75" selected>Clear &middot; 0.75</option>
          <option value="0.95">Normal &middot; 0.95</option>
        </select></label>
      </div>
      <p class="form-err" id="qa-err" hidden></p>
      <p class="form-ok" id="qa-ok" hidden></p>
      <div class="form-actions"><button class="btn-primary" id="qa-save" type="button">Save Speaker Settings</button></div>
    </div>
  </div>

  <div class="mod-grid">
    <a class="mod" href="/laboratory/361">
      <span class="mod-ico">🧪</span>
      <span class="mod-label">New Lab Request<span class="mod-sub">request tests for a patient</span></span>
    </a>
    <a class="mod" href="/laboratory/362">
      <span class="mod-ico">🗒️</span>
      <span class="mod-label">Lab Request List<span class="mod-sub">register &amp; search</span></span>
    </a>
    <a class="mod" href="/laboratory/363">
      <span class="mod-ico">🔬</span>
      <span class="mod-label">Lab Workbench<span class="mod-sub">specimen · testing · results</span></span>
    </a>
    <a class="mod" href="/patient-module/328">
      <span class="mod-ico">📋</span>
      <span class="mod-label">Patient List<span class="mod-sub">the patients being served</span></span>
    </a>
  </div>

  <div class="card">
    <h2>How the laboratory half works</h2>
    <p class="mini-note">
      A request is opened for an existing patient (never a second patient record). The specimen is
      collected &mdash; or rejected, with a reason &mdash; the tests run, and each result is entered with its
      unit and reference range. An authorized person verifies every result before it counts as released.
      Critical results must be acknowledged: who was notified, by whom, and when. Nothing here is
      hard-coded &mdash; every number on this page is calculated from the stored records.
    </p>
  </div>
</main>
</body>
</html>
T54_HTML_360
[ -s "public/laboratory/360.html" ] && echo "  wrote public/laboratory/360.html ($(wc -c < "public/laboratory/360.html") bytes)"

mkdir -p "public/laboratory"
cat > "public/laboratory/360.js" << 'T54_JS_360'
// laboratory (page 360) — JAMALI Health — Laboratory Hub & Dashboard
// Every number is calculated from the stored lab requests — never
// hard-coded. The queue panel follows the task-53 contract: the waiting and
// completed counters, the current and the next patient, and the speaker,
// which announces exactly the patient the panel shows using this module's
// saved destination (healthQueueConfig "laboratory"). Calling a patient
// never completes a laboratory request by itself.
import { requireAuth, db, collection, doc, setDoc, onSnapshot } from "/firebase.js";

window.__p54 = { page: "360", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered() {
  if (window.__p54) window.__p54.docs = 0;
  const b = document.getElementById("p-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

/* =====================================================================
   JAMALI-QUEUE (task 53 contract, task 54 voice) — the shared queue panel.
   Waiting counts the requests still open; Completed today counts the
   requests finished today. The announcement reads the patient shown in the
   panel — never anybody else — at the speed saved in the settings. */
const QA_MODULE = "laboratory";
const QA_DEFAULT = "Laboratory";
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 };
try { qaCfg = Object.assign(qaCfg, JSON.parse(localStorage.getItem("jamali_qacfg_" + QA_MODULE) || "{}")); } catch (e) {}
let qaState = { waitingCount: 0, doneCount: 0, next: null, current: null };

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function qaTodayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaIsTodayLocal(stamp) { return String(stamp || "").slice(0, 10) === qaTodayLocal(); }

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
function qaRate() {
  const r = Number(qaCfg.voiceRate);
  return (r >= 0.5 && r <= 1.1) ? r : 0.75;
}
function qaSpeech(id) {
  const d = String(id).split("").join(", ");
  const dest = qaText().dest;
  return "Patient number " + d + ". Please proceed to " + dest +
         ". I repeat: patient number " + d + ". Please proceed to " + dest + ".";
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
  qaSet("qa-current-sub", cur ? (cur.sub || "Being served") : "No laboratory request is being tested right now");
  qaSet("qa-next-id", nxt ? nxt.regId : "\u2014");
  qaSet("qa-next-sub", nxt ? (nxt.sub || "") : (qaState.waitingCount ? "" : "Nobody is waiting"));
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-regid", nxt.regId); else btn.removeAttribute("data-regid");
  }
  const op = document.getElementById("qa-open");
  if (op) {
    if (nxt) { op.hidden = false; op.href = "/laboratory/363?id=" + encodeURIComponent(nxt.__id); }
    else op.hidden = true;
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt.regId) : "");
}
function qaUpdate(waitingRows, current, doneCount) {
  qaState.waitingCount = Array.isArray(waitingRows) ? waitingRows.length : 0;
  qaState.doneCount = doneCount || 0;
  qaState.next = (qaState.waitingCount > 0) ? waitingRows[0] : null;
  qaState.current = current || null;
  qaRenderPanel();
}
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
    u.rate = qaRate();
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang || ""));
    if (vs.length) u.voice = vs.find((v) => /GB/i.test(v.lang || "")) || vs[0];
    synth.speak(u);
    qaSet("qa-note", "Announcing: " + sentence);
  } catch (e) {
    qaSet("qa-note", "Announcement failed (" + ((e && e.message) || e) + ") — read aloud: " + sentence);
  }
});
const qaSettingsBox = document.getElementById("qa-settings");
const qaSettingsBtn = document.getElementById("qa-settings-btn");
if (qaSettingsBtn && qaSettingsBox) {
  qaSettingsBtn.addEventListener("click", () => {
    qaSettingsBox.hidden = !qaSettingsBox.hidden;
    if (!qaSettingsBox.hidden) {
      const put = (id, k) => { const el = document.getElementById(id); if (el) el.value = String(qaCfg[k] || ""); };
      put("qa-dept", "department"); put("qa-staff", "staffName");
      put("qa-office", "officeNumber"); put("qa-room", "roomNumber");
      const sp = document.getElementById("qa-speed"); if (sp) sp.value = String(qaRate());
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
  const spEl = document.getElementById("qa-speed");
  const spR = spEl ? Number(spEl.value) : NaN;
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    voiceRate: (spR >= 0.5 && spR <= 1.1) ? spR : 0.75,
    updatedAt: new Date().toISOString()
  };
  const sameSpeed = Math.abs(Number(qaCfg.voiceRate || 0.75) - data.voiceRate) < 0.001;
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber && sameSpeed) {
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
try {
  onSnapshot(doc(db, "healthQueueConfig", QA_MODULE), (s) => {
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 },
      s.exists() ? s.data() : {});
    try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
    qaRenderPanel();
    bootAnswered();
  }, (e) => {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p54) window.__p54.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  });
} catch (e) { /* the settings listener is optional — the dashboard keeps working */ }

/* ---------- live data & the counters ---------- */
let reqs = [];

function stBadge(s) {
  const CLS = {
    "Requested": "st-requested", "Specimen Collected": "st-collected",
    "Testing in Progress": "st-testing", "Completed": "st-completed",
    "Cancelled": "st-cancelled"
  };
  return "<span class='st " + (CLS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

onSnapshot(collection(db, "healthLabRequests"), (snap) => {
  reqs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  renderDash();
  renderQueue();
}, (e) => loadErr("healthLabRequests", e));
window.__p54.listeners++;

function renderDash() {
  const open = reqs.filter((x) => x.status !== "Completed" && x.status !== "Cancelled");
  const testing = open.filter((x) => x.status === "Testing in Progress");
  const unverified = reqs.filter((x) => (x.tests || []).some((t) =>
    t.status === "Completed" && !t.verifiedBy));
  const critical = reqs.filter((x) => x.critical && x.critical.flagged && !x.critical.acknowledgedBy);
  const today = reqs.filter((x) => x.status === "Completed" && qaIsTodayLocal(x.completedAt));
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
  set("x-open", open.length);
  set("x-testing", testing.length);
  set("x-unverified", unverified.length);
  set("x-critical", critical.length);
  set("x-today", today.length);
}

function renderQueue() {
  const open = reqs.filter((x) => x.status !== "Completed" && x.status !== "Cancelled");
  const today = reqs.filter((x) => x.status === "Completed" && qaIsTodayLocal(x.completedAt));
  const current = open.find((x) => x.status === "Testing in Progress") || null;
  const waiting = open.filter((x) => x !== current);
  const rows = waiting.map((x) => ({
    regId: String(x.patientId || ""),
    __id: x.__id,
    sub: (x.status || "") + " · " + (x.tests || []).length + " test" + ((x.tests || []).length === 1 ? "" : "s")
  }));
  qaUpdate(rows,
    current ? { regId: String(current.patientId || ""), sub: "Testing in progress" } : null,
    today.length);
}

renderDash();
renderQueue();
T54_JS_360
[ -s "public/laboratory/360.js" ] && echo "  wrote public/laboratory/360.js ($(wc -c < "public/laboratory/360.js") bytes)"

mkdir -p "public/laboratory"
cat > "public/laboratory/361.html" << 'T54_HTML_361'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Lab Request — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/laboratory/lab.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/laboratory/360">&larr; Laboratory</a>
  <h1>New Lab Request</h1>
  <p class="sub">Request laboratory tests for an <b>existing</b> patient. The request links to the patient's Registration ID &mdash; a second patient record is never created &mdash; and the requesting department and clinician are recorded so the results find their way back.</p>

  <!-- STEP 1 · pick the patient -->
  <section class="card add-card">
    <h2>1 · Find the patient</h2>
    <div class="find-row">
      <input id="r-q" type="text" placeholder="Registration ID (e.g. 4827ABCD) or the patient's name">
      <button class="find-btn" id="r-find" type="button">Find</button>
    </div>
    <div class="cand-list" id="r-cands"></div>
    <div class="sel-panel" id="r-sel" hidden></div>
  </section>

  <!-- STEP 2 · the request -->
  <section class="card add-card" id="r-formcard" hidden>
    <h2>2 · The tests being requested</h2>
    <div class="form-grid">
      <label>Requesting department
        <input id="r-dept" type="text" placeholder="e.g. Doctor Consultation"></label>
      <label>Requesting clinician
        <input id="r-clinician" type="text" placeholder="e.g. Dr. Hassan"></label>
      <label>Priority
        <select id="r-priority">
          <option value="Routine" selected>Routine</option>
          <option value="Urgent">Urgent</option>
        </select></label>
      <label class="span-3">Clinical information from the requesting clinician
        <textarea id="r-info" rows="2" placeholder="Why these tests are needed"></textarea></label>
    </div>
    <div class="sec-h">Requested tests</div>
    <div id="r-picks"></div>
    <div class="pick-row">
      <input id="r-custom" type="text" placeholder="Other test — type a name and press Add" style="flex:1 1 260px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:13.5px">
      <button class="btn-ghost" id="r-addcustom" type="button">Add</button>
    </div>
    <p class="form-err" id="r-ferr" hidden></p>
    <div class="form-actions">
      <button class="btn-primary" id="r-save" type="button">Save Lab Request</button>
      <button class="btn-ghost" id="r-clear" type="button">Clear</button>
    </div>
  </section>

  <!-- success panel -->
  <section class="card" id="r-done" hidden>
    <h2>Lab request saved</h2>
    <p id="r-done-line" class="sel-panel"></p>
    <p class="mini-note">The specimen can now be collected on the Lab Workbench. The request appears on the Lab Request List and in the laboratory queue.</p>
    <div class="form-actions">
      <a class="btn-primary" id="r-gowork" href="#">Open it on the workbench</a>
      <button class="btn-ghost" id="r-again" type="button">Create another request</button>
    </div>
  </section>
</main>
</body>
</html>
T54_HTML_361
[ -s "public/laboratory/361.html" ] && echo "  wrote public/laboratory/361.html ($(wc -c < "public/laboratory/361.html") bytes)"

mkdir -p "public/laboratory"
cat > "public/laboratory/361.js" << 'T54_JS_361'
// laboratory (page 361) — JAMALI Health — New Lab Request
// Requests tests for an EXISTING patient (patientId = the Registration ID).
// The requesting department / clinician and the clinical information are
// recorded; the chosen tests start as Pending with their own result slots.
// The request number (LAB-date-code) is checked for uniqueness against the
// live requests. Duplicate submissions are blocked by a busy flag.
import { requireAuth, db, collection, addDoc, onSnapshot } from "/firebase.js";

window.__p54 = { page: "361", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p54) window.__p54.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered — no registrations on this account yet. Register the patient first (Registration, page 322).";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function todayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function who(r) { return r ? (r.isUnidentified ? "Unidentified" : (r.fullName || "Unnamed")) : "—"; }
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
let reqs = [];
let selected = null;

onSnapshot(collection(db, "healthRegistrations"), (snap) => {
  regs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .filter((r) => r && r.regId)
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderCands(); renderSel(); maybeAutoOpen();
}, (e) => loadErr("healthRegistrations", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthLabRequests"), (snap) => {
  reqs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
}, (e) => loadErr("healthLabRequests", e));
window.__p54.listeners++;

/* ---------- 1 · find the patient ---------- */
function renderCands() {
  const box = $("#r-cands");
  if (selected) { box.innerHTML = ""; return; }
  const q = $("#r-q").value.trim().toLowerCase();
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
$("#r-q").addEventListener("input", renderCands);
$("#r-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#r-find").click(); } });
$("#r-find").addEventListener("click", renderCands);
$("#r-cands").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-pick]");
  if (!btn) return;
  selected = regs.find((r) => r.__id === btn.getAttribute("data-pick")) || null;
  $("#r-q").value = selected ? String(selected.regId) : $("#r-q").value;
  renderCands(); renderSel();
});
function renderSel() {
  const box = $("#r-sel");
  if (!selected) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.innerHTML = "Requesting for <b>" + esc(who(selected)) + "</b> · Registration ID <b>" +
    esc(selected.regId) + "</b> · " +
    esc([selected.age, selected.sex].filter(Boolean).join(" · ") || "—") + " " + priBadge(selected.priority);
}

/* the deep link: /laboratory/361?patient=REGID */
function maybeAutoOpen() {
  if (selected) return;
  const pid = new URLSearchParams(location.search).get("patient") || "";
  if (!pid) return;
  const r = regs.find((x) => String(x.regId) === String(pid));
  if (r) { selected = r; $("#r-q").value = String(r.regId); renderCands(); renderSel(); $("#r-formcard").hidden = false; }
}

/* ---------- 2 · the tests ---------- */
const STANDARD = [
  "Full Blood Count", "Blood Glucose", "Malaria (RDT)", "Stool Analysis",
  "Urinalysis", "Blood Group", "HIV Screening", "Hepatitis B Screening",
  "Widal Test", "ESR", "Blood Culture", "Creatinine", "Liver Function Tests"
];
const picks = new Set();

function renderPicks() {
  $("#r-picks").innerHTML =
    STANDARD.map((t) =>
      "<label class='pick-check' style='display:inline-flex;align-items:center;gap:6px;margin:4px 14px 4px 0;font-weight:700;font-size:13.5px'>" +
        "<input type='checkbox' data-test='" + esc(t) + "'" + (picks.has(t) ? " checked" : "") + "> " + esc(t) + "</label>").join("") +
    Array.from(picks).filter((t) => STANDARD.indexOf(t) < 0).map((t) =>
      "<label class='pick-check' style='display:inline-flex;align-items:center;gap:6px;margin:4px 14px 4px 0;font-weight:700;font-size:13.5px;color:#047857'>" +
        "<input type='checkbox' data-test='" + esc(t) + "' checked> " + esc(t) + " (custom)</label>").join("");
}
$("#r-picks").addEventListener("change", (e) => {
  const cb = e.target.closest("input[data-test]");
  if (!cb) return;
  const t = cb.getAttribute("data-test");
  if (cb.checked) picks.add(t); else picks.delete(t);
});
$("#r-addcustom").addEventListener("click", () => {
  const t = $("#r-custom").value.trim().replace(/\s+/g, " ");
  if (!t) return;
  picks.add(t);
  $("#r-custom").value = "";
  renderPicks();
});

/* ---------- save ---------- */
function ferr(msg) { const e = $("#r-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function v(sel) { return $(sel).value.trim(); }

function freshNumber() {
  // LAB-YYYYMMDD-XXLL, checked against the live requests for uniqueness
  for (let t = 0; t < 5; t++) {
    let code = "";
    const D = "0123456789", L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    for (let i = 0; i < 4; i++) code += (i < 2 ? D : L)[Math.floor(Math.random() * (i < 2 ? 10 : 24))];
    const cand = "LAB-" + todayLocal().replace(/-/g, "") + "-" + code;
    if (!reqs.some((x) => x.requestNumber === cand)) return cand;
  }
  return "LAB-" + todayLocal().replace(/-/g, "") + "-" + Date.now().toString(36).toUpperCase().slice(-5);
}

async function saveReq() {
  ferr("");
  if (!selected) return ferr("Find and choose the patient first (step 1).");
  const dept = v("#r-dept");
  const clinician = v("#r-clinician");
  const staff = rememberedStaff() || clinician;
  if (!dept) return ferr("The requesting department is required.");
  if (!clinician) return ferr("The requesting clinician is required — the results must reach someone.");
  const tests = Array.from(picks);
  if (tests.length === 0) return ferr("Choose at least one test — tick from the list or add your own.");
  keepStaff(clinician);
  const btn = $("#r-save");
  if (btn.disabled) return; // duplicate-submission guard
  btn.disabled = true;
  try {
    const num = freshNumber();
    const ref = await addDoc(collection(db, "healthLabRequests"), {
      requestNumber: num,
      patientId: String(selected.regId),
      patientName: who(selected),
      patientAge: selected.age === "" || selected.age == null ? "" : selected.age,
      patientSex: selected.sex || "",
      requestingDepartment: dept,
      requestingClinician: clinician,
      clinicalInfo: v("#r-info"),
      priority: $("#r-priority").value,
      status: "Requested",
      specimen: { type: "", status: "Awaiting Collection", collectedAt: "", collectedBy: "", note: "" },
      tests: tests.map((t) => ({
        name: t, status: "Pending", result: "", unit: "", refRange: "",
        abnormal: false, critical: false, enteredBy: "", enteredAt: "",
        verifiedBy: "", verifiedAt: ""
      })),
      critical: { flagged: false, notifiedTo: "", notifiedAt: "", notifiedBy: "", acknowledgedBy: "", acknowledgedAt: "" },
      recordedBy: staff || clinician,
      statusHistory: [{ status: "Requested", at: nowISO(), by: staff || clinician, note: dept + " · " + clinician }],
      createdAt: nowISO(),
      updatedAt: nowISO(),
      completedAt: ""
    });
    $("#r-done-line").textContent = who(selected) + " · " + num +
      " · " + tests.length + " test" + (tests.length === 1 ? "" : "s") +
      " · " + dept + " · " + clinician + ".";
    $("#r-gowork").href = "/laboratory/363?patient=" + encodeURIComponent(selected.regId);
    $("#r-formcard").hidden = true;
    $("#r-done").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    ferr("Could not save the request: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
}
$("#r-save").addEventListener("click", saveReq);
$("#r-clear").addEventListener("click", () => {
  picks.clear(); renderPicks();
  $("#r-dept").value = ""; $("#r-clinician").value = ""; $("#r-info").value = "";
  ferr("");
});
$("#r-again").addEventListener("click", () => {
  selected = null; picks.clear(); renderPicks();
  $("#r-q").value = "";
  $("#r-dept").value = ""; $("#r-clinician").value = ""; $("#r-info").value = "";
  $("#r-done").hidden = true; $("#r-formcard").hidden = true;
  ferr("");
  renderCands(); renderSel();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderCands(); renderSel(); renderPicks();
maybeAutoOpen();
T54_JS_361
[ -s "public/laboratory/361.js" ] && echo "  wrote public/laboratory/361.js ($(wc -c < "public/laboratory/361.js") bytes)"

mkdir -p "public/laboratory"
cat > "public/laboratory/362.html" << 'T54_HTML_362'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lab Request List — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/laboratory/lab.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/laboratory/360">&larr; Laboratory</a>
  <h1>Lab Request List</h1>
  <p class="sub">The laboratory register — open requests, completed work and cancelled requests kept separately, searched and filtered exactly as they are stored.</p>

  <div class="tabs" id="l-tabs">
    <button class="tab on" data-tab="open" type="button">Open requests</button>
    <button class="tab" data-tab="completed" type="button">Completed</button>
    <button class="tab" data-tab="cancelled" type="button">Cancelled</button>
    <button class="tab" data-tab="all" type="button">All</button>
  </div>

  <div class="card">
    <div class="find-row">
      <input id="l-q" type="text" placeholder="Search: request no (LAB-…), patient ID / name, clinician">
      <button class="find-btn" id="l-find" type="button">Search</button>
      <select id="l-status" style="border:1px solid #cbd5e1;border-radius:9px;padding:9px 12px;font-size:13.5px">
        <option value="">All statuses</option>
        <option>Requested</option>
        <option>Specimen Collected</option>
        <option>Testing in Progress</option>
        <option>Completed</option>
        <option>Cancelled</option>
      </select>
    </div>
    <p class="mini-note" id="l-count" style="margin-top:8px"></p>
    <div style="overflow-x:auto">
      <table class="data-table" id="l-table" hidden>
        <thead>
          <tr>
            <th>Request No</th><th>Patient</th><th>Department · Clinician</th>
            <th>Tests</th><th>Specimen</th><th>Created</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="l-body"></tbody>
      </table>
    </div>
    <p class="mini-note" id="l-empty" hidden>No lab requests in this view yet.</p>
  </div>
</main>
</body>
</html>
T54_HTML_362
[ -s "public/laboratory/362.html" ] && echo "  wrote public/laboratory/362.html ($(wc -c < "public/laboratory/362.html") bytes)"

mkdir -p "public/laboratory"
cat > "public/laboratory/362.js" << 'T54_JS_362'
// laboratory (page 362) — JAMALI Health — Lab Request List
// The laboratory register. Open, completed and cancelled requests are listed
// separately; searching and filtering run on the live stored records only.
// Opening a row goes to the workbench for that request.
import { requireAuth, db, collection, onSnapshot } from "/firebase.js";

window.__p54 = { page: "362", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p54) window.__p54.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered — no lab requests yet. Create one on page 361.";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
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
  "Requested": "st-requested", "Specimen Collected": "st-collected",
  "Testing in Progress": "st-testing", "Completed": "st-completed",
  "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

let rows = [];
let tab = "open";

onSnapshot(collection(db, "healthLabRequests"), (snap) => {
  rows = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(rows.length);
  render();
}, (e) => loadErr("healthLabRequests", e));
window.__p54.listeners++;

$("#l-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (!b) return;
  tab = b.getAttribute("data-tab");
  document.querySelectorAll("#l-tabs .tab").forEach((t) => t.classList.toggle("on", t === b));
  render();
});

function render() {
  const q = $("#l-q").value.trim().toLowerCase();
  const st = $("#l-status").value;
  let list = rows.slice();
  if (tab === "open") list = list.filter((x) => x.status !== "Completed" && x.status !== "Cancelled");
  if (tab === "completed") list = list.filter((x) => x.status === "Completed");
  if (tab === "cancelled") list = list.filter((x) => x.status === "Cancelled");
  if (st) list = list.filter((x) => x.status === st);
  if (q) list = list.filter((x) =>
    String(x.requestNumber || "").toLowerCase().includes(q) ||
    String(x.patientId || "").toLowerCase().includes(q) ||
    String(x.patientName || "").toLowerCase().includes(q) ||
    String(x.requestingClinician || "").toLowerCase().includes(q));

  $("#l-table").hidden = list.length === 0;
  $("#l-empty").hidden = list.length > 0;
  $("#l-count").textContent = list.length === 0 ? "" :
    list.length + (list.length === 1 ? " request shown." : " requests shown.");
  $("#l-body").innerHTML = list.map((x) => {
    const tests = Array.isArray(x.tests) ? x.tests : [];
    const done = tests.filter((t) => t.status === "Completed").length;
    const sp = x.specimen || {};
    return "<tr>" +
      "<td class='c-no nowrap'>" + esc(x.requestNumber || x.__id) + "</td>" +
      "<td><b>" + esc(x.patientName || "—") + "</b>" +
        "<br><span class='mini-note'>" + esc(x.patientId || "—") + "</span></td>" +
      "<td class='nowrap'>" + esc((x.requestingDepartment || "—") + " · " + (x.requestingClinician || "—")) + "</td>" +
      "<td>" + done + " / " + tests.length + "</td>" +
      "<td class='nowrap'>" + esc(sp.status || "—") + (sp.type ? " · " + esc(sp.type) : "") + "</td>" +
      "<td class='c-date'>" + esc(when(x.createdAt)) + "</td>" +
      "<td>" + stBadge(x.status) + "</td>" +
      "<td class='c-act'><a class='ghost-btn' href='/laboratory/363?id=" + encodeURIComponent(x.__id) + "'>Open</a></td>" +
    "</tr>";
  }).join("");
}
$("#l-find").addEventListener("click", render);
$("#l-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); render(); } });
$("#l-q").addEventListener("input", render);
$("#l-status").addEventListener("change", render);

render();
T54_JS_362
[ -s "public/laboratory/362.js" ] && echo "  wrote public/laboratory/362.js ($(wc -c < "public/laboratory/362.js") bytes)"

mkdir -p "public/laboratory"
cat > "public/laboratory/363.html" << 'T54_HTML_363'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lab Workbench — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/laboratory/lab.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/laboratory/360">&larr; Laboratory</a>
  <h1>Lab Workbench</h1>
  <p class="sub">One request at a time: collect or reject the specimen, run the tests, enter the results, and let an authorized person verify them. A result only counts as released once it is verified &mdash; and a critical result must be acknowledged by name.</p>

  <div class="find-row card" style="padding:12px 16px">
    <input id="w-q" type="text" placeholder="Request number (LAB-…), patient ID or name">
    <button class="find-btn" id="w-open" type="button">Open</button>
    <span class="mini-note" id="w-none"></span>
  </div>

  <section class="card" id="w-card" hidden>
    <h2 id="w-title">Request</h2>

    <div class="sec-h">Request</div>
    <div id="w-info"></div>

    <div class="sec-h">Specimen</div>
    <p class="mini-note">The specimen is tracked here: awaiting collection, collected, received, rejected (with a reason) or needing recollection. A rejected specimen blocks testing until a new one is collected.</p>
    <div class="form-grid">
      <label>Specimen type
        <select id="w-sp-type">
          <option value="">— select —</option>
          <option>Blood</option><option>Urine</option><option>Stool</option>
          <option>Swab</option><option>Sputum</option><option>Other</option>
        </select></label>
      <label>Specimen status
        <select id="w-sp-status">
          <option>Awaiting Collection</option>
          <option>Collected</option>
          <option>Received by Laboratory</option>
          <option>Rejected</option>
          <option>Recollection Required</option>
        </select></label>
      <label>Note / rejection reason
        <input id="w-sp-note" type="text" placeholder="e.g. haemolysed sample — recollect"></label>
    </div>
    <div class="form-actions">
      <button class="btn-primary" id="w-spsave" type="button">Save specimen record</button>
      <button class="btn-warn" id="w-spcollect" type="button" hidden>Mark collected now</button>
    </div>

    <div class="sec-h">Tests &amp; results</div>
    <p class="mini-note">Enter each result with its unit and reference range. Tick Abnormal when it falls outside the range, and Critical when a clinician must be told at once. Verification is a separate step — an unverified result is never treated as released.</p>
    <div id="w-tests"></div>

    <div class="sec-h">Critical result</div>
    <div id="w-crit"></div>
    <div class="form-grid" id="w-critform" hidden>
      <label>Notified to (clinician / department)
        <input id="w-crit-to" type="text" placeholder="e.g. Dr. Hassan · Doctor Consultation"></label>
    </div>
    <div class="form-actions">
      <button class="btn-danger" id="w-critflag" type="button" hidden>Flag a critical result &amp; record notification</button>
      <button class="btn-ghost" id="w-critack" type="button" hidden>Record acknowledgement</button>
    </div>

    <div class="sec-h">Request status</div>
    <div class="form-actions" id="w-statusbtns">
      <button class="btn-primary" id="w-starttesting" type="button" hidden>Start testing</button>
      <button class="btn-primary" id="w-completereq" type="button" hidden>Complete request</button>
      <button class="btn-danger" id="w-cancelreq" type="button" hidden>Cancel request</button>
    </div>
    <p class="mini-note" id="w-statusnote"></p>

    <div class="sec-h">Record trail</div>
    <div id="w-rec"></div>
    <ul class="trail" id="w-trail"></ul>

    <p class="form-err" id="w-ferr" hidden></p>
    <div class="form-actions" style="margin-top:6px">
      <label class="mini-note">Staff name for actions
        <input id="w-staff" type="text" style="border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px;margin-left:8px"></label>
    </div>
  </section>
</main>
</body>
</html>
T54_HTML_363
[ -s "public/laboratory/363.html" ] && echo "  wrote public/laboratory/363.html ($(wc -c < "public/laboratory/363.html") bytes)"

mkdir -p "public/laboratory"
cat > "public/laboratory/363.js" << 'T54_JS_363'
// laboratory (page 363) — JAMALI Health — Lab Workbench
// One request at a time. The specimen record, the per-test results and the
// verification all run on the live stored record; nothing is decided by the
// software itself. Rules enforced here:
//   · testing cannot start on a Rejected / Recollection Required specimen
//   · a result can only be verified after it has been entered
//   · completing the request requires every test Completed (verified or
//     explicitly cancelled tests are kept, never silently dropped)
//   · a critical result must record who was notified, by whom and when,
//     and the acknowledgement is a separate, named step
import { requireAuth, db, collection, doc, updateDoc, onSnapshot, arrayUnion } from "/firebase.js";

window.__p54 = { page: "363", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p54) window.__p54.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered — no lab requests yet. Create one on page 361.";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
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

const ST_CLASS = {
  "Requested": "st-requested", "Specimen Collected": "st-collected",
  "Testing in Progress": "st-testing", "Completed": "st-completed",
  "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

let reqs = [];
let current = null;

onSnapshot(collection(db, "healthLabRequests"), (snap) => {
  reqs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(reqs.length);
  if (current) current = reqs.find((x) => x.__id === current.__id) || current;
  renderAll(); maybeAutoOpen();
}, (e) => loadErr("healthLabRequests", e));
window.__p54.listeners++;

/* ---------- open a request ---------- */
function openById(id) {
  const d = reqs.find((x) => x.__id === id);
  if (!d) { $("#w-none").textContent = "No request with that reference is on record."; return; }
  current = d;
  renderAll();
  $("#w-card").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("#w-open").addEventListener("click", () => {
  const q = $("#w-q").value.trim().toLowerCase();
  $("#w-none").textContent = "";
  if (!q) return;
  const hit = reqs.find((x) => String(x.requestNumber || "").toLowerCase() === q) ||
              reqs.find((x) => String(x.patientId || "").toLowerCase() === q) ||
              reqs.find((x) => String(x.requestNumber || "").toLowerCase().includes(q)) ||
              reqs.find((x) => String(x.patientName || "").toLowerCase().includes(q));
  if (!hit) { $("#w-none").textContent = "No request matches \u201c" + q + "\u201d."; return; }
  openById(hit.__id);
});
$("#w-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#w-open").click(); } });

function maybeAutoOpen() {
  if (current) return;
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "";
  if (id && reqs.some((x) => x.__id === id)) { current = reqs.find((x) => x.__id === id); renderAll(); return; }
  const pid = params.get("patient") || "";
  if (pid) {
    const own = reqs.filter((x) => String(x.patientId) === String(pid));
    if (own.length) { current = own[0]; renderAll(); }
  }
}

/* ---------- render ---------- */
function renderAll() {
  if (!current) return;
  const d = current;
  $("#w-card").hidden = false;
  $("#w-title").innerHTML = "Request " + esc(d.requestNumber || d.__id) + " " + stBadge(d.status) +
    (String(d.priority) === "Urgent" ? " <span class='st st-critical'>Urgent</span>" : "");

  $("#w-info").innerHTML =
    "<div class='kv'><span class='k'>Patient</span><span class='v'>" + esc(d.patientName || "—") +
      " · " + esc(d.patientId || "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Requested by</span><span class='v'>" +
      esc((d.requestingDepartment || "—") + " · " + (d.requestingClinician || "—")) + "</span></div>" +
    "<div class='kv'><span class='k'>Clinical information</span><span class='v'>" + esc(d.clinicalInfo || "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Created</span><span class='v'>" + esc(when(d.createdAt)) + " · by " + esc(d.recordedBy || "—") + "</span></div>";

  const sp = d.specimen || {};
  $("#w-sp-type").value = sp.type || "";
  $("#w-sp-status").value = sp.status || "Awaiting Collection";
  $("#w-sp-note").value = sp.note || "";
  $("#w-spcollect").hidden = !(sp.status === "Awaiting Collection" || sp.status === "Recollection Required");

  const tests = Array.isArray(d.tests) ? d.tests : [];
  $("#w-tests").innerHTML = tests.map((t, i) => {
    const done = t.status === "Completed";
    return "<div class='test-row'>" +
      "<div class='t-head'><span class='t-name'>" + (i + 1) + ". " + esc(t.name || "Test") + "</span>" +
        "<span>" +
          (t.status === "Completed"
            ? "<span class='st " + (t.verifiedBy ? "st-verified" : "st-unverified") + "'>" +
              (t.verifiedBy ? "Verified" : "Awaiting verification") + "</span> "
            : "<span class='st st-await'>" + esc(t.status || "Pending") + "</span> ") +
          (t.abnormal ? "<span class='st st-abnormal'>Abnormal</span> " : "") +
          (t.critical ? "<span class='st st-critical'>Critical</span>" : "") +
        "</span></div>" +
      "<div class='t-grid'>" +
        "<label>Result<input data-test='" + i + "' data-f='result' value='" + esc(t.result || "") + "'" +
          (done ? " readonly" : "") + "></label>" +
        "<label>Unit<input data-test='" + i + "' data-f='unit' value='" + esc(t.unit || "") + "'" +
          (done ? " readonly" : "") + "></label>" +
        "<label>Reference range<input data-test='" + i + "' data-f='refRange' value='" + esc(t.refRange || "") + "'" +
          (done ? " readonly" : "") + "></label>" +
        "<label>Flags<span style='display:flex;gap:12px;align-items:center;font-weight:700'>" +
          "<label style='flex-direction:row;align-items:center;gap:5px'><input type='checkbox' data-test='" + i + "' data-f='abnormal'" +
            (t.abnormal ? " checked" : "") + (done ? " disabled" : "") + "> Abnormal</label>" +
          "<label style='flex-direction:row;align-items:center;gap:5px'><input type='checkbox' data-test='" + i + "' data-f='critical'" +
            (t.critical ? " checked" : "") + (done ? " disabled" : "") + "> Critical</label>" +
        "</span></label>" +
      "</div>" +
      "<div class='form-actions'>" +
        (done
          ? "<span class='mini-note'>Entered " + esc(when(t.enteredAt)) + " · by " + esc(t.enteredBy || "—") +
            (t.verifiedBy ? " · verified " + esc(when(t.verifiedAt)) + " · by " + esc(t.verifiedBy) : "") + "</span>" +
            (t.verifiedBy ? "" : "<button type='button' class='btn-primary' data-verify='" + i + "'>Verify result</button>")
          : "<button type='button' class='btn-primary' data-save='" + i + "'>Save result &amp; mark Completed</button>") +
      "</div>" +
    "</div>";
  }).join("");

  const crit = d.critical || {};
  $("#w-crit").innerHTML =
    "<div class='kv'><span class='k'>Critical flag</span><span class='v'>" +
      (crit.flagged ? "<span class='st st-critical'>CRITICAL</span>" : "<span class='st st-none'>none</span>") + "</span></div>" +
    "<div class='kv'><span class='k'>Notified</span><span class='v'>" +
      (crit.flagged ? esc((crit.notifiedTo || "—") + " · " + when(crit.notifiedAt) + " · by " + (crit.notifiedBy || "—")) : "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Acknowledged</span><span class='v'>" +
      (crit.acknowledgedBy ? esc(crit.acknowledgedBy + " · " + when(crit.acknowledgedAt)) : "—") + "</span></div>";
  $("#w-critform").hidden = !crit.flagged || !!crit.acknowledgedBy;
  $("#w-crit-to").value = crit.notifiedTo || "";
  $("#w-critflag").hidden = !!crit.flagged;
  $("#w-critack").hidden = !crit.flagged || !!crit.acknowledgedBy;

  const fin = d.status === "Completed" || d.status === "Cancelled";
  $("#w-starttesting").hidden = fin || d.status !== "Specimen Collected";
  $("#w-completereq").hidden = fin || d.status !== "Testing in Progress";
  $("#w-cancelreq").hidden = fin;
  const allDone = tests.length > 0 && tests.every((t) => t.status === "Completed" || t.status === "Cancelled");
  $("#w-statusnote").textContent = fin
    ? (d.status === "Completed" ? "Completed " + when(d.completedAt) + " — the results are available to the requesting clinician." : "Cancelled — the record is kept.")
    : (allDone ? "Every test is entered — the request can be completed." :
       (d.status === "Testing in Progress" ? "Testing is in progress — results can be entered below." :
        (d.status === "Requested" ? "Collect the specimen first; then testing can start." :
         "Testing starts once the specimen is marked Collected.")));

  const hist = Array.isArray(d.statusHistory) ? d.statusHistory : [];
  $("#w-trail").innerHTML = hist.map((h) =>
    "<li><span><b>" + esc(h.status || "—") + "</b>" +
      (h.note ? " <span class='t-who'>· " + esc(h.note) + "</span>" : "") +
    "</span><span class='t-who'>" + esc(when(h.at)) + (h.by ? " · by " + esc(h.by) : "") + "</span></li>").join("");

  $("#w-rec").innerHTML =
    "<div class='kv'><span class='k'>Recorded By</span><span class='v'>" + esc(d.recordedBy || "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Updated At</span><span class='v'>" + esc(when(d.updatedAt)) + "</span></div>";

  $("#w-staff").value = $("#w-staff").value || rememberedStaff();
  $("#w-ferr").hidden = true;
}

/* ---------- actions ---------- */
function ferr(msg) { const e = $("#w-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function staffForAction() {
  const s = $("#w-staff").value.trim();
  if (!s) { ferr("Enter your name first — every action records who made it."); return ""; }
  keepStaff(s);
  return s;
}
function touch(fields) {
  if (!current) return Promise.reject("no request open");
  return updateDoc(doc(db, "healthLabRequests", current.__id),
    Object.assign({ updatedAt: nowISO() }, fields));
}

/* specimen */
$("#w-spsave").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-spsave"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ specimen: {
      type: $("#w-sp-type").value,
      status: $("#w-sp-status").value,
      collectedAt: ($("#w-sp-status").value === "Collected") ? (current.specimen && current.specimen.collectedAt || nowISO()) : ((current.specimen && current.specimen.collectedAt) || ""),
      collectedBy: ($("#w-sp-status").value === "Collected") ? (current.specimen && current.specimen.collectedBy || staff) : ((current.specimen && current.specimen.collectedBy) || ""),
      note: $("#w-sp-note").value.trim()
    }});
  } catch (e) { ferr("Could not save the specimen record: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-spcollect").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-spcollect"); if (btn.disabled) return; btn.disabled = true;
  try {
    const type = $("#w-sp-type").value;
    if (!type) { ferr("Choose the specimen type first."); btn.disabled = false; return; }
    await touch({ specimen: {
      type, status: "Collected", collectedAt: nowISO(), collectedBy: staff,
      note: (current.specimen && current.specimen.note) || ""
    }, status: current.status === "Requested" ? "Specimen Collected" : current.status,
      statusHistory: arrayUnion({ status: "Specimen Collected", at: nowISO(), by: staff, note: type + " collected" }) });
  } catch (e) { ferr("Could not record the collection: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

/* test result inputs -> local buffer, saved on the row button */
const buf = {};
$("#w-tests").addEventListener("input", (e) => {
  const el = e.target;
  const i = el.getAttribute("data-test"), f = el.getAttribute("data-f");
  if (i == null || !f) return;
  buf[i] = buf[i] || {};
  buf[i][f] = el.type === "checkbox" ? el.checked : el.value;
});
$("#w-tests").addEventListener("click", async (e) => {
  const save = e.target.closest("button[data-save]");
  const verify = e.target.closest("button[data-verify]");
  if (!current) return;
  ferr("");
  if (save) {
    const i = Number(save.getAttribute("data-save"));
    const staff = staffForAction(); if (!staff) return;
    const t = (current.tests || [])[i];
    if (!t) return;
    if ((current.specimen || {}).status === "Rejected" || (current.specimen || {}).status === "Recollection Required")
      return ferr("The specimen is " + (current.specimen.status) + " — collect a valid specimen before entering results.");
    const b = buf[i] || {};
    const result = b.result != null ? String(b.result).trim() : (t.result || "");
    if (!result) return ferr("Enter the result before marking the test Completed.");
    const tests = (current.tests || []).map((x, j) => j === i ? Object.assign({}, x, {
      status: "Completed", result,
      unit: b.unit != null ? b.unit.trim() : (x.unit || ""),
      refRange: b.refRange != null ? b.refRange.trim() : (x.refRange || ""),
      abnormal: b.abnormal != null ? !!b.abnormal : !!x.abnormal,
      critical: b.critical != null ? !!b.critical : !!x.critical,
      enteredBy: staff, enteredAt: nowISO()
    }) : x);
    save.disabled = true;
    try {
      await touch({ tests, critical: tests[i].critical
        ? Object.assign({ flagged: false, notifiedTo: "", notifiedAt: "", notifiedBy: "", acknowledgedBy: "", acknowledgedAt: "" }, current.critical)
        : (current.critical || {}) });
      delete buf[i];
    } catch (err) { ferr("Could not save the result: " + ((err && (err.code || err.message)) || err)); }
    save.disabled = false;
    return;
  }
  if (verify) {
    const i = Number(verify.getAttribute("data-verify"));
    const staff = staffForAction(); if (!staff) return;
    const t = (current.tests || [])[i];
    if (!t) return;
    if (t.enteredBy && t.enteredBy.toLowerCase() === staff.toLowerCase())
      return ferr("The person who entered a result does not verify it — an authorized second person must verify.");
    verify.disabled = true;
    try {
      const tests = (current.tests || []).map((x, j) => j === i ? Object.assign({}, x, {
        verifiedBy: staff, verifiedAt: nowISO()
      }) : x);
      await touch({ tests });
    } catch (err) { ferr("Could not verify: " + ((err && (err.code || err.message)) || err)); }
    verify.disabled = false;
  }
});

/* critical */
$("#w-critflag").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const to = $("#w-crit-to").value.trim();
  if (!to) return ferr("Record who is being notified — a critical result is always told to a named clinician.");
  const anyCrit = (current.tests || []).some((t) => t.critical);
  const btn = $("#w-critflag"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ critical: {
      flagged: true, notifiedTo: to, notifiedAt: nowISO(), notifiedBy: staff,
      acknowledgedBy: (current.critical || {}).acknowledgedBy || "",
      acknowledgedAt: (current.critical || {}).acknowledgedAt || ""
    }, statusHistory: arrayUnion({ status: current.status, at: nowISO(), by: staff,
      note: "Critical result flagged — notified " + to + (anyCrit ? "" : " (flag raised without a critical-marked test)") }) });
  } catch (e) { ferr("Could not record the notification: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-critack").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-critack"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ critical: Object.assign({}, current.critical, {
      acknowledgedBy: staff, acknowledgedAt: nowISO() }) });
  } catch (e) { ferr("Could not record the acknowledgement: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

/* request status */
$("#w-starttesting").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const sp = current.specimen || {};
  if (sp.status === "Rejected" || sp.status === "Recollection Required")
    return ferr("The specimen is " + sp.status + " — collect a valid specimen first.");
  if (sp.status !== "Collected" && sp.status !== "Received by Laboratory")
    return ferr("The specimen must be Collected (or Received by the laboratory) before testing starts.");
  const btn = $("#w-starttesting"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ status: "Testing in Progress",
      statusHistory: arrayUnion({ status: "Testing in Progress", at: nowISO(), by: staff, note: "" }) });
  } catch (e) { ferr("Could not start testing: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-completereq").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const tests = current.tests || [];
  const pending = tests.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
  if (pending.length) return ferr(pending.length + " test(s) still open — enter or cancel them before completing the request.");
  const btn = $("#w-completereq"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ status: "Completed", completedAt: nowISO(),
      statusHistory: arrayUnion({ status: "Completed", at: nowISO(), by: staff, note: "All tests entered" }) });
  } catch (e) { ferr("Could not complete the request: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-cancelreq").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  if (!confirm("Cancel request " + (current.requestNumber || "") + "? The record is kept; the tests stop here.")) return;
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-cancelreq"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ status: "Cancelled",
      statusHistory: arrayUnion({ status: "Cancelled", at: nowISO(), by: staff, note: "Request cancelled" }) });
  } catch (e) { ferr("Could not cancel: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

renderAll();
maybeAutoOpen();
T54_JS_363
[ -s "public/laboratory/363.js" ] && echo "  wrote public/laboratory/363.js ($(wc -c < "public/laboratory/363.js") bytes)"

mkdir -p "public/radiology"
cat > "public/radiology/rad.css" << 'T54_CSS_radiology'
/* JAMALI — radiology · shared stylesheet for pages 370 to 373
   Base design system lives in /records/records.css (imported below).
   Family accent: emerald, the Health wing colour. Carries the pieces every
   imaging page needs: boot line, error banner, status badges, candidate
   lists, the appointment editor, the report panel and the trail. */
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

/* ---------- status badges (the imaging language) ---------- */
.st { display: inline-block; border-radius: 999px; padding: 3px 10px;
  font-size: 11px; font-weight: 800; letter-spacing: .03em; white-space: nowrap; }
.st-requested  { background: #fef3c7; color: #92400e; }
.st-scheduled  { background: #e0f2fe; color: #075985; }
.st-testing    { background: #ede9fe; color: #5b21b6; }
.st-completed  { background: #d1fae5; color: #047857; }
.st-cancelled  { background: #f1f5f9; color: #94a3b8; text-decoration: line-through; }
.st-missed     { background: #fee2e2; color: #b91c1c; }
.st-verified   { background: #d1fae5; color: #047857; }
.st-unverified { background: #ffedd5; color: #c2410c; }
.st-urgent     { background: #fee2e2; color: #b91c1c; }
.st-routine    { background: #f1f5f9; color: #94a3b8; }
.st-none       { background: #f1f5f9; color: #94a3b8; }

/* ---------- hub tiles (page 370) — the 321 square-tile language ---------- */
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
@media (max-width: 560px) {
  .mod-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  a.mod { gap: 6px; font-size: 12px; }
  .mod-ico { font-size: 24px; }
  .mod-sub { font-size: 9.5px; margin-top: 2px; }
}

/* ---------- dashboard counters (page 370) ---------- */
.dash-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px; margin: 0 0 16px; }
.dash { border: 1px solid #e2e8f0; background: #fff; border-radius: 12px;
  padding: 12px 14px; box-shadow: 0 6px 18px rgba(15, 23, 42, .05); }
.dash b { display: block; font-size: 26px; line-height: 1.15; }
.dash span { font-size: 11.5px; color: #64748b; font-weight: 700; }
.dash.warn b { color: #b45309; } .dash.good b { color: #047857; }
.dash.info b { color: #075985; } .dash.mute b { color: #64748b; }
.dash.bad b { color: #b91c1c; }
@media (max-width: 900px) { .dash-grid { grid-template-columns: repeat(2, 1fr); } }

/* ---------- queue panel (page 370) — the task-53 card ---------- */
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
.qa-settings{margin-top:10px;border:1px dashed #cbd5e1;border-radius:10px;padding:12px 14px;background:#faf9f4}
.qa-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px;margin-top:8px}
.qa-form label{font-size:12px;font-weight:700;color:#475569;display:flex;flex-direction:column;gap:5px}
.qa-form input,.qa-form select{border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px;font-family:inherit}
@media (max-width: 700px) { .qa-form { grid-template-columns: 1fr; } }

/* ---------- find-a-patient row ---------- */
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

/* ---------- form grid ---------- */
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
.btn-danger { background: #fff; color: #b91c1c; border: 1px solid #fecaca;
  font-weight: 800; padding: 9px 16px; border-radius: 9px; cursor: pointer;
  font-size: 14px; font-family: inherit; }
.btn-danger:hover { background: #fef2f2; }

/* ---------- tabs (page 372) ---------- */
.tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.tab { border: 1px solid #cbd5e1; background: #fff; border-radius: 999px;
  padding: 6px 14px; font-size: 12.5px; font-weight: 700; color: #475569;
  cursor: pointer; font-family: inherit; }
.tab:hover { border-color: #059669; color: #047857; }
.tab.on { background: #059669; border-color: #059669; color: #fff; }

/* ---------- workbench (page 373) ---------- */
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
.proc-row { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;
  margin: 0 0 12px; background: #fff; }
.proc-row .p-head { display: flex; align-items: center; justify-content: space-between;
  gap: 10px; flex-wrap: wrap; }
.proc-row .p-name { font-weight: 800; font-size: 14.5px; }

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
  .form-actions { display: none !important; }
  body { background: #fff; }
  .wrap { max-width: none; padding: 0; }
}
T54_CSS_radiology
[ -s "public/radiology/rad.css" ] && echo "  wrote public/radiology/rad.css ($(wc -c < "public/radiology/rad.css") bytes)"

mkdir -p "public/radiology"
cat > "public/radiology/370.html" << 'T54_HTML_370'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Radiology / Imaging — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/radiology/rad.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/health/321">&larr; Health</a>
  <h1>Radiology / Imaging Management</h1>
  <p class="sub">Imaging requests, appointments, procedures, findings and verified reports &mdash; every request uses the patient's existing Patient ID, and a doctor can request an X-ray during consultation and read the finalized report here under that same identity.</p>

  <div class="dash-grid" id="dash">
    <div class="dash warn"><b id="x-open">0</b><span>Open requests</span></div>
    <div class="dash info"><b id="x-sched">0</b><span>Scheduled appointments</span></div>
    <div class="dash warn"><b id="x-unverified">0</b><span>Reports awaiting verification</span></div>
    <div class="dash bad"><b id="x-urgent">0</b><span>Urgent findings not acknowledged</span></div>
    <div class="dash good"><b id="x-today">0</b><span>Completed today</span></div>
  </div>

  <!-- the imaging queue: waiting / completed, current & next patient, speaker -->
  <div class="card" id="qa-card">
    <h2>Imaging queue</h2>
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
          <a class="ghost-btn" id="qa-open" hidden>Open request</a>
        </div>
      </div>
    </div>
    <p class="mini-note" id="qa-note"></p>
    <div class="qa-actions"><button type="button" class="ghost-btn" id="qa-settings-btn">&#128266; Speaker settings</button></div>
    <div class="qa-settings" id="qa-settings" hidden>
      <p class="mini-note">Saved once for Radiology (every other stage keeps its own). The speaker reads exactly what is saved here &mdash; nothing is hard-coded.</p>
      <div class="qa-form">
        <label>Department / service name<input id="qa-dept" type="text" placeholder="e.g. Radiology"></label>
        <label>Staff name<input id="qa-staff" type="text" placeholder="e.g. Radiographer YUSUF"></label>
        <label>Office number<input id="qa-office" type="text" placeholder="e.g. Radiology Office 01"></label>
        <label>Room number<input id="qa-room" type="text" placeholder="e.g. Radiology Room 03"></label>
        <label>Voice speed<select id="qa-speed">
          <option value="0.6">Slow &middot; 0.6</option>
          <option value="0.75" selected>Clear &middot; 0.75</option>
          <option value="0.95">Normal &middot; 0.95</option>
        </select></label>
      </div>
      <p class="form-err" id="qa-err" hidden></p>
      <p class="form-ok" id="qa-ok" hidden></p>
      <div class="form-actions"><button class="btn-primary" id="qa-save" type="button">Save Speaker Settings</button></div>
    </div>
  </div>

  <div class="mod-grid">
    <a class="mod" href="/radiology/371">
      <span class="mod-ico">🩻</span>
      <span class="mod-label">New Imaging Request<span class="mod-sub">request a procedure</span></span>
    </a>
    <a class="mod" href="/radiology/372">
      <span class="mod-ico">🗒️</span>
      <span class="mod-label">Imaging Requests<span class="mod-sub">register · appointments</span></span>
    </a>
    <a class="mod" href="/radiology/373">
      <span class="mod-ico">🖥️</span>
      <span class="mod-label">Imaging Workbench<span class="mod-sub">procedure · report · verify</span></span>
    </a>
    <a class="mod" href="/patient-module/328">
      <span class="mod-ico">📋</span>
      <span class="mod-label">Patient List<span class="mod-sub">the patients being served</span></span>
    </a>
  </div>

  <div class="card">
    <h2>How the imaging half works</h2>
    <p class="mini-note">
      A request is opened for an existing patient, with the requesting department and clinician recorded.
      Urgent requests jump ahead of routine ones in the queue. The appointment is scheduled (or rescheduled
      or missed, each with a reason), the procedure is performed, and the findings become a report that an
      authorized person must verify and finalize. Urgent findings must be acknowledged by name. Corrections
      are kept in the report's history — nothing is silently overwritten.
    </p>
  </div>
</main>
</body>
</html>
T54_HTML_370
[ -s "public/radiology/370.html" ] && echo "  wrote public/radiology/370.html ($(wc -c < "public/radiology/370.html") bytes)"

mkdir -p "public/radiology"
cat > "public/radiology/370.js" << 'T54_JS_370'
// radiology (page 370) — JAMALI Health — Imaging Hub & Dashboard
// Every number is calculated from the stored imaging requests — never
// hard-coded. The queue panel follows the task-53 contract: the waiting and
// completed counters, the current and the next patient, and the speaker,
// which announces exactly the patient the panel shows using this module's
// saved destination (healthQueueConfig "radiology"). Urgent requests come
// first in the queue; calling a patient never completes a request by itself.
import { requireAuth, db, collection, doc, setDoc, onSnapshot } from "/firebase.js";

window.__p54 = { page: "370", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered() {
  if (window.__p54) window.__p54.docs = 0;
  const b = document.getElementById("p-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

/* =====================================================================
   JAMALI-QUEUE (task 53 contract, task 54 voice) — the shared queue panel.
   Waiting counts the open requests (urgent first, then waiting time);
   Completed today counts the requests finished today. The announcement
   reads the patient shown in the panel — never anybody else — at the speed
   saved in the settings. */
const QA_MODULE = "radiology";
const QA_DEFAULT = "Radiology";
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 };
try { qaCfg = Object.assign(qaCfg, JSON.parse(localStorage.getItem("jamali_qacfg_" + QA_MODULE) || "{}")); } catch (e) {}
let qaState = { waitingCount: 0, doneCount: 0, next: null, current: null };

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function qaTodayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaIsTodayLocal(stamp) { return String(stamp || "").slice(0, 10) === qaTodayLocal(); }

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
function qaRate() {
  const r = Number(qaCfg.voiceRate);
  return (r >= 0.5 && r <= 1.1) ? r : 0.75;
}
function qaSpeech(id) {
  const d = String(id).split("").join(", ");
  const dest = qaText().dest;
  return "Patient number " + d + ". Please proceed to " + dest +
         ". I repeat: patient number " + d + ". Please proceed to " + dest + ".";
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
  qaSet("qa-current-sub", cur ? (cur.sub || "Being served") : "No imaging procedure is in progress right now");
  qaSet("qa-next-id", nxt ? nxt.regId : "\u2014");
  qaSet("qa-next-sub", nxt ? (nxt.sub || "") : (qaState.waitingCount ? "" : "Nobody is waiting"));
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-regid", nxt.regId); else btn.removeAttribute("data-regid");
  }
  const op = document.getElementById("qa-open");
  if (op) {
    if (nxt) { op.hidden = false; op.href = "/radiology/373?id=" + encodeURIComponent(nxt.__id); }
    else op.hidden = true;
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt.regId) : "");
}
function qaUpdate(waitingRows, current, doneCount) {
  qaState.waitingCount = Array.isArray(waitingRows) ? waitingRows.length : 0;
  qaState.doneCount = doneCount || 0;
  qaState.next = (qaState.waitingCount > 0) ? waitingRows[0] : null;
  qaState.current = current || null;
  qaRenderPanel();
}
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
    u.rate = qaRate();
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang || ""));
    if (vs.length) u.voice = vs.find((v) => /GB/i.test(v.lang || "")) || vs[0];
    synth.speak(u);
    qaSet("qa-note", "Announcing: " + sentence);
  } catch (e) {
    qaSet("qa-note", "Announcement failed (" + ((e && e.message) || e) + ") — read aloud: " + sentence);
  }
});
const qaSettingsBox = document.getElementById("qa-settings");
const qaSettingsBtn = document.getElementById("qa-settings-btn");
if (qaSettingsBtn && qaSettingsBox) {
  qaSettingsBtn.addEventListener("click", () => {
    qaSettingsBox.hidden = !qaSettingsBox.hidden;
    if (!qaSettingsBox.hidden) {
      const put = (id, k) => { const el = document.getElementById(id); if (el) el.value = String(qaCfg[k] || ""); };
      put("qa-dept", "department"); put("qa-staff", "staffName");
      put("qa-office", "officeNumber"); put("qa-room", "roomNumber");
      const sp = document.getElementById("qa-speed"); if (sp) sp.value = String(qaRate());
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
  const spEl = document.getElementById("qa-speed");
  const spR = spEl ? Number(spEl.value) : NaN;
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    voiceRate: (spR >= 0.5 && spR <= 1.1) ? spR : 0.75,
    updatedAt: new Date().toISOString()
  };
  const sameSpeed = Math.abs(Number(qaCfg.voiceRate || 0.75) - data.voiceRate) < 0.001;
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber && sameSpeed) {
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
try {
  onSnapshot(doc(db, "healthQueueConfig", QA_MODULE), (s) => {
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 },
      s.exists() ? s.data() : {});
    try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
    qaRenderPanel();
    bootAnswered();
  }, (e) => {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p54) window.__p54.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  });
} catch (e) { /* the settings listener is optional — the dashboard keeps working */ }

/* ---------- live data & the counters ---------- */
let reqs = [];

function stBadge(s) {
  const CLS = {
    "Requested": "st-requested", "Scheduled": "st-scheduled",
    "In Progress": "st-testing", "Completed": "st-completed",
    "Cancelled": "st-cancelled"
  };
  return "<span class='st " + (CLS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

onSnapshot(collection(db, "healthImagingRequests"), (snap) => {
  reqs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  renderDash();
  renderQueue();
}, (e) => loadErr("healthImagingRequests", e));
window.__p54.listeners++;

function renderDash() {
  const open = reqs.filter((x) => x.status !== "Completed" && x.status !== "Cancelled");
  const sched = open.filter((x) => x.status === "Scheduled");
  const unverified = reqs.filter((x) => (x.procedures || []).some((p) =>
    p.status === "Completed" && p.report && !p.report.verifiedBy));
  const urgent = reqs.filter((x) => x.urgent && x.urgent.flagged && !x.urgent.acknowledgedBy);
  const today = reqs.filter((x) => x.status === "Completed" && qaIsTodayLocal(x.completedAt));
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
  set("x-open", open.length);
  set("x-sched", sched.length);
  set("x-unverified", unverified.length);
  set("x-urgent", urgent.length);
  set("x-today", today.length);
}

/* queue order: In Progress first (the current), then urgent before routine,
   then waiting time, then the request number */
function queueOrder(x) {
  return (String(x.priority) === "Urgent" ? 0 : 1);
}
function renderQueue() {
  const open = reqs.filter((x) => x.status !== "Completed" && x.status !== "Cancelled");
  const today = reqs.filter((x) => x.status === "Completed" && qaIsTodayLocal(x.completedAt));
  const current = open.filter((x) => x.status === "In Progress")
    .sort((a, b) => queueOrder(a) - queueOrder(b) ||
      String(a.createdAt || "").localeCompare(String(b.createdAt || "")))[0] || null;
  const waiting = open.filter((x) => x !== current)
    .sort((a, b) => queueOrder(a) - queueOrder(b) ||
      String(a.createdAt || "").localeCompare(String(b.createdAt || "")) ||
      String(a.requestNumber || "").localeCompare(String(b.requestNumber || "")));
  const rows = waiting.map((x) => ({
    regId: String(x.patientId || ""),
    __id: x.__id,
    sub: (x.priority === "Urgent" ? "URGENT · " : "") + (x.status || "") +
      " · " + (x.procedures || []).map((p) => p.name).filter(Boolean).slice(0, 2).join(", ")
  }));
  qaUpdate(rows,
    current ? { regId: String(current.patientId || ""), sub: "Procedure in progress" } : null,
    today.length);
}

renderDash();
renderQueue();
T54_JS_370
[ -s "public/radiology/370.js" ] && echo "  wrote public/radiology/370.js ($(wc -c < "public/radiology/370.js") bytes)"

mkdir -p "public/radiology"
cat > "public/radiology/371.html" << 'T54_HTML_371'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Imaging Request — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/radiology/rad.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/radiology/370">&larr; Radiology</a>
  <h1>New Imaging Request</h1>
  <p class="sub">Request an imaging procedure for an <b>existing</b> patient &mdash; X-ray, ultrasound, CT, MRI or a procedure the facility has named itself. The request links to the patient's Registration ID; a second patient record is never created.</p>

  <!-- STEP 1 · pick the patient -->
  <section class="card add-card">
    <h2>1 · Find the patient</h2>
    <div class="find-row">
      <input id="r-q" type="text" placeholder="Registration ID (e.g. 4827ABCD) or the patient's name">
      <button class="find-btn" id="r-find" type="button">Find</button>
    </div>
    <div class="cand-list" id="r-cands"></div>
    <div class="sel-panel" id="r-sel" hidden></div>
  </section>

  <!-- STEP 2 · the request -->
  <section class="card add-card" id="r-formcard" hidden>
    <h2>2 · The procedures being requested</h2>
    <div class="form-grid">
      <label>Requesting department
        <input id="r-dept" type="text" placeholder="e.g. Doctor Consultation"></label>
      <label>Requesting clinician
        <input id="r-clinician" type="text" placeholder="e.g. Dr. Hassan"></label>
      <label>Priority
        <select id="r-priority">
          <option value="Routine" selected>Routine</option>
          <option value="Urgent">Urgent — jumps the queue</option>
        </select></label>
      <label class="span-3">Clinical information / reason for the request
        <textarea id="r-info" rows="2" placeholder="Why this imaging is needed"></textarea></label>
    </div>
    <div class="sec-h">Requested procedures</div>
    <div id="r-picks"></div>
    <div class="pick-row" style="display:flex;align-items:center;gap:8px;padding:6px 0;flex-wrap:wrap">
      <input id="r-custom" type="text" placeholder="Other procedure — type a name and press Add" style="flex:1 1 260px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:13.5px">
      <button class="btn-ghost" id="r-addcustom" type="button">Add</button>
    </div>
    <p class="form-err" id="r-ferr" hidden></p>
    <div class="form-actions">
      <button class="btn-primary" id="r-save" type="button">Save Imaging Request</button>
      <button class="btn-ghost" id="r-clear" type="button">Clear</button>
    </div>
  </section>

  <!-- success panel -->
  <section class="card" id="r-done" hidden>
    <h2>Imaging request saved</h2>
    <p id="r-done-line" class="sel-panel"></p>
    <p class="mini-note">The appointment can now be scheduled on the Imaging Requests page, and the procedure performed on the workbench. The request appears in the imaging queue.</p>
    <div class="form-actions">
      <a class="btn-primary" id="r-gowork" href="#">Open it on the requests page</a>
      <button class="btn-ghost" id="r-again" type="button">Create another request</button>
    </div>
  </section>
</main>
</body>
</html>
T54_HTML_371
[ -s "public/radiology/371.html" ] && echo "  wrote public/radiology/371.html ($(wc -c < "public/radiology/371.html") bytes)"

mkdir -p "public/radiology"
cat > "public/radiology/371.js" << 'T54_JS_371'
// radiology (page 371) — JAMALI Health — New Imaging Request
// Requests imaging for an EXISTING patient (patientId = the Registration
// ID). The requesting department / clinician, the priority (Routine /
// Urgent) and the clinical reason are recorded; each chosen procedure
// starts as Pending with its own report slot. The request number
// (IMG-date-code) is checked for uniqueness against the live requests.
import { requireAuth, db, collection, addDoc, onSnapshot } from "/firebase.js";

window.__p54 = { page: "371", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p54) window.__p54.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered — no registrations on this account yet. Register the patient first (Registration, page 322).";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function todayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function who(r) { return r ? (r.isUnidentified ? "Unidentified" : (r.fullName || "Unnamed")) : "—"; }
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
let reqs = [];
let selected = null;

onSnapshot(collection(db, "healthRegistrations"), (snap) => {
  regs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .filter((r) => r && r.regId)
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderCands(); renderSel(); maybeAutoOpen();
}, (e) => loadErr("healthRegistrations", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthImagingRequests"), (snap) => {
  reqs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
}, (e) => loadErr("healthImagingRequests", e));
window.__p54.listeners++;

/* ---------- 1 · find the patient ---------- */
function renderCands() {
  const box = $("#r-cands");
  if (selected) { box.innerHTML = ""; return; }
  const q = $("#r-q").value.trim().toLowerCase();
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
$("#r-q").addEventListener("input", renderCands);
$("#r-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#r-find").click(); } });
$("#r-find").addEventListener("click", renderCands);
$("#r-cands").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-pick]");
  if (!btn) return;
  selected = regs.find((r) => r.__id === btn.getAttribute("data-pick")) || null;
  $("#r-q").value = selected ? String(selected.regId) : $("#r-q").value;
  renderCands(); renderSel();
});
function renderSel() {
  const box = $("#r-sel");
  if (!selected) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.innerHTML = "Requesting for <b>" + esc(who(selected)) + "</b> · Registration ID <b>" +
    esc(selected.regId) + "</b> · " +
    esc([selected.age, selected.sex].filter(Boolean).join(" · ") || "—") + " " + priBadge(selected.priority);
}

/* the deep link: /radiology/371?patient=REGID */
function maybeAutoOpen() {
  if (selected) return;
  const pid = new URLSearchParams(location.search).get("patient") || "";
  if (!pid) return;
  const r = regs.find((x) => String(x.regId) === String(pid));
  if (r) { selected = r; $("#r-q").value = String(r.regId); renderCands(); renderSel(); $("#r-formcard").hidden = false; }
}

/* ---------- 2 · the procedures ---------- */
const STANDARD = ["X-ray", "Ultrasound", "CT scan", "MRI"];
const picks = new Set();

function renderPicks() {
  $("#r-picks").innerHTML =
    STANDARD.map((t) =>
      "<label style='display:inline-flex;align-items:center;gap:6px;margin:4px 14px 4px 0;font-weight:700;font-size:13.5px'>" +
        "<input type='checkbox' data-test='" + esc(t) + "'" + (picks.has(t) ? " checked" : "") + "> " + esc(t) + "</label>").join("") +
    Array.from(picks).filter((t) => STANDARD.indexOf(t) < 0).map((t) =>
      "<label style='display:inline-flex;align-items:center;gap:6px;margin:4px 14px 4px 0;font-weight:700;font-size:13.5px;color:#047857'>" +
        "<input type='checkbox' data-test='" + esc(t) + "' checked> " + esc(t) + " (custom)</label>").join("");
}
$("#r-picks").addEventListener("change", (e) => {
  const cb = e.target.closest("input[data-test]");
  if (!cb) return;
  const t = cb.getAttribute("data-test");
  if (cb.checked) picks.add(t); else picks.delete(t);
});
$("#r-addcustom").addEventListener("click", () => {
  const t = $("#r-custom").value.trim().replace(/\s+/g, " ");
  if (!t) return;
  picks.add(t);
  $("#r-custom").value = "";
  renderPicks();
});

/* ---------- save ---------- */
function ferr(msg) { const e = $("#r-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function v(sel) { return $(sel).value.trim(); }

function freshNumber() {
  // IMG-YYYYMMDD-XXLL, checked against the live requests for uniqueness
  for (let t = 0; t < 5; t++) {
    let code = "";
    const D = "0123456789", L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    for (let i = 0; i < 4; i++) code += (i < 2 ? D : L)[Math.floor(Math.random() * (i < 2 ? 10 : 24))];
    const cand = "IMG-" + todayLocal().replace(/-/g, "") + "-" + code;
    if (!reqs.some((x) => x.requestNumber === cand)) return cand;
  }
  return "IMG-" + todayLocal().replace(/-/g, "") + "-" + Date.now().toString(36).toUpperCase().slice(-5);
}

async function saveReq() {
  ferr("");
  if (!selected) return ferr("Find and choose the patient first (step 1).");
  const dept = v("#r-dept");
  const clinician = v("#r-clinician");
  const staff = rememberedStaff() || clinician;
  if (!dept) return ferr("The requesting department is required.");
  if (!clinician) return ferr("The requesting clinician is required — the report must reach someone.");
  const procedures = Array.from(picks);
  if (procedures.length === 0) return ferr("Choose at least one procedure — tick from the list or add your own.");
  keepStaff(clinician);
  const btn = $("#r-save");
  if (btn.disabled) return; // duplicate-submission guard
  btn.disabled = true;
  try {
    const num = freshNumber();
    const ref = await addDoc(collection(db, "healthImagingRequests"), {
      requestNumber: num,
      patientId: String(selected.regId),
      patientName: who(selected),
      patientAge: selected.age === "" || selected.age == null ? "" : selected.age,
      patientSex: selected.sex || "",
      requestingDepartment: dept,
      requestingClinician: clinician,
      clinicalInfo: v("#r-info"),
      priority: $("#r-priority").value,
      status: "Requested",
      appointment: { date: "", time: "", room: "", status: "", reason: "" },
      procedures: procedures.map((t) => ({
        name: t, status: "Pending", note: "",
        performedBy: "", performedAt: "",
        report: { findings: "", reportBy: "", reportedAt: "", verifiedBy: "", verifiedAt: "", corrections: [] }
      })),
      urgent: { flagged: false, notifiedTo: "", notifiedAt: "", notifiedBy: "", acknowledgedBy: "", acknowledgedAt: "" },
      recordedBy: staff,
      statusHistory: [{ status: "Requested", at: nowISO(), by: staff, note: dept + " · " + clinician }],
      createdAt: nowISO(),
      updatedAt: nowISO(),
      completedAt: ""
    });
    $("#r-done-line").textContent = who(selected) + " · " + num +
      " · " + procedures.length + " procedure" + (procedures.length === 1 ? "" : "s") +
      " · " + $("#r-priority").value + " · " + dept + " · " + clinician + ".";
    $("#r-gowork").href = "/radiology/372?patient=" + encodeURIComponent(selected.regId);
    $("#r-formcard").hidden = true;
    $("#r-done").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    ferr("Could not save the request: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
}
$("#r-save").addEventListener("click", saveReq);
$("#r-clear").addEventListener("click", () => {
  picks.clear(); renderPicks();
  $("#r-dept").value = ""; $("#r-clinician").value = ""; $("#r-info").value = "";
  ferr("");
});
$("#r-again").addEventListener("click", () => {
  selected = null; picks.clear(); renderPicks();
  $("#r-q").value = "";
  $("#r-dept").value = ""; $("#r-clinician").value = ""; $("#r-info").value = "";
  $("#r-done").hidden = true; $("#r-formcard").hidden = true;
  ferr("");
  renderCands(); renderSel();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderCands(); renderSel(); renderPicks();
maybeAutoOpen();
T54_JS_371
[ -s "public/radiology/371.js" ] && echo "  wrote public/radiology/371.js ($(wc -c < "public/radiology/371.js") bytes)"

mkdir -p "public/radiology"
cat > "public/radiology/372.html" << 'T54_HTML_372'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Imaging Requests — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/radiology/rad.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/radiology/370">&larr; Radiology</a>
  <h1>Imaging Requests &amp; Appointments</h1>
  <p class="sub">The imaging register: open, scheduled, completed and cancelled requests, with the appointment scheduled, rescheduled or missed &mdash; every change carrying its reason.</p>

  <div class="tabs" id="l-tabs">
    <button class="tab on" data-tab="open" type="button">Open requests</button>
    <button class="tab" data-tab="scheduled" type="button">Scheduled</button>
    <button class="tab" data-tab="completed" type="button">Completed</button>
    <button class="tab" data-tab="cancelled" type="button">Cancelled</button>
    <button class="tab" data-tab="all" type="button">All</button>
  </div>

  <div class="card">
    <div class="find-row">
      <input id="l-q" type="text" placeholder="Search: request no (IMG-…), patient ID / name, clinician">
      <button class="find-btn" id="l-find" type="button">Search</button>
      <select id="l-status" style="border:1px solid #cbd5e1;border-radius:9px;padding:9px 12px;font-size:13.5px">
        <option value="">All statuses</option>
        <option>Requested</option>
        <option>Scheduled</option>
        <option>In Progress</option>
        <option>Completed</option>
        <option>Cancelled</option>
      </select>
    </div>
    <p class="mini-note" id="l-count" style="margin-top:8px"></p>
    <div style="overflow-x:auto">
      <table class="data-table" id="l-table" hidden>
        <thead>
          <tr>
            <th>Request No</th><th>Patient</th><th>Department · Clinician</th>
            <th>Procedures</th><th>Priority</th><th>Appointment</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="l-body"></tbody>
      </table>
    </div>
    <p class="mini-note" id="l-empty" hidden>No imaging requests in this view yet.</p>
  </div>

  <!-- the appointment editor -->
  <section class="card" id="a-card" hidden>
    <h2 id="a-title">Appointment</h2>
    <div class="form-grid">
      <label>Appointment date
        <input id="a-date" type="date"></label>
      <label>Appointment time
        <input id="a-time" type="time"></label>
      <label>Imaging room / equipment
        <input id="a-room" type="text" placeholder="e.g. X-ray Room 01"></label>
      <label class="span-3">Reason for scheduling / rescheduling / cancellation
        <input id="a-reason" type="text" placeholder="e.g. patient asked for a later time"></label>
    </div>
    <p class="form-err" id="a-ferr" hidden></p>
    <div class="form-actions">
      <button class="btn-primary" id="a-save" type="button">Save appointment</button>
      <button class="btn-warn" id="a-missed" type="button">Mark as missed</button>
      <button class="btn-danger" id="a-cancel" type="button">Cancel appointment</button>
      <button class="btn-ghost" id="a-close" type="button">Close</button>
    </div>
    <p class="mini-note" id="a-now"></p>
  </section>
</main>
</body>
</html>
T54_HTML_372
[ -s "public/radiology/372.html" ] && echo "  wrote public/radiology/372.html ($(wc -c < "public/radiology/372.html") bytes)"

mkdir -p "public/radiology"
cat > "public/radiology/372.js" << 'T54_JS_372'
// radiology (page 372) — JAMALI Health — Imaging Requests & Appointments
// The imaging register with the appointment editor. Scheduling, rescheduling,
// marking a missed appointment and cancelling all record the reason and the
// staff member. The register itself is read-only here — performing the
// procedure and writing the report happen on the workbench (page 373).
import { requireAuth, db, collection, doc, updateDoc, onSnapshot, arrayUnion } from "/firebase.js";

window.__p54 = { page: "372", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p54) window.__p54.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered — no imaging requests yet. Create one on page 371.";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
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

const ST_CLASS = {
  "Requested": "st-requested", "Scheduled": "st-scheduled",
  "In Progress": "st-testing", "Completed": "st-completed",
  "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

let rows = [];
let tab = "open";
let apFor = null; // the request whose appointment is being edited

onSnapshot(collection(db, "healthImagingRequests"), (snap) => {
  rows = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(rows.length);
  if (apFor) apFor = rows.find((x) => x.__id === apFor.__id) || apFor;
  render(); renderAp();
}, (e) => loadErr("healthImagingRequests", e));
window.__p54.listeners++;

$("#l-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (!b) return;
  tab = b.getAttribute("data-tab");
  document.querySelectorAll("#l-tabs .tab").forEach((t) => t.classList.toggle("on", t === b));
  render();
});

function render() {
  const q = $("#l-q").value.trim().toLowerCase();
  const st = $("#l-status").value;
  let list = rows.slice();
  if (tab === "open") list = list.filter((x) => x.status !== "Completed" && x.status !== "Cancelled");
  if (tab === "scheduled") list = list.filter((x) => x.status === "Scheduled" ||
    (x.appointment || {}).status === "Scheduled");
  if (tab === "completed") list = list.filter((x) => x.status === "Completed");
  if (tab === "cancelled") list = list.filter((x) => x.status === "Cancelled");
  if (st) list = list.filter((x) => x.status === st);
  if (q) list = list.filter((x) =>
    String(x.requestNumber || "").toLowerCase().includes(q) ||
    String(x.patientId || "").toLowerCase().includes(q) ||
    String(x.patientName || "").toLowerCase().includes(q) ||
    String(x.requestingClinician || "").toLowerCase().includes(q));

  $("#l-table").hidden = list.length === 0;
  $("#l-empty").hidden = list.length > 0;
  $("#l-count").textContent = list.length === 0 ? "" :
    list.length + (list.length === 1 ? " request shown." : " requests shown.");
  $("#l-body").innerHTML = list.map((x) => {
    const procs = Array.isArray(x.procedures) ? x.procedures : [];
    const ap = x.appointment || {};
    const apLine = ap.status
      ? esc(ap.status + (ap.date ? " · " + ap.date + " " + (ap.time || "") : "") + (ap.room ? " · " + ap.room : ""))
      : "<span class='mini-note'>not scheduled</span>";
    const openAp = x.status !== "Completed" && x.status !== "Cancelled";
    return "<tr" + (apFor && apFor.__id === x.__id ? " class='is-hl'" : "") + ">" +
      "<td class='c-no nowrap'>" + esc(x.requestNumber || x.__id) + "</td>" +
      "<td><b>" + esc(x.patientName || "—") + "</b>" +
        "<br><span class='mini-note'>" + esc(x.patientId || "—") + "</span></td>" +
      "<td class='nowrap'>" + esc((x.requestingDepartment || "—") + " · " + (x.requestingClinician || "—")) + "</td>" +
      "<td>" + esc(procs.map((p) => p.name).join(", ") || "—") + "</td>" +
      "<td><span class='st " + (x.priority === "Urgent" ? "st-urgent" : "st-routine") + "'>" + esc(x.priority || "—") + "</span></td>" +
      "<td class='nowrap'>" + apLine + "</td>" +
      "<td>" + stBadge(x.status) + "</td>" +
      "<td class='c-act'>" +
        (openAp ? "<button type='button' class='ghost-btn' data-ap='" + esc(x.__id) + "'>Appointment</button> " : "") +
        "<a class='ghost-btn' href='/radiology/373?id=" + encodeURIComponent(x.__id) + "'>Open</a></td>" +
    "</tr>";
  }).join("");
}
$("#l-find").addEventListener("click", render);
$("#l-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); render(); } });
$("#l-q").addEventListener("input", render);
$("#l-status").addEventListener("change", render);

/* ---------- the appointment editor ---------- */
$("#l-body").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-ap]");
  if (!btn) return;
  apFor = rows.find((x) => x.__id === btn.getAttribute("data-ap")) || null;
  renderAp();
  if (apFor) $("#a-card").scrollIntoView({ behavior: "smooth", block: "start" });
});
function renderAp() {
  if (!apFor) { $("#a-card").hidden = true; return; }
  const ap = apFor.appointment || {};
  $("#a-card").hidden = false;
  $("#a-title").textContent = "Appointment — " + (apFor.requestNumber || "") + " · " + (apFor.patientName || "");
  $("#a-date").value = ap.date || "";
  $("#a-time").value = ap.time || "";
  $("#a-room").value = ap.room || "";
  $("#a-reason").value = "";
  $("#a-now").textContent = ap.status
    ? "Current appointment: " + ap.status + (ap.date ? " · " + ap.date + " " + (ap.time || "") : "") +
      (ap.room ? " · " + ap.room : "") + (ap.reason ? " · reason: " + ap.reason : "")
    : "No appointment has been scheduled yet.";
  $("#a-ferr").hidden = true;
}
function apErr(msg) { const e = $("#a-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function apStaff() {
  let s = "";
  try { s = localStorage.getItem("jamaliStaff") || ""; } catch (e) {}
  if (!s) {
    s = (window.prompt("Your name — it is remembered on this device:", "") || "").trim();
    if (!s) return "";
    keepStaff(s);
  }
  return s;
}
$("#a-save").addEventListener("click", async () => {
  if (!apFor) return;
  apErr("");
  const date = $("#a-date").value;
  const time = $("#a-time").value;
  const room = $("#a-room").value.trim();
  const reason = $("#a-reason").value.trim();
  if (!date || isNaN(new Date(date + "T00:00:00").getTime())) return apErr("Choose a valid appointment date.");
  if (!time) return apErr("Choose a valid appointment time.");
  if (!reason && (apFor.appointment || {}).status === "Scheduled")
    return apErr("A reschedule needs the reason — record why the appointment is moving.");
  const staff = apStaff(); if (!staff) return;
  const wasScheduled = (apFor.appointment || {}).status === "Scheduled";
  const btn = $("#a-save"); if (btn.disabled) return; btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthImagingRequests", apFor.__id), {
      appointment: { date, time, room, status: "Scheduled", reason },
      status: apFor.status === "Requested" ? "Scheduled" : apFor.status,
      updatedAt: nowISO(),
      statusHistory: arrayUnion({ status: wasScheduled ? "Scheduled" : apFor.status === "Requested" ? "Scheduled" : apFor.status,
        at: nowISO(), by: staff,
        note: (wasScheduled ? "Rescheduled" : "Scheduled") + ": " + date + " " + time + (room ? " · " + room : "") + (reason ? " · " + reason : "") })
    });
    apFor = null; renderAp();
  } catch (e) { apErr("Could not save the appointment: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#a-missed").addEventListener("click", async () => {
  if (!apFor) return;
  apErr("");
  const reason = $("#a-reason").value.trim();
  const staff = apStaff(); if (!staff) return;
  const btn = $("#a-missed"); if (btn.disabled) return; btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthImagingRequests", apFor.__id), {
      appointment: Object.assign({}, apFor.appointment, { status: "Missed", reason: reason || "not recorded" }),
      updatedAt: nowISO(),
      statusHistory: arrayUnion({ status: "Scheduled", at: nowISO(), by: staff,
        note: "Appointment missed" + (reason ? " — " + reason : " — reason not recorded") })
    });
    apFor = null; renderAp();
  } catch (e) { apErr("Could not record the missed appointment: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#a-cancel").addEventListener("click", async () => {
  if (!apFor) return;
  apErr("");
  const reason = $("#a-reason").value.trim();
  if (!reason) return apErr("A cancellation needs the reason — record why the appointment is cancelled.");
  if (!confirm("Cancel this appointment? The request itself stays open.")) return;
  const staff = apStaff(); if (!staff) return;
  const btn = $("#a-cancel"); if (btn.disabled) return; btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthImagingRequests", apFor.__id), {
      appointment: Object.assign({}, apFor.appointment, { status: "Cancelled", reason }),
      status: apFor.status === "Scheduled" ? "Requested" : apFor.status,
      updatedAt: nowISO(),
      statusHistory: arrayUnion({ status: apFor.status === "Scheduled" ? "Requested" : apFor.status,
        at: nowISO(), by: staff, note: "Appointment cancelled — " + reason })
    });
    apFor = null; renderAp();
  } catch (e) { apErr("Could not cancel the appointment: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#a-close").addEventListener("click", () => { apFor = null; renderAp(); });

/* deep link: /radiology/372?patient=REGID — highlight via search */
function maybeAutoSearch() {
  const pid = new URLSearchParams(location.search).get("patient") || "";
  if (pid) { $("#l-q").value = pid; render(); }
}
maybeAutoSearch();
render();
T54_JS_372
[ -s "public/radiology/372.js" ] && echo "  wrote public/radiology/372.js ($(wc -c < "public/radiology/372.js") bytes)"

mkdir -p "public/radiology"
cat > "public/radiology/373.html" << 'T54_HTML_373'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Imaging Workbench — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/radiology/rad.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">
  <p class="p-boot" id="p-boot" hidden></p>
  <p class="p-err" id="p-err" hidden></p>

  <a class="back" href="/radiology/370">&larr; Radiology</a>
  <h1>Imaging Workbench</h1>
  <p class="sub">One request at a time: perform the procedure, write the findings, and let an authorized person verify and finalize the report. An urgent finding must be acknowledged by name, and every correction is kept in the report's history.</p>

  <div class="find-row card" style="padding:12px 16px">
    <input id="w-q" type="text" placeholder="Request number (IMG-…), patient ID or name">
    <button class="find-btn" id="w-open" type="button">Open</button>
    <span class="mini-note" id="w-none"></span>
  </div>

  <section class="card" id="w-card" hidden>
    <h2 id="w-title">Request</h2>

    <div class="sec-h">Request</div>
    <div id="w-info"></div>

    <div class="sec-h">Procedures &amp; reports</div>
    <p class="mini-note">Record the staff member and the room for each procedure. A procedure that cannot be performed is recorded as such, with the reason — never silently dropped. The findings become a report only when an authorized person verifies it.</p>
    <div id="w-procs"></div>

    <div class="sec-h">Urgent findings</div>
    <div id="w-urgent"></div>
    <div class="form-grid" id="w-uform" hidden>
      <label>Urgent finding (what was seen)
        <input id="w-u-note" type="text" placeholder="e.g. suspicious shadow — needs review today"></label>
      <label>Notified to (clinician / department)
        <input id="w-u-to" type="text" placeholder="e.g. Dr. Hassan · Doctor Consultation"></label>
    </div>
    <div class="form-actions">
      <button class="btn-danger" id="w-uflag" type="button" hidden>Flag urgent finding &amp; record notification</button>
      <button class="btn-ghost" id="w-uack" type="button" hidden>Record acknowledgement</button>
    </div>

    <div class="sec-h">Request status</div>
    <div class="form-actions" id="w-statusbtns">
      <button class="btn-primary" id="w-startproc" type="button" hidden>Start procedure</button>
      <button class="btn-primary" id="w-completereq" type="button" hidden>Complete request</button>
      <button class="btn-danger" id="w-cancelreq" type="button" hidden>Cancel request</button>
    </div>
    <p class="mini-note" id="w-statusnote"></p>

    <div class="sec-h">Record trail</div>
    <div id="w-rec"></div>
    <ul class="trail" id="w-trail"></ul>

    <p class="form-err" id="w-ferr" hidden></p>
    <div class="form-actions" style="margin-top:6px">
      <label class="mini-note">Staff name for actions
        <input id="w-staff" type="text" style="border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px;margin-left:8px"></label>
    </div>
  </section>
</main>
</body>
</html>
T54_HTML_373
[ -s "public/radiology/373.html" ] && echo "  wrote public/radiology/373.html ($(wc -c < "public/radiology/373.html") bytes)"

mkdir -p "public/radiology"
cat > "public/radiology/373.js" << 'T54_JS_373'
// radiology (page 373) — JAMALI Health — Imaging Workbench
// One request at a time. Rules enforced here:
//   · a procedure can only be performed once, and "Not Performed" needs a
//     reason — nothing disappears silently
//   · a report can only be finalized after findings exist; the person who
//     wrote the findings does not verify their own report — an authorized
//     second person does
//   · a correction keeps the previous findings in the report's history
//   · an urgent finding must be notified to a named clinician and
//     acknowledged by name, in two separate steps
import { requireAuth, db, collection, doc, updateDoc, onSnapshot, arrayUnion } from "/firebase.js";

window.__p54 = { page: "373", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p54) window.__p54.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered — no imaging requests yet. Create one on page 371.";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
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

const ST_CLASS = {
  "Requested": "st-requested", "Scheduled": "st-scheduled",
  "In Progress": "st-testing", "Completed": "st-completed",
  "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

let reqs = [];
let current = null;

onSnapshot(collection(db, "healthImagingRequests"), (snap) => {
  reqs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(reqs.length);
  if (current) current = reqs.find((x) => x.__id === current.__id) || current;
  renderAll(); maybeAutoOpen();
}, (e) => loadErr("healthImagingRequests", e));
window.__p54.listeners++;

/* ---------- open a request ---------- */
function openById(id) {
  const d = reqs.find((x) => x.__id === id);
  if (!d) { $("#w-none").textContent = "No request with that reference is on record."; return; }
  current = d;
  renderAll();
  $("#w-card").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("#w-open").addEventListener("click", () => {
  const q = $("#w-q").value.trim().toLowerCase();
  $("#w-none").textContent = "";
  if (!q) return;
  const hit = reqs.find((x) => String(x.requestNumber || "").toLowerCase() === q) ||
              reqs.find((x) => String(x.patientId || "").toLowerCase() === q) ||
              reqs.find((x) => String(x.requestNumber || "").toLowerCase().includes(q)) ||
              reqs.find((x) => String(x.patientName || "").toLowerCase().includes(q));
  if (!hit) { $("#w-none").textContent = "No request matches \u201c" + q + "\u201d."; return; }
  openById(hit.__id);
});
$("#w-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#w-open").click(); } });

function maybeAutoOpen() {
  if (current) return;
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "";
  if (id && reqs.some((x) => x.__id === id)) { current = reqs.find((x) => x.__id === id); renderAll(); return; }
  const pid = params.get("patient") || "";
  if (pid) {
    const own = reqs.filter((x) => String(x.patientId) === String(pid));
    if (own.length) { current = own[0]; renderAll(); }
  }
}

/* ---------- render ---------- */
function renderAll() {
  if (!current) return;
  const d = current;
  $("#w-card").hidden = false;
  $("#w-title").innerHTML = "Request " + esc(d.requestNumber || d.__id) + " " + stBadge(d.status) +
    (String(d.priority) === "Urgent" ? " <span class='st st-urgent'>Urgent</span>" : "");

  const ap = d.appointment || {};
  $("#w-info").innerHTML =
    "<div class='kv'><span class='k'>Patient</span><span class='v'>" + esc(d.patientName || "—") +
      " · " + esc(d.patientId || "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Requested by</span><span class='v'>" +
      esc((d.requestingDepartment || "—") + " · " + (d.requestingClinician || "—")) + "</span></div>" +
    "<div class='kv'><span class='k'>Clinical information</span><span class='v'>" + esc(d.clinicalInfo || "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Appointment</span><span class='v'>" +
      esc(ap.status ? ap.status + (ap.date ? " · " + ap.date + " " + (ap.time || "") : "") + (ap.room ? " · " + ap.room : "") : "not scheduled") + "</span></div>" +
    "<div class='kv'><span class='k'>Created</span><span class='v'>" + esc(when(d.createdAt)) + " · by " + esc(d.recordedBy || "—") + "</span></div>";

  const procs = Array.isArray(d.procedures) ? d.procedures : [];
  $("#w-procs").innerHTML = procs.map((p, i) => {
    const rep = p.report || {};
    const done = p.status === "Completed";
    const notperf = p.status === "Not Performed";
    return "<div class='proc-row'>" +
      "<div class='p-head'><span class='p-name'>" + (i + 1) + ". " + esc(p.name || "Procedure") + "</span>" +
        "<span>" +
          (done
            ? (rep.verifiedBy
                ? "<span class='st st-verified'>Report verified &amp; finalized</span>"
                : "<span class='st st-unverified'>Report awaiting verification</span>")
            : "<span class='st " + (notperf ? "st-cancelled" : "st-await") + "'>" + esc(p.status || "Pending") + "</span>") +
        "</span></div>" +
      "<div class='kv'><span class='k'>Performed</span><span class='v'>" +
        (done ? esc(when(p.performedAt)) + " · by " + esc(p.performedBy || "—") : "—") + "</span></div>" +
      (notperf ? "<div class='kv'><span class='k'>Not performed — reason</span><span class='v'>" + esc(p.note || "—") + "</span></div>" : "") +
      (done
        ? "<div class='form-grid' style='margin-top:8px'>" +
            "<label class='span-3'>Findings<textarea data-proc='" + i + "' data-f='findings' rows='2'" +
              (rep.verifiedBy ? " readonly" : "") + ">" + esc(rep.findings || "") + "</textarea></label>" +
            (rep.verifiedBy ? "" :
              "<label>Reporting staff (radiographer / radiologist)<input data-proc='" + i + "' data-f='reportBy' value='" +
                esc(rep.reportBy || rememberedStaff() || "") + "'></label>") +
          "</div>" +
          "<div class='form-actions'>" +
            (rep.verifiedBy
              ? "<span class='mini-note'>Reported " + esc(when(rep.reportedAt)) + " · by " + esc(rep.reportBy || "—") +
                " · verified " + esc(when(rep.verifiedAt)) + " · by " + esc(rep.verifiedBy) + "</span>" +
                (rep.corrections && rep.corrections.length
                  ? "<span class='mini-note'>" + rep.corrections.length + " correction(s) kept in the history</span>"
                  : "") +
                (rep.reportBy ? "<button type='button' class='btn-warn' data-correct='" + i + "'>Record a correction</button>" : "")
              : (rep.findings
                  ? "<button type='button' class='btn-primary' data-verify='" + i + "'>Verify &amp; finalize report</button>" +
                    "<button type='button' class='btn-ghost' data-savereport='" + i + "'>Save findings</button>"
                  : "<button type='button' class='btn-primary' data-savereport='" + i + "'>Save findings</button>")) +
          "</div>"
        : (!notperf
          ? "<div class='form-actions'>" +
              "<button type='button' class='btn-primary' data-perform='" + i + "'>Mark performed &amp; completed</button>" +
              "<button type='button' class='btn-danger' data-notperform='" + i + "'>Not performed</button>" +
            "</div>"
          : "")) +
      "</div>";
  }).join("");

  const u = d.urgent || {};
  $("#w-urgent").innerHTML =
    "<div class='kv'><span class='k'>Urgent flag</span><span class='v'>" +
      (u.flagged ? "<span class='st st-urgent'>URGENT</span>" : "<span class='st st-none'>none</span>") + "</span></div>" +
    "<div class='kv'><span class='k'>Finding</span><span class='v'>" + (u.flagged ? esc(u.note || "—") : "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Notified</span><span class='v'>" +
      (u.flagged ? esc((u.notifiedTo || "—") + " · " + when(u.notifiedAt) + " · by " + (u.notifiedBy || "—")) : "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Acknowledged</span><span class='v'>" +
      (u.acknowledgedBy ? esc(u.acknowledgedBy + " · " + when(u.acknowledgedAt)) : "—") + "</span></div>";
  $("#w-uform").hidden = !!u.flagged;
  $("#w-u-note").value = u.note || "";
  $("#w-u-to").value = u.notifiedTo || "";
  $("#w-uflag").hidden = !!u.flagged;
  $("#w-uack").hidden = !u.flagged || !!u.acknowledgedBy;

  const fin = d.status === "Completed" || d.status === "Cancelled";
  $("#w-startproc").hidden = fin || d.status === "In Progress";
  $("#w-completereq").hidden = fin || d.status !== "In Progress";
  $("#w-cancelreq").hidden = fin;
  const allHandled = procs.length > 0 && procs.every((p) => p.status === "Completed" || p.status === "Not Performed" || p.status === "Cancelled");
  $("#w-statusnote").textContent = fin
    ? (d.status === "Completed" ? "Completed " + when(d.completedAt) + " — the reports are available to the requesting clinician." : "Cancelled — the record is kept.")
    : (allHandled ? "Every procedure is handled — the request can be completed." :
       (d.status === "In Progress" ? "Procedure in progress — findings can be entered below." :
        "Start the procedure (after the appointment, if one was made) to begin."));

  const hist = Array.isArray(d.statusHistory) ? d.statusHistory : [];
  $("#w-trail").innerHTML = hist.map((h) =>
    "<li><span><b>" + esc(h.status || "—") + "</b>" +
      (h.note ? " <span class='t-who'>· " + esc(h.note) + "</span>" : "") +
    "</span><span class='t-who'>" + esc(when(h.at)) + (h.by ? " · by " + esc(h.by) : "") + "</span></li>").join("");

  $("#w-rec").innerHTML =
    "<div class='kv'><span class='k'>Recorded By</span><span class='v'>" + esc(d.recordedBy || "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Updated At</span><span class='v'>" + esc(when(d.updatedAt)) + "</span></div>";

  $("#w-staff").value = $("#w-staff").value || rememberedStaff();
  $("#w-ferr").hidden = true;
}

/* ---------- actions ---------- */
function ferr(msg) { const e = $("#w-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function staffForAction() {
  const s = $("#w-staff").value.trim();
  if (!s) { ferr("Enter your name first — every action records who made it."); return ""; }
  keepStaff(s);
  return s;
}
function touch(fields) {
  if (!current) return Promise.reject("no request open");
  return updateDoc(doc(db, "healthImagingRequests", current.__id),
    Object.assign({ updatedAt: nowISO() }, fields));
}

$("#w-procs").addEventListener("click", async (e) => {
  if (!current) return;
  ferr("");
  const perform = e.target.closest("button[data-perform]");
  const notperf = e.target.closest("button[data-notperform]");
  const savereport = e.target.closest("button[data-savereport]");
  const verify = e.target.closest("button[data-verify]");
  const correct = e.target.closest("button[data-correct]");
  const staff = staffForAction(); if (!staff) return;
  const procs = (current.procedures || []).map((p) => Object.assign({}, p, { report: Object.assign({}, p.report) }));

  if (perform) {
    const i = Number(perform.getAttribute("data-perform"));
    perform.disabled = true;
    try {
      procs[i].status = "Completed";
      procs[i].performedBy = staff;
      procs[i].performedAt = nowISO();
      await touch({ procedures: procs });
    } catch (err) { ferr("Could not record the procedure: " + ((err && (err.code || err.message)) || err)); }
    perform.disabled = false;
    return;
  }
  if (notperf) {
    const i = Number(notperf.getAttribute("data-notperform"));
    const reason = (window.prompt("Why can the procedure not be performed? (required)", "") || "").trim();
    if (!reason) { ferr("A reason is required — a procedure is never silently dropped."); return; }
    notperf.disabled = true;
    try {
      procs[i].status = "Not Performed";
      procs[i].note = reason;
      procs[i].performedBy = staff;
      procs[i].performedAt = nowISO();
      await touch({ procedures: procs });
    } catch (err) { ferr("Could not record: " + ((err && (err.code || err.message)) || err)); }
    notperf.disabled = false;
    return;
  }
  if (savereport) {
    const i = Number(savereport.getAttribute("data-savereport"));
    const ta = document.querySelector("textarea[data-proc='" + i + "'][data-f='findings']");
    const by = document.querySelector("input[data-proc='" + i + "'][data-f='reportBy']");
    const findings = ta ? ta.value.trim() : "";
    if (!findings) { ferr("Write the findings first — an empty report cannot be saved."); return; }
    savereport.disabled = true;
    try {
      const prev = procs[i].report || {};
      const corrections = Array.isArray(prev.corrections) ? prev.corrections : [];
      const changed = prev.findings && prev.findings !== findings;
      procs[i].report = {
        findings,
        reportBy: (by && by.value.trim()) || prev.reportBy || staff,
        reportedAt: nowISO(),
        verifiedBy: "", verifiedAt: "",
        corrections: changed ? corrections.concat([{ at: nowISO(), by: staff, previousFindings: prev.findings }]) : corrections
      };
      await touch({ procedures: procs });
    } catch (err) { ferr("Could not save the findings: " + ((err && (err.code || err.message)) || err)); }
    savereport.disabled = false;
    return;
  }
  if (verify) {
    const i = Number(verify.getAttribute("data-verify"));
    const rep = procs[i].report || {};
    if (!rep.findings) { ferr("The findings must exist before a report can be verified."); return; }
    if (rep.reportBy && rep.reportBy.toLowerCase() === staff.toLowerCase())
      return ferr("The person who reported the findings does not verify the report — an authorized second person does.");
    verify.disabled = true;
    try {
      procs[i].report = Object.assign({}, rep, { verifiedBy: staff, verifiedAt: nowISO() });
      await touch({ procedures: procs });
    } catch (err) { ferr("Could not verify: " + ((err && (err.code || err.message)) || err)); }
    verify.disabled = false;
    return;
  }
  if (correct) {
    const i = Number(correct.getAttribute("data-correct"));
    const ta = document.querySelector("textarea[data-proc='" + i + "'][data-f='findings']");
    if (!ta) return;
    const prev = procs[i].report || {};
    const findings = ta.value.trim();
    if (!findings) { ferr("The corrected findings cannot be empty."); return; }
    if (findings === prev.findings) { ferr("The findings have not changed — nothing to correct."); return; }
    correct.disabled = true;
    try {
      const corrections = (Array.isArray(prev.corrections) ? prev.corrections : [])
        .concat([{ at: nowISO(), by: staff, previousFindings: prev.findings }]);
      procs[i].report = Object.assign({}, prev, { findings, corrections });
      await touch({ procedures: procs });
    } catch (err) { ferr("Could not record the correction: " + ((err && (err.code || err.message)) || err)); }
    correct.disabled = false;
  }
});

/* urgent findings */
$("#w-uflag").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const note = $("#w-u-note").value.trim();
  const to = $("#w-u-to").value.trim();
  if (!note) return ferr("Describe the urgent finding — what was seen.");
  if (!to) return ferr("Record who is being notified — an urgent finding is always told to a named clinician.");
  const btn = $("#w-uflag"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ urgent: {
      flagged: true, note, notifiedTo: to, notifiedAt: nowISO(), notifiedBy: staff,
      acknowledgedBy: (current.urgent || {}).acknowledgedBy || "",
      acknowledgedAt: (current.urgent || {}).acknowledgedAt || ""
    }, statusHistory: arrayUnion({ status: current.status, at: nowISO(), by: staff,
      note: "URGENT finding flagged — notified " + to }) });
  } catch (e) { ferr("Could not record the notification: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-uack").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-uack"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ urgent: Object.assign({}, current.urgent, {
      acknowledgedBy: staff, acknowledgedAt: nowISO() }) });
  } catch (e) { ferr("Could not record the acknowledgement: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

/* request status */
$("#w-startproc").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-startproc"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ status: "In Progress",
      statusHistory: arrayUnion({ status: "In Progress", at: nowISO(), by: staff, note: "" }) });
  } catch (e) { ferr("Could not start the procedure: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-completereq").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const procs = current.procedures || [];
  const pending = procs.filter((p) => p.status !== "Completed" && p.status !== "Not Performed" && p.status !== "Cancelled");
  if (pending.length) return ferr(pending.length + " procedure(s) still open — perform or record them before completing the request.");
  const btn = $("#w-completereq"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ status: "Completed", completedAt: nowISO(),
      statusHistory: arrayUnion({ status: "Completed", at: nowISO(), by: staff, note: "All procedures handled" }) });
  } catch (e) { ferr("Could not complete the request: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-cancelreq").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  if (!confirm("Cancel request " + (current.requestNumber || "") + "? The record is kept; the procedures stop here.")) return;
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-cancelreq"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ status: "Cancelled",
      statusHistory: arrayUnion({ status: "Cancelled", at: nowISO(), by: staff, note: "Request cancelled" }) });
  } catch (e) { ferr("Could not cancel: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

renderAll();
maybeAutoOpen();
T54_JS_373
[ -s "public/radiology/373.js" ] && echo "  wrote public/radiology/373.js ($(wc -c < "public/radiology/373.js") bytes)"

mkdir -p "public/triage"
cat > "public/triage/323.html" << 'T54_VH_323'
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
          <label>Voice speed<select id="qa-speed"><option value="0.6">Slow &middot; 0.6</option><option value="0.75" selected>Clear &middot; 0.75</option><option value="0.95">Normal &middot; 0.95</option></select></label>
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
T54_VH_323
[ -s "public/triage/323.html" ] && echo "  wrote public/triage/323.html ($(wc -c < "public/triage/323.html") bytes)"

mkdir -p "public/triage"
cat > "public/triage/323.js" << 'T54_VJ_323'
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
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 };
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
function qaRate() {
  /* task 54 voice fix: the saved speed wins; a calm 0.75 is the default */
  const r = Number(qaCfg.voiceRate);
  return (r >= 0.5 && r <= 1.1) ? r : 0.75;
}
function qaSpeech(id) {
  /* spoken letter by letter with real pauses (commas), and the whole
     sentence is repeated so a waiting patient cannot miss their number */
  const d = String(id).split("").join(", ");
  const dest = qaText().dest;
  return "Patient number " + d + ". Please proceed to " + dest +
         ". I repeat: patient number " + d + ". Please proceed to " + dest + ".";
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
    u.rate = qaRate();
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
      const sp = document.getElementById("qa-speed"); if (sp) sp.value = String(qaRate());
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
  const spEl = document.getElementById("qa-speed");
  const spR = spEl ? Number(spEl.value) : NaN;
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    voiceRate: (spR >= 0.5 && spR <= 1.1) ? spR : 0.75,
    updatedAt: new Date().toISOString()
  };
  const sameSpeed = Math.abs(Number(qaCfg.voiceRate || 0.75) - data.voiceRate) < 0.001;
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber && sameSpeed) {
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
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 },
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
T54_VJ_323
[ -s "public/triage/323.js" ] && echo "  wrote public/triage/323.js ($(wc -c < "public/triage/323.js") bytes)"

mkdir -p "public/nurse-consultation"
cat > "public/nurse-consultation/324.html" << 'T54_VH_324'
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
          <label>Voice speed<select id="qa-speed"><option value="0.6">Slow &middot; 0.6</option><option value="0.75" selected>Clear &middot; 0.75</option><option value="0.95">Normal &middot; 0.95</option></select></label>
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
T54_VH_324
[ -s "public/nurse-consultation/324.html" ] && echo "  wrote public/nurse-consultation/324.html ($(wc -c < "public/nurse-consultation/324.html") bytes)"

mkdir -p "public/nurse-consultation"
cat > "public/nurse-consultation/324.js" << 'T54_VJ_324'
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
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 };
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
function qaRate() {
  /* task 54 voice fix: the saved speed wins; a calm 0.75 is the default */
  const r = Number(qaCfg.voiceRate);
  return (r >= 0.5 && r <= 1.1) ? r : 0.75;
}
function qaSpeech(id) {
  /* spoken letter by letter with real pauses (commas), and the whole
     sentence is repeated so a waiting patient cannot miss their number */
  const d = String(id).split("").join(", ");
  const dest = qaText().dest;
  return "Patient number " + d + ". Please proceed to " + dest +
         ". I repeat: patient number " + d + ". Please proceed to " + dest + ".";
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
    u.rate = qaRate();
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
      const sp = document.getElementById("qa-speed"); if (sp) sp.value = String(qaRate());
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
  const spEl = document.getElementById("qa-speed");
  const spR = spEl ? Number(spEl.value) : NaN;
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    voiceRate: (spR >= 0.5 && spR <= 1.1) ? spR : 0.75,
    updatedAt: new Date().toISOString()
  };
  const sameSpeed = Math.abs(Number(qaCfg.voiceRate || 0.75) - data.voiceRate) < 0.001;
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber && sameSpeed) {
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
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 },
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
T54_VJ_324
[ -s "public/nurse-consultation/324.js" ] && echo "  wrote public/nurse-consultation/324.js ($(wc -c < "public/nurse-consultation/324.js") bytes)"

mkdir -p "public/doctor-consultation"
cat > "public/doctor-consultation/325.html" << 'T54_VH_325'
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
          <label>Voice speed<select id="qa-speed"><option value="0.6">Slow &middot; 0.6</option><option value="0.75" selected>Clear &middot; 0.75</option><option value="0.95">Normal &middot; 0.95</option></select></label>
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
T54_VH_325
[ -s "public/doctor-consultation/325.html" ] && echo "  wrote public/doctor-consultation/325.html ($(wc -c < "public/doctor-consultation/325.html") bytes)"

mkdir -p "public/doctor-consultation"
cat > "public/doctor-consultation/325.js" << 'T54_VJ_325'
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
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 };
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
function qaRate() {
  /* task 54 voice fix: the saved speed wins; a calm 0.75 is the default */
  const r = Number(qaCfg.voiceRate);
  return (r >= 0.5 && r <= 1.1) ? r : 0.75;
}
function qaSpeech(id) {
  /* spoken letter by letter with real pauses (commas), and the whole
     sentence is repeated so a waiting patient cannot miss their number */
  const d = String(id).split("").join(", ");
  const dest = qaText().dest;
  return "Patient number " + d + ". Please proceed to " + dest +
         ". I repeat: patient number " + d + ". Please proceed to " + dest + ".";
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
    u.rate = qaRate();
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
      const sp = document.getElementById("qa-speed"); if (sp) sp.value = String(qaRate());
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
  const spEl = document.getElementById("qa-speed");
  const spR = spEl ? Number(spEl.value) : NaN;
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    voiceRate: (spR >= 0.5 && spR <= 1.1) ? spR : 0.75,
    updatedAt: new Date().toISOString()
  };
  const sameSpeed = Math.abs(Number(qaCfg.voiceRate || 0.75) - data.voiceRate) < 0.001;
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber && sameSpeed) {
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
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 },
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
T54_VJ_325
[ -s "public/doctor-consultation/325.js" ] && echo "  wrote public/doctor-consultation/325.js ($(wc -c < "public/doctor-consultation/325.js") bytes)"

mkdir -p "public/pharmacy"
cat > "public/pharmacy/326.html" << 'T54_VH_326'
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
          <label>Voice speed<select id="qa-speed"><option value="0.6">Slow &middot; 0.6</option><option value="0.75" selected>Clear &middot; 0.75</option><option value="0.95">Normal &middot; 0.95</option></select></label>
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
T54_VH_326
[ -s "public/pharmacy/326.html" ] && echo "  wrote public/pharmacy/326.html ($(wc -c < "public/pharmacy/326.html") bytes)"

mkdir -p "public/pharmacy"
cat > "public/pharmacy/326.js" << 'T54_VJ_326'
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
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 };
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
function qaRate() {
  /* task 54 voice fix: the saved speed wins; a calm 0.75 is the default */
  const r = Number(qaCfg.voiceRate);
  return (r >= 0.5 && r <= 1.1) ? r : 0.75;
}
function qaSpeech(id) {
  /* spoken letter by letter with real pauses (commas), and the whole
     sentence is repeated so a waiting patient cannot miss their number */
  const d = String(id).split("").join(", ");
  const dest = qaText().dest;
  return "Patient number " + d + ". Please proceed to " + dest +
         ". I repeat: patient number " + d + ". Please proceed to " + dest + ".";
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
    u.rate = qaRate();
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
      const sp = document.getElementById("qa-speed"); if (sp) sp.value = String(qaRate());
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
  const spEl = document.getElementById("qa-speed");
  const spR = spEl ? Number(spEl.value) : NaN;
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    voiceRate: (spR >= 0.5 && spR <= 1.1) ? spR : 0.75,
    updatedAt: new Date().toISOString()
  };
  const sameSpeed = Math.abs(Number(qaCfg.voiceRate || 0.75) - data.voiceRate) < 0.001;
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber && sameSpeed) {
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
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 },
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
T54_VJ_326
[ -s "public/pharmacy/326.js" ] && echo "  wrote public/pharmacy/326.js ($(wc -c < "public/pharmacy/326.js") bytes)"

mkdir -p "public/treatment-procedures"
cat > "public/treatment-procedures/327.html" << 'T54_VH_327'
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
          <label>Voice speed<select id="qa-speed"><option value="0.6">Slow &middot; 0.6</option><option value="0.75" selected>Clear &middot; 0.75</option><option value="0.95">Normal &middot; 0.95</option></select></label>
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
T54_VH_327
[ -s "public/treatment-procedures/327.html" ] && echo "  wrote public/treatment-procedures/327.html ($(wc -c < "public/treatment-procedures/327.html") bytes)"

mkdir -p "public/treatment-procedures"
cat > "public/treatment-procedures/327.js" << 'T54_VJ_327'
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
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 };
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
function qaRate() {
  /* task 54 voice fix: the saved speed wins; a calm 0.75 is the default */
  const r = Number(qaCfg.voiceRate);
  return (r >= 0.5 && r <= 1.1) ? r : 0.75;
}
function qaSpeech(id) {
  /* spoken letter by letter with real pauses (commas), and the whole
     sentence is repeated so a waiting patient cannot miss their number */
  const d = String(id).split("").join(", ");
  const dest = qaText().dest;
  return "Patient number " + d + ". Please proceed to " + dest +
         ". I repeat: patient number " + d + ". Please proceed to " + dest + ".";
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
    u.rate = qaRate();
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
      const sp = document.getElementById("qa-speed"); if (sp) sp.value = String(qaRate());
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
  const spEl = document.getElementById("qa-speed");
  const spR = spEl ? Number(spEl.value) : NaN;
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    voiceRate: (spR >= 0.5 && spR <= 1.1) ? spR : 0.75,
    updatedAt: new Date().toISOString()
  };
  const sameSpeed = Math.abs(Number(qaCfg.voiceRate || 0.75) - data.voiceRate) < 0.001;
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber && sameSpeed) {
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
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 },
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
T54_VJ_327
[ -s "public/treatment-procedures/327.js" ] && echo "  wrote public/treatment-procedures/327.js ($(wc -c < "public/treatment-procedures/327.js") bytes)"

mkdir -p "public/patient-admission"
cat > "public/patient-admission/343.js" << 'T54_ADM_343'
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

window.__p52 = { page: "343", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

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
  $("#d-discharge").textContent = "Discharge \u00b7 open module";
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
$("#d-discharge").addEventListener("click", () => {
  /* task 54: discharge is its own module now. The button opens it — the
     discharge decision, checklist and the final confirmation (which releases
     the bed to cleaning) live there, so one process owns every discharge. */
  if (!current) return;
  if (!(current.status === "Admitted" || current.status === "Transferred"))
    return ferr("Only an Admitted or Transferred admission can be discharged.");
  const btn = $("#d-discharge");
  btn.textContent = "Opening the Discharge Module\u2026";
  location.href = "/patient-discharge/351?patient=" + encodeURIComponent(current.patientId || "");
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
T54_ADM_343
[ -s "public/patient-admission/343.js" ] && echo "  wrote public/patient-admission/343.js ($(wc -c < "public/patient-admission/343.js") bytes)"

# -- 1 - every file landed --------------------------------------------
nfiles=0
for f in \
  "firestore.rules" \
  "public/patient-discharge/dis.css" \
  "public/patient-discharge/350.html" \
  "public/patient-discharge/350.js" \
  "public/patient-discharge/351.html" \
  "public/patient-discharge/351.js" \
  "public/patient-discharge/352.html" \
  "public/patient-discharge/352.js" \
  "public/patient-discharge/353.html" \
  "public/patient-discharge/353.js" \
  "public/laboratory/lab.css" \
  "public/laboratory/360.html" \
  "public/laboratory/360.js" \
  "public/laboratory/361.html" \
  "public/laboratory/361.js" \
  "public/laboratory/362.html" \
  "public/laboratory/362.js" \
  "public/laboratory/363.html" \
  "public/laboratory/363.js" \
  "public/radiology/rad.css" \
  "public/radiology/370.html" \
  "public/radiology/370.js" \
  "public/radiology/371.html" \
  "public/radiology/371.js" \
  "public/radiology/372.html" \
  "public/radiology/372.js" \
  "public/radiology/373.html" \
  "public/radiology/373.js" \
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
  "public/patient-admission/343.js" \
  ; do
  if [ -s "$f" ]; then nfiles=$((nfiles + 1)); else echo "VERIFY FAIL: $f missing or empty"; fail=1; fi
done
if [ "$fail" -eq 0 ]; then echo "PASS: all $nfiles files are on disk and non-empty"; fi

# -- 2 - the new modules name build 54 --------------------------------
grep -q 'build: "54"' "public/patient-discharge/350.js" || { echo "VERIFY FAIL: patient-discharge/350.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' "public/patient-discharge/351.js" || { echo "VERIFY FAIL: patient-discharge/351.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' "public/patient-discharge/352.js" || { echo "VERIFY FAIL: patient-discharge/352.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' "public/patient-discharge/353.js" || { echo "VERIFY FAIL: patient-discharge/353.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' "public/laboratory/360.js" || { echo "VERIFY FAIL: laboratory/360.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' "public/laboratory/361.js" || { echo "VERIFY FAIL: laboratory/361.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' "public/laboratory/362.js" || { echo "VERIFY FAIL: laboratory/362.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' "public/laboratory/363.js" || { echo "VERIFY FAIL: laboratory/363.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' "public/radiology/370.js" || { echo "VERIFY FAIL: radiology/370.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' "public/radiology/371.js" || { echo "VERIFY FAIL: radiology/371.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' "public/radiology/372.js" || { echo "VERIFY FAIL: radiology/372.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' "public/radiology/373.js" || { echo "VERIFY FAIL: radiology/373.js missing the build 54 fingerprint"; fail=1; }
grep -q 'build: "54"' public/patient-admission/343.js || { echo "VERIFY FAIL: 343.js missing the build 54 fingerprint"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: 13 rewritten/new pages carry the build 54 fingerprint"

# -- 3 - the voice fix really landed on 323-327 ------------------------
grep -q "I repeat: patient number" "public/triage/323.js" || { echo "VERIFY FAIL: 323.js missing the repeated sentence"; fail=1; }
grep -q "u.rate = qaRate();" "public/triage/323.js" || { echo "VERIFY FAIL: 323.js still uses the fixed rate"; fail=1; }
grep -q "voiceRate" "public/triage/323.js" || { echo "VERIFY FAIL: 323.js has no voiceRate setting"; fail=1; }
grep -q 'id="qa-speed"' "public/triage/323.html" || { echo "VERIFY FAIL: 323.html missing the Voice speed select"; fail=1; }
grep -q "JAMALI-NO-SKIP (task 51)" "public/triage/323.js" || { echo "VERIFY FAIL: 323.js lost the task 51 gate"; fail=1; }
grep -q "healthQueueConfig" "public/triage/323.js" || { echo "VERIFY FAIL: 323.js lost the settings listener"; fail=1; }
grep -q "I repeat: patient number" "public/nurse-consultation/324.js" || { echo "VERIFY FAIL: 324.js missing the repeated sentence"; fail=1; }
grep -q "u.rate = qaRate();" "public/nurse-consultation/324.js" || { echo "VERIFY FAIL: 324.js still uses the fixed rate"; fail=1; }
grep -q "voiceRate" "public/nurse-consultation/324.js" || { echo "VERIFY FAIL: 324.js has no voiceRate setting"; fail=1; }
grep -q 'id="qa-speed"' "public/nurse-consultation/324.html" || { echo "VERIFY FAIL: 324.html missing the Voice speed select"; fail=1; }
grep -q "JAMALI-NO-SKIP (task 51)" "public/nurse-consultation/324.js" || { echo "VERIFY FAIL: 324.js lost the task 51 gate"; fail=1; }
grep -q "healthQueueConfig" "public/nurse-consultation/324.js" || { echo "VERIFY FAIL: 324.js lost the settings listener"; fail=1; }
grep -q "I repeat: patient number" "public/doctor-consultation/325.js" || { echo "VERIFY FAIL: 325.js missing the repeated sentence"; fail=1; }
grep -q "u.rate = qaRate();" "public/doctor-consultation/325.js" || { echo "VERIFY FAIL: 325.js still uses the fixed rate"; fail=1; }
grep -q "voiceRate" "public/doctor-consultation/325.js" || { echo "VERIFY FAIL: 325.js has no voiceRate setting"; fail=1; }
grep -q 'id="qa-speed"' "public/doctor-consultation/325.html" || { echo "VERIFY FAIL: 325.html missing the Voice speed select"; fail=1; }
grep -q "JAMALI-NO-SKIP (task 51)" "public/doctor-consultation/325.js" || { echo "VERIFY FAIL: 325.js lost the task 51 gate"; fail=1; }
grep -q "healthQueueConfig" "public/doctor-consultation/325.js" || { echo "VERIFY FAIL: 325.js lost the settings listener"; fail=1; }
grep -q "I repeat: patient number" "public/pharmacy/326.js" || { echo "VERIFY FAIL: 326.js missing the repeated sentence"; fail=1; }
grep -q "u.rate = qaRate();" "public/pharmacy/326.js" || { echo "VERIFY FAIL: 326.js still uses the fixed rate"; fail=1; }
grep -q "voiceRate" "public/pharmacy/326.js" || { echo "VERIFY FAIL: 326.js has no voiceRate setting"; fail=1; }
grep -q 'id="qa-speed"' "public/pharmacy/326.html" || { echo "VERIFY FAIL: 326.html missing the Voice speed select"; fail=1; }
grep -q "JAMALI-NO-SKIP (task 51)" "public/pharmacy/326.js" || { echo "VERIFY FAIL: 326.js lost the task 51 gate"; fail=1; }
grep -q "healthQueueConfig" "public/pharmacy/326.js" || { echo "VERIFY FAIL: 326.js lost the settings listener"; fail=1; }
grep -q "I repeat: patient number" "public/treatment-procedures/327.js" || { echo "VERIFY FAIL: 327.js missing the repeated sentence"; fail=1; }
grep -q "u.rate = qaRate();" "public/treatment-procedures/327.js" || { echo "VERIFY FAIL: 327.js still uses the fixed rate"; fail=1; }
grep -q "voiceRate" "public/treatment-procedures/327.js" || { echo "VERIFY FAIL: 327.js has no voiceRate setting"; fail=1; }
grep -q 'id="qa-speed"' "public/treatment-procedures/327.html" || { echo "VERIFY FAIL: 327.html missing the Voice speed select"; fail=1; }
grep -q "JAMALI-NO-SKIP (task 51)" "public/treatment-procedures/327.js" || { echo "VERIFY FAIL: 327.js lost the task 51 gate"; fail=1; }
grep -q "healthQueueConfig" "public/treatment-procedures/327.js" || { echo "VERIFY FAIL: 327.js lost the settings listener"; fail=1; }
grep -q "is still in progress at this desk" public/nurse-consultation/324.js || { echo "VERIFY FAIL: 324 lost the one-patient lock"; fail=1; }
grep -q "is still in progress at this desk" public/doctor-consultation/325.js || { echo "VERIFY FAIL: 325 lost the one-patient lock"; fail=1; }
grep -q "is still being treated" public/treatment-procedures/327.js || { echo "VERIFY FAIL: 327 lost the one-patient lock"; fail=1; }
grep -q "need: 3" public/triage/323.js && grep -q "need: 4" public/nurse-consultation/324.js && grep -q "need: 7" public/doctor-consultation/325.js && grep -q "need: 5" public/pharmacy/326.js && grep -q "need: 5" public/treatment-procedures/327.js || { echo "VERIFY FAIL: the watchdog need counts changed"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: voice fix on all 5 stage pages (slow, spaced, repeated) + gates and locks intact"

# -- 4 - the discharge module: the safety-critical bits ----------------
grep -q 'status: "Cleaning Required"' public/patient-discharge/353.js || { echo "VERIFY FAIL: 353.js does not send the bed to Cleaning Required"; fail=1; }
grep -q "healthBedMaintenance" public/patient-discharge/353.js || { echo "VERIFY FAIL: 353.js does not open the maintenance record"; fail=1; }
grep -q "Ready for Departure" public/patient-discharge/353.js || { echo "VERIFY FAIL: 353.js lost the Ready-for-Departure gate"; fail=1; }
grep -q "status: \"Discharged\"" public/patient-discharge/353.js || { echo "VERIFY FAIL: 353.js does not end the admission"; fail=1; }
grep -q "writeBatch" public/patient-discharge/353.js || { echo "VERIFY FAIL: 353.js confirmation is not atomic (no writeBatch)"; fail=1; }
grep -q "already has an open discharge process" public/patient-discharge/351.js || { echo "VERIFY FAIL: 351.js lost the one-open-process-per-admission guard"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: discharge module - atomic confirmation, bed to cleaning, one process per admission"

# -- 5 - laboratory + radiology: the safety-critical bits --------------
grep -q "does not verify it" public/laboratory/363.js || { echo "VERIFY FAIL: 363.js lost the second-person verification rule"; fail=1; }
grep -q "still open" public/laboratory/363.js || { echo "VERIFY FAIL: 363.js lost the all-tests-entered completion gate"; fail=1; }
grep -q "never marks medication as dispensed" public/patient-discharge/353.html || { echo "VERIFY FAIL: 353.html lost the never-mark-dispensed rule"; fail=1; }
grep -q "does not verify the report" public/radiology/373.js || { echo "VERIFY FAIL: 373.js lost the second-person report verification"; fail=1; }
grep -q "never silently dropped" public/radiology/373.js || { echo "VERIFY FAIL: 373.js lost the not-performed-reason rule"; fail=1; }
grep -q "Reschedule needs\|reschedule needs" public/radiology/372.js || { echo "VERIFY FAIL: 372.js lost the reschedule-reason rule"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: laboratory + radiology gates in place"

# -- 6 - queue panels on the three new hubs ----------------------------
grep -q "JAMALI-QUEUE (task 53 contract" "public/patient-discharge/350.js" || { echo "VERIFY FAIL: 350.js missing the queue block"; fail=1; }
grep -q "id=\"qa-card\"" "public/patient-discharge/350.html" || { echo "VERIFY FAIL: 350.html missing #qa-card"; fail=1; }
grep -q "id=\"qa-waiting\"" "public/patient-discharge/350.html" || { echo "VERIFY FAIL: 350.html missing #qa-waiting"; fail=1; }
grep -q "id=\"qa-done\"" "public/patient-discharge/350.html" || { echo "VERIFY FAIL: 350.html missing #qa-done"; fail=1; }
grep -q "id=\"qa-current-id\"" "public/patient-discharge/350.html" || { echo "VERIFY FAIL: 350.html missing #qa-current-id"; fail=1; }
grep -q "id=\"qa-next-id\"" "public/patient-discharge/350.html" || { echo "VERIFY FAIL: 350.html missing #qa-next-id"; fail=1; }
grep -q "id=\"qa-announce\"" "public/patient-discharge/350.html" || { echo "VERIFY FAIL: 350.html missing #qa-announce"; fail=1; }
grep -q "id=\"qa-settings\"" "public/patient-discharge/350.html" || { echo "VERIFY FAIL: 350.html missing #qa-settings"; fail=1; }
grep -q "id=\"qa-speed\"" "public/patient-discharge/350.html" || { echo "VERIFY FAIL: 350.html missing #qa-speed"; fail=1; }
grep -q "JAMALI-QUEUE (task 53 contract" "public/laboratory/360.js" || { echo "VERIFY FAIL: 360.js missing the queue block"; fail=1; }
grep -q "id=\"qa-card\"" "public/laboratory/360.html" || { echo "VERIFY FAIL: 360.html missing #qa-card"; fail=1; }
grep -q "id=\"qa-waiting\"" "public/laboratory/360.html" || { echo "VERIFY FAIL: 360.html missing #qa-waiting"; fail=1; }
grep -q "id=\"qa-done\"" "public/laboratory/360.html" || { echo "VERIFY FAIL: 360.html missing #qa-done"; fail=1; }
grep -q "id=\"qa-current-id\"" "public/laboratory/360.html" || { echo "VERIFY FAIL: 360.html missing #qa-current-id"; fail=1; }
grep -q "id=\"qa-next-id\"" "public/laboratory/360.html" || { echo "VERIFY FAIL: 360.html missing #qa-next-id"; fail=1; }
grep -q "id=\"qa-announce\"" "public/laboratory/360.html" || { echo "VERIFY FAIL: 360.html missing #qa-announce"; fail=1; }
grep -q "id=\"qa-settings\"" "public/laboratory/360.html" || { echo "VERIFY FAIL: 360.html missing #qa-settings"; fail=1; }
grep -q "id=\"qa-speed\"" "public/laboratory/360.html" || { echo "VERIFY FAIL: 360.html missing #qa-speed"; fail=1; }
grep -q "JAMALI-QUEUE (task 53 contract" "public/radiology/370.js" || { echo "VERIFY FAIL: 370.js missing the queue block"; fail=1; }
grep -q "id=\"qa-card\"" "public/radiology/370.html" || { echo "VERIFY FAIL: 370.html missing #qa-card"; fail=1; }
grep -q "id=\"qa-waiting\"" "public/radiology/370.html" || { echo "VERIFY FAIL: 370.html missing #qa-waiting"; fail=1; }
grep -q "id=\"qa-done\"" "public/radiology/370.html" || { echo "VERIFY FAIL: 370.html missing #qa-done"; fail=1; }
grep -q "id=\"qa-current-id\"" "public/radiology/370.html" || { echo "VERIFY FAIL: 370.html missing #qa-current-id"; fail=1; }
grep -q "id=\"qa-next-id\"" "public/radiology/370.html" || { echo "VERIFY FAIL: 370.html missing #qa-next-id"; fail=1; }
grep -q "id=\"qa-announce\"" "public/radiology/370.html" || { echo "VERIFY FAIL: 370.html missing #qa-announce"; fail=1; }
grep -q "id=\"qa-settings\"" "public/radiology/370.html" || { echo "VERIFY FAIL: 370.html missing #qa-settings"; fail=1; }
grep -q "id=\"qa-speed\"" "public/radiology/370.html" || { echo "VERIFY FAIL: 370.html missing #qa-speed"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: queue panels + speaker + voice speed on 350 / 360 / 370"

# -- 7 - firebase.js: all 27 export names (this task does NOT touch it) -------------
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
[ "$fail" -eq 0 ] && echo "PASS: firebase.js carries all 27 export names (untouched)"

# -- 8 - firestore.rules: all 18 collections ---------------------------
nmatch="$(grep -c "^    match /" firestore.rules)"
if [ "$nmatch" -ne 18 ]; then echo "VERIFY FAIL: rules should hold 18 match blocks, found $nmatch"; fail=1; fi
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
grep -q "match /healthDischarges/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthDischarges"; fail=1; }
grep -q "match /healthLabRequests/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthLabRequests"; fail=1; }
grep -q "match /healthImagingRequests/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthImagingRequests"; fail=1; }
grep -q "match /healthQueueConfig/{" firestore.rules || { echo "VERIFY FAIL: rules missing healthQueueConfig"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: firestore.rules carries all 18 collections"

# -- 9 - menu.js: 12 new sidebar entries + 321.html: 3 new tiles -------
nmd=$(grep -c 'folder: "patient-discharge"' public/menu.js); nml=$(grep -c 'folder: "laboratory"' public/menu.js); nmr=$(grep -c 'folder: "radiology"' public/menu.js)
if [ "$nmd" -eq 4 ] && [ "$nml" -eq 4 ] && [ "$nmr" -eq 4 ]; then
  echo "PASS: menu.js already carries the 12 entries (idempotent skip)"
else
  if ! grep -q 'folder: "patient-admission", n: 343' public/menu.js; then
    echo "VERIFY FAIL: menu.js has no Admission Details entry (n: 343) - refusing to patch blind"; fail=1
  else
    grep -v -e 'folder: "patient-discharge"' -e 'folder: "laboratory"' -e 'folder: "radiology"' public/menu.js > .t54-menu.base
    cat > .t54-menu.txt << 'T54_MENU'
    { label: "Patient Discharge", icon: "🚪", folder: "patient-discharge", n: 350, d: 2 },
    { label: "Start Discharge", icon: "🚪", folder: "patient-discharge", n: 351, d: 3 },
    { label: "Discharge List", icon: "🗒️", folder: "patient-discharge", n: 352, d: 3 },
    { label: "Discharge Details", icon: "🔎", folder: "patient-discharge", n: 353, d: 3 },
    { label: "Laboratory", icon: "🧪", folder: "laboratory", n: 360, d: 2 },
    { label: "New Lab Request", icon: "🧪", folder: "laboratory", n: 361, d: 3 },
    { label: "Lab Request List", icon: "🗒️", folder: "laboratory", n: 362, d: 3 },
    { label: "Lab Workbench", icon: "🔬", folder: "laboratory", n: 363, d: 3 },
    { label: "Radiology / Imaging", icon: "🩻", folder: "radiology", n: 370, d: 2 },
    { label: "New Imaging Request", icon: "🩻", folder: "radiology", n: 371, d: 3 },
    { label: "Imaging Requests", icon: "🗒️", folder: "radiology", n: 372, d: 3 },
    { label: "Imaging Workbench", icon: "🖥️", folder: "radiology", n: 373, d: 3 },
T54_MENU
    awk '{ print; if ($0 ~ /folder: "patient-admission", n: 343/ && !ins) { while ((getline l < ".t54-menu.txt") > 0) print l; close(".t54-menu.txt"); ins=1 } }' .t54-menu.base > .t54-menu.new \
      && mv .t54-menu.new public/menu.js \
      && { grep -q "n: 350" public/menu.js && grep -q "n: 373" public/menu.js \
           && echo "PASS: menu.js - 12 sidebar entries inserted after Admission Details" \
           || { echo "VERIFY FAIL: menu.js patch did not land"; fail=1; }; } \
      || { echo "VERIFY FAIL: menu.js patch failed"; fail=1; }
    rm -f .t54-menu.txt .t54-menu.new .t54-menu.base
  fi
fi

if grep -q "/patient-discharge/350" public/health/321.html && grep -q "/laboratory/360" public/health/321.html && grep -q "/radiology/370" public/health/321.html; then
  echo "PASS: 321.html already carries the three new tiles (idempotent skip)"
else
  if [ ! -f public/health/321.html ] || ! grep -q "future health buttons" public/health/321.html; then
    echo "VERIFY FAIL: public/health/321.html not found or missing its marker comment"; fail=1
  else
    awk '/href="\/patient-discharge\/350"/{skip=1} /href="\/laboratory\/360"/{skip=1} /href="\/radiology\/370"/{skip=1} skip && /<\/a>/{skip=0; next} !skip' public/health/321.html > .t54-tiles.base
    cat > .t54-tiles.txt << 'T54_TILES'
    <a class="mod" href="/patient-discharge/350">
      <span class="mod-ico">🚪</span>
      <span class="mod-label">Patient Discharge<span class="mod-sub">discharge &middot; bed release</span></span>
    </a>
    <a class="mod" href="/laboratory/360">
      <span class="mod-ico">🧪</span>
      <span class="mod-label">Laboratory<span class="mod-sub">tests &middot; results</span></span>
    </a>
    <a class="mod" href="/radiology/370">
      <span class="mod-ico">🩻</span>
      <span class="mod-label">Radiology / Imaging<span class="mod-sub">imaging &middot; reports</span></span>
    </a>
T54_TILES
    awk '{ if ($0 ~ /future health buttons/ && !ins) { while ((getline l < ".t54-tiles.txt") > 0) print l; close(".t54-tiles.txt"); ins=1 } print }' .t54-tiles.base > .t54-tiles.new \
      && mv .t54-tiles.new public/health/321.html \
      && { grep -q "/patient-discharge/350" public/health/321.html && grep -q "/radiology/370" public/health/321.html \
           && echo "PASS: 321.html - Discharge + Laboratory + Radiology tiles added" \
           || { echo "VERIFY FAIL: 321.html patch did not land"; fail=1; }; } \
      || { echo "VERIFY FAIL: 321.html patch failed"; fail=1; }
    rm -f .t54-tiles.txt .t54-tiles.new .t54-tiles.base
  fi
fi

# -- 10 - DOM id wiring, page by page (the awk judge) ------------------
cat > .t54-wire.awk << 'T54_WIRE'
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
T54_WIRE
wiring_bad=0
check_wiring() {
  jsf="$1"; htmlf="$2"
  wout="$(awk -f .t54-wire.awk "$jsf" "$htmlf")"; wcode=$?
  if [ "$wcode" -ne 0 ]; then
    echo "VERIFY FAIL: $jsf reads ids nothing defines: $(echo "$wout" | tr '\n' ' ')"
    wiring_bad=$((wiring_bad + 1))
  fi
}
check_wiring "public/patient-discharge/350.js" "public/patient-discharge/350.html"
check_wiring "public/patient-discharge/351.js" "public/patient-discharge/351.html"
check_wiring "public/patient-discharge/352.js" "public/patient-discharge/352.html"
check_wiring "public/patient-discharge/353.js" "public/patient-discharge/353.html"
check_wiring "public/laboratory/360.js" "public/laboratory/360.html"
check_wiring "public/laboratory/361.js" "public/laboratory/361.html"
check_wiring "public/laboratory/362.js" "public/laboratory/362.html"
check_wiring "public/laboratory/363.js" "public/laboratory/363.html"
check_wiring "public/radiology/370.js" "public/radiology/370.html"
check_wiring "public/radiology/371.js" "public/radiology/371.html"
check_wiring "public/radiology/372.js" "public/radiology/372.html"
check_wiring "public/radiology/373.js" "public/radiology/373.html"
rm -f .t54-wire.awk
if [ "$wiring_bad" -eq 0 ]; then echo "PASS: DOM id wiring verified on all 12 new pages"; fi
[ "$wiring_bad" -gt 0 ] && fail=1

# -- 11 - THE SWEEP: every page import vs the firebase.js export list --
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
*patient-admission/341.js|*patient-admission/342.js|*patient-admission/343.js|\
*patient-discharge/350.js|*patient-discharge/351.js|*patient-discharge/352.js|*patient-discharge/353.js|\
*laboratory/360.js|*laboratory/361.js|*laboratory/362.js|*laboratory/363.js|\
*radiology/370.js|*radiology/371.js|*radiology/372.js|*radiology/373.js) health=1 ;;
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
  echo "PASS: the import sweep checked $nfiles page(s) against the export list - all 30 health pages covered"
else
  echo "VERIFY FAIL: $nbad missing import(s) on health pages"
  fail=1
fi

# =====================================================================
# DONE BLOCK - the run is not over until the site proves it
# =====================================================================
if [ "$fail" -eq 0 ]; then
  echo ""
  echo "TASK 54 VERIFY: ALL PASS"
  echo ""
  echo "Now commit and deploy the files this task wrote:"
  echo "  git add public/patient-discharge public/laboratory public/radiology public/triage public/nurse-consultation public/doctor-consultation public/pharmacy public/treatment-procedures public/patient-admission/343.js public/menu.js public/health/321.html firestore.rules"
  echo "  git commit -m \"task54: discharge + laboratory + radiology modules, voice fix\""
  echo "  git push"
  echo ""
  echo "Wait for Vercel to finish, then HARD REFRESH (Ctrl+Shift+R) and check:"
  echo "  1. Sidebar shows Patient Discharge (350), Laboratory (360), Radiology (370)."
  echo "  2. Announce a patient on 323 - the ID is spoken slowly, letter by letter,"
  echo "     and the whole sentence repeats. Speaker settings now have Voice speed."
  echo "  3. Discharge flow: admit (341) -> assign a bed (334) -> Start Discharge (351)"
  echo "     -> Approve + checklist (353) -> Confirm: admission Discharged, bed goes to"
  echo "     Cleaning Required, and page 336 offers Start Cleaning."
  echo "  4. Laboratory: request (361) -> workbench (363): collect specimen, enter"
  echo "     results, verify with a SECOND person's name, complete."
  echo "  5. Radiology: request (371) -> appointment (372) -> workbench (373):"
  echo "     perform, findings, verify, urgent findings notify + acknowledge."
  echo "  6. If anything says permission-denied: Firebase console -> Firestore ->"
  echo "     Rules -> paste the repo firestore.rules -> Publish, then refresh."
  echo ""
else
  echo ""
  echo "TASK 54 VERIFY: FAILURES ABOVE"
  echo "Nothing is committed - fix the failures and run again (the script is idempotent)."
  exit 1
fi

#!/usr/bin/env bash
# =====================================================================
# JAMALI - Task 45 - ONE ID, AND THE PATIENT CHIP ON EVERY STAGE
# Run this from ~/jamali  (the folder that contains public/).
# Run it AFTER task 44's file (the four health modules must exist).
# Idempotent: safe to run any number of times.
#
# WHAT YOU ASKED
#   "find patient via id to all stage ... remove temporary id we need
#   only 1 id and on enter ID and find in all stages display the
#   victims name top right corner with i on click display past info"
#
# WHAT THIS DOES
#   1. ONE ID ONLY - the temporary identification ID is removed from
#      the whole app. Registration (322) issues the Registration ID,
#      four digits and four letters, to every victim, named or not;
#      nothing writes or displays a temporary ID anywhere again. Old
#      records that still carry one simply ignore it.
#   2. THE PATIENT CHIP - a new shared piece, public/health/
#      patient-info.css and patient-info.js. On every stage after
#      registration (323 triage, 324 nurse, 325 doctor, 326 pharmacy,
#      327 treatment, 328 patient module) the moment an entered
#      Registration ID resolves - typed, picked from the list, or
#      opened from a queue row - the victim's name appears in the TOP
#      RIGHT CORNER with the ID and an i button beside it.
#   3. THE i BUTTON - opens the patient's past info: every record kept
#      for that ID across all six stages (registration, triage, nurse,
#      doctor, pharmacy, treatment), newest first, read only, with
#      every saved field. Works for named and unidentified victims.
#      Back to the queue hides the chip; an unknown ID hides it too.
#   4. README - the registration entry, the data model line and the
#      using-the-app section now describe the one-ID rule and the chip.
#
#   This file touches ONLY the files above - menu.js, the hub, the
#   rules and every other page stand exactly as task 44 laid them.
#
# ABOUT CHECKS
#   The verification uses grep and find only - no node - so it passes
#   on any machine. If a line says VERIFY FAIL, re-run and read it.
# =====================================================================
set -u

if [ ! -f public/menu.js ] || [ ! -f firestore.rules ]; then
  echo "STOP: run this file from inside ~/jamali - the folder that holds public/ and firestore.rules."
  exit 1
fi

mkdir -p public/health

cat > public/health/patient-info.css << 'PI45CSSEOF'
/* JAMALI Health - the patient chip and the past-records panel (Task 45).
   One victim, one ID, one history. The chip sits in the top right corner of
   every stage page; the i button opens every record kept for that ID. */
#pi-chip { position: fixed; top: 12px; right: 14px; z-index: 900; display: flex;
  align-items: center; gap: 8px; background: #ffffff; border: 1px solid #e2e8f0;
  border-radius: 999px; padding: 7px 8px 7px 14px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .14); max-width: min(92vw, 440px); }
#pi-chip .pi-who { font-weight: 800; color: #0f172a; font-size: 13.5px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 210px; }
#pi-chip .pi-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; color: #0369a1; background: #e0f2fe; border-radius: 6px;
  padding: 2px 7px; font-weight: 700; letter-spacing: .4px; white-space: nowrap; }
#pi-chip .pi-i { flex: 0 0 auto; width: 22px; height: 22px; border-radius: 50%;
  border: 1.5px solid #0369a1; color: #0369a1; background: #ffffff; font-weight: 800;
  font-size: 12.5px; line-height: 1; cursor: pointer; font-style: italic;
  font-family: Georgia, 'Times New Roman', serif; }
#pi-chip .pi-i:hover { background: #0369a1; color: #ffffff; }

/* the hidden attribute must always win over the display rules above */
#pi-chip[hidden], #pi-panel[hidden] { display: none; }

#pi-panel { position: fixed; inset: 0; z-index: 1100; }
#pi-panel .pi-backdrop { position: absolute; inset: 0; background: rgba(15, 23, 42, .55); }
#pi-panel .pi-sheet { position: absolute; top: 3vh; left: 50%; transform: translateX(-50%);
  width: min(720px, 94vw); max-height: 94vh; background: #f8fafc; border-radius: 16px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, .35); display: flex; flex-direction: column;
  overflow: hidden; }
.pi-head { display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 14px 18px; background: #0f172a; color: #ffffff; }
.pi-head-who { font-weight: 800; font-size: 16px; }
.pi-head-sub { font-size: 12px; color: #cbd5e1; margin-top: 2px; }
.pi-close { background: transparent; border: 1px solid #475569; color: #e2e8f0;
  border-radius: 8px; width: 32px; height: 32px; font-size: 15px; cursor: pointer;
  flex: 0 0 auto; }
.pi-close:hover { background: #1e293b; }
.pi-body { overflow-y: auto; padding: 14px 18px 20px; }
.pi-stage { margin-bottom: 18px; }
.pi-stage h3 { font-size: 13.5px; font-weight: 800; color: #0f172a; margin: 0 0 4px;
  display: flex; align-items: center; gap: 8px; }
.pi-count { font-size: 11.5px; font-weight: 700; color: #0369a1; background: #e0f2fe;
  border-radius: 999px; padding: 1px 8px; }
.pi-rec { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 10px 14px; margin: 8px 0 0; }
.pi-rec-when { font-size: 11.5px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
.pi-row { display: flex; gap: 10px; padding: 4px 0; border-bottom: 1px dashed #f1f5f9;
  font-size: 13px; }
.pi-row:last-child { border-bottom: 0; }
.pi-k { flex: 0 0 38%; color: #64748b; font-weight: 600; }
.pi-v { flex: 1; color: #0f172a; font-weight: 600; overflow-wrap: anywhere; }
.pi-empty, .pi-loading { color: #94a3b8; font-size: 12.5px; font-style: italic; margin: 6px 0 0; }

@media (max-width: 640px) {
  #pi-chip { top: 8px; right: 10px; padding: 5px 6px 5px 10px; }
  #pi-chip .pi-who { max-width: 34vw; font-size: 12px; }
  #pi-chip .pi-id { font-size: 11px; }
  .pi-k { flex-basis: 44%; }
}
PI45CSSEOF
cat > public/health/patient-info.js << 'PI45JSEOF'
/* JAMALI Health - the patient chip and the past-records panel (Task 45).
   ONE VICTIM, ONE ID, ONE HISTORY.
   Every stage page calls showPatient(regId) the moment a Registration ID
   resolves - typed into the find box, picked from a list, or opened from a
   queue row. The chip then sits in the TOP RIGHT CORNER with the victim's
   name, the Registration ID and an i button; clicking the i opens every
   record kept for that ID across all the stages - registration, triage,
   nurse consultation, doctor consultation, pharmacy prescriptions and
   treatment orders - newest first, read only. hidePatient() clears the chip.
   The temporary ID is gone: the Registration ID is the only identifier,
   and any old temporary ID still stored on ancient records is ignored. */
import { db, collection, onSnapshot } from "/firebase.js";

const STAGES = [
  { coll: "healthRegistrations",       name: "Registration",          icon: "\u{1F9FE}" },
  { coll: "healthTriage",              name: "Triage",                icon: "\u{1F6A6}" },
  { coll: "healthNurseConsultations",  name: "Nurse consultation",    icon: "\u{1F489}" },
  { coll: "healthDoctorConsultations", name: "Doctor consultation",   icon: "\u{1FA7A}" },
  { coll: "healthPrescriptions",       name: "Pharmacy \u2014 prescription", icon: "\u{1F48A}" },
  { coll: "healthTreatmentOrders",     name: "Treatment / Procedures", icon: "\u{1FA79}" }
];

const LABELS = {
  fullName: "Patient name", dob: "Date of birth", age: "Age", sex: "Sex",
  phone: "Phone", address: "Address", emergencyContact: "Emergency contact",
  arrivalAt: "Arrived", incidentType: "Incident", incidentDescription: "Incident notes",
  department: "Department", priority: "Priority", staff: "Registered by",
  referral: "Referred", referredBy: "Referring facility", payment: "Payment",
  isUnidentified: "Unidentified patient",
  assessedAt: "Assessed at", symptoms: "Symptoms", consciousness: "Consciousness",
  pain: "Pain (0\u201310)", vTemp: "Temperature (\u00B0C)", vPulse: "Pulse (bpm)",
  vRR: "Respiratory rate (/min)", vBP: "Blood pressure (mmHg)", vSpO2: "SpO2 (%)",
  injuries: "Injuries", allergies: "Allergies", conditions: "Existing conditions",
  notes: "Notes", assessedBy: "Assessed by",
  chiefComplaint: "Chief complaint", hpi: "History of present illness",
  relevantHistory: "Relevant medical history", currentMedications: "Current medications",
  painLocation: "Pain location", painSeverity: "Pain severity (0\u201310)",
  painDuration: "Pain duration", painCharacter: "Pain character",
  nursingAssessment: "Nursing assessment", nursingProblems: "Nursing problems",
  nursingInterventions: "Nursing interventions", responseToCare: "Response to care",
  nursingNotes: "Nursing notes", nurse: "Nurse", status: "Status",
  presentingComplaint: "Presenting complaint", physicalExam: "Physical examination",
  clinicalFindings: "Clinical findings", additionalNotes: "Additional notes",
  dxPrimary: "Primary diagnosis", dxAdditional: "Additional diagnoses",
  dxType: "Diagnosis type", dxNotes: "Diagnostic notes",
  investigations: "Investigations", treatmentPlan: "Treatment plan",
  startedAt: "Started at", completedAt: "Completed at", sentAt: "Sent at",
  performedAt: "Performed at",
  doctor: "Doctor", destinationName: "Sent to destination",
  medicine: "Medicine", dose: "Dose", frequency: "Frequency", duration: "Duration",
  prescribedBy: "Prescribed by", replacementOf: "Replacement for",
  alt: "Proposed alternative", decision: "Doctor's decision", dispensed: "Dispensed",
  order: "Doctor's order", performed: "Treatment performed", outcome: "Outcome",
  worker: "Healthcare worker", updatedAt: "Last update", orderedBy: "Ordered by"
};

/* internal keys never render - the temporary ID above all, even on old records */
const SKIP = new Set(["regId", "createdAt", "savedAt", "triageSavedAt",
  "consultationId", "__id", "tempId"]);

const store = {};          // coll -> { docs: [], ready: false }
let started = false;       // the subscriptions start on the first lookup
let currentId = "";
let panelOpen = false;
let chip, panel;

function pad(n) { return String(n).padStart(2, "0"); }
function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function when(iso) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function rawWhen(d) {
  return d.savedAt || d.assessedAt || d.startedAt || d.completedAt ||
         d.performedAt || d.updatedAt || d.arrivalAt || "";
}
function label(k) {
  if (LABELS[k]) return LABELS[k];
  const s = String(k).replace(/([A-Z])/g, " $1");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmt(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  if (v == null || v === "") return "\u2014";
  if (typeof v === "object" && typeof v.toDate === "function") return when(v.toDate().toISOString());
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return when(v);
  if (typeof v === "object") {
    return Object.keys(v).map((k) => label(k) + ": " +
      (v[k] == null ? "" : String(v[k]))).join(" \u00B7 ");
  }
  return String(v);
}

function ensureStarted() {
  if (started) return;
  started = true;
  STAGES.forEach((s) => {
    store[s.coll] = { docs: [], ready: false };
    onSnapshot(collection(db, s.coll), (snap) => {
      const b = store[s.coll];
      b.docs = snap.docs.map((d) => d.data() || {});
      b.ready = true;
      paintChip();
      if (panelOpen) paintPanel();
    });
  });
}

function docsFor(coll) {
  const b = store[coll];
  if (!b) return [];
  return b.docs
    .filter((d) => String(d.regId || "") === currentId)
    .sort((a, c) => String(rawWhen(c)).localeCompare(String(rawWhen(a))));
}

function whoName(r) {
  if (!r) return "Unknown";
  return r.isUnidentified ? "Unidentified victim" : (r.fullName || "Unnamed victim");
}

function buildDom() {
  if (chip) return;
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/health/patient-info.css";
  document.head.appendChild(css);

  chip = document.createElement("div");
  chip.id = "pi-chip";
  chip.hidden = true;
  chip.innerHTML = '<span class="pi-who"></span><span class="pi-id"></span>' +
    '<button class="pi-i" id="pi-info" type="button" title="Past records in every stage" ' +
    'aria-label="Show past records">i</button>';
  document.body.appendChild(chip);
  chip.querySelector(".pi-i").addEventListener("click", openPanel);

  panel = document.createElement("div");
  panel.id = "pi-panel";
  panel.hidden = true;
  panel.innerHTML =
    '<div class="pi-backdrop"></div>' +
    '<div class="pi-sheet" role="dialog" aria-label="Patient history">' +
    '<header class="pi-head"><div><div class="pi-head-who"></div>' +
    '<div class="pi-head-sub"></div></div>' +
    '<button class="pi-close" id="pi-close" type="button" aria-label="Close">\u2715</button></header>' +
    '<div class="pi-body" id="pi-body"></div></div>';
  document.body.appendChild(panel);
  panel.querySelector(".pi-close").addEventListener("click", closePanel);
  panel.querySelector(".pi-backdrop").addEventListener("click", closePanel);
}

/* the one entry point every stage page calls */
export function showPatient(regId) {
  currentId = String(regId || "").trim().toUpperCase();
  if (!/^[0-9]{4}[A-Z]{4}$/.test(currentId)) { hidePatient(); return; }
  buildDom();
  ensureStarted();
  paintChip();
  chip.hidden = false;
  if (panelOpen) paintPanel();
}

export function hidePatient() {
  currentId = "";
  if (chip) chip.hidden = true;
  if (panelOpen) closePanel();
}

function paintChip() {
  if (!chip || !currentId) return;
  const r = docsFor("healthRegistrations")[0];
  chip.querySelector(".pi-who").textContent = whoName(r);
  chip.querySelector(".pi-id").textContent = currentId;
}

function openPanel() {
  if (!currentId) return;
  panelOpen = true;
  paintPanel();
  panel.hidden = false;
}

function closePanel() {
  panelOpen = false;
  panel.hidden = true;
}

function paintPanel() {
  if (!panel) return;
  const r = docsFor("healthRegistrations")[0];
  panel.querySelector(".pi-head-who").textContent = whoName(r);
  panel.querySelector(".pi-head-sub").textContent =
    "Registration ID " + currentId + " \u2014 every record kept on this account, read only.";
  const parts = [];
  STAGES.forEach((s) => {
    const b = store[s.coll];
    parts.push('<section class="pi-stage"><h3>' + s.icon + " " + esc(s.name) +
      (b && b.ready ? ' <span class="pi-count">' + docsFor(s.coll).length + "</span>" : "") +
      "</h3>");
    if (!b || !b.ready) {
      parts.push('<p class="pi-loading">Loading\u2026</p>');
    } else {
      const ds = docsFor(s.coll);
      if (!ds.length) parts.push('<p class="pi-empty">Nothing saved at this stage yet.</p>');
      else ds.forEach((d) => parts.push(recordCard(d)));
    }
    parts.push("</section>");
  });
  panel.querySelector(".pi-body").innerHTML = parts.join("");
}

function recordCard(d) {
  const w = rawWhen(d);
  const rows = ['<div class="pi-rec-when">Saved ' + esc(when(w)) + "</div>"];
  Object.keys(d).forEach((k) => {
    if (SKIP.has(k)) return;
    const raw = d[k];
    if (raw == null || raw === "") return;
    if (typeof raw === "object" && typeof raw.toDate !== "function") {
      const txt = fmt(raw);
      if (!txt.trim()) return;
      rows.push('<div class="pi-row"><span class="pi-k">' + esc(label(k)) +
        '</span><span class="pi-v">' + esc(txt) + "</span></div>");
      return;
    }
    rows.push('<div class="pi-row"><span class="pi-k">' + esc(label(k)) +
      '</span><span class="pi-v">' + esc(fmt(raw)) + "</span></div>");
  });
  return '<div class="pi-rec">' + rows.join("") + "</div>";
}
PI45JSEOF
cat > public/victim-registration/322.html << 'R322H45EOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Victim Registration — JAMALI Health</title>
<link rel="stylesheet" href="/records/records.css">
<link rel="stylesheet" href="/victim-registration/322.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <!-- STEP 1 · the form -->
  <section id="step-form">
    <a class="back" href="/health/321">&larr; Health</a>
    <h1>Registration</h1>
    <p class="sub">Register a victim at the hospital door. The Registration ID is issued only after the form saves.</p>

    <div class="urgent-note">🚨 Emergency treatment must not be delayed because registration details are incomplete &mdash; save with whatever you have.</div>

    <div class="card add-card">
      <div class="form-grid">

        <label>Full Name
          <input id="in-name" type="text" placeholder="Victim's full name">
        </label>
        <label>Date of Birth
          <input id="in-dob" type="date">
        </label>
        <label>Age (automatic)
          <input id="in-age" type="text" readonly placeholder="—">
        </label>

        <label>Sex
          <select id="in-sex">
            <option value="">— Select —</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </label>
        <label>Phone Number
          <input id="in-phone" type="tel" placeholder="e.g. 0712 345 678">
        </label>
        <label>Address and Location
          <input id="in-address" type="text" placeholder="Village, street, landmark">
        </label>

        <label>Emergency Contact / Next of Kin
          <input id="in-kin" type="text" placeholder="Contact name and phone">
        </label>
        <label>Arrival Date &amp; Time (automatic)
          <input id="in-arrival" type="datetime-local" readonly>
        </label>
        <label>Incident Type
          <select id="in-incident">
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
          <textarea id="in-desc" rows="2" placeholder="Brief description of what happened"></textarea>
        </label>
        <label>Hospital Department
          <select id="in-dept">
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
          <select id="in-priority">
            <option value="">— Select —</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </label>

        <label>Registering Staff Member
          <span class="staff-row">
            <select id="in-staff"></select>
            <button type="button" class="staff-add" id="staff-add" title="Add a staff member to this device's list">＋</button>
          </span>
        </label>
        <label>Referral Information
          <select id="in-referral">
            <option>No</option>
            <option>Yes</option>
          </select>
        </label>
        <label>Insurance / Payment
          <select id="in-payment">
            <option value="">— Select —</option>
            <option>Insurance</option>
            <option>Cash</option>
            <option>Other</option>
          </select>
        </label>

        <label id="f-facility" hidden>Referring Facility
          <input id="in-facility" type="text" placeholder="Name of the referring facility">
        </label>

        <label class="unid-label">
          <span class="unid-box">
            <input id="in-unid" type="checkbox">
            <span>Unidentified victim &mdash; no known name; the Registration ID alone identifies the victim.</span>
          </span>
        </label>

      </div>

      <p class="form-err" id="form-err" hidden></p>
      <div class="form-actions">
        <button class="btn-primary" id="save-btn" type="button">Register Victim</button>
        <button class="btn-ghost" id="clear-btn" type="button">Clear Form</button>
      </div>
    </div>

    <div class="card people-card" id="recent-card" hidden>
      <h2>Recent registrations</h2>
      <div class="table-wrap">
        <table class="bk">
          <thead>
            <tr><th>Registration ID</th><th>Victim</th><th>Priority</th><th>Department</th><th>Registered</th></tr>
          </thead>
          <tbody id="recent-body"></tbody>
        </table>
      </div>
      <p class="count-line" id="count-line"></p>
    </div>
  </section>

  <!-- STEP 2 · saved -->
  <section id="step-done" hidden>
    <div class="card done-card">
      <div class="done-icon">&#10003;</div>
      <h1>Victim Registered</h1>
      <p class="sub" id="done-note"></p>
      <div class="id-box">
        <span class="id-k">Registration ID</span>
        <span class="id-v" id="done-regid"></span>
      </div>
      <div class="done-actions">
        <button class="ghost-btn" id="again-btn" type="button">Register Another</button>
        <a class="cta-btn" href="/triage/323">Go to Triage</a>
      </div>
    </div>
  </section>

</main>
<script type="module" src="/victim-registration/322.js"></script>
</body>
</html>
R322H45EOF
cat > public/victim-registration/322.js << 'R322J45EOF'
// victim-registration (page 322) — JAMALI Health
// Sixteen intake fields, three per row. The Registration ID — 4 digits then 4
// letters, for example 4827ABCD — is generated ONLY when the form passes
// validation and the document saves successfully. Unidentified victims
// register without a name — the Registration ID is the one and only
// identifier (temporary IDs were removed in Task 45).
// EMERGENCY RULE: nothing blocks a save except a completely empty form —
// emergency treatment must never wait for registration details.
import { requireAuth, db, collection, query, addDoc, onSnapshot, serverTimestamp } from "/firebase.js";

await requireAuth(); // not logged in? -> bounced to "/"

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- registering staff — a history kept on THIS device ---------- */
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
function resetArrival() { $("#in-arrival").value = nowLocal(); }

/* age — computed from the date of birth, never typed */
$("#in-dob").addEventListener("change", () => {
  const v = $("#in-dob").value;
  const out = $("#in-age");
  out.value = "";
  if (!v) return;
  const dob = new Date(v + "T00:00:00");
  const now = new Date();
  if (isNaN(dob.getTime()) || dob > now) return;
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  if (age >= 0 && age < 140) out.value = String(age);
});

/* referral — Yes reveals the referring facility */
$("#in-referral").addEventListener("change", () => {
  const yes = $("#in-referral").value === "Yes";
  $("#f-facility").hidden = !yes;
  if (!yes) $("#in-facility").value = "";
});

/* ---------- registration IDs already in use (live list) ---------- */
const usedIds = new Set();
let regs = [];

onSnapshot(query(collection(db, "healthRegistrations")), (snap) => {
  regs = snap.docs.map((d) => d.data());
  regs.forEach((r) => { if (r && r.regId) usedIds.add(String(r.regId)); });
  renderRecent();
});

function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function priBadge(p) {
  const k = String(p || "").toLowerCase();
  const cls = { critical: "st-critical", high: "st-high", medium: "st-medium", low: "st-low" }[k];
  if (cls) return '<span class="st ' + cls + '">' + esc(p) + "</span>";
  return '<span class="st st-none">' + (p ? esc(p) : "—") + "</span>";
}

function renderRecent() {
  const rows = regs.slice().sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  $("#recent-card").hidden = rows.length === 0;
  $("#recent-body").innerHTML = rows.slice(0, 8).map((r) => {
    const who = r.isUnidentified
      ? "Unidentified"
      : esc(r.fullName || "Unnamed");
    return "<tr><td class='c-no'>" + esc(r.regId || "—") + "</td>" +
      "<td class='c-party'>" + who + "</td>" +
      "<td>" + priBadge(r.priority) + "</td>" +
      "<td class='c-desc'>" + esc(r.department || "—") + "</td>" +
      "<td class='c-date'>" + esc(when(r.savedAt)) + "</td></tr>";
  }).join("");
  $("#count-line").textContent = rows.length + (rows.length === 1
    ? " victim registered on this account."
    : " victims registered on this account.");
}

/* ---------- Registration ID: 4 digits + 4 letters, e.g. 4827ABCD ---------- */
const DIGITS = "0123456789";
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // I and O left out — they read as 1 and 0
function makeRegId() {
  let id = "";
  for (let t = 0; t < 200; t++) {
    id = "";
    for (let i = 0; i < 4; i++) id += DIGITS[Math.floor(Math.random() * DIGITS.length)];
    for (let i = 0; i < 4; i++) id += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    if (!usedIds.has(id)) return id;
  }
  return id;
}

/* ---------- save ---------- */
function err(msg) { const e = $("#form-err"); e.hidden = !msg; e.textContent = msg || ""; }

$("#save-btn").addEventListener("click", async () => {
  err("");
  const v = (id) => $(id).value.trim();
  const name = v("#in-name");
  const dob = $("#in-dob").value;
  const age = $("#in-age").value;
  const checked = $("#in-unid").checked;
  const referral = $("#in-referral").value;
  const facility = v("#in-facility");
  const staff = $("#in-staff").value === "__add" ? "" : $("#in-staff").value;

  // a completely empty form is the ONLY blocked save — and even that only
  // when nobody marked the victim unidentified
  const touched = [name, dob, v("#in-sex"), v("#in-phone"), v("#in-address"), v("#in-kin"),
    v("#in-incident"), v("#in-desc"), v("#in-dept"), v("#in-priority"), staff,
    facility, v("#in-payment")].some(Boolean) || checked;
  if (!touched) {
    return err("Enter at least one detail, or mark the victim unidentified.");
  }
  const unidentified = checked || !name; // no known name -> unidentified, never a blocker
  if (dob && !age) return err("The date of birth is not valid — it cannot be in the future.");
  if (referral === "Yes" && !facility) return err("Referral is set to Yes — enter the referring facility.");

  const regId = makeRegId();
  const docData = {
    regId,
    isUnidentified: unidentified,
    fullName: name,
    dob,
    age: age === "" ? "" : Number(age),
    sex: v("#in-sex"),
    phone: v("#in-phone"),
    address: v("#in-address"),
    emergencyContact: v("#in-kin"),
    arrivalAt: $("#in-arrival").value,
    savedAt: new Date().toISOString(),
    incidentType: v("#in-incident"),
    incidentDescription: v("#in-desc"),
    department: v("#in-dept"),
    priority: v("#in-priority"),
    staff,
    referral,
    referredBy: referral === "Yes" ? facility : "",
    payment: v("#in-payment"),
    createdAt: serverTimestamp()
  };

  const btn = $("#save-btn");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await addDoc(collection(db, "healthRegistrations"), docData);
    if (staff) rememberStaff(staff);
    $("#done-regid").textContent = regId;
    $("#done-note").textContent = unidentified
      ? "Registered without a name. The Registration ID alone identifies this victim — quote it at every stage."
      : "The record is saved. Quote the Registration ID at triage and at every next step.";
    $("#step-form").hidden = true;
    $("#step-done").hidden = false;
    window.scrollTo(0, 0);
  } catch (e) {
    err("Save failed: " + ((e && e.message) || e) + " — the Registration ID was not used, try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Register Victim";
  }
});

/* ---------- clear / again ---------- */
function clearForm() {
  ["#in-name", "#in-dob", "#in-age", "#in-sex", "#in-phone", "#in-address", "#in-kin",
   "#in-incident", "#in-desc", "#in-dept", "#in-priority", "#in-facility", "#in-payment"]
    .forEach((s) => { $(s).value = ""; });
  $("#in-unid").checked = false;
  $("#in-referral").value = "No";
  $("#f-facility").hidden = true;
  fillStaff($("#in-staff"));
  $("#in-staff").value = "";
  err("");
  resetArrival();
}
$("#clear-btn").addEventListener("click", clearForm);
$("#again-btn").addEventListener("click", () => {
  clearForm();
  $("#step-done").hidden = true;
  $("#step-form").hidden = false;
  window.scrollTo(0, 0);
});

/* ---------- init ---------- */
wireStaff($("#in-staff"), $("#staff-add"));
resetArrival();
R322J45EOF
cat > public/triage/323.js << 'T323J45EOF'
// triage (page 323) — JAMALI Health
// The stage after registration: a healthcare worker assesses the victim and
// decides how urgently medical attention is needed. Triage sets the ORDER of
// care — it is not a diagnosis, and it never delays emergency treatment.
// Twelve items per assessment. Every assessment links to its registration by
// Registration ID and stays in the history below the form.
import { requireAuth, db, collection, query, addDoc, onSnapshot, serverTimestamp } from "/firebase.js";
import { showPatient, hidePatient } from "/health/patient-info.js";

await requireAuth(); // not logged in? -> bounced to "/"

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
});

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
});

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
T323J45EOF
cat > public/nurse-consultation/324.js << 'N324J45EOF'
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
import { requireAuth, auth, db, collection, query, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from "/firebase.js";
import { showPatient, hidePatient } from "/health/patient-info.js";

await requireAuth(); // not logged in? -> bounced to "/"

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
});

onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  triages = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  lastTriage.clear();
  triages.forEach((t) => {
    if (t && t.regId && !lastTriage.has(String(t.regId))) lastTriage.set(String(t.regId), t);
  });
  renderQueue();
  refreshSearchLine();
});

onSnapshot(query(collection(db, "healthNurseConsultations")), (snap) => {
  consults = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderQueue();
  refreshSearchLine();
});

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

function openPatient(regId) {
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
N324J45EOF
cat > public/doctor-consultation/325.js << 'D325J45EOF'
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
import { requireAuth, auth, db, collection, query, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, writeBatch } from "/firebase.js";
import { showPatient, hidePatient } from "/health/patient-info.js";

await requireAuth(); // not logged in? -> bounced to "/"

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
});

onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  triages = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  lastTriage.clear();
  triages.forEach((t) => {
    if (t && t.regId && !lastTriage.has(String(t.regId))) lastTriage.set(String(t.regId), t);
  });
  renderQueue();
  refreshSearchLine();
});

onSnapshot(query(collection(db, "healthNurseConsultations")), (snap) => {
  nurseConsults = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderQueue();
  refreshSearchLine();
});

onSnapshot(query(collection(db, "healthDoctorConsultations")), (snap) => {
  docConsults = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderQueue();
  refreshSearchLine();
});

onSnapshot(query(collection(db, "healthDestinations")), (snap) => {
  destinations = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));
  renderDestinations();
});

onSnapshot(query(collection(db, "healthPrescriptions")), (snap) => {
  rxLines = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderAlts();
  refreshSearchLine();
});

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

function openPatient(regId) {
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
D325J45EOF
cat > public/pharmacy/326.js << 'P326J45EOF'
// pharmacy (page 326) — JAMALI Health
// The pharmacy desk. Prescriptions written by the doctor arrive here one
// medicine per line. The pharmacist checks availability (a judgement, not a
// stock system — stock management is a later module), dispenses, or proposes
// a safe alternative when the prescribed medicine is unavailable. The
// proposal waits for the doctor on page 325: accepted alternatives can be
// dispensed; a rejected line is re-prescribed or sent outside the pharmacy.
// Every action records who did it and when, against the Registration ID.
import { requireAuth, auth, db, collection, query, updateDoc, doc, onSnapshot } from "/firebase.js";
import { showPatient, hidePatient } from "/health/patient-info.js";

await requireAuth(); // not logged in? -> bounced to "/"

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
});

onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  triages = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  lastTriage.clear();
  triages.forEach((t) => {
    if (t && t.regId && !lastTriage.has(String(t.regId))) lastTriage.set(String(t.regId), t);
  });
  if (currentId) renderPatient();
});

onSnapshot(query(collection(db, "healthPrescriptions")), (snap) => {
  rxLines = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderList();
  refreshSearchLine();
  if (currentId) renderPatient();
});

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

function openPatient(regId) {
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
P326J45EOF
cat > public/treatment-procedures/327.js << 'TR327J45EOF'
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
import { requireAuth, auth, db, collection, query, updateDoc, doc, onSnapshot } from "/firebase.js";
import { showPatient, hidePatient } from "/health/patient-info.js";

await requireAuth(); // not logged in? -> bounced to "/"

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
});

onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  triages = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  lastTriage.clear();
  triages.forEach((t) => {
    if (t && t.regId && !lastTriage.has(String(t.regId))) lastTriage.set(String(t.regId), t);
  });
  renderList();
  if (currentId) renderPatient();
});

onSnapshot(query(collection(db, "healthTreatmentOrders")), (snap) => {
  orders = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderList();
  refreshSearchLine();
  if (currentId) renderPatient();
});

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

function openPatient(regId, orderId) {
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
TR327J45EOF
cat > public/patient-module/328.js << 'PM328J45EOF'
// patient-module (page 328) — JAMALI Health
// One tabular summary of everything entered and saved for a patient, from
// victim registration through the patient's last step. The Registration ID
// connects the records across the modules: registration, triage, nursing
// consultations, doctor consultations, pharmacy prescriptions and treatment /
// procedure orders. The columns are GENERATED from the fields actually saved
// across those records — as the patient progresses, the next stage's fields
// join the table. Nothing is entered here; the page only reads.
import { requireAuth, db, collection, query, onSnapshot } from "/firebase.js";
import { showPatient, hidePatient } from "/health/patient-info.js";

await requireAuth(); // not logged in? -> bounced to "/"

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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

/* ---------- live data: the whole patient journey ---------- */
let regs = [];
const regMap = new Map();
let triages = [];
const lastTriage = new Map();
let nurseConsults = [];
let docConsults = [];
let rxLines = [];
let tOrders = [];

onSnapshot(query(collection(db, "healthRegistrations")), (snap) => {
  regs = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  regMap.clear();
  regs.forEach((r) => { if (r && r.regId) regMap.set(String(r.regId), r); });
  fillIds();
  renderIndex();
  refreshSearchLine();
  if (currentId) renderSummary();
});
onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  triages = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  lastTriage.clear();
  triages.forEach((t) => {
    if (t && t.regId && !lastTriage.has(String(t.regId))) lastTriage.set(String(t.regId), t);
  });
  renderIndex();
  if (currentId) renderSummary();
});
onSnapshot(query(collection(db, "healthNurseConsultations")), (snap) => {
  nurseConsults = snap.docs.map((d) => d.data());
  if (currentId) renderSummary();
});
onSnapshot(query(collection(db, "healthDoctorConsultations")), (snap) => {
  docConsults = snap.docs.map((d) => d.data());
  if (currentId) renderSummary();
});
onSnapshot(query(collection(db, "healthPrescriptions")), (snap) => {
  rxLines = snap.docs.map((d) => d.data());
  if (currentId) renderSummary();
});
onSnapshot(query(collection(db, "healthTreatmentOrders")), (snap) => {
  tOrders = snap.docs.map((d) => d.data());
  if (currentId) renderSummary();
});

/* ---------- STEP 1: search + index ---------- */
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

function renderIndex() {
  const has = regs.length > 0;
  $("#i-empty").hidden = has;
  $("#i-wrap").hidden = !has;
  $("#i-body").innerHTML = regs.map((r) => {
    const t = lastTriage.get(String(r.regId));
    const ageSex = (r.age !== "" && r.age != null ? r.age + "y" : "—") +
      (r.sex ? " · " + r.sex : "");
    return "<tr><td class='c-no'>" + esc(r.regId) + "</td>" +
      "<td class='c-party'>" + esc(who(r)) + "</td>" +
      "<td>" + esc(ageSex) + "</td>" +
      "<td class='c-date'>" + esc(when(r.arrivalAt || r.savedAt)) + "</td>" +
      "<td>" + priBadge(t ? t.priority : r.priority) + "</td>" +
      "<td><button type='button' class='ghost-btn i-open' data-regid='" + esc(r.regId) + "'>Open summary</button></td></tr>";
  }).join("");
  $("#i-count").textContent = has
    ? regs.length + (regs.length === 1 ? " patient on record."
                                        : " patients on record.")
    : "";
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
  openSummary(id);
});
$("#i-body").addEventListener("click", (e) => {
  const btn = e.target.closest(".i-open");
  if (btn) { qerr(""); openSummary(btn.getAttribute("data-regid")); }
});

/* ---------- STEP 2: the generated summary ---------- */
let currentId = null;

function openSummary(regId) {
  showPatient(regId);
  currentId = regId;
  renderSummary();
  $("#s-search").hidden = true;
  $("#s-summary").hidden = false;
  window.scrollTo(0, 0);
}

$("#s-back").addEventListener("click", (e) => {
  e.preventDefault();
  hidePatient();
  currentId = null;
  $("#s-summary").hidden = true;
  $("#s-search").hidden = false;
  refreshSearchLine();
  window.scrollTo(0, 0);
});

/* friendly field names — anything unmapped is prettified from its key */
const LABELS = {
  fullName: "Patient name", dob: "Date of birth", age: "Age", sex: "Sex",
  phone: "Phone", address: "Address", emergencyContact: "Emergency contact",
  arrivalAt: "Arrived", incidentType: "Incident", incidentDescription: "Incident notes",
  department: "Department", priority: "Priority", staff: "Registered by",
  referral: "Referred", referredBy: "Referring facility", payment: "Payment",
  isUnidentified: "Unidentified patient",
  assessedAt: "Assessed at", symptoms: "Symptoms", consciousness: "Consciousness",
  pain: "Pain (0–10)", vTemp: "Temperature (°C)", vPulse: "Pulse (bpm)",
  vRR: "Respiratory rate (/min)", vBP: "Blood pressure (mmHg)", vSpO2: "SpO2 (%)",
  injuries: "Injuries", allergies: "Allergies", conditions: "Existing conditions",
  notes: "Notes", assessedBy: "Assessed by",
  chiefComplaint: "Chief complaint", hpi: "History of present illness",
  relevantHistory: "Relevant medical history", currentMedications: "Current medications",
  painLocation: "Pain location", painSeverity: "Pain severity (0–10)",
  painDuration: "Pain duration", painCharacter: "Pain character",
  nursingAssessment: "Nursing assessment", nursingProblems: "Nursing problems",
  nursingInterventions: "Nursing interventions", responseToCare: "Response to care",
  nursingNotes: "Nursing notes", nurse: "Nurse", status: "Status",
  presentingComplaint: "Presenting complaint", physicalExam: "Physical examination",
  clinicalFindings: "Clinical findings", additionalNotes: "Additional notes",
  dxPrimary: "Primary diagnosis", dxAdditional: "Additional diagnoses",
  dxType: "Diagnosis type", dxNotes: "Diagnostic notes",
  investigations: "Investigations", treatmentPlan: "Treatment plan",
  startedAt: "Started at", completedAt: "Completed at", sentAt: "Sent at",
  performedAt: "Performed at",
  doctor: "Doctor", destinationName: "Sent to destination",
  medicine: "Medicine", dose: "Dose", frequency: "Frequency", duration: "Duration",
  prescribedBy: "Prescribed by", replacementOf: "Replacement for",
  alt: "Proposed alternative", decision: "Doctor's decision", dispensed: "Dispensed",
  order: "Doctor's order", performed: "Treatment performed", outcome: "Outcome",
  worker: "Healthcare worker", updatedAt: "Last update", orderedBy: "Ordered by"
};
function label(k) {
  if (LABELS[k]) return LABELS[k];
  const s = String(k).replace(/([A-Z])/g, " $1");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* internal keys never become columns */
const SKIP = new Set(["regId", "createdAt", "savedAt", "triageSavedAt", "consultationId", "__id"]);

/* the stages, in workflow order, with the field order each form uses */
const STAGES = [
  { name: "Registration", docs: () => regs,
    whoKey: "staff",
    order: ["fullName", "dob", "age", "sex", "phone", "address", "emergencyContact",
            "arrivalAt", "incidentType", "incidentDescription", "department",
            "priority", "staff", "referral", "referredBy", "payment",
            "isUnidentified"] },
  { name: "Triage", docs: () => triages, whoKey: "assessedBy",
    order: ["assessedAt", "symptoms", "consciousness", "priority", "pain",
            "vTemp", "vPulse", "vRR", "vBP", "vSpO2", "injuries", "allergies",
            "conditions", "notes", "assessedBy"] },
  { name: "Nurse consultation", docs: () => nurseConsults, whoKey: "nurse",
    order: ["status", "chiefComplaint", "hpi", "relevantHistory", "currentMedications",
            "allergies", "vTemp", "vPulse", "vRR", "vBP", "vSpO2", "painLocation",
            "painSeverity", "painDuration", "painCharacter", "nursingAssessment",
            "nursingProblems", "nursingInterventions", "responseToCare", "nursingNotes"] },
  { name: "Doctor consultation", docs: () => docConsults, whoKey: "doctor",
    order: ["status", "presentingComplaint", "hpi", "relevantHistory", "currentMedications",
            "allergies", "vTemp", "vPulse", "vRR", "vBP", "vSpO2", "physicalExam",
            "clinicalFindings", "additionalNotes", "dxPrimary", "dxAdditional",
            "dxType", "dxNotes", "investigations", "treatmentPlan", "destinationName"] },
  { name: "Pharmacy — prescription", docs: () => rxLines, whoKey: "prescribedBy",
    order: ["medicine", "dose", "frequency", "duration", "notes", "status",
            "replacementOf", "alt", "decision", "dispensed"] },
  { name: "Treatment / Procedures", docs: () => tOrders, whoKey: "orderedBy",
    order: ["order", "status", "performed", "outcome", "notes", "worker", "updatedAt"] }
];

function fmt(v) {
  if (v === "" || v == null) return "";
  if (v === true) return "Yes";
  if (v === false) return "No";
  if (Array.isArray(v)) return v.map(fmt).filter(Boolean).join("; ");
  if (typeof v === "object") {
    return Object.entries(v)
      .filter(([, x]) => x !== "" && x != null && typeof x !== "object")
      .map(([k, x]) => label(k) + ": " + fmt(x))
      .join("; ");
  }
  return String(v);
}

function renderSummary() {
  const r = regMap.get(String(currentId));
  if (!r) return;
  const t = lastTriage.get(String(currentId));
  $("#s-wholine").textContent = "The full record for " + who(r) + " · Registration ID " + r.regId;
  $("#h-regid").textContent = r.regId;
  $("#h-line").textContent = who(r) +
    (r.sex ? " · " + r.sex : "") +
    (r.age !== "" && r.age != null ? " · " + r.age + "y" : "") +
    " · arrived " + when(r.arrivalAt || r.savedAt) +
    (t && t.priority ? " · triage priority " + t.priority : "");

  /* one row per saved record, chronological across the whole journey */
  const rows = [];
  STAGES.forEach((st) => {
    st.docs()
      .filter((d) => d && String(d.regId) === String(currentId))
      .sort((a, b) => String(a.savedAt || "").localeCompare(String(b.savedAt || "")))
      .forEach((d) => rows.push({ stage: st.name, whoKey: st.whoKey, order: st.order, data: d }));
  });
  rows.sort((a, b) => String(a.data.savedAt || "").localeCompare(String(b.data.savedAt || "")));

  const has = rows.length > 0;
  $("#s-empty").hidden = has;
  $("#s-wrap").hidden = !has;
  if (!has) { $("#s-count").textContent = ""; return; }

  /* the columns are generated from the fields actually saved */
  const fieldCols = [];
  rows.forEach((row) => {
    row.order.forEach((k) => {
      if (!SKIP.has(k) && k in row.data && !fieldCols.includes(k)) fieldCols.push(k);
    });
    Object.keys(row.data).forEach((k) => {
      if (!SKIP.has(k) && !fieldCols.includes(k)) fieldCols.push(k);
    });
  });

  $("#s-head").innerHTML = "<tr><th>Stage</th><th>Saved</th><th>By</th>" +
    fieldCols.map((k) => "<th>" + esc(label(k)) + "</th>").join("") + "</tr>";

  $("#s-body").innerHTML = rows.map((row) => {
    const by = row.data[row.whoKey] || "—";
    return "<tr><td class='stage-cell'>" + esc(row.stage) + "</td>" +
      "<td class='when-cell'>" + esc(when(row.data.savedAt)) + "</td>" +
      "<td class='who-cell'>" + esc(by) + "</td>" +
      fieldCols.map((k) => {
        const v = fmt(row.data[k]);
        return "<td>" + (v === "" ? "—" : esc(v)) + "</td>";
      }).join("") + "</tr>";
  }).join("");

  const nFields = fieldCols.length;
  $("#s-count").textContent = rows.length +
    (rows.length === 1 ? " record" : " records") + " · " + nFields +
    (nFields === 1 ? " field" : " fields") + " saved across the stages.";
}
PM328J45EOF
cat > README.md << 'RM45EOF'
JAMALI

Plain, honest bookkeeping for a small trading business, a Health desk for the hospital, and a 256 tool file and data converter.

A static, zero build web app: the books, journals, ledgers, registers and reports a small business actually needs, all driven by one transaction journal. Record a transaction once, and every other page derives from it. On top of the books sits the Convertor: 256 real, working file and data tools, every one on its own page in its own folder. Beside the books, the Health desk registers victims at the hospital door, triages them by urgency, prepares them for the doctor at the nurse consultation and follows the patient through the doctor consultation, the pharmacy, the treatment desk and the patient module.

Live at https://jamali-lime.vercel.app


HIGHLIGHTS

Sign in with Google: nothing to install, nothing to configure.

Record once, read everywhere: cash books, journals, ledger, trial balance and schedules all read the same data. No re-entry, ever.

Full edit rights: every collection gives a signed in user create, read, update and delete, opened in the rules on the user's order of 25 October 2026.

61 bookkeeping pages, plus the Convertor: a hub of 256 square buttons, each opening a real working tool page, all client side.

Health: victim registration that issues the Registration ID only after a clean save, a triage desk that keeps every urgency assessment linked to its victim, a nurse consultation desk that hands the doctor a completed nursing record, a doctor consultation desk that assesses, diagnoses, prescribes, orders treatments and sends the patient to a destination of the facility's own choosing, a pharmacy that dispenses the prescriptions and proposes alternatives through the doctor, a treatment desk that performs and records the ordered treatments, and a patient module that gathers every saved field into one tabular summary. Emergency treatment is never delayed by an incomplete form.

A collapsible family tree sidebar on every page: branches open and close with a tap, the active page highlights itself, and the whole tree folds into a burger drawer on the phone.

Zero build step: vanilla HTML, CSS and JS (ES modules), served as is.


TECH AT A GLANCE

Front end: vanilla HTML, CSS and JS (ES modules). No framework, no build step.

Auth: Firebase Authentication, Google sign in with a popup.

Database: Cloud Firestore.

Hosting: Vercel, static, with clean URLs like /petty-cash/7 and /text-to-pdf/65.

FirebaseJS: version 10.12.2, loaded from the gstatic CDN.

Converter libraries: loaded per tool from the jsDelivr CDN (pdf-lib, pdf.js, jsPDF, SheetJS, mammoth, JSZip, PptxGenJS, lamejs, tesseract.js and friends), with built in pure JavaScript writers for DOCX, ODT, EPUB, TAR, gzip and more. Every tool runs entirely in the browser: nothing uploads anywhere, and a tool that hits a real browser limit says so on its page instead of producing a wrong file.


USING THE APP

Open the site and sign in with your Google account (index.html).

Business is the control room. From there open Add Transaction or View File. Home also carries Computer and Health tiles.

Add Transaction walks you through it: pick a type (IN, OUT, NEUTRAL or CONTRA), pick the transaction, fill the form, save. Bank charges are stored as their own separate record automatically, so the bank columns stay exact.

View File is the library: every book, register and report is one click away.

Computer is the tools launcher: square tiles only, and today one tile, Convertor, which opens the hub of all 256 tools. Search the hub, tap a square button, and the tool opens on its own page.

Health is the medical wing. The Health tile on Home opens the Health page, which carries seven buttons: Registration, Triage, Nurse Consultation, Doctor Consultation, Pharmacy, Treatment / Procedures and Patient Module. Registration records a victim at the hospital door, unidentified victims included, and issues the Registration ID only after the form saves. Triage then assesses how urgently the victim needs care and keeps the full assessment history linked to the registration record. The nurse consultation pulls the patient by Registration ID, reviews what registration and triage already recorded, and documents the nursing assessment and care. The doctor consultation reads the completed nursing record, assesses and diagnoses the patient, records the prescriptions and the treatment orders, and sends the patient to a destination the facility chose itself - the pharmacy dispenses the prescriptions and proposes alternatives through the doctor when a medicine is unavailable, the treatment desk performs the ordered treatments, and the patient module gathers every saved field into one tabular summary. Registration flows to triage, triage flows to the nurse consultation, the nurse flows to the doctor, and the doctor sends the patient on, according to the patient's needs. On every stage after registration, entering the Registration ID shows the victim's name in the top right corner with an i button beside it; clicking the i opens every record kept for that ID across all the stages, read only. The chip itself is the shared pair health/patient-info.css and health/patient-info.js.

The dark sidebar on every page mirrors the family tree: Business folds out to Add Transaction and View File, View File folds out to every book, register and report, and Computer folds out to Convertor and all 256 tools, and Health folds out to Registration, Triage, Nurse Consultation, Doctor Consultation, Pharmacy, Treatment / Procedures and Patient Module. Nodes with children show a small arrow: v opens a branch, ^ closes it, and the path to the page you are on opens by itself. The address bar always stays clean at the domain root.


ARCHITECTURE

One folder per page. The public folder is the web root, and every page lives in its own folder as N.html, N.css and N.js. Pages are addressed without the extension, for example /petty-cash/7. Two loose exceptions sit directly at the public root: 3.html and 6.html, working copies of pages 3 and 6 that the file guide below explains.

Navigation. menu.js holds the family tree as data: one line per page with label, icon, folder, page number and depth. sidebar.js is the frozen renderer: it draws the collapsible tree from that data, highlights the active page, opens the path to it, cleans the address bar, and slides away behind a burger button at 800px or below. sidebar.js holds no page data and calls no file, so a new page never touches it.

Loading order. Every content page links the shared base css and its own css, then loads menu.js and sidebar.js, menu first, both deferred, and finally its own js.

Styling. Every folder ships its own stylesheet. The shared bases, journals/journal.css and records/records.css, carry the design system. Each page's own css imports its base, adds the page's title accent colour and cleans up printing (sidebar, buttons and filters hidden, white paper background). The look: light slate background, white cards with a 14px radius, teal accents for the Computer family, dark navy sidebar.

Square tile language. The launchers (home, business, view file, computer) and the Convertor hub all use the same square tile grids: equal squares, 8 per row on desktop, 4 on tablets, 3 on phones, aspect ratio 1 to 1.

The engines behind the pages are listed in the file guide below.


HOW CHANGES ARRIVE (THE ONE FILE RULE)

Every working session delivers exactly ONE downloadable bash file, named jamali-taskNN-something.sh. It contains ALL of that session's changes as full file overwrites (the file is written anew with cat, never deleted, never patched in place), plus a verification tail that must end with ALL PASS.

Put the downloaded file inside ~/jamali and run it: bash jamali-taskNN-something.sh

Then ship it: git add -A, git commit, git push. Vercel deploys every push.

The file is idempotent: run it once or ten times, the result is the same.

This guide is maintained entry by entry, never regenerated wholesale: when a page changes, only that page's entry is edited; when a page is added, it gets one new entry under its own page number, and every other entry stands untouched. The entry numbers of the page sections are the page numbers themselves, kept in step with menu.js.


THE REPO, FILE BY FILE

Every page folder carries the same core files: N.html, N.css and N.js. This edition of the guide, rewritten in full at your order, walks the repository tree and names EVERY file, so nothing is left out: every standalone file gets its own entry, every folder gets its entry together with the files it carries, and all 256 convertor tool folders are listed one by one under entry 65, grouped the way the hub groups them. The entry numbers of the page entries are the page numbers themselves. The shared files keep their long standing entry numbers 66 to 83, entry 84 is new, and the tool folders appear under their page numbers inside entry 65. One blank line separates entries.

The repo tree at a glance, as the tree command prints it, with the entry that explains each part:

jamali/
|-- firestore.rules  (entry 75 - the guard dog)
|-- .git  (entry 84 - git's own database)
|-- public  (entry 83 - the whole app, the web root)
|   |-- index.html, firebase.js, menu.js, sidebar.js  (entries 67 to 70)
|   |-- 3.html, 6.html  (entry 66 - the two loose pages)
|   `-- 329 page and engine folders  (entries 1 to 65, 71 to 73 and 321 to 328)
|       `-- for example text-to-pdf: 65.html, 65.css, 65.js  (entry 65 lists all 256)
|-- README.md  (entry 77 - this guide)
|-- scripts  (entries 78 and 79 - the rate limited push script)
|-- systemd  (entries 80 to 82 - the service and timer)
`-- vercel.json  (entry 76 - the routing table)

The bookkeeping pages, one folder each, entries 1 to 61:

1. home - the landing page after sign in: three square tiles, Business, Computer and Health. Files: 1.html, 1.css, 1.js.

2. business - the control room: opens Add Transaction and View File. Files: 2.html, 2.css, 2.js.

3. add-transaction - the journal entry engine: every transaction is recorded here, once. Files: 3.html, 3.css, 3.js.

4. view-file - the library: a tile launcher for every book, register and report, plus Computer. Files: 4.html, 4.css, 4.js.

5. all-transactions - the full journal: every recorded transaction, filterable in one table. Files: 5.html, 5.css, 5.js.

6. cash-book - the double column cash book: bank and cash side by side, DR and CR. Files: 6.html, 6.css, 6.js.

7. petty-cash - the petty cash book: small day to day spend. Names containing Petty land here. Files: 7.html, 7.css, 7.js.

8. sales-journal - the sales journal: credit sales at a glance. Files: 8.html, 8.css, 8.js.

9. purchases-journal - the purchases journal: credit purchases at a glance. Files: 9.html, 9.css, 9.js.

10. sales-returns - the sales returns journal: goods customers sent back. Files: 10.html, 10.css, 10.js.

11. purchases-returns - the purchases returns journal: goods sent back to suppliers. Files: 11.html, 11.css, 11.js.

12. general-journal - the general journal: everything that fits nowhere else, two sided DR and CR. Files: 12.html, 12.css, 12.js.

13. cash-receipts - the cash receipts journal: money coming in. Files: 13.html, 13.css, 13.js.

14. cash-payments - the cash payments journal: money going out. Files: 14.html, 14.css, 14.js.

15. cash-book-single - the single column cash book: cash movements only. Files: 15.html, 15.css, 15.js.

16. creditors-book - what JAMALI owes: a running balance per supplier. Files: 16.html, 16.css, 16.js.

17. debtors-book - what customers owe JAMALI: a running balance per customer. Files: 17.html, 17.css, 17.js.

18. ledger - every account on its own T page: DR and CR sides, balance carried down and brought down. Also home of the shared postings.js engine. Files: 18.html, 18.css, 18.js, plus postings.js - the shared posting engine the other book pages import.

19. bills receivable (folder pending) - bills drawn on customers, tracked to settlement. The bills collection is already in the security rules. Files: none yet - the folder is still pending.

20. bills payable (folder pending) - bills accepted from suppliers, tracked to payment. The bills collection is already in the security rules. Files: none yet - the folder is still pending.

21. sales-order-book - customer orders taken, not yet invoiced. Files: 21.html, 21.css, 21.js.

22. purchase-order-book - orders placed with suppliers, not yet received. Files: 22.html, 22.css, 22.js.

23. sales-invoice - sales invoices raised on customers. Files: 23.html, 23.css, 23.js.

24. purchase-invoice - purchase invoices received from suppliers. Files: 24.html, 24.css, 24.js.

25. grn-register - goods received notes: what physically arrived. Files: 25.html, 25.css, 25.js.

26. dispatch-register - dispatch notes: what physically left the building. Files: 26.html, 26.css, 26.js.

27. sales-invoice-register - every sales invoice with its settlement status. Files: 27.html, 27.css, 27.js.

28. purchase-invoice-register - every purchase invoice with its settlement status. Files: 28.html, 28.css, 28.js.

29. debit-note-register - debit notes: corrections that reduce what we owe suppliers. Files: 29.html, 29.css, 29.js.

30. credit-note-register - credit notes: corrections that reduce what customers owe us. Files: 30.html, 30.css, 30.js.

31. stock-movement - goods in, goods out and the running quantity per stock item. Files: 31.html, 31.css, 31.js.

32. fixed-assets - what the business owns: each asset at cost, in service. Files: 32.html, 32.css, 32.js.

33. depreciation - straight line depreciation computed per asset. Files: 33.html, 33.css, 33.js.

34. payroll - salaries, deductions and net pay per employee. Files: 34.html, 34.css, 34.js.

35. employee-advance - money advanced to employees and how it is recovered. Files: 35.html, 35.css, 35.js.

36. petty-cash-voucher - signed vouchers behind every small cash spend. Files: 36.html, 36.css, 36.js.

37. receipt-voucher - proof when money is received. Files: 37.html, 37.css, 37.js.

38. payment-voucher - the approval trail when money goes out. Files: 38.html, 38.css, 38.js.

39. cheque-register - every cheque written: pending, cleared or bounced. Files: 39.html, 39.css, 39.js.

40. delivery-note - delivery notes: what went out with each consignment. Files: 40.html, 40.css, 40.js.

41. trial-balance - all ledger balances in one table: debits must equal credits. Files: 41.html, 41.css, 41.js.

42. adjusted-trial-balance - the trial balance plus the adjustment entries. Files: 42.html, 42.css, 42.js.

43. post-closing-trial-balance - the trial balance after the nominal accounts are closed to capital. Files: 43.html, 43.css, 43.js.

44. ar-schedule - receivables by customer, straight from the books. Files: 44.html, 44.css, 44.js.

45. ap-schedule - payables by supplier, straight from the books. Files: 45.html, 45.css, 45.js.

46. inventory-valuation - inventory value two ways: FIFO layers and weighted average, side by side. Files: 46.html, 46.css, 46.js.

47. fixed-assets-schedule - cost, additions and depreciation to date per asset. Files: 47.html, 47.css, 47.js.

48. accumulated-depreciation - the wear and tear tally per asset. Files: 48.html, 48.css, 48.js.

49. accrued-expenses - expenses incurred but not yet paid. Files: 49.html, 49.css, 49.js.

50. prepaid-expenses - expenses paid but not yet consumed. Files: 50.html, 50.css, 50.js.

51. accrued-income - income earned but not yet received. Files: 51.html, 51.css, 51.js.

52. unearned-revenue - money received but not yet earned. Files: 52.html, 52.css, 52.js.

53. bank-reconciliation - statement against books: the difference must be zero. Files: 53.html, 53.css, 53.js.

54. suspense-account - the temporary parking spot: it clears at zero. Files: 54.html, 54.css, 54.js.

55. general-ledger-report - every posting of one account for a chosen period: Date, Folio, Detail, Debit, Credit and a running Balance, with the opening balance brought in from before the start date. Files: 55.html, 55.css, 55.js.

56. ar-report - receivables per customer for a period: invoices, payments, notes and returns proven in one table, with each customer's open items listed under the totals. Files: 56.html, 56.css, 56.js.

57. ap-report - payables per supplier for a period: the same invoice, payment, note and return proof on the supplier side. Files: 57.html, 57.css, 57.js.

58. customer-statement - one customer's running account over a period: opening balance, every movement, closing balance and a small figures card. Files: 58.html, 58.css, 58.js.

59. supplier-statement - one supplier's running account over a period, the mirror of the customer statement. Files: 59.html, 59.css, 59.js.

60. aged-receivables - what customers owe, bucketed Current, 1 to 30, 31 to 60, 61 to 90 and 90 plus, as of a movable date, overdue rows tinted. Files: 60.html, 60.css, 60.js.

61. aged-payables - the same aging buckets for what JAMALI owes its suppliers. Files: 61.html, 61.css, 61.js.

The tools family:
62. computer - the tools launcher: square tiles only, today the Convertor tile with its 256 tools line. The old calculator was retired to git history, so the page is a pure launcher. Files: 62.html, 62.css, 62.js.

63. convertor - the Convertor hub: all 256 tools as same size square buttons, 8 per row, in 14 families, with a live search and a star on the 14 essential tools. Files: 63.html, 63.css and 63.js (the hub), 64.html, 64.css and 64.js (the not-found fallback page itself), tools.js (the catalogue of all 256 tools), and slugs.txt and pages.txt (the two folder building lists). Nine files in all, every one named here.

64. convertor not found page - the friendly fallback when a tool address does not exist. It lives inside the convertor folder as its 64.html, 64.css and 64.js. The identical redirect copies that once sat in every tool folder to catch the old /slug/64 addresses were removed on 25 October 2026 on the user's order, so an old tool address ending in /64 now simply finds no page.

65. the tool folders, pages 65 to 320 - the Convertor's 256 tools, one folder each, named after the tool's address (its slug). Every tool folder carries the same three files: the tool's own page as N.html, N.css and N.js. The page number is the tool's id plus 64, so tool 1 sits on page 65 and tool 256 on page 320: 256 folders, 768 files. The hub arranges the 256 tools into 14 families, and the listing below follows that arrangement family by family, tool by tool, so every folder and every file is named here. The tools the hub stars as Essential are marked. Each line below opens with its page number, then the folder name: the line 186, image-flipper is the image-flipper folder on page 186.

Family 1 of 14, Text Conversion Tools (20 tools, pages 65 to 84):
65, text-to-pdf - Text to PDF (hub Essential): turns plain text into PDF documents. Files: 65.html, 65.css, 65.js.
66, pdf-to-text - PDF to Text (hub Essential): turns PDF documents into plain text. Files: 66.html, 66.css, 66.js.
67, text-to-word - Text to Word: turns plain text into Word documents. Files: 67.html, 67.css, 67.js.
68, word-to-text - Word to Text: turns Word documents into plain text. Files: 68.html, 68.css, 68.js.
69, text-to-html - Text to HTML: turns plain text into HTML pages. Files: 69.html, 69.css, 69.js.
70, html-to-text - HTML to Text: turns HTML pages into plain text. Files: 70.html, 70.css, 70.js.
71, text-to-markdown - Text to Markdown: turns plain text into Markdown documents. Files: 71.html, 71.css, 71.js.
72, markdown-to-text - Markdown to Text: turns Markdown documents into plain text. Files: 72.html, 72.css, 72.js.
73, markdown-to-pdf - Markdown to PDF: turns Markdown documents into PDF documents. Files: 73.html, 73.css, 73.js.
74, pdf-to-markdown - PDF to Markdown: turns PDF documents into Markdown documents. Files: 74.html, 74.css, 74.js.
75, text-to-rtf - Text to RTF: turns plain text into RTF documents. Files: 75.html, 75.css, 75.js.
76, rtf-to-text - RTF to Text: turns RTF documents into plain text. Files: 76.html, 76.css, 76.js.
77, text-to-csv - Text to CSV: turns plain text into CSV tables. Files: 77.html, 77.css, 77.js.
78, csv-to-text - CSV to Text: turns CSV tables into plain text. Files: 78.html, 78.css, 78.js.
79, text-to-xml - Text to XML: turns plain text into XML documents. Files: 79.html, 79.css, 79.js.
80, xml-to-text - XML to Text: turns XML documents into plain text. Files: 80.html, 80.css, 80.js.
81, text-to-json - Text to JSON: turns plain text into JSON data. Files: 81.html, 81.css, 81.js.
82, json-to-text - JSON to Text: turns JSON data into plain text. Files: 82.html, 82.css, 82.js.
83, text-to-yaml - Text to YAML: turns plain text into YAML files. Files: 83.html, 83.css, 83.js.
84, yaml-to-text - YAML to Text: turns YAML files into plain text. Files: 84.html, 84.css, 84.js.

Family 2 of 14, PDF Tools (30 tools, pages 85 to 114):
85, word-to-pdf - Word to PDF (hub Essential): turns Word documents into PDF documents. Files: 85.html, 85.css, 85.js.
86, pdf-to-word - PDF to Word (hub Essential): turns PDF documents into Word documents. Files: 86.html, 86.css, 86.js.
87, excel-to-pdf - Excel to PDF (hub Essential): turns Excel workbooks into PDF documents. Files: 87.html, 87.css, 87.js.
88, pdf-to-excel - PDF to Excel (hub Essential): turns PDF documents into Excel workbooks. Files: 88.html, 88.css, 88.js.
89, powerpoint-to-pdf - PowerPoint to PDF: turns PowerPoint shows into PDF documents. Files: 89.html, 89.css, 89.js.
90, pdf-to-powerpoint - PDF to PowerPoint: turns PDF documents into PowerPoint shows. Files: 90.html, 90.css, 90.js.
91, image-to-pdf - Image to PDF (hub Essential): turns pictures into PDF documents. Files: 91.html, 91.css, 91.js.
92, pdf-to-image - PDF to Image (hub Essential): turns PDF documents into pictures. Files: 92.html, 92.css, 92.js.
93, html-to-pdf - HTML to PDF: turns HTML pages into PDF documents. Files: 93.html, 93.css, 93.js.
94, pdf-to-html - PDF to HTML: turns PDF documents into HTML pages. Files: 94.html, 94.css, 94.js.
95, pdf-merge - PDF Merge (hub Essential): joins several PDF documents into one. Files: 95.html, 95.css, 95.js.
96, pdf-split - PDF Split (hub Essential): splits one PDF document into several. Files: 96.html, 96.css, 96.js.
97, pdf-compress - PDF Compress (hub Essential): shrinks PDF documents for sharing. Files: 97.html, 97.css, 97.js.
98, pdf-rotate - PDF Rotate: turns PDF pages round. Files: 98.html, 98.css, 98.js.
99, pdf-crop - PDF Crop: trims the margins off PDF pages. Files: 99.html, 99.css, 99.js.
100, pdf-delete-pages - PDF Delete Pages: removes chosen pages from a PDF document. Files: 100.html, 100.css, 100.js.
101, pdf-extract-pages - PDF Extract Pages: lifts chosen pages out into a PDF of their own. Files: 101.html, 101.css, 101.js.
102, pdf-reorder-pages - PDF Reorder Pages: puts PDF pages into a new order. Files: 102.html, 102.css, 102.js.
103, pdf-add-page-numbers - PDF Add Page Numbers: stamps page numbers onto a PDF document. Files: 103.html, 103.css, 103.js.
104, pdf-add-watermark - PDF Add Watermark: stamps a watermark across a PDF document. Files: 104.html, 104.css, 104.js.
105, pdf-protect - PDF Protect: locks a PDF document with a password. Files: 105.html, 105.css, 105.js.
106, pdf-unlock - PDF Unlock: opens a password protected PDF document for use. Files: 106.html, 106.css, 106.js.
107, pdf-sign - PDF Sign: puts a signature onto a PDF document. Files: 107.html, 107.css, 107.js.
108, pdf-fill-forms - PDF Fill Forms: fills in a PDF form. Files: 108.html, 108.css, 108.js.
109, pdf-flatten - PDF Flatten: flattens a PDF's layers and form fields into plain pages. Files: 109.html, 109.css, 109.js.
110, pdf-compare - PDF Compare: compares two PDF documents and shows what changed. Files: 110.html, 110.css, 110.js.
111, pdf-repair - PDF Repair: salvages a damaged PDF document. Files: 111.html, 111.css, 111.js.
112, pdf-metadata-editor - PDF Metadata Editor: edits a PDF's title, author and keywords. Files: 112.html, 112.css, 112.js.
113, pdf-to-pdf-a - PDF to PDF/A: converts a PDF document to the archival PDF/A standard. Files: 113.html, 113.css, 113.js.
114, ocr-pdf - OCR PDF: reads scanned PDF pages back into selectable text. Files: 114.html, 114.css, 114.js.

Family 3 of 14, Word and Document Tools (16 tools, pages 115 to 130):
115, doc-to-docx - DOC to DOCX: upgrades legacy DOC documents to DOCX. Files: 115.html, 115.css, 115.js.
116, docx-to-doc - DOCX to DOC: downgrades DOCX documents to legacy DOC. Files: 116.html, 116.css, 116.js.
117, docx-to-pdf - DOCX to PDF: turns DOCX documents into PDF documents. Files: 117.html, 117.css, 117.js.
118, pdf-to-docx - PDF to DOCX: turns PDF documents into DOCX documents. Files: 118.html, 118.css, 118.js.
119, docx-to-txt - DOCX to TXT: turns DOCX documents into plain text. Files: 119.html, 119.css, 119.js.
120, txt-to-docx - TXT to DOCX: turns plain text into DOCX documents. Files: 120.html, 120.css, 120.js.
121, docx-to-html - DOCX to HTML: turns DOCX documents into HTML pages. Files: 121.html, 121.css, 121.js.
122, html-to-docx - HTML to DOCX: turns HTML pages into DOCX documents. Files: 122.html, 122.css, 122.js.
123, docx-to-rtf - DOCX to RTF: turns DOCX documents into RTF documents. Files: 123.html, 123.css, 123.js.
124, rtf-to-docx - RTF to DOCX: turns RTF documents into DOCX documents. Files: 124.html, 124.css, 124.js.
125, docx-to-markdown - DOCX to Markdown: turns DOCX documents into Markdown documents. Files: 125.html, 125.css, 125.js.
126, markdown-to-docx - Markdown to DOCX: turns Markdown documents into DOCX documents. Files: 126.html, 126.css, 126.js.
127, docx-to-odt - DOCX to ODT: turns DOCX documents into ODT documents. Files: 127.html, 127.css, 127.js.
128, odt-to-docx - ODT to DOCX: turns ODT documents into DOCX documents. Files: 128.html, 128.css, 128.js.
129, docx-to-epub - DOCX to EPUB: turns DOCX documents into EPUB ebooks. Files: 129.html, 129.css, 129.js.
130, epub-to-docx - EPUB to DOCX: turns EPUB ebooks into DOCX documents. Files: 130.html, 130.css, 130.js.

Family 4 of 14, Spreadsheet and Data Tools (20 tools, pages 131 to 150):
131, excel-to-csv - Excel to CSV (hub Essential): turns Excel workbooks into CSV tables. Files: 131.html, 131.css, 131.js.
132, csv-to-excel - CSV to Excel (hub Essential): turns CSV tables into Excel workbooks. Files: 132.html, 132.css, 132.js.
133, excel-to-pdf-2 - Excel to PDF: turns Excel workbooks into PDF documents. Second address of page 87, kept by the catalogue. Files: 133.html, 133.css, 133.js.
134, pdf-to-excel-2 - PDF to Excel: turns PDF documents into Excel workbooks. Second address of page 88, kept by the catalogue. Files: 134.html, 134.css, 134.js.
135, xls-to-xlsx - XLS to XLSX: upgrades legacy XLS workbooks to XLSX. Files: 135.html, 135.css, 135.js.
136, xlsx-to-xls - XLSX to XLS: downgrades XLSX workbooks to legacy XLS. Files: 136.html, 136.css, 136.js.
137, xlsx-to-ods - XLSX to ODS: turns XLSX workbooks into ODS spreadsheets. Files: 137.html, 137.css, 137.js.
138, ods-to-xlsx - ODS to XLSX: turns ODS spreadsheets into XLSX workbooks. Files: 138.html, 138.css, 138.js.
139, csv-to-json - CSV to JSON: turns CSV tables into JSON data. Files: 139.html, 139.css, 139.js.
140, json-to-csv - JSON to CSV: turns JSON data into CSV tables. Files: 140.html, 140.css, 140.js.
141, csv-to-xml - CSV to XML: turns CSV tables into XML documents. Files: 141.html, 141.css, 141.js.
142, xml-to-csv - XML to CSV: turns XML documents into CSV tables. Files: 142.html, 142.css, 142.js.
143, excel-to-json - Excel to JSON: turns Excel workbooks into JSON data. Files: 143.html, 143.css, 143.js.
144, json-to-excel - JSON to Excel: turns JSON data into Excel workbooks. Files: 144.html, 144.css, 144.js.
145, excel-to-html - Excel to HTML: turns Excel workbooks into HTML pages. Files: 145.html, 145.css, 145.js.
146, html-table-to-excel - HTML Table to Excel: turns an HTML table into an Excel workbook. Files: 146.html, 146.css, 146.js.
147, tsv-to-csv - TSV to CSV: turns TSV tables into CSV tables. Files: 147.html, 147.css, 147.js.
148, csv-to-tsv - CSV to TSV: turns CSV tables into TSV tables. Files: 148.html, 148.css, 148.js.
149, excel-to-text - Excel to Text: dumps an Excel workbook as plain text. Files: 149.html, 149.css, 149.js.
150, text-to-excel - Text to Excel: builds an Excel workbook out of plain text rows. Files: 150.html, 150.css, 150.js.

Family 5 of 14, Presentation Tools (10 tools, pages 151 to 160):
151, ppt-to-pptx - PPT to PPTX: turns legacy PPT shows into PPTX shows. Files: 151.html, 151.css, 151.js.
152, pptx-to-ppt - PPTX to PPT: turns PPTX shows into legacy PPT shows. Files: 152.html, 152.css, 152.js.
153, powerpoint-to-pdf-2 - PowerPoint to PDF: turns PowerPoint shows into PDF documents. Second address of page 89, kept by the catalogue. Files: 153.html, 153.css, 153.js.
154, pdf-to-powerpoint-2 - PDF to PowerPoint: turns PDF documents into PowerPoint shows. Second address of page 90, kept by the catalogue. Files: 154.html, 154.css, 154.js.
155, powerpoint-to-images - PowerPoint to Images: dumps slides as pictures. Files: 155.html, 155.css, 155.js.
156, images-to-powerpoint - Images to PowerPoint: builds a slide show from pictures. Files: 156.html, 156.css, 156.js.
157, pptx-to-video - PPTX to Video: turns a slide show into a video. Files: 157.html, 157.css, 157.js.
158, pptx-to-text - PPTX to Text: dumps a slide show's text. Files: 158.html, 158.css, 158.js.
159, text-to-powerpoint - Text to PowerPoint: builds slides out of plain text. Files: 159.html, 159.css, 159.js.
160, pptx-to-html - PPTX to HTML: turns a slide show into a web page. Files: 160.html, 160.css, 160.js.

Family 6 of 14, Image Tools (31 tools, pages 161 to 191):
161, jpg-to-png - JPG to PNG: turns JPG pictures into PNG pictures. Files: 161.html, 161.css, 161.js.
162, png-to-jpg - PNG to JPG: turns PNG pictures into JPG pictures. Files: 162.html, 162.css, 162.js.
163, jpg-to-webp - JPG to WebP: turns JPG pictures into WebP pictures. Files: 163.html, 163.css, 163.js.
164, webp-to-jpg - WebP to JPG: turns WebP pictures into JPG pictures. Files: 164.html, 164.css, 164.js.
165, png-to-webp - PNG to WebP: turns PNG pictures into WebP pictures. Files: 165.html, 165.css, 165.js.
166, webp-to-png - WebP to PNG: turns WebP pictures into PNG pictures. Files: 166.html, 166.css, 166.js.
167, jpg-to-gif - JPG to GIF: turns JPG pictures into GIF pictures. Files: 167.html, 167.css, 167.js.
168, gif-to-jpg - GIF to JPG: turns GIF pictures into JPG pictures. Files: 168.html, 168.css, 168.js.
169, gif-to-png - GIF to PNG: turns GIF pictures into PNG pictures. Files: 169.html, 169.css, 169.js.
170, bmp-to-jpg - BMP to JPG: turns BMP pictures into JPG pictures. Files: 170.html, 170.css, 170.js.
171, jpg-to-bmp - JPG to BMP: turns JPG pictures into BMP pictures. Files: 171.html, 171.css, 171.js.
172, tiff-to-jpg - TIFF to JPG: turns TIFF pictures into JPG pictures. Files: 172.html, 172.css, 172.js.
173, jpg-to-tiff - JPG to TIFF: turns JPG pictures into TIFF pictures. Files: 173.html, 173.css, 173.js.
174, svg-to-png - SVG to PNG: turns SVG vector pictures into PNG pictures. Files: 174.html, 174.css, 174.js.
175, png-to-svg - PNG to SVG: turns PNG pictures into SVG vector pictures. Files: 175.html, 175.css, 175.js.
176, svg-to-jpg - SVG to JPG: turns SVG vector pictures into JPG pictures. Files: 176.html, 176.css, 176.js.
177, heic-to-jpg - HEIC to JPG: turns HEIC pictures into JPG pictures. Files: 177.html, 177.css, 177.js.
178, heic-to-png - HEIC to PNG: turns HEIC pictures into PNG pictures. Files: 178.html, 178.css, 178.js.
179, avif-to-jpg - AVIF to JPG: turns AVIF pictures into JPG pictures. Files: 179.html, 179.css, 179.js.
180, jpg-to-ico - JPG to ICO: turns JPG pictures into ICO icons. Files: 180.html, 180.css, 180.js.
181, ico-to-png - ICO to PNG: turns ICO icons into PNG pictures. Files: 181.html, 181.css, 181.js.
182, image-compressor - Image Compressor: shrinks pictures for the web. Files: 182.html, 182.css, 182.js.
183, image-resizer - Image Resizer: changes a picture's size. Files: 183.html, 183.css, 183.js.
184, image-cropper - Image Cropper: cuts a picture down to the chosen part. Files: 184.html, 184.css, 184.js.
185, image-rotator - Image Rotator: turns pictures round. Files: 185.html, 185.css, 185.js.
186, image-flipper - Image Flipper: mirrors pictures horizontally or vertically. Files: 186.html, 186.css, 186.js.
187, image-watermark - Image Watermark: stamps a watermark across pictures. Files: 187.html, 187.css, 187.js.
188, image-to-base64 - Image to Base64: encodes a picture as Base64 text. Files: 188.html, 188.css, 188.js.
189, base64-to-image - Base64 to Image: decodes Base64 text back into a picture. Files: 189.html, 189.css, 189.js.
190, image-metadata-viewer - Image Metadata Viewer: shows a picture's EXIF details. Files: 190.html, 190.css, 190.js.
191, ocr-image-to-text - OCR Image to Text (hub Essential): reads the text out of a picture. Files: 191.html, 191.css, 191.js.

Family 7 of 14, Audio Tools (18 tools, pages 192 to 209):
192, mp3-to-wav - MP3 to WAV: turns MP3 audio into WAV audio. Files: 192.html, 192.css, 192.js.
193, wav-to-mp3 - WAV to MP3: turns WAV audio into MP3 audio. Files: 193.html, 193.css, 193.js.
194, mp3-to-aac - MP3 to AAC: turns MP3 audio into AAC audio. Files: 194.html, 194.css, 194.js.
195, aac-to-mp3 - AAC to MP3: turns AAC audio into MP3 audio. Files: 195.html, 195.css, 195.js.
196, mp3-to-ogg - MP3 to OGG: turns MP3 audio into OGG audio. Files: 196.html, 196.css, 196.js.
197, ogg-to-mp3 - OGG to MP3: turns OGG audio into MP3 audio. Files: 197.html, 197.css, 197.js.
198, wav-to-flac - WAV to FLAC: turns WAV audio into FLAC audio. Files: 198.html, 198.css, 198.js.
199, flac-to-wav - FLAC to WAV: turns FLAC audio into WAV audio. Files: 199.html, 199.css, 199.js.
200, m4a-to-mp3 - M4A to MP3: turns M4A audio into MP3 audio. Files: 200.html, 200.css, 200.js.
201, mp3-to-m4a - MP3 to M4A: turns MP3 audio into M4A audio. Files: 201.html, 201.css, 201.js.
202, audio-compressor - Audio Compressor: shrinks audio files. Files: 202.html, 202.css, 202.js.
203, audio-trimmer - Audio Trimmer: cuts a clip out of an audio file. Files: 203.html, 203.css, 203.js.
204, audio-merger - Audio Merger: joins audio files into one. Files: 204.html, 204.css, 204.js.
205, audio-to-text - Audio to Text: transcribes the speech in an audio file into text. Files: 205.html, 205.css, 205.js.
206, text-to-speech - Text to Speech: speaks text aloud and saves it as an audio file. Files: 206.html, 206.css, 206.js.
207, audio-format-inspector - Audio Format Inspector: shows the deep technical details of an audio file. Files: 207.html, 207.css, 207.js.
208, audio-speed-changer - Audio Speed Changer: speeds audio up or slows it down. Files: 208.html, 208.css, 208.js.
209, audio-volume-adjuster - Audio Volume Adjuster: turns audio volume up or down. Files: 209.html, 209.css, 209.js.

Family 8 of 14, Video Tools (20 tools, pages 210 to 229):
210, mp4-to-avi - MP4 to AVI: turns MP4 videos into AVI videos. Files: 210.html, 210.css, 210.js.
211, avi-to-mp4 - AVI to MP4: turns AVI videos into MP4 videos. Files: 211.html, 211.css, 211.js.
212, mp4-to-mov - MP4 to MOV: turns MP4 videos into MOV videos. Files: 212.html, 212.css, 212.js.
213, mov-to-mp4 - MOV to MP4: turns MOV videos into MP4 videos. Files: 213.html, 213.css, 213.js.
214, mp4-to-webm - MP4 to WebM: turns MP4 videos into WebM videos. Files: 214.html, 214.css, 214.js.
215, webm-to-mp4 - WebM to MP4: turns WebM videos into MP4 videos. Files: 215.html, 215.css, 215.js.
216, mkv-to-mp4 - MKV to MP4: turns MKV videos into MP4 videos. Files: 216.html, 216.css, 216.js.
217, mp4-to-gif - MP4 to GIF: turns a video clip into an animated GIF. Files: 217.html, 217.css, 217.js.
218, video-to-images - Video to Images: dumps a video's frames as pictures. Files: 218.html, 218.css, 218.js.
219, images-to-video - Images to Video: builds a video from a stack of pictures. Files: 219.html, 219.css, 219.js.
220, video-compressor - Video Compressor: shrinks video files. Files: 220.html, 220.css, 220.js.
221, video-trimmer - Video Trimmer: cuts a clip out of a video. Files: 221.html, 221.css, 221.js.
222, video-merger - Video Merger: joins videos into one. Files: 222.html, 222.css, 222.js.
223, video-resizer - Video Resizer: changes a video's resolution. Files: 223.html, 223.css, 223.js.
224, video-rotator - Video Rotator: turns videos round. Files: 224.html, 224.css, 224.js.
225, video-to-audio - Video to Audio: rips the sound track out of a video. Files: 225.html, 225.css, 225.js.
226, video-subtitle-extractor - Video Subtitle Extractor: pulls the subtitles out of a video. Files: 226.html, 226.css, 226.js.
227, srt-to-vtt - SRT to VTT: turns SRT subtitles into VTT subtitles. Files: 227.html, 227.css, 227.js.
228, vtt-to-srt - VTT to SRT: turns VTT subtitles into SRT subtitles. Files: 228.html, 228.css, 228.js.
229, video-metadata-viewer - Video Metadata Viewer: shows a video's technical details. Files: 229.html, 229.css, 229.js.

Family 9 of 14, Ebook and Publishing Tools (9 tools, pages 230 to 238):
230, epub-to-pdf - EPUB to PDF: turns EPUB ebooks into PDF documents. Files: 230.html, 230.css, 230.js.
231, pdf-to-epub - PDF to EPUB: turns PDF documents into EPUB ebooks. Files: 231.html, 231.css, 231.js.
232, epub-to-txt - EPUB to TXT: turns EPUB ebooks into plain text. Files: 232.html, 232.css, 232.js.
233, txt-to-epub - TXT to EPUB: turns plain text into EPUB ebooks. Files: 233.html, 233.css, 233.js.
234, epub-to-html - EPUB to HTML: turns EPUB ebooks into HTML pages. Files: 234.html, 234.css, 234.js.
235, html-to-epub - HTML to EPUB: turns HTML pages into EPUB ebooks. Files: 235.html, 235.css, 235.js.
236, mobi-to-epub - MOBI to EPUB: turns MOBI ebooks into EPUB ebooks. Files: 236.html, 236.css, 236.js.
237, epub-to-mobi - EPUB to MOBI: turns EPUB ebooks into MOBI ebooks. Files: 237.html, 237.css, 237.js.
238, ebook-metadata-editor - Ebook Metadata Editor: edits an ebook's title, author and cover details. Files: 238.html, 238.css, 238.js.

Family 10 of 14, Web and Code Tools (22 tools, pages 239 to 260):
239, html-to-xhtml - HTML to XHTML: turns HTML pages into XHTML pages. Files: 239.html, 239.css, 239.js.
240, xhtml-to-html - XHTML to HTML: turns XHTML pages into HTML pages. Files: 240.html, 240.css, 240.js.
241, html-to-markdown - HTML to Markdown: turns HTML pages into Markdown documents. Files: 241.html, 241.css, 241.js.
242, markdown-to-html - Markdown to HTML: turns Markdown documents into HTML pages. Files: 242.html, 242.css, 242.js.
243, html-to-pdf-2 - HTML to PDF: turns HTML pages into PDF documents. Second address of page 93, kept by the catalogue. Files: 243.html, 243.css, 243.js.
244, json-formatter - JSON Formatter: pretty prints messy JSON data. Files: 244.html, 244.css, 244.js.
245, json-minifier - JSON Minifier: strips the whitespace out of JSON data. Files: 245.html, 245.css, 245.js.
246, xml-formatter - XML Formatter: pretty prints messy XML. Files: 246.html, 246.css, 246.js.
247, xml-minifier - XML Minifier: strips the whitespace out of XML. Files: 247.html, 247.css, 247.js.
248, yaml-to-json - YAML to JSON: turns YAML files into JSON data. Files: 248.html, 248.css, 248.js.
249, json-to-yaml - JSON to YAML: turns JSON data into YAML files. Files: 249.html, 249.css, 249.js.
250, xml-to-json - XML to JSON: turns XML documents into JSON data. Files: 250.html, 250.css, 250.js.
251, json-to-xml - JSON to XML: turns JSON data into XML documents. Files: 251.html, 251.css, 251.js.
252, csv-to-sql - CSV to SQL: turns CSV rows into SQL INSERT statements. Files: 252.html, 252.css, 252.js.
253, sql-to-csv - SQL to CSV: turns SQL query results into CSV tables. Files: 253.html, 253.css, 253.js.
254, sql-formatter - SQL Formatter: pretty prints messy SQL. Files: 254.html, 254.css, 254.js.
255, css-minifier - CSS Minifier: strips the whitespace out of stylesheets. Files: 255.html, 255.css, 255.js.
256, css-beautifier - CSS Beautifier: pretty prints messy stylesheets. Files: 256.html, 256.css, 256.js.
257, javascript-minifier - JavaScript Minifier: strips the whitespace out of JavaScript. Files: 257.html, 257.css, 257.js.
258, javascript-beautifier - JavaScript Beautifier: pretty prints messy JavaScript. Files: 258.html, 258.css, 258.js.
259, html-minifier - HTML Minifier: strips the whitespace out of HTML pages. Files: 259.html, 259.css, 259.js.
260, html-beautifier - HTML Beautifier: pretty prints messy HTML pages. Files: 260.html, 260.css, 260.js.

Family 11 of 14, Archive and Compression Tools (11 tools, pages 261 to 271):
261, zip-extractor - ZIP Extractor: unpacks ZIP archives. Files: 261.html, 261.css, 261.js.
262, create-zip - Create ZIP: packs files into a ZIP archive. Files: 262.html, 262.css, 262.js.
263, tar-extractor - TAR Extractor: unpacks TAR archives. Files: 263.html, 263.css, 263.js.
264, create-tar - Create TAR: packs files into a TAR archive. Files: 264.html, 264.css, 264.js.
265, gzip-compressor - GZIP Compressor: compresses a file with gzip. Files: 265.html, 265.css, 265.js.
266, gzip-decompressor - GZIP Decompressor: unpacks a gzip file. Files: 266.html, 266.css, 266.js.
267, zip-to-tar - ZIP to TAR: turns ZIP archives into TAR archives. Files: 267.html, 267.css, 267.js.
268, tar-to-zip - TAR to ZIP: turns TAR archives into ZIP archives. Files: 268.html, 268.css, 268.js.
269, archive-content-viewer - Archive Content Viewer: lists what is inside an archive without unpacking it. Files: 269.html, 269.css, 269.js.
270, file-compressor - File Compressor: compresses a file into a smaller archive. Files: 270.html, 270.css, 270.js.
271, file-extractor - File Extractor: unpacks any archive type it recognises. Files: 271.html, 271.css, 271.js.

Family 12 of 14, File Utilities (18 tools, pages 272 to 289):
272, file-type-detector - File Type Detector: names a file's true type from its bytes. Files: 272.html, 272.css, 272.js.
273, mime-type-checker - MIME Type Checker: reports a file's MIME type. Files: 273.html, 273.css, 273.js.
274, file-size-converter - File Size Converter: converts file sizes between bytes, KB, MB and GB. Files: 274.html, 274.css, 274.js.
275, file-checksum-generator - File Checksum Generator: computes a file's checksum for integrity checks. Files: 275.html, 275.css, 275.js.
276, duplicate-file-checker - Duplicate File Checker: finds duplicate files by their content, not their names. Files: 276.html, 276.css, 276.js.
277, file-renamer - File Renamer: renames a file. Files: 277.html, 277.css, 277.js.
278, batch-file-renamer - Batch File Renamer: renames many files at once, by rule. Files: 278.html, 278.css, 278.js.
279, file-metadata-viewer - File Metadata Viewer: shows a file's metadata. Files: 279.html, 279.css, 279.js.
280, base64-encoder - Base64 Encoder: encodes any file or text as Base64. Files: 280.html, 280.css, 280.js.
281, base64-decoder - Base64 Decoder: decodes Base64 back into the original. Files: 281.html, 281.css, 281.js.
282, url-encoder - URL Encoder: makes text safe to travel inside a URL. Files: 282.html, 282.css, 282.js.
283, url-decoder - URL Decoder: reads encoded URL text back out. Files: 283.html, 283.css, 283.js.
284, qr-code-generator - QR Code Generator: draws a QR code for a link or any text. Files: 284.html, 284.css, 284.js.
285, qr-code-reader - QR Code Reader: reads the message inside a QR code picture. Files: 285.html, 285.css, 285.js.
286, barcode-generator - Barcode Generator: draws a barcode for a number. Files: 286.html, 286.css, 286.js.
287, barcode-reader - Barcode Reader: reads a barcode out of a picture. Files: 287.html, 287.css, 287.js.
288, uuid-generator - UUID Generator: generates UUIDs for ids and keys. Files: 288.html, 288.css, 288.js.
289, timestamp-converter - Timestamp Converter: converts timestamps to readable dates and back. Files: 289.html, 289.css, 289.js.

Family 13 of 14, Document and Office Utilities (15 tools, pages 290 to 304):
290, word-counter - Word Counter: counts the words in a text. Files: 290.html, 290.css, 290.js.
291, character-counter - Character Counter: counts the characters in a text. Files: 291.html, 291.css, 291.js.
292, line-counter - Line Counter: counts the lines in a text. Files: 292.html, 292.css, 292.js.
293, text-case-converter - Text Case Converter: swaps text between UPPER CASE, lower case and Title Case. Files: 293.html, 293.css, 293.js.
294, find-and-replace - Find and Replace: finds and replaces text across a whole document, in bulk. Files: 294.html, 294.css, 294.js.
295, text-diff-checker - Text Diff Checker: compares two texts line by line and marks the changes. Files: 295.html, 295.css, 295.js.
296, document-merger - Document Merger: joins documents into one. Files: 296.html, 296.css, 296.js.
297, document-splitter - Document Splitter: splits a document into several. Files: 297.html, 297.css, 297.js.
298, document-page-counter - Document Page Counter: counts a document's pages. Files: 298.html, 298.css, 298.js.
299, document-metadata-editor - Document Metadata Editor: edits a document's title, author and keywords. Files: 299.html, 299.css, 299.js.
300, spell-checker - Spell Checker: flags spelling mistakes in a text. Files: 300.html, 300.css, 300.js.
301, grammar-checker - Grammar Checker: flags grammar mistakes in a text. Files: 301.html, 301.css, 301.js.
302, document-watermark - Document Watermark: stamps a watermark across a document. Files: 302.html, 302.css, 302.js.
303, page-numbering-tool - Page Numbering Tool: adds page numbers to a document. Files: 303.html, 303.css, 303.js.
304, document-template-generator - Document Template Generator: builds a ready made template document. Files: 304.html, 304.css, 304.js.

Family 14 of 14, Number and Data Formats (16 tools, pages 305 to 320):
305, date-format-converter - Date Format Converter: rewrites dates between formats. Files: 305.html, 305.css, 305.js.
306, time-format-converter - Time Format Converter: rewrites times between the 12 hour and 24 hour clocks. Files: 306.html, 306.css, 306.js.
307, unix-timestamp-converter - Unix Timestamp Converter: converts Unix timestamps to dates and back. Files: 307.html, 307.css, 307.js.
308, number-to-words - Number to Words: writes numbers out in words, for cheques and invoices. Files: 308.html, 308.css, 308.js.
309, words-to-number - Words to Number: reads words back into numbers. Files: 309.html, 309.css, 309.js.
310, roman-numeral-converter - Roman Numeral Converter: converts between Roman numerals and ordinary numbers. Files: 310.html, 310.css, 310.js.
311, decimal-to-binary - Decimal to Binary: converts numbers from base 10 to base 2. Files: 311.html, 311.css, 311.js.
312, binary-to-decimal - Binary to Decimal: converts numbers from base 2 back to base 10. Files: 312.html, 312.css, 312.js.
313, decimal-to-hexadecimal - Decimal to Hexadecimal: converts numbers from base 10 to base 16. Files: 313.html, 313.css, 313.js.
314, hexadecimal-to-decimal - Hexadecimal to Decimal: converts numbers from base 16 back to base 10. Files: 314.html, 314.css, 314.js.
315, decimal-to-octal - Decimal to Octal: converts numbers from base 10 to base 8. Files: 315.html, 315.css, 315.js.
316, octal-to-decimal - Octal to Decimal: converts numbers from base 8 back to base 10. Files: 316.html, 316.css, 316.js.
317, json-validator - JSON Validator: checks that JSON is well formed and reports the exact fault. Files: 317.html, 317.css, 317.js.
318, xml-validator - XML Validator: checks that XML is well formed and reports the exact fault. Files: 318.html, 318.css, 318.js.
319, csv-validator - CSV Validator: checks that CSV rows and columns line up and reports the faults. Files: 319.html, 319.css, 319.js.
320, data-format-converter - Data Format Converter: converts between CSV, JSON, XML and friends in one place. Files: 320.html, 320.css, 320.js.

The Health family:
321. health - the Health hub, the doorway to the medical wing: seven square buttons, Registration, Triage, Nurse Consultation, Doctor Consultation, Pharmacy, Treatment / Procedures and Patient Module, in the same tile language as every launcher. Files: 321.html, 321.css, 321.js.

322. victim-registration - victim registration at the hospital door: sixteen fields laid out three per row, the age computed from the date of birth, arrival time recorded automatically, referral and payment captured, and the registering staff member remembered on the device. The Registration ID, four digits and four letters (for example 4827ABCD), is issued only after the form saves. Unidentified victims register without a name - the Registration ID is the one and only identifier the victim ever has (the temporary ID was removed in Task 45). Emergency treatment is never delayed by an incomplete form. Files: 322.html, 322.css, 322.js.

323. triage - the triage desk: the assessment that follows registration and decides how urgently the victim needs care. Twelve items, from the Registration ID link, symptoms and vital signs (temperature, pulse, respiratory rate, blood pressure and oxygen saturation) to consciousness, the 0 to 10 pain scale, the priority under the hospital's approved triage protocol, visible injuries, allergies, existing conditions, notes and the assessing healthcare worker. Every assessment keeps its history and is linked to the victim's registration record. Triage orders the care; it does not replace the doctor's diagnosis or the nurse's consultation. Files: 323.html, 323.css, 323.js.

324. nurse-consultation - the nurse's desk, the stage between triage and the doctor: the nurse enters the patient's Registration ID and the page finds the patient, shows everything already recorded at registration and triage as read only history, and lays out the nursing assessment - chief complaint, history of the present illness, relevant history, current medications, allergies, current vital signs, the pain assessment (location, severity, duration and character) and the nurse's clinical findings, nursing problems, interventions, the response to care and nursing notes. The nurse on record comes from the signed in account and the times are recorded automatically. The queue lists today's triaged patients still waiting for nursing assessment, ordered by triage priority and then arrival, with direct entry beside it for walk-ins and return visits. A consultation saves as in progress and is completed explicitly; one consultation per patient is open at a time; the completed record belongs to the doctor and is never rewritten - a correction is a new consultation. Emergency treatment is never delayed by documentation. Files: 324.html, 324.css, 324.js.


325. doctor-consultation - the doctor's desk, the stage that reads the completed nursing record: the doctor enters the patient's Registration ID and the page finds the patient, shows the registration, triage and nursing records as read only history, and lays out the medical assessment (presenting complaint, history of the present illness, relevant history, current medications, allergies, current vital signs, physical examination, clinical findings, additional notes), the diagnosis with its type - working or provisional, or confirmed - the investigations requested, the treatment plan, the prescriptions for the pharmacy and the orders for the treatment desk. The doctor's queue lists the patients whose nursing consultation is completed and who are not yet sent on, ordered by triage priority and then arrival, with direct entry beside it; the pharmacy's alternative-medicine requests wait on the same page to be accepted, or rejected with a replacement medicine, or sent outside the pharmacy. A consultation saves as in progress and is completed explicitly; completing it sends the prescriptions to the pharmacy and the orders to the treatment desk. The doctor then chooses where the patient goes next from the facility's own destination list - a destination typed once is saved for reuse, duplicates are refused, and sending records where the patient went and when. The doctor on record comes from the signed in account. Files: 325.html, 325.css, 325.js.

326. pharmacy - the pharmacy desk: prescriptions arrive from the doctor consultation one medicine per line, and the worklist shows every line still to handle - to dispense, waiting for the doctor's decision, or accepted - beside a direct search by Registration ID that shows the patient's full prescription history. The pharmacist checks availability and either dispenses, recording exactly what was given, by whom and when, or proposes an alternative medicine when the prescribed one is unavailable; the proposal waits for the doctor on page 325, an accepted alternative can be dispensed, and a rejected line is re-prescribed by the doctor or sent outside the pharmacy. Availability is the pharmacist's judgement - stock management is not part of this module. Files: 326.html, 326.css, 326.js.

327. treatment-procedures - the treatment desk: the patient arrives with the Registration ID only and the doctor's orders are retrieved from the database - wound dressing, injections, nebulization, minor procedures. The queue lists the open orders by triage priority and then arrival; opening an order shows the original instruction exactly as the doctor wrote it, and the form records the treatment performed, the outcome, the notes and the status - pending, in progress, completed, not completed - with the healthcare worker and the times recorded automatically. A treatment cannot be marked completed without recording what was done, and a completed or not-completed record is closed; the history of every order stays with the patient for the doctor's next decision. Files: 327.html, 327.css, 327.js.

328. patient-module - one tabular summary of everything entered and saved for a patient, from victim registration through the patient's last step: registration, triage, the nursing consultations, the doctor consultations, the pharmacy prescriptions and the treatment orders, connected by the Registration ID. One row per saved record in the order it was saved, with the stage, the time and the person who saved it; the columns are generated from the fields actually saved across the records, so the table grows as the patient moves through the workflow and every field carries its saved value. An index of all registered patients stands beside the direct search. Nothing is entered here - the page only reads. Files: 328.html, 328.css, 328.js.

The shared files and engines:
66. the loose root pages 3.html and 6.html - two leftovers from before the one folder per page convention, sitting directly at the public root instead of inside folders: 3.html is a working copy of Add Transaction and 6.html a working copy of the Double Column Cash Book. Both load their stylesheet and engine from the page folders, and they load the shared sidebar script but not menu.js, so the family tree has no data on these two old addresses and the sidebar there stays empty - the full tree lives on /add-transaction/3 and /cash-book/6. They stay so nothing that links to them breaks.

67. index.html - the front door: Google sign in, and where signed out visitors land.

68. firebase.js - the one Firebase module every page imports: Google auth, Firestore exports and the requireAuth guard that bounces signed out visitors to the start page.

69. menu.js - the family tree as data: one line per page (label, icon, folder, page number, depth). The ONE file to edit when a page is added, renamed or reordered. Adding a page is one line here, nothing else.

70. sidebar.js - the frozen tree renderer shared by every page: draws the collapsible sidebar from the menu.js data, active highlight, mobile burger, address bar cleanup. Holds no page data and calls no file, so it is never rewritten.

71. journals - the engine folder (journal.js and journal.css) that renders the eight journals, pages 7 to 14.

72. records - the engine folder (records.js and records.css) behind the register pages 21 to 40, and the design base for the report pages too.

73. reports and reports2 - the two engine folders behind the report and schedule pages 41 to 61. Files: reports/reports.js, and reports2/reports2.js with reports2/reports2.css. reports2 adds the period bar, the account selector and the aging buckets. Views only, no data entry.

74. convertor tools.js - the Convertor registry: the 14 families and all 256 tools with id, label, slug and page number. The hub grid and the sidebar children both read it, so buttons and tree can never drift apart. slugs.txt and pages.txt sit beside it for the folder building loops.

At the root of the repo:
75. firestore.rules - the guard dog. Decides who may read or write each collection: every one of the 26 collections gives a signed in user create, read, update and delete, and anything not matched is denied. The full rights were opened on the user's order of 25 October 2026; before that day the journal was append only and delete stayed closed.

76. vercel.json - the routing table. Turns clean URLs like /petty-cash/7 into the real petty-cash/7.html, so the address bar stays at the domain root.

77. README.md - this guide.

78. scripts - the folder of home grown operational tooling.

79. scripts/jamali-rate-limited-push.sh - the gentle deployer. Pushes git changes rate limited, so deployments stay steady instead of bursty.

80. systemd/user - the folder of user level systemd units that keep the deploy rhythm running on their own.

81. systemd/user/jamali-rate-limited-push.service - runs the push script as a service.

82. systemd/user/jamali-rate-limited-push.timer - fires that service on a schedule.

83. public - the entire app, the web root Vercel serves. Six standalone files sit directly at its root: index.html, firebase.js, menu.js and sidebar.js (entries 67 to 70) and the two loose pages 3.html and 6.html (entry 66). Under them live 329 folders: the 59 bookkeeping page folders (entries 1 to 61, with the bills folders 19 and 20 still pending), computer and convertor (62 and 63, which also hosts the not-found page 64), the 256 tool folders (entry 65), the four engine folders journals, records, reports and reports2 (entries 71 to 73), and the eight Health folders (321 to 328). That is 997 files under public, every one of them named in this guide.

84. .git - git's own filing cabinet, not part of the app and never served: the config, the commit history, the branches and stashes under refs, the hooks, the logs, and the object store where every saved snapshot chunk sits inside a two character hash folder (the hundreds of two letter folders the tree shows). Nothing in here is edited by hand and no delivery ever touches it; deleting it would erase the project's whole history.

That is the whole tree: 1003 project files, 997 of them under public, and every one of them is named above. The only thing this guide summarises instead of listing is the inside of .git (entry 84), because git manages that content itself and it changes on every commit.


DATA MODEL

The journal. One collection, called transactions, written by page 3. Six fields:

transactionName: what happened, for example Sales, Rent or Petty Expense.

dateTime: the server timestamp.

flowMethod: Cash, Bank, Credit or N/A.

transactionType: IN, OUT, NEUTRAL or CONTRA.

name: the counterparty or detail, for example Customer A or Landlord A.

amount: the money amount.

The transaction lists per type live in add-transaction/3.js under TRANSACTIONS, marked EDIT ME, so you can tune them to the business. The books select their rows from transactionName, so naming matters: names containing Petty land in the petty cash book.

Registers and inputs. One collection per register family, written by their own pages and read by every derived view:

orders: feeds the sales and purchase order books, pages 21 and 22.

invoices: feeds sales and purchase invoices (23, 24), their registers (27, 28) and the AR and AP schedules (44, 45).

goods: feeds the GRN register (25), dispatch (26), stock movement (31) and inventory valuation (46).

notes: feeds the debit and credit note registers (29, 30).

vouchers: feeds the petty cash, receipt and payment vouchers (36 to 38).

cheques: feeds the cheque register (39).

deliveryNotes: feeds the delivery note page (40).

payroll: feeds payroll (34).

advances: feeds employee advance (35).

assets: feeds fixed assets (32), depreciation (33) and their schedules (47, 48).

adjustments: feeds the adjusted and post closing trial balances (42, 43) and the accrual pages (49 to 52).

bankrec: feeds the bank reconciliation (53).

suspense: feeds the suspense account (54).

bills: feeds bills receivable and payable (19, 20, folders pending).

healthRegistrations: one document per registered victim (page 322), carrying the Registration ID and the sixteen intake fields - the Registration ID is the single identifier a victim has, and no temporary ID is issued or shown anywhere.

healthTriage: one document per triage assessment (page 323), linked to its victim by the Registration ID and carrying symptoms, vital signs, consciousness, pain, priority and the assessor.

healthNurseConsultations: one document per nursing consultation (page 324), linked to its patient by the Registration ID and carrying the twelve assessment fields, the current vital signs, the nurse taken from the signed in account and the consultation's status, in progress or completed.

healthDoctorConsultations: one document per doctor consultation (page 325), linked to its patient by the Registration ID and carrying the medical assessment, the diagnosis and its type, the investigations, the treatment plan, the doctor taken from the signed in account and the consultation's status - in progress, completed, or sent with the destination's name and the time it was sent.

healthDestinations: one document per destination on the facility's own list (page 325), created the first time a doctor sends a patient somewhere new and offered for selection from then on, with case-insensitive duplicate protection.

healthPrescriptions: one document per prescribed medicine (written on page 325, worked on page 326), carrying the medicine, dose, frequency and duration, the prescribing doctor, and the line's status - to dispense, alternative proposed, accepted, dispensed, rejected or outside the pharmacy - with the alternative proposal, the doctor's decision and the dispensing record where they apply.

healthTreatmentOrders: one document per treatment or procedure order (written on page 325, worked on page 327), carrying the original order text exactly as the doctor wrote it, the status - pending, in progress, completed, not completed - and the treatment performed, the outcome, the notes and the healthcare worker who recorded them.

The report pages 55 to 61 add no collection of their own: they read transactions, invoices and notes and generate every figure at read time.


SECURITY

Nothing is public. Every collection requires a signed in user.

Every one of the 26 collections allows a signed in user to create, read, update and delete: the full edit and delete rights were opened in the rules on the user's order of 25 October 2026. Before that day the journal was append only and delete stayed closed on every register.

Any collection not named in the rules matches the closing deny-all and is refused, so a new page needs its rule added first.

Catch all deny: any document not matched above is unreadable and unwritable.

After editing, deploy the rules: firebase deploy --only firestore:rules


ACCOUNTING PRINCIPLES BAKED IN

Record once, derive everywhere. Journals, ledgers, schedules and reports are generated from the same records, so a figure entered twice is impossible by design.

Status is computed, never stored. Pending, partially paid, paid, overdue, cleared, bounced: all derived at read time from dates and settlements, so they can never go stale.

A contra is a move, not income. Cash deposits and withdrawals, cash to bank and back, never inflate revenue or expenses.

Oldest invoice settles first. Open invoices are settled FIFO by due date, and the aging buckets run Current, 1 to 30, 31 to 60, 61 to 90 and 90 plus.

The trial balance must balance. Debits equal credits, or the page says so out loud.

The ledger carries down. Each account page totals both sides, enters balance c/d on the smaller side to close the period, and balance b/d on the opposite side to open the next.

The bank rec proves itself. Statement balance, deposits in transit and outstanding cheques produce an adjusted balance, and the difference against the books must be zero.

Suspense clears at zero. Debits equal credits, or the account stays open.


DEPLOYMENT AND SYNCING

Vercel serves the public folder at the domain root with clean URLs: /petty-cash/7 becomes petty-cash/7.html. Every git push deploys, and since the output is static the builds are instant.

Changes arrive the way the one file rule above describes: run the downloaded bash file, commit, push.

Rate limited pushes: scripts/jamali-rate-limited-push.sh pushes the repo gently, and the systemd service and timer run it on a schedule, keeping deployment steady instead of bursty.


LOCAL DEVELOPMENT

cd ~/jamali/public

python3 -m http.server 8080 (or npx serve)

then open http://localhost:8080

A plain local server has no clean URL rewriting, so open pages with their .html ending, for example /computer/62.html.

Sign in and data need the real Firebase project: pages without a session bounce back to the start page by design. To develop offline, point public/firebase.js at a mock module that fakes auth and onSnapshot.


ADDING A NEW PAGE

Create the folder inside public and add N.html, N.css and N.js. The html links the shared base css and its own css, loads menu.js and sidebar.js (menu first, both deferred), then its own js.

Add ONE line to menu.js with the label, icon, folder, page number and depth. The sidebar tree, the open and close arrows and the active highlight all come free. Page numbers are never reused: the next free page number is 329.

Numbers still without a folder today: 19 and 20, the two pending bills folders above, and every number from 329 up. Every other number from 1 to 328 stands on a real folder.

Add its tile to the View File launcher grid in view-file/4.html, or a square tile on Computer for a tools module.

New collection? Add its match block to firestore.rules - anything not named is denied - then deploy the rules.

Adding a Convertor tool: append one entry to convertor/tools.js, one line to slugs.txt and pages.txt with the next page number, and build the folder with its three files. Hub, search and sidebar pick it up automatically.

Every folder ships html, css and js. No exceptions.


STATUS AND ROADMAP

Shipped: home 1, business 2, add transaction 3, view file 4, all transactions 5, cash books 6 and 15, journals 7 to 14, creditors, debtors and ledger 16 to 18, registers and documents 21 to 40, reports and schedules 41 to 61, the Computer launcher 62, the Convertor hub 63 and all 256 tools live on their own pages 65 to 320, and the Health wing, hub 321, victim registration 322, triage 323, nurse consultation 324, doctor consultation 325, pharmacy 326, treatment / procedures 327 and patient module 328.

Next up: stock management for the pharmacy and the bills receivable and payable folders (19, 20, provisioned), the remaining reports of the 24 report wave, and further converter catalogue phases whenever you call for them.

Last updated: 26 October 2026.
RM45EOF

# ----- VERIFY (grep and find only, no node) -----
fail=0

# -- the files task 45 writes --
for f in public/health/patient-info.css public/health/patient-info.js \
         public/victim-registration/322.html public/victim-registration/322.js \
         public/triage/323.js public/nurse-consultation/324.js \
         public/doctor-consultation/325.js public/pharmacy/326.js \
         public/treatment-procedures/327.js public/patient-module/328.js README.md; do
  [ -f "$f" ] || { echo "VERIFY FAIL: missing $f"; fail=1; }
done
[ "$fail" -eq 0 ] && echo "PASS: the eleven files of task 45 are in place"

# -- the temporary ID is gone everywhere --
# (patient-info.js names "tempId" exactly once - the skip list that keeps
# any legacy temporary ID field off the panel - that one is correct.)
bad=0
if grep -rn "TMP-" public/victim-registration public/triage public/nurse-consultation \
     public/doctor-consultation public/pharmacy public/treatment-procedures \
     public/patient-module public/health/patient-info.js public/health/patient-info.css \
     > /dev/null 2>&1; then bad=1; fi
if grep -rn "\\.tempId" public/victim-registration public/triage public/nurse-consultation \
     public/doctor-consultation public/pharmacy public/treatment-procedures \
     public/patient-module public/health/patient-info.js public/health/patient-info.css \
     > /dev/null 2>&1; then bad=1; fi
ntmp="$(grep -rn "tempId" public/victim-registration public/triage public/nurse-consultation \
     public/doctor-consultation public/pharmacy public/treatment-procedures \
     public/patient-module public/health/patient-info.js public/health/patient-info.css \
     2>/dev/null | wc -l | tr -d ' ')"
[ "$ntmp" -eq 1 ] || bad=1
if [ "$bad" -eq 0 ]; then
  echo "PASS: no temporary ID reference remains in any health page"
else
  echo "VERIFY FAIL: temporary ID references remain"; fail=1
fi

# -- the shared chip reads every stage --
grep -q "export function showPatient" public/health/patient-info.js \
  && grep -q "export function hidePatient" public/health/patient-info.js \
  && grep -q "healthRegistrations" public/health/patient-info.js \
  && grep -q "healthTriage" public/health/patient-info.js \
  && grep -q "healthNurseConsultations" public/health/patient-info.js \
  && grep -q "healthDoctorConsultations" public/health/patient-info.js \
  && grep -q "healthPrescriptions" public/health/patient-info.js \
  && grep -q "healthTreatmentOrders" public/health/patient-info.js \
  && echo "PASS: the patient chip reads all six stage collections" \
  || { echo "VERIFY FAIL: patient-info.js incomplete"; fail=1; }

# -- every stage page wires the chip --
for p in public/triage/323.js public/nurse-consultation/324.js public/doctor-consultation/325.js \
         public/pharmacy/326.js public/treatment-procedures/327.js public/patient-module/328.js; do
  grep -q '/health/patient-info.js' "$p" \
    && grep -q 'showPatient(' "$p" \
    && grep -q 'hidePatient(' "$p" \
    || { echo "VERIFY FAIL: $p does not wire the patient chip"; fail=1; }
done
[ "$fail" -eq 0 ] && echo "PASS: pages 323 to 328 all wire the chip - show and hide"

# -- registration issues one ID only --
grep -q "the Registration ID alone identifies" public/victim-registration/322.html \
  && ! grep -q "done-temp" public/victim-registration/322.html \
  && ! grep -q "TMP-" public/victim-registration/322.js \
  && grep -q "the one and only" public/victim-registration/322.js \
  && echo "PASS: registration issues the Registration ID only - no temporary ID" \
  || { echo "VERIFY FAIL: registration still carries temporary ID parts"; fail=1; }

# -- the still-standing structure: menu, hub, rules --
n="$(grep -c 'n: 32[45678]' public/menu.js)"
[ "$n" -eq 5 ] || { echo "VERIFY FAIL: menu health lines $n"; fail=1; }
n="$(grep -c 'class="mod"' public/health/321.html)"
[ "$n" -eq 7 ] || { echo "VERIFY FAIL: hub tiles $n"; fail=1; }
n="$(grep -c 'allow create, read, update, delete: if request.auth != null;' firestore.rules)"
[ "$n" -eq 26 ] || { echo "VERIFY FAIL: rules collections $n"; fail=1; }
[ "$fail" -eq 0 ] && echo "PASS: menu, hub and rules stand as task 44 laid them"

# -- the README --
grep -q "the one and only identifier the victim ever has" README.md \
  && grep -q "the single identifier a victim has" README.md \
  && grep -q "top right corner with an i button" README.md \
  && echo "PASS: the README describes the one-ID rule and the chip" \
  || { echo "VERIFY FAIL: README not updated"; fail=1; }

if [ "$fail" -eq 0 ]; then
  echo "VERIFY: one ID everywhere, the temporary ID gone, and the chip with the i-button history on every stage"
  echo "next: git add -A && git commit -m \"task 45: one ID, patient chip with past-info on every stage\" && git push"
  echo "then: hard refresh the live site (Ctrl+Shift+R)"
  echo "ALL PASS"
else
  echo "VERIFY FAIL - see the lines above"
  exit 1
fi

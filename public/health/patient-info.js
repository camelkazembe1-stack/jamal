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

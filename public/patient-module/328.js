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

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
    ? "Unidentified" + (r.tempId ? " (" + r.tempId + ")" : "")
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
  current = regMap.get(regId);
  if (!current) return;
  openConsult = docConsults.find((d) => String(d.regId) === regId && d.status === "in-progress") || null;
  const t = lastTriage.get(regId) || null;

  /* registration panel — read only */
  const ident = current.isUnidentified
    ? "Unidentified" + (current.tempId ? " — temporary ID " + esc(current.tempId) : "")
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

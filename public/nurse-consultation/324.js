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
  page: "324", build: "47", ran: true, auth: false,
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
window.__p47.listeners = 3;

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

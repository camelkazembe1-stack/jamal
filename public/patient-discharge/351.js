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

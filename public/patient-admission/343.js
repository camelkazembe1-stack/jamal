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

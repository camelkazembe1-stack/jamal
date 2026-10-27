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

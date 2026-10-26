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

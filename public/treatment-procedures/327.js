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
  page: "327", build: "47", ran: true, auth: false,
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
}, (e) => herr("healthTreatmentOrders", e));
window.__p47.listeners = 3;

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

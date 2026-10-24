// victim-registration (page 322) — JAMALI Health
// Sixteen intake fields, three per row. The Registration ID — 4 digits then 4
// letters, for example 4827ABCD — is generated ONLY when the form passes
// validation and the document saves successfully. Unidentified victims
// register without a name and also get a temporary identification ID
// (TMP-XXXX, sharing the Registration ID's digits).
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
      ? "Unidentified" + (r.tempId ? ' <span class="temp-tag">' + esc(r.tempId) + "</span>" : "")
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
  const tempId = unidentified ? "TMP-" + regId.slice(0, 4) : "";
  const docData = {
    regId,
    isUnidentified: unidentified,
    fullName: name,
    tempId,
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
    $("#done-temp").textContent = tempId || "—";
    $("#done-temp-box").hidden = !unidentified;
    $("#done-note").textContent = unidentified
      ? "Registered without a name. The temporary identification ID sits beside the Registration ID — both quote at triage."
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

// patient-admission (page 342) — JAMALI Health — the Admission List
// Every admission drawn live from healthAdmissions — nothing hard-coded.
// Search by number / patient number / name, filter by status, type and
// admission date range; clearing the filters restores the default list.
// Actions: open the details (343), confirm a Pending admission, cancel a
// Pending one. The Ward and Bed columns come from the live assignment
// records kept by Ward Management — never from typed-in copies.
import { requireAuth, db, collection, doc, updateDoc, onSnapshot, arrayUnion } from "/firebase.js";

window.__p52 = { page: "342", build: "52l1", auth: false, listeners: 0, docs: -1, errs: [] };

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
function whenDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

const ST_CLASS = {
  "Pending": "st-pending", "Admitted": "st-admitted", "Transferred": "st-transferred",
  "Discharged": "st-discharged", "Cancelled": "st-cancelled"
};
const TY_CLASS = { "Emergency": "st-emergency", "Planned": "st-planned" };

/* ---------- live data ---------- */
let admissions = [];
let assignments = [];
let beds = [];

onSnapshot(collection(db, "healthAdmissions"), (snap) => {
  admissions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(admissions.length);
  render();
}, (e) => loadErr("healthAdmissions", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  render();
}, (e) => loadErr("healthBedAssignments", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

function activePlacementOf(patientId) {
  const a = assignments.find((x) => x.status === "Active" &&
    String(x.patientId) === String(patientId));
  if (!a) return null;
  const b = beds.find((x) => x.__id === String(a.bedId));
  const st = b && b.status ? " (" + b.status + ")" : "";
  return { ward: a.wardCode || "—", bed: (a.bedNumber || "—") + st };
}

/* ---------- render ---------- */
function render() {
  const q = $("#l-q").value.trim().toLowerCase();
  const st = $("#l-status").value;
  const ty = $("#l-type").value;
  const from = $("#l-from").value;
  const to = $("#l-to").value;

  const rows = admissions.filter((a) => {
    if (q && !(String(a.admissionNumber || "").toLowerCase().includes(q) ||
               String(a.patientId || "").toLowerCase().includes(q) ||
               String(a.patientName || "").toLowerCase().includes(q))) return false;
    if (st && a.status !== st) return false;
    if (ty && a.admissionType !== ty) return false;
    if (from && String(a.admissionDate || "") < from) return false;
    if (to && String(a.admissionDate || "") > to) return false;
    return true;
  });

  $("#l-empty").hidden = admissions.length > 0;
  $("#l-wrap").hidden = rows.length === 0;
  $("#l-body").innerHTML = rows.map((a, i) => {
    const place = activePlacementOf(a.patientId);
    const isPending = a.status === "Pending";
    return "<tr>" +
      "<td class='c-num'>" + (i + 1) + "</td>" +
      "<td class='c-no'><a href='/patient-admission/343?id=" + encodeURIComponent(a.__id) + "'>" +
        esc(a.admissionNumber || a.__id) + "</a></td>" +
      "<td class='c-no'>" + esc(a.patientId || "") + "</td>" +
      "<td class='c-party'>" + esc(a.patientName || "—") + "</td>" +
      "<td class='c-date'>" + esc((a.admissionDate || "—") + " · " + (a.admissionTime || "—")) + "</td>" +
      "<td><span class='st " + (TY_CLASS[a.admissionType] || "st-none") + "'>" + esc(a.admissionType || "—") + "</span></td>" +
      "<td class='c-desc'>" + esc(a.diagnosis || "—") + "</td>" +
      "<td>" + esc(a.doctorName || "—") + "</td>" +
      "<td>" + esc(place ? place.ward : "—") + "</td>" +
      "<td>" + esc(place ? place.bed : "—") + "</td>" +
      "<td><span class='st " + (ST_CLASS[a.status] || "st-none") + "'>" + esc(a.status || "—") + "</span></td>" +
      "<td class='c-act'>" +
        "<a class='ghost-btn' href='/patient-admission/343?id=" + encodeURIComponent(a.__id) + "'>Open</a>" +
        (isPending
          ? " <button type='button' class='ghost-btn' data-confirm='" + esc(a.__id) + "'>Confirm</button>" +
            " <button type='button' class='ghost-btn danger' data-cancel='" + esc(a.__id) + "'>Cancel</button>"
          : "") +
      "</td></tr>";
  }).join("");
  $("#l-count").textContent = rows.length === 0
    ? (admissions.length === 0 ? "" : "No admission matches the search or filters.")
    : rows.length + (rows.length === 1 ? " admission." : " admissions.") +
      " — newest first. Clearing the filters restores the full list.";
}

$("#l-q").addEventListener("input", render);
$("#l-status").addEventListener("change", render);
$("#l-type").addEventListener("change", render);
$("#l-from").addEventListener("change", render);
$("#l-to").addEventListener("change", render);
$("#l-clear").addEventListener("click", () => {
  $("#l-q").value = ""; $("#l-status").value = ""; $("#l-type").value = "";
  $("#l-from").value = ""; $("#l-to").value = "";
  render();
});

/* ---------- status actions ---------- */
$("#l-body").addEventListener("click", async (e) => {
  const cbtn = e.target.closest("button[data-confirm]");
  const xbtn = e.target.closest("button[data-cancel]");
  if (!cbtn && !xbtn) return;
  const id = (cbtn || xbtn).getAttribute(cbtn ? "data-confirm" : "data-cancel");
  const a = admissions.find((x) => x.__id === id);
  if (!a) return;
  const staff = $("#l-staff").value.trim() || rememberedStaff();
  if (!staff) {
    alert("Enter your name next to the filters first — status changes are recorded with who made them.");
    return;
  }
  keepStaff(staff);
  const btn = cbtn || xbtn;
  if (btn.disabled) return;
  if (xbtn && !confirm("Cancel admission " + (a.admissionNumber || "") + "? The record is preserved for accountability.")) return;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthAdmissions", a.__id), {
      status: cbtn ? "Admitted" : "Cancelled",
      updatedAt: nowISO(),
      statusHistory: arrayUnion({
        status: cbtn ? "Admitted" : "Cancelled",
        at: nowISO(), by: staff,
        note: cbtn ? "Confirmed from the Admission List" : "Cancelled before it proceeded"
      })
    });
  } catch (err) {
    alert("Could not save the status change: " + ((err && (err.code || err.message)) || err));
  }
  btn.disabled = false;
});

$("#l-staff").value = rememberedStaff();
render();

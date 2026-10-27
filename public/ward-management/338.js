// ward-management (page 338) — JAMALI Health — Bed & Transfer History
// Three read-only registers in tabs: the bed register (every bed with its
// live status), the bed assignment register (active and released — the
// release date is kept forever) and the transfer register (every completed
// move). One search box filters the open tab. No failure can hide: every
// listener carries an error callback and failures paint the banner.
import { requireAuth, db, collection, onSnapshot } from "/firebase.js";

window.__p52 = { page: "338", build: "52v1", auth: false, listeners: 0, docs: -1, errs: [] };

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
  b.textContent = "Firestore answered \u2014 the registers are empty for now. Beds appear here once registered on 332.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
const ST_CLASS = {
  "Available": "st-avail", "Occupied": "st-occ", "Reserved": "st-resv",
  "Cleaning Required": "st-clean", "Cleaning in Progress": "st-clean",
  "Maintenance Required": "st-maint", "Out of Service": "st-oos"
};

/* ---------- live data ---------- */
let beds = [];
let assignments = [];
let transfers = [];

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  bootAnswered(beds.length + assignments.length + transfers.length);
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")));
  bootAnswered(beds.length + assignments.length + transfers.length);
  render();
}, (e) => loadErr("healthBedAssignments", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedTransfers"), (snap) => {
  transfers = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.transferredAt || "").localeCompare(String(a.transferredAt || "")));
  bootAnswered(beds.length + assignments.length + transfers.length);
  render();
}, (e) => loadErr("healthBedTransfers", e));
window.__p52.listeners++;

/* ---------- tabs + search ---------- */
let tab = "beds";
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    tab = btn.getAttribute("data-tab") || "beds";
    document.querySelectorAll(".tab").forEach((b) =>
      b.classList.toggle("on", b === btn));
    $("#v-pane-beds").hidden = tab !== "beds";
    $("#v-pane-assign").hidden = tab !== "assign";
    $("#v-pane-transfer").hidden = tab !== "transfer";
    render();
  });
});

/* ---------- render ---------- */
function render() {
  const q = $("#v-q").value.trim().toLowerCase();
  const hit = (s) => String(s || "").toLowerCase().includes(q);

  if (tab === "beds") {
    const rows = beds.filter((b) => !q ||
      hit(b.bedNumber) || hit(b.wardCode) || hit(b.wardName) ||
      hit(b.bedType) || hit(b.status) || hit(b.currentPatientName) || hit(b.currentPatientId))
      .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }) ||
        String(a.bedNumber || "").localeCompare(String(b.bedNumber || ""), undefined, { numeric: true }));
    $("#v1-empty").hidden = beds.length > 0;
    $("#v1-wrap").hidden = rows.length === 0;
    $("#v1-body").innerHTML = rows.map((b) =>
      "<tr>" +
        "<td class='c-no'>" + esc(b.bedNumber || "—") + "</td>" +
        "<td>" + esc(b.wardCode || "—") + "</td>" +
        "<td>" + esc(b.bedType || "Standard") + "</td>" +
        "<td><span class='st " + (ST_CLASS[b.status] || "st-oos") + "'>" + esc(b.status || "—") + "</span></td>" +
        "<td>" + (b.status === "Occupied"
          ? esc((b.currentPatientName || "Patient") + (b.currentPatientId ? " · " + b.currentPatientId : ""))
          : "—") + "</td>" +
      "</tr>").join("");
    $("#v-count").textContent = rows.length === 0
      ? (beds.length === 0 ? "" : "No bed matches the search.")
      : rows.length + (rows.length === 1 ? " bed on the register." : " beds on the register.");
    return;
  }

  if (tab === "assign") {
    const rows = assignments.filter((a) => !q ||
      hit(a.patientName) || hit(a.patientId) || hit(a.wardCode) ||
      hit(a.bedNumber) || hit(a.assignedBy) || hit(a.status))
      .sort((a, b) => {
        const ra = a.status === "Active" ? 0 : 1;
        const rb = b.status === "Active" ? 0 : 1;
        return ra - rb || String(b.assignedAt || "").localeCompare(String(a.assignedAt || ""));
      });
    $("#v2-empty").hidden = assignments.length > 0;
    $("#v2-wrap").hidden = rows.length === 0;
    $("#v2-body").innerHTML = rows.map((a) =>
      "<tr>" +
        "<td class='c-party'>" + esc(a.patientName || "—") + "</td>" +
        "<td class='c-no'>" + esc(a.patientId || "") + "</td>" +
        "<td class='nowrap'>" + esc((a.wardCode || "—") + " · bed " + (a.bedNumber || "—")) + "</td>" +
        "<td class='c-date'>" + esc(when(a.assignedAt)) + "</td>" +
        "<td class='c-date'>" + esc(a.status === "Released" ? when(a.releasedAt) : "—") + "</td>" +
        "<td>" + (a.status === "Active"
          ? "<span class='st st-active'>Active</span>"
          : "<span class='st st-released'>Released</span>") + "</td>" +
        "<td>" + esc(a.assignedBy || "—") + "</td>" +
      "</tr>").join("");
    $("#v-count").textContent = rows.length === 0
      ? (assignments.length === 0 ? "" : "No assignment matches the search.")
      : rows.length + (rows.length === 1 ? " assignment on record." : " assignments on record.");
    return;
  }

  const rows = transfers.filter((t) => !q ||
    hit(t.patientName) || hit(t.patientId) || hit(t.fromWardCode) ||
    hit(t.toWardCode) || hit(t.fromBedNumber) || hit(t.toBedNumber) ||
    hit(t.reason) || hit(t.authorizedBy));
  $("#v3-empty").hidden = transfers.length > 0;
  $("#v3-wrap").hidden = rows.length === 0;
  $("#v3-body").innerHTML = rows.map((t) =>
    "<tr>" +
      "<td class='c-party'>" + esc(t.patientName || "—") + " <span class='mini-note'>" + esc(t.patientId || "") + "</span></td>" +
      "<td class='nowrap'>" + esc((t.fromWardCode || "—") + " · bed " + (t.fromBedNumber || "—")) + "</td>" +
      "<td class='nowrap'>" + esc((t.toWardCode || "—") + " · bed " + (t.toBedNumber || "—")) + "</td>" +
      "<td class='c-date'>" + esc(when(t.transferredAt)) + "</td>" +
      "<td class='c-desc'>" + esc(t.reason || "—") + "</td>" +
      "<td><span class='st st-active'>" + esc(t.status || "Completed") + "</span></td>" +
    "</tr>").join("");
  $("#v-count").textContent = rows.length === 0
    ? (transfers.length === 0 ? "" : "No transfer matches the search.")
    : rows.length + (rows.length === 1 ? " transfer on record." : " transfers on record.");
}

$("#v-q").addEventListener("input", render);
render();

// patient-discharge (page 352) — JAMALI Health — Discharge List
// The discharge register. Current processes are listed separately from
// completed, cancelled and deferred ones; searching and filtering run on
// the live stored records only. Opening a row goes to the details page.
import { requireAuth, db, collection, onSnapshot } from "/firebase.js";

window.__p54 = { page: "352", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

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
  b.textContent = "Firestore answered — no discharge records yet. Start one on page 351 for an admitted patient.";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
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
  "Pending Authorization": "st-pendauth", "Approved": "st-approved",
  "In Progress": "st-progress", "Awaiting Medication": "st-waitmed",
  "Awaiting Instructions": "st-waitinstr", "Ready for Departure": "st-ready",
  "Discharged": "st-discharged", "Deferred": "st-deferred", "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

let rows = [];
let tab = "active";

onSnapshot(collection(db, "healthDischarges"), (snap) => {
  rows = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(rows.length);
  render();
}, (e) => loadErr("healthDischarges", e));
window.__p54.listeners++;

/* tabs */
$("#l-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (!b) return;
  tab = b.getAttribute("data-tab");
  document.querySelectorAll("#l-tabs .tab").forEach((t) => t.classList.toggle("on", t === b));
  render();
});

const ACTIVE = new Set(["Pending Authorization", "Approved", "In Progress",
  "Awaiting Medication", "Awaiting Instructions", "Ready for Departure"]);

function render() {
  const q = $("#l-q").value.trim().toLowerCase();
  const st = $("#l-status").value;
  let list = rows.slice();
  if (tab === "active") list = list.filter((x) => ACTIVE.has(x.status));
  if (tab === "completed") list = list.filter((x) => x.status === "Discharged");
  if (tab === "closed") list = list.filter((x) => x.status === "Cancelled" || x.status === "Deferred");
  if (st) list = list.filter((x) => x.status === st);
  if (q) list = list.filter((x) =>
    String(x.dischargeNumber || "").toLowerCase().includes(q) ||
    String(x.patientId || "").toLowerCase().includes(q) ||
    String(x.patientName || "").toLowerCase().includes(q) ||
    String(x.admissionNumber || "").toLowerCase().includes(q));

  $("#l-table").hidden = list.length === 0;
  $("#l-empty").hidden = list.length > 0;
  $("#l-count").textContent = list.length === 0 ? "" :
    list.length + (list.length === 1 ? " discharge record shown." : " discharge records shown.");
  $("#l-body").innerHTML = list.map((x) =>
    "<tr>" +
      "<td class='c-no nowrap'>" + esc(x.dischargeNumber || x.__id) + "</td>" +
      "<td><b>" + esc(x.patientName || "—") + "</b>" +
        "<br><span class='mini-note'>" + esc(x.patientId || "—") + "</span></td>" +
      "<td class='nowrap'>" + esc(x.admissionNumber || "—") + "</td>" +
      "<td class='nowrap'>" + esc((x.wardCode || "—") + (x.bedNumber ? " · bed " + x.bedNumber : "")) + "</td>" +
      "<td class='c-date'>" + esc(when(x.createdAt)) + "</td>" +
      "<td>" + stBadge(x.status) + "</td>" +
      "<td class='nowrap'>" + esc(x.decision || "—") + "</td>" +
      "<td class='c-act'><a class='ghost-btn' href='/patient-discharge/353?id=" + encodeURIComponent(x.__id) + "'>Open</a></td>" +
    "</tr>").join("");
}
$("#l-find").addEventListener("click", render);
$("#l-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); render(); } });
$("#l-q").addEventListener("input", render);
$("#l-status").addEventListener("change", render);

render();

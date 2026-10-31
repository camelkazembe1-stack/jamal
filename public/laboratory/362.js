



import { requireAuth, db, collection, onSnapshot } from "/firebase.js";

window.__p54 = { page: "362", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

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
  b.textContent = "Firestore answered — no lab requests yet. Create one on page 361.";
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
  "Requested": "st-requested", "Specimen Collected": "st-collected",
  "Testing in Progress": "st-testing", "Completed": "st-completed",
  "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

let rows = [];
let tab = "open";

onSnapshot(collection(db, "healthLabRequests"), (snap) => {
  rows = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(rows.length);
  render();
}, (e) => loadErr("healthLabRequests", e));
window.__p54.listeners++;

$("#l-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (!b) return;
  tab = b.getAttribute("data-tab");
  document.querySelectorAll("#l-tabs .tab").forEach((t) => t.classList.toggle("on", t === b));
  render();
});

function render() {
  const q = $("#l-q").value.trim().toLowerCase();
  const st = $("#l-status").value;
  let list = rows.slice();
  if (tab === "open") list = list.filter((x) => x.status !== "Completed" && x.status !== "Cancelled");
  if (tab === "completed") list = list.filter((x) => x.status === "Completed");
  if (tab === "cancelled") list = list.filter((x) => x.status === "Cancelled");
  if (st) list = list.filter((x) => x.status === st);
  if (q) list = list.filter((x) =>
    String(x.requestNumber || "").toLowerCase().includes(q) ||
    String(x.patientId || "").toLowerCase().includes(q) ||
    String(x.patientName || "").toLowerCase().includes(q) ||
    String(x.requestingClinician || "").toLowerCase().includes(q));

  $("#l-table").hidden = list.length === 0;
  $("#l-empty").hidden = list.length > 0;
  $("#l-count").textContent = list.length === 0 ? "" :
    list.length + (list.length === 1 ? " request shown." : " requests shown.");
  $("#l-body").innerHTML = list.map((x) => {
    const tests = Array.isArray(x.tests) ? x.tests : [];
    const done = tests.filter((t) => t.status === "Completed").length;
    const sp = x.specimen || {};
    return "<tr>" +
      "<td class='c-no nowrap'>" + esc(x.requestNumber || x.__id) + "</td>" +
      "<td><b>" + esc(x.patientName || "—") + "</b>" +
        "<br><span class='mini-note'>" + esc(x.patientId || "—") + "</span></td>" +
      "<td class='nowrap'>" + esc((x.requestingDepartment || "—") + " · " + (x.requestingClinician || "—")) + "</td>" +
      "<td>" + done + " / " + tests.length + "</td>" +
      "<td class='nowrap'>" + esc(sp.status || "—") + (sp.type ? " · " + esc(sp.type) : "") + "</td>" +
      "<td class='c-date'>" + esc(when(x.createdAt)) + "</td>" +
      "<td>" + stBadge(x.status) + "</td>" +
      "<td class='c-act'><a class='ghost-btn' href='/laboratory/363?id=" + encodeURIComponent(x.__id) + "'>Open</a></td>" +
    "</tr>";
  }).join("");
}
$("#l-find").addEventListener("click", render);
$("#l-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); render(); } });
$("#l-q").addEventListener("input", render);
$("#l-status").addEventListener("change", render);

render();

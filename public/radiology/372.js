// radiology (page 372) — JAMALI Health — Imaging Requests & Appointments
// The imaging register with the appointment editor. Scheduling, rescheduling,
// marking a missed appointment and cancelling all record the reason and the
// staff member. The register itself is read-only here — performing the
// procedure and writing the report happen on the workbench (page 373).
import { requireAuth, db, collection, doc, updateDoc, onSnapshot, arrayUnion } from "/firebase.js";

window.__p54 = { page: "372", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

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
  b.textContent = "Firestore answered — no imaging requests yet. Create one on page 371.";
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
function when(iso) {
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
  "Requested": "st-requested", "Scheduled": "st-scheduled",
  "In Progress": "st-testing", "Completed": "st-completed",
  "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

let rows = [];
let tab = "open";
let apFor = null; // the request whose appointment is being edited

onSnapshot(collection(db, "healthImagingRequests"), (snap) => {
  rows = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(rows.length);
  if (apFor) apFor = rows.find((x) => x.__id === apFor.__id) || apFor;
  render(); renderAp();
}, (e) => loadErr("healthImagingRequests", e));
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
  if (tab === "scheduled") list = list.filter((x) => x.status === "Scheduled" ||
    (x.appointment || {}).status === "Scheduled");
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
    const procs = Array.isArray(x.procedures) ? x.procedures : [];
    const ap = x.appointment || {};
    const apLine = ap.status
      ? esc(ap.status + (ap.date ? " · " + ap.date + " " + (ap.time || "") : "") + (ap.room ? " · " + ap.room : ""))
      : "<span class='mini-note'>not scheduled</span>";
    const openAp = x.status !== "Completed" && x.status !== "Cancelled";
    return "<tr" + (apFor && apFor.__id === x.__id ? " class='is-hl'" : "") + ">" +
      "<td class='c-no nowrap'>" + esc(x.requestNumber || x.__id) + "</td>" +
      "<td><b>" + esc(x.patientName || "—") + "</b>" +
        "<br><span class='mini-note'>" + esc(x.patientId || "—") + "</span></td>" +
      "<td class='nowrap'>" + esc((x.requestingDepartment || "—") + " · " + (x.requestingClinician || "—")) + "</td>" +
      "<td>" + esc(procs.map((p) => p.name).join(", ") || "—") + "</td>" +
      "<td><span class='st " + (x.priority === "Urgent" ? "st-urgent" : "st-routine") + "'>" + esc(x.priority || "—") + "</span></td>" +
      "<td class='nowrap'>" + apLine + "</td>" +
      "<td>" + stBadge(x.status) + "</td>" +
      "<td class='c-act'>" +
        (openAp ? "<button type='button' class='ghost-btn' data-ap='" + esc(x.__id) + "'>Appointment</button> " : "") +
        "<a class='ghost-btn' href='/radiology/373?id=" + encodeURIComponent(x.__id) + "'>Open</a></td>" +
    "</tr>";
  }).join("");
}
$("#l-find").addEventListener("click", render);
$("#l-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); render(); } });
$("#l-q").addEventListener("input", render);
$("#l-status").addEventListener("change", render);

/* ---------- the appointment editor ---------- */
$("#l-body").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-ap]");
  if (!btn) return;
  apFor = rows.find((x) => x.__id === btn.getAttribute("data-ap")) || null;
  renderAp();
  if (apFor) $("#a-card").scrollIntoView({ behavior: "smooth", block: "start" });
});
function renderAp() {
  if (!apFor) { $("#a-card").hidden = true; return; }
  const ap = apFor.appointment || {};
  $("#a-card").hidden = false;
  $("#a-title").textContent = "Appointment — " + (apFor.requestNumber || "") + " · " + (apFor.patientName || "");
  $("#a-date").value = ap.date || "";
  $("#a-time").value = ap.time || "";
  $("#a-room").value = ap.room || "";
  $("#a-reason").value = "";
  $("#a-now").textContent = ap.status
    ? "Current appointment: " + ap.status + (ap.date ? " · " + ap.date + " " + (ap.time || "") : "") +
      (ap.room ? " · " + ap.room : "") + (ap.reason ? " · reason: " + ap.reason : "")
    : "No appointment has been scheduled yet.";
  $("#a-ferr").hidden = true;
}
function apErr(msg) { const e = $("#a-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function apStaff() {
  let s = "";
  try { s = localStorage.getItem("jamaliStaff") || ""; } catch (e) {}
  if (!s) {
    s = (window.prompt("Your name — it is remembered on this device:", "") || "").trim();
    if (!s) return "";
    keepStaff(s);
  }
  return s;
}
$("#a-save").addEventListener("click", async () => {
  if (!apFor) return;
  apErr("");
  const date = $("#a-date").value;
  const time = $("#a-time").value;
  const room = $("#a-room").value.trim();
  const reason = $("#a-reason").value.trim();
  if (!date || isNaN(new Date(date + "T00:00:00").getTime())) return apErr("Choose a valid appointment date.");
  if (!time) return apErr("Choose a valid appointment time.");
  if (!reason && (apFor.appointment || {}).status === "Scheduled")
    return apErr("A reschedule needs the reason — record why the appointment is moving.");
  const staff = apStaff(); if (!staff) return;
  const wasScheduled = (apFor.appointment || {}).status === "Scheduled";
  const btn = $("#a-save"); if (btn.disabled) return; btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthImagingRequests", apFor.__id), {
      appointment: { date, time, room, status: "Scheduled", reason },
      status: apFor.status === "Requested" ? "Scheduled" : apFor.status,
      updatedAt: nowISO(),
      statusHistory: arrayUnion({ status: wasScheduled ? "Scheduled" : apFor.status === "Requested" ? "Scheduled" : apFor.status,
        at: nowISO(), by: staff,
        note: (wasScheduled ? "Rescheduled" : "Scheduled") + ": " + date + " " + time + (room ? " · " + room : "") + (reason ? " · " + reason : "") })
    });
    apFor = null; renderAp();
  } catch (e) { apErr("Could not save the appointment: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#a-missed").addEventListener("click", async () => {
  if (!apFor) return;
  apErr("");
  const reason = $("#a-reason").value.trim();
  const staff = apStaff(); if (!staff) return;
  const btn = $("#a-missed"); if (btn.disabled) return; btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthImagingRequests", apFor.__id), {
      appointment: Object.assign({}, apFor.appointment, { status: "Missed", reason: reason || "not recorded" }),
      updatedAt: nowISO(),
      statusHistory: arrayUnion({ status: "Scheduled", at: nowISO(), by: staff,
        note: "Appointment missed" + (reason ? " — " + reason : " — reason not recorded") })
    });
    apFor = null; renderAp();
  } catch (e) { apErr("Could not record the missed appointment: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#a-cancel").addEventListener("click", async () => {
  if (!apFor) return;
  apErr("");
  const reason = $("#a-reason").value.trim();
  if (!reason) return apErr("A cancellation needs the reason — record why the appointment is cancelled.");
  if (!confirm("Cancel this appointment? The request itself stays open.")) return;
  const staff = apStaff(); if (!staff) return;
  const btn = $("#a-cancel"); if (btn.disabled) return; btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthImagingRequests", apFor.__id), {
      appointment: Object.assign({}, apFor.appointment, { status: "Cancelled", reason }),
      status: apFor.status === "Scheduled" ? "Requested" : apFor.status,
      updatedAt: nowISO(),
      statusHistory: arrayUnion({ status: apFor.status === "Scheduled" ? "Requested" : apFor.status,
        at: nowISO(), by: staff, note: "Appointment cancelled — " + reason })
    });
    apFor = null; renderAp();
  } catch (e) { apErr("Could not cancel the appointment: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#a-close").addEventListener("click", () => { apFor = null; renderAp(); });

/* deep link: /radiology/372?patient=REGID — highlight via search */
function maybeAutoSearch() {
  const pid = new URLSearchParams(location.search).get("patient") || "";
  if (pid) { $("#l-q").value = pid; render(); }
}
maybeAutoSearch();
render();

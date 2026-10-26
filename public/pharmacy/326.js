// pharmacy (page 326) — JAMALI Health
// The pharmacy desk. Prescriptions written by the doctor arrive here one
// medicine per line. The pharmacist checks availability (a judgement, not a
// stock system — stock management is a later module), dispenses, or proposes
// a safe alternative when the prescribed medicine is unavailable. The
// proposal waits for the doctor on page 325: accepted alternatives can be
// dispensed; a rejected line is re-prescribed or sent outside the pharmacy.
// Every action records who did it and when, against the Registration ID.
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
  page: "326", build: "47", ran: true, auth: false,
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

/* ---------- shared helpers (same language as pages 322 to 325) ---------- */
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

/* the pharmacist on record comes from the signed in account, never typed */
const PHARM = String((auth && auth.currentUser && (auth.currentUser.email || auth.currentUser.uid)) || "unknown");

/* ---------- live data ---------- */
let regs = [];
const regMap = new Map();
let triages = [];
const lastTriage = new Map();
let rxLines = []; // every prescription line, newest first

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
  if (currentId) renderPatient();
}, (e) => herr("healthTriage", e));

onSnapshot(query(collection(db, "healthPrescriptions")), (snap) => {
  rxLines = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderList();
  refreshSearchLine();
  if (currentId) renderPatient();
}, (e) => herr("healthPrescriptions", e));
window.__p47.listeners = 3;

/* ---------- status chips ---------- */
function chip(status) {
  const map = {
    "to dispense": ["st-todisp", "To dispense"],
    "alternative proposed": ["st-proposed", "Pending doctor approval"],
    "accepted": ["st-accepted", "Accepted — dispense"],
    "dispensed": ["st-disp", "Dispensed"],
    "rejected": ["st-rejected", "Rejected by doctor"],
    "outside pharmacy": ["st-outside", "Outside pharmacy"]
  };
  const m = map[String(status || "")] || ["st-outside", status || "—"];
  return '<span class="st ' + m[0] + '">' + esc(m[1]) + "</span>";
}

/* ---------- STEP 1: search + worklist ---------- */
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

const OPEN_STATUSES = ["to dispense", "alternative proposed", "accepted"];
let edit = { id: null, mode: null }; // which line carries an inline editor

function medCell(l) {
  return "<b>" + esc(l.medicine || "—") + "</b>" +
    (l.dose ? '<span class="cell-sub">' + esc(l.dose) + (l.frequency ? " · " + l.frequency : "") +
      (l.duration ? " · " + l.duration : "") + "</span>" : "") +
    (l.notes ? '<span class="cell-sub">' + esc(l.notes) + "</span>" : "");
}
function decisionCell(l) {
  const parts = [];
  if (l.status === "alternative proposed" && l.alt) {
    parts.push("Proposed: <b>" + esc(l.alt.medicine) + "</b>" +
      (l.alt.note ? " — " + esc(l.alt.note) : ""));
  }
  if (l.decision && l.decision.note) parts.push(esc(l.decision.note));
  if (l.dispensed && l.dispensed.what) {
    parts.push("Dispensed <b>" + esc(l.dispensed.what) + "</b> · " + esc(when(l.dispensed.at)) +
      (l.dispensed.by ? " · by " + esc(l.dispensed.by) : ""));
  }
  return parts.length ? parts.join("<br>") : "—";
}

function lineActions(l, withOpen) {
  if (edit.id === l.__id) return ""; // the editor row carries the buttons
  const btns = [];
  if (l.status === "to dispense" || l.status === "accepted") {
    btns.push('<button type="button" class="ghost-btn a-disp" data-id="' + esc(l.__id) + '">Dispense</button>');
  }
  if (l.status === "to dispense") {
    btns.push('<button type="button" class="ghost-btn a-alt" data-id="' + esc(l.__id) + '">Alternative&hellip;</button>');
  }
  if (withOpen) {
    btns.push('<button type="button" class="ghost-btn a-open" data-regid="' + esc(l.regId) + '">Open patient</button>');
  }
  return btns.length ? '<div class="act-col">' + btns.join("") + "</div>" : "";
}

function editorRow(l, cols) {
  if (edit.id !== l.__id) return "";
  let inner = "";
  if (edit.mode === "dispense") {
    const def = l.status === "accepted" && l.alt && l.alt.medicine ? l.alt.medicine : l.medicine;
    inner = '<span class="lbl">Dispensing</span>' +
      '<input id="ed-what" type="text" value="' + esc(def || "") + '" placeholder="What is actually dispensed">' +
      '<button type="button" class="ghost-btn ed-ok" data-id="' + esc(l.__id) + '">Confirm dispense</button>' +
      '<button type="button" class="ghost-btn ed-no">Cancel</button>';
  } else {
    inner = '<span class="lbl">Proposed alternative</span>' +
      '<input id="ed-alt" type="text" placeholder="Alternative medicine, e.g. Medicine B">' +
      '<input id="ed-note" type="text" placeholder="Note for the doctor, if any">' +
      '<button type="button" class="ghost-btn ed-ok" data-id="' + esc(l.__id) + '">Send proposal</button>' +
      '<button type="button" class="ghost-btn ed-no">Cancel</button>';
  }
  return '<tr class="ed-tr"><td colspan="' + cols + '"><div class="edit-row">' + inner + "</div></td></tr>";
}

function renderList() {
  const open = rxLines.filter((l) => OPEN_STATUSES.includes(String(l.status || "")));
  const has = open.length > 0;
  $("#l-empty").hidden = has;
  $("#l-wrap").hidden = !has;
  $("#l-body").innerHTML = open.map((l) => {
    const victim = regMap.get(String(l.regId));
    return "<tr><td class='c-no'>" + esc(l.regId) + "</td>" +
      "<td class='c-party'>" + (victim ? esc(who(victim)) : "—") + "</td>" +
      "<td class='c-desc'>" + medCell(l) + "</td>" +
      "<td>" + chip(l.status) +
        (l.status === "alternative proposed" ? '<span class="cell-sub">waiting for the doctor (page 325)</span>' : "") +
      "</td>" +
      "<td>" + lineActions(l, true) + "</td></tr>" + editorRow(l, 5);
  }).join("");
  $("#l-count").textContent = has
    ? open.length + (open.length === 1 ? " prescription line to handle."
                                       : " prescription lines to handle.")
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
  openPatient(id);
});
$("#l-body").addEventListener("click", (e) => {
  const open = e.target.closest(".a-open");
  if (open) { qerr(""); openPatient(open.getAttribute("data-regid")); return; }
  lineActionClick(e);
});

/* ---------- shared line actions (worklist + patient view) ---------- */
async function lineActionClick(e) {
  const disp = e.target.closest(".a-disp");
  const alt = e.target.closest(".a-alt");
  const ok = e.target.closest(".ed-ok");
  const no = e.target.closest(".ed-no");
  if (disp) {
    edit = { id: disp.getAttribute("data-id"), mode: "dispense" };
    rerender();
    const inp = $("#ed-what");
    if (inp) { inp.focus(); inp.select(); }
  } else if (alt) {
    edit = { id: alt.getAttribute("data-id"), mode: "alt" };
    rerender();
    const inp = $("#ed-alt");
    if (inp) inp.focus();
  } else if (no) {
    edit = { id: null, mode: null };
    rerender();
  } else if (ok) {
    const id = ok.getAttribute("data-id");
    const line = rxLines.find((l) => l.__id === id);
    if (!line) return;
    try {
      if (edit.mode === "dispense") {
        const what = ($("#ed-what") ? $("#ed-what").value : "").trim();
        if (!what) return; // keep the editor open until a name is entered
        await updateDoc(doc(db, "healthPrescriptions", id), {
          status: "dispensed",
          dispensed: { what, by: PHARM, at: new Date().toISOString() }
        });
      } else {
        const medicine = ($("#ed-alt") ? $("#ed-alt").value : "").trim();
        const note = ($("#ed-note") ? $("#ed-note").value : "").trim();
        if (!medicine) return; // keep the editor open until a name is entered
        await updateDoc(doc(db, "healthPrescriptions", id), {
          status: "alternative proposed",
          alt: { medicine, note, proposedBy: PHARM, proposedAt: new Date().toISOString() }
        });
      }
      edit = { id: null, mode: null };
    } catch (err) {
      console.error(err);
    }
  }
}
function rerender() {
  renderList();
  if (currentId) renderPatient();
}

/* ---------- STEP 2: the patient's prescriptions ---------- */
let currentId = null;

function openPatient(regId) {
  showPatient(regId);
  currentId = regId;
  edit = { id: null, mode: null };
  renderPatient();
  $("#s-search").hidden = true;
  $("#s-patient").hidden = false;
  window.scrollTo(0, 0);
}

$("#p-back").addEventListener("click", (e) => {
  e.preventDefault();
  hidePatient();
  currentId = null;
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
  $("#p-wholine").textContent = "Dispensing for " + who(r) + " · Registration ID " + r.regId;
  $("#p-reg").innerHTML =
    item("Patient", ident) +
    item("Registration ID", esc(r.regId)) +
    item("Sex", esc(r.sex)) +
    item("Age", r.age !== "" && r.age != null ? esc(String(r.age) + "y") : "") +
    item("Allergies", t ? esc(t.allergies) : "") +
    item("Existing conditions", t ? esc(t.conditions) : "");

  const mine = rxLines.filter((l) => String(l.regId) === String(currentId));
  const has = mine.length > 0;
  $("#p-empty").hidden = has;
  $("#p-wrap").hidden = !has;
  $("#p-body").innerHTML = mine.map((l) =>
    "<tr><td class='c-desc'>" + medCell(l) + "</td>" +
    "<td class='c-date'>" + esc(when(l.savedAt)) +
      "<span class='cell-sub'>" + esc(l.prescribedBy || "—") + "</span></td>" +
    "<td>" + chip(l.status) + "</td>" +
    "<td class='c-desc'>" + decisionCell(l) + "</td>" +
    "<td>" + lineActions(l, false) + "</td></tr>" + editorRow(l, 5)
  ).join("");
}

$("#p-body").addEventListener("click", lineActionClick);

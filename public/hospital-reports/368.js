


import { requireAuth, db, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from "/sidebar.js";

window.__p368 = { page: "368", build: "368", auth: false, listeners: 0, docs: -1, errs: [] };

const CFG = {
  "collection": "healthReportNotes",
  "refp": "RPT",
  "statuses": [
    "Open",
    "Finalised"
  ],
  "done": [
    "Finalised"
  ],
  "columns": [
    "ref",
    "period",
    "topic",
    "note"
  ],
  "fields": [
    {
      "id": "period",
      "label": "Report period",
      "type": "select",
      "ph": "",
      "req": false,
      "opts": [
        "Today",
        "This week",
        "This month",
        "This year"
      ]
    },
    {
      "id": "topic",
      "label": "Report topic",
      "type": "text",
      "ph": "e.g. November performance summary",
      "req": false,
      "opts": []
    },
    {
      "id": "note",
      "label": "Findings / notes",
      "type": "text",
      "ph": "management remarks",
      "req": false,
      "opts": []
    }
  ],
  "dash": [
    [
      "Registered patients",
      "coll",
      "healthRegistrations"
    ],
    [
      "Doctor consultations",
      "coll",
      "healthDoctorConsultations"
    ],
    [
      "Lab requests",
      "coll",
      "healthLabRequests"
    ],
    [
      "Imaging requests",
      "coll",
      "healthImagingRequests"
    ],
    [
      "Admissions",
      "coll",
      "healthAdmissions"
    ],
    [
      "Discharges",
      "coll",
      "healthDischarges"
    ],
    [
      "Prescriptions",
      "coll",
      "healthPrescriptions"
    ],
    [
      "Treatment orders",
      "coll",
      "healthTreatmentOrders"
    ]
  ],
  "searchKeys": [
    "period",
    "topic",
    "note",
    "ref"
  ],
  "qa": null,
  "caseNoun": null,
  "caseId": "period",
  "defaultDept": "Hospital Reports & Analytics"
};

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p368) window.__p368.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code);
}
function bootAnswered() {
  if (window.__p368) window.__p368.docs = 0;
  const b = document.getElementById("p-boot");
  if (b) b.hidden = true;
}

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

try {
  await requireAuth();
  if (window.__p368) window.__p368.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

// ================= module records =================
let recs = [];
const DONE = new Set(CFG.done);
const pending = () => recs.filter((r) => !DONE.has(r.status));

function pad(n) { return String(n).padStart(2, "0"); }
function todayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function isToday(stamp) { return String(stamp || "").slice(0, 10) === todayLocal(); }

function countTiles() {
  const out = [];
  for (const t of CFG.dash) {
    let v = 0;
    if (t[1] === "all") v = recs.length;
    else if (t[1] === "pending") v = pending().length;
    else if (t[1] === "status") v = recs.filter((r) => r.status === t[2]).length;
    else if (t[1] === "status-in") v = recs.filter((r) => t[2].includes(r.status)).length;
    else if (t[1] === "today") v = recs.filter((r) => isToday(r.createdAt)).length;
    else if (t[1] === "today-status") v = recs.filter((r) => t[2].includes(r.status) && isToday(r.updatedAt || r.createdAt)).length;
    else if (t[1] === "eq") v = recs.filter((r) => String(r[t[2] || "status"]) === t[3]).length;
    else if (t[1] === "today-eq") v = recs.filter((r) => String(r[t[2]]) === t[3] && isToday(r.createdAt)).length;
    else if (t[1] === "coll") v = Number(otherCounts[t[2]] || 0);
    out.push([t[0], v]);
  }
  return out;
}
let otherCounts = {};
function renderDash() {
  const dash = document.getElementById("dash");
  if (!dash) return;
  dash.innerHTML = countTiles().map(([label, v]) => {
    const cls = v === 0 ? "dash" : "dash info";
    return "<div class='" + cls + "'><b>" + esc(String(v)) + "</b><span>" + esc(label) + "</span></div>";
  }).join("");
  qaSet("qa-waiting", String(pending().length));
}

function badge(s) {
  const v = String(s || "");
  const cls = DONE.has(v) ? "st-good"
    : (v === "Cancelled" || v === "Rejected" || v === "Deceased" || v === "Expired" || v === "Discarded" || v === "Disposed" || v === "Unclaimed") ? "st-muted"
    : (v === "Critical" || v === "Resuscitation" || v === "Complications" || v === "Outbreak declared" || v === "High - urgent intervention" || v === "High risk" || v === "Overdue" || v === "Faulty" || v === "Under repair") ? "st-bad"
    : (v === "Waiting" || v === "Pending" || v === "Requested" || v === "Draft" || v === "Collected" || v === "Received" || v === "Suspected" || v === "Awaiting bed" || v === "Due" || v === "Needs review") ? "st-open"
    : (v === "In theatre" || v === "In ICU" || v === "Being treated" || v === "Under consultation" || v === "Treatment in progress" || v === "Washing" || v === "In progress" || v === "On duty" || v === "In programme" || v === "In counselling" || v === "Isolated" || v === "Dispatched" || v === "On route") ? "st-busy"
    : "st-info";
  return "<span class='st " + cls + "'>" + esc(v || "—") + "</span>";
}

function visibleRecs() {
  const q = String(($("#rec-search") || {}).value || "").trim().toLowerCase();
  if (!q) return recs;
  return recs.filter((r) => CFG.searchKeys.some((k) => String(r[k] || "").toLowerCase().includes(q)));
}

function renderTable() {
  const body = document.getElementById("rec-body");
  if (!body) return;
  const rows = visibleRecs();
  const empty = document.getElementById("rec-empty");
  if (empty) empty.hidden = rows.length > 0;
  body.innerHTML = rows.map((r) => {
    const tds = ["<td class='mono'><span class='ref'>" + esc(r.ref || "") + "</span></td>"];
    for (const c of CFG.columns) tds.push("<td>" + esc(String(r[c] || "") || "—") + "</td>");
    tds.push("<td>" + esc(String(r.createdAt || "").slice(0, 10)) + "</td>");
    tds.push("<td><select class='st-sel' data-id='" + esc(r.__id) + "'>" +
      CFG.statuses.map((s) => "<option" + (s === r.status ? " selected" : "") + ">" + esc(s) + "</option>").join("") +
      "</select></td>");
    tds.push("<td><button type='button' class='row-del' data-id='" + esc(r.__id) + "'>Delete</button></td>");
    return "<tr>" + tds.join("") + "</tr>";
  }).join("");
}

function wireTable() {
  const body = document.getElementById("rec-body");
  if (!body) return;
  body.addEventListener("change", (ev) => {
    const sel = ev.target.closest("select.st-sel");
    if (!sel) return;
    const id = sel.getAttribute("data-id");
    const rec = recs.find((r) => r.__id === id);
    if (!rec) return;
    updateDoc(doc(db, CFG.collection, id), { status: sel.value, updatedAt: new Date().toISOString() })
      .catch(() => { rec.status = sel.value; renderDash(); renderTable(); });
    rec.status = sel.value;
    rec.updatedAt = new Date().toISOString();
    renderDash();
  });
  body.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button.row-del");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const rec = recs.find((r) => r.__id === id);
    if (!rec) return;
    if (!window.confirm("Delete record " + (rec.ref || "") + "? This cannot be undone.")) return;
    deleteDoc(doc(db, CFG.collection, id))
      .catch(() => { recs = recs.filter((x) => x.__id !== id); renderDash(); renderTable(); });
  });
}

const form = document.getElementById("rec-form");
if (form) form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = document.getElementById("rec-err");
  const ok = document.getElementById("rec-ok");
  if (err) err.hidden = true;
  if (ok) ok.hidden = true;
  const rec = {};
  for (const f of CFG.fields) {
    const el = document.getElementById("f-" + f.id);
    const v = el ? String(el.value || "").trim() : "";
    if (f.req && !v) {
      if (err) { err.hidden = false; err.textContent = "Fill in: " + f.label + "."; }
      return;
    }
    rec[f.id] = v;
  }
  const saveBtn = document.getElementById("rec-save");
  saveBtn.disabled = true;
  try {
    rec.ref = CFG.refp + "-" + todayLocal().replace(/-/g, "").slice(2) + "-" +
              String((recs.length + 1) % 10000).padStart(4, "0");
    rec.status = CFG.statuses[0];
    rec.createdAt = new Date().toISOString();
    await addDoc(collection(db, CFG.collection), rec);
    if (ok) { ok.hidden = false; ok.textContent = "Saved as " + rec.ref + " (" + rec.status + ")."; }
    form.reset();
  } catch (e) {
    if (err) { err.hidden = false; err.textContent = "Save failed: " + ((e && e.message) || e); }
  } finally { saveBtn.disabled = false; }
});
const searchBox = document.getElementById("rec-search");
if (searchBox) searchBox.addEventListener("input", renderTable);

// ================= live records =================
try {
  onSnapshot(collection(db, CFG.collection), (snap) => {
    recs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    if (window.__p368) window.__p368.docs = recs.length;
    renderDash();
    renderTable();
    qaRenderPanel();
  }, (e) => loadErr(CFG.collection, e));
  window.__p368.listeners++;
} catch (e) { }
try {
  onSnapshot(collection(db, "healthRegistrations"), (snap) => {
    otherCounts.healthRegistrations = snap.size;
  }, () => { });
} catch (e) { }


const COUNTED = ["healthRegistrations", "healthDoctorConsultations", "healthLabRequests",
  "healthImagingRequests", "healthAdmissions", "healthDischarges", "healthPrescriptions",
  "healthTreatmentOrders", "healthPayments", "healthBilling"];
for (const name of COUNTED) {
  if (name === CFG.collection) continue;
  try {
    onSnapshot(collection(db, name), (snap) => {
      otherCounts[name] = snap.size;
      renderDash();
    }, () => { });
    window.__p368.listeners++;
  } catch (e) { }
}
renderDash();
renderTable();
wireTable();

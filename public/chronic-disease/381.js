


import { requireAuth, db, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from "/sidebar.js";

window.__p381 = { page: "381", build: "381", auth: false, listeners: 0, docs: -1, errs: [] };

const CFG = {
  "collection": "healthChronic",
  "refp": "CHR",
  "statuses": [
    "Registered",
    "Controlled",
    "Needs review",
    "Complications",
    "Transferred out"
  ],
  "done": [
    "Transferred out"
  ],
  "columns": [
    "ref",
    "patientId",
    "disease",
    "bp",
    "glucose",
    "medication",
    "nextReview"
  ],
  "fields": [
    {
      "id": "patientId",
      "label": "Patient ID",
      "type": "text",
      "ph": "e.g. REG-240001",
      "req": true,
      "opts": []
    },
    {
      "id": "disease",
      "label": "Chronic condition",
      "type": "select",
      "ph": "",
      "req": true,
      "opts": [
        "Diabetes",
        "Hypertension",
        "Asthma",
        "Chronic kidney disease",
        "Heart disease",
        "Epilepsy",
        "Other"
      ]
    },
    {
      "id": "bp",
      "label": "Blood pressure",
      "type": "text",
      "ph": "140/90",
      "req": false,
      "opts": []
    },
    {
      "id": "glucose",
      "label": "Blood glucose",
      "type": "text",
      "ph": "mmol/L",
      "req": false,
      "opts": []
    },
    {
      "id": "weight",
      "label": "Weight (kg)",
      "type": "number",
      "ph": "78",
      "req": false,
      "opts": []
    },
    {
      "id": "medication",
      "label": "Current medication",
      "type": "text",
      "ph": "e.g. metformin 500mg",
      "req": false,
      "opts": []
    },
    {
      "id": "nextReview",
      "label": "Next review",
      "type": "date",
      "ph": "",
      "req": false,
      "opts": []
    }
  ],
  "dash": [
    [
      "Registered patients",
      "all"
    ],
    [
      "Controlled",
      "status",
      "Controlled"
    ],
    [
      "Needs review",
      "status",
      "Needs review"
    ],
    [
      "Complications",
      "status",
      "Complications"
    ]
  ],
  "searchKeys": [
    "patientId",
    "disease",
    "bp",
    "glucose",
    "ref"
  ],
  "qa": "chronic",
  "caseNoun": "Patient number",
  "caseId": "patientId",
  "defaultDept": "Chronic Disease"
};

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p381) window.__p381.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code);
}
function bootAnswered() {
  if (window.__p381) window.__p381.docs = 0;
  const b = document.getElementById("p-boot");
  if (b) b.hidden = true;
}

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

try {
  await requireAuth();
  if (window.__p381) window.__p381.auth = true;
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

// ================= speaker queue & settings (the speaker reads exactly what is saved) =================
const QA_MODULE = CFG.qa;
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 };
try { qaCfg = Object.assign(qaCfg, JSON.parse(localStorage.getItem("jamali_qacfg_" + QA_MODULE) || "{}")); } catch (e) {}

function qaText() {
  const dept = String(qaCfg.department || "").trim();
  const staff = String(qaCfg.staffName || "").trim();
  const office = String(qaCfg.officeNumber || "").trim();
  const room = String(qaCfg.roomNumber || "").trim();
  const place = room || office;
  return { dept, staff, office, room, place,
           dest: (staff || dept || CFG.defaultDept) + (place ? ", " + place : "") };
}
function qaSentence(id) {
  return CFG.caseNoun + " " + String(id) + ", please proceed to " + qaText().dest + ".";
}
function qaRate() {
  const r = Number(qaCfg.voiceRate);
  return (r >= 0.5 && r <= 1.1) ? r : 0.75;
}
function qaSpeech(id) {
  const d = String(id).split("").join(", ");
  const dest = qaText().dest;
  return CFG.caseNoun + " " + d + ". Please proceed to " + dest +
         ". I repeat: " + CFG.caseNoun + " " + d + ". Please proceed to " + dest + ".";
}
function qaSpeakNow(text) {
  try {
    if (!("speechSynthesis" in window)) return false;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = qaRate();
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang || ""));
    if (vs.length) u.voice = vs.find((v) => /GB/i.test(v.lang || "")) || vs[0];
    synth.speak(u);
    return true;
  } catch (e) { return false; }
}
function qaSettingsLine() {
  const t = qaText();
  const bits = ["Speaker settings saved."];
  if (t.dept) bits.push("Department: " + t.dept + ".");
  if (t.staff) bits.push("Staff: " + t.staff + ".");
  if (t.office) bits.push("Office: " + t.office + ".");
  if (t.room) bits.push("Room: " + t.room + ".");
  if (!t.dept && !t.staff && !t.office && !t.room) bits.push("Voice speed: " + qaRate() + ".");
  bits.push("Sample announcement: " + qaSentence("1, 2, 3"));
  return bits.join(" ");
}
function qaCfgLine() {
  const t = qaText();
  const bits = [];
  if (t.staff) bits.push("Staff: " + t.staff);
  if (t.room) bits.push("Room: " + t.room);
  if (t.office) bits.push("Office: " + t.office);
  if (!t.staff && t.dept) bits.push("Department: " + t.dept);
  return bits.join(" · ");
}
function qaApplyCfg(data) {
  qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 }, data || {});
  try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
  qaRenderPanel();
}
function qaRenderPanel() {
  const list = pending();
  qaSet("qa-waiting", String(list.length));
  const nxt = list[0] || null;
  qaSet("qa-next-id", nxt ? String(nxt[CFG.caseId] || nxt.ref || "") : "—");
  qaSet("qa-next-sub", nxt ? (nxt.status || "") + " · " + String(nxt.createdAt || "").slice(0, 10) : "Nothing waiting");
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-id", String(nxt[CFG.caseId] || nxt.ref || "")); else btn.removeAttribute("data-id");
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt[CFG.caseId] || nxt.ref || "") : "");
}
const qaAnnounceBtn = document.getElementById("qa-announce");
if (qaAnnounceBtn) qaAnnounceBtn.addEventListener("click", () => {
  const id = qaAnnounceBtn.getAttribute("data-id");
  if (!id) return;
  const sentence = qaSpeech(id);
  if (qaSpeakNow(sentence)) qaSet("qa-note", "Announcing: " + qaSentence(id));
  else qaSet("qa-note", "This browser cannot speak — read aloud: " + qaSentence(id));
});
// ONE SETTINGS PLACE (25 Nov 2026): every setting lives in the one
// settings panel the footer gear opens - the page keeps NO speaker
// settings of its own any more. This button opens the panel with this
// module preselected; the save writes the same healthQueueConfig
// record the page reads live.
const qaSettingsBtn = document.getElementById("qa-settings-btn");
if (qaSettingsBtn) qaSettingsBtn.addEventListener("click", () => {
  window.dispatchEvent(new CustomEvent("jamali:settings-open",
    { detail: { section: "speaker", qa: QA_MODULE } }));
});

// config load: a real document read (the doc subscription shape is not
// supported by the local engine), plus a live collection listener
(async () => {
  try {
    const s = await getDoc(doc(db, "healthQueueConfig", QA_MODULE));
    qaApplyCfg(s.exists() ? s.data() : {});
    bootAnswered();
  } catch (e) {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p381) window.__p381.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
    bootAnswered();
  }
})();
try {
  onSnapshot(collection(db, "healthQueueConfig"), (snap) => {
    const row = (snap.docs || []).find((d) => d.id === QA_MODULE);
    if (row) qaApplyCfg(row.data());
  }, () => { });
  window.__p381.listeners++;
} catch (e) { }

// ================= live records =================
try {
  onSnapshot(collection(db, CFG.collection), (snap) => {
    recs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    if (window.__p381) window.__p381.docs = recs.length;
    renderDash();
    renderTable();
    qaRenderPanel();
  }, (e) => loadErr(CFG.collection, e));
  window.__p381.listeners++;
} catch (e) { }
try {
  onSnapshot(collection(db, "healthRegistrations"), (snap) => {
    otherCounts.healthRegistrations = snap.size;
  }, () => { });
} catch (e) { }

renderDash();
renderTable();
qaRenderPanel();
wireTable();

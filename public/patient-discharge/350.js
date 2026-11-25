






import { requireAuth, db, collection, doc, setDoc, onSnapshot, getDoc } from "/sidebar.js";

window.__p54 = { page: "350", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

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
function bootAnswered() {
  if (window.__p54) window.__p54.docs = 0;
  const b = document.getElementById("p-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

 
const QA_MODULE = "discharge";
const QA_DEFAULT = "Discharge Office";
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 };
try { qaCfg = Object.assign(qaCfg, JSON.parse(localStorage.getItem("jamali_qacfg_" + QA_MODULE) || "{}")); } catch (e) {}
let qaState = { waitingCount: 0, doneCount: 0, next: null, current: null };

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function qaTodayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaLocalDay(stamp) {
  const d = new Date(stamp);
  return isNaN(d.getTime()) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function qaIsTodayLocal(stamp) { return String(stamp || "").slice(0, 10) === qaTodayLocal(); }

function qaText() {
  const dept = String(qaCfg.department || "").trim();
  const staff = String(qaCfg.staffName || "").trim();
  const office = String(qaCfg.officeNumber || "").trim();
  const room = String(qaCfg.roomNumber || "").trim();
  const place = room || office;
  return { dept, staff, office, room, place, dest: (staff || dept || QA_DEFAULT) + (place ? ", " + place : "") };
}
function qaSentence(id) {
  return "Patient number " + String(id) + ", please proceed to " + qaText().dest + ".";
}
function qaRate() {
  const r = Number(qaCfg.voiceRate);
  return (r >= 0.5 && r <= 1.1) ? r : 0.75;
}
function qaSpeech(id) {
  const d = String(id).split("").join(", ");
  const dest = qaText().dest;
  return "Patient number " + d + ". Please proceed to " + dest +
         ". I repeat: patient number " + d + ". Please proceed to " + dest + ".";
}
function qaCfgLine() {
  const t = qaText();
  const bits = [];
  if (t.staff) bits.push("Staff: " + t.staff);
  if (t.room) bits.push("Room: " + t.room);
  if (t.office) bits.push("Office: " + t.office);
  if (!t.staff && t.dept) bits.push("Department: " + t.dept);
  return bits.join(" \u00b7 ");
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
function qaRenderPanel() {
  qaSet("qa-waiting", String(qaState.waitingCount));
  qaSet("qa-done", String(qaState.doneCount));
  const cur = qaState.current, nxt = qaState.next;
  const cBox = document.getElementById("qa-current-box");
  if (cBox) cBox.classList.toggle("qa-none", !cur);
  qaSet("qa-current-id", cur ? cur.patientId : "\u2014");
  qaSet("qa-current-sub", cur ? (cur.sub || "In progress") : "No discharge process is open right now");
  qaSet("qa-next-id", nxt ? nxt.patientId : "\u2014");
  qaSet("qa-next-sub", nxt ? (nxt.sub || "") : (qaState.waitingCount ? "" : "Nobody is waiting"));
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-regid", nxt.patientId); else btn.removeAttribute("data-regid");
  }
  const op = document.getElementById("qa-open");
  if (op) {
    if (nxt) { op.hidden = false; op.href = "/discharge-details/353?id=" + encodeURIComponent(nxt.__id); }
    else op.hidden = true;
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt.patientId) : "");
}
function qaUpdate(waitingRows, current, doneCount) {
  qaState.waitingCount = Array.isArray(waitingRows) ? waitingRows.length : 0;
  qaState.doneCount = doneCount || 0;
  qaState.next = (qaState.waitingCount > 0) ? waitingRows[0] : null;
  qaState.current = current || null;
  qaRenderPanel();
}
const qaAnnounceBtn = document.getElementById("qa-announce");
if (qaAnnounceBtn) qaAnnounceBtn.addEventListener("click", () => {
  const id = qaAnnounceBtn.getAttribute("data-regid");
  if (!id) return;
  const sentence = qaSentence(id);
  try {
    if (!("speechSynthesis" in window)) {
      qaSet("qa-note", "This browser cannot speak — read aloud: " + sentence);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(qaSpeech(id));
    u.lang = "en-GB";
    u.rate = qaRate();
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang || ""));
    if (vs.length) u.voice = vs.find((v) => /GB/i.test(v.lang || "")) || vs[0];
    synth.speak(u);
    qaSet("qa-note", "Announcing: " + sentence);
  } catch (e) {
    qaSet("qa-note", "Announcement failed (" + ((e && e.message) || e) + ") — read aloud: " + sentence);
  }
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

function qaApplyCfg(data) {
  qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 }, data || {});
  try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
  qaRenderPanel();
  bootAnswered();
}
// config load: a real document read (a doc-shaped subscription is not
// supported by the local data engine), plus a live collection listener
(async () => {
  try {
    const s = await getDoc(doc(db, "healthQueueConfig", QA_MODULE));
    qaApplyCfg(s.exists() ? s.data() : {});
  } catch (e) {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p54) window.__p54.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  }
})();
try {
  onSnapshot(collection(db, "healthQueueConfig"), (snap) => {
    const row = (snap.docs || []).find((d) => d.id === QA_MODULE);
    if (row) qaApplyCfg(row.data());
  }, () => { });
} catch (e) {   }

 
let discharges = [];

const ACTIVE = new Set(["Pending Authorization", "Approved", "In Progress",
  "Awaiting Medication", "Awaiting Instructions", "Ready for Departure"]);

function stBadge(s) {
  const CLS = {
    "Pending Authorization": "st-pendauth", "Approved": "st-approved",
    "In Progress": "st-progress", "Awaiting Medication": "st-waitmed",
    "Awaiting Instructions": "st-waitinstr", "Ready for Departure": "st-ready",
    "Discharged": "st-discharged", "Deferred": "st-deferred", "Cancelled": "st-cancelled"
  };
  return "<span class='st " + (CLS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

onSnapshot(collection(db, "healthDischarges"), (snap) => {
  discharges = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  renderDash();
  renderQueue();
}, (e) => loadErr("healthDischarges", e));
window.__p54.listeners++;

function renderDash() {
  const active = discharges.filter((x) => ACTIVE.has(x.status));
  const pend = active.filter((x) => x.status === "Pending Authorization");
  const prog = active.filter((x) => x.status !== "Pending Authorization");
  const today = discharges.filter((x) => x.status === "Discharged" && qaIsTodayLocal(x.dischargedAt));
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
  set("x-open", active.length);
  set("x-pend", pend.length);
  set("x-prog", prog.length);
  set("x-today", today.length);
  set("x-total", discharges.filter((x) => x.status === "Discharged").length);
}

function renderQueue() {
  const active = discharges.filter((x) => ACTIVE.has(x.status));
  const today = discharges.filter((x) => x.status === "Discharged" && qaIsTodayLocal(x.dischargedAt));
  const rows = active.map((x) => ({
    patientId: String(x.patientId || ""),
    __id: x.__id,
    sub: (x.status || "") + (x.wardCode ? " \u00b7 " + x.wardCode + (x.bedNumber ? " bed " + x.bedNumber : "") : "")
  }));
   
  const cur = rows.length ? { patientId: rows[0].patientId, sub: rows[0].sub } : null;
  qaUpdate(rows.slice(1), cur, today.length);
}

renderDash();
renderQueue();

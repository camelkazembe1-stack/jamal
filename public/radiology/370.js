// radiology (page 370) — JAMALI Health — Imaging Hub & Dashboard
// Every number is calculated from the stored imaging requests — never
// hard-coded. The queue panel follows the task-53 contract: the waiting and
// completed counters, the current and the next patient, and the speaker,
// which announces exactly the patient the panel shows using this module's
// saved destination (healthQueueConfig "radiology"). Urgent requests come
// first in the queue; calling a patient never completes a request by itself.
import { requireAuth, db, collection, doc, setDoc, onSnapshot } from "/firebase.js";

window.__p54 = { page: "370", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

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

/* =====================================================================
   JAMALI-QUEUE (task 53 contract, task 54 voice) — the shared queue panel.
   Waiting counts the open requests (urgent first, then waiting time);
   Completed today counts the requests finished today. The announcement
   reads the patient shown in the panel — never anybody else — at the speed
   saved in the settings. */
const QA_MODULE = "radiology";
const QA_DEFAULT = "Radiology";
let qaCfg = { department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 };
try { qaCfg = Object.assign(qaCfg, JSON.parse(localStorage.getItem("jamali_qacfg_" + QA_MODULE) || "{}")); } catch (e) {}
let qaState = { waitingCount: 0, doneCount: 0, next: null, current: null };

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function qaTodayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
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
function qaRenderPanel() {
  qaSet("qa-waiting", String(qaState.waitingCount));
  qaSet("qa-done", String(qaState.doneCount));
  const cur = qaState.current, nxt = qaState.next;
  const cBox = document.getElementById("qa-current-box");
  if (cBox) cBox.classList.toggle("qa-none", !cur);
  qaSet("qa-current-id", cur ? cur.regId : "\u2014");
  qaSet("qa-current-sub", cur ? (cur.sub || "Being served") : "No imaging procedure is in progress right now");
  qaSet("qa-next-id", nxt ? nxt.regId : "\u2014");
  qaSet("qa-next-sub", nxt ? (nxt.sub || "") : (qaState.waitingCount ? "" : "Nobody is waiting"));
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-regid", nxt.regId); else btn.removeAttribute("data-regid");
  }
  const op = document.getElementById("qa-open");
  if (op) {
    if (nxt) { op.hidden = false; op.href = "/radiology/373?id=" + encodeURIComponent(nxt.__id); }
    else op.hidden = true;
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt.regId) : "");
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
const qaSettingsBox = document.getElementById("qa-settings");
const qaSettingsBtn = document.getElementById("qa-settings-btn");
if (qaSettingsBtn && qaSettingsBox) {
  qaSettingsBtn.addEventListener("click", () => {
    qaSettingsBox.hidden = !qaSettingsBox.hidden;
    if (!qaSettingsBox.hidden) {
      const put = (id, k) => { const el = document.getElementById(id); if (el) el.value = String(qaCfg[k] || ""); };
      put("qa-dept", "department"); put("qa-staff", "staffName");
      put("qa-office", "officeNumber"); put("qa-room", "roomNumber");
      const sp = document.getElementById("qa-speed"); if (sp) sp.value = String(qaRate());
    }
  });
}
const qaSaveBtn = document.getElementById("qa-save");
if (qaSaveBtn) qaSaveBtn.addEventListener("click", async () => {
  const qae = document.getElementById("qa-err");
  const qao = document.getElementById("qa-ok");
  if (qae) qae.hidden = true;
  if (qao) qao.hidden = true;
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim().replace(/\s+/g, " ") : ""; };
  const spEl = document.getElementById("qa-speed");
  const spR = spEl ? Number(spEl.value) : NaN;
  const data = {
    department: val("qa-dept"),
    staffName: val("qa-staff"),
    officeNumber: val("qa-office"),
    roomNumber: val("qa-room"),
    voiceRate: (spR >= 0.5 && spR <= 1.1) ? spR : 0.75,
    updatedAt: new Date().toISOString()
  };
  const sameSpeed = Math.abs(Number(qaCfg.voiceRate || 0.75) - data.voiceRate) < 0.001;
  if (!data.department && !data.staffName && !data.officeNumber && !data.roomNumber && sameSpeed) {
    if (qae) { qae.hidden = false; qae.textContent = "Fill at least one field — or leave the settings closed to keep the module's default."; }
    return;
  }
  qaSaveBtn.disabled = true;
  try {
    await setDoc(doc(db, "healthQueueConfig", QA_MODULE), data, { merge: true });
    if (qao) { qao.hidden = false; qao.textContent = "Speaker settings saved — every announcement from now on uses them."; }
  } catch (e) {
    if (qae) {
      qae.hidden = false;
      qae.textContent = "Save failed: " + ((e && e.message) || e) +
        " — if it says permission-denied, publish the rules from the repo file firestore.rules first.";
    }
  } finally { qaSaveBtn.disabled = false; }
});
try {
  onSnapshot(doc(db, "healthQueueConfig", QA_MODULE), (s) => {
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 },
      s.exists() ? s.data() : {});
    try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
    qaRenderPanel();
    bootAnswered();
  }, (e) => {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p54) window.__p54.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  });
} catch (e) { /* the settings listener is optional — the dashboard keeps working */ }

/* ---------- live data & the counters ---------- */
let reqs = [];

function stBadge(s) {
  const CLS = {
    "Requested": "st-requested", "Scheduled": "st-scheduled",
    "In Progress": "st-testing", "Completed": "st-completed",
    "Cancelled": "st-cancelled"
  };
  return "<span class='st " + (CLS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

onSnapshot(collection(db, "healthImagingRequests"), (snap) => {
  reqs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  renderDash();
  renderQueue();
}, (e) => loadErr("healthImagingRequests", e));
window.__p54.listeners++;

function renderDash() {
  const open = reqs.filter((x) => x.status !== "Completed" && x.status !== "Cancelled");
  const sched = open.filter((x) => x.status === "Scheduled");
  const unverified = reqs.filter((x) => (x.procedures || []).some((p) =>
    p.status === "Completed" && p.report && !p.report.verifiedBy));
  const urgent = reqs.filter((x) => x.urgent && x.urgent.flagged && !x.urgent.acknowledgedBy);
  const today = reqs.filter((x) => x.status === "Completed" && qaIsTodayLocal(x.completedAt));
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
  set("x-open", open.length);
  set("x-sched", sched.length);
  set("x-unverified", unverified.length);
  set("x-urgent", urgent.length);
  set("x-today", today.length);
}

/* queue order: In Progress first (the current), then urgent before routine,
   then waiting time, then the request number */
function queueOrder(x) {
  return (String(x.priority) === "Urgent" ? 0 : 1);
}
function renderQueue() {
  const open = reqs.filter((x) => x.status !== "Completed" && x.status !== "Cancelled");
  const today = reqs.filter((x) => x.status === "Completed" && qaIsTodayLocal(x.completedAt));
  const current = open.filter((x) => x.status === "In Progress")
    .sort((a, b) => queueOrder(a) - queueOrder(b) ||
      String(a.createdAt || "").localeCompare(String(b.createdAt || "")))[0] || null;
  const waiting = open.filter((x) => x !== current)
    .sort((a, b) => queueOrder(a) - queueOrder(b) ||
      String(a.createdAt || "").localeCompare(String(b.createdAt || "")) ||
      String(a.requestNumber || "").localeCompare(String(b.requestNumber || "")));
  const rows = waiting.map((x) => ({
    regId: String(x.patientId || ""),
    __id: x.__id,
    sub: (x.priority === "Urgent" ? "URGENT · " : "") + (x.status || "") +
      " · " + (x.procedures || []).map((p) => p.name).filter(Boolean).slice(0, 2).join(", ")
  }));
  qaUpdate(rows,
    current ? { regId: String(current.patientId || ""), sub: "Procedure in progress" } : null,
    today.length);
}

renderDash();
renderQueue();

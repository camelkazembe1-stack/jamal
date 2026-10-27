// treatment-procedures (page 327) — JAMALI Health
// The treatment desk. Patients arrive with their Registration ID only; the
// doctor's orders (written on page 325) are retrieved from the database —
// the patient never repeats registration, triage, nursing or doctor
// information. The healthcare worker performs the treatment and records it:
// what was done, the outcome, notes and the status (pending, in progress,
// completed, not completed). The worker and the times come from the signed
// in account and the clock. A completed or not-completed record is closed —
// the original order text is never altered.
// EMERGENCY RULE: documentation never delays urgent care.
import { requireAuth, auth, db, collection, query, updateDoc, doc, setDoc, onSnapshot } from "/firebase.js";
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
  page: "327", build: "53", queue: true, ran: true, auth: false,
  listeners: 0, need: 5, answered: false, errs: []
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

/* ---------- shared helpers (same language as pages 322 to 326) ---------- */
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
function priBadge(p) {
  const k = String(p || "").toLowerCase();
  const cls = { critical: "st-critical", high: "st-high", medium: "st-medium", low: "st-low" }[k];
  if (cls) return '<span class="st ' + cls + '">' + esc(p) + "</span>";
  return '<span class="st st-none">' + (p ? esc(p) : "—") + "</span>";
}
const RANK = { critical: 0, high: 1, medium: 2, low: 3 };

/* the healthcare worker on record comes from the signed in account, never typed */
const WORKER = String((auth && auth.currentUser && (auth.currentUser.email || auth.currentUser.uid)) || "unknown");
$("#f-worker").textContent = WORKER;

/* ---------- live data ---------- */
let regs = [];
const regMap = new Map();
let triages = [];
const lastTriage = new Map();
let orders = []; // every treatment order, newest first

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
  renderList();
  if (currentId) renderPatient();
}, (e) => herr("healthTriage", e));

onSnapshot(query(collection(db, "healthTreatmentOrders")), (snap) => {
  orders = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderList();
  refreshSearchLine();
  if (currentId) renderPatient();
}, (e) => herr("healthPrescriptions", e));

/* JAMALI-NO-SKIP (task 51): the doctor's consultations, to enforce the step order */
let docConsults = [];
onSnapshot(query(collection(db, "healthDoctorConsultations")), (snap) => {
  docConsults = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  if (currentId) renderPatient();
}, (e) => herr("healthDoctorConsultations", e));
window.__p47.listeners = 5;

function qaStart(id) { qerr(""); openPatient(id); }


/* =====================================================================
   JAMALI-QUEUE (task 53) — the queue panel shared by every service stage:
   waiting and completed counts, the current and the next patient, the
   speaker announcement, and this module's own announcement settings.
   Waiting counts patients waiting for THIS service only; Completed counts
   the patients finished here today. The announcement always reads the
   patient the panel is showing — never anybody else — and it reads the
   destination the hospital saved for this module (healthQueueConfig),
   falling back to the module's own name. No hard-coded rooms or IDs. */
const QA_MODULE = "treatment";
const QA_DEFAULT = "Treatment & Procedures";
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
function qaIsToday(stamp) { return String(stamp || "").slice(0, 10) === new Date().toISOString().slice(0, 10); }
function qaIsTodayLocal(stamp) { return String(stamp || "").slice(0, 10) === qaTodayLocal(); }

/* the destination, composed from the saved settings */
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
  /* task 54 voice fix: the saved speed wins; a calm 0.75 is the default */
  const r = Number(qaCfg.voiceRate);
  return (r >= 0.5 && r <= 1.1) ? r : 0.75;
}
function qaSpeech(id) {
  /* spoken letter by letter with real pauses (commas), and the whole
     sentence is repeated so a waiting patient cannot miss their number */
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
  qaSet("qa-current-sub", cur ? (cur.sub || "In Progress") : "Nobody is being served right now");
  qaSet("qa-next-id", nxt ? nxt.regId : "\u2014");
  qaSet("qa-next-sub", nxt ? (nxt.sub || "") : (qaState.waitingCount ? "" : "Nobody is waiting"));
  qaSet("qa-dest-line", qaCfgLine());
  const btn = document.getElementById("qa-announce");
  if (btn) {
    btn.disabled = !nxt;
    if (nxt) btn.setAttribute("data-regid", nxt.regId); else btn.removeAttribute("data-regid");
  }
  const st = document.getElementById("qa-start");
  if (st) {
    st.disabled = !nxt;
    if (nxt) st.setAttribute("data-regid", nxt.regId); else st.removeAttribute("data-regid");
  }
  qaSet("qa-note", nxt ? "Ready to announce: " + qaSentence(nxt.regId) : "");
}

/* every stage derives its own queue, then calls this */
function qaUpdate(waitingRows, current, doneCount) {
  qaState.waitingCount = Array.isArray(waitingRows) ? waitingRows.length : 0;
  qaState.doneCount = doneCount || 0;
  qaState.next = (qaState.waitingCount > 0) ? waitingRows[0] : null;
  qaState.current = current || null;
  qaRenderPanel();
}

/* the speaker button announces exactly the patient shown above it */
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

/* open the next patient straight from the panel */
const qaStartBtn = document.getElementById("qa-start");
if (qaStartBtn) qaStartBtn.addEventListener("click", () => {
  const id = qaStartBtn.getAttribute("data-regid");
  if (id) qaStart(id);
});

/* this module's announcement settings */
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

/* live settings — a change here is heard on every device at once */
try {
  onSnapshot(doc(db, "healthQueueConfig", QA_MODULE), (s) => {
    qaCfg = Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 },
      s.exists() ? s.data() : {});
    try { localStorage.setItem("jamali_qacfg_" + QA_MODULE, JSON.stringify(qaCfg)); } catch (e) {}
    qaRenderPanel();
    bootDone();
  }, (e) => {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p47) window.__p47.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  });
} catch (e) { /* the settings listener is optional — the queue keeps working */ }


/* ---------- status chips ---------- */
function chip(status) {
  const map = {
    "pending": ["st-pending", "Pending"],
    "in-progress": ["st-progress", "In progress"],
    "completed": ["st-done", "Completed"],
    "not-completed": ["st-notdone", "Not completed"]
  };
  const m = map[String(status || "")] || ["st-none", status || "—"];
  return '<span class="st ' + m[0] + '">' + esc(m[1]) + "</span>";
}

/* ---------- STEP 1: search + queue ---------- */
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

function renderList() {
  const open = orders.filter((o) => o.status === "pending" || o.status === "in-progress");
  const rows = open.map((o) => {
    const t = lastTriage.get(String(o.regId));
    return { o, priority: (t && t.priority) || o.priority || "",
             rank: RANK[String(((t && t.priority) || o.priority || "")).toLowerCase()] ?? 4 };
  });
  rows.sort((a, b) => (a.rank - b.rank) ||
    String(a.o.savedAt || "").localeCompare(String(b.o.savedAt || "")));
  const has = rows.length > 0;
  $("#l-empty").hidden = has;
  $("#l-wrap").hidden = !has;
  $("#l-body").innerHTML = rows.map((r) => {
    const victim = regMap.get(String(r.o.regId));
    return "<tr><td>" + priBadge(r.priority) + "</td>" +
      "<td class='c-no'>" + esc(r.o.regId) + "</td>" +
      "<td class='c-party'>" + (victim ? esc(who(victim)) : "—") + "</td>" +
      "<td class='c-desc'>" + esc(r.o.order) + "</td>" +
      "<td>" + chip(r.o.status) + "</td>" +
      "<td><button type='button' class='ghost-btn o-open' data-regid='" + esc(r.o.regId) + "' data-order='" + esc(r.o.__id) + "'>Open</button></td></tr>";
  }).join("");
  $("#l-count").textContent = has
    ? rows.length + (rows.length === 1 ? " treatment waiting."
                                        : " treatments waiting.")
    : "";
  /* JAMALI-QUEUE (task 53): feed the queue panel — waiting, current, completed */
  const qaByPatient = new Map();
  let qaCur = null;
  rows.forEach((r) => {
    const id = String(r.o.regId || "");
    if (!id) return;
    if (r.o.status === "in-progress") {
      if (!qaCur) qaCur = { regId: id, sub: "In Progress · treatment under way" };
      return;
    }
    const rec = qaByPatient.get(id) || { regId: id, at: String(r.o.savedAt || ""), n: 0 };
    rec.n += 1;
    if (!rec.at || String(r.o.savedAt || "") < rec.at) rec.at = String(r.o.savedAt || "");
    qaByPatient.set(id, rec);
  });
  const qaWait = Array.from(qaByPatient.values())
    .sort((a, b) => String(a.at).localeCompare(String(b.at)) || a.regId.localeCompare(b.regId))
    .map((r) => ({
      regId: r.regId,
      sub: (regMap.get(r.regId) ? who(regMap.get(r.regId)) : "—") +
           " · " + r.n + (r.n === 1 ? " order" : " orders") + " waiting"
    }));
  const qaDoneSet = new Set();
  orders.forEach((o) => {
    if (o.status === "completed" && qaIsToday(o.updatedAt)) qaDoneSet.add(String(o.regId));
  });
  qaUpdate(qaWait, qaCur || (currentId ? { regId: String(currentId), sub: "Open at this desk" } : null), qaDoneSet.size);
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
  openPatient(id, null);
});
$("#l-body").addEventListener("click", (e) => {
  const btn = e.target.closest(".o-open");
  if (btn) { qerr(""); openPatient(btn.getAttribute("data-regid"), btn.getAttribute("data-order")); }
});

/* ---------- STEP 2: the patient's orders ---------- */
let currentId = null;
let selOrderId = null;

/* JAMALI-NO-SKIP (task 51): treatment & procedures is step 5b — the Doctor Consultation (step 4) must be completed first */
function stepGate(regId) {
  const done = docConsults.some((c) => String(c.regId) === String(regId) &&
    (c.status === "completed" || c.status === "sent"));
  if (!done) {
    return "This patient cannot skip a step — the Doctor Consultation is not completed yet. Complete the doctor stage on page 325 (Doctor Consultation) first, then come to Treatment & Procedures.";
  }
  return "";
}
function openPatient(regId, orderId) {
  const blocked = stepGate(regId);
  if (blocked) { qerr(blocked); return; }
  /* JAMALI-QUEUE (task 53): one treatment at a time — the next patient
     stays next until the current patient's treatment is completed or closed */
  const qaBusy = orders.find((o) => o.status === "in-progress" && String(o.regId) !== String(regId));
  if (qaBusy) {
    qerr("Patient " + qaBusy.regId + " is still being treated. Complete or close that treatment first — the queue panel shows them as the current patient. Then the next patient can be seen.");
    return;
  }
  showPatient(regId);
  currentId = regId;
  selOrderId = orderId || null;
  renderPatient();
  $("#s-search").hidden = true;
  $("#s-patient").hidden = false;
  if (orderId) {
    const card = $("#form-card");
    if (card && !card.hidden) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  window.scrollTo(0, 0);
}

$("#p-back").addEventListener("click", (e) => {
  e.preventDefault();
  hidePatient();
  currentId = null;
  selOrderId = null;
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
  $("#p-wholine").textContent = "Treating " + who(r) + " · Registration ID " + r.regId;
  $("#p-reg").innerHTML =
    item("Patient", ident) +
    item("Registration ID", esc(r.regId)) +
    item("Sex", esc(r.sex)) +
    item("Age", r.age !== "" && r.age != null ? esc(String(r.age) + "y") : "") +
    item("Allergies", t ? esc(t.allergies) : "") +
    item("Existing conditions", t ? esc(t.conditions) : "");

  const mine = orders.filter((o) => String(o.regId) === String(currentId));
  const has = mine.length > 0;
  $("#p-empty").hidden = has;
  $("#p-wrap").hidden = !has;
  $("#p-body").innerHTML = mine.map((o) =>
    "<tr><td class='c-desc'><b>" + esc(o.order) + "</b></td>" +
    "<td class='c-date'>" + esc(when(o.savedAt)) +
      "<span class='cell-sub'>by " + esc(o.orderedBy || "—") + "</span></td>" +
    "<td>" + chip(o.status) + "</td>" +
    "<td class='c-date'>" + esc(when(o.updatedAt)) +
      (o.worker ? "<span class='cell-sub'>by " + esc(o.worker) + "</span>" : "") + "</td>" +
    "<td><button type='button' class='ghost-btn o-pick' data-id='" + esc(o.__id) + "'>Open order</button></td></tr>"
  ).join("");

  /* the form: the selected order, or closed */
  const sel = selOrderId ? mine.find((o) => o.__id === selOrderId) : null;
  $("#form-card").hidden = !sel;
  if (!sel) return;
  $("#f-order").innerHTML = "<b>Doctor's order:</b> " + esc(sel.order) +
    '<span class="o-by">ordered ' + esc(when(sel.savedAt)) + " by " + esc(sel.orderedBy || "—") +
    " · current status: " + esc(sel.status || "pending") + "</span>";
  const closed = sel.status === "completed" || sel.status === "not-completed";
  $("#f-editable").hidden = closed;
  $("#f-locked").hidden = !closed;
  $("#f-ok").hidden = true;
  $("#f-err").hidden = true;
  if (closed) {
    $("#f-record").innerHTML =
      item("Treatment performed", esc(sel.performed || "—"), true) +
      item("Outcome", esc(sel.outcome || "—"), true) +
      item("Notes", esc(sel.notes || "—"), true) +
      item("Final status", esc(sel.status === "completed" ? "Completed" : "Not completed")) +
      item("Healthcare worker", esc(sel.worker || "—")) +
      item("Recorded", esc(when(sel.updatedAt)));
  } else {
    $("#f-performed").value = sel.performed || "";
    $("#f-outcome").value = sel.outcome || "";
    $("#f-notes").value = sel.notes || "";
    $("#f-status").value = sel.status || "pending";
    $("#f-updated").textContent = when(sel.updatedAt);
  }
}

$("#p-body").addEventListener("click", (e) => {
  const btn = e.target.closest(".o-pick");
  if (btn) {
    selOrderId = btn.getAttribute("data-id");
    renderPatient();
    $("#form-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

/* ---------- save the treatment record ---------- */
$("#f-save").addEventListener("click", async () => {
  const eEl = $("#f-err"); const okEl = $("#f-ok");
  eEl.hidden = true; okEl.hidden = true;
  const sel = orders.find((o) => o.__id === selOrderId);
  if (!sel) return;
  const status = $("#f-status").value;
  const performed = $("#f-performed").value.trim();
  const outcome = $("#f-outcome").value.trim();
  const notes = $("#f-notes").value.trim();
  if (status === "completed" && !performed) {
    eEl.textContent = "Record what was done before marking the treatment completed.";
    eEl.hidden = false;
    return;
  }
  if (status === "not-completed" && !notes) {
    eEl.textContent = "Record why the treatment could not be completed before closing it as not completed.";
    eEl.hidden = false;
    return;
  }
  const btn = $("#f-save");
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthTreatmentOrders", selOrderId), {
      status,
      performed,
      outcome,
      notes,
      worker: WORKER,
      updatedAt: new Date().toISOString()
    });
    okEl.textContent = "Treatment record saved " + when(new Date().toISOString()) +
      " — status: " + (status === "in-progress" ? "In progress" :
        status === "completed" ? "Completed" :
        status === "not-completed" ? "Not completed" : "Pending") + ".";
    okEl.hidden = false;
  } catch (err) {
    eEl.textContent = "Save failed: " + ((err && err.message) || err);
    eEl.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

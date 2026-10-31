







import { requireAuth, auth, db, collection, query, updateDoc, doc, setDoc, onSnapshot } from "/firebase.js";
 
let showPatient = function () {}, hidePatient = function () {};
try {
  const pi = await import("/health/patient-info.js");
  if (pi && typeof pi.showPatient === "function") showPatient = pi.showPatient;
  if (pi && typeof pi.hidePatient === "function") hidePatient = pi.hidePatient;
} catch (e) {   }

 
window.__p47 = Object.assign(window.__p47 || {}, {
  page: "326", build: "53", queue: true, ran: true, auth: false,
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
  await requireAuth(); 
  window.__p47.auth = true;
} catch (e) {
  herr("the sign-in check", e);
  throw e;
}

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

 
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

 
const PHARM = String((auth && auth.currentUser && (auth.currentUser.email || auth.currentUser.uid)) || "unknown");

 
let regs = [];
const regMap = new Map();
let triages = [];
const lastTriage = new Map();
let rxLines = []; 

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

 
let docConsults = [];
onSnapshot(query(collection(db, "healthDoctorConsultations")), (snap) => {
  docConsults = snap.docs.map((d) => d.data())
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  if (currentId) renderPatient();
}, (e) => herr("healthDoctorConsultations", e));
window.__p47.listeners = 5;

function qaStart(id) { qerr(""); openPatient(id); }


 
const QA_MODULE = "pharmacy";
const QA_DEFAULT = "Pharmacy";
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

 
const qaStartBtn = document.getElementById("qa-start");
if (qaStartBtn) qaStartBtn.addEventListener("click", () => {
  const id = qaStartBtn.getAttribute("data-regid");
  if (id) qaStart(id);
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
    bootDone();
  }, (e) => {
    const code = String((e && (e.code || e.message)) || "unknown");
    if (window.__p47) window.__p47.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
  });
} catch (e) {   }


 
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
let edit = { id: null, mode: null }; 

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
  if (edit.id === l.__id) return ""; 
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
   
  const qaByPatient = new Map();
  open.forEach((l) => {
    const id = String(l.regId || "");
    if (!id || (l.status !== "to dispense" && l.status !== "accepted")) return;
    const rec = qaByPatient.get(id) || { regId: id, at: String(l.savedAt || ""), n: 0 };
    rec.n += 1;
    if (!rec.at || String(l.savedAt || "") < rec.at) rec.at = String(l.savedAt || "");
    qaByPatient.set(id, rec);
  });
  const qaWait = Array.from(qaByPatient.values())
    .sort((a, b) => String(a.at).localeCompare(String(b.at)) || a.regId.localeCompare(b.regId))
    .map((r) => ({
      regId: r.regId,
      sub: (regMap.get(r.regId) ? who(regMap.get(r.regId)) : "—") +
           " · " + r.n + (r.n === 1 ? " medicine" : " medicines") + " to hand"
    }));
  const qaDoneSet = new Set();
  rxLines.forEach((l) => {
    if (l.status === "dispensed" && l.dispensed && qaIsToday(l.dispensed.at)) qaDoneSet.add(String(l.regId));
  });
  qaUpdate(qaWait, currentId ? { regId: String(currentId), sub: "Being served at this desk" } : null, qaDoneSet.size);
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
        if (!what) return; 
        await updateDoc(doc(db, "healthPrescriptions", id), {
          status: "dispensed",
          dispensed: { what, by: PHARM, at: new Date().toISOString() }
        });
      } else {
        const medicine = ($("#ed-alt") ? $("#ed-alt").value : "").trim();
        const note = ($("#ed-note") ? $("#ed-note").value : "").trim();
        if (!medicine) return; 
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

 
let currentId = null;

 
function stepGate(regId) {
  const done = docConsults.some((c) => String(c.regId) === String(regId) &&
    (c.status === "completed" || c.status === "sent"));
  if (!done) {
    return "This patient cannot skip a step — the Doctor Consultation is not completed yet. Complete the doctor stage on page 325 (Doctor Consultation) first, then come to the pharmacy.";
  }
  return "";
}
function openPatient(regId) {
  const blocked = stepGate(regId);
  if (blocked) { qerr(blocked); return; }
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

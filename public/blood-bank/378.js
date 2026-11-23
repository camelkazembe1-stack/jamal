


import { requireAuth, db, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from "/sidebar.js";

window.__p378 = { page: "378", build: "378", auth: false, listeners: 0, docs: -1, errs: [] };

const CFG = {
  "collection": "healthBloodBank",
  "refp": "BLD",
  "statuses": [
    "Collected",
    "Screening",
    "Available",
    "Reserved",
    "Issued",
    "Expired",
    "Discarded"
  ],
  "done": [
    "Issued",
    "Expired",
    "Discarded"
  ],
  "columns": [
    "ref",
    "donorId",
    "bloodGroup",
    "units",
    "screening",
    "storageLocation",
    "expiry"
  ],
  "fields": [
    {
      "id": "donorId",
      "label": "Donor ID / name",
      "type": "text",
      "ph": "e.g. DON-001 / A. JUMA",
      "req": true,
      "opts": []
    },
    {
      "id": "bloodGroup",
      "label": "Blood group",
      "type": "select",
      "ph": "",
      "req": true,
      "opts": [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-"
      ]
    },
    {
      "id": "units",
      "label": "Units collected",
      "type": "number",
      "ph": "1",
      "req": false,
      "opts": []
    },
    {
      "id": "screening",
      "label": "Screening",
      "type": "select",
      "ph": "",
      "req": false,
      "opts": [
        "Pending",
        "Passed",
        "Failed"
      ]
    },
    {
      "id": "storageLocation",
      "label": "Storage location",
      "type": "text",
      "ph": "e.g. Fridge 2, shelf A",
      "req": false,
      "opts": []
    },
    {
      "id": "expiry",
      "label": "Expiry date",
      "type": "date",
      "ph": "",
      "req": false,
      "opts": []
    }
  ],
  "dash": [
    [
      "Units available",
      "status",
      "Available"
    ],
    [
      "Awaiting screening",
      "status-in",
      [
        "Collected",
        "Screening"
      ]
    ],
    [
      "Reserved",
      "status",
      "Reserved"
    ],
    [
      "Issued",
      "status",
      "Issued"
    ]
  ],
  "searchKeys": [
    "donorId",
    "bloodGroup",
    "units",
    "screening",
    "ref"
  ],
  "qa": "bloodbank",
  "caseNoun": "Donor number",
  "caseId": "donorId",
  "defaultDept": "Blood Bank & Transfusion"
};

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p378) window.__p378.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code);
}
function bootAnswered() {
  if (window.__p378) window.__p378.docs = 0;
  const b = document.getElementById("p-boot");
  if (b) b.hidden = true;
}

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

try {
  await requireAuth();
  if (window.__p378) window.__p378.auth = true;
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
    // the reader must read through the info set in the speaker settings:
    qaApplyCfg(data);
    const line = qaSettingsLine();
    if (qao) { qao.hidden = false; qao.textContent = "Speaker settings saved — the speaker is reading them through now."; }
    if (!qaSpeakNow(line)) qaSet("qa-note", "This browser cannot speak — " + line);
  } catch (e) {
    if (qae) {
      qae.hidden = false;
      qae.textContent = "Save failed: " + ((e && e.message) || e);
    }
  } finally { qaSaveBtn.disabled = false; }
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
    if (window.__p378) window.__p378.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
    bootAnswered();
  }
})();
try {
  onSnapshot(collection(db, "healthQueueConfig"), (snap) => {
    const row = (snap.docs || []).find((d) => d.id === QA_MODULE);
    if (row) qaApplyCfg(row.data());
  }, () => { });
  window.__p378.listeners++;
} catch (e) { }

// ================= live records =================
try {
  onSnapshot(collection(db, CFG.collection), (snap) => {
    recs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    if (window.__p378) window.__p378.docs = recs.length;
    renderDash();
    renderTable();
    qaRenderPanel();
  }, (e) => loadErr(CFG.collection, e));
  window.__p378.listeners++;
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

// ================= patient-level issuance & the transfusion register =================
// A unit is issued to ONE patient, named by their single Registration ID.
// ABO/Rh compatibility is checked in the page before the unit moves; the
// issuance flips the unit to Issued and writes a transfusion record.
import("/sidebar.js").then((m) => {
  const { watchHealthPatients, patientById } = m;

  let rows = [];
  const ABO = {
    "O-":  ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+":  ["O+", "A+", "B+", "AB+"],
    "A-":  ["A-", "A+", "AB-", "AB+"],
    "A+":  ["A+", "AB+"],
    "B-":  ["B-", "B+", "AB-", "AB+"],
    "B+":  ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"]
  };
  const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const who = (p) => (p && p.isUnidentified) ? "Unidentified" : ((p && p.fullName) || "Unnamed");
  const iFail = (msg) => { const e = document.getElementById("i-err"); e.hidden = !msg; e.textContent = msg; };
  const iOk = (msg) => { const o = document.getElementById("i-ok"); o.hidden = !msg; o.textContent = msg; };

  function unitById(id) { return recs.find((r) => r.__id === id) || null; }
  function paintUnitOptions() {
    const sel = document.getElementById("i-unit");
    if (!sel) return;
    const keep = sel.value;
    const units = recs.filter((r) => String(r.status) === "Available");
    sel.innerHTML = '<option value="">&mdash; pick an available unit &mdash;</option>' +
      units.map((u) => '<option value="' + u.__id + '">' + (u.ref || "") + " \u00b7 " + (u.bloodGroup || "?") +
        " \u00b7 " + (u.units || 1) + " unit(s) \u00b7 " + (u.screening || "screening " + "?") +
        (u.expiry ? " \u00b7 exp " + String(u.expiry).slice(0, 10) : "") + "</option>").join("");
    if (keep) sel.value = keep;
  }
  function paintRegIds() {
    const dl = document.getElementById("i-regids");
    if (dl) dl.innerHTML = rows.map((p) =>
      '<option value="' + esc(String(p.regId || "")) + '">' + esc(who(p)) + "</option>").join("");
  }
  function paintHint() {
    const inp = document.getElementById("i-regid");
    const hint = document.getElementById("i-hint");
    if (!inp || !hint) return;
    const v = String(inp.value || "").trim();
    if (!v) { hint.textContent = ""; hint.className = "f-hint"; return; }
    const p = patientById(v);
    if (p) { hint.textContent = "\u2713 " + who(p); hint.className = "f-hint ok"; }
    else { hint.textContent = "\u2717 Not a registered Registration ID \u2014 pick from the list."; hint.className = "f-hint bad"; }
  }
  watchHealthPatients((rs) => { rows = rs; paintRegIds(); paintHint(); });
  document.getElementById("i-regid").addEventListener("input", paintHint);

  document.getElementById("issue-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    iFail(""); iOk("");
    const unitId = document.getElementById("i-unit").value;
    const unit = unitById(unitId);
    const regId = document.getElementById("i-regid").value.trim();
    const ptGroup = document.getElementById("i-group").value;
    const cross = document.getElementById("i-cross").value.trim();
    const by = document.getElementById("i-by").value.trim();
    const note = document.getElementById("i-note").value.trim();
    if (!unit) { iFail("Pick the blood unit first."); return; }
    if (!regId || !patientById(regId)) {
      iFail("Recipient must be a registered Registration ID (e.g. 4827ABCD) \u2014 register the patient on page 322 first.");
      return;
    }
    if (!ptGroup) { iFail("State the recipient's blood group."); return; }
    if (!by) { iFail("Fill in who releases the unit."); return; }
    if (String(unit.screening || "") !== "Passed") {
      iFail("Unit " + (unit.ref || "") + " is not screening-passed \u2014 only Passed units may be issued.");
      return;
    }
    const compatible = (ABO[String(unit.bloodGroup || "?")] || []).includes(ptGroup);
    if (!compatible) {
      if (!window.confirm("INCOMPATIBLE: donor " + (unit.bloodGroup || "?") + " cannot be given safely to recipient " +
        ptGroup + ".\nOnly continue in a life-threatening emergency with a doctor's explicit instruction.")) {
        iFail("Issuing stopped \u2014 the groups do not match.");
        return;
      }
    } else if (!cross) {
      iFail("Record the crossmatch result before issuing (type it even if it is 'crossmatch OK').");
      return;
    }
    const p = patientById(regId);
    const at = new Date().toISOString();
    const btn = document.getElementById("issue-save");
    btn.disabled = true; btn.textContent = "Issuing\u2026";
    try {
      await updateDoc(doc(db, CFG.collection, unit.__id), {
        status: "Issued",
        issuedTo: { regId, name: who(p), group: ptGroup, crossmatch: cross, by, note, at },
        updatedAt: at
      });
      await addDoc(collection(db, "healthTransfusions"), {
        unitRef: unit.ref || "", unitId: unit.__id, donorId: unit.donorId || "",
        group: unit.bloodGroup || "",
        regId, patientName: who(p), patientGroup: ptGroup,
        compatibility: compatible ? "compatible" : "INCOMPATIBLE - emergency authorisation",
        crossmatch: cross, issuedBy: by, note, at, createdAt: at
      });
      iOk("Unit " + (unit.ref || "") + " (" + (unit.bloodGroup || "?") + ") issued to " + who(p) +
        " (" + regId + ", " + ptGroup + ")" + (compatible ? " - compatible." : " - EMERGENCY authorisation recorded."));
      document.getElementById("issue-form").reset();
      paintHint();
    } catch (e) {
      iFail("Issue failed: " + ((e && (e.code || e.message)) || e));
    } finally { btn.disabled = false; btn.textContent = "Issue unit & record transfusion"; }
  });

  try {
    onSnapshot(collection(db, "healthTransfusions"), (snap) => {
      const rows = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
        .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
      const body = document.getElementById("tr-body");
      document.getElementById("tr-empty").hidden = rows.length > 0;
      if (body) body.innerHTML = rows.map((t) => "<tr>" +
        '<td><span class="ref">' + esc(String(t.at || "").slice(0, 16).replace("T", " ")) + "</span></td>" +
        "<td>" + esc(t.unitRef || "") + "</td>" +
        "<td><b>" + esc(t.group || "") + "</b></td>" +
        '<td class="c-name">' + esc(t.patientName || "") + '<br><span class="cell-sub">' + esc(t.regId || "") + "</span></td>" +
        "<td><b>" + esc(t.patientGroup || "") + "</b></td>" +
        "<td>" + (String(t.compatibility || "").indexOf("INCOMPATIBLE") === 0
          ? '<span class="st st-bad">emergency</span>' : '<span class="st st-good">compatible</span>') + "</td>" +
        "<td>" + esc(t.issuedBy || "") + "</td>" +
        "<td>" + esc(t.crossmatch || "\u2014") + "</td></tr>").join("");
    }, () => {});
    window.__p378.listeners++;
  } catch (e) {}

  const origRender = window.__p378.__renderTable;
  window.__p378.__renderTable = true;
  // repaint the unit options whenever the records render (statuses change)
  setInterval(paintUnitOptions, 3000);
  paintUnitOptions();
  paintRegIds();
});

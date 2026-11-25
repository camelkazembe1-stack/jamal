


import { requireAuth, db, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, arrayUnion,
         watchHealthPatients, patientById } from "/sidebar.js";

window.__p365 = { page: "365", build: "365", auth: false, listeners: 0, docs: -1, errs: [] };

const CFG = {
  "collection": "healthInsurance",
  "refp": "CLM",
  "statuses": [
    "Draft",
    "Submitted",
    "Under review",
    "Approved",
    "Partially approved",
    "Rejected",
    "Paid"
  ],
  "done": [
    "Paid",
    "Rejected"
  ],
  "columns": [
    "patientId",
    "provider",
    "membershipNo",
    "claimAmount",
    "services"
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
      "id": "provider",
      "label": "Insurance provider / scheme",
      "type": "text",
      "ph": "e.g. NHIF",
      "req": true,
      "opts": []
    },
    {
      "id": "membershipNo",
      "label": "Membership / policy number",
      "type": "text",
      "ph": "policy card number",
      "req": false,
      "opts": []
    },
    {
      "id": "claimAmount",
      "label": "Claim amount (TSh)",
      "type": "number",
      "ph": "35000",
      "req": false,
      "opts": []
    },
    {
      "id": "services",
      "label": "Services claimed",
      "type": "text",
      "ph": "consultation, laboratory, medication",
      "req": false,
      "opts": []
    }
  ],
  "dash": [
    [
      "Claims submitted",
      "all"
    ],
    [
      "Under review",
      "status",
      "Under review"
    ],
    [
      "Approved",
      "status-in",
      [
        "Approved",
        "Partially approved"
      ]
    ],
    [
      "Paid by insurer",
      "status",
      "Paid"
    ]
  ],
  "searchKeys": [
    "patientId",
    "provider",
    "membershipNo",
    "claimAmount",
    "ref"
  ],
  "qa": "insurance",
  "caseNoun": "Patient number",
  "caseId": "patientId",
  "defaultDept": "Health Insurance"
};

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---- ONE PATIENT ID ----------------------------------------------------------
// A claim names the patient by their single Registration ID (4 digits + 4
// letters, e.g. 4827ABCD) from Registration (page 322). The ID box offers
// the live registry as you type, shows the patient under the box, and a
// claim cannot be saved against an ID that is not registered.
const pidInput = document.getElementById("f-patientId");
const pidHint = document.getElementById("f-patientId-hint");
const pidList = document.getElementById("f-regids");
const who = (p) => (p && p.isUnidentified) ? "Unidentified" : ((p && p.fullName) || "Unnamed");
function pidHintFor(v) {
  if (!String(v || "").trim()) return { cls: "", txt: "" };
  const p = patientById(v);
  if (!p) return { cls: "bad", txt: "\u2717 Not a registered Registration ID \u2014 pick the patient from the list (e.g. 4827ABCD)." };
  const bits = [p.sex, (p.age !== "" && p.age != null) ? String(p.age) : ""].filter(Boolean);
  return { cls: "ok", txt: "\u2713 " + who(p) + (bits.length ? " \u00b7 " + bits.join(" \u00b7 ") : "") };
}
function pidPaint() {
  if (!pidInput || !pidHint) return;
  const h = pidHintFor(pidInput.value);
  pidHint.textContent = h.txt;
  pidHint.className = "f-hint " + h.cls;
}
watchHealthPatients((rows) => {
  if (pidList) pidList.innerHTML = rows.map((p) =>
    '<option value="' + esc(String(p.regId || "")) + '">' + esc(who(p)) + "</option>").join("");
  pidPaint();
  renderTable();
});
if (pidInput) pidInput.addEventListener("input", pidPaint);

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p365) window.__p365.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code);
}
function bootAnswered() {
  if (window.__p365) window.__p365.docs = 0;
  const b = document.getElementById("p-boot");
  if (b) b.hidden = true;
}

function qaSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

try {
  await requireAuth();
  if (window.__p365) window.__p365.auth = true;
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
    for (const c of CFG.columns) {
      if (c === "patientId") {
        const p = patientById(r.patientId);
        tds.push("<td>" + esc(String(r.patientId || "") || "—") +
          (p ? '<span class="cell-sub">' + esc(who(p)) + "</span>" : "") + "</td>");
      } else {
        tds.push("<td>" + esc(String(r[c] || "") || "—") + "</td>");
      }
    }
    tds.push("<td>" + esc(String(r.createdAt || "").slice(0, 10)) + "</td>");
    tds.push("<td><select class='st-sel' data-id='" + esc(r.__id) + "'>" +
      CFG.statuses.map((s) => "<option" + (s === r.status ? " selected" : "") + ">" + esc(s) + "</option>").join("") +
      "</select></td>");
    const logN = (r.insurerLog || []).length;
    tds.push("<td class='c-trip'><button type='button' class='mini-btn row-log' data-id='" + esc(r.__id) + "'>Log response</button> " +
      "<button type='button' class='mini-btn row-hist' data-id='" + esc(r.__id) + "'>View (" + logN + ")</button></td>");
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
    const prev = String(rec.status || "");
    const next = sel.value;
    updateDoc(doc(db, CFG.collection, id), {
      status: next, updatedAt: new Date().toISOString(),
      insurerLog: arrayUnion({ at: new Date().toISOString(), by: "claims desk",
        from: prev, to: next, note: "status changed " + prev + " -> " + next })
    })
      .catch(() => { rec.status = sel.value; renderDash(); renderTable(); });
    rec.status = sel.value;
    rec.insurerLog = (rec.insurerLog || []).concat([{ at: new Date().toISOString(),
      by: "claims desk", from: prev, to: next, note: "status changed " + prev + " -> " + next }]);
    rec.updatedAt = new Date().toISOString();
    renderDash();
    renderTable();
  });
  body.addEventListener("click", (ev) => {
    const logBtn = ev.target.closest("button.row-log");
    if (logBtn) {
      const id = logBtn.getAttribute("data-id");
      const rec = recs.find((r) => r.__id === id);
      if (!rec) return;
      const note = window.prompt("Insurer response for " + (rec.ref || "the claim") +
        " (what the fund said, who said it, reference numbers):\n", "");
      if (note == null) return;
      const entry = { at: new Date().toISOString(), by: "claims desk",
        from: String(rec.status || ""), to: String(rec.status || ""), note: String(note).trim() };
      updateDoc(doc(db, CFG.collection, id), { insurerLog: arrayUnion(entry) })
        .catch(() => {});
      rec.insurerLog = (rec.insurerLog || []).concat([entry]);
      renderTable();
      return;
    }
    const histBtn = ev.target.closest("button.row-hist");
    if (histBtn) {
      const id = histBtn.getAttribute("data-id");
      const rec = recs.find((r) => r.__id === id);
      if (!rec) return;
      const lines = (rec.insurerLog || []).map((e) =>
        String(e.at || "").slice(0, 16).replace("T", " ") + "  " + (e.from || "") + " -> " + (e.to || "") +
        "  " + (e.note || "")).join("\n");
      window.alert((rec.ref || "Claim") + " round-trip:\n\n" +
        (lines || "No insurer responses logged yet - use 'Log response' when the fund replies, and the status select to move the claim along."));
      return;
    }
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
  if (String(rec.patientId || "").trim() && !patientById(rec.patientId)) {
    if (err) { err.hidden = false; err.textContent =
      "Patient ID must be a registered Registration ID (e.g. 4827ABCD) \u2014 pick the patient from the list, or register them on page 322 first."; }
    return;
  }
  const saveBtn = document.getElementById("rec-save");
  saveBtn.disabled = true;
  try {
    rec.ref = CFG.refp + "-" + todayLocal().replace(/-/g, "").slice(2) + "-" +
              String((recs.length + 1) % 10000).padStart(4, "0");
    rec.status = CFG.statuses[0];
    rec.insurerLog = [{ at: new Date().toISOString(), by: "claims desk",
      from: "", to: CFG.statuses[0], note: "claim raised" }];
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
    if (window.__p365) window.__p365.errs.push("healthQueueConfig: " + code);
    qaSet("qa-note", "Speaker settings could not load (" + code + ") — the module's default name is in use.");
    bootAnswered();
  }
})();
try {
  onSnapshot(collection(db, "healthQueueConfig"), (snap) => {
    const row = (snap.docs || []).find((d) => d.id === QA_MODULE);
    if (row) qaApplyCfg(row.data());
  }, () => { });
  window.__p365.listeners++;
} catch (e) { }

// ================= fund batch export =================
// The monthly CSV the fund officer (NHIF / SHIF / any scheme) receives:
// every claim raised that month with its amount and where it stands.
// Downloaded to this device - nothing is sent anywhere by itself.
$("#claim-month").value = todayLocal().slice(0, 7);
$("#claim-export").addEventListener("click", () => {
  const month = String($("#claim-month").value || "");
  if (!/^\d{4}-\d{2}$/.test(month)) { qaSet("qa-note", ""); window.alert("Pick the month first."); return; }
  const rows = recs.filter((r) => String(r.createdAt || "").slice(0, 7) === month);
  if (!rows.length) { window.alert("No claims were raised in " + month + " on this device."); return; }
  const csv = ["ref,patientId,provider,membershipNo,claimAmount,services,status,raisedOn"]
    .concat(rows.map((r) => [r.ref, r.patientId, r.provider, r.membershipNo, r.claimAmount,
      String(r.services || "").replace(/,/g, ";"), r.status, String(r.createdAt || "").slice(0, 10)]
      .map((v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"').join(","))).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jamali-claims-" + month + ".csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
});

// ================= live records =================
try {
  onSnapshot(collection(db, CFG.collection), (snap) => {
    recs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    if (window.__p365) window.__p365.docs = recs.length;
    renderDash();
    renderTable();
    qaRenderPanel();
  }, (e) => loadErr(CFG.collection, e));
  window.__p365.listeners++;
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

// ================= tariff chips (the Tariff Engine, page 406) =================
// Claims are priced from the official insurance tariff, not guessed: every
// tap adds the service's insurance tariff to the claim amount.
let TARIFF = [];
try {
  onSnapshot(collection(db, "healthTariff"), (snap) => {
    TARIFF = snap.docs.map((d) => d.data())
      .filter((t) => String(t.status || "Active") === "Active")
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    paintTariff();
  }, () => {});
  window.__p365.listeners++;
} catch (e) {}

let tariffSum = 0;
function paintTariff() {
  const box = document.getElementById("tariff-chips");
  if (!box) return;
  const q = String((document.getElementById("tariff-search") || {}).value || "").trim().toLowerCase();
  const rows = !q ? TARIFF : TARIFF.filter((t) =>
    ["code", "name", "cat"].some((k) => String(t[k] || "").toLowerCase().includes(q)));
  box.innerHTML = rows.slice(0, 24).map((t) => {
    const price = Number(t.nhif || t.price || 0);
    return '<button type="button" class="tariff-chip" data-name="' + esc(String(t.name || "")) +
      '" data-price="' + price + '">' + esc(String(t.name || "")) +
      ' <span class="chip-amt">' + price.toLocaleString() + "</span></button>";
  }).join("") || '<span class="mini-note">No tariff entries yet - price the services on page 406 (Tariff Engine) first.</span>';
}
document.getElementById("tariff-search").addEventListener("input", paintTariff);
document.getElementById("tariff-chips").addEventListener("click", (ev) => {
  const chip = ev.target.closest(".tariff-chip");
  if (!chip) return;
  const name = chip.getAttribute("data-name");
  const price = Number(chip.getAttribute("data-price") || 0);
  const sv = document.getElementById("f-services");
  const am = document.getElementById("f-claimAmount");
  const parts = String(sv.value || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.some((p) => p.toLowerCase() === String(name).toLowerCase())) parts.push(name);
  sv.value = parts.join(", ");
  tariffSum += price;
  am.value = tariffSum || "";
  document.getElementById("tariff-sum").textContent = tariffSum
    ? "Insurance tariff total tapped: TSh " + tariffSum.toLocaleString() + " - the claim amount follows it."
    : "";
});

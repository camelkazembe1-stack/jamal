import { requireAuth, db, collection, doc, addDoc, deleteDoc, onSnapshot } from "/sidebar.js";

window.__p96.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
const money = (n) => num(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p96) window.__p96.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
  if (code.indexOf("permission-denied") >= 0) {
    const hint = document.getElementById("h-err-hint");
    if (hint) hint.hidden = false;
  }
}
function bootDone() {
  if (window.__p96) window.__p96.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth();
  window.__p96.auth = true;
} catch (e) {
  herr("the sign-in check", e);
  throw e;
}

// ---- the collections of one patient's story ---------------------------------
// key: timeline kind; coll: Firestore collection; mod: link back to the module
// page; match: which field carries the Registration ID; when/date: field
// candidates for sorting; rows: the fields shown, in order.
const KINDS = [
  { kind: "k-reg",     coll: "healthRegistrations",       title: "Registration",          mod: ["Registration", "/victim-registration/322"], match: "regId" },
  { kind: "k-triage",  coll: "healthTriage",              title: "Triage",                mod: ["Triage", "/triage/323"],                    match: "regId" },
  { kind: "k-nurse",   coll: "healthNurseConsultations",  title: "Nurse consultation",    mod: ["Nurse Consultation", "/nurse-consultation/324"], match: "regId" },
  { kind: "k-doctor",  coll: "healthDoctorConsultations", title: "Doctor consultation",   mod: ["Doctor Consultation", "/doctor-consultation/325"], match: "regId" },
  { kind: "k-rx",      coll: "healthPrescriptions",       title: "Prescription",          mod: ["Pharmacy", "/pharmacy/326"],                match: "regId" },
  { kind: "k-treatment", coll: "healthTreatmentOrders",   title: "Treatment / procedure", mod: ["Treatment / Procedures", "/treatment-procedures/327"], match: "regId" },
  { kind: "k-lab",     coll: "healthLabRequests",         title: "Laboratory request",    mod: ["Laboratory", "/laboratory/360"],            match: "patientId" },
  { kind: "k-imaging", coll: "healthImagingRequests",     title: "Imaging request",       mod: ["Radiology / Imaging", "/radiology/358"],    match: "patientId" },
  { kind: "k-adm",     coll: "healthAdmissions",          title: "Admission",             mod: ["Patient Admission", "/patient-admission/340"], match: "patientId" },
  { kind: "k-dis",     coll: "healthDischarges",          title: "Discharge",             mod: ["Patient Discharge", "/patient-discharge/350"], match: "patientId" },
  { kind: "k-ref",     coll: "healthReferrals",           title: "Referral",              mod: ["Referrals", "/referrals/397"],              match: "regId" },
  { kind: "k-tele",    coll: "healthTelemedicine",        title: "Telemedicine",          mod: ["Telemedicine", "/telemedicine/402"],        match: "regId" },
  { kind: "k-birth",   coll: "healthBirths",              title: "Birth (this facility)", mod: ["Birth Certificates", "/birth-certificates/403"], match: "regId" },
  { kind: "k-death",   coll: "healthDeaths",              title: "Death (this facility)", mod: ["Death Certificates", "/death-certificates/404"], match: "regId" },
  { kind: "k-money",   coll: "healthBilling",             title: "Bill",                  mod: ["Hospital Billing", "/hospital-billing/363"], match: "patientId" },
  { kind: "k-money",   coll: "healthPayments",            title: "Payment",               mod: ["Payments & Financial", "/hospital-payments/364"], match: "patientId" },
  { kind: "k-money",   coll: "healthInsurance",           title: "Insurance claim",       mod: ["Health Insurance", "/health-insurance/365"], match: "patientId" },
  { kind: "k-doc",     coll: "healthPatientDocs",         title: "Document / scan",       mod: ["Patient File", "/patient-file/396"],  match: "regId" }
];

// per collection: which fields to show and their labels (candidates in order)
const SHOW = {
  healthRegistrations: [["incidentType", "Incident type"], ["incidentDescription", "Description"], ["department", "Department"], ["priority", "Priority"], ["referral", "Referred in"], ["referredBy", "From facility"]],
  healthTriage: [["complaint", "Complaint"], ["condition", "Condition"], ["level", "Level"], ["priority", "Priority"], ["notes", "Notes"], ["vitals", "Vitals"]],
  healthNurseConsultations: [["complaint", "Complaint"], ["vitals", "Vitals"], ["temperature", "Temperature"], ["bp", "Blood pressure"], ["pulse", "Pulse"], ["weight", "Weight"], ["notes", "Notes"], ["status", "Status"]],
  healthDoctorConsultations: [["presentingComplaint", "Complaint"], ["physicalExam", "Physical examination"], ["dxPrimary", "Diagnosis"], ["dxPrimaryCode", "ICD-10 code"], ["dxAdditional", "Additional diagnoses"], ["treatmentPlan", "Treatment plan"], ["status", "Status"], ["doctor", "Doctor"]],
  healthPrescriptions: [["medicine", "Medicine"], ["dose", "Dose"], ["frequency", "Frequency"], ["duration", "Duration"], ["status", "Status"], ["priority", "Priority"]],
  healthTreatmentOrders: [["order", "Order"], ["status", "Status"], ["performed", "Performed"], ["outcome", "Outcome"], ["worker", "By"], ["notes", "Notes"]],
  healthLabRequests: [["requestNumber", "Request no."], ["status", "Status"], ["specimen", "Specimen"], ["tests", "Tests"], ["clinicalInfo", "Clinical info"], ["priority", "Priority"]],
  healthImagingRequests: [["requestNumber", "Request no."], ["status", "Status"], ["scan", "Scan"], ["part", "Part"], ["clinicalInfo", "Clinical info"], ["priority", "Priority"]],
  healthAdmissions: [["admissionNumber", "Admission no."], ["admissionType", "Type"], ["admissionDate", "Date"], ["doctorName", "Doctor"], ["clinicalNotes", "Notes"], ["status", "Status"]],
  healthDischarges: [["dischargeNumber", "Discharge no."], ["dischargeDate", "Date"], ["dischargeType", "Type"], ["wardCode", "Ward"], ["bedNumber", "Bed"], ["outcome", "Outcome"], ["status", "Status"]],
  healthReferrals: [["type", "Direction"], ["facility", "Facility"], ["department", "Department"], ["reason", "Reason"], ["priority", "Priority"], ["status", "Status"], ["notes", "Notes"]],
  healthBilling: [["ref", "Ref"], ["services", "Services"], ["amount", "Amount (TSh)"], ["discount", "Discount"], ["status", "Status"]],
  healthPayments: [["ref", "Ref"], ["invoiceNo", "Invoice"], ["amount", "Amount (TSh)"], ["method", "Method"], ["kind", "Kind"], ["status", "Status"]],
  healthInsurance: [["ref", "Ref"], ["insurer", "Insurer"], ["claimAmount", "Claim (TSh)"], ["status", "Status"]],
  healthTelemedicine: [["reason", "Reason"], ["scheduledAt", "Scheduled"], ["doctor", "Doctor"], ["status", "Status"], ["notes", "Notes"]],
  healthBirths: [["childName", "Child"], ["sex", "Sex"], ["dob", "Born"], ["deliveryType", "Delivery"], ["weightGrams", "Weight (g)"], ["ref", "Register ref"]],
  healthDeaths: [["deceasedName", "Deceased"], ["dod", "Died"], ["causeText", "Cause"], ["icd10Code", "ICD-10"], ["ref", "Register ref"]],
  healthPatientDocs: [["name", "File"], ["mime", "Type"], ["size", "Size (bytes)"], ["note", "Note"]]
};

const WHEN = ["savedAt", "admissionDate", "dischargeDate", "createdAt", "date", "at"];

function whenOf(r) {
  for (const f of WHEN) {
    const v = r[f];
    if (!v) continue;
    if (v && v.__jts) return new Date(v.__jts).toISOString();
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.length === 10 ? s + "T12:00:00" : s;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return "";
}
const fmtWhen = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleString("en-GB",
    { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

function rowHTML(f, label, v) {
  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "";
  if (typeof v === "object") {
    if (v.__jts) v = new Date(v.__jts).toLocaleString("en-GB");
    else if (f === "tests") {
      const items = v.map((t) => esc((t && t.name) || "") +
        ((t && t.result) ? " = " + esc(t.result) + (t.unit ? " " + esc(t.unit) : "") : " (" + esc((t && t.status) || "pending") + ")"));
      v = items.filter(Boolean).join("; ");
      if (!v) return "";
    } else if (f === "specimen") {
      v = [v.type, v.status].filter(Boolean).map(esc).join(" \u00b7 ");
      if (!v) return "";
    } else if (f === "vitals") {
      const bits = Object.entries(v).filter(([, x]) => x != null && x !== "").map(([k, x]) => k + " " + esc(x));
      v = bits.join(", ");
      if (!v) return "";
    } else {
      try { v = JSON.stringify(v); } catch (e) { v = String(v); }
      if (!v || v === "{}" || v === "[]") return "";
    }
  }
  return '<div class="row"><b>' + esc(label) + ":</b> " + esc(String(v).slice(0, 300)) + "</div>";
}

function dispensedRow(r) {
  const d = r.dispensed;
  if (!d || !d.what) return "";
  const alt = r.alt && r.alt.medicine ? " · alternative proposed: " + esc(r.alt.medicine) : "";
  return '<div class="tl-sub"><div class="row"><b>Dispensed:</b> ' + esc(d.what) +
    " <span class='muted'>by " + esc(d.by || "—") + " at " + esc(fmtWhen(d.at)) + "</span>" + alt + "</div></div>";
}

// ---- live state -------------------------------------------------------------
let REGS = [];         // all registrations, for search + datalist
let openId = "";
let ENTRIES = [];      // gathered timeline entries for the open patient

onSnapshot(collection(db, "healthRegistrations"), (snap) => {
  REGS = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  $("#q-regids").innerHTML = REGS.slice(0, 400)
    .map((r) => '<option value="' + esc(r.regId || "") + '">' + esc(r.fullName || "unidentified") + "</option>").join("");
  if (openId) {
    const reg = REGS.find((r) => r.regId === openId);
    if (!reg) { closeFile("The record for " + openId + " is no longer on this account."); return; }
    renderHead(reg);
  }
}, (e) => herr("healthRegistrations", e));

function gather() {
  if (!openId) return;
  ENTRIES = [];
  for (const k of KINDS) {
    const rows = KBUF[k.coll] || [];
    rows.forEach((r) => {
      const id = String(r[k.match] || "");
      if (id !== openId) return;
      ENTRIES.push({ kind: k.kind, coll: k.coll, title: k.title, mod: k.mod, r, when: whenOf(r) });
    });
  }
  // pharmacy dispense movements are logged with the Registration ID as name
  (KBUF.stockChanges || []).forEach((m) => {
    if (String(m.name || "") !== openId) return;
    if (String(m.cause || "") !== "Pharmacy Dispense") return;
    ENTRIES.push({ kind: "k-stock", coll: "stockChanges", title: "Medicine dispensed (stock)", mod: ["Pharmacy Stock", "/pharmacy-stock/395"],
      r: m, when: String(m.at || "") });
  });
  ENTRIES.sort((a, b) => String(b.when || "").localeCompare(String(a.when || "")));
  renderTimeline();
}

const KBUF = Object.create(null);
for (const k of KINDS) {
  KBUF[k.coll] = KBUF[k.coll] || [];
  onSnapshot(collection(db, k.coll), (snap) => {
    KBUF[k.coll] = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }));
    gather();
  }, (e) => herr(k.coll, e));
}
onSnapshot(collection(db, "stockChanges"), (snap) => {
  KBUF.stockChanges = snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }));
  gather();
}, (e) => herr("stockChanges", e));

window.__p96.listeners = KINDS.length + 2;

// ---- search -----------------------------------------------------------------
function qerr(m) { const e = $("#q-err"); e.textContent = m || ""; e.hidden = !m; }

$("#q-regid").addEventListener("input", () => {
  const el = $("#q-regid");
  el.value = el.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 8);
  qerr("");
  const q = el.value.trim().toLowerCase();
  const box = $("#q-cands");
  if (!q || /^[0-9]{4}[A-Z]{4}$/.test(q)) { box.hidden = true; box.innerHTML = ""; return; }
  const hits = REGS.filter((r) =>
    String(r.fullName || "").toLowerCase().indexOf(q) >= 0 ||
    String(r.regId || "").toLowerCase().indexOf(q) >= 0).slice(0, 6);
  box.innerHTML = hits.map((r) =>
    '<button type="button" class="cand" data-id="' + esc(r.regId || "") + '"><span class="c-id">' +
    esc(r.regId || "—") + "</span><b>" + esc(r.fullName || "unidentified") + "</b>" +
    '<span class="muted">' + esc([r.sex, r.age ? r.age + " yrs" : ""].filter(Boolean).join(" \u00b7 ")) + "</span></button>").join("");
  box.hidden = hits.length === 0;
});

$("#q-cands").addEventListener("click", (e) => {
  const c = e.target.closest(".cand");
  if (!c) return;
  $("#q-regid").value = c.getAttribute("data-id");
  $("#q-cands").hidden = true;
  $("#q-find").click();
});

$("#q-regid").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("#q-find").click(); }
});

$("#q-find").addEventListener("click", () => {
  qerr("");
  const id = $("#q-regid").value.trim().toUpperCase();
  if (!id) return qerr("Enter the patient's Registration ID, or search by name.");
  if (!/^[0-9]{4}[A-Z]{4}$/.test(id)) {
    return qerr("The Registration ID is 4 digits and 4 letters, for example 4827ABCD.");
  }
  const reg = REGS.find((r) => r.regId === id);
  if (!reg) {
    return qerr("No patient with Registration ID " + id + " was found on this account. Register the patient first.");
  }
  openId = id;
  $("#start-empty").hidden = true;
  $("#file-zone").hidden = false;
  renderHead(reg);
  gather();
});

function closeFile(msg) {
  openId = "";
  $("#file-zone").hidden = true;
  $("#start-empty").hidden = false;
  if (msg) qerr(msg);
}

// ---- render -----------------------------------------------------------------
function renderHead(reg) {
  $("#p-regid").textContent = String(reg.regId || "");
  $("#p-who").textContent = reg.isUnidentified ? "Unidentified patient"
    : String(reg.fullName || "—");
  const badge = $("#p-badge");
  if (reg.isUnidentified) { badge.hidden = false; badge.className = "st st-mute"; badge.textContent = "Unidentified"; }
  else { badge.hidden = true; }
  const fields = [
    ["Age / sex", [reg.age ? reg.age + " yrs" : "", reg.sex].filter(Boolean).join(" \u00b7 ") || "—"],
    ["Phone", reg.phone || "—"],
    ["Address", reg.address || "—"],
    ["Emergency contact", reg.emergencyContact || "—"],
    ["Department", reg.department || "—"],
    ["Priority", reg.priority || "—"],
    ["Payment", reg.payment || "—"],
    ["Arrival", reg.arrivalAt || "—"],
    ["Incident", reg.incidentType || "—"],
    ["Referral in", reg.referral === "Yes" ? (reg.referredBy || "yes") : "no"],
    ["Registered", fmtWhen(whenOf(reg)) || "—"],
    ["Staff", reg.staff || "—"]
  ];
  $("#p-reg").innerHTML = fields.map((kv) =>
    '<div class="kv"><span class="k">' + esc(kv[0]) + '</span> <span class="v">' + esc(String(kv[1])) + "</span></div>").join("");
  $("#fhir-export").hidden = false;
}

function renderTimeline() {
  const box = $("#timeline");
  if (!openId) return;
  if (!ENTRIES.length) {
    box.innerHTML = '<div class="tl-empty">No records yet for this patient \u2014 visits, prescriptions, ' +
      "lab work, money and dispensed medicines will appear here as they happen.</div>";
    return;
  }
  // counters
  const count = (coll) => ENTRIES.filter((e) => e.coll === coll).length;
  $("#c-visits").textContent = String(count("healthTriage") + count("healthNurseConsultations") + count("healthDoctorConsultations"));
  $("#c-rx").textContent = String(count("healthPrescriptions"));
  $("#c-lab").textContent = String(count("healthLabRequests") + count("healthImagingRequests"));
  $("#c-adm").textContent = String(count("healthAdmissions"));
  const billed = ENTRIES.filter((e) => e.coll === "healthBilling").reduce((s, e) => s + num(e.r.amount) - num(e.r.discount), 0);
  const paid = ENTRIES.filter((e) => e.coll === "healthPayments").reduce((s, e) => s + num(e.r.amount), 0);
  $("#c-money").textContent = money(billed) + " / " + money(paid);

  box.innerHTML = ENTRIES.map((e) => {
    const fields = SHOW[e.coll] || [];
    let body = fields.map((f) => rowHTML(f[0], f[1], e.r[f[0]])).join("");
    if (e.coll === "healthPrescriptions") body += dispensedRow(e.r);
    if (e.coll === "healthPatientDocs" && e.r.__id) {
      body += '<div class="row doc-actions">' +
        '<button type="button" class="mini-btn doc-dl" data-id="' + esc(e.r.__id) + '">Download</button>' +
        '<button type="button" class="mini-btn doc-del" data-id="' + esc(e.r.__id) + '">Remove</button></div>';
    }
    if (!body) body = '<div class="row muted">Saved without extra details.</div>';
    return '<div class="tl-item ' + e.kind + '">' +
      '<div class="tl-when">' + esc(fmtWhen(e.when) || "—") + "</div>" +
      '<div class="tl-head"><span class="tl-title">' + esc(e.title) + "</span>" +
      '<a class="tl-mod" href="' + esc(e.mod[1]) + '">' + esc(e.mod[0]) + " &rarr;</a></div>" +
      '<div class="tl-body">' + body + "</div>" +
      "</div>";
  }).join("") +
  '<p class="mini-note">The timeline gathers live from every module on this device. ' +
  count("stockChanges") + " medicine movement(s) recorded against this Registration ID in Pharmacy Stock.</p>";
}

// ---- document attachments -----------------------------------------------------
// Small documents and scans live inside the record itself (base64 in
// Firestore), bound to the single Registration ID - nothing leaves the
// account, no storage bucket needed. The timeline below lists them with
// Download / Remove.
$("#doc-save").addEventListener("click", async () => {
  const err = $("#doc-err"), ok = $("#doc-ok");
  err.hidden = true; ok.hidden = true;
  if (!openId) { err.textContent = "Open a patient's file first."; err.hidden = false; return; }
  const f = ($("#doc-file").files || [])[0];
  if (!f) { err.textContent = "Choose a file first."; err.hidden = false; return; }
  if (f.size > 300 * 1024) {
    err.textContent = "The file is " + Math.round(f.size / 1024) + " KB - keep it under 300 KB (compress it or scan at a lower resolution).";
    err.hidden = false;
    return;
  }
  const btn = $("#doc-save");
  btn.disabled = true;
  try {
    const data = await new Promise((res, rej) => {
      const rd = new FileReader();
      rd.onload = () => res(String(rd.result || ""));
      rd.onerror = () => rej(new Error("the file could not be read"));
      rd.readAsDataURL(f);
    });
    await addDoc(collection(db, "healthPatientDocs"), {
      regId: openId,
      name: f.name,
      mime: f.type || "application/octet-stream",
      size: f.size,
      note: String($("#doc-note").value || "").trim(),
      data,
      by: String(localStorage.getItem("jamaliIdentityCache") || "unknown"),
      savedAt: new Date().toISOString()
    });
    ok.textContent = f.name + " attached to " + openId + " - it appears in the timeline below.";
    $("#doc-file").value = "";
    $("#doc-note").value = "";
  } catch (e) {
    err.textContent = "Attach failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally { btn.disabled = false; }
});

$("#timeline").addEventListener("click", async (e) => {
  const dl = e.target.closest(".doc-dl");
  if (dl) {
    const r = (KBUF.healthPatientDocs || []).find((x) => x.__id === dl.getAttribute("data-id"));
    if (!r || !r.data) return;
    const a = document.createElement("a");
    a.href = String(r.data);
    a.download = String(r.name || "attachment");
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); }, 800);
    return;
  }
  const del = e.target.closest(".doc-del");
  if (del) {
    const id = del.getAttribute("data-id");
    const r = (KBUF.healthPatientDocs || []).find((x) => x.__id === id);
    if (!r) return;
    if (!window.confirm("Remove '" + (r.name || "this attachment") + "' from the file of " + openId + "?")) return;
    try { await deleteDoc(doc(db, "healthPatientDocs", id)); }
    catch (e2) { window.alert("Remove failed: " + ((e2 && (e2.code || e2.message)) || e2)); }
  }
});

// ---- the FHIR R4 export ------------------------------------------------------
// Builds a FHIR R4 Bundle (JSON) out of the open patient's timeline: a
// Patient resource, one Encounter per doctor consultation, Conditions with
// the ICD-10 coding, MedicationRequests from the prescriptions and
// Observations from the recorded vital signs. Downloaded to this device -
// nothing is sent anywhere. interop-ready for systems that speak FHIR.
const icdSystem = "http://hl7.org/fhir/sid/icd-10";
function fhirEntries() {
  const entries = [];
  const add = (resource) => entries.push({ resource });
  const reg = REGS.find((r) => r.regId === openId) || {};
  const iso = (v) => String(v || "").slice(0, 10) || undefined;
  add({
    resourceType: "Patient",
    id: String(openId),
    identifier: [{ system: "urn:jamali:regId", value: String(openId) }],
    name: reg.isUnidentified ? undefined : [{ text: String(reg.fullName || "") }],
    gender: String(reg.sex || "").toLowerCase() || undefined,
    contact: (reg.phone || reg.emergencyContact) ?
      [{ telecom: [{ system: "phone", value: String(reg.phone || reg.emergencyContact) }] }] : undefined
  });
  for (const e of ENTRIES) {
    const r = e.r;
    if (e.coll === "healthDoctorConsultations") {
      add({
        resourceType: "Encounter",
        identifier: [{ system: "urn:jamali:consultation", value: String(r.consultationId || e.coll) }],
        status: String(r.status) === "completed" ? "finished" : "in-progress",
        class: { code: "AMB", display: "ambulatory" },
        subject: { reference: "Patient/" + openId },
        period: { start: iso(r.savedAt) },
        participant: [{ individual: { display: String(r.doctor || "doctor") } }]
      });
      if (String(r.dxPrimary || "")) {
        add({
          resourceType: "Condition",
          subject: { reference: "Patient/" + openId },
          recordedDate: iso(r.savedAt),
          code: {
            coding: String(r.dxPrimaryCode || "") ?
              [{ system: icdSystem, code: String(r.dxPrimaryCode), display: String(r.dxPrimary) }] : undefined,
            text: String(r.dxPrimary)
          }
        });
      }
      const V = [["vTemp", "Body temperature", "degC"], ["vPulse", "Heart rate", "/min"],
        ["vRR", "Respiratory rate", "/min"], ["vSpO2", "Oxygen saturation", "%"]];
      for (const [k, label, unit] of V) {
        if (r[k] === "" || r[k] == null) continue;
        add({
          resourceType: "Observation",
          status: "final",
          category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
          code: { text: label },
          subject: { reference: "Patient/" + openId },
          effectiveDateTime: String(r.savedAt || ""),
          valueQuantity: { value: num(r[k]), unit }
        });
      }
      if (String(r.vBP || "")) {
        add({
          resourceType: "Observation",
          status: "final",
          category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
          code: { text: "Blood pressure" },
          subject: { reference: "Patient/" + openId },
          effectiveDateTime: String(r.savedAt || ""),
          component: [
            { code: { text: "Systolic" }, valueQuantity: { value: num(String(r.vBP).split("/")[0]), unit: "mmHg" } },
            { code: { text: "Diastolic" }, valueQuantity: { value: num(String(r.vBP).split("/")[1]), unit: "mmHg" } }
          ]
        });
      }
    } else if (e.coll === "healthPrescriptions" && String(r.medicine || "")) {
      add({
        resourceType: "MedicationRequest",
        status: String(r.status) === "dispensed" ? "completed" : "active",
        intent: "order",
        subject: { reference: "Patient/" + openId },
        medicationCodeableConcept: { text: String(r.medicine) },
        authoredOn: iso(r.savedAt),
        dosageInstruction: [{ text: [r.dose, r.frequency, r.duration].filter(Boolean).join(" · ") }]
      });
    } else if (e.coll === "healthPatientDocs" && String(r.name || "")) {
      add({
        resourceType: "DocumentReference",
        status: "current",
        subject: { reference: "Patient/" + openId },
        description: String(r.note || r.name),
        date: String(r.savedAt || "") || undefined,
        content: [{
          attachment: {
            contentType: String(r.mime || "application/octet-stream"),
            title: String(r.name),
            data: String(r.data || "").split(",")[1] || undefined
          }
        }]
      });
    }
  }
  return entries;
}
$("#fhir-export").addEventListener("click", () => {
  const bundle = {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: fhirEntries()
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/fhir+json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jamali-fhir-" + openId + "-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
});

bootDone();

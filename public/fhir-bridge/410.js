
import { requireAuth, db, collection, getDocs, watchHealthPatients, patientById } from "/sidebar.js";

window.__p10.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p10) window.__p10.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
}
function bootDone() {
  if (window.__p10) window.__p10.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p10.auth = true; }
catch (e) { herr("the sign-in check", e); throw e; }

const REG_SYSTEM = "urn:jamali:registration-id";
const ICD_SYSTEM = "http://hl7.org/fhir/sid/icd-10";
// LOINC for the everyday tests (code -> LOINC code, display)
const LOINC = {
  "haemoglobin": ["718-7", "Hemoglobin [Mass/volume] in Blood"],
  "hemoglobin": ["718-7", "Hemoglobin [Mass/volume] in Blood"],
  "hb": ["718-7", "Hemoglobin [Mass/volume] in Blood"],
  "wbc": ["6690-2", "Leukocytes [#/volume] in Blood"],
  "white blood cells": ["6690-2", "Leukocytes [#/volume] in Blood"],
  "platelets": ["777-3", "Platelets [#/volume] in Blood"],
  "glucose": ["2345-7", "Glucose [Mass/volume] in Serum or Plasma"],
  "creatinine": ["2160-0", "Creatinine [Mass/volume] in Serum or Plasma"],
  "urea": ["3094-0", "Urea nitrogen [Mass/volume] in Serum or Plasma"],
  "alt": ["1742-6", "Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma"],
  "sgpt": ["1742-6", "Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma"],
  "ast": ["1920-8", "Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma"]
};
const loincOf = (name) => LOINC[String(name || "").toLowerCase().replace(/[^a-z ]/g, "").trim()] || null;

function readAll(collNames) {
  const out = {};
  const jobs = collNames.map(async (name) => {
    try {
      const snap = await getDocs(collection(db, name));
      out[name] = snap.docs.map((d) => d.data());
    } catch (e) {
      out[name] = [];
      herr(name, e);
    }
  });
  return Promise.all(jobs).then(() => out);
}

// ---- the FHIR R4 builders ----------------------------------------------------------
function fhirPatient(p) {
  const name = String(p.fullName || "").trim();
  const bits = name ? name.split(/\s+/) : [];
  const res = {
    resourceType: "Patient",
    id: String(p.regId || "").trim() || "unknown",
    identifier: [{ system: REG_SYSTEM, value: String(p.regId || "") }],
    active: true,
    gender: /^f/i.test(String(p.sex || "")) ? "female"
      : /^m/i.test(String(p.sex || "")) ? "male" : "unknown"
  };
  if (bits.length) res.name = [{ text: name, family: bits[bits.length - 1],
    given: bits.slice(0, -1) }];
  if (p.age !== "" && p.age != null) {
    const a = Number(p.age);
    if (isFinite(a) && a >= 0 && a < 130)
      res.birthDate = String(new Date().getFullYear() - Math.floor(a)) + "-01-01";
  }
  if (p.phone) res.telecom = [{ system: "phone", value: String(p.phone) }];
  return res;
}
function fhirEncounter(c, p) {
  const when = String(c.savedAt || c.startedAt || "").slice(0, 10);
  return {
    resourceType: "Encounter",
    id: "enc-" + String(c.ref || c.__id || "").toLowerCase().replace(/[^a-z0-9-]/g, ""),
    status: "finished",
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
    subject: { reference: "Patient/" + String(p.regId || ""), display: String(p.fullName || "") },
    period: when ? { start: when } : undefined,
    reasonCode: c.presentingComplaint ? [{ text: String(c.presentingComplaint) }] : undefined
  };
}
function fhirCondition(c, p) {
  const code = String(c.dxPrimaryCode || "").trim();
  return {
    resourceType: "Condition",
    id: "cond-" + String(c.ref || c.__id || "").toLowerCase().replace(/[^a-z0-9-]/g, ""),
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
    subject: { reference: "Patient/" + String(p.regId || ""), display: String(p.fullName || "") },
    code: {
      coding: code ? [{ system: ICD_SYSTEM, code, display: String(c.dxPrimary || "") }] : undefined,
      text: String(c.dxPrimary || "unspecified")
    },
    recordedDate: String(c.savedAt || "").slice(0, 10) || undefined,
    note: c.dxNotes ? [{ text: String(c.dxNotes) }] : undefined
  };
}
function fhirObservation(req, test, p) {
  const ln = loincOf(test.name);
  return {
    resourceType: "Observation",
    id: "obs-" + String(req.ref || req.__id || "").toLowerCase().replace(/[^a-z0-9-]/g, "") +
        "-" + String(test.name || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20),
    status: /critical/i.test(String(test.flag || "")) || test.critical ? "preliminary" : "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
    code: ln
      ? { coding: [{ system: "http://loinc.org", code: ln[0], display: ln[1] }], text: String(test.name || "") }
      : { text: String(test.name || "laboratory result") },
    subject: { reference: "Patient/" + String(p.regId || ""), display: String(p.fullName || "") },
    effectiveDateTime: String(test.enteredAt || req.completedAt || "").slice(0, 10) || undefined,
    valueString: String(test.result || ""),
    referenceRange: test.refRange ? [{ text: String(test.refRange) }] : undefined
  };
}
function fhirMedicationRequest(line, p) {
  const d = line.dispensed || {};
  return {
    resourceType: "MedicationRequest",
    id: "med-" + String(line.__id || "").toLowerCase().replace(/[^a-z0-9-]/g, ""),
    status: String(line.status) === "dispensed" ? "completed"
      : String(line.status || "").includes("alternative") ? "on-hold" : "active",
    intent: "order",
    medicationCodeableConcept: { text: String(d.what || line.medicine || "") },
    subject: { reference: "Patient/" + String(line.regId || ""), display: String(line.patientName || "") },
    authoredOn: String(line.createdAt || "").slice(0, 10) || undefined,
    dosageInstruction: [{
      text: [(line.dose || ""), (line.frequency || ""), (line.duration || ""), (line.notes || "")]
        .filter(Boolean).join(" - ") || "as directed"
    }],
    note: d.by ? [{ text: "dispensed " + (d.qty || "") + " unit(s) by " + d.by }] : undefined
  };
}

// ---- build -------------------------------------------------------------------------
let LAST = null;

$(".b-build").addEventListener("click", async () => {
  const err = $("#b-err"), ok = $("#b-ok");
  err.hidden = true; ok.hidden = true;
  const scope = $("#b-scope").value;
  const oneId = String($("#b-regid").value || "").trim();
  const months = Math.max(1, Number($("#b-months").value) || 3);
  if (scope === "one" && !oneId)
    { err.textContent = "Type the Registration ID for the one-patient scope."; err.hidden = false; return; }
  const btn = $(".b-build");
  btn.disabled = true; btn.textContent = "Reading records\u2026";
  try {
    const D = await readAll(["healthRegistrations", "healthDoctorConsultations",
      "healthLabRequests", "healthPrescriptions"]);
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const cut = since.toISOString().slice(0, 10);
    const atOrLater = (r) => String(r.savedAt || r.createdAt || r.completedAt || "").slice(0, 10) >= cut;

    let regs = (D.healthRegistrations || []).filter((p) => String(p.regId || "").trim());
    if (scope === "one") {
      const p = patientById(oneId);
      if (!p) throw new Error(oneId + " is not a registered Registration ID on this device.");
      regs = [p];
      const want = String(oneId).toLowerCase();
      const byReg = (r) => String(r.regId || "").toLowerCase() === want;
      var consults = (D.healthDoctorConsultations || []).filter(byReg).filter(atOrLater);
      var labs = (D.healthLabRequests || []).filter(byReg).filter(atOrLater);
      var rx = (D.healthPrescriptions || []).filter(byReg).filter(atOrLater);
    } else {
      var consults = (D.healthDoctorConsultations || []).filter(atOrLater);
      var labs = (D.healthLabRequests || []).filter(atOrLater);
      var rx = (D.healthPrescriptions || []).filter(atOrLater);
    }

    const entries = [];
    const pushRes = (res) => {
      if (!res) return;
      entries.push({ fullUrl: res.resourceType + "/" + res.id, resource: res });
    };
    const regIds = new Set(regs.map((p) => String(p.regId)));
    for (const p of regs) pushRes(fhirPatient(p));
    for (const c of consults) {
      const p = { regId: c.regId, fullName: c.patientName || "" };
      if (!regIds.has(String(c.regId || ""))) continue;
      pushRes(fhirEncounter(c, p));
      if (c.dxPrimary) pushRes(fhirCondition(c, p));
    }
    for (const r of labs) {
      if (!regIds.has(String(r.regId || ""))) continue;
      const p = { regId: r.regId, fullName: r.patientName || "" };
      for (const t of (r.tests || [])) {
        if (String(t.status) === "Completed" && String(t.result || "").trim())
          pushRes(fhirObservation(r, t, p));
      }
    }
    for (const line of rx) {
      if (!regIds.has(String(line.regId || ""))) continue;
      const p = patientById(line.regId);
      pushRes(fhirMedicationRequest(line, p || { fullName: line.patientName || "" }));
    }

    LAST = {
      resourceType: "Bundle", id: "jamali-bundle-" + new Date().toISOString().slice(0, 19).replace(/[-:T]/g, ""),
      type: "collection", timestamp: new Date().toISOString(),
      meta: { tag: [{ system: "urn:jamali:origin", code: "page-410" }] },
      entry: entries
    };
    $("#b-res").hidden = false;
    $("#b-res").innerHTML = entries.length
      ? "<b>Built:</b> " + entries.length + " resources - " +
        ["Patient", "Encounter", "Condition", "Observation", "MedicationRequest"].map((t) =>
          t + " \u00d7 " + entries.filter((e) => e.resource.resourceType === t).length).join(", ")
      : "No records in that scope on this device.";
    $(".b-save").disabled = !entries.length;
    $(".u-go").disabled = !entries.length;
    ok.textContent = "Bundle ready - download it as JSON, or POST it straight to a FHIR endpoint.";
    ok.hidden = false;
  } catch (e) {
    err.textContent = "Build failed: " + ((e && (e.message || e.code)) || e);
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Build the Bundle";
  }
});

$("#b-scope").addEventListener("change", () => {
  $("#b-regid").disabled = $("#b-scope").value !== "one";
});

$(".b-save").addEventListener("click", () => {
  if (!LAST) return;
  const blob = new Blob([JSON.stringify(LAST, null, 2)], { type: "application/fhir+json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = LAST.id + ".json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
});

// ---- push ----------------------------------------------------------------------------
$(".u-go").addEventListener("click", async () => {
  const err = $("#u-err"), ok = $("#u-ok");
  err.hidden = true; ok.hidden = true;
  const url = String($("#u-url").value || "").trim();
  if (!LAST) { err.textContent = "Build the Bundle first."; err.hidden = false; return; }
  if (!/^https?:\/\//i.test(url)) { err.textContent = "Enter the endpoint URL (https://...)."; err.hidden = false; return; }
  const token = String($("#u-token").value || "").trim();
  const btn = $(".u-go");
  btn.disabled = true; btn.textContent = "POSTing\u2026";
  try {
    const headers = { "Content-Type": "application/fhir+json", "Accept": "application/fhir+json" };
    if (token) headers.Authorization = /^bearer /i.test(token) ? token : "Bearer " + token;
    const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(LAST) });
    const text = await resp.text();
    let summary = "HTTP " + resp.status + " " + resp.statusText;
    try {
      const j = JSON.parse(text);
      if (j.resourceType === "Bundle" && Array.isArray(j.entry)) {
        const kinds = {};
        for (const e of j.entry) {
          const st = ((e.response || {}).status || "?");
          const cls = String(st).charAt(0);
          kinds[cls] = (kinds[cls] || 0) + 1;
        }
        summary += " - the server answered with a response Bundle: " +
          Object.keys(kinds).sort().map((k) =>
            (k.charAt(0) === "2" ? "accepted" : k.charAt(0) === "4" ? "rejected" : "other") + " \u00d7 " + kinds[k]).join(", ");
      } else if (j.resourceType === "OperationOutcome") {
        const iss = (j.issue || []).map((i) => i.severity + ": " + (i.diagnostics || i.details && i.details.text || "")).join("; ");
        summary += " - OperationOutcome: " + (iss || "no details");
      }
    } catch (e) { summary += " - the body was not FHIR JSON (" + text.slice(0, 80) + "\u2026)"; }
    if (resp.ok) { ok.textContent = "Push done. " + summary; ok.hidden = false; }
    else { err.textContent = "The endpoint refused the push. " + summary; err.hidden = false; }
  } catch (e) {
    err.textContent = "Push failed: " + ((e && e.message) || e);
    err.hidden = false;
  } finally { btn.disabled = false; btn.textContent = "POST the Bundle"; }
});

// ---- validate -------------------------------------------------------------------------
function validateBundle(j) {
  if (!j || typeof j !== "object") return { ok: false, problems: ["not a JSON object"] };
  const problems = [];
  if (j.resourceType !== "Bundle") problems.push("resourceType is '" + j.resourceType + "', expected 'Bundle'");
  const entries = Array.isArray(j.entry) ? j.entry : [];
  const kinds = {};
  let patients = 0, ids = 0, known = 0;
  for (const e of entries) {
    const r = e.resource;
    if (!r || !r.resourceType) { problems.push("an entry without resource.resourceType"); continue; }
    kinds[r.resourceType] = (kinds[r.resourceType] || 0) + 1;
    if (r.resourceType === "Patient") {
      patients++;
      const idv = ((r.identifier || []).find((x) => x.system === REG_SYSTEM) || {}).value || "";
      if (idv) { ids++; if (patientById(idv)) known++; }
    }
  }
  return { ok: problems.length === 0, problems, kinds, entries: entries.length,
           patients, ids, known };
}

function paintValidate(j) {
  const v = validateBundle(j);
  const box = $("#v-res");
  box.hidden = false;
  if (!v.ok) {
    box.innerHTML = '<span class="res-bad">Not a valid FHIR Bundle</span> - ' +
      v.problems.map(esc).join("; ");
    return;
  }
  const kindsLine = Object.keys(v.kinds).sort().map((k) => k + " \u00d7 " + v.kinds[k]).join(", ") || "empty bundle";
  box.innerHTML = '<span class="res-good">Valid Bundle</span> \u2014 ' + v.entries +
    " entries: " + esc(kindsLine) +
    (v.patients ? " \u00b7 " + v.patients + " Patient resource(s), " + v.ids +
      " carrying a JAMALI Registration ID, " + v.known + " of them match this device's registry." : "");
}

$("#v-go").addEventListener("click", () => {
  const t = $("#v-paste").value.trim();
  const box = $("#v-res");
  if (!t) { box.hidden = false; box.innerHTML = '<span class="res-bad">Paste the JSON first.</span>'; return; }
  try { paintValidate(JSON.parse(t)); }
  catch (e) { box.hidden = false; box.innerHTML = '<span class="res-bad">Not valid JSON - ' + esc(e.message) + "</span>"; }
});
$("#v-file").addEventListener("change", () => {
  const f = ($("#v-file").files || [])[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    $("#v-paste").value = String(reader.result || "").slice(0, 500000);
    try { paintValidate(JSON.parse(String(reader.result || ""))); }
    catch (e) { $("#v-res").hidden = false;
      $("#v-res").innerHTML = '<span class="res-bad">Not valid JSON - ' + esc(e.message) + "</span>"; }
  };
  reader.readAsText(f);
});

bootDone();

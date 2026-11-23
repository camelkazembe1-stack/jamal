
import { requireAuth, db, collection, getDocs, addDoc, onSnapshot } from "/sidebar.js";

window.__p01.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p01) window.__p01.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
}
function bootDone() {
  if (window.__p01) window.__p01.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p01.auth = true; }
catch (e) { herr("the sign-in check", e); throw e; }

// ---- defaults ------------------------------------------------------------------
const now = new Date();
$("#b-month").value = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
try { $("#b-orgunit").value = localStorage.getItem("jamaliActiveBranchCode") || ""; } catch (e) { }

// branch codes for the datalist (a one-shot read is enough here)
(async () => {
  try {
    const snap = await getDocs(collection(db, "healthBranches"));
    const opts = snap.docs.map((d) => d.data())
      .filter((b) => String(b.status || "Active") !== "Closed")
      .map((b) => '<option value="' + esc(b.code || b.name || "") + '">').join("");
    $("#b-branches").innerHTML = opts;
    if (!$("#b-orgunit").value) {
      try {
        const act = localStorage.getItem("jamaliActiveBranchCode") || "";
        if (act) $("#b-orgunit").value = act;
      } catch (e) { }
    }
  } catch (e) { }
})();

// ---- the build ------------------------------------------------------------------
let LAST = null;   // { period, orgUnit, rows: [[dataElement, label, value]], byOrg }
let lastOrgUnit = "";

function countWhere(docs, month, pred) {
  return docs.filter((d) => String(d.createdAt || d.savedAt || d.at || "").slice(0, 7) === month &&
    (!pred || pred(d))).length;
}
function sumWhere(docs, month, field, pred) {
  return docs.filter((d) => String(d.createdAt || d.savedAt || d.at || "").slice(0, 7) === month &&
    (!pred || pred(d))).reduce((s, d) => s + num(d[field]), 0);
}

async function readAll(collNames) {
  const out = {};
  for (const name of collNames) {
    try {
      const snap = await getDocs(collection(db, name));
      out[name] = snap.docs.map((d) => d.data());
    } catch (e) {
      out[name] = [];
      herr(name, e);
    }
  }
  return out;
}

$(".b-build").addEventListener("click", async () => {
  const err = $("#b-err"), ok = $("#b-ok");
  err.hidden = true; ok.hidden = true;
  const month = String($("#b-month").value || "");
  const orgUnit = String($("#b-orgunit").value || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month))
    { err.textContent = "Pick the month first."; err.hidden = false; return; }
  if (!orgUnit)
    { err.textContent = "Fill the org unit code your DHIS2 uses for this facility."; err.hidden = false; return; }

  const btn = $(".b-build");
  btn.disabled = true; btn.textContent = "Counting\u2026";
  try {
    const D = await readAll(["healthRegistrations", "healthTriage",
      "healthDoctorConsultations", "healthPrescriptions", "healthLabRequests",
      "healthImagingRequests", "healthAdmissions", "healthDischarges",
      "healthDeaths", "healthBirths", "healthInsurance", "stockChanges",
      "healthTelemedicine", "healthReferrals"]);

    const regs = D.healthRegistrations || [];
    const period = month.replace("-", "");
    const rows = [];
    const push = (de, label, value) => rows.push([de, label, value]);

    // Attendances
    push("REG_TOTAL", "Attendances - total registrations", countWhere(regs, month));
    push("REG_MALE", "Attendances - male", countWhere(regs, month, (r) => String(r.sex) === "Male"));
    push("REG_FEMALE", "Attendances - female", countWhere(regs, month, (r) => String(r.sex) === "Female"));
    push("REG_UNIDENTIFIED", "Attendances - unidentified patients", countWhere(regs, month, (r) => r.isUnidentified));
    push("REG_REFERRED_IN", "Attendances - referred in", countWhere(regs, month, (r) => String(r.referral) === "Yes"));
    push("REG_CRITICAL", "Attendances - critical priority", countWhere(regs, month, (r) => String(r.priority).toLowerCase().indexOf("critic") >= 0));
    // Clinical work
    push("TRIAGE_DONE", "Triage assessments", countWhere(D.healthTriage || [], month));
    push("CONS_DOCTOR", "Doctor consultations completed", countWhere(D.healthDoctorConsultations || [], month, (c) => String(c.status) === "completed"));
    push("RX_ISSUED", "Prescriptions issued", countWhere(D.healthPrescriptions || [], month));
    push("LAB_REQUESTS", "Laboratory requests", countWhere(D.healthLabRequests || [], month));
    push("IMG_REQUESTS", "Imaging requests", countWhere(D.healthImagingRequests || [], month));
    // Inpatient
    push("ADM_NEW", "Admissions", countWhere(D.healthAdmissions || [], month));
    push("DIS_DONE", "Discharges", countWhere(D.healthDischarges || [], month));
    // Medicines
    const disp = (D.stockChanges || []).filter((m) => String(m.cause) === "Pharmacy Dispense" &&
      String(m.at || "").slice(0, 7) === month);
    push("RX_DISPENSED", "Dispenses at the pharmacy", disp.length);
    push("RX_UNITS", "Medicine units dispensed", disp.reduce((s, m) => s + num(m.units), 0));
    // Vital events & programmes
    push("BIRTH_NEW", "Births registered", countWhere(D.healthBirths || [], month));
    push("DEATH_NEW", "Deaths registered", countWhere(D.healthDeaths || [], month));
    push("REF_OUT_IN", "Referrals sent or received", countWhere(D.healthReferrals || [], month));
    push("TELE_DONE", "Telemedicine consultations completed", countWhere(D.healthTelemedicine || [], month, (t) => String(t.status) === "Completed"));
    // Insurance
    const paidClaims = (D.healthInsurance || []).filter((c) => String(c.status) === "Paid" &&
      String(c.createdAt || "").slice(0, 7) === month);
    push("CLAIMS_PAID", "Insurance claims paid by the fund", paidClaims.length);
    push("CLAIMS_AMOUNT", "Insurance money received (TSh)", paidClaims.reduce((s, c) => s + num(c.claimAmount), 0));

    LAST = { period, orgUnit, rows };
    lastOrgUnit = orgUnit;
    ok.textContent = period + " built for " + orgUnit + " - " + rows.length + " indicators. Download the CSV or JSON below.";
    ok.hidden = false;
    $(".b-csv").disabled = false;
    $(".b-json").disabled = false;
    renderTable();
  } catch (e) {
    err.textContent = "Build failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Build the month";
  }
});

const SECTIONS = [
  ["Attendances", /^REG_/],
  ["Clinical work", /^(TRIAGE_|CONS_|RX_ISSUED|LAB_|IMG_)/],
  ["Inpatient", /^(ADM_|DIS_)/],
  ["Medicines", /^RX_DISPENSED$|^RX_UNITS$/],
  ["Vital events & programmes", /^(BIRTH_|DEATH_|REF_OUT_IN|TELE_)/],
  ["Insurance", /^CLAIMS_/]
];

function renderTable() {
  if (!LAST) return;
  $("#t-card").hidden = false;
  $("#t-empty").hidden = true;
  $("#t-title").textContent = "The month at a glance - " + LAST.period + " \u00b7 " + LAST.orgUnit;
  let html = "";
  for (const [name, re] of SECTIONS) {
    const rows = LAST.rows.filter((r) => re.test(r[0]));
    if (!rows.length) continue;
    html += '<tr class="sec-row"><td colspan="2">' + esc(name) + "</td></tr>";
    html += rows.map((r) => '<td class="c-el"><span class="de">' + esc(r[0]) + "</span>" + esc(r[1]) + "</td>" +
      '<td class="c-amount">' + esc(String(r[2])) + "</td>").map((t) => "<tr>" + t + "</tr>").join("");
  }
  $("#t-body").innerHTML = html;
  $("#t-count").textContent = LAST.rows.length + " indicators ready for DHIS2 period " + LAST.period + ".";
}

function download(name, text, type) {
  const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}

$(".b-csv").addEventListener("click", () => {
  if (!LAST) return;
  const lines = ["dataElement,period,orgUnit,value"];
  for (const [de, , v] of LAST.rows) lines.push(de + "," + LAST.period + "," + lastOrgUnit + "," + v);
  download("jamali-dhis2-" + LAST.period + "-" + lastOrgUnit + ".csv", lines.join("\n"), "text/csv;charset=utf-8");
});
$(".b-json").addEventListener("click", () => {
  if (!LAST) return;
  const out = {
    period: LAST.period,
    orgUnit: lastOrgUnit,
    generatedAt: new Date().toISOString(),
    dataValues: LAST.rows.map(([de, label, v]) => ({ dataElement: de, label, value: v }))
  };
  download("jamali-dhis2-" + LAST.period + "-" + lastOrgUnit + ".json", JSON.stringify(out, null, 2), "application/json");
});

bootDone();

// ================= live DHIS2 push (the Web API bridge) =================
// The same indicator rows the CSV carries, POSTed straight to the DHIS2
// Web API: POST /api/dataValueSets with { dataSet?, period, orgUnit,
// dataValues: [{dataElement, period, orgUnit, value}] }. Credentials live
// only in this browser; every attempt is logged to healthDhis2Pushes.
const CFG_KEY = "jamaliDhis2Push";
const CFGS = ["d-url", "d-user", "d-ds"];
try {
  const saved = JSON.parse(localStorage.getItem(CFG_KEY) || "{}");
  for (const id of CFGS) { const el = document.getElementById(id); if (el && saved[id]) el.value = saved[id]; }
  if (saved["d-mode"]) document.getElementById("d-mode").value = saved["d-mode"];
} catch (e) {}

function saveDhisCfg() {
  try {
    const data = {};
    for (const id of CFGS) data[id] = document.getElementById(id).value.trim();
    data["d-mode"] = document.getElementById("d-mode").value;
    localStorage.setItem(CFG_KEY, JSON.stringify(data));
  } catch (e) {}
}
$("#d-savecfg").addEventListener("click", () => {
  saveDhisCfg();
  const ok = $("#d-ok");
  ok.hidden = false;
  ok.textContent = "Connection saved on this device (the token is NOT stored - fill it per push, or type it in again next time).";
});

function paintHist(rows) {
  const el = $("#d-hist");
  if (!rows.length) { el.textContent = ""; return; }
  el.innerHTML = "Recent pushes: " + rows.slice(0, 5).map((r) =>
    String(r.at || "").slice(0, 16).replace("T", " ") + " \u00b7 " + esc(String(r.period || "")) +
    " \u00b7 " + esc(String(r.outcome || ""))).join(" &nbsp;|&nbsp; ");
}
try {
  onSnapshot(collection(db, "healthDhis2Pushes"), (snap) => {
    paintHist(snap.docs.map((d) => d.data())
      .sort((a, b) => String(b.at || "").localeCompare(String(a.at || ""))));
  }, () => {});
  window.__p01.listeners = (window.__p01.listeners || 0) + 1;
} catch (e) {}

$("#d-push").addEventListener("click", async () => {
  const err = $("#d-err"), ok = $("#d-ok");
  err.hidden = true; ok.hidden = true;
  if (!LAST) { err.textContent = "Build the month first."; err.hidden = false; return; }
  const base = String($("#d-url").value || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) { err.textContent = "Fill the DHIS2 base URL (https://...)."; err.hidden = false; return; }
  const mode = document.getElementById("d-mode").value;
  const user = String($("#d-user").value || "").trim();
  const token = String($("#d-token").value || "").trim();
  if (!token) { err.textContent = "Fill the access token (or the API password)."; err.hidden = false; return; }
  const ds = String($("#d-ds").value || "").trim();
  const headers = { "Content-Type": "application/json" };
  if (mode === "basic") headers.Authorization = "Basic " + btoa(user + ":" + token);
  else headers.Authorization = "Bearer " + token;
  const payload = {
    period: LAST.period,
    orgUnit: LAST.orgUnit,
    dataValues: LAST.rows.map(([de, , v]) => Object.assign(
      { dataElement: de, period: LAST.period, orgUnit: LAST.orgUnit, value: String(v) },
      ds ? { dataSet: ds } : {}))
  };
  const btn = document.getElementById("d-push");
  btn.disabled = true; btn.textContent = "POSTing\u2026";
  const at = new Date().toISOString();
  let outcome = "";
  let okPush = false;
  try {
    const resp = await fetch(base + "/api/dataValueSets", { method: "POST", headers, body: JSON.stringify(payload) });
    const text = await resp.text();
    let extra = "";
    try {
      const j = JSON.parse(text);
      if (j && j.status) extra = " (import " + String(j.status) +
        (j.importCount ? ", " + j.importCount.imported + " imported, " + j.importCount.updated + " updated, " +
          j.importCount.ignored + " ignored" : "") + ")";
    } catch (e) {}
    outcome = "HTTP " + resp.status + extra;
    okPush = resp.ok;
    if (okPush) { ok.textContent = "Pushed " + payload.dataValues.length + " data values for " +
      LAST.period + " / " + LAST.orgUnit + " - " + outcome; ok.hidden = false; }
    else { err.textContent = "The server refused the push - " + outcome + ". " +
      "Check the data element codes against your DHIS2 instance."; err.hidden = false; }
  } catch (e) {
    outcome = "network error: " + ((e && e.message) || e);
    err.textContent = "Push failed - " + outcome +
      ". (A DHIS2 server must allow this browser's origin in its CORS settings for a direct push.)";
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "POST the data values";
    saveDhisCfg();
  }
  try {
    await addDoc(collection(db, "healthDhis2Pushes"), {
      at, period: LAST.period, orgUnit: LAST.orgUnit,
      values: payload.dataValues.length, mode,
      base, outcome, ok: okPush, savedAt: at
    });
  } catch (e) {}
});

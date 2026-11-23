
import { requireAuth, db, collection, doc, addDoc, deleteDoc, onSnapshot,
         ICD10_CODES, watchHealthPatients, patientById } from "/sidebar.js";

window.__p04.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p04) window.__p04.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
}
function bootDone() {
  if (window.__p04) window.__p04.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p04.auth = true; }
catch (e) { herr("the sign-in check", e); throw e; }

// the ICD-10 cause picker reads the shared catalogue
$("#f-icd10").innerHTML = ICD10_CODES.map(([code, title]) =>
  '<option value="' + esc(code) + '">' + esc(code + " \u2014 " + title) + "</option>").join("");

let recs = [];
const todayLocal = () => { const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const facilityName = () => {
  try { return localStorage.getItem("jamaliActiveBranchName") || "JAMALI Health Facility"; }
  catch (e) { return "JAMALI Health Facility"; }
};

onSnapshot(collection(db, "healthDeaths"), (snap) => {
  recs = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .sort((a, b) => String(b.dod || b.createdAt || "").localeCompare(String(a.dod || a.createdAt || "")));
  if (window.__p04) window.__p04.docs = recs.length;
  renderAll();
}, (e) => herr("healthDeaths", e));

onSnapshot(collection(db, "healthBranches"), (snap) => {
  const names = snap.docs.map((d) => d.data())
    .filter((b) => String(b.status || "Active") !== "Closed")
    .map((b) => String(b.name || ""));
  $("#f-branches").innerHTML = names.map((n) => '<option value="' + esc(n) + '">').join("");
}, () => { });

// ---- ONE PATIENT ID ----------------------------------------------------------
// The deceased's Registration ID comes from the one registry (page 322).
// The box offers the live list and shows the person under the box. A
// certificate may still be saved when the person was never registered
// here (the field is optional), but a wrong ID is flagged so it gets
// corrected before the paper is printed.
const who = (p) => (p && p.isUnidentified) ? "Unidentified" : ((p && p.fullName) || "Unnamed");
const regInput = $("#f-regid");
const regHint = $("#f-regid-hint");
const regList = $("#f-regids");
function regPaint() {
  if (!regInput || !regHint) return;
  const v = String(regInput.value || "").trim();
  if (!v) { regHint.textContent = ""; regHint.className = "f-hint"; return; }
  const p = patientById(v);
  if (p) { regHint.textContent = "\u2713 " + who(p); regHint.className = "f-hint ok"; }
  else { regHint.textContent = "\u2717 Not a registered Registration ID \u2014 pick from the list, or check the slip.";
         regHint.className = "f-hint bad"; }
}
watchHealthPatients((rows) => {
  if (regList) regList.innerHTML = rows.map((p) =>
    '<option value="' + esc(String(p.regId || "")) + '">' + esc(who(p)) + "</option>").join("");
  regPaint();
});
if (regInput) regInput.addEventListener("input", regPaint);

window.__p04.listeners = 2;

function renderAll() {
  const month = todayLocal().slice(0, 7);
  $("#d-total").textContent = String(recs.length);
  $("#d-month").textContent = String(recs.filter((r) => String(r.dod || "").slice(0, 7) === month ||
    String(r.createdAt || "").slice(0, 7) === month).length);
  $("#d-coded").textContent = String(recs.filter((r) => String(r.icd10Code || "").trim()).length);
  $("#d-infect").textContent = String(recs.filter((r) => /^A|^B/.test(String(r.icd10Code || "").trim())).length);

  const q = String(($("#rec-search") || {}).value || "").trim().toLowerCase();
  const rows = !q ? recs : recs.filter((r) =>
    ["ref", "deceasedName", "causeText", "icd10Code", "dod", "branch", "regId"].some((k) =>
      String(r[k] || "").toLowerCase().includes(q)));

  const has = rows.length > 0;
  $("#t-card").hidden = !has;
  $("#t-empty").hidden = has;
  $("#t-body").innerHTML = rows.map((r) =>
    "<tr>" +
    '<td><span class="ref">' + esc(r.ref || "") + "</span></td>" +
    '<td class="c-date">' + esc(String(r.dod || "").slice(0, 10) || "—") + "</td>" +
    '<td class="c-name">' + esc(r.deceasedName || "—") + "</td>" +
    "<td>" + (r.ageYears !== "" && r.ageYears != null ? esc(String(r.ageYears)) + " yrs" : "—") + "</td>" +
    "<td>" + esc(r.causeText || "—") + "</td>" +
    '<td class="c-icd">' + (String(r.icd10Code || "").trim() ? esc(r.icd10Code) : '<span class="d-none">not coded</span>') + "</td>" +
    '<td class="c-act"><button type="button" class="mini-btn" data-cert="' + esc(r.__id) + '">Certificate</button> ' +
    '<button type="button" class="row-del" data-del="' + esc(r.__id) + '">Delete</button></td>' +
    "</tr>").join("");
  $("#t-count").textContent = has
    ? rows.length + " record(s)" + (q ? " matching '" + q + "'" : "") + " in the register."
    : "";
}

$("#rec-search").addEventListener("input", renderAll);

// ---- register -----------------------------------------------------------------
const form = $(".s-form");
$(".s-toggle").addEventListener("click", () => {
  form.hidden = !form.hidden;
  $(".s-toggle").textContent = form.hidden ? "\uFF0B Register a death" : "\u00D7 Close";
});
$(".s-cancel").addEventListener("click", () => { form.hidden = true;
  $(".s-toggle").textContent = "\uFF0B Register a death"; });

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = $("#f-err"), ok = $("#f-ok");
  err.hidden = true; ok.hidden = true;
  const deceasedName = $("#f-name").value.trim();
  const dod = $("#f-dod").value;
  const causeText = $("#f-cause").value.trim();
  const attendant = $("#f-attendant").value.trim();
  if (!deceasedName || !dod || !causeText || !attendant) {
    err.textContent = "Fill in the name, date of death, cause in words and who certified it.";
    err.hidden = false; return;
  }
  const data = {
    deceasedName, sex: $("#f-sex").value,
    ageYears: $("#f-age").value === "" ? "" : Number($("#f-age").value),
    dod, icd10Code: $("#f-icd").value.trim(), causeText,
    regId: $("#f-regid").value.trim(),
    branch: $("#f-branch").value.trim() || facilityName(),
    attendant, notes: $("#f-notes").value.trim(),
    ref: "DEA-" + todayLocal().replace(/-/g, "").slice(2) + "-" + String((recs.length + 1) % 10000).padStart(4, "0"),
    createdAt: new Date().toISOString()
  };
  const btn = $(".s-save");
  btn.disabled = true; btn.textContent = "Saving\u2026";
  try {
    await addDoc(collection(db, "healthDeaths"), data);
    ok.textContent = "Saved as " + data.ref + (data.icd10Code ? " (ICD-10 " + data.icd10Code + ")" : "") + ".";
    form.reset(); form.hidden = true;
    $(".s-toggle").textContent = "\uFF0B Register a death";
  } catch (e) {
    err.textContent = "Save failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Save Death Record";
  }
});

// ---- certificate ---------------------------------------------------------------
function fmtDate(iso) {
  const s = String(iso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
const icdTitle = (code) => {
  const hit = ICD10_CODES.find(([c]) => c === String(code || "").trim());
  return hit ? hit[1] : "";
};

function openCert(r) {
  const rows = [
    ["Name of the deceased", r.deceasedName],
    ["Sex", r.sex],
    ["Age", r.ageYears !== "" && r.ageYears != null ? r.ageYears + " years" : ""],
    ["Date of death", fmtDate(r.dod)],
    ["Cause of death", r.causeText],
    ["ICD-10 code", r.icd10Code ? r.icd10Code + (icdTitle(r.icd10Code) ? " \u2014 " + icdTitle(r.icd10Code) : "") : "not coded"],
    ["Registration ID (this facility)", r.regId],
    ["Place of death", r.branch || facilityName()],
    ["Notes", r.notes]
  ];
  $("#cert-paper").innerHTML =
    '<div class="cert-head"><h2>Notification of Death</h2>' +
    '<div class="fac">' + esc(r.branch || facilityName()) + "</div>" +
    '<div class="sub">Issued under the facility\'s death register &middot; JAMALI health records</div></div>' +
    "<h3>This is to certify that the death recorded below occurred in this facility</h3>" +
    '<div class="cert-body">' +
    rows.filter((kv) => String(kv[1] || "") !== "").map((kv) =>
      '<div class="row"><span class="k">' + esc(kv[0]) + '</span><span class="v">' + esc(String(kv[1])) + "</span></div>"
    ).join("") + "</div>" +
    '<div class="cert-foot">' +
    '<div class="sig">' + esc(r.attendant || "Certifying doctor") + " &mdash; certifying doctor, name &amp; signature</div>" +
    '<div class="sig">Facility stamp</div></div>' +
    '<div class="cert-ref">Register reference ' + esc(r.ref || "") + " &middot; issued " +
    esc(fmtDate(r.createdAt)) + " &middot; supporting document for the civil death certificate application (RITA)</div>";
  $("#cert-zone").hidden = false;
  document.body.classList.add("printing");
}

$("#t-body").addEventListener("click", (e) => {
  const cert = e.target.closest("[data-cert]");
  if (cert) {
    const r = recs.find((x) => x.__id === cert.getAttribute("data-cert"));
    if (r) openCert(r);
    return;
  }
  const del = e.target.closest("[data-del]");
  if (del) {
    const r = recs.find((x) => x.__id === del.getAttribute("data-del"));
    if (!r) return;
    if (!window.confirm("Delete death record " + (r.ref || "") + " from the register?")) return;
    deleteDoc(doc(db, "healthDeaths", r.__id))
      .catch((e2) => window.alert("Delete failed: " + ((e2 && (e2.code || e2.message)) || e2)));
  }
});

$(".cert-close").addEventListener("click", () => {
  $("#cert-zone").hidden = true;
  document.body.classList.remove("printing");
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#cert-zone").hidden) {
    $("#cert-zone").hidden = true;
    document.body.classList.remove("printing");
  }
});
document.querySelector(".cert-close").textContent = "\u00D7 Close";

renderAll();
bootDone();

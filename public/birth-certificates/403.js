
import { requireAuth, db, collection, doc, addDoc, deleteDoc, onSnapshot,
         watchHealthPatients, patientById } from "/sidebar.js";

window.__p03.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p03) window.__p03.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
}
function bootDone() {
  if (window.__p03) window.__p03.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p03.auth = true; }
catch (e) { herr("the sign-in check", e); throw e; }

let recs = [];
let BRANCH_NAMES = [];
const todayLocal = () => { const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const facilityName = () => {
  try { return localStorage.getItem("jamaliActiveBranchName") || "JAMALI Health Facility"; }
  catch (e) { return "JAMALI Health Facility"; }
};

onSnapshot(collection(db, "healthBirths"), (snap) => {
  recs = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .sort((a, b) => String(b.dob || b.createdAt || "").localeCompare(String(a.dob || a.createdAt || "")));
  if (window.__p03) window.__p03.docs = recs.length;
  renderAll();
}, (e) => herr("healthBirths", e));

onSnapshot(collection(db, "healthBranches"), (snap) => {
  BRANCH_NAMES = snap.docs.map((d) => d.data())
    .filter((b) => String(b.status || "Active") !== "Closed")
    .map((b) => String(b.name || ""));
  $("#f-branches").innerHTML = BRANCH_NAMES.map((n) => '<option value="' + esc(n) + '">').join("");
}, () => { });

// ---- ONE PATIENT ID ----------------------------------------------------------
// Mother's Registration ID comes from the one registry (page 322). The box
// offers the live list and shows the mother under the box. A certificate
// may still be saved when the mother is not registered here (the field is
// optional), but a wrong ID is flagged so it gets corrected.
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
  else { regHint.textContent = "\u2717 Not a registered Registration ID \u2014 pick from the list, or register the mother on page 322.";
         regHint.className = "f-hint bad"; }
}
watchHealthPatients((rows) => {
  if (regList) regList.innerHTML = rows.map((p) =>
    '<option value="' + esc(String(p.regId || "")) + '">' + esc(who(p)) + "</option>").join("");
  regPaint();
});
if (regInput) regInput.addEventListener("input", regPaint);

window.__p03.listeners = 2;

function renderAll() {
  const month = todayLocal().slice(0, 7);
  $("#d-total").textContent = String(recs.length);
  $("#d-month").textContent = String(recs.filter((r) => String(r.dob || "").slice(0, 7) === month ||
    String(r.createdAt || "").slice(0, 7) === month).length);
  $("#d-normal").textContent = String(recs.filter((r) => String(r.deliveryType) === "Normal").length);
  $("#d-cs").textContent = String(recs.filter((r) => String(r.deliveryType) === "Caesarean").length);

  const q = String(($("#rec-search") || {}).value || "").trim().toLowerCase();
  const rows = !q ? recs : recs.filter((r) =>
    ["ref", "childName", "motherName", "fatherName", "dob", "branch", "regId"].some((k) =>
      String(r[k] || "").toLowerCase().includes(q)));

  const has = rows.length > 0;
  $("#t-card").hidden = !has;
  $("#t-empty").hidden = has;
  $("#t-body").innerHTML = rows.map((r) =>
    "<tr>" +
    '<td><span class="ref">' + esc(r.ref || "") + "</span></td>" +
    '<td class="c-date">' + esc(String(r.dob || "").slice(0, 10) || "—") + "</td>" +
    '<td class="c-name">' + esc(r.childName || "—") + "</td>" +
    "<td>" + esc(r.sex || "—") + "</td>" +
    "<td>" + esc(r.motherName || "—") + "</td>" +
    "<td>" + esc(r.deliveryType || "—") + "</td>" +
    '<td class="c-amount">' + (r.weightGrams ? esc(String(r.weightGrams)) + " g" : "—") + "</td>" +
    '<td class="c-act"><button type="button" class="mini-btn" data-cert="' + esc(r.__id) + '">Certificate</button> ' +
    '<button type="button" class="row-del" data-del="' + esc(r.__id) + '">Delete</button></td>' +
    "</tr>").join("");
  $("#t-count").textContent = has
    ? rows.length + " birth(s)" + (q ? " matching '" + q + "'" : "") + " in the register."
    : "";
}

$("#rec-search").addEventListener("input", renderAll);

// ---- register -----------------------------------------------------------------
const form = $(".s-form");
$(".s-toggle").addEventListener("click", () => {
  form.hidden = !form.hidden;
  $(".s-toggle").textContent = form.hidden ? "\uFF0B Register a birth" : "\u00D7 Close";
});
$(".s-cancel").addEventListener("click", () => { form.hidden = true;
  $(".s-toggle").textContent = "\uFF0B Register a birth"; });

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = $("#f-err"), ok = $("#f-ok");
  err.hidden = true; ok.hidden = true;
  const childName = $("#f-child").value.trim();
  const dob = $("#f-dob").value;
  const motherName = $("#f-mother").value.trim();
  const attendant = $("#f-attendant").value.trim();
  if (!childName || !dob || !motherName || !attendant) {
    err.textContent = "Fill in the child's name, date of birth, mother's name and the attendant.";
    err.hidden = false; return;
  }
  const data = {
    childName, sex: $("#f-sex").value, dob,
    timeOfBirth: $("#f-time").value,
    motherName, regId: $("#f-regid").value.trim(),
    fatherName: $("#f-father").value.trim(),
    weightGrams: Number($("#f-weight").value) || 0,
    deliveryType: $("#f-delivery").value,
    attendant, branch: $("#f-branch").value.trim() || facilityName(),
    complications: $("#f-comp").value.trim(),
    ref: "BIR-" + todayLocal().replace(/-/g, "").slice(2) + "-" + String((recs.length + 1) % 10000).padStart(4, "0"),
    createdAt: new Date().toISOString()
  };
  const btn = $(".s-save");
  btn.disabled = true; btn.textContent = "Saving\u2026";
  try {
    await addDoc(collection(db, "healthBirths"), data);
    ok.textContent = "Saved as " + data.ref + " - open the row's Certificate to print.";
    form.reset(); form.hidden = true;
    $(".s-toggle").textContent = "\uFF0B Register a birth";
  } catch (e) {
    err.textContent = "Save failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Save Birth Record";
  }
});

// ---- certificate ---------------------------------------------------------------
function fmtDate(iso) {
  const s = String(iso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function openCert(r) {
  const rows = [
    ["Child's name", r.childName],
    ["Sex", r.sex],
    ["Date of birth", fmtDate(r.dob) + (r.timeOfBirth ? " at " + r.timeOfBirth : "")],
    ["Birth weight", r.weightGrams ? r.weightGrams + " grams" : ""],
    ["Mother's name", r.motherName],
    ["Mother's Registration ID", r.regId],
    ["Father's name", r.fatherName],
    ["Type of delivery", r.deliveryType],
    ["Complications", r.complications || "none recorded"],
    ["Birth attendant", r.attendant],
    ["Place of birth", r.branch || facilityName()]
  ];
  $("#cert-paper").innerHTML =
    '<div class="cert-head"><h2>Notification of Birth</h2>' +
    '<div class="fac">' + esc(r.branch || facilityName()) + "</div>" +
    '<div class="sub">Issued under the facility\'s birth register &middot; JAMALI health records</div></div>' +
    "<h3>This is to certify that a child was born in this facility as recorded below</h3>" +
    '<div class="cert-body">' +
    rows.filter((kv) => String(kv[1] || "") !== "").map((kv) =>
      '<div class="row"><span class="k">' + esc(kv[0]) + '</span><span class="v">' + esc(String(kv[1])) + "</span></div>"
    ).join("") + "</div>" +
    '<div class="cert-foot">' +
    '<div class="sig">' + esc(r.attendant || "Birth attendant") + " &mdash; name &amp; signature</div>" +
    '<div class="sig">Facility stamp</div></div>' +
    '<div class="cert-ref">Register reference ' + esc(r.ref || "") + " &middot; issued " +
    esc(fmtDate(r.createdAt)) + " &middot; supporting document for the civil birth certificate application (RITA)</div>";
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
    if (!window.confirm("Delete birth record " + (r.ref || "") + " from the register?")) return;
    deleteDoc(doc(db, "healthBirths", r.__id))
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
window.addEventListener("afterprint", () => { /* the overlay stays for re-prints */ });
document.querySelector(".cert-close").textContent = "\u00D7 Close";
$(".cert-close").classList.add("mini-btn");

renderAll();
bootDone();

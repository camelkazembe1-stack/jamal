
import { requireAuth, db, collection, doc, addDoc, deleteDoc, onSnapshot } from "/sidebar.js";

window.__p09.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p09) window.__p09.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
}
function bootDone() {
  if (window.__p09) window.__p09.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p09.auth = true; }
catch (e) { herr("the sign-in check", e); throw e; }

let appr = [], trn = [];
const scoreCls = (n) => n >= 4.5 ? "st-clinical" : n >= 3.5 ? "st-support" : n >= 2.5 ? "st-warn" : "st-bad";

function renderDash() {
  $("#d-appr").textContent = String(appr.length);
  const avgs = appr.map((a) => num(a.overall)).filter((n) => n > 0);
  $("#d-avg").textContent = avgs.length
    ? (avgs.reduce((s, n) => s + n, 0) / avgs.length).toFixed(1)
    : "\u2014";
  $("#d-trn").textContent = String(trn.length);
  $("#d-cpd").textContent = String(trn.reduce((s, t) => s + num(t.points), 0));
}

function renderAppr() {
  const q = String(($("#a-search") || {}).value || "").trim().toLowerCase();
  const rows = !q ? appr : appr.filter((r) =>
    ["staff", "period", "reviewer", "strengths", "improve"].some((k) =>
      String(r[k] || "").toLowerCase().includes(q)));
  const has = rows.length > 0;
  $("#a-card").hidden = !has;
  $("#a-empty").hidden = has || appr.length > 0;
  $("#a-body").innerHTML = rows.map((r) => "<tr>" +
    '<td class="c-name">' + esc(r.staff || "—") + "</td>" +
    "<td>" + esc(r.period || "—") + "</td>" +
    "<td>" + num(r.q1) + "</td><td>" + num(r.q2) + "</td><td>" + num(r.q3) + "</td><td>" + num(r.q4) + "</td>" +
    '<td><span class="st ' + scoreCls(num(r.overall)) + '">' + num(r.overall).toFixed(1) + "</span></td>" +
    "<td>" + esc(r.reviewer || "—") + "</td>" +
    '<td><span class="st ' + (String(r.status) === "Acknowledged" ? "st-clinical" : "st-open") + '">' + esc(r.status || "Draft") + "</span></td>" +
    '<td class="c-act"><button type="button" class="row-del" data-id="' + esc(r.__id) + '">Delete</button></td></tr>').join("");
  $("#a-count").textContent = appr.length
    ? rows.length + " of " + appr.length + " appraisal(s)" + (q ? " matching '" + q + "'" : "") +
      (rows.length && rows[0].strengths ? "" : "") + "."
    : "";
}

function renderTrn() {
  const q = String(($("#tr-search") || {}).value || "").trim().toLowerCase();
  const rows = !q ? trn : trn.filter((r) =>
    ["staff", "course", "provider", "cert", "notes"].some((k) =>
      String(r[k] || "").toLowerCase().includes(q)));
  const has = rows.length > 0;
  $("#tr-card").hidden = !has;
  $("#tr-empty").hidden = has || trn.length > 0;
  $("#tr-body").innerHTML = rows.map((r) => "<tr>" +
    '<td class="c-name">' + esc(r.staff || "—") + "</td>" +
    "<td>" + esc(r.course || "—") + "</td>" +
    "<td>" + esc(r.provider || "—") + "</td>" +
    "<td>" + esc(String(r.start || "").slice(0, 10) || "—") + "</td>" +
    "<td>" + esc(String(r.end || "").slice(0, 10) || "—") + "</td>" +
    "<td><b>" + (num(r.points) || "—") + "</b></td>" +
    "<td>" + esc(r.cert || "—") + "</td>" +
    '<td><span class="st ' + (String(r.status) === "Completed" ? "st-clinical"
      : String(r.status) === "Dropped" ? "st-viewer" : "st-open") + '">' + esc(r.status || "Planned") + "</span></td>" +
    '<td class="c-act"><button type="button" class="row-del" data-trid="' + esc(r.__id) + '">Delete</button></td></tr>').join("");
  $("#tr-count").textContent = trn.length
    ? rows.length + " of " + trn.length + " training(s)" + (q ? " matching '" + q + "'" : "") + "."
    : "";
}

$("#a-search").addEventListener("input", renderAppr);
$("#tr-search").addEventListener("input", renderTrn);

try {
  onSnapshot(collection(db, "healthAppraisals"), (snap) => {
    appr = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
      .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
    if (window.__p09) window.__p09.docs = appr.length + trn.length;
    renderDash(); renderAppr();
  }, (e) => herr("healthAppraisals", e));
  window.__p09.listeners++;
} catch (e) {}
try {
  onSnapshot(collection(db, "healthTrainings"), (snap) => {
    trn = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
      .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
    renderDash(); renderTrn();
  }, (e) => herr("healthTrainings", e));
  window.__p09.listeners++;
} catch (e) {}

// ---- appraisal form -------------------------------------------------------------
const aForm = $(".s-form");
$(".s-toggle").addEventListener("click", () => {
  aForm.hidden = !aForm.hidden;
  $(".s-toggle").textContent = aForm.hidden ? "\uFF0B Record an appraisal" : "\u00D7 Close";
});
$(".s-cancel").addEventListener("click", () => { aForm.hidden = true;
  $(".s-toggle").textContent = "\uFF0B Record an appraisal"; });
aForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = $("#a-err"), ok = $("#a-ok");
  err.hidden = true; ok.hidden = true;
  const staff = $("#a-staff").value.trim();
  const period = $("#a-period").value.trim();
  const q1 = num($("#a-q1").value), q2 = num($("#a-q2").value),
        q3 = num($("#a-q3").value), q4 = num($("#a-q4").value);
  if (!staff || !period)
    { err.textContent = "Fill in the staff member and the period."; err.hidden = false; return; }
  for (const [lbl, v] of [["Clinical quality", q1], ["Teamwork", q2], ["Punctuality", q3], ["Patient care", q4]]) {
    if (v < 1 || v > 5) { err.textContent = lbl + " must be between 1 and 5."; err.hidden = false; return; }
  }
  const overall = Math.round(((q1 + q2 + q3 + q4) / 4) * 10) / 10;
  const data = {
    staff, period, q1, q2, q3, q4, overall,
    reviewer: $("#a-reviewer").value.trim(),
    status: $("#a-status").value,
    strengths: $("#a-strengths").value.trim(),
    improve: $("#a-improve").value.trim(),
    savedAt: new Date().toISOString()
  };
  const btn = $(".s-save");
  btn.disabled = true; btn.textContent = "Saving\u2026";
  try {
    await addDoc(collection(db, "healthAppraisals"), data);
    ok.textContent = staff + " \u00b7 " + period + " recorded - overall " + overall.toFixed(1) + "/5.";
    aForm.reset(); aForm.hidden = true;
    $(".s-toggle").textContent = "\uFF0B Record an appraisal";
  } catch (e) {
    err.textContent = "Save failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally { btn.disabled = false; btn.textContent = "Save Appraisal"; }
});

// ---- training form ----------------------------------------------------------------
const tForm = $(".t-form");
$(".t-toggle").addEventListener("click", () => {
  tForm.hidden = !tForm.hidden;
  $(".t-toggle").textContent = tForm.hidden ? "\uFF0B Record a training" : "\u00D7 Close";
});
$(".t-cancel").addEventListener("click", () => { tForm.hidden = true;
  $(".t-toggle").textContent = "\uFF0B Record a training"; });
tForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = $("#t-err"), ok = $("#t-ok");
  err.hidden = true; ok.hidden = true;
  const staff = $("#t-staff").value.trim();
  const course = $("#t-course").value.trim();
  if (!staff || !course)
    { err.textContent = "Fill in the staff member and the course."; err.hidden = false; return; }
  const data = {
    staff, course,
    provider: $("#t-provider").value.trim(),
    start: $("#t-start").value, end: $("#t-end").value,
    points: num($("#t-points").value),
    cert: $("#t-cert").value.trim(),
    status: $("#t-status").value,
    notes: $("#t-notes").value.trim(),
    savedAt: new Date().toISOString()
  };
  const btn = $(".t-save");
  btn.disabled = true; btn.textContent = "Saving\u2026";
  try {
    await addDoc(collection(db, "healthTrainings"), data);
    ok.textContent = course + " for " + staff + " recorded" + (data.points ? " - " + data.points + " CPD points." : ".");
    tForm.reset(); tForm.hidden = true;
    $(".t-toggle").textContent = "\uFF0B Record a training";
  } catch (e) {
    err.textContent = "Save failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally { btn.disabled = false; btn.textContent = "Save Training"; }
});

// ---- deletes -----------------------------------------------------------------------
$("#a-body").addEventListener("click", async (e) => {
  const del = e.target.closest(".row-del");
  if (!del) return;
  const r = appr.find((x) => x.__id === del.getAttribute("data-id"));
  if (!r) return;
  if (!window.confirm("Delete the appraisal for " + (r.staff || "?") + " (" + (r.period || "") + ")?")) return;
  try { await deleteDoc(doc(db, "healthAppraisals", r.__id)); }
  catch (e2) { window.alert("Delete failed: " + ((e2 && (e2.code || e2.message)) || e2)); }
});
$("#tr-body").addEventListener("click", async (e) => {
  const del = e.target.closest("[data-trid]");
  if (!del) return;
  const r = trn.find((x) => x.__id === del.getAttribute("data-trid"));
  if (!r) return;
  if (!window.confirm("Delete the training record for " + (r.staff || "?") + " (" + (r.course || "") + ")?")) return;
  try { await deleteDoc(doc(db, "healthTrainings", r.__id)); }
  catch (e2) { window.alert("Delete failed: " + ((e2 && (e2.code || e2.message)) || e2)); }
});

renderAppr();
renderTrn();
bootDone();

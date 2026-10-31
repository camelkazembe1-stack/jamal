









import { requireAuth, db, collection, doc, updateDoc, onSnapshot, arrayUnion } from "/firebase.js";

window.__p54 = { page: "363", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p54) window.__p54.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered — no lab requests yet. Create one on page 361.";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

const ST_CLASS = {
  "Requested": "st-requested", "Specimen Collected": "st-collected",
  "Testing in Progress": "st-testing", "Completed": "st-completed",
  "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

let reqs = [];
let current = null;

onSnapshot(collection(db, "healthLabRequests"), (snap) => {
  reqs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(reqs.length);
  if (current) current = reqs.find((x) => x.__id === current.__id) || current;
  renderAll(); maybeAutoOpen();
}, (e) => loadErr("healthLabRequests", e));
window.__p54.listeners++;

 
function openById(id) {
  const d = reqs.find((x) => x.__id === id);
  if (!d) { $("#w-none").textContent = "No request with that reference is on record."; return; }
  current = d;
  renderAll();
  $("#w-card").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("#w-open").addEventListener("click", () => {
  const q = $("#w-q").value.trim().toLowerCase();
  $("#w-none").textContent = "";
  if (!q) return;
  const hit = reqs.find((x) => String(x.requestNumber || "").toLowerCase() === q) ||
              reqs.find((x) => String(x.patientId || "").toLowerCase() === q) ||
              reqs.find((x) => String(x.requestNumber || "").toLowerCase().includes(q)) ||
              reqs.find((x) => String(x.patientName || "").toLowerCase().includes(q));
  if (!hit) { $("#w-none").textContent = "No request matches \u201c" + q + "\u201d."; return; }
  openById(hit.__id);
});
$("#w-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#w-open").click(); } });

function maybeAutoOpen() {
  if (current) return;
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "";
  if (id && reqs.some((x) => x.__id === id)) { current = reqs.find((x) => x.__id === id); renderAll(); return; }
  const pid = params.get("patient") || "";
  if (pid) {
    const own = reqs.filter((x) => String(x.patientId) === String(pid));
    if (own.length) { current = own[0]; renderAll(); }
  }
}

 
function renderAll() {
  if (!current) return;
  const d = current;
  $("#w-card").hidden = false;
  $("#w-title").innerHTML = "Request " + esc(d.requestNumber || d.__id) + " " + stBadge(d.status) +
    (String(d.priority) === "Urgent" ? " <span class='st st-critical'>Urgent</span>" : "");

  $("#w-info").innerHTML =
    "<div class='kv'><span class='k'>Patient</span><span class='v'>" + esc(d.patientName || "—") +
      " · " + esc(d.patientId || "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Requested by</span><span class='v'>" +
      esc((d.requestingDepartment || "—") + " · " + (d.requestingClinician || "—")) + "</span></div>" +
    "<div class='kv'><span class='k'>Clinical information</span><span class='v'>" + esc(d.clinicalInfo || "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Created</span><span class='v'>" + esc(when(d.createdAt)) + " · by " + esc(d.recordedBy || "—") + "</span></div>";

  const sp = d.specimen || {};
  $("#w-sp-type").value = sp.type || "";
  $("#w-sp-status").value = sp.status || "Awaiting Collection";
  $("#w-sp-note").value = sp.note || "";
  $("#w-spcollect").hidden = !(sp.status === "Awaiting Collection" || sp.status === "Recollection Required");

  const tests = Array.isArray(d.tests) ? d.tests : [];
  $("#w-tests").innerHTML = tests.map((t, i) => {
    const done = t.status === "Completed";
    return "<div class='test-row'>" +
      "<div class='t-head'><span class='t-name'>" + (i + 1) + ". " + esc(t.name || "Test") + "</span>" +
        "<span>" +
          (t.status === "Completed"
            ? "<span class='st " + (t.verifiedBy ? "st-verified" : "st-unverified") + "'>" +
              (t.verifiedBy ? "Verified" : "Awaiting verification") + "</span> "
            : "<span class='st st-await'>" + esc(t.status || "Pending") + "</span> ") +
          (t.abnormal ? "<span class='st st-abnormal'>Abnormal</span> " : "") +
          (t.critical ? "<span class='st st-critical'>Critical</span>" : "") +
        "</span></div>" +
      "<div class='t-grid'>" +
        "<label>Result<input data-test='" + i + "' data-f='result' value='" + esc(t.result || "") + "'" +
          (done ? " readonly" : "") + "></label>" +
        "<label>Unit<input data-test='" + i + "' data-f='unit' value='" + esc(t.unit || "") + "'" +
          (done ? " readonly" : "") + "></label>" +
        "<label>Reference range<input data-test='" + i + "' data-f='refRange' value='" + esc(t.refRange || "") + "'" +
          (done ? " readonly" : "") + "></label>" +
        "<label>Flags<span style='display:flex;gap:12px;align-items:center;font-weight:700'>" +
          "<label style='flex-direction:row;align-items:center;gap:5px'><input type='checkbox' data-test='" + i + "' data-f='abnormal'" +
            (t.abnormal ? " checked" : "") + (done ? " disabled" : "") + "> Abnormal</label>" +
          "<label style='flex-direction:row;align-items:center;gap:5px'><input type='checkbox' data-test='" + i + "' data-f='critical'" +
            (t.critical ? " checked" : "") + (done ? " disabled" : "") + "> Critical</label>" +
        "</span></label>" +
      "</div>" +
      "<div class='form-actions'>" +
        (done
          ? "<span class='mini-note'>Entered " + esc(when(t.enteredAt)) + " · by " + esc(t.enteredBy || "—") +
            (t.verifiedBy ? " · verified " + esc(when(t.verifiedAt)) + " · by " + esc(t.verifiedBy) : "") + "</span>" +
            (t.verifiedBy ? "" : "<button type='button' class='btn-primary' data-verify='" + i + "'>Verify result</button>")
          : "<button type='button' class='btn-primary' data-save='" + i + "'>Save result &amp; mark Completed</button>") +
      "</div>" +
    "</div>";
  }).join("");

  const crit = d.critical || {};
  $("#w-crit").innerHTML =
    "<div class='kv'><span class='k'>Critical flag</span><span class='v'>" +
      (crit.flagged ? "<span class='st st-critical'>CRITICAL</span>" : "<span class='st st-none'>none</span>") + "</span></div>" +
    "<div class='kv'><span class='k'>Notified</span><span class='v'>" +
      (crit.flagged ? esc((crit.notifiedTo || "—") + " · " + when(crit.notifiedAt) + " · by " + (crit.notifiedBy || "—")) : "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Acknowledged</span><span class='v'>" +
      (crit.acknowledgedBy ? esc(crit.acknowledgedBy + " · " + when(crit.acknowledgedAt)) : "—") + "</span></div>";
  $("#w-critform").hidden = !crit.flagged || !!crit.acknowledgedBy;
  $("#w-crit-to").value = crit.notifiedTo || "";
  $("#w-critflag").hidden = !!crit.flagged;
  $("#w-critack").hidden = !crit.flagged || !!crit.acknowledgedBy;

  const fin = d.status === "Completed" || d.status === "Cancelled";
  $("#w-starttesting").hidden = fin || d.status !== "Specimen Collected";
  $("#w-completereq").hidden = fin || d.status !== "Testing in Progress";
  $("#w-cancelreq").hidden = fin;
  const allDone = tests.length > 0 && tests.every((t) => t.status === "Completed" || t.status === "Cancelled");
  $("#w-statusnote").textContent = fin
    ? (d.status === "Completed" ? "Completed " + when(d.completedAt) + " — the results are available to the requesting clinician." : "Cancelled — the record is kept.")
    : (allDone ? "Every test is entered — the request can be completed." :
       (d.status === "Testing in Progress" ? "Testing is in progress — results can be entered below." :
        (d.status === "Requested" ? "Collect the specimen first; then testing can start." :
         "Testing starts once the specimen is marked Collected.")));

  const hist = Array.isArray(d.statusHistory) ? d.statusHistory : [];
  $("#w-trail").innerHTML = hist.map((h) =>
    "<li><span><b>" + esc(h.status || "—") + "</b>" +
      (h.note ? " <span class='t-who'>· " + esc(h.note) + "</span>" : "") +
    "</span><span class='t-who'>" + esc(when(h.at)) + (h.by ? " · by " + esc(h.by) : "") + "</span></li>").join("");

  $("#w-rec").innerHTML =
    "<div class='kv'><span class='k'>Recorded By</span><span class='v'>" + esc(d.recordedBy || "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Updated At</span><span class='v'>" + esc(when(d.updatedAt)) + "</span></div>";

  $("#w-staff").value = $("#w-staff").value || rememberedStaff();
  $("#w-ferr").hidden = true;
}

 
function ferr(msg) { const e = $("#w-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function staffForAction() {
  const s = $("#w-staff").value.trim();
  if (!s) { ferr("Enter your name first — every action records who made it."); return ""; }
  keepStaff(s);
  return s;
}
function touch(fields) {
  if (!current) return Promise.reject("no request open");
  return updateDoc(doc(db, "healthLabRequests", current.__id),
    Object.assign({ updatedAt: nowISO() }, fields));
}

 
$("#w-spsave").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-spsave"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ specimen: {
      type: $("#w-sp-type").value,
      status: $("#w-sp-status").value,
      collectedAt: ($("#w-sp-status").value === "Collected") ? (current.specimen && current.specimen.collectedAt || nowISO()) : ((current.specimen && current.specimen.collectedAt) || ""),
      collectedBy: ($("#w-sp-status").value === "Collected") ? (current.specimen && current.specimen.collectedBy || staff) : ((current.specimen && current.specimen.collectedBy) || ""),
      note: $("#w-sp-note").value.trim()
    }});
  } catch (e) { ferr("Could not save the specimen record: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-spcollect").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-spcollect"); if (btn.disabled) return; btn.disabled = true;
  try {
    const type = $("#w-sp-type").value;
    if (!type) { ferr("Choose the specimen type first."); btn.disabled = false; return; }
    await touch({ specimen: {
      type, status: "Collected", collectedAt: nowISO(), collectedBy: staff,
      note: (current.specimen && current.specimen.note) || ""
    }, status: current.status === "Requested" ? "Specimen Collected" : current.status,
      statusHistory: arrayUnion({ status: "Specimen Collected", at: nowISO(), by: staff, note: type + " collected" }) });
  } catch (e) { ferr("Could not record the collection: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

 
const buf = {};
$("#w-tests").addEventListener("input", (e) => {
  const el = e.target;
  const i = el.getAttribute("data-test"), f = el.getAttribute("data-f");
  if (i == null || !f) return;
  buf[i] = buf[i] || {};
  buf[i][f] = el.type === "checkbox" ? el.checked : el.value;
});
$("#w-tests").addEventListener("click", async (e) => {
  const save = e.target.closest("button[data-save]");
  const verify = e.target.closest("button[data-verify]");
  if (!current) return;
  ferr("");
  if (save) {
    const i = Number(save.getAttribute("data-save"));
    const staff = staffForAction(); if (!staff) return;
    const t = (current.tests || [])[i];
    if (!t) return;
    if ((current.specimen || {}).status === "Rejected" || (current.specimen || {}).status === "Recollection Required")
      return ferr("The specimen is " + (current.specimen.status) + " — collect a valid specimen before entering results.");
    const b = buf[i] || {};
    const result = b.result != null ? String(b.result).trim() : (t.result || "");
    if (!result) return ferr("Enter the result before marking the test Completed.");
    const tests = (current.tests || []).map((x, j) => j === i ? Object.assign({}, x, {
      status: "Completed", result,
      unit: b.unit != null ? b.unit.trim() : (x.unit || ""),
      refRange: b.refRange != null ? b.refRange.trim() : (x.refRange || ""),
      abnormal: b.abnormal != null ? !!b.abnormal : !!x.abnormal,
      critical: b.critical != null ? !!b.critical : !!x.critical,
      enteredBy: staff, enteredAt: nowISO()
    }) : x);
    save.disabled = true;
    try {
      await touch({ tests, critical: tests[i].critical
        ? Object.assign({ flagged: false, notifiedTo: "", notifiedAt: "", notifiedBy: "", acknowledgedBy: "", acknowledgedAt: "" }, current.critical)
        : (current.critical || {}) });
      delete buf[i];
    } catch (err) { ferr("Could not save the result: " + ((err && (err.code || err.message)) || err)); }
    save.disabled = false;
    return;
  }
  if (verify) {
    const i = Number(verify.getAttribute("data-verify"));
    const staff = staffForAction(); if (!staff) return;
    const t = (current.tests || [])[i];
    if (!t) return;
    if (t.enteredBy && t.enteredBy.toLowerCase() === staff.toLowerCase())
      return ferr("The person who entered a result does not verify it — an authorized second person must verify.");
    verify.disabled = true;
    try {
      const tests = (current.tests || []).map((x, j) => j === i ? Object.assign({}, x, {
        verifiedBy: staff, verifiedAt: nowISO()
      }) : x);
      await touch({ tests });
    } catch (err) { ferr("Could not verify: " + ((err && (err.code || err.message)) || err)); }
    verify.disabled = false;
  }
});

 
$("#w-critflag").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const to = $("#w-crit-to").value.trim();
  if (!to) return ferr("Record who is being notified — a critical result is always told to a named clinician.");
  const anyCrit = (current.tests || []).some((t) => t.critical);
  const btn = $("#w-critflag"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ critical: {
      flagged: true, notifiedTo: to, notifiedAt: nowISO(), notifiedBy: staff,
      acknowledgedBy: (current.critical || {}).acknowledgedBy || "",
      acknowledgedAt: (current.critical || {}).acknowledgedAt || ""
    }, statusHistory: arrayUnion({ status: current.status, at: nowISO(), by: staff,
      note: "Critical result flagged — notified " + to + (anyCrit ? "" : " (flag raised without a critical-marked test)") }) });
  } catch (e) { ferr("Could not record the notification: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-critack").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-critack"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ critical: Object.assign({}, current.critical, {
      acknowledgedBy: staff, acknowledgedAt: nowISO() }) });
  } catch (e) { ferr("Could not record the acknowledgement: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

 
$("#w-starttesting").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const sp = current.specimen || {};
  if (sp.status === "Rejected" || sp.status === "Recollection Required")
    return ferr("The specimen is " + sp.status + " — collect a valid specimen first.");
  if (sp.status !== "Collected" && sp.status !== "Received by Laboratory")
    return ferr("The specimen must be Collected (or Received by the laboratory) before testing starts.");
  const btn = $("#w-starttesting"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ status: "Testing in Progress",
      statusHistory: arrayUnion({ status: "Testing in Progress", at: nowISO(), by: staff, note: "" }) });
  } catch (e) { ferr("Could not start testing: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-completereq").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const tests = current.tests || [];
  const pending = tests.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
  if (pending.length) return ferr(pending.length + " test(s) still open — enter or cancel them before completing the request.");
  const btn = $("#w-completereq"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ status: "Completed", completedAt: nowISO(),
      statusHistory: arrayUnion({ status: "Completed", at: nowISO(), by: staff, note: "All tests entered" }) });
  } catch (e) { ferr("Could not complete the request: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-cancelreq").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  if (!confirm("Cancel request " + (current.requestNumber || "") + "? The record is kept; the tests stop here.")) return;
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-cancelreq"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ status: "Cancelled",
      statusHistory: arrayUnion({ status: "Cancelled", at: nowISO(), by: staff, note: "Request cancelled" }) });
  } catch (e) { ferr("Could not cancel: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

renderAll();
maybeAutoOpen();











import { requireAuth, db, collection, doc, updateDoc, onSnapshot, arrayUnion } from "/firebase.js";

window.__p54 = { page: "373", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

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
  b.textContent = "Firestore answered — no imaging requests yet. Create one on page 371.";
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
  "Requested": "st-requested", "Scheduled": "st-scheduled",
  "In Progress": "st-testing", "Completed": "st-completed",
  "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

let reqs = [];
let current = null;

onSnapshot(collection(db, "healthImagingRequests"), (snap) => {
  reqs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(reqs.length);
  if (current) current = reqs.find((x) => x.__id === current.__id) || current;
  renderAll(); maybeAutoOpen();
}, (e) => loadErr("healthImagingRequests", e));
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
    (String(d.priority) === "Urgent" ? " <span class='st st-urgent'>Urgent</span>" : "");

  const ap = d.appointment || {};
  $("#w-info").innerHTML =
    "<div class='kv'><span class='k'>Patient</span><span class='v'>" + esc(d.patientName || "—") +
      " · " + esc(d.patientId || "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Requested by</span><span class='v'>" +
      esc((d.requestingDepartment || "—") + " · " + (d.requestingClinician || "—")) + "</span></div>" +
    "<div class='kv'><span class='k'>Clinical information</span><span class='v'>" + esc(d.clinicalInfo || "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Appointment</span><span class='v'>" +
      esc(ap.status ? ap.status + (ap.date ? " · " + ap.date + " " + (ap.time || "") : "") + (ap.room ? " · " + ap.room : "") : "not scheduled") + "</span></div>" +
    "<div class='kv'><span class='k'>Created</span><span class='v'>" + esc(when(d.createdAt)) + " · by " + esc(d.recordedBy || "—") + "</span></div>";

  const procs = Array.isArray(d.procedures) ? d.procedures : [];
  $("#w-procs").innerHTML = procs.map((p, i) => {
    const rep = p.report || {};
    const done = p.status === "Completed";
    const notperf = p.status === "Not Performed";
    return "<div class='proc-row'>" +
      "<div class='p-head'><span class='p-name'>" + (i + 1) + ". " + esc(p.name || "Procedure") + "</span>" +
        "<span>" +
          (done
            ? (rep.verifiedBy
                ? "<span class='st st-verified'>Report verified &amp; finalized</span>"
                : "<span class='st st-unverified'>Report awaiting verification</span>")
            : "<span class='st " + (notperf ? "st-cancelled" : "st-await") + "'>" + esc(p.status || "Pending") + "</span>") +
        "</span></div>" +
      "<div class='kv'><span class='k'>Performed</span><span class='v'>" +
        (done ? esc(when(p.performedAt)) + " · by " + esc(p.performedBy || "—") : "—") + "</span></div>" +
      (notperf ? "<div class='kv'><span class='k'>Not performed — reason</span><span class='v'>" + esc(p.note || "—") + "</span></div>" : "") +
      (done
        ? "<div class='form-grid' style='margin-top:8px'>" +
            "<label class='span-3'>Findings<textarea data-proc='" + i + "' data-f='findings' rows='2'" +
              (rep.verifiedBy ? " readonly" : "") + ">" + esc(rep.findings || "") + "</textarea></label>" +
            (rep.verifiedBy ? "" :
              "<label>Reporting staff (radiographer / radiologist)<input data-proc='" + i + "' data-f='reportBy' value='" +
                esc(rep.reportBy || rememberedStaff() || "") + "'></label>") +
          "</div>" +
          "<div class='form-actions'>" +
            (rep.verifiedBy
              ? "<span class='mini-note'>Reported " + esc(when(rep.reportedAt)) + " · by " + esc(rep.reportBy || "—") +
                " · verified " + esc(when(rep.verifiedAt)) + " · by " + esc(rep.verifiedBy) + "</span>" +
                (rep.corrections && rep.corrections.length
                  ? "<span class='mini-note'>" + rep.corrections.length + " correction(s) kept in the history</span>"
                  : "") +
                (rep.reportBy ? "<button type='button' class='btn-warn' data-correct='" + i + "'>Record a correction</button>" : "")
              : (rep.findings
                  ? "<button type='button' class='btn-primary' data-verify='" + i + "'>Verify &amp; finalize report</button>" +
                    "<button type='button' class='btn-ghost' data-savereport='" + i + "'>Save findings</button>"
                  : "<button type='button' class='btn-primary' data-savereport='" + i + "'>Save findings</button>")) +
          "</div>"
        : (!notperf
          ? "<div class='form-actions'>" +
              "<button type='button' class='btn-primary' data-perform='" + i + "'>Mark performed &amp; completed</button>" +
              "<button type='button' class='btn-danger' data-notperform='" + i + "'>Not performed</button>" +
            "</div>"
          : "")) +
      "</div>";
  }).join("");

  const u = d.urgent || {};
  $("#w-urgent").innerHTML =
    "<div class='kv'><span class='k'>Urgent flag</span><span class='v'>" +
      (u.flagged ? "<span class='st st-urgent'>URGENT</span>" : "<span class='st st-none'>none</span>") + "</span></div>" +
    "<div class='kv'><span class='k'>Finding</span><span class='v'>" + (u.flagged ? esc(u.note || "—") : "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Notified</span><span class='v'>" +
      (u.flagged ? esc((u.notifiedTo || "—") + " · " + when(u.notifiedAt) + " · by " + (u.notifiedBy || "—")) : "—") + "</span></div>" +
    "<div class='kv'><span class='k'>Acknowledged</span><span class='v'>" +
      (u.acknowledgedBy ? esc(u.acknowledgedBy + " · " + when(u.acknowledgedAt)) : "—") + "</span></div>";
  $("#w-uform").hidden = !!u.flagged;
  $("#w-u-note").value = u.note || "";
  $("#w-u-to").value = u.notifiedTo || "";
  $("#w-uflag").hidden = !!u.flagged;
  $("#w-uack").hidden = !u.flagged || !!u.acknowledgedBy;

  const fin = d.status === "Completed" || d.status === "Cancelled";
  $("#w-startproc").hidden = fin || d.status === "In Progress";
  $("#w-completereq").hidden = fin || d.status !== "In Progress";
  $("#w-cancelreq").hidden = fin;
  const allHandled = procs.length > 0 && procs.every((p) => p.status === "Completed" || p.status === "Not Performed" || p.status === "Cancelled");
  $("#w-statusnote").textContent = fin
    ? (d.status === "Completed" ? "Completed " + when(d.completedAt) + " — the reports are available to the requesting clinician." : "Cancelled — the record is kept.")
    : (allHandled ? "Every procedure is handled — the request can be completed." :
       (d.status === "In Progress" ? "Procedure in progress — findings can be entered below." :
        "Start the procedure (after the appointment, if one was made) to begin."));

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
  return updateDoc(doc(db, "healthImagingRequests", current.__id),
    Object.assign({ updatedAt: nowISO() }, fields));
}

$("#w-procs").addEventListener("click", async (e) => {
  if (!current) return;
  ferr("");
  const perform = e.target.closest("button[data-perform]");
  const notperf = e.target.closest("button[data-notperform]");
  const savereport = e.target.closest("button[data-savereport]");
  const verify = e.target.closest("button[data-verify]");
  const correct = e.target.closest("button[data-correct]");
  const staff = staffForAction(); if (!staff) return;
  const procs = (current.procedures || []).map((p) => Object.assign({}, p, { report: Object.assign({}, p.report) }));

  if (perform) {
    const i = Number(perform.getAttribute("data-perform"));
    perform.disabled = true;
    try {
      procs[i].status = "Completed";
      procs[i].performedBy = staff;
      procs[i].performedAt = nowISO();
      await touch({ procedures: procs });
    } catch (err) { ferr("Could not record the procedure: " + ((err && (err.code || err.message)) || err)); }
    perform.disabled = false;
    return;
  }
  if (notperf) {
    const i = Number(notperf.getAttribute("data-notperform"));
    const reason = (window.prompt("Why can the procedure not be performed? (required)", "") || "").trim();
    if (!reason) { ferr("A reason is required — a procedure is never silently dropped."); return; }
    notperf.disabled = true;
    try {
      procs[i].status = "Not Performed";
      procs[i].note = reason;
      procs[i].performedBy = staff;
      procs[i].performedAt = nowISO();
      await touch({ procedures: procs });
    } catch (err) { ferr("Could not record: " + ((err && (err.code || err.message)) || err)); }
    notperf.disabled = false;
    return;
  }
  if (savereport) {
    const i = Number(savereport.getAttribute("data-savereport"));
    const ta = document.querySelector("textarea[data-proc='" + i + "'][data-f='findings']");
    const by = document.querySelector("input[data-proc='" + i + "'][data-f='reportBy']");
    const findings = ta ? ta.value.trim() : "";
    if (!findings) { ferr("Write the findings first — an empty report cannot be saved."); return; }
    savereport.disabled = true;
    try {
      const prev = procs[i].report || {};
      const corrections = Array.isArray(prev.corrections) ? prev.corrections : [];
      const changed = prev.findings && prev.findings !== findings;
      procs[i].report = {
        findings,
        reportBy: (by && by.value.trim()) || prev.reportBy || staff,
        reportedAt: nowISO(),
        verifiedBy: "", verifiedAt: "",
        corrections: changed ? corrections.concat([{ at: nowISO(), by: staff, previousFindings: prev.findings }]) : corrections
      };
      await touch({ procedures: procs });
    } catch (err) { ferr("Could not save the findings: " + ((err && (err.code || err.message)) || err)); }
    savereport.disabled = false;
    return;
  }
  if (verify) {
    const i = Number(verify.getAttribute("data-verify"));
    const rep = procs[i].report || {};
    if (!rep.findings) { ferr("The findings must exist before a report can be verified."); return; }
    if (rep.reportBy && rep.reportBy.toLowerCase() === staff.toLowerCase())
      return ferr("The person who reported the findings does not verify the report — an authorized second person does.");
    verify.disabled = true;
    try {
      procs[i].report = Object.assign({}, rep, { verifiedBy: staff, verifiedAt: nowISO() });
      await touch({ procedures: procs });
    } catch (err) { ferr("Could not verify: " + ((err && (err.code || err.message)) || err)); }
    verify.disabled = false;
    return;
  }
  if (correct) {
    const i = Number(correct.getAttribute("data-correct"));
    const ta = document.querySelector("textarea[data-proc='" + i + "'][data-f='findings']");
    if (!ta) return;
    const prev = procs[i].report || {};
    const findings = ta.value.trim();
    if (!findings) { ferr("The corrected findings cannot be empty."); return; }
    if (findings === prev.findings) { ferr("The findings have not changed — nothing to correct."); return; }
    correct.disabled = true;
    try {
      const corrections = (Array.isArray(prev.corrections) ? prev.corrections : [])
        .concat([{ at: nowISO(), by: staff, previousFindings: prev.findings }]);
      procs[i].report = Object.assign({}, prev, { findings, corrections });
      await touch({ procedures: procs });
    } catch (err) { ferr("Could not record the correction: " + ((err && (err.code || err.message)) || err)); }
    correct.disabled = false;
  }
});

 
$("#w-uflag").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const note = $("#w-u-note").value.trim();
  const to = $("#w-u-to").value.trim();
  if (!note) return ferr("Describe the urgent finding — what was seen.");
  if (!to) return ferr("Record who is being notified — an urgent finding is always told to a named clinician.");
  const btn = $("#w-uflag"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ urgent: {
      flagged: true, note, notifiedTo: to, notifiedAt: nowISO(), notifiedBy: staff,
      acknowledgedBy: (current.urgent || {}).acknowledgedBy || "",
      acknowledgedAt: (current.urgent || {}).acknowledgedAt || ""
    }, statusHistory: arrayUnion({ status: current.status, at: nowISO(), by: staff,
      note: "URGENT finding flagged — notified " + to }) });
  } catch (e) { ferr("Could not record the notification: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-uack").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-uack"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ urgent: Object.assign({}, current.urgent, {
      acknowledgedBy: staff, acknowledgedAt: nowISO() }) });
  } catch (e) { ferr("Could not record the acknowledgement: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

 
$("#w-startproc").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#w-startproc"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ status: "In Progress",
      statusHistory: arrayUnion({ status: "In Progress", at: nowISO(), by: staff, note: "" }) });
  } catch (e) { ferr("Could not start the procedure: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-completereq").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const procs = current.procedures || [];
  const pending = procs.filter((p) => p.status !== "Completed" && p.status !== "Not Performed" && p.status !== "Cancelled");
  if (pending.length) return ferr(pending.length + " procedure(s) still open — perform or record them before completing the request.");
  const btn = $("#w-completereq"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ status: "Completed", completedAt: nowISO(),
      statusHistory: arrayUnion({ status: "Completed", at: nowISO(), by: staff, note: "All procedures handled" }) });
  } catch (e) { ferr("Could not complete the request: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});
$("#w-cancelreq").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  if (!confirm("Cancel request " + (current.requestNumber || "") + "? The record is kept; the procedures stop here.")) return;
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

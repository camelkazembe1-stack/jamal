








import { requireAuth, db, collection, doc, updateDoc, setDoc, onSnapshot, writeBatch, arrayUnion } from "/firebase.js";

window.__p54 = { page: "353", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

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
  b.textContent = "Firestore answered — no discharge records yet. Start one on page 351.";
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
function kv(k, v) {
  return "<div class='kv'><span class='k'>" + k + "</span><span class='v'>" + (v || "—") + "</span></div>";
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

const ST_CLASS = {
  "Pending Authorization": "st-pendauth", "Approved": "st-approved",
  "In Progress": "st-progress", "Awaiting Medication": "st-waitmed",
  "Awaiting Instructions": "st-waitinstr", "Ready for Departure": "st-ready",
  "Discharged": "st-discharged", "Deferred": "st-deferred", "Cancelled": "st-cancelled"
};
function stBadge(s) {
  return "<span class='st " + (ST_CLASS[s] || "st-none") + "'>" + esc(s || "—") + "</span>";
}

 
let discharges = [];
let admissions = [];
let assignments = [];
let beds = [];
let prescriptions = [];
let current = null;

onSnapshot(collection(db, "healthDischarges"), (snap) => {
  discharges = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  bootAnswered(discharges.length);
  if (current) current = discharges.find((x) => x.__id === current.__id) || current;
  renderAll(); maybeAutoOpen();
}, (e) => loadErr("healthDischarges", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthAdmissions"), (snap) => {
  admissions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderAll();
}, (e) => loadErr("healthAdmissions", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderAll();
}, (e) => loadErr("healthBedAssignments", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderAll();
}, (e) => loadErr("healthBeds", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthPrescriptions"), (snap) => {
  prescriptions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderAll();
}, (e) => loadErr("healthPrescriptions", e));
window.__p54.listeners++;

 
function openById(id) {
  const d = discharges.find((x) => x.__id === id);
  if (!d) { $("#x-none").textContent = "No discharge with that reference is on record."; return; }
  current = d;
  renderAll();
  $("#x-card").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("#x-open").addEventListener("click", () => {
  const q = $("#x-q").value.trim().toLowerCase();
  $("#x-none").textContent = "";
  if (!q) return;
  const hit = discharges.find((x) => String(x.dischargeNumber || "").toLowerCase() === q) ||
              discharges.find((x) => String(x.patientId || "").toLowerCase() === q) ||
              discharges.find((x) => String(x.dischargeNumber || "").toLowerCase().includes(q)) ||
              discharges.find((x) => String(x.patientName || "").toLowerCase().includes(q));
  if (!hit) { $("#x-none").textContent = "No discharge matches \u201c" + q + "\u201d."; return; }
  openById(hit.__id);
});
$("#x-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#x-open").click(); } });

function maybeAutoOpen() {
  if (current) return;
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "";
  if (id && discharges.some((x) => x.__id === id)) { current = discharges.find((x) => x.__id === id); renderAll(); return; }
  const pid = params.get("patient") || "";
  if (pid) {
    const own = discharges.filter((x) => String(x.patientId) === String(pid) && x.status !== "Discharged" && x.status !== "Cancelled");
    if (own.length) { current = own[own.length - 1]; renderAll(); }
  }
}

 
function derivedStatus(d) {
  const items = (Array.isArray(d.checklist) ? d.checklist : []).filter((i) => i && i.key !== "auth");
  const out = items.filter((i) => (i.state || "Pending") === "Pending");
  if (out.length === 0) return "Ready for Departure";
  if (out.length === 1) {
    if (out[0].key === "meds") return "Awaiting Medication";
    if (out[0].key === "instr" || out[0].key === "caregiver") return "Awaiting Instructions";
  }
  return "In Progress";
}
function isFinal(s) { return s === "Discharged" || s === "Cancelled"; }

 
function renderAll() {
  if (!current) return;
  const d = current;
  const adm = admissions.find((a) => a.__id === d.admissionDocId) ||
             admissions.find((a) => String(a.admissionNumber || "") === String(d.admissionNumber || ""));
  const place = assignments.find((x) => x.status === "Active" && String(x.patientId) === String(d.patientId)) || null;

  $("#x-card").hidden = false;
  $("#x-title").innerHTML = "Discharge " + esc(d.dischargeNumber || d.__id) + " " + stBadge(d.status);

  $("#x-pat").innerHTML =
    kv("Patient Number", esc(d.patientId || "")) +
    kv("Patient Name", esc(d.patientName || "—")) +
    kv("Age · Sex", esc([d.patientAge, d.patientSex].filter(Boolean).join(" · "))) +
    kv("Admission", esc((d.admissionNumber || "—") + (adm ? " · status " + adm.status : ""))) +
    kv("Admitted On", esc((d.admissionDate || "—") + " " + (d.admissionTime || ""))) +
    kv("Reason the stay ends", esc(d.reason || "—"));

  $("#x-loc").innerHTML =
    kv("Ward", esc(d.wardCode || (place ? place.wardCode : "—"))) +
    kv("Bed", esc(d.bedNumber || (place ? place.bedNumber : "—"))) +
    kv("Placement now", place ? "<span class='st st-active'>Active — " + esc(place.wardCode || "") + " bed " + esc(place.bedNumber || "") + "</span>"
                              : (d.status === "Discharged" ? "<span class='st st-released'>Released at discharge</span>" : "No active placement"));

  $("#x-auth").innerHTML =
    kv("Decision", esc(d.decision || "Pending Review")) +
    kv("Responsible clinician", esc(d.clinician || "—")) +
    kv("Notes", esc(d.notes || "—"));

  const fin = isFinal(d.status);
  $("#x-approve").hidden = fin || d.status === "Deferred" || d.decision === "Approved for Discharge";
  $("#x-defer").hidden = fin || d.status === "Deferred";
  $("#x-notapprove").hidden = fin || d.status === "Deferred";
  $("#x-reopen").hidden = d.status !== "Deferred";
  $("#x-cancelproc").hidden = fin;
  $("#x-staff").value = $("#x-staff").value || rememberedStaff();

  const list = Array.isArray(d.checklist) ? d.checklist : [];
  const authDone = d.decision === "Approved for Discharge";
  const cycle = { "Pending": "Completed", "Completed": "Not Applicable", "Not Applicable": "Pending" };
  const base = list.filter((i) => i && i.key !== "auth");
  $("#x-checklist").innerHTML =
    "<div class='ck-row'><span><span class='ck-label'>Discharge authorization recorded</span>" +
      "<span class='ck-who'>" + (authDone ? "completed automatically when the clinician approved" : "waiting for the clinical decision") + "</span></span>" +
      "<span class='ck-state fixed' data-state='" + (authDone ? "Completed" : "Pending") + "'>" + (authDone ? "Completed" : "Pending") + "</span></div>" +
    base.map((i) => {
      const st = i.state || "Pending";
      const who2 = st === "Completed" && i.by ? " · by " + esc(i.by) + " · " + esc(when(i.at)) : "";
      return "<div class='ck-row'><span><span class='ck-label'>" + esc(i.label || i.key) + "</span>" +
        "<span class='ck-who'>" + who2 + "</span></span>" +
        "<button type='button' class='ck-state' data-key='" + esc(i.key) + "' data-state='" + esc(st) + "'" +
        (fin ? " disabled" : "") + ">" + esc(st) + "</button></div>";
    }).join("");

  const rx = prescriptions.filter((p) => String(p.regId) === String(d.patientId));
  $("#x-rxtable").hidden = rx.length === 0;
  $("#x-rxempty").hidden = rx.length > 0;
  $("#x-rxbody").innerHTML = rx.map((p) =>
    "<tr><td><b>" + esc(p.medicine || "—") + "</b></td>" +
      "<td>" + esc(p.dose || "—") + "</td><td>" + esc(p.frequency || "—") + "</td><td>" + esc(p.duration || "—") + "</td>" +
      "<td><span class='st " + (p.status === "dispensed" ? "st-avail" : "st-none") + "'>" + esc(p.status || "—") + "</span></td>" +
      "<td class='c-date'>" + (p.dispensed ? esc(when(p.dispensed.at)) + (p.dispensed.by ? " · " + esc(p.dispensed.by) : "") : "—") + "</td></tr>").join("");
  $("#x-mednote").value = d.medicationNote || "";

  const ins = d.instructions || {};
  $("#x-i-general").value = ins.general || "";
  $("#x-i-medication").value = ins.medication || "";
  $("#x-i-clinic").value = ins.clinic || "";
  $("#x-i-when").value = ins.when || "";
  $("#x-i-notes").value = ins.notes || "";
  $("#x-iprovided").hidden = fin || !!ins.provided;
  $("#x-iprovided-line").textContent = ins.provided
    ? "Instructions provided" + (ins.providedBy ? " by " + ins.providedBy : "") + (ins.providedAt ? " · " + when(ins.providedAt) : "") + "."
    : "Instructions prepared here are not the same as instructions actually given — record the handover with the button above.";

  const hist = Array.isArray(d.statusHistory) ? d.statusHistory : [];
  $("#x-trail").innerHTML = hist.length === 0
    ? "<li><span class='t-who'>No status trail recorded.</span></li>"
    : hist.map((h) =>
        "<li><span><b>" + esc(h.status || "—") + "</b>" +
          (h.note ? " <span class='t-who'>· " + esc(h.note) + "</span>" : "") +
        "</span><span class='t-who'>" + esc(when(h.at)) + (h.by ? " · by " + esc(h.by) : "") + "</span></li>").join("");

  $("#x-rec").innerHTML =
    kv("Started By", esc(d.recordedBy || "—")) +
    kv("Started At", esc(when(d.createdAt))) +
    kv("Updated At", esc(when(d.updatedAt))) +
    (d.dischargedAt ? kv("Discharged At", esc(when(d.dischargedAt)) + (d.dischargedBy ? " · by " + esc(d.dischargedBy) : "")) : "") +
    (d.bedReleased ? kv("Bed released", "Yes — sent to cleaning") : "");

  
  const ready = d.decision === "Approved for Discharge" && d.status === "Ready for Departure";
  $("#x-confirm").hidden = !ready;
  $("#x-confirm-note").textContent = fin
    ? (d.status === "Discharged"
        ? "This discharge is complete — the record and the history stay on file."
        : "This process is closed. The admission continues; start a new discharge if needed.")
    : ready
      ? "All steps are complete and the clinician has approved. Confirming ends the admission, releases the bed to Cleaning Required and preserves the full history."
      : (d.decision === "Approved for Discharge"
          ? "The clinician has approved — the checklist above decides when the process is Ready for Departure."
          : "Waiting for the clinical decision. Approval, completion and confirmation are three different things — none happens automatically.");
  $("#x-ferr").hidden = true;
}

 
function ferr(msg) { const e = $("#x-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function staffForAction() {
  const s = $("#x-staff").value.trim();
  if (!s) { ferr("Enter your name first — every action records who made it."); return ""; }
  keepStaff(s);
  return s;
}
function touch(fields) {
  if (!current) return Promise.reject("no record open");
  return updateDoc(doc(db, "healthDischarges", current.__id),
    Object.assign({ updatedAt: nowISO() }, fields));
}

$("#x-approve").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  if (current.decision === "Approved for Discharge") return ferr("Already approved.");
  const btn = $("#x-approve"); if (btn.disabled) return; btn.disabled = true;
  try {
    const st = derivedStatus(Object.assign({}, current, { decision: "Approved for Discharge" }));
    await touch({
      decision: "Approved for Discharge", status: st,
      statusHistory: arrayUnion({ status: st, at: nowISO(), by: staff, note: "Clinician approved the discharge" })
    });
  } catch (e) { ferr("Could not approve: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-defer").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-defer"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({
      decision: "Discharge Deferred", status: "Deferred",
      statusHistory: arrayUnion({ status: "Deferred", at: nowISO(), by: staff, note: "Discharge postponed" })
    });
  } catch (e) { ferr("Could not defer: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-notapprove").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  if (!confirm("Record 'Not Approved' for " + (current.dischargeNumber || "") +
      "? The process closes, the admission continues, and the record is kept for accountability.")) return;
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-notapprove"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({
      decision: "Not Approved", status: "Cancelled",
      statusHistory: arrayUnion({ status: "Cancelled", at: nowISO(), by: staff, note: "Clinician did not approve the discharge" })
    });
  } catch (e) { ferr("Could not save the decision: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-reopen").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-reopen"); if (btn.disabled) return; btn.disabled = true;
  try {
    const st = current.decision === "Approved for Discharge" ? derivedStatus(current) : "Pending Authorization";
    await touch({
      status: st,
      statusHistory: arrayUnion({ status: st, at: nowISO(), by: staff, note: "Deferred discharge reopened" })
    });
  } catch (e) { ferr("Could not reopen: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-checklist").addEventListener("click", async (e) => {
  const btn = e.target.closest("button.ck-state");
  if (!btn || btn.disabled) return;
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const key = btn.getAttribute("data-key");
  const cycle = { "Pending": "Completed", "Completed": "Not Applicable", "Not Applicable": "Pending" };
  const next = cycle[btn.getAttribute("data-state")] || "Pending";
  const list = (Array.isArray(current.checklist) ? current.checklist : []).map((i) =>
    i && i.key === key
      ? Object.assign({}, i, { state: next,
          by: next === "Completed" ? staff : "",
          at: next === "Completed" ? nowISO() : "" })
      : i);
  const st = derivedStatus(Object.assign({}, current, { checklist: list }));
  btn.disabled = true;
  try {
    await touch({ checklist: list, status: st,
      statusHistory: arrayUnion({ status: st, at: nowISO(), by: staff, note: "Checklist: " + key + " -> " + next }) });
  } catch (err) { ferr("Could not update the checklist: " + ((err && (err.code || err.message)) || err)); }
  btn.disabled = false;
});

$("#x-medsave").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-medsave"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({ medicationNote: $("#x-mednote").value.trim() });
    ferr(""); btn.textContent = "Saved"; setTimeout(() => { btn.textContent = "Save medication note"; }, 2000);
  } catch (e) { ferr("Could not save the note: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-isave").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-isave"); if (btn.disabled) return; btn.disabled = true;
  try {
    const ins = Object.assign({}, current.instructions, {
      general: $("#x-i-general").value.trim(),
      medication: $("#x-i-medication").value.trim(),
      clinic: $("#x-i-clinic").value.trim(),
      when: $("#x-i-when").value.trim(),
      notes: $("#x-i-notes").value.trim()
    });
    await touch({ instructions: ins });
    btn.textContent = "Saved"; setTimeout(() => { btn.textContent = "Save instructions"; }, 2000);
  } catch (e) { ferr("Could not save the instructions: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-iprovided").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-iprovided"); if (btn.disabled) return; btn.disabled = true;
  try {
    const ins = Object.assign({}, current.instructions, {
      provided: true, providedBy: staff, providedAt: nowISO()
    });
    await touch({ instructions: ins });
  } catch (e) { ferr("Could not record the handover: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

$("#x-cancelproc").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  if (isFinal(current.status)) return;
  if (!confirm("Cancel discharge process " + (current.dischargeNumber || "") +
      "? Nothing is deleted — the record stays on file and the admission continues.")) return;
  const staff = staffForAction(); if (!staff) return;
  const btn = $("#x-cancelproc"); if (btn.disabled) return; btn.disabled = true;
  try {
    await touch({
      status: "Cancelled",
      statusHistory: arrayUnion({ status: "Cancelled", at: nowISO(), by: staff, note: "Process cancelled — the stay continues" })
    });
  } catch (e) { ferr("Could not cancel: " + ((e && (e.code || e.message)) || e)); }
  btn.disabled = false;
});

 
$("#x-confirm").addEventListener("click", async () => {
  if (!current) return;
  ferr("");
  const d = current;
  if (!(d.decision === "Approved for Discharge" && d.status === "Ready for Departure"))
    return ferr("The discharge can only be confirmed once the clinician has approved and the checklist is complete.");
  const adm = admissions.find((a) => a.__id === d.admissionDocId) ||
              admissions.find((a) => String(a.admissionNumber || "") === String(d.admissionNumber || ""));
  if (adm && isFinal(adm.status))
    return ferr("The linked admission is already " + adm.status + " — this stay has ended; nothing to confirm.");
  const staff = staffForAction(); if (!staff) return;
  if (!confirm("Confirm the discharge of " + (d.patientName || d.patientId || "this patient") +
      "?\n\nThe admission ends, the bed goes to Cleaning Required (never straight to Available), and every record is preserved.")) return;
  const btn = $("#x-confirm"); if (btn.disabled) return; btn.disabled = true;
  try {
    const place = assignments.find((x) => x.status === "Active" && String(x.patientId) === String(d.patientId)) || null;
    const bed = place ? beds.find((b) => b.__id === String(place.bedId) ||
      (String(b.wardId) === String(place.wardId) && b.bedNumber === place.bedNumber)) || null : null;
    const batch = writeBatch(db);

    batch.update(doc(db, "healthDischarges", d.__id), {
      status: "Discharged",
      dischargedAt: nowISO(),
      dischargedBy: staff,
      bedReleased: !!place,
      updatedAt: nowISO(),
      statusHistory: arrayUnion({ status: "Discharged", at: nowISO(), by: staff, note: "Discharge confirmed" })
    });
    if (adm) {
      batch.update(doc(db, "healthAdmissions", adm.__id), {
        status: "Discharged",
        updatedAt: nowISO(),
        statusHistory: arrayUnion({ status: "Discharged", at: nowISO(), by: staff,
          note: "Inpatient stay ended by discharge " + (d.dischargeNumber || "") })
      });
    }
    if (place) {
      batch.update(doc(db, "healthBedAssignments", place.__id), {
        status: "Released",
        releasedAt: nowISO(),
        releasedBy: staff,
        releaseReason: "Discharge"
      });
      if (bed) {
        batch.update(doc(db, "healthBeds", bed.__id), {
          status: "Cleaning Required",
          currentPatientId: "",
          currentPatientName: "",
          currentAssignmentId: "",
          updatedAt: nowISO()
        });
        const mref = doc(collection(db, "healthBedMaintenance"));
        batch.set(mref, {
          maintenanceId: mref.id,
          bedDocId: bed.__id,
          bedId: bed.bedId || "",
          bedNumber: bed.bedNumber || "",
          wardId: bed.wardId || "",
          wardCode: bed.wardCode || (place.wardCode || ""),
          reason: "Post-discharge cleaning (" + (d.dischargeNumber || "") + ")",
          reportedAt: nowISO(),
          reportedBy: staff,
          status: "Cleaning Required",
          returnedAt: "",
          returnedBy: "",
          statusHistory: [{ status: "Cleaning Required", at: nowISO(), by: staff }],
          createdAt: nowISO()
        });
      }
    }
    await batch.commit();
  } catch (e) {
    ferr("Could not confirm the discharge: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});

renderAll();
maybeAutoOpen();

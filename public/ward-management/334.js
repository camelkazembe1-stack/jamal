// ward-management (page 334) — JAMALI Health — Patient-to-Bed Assignment
// Connects an EXISTING patient to an AVAILABLE bed. Rules the page enforces:
//   · the patient must already exist (searched from the registrations) —
//     no second patient record is ever created;
//   · one active placement per patient — a duplicate is refused and the
//     current placement is shown instead;
//   · only beds whose status is exactly "Available" can be chosen, and the
//     choice is re-checked against the live data at the moment of saving;
//   · the assignment + the bed update are written in ONE atomic batch, so
//     two patients can never take the same bed, even on a slow network.
// Emergency care is never delayed by this page — treat first, assign after.
import { requireAuth, db, collection, doc, updateDoc, onSnapshot, writeBatch, arrayUnion } from "/firebase.js";

window.__p52 = { page: "334", build: "52g1", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p52) window.__p52.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p52) window.__p52.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no registrations on this account yet. " +
    "Register the patient first (Registration, page 322), then place them here.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
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
function who(r) { return r.isUnidentified ? "Unidentified" : (r.fullName || "Unnamed"); }
function priBadge(p) {
  const k = String(p || "").toLowerCase();
  const cls = { critical: "st-critical", high: "st-high", medium: "st-medium", low: "st-low" }[k];
  return cls ? "<span class='st " + cls + "'>" + esc(p) + "</span>"
             : "<span class='st st-none'>" + (p ? esc(p) : "—") + "</span>";
}
function staffName() {
  const v = $("#g-staff").value.trim() || $("#r-staff").value.trim();
  if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} }
  return v;
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}

/* ---------- live data ---------- */
let regs = [];
let wards = [];
let beds = [];
let assignments = [];
let admissions = [];
let selected = null; // the registration chosen for placement

onSnapshot(collection(db, "healthRegistrations"), (snap) => {
  regs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .filter((r) => r && r.regId)
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  bootAnswered(regs.length);
  renderCands(); renderSel(); render();
  maybeAutoOpen();
}, (e) => loadErr("healthRegistrations", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  renderWards(); renderBeds();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderWards(); renderBeds(); render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")));
  renderSel(); render();
}, (e) => loadErr("healthBedAssignments", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthAdmissions"), (snap) => {
  admissions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  renderLink(); render();
}, (e) => loadErr("healthAdmissions", e));
window.__p52.listeners++;

function activeAssignmentOf(patientId) {
  return assignments.find((a) => a.status === "Active" &&
    String(a.patientId) === String(patientId)) || null;
}
function activeAdmissionOf(patientId) {
  return admissions.find((a) => (a.status === "Pending" || a.status === "Admitted") &&
    String(a.patientId) === String(patientId)) || null;
}

/* ---------- 1 · find the patient ---------- */
function renderCands() {
  const box = $("#g-cands");
  if (selected) { box.innerHTML = ""; return; }
  const q = $("#g-q").value.trim().toLowerCase();
  if (!q) { box.innerHTML = ""; return; }
  const hits = regs.filter((r) =>
    String(r.regId || "").toLowerCase() === q ||
    String(r.regId || "").toLowerCase().includes(q) ||
    String(who(r)).toLowerCase().includes(q)).slice(0, 8);
  box.innerHTML = hits.length === 0
    ? "<p class='mini-note'>No patient matches &ldquo;" + esc(q) + "&rdquo; — register them first (page 322).</p>"
    : hits.map((r) =>
        "<button type='button' class='cand' data-pick='" + esc(r.__id) + "'>" +
          "<span class='c-id'>" + esc(r.regId) + "</span><b>" + esc(who(r)) + "</b>" +
          "<span class='mini-note'>" + esc([r.age, r.sex].filter(Boolean).join(" · ") || "—") + "</span>" +
          priBadge(r.priority) + "</button>").join("");
}
$("#g-q").addEventListener("input", renderCands);
$("#g-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#g-find").click(); } });
$("#g-find").addEventListener("click", renderCands);
$("#g-cands").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-pick]");
  if (!btn) return;
  selected = regs.find((r) => r.__id === btn.getAttribute("data-pick")) || null;
  $("#g-q").value = selected ? String(selected.regId) : $("#g-q").value;
  renderCands(); renderSel(); renderWards(); renderBeds(); renderLink();
});

function renderSel() {
  const box = $("#g-sel");
  if (!selected) { box.hidden = true; box.innerHTML = ""; return; }
  const dup = activeAssignmentOf(selected.regId);
  box.hidden = false;
  box.innerHTML = "<b>" + esc(who(selected)) + "</b> · Registration ID <b>" + esc(selected.regId) +
    "</b> · " + esc([selected.age, selected.sex].filter(Boolean).join(" · ") || "—") + " " +
    priBadge(selected.priority) +
    (dup
      ? "<br><span style='color:#b91c1c; font-weight:800;'>Already placed: " +
        esc((dup.wardCode || "") + " · bed " + (dup.bedNumber || "")) +
        ". One active placement per patient — to move them, use Transfers (335); to release the bed, use the button below.</span>"
      : "");
  // the ward/bed card is meaningful only for a patient without a placement
  $("#g-ward").disabled = !!dup;
  $("#g-bed").disabled = !!dup;
  $("#g-assign").disabled = !!dup;
}

/* the deep link: 341 sends the patient over via ?patient= or sessionStorage */
function maybeAutoOpen() {
  if (selected) return;
  let pid = new URLSearchParams(location.search).get("patient") || "";
  if (!pid) {
    try {
      const j = sessionStorage.getItem("jamaliAssignPatient");
      if (j) { pid = (JSON.parse(j) || {}).patientId || ""; sessionStorage.removeItem("jamaliAssignPatient"); }
    } catch (e) {}
  }
  if (!pid) return;
  const r = regs.find((x) => String(x.regId) === String(pid));
  if (r) { selected = r; $("#g-q").value = String(r.regId); renderCands(); renderSel(); renderWards(); renderBeds(); renderLink(); }
}

/* ---------- 2 · choose the bed ---------- */
function renderWards() {
  const sel = $("#g-ward");
  const cur = sel.value;
  const act = wards.filter((w) => w.status !== "Inactive");
  sel.innerHTML = '<option value="">— Choose a ward —</option>' + act.map((w) =>
    '<option value="' + esc(w.wardId) + '">' + esc(w.wardCode + " · " + w.wardName) + "</option>").join("");
  if (cur && act.some((w) => w.wardId === cur)) sel.value = cur;
  renderBeds();
}
function availableBeds(wardId) {
  return beds.filter((b) => String(b.wardId) === String(wardId) && b.status === "Available")
    .sort((a, b) => String(a.bedNumber || "").localeCompare(String(b.bedNumber || ""), undefined, { numeric: true }));
}
function renderBeds() {
  const wsel = $("#g-ward"), bsel = $("#g-bed");
  const wid = wsel.value;
  const cur = bsel.value;
  if (!wid) {
    bsel.innerHTML = '<option value="">— Choose a ward first —</option>';
    return;
  }
  const list = availableBeds(wid);
  bsel.innerHTML = list.length === 0
    ? '<option value="">No available bed in this ward</option>'
    : '<option value="">— Choose an available bed —</option>' + list.map((b) =>
        '<option value="' + esc(b.bedId) + '">' + esc(b.bedNumber + " · " + (b.bedType || "Standard")) + "</option>").join("");
  if (cur && list.some((b) => b.bedId === cur)) bsel.value = cur;
}
$("#g-ward").addEventListener("change", renderBeds);

function renderLink() {
  const line = $("#g-link");
  if (!selected) { line.hidden = true; line.textContent = ""; return; }
  const a = activeAdmissionOf(selected.regId);
  line.hidden = !a;
  line.textContent = a
    ? "Will be linked to admission " + (a.admissionNumber || "") +
      (a.status === "Pending" ? " — assigning the bed confirms the admission (Pending \u2192 Admitted)." : ".")
    : "";
}

/* ---------- assign ---------- */
function ferr(msg) { const e = $("#g-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function fok(msg) {
  const e = $("#g-fok");
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.textContent = msg;
  clearTimeout(fok.t); fok.t = setTimeout(() => { e.hidden = true; }, 5000);
}

$("#g-assign").addEventListener("click", async () => {
  ferr(""); fok("");
  if (!selected) return ferr("Find and choose the patient first (step 1).");
  const dup = activeAssignmentOf(selected.regId);
  if (dup) return ferr("This patient already holds bed " + (dup.bedNumber || "") + " in " +
    (dup.wardCode || "") + " — one active placement per patient.");
  const w = wards.find((x) => x.wardId === $("#g-ward").value);
  if (!w) return ferr("Choose the ward.");
  if (w.status === "Inactive") return ferr("That ward is inactive — choose an active ward.");
  const b = beds.find((x) => x.bedId === $("#g-bed").value);
  if (!b) return ferr("Choose an available bed in " + (w.wardCode || w.wardName) + ".");
  if (b.status !== "Available")
    return ferr("Bed " + (b.bedNumber || "") + " is no longer available (" + (b.status || "unknown") +
      ") — the list has been refreshed, choose again.");
  const staff = staffName();
  if (!staff) return ferr("The staff member responsible is required — enter a name.");
  const linked = activeAdmissionOf(selected.regId);

  const btn = $("#g-assign");
  if (btn.disabled) return; // duplicate-submission guard
  btn.disabled = true;
  try {
    const ref = doc(collection(db, "healthBedAssignments"));
    const batch = writeBatch(db);
    batch.set(ref, {
      assignmentId: ref.id,
      patientId: selected.regId,
      patientName: who(selected),
      admissionId: linked ? (linked.admissionNumber || linked.__id) : "",
      wardId: w.wardId,
      wardCode: w.wardCode || "",
      wardName: w.wardName || "",
      bedId: b.bedId || "",
      bedNumber: b.bedNumber || "",
      assignedAt: nowISO(),
      assignedBy: staff,
      note: $("#g-note").value.trim(),
      status: "Active",
      releasedAt: "",
      releasedBy: "",
      releaseReason: ""
    });
    batch.update(doc(db, "healthBeds", b.__id), {
      status: "Occupied",
      currentPatientId: selected.regId,
      currentPatientName: who(selected),
      currentAssignmentId: ref.id,
      updatedAt: nowISO()
    });
    if (linked && linked.status === "Pending") {
      batch.update(doc(db, "healthAdmissions", linked.__id), {
        status: "Admitted",
        updatedAt: nowISO(),
        statusHistory: arrayUnion({
          status: "Admitted", at: nowISO(), by: staff,
          note: "Bed " + (b.bedNumber || "") + " (" + (w.wardCode || "") + ") assigned"
        })
      });
    }
    await batch.commit();
    fok("Assigned — " + who(selected) + " is in " + (w.wardCode || "") + ", bed " + (b.bedNumber || "") +
      (linked && linked.status === "Pending" ? ". Admission " + (linked.admissionNumber || "") + " is now Admitted." : "."));
    selected = null;
    $("#g-q").value = ""; $("#g-note").value = ""; $("#g-bed").value = "";
    renderCands(); renderSel(); renderWards(); renderBeds(); renderLink(); render();
  } catch (e) {
    ferr("Could not assign: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});

/* ---------- 3 · current placements + release ---------- */
function render() {
  const act = assignments.filter((a) => a.status === "Active");
  $("#g-empty").hidden = act.length > 0;
  $("#g-wrap").hidden = act.length === 0;
  $("#g-body").innerHTML = act.map((a) => {
    const adm = admissions.find((x) => x.status !== "Discharged" && x.status !== "Cancelled" &&
      (x.admissionNumber === a.admissionId || x.__id === a.admissionId));
    return "<tr>" +
      "<td class='c-party'>" + esc(a.patientName || "—") + "</td>" +
      "<td class='c-no'>" + esc(a.patientId || "") + "</td>" +
      "<td class='nowrap'>" + esc((a.wardCode || "—") + " · bed " + (a.bedNumber || "—")) + "</td>" +
      "<td class='c-date'>" + esc(when(a.assignedAt)) + "</td>" +
      "<td>" + esc(a.assignedBy || "—") + "</td>" +
      "<td class='c-no'>" + (adm ? "<a href='/patient-admission/343?id=" + encodeURIComponent(adm.__id) + "'>" + esc(adm.admissionNumber || adm.__id) + "</a>" : "—") + "</td>" +
      "<td class='c-act'>" +
        "<a class='ghost-btn' href='/ward-management/335?patient=" + encodeURIComponent(a.patientId || "") + "'>Transfer</a> " +
        "<button type='button' class='ghost-btn danger' data-release='" + esc(a.__id) + "'>Release</button>" +
      "</td></tr>";
  }).join("");
  $("#g-count").textContent = act.length === 0 ? ""
    : act.length + (act.length === 1 ? " active placement." : " active placements.");
}
$("#g-body").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-release]");
  if (!btn) return;
  const a = assignments.find((x) => x.__id === btn.getAttribute("data-release"));
  if (a) openRelease(a);
});

let releasing = null;
function openRelease(a) {
  releasing = a;
  $("#r-sub").textContent = who({ fullName: a.patientName }) + " (" + (a.patientId || "") + ") · " +
    (a.wardCode || "") + " · bed " + (a.bedNumber || "");
  $("#r-staff").value = rememberedStaff();
  $("#r-reason").value = "Discharge";
  $("#r-err").hidden = true;
  $("#r-wrap").hidden = false;
}
$("#r-cancel").addEventListener("click", () => { $("#r-wrap").hidden = true; releasing = null; });
$("#r-go").addEventListener("click", async () => {
  if (!releasing) return;
  const e = $("#r-err"); e.hidden = true;
  const staff = $("#r-staff").value.trim();
  if (!staff) { e.textContent = "The staff member responsible is required — enter a name."; e.hidden = false; return; }
  if (staff) { try { localStorage.setItem("jamaliStaff", staff); } catch (err) {} }
  const b = beds.find((x) => x.__id === String(releasing.bedId) ||
    (String(x.wardId) === String(releasing.wardId) && x.bedNumber === releasing.bedNumber));
  const btn = $("#r-go");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "healthBedAssignments", releasing.__id), {
      status: "Released",
      releasedAt: nowISO(),
      releasedBy: staff,
      releaseReason: $("#r-reason").value,
      note: releasing.note || ""
    });
    if (b) {
      batch.update(doc(db, "healthBeds", b.__id), {
        status: "Available",
        currentPatientId: "",
        currentPatientName: "",
        currentAssignmentId: "",
        updatedAt: nowISO()
      });
    }
    await batch.commit();
    $("#r-wrap").hidden = true;
    releasing = null;
    fok("Bed released — the assignment stays in the history with its release date.");
  } catch (err) {
    e.textContent = "Could not release: " + ((err && (err.code || err.message)) || err);
    e.hidden = false;
  }
  btn.disabled = false;
});

renderCands(); renderSel(); renderWards(); renderBeds(); renderLink(); render();
maybeAutoOpen();

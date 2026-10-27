// ward-management (page 335) — JAMALI Health — Ward & Bed Transfers
// Moves a placed patient to another bed or ward in ONE atomic batch:
//   new Active assignment + old assignment Released (reason Transfer) +
//   old bed back to Available + destination bed to Occupied + the transfer
//   document itself + the linked admission marked Transferred. The
//   destination bed is re-checked against the live data at the moment of
//   saving; history is preserved and the patient record is never duplicated.
import { requireAuth, db, collection, doc, updateDoc, onSnapshot, writeBatch, arrayUnion } from "/firebase.js";

window.__p52 = { page: "335", build: "52t1", auth: false, listeners: 0, docs: -1, errs: [] };

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
  b.textContent = "Firestore answered \u2014 no active placements yet. Place a patient first (Bed Assignment, 334).";
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
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

/* ---------- live data ---------- */
let assignments = [];
let wards = [];
let beds = [];
let admissions = [];
let transfers = [];
let moving = null; // the active assignment being moved

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")));
  bootAnswered(assignments.length);
  renderPick(); renderDest(); renderHistory();
  maybeAutoOpen();
}, (e) => loadErr("healthBedAssignments", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  renderWards(); renderBeds();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  renderWards(); renderBeds();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthAdmissions"), (snap) => {
  admissions = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
}, (e) => loadErr("healthAdmissions", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedTransfers"), (snap) => {
  transfers = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.transferredAt || "").localeCompare(String(a.transferredAt || "")));
  renderHistory();
}, (e) => loadErr("healthBedTransfers", e));
window.__p52.listeners++;

/* ---------- 1 · pick the patient ---------- */
function renderPick() {
  const act = assignments.filter((a) => a.status === "Active");
  $("#t-empty").hidden = act.length > 0;
  $("#t-wrap").hidden = act.length === 0;
  $("#t-body").innerHTML = act.map((a) =>
    "<tr" + (moving && moving.__id === a.__id ? " class='is-hl'" : "") + ">" +
      "<td class='c-party'>" + esc(a.patientName || "—") + "</td>" +
      "<td class='c-no'>" + esc(a.patientId || "") + "</td>" +
      "<td class='nowrap'>" + esc((a.wardCode || "—") + " · bed " + (a.bedNumber || "—")) + "</td>" +
      "<td class='c-date'>" + esc(when(a.assignedAt)) + "</td>" +
      "<td>" + esc(a.assignedBy || "—") + "</td>" +
      "<td class='c-act'><button type='button' class='ghost-btn' data-move='" + esc(a.__id) + "'>Move</button></td>" +
    "</tr>").join("");
  $("#t-count").textContent = act.length === 0 ? ""
    : act.length + (act.length === 1 ? " active placement." : " active placements.");
}
$("#t-body").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-move]");
  if (!btn) return;
  const a = assignments.find((x) => x.__id === btn.getAttribute("data-move"));
  if (a) { moving = a; renderPick(); renderDest(); renderWards(); renderBeds(); }
});

function maybeAutoOpen() {
  if (moving) return;
  const pid = new URLSearchParams(location.search).get("patient") || "";
  if (!pid) return;
  const a = assignments.find((x) => x.status === "Active" && String(x.patientId) === String(pid));
  if (a) { moving = a; renderPick(); renderDest(); renderWards(); renderBeds(); }
}

/* ---------- 2 · destination ---------- */
function renderDest() {
  const card = $("#t-card");
  const panel = $("#t-dpatient");
  if (!moving) { card.hidden = true; panel.hidden = true; panel.textContent = ""; return; }
  card.hidden = false;
  panel.hidden = false;
  panel.innerHTML = "Moving <b>" + esc(moving.patientName || "—") + "</b> (" + esc(moving.patientId || "") +
    ") from <b>" + esc((moving.wardCode || "—") + " · bed " + (moving.bedNumber || "—")) + "</b>" +
    (moving.admissionId ? " · linked admission " + esc(moving.admissionId) : "");
  $("#t-staff").value = rememberedStaff();
}
function renderWards() {
  const sel = $("#t-ward");
  const cur = sel.value;
  const act = wards.filter((w) => w.status !== "Inactive");
  sel.innerHTML = '<option value="">— Choose a ward —</option>' + act.map((w) =>
    '<option value="' + esc(w.wardId) + '">' + esc(w.wardCode + " · " + w.wardName) + "</option>").join("");
  if (cur && act.some((w) => w.wardId === cur)) sel.value = cur;
  renderBeds();
}
function renderBeds() {
  const bsel = $("#t-bed");
  const cur = bsel.value;
  if (!moving || !$("#t-ward").value) {
    bsel.innerHTML = '<option value="">— Choose a ward first —</option>';
    return;
  }
  const list = beds.filter((b) => String(b.wardId) === String($("#t-ward").value) &&
      b.status === "Available" &&
      !(String(b.wardId) === String(moving.wardId) && b.bedNumber === moving.bedNumber))
    .sort((a, b) => String(a.bedNumber || "").localeCompare(String(b.bedNumber || ""), undefined, { numeric: true }));
  bsel.innerHTML = list.length === 0
    ? '<option value="">No available bed in this ward</option>'
    : '<option value="">— Choose an available bed —</option>' + list.map((b) =>
        '<option value="' + esc(b.bedId) + '">' + esc(b.bedNumber + " · " + (b.bedType || "Standard")) + "</option>").join("");
  if (cur && list.some((b) => b.bedId === cur)) bsel.value = cur;
}
$("#t-ward").addEventListener("change", renderBeds);
$("#t-cancel").addEventListener("click", () => {
  moving = null; renderPick(); renderDest();
});

function ferr(msg) { const e = $("#t-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function fok(msg) {
  const e = $("#t-fok");
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.textContent = msg;
  clearTimeout(fok.t); fok.t = setTimeout(() => { e.hidden = true; }, 5000);
}

$("#t-go").addEventListener("click", async () => {
  ferr(""); fok("");
  if (!moving) return ferr("Pick the patient to move first (step 1).");
  const fresh = assignments.find((x) => x.__id === moving.__id);
  if (!fresh || fresh.status !== "Active")
    return ferr("This placement is no longer active — it may have been released. Refresh and pick again.");
  const staff = $("#t-staff").value.trim();
  if (!staff) return ferr("The authorized staff member is required — enter a name.");
  const reason = $("#t-reason").value.trim();
  if (!reason) return ferr("The reason for the transfer is required.");
  const w = wards.find((x) => x.wardId === $("#t-ward").value);
  if (!w) return ferr("Choose the destination ward.");
  if (w.status === "Inactive") return ferr("That ward is inactive — choose an active ward.");
  const b = beds.find((x) => x.bedId === $("#t-bed").value);
  if (!b) return ferr("Choose an available destination bed.");
  if (String(b.wardId) === String(fresh.wardId) && b.bedNumber === fresh.bedNumber)
    return ferr("That is the patient's current bed — choose a different one.");
  if (b.status !== "Available")
    return ferr("Bed " + (b.bedNumber || "") + " is no longer available (" + (b.status || "unknown") +
      ") — the list has been refreshed, choose again.");
  keepStaff(staff);

  const btn = $("#t-go");
  if (btn.disabled) return; // duplicate-submission guard
  btn.disabled = true;
  try {
    const ref = doc(collection(db, "healthBedAssignments"));
    const batch = writeBatch(db);
    // the new placement
    batch.set(ref, {
      assignmentId: ref.id,
      patientId: fresh.patientId || "",
      patientName: fresh.patientName || "",
      admissionId: fresh.admissionId || "",
      wardId: w.wardId,
      wardCode: w.wardCode || "",
      wardName: w.wardName || "",
      bedId: b.bedId || "",
      bedNumber: b.bedNumber || "",
      assignedAt: nowISO(),
      assignedBy: staff,
      note: "Via transfer · " + reason,
      status: "Active",
      releasedAt: "",
      releasedBy: "",
      releaseReason: ""
    });
    // the old placement ends
    batch.update(doc(db, "healthBedAssignments", fresh.__id), {
      status: "Released",
      releasedAt: nowISO(),
      releasedBy: staff,
      releaseReason: "Transfer"
    });
    // the old bed is freed
    const oldBed = beds.find((x) => x.__id === String(fresh.bedId) ||
      (String(x.wardId) === String(fresh.wardId) && x.bedNumber === fresh.bedNumber));
    if (oldBed) {
      batch.update(doc(db, "healthBeds", oldBed.__id), {
        status: "Available",
        currentPatientId: "",
        currentPatientName: "",
        currentAssignmentId: "",
        updatedAt: nowISO()
      });
    }
    // the destination bed is taken
    batch.update(doc(db, "healthBeds", b.__id), {
      status: "Occupied",
      currentPatientId: fresh.patientId || "",
      currentPatientName: fresh.patientName || "",
      currentAssignmentId: ref.id,
      updatedAt: nowISO()
    });
    // the transfer record itself
    batch.set(doc(collection(db, "healthBedTransfers")), {
      transferId: "TR" + Date.now().toString(36).toUpperCase() +
        Math.floor(Math.random() * 36).toString(36).toUpperCase(),
      patientId: fresh.patientId || "",
      patientName: fresh.patientName || "",
      admissionId: fresh.admissionId || "",
      fromWardId: fresh.wardId || "",
      fromWardCode: fresh.wardCode || "",
      fromBedId: fresh.bedId || "",
      fromBedNumber: fresh.bedNumber || "",
      toWardId: w.wardId,
      toWardCode: w.wardCode || "",
      toBedId: b.bedId || "",
      toBedNumber: b.bedNumber || "",
      reason,
      authorizedBy: staff,
      transferredAt: nowISO(),
      status: "Completed"
    });
    // the linked admission moves to Transferred (never to Discharged)
    const adm = admissions.find((x) => (x.status === "Admitted" || x.status === "Transferred") &&
      (x.admissionNumber === fresh.admissionId || x.__id === fresh.admissionId));
    if (adm) {
      batch.update(doc(db, "healthAdmissions", adm.__id), {
        status: "Transferred",
        updatedAt: nowISO(),
        statusHistory: arrayUnion({
          status: "Transferred", at: nowISO(), by: staff,
          note: "Moved to " + (w.wardCode || "") + " · bed " + (b.bedNumber || "")
        })
      });
    }
    await batch.commit();
    fok("Transfer complete — " + (fresh.patientName || "patient") + " is now in " +
      (w.wardCode || "") + ", bed " + (b.bedNumber || "") +
      (adm ? "; admission " + (adm.admissionNumber || "") + " is marked Transferred." : "."));
    moving = null;
    $("#t-reason").value = ""; $("#t-bed").value = "";
    renderPick(); renderDest(); renderWards(); renderBeds(); renderHistory();
  } catch (e) {
    ferr("Could not complete the transfer: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});

/* ---------- history ---------- */
function renderHistory() {
  $("#h-empty").hidden = transfers.length > 0;
  $("#h-wrap").hidden = transfers.length === 0;
  $("#h-body").innerHTML = transfers.map((t) =>
    "<tr>" +
      "<td class='c-party'>" + esc(t.patientName || "—") + " <span class='mini-note'>" + esc(t.patientId || "") + "</span></td>" +
      "<td class='nowrap'>" + esc((t.fromWardCode || "—") + " · bed " + (t.fromBedNumber || "—")) + "</td>" +
      "<td class='nowrap'>" + esc((t.toWardCode || "—") + " · bed " + (t.toBedNumber || "—")) + "</td>" +
      "<td class='c-date'>" + esc(when(t.transferredAt)) + "</td>" +
      "<td class='c-desc'>" + esc(t.reason || "—") + "</td>" +
      "<td>" + esc(t.authorizedBy || "—") + "</td>" +
    "</tr>").join("");
  $("#h-count").textContent = transfers.length === 0 ? ""
    : transfers.length + (transfers.length === 1 ? " transfer on record." : " transfers on record.");
}

renderPick(); renderDest(); renderWards(); renderBeds(); renderHistory();
maybeAutoOpen();

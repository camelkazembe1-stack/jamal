







import { requireAuth, db, collection, doc, setDoc, updateDoc, onSnapshot, arrayUnion } from "/firebase.js";

window.__p52 = { page: "336", build: "52m1", auth: false, listeners: 0, docs: -1, errs: [] };

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
  b.textContent = "Firestore answered \u2014 no beds registered yet. Register wards (331) and beds (332) first.";
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
const ST_CLASS = {
  "Available": "st-avail", "Occupied": "st-occ", "Reserved": "st-resv",
  "Cleaning Required": "st-clean", "Cleaning in Progress": "st-clean",
  "Maintenance Required": "st-maint", "Out of Service": "st-oos",
  "Ready for Use": "st-ready"
};

 
let beds = [];
let wards = [];
let maints = [];

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  bootAnswered(beds.length);
  renderOpen(); renderHistory();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  renderWards(); renderBeds();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedMaintenance"), (snap) => {
  maints = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.reportedAt || "").localeCompare(String(a.reportedAt || "")));
  renderBeds(); renderOpen(); renderHistory();
}, (e) => loadErr("healthBedMaintenance", e));
window.__p52.listeners++;

function openMaintOf(bedDocId) {
  return maints.find((m) => m.bedDocId === bedDocId && m.status !== "Ready for Use") || null;
}
function wardCodeOf(wardId) {
  const w = wards.find((x) => x.wardId === wardId);
  return (w && w.wardCode) || "";
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

 
function renderWards() {
  const sel = $("#m-ward");
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Choose a ward —</option>' + wards.map((w) =>
    '<option value="' + esc(w.wardId) + '">' + esc(w.wardCode + " · " + w.wardName) + "</option>").join("");
  if (cur && wards.some((w) => w.wardId === cur)) sel.value = cur;
  renderBeds();
}
function renderBeds() {
  const bsel = $("#m-bed");
  const cur = bsel.value;
  if (!$("#m-ward").value) {
    bsel.innerHTML = '<option value="">— Choose a ward first —</option>';
    return;
  }
  const list = beds.filter((b) => String(b.wardId) === String($("#m-ward").value) &&
      b.status !== "Occupied" && !openMaintOf(b.__id))
    .sort((a, b) => String(a.bedNumber || "").localeCompare(String(b.bedNumber || ""), undefined, { numeric: true }));
  bsel.innerHTML = list.length === 0
    ? '<option value="">No reportable bed in this ward</option>'
    : '<option value="">— Choose a bed —</option>' + list.map((b) =>
        '<option value="' + esc(b.__id) + '">' + esc(b.bedNumber + " · " + (b.bedType || "Standard")) +
        " (" + esc(b.status) + ")</option>").join("");
  if (cur && list.some((b) => b.__id === cur)) bsel.value = cur;
}
$("#m-ward").addEventListener("change", renderBeds);

function ferr(msg) { const e = $("#m-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function fok(msg) {
  const e = $("#m-fok");
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.textContent = msg;
  clearTimeout(fok.t); fok.t = setTimeout(() => { e.hidden = true; }, 5000);
}

$("#m-report").addEventListener("click", async () => {
  ferr(""); fok("");
  const b = beds.find((x) => x.__id === $("#m-bed").value);
  if (!b) return ferr("Choose the bed to report.");
  if (b.status === "Occupied")
    return ferr("Bed " + (b.bedNumber || "") + " is occupied — release the patient first (334).");
  if (openMaintOf(b.__id))
    return ferr("Bed " + (b.bedNumber || "") + " already has an open report below.");
  const reason = $("#m-reason").value.trim();
  if (!reason) return ferr("The reason is required.");
  const staff = $("#m-staff").value.trim();
  if (!staff) return ferr("The reporter name is required.");
  const state = $("#m-state").value;
  keepStaff(staff);

  const btn = $("#m-report");
  if (btn.disabled) return; 
  btn.disabled = true;
  try {
    const ref = doc(collection(db, "healthBedMaintenance"));
    await updateDoc(doc(db, "healthBeds", b.__id), {
      status: state,
      updatedAt: nowISO()
    });
    await setDoc(ref, {
      maintenanceId: ref.id,
      bedDocId: b.__id,
      bedId: b.bedId || "",
      bedNumber: b.bedNumber || "",
      wardId: b.wardId || "",
      wardCode: b.wardCode || wardCodeOf(b.wardId),
      reason,
      reportedAt: nowISO(),
      reportedBy: staff,
      status: state,
      returnedAt: "",
      returnedBy: "",
      statusHistory: [{ status: state, at: nowISO(), by: staff }],
      createdAt: nowISO()
    });
    fok("Bed " + (b.bedNumber || "") + " reported — it is out of the assignment pool until it is marked ready.");
    $("#m-reason").value = ""; $("#m-bed").value = "";
  } catch (e) {
    ferr("Could not save the report: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});

 
function renderOpen() {
  const open = maints.filter((m) => m.status !== "Ready for Use");
  $("#u-empty").hidden = open.length > 0;
  $("#u-wrap").hidden = open.length === 0;
  $("#u-body").innerHTML = open.map((m) => {
    const next = m.status === "Cleaning Required"
      ? { label: "Start Cleaning", act: "start" }
      : (m.status === "Cleaning in Progress" || m.status === "Maintenance Required")
        ? { label: "Mark Ready", act: "ready" }
        : { label: "Return to Service", act: "ready" };
    const last = (m.statusHistory && m.statusHistory.length)
      ? m.statusHistory[m.statusHistory.length - 1] : null;
    return "<tr>" +
      "<td class='c-no nowrap'>Bed " + esc(m.bedNumber || "—") + "</td>" +
      "<td>" + esc(m.wardCode || wardCodeOf(m.wardId) || "—") + "</td>" +
      "<td><span class='st " + (ST_CLASS[m.status] || "st-oos") + "'>" + esc(m.status) + "</span></td>" +
      "<td class='c-desc'>" + esc(m.reason || "—") + "</td>" +
      "<td class='c-date'>" + esc(when(m.reportedAt)) + "</td>" +
      "<td class='c-date'>" + esc(last ? when(last.at) : "—") + "</td>" +
      "<td class='c-act'><button type='button' class='ghost-btn' data-maint='" + esc(m.__id) +
        "' data-act='" + next.act + "'>" + next.label + "</button></td>" +
    "</tr>";
  }).join("");
  $("#u-count").textContent = open.length === 0 ? ""
    : open.length + (open.length === 1 ? " bed under attention." : " beds under attention.");
}
$("#u-body").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-maint]");
  if (!btn) return;
  const m = maints.find((x) => x.__id === btn.getAttribute("data-maint"));
  if (!m) return;
  const act = btn.getAttribute("data-act");
  const staff = rememberedStaff();
  if (!staff) { fok(""); return ferr("Enter your name in the report form once — the page remembers it."); }
  const newStatus = act === "start" ? "Cleaning in Progress" : "Ready for Use";
  btn.disabled = true;
  try {
    if (newStatus === "Ready for Use") {
      await updateDoc(doc(db, "healthBeds", m.bedDocId), {
        status: "Available",
        updatedAt: nowISO()
      });
    }
    await updateDoc(doc(db, "healthBedMaintenance", m.__id), {
      status: newStatus,
      returnedAt: newStatus === "Ready for Use" ? nowISO() : (m.returnedAt || ""),
      returnedBy: newStatus === "Ready for Use" ? staff : (m.returnedBy || ""),
      statusHistory: arrayUnion({ status: newStatus, at: nowISO(), by: staff }),
      updatedAt: nowISO()
    });
    fok(newStatus === "Ready for Use"
      ? "Bed " + (m.bedNumber || "") + " is back in the Available pool."
      : "Cleaning started on bed " + (m.bedNumber || "") + ".");
  } catch (err) {
    ferr("Could not save: " + ((err && (err.code || err.message)) || err));
  }
  btn.disabled = false;
});

 
function renderHistory() {
  $("#y-empty").hidden = maints.length > 0;
  $("#y-wrap").hidden = maints.length === 0;
  $("#y-body").innerHTML = maints.map((m) =>
    "<tr>" +
      "<td class='c-no nowrap'>Bed " + esc(m.bedNumber || "—") + "</td>" +
      "<td>" + esc(m.wardCode || wardCodeOf(m.wardId) || "—") + "</td>" +
      "<td class='c-desc'>" + esc(m.reason || "—") + "</td>" +
      "<td class='c-date'>" + esc(when(m.reportedAt)) + "</td>" +
      "<td>" + esc(m.reportedBy || "—") + "</td>" +
      "<td class='c-date'>" + esc(m.returnedAt ? when(m.returnedAt) : "—") + "</td>" +
      "<td><span class='st " + (ST_CLASS[m.status] || "st-oos") + "'>" + esc(m.status) + "</span></td>" +
    "</tr>").join("");
  $("#y-count").textContent = maints.length === 0 ? ""
    : maints.length + (maints.length === 1 ? " report on record." : " reports on record.");
}

renderWards(); renderBeds(); renderOpen(); renderHistory();

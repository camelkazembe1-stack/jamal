






import { requireAuth, db, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from "/firebase.js";

window.__p52 = { page: "332", build: "52b1", auth: false, listeners: 0, docs: -1, errs: [] };

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
  if (!b || n > 0) { if (b) b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no beds registered yet. Choose a ward above and register its first bed.";
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

 
const BED_CLASS = {
  "Available": "b-avail", "Occupied": "b-occ", "Reserved": "b-resv",
  "Cleaning Required": "b-clean", "Cleaning in Progress": "b-clean",
  "Maintenance Required": "b-maint", "Out of Service": "b-oos"
};
const ST_CLASS = {
  "Available": "st-avail", "Occupied": "st-occ", "Reserved": "st-resv",
  "Cleaning Required": "st-clean", "Cleaning in Progress": "st-clean",
  "Maintenance Required": "st-maint", "Out of Service": "st-oos"
};
const ASSIGNABLE = "Available"; 

 
let wards = [];
let beds = [];
let selWard = ""; 

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  renderWardPicker();
  render();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  if (window.__p52 && window.__p52.docs < 0) bootAnswered(snap.docs.length);
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

function wardById(id) { return wards.find((w) => w.wardId === id || w.__id === id); }
function bedsOf(wardId) {
  return beds.filter((b) => String(b.wardId) === String(wardId))
    .sort((a, b) => String(a.bedNumber || "").localeCompare(String(b.bedNumber || ""), undefined, { numeric: true }));
}

 
function renderWardPicker() {
  const sel = $("#b-ward");
  const cur = selWard;
  sel.innerHTML = '<option value="">— Choose a ward —</option>' + wards.map((w) =>
    '<option value="' + esc(w.wardId) + '">' + esc(w.wardCode + " · " + w.wardName) +
    (w.status === "Inactive" ? " (inactive)" : "") + "</option>").join("");
  if (cur && wards.some((w) => w.wardId === cur)) sel.value = cur;
  selWard = sel.value;
}

$("#b-ward").addEventListener("change", () => {
  selWard = $("#b-ward").value;
  ferr(""); fok("");
  render();
});

 
function ferr(msg) { const e = $("#b-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function fok(msg) {
  const e = $("#b-fok");
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.textContent = msg;
  clearTimeout(fok.t); fok.t = setTimeout(() => { e.hidden = true; }, 4000);
}
function v(sel) { return $(sel).value.trim(); }

 
function render() {
  const w = wardById(selWard);
  const hasWard = !!w;
  $("#b-addrow").hidden = !hasWard;
  $("#b-addactions").hidden = !hasWard;
  $("#b-listtitle").textContent = hasWard ? "Beds — " + (w.wardCode || "") + " " + (w.wardName || "") : "Beds";

  if (hasWard) {
    const inactive = w.status === "Inactive";
    const note = $("#b-wardnote");
    note.hidden = !inactive;
    note.textContent = inactive
      ? "This ward is inactive — activate it on the Ward Registration page before adding beds to it."
      : "";
    const list = bedsOf(selWard);
    const occ = list.filter((b) => b.status === "Occupied").length;
    const avail = list.filter((b) => b.status === ASSIGNABLE).length;
    $("#b-count").textContent = list.length === 0 ? "No beds registered in this ward yet."
      : list.length + (list.length === 1 ? " bed · " : " beds · ") + occ + " occupied · " +
        avail + " available · " + (list.length - occ - avail) + " not usable.";
    $("#b-empty").hidden = list.length > 0;
    $("#b-grid").hidden = list.length === 0;
    $("#b-grid").innerHTML = list.map((b) => {
      const cls = BED_CLASS[b.status] || "b-oos";
      const stc = ST_CLASS[b.status] || "st-oos";
      return "<div class='bed-card " + cls + "'>" +
        "<div class='bed-no'>" + esc(b.bedNumber) + "</div>" +
        "<div class='bed-type'>" + esc(b.bedType || "Standard") + "</div>" +
        "<div style='margin-top:6px;'><span class='st " + stc + "'>" + esc(b.status) + "</span></div>" +
        (b.status === "Occupied"
          ? "<div class='bed-patient'>" + esc(b.currentPatientName || "Patient") +
            " <span class='mini-note'>· " + esc(b.currentPatientId || "") + "</span></div>"
          : (b.notes ? "<div class='bed-patient mini-note'>" + esc(b.notes) + "</div>" : "")) +
        "<div class='bed-act'>" +
          "<button type='button' class='ghost-btn' data-edit='" + esc(b.__id) + "'>Edit</button>" +
        "</div></div>";
    }).join("");
  } else {
    $("#b-count").textContent = "";
    $("#b-empty").hidden = false;
    $("#b-grid").hidden = true;
    $("#b-grid").innerHTML = "";
  }
}

 
function bedNumberTaken(wardId, num, ignoreDocId) {
  const n = String(num).toLowerCase();
  return beds.some((b) => String(b.wardId) === String(wardId) &&
    b.__id !== ignoreDocId && String(b.bedNumber || "").toLowerCase() === n);
}
function makeBedId() {
  const used = new Set(beds.map((b) => String(b.bedId || "")));
  const D = "0123456789", L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (let t = 0; t < 200; t++) {
    let id = "";
    for (let i = 0; i < 4; i++) id += D[Math.floor(Math.random() * D.length)];
    for (let i = 0; i < 4; i++) id += L[Math.floor(Math.random() * L.length)];
    id = "B" + id;
    if (!used.has(id)) return id;
  }
  return "B" + Date.now().toString(36).toUpperCase();
}

$("#b-add").addEventListener("click", async () => {
  ferr(""); fok("");
  const w = wardById(selWard);
  if (!w) return ferr("Choose a ward first.");
  if (w.status === "Inactive") return ferr("This ward is inactive — activate it before adding beds.");
  const num = v("#b-num");
  if (!num) return ferr("The bed number is required — e.g. G-01.");
  if (bedNumberTaken(w.wardId, num, null))
    return ferr("Bed " + num + " already exists in " + (w.wardCode || w.wardName) +
      " — bed numbers must be unique inside a ward.");
  const status = $("#b-status").value;
  const btn = $("#b-add");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await addDoc(collection(db, "healthBeds"), {
      bedId: makeBedId(),
      wardId: w.wardId,
      wardCode: w.wardCode || "",
      wardName: w.wardName || "",
      bedNumber: num,
      bedType: $("#b-type").value,
      status,
      currentPatientId: "",
      currentPatientName: "",
      currentAssignmentId: "",
      notes: "",
      dateCreated: nowISO().slice(0, 10),
      createdBy: "",
      createdAt: nowISO(),
      updatedAt: nowISO()
    });
    $("#b-num").value = "";
    fok("Bed " + num + " registered in " + (w.wardCode || w.wardName) + ".");
  } catch (e) {
    ferr("Could not save the bed: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});
$("#b-clear").addEventListener("click", () => {
  $("#b-num").value = ""; $("#b-type").value = "Standard"; $("#b-status").value = "Available";
  ferr(""); fok("");
});

 
let editing = null;
function openEdit(b) {
  editing = b;
  $("#m-sub").textContent = "Bed ID " + (b.bedId || b.__id) + " · ward " + (b.wardCode || "") +
    " — the ID never changes. A bed is set to Occupied only by an assignment, never by hand.";
  $("#m-num").value = b.bedNumber || "";
  $("#m-type").value = b.bedType || "Standard";
  $("#m-status").value = b.status === "Occupied" ? "Available" : (b.status || "Available");
  if (b.status === "Occupied") {
    
    $("#m-status").disabled = true;
  } else {
    $("#m-status").disabled = false;
  }
  $("#m-notes").value = b.notes || "";
  $("#m-err").hidden = true;
  $("#m-del").hidden = b.status === "Occupied";
  $("#m-wrap").hidden = false;
}
$("#b-grid").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-edit]");
  if (!btn) return;
  const b = beds.find((x) => x.__id === btn.getAttribute("data-edit"));
  if (b) openEdit(b);
});
$("#m-cancel").addEventListener("click", () => { $("#m-wrap").hidden = true; editing = null; });
$("#m-save").addEventListener("click", async () => {
  if (!editing) return;
  const e = $("#m-err"); e.hidden = true;
  const num = v("#m-num");
  if (!num) { e.textContent = "The bed number is required."; e.hidden = false; return; }
  if (bedNumberTaken(editing.wardId, num, editing.__id)) {
    e.textContent = "Bed " + num + " already exists in this ward — numbers must be unique inside a ward.";
    e.hidden = false; return;
  }
  const wasOccupied = editing.status === "Occupied";
  const newStatus = wasOccupied ? "Occupied" : $("#m-status").value;
  if (!wasOccupied && newStatus === "Occupied") {
    e.textContent = "A bed is never set to Occupied by hand — assign a patient on the Bed Assignment page.";
    e.hidden = false; return;
  }
  const btn = $("#m-save");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthBeds", editing.__id), {
      bedNumber: num,
      bedType: $("#m-type").value,
      status: newStatus,
      notes: $("#m-notes").value.trim(),
      updatedAt: nowISO()
    });
    $("#m-wrap").hidden = true;
    editing = null;
    fok("Bed updated.");
  } catch (err) {
    e.textContent = "Could not save: " + ((err && (err.code || err.message)) || err);
    e.hidden = false;
  }
  btn.disabled = false;
});
$("#m-del").addEventListener("click", async () => {
  if (!editing) return;
  if (editing.status === "Occupied") {
    const e = $("#m-err");
    e.textContent = "This bed is occupied — release the patient first (Ward Management \u2192 Bed Assignment).";
    e.hidden = false; return;
  }
  if (!confirm("Delete bed " + (editing.bedNumber || "") + "? Past assignment and transfer records keep the bed number, so history survives.")) return;
  const e = $("#m-err"); e.hidden = true;
  const btn = $("#m-del");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await deleteDoc(doc(db, "healthBeds", editing.__id));
    $("#m-wrap").hidden = true;
    editing = null;
    fok("Bed deleted.");
  } catch (err) {
    e.textContent = "Could not delete: " + ((err && (err.code || err.message)) || err);
    e.hidden = false;
  }
  btn.disabled = false;
});

render();

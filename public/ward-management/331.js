





import { requireAuth, db, collection, doc, addDoc, updateDoc, onSnapshot } from "/firebase.js";

 
window.__p52 = { page: "331", build: "52w1", auth: false, listeners: 0, docs: -1, errs: [] };

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
  b.textContent = "Firestore answered \u2014 no wards registered on this account yet. " +
    "Register the first ward above.";
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

 
const DIGITS = "0123456789";
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; 
function makeWardId() {
  const used = new Set(wards.map((w) => String(w.wardId || "")));
  for (let t = 0; t < 200; t++) {
    let id = "";
    for (let i = 0; i < 4; i++) id += DIGITS[Math.floor(Math.random() * DIGITS.length)];
    for (let i = 0; i < 4; i++) id += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    id = "W" + id;
    if (!used.has(id)) return id;
  }
  return "W" + Date.now().toString(36).toUpperCase();
}

 
let wards = [];        
let beds = [];         
let assignments = [];  

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  bootAnswered(snap.docs.length);
  render();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBedAssignments"), (snap) => {
  assignments = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  render();
}, (e) => loadErr("healthBedAssignments", e));
window.__p52.listeners++;

 
function bedsOf(wardId) { return beds.filter((b) => String(b.wardId) === String(wardId)); }
function occupiedOf(wardId) {
  return beds.filter((b) => String(b.wardId) === String(wardId) && b.status === "Occupied").length;
}
function activeAssignmentsOf(wardId) {
  return assignments.filter((a) => a.status === "Active" && String(a.wardId) === String(wardId));
}

 
function ferr(msg) { const e = $("#w-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function fok(msg) {
  const e = $("#w-fok");
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.textContent = msg;
  clearTimeout(fok.t); fok.t = setTimeout(() => { e.hidden = true; }, 4000);
}
function v(sel) { return $(sel).value.trim(); }

 
function render() {
  const q = v("#w-q").toLowerCase();
  const rows = wards.filter((w) => !q ||
    String(w.wardName || "").toLowerCase().includes(q) ||
    String(w.wardCode || "").toLowerCase().includes(q) ||
    String(w.wardType || "").toLowerCase().includes(q));
  const active = rows.filter((w) => w.status !== "Inactive");
  const inactive = rows.filter((w) => w.status === "Inactive");
  const ordered = active.concat(inactive);

  $("#w-empty").hidden = wards.length > 0;
  $("#w-wrap").hidden = ordered.length === 0;
  $("#w-body").innerHTML = ordered.map((w) => {
    const isActive = w.status !== "Inactive";
    const occ = occupiedOf(w.wardId);
    return "<tr" + (isActive ? "" : " class='row-inactive'") + ">" +
      "<td class='c-no'>" + esc(w.wardCode) + "</td>" +
      "<td class='c-party'>" + esc(w.wardName) + "</td>" +
      "<td>" + esc(w.wardType || "—") + "</td>" +
      "<td>" + esc((w.building || "—") + (w.floor ? " · " + w.floor : "")) + "</td>" +
      "<td class='c-num'>" + (w.maxCapacity === "" || w.maxCapacity == null ? "—" : esc(w.maxCapacity)) + "</td>" +
      "<td class='c-num'>" + bedsOf(w.wardId).length + "</td>" +
      "<td class='c-num'>" + occ + "</td>" +
      "<td>" + (isActive
        ? "<span class='st st-active'>Active</span>"
        : "<span class='st st-inactive'>Inactive</span>") + "</td>" +
      "<td class='c-act'>" +
        "<button type='button' class='ghost-btn' data-act='toggle' data-id='" + esc(w.__id) + "'>" +
          (isActive ? "Deactivate" : "Activate") + "</button>" +
        "<button type='button' class='ghost-btn' data-act='edit' data-id='" + esc(w.__id) + "'>Edit</button>" +
      "</td></tr>";
  }).join("");
  $("#w-count").textContent = rows.length === 0
    ? (wards.length === 0 ? "" : "No ward matches the search.")
    : rows.length + (rows.length === 1 ? " ward." : " wards.") +
      (inactive.length ? " " + inactive.length + " inactive." : "");
}

 
$("#w-q").addEventListener("input", render);
$("#w-body").addEventListener("click", onRowClick);
function onRowClick(e) {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const w = wards.find((x) => x.__id === btn.getAttribute("data-id"));
  if (!w) return;
  if (btn.getAttribute("data-act") === "edit") return openEdit(w);
  if (btn.getAttribute("data-act") === "toggle") return toggleWard(w);
}

 
async function toggleWard(w) {
  ferr(""); fok("");
  const isActive = w.status !== "Inactive";
  if (isActive) {
    const placed = activeAssignmentsOf(w.wardId);
    if (placed.length > 0) {
      return ferr("Cannot deactivate " + (w.wardCode || w.wardName) + " — " + placed.length +
        " patient(s) are still placed in it. Move or release them first (Ward Management \u2192 Bed Assignment).");
    }
    if (!confirm("Deactivate ward " + (w.wardCode || w.wardName) +
        "? It disappears from assignment lists until it is activated again.")) return;
  }
  try {
    await updateDoc(doc(db, "healthWards", w.__id), {
      status: isActive ? "Inactive" : "Active",
      updatedAt: nowISO()
    });
    fok(isActive ? "Ward deactivated." : "Ward activated.");
  } catch (e) {
    ferr("Could not save: " + ((e && (e.code || e.message)) || e));
  }
}

 
function readForm(prefix) {
  return {
    wardName: v(prefix + "-name"),
    wardCode: v(prefix + "-code"),
    wardType: v(prefix + "-type"),
    building: v(prefix + "-building"),
    floor: v(prefix + "-floor"),
    capRaw: v(prefix + "-capacity"),
    supervisor: v(prefix + "-supervisor")
  };
}
function validate(f, ignoreDocId) {
  if (!f.wardName) return "The ward name is required.";
  if (!f.wardType) return "Choose the ward type.";
  if (!f.wardCode) return "The ward code is required — or leave it empty to have one generated.";
  const code = f.wardCode.toLowerCase();
  const clash = wards.find((w) => w.__id !== ignoreDocId &&
    String(w.wardCode || "").toLowerCase() === code);
  if (clash) return "The ward code " + f.wardCode + " is already used by " +
    (clash.wardName || clash.wardCode) + " — codes must be unique.";
  if (f.capRaw !== "" && (!/^\d+$/.test(f.capRaw) || Number(f.capRaw) < 0))
    return "The licensed capacity must be a whole number of 0 or more.";
  return "";
}
function autoCode() {
  const used = new Set(wards.map((w) => String(w.wardCode || "").toUpperCase()));
  for (let t = 0; t < 200; t++) {
    const c = "W-" + String((t + 1)).padStart(2, "0");
    if (!used.has(c)) return c;
  }
  return "W-" + Date.now().toString(36).toUpperCase().slice(-4);
}

$("#w-save").addEventListener("click", async () => {
  ferr(""); fok("");
  const f = readForm("w");
  if (!f.wardCode) f.wardCode = autoCode();
  const bad = validate(f, null);
  if (bad) return ferr(bad);
  const btn = $("#w-save");
  if (btn.disabled) return; 
  btn.disabled = true;
  try {
    await addDoc(collection(db, "healthWards"), {
      wardId: makeWardId(),
      wardName: f.wardName,
      wardCode: f.wardCode,
      wardType: f.wardType,
      building: f.building,
      floor: f.floor,
      maxCapacity: f.capRaw === "" ? "" : Number(f.capRaw),
      supervisor: f.supervisor,
      status: "Active",
      dateCreated: nowISO().slice(0, 10),
      createdBy: f.supervisor || "",
      createdAt: nowISO(),
      updatedAt: nowISO()
    });
    $("#w-name").value = ""; $("#w-code").value = ""; $("#w-building").value = "";
    $("#w-floor").value = ""; $("#w-capacity").value = "";
    fok("Ward registered — it appears in the list below.");
  } catch (e) {
    ferr("Could not save the ward: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
});

$("#w-clear").addEventListener("click", () => {
  $("#w-name").value = ""; $("#w-code").value = ""; $("#w-type").value = "";
  $("#w-building").value = ""; $("#w-floor").value = ""; $("#w-capacity").value = "";
  $("#w-supervisor").value = "";
  ferr(""); fok("");
});

 
let editing = null;
function openEdit(w) {
  editing = w;
  $("#m-sub").textContent = "Ward ID " + (w.wardId || w.__id) + " — the ID never changes.";
  $("#m-name").value = w.wardName || "";
  $("#m-code").value = w.wardCode || "";
  $("#m-type").value = w.wardType || "";
  $("#m-building").value = w.building || "";
  $("#m-floor").value = w.floor || "";
  $("#m-capacity").value = w.maxCapacity === "" || w.maxCapacity == null ? "" : w.maxCapacity;
  $("#m-supervisor").value = w.supervisor || "";
  $("#m-err").hidden = true;
  $("#m-wrap").hidden = false;
}
$("#m-cancel").addEventListener("click", () => { $("#m-wrap").hidden = true; editing = null; });
$("#m-save").addEventListener("click", async () => {
  if (!editing) return;
  const e = $("#m-err"); e.hidden = true;
  const f = readForm("m");
  if (!f.wardCode) f.wardCode = editing.wardCode || autoCode();
  const bad = validate(f, editing.__id);
  if (bad) { e.textContent = bad; e.hidden = false; return; }
  const btn = $("#m-save");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "healthWards", editing.__id), {
      wardName: f.wardName,
      wardCode: f.wardCode,
      wardType: f.wardType,
      building: f.building,
      floor: f.floor,
      maxCapacity: f.capRaw === "" ? "" : Number(f.capRaw),
      supervisor: f.supervisor,
      updatedAt: nowISO()
    });
    $("#m-wrap").hidden = true;
    editing = null;
    fok("Ward updated.");
  } catch (err) {
    e.textContent = "Could not save: " + ((err && (err.code || err.message)) || err);
    e.hidden = false;
  }
  btn.disabled = false;
});

render();

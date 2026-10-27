// ward-management (page 337) — JAMALI Health — the Ward Register
// Read-only: every registered ward with code, name, type, location,
// licensed capacity, bed count, occupancy and status, searched by code,
// name or type. All figures are counted from the live bed records — the
// register never stores its own totals. No failure can hide: every
// listener carries an error callback and failures paint the banner.
import { requireAuth, db, collection, onSnapshot } from "/firebase.js";

window.__p52 = { page: "337", build: "52r1", auth: false, listeners: 0, docs: -1, errs: [] };

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
  b.textContent = "Firestore answered \u2014 no wards registered yet. Register the first one on page 331.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

/* ---------- live data ---------- */
let wards = [];
let beds = [];

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  bootAnswered(wards.length);
  render();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

function countsOf(wardId) {
  const list = beds.filter((b) => String(b.wardId) === String(wardId));
  const occupied = list.filter((b) => b.status === "Occupied").length;
  const oos = list.filter((b) => b.status === "Out of Service").length;
  return { total: list.length, occupied, usable: list.length - oos };
}

/* ---------- render ---------- */
function render() {
  const q = $("#r-q").value.trim().toLowerCase();
  const rows = wards.filter((w) => !q ||
    String(w.wardCode || "").toLowerCase().includes(q) ||
    String(w.wardName || "").toLowerCase().includes(q) ||
    String(w.wardType || "").toLowerCase().includes(q));
  const active = rows.filter((w) => w.status !== "Inactive");
  const inactive = rows.filter((w) => w.status === "Inactive");
  const ordered = active.concat(inactive);

  $("#r-empty").hidden = wards.length > 0;
  $("#r-wrap").hidden = ordered.length === 0;
  $("#r-body").innerHTML = ordered.map((w) => {
    const c = countsOf(w.wardId);
    const p = c.usable ? Math.round((c.occupied / c.usable) * 100) : null;
    const isInactive = w.status === "Inactive";
    return "<tr" + (isInactive ? " class='row-inactive'" : "") + ">" +
      "<td class='c-no'>" + esc(w.wardCode || "—") + "</td>" +
      "<td class='c-party'>" + esc(w.wardName || "—") + "</td>" +
      "<td>" + esc(w.wardType || "—") + "</td>" +
      "<td>" + esc((w.building || "—") + (w.floor ? " · " + w.floor : "")) + "</td>" +
      "<td class='c-num'>" + (w.maxCapacity === "" || w.maxCapacity == null ? "—" : esc(w.maxCapacity)) + "</td>" +
      "<td class='c-num'>" + c.total + "</td>" +
      "<td class='c-num'>" + c.occupied + "</td>" +
      "<td class='c-num'>" + c.usable + "</td>" +
      "<td class='pct-cell'>" + (c.total === 0 ? "no beds" : (p == null ? "—" : p + "%")) + "</td>" +
      "<td>" + (isInactive
        ? "<span class='st st-inactive'>Inactive</span>"
        : "<span class='st st-active'>Active</span>") + "</td>" +
    "</tr>";
  }).join("");
  $("#r-count").textContent = rows.length === 0
    ? (wards.length === 0 ? "" : "No ward matches the search.")
    : rows.length + (rows.length === 1 ? " ward on the register." : " wards on the register.");
}

$("#r-q").addEventListener("input", render);
render();

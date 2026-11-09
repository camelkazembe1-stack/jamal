





import { requireAuth, db, collection, onSnapshot } from "/firebase.js";

window.__p52 = { page: "333", build: "52o1", auth: false, listeners: 0, docs: -1, errs: [] };

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
function bootAnswered(wardsN, bedsN) {
  if (window.__p52) window.__p52.docs = wardsN + bedsN;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (wardsN > 0 || bedsN > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 no wards and no beds registered yet. " +
    "Register them on pages 331 and 332 and the counts here follow automatically.";
}

try {
  await requireAuth();
  if (window.__p52) window.__p52.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

 
let wards = [];
let beds = [];
let answeredW = false, answeredB = false;

onSnapshot(collection(db, "healthWards"), (snap) => {
  wards = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(a.wardCode || "").localeCompare(String(b.wardCode || ""), undefined, { numeric: true }));
  answeredW = true;
  bootAnswered(wards.length, beds.length);
  render();
}, (e) => loadErr("healthWards", e));
window.__p52.listeners++;

onSnapshot(collection(db, "healthBeds"), (snap) => {
  beds = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  answeredB = true;
  bootAnswered(wards.length, beds.length);
  render();
}, (e) => loadErr("healthBeds", e));
window.__p52.listeners++;

 
function wardCounts(wardId) {
  const list = beds.filter((b) => String(b.wardId) === String(wardId));
  const occupied = list.filter((b) => b.status === "Occupied").length;
  const available = list.filter((b) => b.status === "Available").length;
  const reserved = list.filter((b) => b.status === "Reserved").length;
  const oos = list.filter((b) => b.status === "Out of Service").length;
  const cleaning = list.filter((b) =>
    b.status === "Cleaning Required" || b.status === "Cleaning in Progress").length;
  const maint = list.filter((b) => b.status === "Maintenance Required").length;
  const usable = list.length - oos; 
  return { total: list.length, occupied, available, reserved, oos, cleaning, maint,
           unusable: oos + cleaning + maint, usable };
}
function pct(occupied, usable) {
  if (!usable) return null;
  return Math.round((occupied / usable) * 100);
}

 
function render() {
  const all = wardCountsAll();
  $("#d-wards").textContent = String(wards.length);
  $("#d-beds").textContent = String(all.total);
  $("#d-occ").textContent = String(all.occupied);
  $("#d-avail").textContent = String(all.available);
  $("#d-resv").textContent = String(all.reserved);
  $("#d-unusable").textContent = String(all.cleaning + all.maint);
  $("#d-oos").textContent = String(all.oos);

  const active = wards.filter((w) => w.status !== "Inactive");
  const inactive = wards.filter((w) => w.status === "Inactive");
  const ordered = active.concat(inactive);

  $("#o-empty").hidden = wards.length > 0;
  $("#o-wrap").hidden = ordered.length === 0;
  $("#o-body").innerHTML = ordered.map((w) => {
    const c = wardCounts(w.wardId);
    const p = pct(c.occupied, c.usable);
    const isInactive = w.status === "Inactive";
    return "<tr" + (isInactive ? " class='row-inactive'" : "") + ">" +
      "<td class='c-party'>" + esc(w.wardCode + " · " + w.wardName) + "</td>" +
      "<td>" + esc(w.wardType || "—") + "</td>" +
      "<td>" + (isInactive
        ? "<span class='st st-inactive'>Inactive</span>"
        : "<span class='st st-active'>Active</span>") + "</td>" +
      "<td class='c-num'>" + c.total + "</td>" +
      "<td class='c-num'>" + c.occupied + "</td>" +
      "<td class='c-num'>" + c.available + "</td>" +
      "<td class='c-num'>" + c.reserved + "</td>" +
      "<td class='c-num'>" + c.unusable + "</td>" +
      "<td class='c-num'>" + c.usable + "</td>" +
      "<td class='pct-cell'>" + (c.total === 0 ? "no beds"
        : (p == null ? "—" : esc(c.occupied) + " of " + esc(c.usable) + " · " + p + "%")) + "</td>" +
      "</tr>";
  }).join("");
  $("#o-count").textContent = wards.length === 0 ? ""
    : wards.length + (wards.length === 1 ? " ward · " : " wards · ") +
      all.total + (all.total === 1 ? " bed · " : " beds · ") +
      all.occupied + " occupied · " + all.available + " available right now.";
}
function wardCountsAll() {
  const acc = { total: 0, occupied: 0, available: 0, reserved: 0, oos: 0, cleaning: 0, maint: 0, unusable: 0, usable: 0 };
  wards.forEach((w) => {
    const c = wardCounts(w.wardId);
    acc.total += c.total; acc.occupied += c.occupied; acc.available += c.available;
    acc.reserved += c.reserved; acc.oos += c.oos; acc.cleaning += c.cleaning;
    acc.maint += c.maint; acc.unusable += c.unusable; acc.usable += c.usable;
  });
  return acc;
}

render();

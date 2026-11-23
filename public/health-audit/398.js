import { requireAuth, db, collection, onSnapshot } from "/sidebar.js";

window.__p98.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p98) window.__p98.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
  if (code.indexOf("permission-denied") >= 0) {
    const hint = document.getElementById("h-err-hint");
    if (hint) hint.hidden = false;
  }
}
function bootDone() {
  if (window.__p98) window.__p98.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth();
  window.__p98.auth = true;
} catch (e) {
  herr("the sign-in check", e);
  throw e;
}

let ROWS = [];
let TAB = "All";
const TABS = ["All", "create", "update", "write", "delete"];

const todayISO = () => { const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

onSnapshot(collection(db, "healthAudit"), (snap) => {
  ROWS = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  renderAll();
}, (e) => herr("healthAudit", e));

window.__p98.listeners = 1;

function renderAll() {
  $("#a-total").textContent = String(ROWS.length);
  $("#a-create").textContent = String(ROWS.filter((r) => r.action === "create").length);
  $("#a-update").textContent = String(ROWS.filter((r) => r.action === "update").length);
  $("#a-delete").textContent = String(ROWS.filter((r) => r.action === "delete").length);
  $("#a-today").textContent = String(ROWS.filter((r) => String(r.at || "").slice(0, 10) === todayISO()).length);

  const counts = { All: ROWS.length };
  TABS.slice(1).forEach((t) => { counts[t] = ROWS.filter((r) => r.action === t).length; });
  $("#tabs").innerHTML = TABS.map((t) =>
    '<button type="button" class="tab' + (TAB === t ? " on" : "") + '" data-tab="' + t + '">' + t +
    '<span class="n">' + counts[t] + "</span></button>").join("");

  const q = ($("#q").value || "").trim().toLowerCase();
  let rows = TAB === "All" ? ROWS : ROWS.filter((r) => r.action === TAB);
  if (q) rows = rows.filter((r) =>
    String(r.coll || "").toLowerCase().indexOf(q) >= 0 ||
    String(r.refId || "").toLowerCase().indexOf(q) >= 0 ||
    String(r.by || "").toLowerCase().indexOf(q) >= 0 ||
    String(r.detail || "").toLowerCase().indexOf(q) >= 0);
  rows = rows.slice(0, 300);

  const has = rows.length > 0;
  $("#t-card").hidden = !has;
  $("#t-empty").hidden = has;
  $("#t-body").innerHTML = rows.map((r) => {
    const when = String(r.at || "").slice(0, 16).replace("T", " ");
    return "<tr>" +
      '<td class="c-when">' + esc(when || "—") + "</td>" +
      '<td class="c-by">' + esc(r.by || "unknown") + "</td>" +
      '<td><span class="st st-' + esc(r.action || "write") + '">' + esc(r.action || "write") + "</span></td>" +
      '<td class="c-coll">' + esc(r.coll || "—") + "</td>" +
      '<td class="c-id">' + esc(r.refId || "—") + "</td>" +
      '<td class="c-detail">' + esc(r.detail || "") + "</td>" +
      "</tr>";
  }).join("");
  $("#t-count").textContent = has
    ? "Showing " + rows.length + " of " + ROWS.length + " entries" +
      (q ? " \u00b7 search: '" + q + "'" : "") +
      (TAB === "All" ? "." : " \u00b7 action: " + TAB + ".")
    : "";
}

$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (b) { TAB = b.getAttribute("data-tab"); renderAll(); }
});
$("#q").addEventListener("input", renderAll);

bootDone();

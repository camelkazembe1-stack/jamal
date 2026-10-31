


















import { requireAuth, db, collection, query, orderBy, onSnapshot } from "/firebase.js";
import { buildAccounts } from "/ledger/postings.js";

await requireAuth(); 

const $ = (s) => document.querySelector(s);
const grid = $("#acct-grid");
const accountsCard = $("#accounts-card");
const tableCard = $("#table-card");
const acctTitle = $("#acct-title");
const body = $("#lg-body");
const foot = $("#lg-foot");
const emptyBox = $("#empty-state");
const countLine = $("#count-line");

let TXNS = [];
let SELECTED = null;

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fmtAmount(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function asDate(ts) {
  return typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
}

function plusDays(ts, days) {
  const d = new Date(asDate(ts));
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-GB");
}

function render() {
  const MODEL = buildAccounts(TXNS);

  
  grid.innerHTML = MODEL.order.map((name) => {
    const a = MODEL.accts.get(name);
    const drT = a.dr.reduce((s, r) => s + r.amt, 0);
    const crT = a.cr.reduce((s, r) => s + r.amt, 0);
    const bal = drT - crT;
    const tag = bal > 0 ? "DR " + fmtAmount(bal) : bal < 0 ? "CR " + fmtAmount(-bal) : "0";
    return '<button type="button" class="acct-chip' + (name === SELECTED ? " on" : "") +
      '" data-acct="' + esc(name) + '">' +
      '<span class="acct-name">' + esc(name) + " A/C</span>" +
      '<span class="acct-bal">' + esc(tag) + "</span></button>";
  }).join("");
  grid.querySelectorAll(".acct-chip").forEach((b) =>
    b.addEventListener("click", () => { SELECTED = b.dataset.acct; render(); }));

  const has = MODEL.order.length > 0;
  accountsCard.style.display = has ? "" : "none";
  tableCard.style.display = has ? "" : "none";
  emptyBox.hidden = has;
  if (!has) { countLine.textContent = ""; return; }
  if (!SELECTED || !MODEL.accts.has(SELECTED)) SELECTED = MODEL.order[0];

  
  const a = MODEL.accts.get(SELECTED);
  acctTitle.textContent = SELECTED + " A/C";

  const cells = (r) => r
    ? '<td class="c-date">' + esc(r.date) + "</td>" +
      '<td class="c-detail">' + esc(r.detail) + "</td>" +
      '<td class="c-folio">' + esc(r.folio) + "</td>" +
      '<td class="c-amount">' + esc(fmtAmount(r.amt)) + "</td>"
    : "<td></td><td></td><td></td><td></td>";
  let html = "";
  const n = Math.max(a.dr.length, a.cr.length);
  for (let i = 0; i < n; i++) html += "<tr>" + cells(a.dr[i]) + cells(a.cr[i]) + "</tr>";

  const drT = a.dr.reduce((s, r) => s + r.amt, 0);
  const crT = a.cr.reduce((s, r) => s + r.amt, 0);
  const bal = drT - crT; 
  const cdDate = a.lastTs ? plusDays(a.lastTs, 1) : "";
  const bdDate = a.lastTs ? plusDays(a.lastTs, 2) : "";
  const balCells = (dateStr, label, amt) =>
    '<td class="c-date">' + esc(dateStr) + "</td>" +
    '<td class="c-detail">Balance</td>' +
    '<td class="c-folio">' + esc(label) + "</td>" +
    '<td class="c-amount">' + esc(fmtAmount(amt)) + "</td>";
  const blanks = () => "<td></td><td></td><td></td><td></td>";

  
  if (bal < 0) html += '<tr class="cd-row">' + balCells(cdDate, "c/d", -bal) + blanks() + "</tr>";
  if (bal > 0) html += '<tr class="cd-row">' + blanks() + balCells(cdDate, "c/d", bal) + "</tr>";
  body.innerHTML = html;

  const totDr = drT + (bal < 0 ? -bal : 0);
  const totCr = crT + (bal > 0 ? bal : 0);
  let f = '<tr class="total-row">' +
    "<td></td>" + '<td class="c-detail">Total</td>' + "<td></td>" +
    '<td class="c-amount">' + esc(fmtAmount(totDr)) + "</td>" +
    "<td></td>" + '<td class="c-detail">Total</td>' + "<td></td>" +
    '<td class="c-amount">' + esc(fmtAmount(totCr)) + "</td></tr>";
  
  if (bal > 0) f += '<tr class="bd-row">' + balCells(bdDate, "b/d", bal) + blanks() + "</tr>";
  if (bal < 0) f += '<tr class="bd-row">' + blanks() + balCells(bdDate, "b/d", -bal) + "</tr>";
  foot.innerHTML = f;

  const posts = a.dr.length + a.cr.length;
  countLine.textContent =
    MODEL.order.length + " accounts \u00B7 " + posts + " posting" + (posts === 1 ? "" : "s") +
    " in " + SELECTED + " A/C \u00B7 DR " + a.dr.length + " \u00B7 CR " + a.cr.length + ".";
}

 
const q = query(collection(db, "transactions"), orderBy("dateTime", "asc"));
onSnapshot(q, (snap) => {
  TXNS = snap.docs
    .map((d) => d.data({ serverTimestamps: "estimate" }))
    .sort((x, y) => asDate(x.dateTime) - asDate(y.dateTime));
  render();
}, (e) => {
  accountsCard.style.display = "none";
  tableCard.style.display = "none";
  emptyBox.hidden = false;
  emptyBox.querySelector(".empty-title").textContent = "Could not load the ledger";
  emptyBox.querySelector(".empty-sub").textContent =
    e && e.code === "permission-denied"
      ? "Sign in again, then check your Firestore rules."
      : (e && e.message) || String(e);
  countLine.textContent = "";
});

// ledger (page 18) — JAMALI Ledger: one DR/CR account page per account
// Rules (user spec):
//   1. Layout = the cash book layout: DR on the left, CR on the right, both
//      sides with Date | Detail | Folio | Amount
//   2. Title = the account name + " A/C" (Sales A/C, Rent A/C, Customer A A/C, ...)
//   3. Every IN/OUT transaction posts to TWO accounts (double entry) — the
//      posting engine now lives in /ledger/postings.js (shared with the
//      reports so the Trial Balance etc. always match this page)
//   4. Personal accounts (Customer/Supplier/Landlord with credit activity)
//      show transactions on BOTH sides: sales/purchases on one side,
//      payments and returns on the other
//   5. Folio = the book the entry comes from (SJ, PJ, SR, PR, GJ, CRJ, CPJ, PB)
//   6. Detail = the corresponding account (Cash, Bank, the person's name) or
//      the transaction description in personal accounts
//   7. Balance c/d on the side with the SMALLER total, dated the account's
//      last transaction + 1 day; ONE Total row per side (DR = CR); Balance
//      b/d on the OPPOSITE side, one day after c/d — a credit balance b/d
//      sits on the CR side
//   8. NEUTRAL and CONTRA transactions are never posted
import { requireAuth, db, collection, query, orderBy, onSnapshot } from "/firebase.js";
import { buildAccounts } from "/ledger/postings.js";

await requireAuth(); // not logged in? -> bounced to "/"

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

  // ---- account chips with closing balance (DR/CR) ----
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

  // ---- the selected account's ledger page ----
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
  const bal = drT - crT; // positive = the balance sits on the DR side
  const cdDate = a.lastTs ? plusDays(a.lastTs, 1) : "";
  const bdDate = a.lastTs ? plusDays(a.lastTs, 2) : "";
  const balCells = (dateStr, label, amt) =>
    '<td class="c-date">' + esc(dateStr) + "</td>" +
    '<td class="c-detail">Balance</td>' +
    '<td class="c-folio">' + esc(label) + "</td>" +
    '<td class="c-amount">' + esc(fmtAmount(amt)) + "</td>";
  const blanks = () => "<td></td><td></td><td></td><td></td>";

  // c/d on the SMALLER side so both totals meet
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
  // b/d on the OPPOSITE side — a credit balance b/d sits on the CR side
  if (bal > 0) f += '<tr class="bd-row">' + balCells(bdDate, "b/d", bal) + blanks() + "</tr>";
  if (bal < 0) f += '<tr class="bd-row">' + blanks() + balCells(bdDate, "b/d", -bal) + "</tr>";
  foot.innerHTML = f;

  const posts = a.dr.length + a.cr.length;
  countLine.textContent =
    MODEL.order.length + " accounts \u00B7 " + posts + " posting" + (posts === 1 ? "" : "s") +
    " in " + SELECTED + " A/C \u00B7 DR " + a.dr.length + " \u00B7 CR " + a.cr.length + ".";
}

/* live feed — one snapshot, classified + posted client-side */
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

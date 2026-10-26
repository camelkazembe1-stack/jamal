// cash-book-single (page 15) — JAMALI Cash Book (SINGLE column, CASH only)
// A separate module from the Double Column Cash Book (page 6). Rules:
//   1. The single-column book tracks CASH ONLY — Flow Method = Cash.
//      (Bank columns live in the Double Column Cash Book, page 6.)
//   2. NEUTRAL and CONTRA transactions excluded  (only IN / OUT appear)
//   3. IN transactions -> DR side, OUT transactions -> CR side
//   4. Folios numbered sequentially across BOTH sides (chronological order)
//   5. Balance c/d (carried down): on the side with the SMALLER total, dated
//      the last transaction date + 1 day — closing the book so sides balance
//   6. ONE Total row only — both sides must balance to the same figure
//   7. Balance b/d (brought down): on the heavier side, one day after c/d,
//      carrying the cash balance into the next period
import { requireAuth, db, collection, query, orderBy, onSnapshot } from "/firebase.js";

await requireAuth(); // not logged in? -> bounced to "/"

const $ = (s) => document.querySelector(s);
const body = $("#cb-body");
const foot = $("#cb-foot");
const emptyBox = $("#empty-state");
const countLine = $("#count-line");
const tableCard = $("#table-card");

let BOOK = [];

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const typeOf = (t) => String(t.transactionType || "").toUpperCase();
const flowOf = (t) => String(t.flowMethod || "").trim().toLowerCase();
const isIncluded = (t) =>
  flowOf(t) === "cash" && (typeOf(t) === "IN" || typeOf(t) === "OUT");

function fmtAmount(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function asDate(ts) {
  return typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
}

function fmtDate(ts) {
  if (!ts) return "\u2014";
  return asDate(ts).toLocaleDateString("en-GB"); // 21/10/2026
}

function plusDays(ts, days) {
  const d = new Date(asDate(ts));
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-GB");
}

const blanks4 = () => "<td></td><td></td><td></td><td></td>";

// one side's cells: row = { date, detail, folio, amt }
function cells(row) {
  if (!row) return blanks4();
  return '<td class="c-date">' + esc(row.date) + "</td>" +
         '<td class="c-detail">' + esc(row.detail) + "</td>" +
         '<td class="c-folio">' + esc(row.folio) + "</td>" +
         '<td class="c-amount">' + (row.amt ? esc(fmtAmount(row.amt)) : "") + "</td>";
}

// a Balance row on one side (c/d or b/d)
function balCells(dateStr, label, amt) {
  return '<td class="c-date">' + esc(dateStr) + "</td>" +
         '<td class="c-detail">Balance</td>' +
         '<td class="c-folio">' + label + "</td>" +
         '<td class="c-amount">' + (amt != null ? esc(fmtAmount(amt)) : "") + "</td>";
}

function render() {
  // chronological folios across BOTH sides (1..N over every included txn)
  const dr = [], cr = [];
  BOOK.forEach((t, i) => {
    const row = {
      date: fmtDate(t.dateTime),
      detail: t.transactionName || "\u2014",
      folio: i + 1,
      amt: Number(t.amount || 0)
    };
    (typeOf(t) === "IN" ? dr : cr).push(row);
  });

  const sum = (rows) => rows.reduce((s, r) => s + r.amt, 0);
  const drTotal = sum(dr), crTotal = sum(cr);
  const bal = drTotal - crTotal; // positive = cash in hand -> DR side heavier

  // c/d = last transaction date + 1 day; b/d = one day after c/d
  const cdDate = BOOK.length ? plusDays(BOOK[BOOK.length - 1].dateTime, 1) : "";
  const bdDate = BOOK.length ? plusDays(BOOK[BOOK.length - 1].dateTime, 2) : "";

  // ---- tbody: transaction rows paired by index, then the c/d row ----
  let html = "";
  const n = Math.max(dr.length, cr.length);
  for (let i = 0; i < n; i++) html += "<tr>" + cells(dr[i]) + cells(cr[i]) + "</tr>";

  // c/d sits on the SMALLER side so both sides close at the same figure
  if (bal > 0) html += '<tr class="cd-row">' + blanks4() + balCells(cdDate, "c/d", bal) + "</tr>";
  else if (bal < 0) html += '<tr class="cd-row">' + balCells(cdDate, "c/d", -bal) + blanks4() + "</tr>";
  body.innerHTML = html;

  // ---- tfoot: ONE Total row per side (transactions + c/d) — the two sides
  // must balance; then the b/d row on the side that HOLDS the balance ----
  const totDr = drTotal + (bal < 0 ? -bal : 0);
  const totCr = crTotal + (bal > 0 ? bal : 0);

  let f = '<tr class="total-row">' +
    "<td></td>" + '<td class="c-detail">Total</td>' + "<td></td>" +
    '<td class="c-amount">' + esc(fmtAmount(totDr)) + "</td>" +
    "<td></td>" + '<td class="c-detail">Total</td>' + "<td></td>" +
    '<td class="c-amount">' + esc(fmtAmount(totCr)) + "</td>" +
  "</tr>";

  // b/d: opposite side from c/d = the heavier side, carrying the balance
  if (bal > 0) f += '<tr class="bd-row">' + balCells(bdDate, "b/d", bal) + blanks4() + "</tr>";
  else if (bal < 0) f += '<tr class="bd-row">' + blanks4() + balCells(bdDate, "b/d", -bal) + "</tr>";
  foot.innerHTML = f;

  const has = BOOK.length > 0;
  tableCard.style.display = has ? "" : "none";
  emptyBox.hidden = has;
  countLine.textContent = has
    ? "Showing " + BOOK.length + " cash transaction" + (BOOK.length === 1 ? "" : "s") +
      ". Bank transactions are not part of the single-column cash book."
    : "";
}

/* live feed — Flow Method Cash ONLY, types IN/OUT
   (Bank, Credit, NEUTRAL and CONTRA all excluded). Sorted client-side so
   the folios and balance dates are correct no matter what order arrives. */
const q = query(collection(db, "transactions"), orderBy("dateTime", "asc"));
onSnapshot(q, (snap) => {
  BOOK = snap.docs
    .map((d) => d.data({ serverTimestamps: "estimate" }))
    .filter(isIncluded)
    .sort((a, b) => asDate(a.dateTime) - asDate(b.dateTime));
  render();
}, (e) => {
  tableCard.style.display = "none";
  emptyBox.hidden = false;
  emptyBox.querySelector(".empty-title").textContent = "Could not load the cash book";
  emptyBox.querySelector(".empty-sub").textContent =
    e && e.code === "permission-denied"
      ? "Sign in again, then check your Firestore rules."
      : (e && e.message) || String(e);
});

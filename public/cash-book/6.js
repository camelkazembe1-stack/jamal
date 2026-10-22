// cash-book (page 6) — JAMALI Double-Column Cash Book (Cash + Bank)
// Rules (user spec):
//   1. Cash and Bank are FLOW METHODS, not categories — each gets its own
//      amount column on BOTH sides. Flow Method = Cash or Bank (Credit excluded)
//   2. NEUTRAL and CONTRA transactions excluded       (only IN / OUT appear)
//   3. IN transactions  -> DR side, OUT transactions  -> CR side; the amount
//      lands in the Cash or Bank column matching the transaction's Flow Method
//   4. Folios numbered sequentially across BOTH sides (chronological order)
//   5. Balance c/d (carried down): per column, on the side with the SMALLER
//      total, dated the last transaction date + 1 day; one Total row only —
//      Cash totals must balance independently and Bank totals independently
//   6. Balance b/d (brought down): on the side opposite c/d, one day after
//      c/d, carrying the closing Cash and Bank balances into the next period
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
const flowOf = (t) => String(t.flowMethod || "").trim().toLowerCase(); // "cash" | "bank"
const isIncluded = (t) =>
  (flowOf(t) === "cash" || flowOf(t) === "bank") &&
  (typeOf(t) === "IN" || typeOf(t) === "OUT");

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

const blanks5 = () => "<td></td><td></td><td></td><td></td><td></td>";

// one side's cells: row = { date, detail, folio, cash, bank }
function cells(row) {
  if (!row) return blanks5();
  return '<td class="c-date">' + esc(row.date) + "</td>" +
         '<td class="c-detail">' + esc(row.detail) + "</td>" +
         '<td class="c-folio">' + esc(row.folio) + "</td>" +
         '<td class="c-amount">' + (row.cash ? esc(fmtAmount(row.cash)) : "") + "</td>" +
         '<td class="c-amount">' + (row.bank ? esc(fmtAmount(row.bank)) : "") + "</td>";
}

// a Balance row on one side: cash / bank may be null (column not applicable)
function balCells(dateStr, label, cash, bank) {
  return '<td class="c-date">' + esc(dateStr) + "</td>" +
         '<td class="c-detail">Balance</td>' +
         '<td class="c-folio">' + label + "</td>" +
         '<td class="c-amount">' + (cash != null ? esc(fmtAmount(cash)) : "") + "</td>" +
         '<td class="c-amount">' + (bank != null ? esc(fmtAmount(bank)) : "") + "</td>";
}

function render() {
  // chronological folios across BOTH sides (1..N over every included txn)
  const dr = [], cr = [];
  BOOK.forEach((t, i) => {
    const isBank = flowOf(t) === "bank";
    const amt = Number(t.amount || 0);
    const row = {
      date: fmtDate(t.dateTime),
      detail: t.transactionName || "\u2014",
      folio: i + 1,
      cash: isBank ? 0 : amt,
      bank: isBank ? amt : 0
    };
    (typeOf(t) === "IN" ? dr : cr).push(row);
  });

  const sum = (rows, k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
  const drCash = sum(dr, "cash"), drBank = sum(dr, "bank");
  const crCash = sum(cr, "cash"), crBank = sum(cr, "bank");
  const cashBal = drCash - crCash; // positive = DR holds the cash balance
  const bankBal = drBank - crBank; // positive = DR holds the bank balance

  // c/d = last transaction date + 1 day; b/d = one day after c/d
  const cdDate = BOOK.length ? plusDays(BOOK[BOOK.length - 1].dateTime, 1) : "";
  const bdDate = BOOK.length ? plusDays(BOOK[BOOK.length - 1].dateTime, 2) : "";

  // ---- tbody: transaction rows paired by index, then the c/d row(s) ----
  let html = "";
  const n = Math.max(dr.length, cr.length);
  for (let i = 0; i < n; i++) html += "<tr>" + cells(dr[i]) + cells(cr[i]) + "</tr>";

  // per column the c/d sits on the SMALLER side; both columns on the same
  // side share one row, otherwise each side gets its own c/d row
  const cdOnDr = { cash: cashBal < 0 ? -cashBal : null, bank: bankBal < 0 ? -bankBal : null };
  const cdOnCr = { cash: cashBal > 0 ?  cashBal : null, bank: bankBal > 0 ?  bankBal : null };
  if (cdOnDr.cash != null || cdOnDr.bank != null)
    html += '<tr class="cd-row">' + balCells(cdDate, "c/d", cdOnDr.cash, cdOnDr.bank) + blanks5() + "</tr>";
  if (cdOnCr.cash != null || cdOnCr.bank != null)
    html += '<tr class="cd-row">' + blanks5() + balCells(cdDate, "c/d", cdOnCr.cash, cdOnCr.bank) + "</tr>";
  body.innerHTML = html;

  // ---- tfoot: ONE Total row per side (transactions + c/d) so that the
  // Cash totals balance independently and the Bank totals independently;
  // then the b/d row(s) on the side that HOLDS each closing balance ----
  const totDrCash = drCash + (cdOnDr.cash || 0), totCrCash = crCash + (cdOnCr.cash || 0);
  const totDrBank = drBank + (cdOnDr.bank || 0), totCrBank = crBank + (cdOnCr.bank || 0);

  let f = '<tr class="total-row">' +
    "<td></td>" + '<td class="c-detail">Total</td>' + "<td></td>" +
    '<td class="c-amount">' + esc(fmtAmount(totDrCash)) + "</td>" +
    '<td class="c-amount">' + esc(fmtAmount(totDrBank)) + "</td>" +
    "<td></td>" + '<td class="c-detail">Total</td>' + "<td></td>" +
    '<td class="c-amount">' + esc(fmtAmount(totCrCash)) + "</td>" +
    '<td class="c-amount">' + esc(fmtAmount(totCrBank)) + "</td>" +
  "</tr>";

  // b/d: opposite side from c/d = the heavier side, carrying the closing
  // balances; same-side columns share one row
  const bdOnDr = { cash: cashBal > 0 ? cashBal : null, bank: bankBal > 0 ? bankBal : null };
  const bdOnCr = { cash: cashBal < 0 ? -cashBal : null, bank: bankBal < 0 ? -bankBal : null };
  if (bdOnDr.cash != null || bdOnDr.bank != null)
    f += '<tr class="bd-row">' + balCells(bdDate, "b/d", bdOnDr.cash, bdOnDr.bank) + blanks5() + "</tr>";
  if (bdOnCr.cash != null || bdOnCr.bank != null)
    f += '<tr class="bd-row">' + blanks5() + balCells(bdDate, "b/d", bdOnCr.cash, bdOnCr.bank) + "</tr>";
  foot.innerHTML = f;

  const has = BOOK.length > 0;
  tableCard.style.display = has ? "" : "none";
  emptyBox.hidden = has;
  countLine.textContent = has
    ? "Showing " + BOOK.length + " cash & bank transaction" + (BOOK.length === 1 ? "" : "s") + "."
    : "";
}

/* live feed — Flow Method Cash OR Bank, types IN/OUT only
   (Credit flow excluded, NEUTRAL + CONTRA excluded). Sorted client-side so
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

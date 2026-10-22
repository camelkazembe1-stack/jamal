// cash-book (page 6) — JAMALI Cash Book
// Rules (user spec):
//   1. Only transactions whose Flow Method is "Cash"  (Credit/Bank excluded)
//   2. NEUTRAL and CONTRA transactions excluded       (only IN / OUT appear)
//   3. IN transactions  -> DR side, OUT transactions  -> CR side
//   4. Folios numbered sequentially across BOTH sides (chronological order)
//   5. "c/d" in the Folio column = closing balance row (on the shorter side)
//   6. "b/d" in the Folio column = balance brought down (next period, opposite side)
import { requireAuth, db, collection, query, orderBy, onSnapshot } from "/firebase.js";

await requireAuth(); // not logged in? -> bounced to "/"

const $ = (s) => document.querySelector(s);
const body = $("#cb-body");
const foot = $("#cb-foot");
const emptyBox = $("#empty-state");
const countLine = $("#count-line");
const tableCard = $("#table-card");

let CASH = [];

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const typeOf = (t) => String(t.transactionType || "").toUpperCase();
const isCash = (t) => String(t.flowMethod || "").trim().toLowerCase() === "cash";

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

const blanks4 = () => "<td></td><td></td><td></td><td></td>";

function cells(row) {
  if (!row) return blanks4();
  return '<td class="c-date">' + esc(row.date) + "</td>" +
         '<td class="c-detail">' + esc(row.detail) + "</td>" +
         '<td class="c-folio">' + esc(row.folio) + "</td>" +
         '<td class="c-amount">' + esc(fmtAmount(row.amount)) + "</td>";
}

function balanceCells(dateStr, amount) {
  return '<td class="c-date">' + esc(dateStr) + "</td>" +
         '<td class="c-detail">Balance</td>' +
         '<td class="c-folio">c/d</td>' +
         '<td class="c-amount">' + esc(fmtAmount(amount)) + "</td>";
}

function bdCells(dateStr, amount) {
  return '<td class="c-date">' + esc(dateStr) + "</td>" +
         '<td class="c-detail">Balance</td>' +
         '<td class="c-folio">b/d</td>' +
         '<td class="c-amount">' + esc(fmtAmount(amount)) + "</td>";
}

function render() {
  const dr = [], cr = [];
  CASH.forEach((t, i) => { // folio = position in chronological order across both sides
    const row = {
      date: fmtDate(t.dateTime),
      detail: t.transactionName || "\u2014",
      folio: i + 1,
      amount: Number(t.amount || 0)
    };
    (typeOf(t) === "IN" ? dr : cr).push(row);
  });

  const drTotal = dr.reduce((s, r) => s + r.amount, 0);
  const crTotal = cr.reduce((s, r) => s + r.amount, 0);
  const bal = drTotal - crTotal; // positive = DR heavier (money in hand)

  let html = "";
  const n = Math.max(dr.length, cr.length);
  for (let i = 0; i < n; i++) html += "<tr>" + cells(dr[i]) + cells(cr[i]) + "</tr>";

  let lastDateStr = "";
  let bdDateStr = "";
  if (CASH.length) {
    const last = asDate(CASH[CASH.length - 1].dateTime);
    lastDateStr = last.toLocaleDateString("en-GB");
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    bdDateStr = next.toLocaleDateString("en-GB");
  }

  if (bal !== 0) { // closing balance row goes on the SHORTER side
    if (bal > 0) html += '<tr class="cd-row">' + blanks4() + balanceCells(lastDateStr, bal) + "</tr>";
    else         html += '<tr class="cd-row">' + balanceCells(lastDateStr, -bal) + blanks4() + "</tr>";
  }
  body.innerHTML = html;

  let f = '<tr class="total-row">' +
    "<td></td>" + '<td class="c-detail">Total</td>' + "<td></td>" + '<td class="c-amount">' + esc(fmtAmount(drTotal)) + "</td>" +
    "<td></td>" + '<td class="c-detail">Total</td>' + "<td></td>" + '<td class="c-amount">' + esc(fmtAmount(crTotal)) + "</td>" +
  "</tr>";
  if (bal !== 0) { // brought-down balance opens the next period on the HEAVIER side
    const bd = bdCells(bdDateStr, Math.abs(bal));
    f += '<tr class="bd-row">' + (bal > 0 ? bd + blanks4() : blanks4() + bd) + "</tr>";
  }
  foot.innerHTML = f;

  const has = CASH.length > 0;
  tableCard.style.display = has ? "" : "none";
  emptyBox.hidden = has;
  countLine.textContent = has
    ? "Showing " + CASH.length + " cash transaction" + (CASH.length === 1 ? "" : "s") + "."
    : "";
}

/* live feed — only Flow Method = Cash, types IN/OUT (NEUTRAL + CONTRA excluded) */
const q = query(collection(db, "transactions"), orderBy("dateTime", "asc"));
onSnapshot(q, (snap) => {
  CASH = snap.docs
    .map((d) => d.data({ serverTimestamps: "estimate" }))
    .filter((t) => isCash(t) && (typeOf(t) === "IN" || typeOf(t) === "OUT"));
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

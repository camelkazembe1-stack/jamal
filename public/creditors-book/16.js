// creditors-book (page 16) — JAMALI Creditors Book (money the business OWES)
// Rules (user spec):
//   1. Credit purchases increase what we owe a supplier    -> Credit Purchases column
//   2. Purchases returns reduce what we owe                -> Payments column
//   3. Cash/Bank payments to a supplier reduce what we owe -> Payments column
//      A payment row counts ONLY if that name also has credit purchase or
//      purchase-return activity — so plain expenses (rent, salaries, ...)
//      never enter this book (they already live in the Cash Payments Journal).
//   4. Balance Owed column = that person's running balance AFTER the row
//   5. ONE Total row: totals of both columns + total outstanding payable
//   6. Summary card lists the outstanding balance per creditor
// Classification reuses /journals/journal.js — one source of truth for what
// counts as a credit purchase, a purchase return, or a payment.
import { requireAuth, db, collection, query, orderBy, onSnapshot } from "/firebase.js";
import { classify } from "/journals/journal.js";

await requireAuth(); // not logged in? -> bounced to "/"

const INC = "purchases";          // credit purchases (Credit + OUT)
const RET = "purchasesReturns";   // purchases returns (Credit + return)
const PAY = "cashPayments";       // cash/bank payments (Cash|Bank + OUT)

const $ = (s) => document.querySelector(s);
const body = $("#bk-body");
const foot = $("#bk-foot");
const peopleBody = $("#people-body");
const peopleCard = $("#people-card");
const emptyBox = $("#empty-state");
const countLine = $("#count-line");
const tableCard = $("#table-card");

let TXNS = [];

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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

const personOf = (t) => t.name || t.transactionName || "\u2014";

function render() {
  const rows = TXNS.map((t) => ({ t, kind: classify(t) }))
    .filter((r) => r.kind === INC || r.kind === RET || r.kind === PAY);

  // a payment belongs in this book only if the person is a real creditor
  // (has at least one credit purchase or purchase return)
  const people = new Set(rows.filter((r) => r.kind !== PAY).map((r) => personOf(r.t)));
  const book = rows
    .filter((r) => r.kind !== PAY || people.has(personOf(r.t)))
    .sort((a, b) => asDate(a.t.dateTime) - asDate(b.t.dateTime));

  // running balance PER PERSON, in chronological order
  const bal = Object.create(null);
  let totInc = 0, totDec = 0;
  let html = "";
  book.forEach(({ t, kind }) => {
    const p = personOf(t);
    const amt = Number(t.amount || 0);
    const inc = kind === INC ? amt : 0;
    const dec = kind === INC ? 0 : amt; // returns AND payments both reduce
    bal[p] = (bal[p] || 0) + inc - dec;
    totInc += inc;
    totDec += dec;
    html += "<tr>" +
      '<td class="c-date">' + esc(fmtDate(t.dateTime)) + "</td>" +
      '<td class="c-detail">' + esc(t.transactionName || "\u2014") + "</td>" +
      '<td class="c-name">' + esc(p) + "</td>" +
      '<td class="c-amount">' + (inc ? esc(fmtAmount(inc)) : "") + "</td>" +
      '<td class="c-amount">' + (dec ? esc(fmtAmount(dec)) : "") + "</td>" +
      '<td class="c-amount">' + esc(fmtAmount(bal[p])) + "</td>" +
    "</tr>";
  });
  body.innerHTML = html;

  const outstanding = totInc - totDec;
  foot.innerHTML = '<tr class="total-row">' +
    "<td></td>" + '<td class="c-detail">Total</td>' + "<td></td>" +
    '<td class="c-amount">' + esc(fmtAmount(totInc)) + "</td>" +
    '<td class="c-amount">' + esc(fmtAmount(totDec)) + "</td>" +
    '<td class="c-amount">' + esc(fmtAmount(outstanding)) + "</td>" +
  "</tr>";

  // summary: outstanding balance per creditor
  const names = Object.keys(bal).sort((a, b) => bal[b] - bal[a]);
  let ph = "";
  names.forEach((p) => {
    ph += "<tr>" +
      '<td class="c-name">' + esc(p) + "</td>" +
      '<td class="c-amount">' + esc(fmtAmount(bal[p])) + "</td>" +
    "</tr>";
  });
  peopleBody.innerHTML = ph;
  peopleCard.style.display = names.length ? "" : "none";

  const has = book.length > 0;
  tableCard.style.display = has ? "" : "none";
  emptyBox.hidden = has;
  countLine.textContent = has
    ? "Showing " + book.length + " transaction" + (book.length === 1 ? "" : "s") +
      " across " + names.length + " creditor" + (names.length === 1 ? "" : "s") +
      ". Total outstanding payable: " + fmtAmount(outstanding) + "."
    : "";
}

/* live feed — classified client-side, sorted chronologically */
const q = query(collection(db, "transactions"), orderBy("dateTime", "asc"));
onSnapshot(q, (snap) => {
  TXNS = snap.docs
    .map((d) => d.data({ serverTimestamps: "estimate" }))
    .sort((a, b) => asDate(a.dateTime) - asDate(b.dateTime));
  render();
}, (e) => {
  tableCard.style.display = "none";
  peopleCard.style.display = "none";
  emptyBox.hidden = false;
  emptyBox.querySelector(".empty-title").textContent = "Could not load the creditors book";
  emptyBox.querySelector(".empty-sub").textContent =
    e && e.code === "permission-denied"
      ? "Sign in again, then check your Firestore rules."
      : (e && e.message) || String(e);
  countLine.textContent = "";
});

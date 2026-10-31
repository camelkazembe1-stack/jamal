











import { requireAuth, db, collection, query, orderBy, onSnapshot } from "/firebase.js";

await requireAuth(); 

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
  return asDate(ts).toLocaleDateString("en-GB"); 
}

function plusDays(ts, days) {
  const d = new Date(asDate(ts));
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-GB");
}

const blanks4 = () => "<td></td><td></td><td></td><td></td>";


function cells(row) {
  if (!row) return blanks4();
  return '<td class="c-date">' + esc(row.date) + "</td>" +
         '<td class="c-detail">' + esc(row.detail) + "</td>" +
         '<td class="c-folio">' + esc(row.folio) + "</td>" +
         '<td class="c-amount">' + (row.amt ? esc(fmtAmount(row.amt)) : "") + "</td>";
}


function balCells(dateStr, label, amt) {
  return '<td class="c-date">' + esc(dateStr) + "</td>" +
         '<td class="c-detail">Balance</td>' +
         '<td class="c-folio">' + label + "</td>" +
         '<td class="c-amount">' + (amt != null ? esc(fmtAmount(amt)) : "") + "</td>";
}

function render() {
  
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
  const bal = drTotal - crTotal; 

  
  const cdDate = BOOK.length ? plusDays(BOOK[BOOK.length - 1].dateTime, 1) : "";
  const bdDate = BOOK.length ? plusDays(BOOK[BOOK.length - 1].dateTime, 2) : "";

  
  let html = "";
  const n = Math.max(dr.length, cr.length);
  for (let i = 0; i < n; i++) html += "<tr>" + cells(dr[i]) + cells(cr[i]) + "</tr>";

  
  if (bal > 0) html += '<tr class="cd-row">' + blanks4() + balCells(cdDate, "c/d", bal) + "</tr>";
  else if (bal < 0) html += '<tr class="cd-row">' + balCells(cdDate, "c/d", -bal) + blanks4() + "</tr>";
  body.innerHTML = html;

  
  
  const totDr = drTotal + (bal < 0 ? -bal : 0);
  const totCr = crTotal + (bal > 0 ? bal : 0);

  let f = '<tr class="total-row">' +
    "<td></td>" + '<td class="c-detail">Total</td>' + "<td></td>" +
    '<td class="c-amount">' + esc(fmtAmount(totDr)) + "</td>" +
    "<td></td>" + '<td class="c-detail">Total</td>' + "<td></td>" +
    '<td class="c-amount">' + esc(fmtAmount(totCr)) + "</td>" +
  "</tr>";

  
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

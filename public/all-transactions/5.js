// all-transactions (page 5) — every saved transaction, live from Firestore
// Table columns: Transaction Name | Date & Time | Flow Method |
//                Transaction Type | Name | Amount
import { requireAuth, db, collection, query, orderBy, onSnapshot } from "/firebase.js";

await requireAuth(); // not logged in? -> bounced to "/"

const $ = (s) => document.querySelector(s);
const body = $("#txn-body");
const emptyBox = $("#empty-state");
const countLine = $("#count-line");
const tableCard = $("#table-card");

let ALL = [];
let filter = "ALL";

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const TYPE_CLASS = { IN: "b-in", OUT: "b-out", NEUTRAL: "b-neutral", CONTRA: "b-contra" };

const isCharge = (t) => /charge/i.test(String(t.transactionName || ""));
const typeOf = (t) => String(t.transactionType || "").toUpperCase();

function fmtAmount(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fmtWhen(ts) {
  if (!ts) return "Just now"; // server timestamp still pending
  const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
}

function flowLabel(fm) {
  const s = String(fm || "").trim();
  return (!s || s.toUpperCase() === "N/A") ? "\u2014" : s;
}

function rowHTML(t) {
  const type = typeOf(t) || "\u2014";
  return "<tr>" +
    '<td class="c-name">' + esc(t.transactionName || "\u2014") +
      (isCharge(t) ? ' <span class="badge b-charge">Charge</span>' : "") + "</td>" +
    '<td class="c-when">' + esc(fmtWhen(t.dateTime)) + "</td>" +
    "<td>" + esc(flowLabel(t.flowMethod)) + "</td>" +
    '<td><span class="badge ' + (TYPE_CLASS[type] || "b-neutral") + '">' + esc(type) + "</span></td>" +
    "<td>" + (t.name ? esc(t.name) : "\u2014") + "</td>" +
    '<td class="c-amount">' + esc(fmtAmount(t.amount)) + "</td>" +
  "</tr>";
}

function render() {
  const rows = filter === "ALL" ? ALL : ALL.filter((t) => typeOf(t) === filter);
  body.innerHTML = rows.map(rowHTML).join("");
  const has = rows.length > 0;
  tableCard.style.display = has ? "" : "none";
  emptyBox.hidden = has;
  countLine.textContent = ALL.length
    ? "Showing " + rows.length + " of " + ALL.length + " transaction" + (ALL.length === 1 ? "" : "s") + "."
    : "";
  document.querySelectorAll(".tab").forEach((b) => {
    const k = b.dataset.type;
    const n = k === "ALL" ? ALL.length : ALL.filter((t) => typeOf(t) === k).length;
    b.querySelector(".n").textContent = n;
  });
}

/* filter tabs */
document.querySelectorAll(".tab").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    filter = btn.dataset.type;
    render();
  }));

/* live feed — updates automatically when Add Transaction saves something */
const q = query(collection(db, "transactions"), orderBy("dateTime", "desc"));
onSnapshot(q, (snap) => {
  ALL = snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }));
  ALL.sort((a, b) => { // newest first; identical stamps: original above its charge
    const ta = a.dateTime && a.dateTime.toDate ? a.dateTime.toDate().getTime() : 0;
    const tb = b.dateTime && b.dateTime.toDate ? b.dateTime.toDate().getTime() : 0;
    if (tb !== ta) return tb - ta;
    return (isCharge(a) ? 1 : 0) - (isCharge(b) ? 1 : 0);
  });
  render();
}, (e) => {
  tableCard.style.display = "none";
  emptyBox.hidden = false;
  emptyBox.querySelector(".empty-title").textContent = "Could not load transactions";
  emptyBox.querySelector(".empty-sub").textContent =
    e && e.code === "permission-denied"
      ? "Sign in again, then check your Firestore rules."
      : (e && e.message) || String(e);
});

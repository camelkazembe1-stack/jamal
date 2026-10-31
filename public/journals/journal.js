















import { requireAuth, db, collection, query, orderBy, onSnapshot } from "/firebase.js";

export function classify(t) {
  const type = String(t.transactionType || "").toUpperCase();
  if (type !== "IN" && type !== "OUT") return null; 
  const flow = String(t.flowMethod || "").trim().toLowerCase();
  const hay = (String(t.transactionName || "") + " " + String(t.name || "")).toLowerCase();
  if (hay.includes("petty")) return "petty";
  if (flow === "credit") {
    if (hay.includes("return"))
      return (hay.includes("purchas") || hay.includes("supplier")) ? "purchasesReturns" : "salesReturns";
    if (type === "IN" && (hay.includes("sale") || hay.includes("sold"))) return "sales";
    if (type === "OUT" && (hay.includes("purchas") || hay.includes("bought") || hay.includes("buy"))) return "purchases";
    return "general";
  }
  if (flow === "cash" || flow === "bank") return type === "IN" ? "cashReceipts" : "cashPayments";
  return null;
}

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fmtAmount(n) {
  return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function asDate(ts) {
  return typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
}

function fmtDate(ts) {
  if (!ts) return "\u2014";
  return asDate(ts).toLocaleDateString("en-GB"); 
}

 
const NAME_FIRST = { sales: 1, purchases: 1, salesReturns: 1, purchasesReturns: 1,
                     cashReceipts: 1, cashPayments: 1 };

export async function initJournal(journal) {
  await requireAuth(); 

  const $ = (s) => document.querySelector(s);
  const body = $("#j-body");
  const foot = $("#j-foot");
  const tableCard = $("#table-card");
  const emptyBox = $("#empty-state");
  const countLine = $("#count-line");

  function render(rows) {
    let f = "";
    if (journal === "general") {
      
      const dr = rows.filter((t) => String(t.transactionType || "").toUpperCase() === "OUT");
      const cr = rows.filter((t) => String(t.transactionType || "").toUpperCase() === "IN");
      const cell = (t) => t
        ? '<td class="j-date">' + esc(fmtDate(t.dateTime)) + "</td>" +
          '<td class="j-name">' + esc(t.transactionName || "\u2014") + "</td>" +
          '<td class="j-nm">' + esc(t.name || "\u2014") + "</td>" +
          '<td class="j-amount">' + esc(fmtAmount(t.amount)) + "</td>"
        : "<td></td><td></td><td></td><td></td>";
      let html = "";
      const n = Math.max(dr.length, cr.length);
      for (let i = 0; i < n; i++) html += "<tr>" + cell(dr[i]) + cell(cr[i]) + "</tr>";
      body.innerHTML = html;
      const dt = dr.reduce((s, t) => s + Number(t.amount || 0), 0);
      const ct = cr.reduce((s, t) => s + Number(t.amount || 0), 0);
      f = '<tr class="total-row">' +
        "<td></td><td></td>" + '<td class="j-name">Total</td>' +
        '<td class="j-amount">' + esc(fmtAmount(dt)) + "</td>" +
        "<td></td><td></td>" + '<td class="j-name">Total</td>' +
        '<td class="j-amount">' + esc(fmtAmount(ct)) + "</td></tr>";
      countLine.textContent = rows.length
        ? "Showing " + rows.length + " credit transaction" + (rows.length === 1 ? "" : "s") +
          " \u00B7 DR " + dr.length + " \u00B7 CR " + cr.length + "."
        : "";
    } else {
      let html = "";
      let total = 0;
      rows.forEach((t) => {
        const label = NAME_FIRST[journal]
          ? (t.name || t.transactionName || "\u2014")
          : (t.transactionName || t.name || "\u2014");
        total += Number(t.amount || 0);
        html += '<tr><td class="j-date">' + esc(fmtDate(t.dateTime)) + "</td>" +
                '<td class="j-name">' + esc(label) + "</td>" +
                '<td class="j-amount">' + esc(fmtAmount(t.amount)) + "</td></tr>";
      });
      body.innerHTML = html;
      f = '<tr class="total-row"><td></td><td class="j-name">Total</td>' +
          '<td class="j-amount">' + esc(fmtAmount(total)) + "</td></tr>";
      countLine.textContent = rows.length
        ? "Showing " + rows.length + " transaction" + (rows.length === 1 ? "" : "s") + "."
        : "";
    }
    foot.innerHTML = f;
    const has = rows.length > 0;
    tableCard.style.display = has ? "" : "none";
    emptyBox.hidden = has;
  }

   
  const q = query(collection(db, "transactions"), orderBy("dateTime", "asc"));
  onSnapshot(q, (snap) => {
    render(snap.docs
      .map((d) => d.data({ serverTimestamps: "estimate" }))
      .filter((t) => classify(t) === journal)
      .sort((a, b) => asDate(a.dateTime) - asDate(b.dateTime)));
  }, (e) => {
    tableCard.style.display = "none";
    emptyBox.hidden = false;
    emptyBox.querySelector(".empty-title").textContent = "Could not load this journal";
    emptyBox.querySelector(".empty-sub").textContent =
      e && e.code === "permission-denied"
        ? "Sign in again, then check your Firestore rules."
        : (e && e.message) || String(e);
    countLine.textContent = "";
  });
}

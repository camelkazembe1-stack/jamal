












import { requireAuth, db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "/firebase.js";
import { classify } from "/journals/journal.js";
import { actsHTML, wireActions } from "/books/row-actions.js";

await requireAuth(); 

const INC = "sales";          
const RET = "salesReturns";   
const PAY = "cashReceipts";   
const OPEN = "debtorsOpening";

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
  return asDate(ts).toLocaleDateString("en-GB"); 
}

const personOf = (t) => t.name || t.transactionName || "\u2014";

function render() {
  const rows = TXNS.map((t) => ({ t, kind: classify(t) }))
    .filter((r) => r.kind === INC || r.kind === RET || r.kind === PAY || r.kind === OPEN);

  
  
  const people = new Set(rows.filter((r) => r.kind !== PAY).map((r) => personOf(r.t)));
  const book = rows
    .filter((r) => r.kind !== PAY || people.has(personOf(r.t)))
    .sort((a, b) => asDate(a.t.dateTime) - asDate(b.t.dateTime));

  
  const bal = Object.create(null);
  let totInc = 0, totDec = 0;
  let html = "";
  book.forEach(({ t, kind }) => {
    const p = personOf(t);
    const amt = Number(t.amount || 0);
    const inc = (kind === INC || kind === OPEN) ? amt : 0;
    const dec = (kind === INC || kind === OPEN) ? 0 : amt; 
    bal[p] = (bal[p] || 0) + inc - dec;
    totInc += inc;
    totDec += dec;
    html += "<tr>" +
      '<td class="c-date">' + esc(fmtDate(t.dateTime)) + "</td>" +
      '<td class="c-detail">' + esc(t.transactionName || "\u2014") + "</td>" +
      '<td class="c-name">' + esc(p) + "</td>" +
      '<td class="c-amount">' + (inc ? esc(fmtAmount(inc)) : "") + "</td>" +
      '<td class="c-amount">' + (dec ? esc(fmtAmount(dec)) : "") + "</td>" +
      '<td class="c-amount">' + esc(fmtAmount(bal[p])) + actsHTML(t.id) + "</td>" +
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
      " across " + names.length + " debtor" + (names.length === 1 ? "" : "s") +
      ". Total outstanding receivable: " + fmtAmount(outstanding) + "."
    : "";
}

wireActions(body);

const regCard = $("#register-card");
const openBtn = $("#plus-btn");
const regErr = $("#reg-err");
const regOk = $("#reg-ok");
const regName = $("#reg-name");
const regAmount = $("#reg-amount");
const regSave = $("#reg-save");
const regCancel = $("#reg-cancel");

function closeReg() {
  regCard.hidden = true;
  openBtn.setAttribute("aria-expanded", "false");
  regErr.hidden = true;
  regOk.hidden = true;
  regName.value = "";
  regAmount.value = "";
}

openBtn.addEventListener("click", () => {
  const show = regCard.hidden;
  regCard.hidden = !show;
  openBtn.setAttribute("aria-expanded", String(show));
  if (show) { regErr.hidden = true; regOk.hidden = true; regName.focus(); }
  else closeReg();
});

regCancel.addEventListener("click", closeReg);

regSave.addEventListener("click", async () => {
  regErr.hidden = true;
  regOk.hidden = true;
  const name = regName.value.trim();
  const amt = Number(regAmount.value);
  if (!name) {
    regErr.textContent = "Enter the customer's name first.";
    regErr.hidden = false;
    regName.focus();
    return;
  }
  if (!amt || amt <= 0) {
    regErr.textContent = "Enter the amount they owe \u2014 more than zero.";
    regErr.hidden = false;
    regAmount.focus();
    return;
  }
  regSave.disabled = true;
  try {
    await addDoc(collection(db, "transactions"), {
      transactionName: "Debtors Opening",
      dateTime: serverTimestamp(),
      flowMethod: "Credit",
      transactionType: "IN",
      name,
      amount: amt
    });
    regOk.textContent = name + " registered \u2014 the brought-forward balance of " +
      fmtAmount(amt) + " now sits in the book.";
    regOk.hidden = false;
    regName.value = "";
    regAmount.value = "";
    regName.focus();
  } catch (e) {
    const deny = e && (e.code === "permission-denied" ||
      String(e && e.message).indexOf("insufficient permissions") !== -1);
    regErr.textContent = deny
      ? "Save blocked: the database rules are not published yet. Open the Firebase console -> Firestore Database -> Rules, paste the latest rules, press Publish."
      : "Could not save: " + ((e && e.message) || e);
    regErr.hidden = false;
  } finally {
    regSave.disabled = false;
  }
});
 
const q = query(collection(db, "transactions"), orderBy("dateTime", "asc"));
onSnapshot(q, (snap) => {
  TXNS = snap.docs
    .map((d) => Object.assign({ id: d.id }, d.data({ serverTimestamps: "estimate" })))
    .sort((a, b) => asDate(a.dateTime) - asDate(b.dateTime));
  render();
}, (e) => {
  tableCard.style.display = "none";
  peopleCard.style.display = "none";
  emptyBox.hidden = false;
  emptyBox.querySelector(".empty-title").textContent = "Could not load the debtors book";
  emptyBox.querySelector(".empty-sub").textContent =
    e && e.code === "permission-denied"
      ? "Sign in again, then check your Firestore rules."
      : (e && e.message) || String(e);
  countLine.textContent = "";
});

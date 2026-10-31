



















import { classify } from "/journals/journal.js";

const FOLIO = { petty: "PB", sales: "SJ", purchases: "PJ", salesReturns: "SR",
                purchasesReturns: "PR", general: "GJ", cashReceipts: "CRJ", cashPayments: "CPJ" };
export const CORE = ["Cash", "Bank", "Sales", "Purchases", "Sales Returns", "Purchases Returns"];

export const asDate = (ts) =>
  typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);

export function fmtDate(ts) {
  if (!ts) return "\u2014";
  return asDate(ts).toLocaleDateString("en-GB"); 
}

const typeOf = (t) => String(t.transactionType || "").toUpperCase();
const flowOf = (t) => String(t.flowMethod || "").trim().toLowerCase();
const hayOf = (t) => (String(t.transactionName || "") + " " + String(t.name || "")).toLowerCase();

const hasRet = (t) => hayOf(t).includes("return");
const purchasy = (t) => hayOf(t).includes("purchas") || hayOf(t).includes("supplier");
const isSRet = (t) => hasRet(t) && !purchasy(t);   
const isPRet = (t) => hasRet(t) && purchasy(t);
const isSale = (t) => typeOf(t) === "IN" && !hasRet(t) &&
  (hayOf(t).includes("sale") || hayOf(t).includes("sold"));
const isPurchase = (t) => typeOf(t) === "OUT" && !hasRet(t) &&
  (hayOf(t).includes("purchas") || hayOf(t).includes("bought") || hayOf(t).includes("buy"));

const moneyAcct = (t) => (flowOf(t) === "bank" ? "Bank" : "Cash");
const moneyDetail = (t) =>
  flowOf(t) === "bank" ? "Bank" : flowOf(t) === "cash" ? "Cash" : null;
const nominal = (t) => (t.transactionName || "General"); 

export function postingsFor(t, creditPeople) {
  const type = typeOf(t);
  const flow = flowOf(t);
  const person = t.name || null;
  const txn = t.transactionName || "";
  const folio = FOLIO[classify(t)] || "\u2014";
  const date = fmtDate(t.dateTime);
  const amt = Number(t.amount || 0);
  const row = (acct, detail, kind) => ({ acct, detail: detail || "\u2014", folio, date, amt, kind });

  if (isSRet(t)) {
    const dr = row("Sales Returns", person || moneyDetail(t), "expense");
    const cr = person
      ? row(person, "Sales Returns", "person")
      : row(flow === "credit" ? "Sundry Debtors" : moneyAcct(t), "Sales Returns",
            flow === "credit" ? "asset" : "asset");
    return { dr, cr };
  }
  if (isPRet(t)) {
    const cr = row("Purchases Returns", person || moneyDetail(t), "revenue");
    const dr = person
      ? row(person, "Purchases Returns", "person")
      : row(flow === "credit" ? "Sundry Creditors" : moneyAcct(t), "Purchases Returns", "asset");
    return { dr, cr };
  }
  if (isSale(t)) {
    const cr = row("Sales", person || moneyDetail(t), "revenue");
    const dr = flow === "credit"
      ? row(person || "Sundry Debtors", "Sales", person ? "person" : "asset")
      : row(moneyAcct(t), "Sales", "asset");
    return { dr, cr };
  }
  if (isPurchase(t)) {
    const dr = row("Purchases", person || moneyDetail(t), "expense");
    const cr = flow === "credit"
      ? row(person || "Sundry Creditors", "Purchases", person ? "person" : "liability")
      : row(moneyAcct(t), "Purchases", "asset");
    return { dr, cr };
  }
  if (type === "IN") { 
    const dr = flow === "credit"
      ? row(person || "Sundry Debtors", txn, person ? "person" : "asset")
      : row(moneyAcct(t), txn || "Receipt", "asset");
    const cr = (person && flow !== "credit" && creditPeople.has(person))
      ? row(person, moneyDetail(t), "person")
      : row(nominal(t), flow === "credit" ? (person || "Credit") : (person || moneyDetail(t)), "revenue");
    return { dr, cr };
  }
  
  const cr = flow === "credit"
    ? row(person || "Sundry Creditors", txn, person ? "person" : "liability")
    : row(moneyAcct(t), txn || "Payment", "asset");
  const dr = (person && flow !== "credit" && creditPeople.has(person))
    ? row(person, moneyDetail(t), "person")
    : row(nominal(t), flow === "credit" ? (person || "Credit") : (person || moneyDetail(t)), "expense");
  return { dr, cr };
}




export function buildAccounts(txns) {
  const live = txns.filter((t) => typeOf(t) === "IN" || typeOf(t) === "OUT");
  const creditPeople = new Set(
    live.filter((t) => flowOf(t) === "credit" && t.name).map((t) => t.name));
  const accts = new Map();
  const acctOf = (name, kind) => {
    let a = accts.get(name);
    if (!a) { a = { dr: [], cr: [], lastTs: null, kind: kind || "asset" }; accts.set(name, a); }
    return a;
  };
  live.forEach((t) => {
    const p = postingsFor(t, creditPeople);
    acctOf(p.dr.acct, p.dr.kind).dr.push(p.dr);
    acctOf(p.cr.acct, p.cr.kind).cr.push(p.cr);
    const a1 = acctOf(p.dr.acct), a2 = acctOf(p.cr.acct);
    if (!a1.lastTs || asDate(t.dateTime) > asDate(a1.lastTs)) a1.lastTs = t.dateTime;
    if (!a2.lastTs || asDate(t.dateTime) > asDate(a2.lastTs)) a2.lastTs = t.dateTime;
  });
  const names = [...accts.keys()];
  const order = CORE.filter((n) => accts.has(n))
    .concat(names.filter((n) => !CORE.includes(n) && !creditPeople.has(n))
      .sort((a, b) => a.localeCompare(b)))
    .concat(names.filter((n) => creditPeople.has(n))
      .sort((a, b) => a.localeCompare(b)));
  return { order, accts, creditPeople };
}



export function accountBalance(accts, name) {
  const a = accts.get(name);
  if (!a) return 0;
  return a.dr.reduce((s, r) => s + r.amt, 0) - a.cr.reduce((s, r) => s + r.amt, 0);
}


import { initIS } from "/reports/507.js";

initIS({ root: "#app" });

/* jamali-inline:507.js */
// ---------------------------------------------------------------------------
// JAMALI - Ledger reports (public/507.js)
// Every view that reads the double-entry postings built by /510.js
// and turns them into a balanced statement: Trial Balance, Adjusted Trial
// Balance, Post-Closing Trial Balance, General Ledger Report and Bank
// Reconciliation. Pages 41, 42, 43, 53 and 55 import from here.
// ---------------------------------------------------------------------------

import { requireAuth, onSnapshot } from "/firebase.js";

import {
  shell, rowCells, totalCells, collRef, readColl, readTx, failState, showEmpty,
  money, parseDay, fmtDay, fmtBal, esc, periodBar, acctSelect
} from "./core.js";

export async function initTB(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Account" }, { label: "Debit", amt: true }, { label: "Credit", amt: true }
  ], { icon: "\u2696\uFE0F" });
  onSnapshot(collRef("transactions"), (snap) => {
    const txns = snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }));
    const M = buildAccounts(txns);
    if (!M.order.length) return showEmpty(ui, "No postings yet",
      "Add transactions (IN / OUT) and the Trial Balance builds itself from the double-entry postings.");
    let drT = 0, crT = 0, html = "";
    M.order.forEach((name) => {
      const a = M.accts.get(name);
      const dr = a.dr.reduce((s, r) => s + r.amt, 0);
      const cr = a.cr.reduce((s, r) => s + r.amt, 0);
      const bal = dr - cr;
      if (bal > 0) { drT += bal; html += rowCells([{ v: name + " A/C", strong: true }, { v: money(bal), amt: true }, ""]); }
      else if (bal < 0) { crT += -bal; html += rowCells([{ v: name + " A/C", strong: true }, "", { v: money(-bal), amt: true }]); }
      else html += rowCells([{ v: name + " A/C", strong: true }, "", ""]);
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, drT, crT]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = M.order.length + " accounts \u00B7 Debits " + money(drT) +
      " = Credits " + money(crT) + (drT === crT ? " \u2014 balanced." : " \u2014 OUT OF BALANCE.");
  }, (e) => failState(ui, e, "the Trial Balance"));
}

function adjustedModel(txns, adjs) {
  const M = buildAccounts(txns);
  const adjDR = Object.create(null), adjCR = Object.create(null);
  adjs.forEach((a) => {
    const amt = Number(a.amount || 0);
    if (a.drAcct) adjDR[a.drAcct] = (adjDR[a.drAcct] || 0) + amt;
    if (a.crAcct) adjCR[a.crAcct] = (adjCR[a.crAcct] || 0) + amt;
  });
  const names = [...new Set(M.order.concat(Object.keys(adjDR), Object.keys(adjCR)))].sort((a, b) => {
    const ka = M.accts.has(a) ? 0 : 1, kb = M.accts.has(b) ? 0 : 1;
    return ka - kb || a.localeCompare(b);
  });
  const rows = names.map((name) => {
    const a = M.accts.get(name);
    const dr = a ? a.dr.reduce((s, r) => s + r.amt, 0) : 0;
    const cr = a ? a.cr.reduce((s, r) => s + r.amt, 0) : 0;
    const ad = adjDR[name] || 0, ac = adjCR[name] || 0;
    const bal = dr + ad - cr - ac;
    return { name, kind: a ? a.kind : "asset", dr, cr, ad, ac, bal };
  });
  return rows;
}

export async function initAdjTB(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Account" }, { label: "TB Debit", amt: true }, { label: "TB Credit", amt: true },
    { label: "Adj DR", amt: true }, { label: "Adj CR", amt: true },
    { label: "Adjusted DR", amt: true }, { label: "Adjusted CR", amt: true }
  ], { icon: "\uD83E\uDDEE" });
  let TX = null, ADJ = null;
  const render = () => {
    if (!TX || !ADJ) return;
    const rows = adjustedModel(TX, ADJ);
    if (!rows.length) return showEmpty(ui, "Nothing to adjust yet",
      "The Adjusted Trial Balance = Trial Balance + adjusting entries. Add an adjustment below.");
    let t = [0, 0, 0, 0, 0, 0], html = "";
    rows.forEach((r) => {
      const adj = r.ad > 0 || r.ac > 0;
      html += rowCells([
        { v: r.name + " A/C", strong: true },
        r.dr ? { v: money(r.dr), amt: true } : "",
        r.cr ? { v: money(r.cr), amt: true } : "",
        r.ad ? { v: money(r.ad), amt: true } : "",
        r.ac ? { v: money(r.ac), amt: true } : "",
        r.bal > 0 ? { v: money(r.bal), amt: true } : "",
        r.bal < 0 ? { v: money(-r.bal), amt: true } : ""
      ]);
      t[0] += r.dr; t[1] += r.cr; t[2] += r.ad; t[3] += r.ac;
      if (r.bal > 0) t[4] += r.bal; else t[5] += -r.bal;
      void adj;
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, t[0], t[1], t[2], t[3], t[4], t[5]]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = rows.length + " accounts \u00B7 adjustments " + ADJ.length +
      " \u00B7 adjusted totals " + money(t[4]) + " = " + money(t[5]) + (t[4] === t[5] ? " \u2014 balanced." : " \u2014 OUT OF BALANCE.");
  };
  onSnapshot(collRef("transactions"), (s) => { TX = s.docs.map((d) => d.data({ serverTimestamps: "estimate" })); render(); },
    (e) => failState(ui, e, "the Adjusted Trial Balance"));
  readColl("adjustments", (a) => { ADJ = a; render(); });
}

export async function initPostTB(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Account" }, { label: "Debit", amt: true }, { label: "Credit", amt: true }
  ], { icon: "\uD83D\uDD12" });
  let TX = null, ADJ = null;
  const render = () => {
    if (!TX || !ADJ) return;
    const rows = adjustedModel(TX, ADJ);
    const real = rows.filter((r) => r.kind !== "revenue" && r.kind !== "expense" && r.bal !== 0);
    const profit = -rows.filter((r) => r.kind === "revenue" || r.kind === "expense")
      .reduce((s, r) => s + r.bal, 0); 
    if (!real.length && !profit) return showEmpty(ui, "No real accounts yet",
      "After the closing entries only assets, liabilities, persons and Capital remain here.");
    let drT = 0, crT = 0, html = "";
    real.forEach((r) => {
      if (r.bal > 0) { drT += r.bal; html += rowCells([{ v: r.name + " A/C", strong: true }, { v: money(r.bal), amt: true }, ""]); }
      else { crT += -r.bal; html += rowCells([{ v: r.name + " A/C", strong: true }, "", { v: money(-r.bal), amt: true }]); }
    });
    if (profit > 0) { crT += profit; html += rowCells([{ v: "Capital A/C", strong: true }, "", { v: money(profit), amt: true }]); }
    else if (profit < 0) { drT += -profit; html += rowCells([{ v: "Capital A/C", strong: true }, { v: money(-profit), amt: true }, ""]); }
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, drT, crT]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = "Nominal accounts closed to Capital \u00B7 net profit " + money(profit) +
      " \u00B7 totals " + money(drT) + " = " + money(crT) + (drT === crT ? " \u2014 balanced." : " \u2014 OUT OF BALANCE.");
  };
  onSnapshot(collRef("transactions"), (s) => { TX = s.docs.map((d) => d.data({ serverTimestamps: "estimate" })); render(); },
    (e) => failState(ui, e, "the Post-Closing Trial Balance"));
  readColl("adjustments", (a) => { ADJ = a; render(); });
}

const SERIES = { asset: 100, liability: 200, person: 300, revenue: 400, expense: 500 };

function acctNumbers(M) {
  const nums = new Map(), next = {};
  M.order.forEach((n) => {
    const k = M.accts.get(n).kind || "asset";
    next[k] = (next[k] || SERIES[k]) + 1;
    nums.set(n, next[k]);
  });
  return nums;
}

export async function initGLReport(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Date" }, { label: "Folio" }, { label: "Detail" },
    { label: "Debit", amt: true }, { label: "Credit", amt: true }, { label: "Balance", amt: true },
  ], { icon: "\uD83D\uDCD7" });
  const pb = periodBar(cfg.root, "range");
  const sel = acctSelect(ui);
  let TX = null;
  const render = () => {
    if (!TX) return;
    const M = buildAccounts(TX);
    if (!M.order.length) { sel.style.display = "none"; return showEmpty(ui, "No postings yet",
      "Add transactions and the General Ledger Report builds itself from the double-entry postings behind the Ledger."); }
    sel.style.display = "";
    const nums = acctNumbers(M);
    const cur = sel.value;
    sel.innerHTML = M.order.map((n) =>
      '<option value="' + esc(n) + '">' + esc(nums.get(n) + " \u2014 " + n + " A/C") + "</option>").join("");
    sel.value = cur && nums.has(cur) ? cur : M.order[0];
    const acct = sel.value;
    const rows = [];
    TX.forEach((t) => {
      const ty = String(t.transactionType || "").toUpperCase();
      if (ty !== "IN" && ty !== "OUT" && ty !== "CONTRA") return;
      const p = postingsFor(t, M.creditPeople);
      const ts = asDate(t.dateTime);
      if (p.dr.acct === acct) rows.push({ ts, detail: p.dr.detail, folio: p.dr.folio, amt: p.dr.amt, side: "dr" });
      if (p.cr.acct === acct) rows.push({ ts, detail: p.cr.detail, folio: p.cr.folio, amt: p.cr.amt, side: "cr" });
    });
    rows.sort((a, b) => a.ts - b.ts || (a.side === b.side ? 0 : a.side === "dr" ? -1 : 1));
    const f = pb.from() ? parseDay(pb.from()) : null;
    const tt = pb.to() ? parseDay(pb.to()) : null;
    if (tt) tt.setHours(23, 59, 59, 999);
    const opening = rows.filter((r) => f && r.ts < f)
      .reduce((s, r) => s + (r.side === "dr" ? r.amt : -r.amt), 0);
    const per = rows.filter((r) => (!f || r.ts >= f) && (!tt || r.ts <= tt));
    let run = opening, dT = 0, cT = 0, html = "";
    html += rowCells([{ v: "\u2014", date: 1 }, "\u2014", { v: "Opening balance", strong: true }, "", "", { v: fmtBal(opening), amt: true }]);
    per.forEach((r) => {
      run += r.side === "dr" ? r.amt : -r.amt;
      if (r.side === "dr") dT += r.amt; else cT += r.amt;
      html += rowCells([{ v: fmtDay(r.ts), date: 1 }, r.folio, r.detail,
        r.side === "dr" ? { v: money(r.amt), amt: true } : "",
        r.side === "cr" ? { v: money(r.amt), amt: true } : "",
        { v: fmtBal(run), amt: true }]);
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = '<tr class="total-row"><td class="c-desc">Period total</td><td></td><td></td>' +
      '<td class="c-amount">' + esc(money(dT)) + '</td><td class="c-amount">' + esc(money(cT)) +
      '</td><td class="c-amount">' + esc(fmtBal(run)) + "</td></tr>";
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = "Account " + nums.get(acct) + " \u00B7 " + per.length +
      " entr" + (per.length === 1 ? "y" : "ies") + " in the period \u00B7 opening " + fmtBal(opening) +
      " \u00B7 closing " + fmtBal(run) + ".";
  };
  pb.onChange(render);
  sel.addEventListener("change", render);
  readTx((tx) => { TX = tx; render(); }, (e) => failState(ui, e, "the General Ledger Report"));
}

const REC_EFFECT = {
  "Balance per bank statement": null,
  "Deposit in transit": +1,
  "Outstanding cheque": -1,
  "Bank charge": -1,
  "Bank credit": +1,
  "Error": 0 
};

export async function initBankRec(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [], { icon: "\uD83C\uDFE7", kv: true });
  ui.card.style.display = "none"; 
  let BOOK = null, ITEMS = null;
  const render = () => {
    if (!BOOK || !ITEMS) return;
    if (!ITEMS.length) return showEmpty(ui, "No reconciling items yet",
      "Add the balance per bank statement and the reconciling items below \u2014 JAMALI compares them with the Bank A/C in the books.");
    const sorted = ITEMS.slice().sort((a, b) => (parseDay(a.date) || 0) - (parseDay(b.date) || 0));
    const stmt = [...sorted].reverse().find((i) => i.type === "Balance per bank statement");
    if (!stmt) return showEmpty(ui, "No bank statement balance yet",
      "Add an item of type \u201CBalance per bank statement\u201D first \u2014 the reconciliation starts from it.");
    const stmtAmt = Number(stmt.amount || 0);
    const sums = { dep: 0, chq: 0, charge: 0, credit: 0, err: 0 };
    ITEMS.forEach((i) => {
      const amt = Number(i.amount || 0);
      if (i.type === "Deposit in transit") sums.dep += amt;
      else if (i.type === "Outstanding cheque") sums.chq += amt;
      else if (i.type === "Bank charge") sums.charge += amt;
      else if (i.type === "Bank credit") sums.credit += amt;
      else if (i.type === "Error") sums.err += amt;
    });
    const adjusted = stmtAmt + sums.dep - sums.chq - sums.charge + sums.credit + sums.err;
    const book = accountBalance(BOOK.accts, "Bank"); 
    const diff = adjusted - book;
    ui.kvTitle.textContent = "Bank Reconciliation as at " + fmtDay(stmt.date);
    const line = (k, v, cls) => '<div class="kv' + (cls ? " hl" : "") + '"><span class="k">' + esc(k) +
      '</span><span class="v ' + (cls ? (diff === 0 ? "pos" : "neg") : "") + '">' + esc(money(v)) + "</span></div>";
    ui.kvRows.innerHTML =
      line("Balance per bank statement", stmtAmt) +
      (sums.dep ? line("Add: deposits in transit", sums.dep) : "") +
      (sums.chq ? line("Less: outstanding cheques", sums.chq) : "") +
      (sums.charge ? line("Less: bank charges", sums.charge) : "") +
      (sums.credit ? line("Add: bank credits", sums.credit) : "") +
      (sums.err ? line("Add/Less: errors", sums.err) : "") +
      line("Adjusted bank balance", adjusted, 1) +
      line("Balance as per books (Bank A/C)", book) +
      line("Difference (must be zero)", diff, 1);
    ui.kv.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = ITEMS.length + " items \u00B7 book balance " + money(book) +
      (book < 0 ? " (overdrawn)" : "") + " \u00B7 difference " + money(diff) +
      (diff === 0 ? " \u2014 reconciled." : " \u2014 record the missing items.");
  };
  onSnapshot(collRef("transactions"), (s) => {
    BOOK = buildAccounts(s.docs.map((d) => d.data({ serverTimestamps: "estimate" })));
    render();
  }, (e) => failState(ui, e, "the Bank Reconciliation"));
  readColl("bankrec", (i) => { ITEMS = i; render(); });
}

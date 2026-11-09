

initAP({ root: "#app" });

/* jamali-inline:514.js */
// ---------------------------------------------------------------------------
// JAMALI - People reports (public/514.js)
// Debtors and creditors on one party engine: partyModel builds each person's
// event list from credit sales/purchases, brought-forward openings, returns,
// settlements, register invoices and credit/debit notes.
//   AR and AP Schedules (journal-only proof, pages 44 and 45)
//   AR and AP Reports (with open items, pages 56 and 57)
//   Customer and Supplier Statements (pages 58 and 59)
//   Aged Receivables and Aged Payables (pages 60 and 61)
// ---------------------------------------------------------------------------

import { requireAuth } from "/firebase.js";


import {
  shell, rowCells, totalCells, readColl, readTx, failState, showEmpty,
  money, parseDay, fmtDay, startOfDay, today, addDays, DAY, esc,
  periodBar, acctSelect, kvRow, fmtBal
} from "./core.js";

function partyModel(txns, invoices, notes, dir) {
  
  const invDir = dir === "sales" ? "sales" : "purchase";
  const ret = dir === "sales" ? "salesReturns" : "purchasesReturns";
  const pay = dir === "sales" ? "cashReceipts" : "cashPayments";
  const noteDir = dir === "sales" ? "credit" : "debit";
  const open = dir === "sales" ? "debtorsOpening" : "creditorsOpening";
  
  
  
  const debtPeople = new Set(
    txns.filter((t) => { const k = classify(t); return (k === dir || k === open) && t.name; })
      .map((t) => t.name));
  invoices.forEach((v) => { if (v.direction === invDir && v.party) debtPeople.add(v.party); });

  const ev = new Map();
  const add = (p, e) => { if (!p) return; let a = ev.get(p); if (!a) { a = []; ev.set(p, a); } a.push(e); };

  txns.forEach((t) => {
    const c = classify(t); if (!c) return;
    const p = t.name; if (!p) return;
    const ts = asDate(t.dateTime);
    const amt = Number(t.amount || 0);
    if (c === dir) add(p, { ts, kind: "main", detail: t.transactionName || "Sale", ref: dir === "sales" ? "SJ" : "PJ", src: "Journal", inc: amt, dec: 0 });
    else if (c === open) add(p, { ts, kind: "main", detail: t.transactionName || "Opening", ref: "OB", src: "Journal", inc: amt, dec: 0 });
    else if (c === ret && debtPeople.has(p)) add(p, { ts, kind: "ret", detail: t.transactionName || "Return", ref: dir === "sales" ? "SR" : "PR", src: "Journal", inc: 0, dec: amt });
    else if (c === pay && debtPeople.has(p)) add(p, { ts, kind: "pay", detail: t.transactionName || "Payment", ref: dir === "sales" ? "CRJ" : "CPJ", src: "Journal", inc: 0, dec: amt });
  });
  invoices.forEach((v) => {
    if (v.direction !== invDir || !v.party) return;
    add(v.party, { ts: parseDay(v.date), kind: "inv", detail: v.description || "Invoice", ref: v.invNo || "\u2014", src: "Register", inc: Number(v.total || 0), dec: 0, due: parseDay(v.dueDate) });
  });
  notes.forEach((n) => {
    if (n.direction !== noteDir || !n.party || !debtPeople.has(n.party)) return;
    add(n.party, { ts: parseDay(n.date), kind: "note", detail: n.reason || (dir === "sales" ? "Credit note" : "Debit note"), ref: n.no || "\u2014", src: dir === "sales" ? "Credit note" : "Debit note", inc: 0, dec: Number(n.amount || 0) });
  });

  const people = [...ev.keys()].filter((p) => ev.get(p).some((e) => e.inc > 0));
  people.forEach((p) => ev.get(p).sort((a, b) => a.ts - b.ts));
  const rows = people.map((p) => {
    const events = ev.get(p);
    const inc = events.reduce((s, e) => s + e.inc, 0);
    const dec = events.reduce((s, e) => s + e.dec, 0);
    const pays = events.filter((e) => e.kind === "pay").reduce((s, e) => s + e.dec, 0);
    return { party: p, events, inc, dec, pays, adj: dec - pays, bal: inc - dec,
             nInv: events.filter((e) => e.inc > 0).length };
  });
  rows.sort((a, b) => b.bal - a.bal || a.party.localeCompare(b.party));
  return rows;
}

function openItems(row) {
  const items = row.events.filter((e) => e.inc > 0).map((e) => ({
    ref: e.ref, date: startOfDay(e.ts),
    due: e.due ? startOfDay(e.due) : addDays(startOfDay(e.ts), 30),
    amt: e.inc,
  })).sort((a, b) => a.due - b.due || a.date - b.date);
  let left = row.events.filter((e) => e.dec > 0).reduce((s, e) => s + e.dec, 0);
  items.forEach((it) => {
    const a = Math.max(0, Math.min(left, it.amt));
    it.settled = a; it.out = it.amt - a; left -= a;
  });
  return { items, unallocated: Math.max(0, left) };
}

function bucketsOf(row, asof) {
  const b = { cur: 0, d30: 0, d60: 0, d90: 0, d90p: 0 };
  openItems(row).items.forEach((it) => {
    if (it.out <= 0) return;
    const over = Math.floor((asof - it.due) / DAY);
    if (over <= 0) b.cur += it.out;
    else if (over <= 30) b.d30 += it.out;
    else if (over <= 60) b.d60 += it.out;
    else if (over <= 90) b.d90 += it.out;
    else b.d90p += it.out;
  });
  return b;
}

function scheduleRows(txns, dir) {
  // The journal-only schedule view, computed on the one party engine: with no
  // register invoices and no notes, partyModel reduces to the old partySchedule.
  return partyModel(txns, [], [], dir).map((r) => ({
    party: r.party,
    main: r.events.filter((e) => e.kind === "main").reduce((s, e) => s + e.inc, 0),
    ret: r.events.filter((e) => e.kind === "ret").reduce((s, e) => s + e.dec, 0),
    pay: r.events.filter((e) => e.kind === "pay").reduce((s, e) => s + e.dec, 0)
  }));
}

export async function initAR(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Customer" }, { label: "Credit Sales", amt: true }, { label: "Sales Returns", amt: true },
    { label: "Receipts", amt: true }, { label: "Balance Due", amt: true }
  ], { icon: "\uD83E\uDD1D" });
  readTx((txns) => {
    const rows = scheduleRows(txns, "sales");
    if (!rows.length) return showEmpty(ui, "No credit sales yet",
      "The Accounts Receivable Schedule is generated from credit sales, sales returns and receipts.");
    let t = [0, 0, 0, 0], html = "";
    rows.forEach((r) => {
      const bal = r.main - r.ret - r.pay;
      html += rowCells([{ v: r.party, strong: true },
        { v: money(r.main), amt: true },
        r.ret ? { v: money(r.ret), amt: true } : "",
        r.pay ? { v: money(r.pay), amt: true } : "",
        { v: money(bal), amt: true, pos: bal <= 0 }]);
      t[0] += r.main; t[1] += r.ret; t[2] += r.pay; t[3] += bal;
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, t[0], t[1], t[2], t[3]]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = rows.length + " customer" + (rows.length === 1 ? "" : "s") +
      " \u00B7 total due " + money(t[3]) + " (matches the Debtors Book).";
  }, (e) => failState(ui, e, "the AR Schedule"));
}

export async function initAP(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Supplier" }, { label: "Credit Purchases", amt: true }, { label: "Purchase Returns", amt: true },
    { label: "Payments", amt: true }, { label: "Balance Owed", amt: true }
  ], { icon: "\uD83C\uDFE6" });
  readTx((txns) => {
    const rows = scheduleRows(txns, "purchases");
    if (!rows.length) return showEmpty(ui, "No credit purchases yet",
      "The Accounts Payable Schedule is generated from credit purchases, purchase returns and payments.");
    let t = [0, 0, 0, 0], html = "";
    rows.forEach((r) => {
      const bal = r.main - r.ret - r.pay;
      html += rowCells([{ v: r.party, strong: true },
        { v: money(r.main), amt: true },
        r.ret ? { v: money(r.ret), amt: true } : "",
        r.pay ? { v: money(r.pay), amt: true } : "",
        { v: money(bal), amt: true, pos: bal <= 0 }]);
      t[0] += r.main; t[1] += r.ret; t[2] += r.pay; t[3] += bal;
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, t[0], t[1], t[2], t[3]]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = rows.length + " supplier" + (rows.length === 1 ? "" : "s") +
      " \u00B7 total owed " + money(t[3]) + " (matches the Creditors Book).";
  }, (e) => failState(ui, e, "the AP Schedule"));
}

function openItemsCard(ui) {
  const ic = document.createElement("div");
  ic.className = "card table-card";
  ic.style.display = "none";
  ic.innerHTML = '<h2 class="r2-h2">Open items \u2014 every invoice and journalled sale/purchase, with settlements allocated oldest due date first</h2>' +
    '<div class="table-wrap"><table class="bk"><thead><tr>' +
    "<th>Party</th><th>Ref</th><th>Invoice Date</th><th>Due Date</th><th>Amount</th><th>Settled</th><th>Outstanding</th>" +
    '</tr></thead><tbody class="r2-items"></tbody><tfoot class="r2-items-foot"></tfoot></table></div>';
  ui.root.insertBefore(ic, ui.empty);
  return ic;
}

async function initPartyReport(cfg, dir) {
  await requireAuth();
  const isAR = dir === "sales";
  const ui = shell(cfg.root, [
    { label: isAR ? "Customer" : "Supplier" }, { label: "Invoices" },
    { label: isAR ? "Invoiced" : "Billed", amt: true },
    { label: isAR ? "Payments Received" : "Payments Made", amt: true },
    { label: isAR ? "Credit Notes & Returns" : "Debit Notes & Returns", amt: true },
    { label: isAR ? "Outstanding" : "Owed", amt: true },
  ], { icon: isAR ? "\uD83E\uDD1D" : "\uD83C\uDFE6", side: true });
  const ic = openItemsCard(ui);
  let TX = null, INV = null, NT = null;
  const render = () => {
    if (!TX || !INV || !NT) return;
    const rows = partyModel(TX, INV, NT, dir);
    if (!rows.length) { ic.style.display = "none"; return showEmpty(ui,
      isAR ? "No customer debt yet" : "No supplier debt yet",
      "This report is generated from credit " + (isAR ? "sales" : "purchases") + ", the " +
      (isAR ? "Sales Invoice" : "Purchase Invoice") + " Register, returns, settlements and " +
      (isAR ? "credit" : "debit") + " notes \u2014 no re-entry."); }
    let t = [0, 0, 0, 0, 0], html = "";
    rows.forEach((r) => {
      html += rowCells([{ v: r.party, strong: true }, { v: r.nInv, num: 1 },
        { v: money(r.inc), amt: true },
        r.pays ? { v: money(r.pays), amt: true } : "",
        r.adj ? { v: money(r.adj), amt: true } : "",
        { v: money(r.bal), amt: true, pos: r.bal <= 0 }]);
      t[0] += r.nInv; t[1] += r.inc; t[2] += r.pays; t[3] += r.adj; t[4] += r.bal;
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, t[0], t[1], t[2], t[3], t[4]]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.sideTitle.textContent = isAR ? "Balance due per customer" : "Balance owed per supplier";
    ui.sideBody.innerHTML = rows.map((r) =>
      '<tr><td class="c-party">' + esc(r.party) + '</td><td class="c-amount">' + esc(money(r.bal)) + "</td></tr>").join("");
    ui.side.style.display = "";
    let iAmt = 0, iSet = 0, iOut = 0, unalloc = 0, ih = "";
    rows.forEach((r) => {
      const oi = openItems(r);
      unalloc += oi.unallocated;
      oi.items.forEach((it) => {
        iAmt += it.amt; iSet += it.settled; iOut += it.out;
        ih += rowCells([{ v: r.party, strong: true }, { v: it.ref, num: 1 },
          { v: fmtDay(it.date), date: 1 }, { v: fmtDay(it.due), date: 1 },
          { v: money(it.amt), amt: true },
          it.settled ? { v: money(it.settled), amt: true } : "",
          { v: money(it.out), amt: true, pos: it.out <= 0 }]);
      });
    });
    ic.querySelector(".r2-items").innerHTML = ih;
    ic.querySelector(".r2-items-foot").innerHTML = totalCells([{ label: 1 }, null, null, null, iAmt, iSet, iOut]);
    ic.style.display = iAmt ? "" : "none";
    ui.count.textContent = rows.length + " " + (isAR ? "customer" : "supplier") + (rows.length === 1 ? "" : "s") +
      " \u00B7 invoiced " + money(t[1]) + " \u00B7 payments " + money(t[2]) + " \u00B7 notes & returns " + money(t[3]) +
      " \u00B7 total " + (isAR ? "due " : "owed ") + money(t[4]) +
      " (open items agree: " + money(iOut) + (unalloc ? "; credit balances " + money(unalloc) + " excluded from items" : "") + ").";
  };
  readTx((tx) => { TX = tx; render(); }, (e) => failState(ui, e, "this report"));
  readColl("invoices", (v) => { INV = v; render(); });
  readColl("notes", (n) => { NT = n; render(); });
}

export const initARReport = (cfg) => initPartyReport(cfg, "sales");

export const initAPReport = (cfg) => initPartyReport(cfg, "purchases");

async function initStatement(cfg, dir) {
  await requireAuth();
  const isAR = dir === "sales";
  const ui = shell(cfg.root, [
    { label: "Date" }, { label: "Detail" }, { label: "Ref" }, { label: "Source" },
    { label: "Increase", amt: true }, { label: "Decrease", amt: true }, { label: "Balance", amt: true },
  ], { icon: isAR ? "\uD83D\uDCC4" : "\uD83D\uDCD3", kv: true });
  const pb = periodBar(cfg.root, "range");
  const sel = acctSelect(ui);
  let TX = null, INV = null, NT = null;
  const render = () => {
    if (!TX || !INV || !NT) return;
    const rows = partyModel(TX, INV, NT, dir);
    if (!rows.length) { sel.style.display = "none"; return showEmpty(ui,
      "Nothing to state yet",
      "Statements are generated from credit " + (isAR ? "sales" : "purchases") + ", invoices, settlements and notes."); }
    sel.style.display = "";
    const names = rows.map((r) => r.party).sort((a, b) => a.localeCompare(b));
    const cur = sel.value;
    sel.innerHTML = names.map((n) => "<option>" + esc(n) + "</option>").join("");
    sel.value = cur && names.includes(cur) ? cur : names[0];
    const row = rows.find((r) => r.party === sel.value);
    
    
    const balStr = (b) => (isAR ? fmtBal(b) : fmtBal(-b));
    const f = pb.from() ? parseDay(pb.from()) : null;
    const tt = pb.to() ? parseDay(pb.to()) : null;
    if (tt) tt.setHours(23, 59, 59, 999);
    const opening = row.events.filter((e) => f && e.ts < f).reduce((s, e) => s + e.inc - e.dec, 0);
    const per = row.events.filter((e) => (!f || e.ts >= f) && (!tt || e.ts <= tt));
    let run = opening, tInc = 0, tDec = 0, html = "";
    html += rowCells([{ v: "\u2014", date: 1 }, { v: "Opening balance", strong: true }, "", "", "", "", { v: balStr(opening), amt: true }]);
    per.forEach((e) => {
      run += e.inc - e.dec; tInc += e.inc; tDec += e.dec;
      html += rowCells([{ v: fmtDay(e.ts), date: 1 }, e.detail, e.ref, e.src,
        e.inc ? { v: money(e.inc), amt: true } : "",
        e.dec ? { v: money(e.dec), amt: true } : "",
        { v: balStr(run), amt: true }]);
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = '<tr class="total-row"><td class="c-desc">Period total</td><td></td><td></td><td></td>' +
      '<td class="c-amount">' + esc(money(tInc)) + '</td><td class="c-amount">' + esc(money(tDec)) +
      '</td><td class="c-amount">' + esc(balStr(run)) + "</td></tr>";
    ui.card.style.display = "";
    ui.empty.hidden = true;
    const pays = per.filter((e) => e.kind === "pay").reduce((s, e) => s + e.dec, 0);
    const adj = tDec - pays;
    ui.kvTitle.textContent = sel.value + " \u2014 statement for the selected period";
    ui.kvRows.innerHTML =
      kvRow("Opening balance", balStr(opening)) +
      kvRow(isAR ? "Invoices issued" : "Supplier invoices", money(tInc)) +
      kvRow(isAR ? "Payments received" : "Payments made", money(pays)) +
      kvRow(isAR ? "Credit notes & returns" : "Debit notes & returns", money(adj)) +
      kvRow("Closing balance", balStr(run), true);
    ui.kv.style.display = "";
    ui.count.textContent = per.length + " entries in the period \u00B7 closing balance " + balStr(run) + ".";
  };
  pb.onChange(render);
  sel.addEventListener("change", render);
  readTx((tx) => { TX = tx; render(); }, (e) => failState(ui, e, "the statement"));
  readColl("invoices", (v) => { INV = v; render(); });
  readColl("notes", (n) => { NT = n; render(); });
}

export const initCustomerStatement = (cfg) => initStatement(cfg, "sales");

export const initSupplierStatement = (cfg) => initStatement(cfg, "purchases");

async function initAging(cfg, dir) {
  await requireAuth();
  const isAR = dir === "sales";
  const ui = shell(cfg.root, [
    { label: isAR ? "Customer" : "Supplier" }, { label: "Current", amt: true },
    { label: "1\u201330 days", amt: true }, { label: "31\u201360 days", amt: true },
    { label: "61\u201390 days", amt: true }, { label: "Over 90", amt: true }, { label: "Total", amt: true },
  ], { icon: isAR ? "\uD83D\uDCC6" : "\uD83D\uDDD3\uFE0F" });
  const pb = periodBar(cfg.root, "asof");
  let TX = null, INV = null, NT = null;
  const render = () => {
    if (!TX || !INV || !NT) return;
    const rows = partyModel(TX, INV, NT, dir);
    if (!rows.length) return showEmpty(ui, "Nothing to age yet",
      "Aging is generated from open invoices and credit " + (isAR ? "sales" : "purchases") +
      " \u2014 journalled " + (isAR ? "sales" : "purchases") + " age on 30-day terms; register invoices use their due date.");
    const asof = parseDay(pb.asof()) || today();
    const t = { cur: 0, d30: 0, d60: 0, d90: 0, d90p: 0, tot: 0 };
    let over = 0, overC = 0, html = "";
    rows.forEach((r) => {
      const b = bucketsOf(r, asof);
      const tot = b.cur + b.d30 + b.d60 + b.d90 + b.d90p;
      const late = b.d30 + b.d60 + b.d90 + b.d90p;
      if (late > 0) { overC++; over += late; }
      html += rowCells([{ v: r.party, strong: true },
        b.cur ? { v: money(b.cur), amt: true } : "",
        b.d30 ? { v: money(b.d30), amt: true } : "",
        b.d60 ? { v: money(b.d60), amt: true } : "",
        b.d90 ? { v: money(b.d90), amt: true } : "",
        b.d90p ? { v: money(b.d90p), amt: true } : "",
        { v: money(tot), amt: true }], late > 0 ? "is-overdue" : "");
      t.cur += b.cur; t.d30 += b.d30; t.d60 += b.d60; t.d90 += b.d90; t.d90p += b.d90p; t.tot += tot;
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, t.cur, t.d30, t.d60, t.d90, t.d90p, t.tot]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = rows.length + " " + (isAR ? "customer" : "supplier") + (rows.length === 1 ? "" : "s") +
      " \u00B7 total " + (isAR ? "due " : "owed ") + money(t.tot) + " \u00B7 overdue " + money(over) +
      " across " + overC + " \u00B7 as of " + fmtDay(asof) + ".";
  };
  pb.onChange(render);
  readTx((tx) => { TX = tx; render(); }, (e) => failState(ui, e, "this report"));
  readColl("invoices", (v) => { INV = v; render(); });
  readColl("notes", (n) => { NT = n; render(); });
}

export const initAgedAR = (cfg) => initAging(cfg, "sales");

export const initAgedAP = (cfg) => initAging(cfg, "purchases");

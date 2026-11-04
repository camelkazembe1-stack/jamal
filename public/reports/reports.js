













import { requireAuth, db, collection, onSnapshot } from "/firebase.js";
import { classify } from "/journals/journal.js";
import { buildAccounts, accountBalance, asDate } from "/ledger/postings.js";

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const num1 = (n) => (Math.round(Number(n || 0) * 10) / 10).toLocaleString("en-US");

function parseDay(v) {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const p = v.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  const d = v && typeof v.toDate === "function" ? v.toDate() : new Date(v);
  return isNaN(d) ? null : d;
}
const fmtDay = (v) => { const d = parseDay(v); return d ? d.toLocaleDateString("en-GB") : "\u2014"; };
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const today = () => startOfDay(new Date());

function shell(rootSel, cols, opt = {}) {
  const root = document.querySelector(rootSel);
  root.innerHTML =
    '<div class="card table-card rp-card" style="display:none">' +
      '<div class="table-wrap"><table class="bk">' +
        "<thead><tr>" +
          cols.map((c) => '<th scope="col" class="' + (c.amt ? "amt" : "") + '">' + esc(c.label) + "</th>").join("") +
        "</tr></thead>" +
        '<tbody class="rp-body"></tbody>' +
        '<tfoot class="rp-foot"></tfoot>' +
      "</table></div>" +
    "</div>" +
    (opt.side
      ? '<div class="card people-card rp-side" style="display:none"><h2 class="rp-side-title"></h2><table class="people"><tbody class="rp-side-body"></tbody></table></div>'
      : "") +
    (opt.kv
      ? '<div class="card kv-card rp-kv" style="display:none"><h2 class="rp-kv-title"></h2><div class="rp-kv-rows"></div></div>'
      : "") +
    '<div class="card empty rp-empty" hidden><div class="empty-icon">' + (opt.icon || "\uD83D\uDCC4") +
      '</div><p class="empty-title"></p><p class="empty-sub"></p></div>' +
    '<p class="count-line rp-count"></p>';
  const $ = (s) => root.querySelector(s);
  return {
    card: $(".rp-card"), tbody: $(".rp-body"), tfoot: $(".rp-foot"),
    side: $(".rp-side"), sideTitle: $(".rp-side-title"), sideBody: $(".rp-side-body"),
    kv: $(".rp-kv"), kvTitle: $(".rp-kv-title"), kvRows: $(".rp-kv-rows"),
    empty: $(".rp-empty"), count: $(".rp-count")
  };
}

const rowCells = (vals) => "<tr>" + vals.map((v) => {
  if (v && v.td != null) return v.td;
  const cls = v && v.amt ? (v.pos ? "c-amount pos" : v.neg ? "c-amount neg" : "c-amount")
    : v && v.num ? "c-num" : v && v.date ? "c-date" : v && v.strong ? "c-party" : "c-desc";
  const txt = v == null ? "" : (v.v != null ? v.v : v);
  return '<td class="' + cls + '">' + (txt === "" ? "" : esc(txt)) + "</td>";
}).join("") + "</tr>";

const totalCells = (vals) => '<tr class="total-row">' + vals.map((v) => {
  if (v == null) return "<td></td>";
  if (v.label) return '<td class="c-desc">Total</td>';
  return '<td class="c-amount">' + esc(money(v)) + "</td>";
}).join("") + "</tr>";

const collRef = (name) => collection(db, name);
const readColl = (name, cb, fail) =>
  onSnapshot(collRef(name), (snap) => cb(snap.docs.map((d) => {
    const x = d.data({ serverTimestamps: "estimate" }); x.__id = d.id; return x;
  })), fail || (() => {}));

function failState(ui, e, what) {
  ui.card.style.display = "none";
  ui.empty.hidden = false;
  ui.empty.querySelector(".empty-title").textContent = "Could not load " + what;
  ui.empty.querySelector(".empty-sub").textContent =
    e && e.code === "permission-denied"
      ? "Sign in again, then deploy the updated Firestore rules."
      : (e && e.message) || String(e);
  ui.count.textContent = "";
}

function showEmpty(ui, title, sub) {
  ui.card.style.display = "none";
  if (ui.side) ui.side.style.display = "none";
  if (ui.kv) ui.kv.style.display = "none";
  ui.empty.hidden = false;
  ui.empty.querySelector(".empty-title").textContent = title;
  ui.empty.querySelector(".empty-sub").textContent = sub || "";
}

 
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

 
function partySchedule(txns, book) {
  
  
  
  
  const main = book === "sales" ? "sales" : "purchases";
  const ret = book === "sales" ? "salesReturns" : "purchasesReturns";
  const pay = book === "sales" ? "cashReceipts" : "cashPayments";
  const withCredit = new Set(
    txns.filter((t) => classify(t) === main && t.name).map((t) => t.name));
  const rows = Object.create(null);
  txns.forEach((t) => {
    const c = classify(t);
    const person = t.name;
    if (!person) return;
    const amt = Number(t.amount || 0);
    if (c === main) {
      const r = rows[person] = rows[person] || { main: 0, ret: 0, pay: 0 };
      r.main += amt;
    } else if (c === ret && person) {
      const r = rows[person] = rows[person] || { main: 0, ret: 0, pay: 0 };
      r.ret += amt;
    } else if (c === pay && withCredit.has(person)) {
      const r = rows[person] = rows[person] || { main: 0, ret: 0, pay: 0 };
      r.pay += amt;
    }
  });
  return Object.keys(rows)
    .filter((p) => rows[p].main > 0)
    .sort((a, b) => (rows[b].main - rows[b].ret - rows[b].pay) - (rows[a].main - rows[a].ret - rows[a].pay) || a.localeCompare(b))
    .map((p) => Object.assign({ party: p }, rows[p]));
}

export async function initAR(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Customer" }, { label: "Credit Sales", amt: true }, { label: "Sales Returns", amt: true },
    { label: "Receipts", amt: true }, { label: "Balance Due", amt: true }
  ], { icon: "\uD83E\uDD1D" });
  onSnapshot(collRef("transactions"), (snap) => {
    const txns = snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }));
    const rows = partySchedule(txns, "sales");
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
  onSnapshot(collRef("transactions"), (snap) => {
    const txns = snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }));
    const rows = partySchedule(txns, "purchases");
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

 
export async function initStock(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Date" }, { label: "Ref" }, { label: "Product" }, { label: "Direction" },
    { label: "Qty In", amt: true }, { label: "Qty Out", amt: true },
    { label: "Stock After", amt: true }, { label: "Value In", amt: true }
  ], { icon: "\uD83D\uDCCA", side: true });
  readColl("goods", (goods) => {
    const rows = goods.slice().sort((a, b) =>
      (parseDay(a.date) || 0) - (parseDay(b.date) || 0) ||
      String(a.no || "").localeCompare(String(b.no || "")));
    if (!rows.length) return showEmpty(ui, "No stock movements yet",
      "Stock Movement is generated from the GRN Register (in) and the Dispatch Register (out) \u2014 never double-counted.");
    const onHand = Object.create(null);
    let tIn = 0, tOut = 0, tVal = 0, html = "";
    rows.forEach((g) => {
      const p = g.product || "\u2014";
      const qty = Number(g.qty || 0);
      const isIn = g.direction === "in";
      onHand[p] = (onHand[p] || 0) + (isIn ? qty : -qty);
      const val = isIn ? qty * Number(g.unitPrice || 0) : 0;
      if (isIn) { tIn += qty; tVal += val; } else tOut += qty;
      html += rowCells([
        { v: fmtDay(g.date), date: 1 },
        { v: g.no || "\u2014", strong: true },
        p,
        isIn ? "Received (GRN)" : "Dispatched",
        isIn ? { v: money(qty), amt: true } : "",
        !isIn ? { v: money(qty), amt: true } : "",
        { v: money(onHand[p]), amt: true },
        val ? { v: money(val), amt: true } : ""
      ]);
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, null, null, null, tIn, tOut, null, tVal]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    
    const per = Object.create(null);
    rows.forEach((g) => {
      const p = g.product || "\u2014";
      const q = Number(g.qty || 0);
      const s = per[p] = per[p] || { inQ: 0, outQ: 0, val: 0 };
      if (g.direction === "in") { s.inQ += q; s.val += q * Number(g.unitPrice || 0); }
      else s.outQ += q;
    });
    const keys = Object.keys(per).sort();
    ui.sideTitle.textContent = "Stock on hand per product";
    ui.sideBody.innerHTML = keys.map((p) => {
      const s = per[p];
      const on = s.inQ - s.outQ;
      const wa = s.inQ ? s.val / s.inQ : 0;
      return "<tr><td class=\"c-party\">" + esc(p) + "</td><td class=\"c-amount\">" + esc(money(on)) +
        "</td><td class=\"c-amount\">" + esc(money(wa)) + "</td><td class=\"c-amount\">" + esc(money(on * wa)) + "</td></tr>";
    }).join("");
    ui.side.style.display = keys.length ? "" : "none";
    ui.count.textContent = rows.length + " movements across " + keys.length + " product" +
      (keys.length === 1 ? "" : "s") + " \u00B7 received " + money(tIn) + " \u00B7 dispatched " + money(tOut) +
      " \u00B7 value in " + money(tVal) + ".";
  }, (e) => failState(ui, e, "the Stock Movement"));
}

 
export async function initInv(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Product" }, { label: "Received Qty", amt: true }, { label: "Received Value", amt: true },
    { label: "Dispatched Qty", amt: true }, { label: "On Hand", amt: true },
    { label: "WA Unit Cost", amt: true }, { label: "WA Value", amt: true }, { label: "FIFO Value", amt: true }
  ], { icon: "\uD83C\uDFF7\uFE0F" });
  readColl("goods", (goods) => {
    const rows = goods.slice().sort((a, b) =>
      (parseDay(a.date) || 0) - (parseDay(b.date) || 0));
    if (!rows.length) return showEmpty(ui, "No goods movements yet",
      "Inventory is valued from the GRN and Dispatch registers \u2014 no re-entry.");
    const per = Object.create(null);
    rows.forEach((g) => {
      const p = g.product || "\u2014";
      const q = Number(g.qty || 0);
      const s = per[p] = per[p] || { inQ: 0, outQ: 0, val: 0, layers: [] };
      if (g.direction === "in") {
        s.inQ += q; s.val += q * Number(g.unitPrice || 0);
        s.layers.push({ q, c: Number(g.unitPrice || 0) });
      } else {
        s.outQ += q;
        let left = q; 
        while (left > 0 && s.layers.length) {
          const l = s.layers[0];
          const take = Math.min(l.q, left);
          l.q -= take; left -= take;
          if (l.q <= 0) s.layers.shift();
        }
      }
    });
    const keys = Object.keys(per).sort();
    let tInQ = 0, tInV = 0, tOutQ = 0, tOn = 0, tWA = 0, tF = 0, html = "";
    keys.forEach((p) => {
      const s = per[p];
      const on = Math.max(0, s.inQ - s.outQ);
      const wa = s.inQ ? s.val / s.inQ : 0;
      const fifo = s.layers.reduce((sum, l) => sum + l.q * l.c, 0);
      tInQ += s.inQ; tInV += s.val; tOutQ += s.outQ; tOn += on; tWA += on * wa; tF += fifo;
      html += rowCells([{ v: p, strong: true }, { v: money(s.inQ), amt: true }, { v: money(s.val), amt: true },
        { v: money(s.outQ), amt: true }, { v: money(on), amt: true }, { v: money(wa), amt: true },
        { v: money(on * wa), amt: true }, { v: money(fifo), amt: true }]);
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, tInQ, tInV, tOutQ, tOn, null, tWA, tF]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = keys.length + " product" + (keys.length === 1 ? "" : "s") +
      " \u00B7 closing stock: WA " + money(tWA) + " \u00B7 FIFO " + money(tF) + ".";
  }, (e) => failState(ui, e, "the Inventory Valuation"));
}

 
function assetFigures(a) {
  const cost = Number(a.cost || 0), sal = Number(a.salvage || 0);
  const life = Number(a.life || 1) || 1;
  const annual = (cost - sal) / life;
  const acq = parseDay(a.dateAcquired) || today();
  const years = Math.max(0, (today() - acq) / (365.25 * 86400000));
  const accum = Math.min(cost - sal, annual * years);
  return { cost, sal, life, annual, years, accum, nbv: cost - accum };
}

 
export async function initDep(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Asset" }, { label: "Acquired" }, { label: "Cost", amt: true },
    { label: "Annual Depreciation", amt: true }, { label: "Months This Year", amt: true },
    { label: "Depreciation This Year", amt: true }, { label: "NBV", amt: true }
  ], { icon: "\uD83D\uDCC9" });
  readColl("assets", (assets) => {
    const rows = assets.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    if (!rows.length) return showEmpty(ui, "No fixed assets yet",
      "Depreciation is calculated straight-line from the Fixed Assets register \u2014 no re-entry.");
    const Y = today().getFullYear();
    const jan1 = new Date(Y, 0, 1);
    let tCost = 0, tAnnual = 0, tYear = 0, tNbv = 0, html = "";
    rows.forEach((a) => {
      const f = assetFigures(a);
      const acq = parseDay(a.dateAcquired) || today();
      const from = acq > jan1 ? acq : jan1;
      const months = Math.min(12, Math.max(0, Math.round((today() - from) / (30.44 * 86400000))));
      const raw = f.annual * months / 12;
      const depY = Math.max(0, Math.min(raw, Math.max(0, f.cost - f.sal - f.accum + raw)));
      tCost += f.cost; tAnnual += f.annual; tYear += depY; tNbv += f.nbv;
      html += rowCells([{ v: a.name || "\u2014", strong: true }, { v: fmtDay(a.dateAcquired), date: 1 },
        { v: money(f.cost), amt: true }, { v: money(f.annual), amt: true },
        { v: String(months), num: 1 }, { v: money(depY), amt: true }, { v: money(f.nbv), amt: true }]);
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, null, tCost, tAnnual, null, tYear, tNbv]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = rows.length + " asset" + (rows.length === 1 ? "" : "s") +
      " \u00B7 straight-line \u00B7 charge for " + Y + ": " + money(tYear) + ".";
  }, (e) => failState(ui, e, "the Depreciation report"));
}

 
export async function initFAS(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Asset" }, { label: "Category" }, { label: "Acquired" }, { label: "Cost", amt: true },
    { label: "Salvage", amt: true }, { label: "Life (yrs)", amt: true },
    { label: "Annual Dep", amt: true }, { label: "Accumulated Dep", amt: true }, { label: "NBV", amt: true }
  ], { icon: "\uD83C\uDFDB\uFE0F" });
  readColl("assets", (assets) => {
    const rows = assets.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    if (!rows.length) return showEmpty(ui, "No fixed assets yet",
      "The schedule is generated from the Fixed Assets register \u2014 no re-entry.");
    let tCost = 0, tAcc = 0, tNbv = 0, html = "";
    rows.forEach((a) => {
      const f = assetFigures(a);
      tCost += f.cost; tAcc += f.accum; tNbv += f.nbv;
      html += rowCells([{ v: a.name || "\u2014", strong: true }, a.category || "\u2014",
        { v: fmtDay(a.dateAcquired), date: 1 }, { v: money(f.cost), amt: true },
        { v: money(f.sal), amt: true }, { v: String(f.life), num: 1 },
        { v: money(f.annual), amt: true }, { v: money(f.accum), amt: true }, { v: money(f.nbv), amt: true }]);
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, null, null, tCost, null, null, null, tAcc, tNbv]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = rows.length + " asset" + (rows.length === 1 ? "" : "s") +
      " \u00B7 cost " + money(tCost) + " \u00B7 NBV " + money(tNbv) + ".";
  }, (e) => failState(ui, e, "the Fixed Assets Schedule"));
}

 
export async function initAccDep(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Asset" }, { label: "Cost", amt: true }, { label: "Annual Dep", amt: true },
    { label: "Years Elapsed", amt: true }, { label: "Accumulated Depreciation", amt: true }, { label: "NBV", amt: true }
  ], { icon: "\uD83D\uDCDA" });
  readColl("assets", (assets) => {
    const rows = assets.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    if (!rows.length) return showEmpty(ui, "No fixed assets yet",
      "Accumulated depreciation builds up from the Fixed Assets register \u2014 no re-entry.");
    let tCost = 0, tAcc = 0, tNbv = 0, html = "";
    rows.forEach((a) => {
      const f = assetFigures(a);
      tCost += f.cost; tAcc += f.accum; tNbv += f.nbv;
      html += rowCells([{ v: a.name || "\u2014", strong: true }, { v: money(f.cost), amt: true },
        { v: money(f.annual), amt: true }, { v: num1(f.years), num: 1 },
        { v: money(f.accum), amt: true }, { v: money(f.nbv), amt: true }]);
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, tCost, null, null, tAcc, tNbv]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = rows.length + " asset" + (rows.length === 1 ? "" : "s") +
      " \u00B7 accumulated to date " + money(tAcc) + ".";
  }, (e) => failState(ui, e, "the Accumulated Depreciation"));
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


 
const stmtLine = (t, v, cls) => '<tr><td class="c-desc ' + (cls || "") + '">' + esc(t) +
  '</td><td class="c-amount' + (v < 0 ? " neg" : "") + '">' + esc(money(v)) + "</td></tr>";
const stmtStrong = (t, v) => '<tr class="total-row"><td class="c-desc"><strong>' + esc(t) +
  '</strong></td><td class="c-amount' + (v < 0 ? " neg" : "") + '"><strong>' + esc(money(v)) + "</strong></td></tr>";
const stmtSec = (t) => '<tr><td class="c-desc is-sec" colspan="2">' + esc(t) + "</td></tr>";

 
export async function initIS(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Particulars" }, { label: "Amount", amt: true }
  ], { icon: "\uD83D\uDCCA" });
  onSnapshot(collRef("transactions"), (snap) => {
    const txns = snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }));
    const M = buildAccounts(txns);
    if (!M.order.length) return showEmpty(ui, "No postings yet",
      "The Income Statement builds itself from the same double-entry postings as the Trial Balance and the Ledger - add transactions on the Add Transaction page and it fills in live.");
    const P = (x) => Math.round(Number(x || 0) * 100) / 100;
    const bal = Object.create(null);
    M.order.forEach((n) => { bal[n] = P(accountBalance(M.accts, n)); });
    const kindOf = (n) => (M.accts.get(n) || {}).kind || "asset";

    const sales = -(bal["Sales"] || 0);
    const sret = bal["Sales Returns"] || 0;
    const netSales = sales - sret;
    const purch = bal["Purchases"] || 0;
    const pret = -(bal["Purchases Returns"] || 0);
    const cogs = purch - pret;
    const gross = netSales - cogs;

    const otherInc = [], expenses = [];
    M.order.forEach((n) => {
      if (n === "Capital" || n === "Petty Cash" ||
          n === "Sales" || n === "Sales Returns" ||
          n === "Purchases" || n === "Purchases Returns") return; 
      const k = kindOf(n), b = bal[n];
      if (!b || Math.abs(b) < 0.005) return;
      if (k === "revenue") otherInc.push({ n, v: -b });
      else if (k === "expense") expenses.push({ n, v: b });
    });
    otherInc.sort((a, b) => b.v - a.v || a.n.localeCompare(b.n));
    expenses.sort((a, b) => b.v - a.v || a.n.localeCompare(b.n));
    const tInc = P(otherInc.reduce((s, r) => s + r.v, 0));
    const tExp = P(expenses.reduce((s, r) => s + r.v, 0));
    const profit = P(gross + tInc - tExp);

    let html = stmtSec("Trading account");
    html += stmtLine("Sales", sales);
    if (sret) html += stmtLine("Less: Sales Returns", -sret, "is-ind");
    html += stmtStrong("Net sales", netSales);
    html += stmtLine("Purchases", purch);
    if (pret) html += stmtLine("Less: Purchases Returns", -pret, "is-ind");
    html += stmtStrong("Cost of sales", cogs);
    html += stmtStrong("Gross profit", gross);
    if (otherInc.length) {
      html += stmtSec("Other income");
      otherInc.forEach((r) => { html += stmtLine(r.n, r.v); });
      html += stmtStrong("Total other income", tInc);
    }
    if (expenses.length) {
      html += stmtSec("Expenses");
      expenses.forEach((r) => { html += stmtLine(r.n, r.v); });
      html += stmtStrong("Total expenses", tExp);
    }
    html += stmtStrong(profit >= 0 ? "Net profit" : "Net loss", profit);
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = "";
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = "Net sales " + money(netSales) + " \u00B7 other income " + money(tInc) +
      " \u00B7 expenses " + money(tExp) + " \u00B7 " +
      (profit >= 0 ? "net profit " : "net loss ") + money(profit) +
      " \u2014 same postings as the Trial Balance, always up to date.";
  }, (e) => failState(ui, e, "the Income Statement"));
}

 
export async function initBS(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Particulars" }, { label: "Amount", amt: true }
  ], { icon: "\uD83C\uDFDB\uFE0F", kv: true });
  let GOODS = null;
  const kvLine = (k, v) => '<div class="kv"><span class="k">' + esc(k) +
    '</span><span class="v">' + esc(money(v)) + "</span></div>";
  const memo = () => {
    if (!GOODS) return;
    if (!GOODS.length) { ui.kv.style.display = "none"; return; }
    const per = Object.create(null);
    GOODS.forEach((g) => {
      const p = g.product || "\u2014", q = Number(g.qty || 0);
      const s = per[p] = per[p] || { inQ: 0, outQ: 0, val: 0, layers: [] };
      if (g.direction === "in") {
        s.inQ += q; s.val += q * Number(g.unitPrice || 0);
        s.layers.push({ q, c: Number(g.unitPrice || 0) });
      } else {
        s.outQ += q;
        let left = q;
        while (left > 0 && s.layers.length) {
          const l = s.layers[0];
          const take = Math.min(l.q, left);
          l.q -= take; left -= take;
          if (l.q <= 0) s.layers.shift();
        }
      }
    });
    let wa = 0, fifo = 0;
    Object.keys(per).forEach((p) => {
      const s = per[p];
      const on = Math.max(0, s.inQ - s.outQ);
      wa += on * (s.inQ ? s.val / s.inQ : 0);
      fifo += s.layers.reduce((sum, l) => sum + l.q * l.c, 0);
    });
    ui.kvTitle.textContent = "Memo \u2014 stock on hand (from the Inventory Valuation)";
    ui.kvRows.innerHTML =
      kvLine("Closing stock \u2014 weighted average", wa) +
      kvLine("Closing stock \u2014 FIFO", fifo) +
      '<div class="kv"><span class="k">Note</span><span class="v">stock is valued from the goods movements - it is not a ledger account in the postings yet.</span></div>';
    ui.kv.style.display = "";
  };
  readColl("goods", (g) => { GOODS = g; memo(); }, () => { GOODS = []; memo(); });
  onSnapshot(collRef("transactions"), (snap) => {
    const txns = snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }));
    const M = buildAccounts(txns);
    if (!M.order.length) return showEmpty(ui, "No postings yet",
      "The Balance Sheet builds itself from the same double-entry postings as the Trial Balance - add transactions first and it balances itself live.");
    const P = (x) => Math.round(Number(x || 0) * 100) / 100;
    const bal = Object.create(null);
    M.order.forEach((n) => { bal[n] = P(accountBalance(M.accts, n)); });
    const kindOf = (n) => (M.accts.get(n) || {}).kind || "asset";

    const assets = [], liabs = [];
    M.order.forEach((n) => {
      const b = bal[n];
      if (!b || Math.abs(b) < 0.005) return;
      const k = kindOf(n);
      if (k === "asset") { if (b > 0) assets.push({ n, v: b }); else liabs.push({ n: n + " (short)", v: -b }); }
      else if (k === "liability") { if (b < 0) liabs.push({ n, v: -b }); else assets.push({ n: n + " (recoverable)", v: b }); }
      else if (k === "person") { if (b > 0) assets.push({ n: n + " (debtor)", v: b }); else liabs.push({ n: n + " (creditor)", v: -b }); }
    });
    assets.sort((x, y) => y.v - x.v || x.n.localeCompare(y.n));
    liabs.sort((x, y) => y.v - x.v || x.n.localeCompare(y.n));
    const capital = -(bal["Capital"] || 0);
    const petty = -(bal["Petty Cash"] || 0);
    let profit = 0;
    M.order.forEach((n) => {
      if (n === "Capital" || n === "Petty Cash") return;
      const k = kindOf(n);
      if (k === "revenue" || k === "expense") profit += -(bal[n] || 0);
    });
    profit = P(profit);
    const tA = P(assets.reduce((s, r) => s + r.v, 0));
    const tL = P(liabs.reduce((s, r) => s + r.v, 0));
    const tE = P(capital + petty + profit);
    const diff = P(tA - tL - tE);

    let html = stmtSec("Assets");
    if (!assets.length) html += stmtLine("No asset balances yet", 0, "is-ind");
    assets.forEach((r) => { html += stmtLine(r.n, r.v); });
    html += stmtStrong("Total assets", tA);
    html += stmtSec("Liabilities");
    if (!liabs.length) html += stmtLine("No liabilities yet", 0, "is-ind");
    liabs.forEach((r) => { html += stmtLine(r.n, r.v); });
    html += stmtStrong("Total liabilities", tL);
    html += stmtSec("Equity");
    html += stmtLine("Capital", capital);
    if (Math.abs(petty) >= 0.005) html += stmtLine("Petty Cash fund", petty);
    html += stmtLine("Net profit to date", profit);
    html += stmtStrong("Total equity", tE);
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = "";
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = "Assets " + money(tA) + " = Liabilities " + money(tL) +
      " + Equity " + money(tE) +
      (diff === 0 ? " \u2014 balances." : " \u2014 difference " + money(diff) + ".");
  }, (e) => failState(ui, e, "the Balance Sheet"));
}

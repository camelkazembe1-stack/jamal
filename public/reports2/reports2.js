










import { requireAuth, db, collection, onSnapshot } from "/firebase.js";
import { classify } from "/journals/journal.js";
import { buildAccounts, postingsFor, asDate } from "/ledger/postings.js";

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

function parseDay(v) {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const p = v.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  const d = v && typeof v.toDate === "function" ? v.toDate() : (v instanceof Date ? new Date(v) : new Date(v));
  return isNaN(d) ? null : d;
}
const fmtDay = (v) => { const d = parseDay(v); return d ? d.toLocaleDateString("en-GB") : "\u2014"; };
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const today = () => startOfDay(new Date());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
const iso = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
const DAY = 86400000;
const fmtBal = (b) => (Math.abs(Number(b) || 0) < 0.005 ? "0" : (b > 0 ? money(b) + " DR" : money(-b) + " CR"));

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
    empty: $(".rp-empty"), count: $(".rp-count"), root
  };
}

const rowCells = (vals, cls) => "<tr" + (cls ? ' class="' + cls + '"' : "") + ">" + vals.map((v) => {
  if (v && v.td != null) return v.td;
  const cls2 = v && v.amt ? (v.pos ? "c-amount pos" : v.neg ? "c-amount neg" : "c-amount")
    : v && v.num ? "c-num" : v && v.date ? "c-date" : v && v.strong ? "c-party" : "c-desc";
  const txt = v == null ? "" : (v.v != null ? v.v : v);
  return '<td class="' + cls2 + '">' + (txt === "" ? "" : esc(txt)) + "</td>";
}).join("") + "</tr>";

const totalCells = (vals) => '<tr class="total-row">' + vals.map((v) => {
  if (v == null) return "<td></td>";
  if (v.label) return '<td class="c-desc">Total</td>';
  if (v.txt != null) return '<td class="c-amount">' + esc(v.txt) + "</td>";
  return '<td class="c-amount">' + esc(money(v)) + "</td>";
}).join("") + "</tr>";

const collRef = (name) => collection(db, name);
const readColl = (name, cb, fail) =>
  onSnapshot(collRef(name), (snap) => cb(snap.docs.map((d) => {
    const x = d.data({ serverTimestamps: "estimate" }); x.__id = d.id; return x;
  })), fail || (() => {}));
const readTx = (cb, fail) =>
  onSnapshot(collRef("transactions"), (snap) => cb(snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }))), fail || (() => {}));

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
  ui.count.textContent = "";
}

 
function periodBar(rootSel, mode) {
  const root = document.querySelector(rootSel);
  const bar = document.createElement("div");
  bar.className = "card r2-period";
  if (mode === "asof") {
    bar.innerHTML = '<label>As of <input type="date" class="r2-asof" value="' + iso(today()) + '"></label>' +
      '<span class="r2-hint">Debt ages are measured to this date.</span>';
  } else {
    bar.innerHTML = '<label>From <input type="date" class="r2-from"></label>' +
      '<label>To <input type="date" class="r2-to"></label>' +
      '<button type="button" class="r2-clear">Clear</button>' +
      '<span class="r2-hint">Leave empty for all time.</span>';
  }
  root.insertBefore(bar, root.firstChild);
  return {
    from: () => { const el = bar.querySelector(".r2-from"); return el && el.value ? el.value : ""; },
    to: () => { const el = bar.querySelector(".r2-to"); return el && el.value ? el.value : ""; },
    asof: () => { const el = bar.querySelector(".r2-asof"); return el && el.value ? el.value : iso(today()); },
    onChange(cb) {
      bar.addEventListener("change", cb);
      const c = bar.querySelector(".r2-clear");
      if (c) c.addEventListener("click", () => {
        bar.querySelectorAll("input[type=date]").forEach((i) => { i.value = ""; });
        cb();
      });
    }
  };
}

function acctSelect(ui) {
  const sel = document.createElement("select");
  sel.className = "r2-sel";
  sel.setAttribute("aria-label", "Choose an account");
  sel.style.display = "none";
  ui.root.insertBefore(sel, ui.card);
  return sel;
}

 
function partyModel(txns, invoices, notes, dir) {
  
  const invDir = dir === "sales" ? "sales" : "purchase";
  const ret = dir === "sales" ? "salesReturns" : "purchasesReturns";
  const pay = dir === "sales" ? "cashReceipts" : "cashPayments";
  const noteDir = dir === "sales" ? "credit" : "debit";
  
  
  
  const debtPeople = new Set(
    txns.filter((t) => classify(t) === dir && t.name).map((t) => t.name));
  invoices.forEach((v) => { if (v.direction === invDir && v.party) debtPeople.add(v.party); });

  const ev = new Map();
  const add = (p, e) => { if (!p) return; let a = ev.get(p); if (!a) { a = []; ev.set(p, a); } a.push(e); };

  txns.forEach((t) => {
    const c = classify(t); if (!c) return;
    const p = t.name; if (!p) return;
    const ts = asDate(t.dateTime);
    const amt = Number(t.amount || 0);
    if (c === dir) add(p, { ts, kind: "main", detail: t.transactionName || "Sale", ref: dir === "sales" ? "SJ" : "PJ", src: "Journal", inc: amt, dec: 0 });
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

const kvRow = (k, v, hl) => '<div class="kv' + (hl ? " hl" : "") + '"><span class="k">' + esc(k) +
  '</span><span class="v">' + esc(v) + "</span></div>";

 
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
      if (ty !== "IN" && ty !== "OUT") return;
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

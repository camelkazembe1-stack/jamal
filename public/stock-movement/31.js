

initStock({ root: "#app" });

/* jamali-inline:516.js */
// ---------------------------------------------------------------------------
// JAMALI - Register reports (public/516.js)
// Every view generated from the goods and fixed assets registers with no
// re-entry: Stock Movement, Inventory Valuation (weighted average and FIFO),
// Depreciation, the Fixed Assets Schedule and Accumulated Depreciation.
// Pages 31, 33, 46, 47 and 48 import from here.
// ---------------------------------------------------------------------------

import { requireAuth } from "/firebase.js";
import {
  shell, rowCells, totalCells, readColl, failState, showEmpty,
  money, num1, parseDay, fmtDay, today, esc
} from "./core.js";

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

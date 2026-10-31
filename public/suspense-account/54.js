
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "suspense",
  addLabel: "Add Item", saveLabel: "Save", entity: "suspense item",
  partyLabel: "side",
  fields: [
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "side", label: "Side", type: "select", req: true, def: "DR", opts: ["DR", "CR"] },
    { key: "detail", label: "Detail", req: true, ph: "what arrived / left" },
    { key: "amount", label: "Amount (TZS)", type: "number", req: true, pos: true }
  ],
  columns: [
    { key: "date", label: "Date", fmt: "date" },
    { key: "side", label: "Side" },
    { key: "detail", label: "Detail", cls: "c-party" },
    { key: "amount", label: "Amount", fmt: "money" }
  ],
  totalCols: ["amount"], totalLabelKey: "detail",
  summary: { title: "Side totals",
    key: (r) => (r.side === "CR" ? "Credit side" : "Debit side"), val: (r) => r.amount },
  countExtra: (rows) => {
    const s = (side) => rows.filter((r) => r.side === side)
      .reduce((t, r) => t + (Number(r.amount) || 0), 0);
    const dr = s("DR"), cr = s("CR"), d = Math.round((dr - cr) * 100) / 100;
    return "DR total " + dr.toLocaleString("en-US") + " \u00B7 CR total " + cr.toLocaleString("en-US") +
      " \u00B7 difference " + Math.abs(d).toLocaleString("en-US") +
      (d === 0 ? " \u2014 suspense cleared." : " \u2014 post the difference to clear it.");
  },
  empty: { icon: "\uD83C\uDF00", title: "Suspense account is empty",
    sub: "Record unidentified receipts/payments here (DR = money owed to be explained, CR = money held to be explained) until they can be posted." }
});

// receipt-voucher (page 37) — receipt vouchers (shared "vouchers" collection).
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "vouchers",
  where: { field: "type", equals: "receipt" },
  noField: "no", noPrefix: "RV", noPad: 3,
  addLabel: "Add Voucher", saveLabel: "Save Voucher", entity: "receipt voucher",
  partyLabel: "Received From", partyField: "receivedFrom",
  fields: [
    { key: "no", label: "Voucher No.", ro: true },
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "receivedFrom", label: "Received From", req: true, ph: "e.g. Received From A" },
    { key: "description", label: "Description", ph: "what the voucher is for" },
    { key: "method", label: "Method", type: "select", req: true, opts: ["Cash", "Bank"] },
    { key: "amount", label: "Amount (TZS)", type: "number", req: true, pos: true }
  ],
  columns: [
    { key: "no", label: "Voucher No.", fmt: "no" },
    { key: "date", label: "Date", fmt: "date" },
    { key: "receivedFrom", label: "Received From", cls: "c-party" },
    { key: "description", label: "Description" },
    { key: "method", label: "Method" },
    { key: "amount", label: "Amount", fmt: "money" }
  ],
  totalCols: ["amount"], totalLabelKey: "description",
  empty: { icon: "\uD83C\uDF9F\uFE0F", title: "No receipt vouchers yet", sub: "Issue a receipt voucher whenever money comes in — one voucher per receipt." }
});

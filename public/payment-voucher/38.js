// payment-voucher (page 38) — payment vouchers (shared "vouchers" collection).
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "vouchers",
  where: { field: "type", equals: "payment" },
  noField: "no", noPrefix: "PV", noPad: 3,
  addLabel: "Add Voucher", saveLabel: "Save Voucher", entity: "payment voucher",
  partyLabel: "Paid To", partyField: "paidTo",
  fields: [
    { key: "no", label: "Voucher No.", ro: true },
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "paidTo", label: "Paid To", req: true, ph: "e.g. Paid To A" },
    { key: "description", label: "Description", ph: "what the voucher is for" },
    { key: "method", label: "Method", type: "select", req: true, opts: ["Cash", "Bank"] },
    { key: "amount", label: "Amount (TZS)", type: "number", req: true, pos: true }
  ],
  columns: [
    { key: "no", label: "Voucher No.", fmt: "no" },
    { key: "date", label: "Date", fmt: "date" },
    { key: "paidTo", label: "Paid To", cls: "c-party" },
    { key: "description", label: "Description" },
    { key: "method", label: "Method" },
    { key: "amount", label: "Amount", fmt: "money" }
  ],
  totalCols: ["amount"], totalLabelKey: "description",
  empty: { icon: "\uD83C\uDF9F\uFE0F", title: "No payment vouchers yet", sub: "Raise a payment voucher for every outgoing payment — it is the authorisation for the payment." }
});

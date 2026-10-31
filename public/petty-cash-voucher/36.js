
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "vouchers",
  where: { field: "type", equals: "petty" },
  noField: "no", noPrefix: "PCV", noPad: 3,
  addLabel: "Add Voucher", saveLabel: "Save Voucher", entity: "petty cash voucher",
  partyLabel: "Paid To", partyField: "paidTo",
  fields: [
    { key: "no", label: "Voucher No.", ro: true },
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "paidTo", label: "Paid To", req: true, ph: "e.g. Paid To A" },
    { key: "description", label: "Description", ph: "what the voucher is for" },
    
    { key: "amount", label: "Amount (TZS)", type: "number", req: true, pos: true }
  ],
  columns: [
    { key: "no", label: "Voucher No.", fmt: "no" },
    { key: "date", label: "Date", fmt: "date" },
    { key: "paidTo", label: "Paid To", cls: "c-party" },
    { key: "description", label: "Description" },
    
    { key: "amount", label: "Amount", fmt: "money" }
  ],
  totalCols: ["amount"], totalLabelKey: "description",
  empty: { icon: "\uD83C\uDF9F\uFE0F", title: "No petty cash vouchers yet", sub: "Record every small payment with a numbered voucher so the petty float can be proved at any time." }
});

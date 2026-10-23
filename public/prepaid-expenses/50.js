// prepaid-expenses (page 50) — prepaid expenses register.
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "prepaidExpenses",
  addLabel: "Add Record", saveLabel: "Save", entity: "prepaid expense",
  fields: [
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "detail", label: "Detail", req: true, ph: "the account involved" },
    { key: "description", label: "Description", ph: "optional" },
    { key: "amount", label: "Amount (TZS)", type: "number", req: true, pos: true }
  ],
  columns: [
    { key: "date", label: "Date", fmt: "date" },
    { key: "detail", label: "Detail", cls: "c-party" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount", fmt: "money" }
  ],
  totalCols: ["amount"], totalLabelKey: "description",
  empty: { icon: "\u23F0", title: "No prepaid expenses yet", sub: "Record a prepayment when cash has left before the expense is incurred." }
});

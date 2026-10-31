
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "accruedExpenses",
  addLabel: "Add Record", saveLabel: "Save", entity: "accrued expense",
  fields: [
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "detail", label: "Expense Account", req: true, ph: "the account involved" },
    { key: "description", label: "Description", ph: "optional" },
    { key: "amount", label: "Amount (TZS)", type: "number", req: true, pos: true }
  ],
  columns: [
    { key: "date", label: "Date", fmt: "date" },
    { key: "detail", label: "Expense Account", cls: "c-party" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount", fmt: "money" }
  ],
  totalCols: ["amount"], totalLabelKey: "description",
  empty: { icon: "\u23F0", title: "No accrued expenses yet", sub: "Record an accrual when an expense belongs to this period but will be paid next period." }
});

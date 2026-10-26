// unearned-revenue (page 52) — unearned revenue register.
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "unearnedRevenue",
  addLabel: "Add Record", saveLabel: "Save", entity: "unearned revenu",
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
  empty: { icon: "\u23F0", title: "No unearned revenue yet", sub: "Record money taken in advance of doing the work; it becomes revenue when earned." }
});

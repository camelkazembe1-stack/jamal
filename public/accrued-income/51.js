// accrued-income (page 51) — accrued income register.
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "accruedIncome",
  addLabel: "Add Record", saveLabel: "Save", entity: "accrued incom",
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
  empty: { icon: "\u23F0", title: "No accrued income yet", sub: "Record income that belongs to this period even though the money has not arrived." }
});

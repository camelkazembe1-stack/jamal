// adjusted-trial-balance (page 42) — TB + adjusting entries.
import { initAdjTB } from "/reports/reports.js";
import { initRecords } from "/records/records.js";

initAdjTB({ root: "#app" });

// adjusting entries — each one debits one account and credits another
initRecords({
  root: "#adj", collection: "adjustments",
  addLabel: "Add Adjustment", saveLabel: "Save Adjustment", entity: "adjusting entry",
  fields: [
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "drAcct", label: "Debit Account", req: true, ph: "e.g. Rent" },
    { key: "crAcct", label: "Credit Account", req: true, ph: "e.g. Accrued Expenses" },
    { key: "amount", label: "Amount (TZS)", type: "number", req: true, pos: true },
    { key: "description", label: "Description", ph: "e.g. accrue October rent" }
  ],
  columns: [
    { key: "date", label: "Date", fmt: "date" },
    { key: "drAcct", label: "Debit Account", cls: "c-party" },
    { key: "crAcct", label: "Credit Account", cls: "c-party" },
    { key: "amount", label: "Amount", fmt: "money" },
    { key: "description", label: "Description" }
  ],
  totalCols: ["amount"], totalLabelKey: "description",
  empty: { icon: "\uD83E\uDDEE", title: "No adjustments yet",
    sub: "Add adjusting entries here — the Adjusted and Post-Closing Trial Balances pick them up." }
});

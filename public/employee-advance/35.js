// employee-advance (page 35) — advances and repayments.
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "advances",
  addLabel: "Add Advance", saveLabel: "Save", entity: "advance",
  partyField: "employee", partyLabel: "Employee",
  fields: [
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "employee", label: "Employee", req: true, ph: "e.g. John Doe" },
    { key: "reason", label: "Reason", ph: "optional" },
    { key: "amount", label: "Advance (TZS)", type: "number", req: true, pos: true },
    { key: "repaid", label: "Repaid (TZS)", type: "number", def: 0 }
  ],
  computed: (d) => ({ balance: (Number(d.amount) || 0) - (Number(d.repaid) || 0) }),
  validate: (d) => ((Number(d.repaid) || 0) > (Number(d.amount) || 0)
    ? "Repaid cannot be more than the advance." : null),
  columns: [
    { key: "date", label: "Date", fmt: "date" },
    { key: "employee", label: "Employee", cls: "c-party" },
    { key: "reason", label: "Reason" },
    { key: "amount", label: "Advance", fmt: "money" },
    { key: "repaid", label: "Repaid", fmt: "money" },
    { key: "balance", label: "Balance", fmt: "money" }
  ],
  totalCols: ["amount", "repaid", "balance"], totalLabelKey: "reason",
  empty: { icon: "\uD83D\uDCB5", title: "No advances yet",
    sub: "Record an advance when money is given to an employee; update Repaid as it comes back." }
});

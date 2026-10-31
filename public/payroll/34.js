
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "payroll",
  addLabel: "Add Salary", saveLabel: "Save", entity: "salary",
  partyField: "employee", partyLabel: "Employee",
  fields: [
    { key: "period", label: "Period", req: true, ph: "e.g. October 2026" },
    { key: "employee", label: "Employee", req: true, ph: "e.g. John Doe" },
    { key: "role", label: "Role", ph: "e.g. Driver" },
    { key: "gross", label: "Gross (TZS)", type: "number", req: true, pos: true },
    { key: "deductions", label: "Deductions (TZS)", type: "number", def: 0 },
    { key: "status", label: "Status", type: "select", def: "Pending", opts: ["Pending", "Paid"] }
  ],
  computed: (d) => ({ net: (Number(d.gross) || 0) - (Number(d.deductions) || 0) }),
  columns: [
    { key: "period", label: "Period" },
    { key: "employee", label: "Employee", cls: "c-party" },
    { key: "role", label: "Role" },
    { key: "gross", label: "Gross", fmt: "money" },
    { key: "deductions", label: "Deductions", fmt: "money" },
    { key: "net", label: "Net Pay", fmt: "money" },
    { key: "status", label: "Status", fmt: "badge" }
  ],
  statusFn: (r) => r.status || "Pending",
  tabOrder: ["Pending", "Paid"],
  totalCols: ["gross", "deductions", "net"], totalLabelKey: "employee",
  empty: { icon: "\uD83D\uDC65", title: "No payroll records yet",
    sub: "Add each employee's salary for the period — net pay is calculated for you." }
});

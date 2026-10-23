// cheque-register (page 39) — cheques both directions.
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "cheques",
  addLabel: "Add Cheque", saveLabel: "Save", entity: "cheque",
  partyField: "party", partyLabel: "Party",
  fields: [
    { key: "chqNo", label: "Cheque No.", req: true, ph: "e.g. 100234" },
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "direction", label: "Direction", type: "select", req: true, opts: ["Issued", "Received"] },
    { key: "party", label: "Party", req: true, ph: "supplier / customer" },
    { key: "bank", label: "Bank", ph: "e.g. CRDB" },
    { key: "amount", label: "Amount (TZS)", type: "number", req: true, pos: true },
    { key: "status", label: "Status", type: "select", def: "Issued",
      opts: ["Issued", "Deposited", "Cleared", "Bounced", "Cancelled", "Void"] }
  ],
  columns: [
    { key: "chqNo", label: "Cheque No.", fmt: "no" },
    { key: "date", label: "Date", fmt: "date" },
    { key: "direction", label: "Direction" },
    { key: "party", label: "Party", cls: "c-party" },
    { key: "bank", label: "Bank" },
    { key: "amount", label: "Amount", fmt: "money" },
    { key: "status", label: "Status", fmt: "badge" }
  ],
  statusFn: (r) => r.status || "Issued",
  tabOrder: ["Issued", "Deposited", "Cleared", "Bounced", "Cancelled", "Void"],
  totalCols: ["amount"], totalLabelKey: "party",
  empty: { icon: "\uD83C\uDFE6", title: "No cheques yet",
    sub: "Record each cheque when it is issued or received, then update the status as it clears." }
});

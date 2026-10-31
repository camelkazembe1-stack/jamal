

import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "notes",
  where: { field: "direction", equals: "debit" },
  noField: "no", noPrefix: "DN", noPad: 3,
  addLabel: "Add Debit Note", saveLabel: "Save Note", entity: "debit note",
  partyLabel: "Supplier", partyField: "party",
  fields: [
    { key: "no", label: "Note No.", ro: true },
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "party", label: "Supplier", req: true, ph: "e.g. Supplier A" },
    { key: "reason", label: "Reason", req: true, ph: "e.g. damaged goods returned" },
    { key: "ref", label: "Ref", ph: "invoice / GRN no., optional" },
    { key: "amount", label: "Amount (TZS)", type: "number", req: true, pos: true }
  ],
  columns: [
    { key: "no", label: "Note No.", fmt: "no" },
    { key: "date", label: "Date", fmt: "date" },
    { key: "party", label: "Supplier", cls: "c-party" },
    { key: "reason", label: "Reason" },
    { key: "ref", label: "Ref" },
    { key: "amount", label: "Amount", fmt: "money" }
  ],
  totalCols: ["amount"], totalLabelKey: "reason",
  empty: { icon: "\uD83D\uDCC4", title: "No debit note registers yet", sub: "Record a debit note when goods are returned TO a supplier or an invoice must be corrected downward." }
});

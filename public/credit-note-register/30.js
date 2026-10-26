// credit-note-register (page 30) — note register (credit note).
// A CREDIT note credits the customer's account (reduces the customer's debt).
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "notes",
  where: { field: "direction", equals: "credit" },
  noField: "no", noPrefix: "CN", noPad: 3,
  addLabel: "Add Credit Note", saveLabel: "Save Note", entity: "credit note",
  partyLabel: "Customer", partyField: "party",
  fields: [
    { key: "no", label: "Note No.", ro: true },
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "party", label: "Customer", req: true, ph: "e.g. Customer A" },
    { key: "reason", label: "Reason", req: true, ph: "e.g. damaged goods returned" },
    { key: "ref", label: "Ref", ph: "invoice / GRN no., optional" },
    { key: "amount", label: "Amount (TZS)", type: "number", req: true, pos: true }
  ],
  columns: [
    { key: "no", label: "Note No.", fmt: "no" },
    { key: "date", label: "Date", fmt: "date" },
    { key: "party", label: "Customer", cls: "c-party" },
    { key: "reason", label: "Reason" },
    { key: "ref", label: "Ref" },
    { key: "amount", label: "Amount", fmt: "money" }
  ],
  totalCols: ["amount"], totalLabelKey: "reason",
  empty: { icon: "\uD83D\uDCC4", title: "No credit note registers yet", sub: "Record a credit note when a customer returns goods or their invoice must be corrected downward." }
});

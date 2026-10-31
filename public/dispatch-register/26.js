


import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "goods",
  where: { field: "direction", equals: "out" },
  noField: "no", noPrefix: "DSP", noPad: 3,
  addLabel: "Add Dispatch", saveLabel: "Save", entity: "dispatch",
  partyLabel: "Customer", partyField: "party",
  fields: [
    { key: "no", label: "No.", ro: true },
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "party", label: "Customer", req: true, ph: "e.g. Customer A" },
    { key: "product", label: "Product", req: true, ph: "e.g. Maize flour" },
    { key: "qty", label: "Quantity", type: "number", req: true, pos: true },
    { key: "unitPrice", label: "Unit Price (TZS)", type: "number", req: true, pos: true },
    { key: "ref", label: "Ref", ph: "Order no., optional" },
    { key: "note", label: "Note", ph: "optional" }
  ],
  computed: (d) => ({ total: (Number(d.qty) || 0) * (Number(d.unitPrice) || 0) }),
  columns: [
    { key: "no", label: "No.", fmt: "no" },
    { key: "date", label: "Date", fmt: "date" },
    { key: "party", label: "Customer", cls: "c-party" },
    { key: "product", label: "Product" },
    { key: "qty", label: "Qty", fmt: "num" },
    { key: "unitPrice", label: "Unit Price", fmt: "money" },
    { key: "total", label: "Value", fmt: "money" },
    { key: "ref", label: "Ref" },
    { key: "note", label: "Note" }
  ],
  totalCols: ["qty", "total"], totalLabelKey: "product",
  empty: { icon: "\uD83D\uDCE6", title: "No dispatch registers yet", sub: "Record a dispatch with Add Dispatch. Stock on hand and the valuation reports update automatically." }
});

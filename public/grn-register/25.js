


import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "goods",
  where: { field: "direction", equals: "in" },
  noField: "no", noPrefix: "GRN", noPad: 3,
  addLabel: "Add GRN", saveLabel: "Save", entity: "grn",
  partyLabel: "Supplier", partyField: "party",
  fields: [
    { key: "no", label: "No.", ro: true },
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "party", label: "Supplier", req: true, ph: "e.g. Supplier A" },
    { key: "product", label: "Product", req: true, ph: "e.g. Maize flour" },
    { key: "qty", label: "Quantity", type: "number", req: true, pos: true },
    { key: "unitPrice", label: "Unit Price (TZS)", type: "number", req: true, pos: true },
    { key: "ref", label: "Ref", ph: "PO no., optional" },
    { key: "note", label: "Note", ph: "optional" }
  ],
  computed: (d) => ({ total: (Number(d.qty) || 0) * (Number(d.unitPrice) || 0) }),
  columns: [
    { key: "no", label: "No.", fmt: "no" },
    { key: "date", label: "Date", fmt: "date" },
    { key: "party", label: "Supplier", cls: "c-party" },
    { key: "product", label: "Product" },
    { key: "qty", label: "Qty", fmt: "num" },
    { key: "unitPrice", label: "Unit Price", fmt: "money" },
    { key: "total", label: "Value", fmt: "money" },
    { key: "ref", label: "Ref" },
    { key: "note", label: "Note" }
  ],
  totalCols: ["qty", "total"], totalLabelKey: "product",
  empty: { icon: "\uD83D\uDCE6", title: "No grn registers yet", sub: "Record a delivery with Add GRN. Stock on hand, the Stock Movement report (page 31) and Inventory Valuation (page 46) pick it up automatically." }
});

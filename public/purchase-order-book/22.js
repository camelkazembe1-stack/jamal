


import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "orders",
  where: { field: "direction", equals: "purchase" },
  noField: "orderNo", noPrefix: "PO", noPad: 3,
  addLabel: "Add Purchase Order", saveLabel: "Save Order", entity: "purchase order",
  partyLabel: "Supplier", partyField: "party",
  fields: [
    { key: "orderNo", label: "Order No.", ro: true },
    { key: "date", label: "Order Date", type: "date", req: true, def: "today" },
    { key: "party", label: "Supplier", req: true, ph: "e.g. Supplier A" },
    { key: "product", label: "Product", req: true, ph: "e.g. Maize flour" },
    { key: "qty", label: "Quantity", type: "number", req: true, pos: true },
    { key: "unitPrice", label: "Unit Price (TZS)", type: "number", req: true, pos: true },
    { key: "expected", label: "Expected Delivery", type: "date", req: true },
    { key: "status", label: "Status", type: "select", req: true, def: "Pending",
      opts: ["Pending", "Confirmed", "Partially Fulfilled", "Completed", "Cancelled"] }
  ],
  computed: (d) => ({ total: (Number(d.qty) || 0) * (Number(d.unitPrice) || 0) }),
  columns: [
    { key: "orderNo", label: "Order No.", fmt: "no" },
    { key: "date", label: "Date", fmt: "date" },
    { key: "party", label: "Supplier", cls: "c-party" },
    { key: "product", label: "Product" },
    { key: "qty", label: "Qty", fmt: "num" },
    { key: "unitPrice", label: "Unit Price", fmt: "money" },
    { key: "total", label: "Total", fmt: "money" },
    { key: "expected", label: "Expected Delivery", fmt: "date" },
    { key: "status", label: "Status", fmt: "badge" }
  ],
  statusFn: (r) => r.status || "Pending",
  tabOrder: ["Pending", "Confirmed", "Partially Fulfilled", "Completed", "Cancelled"],
  totalCols: ["qty", "total"], totalLabelKey: "product",
  empty: { icon: "\uD83D\uDCCB", title: "No purchase order book yet", sub: "Record an order with Add Purchase Order. The purchase is only recognised when the goods are received (GRN)." }
});

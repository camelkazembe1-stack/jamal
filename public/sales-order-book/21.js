// sales-order-book (page 21) — config for the shared records engine.
// Orders are NOT sales/purchases until fulfilled: they live in their own
// collection and saving an order never moves stock or books a journal entry.
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "orders",
  where: { field: "direction", equals: "sales" },
  noField: "orderNo", noPrefix: "SO", noPad: 3,
  addLabel: "Add Sales Order", saveLabel: "Save Order", entity: "sales order",
  partyLabel: "Customer", partyField: "party",
  fields: [
    { key: "orderNo", label: "Order No.", ro: true },
    { key: "date", label: "Order Date", type: "date", req: true, def: "today" },
    { key: "party", label: "Customer", req: true, ph: "e.g. Customer A" },
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
    { key: "party", label: "Customer", cls: "c-party" },
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
  empty: { icon: "\uD83D\uDCCB", title: "No sales order book yet", sub: "Record a customer order with Add Sales Order. Orders are recorded here first — the sale is only recognised when the order is fulfilled." }
});

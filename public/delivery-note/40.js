
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "deliveryNotes",
  noField: "no", noPrefix: "DEL-", noPad: 3,
  addLabel: "Add Delivery Note", saveLabel: "Save Note", entity: "delivery note",
  partyField: "party", partyLabel: "Customer",
  fields: [
    { key: "no", label: "Note No.", ro: true },
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "party", label: "Customer", req: true, ph: "e.g. Customer A" },
    { key: "product", label: "Product", req: true, ph: "e.g. Maize flour" },
    { key: "qty", label: "Quantity", type: "number", req: true, pos: true },
    { key: "driver", label: "Driver / Vehicle", ph: "optional" },
    { key: "ref", label: "Ref", ph: "order no., optional" },
    { key: "status", label: "Status", type: "select", def: "Pending", opts: ["Pending", "Delivered"] }
  ],
  columns: [
    { key: "no", label: "Note No.", fmt: "no" },
    { key: "date", label: "Date", fmt: "date" },
    { key: "party", label: "Customer", cls: "c-party" },
    { key: "product", label: "Product" },
    { key: "qty", label: "Qty", fmt: "num" },
    { key: "driver", label: "Driver / Vehicle" },
    { key: "ref", label: "Ref" },
    { key: "status", label: "Status", fmt: "badge" }
  ],
  statusFn: (r) => r.status || "Pending",
  tabOrder: ["Pending", "Delivered"],
  totalCols: ["qty"], totalLabelKey: "product",
  empty: { icon: "\uD83D\uDCEC", title: "No delivery notes yet",
    sub: "Print-and-record: a note per delivery, marked Delivered once the customer signs for it." }
});

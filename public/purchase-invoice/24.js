


import { initRecords } from "/records/records.js";

const T0 = (() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; })();
const balOf = (r) => Math.max(0, (Number(r.total) || 0) - (Number(r.paidAmount) || 0));
const statusOf = (r) => {
  if (r.status === "Cancelled") return "Cancelled";
  if ((Number(r.total) || 0) > 0 && balOf(r) <= 0.009) return "Paid";
  const due = r.dueDate ? new Date(r.dueDate + "T00:00:00") : null;
  if (due && due < T0) return "Overdue";           
  if ((Number(r.paidAmount) || 0) > 0) return "Partially Paid";
  return "Unpaid";
};

initRecords({
  root: "#app", collection: "invoices",
  where: { field: "direction", equals: "purchase" },
  noField: "invNo", noPrefix: "PI", noPad: 3,
  addLabel: "Add Purchase Invoice", saveLabel: "Save Invoice", entity: "purchase invoice",
  partyLabel: "Supplier", partyField: "party",
  fields: [
    { key: "invNo", label: "Invoice No.", ro: true },
    { key: "date", label: "Invoice Date", type: "date", req: true, def: "today" },
    { key: "party", label: "Supplier", req: true, ph: "e.g. Supplier A" },
    { key: "description", label: "Description", ph: "e.g. 50 bags maize flour" },
    { key: "subtotal", label: "Subtotal (TZS)", type: "number", req: true, pos: true },
    { key: "discount", label: "Discount (TZS)", type: "number", def: 0 },
    { key: "tax", label: "Tax (TZS)", type: "number", def: 0 },
    { key: "terms", label: "Terms", type: "select", def: "Due on receipt",
      opts: ["Due on receipt", "Net 7", "Net 15", "Net 30"] },
    { key: "dueDate", label: "Due Date", type: "date", req: true }
  ],
  computed: (d) => ({
    total: (Number(d.subtotal) || 0) - (Number(d.discount) || 0) + (Number(d.tax) || 0),
    paidAmount: 0, datePaid: null, status: "Active"
  }),
  columns: [
    { key: "invNo", label: "Invoice No.", fmt: "no" },
    { key: "date", label: "Date", fmt: "date" },
    { key: "party", label: "Supplier", cls: "c-party" },
    { key: "description", label: "Description" },
    { key: "subtotal", label: "Subtotal", fmt: "money" },
    { key: "discount", label: "Discount", fmt: "money" },
    { key: "tax", label: "Tax", fmt: "money" },
    { key: "total", label: "Total", fmt: "money" },
    { key: "paidAmount", label: "Paid", fmt: "money" },
    { key: "balance", label: "Balance Due", fmt: "money", val: balOf },
    { key: "dueDate", label: "Due Date", fmt: "date" },
    { key: "status", label: "Status", fmt: "badge" }
  ],
  statusFn: statusOf,
  tabOrder: ["Unpaid", "Partially Paid", "Paid", "Overdue", "Cancelled"],
  totalCols: ["subtotal", "discount", "tax", "total", "paidAmount"], totalLabelKey: "description",
  summary: { title: "Outstanding per supplier", key: (r) => r.party, val: balOf },
  settle: { baseField: "total", amountField: "paidAmount", dateField: "datePaid",
            partyField: "party", label: "Pay", btn: "Pay" },
  countExtra: (rows) => {
    const out = rows.reduce((s, r) => s + balOf(r), 0);
    return "Total outstanding: " + out.toLocaleString("en-US") + ".";
  },
  empty: { icon: "\uD83E\uDDFE", title: "No purchase invoices yet", sub: "Add a supplier invoice after the goods are received (GRN). Use ＋ Pay to record money paid — partial payments are allowed." }
});

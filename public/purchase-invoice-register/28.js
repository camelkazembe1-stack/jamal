

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
  readOnly: true, entity: "purchase invoice register",
  partyLabel: "Supplier", partyField: "party",
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
  countExtra: (rows) => {
    const out = rows.reduce((s, r) => s + balOf(r), 0);
    return "Total outstanding: " + out.toLocaleString("en-US") + ".";
  },
  empty: { icon: "\uD83E\uDDFE", title: "No invoices registered yet",
    sub: "This register fills itself from the purchase invoice registers recorded on page 24 — no re-entry." }
});

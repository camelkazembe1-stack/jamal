
import { initBankRec } from "/reports/reports.js";
import { initRecords } from "/records/records.js";

initBankRec({ root: "#sum" });


initRecords({
  root: "#items", collection: "bankrec",
  addLabel: "Add Item", saveLabel: "Save Item", entity: "reconciling item",
  fields: [
    { key: "date", label: "Date", type: "date", req: true, def: "today" },
    { key: "type", label: "Type", type: "select", req: true,
      opts: ["Balance per bank statement", "Deposit in transit", "Outstanding cheque",
             "Bank charge", "Bank credit", "Error"] },
    { key: "detail", label: "Detail", ph: "e.g. unpresented cheque 100234" },
    { key: "amount", label: "Amount (TZS)", type: "number", req: true }
  ],
  columns: [
    { key: "date", label: "Date", fmt: "date" },
    { key: "type", label: "Type" },
    { key: "detail", label: "Detail", cls: "c-party" },
    { key: "amount", label: "Amount", fmt: "money" }
  ],
  totalLabelKey: "detail",
  empty: { icon: "\uD83C\uDFE7", title: "No reconciling items yet",
    sub: "Start with the statement balance, then add deposits in transit, outstanding cheques, charges and credits." }
});

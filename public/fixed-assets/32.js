
import { initRecords } from "/records/records.js";

initRecords({
  root: "#app", collection: "assets",
  addLabel: "Add Asset", saveLabel: "Save Asset", entity: "asset",
  fields: [
    { key: "name", label: "Asset Name", req: true, ph: "e.g. Delivery Van" },
    { key: "category", label: "Category", type: "select", req: true,
      opts: ["Vehicles", "Equipment", "Furniture", "Buildings", "Other"] },
    { key: "dateAcquired", label: "Date Acquired", type: "date", req: true, def: "today" },
    { key: "cost", label: "Cost (TZS)", type: "number", req: true, pos: true },
    { key: "salvage", label: "Salvage Value (TZS)", type: "number", def: 0 },
    { key: "life", label: "Useful Life (Years)", type: "number", req: true, pos: true }
  ],
  computed: (d) => ({
    annualDep: ((Number(d.cost) || 0) - (Number(d.salvage) || 0)) / (Number(d.life) || 1)
  }),
  columns: [
    { key: "name", label: "Asset", cls: "c-party" },
    { key: "category", label: "Category" },
    { key: "dateAcquired", label: "Acquired", fmt: "date" },
    { key: "cost", label: "Cost", fmt: "money" },
    { key: "salvage", label: "Salvage", fmt: "money" },
    { key: "life", label: "Life (yrs)", fmt: "num" },
    { key: "annualDep", label: "Annual Depreciation", fmt: "money" }
  ],
  totalCols: ["cost", "annualDep"], totalLabelKey: "category",
  empty: { icon: "\uD83C\uDFDB\uFE0F", title: "No fixed assets yet",
    sub: "Add each asset once (cost, salvage, useful life) — every depreciation report builds itself from this register." }
});

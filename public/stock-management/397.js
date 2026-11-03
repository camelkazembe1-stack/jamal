import { initRecords } from "/records/records.js";

await initRecords({
  root: "#app", collection: "stockItems", entity: "stock item",
  addLabel: "Add Stock Item", saveLabel: "Save",
  fields: [
    { key: "name", label: "Name", req: true, ph: "e.g. Sugar 1kg" },
    { key: "buyPrice", label: "Buying Price per Package", type: "number", req: true, pos: true },
    { key: "unitsPerPackage", label: "Units per Package", type: "number", req: true, pos: true },
    { key: "unitPrice", label: "Unit Selling Price", type: "number", req: true, pos: true }
  ],
  columns: [
    { key: "name", label: "Name", cls: "c-party" },
    { key: "buyPrice", label: "Buying Price / Package", fmt: "money" },
    { key: "unitsPerPackage", label: "Units / Package", fmt: "num" },
    { key: "unitPrice", label: "Unit Selling Price", fmt: "money" }
  ],
  empty: {
    icon: "\uD83D\uDCE6",
    title: "No stock items yet",
    sub: "Add a stock item \u2014 the four prices feed Stock Progress and Stock Change, and Units per Package converts between packages and units."
  }
});

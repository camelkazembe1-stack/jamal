

import { initRecords } from "/records/records.js";
import { wirePackageUnitLink } from "/stock-register/link.js";

await initRecords({
  root: "#app", collection: "stockItems", entity: "stock item",
  addLabel: "Add Stock Item", saveLabel: "Save",
  fields: [
    { key: "name", label: "Name", req: true, ph: "e.g. Sugar 1kg" },
    { key: "buyPrice", label: "Buying Price per Package", type: "number", req: true, pos: true },
    { key: "unitsPerPackage", label: "Units per Package", type: "number", req: true, pos: true },
    { key: "unitPrice", label: "Unit Selling Price", type: "number", req: true, pos: true },
    { key: "packages", label: "Package", type: "number", req: true, pos: true },
    { key: "units", label: "Unit", type: "number", req: true, pos: true }
  ],
  columns: [
    { key: "name", label: "Name", cls: "c-party" },
    { key: "buyPrice", label: "Buying Price / Package", fmt: "money" },
    { key: "unitsPerPackage", label: "Units / Package", fmt: "num" },
    { key: "unitPrice", label: "Unit Selling Price", fmt: "money" },
    { key: "packages", label: "Packages", fmt: "num" },
    { key: "units", label: "Units", fmt: "num" }
  ],
  empty: {
    icon: "\uD83D\uDCE6",
    title: "No stock items yet",
    sub: "Add a stock item \u2014 enter the quantity as Packages or as Units and the other box calculates itself from Units per Package."
  }
});

const link = wirePackageUnitLink(document.querySelector("#app .r-form"));
const tgl = document.querySelector("#app .r-toggle");
if (tgl && link) tgl.addEventListener("click", () => setTimeout(() => link.reset(), 0));

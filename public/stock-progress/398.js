import { requireAuth, db, collection, query, orderBy, onSnapshot } from "/firebase.js";

await requireAuth();

const $ = (s) => document.querySelector(s);
const body = $("#prog-body");
const emptyBox = $("#prog-empty");
const tableCard = document.querySelector(".prog-card");
const countLine = $("#prog-count");

const fmtM = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

onSnapshot(query(collection(db, "stockItems"), orderBy("name")), (snap) => {
  const rows = [];
  snap.forEach((d) => rows.push(d.data({ serverTimestamps: "estimate" })));

  if (!rows.length) {
    tableCard.style.display = "none";
    emptyBox.hidden = false;
    countLine.textContent = "";
    body.innerHTML = "";
    return;
  }

  tableCard.style.display = "";
  emptyBox.hidden = true;

  body.innerHTML = rows.map((r, i) => {
    const units = Number(r.units || 0);
    return "<tr>" +
      "<td>" + (i + 1) + "</td>" +
      '<td class="c-party">' + esc(r.name) + "</td>" +
      '<td class="amt">' + units.toLocaleString("en-US") + "</td>" +
      '<td class="amt">' + fmtM(r.unitPrice) + "</td>" +
      '<td class="amt">' + fmtM(r.buyPrice) + "</td>" +
      "</tr>";
  }).join("");

  countLine.textContent = rows.length === 1 ? "1 stock item." : rows.length + " stock items.";
}, (e) => {
  countLine.textContent = "Could not load stock: " + ((e && e.message) || e);
});

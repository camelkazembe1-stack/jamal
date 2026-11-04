import { requireAuth, db, collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "/firebase.js";

await requireAuth();

const $ = (s) => document.querySelector(s);
const body = $("#prog-body");
const emptyBox = $("#prog-empty");
const tableCard = document.querySelector(".prog-card");
const countLine = $("#prog-count");

const fmtM = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let ROWS = [];

/* ---------------- per-row actions: Pen (edit) and Bin (delete) ----------- */

function closeEdit() {
  const open = body.querySelector("tr.edit-row");
  if (open) open.remove();
}

function openEdit(id) {
  closeEdit();
  const r = ROWS.find((x) => x.id === id);
  if (!r) return;

  const tr = document.createElement("tr");
  tr.className = "edit-row";
  const td = document.createElement("td");
  td.colSpan = 6;
  const f = document.createElement("div");
  f.className = "edit-form";

  const mk = (label, val, type, min) => {
    const lab = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = label;
    const inp = document.createElement("input");
    inp.type = type;
    inp.value = val;
    inp.step = "any";
    if (min != null) inp.min = String(min);
    lab.append(span, inp);
    return inp;
  };

  const inName = mk("Stock Name", r.name || "", "text");
  const inUnits = mk("Units Present", String(Number(r.units || 0)), "number", 0);
  const inSP = mk("Unit SP", String(Number(r.unitPrice || 0)), "number", 0);
  const inBP = mk("Package BP", String(Number(r.buyPrice || 0)), "number", 0);
  const inUPP = mk("Units per Package", String(Number(r.unitsPerPackage || 0)), "number", 1);

  const ok = document.createElement("button");
  ok.type = "button"; ok.className = "btn-primary"; ok.textContent = "Save";
  const cancel = document.createElement("button");
  cancel.type = "button"; cancel.className = "btn-ghost"; cancel.textContent = "Cancel";
  const msg = document.createElement("span");
  msg.className = "edit-msg";

  f.append(inName, inUnits, inSP, inBP, inUPP, ok, cancel, msg);
  td.appendChild(f); tr.appendChild(td);
  const row = body.querySelector('tr[data-id="' + id + '"]');
  if (row) row.insertAdjacentElement("afterend", tr); else body.appendChild(tr);
  inName.focus();

  cancel.addEventListener("click", closeEdit);
  ok.addEventListener("click", async () => {
    msg.textContent = "";
    const name = inName.value.trim();
    if (!name) { msg.textContent = "Enter the stock name."; return; }
    const units = Number(inUnits.value), sp = Number(inSP.value);
    const bp = Number(inBP.value), upp = Number(inUPP.value);
    if (isNaN(units) || units < 0) { msg.textContent = "Units Present cannot be below zero."; return; }
    if (isNaN(sp) || sp < 0) { msg.textContent = "Unit SP cannot be below zero."; return; }
    if (isNaN(bp) || bp < 0) { msg.textContent = "Package BP cannot be below zero."; return; }
    if (isNaN(upp) || upp <= 0) { msg.textContent = "Units per Package must be more than zero."; return; }
    ok.disabled = true; ok.textContent = "Saving\u2026";
    try {
      await updateDoc(doc(db, "stockItems", id), {
        name: name, units: units, unitPrice: sp, buyPrice: bp, unitsPerPackage: upp
      });
    } catch (e) {
      ok.disabled = false; ok.textContent = "Save";
      msg.textContent = "Save failed: " + ((e && e.message) || e);
    }
  });
}

async function doDelete(id) {
  const r = ROWS.find((x) => x.id === id);
  if (!r) return;
  const ask = 'Delete "' + (r.name || "this stock item") + '" from stock?\n\n' +
    "It disappears from Stock Progress and Stock Register. Its past transactions and stock changes stay in the books.";
  if (!window.confirm(ask)) return;
  countLine.textContent = "Deleting\u2026";
  try {
    await deleteDoc(doc(db, "stockItems", id));
  } catch (e) {
    countLine.textContent = "Delete failed: " + ((e && e.message) || e);
  }
}

body.addEventListener("click", (ev) => {
  const pen = ev.target.closest(".pen-btn");
  if (pen) { openEdit(pen.dataset.id); return; }
  const bin = ev.target.closest(".bin-btn");
  if (bin) doDelete(bin.dataset.id);
});

/* ------------------------------- the live table -------------------------- */

onSnapshot(query(collection(db, "stockItems"), orderBy("name")), (snap) => {
  ROWS = [];
  snap.forEach((d) =>
    ROWS.push(Object.assign({ id: d.id }, d.data({ serverTimestamps: "estimate" }))));

  if (!ROWS.length) {
    tableCard.style.display = "none";
    emptyBox.hidden = false;
    countLine.textContent = "";
    body.innerHTML = "";
    return;
  }

  tableCard.style.display = "";
  emptyBox.hidden = true;

  body.innerHTML = ROWS.map((r, i) =>
    "<tr data-id=\"" + esc(r.id) + "\">" +
    "<td>" + (i + 1) + "</td>" +
    '<td class="c-party">' + esc(r.name) + "</td>" +
    '<td class="amt">' + Number(r.units || 0).toLocaleString("en-US") + "</td>" +
    '<td class="amt">' + fmtM(r.unitPrice) + "</td>" +
    '<td class="amt">' + fmtM(r.buyPrice) + "</td>" +
    '<td class="act">' +
    '<button class="row-btn pen-btn" type="button" data-id="' + esc(r.id) +
    '" title="Edit this stock item">\u270F\uFE0F Pen</button>' +
    '<button class="row-btn bin-btn" type="button" data-id="' + esc(r.id) +
    '" title="Delete this stock item">\uD83D\uDDD1\uFE0F Bin</button>' +
    "</td>" +
    "</tr>"
  ).join("");

  countLine.textContent = ROWS.length === 1 ? "1 stock item." : ROWS.length + " stock items.";
}, (e) => {
  countLine.textContent = "Could not load stock: " + ((e && e.message) || e);
});

/* JAMALI - public/pickers.js, the register pickers.
 *
 * Loaded on every page by sidebar.js. When a page shows a Customer,
 * Supplier, Product or Employee box, the box offers the names kept in
 * the Customers, Suppliers, Stock Register and Employees registers as
 * you type. Free text still works. Picking a known name also:
 *   - corrects its spelling to the register's spelling,
 *   - fills an empty Unit Price from the stock item (selling price on
 *     customer documents, buying price per unit on supplier documents),
 *   - fills an empty Role and Gross from the employee record.
 * The data layer (/502.js) is only loaded once such a box appears.
 */
const SEL = 'input[data-f="party"],input[data-f="product"],input[data-f="employee"],#in-person';
let api = null, seq = 0;
const load = () => (api = api || import("/502.js"));

async function records(coll) {
  const m = await load();
  const snap = await m.getDocs(m.collection(m.db, coll));
  return snap.docs.map((d) => Object.assign({ __id: d.id }, d.data())).filter((r) => r && r.name);
}

function sideOf(input) {
  const form = input.closest("form") || document;
  const party = form.querySelector('input[data-f="party"]');
  const label = String((party && party.closest("label") && party.closest("label").textContent) || "").toLowerCase();
  if (label.indexOf("supplier") !== -1) return "suppliers";
  if (label.indexOf("customer") !== -1) return "customers";
  return "";
}

function collsFor(input) {
  const key = input.dataset.f || input.id;
  if (key === "product") return ["stockItems"];
  if (key === "employee") return ["employees"];
  if (key === "party") { const s = sideOf(input); return s ? [s] : ["customers", "suppliers"]; }
  return ["customers", "suppliers"];
}

async function refresh(input) {
  const lists = await Promise.all(collsFor(input).map(records));
  const seen = new Set(), recs = [];
  lists.flat().forEach((r) => {
    const k = String(r.name).trim().toLowerCase();
    if (!seen.has(k)) { seen.add(k); recs.push(r); }
  });
  recs.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  input.__jpRecs = recs;
  const dl = document.getElementById(input.getAttribute("list"));
  if (!dl) return;
  dl.innerHTML = "";
  recs.forEach((r) => {
    const o = document.createElement("option");
    o.value = r.name;
    const extra = r.phone || r.role || (r.unitPrice != null ? "price " + r.unitPrice : "");
    if (extra) o.label = String(extra);
    dl.appendChild(o);
  });
}

function fillIfEmpty(form, key, val) {
  const el = form.querySelector('[data-f="' + key + '"]');
  if (!el || val == null || val === "" || isNaN(Number(val)) && key !== "role") return;
  if (String(el.value).trim() === "" || (el.type === "number" && Number(el.value) === 0)) {
    el.value = key === "role" ? val : Math.round(Number(val) * 100) / 100;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function picked(input) {
  const v = String(input.value || "").trim().toLowerCase();
  const rec = (input.__jpRecs || []).find((r) => String(r.name).trim().toLowerCase() === v);
  if (!rec) return;
  if (input.value !== rec.name) input.value = rec.name;
  const form = input.closest("form");
  if (!form) return;
  const key = input.dataset.f;
  if (key === "product") {
    const per = Number(rec.unitsPerPackage) || 0;
    const price = sideOf(input) === "suppliers"
      ? (per > 0 ? Number(rec.buyPrice) / per : null)
      : rec.unitPrice;
    fillIfEmpty(form, "unitPrice", price);
  } else if (key === "employee") {
    fillIfEmpty(form, "role", rec.role);
    fillIfEmpty(form, "gross", rec.salary);
  }
}

function attach(input) {
  if (input.__jp) return;
  input.__jp = true;
  const dl = document.createElement("datalist");
  dl.id = "jamali-picker-" + (++seq);
  document.body.appendChild(dl);
  input.setAttribute("list", dl.id);
  input.setAttribute("autocomplete", "off");
  const go = () => refresh(input).catch(() => {});
  input.addEventListener("focus", go);
  input.addEventListener("change", () => picked(input));
  go();
}

function scan(root) {
  if (!root || !root.querySelectorAll) return;
  if (root.matches && root.matches(SEL)) attach(root);
  root.querySelectorAll(SEL).forEach(attach);
}

scan(document);
new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(scan)))
  .observe(document.documentElement, { childList: true, subtree: true });

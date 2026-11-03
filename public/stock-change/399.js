import { requireAuth, db, collection, doc, getDoc, query, orderBy, onSnapshot,
         writeBatch, increment, serverTimestamp } from "/firebase.js";

await requireAuth();

// The fourteen causes, in the four groups of the spec.
// money: "IN"  -> transaction type IN,  amount at Unit Selling Price (SP)
//        "OUT" -> transaction type OUT, amount at Buying Price (BP)
//        null  -> no money moves,       type NEUTRAL, amount at BP
const GROUPS = [
  { label: "Stock IN \u2013 With Money", badge: "b-in", dir: "IN", causes: [
    { name: "Purchases",     icon: "\u{1F6D2}" },
    { name: "Sales Returns", icon: "\u{21A9}\uFE0F" }
  ]},
  { label: "Stock IN \u2013 Without Money", badge: "b-in", dir: "IN", causes: [
    { name: "Free Stock Received",  icon: "\u{1F381}" },
    { name: "Stock Transfers IN",   icon: "\u{1F4E5}" },
    { name: "Stock Adjustments IN", icon: "\u{2795}" }
  ]},
  { label: "Stock OUT \u2013 With Money", badge: "b-out", dir: "OUT", causes: [
    { name: "Sales",             icon: "\u{1F4B0}" },
    { name: "Purchases Returns", icon: "\u{21AA}\uFE0F" }
  ]},
  { label: "Stock OUT \u2013 Without Money", badge: "b-out", dir: "OUT", causes: [
    { name: "Stock Damage",           icon: "\u{1F6AB}" },
    { name: "Stock Expiry",           icon: "\u{23F0}" },
    { name: "Theft",                  icon: "\u{1F6A8}" },
    { name: "Internal Use",           icon: "\u{1F3E2}" },
    { name: "Free Samples",           icon: "\u{1F9FA}" },
    { name: "Stock Transfers OUT",    icon: "\u{1F4E4}" },
    { name: "Stock Adjustments OUT",  icon: "\u{2796}" }
  ]}
];
const MONEY = { "Purchases": "OUT", "Sales Returns": "OUT", "Sales": "IN", "Purchases Returns": "IN" };
const METHOD_ICONS = { Cash: "\u{1F4B5}", Credit: "\u{1F464}", Bank: "\u{1F3DB}\uFE0F" };

const $ = (s) => document.querySelector(s);
const state = { cause: null, dir: null, money: null, method: null, stock: null };
let STOCKS = [];
let searchQ = "";

const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const round = (n) => Math.round(n * 10000) / 10000;

function showStep(n) {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("is-active"));
  $("#step-" + n).classList.add("is-active");
  window.scrollTo({ top: 0 });
}

// ---- step 1: the fourteen cause buttons -----------------------------------
$("#groups").innerHTML = GROUPS.map((g) =>
  '<section class="group">' +
    '<h2 class="group-label"><span class="badge ' + g.badge + '">' +
      (g.dir === "IN" ? "STOCK IN" : "STOCK OUT") + "</span> " +
      esc(g.label.split("\u2013")[1].trim()) + "</h2>" +
    '<div class="grid">' +
      g.causes.map((c) =>
        '<button class="tile" type="button" data-cause="' + esc(c.name) + '">' +
          '<span class="tile-icon">' + c.icon + "</span>" +
          '<span class="tile-label">' + esc(c.name) + "</span></button>").join("") +
    "</div></section>").join("");

document.querySelectorAll("#groups .tile").forEach((btn) =>
  btn.addEventListener("click", () => {
    state.cause = btn.dataset.cause;
    state.dir = btn.closest(".group").querySelector(".badge").textContent.includes("IN") ? "IN" : "OUT";
    state.money = MONEY[state.cause] || null;
    state.method = null;
    openStocks();
  }));

// ---- step 2: search + the registered stocks as square buttons --------------
function renderStocks() {
  const grid = $("#stock-grid");
  const q = searchQ.trim().toLowerCase();
  const list = STOCKS.filter((r) => !q || String(r.name || "").toLowerCase().includes(q));
  $("#stock-empty").hidden = STOCKS.length > 0;
  grid.style.display = list.length ? "" : "none";
  grid.innerHTML = list.map((r) =>
    '<button class="tile" type="button" data-id="' + esc(r.id) + '">' +
      '<span class="tile-icon">📦</span>' +
      '<span class="tile-label">' + esc(r.name) + "</span>" +
      '<span class="tile-units">' + Number(r.units || 0).toLocaleString("en-US") + " units</span></button>").join("");
  grid.querySelectorAll(".tile").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.stock = STOCKS.find((r) => r.id === btn.dataset.id);
      openForm();
    }));
}

onSnapshot(query(collection(db, "stockItems"), orderBy("name")), (snap) => {
  STOCKS = [];
  snap.forEach((d) => STOCKS.push(Object.assign({ id: d.id }, d.data({ serverTimestamps: "estimate" }))));
  renderStocks();
});

$("#stock-search").addEventListener("input", (e) => { searchQ = e.target.value; renderStocks(); });

function openStocks() {
  $("#cause-title").textContent = state.cause;
  $("#cause-sub").textContent = "Step 2 of 3 \u00B7 " +
    (state.dir === "IN" ? "Stock IN" : "Stock OUT") +
    (state.money ? " \u00B7 with money" : " \u00B7 without money") +
    " \u2014 pick the stock, then enter the quantity.";
  $("#stock-search").value = "";
  searchQ = "";
  renderStocks();
  showStep(2);
}

// ---- step 3: quantity + flow method + preview + save -----------------------
const uppOf = () => Number(state.stock && state.stock.unitsPerPackage) || 0;

function openForm() {
  const r = state.stock;
  $("#form-title").textContent = state.cause + " \u2014 " + r.name;
  $("#form-sub").textContent = "Step 3 of 3 \u00B7 " +
    (state.dir === "IN" ? "Stock IN \u2014 adds units" : "Stock OUT \u2014 deducts units") +
    " \u00B7 " + Number(r.units || 0).toLocaleString("en-US") + " unit(s) present now.";
  $("#in-packages").value = "";
  $("#in-units").value = "";
  $("#in-person").value = "";
  $("#in-bank").value = "";
  $("#form-err").hidden = true;
  $("#preview").textContent = "";

  const upp = uppOf();
  $("#qty-hint").textContent = upp
    ? "1 package = " + upp + " units \u2014 type the Packages or the Units and the other box calculates itself."
    : "";

  const needsMethod = !!state.money;
  $("#f-method").hidden = !needsMethod;
  $("#f-person").hidden = true;
  $("#f-bank").hidden = true;
  if (needsMethod) {
    $("#method-seg").innerHTML = ["Cash", "Credit", "Bank"].map((m) =>
      '<button class="seg-btn" type="button" data-v="' + m + '">' + METHOD_ICONS[m] + " " + m + "</button>").join("");
    document.querySelectorAll("#method-seg .seg-btn").forEach((b) =>
      b.addEventListener("click", () => {
        state.method = b.dataset.v;
        document.querySelectorAll("#method-seg .seg-btn").forEach((x) => x.classList.toggle("is-on", x === b));
        $("#f-person").hidden = state.method !== "Credit";
        $("#f-bank").hidden = state.method !== "Bank";
        updatePreview();
      }));
  } else {
    state.method = null;
  }
  showStep(3);
  updatePreview();
}

// Packages and Units are two representations of one quantity, joined by
// Units per Package: packages x unitsPerPackage = units.
let lastQty = "";
function wireQty(which) {
  lastQty = which;
  const upp = uppOf();
  if (!upp) return;
  if (which === "pk") {
    const pk = $("#in-packages").value;
    $("#in-units").value = pk === "" ? "" : round(Number(pk) * upp);
  } else {
    const un = $("#in-units").value;
    $("#in-packages").value = un === "" ? "" : round(Number(un) / upp);
  }
}
$("#in-packages").addEventListener("input", () => { wireQty("pk"); updatePreview(); });
$("#in-units").addEventListener("input", () => { wireQty("un"); updatePreview(); });
["#in-person", "#in-bank"].forEach((s) => $(s).addEventListener("input", updatePreview));

function txnTypeOf() { return state.money ? state.money : "NEUTRAL"; }

function unitPriceOf() {
  const r = state.stock;
  return state.money === "IN"
    ? Number(r.unitPrice || 0)
    : Number(r.buyPrice || 0) / (uppOf() || 1);
}

function updatePreview() {
  if (!state.stock) return;
  const r = state.stock;
  const units = Number($("#in-units").value) || 0;
  const before = Number(r.units || 0);
  const after = state.dir === "IN" ? before + units : before - units;
  const amount = Math.round(units * unitPriceOf() * 100) / 100;

  let p = state.cause + " \u00B7 " + r.name + " \u00B7 " + units + " unit(s) \u00B7 " +
    before.toLocaleString("en-US") + " \u2192 " + after.toLocaleString("en-US");
  p += "   |   transaction: " + state.cause + " \u00B7 " + txnTypeOf();
  if (state.money) {
    p += " \u00B7 " + (state.method || "method\u2026");
    const nm = state.method === "Credit" ? $("#in-person").value.trim()
             : state.method === "Bank" ? $("#in-bank").value.trim() : "";
    if (nm) p += " \u00B7 " + nm;
  } else {
    p += " \u00B7 no flow method";
  }
  p += " \u00B7 " + fmt(amount) + (state.money === "IN" ? " (SP)" : " (BP)");
  $("#preview").textContent = "Will save: " + p;
}

// ---- save: stock record + transaction record + movement log, one batch -----
$("#save-btn").addEventListener("click", async () => {
  const err = (m) => { const e = $("#form-err"); e.textContent = m; e.hidden = false; };
  $("#form-err").hidden = true;

  const r = state.stock;
  const units = Number($("#in-units").value) || 0;
  if (!units || units <= 0) return err("Enter the number of units first.");

  let cur = Number(r.units || 0);
  try {
    const fresh = await getDoc(doc(db, "stockItems", r.id));
    if (!fresh.exists()) return err("That stock item no longer exists \u2014 it may have been deleted.");
    cur = Number(fresh.data().units || 0);
  } catch (e) { /* keep the snapshot figure if the read fails */ }

  if (state.dir === "OUT" && units > cur)
    return err("Only " + cur.toLocaleString("en-US") + " unit(s) of " + r.name +
               " present \u2014 you cannot take out " + units + ".");

  let flowMethod = "N/A", name = null;
  const txnType = txnTypeOf();
  if (state.money) {
    if (!state.method) return err("Choose Cash, Credit or Bank.");
    flowMethod = state.method;
    if (state.method === "Credit") {
      name = $("#in-person").value.trim();
      if (!name) return err("Enter the person's name.");
    } else if (state.method === "Bank") {
      name = $("#in-bank").value.trim();
      if (!name) return err("Enter the bank name.");
    }
  }

  const amount = Math.round(units * unitPriceOf() * 100) / 100;
  const delta = state.dir === "IN" ? units : -units;
  const after = cur + delta;

  const btn = $("#save-btn");
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "stockItems", r.id), { units: increment(delta) });
    batch.set(doc(collection(db, "transactions")), {
      transactionName: state.cause, dateTime: serverTimestamp(),
      flowMethod, transactionType: txnType, name, amount
    });
    batch.set(doc(collection(db, "stockChanges")), {
      stockId: r.id, stockName: r.name, cause: state.cause, direction: state.dir,
      units, amount, transactionType: txnType, flowMethod, name, createdAt: serverTimestamp()
    });
    await batch.commit();
    $("#done-note").textContent = r.name + " moved from " + cur.toLocaleString("en-US") +
      " to " + after.toLocaleString("en-US") + " units \u2014 the transaction was saved to the business transactions and the movement was logged.";
    showStep(4);
  } catch (e) {
    err("Save failed: " + (e && e.code === "permission-denied"
      ? "check your Firestore rules and sign in again."
      : (e && e.message) || e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Stock Change";
  }
});

// ---- back navigation -------------------------------------------------------
$("#back-2").addEventListener("click", () => { state.cause = state.dir = state.money = null; showStep(1); });
$("#back-3").addEventListener("click", () => openStocks());
$("#again-btn").addEventListener("click", () => {
  state.cause = state.dir = state.money = state.method = state.stock = null;
  showStep(1);
});

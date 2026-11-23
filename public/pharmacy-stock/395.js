import { requireAuth, db, collection, doc, addDoc, updateDoc, onSnapshot,
         serverTimestamp, writeBatch, increment } from "/sidebar.js";

window.__p95.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
const money = (n) => num(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
const who = () => String((localStorage.getItem("jamaliIdentityCache") || "unknown"));

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p95) window.__p95.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
  if (code.indexOf("permission-denied") >= 0) {
    const hint = document.getElementById("h-err-hint");
    if (hint) hint.hidden = false;
  }
}
function bootDone() {
  if (window.__p95) window.__p95.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth();
  window.__p95.auth = true;
} catch (e) {
  herr("the sign-in check", e);
  throw e;
}

// ---- live data --------------------------------------------------------------
let DRUGS = [];        // stockItems docs with category "Drugs"
let MOVES = [];        // stockChanges docs touching drug items

onSnapshot(collection(db, "stockItems"), (snap) => {
  DRUGS = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .filter((r) => String(r.category || "") === "Drugs")
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  renderAll();
}, (e) => herr("stockItems", e));

onSnapshot(collection(db, "stockChanges"), (snap) => {
  const ids = new Set(DRUGS.map((d) => d.__id));
  MOVES = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .filter((r) => ids.has(String(r.stockId || "")))
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")))
    .slice(0, 60);
  renderMoves();
}, (e) => herr("stockChanges", e));

window.__p95.listeners = 2;

// ---- helpers ----------------------------------------------------------------
const todayISO = () => { const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const in90 = () => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString().slice(0, 10); };
const daysTo = (iso) => { const t = new Date(iso + "T00:00:00").getTime();
  return isNaN(t) ? null : Math.round((t - new Date(todayISO() + "T00:00:00").getTime()) / 86400000); };

function statusOf(d) {
  const dd = String(d.expiry || "");
  if (dd && dd < todayISO()) return "expired";
  if (dd && daysTo(dd) <= 90) return "soon";
  if (num(d.units) <= num(d.reorderLevel || 0)) return "low";
  return "ok";
}
const ST = { ok: ["st-ok", "In stock"], low: ["st-low", "Low stock"], soon: ["st-soon", "Expiring soon"], expired: ["st-expired", "EXPIRED"] };

function err(el, m) { const e = document.getElementById(el); e.textContent = m; e.hidden = !m; }
function ok(el, m) { const e = document.getElementById(el); e.textContent = m; e.hidden = !m; }

// ---- render -----------------------------------------------------------------
function renderAll() {
  // dashboards
  const low = DRUGS.filter((d) => statusOf(d) === "low").length;
  const expired = DRUGS.filter((d) => statusOf(d) === "expired").length;
  const soon = DRUGS.filter((d) => statusOf(d) === "soon").length;
  $("#d-items").textContent = String(DRUGS.length);
  $("#d-low").textContent = String(low);
  $("#d-expired").textContent = String(expired);
  $("#d-soon").textContent = String(soon);

  // alerts
  const alerts = [];
  DRUGS.forEach((d) => {
    const st = statusOf(d);
    if (st === "expired") alerts.push('<li class="al-expired">' + esc(d.name) + " &mdash; batch " +
      esc(d.batch || "—") + " expired on " + esc(d.expiry) + ". Remove it from the shelf (Remove stock).</li>");
    else if (st === "soon") alerts.push('<li class="al-low">' + esc(d.name) + " &mdash; expires in " +
      daysTo(d.expiry) + " days (" + esc(d.expiry) + ").</li>");
    if (num(d.units) <= num(d.reorderLevel || 0))
      alerts.push('<li class="al-low">' + esc(d.name) + " &mdash; only " + money(d.units) +
      " " + esc(d.unit || "units") + " left (reorder at " + money(d.reorderLevel || 0) + ").</li>");
  });
  $("#alert-list").innerHTML = alerts.slice(0, 12).join("");
  $("#alert-card").hidden = alerts.length === 0;

  // datalists
  $("#r-drugs").innerHTML = DRUGS.map((d) => '<option value="' + esc(d.name) + '">').join("");
  $("#o-drugs").innerHTML = DRUGS.map((d) => '<option value="' + esc(d.name) + '">').join("");

  // table
  const has = DRUGS.length > 0;
  $("#t-card").hidden = !has;
  $("#t-empty").hidden = has;
  $("#t-body").innerHTML = DRUGS.map((d) => {
    const st = statusOf(d);
    const dd = String(d.expiry || "");
    return "<tr>" +
      '<td class="c-name">' + esc(d.name) + (d.unit ? ' <span class="d-none">(' + esc(d.unit) + ")</span>" : "") + "</td>" +
      "<td>" + esc(d.batch || "—") + "</td>" +
      '<td class="c-date">' + (dd ? esc(dd) : '<span class="d-none">no batch date</span>') + "</td>" +
      '<td class="c-amount">' + money(d.units) + "</td>" +
      '<td class="c-amount">' + money(d.reorderLevel || 0) + "</td>" +
      '<td class="c-amount">' + money(d.buyPrice || 0) + " / " + money(d.sellPrice || 0) + "</td>" +
      '<td><span class="' + ST[st][0] + '">' + ST[st][1] + "</span></td>" +
      '<td class="c-act"><button type="button" class="mini-btn" data-receive="' + esc(d.name) + '">Receive</button> ' +
      '<button type="button" class="mini-btn danger" data-out="' + esc(d.name) + '">Remove</button></td>' +
      "</tr>";
  }).join("");
  $("#t-count").textContent = has
    ? DRUGS.length + (DRUGS.length === 1 ? " drug" : " drugs") + " on this device's store. Dispensing from the Pharmacy page takes units from these numbers."
    : "";

  renderMoves();
}

function renderMoves() {
  const has = MOVES.length > 0;
  $("#m-wrap").hidden = !has;
  $("#m-empty").hidden = has;
  $("#m-body").innerHTML = MOVES.map((m) => {
    const t = String(m.at || m.createdAt || "");
    const when = t && t.slice(0, 16).replace("T", " ");
    return "<tr>" +
      '<td class="c-date">' + esc(when || "—") + "</td>" +
      '<td class="c-name">' + esc(m.stockName || "—") + "</td>" +
      "<td>" + esc(m.cause || "—") + "</td>" +
      '<td class="' + (m.direction === "IN" ? "dir-in" : "dir-out") + '">' + esc(m.direction || "") + "</td>" +
      '<td class="c-amount">' + money(m.units) + "</td>" +
      '<td class="c-amount">' + (m.amount ? money(m.amount) : "—") + "</td>" +
      "<td>" + esc(m.name || m.ref || "") + "</td>" +
      "</tr>";
  }).join("");
}

// ---- register a new drug ----------------------------------------------------
const form = $(".s-form");
$(".s-toggle").addEventListener("click", () => {
  form.hidden = !form.hidden;
  $(".s-toggle").textContent = form.hidden ? "\uFF0B Register a new drug" : "\u00D7 Close";
});
$(".s-cancel").addEventListener("click", () => { form.hidden = true;
  $(".s-toggle").textContent = "\uFF0B Register a new drug"; });

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  err("f-err", "");
  ok("f-ok", "");
  const name = $("#f-name").value.trim();
  if (!name) return err("f-err", "Enter the medicine name.");
  if (DRUGS.some((d) => String(d.name || "").toLowerCase() === name.toLowerCase()))
    return err("f-err", "That medicine is already registered — use Receive stock to add units.");
  const data = {
    name,
    category: "Drugs",
    unit: $("#f-unit").value.trim(),
    buyPrice: num($("#f-buy").value),
    sellPrice: num($("#f-sell").value),
    batch: $("#f-batch").value.trim(),
    expiry: $("#f-expiry").value,
    reorderLevel: num($("#f-reorder").value),
    units: num($("#f-open").value),
    savedAt: new Date().toISOString(),
    createdAt: serverTimestamp()
  };
  const btn = $(".s-save");
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    await addDoc(collection(db, "stockItems"), data);
    ok("f-ok", name + " saved to the drug store" + (data.units ? " with " + money(data.units) + " units on the shelf." : "."));
    form.reset();
    form.hidden = true;
    $(".s-toggle").textContent = "\uFF0B Register a new drug";
  } catch (e) {
    err("f-err", "Save failed: " + ((e && (e.code || e.message)) || e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Drug";
  }
});

// ---- receive (IN) / remove (OUT) -------------------------------------------
async function moveStock(name, units, dir, cause, method, person) {
  const item = DRUGS.find((d) => String(d.name || "").toLowerCase() === String(name || "").toLowerCase());
  if (!item) throw new Error("No drug called '" + name + "' in the store. Register it first.");
  if (!(units > 0)) throw new Error("Enter how many units to " + (dir === "IN" ? "receive." : "remove."));
  if (dir === "OUT" && num(item.units) < units)
    throw new Error("Only " + money(item.units) + " units of " + item.name + " are on the shelf — cannot remove " + money(units) + ".");
  const withMoney = dir === "IN" && cause === "Purchases" && method && method !== "No money moves";
  const txnType = withMoney ? "OUT" : "NEUTRAL";
  const amount = withMoney ? Math.round(num(item.buyPrice) * units * 100) / 100 : 0;
  const batch = writeBatch(db);
  batch.update(doc(db, "stockItems", item.__id), { units: increment(dir === "IN" ? units : -units) });
  batch.set(doc(collection(db, "stockChanges")), {
    stockId: item.__id, stockName: item.name, cause,
    direction: dir, units, amount, transactionType: txnType,
    flowMethod: withMoney ? method : "", name: person || "", by: who(),
    at: new Date().toISOString(),
    createdAt: serverTimestamp()
  });
  if (withMoney) {
    batch.set(doc(collection(db, "transactions")), {
      transactionName: cause, dateTime: serverTimestamp(),
      flowMethod: method,
      transactionType: txnType,
      name: person || "",
      amount
    });
  }
  await batch.commit();
  return { item, after: num(item.units) + (dir === "IN" ? units : -units), withMoney, amount };
}

$(".r-save").addEventListener("click", async () => {
  err("r-err", "");
  ok("r-ok", "");
  const name = $("#r-name").value.trim();
  const units = num($("#r-units").value);
  const cause = $("#r-cause").value;
  let method = $("#r-method").value;
  const person = $("#r-person").value.trim();
  const btn = $(".r-save");
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    if (!name) throw new Error("Pick or type the medicine name.");
    if (cause === "Purchases" && method === "Credit" && !person)
      throw new Error("Credit purchases need the supplier's name.");
    const r = await moveStock(name, units, "IN", cause, method, person);
    ok("r-ok", r.item.name + " moved from " + money(r.item.units) + " to " + money(r.after) + " units" +
      (r.withMoney ? " — a business transaction of TSh " + money(r.amount) + " (" + method + ") was written." : "."));
    $("#r-units").value = "";
    $("#r-person").value = "";
  } catch (e) {
    err("r-err", (e && (e.code || e.message)) || String(e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Receive Stock";
  }
});

$(".o-save").addEventListener("click", async () => {
  err("o-err", "");
  ok("o-ok", "");
  const name = $("#o-name").value.trim();
  const units = num($("#o-units").value);
  const cause = $("#o-cause").value;
  const btn = $(".o-save");
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    if (!name) throw new Error("Pick or type the medicine name.");
    const r = await moveStock(name, units, "OUT", cause, "", "");
    ok("o-ok", r.item.name + " moved from " + money(r.item.units) + " to " + money(r.after) + " units (" + cause + ").");
    $("#o-units").value = "";
  } catch (e) {
    err("o-err", (e && (e.code || e.message)) || String(e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Remove Stock";
  }
});

// quick buttons in the table prefill the cards
$("#t-body").addEventListener("click", (e) => {
  const rc = e.target.closest("[data-receive]");
  const oc = e.target.closest("[data-out]");
  if (rc) {
    $("#r-name").value = rc.getAttribute("data-receive");
    $("#r-units").focus();
    $(".move-card:nth-of-type(2)").scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (oc) {
    $("#o-name").value = oc.getAttribute("data-out");
    $("#o-units").focus();
    $(".move-card:nth-of-type(3)").scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

bootDone();

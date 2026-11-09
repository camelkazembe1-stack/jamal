




import { requireAuth, db, collection, doc, getDoc, updateDoc, writeBatch, serverTimestamp,
         query, orderBy, onSnapshot } from "/firebase.js";


await requireAuth(); 

 
const TRANSACTIONS = {
  IN: [
    { name: "Sales",                 icon: "\u{1F4B0}" },
    { name: "Commission Receivable", icon: "\u{1F9EE}" },
    { name: "Purchase Return",       icon: "\u{21AA}\u{FE0F}" },
    { name: "Petty Cash",            icon: "\u{1FA99}" },
    { name: "Capital",               icon: "\u{1F3E6}" },
    { name: "Debtors Recover",    icon: "\u{1F4B8}" }
  ],
  OUT: [
    { name: "Purchases",     icon: "\u{1F6D2}" },
    { name: "Rent",          icon: "\u{1F3E0}" },
    { name: "Sales Return",  icon: "\u{21A9}\u{FE0F}" },
    { name: "Petty Expense", icon: "\u{1F9F9}" },
    { name: "Transport",     icon: "\u{1F69B}" },
    { name: "Creditors Recover", icon: "\u{1F4B3}" }
  ],
  NEUTRAL: [
    { name: "Loan",  icon: "\u{1F91D}" },
    { name: "Other", icon: "\u{1F4E6}" }
  ],
  CONTRA: [
    { name: "Cash Deposit",    icon: "\u{1F3E6}" },
    { name: "Cash Withdrawal", icon: "\u{1F4B8}" }
  ]
};
 

const $ = (s) => document.querySelector(s);
const state = { type: null, txn: null, method: null, charges: null, person: null, owed: 0 };

const RECOVERS = { "Debtors Recover": 1, "Creditors Recover": 1 };
const isRecover = () => !!RECOVERS[state.txn];

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

const URL_PARAMS = new URLSearchParams(location.search);
let editId = URL_PARAMS.get("edit") ||
  (() => { try { return sessionStorage.getItem("jamaliEditTxn") || ""; } catch (e) { return ""; } })();
const BACK_URL = URL_PARAMS.get("back") ||
  (() => { try { return sessionStorage.getItem("jamaliEditBack") || ""; } catch (e) { return ""; } })();
let editing = Boolean(editId);
let loadingEdit = editing;
let savedBack = "";

 
function showStep(n) {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("is-active"));
  $("#step-" + n).classList.add("is-active");
  window.scrollTo({ top: 0 });
}

 
const TYPE_BADGE = { IN: "b-in", OUT: "b-out", NEUTRAL: "b-neutral", CONTRA: "b-contra" };

 $("#groups").innerHTML = Object.keys(TRANSACTIONS).map((t) =>
  `<section class="group">
     <h2 class="group-label"><span class="badge ${TYPE_BADGE[t]}">${t}</span></h2>
     <div class="grid">
       ${TRANSACTIONS[t].map((x) =>
         `<button class="tile" type="button" data-type="${t}" data-txn="${x.name}">
            <span class="tile-icon">${x.icon}</span>
            <span class="tile-label">${x.name}</span>
          </button>`).join("")}
     </div>
   </section>`).join("");

 
document.querySelectorAll("#groups .tile").forEach((btn) =>
  btn.addEventListener("click", () => {
    if (loadingEdit) return;
    if (editing && !confirm("You are editing a saved transaction. Forget it and record a new one instead?")) return;
    editing = false;
    editId = "";
    state.type = btn.dataset.type;
    state.txn = btn.dataset.txn;
    if (isRecover()) { state.person = null; state.owed = 0; showPick(); return; }
    openForm();
  }));

 
const METHOD_ICONS = { Cash: "\u{1F4B5}", Credit: "\u{1F464}", Bank: "\u{1F3DB}\uFE0F" };

function openForm() {
  state.method = null;
  state.charges = null;
  const rec = isRecover();
  $("#txn-title").textContent = rec && state.person ? state.txn + " \u00B7 " + state.person : state.txn;
  $("#txn-sub").textContent = rec && state.person
    ? "Step 3 of 3 \u00B7 " + (state.type === "IN" ? "owed to you: " : "you owe: ") + fmt(state.owed) +
      " \u2014 enter the paid amount, then Cash or Bank."
    : "Step 2 of 2 \u00B7 " + state.type +
      (state.type === "NEUTRAL" ? " \u00B7 no flow method" : "");
  $("#save-btn").textContent = "Save Transaction";
  $("#back-2").textContent = rec ? "\u2190 Names" : "\u2190 Transactions";
  $("#in-amount").value = "";
  $("#in-person").value = "";
  $("#in-bank").value = "";
  $("#in-charges").value = "";
  $("#form-err").hidden = true;
  $("#amount-label").textContent = rec ? "Paid Amount" : "Amount";

  const needsMethod = state.type === "IN" || state.type === "OUT";
  $("#f-method").hidden = !needsMethod;
  if (needsMethod) {
    $("#method-seg").innerHTML = (rec ? ["Cash", "Bank"] : ["Cash", "Credit", "Bank"]).map((m) =>
      `<button class="seg-btn" type="button" data-v="${m}">${METHOD_ICONS[m]} ${m}</button>`).join("");
    document.querySelectorAll("#method-seg .seg-btn").forEach((b) =>
      b.addEventListener("click", () => {
        state.method = b.dataset.v;
        state.charges = null;
        document.querySelectorAll("#method-seg .seg-btn").forEach((x) => x.classList.toggle("is-on", x === b));
        document.querySelectorAll("#charges-seg .seg-btn").forEach((x) => x.classList.remove("is-on"));
        refreshFields();
      }));
  }
  document.querySelectorAll("#charges-seg .seg-btn").forEach((x) => x.classList.remove("is-on"));
  refreshFields();
  showStep(2);
}

function chargesAllowed() {
  return (state.type === "OUT" && state.method === "Bank") ||
         (state.type === "CONTRA" && state.txn === "Cash Withdrawal");
}

function refreshFields() {
  $("#f-person").hidden =
    !(state.type === "IN" || state.type === "OUT") || state.method !== "Credit";
  $("#f-bank").hidden =
    !(((state.type === "IN" || state.type === "OUT") && state.method === "Bank") || state.type === "CONTRA");
  $("#f-charges").hidden = !chargesAllowed();
  $("#f-charges-amount").hidden = !(chargesAllowed() && state.charges === "WITH");
  updatePreview();
}

document.querySelectorAll("#charges-seg .seg-btn").forEach((b) =>
  b.addEventListener("click", () => {
    state.charges = b.dataset.v;
    document.querySelectorAll("#charges-seg .seg-btn").forEach((x) => x.classList.toggle("is-on", x === b));
    refreshFields();
  }));

["#in-amount", "#in-person", "#in-bank", "#in-charges"].forEach((s) =>
  $(s).addEventListener("input", updatePreview));

// ---- Debtors Recover / Creditors Recover -----------------------------------
// The names and owed figures come straight from the books: a debtor owes
// what the credit sales left after credit returns and everything already
// received from them; a creditor is the mirror image on purchases.
const escAttr = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let TXNS = [];

onSnapshot(query(collection(db, "transactions"), orderBy("dateTime", "asc")), (snap) => {
  TXNS = snap.docs.map((d) => Object.assign({ id: d.id }, d.data({ serverTimestamps: "estimate" })));
  if ($("#step-pick") && $("#step-pick").classList.contains("is-active")) renderPick();
}, () => { TXNS = []; });

function personBalances(kind) {
  const bal = Object.create(null);
  TXNS.forEach((t) => {
    const k = classify(t);
    if (!k || !t.name) return;
    const amt = Number(t.amount || 0);
    if (kind === "debtors") {
      if (k === "sales") bal[t.name] = (bal[t.name] || 0) + amt;
      else if (k === "salesReturns" || k === "cashReceipts") bal[t.name] = (bal[t.name] || 0) - amt;
    } else {
      if (k === "purchases") bal[t.name] = (bal[t.name] || 0) + amt;
      else if (k === "purchasesReturns" || k === "cashPayments") bal[t.name] = (bal[t.name] || 0) - amt;
    }
  });
  return bal;
}

function showPick() {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("is-active"));
  $("#step-pick").classList.add("is-active");
  window.scrollTo({ top: 0 });
  renderPick();
}

function renderPick() {
  const isDebtor = state.type === "IN";
  const bal = personBalances(isDebtor ? "debtors" : "creditors");
  const names = Object.keys(bal).filter((p) => bal[p] > 0)
    .sort((a, b) => bal[b] - bal[a] || a.localeCompare(b));
  $("#pick-title").textContent = isDebtor ? "Pick the debtor" : "Pick the creditor";
  $("#pick-sub").textContent = "Step 2 of 3 \u00B7 " +
    (isDebtor ? "money coming in \u2014 every debtor with the amount owed to you."
              : "money going out \u2014 every creditor with the amount you owe.");
  $("#rec-grid").innerHTML = names.map((p) =>
    '<button class="tile" type="button" data-p="' + escAttr(p) + '">' +
      '<span class="tile-icon">' + (isDebtor ? "\u{1F4B8}" : "\u{1F4B3}") + "</span>" +
      '<span class="tile-label">' + escAttr(p) + "</span>" +
      '<span class="tile-units">' + (isDebtor ? "owes you " : "you owe ") + fmt(bal[p]) + "</span>" +
    "</button>").join("");
  $("#rec-grid").querySelectorAll(".tile").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.person = btn.dataset.p;
      state.owed = bal[btn.dataset.p] || 0;
      openForm();
    }));
  $("#rec-empty-icon").textContent = isDebtor ? "\u{1F4B8}" : "\u{1F4B3}";
  $("#rec-empty").hidden = names.length > 0;
  if (!names.length)
    $("#rec-empty-title").textContent = isDebtor
      ? "No debtor owes the business right now"
      : "The business owes no creditor right now";
}

$("#back-pick").addEventListener("click", () => showStep(1));

function findEntry(name) {
  for (const g of Object.keys(TRANSACTIONS))
    for (const x of TRANSACTIONS[g])
      if (x.name === name) return { type: g, txn: x.name };
  return null;
}

function prefillEdit(d) {
  const name = String(d.transactionName || "");
  const hit = findEntry(name);
  if (hit) {
    state.type = hit.type;
    state.txn = hit.txn;
    if (isRecover()) state.person = String(d.name || "");
  } else if (/charge/i.test(name)) {
    state.type = String(d.transactionType || "").toUpperCase() === "OUT" ? "OUT" : "CONTRA";
    state.txn = name;
  } else {
    state.type = ["IN", "OUT", "NEUTRAL", "CONTRA"].indexOf(String(d.transactionType || "").toUpperCase()) !== -1
      ? String(d.transactionType).toUpperCase() : "NEUTRAL";
    state.txn = name || "Other";
  }
  openForm();
  $("#in-amount").value = Number(d.amount || 0) || "";
  const flow = String(d.flowMethod || "").trim();
  if ((state.type === "IN" || state.type === "OUT") &&
      (flow === "Cash" || flow === "Credit" || flow === "Bank")) {
    state.method = flow;
    document.querySelectorAll("#method-seg .seg-btn").forEach((b) =>
      b.classList.toggle("is-on", b.dataset.v === flow));
    if (flow === "Credit" && d.name) $("#in-person").value = d.name;
    if (flow === "Bank" && d.name) $("#in-bank").value = d.name;
  } else if (state.type === "CONTRA" && d.name) {
    $("#in-bank").value = d.name;
  }
  $("#f-charges").hidden = true;
  $("#f-charges-amount").hidden = true;
  $("#txn-title").textContent = "Edit: " + state.txn +
    (isRecover() && state.person ? " \u00B7 " + state.person : "");
  $("#txn-sub").textContent = "Step 2 of 2 \u00B7 " + state.type +
    " \u2014 change the amount or method, then update. The date stays as it was.";
  $("#save-btn").textContent = "Update Transaction";
  $("#back-2").textContent = "\u2190 Cancel edit";
  updatePreview();
  showStep(2);
}

if (editId) {
  document.querySelector("#step-1 .sub").textContent = "Loading the saved transaction\u2026";
  try {
    const snap = await getDoc(doc(db, "transactions", editId));
    if (!snap.exists()) {
      document.querySelector("#step-1 .sub").textContent =
        "That transaction no longer exists - it may have been deleted. Pick a transaction to record a new one.";
      editing = false;
      editId = "";
      try { sessionStorage.removeItem("jamaliEditTxn"); } catch (e) { }
    } else {
      prefillEdit(snap.data());
      try { sessionStorage.removeItem("jamaliEditTxn"); } catch (e) { }
      try { sessionStorage.removeItem("jamaliEditBack"); } catch (e) { }
    }
  } catch (e) {
    document.querySelector("#step-1 .sub").textContent =
      "Could not load the transaction: " + ((e && e.message) || e);
    editing = false;
    editId = "";
    try { sessionStorage.removeItem("jamaliEditTxn"); } catch (e) { }
  }
}
loadingEdit = false;

function updatePreview() {
  if (!state.type || !state.txn) return;
  let p = state.txn + " \u00B7 " + state.type;
  if (state.type === "NEUTRAL") {
    p += " \u00B7 " + fmt($("#in-amount").value);
  } else if (state.type === "CONTRA") {
    p += " \u00B7 Bank";
    if ($("#in-bank").value.trim()) p += " \u00B7 " + $("#in-bank").value.trim();
    p += " \u00B7 " + fmt($("#in-amount").value);
    if (chargesAllowed() && state.charges === "WITH" && Number($("#in-charges").value) > 0)
      p += "   +   Bank Charges \u00B7 " + fmt($("#in-charges").value);
  } else if (isRecover() && state.person) {
    p += " \u00B7 " + state.person;
    if (state.method) p += " \u00B7 " + state.method;
    if (state.method === "Bank" && $("#in-bank").value.trim()) p += " \u00B7 " + $("#in-bank").value.trim();
    p += " \u00B7 " + fmt($("#in-amount").value);
    const owedV = Math.max(0, Number(state.owed) || 0);
    const paidV = Number($("#in-amount").value) || 0;
    p += "   (owed " + (state.type === "IN" ? "to you" : "by you") + ": " + fmt(owedV) + ")";
    if (paidV > owedV)
      p += "   \u2014 " + fmt(paidV - owedV) + " above it needs confirming as " +
           (state.type === "IN" ? "Interest Received" : "Interest Allowed");
    if (state.type === "OUT" && state.method === "Bank" && state.charges === "WITH" && Number($("#in-charges").value) > 0)
      p += "   +   Bank Charges \u00B7 " + fmt($("#in-charges").value);
  } else {
    if (state.method) p += " \u00B7 " + state.method;
    const nm = state.method === "Credit" ? $("#in-person").value.trim()
             : state.method === "Bank" ? $("#in-bank").value.trim() : "";
    if (nm) p += " \u00B7 " + nm;
    p += " \u00B7 " + fmt($("#in-amount").value);
    if (state.type === "OUT" && state.method === "Bank" && state.charges === "WITH" && Number($("#in-charges").value) > 0)
      p += "   +   Bank Charges \u00B7 " + fmt($("#in-charges").value);
  }
  $("#preview").textContent = (editing ? "Will update: " : "Will save: ") + p;
}

 
 $("#save-btn").addEventListener("click", async () => {
  const err = (m) => { const e = $("#form-err"); e.textContent = m; e.hidden = false; };
  $("#form-err").hidden = true;

  const amount = Number($("#in-amount").value);
  if (!amount || amount <= 0) return err("Enter a valid amount first.");

  const docs = [];

  if (state.type === "NEUTRAL") {
    docs.push({ transactionName: state.txn, dateTime: serverTimestamp(), flowMethod: "N/A",
                transactionType: state.type, name: null, amount });

  } else if (state.type === "CONTRA") {
    const bank = $("#in-bank").value.trim();
    if (!bank) return err("Enter the bank name.");
    docs.push({ transactionName: state.txn, dateTime: serverTimestamp(), flowMethod: "Bank",
                transactionType: state.type, name: bank, amount });
    if (state.txn === "Cash Withdrawal" && !editing && state.charges === "WITH") {
      const c = Number($("#in-charges").value);
      if (!c || c <= 0) return err("Enter the charges amount.");
      docs.push({ transactionName: "Bank Charges", dateTime: serverTimestamp(), flowMethod: "Bank",
                  transactionType: state.type, name: bank, amount: c });
    }

  } else { 
    if (!state.method) return err(isRecover()
      ? "Choose Cash or Bank - Credit is not available here."
      : "Choose Cash, Credit or Bank.");
    let name = null;
    if (isRecover()) {
      name = state.person || null;
      if (!name) return err("Pick the name first.");
    } else if (state.method === "Credit") {
      name = $("#in-person").value.trim();
      if (!name) return err("Enter the person's name.");
    } else if (state.method === "Bank") {
      name = $("#in-bank").value.trim();
      if (!name) return err("Enter the bank name.");
    }

    if (isRecover() && !editing) {
      // The overpay rule: the owed figure is recovered first. Anything
      // above it becomes interest only after a YES - declining saves
      // nothing at all, and the paid amount is never recorded as-is.
      const owed = Math.max(0, Number(state.owed) || 0);
      const over = Math.round((amount - owed) * 100) / 100;
      const isDebtor = state.type === "IN";
      const intName = isDebtor ? "Interest Received" : "Interest Allowed";
      if (over > 0) {
        const oweTxt = owed > 0
          ? (isDebtor ? state.person + " owes you " + fmt(owed)
                      : "you owe " + state.person + " " + fmt(owed))
          : (isDebtor ? state.person + " does not owe you anything right now"
                      : "you do not owe " + state.person + " anything right now");
        const ask = owed > 0
          ? "Save " + fmt(owed) + " as " + state.txn + " and record the extra " + fmt(over) + " as " + intName + "?"
          : "Record the whole " + fmt(amount) + " as " + intName + "?";
        if (!confirm(oweTxt + ". " + ask))
          return err("Nothing was saved - enter an amount up to the " + fmt(owed) +
                     " owed, or confirm to record the extra as " + intName + ".");
        if (owed > 0)
          docs.push({ transactionName: state.txn, dateTime: serverTimestamp(), flowMethod: state.method,
                      transactionType: state.type, name, amount: owed });
        docs.push({ transactionName: intName, dateTime: serverTimestamp(), flowMethod: state.method,
                    transactionType: state.type,
                    name: state.method === "Bank" ? ($("#in-bank").value.trim() || null) : null,
                    amount: over });
      } else {
        docs.push({ transactionName: state.txn, dateTime: serverTimestamp(), flowMethod: state.method,
                    transactionType: state.type, name, amount });
      }
      if (state.type === "OUT" && state.method === "Bank" && state.charges === "WITH") {
        const c = Number($("#in-charges").value);
        if (!c || c <= 0) return err("Enter the charges amount.");
        docs.push({ transactionName: "Bank Charges", dateTime: serverTimestamp(), flowMethod: "Bank",
                    transactionType: state.type, name: $("#in-bank").value.trim() || null, amount: c });
      }
    } else {
      docs.push({ transactionName: state.txn, dateTime: serverTimestamp(), flowMethod: state.method,
                  transactionType: state.type, name, amount });
      if (state.type === "OUT" && !editing && state.method === "Bank" && state.charges === "WITH") {
        const c = Number($("#in-charges").value);
        if (!c || c <= 0) return err("Enter the charges amount.");
        docs.push({ transactionName: "Bank Charges", dateTime: serverTimestamp(), flowMethod: "Bank",
                    transactionType: state.type, name: $("#in-bank").value.trim() || null, amount: c });
      }
    }
  }

  const btn = $("#save-btn");
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    if (editing) {
      const main = docs[0];
      delete main.dateTime;
      await updateDoc(doc(db, "transactions", editId), main);
      editing = false;
      editId = "";
      savedBack = BACK_URL;
      document.querySelector("#step-3 h1").textContent = "Transaction Updated";
      $("#done-note").textContent = "The original record was replaced \u2014 every book now shows the new figures.";
      $("#again-btn").textContent = savedBack ? "Back to the book" : "Add Another";
    } else {
      const batch = writeBatch(db); 
      docs.forEach((d) => batch.set(doc(collection(db, "transactions")), d));
      await batch.commit();
      document.querySelector("#step-3 h1").textContent = "Transaction Saved";
      const parts = docs.map((d) => d.transactionName + " " + fmt(d.amount));
      $("#done-note").textContent = docs.length === 1
        ? "1 record saved to Firestore \u2014 " + parts[0] + "."
        : docs.length + " records saved \u2014 " + parts.join("  +  ") + ".";
      $("#again-btn").textContent = "Add Another";
    }
    showStep(3);
  } catch (e) {
    err("Save failed: " + (e && e.code === "permission-denied"
      ? "check your Firestore rules and sign in again."
      : (e && e.message) || e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Transaction";
  }
});

 
 $("#back-2").addEventListener("click", () => {
  if (editing && savedBack) { location.href = savedBack; return; }
  if (editing) { editing = false; editId = ""; }
  if (isRecover()) { showPick(); return; }
  showStep(1);
});
 $("#again-btn").addEventListener("click", () => {
  if (savedBack) { location.href = savedBack; return; }
  state.type = state.txn = null;
  state.person = null;
  state.owed = 0;
  showStep(1);
});






import { requireAuth, db, collection, doc, getDoc, updateDoc, writeBatch, serverTimestamp } from "/firebase.js";

await requireAuth(); 

 
const TRANSACTIONS = {
  IN: [
    { name: "Sales",                 icon: "\u{1F4B0}" },
    { name: "Commission Receivable", icon: "\u{1F9EE}" },
    { name: "Purchase Return",       icon: "\u{21AA}\u{FE0F}" },
    { name: "Petty Cash",            icon: "\u{1FA99}" },
    { name: "Capital",               icon: "\u{1F3E6}" }
  ],
  OUT: [
    { name: "Purchases",     icon: "\u{1F6D2}" },
    { name: "Rent",          icon: "\u{1F3E0}" },
    { name: "Sales Return",  icon: "\u{21A9}\u{FE0F}" },
    { name: "Petty Expense", icon: "\u{1F9F9}" },
    { name: "Transport",     icon: "\u{1F69B}" }
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
const state = { type: null, txn: null, method: null, charges: null };

const URL_PARAMS = new URLSearchParams(location.search);
const EDIT_ID = URL_PARAMS.get("edit") || "";
const BACK_URL = URL_PARAMS.get("back") || "";
let editing = Boolean(EDIT_ID);
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
    state.type = btn.dataset.type;
    state.txn = btn.dataset.txn;
    openForm();
  }));

 
const METHOD_ICONS = { Cash: "\u{1F4B5}", Credit: "\u{1F464}", Bank: "\u{1F3DB}\uFE0F" };

function openForm() {
  state.method = null;
  state.charges = null;
  $("#txn-title").textContent = state.txn;
  $("#txn-sub").textContent = "Step 2 of 2 \u00B7 " + state.type +
    (state.type === "NEUTRAL" ? " \u00B7 no flow method" : "");
  $("#in-amount").value = "";
  $("#in-person").value = "";
  $("#in-bank").value = "";
  $("#in-charges").value = "";
  $("#form-err").hidden = true;

  const needsMethod = state.type === "IN" || state.type === "OUT";
  $("#f-method").hidden = !needsMethod;
  if (needsMethod) {
    $("#method-seg").innerHTML = ["Cash", "Credit", "Bank"].map((m) =>
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
  $("#txn-title").textContent = "Edit: " + state.txn;
  $("#txn-sub").textContent = "Change what you need, then save. The date stays as it was.";
  updatePreview();
  showStep(2);
}

if (EDIT_ID) {
  document.querySelector("#step-1 .sub").textContent = "Loading the saved transaction\u2026";
  try {
    const snap = await getDoc(doc(db, "transactions", EDIT_ID));
    if (!snap.exists()) {
      document.querySelector("#step-1 .sub").textContent =
        "That transaction no longer exists - it may have been deleted. Pick a transaction to record a new one.";
      editing = false;
    } else {
      prefillEdit(snap.data());
    }
  } catch (e) {
    document.querySelector("#step-1 .sub").textContent =
      "Could not load the transaction: " + ((e && e.message) || e);
    editing = false;
  }
}

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

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
    if (!state.method) return err("Choose Cash, Credit or Bank.");
    let name = null;
    if (state.method === "Credit") {
      name = $("#in-person").value.trim();
      if (!name) return err("Enter the person's name.");
    } else if (state.method === "Bank") {
      name = $("#in-bank").value.trim();
      if (!name) return err("Enter the bank name.");
    }
    docs.push({ transactionName: state.txn, dateTime: serverTimestamp(), flowMethod: state.method,
                transactionType: state.type, name, amount });
    if (state.type === "OUT" && !editing && state.method === "Bank" && state.charges === "WITH") {
      const c = Number($("#in-charges").value);
      if (!c || c <= 0) return err("Enter the charges amount.");
      docs.push({ transactionName: "Bank Charges", dateTime: serverTimestamp(), flowMethod: "Bank",
                  transactionType: state.type, name, amount: c });
    }
  }

  const btn = $("#save-btn");
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    if (editing) {
      const main = docs[0];
      delete main.dateTime;
      await updateDoc(doc(db, "transactions", EDIT_ID), main);
      editing = false;
      savedBack = BACK_URL;
      document.querySelector("#step-3 h1").textContent = "Transaction Updated";
      $("#done-note").textContent = "1 record updated \u2014 every book now shows the new figures.";
      $("#again-btn").textContent = savedBack ? "Back to the book" : "Add Another";
    } else {
      const batch = writeBatch(db); 
      docs.forEach((d) => batch.set(doc(collection(db, "transactions")), d));
      await batch.commit();
      document.querySelector("#step-3 h1").textContent = "Transaction Saved";
      $("#done-note").textContent = docs.length === 1
        ? "1 record saved to Firestore."
        : "2 records saved \u2014 the transaction and its bank charges are separate records.";
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

 
 $("#back-2").addEventListener("click", () => showStep(1));
 $("#again-btn").addEventListener("click", () => {
  if (savedBack) { location.href = savedBack; return; }
  state.type = state.txn = null;
  showStep(1);
});

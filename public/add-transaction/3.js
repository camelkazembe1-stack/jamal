// add-transaction (page 3) — JAMALI transaction engine
// Steps: 1 choose (groups shown as LABELS, transactions sit on their group)
//        -> 2 form -> 3 saved. No page reloads.
// Every record gets the 6 fields: transactionName, dateTime, flowMethod,
// transactionType, name, amount. Bank charges save as a SEPARATE record.
import { requireAuth, db, collection, doc, writeBatch, serverTimestamp } from "/firebase.js";

await requireAuth(); // not logged in? -> bounced to "/"

/* ============ EDIT ME — transaction lists per type ============ */
const TRANSACTIONS = {
  IN: [
    { name: "Sales",                 icon: "\u{1F4B0}" },
    { name: "Commission Receivable", icon: "\u{1F9EE}" },
    { name: "Purchase Return",       icon: "\u{21AA}\u{FE0F}" },
    { name: "Petty Cash",            icon: "\u{1FA99}" }
  ],
  OUT: [
    { name: "Purchases",     icon: "\u{1F6D2}" },
    { name: "Rent",          icon: "\u{1F3E0}" },
    { name: "Sales Return",  icon: "\u{21A9}\u{FE0F}" },
    { name: "Petty Expense", icon: "\u{1F9F9}" }
  ],
  NEUTRAL: [
    { name: "Capital", icon: "\u{1F3E6}" },
    { name: "Loan",    icon: "\u{1F91D}" },
    { name: "Other",   icon: "\u{1F4E6}" }
  ],
  CONTRA: [
    { name: "Cash Deposit",    icon: "\u{1F3E6}" },
    { name: "Cash Withdrawal", icon: "\u{1F4B8}" }
  ]
};
/* ============================================================== */

const $ = (s) => document.querySelector(s);
const state = { type: null, txn: null, method: null, charges: null };

/* ---------- step navigation ---------- */
function showStep(n) {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("is-active"));
  $("#step-" + n).classList.add("is-active");
  window.scrollTo({ top: 0 });
}

/* ---------- step 1: all groups at once — labels, not buttons ---------- */
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

/* click a transaction -> hide ALL tiles -> form shows immediately */
document.querySelectorAll("#groups .tile").forEach((btn) =>
  btn.addEventListener("click", () => {
    state.type = btn.dataset.type;
    state.txn = btn.dataset.txn;
    openForm();
  }));

/* ---------- step 2: dynamic form ---------- */
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
  $("#preview").textContent = "Will save: " + p;
}

/* ---------- save ---------- */
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
    if (state.txn === "Cash Withdrawal" && state.charges === "WITH") {
      const c = Number($("#in-charges").value);
      if (!c || c <= 0) return err("Enter the charges amount.");
      docs.push({ transactionName: "Bank Charges", dateTime: serverTimestamp(), flowMethod: "Bank",
                  transactionType: state.type, name: bank, amount: c });
    }

  } else { // IN / OUT
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
    if (state.type === "OUT" && state.method === "Bank" && state.charges === "WITH") {
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
    const batch = writeBatch(db); // one atomic write -> records share the same timestamp
    docs.forEach((d) => batch.set(doc(collection(db, "transactions")), d));
    await batch.commit();
    $("#done-note").textContent = docs.length === 1
      ? "1 record saved to Firestore."
      : "2 records saved \u2014 the transaction and its bank charges are separate records.";
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

/* ---------- back / reset ---------- */
 $("#back-2").addEventListener("click", () => showStep(1));
 $("#again-btn").addEventListener("click", () => {
  state.type = state.txn = null;
  showStep(1);
});

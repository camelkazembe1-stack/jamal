import {
  initializeApp, getApps, getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore, collection, addDoc, getDocs, query, orderBy,
  serverTimestamp, writeBatch, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const formPanel = $("form-panel");
const optionsPanel = $("transaction-options-panel");
const fieldsBox = $("form-fields");
const statusBox = $("status-message");

const optionsByFlow = {
  IN: ["Sales", "Discount Received"],
  OUT: ["Purchases", "Rent"],
  NEUTRAL: ["Retained Profit"],
  CONTRA: ["Withdraw Cash", "Deposit Cash"]
};

let db;
let selectedFlow = "";
let selectedTransaction = "";
let selectedMethod = "";
let saving = false;

function showStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", isError);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

async function initializeFirestore() {
  // Run the project's existing Firebase initialization without changing its config.
  try {
    await import("/firebase.js");
  } catch (error) {
    console.warn("Existing Firebase module import:", error);
  }

  let app = getApps().length ? getApp() : null;

  if (!app) {
    throw new Error(
      "No initialized Firebase app was found. Check that /firebase.js initializes Firebase using your existing project configuration."
    );
  }

  db = getFirestore(app);
}

function field(label, id, type = "text", options = {}) {
  const full = options.full ? " full-width" : "";
  const required = options.required === false ? "" : " required";
  const min = type === "number" ? ' min="0.01" step="0.01" inputmode="decimal"' : "";
  const placeholder = options.placeholder ? ` placeholder="${escapeHtml(options.placeholder)}"` : "";
  return `<div class="field${full}">
    <label for="${id}">${escapeHtml(label)}</label>
    <input id="${id}" name="${id}" type="${type}"${required}${min}${placeholder} autocomplete="off">
  </div>`;
}

function selectField(label, id, choices, full = false) {
  return `<div class="field${full ? " full-width" : ""}">
    <label for="${id}">${escapeHtml(label)}</label>
    <select id="${id}" name="${id}" required>
      <option value="">Select ${escapeHtml(label.toLowerCase())}</option>
      ${choices.map(v => `<option value="${escapeHtml(v.value)}">${escapeHtml(v.label)}</option>`).join("")}
    </select>
  </div>`;
}

function chargesField() {
  return `<div class="field full-width">
    <span class="field-label">Bank charges</span>
    <div class="radio-row">
      <label class="radio-choice"><input type="radio" name="chargeMode" value="without" checked> Without Charges</label>
      <label class="radio-choice"><input type="radio" name="chargeMode" value="with"> With Charges</label>
    </div>
  </div>
  <div class="field full-width" id="charges-amount-field" hidden>
    <label for="chargesAmount">Bank charges amount (TZS)</label>
    <input id="chargesAmount" name="chargesAmount" type="number" min="0" step="0.01" inputmode="decimal" value="0">
  </div>`;
}

function methodChoices(flow, transaction) {
  if (flow === "IN" || flow === "OUT") {
    return [
      { value: "cash", label: "Cash" },
      { value: "credit", label: "Credit" },
      { value: "bank", label: "Bank" }
    ];
  }
  return [];
}

function openTransactionForm(flow, transaction) {
  selectedFlow = flow;
  selectedTransaction = transaction;
  selectedMethod = "";
  $("form-heading").textContent = `${flow} → ${transaction}`;
  formPanel.hidden = false;
  fieldsBox.innerHTML = "";

  if (flow === "IN" || flow === "OUT") {
    fieldsBox.innerHTML =
      selectField("Method", "method", methodChoices(flow, transaction)) +
      field("Amount (TZS)", "amount", "number", { placeholder: "Enter amount" });

    $("method").addEventListener("change", updateMethodFields);
  } else if (flow === "NEUTRAL") {
    fieldsBox.innerHTML = field("Amount (TZS)", "amount", "number", { placeholder: "Enter amount" });
  } else if (flow === "CONTRA" && transaction === "Deposit Cash") {
    fieldsBox.innerHTML =
      field("Amount (TZS)", "amount", "number", { placeholder: "Amount to deposit" }) +
      field("Bank name", "name", "text", { placeholder: "Enter bank name" });
  } else if (flow === "CONTRA" && transaction === "Withdraw Cash") {
    fieldsBox.innerHTML =
      field("Amount to withdraw (TZS)", "amount", "number", { placeholder: "Cash received" }) +
      field("Bank name", "name", "text", { placeholder: "Enter bank name" }) +
      chargesField();
    attachChargeToggle();
  }

  formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateMethodFields() {
  const method = $("method").value;
  const amountInput = $("amount");
  const amountHtml = fieldsBox.querySelector('[name="amount"]').closest(".field").outerHTML;
  const oldName = $("name")?.value || "";
  const oldCharges = $("chargesAmount")?.value || "0";
  const oldMode = document.querySelector('input[name="chargeMode"]:checked')?.value || "without";

  let html = selectField("Method", "method", methodChoices(selectedFlow, selectedTransaction));

  if (method === "credit") {
    html += field(selectedFlow === "IN" ? "Customer name" : "Supplier name", "name", "text", { placeholder: "Enter name" });
  } else if (method === "bank") {
    html += field("Bank name", "name", "text", { placeholder: "Enter bank name" });
  }

  html += amountHtml;

  if (selectedFlow === "OUT" && method === "bank") {
    html += chargesField();
  }

  fieldsBox.innerHTML = html;
  $("method").value = method;

  if ($("name")) $("name").value = oldName;
  $("amount").value = amountInput?.value || "";
  if ($("chargesAmount")) $("chargesAmount").value = oldCharges;

  if (selectedFlow === "OUT" && method === "bank") {
    const radio = document.querySelector(`input[name="chargeMode"][value="${oldMode}"]`);
    if (radio) radio.checked = true;
    attachChargeToggle();
  }
}

function attachChargeToggle() {
  document.querySelectorAll('input[name="chargeMode"]').forEach(radio => {
    radio.addEventListener("change", () => {
      const isWith = document.querySelector('input[name="chargeMode"]:checked')?.value === "with";
      $("charges-amount-field").hidden = !isWith;
      const input = $("chargesAmount");
      if (input) {
        input.required = isWith;
        if (!isWith) input.value = "0";
      }
    });
  });
  const isWith = document.querySelector('input[name="chargeMode"]:checked')?.value === "with";
  $("charges-amount-field").hidden = !isWith;
}

function getAmount() {
  const amount = Number($("amount")?.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }
  return amount;
}

function normalizeMethod() {
  if (selectedFlow === "NEUTRAL") return "";
  if (selectedFlow === "CONTRA") return "bank";
  const method = $("method")?.value || "";
  if (!["cash", "credit", "bank"].includes(method)) {
    throw new Error("Select Cash, Credit, or Bank.");
  }
  return method;
}

function getTransactionName(method) {
  if (selectedFlow === "OUT" && method === "bank") return selectedTransaction;
  return selectedTransaction;
}

function getName(method) {
  if (method === "cash" || selectedFlow === "NEUTRAL") return "";
  const value = $("name")?.value.trim() || "";
  if ((method === "credit" || method === "bank") && !value) {
    throw new Error(method === "credit" ? "Enter the customer or supplier name." : "Enter the bank name.");
  }
  return value;
}

function transactionRecord({ transactionName, flow, method, name, amount, charges = 0, parentTransactionId = "" }) {
  return {
    date: serverTimestamp(),
    transactionName,
    flow,
    method,
    name,
    amount,
    charges,
    ...(parentTransactionId ? { parentTransactionId } : {})
  };
}

async function saveTransaction(event) {
  event.preventDefault();
  if (saving) return;

  const saveButton = $("save-transaction");
  try {
    if (!db) throw new Error("Firestore is not ready. Refresh the page and try again.");

    saving = true;
    saveButton.disabled = true;
    saveButton.textContent = "Saving…";

    const amount = getAmount();
    const method = normalizeMethod();
    const name = getName(method);
    let charges = 0;

    const isBankOut = selectedFlow === "OUT" && method === "bank";
    const isWithdrawal = selectedFlow === "CONTRA" && selectedTransaction === "Withdraw Cash";
    const chargeMode = (isBankOut || isWithdrawal)
      ? document.querySelector('input[name="chargeMode"]:checked')?.value || "without"
      : "without";

    if ((isBankOut || isWithdrawal) && chargeMode === "with") {
      charges = Number($("chargesAmount")?.value);
      if (!Number.isFinite(charges) || charges < 0) {
        throw new Error("Enter valid bank charges (zero or more).");
      }
    }

    const batch = writeBatch(db);
    const transactions = collection(db, "transactions");
    const mainRef = doc(transactions);

    batch.set(mainRef, transactionRecord({
      transactionName: getTransactionName(method),
      flow: selectedFlow,
      method,
      name,
      amount,
      charges
    }));

    // Charges are a distinct OUT transaction and are saved atomically with the main transaction.
    if (charges > 0) {
      const chargesRef = doc(transactions);
      batch.set(chargesRef, transactionRecord({
        transactionName: "Bank Charges",
        flow: "OUT",
        method: "bank",
        name,
        amount: charges,
        charges: 0,
        parentTransactionId: mainRef.id
      }));
    }

    await batch.commit();

    const message = charges > 0
      ? `${selectedTransaction} saved. Bank charges were also saved as a separate OUT transaction.`
      : `${selectedTransaction} saved successfully.`;
    showStatus(message);
    $("transaction-form").reset();
    formPanel.hidden = true;
    await displayTransactions();
  } catch (error) {
    console.error("Transaction save failed:", error);
    showStatus(error.message || "Could not save the transaction. Check your connection and Firestore rules.", true);
  } finally {
    saving = false;
    saveButton.disabled = false;
    saveButton.textContent = "Save";
  }
}

function formatDate(value) {
  if (!value) return "Pending";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function money(value) {
  return new Intl.NumberFormat("en-TZ", {
    style: "currency", currency: "TZS", maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function renderGroup(flow, rows) {
  const sorted = rows.slice().sort((a, b) => {
    const ad = a.date?.toMillis?.() || 0;
    const bd = b.date?.toMillis?.() || 0;
    return bd - ad;
  });

  if (!sorted.length) {
    return `<section class="transaction-group"><h3>${escapeHtml(flow)}</h3><div class="empty-state">No ${escapeHtml(flow)} transactions yet.</div></section>`;
  }

  return `<section class="transaction-group">
    <h3>${escapeHtml(flow)} (${sorted.length})</h3>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Date</th><th>Transaction</th><th>Flow</th><th>Method</th><th>Name</th><th>Amount</th><th>Charges</th>
      </tr></thead>
      <tbody>${sorted.map(row => `<tr>
        <td>${escapeHtml(formatDate(row.date))}</td>
        <td>${escapeHtml(row.transactionName || "—")}</td>
        <td>${escapeHtml(row.flow || "—")}</td>
        <td>${escapeHtml(row.method || "—")}</td>
        <td>${escapeHtml(row.name || "—")}</td>
        <td>${escapeHtml(money(row.amount))}</td>
        <td>${escapeHtml(money(row.charges))}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  </section>`;
}

async function displayTransactions() {
  if (!db) {
    showStatus("Firestore is not ready yet.", true);
    return;
  }

  const panel = $("transactions-panel");
  const target = $("transaction-groups");
  panel.hidden = false;
  target.innerHTML = '<div class="empty-state">Loading transactions…</div>';

  try {
    const snapshot = await getDocs(query(collection(db, "transactions"), orderBy("date", "desc")));
    const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    target.innerHTML = ["IN", "OUT", "NEUTRAL", "CONTRA"]
      .map(flow => renderGroup(flow, rows.filter(row => row.flow === flow))).join("");
    showStatus(`Loaded ${rows.length} saved transaction(s).`);
  } catch (error) {
    console.error("Transaction read failed:", error);
    target.innerHTML = '<div class="empty-state">Transactions could not be loaded. Check Firestore permissions and your internet connection.</div>';
    showStatus(error.message || "Could not load transactions.", true);
  }
}

document.querySelectorAll("[data-flow]").forEach(button => {
  button.addEventListener("click", () => {
    selectedFlow = button.dataset.flow;
    $("transaction-options-heading").textContent = `Choose ${selectedFlow} transaction`;
    $("transaction-options").innerHTML = optionsByFlow[selectedFlow]
      .map(name => `<button type="button" class="option-button" data-transaction="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
      .join("");
    optionsPanel.hidden = false;
    formPanel.hidden = true;
    $("transaction-options").querySelectorAll("[data-transaction]").forEach(option => {
      option.addEventListener("click", () => openTransactionForm(selectedFlow, option.dataset.transaction));
    });
    optionsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

$("transaction-form").addEventListener("submit", saveTransaction);
$("cancel-form").addEventListener("click", () => { formPanel.hidden = true; });
$("display-transactions").addEventListener("click", displayTransactions);
$("refresh-transactions").addEventListener("click", displayTransactions);

initializeFirestore().then(() => {
  showStatus("Connected to Firebase. Transactions will be saved in Cloud Firestore.");
}).catch(error => {
  console.error("Firebase initialization failed:", error);
  showStatus(error.message || "Firebase initialization failed.", true);
});

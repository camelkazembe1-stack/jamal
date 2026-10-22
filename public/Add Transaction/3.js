import { getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, orderBy,
  serverTimestamp, writeBatch, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = id => document.getElementById(id);
const formPanel = $("form-panel");
const fieldsBox = $("form-fields");
const statusBox = $("status-message");

let db = null;
let selectedFlow = "";
let selectedTransaction = "";
let saving = false;

function status(message, error = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", error);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}

async function initializeFirestore() {
  // Keep and use the project's existing Firebase configuration.
  try {
    await import("/firebase.js");
  } catch (error) {
    console.warn("Could not import /firebase.js:", error);
  }
  if (!getApps().length) {
    throw new Error("Firebase is not initialized. Check the existing public/firebase.js configuration.");
  }
  db = getFirestore(getApp());
}

function inputField(label, id, type = "text", options = {}) {
  const required = options.required ? " required" : "";
  const min = type === "number" ? ' min="0.01" step="0.01" inputmode="decimal"' : "";
  const full = options.full ? " full-width" : "";
  const placeholder = options.placeholder ? ` placeholder="${esc(options.placeholder)}"` : "";
  return `<div class="field${full}">
    <label for="${id}">${esc(label)}</label>
    <input id="${id}" name="${id}" type="${type}"${required}${min}${placeholder} autocomplete="off">
  </div>`;
}

function methodField() {
  return `<div class="field">
    <label for="method">Method</label>
    <select id="method" name="method" required>
      <option value="">Select method</option>
      <option value="cash">Cash</option>
      <option value="credit">Credit</option>
      <option value="bank">Bank</option>
    </select>
  </div>`;
}

function chargesFields() {
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

function showChargeAmount() {
  const mode = document.querySelector('input[name="chargeMode"]:checked')?.value;
  const wrapper = $("charges-amount-field");
  const input = $("chargesAmount");
  if (!wrapper || !input) return;
  wrapper.hidden = mode !== "with";
  input.required = mode === "with";
  if (mode !== "with") input.value = "0";
}

function attachChargeEvents() {
  document.querySelectorAll('input[name="chargeMode"]').forEach(el => {
    el.addEventListener("change", showChargeAmount);
  });
  showChargeAmount();
}

function renderForm() {
  $("form-heading").textContent = `${selectedFlow} → ${selectedTransaction}`;

  if (selectedFlow === "NEUTRAL") {
    fieldsBox.innerHTML = inputField("Amount (TZS)", "amount", "number", {
      required: true, placeholder: "Enter amount"
    });
    return;
  }

  if (selectedFlow === "CONTRA") {
    fieldsBox.innerHTML =
      inputField(
        selectedTransaction === "Withdraw Cash" ? "Amount to withdraw (TZS)" : "Amount to deposit (TZS)",
        "amount", "number", { required: true, placeholder: "Enter amount" }
      ) +
      inputField("Bank name", "name", "text", { required: true, placeholder: "Enter bank name" });

    if (selectedTransaction === "Withdraw Cash") {
      fieldsBox.insertAdjacentHTML("beforeend", chargesFields());
      attachChargeEvents();
    }
    return;
  }

  fieldsBox.innerHTML =
    methodField() +
    `<div class="field">
      <label for="name" id="name-label">Customer/supplier/bank name</label>
      <input id="name" name="name" type="text" autocomplete="off"
        placeholder="Leave blank for Cash">
    </div>` +
    inputField("Amount (TZS)", "amount", "number", {
      required: true, placeholder: "Enter amount"
    });

  $("method").addEventListener("change", updateMethodDetails);
  updateMethodDetails();
}

function updateMethodDetails() {
  const method = $("method").value;
  const nameInput = $("name");
  const nameLabel = $("name-label");
  const nameField = nameInput.closest(".field");

  nameInput.value = "";
  nameInput.required = method === "credit" || method === "bank";
  nameLabel.textContent = method === "credit"
    ? (selectedFlow === "IN" ? "Customer name" : "Supplier name")
    : method === "bank" ? "Bank name" : "Name (not required for Cash)";
  nameInput.placeholder = method === "cash" ? "Not required for Cash" : "Enter name";

  const existingCharges = $("charges-amount-field");
  if (existingCharges) existingCharges.remove();
  fieldsBox.querySelectorAll('.field input[name="chargeMode"]').forEach(el => el.closest(".field").remove());

  if (selectedFlow === "OUT" && method === "bank") {
    fieldsBox.insertAdjacentHTML("beforeend", chargesFields());
    attachChargeEvents();
  }
}

function amountValue() {
  const amount = Number($("amount")?.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }
  return amount;
}

function readMethod() {
  if (selectedFlow === "NEUTRAL") return "";
  if (selectedFlow === "CONTRA") return "bank";
  const method = $("method")?.value;
  if (!["cash", "credit", "bank"].includes(method)) {
    throw new Error("Select Cash, Credit, or Bank.");
  }
  return method;
}

function readName(method) {
  if (selectedFlow === "NEUTRAL" || method === "cash") return "";
  const name = $("name")?.value.trim() || "";
  if (!name) throw new Error(method === "credit" ? "Enter the customer or supplier name." : "Enter the bank name.");
  return name;
}

function record(transactionName, flow, method, name, amount, charges = 0, parentTransactionId = "") {
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

async function save(event) {
  event.preventDefault();
  if (saving) return;

  const button = $("save-transaction");
  try {
    if (!db) throw new Error("Firestore is not ready. Refresh and try again.");

    saving = true;
    button.disabled = true;
    button.textContent = "Saving…";

    const amount = amountValue();
    const method = readMethod();
    const name = readName(method);
    const isOutBank = selectedFlow === "OUT" && method === "bank";
    const isWithdrawal = selectedFlow === "CONTRA" && selectedTransaction === "Withdraw Cash";
    const chargeMode = (isOutBank || isWithdrawal)
      ? document.querySelector('input[name="chargeMode"]:checked')?.value || "without"
      : "without";

    let charges = 0;
    if (chargeMode === "with") {
      charges = Number($("chargesAmount")?.value);
      if (!Number.isFinite(charges) || charges < 0) {
        throw new Error("Enter valid bank charges (zero or more).");
      }
    }

    const batch = writeBatch(db);
    const transactions = collection(db, "transactions");
    const mainRef = doc(transactions);

    batch.set(mainRef, record(
      selectedTransaction, selectedFlow, method, name, amount, charges
    ));

    if (charges > 0) {
      const chargeRef = doc(transactions);
      batch.set(chargeRef, record(
        "Bank Charges", "OUT", "bank", name, charges, 0, mainRef.id
      ));
    }

    await batch.commit();
    $("transaction-form").reset();
    formPanel.hidden = true;
    status(charges > 0
      ? `${selectedTransaction} saved. Bank Charges was also saved as a separate OUT transaction.`
      : `${selectedTransaction} saved successfully.`);
    await displayTransactions();
  } catch (error) {
    console.error("Save failed:", error);
    status(error.message || "Could not save the transaction. Check Firestore access.", true);
  } finally {
    saving = false;
    button.disabled = false;
    button.textContent = "Save";
  }
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
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

function renderRows(flow, rows) {
  const sorted = rows.slice().sort((a, b) =>
    (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0)
  );

  if (!sorted.length) {
    return `<section class="transaction-group"><h3>${esc(flow)}</h3><div class="empty-state">No ${esc(flow)} transactions yet.</div></section>`;
  }

  return `<section class="transaction-group">
    <h3>${esc(flow)} (${sorted.length})</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Transaction</th><th>Flow</th><th>Method</th><th>Name</th><th>Amount</th><th>Charges</th></tr></thead>
      <tbody>${sorted.map(row => `<tr>
        <td>${esc(formatDate(row.date))}</td>
        <td>${esc(row.transactionName || "—")}</td>
        <td>${esc(row.flow || "—")}</td>
        <td>${esc(row.method || "—")}</td>
        <td>${esc(row.name || "—")}</td>
        <td>${esc(money(row.amount))}</td>
        <td>${esc(money(row.charges))}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  </section>`;
}

async function displayTransactions() {
  const panel = $("transactions-panel");
  const target = $("transaction-groups");
  panel.hidden = false;
  target.innerHTML = '<div class="empty-state">Loading transactions…</div>';

  try {
    if (!db) throw new Error("Firebase is not ready yet.");
    const snapshot = await getDocs(query(collection(db, "transactions"), orderBy("date", "desc")));
    const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    target.innerHTML = ["IN", "OUT", "NEUTRAL", "CONTRA"]
      .map(flow => renderRows(flow, rows.filter(row => row.flow === flow))).join("");
    status(`Loaded ${rows.length} saved transaction(s).`);
  } catch (error) {
    console.error("Read failed:", error);
    target.innerHTML = '<div class="empty-state">Transactions could not be loaded. Check Firestore permissions and your connection.</div>';
    status(error.message || "Could not load transactions.", true);
  }
}

$("display-transactions").addEventListener("click", () => {
  $("transaction-options-panel").hidden = false;
  $("transaction-options-panel").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelectorAll("[data-transaction]").forEach(button => {
  button.addEventListener("click", () => {
    selectedFlow = button.dataset.flow;
    selectedTransaction = button.dataset.transaction;
    renderForm();
    formPanel.hidden = false;
    formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

$("transaction-form").addEventListener("submit", save);
$("cancel-form").addEventListener("click", () => { formPanel.hidden = true; });
$("refresh-transactions").addEventListener("click", displayTransactions);

initializeFirestore().then(() => {
  status("Connected to Firebase. Select Display Transactions to choose a transaction.");
}).catch(error => {
  console.error("Firebase initialization failed:", error);
  status(error.message || "Firebase initialization failed.", true);
});

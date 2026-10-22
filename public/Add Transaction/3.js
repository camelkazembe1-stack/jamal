import "/firebase.js";
import { getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp, writeBatch, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseApp = getApps().length ? getApp() : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;

const transactionGroups = {
  "Sales": "IN",
  "Commission Received": "IN",
  "Purchases": "OUT",
  "Rent": "OUT",
  "Retained Profit": "NEUTRAL",
  "Withdraw Cash": "CONTRA",
  "Deposit Cash": "CONTRA"
};

const panel = document.getElementById("entry-panel");
const form = document.getElementById("transaction-form");
const fields = document.getElementById("fields");
const title = document.getElementById("form-title");
const status = document.getElementById("status");
const saveButton = document.getElementById("save-button");
let selectedTransaction = "";

function createField({ id, label, type = "text", required = false, choices = [], min, step }) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const labelElement = document.createElement("label");
  labelElement.htmlFor = id;
  labelElement.textContent = label;

  let input;
  if (type === "select") {
    input = document.createElement("select");
    choices.forEach(choice => {
      const option = document.createElement("option");
      option.value = choice.value;
      option.textContent = choice.label;
      input.appendChild(option);
    });
  } else {
    input = document.createElement("input");
    input.type = type;
    if (min !== undefined) input.min = String(min);
    if (step !== undefined) input.step = String(step);
  }

  input.id = id;
  input.name = id;
  input.required = required;
  wrapper.append(labelElement, input);
  fields.appendChild(wrapper);
  return { input, wrapper, labelElement };
}

function amountField(id = "amount", label = "Amount") {
  return createField({ id, label, type: "number", required: true, min: 0.01, step: 0.01 });
}

function nameAndMethodFields(flow) {
  const methodField = createField({
    id: "method",
    label: "Method",
    type: "select",
    required: true,
    choices: [
      { value: "Cash", label: "Cash" },
      { value: "Credit", label: "Credit" },
      { value: "Bank", label: "Bank" }
    ]
  });
  const nameField = createField({ id: "name", label: "Name" });

  function updateNameField() {
    const method = methodField.input.value;
    nameField.wrapper.hidden = method === "Cash";
    nameField.input.required = method !== "Cash";
    nameField.labelElement.textContent =
      method === "Credit" ? (flow === "IN" ? "Customer name" : "Supplier name") :
      method === "Bank" ? "Bank name" : "Name";
    if (method === "Cash") nameField.input.value = "";
  }

  methodField.input.addEventListener("change", updateNameField);
  updateNameField();
  return { methodField, nameField };
}

function buildTransactionForm(transaction) {
  selectedTransaction = transaction;
  fields.replaceChildren();
  form.reset();
  status.textContent = "";
  status.className = "";
  title.textContent = transaction;
  panel.hidden = false;

  const flow = transactionGroups[transaction];

  if (flow === "IN" || flow === "OUT") {
    const { methodField } = nameAndMethodFields(flow);
    amountField();

    if (flow === "OUT") {
      const chargeMode = createField({
        id: "chargeMode",
        label: "Bank charges",
        type: "select",
        choices: [
          { value: "without", label: "Without charges" },
          { value: "with", label: "With charges" }
        ]
      });
      const charges = createField({
        id: "charges",
        label: "Charge amount",
        type: "number",
        min: 0,
        step: 0.01
      });
      chargeMode.wrapper.hidden = true;
      charges.wrapper.hidden = true;

      function updateCharges() {
        const bank = methodField.input.value === "Bank";
        chargeMode.wrapper.hidden = !bank;
        charges.wrapper.hidden = !bank || chargeMode.input.value !== "with";
        charges.input.required = bank && chargeMode.input.value === "with";
        if (!bank) charges.input.value = "";
      }
      methodField.input.addEventListener("change", updateCharges);
      chargeMode.input.addEventListener("change", updateCharges);
      updateCharges();
    }
  } else if (transaction === "Retained Profit") {
    amountField();
  } else if (transaction === "Deposit Cash") {
    amountField("amount", "Amount to deposit");
    createField({ id: "bankName", label: "Bank name", required: true });
  } else if (transaction === "Withdraw Cash") {
    amountField("amount", "Amount to withdraw");
    createField({ id: "bankName", label: "Bank name", required: true });
    const mode = createField({
      id: "chargeMode",
      label: "Withdrawal charges",
      type: "select",
      choices: [
        { value: "without", label: "Without charges" },
        { value: "with", label: "With charges" }
      ]
    });
    const charges = createField({
      id: "charges",
      label: "Charge amount",
      type: "number",
      min: 0,
      step: 0.01
    });
    charges.wrapper.hidden = true;
    mode.input.addEventListener("change", () => {
      charges.wrapper.hidden = mode.input.value !== "with";
      charges.input.required = mode.input.value === "with";
      if (mode.input.value !== "with") charges.input.value = "";
    });
  }

  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelectorAll("[data-transaction]").forEach(button => {
  button.addEventListener("click", () => buildTransactionForm(button.dataset.transaction));
});

document.getElementById("cancel-button").addEventListener("click", () => {
  form.reset();
  fields.replaceChildren();
  panel.hidden = true;
  selectedTransaction = "";
  status.textContent = "";
});

function showError(message) {
  status.className = "error";
  status.textContent = message;
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!db) {
    showError("Firebase is not initialized. Check public/firebase.js.");
    return;
  }

  const flow = transactionGroups[selectedTransaction];
  const values = new FormData(form);
  const amount = Number(values.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    showError("Enter an amount greater than zero.");
    return;
  }

  const isTransfer = ["Deposit Cash", "Withdraw Cash"].includes(selectedTransaction);
  const method = isTransfer ? "Bank" : (values.get("method") || "");
  const name = isTransfer
    ? String(values.get("bankName") || "").trim()
    : method === "Cash" ? ""
    : String(values.get("name") || "").trim();

  if ((isTransfer && !name) || (!isTransfer && method !== "Cash" && !name)) {
    showError("Please complete the required name or bank field.");
    return;
  }

  const charges = Number(values.get("charges") || 0);
  if (!Number.isFinite(charges) || charges < 0) {
    showError("Enter a valid charge amount.");
    return;
  }
  if (selectedTransaction === "Withdraw Cash" && charges >= amount && charges > 0) {
    showError("Withdrawal charges must be less than the withdrawal amount.");
    return;
  }

  const record = {
    date: new Date().toISOString().slice(0, 10),
    createdAt: serverTimestamp(),
    transactionName: selectedTransaction,
    flow,
    method,
    name,
    amount,
    charges: 0
  };

  if (isTransfer) {
    record.cashTransfer = true;
    record.charges = selectedTransaction === "Withdraw Cash" ? charges : 0;
  } else if (flow === "OUT" && method === "Bank" && values.get("chargeMode") === "with") {
    record.charges = charges;
  }

  saveButton.disabled = true;
  saveButton.textContent = "Saving…";
  status.className = "";
  status.textContent = "Saving transaction…";

  try {
    if (selectedTransaction === "Withdraw Cash" && charges > 0) {
      const batch = writeBatch(db);
      const transactionRef = doc(collection(db, "transactions"));
      const chargeRef = doc(collection(db, "transactions"));

      batch.set(transactionRef, record);
      batch.set(chargeRef, {
        date: record.date,
        createdAt: serverTimestamp(),
        transactionName: "Bank Charges",
        flow: "OUT",
        method: "Bank",
        name,
        amount: charges,
        charges: 0,
        parentTransactionId: transactionRef.id
      });
      await batch.commit();
    } else {
      await addDoc(collection(db, "transactions"), record);

      if (flow === "OUT" && method === "Bank" && charges > 0) {
        await addDoc(collection(db, "transactions"), {
          date: record.date,
          createdAt: serverTimestamp(),
          transactionName: "Bank Charges",
          flow: "OUT",
          method: "Bank",
          name,
          amount: charges,
          charges: 0
        });
      }
    }

    status.className = "success";
    status.textContent = `${selectedTransaction} saved successfully.`;
    form.reset();
    fields.replaceChildren();
    panel.hidden = true;
    selectedTransaction = "";
  } catch (error) {
    console.error("Transaction save failed:", error);
    showError(`Could not save transaction: ${error.message || "Check Firebase connection and Firestore rules."}`);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save Transaction";
  }
});


/* JAMALI: hide transaction choices while entering a transaction */
(() => {
  const transactionNames = new Set([
    "sales",
    "commission received",
    "purchases",
    "rent",
    "retained profit",
    "withdraw cash",
    "deposit cash"
  ]);

  const categoryNames = new Set(["in", "out", "neutral", "contra"]);

  function setupTransactionChoiceView() {
    if (document.documentElement.dataset.transactionChoiceViewReady === "true") return;
    document.documentElement.dataset.transactionChoiceViewReady = "true";

    document.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button) return;

      const name = (button.textContent || "").trim().replace(/\s+/g, " ").toLowerCase();
      if (!transactionNames.has(name)) return;

      // Hide all transaction-choice buttons and their category headings.
      document.querySelectorAll("button").forEach((item) => {
        const text = (item.textContent || "").trim().replace(/\s+/g, " ").toLowerCase();
        if (transactionNames.has(text)) item.classList.add("transaction-choice-hidden");
      });

      document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((heading) => {
        const text = (heading.textContent || "").trim().toLowerCase();
        if (categoryNames.has(text)) heading.classList.add("transaction-choice-hidden");
      });

      // Hide category containers when they contain no form controls.
      document.querySelectorAll(
        ".transaction-section, .transaction-group, .transaction-category, .transaction-buttons"
      ).forEach((group) => {
        if (
          !group.querySelector("input, select, textarea, form") &&
          group.querySelector("button")
        ) {
          group.classList.add("transaction-choice-hidden");
        }
      });

      // Scroll the newly opened form into view after the existing click handler runs.
      window.setTimeout(() => {
        const forms = [...document.querySelectorAll(
          "form, #transaction-form, #form-container, #entry-form, #transactionForm, .transaction-form, .form-panel"
        )];

        const visibleForm = forms.find((form) =>
          form.getClientRects().length > 0 &&
          !form.classList.contains("transaction-choice-hidden")
        );

        if (visibleForm) {
          visibleForm.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupTransactionChoiceView, { once: true });
  } else {
    setupTransactionChoiceView();
  }
})();

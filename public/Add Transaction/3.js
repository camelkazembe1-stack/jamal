import "/firebase.js";
import { getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp, writeBatch, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = getApps().length ? getApp() : null;
const db = app ? getFirestore(app) : null;

const groups = {
  "Sales": "IN",
  "Commission Received": "IN",
  "Purchases": "OUT",
  "Rent": "OUT",
  "Retained Profit": "NEUTRAL",
  "Withdraw Cash": "CONTRA",
  "Deposit Cash": "CONTRA"
};

const form = document.getElementById("transaction-form");
const panel = document.getElementById("entry-panel");
const fields = document.getElementById("dynamic-fields");
const title = document.getElementById("form-title");
const status = document.getElementById("form-status");
const saveButton = document.getElementById("save-button");
let selectedTransaction = "";

function addField(id, label, type = "text", options = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = label;
  let input;
  if (type === "select") {
    input = document.createElement("select");
    for (const item of options.choices || []) {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      input.appendChild(option);
    }
  } else {
    input = document.createElement("input");
    input.type = type;
    if (type === "number") {
      input.min = "0.01";
      input.step = "0.01";
    }
    if (options.placeholder) input.placeholder = options.placeholder;
  }
  input.id = id;
  input.name = id;
  if (options.required) input.required = true;
  if (options.value) input.value = options.value;
  wrapper.append(lab, input);
  fields.appendChild(wrapper);
  return input;
}

function buildForm(transaction) {
  selectedTransaction = transaction;
  const flow = groups[transaction];
  title.textContent = transaction;
  fields.replaceChildren();
  status.textContent = "";
  status.className = "";
  panel.hidden = false;

  if (flow === "IN" || flow === "OUT") {
    const method = addField("method", "Method", "select", {
      required: true,
      choices: [
        {value:"Cash", label:"Cash"},
        {value:"Credit", label:"Credit"},
        {value:"Bank", label:"Bank"}
      ]
    });
    const name = addField("name", "Customer / Supplier / Bank name");
    const amount = addField("amount", "Amount", "number", {required:true});
    name.required = false;

    const updateName = () => {
      name.required = method.value !== "Cash";
      name.parentElement.querySelector("label").textContent =
        method.value === "Credit" ? "Customer / Supplier name" :
        method.value === "Bank" ? "Bank name" : "Name (not required for Cash)";
      name.parentElement.hidden = method.value === "Cash";
      name.value = "";
    };
    method.addEventListener("change", updateName);
    updateName();

    if (flow === "OUT") {
      const chargesChoice = addField("charges-choice", "Bank charges", "select", {
        choices: [
          {value:"without", label:"Without charges"},
          {value:"with", label:"With charges"}
        ]
      });
      const charges = addField("charges", "Charge amount", "number");
      charges.parentElement.hidden = true;
      chargesChoice.addEventListener("change", () => {
        charges.parentElement.hidden = !(method.value === "Bank" && chargesChoice.value === "with");
        charges.required = method.value === "Bank" && chargesChoice.value === "with";
      });
      method.addEventListener("change", () => {
        chargesChoice.parentElement.hidden = method.value !== "Bank";
        charges.parentElement.hidden = !(method.value === "Bank" && chargesChoice.value === "with");
        charges.required = method.value === "Bank" && chargesChoice.value === "with";
      });
      chargesChoice.parentElement.hidden = true;
    }
  } else if (transaction === "Retained Profit") {
    addField("amount", "Amount", "number", {required:true});
  } else if (transaction === "Deposit Cash") {
    addField("amount", "Amount to deposit", "number", {required:true});
    addField("bankName", "Bank name", "text", {required:true});
  } else if (transaction === "Withdraw Cash") {
    addField("amount", "Amount to withdraw", "number", {required:true});
    addField("bankName", "Bank name", "text", {required:true});
    addField("chargeMode", "Withdrawal charges", "select", {
      choices: [
        {value:"without", label:"Without charges"},
        {value:"with", label:"With charges"}
      ]
    });
    const charges = addField("charges", "Charge amount", "number");
    charges.parentElement.hidden = true;
    const chargeMode = fields.querySelector("#chargeMode");
    chargeMode.addEventListener("change", () => {
      charges.parentElement.hidden = chargeMode.value !== "with";
      charges.required = chargeMode.value === "with";
    });
  }
  panel.scrollIntoView({behavior:"smooth", block:"start"});
}

document.querySelectorAll("[data-transaction]").forEach(button => {
  button.addEventListener("click", () => buildForm(button.dataset.transaction));
});

document.getElementById("cancel-button").addEventListener("click", () => {
  form.reset();
  panel.hidden = true;
  selectedTransaction = "";
  status.textContent = "";
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!db) {
    status.className = "error";
    status.textContent = "Firebase is not initialized. Check public/firebase.js.";
    return;
  }
  const flow = groups[selectedTransaction];
  const data = new FormData(form);
  const amount = Number(data.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    status.className = "error";
    status.textContent = "Enter an amount greater than zero.";
    return;
  }

  const method = data.get("method") || "";
  const name = method === "Cash" ? "" :
    method === "Credit" ? String(data.get("name") || "").trim() :
    method === "Bank" ? String(data.get("name") || "").trim() : "";
  if ((method === "Credit" || method === "Bank") && !name) {
    status.className = "error";
    status.textContent = "Enter the required customer, supplier, or bank name.";
    return;
  }

  const charges = Number(data.get("charges") || 0);
  if (!Number.isFinite(charges) || charges < 0 ||
      (data.get("charges") && charges >= amount && selectedTransaction === "Withdraw Cash")) {
    status.className = "error";
    status.textContent = "Check the charge amount.";
    return;
  }

  const record = {
    date: new Date().toISOString().slice(0,10),
    createdAt: serverTimestamp(),
    transactionName: selectedTransaction,
    flow,
    method,
    name,
    amount,
    charges: 0
  };

  saveButton.disabled = true;
  saveButton.textContent = "Saving…";
  status.className = "";
  status.textContent = "Saving transaction…";

  try {
    if (selectedTransaction === "Withdraw Cash" || selectedTransaction === "Deposit Cash") {
      record.method = "Bank";
      record.name = String(data.get("bankName") || "").trim();
      record.cashTransfer = true;
      record.charges = selectedTransaction === "Withdraw Cash" ? charges : 0;
    } else {
      record.charges = flow === "OUT" && method === "Bank" ? charges : 0;
    }

    if (selectedTransaction === "Withdraw Cash" && charges > 0) {
      const batch = writeBatch(db);
      const mainRef = doc(collection(db, "transactions"));
      const chargeRef = doc(collection(db, "transactions"));
      batch.set(mainRef, record);
      batch.set(chargeRef, {
        date: record.date,
        createdAt: serverTimestamp(),
        transactionName: "Bank Charges",
        flow: "OUT",
        method: "Bank",
        name: record.name,
        amount: charges,
        charges: 0,
        parentTransactionId: mainRef.id
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
    panel.hidden = true;
    selectedTransaction = "";
  } catch (error) {
    console.error("Failed to save transaction:", error);
    status.className = "error";
    status.textContent = `Could not save transaction: ${error.message || "Check Firebase permissions and connection."}`;
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save Transaction";
  }
});

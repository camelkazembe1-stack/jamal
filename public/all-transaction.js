import { app } from "/firebase.js";
import {
  getFirestore, collection, getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);
const tbody = document.getElementById("transactions");
const status = document.getElementById("status");
const search = document.getElementById("search");
let rows = [];

function dateText(data) {
  const value = data.date || data.createdAt;
  if (!value) return "";
  if (typeof value.toDate === "function") return value.toDate().toLocaleString();
  if (typeof value === "string") return value;
  if (value.seconds) return new Date(value.seconds * 1000).toLocaleString();
  return String(value);
}
function safe(value) {
  if (value == null) return "";
  if (typeof value === "object" && typeof value.toDate === "function")
    return value.toDate().toLocaleString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function render() {
  const term = search.value.trim().toLowerCase();
  const filtered = rows.filter(row =>
    Object.values(row).some(value => safe(value).toLowerCase().includes(term))
  );
  tbody.replaceChildren();
  for (const row of filtered) {
    const tr = document.createElement("tr");
    const values = [
      dateText(row), row.transactionName, row.flow, row.method,
      row.name, row.amount, row.charges, row.cashTransfer, row.id
    ];
    for (const value of values) {
      const td = document.createElement("td");
      td.textContent = safe(value);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  status.textContent = `Showing ${filtered.length} of ${rows.length} transactions.`;
}
async function loadTransactions() {
  if (!auth.currentUser) {
    status.textContent = "Please sign in to view transactions.";
    return;
  }
  status.textContent = "Loading transactions...";
  try {
    const snapshot = await getDocs(collection(db, "transactions"));
    rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    rows.sort((a, b) => {
      const time = value => {
        if (value && typeof value.toDate === "function") return value.toDate().getTime();
        if (value && value.seconds) return value.seconds * 1000;
        const parsed = Date.parse(value?.date || value || "");
        return Number.isFinite(parsed) ? parsed : 0;
      };
      return time(b.createdAt || b.date) - time(a.createdAt || a.date);
    });
    render();
    if (!rows.length) status.textContent = "No transactions found.";
  } catch (error) {
    console.error("Could not load transactions:", error);
    status.textContent = "Could not load transactions: " + error.message;
  }
}
search.addEventListener("input", render);
document.getElementById("refresh").addEventListener("click", loadTransactions);
onAuthStateChanged(auth, user => {
  if (user) loadTransactions();
  else status.textContent = "Please sign in to view transactions.";
});

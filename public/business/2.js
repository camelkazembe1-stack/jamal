(() => {
  const panel = document.getElementById("business-panel");
  if (!panel) return;

  const storageKey = "jamali_business_transactions";

  function readTransactions() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function showPanel(html) {
    panel.innerHTML = html;
    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("add-transaction")?.addEventListener("click", () => {
    showPanel(`
      <h2>Add Transaction</h2>
      <form class="transaction-form" id="transaction-form">
        <label>
          Transaction description
          <input name="description" required maxlength="200"
                 placeholder="Enter transaction description">
        </label>
        <label>
          Amount
          <input name="amount" type="number" min="0.01" step="0.01"
                 required placeholder="Enter amount">
        </label>
        <label>
          Date
          <input name="date" type="date" required>
        </label>
        <button type="submit">Save Transaction</button>
        <p class="form-message" id="form-message" role="status"></p>
      </form>
    `);

    const dateInput = panel.querySelector('[name="date"]');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

    panel.querySelector("#transaction-form")?.addEventListener("submit", event => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const description = String(data.get("description") || "").trim();
      const amount = Number(data.get("amount"));
      const date = String(data.get("date") || "");

      if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
        panel.querySelector("#form-message").textContent =
          "Enter a description, a valid amount, and a date.";
        return;
      }

      const transactions = readTransactions();
      transactions.push({
        description,
        amount,
        date,
        createdAt: new Date().toISOString()
      });

      try {
        localStorage.setItem(storageKey, JSON.stringify(transactions));
        showPanel(`
          <h2>Transaction Saved</h2>
          <p class="form-message">Your transaction was saved in this browser.</p>
          <button class="panel-button" id="show-transactions" type="button">View File</button>
        `);
        panel.querySelector("#show-transactions")?.addEventListener("click", renderTransactions);
      } catch {
        panel.querySelector("#form-message").textContent =
          "Could not save the transaction in this browser.";
      }
    });
  });

  function renderTransactions() {
    const transactions = readTransactions();

    if (!transactions.length) {
      showPanel(`
        <h2>View File</h2>
        <p class="empty-message">No transactions have been saved yet.</p>
      `);
      return;
    }

    const list = transactions.map((transaction, index) => `
      <li>
        <strong>${escapeHtml(transaction.description)}</strong>
        — ${Number(transaction.amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
        — ${escapeHtml(transaction.date)}
      </li>
    `).join("");

    showPanel(`
      <h2>View File</h2>
      <p>${transactions.length} saved transaction(s)</p>
      <ol class="transaction-list">${list}</ol>
    `);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  document.getElementById("view-file")?.addEventListener("click", renderTransactions);
})();

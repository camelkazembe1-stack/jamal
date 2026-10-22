(() => {
  const results = document.getElementById("transaction-results");
  if (!results) return;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function readTransactions() {
    try {
      const data = JSON.parse(localStorage.getItem("jamali_business_transactions") || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  const transactions = readTransactions();
  if (!transactions.length) {
    results.innerHTML = '<p class="muted">No transactions have been saved yet.</p>';
  } else {
    results.innerHTML = '<ol class="transaction-list">' + transactions.map(item => `
      <li><strong>${escapeHtml(item.description)}</strong> — ${Number(item.amount).toLocaleString(undefined, {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      })} — ${escapeHtml(item.date)}</li>
    `).join("") + '</ol>';
  }

  document.getElementById("download-file")?.addEventListener("click", () => {
    const rows = [["Description", "Amount", "Date"], ...transactions.map(item => [
      item.description, item.amount, item.date
    ])];
    const csv = rows.map(row => row.map(value =>
      '"' + String(value ?? "").replace(/"/g, '""') + '"'
    ).join(",")).join("\\r\\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jamali-business-transactions.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
})();

(() => {
  const form = document.getElementById("transaction-form");
  if (!form) return;

  const dateInput = form.elements.namedItem("date");
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const description = String(data.get("description") || "").trim();
    const amount = Number(data.get("amount"));
    const date = String(data.get("date") || "");
    const message = document.getElementById("form-message");

    if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
      message.textContent = "Please enter a description, valid amount, and date.";
      return;
    }

    let transactions;
    try {
      transactions = JSON.parse(localStorage.getItem("jamali_business_transactions") || "[]");
      if (!Array.isArray(transactions)) transactions = [];
      transactions.push({ description, amount, date, createdAt: new Date().toISOString() });
      localStorage.setItem("jamali_business_transactions", JSON.stringify(transactions));
      form.reset();
      dateInput.value = new Date().toISOString().slice(0, 10);
      message.textContent = "Transaction saved successfully.";
    } catch (error) {
      console.error(error);
      message.textContent = "Could not save this transaction in your browser.";
    }
  });
})();

/* JAMALI — shared sidebar (all pages except index.html) */
(function () {

  // Current folder — read BEFORE the address bar is cleaned, so the
  // active page can still be highlighted in the family tree
  var current = location.pathname.split("/")[1];

  // Address bar always shows the bare domain
  try { history.replaceState({}, "", "/"); } catch (e) {}

  // PAGES — the family tree of the app.
// Every page is a CHILD of the page whose buttons open it:
//   Home (d0) > Business (d1) > {Add Transaction, View File} (d2)
//   View File children (d3): All Transactions, the books & journals,
//   the registers (orders, invoices, goods, notes, vouchers, cheques,
//   payroll, assets) and the 14 reports/schedules — pages 5-54.
  var PAGES = [
    { label: "Home", icon: "🏠", folder: "home", n: 1, d: 0 },
    { label: "Business", icon: "🏢", folder: "business", n: 2, d: 1 },
    { label: "Add Transaction", icon: "🧾", folder: "add-transaction", n: 3, d: 2 },
    { label: "View File", icon: "📄", folder: "view-file", n: 4, d: 2 },
    { label: "All Transactions", icon: "📊", folder: "all-transactions", n: 5, d: 3 },
    { label: "Cash Book", icon: "📒", folder: "cash-book-single", n: 15, d: 3 },
    { label: "Double Column Cash Book", icon: "📕", folder: "cash-book", n: 6, d: 3 },
    { label: "Petty Cash Book", icon: "🪙", folder: "petty-cash", n: 7, d: 3 },
    { label: "Sales Journal", icon: "🛍️", folder: "sales-journal", n: 8, d: 3 },
    { label: "Purchases Journal", icon: "🛒", folder: "purchases-journal", n: 9, d: 3 },
    { label: "Sales Returns", icon: "↩️", folder: "sales-returns", n: 10, d: 3 },
    { label: "Purchases Returns", icon: "↪️", folder: "purchases-returns", n: 11, d: 3 },
    { label: "General Journal", icon: "📓", folder: "general-journal", n: 12, d: 3 },
    { label: "Cash Receipts", icon: "💵", folder: "cash-receipts", n: 13, d: 3 },
    { label: "Cash Payments", icon: "💸", folder: "cash-payments", n: 14, d: 3 },
    { label: "Creditors Book", icon: "🏦", folder: "creditors-book", n: 16, d: 3 },
    { label: "Debtors Book", icon: "🤝", folder: "debtors-book", n: 17, d: 3 },
    { label: "Ledger", icon: "📘", folder: "ledger", n: 18, d: 3 },
    { label: "Bills Receivable", icon: "📥", folder: "bills-receivable", n: 19, d: 3 },
    { label: "Bills Payable", icon: "📤", folder: "bills-payable", n: 20, d: 3 },
    { label: "Sales Order Book", icon: "📋", folder: "sales-order-book", n: 21, d: 3 },
    { label: "Purchase Order Book", icon: "🛒", folder: "purchase-order-book", n: 22, d: 3 },
    { label: "Sales Invoice", icon: "🧾", folder: "sales-invoice", n: 23, d: 3 },
    { label: "Purchase Invoice", icon: "🧾", folder: "purchase-invoice", n: 24, d: 3 },
    { label: "GRN Register", icon: "📦", folder: "grn-register", n: 25, d: 3 },
    { label: "Dispatch Register", icon: "🚚", folder: "dispatch-register", n: 26, d: 3 },
    { label: "Sales Invoice Register", icon: "🧾", folder: "sales-invoice-register", n: 27, d: 3 },
    { label: "Purchase Invoice Register", icon: "🧾", folder: "purchase-invoice-register", n: 28, d: 3 },
    { label: "Debit Note Register", icon: "↩️", folder: "debit-note-register", n: 29, d: 3 },
    { label: "Credit Note Register", icon: "↪️", folder: "credit-note-register", n: 30, d: 3 },
    { label: "Stock Movement", icon: "📊", folder: "stock-movement", n: 31, d: 3 },
    { label: "Fixed Assets", icon: "🏗️", folder: "fixed-assets", n: 32, d: 3 },
    { label: "Depreciation", icon: "📉", folder: "depreciation", n: 33, d: 3 },
    { label: "Payroll", icon: "👥", folder: "payroll", n: 34, d: 3 },
    { label: "Employee Advance", icon: "💵", folder: "employee-advance", n: 35, d: 3 },
    { label: "Petty Cash Voucher", icon: "🪙", folder: "petty-cash-voucher", n: 36, d: 3 },
    { label: "Receipt Voucher", icon: "🧾", folder: "receipt-voucher", n: 37, d: 3 },
    { label: "Payment Voucher", icon: "💳", folder: "payment-voucher", n: 38, d: 3 },
    { label: "Cheque Register", icon: "🏦", folder: "cheque-register", n: 39, d: 3 },
    { label: "Delivery Note", icon: "📬", folder: "delivery-note", n: 40, d: 3 },
    { label: "Trial Balance", icon: "⚖️", folder: "trial-balance", n: 41, d: 3 },
    { label: "Adjusted Trial Balance", icon: "🧮", folder: "adjusted-trial-balance", n: 42, d: 3 },
    { label: "Post-Closing Trial Balance", icon: "🔒", folder: "post-closing-trial-balance", n: 43, d: 3 },
    { label: "AR Schedule", icon: "🤝", folder: "ar-schedule", n: 44, d: 3 },
    { label: "AP Schedule", icon: "🏦", folder: "ap-schedule", n: 45, d: 3 },
    { label: "Inventory Valuation", icon: "🏷️", folder: "inventory-valuation", n: 46, d: 3 },
    { label: "Fixed Assets Schedule", icon: "🏛️", folder: "fixed-assets-schedule", n: 47, d: 3 },
    { label: "Accumulated Depreciation", icon: "📚", folder: "accumulated-depreciation", n: 48, d: 3 },
    { label: "Accrued Expenses", icon: "⏰", folder: "accrued-expenses", n: 49, d: 3 },
    { label: "Prepaid Expenses", icon: "⏳", folder: "prepaid-expenses", n: 50, d: 3 },
    { label: "Accrued Income", icon: "💰", folder: "accrued-income", n: 51, d: 3 },
    { label: "Unearned Revenue", icon: "🎁", folder: "unearned-revenue", n: 52, d: 3 },
    { label: "Bank Reconciliation", icon: "🏧", folder: "bank-reconciliation", n: 53, d: 3 },
    { label: "Suspense Account", icon: "🌀", folder: "suspense-account", n: 54, d: 3 },
  ];

  var css = document.createElement("style");
  css.textContent = [
    "#jamali-sidebar{position:fixed;top:0;left:0;bottom:0;width:220px;background:#0f172a;",
    "color:#e2e8f0;display:flex;flex-direction:column;z-index:1000;transition:transform .25s ease}",
    "#jamali-sidebar .brand{height:60px;flex:0 0 60px;display:flex;align-items:center;gap:10px;",
    "padding:0 18px;font-weight:900;letter-spacing:2px;color:#fff;border-bottom:1px solid #1e293b}",
    "#jamali-sidebar .brand i{width:30px;height:30px;border-radius:9px;display:flex;",
    "align-items:center;justify-content:center;font-style:normal;font-size:12px;",
    "background:linear-gradient(135deg,#38bdf8,#0ea5e9);color:#fff}",
    "#jamali-sidebar nav{flex:1;overflow-y:auto;padding:8px 0}",
    "#jamali-sidebar a{display:flex;align-items:center;gap:12px;padding:9px 18px;",
    "color:#94a3b8;text-decoration:none;font-size:14px;border-left:3px solid transparent}",
    "#jamali-sidebar a.lv1{padding-left:26px}",
    "#jamali-sidebar a.lv2{padding-left:34px}",
    "#jamali-sidebar a.lv3{padding-left:42px}",
    "#jamali-sidebar a:hover{background:#1e293b;color:#fff}",
    "#jamali-sidebar a.active{background:#1e293b;color:#fff;border-left-color:#38bdf8}",
    "body.jamali-has-sidebar{margin-left:220px}",
    "#jamali-burger{display:none;position:fixed;top:12px;left:12px;z-index:1002;width:42px;height:42px;",
    "border-radius:10px;border:1px solid #334155;background:#0f172a;color:#fff;font-size:19px;",
    "align-items:center;justify-content:center;cursor:pointer}",
    "#jamali-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999}",
    "@media(max-width:800px){",
    " body.jamali-has-sidebar{margin-left:0}",
    " #jamali-sidebar{transform:translateX(-100%)}",
    " body.jamali-sidebar-open #jamali-sidebar{transform:none}",
    " #jamali-burger{display:flex}",
    " body.jamali-sidebar-open #jamali-overlay{display:block}}"
  ].join("");
  document.head.appendChild(css);

  var burger = document.createElement("button");
  burger.id = "jamali-burger";
  burger.innerHTML = "&#9776;";
  burger.addEventListener("click", function () {
    document.body.classList.toggle("jamali-sidebar-open");
  });

  var overlay = document.createElement("div");
  overlay.id = "jamali-overlay";
  overlay.addEventListener("click", function () {
    document.body.classList.remove("jamali-sidebar-open");
  });

  var links = PAGES.map(function (p) {
    var href = "/" + p.folder + "/" + p.n;
    var cls = "lv" + (p.d || 0);
    if (p.folder === current) cls += " active";
    return "<a href=\"" + href + "\" class=\"" + cls + "\"><span>" + p.icon + "</span>" + p.label + "</a>";
  }).join("");

  var aside = document.createElement("aside");
  aside.id = "jamali-sidebar";
  aside.innerHTML = "<div class=\"brand\"><i>JA</i>JAMALI</div><nav>" + links + "</nav>";

  document.body.insertBefore(overlay, document.body.firstChild);
  document.body.insertBefore(aside, document.body.firstChild);
  document.body.insertBefore(burger, document.body.firstChild);
  document.body.classList.add("jamali-has-sidebar");
})();

/* JAMALI — shared sidebar (all pages except index.html) */
(function () {

  // Current folder — read BEFORE the address bar is cleaned, so the
  // active page can still be highlighted in the family tree
  var current = location.pathname.split("/")[1];

  // Address bar always shows the bare domain
  try { history.replaceState({}, "", "/"); } catch (e) {}

  // PAGES — the family tree of the app.
  // Every page is a CHILD of the page whose buttons open it:
  //   Home (d0)
  //    └ Business (d1)                <- Business button lives on Home
  //       ├ Add Transaction (d2)      <- button lives on Business
  //       └ View File (d2)            <- button lives on Business
  //          ├ All Transactions (d3)  <- buttons live on View File
  //          ├ Cash Book (d3)         <- single column, cash only
  //          ├ Double Column Cash Book (d3)
  //          ├ Petty Cash Book (d3)
  //          ├ Sales Journal (d3)
  //          ├ Purchases Journal (d3)
  //          ├ Sales Returns (d3)
  //          ├ Purchases Returns (d3)
  //          ├ General Journal (d3)
  //          ├ Cash Receipts (d3)
  //          └ Cash Payments (d3)
  // d = depth. Each child sits exactly ONE letter inside its parent.
  var PAGES = [
    { label: "Home",             icon: "🏠", folder: "home",             n: 1,  d: 0 },
    { label: "Business",         icon: "🏢", folder: "business",         n: 2,  d: 1 },
    { label: "Add Transaction",  icon: "🧾", folder: "add-transaction",  n: 3,  d: 2 },
    { label: "View File",        icon: "📄", folder: "view-file",        n: 4,  d: 2 },
    { label: "All Transactions", icon: "📊", folder: "all-transactions", n: 5,  d: 3 },
    { label: "Cash Book",        icon: "📒", folder: "cash-book-single", n: 15, d: 3 },
    { label: "Double Column Cash Book", icon: "📕", folder: "cash-book", n: 6,  d: 3 },
    { label: "Petty Cash Book",  icon: "🪙", folder: "petty-cash",       n: 7,  d: 3 },
    { label: "Sales Journal",    icon: "🛍️", folder: "sales-journal",    n: 8,  d: 3 },
    { label: "Purchases Journal", icon: "🛒", folder: "purchases-journal", n: 9, d: 3 },
    { label: "Sales Returns",    icon: "↩️", folder: "sales-returns",    n: 10, d: 3 },
    { label: "Purchases Returns", icon: "↪️", folder: "purchases-returns", n: 11, d: 3 },
    { label: "General Journal",  icon: "📓", folder: "general-journal",  n: 12, d: 3 },
    { label: "Cash Receipts",    icon: "💵", folder: "cash-receipts",    n: 13, d: 3 },
    { label: "Cash Payments",    icon: "💸", folder: "cash-payments",    n: 14, d: 3 }
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

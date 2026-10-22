/* JAMALI — shared sidebar (all pages except index.html) */
(function () {

  // Address bar always shows the bare domain
  try { history.replaceState({}, "", "/"); } catch (e) {}

  // PAGES: bump n (n++) when a page gets a new version
  var PAGES = [
    { label: "Home",            icon: "🏠", folder: "home",            n: 1 },
    { label: "Business",        icon: "🏢", folder: "business",        n: 2 },
    { label: "Add Transaction", icon: "🧾", folder: "add-transaction", n: 3 },
    { label: "View File",       icon: "📄", folder: "view-file",       n: 4 }
  ];

  var current = location.pathname.split("/")[1]; // active folder from URL

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
    var active = p.folder === current ? " class=\"active\"" : "";
    return "<a href=\"" + href + "\"" + active + "><span>" + p.icon + "</span>" + p.label + "</a>";
  }).join("");

  var aside = document.createElement("aside");
  aside.id = "jamali-sidebar";
  aside.innerHTML = "<div class=\"brand\"><i>JA</i>JAMALI</div><nav>" + links + "</nav>";

  document.body.insertBefore(overlay, document.body.firstChild);
  document.body.insertBefore(aside, document.body.firstChild);
  document.body.insertBefore(burger, document.body.firstChild);
  document.body.classList.add("jamali-has-sidebar");
})();

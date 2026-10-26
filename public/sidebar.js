/* JAMALI — shared sidebar (every page except index.html).
   THE TWO IRON RULES (unchanged):
   - this file holds NO page data (the tree comes from menu.js)
   - this file calls NO file (no fetch, no import)
   Adding or moving a page is still ONE line in menu.js — never this file.
   NEW: the tree is COLLAPSIBLE. Any node whose menu entries go one level
   deeper gets a toggle: v opens its children, ^ closes them. Home and
   Business start open, deeper nodes (View File's big family) start closed,
   and the path to the page you are on is opened automatically. */
(function () {

  // Current folder — read BEFORE the address bar is cleaned, so the
  // active page can still be highlighted in the family tree
  var current = location.pathname.split("/")[1];

  // Address bar always shows the bare domain
  try { history.replaceState({}, "", "/"); } catch (e) {}

  // The family tree — provided by menu.js. This file holds no page data.
  var PAGES = window.JAMALI_MENU || [];

  // ---- collapsible tree helpers (children derived from the d values) ----

  // Direct children of entry i: the entries after i that sit exactly one
  // level deeper, stopping at the first entry at i's level or higher.
  function kidsOf(i) {
    var out = [], my = PAGES[i].d || 0;
    for (var j = i + 1; j < PAGES.length; j++) {
      var dj = PAGES[j].d || 0;
      if (dj <= my) break;
      if (dj === my + 1) out.push(j);
    }
    return out;
  }

  // Does this node's whole branch contain the page we are on?
  function subtreeHasCurrent(i) {
    if (PAGES[i].folder === current) return true;
    var k = kidsOf(i);
    for (var x = 0; x < k.length; x++) {
      if (subtreeHasCurrent(k[x])) return true;
    }
    return false;
  }

  // Render entry i and (if it has children) its collapsible kids box.
  function render(i) {
    var p = PAGES[i];
    var cls = "lv" + (p.d || 0);
    if (p.folder === current) cls += " active";
    var html = "<div class=\"node\"><a href=\"/" + p.folder + "/" + p.n +
               "\" class=\"" + cls + "\"><span>" + p.icon + "</span>" + p.label + "</a>";
    var k = kidsOf(i);
    if (k.length) {
      html += "<button type=\"button\" class=\"tg\" aria-expanded=\"false\"></button></div>";
      // default: shallow parents (Home, Business) open, deeper ones closed;
      // the active page's path is always opened
      var open = (p.d || 0) <= 1 || subtreeHasCurrent(i);
      html += "<div class=\"kids\"" + (open ? "" : " hidden") + ">";
      for (var x = 0; x < k.length; x++) html += render(k[x]);
      html += "</div>";
    } else {
      html += "</div>";
    }
    return html;
  }

  // Draw every top-level entry (d: 0), e.g. Home.
  var nav = "";
  for (var r = 0; r < PAGES.length; r++) {
    if ((PAGES[r].d || 0) === 0) nav += render(r);
  }
  if (nav === "") { // defensive: flat list if the menu has no depth at all
    for (var f = 0; f < PAGES.length; f++) nav += render(f);
  }

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
    "#jamali-sidebar .node{display:flex;align-items:stretch}",
    "#jamali-sidebar .node a{flex:1;min-width:0}",
    "#jamali-sidebar .tg{flex:0 0 30px;border:0;background:none;color:#64748b;",
    "font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;",
    "justify-content:center;padding:0}",
    "#jamali-sidebar .tg:hover{color:#fff}",
    "#jamali-sidebar .kids[hidden]{display:none}",
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

  var aside = document.createElement("aside");
  aside.id = "jamali-sidebar";
  aside.innerHTML = "<div class=\"brand\"><i>JA</i>JAMALI</div><nav>" + nav + "</nav>";

  document.body.insertBefore(overlay, document.body.firstChild);
  document.body.insertBefore(aside, document.body.firstChild);
  document.body.insertBefore(burger, document.body.firstChild);
  document.body.classList.add("jamali-has-sidebar");

  // ---- v / ^ toggles: v = children closed (click to open), ^ = open (click to close)
  function sync(btn) {
    var box = btn.parentNode.nextElementSibling;
    var open = !!(box && !box.hasAttribute("hidden"));
    btn.textContent = open ? "\u25B4" : "\u25BE"; // ^ : v
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  var tgs = aside.querySelectorAll(".tg");
  for (var t = 0; t < tgs.length; t++) {
    (function (btn) {
      sync(btn);
      btn.addEventListener("click", function () {
        var box = btn.parentNode.nextElementSibling;
        if (!box) return;
        if (box.hasAttribute("hidden")) { box.removeAttribute("hidden"); }
        else { box.setAttribute("hidden", ""); }
        sync(btn);
      });
    })(tgs[t]);
  }
})();

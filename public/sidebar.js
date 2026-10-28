/* JAMALI — shared sidebar (every page except index.html) — TASK 58 REWRITE.
   THE TWO IRON RULES (unchanged):
   - this file holds NO page data (the tree comes from menu.js)
   - this file fetches NO page data (the tree is built from menu.js only)
   Adding or moving a page is still ONE line in menu.js — never this file.
   The tree is COLLAPSIBLE: any node whose menu entries go one level deeper
   gets a toggle. Home and Business start open, deeper nodes start closed,
   and the path to the page you are on is opened automatically.

   THE TWO-KEY MODEL (task 56):
   - key to the HOUSE = the Google sign-in; keys to the ROOMS = the system
     account session (sessionStorage "JAMALI_SYSTEM_SESSION", written by the
     start page at account login).
   - this file renders the tree PER USER: administrators see everything;
     other accounts see only the folders granted to them (all hidden until
     the administrator grants access).
   - the PERSON ICON sits immediately to the right of JAMAL with a small
     space; clicking it opens the account menu: the user's name + Logout
     and Switch Account. Both return to the start page (Login / Create
     Account).
   - folder links whose area the session may not open (home page tiles,
     hub links, cross-page links) are hidden as well.

   TASK 57 — the Admin button:
   - when the administrator is logged in, a fixed "Admin" button sits at
     the top-right corner of every page and opens the Account
     Administration dashboard (/system-admin/380). Everyone else never
     sees it.

   TASK 58 — the session corrects itself:
   - a STALE session (the administrator changed the role, the grants or
     the display name after this browser last logged in) used to keep
     showing the old menu and the old buttons until the next manual login.
     Now, once per page, the sidebar quietly re-reads this browser's own
     account from the stored profile and, if anything changed, saves the
     corrected session and refreshes the page once. If nothing changed,
     nothing happens — no extra reads, no flicker.

   TASK 60 — the administrator controls what every page shows:
   - on every page the administrator sees a red dash "-" beside every
     input, select, textarea, button and section — and beside every
     sidebar entry. Clicking a dash hides that element from every
     non-administrator account; the administrator keeps seeing it, with
     the dash turning SOLID RED while the element is hidden for others.
   - hiding a PARENT hides its CHILDREN for users automatically: a
     hidden section hides all the fields and buttons inside it, and a
     hidden sidebar folder hides its whole branch — in the sidebar AND
     on the pages (opening a hidden page directly shows a notice).
   - normal users never see the dashes and never see hidden elements.
     What a user gets = granted in Users & Access MINUS what the
     administrator hid with the dashes.
   - the state lives in ONE Firestore document, systemPageConfig/visibility:
       { fields: { "<page-path>:<element-key>": true },
         menu:   { "<folder>": true } }
   - the state is read once per page; changes reach users on their next
     page load. Content a page renders later (new rows, extra buttons)
     gets its dashes and its hiding too, through a DOM observer. */
(function () {

  var SESSION_KEY = "JAMALI_SYSTEM_SESSION";
  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (e) { return null; }
  }
  function writeSession(s) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  var session = readSession();

  // Folders any account may open without a grant; system-admin is admin-only.
  var ALWAYS_OPEN = ["home", "account-recovery"];
  function folderAllowed(folder) {
    if (!session) return false;
    if (session.role === "admin") return true;
    if (folder === "system-admin") return false;
    if (ALWAYS_OPEN.indexOf(folder) !== -1) return true;
    return !!(session.grants && session.grants.indexOf(folder) !== -1);
  }

  // Current folder — read BEFORE the address bar is cleaned, so the
  // active page can still be highlighted in the family tree
  var current = location.pathname.split("/")[1];

  // TASK 60: the full page path (e.g. "victim-registration/322"), also
  // read BEFORE the address bar is cleaned — it keys the field hides.
  var PAGE_ID = location.pathname.replace(/^\//, "")
    .replace(/\.html$/, "").replace(/\/+$/, "");

  // Address bar always shows the bare domain
  try { history.replaceState({}, "", "/"); } catch (e) {}

  // The family tree — provided by menu.js. This file holds no page data.
  var PAGES = window.JAMALI_MENU || [];

  // ===================================================================
  // TASK 60 — visibility state: what the administrator hid from users
  // ===================================================================
  var VIS = { fields: {}, menu: {} };   // filled by bootVisibility()
  var VIS_DOC = ["systemPageConfig", "visibility"];

  function isAdmin() {
    return !!(session && session.role === "admin");
  }

  function bootVisibility() {
    return import("/firebase.js").then(function (fb) {
      return fb.getDoc(fb.doc(fb.db, VIS_DOC[0], VIS_DOC[1]));
    }).then(function (snap) {
      if (snap && snap.exists()) {
        var d = snap.data();
        VIS.fields = d.fields || {};
        VIS.menu = d.menu || {};
      }
    }).catch(function () {
      /* nothing readable — everything stays as the grants allow */
    });
  }

  // The folder chain of a menu area (its ancestors), e.g.
  // add-transaction -> business. d:0 entries (Home, Account
  // Administration) are never ancestors of a d:1+ folder.
  function chainOf(folder) {
    var out = [folder], idx = -1, myD = 0;
    for (var i = 0; i < PAGES.length; i++) {
      if (PAGES[i].folder === folder) { idx = i; myD = PAGES[i].d || 0; break; }
    }
    if (idx < 0 || myD <= 1) return out;
    for (var j = idx - 1; j >= 0; j--) {
      var d = PAGES[j].d || 0;
      if (d === 0) break;
      if (d < myD) { out.unshift(PAGES[j].folder); myD = d; if (d === 1) break; }
    }
    return out;
  }

  // Is this folder — or one of its ancestors — hidden by the administrator?
  function menuHidden(folder) {
    var c = chainOf(folder);
    for (var i = 0; i < c.length; i++) {
      if (VIS.menu[c[i]]) return true;
    }
    return false;
  }

  // A user may open a folder when it is granted AND not hidden (task 60).
  function userFolderOpen(folder) {
    return folderAllowed(folder) && !menuHidden(folder);
  }

  // Hide entries the session may not open, BEFORE the tree is drawn:
  // an ungranted parent hides its whole branch.
  var visible = PAGES.map(function (p) { return folderAllowed(p.folder); });
  for (var v = 0; v < PAGES.length; v++) {
    if (visible[v]) continue;
    var my = PAGES[v].d || 0;
    for (var w = v + 1; w < PAGES.length; w++) {
      if ((PAGES[w].d || 0) <= my) break;
      visible[w] = false; // children of a hidden node stay hidden
    }
  }

  // ---- collapsible tree helpers (children derived from the d values) ----

  // Direct children of entry i: the entries after i that sit exactly one
  // level deeper, stopping at the first entry at i's level or higher.
  function kidsOf(i) {
    var out = [], my = PAGES[i].d || 0;
    for (var j = i + 1; j < PAGES.length; j++) {
      var dj = PAGES[j].d || 0;
      if (dj <= my) break;
      if (dj === my + 1 && visible[j]) out.push(j);
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
    var html = "<div class=\"node\" data-folder=\"" + p.folder + "\"><a href=\"/" + p.folder + "/" + p.n +
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

  // Draw every visible top-level entry (d: 0), e.g. Home.
  var nav = "";
  for (var r = 0; r < PAGES.length; r++) {
    if ((PAGES[r].d || 0) === 0 && visible[r]) nav += render(r);
  }
  if (nav === "") { // defensive: flat list if the menu has no depth at all
    for (var f = 0; f < PAGES.length; f++) { if (visible[f]) nav += render(f); }
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
    "#jamali-person{margin-left:2px;border:0;background:none;color:#94a3b8;font-size:19px;",
    "cursor:pointer;line-height:1;padding:2px 3px;border-radius:8px}",
    "#jamali-person:hover{background:#1e293b;color:#fff}",
    "#jamali-acct{position:absolute;top:56px;left:14px;background:#111827;border:1px solid #334155;",
    "border-radius:12px;min-width:180px;box-shadow:0 14px 34px rgba(0,0,0,.5);overflow:hidden;z-index:1002}",
    "#jamali-acct .who{padding:10px 14px;font-size:12px;color:#94a3b8;border-bottom:1px solid #1e293b}",
    "#jamali-acct .who b{display:block;color:#e2e8f0;font-size:13px;white-space:nowrap;",
    "overflow:hidden;text-overflow:ellipsis}",
    "#jamali-acct button{display:block;width:100%;text-align:left;border:0;background:none;",
    "color:#e2e8f0;font-size:13.5px;padding:10px 14px;cursor:pointer}",
    "#jamali-acct button:hover{background:#1e293b}",
    "#jamali-admin-btn{position:fixed;top:14px;right:14px;z-index:1001;border:0;border-radius:12px;",
    "padding:9px 18px;font-size:13.5px;font-weight:800;cursor:pointer;color:#06121f;",
    "background:linear-gradient(135deg,#38bdf8,#0ea5e9);box-shadow:0 10px 24px rgba(0,0,0,.35)}",
    "#jamali-admin-btn:hover{filter:brightness(1.07)}",
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
    " body.jamali-sidebar-open #jamali-overlay{display:block}}",
    ".jamali-dash{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;",
    "padding:0 5px;margin:0 0 0 6px;border-radius:6px;border:1px solid #fca5a5;background:#fff;",
    "color:#dc2626;font-weight:900;font-size:13px;line-height:1;cursor:pointer;flex:0 0 auto;",
    "vertical-align:middle}",
    ".jamali-dash:hover{background:#fee2e2}",
    ".jamali-dash.jamali-off{background:#dc2626;color:#fff;border-color:#b91c1c}",
    ".jamali-vis-mark{outline:2px dashed #f87171;outline-offset:2px}",
    "#jamali-sidebar .jamali-dash{margin:0 6px}",
    ".jamali-vis-notice{max-width:560px;margin:60px auto;padding:26px 30px;border:1px solid #fca5a5;",
    "border-radius:14px;background:#fff5f5;color:#7f1d1d;font-size:15px;line-height:1.6}",
    ".jamali-vis-notice b{display:block;font-size:17px;margin-bottom:8px}"
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

  // brand: JAMAL first, then the person icon immediately to its right with
  // a small space (task 56). The icon opens the account menu.
  var aside = document.createElement("aside");
  aside.id = "jamali-sidebar";
  aside.innerHTML =
    "<div class=\"brand\"><i>JA</i>JAMAL" +
    "<button type=\"button\" id=\"jamali-person\" title=\"Account\">&#128100;</button></div>" +
    "<nav>" + nav + "</nav>";

  document.body.insertBefore(overlay, document.body.firstChild);
  document.body.insertBefore(aside, document.body.firstChild);
  document.body.insertBefore(burger, document.body.firstChild);
  document.body.classList.add("jamali-has-sidebar");

  // ---- account menu: name + Logout + Switch Account (task 56) ----------------
  var who = session ? (session.username || "account") : "account";
  var roleLine = session ? (session.role === "admin" ? "administrator" : (session.position || "user")) : "";
  var acct = document.createElement("div");
  acct.id = "jamali-acct";
  acct.hidden = true;
  acct.innerHTML =
    "<div class=\"who\"><b></b>" + roleLine + "</div>" +
    "<button type=\"button\" id=\"jamali-switch\">Switch Account</button>" +
    "<button type=\"button\" id=\"jamali-logout\">Logout</button>";
  acct.querySelector(".who b").textContent = who;
  document.body.insertBefore(acct, document.body.firstChild);

  document.getElementById("jamali-person").addEventListener("click", function (ev) {
    ev.stopPropagation();
    acct.hidden = !acct.hidden;
  });
  document.addEventListener("click", function (ev) {
    if (!acct.hidden && ev.target !== acct && !acct.contains(ev.target)) acct.hidden = true;
  });

  // Switch Account: drop the room keys, keep the house key, back to the start.
  document.getElementById("jamali-switch").addEventListener("click", function () {
    clearSession();
    location.href = "/";
  });

  // Logout: drop the room keys AND the house key — full sign-out.
  document.getElementById("jamali-logout").addEventListener("click", function () {
    clearSession();
    import("/firebase.js").then(function (fb) {
      return fb.signOut(fb.auth);
    }).then(function () {
      location.href = "/";
    }).catch(function () {
      location.href = "/";
    });
  });

  // ---- TASK 57: the Admin button — top-right corner of every page, -----------
  // ---- administrators only. Opens the Account Administration dashboard.
  function ensureAdminBtn() {
    if (document.getElementById("jamali-admin-btn")) return;
    var abtn = document.createElement("button");
    abtn.id = "jamali-admin-btn";
    abtn.type = "button";
    abtn.textContent = "Admin";
    abtn.title = "Account Administration";
    abtn.addEventListener("click", function () {
      location.href = "/system-admin/380";
    });
    document.body.appendChild(abtn);
  }
  if (session && session.role === "admin") {
    ensureAdminBtn();
  }

  // ---- TASK 58: the session corrects itself against the stored account -------
  // One quiet read per page. If the stored account changed since this browser
  // last logged in (role, grants, name, position), the corrected session is
  // saved and the page refreshes once; the fresh render is then correct.
  if (session && session.username) {
    import("/firebase.js").then(function (fb) {
      var uid = fb.auth && fb.auth.currentUser;
      var ready = uid
        ? Promise.resolve(uid)
        : new Promise(function (res) {
            var off = fb.onAuthStateChanged(fb.auth, function (u) { off(); res(u); });
          });
      return ready.then(function (u) {
        if (!u) return null;
        var id = String(session.username || "").toLowerCase();
        return fb.getDoc(fb.doc(fb.db, "systemAccounts", id));
      });
    }).then(function (snap) {
      if (!snap || !snap.exists()) return;
      var a = snap.data();
      var next = {
        uid: session.uid,
        username: a.usernameDisplay || session.username,
        position: a.position || "",
        role: a.role || "user",
        grants: Array.isArray(a.grants) ? a.grants : [],
        at: session.at
      };
      var same = next.username === session.username &&
                 next.role === session.role &&
                 next.position === (session.position || "") &&
                 JSON.stringify(next.grants) === JSON.stringify(session.grants || []);
      if (!same) {
        writeSession(next);
        location.reload(); // one refresh; the next render reads the new session
      }
    }).catch(function () {
      /* a hiccup never breaks the page — the cached session stays */
    });
  }

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

  // ---- hide folder links the session may not open (tiles, hub links, etc.) --
  // Runs after the page content exists; also covers links rendered later by
  // listening once for DOM additions.
  function filterLinks(root) {
    var links = (root || document).querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      var m = href.match(/^\/([a-z0-9-]+)\//i);
      if (!m) continue;
      if (m[1] === current) continue;                    // the page you are on
      if (!folderAllowed(m[1]) || (!isAdmin() && menuHidden(m[1]))) links[i].style.display = "none";
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { filterLinks(document); });
  } else {
    filterLinks(document);
  }

  // ===================================================================
  // TASK 60 — engine wiring: once the visibility state has been read,
  // adjust the sidebar and hand the page to the admin / user engine.
  // ===================================================================
  bootVisibility().then(function () {
    applySidebarVis();
    pageBoot();
  });

  // ---- sidebar: users lose the hidden branches, admin gets the dashes --
  function applySidebarVis() {
    var nodes = document.querySelectorAll("#jamali-sidebar .node[data-folder]");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var f = node.getAttribute("data-folder");
      if (isAdmin()) {
        injectNodeDash(node, f);
      } else if (menuHidden(f)) {
        node.style.display = "none";
        var nx = node.nextElementSibling;
        if (nx && nx.classList && nx.classList.contains("kids")) nx.style.display = "none";
      }
    }
  }

  function injectNodeDash(node, folder) {
    if (node.querySelector(".jamali-dash")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "jamali-dash";
    b.textContent = "-";
    setDashState(b, menuHidden(folder), "this menu area");
    b.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      toggleMenuHide(folder, b);
    });
    var tg = node.querySelector(".tg");
    if (tg) node.insertBefore(b, tg); else node.appendChild(b);
  }

  function setDashState(b, off, what) {
    b.classList.toggle("jamali-off", !!off);
    b.title = off
      ? "Hidden from users - click to show " + what
      : "Visible to users - click to hide " + what;
  }

  function saveVisibility() {
    return import("/firebase.js").then(function (fb) {
      return fb.setDoc(fb.doc(fb.db, VIS_DOC[0], VIS_DOC[1]), {
        scope: "visibility",
        fields: VIS.fields,
        menu: VIS.menu,
        updatedBy: (session && session.username) || "",
        updatedAt: fb.serverTimestamp()
      });
    });
  }

  function toggleMenuHide(folder, btn) {
    import("/firebase.js").then(function (fb) {
      return fb.getDoc(fb.doc(fb.db, VIS_DOC[0], VIS_DOC[1])).then(function (snap) {
        var d = snap.exists() ? snap.data() : {};
        VIS.menu = d.menu || {};
        VIS.fields = d.fields || {};
        if (VIS.menu[folder]) delete VIS.menu[folder]; else VIS.menu[folder] = true;
        return saveVisibility();
      });
    }).then(function () {
      setDashState(btn, menuHidden(folder), "this menu area");
    }).catch(function (e) {
      console.warn("visibility save failed", e);
      dashError(btn);
    });
  }

  function dashError(b) {
    b.textContent = "!";
    setTimeout(function () { b.textContent = "-"; }, 1500);
  }

  // ---- the page itself: admin sees dashes, users get the hides ---------
  function pageBoot() {
    if (!PAGE_ID) return;
    var main = document.getElementById("app") || document.body;
    var run = function () {
      if (isAdmin()) {
        scanAdminPage(main);
        watchPage(main, function () { scanAdminPage(main); });
      } else {
        guardUserPage(main);
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run);
    } else {
      run();
    }
  }

  // ---- users: block a page the administrator hid, apply the hides ------
  function guardUserPage(main) {
    if (menuHidden(current)) { blockPage(); return; }
    if (!folderAllowed(current) && ALWAYS_OPEN.indexOf(current) === -1) { blockPage(); return; }
    applyUserHides(main);
    watchPage(main, function () { applyUserHides(main); });
  }

  function blockPage() {
    var app = document.getElementById("app");
    if (app) {
      app.style.display = "none";
    } else {
      var kids = Array.prototype.slice.call(document.body.children);
      for (var i = 0; i < kids.length; i++) {
        var id = kids[i].id || "";
        if (id.indexOf("jamali-") === 0) continue;
        kids[i].style.display = "none";
      }
    }
    var n = document.createElement("div");
    n.className = "jamali-vis-notice";
    n.innerHTML = "<b>This page is not available for your account.</b>" +
      "<span>It was hidden by the administrator or your account does not include it. " +
      "Use the menu on the left, or ask the administrator to grant you access.</span>";
    document.body.appendChild(n);
  }

  // ---- element keys: stable across visits ------------------------------
  // id when the element has one, else a slug of its own text, else a
  // generated tag. Keys are stored per page: "<page-path>:<key>".
  function slug(text) {
    return String(text || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 40);
  }

  function insideJamaliUi(el) {
    return !!(el.closest && el.closest("#jamali-sidebar,#jamali-acct,#jamali-admin-btn,#jamali-burger,#jamali-overlay,.jamali-vis-notice"));
  }

  function isVisibleEl(el) {
    if (el.closest && el.closest("[hidden]")) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  // Every hide-able target on this page: field rows (label-wrapped
  // controls), buttons, and section containers (section/fieldset/.card).
  // A section target is the PARENT of its contents — hiding it hides
  // everything inside it for the users (the DOM does the cascading).
  function scanTargets(root) {
    var map = {}, seq = 0;
    function put(key, el, wrap) {
      if (!key || map[key]) return;
      map[key] = { el: el, wrap: wrap || null, dash: null };
    }
    var ctrls = root.querySelectorAll("input, select, textarea");
    for (var i = 0; i < ctrls.length; i++) {
      var c = ctrls[i];
      if (c.type === "hidden" || insideJamaliUi(c) || !isVisibleEl(c)) continue;
      var row = c.closest ? c.closest("label") : null;
      if (row && !insideJamaliUi(row)) {
        // a row holding several controls hides control-by-control
        var multi = row.querySelectorAll("input,select,textarea,button").length > 1;
        put(c.id || ("row-" + (slug(row.textContent) || ("x" + (++seq)))), c, multi ? null : row);
      } else {
        put(c.id || ("row-" + (slug(c.name || c.type) || ("x" + (++seq)))), c, null);
      }
    }
    var btns = root.querySelectorAll("button");
    for (var j = 0; j < btns.length; j++) {
      var b = btns[j];
      if (b.classList.contains("jamali-dash") || b.classList.contains("tg")) continue;
      if (insideJamaliUi(b) || !isVisibleEl(b)) continue;
      put(b.id || ("btn-" + (slug(b.textContent) || ("x" + (++seq)))), b, null);
    }
    var secs = root.querySelectorAll("section, fieldset, .card");
    for (var k = 0; k < secs.length; k++) {
      var s = secs[k];
      if (insideJamaliUi(s) || !isVisibleEl(s)) continue;
      var h = s.querySelector("h1,h2,h3,h4");
      var skey = s.id || ("sec-" + (slug(h && h.textContent) || ("x" + (++seq))));
      s.setAttribute("data-jamali-key", skey);
      put(skey, s, null);
    }
    return map;
  }

  function fieldsForPage() {
    var out = {}, prefix = PAGE_ID + ":";
    for (var k in VIS.fields) {
      if (Object.prototype.hasOwnProperty.call(VIS.fields, k) && k.indexOf(prefix) === 0) {
        out[k.slice(prefix.length)] = true;
      }
    }
    return out;
  }

  function applyUserHides(root) {
    var map = scanTargets(root);
    var hidden = fieldsForPage();
    for (var key in map) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
      if (!hidden[key]) continue;
      var el = map[key].wrap || map[key].el;
      if (el && el.style) el.style.display = "none";
    }
  }

  // ---- administrator: a dash on everything, marked live -----------------
  function scanAdminPage(root) {
    var map = scanTargets(root);
    var hidden = fieldsForPage();
    for (var key in map) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
      var t = map[key];
      if (!t.dash) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "jamali-dash";
        b.textContent = "-";
        b.addEventListener("click", makeToggler(key, b));
        placeDash(t, b);
        t.dash = b;
      }
      setDashState(t.dash, effHidden(key, t.el, hidden), key);
    }
  }

  // hidden directly, or hidden because a parent section is hidden
  function effHidden(key, el, hidden) {
    if (hidden[key]) return true;
    var p = el ? el.parentElement : null;
    while (p && p !== document.body) {
      var k = p.getAttribute && p.getAttribute("data-jamali-key");
      if (k && hidden[k]) return true;
      p = p.parentElement;
    }
    return false;
  }

  function placeDash(t, b) {
    var el = t.el;
    if (t.wrap) { t.wrap.appendChild(b); return; }
    if (el.tagName === "SECTION" || el.tagName === "FIELDSET" || el.classList.contains("card")) {
      var h = el.querySelector("h1,h2,h3,h4");
      if (h && h.parentNode === el) { h.insertAdjacentElement("afterend", b); return; }
      el.insertBefore(b, el.firstChild);
      return;
    }
    el.insertAdjacentElement("afterend", b);
  }

  function makeToggler(key, btn) {
    return function () {
      import("/firebase.js").then(function (fb) {
        return fb.getDoc(fb.doc(fb.db, VIS_DOC[0], VIS_DOC[1])).then(function (snap) {
          var d = snap.exists() ? snap.data() : {};
          VIS.fields = d.fields || {};
          VIS.menu = d.menu || {};
          var full = PAGE_ID + ":" + key;
          if (VIS.fields[full]) delete VIS.fields[full]; else VIS.fields[full] = true;
          return saveVisibility();
        });
      }).then(function () {
        scanAdminPage(document.getElementById("app") || document.body);
      }).catch(function (e) {
        console.warn("visibility save failed", e);
        dashError(btn);
      });
    };
  }

  // content a page renders later (new rows, extra buttons) gets its
  // dashes and its hiding too
  function watchPage(root, fn) {
    if (!window.MutationObserver) return;
    var t = null;
    new MutationObserver(function () {
      if (t) clearTimeout(t);
      t = setTimeout(fn, 350);
    }).observe(root, { childList: true, subtree: true });
  }
})();

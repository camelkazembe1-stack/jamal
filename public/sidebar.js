/* JAMALI — shared sidebar (every page except index.html) — TASK 63.

   TASK 63 — THE DASH IS FOR BUTTONS AND INPUT FIELDS ONLY:
   - the red "-" chip now appears ONLY on buttons and on input / select /
     textarea fields (each with its label row) — NEVER on tiles, link
     cards, sections or the page itself, and NEVER on the Account
     Administration page (the administrator's own controls — the module
     strip, the user tables, the save buttons — must stay untouchable).
     Which AREAS and PAGES an account sees is decided by the module
     selection (the per-user grants), not by dashes.

   TASK 62 — the dash became a CORNER chip and hiding became TOTAL:
   - every dash sits at the TOP-RIGHT CORNER of its own button or field
     row (never floating beside it any more);
   - clicking the dash makes the element DISAPPEAR COMPLETELY — for the
     users AND for the administrator (no strike-through, no dimming, no
     half-visible leftovers — the exact "remove all abnormalities" ask);
   - what the dashes hid is listed in the red "Hidden (N)" chip at the
     bottom-right corner (administrator only): open it, press Show next to
     an entry (or Show all) and the element is back everywhere;
   - an approved account with NO modules yet sees exactly
     "Please wait for admin module allowance." instead of any page —
     the administrator decides what that account will see.
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
   - TASK 60B: the red dash "-" lives on the PAGES ONLY — beside every
     input, select, textarea, button and section, one PAGE dash per page
     (pinned to the bottom-right corner) and one dash per home tile.
     The sidebar stays CLEAN: no dashes there, for anyone.
   - clicking a dash hides that element from every non-administrator
     account; the administrator keeps seeing it, with the dash turning
     SOLID RED while the element is hidden for others.
   - hiding a PARENT hides its CHILDREN for users automatically: a
     hidden section hides all the fields and buttons inside it, and a
     hidden tile (Business / Computer / Health) hides the whole folder
     branch — in the sidebar AND on the pages (opening a hidden page
     directly shows a notice). The PAGE dash hides the whole page: the
     notice replaces it and its sidebar entry disappears for users.
   - the administrator's sidebar keeps the FULL tree with hidden entries
     struck through (never dashes); users never see hidden entries.
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
  var DASHES = {};   // TASK 60B: one dash per key — reused across scans, never duplicated

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

  // TASK 60B: the page id behind a sidebar entry, e.g. business -> "business/2"
  function pageIdOfFolder(folder) {
    for (var i = 0; i < PAGES.length; i++) {
      if (PAGES[i].folder === folder) return folder + "/" + PAGES[i].n;
    }
    return null;
  }

  // TASK 60B: the page-level hide (the PAGE dash stores "<page>:__page__")
  function pageHidden(pid) {
    return !!(pid && VIS.fields[pid + ":__page__"]);
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
    ".jamali-dash{display:inline-flex;align-items:center;justify-content:center;width:20px;",
    "min-width:20px;max-width:20px;height:20px;box-sizing:border-box;padding:0;",
    "margin:0;border-radius:6px;border:1px solid #fca5a5;background:#fff;",
    "color:#dc2626;font-weight:900;font-size:13px;line-height:1;cursor:pointer}",
    ".jamali-dash:hover{background:#fee2e2}",
    ".jamali-dash.jamali-off{background:#dc2626;color:#fff;border-color:#b91c1c}",
    ".jamali-vis-mark{outline:2px dashed #f87171;outline-offset:2px}",
    ".jamali-vis-host{position:relative}",
    ".jamali-ctl-host{display:inline-block;position:relative;max-width:100%}",
    ".jamali-corner-dash{position:absolute;top:3px;right:3px;margin:0;z-index:7;",
    "width:16px;min-width:16px;max-width:16px;height:16px;font-size:11px;border-radius:5px}",
    "#jamali-hidden-chip{position:fixed;bottom:46px;right:14px;z-index:1001;",
    "border:1px solid #fca5a5;border-radius:999px;background:#dc2626;color:#fff;",
    "font-weight:800;font-size:12px;padding:7px 12px;cursor:pointer;",
    "box-shadow:0 10px 24px rgba(0,0,0,.35)}",
    "#jamali-hidden-chip:hover{filter:brightness(1.08)}",
    "#jamali-vis-panel{position:fixed;bottom:84px;right:14px;z-index:1002;width:340px;",
    "max-width:calc(100vw - 28px);max-height:60vh;overflow:auto;background:#111827;",
    "border:1px solid #334155;border-radius:12px;padding:12px 14px;font-size:13px;",
    "color:#e2e8f0;box-shadow:0 18px 40px rgba(0,0,0,.5)}",
    "#jamali-vis-panel b{display:block;margin-bottom:8px;font-size:13px}",
    "#jamali-vis-panel .jamali-vis-row{display:flex;align-items:center;justify-content:space-between;",
    "gap:8px;padding:6px 0;border-bottom:1px solid #1e293b}",
    "#jamali-vis-panel .jamali-vis-row span{flex:1;min-width:0;overflow:hidden;",
    "text-overflow:ellipsis;white-space:nowrap}",
    ".jamali-vis-show,.jamali-vis-showall{border:1px solid #4ade80;background:#052e16;",
    "color:#4ade80;border-radius:8px;font-size:12px;font-weight:800;padding:4px 10px;",
    "cursor:pointer;flex:0 0 auto}",
    ".jamali-vis-showall{margin-top:10px;width:100%}",
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
      if (!folderAllowed(m[1])) { links[i].style.display = "none"; continue; }
      // TASK 62: a hidden target page hides its links for EVERYONE — the
      // administrator included (the Hidden panel brings the page back).
      var rest = href.slice(m[0].length).replace(/\.html$/, "").replace(/\/+$/, "");
      if (menuHidden(m[1]) || pageHidden(m[1] + "/" + rest)) links[i].style.display = "none";
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
    if (isAdmin()) { ensureHiddenChip(); ensureVisPanel(); refreshHiddenChip(); }
    pageBoot();
  });

  // ===================================================================
  // TASK 62 — the Hidden panel: everything the dashes hid, in one list.
  // Hidden means GONE for everyone — so the administrator needs one place
  // that still knows what was hidden and brings any of it back.
  // ===================================================================
  function hiddenItems() {
    var out = [];
    for (var k in VIS.menu) {
      if (Object.prototype.hasOwnProperty.call(VIS.menu, k) && VIS.menu[k]) {
        out.push({ kind: "menu", key: k });
      }
    }
    for (var f in VIS.fields) {
      if (Object.prototype.hasOwnProperty.call(VIS.fields, f) && VIS.fields[f]) {
        out.push({ kind: "field", key: f });
      }
    }
    return out;
  }

  function hiddenLabel(it) {
    if (it.kind === "menu") return "Area: " + it.key;
    var i = it.key.indexOf(":");
    var page = it.key.slice(0, i), k = it.key.slice(i + 1);
    return k === "__page__" ? ("Page: " + page) : (k + " — " + page);
  }

  function ensureHiddenChip() {
    if (document.getElementById("jamali-hidden-chip")) return;
    var c = document.createElement("button");
    c.type = "button";
    c.id = "jamali-hidden-chip";
    c.hidden = true;
    c.title = "Everything the dashes hid — click to restore any of it";
    c.addEventListener("click", function () {
      var p = document.getElementById("jamali-vis-panel");
      if (!p) return;
      p.hidden = !p.hidden;
      if (!p.hidden) renderHiddenPanel();
    });
    document.body.appendChild(c);
  }

  function ensureVisPanel() {
    if (document.getElementById("jamali-vis-panel")) return;
    var p = document.createElement("div");
    p.id = "jamali-vis-panel";
    p.hidden = true;
    document.body.appendChild(p);
  }

  function refreshHiddenChip() {
    if (!isAdmin()) return;
    ensureHiddenChip();
    var c = document.getElementById("jamali-hidden-chip");
    var n = hiddenItems().length;
    c.hidden = n === 0;
    c.textContent = "Hidden (" + n + ")";
    var p = document.getElementById("jamali-vis-panel");
    if (p && !p.hidden) renderHiddenPanel();
  }

  function renderHiddenPanel() {
    var p = document.getElementById("jamali-vis-panel");
    if (!p) return;
    var items = hiddenItems();
    p.innerHTML = "";
    var h = document.createElement("b");
    h.textContent = "Hidden by the administrator";
    p.appendChild(h);
    if (!items.length) {
      var e = document.createElement("div");
      e.className = "jamali-vis-row";
      e.textContent = "Nothing is hidden.";
      p.appendChild(e);
      return;
    }
    for (var i = 0; i < items.length; i++) {
      (function (it) {
        var row = document.createElement("div");
        row.className = "jamali-vis-row";
        var s = document.createElement("span");
        s.textContent = hiddenLabel(it);
        var b = document.createElement("button");
        b.type = "button";
        b.className = "jamali-vis-show";
        b.textContent = "Show";
        b.addEventListener("click", function () { restoreItem(it); });
        row.appendChild(s);
        row.appendChild(b);
        p.appendChild(row);
      })(items[i]);
    }
    var all = document.createElement("button");
    all.type = "button";
    all.className = "jamali-vis-showall";
    all.textContent = "Show all";
    all.addEventListener("click", showAllHidden);
    p.appendChild(all);
  }

  // hidden elements carry data-jamali-gone — clear the marks BEFORE the
  // rescan, or the scan could never see (and re-judge) them again
  function clearGoneMarks() {
    var gones = document.querySelectorAll("[data-jamali-gone]");
    for (var g = 0; g < gones.length; g++) {
      gones[g].removeAttribute("data-jamali-gone");
      gones[g].style.display = "";
    }
  }

  function restoreItem(it) {
    import("/firebase.js").then(function (fb) {
      return fb.getDoc(fb.doc(fb.db, VIS_DOC[0], VIS_DOC[1])).then(function (snap) {
        var d = snap.exists() ? snap.data() : {};
        VIS.fields = d.fields || {};
        VIS.menu = d.menu || {};
        if (it.kind === "menu") delete VIS.menu[it.key];
        else delete VIS.fields[it.key];
        return saveVisibility();
      });
    }).then(function () {
      clearGoneMarks();
      afterVisChange();
      var p = document.getElementById("jamali-vis-panel");
      if (p && !p.hidden) renderHiddenPanel();
    }).catch(function (e) {
      console.warn("restore failed", e);
    });
  }

  function showAllHidden() {
    import("/firebase.js").then(function (fb) {
      return fb.getDoc(fb.doc(fb.db, VIS_DOC[0], VIS_DOC[1])).then(function () {
        VIS.fields = {};
        VIS.menu = {};
        return saveVisibility();
      });
    }).then(function () {
      clearGoneMarks();
      afterVisChange();
      renderHiddenPanel();
    }).catch(function (e) {
      console.warn("restore all failed", e);
    });
  }

  // ---- sidebar: hidden branches leave for EVERYONE (TASK 62) ------------
  // NO dashes in the sidebar — never, for anyone. A hidden area or page is
  // GONE from the tree for the users AND for the administrator — there is
  // no strike-through, no dimming (task 60B's half-visible state is gone).
  // The administrator restores branches from the Hidden panel.
  function applySidebarVis() {
    var nodes = document.querySelectorAll("#jamali-sidebar .node[data-folder]");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var f = node.getAttribute("data-folder");
      var gone = menuHidden(f) || pageHidden(pageIdOfFolder(f));
      node.style.display = gone ? "none" : "";
      if (gone) {
        var nx = node.nextElementSibling;
        if (nx && nx.classList && nx.classList.contains("kids")) nx.style.display = "none";
      }
    }
    // a folder whose every child is hidden must not keep a dead arrow
    var tgl = document.querySelectorAll("#jamali-sidebar .tg");
    for (var j = 0; j < tgl.length; j++) {
      var box = tgl[j].parentNode.nextElementSibling;
      if (!box || !box.classList || !box.classList.contains("kids")) continue;
      var rows = box.querySelectorAll(".node");
      var alive = 0;
      for (var r = 0; r < rows.length; r++) { if (isVisibleEl(rows[r])) alive++; }
      if (!alive) {
        tgl[j].style.display = "none";
        box.style.display = "none";
      } else {
        tgl[j].style.display = "";
        box.style.display = "";
      }
    }
  }

  function setDashState(b, off, what) {
    b.classList.toggle("jamali-off", !!off);
    b.title = off
      ? "Hidden — restore it from the Hidden panel (bottom-right)"
      : "Click to hide " + what + " completely (restore from the Hidden panel)";
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

  function dashError(b) {
    b.textContent = "!";
    setTimeout(function () { b.textContent = "-"; }, 1500);
  }

  // ---- the page itself: admin sees dashes, users get the hides ---------
  function mainEl() {
    return document.getElementById("app") || document.querySelector("main") || document.body;
  }

  function pageBoot() {
    if (!PAGE_ID) return;
    // TASK 63: the Account Administration page carries NO dashes — the
    // administrator's own controls (the module strip, the user tables,
    // the save buttons) must never be hideable, not even by accident.
    if (current === "system-admin") return;
    var main = mainEl();
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
  // TASK 62: an APPROVED account the administrator has not allowed any
  // module for yet sees the allowance gate instead of any page — the
  // administrator decides what that account will see, nothing is default.
  function hasAnyGrant() {
    return !!(session && Array.isArray(session.grants) && session.grants.length);
  }

  function guardUserPage(main) {
    if (menuHidden(current) || pageHidden(PAGE_ID)) { blockPage(); return; }
    if (current !== "account-recovery" && !hasAnyGrant()) { blockAllowance(); return; }
    if (!folderAllowed(current) && ALWAYS_OPEN.indexOf(current) === -1) { blockPage(); return; }
    applyUserHides(main);
    watchPage(main, function () { applyUserHides(main); });
  }

  function blockAllowance() {
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
    n.innerHTML = "<b>Please wait for admin module allowance.</b>" +
      "<span>Your account is approved, but the administrator has not allowed any module for it yet. " +
      "You will see your modules here as soon as the administrator selects them for you.</span>";
    document.body.appendChild(n);
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
    return !!(el.closest && el.closest("#jamali-sidebar,#jamali-acct,#jamali-admin-btn,#jamali-burger,#jamali-overlay,.jamali-vis-notice,#jamali-hidden-chip,#jamali-vis-panel"));
  }

  function isVisibleEl(el) {
    if (el.closest && el.closest("[hidden]")) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  // TASK 63: the ONLY dash targets left — buttons and input fields
  // (input / select / textarea, each with its label row). Tiles, link
  // cards, sections and the page itself are NO LONGER targets: which
  // areas and pages an account sees is the module selection's job (the
  // per-user grants on the Account Administration page), not the dash's.
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

  // ---- administrator: a dash on every BUTTON and INPUT FIELD, marked live
  // Dashes live in the DASHES registry and are REUSED across scans — the
  // observer re-runs this function, but a dash is created and inserted
  // exactly once (no duplicates, no pile-up).
  // TASK 62: a hidden element is GONE for the administrator too — the
  // element gets display:none and its dash disappears with it; the red
  // "Hidden (N)" panel at the bottom-right brings anything back.
  // TASK 63: buttons and input fields ONLY — no tiles, no link cards,
  // no sections, no page dash, and never on the Account Administration
  // page (pageBoot skips system-admin entirely).
  function scanAdminPage(root) {
    var map = scanTargets(root);
    var hidden = fieldsForPage();
    for (var key in map) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
      var t = map[key];
      var hid = effHidden(key, t.el, hidden);
      var host = t.wrap || t.el;
      if (host && host.style) {
        if (hid) {
          host.setAttribute("data-jamali-gone", "1");
          host.style.display = "none";
        } else if (host.getAttribute("data-jamali-gone")) {
          host.removeAttribute("data-jamali-gone");
          host.style.display = "";
        }
      }
      var b = DASHES[key];
      if (!b || !document.documentElement.contains(b)) {
        b = document.createElement("button");
        b.type = "button";
        b.className = "jamali-dash";
        b.textContent = "-";
        (function (k, bb) {
          bb.addEventListener("click", function (ev) {
            ev.preventDefault();   // a dash inside a button/label must
            ev.stopPropagation();  // never trigger the host itself
            makeToggler(k, bb)();
          });
        })(key, b);
        placeDash(t, b);
        DASHES[key] = b;
      }
      t.dash = b;
      setDashState(b, hid, key);
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
    if (b.parentNode) return;   // a dash is inserted exactly once
    // TASK 62: EVERY dash sits at the TOP-RIGHT CORNER of its own target —
    // button or field row — never floating beside it.
    var host = t.wrap || t.el;
    var tag = host.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
      // a void control cannot hold children — wrap it first
      var sp = document.createElement("span");
      sp.className = "jamali-ctl-host";
      host.parentNode.insertBefore(sp, host);
      sp.appendChild(host);
      sp.appendChild(b);
      return;
    }
    host.classList.add("jamali-vis-host");
    b.classList.add("jamali-corner-dash");
    host.insertBefore(b, host.firstChild);
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
        afterVisChange();
      }).catch(function (e) {
        console.warn("visibility save failed", e);
        dashError(btn);
      });
    };
  }

  // TASK 62: every state change funnels through here — the sidebar, the
  // page scan and the Hidden panel all repaint from the same state.
  function afterVisChange() {
    applySidebarVis();
    scanAdminPage(mainEl());
    refreshHiddenChip();
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

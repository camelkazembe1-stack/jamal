
 
(function () {

 var SESSION_KEY = "JAMALI_SYSTEM_SESSION";
 function readSession() {
   try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ||
"null"); }
   catch (e) { return null; }
 }
 function writeSession(s) {
   try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
catch (e) {}
 }
 function clearSession() {
   try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
 }

 var session = readSession();

 var MODE_KEY = "JAMALI_SYSTEM_MODE";
 function readMode() {
   try { return sessionStorage.getItem(MODE_KEY) === "personal" ? "personal" : "organisation"; }
   catch (e) { return "organisation"; }
 }
 function setMode(mode) {
   try { sessionStorage.setItem(MODE_KEY, mode); } catch (e) {}
   import("/firebase.js").then(function (fb) {
     var u = fb.auth && fb.auth.currentUser;
     var mail = u && u.email ? String(u.email).toLowerCase() : "";
     if (mail) { try { localStorage.setItem("JAMALI_MODE::" + mail, mode); } catch (e) {} }
   }).catch(function () {});
 }
 function clearMode() {
   try { sessionStorage.removeItem(MODE_KEY); } catch (e) {}
 }
 
 var ALWAYS_OPEN = ["home", "file-viewer"];
var PARENT = {"ward-registration":"ward-management","bed-management":"ward-management","ward-occupancy":"ward-management","bed-assignment":"ward-management","ward-bed-transfers":"ward-management","cleaning-maintenance":"ward-management","ward-register":"ward-management","bed-transfer-history":"ward-management","new-admission":"patient-admission","admission-list":"patient-admission","admission-details":"patient-admission","start-discharge":"patient-discharge","discharge-list":"patient-discharge","discharge-details":"patient-discharge","new-lab-request":"laboratory","lab-request-list":"laboratory","lab-workbench":"laboratory","new-imaging-request":"radiology","imaging-requests":"radiology","imaging-workbench":"radiology","tool":"convertor"};
 function folderAllowed(folder) {
   if (!session) return false;
   if (isAdmin()) return true;
   if (folder === "system-admin") return false;
   if (ALWAYS_OPEN.indexOf(folder) !== -1) return true;
   var par = PARENT[folder]; if (par && session.grants.indexOf(par) !== -1) return true; return !!(session.grants && session.grants.indexOf(folder) !== -1);
 }

 
 
 var current = location.pathname.split("/")[1];

  
  
  
  
  
  
  
  
  
  
  
  
  if (ALWAYS_OPEN.indexOf(current) === -1) {
    if (!session) {
      location.replace("/?need=account");
    } else {
      import("/firebase.js").then(function (fb) {
        var ready = fb.auth && fb.auth.currentUser
          ? Promise.resolve(fb.auth.currentUser)
          : new Promise(function (res) {
              var off = fb.onAuthStateChanged(fb.auth, function (u) { off();
res(u); });
            });
        return ready.then(function (u) {
         if (!u) { clearSession(); location.replace("/?need=house"); return;
}
          if (session.uid !== u.uid) { session.uid = u.uid; try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {} }
        });
      }).catch(function () {   });
    }
  }

  // A direct visit to the users/administration desk is allowed only while the
  // system is in the organisation mode (admins). Otherwise go home.
  if (session && current === "system-admin" && !folderAllowed("system-admin")) {
    location.replace("/home/1");
  }

    
    
    var PAGE_ID = location.pathname.replace(/^\//, "")
      .replace(/\.html$/, "").replace(/\/+$/, "");

    
    /* URL kept: the address bar stays on the real page */

 
 var PAGES = window.JAMALI_MENU || [];

 
 
 
 var VIS = { fields: {}, menu: {}, options: {} };
 var VIS_DOC = ["systemPageConfig", "visibility"];
 var DASHES = {}; 
 var VIS_CHANGE = null;

    function isAdmin() {
      return !!(session && session.role === "admin");
    }

    function applyVisData(d) {
      VIS.fields = (d && d.fields) || {};
      VIS.menu = (d && d.menu) || {};
      VIS.options = (d && d.options) || {};
    }

    function bootVisibility() {
      return import("/firebase.js").then(function (fb) {
        var ref = fb.doc(fb.db, VIS_DOC[0], VIS_DOC[1]);
        var first = fb.getDoc(ref).then(function (snap) {
          if (snap && snap.exists()) applyVisData(snap.data());
        });
        // Live channel: as soon as the administrator hides or restores a
        // control, every open page of every user updates without a reload.
        if (fb.onSnapshot) {
          first.then(function () {
            fb.onSnapshot(ref, function (snap) {
              applyVisData(snap && snap.exists() ? snap.data() : null);
              if (VIS_CHANGE) { try { VIS_CHANGE(); } catch (e) {} }
            }, function (e) {
              console.warn("visibility watch skipped:", e);
            });
          });
        }
        return first;
      }).catch(function (e) {
        console.warn("visibility load skipped:", e);
      });
    }

 
 
 
 function chainOf(folder) {
   var out = [folder], idx = -1, myD = 0;
   for (var i = 0; i < PAGES.length; i++) {
     if (PAGES[i].folder === folder) { idx = i; myD = PAGES[i].d || 0;
break; }
   }
   if (idx < 0 || myD <= 1) return out;
   for (var j = idx - 1; j >= 0; j--) {
     var d = PAGES[j].d || 0;
     if (d === 0) break;
     if (d < myD) { out.unshift(PAGES[j].folder); myD = d; if (d === 1)
break; }
   }
   return out;
 }

 
 function menuHidden(folder) {
   var c = chainOf(folder);
   for (var i = 0; i < c.length; i++) {
     if (VIS.menu[c[i]]) return true;
   }
   return false;
 }

 
 function userFolderOpen(folder) {
   return folderAllowed(folder) && !menuHidden(folder);
 }
 
 function pageIdOfFolder(folder) {
   for (var i = 0; i < PAGES.length; i++) {
     if (PAGES[i].folder === folder) return folder + "/" + PAGES[i].n;
   }
   return null;
 }

 
 function pageHidden(pid) {
   return !!(pid && VIS.fields[pid + ":__page__"]);
 }

  
  
  var visible = PAGES.map(function (p) { return folderAllowed(p.folder);
});
  for (var v = 0; v < PAGES.length; v++) {
    if (visible[v]) continue;
    var my = PAGES[v].d || 0;
    if (my === 0) continue;  
    for (var w = v + 1; w < PAGES.length; w++) {
      if ((PAGES[w].d || 0) <= my) break;
      visible[w] = false; 
    }
  }

 

 
 
 function kidsOf(i) {
   var out = [], my = PAGES[i].d || 0;
   if (my === 0) return out;  
   for (var j = i + 1; j < PAGES.length; j++) {
     var dj = PAGES[j].d || 0;
     if (dj <= my) break;
     if (dj === my + 1 && visible[j]) out.push(j);
   }
   return out;
 }
 
 function subtreeHasCurrent(i) {
   if (PAGES[i].folder === current) return true;
   var k = kidsOf(i);
   for (var x = 0; x < k.length; x++) {
     if (subtreeHasCurrent(k[x])) return true;
   }
   return false;
 }

 
 function render(i) {
   var p = PAGES[i];
   var cls = "lv" + (p.d || 0);
   if (p.folder === current) cls += " active";
   var html = "<div class=\"node\" data-folder=\"" + p.folder + "\"><a href=\"/" + p.folder + "/" + p.n +
            "\" class=\"" + cls + "\"><span>" + p.icon + "</span>" +
p.label + "</a>";
   var k = kidsOf(i);
   if (k.length) {
     var tgAttrs = isAdmin()
       ? " type=\"button\" class=\"tg jamali-menu-hide\" data-mkey=\"" + p.folder + "\""
       : " type=\"button\" class=\"tg\" aria-expanded=\"false\"";
     html += "<button" + tgAttrs + "></button></div>";
     
     
     var open = true;  
     html += "<div class=\"kids\"" + (open ? "" : " hidden") + ">";
     for (var x = 0; x < k.length; x++) html += render(k[x]);
     html += "</div>";
   } else {
     html += "</div>";
   }
   return html;
 }

 
 var nav = "";
 for (var r = 0; r < PAGES.length; r++) {
   if ((PAGES[r].d || 0) <= 1 && visible[r]) nav += render(r);
 }
 if (nav === "") { 
   for (var f = 0; f < PAGES.length; f++) { if (visible[f]) nav += render(f);
}
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
   "#jamali-acct .modecap{padding:8px 14px 0;font-size:11px;font-weight:800;letter-spacing:.5px;color:#64748b}",
   "#jamali-acct .moderow{display:flex;gap:6px;padding:6px 10px 2px}",
   "#jamali-acct .jamali-usemode{flex:1;border:1px solid #334155;border-radius:8px;background:#0b1220;color:#cbd5e1;font-size:12px;font-weight:700;padding:7px 4px;cursor:pointer;text-align:center;display:block;width:auto}",
   "#jamali-acct .jamali-usemode:hover{background:#1e293b;color:#fff}",
   "#jamali-acct .jamali-usemode.on{background:#0c4a6e;border-color:#38bdf8;color:#fff}",
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
    ".jamali-vis-notice b{display:block;font-size:17px;margin-bottom:8px}",
   "#jamali-side-foot{flex:0 0 auto;padding:12px 14px;border-top:1px solid #1e293b;background:#0f172a}",
   ".jamali-foot-row{display:flex;align-items:stretch;gap:8px}",
   "#jamali-google-logout{flex:50 1 0;min-width:0;box-sizing:border-box;border:0;border-radius:10px;padding:12px 0;font-size:14px;font-weight:900;letter-spacing:.5px;cursor:pointer;color:#fff;background:#dc2626;box-shadow:0 8px 20px rgba(0,0,0,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
   "#jamali-google-logout:hover{background:#b91c1c}",
   "#jamali-google-logout:disabled{opacity:.6;cursor:default}",
   "#jamali-side-gear,#jamali-side-ai{flex:25 1 0;min-width:0;box-sizing:border-box;border:0;border-radius:10px;padding:10px 0;font-size:17px;line-height:1;cursor:pointer;color:#cbd5e1;background:#1e293b;box-shadow:0 8px 20px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}",
   "#jamali-side-gear:hover,#jamali-side-ai:hover{background:#334155;color:#fff}",
   "#jamali-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:1003;background:#111827;color:#e2e8f0;border:1px solid #334155;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:800;box-shadow:0 14px 34px rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .2s ease}",
   "#jamali-toast.jamali-toast-on{opacity:1}",
   ".jamali-dash.jamali-plus{background:#f0fdf4;color:#166534;border-color:#86efac}",
   ".jamali-dash.jamali-plus:hover{background:#dcfce7}",
   ".jamali-corner-dash.jamali-plus{right:23px}",
   ".jamali-ctl-host .jamali-plus:not(.jamali-corner-dash){margin-left:4px}",
   ".jamali-vis-mark{outline-style:solid;background-color:rgba(248,113,113,.16)}",
   ".jamali-vis-host{padding-right:26px}",
   ".jamali-ctl-host > input,.jamali-ctl-host > textarea,.jamali-ctl-host > select{padding-right:46px}",
   "select.jamali-opts{font:inherit;max-width:100%}",
   ".jamali-menu-hide{align-self:center;flex:0 0 24px;width:24px;height:20px;margin:0 6px 0 0;",
   "border:1px solid #fca5a5;border-radius:6px;background:#fff;color:#dc2626;font-weight:900;",
   "font-size:10.5px;line-height:1;cursor:pointer;display:flex;align-items:center;",
   "justify-content:center;padding:0}",
   ".jamali-menu-hide:hover{background:#fee2e2}",
   ".jamali-menu-hide.jamali-off{background:#dc2626;color:#fff;border-color:#b91c1c}",
   ".jamali-menu-hide.jamali-off:hover{filter:brightness(1.08)}",
   ".node.jamali-menu-gone>a{color:#f87171}",
   ".node.jamali-menu-gone>a.active{border-left-color:#f87171}"
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
  aside.innerHTML =
    "<div class=\"brand\"><i>JA</i>JAMAL" +
    "<button type=\"button\" id=\"jamali-person\" title=\"Account\">&#128100;</button></div>" +
    "<nav>" + nav + "</nav>" +
    "<div id=\"jamali-side-foot\"><div class=\"jamali-foot-row\">" +
    "<button type=\"button\" id=\"jamali-google-logout\" title=\"Total logout: ends the Google sign-in completely\">Logout</button>" +
    "<button type=\"button\" id=\"jamali-side-gear\" title=\"Settings\">&#9881;&#65039;</button>" +
    "<button type=\"button\" id=\"jamali-side-ai\" title=\"AI\">&#129302;</button>" +
    "</div></div>";

 document.body.insertBefore(overlay, document.body.firstChild);
 document.body.insertBefore(aside, document.body.firstChild);
 document.body.insertBefore(burger, document.body.firstChild);
 document.body.classList.add("jamali-has-sidebar");

  
  var who = session ? (session.username || "account") : "account";
  var roleLine = session ? (session.role === "admin" ? "administrator" :
(session.position || "user")) : "";
  var acct = document.createElement("div");
  acct.id = "jamali-acct";
  acct.hidden = true;
 acct.innerHTML =
  "<div class=\"who\"><b></b>" + roleLine + "</div>" +
  "<div class=\"modecap\">Change Mode</div>" +
  "<div class=\"moderow\">" +
  "<button type=\"button\" class=\"jamali-usemode\" data-mode=\"organisation\">Organisation Use</button>" +
  "<button type=\"button\" class=\"jamali-usemode\" data-mode=\"personal\">Personal Use</button>" +
  "</div>" +
  "<button type=\"button\" id=\"jamali-switch\">Switch Account</button>" +
  "<button type=\"button\" id=\"jamali-logout\">Logout</button>";
 acct.querySelector(".who b").textContent = who;
 document.body.insertBefore(acct, document.body.firstChild);

  document.getElementById("jamali-person").addEventListener("click",
function (ev) {
    ev.stopPropagation();
    acct.hidden = !acct.hidden;
    if (!acct.hidden) paintModeButtons();
  });
  document.addEventListener("click", function (ev) {
    if (!acct.hidden && ev.target !== acct && !acct.contains(ev.target))
acct.hidden = true;
  });

  // Change Mode: every account, admin or normal, can flip between the
  // organisation workspace and the personal private container. The database
  // keeps the two apart; the page reloads so nav and data follow the mode.
  function paintModeButtons() {
    var mode = readMode();
    var btns = acct.querySelectorAll(".jamali-usemode");
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute("data-mode") === mode;
      btns[i].className = "jamali-usemode" + (on ? " on" : "");
    }
  }
  (function () {
    var btns = acct.querySelectorAll(".jamali-usemode");
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var m = btn.getAttribute("data-mode");
          if (m === readMode()) { acct.hidden = true; return; }
          setMode(m);
          location.reload();
        });
      })(btns[i]);
    }
    paintModeButtons();
  })();

  
  document.getElementById("jamali-switch").addEventListener("click",
function () {
    clearSession();
    clearMode();
    location.href = "/";
  });

  
  
  
  
  
  
  
  
  
  document.getElementById("jamali-logout").addEventListener("click",
function () {
    clearSession();
    clearMode();
    location.href = "/";
 });

  
  
  
  
  
  
  
  
  
  document.getElementById("jamali-google-logout").addEventListener("click",
  function () {
    var btn = document.getElementById("jamali-google-logout");
    btn.disabled = true;
    btn.textContent = "Logging out...";
    clearSession();
    clearMode();
    import("/firebase.js").then(function (fb) {
      return fb.signOut(fb.auth);
    }).then(function () {
      location.href = "/";
    }).catch(function (e) {
      console.warn("google logout failed", e);
      btn.disabled = false;
      btn.textContent = "Sign-out failed";
      setTimeout(function () { btn.textContent = "Logout"; }, 2500);
    });
  });

  
  
  var toast = document.createElement("div");
  toast.id = "jamali-toast";
  toast.setAttribute("role", "status");
  document.body.appendChild(toast);
  var toastTimer = null;
  function jamaliToast(msg) {
    toast.textContent = msg;
    toast.classList.add("jamali-toast-on");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("jamali-toast-on"); }, 2000);
  }
  document.getElementById("jamali-side-gear").addEventListener("click", function () {
    jamaliToast("Settings - on progress");
  });
  document.getElementById("jamali-side-ai").addEventListener("click", function () {
    jamaliToast("AI - on progress");
  });

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

  
  
  
  
  if (session && session.username) {
    import("/firebase.js").then(function (fb) {
      var uid = fb.auth && fb.auth.currentUser;
      var ready = uid
        ? Promise.resolve(uid)
        : new Promise(function (res) {
            var off = fb.onAuthStateChanged(fb.auth, function (u) { off();
res(u); });
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
              JSON.stringify(next.grants) ===
JSON.stringify(session.grants || []);
     if (!same) {
       writeSession(next); try { paintNav(); } catch (e) {}  
      
     }
   }).catch(function () {
      
   });
 }

  
  function sync(btn) {
    var box = btn.parentNode.nextElementSibling;
    var open = !!(box && !box.hasAttribute("hidden"));
    btn.textContent = open ? "(\u2212)" : "(+)";
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function wireToggles(scope){
  var tgs=scope.querySelectorAll(".tg");
  for(var t=0;t<tgs.length;t++){
    (function(btn){
      if (isAdmin() && btn.classList.contains("jamali-menu-hide")) {
        // The administrator's sidebar minus: one click hides this whole area
        // (every page under it included) for every user, live. The button
        // turns red while the area is hidden; clicking it again restores.
        btn.textContent = "(\u2212)";
        btn.addEventListener("click", function () {
          var f = btn.getAttribute("data-mkey");
          if (!f) return;
          makeMenuToggler(f, btn)();
        });
        return;
      }
      sync(btn);
      btn.addEventListener("click",function(){
        var box=btn.parentNode.nextElementSibling;
        if(!box)return;
        if(box.hasAttribute("hidden")){box.removeAttribute("hidden");}
        else{box.setAttribute("hidden","");}
        sync(btn);
      });
    })(tgs[t]);
  }
}
wireToggles(aside);
 
function paintNav(){
  session=readSession();
  visible=PAGES.map(function(p){return folderAllowed(p.folder);});
  for(var v=0;v<PAGES.length;v++){
    if(visible[v])continue;
    var my=PAGES[v].d||0;
    for(var w=v+1;w<PAGES.length;w++){
      if((PAGES[w].d||0)<=my)break;
      visible[w]=false;
    }
  }
  var nv=aside.querySelector("nav"),nav="";
  for(var r=0;r<PAGES.length;r++){
    if((PAGES[r].d||0)<=1&&visible[r])nav+=render(r);
  }
  nv.innerHTML=nav;
  wireToggles(nv);
  try { applySidebarVis(); } catch (e) {}
}

  
  
  
  function filterLinks(root) {
    var links = (root || document).querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      if (insideJamaliUi(links[i])) continue;
      var href = links[i].getAttribute("href") || "";
      var m = href.match(/^\/([a-z0-9-]+)\//i);
      if (!m) continue;
      if (m[1] === current) continue;                 
      if (!folderAllowed(m[1])) { links[i].style.display = "none"; continue; }
      
      
      var rest = href.slice(m[0].length).replace(/\.html$/,
"").replace(/\/+$/, "");
      if (menuHidden(m[1]) || pageHidden(m[1] + "/" + rest))
links[i].style.display = "none";
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
  try { filterLinks(document); } catch (flErr) { console.warn("filterLinks skipped:", flErr); }
  });
  } else {
    try { filterLinks(document); } catch (flErr) { console.warn("filterLinks skipped:", flErr); }
  }

 
 
 
 
 bootVisibility().then(function () {
   applySidebarVis();
   try { filterLinks(document); } catch (flErr) { console.warn("filterLinks skipped:", flErr); }
   if (isAdmin()) { ensureHiddenChip(); ensureVisPanel();
refreshHiddenChip(); }
   pageBoot();
 });

  
  
  
  
  
  function hiddenItems() {
    var out = [];
    for (var k in VIS.menu) {
      if (Object.prototype.hasOwnProperty.call(VIS.menu, k) &&
VIS.menu[k]) {
        out.push({ kind: "menu", key: k });
      }
    }
    for (var f in VIS.fields) {
      if (Object.prototype.hasOwnProperty.call(VIS.fields, f) &&
VIS.fields[f]) {
        out.push({ kind: "field", key: f });
      }
    }
    return out;
  }

 function hiddenLabel(it) {
   if (it.kind === "menu") return "Area: " + labelOf(it.key);
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

 
 
 function clearGoneMarks() {
   var gones = document.querySelectorAll("[data-jamali-gone]");
   for (var g = 0; g < gones.length; g++) {
     gones[g].removeAttribute("data-jamali-gone");
     gones[g].style.display = "";
   }
 }

 function restoreItem(it) {
   import("/firebase.js").then(function (fb) {
    return fb.getDoc(fb.doc(fb.db, VIS_DOC[0],
VIS_DOC[1])).then(function (snap) {
     var d = snap.exists() ? snap.data() : {};
     VIS.fields = d.fields || {};
         VIS.menu = d.menu || {};
         VIS.options = d.options || {};
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
     return fb.getDoc(fb.doc(fb.db, VIS_DOC[0],
VIS_DOC[1])).then(function (snap) {
       var d = snap.exists() ? snap.data() : {};
       VIS.options = d.options || {};
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

  
  
  
  
  
  function applySidebarVis() {
    var nodes = document.querySelectorAll("#jamali-sidebar .node[data-folder]");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var f = node.getAttribute("data-folder");
      var gone = menuHidden(f) || pageHidden(pageIdOfFolder(f));
      if (isAdmin()) {
        // The administrator keeps the whole tree on screen and reads the
        // hidden areas from the red minus buttons, so restoring is one
        // click away; ordinary users get the rows removed completely.
        node.style.display = "";
        var kx = node.nextElementSibling;
        if (kx && kx.classList && kx.classList.contains("kids")) kx.style.display = "";
        node.classList.toggle("jamali-menu-gone", gone);
        continue;
      }
      node.classList.remove("jamali-menu-gone");
      node.style.display = gone ? "none" : "";
      if (gone) {
        var nx = node.nextElementSibling;
        if (nx && nx.classList && nx.classList.contains("kids"))
nx.style.display = "none";
      }
    }
    if (isAdmin()) {
      var mhs = document.querySelectorAll("#jamali-sidebar .tg.jamali-menu-hide");
      for (var m = 0; m < mhs.length; m++) {
        var mf = mhs[m].getAttribute("data-mkey");
        if (!mf) continue;
        var mg = menuHidden(mf);
        mhs[m].classList.toggle("jamali-off", mg);
        var top = mg ? nearestHiddenAncestor(mf) : null;
        mhs[m].title = !mg
          ? "Hide this area for every user - its sub-pages hide with it. Click again to restore."
          : (top
            ? ("Hidden under " + labelOf(top) + " - click to restore that area and everything under it")
            : "Hidden for every user - click to restore it");
      }
      return;
    }
    var tgl = document.querySelectorAll("#jamali-sidebar .tg");
    for (var j = 0; j < tgl.length; j++) {
      var box = tgl[j].parentNode.nextElementSibling;
      if (!box || !box.classList || !box.classList.contains("kids")) continue;
      var rows = box.querySelectorAll(".node");
      var alive = 0;
      for (var r = 0; r < rows.length; r++) { if (isVisibleEl(rows[r])) alive++;
}
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
         options: VIS.options,
         updatedBy: (session && session.username) || "",
         updatedAt: fb.serverTimestamp()
       });
     });
 }

 function dashError(b) {
   b.textContent = "!";
   setTimeout(function () { b.textContent = "-"; }, 1500);
 }

 
 function mainEl() {
   return document.getElementById("app") ||
document.querySelector("main") || document.body;
 }

  function pageBoot() {
    if (!PAGE_ID) return;
    
    
    
    if (current === "system-admin") return;
    var main = mainEl();
    var run = function () {
      VIS_CHANGE = liveVisChange;
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

 
 
 
 
 function hasAnyGrant() {
   return !!(session && Array.isArray(session.grants) &&
session.grants.length);
 }

 function guardUserPage(main) {
   if (menuHidden(current) || pageHidden(PAGE_ID)) { blockPage();
return; }
   if (ALWAYS_OPEN.indexOf(current) === -1 && !hasAnyGrant()) { if (current === "home") { blankHome(main); return; } blockAllowance(); return; }
   if (!folderAllowed(current) && ALWAYS_OPEN.indexOf(current)
=== -1) { blockPage(); return; }
   applyUserHides(main);
   watchPage(main, function () { applyUserHides(main); });
 }

 
  
  function blankHome(main) {
    try { if (main) main.style.display = "none"; } catch (e) {}
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
   n.innerHTML = "<b>Please wait for admin module allowance.</b>"
+
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

  
  
  
  function slug(text) {
    return String(text || "").trim().toLowerCase().replace(/[^a-z0-9]+/g,
"-")
      .replace(/^-+|-+$/g, "").slice(0, 40);
  }

 function insideJamaliUi(el) {
   return !!(el.closest && el.closest("#jamali-sidebar,#jamali-acct,#jamali-admin-btn,#jamali-burger,#jamali-overlay,.jamali-vis-notice,#jamali-hidden-chip,#jamali-vis-panel"));
 }

 function isVisibleEl(el) {
   if (el.closest && el.closest("[hidden]")) return false;
   return !!(el.offsetWidth || el.offsetHeight ||
el.getClientRects().length);
 }
  
  
  
  
  
  function scanTargets(root) {
    var map = {}, seq = 0;
    function put(key, el, wrap, labelEl) {
      if (!key) return;
      // Two controls may share a label or carry no id at all; give the
      // second one a numbered key so every field and every button gets
      // its own dash and its own hide state, stable across rescans.
      var k = key, n = 2;
      while (map[k]) { k = key + "-" + n; n++; }
      map[k] = { el: el, wrap: wrap || null, labelEl: labelEl || null, dash: null };
    }
    var ctrls = root.querySelectorAll("input, select, textarea");
    for (var i = 0; i < ctrls.length; i++) {
      var c = ctrls[i];
      if (c.type === "hidden" || c.classList.contains("jamali-opts") ||
          insideJamaliUi(c) ||
          (!isVisibleEl(c) && !c._jamaliDash &&
!c.hasAttribute("data-jamali-opts") &&
!c.hasAttribute("data-jamali-gone"))) continue;
      var row = c.closest ? c.closest("label") : null;
      if (row && !insideJamaliUi(row)) {
        
        var multi =
row.querySelectorAll("input,select,textarea,button").length > 1;
        put(c.id || ("row-" + (slug(row.textContent) || ("x" + (++seq)))), c,
multi ? null : row, null);
      } else {
        var lab = null;
        if (c.id && /^[A-Za-z0-9_-]+$/.test(c.id)) {
          lab = root.querySelector('label[for="' + c.id + '"]');
        }
        put(c.id || ("row-" + (slug(c.name || c.type) || ("x" + (++seq)))), c,
null, lab);
      }
    }
    var btns = root.querySelectorAll("button");
    for (var j = 0; j < btns.length; j++) {
      var b = btns[j];
      if (b.classList.contains("jamali-dash") || b.classList.contains("tg"))
continue;
      if (insideJamaliUi(b) || (!isVisibleEl(b) && !b._jamaliDash &&
!b.hasAttribute("data-jamali-gone"))) continue;
      put(b.id || ("btn-" + (slug(b.textContent) || ("x" + (++seq)))), b, null,
null);
    }
    return map;
  }

 function fieldsForPage() {
   var out = {}, prefix = PAGE_ID + ":";
   for (var k in VIS.fields) {
     if (Object.prototype.hasOwnProperty.call(VIS.fields, k) &&
k.indexOf(prefix) === 0) {
       out[k.slice(prefix.length)] = true;
     }
   }
   return out;
 }

 function optionsForPage() {
   var out = {}, prefix = PAGE_ID + ":";
   for (var k in VIS.options) {
     if (Object.prototype.hasOwnProperty.call(VIS.options, k) &&
k.indexOf(prefix) === 0) {
       var v = VIS.options[k];
       if (Array.isArray(v) && v.length) out[k.slice(prefix.length)] = v;
     }
   }
   return out;
 }

 function fireInput(el) {
   var evs = ["input", "change"];
   for (var i = 0; i < evs.length; i++) {
     try { el.dispatchEvent(new Event(evs[i], { bubbles: true })); } catch (e) {}
   }
 }

 // The predefined-options swap: the original input stays in the DOM (the
 // page's own script keeps reading and writing it), it is just hidden and a
 // select is placed in its spot, mirroring every choice back into it.
 function applyFieldOptions(el, list) {
   var sel = el._jamaliOpts || null;
   if (!list || !list.length) {
     if (sel && sel.parentNode) sel.parentNode.removeChild(sel);
     el._jamaliOpts = null;
     if (el.getAttribute("data-jamali-opts")) {
       el.removeAttribute("data-jamali-opts");
       if (!el.getAttribute("data-jamali-gone")) el.style.display = "";
     }
     return;
   }
   if (!sel) {
     sel = document.createElement("select");
     sel.className = "jamali-opts";
     sel.addEventListener("change", function () {
       if (el.value === sel.value) return;
       el.value = sel.value;
       fireInput(el);
     });
     el._jamaliOpts = sel;
     if (el.parentNode) el.parentNode.insertBefore(sel, el.nextSibling);
     else document.body.appendChild(sel);
   }
   if (!el._jamaliOptsWired) {
     el._jamaliOptsWired = true;
     el.addEventListener("change", function () {
       if (el._jamaliOpts && el._jamaliOpts.value !== el.value)
el._jamaliOpts.value = el.value;
     });
   }
   var cur = el.value == null ? "" : String(el.value);
   var items = list.slice();
   if (cur && items.indexOf(cur) === -1) items.unshift(cur);
   // Rebuild the <option> children only when the list really changed;
   // rebuilding on every scan would keep re-firing the page watcher.
   var sig = JSON.stringify(items);
   if (sel._jamaliSig !== sig) {
     sel._jamaliSig = sig;
     sel.innerHTML = "";
     for (var i = 0; i < items.length; i++) {
       var o = document.createElement("option");
       o.value = items[i];
       o.textContent = items[i];
       sel.appendChild(o);
     }
   }
   var want = (cur && items.indexOf(cur) !== -1) ? cur : items[0];
   sel.value = want;
   if (el.value !== want) { el.value = want; fireInput(el); }
   el.style.display = "none";
   if (!el.getAttribute("data-jamali-opts")) el.setAttribute("data-jamali-opts", "1");
   sel.style.display = "";
   sel.removeAttribute("data-jamali-gone");
 }

 function applyUserHides(root) {
   var map = scanTargets(root);
   var hidden = fieldsForPage();
   var opts = optionsForPage();
   for (var key in map) {
     if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
     var t = map[key], el = t.el;
     var isField = el.tagName !== "BUTTON";
     var off = effHidden(key, el, hidden);
     if (off) {
       // Ordinary users lose the control completely - the field, its
       // label and its wrapping row all close up, so no empty space and
       // no trace that the control ever existed is left behind.
       var host = t.wrap || el;
       host.style.display = "none";
       host.setAttribute("data-jamali-gone", "1");
       if (t.labelEl && t.labelEl !== host) {
         t.labelEl.style.display = "none";
         t.labelEl.setAttribute("data-jamali-gone", "1");
       }
       if (el !== host) el.style.display = "none";
       if (!el.getAttribute("data-jamali-gone")) el.setAttribute("data-jamali-gone", "1");
     } else {
       if (el.getAttribute("data-jamali-gone")) {
         el.removeAttribute("data-jamali-gone");
         if (!el.getAttribute("data-jamali-opts")) el.style.display = "";
       }
       if (t.wrap && t.wrap.getAttribute("data-jamali-gone")) {
         t.wrap.removeAttribute("data-jamali-gone");
         t.wrap.style.display = "";
       }
       if (t.labelEl && t.labelEl.getAttribute("data-jamali-gone")) {
         t.labelEl.removeAttribute("data-jamali-gone");
         t.labelEl.style.display = "";
       }
     }
     if (isField) {
       applyFieldOptions(el, opts[key]);
       var sel = el._jamaliOpts;
       if (sel) sel.style.display = off ? "none" : "";
     }
   }
 }

  
  
  
  
  
  
  
  
  
  
  // The + control: define the option list ordinary users must pick from.
  function makeOptions(key, el, btn) {
    return function () {
      var full = PAGE_ID + ":" + key;
      var cur = Array.isArray(VIS.options[full]) ?
VIS.options[full].join(" | ") : "";
      var ans = window.prompt(
        "Predefined options for this field. Separate them with | - users " +
        "will pick from this list only. Leave empty to go back to free typing:",
        cur);
      if (ans === null) return;
      var parts = ans.split(/\||\n/), list = [];
      for (var i = 0; i < parts.length; i++) {
        var v = parts[i].trim();
        if (v && list.indexOf(v) === -1) list.push(v);
      }
      import("/firebase.js").then(function (fb) {
        return fb.getDoc(fb.doc(fb.db, VIS_DOC[0],
VIS_DOC[1])).then(function (snap) {
          var d = snap.exists() ? snap.data() : {};
          VIS.fields = d.fields || {};
          VIS.menu = d.menu || {};
          VIS.options = d.options || {};
          if (list.length) VIS.options[full] = list;
          else delete VIS.options[full];
          return saveVisibility();
        });
      }).then(function () {
        afterVisChange();
      }).catch(function (e) {
        console.warn("options save failed", e);
        dashError(btn);
      });
    };
  }

  function scanAdminPage(root) {
    var map = scanTargets(root);
    var hidden = fieldsForPage();
    var opts = optionsForPage();
    for (var key in map) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
      var t = map[key], el = t.el;
      var isField = el.tagName !== "BUTTON";
      if (!el._jamaliDash) {
        var dash = document.createElement("button");
        dash.type = "button";
        dash.className = "jamali-dash";
        dash.textContent = "\u2212";
        dash.addEventListener("click", makeToggler(key, dash));
        el._jamaliDash = dash;
        placeDash(t, dash);
      }
      if (isField && !el._jamaliPlus) {
        var plus = document.createElement("button");
        plus.type = "button";
        plus.className = "jamali-dash jamali-plus" +
          (el._jamaliDash.classList.contains("jamali-corner-dash") ? " jamali-corner-dash" : "");
        plus.textContent = "+";
        plus.title = "Predefined options - users must pick from this list";
        plus.addEventListener("click", makeOptions(key, el, plus));
        el._jamaliPlus = plus;
        var dh = el._jamaliDash;
        if (dh && dh.parentNode) dh.parentNode.insertBefore(plus,
dh.nextSibling);
        else placeDash(t, plus);
      }
      var off = effHidden(key, el, hidden);
      setDashState(el._jamaliDash, off, isField ? "this field" : "this button");
      if (isField) applyFieldOptions(el, opts[key]);
      var mark = (isField && el._jamaliOpts) ? el._jamaliOpts : el;
      mark.classList.toggle("jamali-vis-mark", !!off);
      if (isField && el._jamaliOpts) el._jamaliOpts.style.display = "";
    }
  }


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
   if (b.parentNode) return; 
   
   
   var host = t.wrap || t.el;
   var tag = host.tagName;
   if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
     // Tiny controls (checkbox, radio) keep the dash beside them; every
     // other field gets the dash pinned to its top-right corner.
     var sp = document.createElement("span");
     sp.className = "jamali-ctl-host";
     host.parentNode.insertBefore(sp, host);
     sp.appendChild(host);
     sp.appendChild(b);
     if (host.type !== "checkbox" && host.type !== "radio") {
       b.classList.add("jamali-corner-dash");
     }
     return;
   }
   host.classList.add("jamali-vis-host");
   b.classList.add("jamali-corner-dash");
   host.insertBefore(b, host.firstChild);
 }

  function makeToggler(key, btn) {
    return function () {
      import("/firebase.js").then(function (fb) {
        return fb.getDoc(fb.doc(fb.db, VIS_DOC[0],
VIS_DOC[1])).then(function (snap) {
          var d = snap.exists() ? snap.data() : {};
          VIS.fields = d.fields || {};
          VIS.menu = d.menu || {};
          VIS.options = d.options || {};
          var full = PAGE_ID + ":" + key;
          if (VIS.fields[full]) delete VIS.fields[full]; else VIS.fields[full] =
true;
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

 
  
  // The sidebar area minus: hides (or restores) a whole menu area for every
  // user. If the area is hidden only by itself the click restores it; if it
  // is hidden because an ancestor is hidden, the click restores that
  // nearest hidden ancestor, since a child of a hidden parent can never
  // show on its own.
  function makeMenuToggler(folder, btn) {
    return function () {
      import("/firebase.js").then(function (fb) {
        return fb.getDoc(fb.doc(fb.db, VIS_DOC[0],
VIS_DOC[1])).then(function (snap) {
          var d = snap.exists() ? snap.data() : {};
          VIS.fields = d.fields || {};
          VIS.menu = d.menu || {};
          VIS.options = d.options || {};
          if (VIS.menu[folder]) delete VIS.menu[folder];
          else {
            var top = nearestHiddenAncestor(folder);
            if (top) delete VIS.menu[top];
            else VIS.menu[folder] = true;
          }
          return saveVisibility();
        });
      }).then(function () {
        afterVisChange();
      }).catch(function (e) {
        console.warn("menu visibility save failed", e);
        menuToggleError(btn);
      });
    };
  }

  function menuToggleError(btn) {
    btn.textContent = "!";
    setTimeout(function () { btn.textContent = "(\u2212)"; }, 1500);
  }

  // The nearest ancestor of the folder that is hidden in its own right;
  // chainOf returns the folder last, so the walk starts at its parent.
  function nearestHiddenAncestor(folder) {
    var c = chainOf(folder);
    for (var i = c.length - 2; i >= 0; i--) {
      if (VIS.menu[c[i]]) return c[i];
    }
    return null;
  }

  function labelOf(folder) {
    for (var i = 0; i < PAGES.length; i++) {
      if (PAGES[i].folder === folder) return PAGES[i].label || folder;
    }
    return folder;
  }

  function afterVisChange() {
    applySidebarVis();
    scanAdminPage(mainEl());
    refreshHiddenChip();
  }

  
  
  // Fired by the live Firestore channel: the administrator changed the
  // visibility document somewhere, so re-apply everything right here.
  function liveVisChange() {
    applySidebarVis();
    try { filterLinks(document); } catch (e) {}
    if (!PAGE_ID || current === "system-admin") return;
    var blocked = menuHidden(current) || pageHidden(PAGE_ID);
    if (!isAdmin() && blocked && !document.querySelector(".jamali-vis-notice")) {
      // The page this user is reading has just been hidden from the
      // administrator's sidebar minus - block it on the spot, no reload.
      blockPage();
      return;
    }
    if (!isAdmin() && document.querySelector(".jamali-vis-notice") && !blocked) {
      // This page was blocked before and the administrator has just
      // allowed it again - a reload brings the real page in.
      location.reload();
      return;
    }
    var main = mainEl();
    if (isAdmin()) { scanAdminPage(main); refreshHiddenChip(); }
    else if (!blocked) applyUserHides(main);
  }

  
  
  function watchPage(root, fn) {
    if (!window.MutationObserver) return;
    var t = null;
    new MutationObserver(function () {
      if (t) clearTimeout(t);
      t = setTimeout(fn, 350);
    }).observe(root, { childList: true, subtree: true,
      attributes: true, attributeFilter: ["hidden", "style", "class"] });
  }
})();


 
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
   import("/502.js").then(function (fb) {
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
   // RESERVE (login removed): account grants are deactivated, so
   // every folder is open for every visitor.
   return true;
 }

 
 
 var current = location.pathname.split("/")[1];

  
  
  
  
  
  
  
  
  
  
  
  
  // RESERVE (login removed): the session guard that bounced visitors
  // to the login gate (?need=account / ?need=house) and the admin-role
  // gate for the system-admin desk were deactivated with the login
  // system. Every page opens for every visitor now. To restore, see
  // public/RESERVE/README.txt.

    
    
    var PAGE_ID = location.pathname.replace(/^\//, "")
      .replace(/\.html$/, "").replace(/\/+$/, "");

    
    /* URL kept: the address bar stays on the real page */

 
 var PAGES = window.JAMALI_MENU || [];

 
 
 
  // RESERVE (admin removed): the page-visibility state (VIS /
  // VIS_DOC / DASHES / VIS_CHANGE) that the administrator's minus
  // and plus pins read and wrote was deactivated with the login
  // system. The full tooling lives in public/RESERVE/admin/.

  // The quiet net for a patchy connection. A one-shot read whose client
  // is offline, or a watch that cannot reach the server yet, ends as an
  // unhandled FirebaseError in the console. The offline class is not a
  // defect - JAMALI keeps the page working from what it already has and
  // reads resume when the network returns - so this net reports it once,
  // in one calm line, with the same code. Every other rejection still
  // reports exactly as before; nothing is hidden.
  function jamaliOffline(err) {
    var code = err && err.code ? String(err.code) : "";
    var msg = err && err.message ? String(err.message) : "";
    return code === "unavailable" ||
      msg.indexOf("client is offline") !== -1 ||
      msg.indexOf("network error") !== -1;
  }
  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev && ev.reason;
    if (!jamaliOffline(r)) return;
    ev.preventDefault();
    if (!window.__jamaliOfflineLineShown) {
      window.__jamaliOfflineLineShown = true;
      console.warn("The device is offline (" +
        String((r && (r.code || r.message)) || "unavailable") +
        ") - JAMALI keeps working from what it has and resumes when the network returns.");
    }
  });
  window.addEventListener("online", function () {
    window.__jamaliOfflineLineShown = false;
  });

  // RESERVE (admin removed): the administrator check and the style
  // gate used by the admin page scan were deactivated with the
  // login system. Nothing is admin, nothing is hidden, nothing
  // measures the page for the visibility config.


 
 
 

  
  
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
   var href = "/" + p.folder + "/" + p.n;
  var html = "<div class=\"node\" data-folder=\"" + p.folder + "\"><a href=\"" + href +
            "\" class=\"" + cls + "\"><span>" + p.icon + "</span>" +
p.label + "</a>";
   var k = kidsOf(i);
   if (k.length) {
     var tgAttrs = " type=\"button\" class=\"tg\" aria-expanded=\"false\"";
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
   // (the orphaned account-desk CSS fragments that used to sit here were
   // removed: as top-level garbage they swallowed the nav rule that
   // follows, which stopped the nav from scrolling and pushed the
   // footer out of the fixed sidebar.)

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
   "#jamali-side-foot{flex:0 0 auto;padding:12px 14px;border-top:1px solid #1e293b;background:#0f172a}",
   ".jamali-foot-row{display:flex;align-items:stretch;gap:8px}",
   "#jamali-side-auth{flex:1 1 0;min-width:0;box-sizing:border-box;border:0;border-radius:10px;padding:10px 4px;font-size:14px;font-weight:800;line-height:1.15;cursor:pointer;color:#fff;box-shadow:0 8px 20px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}",
   "#jamali-side-auth small{font-size:9.5px;font-weight:600;opacity:.9;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
   "#jamali-side-auth.login{background:#16a34a}",
   "#jamali-side-auth.login:hover{background:#15803d}",
   "#jamali-side-auth.logout{background:#dc2626}",
   "#jamali-side-auth.logout:hover{background:#b91c1c}",
   "#jamali-side-auth:disabled{opacity:.6;cursor:wait}",
   "#jamali-side-comment{flex:1 1 0;min-width:0;box-sizing:border-box;border:0;border-radius:10px;padding:10px 4px;font-size:16px;line-height:1;cursor:pointer;color:#cbd5e1;background:#1e293b;box-shadow:0 8px 20px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}",
   "#jamali-side-comment small{font-size:10px;font-weight:700;color:#94a3b8}",
   "#jamali-side-comment:hover{background:#334155;color:#fff}",
   "#jamali-side-comment:hover small{color:#e2e8f0}",
   "#jamali-owner-comments{position:fixed;top:12px;right:12px;z-index:1001;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font-weight:800;font-size:13.5px;padding:11px 16px;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.45);display:flex;align-items:center;gap:8px}",
   "#jamali-owner-comments:hover{background:#1e293b}",
   "#jamali-owner-comments[hidden]{display:none}",
   "#jamali-comment-box,#jamali-comments-list{position:fixed;top:60px;right:14px;z-index:1002;width:400px;max-width:calc(100vw - 28px);max-height:calc(100vh - 90px);overflow:auto;background:#111827;border:1px solid #334155;border-radius:14px;padding:14px 16px;color:#e2e8f0;font-size:13.5px;box-shadow:0 18px 40px rgba(0,0,0,.5)}",
   "#jamali-comment-box[hidden],#jamali-comments-list[hidden]{display:none}",
   ".jc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}",
   ".jc-head b{font-size:15px}",
   ".jc-head .jc-title-wrap{display:flex;align-items:center;gap:8px}",
   ".jc-close{border:0;background:none;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:8px}",
   ".jc-close:hover{background:#1e293b;color:#fff}",
   ".jc-who{color:#94a3b8;font-size:12.5px;border-bottom:1px solid #1e293b;padding-bottom:8px;margin-bottom:10px;line-height:1.5}",
   ".jc-who b{color:#e2e8f0}",
   "#jamali-comment-text{width:100%;box-sizing:border-box;border:1px solid #334155;border-radius:9px;background:#0b1220;color:#e2e8f0;font:inherit;padding:9px 10px;resize:vertical;min-height:96px}",
   "#jamali-comment-text:focus{outline:none;border-color:#0ea5e9}",
   ".jc-count{color:#64748b;font-size:11px;margin-top:4px;text-align:right}",
   ".jc-send{display:block;width:100%;border:0;border-radius:10px;background:#16a34a;color:#fff;font-weight:800;font-size:13.5px;padding:11px 0;cursor:pointer;margin-top:8px}",
   ".jc-send:hover{background:#15803d}",
   ".jc-send:disabled{opacity:.55;cursor:wait}",
   ".jc-msg{border-radius:10px;padding:9px 12px;margin:8px 0 0;line-height:1.5;font-size:12.5px}",
   ".jc-msg.jc-ok{background:#052e16;border:1px solid #4ade80;color:#bbf7d0}",
   ".jc-msg.jc-bad{background:#450a0a;border:1px solid #f87171;color:#fecaca}",
   ".jc-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}",
   ".jc-item{border:1px solid #334155;background:#0b1220;border-radius:10px;padding:9px 11px;line-height:1.5}",
   ".jc-item-top{display:flex;align-items:center;gap:8px}",
   ".jc-from{font-weight:800;font-size:12.5px;color:#bae6fd;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
   ".jc-when{color:#64748b;font-size:11px;flex:0 0 auto}",
   ".jc-del{flex:0 0 auto;border:1px solid #7f1d1d;background:#450a0a;color:#fca5a5;border-radius:8px;font-size:13px;line-height:1;padding:5px 8px;cursor:pointer}",
   ".jc-del:hover{background:#7f1d1d;color:#fff}",
   ".jc-text{margin-top:6px;font-size:13px;color:#e2e8f0;white-space:pre-wrap;word-break:break-word}",
   ".jc-page{color:#64748b;font-size:11px;margin-top:5px}",
   ".jc-none{color:#94a3b8;font-size:12.5px;padding:6px 0}",
   ".jc-count-line{color:#64748b;font-size:12px;margin-top:2px}",
   ".jc-refresh{border:1px solid #334155;background:#0b1220;color:#cbd5e1;border-radius:9px;font-size:12px;font-weight:700;padding:5px 10px;cursor:pointer}",
   ".jc-refresh:hover{background:#1e293b;color:#fff}",
   "#jamali-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:1003;background:#111827;color:#e2e8f0;border:1px solid #334155;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:800;box-shadow:0 14px 34px rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .2s ease}",
   "#jamali-toast.jamali-toast-on{opacity:1}"
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
    "<div class=\"brand\"><i>JA</i>JAMAL</div>" +
    "<nav>" + nav + "</nav>" +
    // THE FOOTER ROW (20 Nov 2026): the Login/Logout button and the
    // Comment button share ONE row, 50% / 50%. The old settings gear
    // left the footer - its panel code stays below as RESERVE.
    "<div id=\"jamali-side-foot\"><div class=\"jamali-foot-row\">" +
    "<button type=\"button\" id=\"jamali-side-auth\" class=\"login\" title=\"Not signed in - click to sign in with Google\">Login</button>" +
    "<button type=\"button\" id=\"jamali-side-comment\" title=\"Write a comment to the owner\">&#128172;<small>Comment</small></button>" +
    "</div></div>";

 document.body.insertBefore(overlay, document.body.firstChild);
 document.body.insertBefore(aside, document.body.firstChild);
 document.body.insertBefore(burger, document.body.firstChild);
 document.body.classList.add("jamali-has-sidebar");

  
  // RESERVE (login removed): the account desk (the person button with
  // the name card, the Organisation/Personal mode switch, Switch
  // Account, Logout and the total Google logout) was deactivated with
  // the login system. To restore, see public/RESERVE/README.txt.


  
  
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
  document.getElementById("jamali-side-comment").addEventListener("click", function () {
    jamaliCommentOpen();
  });

  // SIDEBAR LOGIN / LOGOUT - the optional Google identity button, pinned
  // at the bottom of the fixed sidebar. The system keeps working without
  // any account (anonymous use is untouched); this button only signs a
  // Google identity in or out: green Login when signed out, red Logout
  // (with the account email) when signed in.
  var sideAuthBtn = document.getElementById("jamali-side-auth");
  function sideAuthEscape(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function sideAuthRender(user) {
    if (!sideAuthBtn) return;
    if (user && user.email) {
      sideAuthBtn.className = "logout";
      sideAuthBtn.innerHTML = "Logout<small>" + sideAuthEscape(user.email) + "</small>";
      sideAuthBtn.title = "Signed in with Google - click to sign out";
    } else {
      sideAuthBtn.className = "login";
      sideAuthBtn.innerHTML = "Login";
      sideAuthBtn.title = "Not signed in - click to sign in with Google";
    }
    // The top-right Comments button exists for the owner's eyes only.
    jamaliOwnerPaint(user);
  }
  sideAuthRender(null);
  window.JAMALI_SIDEBAR_AUTH = { render: sideAuthRender };
  import("/502.js").then(function (fb) {
    if (!fb || !fb.onAuthStateChanged) return;
    // The Google identity SDK loads asynchronously INSIDE 502.js, so fb.auth
    // is still null here more often than not. requireAuth() resolves the
    // moment the identity is settled (signed in, anonymous, or offline) -
    // waiting for it instead of racing the boot is what makes the button
    // (and the owner's Comments button) come alive reliably.
    (fb.requireAuth ? fb.requireAuth() : Promise.resolve()).then(function () {
      if (!fb.auth) return; // no connection to Google - quiet anonymous use
      fb.onAuthStateChanged(fb.auth, sideAuthRender);
      sideAuthBtn.addEventListener("click", function () {
        if (fb.auth.currentUser) {
          fb.signOut(fb.auth).then(function () { jamaliToast("Signed out"); })
            .catch(function (e) { jamaliToast("Sign out failed: " + ((e && e.code) || e || "")); });
        } else {
          sideAuthBtn.disabled = true;
          fb.signInWithPopup(fb.auth, fb.provider).then(function () {
            sideAuthBtn.disabled = false;
          }).catch(function (e) {
            sideAuthBtn.disabled = false;
            var code = e && e.code ? String(e.code).replace(/^auth\//, "") : "";
            if (code === "popup-closed-by-user" || code === "cancelled-popup-request") return;
            jamaliToast("Sign in failed: " + (code || "please try again"));
          });
        }
      });
    });
  }).catch(function () {
    // No Firebase (offline or blocked): the button stays a quiet green
    // Login and the system keeps working anonymously, exactly as now.
  });

  // ====================================================================
  // THE COMMENT DESK (20 Nov 2026) - comments travel, data does not.
  // Everything a visitor saves stays in their own browser; a COMMENT is
  // the one exception, because its whole purpose is to reach the owner
  // (camelkazembe1@gmail.com). ANY visitor - signed in or not - clicks
  // the Comment button in the footer row and sends; the comment lands
  // in the shared "comments" collection in the cloud, addressed to the
  // owner. The owner sees a "Comments" button at the top right of every
  // page; it opens the mailbox: every comment, newest first, with a
  // delete icon at the end of each one. The database rules enforce the
  // same split: create for anybody, read/delete for the owner only.
  // ====================================================================
  var commentOwnerEmail = "camelkazembe1@gmail.com";
  var commentFb = null;        // the /502.js module, cached after first import
  var commentBox = null;       // the send panel (every visitor)
  var mailboxEl = null;        // the owner's mailbox panel
  var mailboxUnsub = null;     // the live mailbox unsubscribe

  function jcEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function jamaliCommentModule() {
    if (commentFb) return Promise.resolve(commentFb);
    return import("/502.js").then(function (fb) {
      commentFb = fb;
      if (fb && fb.commentOwner) commentOwnerEmail = String(fb.commentOwner).toLowerCase();
      return fb;
    });
  }

  function jamaliCommentErr(e) {
    var m = e && (e.code || e.message) ? (e.code || "") + " " + (e.message || "") : String(e);
    if (String(m).indexOf("permission-denied") !== -1) {
      return m + " - the comment desk rules are not published yet. Run: bash apply-rules.sh  (or publish firestore.rules from the Firebase console) once, then send again.";
    }
    return m;
  }

  // The top-right Comments button - created once, shown only when the
  // signed-in email is the owner's (jamaliOwnerPaint, from sideAuthRender).
  (function jamaliOwnerButtonEnsure() {
    if (document.getElementById("jamali-owner-comments")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.id = "jamali-owner-comments";
    b.hidden = true;
    b.title = "The comments mailbox - every visitor's comments, newest first";
    b.innerHTML = "&#128172; Comments";
    b.addEventListener("click", function () { jamaliMailboxOpen(); });
    document.body.appendChild(b);
  })();

  function jamaliOwnerPaint(user) {
    var btn = document.getElementById("jamali-owner-comments");
    if (!btn) return;
    var mail = user && user.email ? String(user.email).toLowerCase() : "";
    btn.hidden = mail !== commentOwnerEmail;
  }

  // ---- the send panel: every visitor, signed in or not ----
  function jamaliCommentOpen() {
    if (!commentBox) jamaliCommentBuild();
    commentBox.hidden = !commentBox.hidden;
    if (!commentBox.hidden) jamaliCommentPaint();
  }

  function jamaliCommentBuild() {
    commentBox = document.createElement("div");
    commentBox.id = "jamali-comment-box";
    commentBox.setAttribute("role", "dialog");
    commentBox.hidden = true;
    document.body.appendChild(commentBox);
  }

  function jamaliCommentPaint() {
    var me = jamaliCommentIdentity();
    commentBox.innerHTML =
      "<div class=\"jc-head\"><b>Send a comment</b><button type=\"button\" class=\"jc-close\" title=\"Close\">&#215;</button></div>" +
      "<div class=\"jc-who\">From: <b>" + (me.guest ? "Guest (not signed in - the comment still reaches the owner)" : jcEsc(me.email)) + "</b><br>" +
      "To: <b>" + jcEsc(commentOwnerEmail) + "</b> (the owner)</div>" +
      "<textarea id=\"jamali-comment-text\" maxlength=\"2000\" placeholder=\"Write your comment - it goes straight to the owner\"></textarea>" +
      "<div class=\"jc-count\"><span id=\"jamali-comment-n\">0</span> / 2000</div>" +
      "<button type=\"button\" class=\"jc-send\">Send comment</button>" +
      "<div class=\"jc-msg\" id=\"jamali-comment-msg\" hidden></div>";
    commentBox.querySelector(".jc-close").addEventListener("click", function () {
      commentBox.hidden = true;
    });
    var ta = commentBox.querySelector("#jamali-comment-text");
    ta.addEventListener("input", jamaliCommentCount);
    jamaliCommentCount();
    commentBox.querySelector(".jc-send").addEventListener("click", jamaliCommentSend);
  }

  function jamaliCommentIdentity() {
    var u = commentFb && commentFb.auth && commentFb.auth.currentUser;
    if (u && u.email) return { email: String(u.email), guest: false };
    return { email: "", guest: true };
  }

  function jamaliCommentCount() {
    if (!commentBox) return;
    var ta = commentBox.querySelector("#jamali-comment-text");
    var n = commentBox.querySelector("#jamali-comment-n");
    if (ta && n) n.textContent = String(ta.value.length);
  }

  function jamaliCommentSend() {
    if (!commentBox) return;
    var ta = commentBox.querySelector("#jamali-comment-text");
    var btn = commentBox.querySelector(".jc-send");
    var msg = commentBox.querySelector("#jamali-comment-msg");
    var text = ta.value.trim();
    msg.className = "jc-msg";
    msg.hidden = true;
    if (!text) {
      msg.className = "jc-msg jc-bad";
      msg.hidden = false;
      msg.textContent = "Write the comment first - the box is empty.";
      return;
    }
    btn.disabled = true;
    jamaliCommentModule().then(function (fb) {
      return fb.commentSend(text);
    }).then(function () {
      btn.disabled = false;
      ta.value = "";
      jamaliCommentCount();
      msg.className = "jc-msg jc-ok";
      msg.hidden = false;
      msg.textContent = "Sent. The owner (" + commentOwnerEmail + ") will see it in the Comments mailbox at the top right.";
      jamaliToast("Comment sent to the owner");
    }).catch(function (e) {
      btn.disabled = false;
      msg.className = "jc-msg jc-bad";
      msg.hidden = false;
      msg.textContent = "NOT sent - " + jamaliCommentErr(e) + " Your text is still here - try again.";
    });
  }

  // ---- the owner's mailbox: every comment, newest first ----
  function jamaliMailboxOpen() {
    if (!mailboxEl) jamaliMailboxBuild();
    mailboxEl.hidden = !mailboxEl.hidden;
    if (!mailboxEl.hidden) jamaliMailboxStart();
    else jamaliMailboxStop();
  }

  function jamaliMailboxBuild() {
    mailboxEl = document.createElement("div");
    mailboxEl.id = "jamali-comments-list";
    mailboxEl.setAttribute("role", "dialog");
    mailboxEl.hidden = true;
    document.body.appendChild(mailboxEl);
  }

  function jamaliMailboxStart() {
    jamaliMailboxStop();
    mailboxEl.innerHTML =
      "<div class=\"jc-head\"><div class=\"jc-title-wrap\"><b>&#128172; Comments</b>" +
      "<button type=\"button\" class=\"jc-refresh\" title=\"Load again\">Refresh</button></div>" +
      "<button type=\"button\" class=\"jc-close\" title=\"Close\">&#215;</button></div>" +
      "<div class=\"jc-count-line\" id=\"jamali-mailbox-count\">loading&#8230;</div>" +
      "<div class=\"jc-list\" id=\"jamali-mailbox-items\"></div>";
    mailboxEl.querySelector(".jc-close").addEventListener("click", function () {
      mailboxEl.hidden = true;
      jamaliMailboxStop();
    });
    mailboxEl.querySelector(".jc-refresh").addEventListener("click", function () {
      jamaliMailboxStart();
    });
    jamaliMailboxPaint(null, null);
    jamaliCommentModule().then(function (fb) {
      if (fb.commentWatch) {
        return fb.commentWatch(function (err, rows) {
          if (mailboxEl && !mailboxEl.hidden) jamaliMailboxPaint(err, rows);
        }).then(function (unsub) {
          mailboxUnsub = unsub;
        });
      }
      return fb.commentList().then(function (rows) {
        if (mailboxEl && !mailboxEl.hidden) jamaliMailboxPaint(null, rows);
      });
    }).catch(function (e) {
      if (mailboxEl && !mailboxEl.hidden) jamaliMailboxPaint(e, null);
    });
  }

  function jamaliMailboxStop() {
    if (mailboxUnsub) {
      try { mailboxUnsub(); } catch (e) {}
      mailboxUnsub = null;
    }
  }

  function jamaliMailboxPaint(err, rows) {
    if (!mailboxEl) return;
    var items = mailboxEl.querySelector("#jamali-mailbox-items");
    var count = mailboxEl.querySelector("#jamali-mailbox-count");
    if (!items || !count) return;
    if (err) {
      count.textContent = "";
      items.innerHTML = "";
      var d = document.createElement("div");
      d.className = "jc-msg jc-bad";
      d.textContent = "The mailbox could not be read - " + jamaliCommentErr(err);
      items.appendChild(d);
      return;
    }
    if (!rows) {
      count.textContent = "loading\u2026";
      return;
    }
    count.textContent = rows.length === 1 ? "1 comment" : rows.length + " comments";
    items.innerHTML = "";
    if (!rows.length) {
      var none = document.createElement("div");
      none.className = "jc-none";
      none.textContent = "No comments yet - when a visitor sends one it appears here immediately.";
      items.appendChild(none);
      return;
    }
    rows.forEach(function (r) {
      var when = r.millis ? new Date(r.millis).toLocaleString() : "";
      var item = document.createElement("div");
      item.className = "jc-item";
      item.innerHTML =
        "<div class=\"jc-item-top\">" +
        "<span class=\"jc-from\" title=\"" + jcEsc(r.from) + "\">" + jcEsc(r.from) + "</span>" +
        "<span class=\"jc-when\">" + jcEsc(when) + "</span>" +
        "<button type=\"button\" class=\"jc-del\" data-id=\"" + jcEsc(r.id) + "\" title=\"Delete this comment permanently\">&#128465;</button>" +
        "</div>" +
        "<div class=\"jc-text\"></div>" +
        (r.page ? "<div class=\"jc-page\">from " + jcEsc(r.page) + "</div>" : "");
      item.querySelector(".jc-text").textContent = r.text;
      item.querySelector(".jc-del").addEventListener("click", function () {
        jamaliMailboxDelete(r.id, r.from);
      });
      items.appendChild(item);
    });
  }

  function jamaliMailboxDelete(id, from) {
    if (!commentFb || !commentFb.commentDelete) return;
    if (!window.confirm("Delete this comment from " + from + " permanently?")) return;
    commentFb.commentDelete(id).then(function () {
      jamaliToast("Comment deleted");
    }).catch(function (e) {
      jamaliToast("Delete failed: " + jamaliCommentErr(e));
    });
  }

  // RESERVE (admin removed): the floating Admin button that opened
  // /system-admin/380 was deactivated with the login system. The
  // panel itself lives in public/RESERVE/admin/.


  
  
  
  
  // RESERVE (login removed): the background job that re-read the
  // signed-in account from Firestore and refreshed its grants was
  // deactivated with the login system.


  
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
 
  // RESERVE (admin removed): paintNav (the sidebar rebuild used
  // by the visibility config) was deactivated with the login
  // system.

  
  
  
  // RESERVE (admin removed): filterLinks (the link hider driven
  // by the visibility config) and the bootVisibility boot chain
  // were deactivated with the login system. Every link, menu and
  // page is open to every visitor now.

  
  
  
  
  

 
 


 
  // RESERVE (admin removed): mainEl and pageBoot (the admin page
  // scan and the user page guard driven by the visibility config)
  // were deactivated with the login system. Pages boot plainly
  // and show everything.

 
 
 
 
  // RESERVE (admin removed): hasAnyGrant and guardUserPage (the
  // allowance and page-hidden guards) were deactivated with the
  // login system. Nothing is ever blocked or hidden.

 
  

  
  
  



  
  

  /* ======================================================================
     Settings (the gear) with the Data Deletion Workflow.
     RESERVE (gear removed 20 Nov 2026): the Comment button replaced the
     gear in the footer row, and nothing opens this panel any more. The
     whole panel below still works - to restore it, add a button that
     calls jamaliSettingsOpen().
     - The gear opened a real Settings panel; the AI button is untouched.
     - "Show Delete Data" opens the deletion section:
         * personal use (no account) and administrator accounts delete
           their data directly: warning -> confirmation -> permanent
           deletion (a retention copy is archived into
           systemDeletionAudit first) -> success message;
         * organisation accounts never delete shared data directly:
           warning -> confirmation -> reason -> final confirmation ->
           the request lands in systemDeletionRequests, the data stays
           untouched, and the administrator decides it in Data
           Deletion Requests;
       decisions come back here live in "My deletion requests" plus a
       notification record written by the administrator.
     - The database rules carry the real authority: anything outside
       this flow is refused server-side.
     ====================================================================== */
  /* JD-DELETE-MODULE-START */
  var SETTINGS_EL = null;
  var SETTINGS_MINE_UNSUB = null;
  var MINE_REQS = [];

  var DEL_SCOPE_LIB = {
    business: { key: "business", label: "Business & accounting", collections: ["transactions"] },
    stock: { key: "stock", label: "Stock management", collections: ["stockItems", "stockChanges"] },
    health: { key: "health", label: "Hospital & health records", collections: [
      "healthRegistrations", "healthTriage", "healthNurseConsultations",
      "healthDoctorConsultations", "healthPrescriptions", "healthTreatmentOrders",
      "healthDestinations", "healthWards", "healthBeds", "healthBedAssignments",
      "healthBedTransfers", "healthBedMaintenance", "healthAdmissions",
      "healthDischarges", "healthLabRequests", "healthImagingRequests",
      "healthQueueConfig"
    ] }
  };

  function jdEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function delErrText(e) {
    var m = e && (e.code || e.message) ? (e.code || "") + " " + (e.message || "") : String(e);
    if (String(m).indexOf("permission-denied") !== -1) {
      return m + " - the database refused this. The updated firestore.rules must be published in the Firebase console first.";
    }
    return m;
  }

  function jamaliTs(t) {
    try { return t && t.toDate ? t.toDate().getTime() : 0; } catch (e) { return 0; }
  }

  function delChipClass(st) {
    var map = { pending: "jd-chip-wait", approved: "jd-chip-go", completed: "jd-chip-go", rejected: "jd-chip-no", failed: "jd-chip-no" };
    return map[String(st || "pending")] || "jd-chip-wait";
  }

  function delHasPending(list) {
    var L = list || MINE_REQS;
    for (var i = 0; i < L.length; i++) {
      if (String(L[i].r && L[i].r.status) === "pending") return true;
    }
    return false;
  }

  function delScopesForMe() {
    // Personal use (no account) and administrator accounts may delete
    // every data group. An organisation account only the groups behind
    // its granted modules - the same grants that open its pages - so a
    // user can never ask to delete data outside their own authority.
    var M = window.JAMALI_MENU || [];
    function subtree(root) {
      var out = [], open = false, depth = 0;
      for (var i = 0; i < M.length; i++) {
        var d = M[i].d || 0;
        if (!open) {
          if (M[i].folder === root) { open = true; depth = d; out.push(M[i].folder); }
          continue;
        }
        if (d <= depth) break;
        out.push(M[i].folder);
      }
      return out;
    }
    var all = !session || session.role === "admin";
    var g = (session && Array.isArray(session.grants)) ? session.grants : [];
    function hit(set) {
      if (all) return true;
      for (var i = 0; i < set.length; i++) { if (g.indexOf(set[i]) !== -1) return true; }
      return false;
    }
    var stockT = subtree("stock-management");
    var bizT = subtree("business"), bizOnly = [];
    for (var b = 0; b < bizT.length; b++) { if (stockT.indexOf(bizT[b]) === -1) bizOnly.push(bizT[b]); }
    var healthT = subtree("health");
    var out = [];
    if (hit(bizOnly)) out.push(DEL_SCOPE_LIB.business);
    if (hit(stockT)) out.push(DEL_SCOPE_LIB.stock);
    if (hit(healthT)) out.push(DEL_SCOPE_LIB.health);
    return out;
  }

  function jamaliDeleteActor(fb) {
    var u = fb.auth && fb.auth.currentUser;
    return {
      uid: u ? u.uid : "",
      email: u && u.email ? String(u.email || "").toLowerCase() : "",
      label: session ? (session.username || "account") : "personal use"
    };
  }

  function jamaliSettingsOpen() {
    if (!SETTINGS_EL) jamaliSettingsBuild();
    SETTINGS_EL.hidden = !SETTINGS_EL.hidden;
    if (!SETTINGS_EL.hidden) { jamaliSettingsPaint(); jamaliMineStart(); }
  }

  function jamaliSettingsBuild() {
    var st = document.createElement("style");
    st.textContent = [
      "#jamali-settings{position:fixed;top:60px;right:14px;z-index:1002;width:380px;max-width:calc(100vw - 28px);",
      "max-height:calc(100vh - 90px);overflow:auto;background:#111827;border:1px solid #334155;border-radius:14px;",
      "padding:14px 16px;color:#e2e8f0;font-size:13.5px;box-shadow:0 18px 40px rgba(0,0,0,.5)}",
      "#jamali-settings .jd-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}",
      "#jamali-settings .jd-head b{font-size:15px}",
      "#jamali-settings .jd-close{border:0;background:none;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:8px}",
      "#jamali-settings .jd-close:hover{background:#1e293b;color:#fff}",
      "#jamali-settings .jd-who{border-bottom:1px solid #1e293b;padding-bottom:8px;margin-bottom:10px}",
      "#jamali-settings .jd-who b{display:block;font-size:13.5px}",
      "#jamali-settings .jd-who span{color:#94a3b8;font-size:12.5px}",
      "#jamali-settings .jd-zone{border:1px solid #1e3a5f;background:#0b1220;color:#7dd3fc;border-radius:10px;padding:8px 10px;margin:8px 0;font-size:12px;line-height:1.5}",
      "#jamali-settings .jd-zone b{display:block;font-size:12px;color:#bae6fd}",
      "#jamali-settings .jd-cap{font-size:11px;font-weight:800;letter-spacing:.5px;color:#64748b;margin:10px 0 6px;text-transform:uppercase}",
      "#jamali-settings #jd-show-del{display:block;width:100%;text-align:left;border:1px solid #334155;background:#0b1220;",
      "color:#e2e8f0;border-radius:10px;padding:10px 12px;font-size:13.5px;font-weight:700;cursor:pointer}",
      "#jamali-settings #jd-show-del:hover{background:#1e293b}",
      "#jamali-settings .jd-warn{border:1px solid #fca5a5;background:#450a0a;color:#fecaca;border-radius:10px;padding:10px 12px;margin:6px 0 10px;line-height:1.5}",
      "#jamali-settings .jd-warn b{display:block;margin-bottom:2px}",
      "#jamali-settings .jd-scopes{display:flex;flex-direction:column;gap:6px;margin:8px 0}",
      "#jamali-settings .jd-scope{display:flex;gap:8px;align-items:flex-start;border:1px solid #334155;border-radius:10px;padding:8px 10px;cursor:pointer}",
      "#jamali-settings .jd-scope:hover{background:#1e293b}",
      "#jamali-settings .jd-scope input{margin-top:2px}",
      "#jamali-settings .jd-scope b{display:block;font-size:13px}",
      "#jamali-settings .jd-scope i{display:block;font-style:normal;color:#94a3b8;font-size:11.5px;margin-top:2px}",
      "#jamali-settings .jd-msg{border-radius:10px;padding:9px 12px;margin:8px 0;line-height:1.5;font-size:13px}",
      "#jamali-settings .jd-msg.jd-ok{background:#052e16;border:1px solid #4ade80;color:#bbf7d0}",
      "#jamali-settings .jd-msg.jd-bad{background:#450a0a;border:1px solid #f87171;color:#fecaca}",
      "#jamali-settings .jd-none{color:#94a3b8;font-size:12.5px;padding:6px 0}",
      "#jamali-settings .jd-danger{display:block;width:100%;border:0;border-radius:10px;background:#dc2626;color:#fff;",
      "font-weight:800;font-size:13.5px;padding:11px 0;cursor:pointer;margin-top:6px}",
      "#jamali-settings .jd-danger:hover{background:#b91c1c}",
      "#jamali-settings .jd-danger:disabled,#jamali-settings .jd-primary:disabled{opacity:.55;cursor:default}",
      "#jamali-settings .jd-primary{display:block;width:100%;border:0;border-radius:10px;background:#0ea5e9;color:#fff;",
      "font-weight:800;font-size:13.5px;padding:11px 0;cursor:pointer;margin-top:8px}",
      "#jamali-settings .jd-primary:hover{background:#0284c7}",
      "#jamali-settings .jd-reason{display:block;margin:8px 0 0;color:#cbd5e1;font-size:12.5px}",
      "#jamali-settings .jd-reason b{display:block;margin-bottom:5px}",
      "#jamali-settings .jd-reason textarea{width:100%;box-sizing:border-box;border:1px solid #334155;border-radius:9px;",
      "background:#0b1220;color:#e2e8f0;font:inherit;padding:8px 10px;resize:vertical}",
      "#jamali-settings .jd-decisions{margin:8px 0}",
      "#jamali-settings .jd-decision{border:1px solid #334155;background:#0b1220;border-radius:10px;padding:8px 10px;",
      "margin-bottom:6px;line-height:1.5;font-size:12.5px}",
      "#jamali-settings .jd-decision i{display:block;color:#64748b;font-style:normal;font-size:11px;margin-top:3px}",
      "#jamali-settings .jd-list{display:flex;flex-direction:column;gap:6px;margin-top:4px}",
      "#jamali-settings .jd-item{border:1px solid #334155;border-radius:10px;padding:8px 10px}",
      "#jamali-settings .jd-item-top{display:flex;align-items:center;gap:8px}",
      "#jamali-settings .jd-what{flex:1;min-width:0;font-size:12.5px;color:#cbd5e1}",
      "#jamali-settings .jd-chip{font-size:10.5px;font-weight:900;letter-spacing:.5px;border-radius:999px;padding:3px 8px;flex:0 0 auto}",
      "#jamali-settings .jd-chip-wait{background:#7c2d12;color:#fdba74}",
      "#jamali-settings .jd-chip-go{background:#14532d;color:#86efac}",
      "#jamali-settings .jd-chip-no{background:#7f1d1d;color:#fca5a5}",
      "#jamali-settings .jd-detail{color:#e2e8f0;font-size:12.5px;margin-top:5px;line-height:1.5}",
      "#jamali-settings .jd-when{color:#64748b;font-size:11px;margin-top:3px}"
    ].join("");
    document.head.appendChild(st);
    SETTINGS_EL = document.createElement("div");
    SETTINGS_EL.id = "jamali-settings";
    SETTINGS_EL.setAttribute("role", "dialog");
    SETTINGS_EL.hidden = true;
    document.body.appendChild(SETTINGS_EL);
  }

  function jamaliSettingsPaint() {
    if (!SETTINGS_EL) return;
    var h = "";
    h += "<div class=\"jd-head\"><b>Settings</b><button type=\"button\" class=\"jd-close\" title=\"Close\">&#215;</button></div>";
    h += "<div class=\"jd-who\"><b></b><span></span></div>";
    h += "<div class=\"jd-zone\" id=\"jd-zone\"><b>Data lives in this browser</b><span>checking the data zone&hellip;</span></div>";
    h += "<div class=\"jd-cap\">Data</div>";
    h += "<button type=\"button\" id=\"jd-show-del\">Show Delete Data</button>";
    h += "<div id=\"jd-del-body\" hidden></div>";
    h += "<div id=\"jd-mine\"></div>";
    SETTINGS_EL.innerHTML = h;
    SETTINGS_EL.querySelector(".jd-close").addEventListener("click", function () {
      SETTINGS_EL.hidden = true;
    });
    var w = SETTINGS_EL.querySelector(".jd-who");
    w.querySelector("b").textContent = session ? (session.username || "account") : "Personal use (no account)";
    w.querySelector("span").textContent = session
      ? (session.role === "admin" ? "administrator" : (session.position || "user"))
      : "full owner of this system";
    SETTINGS_EL.querySelector("#jd-show-del").addEventListener("click", function () {
      var body = SETTINGS_EL.querySelector("#jd-del-body");
      body.hidden = !body.hidden;
      if (!body.hidden) jamaliDeletePaint(body);
    });
    jamaliMinePaint(SETTINGS_EL.querySelector("#jd-mine"));
    jamaliZonePaint();
  }

  // The data-zone line: where this browser's records are stored. It is
  // always Local Storage; the zone is "anonymous" or the signed-in email.
  function jamaliZonePaint() {
    var box = SETTINGS_EL.querySelector("#jd-zone");
    if (!box) return;
    import("/502.js").then(function (fb) {
      if (!fb || !fb.localZone) return;
      var z = fb.localZone();
      var b = box.querySelector("b");
      var s = box.querySelector("span");
      if (b) b.textContent = "Data lives in this browser's Local Storage";
      if (s) s.textContent = "Zone: " + z.label + " - it survives refreshing, closing and reopening the browser. " +
        "Nobody else's data mixes in, and clearing the browser's site data clears it.";
    }).catch(function () {});
  }

  function jamaliDeletePaint(body) {
    var scopes = delScopesForMe();
    var direct = !session || session.role === "admin";
    var h = "";
    h += "<div class=\"jd-cap\">Delete Data</div>";
    h += "<div class=\"jd-warn\"><b>Permanent deletion.</b> Data removed here cannot be recovered. " +
      (direct
        ? "A retention copy goes into the deletion audit record first, then the data is permanently deleted."
        : "Organisation data is never deleted directly - your request goes to the administrator with your reason, and the data stays untouched until they decide.") +
      "</div>";
    if (!scopes.length) {
      h += "<div class=\"jd-none\">Your account has no data groups available, so there is nothing you are authorised to delete.</div>";
    } else {
      h += "<div class=\"jd-scopes\">";
      for (var i = 0; i < scopes.length; i++) {
        h += "<label class=\"jd-scope\"><input type=\"checkbox\" value=\"" + scopes[i].key + "\" checked> " +
          "<span><b>" + jdEsc(scopes[i].label) + "</b><i>" + jdEsc(scopes[i].collections.join(", ")) + " - counting&hellip;</i></span></label>";
      }
      h += "</div>";
      h += "<div class=\"jd-msg\" hidden></div>";
      if (direct) {
        h += "<button type=\"button\" id=\"jd-run\" class=\"jd-danger\">Delete Data Permanently</button>";
      } else {
        h += "<div id=\"jd-req\" hidden>";
        h += "<label class=\"jd-reason\"><b>Reason for the deletion request (required)</b>";
        h += "<textarea id=\"jd-why\" rows=\"3\" placeholder=\"Explain why this data must be deleted\"></textarea></label>";
        h += "<button type=\"button\" id=\"jd-submit\" class=\"jd-primary\">Submit deletion request</button>";
        h += "</div>";
        h += "<button type=\"button\" id=\"jd-ask\" class=\"jd-primary\">Delete Data</button>";
      }
    }
    body.innerHTML = h;
    body._jdCounts = {};
    jamaliCountsPaint(body, scopes);
    jamaliDecisionsPaint(body);
    var run = body.querySelector("#jd-run");
    if (run) run.addEventListener("click", function () { jamaliDirectRun(body, scopes); });
    var ask = body.querySelector("#jd-ask");
    if (ask) ask.addEventListener("click", function () { jamaliAskRun(body); });
    var sub = body.querySelector("#jd-submit");
    if (sub) sub.addEventListener("click", function () { jamaliRequestSubmit(body, scopes); });
  }

  function jamaliCountsPaint(body, scopes) {
    import("/502.js").then(function (fb) {
      var box = body.querySelector(".jd-scopes");
      if (!box) return;
      scopes.forEach(function (s) {
        var total = 0, errs = 0;
        var jobs = s.collections.map(function (c) {
          return fb.getDocs(fb.collection(fb.db, c)).then(function (snap) {
            total += snap.size;
          }).catch(function () { errs++; });
        });
        Promise.all(jobs).then(function () {
          body._jdCounts[s.key] = errs ? -1 : total;
          var inp = box.querySelector('input[value="' + s.key + '"]');
          if (!inp) return;
          var line = inp.parentNode.querySelector("i");
          if (line) {
            line.textContent = s.collections.join(", ") + " - " +
              (errs ? "count unavailable" : (total ? total + " document" + (total === 1 ? "" : "s") : "already empty"));
          }
        });
      });
    }).catch(function () {});
  }

  function jamaliCollectChosen(body, scopes) {
    var boxes = body.querySelectorAll(".jd-scope input:checked");
    var out = [];
    for (var i = 0; i < boxes.length; i++) {
      for (var j = 0; j < scopes.length; j++) {
        if (scopes[j].key === boxes[i].value) out.push(scopes[j]);
      }
    }
    return out;
  }

  function jamaliSay(body, m, bad) {
    var msg = body.querySelector(".jd-msg");
    if (!msg) return;
    msg.hidden = !m;
    msg.textContent = m || "";
    msg.className = "jd-msg" + (bad ? " jd-bad" : " jd-ok");
  }

  // ---- direct path: personal use and administrator accounts ----
  function jamaliDirectRun(body, scopes) {
    var chosen = jamaliCollectChosen(body, scopes);
    if (!chosen.length) { jamaliSay(body, "Select at least one data group first.", true); return; }
    var cols = [];
    chosen.forEach(function (s) { s.collections.forEach(function (c) { cols.push(c); }); });
    if (!window.confirm(
      "PERMANENT DELETION\n\nThe selected data in " + cols.join(", ") +
      " will be permanently deleted. A retention copy goes into the deletion audit record first, " +
      "then every document is removed. This cannot be undone.\n\nDelete now?")) return;
    var run = body.querySelector("#jd-run");
    if (run) { run.disabled = true; run.textContent = "Deleting..."; }
    jamaliSay(body, "Working: reading the data, writing the retention archive, then deleting...", false);
    import("/502.js").then(function (fb) {
      return jamaliDeleteExecute(fb, chosen, { kind: "direct", requestId: "" });
    }).then(function (fin) {
      if (fin.aborted) {
        jamaliSay(body, "Nothing was deleted - " + fin.error, true);
      } else if (fin.totalFailed && !fin.totalDeleted) {
        jamaliSay(body, "Deletion FAILED - nothing was removed. " + (fin.results[0] && fin.results[0].error ? fin.results[0].error : ""), true);
      } else if (fin.totalFailed) {
        jamaliSay(body, "Partially deleted: " + fin.totalDeleted + " document" + (fin.totalDeleted === 1 ? "" : "s") +
          " deleted, " + fin.totalFailed + " failed. The audit record shows exactly what happened.", true);
      } else if (fin.totalDeleted) {
        jamaliSay(body, "Deletion successful: " + fin.totalDeleted + " document" + (fin.totalDeleted === 1 ? "" : "s") +
          " permanently deleted.", false);
        jamaliToast("Deletion successful: " + fin.totalDeleted + " document" + (fin.totalDeleted === 1 ? "" : "s") + " permanently deleted");
      } else {
        jamaliSay(body, "Nothing to delete - the selected groups are already empty.", false);
      }
      if (run) { run.disabled = false; run.textContent = "Delete Data Permanently"; }
      jamaliCountsPaint(body, scopes);
    }).catch(function (e) {
      jamaliSay(body, "Deletion failed - nothing was removed. " + delErrText(e), true);
      if (run) { run.disabled = false; run.textContent = "Delete Data Permanently"; }
    });
  }

  // ---- request path: organisation accounts ----
  function jamaliAskRun(body) {
    if (!window.confirm(
      "PERMANENT DELETION WARNING\n\nYou are asking to permanently delete the selected data groups for the whole organisation. " +
      "Nothing is deleted until the administrator approves your request.")) return;
    var req = body.querySelector("#jd-req");
    if (req) req.hidden = false;
    var ask = body.querySelector("#jd-ask");
    if (ask) ask.hidden = true;
    var why = body.querySelector("#jd-why");
    if (why) why.focus();
  }

  function jamaliRequestSubmit(body, scopes) {
    var chosen = jamaliCollectChosen(body, scopes);
    if (!chosen.length) { jamaliSay(body, "Select at least one data group first.", true); return; }
    var why = body.querySelector("#jd-why");
    var reason = why ? String(why.value || "").trim() : "";
    if (!reason) {
      jamaliSay(body, "A reason is required - tell the administrator why this data must be deleted.", true);
      if (why) why.focus();
      return;
    }
    if (delHasPending()) {
      jamaliSay(body, "You already have a pending deletion request - the administrator has not decided it yet. " +
        "It is listed under My deletion requests below.", true);
      return;
    }
    var counts = body._jdCounts || {};
    var lines = chosen.map(function (s) {
      var c = counts[s.key];
      return s.label + " (" + s.collections.join(", ") + ")" +
        (typeof c === "number" && c >= 0 ? " - " + c + " document" + (c === 1 ? "" : "s") : "");
    }).join("\n");
    if (!window.confirm(
      "SUBMIT DELETION REQUEST\n\nYou: " + (session && session.username ? session.username : "account") +
      "\nData groups:\n" + lines + "\n\nReason: " + reason +
      "\n\nNothing is deleted now. The data stays untouched while the request waits, " +
      "the administrator reviews it and decides, and you are notified of the decision. Submit it?")) return;
    var sub = body.querySelector("#jd-submit");
    if (sub) { sub.disabled = true; sub.textContent = "Submitting..."; }
    import("/502.js").then(function (fb) {
      var me = fb.auth && fb.auth.currentUser;
      if (!me) throw new Error("You are not signed in with Google any more - log in again first.");
      return fb.addDoc(fb.collection(fb.db, "systemDeletionRequests"), {
        type: "data-deletion",
        status: "pending",
        requesterUid: me.uid,
        requesterEmail: String(me.email || "").toLowerCase(),
        requesterUsername: (session && session.username) || "",
        requesterPosition: (session && session.position) || "",
        accountId: String((session && session.username) || "").toLowerCase(),
        organisation: "jamal",
        scopes: chosen.map(function (s) { return s.key; }),
        scopeDetails: chosen.map(function (s) {
          var c = counts[s.key];
          return {
            key: s.key,
            label: s.label,
            collections: s.collections.slice(),
            docsAtRequest: (typeof c === "number" && c >= 0) ? c : 0
          };
        }),
        reason: reason,
        decision: null,
        execution: null,
        createdAt: fb.serverTimestamp()
      });
    }).then(function () {
      jamaliSay(body, "Your deletion request was submitted. The data stays untouched until the administrator decides - " +
        "you will see the decision here and under My deletion requests.", false);
      var req = body.querySelector("#jd-req");
      if (req) req.hidden = true;
      if (why) why.value = "";
      jamaliToast("Deletion request submitted to the administrator");
    }).catch(function (e) {
      jamaliSay(body, "Could not submit the request: " + delErrText(e), true);
    }).then(function () {
      if (sub) { sub.disabled = false; sub.textContent = "Submit deletion request"; }
    });
  }

  // ---- decisions written by the administrator, shown to the requester ----
  function jamaliDecisionsPaint(body) {
    if (!session) return;
    import("/502.js").then(function (fb) {
      var me = fb.auth && fb.auth.currentUser;
      if (!me) return;
      var q = fb.query(fb.collection(fb.db, "systemNotifications"),
        fb.where("googleUid", "==", me.uid), fb.where("type", "==", "deletion"));
      return fb.getDocs(q).then(function (snap) {
        var rows = [];
        snap.forEach(function (d) { rows.push(d.data()); });
        if (!rows.length || !body.isConnected) return;
        rows.sort(function (a, b) { return jamaliTs(b.at) - jamaliTs(a.at); });
        var h = "<div class=\"jd-decisions\"><div class=\"jd-cap\">Notifications from the administrator</div>";
        for (var i = 0; i < rows.length && i < 5; i++) {
          var t = jamaliTs(rows[i].at);
          h += "<div class=\"jd-decision\">" + jdEsc(rows[i].message || "") +
            (t ? "<i>" + new Date(t).toLocaleString() + "</i>" : "") + "</div>";
        }
        h += "</div>";
        var anchor = body.querySelector(".jd-msg");
        if (anchor) anchor.insertAdjacentHTML("beforebegin", h);
      });
    }).catch(function () {});
  }

  // ---- my deletion requests, live ----
  function jamaliMineStart() {
    if (!session || SETTINGS_MINE_UNSUB) return;
    import("/502.js").then(function (fb) {
      var me = fb.auth && fb.auth.currentUser;
      if (!me) return;
      var q = fb.query(fb.collection(fb.db, "systemDeletionRequests"),
        fb.where("requesterUid", "==", me.uid));
      SETTINGS_MINE_UNSUB = fb.onSnapshot(q, function (snap) {
        MINE_REQS = [];
        snap.forEach(function (d) { MINE_REQS.push({ id: d.id, r: d.data() }); });
        MINE_REQS.sort(function (a, b) { return jamaliTs(b.r.createdAt) - jamaliTs(a.r.createdAt); });
        var box = document.getElementById("jd-mine");
        if (box) jamaliMinePaint(box);
      }, function () {
        // rules not published yet, or read refused - the list just stays empty
      });
    }).catch(function () {});
  }

  function jamaliMinePaint(box) {
    if (!box || !session) return;
    var h = "<div class=\"jd-cap\">My deletion requests</div>";
    if (!MINE_REQS.length) {
      h += "<div class=\"jd-none\">None yet. Submit one from Show Delete Data above - its status appears here live.</div>";
    } else {
      h += "<div class=\"jd-list\">";
      for (var i = 0; i < MINE_REQS.length; i++) {
        var r = MINE_REQS[i].r || {};
        var st = String(r.status || "pending");
        var detail = "";
        if (st === "pending") detail = "Waiting for the administrator - your data is untouched.";
        if (st === "approved") detail = "Approved - the deletion is being executed.";
        if (st === "rejected" && r.decision && r.decision.reason) detail = "Rejected by the administrator: " + r.decision.reason;
        if (st === "completed" && r.execution) {
          detail = "Deletion executed: " + (r.execution.totalDeleted || 0) + " document" + ((r.execution.totalDeleted || 0) === 1 ? "" : "s") +
            " permanently deleted" + ((r.execution.totalFailed || 0) ? (", " + r.execution.totalFailed + " failed") : "") + ".";
        }
        if (st === "failed") {
          detail = "The deletion FAILED - your data was not removed" +
            (r.execution && r.execution.error ? (": " + r.execution.error) : ". The administrator can see the error in Data Deletion Requests.");
        }
        var t = jamaliTs(r.createdAt);
        h += "<div class=\"jd-item\"><div class=\"jd-item-top\">" +
          "<span class=\"jd-chip " + delChipClass(st) + "\">" + jdEsc(st.toUpperCase()) + "</span>" +
          "<span class=\"jd-what\">" + jdEsc((Array.isArray(r.scopes) ? r.scopes : []).join(", ")) + "</span></div>" +
          (detail ? "<div class=\"jd-detail\">" + jdEsc(detail) + "</div>" : "") +
          (t ? "<div class=\"jd-when\">requested " + new Date(t).toLocaleString() + "</div>" : "") +
          "</div>";
      }
      h += "</div>";
    }
    box.innerHTML = h;
  }

  // ---- the shared permanent-deletion executor ----
  // Order is fixed and safe: read everything first, write the retention
  // archive BEFORE removing anything, then delete in batches. If any
  // read or the archive write fails, nothing is deleted at all.
  function jamaliDeleteExecute(fb, chosen, meta) {
    var cols = [];
    chosen.forEach(function (s) {
      s.collections.forEach(function (c) { if (cols.indexOf(c) === -1) cols.push(c); });
    });
    var reads = cols.map(function (c) {
      return fb.getDocs(fb.collection(fb.db, c)).then(function (snap) {
        var docs = [];
        snap.forEach(function (d) { docs.push({ id: d.id, data: d.data() }); });
        return { collection: c, docs: docs, error: "" };
      }).catch(function (e) {
        return { collection: c, docs: null, error: delErrText(e) };
      });
    });
    return Promise.all(reads).then(function (groups) {
      var bad = "";
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].docs === null) { bad = groups[i].error; break; }
      }
      if (bad) return { aborted: true, error: bad, results: [], totalDeleted: 0, totalFailed: 0 };
      var CAP = 150;
      var archive = {};
      groups.forEach(function (g) {
        archive[g.collection] = {
          count: g.docs.length,
          truncated: g.docs.length > CAP,
          docs: g.docs.slice(0, CAP).map(function (x) { return { id: x.id, data: x.data }; })
        };
      });
      var actor = meta.actor || jamaliDeleteActor(fb);
      var auditId = "da-" + (meta.requestId ? String(meta.requestId).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 20) : "direct") +
        "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      return fb.setDoc(fb.doc(fb.db, "systemDeletionAudit", auditId), {
        kind: meta.kind || "direct",
        requestId: meta.requestId || "",
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorLabel: actor.label,
        scopes: chosen.map(function (s) { return s.key; }),
        collections: cols,
        archive: archive,
        results: [],
        status: "executing",
        at: fb.serverTimestamp()
      }).then(function () {
        return { auditId: auditId, groups: groups };
      });
    }).then(function (ctx) {
      if (!ctx) return { aborted: true, error: "unknown", results: [], totalDeleted: 0, totalFailed: 0 };
      var results = [];
      var chain = Promise.resolve();
      ctx.groups.forEach(function (g) {
        chain = chain.then(function () {
          // The counters live HERE - one level above both the chunk loop and
          // the callback that reports them - so the outcome of a group is
          // always in scope for its result line. (They used to sit inside
          // the Promise executor only, which crashed the whole deletion
          // with "deleted is not defined" the moment a group finished.)
          var deleted = 0, failed = 0, error = "";
          return new Promise(function (res) {
            function chunk(start) {
              var slice = g.docs.slice(start, start + 400);
              if (!slice.length) { res(); return; }
              var batch = fb.writeBatch(fb.db);
              slice.forEach(function (x) { batch.delete(fb.doc(fb.db, g.collection, x.id)); });
              batch.commit().then(function () {
                deleted += slice.length;
                chunk(start + slice.length);
              }).catch(function (e) {
                failed += (g.docs.length - start);
                error = delErrText(e);
                res();
              });
            }
            chunk(0);
          }).then(function () {
            results.push({ collection: g.collection, found: g.docs.length, deleted: deleted, failed: failed, error: error });
          });
        });
      });
      return chain.then(function () {
        var td = 0, tf = 0;
        results.forEach(function (r) { td += r.deleted; tf += r.failed; });
        return fb.updateDoc(fb.doc(fb.db, "systemDeletionAudit", ctx.auditId), {
          results: results,
          status: tf ? (td ? "partial" : "failed") : "completed",
          totalDeleted: td,
          totalFailed: tf,
          finishedAt: fb.serverTimestamp()
        }).catch(function () {}).then(function () {
          return { aborted: false, results: results, totalDeleted: td, totalFailed: tf };
        });
      });
    });
  }
  /* JD-DELETE-MODULE-END */

})();

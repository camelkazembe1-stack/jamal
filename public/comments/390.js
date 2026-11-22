/* JAMALI - public/comments/390.js, the comment mailbox page.
 *
 * This page is the RECEIVER and it carries no send-comment setup any
 * more. Visitors write from the sidebar Comment button, which opens the
 * write popup on any page; what lands in the shared "comments"
 * collection is exactly the same as before. The page itself does one
 * job:
 *   - when the owner is signed in, the mailbox opens: every comment,
 *     newest first, live, with a delete button on each one;
 *   - when nobody is signed in (or a non-owner is), a sign-in card takes
 *     the mailbox's place: one Google sign-in as the owner's email and
 *     the received comments display immediately.
 * The database rules stay the same: create for anybody, read/delete for
 * the owner only.
 */

var FALLBACK_OWNER = "camelkazembe1@gmail.com";
var ownerEmail = FALLBACK_OWNER;
var mailboxUnsub = null;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function errText(e) {
  var m = e && (e.code || e.message) ? (e.code || "") + " " + (e.message || "") : String(e);
  if (String(m).indexOf("permission-denied") !== -1) {
    return m + " - the comment desk rules are not published yet. Publish the rules from the Firebase console once, then send again.";
  }
  return m;
}

var mailboxCard = document.getElementById("mailbox-card");
var countLine = document.getElementById("mailbox-count");
var items = document.getElementById("mailbox-items");
var refreshBtn = document.getElementById("refresh-btn");
var mailboxMsg = document.getElementById("mailbox-msg");
var gateCard = document.getElementById("owner-gate");
var gateText = document.getElementById("gate-text");
var gateBtn = document.getElementById("owner-signin-btn");
var gateMsg = document.getElementById("gate-msg");

function showMsg(ok, text) {
  if (!mailboxMsg) return;
  mailboxMsg.className = "msg " + (ok ? "jc-ok" : "jc-bad");
  mailboxMsg.hidden = false;
  mailboxMsg.textContent = text;
}

/* ---- the owner's mailbox, live ---- */

/* THE OWNER GATE: the mailbox displays only for the owner's email. When
 * the visitor is not that email, the sign-in card shows in its place -
 * one Google sign-in as the owner and every received comment displays
 * right here, newest first, live. A signed-in non-owner is told which
 * account opens the mailbox. */
function paintGate(user) {
  if (!gateCard) return;
  var mail = user && user.email ? String(user.email).toLowerCase() : "";
  var isOwner = !!(mail && mail === ownerEmail);
  mailboxCard.hidden = !isOwner;
  gateCard.hidden = isOwner;
  if (gateMsg) gateMsg.hidden = true;
  if (!isOwner) {
    gateText.textContent = mail
      ? "You are signed in as " + mail + " - the mailbox opens only for " + ownerEmail + ", the owner. Sign in with the owner's account and every received comment displays here."
      : "The mailbox is the owner's. Sign in as " + ownerEmail + " and every received comment displays here, newest first, live.";
  }
}

if (gateBtn) {
  gateBtn.addEventListener("click", function () {
    var fb = window.__jamaliCommentFb;
    if (!fb || !fb.signInWithPopup || !fb.auth) {
      gateMsg.className = "msg jc-bad";
      gateMsg.hidden = false;
      gateMsg.textContent = "Google sign-in is not available right now (no connection to Google) - try again when you are back online.";
      return;
    }
    gateBtn.disabled = true;
    gateMsg.hidden = true;
    fb.signInWithPopup(fb.auth, fb.provider).then(function () {
      gateBtn.disabled = false;
      // the auth listener paints the mailbox the moment the owner lands
    }).catch(function (e) {
      gateBtn.disabled = false;
      var code = e && e.code ? String(e.code).replace(/^auth\//, "") : "";
      if (code === "popup-closed-by-user" || code === "cancelled-popup-request") return;
      gateMsg.className = "msg jc-bad";
      gateMsg.hidden = false;
      gateMsg.textContent = "Sign in failed - " + (code || "please try again") + ".";
    });
  });
}

function stopWatch() {
  if (mailboxUnsub) {
    try { mailboxUnsub(); } catch (e) {}
    mailboxUnsub = null;
  }
}

function paintMailbox(err, rows) {
  if (err) {
    countLine.textContent = "";
    items.innerHTML = "";
    var d = document.createElement("div");
    d.className = "msg jc-bad";
    d.textContent = "The mailbox could not be read - " + errText(err);
    items.appendChild(d);
    return;
  }
  if (!rows) {
    countLine.textContent = "loading\u2026";
    return;
  }
  countLine.textContent = rows.length === 1 ? "1 comment" : rows.length + " comments";
  items.innerHTML = "";
  if (!rows.length) {
    var none = document.createElement("div");
    none.className = "none";
    none.textContent = "No comments yet - when a visitor sends one it appears here immediately.";
    items.appendChild(none);
    return;
  }
  rows.forEach(function (r) {
    var when = r.millis ? new Date(r.millis).toLocaleString() : "";
    var item = document.createElement("div");
    item.className = "item";
    item.innerHTML =
      "<div class=\"item-top\">" +
      "<span class=\"from\" title=\"" + esc(r.from) + "\">" + esc(r.from) + "</span>" +
      "<span class=\"when\">" + esc(when) + "</span>" +
      "<button type=\"button\" class=\"del\" data-id=\"" + esc(r.id) + "\" title=\"Delete this comment permanently\">&#128465;</button>" +
      "</div>" +
      "<div class=\"text\"></div>" +
      (r.page ? "<div class=\"page-ref\">from " + esc(r.page) + "</div>" : "");
    item.querySelector(".text").textContent = r.text;
    item.querySelector(".del").addEventListener("click", function () {
      deleteComment(r.id, r.from);
    });
    items.appendChild(item);
  });
}

function startMailbox(fb) {
  stopWatch();
  paintMailbox(null, null);
  if (fb.commentWatch) {
    fb.commentWatch(function (err, rows) {
      paintMailbox(err, rows);
    }).then(function (unsub) {
      mailboxUnsub = unsub;
    }).catch(function (e) {
      paintMailbox(e, null);
    });
  } else {
    fb.commentList().then(function (rows) {
      paintMailbox(null, rows);
    }).catch(function (e) {
      paintMailbox(e, null);
    });
  }
}

function deleteComment(id, from) {
  if (!window.__jamaliCommentFb || !window.__jamaliCommentFb.commentDelete) return;
  if (!window.confirm("Delete this comment from " + from + " permanently?")) return;
  window.__jamaliCommentFb.commentDelete(id).then(function () {
    showMsg(true, "Comment deleted.");
  }).catch(function (e) {
    showMsg(false, "Delete failed - " + errText(e));
  });
}

refreshBtn.addEventListener("click", function () {
  if (window.__jamaliCommentFb) startMailbox(window.__jamaliCommentFb);
});

import("/sidebar.js").then(function (fb) {
  window.__jamaliCommentFb = fb;
  if (fb && fb.commentOwner) ownerEmail = String(fb.commentOwner).toLowerCase();
  var live = false;
  if (fb && fb.onAuthStateChanged) {
    // Wait for requireAuth() FIRST and only then look at fb.auth: the
    // Google identity SDK boots asynchronously INSIDE 502.js, so fb.auth
    // is still null the moment this import resolves - checking it before
    // the wait skipped the whole block and the mailbox never displayed.
    // The sidebar fixes the same race this way; the desk now does too.
    (fb.requireAuth ? fb.requireAuth() : Promise.resolve()).then(function () {
      if (!fb.auth) return;
      fb.onAuthStateChanged(fb.auth, function (user) {
        paintGate(user);
        var mail = user && user.email ? String(user.email).toLowerCase() : "";
        var isOwner = !!(mail && mail === ownerEmail);
        if (isOwner && !live) {
          live = true;
          startMailbox(fb);
        } else if (!isOwner && live) {
          live = false;
          stopWatch();
        }
      });
    }).catch(function () {});
  }
}).catch(function () {
  /* No Firebase (offline or blocked): the mailbox stays hidden behind
     its sign-in card and works again when the network returns. */
});

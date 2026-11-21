/* JAMALI - public/comments/390.js, the comment desk page.
 *
 * The comment desk used to live in two popups on the sidebar. Now it is
 * a complete page of its own:
 *   - every visitor (signed in or not) writes a comment at the top and
 *     it goes straight to the owner; the page the visitor came from
 *     travels along in the ?from= hint so the owner can see where the
 *     comment was written;
 *   - when the owner is signed in, the mailbox opens underneath: every
 *     comment, newest first, live, with a delete button on each one.
 * The database rules stay the same: create for anybody, read/delete for
 * the owner only.
 */

var PAGE_REF = "";
try {
  var q = new URLSearchParams(location.search);
  PAGE_REF = (q.get("from") || "").replace(/\.html$/, "");
} catch (e) { PAGE_REF = ""; }
if (!PAGE_REF) PAGE_REF = "/home/1";

var FALLBACK_OWNER = "camelkazembe1@gmail.com";
var ownerEmail = FALLBACK_OWNER;
var mailboxUnsub = null;
var sentTimer = null;

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

var ta = document.getElementById("comment-text");
var countEl = document.getElementById("char-count");
var sendBtn = document.getElementById("send-btn");
var sendMsg = document.getElementById("send-msg");
var fromLine = document.getElementById("from-line");
var mailboxCard = document.getElementById("mailbox-card");
var countLine = document.getElementById("mailbox-count");
var items = document.getElementById("mailbox-items");
var refreshBtn = document.getElementById("refresh-btn");

function paintCount() {
  countEl.textContent = ta.value.length + " / 2000";
}
ta.addEventListener("input", paintCount);
paintCount();

fromLine.textContent = "from " + PAGE_REF;

function showMsg(ok, text) {
  sendMsg.className = "msg " + (ok ? "jc-ok" : "jc-bad");
  sendMsg.hidden = false;
  sendMsg.textContent = text;
}

sendBtn.addEventListener("click", function () {
  var text = ta.value.trim();
  sendMsg.className = "msg";
  sendMsg.hidden = true;
  if (!text) {
    showMsg(false, "Write the comment first - the box is empty.");
    return;
  }
  sendBtn.disabled = true;
  import("/502.js").then(function (fb) {
    if (fb && fb.commentOwner) ownerEmail = String(fb.commentOwner).toLowerCase();
    return fb.commentSend(text, PAGE_REF);
  }).then(function () {
    sendBtn.classList.add("jc-sent");
    sendBtn.textContent = "Sent";
    showMsg(true, "Sent - thank you. Your comment is in the owner's mailbox.");
    sentTimer = setTimeout(function () {
      sentTimer = null;
      sendBtn.classList.remove("jc-sent");
      sendBtn.textContent = "Send comment";
      sendBtn.disabled = false;
      ta.value = "";
      paintCount();
      sendMsg.hidden = true;
    }, 3000);
  }).catch(function (e) {
    sendBtn.disabled = false;
    showMsg(false, "NOT sent - " + errText(e) + " Your text is still here - try again.");
  });
});

/* ---- the owner's mailbox, live ---- */

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

import("/502.js").then(function (fb) {
  window.__jamaliCommentFb = fb;
  if (fb && fb.commentOwner) ownerEmail = String(fb.commentOwner).toLowerCase();
  var live = false;
  if (fb && fb.onAuthStateChanged && fb.auth) {
    (fb.requireAuth ? fb.requireAuth() : Promise.resolve()).then(function () {
      if (!fb.auth) return;
      fb.onAuthStateChanged(fb.auth, function (user) {
        var mail = user && user.email ? String(user.email).toLowerCase() : "";
        var isOwner = mail && mail === ownerEmail;
        mailboxCard.hidden = !isOwner;
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
  /* No Firebase (offline or blocked): the send form stays; the mailbox
     stays hidden and the desk works again when the network returns. */
});

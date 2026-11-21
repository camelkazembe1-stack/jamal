/* JAMALI - public/jamali-bridge.js, the internal navigation bridge.
 *
 * Every page loads this script in its head. It makes the whole app live
 * inside the root URL (https://jamal-mu-gold.vercel.app/):
 *
 *   1. A page opened on its own address (a typed or bookmarked route)
 *      bounces straight back to the root shell, which reopens the page
 *      inside itself - so the address bar only ever shows the root.
 *   2. Inside the shell, every internal link has its href removed and is
 *      driven through a postMessage to the shell instead. With no href
 *      there is nothing to show at the bottom of the browser when a link
 *      is hovered, and no route path is ever handed to the interface.
 *   3. Tooltips and titles that contained a route path are scrubbed.
 *
 * Real page addresses still exist internally (the iframe keeps using
 * /slug/number.html), so every feature that reads location.pathname,
 * query strings or hashes keeps working exactly as before - the routes
 * just never reach the user's interface.
 */
(function () {
  "use strict";

  var HOME = "/home/1.html";
  var BOOT_KEY = "JAMALI_BOOT_PAGE";
  var LAST_KEY = "JAMALI_LAST_PAGE";

  var framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }

  /* Normalise an internal target. Returns null for anything that is not
   * an app route (external URLs, blobs, downloads, in-page hashes), so
   * those keep their normal browser behaviour. App routes come back in
   * their full /slug/number.html form, because the pages are plain
   * static files - the routes stay internal, the files are real. */
  function norm(target) {
    var t = String(target == null ? "" : target).trim();
    if (!t) return null;
    if (t.charAt(0) === "#") return null;
    if (/^(https?:)?\/\//i.test(t)) return null;
    if (/^(mailto|tel|sms|blob|data|javascript|about|file):/i.test(t)) return null;
    if (t === "/" || t === "/index.html") return HOME;
    if (t.charAt(0) !== "/") return null;
    if (/^\/RESERVE(\/|$)/i.test(t)) return null; /* admin panel stays standalone */
    var m = t.match(/^([^?#]*)([?#].*)?$/);
    if (!m) return null;
    var path = m[1].replace(/\/+$/, "");
    var rest = m[2] || "";
    if (!path) return HOME;
    if (!/\.html$/i.test(path)) path += ".html";
    return path + rest;
  }

  /* 1) Standalone pages bounce into the root shell. */
  if (!framed) {
    try {
      var here = location.pathname + (location.search || "") + (location.hash || "");
      sessionStorage.setItem(BOOT_KEY, here || "/");
      sessionStorage.removeItem(LAST_KEY);
    } catch (e) {}
    location.replace("/");
    return;
  }

  /* 2) Inside the shell: internal links lose their href and navigate
   *    through the shell, so no route path shows at the bottom. */
  function scrubTitle(el) {
    var ti = el.getAttribute && el.getAttribute("title");
    if (!ti) return;
    if (/\/[a-z0-9-]+\/\d+/i.test(ti)) {
      var clean = ti.replace(/\s*[|·•\-–—]?\s*\/[a-z0-9-]+\/\d+(\.html)?/gi, "").trim();
      if (clean !== ti) el.setAttribute("title", clean);
    }
  }

  function neutralize(a) {
    var href = a.getAttribute("href");
    if (href == null) return;
    var t = norm(href);
    if (t == null) return;
    if (a.hasAttribute("download")) return; /* real file downloads stay real */
    a.setAttribute("data-jamal-target", t);
    a.removeAttribute("href");
    a.removeAttribute("target");
    /* no href means no keyboard focus any more - keep the link usable */
    a.setAttribute("tabindex", "0");
    a.setAttribute("role", "link");
    if (!a.style.cursor) a.style.cursor = "pointer";
    scrubTitle(a);
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === "A") neutralize(node);
    if (node.querySelectorAll) {
      var list = node.querySelectorAll("a[href]");
      for (var i = 0; i < list.length; i++) neutralize(list[i]);
    }
  }

  function linkFrom(ev) {
    var el = ev.target;
    while (el && el.nodeType === 1 && el.tagName !== "A") el = el.parentNode;
    return el && el.nodeType === 1 && el.tagName === "A" ? el : null;
  }

  function go(el) {
    var t = el.getAttribute("data-jamal-target");
    if (t == null) return false;
    try {
      window.parent.postMessage({ type: "JAMALI_NAV", target: t }, location.origin);
    } catch (e) {
      location.replace(t);
    }
    return true;
  }

  document.addEventListener("click", function (ev) {
    var a = linkFrom(ev);
    if (!a || a.getAttribute("data-jamal-target") == null) return;
    if (ev.defaultPrevented) return;
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) {
      ev.preventDefault(); /* even middle/modified clicks stay inside */
      return;
    }
    ev.preventDefault();
    go(a);
  }, true);

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" && ev.key !== " " && ev.key !== "Spacebar") return;
    var a = linkFrom(ev);
    if (!a || a.getAttribute("data-jamal-target") == null) return;
    ev.preventDefault();
    go(a);
  }, true);

  document.addEventListener("auxclick", function (ev) {
    var a = linkFrom(ev);
    if (!a || a.getAttribute("data-jamal-target") == null) return;
    ev.preventDefault();
    go(a);
  }, true);

  /* Context menu has no href to copy any more; keep the menu itself. */

  scan(document);
  document.addEventListener("DOMContentLoaded", function () { scan(document); });
  window.addEventListener("load", function () { scan(document); });

  if (window.MutationObserver) {
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var add = muts[i].addedNodes;
        for (var j = 0; j < add.length; j++) scan(add[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  /* Handy for page scripts that want to move internally by hand. */
  window.JAMALI_INTERNAL_GO = function (target) {
    var t = norm(target);
    if (!t) return false;
    try {
      window.parent.postMessage({ type: "JAMALI_NAV", target: t }, location.origin);
    } catch (e) {
      location.replace(t);
    }
    return true;
  };
})();

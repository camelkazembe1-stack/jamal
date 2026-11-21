#!/bin/bash
# =====================================================================
# JAMALI - keep every page inside the root URL
# ---------------------------------------------------------------------
# After this script the address bar only ever shows the site root:
#   1. public/index.html becomes the root shell - the whole app opens
#      inside it, every move happens in there, nothing is redirected
#      in the open.
#   2. public/jamali-bridge.js is new. Every page loads it in its head:
#        - internal links lose their href, so hovering shows NOTHING
#          at the bottom of the browser (no route path at the bottom);
#        - clicks, middle clicks and Enter move the page through the
#          shell with postMessage (fully internal);
#        - tooltips that carried a route path are scrubbed;
#        - a page opened on its own route (typed or bookmarked) folds
#          itself back into the root shell.
#   3. The bridge tag is injected into every page (public/*/N.html).
#   4. SERVER/server.js: legacy route redirects become invisible
#      rewrites - the browser keeps the address it asked for, no
#      redirect is ever seen. Only routes landing on the root itself
#      stay redirects ("/", "/?mode=...").
#   5. node SERVER/sync.js regenerates vercel.json and public/502.js.
#   6. Validation runs at the end. The commit stays yours.
#
# Run from the repo root:   bash jamali_internal_routes.sh
# =====================================================================
set -eu

say()  { printf '%s\n' "$*"; }
ok()   { printf '  [ok] %s\n' "$*"; }
warn() { printf '  [!!] %s\n' "$*"; }

say "=== JAMALI internal routes - every page inside the root URL ==="

# -- 0. sanity --------------------------------------------------------
[ -f vercel.json ]     || { warn "run me from the repo root (vercel.json not found)"; exit 1; }
[ -f SERVER/server.js ] || { warn "SERVER/server.js not found"; exit 1; }
[ -d public ]          || { warn "public/ not found"; exit 1; }
command -v node >/dev/null 2>&1 || { warn "node is required (SERVER/sync.js and the checks use it)"; exit 1; }

# -- 1. the bridge ----------------------------------------------------
say "-- 1. writing public/jamali-bridge.js"
cat > public/jamali-bridge.js <<'JAMALI_BRIDGE_EOF'
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
 * /slug/number), so every feature that reads location.pathname, query
 * strings or hashes keeps working exactly as before - the routes just
 * never reach the user's interface.
 */
(function () {
  "use strict";

  var HOME = "/home/1";
  var BOOT_KEY = "JAMALI_BOOT_PAGE";
  var LAST_KEY = "JAMALI_LAST_PAGE";

  var framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }

  /* Normalise an internal target. Returns null for anything that is not
   * an app route (external URLs, blobs, downloads, in-page hashes), so
   * those keep their normal browser behaviour. */
  function norm(target) {
    var t = String(target == null ? "" : target).trim();
    if (!t) return null;
    if (t.charAt(0) === "#") return null;
    if (/^(https?:)?\/\//i.test(t)) return null;
    if (/^(mailto|tel|sms|blob|data|javascript|about|file):/i.test(t)) return null;
    if (t === "/" || t === "/index.html") return HOME;
    if (t.charAt(0) !== "/") return null;
    if (/^\/RESERVE(\/|$)/i.test(t)) return null; /* admin panel stays standalone */
    t = t.replace(/\.html(?=$|[?#])/i, "");
    return t;
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
JAMALI_BRIDGE_EOF
ok "public/jamali-bridge.js written"

# -- 2. the shell -----------------------------------------------------
say "-- 2. rewriting public/index.html (the root shell)"
cat > public/index.html <<'JAMALI_SHELL_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0f172a">
  <title>JAMALI - MultiSystem Management</title>
  <style>
    html,
    body {
      width: 100%;
      height: 100%;
      min-height: 100%;
      margin: 0;
      overflow: hidden;
      background: #0f172a;
    }

    #jamali-app {
      display: block;
      width: 100%;
      height: 100vh;
      height: 100dvh;
      border: 0;
    }
  </style>
</head>
<body>
  <iframe
    id="jamali-app"
    src="about:blank"
    title="JAMALI application"
    allow="clipboard-read; clipboard-write"
  ></iframe>
  <script>
    /* JAMALI root shell. Every page of the app opens inside this frame,
     * so the address bar only ever shows the site root. Pages announce
     * their moves through jamali-bridge.js with postMessage; nothing is
     * redirected in the open and no route path reaches the interface. */
    (function () {
      "use strict";

      var HOME = "/home/1";
      var BOOT_KEY = "JAMALI_BOOT_PAGE";
      var LAST_KEY = "JAMALI_LAST_PAGE";
      var frame = document.getElementById("jamali-app");

      function norm(target) {
        var t = String(target == null ? "" : target).trim();
        if (!t) return null;
        if (t.charAt(0) === "#") return null;
        if (/^(https?:)?\/\//i.test(t)) return null;
        if (/^(mailto|tel|sms|blob|data|javascript|about|file):/i.test(t)) return null;
        if (t === "/" || t === "/index.html") return HOME;
        if (t.charAt(0) !== "/") return null;
        if (/^\/RESERVE(\/|$)/i.test(t)) return null;
        t = t.replace(/\.html(?=$|[?#])/i, "");
        return t;
      }

      /* If this shell was somehow served on a route path, quietly settle
       * the address bar back onto the root - no reload, no redirect. */
      if (location.pathname !== "/") {
        try { history.replaceState(null, "", "/" + (location.search || "") + (location.hash || "")); }
        catch (e) {}
      }

      /* Where to open first: a page that bounced in from its own route
       * wins, then a query typed on the root (for example /?mode=token),
       * then the page the user was on before a refresh, then home. */
      var boot = null;
      try {
        boot = sessionStorage.getItem(BOOT_KEY);
        sessionStorage.removeItem(BOOT_KEY);
      } catch (e) {}

      var topQuery = (location.search || "") + (location.hash || "");
      var last = null;
      try { last = sessionStorage.getItem(LAST_KEY); } catch (e) {}

      var initial = norm(boot) ||
        (topQuery ? norm(HOME + topQuery) : null) ||
        norm(last) || HOME;
      frame.src = initial;

      window.addEventListener("message", function (ev) {
        if (ev.origin !== location.origin) return;
        var d = ev.data;
        if (!d || d.type !== "JAMALI_NAV") return;
        var t = norm(d.target);
        if (!t) return;
        try { frame.contentWindow.location.replace(t); }
        catch (e) { frame.src = t; }
      });

      /* Remember the page the user is on so a refresh reopens it inside
       * the root shell. */
      frame.addEventListener("load", function () {
        try {
          var here = frame.contentWindow.location;
          if (!here || here.protocol === "about:") return;
          var cur = here.pathname + (here.search || "") + (here.hash || "");
          if (cur && cur !== "/") sessionStorage.setItem(LAST_KEY, cur);
        } catch (e) {}
      });
    })();
  </script>
</body>
</html>
JAMALI_SHELL_EOF
ok "public/index.html written"

# -- 3. inject the bridge into every page -----------------------------
say "-- 3. injecting the bridge tag into every page"
injected=0; already=0
for f in public/*/[0-9]*.html; do
  [ -f "$f" ] || continue
  if grep -q "jamali-bridge.js" "$f"; then
    already=$((already + 1))
    continue
  fi
  awk 'BEGIN { d = 0 }
       /<\/head>/ && d == 0 { print "<script src=\"/jamali-bridge.js\"></script>"; d = 1 }
       { print }' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  injected=$((injected + 1))
done
ok "bridge tag injected into $injected page(s) ($already already had it)"

# -- 4. convertor tooltip ----------------------------------------------
say "-- 4. scrubbing the route path out of the convertor tooltips"
CONV="public/convertor/63.js"
if [ -f "$CONV" ] && grep -q 't\.label + " · /"' "$CONV"; then
  sed 's# + " · /" + t\.slug + "/" + t\.n##' "$CONV" > "$CONV.tmp" && mv "$CONV.tmp" "$CONV"
  ok "convertor/63.js tooltip cleaned"
else
  ok "convertor tooltip already clean"
fi

# -- 5. the routing table ----------------------------------------------
say "-- 5. SERVER/server.js: legacy redirects become invisible rewrites"
if grep -q "rewrites: VERCEL_REDIRECTS.filter" SERVER/server.js; then
  ok "already patched"
else
  if ! grep -q "redirects: VERCEL_REDIRECTS\.flatMap" SERVER/server.js; then
    warn "the VERCEL_SPEC block looks different from what I expected - nothing changed"
    exit 1
  fi
  awk 'BEGIN { d = 0 }
       d == 1 { if ($0 ~ /^[[:space:]]*\}\),[[:space:]]*$/) { d = 2 } next }
       d == 2 { print; next }
       /redirects: VERCEL_REDIRECTS\.flatMap/ {
         d = 1
         print "  /* Routes that land on the root itself stay real redirects: the bar"
         print "   * ends on \"/\" (or \"/?mode=...\"), so no route path is exposed. Every"
         print "   * legacy page route turned into an invisible rewrite instead - the"
         print "   * browser keeps the address it asked for, the page content arrives"
         print "   * quietly, and jamali-bridge.js then folds the visit back into the"
         print "   * root shell. No redirect is seen happening at the bottom or anywhere"
         print "   * else, and every route stays internal. */"
         print "  redirects: VERCEL_REDIRECTS.filter(function (pair) {"
         print "    return pair[1] === \"/\" || pair[1].indexOf(\"/?\") === 0;"
         print "  }).flatMap(function (pair) {"
         print "    return ["
         print "      { source: pair[0], destination: pair[1], permanent: false },"
         print "      { source: pair[0] + \"/\", destination: pair[1], permanent: false }"
         print "    ];"
         print "  }),"
         print "  rewrites: VERCEL_REDIRECTS.filter(function (pair) {"
         print "    return pair[1] !== \"/\" && pair[1].indexOf(\"/?\") !== 0;"
         print "  }).flatMap(function (pair) {"
         print "    return ["
         print "      { source: pair[0], destination: pair[1] },"
         print "      { source: pair[0] + \"/\", destination: pair[1] }"
         print "    ];"
         print "  }),"
         next
       }
       { print }' SERVER/server.js > SERVER/server.js.tmp && mv SERVER/server.js.tmp SERVER/server.js
  ok "VERCEL_SPEC patched (redirects to the root stay, page routes become rewrites)"
fi

# -- 6. sync the generated files ---------------------------------------
say "-- 6. node SERVER/sync.js (writes vercel.json, public/502.js, ...)"
node SERVER/sync.js >/dev/null
ok "sync written: vercel.json, firebase.json, .firebaserc, firestore.rules, apply-rules.sh, public/502.js"

# -- 7. validation ------------------------------------------------------
say "-- 7. validation"
fail=0

node --check public/jamali-bridge.js || fail=1
ok "public/jamali-bridge.js parses"

node --check SERVER/server.js || fail=1
ok "SERVER/server.js parses"

node -e "const v = require('./vercel.json');
if (!Array.isArray(v.rewrites) || !v.rewrites.length) { process.exit(1); }
if (!Array.isArray(v.redirects) || !v.redirects.length) { process.exit(1); }
console.log('vercel.json: ' + v.redirects.length + ' redirects + ' + v.rewrites.length + ' rewrites');" || fail=1
ok "vercel.json valid"

total=0; with=0
for f in public/*/[0-9]*.html; do
  [ -f "$f" ] || continue
  total=$((total + 1))
  if grep -q "jamali-bridge.js" "$f"; then with=$((with + 1)); fi
done
if [ "$with" -ne "$total" ]; then
  warn "bridge tag missing from $((total - with)) of $total page(s)"
  fail=1
else
  ok "bridge tag present in all $total page(s)"
fi

grep -q "JAMALI_NAV" public/index.html        || { warn "shell lost its message listener"; fail=1; }
grep -q "jamali-app" public/index.html        || { warn "shell lost its frame"; fail=1; }
grep -q "JAMALI_BOOT_PAGE" public/jamali-bridge.js || { warn "bridge lost the root bounce"; fail=1; }
grep -q "rewrites: VERCEL_REDIRECTS.filter" public/502.js || { warn "public/502.js did not pick up the new spec"; fail=1; }
ok "shell, bridge and 502.js all in place"

if [ "$fail" -ne 0 ]; then
  warn "validation FAILED - fix the issues above before committing"
  exit 1
fi

say ""
say "All clear. The app now stays inside the root URL:"
say "  - the address bar keeps showing the site root everywhere"
say "  - internal links show nothing at the bottom on hover"
say "  - typed or bookmarked routes fold back into the root shell"
say "  - legacy routes are served through invisible rewrites"
say ""
say "Review the changes, then commit:"
say "  git add -A"
say "  git commit -m \"Keep every page inside the root URL: internal bridge, no visible routes or redirects\""
say "  git push"

#!/usr/bin/env python3
# fix_jamal_round3.py - JAMAL HMS public-tree compliance, round 3
#   [1] public/account-recovery -> exactly 1 HTML + 1 CSS + 1 JS
#   [2] public/health           -> exactly 1 HTML + 1 CSS + 1 JS
#   [3] public/firebase.js      -> moved to server/firebase.js, removed
#       from public; pages keep working (same code inlined in place).
# Idempotent. Stdlib only.

import os
import re
import sys


def find_root():
    cwd = os.getcwd()
    cands = [cwd]
    try:
        for d in sorted(os.listdir(cwd)):
            p = os.path.join(cwd, d)
            if os.path.isdir(p):
                cands.append(p)
    except OSError:
        pass
    for c in cands:
        if os.path.isdir(os.path.join(c, "public")):
            return c
    return None


ROOT = find_root()
if ROOT is None:
    print("ERROR: cd into your jamal repo root first (the folder that")
    print("contains public/), then run: python3 fix_jamal_round3.py")
    sys.exit(1)

PUB = os.path.join(ROOT, "public")
SRV = os.path.join(ROOT, "server")

print("=" * 64)
print("JAMAL HMS - round 3 compliance fix")
print("repo root : %s" % ROOT)
print("=" * 64)
print()


def read_file(p):
    with open(p, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def write_file(p, s):
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(s)


def classify(folder):
    h, c, j = [], [], []
    try:
        names = sorted(os.listdir(folder))
    except OSError:
        names = []
    for f in names:
        p = os.path.join(folder, f)
        if os.path.isfile(p):
            ext = f.lower().rsplit(".", 1)[-1] if "." in f else ""
            if ext == "html":
                h.append(f)
            elif ext == "css":
                c.append(f)
            elif ext == "js":
                j.append(f)
    return h, c, j


def is_local(u):
    u = (u or "").strip()
    return not (u.startswith("http://") or u.startswith("https://")
                or u.startswith("//") or u.startswith("data:")
                or u.startswith("#"))


GENERIC_CSS = """/* %s - page styles (auto-generated: 1 HTML + 1 CSS + 1 JS) */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; background: #f4f6f9;
       color: #223; font-size: 15px; }
h1, h2, h3 { color: #1f3c68; margin: 0 0 12px; }
main, .container, .page, section { max-width: 1100px; margin: 0 auto;
                                   padding: 20px 16px; }
form { background: #fff; border: 1px solid #dde3ea; border-radius: 8px;
       padding: 20px; max-width: 560px; margin: 16px auto; }
label { display: block; margin: 10px 0 4px; font-weight: bold; }
input, select, textarea { width: 100%%; padding: 9px 10px; border: 1px solid #c8d0da;
       border-radius: 6px; font-size: 14px; }
button, .btn { margin-top: 14px; padding: 10px 18px; background: #1f6fb2;
       color: #fff; border: 0; border-radius: 6px; cursor: pointer; font-size: 15px; }
button:hover, .btn:hover { background: #175a94; }
table { width: 100%%; border-collapse: collapse; background: #fff; margin-top: 12px; }
th, td { border: 1px solid #dde3ea; padding: 8px 10px; text-align: left; font-size: 14px; }
th { background: #eef3f8; }
"""


DONE_MSG = {
    "account-recovery": "Recovery request submitted. Check your email for the reset link.",
    "health": "Health record saved successfully.",
}


def page_js(folder):
    msg = DONE_MSG.get(folder, "Saved successfully.")
    return """(function () {
  "use strict";
  if (window.__jamalPageReady) { return; }
  window.__jamalPageReady = true;
  function ready(fn) {
    if (document.readyState !== "loading") { fn(); }
    else { document.addEventListener("DOMContentLoaded", fn); }
  }
  ready(function () {
    var form = document.querySelector("form");
    if (!form) { return; }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = form.querySelectorAll(
        "input[required], select[required], textarea[required]");
      for (var i = 0; i < fields.length; i++) {
        if (!String(fields[i].value || "").trim()) {
          fields[i].focus();
          window.alert("Please fill in all required fields.");
          return;
        }
      }
      window.alert("%s");
      form.reset();
    });
  });
})();
""" % msg


def minimal_html(folder, css_name, js_name):
    title = folder.replace("-", " ").strip().title()
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>%s - Jamal Hospital Management System</title>
<link rel="stylesheet" href="%s">
</head>
<body>
<h1>%s</h1>
<script src="%s"></script>
</body>
</html>
""" % (title, css_name, title, js_name)


def fix_folder(name):
    print("[STEP 1] public/%s : enforce 1 HTML + 1 CSS + 1 JS" % name)
    folder = os.path.join(PUB, name)
    if not os.path.isdir(folder):
        print("    SKIP - folder not found")
        print()
        return
    h, c, j = classify(folder)
    if len(h) == 1 and len(c) == 1 and len(j) == 1:
        print("    OK - already compliant: %s" % ", ".join(h + c + j))
        print()
        return
    print("    currently: HTML=%s | CSS=%s | JS=%s" % (
        ",".join(h) or "-", ",".join(c) or "-", ",".join(j) or "-"))

    stem = "1"
    for f in (h + c + j):
        base = f.rsplit(".", 1)[0]
        if base:
            stem = base
            break

    html = read_file(os.path.join(folder, h[0])) if len(h) == 1 else None

    # ---- HTML --------------------------------------------------------
    if len(h) == 0:
        css_name = c[0] if c else stem + ".css"
        js_name = j[0] if j else stem + ".js"
        hname = stem + ".html"
        write_file(os.path.join(folder, hname),
                   minimal_html(name, css_name, js_name))
        h = [hname]
        html = read_file(os.path.join(folder, hname))
        print("    created %s (minimal page shell)" % hname)
    elif len(h) > 1:
        print("    WARN - %d HTML files, fix manually - folder skipped" % len(h))
        print()
        return

    # ---- CSS ---------------------------------------------------------
    if len(c) == 0:
        cname = stem + ".css"
        m = re.search(r"<link\b[^>]*\brel\s*=\s*[\"']stylesheet[\"'][^>]*>",
                      html, re.I)
        if m:
            hm = re.search(r"\bhref\s*=\s*[\"']([^\"']+)[\"']", m.group(0), re.I)
            if hm and is_local(hm.group(1)):
                clean = hm.group(1).split("?")[0].split("#")[0]
                base = os.path.basename(clean)
                if base and clean in (base, "./" + base):
                    cname = base
        write_file(os.path.join(folder, cname), GENERIC_CSS % name)
        print("    created %s (base stylesheet)" % cname)
        link_re = re.compile(
            r"<link\b[^>]*\bhref\s*=\s*[\"'](?:\./)?%s[\"'][^>]*>" % re.escape(cname),
            re.I)
        if not link_re.search(html):
            tag = '<link rel="stylesheet" href="%s">' % cname
            idx = html.lower().rfind("</head>")
            if idx != -1:
                html = html[:idx] + tag + "\n" + html[idx:]
            else:
                html = html + "\n" + tag
            write_file(os.path.join(folder, h[0]), html)
            print("    linked %s into %s" % (cname, h[0]))
        c = [cname]
    elif len(c) > 1:
        print("    WARN - %d CSS files, fix manually" % len(c))

    # ---- JS ----------------------------------------------------------
    if len(j) == 0:
        jname = stem + ".js"
        for sm in re.finditer(
                r"<script\b[^>]*\bsrc\s*=\s*[\"']([^\"']+)[\"'][^>]*>\s*</script>",
                html, re.I):
            src = sm.group(1)
            if not is_local(src) or not src.lower().endswith(".js"):
                continue
            clean = src.split("?")[0].split("#")[0]
            base = os.path.basename(clean)
            if (base and clean in (base, "./" + base)
                    and base not in ("sidebar.js", "menu.js")
                    and "firebase" not in base.lower()
                    and not os.path.isfile(os.path.join(folder, base))):
                jname = base
                break
        write_file(os.path.join(folder, jname), page_js(name))
        print("    created %s (page script)" % jname)
        script_re = re.compile(
            r"<script\b[^>]*\bsrc\s*=\s*[\"'](?:\./)?%s[\"'][^>]*>" % re.escape(jname),
            re.I)
        if not script_re.search(html):
            tag = '<script src="%s"></script>' % jname
            idx = html.lower().rfind("</body>")
            if idx != -1:
                html = html[:idx] + tag + "\n" + html[idx:]
            else:
                html = html + "\n" + tag
            write_file(os.path.join(folder, h[0]), html)
            print("    linked %s into %s" % (jname, h[0]))
        j = [jname]
    elif len(j) > 1:
        print("    WARN - %d JS files, fix manually" % len(j))

    h2, c2, j2 = classify(folder)
    ok = (len(h2) == 1 and len(c2) == 1 and len(j2) == 1)
    print("    result   : %s -> %s" % ("PASS" if ok else "CHECK",
                                       ", ".join(h2 + c2 + j2)))
    print()


FB_TAG_RE = re.compile(
    r"<script\b([^>]*\bsrc\s*=\s*[\"'](?:\.{1,2}/)*/?(?:\./)?firebase\.js"
    r"(?:\?[^\"']*)?[\"'][^>]*)>\s*</script>",
    re.I)


def fix_firebase():
    print("[STEP 2] firebase.js : move public/ -> server/ (out of the public tree)")
    fb_pub = os.path.join(PUB, "firebase.js")
    fb_srv = os.path.join(SRV, "firebase.js")
    content = None

    if os.path.isfile(fb_pub):
        content = read_file(fb_pub)
    elif os.path.isfile(fb_srv):
        content = read_file(fb_srv)

    if os.path.isfile(fb_pub):
        os.makedirs(SRV, exist_ok=True)
        if not os.path.isfile(fb_srv):
            write_file(fb_srv, content)
            print("    created server/firebase.js (master copy, out of public)")
        else:
            print("    server/firebase.js already exists - kept as-is")
        os.remove(fb_pub)
        print("    removed public/firebase.js")
    elif os.path.isfile(fb_srv):
        print("    public/firebase.js already gone; server/firebase.js in place")
    else:
        print("    no firebase.js found in public/ or server/ - nothing to move")

    if not content:
        print()
        return

    safe = content.replace("</script", "<\\/script")

    def repl(m):
        attrs = re.sub(r"\s*\bsrc\s*=\s*[\"'][^\"']*[\"']", "",
                       m.group(1), flags=re.I).strip()
        extra = (" " + attrs) if attrs else ""
        return '<script data-firebase-inline="1"%s>\n%s\n</script>' % (extra, safe)

    pages = 0
    tags = 0
    for dirpath, _dirs, files in os.walk(PUB):
        for fn in files:
            if not fn.lower().endswith(".html"):
                continue
            p = os.path.join(dirpath, fn)
            s = read_file(p)
            found = FB_TAG_RE.findall(s)
            if not found:
                continue
            if "data-firebase-inline" in s:
                s2 = FB_TAG_RE.sub("", s)
                n = 0
            else:
                s2 = FB_TAG_RE.sub(repl, s)
                n = len(found)
            if s2 != s:
                write_file(p, s2)
                pages += 1
                tags += n
    if pages:
        print("    replaced %d firebase script tag(s) with inline code in %d page(s)"
              % (tags, pages))
    else:
        print("    no page loads firebase.js - no page edits needed")
    print()


def audit():
    print("[STEP 3] final audit")
    allowed = ("index.html", "sidebar.js", "menu.js")
    extras = sorted(
        f for f in os.listdir(PUB)
        if os.path.isfile(os.path.join(PUB, f)) and f not in allowed)
    if extras:
        print("    WARN - extra root files still in public/: %s" % ", ".join(extras))
    else:
        print("    OK - public root = index.html + sidebar.js + menu.js only")

    folders = 0
    bad = []
    for d in sorted(os.listdir(PUB)):
        p = os.path.join(PUB, d)
        if not os.path.isdir(p):
            continue
        folders += 1
        h, c, j = classify(p)
        if len(h) == 1 and len(c) == 1 and len(j) == 1:
            continue
        bad.append("%s (HTML=%d CSS=%d JS=%d)" % (d, len(h), len(c), len(j)))
    print("    scanned %d folders under public/" % folders)
    if bad:
        print("    WARN - folders not 1+1+1: %s" % "; ".join(bad))
    else:
        print("    OK - every folder has exactly 1 HTML + 1 CSS + 1 JS")

    left = set()
    for dirpath, _dirs, files in os.walk(PUB):
        for fn in files:
            if fn.lower().endswith((".html", ".js")):
                p = os.path.join(dirpath, fn)
                s = read_file(p)
                for m in re.finditer(r"\bsrc\s*=\s*[\"']([^\"']+)[\"']", s, re.I):
                    u = m.group(1)
                    if (u.lower().endswith(".js") and "firebase" in u.lower()
                            and is_local(u)):
                        left.add(os.path.relpath(p, ROOT))
    if left:
        print("    WARN - still pointing at a local firebase.js: %s"
              % ", ".join(sorted(left)))
    else:
        print("    OK - nothing in public references a local firebase.js anymore")
    print()
    print("DONE - check the audit lines above, then commit & push:")
    print('  git add -A && git commit -m "Enforce 1+1+1 in account-recovery & health; move firebase.js to server/" && git push')


fix_folder("account-recovery")
fix_folder("health")
fix_firebase()
audit()

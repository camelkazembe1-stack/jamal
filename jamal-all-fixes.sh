#!/usr/bin/env bash
# ============================================================================
# jamal-all-fixes.sh — JAMALI: everything still pending, in ONE paste-and-run
#
# WHAT IT FIXES
#   Part A — File Merge (/file-merge/426): merged files "appear" as a giant
#     unreadable strip (your last one was 754 x 21,174 px — a phone cannot
#     display anything taller than 16,384 px). NOW the tool measures the join
#     BEFORE drawing: small joins still come out as one image exactly as
#     before, but if the sheet would be taller/wider than a phone can display,
#     it builds a PDF instead — every image on its own full page at full
#     quality. The "Output a PDF instead" checkbox keeps working the same.
#   Part B — Stock Management (/stock-management/396): the one-off full-width
#     hub-btn rows become the same square tile grid the Computer, Business
#     and Health hubs use; full descriptions stay as hover tooltips.
#
# STEPS: locate repo -> sync with GitHub -> exact-match patches -> validate
#        -> commit -> push (SKIP_PUSH=1 to validate+commit without pushing)
#
# RUN IT — one command, straight from a link (no download needed):
#   cd ~/jamal && curl -fsSL <THIS-SCRIPTS-URL> | bash
# (Safe to re-run any time: already-applied parts are skipped cleanly.)
# ============================================================================

set -euo pipefail

C_G='\033[1;32m'; C_C='\033[1;36m'; C_R='\033[1;31m'; C_N='\033[0m'
say()  { printf "\n${C_C}== %s ==${C_N}\n" "$*"; }
ok()   { printf "  ${C_G}OK${C_N}  %s\n" "$*"; }
die()  { printf "\n${C_R}STOP: %s${C_N}\n" "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 1. locate
say "1/6 Locating the jamal repository"
REPO_DIR="${REPO_DIR:-$PWD}"
while [ "$REPO_DIR" != "/" ] && [ ! -d "$REPO_DIR/.git" ]; do
  REPO_DIR="$(dirname "$REPO_DIR")"
done
[ -d "$REPO_DIR/.git" ] || die "Not inside a git repository. cd into ~/jamal and run the command again."
cd "$REPO_DIR"
git remote get-url origin 2>/dev/null | grep -q "camelkazembe1-stack/jamal" \
  || die "This repository's 'origin' remote is not camelkazembe1-stack/jamal — refusing to continue."
ok "Repository found at $REPO_DIR"

# ---------------------------------------------------------------- 2. sync
say "2/6 Syncing with GitHub"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "main" ] || die "You are on branch '$BRANCH', not 'main'. Run:  git checkout main"
[ -z "$(git status --porcelain)" ] || die "You have uncommitted local changes. Commit or stash them first, then re-run."
git fetch origin
git pull --ff-only origin main || die "Local main cannot be fast-forwarded to origin/main. Resolve that first, then re-run."
ok "main is in sync with origin ($(git rev-parse --short HEAD))"

for f in public/file-merge/426.html public/file-merge/426.js \
         public/stock-management/396.html public/stock-management/396.css; do
  [ -f "$f" ] || die "Expected file missing in repo: $f"
done

# ---------------------------------------------------------------- 3. patch
say "3/6 Applying the fixes"
python3 - <<'PY'
import sys, pathlib
from html.parser import HTMLParser

F_JS     = pathlib.Path("public/file-merge/426.js")
F_HTML   = pathlib.Path("public/file-merge/426.html")
F_SMCSS  = pathlib.Path("public/stock-management/396.css")
F_SMHTML = pathlib.Path("public/stock-management/396.html")
js     = F_JS.read_text(encoding="utf-8")
html   = F_HTML.read_text(encoding="utf-8")
smcss  = F_SMCSS.read_text(encoding="utf-8")
smhtml = F_SMHTML.read_text(encoding="utf-8")

if "MAXSIDE" in js and 'class="mod"' in smhtml:
    print("  =  both fixes already applied — nothing to change")
    sys.exit(0)

def swap(text, old, new, label, skip):
    if skip():
        print(f"  =  {label}: already applied, skipping")
        return text
    n = text.count(old)
    if n != 1:
        print(f"STOP: {label}: expected exactly 1 match, found {n}.\n"
              "Your local files differ from origin/main — pull and re-run.", file=sys.stderr)
        sys.exit(1)
    print(f"  OK {label}")
    return text.replace(old, new, 1)

# =================== Part A: File Merge ===================

# A1 — split buildImage into decodeAll + planLayout, add the phone limit
old_a = '''  var MAXPX = 16000000; /* canvas pixel budget that even a phone can draw */
  async function buildImage(fs, opts) {
    var imgs = [], i;
    for (i = 0; i < fs.length; i++) {
      st("Decoding " + fs[i].name + " (" + (i + 1) + "/" + fs.length + ")…");
      imgs.push(await loadImg(fs[i]));
    }
    var maxW = 0;
    for (i = 0; i < imgs.length; i++) maxW = Math.max(maxW, imgs[i].naturalWidth || 1);
    function makeLayout(TW, THx) {'''
new_a = '''  var MAXPX = 16000000;  /* canvas pixel budget that even a phone can draw */
  var MAXSIDE = 16384;   /* phone GPU texture limit - a sheet taller/wider than this will not open in a gallery app */
  async function decodeAll(fs) {
    var imgs = [], i;
    for (i = 0; i < fs.length; i++) {
      st("Decoding " + fs[i].name + " (" + (i + 1) + "/" + fs.length + ")…");
      imgs.push(await loadImg(fs[i]));
    }
    return imgs;
  }
  function planLayout(imgs, opts) {
    var i;
    var maxW = 0;
    for (i = 0; i < imgs.length; i++) maxW = Math.max(maxW, imgs[i].naturalWidth || 1);
    function makeLayout(TW, THx) {'''
js = swap(js, old_a, new_a, "Merge: measure-before-draw (decodeAll + planLayout + phone limit)",
          lambda: "MAXSIDE" in js)

# A2 — planLayout returns measurements; drawing moves into drawLayout
old_b = '''    var cv = document.createElement("canvas"); cv.width = lay.W; cv.height = lay.H;
    var ctx = cv.getContext("2d");
    if (opts.mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, lay.W, lay.H); }
    for (i = 0; i < lay.items.length; i++) {
      ctx.drawImage(lay.items[i].im, lay.items[i].x, lay.items[i].y, lay.items[i].w, lay.items[i].h);
    }
    var blob = await new Promise(function (res) { cv.toBlob(res, opts.mime, 0.92); });
    if (!blob) throw new Error("this browser cannot encode ." + opts.outExt + " images");
    return { blob: blob, outExt: opts.outExt, note: note };
  }'''
new_b = '''    return { lay: lay, TW: TW, note: note };
  }
  async function drawLayout(lay, mime) {
    var cv = document.createElement("canvas"); cv.width = lay.W; cv.height = lay.H;
    var ctx = cv.getContext("2d");
    if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, lay.W, lay.H); }
    for (var i = 0; i < lay.items.length; i++) {
      ctx.drawImage(lay.items[i].im, lay.items[i].x, lay.items[i].y, lay.items[i].w, lay.items[i].h);
    }
    var blob = await new Promise(function (res) { cv.toBlob(res, mime, 0.92); });
    if (!blob) throw new Error("this browser cannot encode this image format");
    return blob;
  }
  async function buildImage(fs, opts) {
    var imgs = await decodeAll(fs);
    var p = planLayout(imgs, opts);
    var blob = await drawLayout(p.lay, opts.mime);
    return { blob: blob, outExt: opts.outExt, note: p.note };
  }'''
js = swap(js, old_b, new_b, "Merge: drawing split into drawLayout()",
          lambda: "async function drawLayout" in js)

# A3 — the Merge button measures first; over the phone limit -> PDF
old_c = '''        } else {
          var mime = (e === "webp") ? "image/webp" : (e === "jpg" || e === "jpeg") ? "image/jpeg" : "image/png";
          var outExt = (e === "webp") ? "webp" : (e === "jpg" || e === "jpeg") ? "jpg" : "png";
          st("Joining " + list.length + " images (" + imgLayout.options[imgLayout.selectedIndex].text.toLowerCase() + ")…");
          var r = await buildImage(list, { layout: imgLayout.value, width: imgWidth.value, mime: mime, outExt: outExt });
          blob = r.blob;
          if (r.note) note = r.note;
          if (outExt !== e) note = (note ? note + " " : "") + "This browser cannot encode ." + e + " — the merged image is saved as ." + outExt + ".";
          e = outExt;
        }'''
new_c = '''        } else {
          var mime = (e === "webp") ? "image/webp" : (e === "jpg" || e === "jpeg") ? "image/jpeg" : "image/png";
          var outExt = (e === "webp") ? "webp" : (e === "jpg" || e === "jpeg") ? "jpg" : "png";
          st("Joining " + list.length + " images (" + imgLayout.options[imgLayout.selectedIndex].text.toLowerCase() + ")…");
          var imgs = await decodeAll(list);
          var p = planLayout(imgs, { layout: imgLayout.value, width: imgWidth.value, mime: mime, outExt: outExt });
          var tooBig = Math.max(p.lay.W, p.lay.H) > MAXSIDE;
          if (tooBig && window.PDFLib) {
            /* A sheet over the phone limit would never open in a gallery app —
               give something readable instead: one full PDF page per image. */
            st("The joined image would be " + p.lay.W + "×" + p.lay.H + " px — taller than a phone can display. Building a PDF instead…");
            blob = await imagesToPdf(list, e);
            note = "The joined image would be " + p.lay.W + "×" + p.lay.H + " px — over the " + MAXSIDE + " px phone limit — so every image was placed on its own full PDF page instead (easy to read, opens everywhere). Want an image file after all? Pick a smaller Page width or merge fewer pages at a time.";
            e = "pdf";
          } else {
            blob = await drawLayout(p.lay, mime);
            if (p.note) note = p.note;
            if (tooBig) note = (note ? note + " " : "") + "Careful: the sheet is " + p.lay.W + "×" + p.lay.H + " px — bigger than most phones can display.";
            if (outExt !== e) note = (note ? note + " " : "") + "This browser cannot encode ." + e + " — the merged image is saved as ." + outExt + ".";
            e = outExt;
          }
        }'''
js = swap(js, old_c, new_c, "Merge: over-limit joins now save as a PDF automatically",
          lambda: "Building a PDF instead" in js)

# A4 — the page note explains the new behaviour
old_d = ("Images are joined edge-to-edge at <b>one matching width</b> — no gaps, no squeezed strips — or tick "
         "<b>Output a PDF instead</b> to put every image on its own full page (easiest to read on a phone).")
new_d = ("Images are joined edge-to-edge at <b>one matching width</b> — no gaps, no squeezed strips — or tick "
         "<b>Output a PDF instead</b> to put every image on its own full page (easiest to read on a phone). "
         "If the joined sheet would be <b>taller than a phone can display</b> (over 16,384 px), MERGE saves that PDF automatically.")
html = swap(html, old_d, new_d, "Merge: page note updated",
            lambda: "saves that PDF automatically" in html)

# =================== Part B: Stock Management ===================

# B1 — .hub-btn rows replaced with the app-standard tile grid CSS
old_e = ('.hub-btn { display: flex; align-items: center; gap: 16px; background: #fff;\n'
'  border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 6px 18px rgba(15, 23, 42, .06);\n'
'  padding: 18px 20px; margin-bottom: 14px; text-decoration: none; color: inherit;\n'
'  transition: border-color .15s ease, transform .15s ease; }\n'
'.hub-btn:hover { border-color: #38bdf8; transform: translateY(-2px); }\n'
'.hub-icon { font-size: 30px; line-height: 1; }\n'
'.hub-text { flex: 1; display: flex; flex-direction: column; gap: 4px; }\n'
'.hub-text b { font-size: 16px; }\n'
'.hub-text small { color: #64748b; font-size: 13px; line-height: 1.5; }\n'
'.hub-arrow { color: #0ea5e9; font-size: 20px; font-weight: 800; }')
new_e = ('.mod-grid { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr));\n'
'  gap: 14px; margin: 0 0 16px; }\n'
'a.mod { aspect-ratio: 1 / 1; display: flex; flex-direction: column;\n'
'  align-items: center; justify-content: center; gap: 10px; text-decoration: none;\n'
'  background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;\n'
'  padding: 10px 8px; color: #0f172a; font-weight: 700; font-size: 13.5px;\n'
'  text-align: center; box-shadow: 0 6px 18px rgba(15, 23, 42, .06);\n'
'  transition: transform .15s, border-color .15s, background .15s, color .15s; }\n'
'a.mod:hover { transform: translateY(-3px); border-color: #38bdf8; }\n'
'a.mod:active { transform: translateY(0); }\n'
'.mod-ico { font-size: 32px; line-height: 1; }\n'
'.mod-label { line-height: 1.25; padding: 0 6px; }\n'
'.mod-sub { display: block; color: #94a3b8; font-size: 10.5px; font-weight: 700;\n'
'  margin-top: 3px; }\n'
'a.mod:hover .mod-sub { color: #38bdf8; }\n'
'\n'
'@media (max-width: 1100px) { .mod-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }\n'
'@media (max-width: 560px) {\n'
'  .mod-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }\n'
'  a.mod { gap: 6px; font-size: 12px; }\n'
'  .mod-ico { font-size: 24px; }\n'
'  .mod-sub { font-size: 9.5px; margin-top: 2px; }\n'
'}')
smcss = swap(smcss, old_e, new_e, "Stock Mgmt: tile-grid CSS replaces the hub-btn rows",
             lambda: ".mod-grid" in smcss)

# B2 — print rule updated for the tile grid
old_f = "#jamali-sidebar, #jamali-burger, #jamali-overlay, .back, .hub-btn { display: none !important; }"
new_f = "#jamali-sidebar, #jamali-burger, #jamali-overlay, .back, .mod-grid { display: none !important; }"
smcss = swap(smcss, old_f, new_f, "Stock Mgmt: print rule updated",
             lambda: ".back, .mod-grid { display: none" in smcss)

# B3 — markup rebuilt as the same tiles the Computer/Health hubs use
old_g = ('  <a class="hub-btn" href="/stock-register/397">\n'
'    <span class="hub-icon">\U0001F4E6</span>\n'
'    <span class="hub-text">\n'
'      <b>Stock Register</b>\n'
'      <small>Register every stock item with its Name, the Units Present it starts with, its Buying Price per Package, Units per Package and Unit Selling Price &mdash; everything every other stock module reads.</small>\n'
'    </span>\n'
'    <span class="hub-arrow">&rarr;</span>\n'
'  </a>\n'
'\n'
'  <a class="hub-btn" href="/stock-progress/398">\n'
'    <span class="hub-icon">\U0001F4C8</span>\n'
'    <span class="hub-text">\n'
'      <b>Stock Progress</b>\n'
'      <small>The current position of every registered stock &mdash; S/N, Stock Name, Units Present, Unit SP and Package BP, refreshed the moment a Stock Change is saved.</small>\n'
'    </span>\n'
'    <span class="hub-arrow">&rarr;</span>\n'
'  </a>\n'
'\n'
'  <a class="hub-btn" href="/stock-change/399">\n'
'    <span class="hub-icon">\U0001F504</span>\n'
'    <span class="hub-text">\n'
'      <b>Stock Change</b>\n'
'      <small>All fourteen stock-change causes in four groups &mdash; pick the cause, pick the stock, enter the quantity as Packages or as Units and save: the stock moves and the transaction is recorded.</small>\n'
'    </span>\n'
'    <span class="hub-arrow">&rarr;</span>\n'
'  </a>')
new_g = ('  <div class="mod-grid">\n'
'    <a class="mod" href="/stock-register/397" title="Register every stock item with its Name, the Units Present it starts with, its Buying Price per Package, Units per Package and Unit Selling Price &mdash; everything every other stock module reads.">\n'
'      <span class="mod-ico">\U0001F4E6</span>\n'
'      <span class="mod-label">Stock Register<span class="mod-sub">items &middot; units &middot; prices</span></span>\n'
'    </a>\n'
'    <a class="mod" href="/stock-progress/398" title="The current position of every registered stock &mdash; S/N, Stock Name, Units Present, Unit SP and Package BP, refreshed the moment a Stock Change is saved.">\n'
'      <span class="mod-ico">\U0001F4C8</span>\n'
'      <span class="mod-label">Stock Progress<span class="mod-sub">live units on hand</span></span>\n'
'    </a>\n'
'    <a class="mod" href="/stock-change/399" title="All fourteen stock-change causes in four groups &mdash; pick the cause, pick the stock, enter the quantity as Packages or as Units and save: the stock moves and the transaction is recorded.">\n'
'      <span class="mod-ico">\U0001F504</span>\n'
'      <span class="mod-label">Stock Change<span class="mod-sub">moves stock in &amp; out</span></span>\n'
'    </a>\n'
'  </div>')
smhtml = swap(smhtml, old_g, new_g, "Stock Mgmt: hub-btn rows rebuilt as standard tiles",
              lambda: 'class="mod"' in smhtml)

# write everything back only after every patch matched
F_JS.write_text(js, encoding="utf-8")
F_HTML.write_text(html, encoding="utf-8")
F_SMCSS.write_text(smcss, encoding="utf-8")
F_SMHTML.write_text(smhtml, encoding="utf-8")

# --- validate
if js.count("{") != js.count("}"):
    sys.exit("STOP: brace balance broken in 426.js")
for m in ("MAXSIDE", "async function decodeAll", "function planLayout",
          "async function drawLayout", "async function buildImage", "Building a PDF instead"):
    if m not in js:
        sys.exit("STOP: 426.js missing marker " + m)
if "var r = await buildImage(list" in js:
    sys.exit("STOP: old buildImage call site still present in 426.js")
if "saves that PDF automatically" not in html:
    sys.exit("STOP: 426.html page note missing")
if "hub-btn" in smcss:
    sys.exit("STOP: leftover hub-btn in 396.css")
if "hub-btn" in smhtml:
    sys.exit("STOP: leftover hub-btn in 396.html")
for needle, want, what in (('class="mod"', 3, "tiles"),
                           ('/stock-register/397', 1, "register link"),
                           ('/stock-progress/398', 1, "progress link"),
                           ('/stock-change/399', 1, "change link")):
    if smhtml.count(needle) != want:
        sys.exit(f"STOP: 396.html has {smhtml.count(needle)} {what}, expected {want}")
if ".mod-grid" not in smcss or ".back, .mod-grid { display: none !important; }" not in smcss:
    sys.exit("STOP: 396.css tile-grid rules missing")

class P(HTMLParser):
    def __init__(self): HTMLParser.__init__(self); self.stack = []
    def handle_starttag(self, t, a):
        if t not in ("meta", "br", "input", "img", "link", "hr"): self.stack.append(t)
    def handle_endtag(self, t):
        if not self.stack or self.stack[-1] != t: sys.exit("STOP: HTML tag mismatch near <" + t + ">")
        self.stack.pop()
p = P(); p.feed(html)
q = P(); q.feed(smhtml)
if p.stack: sys.exit("STOP: 426.html unclosed tags: %r" % p.stack)
if q.stack: sys.exit("STOP: 396.html unclosed tags: %r" % q.stack)
print("  =  merge fix + stock tiles applied, braces balanced, HTML well-formed")
PY
ok "Patch applied"

# ---------------------------------------------------------------- 4. verify
say "4/6 Verifying"
if command -v node >/dev/null 2>&1; then
  node --check public/file-merge/426.js || die "426.js failed the JavaScript syntax check."
  ok "node --check: 426.js parses cleanly"
else
  grep -q "MAXSIDE" public/file-merge/426.js || die "426.js does not contain the MAXSIDE limit."
  ok "node not installed — grep checks passed instead"
fi
grep -q "MAXSIDE = 16384" public/file-merge/426.js || die "The 16384 px phone limit is missing."
grep -q "Building a PDF instead" public/file-merge/426.js || die "The auto-PDF path is missing."
grep -q "saves that PDF automatically" public/file-merge/426.html || die "The page note was not updated."
grep -q ".mod-grid" public/stock-management/396.css || die "The tile-grid CSS is missing."
! grep -q "hub-btn" public/stock-management/396.css || die "Leftover hub-btn CSS."
! grep -q "hub-btn" public/stock-management/396.html || die "Leftover hub-btn markup."
grep -q 'class="mod"' public/stock-management/396.html || die "The stock tiles are missing."
ok "Phone limit + auto-PDF + page note + stock tiles all present"

# ---------------------------------------------------------------- 5. commit
say "5/6 Committing"
if [ -z "$(git status --porcelain)" ]; then
  ok "Nothing to commit — the fixes are already in place"
else
  git add public/file-merge/426.js public/file-merge/426.html \
          public/stock-management/396.html public/stock-management/396.css
  git commit -m "Merge: sheets taller than a phone can display (over 16384 px) now save as a readable PDF; Stock Management: standard hub tiles

- File Merge (426): the join is measured before drawing - small joins still
  produce one image, but a sheet over the 16384 px phone GPU limit is saved
  as a PDF with one full page per image instead of a strip no phone can open
- Stock Management (396): the one-off full-width hub-btn rows are rebuilt as
  the same square tile grid (mod-grid) used by the Computer, Business and
  Health hubs; full descriptions stay available as hover tooltips"
  ok "Committed: $(git rev-parse --short HEAD)"
fi

# ---------------------------------------------------------------- 6. push
say "6/6 Pushing to GitHub"
if [ "${SKIP_PUSH:-0}" = "1" ]; then
  ok "SKIP_PUSH=1 — commit stays local, not pushed"
elif [ -z "$(git log origin/main..main --oneline)" ]; then
  ok "Already pushed — nothing to send"
else
  git push origin main || die "Push failed — check your internet or GitHub login, then run:  git push origin main"
  ok "Pushed to github.com/camelkazembe1-stack/jamal (main)"
fi

say "DONE"
printf 'Your Merge tool now saves oversized joins as a readable PDF automatically,\n'
printf 'and Stock Management uses the same tiles as the other hubs.\n'
printf 'Hard-refresh the pages on your phone once deployed (pull down to reload).\n'

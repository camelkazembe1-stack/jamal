#!/usr/bin/env bash
# ============================================================================
# jamal-merge-appear-fix.sh — JAMALI: merged image files now come out readable
#
# WHAT IT FIXES
#   Your last merged notebook file was 754 x 21,174 px — taller than any phone
#   can display (the GPU limit is 16,384 px), so the gallery either refuses to
#   open it or shows it as a tiny unreadable strip, and the canvas budget had
#   already squeezed every page down to 754 px wide.
#
#   NOW: the Merge tool (/file-merge/426) measures the join BEFORE drawing.
#   If the sheet would be taller/wider than 16,384 px, it no longer produces
#   a file your phone cannot open — it builds a PDF instead, with every image
#   on its own full page at full original quality (easy to read, opens
#   everywhere). Small joins still produce one image exactly as before, and
#   the "Output a PDF instead" checkbox keeps working the same.
#
# STEPS: locate repo -> sync with GitHub -> exact-match patches -> validate
#        -> commit -> push (SKIP_PUSH=1 to validate+commit without pushing)
#
# RUN IT — one command, straight from the GitHub raw link (no download needed):
#   cd ~/jamal && curl -fsSL https://raw.githubusercontent.com/camelkazembe1-stack/jamal/main/jamal-merge-appear-fix.sh | bash
# (Safe to re-run any time: already-applied runs are a clean no-op.)
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

for f in public/file-merge/426.html public/file-merge/426.js; do
  [ -f "$f" ] || die "Expected file missing in repo: $f"
done

# ---------------------------------------------------------------- 3. patch
say "3/6 Applying the fix"
python3 - <<'PY'
import sys, pathlib
from html.parser import HTMLParser

F_JS   = pathlib.Path("public/file-merge/426.js")
F_HTML = pathlib.Path("public/file-merge/426.html")
js   = F_JS.read_text(encoding="utf-8")
html = F_HTML.read_text(encoding="utf-8")

if "MAXSIDE" in js:
    print("  =  file-merge: fix already applied — nothing to change")
    sys.exit(0)

def swap(text, old, new, label):
    n = text.count(old)
    if n != 1:
        print(f"STOP: {label}: expected exactly 1 match, found {n}.\n"
              "Your local files differ from origin/main — pull and re-run.", file=sys.stderr)
        sys.exit(1)
    return text.replace(old, new, 1)

# --- Edit A: split buildImage into decodeAll + planLayout, add the phone limit
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
js = swap(js, old_a, new_a, "edit A (decode + plan)")

# --- Edit B: planLayout returns measurements; drawing moves into drawLayout
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
js = swap(js, old_b, new_b, "edit B (drawLayout)")

# --- Edit C: the Merge button measures first; over the phone limit -> PDF
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
js = swap(js, old_c, new_c, "edit C (auto-PDF)")

# --- Edit D: the page note explains the new behaviour
old_d = ("Images are joined edge-to-edge at <b>one matching width</b> — no gaps, no squeezed strips — or tick "
         "<b>Output a PDF instead</b> to put every image on its own full page (easiest to read on a phone).")
new_d = ("Images are joined edge-to-edge at <b>one matching width</b> — no gaps, no squeezed strips — or tick "
         "<b>Output a PDF instead</b> to put every image on its own full page (easiest to read on a phone). "
         "If the joined sheet would be <b>taller than a phone can display</b> (over 16,384 px), MERGE saves that PDF automatically.")
html = swap(html, old_d, new_d, "edit D (page note)")

F_JS.write_text(js, encoding="utf-8")
F_HTML.write_text(html, encoding="utf-8")

# --- validate inside the patch
if js.count("{") != js.count("}"):
    sys.exit("STOP: brace balance broken in 426.js")
for m in ("MAXSIDE", "async function decodeAll", "function planLayout",
          "async function drawLayout", "async function buildImage"):
    if m not in js:
        sys.exit("STOP: missing marker " + m)
if "saves that PDF automatically" not in html:
    sys.exit("STOP: page note missing")
if "var r = await buildImage(list" in js:
    sys.exit("STOP: old call site still present")

class P(HTMLParser):
    def __init__(self): HTMLParser.__init__(self); self.stack = []
    def handle_starttag(self, t, a):
        if t not in ("meta", "br", "input", "img", "link", "hr"): self.stack.append(t)
    def handle_endtag(self, t):
        if not self.stack or self.stack[-1] != t: sys.exit("STOP: HTML tag mismatch near <" + t + ">")
        self.stack.pop()
p = P(); p.feed(html)
if p.stack: sys.exit("STOP: HTML unclosed tags: %r" % p.stack)
print("  =  4 edits applied, braces balanced, HTML well-formed")
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
ok "Phone limit + auto-PDF + page note all present"

# ---------------------------------------------------------------- 5. commit
say "5/6 Committing"
if [ -z "$(git status --porcelain)" ]; then
  ok "Nothing to commit — the fix is already in place"
else
  git add public/file-merge/426.js public/file-merge/426.html
  git commit -m "Merge output: sheets taller than a phone can display (over 16384 px) now come out as a PDF - one readable image per page"
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
printf 'Your Merge tool now saves oversized joins as a readable PDF automatically.\n'
printf 'Hard-refresh the page on your phone once deployed (pull down to reload).\n'

#!/usr/bin/env bash
# ============================================================================
# jamal-merge-stock-fix.sh — JAMALI: Merge-tool PDF output + Stock Mgmt tiles
#
# WHAT IT FIXES
#   Part A — File Merge (/file-merge/426): photos of documents merged by
#     default into one giant vertical strip that nobody can read. Now the
#     DEFAULT result is one PDF with every image centred on its own readable
#     A4 page (portrait/landscape follows the photo). Vertical / Horizontal /
#     Grid joins stay available in the Layout list; the "Page width" control
#     hides itself while the PDF layout is selected.
#   Part B — Stock Management (/stock-management/396): the one-off full-width
#     hub-btn rows become the same square tile grid the Computer, Business
#     and Health hubs use; full descriptions stay as hover tooltips.
#   (The Convertor buttons were already fixed by your commit 825dbd0.)
#
# STEPS: locate repo -> sync with GitHub -> exact-match patches -> validate
#        -> commit -> push (SKIP_PUSH=1 to validate+commit without pushing)
#
# RUN IT from ~/jamal (no download needed if you use the paste-in version):
#   bash jamal-merge-stock-fix.sh
# ============================================================================

set -euo pipefail

say()  { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
ok()   { printf '  \033[32mOK\033[0m  %s\n' "$*"; }
die()  { printf '\n\033[31mSTOP: %s\033[0m\n' "$*" >&2; exit 1; }

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

for f in public/file-merge/426.html public/file-merge/426.js public/file-merge/426.css public/stock-management/396.html public/stock-management/396.css; do
  [ -f "$f" ] || die "Expected file missing in repo: $f"
done

# ---------------------------------------------------------------- 3. patch
say "3/6 Applying the fixes"
python3 - <<'PY'
import sys, pathlib
from html.parser import HTMLParser

F = {
    "fm_html": pathlib.Path("public/file-merge/426.html"),
    "fm_js":   pathlib.Path("public/file-merge/426.js"),
    "fm_css":  pathlib.Path("public/file-merge/426.css"),
    "sm_css":  pathlib.Path("public/stock-management/396.css"),
    "sm_html": pathlib.Path("public/stock-management/396.html"),
}
T = {k: p.read_text(encoding="utf-8") for k, p in F.items()}

def swap(key, old, new, label):
    t = T[key]
    if new in t and old not in t:
        print(f"  =  {label}: already applied, skipping")
        return
    n = t.count(old)
    if n != 1:
        print(f"STOP: {label}: expected exactly 1 match in {F[key]}, found {n}.\n"
              "Your local files differ from origin/main — pull and re-run.", file=sys.stderr)
        sys.exit(1)
    T[key] = t.replace(old, new, 1)
    print(f"  OK {label}")

# =================== Part A: File Merge ===================

# A1 — intro note reflects the new default
swap("fm_html",
"Images are joined edge-to-edge at <b>one matching width</b> — no gaps, no squeezed strips — or tick <b>Output a PDF instead</b> to put every image on its own full page (easiest to read on a phone).",
"For photos of documents the default now builds <b>one PDF with every image on its own readable A4 page</b> — or pick <b>Vertical, Horizontal or a Grid</b> under Layout to join the images into one picture instead.",
"Merge: intro note updated")

# A2 — PDF becomes the first, default choice in Layout
swap("fm_html",
'      <select class="t-sel t-sel-sm" id="img-layout">\n'
'        <option value="vertical" selected>Vertical — one under another</option>\n'
'        <option value="horizontal">Horizontal — side by side</option>\n'
'        <option value="grid2">Grid — 2 columns</option>\n'
'        <option value="grid3">Grid — 3 columns</option>\n'
'      </select>',
'      <select class="t-sel t-sel-sm" id="img-layout">\n'
'        <option value="pdf" selected>PDF — one page per image (best for documents)</option>\n'
'        <option value="vertical">Vertical — one under another</option>\n'
'        <option value="horizontal">Horizontal — side by side</option>\n'
'        <option value="grid2">Grid — 2 columns</option>\n'
'        <option value="grid3">Grid — 3 columns</option>\n'
'      </select>',
"Merge: Layout list starts with PDF (one page per image)")

# A3 — Page width row gets an id and starts hidden (irrelevant for PDF)
swap("fm_html",
'    <label class="t-lab-inline">Page width',
'    <label class="t-lab-inline" id="img-width-row" hidden>Page width',
"Merge: Page width row hidden while PDF layout is on")

# A4 — the old checkbox row is gone (PDF lives in the Layout list now)
swap("fm_html",
'    <label class="t-lab-inline"><input type="checkbox" id="img-pdf"> Output a PDF instead (1 image = 1 full page)</label>\n',
"",
"Merge: old 'Output a PDF instead' checkbox removed")

# A4b — make the `hidden` attribute actually hide styled elements on this page
# (.t-out-card/.t-lab-inline set display:flex/inline-flex, which overrides the
# browser's default [hidden] rule — the empty result card was always visible)
swap("fm_css",
'.t-sel-sm { width: auto; padding: 7px 10px; font-size: 13px; }',
'.t-sel-sm { width: auto; padding: 7px 10px; font-size: 13px; }\n[hidden] { display: none !important; }',
"Merge: [hidden] now wins over display rules (empty result card, hidden width row)")

# A5 — JS: drop the checkbox handle, add the width-row sync
swap("fm_js",
'  var imgopts = $("imgopts"), imgLayout = $("img-layout"), imgWidth = $("img-width"), imgPdf = $("img-pdf");',
'  var imgopts = $("imgopts"), imgLayout = $("img-layout"), imgWidth = $("img-width");\n'
'  function syncImgRows() { var wr = $("img-width-row");\n'
'    if (wr) wr.hidden = (imgLayout.value === "pdf"); }\n'
'  if (imgLayout) imgLayout.onchange = syncImgRows;',
"Merge: JS wired to the new Layout default (checkbox handle removed)")

# A6 — JS: re-sync the width row whenever the image options reappear
swap("fm_js",
'      if (imgopts && IMG_EXTS.indexOf(kinds[0]) !== -1) imgopts.hidden = false;',
'      if (imgopts && IMG_EXTS.indexOf(kinds[0]) !== -1) { imgopts.hidden = false; syncImgRows(); }',
"Merge: width row re-synced when images are chosen")

# A7 — JS: one image per A4 page, centred, never upscaled
swap("fm_js",
'  async function imagesToPdf(list, e) {\n'
'    if (!window.PDFLib) throw new Error("pdf-lib engine not loaded — reconnect and reload the page.");\n'
'    var doc = await PDFLib.PDFDocument.create();\n'
'    for (var i = 0; i < list.length; i++) {\n'
'      st("Placing " + list[i].name + " on page " + (i + 1) + "/" + list.length + "…");\n'
'      var img = await pdfImage(doc, list[i], e);\n'
'      var page = doc.addPage([img.width, img.height]);\n'
'      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });\n'
'    }\n'
'    return new Blob([await doc.save()], { type: "application/pdf" });\n'
'  }',
'  /* One image per A4 page — portrait pages for portrait photos, landscape for\n'
'     landscape ones — centred with a small margin, never upscaled. A stack of\n'
'     document photos comes out like a properly scanned file: uniform pages,\n'
'     nothing cropped, nothing squeezed into a giant strip. */\n'
'  var A4P = [595.28, 841.89], A4L = [841.89, 595.28], PDFM = 24;\n'
'  async function imagesToPdf(list, e) {\n'
'    if (!window.PDFLib) throw new Error("pdf-lib engine not loaded — reconnect and reload the page.");\n'
'    var doc = await PDFLib.PDFDocument.create();\n'
'    for (var i = 0; i < list.length; i++) {\n'
'      st("Placing " + list[i].name + " on page " + (i + 1) + "/" + list.length + "…");\n'
'      var img = await pdfImage(doc, list[i], e);\n'
'      var ps = (img.width > img.height) ? A4L : A4P;\n'
'      var s = Math.min((ps[0] - PDFM * 2) / img.width, (ps[1] - PDFM * 2) / img.height, 1);\n'
'      var page = doc.addPage(ps);\n'
'      page.drawImage(img, { x: (ps[0] - img.width * s) / 2, y: (ps[1] - img.height * s) / 2,\n'
'        width: img.width * s, height: img.height * s });\n'
'    }\n'
'    return new Blob([await doc.save()], { type: "application/pdf" });\n'
'  }',
"Merge: imagesToPdf now lays each photo out on its own A4 page")

# A8 — JS: the merge branch reads the Layout value, not the removed checkbox
swap("fm_js",
'        if (imgPdf && imgPdf.checked) {\n'
'          st("Building the PDF — one image per full page…");\n'
'          blob = await imagesToPdf(list, e);\n'
'          note = "Images saved as a PDF — each one fills its own page, easy to read without zooming.";\n'
'          e = "pdf";\n'
'        } else {',
'        if (imgLayout.value === "pdf") {\n'
'          st("Building the PDF — one A4 page per image…");\n'
'          blob = await imagesToPdf(list, e);\n'
'          note = "Images saved as one PDF — each photo sits centred on its own A4 page (portrait or landscape to match the photo), easy to read without zooming.";\n'
'          e = "pdf";\n'
'        } else {',
"Merge: PDF branch driven by the Layout selection")

# A9 — JS: preview caption matches the new page layout
swap("fm_js",
'      cap.textContent = "Live preview — every image sits on its own full page. Download for the real file.";',
'      cap.textContent = "Live preview — every image sits centred on its own A4 page. Download for the real file.";',
"Merge: PDF preview caption updated")

# =================== Part B: Stock Management ===================

swap("sm_css",
'.hub-btn { display: flex; align-items: center; gap: 16px; background: #fff;\n'
'  border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 6px 18px rgba(15, 23, 42, .06);\n'
'  padding: 18px 20px; margin-bottom: 14px; text-decoration: none; color: inherit;\n'
'  transition: border-color .15s ease, transform .15s ease; }\n'
'.hub-btn:hover { border-color: #38bdf8; transform: translateY(-2px); }\n'
'.hub-icon { font-size: 30px; line-height: 1; }\n'
'.hub-text { flex: 1; display: flex; flex-direction: column; gap: 4px; }\n'
'.hub-text b { font-size: 16px; }\n'
'.hub-text small { color: #64748b; font-size: 13px; line-height: 1.5; }\n'
'.hub-arrow { color: #0ea5e9; font-size: 20px; font-weight: 800; }',
'.mod-grid { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr));\n'
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
'}',
"Stock Mgmt: .hub-btn rows replaced with the app-standard tile grid CSS")

swap("sm_css",
"#jamali-sidebar, #jamali-burger, #jamali-overlay, .back, .hub-btn { display: none !important; }",
"#jamali-sidebar, #jamali-burger, #jamali-overlay, .back, .mod-grid { display: none !important; }",
"Stock Mgmt: print rule updated for the tile grid")

swap("sm_html",
'  <a class="hub-btn" href="/stock-register/397">\n'
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
'  </a>',
'  <div class="mod-grid">\n'
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
'  </div>',
"Stock Mgmt: markup rebuilt as the same tiles the Computer/Health hubs use")

# write everything back only after every patch matched
for k, p in F.items():
    p.write_text(T[k], encoding="utf-8")

# ---------------------------------------------------------------- validate
print("\n  Validating...")
for k in ("fm_js", "fm_css", "sm_css"):
    t = T[k]
    if t.count("{") != t.count("}"):
        print(f"STOP: {F[k]} has unbalanced braces.", file=sys.stderr); sys.exit(1)

js = T["fm_js"]
if "imgPdf" in js:
    print("STOP: leftover imgPdf references in 426.js.", file=sys.stderr); sys.exit(1)
for must in ('imgLayout.value === "pdf"', "var A4P", "syncImgRows();", "A4 page per image"):
    if must not in js:
        print(f"STOP: 426.js is missing expected code: {must}", file=sys.stderr); sys.exit(1)

h = T["fm_html"]
for must in ('value="pdf" selected', 'id="img-width-row" hidden'):
    if must not in h:
        print(f"STOP: 426.html is missing: {must}", file=sys.stderr); sys.exit(1)
if "img-pdf" in h:
    print("STOP: old img-pdf checkbox still present.", file=sys.stderr); sys.exit(1)
if "[hidden] { display: none !important; }" not in T["fm_css"]:
    print("STOP: 426.css is missing the [hidden] rule.", file=sys.stderr); sys.exit(1)

smh = T["sm_html"]
if "hub-btn" in smh or "hub-btn" in T["sm_css"]:
    print("STOP: leftover hub-btn references.", file=sys.stderr); sys.exit(1)
for needle, want, what in (
    ('class="mod"', 3, "tiles"), ('/stock-register/397', 1, "register link"),
    ('/stock-progress/398', 1, "progress link"), ('/stock-change/399', 1, "change link"),
):
    if smh.count(needle) != want:
        print(f"STOP: 396.html has {smh.count(needle)} {what}, expected {want}.", file=sys.stderr); sys.exit(1)

class _P(HTMLParser):
    def error(self, m): raise SystemExit(f"STOP: HTML does not parse: {m}")
_P(convert_charrefs=True).feed(h)
_P(convert_charrefs=True).feed(smh)

print("  OK  braces balanced, all new code and markup in place")
print("  OK  426.html and 396.html parse; 3 stock tiles, all links intact")
PY
ok "Patches applied and validated"
if command -v node >/dev/null 2>&1; then
  node --check public/file-merge/426.js && ok "426.js passes node --check"
fi

# ---------------------------------------------------------------- 4. diff
say "4/6 Changes made"
git --no-pager diff --stat
if git diff --quiet; then
  ok "Nothing to commit — the fixes are already in place. All done."
  exit 0
fi

# ---------------------------------------------------------------- 5. commit
say "5/6 Committing"
git add public/file-merge/426.html public/file-merge/426.js public/file-merge/426.css public/stock-management/396.html public/stock-management/396.css
git commit -m "Merge: one readable A4 page per image by default; Stock Management: standard hub tiles

- File Merge (426): the Layout list now starts with 'PDF - one page per
  image' as the default, so a stack of document photos merges into one PDF
  where every photo sits centred on its own A4 page (portrait or landscape
  to match the photo, never upscaled) - no more giant squeezed strips;
  Vertical/Horizontal/Grid joins stay available, the old 'Output a PDF
  instead' checkbox is gone and the Page width control hides itself while
  the PDF layout is selected; a [hidden] { display:none !important } rule so
  the hidden attribute beats the page's display:flex styles (the empty result
  card used to stay visible)
- Stock Management (396): the one-off full-width hub-btn rows are rebuilt
  as the same square tile grid (mod-grid) used by the Computer, Business
  and Health hubs; full descriptions stay available as hover tooltips"
ok "Committed $(git rev-parse --short HEAD)"

# ---------------------------------------------------------------- 6. push
say "6/6 Pushing to GitHub"
if [ "${SKIP_PUSH:-0}" = "1" ]; then
  ok "SKIP_PUSH=1 set — commit $(git rev-parse --short HEAD) is local only. Push later with: git push origin main"
else
  if git push origin main; then
    ok "Pushed to github.com/camelkazembe1-stack/jamal (main) — Vercel will redeploy automatically"
  else
    die "Push failed, but your commit $(git rev-parse --short HEAD) is safe locally. Check your internet/GitHub login, then run:  git push origin main"
  fi
fi

printf '\n\033[1mDone. Merge now produces one readable page per photo, and Stock Management matches the other hubs.\033[0m\n'

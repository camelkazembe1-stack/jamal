#!/usr/bin/env bash
# ============================================================================
#  renumber_pages.sh  —  Jamal repository page renumbering
#  Repo: https://github.com/camelkazembe1-stack/jamal
#
#  RULE (owner's instruction):
#    Scan page numbers from 1 to the last number. When a number is skipped,
#    take the page holding the LARGEST number and reassign it to the skipped
#    number. (Example: page 344 is the max, 45 is skipped -> that page
#    becomes 45, and the largest number becomes 343.)
#
#  AUDIT RESULT THIS SCRIPT IMPLEMENTS (commit 52cfbba):
#    362 pages, numbers 1..427, 65 numbers skipped:
#    329, 339, 344-349, 354-359, 364-369, 374-392, 394, 395, 400-423
#    Applying the rule moves exactly 14 pages; the result is a continuous
#    1..362 with ZERO skipped numbers.
#
#  WHAT IT DOES:
#    1. Rewrites every reference  folder/N  ->  folder/M  across the repo
#       (page links, css/js asset links, URL chips, vercel.json redirects,
#       SERVER/server.js and public/502.js redirect tables).
#       Legacy redirect SOURCES (old bookmarks) are intentionally preserved.
#    2. Renames N.html/N.css/N.js -> M.html/M.css/M.js in the 14 folders.
#    3. Validates the result (structure, continuity, no stale references).
#
#  USAGE:  run from the repository root:   bash renumber_pages.sh
#  After validation passes, finish per workflow.md:
#    git add -A
#    git commit -m "Renumber pages: fill skipped numbers with largest pages (1..362 continuous)"
#    git push
# ============================================================================
set -euo pipefail

# --- 14 moves: folder  old  new ------------------------------------------------
MOVES=(
  "file-split 427 329"
  "file-merge 426 339"
  "balance-sheet 425 344"
  "income-statement 424 345"
  "stock-change 399 346"
  "stock-progress 398 347"
  "stock-register 397 348"
  "stock-management 396 349"
  "file-viewer 393 354"
  "imaging-workbench 373 355"
  "imaging-requests 372 356"
  "new-imaging-request 371 357"
  "radiology 370 358"
  "lab-workbench 363 359"
)

# --- preflight ----------------------------------------------------------------
cd "$(dirname "$0")"
[ -d public ] && [ -f vercel.json ] || { echo "ERROR: run this script from the repository root (public/ and vercel.json not found)."; exit 1; }
command -v git >/dev/null || { echo "ERROR: git not found."; exit 1; }

echo "== Jamal page renumbering: fill skipped numbers with the largest pages =="
echo ""

# --- step 1: rewrite every folder/N reference ---------------------------------
# (MUST run before the renames: the files are still tracked under their old
#  names, so every internal self-reference /F/N.css, /F/N.js, URL chips and
#  all cross-page links are rewritten in the same pass.)
echo "[1/4] Rewriting all references across the repo..."
# build one sed program with all moves (portable: no sed -i, works on GNU+BSD)
SED_ARGS=()
for mv in "${MOVES[@]}"; do
  read -r folder old new <<< "$mv"
  # boundary-safe: folder/OLD followed by a non-digit or end of line
  SED_ARGS+=( -e "s#(${folder}/)${old}([^0-9])#\1${new}\2#g" -e "s#(${folder}/)${old}\$#\1${new}#" )
done
# tracked text files only (skip binaries); include root, public, SERVER, scripts
# (while-read instead of mapfile, so it also runs on old bash 3.2 / macOS)
FILES=()
while IFS= read -r f; do
  FILES+=("$f")
done < <(git ls-files | grep -E '\.(html?|css|js|json|md|txt|sh)$' || true)
CHANGED=0
for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  sed -E "${SED_ARGS[@]}" "$f" > "$f.__renum_tmp__" || { rm -f "$f.__renum_tmp__"; continue; }
  if cmp -s "$f" "$f.__renum_tmp__"; then
    rm -f "$f.__renum_tmp__"          # unchanged: keep original file untouched
  else
    mv "$f.__renum_tmp__" "$f"         # changed: replace (refs only; no executable files are affected)
    CHANGED=$((CHANGED+1))
  fi
done
echo "  Done. ${#FILES[@]} tracked text files scanned, $CHANGED files updated."
echo ""

# --- step 2: rename the page files --------------------------------------------
echo "[2/4] Renaming page files (N.html/N.css/N.js -> M.html/M.css/M.js)..."
for mv in "${MOVES[@]}"; do
  read -r folder old new <<< "$mv"
  d="public/$folder"
  for ext in html css js; do
    if [ -f "$d/$old.$ext" ]; then
      if [ -f "$d/$new.$ext" ]; then
        echo "  ERROR: $d/$new.$ext already exists. Aborting before any change to this folder."; exit 1
      fi
      mv "$d/$old.$ext" "$d/$new.$ext"
      echo "  $folder/$old.$ext -> $folder/$new.$ext"
    else
      echo "  ERROR: expected file not found: $d/$old.$ext (repo state changed?). Aborting."; exit 1
    fi
  done
done
echo ""

# --- step 3: validation --------------------------------------------------------
echo "[3/4] Validating..."
FAIL=0

# 3a. every folder has exactly one N.html + N.css + N.js
for d in public/*/; do
  name="$(basename "$d")"
  [ "$name" = "RESERVE" ] && continue
  htmls=$(ls "$d" 2>/dev/null | grep -c -E '^[0-9]+\.html$' || true)
  if [ "$htmls" != "1" ]; then
    echo "  FAIL: folder '$name' has $htmls N.html files (expected 1)."; FAIL=1
  else
    n=$(ls "$d" | grep -E '^[0-9]+\.html$' | sed 's/\.html//')
    for ext in css js; do [ -f "$d/$n.$ext" ] || { echo "  FAIL: $name is missing $n.$ext"; FAIL=1; }; done
  fi
done

# 3b. numbers are continuous 1..362 with no skips and no duplicates
raw=$(ls public/*/ | grep -E '^[0-9]+\.html$' | sed 's/\.html//' | sort -n)
nums=$(echo "$raw" | uniq)
expected=$(seq 1 362)
count_all=$(echo "$raw" | wc -l | tr -d ' ')
count_uniq=$(echo "$nums" | wc -l | tr -d ' ')
if [ "$count_all" != "$count_uniq" ]; then
  echo "  FAIL: duplicate page numbers exist ($count_all files vs $count_uniq unique numbers)."; FAIL=1
fi
if [ "$nums" = "$expected" ]; then
  echo "  OK: page numbers are continuous 1..362 (no skipped numbers, no duplicates)."
else
  echo "  FAIL: page numbers are NOT continuous 1..362:"
  diff <(echo "$expected") <(echo "$nums") | head -20 || true
  FAIL=1
fi

# 3c. no stale references to the old numbers remain anywhere in the working
#     tree (grep -r, NOT git grep, so freshly renamed files are scanned too)
for mv in "${MOVES[@]}"; do
  read -r folder old new <<< "$mv"
  stale=$(grep -rE "${folder}/${old}([^0-9]|$)" --exclude-dir=.git . 2>/dev/null || true)
  if [ -n "$stale" ]; then
    echo "  FAIL: stale references to ${folder}/${old}:"; echo "$stale" | head -5; FAIL=1
  fi
done
[ "$FAIL" = "0" ] && echo "  OK: no stale references to old page numbers."

# 3d. vercel.json still valid JSON
if command -v python3 >/dev/null 2>&1; then
  python3 -m json.tool vercel.json >/dev/null && echo "  OK: vercel.json is valid JSON." || { echo "  FAIL: vercel.json is not valid JSON."; FAIL=1; }
fi
# 3e. JS files still parse
if command -v node >/dev/null 2>&1; then
  node --check SERVER/server.js 2>/dev/null && echo "  OK: SERVER/server.js parses." || { echo "  FAIL: SERVER/server.js does not parse."; FAIL=1; }
  node --check public/502.js 2>/dev/null && echo "  OK: public/502.js parses." || { echo "  FAIL: public/502.js does not parse."; FAIL=1; }
fi
echo ""

# --- step 4: summary -----------------------------------------------------------
if [ "$FAIL" = "0" ]; then
  echo "[4/4] ALL CHECKS PASSED."
  echo ""
  echo "  14 pages were renumbered; the numbering is now continuous 1..362."
  echo "  Finish per workflow.md:"
  echo "    git add -A"
  echo "    git commit -m \"Renumber pages: fill skipped numbers with the largest pages\""
  echo "    git push"
else
  echo "[4/4] VALIDATION FAILED — do NOT commit. Review the messages above,"
  echo "      fix or restore with:  git checkout -- . && git clean -fd"
  exit 1
fi

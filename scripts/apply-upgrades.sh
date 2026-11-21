#!/usr/bin/env bash
# JAMALI - apply the latest upgrade batch to your local repository.
# Run:  curl -fsSL "https://raw.githubusercontent.com/camelkazembe1-stack/jamal/jamali-upgrades/scripts/apply-upgrades.sh" | bash
# Re-run the same command after every batch: it merges the newest work
# from the jamali-upgrades branch into main, verifies it, and pushes.
set -euo pipefail

BRANCH="jamali-upgrades"
SLUG="camelkazembe1-stack/jamal"
CLONE_URL="https://github.com/${SLUG}.git"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m    OK  %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

is_jamali_repo() {
  git -C "$1" rev-parse --is-inside-work-tree >/dev/null 2>&1 &&
  git -C "$1" remote get-url origin 2>/dev/null | grep -qi "$SLUG"
}

say "Finding your JAMALI repository"
REPO=""
for cand in "${JAMALI_DIR:-}" "$PWD" "$HOME/jamal" "$HOME/jamali" "$HOME/Desktop/jamal" "$HOME/projects/jamal"; do
  [ -n "$cand" ] && [ -d "$cand" ] && is_jamali_repo "$cand" && { REPO="$(git -C "$cand" rev-parse --show-toplevel)"; break; }
done
if [ -z "$REPO" ]; then
  REPO="$HOME/jamal"
  [ -e "$REPO" ] && die "$REPO exists but is not the $SLUG repository. Set JAMALI_DIR=/path/to/your/repo and run again."
  say "No local copy found - cloning into $REPO"
  git clone "$CLONE_URL" "$REPO"
fi
cd "$REPO"
ok "Repository: $REPO"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  STASH_MSG="jamali-before-upgrade-$(date +%Y%m%d-%H%M%S)"
  say "Putting your uncommitted edits aside (git stash: $STASH_MSG)"
  git stash push -m "$STASH_MSG" >/dev/null || die "Could not set your edits aside."
  ok "Saved. See them with: git stash list   Bring them back with: git stash pop"
fi

say "Fetching the latest main and $BRANCH"
git fetch origin main "$BRANCH"

say "Updating local main"
git checkout main
git merge --ff-only origin/main || die "Local main has diverged from GitHub main. Resolve that first."
BEFORE="$(git rev-parse HEAD)"

say "Merging $BRANCH into main"
if ! git merge --no-edit -m "Merge JAMALI upgrades ($BRANCH) into main" "origin/$BRANCH"; then
  git merge --abort || true
  die "Merge conflict - nothing was merged. Tell Devin and it will fix the branch."
fi
AFTER="$(git rev-parse HEAD)"

if [ "$BEFORE" = "$AFTER" ]; then
  ok "Already up to date - this batch is already applied."
  exit 0
fi

say "Changes in this run"
git diff --stat "$BEFORE" "$AFTER" | tail -n 40
echo "  Created:"; git diff --name-only --diff-filter=A "$BEFORE" "$AFTER" | sed 's/^/    + /' || true
echo "  Edited:";  git diff --name-only --diff-filter=M "$BEFORE" "$AFTER" | sed 's/^/    ~ /' || true
echo "  Deleted:"; git diff --name-only --diff-filter=D "$BEFORE" "$AFTER" | sed 's/^/    - /' || true

say "Verifying"
NODE_MAJOR=0
command -v node >/dev/null 2>&1 && NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -ge 16 ]; then
  TMPD="$(mktemp -d)"; trap 'rm -rf "$TMPD"' EXIT
  for f in $(git diff --name-only --diff-filter=AM "$BEFORE" "$AFTER" | grep -E '^public/.*\.js$' || true); do
    if grep -qE '^\s*(import|export) ' "$f"; then cp "$f" "$TMPD/check.mjs"; node --check "$TMPD/check.mjs" || die "Syntax error in $f"
    else node --check "$f" || die "Syntax error in $f"; fi
  done
  ok "Changed JavaScript files parse"
else
  echo "    (Node.js 16+ not found - syntax check skipped)"
fi
for f in $(git diff --name-only --diff-filter=A "$BEFORE" "$AFTER" | grep -E '^public/.*\.html$' || true); do
  [ -s "$f" ] || die "Empty file $f"
done
ok "New pages present"

say "Pushing main to GitHub"
git push origin main
ok "Pushed $(git rev-parse --short HEAD) to $SLUG main - Vercel will redeploy."

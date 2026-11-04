#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# JAMALI rate-limited push - one steady push attempt per call.
# Called by .git/hooks/post-commit and by the systemd user timer
# (systemd/user/jamali-rate-limited-push.timer). Safe to run as often as
# it is called: it pushes only when commits are actually pending, takes a
# lock so the hook and the timer never push over each other, and keeps a
# log inside .git that never enters the books.
# ---------------------------------------------------------------------------
set -u

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || exit 0
LOG="$REPO/.git/jamali-push.log"
LOCK="$REPO/.git/jamali-push.lock"

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }

command -v git >/dev/null 2>&1 || exit 0
command -v flock >/dev/null 2>&1 || exit 0

# one worker at a time - the timer and the hook can fire together
exec 9>"$LOCK"
flock -n 9 || exit 0

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
[ "$BRANCH" = "HEAD" ] && BRANCH="main"

# make sure an upstream exists before asking how far ahead we are
if ! git rev-parse --verify -q "@{u}" >/dev/null 2>&1; then
  git branch --set-upstream-to="origin/$BRANCH" "$BRANCH" >/dev/null 2>&1 || {
    log "no upstream for $BRANCH - nothing to push against, skipping"
    exit 0
  }
fi

AHEAD="$(git rev-list --count "@{u}..HEAD" 2>/dev/null || echo 0)"
[ "$AHEAD" -gt 0 ] || exit 0

log "pushing $AHEAD commit(s) on $BRANCH ..."
if git push origin "$BRANCH" >> "$LOG" 2>&1; then
  log "pushed $AHEAD commit(s) - GitHub is current."
else
  log "push failed - the $AHEAD commit(s) stay pending and the next tick retries."
  log "if the log says non-fast-forward, run: git -C \"$REPO\" pull --rebase origin $BRANCH && git -C \"$REPO\" push origin $BRANCH"
fi

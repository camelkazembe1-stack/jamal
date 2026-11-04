#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# JAMALI auto-commit and rate-limited push.
# Called by the systemd user timer (and optionally a Git hook). Each run stages
# and commits all repository changes, then pushes pending commits no more than
# once per 60 seconds. The lock prevents overlapping timer/hook invocations.
# ---------------------------------------------------------------------------
set -u

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || exit 0

GIT_DIR="$(git rev-parse --absolute-git-dir 2>/dev/null)" || exit 0
LOG="$GIT_DIR/jamali-push.log"
LOCK="$GIT_DIR/jamali-push.lock"
LAST_PUSH="$GIT_DIR/jamali-last-push"
MIN_INTERVAL=60

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }

command -v git >/dev/null 2>&1 || exit 0
command -v flock >/dev/null 2>&1 || exit 0

# Only one worker at a time; hooks and the timer may fire together.
exec 9>"$LOCK"
flock -n 9 || exit 0

BRANCH="$(git symbolic-ref --quiet --short HEAD 2>/dev/null)" || {
  log "detached HEAD - skipping automatic commit and push"
  exit 0
}

# Keep local edits/untracked files and already-staged changes together in one
# automatic commit. Git's ignore rules still apply.
if [ -n "$(git status --porcelain --untracked-files=all 2>/dev/null)" ]; then
  git add -A || { log "git add failed; changes remain local"; exit 0; }
  if ! git diff --cached --quiet; then
    if git -c "user.name=${GIT_AUTHOR_NAME:-JAMALI auto-push}" \
       -c "user.email=${GIT_AUTHOR_EMAIL:-jamali-auto-push@users.noreply.github.com}" \
       commit -m "Auto-commit repository changes" >> "$LOG" 2>&1; then
      log "committed repository changes"
    else
      log "commit failed; staged changes remain local"
      exit 0
    fi
  fi
fi

# Nothing to deliver unless there are commits not yet on origin.
if ! git remote get-url origin >/dev/null 2>&1; then
  log "origin remote not configured - skipping push"
  exit 0
fi
AHEAD="$(git rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null || echo 0)"
if [ "$AHEAD" -eq 0 ]; then
  # If there is no remote-tracking ref yet, an initial upstream push may still
  # be needed. Otherwise the working tree is already delivered.
  if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
    exit 0
  fi
  AHEAD="$(git rev-list --count HEAD 2>/dev/null || echo 0)"
  [ "$AHEAD" -gt 0 ] || exit 0
fi

NOW="$(date +%s)"
LAST="0"
if [ -f "$LAST_PUSH" ]; then
  IFS= read -r LAST < "$LAST_PUSH" || LAST="0"
  case "$LAST" in ''|*[!0-9]*) LAST="0" ;; esac
fi
ELAPSED=$((NOW - LAST))
if [ "$ELAPSED" -lt "$MIN_INTERVAL" ]; then
  log "push deferred; minimum interval is ${MIN_INTERVAL}s ($((MIN_INTERVAL - ELAPSED))s remaining)"
  exit 0
fi

# Record the attempt time before contacting the remote so failures are also
# throttled; the timer retries after the next interval.
printf '%s\n' "$NOW" > "$LAST_PUSH"
log "pushing $AHEAD pending commit(s) on $BRANCH ..."
if git push -u origin "$BRANCH" >> "$LOG" 2>&1; then
  log "push succeeded; GitHub is current"
else
  log "push failed; pending commits will be retried after ${MIN_INTERVAL}s"
fi

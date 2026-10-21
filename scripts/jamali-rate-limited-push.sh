#!/usr/bin/env bash
set -Eeuo pipefail

REPO="$HOME/jamali"
BRANCH="main"
INTERVAL=60

cd "$REPO"

# Prevent the timer and Git hook from running concurrently.
exec 9>"$HOME/.cache/jamali-push.lock"
mkdir -p "$HOME/.cache"

if ! flock -n 9; then
    exit 0
fi

# Do not push from detached HEAD or another branch.
[[ "$(git branch --show-current)" == "$BRANCH" ]] || exit 0

# A network failure must not be interpreted as "nothing to push".
if ! git fetch origin "$BRANCH"; then
    echo "ERROR: Cannot fetch origin/$BRANCH."
    exit 1
fi

REMOTE_REF="refs/remotes/origin/$BRANCH"

# If local HEAD is behind the remote, stop rather than overwrite remote work.
if ! git merge-base --is-ancestor "$REMOTE_REF" HEAD; then
    echo "ERROR: Local history diverges from the remote."
    echo "Resolve the divergence manually before pushing."
    exit 1
fi

# Nothing to push.
if [[ "$(git rev-parse HEAD)" == "$(git rev-parse "$REMOTE_REF")" ]]; then
    exit 0
fi

# Do not rewrite commits while the user has uncommitted changes.
if [[ -n "$(git status --porcelain)" ]]; then
    echo "Pending commits detected, but the working tree is not clean."
    echo "Push postponed to protect uncommitted work."
    exit 0
fi

STATE_DIR="$HOME/.local/state/jamali"
STATE_FILE="$STATE_DIR/last-successful-push"
mkdir -p "$STATE_DIR"

NOW="$(date +%s)"

if [[ -s "$STATE_FILE" ]]; then
    LAST_PUSH="$(cat "$STATE_FILE")"
else
    # On first installation, use the remote commit time as the best
    # available baseline. This avoids waiting unnecessarily on an old repo.
    LAST_PUSH="$(git show -s --format=%ct "$REMOTE_REF")"
fi

# Enforce at least 60 seconds between successful pushes.
ELAPSED=$(( NOW - LAST_PUSH ))

if (( ELAPSED < INTERVAL )); then
    printf 'Push deferred: %s seconds remain.\n' \
        "$(( INTERVAL - ELAPSED ))"
    exit 0
fi

# Collapse all currently unpushed commits into one commit.
# Preserve the aggregate committed changes using a binary-capable patch.
PATCH="$(mktemp)"
trap 'rm -f "$PATCH"' EXIT

git diff --binary "$REMOTE_REF" HEAD > "$PATCH"

if [[ ! -s "$PATCH" ]]; then
    echo "No aggregate changes found; nothing to push."
    exit 0
fi

# Recheck immediately before rewriting local, unpushed history.
if [[ -n "$(git status --porcelain)" ]]; then
    echo "Working tree changed; refusing to rewrite history."
    exit 1
fi

git reset --hard "$REMOTE_REF"
git apply --index "$PATCH"

if git diff --cached --quiet; then
    echo "No staged changes remain; nothing to push."
    exit 0
fi

git commit -m "Batch pending changes"

# Only record the timestamp after a successful push.
# A failed push leaves the batch locally available for retry.
if git push origin "HEAD:$BRANCH"; then
    date +%s > "$STATE_FILE"
    echo "SUCCESS: Combined changes pushed to GitHub."
else
    echo "ERROR: Push failed. The combined commit remains local."
    exit 1
fi

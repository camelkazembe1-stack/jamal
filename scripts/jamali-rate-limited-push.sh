#!/usr/bin/env bash
set -Eeuo pipefail

REPO="$HOME/jamali"
BRANCH="main"
INTERVAL=60
STATE_DIR="$HOME/.local/state/jamali"
STATE_FILE="$STATE_DIR/last-successful-push"

mkdir -p "$HOME/.cache" "$STATE_DIR"
cd "$REPO"

exec 9>"$HOME/.cache/jamali-push.lock"
flock -n 9 || exit 0

[[ "$(git branch --show-current)" == "$BRANCH" ]] || {
    echo "Not on main; skipping."
    exit 0
}

git fetch origin "$BRANCH"

REMOTE_REF="refs/remotes/origin/$BRANCH"
REMOTE_HEAD="$(git rev-parse "$REMOTE_REF")"
LOCAL_HEAD="$(git rev-parse HEAD)"

if [[ "$LOCAL_HEAD" == "$REMOTE_HEAD" ]]; then
    exit 0
fi

if ! git merge-base --is-ancestor "$REMOTE_HEAD" "$LOCAL_HEAD"; then
    echo "ERROR: Remote and local history diverged. Manual reconciliation required."
    exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo "Working tree is dirty; postponing push."
    exit 0
fi

NOW="$(date +%s)"

# No timestamp means this is the first managed push: do not delay it.
if [[ -s "$STATE_FILE" ]]; then
    LAST_PUSH="$(cat "$STATE_FILE")"
    if ! [[ "$LAST_PUSH" =~ ^[0-9]+$ ]]; then
        echo "ERROR: Invalid successful-push timestamp."
        exit 1
    fi
else
    LAST_PUSH=0
fi

ELAPSED=$(( NOW - LAST_PUSH ))

if (( ELAPSED < INTERVAL )); then
    printf 'Push postponed; %s seconds remain.\n' \
        "$(( INTERVAL - ELAPSED ))"
    exit 0
fi

PATCH="$(mktemp)"
trap 'rm -f "$PATCH"' EXIT

ORIGINAL_HEAD="$(git rev-parse HEAD)"
git diff --binary "$REMOTE_REF" "$ORIGINAL_HEAD" > "$PATCH"

if [[ ! -s "$PATCH" ]]; then
    echo "No file changes to batch. Keeping local commits intact."
    exit 0
fi

# Keep a recovery reference before replacing unpushed history.
BACKUP_REF="refs/jamali/push-backup/$(date +%s)-$$"
git update-ref "$BACKUP_REF" "$ORIGINAL_HEAD"

RESTORE_ON_ERROR=1
restore_original() {
    result=$?
    if (( RESTORE_ON_ERROR )); then
        echo "Operation did not complete; restoring original local HEAD."
        git reset --hard "$ORIGINAL_HEAD" || true
    fi
    git update-ref -d "$BACKUP_REF" || true
    exit "$result"
}
trap restore_original EXIT

git reset --hard "$REMOTE_REF"
git apply --index "$PATCH"

if git diff --cached --quiet; then
    echo "No changes to commit."
    RESTORE_ON_ERROR=0
    exit 0
fi

git commit -m "Batch pending changes"

# Recheck remote immediately before attempting the push.
git fetch origin "$BRANCH"

if [[ "$(git rev-parse "$REMOTE_REF")" != "$REMOTE_HEAD" ]]; then
    echo "ERROR: Remote changed during batching; preserving original local history."
    exit 1
fi

git push origin "HEAD:$BRANCH"

# Record the time only after a successful push.
date +%s > "$STATE_FILE"
echo "SUCCESS: Batched changes pushed."

RESTORE_ON_ERROR=0
git update-ref -d "$BACKUP_REF"
trap - EXIT

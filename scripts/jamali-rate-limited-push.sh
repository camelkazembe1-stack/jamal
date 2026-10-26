#!/usr/bin/env bash
set -Eeuo pipefail

REPO="$HOME/jamal"
BRANCH="main"
INTERVAL=60
STATE_DIR="$HOME/.local/state/jamali"
STATE_FILE="$STATE_DIR/last-successful-push"

mkdir -p "$STATE_DIR" "$HOME/.cache"
cd "$REPO"

exec 9>"$HOME/.cache/jamali-push.lock"
flock -n 9 || exit 0

if [[ "$(git branch --show-current)" != "$BRANCH" ]]; then
    echo "ERROR: Not on main. No synchronization performed."
    exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
    echo "Local changes detected. Backing up changes before staging."

    BACKUP_DIR="$STATE_DIR/backups/$(date +%Y%m%d-%H%M%S)-$$"
    mkdir -p "$BACKUP_DIR"

    git diff --binary HEAD > "$BACKUP_DIR/tracked-changes.patch"
    git diff --cached --binary > "$BACKUP_DIR/staged-changes.patch"
    git ls-files --others --exclude-standard -z > "$BACKUP_DIR/untracked-files.list"

    if [[ -s "$BACKUP_DIR/untracked-files.list" ]]; then
        tar --null -czf "$BACKUP_DIR/untracked-files.tar.gz" \
            -T "$BACKUP_DIR/untracked-files.list"
    fi

    # Include new files, modifications, staged changes and deletions.
    git add -A

    if ! git diff --cached --quiet; then
        git commit -m "Record local changes for automatic sync"
        echo "Local changes committed, including any file deletions."
    fi
fi

# Fetch first. Never silently overwrite independent remote history.
git fetch origin "$BRANCH"
REMOTE_REF="refs/remotes/origin/$BRANCH"
REMOTE_HEAD="$(git rev-parse "$REMOTE_REF")"
LOCAL_HEAD="$(git rev-parse HEAD)"

if [[ "$LOCAL_HEAD" == "$REMOTE_HEAD" ]]; then
    echo "No changes to synchronize. Local and GitHub commits match."
    exit 0
fi

if ! git merge-base --is-ancestor "$REMOTE_HEAD" "$LOCAL_HEAD"; then
    echo "ERROR: GitHub has independent commits or is ahead of local main."
    echo "Local work is preserved. Automatic overwrite has been stopped."
    echo "Resolve the history difference before synchronization can continue."
    exit 1
fi

NOW="$(date +%s)"
LAST_PUSH=0

if [[ -s "$STATE_FILE" ]]; then
    LAST_PUSH="$(cat "$STATE_FILE")"
    if ! [[ "$LAST_PUSH" =~ ^[0-9]+$ ]]; then
        echo "ERROR: Invalid last-successful-push timestamp: $STATE_FILE"
        exit 1
    fi
fi

ELAPSED=$((NOW - LAST_PUSH))
if (( LAST_PUSH > 0 && ELAPSED < INTERVAL )); then
    echo "Local changes are saved in Git."
    echo "Push postponed for $((INTERVAL - ELAPSED)) more seconds."
    echo "The existing timer will retry automatically."
    exit 0
fi

PATCH="$(mktemp)"
trap 'rm -f "$PATCH"' EXIT

ORIGINAL_HEAD="$(git rev-parse HEAD)"
git diff --binary "$REMOTE_REF" "$ORIGINAL_HEAD" > "$PATCH"

if [[ ! -s "$PATCH" ]]; then
    echo "No file changes to publish."
    exit 0
fi

# Keep a recovery reference before preparing one combined update.
BACKUP_REF="refs/jamali/push-backup/$(date +%s)-$$"
git update-ref "$BACKUP_REF" "$ORIGINAL_HEAD"

RESTORE_ON_ERROR=1
restore_original() {
    result=$?
    if (( RESTORE_ON_ERROR )); then
        echo "Synchronization failed. Restoring local HEAD to $ORIGINAL_HEAD."
        git reset --hard "$ORIGINAL_HEAD" || true
        echo "Recovery reference retained: $BACKUP_REF"
    else
        git update-ref -d "$BACKUP_REF" || true
    fi
    exit "$result"
}
trap restore_original EXIT

# Rebuild the pending changes as one commit on top of GitHub's current base.
git reset --hard "$REMOTE_REF"
git apply --index "$PATCH"
git commit -m "Batch local changes"

# Confirm GitHub has not changed while the batch was prepared.
git fetch origin "$BRANCH"
CURRENT_REMOTE_HEAD="$(git rev-parse "$REMOTE_REF")"

if [[ "$CURRENT_REMOTE_HEAD" != "$REMOTE_HEAD" ]]; then
    echo "ERROR: GitHub changed during synchronization."
    echo "Local work will be preserved; retry after reviewing the remote."
    exit 1
fi

if ! git merge-base --is-ancestor "$CURRENT_REMOTE_HEAD" HEAD; then
    echo "ERROR: Local history is not based on the latest GitHub history."
    exit 1
fi

# This push is performed by the automation, not manually.
git push origin "HEAD:refs/heads/$BRANCH"

RESTORE_ON_ERROR=0
date +%s > "$STATE_FILE"

if [[ "$(git rev-parse HEAD)" != "$(git rev-parse "$REMOTE_REF")" ]]; then
    git fetch origin "$BRANCH"
fi

echo "SUCCESS: Local changes were pushed to GitHub."
echo "New files, modifications and deletions are included."
echo "Last successful push timestamp updated."

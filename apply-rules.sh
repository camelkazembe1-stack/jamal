#!/usr/bin/env bash
# apply-rules.sh - the one-shot publisher for the Firestore rules.
# Written out of the settings block in SERVER/server.js by
#     node SERVER/sync.js
# so editing it by hand is pointless - the next sync writes it back.
# It signs you in to Firebase (a browser opens the first time) and
# publishes firestore.rules to the project the code really runs on.
# Safe to run again at any time - publishing the same rules twice is fine.
# Kept out of the app: nothing on the website imports it.
set -eu
cd "$(dirname "$0")"

[ -f firestore.rules ] || { echo "ABORT: firestore.rules not found - run this from the jamal repository folder." >&2; exit 1; }
[ -f firebase.json ] || { echo "ABORT: firebase.json not found - run this from the jamal repository folder." >&2; exit 1; }

PROJECT="jamal-542b5"
say() { printf '%s\n' "$*"; }

# The Firebase CLI: the installed one when present, otherwise npx fetches
# firebase-tools on the fly - no global install is needed.
fb() {
  if command -v firebase >/dev/null 2>&1; then firebase "$@";
  else npx --yes firebase-tools@latest "$@"; fi
}
command -v firebase >/dev/null 2>&1 || command -v npx >/dev/null 2>&1 || {
  echo "ABORT: neither the firebase CLI nor node/npm (npx) is on this machine." >&2
  echo "Install node from https://nodejs.org and run this script again, or publish" >&2
  echo "firestore.rules by hand in the Firebase console:" >&2
  echo "  https://console.firebase.google.com/project/$PROJECT/firestore/rules" >&2
  exit 1
}

say "database project: $PROJECT (written by SERVER/server.js)"
say "signing in to Firebase (a browser opens the first time)..."
fb login

say "publishing firestore.rules to $PROJECT ..."
fb deploy --only firestore:rules --project "$PROJECT"

say "done: firestore.rules published to $PROJECT."
say "the comment desk is open now - visitors' comments reach the owner; send one again."

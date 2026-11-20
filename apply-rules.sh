#!/usr/bin/env bash
# apply-rules.sh - the one-shot publisher for the Firestore rules.
# Written out of the settings block in SERVER/server.js by
#     node SERVER/sync.js
# so editing it by hand is pointless - the next sync writes it back. It
# walks you through the Firebase sign in, publishes firestore.rules to the
# project the code really runs on, then removes itself. Kept out of the
# app: nothing on the website imports it.
set -eu
cd "$(dirname "$0")"

[ -f firestore.rules ] || { echo "ABORT: firestore.rules not found - run: node SERVER/sync.js" >&2; exit 1; }
[ -f firebase.json ] || { echo "ABORT: firebase.json not found - run: node SERVER/sync.js" >&2; exit 1; }
[ -f .firebaserc ] || { echo "ABORT: .firebaserc not found - run: node SERVER/sync.js" >&2; exit 1; }

PROJECT="jamal-542b5"
say() { printf '%s\n' "$*"; }
say "database project: $PROJECT (written by SERVER/server.js)"

command -v firebase >/dev/null 2>&1 \
  || { echo "ABORT: the Firebase CLI is not installed - install it with: npm install -g firebase-tools" >&2; exit 1; }

say "signing in to Firebase (a browser opens the first time)..."
firebase login

say "publishing firestore.rules to $PROJECT..."
firebase deploy --only firestore:rules --project "$PROJECT"

rm -f "$0"
say "done: firestore.rules published to $PROJECT - apply-rules.sh removed itself."

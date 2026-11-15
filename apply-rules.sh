#!/usr/bin/env bash
# apply-rules.sh - the one-shot publisher for the Firestore rules.
# Reads the database project from SERVER/server.js, writes firebase.json and
# .firebaserc, walks you through the Firebase sign in and publishes
# firestore.rules, then removes itself. Kept out of the app: nothing on the
# website imports it.
set -eu
cd "$(dirname "$0")"

[ -f SERVER/server.js ] || { echo "ABORT: SERVER/server.js not found - run this from the repository root." >&2; exit 1; }
[ -f firestore.rules ] || { echo "ABORT: firestore.rules not found - run this from the repository root." >&2; exit 1; }

PROJECT="$(sed -n 's/^const DATABASE_PROJECT = "\(.*\)";$/\1/p' SERVER/server.js | head -1)"
[ -n "$PROJECT" ] || { echo "ABORT: could not read DATABASE_PROJECT from SERVER/server.js." >&2; exit 1; }
say() { printf '%s\n' "$*"; }
say "database project: $PROJECT (read from SERVER/server.js)"

printf '{\n  "firestore": {\n    "rules": "firestore.rules"\n  }\n}\n' > firebase.json
printf '{\n  "projects": {\n    "default": "%s"\n  }\n}\n' "$PROJECT" > .firebaserc
say "wrote firebase.json and .firebaserc for $PROJECT"

command -v firebase >/dev/null 2>&1 \
  || { echo "ABORT: the Firebase CLI is not installed - install it with: npm install -g firebase-tools" >&2; exit 1; }

say "signing in to Firebase (a browser opens the first time)..."
firebase login

say "publishing firestore.rules to $PROJECT..."
firebase deploy --only firestore:rules --project "$PROJECT"

rm -f "$0"
say "done: firestore.rules published to $PROJECT - apply-rules.sh removed itself."

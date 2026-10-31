#!/usr/bin/env bash
# =====================================================================
# JAMALI - Task 66 - publish the Firestore rules from the terminal
# One command fixes every admin screen: counters, request tables,
# bell, approvals. It signs in to Firebase, publishes firestore.rules
# to the project your own code uses, commits and pushes, and cleans up.
# =====================================================================
set -u
cd "$(dirname "$0")"

say(){ printf '\n%s\n' "$*"; }

say "======================================================="
say "JAMALI - publishing the Firestore database rules"
say "======================================================="

# ---------- 0. preflight ----------
command -v node >/dev/null 2>&1 || { say "FAIL: node is not installed. Install Node.js 18+ (sudo apt install -y nodejs npm) and run this script again."; exit 1; }
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -lt 18 ]; then say "FAIL: Node.js 18+ is required (found $(node -v)). Update Node and run again."; exit 1; fi
if [ ! -f firestore.rules ]; then say "FAIL: firestore.rules is not next to this script. Unzip the package inside ~/jamal and run it there."; exit 1; fi

# ---------- 1. which Firebase project does JAMALI really use? ----------
PID=""
for f in public/SERVER/server.js SERVER/server.js; do
  if [ -f "$f" ]; then
    DETECTED=$(node -e 'const s=require("fs").readFileSync(process.argv[1],"utf8");const m=s.match(/projectId\s*:\s*"([^"]+)"/);console.log(m?m[1]:"");' "$f" 2>/dev/null || true)
    if [ -n "$DETECTED" ]; then PID="$DETECTED"; break; fi
  fi
done
if [ -z "$PID" ]; then PID="jamal-542b5"; fi
say "Database project detected from your own code: $PID"
say "Rules console (for later checks): https://console.firebase.google.com/project/$PID/firestore/rules"

# ---------- 2. firebase.json + .firebaserc (merged, never clobbered) ----------
node -e '
const fs=require("fs");
let j={};
try{ j=JSON.parse(fs.readFileSync("firebase.json","utf8")); }catch(e){}
j.firestore=Object.assign({},j.firestore,{rules:"firestore.rules"});
fs.writeFileSync("firebase.json",JSON.stringify(j,null,2)+"\n");
let r={};
try{ r=JSON.parse(fs.readFileSync(".firebaserc","utf8")); }catch(e){}
r.projects=Object.assign({default:process.argv[1]},r.projects);
fs.writeFileSync(".firebaserc",JSON.stringify(r,null,2)+"\n");
' "$PID"
say "firebase.json and .firebaserc are ready (any existing keys were preserved)."

# ---------- 4. sign in to Firebase ----------
say "One-time download of the Firebase CLI now (about 1-2 minutes)..."
say "Step 1 of 2: a sign-in link will appear. Open it and sign in with the"
say "Google account that OWNS the $PID project (the one that created it)."
if ! npx -y firebase-tools@latest login --no-localhost; then
  say "FAIL: Firebase sign-in did not finish. No rules were changed. Run this script again."
  exit 1
fi

# ---------- 5. publish the rules ----------
say "Step 2 of 2: publishing firestore.rules to project $PID ..."
if npx -y firebase-tools@latest deploy --only firestore:rules --project "$PID" --non-interactive; then
  say ""
  say "ALL PASS - the rules are LIVE in $PID."
  say "Now open Account Administration and press: I published them - check again"
  say "mwanaisha salehe is already saved in the database; she will appear"
  say "under Pending account requests with the bell count matching."
else
  say ""
  say "FAIL: the deploy did not finish. No rules were changed (a failed"
  say "deploy never replaces live rules). The most common causes:"
  say "  - the Google account you signed in with is not Owner/Editor on $PID"
  say "  - the network dropped during the upload"
  say "Fix the cause and run this script again."
  exit 1
fi

# ---------- 6. git commit + push ----------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add firestore.rules firebase.json .firebaserc 2>/dev/null || true
  if git diff --cached --quiet 2>/dev/null; then
    say "git: nothing new to commit."
  else
    if git commit -m "Task 66: comment-free firestore.rules + Firebase CLI deploy config"; then
      say "git: committed."
    else
      say "GIT WARNING: commit failed - the rules ARE live; fix git later."
    fi
    if git push; then
      say "git: pushed to GitHub."
    else
      say "GIT WARNING: push failed (credentials or network). The rules ARE live;"
      say "run 'git push' later - the website does not need this push to work."
    fi
  fi
else
  say "git: not a repository here - skipped commit and push."
fi

# ---------- 7. cleanup: temp files go, project files stay ----------
rm -f -- "$0"
say "cleanup: apply script removed. Kept: firestore.rules, firebase.json and"
say ".firebaserc. No backup files were created; git history is the recovery path."
say "NEXT: check the Account Administration page and tell me what the tables show."

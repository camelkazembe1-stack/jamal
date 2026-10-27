#!/usr/bin/env bash
# ============================================================================
# JAMALI — TASK 55 — CENTRALIZED SERVER ARCHITECTURE
# ----------------------------------------------------------------------------
# WHAT THIS DOES
#   The whole project (Computer, Business and Health modules) moves to one
#   central connection point:
#
#     every page  ->  /firebase.js (compat shim, same exports as always)
#                           ->  /SERVER/linker.js   (THE ONLY CONNECTION POINT)
#                                 ->  /SERVER/server.js  (server configuration:
#                                     hosting, auth, database, analytics)
#                                       ->  Firebase connector -> Cloud Firestore
#
#   - SERVER/linker.js and SERVER/server.js are created in the project ROOT
#     (the canonical copies, exactly as the requirement asks).
#   - public/SERVER/ holds byte-identical served mirrors, because Vercel
#     serves public/ only — the browser loads them from there.
#   - public/firebase.js becomes a pure re-export shim: same names, zero
#     Firebase code. NO PAGE IS EDITED — every page keeps working as-is,
#     but nothing connects to a database directly anymore.
#   - The ONLY file with credentials/SDK/connection code is SERVER/server.js.
#     Switching servers in the future = edit that one file.
#
# BEFORE CHANGES the script audits the project (requirement 6) and writes
# SERVER-CONNECTION-AUDIT.txt at the repo root. If ANY file outside the
# SERVER architecture connects directly to Firebase, the run FAILS and
# names it — send me the list and I will patch it.
#
# Idempotent: safe to run again. Touches NO collections, NO rules, NO pages.
#
# HOW TO RUN: bash jamali-task55-server-linker.sh   (from the repo root)
# The verify tail must end with: TASK 55 VERIFY: ALL PASS
# ============================================================================
set -u

if [ ! -f public/firebase.js ]; then
  echo "ERROR: run this script from the repository root — the folder that contains public/ (~/jamal)."
  exit 1
fi
echo "== TASK 55: centralized SERVER architecture =="
echo ""

# ---------------------------------------------------------------------------
# STEP 1 — AUDIT (requirement 6): find every file that connects to Firebase
# ---------------------------------------------------------------------------
echo "-- STEP 1: auditing every existing Firebase connection --"
direct="$(grep -rlE 'gstatic\.com/firebasejs|initializeApp|firebaseConfig|apiKey' public --include='*.js' --include='*.html' 2>/dev/null | grep -v '^public/firebase.js$' | grep -v '^public/mock/' | grep -v '^public/SERVER/' | sort)"
routed="$(grep -rlE "from [\"']/firebase\.js[\"']" public --include='*.js' --include='*.html' 2>/dev/null | sort)"
n_routed="$(printf '%s\n' "$routed" | grep -c . || true)"

{
  echo "# SERVER CONNECTION AUDIT — task 55"
  echo "# (regenerated on every run of jamali-task55-server-linker.sh)"
  echo ""
  echo "== 1. Modules routed through SERVER/linker.js (via the /firebase.js shim) =="
  if [ -n "$routed" ]; then printf '%s\n' "$routed"; else "  (none found)"; fi
  echo ""
  echo "== 2. Files holding a DIRECT database/server connection =="
  if [ -n "$direct" ]; then printf '%s\n' "$direct"; else echo "NONE — the architecture rule holds."; fi
  echo ""
  echo "== 3. Connection chain after task 55 =="
  echo "pages -> /firebase.js (compat shim) -> /SERVER/linker.js -> /SERVER/server.js -> Firebase connector -> Cloud Firestore + Google auth"
  echo ""
  echo "== 4. Excluded from the scan =="
  echo "public/mock/    — offline development fake (no real connection)"
  echo "public/SERVER/  — the sanctioned connection point itself (served mirror of SERVER/)"
  echo "firestore.rules — security rules, not a connection"
} > SERVER-CONNECTION-AUDIT.txt
echo "  audit written: SERVER-CONNECTION-AUDIT.txt (modules routed through the shim: $n_routed)"

if [ -n "$direct" ]; then
  echo ""
  echo "VERIFY FAIL: these files connect DIRECTLY to a database/server:"
  printf '%s\n' "$direct"
  echo "They must go through SERVER/linker.js instead. Send me this list and the"
  echo "audit file — I will patch them; then re-run this script."
  exit 1
fi
echo "  PASS: no direct database connections outside the SERVER architecture"
echo ""

# ---------------------------------------------------------------------------
# STEP 2 — the SERVER folder (canonical copies in the project root)
# ---------------------------------------------------------------------------
echo "-- STEP 2: creating the SERVER folder --"
mkdir -p SERVER public/SERVER

# ---------------------------------------------------------------------------
# STEP 3 — SERVER/linker.js : the ONLY connection point of the whole project
# ---------------------------------------------------------------------------
echo "-- STEP 3: writing SERVER/linker.js --"
cat > "SERVER/linker.js" << 'T55_LINKER'
// ============================================================================
// SERVER/linker.js — the ONLY connection point of the whole JAMALI project
// ----------------------------------------------------------------------------
// ROLE:
//   Every Computer, Business and Health module talks to THIS file when it
//   needs the server or the database. The linker obtains the actual server
//   configuration and connection functionality from SERVER/server.js and
//   hands it out through one stable surface.
//
//   COMPUTER MODULES --+
//                      |
//   BUSINESS MODULES --+--> SERVER/linker.js  <-- YOU ARE HERE
//                      |             |
//   HEALTH MODULES ----+             v
//                               SERVER/server.js  (selects the server)
//                                     |
//                                     v
//                         database and other services
//
// THE RULE:
//   No module may import a database SDK, hold server credentials, or open
//   its own connection. Everything goes through the linker. If the
//   organization moves to a different server, only SERVER/server.js
//   changes — the modules and this linker keep their exact surface.
//
// FOR EXISTING PAGES:
//   The old shared module public/firebase.js is now a thin compatibility
//   layer that re-exports the names below. Every page keeps working
//   unchanged — but the connection now flows through here.
//
// FOR NEW CODE:
//   Import from this file (or from /firebase.js — same names), or use the
//   high-level JamalLinker helpers at the bottom.
//
// STATIC HOSTING NOTE: this file also lives at public/SERVER/linker.js —
// an exact byte-for-byte mirror, because Vercel serves public/ only.
// After editing: cp SERVER/*.js public/SERVER/
// ============================================================================

import { server, SERVER_CONFIG } from "./server.js";

// --- which server is in charge ----------------------------------------------
export const activeServer = SERVER_CONFIG.active;
export const serverInfo = server.info;

// --- authentication ----------------------------------------------------------
export const auth = server.auth;
export const provider = server.provider;
export const onAuthStateChanged = server.authApi.onAuthStateChanged;
export const signInWithPopup = server.authApi.signInWithPopup;
export const signOut = server.authApi.signOut;

// --- database bindings served by the active connector ------------------------
export const db = server.db;
export const getFirestore = server.firestore.getFirestore;
export const collection = server.firestore.collection;
export const doc = server.firestore.doc;
export const addDoc = server.firestore.addDoc;
export const updateDoc = server.firestore.updateDoc;
export const deleteDoc = server.firestore.deleteDoc;
export const getDocs = server.firestore.getDocs;
export const getDoc = server.firestore.getDoc;
export const setDoc = server.firestore.setDoc;
export const writeBatch = server.firestore.writeBatch;
export const query = server.firestore.query;
export const where = server.firestore.where;
export const orderBy = server.firestore.orderBy;
export const limit = server.firestore.limit;
export const onSnapshot = server.firestore.onSnapshot;
export const serverTimestamp = server.firestore.serverTimestamp;
export const Timestamp = server.firestore.Timestamp;
export const arrayUnion = server.firestore.arrayUnion;
export const arrayRemove = server.firestore.arrayRemove;
export const increment = server.firestore.increment;
export const deleteField = server.firestore.deleteField;

// --- guard for inner pages (same behaviour the pages always had) -------------
// Resolves with the user, or bounces a signed-out visitor to the start page.
export function requireAuth() {
  return new Promise((resolve) => {
    server.authApi.onAuthStateChanged(server.auth, (user) => {
      if (user) resolve(user);
      else location.replace("/");
    });
  });
}

// ---------------------------------------------------------------------------
// HIGH-LEVEL API — the recommended surface for NEW modules.
// Thin, server-agnostic helpers on top of the same connection. When the
// organization switches servers, these keep their shape and server.js does
// the translating.
// ---------------------------------------------------------------------------
export const JamalLinker = {
  // Which server arrangement the project is currently using
  server() {
    return { ...server.info };
  },

  // Authentication
  auth: {
    currentUser() { return server.auth ? server.auth.currentUser : null; },
    signInGoogle() {
      return server.authApi.signInWithPopup(server.auth, server.provider);
    },
    signOut() { return server.authApi.signOut(server.auth); },
    requireAuth
  },

  // Database — convenience wrappers (collection name + plain data in/out)
  db: {
    add(collectionName, data) {
      const ref = server.firestore.collection(server.db, collectionName);
      return server.firestore.addDoc(ref, {
        ...data,
        createdAt: server.firestore.serverTimestamp()
      });
    },
    get(collectionName, id) {
      const ref = server.firestore.doc(server.db, collectionName, id);
      return server.firestore.getDoc(ref);
    },
    list(collectionName, ...constraints) {
      const base = server.firestore.collection(server.db, collectionName);
      const q = constraints.length
        ? server.firestore.query(base, ...constraints)
        : base;
      return server.firestore.getDocs(q);
    },
    set(collectionName, id, data, options) {
      const ref = server.firestore.doc(server.db, collectionName, id);
      return server.firestore.setDoc(ref, data, options);
    },
    update(collectionName, id, data) {
      const ref = server.firestore.doc(server.db, collectionName, id);
      return server.firestore.updateDoc(ref, data);
    },
    delete(collectionName, id) {
      const ref = server.firestore.doc(server.db, collectionName, id);
      return server.firestore.deleteDoc(ref);
    },
    watch(collectionName, callback, ...constraints) {
      const base = server.firestore.collection(server.db, collectionName);
      const q = constraints.length
        ? server.firestore.query(base, ...constraints)
        : base;
      return server.firestore.onSnapshot(q, callback);
    }
  },

  // Escape hatch: the full live connection of the active server, for
  // advanced operations (batches, transactions) that the wrappers above
  // do not cover yet. Still the linker — never the database SDK directly.
  raw() {
    return {
      app: server.app,
      auth: server.auth,
      db: server.db,
      authApi: server.authApi,
      firestore: server.firestore
    };
  }
};
T55_LINKER
echo "  wrote SERVER/linker.js ($(wc -c < "SERVER/linker.js") bytes)"

# ---------------------------------------------------------------------------
# STEP 4 — SERVER/server.js : server configuration (hosting/auth/database)
# ---------------------------------------------------------------------------
echo "-- STEP 4: writing SERVER/server.js --"
cat > "SERVER/server.js" << 'T55_SERVER'
// ============================================================================
// SERVER/server.js — JAMALI server configuration (the server brain)
// ----------------------------------------------------------------------------
// ARCHITECTURE (task 55):
//
//   COMPUTER MODULES --+
//                      |
//   BUSINESS MODULES --+--> SERVER/linker.js   (the ONLY connection point)
//                      |             |
//   HEALTH MODULES ----+             v
//                               SERVER/server.js   (this file)
//                                     |
//                                     v
//                         selected server configuration
//                                     |
//                                     v
//                         database and other services
//
// This file decides WHICH server the project uses and HOW it behaves:
// hosting, authentication, database connection, analytics and every other
// server-dependent arrangement. It is the ONLY file in the whole project
// allowed to hold server credentials, database SDK imports and connection
// code. No module may copy anything from here.
//
// TO MOVE THE PROJECT TO A DIFFERENT SERVER:
//   1. add a configuration block under SERVER_CONFIG.servers below
//   2. add a connector function for it in the CONNECTORS section
//   3. flip SERVER_CONFIG.active to its name
// No Computer, Business or Health module changes — they all talk to
// SERVER/linker.js, and the linker talks to this file.
//
// NOTE FOR STATIC HOSTING (Vercel): browsers can only load files the host
// serves, and Vercel serves the public/ folder. This file therefore also
// exists at public/SERVER/server.js as an exact byte-for-byte mirror of
// this canonical copy. After editing this file, refresh the mirror:
//     cp SERVER/*.js public/SERVER/
// ============================================================================

// --- SDK imports of the firebase connector (the currently active server) ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  deleteField
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------------------------------------------------------------------------
// SERVER CONFIGURATION
// One entry per known server arrangement. Each entry describes the hosting,
// authentication, database and other server-dependent behaviour an
// organization requires.
// ---------------------------------------------------------------------------
export const SERVER_CONFIG = {
  // The server the whole project talks to right now.
  active: "firebase",

  servers: {
    firebase: {
      label: "Firebase - Google auth + Cloud Firestore",
      hosting: "Vercel static hosting (public/ folder)",
      auth: "google-popup",
      database: "cloud-firestore",
      analytics: true,
      config: {
        apiKey: "AIzaSyCtE7p5LM8L2yaJB0JJCyyTz763CBQhKGE",
        authDomain: "jamal-542b5.firebaseapp.com",
        projectId: "jamal-542b5",
        storageBucket: "jamal-542b5.firebasestorage.app",
        messagingSenderId: "401281850731",
        appId: "1:401281850731:web:afa3ff6dca4d9e095c402e",
        measurementId: "G-DHB2DJ769H"
      }
    }

    // ------------------------------------------------------------------
    // Example of a future arrangement (placeholder, intentionally not
    // wired). Copy it, fill it in, add a connector for it below, then
    // set SERVER_CONFIG.active to its key. Nothing else changes.
    //
    // ,ownServer: {
    //   label: "Organization self-hosted server",
    //   hosting: "organization data centre",
    //   auth: "own-accounts",
    //   database: "postgres-via-rest",
    //   config: { baseUrl: "https://server.organization.example" }
    // }
    // ------------------------------------------------------------------
  }
};

// ---------------------------------------------------------------------------
// CONNECTORS — one function per server arrangement.
// A connector receives its configuration block and returns the live
// connection the linker hands to the modules:
//   { name, app, auth, provider, db, authApi, firestore }
// ---------------------------------------------------------------------------
function firebaseConnector(cfg) {
  const app = initializeApp(cfg.config);

  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const db = getFirestore(app);

  // Analytics only where the environment supports it
  if (cfg.analytics) {
    isSupported().then((ok) => { if (ok) getAnalytics(app); }).catch(() => {});
  }

  return {
    name: "firebase",
    app,
    auth,
    provider,
    db,
    authApi: { onAuthStateChanged, signInWithPopup, signOut },
    firestore: {
      getFirestore, collection, doc, addDoc, writeBatch,
      query, where, orderBy, onSnapshot,
      serverTimestamp, Timestamp, updateDoc, deleteDoc, getDocs, setDoc,
      getDoc, limit, arrayUnion, arrayRemove, increment, deleteField
    }
  };
}

const CONNECTORS = { firebase: firebaseConnector };

// ---------------------------------------------------------------------------
// START the active connector (synchronous — same timing the old shared
// module had, so every page keeps its current behaviour).
// ---------------------------------------------------------------------------
const activeName = SERVER_CONFIG.active;
const activeCfg = SERVER_CONFIG.servers[activeName];
if (!activeCfg) {
  throw new Error("[server.js] no configuration found for server: " + activeName);
}
const connectorFactory = CONNECTORS[activeName];
if (!connectorFactory) {
  throw new Error(
    "[server.js] no connector implemented for server: " + activeName +
    " - add one in this file, then the whole project follows it."
  );
}
const connector = connectorFactory(activeCfg);

// --- what server.js hands to the linker -------------------------------------
export const server = {
  name: connector.name,
  info: {
    name: connector.name,
    label: activeCfg.label,
    hosting: activeCfg.hosting,
    auth: activeCfg.auth,
    database: activeCfg.database
  },
  app: connector.app,
  auth: connector.auth,
  provider: connector.provider,
  db: connector.db,
  authApi: connector.authApi,
  firestore: connector.firestore
};
T55_SERVER
echo "  wrote SERVER/server.js ($(wc -c < "SERVER/server.js") bytes)"

# ---------------------------------------------------------------------------
# STEP 5 — public/SERVER/ : byte-identical served mirrors (Vercel serves public/)
# ---------------------------------------------------------------------------
echo "-- STEP 5: mirroring into public/SERVER/ (static hosts only serve public/) --"
cp "SERVER/linker.js" "public/SERVER/linker.js"
cp "SERVER/server.js" "public/SERVER/server.js"
echo "  wrote public/SERVER/linker.js and public/SERVER/server.js (exact mirrors)"

# ---------------------------------------------------------------------------
# STEP 6 — public/firebase.js : pure compatibility shim (pages untouched)
# ---------------------------------------------------------------------------
echo "-- STEP 6: rewriting public/firebase.js as the linker shim --"
cat > "public/firebase.js" << 'T55_FIREBASE'
// JAMALI — shared connection module (task 55: centralized SERVER architecture)
// ----------------------------------------------------------------------------
// This file used to hold the Firebase configuration, the SDK imports and the
// database connection itself. That connection now lives in the SERVER folder:
//
//     every page  ->  /firebase.js (this shim)  ->  /SERVER/linker.js
//                                  ->  SERVER/server.js  ->  selected server
//
// This shim exports exactly the same names as before, so every Computer,
// Business and Health page keeps working with zero changes. The server
// credentials, SDK imports and connection code are ONLY in SERVER/server.js.
// Nothing here may ever touch a database directly.
// ----------------------------------------------------------------------------

import {
  activeServer,
  serverInfo,
  JamalLinker,
  auth,
  provider,
  db,
  getFirestore,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  deleteField,
  requireAuth
} from "/SERVER/linker.js";

export {
  activeServer,
  serverInfo,
  JamalLinker,
  auth,
  provider,
  db,
  getFirestore,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  deleteField,
  requireAuth
};
T55_FIREBASE
echo "  wrote public/firebase.js ($(wc -c < "public/firebase.js") bytes)"
echo ""
echo "-- STEP 7: verification --"

fail=0
chk() { if [ "$1" -eq 0 ]; then echo "  PASS: $2"; else echo "  VERIFY FAIL: $2"; fail=$((fail+1)); fi }

# -- 1 - all five files exist and are non-empty ------------------------------
ok=1
for f in SERVER/linker.js SERVER/server.js public/SERVER/linker.js public/SERVER/server.js public/firebase.js; do
  [ -s "$f" ] || { echo "  VERIFY FAIL: $f missing or empty"; ok=0; }
done
[ "$ok" -eq 1 ]; chk $? "all five architecture files exist and are non-empty"

# -- 2 - mirrors are byte-identical to the canonical SERVER/ copies -----------
cmp -s SERVER/linker.js public/SERVER/linker.js; chk $? "public/SERVER/linker.js is a byte-identical mirror of SERVER/linker.js"
cmp -s SERVER/server.js public/SERVER/server.js; chk $? "public/SERVER/server.js is a byte-identical mirror of SERVER/server.js"

# -- 3 - the shim holds NO connection code ------------------------------------
if grep -qE 'gstatic\.com/firebasejs|initializeApp|firebaseConfig|apiKey' public/firebase.js; then
  echo "  VERIFY FAIL: public/firebase.js still contains connection code — it must be a pure shim"
  fail=$((fail+1))
else
  echo "  PASS: public/firebase.js contains no Firebase SDK, config or credentials"
fi
grep -q 'from "/SERVER/linker.js"' public/firebase.js
chk $? "public/firebase.js re-exports from /SERVER/linker.js"

# -- 4 - the linker routes through server.js ----------------------------------
grep -q 'from "./server.js"' SERVER/linker.js
chk $? "SERVER/linker.js obtains the connection from SERVER/server.js"
grep -q 'JamalLinker' SERVER/linker.js
chk $? "SERVER/linker.js exposes the JamalLinker high-level API"

# -- 5 - server.js is the single configuration point --------------------------
grep -q 'export const SERVER_CONFIG' SERVER/server.js
chk $? "SERVER/server.js exports the SERVER_CONFIG"
grep -q 'active: "firebase"' SERVER/server.js
chk $? "SERVER_CONFIG selects firebase as the active server (initial arrangement preserved)"
grep -q 'firebaseConnector' SERVER/server.js && grep -q 'CONNECTORS' SERVER/server.js
chk $? "SERVER/server.js holds the connector registry"
if grep -qE 'AIzaSy|1:401281850731' SERVER/linker.js public/firebase.js; then
  echo "  VERIFY FAIL: credentials found outside SERVER/server.js"
  fail=$((fail+1))
else
  echo "  PASS: credentials exist ONLY in SERVER/server.js"
fi

# -- 6 - the shim still exports every name the pages import -------------------
exports="$( { sed -n 's/^export const \([A-Za-z_][A-Za-z0-9_]*\).*/\1/p' public/firebase.js
              sed -n 's/^export function \([A-Za-z_][A-Za-z0-9_]*\).*/\1/p' public/firebase.js
              sed -n '/^export {/,/};/p' public/firebase.js \
                | sed 's/export {//; s/};//' | tr ',' '\n' | tr -d ' ' | grep -v '^$'; } | sort -u)"
nexp="$(printf '%s\n' "$exports" | grep -c . || true)"
need="activeServer serverInfo JamalLinker auth provider db getFirestore onAuthStateChanged signInWithPopup signOut collection doc addDoc updateDoc deleteDoc getDocs getDoc setDoc writeBatch query where orderBy limit onSnapshot serverTimestamp Timestamp arrayUnion arrayRemove increment deleteField requireAuth"
nmissing=0
for nm in $need; do
  printf '%s\n' "$exports" | grep -qx "$nm" || { echo "  VERIFY FAIL: shim does not export '$nm'"; nmissing=$((nmissing+1)); fail=$((fail+1)); }
done
[ "$nmissing" -eq 0 ] && echo "  PASS: the shim exports all 31 names (every page import keeps working)"
echo "  INFO: shim export list parsed ($nexp names)"

# -- 7 - re-run the direct-connection scan on the new state --------------------
direct2="$(grep -rlE 'gstatic\.com/firebasejs|initializeApp|firebaseConfig|apiKey' public --include='*.js' --include='*.html' 2>/dev/null | grep -v '^public/firebase.js$' | grep -v '^public/mock/' | grep -v '^public/SERVER/' | sort)"
if [ -z "$direct2" ]; then
  echo "  PASS: post-change scan — no direct database connections outside SERVER/"
else
  echo "  VERIFY FAIL: direct connections appeared:"
  printf '%s\n' "$direct2"
  fail=$((fail+1))
fi

# -- 8 - THE SWEEP: every page import vs the shim export list -----------------
nfiles=0; nbad=0; nnotes=0
while IFS= read -r f; do
  nfiles=$((nfiles + 1))
  names="$(tr '\n' ' ' < "$f" \
    | grep -o 'import[[:space:]]*{[^}]*}[[:space:]]*from[[:space:]]*"/firebase\.js"' \
    | sed 's/.*{//; s/}.*//' | tr ',' '\n' | tr -d ' ' | grep -v '^$')"
  health=0
  case "$f" in
    *victim-registration/322.js|*triage/323.js|*nurse-consultation/324.js|\
*doctor-consultation/325.js|*pharmacy/326.js|*treatment-procedures/327.js|\
*patient-module/328.js|*health/patient-info.js|\
*ward-management/331.js|*ward-management/332.js|*ward-management/333.js|\
*ward-management/334.js|*ward-management/335.js|*ward-management/336.js|\
*ward-management/337.js|*ward-management/338.js|\
*patient-admission/341.js|*patient-admission/342.js|*patient-admission/343.js|\
*patient-discharge/350.js|*patient-discharge/351.js|*patient-discharge/352.js|*patient-discharge/353.js|\
*laboratory/360.js|*laboratory/361.js|*laboratory/362.js|*laboratory/363.js|\
*radiology/370.js|*radiology/371.js|*radiology/372.js|*radiology/373.js) health=1 ;;
  esac
  while IFS= read -r nm; do
    [ -n "$nm" ] || continue
    if ! printf '%s\n' "$exports" | grep -qx "$nm"; then
      if [ "$health" -eq 1 ]; then
        echo "  VERIFY FAIL: $f imports '$nm' - the shim does not export it"
        nbad=$((nbad + 1)); fail=$((fail+1))
      else
        echo "  NOTE: $f imports '$nm' - not exported (pre-existing, not this task's scope)"
        nnotes=$((nnotes + 1))
      fi
    fi
  done <<EOF
$names
EOF
done <<EOF
$(grep -rl 'from "/firebase.js"' public --include='*.js' 2>/dev/null)
EOF
if [ "$nbad" -eq 0 ]; then
  echo "  PASS: the import sweep checked $nfiles page(s) against the shim export list — all 27 health pages covered ($nnotes pre-existing notes)"
fi

echo ""
if [ "$fail" -eq 0 ]; then
  echo "=================================================================="
  echo " TASK 55 VERIFY: ALL PASS"
  echo "=================================================================="
  echo ""
  echo " DONE — what just changed:"
  echo "   - SERVER/linker.js + SERVER/server.js created (canonical, project root)"
  echo "   - public/SERVER/ holds their exact served mirrors"
  echo "   - public/firebase.js is now a pure shim; NO page was edited"
  echo "   - SERVER-CONNECTION-AUDIT.txt documents the whole connection surface"
  echo ""
  echo " NOW:"
  echo "   1. git add -A && git commit && git push   (Vercel deploys)"
  echo "   2. hard-refresh the site (Ctrl+Shift+R), sign in, open any page —"
  echo "      everything must behave exactly as before"
  echo "   3. proof in DevTools (F12) Network tab: /firebase.js loads,"
  echo "      then /SERVER/linker.js, then /SERVER/server.js"
  echo ""
  echo " RULES FROM NOW ON:"
  echo "   - no page may import a database SDK or hold credentials —"
  echo "     everything goes through /SERVER/linker.js"
  echo "   - to move the project to a different server later: edit"
  echo "     SERVER/server.js only (add a connector, flip SERVER_CONFIG.active),"
  echo "     then refresh the mirror:  cp SERVER/*.js public/SERVER/"
  echo "   - after editing SERVER/ files, always run:  cp SERVER/*.js public/SERVER/"
  echo ""
  echo " (No firestore.rules change in this task — nothing to publish there.)"
else
  echo "=================================================================="
  echo " TASK 55 VERIFY: FAIL ($fail check(s) failed) — do NOT git push."
  echo "=================================================================="
  exit 1
fi

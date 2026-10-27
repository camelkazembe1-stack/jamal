#!/usr/bin/env bash
# ============================================================================
# JAMALI — TASK 57B — HOTFIX: "click a user and nothing appears"
# ----------------------------------------------------------------------------
# TWO fixes on top of the full task 57 state:
#   A. THE REAL BUG: system-admin/380.js used getDoc(...) without importing
#      it (a task 56 mistake that shipped live). Picking a user in
#      Users & Access silently failed and the Pages tab failed silently.
#      Fixed: getDoc is now imported, and the verify sweep below re-checks
#      every Firestore call in the shipped pages against its import list.
#   B. THE DEPLOY GAP: files only reach the site after git push. This script
#      now commits AND pushes for you once every check passes.
#
# Everything from task 57 is re-shipped unchanged and idempotently:
#   1. the Admin button (top-right, administrator only),
#   2. Total Accounts / Ready / Pending counters with the users list behind
#      each number,
#   3. the person-icon menu (name + Logout + Switch Account -> login page),
#   4. recovery pages showing one step at a time.
#
# Idempotent and self-healing. Safe to run in any order after task 56b.
#
# HOW TO RUN: bash jamali-task57b-admin-dashboard-hotfix.sh  (repo root)
# The verify tail must end with: TASK 57B VERIFY: ALL PASS
# ============================================================================
set -u

if [ ! -f public/firebase.js ]; then
  echo "ERROR: run this script from the repository root — the folder that contains public/ (~/jamal)."
  exit 1
fi
echo "== TASK 57B: fix 'click a user and nothing appears' + auto-deploy ==="
echo ""

# ---------------------------------------------------------------------------
# STEP 1 — self-healing patches: menu entry + 322.html config hook
# ---------------------------------------------------------------------------
echo "-- STEP 1: menu entry + page-configuration hook (self-healing) --"
if ! grep -q 'folder: "system-admin"' public/menu.js; then
  awk '
    { print }
    /label: "Home", icon: "🏠", folder: "home", n: 1, d: 0/ &&
    !done {
      print "    { label: \"Account Administration\", icon: \"🛡️\", folder: \"system-admin\", n: 380, d: 0 },";
      done=1
    }' public/menu.js > public/menu.js.tmp && mv public/menu.js.tmp public/menu.js
  echo "  menu.js: Account Administration entry added"
else
  echo "  menu.js: Account Administration entry already present"
fi
if ! grep -q '/system-page-config.js' public/victim-registration/322.html; then
  awk '
    { print }
    /<script src="\/sidebar.js" defer><\/script>/ && !done {
      print "<script src=\"/system-page-config.js\" defer></script>";
      done=1
    }' public/victim-registration/322.html > public/victim-registration/322.html.tmp \
    && mv public/victim-registration/322.html.tmp public/victim-registration/322.html
  echo "  322.html: system-page-config.js hook added"
else
  echo "  322.html: configuration hook already present"
fi

# ---------------------------------------------------------------------------
# STEP 2 — the SERVER connection layer (unchanged since task 55/56b)
# ---------------------------------------------------------------------------
echo "-- STEP 2: SERVER layer (unchanged, re-shipped for run-order safety) --"
mkdir -p SERVER public/SERVER
cat > "SERVER/linker.js" << 'T57_LINKER'
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
// TASK 56 — THE TWO-KEY MODEL:
//   key to the HOUSE  = the Google sign-in (real authentication, unchanged)
//   keys to the ROOMS = the system account (stored data: role, grants).
//   requireAuth() now enforces BOTH: a signed-in Google user with a valid
//   account session, and — for non-administrators — access to the folder
//   (module area) the page belongs to. Direct links to ungranted areas
//   bounce to the start page. Session lives in sessionStorage under
//   "JAMALI_SYSTEM_SESSION"; the homepage (index.html) writes it at login.
//
// FOR EXISTING PAGES:
//   public/firebase.js is a thin compatibility layer that re-exports the
//   names below. Every page keeps working unchanged.
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

// ---------------------------------------------------------------------------
// SYSTEM SESSION — the room keys (task 56). Written by index.html at account
// login; every page enforces it through requireAuth().
// ---------------------------------------------------------------------------
export const SYSTEM_SESSION_KEY = "JAMALI_SYSTEM_SESSION";

// Folders any signed-in user may open without an explicit grant. The
// system-administration folder is open to administrators only.
const ALWAYS_OPEN = ["home", "account-recovery"];

export function readSystemSession() {
  try {
    const raw = sessionStorage.getItem(SYSTEM_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearSystemSession() {
  try { sessionStorage.removeItem(SYSTEM_SESSION_KEY); } catch (e) {}
}

// Which module folder does this page live in? ("/triage/323" -> "triage")
function currentFolder() {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts.length ? parts[0] : "";
}

// May the session holder open this folder? Administrators open everything.
function folderAllowed(folder, session) {
  if (!session) return false;
  if (session.role === "admin") return true;
  if (folder === "system-admin") return false;
  if (ALWAYS_OPEN.indexOf(folder) !== -1) return true;
  return Array.isArray(session.grants) && session.grants.indexOf(folder) !== -1;
}

// --- guard for inner pages (house key + room keys + direct-link guard) -------
// Resolves with the Google user only when: the user is signed in to Google,
// holds a valid account session for that identity, and (for non-admins) the
// page's folder is among the modules/submodules granted to the account.
// Signed-out visitors and ungranted direct links bounce to the start page,
// which is the Login / Create Account screen.
export function requireAuth() {
  return new Promise((resolve) => {
    server.authApi.onAuthStateChanged(server.auth, (user) => {
      if (!user) {
        clearSystemSession();
        location.replace("/?need=house");
        return;
      }
      const s = readSystemSession();
      if (!s || s.uid !== user.uid) {
        clearSystemSession();
        location.replace("/?need=account");
        return;
      }
      const folder = currentFolder();
      if (!folderAllowed(folder, s)) {
        location.replace("/?denied=" + encodeURIComponent(folder || "system"));
        return;
      }
      resolve(user);
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

  // System session (room keys)
  session: {
    read: readSystemSession,
    clear: clearSystemSession,
    folderAllowed: (folder) => folderAllowed(folder, readSystemSession())
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
T57_LINKER
cp "SERVER/linker.js" "public/SERVER/linker.js"
cat > "SERVER/server.js" << 'T57_SERVER'
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
T57_SERVER
cp "SERVER/server.js" "public/SERVER/server.js"
cat > "public/firebase.js" << 'T57_FIREBASE'
// JAMALI — shared connection module (task 55: centralized SERVER architecture,
// task 56: system session helpers join the surface)
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
  requireAuth,
  SYSTEM_SESSION_KEY,
  readSystemSession,
  clearSystemSession
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
  requireAuth,
  SYSTEM_SESSION_KEY,
  readSystemSession,
  clearSystemSession
};
T57_FIREBASE
echo "  wrote SERVER/{linker,server}.js + public/SERVER mirrors + firebase.js shim"

# ---------------------------------------------------------------------------
# STEP 3 — the start page (task 56b state: claim fix + friendly errors)
# ---------------------------------------------------------------------------
echo "-- STEP 3: the start page (56b state) --"
mkdir -p public/account-recovery public/system-admin
cat > "public/index.html" << 'T57_INDEX'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JAMALI — MultiSystem Management</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  body {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #e2e8f0; padding: 20px;
  }
  .card {
    background: #111827; border: 1px solid #1f2937; border-radius: 18px;
    padding: 40px 38px; width: 100%; max-width: 440px;
    box-shadow: 0 24px 60px rgba(0,0,0,.45);
  }
  .logo {
    width: 62px; height: 62px; margin: 0 auto 18px; border-radius: 16px;
    background: linear-gradient(135deg, #38bdf8, #0ea5e9);
    display: flex; align-items: center; justify-content: center;
    font-weight: 900; font-size: 22px; color: #fff; letter-spacing: 1px;
  }
  h1 { font-size: 21px; line-height: 1.35; margin-bottom: 8px; text-align: center; }
  h1 span { color: #38bdf8; }
  .sub { font-size: 14px; color: #94a3b8; margin-bottom: 22px; text-align: center; }
  label { display: block; font-size: 13px; color: #94a3b8; margin: 12px 0 5px; }
  input {
    width: 100%; background: #0b1220; color: #e2e8f0; border: 1px solid #334155;
    border-radius: 10px; padding: 11px 13px; font-size: 15px; outline: none;
  }
  input:focus { border-color: #38bdf8; }
  button.wide {
    width: 100%; margin-top: 18px; display: flex; align-items: center; justify-content: center; gap: 10px;
    background: linear-gradient(135deg, #38bdf8, #0ea5e9); color: #06121f; border: 0; border-radius: 12px;
    padding: 13px 16px; font-size: 15px; font-weight: 800; cursor: pointer; transition: .2s;
  }
  button.wide:hover { filter: brightness(1.07); transform: translateY(-1px); }
  button.wide:disabled { opacity: .6; cursor: wait; transform: none; }
  .swap { margin-top: 16px; text-align: center; font-size: 13.5px; color: #94a3b8; }
  .swap a { color: #38bdf8; cursor: pointer; text-decoration: none; font-weight: 700; }
  .links { margin-top: 14px; text-align: center; font-size: 12.5px; color: #64748b; }
  .links a { color: #94a3b8; cursor: pointer; text-decoration: none; }
  .links a:hover { color: #38bdf8; }
  .status { margin-top: 14px; font-size: 13px; color: #f87171; min-height: 18px; text-align: center; }
  .status.ok { color: #4ade80; }
  .google-note { margin-top: 10px; font-size: 12px; color: #64748b; text-align: center; }
  .foot { margin-top: 24px; font-size: 12px; color: #475569; text-align: center; }
  .hidden { display: none; }
  .token-row input { letter-spacing: 8px; text-align: center; font-weight: 800; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">JA</div>
    <h1>Welcome to <span>Jamal MultiSystem Management</span></h1>
    <p class="sub" id="sub-line">Login to your account, or create one.</p>

    <!-- ============ LOGIN (username + token) ============ -->
    <section id="panel-login">
      <label for="li-username">Username</label>
      <input id="li-username" type="text" autocomplete="username" placeholder="Your username">
      <label for="li-token">Four-digit token</label>
      <div class="token-row"><input id="li-token" type="text" inputmode="numeric" maxlength="4" placeholder="••••"></div>
      <button class="wide" id="login-btn" type="button">Login</button>
      <p class="swap">No account yet? <a id="go-create">Create Account</a></p>
      <p class="links">
        <a id="go-forgot-token">Forgot Token?</a> &nbsp;·&nbsp;
        <a id="go-forgot-password">Forgot Password?</a> &nbsp;·&nbsp;
        <a id="go-forgot-phone">Forgot Phone Number?</a>
      </p>
      <p class="google-note">Your Google sign-in is the key to the house — you will be asked for it if needed.</p>
    </section>

    <!-- ============ CREATE ACCOUNT ============ -->
    <section id="panel-create" class="hidden">
      <label for="ca-username">Username</label>
      <input id="ca-username" type="text" placeholder="Choose a username">
      <label for="ca-password">Password</label>
      <input id="ca-password" type="password" autocomplete="new-password" placeholder="At least 6 characters">
      <label for="ca-phone">Phone number</label>
      <input id="ca-phone" type="tel" placeholder="e.g. 0780526437">
      <label for="ca-position">Staff position</label>
      <input id="ca-position" type="text" placeholder="e.g. Receptionist, Nurse, Accountant">
      <label for="ca-token">Four-digit token</label>
      <div class="token-row"><input id="ca-token" type="text" inputmode="numeric" maxlength="4" placeholder="••••"></div>
      <button class="wide" id="create-btn" type="button">Create Account</button>
      <p class="swap">Already registered? <a id="go-login">Back to Login</a></p>
    </section>

    <p class="status" id="status"></p>
    <p class="foot">JAMALI MultiSystem Management © <span id="year"></span></p>
  </div>

  <script type="module">
    import {
      auth, provider, onAuthStateChanged, signInWithPopup,
      db, collection, query, where, limit, getDocs,
      doc, getDoc, writeBatch, serverTimestamp
    } from "/firebase.js";

    document.getElementById("year").textContent = new Date().getFullYear();

    // ------------------------------------------------------------------
    // constants shared with the recovery pages and the security rules
    // ------------------------------------------------------------------
    const SALT = "JAMALI::v1::";
    const ADMIN_USERNAME = "jamal kazembe";
    const ADMIN_PASS_HASH  = "5c784bdcad7f92a39757e3ac0ae25315f422c4d97ef11cb438d059e9a830e9af";
    const ADMIN_TOKEN_HASH = "3f965d6df52296c4c2bf89878067be2c79cf6895189978f379746874728caae1";
    const SESSION_KEY = "JAMALI_SYSTEM_SESSION";

    const $ = (id) => document.getElementById(id);
    const status = $("status");

    function say(msg, ok) {
      status.textContent = msg || "";
      status.className = "status" + (ok ? " ok" : "");
    }
    function sha(v) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(SALT + v))
        .then((b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join(""));
    }
    function norm(u) { return u.trim().toLowerCase(); }
    // task 56b: "Missing or insufficient permissions" almost always means the
    // firestore.rules file was never published in the Firebase console — say
    // so in plain words instead of the raw Firebase error.
    function friendly(err) {
      const code = err && err.code ? String(err.code) : "";
      if (code.indexOf("permission-denied") !== -1 || (err && err.message && String(err.message).indexOf("insufficient permissions") !== -1)) {
        return "the database rules are not published yet. Open the Firebase console -> Firestore Database -> Rules, replace everything there with the contents of the file firestore.rules from the project folder, press Publish, then login again.";
      }
      return (err && err.message) ? err.message : code;
    }

    // ------------------------------------------------------------------
    // panels
    // ------------------------------------------------------------------
    function showPanel(which) {
      $("panel-login").classList.toggle("hidden", which !== "login");
      $("panel-create").classList.toggle("hidden", which !== "create");
      say("");
    }
    $("go-create").addEventListener("click", () => showPanel("create"));
    $("go-login").addEventListener("click", () => showPanel("login"));

    // recovery chain — the username travels with the link
    $("go-forgot-token").addEventListener("click", () => {
      const u = $("li-username").value.trim();
      location.href = "/account-recovery/390" + (u ? "?u=" + encodeURIComponent(u) : "");
    });
    $("go-forgot-password").addEventListener("click", () => {
      const u = $("li-username").value.trim();
      location.href = "/account-recovery/391" + (u ? "?u=" + encodeURIComponent(u) : "");
    });
    $("go-forgot-phone").addEventListener("click", () => {
      const u = $("li-username").value.trim();
      location.href = "/account-recovery/392" + (u ? "?u=" + encodeURIComponent(u) : "");
    });

    // ------------------------------------------------------------------
    // house key (Google) — unchanged authentication, asked for only when needed
    // ------------------------------------------------------------------
    async function ensureHouse() {
      if (auth.currentUser) return auth.currentUser;
      const res = await signInWithPopup(auth, provider);
      return res.user;
    }

    // ------------------------------------------------------------------
    // system session (the room keys) — written here, read by requireAuth
    // ------------------------------------------------------------------
    function writeSession(account, user) {
      const s = {
        uid: user.uid,
        username: account.usernameDisplay || account.id,
        position: account.position || "",
        role: account.role || (account.position === "admin" ? "admin" : "user"),
        grants: Array.isArray(account.grants) ? account.grants : [],
        at: Date.now()
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      return s;
    }

    function handleDeniedAndNeed() {
      const q = new URLSearchParams(location.search);
      if (q.get("denied")) {
        say("You do not have access to the \"" + q.get("denied") + "\" area. Ask the administrator to grant it.");
      } else if (q.get("need") === "house") {
        say("Please sign in first.");
      } else if (q.get("need") === "account") {
        say("Login with your username and token to continue.");
      }
    }

    // ------------------------------------------------------------------
    // LOGIN
    // ------------------------------------------------------------------
    $("login-btn").addEventListener("click", async () => {
      const btn = $("login-btn");
      const username = $("li-username").value.trim();
      const token = $("li-token").value.trim();
      if (!username) { say("Enter your username."); return; }
      if (!/^[0-9]{4}$/.test(token)) { say("Enter your four-digit token."); return; }
      btn.disabled = true; say("");

      try {
        const user = await ensureHouse();

        // ---- administrator bootstrap: the first ever login claims the admin ----
        if (norm(username) === ADMIN_USERNAME) {
          const admins = await getDocs(collection(db, "systemAdmins"));
          if (admins.empty) {
            const tokHash = await sha(token);
            if (tokHash !== ADMIN_TOKEN_HASH) { say("Wrong token for the administrator."); btn.disabled = false; return; }
            const id = norm(ADMIN_USERNAME);
            const batch = writeBatch(db);
            batch.set(doc(db, "systemSetup", "claim"), {
              googleUid: user.uid, passHash: ADMIN_PASS_HASH, tokenHash: ADMIN_TOKEN_HASH, at: serverTimestamp()
            });
            batch.set(doc(db, "systemAdmins", user.uid), {
              passHash: ADMIN_PASS_HASH, tokenHash: ADMIN_TOKEN_HASH, at: serverTimestamp()
            });
            // task 56b: the profile write carries the hash literals so the
            // security rules can verify the claim themselves (they could not
            // before — the batch was rejected with permission-denied).
            batch.set(doc(db, "systemAccounts", id), {
              usernameLower: id, usernameDisplay: ADMIN_USERNAME, position: "admin", role: "admin",
              status: "approved", googleUid: user.uid, grants: [],
              passHash: ADMIN_PASS_HASH, tokenHash: ADMIN_TOKEN_HASH, at: serverTimestamp()
            });
            batch.set(doc(db, "systemCredentials", id), {
              passHash: ADMIN_PASS_HASH, tokenHash: ADMIN_TOKEN_HASH, phone: "0780526437", googleUid: user.uid
            });
            await batch.commit();
            writeSession({ id, usernameDisplay: ADMIN_USERNAME, position: "admin", role: "admin", grants: [] }, user);
            location.href = "/home/1";
            return;
          }
        }

        // ---- normal account login ----
        const id = norm(username);
        const snap = await getDoc(doc(db, "systemAccounts", id));
        if (!snap.exists()) { say("No account with this username."); btn.disabled = false; return; }
        const acc = snap.data();

        if (acc.status === "pending") { say("Please wait for admin approval."); btn.disabled = false; return; }
        if (acc.status === "rejected") { say("This account was not approved. Ask the administrator."); btn.disabled = false; return; }
        if (acc.googleUid && acc.googleUid !== user.uid) {
          say("This account is bound to a different Google sign-in."); btn.disabled = false; return;
        }

        const credSnap = await getDoc(doc(db, "systemCredentials", id));
        if (!credSnap.exists()) { say("Account data is incomplete. Ask the administrator."); btn.disabled = false; return; }
        const tokHash = await sha(token);
        if (credSnap.data().tokenHash !== tokHash) { say("Wrong token."); btn.disabled = false; return; }

        writeSession({ id, ...acc }, user);
        location.href = "/home/1";
      } catch (err) {
        say("Login failed: " + friendly(err));
        btn.disabled = false;
      }
    });

    // ------------------------------------------------------------------
    // CREATE ACCOUNT
    // ------------------------------------------------------------------
    $("create-btn").addEventListener("click", async () => {
      const btn = $("create-btn");
      const username = $("ca-username").value.trim();
      const password = $("ca-password").value;
      const phone = $("ca-phone").value.trim();
      const position = $("ca-position").value.trim();
      const token = $("ca-token").value.trim();

      if (username.length < 3) { say("Username must be at least 3 characters."); return; }
      if (password.length < 6) { say("Password must be at least 6 characters."); return; }
      if (phone.replace(/[^0-9]/g, "").length < 9) { say("Enter a valid phone number."); return; }
      if (!position) { say("Enter your staff position."); return; }
      if (!/^[0-9]{4}$/.test(token)) { say("Choose a four-digit token."); return; }
      btn.disabled = true; say("");

      try {
        const user = await ensureHouse();
        const id = norm(username);
        if (id === ADMIN_USERNAME) { say("This username is reserved."); btn.disabled = false; return; }

        const dup = await getDocs(query(collection(db, "systemAccounts"), where("usernameLower", "==", id), limit(1)));
        if (!dup.empty) { say("That username is already taken."); btn.disabled = false; return; }

        const passHash = await sha(password);
        const tokHash = await sha(token);
        const batch = writeBatch(db);
        batch.set(doc(db, "systemAccounts", id), {
          usernameLower: id, usernameDisplay: username, position: position, role: "user",
          status: "pending", googleUid: user.uid, grants: [], at: serverTimestamp()
        });
        batch.set(doc(db, "systemCredentials", id), {
          passHash: passHash, tokenHash: tokHash, phone: phone, googleUid: user.uid
        });
        await batch.commit();

        showPanel("login");
        $("li-username").value = username;
        say("Your account has been created. Please wait for admin approval.", true);
        btn.disabled = false;
      } catch (err) {
        say("Could not create the account: " + friendly(err));
        btn.disabled = false;
      }
    });

    // ------------------------------------------------------------------
    // entry state: fully signed in (house + account session) -> home;
    // otherwise stay here — this page IS the Login / Create Account screen
    // ------------------------------------------------------------------
    onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) { handleDeniedAndNeed(); return; }
      try {
        const s = JSON.parse(raw);
        if (s.uid === user.uid) location.replace("/home/1");
        else { sessionStorage.removeItem(SESSION_KEY); handleDeniedAndNeed(); }
      } catch (e) { sessionStorage.removeItem(SESSION_KEY); handleDeniedAndNeed(); }
    });
  </script>
</body>
</html>
T57_INDEX
echo "  wrote public/index.html"

# ---------------------------------------------------------------------------
# STEP 4 — sidebar.js: per-user tree + person icon + ADMIN BUTTON (task 57)
# ---------------------------------------------------------------------------
echo "-- STEP 4: sidebar.js (per-user tree + person icon + Admin button) --"
cat > "public/sidebar.js" << 'T57_SIDEBAR'
/* JAMALI — shared sidebar (every page except index.html).
   THE TWO IRON RULES (unchanged):
   - this file holds NO page data (the tree comes from menu.js)
   - this file calls NO file (no fetch, no import)
   Adding or moving a page is still ONE line in menu.js — never this file.
   The tree is COLLAPSIBLE: any node whose menu entries go one level deeper
   gets a toggle. Home and Business start open, deeper nodes start closed,
   and the path to the page you are on is opened automatically.

   TASK 56 — the two-key model:
   - key to the HOUSE = the Google sign-in; keys to the ROOMS = the system
     account session (sessionStorage "JAMALI_SYSTEM_SESSION", written by the
     start page at account login).
   - this file renders the tree PER USER: administrators see everything;
     other accounts see only the folders granted to them (all hidden until
     the administrator grants access).
   - the PERSON ICON sits immediately to the right of JAMAL with a small
     space; clicking it opens Logout and Switch Account. Both hide the
     system and return to the start page (Login / Create Account).
   - folder links whose area the session may not open (home page tiles,
     hub links, cross-page links) are hidden as well.

   TASK 57 — the Admin button:
   - when the administrator is logged in, a fixed "Admin" button sits at
     the top-right corner of every page and opens the Account
     Administration dashboard (/system-admin/380). Everyone else never
     sees it. */
(function () {

  var SESSION_KEY = "JAMALI_SYSTEM_SESSION";
  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (e) { return null; }
  }
  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  var session = readSession();

  // Folders any account may open without a grant; system-admin is admin-only.
  var ALWAYS_OPEN = ["home", "account-recovery"];
  function folderAllowed(folder) {
    if (!session) return false;
    if (session.role === "admin") return true;
    if (folder === "system-admin") return false;
    if (ALWAYS_OPEN.indexOf(folder) !== -1) return true;
    return !!(session.grants && session.grants.indexOf(folder) !== -1);
  }

  // Current folder — read BEFORE the address bar is cleaned, so the
  // active page can still be highlighted in the family tree
  var current = location.pathname.split("/")[1];

  // Address bar always shows the bare domain
  try { history.replaceState({}, "", "/"); } catch (e) {}

  // The family tree — provided by menu.js. This file holds no page data.
  var PAGES = window.JAMALI_MENU || [];

  // Hide entries the session may not open, BEFORE the tree is drawn:
  // an ungranted parent hides its whole branch.
  var visible = PAGES.map(function (p) { return folderAllowed(p.folder); });
  for (var v = 0; v < PAGES.length; v++) {
    if (visible[v]) continue;
    var my = PAGES[v].d || 0;
    for (var w = v + 1; w < PAGES.length; w++) {
      if ((PAGES[w].d || 0) <= my) break;
      visible[w] = false; // children of a hidden node stay hidden
    }
  }

  // ---- collapsible tree helpers (children derived from the d values) ----

  // Direct children of entry i: the entries after i that sit exactly one
  // level deeper, stopping at the first entry at i's level or higher.
  function kidsOf(i) {
    var out = [], my = PAGES[i].d || 0;
    for (var j = i + 1; j < PAGES.length; j++) {
      var dj = PAGES[j].d || 0;
      if (dj <= my) break;
      if (dj === my + 1 && visible[j]) out.push(j);
    }
    return out;
  }

  // Does this node's whole branch contain the page we are on?
  function subtreeHasCurrent(i) {
    if (PAGES[i].folder === current) return true;
    var k = kidsOf(i);
    for (var x = 0; x < k.length; x++) {
      if (subtreeHasCurrent(k[x])) return true;
    }
    return false;
  }

  // Render entry i and (if it has children) its collapsible kids box.
  function render(i) {
    var p = PAGES[i];
    var cls = "lv" + (p.d || 0);
    if (p.folder === current) cls += " active";
    var html = "<div class=\"node\"><a href=\"/" + p.folder + "/" + p.n +
               "\" class=\"" + cls + "\"><span>" + p.icon + "</span>" + p.label + "</a>";
    var k = kidsOf(i);
    if (k.length) {
      html += "<button type=\"button\" class=\"tg\" aria-expanded=\"false\"></button></div>";
      // default: shallow parents (Home, Business) open, deeper ones closed;
      // the active page's path is always opened
      var open = (p.d || 0) <= 1 || subtreeHasCurrent(i);
      html += "<div class=\"kids\"" + (open ? "" : " hidden") + ">";
      for (var x = 0; x < k.length; x++) html += render(k[x]);
      html += "</div>";
    } else {
      html += "</div>";
    }
    return html;
  }

  // Draw every visible top-level entry (d: 0), e.g. Home.
  var nav = "";
  for (var r = 0; r < PAGES.length; r++) {
    if ((PAGES[r].d || 0) === 0 && visible[r]) nav += render(r);
  }
  if (nav === "") { // defensive: flat list if the menu has no depth at all
    for (var f = 0; f < PAGES.length; f++) { if (visible[f]) nav += render(f); }
  }

  var css = document.createElement("style");
  css.textContent = [
    "#jamali-sidebar{position:fixed;top:0;left:0;bottom:0;width:220px;background:#0f172a;",
    "color:#e2e8f0;display:flex;flex-direction:column;z-index:1000;transition:transform .25s ease}",
    "#jamali-sidebar .brand{height:60px;flex:0 0 60px;display:flex;align-items:center;gap:10px;",
    "padding:0 18px;font-weight:900;letter-spacing:2px;color:#fff;border-bottom:1px solid #1e293b}",
    "#jamali-sidebar .brand i{width:30px;height:30px;border-radius:9px;display:flex;",
    "align-items:center;justify-content:center;font-style:normal;font-size:12px;",
    "background:linear-gradient(135deg,#38bdf8,#0ea5e9);color:#fff}",
    "#jamali-person{margin-left:2px;border:0;background:none;color:#94a3b8;font-size:19px;",
    "cursor:pointer;line-height:1;padding:2px 3px;border-radius:8px}",
    "#jamali-person:hover{background:#1e293b;color:#fff}",
    "#jamali-acct{position:absolute;top:56px;left:14px;background:#111827;border:1px solid #334155;",
    "border-radius:12px;min-width:180px;box-shadow:0 14px 34px rgba(0,0,0,.5);overflow:hidden}",
    "#jamali-acct .who{padding:10px 14px;font-size:12px;color:#94a3b8;border-bottom:1px solid #1e293b}",
    "#jamali-acct .who b{display:block;color:#e2e8f0;font-size:13px;white-space:nowrap;",
    "overflow:hidden;text-overflow:ellipsis}",
    "#jamali-acct button{display:block;width:100%;text-align:left;border:0;background:none;",
    "color:#e2e8f0;font-size:13.5px;padding:10px 14px;cursor:pointer}",
    "#jamali-acct button:hover{background:#1e293b}",
    "#jamali-admin-btn{position:fixed;top:14px;right:14px;z-index:1001;border:0;border-radius:12px;",
    "padding:9px 18px;font-size:13.5px;font-weight:800;cursor:pointer;color:#06121f;",
    "background:linear-gradient(135deg,#38bdf8,#0ea5e9);box-shadow:0 10px 24px rgba(0,0,0,.35)}",
    "#jamali-admin-btn:hover{filter:brightness(1.07)}",
    "#jamali-sidebar nav{flex:1;overflow-y:auto;padding:8px 0}",
    "#jamali-sidebar a{display:flex;align-items:center;gap:12px;padding:9px 18px;",
    "color:#94a3b8;text-decoration:none;font-size:14px;border-left:3px solid transparent}",
    "#jamali-sidebar a.lv1{padding-left:26px}",
    "#jamali-sidebar a.lv2{padding-left:34px}",
    "#jamali-sidebar a.lv3{padding-left:42px}",
    "#jamali-sidebar a:hover{background:#1e293b;color:#fff}",
    "#jamali-sidebar a.active{background:#1e293b;color:#fff;border-left-color:#38bdf8}",
    "#jamali-sidebar .node{display:flex;align-items:stretch}",
    "#jamali-sidebar .node a{flex:1;min-width:0}",
    "#jamali-sidebar .tg{flex:0 0 30px;border:0;background:none;color:#64748b;",
    "font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;",
    "justify-content:center;padding:0}",
    "#jamali-sidebar .tg:hover{color:#fff}",
    "#jamali-sidebar .kids[hidden]{display:none}",
    "body.jamali-has-sidebar{margin-left:220px}",
    "#jamali-burger{display:none;position:fixed;top:12px;left:12px;z-index:1002;width:42px;height:42px;",
    "border-radius:10px;border:1px solid #334155;background:#0f172a;color:#fff;font-size:19px;",
    "align-items:center;justify-content:center;cursor:pointer}",
    "#jamali-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999}",
    "@media(max-width:800px){",
    " body.jamali-has-sidebar{margin-left:0}",
    " #jamali-sidebar{transform:translateX(-100%)}",
    " body.jamali-sidebar-open #jamali-sidebar{transform:none}",
    " #jamali-burger{display:flex}",
    " body.jamali-sidebar-open #jamali-overlay{display:block}}"
  ].join("");
  document.head.appendChild(css);

  var burger = document.createElement("button");
  burger.id = "jamali-burger";
  burger.innerHTML = "&#9776;";
  burger.addEventListener("click", function () {
    document.body.classList.toggle("jamali-sidebar-open");
  });

  var overlay = document.createElement("div");
  overlay.id = "jamali-overlay";
  overlay.addEventListener("click", function () {
    document.body.classList.remove("jamali-sidebar-open");
  });

  // brand: JAMAL first, then the person icon immediately to its right with
  // a small space (task 56). The icon opens Logout / Switch Account.
  var aside = document.createElement("aside");
  aside.id = "jamali-sidebar";
  aside.innerHTML =
    "<div class=\"brand\"><i>JA</i>JAMAL" +
    "<button type=\"button\" id=\"jamali-person\" title=\"Account\">&#128100;</button></div>" +
    "<nav>" + nav + "</nav>";

  document.body.insertBefore(overlay, document.body.firstChild);
  document.body.insertBefore(aside, document.body.firstChild);
  document.body.insertBefore(burger, document.body.firstChild);
  document.body.classList.add("jamali-has-sidebar");

  // ---- account menu: Logout + Switch Account (task 56) ----------------------
  var who = session ? (session.username || "account") : "account";
  var roleLine = session ? (session.role === "admin" ? "administrator" : (session.position || "user")) : "";
  var acct = document.createElement("div");
  acct.id = "jamali-acct";
  acct.hidden = true;
  acct.innerHTML =
    "<div class=\"who\"><b></b>" + roleLine + "</div>" +
    "<button type=\"button\" id=\"jamali-switch\">Switch Account</button>" +
    "<button type=\"button\" id=\"jamali-logout\">Logout</button>";
  acct.querySelector(".who b").textContent = who;
  document.body.insertBefore(acct, document.body.firstChild);

  document.getElementById("jamali-person").addEventListener("click", function (ev) {
    ev.stopPropagation();
    acct.hidden = !acct.hidden;
  });
  document.addEventListener("click", function (ev) {
    if (!acct.hidden && ev.target !== acct && !acct.contains(ev.target)) acct.hidden = true;
  });

  // Switch Account: drop the room keys, keep the house key, back to the start.
  document.getElementById("jamali-switch").addEventListener("click", function () {
    clearSession();
    location.href = "/";
  });

  // Logout: drop the room keys AND the house key — full sign-out.
  document.getElementById("jamali-logout").addEventListener("click", function () {
    clearSession();
    import("/firebase.js").then(function (fb) {
      return fb.signOut(fb.auth);
    }).then(function () {
      location.href = "/";
    }).catch(function () {
      location.href = "/";
    });
  });

  // ---- TASK 57: the Admin button — top-right corner of every page, --------
  // ---- administrators only. Opens the Account Administration dashboard.
  if (session && session.role === "admin") {
    var abtn = document.createElement("button");
    abtn.id = "jamali-admin-btn";
    abtn.type = "button";
    abtn.textContent = "Admin";
    abtn.title = "Account Administration";
    abtn.addEventListener("click", function () {
      location.href = "/system-admin/380";
    });
    document.body.appendChild(abtn);
  }

  // ---- v / ^ toggles: v = children closed (click to open), ^ = open (click to close)
  function sync(btn) {
    var box = btn.parentNode.nextElementSibling;
    var open = !!(box && !box.hasAttribute("hidden"));
    btn.textContent = open ? "\u25B4" : "\u25BE"; // ^ : v
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  var tgs = aside.querySelectorAll(".tg");
  for (var t = 0; t < tgs.length; t++) {
    (function (btn) {
      sync(btn);
      btn.addEventListener("click", function () {
        var box = btn.parentNode.nextElementSibling;
        if (!box) return;
        if (box.hasAttribute("hidden")) { box.removeAttribute("hidden"); }
        else { box.setAttribute("hidden", ""); }
        sync(btn);
      });
    })(tgs[t]);
  }

  // ---- hide folder links the session may not open (tiles, hub links, etc.) --
  // Runs after the page content exists; also covers links rendered later by
  // listening once for DOM additions.
  function filterLinks(root) {
    var links = (root || document).querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      var m = href.match(/^\/([a-z0-9-]+)\//i);
      if (!m) continue;
      if (m[1] === current) continue;                    // the page you are on
      if (!folderAllowed(m[1])) links[i].style.display = "none";
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { filterLinks(document); });
  } else {
    filterLinks(document);
  }
})();
T57_SIDEBAR
echo "  wrote public/sidebar.js"

# ---------------------------------------------------------------------------
# STEP 5 — page field configuration (unchanged)
# ---------------------------------------------------------------------------
echo "-- STEP 5: system-page-config.js + the Registration hook --"
cat > "public/system-page-config.js" << 'T57_PAGECFG'
/* JAMALI — system page configuration applier (task 56).
   The administrator can hide EXISTING fields and set default values for
   them, per page (requirement 7). This file never creates new fields —
   it only hides or pre-fills what the page already has.

   How it works:
   - each configured page has a document in the systemPageConfig collection:
       { page: "victim-registration-322", hidden: ["in-sex"], defaults: { "in-priority": "Medium" } }
   - this script reads the session (room keys) and skips everything for the
     administrator — the admin always sees the full form.
   - for everyone else: hidden fields get display:none on their label
     wrapper; defaults are applied to the input/select/textarea.
   - the applier re-runs whenever the page clears its form (Register
     Another / Clear Form), so defaults come back on a fresh form.

   Connection discipline: this file is a classic script, so it reaches the
   database through the linker via a dynamic import of /firebase.js — the
   same single connection point as every module. */
(function () {
  var SESSION_KEY = "JAMALI_SYSTEM_SESSION";
  var PAGE_ID = "victim-registration-322";

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (e) { return null; }
  }

  function wrapperOf(el) {
    // fields live inside a <label> — hide the whole label, never just the input
    return el.closest ? (el.closest("label") || el) : el;
  }

  function applyOne(el, value) {
    if (!el) return;
    if (el.type === "checkbox") { el.checked = !!value; return; }
    if (el.tagName === "SELECT") {
      var has = false;
      for (var i = 0; i < el.options.length; i++) {
        if (el.options[i].value === value || el.options[i].text === value) { has = true; break; }
      }
      if (has) el.value = value; // never invent options that do not exist
      return;
    }
    el.value = value;
  }

  function apply(config) {
    var hidden = (config && Array.isArray(config.hidden)) ? config.hidden : [];
    var defaults = (config && config.defaults) ? config.defaults : {};

    for (var h = 0; h < hidden.length; h++) {
      var el = document.getElementById(hidden[h]);
      if (el) wrapperOf(el).style.display = "none";
    }
    for (var id in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, id)) {
        applyOne(document.getElementById(id), defaults[id]);
      }
    }
  }

  function reapplyDefaults() {
    if (window.__jamalPageConfig) apply({ hidden: [], defaults: window.__jamalPageConfig.defaults || {} });
  }

  // Re-apply defaults after the page clears its own form (decoupled: we do
  // not edit the page's own code — we listen for its clear/again buttons).
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (t && t.id === "clear-btn") setTimeout(reapplyDefaults, 60);
    if (t && t.id === "again-btn") setTimeout(reapplyDefaults, 120);
  });

  var session = readSession();
  if (session && session.role === "admin") return; // administrator sees the full form

  import("/firebase.js").then(function (fb) {
    return fb.getDoc(fb.doc(fb.db, "systemPageConfig", PAGE_ID));
  }).then(function (snap) {
    if (!snap.exists()) return;
    var config = snap.data();
    window.__jamalPageConfig = config;
    apply(config);
  }).catch(function () {
    /* no configuration or no access — the form stays as the page built it */
  });
})();
T57_PAGECFG
echo "  wrote public/system-page-config.js (322.html hook from step 1)"

# ---------------------------------------------------------------------------
# STEP 6 — the administrator console (380) with the task 57 counters
# ---------------------------------------------------------------------------
echo "-- STEP 6: the Account Administration console (380 + counters) --"
cat > "public/system-admin/380.html" << 'T57_ADMHTML'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Account Administration — JAMALI</title>
<link rel="stylesheet" href="/system-admin/380.css">
<script src="/menu.js" defer></script>
<script src="/sidebar.js" defer></script>
</head>
<body>
<main class="wrap">

  <section class="head">
    <a class="back" href="/home/1">&larr; Home</a>
    <h1>Account Administration</h1>
    <p class="sub">Approve account requests, decide who enters which room, and customize pages. Administrators see everything; every other account starts with everything hidden.</p>
  </section>

  <!-- ================= TASK 57 · THE COUNTERS ================= -->
  <section class="stats-row" aria-label="Account totals">
    <button class="stat-card" id="stat-total" type="button">
      <span class="stat-num" id="stat-total-num">&ndash;</span>
      <span class="stat-label">Total Accounts</span>
      <span class="stat-hint">click to view the users</span>
    </button>
    <button class="stat-card" id="stat-ready" type="button">
      <span class="stat-num" id="stat-ready-num">&ndash;</span>
      <span class="stat-label">Ready</span>
      <span class="stat-hint">approved accounts</span>
    </button>
    <button class="stat-card" id="stat-pending" type="button">
      <span class="stat-num" id="stat-pending-num">&ndash;</span>
      <span class="stat-label">Pending</span>
      <span class="stat-hint">waiting for approval</span>
    </button>
  </section>

  <nav class="tabs">
    <button class="tab active" id="tab-requests" type="button">Account Requests <span class="badge" id="req-badge" hidden>0</span></button>
    <button class="tab" id="tab-users" type="button">Users &amp; Access</button>
    <button class="tab" id="tab-pages" type="button">Page Fields</button>
  </nav>

  <!-- ================= TAB 1 · ACCOUNT REQUESTS ================= -->
  <section class="panel" id="panel-requests">
    <div class="card">
      <h2>Pending account requests</h2>
      <p class="hint">People who created an account and are waiting for your approval.</p>
      <div class="table-wrap">
        <table class="bk">
          <thead><tr><th>Username</th><th>Staff position</th><th>Requested</th><th>Decision</th></tr></thead>
          <tbody id="req-body"></tbody>
        </table>
      </div>
      <p class="empty" id="req-empty" hidden>No pending requests.</p>
    </div>

    <div class="card">
      <h2>Rejected accounts</h2>
      <p class="hint">A rejected account can still be approved later if you change your mind.</p>
      <div class="table-wrap">
        <table class="bk">
          <thead><tr><th>Username</th><th>Staff position</th><th>Decision</th></tr></thead>
          <tbody id="rej-body"></tbody>
        </table>
      </div>
      <p class="empty" id="rej-empty" hidden>No rejected accounts.</p>
    </div>
  </section>

  <!-- ================= TAB 2 · USERS & ACCESS ================= -->
  <section class="panel" id="panel-users" hidden>
    <div class="card">
      <h2>Choose a user</h2>
      <p class="hint">Approved accounts. Select one, then tick the rooms it may enter.</p>
      <select id="user-select"><option value="">— Select a user —</option></select>
      <p class="who-line" id="user-who" hidden></p>
    </div>

    <div class="card" id="grants-card" hidden>
      <h2>Modules and submodules this user can access</h2>
      <p class="hint">Unticked = hidden everywhere, including by direct link. Ticking a whole area (for example Health) grants its hub page; tick the individual rooms below it one by one.</p>
      <div id="grants-tree"></div>
      <p class="save-line"><button class="btn-primary" id="grants-save" type="button">Save Access</button>
      <span class="ok-note" id="grants-ok" hidden>Saved.</span></p>
    </div>
  </section>

  <!-- ================= TAB 3 · PAGE FIELDS ================= -->
  <section class="panel" id="panel-pages" hidden>
    <div class="card">
      <h2>Choose a page</h2>
      <p class="hint">You can hide EXISTING fields and give them default values. New fields cannot be created here.</p>
      <select id="page-select"></select>
    </div>

    <div class="card" id="fields-card" hidden>
      <h2 id="fields-title">Fields</h2>
      <p class="hint">Hidden fields disappear from the page for other users (the administrator always sees the full form). Defaults fill in when the form opens and after it is cleared.</p>
      <div class="table-wrap">
        <table class="bk fields-table">
          <thead><tr><th>Field</th><th>Hidden</th><th>Default value</th></tr></thead>
          <tbody id="fields-body"></tbody>
        </table>
      </div>
      <p class="save-line"><button class="btn-primary" id="fields-save" type="button">Save Page Settings</button>
      <span class="ok-note" id="fields-ok" hidden>Saved.</span></p>
    </div>
  </section>

  <!-- ================= TASK 57 · WHO IS BEHIND A NUMBER ================= -->
  <section class="card" id="users-panel" hidden>
    <h2 id="users-title">Users</h2>
    <p class="hint" id="users-hint"></p>
    <div class="table-wrap">
      <table class="bk">
        <thead><tr><th>Username</th><th>Staff position</th><th>Status</th><th>Granted areas</th><th>Registered</th></tr></thead>
        <tbody id="users-body"></tbody>
      </table>
    </div>
    <p class="empty" id="users-empty" hidden>No accounts in this view yet.</p>
    <p class="save-line"><button class="btn-ghost" id="users-close" type="button">Close</button></p>
  </section>

  <p class="form-err" id="err" hidden></p>
</main>

<script type="module" src="/system-admin/380.js"></script>
</body>
</html>
T57_ADMHTML
cat > "public/system-admin/380.css" << 'T57_ADMCSS'
/* JAMALI — Account Administration (380) — task 56 */
.wrap { max-width: 980px; margin: 0 auto; padding: 26px 18px 60px; }
.head h1 { margin: 8px 0 4px; font-size: 26px; }
.sub { color: #64748b; font-size: 14px; margin-bottom: 6px; }
.back { color: #0ea5e9; text-decoration: none; font-size: 14px; }

.tabs { display: flex; gap: 8px; margin: 18px 0 16px; flex-wrap: wrap; }
.tab {
  border: 1px solid #cbd5e1; background: #fff; color: #334155; border-radius: 10px;
  padding: 9px 16px; font-size: 14px; font-weight: 700; cursor: pointer;
}
.tab.active { background: #0ea5e9; border-color: #0ea5e9; color: #fff; }
.badge { background: #ef4444; color: #fff; border-radius: 999px; padding: 1px 8px; font-size: 12px; margin-left: 6px; }

.card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
  padding: 18px 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.06);
}
.card h2 { font-size: 17px; margin-bottom: 4px; }
.hint { color: #64748b; font-size: 13px; margin-bottom: 12px; }

.table-wrap { overflow-x: auto; }
table.bk { width: 100%; border-collapse: collapse; font-size: 14px; }
table.bk th, table.bk td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
table.bk th { color: #64748b; font-size: 12.5px; text-transform: uppercase; letter-spacing: .4px; }
.empty { color: #64748b; font-size: 14px; padding: 10px 0; }

select {
  font-size: 14px; padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 9px;
  background: #fff; color: #0f172a; min-width: 240px;
}
.who-line { margin-top: 10px; color: #334155; font-size: 14px; }

.grant-group { margin: 10px 0 14px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
.grant-group > label.big { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14.5px; cursor: pointer; }
.grant-kids { margin: 8px 0 2px 26px; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 4px 10px; }
.grant-kids label { display: flex; align-items: center; gap: 7px; font-size: 13.5px; color: #334155; cursor: pointer; padding: 3px 0; }
input[type="checkbox"] { width: 16px; height: 16px; accent-color: #0ea5e9; }

.fields-table td { white-space: nowrap; }
.fields-table input[type="text"] {
  font-size: 13.5px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 8px; min-width: 160px;
}
.save-line { margin-top: 14px; display: flex; align-items: center; gap: 12px; }
.ok-note { color: #16a34a; font-size: 13.5px; font-weight: 700; }

.btn-primary {
  background: #0ea5e9; border: 0; color: #fff; font-weight: 800; font-size: 14px;
  padding: 10px 18px; border-radius: 10px; cursor: pointer;
}
.btn-primary:hover { filter: brightness(1.06); }
.btn-ghost {
  background: #fff; border: 1px solid #cbd5e1; color: #334155; font-weight: 700; font-size: 13px;
  padding: 7px 12px; border-radius: 9px; cursor: pointer; margin-right: 6px;
}
.btn-ghost:hover { background: #f1f5f9; }
.btn-danger { border-color: #fecaca; color: #b91c1c; }
.btn-danger:hover { background: #fef2f2; }
.form-err { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 14px; margin-top: 10px; }

/* ---- task 57: the counters and the user list behind them ---- */
.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 6px 0 18px; }
.stat-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 18px;
  cursor: pointer; box-shadow: 0 1px 3px rgba(15,23,42,.06); text-align: left;
}
.stat-card:hover { border-color: #0ea5e9; box-shadow: 0 4px 14px rgba(14,165,233,.15); }
.stat-num { font-size: 30px; font-weight: 900; color: #0f172a; line-height: 1.15; }
.stat-label { font-size: 13.5px; font-weight: 800; color: #334155; }
.stat-hint { font-size: 12px; color: #94a3b8; }
#stat-ready .stat-num { color: #16a34a; }
#stat-pending .stat-num { color: #d97706; }
T57_ADMCSS
cat > "public/system-admin/380.js" << 'T57_ADMJS'
// JAMALI — Account Administration (380) — task 56
// Approve/reject account requests · grant modules/submodules per user ·
// hide existing page fields / set defaults. Administrators only.

import {
  requireAuth, readSystemSession,
  db, collection, getDocs, getDoc, doc, updateDoc, setDoc, query, where, serverTimestamp
} from "/firebase.js";

const $ = (id) => document.getElementById(id);
const err = $("err");
function fail(msg) { err.textContent = msg; err.hidden = false; }
function okMsg(id) { const el = $(id); el.hidden = false; setTimeout(() => { el.hidden = true; }, 2200); }

// ---------------------------------------------------------------------
// guard: administrators only (requireAuth also checks house + session)
// ---------------------------------------------------------------------
const user = await requireAuth();
const session = readSystemSession();
if (!session || session.role !== "admin") {
  location.replace("/?denied=" + encodeURIComponent("system-admin"));
} else {
  boot();
}

// ---------------------------------------------------------------------
// tabs
// ---------------------------------------------------------------------
function boot() {
  const tabs = [
    ["tab-requests", "panel-requests"],
    ["tab-users", "panel-users"],
    ["tab-pages", "panel-pages"]
  ];
  tabs.forEach(([tb, pn]) => {
    $(tb).addEventListener("click", () => {
      tabs.forEach(([t2, p2]) => {
        $(t2).classList.toggle("active", t2 === tb);
        $(p2).hidden = p2 !== pn;
      });
    });
  });
  // task 57: the counters and the user lists behind them
  $("stat-total").addEventListener("click", () => showUsers("total"));
  $("stat-ready").addEventListener("click", () => showUsers("ready"));
  $("stat-pending").addEventListener("click", () => showUsers("pending"));
  $("users-close").addEventListener("click", () => { $("users-panel").hidden = true; });
  loadStats();
  loadRequests();
  loadUsers();
  buildPageSelect();
}

// ---------------------------------------------------------------------
// TASK 57 · the counters: Total Accounts / Ready / Pending.
// Every number is counted from the stored accounts — nothing hard-coded.
// Clicking a number shows that group's users in the panel below.
// ---------------------------------------------------------------------
const STATUS_LABELS = { approved: "Ready", pending: "Pending", rejected: "Rejected" };
const USER_VIEWS = {
  total:   { title: "All registered accounts",
             hint: "Every account ever created, any status.",
             filter: () => true },
  ready:   { title: "Ready — approved accounts",
             hint: "Accounts you have approved. Grant their access in Users & Access.",
             filter: (a) => a.status === "approved" },
  pending: { title: "Pending — waiting for your approval",
             hint: "These people created an account and cannot enter until you approve them.",
             filter: (a) => a.status === "pending" }
};

async function loadStats() {
  try {
    const snap = await getDocs(collection(db, "systemAccounts"));
    const all = [];
    snap.forEach((d) => all.push(d.data()));
    $("stat-total-num").textContent = String(all.length);
    $("stat-ready-num").textContent = String(all.filter((a) => a.status === "approved").length);
    $("stat-pending-num").textContent = String(all.filter((a) => a.status === "pending").length);
  } catch (e) { /* the counters stay as dashes until the read succeeds */ }
}

async function showUsers(kind) {
  const view = USER_VIEWS[kind];
  if (!view) return;
  const body = $("users-body");
  body.innerHTML = "";
  $("users-panel").hidden = false;
  $("users-title").textContent = view.title;
  $("users-hint").textContent = view.hint;
  let n = 0;
  try {
    const snap = await getDocs(collection(db, "systemAccounts"));
    const rows = [];
    snap.forEach((d) => { const a = d.data(); if (view.filter(a)) rows.push(a); });
    rows.sort((x, y) => String(x.usernameDisplay || "").localeCompare(String(y.usernameDisplay || "")));
    for (const a of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td></td><td></td><td></td><td></td>";
      tr.cells[0].textContent = a.usernameDisplay || "";
      tr.cells[1].textContent = a.position || "";
      tr.cells[2].textContent = STATUS_LABELS[a.status] || (a.status || "");
      tr.cells[3].textContent = String(Array.isArray(a.grants) ? a.grants.length : 0);
      tr.cells[4].textContent = a.at && a.at.toDate ? a.at.toDate().toLocaleDateString() : "";
      body.appendChild(tr);
      n++;
    }
  } catch (e) { fail("Could not read the accounts: " + (e.message || e.code)); }
  $("users-empty").hidden = n > 0;
}

// ---------------------------------------------------------------------
// TAB 1 · account requests
// ---------------------------------------------------------------------
async function loadRequests() {
  const reqBody = $("req-body"), rejBody = $("rej-body");
  reqBody.innerHTML = ""; rejBody.innerHTML = "";
  let pend = 0, rej = 0;

  const snap = await getDocs(collection(db, "systemAccounts"));
  snap.forEach((d) => {
    const a = d.data();
    const row = document.createElement("tr");
    if (a.status === "pending") {
      pend++;
      const when = a.at && a.at.toDate ? a.at.toDate().toLocaleString() : "";
      row.innerHTML =
        "<td></td><td></td><td>" + when + "</td>" +
        "<td><button class=\"btn-ghost approve\" type=\"button\">Approve</button>" +
        "<button class=\"btn-ghost btn-danger reject\" type=\"button\">Reject</button></td>";
      row.cells[0].textContent = a.usernameDisplay || d.id;
      row.cells[1].textContent = a.position || "";
      row.querySelector(".approve").addEventListener("click", () => decide(d.id, "approved"));
      row.querySelector(".reject").addEventListener("click", () => decide(d.id, "rejected"));
      reqBody.appendChild(row);
    } else if (a.status === "rejected") {
      rej++;
      row.innerHTML = "<td></td><td></td>" +
        "<td><button class=\"btn-ghost approve\" type=\"button\">Approve again</button></td>";
      row.cells[0].textContent = a.usernameDisplay || d.id;
      row.cells[1].textContent = a.position || "";
      row.querySelector(".approve").addEventListener("click", () => decide(d.id, "approved"));
      rejBody.appendChild(row);
    }
  });

  $("req-empty").hidden = pend > 0;
  $("rej-empty").hidden = rej > 0;
  const badge = $("req-badge");
  badge.textContent = String(pend);
  badge.hidden = pend === 0;
}

async function decide(id, status) {
  try {
    await updateDoc(doc(db, "systemAccounts", id), { status: status, decidedAt: serverTimestamp() });
    loadRequests();
    loadUsers();
    loadStats();
  } catch (e) { fail("Could not save the decision: " + (e.message || e.code)); }
}

// ---------------------------------------------------------------------
// TAB 2 · users & access (the room keys)
// ---------------------------------------------------------------------
function uniqueFolders() {
  // { folder, label } in first-appearance order, with each entry's
  // top-level (d:1) ancestor folder — home is always open, never granted.
  const menu = window.JAMALI_MENU || [];
  const out = [];
  const seen = Object.create(null);
  let top = null;
  for (const p of menu) {
    if ((p.d || 0) === 0) continue;
    if ((p.d || 0) === 1) top = p;
    if (seen[p.folder]) continue;
    seen[p.folder] = true;
    out.push({ folder: p.folder, label: p.label, top: top ? top.folder : p.folder });
  }
  return out;
}

async function loadUsers() {
  const sel = $("user-select");
  const keep = sel.value;
  sel.innerHTML = "<option value=\"\">— Select a user —</option>";
  const snap = await getDocs(collection(db, "systemAccounts"));
  const names = [];
  snap.forEach((d) => {
    const a = d.data();
    if (a.status === "approved" && a.role !== "admin") names.push({ id: d.id, a });
  });
  names.sort((x, y) => (x.a.usernameDisplay || x.id).localeCompare(y.a.usernameDisplay || y.id));
  for (const { id, a } of names) {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = (a.usernameDisplay || id) + (a.position ? " — " + a.position : "");
    sel.appendChild(o);
  }
  sel.value = keep && sel.querySelector("option[value='" + keep + "']") ? keep : "";
  if (!sel.value) { $("grants-card").hidden = true; $("user-who").hidden = true; }
  sel.onchange = () => renderGrants(sel.value);
  if (sel.value) renderGrants(sel.value);
}

async function renderGrants(id) {
  const card = $("grants-card"), who = $("user-who");
  if (!id) { card.hidden = true; who.hidden = true; return; }
  let acc;
  try {
    acc = (await getDoc(doc(db, "systemAccounts", id))).data();
  } catch (e) { fail("Could not read the account: " + (e.message || e.code)); return; }
  who.textContent = (acc.usernameDisplay || id) + " — currently granted: " +
    ((acc.grants && acc.grants.length) ? acc.grants.length + " area(s)" : "nothing yet");
  who.hidden = false;

  const groups = [];
  const byTop = Object.create(null);
  for (const f of uniqueFolders()) {
    if (f.folder === "home") continue;
    if (f.folder === f.top) { groups.push(f); continue; }
    if (!byTop[f.top]) byTop[f.top] = [];
    byTop[f.top].push(f);
  }

  const granted = new Set(acc.grants || []);
  const tree = $("grants-tree");
  tree.innerHTML = "";
  for (const g of groups) {
    const box = document.createElement("div");
    box.className = "grant-group";
    const head = document.createElement("label");
    head.className = "big";
    head.innerHTML = "<input type=\"checkbox\" data-folder=\"" + g.folder + "\"> " + g.label;
    const headCb = head.querySelector("input");
    headCb.checked = granted.has(g.folder);
    box.appendChild(head);

    const kids = byTop[g.folder] || [];
    if (kids.length) {
      const kd = document.createElement("div");
      kd.className = "grant-kids";
      for (const k of kids) {
        const lab = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.folder = k.folder;
        cb.checked = granted.has(k.folder);
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(k.label));
        kd.appendChild(lab);
      }
      box.appendChild(kd);
    }
    tree.appendChild(box);
  }
  card.hidden = false;
}

$("grants-save").addEventListener("click", async () => {
  const sel = $("user-select");
  const id = sel.value;
  if (!id) return;
  const grants = [];
  document.querySelectorAll("#grants-tree input[type='checkbox']:checked").forEach((cb) => {
    grants.push(cb.dataset.folder);
  });
  try {
    await updateDoc(doc(db, "systemAccounts", id), { grants: grants, grantsAt: serverTimestamp() });
    okMsg("grants-ok");
    renderGrants(id);
    loadUsers();
  } catch (e) { fail("Could not save access: " + (e.message || e.code)); }
});

// ---------------------------------------------------------------------
// TAB 3 · page fields (hide existing fields / set defaults)
// ---------------------------------------------------------------------
const PAGE_FIELDS = {
  "victim-registration-322": {
    label: "Health → Registration (322)",
    fields: [
      { id: "in-name", label: "Full Name" },
      { id: "in-dob", label: "Date of Birth" },
      { id: "in-age", label: "Age (automatic)" },
      { id: "in-sex", label: "Sex", options: ["Male", "Female"] },
      { id: "in-phone", label: "Phone Number" },
      { id: "in-address", label: "Address and Location" },
      { id: "in-kin", label: "Emergency Contact / Next of Kin" },
      { id: "in-arrival", label: "Arrival Date & Time (automatic)" },
      { id: "in-incident", label: "Incident Type", options: ["Road Accident", "Physical Assault", "Burn", "Fall", "Poisoning", "Workplace Accident", "Other"] },
      { id: "in-desc", label: "Incident Description" },
      { id: "in-dept", label: "Hospital Department", options: ["Emergency Department", "Outpatient Department (OPD)", "Inpatient Department", "Surgery", "Maternity", "Intensive Care Unit (ICU)", "Other"] },
      { id: "in-priority", label: "Emergency Priority", options: ["Critical", "High", "Medium", "Low"] },
      { id: "in-staff", label: "Registering Staff Member" },
      { id: "in-referral", label: "Referral Information", options: ["No", "Yes"] },
      { id: "in-payment", label: "Insurance / Payment", options: ["Insurance", "Cash", "Other"] },
      { id: "in-facility", label: "Referring Facility" },
      { id: "in-unid", label: "Unidentified victim option" }
    ]
  }
};

function buildPageSelect() {
  const sel = $("page-select");
  sel.innerHTML = "<option value=\"\">— Select a page —</option>";
  for (const id of Object.keys(PAGE_FIELDS)) {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = PAGE_FIELDS[id].label;
    sel.appendChild(o);
  }
  sel.onchange = () => renderFields(sel.value);
}

async function renderFields(pageId) {
  const card = $("fields-card");
  if (!pageId) { card.hidden = true; return; }
  let config = { hidden: [], defaults: {} };
  try {
    const snap = await getDoc(doc(db, "systemPageConfig", pageId));
    if (snap.exists()) config = snap.data();
  } catch (e) { /* fresh page config */ }

  const hidden = new Set(config.hidden || []);
  const defaults = config.defaults || {};
  $("fields-title").textContent = "Fields — " + PAGE_FIELDS[pageId].label;
  const body = $("fields-body");
  body.innerHTML = "";

  for (const f of PAGE_FIELDS[pageId].fields) {
    const tr = document.createElement("tr");
    const tdL = document.createElement("td");
    tdL.textContent = f.label;
    const tdH = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.field = f.id;
    cb.checked = hidden.has(f.id);
    tdH.appendChild(cb);
    const tdD = document.createElement("td");
    if (f.options) {
      const sel = document.createElement("select");
      sel.dataset.field = f.id;
      sel.appendChild(new Option("(no default)", ""));
      for (const o of f.options) sel.appendChild(new Option(o, o));
      sel.value = defaults[f.id] || "";
      tdD.appendChild(sel);
    } else if (f.id === "in-unid") {
      const sel = document.createElement("select");
      sel.dataset.field = f.id;
      sel.appendChild(new Option("(no default)", ""));
      sel.appendChild(new Option("Checked", "__checked__"));
      sel.value = defaults[f.id] === true ? "__checked__" : (defaults[f.id] || "");
      tdD.appendChild(sel);
    } else {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.dataset.field = f.id;
      inp.placeholder = "(no default)";
      inp.value = typeof defaults[f.id] === "string" ? defaults[f.id] : "";
      tdD.appendChild(inp);
    }
    tr.appendChild(tdL); tr.appendChild(tdH); tr.appendChild(tdD);
    body.appendChild(tr);
  }
  card.hidden = false;
}

$("fields-save").addEventListener("click", async () => {
  const pageId = $("page-select").value;
  if (!pageId) return;
  const hidden = [], defaults = {};
  document.querySelectorAll("#fields-body input[type='checkbox']:checked").forEach((cb) => hidden.push(cb.dataset.field));
  document.querySelectorAll("#fields-body select, #fields-body input[type='text']").forEach((el) => {
    if (!el.dataset.field) return;
    if (el.value === "") return;
    defaults[el.dataset.field] = el.value === "__checked__" ? true : el.value;
  });
  try {
    await setDoc(doc(db, "systemPageConfig", pageId), {
      page: pageId, hidden: hidden, defaults: defaults, updatedAt: serverTimestamp()
    });
    okMsg("fields-ok");
  } catch (e) { fail("Could not save the page settings: " + (e.message || e.code)); }
});
T57_ADMJS
echo "  wrote public/system-admin/380.html + .css + .js"

# ---------------------------------------------------------------------------
# STEP 7 — the recovery chain (390 -> 391 -> 392), one step at a time
# ---------------------------------------------------------------------------
echo "-- STEP 7: the recovery chain (single-step gating) --"
cat > "public/account-recovery/390.html" << 'T57_R390'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Forgot Token — JAMALI</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  body { min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:linear-gradient(135deg,#0f172a,#1e293b); color:#e2e8f0; padding:20px; }
  .card { background:#111827; border:1px solid #1f2937; border-radius:18px; padding:38px 36px;
          width:100%; max-width:430px; box-shadow:0 24px 60px rgba(0,0,0,.45); }
  h1 { font-size:20px; text-align:center; margin-bottom:6px; }
  h1 span { color:#38bdf8; }
  .sub { font-size:13.5px; color:#94a3b8; text-align:center; margin-bottom:20px; }
  label { display:block; font-size:13px; color:#94a3b8; margin:12px 0 5px; }
  input { width:100%; background:#0b1220; color:#e2e8f0; border:1px solid #334155; border-radius:10px;
          padding:11px 13px; font-size:15px; outline:none; }
  input:focus { border-color:#38bdf8; }
  button.wide { width:100%; margin-top:18px; background:linear-gradient(135deg,#38bdf8,#0ea5e9); color:#06121f;
                border:0; border-radius:12px; padding:13px 16px; font-size:15px; font-weight:800; cursor:pointer; }
  button.wide:disabled { opacity:.6; cursor:wait; }
  .next { margin-top:16px; text-align:center; font-size:13px; color:#94a3b8; }
  .next a { color:#38bdf8; cursor:pointer; text-decoration:none; font-weight:700; }
  .status { margin-top:14px; font-size:13px; color:#f87171; min-height:18px; text-align:center; }
  .status.ok { color:#4ade80; }
  .token-box { margin-top:14px; display:none; text-align:center; background:#0b1220; border:1px dashed #38bdf8;
               border-radius:12px; padding:16px; }
  .token-box .tk { font-size:34px; font-weight:900; letter-spacing:12px; color:#38bdf8; margin-top:6px; }
  .token-box p { font-size:12.5px; color:#94a3b8; }
  a.back { display:block; margin-top:18px; text-align:center; font-size:13px; color:#64748b; text-decoration:none; }
  a.back:hover { color:#38bdf8; }
</style>
</head>
<body>
  <div class="card">
    <h1>Forgot <span>Token</span></h1>
    <p class="sub">Prove it is you with your password, and a new four-digit token will be issued.</p>

    <div id="ft-form">
      <label for="ft-username">Username</label>
      <input id="ft-username" type="text" autocomplete="username" placeholder="Your username">
      <label for="ft-password">Password</label>
      <input id="ft-password" type="password" autocomplete="current-password" placeholder="Your password">
      <button class="wide" id="ft-btn" type="button">Submit</button>

      <p class="status" id="status"></p>
      <p class="next">Still stuck? <a id="go-forgot-password">Forgot Password?</a></p>
    </div>

    <div class="token-box" id="token-box">
      <p>Your new four-digit token — write it down now, it is shown only once:</p>
      <div class="tk" id="token-value">••••</div>
    </div>

    <a class="back" href="/">&larr; Back to Login</a>
  </div>

  <script type="module">
    import { auth, provider, signInWithPopup, db, doc, getDoc, updateDoc } from "/firebase.js";

    const SALT = "JAMALI::v1::";
    const $ = (id) => document.getElementById(id);
    const status = $("status");
    function say(m, ok) { status.textContent = m || ""; status.className = "status" + (ok ? " ok" : ""); }
    function sha(v) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(SALT + v))
        .then((b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join(""));
    }
    // task 56b: plain-words guidance when the firestore.rules are not published
    function friendly(err) {
      const code = err && err.code ? String(err.code) : "";
      if (code.indexOf("permission-denied") !== -1 || (err && err.message && String(err.message).indexOf("insufficient permissions") !== -1)) {
        return "the database rules are not published yet. Open the Firebase console -> Firestore Database -> Rules, replace everything there with the contents of the file firestore.rules from the project folder, press Publish, then try again.";
      }
      return (err && err.message) ? err.message : code;
    }

    // the username travels forward automatically
    const carried = new URLSearchParams(location.search).get("u");
    if (carried) $("ft-username").value = carried;

    $("go-forgot-password").addEventListener("click", () => {
      const u = $("ft-username").value.trim();
      location.href = "/account-recovery/391" + (u ? "?u=" + encodeURIComponent(u) : "");
    });

    $("ft-btn").addEventListener("click", async () => {
      const btn = $("ft-btn");
      const username = $("ft-username").value.trim();
      const password = $("ft-password").value;
      if (!username) { say("Enter your username."); return; }
      if (!password) { say("Enter your password."); return; }
      btn.disabled = true; say("");

      try {
        if (!auth.currentUser) await signInWithPopup(auth, provider);

        const id = username.toLowerCase();
        const accSnap = await getDoc(doc(db, "systemAccounts", id));
        if (!accSnap.exists()) { say("No account with this username."); btn.disabled = false; return; }
        const acc = accSnap.data();
        if (acc.googleUid !== auth.currentUser.uid) {
          say("This account is bound to a different Google sign-in."); btn.disabled = false; return;
        }

        const credRef = doc(db, "systemCredentials", id);
        const credSnap = await getDoc(credRef);
        if (!credSnap.exists()) { say("Account data is incomplete. Ask the administrator."); btn.disabled = false; return; }

        const passHash = await sha(password);
        if (credSnap.data().passHash !== passHash) { say("Wrong password."); btn.disabled = false; return; }

        const newToken = String(Math.floor(1000 + Math.random() * 9000));
        const newHash = await sha(newToken);
        await updateDoc(credRef, { tokenHash: newHash });

        $("token-value").textContent = newToken;
        // task 57: one step at a time — the form disappears, only the new
        // token (and Back to Login) remain on screen.
        $("ft-form").style.display = "none";
        $("token-box").style.display = "block";
        say("");
        btn.disabled = false;
      } catch (err) {
        say("Could not reset the token: " + friendly(err));
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>
T57_R390
cat > "public/account-recovery/391.html" << 'T57_R391'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Forgot Password — JAMALI</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  body { min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:linear-gradient(135deg,#0f172a,#1e293b); color:#e2e8f0; padding:20px; }
  .card { background:#111827; border:1px solid #1f2937; border-radius:18px; padding:38px 36px;
          width:100%; max-width:430px; box-shadow:0 24px 60px rgba(0,0,0,.45); }
  h1 { font-size:20px; text-align:center; margin-bottom:6px; }
  h1 span { color:#38bdf8; }
  .sub { font-size:13.5px; color:#94a3b8; text-align:center; margin-bottom:20px; }
  label { display:block; font-size:13px; color:#94a3b8; margin:12px 0 5px; }
  input { width:100%; background:#0b1220; color:#e2e8f0; border:1px solid #334155; border-radius:10px;
          padding:11px 13px; font-size:15px; outline:none; }
  input:focus { border-color:#38bdf8; }
  button.wide { width:100%; margin-top:18px; background:linear-gradient(135deg,#38bdf8,#0ea5e9); color:#06121f;
                border:0; border-radius:12px; padding:13px 16px; font-size:15px; font-weight:800; cursor:pointer; }
  button.wide:disabled { opacity:.6; cursor:wait; }
  .next { margin-top:16px; text-align:center; font-size:13px; color:#94a3b8; }
  .next a { color:#38bdf8; cursor:pointer; text-decoration:none; font-weight:700; }
  .status { margin-top:14px; font-size:13px; color:#f87171; min-height:18px; text-align:center; }
  .status.ok { color:#4ade80; }
  a.back { display:block; margin-top:18px; text-align:center; font-size:13px; color:#64748b; text-decoration:none; }
  a.back:hover { color:#38bdf8; }
  .hidden { display:none; }
</style>
</head>
<body>
  <div class="card">
    <h1>Forgot <span>Password</span></h1>
    <p class="sub">Prove it is you with your phone number, then set a new password.</p>

    <section id="step-verify">
      <label for="fp-username">Username</label>
      <input id="fp-username" type="text" autocomplete="username" placeholder="Your username">
      <label for="fp-phone">Phone number</label>
      <input id="fp-phone" type="tel" placeholder="The phone number on the account">
      <button class="wide" id="fp-btn" type="button">Submit</button>
    </section>

    <section id="step-new" class="hidden">
      <label for="fp-new1">New password</label>
      <input id="fp-new1" type="password" autocomplete="new-password" placeholder="At least 6 characters">
      <label for="fp-new2">Repeat the new password</label>
      <input id="fp-new2" type="password" autocomplete="new-password" placeholder="Same again">
      <button class="wide" id="fp-save" type="button">Save New Password</button>
    </section>

    <p class="status" id="status"></p>
    <p class="next" id="fp-next">Cannot remember the phone number? <a id="go-forgot-phone">Forgot Phone Number?</a></p>
    <a class="back" href="/">&larr; Back to Login</a>
  </div>

  <script type="module">
    import { auth, provider, signInWithPopup, db, doc, getDoc, updateDoc } from "/firebase.js";

    const SALT = "JAMALI::v1::";
    const $ = (id) => document.getElementById(id);
    const status = $("status");
    function say(m, ok) { status.textContent = m || ""; status.className = "status" + (ok ? " ok" : ""); }
    function sha(v) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(SALT + v))
        .then((b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join(""));
    }
    // task 56b: plain-words guidance when the firestore.rules are not published
    function friendly(err) {
      const code = err && err.code ? String(err.code) : "";
      if (code.indexOf("permission-denied") !== -1 || (err && err.message && String(err.message).indexOf("insufficient permissions") !== -1)) {
        return "the database rules are not published yet. Open the Firebase console -> Firestore Database -> Rules, replace everything there with the contents of the file firestore.rules from the project folder, press Publish, then try again.";
      }
      return (err && err.message) ? err.message : code;
    }

    const carried = new URLSearchParams(location.search).get("u");
    if (carried) $("fp-username").value = carried;

    $("go-forgot-phone").addEventListener("click", () => {
      const u = $("fp-username").value.trim();
      location.href = "/account-recovery/392" + (u ? "?u=" + encodeURIComponent(u) : "");
    });

    let verifiedId = null;

    $("fp-btn").addEventListener("click", async () => {
      const btn = $("fp-btn");
      const username = $("fp-username").value.trim();
      const phone = $("fp-phone").value.trim();
      if (!username) { say("Enter your username."); return; }
      if (!phone) { say("Enter your phone number."); return; }
      btn.disabled = true; say("");

      try {
        if (!auth.currentUser) await signInWithPopup(auth, provider);

        const id = username.toLowerCase();
        const accSnap = await getDoc(doc(db, "systemAccounts", id));
        if (!accSnap.exists()) { say("No account with this username."); btn.disabled = false; return; }
        const acc = accSnap.data();
        if (acc.googleUid !== auth.currentUser.uid) {
          say("This account is bound to a different Google sign-in."); btn.disabled = false; return;
        }

        const credSnap = await getDoc(doc(db, "systemCredentials", id));
        if (!credSnap.exists()) { say("Account data is incomplete. Ask the administrator."); btn.disabled = false; return; }
        if (credSnap.data().phone !== phone) { say("That phone number does not match the account."); btn.disabled = false; return; }

        verifiedId = id;
        $("step-verify").classList.add("hidden");
        $("step-new").classList.remove("hidden");
        say("Phone verified. Now choose a new password.", true);
        btn.disabled = false;
      } catch (err) {
        say("Could not verify: " + friendly(err));
        btn.disabled = false;
      }
    });

    $("fp-save").addEventListener("click", async () => {
      const btn = $("fp-save");
      const p1 = $("fp-new1").value, p2 = $("fp-new2").value;
      if (!verifiedId) { say("Verify your phone number first."); return; }
      if (p1.length < 6) { say("Password must be at least 6 characters."); return; }
      if (p1 !== p2) { say("The two passwords do not match."); return; }
      btn.disabled = true; say("");

      try {
        const passHash = await sha(p1);
        await updateDoc(doc(db, "systemCredentials", verifiedId), { passHash: passHash });
        // task 57: one step at a time — only the saved message and Back to
        // Login remain on screen.
        $("fp-next").style.display = "none";
        say("Password saved. Go back and login with your username and token.", true);
        $("step-new").classList.add("hidden");
        btn.disabled = false;
      } catch (err) {
        say("Could not save the password: " + friendly(err));
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>
T57_R391
cat > "public/account-recovery/392.html" << 'T57_R392'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Forgot Phone Number — JAMALI</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  body { min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:linear-gradient(135deg,#0f172a,#1e293b); color:#e2e8f0; padding:20px; }
  .card { background:#111827; border:1px solid #1f2937; border-radius:18px; padding:38px 36px;
          width:100%; max-width:430px; box-shadow:0 24px 60px rgba(0,0,0,.45); text-align:center; }
  h1 { font-size:20px; margin-bottom:6px; }
  h1 span { color:#38bdf8; }
  .sub { font-size:13.5px; color:#94a3b8; margin-bottom:20px; }
  label { display:block; font-size:13px; color:#94a3b8; margin:12px 0 5px; text-align:left; }
  input { width:100%; background:#0b1220; color:#e2e8f0; border:1px solid #334155; border-radius:10px;
          padding:11px 13px; font-size:15px; outline:none; text-align:left; }
  input:focus { border-color:#38bdf8; }
  button.wide { width:100%; margin-top:18px; background:linear-gradient(135deg,#38bdf8,#0ea5e9); color:#06121f;
                border:0; border-radius:12px; padding:13px 16px; font-size:15px; font-weight:800; cursor:pointer; }
  .message { margin-top:18px; background:#0b1220; border:1px solid #334155; border-radius:12px;
             padding:18px 16px; font-size:14.5px; color:#e2e8f0; display:none; }
  .message b { color:#38bdf8; }
  a.back { display:block; margin-top:18px; font-size:13px; color:#64748b; text-decoration:none; }
  a.back:hover { color:#38bdf8; }
</style>
</head>
<body>
  <div class="card">
    <h1>Forgot <span>Phone Number</span></h1>
    <p class="sub">The last step of the recovery chain.</p>

    <div id="fph-form">
      <label for="fph-username">Username</label>
      <input id="fph-username" type="text" autocomplete="username" placeholder="Your username">
      <button class="wide" id="fph-btn" type="button">Submit</button>
    </div>

    <div class="message" id="message">
      Please go to the system administrator's office.
    </div>

    <a class="back" href="/">&larr; Back to Login</a>
  </div>

  <script>
    const carried = new URLSearchParams(location.search).get("u");
    if (carried) document.getElementById("fph-username").value = carried;
    document.getElementById("fph-btn").addEventListener("click", function () {
      // task 57: one step at a time — the form disappears, only the
      // administrator-office message remains.
      document.getElementById("fph-form").style.display = "none";
      document.getElementById("message").style.display = "block";
    });
  </script>
</body>
</html>
T57_R392
echo "  wrote public/account-recovery/390.html + 391.html + 392.html"

# ---------------------------------------------------------------------------
# STEP 8 — security rules (unchanged 56b state, re-shipped for safety)
# ---------------------------------------------------------------------------
echo "-- STEP 8: firestore.rules (unchanged 56b state) --"
cat > "firestore.rules" << 'T57_RULES'
rules_version = '2';

// =====================================================================
// JAMALI — firestore.rules — the guard dog (Task 56: system accounts added)
// Every collection the project uses gives a signed in user create, read,
// update and delete — the standing order of 25 October 2026, reprinted
// here in full with the Patient Discharge, Laboratory and Radiology
// collections added. Anything not matched below is denied by default.
//
// The project's live collections, named by scanning every page's code:
//   transactions                — the one journal the whole business reads
//   healthRegistrations         — Registration (322)
//   healthTriage                — Triage (323)
//   healthNurseConsultations    — Nurse Consultation (324)
//   healthDoctorConsultations   — Doctor Consultation (325)
//   healthPrescriptions         — Pharmacy (326)
//   healthTreatmentOrders       — Treatment / Procedures (327)
//   healthDestinations          — the facility's destination list (325)
//   healthWards                 — Ward Registration (331)
//   healthBeds                  — Bed Management (332)
//   healthBedAssignments        — Bed Assignment (334) / Transfers (335)
//   healthBedTransfers          — Ward & Bed Transfers (335)
//   healthBedMaintenance        — Cleaning & Maintenance (336)
//   healthAdmissions            — Patient Admission (341-343)
//   healthDischarges            — Patient Discharge (350-353)
//   healthLabRequests           — Laboratory Management (360-363)
//   healthImagingRequests       — Radiology / Imaging (370-373)
// =====================================================================

service cloud.firestore {
  match /databases/{database}/documents {

    // ---- helpers (Task 56) ----
    function isSignedIn() {
      return request.auth != null;
    }
    function isSystemAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/systemAdmins/$(request.auth.uid));
    }

    // ---- Business: one journal, every book derives from it ----
    match /transactions/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    // ---- Health: one patient, one ID, one journey ----
    match /healthRegistrations/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthTriage/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthNurseConsultations/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthDoctorConsultations/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthPrescriptions/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthTreatmentOrders/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthDestinations/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    // ---- Health: wards, beds and placement (Task 52) ----
    match /healthWards/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthBeds/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthBedAssignments/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthBedTransfers/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    match /healthBedMaintenance/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    // ---- Health: admissions (Task 52) ----
    match /healthAdmissions/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }
    // ---- Health: discharge (Task 54) ----
    match /healthDischarges/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    // ---- Health: laboratory (Task 54) ----
    match /healthLabRequests/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }

    // ---- Health: radiology / imaging (Task 54) ----
    match /healthImagingRequests/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }


    // ---- Health: queue announcement settings (Task 53) ----
    // One document per service stage (triage, nurse, doctor, pharmacy,
    // treatment): the department, staff name, office and room the speaker
    // announcement reads aloud.
    match /healthQueueConfig/{docId} {
      allow create, read, update, delete: if request.auth != null;
    }


    // ===================================================================
    // SYSTEM — accounts, credentials, administration (Task 56)
    // Two-key model: the Google sign-in is the key to the house (real
    // authentication); the system account is storage used for role
    // definition — who can open which room (module/submodule) and do what.
    // ===================================================================

    // ---- account profiles: usernames, positions, approval, grants ----
    // No secrets live here. Any signed in user may resolve a username;
    // only the administrator may approve, reject or edit grants.
    //
    // Task 56b fix: the administrator bootstrap claim writes the profile
    // as approved/admin in the same batch that creates systemAdmins — the
    // old rule (pending/user only) rejected that write, so the very first
    // administrator login died with "Missing or insufficient permissions".
    // The claim escape below fires ONLY for the exact seeded profile,
    // proven by the rules-level hash literals, and only while the setup
    // marker does not exist yet. .get(field, "") keeps every branch
    // error-free for payloads that lack the extra fields.
    match /systemAccounts/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && (
        (request.resource.data.get("googleUid", "") == request.auth.uid
          && request.resource.data.get("status", "") == "pending"
          && request.resource.data.get("role", "") == "user")
        || (request.resource.data.get("googleUid", "") == request.auth.uid
          && request.resource.data.get("usernameLower", "") == "jamal kazembe"
          && request.resource.data.get("status", "") == "approved"
          && request.resource.data.get("role", "") == "admin"
          && request.resource.data.get("passHash", "") == "5c784bdcad7f92a39757e3ac0ae25315f422c4d97ef11cb438d059e9a830e9af"
          && request.resource.data.get("tokenHash", "") == "3f965d6df52296c4c2bf89878067be2c79cf6895189978f379746874728caae1"
          && !exists(/databases/$(database)/documents/systemSetup/claim))
      );
      allow update: if isSystemAdmin();
      allow delete: if isSystemAdmin();
    }

    // ---- credentials: password/token hashes + phone (never profile data) --
    // A credential document may only be read by the Google identity the
    // account is bound to — a stolen username+token alone opens nothing.
    match /systemCredentials/{docId} {
      allow read: if request.auth != null
        && resource.data.googleUid == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.googleUid == request.auth.uid;
      allow update: if request.auth != null
        && resource.data.googleUid == request.auth.uid;
      allow delete: if isSystemAdmin();
    }

    // ---- administrators: one document per administrator google uid ----
    // The FIRST login with the administrator's username may claim the role:
    // the rules compare the salted hashes against these exact literals, so
    // nobody can claim without knowing the administrator's real token.
    match /systemAdmins/{uid} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && !exists(/databases/$(database)/documents/systemSetup/claim)
        && request.resource.data.passHash == "5c784bdcad7f92a39757e3ac0ae25315f422c4d97ef11cb438d059e9a830e9af"
        && request.resource.data.tokenHash == "3f965d6df52296c4c2bf89878067be2c79cf6895189978f379746874728caae1";
      allow delete: if isSystemAdmin() && uid != request.auth.uid;
      allow update: if false;
    }

    // ---- setup marker: written once, by the claim, immutable after ----
    match /systemSetup/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && !exists(/databases/$(database)/documents/systemSetup/claim)
        && request.resource.data.passHash == "5c784bdcad7f92a39757e3ac0ae25315f422c4d97ef11cb438d059e9a830e9af"
        && request.resource.data.tokenHash == "3f965d6df52296c4c2bf89878067be2c79cf6895189978f379746874728caae1";
      allow update, delete: if false;
    }

    // ---- page field configuration: hide existing fields / set defaults --
    // Read by every page that applies it; written by the administrator only.
    match /systemPageConfig/{docId} {
      allow read: if request.auth != null;
      allow create, update, delete: if isSystemAdmin();
    }

    // Everything not named above: denied. No block, no exceptions.
  }
}
T57_RULES
echo "  wrote firestore.rules (no change — nothing new to publish)"
echo ""
echo "-- STEP 9: verification --"

fail=0
chk() { if [ "$1" -eq 0 ]; then echo "  PASS: $2"; else echo "  VERIFY FAIL: $2"; fail=$((fail+1)); fi }

# -- 1 - all shipped files exist and are non-empty ----------------------------
ok=1
for f in SERVER/linker.js SERVER/server.js public/SERVER/linker.js public/SERVER/server.js \
         public/firebase.js public/index.html public/sidebar.js public/system-page-config.js \
         public/system-admin/380.html public/system-admin/380.css public/system-admin/380.js \
         public/account-recovery/390.html public/account-recovery/391.html public/account-recovery/392.html \
         firestore.rules; do
  [ -s "$f" ] || { echo "  VERIFY FAIL: $f missing or empty"; ok=0; }
done
[ "$ok" -eq 1 ]; chk $? "all 15 shipped files exist and are non-empty"

# -- 2 - mirrors byte-identical ------------------------------------------------
cmp -s SERVER/linker.js public/SERVER/linker.js; chk $? "public/SERVER/linker.js is a byte-identical mirror"
cmp -s SERVER/server.js public/SERVER/server.js; chk $? "public/SERVER/server.js is a byte-identical mirror"

# -- 3 - the shim stays a pure shim --------------------------------------------
if grep -qE 'gstatic\.com/firebasejs|initializeApp|firebaseConfig|apiKey' public/firebase.js; then
  echo "  VERIFY FAIL: firebase.js still contains connection code"
  fail=$((fail+1))
else
  echo "  PASS: public/firebase.js contains no Firebase SDK, config or credentials"
fi

# -- 4 - TASK 57: the Admin button ----------------------------------------------
grep -q 'jamali-admin-btn' public/sidebar.js; chk $? "sidebar.js builds the Admin button"
grep -q 'session.role === "admin"' public/sidebar.js
chk $? "the Admin button appears for the administrator only"
grep -q '"/system-admin/380"' public/sidebar.js
chk $? "the Admin button opens the Account Administration dashboard"
grep -q 'position:fixed;top:14px;right:14px' public/sidebar.js
chk $? "the Admin button sits at the top-right corner"

# -- 5 - TASK 57: the dashboard counters -----------------------------------------
grep -q 'stat-total-num' public/system-admin/380.html && grep -q 'stat-ready-num' public/system-admin/380.html && grep -q 'stat-pending-num' public/system-admin/380.html
chk $? "380 shows Total Accounts / Ready / Pending counters"
grep -q 'id="users-panel"' public/system-admin/380.html && grep -q 'id="users-body"' public/system-admin/380.html
chk $? "380 has the users panel behind the numbers"
grep -q 'loadStats' public/system-admin/380.js && grep -q 'showUsers' public/system-admin/380.js
chk $? "380.js counts from stored records and renders the matching users"
grep -q 'loadStats();' public/system-admin/380.js >/dev/null 2>&1
grep -q 'approved' public/system-admin/380.js && grep -q 'pending' public/system-admin/380.js
chk $? "the counters split the accounts by their stored status"
grep -q 'stats-row' public/system-admin/380.css; chk $? "380.css lays out the counters"

# -- 5b - THE 57B FIX: getDoc is imported (it was missing since task 56) ------
tr '\n' ' ' < public/system-admin/380.js \
  | grep -o 'import[[:space:]]*{[^}]*}[[:space:]]*from[[:space:]]*"/firebase\.js"' \
  | grep -q 'getDoc'
chk $? "57b fix: 380.js imports getDoc (picking a user used to fail silently)"

# -- 5c - used-but-not-imported sweep (the bug class behind the report) ---------
miss=0
for f in public/system-admin/380.js public/index.html \
         public/account-recovery/390.html public/account-recovery/391.html; do
  imps="$(tr '\n' ' ' < "$f" \
    | grep -o 'import[[:space:]]*{[^}]*}[[:space:]]*from[[:space:]]*"/firebase\.js"' \
    | sed 's/.*{//; s/}.*//' | tr ',' '\n' | tr -d ' ' | grep -v '^$')"
  for nm in getDoc getDocs doc collection updateDoc setDoc query where serverTimestamp writeBatch onAuthStateChanged signInWithPopup limit; do
    if grep -qE "\b$nm[[:space:]]*\(" "$f"; then
      printf '%s\n' "$imps" | grep -qx "$nm" || { echo "  VERIFY FAIL: $f calls $nm( without importing it"; miss=$((miss+1)); fail=$((fail+1)); }
    fi
  done
done
[ "$miss" -eq 0 ] && echo "  PASS: every Firestore call in the shipped pages is imported (no hidden ReferenceError)"

# -- 6 - the user menu: name + Logout + Switch Account -> login page --------------
grep -q 'jamali-person' public/sidebar.js; chk $? "sidebar.js places the person icon next to JAMAL"
grep -q 'Switch Account' public/sidebar.js && grep -q 'jamali-logout' public/sidebar.js
chk $? "the user menu offers Logout and Switch Account"
grep -q 'class=\\"who\\"' public/sidebar.js || grep -q 'class="who"' public/sidebar.js
chk $? "the user menu shows the user's name"
[ "$(grep -c 'location.href = "/";' public/sidebar.js)" -ge 2 ]
chk $? "Logout and Switch Account both land on the login page"

# -- 7 - TASK 57: recovery shows one step at a time --------------------------------
grep -q 'id="ft-form"' public/account-recovery/390.html && grep -q 'ft-form").style.display = "none"' public/account-recovery/390.html
chk $? "390 hides the form when the new token is shown"
grep -q 'id="fp-next"' public/account-recovery/391.html && grep -q 'fp-next").style.display = "none"' public/account-recovery/391.html
chk $? "391 hides the chain link once the password is saved"
grep -q 'id="fph-form"' public/account-recovery/392.html && grep -q 'fph-form").style.display = "none"' public/account-recovery/392.html
chk $? "392 shows only the administrator-office message after submit"
grep -q 'Please go to the system administrator' public/account-recovery/392.html
chk $? "392 keeps the administrator-office message"

# -- 8 - the two-key guard (task 56b state, unchanged) ------------------------------
grep -q 'JAMALI_SYSTEM_SESSION' SERVER/linker.js; chk $? "linker.js enforces the system session"
grep -q 'folderAllowed' SERVER/linker.js; chk $? "linker.js holds the folder guard (direct-link blocking)"
grep -q 'ALWAYS_OPEN = \["home", "account-recovery"\]' SERVER/linker.js
chk $? "linker.js keeps home and the recovery chain open to every account"
grep -q 'id="login-btn"' public/index.html && grep -q 'id="create-btn"' public/index.html
chk $? "index.html shows Login and Create Account"
grep -q 'jamal kazembe' public/index.html && grep -q '3f965d6df52296c4c2bf89878067be2c79cf6895189978f379746874728caae1' public/index.html
chk $? "index.html seeds the administrator claim (username + token hash)"
grep -q 'passHash: ADMIN_PASS_HASH' public/index.html
chk $? "the 56b claim payload is intact"

# -- 9 - page configuration + menu entry --------------------------------------------
grep -q 'systemPageConfig' public/system-page-config.js; chk $? "system-page-config.js reads the page configuration"
grep -q '/system-page-config.js' public/victim-registration/322.html
chk $? "322.html loads the configuration layer"
grep -q 'folder: "system-admin"' public/menu.js; chk $? "menu.js carries the Account Administration entry"

# -- 10 - security rules (unchanged 56b state) ---------------------------------------
nblocks="$(grep -c 'match /' firestore.rules)"
[ "$nblocks" -eq 24 ]; chk $? "firestore.rules has exactly 24 match blocks (got $nblocks)"
grep -q '== "jamal kazembe"' firestore.rules
chk $? "rules keep the administrator bootstrap claim (56b)"
grep -q 'resource.data.googleUid == request.auth.uid' firestore.rules
chk $? "credentials are bound to their own Google identity"

# -- 11 - the export sweep -------------------------------------------------------------
exports="$( { sed -n 's/^export const \([A-Za-z_][A-Za-z0-9_]*\).*/\1/p' public/firebase.js
              sed -n 's/^export function \([A-Za-z_][A-Za-z0-9_]*\).*/\1/p' public/firebase.js
              sed -n '/^export {/,/};/p' public/firebase.js \
                | sed 's/export {//; s/};//' | tr ',' '\n' | tr -d ' ' | grep -v '^$'; } | sort -u)"
need="activeServer serverInfo JamalLinker auth provider db getFirestore onAuthStateChanged signInWithPopup signOut collection doc addDoc updateDoc deleteDoc getDocs getDoc setDoc writeBatch query where orderBy limit onSnapshot serverTimestamp Timestamp arrayUnion arrayRemove increment deleteField requireAuth SYSTEM_SESSION_KEY readSystemSession clearSystemSession"
nmissing=0
for nm in $need; do
  printf '%s\n' "$exports" | grep -qx "$nm" || { echo "  VERIFY FAIL: shim does not export '$nm'"; nmissing=$((nmissing+1)); fail=$((fail+1)); }
done
[ "$nmissing" -eq 0 ] && echo "  PASS: the shim exports all 34 names"

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
  echo "  PASS: the import sweep checked $nfiles page(s) against the shim export list ($nnotes pre-existing notes)"
fi

echo ""
if [ "$fail" -eq 0 ]; then
  echo "=================================================================="
  echo " TASK 57B VERIFY: ALL PASS"
  echo "=================================================================="
  echo ""
  echo " DEPLOY: pushing to GitHub for you (Vercel deploys automatically)..."
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if [ -n "$(git status --porcelain)" ]; then
      git add -A
      if git commit -m "Task 57b: admin dashboard hotfix - import getDoc in 380.js + ship task 57 admin button, counters, recovery steps" >/dev/null 2>&1; then
        echo "  committed."
      else
        echo "  NOTE: git commit did not run (identity not configured?) - commit manually."
      fi
      if git push; then
        echo "  PUSHED - Vercel is deploying (give it about a minute)."
      else
        echo "  NOTE: git push did not go through - run: git push"
      fi
    else
      echo "  nothing new to commit - the task was already applied."
    fi
  else
    echo "  NOTE: this folder is not a git repository - run from ~/jamal to auto-push."
  fi
  echo ""
  echo " DONE — what was fixed:"
  echo "   1. THE BUG: picking a user in Users & Access (and the Pages tab)"
  echo "      showed nothing because 380.js forgot to import getDoc — fixed."
  echo "   2. The task 57 features are all in place: the Admin button top-right,"
  echo "      the Total/Ready/Pending counters (click a number to see those"
  echo "      users), the person-icon menu, the one-step recovery pages."
  echo ""
  echo " NOW:"
  echo "   1. Wait about a minute for Vercel, then hard-refresh (Ctrl+Shift+R)."
  echo "   2. Login as the administrator (jamal kazembe) — the Admin button"
  echo "      appears top-right on every page."
  echo "   3. Open it: click Total, Ready or Pending — the users list appears."
  echo "   4. Users & Access: pick a user — the access tree opens (the fix)."
  echo ""
  echo " NOTES:"
  echo "   - no firestore.rules change in this task; the rules published for"
  echo "     task 56b stay exactly as they are."
  echo "   - counters update when you approve or reject someone (re-open the"
  echo "     page or click the number again)."
  echo "   - after editing SERVER/ files: cp SERVER/*.js public/SERVER/"
else
  echo "=================================================================="
  echo " TASK 57B VERIFY: FAIL ($fail check(s) failed) — NOT pushed."
  echo "=================================================================="
  exit 1
fi

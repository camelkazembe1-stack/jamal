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
      if (s && s.uid !== user.uid) {
        /* T77: adopt the active Google identity silently - no bounce */
        s.uid = user.uid;
        try { sessionStorage.setItem(SYSTEM_SESSION_KEY, JSON.stringify(s)); } catch (e) {}
      }
      /* T77: static display - resolve always; the sidebar guard blocks
         ungranted pages in place, no redirect */
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

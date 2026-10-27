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

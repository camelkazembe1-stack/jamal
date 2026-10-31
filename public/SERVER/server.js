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
      analytics: false,
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

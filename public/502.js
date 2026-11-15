// JAMALI - SERVER/server.js, the configuration source.
// One file holds the Firebase project selection, the Authentication and
// Firestore wiring and the hosting settings for the whole system, so pages
// never carry keys or connection setups of their own. Self-contained:
// everything comes from the Google CDN, so this file needs no other
// repository file to work. The vercel.json build line copies it verbatim
// into public/502.js - the one module every page imports - and
// SERVER/linker.js is the connection point the modules talk through.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
  deleteField,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// The database project the whole system runs on. apply-rules.sh reads this
// line to point the Firebase CLI at the same project the code uses.
const DATABASE_PROJECT = "jamal-542b5";

const firebaseConfig = {
  apiKey: "AIzaSyCtE7p5LM8L2yaJB0JJCyyTz763CBQhKGE",
  authDomain: "jamal-542b5.firebaseapp.com",
  projectId: DATABASE_PROJECT,
  storageBucket: "jamal-542b5.firebasestorage.app",
  messagingSenderId: "401281850731",
  appId: "1:401281850731:web:afa3ff6dca4d9e095c402e",
  measurementId: "G-DHB2DJ769H"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export const db = getFirestore(app);

export { onAuthStateChanged, signInWithPopup, signOut };
export {
  getFirestore, collection, doc, addDoc, writeBatch,
  query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp, updateDoc, deleteDoc, getDocs, setDoc
};
export {
  getDoc, limit, arrayUnion, arrayRemove, increment, deleteField, runTransaction
};

// Guard for inner pages: resolve with the user, or bounce to index.html
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user);
      else location.replace("/");
    });
  });
}

// ---- project selection and hosting settings: the single source of truth ----
// vercel.json, firebase.json and .firebaserc stay in step with what is
// written here: the Vercel build line copies this file into public/502.js,
// and apply-rules.sh publishes firestore.rules to the project above.
export const SERVER_CONFIG = {
  active: DATABASE_PROJECT,
  hosting: {
    platform: "Vercel",
    outputDirectory: "public",
    runtimeModule: "/502.js",
    buildLine: "cp -f SERVER/server.js public/502.js",
    settingsFiles: ["vercel.json", "firebase.json", ".firebaserc"]
  },
  rules: {
    file: "firestore.rules",
    publisher: "apply-rules.sh"
  }
};

// The server handle SERVER/linker.js talks through: the same wiring, one
// object - info for the project, authApi for the Google gate, firestore for
// the database calls.
export const server = {
  info: {
    name: "JAMALI",
    project: SERVER_CONFIG.active,
    authDomain: firebaseConfig.authDomain,
    runtime: SERVER_CONFIG.hosting.runtimeModule
  },
  auth,
  provider,
  authApi: { onAuthStateChanged, signInWithPopup, signOut },
  db,
  firestore: {
    getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
    getDocs, getDoc, setDoc, writeBatch, query, where, orderBy,
    limit, onSnapshot, serverTimestamp, Timestamp,
    arrayUnion, arrayRemove, increment, deleteField
  }
};

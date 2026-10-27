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

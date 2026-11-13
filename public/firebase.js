// JAMALI — shared Firebase module (auth + firestore)
// index.html uses it for Google login, inner pages use requireAuth()
// Self-contained: everything comes from the Google CDN, so this file needs
// no other file in the repository to work.

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
  collection as _collection,
  doc as _doc,
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

const firebaseConfig = {
  apiKey: "AIzaSyCtE7p5LM8L2yaJB0JJCyyTz763CBQhKGE",
  authDomain: "jamal-542b5.firebaseapp.com",
  projectId: "jamal-542b5",
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

// ---------- MODE CONTAINER: one email, two separated data containers ----------
// After login the user picks the mode: "organisation use" or "personal use".
// The mode travels in sessionStorage under JAMALI_SYSTEM_MODE.
//   organisation (default) - every collection stays exactly where it is today,
//                            shared with the organisation, like now.
//   personal               - all app data (every collection whose name does
//                            NOT start with "system") is transparently moved
//                            into data/<email>__personal/<collection>/ so the
//                            same email holds a second, fully private container,
//                            and the two containers never mix. The system
//                            collections (accounts, credentials, admins...) stay
//                            shared so login keeps working in both modes.

function jamaliReadMode() {
  try {
    return sessionStorage.getItem("JAMALI_SYSTEM_MODE") === "personal" ? "personal" : "organisation";
  } catch (e) {
    return "organisation";
  }
}

function jamaliContainerKey() {
  const u = auth.currentUser;
  const email = String((u && u.email) || "").trim().toLowerCase();
  if (!email) {
    console.warn("JAMALI personal container: the Google sign-in is not finished yet - using a locked placeholder container.");
    return "unknown__personal";
  }
  return email + "__personal";
}

function jamaliScopeWanted(rest) {
  return rest.length > 0 && typeof rest[0] === "string" &&
    String(rest[0]).indexOf("system") !== 0;
}

export const collection = function (parent) {
  const rest = Array.prototype.slice.call(arguments, 1);
  if (parent === db && jamaliScopeWanted(rest) && jamaliReadMode() === "personal") {
    return _collection.apply(null, [parent, "data", jamaliContainerKey()].concat(rest));
  }
  return _collection.apply(null, arguments);
};

export const doc = function (parent) {
  const rest = Array.prototype.slice.call(arguments, 1);
  if (parent === db && rest.length >= 2 && jamaliScopeWanted(rest) && jamaliReadMode() === "personal") {
    return _doc.apply(null, [parent, "data", jamaliContainerKey()].concat(rest));
  }
  return _doc.apply(null, arguments);
};

// -----------------------------------------------------------------------------

export { onAuthStateChanged, signInWithPopup, signOut };
export {
  getFirestore, addDoc, writeBatch,
  query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp, updateDoc, deleteDoc, getDocs, setDoc
};
export {
  getDoc, limit, arrayUnion, arrayRemove, increment, deleteField
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

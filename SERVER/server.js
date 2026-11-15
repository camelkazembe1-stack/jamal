// JAMALI - SERVER/server.js, the configuration source.
// One file holds the Firebase project selection, the Authentication and
// Firestore wiring and the whole content of every settings file the deploys
// need, so pages never carry keys or connection setups of their own.
// Self-contained: everything comes from the Google CDN, so this file needs
// no other repository file to work. Running
//     node SERVER/sync.js
// reads the marked settings block below and writes vercel.json, firebase.json,
// .firebaserc, firestore.rules, apply-rules.sh and public/502.js - this file
// verbatim, the one module every page imports - and SERVER/linker.js is the
// connection point the modules talk through.

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

// ==== JAMALI SETTINGS SOURCE - the single source of truth for every settings file ====
// Everything the deploys need is declared between this line and the END
// marker. SERVER/sync.js reads this block and writes every settings file
// out of it: vercel.json, firebase.json, .firebaserc, firestore.rules,
// apply-rules.sh and public/502.js - a verbatim copy of this file. Edit
// here, run node SERVER/sync.js and commit what it writes: the written
// files are outputs, and the Vercel build line runs the same sync, so the
// next deploy always matches the server.

// The database project the whole system runs on: the web keys below, the
// Firebase CLI (.firebaserc) and the rules publisher all take it from here.
const DATABASE_PROJECT = "jamal-542b5";

// The web keys of that project - Firebase web keys are public by design.
const firebaseConfig = {
  apiKey: "AIzaSyCtE7p5LM8L2yaJB0JJCyyTz763CBQhKGE",
  authDomain: "jamal-542b5.firebaseapp.com",
  projectId: DATABASE_PROJECT,
  storageBucket: "jamal-542b5.firebasestorage.app",
  messagingSenderId: "401281850731",
  appId: "1:401281850731:web:afa3ff6dca4d9e095c402e",
  measurementId: "G-DHB2DJ769H"
};

// vercel.json - the routing table: clean URLs, the public web root, the
// redirect pairs (every slug rename becomes the bare address and its
// trailing-slash twin) and the build line that runs the sync itself.
const VERCEL_REDIRECTS = [
  ["/home", "/"],
  ["/stock-management/397", "/stock-register/397"],
  ["/stock-management/398", "/stock-progress/398"],
  ["/stock-management/399", "/stock-change/399"],
  ["/ward-management/331", "/ward-registration/331"],
  ["/ward-management/332", "/bed-management/332"],
  ["/ward-management/333", "/ward-occupancy/333"],
  ["/ward-management/334", "/bed-assignment/334"],
  ["/ward-management/335", "/ward-bed-transfers/335"],
  ["/ward-management/336", "/cleaning-maintenance/336"],
  ["/ward-management/337", "/ward-register/337"],
  ["/ward-management/338", "/bed-transfer-history/338"],
  ["/patient-admission/341", "/new-admission/341"],
  ["/patient-admission/342", "/admission-list/342"],
  ["/patient-admission/343", "/admission-details/343"],
  ["/patient-discharge/351", "/start-discharge/351"],
  ["/patient-discharge/352", "/discharge-list/352"],
  ["/patient-discharge/353", "/discharge-details/353"],
  ["/laboratory/361", "/new-lab-request/361"],
  ["/laboratory/362", "/lab-request-list/362"],
  ["/laboratory/363", "/lab-workbench/363"],
  ["/radiology/371", "/new-imaging-request/371"],
  ["/radiology/372", "/imaging-requests/372"],
  ["/radiology/373", "/imaging-workbench/373"],
  ["/convertor/64", "/tool/64"],
  ["/account-recovery", "/?mode=token"],
  ["/account-recovery/390", "/?mode=token"],
  ["/forgot-token", "/?mode=token"],
  ["/forgot-token/355", "/?mode=token"],
  ["/forgot-token/390", "/?mode=token"],
  ["/account-recovery/391", "/?mode=password"],
  ["/forgot-password", "/?mode=password"],
  ["/forgot-password/356", "/?mode=password"],
  ["/forgot-password/391", "/?mode=password"],
  ["/account-recovery/392", "/?mode=phone"],
  ["/forgot-phone-number", "/?mode=phone"],
  ["/forgot-phone-number/357", "/?mode=phone"],
  ["/forgot-phone-number/392", "/?mode=phone"]
];
const VERCEL_SPEC = {
  cleanUrls: true,
  trailingSlash: true,
  outputDirectory: "public",
  redirects: VERCEL_REDIRECTS.flatMap(function (pair) {
    return [
      { source: pair[0], destination: pair[1], permanent: false },
      { source: pair[0] + "/", destination: pair[1], permanent: false }
    ];
  }),
  buildCommand: "node SERVER/sync.js"
};

// firebase.json - the Firebase CLI's pointer at the rules file.
const FIREBASE_JSON_SPEC = { firestore: { rules: "firestore.rules" } };

// firestore.rules - the guard dog, written out verbatim by the sync.
const FIRESTORE_RULES = String.raw`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isSystemAdmin() {
      return isSignedIn()
        && exists(/databases/$(database)/documents/systemAdmins/$(request.auth.uid));
    }


    match /transactions/{docId} {
      allow read, create, update, delete: if isSignedIn();
    }

    match /healthRegistrations/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthTriage/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthNurseConsultations/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthDoctorConsultations/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthPrescriptions/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthTreatmentOrders/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthDestinations/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthWards/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthBeds/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthBedAssignments/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthBedTransfers/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthBedMaintenance/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthAdmissions/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthDischarges/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthLabRequests/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthImagingRequests/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }

    match /healthQueueConfig/{docId} {
      allow create, read, update, delete: if isSignedIn();
    }





    match /systemAccounts/{docId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn()
        && (
          (
            request.resource.data.get("googleEmail", "") == request.auth.token.email
            && request.resource.data.get("googleUid", "") == request.auth.uid
            && request.resource.data.get("status", "") == "pending"
            && request.resource.data.get("role", "") == "user"
          )
          || (
            !exists(/databases/$(database)/documents/systemSetup/claim)
            && request.resource.data.get("status", "") == "approved"
            && request.resource.data.get("role", "") == "admin"
          )
        );
      allow update: if isSystemAdmin()
        || (
          isSignedIn()
          && resource.data.get("googleUid", "") == request.auth.uid
          && resource.data.get("googleEmail", "") == request.auth.token.email
        );
      allow delete: if isSystemAdmin();
    }

    match /systemCredentials/{docId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn()
        && request.resource.data.get("googleUid", "") == request.auth.uid;
      allow update: if isSignedIn();
      allow delete: if isSystemAdmin();
    }

    match /systemDeleted/{docId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isSystemAdmin();
    }

    match /systemAdmins/{uid} {
      allow read: if isSignedIn()
        && (uid == request.auth.uid || isSystemAdmin());
      allow create: if isSignedIn() && uid == request.auth.uid;
      allow update: if isSystemAdmin() && uid != request.auth.uid;
      allow delete: if isSystemAdmin() && uid != request.auth.uid;
    }

    match /systemSetup/{docId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn()
        && !exists(/databases/$(database)/documents/systemSetup/claim);
      allow update, delete: if isSystemAdmin();
    }

    match /systemNotifications/{docId} {
      allow read: if isSignedIn()
        && (
          resource.data.get("googleUid", "") == request.auth.uid
          || resource.data.get("googleEmail", "") == request.auth.token.email
          || isSystemAdmin()
        );
      allow create: if isSignedIn()
        && (
          (
            request.resource.data.get("type", "") == "registration"
            && request.resource.data.get("status", "") == "unread"
            && request.resource.data.get("googleEmail", "") == request.auth.token.email
          )
          || (
            // the administrator's decision on a deletion request goes
            // to the requesting user as a notification
            isSystemAdmin()
            && request.resource.data.get("type", "") == "deletion"
            && request.resource.data.get("status", "") == "unread"
          )
        )
      allow update: if isSystemAdmin();
      allow delete: if isSystemAdmin();
    }

    match /systemDeletionRequests/{docId} {
      // Data deletion workflow: organisation users request the deletion of
      // organisational data from Settings -> Show Delete Data. A request
      // always carries the requester's own identity and a written reason.
      // Only a system administrator may approve, reject or complete a
      // request - and never their own (no self-approval) - while the data
      // itself stays untouched until an approval is actually executed.
      allow read: if isSignedIn()
        && (
          isSystemAdmin()
          || resource.data.get("requesterUid", "") == request.auth.uid
          || resource.data.get("requesterEmail", "") == request.auth.token.email
        );
      allow create: if isSignedIn()
        && request.resource.data.get("type", "") == "data-deletion"
        && request.resource.data.get("status", "") == "pending"
        && request.resource.data.get("requesterUid", "") == request.auth.uid
        && request.resource.data.get("requesterEmail", "") == request.auth.token.email
        && request.resource.data.get("reason") is string
        && request.resource.data.get("reason").size() > 0
        && request.resource.data.get("scopes") is list
        && request.resource.data.get("scopes").size() > 0;
      allow update: if isSystemAdmin()
        && request.resource.data.get("requesterUid", "") == resource.data.get("requesterUid", "")
        && request.resource.data.get("requesterUid", "") != request.auth.uid
        && (
          // claim a pending request for approval
          (resource.data.get("status", "") == "pending"
            && request.resource.data.get("status", "") == "approved")
          // reject a pending request - the reason is mandatory
          || (resource.data.get("status", "") == "pending"
            && request.resource.data.get("status", "") == "rejected"
            && request.resource.data.get("decision", {}).get("reason", "") is string
            && request.resource.data.get("decision", {}).get("reason", "").size() > 0)
          // record the execution result of an approved request
          || (resource.data.get("status", "") in ["approved", "failed"]
            && request.resource.data.get("status", "") in ["completed", "failed"])
        );
      allow delete: if isSystemAdmin();
    }

    match /systemDeletionAudit/{docId} {
      // Retention archive for every permanent deletion: what was deleted,
      // by whom, when and why, plus a copy of the removed documents. The
      // archive is written BEFORE anything is removed; a creator may only
      // finalise their own record, and only the administrator can read the
      // audit history or remove records from it.
      allow read: if isSystemAdmin();
      allow create: if isSignedIn()
        && request.resource.data.get("actorUid", "") == request.auth.uid
        && request.resource.data.get("status", "") == "executing";
      allow update: if isSystemAdmin()
        || (isSignedIn() && resource.data.get("actorUid", "") == request.auth.uid);
      allow delete: if isSystemAdmin();
    }

    match /stockItems/{docId} {
      allow read, create, update, delete: if isSignedIn();
    }

    match /stockChanges/{docId} {
      allow read, create, update, delete: if isSignedIn();
    }
    match /systemPageConfig/{docId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isSystemAdmin();
    }

    match /data/{containerKey}/{rest=**} {
      allow read, write: if isSignedIn()
        && request.auth.token.email is string
        && containerKey == request.auth.token.email.lower() + "__personal";
    }
  }
}`;

// apply-rules.sh - the one-shot rules publisher, written out verbatim.
const APPLY_RULES_SH = String.raw`#!/usr/bin/env bash
# apply-rules.sh - the one-shot publisher for the Firestore rules.
# Written out of the settings block in SERVER/server.js by
#     node SERVER/sync.js
# so editing it by hand is pointless - the next sync writes it back. It
# walks you through the Firebase sign in, publishes firestore.rules to the
# project the code really runs on, then removes itself. Kept out of the
# app: nothing on the website imports it.
set -eu
cd "$(dirname "$0")"

[ -f firestore.rules ] || { echo "ABORT: firestore.rules not found - run: node SERVER/sync.js" >&2; exit 1; }
[ -f firebase.json ] || { echo "ABORT: firebase.json not found - run: node SERVER/sync.js" >&2; exit 1; }
[ -f .firebaserc ] || { echo "ABORT: .firebaserc not found - run: node SERVER/sync.js" >&2; exit 1; }

PROJECT="${DATABASE_PROJECT}"
say() { printf '%s\n' "$*"; }
say "database project: $PROJECT (written by SERVER/server.js)"

command -v firebase >/dev/null 2>&1 \
  || { echo "ABORT: the Firebase CLI is not installed - install it with: npm install -g firebase-tools" >&2; exit 1; }

say "signing in to Firebase (a browser opens the first time)..."
firebase login

say "publishing firestore.rules to $PROJECT..."
firebase deploy --only firestore:rules --project "$PROJECT"

rm -f "$0"
say "done: firestore.rules published to $PROJECT - apply-rules.sh removed itself."`;
// ==== END JAMALI SETTINGS SOURCE ====

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
// The marked settings block above is the input; the files it names are its
// outputs, rewritten by node SERVER/sync.js on every change.
export const SERVER_CONFIG = {
  active: DATABASE_PROJECT,
  hosting: {
    platform: "Vercel",
    outputDirectory: "public",
    runtimeModule: "/502.js",
    buildLine: "node SERVER/sync.js",
    syncCommand: "node SERVER/sync.js",
    settingsSource: "SERVER/server.js",
    generatedFiles: [
      "vercel.json", "firebase.json", ".firebaserc",
      "firestore.rules", "apply-rules.sh", "public/502.js"
    ]
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

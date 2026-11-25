// JAMALI - SERVER/server.js, the configuration source and the runtime module.
// One file holds the Firebase project selection, the optional Google identity
// wiring and the whole content of every settings file the deploys need, so
// pages never carry keys or connection setups of their own. Self-contained:
// the Google identity SDK comes from the Google CDN, so this file needs no
// other repository file to work. Running
//     node SERVER/sync.js
// reads the marked settings block below and writes vercel.json, firebase.json,
// .firebaserc, firestore.rules, apply-rules.sh and the 502 core block inside
// public/sidebar.js - this content verbatim, the one module every page imports
// from - and SERVER/linker.js is the
// connection point the modules talk through.
//
// LOCAL DATA ENGINE (20 Nov 2026) - the data layer of the whole system:
// Google sign-in is OPTIONAL. Every visitor uses every page without an
// account, and all business data - the books, the registers, the reports,
// stock and health records - is saved automatically in the visitor's own
// browser Local Storage:
//   - it survives refreshing, closing and reopening the browser;
//   - an anonymous visitor's data lives under the "anon" zone;
//   - a visitor who signs in with Google gets their own zone keyed by their
//     email, so two different identities on one browser never see or mix
//     each other's data (and different browsers are separate by nature);
//   - nothing is written to the cloud database any more - the shared
//     anonymous Firestore collections are closed in the rules, so no user
//     can ever read or write another user's data. The old cloud rows stay
//     archived in the Firebase project, reachable from the console only.
// The whole engine sits in the LOCAL DATA ENGINE section below; every
// Firestore-style call the pages make (collection, doc, addDoc, setDoc,
// updateDoc, deleteDoc, getDocs, getDoc, writeBatch, query, orderBy, where,
// limit, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, increment,
// deleteField, runTransaction) is a thin local implementation with the same
// signature and the same snapshot shapes, so no page needed any change.
//
// CLOUD COMMENT DESK (20 Nov 2026) - the one deliberate cloud exception:
// a comment must TRAVEL. Every visitor - signed in or not - may send a
// comment, and it lands in the shared "comments" collection in Firestore,
// addressed to the owner (COMMENT_OWNER_EMAIL below). Only the owner may
// read or delete the mailbox; a visitor can only add. The sidebar footer
// carries the Comment button next to the Login/Logout button and the
// settings gear (one row: Login/Logout 50% + Comment 25% + Settings 25%),
// and the owner sees a
// "Comments" button at the top right of every page.

// ==== JAMALI SETTINGS SOURCE - the single source of truth for every settings file ====
// Everything the deploys need is declared between this line and the END
// marker. SERVER/sync.js reads this block and writes every settings file
// out of it: vercel.json, firebase.json, .firebaserc, firestore.rules,
// apply-rules.sh and the 502 core block inside public/sidebar.js - a verbatim
// copy of this content. Edit
// here, run node SERVER/sync.js and commit what it writes: the written
// files are outputs, and the Vercel build line runs the same sync, so the
// next deploy always matches the server.

// The database project the whole system runs on: the web keys below, the
// Firebase CLI (.firebaserc) and the rules publisher all take it from here.
const DATABASE_PROJECT = "jamal-542b5";

// The comment desk mailbox: every visitor's comments are addressed to this
// account, and only this account may read or remove them (firestore.rules
// enforces it; the sidebar shows the Comments button for this email only).
const COMMENT_OWNER_EMAIL = "camelkazembe1@gmail.com";

// The web keys of that project - Firebase web keys are public by design.
// Only the Google identity (sign-in) still uses them; the data layer is
// fully local to each browser.
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
  ["/stock-management/397", "/stock-register/348"],
  ["/stock-management/398", "/stock-progress/347"],
  ["/stock-management/399", "/stock-change/346"],
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
  ["/laboratory/363", "/lab-workbench/359"],
  ["/radiology/371", "/new-imaging-request/357"],
  ["/radiology/372", "/imaging-requests/356"],
  ["/radiology/373", "/imaging-workbench/355"],
  ["/convertor/64", "/tool/64"],
  ["/account-recovery/390", "/?mode=token"],
  ["/forgot-token/355", "/?mode=token"],
  ["/forgot-token/390", "/?mode=token"],
  ["/account-recovery/391", "/?mode=password"],
  ["/forgot-password/356", "/?mode=password"],
  ["/forgot-password/391", "/?mode=password"],
  ["/account-recovery/392", "/?mode=phone"],
  ["/forgot-phone-number/357", "/?mode=phone"],
  ["/forgot-phone-number/392", "/?mode=phone"]
];
const VERCEL_SPEC = {
  cleanUrls: true,
  trailingSlash: true,
  outputDirectory: "public",
  /* Routes that land on the root itself stay real redirects: the bar
   * ends on "/" (or "/?mode=..."), so no route path is exposed. Every
   * legacy page route turned into an invisible rewrite instead - the
   * browser keeps the address it asked for, the page content arrives
   * quietly, and jamali-bridge.js then folds the visit back into the
   * root shell. No redirect is seen happening at the bottom or anywhere
   * else, and every route stays internal. */
  redirects: VERCEL_REDIRECTS.filter(function (pair) {
    return pair[1] === "/" || pair[1].indexOf("/?") === 0;
  }).flatMap(function (pair) {
    return [
      { source: pair[0], destination: pair[1], permanent: false },
      { source: pair[0] + "/", destination: pair[1], permanent: false }
    ];
  }),
  rewrites: VERCEL_REDIRECTS.filter(function (pair) {
    return pair[1] !== "/" && pair[1].indexOf("/?") !== 0;
  }).flatMap(function (pair) {
    return [
      { source: pair[0], destination: pair[1] },
      { source: pair[0] + "/", destination: pair[1] }
    ];
  }),
  buildCommand: "node SERVER/sync.js"
};

// firebase.json - the Firebase CLI's pointer at the rules file.
const FIREBASE_JSON_SPEC = { firestore: { rules: "firestore.rules" } };

// firestore.rules - the guard dog, written out verbatim by the sync.
// LOCAL STORAGE MOVE (20 Nov 2026): every browser keeps its own books,
// stock and health data in Local Storage now, so the shared anonymous
// collections are CLOSED - data can never mix between users, and no
// visitor can dump junk into the project any more. The old cloud rows
// stay archived in the project, readable from the Firebase console.
// The system* matches keep their signed-in-only authority untouched.
const FIRESTORE_RULES = String.raw`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    // RETURNED (demand 24 Nov 2026): the administrator is the
    // camelkazembe1@gmail.com account and nobody else - the email is
    // the authority, no systemAdmins document needed. This gates the
    // writes to systemPageConfig (the module/field visibility the
    // sidebar tooling saves) and the system desk collections.
    function isSystemAdmin() {
      return isSignedIn()
        && request.auth.token.email is string
        && request.auth.token.email.lower() == "camelkazembe1@gmail.com";
    }


    match /transactions/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser - the old shared rows stay archived in the project
    }

    match /healthRegistrations/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthTriage/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthNurseConsultations/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthDoctorConsultations/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthPrescriptions/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthTreatmentOrders/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthDestinations/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthWards/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthBeds/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthBedAssignments/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthBedTransfers/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthBedMaintenance/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthAdmissions/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthDischarges/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthLabRequests/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthImagingRequests/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthQueueConfig/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthStaff/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthTelemedicine/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthBirths/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthDeaths/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /healthBranches/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /stockItems/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /stockChanges/{docId} {
      allow read, write: if false;  // LOCAL STORAGE MOVE: closed, data is per browser
    }

    match /comments/{docId} {
      // THE COMMENT DESK: the one collection visitors still write to.
      // USERS ONLY (demand): a comment is a letter from a signed-in user
      // to the owner - the AI and anonymous writers are not allowed and
      // the database refuses them (text only, 1-2000 chars). Reading the
      // mailbox and removing comments is the owner's alone.
      allow create: if isSignedIn()
        && request.auth.token.email != null
        && request.resource.data.get("text", "") is string
        && request.resource.data.get("text", "").size() > 0
        && request.resource.data.get("text", "").size() <= 2000
        && request.resource.data.get("from", "") is string
        && request.resource.data.get("from", "").size() <= 200;
      allow read, delete: if isSignedIn()
        && request.auth.token.email != null
        && request.auth.token.email.lower() == "camelkazembe1@gmail.com";
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
        );
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
        && request.resource.data.get("reason", "") is string
        && request.resource.data.get("reason", "").size() > 0
        && request.resource.data.get("scopes", []) is list
        && request.resource.data.get("scopes", []).size() > 0;
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

    match /aiHistory/{docId} {
      allow read, create, update, delete: if isSignedIn();
    }

    match /aiChats/{docId} {
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
# so editing it by hand is pointless - the next sync writes it back.
# It signs you in to Firebase (a browser opens the first time) and
# publishes firestore.rules to the project the code really runs on.
# Safe to run again at any time - publishing the same rules twice is fine.
# Kept out of the app: nothing on the website imports it.
set -eu
cd "$(dirname "$0")"

[ -f firestore.rules ] || { echo "ABORT: firestore.rules not found - run this from the jamal repository folder." >&2; exit 1; }
[ -f firebase.json ] || { echo "ABORT: firebase.json not found - run this from the jamal repository folder." >&2; exit 1; }

PROJECT="${DATABASE_PROJECT}"
say() { printf '%s\n' "$*"; }

# The Firebase CLI: the installed one when present, otherwise npx fetches
# firebase-tools on the fly - no global install is needed.
fb() {
  if command -v firebase >/dev/null 2>&1; then firebase "$@";
  else npx --yes firebase-tools@latest "$@"; fi
}
command -v firebase >/dev/null 2>&1 || command -v npx >/dev/null 2>&1 || {
  echo "ABORT: neither the firebase CLI nor node/npm (npx) is on this machine." >&2
  echo "Install node from https://nodejs.org and run this script again, or publish" >&2
  echo "firestore.rules by hand in the Firebase console:" >&2
  echo "  https://console.firebase.google.com/project/$PROJECT/firestore/rules" >&2
  exit 1
}

say "database project: $PROJECT (written by SERVER/server.js)"
say "signing in to Firebase (a browser opens the first time)..."
fb login

say "publishing firestore.rules to $PROJECT ..."
fb deploy --only firestore:rules --project "$PROJECT"

say "done: firestore.rules published to $PROJECT."
say "the comment desk is open now - visitors' comments reach the owner; send one again."`;
// ==== END JAMALI SETTINGS SOURCE ====

// ======================================================================
// OPTIONAL GOOGLE IDENTITY - loaded dynamically, with graceful fallback.
// Signing in is never required: it only names the Local Storage zone the
// visitor's data lives in (and paints the sidebar Login/Logout button).
// If the Google CDN is unreachable - offline, blocked, slow - the whole
// system still runs, anonymously, purely from Local Storage.
// ======================================================================
export let auth = null;       // the Firebase auth handle, or null when unavailable
export let provider = null;   // the Google provider, or null when unavailable

var activeUser = null;        // the signed-in Google user, or null (anonymous)
var authFirstSeen = false;
var authCallbacks = [];
var authReadyResolve = null;
var authReady = new Promise(function (resolve) { authReadyResolve = resolve; });

/* NO SYSTEM LOADING ON OPEN PAGE: the last known identity is cached in
 * Local Storage and seeded into the zone BEFORE anything async runs, so
 * every page paints the instant it is clicked, in the right data zone,
 * instead of waiting (up to 4s) for Google to report in. The real
 * identity still settles in the background and corrects the zone live. */
try {
  var identityCacheSeed = window.localStorage.getItem("jamaliIdentityCache");
  if (identityCacheSeed) activeUser = { email: identityCacheSeed };
} catch (e) { /* no storage (private mode): start anonymous */ }

/* confirmed = Google itself reported this state (its onAuthStateChanged
 * fired). The 4s timeout and the offline fallback are NOT confirmed: they
 * must never wipe the identity cache or flip the zone away from it, or a
 * signed-in visitor on a slow connection would lose their data zone on
 * the next page. */
function fireAuthCallbacks(user, confirmed) {
  if (user && user.email) {
    activeUser = user;
    try { window.localStorage.setItem("jamaliIdentityCache", String(activeUser.email)); } catch (e) {}
  } else if (confirmed) {
    activeUser = null;
    try { window.localStorage.removeItem("jamaliIdentityCache"); } catch (e) {}
  } else {
    /* Unconfirmed "no user" (4s timeout, offline, hung network): the
     * cached identity stands - the zone does not flip away from it. */
    var cached = null;
    try { cached = window.localStorage.getItem("jamaliIdentityCache"); } catch (e) {}
    activeUser = cached ? { email: cached } : null;
  }
  for (var i = 0; i < authCallbacks.length; i++) {
    try { authCallbacks[i](activeUser); } catch (e) {}
  }
  localZoneChanged();
}

function authFirstDone(user, confirmed) {
  if (authFirstSeen) return;
  authFirstSeen = true;
  authReadyResolve(user || null);
  fireAuthCallbacks(user, confirmed);
}

var authModRef = null; // the loaded firebase-auth module, or null
var appRef = null;     // the Firebase app handle - the cloud comment desk
                       // reuses it, so the app is initialised only once
(async function bootGoogleIdentity() {
  try {
    var appMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    var authMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    authModRef = authMod;
    var app = appMod.initializeApp(firebaseConfig);
    appRef = app;
    auth = authMod.getAuth(app);
    provider = new authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    authMod.onAuthStateChanged(auth, function (user) {
      authFirstDone(user, true);
      fireAuthCallbacks(user, true);
    });
    // If the identity never reports in (hung network), go on anonymously.
    setTimeout(function () { authFirstDone(null); }, 4000);
  } catch (e) {
    // Offline or the CDN is blocked: run without a Google identity.
    auth = null;
    provider = null;
    authFirstDone(null);
  }
})();

// Wrapped auth API - the same signatures the Firebase SDK uses, so the
// sidebar button and every RESERVE module keep working unchanged.
export function onAuthStateChanged(authArg, callback) {
  authCallbacks.push(callback);
  if (authFirstSeen) { try { callback(activeUser); } catch (e) {} }
  return function () {
    var i = authCallbacks.indexOf(callback);
    if (i >= 0) authCallbacks.splice(i, 1);
  };
}

export function signInWithPopup(authArg, providerArg) {
  if (!auth || !authModRef) {
    return Promise.reject(new Error(
      "Google sign-in is not available right now (no connection to Google). The system keeps working without an account - your data is saved in this browser."));
  }
  return authModRef.signInWithPopup(auth, providerArg || provider);
}

export function signOut(authArg) {
  if (!auth || !authModRef) return Promise.resolve();
  return authModRef.signOut(auth);
}

// requireAuth - every page awaits this before it touches data. NO SYSTEM
// LOADING ON OPEN PAGE: it resolves immediately, from the identity cache
// seeded above, so the page engines paint the instant the page is
// clicked - in the right zone, with zero waiting for Google. When the
// real identity later reports a different state, localZoneChanged()
// repaints the live listeners under the corrected zone.
export function requireAuth() {
  return Promise.resolve(activeUser);
}

// authSettled - resolves when the REAL Google identity has settled
// (signed in, confirmed anonymous, or offline). Consumers that must see
// the live auth handle - the sidebar Login button, the comment desk page
// - wait on this one; every page engine keeps requireAuth (instant).
export function authSettled() {
  return authReady.then(function () { return null; });
}

// ======================================================================
// LOCAL DATA ENGINE - the whole data layer, per browser.
// ======================================================================

// The storage handle: real Local Storage when available, a memory map
// otherwise (private windows that block storage still work; data then
// lasts for the page session only).
var LS = null;
try {
  LS = window.localStorage;
  LS.setItem("__jamali_probe", "1");
  LS.removeItem("__jamali_probe");
} catch (e) { LS = null; }
var MEMORY_STORE = {};
function lsGet(key) {
  if (LS) { try { return LS.getItem(key); } catch (e) { return MEMORY_STORE[key] || null; } }
  return MEMORY_STORE[key] || null;
}
function lsSet(key, value) {
  if (LS) { LS.setItem(key, value); return; }
  MEMORY_STORE[key] = value;
}
function lsDel(key) {
  if (LS) { try { LS.removeItem(key); } catch (e) {} }
  delete MEMORY_STORE[key];
}

var ZONE_PREFIX = "jamaliLocal::";

function currentNamespace() {
  var mail = activeUser && activeUser.email ? String(activeUser.email).toLowerCase() : "";
  return mail ? "u::" + mail : "anon";
}
function localKey(ns, collectionName) {
  return ZONE_PREFIX + ns + "::" + collectionName;
}
function zoneLabel() {
  var ns = currentNamespace();
  if (ns === "anon") return "this browser - anonymous (no account)";
  return "this browser - " + ns.slice(3);
}
export function localZone() {
  return {
    namespace: currentNamespace(),
    label: zoneLabel(),
    signedIn: !!(activeUser && activeUser.email),
    persistent: !!LS
  };
}

// ---- in-memory collection cache, write-through to storage ----
var collCache = Object.create(null);
function loadColl(ns, name) {
  var key = localKey(ns, name);
  if (collCache[key]) return collCache[key];
  var map = {};
  var raw = lsGet(key);
  if (raw) {
    try { map = JSON.parse(raw) || {}; } catch (e) { map = {}; }
  }
  collCache[key] = map;
  return map;
}
function saveColl(ns, name) {
  var key = localKey(ns, name);
  var text = "";
  try { text = JSON.stringify(collCache[key] || {}); } catch (e) { text = "{}"; }
  try {
    lsSet(key, text);
  } catch (e) {
    throw localError("resource-exhausted",
      "This browser's Local Storage is full - the record was NOT saved. Free some space (or remove old records via Settings > Show Delete Data) and try again.");
  }
}
function dropCollCache(key) { delete collCache[key]; }

function localError(code, message) {
  var e = new Error(message);
  e.code = code;
  return e;
}

function newLocalId() {
  return "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ---- timestamps: stored as {__jts: millis}, revived as Timestamp-like ----
function makeTs(millis) {
  return {
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1000000,
    toDate: function () { return new Date(millis); },
    toMillis: function () { return millis; },
    isEqual: function (o) { return !!(o && typeof o.toMillis === "function" && o.toMillis() === millis); },
    __jamaliTs: true
  };
}
export function serverTimestamp() {
  return { __jamaliSentinel: "serverTS" };
}

// ---- the other write sentinels, same shapes as the Firestore SDK ----
export function arrayUnion() {
  return { __jamaliSentinel: "arrayUnion", values: Array.prototype.slice.call(arguments) };
}
export function arrayRemove() {
  return { __jamaliSentinel: "arrayRemove", values: Array.prototype.slice.call(arguments) };
}
export function increment(n) {
  return { __jamaliSentinel: "increment", by: Number(n) || 0 };
}
export function deleteField() {
  return { __jamaliSentinel: "deleteField" };
}

function jsonKey(v) { try { return JSON.stringify(v); } catch (e) { return String(v); } }

// Pack a value for storage: Dates and Timestamp-likes become __jts markers,
// everything JSON-unfriendly is dropped, plain data passes through.
function packValue(v) {
  if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (v instanceof Date) return { __jts: v.getTime() };
  if (typeof v === "object") {
    if (typeof v.toMillis === "function") return { __jts: v.toMillis() };
    if (v.__jts !== undefined) return { __jts: v.__jts };
    if (Array.isArray(v)) {
      var out = [];
      for (var i = 0; i < v.length; i++) out.push(packValue(v[i]));
      return out;
    }
    var o = {};
    for (var k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
      if (typeof v[k] === "function") continue;
      o[k] = packValue(v[k]);
    }
    return o;
  }
  return null; // functions, symbols, undefined - not storable
}

// Revive stored values: __jts markers become Timestamp-like objects with
// .toDate() / .toMillis(), exactly what the page engines expect.
function unpackValue(v) {
  if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) {
    var out = [];
    for (var i = 0; i < v.length; i++) out.push(unpackValue(v[i]));
    return out;
  }
  if (typeof v === "object") {
    if (v.__jts !== undefined && typeof v.__jts === "number") return makeTs(v.__jts);
    var o = {};
    for (var k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
      o[k] = unpackValue(v[k]);
    }
    return o;
  }
  return v;
}

// Apply a write payload (with its sentinels) onto a stored document.
function applyData(stored, patch) {
  if (!patch || typeof patch !== "object") return stored;
  for (var k in patch) {
    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
    var v = patch[k];
    if (v && typeof v === "object" && v.__jamaliSentinel) {
      switch (v.__jamaliSentinel) {
        case "serverTS":
          stored[k] = { __jts: Date.now() };
          break;
        case "arrayUnion": {
          var arr = Array.isArray(stored[k]) ? stored[k] : [];
          arr = arr.slice();
          var seen = {};
          for (var i = 0; i < arr.length; i++) seen[jsonKey(arr[i])] = true;
          for (var j = 0; j < v.values.length; j++) {
            var packed = packValue(v.values[j]);
            var key2 = jsonKey(packed);
            if (!seen[key2]) { arr.push(packed); seen[key2] = true; }
          }
          stored[k] = arr;
          break;
        }
        case "arrayRemove": {
          var cur = Array.isArray(stored[k]) ? stored[k] : [];
          var remove = {};
          for (var m = 0; m < v.values.length; m++) remove[jsonKey(packValue(v.values[m]))] = true;
          var kept = [];
          for (var n2 = 0; n2 < cur.length; n2++) {
            if (!remove[jsonKey(cur[n2])]) kept.push(cur[n2]);
          }
          stored[k] = kept;
          break;
        }
        case "increment":
          stored[k] = (typeof stored[k] === "number" ? stored[k] : 0) + v.by;
          break;
        case "deleteField":
          delete stored[k];
          break;
        default:
          break;
      }
    } else {
      stored[k] = packValue(v);
    }
  }
  return stored;
}

// ---- refs, queries, snapshots - same shapes as the Firestore SDK ----
export function collection(dbArg, name) {
  return { __jamaliRef: "collection", name: String(name) };
}
export function getFirestore() {
  return { __jamaliLocalDb: true };
}
export const db = { __jamaliLocalDb: true };

export function doc(dbOrColl, a, b) {
  // doc(collectionRef) - a brand-new auto id (batch.set pattern);
  // doc(db, "name", "id") - a named document.
  if (a === undefined) {
    var name0 = dbOrColl && dbOrColl.__jamaliRef === "collection" ? dbOrColl.name : "";
    return { __jamaliRef: "doc", name: name0, id: newLocalId() };
  }
  return { __jamaliRef: "doc", name: String(a), id: String(b) };
}

export function query(collRef) {
  var name = collRef && collRef.name ? collRef.name :
    (collRef && collRef.__jamaliRef === "query" ? collRef.name : "");
  var cons = collRef && collRef.constraints ? collRef.constraints.slice() : [];
  for (var i = 1; i < arguments.length; i++) {
    if (arguments[i] && arguments[i].__jamaliConstraint) cons.push(arguments[i]);
  }
  return { __jamaliRef: "query", name: name, constraints: cons };
}
export function orderBy(field, dir) {
  return { __jamaliConstraint: "orderBy", field: String(field), dir: dir === "desc" ? "desc" : "asc" };
}
export function where(field, op, value) {
  return { __jamaliConstraint: "where", field: String(field), op: String(op || "=="), value: value };
}
export function limit(n) {
  return { __jamaliConstraint: "limit", n: Number(n) || 0 };
}

function docSnap(id, packed, exists) {
  return {
    id: id,
    exists: function () { return !!exists; },
    data: function (opts) { return exists ? unpackValue(packed) : undefined; }
  };
}
function querySnap(docs) {
  var snap = {
    docs: docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: function (fn, thisArg) {
      for (var i = 0; i < docs.length; i++) fn.call(thisArg || null, docs[i], i, snap);
    },
    docChanges: function () { return []; }
  };
  return snap;
}

function cmpValues(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  var sa = String(a), sb = String(b);
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}
function sortDocs(docs, constraints) {
  var order = null;
  var lim = 0;
  for (var i = 0; i < constraints.length; i++) {
    var c = constraints[i];
    if (c.__jamaliConstraint === "orderBy") order = c;
    if (c.__jamaliConstraint === "limit") lim = c.n;
  }
  if (order) {
    var dir = order.dir === "desc" ? -1 : 1;
    docs = docs.slice().sort(function (d1, d2) {
      var v1 = d1._unpacked[order.field];
      var v2 = d2._unpacked[order.field];
      if (v1 === undefined && v2 === undefined) return 0;
      if (v1 === undefined) return 1;              // missing field sorts last
      if (v2 === undefined) return -1;
      if (v1 && typeof v1.toMillis === "function") v1 = v1.toMillis();
      if (v2 && typeof v2.toMillis === "function") v2 = v2.toMillis();
      return cmpValues(v1, v2) * dir;
    });
  }
  if (lim > 0 && docs.length > lim) docs = docs.slice(0, lim);
  return docs;
}
function readQuery(ns, name, constraints) {
  var map = loadColl(ns, name);
  var ids = Object.keys(map);
  var docs = [];
  var wheres = [];
  var lim = 0;
  for (var i = 0; i < constraints.length; i++) {
    var c = constraints[i];
    if (c.__jamaliConstraint === "where") wheres.push(c);
    if (c.__jamaliConstraint === "limit") lim = c.n;
  }
  for (var j = 0; j < ids.length; j++) {
    var id = ids[j];
    var unpacked = unpackValue(map[id]);
    var ok = true;
    for (var w = 0; w < wheres.length; w++) {
      var have = unpacked[wheres[w].field];
      var want = wheres[w].value;
      if (wheres[w].op === "==") {
        if (have && typeof have.toMillis === "function" && want && typeof want.toMillis === "function") {
          ok = have.toMillis() === want.toMillis();
        } else if (want && typeof want.toMillis === "function") {
          ok = false;
        } else {
          ok = jsonKey(have) === jsonKey(want);
        }
      } else {
        ok = false; // only equality is supported locally - nothing uses more
      }
      if (!ok) break;
    }
    if (ok) docs.push({ id: id, _unpacked: unpacked, exists: true });
  }
  docs = sortDocs(docs, constraints);
  var snaps = docs.map(function (d) { return docSnap(d.id, map[d.id], true); });
  if (lim > 0 && snaps.length > lim) snaps = snaps.slice(0, lim);
  return querySnap(snaps);
}

// ---- the live listener registry: repaints pages on every change ----
var listeners = [];
function emitEntry(entry) {
  var ns = currentNamespace();
  var snap = readQuery(ns, entry.name, entry.constraints || []);
  try { entry.cb(snap); } catch (e) {}
}
function notifyCollection(name) {
  for (var i = 0; i < listeners.length; i++) {
    if (listeners[i].name === name) emitEntry(listeners[i]);
  }
}
function localZoneChanged() {
  // The identity changed (sign-in, sign-out, boot): every live listener
  // re-reads under the new zone, so pages repaint instantly.
  for (var i = 0; i < listeners.length; i++) emitEntry(listeners[i]);
  if (typeof window !== "undefined") {
    try { window.JAMALI_LOCAL_ZONE = localZone(); } catch (e) {}
  }
}

export function onSnapshot(ref, cb, errCb) {
  var entry = {
    name: ref && ref.name ? ref.name : "",
    constraints: ref && ref.constraints ? ref.constraints.slice() : [],
    cb: cb
  };
  listeners.push(entry);
  // First paint once the identity/zone is settled; then live forever.
  authReady.then(function () { emitEntry(entry); });
  return function () {
    var i = listeners.indexOf(entry);
    if (i >= 0) listeners.splice(i, 1);
  };
}

// Other tabs of the same browser repaint when this zone's storage changes.
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("storage", function (ev) {
    if (!ev || !ev.key || ev.key.indexOf(ZONE_PREFIX) !== 0) return;
    var parts = ev.key.slice(ZONE_PREFIX.length).split("::");
    if (parts.length < 2) return;
    var ns = parts[0] + "::" + parts[1];
    var name = parts.slice(2).join("::");
    if (ns !== currentNamespace()) return; // another zone - never mix
    dropCollCache(localKey(ns, name));
    notifyCollection(name);
  });
}

// Every data operation waits for the identity to settle first, so the
// first read and the first write always land in the right zone.
function afterAuthReady(fn) {
  return authReady.then(function () {
    try { return Promise.resolve(fn()); } catch (e) { return Promise.reject(e); }
  });
}

// ---- the health audit trail ------------------------------------------
// Every create, write, update or delete that lands in a collection whose
// name starts with "health" is recorded in the shared "healthAudit"
// collection: who did it, what kind of action, which collection and
// document, and which fields changed. The audit trail must never break
// a real write, so the whole hook is wrapped in try/catch and writes the
// record directly into the collection map (no recursion through addDoc).
// Batch commits (writeBatch) are not hooked - bulk deletions go through
// the governed Data Deletion Requests flow, which keeps its own records.
var AUDIT_COLL = "healthAudit";
function auditHealthWrite(action, collName, docId, keys) {
  try {
    var c = String(collName || "");
    if (c.indexOf("health") !== 0 || c === AUDIT_COLL) return;
    var ans = currentNamespace();
    var amap = loadColl(ans, AUDIT_COLL);
    amap[newLocalId()] = {
      at: new Date().toISOString(),
      by: (activeUser && activeUser.email) ? String(activeUser.email) : "unknown",
      action: String(action || ""),
      coll: c,
      refId: String(docId || ""),
      detail: String(keys || "").slice(0, 400)
    };
    saveColl(ans, AUDIT_COLL);
    notifyCollection(AUDIT_COLL);
  } catch (e) { /* the audit trail must never break a real write */ }
}

// ---- the write and read operations, Firestore signatures ----
export function addDoc(collRef, data) {
  return afterAuthReady(function () {
    var ns = currentNamespace();
    var map = loadColl(ns, collRef.name);
    var id = newLocalId();
    map[id] = applyData({}, data);
    saveColl(ns, collRef.name);
    notifyCollection(collRef.name);
    auditHealthWrite("create", collRef.name, id, Object.keys(map[id] || {}).join(", "));
    return { id: id };
  });
}

export function setDoc(docRef, data, opts) {
  return afterAuthReady(function () {
    var ns = currentNamespace();
    var map = loadColl(ns, docRef.name);
    var merge = !!(opts && opts.merge);
    var id = docRef.id;
    if (merge && map[id]) {
      applyData(map[id], data);
    } else if (merge) {
      map[id] = applyData({}, data);
    } else {
      map[id] = applyData({}, data);
    }
    saveColl(ns, docRef.name);
    notifyCollection(docRef.name);
    auditHealthWrite("write", docRef.name, id, Object.keys(map[id] || {}).join(", "));
    return undefined;
  });
}

export function updateDoc(docRef, data) {
  return afterAuthReady(function () {
    var ns = currentNamespace();
    var map = loadColl(ns, docRef.name);
    if (!map[docRef.id]) {
      return Promise.reject(localError("not-found",
        "No document '" + docRef.id + "' in '" + docRef.name + "' to update (it may have been deleted in another view)."));
    }
    applyData(map[docRef.id], data);
    saveColl(ns, docRef.name);
    notifyCollection(docRef.name);
    auditHealthWrite("update", docRef.name, docRef.id, Object.keys(data || {}).join(", "));
    return undefined;
  });
}

export function deleteDoc(docRef) {
  return afterAuthReady(function () {
    var ns = currentNamespace();
    var map = loadColl(ns, docRef.name);
    delete map[docRef.id];
    saveColl(ns, docRef.name);
    notifyCollection(docRef.name);
    auditHealthWrite("delete", docRef.name, docRef.id, "");
    return undefined;
  });
}

export function getDocs(ref) {
  return afterAuthReady(function () {
    var ns = currentNamespace();
    return readQuery(ns, ref.name, ref.constraints || []);
  });
}

export function getDoc(docRef) {
  return afterAuthReady(function () {
    var ns = currentNamespace();
    var map = loadColl(ns, docRef.name);
    var packed = map[docRef.id];
    return docSnap(docRef.id, packed, packed !== undefined);
  });
}

export function writeBatch(dbArg) {
  var ops = [];
  return {
    set: function (ref, data, opts) { ops.push({ kind: "set", ref: ref, data: data, opts: opts }); return this; },
    update: function (ref, data) { ops.push({ kind: "update", ref: ref, data: data }); return this; },
    delete: function (ref) { ops.push({ kind: "delete", ref: ref }); return this; },
    commit: function () {
      return afterAuthReady(function () {
        var ns = currentNamespace();
        var touched = {};
        for (var i = 0; i < ops.length; i++) {
          var op = ops[i];
          var map = loadColl(ns, op.ref.name);
          touched[op.ref.name] = true;
          if (op.kind === "set") {
            var merge = !!(op.opts && op.opts.merge);
            if (merge && map[op.ref.id]) applyData(map[op.ref.id], op.data);
            else map[op.ref.id] = applyData({}, op.data);
          } else if (op.kind === "update") {
            if (!map[op.ref.id]) {
              throw localError("not-found",
                "No document '" + op.ref.id + "' in '" + op.ref.name + "' to update.");
            }
            applyData(map[op.ref.id], op.data);
          } else {
            delete map[op.ref.id];
          }
        }
        for (var name in touched) {
          saveColl(ns, name);
          notifyCollection(name);
        }
        return undefined;
      });
    }
  };
}

export function runTransaction(dbArg, fn) {
  return afterAuthReady(function () {
    var ns = currentNamespace();
    var ops = [];
    var tx = {
      get: function (ref) {
        var map = loadColl(ns, ref.name);
        var packed = map[ref.id];
        return Promise.resolve(docSnap(ref.id, packed, packed !== undefined));
      },
      set: function (ref, data, opts) { ops.push({ kind: "set", ref: ref, data: data, opts: opts }); return tx; },
      update: function (ref, data) { ops.push({ kind: "update", ref: ref, data: data }); return tx; },
      delete: function (ref) { ops.push({ kind: "delete", ref: ref }); return tx; }
    };
    return Promise.resolve(fn(tx)).then(function () {
      var touched = {};
      for (var i = 0; i < ops.length; i++) {
        var op = ops[i];
        var map = loadColl(ns, op.ref.name);
        touched[op.ref.name] = true;
        if (op.kind === "set") {
          var merge = !!(op.opts && op.opts.merge);
          if (merge && map[op.ref.id]) applyData(map[op.ref.id], op.data);
          else map[op.ref.id] = applyData({}, op.data);
        } else if (op.kind === "update") {
          if (!map[op.ref.id]) throw localError("not-found", "No document '" + op.ref.id + "' to update.");
          applyData(map[op.ref.id], op.data);
        } else {
          delete map[op.ref.id];
        }
      }
      for (var name in touched) {
        saveColl(ns, name);
        notifyCollection(name);
      }
      return undefined;
    });
  });
}

// Minimal Timestamp shim - nothing in the pages imports it today, kept so
// the export surface stays complete for RESERVE modules.
export const Timestamp = {
  fromDate: function (d) { return makeTs(d.getTime()); },
  fromMillis: function (m) { return makeTs(m); },
  now: function () { return makeTs(Date.now()); }
};

// ---- support / diagnostics handle (harmless, client-side only) ----
if (typeof window !== "undefined") {
  try {
    window.JAMALI_LOCAL_DEBUG = {
      zone: function () { return localZone(); },
      setUser: function (mailOrNull) {
        // Forces the data zone without Google: same switch a real
        // sign-in / sign-out triggers. For diagnostics and testing.
        fireAuthCallbacks(mailOrNull ? { email: String(mailOrNull) } : null);
      },
      reset: function () {
        var gone = [];
        if (LS) {
          for (var i = LS.length - 1; i >= 0; i--) {
            var k = LS.key(i);
            if (k && k.indexOf(ZONE_PREFIX) === 0) { gone.push(k); LS.removeItem(k); }
          }
        }
        collCache = Object.create(null);
        localZoneChanged();
        return gone.length;
      }
    };
    window.JAMALI_LOCAL_ZONE = localZone();
  } catch (e) {}
}

// ======================================================================
// CLOUD COMMENT DESK - the one deliberate cloud feature. Everything else
// lives in this browser, but a comment must travel: it is written to the
// shared "comments" collection in Firestore so the owner can read every
// visitor's comments in one place. The Google identity boot above already
// initialises the Firebase app; the Firestore module joins lazily, the
// first time a comment is actually sent or read - the whole system stays
// fast and offline-capable for everything else. The database rules allow
// exactly two things: ANY visitor creates a comment, and ONLY the owner
// (COMMENT_OWNER_EMAIL in the settings block) reads or deletes comments.
// ======================================================================

var fsModRef = null;    // the loaded firebase-firestore CDN module, or null
var fsDbRef = null;     // the real cloud Firestore handle, or null
var fsBootPromise = null;

export function bootCloudFirestore() {
  if (fsBootPromise) return fsBootPromise;
  fsBootPromise = (async function () {
    if (!appRef) {
      throw new Error("The comment desk is offline (no connection to Google). The comment was NOT sent - try again when you are back online.");
    }
    if (!fsModRef) {
      fsModRef = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      fsDbRef = fsModRef.getFirestore(appRef);
    }
    return { fs: fsModRef, db: fsDbRef };
  })();
  // a failed boot (offline, CDN blocked) may be retried later
  fsBootPromise.catch(function () { fsBootPromise = null; });
  return fsBootPromise;
}

function commentRow(d) {
  var v = (d && typeof d.data === "function") ? (d.data() || {}) : {};
  return {
    id: d.id,
    text: String(v.text || ""),
    from: String(v.from || "Guest"),
    zone: String(v.zone || ""),
    page: String(v.page || ""),
    millis: v.createdAt && typeof v.createdAt.toMillis === "function" ? v.createdAt.toMillis() : 0
  };
}

function commentQuery(fs, cdb) {
  var base = fs.collection(cdb, "comments");
  return fs.query(base, fs.orderBy("createdAt", "desc"), fs.limit(300));
}

// commentSend - USERS ONLY (demand: users only are required to send
// comment; the AI is not allowed): the sender must be signed in, and the
// comment goes to the owner with the account email as the from line.
// Anonymous visitors get the sign-in gate in the write popup instead.
export function commentSend(text, pageRef) {
  if (!activeUser || !activeUser.email) {
    return Promise.reject(new Error("Sign in with Google to send a comment - comments come from signed-in users only."));
  }
  var t = String(text == null ? "" : text).trim();
  if (!t) return Promise.reject(new Error("Write the comment first - the box is empty."));
  if (t.length > 2000) return Promise.reject(new Error("The comment is over 2000 characters - shorten it and send it again."));
  return bootCloudFirestore().then(function (h) {
    return h.fs.addDoc(h.fs.collection(h.db, "comments"), {
      text: t,
      from: (activeUser && activeUser.email) ? String(activeUser.email) : "Guest",
      zone: currentNamespace(),
      page: (typeof pageRef === "string" && pageRef)
        ? String(pageRef)
        : ((typeof location !== "undefined" && location.pathname) || "").replace(/\.html$/, ""),
      createdAt: h.fs.serverTimestamp()
    });
  }).then(function () { return true; });
}

// commentList - one read of the mailbox, newest first. The database
// refuses it for anybody except the owner.
export function commentList() {
  return bootCloudFirestore().then(function (h) {
    return h.fs.getDocs(commentQuery(h.fs, h.db)).then(function (snap) {
      var out = [];
      snap.forEach(function (d) { out.push(commentRow(d)); });
      return out;
    });
  });
}

// commentDelete - removes one comment permanently (owner only).
export function commentDelete(id) {
  return bootCloudFirestore().then(function (h) {
    return h.fs.deleteDoc(h.fs.doc(h.db, "comments", String(id)));
  }).then(function () { return true; });
}

// commentWatch - the mailbox live: every new comment from every visitor
// appears while the owner has the panel open. Returns a promise of the
// unsubscribe function.
export function commentWatch(cb) {
  return bootCloudFirestore().then(function (h) {
    return h.fs.onSnapshot(commentQuery(h.fs, h.db), function (snap) {
      var out = [];
      snap.forEach(function (d) { out.push(commentRow(d)); });
      try { cb(null, out); } catch (e) {}
    }, function (err) {
      try { cb(err, null); } catch (e2) {}
    });
  });
}

// commentOwner - the owner email as a plain export. The comment desk page
// reads it directly (fb.commentOwner) instead of hard-coding a guess: the
// mailbox card, the owner sign-in card and the sidebar all compare the
// signed-in email against this one exact address.
export const commentOwner = COMMENT_OWNER_EMAIL;

// ======================================================================
// THE SYSTEM ADMINISTRATOR (demand 24 Nov 2026 - "return the admin
// issue and user issue to camelkazembe1@gmail.com only"): the one
// authority of the whole system is the signed-in Google identity, and
// the administrator is camelkazembe1@gmail.com and nobody else - the
// same owner email the comment desk already uses. isSystemAdmin()
// gates the Account Administration desk (system-admin/380), the
// sidebar area minus / field pins / hidden chip tooling and the write
// side of systemPageConfig in the Firestore rules (see the
// FIRESTORE_RULES block - isSystemAdmin() is the email check there
// too, so publishing the rules once enables the cloud writes).
// ======================================================================
export const SYSTEM_ADMIN_EMAIL = "camelkazembe1@gmail.com";
export function isSystemAdmin() {
  var mail = "";
  try {
    if (auth && auth.currentUser && auth.currentUser.email) {
      mail = String(auth.currentUser.email).toLowerCase();
    }
  } catch (e) {}
  if (!mail) mail = String((activeUser && activeUser.email) || "").toLowerCase();
  return mail === SYSTEM_ADMIN_EMAIL;
}

// The real-cloud handle is shared now: the visibility config
// (systemPageConfig/visibility) and the Account Administration desk
// talk to the actual Firestore, not to the per-browser local shim
// (the implementation below is exported for them).

// ======================================================================
// EXPORT TO ONLINE DATABASE - the bridge from the local data engine
// back to the server's database. The rules already give every signed-in
// user one writable container of their own:
//     match /data/{containerKey}/{rest=**}  where
//     containerKey == request.auth.token.email.lower() + "__personal"
// Export copies EVERY collection of THIS browser's local database (all
// zones: the anonymous zone and each signed-in zone found in Local
// Storage) into that container, keeping the zones separated on the way:
//     data/<email>__personal/<zone>/<collection>/<docId>
//   - zone is "anon" or "u__<email>" - zones never mix, in the cloud
//     just like in the browser;
//   - document ids and collection names are preserved, so re-exporting
//     overwrites the very same documents - it never duplicates;
//   - timestamps ({__jts: millis} markers) become real Firestore
//     Timestamps;
//   - documents over ~900 KB (the Firestore 1 MB limit, with margin)
//     are skipped and counted in the summary.
// Reading stays strictly one-way: the export writes, it never changes
// anything in the browser's Local Storage, and it never deletes cloud
// documents. A summary of each run lands in data/<email>__personal/
// export/_meta (latest run: when, by whom, how many records).
// ======================================================================
export function exportLocalToCloud(onProgress) {
  var z = localZone();
  if (!z.signedIn) {
    return Promise.reject(new Error(
      "Sign in with Google first - the online database only accepts records from a signed-in user."));
  }
  var email = String(activeUser.email).toLowerCase();
  var containerKey = email + "__personal";
  var nsSafe = function (ns) { return String(ns).replace(/::/g, "__"); };

  // 1) collect every local zone + collection with its stored documents
  var jobs = [];
  var seen = {};
  function harvest(source, count, keyAt) {
    for (var i = 0; i < count; i++) {
      var key = keyAt(source, i);
      if (!key || key.indexOf(ZONE_PREFIX) !== 0 || seen[key]) continue;
      seen[key] = true;
      /* key layout: jamaliLocal::<zone>::<collection>
       *   - anonymous zone: "anon::<coll>"      (2 segments)
       *   - signed-in zone: "u::<email>::<coll>" (3 segments)
       * Collection names never contain "::", emails neither. */
      var rest = key.slice(ZONE_PREFIX.length).split("::");
      if (rest.length < 2) continue;
      var ns;
      var collName;
      if (rest[0] === "u") {
        if (rest.length < 3) continue;
        ns = rest[0] + "::" + rest[1];
        collName = rest.slice(2).join("::");
      } else {
        ns = rest[0];
        collName = rest.slice(1).join("::");
      }
      if (!collName || /^__/.test(collName) || /^\./.test(collName)) continue;
      var raw = null;
      try { raw = source.getItem(key); } catch (e) {}
      if (raw == null) continue;
      var map = {};
      try { map = JSON.parse(raw) || {}; } catch (e2) { map = {}; }
      var ids = Object.keys(map);
      if (!ids.length) continue;
      jobs.push({ ns: ns, coll: collName, docs: map, ids: ids });
    }
  }
  if (LS) harvest(LS, LS.length || 0, function (s, i) { try { return s.key(i); } catch (e) { return null; } });
  else harvest({ getItem: function (k) { return MEMORY_STORE[k] || null; } },
    Object.keys(MEMORY_STORE).length, function (s, i) { return Object.keys(MEMORY_STORE)[i]; });

  // stable order: anonymous zone first, then signed-in zones alphabetically
  jobs.sort(function (a, b) {
    var za = a.ns === "anon" ? 0 : 1, zb = b.ns === "anon" ? 0 : 1;
    if (za !== zb) return za - zb;
    if (a.ns !== b.ns) return a.ns < b.ns ? -1 : 1;
    return a.coll < b.coll ? -1 : (a.coll > b.coll ? 1 : 0);
  });

  // 2) flatten into cloud writes, converting timestamps, sanitising ids
  var writes = [];
  var skipped = 0;
  function cloudValue(v) {
    if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    if (Array.isArray(v)) {
      var out = [];
      for (var i = 0; i < v.length; i++) out.push(cloudValue(v[i]));
      return out;
    }
    if (typeof v === "object") {
      if (v.__jts !== undefined && typeof v.__jts === "number") {
        var ms = v.__jts;
        return { __jts: ms }; // replaced with a real Timestamp at write time
      }
      var o = {};
      for (var k in v) {
        if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
        o[k] = cloudValue(v[k]);
      }
      return o;
    }
    return null;
  }
  function toCloudData(stored, fs) {
    var v = cloudValue(stored);
    return reviveTs(v, fs);
  }
  function reviveTs(v, fs) {
    if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    if (Array.isArray(v)) {
      var out = [];
      for (var i = 0; i < v.length; i++) out.push(reviveTs(v[i], fs));
      return out;
    }
    if (typeof v === "object") {
      if (v.__jts !== undefined && typeof v.__jts === "number") {
        var ms = v.__jts;
        return new fs.Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000);
      }
      var o = {};
      for (var k in v) {
        if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
        o[k] = reviveTs(v[k], fs);
      }
      return o;
    }
    return v;
  }
  function docIdSafe(id) {
    var s = String(id).replace(/\//g, "_");
    if (/^(__|\.*$)/.test(s) || !s) s = "d_" + s;
    return s;
  }
  for (var ji = 0; ji < jobs.length; ji++) {
    var job = jobs[ji];
    for (var di = 0; di < job.ids.length; di++) {
      var id = job.ids[di];
      var stored = job.docs[id];
      if (!stored || typeof stored !== "object") continue;
      try {
        if (JSON.stringify(stored).length > 900000) { skipped++; continue; }
      } catch (e0) { skipped++; continue; }
      writes.push({
        path: ["data", containerKey, nsSafe(job.ns), job.coll, docIdSafe(id)],
        data: stored
      });
    }
  }

  var total = writes.length;
  var done = 0;
  function say(n) {
    try {
      if (typeof onProgress === "function") onProgress({ done: n, total: total });
    } catch (e) {}
  }

  return bootCloudFirestore().then(function (h) {
    if (total === 0) return { h: h, collections: jobs.length, records: 0, skipped: skipped };
    say(0);
    var CHUNK = 5;
    function writeOne(w) {
      var docRef = h.fs.doc.apply(h.fs, [h.db].concat(w.path));
      return h.fs.setDoc(docRef, toCloudData(w.data, h.fs)).then(function () {
        done++;
        if (done % 10 === 0 || done === total) say(done);
      });
    }
    var p = Promise.resolve();
    for (var ci = 0; ci < writes.length; ci += CHUNK) {
      (function (start) {
        p = p.then(function () {
          var batch = [];
          for (var b = 0; b < CHUNK && start + b < writes.length; b++) batch.push(writeOne(writes[start + b]));
          return Promise.all(batch);
        });
      })(ci);
    }
    return p.then(function () {
      return { h: h, collections: jobs.length, records: total, skipped: skipped };
    });
  }).then(function (r) {
    // the run summary - latest run only, overwritten on every export
    var meta = {
      by: email,
      at: r.h.fs.serverTimestamp(),
      zones: jobs.map(function (j2) { return nsSafe(j2.ns); }).filter(function (v2, i2, a2) { return a2.indexOf(v2) === i2; }),
      collections: r.collections,
      records: r.records,
      skipped: r.skipped,
      note: "copied from this browser's Local Storage; ids preserved, re-export overwrites"
    };
    return r.h.fs.setDoc(r.h.fs.doc(r.h.db, "data", containerKey, "export", "_meta"), meta)
      .then(function () { return r; })
      .catch(function () { return r; }); // the summary must not fail the export
  }).then(function (r) {
    return {
      container: containerKey,
      zones: jobs.map(function (j3) { return nsSafe(j3.ns); }).filter(function (v3, i3, a3) { return a3.indexOf(v3) === i3; }),
      collections: r.collections,
      records: r.records,
      skipped: r.skipped
    };
  });
}

// ======================================================================
// SERVER CONFIG - hosting facts and the server handle SERVER/linker.js
// talks through. The data methods below are the LOCAL implementations.
// ======================================================================
export const SERVER_CONFIG = {
  active: DATABASE_PROJECT,
  hosting: {
    platform: "Vercel",
    outputDirectory: "public",
    runtimeModule: "/sidebar.js",
    buildLine: "node SERVER/sync.js",
    syncCommand: "node SERVER/sync.js",
    settingsSource: "SERVER/server.js",
    generatedFiles: [
      "vercel.json", "firebase.json", ".firebaserc",
      "firestore.rules", "apply-rules.sh", "public/sidebar.js"
    ]
  },
  rules: {
    file: "firestore.rules",
    publisher: "apply-rules.sh"
  },
  comments: {
    collection: "comments",
    owner: COMMENT_OWNER_EMAIL,
    note: "the one cloud feature: every visitor may send a comment, only the owner reads and deletes"
  },
  data: {
    engine: "browser Local Storage",
    zonePrefix: ZONE_PREFIX,
    anonymousZone: "anon",
    signedInZonePrefix: "u::"
  }
};

// The server handle SERVER/linker.js talks through: the same wiring, one
// object - info for the project, authApi for the optional Google identity,
// firestore for the LOCAL data calls.
export const server = {
  info: {
    name: "JAMALI",
    project: SERVER_CONFIG.active,
    authDomain: firebaseConfig.authDomain,
    runtime: SERVER_CONFIG.hosting.runtimeModule
  },
  // live getters: auth loads asynchronously, the object must follow it
  get auth() { return auth; },
  get provider() { return provider; },
  authApi: { onAuthStateChanged, signInWithPopup, signOut },
  comments: {
    owner: COMMENT_OWNER_EMAIL,
    send: commentSend,
    list: commentList,
    del: commentDelete,
    watch: commentWatch
  },
  db,
  firestore: {
    getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
    getDocs, getDoc, setDoc, writeBatch, query, where, orderBy,
    limit, onSnapshot, serverTimestamp, Timestamp,
    arrayUnion, arrayRemove, increment, deleteField
  }
};

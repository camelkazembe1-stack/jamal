/* JAMALI - public/sidebar.js, the ONE shared module at the web root.
 *
 * The five root scripts every page used to load separately now live in here
 * as sections, in this order:
 *
 *   1. THE 502 CORE (generated) - the runtime module every page imports:
 *      Google identity, the local data engine, the comment desk and the
 *      settings source. Machine-written from SERVER/server.js by
 *      node SERVER/sync.js between the JAMALI_502_BLOCK markers - edit
 *      the server, never the block.
 *   2. THE NAV BRIDGE - was public/jamali-bridge.js: bounces standalone
 *      routes into the root shell and drives every internal link through
 *      the shell, so no route path ever reaches the interface.
 *   3. THE MENU TREE - was public/menu.js: the family tree as data
 *      (window.JAMALI_MENU), one line per page.
 *   4. THE SIDEBAR - the renderer: draws the collapsible sidebar, the
 *      footer buttons and the comment desk wiring on every page.
 *   5. THE REGISTER PICKERS - was public/pickers.js: register names as you
 *      type in the party, product, employee and provider boxes.
 *   6. HOSPITAL MONEY IN THE BOOKS - was public/health-books.js: mirrors
 *      health billing, payments and insurance into the shared transactions.
 *
 * Every page loads exactly one script tag, <script type="module"
 * src="/sidebar.js">, and every page module imports its data layer from
 * this same file, so the browser downloads one shared script for the whole
 * system. The web root keeps only index.html (the shell) and this file -
 * plus 404.html, which the host itself serves for unknown routes and so
 * stays at the root.
 *
 * JAMALI_SHARED_MODULE_CONSOLIDATION_V1 (23 Nov 2026).
 */

/* ======================================================================
   THE 502 CORE - generated from SERVER/server.js by node SERVER/sync.js.
   Everything between the two JAMALI_502_BLOCK markers is written by the
   sync - do not edit here; edit SERVER/server.js and run the sync.
   ====================================================================== */
/* ==== JAMALI_502_BLOCK_BEGIN (generated from SERVER/server.js) ==== */
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
      // LOGIN NOT COMPULSORY (demand 25 Nov 2026): any visitor may send -
      // the database checks the letter's shape only (text only, 1-2000
      // chars) and takes the from line the popup sends ("Guest" when the
      // sender has no account). Reading the mailbox and removing comments
      // is still the signed-in owner's alone.
      allow create: if request.resource.data.get("text", "") is string
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

// commentSend - OPEN TO EVERY VISITOR (demand 25 Nov 2026: login is not
// compulsory to send a comment): the comment goes to the owner, a signed-in
// sender carries the account email as the from line, an anonymous sender
// goes down as "Guest". The write popup is the composer for everyone.
export function commentSend(text, pageRef) {
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
/* ==== JAMALI_502_BLOCK_END ==== */

/* ======================================================================
   BUSINESS ROLE CATALOG (25 Nov 2026) - one catalog everywhere. Staff
   Roles (399) picks roles from it, the Account Administration desk
   (380) applies its module templates, the login gate's staff-position
   list reads it, and the sidebar enforces it: role -> menu folders.
   IMPORTANT: this block sits OUTSIDE the JAMALI_502_BLOCK markers on
   purpose - the 502 core is regenerated from SERVER/server.js by
   SERVER/sync.js and would wipe anything placed inside it.
   Each template lists plain module folders (never wing rows): the
   enforcement half expands the set DOWN into every sub-page of a
   granted module and UP into the wing rows that keep the menu
   readable - never sideways into sibling modules. An empty
   Administrator template means every folder. Roles are the storage
   names (the 399 registry stores them verbatim) - never rename an
   entry, only add new ones at the end.
   ====================================================================== */
export const STAFF_ROLES = [
  "Administrator",
  "Doctor",
  "Nurse",
  "Midwife",
  "Pharmacist",
  "Lab technician",
  "Radiographer",
  "Receptionist",
  "Records officer",
  "Billing officer",
  "HR officer",
  "Store keeper",
  "Support services",
  "Viewer"
];

export const STAFF_ROLE_TEMPLATES = {
  "Administrator": [],
  "Doctor": [
    "victim-registration", "triage", "nurse-consultation",
    "doctor-consultation", "treatment-procedures", "patient-module",
    "patient-file", "referrals", "ward-management", "patient-admission",
    "patient-discharge", "laboratory", "radiology", "emergency-department",
    "icu-management", "surgery-theatre", "icd10", "telemedicine",
    "chronic-disease", "infection-control"
  ],
  "Nurse": [
    "victim-registration", "triage", "nurse-consultation",
    "patient-module", "patient-file", "ward-management", "patient-admission",
    "patient-discharge", "maternity-delivery", "antenatal-care",
    "paediatric-department", "immunisation", "emergency-department",
    "birth-certificates", "chronic-disease"
  ],
  "Midwife": [
    "victim-registration", "triage", "nurse-consultation",
    "patient-module", "patient-file", "ward-management", "patient-admission",
    "patient-discharge", "maternity-delivery", "antenatal-care",
    "birth-certificates", "emergency-department"
  ],
  "Pharmacist": [
    "pharmacy", "pharmacy-stock", "drug-interactions",
    "patient-module", "medical-supplies"
  ],
  "Lab technician": [
    "laboratory", "blood-bank", "patient-file"
  ],
  "Radiographer": [
    "radiology", "patient-file"
  ],
  "Receptionist": [
    "victim-registration", "triage", "patient-module",
    "patient-file", "referrals", "doctor-schedule", "birth-certificates",
    "death-certificates", "ambulance-transport"
  ],
  "Records officer": [
    "victim-registration", "patient-module", "patient-file",
    "icd10", "health-audit", "birth-certificates", "death-certificates"
  ],
  "Billing officer": [
    "hospital-billing", "hospital-payments", "health-insurance",
    "tariff-engine", "add-transaction", "view-file",
    "notification-center", "notification-settings"
  ],
  "HR officer": [
    "employees", "hospital-staff", "doctor-schedule",
    "staff-development", "staff-roles", "branches"
  ],
  "Store keeper": [
    "stock-management", "suppliers", "medical-supplies",
    "medical-equipment", "hospital-inventory",
    "notification-center", "notification-settings"
  ],
  "Support services": [
    "dietary-nutrition", "laundry-management", "housekeeping"
  ],
  "Viewer": [
    "patient-module", "hospital-reports"
  ]
};

// The template seeds for one role, or null when the role is not in the
// catalog. "Administrator" comes back as [] which callers must treat as
// "every folder" (never as "no folders").
export function roleTemplateFolders(role) {
  var t = STAFF_ROLE_TEMPLATES[String(role || "")];
  return t ? t.slice() : null;
}

/* ======================================================================
   CUSTOMER SERVICE & AUTOMATED NOTIFICATION ENGINE (25 Nov 2026)
   The demand: one centralized engine for every module - not one per
   module. It lives in the shell (this file) so it monitors in the
   background on every page of the zone:
     - stock levels crossing their registered minimum (stockItems),
     - money coming in (transactions, type IN),
     - invoices aging past their due date (invoices).
   When a condition is met it writes ONE record into the per-zone
   "notifications" collection (title, message, module, recipient,
   channels, delivery status, read flag) and three things light up at
   once: the bell at the top right of every page, the Business
   dashboard alert banner, and the Notification Center (411).

   Crossing detection (demand section 8): an alert fires when the
   stock level WORSENS (ok -> low -> critical -> out), never twice for
   the same level, and re-arms when stock is replenished above the
   minimum. The first snapshot after load is adopted silently, so a
   reload never replays old alerts. Per-event and per-channel toggles
   come from Notification Settings (412), stored per zone.

   Delivery: dashboard + in-app are always delivered; SMS and email
   are queued as ready-to-send texts - the Notification Center hands
   them to the phone's own SMS / email app (no external gateway
   needed); push uses the browser notification when permission was
   granted. Nothing here can break a page write: every step is
   guarded and the engine only ever appends notification records.
   ====================================================================== */

var NOTIFY_SETTINGS_LS = "jamaliNotifySettings::";
var NOTIFY_STATE_LS = "jamaliNotifyEngineState::";

export var NOTIFY_EVENTS = [
  { key: "lowStock", label: "Low-stock alert", hint: "Fires when a stock reaches its Low Units level." },
  { key: "outOfStock", label: "Out-of-stock alert", hint: "Fires when a stock runs out of units." },
  { key: "payment", label: "Payment received", hint: "Fires when money comes in (Sales, Purchases Returns)." },
  { key: "overdueInvoice", label: "Invoice overdue", hint: "Fires when an invoice passes its due date unpaid." }
];
export var NOTIFY_CHANNELS = [
  { key: "dashboard", label: "Dashboard banner" },
  { key: "inApp", label: "In-app bell" },
  { key: "sms", label: "SMS (queued to phone)" },
  { key: "email", label: "Email (queued)" },
  { key: "push", label: "Browser push" }
];
var NOTIFY_LEVEL_META = {
  low:      { icon: "\u26A0\uFE0F", label: "Low", cls: "jnt-low" },
  critical: { icon: "\u26D4", label: "Critical", cls: "jnt-critical" },
  out:      { icon: "\u{1F6AB}", label: "Out of stock", cls: "jnt-out" },
  payment:  { icon: "\u{1F4B5}", label: "Payment", cls: "jnt-payment" },
  invoice:  { icon: "\u{1F9FE}", label: "Invoice", cls: "jnt-invoice" },
  info:     { icon: "\u{1F514}", label: "Info", cls: "jnt-info" }
};
var NOTIFY_DEFAULTS = {
  lowStock: true, outOfStock: true, payment: true, overdueInvoice: true,
  dashboard: true, inApp: true, sms: true, email: false, push: false,
  phone: "", email: ""
};

function notifyZoneKey(prefix) {
  return prefix + currentNamespace();
}

export function getNotifySettings() {
  var base = {};
  for (var k in NOTIFY_DEFAULTS) base[k] = NOTIFY_DEFAULTS[k];
  try {
    var raw = window.localStorage.getItem(notifyZoneKey(NOTIFY_SETTINGS_LS));
    if (raw) {
      var saved = JSON.parse(raw) || {};
      for (var k2 in base) if (saved[k2] !== undefined) base[k2] = saved[k2];
    }
  } catch (e) { /* defaults survive a bad read */ }
  if (!base.email && activeUser && activeUser.email) base.email = activeUser.email;
  return base;
}

export function saveNotifySettings(patch) {
  var cur = getNotifySettings();
  for (var k in patch) if (NOTIFY_DEFAULTS[k] !== undefined) cur[k] = patch[k];
  try { window.localStorage.setItem(notifyZoneKey(NOTIFY_SETTINGS_LS), JSON.stringify(cur)); } catch (e) {}
  return cur;
}

function notifyEngineState() {
  try {
    return JSON.parse(window.localStorage.getItem(notifyZoneKey(NOTIFY_STATE_LS)) || "{}") || {};
  } catch (e) { return {}; }
}
function notifySaveState(st) {
  try { window.localStorage.setItem(notifyZoneKey(NOTIFY_STATE_LS), JSON.stringify(st)); } catch (e) {}
}

// One notification record into the per-zone collection - the same
// direct store path the health audit uses, so the engine can never
// collide with a page that is mid-write. Duplicate protection: a
// record with the same dedupKey is never written twice.
function notifyWrite(rec) {
  try {
    var ns = currentNamespace();
    var map = loadColl(ns, "notifications");
    for (var id in map) {
      if (map[id] && map[id].dedupKey === rec.dedupKey) return false;
    }
    var store = {};
    for (var k in rec) store[k] = rec[k];
    store.createdAt = { __jts: Date.now() };
    store.read = false;
    map[newLocalId()] = packValue(store);
    saveColl(ns, "notifications");
    notifyCollection("notifications");
    return true;
  } catch (e) { return false; }
}

function notifyDeliver(rec) {
  var settings = getNotifySettings();
  rec.smsText = rec.message;
  rec.recipient = settings.email || (activeUser && activeUser.email) || "";
  rec.phone = settings.phone || "";
  rec.delivery = {
    dashboard: settings.dashboard ? "delivered" : "off",
    inApp: settings.inApp ? "delivered" : "off",
    sms: settings.sms ? "queued" : "off",
    email: settings.email ? "queued" : "off",
    push: settings.push && typeof window !== "undefined" && window.Notification &&
          Notification.permission === "granted" ? "sent" : (settings.push ? "queued" : "off")
  };
  rec.channels = [];
  for (var i = 0; i < NOTIFY_CHANNELS.length; i++) {
    var c = NOTIFY_CHANNELS[i].key;
    if (rec.delivery[c] === "delivered" || rec.delivery[c] === "queued" || rec.delivery[c] === "sent") {
      rec.channels.push(c);
    }
  }
  var wrote = notifyWrite(rec);
  if (wrote && rec.delivery.push === "sent") {
    try { new Notification(rec.title, { body: rec.message }); } catch (e) { /* stay sent-recorded */ }
  }
  return wrote;
}

// ---- stock crossing detection -----------------------------------------
var NOTIFY_LEVEL_RANK = { ok: 3, low: 2, critical: 1, out: 0 };
function notifyStockLevel(units, min) {
  var m = Number(min) || 0;
  if (!(m > 0)) return "ok";               // no Low Units set -> not monitored
  var u = Number(units) || 0;
  if (u <= 0) return "out";
  if (u === m) return "low";
  if (u < m) return "critical";
  return "ok";
}
function notifyStockMessage(name, units, min, level) {
  var u = Number(units) || 0, m = Number(min) || 0;
  if (level === "low")
    return "LOW STOCK ALERT: Your " + name + " stock has reached its minimum level of " + m +
           " units. " + u + " unit(s) remain. Please restock.";
  if (level === "critical")
    return "CRITICAL STOCK ALERT: Your " + name + " stock has dropped below its minimum level of " +
           m + " units. Only " + u + " unit(s) remain. Restock soon.";
  return "OUT OF STOCK ALERT: Your " + name + " stock has run out. 0 units remain - restock immediately.";
}

function notifyEvaluateStocks(rows) {
  var st = notifyEngineState();
  st.stock = st.stock || {};
  var changed = false;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var id = String(r.id || "");
    if (!id) continue;
    var min = Number(r.minUnits || 0);
    var level = notifyStockLevel(r.units, min);
    var prev = st.stock[id];
    if (!prev || prev.min !== min || level === "ok") {
      // first sight, edited threshold, or re-arm above the minimum:
      // adopt silently - the epoch increments so the next descent
      // fires a fresh alert instead of hitting the old dedup key.
      st.stock[id] = {
        level: level, min: min,
        epoch: prev ? ((prev.epoch || 0) + (level === "ok" && prev.level !== "ok" ? 1 : 0)) : 0
      };
      changed = true;
      continue;
    }
    if (NOTIFY_LEVEL_RANK[level] < NOTIFY_LEVEL_RANK[prev.level]) {
      var settings = getNotifySettings();
      var enabled = level === "out" ? settings.outOfStock : settings.lowStock;
      if (enabled) {
        notifyDeliver({
          title: (level === "out" ? "Out of stock - " : level === "low" ? "Low stock - " : "Critical stock - ") + r.name,
          message: notifyStockMessage(r.name, r.units, min, level),
          module: "Stock Management", level: level,
          dedupKey: "stock:" + id + ":" + level + ":" + (prev.epoch || 0)
        });
      }
      st.stock[id] = { level: level, min: min, epoch: prev.epoch || 0 };
      changed = true;
    }
  }
  if (changed) notifySaveState(st);
}

// ---- payments ----------------------------------------------------------
function notifyEvaluateTx(rows) {
  var st = notifyEngineState();
  st.txSeen = st.txSeen || [];
  var seen = {};
  for (var s = 0; s < st.txSeen.length; s++) seen[st.txSeen[s]] = true;
  if (!st.txPrimed) {
    // First snapshot ever (or after a storage reset): adopt the whole
    // history silently so a fresh browser never replays old payments.
    st.txPrimed = true;
    for (var p = 0; p < rows.length; p++) {
      if (!seen[rows[p].id]) { seen[rows[p].id] = true; st.txSeen.push(rows[p].id); }
    }
    notifySaveState(st);
    return;
  }
  var settings = getNotifySettings();
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (seen[r.id]) continue;
    seen[r.id] = true;
    st.txSeen.push(r.id);
    if (settings.payment && String(r.transactionType) === "IN" && Number(r.amount) > 0) {
      notifyDeliver({
        title: "Payment received",
        message: "PAYMENT RECEIVED: " + (r.transactionName || "transaction") + " of " +
                 (Number(r.amount) || 0).toLocaleString("en-US") +
                 (r.flowMethod && r.flowMethod !== "N/A" ? " via " + r.flowMethod : "") +
                 (r.name ? " - " + r.name : "") + ".",
        module: "Transactions", level: "payment", dedupKey: "tx:" + r.id
      });
    }
  }
  if (st.txSeen.length > 400) st.txSeen = st.txSeen.slice(-400);
  notifySaveState(st);
}

// ---- invoices turning overdue ------------------------------------------
function notifyOverdueOf(r) {
  if (String(r.status) === "Cancelled") return false;
  var bal = Math.max(0, (Number(r.total) || 0) - (Number(r.paidAmount) || 0));
  if (!(bal > 0.009)) return false;
  if (!r.dueDate) return false;
  var due = new Date(String(r.dueDate) + "T00:00:00");
  if (isNaN(due.getTime())) return false;
  var t0 = new Date(); t0.setHours(0, 0, 0, 0);
  return due < t0;
}

function notifyEvaluateInvoices(rows) {
  var st = notifyEngineState();
  st.invNotified = st.invNotified || [];
  var not = {};
  for (var s = 0; s < st.invNotified.length; s++) not[st.invNotified[s]] = true;
  var prime = !st.invPrimed;
  st.invPrimed = true;
  var settings = getNotifySettings();
  var fired = false;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!notifyOverdueOf(r) || not[r.id]) continue;
    not[r.id] = true;
    st.invNotified.push(r.id);
    // An invoice already overdue when first seen is adopted silently;
    // one that ages past its due date while the zone is alive fires.
    if (!prime && settings.overdueInvoice) {
      var bal = Math.max(0, (Number(r.total) || 0) - (Number(r.paidAmount) || 0));
      notifyDeliver({
        title: "Invoice overdue - " + (r.invNo || r.id),
        message: "INVOICE OVERDUE: " + (r.invNo || "invoice") + " for " + (r.party || "customer") +
                 " - " + bal.toLocaleString("en-US") + " outstanding, was due " + String(r.dueDate) + ".",
        module: String(r.direction) === "purchase" ? "Purchase Invoice" : "Sales Invoice",
        level: "invoice", dedupKey: "inv:" + r.id
      });
      fired = true;
    }
  }
  if (st.invNotified.length > 400) st.invNotified = st.invNotified.slice(-400);
  notifySaveState(st);
  return fired;
}

function notifyRowsOf(snap) {
  return (snap.docs || []).map(function (d) {
    var r = d.data({ serverTimestamps: "estimate" }) || {};
    r.id = d.id;
    return r;
  });
}

// ---- the engine itself --------------------------------------------------
var NOTIFY_STARTED = false;
function startNotifyEngine() {
  if (NOTIFY_STARTED) return;
  NOTIFY_STARTED = true;
  try {
    onSnapshot(collection(db, "stockItems"), function (snap) {
      notifyEvaluateStocks(notifyRowsOf(snap));
    });
    onSnapshot(collection(db, "transactions"), function (snap) {
      notifyEvaluateTx(notifyRowsOf(snap));
    });
    onSnapshot(collection(db, "invoices"), function (snap) {
      notifyEvaluateInvoices(notifyRowsOf(snap));
    });
    // Invoices also age while nothing is written: re-scan every hour
    // and every time the tab becomes visible again.
    var rescan = function () {
      try { getDocs(collection(db, "invoices")).then(function (snap) {
        notifyEvaluateInvoices(notifyRowsOf(snap));
      }).catch(function () {}); } catch (e) {}
    };
    setInterval(rescan, 60 * 60 * 1000);
    if (typeof document !== "undefined" && document.addEventListener) {
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) rescan();
      });
    }
  } catch (e) { /* the engine must never break the shell */ }
}

export function notifyTest() {
  return notifyDeliver({
    title: "Test notification",
    message: "TEST: Jamal notifications are working. If SMS or email is enabled, this text is queued in the Notification Center outbox.",
    module: "Notification Center", level: "info",
    dedupKey: "test:" + Date.now()
  });
}

export function notifySmsUri(phone, text) {
  return "sms:" + String(phone || "").replace(/[^0-9+]/g, "") +
         "?body=" + encodeURIComponent(text || "");
}

export function notifyUnreadCount() {
  try {
    var map = loadColl(currentNamespace(), "notifications");
    var n = 0;
    for (var id in map) if (map[id] && !map[id].read) n++;
    return n;
  } catch (e) { return 0; }
}


/* ======================================================================
   THE NAV BRIDGE - was public/jamali-bridge.js, unchanged.
   ====================================================================== */
/* JAMALI - public/jamali-bridge.js, the internal navigation bridge.
 *
 * Every page loads this script in its head. It makes the whole app live
 * inside the root URL (https://jamal-mu-gold.vercel.app/):
 *
 *   1. A page opened on its own address (a typed or bookmarked route)
 *      bounces straight back to the root shell, which reopens the page
 *      inside itself - so the address bar only ever shows the root.
 *   2. Inside the shell, every internal link has its href removed and is
 *      driven through a postMessage to the shell instead. With no href
 *      there is nothing to show at the bottom of the browser when a link
 *      is hovered, and no route path is ever handed to the interface.
 *   3. Tooltips and titles that contained a route path are scrubbed.
 *
 * Real page addresses still exist internally (the iframe keeps using
 * /slug/number.html), so every feature that reads location.pathname,
 * query strings or hashes keeps working exactly as before - the routes
 * just never reach the user's interface.
 */
(function () {
  "use strict";

  var HOME = "/home/1.html";
  var BOOT_KEY = "JAMALI_BOOT_PAGE";
  var LAST_KEY = "JAMALI_LAST_PAGE";

  var framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }

  /* Normalise an internal target. Returns null for anything that is not
   * an app route (external URLs, blobs, downloads, in-page hashes), so
   * those keep their normal browser behaviour. App routes come back in
   * their full /slug/number.html form, because the pages are plain
   * static files - the routes stay internal, the files are real. */
  function norm(target) {
    var t = String(target == null ? "" : target).trim();
    if (!t) return null;
    if (t.charAt(0) === "#") return null;
    if (/^(https?:)?\/\//i.test(t)) return null;
    if (/^(mailto|tel|sms|blob|data|javascript|about|file):/i.test(t)) return null;
    if (t === "/" || t === "/index.html") return HOME;
    if (t.charAt(0) !== "/") return null;
    if (/^\/RESERVE(\/|$)/i.test(t)) return null; /* admin panel stays standalone */
    var m = t.match(/^([^?#]*)([?#].*)?$/);
    if (!m) return null;
    var path = m[1].replace(/\/+$/, "");
    var rest = m[2] || "";
    if (!path) return HOME;
    if (!/\.html$/i.test(path)) path += ".html";
    return path + rest;
  }

  /* 1) Standalone pages bounce into the root shell. */
  if (!framed) {
    try {
      var here = location.pathname + (location.search || "") + (location.hash || "");
      sessionStorage.setItem(BOOT_KEY, here || "/");
      sessionStorage.removeItem(LAST_KEY);
    } catch (e) {}
    location.replace("/");
    return;
  }

  /* 2) Inside the shell: internal links lose their href and navigate
   *    through the shell, so no route path shows at the bottom. */
  function scrubTitle(el) {
    var ti = el.getAttribute && el.getAttribute("title");
    if (!ti) return;
    if (/\/[a-z0-9-]+\/\d+/i.test(ti)) {
      var clean = ti.replace(/\s*[|·•\-–—]?\s*\/[a-z0-9-]+\/\d+(\.html)?/gi, "").trim();
      if (clean !== ti) el.setAttribute("title", clean);
    }
  }

  function neutralize(a) {
    var href = a.getAttribute("href");
    if (href == null) return;
    var t = norm(href);
    if (t == null) return;
    if (a.hasAttribute("download")) return; /* real file downloads stay real */
    a.setAttribute("data-jamal-target", t);
    a.removeAttribute("href");
    a.removeAttribute("target");
    /* no href means no keyboard focus any more - keep the link usable */
    a.setAttribute("tabindex", "0");
    a.setAttribute("role", "link");
    if (!a.style.cursor) a.style.cursor = "pointer";
    scrubTitle(a);
  }

  function scan(node) {
    /* node may be a document (nodeType 9) or an element (nodeType 1) -
     * scan(document) at boot and on DOMContentLoaded/load must scan the
     * whole page, so only null is rejected here (the document node used
     * to be silently skipped, leaving every static page link unhandled). */
    if (!node) return;
    if (node.nodeType === 1 && node.tagName === "A") neutralize(node);
    if (node.querySelectorAll) {
      var list = node.querySelectorAll("a[href]");
      for (var i = 0; i < list.length; i++) neutralize(list[i]);
    }
  }

  function linkFrom(ev) {
    var el = ev.target;
    while (el && el.nodeType === 1 && el.tagName !== "A") el = el.parentNode;
    return el && el.nodeType === 1 && el.tagName === "A" ? el : null;
  }

  function go(el) {
    var t = el.getAttribute("data-jamal-target");
    if (t == null) return false;
    /* The pages' back links ("<- Home", "<- Health", ...) go back ONE
     * step over the shell's page stack - the page the user was on before
     * this one - instead of jumping straight to the hub they point at.
     * When the shell has no earlier step, it falls back to the hub.
     * A stale shell (cached before this demand) ignores JAMALI_BACK; the
     * timer below then navigates to the hub through JAMALI_NAV, so the
     * link still always works - it just moves like the old build. */
    var back = !!(el.classList && el.classList.contains("back"));
    try {
      window.parent.postMessage(
        { type: back ? "JAMALI_BACK" : "JAMALI_NAV", target: t },
        location.origin
      );
    } catch (e) {
      location.replace(t);
      return true;
    }
    if (back) {
      setTimeout(function () {
        try {
          window.parent.postMessage({ type: "JAMALI_NAV", target: t }, location.origin);
        } catch (e2) {
          location.replace(t);
        }
      }, 450);
    }
    return true;
  }

  document.addEventListener("click", function (ev) {
    var a = linkFrom(ev);
    if (!a || a.getAttribute("data-jamal-target") == null) return;
    if (ev.defaultPrevented) return;
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) {
      ev.preventDefault(); /* even middle/modified clicks stay inside */
      return;
    }
    ev.preventDefault();
    go(a);
  }, true);

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" && ev.key !== " " && ev.key !== "Spacebar") return;
    var a = linkFrom(ev);
    if (!a || a.getAttribute("data-jamal-target") == null) return;
    ev.preventDefault();
    go(a);
  }, true);

  document.addEventListener("auxclick", function (ev) {
    var a = linkFrom(ev);
    if (!a || a.getAttribute("data-jamal-target") == null) return;
    ev.preventDefault();
    go(a);
  }, true);

  /* Context menu has no href to copy any more; keep the menu itself. */

  scan(document);
  document.addEventListener("DOMContentLoaded", function () { scan(document); });
  window.addEventListener("load", function () { scan(document); });

  if (window.MutationObserver) {
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var add = muts[i].addedNodes;
        for (var j = 0; j < add.length; j++) scan(add[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  /* Handy for page scripts that want to move internally by hand. */
  window.JAMALI_INTERNAL_GO = function (target) {
    var t = norm(target);
    if (!t) return false;
    try {
      window.parent.postMessage({ type: "JAMALI_NAV", target: t }, location.origin);
    } catch (e) {
      location.replace(t);
    }
    return true;
  };
})();

/* ======================================================================
   THE MENU TREE - was public/menu.js, unchanged (window.JAMALI_MENU).
   ====================================================================== */
 
window.JAMALI_MENU = [
    { label: "Home", icon: "🏠", folder: "home", n: 1, d: 0 },
    // RESERVE (23 Nov 2026): the Organisation Settings entry left the
    // menu tree and the Home grid - the settings gear in the footer row
    // (1/4, next to the Login/Logout button's 3/4) opens the
    // organisation settings panel instead.
    // RETURNED (demand 24 Nov 2026): the "Account Administration" entry
    // is back - it is painted for camelkazembe1@gmail.com only (the
    // folderAllowed gate below hides it from every other visitor), and
    // the Home grid keeps skipping the system-admin folder as before.
    { label: "Account Administration", icon: "🛡️", folder: "system-admin", n: 380, d: 0 },
    { label: "Business", icon: "🏢", folder: "business", n: 2, d: 1 },
    { label: "Stock Management", icon: "📦", folder: "stock-management", n: 349, d: 2 },
    { label: "Stock Register", icon: "📋", folder: "stock-register", n: 348, d: 3 },
    { label: "Stock Progress", icon: "📈", folder: "stock-progress", n: 347, d: 3 },
    { label: "Stock Change", icon: "🔄", folder: "stock-change", n: 346, d: 3 },
    { label: "Notification Center", icon: "🔔", folder: "notification-center", n: 411, d: 2 },
    { label: "Customers", icon: "👤", folder: "customers", n: 392, d: 2 },
    { label: "Suppliers", icon: "🏭", folder: "suppliers", n: 393, d: 2 },
    { label: "Employees", icon: "🧑‍💼", folder: "employees", n: 394, d: 2 },
    { label: "Add Transaction", icon: "🧾", folder: "add-transaction", n: 3, d: 2 },
    { label: "View File", icon: "📄", folder: "view-file", n: 4, d: 2 },
    { label: "All Transactions", icon: "📊", folder: "all-transactions", n: 5, d: 3 },
    { label: "Cash Book", icon: "📒", folder: "cash-book-single", n: 15, d: 3 },
    { label: "Double Column Cash Book", icon: "📕", folder: "cash-book", n: 6, d: 3 },
    { label: "Petty Cash Book", icon: "🪙", folder: "petty-cash", n: 7, d: 3 },
    { label: "Sales Journal", icon: "🛍️", folder: "sales-journal", n: 8, d: 3 },
    { label: "Purchases Journal", icon: "🛒", folder: "purchases-journal", n: 9, d: 3 },
    { label: "Sales Returns", icon: "↩️", folder: "sales-returns", n: 10, d: 3 },
    { label: "Purchases Returns", icon: "↪️", folder: "purchases-returns", n: 11, d: 3 },
    { label: "General Journal", icon: "📓", folder: "general-journal", n: 12, d: 3 },
    { label: "Cash Receipts", icon: "💵", folder: "cash-receipts", n: 13, d: 3 },
    { label: "Cash Payments", icon: "💸", folder: "cash-payments", n: 14, d: 3 },
    { label: "Creditors Book", icon: "🏦", folder: "creditors-book", n: 16, d: 3 },
    { label: "Debtors Book", icon: "🤝", folder: "debtors-book", n: 17, d: 3 },
    { label: "Ledger", icon: "📘", folder: "ledger", n: 18, d: 3 },
    { label: "Bills Receivable", icon: "📥", folder: "bills-receivable", n: 19, d: 3 },
    { label: "Bills Payable", icon: "📤", folder: "bills-payable", n: 20, d: 3 },
    { label: "Sales Order Book", icon: "📋", folder: "sales-order-book", n: 21, d: 3 },
    { label: "Purchase Order Book", icon: "🛒", folder: "purchase-order-book", n: 22, d: 3 },
    { label: "Sales Invoice", icon: "🧾", folder: "sales-invoice", n: 23, d: 3 },
    { label: "Purchase Invoice", icon: "🧾", folder: "purchase-invoice", n: 24, d: 3 },
    { label: "GRN Register", icon: "📦", folder: "grn-register", n: 25, d: 3 },
    { label: "Dispatch Register", icon: "🚚", folder: "dispatch-register", n: 26, d: 3 },
    { label: "Sales Invoice Register", icon: "🧾", folder: "sales-invoice-register", n: 27, d: 3 },
    { label: "Purchase Invoice Register", icon: "🧾", folder: "purchase-invoice-register", n: 28, d: 3 },
    { label: "Debit Note Register", icon: "↩️", folder: "debit-note-register", n: 29, d: 3 },
    { label: "Credit Note Register", icon: "↪️", folder: "credit-note-register", n: 30, d: 3 },
    { label: "Stock Movement", icon: "📊", folder: "stock-movement", n: 31, d: 3 },
    { label: "Fixed Assets", icon: "🏗️", folder: "fixed-assets", n: 32, d: 3 },
    { label: "Depreciation", icon: "📉", folder: "depreciation", n: 33, d: 3 },
    { label: "Payroll", icon: "👥", folder: "payroll", n: 34, d: 3 },
    { label: "Employee Advance", icon: "💵", folder: "employee-advance", n: 35, d: 3 },
    { label: "Petty Cash Voucher", icon: "🪙", folder: "petty-cash-voucher", n: 36, d: 3 },
    { label: "Receipt Voucher", icon: "🧾", folder: "receipt-voucher", n: 37, d: 3 },
    { label: "Payment Voucher", icon: "💳", folder: "payment-voucher", n: 38, d: 3 },
    { label: "Cheque Register", icon: "🏦", folder: "cheque-register", n: 39, d: 3 },
    { label: "Delivery Note", icon: "📬", folder: "delivery-note", n: 40, d: 3 },
    { label: "Trial Balance", icon: "⚖️", folder: "trial-balance", n: 41, d: 3 },
    { label: "Adjusted Trial Balance", icon: "🧮", folder: "adjusted-trial-balance", n: 42, d: 3 },
    { label: "Post-Closing Trial Balance", icon: "🔒", folder: "post-closing-trial-balance", n: 43, d: 3 },
    { label: "Income Statement", icon: "📊", folder: "income-statement", n: 345, d: 3 },
    { label: "Balance Sheet", icon: "🏛️", folder: "balance-sheet", n: 344, d: 3 },
    { label: "AR Schedule", icon: "🤝", folder: "ar-schedule", n: 44, d: 3 },
    { label: "AP Schedule", icon: "🏦", folder: "ap-schedule", n: 45, d: 3 },
    { label: "Inventory Valuation", icon: "🏷️", folder: "inventory-valuation", n: 46, d: 3 },
    { label: "Fixed Assets Schedule", icon: "🏛️", folder: "fixed-assets-schedule", n: 47, d: 3 },
    { label: "Accumulated Depreciation", icon: "📚", folder: "accumulated-depreciation", n: 48, d: 3 },
    { label: "Accrued Expenses", icon: "⏰", folder: "accrued-expenses", n: 49, d: 3 },
    { label: "Prepaid Expenses", icon: "⏳", folder: "prepaid-expenses", n: 50, d: 3 },
    { label: "Accrued Income", icon: "💰", folder: "accrued-income", n: 51, d: 3 },
    { label: "Unearned Revenue", icon: "🎁", folder: "unearned-revenue", n: 52, d: 3 },
    { label: "Bank Reconciliation", icon: "🏧", folder: "bank-reconciliation", n: 53, d: 3 },
    { label: "Suspense Account", icon: "🌀", folder: "suspense-account", n: 54, d: 3 },
    { label: "General Ledger Report", icon: "📗", folder: "general-ledger-report", n: 55, d: 3 },
    { label: "AR Report", icon: "🤝", folder: "ar-report", n: 56, d: 3 },
    { label: "AP Report", icon: "🏦", folder: "ap-report", n: 57, d: 3 },
    { label: "Customer Statement", icon: "📄", folder: "customer-statement", n: 58, d: 3 },
    { label: "Supplier Statement", icon: "📃", folder: "supplier-statement", n: 59, d: 3 },
    { label: "Aged Receivables", icon: "📆", folder: "aged-receivables", n: 60, d: 3 },
    { label: "Aged Payables", icon: "🗓️", folder: "aged-payables", n: 61, d: 3 },
    { label: "Computer", icon: "🖥️", folder: "computer", n: 62, d: 1 },
    { label: "Convertor", icon: "🔄", folder: "convertor", n: 63, d: 2 },
    { label: "Merge Files", icon: "🧩", folder: "file-merge", n: 339, d: 2 },
    { label: "Split File", icon: "✂️", folder: "file-split", n: 329, d: 2 },
  
  
  
  
  
  
    { label: "Text to PDF", icon: "📄", folder: "text-to-pdf", n: 65, d: 3 },
    { label: "PDF to Text", icon: "📄", folder: "pdf-to-text", n: 66, d: 3 },
    { label: "Text to Word", icon: "📄", folder: "text-to-word", n: 67, d: 3 },
    { label: "Word to Text", icon: "📄", folder: "word-to-text", n: 68, d: 3 },
    { label: "Text to HTML", icon: "📄", folder: "text-to-html", n: 69, d: 3 },
    { label: "HTML to Text", icon: "📄", folder: "html-to-text", n: 70, d: 3 },
    { label: "Text to Markdown", icon: "📄", folder: "text-to-markdown", n: 71, d: 3 },
    { label: "Markdown to Text", icon: "📄", folder: "markdown-to-text", n: 72, d: 3 },
    { label: "Markdown to PDF", icon: "📄", folder: "markdown-to-pdf", n: 73, d: 3 },
    { label: "PDF to Markdown", icon: "📄", folder: "pdf-to-markdown", n: 74, d: 3 },
    { label: "Text to RTF", icon: "📄", folder: "text-to-rtf", n: 75, d: 3 },
    { label: "RTF to Text", icon: "📄", folder: "rtf-to-text", n: 76, d: 3 },
    { label: "Text to CSV", icon: "📄", folder: "text-to-csv", n: 77, d: 3 },
    { label: "CSV to Text", icon: "📄", folder: "csv-to-text", n: 78, d: 3 },
    { label: "Text to XML", icon: "📄", folder: "text-to-xml", n: 79, d: 3 },
    { label: "XML to Text", icon: "📄", folder: "xml-to-text", n: 80, d: 3 },
    { label: "Text to JSON", icon: "📄", folder: "text-to-json", n: 81, d: 3 },
    { label: "JSON to Text", icon: "📄", folder: "json-to-text", n: 82, d: 3 },
    { label: "Text to YAML", icon: "📄", folder: "text-to-yaml", n: 83, d: 3 },
    { label: "YAML to Text", icon: "📄", folder: "yaml-to-text", n: 84, d: 3 },
    { label: "Word to PDF", icon: "📕", folder: "word-to-pdf", n: 85, d: 3 },
    { label: "PDF to Word", icon: "📕", folder: "pdf-to-word", n: 86, d: 3 },
    { label: "Excel to PDF", icon: "📕", folder: "excel-to-pdf", n: 87, d: 3 },
    { label: "PDF to Excel", icon: "📕", folder: "pdf-to-excel", n: 88, d: 3 },
    { label: "PowerPoint to PDF", icon: "📕", folder: "powerpoint-to-pdf", n: 89, d: 3 },
    { label: "PDF to PowerPoint", icon: "📕", folder: "pdf-to-powerpoint", n: 90, d: 3 },
    { label: "Image to PDF", icon: "📕", folder: "image-to-pdf", n: 91, d: 3 },
    { label: "PDF to Image", icon: "📕", folder: "pdf-to-image", n: 92, d: 3 },
    { label: "HTML to PDF", icon: "📕", folder: "html-to-pdf", n: 93, d: 3 },
    { label: "PDF to HTML", icon: "📕", folder: "pdf-to-html", n: 94, d: 3 },
    { label: "PDF Merge", icon: "📕", folder: "pdf-merge", n: 95, d: 3 },
    { label: "PDF Split", icon: "📕", folder: "pdf-split", n: 96, d: 3 },
    { label: "PDF Compress", icon: "📕", folder: "pdf-compress", n: 97, d: 3 },
    { label: "PDF Rotate", icon: "📕", folder: "pdf-rotate", n: 98, d: 3 },
    { label: "PDF Crop", icon: "📕", folder: "pdf-crop", n: 99, d: 3 },
    { label: "PDF Delete Pages", icon: "📕", folder: "pdf-delete-pages", n: 100, d: 3 },
    { label: "PDF Extract Pages", icon: "📕", folder: "pdf-extract-pages", n: 101, d: 3 },
    { label: "PDF Reorder Pages", icon: "📕", folder: "pdf-reorder-pages", n: 102, d: 3 },
    { label: "PDF Add Page Numbers", icon: "📕", folder: "pdf-add-page-numbers", n: 103, d: 3 },
    { label: "PDF Add Watermark", icon: "📕", folder: "pdf-add-watermark", n: 104, d: 3 },
    { label: "PDF Protect", icon: "📕", folder: "pdf-protect", n: 105, d: 3 },
    { label: "PDF Unlock", icon: "📕", folder: "pdf-unlock", n: 106, d: 3 },
    { label: "PDF Sign", icon: "📕", folder: "pdf-sign", n: 107, d: 3 },
    { label: "PDF Fill Forms", icon: "📕", folder: "pdf-fill-forms", n: 108, d: 3 },
    { label: "PDF Flatten", icon: "📕", folder: "pdf-flatten", n: 109, d: 3 },
    { label: "PDF Compare", icon: "📕", folder: "pdf-compare", n: 110, d: 3 },
    { label: "PDF Repair", icon: "📕", folder: "pdf-repair", n: 111, d: 3 },
    { label: "PDF Metadata Editor", icon: "📕", folder: "pdf-metadata-editor", n: 112, d: 3 },
    { label: "PDF to PDF/A", icon: "📕", folder: "pdf-to-pdf-a", n: 113, d: 3 },
    { label: "OCR PDF", icon: "📕", folder: "ocr-pdf", n: 114, d: 3 },
    { label: "DOC to DOCX", icon: "📘", folder: "doc-to-docx", n: 115, d: 3 },
    { label: "DOCX to DOC", icon: "📘", folder: "docx-to-doc", n: 116, d: 3 },
    { label: "DOCX to PDF", icon: "📘", folder: "docx-to-pdf", n: 117, d: 3 },
    { label: "PDF to DOCX", icon: "📘", folder: "pdf-to-docx", n: 118, d: 3 },
    { label: "DOCX to TXT", icon: "📘", folder: "docx-to-txt", n: 119, d: 3 },
    { label: "TXT to DOCX", icon: "📘", folder: "txt-to-docx", n: 120, d: 3 },
    { label: "DOCX to HTML", icon: "📘", folder: "docx-to-html", n: 121, d: 3 },
    { label: "HTML to DOCX", icon: "📘", folder: "html-to-docx", n: 122, d: 3 },
    { label: "DOCX to RTF", icon: "📘", folder: "docx-to-rtf", n: 123, d: 3 },
    { label: "RTF to DOCX", icon: "📘", folder: "rtf-to-docx", n: 124, d: 3 },
    { label: "DOCX to Markdown", icon: "📘", folder: "docx-to-markdown", n: 125, d: 3 },
    { label: "Markdown to DOCX", icon: "📘", folder: "markdown-to-docx", n: 126, d: 3 },
    { label: "DOCX to ODT", icon: "📘", folder: "docx-to-odt", n: 127, d: 3 },
    { label: "ODT to DOCX", icon: "📘", folder: "odt-to-docx", n: 128, d: 3 },
    { label: "DOCX to EPUB", icon: "📘", folder: "docx-to-epub", n: 129, d: 3 },
    { label: "EPUB to DOCX", icon: "📘", folder: "epub-to-docx", n: 130, d: 3 },
    { label: "Excel to CSV", icon: "📊", folder: "excel-to-csv", n: 131, d: 3 },
    { label: "CSV to Excel", icon: "📊", folder: "csv-to-excel", n: 132, d: 3 },
    { label: "PDF to Excel", icon: "📊", folder: "pdf-to-excel-2", n: 134, d: 3 },
    { label: "XLS to XLSX", icon: "📊", folder: "xls-to-xlsx", n: 135, d: 3 },
    { label: "XLSX to XLS", icon: "📊", folder: "xlsx-to-xls", n: 136, d: 3 },
    { label: "XLSX to ODS", icon: "📊", folder: "xlsx-to-ods", n: 137, d: 3 },
    { label: "ODS to XLSX", icon: "📊", folder: "ods-to-xlsx", n: 138, d: 3 },
    { label: "CSV to JSON", icon: "📊", folder: "csv-to-json", n: 139, d: 3 },
    { label: "JSON to CSV", icon: "📊", folder: "json-to-csv", n: 140, d: 3 },
    { label: "CSV to XML", icon: "📊", folder: "csv-to-xml", n: 141, d: 3 },
    { label: "XML to CSV", icon: "📊", folder: "xml-to-csv", n: 142, d: 3 },
    { label: "Excel to JSON", icon: "📊", folder: "excel-to-json", n: 143, d: 3 },
    { label: "JSON to Excel", icon: "📊", folder: "json-to-excel", n: 144, d: 3 },
    { label: "Excel to HTML", icon: "📊", folder: "excel-to-html", n: 145, d: 3 },
    { label: "HTML Table to Excel", icon: "📊", folder: "html-table-to-excel", n: 146, d: 3 },
    { label: "TSV to CSV", icon: "📊", folder: "tsv-to-csv", n: 147, d: 3 },
    { label: "CSV to TSV", icon: "📊", folder: "csv-to-tsv", n: 148, d: 3 },
    { label: "Excel to Text", icon: "📊", folder: "excel-to-text", n: 149, d: 3 },
    { label: "Text to Excel", icon: "📊", folder: "text-to-excel", n: 150, d: 3 },
    { label: "PPT to PPTX", icon: "📽️", folder: "ppt-to-pptx", n: 151, d: 3 },
    { label: "PPTX to PPT", icon: "📽️", folder: "pptx-to-ppt", n: 152, d: 3 },
    { label: "PowerPoint to PDF", icon: "📽️", folder: "powerpoint-to-pdf-2", n: 153, d: 3 },
    { label: "PDF to PowerPoint", icon: "📽️", folder: "pdf-to-powerpoint-2", n: 154, d: 3 },
    { label: "PowerPoint to Images", icon: "📽️", folder: "powerpoint-to-images", n: 155, d: 3 },
    { label: "Images to PowerPoint", icon: "📽️", folder: "images-to-powerpoint", n: 156, d: 3 },
    { label: "PPTX to Video", icon: "📽️", folder: "pptx-to-video", n: 157, d: 3 },
    { label: "PPTX to Text", icon: "📽️", folder: "pptx-to-text", n: 158, d: 3 },
    { label: "Text to PowerPoint", icon: "📽️", folder: "text-to-powerpoint", n: 159, d: 3 },
    { label: "PPTX to HTML", icon: "📽️", folder: "pptx-to-html", n: 160, d: 3 },
    { label: "JPG to PNG", icon: "🖼️", folder: "jpg-to-png", n: 161, d: 3 },
    { label: "PNG to JPG", icon: "🖼️", folder: "png-to-jpg", n: 162, d: 3 },
    { label: "JPG to WebP", icon: "🖼️", folder: "jpg-to-webp", n: 163, d: 3 },
    { label: "WebP to JPG", icon: "🖼️", folder: "webp-to-jpg", n: 164, d: 3 },
    { label: "PNG to WebP", icon: "🖼️", folder: "png-to-webp", n: 165, d: 3 },
    { label: "WebP to PNG", icon: "🖼️", folder: "webp-to-png", n: 166, d: 3 },
    { label: "JPG to GIF", icon: "🖼️", folder: "jpg-to-gif", n: 167, d: 3 },
    { label: "GIF to JPG", icon: "🖼️", folder: "gif-to-jpg", n: 168, d: 3 },
    { label: "GIF to PNG", icon: "🖼️", folder: "gif-to-png", n: 169, d: 3 },
    { label: "BMP to JPG", icon: "🖼️", folder: "bmp-to-jpg", n: 170, d: 3 },
    { label: "JPG to BMP", icon: "🖼️", folder: "jpg-to-bmp", n: 171, d: 3 },
    { label: "TIFF to JPG", icon: "🖼️", folder: "tiff-to-jpg", n: 172, d: 3 },
    { label: "JPG to TIFF", icon: "🖼️", folder: "jpg-to-tiff", n: 173, d: 3 },
    { label: "SVG to PNG", icon: "🖼️", folder: "svg-to-png", n: 174, d: 3 },
    { label: "PNG to SVG", icon: "🖼️", folder: "png-to-svg", n: 175, d: 3 },
    { label: "SVG to JPG", icon: "🖼️", folder: "svg-to-jpg", n: 176, d: 3 },
    { label: "HEIC to JPG", icon: "🖼️", folder: "heic-to-jpg", n: 177, d: 3 },
    { label: "HEIC to PNG", icon: "🖼️", folder: "heic-to-png", n: 178, d: 3 },
    { label: "AVIF to JPG", icon: "🖼️", folder: "avif-to-jpg", n: 179, d: 3 },
    { label: "JPG to ICO", icon: "🖼️", folder: "jpg-to-ico", n: 180, d: 3 },
    { label: "ICO to PNG", icon: "🖼️", folder: "ico-to-png", n: 181, d: 3 },
    { label: "Image Compressor", icon: "🖼️", folder: "image-compressor", n: 182, d: 3 },
    { label: "Image Resizer", icon: "🖼️", folder: "image-resizer", n: 183, d: 3 },
    { label: "Image Cropper", icon: "🖼️", folder: "image-cropper", n: 184, d: 3 },
    { label: "Image Rotator", icon: "🖼️", folder: "image-rotator", n: 185, d: 3 },
    { label: "Image Flipper", icon: "🖼️", folder: "image-flipper", n: 186, d: 3 },
    { label: "Image Watermark", icon: "🖼️", folder: "image-watermark", n: 187, d: 3 },
    { label: "Image to Base64", icon: "🖼️", folder: "image-to-base64", n: 188, d: 3 },
    { label: "Base64 to Image", icon: "🖼️", folder: "base64-to-image", n: 189, d: 3 },
    { label: "Image Metadata Viewer", icon: "🖼️", folder: "image-metadata-viewer", n: 190, d: 3 },
    { label: "OCR Image to Text", icon: "🖼️", folder: "ocr-image-to-text", n: 191, d: 3 },
    { label: "MP3 to WAV", icon: "🎵", folder: "mp3-to-wav", n: 192, d: 3 },
    { label: "WAV to MP3", icon: "🎵", folder: "wav-to-mp3", n: 193, d: 3 },
    { label: "MP3 to AAC", icon: "🎵", folder: "mp3-to-aac", n: 194, d: 3 },
    { label: "AAC to MP3", icon: "🎵", folder: "aac-to-mp3", n: 195, d: 3 },
    { label: "MP3 to OGG", icon: "🎵", folder: "mp3-to-ogg", n: 196, d: 3 },
    { label: "OGG to MP3", icon: "🎵", folder: "ogg-to-mp3", n: 197, d: 3 },
    { label: "WAV to FLAC", icon: "🎵", folder: "wav-to-flac", n: 198, d: 3 },
    { label: "FLAC to WAV", icon: "🎵", folder: "flac-to-wav", n: 199, d: 3 },
    { label: "M4A to MP3", icon: "🎵", folder: "m4a-to-mp3", n: 200, d: 3 },
    { label: "MP3 to M4A", icon: "🎵", folder: "mp3-to-m4a", n: 201, d: 3 },
    { label: "Audio Compressor", icon: "🎵", folder: "audio-compressor", n: 202, d: 3 },
    { label: "Audio Trimmer", icon: "🎵", folder: "audio-trimmer", n: 203, d: 3 },
    { label: "Audio Merger", icon: "🎵", folder: "audio-merger", n: 204, d: 3 },
    { label: "Audio to Text", icon: "🎵", folder: "audio-to-text", n: 205, d: 3 },
    { label: "Text to Speech", icon: "🎵", folder: "text-to-speech", n: 206, d: 3 },
    { label: "Audio Format Inspector", icon: "🎵", folder: "audio-format-inspector", n: 207, d: 3 },
    { label: "Audio Speed Changer", icon: "🎵", folder: "audio-speed-changer", n: 208, d: 3 },
    { label: "Audio Volume Adjuster", icon: "🎵", folder: "audio-volume-adjuster", n: 209, d: 3 },
    { label: "MP4 to AVI", icon: "🎬", folder: "mp4-to-avi", n: 210, d: 3 },
    { label: "AVI to MP4", icon: "🎬", folder: "avi-to-mp4", n: 211, d: 3 },
    { label: "MP4 to MOV", icon: "🎬", folder: "mp4-to-mov", n: 212, d: 3 },
    { label: "MOV to MP4", icon: "🎬", folder: "mov-to-mp4", n: 213, d: 3 },
    { label: "MP4 to WebM", icon: "🎬", folder: "mp4-to-webm", n: 214, d: 3 },
    { label: "WebM to MP4", icon: "🎬", folder: "webm-to-mp4", n: 215, d: 3 },
    { label: "MKV to MP4", icon: "🎬", folder: "mkv-to-mp4", n: 216, d: 3 },
    { label: "MP4 to GIF", icon: "🎬", folder: "mp4-to-gif", n: 217, d: 3 },
    { label: "Video to Images", icon: "🎬", folder: "video-to-images", n: 218, d: 3 },
    { label: "Images to Video", icon: "🎬", folder: "images-to-video", n: 219, d: 3 },
    { label: "Video Compressor", icon: "🎬", folder: "video-compressor", n: 220, d: 3 },
    { label: "Video Trimmer", icon: "🎬", folder: "video-trimmer", n: 221, d: 3 },
    { label: "Video Merger", icon: "🎬", folder: "video-merger", n: 222, d: 3 },
    { label: "Video Resizer", icon: "🎬", folder: "video-resizer", n: 223, d: 3 },
    { label: "Video Rotator", icon: "🎬", folder: "video-rotator", n: 224, d: 3 },
    { label: "Video to Audio", icon: "🎬", folder: "video-to-audio", n: 225, d: 3 },
    { label: "Video Subtitle Extractor", icon: "🎬", folder: "video-subtitle-extractor", n: 226, d: 3 },
    { label: "SRT to VTT", icon: "🎬", folder: "srt-to-vtt", n: 227, d: 3 },
    { label: "VTT to SRT", icon: "🎬", folder: "vtt-to-srt", n: 228, d: 3 },
    { label: "Video Metadata Viewer", icon: "🎬", folder: "video-metadata-viewer", n: 229, d: 3 },
    { label: "EPUB to PDF", icon: "📚", folder: "epub-to-pdf", n: 230, d: 3 },
    { label: "PDF to EPUB", icon: "📚", folder: "pdf-to-epub", n: 231, d: 3 },
    { label: "EPUB to TXT", icon: "📚", folder: "epub-to-txt", n: 232, d: 3 },
    { label: "TXT to EPUB", icon: "📚", folder: "txt-to-epub", n: 233, d: 3 },
    { label: "EPUB to HTML", icon: "📚", folder: "epub-to-html", n: 234, d: 3 },
    { label: "HTML to EPUB", icon: "📚", folder: "html-to-epub", n: 235, d: 3 },
    { label: "MOBI to EPUB", icon: "📚", folder: "mobi-to-epub", n: 236, d: 3 },
    { label: "EPUB to MOBI", icon: "📚", folder: "epub-to-mobi", n: 237, d: 3 },
    { label: "Ebook Metadata Editor", icon: "📚", folder: "ebook-metadata-editor", n: 238, d: 3 },
    { label: "HTML to XHTML", icon: "🌐", folder: "html-to-xhtml", n: 239, d: 3 },
    { label: "XHTML to HTML", icon: "🌐", folder: "xhtml-to-html", n: 240, d: 3 },
    { label: "HTML to Markdown", icon: "🌐", folder: "html-to-markdown", n: 241, d: 3 },
    { label: "Markdown to HTML", icon: "🌐", folder: "markdown-to-html", n: 242, d: 3 },
    { label: "HTML to PDF", icon: "🌐", folder: "html-to-pdf-2", n: 243, d: 3 },
    { label: "JSON Formatter", icon: "🌐", folder: "json-formatter", n: 244, d: 3 },
    { label: "JSON Minifier", icon: "🌐", folder: "json-minifier", n: 245, d: 3 },
    { label: "XML Formatter", icon: "🌐", folder: "xml-formatter", n: 246, d: 3 },
    { label: "XML Minifier", icon: "🌐", folder: "xml-minifier", n: 247, d: 3 },
    { label: "YAML to JSON", icon: "🌐", folder: "yaml-to-json", n: 248, d: 3 },
    { label: "JSON to YAML", icon: "🌐", folder: "json-to-yaml", n: 249, d: 3 },
    { label: "XML to JSON", icon: "🌐", folder: "xml-to-json", n: 250, d: 3 },
    { label: "JSON to XML", icon: "🌐", folder: "json-to-xml", n: 251, d: 3 },
    { label: "CSV to SQL", icon: "🌐", folder: "csv-to-sql", n: 252, d: 3 },
    { label: "SQL to CSV", icon: "🌐", folder: "sql-to-csv", n: 253, d: 3 },
    { label: "SQL Formatter", icon: "🌐", folder: "sql-formatter", n: 254, d: 3 },
    { label: "CSS Minifier", icon: "🌐", folder: "css-minifier", n: 255, d: 3 },
    { label: "CSS Beautifier", icon: "🌐", folder: "css-beautifier", n: 256, d: 3 },
    { label: "JavaScript Minifier", icon: "🌐", folder: "javascript-minifier", n: 257, d: 3 },
    { label: "JavaScript Beautifier", icon: "🌐", folder: "javascript-beautifier", n: 258, d: 3 },
    { label: "HTML Minifier", icon: "🌐", folder: "html-minifier", n: 259, d: 3 },
    { label: "HTML Beautifier", icon: "🌐", folder: "html-beautifier", n: 260, d: 3 },
    { label: "ZIP Extractor", icon: "🗜️", folder: "zip-extractor", n: 261, d: 3 },
    { label: "Create ZIP", icon: "🗜️", folder: "create-zip", n: 262, d: 3 },
    { label: "TAR Extractor", icon: "🗜️", folder: "tar-extractor", n: 263, d: 3 },
    { label: "Create TAR", icon: "🗜️", folder: "create-tar", n: 264, d: 3 },
    { label: "GZIP Compressor", icon: "🗜️", folder: "gzip-compressor", n: 265, d: 3 },
    { label: "GZIP Decompressor", icon: "🗜️", folder: "gzip-decompressor", n: 266, d: 3 },
    { label: "ZIP to TAR", icon: "🗜️", folder: "zip-to-tar", n: 267, d: 3 },
    { label: "TAR to ZIP", icon: "🗜️", folder: "tar-to-zip", n: 268, d: 3 },
    { label: "Archive Content Viewer", icon: "🗜️", folder: "archive-content-viewer", n: 269, d: 3 },
    { label: "File Compressor", icon: "🗜️", folder: "file-compressor", n: 270, d: 3 },
    { label: "File Extractor", icon: "🗜️", folder: "file-extractor", n: 271, d: 3 },
    { label: "File Type Detector", icon: "🧰", folder: "file-type-detector", n: 272, d: 3 },
    { label: "MIME Type Checker", icon: "🧰", folder: "mime-type-checker", n: 273, d: 3 },
    { label: "File Size Converter", icon: "🧰", folder: "file-size-converter", n: 274, d: 3 },
    { label: "File Checksum Generator", icon: "🧰", folder: "file-checksum-generator", n: 275, d: 3 },
    { label: "Duplicate File Checker", icon: "🧰", folder: "duplicate-file-checker", n: 276, d: 3 },
    { label: "File Renamer", icon: "🧰", folder: "file-renamer", n: 277, d: 3 },
    { label: "Batch File Renamer", icon: "🧰", folder: "batch-file-renamer", n: 278, d: 3 },
    { label: "File Metadata Viewer", icon: "🧰", folder: "file-metadata-viewer", n: 279, d: 3 },
    { label: "Base64 Encoder", icon: "🧰", folder: "base64-encoder", n: 280, d: 3 },
    { label: "Base64 Decoder", icon: "🧰", folder: "base64-decoder", n: 281, d: 3 },
    { label: "URL Encoder", icon: "🧰", folder: "url-encoder", n: 282, d: 3 },
    { label: "URL Decoder", icon: "🧰", folder: "url-decoder", n: 283, d: 3 },
    { label: "QR Code Generator", icon: "🧰", folder: "qr-code-generator", n: 284, d: 3 },
    { label: "QR Code Reader", icon: "🧰", folder: "qr-code-reader", n: 285, d: 3 },
    { label: "Barcode Generator", icon: "🧰", folder: "barcode-generator", n: 286, d: 3 },
    { label: "Barcode Reader", icon: "🧰", folder: "barcode-reader", n: 287, d: 3 },
    { label: "UUID Generator", icon: "🧰", folder: "uuid-generator", n: 288, d: 3 },
    { label: "Timestamp Converter", icon: "🧰", folder: "timestamp-converter", n: 289, d: 3 },
    { label: "Word Counter", icon: "🗂️", folder: "word-counter", n: 290, d: 3 },
    { label: "Character Counter", icon: "🗂️", folder: "character-counter", n: 291, d: 3 },
    { label: "Line Counter", icon: "🗂️", folder: "line-counter", n: 292, d: 3 },
    { label: "Text Case Converter", icon: "🗂️", folder: "text-case-converter", n: 293, d: 3 },
    { label: "Find and Replace", icon: "🗂️", folder: "find-and-replace", n: 294, d: 3 },
    { label: "Text Diff Checker", icon: "🗂️", folder: "text-diff-checker", n: 295, d: 3 },
    { label: "Document Merger", icon: "🗂️", folder: "document-merger", n: 296, d: 3 },
    { label: "Document Splitter", icon: "🗂️", folder: "document-splitter", n: 297, d: 3 },
    { label: "Document Page Counter", icon: "🗂️", folder: "document-page-counter", n: 298, d: 3 },
    { label: "Document Metadata Editor", icon: "🗂️", folder: "document-metadata-editor", n: 299, d: 3 },
    { label: "Spell Checker", icon: "🗂️", folder: "spell-checker", n: 300, d: 3 },
    { label: "Grammar Checker", icon: "🗂️", folder: "grammar-checker", n: 301, d: 3 },
    { label: "Document Watermark", icon: "🗂️", folder: "document-watermark", n: 302, d: 3 },
    { label: "Page Numbering Tool", icon: "🗂️", folder: "page-numbering-tool", n: 303, d: 3 },
    { label: "Document Template Generator", icon: "🗂️", folder: "document-template-generator", n: 304, d: 3 },
    { label: "Date Format Converter", icon: "🔢", folder: "date-format-converter", n: 305, d: 3 },
    { label: "Time Format Converter", icon: "🔢", folder: "time-format-converter", n: 306, d: 3 },
    { label: "Unix Timestamp Converter", icon: "🔢", folder: "unix-timestamp-converter", n: 307, d: 3 },
    { label: "Number to Words", icon: "🔢", folder: "number-to-words", n: 308, d: 3 },
    { label: "Words to Number", icon: "🔢", folder: "words-to-number", n: 309, d: 3 },
    { label: "Roman Numeral Converter", icon: "🔢", folder: "roman-numeral-converter", n: 310, d: 3 },
    { label: "Decimal to Binary", icon: "🔢", folder: "decimal-to-binary", n: 311, d: 3 },
    { label: "Binary to Decimal", icon: "🔢", folder: "binary-to-decimal", n: 312, d: 3 },
    { label: "Decimal to Hexadecimal", icon: "🔢", folder: "decimal-to-hexadecimal", n: 313, d: 3 },
    { label: "Hexadecimal to Decimal", icon: "🔢", folder: "hexadecimal-to-decimal", n: 314, d: 3 },
    { label: "Decimal to Octal", icon: "🔢", folder: "decimal-to-octal", n: 315, d: 3 },
    { label: "Octal to Decimal", icon: "🔢", folder: "octal-to-decimal", n: 316, d: 3 },
    { label: "JSON Validator", icon: "🔢", folder: "json-validator", n: 317, d: 3 },
    { label: "XML Validator", icon: "🔢", folder: "xml-validator", n: 318, d: 3 },
    { label: "CSV Validator", icon: "🔢", folder: "csv-validator", n: 319, d: 3 },
    { label: "Data Format Converter", icon: "🔢", folder: "data-format-converter", n: 320, d: 3 },
    { label: "All File Viewer", icon: "📂", folder: "file-viewer", n: 354, d: 2 },
    { label: "Health", icon: "🏥", folder: "health", n: 321, d: 1 },
    { label: "Registration", icon: "📝", folder: "victim-registration", n: 322, d: 2 },
    { label: "Triage", icon: "🚑", folder: "triage", n: 323, d: 2 },
    { label: "Nurse Consultation", icon: "💉", folder: "nurse-consultation", n: 324, d: 2 },
    { label: "Doctor Consultation", icon: "🩺", folder: "doctor-consultation", n: 325, d: 2 },
    { label: "Pharmacy", icon: "💊", folder: "pharmacy", n: 326, d: 2 },
    { label: "Pharmacy Stock", icon: "📦", folder: "pharmacy-stock", n: 395, d: 2 },
    { label: "Drug Interactions", icon: "⚗️", folder: "drug-interactions", n: 407, d: 2 },
    { label: "Treatment / Procedures", icon: "🩹", folder: "treatment-procedures", n: 327, d: 2 },
    { label: "Patient List", icon: "🗂️", folder: "patient-module", n: 328, d: 2 },
    { label: "Patient File", icon: "🗃️", folder: "patient-file", n: 396, d: 2 },
    { label: "Referrals", icon: "📤", folder: "referrals", n: 397, d: 2 },
    { label: "Ward Management", icon: "🏥", folder: "ward-management", n: 330, d: 2 },
    { label: "Ward Registration", icon: "🏥", folder: "ward-registration", n: 331, d: 3 },
    { label: "Bed Management", icon: "🛏️", folder: "bed-management", n: 332, d: 3 },
    { label: "Occupancy Dashboard", icon: "📊", folder: "ward-occupancy", n: 333, d: 3 },
    { label: "Bed Assignment", icon: "👥", folder: "bed-assignment", n: 334, d: 3 },
    { label: "Transfers", icon: "🔄", folder: "ward-bed-transfers", n: 335, d: 3 },
    { label: "Cleaning & Maintenance", icon: "🧹", folder: "cleaning-maintenance", n: 336, d: 3 },
    { label: "Ward Register", icon: "📋", folder: "ward-register", n: 337, d: 3 },
    { label: "Bed & Transfer History", icon: "📜", folder: "bed-transfer-history", n: 338, d: 3 },
    { label: "Patient Admission", icon: "🧾", folder: "patient-admission", n: 340, d: 2 },
    { label: "New Admission", icon: "📝", folder: "new-admission", n: 341, d: 3 },
    { label: "Admission List", icon: "🗒️", folder: "admission-list", n: 342, d: 3 },
    { label: "Admission Details", icon: "🔎", folder: "admission-details", n: 343, d: 3 },
    { label: "Patient Discharge", icon: "🚪", folder: "patient-discharge", n: 350, d: 2 },
    { label: "Start Discharge", icon: "🚪", folder: "start-discharge", n: 351, d: 3 },
    { label: "Discharge List", icon: "🗒️", folder: "discharge-list", n: 352, d: 3 },
    { label: "Discharge Details", icon: "🔎", folder: "discharge-details", n: 353, d: 3 },
    { label: "Laboratory", icon: "🧪", folder: "laboratory", n: 360, d: 2 },
    { label: "New Lab Request", icon: "🧪", folder: "new-lab-request", n: 361, d: 3 },
    { label: "Lab Request List", icon: "🗒️", folder: "lab-request-list", n: 362, d: 3 },
    { label: "Lab Workbench", icon: "🔬", folder: "lab-workbench", n: 359, d: 3 },
    { label: "Lab Instrument Bridge", icon: "🔗", folder: "lab-instrument-bridge", n: 408, d: 3 },
    { label: "Radiology / Imaging", icon: "🩻", folder: "radiology", n: 358, d: 2 },
    { label: "New Imaging Request", icon: "🩻", folder: "new-imaging-request", n: 357, d: 3 },
    { label: "Imaging Requests", icon: "🗒️", folder: "imaging-requests", n: 356, d: 3 },
    { label: "Imaging Workbench", icon: "🖥️", folder: "imaging-workbench", n: 355, d: 3 },

    // JAMALI Health - modules 1-27 (full hospital module wing)
    { label: "Hospital Billing & Invoicing", icon: "🧾", folder: "hospital-billing", n: 363, d: 2 },
    { label: "Payments & Financial", icon: "💵", folder: "hospital-payments", n: 364, d: 2 },
    { label: "Health Insurance", icon: "🛡️", folder: "health-insurance", n: 365, d: 2 },
    { label: "Tariff Engine", icon: "💱", folder: "tariff-engine", n: 406, d: 2 },
    { label: "Staff & Human Resource", icon: "👥", folder: "hospital-staff", n: 366, d: 2 },
    { label: "Doctor Scheduling & Duty Roster", icon: "🗓️", folder: "doctor-schedule", n: 367, d: 2 },
    { label: "Hospital Reports & Analytics", icon: "📊", folder: "hospital-reports", n: 368, d: 2 },
    { label: "Emergency Department", icon: "🚨", folder: "emergency-department", n: 369, d: 2 },
    { label: "Intensive Care Unit (ICU)", icon: "🫀", folder: "icu-management", n: 370, d: 2 },
    { label: "Operating Theatre & Surgery", icon: "🏥", folder: "surgery-theatre", n: 371, d: 2 },
    { label: "Maternity & Delivery", icon: "🤰", folder: "maternity-delivery", n: 372, d: 2 },
    { label: "Antenatal & Postnatal Care", icon: "🤱", folder: "antenatal-care", n: 373, d: 2 },
    { label: "Paediatric Department", icon: "🧒", folder: "paediatric-department", n: 374, d: 2 },
    { label: "Dental Department", icon: "🦷", folder: "dental-department", n: 375, d: 2 },
    { label: "Physiotherapy & Rehabilitation", icon: "🏋️", folder: "physiotherapy", n: 376, d: 2 },
    { label: "Mental Health Services", icon: "🧠", folder: "mental-health", n: 377, d: 2 },
    { label: "Blood Bank & Transfusion", icon: "🩸", folder: "blood-bank", n: 378, d: 2 },
    { label: "Ambulance & Patient Transport", icon: "🚑", folder: "ambulance-transport", n: 379, d: 2 },
    { label: "Immunisation & Vaccination", icon: "💉", folder: "immunisation", n: 380, d: 2 },
    { label: "Chronic Disease", icon: "🩺", folder: "chronic-disease", n: 381, d: 2 },
    { label: "Infection Prevention & Control", icon: "🦠", folder: "infection-control", n: 382, d: 2 },
    { label: "Mortuary", icon: "🕯️", folder: "mortuary-management", n: 383, d: 2 },
    { label: "Medical Equipment", icon: "🔧", folder: "medical-equipment", n: 384, d: 2 },
    { label: "Medical Supplies & Procurement", icon: "📦", folder: "medical-supplies", n: 385, d: 2 },
    { label: "General Hospital Inventory", icon: "🏬", folder: "hospital-inventory", n: 386, d: 2 },
    { label: "Dietary & Nutrition", icon: "🍽️", folder: "dietary-nutrition", n: 387, d: 2 },
    { label: "Laundry", icon: "🧺", folder: "laundry-management", n: 388, d: 2 },
    { label: "Housekeeping & Environmental Services", icon: "🧹", folder: "housekeeping", n: 389, d: 2 },
    { label: "Health Audit Trail", icon: "🔐", folder: "health-audit", n: 398, d: 2 },
    { label: "Staff Roles", icon: "🪪", folder: "staff-roles", n: 399, d: 2 },
    { label: "Staff Development", icon: "🎓", folder: "staff-development", n: 409, d: 2 },
    { label: "ICD-10 Finder", icon: "🔎", folder: "icd10", n: 400, d: 2 },
    { label: "DHIS2 Export", icon: "📡", folder: "dhis2-export", n: 401, d: 2 },
    { label: "Telemedicine", icon: "💻", folder: "telemedicine", n: 402, d: 2 },
    { label: "Birth Certificates", icon: "👶", folder: "birth-certificates", n: 403, d: 2 },
    { label: "Death Certificates", icon: "🕯️", folder: "death-certificates", n: 404, d: 2 },
    { label: "Branches", icon: "🏢", folder: "branches", n: 405, d: 2 },
    { label: "FHIR Bridge", icon: "🌐", folder: "fhir-bridge", n: 410, d: 2 },
];

/* ======================================================================
   THE ICD-10 CATALOGUE - the shared diagnosis coding list (WHO ICD-10).
   The Doctor Consultation page (325) fills its code picker from
   ICD10_CODES, the ICD-10 Finder (400) searches it, and Death
   Certificates (404) picks the cause-of-death code from it.
   Chapters first, then the everyday codes the facility writes.
   Edit this list to grow the catalogue - it ships to every page.
   ====================================================================== */
export const ICD10_CHAPTERS = [
  ["A00–B99", "Certain infectious and parasitic diseases"],
  ["C00–D48", "Neoplasms"],
  ["D50–D89", "Diseases of the blood and blood-forming organs"],
  ["E00–E89", "Endocrine, nutritional and metabolic diseases"],
  ["F00–F99", "Mental and behavioural disorders"],
  ["G00–G99", "Diseases of the nervous system"],
  ["H00–H59", "Diseases of the eye and adnexa"],
  ["H60–H95", "Diseases of the ear and mastoid process"],
  ["I00–I99", "Diseases of the circulatory system"],
  ["J00–J99", "Diseases of the respiratory system"],
  ["K00–K93", "Diseases of the digestive system"],
  ["L00–L99", "Diseases of the skin and subcutaneous tissue"],
  ["M00–M99", "Diseases of the musculoskeletal system"],
  ["N00–N99", "Diseases of the genitourinary system"],
  ["O00–O99", "Pregnancy, childbirth and the puerperium"],
  ["P00–P96", "Certain conditions originating in the perinatal period"],
  ["Q00–Q99", "Congenital malformations and chromosomal abnormalities"],
  ["R00–R99", "Symptoms, signs and abnormal clinical findings"],
  ["S00–T98", "Injury, poisoning and certain other consequences of external causes"],
  ["Z00–Z99", "Factors influencing health status and contact with health services"]
];
export const ICD10_CODES = [
  ["A00", "Cholera"], ["A01.0", "Typhoid fever"],
  ["A09", "Diarrhoea and gastroenteritis of presumed infectious origin"],
  ["A15", "Respiratory tuberculosis, bacteriologically confirmed"],
  ["A16", "Respiratory tuberculosis, not confirmed bacteriologically"],
  ["A18", "Tuberculosis of other organs"],
  ["A35", "Tetanus"], ["A36", "Diphtheria"], ["A80", "Acute poliomyelitis"],
  ["A82", "Rabies"], ["A90", "Dengue fever"], ["A91", "Dengue haemorrhagic fever"],
  ["B05", "Measles"], ["B15", "Acute hepatitis A"], ["B16", "Acute hepatitis B"],
  ["B18", "Chronic viral hepatitis"],
  ["B20", "HIV disease resulting in infectious and parasitic diseases"],
  ["B24", "Unspecified HIV disease"],
  ["B34", "Viral infection of unspecified site"],
  ["B35", "Dermatophytosis (tinea)"],
  ["B50", "Plasmodium falciparum malaria"], ["B51", "Plasmodium vivax malaria"],
  ["B54", "Malaria, unspecified"], ["B99", "Other infectious diseases"],
  ["U07.1", "COVID-19, virus identified"],
  ["C16", "Malignant neoplasm of stomach"],
  ["C22", "Malignant neoplasm of liver and intrahepatic bile ducts"],
  ["C34", "Malignant neoplasm of bronchus and lung"],
  ["C50", "Malignant neoplasm of breast"],
  ["C53", "Malignant neoplasm of cervix uteri"],
  ["C61", "Malignant neoplasm of prostate"],
  ["C64", "Malignant neoplasm of kidney"],
  ["D50", "Iron deficiency anaemia"],
  ["D57", "Sickle-cell disorders"],
  ["D57.0", "Sickle-cell anaemia with crisis"],
  ["D64", "Other anaemias"],
  ["E03.9", "Hypothyroidism, unspecified"],
  ["E05", "Thyrotoxicosis (hyperthyroidism)"],
  ["E10", "Type 1 diabetes mellitus"], ["E11", "Type 2 diabetes mellitus"],
  ["E43", "Unspecified severe protein-energy malnutrition"],
  ["E44", "Moderate protein-energy malnutrition"],
  ["E46", "Unspecified protein-energy malnutrition"],
  ["F03", "Unspecified dementia"], ["F20", "Schizophrenia"],
  ["F31", "Bipolar affective disorder"],
  ["F32", "Depressive episode"], ["F33", "Recurrent depressive disorder"],
  ["F41.1", "Generalized anxiety disorder"],
  ["G40", "Epilepsy"], ["G43", "Migraine"],
  ["H66", "Suppurative and unspecified otitis media"],
  ["I10", "Essential (primary) hypertension"], ["I20", "Angina pectoris"],
  ["I21", "Acute myocardial infarction"], ["I50", "Heart failure"],
  ["I63", "Cerebral infarction"],
  ["I64", "Stroke, not specified as haemorrhage or infarction"],
  ["J02.9", "Acute pharyngitis, unspecified"],
  ["J06", "Acute upper respiratory infection, multiple and unspecified sites"],
  ["J11.1", "Influenza with respiratory manifestations, virus not identified"],
  ["J18", "Pneumonia, unspecified organism"],
  ["J30.4", "Allergic rhinitis, unspecified"],
  ["J44", "Other chronic obstructive pulmonary disease"],
  ["J45", "Asthma"],
  ["K02", "Dental caries"], ["K04", "Diseases of pulp and periapical tissues"],
  ["K29", "Gastritis and duodenitis"], ["K30", "Functional dyspepsia"],
  ["K35", "Acute appendicitis"], ["K40", "Inguinal hernia"],
  ["L30", "Dermatitis and eczema"],
  ["M19", "Other and unspecified osteoarthritis"],
  ["N18", "Chronic kidney disease"],
  ["N39.0", "Urinary tract infection, site not specified"],
  ["O80", "Encounter for full-term uncomplicated delivery"],
  ["O82", "Encounter for caesarean delivery without indication"],
  ["P07", "Disorders related to short gestation and low birthweight"],
  ["P36.9", "Bacterial sepsis of newborn, unspecified"],
  ["R05", "Cough"], ["R06.0", "Dyspnoea"],
  ["R10", "Abdominal and pelvic pain"], ["R42", "Dizziness and giddiness"],
  ["R50", "Fever of other and unknown origin"], ["R51", "Headache"],
  ["S02", "Fracture of skull and facial bones"],
  ["S06", "Intracranial injury"], ["S52", "Fracture of forearm"],
  ["S72", "Fracture of femur"],
  ["S82", "Fracture of lower leg, including ankle"],
  ["T14", "Injury of unspecified body region"],
  ["T78.2", "Anaphylactic shock, unspecified"],
  ["Z00", "General medical examination"],
  ["Z34", "Supervision of normal pregnancy"]
];

/* ======================================================================
   THE DRUG INTERACTION TABLE - the shared safety net for prescribing and
   dispensing. The Doctor Consultation (325) warns while the prescription
   rows are typed, the Pharmacy desk (326) re-checks at the moment of
   dispensing, and the Drug Interactions finder (407) searches the table.
   Pairs are clinically real, everyday combinations; severity follows the
   practical rule: Major = avoid or adjust under specialist advice,
   Moderate = monitor the patient / adjust timing, Minor = usually fine.
   Add pairs freely - one entry per pair, ["Drug A", "Drug B", severity,
   effect, action]; matching is by word stem so "amoxicillin" matches
   "Amoxiclav" too.
   ====================================================================== */
export const DRUG_INTERACTIONS = [
  ["warfarin", "aspirin", "Major", "Increased bleeding risk - antiplatelet adds to anticoagulant effect", "Avoid the combination; if unavoidable, monitor INR closely and watch for bleeding"],
  ["warfarin", "ibuprofen", "Major", "NSAID raises bleeding risk and can displace warfarin from plasma proteins", "Use paracetamol instead; if an NSAID is essential, monitor INR"],
  ["warfarin", "diclofenac", "Major", "NSAID raises bleeding risk and gastric erosion on anticoagulation", "Avoid; use paracetamol for pain"],
  ["warfarin", "erythromycin", "Moderate", "Macrolide inhibits warfarin metabolism - INR climbs", "Monitor INR within 3-5 days of starting; consider azithromycin"],
  ["warfarin", "ciprofloxacin", "Moderate", "Fluoroquinolone potentiates warfarin effect", "Monitor INR within 3-5 days of starting"],
  ["warfarin", "metronidazole", "Major", "Potent CYP2C9 inhibition - marked INR rise and bleeding", "Reduce warfarin dose and monitor INR closely, or choose another antibiotic"],
  ["warfarin", "fluconazole", "Major", "CYP2C9/3A4 inhibition - INR rises sharply", "Monitor INR within 2-3 days; adjust dose"],
  ["warfarin", "cotrimoxazole", "Major", "Trimethoprim-sulfamethoxazole potentiates warfarin strongly", "Monitor INR within 2-3 days; consider alternative antibiotic"],
  ["aspirin", "ibuprofen", "Moderate", "Ibuprofen competes for the same platelet binding - cardioprotective effect of aspirin is blunted", "Give aspirin 2 hours before ibuprofen, or use another analgesic"],
  ["aspirin", "clopidogrel", "Moderate", "Dual antiplatelet effect - bleeding risk roughly doubles", "Only together when a doctor asks for dual therapy (e.g. after stent); review duration"],
  ["clopidogrel", "omeprazole", "Moderate", "Omeprazole blocks CYP2C19 activation of clopidogrel - effect weakens", "Use pantoprazole instead if gastric protection is needed"],
  ["ace inhibitor", "potassium sparing diuretic", "Major", "Both retain potassium - risk of dangerous hyperkalaemia", "Check potassium and creatinine within 1 week of starting the combination"],
  ["enalapril", "spironolactone", "Major", "Hyperkalaemia risk - ACE inhibition plus potassium retention", "Monitor potassium at baseline, 1 week, then monthly"],
  ["lisinopril", "spironolactone", "Major", "Hyperkalaemia risk - ACE inhibition plus potassium retention", "Monitor potassium at baseline, 1 week, then monthly"],
  ["ramipril", "spironolactone", "Major", "Hyperkalaemia risk - ACE inhibition plus potassium retention", "Monitor potassium at baseline, 1 week, then monthly"],
  ["enalapril", "ibuprofen", "Moderate", "NSAID blunts blood-pressure control and stresses the kidneys", "Avoid regular NSAID use; monitor creatinine if combined"],
  ["lisinopril", "diclofenac", "Moderate", "NSAID blunts BP control; renal function may fall", "Avoid regular NSAID use; monitor creatinine and BP"],
  ["metformin", "iodinated contrast", "Major", "Contrast nephropathy can cause metformin accumulation and lactic acidosis", "Stop metformin at contrast administration, restart after 48 h once renal function is confirmed"],
  ["metformin", "furosemide", "Minor", "Furosemide may raise metformin levels slightly; metformin can blunt diuresis", "Usually fine; monitor renal function in dehydration"],
  ["digoxin", "furosemide", "Moderate", "Loop diuretic lowers potassium - digoxin toxicity risk rises", "Monitor potassium and magnesium; keep digoxin level checked"],
  ["digoxin", "amiodarone", "Major", "Amiodarone doubles digoxin exposure - toxicity (visual changes, arrhythmia)", "Halve the digoxin dose when amiodarone starts; monitor level"],
  ["digoxin", "clarithromycin", "Major", "Macrolide raises digoxin concentration sharply", "Choose another antibiotic or reduce digoxin dose and monitor"],
  ["amiodarone", "levofloxacin", "Major", "Both prolong QT - torsades risk", "Avoid; choose an antibiotic that does not prolong QT"],
  ["amiodarone", "azithromycin", "Moderate", "Both prolong QT - arrhythmia risk in susceptible patients", "Avoid if possible; monitor ECG if unavoidable"],
  ["ciprofloxacin", "theophylline", "Major", "Fluoroquinolone raises theophylline levels - seizures, palpitations", "Halve theophylline dose or use another antibiotic; check level"],
  ["ciprofloxacin", "ferrous sulfate", "Moderate", "Iron chelates ciprofloxacin in the gut - antibiotic absorption collapses", "Give iron at least 2 hours apart from the antibiotic"],
  ["ciprofloxacin", "calcium carbonate", "Moderate", "Calcium binds ciprofloxacin - absorption falls", "Give calcium 2 hours before or 6 hours after the antibiotic"],
  ["erythromycin", "theophylline", "Major", "Macrolide raises theophylline levels - toxicity", "Halve theophylline dose or choose another antibiotic"],
  ["simvastatin", "clarithromycin", "Major", "Strong CYP3A4 inhibition - rhabdomyolysis risk", "Pause the statin while on the macrolide, or use azithromycin"],
  ["atorvastatin", "clarithromycin", "Moderate", "CYP3A4 inhibition raises statin exposure - myopathy risk", "Temporarily pause the statin or pick another antibiotic"],
  ["simvastatin", "fluconazole", "Moderate", "Raised statin levels - myopathy risk", "Watch for muscle pain; consider pausing the statin"],
  ["methotrexate", "cotrimoxazole", "Major", "Both block folate pathways plus renal clearance competition - severe marrow suppression", "Avoid the combination entirely"],
  ["methotrexate", "ibuprofen", "Moderate", "NSAID reduces methotrexate clearance - toxicity risk", "Use paracetamol; if NSAID needed, monitor blood counts"],
  ["lithium", "ibuprofen", "Major", "NSAID raises lithium levels towards toxicity (tremor, confusion)", "Avoid NSAIDs; use paracetamol; check lithium level if combined"],
  ["lithium", "hydrochlorothiazide", "Major", "Thiazide raises lithium reabsorption - toxicity", "Avoid; if unavoidable, monitor lithium level within 5-7 days"],
  ["haloperidol", "ciprofloxacin", "Moderate", "Both can prolong QT - arrhythmia risk", "Avoid if possible; monitor ECG when combined"],
  ["chloroquine", "amiodarone", "Major", "Both prolong QT - torsades risk", "Avoid the combination; monitor ECG if unavoidable"],
  ["tramadol", "fluoxetine", "Major", "Serotonin syndrome risk plus tramadol effect blunted", "Watch for agitation, fever, tremor; consider another analgesic"],
  ["tramadol", "amitriptyline", "Moderate", "Serotonin syndrome and seizure threshold lowered", "Use caution at doses above usual; watch for agitation and tremor"],
  ["morphine", "diazepam", "Major", "Combined sedation - respiratory depression", "Avoid together, especially in the elderly; if unavoidable, reduce both doses and monitor breathing"],
  ["codeine", "diazepam", "Moderate", "Combined sedation on the breathing centre", "Avoid in the elderly and children; monitor drowsiness"],
  ["phenytoin", "rifampicin", "Moderate", "Rifampicin accelerates phenytoin clearance - seizure control lost", "Monitor levels and raise the dose as needed"],
  ["phenytoin", "fluconazole", "Moderate", "Fluconazole raises phenytoin levels - toxicity", "Monitor level and watch for nystagmus, drowsiness"],
  ["carbamazepine", "clarithromycin", "Major", "CYP3A4 inhibition raises carbamazepine sharply - ataxia, drowsiness", "Choose another antibiotic or reduce the carbamazepine dose"],
  ["sildenafil", "isosorbide dinitrate", "Major", "Nitrate plus PDE5 inhibitor - severe, dangerous hypotension", "Never combine - at least 24 hours apart, and in practice avoid"],
  ["sildenafil", "nitroglycerin", "Major", "Nitrate plus PDE5 inhibitor - severe hypotension", "Never combine"],
  ["insulin", "ciprofloxacin", "Moderate", "Fluoroquinolones can swing blood sugar both ways", "Monitor glucose more often while on the antibiotic"],
  ["glibenclamide", "fluconazole", "Moderate", "Raised sulfonylurea levels - hypoglycaemia risk", "Watch glucose; consider dose reduction"],
  ["glibenclamide", "aspirin", "Minor", "Aspirin can potentiate the sulfonylurea slightly", "Usually fine; watch for hypoglycaemia signs"],
  ["levothyroxine", "ferrous sulfate", "Moderate", "Iron binds thyroxine in the gut - absorption lost", "Give iron at least 4 hours apart from levothyroxine"],
  ["levothyroxine", "calcium carbonate", "Moderate", "Calcium binds thyroxine - absorption falls", "Give calcium at least 4 hours apart from levothyroxine"],
  ["aluminium hydroxide", "ciprofloxacin", "Moderate", "Antacid binds the antibiotic - absorption collapses", "Give the antacid 2 hours after the antibiotic"],
  ["omeprazole", "ketoconazole", "Moderate", "Acid suppression reduces ketoconazole absorption", "Give the antifungal with acidic drink, or switch antifungal"],
  ["amlodipine", "simvastatin", "Minor", "Amlodipine mildly raises simvastatin levels", "Keep simvastatin at 20 mg or less daily"],
  ["hydrochlorothiazide", "ibuprofen", "Moderate", "NSAID blunts the diuretic and can strain the kidneys", "Avoid regular NSAID use; monitor BP and creatinine"],
  ["furosemide", "gentamicin", "Major", "Both are ototoxic and nephrotoxic - hearing and kidney damage risk stacks", "Avoid together where possible; monitor hearing and creatinine"],
  ["gentamicin", "vancomycin", "Major", "Stacked nephrotoxicity and ototoxicity", "Avoid unless specialist asks; monitor levels, creatinine, hearing"]
];

// wordStem - a loose stem so "amoxicillin" matches "Amoxiclav 625",
// "potassium sparing diuretic" is matched token-wise, and plurals fold.
function __jamaliStems(name) {
  const s = String(name || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const toks = s.split(/\s+/).filter(Boolean);
  const stems = new Set();
  for (const t of toks) {
    if (t.length < 4) { stems.add(t); continue; }
    stems.add(t);
    stems.add(t.replace(/(ine|ate|ol|in|ium|ide|vir|mab)$/, ""));
    stems.add(t.replace(/s$/, ""));
  }
  return stems;
}
function __jamaliNameHits(drugName, entryName) {
  // entry names may be multi-word ("potassium sparing diuretic") - every
  // word of the entry must hit the drug text's stems.
  const drugStems = __jamaliStems(drugName);
  const parts = String(entryName || "").toLowerCase().split(/\s+/).filter(Boolean);
  return parts.every((p) => {
    const ps = __jamaliStems(p);
    for (const q of ps) if (drugStems.has(q)) return true;
    return false;
  });
}
// checkInteractions(names) - names is the list of drug names on the sheet
// (prescription rows or dispense lines). Returns matches:
// [{ a, b, severity, effect, action }] - a and b are the matched names.
export function checkInteractions(names) {
  const items = (Array.isArray(names) ? names : [])
    .map((n) => String(n || "").trim()).filter(Boolean);
  const out = [];
  for (const [ea, eb, sev, eff, act] of DRUG_INTERACTIONS) {
    const hitA = items.filter((n) => __jamaliNameHits(n, ea));
    const hitAset = new Set(hitA.map((n) => n.toLowerCase()));
    const hitB = items.filter((n) => __jamaliNameHits(n, eb) &&
      !hitAset.has(n.toLowerCase()));
    for (const a of hitA) for (const b of hitB) {
      if (a.toLowerCase() === b.toLowerCase()) continue;
      if (out.some((m) => (m.a === a && m.b === b) || (m.a === b && m.b === a))) continue;
      out.push({ a, b, severity: sev, effect: eff, action: act });
    }
  }
  const rank = { Major: 0, Moderate: 1, Minor: 2 };
  out.sort((x, y) => (rank[x.severity] ?? 3) - (rank[y.severity] ?? 3));
  return out;
}
// checkAllergies(names, allergyText) - a light screen: known allergy words
// in the patient record against the drugs being given. Word-stem based
// plus a family map, so "penicillin allergy" fires on amoxicillin /
// Amoxiclav / flucloxacillin too. Advisory only.
const __ALLERGY_FAMILIES = {
  "penicillin": ["amoxicillin", "amoxiclav", "ampicillin", "flucloxacillin",
    "piperacillin", "ticarcillin", "penicillin", "co-amoxiclav"],
  "sulfa": ["cotrimoxazole", "sulfamethoxazole", "sulfasalazine", "sulfadiazine"],
  "aspirin": ["aspirin", "acetylsalicylic"],
  "nsaid": ["ibuprofen", "diclofenac", "naproxen", "indomethacin", "aspirin", "ketoprofen"],
  "iodine": ["iodinated", "povidone", "contrast"]
};
export function checkAllergies(names, allergyText) {
  const txt = String(allergyText || "").toLowerCase();
  if (!txt.trim() || /^(no|none|nil|nkda|nka)\b/.test(txt.trim())) return [];
  const out = [];
  for (const n of (Array.isArray(names) ? names : []).map((x) => String(x || "").trim()).filter(Boolean)) {
    const low = n.toLowerCase();
    for (const word of txt.split(/[,;/]+/).map((w) => w.trim()).filter((w) => w.length >= 4)) {
      const stems = __jamaliStems(word);
      let hit = [...stems].some((s) => s.length >= 4 && low.includes(s));
      if (!hit) {
        // the family map: every word of the allergy phrase must be either a
        // family keyword match or a filler word (allergy, sensitivity...)
        for (const [key, fam] of Object.entries(__ALLERGY_FAMILIES)) {
          if (!word.includes(key)) continue;
          if (fam.some((d) => low.includes(d) || low.includes(d.replace(/-/g, "")))) { hit = true; break; }
        }
      }
      if (hit) { out.push({ drug: n, allergy: word }); break; }
    }
  }
  return out;
}

// Modules switched off in Organisation Settings leave the menu and Home.
(function () {
  var mods = null;
  try { mods = JSON.parse(localStorage.getItem("jamaliOrgModules") || "null"); } catch (e) {}
  if (!mods) return;
  var M = window.JAMALI_MENU, out = [], skip = 0;
  for (var i = 0; i < M.length; i++) {
    var d = M[i].d || 0;
    if (skip && d > skip) continue;
    skip = 0;
    if (d === 1 && mods[M[i].folder] === false) { skip = 1; continue; }
    out.push(M[i]);
  }
  window.JAMALI_MENU = out;
})();

/* ======================================================================
   THE SIDEBAR - the former public/sidebar.js body, with its lazy data-layer
   imports retargeted from /502.js to this same module (/sidebar.js).
   ====================================================================== */

 
(function () {

 var SESSION_KEY = "JAMALI_SYSTEM_SESSION";
 function readSession() {
   try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ||
"null"); }
   catch (e) { return null; }
 }
 function writeSession(s) {
   try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
catch (e) {}
 }
 function clearSession() {
   try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
 }

 var session = readSession();

 var MODE_KEY = "JAMALI_SYSTEM_MODE";
 function readMode() {
   try { return sessionStorage.getItem(MODE_KEY) === "personal" ? "personal" : "organisation"; }
   catch (e) { return "organisation"; }
 }
 function setMode(mode) {
   try { sessionStorage.setItem(MODE_KEY, mode); } catch (e) {}
   import("/sidebar.js").then(function (fb) {
     var u = fb.auth && fb.auth.currentUser;
     var mail = u && u.email ? String(u.email).toLowerCase() : "";
     if (mail) { try { localStorage.setItem("JAMALI_MODE::" + mail, mode); } catch (e) {} }
   }).catch(function () {});
 }
 function clearMode() {
   try { sessionStorage.removeItem(MODE_KEY); } catch (e) {}
 }
 
 var ALWAYS_OPEN = ["home", "file-viewer", "staff-roles", "notification-center"];
var PARENT = {"ward-registration":"ward-management","bed-management":"ward-management","ward-occupancy":"ward-management","bed-assignment":"ward-management","ward-bed-transfers":"ward-management","cleaning-maintenance":"ward-management","ward-register":"ward-management","bed-transfer-history":"ward-management","new-admission":"patient-admission","admission-list":"patient-admission","admission-details":"patient-admission","start-discharge":"patient-discharge","discharge-list":"patient-discharge","discharge-details":"patient-discharge","new-lab-request":"laboratory","lab-request-list":"laboratory","lab-workbench":"laboratory","new-imaging-request":"radiology","imaging-requests":"radiology","imaging-workbench":"radiology","tool":"convertor"};

 /* ======================================================================
   BUSINESS ROLE ENFORCEMENT (25 Nov 2026) - the other half of the
   catalog above. A signed-in Google account is gated by the Staff
   Roles registry (healthStaff - the same per-device store page 399
   edits, read through the same local shim): role -> module template,
   or the member's own custom folder set. Everything else keeps the
   open model: anonymous visitors, unreadable registries (first offline
   visit), empty registries (staff onboarding not started yet) and
   folder-Administrator registry rows all see the whole menu. The
   administrator email (camelkazembe1@gmail.com) always sees everything,
   folders outside the menu tree (standalone tools, the comment desk)
   never gate, and the visibility config keeps applying on top.
   ====================================================================== */
var STAFF_ACCESS = {
  mode: "open",      // open | loading | member | unknown | suspended | nomodules
  email: "",
  folders: null,     // granted menu folders in member mode; null = everything open
  role: "",
  watchedEmail: ""
};

function staffMenuFolders() {
  var M = window.JAMALI_MENU || [], out = {}, i;
  for (i = 0; i < M.length; i++) out[M[i].folder] = 1;
  return out;
}

function staffChildMap() {
  // folder -> direct child folders, walked from the flat menu with a
  // depth stack. d 0 = Home/desk rows (no parent), 1 = wing, 2 = main
  // module, 3 = sub-page.
  var M = window.JAMALI_MENU || [], kids = {}, stack = [], i, d, f;
  for (i = 0; i < M.length; i++) {
    d = M[i].d || 0;
    f = M[i].folder;
    while (stack.length && stack[stack.length - 1].d >= d) stack.pop();
    if (d > 0 && stack.length) {
      var p = stack[stack.length - 1].folder;
      (kids[p] = kids[p] || []).push(f);
    }
    stack.push({ folder: f, d: d });
  }
  return kids;
}

function staffParentMap() {
  var M = window.JAMALI_MENU || [], par = {}, stack = [], i, d, f;
  for (i = 0; i < M.length; i++) {
    d = M[i].d || 0;
    f = M[i].folder;
    while (stack.length && stack[stack.length - 1].d >= d) stack.pop();
    if (d > 0 && stack.length) par[f] = stack[stack.length - 1].folder;
    stack.push({ folder: f, d: d });
  }
  return par;
}

function staffExpandDown(seeds) {
  // A granted module carries its sub-pages (ward-management opens the
  // ward pages; a custom-ticked wing opens everything under it).
  var kids = staffChildMap(), out = {}, queue = [], i;
  for (i = 0; i < seeds.length; i++) {
    if (!out[seeds[i]]) { out[seeds[i]] = 1; queue.push(seeds[i]); }
  }
  while (queue.length) {
    var cur = queue.shift(), list = kids[cur] || [];
    for (i = 0; i < list.length; i++) {
      if (!out[list[i]]) { out[list[i]] = 1; queue.push(list[i]); }
    }
  }
  return Object.keys(out);
}

function staffExpandUp(set) {
  // Granted modules re-attach their wing ancestors so the sidebar keeps
  // the wing row (and its hub) visible above the granted modules -
  // without granting the wing's other children.
  var par = staffParentMap(), out = {}, i, cur;
  for (i = 0; i < set.length; i++) out[set[i]] = 1;
  for (i = 0; i < set.length; i++) {
    cur = set[i];
    while (par[cur]) { cur = par[cur]; out[cur] = 1; }
  }
  return Object.keys(out);
}

function staffComputeFolders(record) {
  // null = every folder (registry Administrator). [] = nothing granted.
  if (String(record.role || "") === "Administrator") return null;
  var seeds;
  if (String(record.accessMode || "role") === "custom" &&
      Array.isArray(record.modules) && record.modules.length) {
    seeds = record.modules;
  } else {
    var t = STAFF_ROLE_TEMPLATES[String(record.role || "")];
    if (!t) return []; // role not in the catalog: nothing opens until the admin adjusts it
    seeds = t;
  }
  // Templates and custom ticks list plain modules (no wing rows): the
  // set grows DOWN into every sub-page of a granted module and UP into
  // the wing rows that keep the menu readable - never sideways into
  // sibling modules.
  return staffExpandUp(staffExpandDown(seeds));
}

function staffRepaint() {
  try { paintNav(); } catch (e) {}
  try { applySidebarVis(); } catch (e2) {}
  try { filterLinks(document); } catch (e3) {}
  try { jamaliAdminPaint(); } catch (e5) {}
  if (PAGE_ID && current !== "system-admin" && !isAdmin()) {
    var wasBlocked = !!document.querySelector(".jamali-vis-notice");
    if (!wasBlocked) {
      try { guardUserPage(mainEl()); } catch (e4) {}
    } else if (folderAllowed(current)) {
      location.reload(); // this page was blocked and the registry just allowed it
    }
  }
}

function staffApplyEmail() {
  var mail = "";
  try {
    if (auth && auth.currentUser && auth.currentUser.email) {
      mail = String(auth.currentUser.email).toLowerCase();
    }
  } catch (e) {}
  if (!mail) mail = String((activeUser && activeUser.email) || "").toLowerCase();
  if (mail === STAFF_ACCESS.email) return;
  STAFF_ACCESS.email = mail;
  if (!mail) {
    STAFF_ACCESS.watchedEmail = "";
    STAFF_ACCESS.mode = "open";
    STAFF_ACCESS.folders = null;
    STAFF_ACCESS.role = "";
    staffRepaint();
    return;
  }
  STAFF_ACCESS.watchedEmail = mail;
  STAFF_ACCESS.mode = "loading";
  STAFF_ACCESS.folders = null;
  onSnapshot(collection(db, "healthStaff"), function (snap) {
    if (STAFF_ACCESS.watchedEmail !== mail) return; // identity changed while the read was in flight
    var rows = [];
    snap.forEach(function (d) { rows.push(d.data()); });
    var rec = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].email || "").trim().toLowerCase() === mail) { rec = rows[i]; break; }
    }
    if (!rec) {
      // Empty registry = staff onboarding has not started: keep the open
      // model. A non-empty registry without my email = not registered:
      // every menu folder closes, only Home / Staff Roles / the file
      // viewer and the unclassified pages stay reachable.
      STAFF_ACCESS.mode = rows.length ? "unknown" : "open";
      STAFF_ACCESS.folders = rows.length ? [] : null;
      STAFF_ACCESS.role = "";
    } else if (String(rec.status || "Active") === "Suspended") {
      STAFF_ACCESS.mode = "suspended";
      STAFF_ACCESS.folders = [];
      STAFF_ACCESS.role = String(rec.role || "");
    } else {
      STAFF_ACCESS.role = String(rec.role || "");
      var f = staffComputeFolders(rec);
      if (f === null) { STAFF_ACCESS.mode = "member"; STAFF_ACCESS.folders = null; }
      else { STAFF_ACCESS.mode = f.length ? "member" : "nomodules"; STAFF_ACCESS.folders = f; }
    }
    staffRepaint();
  }, function () {
    // Registry unreadable (offline first visit, shim failure): keep the
    // open model - never lock a working facility out of its own system.
    if (STAFF_ACCESS.watchedEmail !== mail) return;
    STAFF_ACCESS.mode = "open";
    STAFF_ACCESS.folders = null;
    STAFF_ACCESS.role = "";
    staffRepaint();
  });
}

 function folderAllowed(folder) {
   // RETURNED (demand 24 Nov 2026): the administrator desk belongs to
   // camelkazembe1@gmail.com only - every other visitor (signed in or
   // anonymous) neither sees the entry nor opens the page.
   if (folder === "system-admin") return isAdmin();
   // BUSINESS ROLES (25 Nov 2026): the administrator email keeps
   // everything; always-open folders, folders outside the menu tree
   // (standalone tools, the comment desk) and the open modes stay open;
   // a signed-in member opens exactly the folders their role - or their
   // custom selection - grants.
   if (isAdmin()) return true;
   if (ALWAYS_OPEN.indexOf(folder) !== -1) return true;
   if (!staffMenuFolders()[folder]) return true;
   if (STAFF_ACCESS.folders === null) return true;
   return STAFF_ACCESS.folders.indexOf(folder) !== -1;
 }

 
 
 var current = location.pathname.split("/")[1];

  
  
  
  
  
  
  
  
  
  
  
  
  // RESERVE (login removed): the session guard that bounced visitors
  // to the login gate (?need=account / ?need=house) and the admin-role
  // gate for the system-admin desk were deactivated with the login
  // system. Every page opens for every visitor now. To restore, see
  // public/RESERVE/README.txt.

    
    
    var PAGE_ID = location.pathname.replace(/^\//, "")
      .replace(/\.html$/, "").replace(/\/+$/, "");

    
    /* URL kept: the address bar stays on the real page */

 
 var PAGES = window.JAMALI_MENU || [];

 
 
 
  // RETURNED (demand 24 Nov 2026): the page-visibility state (VIS /
  // VIS_DOC / VIS_CHANGE) that the administrator's minus and plus
  // pins read and write, ported back out of public/RESERVE/admin/ and
  // wired to the Google identity: the administrator is the signed-in
  // camelkazembe1@gmail.com account and nobody else. The config lives
  // in the cloud document systemPageConfig/visibility (read by every
  // signed-in user, written by the administrator only - see the
  // FIRESTORE_RULES block in SERVER/server.js) with a local mirror in
  // this browser so the last known layout still applies offline.
  var VIS = { fields: {}, menu: {}, options: {} };
  var VIS_DOC = ["systemPageConfig", "visibility"];
  var VIS_CHANGE = null;
  var VIS_LS_KEY = "jamaliPageConfig::visibility";
  function visLocalLoad() {
    try { return JSON.parse(localStorage.getItem(VIS_LS_KEY) || "null"); }
    catch (e) { return null; }
  }
  function visLocalSave() {
    try { localStorage.setItem(VIS_LS_KEY, JSON.stringify(VIS)); } catch (e) {}
  }
  function applyVisData(d) {
    VIS.fields = (d && d.fields) || {};
    VIS.menu = (d && d.menu) || {};
    VIS.options = (d && d.options) || {};
  }
  function visPlain() {
    return { fields: VIS.fields, menu: VIS.menu, options: VIS.options };
  }
  function chainOf(folder) {
    var out = [folder], idx = -1, myD = 0;
    for (var i = 0; i < PAGES.length; i++) {
      if (PAGES[i].folder === folder) { idx = i; myD = PAGES[i].d || 0; break; }
    }
    if (idx < 0 || myD <= 1) return out;
    for (var j = idx - 1; j >= 0; j--) {
      var d = PAGES[j].d || 0;
      if (d === 0) break;
      if (d < myD) { out.unshift(PAGES[j].folder); myD = d; if (d === 1) break; }
    }
    return out;
  }
  function menuHidden(folder) {
    var c = chainOf(folder);
    for (var i = 0; i < c.length; i++) {
      if (VIS.menu[c[i]]) return true;
    }
    return false;
  }
  function pageIdOfFolder(folder) {
    for (var i = 0; i < PAGES.length; i++) {
      if (PAGES[i].folder === folder) return folder + "/" + PAGES[i].n;
    }
    return null;
  }
  function pageHidden(pid) {
    return !!(pid && VIS.fields[pid + ":__page__"]);
  }

  // The quiet net for a patchy connection. A one-shot read whose client
  // is offline, or a watch that cannot reach the server yet, ends as an
  // unhandled FirebaseError in the console. The offline class is not a
  // defect - JAMALI keeps the page working from what it already has and
  // reads resume when the network returns - so this net reports it once,
  // in one calm line, with the same code. Every other rejection still
  // reports exactly as before; nothing is hidden.
  function jamaliOffline(err) {
    var code = err && err.code ? String(err.code) : "";
    var msg = err && err.message ? String(err.message) : "";
    return code === "unavailable" ||
      msg.indexOf("client is offline") !== -1 ||
      msg.indexOf("network error") !== -1;
  }
  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev && ev.reason;
    if (!jamaliOffline(r)) return;
    ev.preventDefault();
    if (!window.__jamaliOfflineLineShown) {
      window.__jamaliOfflineLineShown = true;
      console.warn("The device is offline (" +
        String((r && (r.code || r.message)) || "unavailable") +
        ") - JAMALI keeps working from what it has and resumes when the network returns.");
    }
  });
  window.addEventListener("online", function () {
    window.__jamaliOfflineLineShown = false;
  });

  // RETURNED (demand 24 Nov 2026): the administrator check - the
  // signed-in Google identity is the one authority, and the desk
  // belongs to camelkazembe1@gmail.com only (the same owner email the
  // comment desk already uses). recomputeAdmin repaints the menu, the
  // Admin button and the hidden chip the moment the identity settles
  // or changes, so the tooling appears without a reload.
  var SYSTEM_ADMIN_EMAIL = "camelkazembe1@gmail.com";
  var ADMIN_STATE = { settled: false, admin: false };
  function adminEmail() {
    var mail = "";
    try {
      if (auth && auth.currentUser && auth.currentUser.email) {
        mail = String(auth.currentUser.email).toLowerCase();
      }
    } catch (e) {}
    if (!mail) mail = String((activeUser && activeUser.email) || "").toLowerCase();
    return mail;
  }
  function isAdmin() { return ADMIN_STATE.admin; }
  function recomputeAdmin() {
    var was = ADMIN_STATE.admin;
    ADMIN_STATE.settled = true;
    ADMIN_STATE.admin = adminEmail() === SYSTEM_ADMIN_EMAIL;
    if (was !== ADMIN_STATE.admin) {
      try { paintNav(); } catch (e) {}
      try { jamaliAdminPaint(); } catch (e2) {}
      try { refreshHiddenChip(); } catch (e3) {}
      try { applySidebarVis(); } catch (e4) {}
      var main = mainEl();
      if (ADMIN_STATE.admin) {
        whenStylesReady(function () {
          scanAdminPage(main);
          watchPage(main, function () { scanAdminPage(main); });
        });
      } else {
        try { guardUserPage(main); } catch (e5) {}
      }
    }
  }

  // Firefox warns that layout was forced before the page was fully
  // loaded when a script reads element sizes while the stylesheets are
  // still downloading, and unstyled content can flash. Anything that
  // measures the page goes through this gate: the work runs the moment
  // the page is styled (right away when it already is), with a short
  // fallback so a stuck download can never hold the page hostage.
  function whenStylesReady(fn) {
    var done = false;
    var go = function () {
      if (done) return;
      done = true;
      if (window.requestAnimationFrame) window.requestAnimationFrame(fn);
      else fn();
    };
    if (document.readyState === "complete") { go(); return; }
    window.addEventListener("load", go, { once: true });
    setTimeout(go, 3000);
  }


 
 
 

  
  
  var visible = PAGES.map(function (p) { return folderAllowed(p.folder);
});
  for (var v = 0; v < PAGES.length; v++) {
    if (visible[v]) continue;
    var my = PAGES[v].d || 0;
    if (my === 0) continue;  
    for (var w = v + 1; w < PAGES.length; w++) {
      if ((PAGES[w].d || 0) <= my) break;
      visible[w] = false; 
    }
  }

 

 
 
 function kidsOf(i) {
   var out = [], my = PAGES[i].d || 0;
   if (my === 0) return out;  
   for (var j = i + 1; j < PAGES.length; j++) {
     var dj = PAGES[j].d || 0;
     if (dj <= my) break;
     if (dj === my + 1 && visible[j]) out.push(j);
   }
   return out;
 }
 
 function subtreeHasCurrent(i) {
   if (PAGES[i].folder === current) return true;
   var k = kidsOf(i);
   for (var x = 0; x < k.length; x++) {
     if (subtreeHasCurrent(k[x])) return true;
   }
   return false;
 }

 
 function render(i) {
   var p = PAGES[i];
   var cls = "lv" + (p.d || 0);
   if (p.folder === current || p.folder === (PARENT[current] || "")) cls += " active";
   var href = "/" + p.folder + "/" + p.n;
  var html = "<div class=\"node\" data-folder=\"" + p.folder + "\"><a href=\"" + href +
            "\" class=\"" + cls + "\"><span>" + p.icon + "</span>" +
p.label + "</a>";
   var k = kidsOf(i);
   if (k.length) {
     // RETURNED (demand 24 Nov 2026): for the administrator the folder
     // toggle becomes the red minus that hides this whole area for
     // every user; for everybody else it stays the plain fold toggle.
     var tgAttrs = isAdmin()
       ? " type=\"button\" class=\"tg jamali-menu-hide\" data-mkey=\"" + p.folder + "\""
       : " type=\"button\" class=\"tg\" aria-expanded=\"false\"";
     html += "<button" + tgAttrs + "></button></div>";
     
     
     var open = true;  
     html += "<div class=\"kids\"" + (open ? "" : " hidden") + ">";
     for (var x = 0; x < k.length; x++) html += render(k[x]);
     html += "</div>";
   } else {
     html += "</div>";
   }
   return html;
 }

 
 var nav = "";
 for (var r = 0; r < PAGES.length; r++) {
   if ((PAGES[r].d || 0) <= 1 && visible[r]) nav += render(r);
 }
 if (nav === "") { 
   for (var f = 0; f < PAGES.length; f++) { if (visible[f]) nav += render(f);
}
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
   // (the orphaned account-desk CSS fragments that used to sit here were
   // removed: as top-level garbage they swallowed the nav rule that
   // follows, which stopped the nav from scrolling and pushed the
   // footer out of the fixed sidebar.)

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
   " body.jamali-has-sidebar{padding-top:58px}",
   " body.jamali-has-sidebar{padding-top:58px}",
   " body.jamali-has-sidebar{padding-top:58px}",
   " body.jamali-has-sidebar{padding-top:58px}",
   " #jamali-sidebar{transform:translateX(-100%)}",
   " body.jamali-sidebar-open #jamali-sidebar{transform:none}",
   " #jamali-burger{display:flex}",
   " body.jamali-sidebar-open #jamali-overlay{display:block}}",
   "#jamali-side-foot{flex:0 0 auto;padding:12px 14px;border-top:1px solid #1e293b;background:#0f172a}",
   ".jamali-foot-row{display:flex;align-items:stretch;gap:8px}",
   "#jamali-side-auth{flex:2 1 0;min-width:0;box-sizing:border-box;border:0;border-radius:10px;padding:10px 4px;font-size:14px;font-weight:800;line-height:1.15;cursor:pointer;color:#fff;box-shadow:0 8px 20px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}",
   "#jamali-side-auth small{font-size:9.5px;font-weight:600;opacity:.9;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
   "#jamali-side-auth.login{background:#16a34a}",
   "#jamali-side-auth.login:hover{background:#15803d}",
   "#jamali-side-auth.logout{background:#dc2626}",
   "#jamali-side-auth.logout:hover{background:#b91c1c}",
   "#jamali-side-auth:disabled{opacity:.6;cursor:wait}",
   "#jamali-side-comment{flex:1 1 0;min-width:0;box-sizing:border-box;border:0;border-radius:10px;padding:10px 4px;font-size:16px;line-height:1;cursor:pointer;color:#cbd5e1;background:#1e293b;box-shadow:0 8px 20px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}",
   "#jamali-side-comment small{font-size:10px;font-weight:700;color:#94a3b8}",
   "#jamali-side-comment:hover{background:#334155;color:#fff}",
   "#jamali-side-comment:hover small{color:#e2e8f0}",
   "#jamali-side-gear{flex:1 1 0;min-width:0;box-sizing:border-box;border:0;border-radius:10px;padding:10px 2px;font-size:17px;line-height:1;cursor:pointer;color:#cbd5e1;background:#1e293b;box-shadow:0 8px 20px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}",
   "#jamali-side-gear small{font-size:10px;font-weight:700;color:#94a3b8}",
   "#jamali-side-gear:hover{background:#334155;color:#fff}",
   "#jamali-side-gear:hover small{color:#e2e8f0}",
   "#jamali-owner-comments{position:fixed;top:12px;right:12px;z-index:1001;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font-weight:800;font-size:13.5px;padding:11px 16px;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.45);display:flex;align-items:center;gap:8px}",
   "#jamali-owner-comments:hover{background:#1e293b}",
   "#jamali-owner-comments[hidden]{display:none}",
   "#jamali-side-comment[hidden]{display:none}",
   "#jamali-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:1003;background:#111827;color:#e2e8f0;border:1px solid #334155;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:800;box-shadow:0 14px 34px rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .2s ease}",
   "#jamali-toast.jamali-toast-on{opacity:1}",

   // THE WRITE-COMMENT POPUP - the send half of the comment desk lives
   // here on the sidebar; the receiver page (/comments/390) carries no
   // send setup any more.
   "#jamali-cpop-veil{position:fixed;inset:0;background:rgba(2,6,23,.55);z-index:1004}",
   "#jamali-cpop-veil[hidden]{display:none}",
   "#jamali-cpop{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1005;width:min(520px,92vw);max-height:86vh;overflow-y:auto;background:#111827;border:1px solid #334155;border-radius:14px;padding:16px 18px;color:#e2e8f0;font-size:13.5px;box-shadow:0 18px 44px rgba(0,0,0,.5)}",
   "#jamali-cpop[hidden]{display:none}",
   "#jamali-cpop .cpop-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}",
   "#jamali-cpop .cpop-head b{font-size:15px}",
   "#jamali-cpop-close{border:0;background:none;color:#94a3b8;font-size:19px;line-height:1;cursor:pointer;padding:2px 7px}",
   "#jamali-cpop-close:hover{color:#fff}",
   "#jamali-cpop-from{color:#64748b;font-size:11.5px;margin:-2px 0 8px}",
   "#jamali-cpop-text{width:100%;box-sizing:border-box;border:1px solid #334155;border-radius:9px;background:#0b1220;color:#e2e8f0;font:inherit;padding:9px 10px;resize:vertical;min-height:110px}",
   "#jamali-cpop-text:focus{outline:none;border-color:#0ea5e9}",
   "#jamali-cpop .cpop-under{display:flex;align-items:center;gap:10px;margin-top:8px}",
   "#jamali-cpop .cpop-count{color:#64748b;font-size:11.5px}",
   "#jamali-cpop-send{margin-left:auto;border:0;border-radius:10px;background:#16a34a;color:#fff;font-weight:800;font-size:13.5px;padding:10px 22px;cursor:pointer;transition:background .25s ease}",
   "#jamali-cpop-send:hover{background:#15803d}",
   "#jamali-cpop-send:disabled{opacity:.55;cursor:wait}",
   "#jamali-cpop-send.cpop-sent{background:#2563eb;opacity:1;cursor:default}",
   "#jamali-cpop .msg{border-radius:10px;padding:9px 12px;margin:10px 0 0;line-height:1.5;font-size:12.5px}",
   "#jamali-cpop .msg.cpop-ok{background:#052e16;border:1px solid #4ade80;color:#bbf7d0}",
   "#jamali-cpop .msg.cpop-bad{background:#450a0a;border:1px solid #f87171;color:#fecaca}",


   // RETURNED (24 Nov 2026): the administrator page-config tooling -
   // the red minus pin, the green plus pin, the Hidden chip and panel,
   // the blocked-page notice and the sidebar area minus.
   ".jamali-dash{display:inline-flex;align-items:center;justify-content:center;width:20px;",
   "min-width:20px;max-width:20px;height:20px;box-sizing:border-box;padding:0;",
   "margin:0;border-radius:6px;border:1px solid #fca5a5;background:#fff;",
   "color:#dc2626;font-weight:900;font-size:13px;line-height:1;cursor:pointer}",
   ".jamali-dash:hover{background:#fee2e2}",
   ".jamali-dash.jamali-off{background:#dc2626;color:#fff;border-color:#b91c1c}",
   ".jamali-dash.jamali-plus{background:#f0fdf4;color:#166534;border-color:#86efac}",
   ".jamali-dash.jamali-plus:hover{background:#dcfce7}",
   ".jamali-vis-mark{outline:2px dashed #f87171;outline-offset:2px;outline-style:solid;background-color:rgba(248,113,113,.16)}",
   ".jamali-vis-host{position:relative;padding-right:26px}",
   ".jamali-ctl-host{display:inline-block;position:relative;max-width:100%}",
   ".jamali-ctl-host > input,.jamali-ctl-host > textarea,.jamali-ctl-host > select{padding-right:46px}",
   ".jamali-corner-dash{position:absolute;top:3px;right:3px;margin:0;z-index:7;",
   "width:16px;min-width:16px;max-width:16px;height:16px;font-size:11px;border-radius:5px}",
   ".jamali-corner-dash.jamali-plus{right:23px}",
   ".jamali-ctl-host .jamali-plus:not(.jamali-corner-dash){margin-left:4px}",
   "select.jamali-opts{font:inherit;max-width:100%}",
   "#jamali-hidden-chip{position:fixed;bottom:46px;right:14px;z-index:1001;",
   "border:1px solid #fca5a5;border-radius:999px;background:#dc2626;color:#fff;",
   "font-weight:800;font-size:12px;padding:7px 12px;cursor:pointer;",
   "box-shadow:0 10px 24px rgba(0,0,0,.35)}",
   "#jamali-hidden-chip:hover{filter:brightness(1.08)}",
   "#jamali-vis-panel{position:fixed;bottom:84px;right:14px;z-index:1002;width:340px;",
   "max-width:calc(100vw - 28px);max-height:60vh;overflow:auto;background:#111827;",
   "border:1px solid #334155;border-radius:12px;padding:12px 14px;font-size:13px;",
   "color:#e2e8f0;box-shadow:0 18px 40px rgba(0,0,0,.5)}",
   "#jamali-vis-panel b{display:block;margin-bottom:8px;font-size:13px}",
   "#jamali-vis-panel .jamali-vis-row{display:flex;align-items:center;justify-content:space-between;",
   "gap:8px;padding:6px 0;border-bottom:1px solid #1e293b}",
   "#jamali-vis-panel .jamali-vis-row span{flex:1;min-width:0;overflow:hidden;",
   "text-overflow:ellipsis;white-space:nowrap}",
   ".jamali-vis-show,.jamali-vis-showall{border:1px solid #4ade80;background:#052e16;",
   "color:#4ade80;border-radius:8px;font-size:12px;font-weight:800;padding:4px 10px;",
   "cursor:pointer;flex:0 0 auto}",
   ".jamali-vis-showall{margin-top:10px;width:100%}",
   ".jamali-vis-notice{max-width:560px;margin:60px auto;padding:26px 30px;border:1px solid #fca5a5;",
   "border-radius:14px;background:#fff5f5;color:#7f1d1d;font-size:15px;line-height:1.6}",
   ".jamali-vis-notice b{display:block;font-size:17px;margin-bottom:8px}",
   ".jamali-menu-hide{align-self:center;flex:0 0 24px;width:24px;height:20px;margin:0 6px 0 0;",
   "border:1px solid #fca5a5;border-radius:6px;background:#fff;color:#dc2626;font-weight:900;",
   "font-size:10.5px;line-height:1;cursor:pointer;display:flex;align-items:center;",
   "justify-content:center;padding:0}",
   ".jamali-menu-hide:hover{background:#fee2e2}",
   ".jamali-menu-hide.jamali-off{background:#dc2626;color:#fff;border-color:#b91c1c}",
   ".jamali-menu-hide.jamali-off:hover{filter:brightness(1.08)}",
   ".node.jamali-menu-gone>a{color:#f87171}",
   ".node.jamali-menu-gone>a.active{border-left-color:#f87171}",
   "#jamali-admin-btn{position:fixed;top:60px;right:12px;z-index:1001;border-radius:10px;",
   "border:1px solid #fca5a5;background:#0f172a;color:#fecaca;font-weight:800;font-size:13.5px;",
   "padding:11px 16px;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.45);display:flex;align-items:center;gap:8px}",
   "#jamali-admin-btn:hover{background:#1e293b}",
   "#jamali-admin-btn[hidden]{display:none}"
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

  
  
  var aside = document.createElement("aside");
  aside.id = "jamali-sidebar";
  aside.innerHTML =
    "<div class=\"brand\"><i>JA</i>JAMAL</div>" +
    "<nav>" + nav + "</nav>" +
    // THE FOOTER (25 Nov 2026): ONE line for all three buttons, in the
    // demanded proportions - the Login/Logout button takes 50% of the row,
    // the Comment button 25% and the settings gear 25%. Clicking the gear
    // opens the one settings panel; clicking Comment opens the write popup
    // (login not compulsory - any visitor may write; the owner never sees
    // the button).
    "<div id=\"jamali-side-foot\">" +
    "<div class=\"jamali-foot-row\">" +
    "<button type=\"button\" id=\"jamali-side-auth\" class=\"login\" title=\"Not signed in - click to sign in with Google\">Login</button>" +
    "<button type=\"button\" id=\"jamali-side-comment\" title=\"Write a comment to the owner (no login needed)\">&#128172;<small>Comment</small></button>" +
    "<button type=\"button\" id=\"jamali-side-gear\" title=\"Organisation settings\">&#9881;&#65039;<small>Settings</small></button>" +
    "</div></div>";

 document.body.insertBefore(overlay, document.body.firstChild);
 document.body.insertBefore(aside, document.body.firstChild);
 document.body.insertBefore(burger, document.body.firstChild);
 document.body.classList.add("jamali-has-sidebar");

 /* NOTIFICATION BELL (25 Nov 2026): fixed at the top right of every
  * page, next to nothing - the burger lives top left, the admin desk
  * button sits below it. Shows the unread count badge, opens a small
  * dark panel with the latest notifications of this zone (unread
  * first), marks a row read on click and links to the Notification
  * Center (411) and Notification Settings (412). The engine that
  * feeds it starts here as well, once the identity has settled. */
 (function jamaliBell() {
   var bellCss = [
     "#jamali-bell{position:fixed;top:12px;right:12px;z-index:1002;width:42px;height:42px;",
     "border-radius:11px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:19px;",
     "display:flex;align-items:center;justify-content:center;cursor:pointer;",
     "box-shadow:0 10px 26px rgba(0,0,0,.45);transition:background .2s ease}",
     "#jamali-bell:hover{background:#1e293b}",
     "#jamali-bell .jb-badge[hidden]{display:none}",
     "#jamali-bell .jb-badge{position:absolute;top:-6px;right:-6px;min-width:19px;height:19px;",
     "border-radius:10px;background:#dc2626;color:#fff;font-size:11px;font-weight:800;",
     "display:flex;align-items:center;justify-content:center;padding:0 5px;border:2px solid #0f172a}",
     "#jamali-bell-panel{position:fixed;top:60px;right:12px;z-index:1003;width:min(370px,calc(100vw - 24px));",
     "max-height:min(480px,calc(100vh - 80px));overflow:auto;border-radius:14px;border:1px solid #334155;",
     "background:#0b1220;color:#e2e8f0;box-shadow:0 18px 44px rgba(0,0,0,.55);font-size:13.5px}",
     "#jamali-bell-panel .jb-head{display:flex;align-items:center;gap:8px;padding:12px 14px;",
     "border-bottom:1px solid #1e293b;position:sticky;top:0;background:#0b1220}",
     "#jamali-bell-panel .jb-head b{font-size:14.5px}",
     "#jamali-bell-panel .jb-head .jb-clear{margin-left:auto;border:0;background:none;color:#38bdf8;",
     "font-size:12.5px;cursor:pointer;font-weight:700}",
     "#jamali-bell-panel .jb-item{padding:11px 14px;border-bottom:1px solid #16223b;cursor:pointer;",
     "display:flex;gap:10px;align-items:flex-start}",
     "#jamali-bell-panel .jb-item:hover{background:#101a30}",
     "#jamali-bell-panel .jb-item.is-unread{border-left:3px solid #38bdf8}",
     "#jamali-bell-panel .jb-item .jb-ico{font-size:17px;line-height:1.3}",
     "#jamali-bell-panel .jb-item .jb-t{font-weight:700;font-size:13px}",
     "#jamali-bell-panel .jb-item .jb-m{color:#94a3b8;font-size:12.5px;line-height:1.45;margin-top:2px}",
     "#jamali-bell-panel .jb-item .jb-when{color:#64748b;font-size:11px;margin-top:3px}",
     "#jamali-bell-panel .jb-item .jb-x{margin-left:auto;color:#64748b;font-size:12px;cursor:pointer;",
     "border:0;background:none;flex:0 0 auto;padding:2px}",
     "#jamali-bell-panel .jb-item .jb-x:hover{color:#f87171}",
     "#jamali-bell-panel .jb-empty{padding:22px 16px;color:#64748b;text-align:center;font-size:12.5px}",
     "#jamali-bell-panel .jb-foot{display:flex;gap:8px;padding:11px 14px;position:sticky;bottom:0;",
     "background:#0b1220;border-top:1px solid #1e293b}",
     "#jamali-bell-panel .jb-foot a{flex:1;text-align:center;text-decoration:none;border-radius:9px;",
     "padding:8px 6px;font-weight:800;font-size:12.5px;border:1px solid #334155;color:#bae6fd;background:#0f172a}",
     "#jamali-bell-panel .jb-foot a:hover{border-color:#38bdf8}",
     "#jamali-bell-panel .jb-foot a.jb-primary{background:linear-gradient(135deg,#38bdf8,#0ea5e9);color:#06121f;border:0}"
   ].join("");
   var bellStyle = document.createElement("style");
   bellStyle.textContent = bellCss;
   document.head.appendChild(bellStyle);

   var bellBtn = document.createElement("button");
   bellBtn.id = "jamali-bell";
   bellBtn.type = "button";
   bellBtn.title = "Notifications";
   bellBtn.innerHTML = "<span>\uD83D\uDD14</span><span class=\"jb-badge\" hidden></span>";
   var bellPanel = document.createElement("div");
   bellPanel.id = "jamali-bell-panel";
   bellPanel.hidden = true;
   document.body.appendChild(bellBtn);
   document.body.appendChild(bellPanel);
   // ONE SETTINGS PLACE: the bell panel's Settings button opens the same
   // settings panel the footer gear opens - no settings page behind a link.
   // Delegation: the panel footer is painted on every open, so the click
   // rides the panel container itself.
   bellPanel.addEventListener("click", function (ev) {
     if (ev.target && ev.target.id === "jamali-bell-settings") jamaliSettingsOpen();
   });

   var JNOTIFY = [];
   function jbMillis(ts) {
     if (!ts) return 0;
     if (typeof ts.toMillis === "function") return ts.toMillis();
     var t = new Date(ts).getTime();
     return isNaN(t) ? 0 : t;
   }
   function jbAgo(ts) {
     var ms = jbMillis(ts);
     if (!ms) return "";
     var s = Math.max(1, Math.round((Date.now() - ms) / 1000));
     if (s < 60) return s + "s ago";
     if (s < 3600) return Math.floor(s / 60) + "m ago";
     if (s < 86400) return Math.floor(s / 3600) + "h ago";
     return new Date(ms).toLocaleDateString("en-GB");
   }
   function jbUnread() {
     var n = 0;
     for (var i = 0; i < JNOTIFY.length; i++) if (!JNOTIFY[i].read) n++;
     return n;
   }
   function jbBadge() {
     var b = bellBtn.querySelector(".jb-badge");
     var n = jbUnread();
     b.hidden = !n;
     b.textContent = n > 99 ? "99+" : String(n);
   }
   function jbRender() {
     var sorted = JNOTIFY.slice().sort(function (a, b) {
       return jbMillis(b.createdAt) - jbMillis(a.createdAt);
     });
     var top = sorted.slice(0, 8);
     var html = "<div class=\"jb-head\"><b>\uD83D\uDD14 Notifications</b>" +
       (jbUnread() ? "<button type=\"button\" class=\"jb-clear\">Mark all read</button>" : "") +
       "</div>";
     if (!top.length) {
       html += "<div class=\"jb-empty\">No notifications yet.<br>The engine watches stock levels, payments and invoices in the background - alerts land here.</div>";
     } else {
       for (var i = 0; i < top.length; i++) {
         var n = top[i];
         html += "<div class=\"jb-item" + (n.read ? "" : " is-unread") + "\" data-id=\"" + String(n.id).replace(/\"/g, "&quot;") + "\">" +
           "<span class=\"jb-ico\">\u{1F514}</span>" +
           "<span class=\"jb-main\"><span class=\"jb-t\">" + String(n.title || "Notification").replace(/</g, "&lt;") + "</span>" +
           "<div class=\"jb-m\">" + String(n.message || "").replace(/</g, "&lt;") + "</div>" +
           "<div class=\"jb-when\">" + jbAgo(n.createdAt) + "</div></span>" +
           "<button type=\"button\" class=\"jb-x\" title=\"Delete\">\u2715</button></div>";
       }
     }
     html += "<div class=\"jb-foot\"><a href=\"/notification-center/411\" class=\"jb-primary\">Open Center</a>" +
       "<button type=\"button\" id=\"jamali-bell-settings\">Settings</button></div>";
     bellPanel.innerHTML = html;
   }
   bellBtn.addEventListener("click", function (e) {
     e.stopPropagation();
     bellPanel.hidden = !bellPanel.hidden;
     if (!bellPanel.hidden) jbRender();
   });
   document.addEventListener("click", function (e) {
     if (bellPanel.hidden) return;
     if (bellPanel.contains(e.target) || bellBtn.contains(e.target)) return;
     bellPanel.hidden = true;
   });
   bellPanel.addEventListener("click", function (e) {
     var clear = e.target.closest && e.target.closest(".jb-clear");
     if (clear) {
       for (var i = 0; i < JNOTIFY.length; i++) {
         if (!JNOTIFY[i].read) {
           try { updateDoc(doc(db, "notifications", JNOTIFY[i].id), { read: true }); } catch (e2) {}
         }
       }
       return;
     }
     var del = e.target.closest && e.target.closest(".jb-x");
     if (del) {
       e.stopPropagation();
       var item = del.closest(".jb-item");
       if (item) { try { deleteDoc(doc(db, "notifications", item.dataset.id)); } catch (e3) {} }
       return;
     }
     var row = e.target.closest && e.target.closest(".jb-item");
     if (row && row.dataset.id) {
       var rec = null;
       for (var j = 0; j < JNOTIFY.length; j++) if (JNOTIFY[j].id === row.dataset.id) rec = JNOTIFY[j];
       if (rec && !rec.read) {
         try { updateDoc(doc(db, "notifications", rec.id), { read: true }); } catch (e4) {}
       }
     }
   });
   onSnapshot(collection(db, "notifications"), function (snap) {
     JNOTIFY = (snap.docs || []).map(function (d) {
       var r = d.data({ serverTimestamps: "estimate" }) || {};
       r.id = d.id;
       return r;
     });
     jbBadge();
     if (!bellPanel.hidden) jbRender();
   });
   authReady.then(function () { startNotifyEngine(); });
 })();


 /* The sidebar answers the page: the active item is scrolled into
  * view, so opening the menu always shows where you are. */
 (function jamaliActiveReveal() {
   var navEl = aside.querySelector("nav");
   var act = aside.querySelector("a.active");
   if (!navEl || !act) return;
   requestAnimationFrame(function () {
     var nr = navEl.getBoundingClientRect(), ar = act.getBoundingClientRect();
     navEl.scrollTop += (ar.top - nr.top) - (navEl.clientHeight - ar.height) / 2;
   });
 })();

 /* The sidebar answers the page: the active item is scrolled into
  * view, so opening the menu always shows where you are. */
 (function jamaliActiveReveal() {
   var navEl = aside.querySelector("nav");
   var act = aside.querySelector("a.active");
   if (!navEl || !act) return;
   requestAnimationFrame(function () {
     var nr = navEl.getBoundingClientRect(), ar = act.getBoundingClientRect();
     navEl.scrollTop += (ar.top - nr.top) - (navEl.clientHeight - ar.height) / 2;
   });
 })();

 /* The sidebar answers the page: the active item is scrolled into
  * view, so opening the menu always shows where you are. */
 (function jamaliActiveReveal() {
   var navEl = aside.querySelector("nav");
   var act = aside.querySelector("a.active");
   if (!navEl || !act) return;
   requestAnimationFrame(function () {
     var nr = navEl.getBoundingClientRect(), ar = act.getBoundingClientRect();
     navEl.scrollTop += (ar.top - nr.top) - (navEl.clientHeight - ar.height) / 2;
   });
 })();

 /* The sidebar answers the page: the active item is scrolled into
  * view, so opening the menu always shows where you are. */
 (function jamaliActiveReveal() {
   var navEl = aside.querySelector("nav");
   var act = aside.querySelector("a.active");
   if (!navEl || !act) return;
   requestAnimationFrame(function () {
     var nr = navEl.getBoundingClientRect(), ar = act.getBoundingClientRect();
     navEl.scrollTop += (ar.top - nr.top) - (navEl.clientHeight - ar.height) / 2;
   });
 })();

  
  // RESERVE (login removed): the account desk (the person button with
  // the name card, the Organisation/Personal mode switch, Switch
  // Account, Logout and the total Google logout) was deactivated with
  // the login system. To restore, see public/RESERVE/README.txt.


  
  
  var toast = document.createElement("div");
  toast.id = "jamali-toast";
  toast.setAttribute("role", "status");
  document.body.appendChild(toast);
  var toastTimer = null;
  function jamaliToast(msg) {
    toast.textContent = msg;
    toast.classList.add("jamali-toast-on");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("jamali-toast-on"); }, 2000);
  }
  document.getElementById("jamali-side-comment").addEventListener("click", function () {
    // THE WRITE POPUP: the receiver page (/comments/390) carries no send
    // setup any more - it is the mailbox only. The Comment button opens
    // the write popup right here on any page; the page the visitor is on
    // travels along as the from hint so the owner sees where it came from.
    jamaliCommentPopOpen();
  });

  // THE SETTINGS GEAR (25 Nov 2026): 25% of the one footer row, next to
  // the Login/Logout button's 50% and the Comment button's 25%. Clicking
  // it opens THE one settings panel - every setting the system has lives
  // in it, and it is the only way in since the Organisation Settings and
  // Notification Settings entries left the menu tree and the Home grid.
  document.getElementById("jamali-side-gear").addEventListener("click", function () {
    jamaliSettingsOpen();
  });

  // THE WRITE-COMMENT POPUP - the send half of the comment desk. The
  // receiver page /comments/390 is the mailbox only: no send setup there.
  // Visitors write from this popup on any page (signed in or not) and the
  // comment lands in the shared "comments" collection addressed to the
  // owner (camelkazembe1@gmail.com) with the current page as the from
  // hint - exactly what the desk page used to send.
  (function jamaliCommentPopEnsure() {
    if (document.getElementById("jamali-cpop")) return;
    var veil = document.createElement("div");
    veil.id = "jamali-cpop-veil";
    veil.hidden = true;
    veil.addEventListener("click", jamaliCommentPopClose);
    var pop = document.createElement("div");
    pop.id = "jamali-cpop";
    pop.hidden = true;
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "Write a comment to the owner");
    pop.innerHTML =
      "<div class=\"cpop-head\"><b>&#9997;&#65039; Write a comment</b>" +
      "<button type=\"button\" id=\"jamali-cpop-close\" title=\"Close\">&times;</button></div>" +
      "<div id=\"jamali-cpop-from\"></div>" +
      "<textarea id=\"jamali-cpop-text\" maxlength=\"2000\" placeholder=\"Write your comment - it goes straight to the owner\"></textarea>" +
      "<div class=\"cpop-under\"><span class=\"cpop-count\" id=\"jamali-cpop-count\">0 / 2000</span>" +
      "<button type=\"button\" id=\"jamali-cpop-send\">Send comment</button></div>" +
      "<div class=\"msg\" id=\"jamali-cpop-msg\" hidden></div>";
    document.body.appendChild(veil);
    document.body.appendChild(pop);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !pop.hidden) jamaliCommentPopClose();
    });
    var ta = document.getElementById("jamali-cpop-text");
    var countEl = document.getElementById("jamali-cpop-count");
    ta.addEventListener("input", function () {
      countEl.textContent = ta.value.length + " / 2000";
    });
    document.getElementById("jamali-cpop-close").addEventListener("click", jamaliCommentPopClose);
    document.getElementById("jamali-cpop-send").addEventListener("click", jamaliCommentPopSend);
  })();

  // OPEN TO EVERY VISITOR (demand 25 Nov 2026): no sign-in gate any more -
  // the composer paints for everyone, the from line names the page.
  function jamaliCommentPopOpen() {
    var pop = document.getElementById("jamali-cpop");
    var veil = document.getElementById("jamali-cpop-veil");
    if (!pop || !veil) return;
    document.getElementById("jamali-cpop-from").textContent =
      "from " + (PAGE_ID || "/home/1");
    pop.hidden = false;
    veil.hidden = false;
    var ta = document.getElementById("jamali-cpop-text");
    setTimeout(function () { try { ta.focus(); } catch (e) {} }, 30);
  }

  function jamaliCommentPopClose() {
    var pop = document.getElementById("jamali-cpop");
    var veil = document.getElementById("jamali-cpop-veil");
    if (pop) pop.hidden = true;
    if (veil) veil.hidden = true;
    var msg = document.getElementById("jamali-cpop-msg");
    if (msg) { msg.hidden = true; }
  }

  function jamaliCommentPopSend() {
    var ta = document.getElementById("jamali-cpop-text");
    var send = document.getElementById("jamali-cpop-send");
    var msg = document.getElementById("jamali-cpop-msg");
    if (!ta || !send || !msg) return;
    var text = ta.value.trim();
    msg.className = "msg";
    msg.hidden = true;
    if (!text) {
      msg.className = "msg cpop-bad";
      msg.hidden = false;
      msg.textContent = "Write the comment first - the box is empty.";
      return;
    }
    send.disabled = true;
    import("/sidebar.js").then(function (fb) {
      return fb.commentSend(text, PAGE_ID || "/home/1");
    }).then(function () {
      send.classList.add("cpop-sent");
      send.textContent = "Sent";
      try { jamaliToast("Comment sent - it is in the owner's mailbox."); } catch (e2) {}
      setTimeout(function () {
        send.classList.remove("cpop-sent");
        send.textContent = "Send comment";
        send.disabled = false;
        ta.value = "";
        document.getElementById("jamali-cpop-count").textContent = "0 / 2000";
        jamaliCommentPopClose();
      }, 1600);
    }).catch(function (e) {
      send.disabled = false;
      var m = e && (e.code || e.message) ? (e.code || "") + " " + (e.message || "") : String(e);
      if (String(m).indexOf("permission-denied") !== -1) {
        m += " - the comment desk rules are not published yet. Publish the rules from the Firebase console once, then send again.";
      }
      msg.className = "msg cpop-bad";
      msg.hidden = false;
      msg.textContent = "NOT sent - " + m + " Your text is still here - try again.";
    });
  }

  // SIDEBAR LOGIN / LOGOUT - the optional Google identity button, pinned
  // at the bottom of the fixed sidebar. The system keeps working without
  // any account (anonymous use is untouched); this button only signs a
  // Google identity in or out: green Login when signed out, red Logout
  // (with the account email) when signed in.
  var sideAuthBtn = document.getElementById("jamali-side-auth");
  function sideAuthEscape(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function sideAuthRender(user) {
    if (!sideAuthBtn) return;
    if (user && user.email) {
      sideAuthBtn.className = "logout";
      sideAuthBtn.innerHTML = "Logout<small>" + sideAuthEscape(user.email) + "</small>";
      sideAuthBtn.title = "Signed in with Google - click to sign out";
    } else {
      sideAuthBtn.className = "login";
      sideAuthBtn.innerHTML = "Login";
      sideAuthBtn.title = "Not signed in - click to sign in with Google";
    }
    // The top-right Comments button exists for the owner's eyes only.
    jamaliOwnerPaint(user);
    // The Admin button + the whole page-config tooling ride the same
    // identity - repaint them on every auth change too. The business
    // role gate follows the same identity (login = gate on, logout =
    // open model again).
    recomputeAdmin();
    staffApplyEmail();
  }
  sideAuthRender(null);
  window.JAMALI_SIDEBAR_AUTH = { render: sideAuthRender };
  import("/sidebar.js").then(function (fb) {
    if (!fb || !fb.onAuthStateChanged) return;
    // The Google identity SDK loads asynchronously INSIDE sidebar.js, so
    // fb.auth is still null here more often than not. authSettled()
    // resolves the moment the REAL identity is settled (signed in,
    // anonymous, or offline) - waiting for it instead of racing the boot
    // is what makes the button (and the owner's Comments button) come
    // alive reliably. requireAuth itself now resolves instantly from the
    // identity cache - pages must open with no system loading - so the
    // button waits on authSettled, not on requireAuth.
    (fb.authSettled ? fb.authSettled() : (fb.requireAuth ? fb.requireAuth() : Promise.resolve())).then(function () {
      if (!fb.auth) return; // no connection to Google - quiet anonymous use
      fb.onAuthStateChanged(fb.auth, sideAuthRender);
      sideAuthBtn.addEventListener("click", function () {
        if (fb.auth.currentUser) {
          fb.signOut(fb.auth).then(function () { jamaliToast("Signed out"); })
            .catch(function (e) { jamaliToast("Sign out failed: " + ((e && e.code) || e || "")); });
        } else {
          sideAuthBtn.disabled = true;
          fb.signInWithPopup(fb.auth, fb.provider).then(function () {
            sideAuthBtn.disabled = false;
          }).catch(function (e) {
            sideAuthBtn.disabled = false;
            var code = e && e.code ? String(e.code).replace(/^auth\//, "") : "";
            if (code === "popup-closed-by-user" || code === "cancelled-popup-request") return;
            jamaliToast("Sign in failed: " + (code || "please try again"));
          });
        }
      });
    });
  }).catch(function () {
    // No Firebase (offline or blocked): the button stays a quiet green
    // Login and the system keeps working anonymously, exactly as now.
  });

  // ====================================================================
  // THE COMMENT DESK (22 Nov 2026) - comments travel, data does not.
  // Everything a visitor saves stays in their own browser; a COMMENT is
  // the one exception, because its whole purpose is to reach the owner
  // (camelkazembe1@gmail.com). ANY visitor - signed in or not - clicks
  // the Comment button in the footer row, the write popup opens right
  // there and they send; the comment lands in the shared "comments"
  // collection in the cloud, addressed to the owner. The owner sees a
  // "Comments" button at the top right of every page; it opens the
  // receiver page /comments/390 - the mailbox itself, with NO send setup
  // on it: every comment, newest first, with a delete icon at the end of
  // each one. The database rules enforce the same split: create for
  // anybody, read/delete for the owner only.
  // ====================================================================
  var commentOwnerEmail = "camelkazembe1@gmail.com";
  function jcEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // The top-right Comments button - created once, shown only when the
  // signed-in email is the owner's (jamaliOwnerPaint, from sideAuthRender).
  (function jamaliOwnerButtonEnsure() {
    if (document.getElementById("jamali-owner-comments")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.id = "jamali-owner-comments";
    b.hidden = true;
    b.title = "The comments mailbox - every visitor's comments, newest first";
    b.innerHTML = "&#128172; Comments";
    b.addEventListener("click", function () {
      if (window.JAMALI_INTERNAL_GO) window.JAMALI_INTERNAL_GO("/comments/390");
      else location.replace("/comments/390.html");
    });
    document.body.appendChild(b);
  })();

  function jamaliOwnerPaint(user) {
    var mail = user && user.email ? String(user.email).toLowerCase() : "";
    var isOwner = !!(mail && mail === commentOwnerEmail);
    // The top-right Comments button exists for the owner's eyes only.
    var btn = document.getElementById("jamali-owner-comments");
    if (btn) btn.hidden = !isOwner;
    // THE SIDEBAR RULE: with the owner's email signed in, the footer
    // Comment (write) button is NOT ALLOWED TO BE SEEN - the owner never
    // writes a comment to himself; every other visitor keeps it.
    var writeBtn = document.getElementById("jamali-side-comment");
    if (writeBtn) writeBtn.hidden = isOwner;
  }

  // THE COMMENT PAGE: the receiver (the owner mailbox) lives on its own
  // complete page, /comments/390 (public/comments/), with no send setup
  // on it; the owner's Comments button navigates there. Visitors never
  // need the page - they write from the write popup above.

  // RETURNED (demand 24 Nov 2026): the floating Admin button that opens
  // /system-admin/380 - visible for camelkazembe1@gmail.com only
  // (jamaliAdminPaint, called from recomputeAdmin and sideAuthRender).
  (function jamaliAdminButtonEnsure() {
    if (document.getElementById("jamali-admin-btn")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.id = "jamali-admin-btn";
    b.hidden = true;
    b.title = "Account Administration - the administrator desk";
    b.innerHTML = "&#128737;&#65039; Admin";
    b.addEventListener("click", function () {
      if (window.JAMALI_INTERNAL_GO) window.JAMALI_INTERNAL_GO("/system-admin/380");
      else location.replace("/system-admin/380.html");
    });
    document.body.appendChild(b);
  })();

  function jamaliAdminPaint() {
    var b = document.getElementById("jamali-admin-btn");
    if (b) b.hidden = !isAdmin();
  }



  
  
  
  
  // RESERVE (login removed): the background job that re-read the
  // signed-in account from Firestore and refreshed its grants was
  // deactivated with the login system.


  
  function sync(btn) {
    var box = btn.parentNode.nextElementSibling;
    var open = !!(box && !box.hasAttribute("hidden"));
    btn.textContent = open ? "(\u2212)" : "(+)";
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function wireToggles(scope){
  var tgs=scope.querySelectorAll(".tg");
  for(var t=0;t<tgs.length;t++){
    (function(btn){
      if (isAdmin() && btn.classList.contains("jamali-menu-hide")) {
        // RETURNED (demand 24 Nov 2026): the administrator's sidebar
        // minus - one click hides this whole area (every page under it
        // included) for every user, live. The button turns red while
        // the area is hidden; clicking it again restores it.
        btn.textContent = "(\u2212)";
        btn.addEventListener("click", function () {
          var f = btn.getAttribute("data-mkey");
          if (!f) return;
          makeMenuToggler(f, btn)();
        });
        return;
      }
      sync(btn);
      btn.addEventListener("click",function(){
        var box=btn.parentNode.nextElementSibling;
        if(!box)return;
        if(box.hasAttribute("hidden")){box.removeAttribute("hidden");}
        else{box.setAttribute("hidden","");}
        sync(btn);
      });
    })(tgs[t]);
  }
}
wireToggles(aside);
 
  // RETURNED (demand 24 Nov 2026): paintNav - the sidebar rebuild the
  // visibility config and the admin flip use: recompute the visible
  // rows (the administrator keeps every row and reads the hidden ones
  // from the red minus buttons), repaint the nav and rewire it.
  function paintNav(){
    visible=PAGES.map(function(p){return folderAllowed(p.folder);});
    for(var v=0;v<PAGES.length;v++){
      if(visible[v])continue;
      var my=PAGES[v].d||0;
      for(var w=v+1;w<PAGES.length;w++){
        if((PAGES[w].d||0)<=my)break;
        visible[w]=false;
      }
    }
    var nv=aside.querySelector("nav"),nav2="";
    for(var r=0;r<PAGES.length;r++){
      if((PAGES[r].d||0)<=1&&visible[r])nav2+=render(r);
    }
    if (nav2 === "") {
      for(var f=0;f<PAGES.length;f++){ if(visible[f]) nav2+=render(f); }
    }
    nv.innerHTML=nav2;
    wireToggles(nv);
    try { applySidebarVis(); } catch (e) {}
  }

  // RETURNED (demand 24 Nov 2026): filterLinks - the link hider driven
  // by the visibility config: links to hidden areas and hidden pages
  // disappear from every static page too (the administrator keeps
  // seeing everything).
  function filterLinks(root) {
    var links = (root || document).querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      if (insideJamaliUi(links[i])) continue;
      var href = links[i].getAttribute("href") || "";
      var m = href.match(/^\/([a-z0-9-]+)\//i);
      if (!m) continue;
      if (m[1] === current) continue;
      if (!folderAllowed(m[1])) { links[i].style.display = "none"; continue; }
      var rest = href.slice(m[0].length).replace(/\.html$/, "").replace(/\/+$/, "");
      if (menuHidden(m[1]) || pageHidden(m[1] + "/" + rest)) links[i].style.display = "none";
    }
  }

  // RETURNED (demand 24 Nov 2026): bootVisibility - the visibility
  // config is read from the cloud document systemPageConfig/visibility
  // (every signed-in user reads it; only camelkazembe1@gmail.com can
  // write it), with a live onSnapshot channel and a local mirror so
  // the last known layout still applies offline. The first read is
  // patient with a patchy connection: offline failures are retried a
  // few times with a growing pause and once more the moment the device
  // comes back online, and only a real refusal is reported. Until the
  // configuration arrives the page simply keeps the default full view
  // - nothing waits on the network.
  function bootVisibility() {
    var local = visLocalLoad();
    if (local && typeof local === "object") {
      VIS.fields = local.fields || {};
      VIS.menu = local.menu || {};
      VIS.options = local.options || {};
    }
    return bootCloudFirestore().then(function (h) {
      var ref = h.fs.doc.apply(h.fs, [h.db].concat(VIS_DOC));
      var live = false, timer = null;
      function listenLive() {
        if (live) return;
        live = true;
        h.fs.onSnapshot(ref, function (snap) {
          applyVisData(snap && snap.exists() ? snap.data() : {});
          visLocalSave();
          if (VIS_CHANGE) { try { VIS_CHANGE(); } catch (e) {} }
        }, function (e) {
          console.warn("visibility watch skipped:", e);
        });
      }
      function attempt(tries) {
        if (live) return;
        return h.fs.getDoc(ref).then(function (snap) {
          if (snap && snap.exists()) {
            applyVisData(snap.data());
            visLocalSave();
          }
          listenLive();
        }).catch(function (e) {
          if (live) return;
          if (!jamaliOffline(e) || tries >= 5) {
            console.warn("visibility load skipped:", e);
            return;
          }
          timer = setTimeout(function () { attempt(tries + 1); },
            Math.min(15000, 1500 * tries));
        });
      }
      window.addEventListener("online", function () {
        if (timer) { clearTimeout(timer); timer = null; }
        attempt(1);
      });
      window.addEventListener("offline", function () {
        if (timer) { clearTimeout(timer); timer = null; }
      });
      return attempt(1);
    }).catch(function (e) {
      console.warn("visibility load skipped:", e);
    });
  }

  
  
  
  
  

 
 


 
  // RETURNED (demand 24 Nov 2026): mainEl and pageBoot - the admin
  // page scan (minus/plus pins on every field and button) and the
  // user page guard (pages the administrator hid get blocked with a
  // clear notice; everything else applies the user hides live).
  function mainEl() {
    return document.getElementById("app") ||
document.querySelector("main") || document.body;
  }

  function pageBoot() {
    if (!PAGE_ID) return;
    if (current === "system-admin") return;
    var main = mainEl();
    var run = function () {
      VIS_CHANGE = liveVisChange;
      if (isAdmin()) {
        // The administrator's page scan reads element sizes too - it
        // waits for a styled page the same way the sidebar folding does.
        whenStylesReady(function () {
          scanAdminPage(main);
          watchPage(main, function () { scanAdminPage(main); });
        });
      } else {
        guardUserPage(main);
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run);
    } else {
      run();
    }
  }

 
 
 
 
  // RETURNED (demand 24 Nov 2026): the whole page-config tooling,
  // ported back from public/RESERVE/admin/ and rewired from the old
  // /502.js import to the current module: the cloud handle comes from
  // bootCloudFirestore(), the identity authority is isAdmin() (the
  // signed-in camelkazembe1@gmail.com account), and every save also
  // updates the local mirror so the layout survives being offline.

  function hasAnyGrant() {
    // BUSINESS ROLES (25 Nov 2026): the open modes (anonymous, loading,
    // unreadable registry, empty registry, registry Administrator)
    // always pass - the only thing that hides anything for them is the
    // administrator's visibility config. A registered member with zero
    // granted modules waits for the admin allowance notice.
    if (STAFF_ACCESS.folders === null) return true;
    return STAFF_ACCESS.folders.length > 0;
  }

  // BUSINESS ROLES (25 Nov 2026): the page guard for role-gated pages.
  // The message tells the member why: not in the registry, suspended,
  // or the module simply sits outside their role.
  function blockStaffPage() {
    var app = document.getElementById("app");
    if (app) {
      app.style.display = "none";
    } else {
      var kids = Array.prototype.slice.call(document.body.children);
      for (var i = 0; i < kids.length; i++) {
        var id = kids[i].id || "";
        if (id.indexOf("jamali-") === 0) continue;
        kids[i].style.display = "none";
      }
    }
    var head = "", body = "";
    if (STAFF_ACCESS.mode === "unknown") {
      head = "Your account is not in the Staff Roles registry yet.";
      body = "<span>Signed in as <b>" + (STAFF_ACCESS.email || "this Google account") +
        "</b>, but no staff row carries this email. The administrator adds staff on the " +
        "<a href=\"/staff-roles/399\">Staff Roles</a> page - until then only Home and " +
        "Staff Roles open for you.</span>";
    } else if (STAFF_ACCESS.mode === "suspended") {
      head = "This account is suspended.";
      body = "<span>The Staff Roles registry holds <b>" + (STAFF_ACCESS.email || "this account") +
        "</b> with status <b>Suspended</b>. Only Home and Staff Roles open while the " +
        "suspension stands.</span>";
    } else {
      head = "This module is not part of your role.";
      body = "<span>Your role" + (STAFF_ACCESS.role ? " (<b>" + STAFF_ACCESS.role + "</b>)" : "") +
        " does not open this module. The administrator can widen it on the " +
        "<a href=\"/staff-roles/399\">Staff Roles</a> page - by moving you to another role " +
        "or by giving your row a custom module selection.</span>";
    }
    var n = document.createElement("div");
    n.className = "jamali-vis-notice";
    n.innerHTML = "<b>" + head + "</b>" + body;
    document.body.appendChild(n);
  }

  function guardUserPage(main) {
    if (menuHidden(current) || pageHidden(PAGE_ID)) { blockPage(); return; }
    // BUSINESS ROLES (25 Nov 2026): the role gate first - an unknown or
    // suspended account gets its own clear notice (blockStaffPage), a
    // zero-module member gets the allowance notice, and an ordinary
    // member outside this module gets the role notice. The old
    // visibility-config block stays in front of everything.
    if (ALWAYS_OPEN.indexOf(current) === -1 && !folderAllowed(current)) {
      if (STAFF_ACCESS.mode === "unknown" || STAFF_ACCESS.mode === "suspended") { blockStaffPage(); return; }
      if (!hasAnyGrant()) { blockAllowance(); return; }
      blockStaffPage(); return;
    }
    if (ALWAYS_OPEN.indexOf(current) === -1 && !hasAnyGrant()) { if (current === "home") { blankHome(main); return; } blockAllowance(); return; }
    applyUserHides(main);
    watchPage(main, function () { applyUserHides(main); });
  }

  function blankHome(main) {
    try { if (main) main.style.display = "none"; } catch (e) {}
  }

  function blockAllowance() {
    var app = document.getElementById("app");
    if (app) {
      app.style.display = "none";
    } else {
      var kids = Array.prototype.slice.call(document.body.children);
      for (var i = 0; i < kids.length; i++) {
        var id = kids[i].id || "";
        if (id.indexOf("jamali-") === 0) continue;
        kids[i].style.display = "none";
      }
    }
    var n = document.createElement("div");
    n.className = "jamali-vis-notice";
    n.innerHTML = "<b>Please wait for admin module allowance.</b>" +
      "<span>Your account is approved, but the administrator has not allowed any module for it yet. " +
      "You will see your modules here as soon as the administrator selects them for you.</span>";
    document.body.appendChild(n);
  }

  function blockPage() {
    var app = document.getElementById("app");
    if (app) {
      app.style.display = "none";
    } else {
      var kids = Array.prototype.slice.call(document.body.children);
      for (var i = 0; i < kids.length; i++) {
        var id = kids[i].id || "";
        if (id.indexOf("jamali-") === 0) continue;
        kids[i].style.display = "none";
      }
    }
    var n = document.createElement("div");
    n.className = "jamali-vis-notice";
    n.innerHTML = "<b>This page is not available for your account.</b>" +
      "<span>It was hidden by the administrator. " +
      "Use the menu on the left, or ask the administrator (camelkazembe1@gmail.com) to grant you access.</span>";
    document.body.appendChild(n);
  }

  function slug(text) {
    return String(text || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 40);
  }

  function insideJamaliUi(el) {
    return !!(el.closest && el.closest("#jamali-sidebar,#jamali-acct,#jamali-admin-btn,#jamali-burger,#jamali-overlay,.jamali-vis-notice,#jamali-hidden-chip,#jamali-vis-panel,#jamali-settings,#jamali-owner-comments,#jamali-cpop,#jamali-cpop-veil"));
  }

  function isVisibleEl(el) {
    if (el.closest && el.closest("[hidden]")) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function scanTargets(root) {
    var map = {}, seq = 0;
    function put(key, el, wrap, labelEl) {
      if (!key) return;
      // Two controls may share a label or carry no id at all; give the
      // second one a numbered key so every field and every button gets
      // its own dash and its own hide state, stable across rescans.
      var k = key, n = 2;
      while (map[k]) { k = key + "-" + n; n++; }
      map[k] = { el: el, wrap: wrap || null, labelEl: labelEl || null, dash: null };
    }
    var ctrls = root.querySelectorAll("input, select, textarea");
    for (var i = 0; i < ctrls.length; i++) {
      var c = ctrls[i];
      if (c.type === "hidden" || c.classList.contains("jamali-opts") ||
          insideJamaliUi(c) ||
          (!isVisibleEl(c) && !c._jamaliDash && !c.hasAttribute("data-jamali-opts") && !c.hasAttribute("data-jamali-gone"))) continue;
      var row = c.closest ? c.closest("label") : null;
      if (row && !insideJamaliUi(row)) {
        var multi = row.querySelectorAll("input,select,textarea,button").length > 1;
        put(c.id || ("row-" + (slug(row.textContent) || ("x" + (++seq)))), c, multi ? null : row, null);
      } else {
        var lab = null;
        if (c.id && /^[A-Za-z0-9_-]+$/.test(c.id)) {
          lab = root.querySelector('label[for="' + c.id + '"]');
        }
        put(c.id || ("row-" + (slug(c.name || c.type) || ("x" + (++seq)))), c, null, lab);
      }
    }
    var btns = root.querySelectorAll("button");
    for (var j = 0; j < btns.length; j++) {
      var b = btns[j];
      if (b.classList.contains("jamali-dash") || b.classList.contains("tg")) continue;
      if (insideJamaliUi(b) || (!isVisibleEl(b) && !b._jamaliDash && !b.hasAttribute("data-jamali-gone"))) continue;
      put(b.id || ("btn-" + (slug(b.textContent) || ("x" + (++seq)))), b, null, null);
    }
    return map;
  }

  function fieldsForPage() {
    var out = {}, prefix = PAGE_ID + ":";
    for (var k in VIS.fields) {
      if (Object.prototype.hasOwnProperty.call(VIS.fields, k) && k.indexOf(prefix) === 0) {
        out[k.slice(prefix.length)] = true;
      }
    }
    return out;
  }

  function optionsForPage() {
    var out = {}, prefix = PAGE_ID + ":";
    for (var k in VIS.options) {
      if (Object.prototype.hasOwnProperty.call(VIS.options, k) && k.indexOf(prefix) === 0) {
        var v = VIS.options[k];
        if (Array.isArray(v) && v.length) out[k.slice(prefix.length)] = v;
      }
    }
    return out;
  }

  function fireInput(el) {
    var evs = ["input", "change"];
    for (var i = 0; i < evs.length; i++) {
      try { el.dispatchEvent(new Event(evs[i], { bubbles: true })); } catch (e) {}
    }
  }

  // The predefined-options swap: the original input stays in the DOM (the
  // page's own script keeps reading and writing it), it is just hidden and a
  // select is placed in its spot, mirroring every choice back into it.
  function applyFieldOptions(el, list) {
    var sel = el._jamaliOpts || null;
    if (!list || !list.length) {
      if (sel && sel.parentNode) sel.parentNode.removeChild(sel);
      el._jamaliOpts = null;
      if (el.getAttribute("data-jamali-opts")) {
        el.removeAttribute("data-jamali-opts");
        if (!el.getAttribute("data-jamali-gone")) el.style.display = "";
      }
      return;
    }
    if (!sel) {
      sel = document.createElement("select");
      sel.className = "jamali-opts";
      sel.addEventListener("change", function () {
        if (el.value === sel.value) return;
        el.value = sel.value;
        fireInput(el);
      });
      el._jamaliOpts = sel;
      if (el.parentNode) el.parentNode.insertBefore(sel, el.nextSibling);
      else document.body.appendChild(sel);
    }
    if (!el._jamaliOptsWired) {
      el._jamaliOptsWired = true;
      el.addEventListener("change", function () {
        if (el._jamaliOpts && el._jamaliOpts.value !== el.value) el._jamaliOpts.value = el.value;
      });
    }
    var cur = el.value == null ? "" : String(el.value);
    var items = list.slice();
    if (cur && items.indexOf(cur) === -1) items.unshift(cur);
    // Rebuild the option children only when the list really changed;
    // rebuilding on every scan would keep re-firing the page watcher.
    var sig = JSON.stringify(items);
    if (sel._jamaliSig !== sig) {
      sel._jamaliSig = sig;
      sel.innerHTML = "";
      for (var i = 0; i < items.length; i++) {
        var o = document.createElement("option");
        o.value = items[i];
        o.textContent = items[i];
        sel.appendChild(o);
      }
    }
    var want = (cur && items.indexOf(cur) !== -1) ? cur : items[0];
    sel.value = want;
    if (el.value !== want) { el.value = want; fireInput(el); }
    el.style.display = "none";
    if (!el.getAttribute("data-jamali-opts")) el.setAttribute("data-jamali-opts", "1");
    sel.style.display = "";
    sel.removeAttribute("data-jamali-gone");
  }

  function applyUserHides(root) {
    var map = scanTargets(root);
    var hidden = fieldsForPage();
    var opts = optionsForPage();
    for (var key in map) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
      var t = map[key], el = t.el;
      var isField = el.tagName !== "BUTTON";
      var off = effHidden(key, el, hidden);
      if (off) {
        // Ordinary users lose the control completely - the field, its
        // label and its wrapping row all close up, so no empty space and
        // no trace that the control ever existed is left behind.
        var host = t.wrap || el;
        host.style.display = "none";
        host.setAttribute("data-jamali-gone", "1");
        if (t.labelEl && t.labelEl !== host) {
          t.labelEl.style.display = "none";
          t.labelEl.setAttribute("data-jamali-gone", "1");
        }
        if (el !== host) el.style.display = "none";
        if (!el.getAttribute("data-jamali-gone")) el.setAttribute("data-jamali-gone", "1");
      } else {
        if (el.getAttribute("data-jamali-gone")) {
          el.removeAttribute("data-jamali-gone");
          if (!el.getAttribute("data-jamali-opts")) el.style.display = "";
        }
        if (t.wrap && t.wrap.getAttribute("data-jamali-gone")) {
          t.wrap.removeAttribute("data-jamali-gone");
          t.wrap.style.display = "";
        }
        if (t.labelEl && t.labelEl.getAttribute("data-jamali-gone")) {
          t.labelEl.removeAttribute("data-jamali-gone");
          t.labelEl.style.display = "";
        }
      }
      if (isField) {
        applyFieldOptions(el, opts[key]);
        var sel = el._jamaliOpts;
        if (sel) sel.style.display = off ? "none" : "";
      }
    }
  }

  // The + control: define the option list ordinary users must pick from.
  function makeOptions(key, el, btn) {
    return function () {
      var full = PAGE_ID + ":" + key;
      var cur = Array.isArray(VIS.options[full]) ? VIS.options[full].join(" | ") : "";
      var ans = window.prompt(
        "Predefined options for this field. Separate them with | - users " +
        "will pick from this list only. Leave empty to go back to free typing:",
        cur);
      if (ans === null) return;
      var parts = ans.split(/\||\n/), list = [];
      for (var i = 0; i < parts.length; i++) {
        var v = parts[i].trim();
        if (v && list.indexOf(v) === -1) list.push(v);
      }
      bootCloudFirestore().then(function (h) {
        return h.fs.getDoc(h.fs.doc.apply(h.fs, [h.db].concat(VIS_DOC))).then(function (snap) {
          var d = snap.exists() ? snap.data() : {};
          VIS.fields = d.fields || {};
          VIS.menu = d.menu || {};
          VIS.options = d.options || {};
          if (list.length) VIS.options[full] = list;
          else delete VIS.options[full];
          return saveVisibility();
        });
      }).then(function () {
        afterVisChange();
      }).catch(function (e) {
        console.warn("options save failed", e);
        dashError(btn);
      });
    };
  }

  function scanAdminPage(root) {
    var map = scanTargets(root);
    var hidden = fieldsForPage();
    var opts = optionsForPage();
    for (var key in map) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
      var t = map[key], el = t.el;
      var isField = el.tagName !== "BUTTON";
      if (!el._jamaliDash) {
        var dash = document.createElement("button");
        dash.type = "button";
        dash.className = "jamali-dash";
        dash.textContent = "\u2212";
        dash.addEventListener("click", makeToggler(key, dash));
        el._jamaliDash = dash;
        placeDash(t, dash);
      }
      if (isField && !el._jamaliPlus) {
        var plus = document.createElement("button");
        plus.type = "button";
        plus.className = "jamali-dash jamali-plus" +
          (el._jamaliDash.classList.contains("jamali-corner-dash") ? " jamali-corner-dash" : "");
        plus.textContent = "+";
        plus.title = "Predefined options - users must pick from this list";
        plus.addEventListener("click", makeOptions(key, el, plus));
        el._jamaliPlus = plus;
        var dh = el._jamaliDash;
        if (dh && dh.parentNode) dh.parentNode.insertBefore(plus, dh.nextSibling);
        else placeDash(t, plus);
      }
      var off = effHidden(key, el, hidden);
      setDashState(el._jamaliDash, off, isField ? "this field" : "this button");
      if (isField) applyFieldOptions(el, opts[key]);
      var mark = (isField && el._jamaliOpts) ? el._jamaliOpts : el;
      mark.classList.toggle("jamali-vis-mark", !!off);
      if (isField && el._jamaliOpts) el._jamaliOpts.style.display = "";
    }
  }

  function effHidden(key, el, hidden) {
    if (hidden[key]) return true;
    var p = el ? el.parentElement : null;
    while (p && p !== document.body) {
      var k = p.getAttribute && p.getAttribute("data-jamali-key");
      if (k && hidden[k]) return true;
      p = p.parentElement;
    }
    return false;
  }

  function placeDash(t, b) {
    if (b.parentNode) return;
    var host = t.wrap || t.el;
    var tag = host.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
      // Tiny controls (checkbox, radio) keep the dash beside them; every
      // other field gets the dash pinned to its top-right corner.
      var sp = document.createElement("span");
      sp.className = "jamali-ctl-host";
      host.parentNode.insertBefore(sp, host);
      sp.appendChild(host);
      sp.appendChild(b);
      if (host.type !== "checkbox" && host.type !== "radio") {
        b.classList.add("jamali-corner-dash");
      }
      return;
    }
    host.classList.add("jamali-vis-host");
    b.classList.add("jamali-corner-dash");
    host.insertBefore(b, host.firstChild);
  }

  function makeToggler(key, btn) {
    return function () {
      bootCloudFirestore().then(function (h) {
        return h.fs.getDoc(h.fs.doc.apply(h.fs, [h.db].concat(VIS_DOC))).then(function (snap) {
          var d = snap.exists() ? snap.data() : {};
          VIS.fields = d.fields || {};
          VIS.menu = d.menu || {};
          VIS.options = d.options || {};
          var full = PAGE_ID + ":" + key;
          if (VIS.fields[full]) delete VIS.fields[full]; else VIS.fields[full] = true;
          return saveVisibility();
        });
      }).then(function () {
        afterVisChange();
      }).catch(function (e) {
        console.warn("visibility save failed", e);
        dashError(btn);
      });
    };
  }

  // The sidebar area minus: hides (or restores) a whole menu area for every
  // user. If the area is hidden only by itself the click restores it; if it
  // is hidden because an ancestor is hidden, the click restores that
  // nearest hidden ancestor, since a child of a hidden parent can never
  // show on its own.
  function makeMenuToggler(folder, btn) {
    return function () {
      bootCloudFirestore().then(function (h) {
        return h.fs.getDoc(h.fs.doc.apply(h.fs, [h.db].concat(VIS_DOC))).then(function (snap) {
          var d = snap.exists() ? snap.data() : {};
          VIS.fields = d.fields || {};
          VIS.menu = d.menu || {};
          VIS.options = d.options || {};
          if (VIS.menu[folder]) delete VIS.menu[folder];
          else {
            var top = nearestHiddenAncestor(folder);
            if (top) delete VIS.menu[top];
            else VIS.menu[folder] = true;
          }
          return saveVisibility();
        });
      }).then(function () {
        afterVisChange();
      }).catch(function (e) {
        console.warn("menu visibility save failed", e);
        menuToggleError(btn);
      });
    };
  }

  function menuToggleError(btn) {
    btn.textContent = "!";
    setTimeout(function () { btn.textContent = "(\u2212)"; }, 1500);
  }

  // The nearest ancestor of the folder that is hidden in its own right;
  // chainOf returns the folder last, so the walk starts at its parent.
  function nearestHiddenAncestor(folder) {
    var c = chainOf(folder);
    for (var i = c.length - 2; i >= 0; i--) {
      if (VIS.menu[c[i]]) return c[i];
    }
    return null;
  }

  function labelOf(folder) {
    for (var i = 0; i < PAGES.length; i++) {
      if (PAGES[i].folder === folder) return PAGES[i].label || folder;
    }
    return folder;
  }

  function afterVisChange() {
    applySidebarVis();
    scanAdminPage(mainEl());
    refreshHiddenChip();
  }

  // Fired by the live cloud channel: the administrator changed the
  // visibility document somewhere, so re-apply everything right here.
  function liveVisChange() {
    applySidebarVis();
    try { filterLinks(document); } catch (e) {}
    if (!PAGE_ID || current === "system-admin") return;
    var blocked = menuHidden(current) || pageHidden(PAGE_ID);
    if (!isAdmin() && blocked && !document.querySelector(".jamali-vis-notice")) {
      // The page this user is reading has just been hidden from the
      // administrator's sidebar minus - block it on the spot, no reload.
      blockPage();
      return;
    }
    if (!isAdmin() && document.querySelector(".jamali-vis-notice") && !blocked) {
      // This page was blocked before and the administrator has just
      // allowed it again - a reload brings the real page in.
      location.reload();
      return;
    }
    var main = mainEl();
    if (isAdmin()) { scanAdminPage(main); refreshHiddenChip(); }
    else if (!blocked) applyUserHides(main);
  }

  function watchPage(root, fn) {
    if (!window.MutationObserver) return;
    var t = null;
    new MutationObserver(function () {
      if (t) clearTimeout(t);
      t = setTimeout(fn, 350);
    }).observe(root, { childList: true, subtree: true,
      attributes: true, attributeFilter: ["hidden", "style", "class"] });
  }

  function applySidebarVis() {
    var nodes = document.querySelectorAll("#jamali-sidebar .node[data-folder]");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var f = node.getAttribute("data-folder");
      var gone = menuHidden(f) || pageHidden(pageIdOfFolder(f));
      if (isAdmin()) {
        // The administrator keeps the whole tree on screen and reads the
        // hidden areas from the red minus buttons, so restoring is one
        // click away; ordinary users get the rows removed completely.
        node.style.display = "";
        var kx = node.nextElementSibling;
        if (kx && kx.classList && kx.classList.contains("kids")) kx.style.display = "";
        node.classList.toggle("jamali-menu-gone", gone);
        continue;
      }
      node.classList.remove("jamali-menu-gone");
      node.style.display = gone ? "none" : "";
      if (gone) {
        var nx = node.nextElementSibling;
        if (nx && nx.classList && nx.classList.contains("kids")) nx.style.display = "none";
      }
    }
    if (isAdmin()) {
      var mhs = document.querySelectorAll("#jamali-sidebar .tg.jamali-menu-hide");
      for (var m = 0; m < mhs.length; m++) {
        var mf = mhs[m].getAttribute("data-mkey");
        if (!mf) continue;
        var mg = menuHidden(mf);
        mhs[m].classList.toggle("jamali-off", mg);
        var top = mg ? nearestHiddenAncestor(mf) : null;
        mhs[m].title = !mg
          ? "Hide this area for every user - its sub-pages hide with it. Click again to restore."
          : (top
            ? ("Hidden under " + labelOf(top) + " - click to restore that area and everything under it")
            : "Hidden for every user - click to restore it");
      }
      return;
    }
    var tgl = document.querySelectorAll("#jamali-sidebar .tg");
    // Folding an empty area reads element sizes, so it waits for a
    // styled page - measuring while the stylesheets are still
    // downloading forces a layout on unstyled content.
    whenStylesReady(function () {
      for (var j = 0; j < tgl.length; j++) {
        var box = tgl[j].parentNode.nextElementSibling;
        if (!box || !box.classList || !box.classList.contains("kids")) continue;
        var rows = box.querySelectorAll(".node");
        var alive = 0;
        for (var r = 0; r < rows.length; r++) {
          if (isVisibleEl(rows[r])) alive++;
        }
        if (!alive) {
          tgl[j].style.display = "none";
          box.style.display = "none";
        } else {
          tgl[j].style.display = "";
          box.style.display = "";
        }
      }
    });
  }

  function setDashState(b, off, what) {
    b.classList.toggle("jamali-off", !!off);
    b.title = off
      ? "Hidden — restore it from the Hidden panel (bottom-right)"
      : "Click to hide " + what + " completely (restore from the Hidden panel)";
  }

  function saveVisibility() {
    visLocalSave();
    return bootCloudFirestore().then(function (h) {
      return h.fs.setDoc(h.fs.doc.apply(h.fs, [h.db].concat(VIS_DOC)), {
        scope: "visibility",
        fields: VIS.fields,
        menu: VIS.menu,
        options: VIS.options,
        updatedBy: SYSTEM_ADMIN_EMAIL,
        updatedAt: h.fs.serverTimestamp()
      });
    }).catch(function (e) {
      console.warn("visibility save to the online database failed - the layout is kept on this device:", e);
    });
  }

  function dashError(b) {
    b.textContent = "!";
    setTimeout(function () { b.textContent = "-"; }, 1500);
  }

  function hiddenItems() {
    var out = [];
    for (var k in VIS.menu) {
      if (Object.prototype.hasOwnProperty.call(VIS.menu, k) && VIS.menu[k]) {
        out.push({ kind: "menu", key: k });
      }
    }
    for (var f in VIS.fields) {
      if (Object.prototype.hasOwnProperty.call(VIS.fields, f) && VIS.fields[f]) {
        out.push({ kind: "field", key: f });
      }
    }
    return out;
  }

  function hiddenLabel(it) {
    if (it.kind === "menu") return "Area: " + labelOf(it.key);
    var i = it.key.indexOf(":");
    var page = it.key.slice(0, i), k = it.key.slice(i + 1);
    return k === "__page__" ? ("Page: " + page) : (k + " — " + page);
  }

  function ensureHiddenChip() {
    if (document.getElementById("jamali-hidden-chip")) return;
    var c = document.createElement("button");
    c.type = "button";
    c.id = "jamali-hidden-chip";
    c.hidden = true;
    c.title = "Everything the dashes hid — click to restore any of it";
    c.addEventListener("click", function () {
      var p = document.getElementById("jamali-vis-panel");
      if (!p) return;
      p.hidden = !p.hidden;
      if (!p.hidden) renderHiddenPanel();
    });
    document.body.appendChild(c);
  }

  function ensureVisPanel() {
    if (document.getElementById("jamali-vis-panel")) return;
    var p = document.createElement("div");
    p.id = "jamali-vis-panel";
    p.hidden = true;
    document.body.appendChild(p);
  }

  function refreshHiddenChip() {
    if (!isAdmin()) return;
    ensureHiddenChip();
    ensureVisPanel();
    var c = document.getElementById("jamali-hidden-chip");
    var n = hiddenItems().length;
    c.hidden = n === 0;
    c.textContent = "Hidden (" + n + ")";
    var p = document.getElementById("jamali-vis-panel");
    if (p && !p.hidden) renderHiddenPanel();
  }

  function renderHiddenPanel() {
    var p = document.getElementById("jamali-vis-panel");
    if (!p) return;
    var items = hiddenItems();
    p.innerHTML = "";
    var h = document.createElement("b");
    h.textContent = "Hidden by the administrator";
    p.appendChild(h);
    if (!items.length) {
      var e = document.createElement("div");
      e.className = "jamali-vis-row";
      e.textContent = "Nothing is hidden.";
      p.appendChild(e);
      return;
    }
    for (var i = 0; i < items.length; i++) {
      (function (it) {
        var row = document.createElement("div");
        row.className = "jamali-vis-row";
        var s = document.createElement("span");
        s.textContent = hiddenLabel(it);
        var b = document.createElement("button");
        b.type = "button";
        b.className = "jamali-vis-show";
        b.textContent = "Show";
        b.addEventListener("click", function () { restoreItem(it); });
        row.appendChild(s);
        row.appendChild(b);
        p.appendChild(row);
      })(items[i]);
    }
    var all = document.createElement("button");
    all.type = "button";
    all.className = "jamali-vis-showall";
    all.textContent = "Show all";
    all.addEventListener("click", showAllHidden);
    p.appendChild(all);
  }

  function clearGoneMarks() {
    var gones = document.querySelectorAll("[data-jamali-gone]");
    for (var g = 0; g < gones.length; g++) {
      gones[g].removeAttribute("data-jamali-gone");
      gones[g].style.display = "";
    }
  }

  function restoreItem(it) {
    bootCloudFirestore().then(function (h) {
      return h.fs.getDoc(h.fs.doc.apply(h.fs, [h.db].concat(VIS_DOC))).then(function (snap) {
        var d = snap.exists() ? snap.data() : {};
        VIS.fields = d.fields || {};
        VIS.menu = d.menu || {};
        VIS.options = d.options || {};
        if (it.kind === "menu") delete VIS.menu[it.key];
        else delete VIS.fields[it.key];
        return saveVisibility();
      });
    }).then(function () {
      clearGoneMarks();
      afterVisChange();
      var p = document.getElementById("jamali-vis-panel");
      if (p && !p.hidden) renderHiddenPanel();
    }).catch(function (e) {
      console.warn("restore failed", e);
    });
  }

  function showAllHidden() {
    bootCloudFirestore().then(function (h) {
      return h.fs.getDoc(h.fs.doc.apply(h.fs, [h.db].concat(VIS_DOC))).then(function (snap) {
        var d = snap.exists() ? snap.data() : {};
        VIS.options = d.options || {};
        VIS.fields = {};
        VIS.menu = {};
        return saveVisibility();
      });
    }).then(function () {
      clearGoneMarks();
      afterVisChange();
      renderHiddenPanel();
    }).catch(function (e) {
      console.warn("restore all failed", e);
    });
  }

  // THE BOOT CHAIN: read the visibility config (cloud + live channel +
  // local mirror), then paint the sidebar state, hide the right links,
  // and boot the page scan / guard.
  bootVisibility().then(function () {
    applySidebarVis();
    try { filterLinks(document); } catch (flErr) { console.warn("filterLinks skipped:", flErr); }
    if (isAdmin()) { ensureHiddenChip(); ensureVisPanel(); refreshHiddenChip(); }
    pageBoot();
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      try { filterLinks(document); } catch (flErr) { console.warn("filterLinks skipped:", flErr); }
    });
  } else {
    try { filterLinks(document); } catch (flErr) { console.warn("filterLinks skipped:", flErr); }
  }
  authSettled().then(function () { recomputeAdmin(); staffApplyEmail(); }).catch(function () { staffApplyEmail(); });


 
  

  
  
  



  
  

  /* ======================================================================
     Settings (the gear) with the Data Deletion Workflow.
     RESERVE (gear removed 20 Nov 2026): the Comment button replaced the
     gear in the footer row, and nothing opens this panel any more. The
     whole panel below still works - to restore it, add a button that
     calls jamaliSettingsOpen().
     - The gear opened a real Settings panel; the AI button is untouched.
     - "Show Delete Data" opens the deletion section:
         * personal use (no account) and administrator accounts delete
           their data directly: warning -> confirmation -> permanent
           deletion (a retention copy is archived into
           systemDeletionAudit first) -> success message;
         * organisation accounts never delete shared data directly:
           warning -> confirmation -> reason -> final confirmation ->
           the request lands in systemDeletionRequests, the data stays
           untouched, and the administrator decides it in Data
           Deletion Requests;
       decisions come back here live in "My deletion requests" plus a
       notification record written by the administrator.
     - The database rules carry the real authority: anything outside
       this flow is refused server-side.
     ====================================================================== */
  /* JD-DELETE-MODULE-START */
  var SETTINGS_EL = null;
  var SETTINGS_MINE_UNSUB = null;
  var MINE_REQS = [];

  var DEL_SCOPE_LIB = {
    business: { key: "business", label: "Business & accounting", collections: ["transactions"] },
    stock: { key: "stock", label: "Stock management", collections: ["stockItems", "stockChanges"] },
    health: { key: "health", label: "Hospital & health records", collections: [
      "healthRegistrations", "healthTriage", "healthNurseConsultations",
      "healthDoctorConsultations", "healthPrescriptions", "healthTreatmentOrders",
      "healthDestinations", "healthWards", "healthBeds", "healthBedAssignments",
      "healthBedTransfers", "healthBedMaintenance", "healthAdmissions",
      "healthDischarges", "healthLabRequests", "healthImagingRequests",
      "healthQueueConfig", "healthReferrals", "healthAudit",
      "healthStaff", "healthTelemedicine", "healthBirths",
      "healthDeaths", "healthBranches"
    ] }
  };

  function jdEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function delErrText(e) {
    var m = e && (e.code || e.message) ? (e.code || "") + " " + (e.message || "") : String(e);
    if (String(m).indexOf("permission-denied") !== -1) {
      return m + " - the database refused this. The updated firestore.rules must be published in the Firebase console first.";
    }
    return m;
  }

  function jamaliTs(t) {
    try { return t && t.toDate ? t.toDate().getTime() : 0; } catch (e) { return 0; }
  }

  function delChipClass(st) {
    var map = { pending: "jd-chip-wait", approved: "jd-chip-go", completed: "jd-chip-go", rejected: "jd-chip-no", failed: "jd-chip-no" };
    return map[String(st || "pending")] || "jd-chip-wait";
  }

  function delHasPending(list) {
    var L = list || MINE_REQS;
    for (var i = 0; i < L.length; i++) {
      if (String(L[i].r && L[i].r.status) === "pending") return true;
    }
    return false;
  }

  function delScopesForMe() {
    // Personal use (no account) and administrator accounts may delete
    // every data group. An organisation account only the groups behind
    // its granted modules - the same grants that open its pages - so a
    // user can never ask to delete data outside their own authority.
    var M = window.JAMALI_MENU || [];
    function subtree(root) {
      var out = [], open = false, depth = 0;
      for (var i = 0; i < M.length; i++) {
        var d = M[i].d || 0;
        if (!open) {
          if (M[i].folder === root) { open = true; depth = d; out.push(M[i].folder); }
          continue;
        }
        if (d <= depth) break;
        out.push(M[i].folder);
      }
      return out;
    }
    // BUSINESS ROLES (25 Nov 2026): the open modes (anonymous personal
    // use, unreadable registry, registry Administrator) keep the old
    // everything-scope; a registered member may only request deletion
    // of the data groups behind their granted modules - the same grants
    // that open their pages - and a suspended or unknown account may
    // not request any deletion at all.
    var all = isAdmin() || (session && session.role === "admin") ||
      STAFF_ACCESS.mode !== "member" || STAFF_ACCESS.folders === null;
    // In member mode the scopes ride the staff folder set; the dormant
    // account-system session grants keep working for a restored login.
    var g = (STAFF_ACCESS.mode === "member" && Array.isArray(STAFF_ACCESS.folders))
      ? STAFF_ACCESS.folders
      : ((session && Array.isArray(session.grants)) ? session.grants : []);
    function hit(set) {
      if (all) return true;
      for (var i = 0; i < set.length; i++) { if (g.indexOf(set[i]) !== -1) return true; }
      return false;
    }
    var stockT = subtree("stock-management");
    var bizT = subtree("business"), bizOnly = [];
    for (var b = 0; b < bizT.length; b++) { if (stockT.indexOf(bizT[b]) === -1) bizOnly.push(bizT[b]); }
    var healthT = subtree("health");
    var out = [];
    if (hit(bizOnly)) out.push(DEL_SCOPE_LIB.business);
    if (hit(stockT)) out.push(DEL_SCOPE_LIB.stock);
    if (hit(healthT)) out.push(DEL_SCOPE_LIB.health);
    return out;
  }

  function jamaliDeleteActor(fb) {
    var u = fb.auth && fb.auth.currentUser;
    return {
      uid: u ? u.uid : "",
      email: u && u.email ? String(u.email || "").toLowerCase() : "",
      label: session ? (session.username || "account") : "personal use"
    };
  }

  function jamaliSettingsOpen() {
    if (!SETTINGS_EL) jamaliSettingsBuild();
    SETTINGS_EL.hidden = !SETTINGS_EL.hidden;
    if (!SETTINGS_EL.hidden) { jamaliSettingsPaint(); jamaliMineStart(); }
  }

  function jamaliSettingsBuild() {
    var st = document.createElement("style");
    st.textContent = [
      "#jamali-settings{position:fixed;top:60px;right:14px;z-index:1002;width:380px;max-width:calc(100vw - 28px);",
      "max-height:calc(100vh - 90px);overflow:auto;background:#111827;border:1px solid #334155;border-radius:14px;",
      "padding:14px 16px;color:#e2e8f0;font-size:13.5px;box-shadow:0 18px 40px rgba(0,0,0,.5)}",
      "#jamali-settings .jd-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}",
      "#jamali-settings .jd-head b{font-size:15px}",
      "#jamali-settings .jd-close{border:0;background:none;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:8px}",
      "#jamali-settings .jd-close:hover{background:#1e293b;color:#fff}",
      "#jamali-settings .jd-who{border-bottom:1px solid #1e293b;padding-bottom:8px;margin-bottom:10px}",
      "#jamali-settings .jd-who b{display:block;font-size:13.5px}",
      "#jamali-settings .jd-who span{color:#94a3b8;font-size:12.5px}",
      "#jamali-settings .jd-zone{border:1px solid #1e3a5f;background:#0b1220;color:#7dd3fc;border-radius:10px;padding:8px 10px;margin:8px 0;font-size:12px;line-height:1.5}",
      "#jamali-settings .jd-zone b{display:block;font-size:12px;color:#bae6fd}",
      "#jamali-settings .jd-cap{font-size:11px;font-weight:800;letter-spacing:.5px;color:#64748b;margin:10px 0 6px;text-transform:uppercase}",
      "#jamali-settings #jd-show-del{display:block;width:100%;text-align:left;border:1px solid #334155;background:#0b1220;",
      "color:#e2e8f0;border-radius:10px;padding:10px 12px;font-size:13.5px;font-weight:700;cursor:pointer}",
      "#jamali-settings #jd-show-del:hover{background:#1e293b}",
      "#jamali-settings .jd-warn{border:1px solid #fca5a5;background:#450a0a;color:#fecaca;border-radius:10px;padding:10px 12px;margin:6px 0 10px;line-height:1.5}",
      "#jamali-settings .jd-warn b{display:block;margin-bottom:2px}",
      "#jamali-settings .jd-scopes{display:flex;flex-direction:column;gap:6px;margin:8px 0}",
      "#jamali-settings .jd-scope{display:flex;gap:8px;align-items:flex-start;border:1px solid #334155;border-radius:10px;padding:8px 10px;cursor:pointer}",
      "#jamali-settings .jd-scope:hover{background:#1e293b}",
      "#jamali-settings .jd-scope input{margin-top:2px}",
      "#jamali-settings .jd-scope b{display:block;font-size:13px}",
      "#jamali-settings .jd-scope i{display:block;font-style:normal;color:#94a3b8;font-size:11.5px;margin-top:2px}",
      "#jamali-settings .jd-msg{border-radius:10px;padding:9px 12px;margin:8px 0;line-height:1.5;font-size:13px}",
      "#jamali-settings .jd-msg.jd-ok{background:#052e16;border:1px solid #4ade80;color:#bbf7d0}",
      "#jamali-settings .jd-msg.jd-bad{background:#450a0a;border:1px solid #f87171;color:#fecaca}",
      "#jamali-settings .jd-none{color:#94a3b8;font-size:12.5px;padding:6px 0}",
      "#jamali-settings .jd-danger{display:block;width:100%;border:0;border-radius:10px;background:#dc2626;color:#fff;",
      "font-weight:800;font-size:13.5px;padding:11px 0;cursor:pointer;margin-top:6px}",
      "#jamali-settings .jd-danger:hover{background:#b91c1c}",
      "#jamali-settings .jd-danger:disabled,#jamali-settings .jd-primary:disabled{opacity:.55;cursor:default}",
      "#jamali-settings .jd-primary{display:block;width:100%;border:0;border-radius:10px;background:#0ea5e9;color:#fff;",
      "font-weight:800;font-size:13.5px;padding:11px 0;cursor:pointer;margin-top:8px}",
      "#jamali-settings .jd-primary[hidden]{display:none}",
      "#jamali-settings .jd-primary:hover{background:#0284c7}",
      "#jamali-settings .jd-reason{display:block;margin:8px 0 0;color:#cbd5e1;font-size:12.5px}",
      "#jamali-settings .jd-reason b{display:block;margin-bottom:5px}",
      "#jamali-settings .jd-reason textarea{width:100%;box-sizing:border-box;border:1px solid #334155;border-radius:9px;",
      "background:#0b1220;color:#e2e8f0;font:inherit;padding:8px 10px;resize:vertical}",
      "#jamali-settings .jd-decisions{margin:8px 0}",
      "#jamali-settings .jd-decision{border:1px solid #334155;background:#0b1220;border-radius:10px;padding:8px 10px;",
      "margin-bottom:6px;line-height:1.5;font-size:12.5px}",
      "#jamali-settings .jd-decision i{display:block;color:#64748b;font-style:normal;font-size:11px;margin-top:3px}",
      "#jamali-settings .jd-list{display:flex;flex-direction:column;gap:6px;margin-top:4px}",
      "#jamali-settings .jd-item{border:1px solid #334155;border-radius:10px;padding:8px 10px}",
      "#jamali-settings .jd-f{display:block;margin:6px 0;color:#cbd5e1;font-size:12.5px}",
      "#jamali-settings .jd-f input,#jamali-settings .jd-f select{display:block;width:100%;box-sizing:border-box;margin-top:3px;",
      "border:1px solid #334155;border-radius:9px;background:#0b1220;color:#e2e8f0;font:inherit;padding:8px 10px}",
      "#jamali-settings .jd-tg{display:flex;flex-direction:column;gap:5px;margin:6px 0}",
      "#jamali-settings .jd-tg label{display:flex;gap:8px;align-items:center;border:1px solid #334155;border-radius:9px;",
      "padding:7px 10px;font-size:12.5px;color:#e2e8f0;cursor:pointer}",
      "#jamali-settings .jd-tg label:hover{background:#1e293b}",
      "#jamali-settings .jd-item-top{display:flex;align-items:center;gap:8px}",
      "#jamali-settings .jd-what{flex:1;min-width:0;font-size:12.5px;color:#cbd5e1}",
      "#jamali-settings .jd-chip{font-size:10.5px;font-weight:900;letter-spacing:.5px;border-radius:999px;padding:3px 8px;flex:0 0 auto}",
      "#jamali-settings .jd-chip-wait{background:#7c2d12;color:#fdba74}",
      "#jamali-settings .jd-chip-go{background:#14532d;color:#86efac}",
      "#jamali-settings .jd-chip-no{background:#7f1d1d;color:#fca5a5}",
      "#jamali-settings .jd-detail{color:#e2e8f0;font-size:12.5px;margin-top:5px;line-height:1.5}",
      "#jamali-settings .jd-when{color:#64748b;font-size:11px;margin-top:3px}"
    ].join("");
    document.head.appendChild(st);
    SETTINGS_EL = document.createElement("div");
    SETTINGS_EL.id = "jamali-settings";
    SETTINGS_EL.setAttribute("role", "dialog");
    SETTINGS_EL.hidden = true;
    document.body.appendChild(SETTINGS_EL);
  }

  function jamaliSettingsPaint() {
    if (!SETTINGS_EL) return;
    var h = "";
    h += "<div class=\"jd-head\"><b>Organisation Settings</b><button type=\"button\" class=\"jd-close\" title=\"Close\">&#215;</button></div>";
    h += "<div class=\"jd-who\"><b></b><span></span></div>";
    h += "<div class=\"jd-zone\" id=\"jd-zone\"><b>Data lives in this browser</b><span>checking the data zone&hellip;</span></div>";
    h += "<div class=\"jd-cap\">Data</div>";
    // EXPORT TO ONLINE DATABASE (demand 23 Nov 2026): when the user is
    // signed in, one click copies this browser's local database to the
    // database defined on the server - into the signed-in user's own
    // container (data/<email>__personal/...), which the Firestore rules
    // already allow. Anonymous visitors see only the sign-in hint.
    h += "<button type=\"button\" id=\"jd-export\" class=\"jd-primary\" hidden>Export to online database</button>";
    h += "<div class=\"jd-msg\" id=\"jd-export-msg\" hidden></div>";
    h += "<div class=\"jd-none\" id=\"jd-export-hint\" hidden>Sign in with Google to export this browser's data to the online database.</div>";
    h += "<button type=\"button\" id=\"jd-show-del\">Show Delete Data</button>";
    h += "<div id=\"jd-del-body\" hidden></div>";
    h += "<div id=\"jd-mine\"></div>";
    // ONE SETTINGS PLACE (demand 25 Nov 2026): every setting the system has
    // lives in this panel - Data (export + delete) above, Speaker settings
    // (the 34 module pages' voice config) and Notification settings (the
    // engine's events, channels and recipients) here. The per-page Speaker
    // blocks and the Notification Settings menu entry stand down; the pages'
    // Speaker buttons just open this panel.
    h += "<div class=\"jd-cap\">Speaker settings</div>";
    h += "<div id=\"jd-speaker\"></div>";
    h += "<div class=\"jd-cap\">Notification settings</div>";
    h += "<div id=\"jd-notify\"></div>";
    SETTINGS_EL.innerHTML = h;
    SETTINGS_EL.querySelector(".jd-close").addEventListener("click", function () {
      SETTINGS_EL.hidden = true;
    });
    var w = SETTINGS_EL.querySelector(".jd-who");
    w.querySelector("b").textContent = session ? (session.username || "account") : "Personal use (no account)";
    w.querySelector("span").textContent = session
      ? (session.role === "admin" ? "administrator" : (session.position || "user"))
      : "full owner of this system";
    SETTINGS_EL.querySelector("#jd-show-del").addEventListener("click", function () {
      var body = SETTINGS_EL.querySelector("#jd-del-body");
      body.hidden = !body.hidden;
      if (!body.hidden) jamaliDeletePaint(body);
    });
    jamaliMinePaint(SETTINGS_EL.querySelector("#jd-mine"));
    jamaliZonePaint();
    jamaliExportPaint();
    jamaliSpeakerPaint();
    jamaliNotifyPaint();
  }

  // The export row: signed-in users get the button, anonymous visitors
  // get the sign-in hint. Repainted on every settings open and on auth
  // changes, so the button appears the moment Google settles.
  function jamaliExportPaint() {
    var btn = SETTINGS_EL.querySelector("#jd-export");
    var hint = SETTINGS_EL.querySelector("#jd-export-hint");
    if (!btn || !hint) return;
    import("/sidebar.js").then(function (fb) {
      var signed = !!(fb && fb.localZone && fb.localZone().signedIn);
      btn.hidden = !signed;
      hint.hidden = signed;
      if (fb && fb.onAuthStateChanged) {
        fb.onAuthStateChanged(null, function () {
          if (!SETTINGS_EL || SETTINGS_EL.hidden) return;
          var nowSigned = !!(fb.localZone && fb.localZone().signedIn);
          btn.hidden = !nowSigned;
          hint.hidden = nowSigned;
        });
      }
    }).catch(function () {});
    btn.addEventListener("click", jamaliExportRun);
  }

  function jamaliExportRun() {
    var btn = SETTINGS_EL.querySelector("#jd-export");
    var msg = SETTINGS_EL.querySelector("#jd-export-msg");
    if (!btn || !msg) return;
    btn.disabled = true;
    msg.hidden = false;
    msg.className = "jd-msg";
    msg.textContent = "Copying this browser's local database to the online database\u2026";
    import("/sidebar.js").then(function (fb) {
      if (!fb || !fb.exportLocalToCloud) {
        throw new Error("The export engine is not loaded on this page yet - reopen the settings and try again.");
      }
      return fb.exportLocalToCloud(function (p) {
        if (p && p.total) {
          msg.textContent = "Copying to the online database\u2026 " + p.done + " / " + p.total + " records";
        }
      });
    }).then(function (r) {
      btn.disabled = false;
      msg.className = "jd-msg jd-ok";
      var zones = (r && r.zones && r.zones.length) ? r.zones.join(", ") : "none";
      msg.textContent = "Exported " + (r ? r.records : 0) + " records from " + (r ? r.collections : 0) +
        " collections (zones: " + zones + ") into the online database container " +
        (r ? r.container : "") + "." +
        (r && r.skipped ? " " + r.skipped + " oversize records were skipped." : "") +
        " Collection names and document ids are preserved - exporting again overwrites the same records, it never duplicates.";
    }).catch(function (e) {
      btn.disabled = false;
      msg.className = "jd-msg jd-bad";
      msg.textContent = delErrText(e);
    });
  }

  // The data-zone line: where this browser's records are stored. It is
  // always Local Storage; the zone is "anonymous" or the signed-in email.
  function jamaliZonePaint() {
    var box = SETTINGS_EL.querySelector("#jd-zone");
    if (!box) return;
    import("/sidebar.js").then(function (fb) {
      if (!fb || !fb.localZone) return;
      var z = fb.localZone();
      var b = box.querySelector("b");
      var s = box.querySelector("span");
      if (b) b.textContent = "Data lives in this browser's Local Storage";
      if (s) s.textContent = "Zone: " + z.label + " - it survives refreshing, closing and reopening the browser. " +
        "Nobody else's data mixes in, and clearing the browser's site data clears it.";
    }).catch(function () {});
  }

  function jamaliDeletePaint(body) {
    var scopes = delScopesForMe();
    var direct = !session || session.role === "admin";
    var h = "";
    h += "<div class=\"jd-cap\">Delete Data</div>";
    h += "<div class=\"jd-warn\"><b>Permanent deletion.</b> Data removed here cannot be recovered. " +
      (direct
        ? "A retention copy goes into the deletion audit record first, then the data is permanently deleted."
        : "Organisation data is never deleted directly - your request goes to the administrator with your reason, and the data stays untouched until they decide.") +
      "</div>";
    if (!scopes.length) {
      h += "<div class=\"jd-none\">Your account has no data groups available, so there is nothing you are authorised to delete.</div>";
    } else {
      h += "<div class=\"jd-scopes\">";
      for (var i = 0; i < scopes.length; i++) {
        h += "<label class=\"jd-scope\"><input type=\"checkbox\" value=\"" + scopes[i].key + "\" checked> " +
          "<span><b>" + jdEsc(scopes[i].label) + "</b><i>" + jdEsc(scopes[i].collections.join(", ")) + " - counting&hellip;</i></span></label>";
      }
      h += "</div>";
      h += "<div class=\"jd-msg\" hidden></div>";
      if (direct) {
        h += "<button type=\"button\" id=\"jd-run\" class=\"jd-danger\">Delete Data Permanently</button>";
      } else {
        h += "<div id=\"jd-req\" hidden>";
        h += "<label class=\"jd-reason\"><b>Reason for the deletion request (required)</b>";
        h += "<textarea id=\"jd-why\" rows=\"3\" placeholder=\"Explain why this data must be deleted\"></textarea></label>";
        h += "<button type=\"button\" id=\"jd-submit\" class=\"jd-primary\">Submit deletion request</button>";
        h += "</div>";
        h += "<button type=\"button\" id=\"jd-ask\" class=\"jd-primary\">Delete Data</button>";
      }
    }
    body.innerHTML = h;
    body._jdCounts = {};
    jamaliCountsPaint(body, scopes);
    jamaliDecisionsPaint(body);
    var run = body.querySelector("#jd-run");
    if (run) run.addEventListener("click", function () { jamaliDirectRun(body, scopes); });
    var ask = body.querySelector("#jd-ask");
    if (ask) ask.addEventListener("click", function () { jamaliAskRun(body); });
    var sub = body.querySelector("#jd-submit");
    if (sub) sub.addEventListener("click", function () { jamaliRequestSubmit(body, scopes); });
  }

  function jamaliCountsPaint(body, scopes) {
    import("/sidebar.js").then(function (fb) {
      var box = body.querySelector(".jd-scopes");
      if (!box) return;
      scopes.forEach(function (s) {
        var total = 0, errs = 0;
        var jobs = s.collections.map(function (c) {
          return fb.getDocs(fb.collection(fb.db, c)).then(function (snap) {
            total += snap.size;
          }).catch(function () { errs++; });
        });
        Promise.all(jobs).then(function () {
          body._jdCounts[s.key] = errs ? -1 : total;
          var inp = box.querySelector('input[value="' + s.key + '"]');
          if (!inp) return;
          var line = inp.parentNode.querySelector("i");
          if (line) {
            line.textContent = s.collections.join(", ") + " - " +
              (errs ? "count unavailable" : (total ? total + " document" + (total === 1 ? "" : "s") : "already empty"));
          }
        });
      });
    }).catch(function () {});
  }

  function jamaliCollectChosen(body, scopes) {
    var boxes = body.querySelectorAll(".jd-scope input:checked");
    var out = [];
    for (var i = 0; i < boxes.length; i++) {
      for (var j = 0; j < scopes.length; j++) {
        if (scopes[j].key === boxes[i].value) out.push(scopes[j]);
      }
    }
    return out;
  }

  function jamaliSay(body, m, bad) {
    var msg = body.querySelector(".jd-msg");
    if (!msg) return;
    msg.hidden = !m;
    msg.textContent = m || "";
    msg.className = "jd-msg" + (bad ? " jd-bad" : " jd-ok");
  }

  // ---- direct path: personal use and administrator accounts ----
  function jamaliDirectRun(body, scopes) {
    var chosen = jamaliCollectChosen(body, scopes);
    if (!chosen.length) { jamaliSay(body, "Select at least one data group first.", true); return; }
    var cols = [];
    chosen.forEach(function (s) { s.collections.forEach(function (c) { cols.push(c); }); });
    if (!window.confirm(
      "PERMANENT DELETION\n\nThe selected data in " + cols.join(", ") +
      " will be permanently deleted. A retention copy goes into the deletion audit record first, " +
      "then every document is removed. This cannot be undone.\n\nDelete now?")) return;
    var run = body.querySelector("#jd-run");
    if (run) { run.disabled = true; run.textContent = "Deleting..."; }
    jamaliSay(body, "Working: reading the data, writing the retention archive, then deleting...", false);
    import("/sidebar.js").then(function (fb) {
      return jamaliDeleteExecute(fb, chosen, { kind: "direct", requestId: "" });
    }).then(function (fin) {
      if (fin.aborted) {
        jamaliSay(body, "Nothing was deleted - " + fin.error, true);
      } else if (fin.totalFailed && !fin.totalDeleted) {
        jamaliSay(body, "Deletion FAILED - nothing was removed. " + (fin.results[0] && fin.results[0].error ? fin.results[0].error : ""), true);
      } else if (fin.totalFailed) {
        jamaliSay(body, "Partially deleted: " + fin.totalDeleted + " document" + (fin.totalDeleted === 1 ? "" : "s") +
          " deleted, " + fin.totalFailed + " failed. The audit record shows exactly what happened.", true);
      } else if (fin.totalDeleted) {
        jamaliSay(body, "Deletion successful: " + fin.totalDeleted + " document" + (fin.totalDeleted === 1 ? "" : "s") +
          " permanently deleted.", false);
        jamaliToast("Deletion successful: " + fin.totalDeleted + " document" + (fin.totalDeleted === 1 ? "" : "s") + " permanently deleted");
      } else {
        jamaliSay(body, "Nothing to delete - the selected groups are already empty.", false);
      }
      if (run) { run.disabled = false; run.textContent = "Delete Data Permanently"; }
      jamaliCountsPaint(body, scopes);
    }).catch(function (e) {
      jamaliSay(body, "Deletion failed - nothing was removed. " + delErrText(e), true);
      if (run) { run.disabled = false; run.textContent = "Delete Data Permanently"; }
    });
  }

  // ---- request path: organisation accounts ----
  function jamaliAskRun(body) {
    if (!window.confirm(
      "PERMANENT DELETION WARNING\n\nYou are asking to permanently delete the selected data groups for the whole organisation. " +
      "Nothing is deleted until the administrator approves your request.")) return;
    var req = body.querySelector("#jd-req");
    if (req) req.hidden = false;
    var ask = body.querySelector("#jd-ask");
    if (ask) ask.hidden = true;
    var why = body.querySelector("#jd-why");
    if (why) why.focus();
  }

  function jamaliRequestSubmit(body, scopes) {
    var chosen = jamaliCollectChosen(body, scopes);
    if (!chosen.length) { jamaliSay(body, "Select at least one data group first.", true); return; }
    var why = body.querySelector("#jd-why");
    var reason = why ? String(why.value || "").trim() : "";
    if (!reason) {
      jamaliSay(body, "A reason is required - tell the administrator why this data must be deleted.", true);
      if (why) why.focus();
      return;
    }
    if (delHasPending()) {
      jamaliSay(body, "You already have a pending deletion request - the administrator has not decided it yet. " +
        "It is listed under My deletion requests below.", true);
      return;
    }
    var counts = body._jdCounts || {};
    var lines = chosen.map(function (s) {
      var c = counts[s.key];
      return s.label + " (" + s.collections.join(", ") + ")" +
        (typeof c === "number" && c >= 0 ? " - " + c + " document" + (c === 1 ? "" : "s") : "");
    }).join("\n");
    if (!window.confirm(
      "SUBMIT DELETION REQUEST\n\nYou: " + (session && session.username ? session.username : "account") +
      "\nData groups:\n" + lines + "\n\nReason: " + reason +
      "\n\nNothing is deleted now. The data stays untouched while the request waits, " +
      "the administrator reviews it and decides, and you are notified of the decision. Submit it?")) return;
    var sub = body.querySelector("#jd-submit");
    if (sub) { sub.disabled = true; sub.textContent = "Submitting..."; }
    import("/sidebar.js").then(function (fb) {
      var me = fb.auth && fb.auth.currentUser;
      if (!me) throw new Error("You are not signed in with Google any more - log in again first.");
      return fb.addDoc(fb.collection(fb.db, "systemDeletionRequests"), {
        type: "data-deletion",
        status: "pending",
        requesterUid: me.uid,
        requesterEmail: String(me.email || "").toLowerCase(),
        requesterUsername: (session && session.username) || "",
        requesterPosition: (session && session.position) || "",
        accountId: String((session && session.username) || "").toLowerCase(),
        organisation: "jamal",
        scopes: chosen.map(function (s) { return s.key; }),
        scopeDetails: chosen.map(function (s) {
          var c = counts[s.key];
          return {
            key: s.key,
            label: s.label,
            collections: s.collections.slice(),
            docsAtRequest: (typeof c === "number" && c >= 0) ? c : 0
          };
        }),
        reason: reason,
        decision: null,
        execution: null,
        createdAt: fb.serverTimestamp()
      });
    }).then(function () {
      jamaliSay(body, "Your deletion request was submitted. The data stays untouched until the administrator decides - " +
        "you will see the decision here and under My deletion requests.", false);
      var req = body.querySelector("#jd-req");
      if (req) req.hidden = true;
      if (why) why.value = "";
      jamaliToast("Deletion request submitted to the administrator");
    }).catch(function (e) {
      jamaliSay(body, "Could not submit the request: " + delErrText(e), true);
    }).then(function () {
      if (sub) { sub.disabled = false; sub.textContent = "Submit deletion request"; }
    });
  }

  // ---- decisions written by the administrator, shown to the requester ----
  function jamaliDecisionsPaint(body) {
    if (!session) return;
    import("/sidebar.js").then(function (fb) {
      var me = fb.auth && fb.auth.currentUser;
      if (!me) return;
      var q = fb.query(fb.collection(fb.db, "systemNotifications"),
        fb.where("googleUid", "==", me.uid), fb.where("type", "==", "deletion"));
      return fb.getDocs(q).then(function (snap) {
        var rows = [];
        snap.forEach(function (d) { rows.push(d.data()); });
        if (!rows.length || !body.isConnected) return;
        rows.sort(function (a, b) { return jamaliTs(b.at) - jamaliTs(a.at); });
        var h = "<div class=\"jd-decisions\"><div class=\"jd-cap\">Notifications from the administrator</div>";
        for (var i = 0; i < rows.length && i < 5; i++) {
          var t = jamaliTs(rows[i].at);
          h += "<div class=\"jd-decision\">" + jdEsc(rows[i].message || "") +
            (t ? "<i>" + new Date(t).toLocaleString() + "</i>" : "") + "</div>";
        }
        h += "</div>";
        var anchor = body.querySelector(".jd-msg");
        if (anchor) anchor.insertAdjacentHTML("beforebegin", h);
      });
    }).catch(function () {});
  }

  // ---- my deletion requests, live ----
  function jamaliMineStart() {
    if (!session || SETTINGS_MINE_UNSUB) return;
    import("/sidebar.js").then(function (fb) {
      var me = fb.auth && fb.auth.currentUser;
      if (!me) return;
      var q = fb.query(fb.collection(fb.db, "systemDeletionRequests"),
        fb.where("requesterUid", "==", me.uid));
      SETTINGS_MINE_UNSUB = fb.onSnapshot(q, function (snap) {
        MINE_REQS = [];
        snap.forEach(function (d) { MINE_REQS.push({ id: d.id, r: d.data() }); });
        MINE_REQS.sort(function (a, b) { return jamaliTs(b.r.createdAt) - jamaliTs(a.r.createdAt); });
        var box = document.getElementById("jd-mine");
        if (box) jamaliMinePaint(box);
      }, function () {
        // rules not published yet, or read refused - the list just stays empty
      });
    }).catch(function () {});
  }

  function jamaliMinePaint(box) {
    if (!box || !session) return;
    var h = "<div class=\"jd-cap\">My deletion requests</div>";
    if (!MINE_REQS.length) {
      h += "<div class=\"jd-none\">None yet. Submit one from Show Delete Data above - its status appears here live.</div>";
    } else {
      h += "<div class=\"jd-list\">";
      for (var i = 0; i < MINE_REQS.length; i++) {
        var r = MINE_REQS[i].r || {};
        var st = String(r.status || "pending");
        var detail = "";
        if (st === "pending") detail = "Waiting for the administrator - your data is untouched.";
        if (st === "approved") detail = "Approved - the deletion is being executed.";
        if (st === "rejected" && r.decision && r.decision.reason) detail = "Rejected by the administrator: " + r.decision.reason;
        if (st === "completed" && r.execution) {
          detail = "Deletion executed: " + (r.execution.totalDeleted || 0) + " document" + ((r.execution.totalDeleted || 0) === 1 ? "" : "s") +
            " permanently deleted" + ((r.execution.totalFailed || 0) ? (", " + r.execution.totalFailed + " failed") : "") + ".";
        }
        if (st === "failed") {
          detail = "The deletion FAILED - your data was not removed" +
            (r.execution && r.execution.error ? (": " + r.execution.error) : ". The administrator can see the error in Data Deletion Requests.");
        }
        var t = jamaliTs(r.createdAt);
        h += "<div class=\"jd-item\"><div class=\"jd-item-top\">" +
          "<span class=\"jd-chip " + delChipClass(st) + "\">" + jdEsc(st.toUpperCase()) + "</span>" +
          "<span class=\"jd-what\">" + jdEsc((Array.isArray(r.scopes) ? r.scopes : []).join(", ")) + "</span></div>" +
          (detail ? "<div class=\"jd-detail\">" + jdEsc(detail) + "</div>" : "") +
          (t ? "<div class=\"jd-when\">requested " + new Date(t).toLocaleString() + "</div>" : "") +
          "</div>";
      }
      h += "</div>";
    }
    box.innerHTML = h;
  }

  // ---- the shared permanent-deletion executor ----
  // Order is fixed and safe: read everything first, write the retention
  // archive BEFORE removing anything, then delete in batches. If any
  // read or the archive write fails, nothing is deleted at all.
  function jamaliDeleteExecute(fb, chosen, meta) {
    var cols = [];
    chosen.forEach(function (s) {
      s.collections.forEach(function (c) { if (cols.indexOf(c) === -1) cols.push(c); });
    });
    var reads = cols.map(function (c) {
      return fb.getDocs(fb.collection(fb.db, c)).then(function (snap) {
        var docs = [];
        snap.forEach(function (d) { docs.push({ id: d.id, data: d.data() }); });
        return { collection: c, docs: docs, error: "" };
      }).catch(function (e) {
        return { collection: c, docs: null, error: delErrText(e) };
      });
    });
    return Promise.all(reads).then(function (groups) {
      var bad = "";
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].docs === null) { bad = groups[i].error; break; }
      }
      if (bad) return { aborted: true, error: bad, results: [], totalDeleted: 0, totalFailed: 0 };
      var CAP = 150;
      var archive = {};
      groups.forEach(function (g) {
        archive[g.collection] = {
          count: g.docs.length,
          truncated: g.docs.length > CAP,
          docs: g.docs.slice(0, CAP).map(function (x) { return { id: x.id, data: x.data }; })
        };
      });
      var actor = meta.actor || jamaliDeleteActor(fb);
      var auditId = "da-" + (meta.requestId ? String(meta.requestId).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 20) : "direct") +
        "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      return fb.setDoc(fb.doc(fb.db, "systemDeletionAudit", auditId), {
        kind: meta.kind || "direct",
        requestId: meta.requestId || "",
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorLabel: actor.label,
        scopes: chosen.map(function (s) { return s.key; }),
        collections: cols,
        archive: archive,
        results: [],
        status: "executing",
        at: fb.serverTimestamp()
      }).then(function () {
        return { auditId: auditId, groups: groups };
      });
    }).then(function (ctx) {
      if (!ctx) return { aborted: true, error: "unknown", results: [], totalDeleted: 0, totalFailed: 0 };
      var results = [];
      var chain = Promise.resolve();
      ctx.groups.forEach(function (g) {
        chain = chain.then(function () {
          // The counters live HERE - one level above both the chunk loop and
          // the callback that reports them - so the outcome of a group is
          // always in scope for its result line. (They used to sit inside
          // the Promise executor only, which crashed the whole deletion
          // with "deleted is not defined" the moment a group finished.)
          var deleted = 0, failed = 0, error = "";
          return new Promise(function (res) {
            function chunk(start) {
              var slice = g.docs.slice(start, start + 400);
              if (!slice.length) { res(); return; }
              var batch = fb.writeBatch(fb.db);
              slice.forEach(function (x) { batch.delete(fb.doc(fb.db, g.collection, x.id)); });
              batch.commit().then(function () {
                deleted += slice.length;
                chunk(start + slice.length);
              }).catch(function (e) {
                failed += (g.docs.length - start);
                error = delErrText(e);
                res();
              });
            }
            chunk(0);
          }).then(function () {
            results.push({ collection: g.collection, found: g.docs.length, deleted: deleted, failed: failed, error: error });
          });
        });
      });
      return chain.then(function () {
        var td = 0, tf = 0;
        results.forEach(function (r) { td += r.deleted; tf += r.failed; });
        return fb.updateDoc(fb.doc(fb.db, "systemDeletionAudit", ctx.auditId), {
          results: results,
          status: tf ? (td ? "partial" : "failed") : "completed",
          totalDeleted: td,
          totalFailed: tf,
          finishedAt: fb.serverTimestamp()
        }).catch(function () {}).then(function () {
          return { aborted: false, results: results, totalDeleted: td, totalFailed: tf };
        });
      });
    });
  }

  // ---- ONE SETTINGS PLACE: the two consolidated sections -------------------
  // SPEAKER SETTINGS: the 34 module pages' announcement config. Writes the
  // SAME record the pages read (healthQueueConfig/<module>, plus the
  // jamali_qacfg_<module> Local Storage cache), so every page picks the
  // values up live through its onSnapshot listener - nothing else changes.
  var QA_MODULE_LIB = [
    ["triage", "Triage", "\u{1F691}"],
    ["nurse", "Nurse Consultation", "\u{1F489}"],
    ["doctor", "Doctor Consultation", "\u{1FA7A}"],
    ["pharmacy", "Pharmacy", "\u{1F48A}"],
    ["treatment", "Treatment / Procedures", "\u{1FA79}"],
    ["discharge", "Patient Discharge", "\u{1F6AA}"],
    ["laboratory", "Laboratory", "\u{1F9EA}"],
    ["radiology", "Radiology / Imaging", "\u{1FA7B}"],
    ["billing", "Hospital Billing & Invoicing", "\u{1F9FE}"],
    ["payments", "Payments & Financial", "\u{1F4B5}"],
    ["insurance", "Health Insurance", "\u{1F6A1}"],
    ["staff", "Staff & Human Resource", "\u{1F465}"],
    ["duty", "Doctor Scheduling & Duty Roster", "\u{1F5D3}\uFE0F"],
    ["emergency", "Emergency Department", "\u{1F6A8}"],
    ["icu", "Intensive Care Unit (ICU)", "\u{1FAC0}"],
    ["theatre", "Operating Theatre & Surgery", "\u{1F3E5}"],
    ["maternity", "Maternity & Delivery", "\u{1F930}"],
    ["antenatal", "Antenatal & Postnatal Care", "\u{1F931}"],
    ["paediatric", "Paediatric Department", "\u{1F9D2}"],
    ["dental", "Dental Department", "\u{1F9B7}"],
    ["physio", "Physiotherapy & Rehabilitation", "\u{1F3CB}\uFE0F"],
    ["mental", "Mental Health Services", "\u{1F9E0}"],
    ["bloodbank", "Blood Bank & Transfusion", "\u{1FA78}"],
    ["ambulance", "Ambulance & Patient Transport", "\u{1F691}"],
    ["immunisation", "Immunisation & Vaccination", "\u{1F489}"],
    ["chronic", "Chronic Disease", "\u{1FA7A}"],
    ["infection", "Infection Prevention & Control", "\u{1F9A0}"],
    ["mortuary", "Mortuary", "\u{1F56F}\uFE0F"],
    ["equipment", "Medical Equipment", "\u{1F527}"],
    ["procurement", "Medical Supplies & Procurement", "\u{1F4E6}"],
    ["inventory", "General Hospital Inventory", "\u{1F3EC}"],
    ["dietary", "Dietary & Nutrition", "\u{1F37D}\uFE0F"],
    ["laundry", "Laundry", "\u{1F9FA}"],
    ["housekeeping", "Housekeeping & Environmental Services", "\u{1F9F9}"]
  ];

  function jamaliSpeakerPaint() {
    if (!SETTINGS_EL) return;
    var box = SETTINGS_EL.querySelector("#jd-speaker");
    if (!box) return;
    var cur = "triage";
    try { cur = window.localStorage.getItem("jamali_settings_qa") || "triage"; } catch (e) {}
    if (!QA_MODULE_LIB.some(function (m) { return m[0] === cur; })) cur = "triage";
    box.innerHTML =
      '<select id="jd-qa-sel">' + QA_MODULE_LIB.map(function (m) {
        return '<option value="' + m[0] + '"' + (m[0] === cur ? " selected" : "") + ">" +
          jdEsc(m[2] + " " + m[1]) + "</option>";
      }).join("") + "</select>" +
      '<p class="jd-none">The voice announcements on every module page read these details aloud. Saving writes the same record the page reads, so the page picks it up live.</p>' +
      '<label class="jd-f">Department / service name<input id="jd-qa-dept" type="text" placeholder="e.g. Triage"></label>' +
      '<label class="jd-f">Staff name<input id="jd-qa-staff" type="text" placeholder="e.g. Nurse MWAJUMA"></label>' +
      '<label class="jd-f">Office number<input id="jd-qa-office" type="text" placeholder="e.g. Doctor\'s Office 02"></label>' +
      '<label class="jd-f">Room number<input id="jd-qa-room" type="text" placeholder="e.g. Nurse Room 03"></label>' +
      '<label class="jd-f">Voice speed<select id="jd-qa-speed">' +
        '<option value="0.6">Slow &middot; 0.6</option><option value="0.75">Clear &middot; 0.75</option>' +
        '<option value="0.95">Normal &middot; 0.95</option></select></label>' +
      '<button type="button" id="jd-qa-save" class="jd-primary">Save Speaker Settings</button>' +
      '<div class="jd-msg" id="jd-qa-msg" hidden></div>';
    var fill = function (data) {
      var d = data || {};
      var put = function (id, k) {
        var el = box.querySelector("#" + id);
        if (el) el.value = String(d[k] == null ? "" : d[k]);
      };
      put("jd-qa-dept", "department"); put("jd-qa-staff", "staffName");
      put("jd-qa-office", "officeNumber"); put("jd-qa-room", "roomNumber");
      var sp = box.querySelector("#jd-qa-speed");
      if (sp) {
        var r = Number(d.voiceRate);
        sp.value = String(r >= 0.5 && r <= 1.1 ? r : 0.75);
      }
    };
    try { fill(JSON.parse(window.localStorage.getItem("jamali_qacfg_" + cur) || "{}")); } catch (e) {}
    import("/sidebar.js").then(function (fb) {
      if (!fb || !fb.getDoc || !fb.doc) return;
      return fb.getDoc(fb.doc(fb.db, "healthQueueConfig", cur)).then(function (ds) {
        if (ds && ds.exists && ds.exists()) fill(ds.data());
      });
    }).catch(function () { /* the Local Storage fill stands */ });
    var sel = box.querySelector("#jd-qa-sel");
    sel.addEventListener("change", function () {
      try { window.localStorage.setItem("jamali_settings_qa", sel.value); } catch (e) {}
      jamaliSpeakerPaint();
    });
    box.querySelector("#jd-qa-save").addEventListener("click", function () {
      var mod = sel.value, msg = box.querySelector("#jd-qa-msg");
      var btn = box.querySelector("#jd-qa-save");
      try { window.localStorage.setItem("jamali_settings_qa", mod); } catch (e) {}
      var val = function (id) {
        var el = box.querySelector("#" + id);
        return el ? el.value.trim().replace(/\s+/g, " ") : "";
      };
      var sp = Number(box.querySelector("#jd-qa-speed").value);
      var data = {
        department: val("jd-qa-dept"), staffName: val("jd-qa-staff"),
        officeNumber: val("jd-qa-office"), roomNumber: val("jd-qa-room"),
        voiceRate: (sp >= 0.5 && sp <= 1.1) ? sp : 0.75,
        updatedAt: new Date().toISOString()
      };
      btn.disabled = true; msg.hidden = false; msg.className = "jd-msg";
      msg.textContent = "Saving speaker settings for " + mod + "\u2026";
      import("/sidebar.js").then(function (fb) {
        return fb.setDoc(fb.doc(fb.db, "healthQueueConfig", mod), data, { merge: true });
      }).then(function () {
        try {
          window.localStorage.setItem("jamali_qacfg_" + mod, JSON.stringify(
            Object.assign({ department: "", staffName: "", officeNumber: "", roomNumber: "", voiceRate: 0.75 }, data)));
        } catch (e) {}
        msg.className = "jd-msg jd-ok";
        msg.textContent = "Speaker settings saved for " + mod + " - the module page reads them live.";
        btn.disabled = false;
      }).catch(function (e) {
        msg.className = "jd-msg jd-bad"; msg.textContent = delErrText(e); btn.disabled = false;
      });
    });
  }

  // NOTIFICATION SETTINGS: the same fields page 412 serves (events, channels,
  // recipients), saved through the same saveNotifySettings the engine reads.
  function jamaliNotifyPaint() {
    if (!SETTINGS_EL) return;
    var box = SETTINGS_EL.querySelector("#jd-notify");
    if (!box) return;
    var st = getNotifySettings();
    var tg = function (items, attr, key0) {
      return '<div class="jd-tg">' + items.map(function (it) {
        return '<label><input type="checkbox" data-' + attr + '="' + it.key + '"' +
          (st[it.key] ? " checked" : "") + "> " + jdEsc(it.label) +
          (it.hint ? ' <span style="color:#64748b">- ' + jdEsc(it.hint) + "</span>" : "") + "</label>";
      }).join("") + "</div>";
    };
    box.innerHTML =
      tg(NOTIFY_EVENTS, "ev") +
      tg(NOTIFY_CHANNELS, "ch") +
      '<label class="jd-f">Phone number (for SMS)<input id="jd-ns-phone" type="tel" placeholder="e.g. 0780526437 or +255780526437"></label>' +
      '<label class="jd-f">Email address (for email alerts)<input id="jd-ns-email" type="email" placeholder="owner@example.com"></label>' +
      '<button type="button" id="jd-ns-save" class="jd-primary">Save Notification Settings</button>' +
      '<div class="jd-msg" id="jd-ns-msg" hidden></div>';
    box.querySelector("#jd-ns-phone").value = st.phone || "";
    box.querySelector("#jd-ns-email").value = st.email || "";
    box.querySelector("#jd-ns-save").addEventListener("click", function () {
      var msg = box.querySelector("#jd-ns-msg"), btn = box.querySelector("#jd-ns-save");
      var patch = {
        phone: box.querySelector("#jd-ns-phone").value.trim(),
        email: box.querySelector("#jd-ns-email").value.trim()
      };
      box.querySelectorAll("[data-ev]").forEach(function (c) { patch[c.getAttribute("data-ev")] = c.checked; });
      box.querySelectorAll("[data-ch]").forEach(function (c) { patch[c.getAttribute("data-ch")] = c.checked; });
      btn.disabled = true; msg.hidden = false; msg.className = "jd-msg";
      msg.textContent = "Saving notification settings\u2026";
      try {
        saveNotifySettings(patch);
        msg.className = "jd-msg jd-ok";
        msg.textContent = "Notification settings saved - the engine re-arms on the next stock or payment event.";
      } catch (e) {
        msg.className = "jd-msg jd-bad"; msg.textContent = delErrText(e);
      }
      btn.disabled = false;
    });
  }

  // ONE SETTINGS PLACE: pages and any button can open the panel - the
  // per-page Speaker settings buttons dispatch jamali:settings-open with
  // { section: "speaker", qa: "<module>" } and land here, preselected.
  window.addEventListener("jamali:settings-open", function (ev) {
    var d = (ev && ev.detail) || {};
    if (d.qa) { try { window.localStorage.setItem("jamali_settings_qa", String(d.qa)); } catch (e) {} }
    jamaliSettingsOpen();
  });
  /* JD-DELETE-MODULE-END */
})();

/* ======================================================================
   THE ONE PATIENT ID - the live registry of healthRegistrations, shared
   by every health module. A patient carries ONE Registration ID (4 digits
   + 4 letters, e.g. 4827ABCD) created once on Registration (page 322);
   every module that names a patient stores that same ID. Pages call
   watchHealthPatients(cb) to receive the live rows (for ID datalists and
   name hints) and patientById(id) to resolve one patient.
   ====================================================================== */
let __jamaliPatients = [];
const __jamaliPatientCbs = new Set();
let __jamaliPatientsLive = false;
export function watchHealthPatients(cb) {
  if (typeof cb !== "function") return;
  __jamaliPatientCbs.add(cb);
  if (!__jamaliPatientsLive) {
    __jamaliPatientsLive = true;
    try {
      onSnapshot(query(collection(db, "healthRegistrations")), (snap) => {
        __jamaliPatients = snap.docs.map((d) =>
          Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }));
        __jamaliPatientCbs.forEach((fn) => { try { fn(__jamaliPatients); } catch (e) {} });
      }, () => {});
    } catch (e) { __jamaliPatientsLive = false; }
  }
  try { cb(__jamaliPatients); } catch (e) {}
}
export function patientById(id) {
  const want = String(id == null ? "" : id).trim().toLowerCase();
  if (!want) return null;
  return __jamaliPatients.find((p) =>
    String(p.regId || "").trim().toLowerCase() === want) || null;
}

/* ======================================================================
   THE SECURITY CORE - two-factor sign-in (TOTP), the device app lock and
   the password policy, all Web Crypto - no outside service.
   ====================================================================== */
// --- base32 helpers (RFC 4648, no padding) ---
const __b32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function __b32encode(buf) {
  let bits = 0, val = 0, out = "";
  for (const byte of buf) {
    val = (val << 8) | byte; bits += 8;
    while (bits >= 5) { out += __b32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += __b32[(val << (5 - bits)) & 31];
  return out;
}
function __b32decode(str) {
  const clean = String(str || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, val = 0, out = [];
  for (const ch of clean) {
    val = (val << 5) | __b32.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}
async function __sha256hex(text) {
  const d = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(String(text)));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// __totpNow(secretB32, stepSeconds, driftSteps) - the RFC 6238 code, using
// HMAC-SHA-1 through Web Crypto. Returns the 6-digit string or "".
async function __totpNow(secretB32, stepSeconds, driftSteps) {
  try {
    const keyBytes = __b32decode(secretB32);
    if (!keyBytes.length) return "";
    const step = Math.floor(Date.now() / 1000 / (stepSeconds || 30)) + (driftSteps || 0);
    const msg = new Uint8Array(8);
    const big = BigInt(step);                       // big-endian 8-byte counter
    for (let i = 7; i >= 0; i--) msg[i] = Number((big >> BigInt(8 * (7 - i))) & 255n);
    const key = await crypto.subtle.importKey("raw", keyBytes,
      { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
    const off = mac[19] & 15;
    const bin = ((mac[off] & 127) << 24) | (mac[off + 1] << 16) |
                (mac[off + 2] << 8) | mac[off + 3];
    return String(bin % 1000000).padStart(6, "0");
  } catch (e) { return ""; }
}
// --- the per-account store: keyed by the same zone as the data layer ---
function __secKey(kind) {
  return ZONE_PREFIX + "jamaliSec::" + currentNamespace() + "::" + kind;
}
function __secGet(kind, fallback) {
  try { return JSON.parse(lsGet(__secKey(kind)) || "null") || fallback; }
  catch (e) { return fallback; }
}
function __secSet(kind, data) { try { lsSet(__secKey(kind), JSON.stringify(data)); } catch (e) {} }
function __secDel(kind) { try { lsDel(__secKey(kind)); } catch (e) {} }

// twofaStatus() - { enrolled, enabled, hasRecovery } for this account.
export function twofaStatus() {
  const rec = __secGet("2fa", null);
  return { enrolled: !!(rec && rec.secret), enabled: !!(rec && rec.enabled),
           hasRecovery: !!(rec && rec.recovery) };
}
// twofaEnroll() - creates the secret, returns { secret, otpauth, recovery }.
// The authenticator app (Google Authenticator, Authy, FreeOTP...) scans the
// otpauth QR or takes the base32 secret; verification with twofaVerify(code)
// turns it on. A one-time recovery code is returned for lost phones.
export async function twofaEnroll() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const secret = __b32encode(bytes);
  const recBytes = new Uint8Array(6);
  crypto.getRandomValues(recBytes);
  const recovery = [...recBytes].map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
  const ns = currentNamespace();
  const who = ns.indexOf("u::") === 0 ? ns.slice(3) : "this device";
  const st = twofaStatus();
  const otpauth = "otpauth://totp/JAMALI:" + encodeURIComponent(who) +
    "?secret=" + secret + "&issuer=JAMALI&algorithm=SHA1&digits=6&period=30";
  __secSet("2fa", { secret, enabled: false, recovery,
                    enrolledAt: new Date().toISOString() });
  return { secret, otpauth, recovery, wasEnabled: st.enabled, account: who };
}
// twofaVerify(code) - checks the 6-digit code (accepts the neighbouring
// time step for clock drift) or the recovery code. On success the factor
// is switched on (and the recovery code is burned when used for that).
export async function twofaVerify(code) {
  const rec = __secGet("2fa", null);
  const c = String(code || "").replace(/\s+/g, "");
  if (!rec || !rec.secret) return { ok: false, reason: "not enrolled" };
  if (rec.recovery && c.toLowerCase() === String(rec.recovery).toLowerCase()) {
    delete rec.recovery;
    rec.enabled = true;
    rec.enabledAt = new Date().toISOString();
    __secSet("2fa", rec);
    return { ok: true, via: "recovery" };
  }
  if (!/^\d{6}$/.test(c)) return { ok: false, reason: "bad code" };
  for (const drift of [-1, 0, 1]) {
    const want = await __totpNow(rec.secret, 30, drift);
    if (want && want === c) {
      rec.enabled = true;
      rec.enabledAt = new Date().toISOString();
      __secSet("2fa", rec);
      return { ok: true, via: "totp" };
    }
  }
  return { ok: false, reason: "wrong code" };
}
// twofaDisable(code) - the factor can only be switched off with a valid
// current code, exactly as it was switched on.
export async function twofaDisable(code) {
  const rec = __secGet("2fa", null);
  if (!rec || !rec.secret) return { ok: false, reason: "not enrolled" };
  const c = String(code || "").replace(/\s+/g, "");
  const viaRecovery = rec.recovery && c.toLowerCase() === String(rec.recovery).toLowerCase();
  let okTotp = false;
  if (/^\d{6}$/.test(c)) {
    for (const drift of [-1, 0, 1]) {
      const want = await __totpNow(rec.secret, 30, drift);
      if (want && want === c) { okTotp = true; break; }
    }
  }
  if (!okTotp && !viaRecovery) return { ok: false, reason: "wrong code" };
  __secDel("2fa");
  return { ok: true };
}

// --- the password policy + the device app lock ---
export const PASSWORD_POLICY = {
  minLength: 8,
  minClasses: 3,
  classes: ["lowercase a-z", "uppercase A-Z", "digits 0-9", "symbols !@#…"],
  describe: "at least 8 characters with at least 3 of: lowercase, uppercase, digits, symbols"
};
// passwordCheck(pw) - { ok, problems: [] } against PASSWORD_POLICY.
export function passwordCheck(pw) {
  const p = String(pw || "");
  const problems = [];
  if (p.length < PASSWORD_POLICY.minLength)
    problems.push("at least " + PASSWORD_POLICY.minLength + " characters");
  let classes = 0;
  if (/[a-z]/.test(p)) classes++;
  if (/[A-Z]/.test(p)) classes++;
  if (/[0-9]/.test(p)) classes++;
  if (/[^A-Za-z0-9]/.test(p)) classes++;
  if (classes < PASSWORD_POLICY.minClasses)
    problems.push("at least " + PASSWORD_POLICY.minClasses + " of: lowercase, uppercase, digits, symbols");
  if (/(^123456$|^password$|^qwerty$|000000|111111|abc123)/i.test(p))
    problems.push("not a common or repeated pattern");
  return { ok: problems.length === 0, problems };
}
// lockSet(pw) / lockCheck(pw) / lockStatus() - an optional lock on THIS
// device for shared-clinic computers: only the hash is stored, the policy
// is enforced at set time, and lockGate(pw) unlocks pages again.
export async function lockSet(pw) {
  const chk = passwordCheck(pw);
  if (!chk.ok) return { ok: false, problems: chk.problems };
  const hash = await __sha256hex("jamali-lock::" + pw);
  __secSet("lock", { hash, setAt: new Date().toISOString() });
  return { ok: true };
}
export async function lockCheck(pw) {
  const rec = __secGet("lock", null);
  if (!rec || !rec.hash) return { ok: false, reason: "no lock set" };
  const hash = await __sha256hex("jamali-lock::" + pw);
  return { ok: hash === rec.hash };
}
export function lockStatus() {
  const rec = __secGet("lock", null);
  return { set: !!(rec && rec.hash), setAt: (rec && rec.setAt) || "" };
}
export function lockRemove(currentPw) {
  const rec = __secGet("lock", null);
  if (!rec) return Promise.resolve({ ok: true });
  return lockCheck(currentPw).then((r) => {
    if (!r.ok) return { ok: false, reason: "wrong password" };
    __secDel("lock");
    return { ok: true };
  });
}

// --- the opening gate: when 2FA or the device lock is armed, the shell
// asks for the code / password before any page can be used. One unlock
// per browser session (30 minutes), so page switches stay smooth.
(function __jamaliSecurityGate() {
  const UNLOCK_KEY = "jamaliUnlockedAt";
  const TTL = 30 * 60 * 1000;
  function recentlyUnlocked() {
    try {
      const t = Number(sessionStorage.getItem(UNLOCK_KEY) || 0);
      return t > 0 && (Date.now() - t) < TTL;
    } catch (e) { return false; }
  }
  function markUnlocked() {
    try { sessionStorage.setItem(UNLOCK_KEY, String(Date.now())); } catch (e) {}
  }
  function rm(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
  async function maybeGate() {
    if (recentlyUnlocked()) return;
    let lock = { set: false }, fa = { enabled: false };
    try { lock = lockStatus(); fa = twofaStatus(); } catch (e) { return; }
    const needLock = !!lock.set;
    const needFa = !!fa.enabled;
    if (!needLock && !needFa) return;

    const overlay = document.createElement("div");
    overlay.setAttribute("id", "jamali-gate");
    overlay.setAttribute("style",
      "position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.62);" +
      "display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif");
    const card = document.createElement("div");
    card.setAttribute("style",
      "background:#fff;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.3);" +
      "padding:26px 28px;max-width:420px;width:92%;color:#0f172a");
    const title = document.createElement("h2");
    title.textContent = "JAMALI is locked on this device";
    title.setAttribute("style", "font-size:17px;margin:0 0 6px");
    const sub = document.createElement("p");
    sub.textContent = [
      needFa ? "type the 6-digit code from your authenticator app" : "",
      needLock ? "type the device lock password" : ""
    ].filter(Boolean).join(" and ") + " to open the system.";
    sub.setAttribute("style", "font-size:13px;color:#64748b;margin:0 0 14px;line-height:1.45");
    const row = document.createElement("div");
    row.setAttribute("style", "display:flex;gap:10px;flex-wrap:wrap");
    const inp = document.createElement("input");
    inp.type = needLock ? "password" : "text";
    if (!needLock) inp.setAttribute("inputmode", "numeric");
    inp.setAttribute("placeholder", needLock ? "lock password" : "6-digit code");
    inp.setAttribute("autocomplete", needLock ? "current-password" : "off");
    inp.setAttribute("style", "flex:1;min-width:180px;border:1px solid #cbd5e1;border-radius:9px;padding:10px 12px;font-size:15px");
    const btn = document.createElement("button");
    btn.textContent = "Unlock";
    btn.setAttribute("style", "background:#059669;color:#fff;border:0;border-radius:9px;padding:10px 18px;font-weight:800;font-size:14px;cursor:pointer");
    const msg = document.createElement("p");
    msg.setAttribute("style", "font-size:12.5px;font-weight:700;color:#b91c1c;min-height:16px;margin:10px 0 0");
    row.appendChild(inp); row.appendChild(btn);
    card.appendChild(title); card.appendChild(sub); card.appendChild(row); card.appendChild(msg);
    overlay.appendChild(card);
    document.body ? document.body.appendChild(overlay) : document.addEventListener("DOMContentLoaded", () => document.body.appendChild(overlay), { once: true });

    let stage = needFa ? "fa" : "lock";
    async function tryUnlock() {
      const v = inp.value.trim();
      if (!v) { msg.textContent = "Type it first."; return; }
      if (stage === "fa") {
        const r = await twofaVerify(v);
        if (!r.ok) { msg.textContent = "That code did not verify (" + (r.reason || "wrong code") + ")."; return; }
        if (!needLock) { markUnlocked(); rm(overlay); return; }
        msg.textContent = "Code accepted - now the device lock password.";
        msg.style.color = "#047857";
        inp.value = ""; inp.type = "password";
        inp.placeholder = "lock password";
        stage = "lock";
        return;
      }
      const r = await lockCheck(v);
      if (!r.ok) { msg.textContent = "Wrong password."; msg.style.color = "#b91c1c"; return; }
      markUnlocked(); rm(overlay);
    }
    btn.addEventListener("click", tryUnlock);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") btn.click(); });
    setTimeout(() => inp.focus(), 60);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => { setTimeout(maybeGate, 150); }, { once: true });
  else setTimeout(maybeGate, 150);
})();

/* ======================================================================
   THE REGISTER PICKERS - was public/pickers.js, wrapped in its own scope
   (its top-level names stay private, exactly as they were as a module).
   ====================================================================== */
(function () {

/* JAMALI - public/pickers.js, the register pickers.
 *
 * Loaded on every page by sidebar.js. When a page shows a Customer,
 * Supplier, Product, Employee or insurance provider box, the box offers the names kept in
 * the Customers, Suppliers, Stock Register, Employees and Hospital
 * Staff registers as you type (insurance providers come from Customers). Free text still works. Picking a known name also:
 *   - corrects its spelling to the register's spelling,
 *   - fills an empty Unit Price from the stock item (selling price on
 *     customer documents, buying price per unit on supplier documents),
 *   - fills an empty Role and Gross from the employee record.
 * The data layer (/502.js) is only loaded once such a box appears.
 */
const SEL = 'input[data-f="party"],input[data-f="product"],input[data-f="employee"],#in-person,#f-provider';
let api = null, seq = 0;
const load = () => (api = api || import("/sidebar.js"));

async function records(coll) {
  const m = await load();
  const snap = await m.getDocs(m.collection(m.db, coll));
  return snap.docs.map((d) => {
    const r = Object.assign({ __id: d.id }, d.data());
    if (coll === "healthStaff") {
      if (String(r.status || "") === "Exited") return null;
      r.name = r.fullName; r.role = r.position;
    }
    return r;
  }).filter((r) => r && r.name);
}

function sideOf(input) {
  const form = input.closest("form") || document;
  const party = form.querySelector('input[data-f="party"]');
  const label = String((party && party.closest("label") && party.closest("label").textContent) || "").toLowerCase();
  if (label.indexOf("supplier") !== -1) return "suppliers";
  if (label.indexOf("customer") !== -1) return "customers";
  return "";
}

function collsFor(input) {
  const key = input.dataset.f || input.id;
  if (key === "product") return ["stockItems"];
  if (key === "employee") return ["employees", "healthStaff"];
  if (key === "f-provider") return ["customers"];
  if (key === "party") { const s = sideOf(input); return s ? [s] : ["customers", "suppliers"]; }
  return ["customers", "suppliers"];
}

async function refresh(input) {
  const lists = await Promise.all(collsFor(input).map(records));
  const seen = new Set(), recs = [];
  lists.flat().forEach((r) => {
    const k = String(r.name).trim().toLowerCase();
    if (!seen.has(k)) { seen.add(k); recs.push(r); }
  });
  recs.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  input.__jpRecs = recs;
  const dl = document.getElementById(input.getAttribute("list"));
  if (!dl) return;
  dl.innerHTML = "";
  recs.forEach((r) => {
    const o = document.createElement("option");
    o.value = r.name;
    const extra = r.phone || r.role || (r.unitPrice != null ? "price " + r.unitPrice : "");
    if (extra) o.label = String(extra);
    dl.appendChild(o);
  });
}

function fillIfEmpty(form, key, val) {
  const el = form.querySelector('[data-f="' + key + '"]');
  if (!el || val == null || val === "" || isNaN(Number(val)) && key !== "role") return;
  if (String(el.value).trim() === "" || (el.type === "number" && Number(el.value) === 0)) {
    el.value = key === "role" ? val : Math.round(Number(val) * 100) / 100;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function picked(input) {
  const v = String(input.value || "").trim().toLowerCase();
  const rec = (input.__jpRecs || []).find((r) => String(r.name).trim().toLowerCase() === v);
  if (!rec) return;
  if (input.value !== rec.name) input.value = rec.name;
  const form = input.closest("form");
  if (!form) return;
  const key = input.dataset.f;
  if (key === "product") {
    const per = Number(rec.unitsPerPackage) || 0;
    const price = sideOf(input) === "suppliers"
      ? (per > 0 ? Number(rec.buyPrice) / per : null)
      : rec.unitPrice;
    fillIfEmpty(form, "unitPrice", price);
  } else if (key === "employee") {
    fillIfEmpty(form, "role", rec.role);
    fillIfEmpty(form, "gross", rec.salary);
  }
}

function attach(input) {
  if (input.__jp) return;
  input.__jp = true;
  const dl = document.createElement("datalist");
  dl.id = "jamali-picker-" + (++seq);
  document.body.appendChild(dl);
  input.setAttribute("list", dl.id);
  input.setAttribute("autocomplete", "off");
  const go = () => refresh(input).catch(() => {});
  input.addEventListener("focus", go);
  input.addEventListener("change", () => picked(input));
  go();
}

function scan(root) {
  if (!root || !root.querySelectorAll) return;
  if (root.matches && root.matches(SEL)) attach(root);
  root.querySelectorAll(SEL).forEach(attach);
}

scan(document);
new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(scan)))
  .observe(document.documentElement, { childList: true, subtree: true });
})();

/* ======================================================================
   HOSPITAL MONEY IN THE BOOKS - was public/health-books.js, wrapped in its
   own scope (its top-level names stay private, exactly as they were).
   ====================================================================== */
(function () {

/* JAMALI - public/health-books.js, hospital money in the one set of books.
 *
 * Loaded on every page by sidebar.js. The Health wing keeps its own
 * records (healthBilling, healthPayments, healthInsurance); this module
 * mirrors their money into the shared "transactions" collection, so the
 * Sales Journal, Cash Book, Debtors Book, Ledger, Income Statement and
 * Balance Sheet carry hospital income beside business income.
 *
 *   Hospital bill (not Cancelled)        IN  Sales            Credit     patient owes the net bill
 *   Payment against an invoice           IN  Debtors Recover  Cash/Bank  patient's debt goes down
 *   Payment with no invoice number       IN  Sales            Cash/Bank  cash sale
 *   Payment set to Refund approved,      OUT Sales Return     Cash/Bank  money paid back
 *   or a payment of type Refund
 *   Insurance claim (status Paid)        IN  Debtors Recover  Bank       insurer paid the patient's bill
 *
 * Every mirrored entry has a fixed id ("health-<collection>-<record id>")
 * and source: "health"; it is rewritten when the health record changes
 * and removed when the record is deleted or cancelled. Change hospital
 * money on the Health pages, not in Add Transaction.
 */
const SOURCES = ["healthBilling", "healthPayments", "healthInsurance"];
const PREFIX = "health-";
const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
const methodOf = (m) => (/^cash$/i.test(String(m || "").trim()) || !m ? "Cash" : "Bank");
const when = (r) => { const d = new Date(r.createdAt || r.date || Date.now()); return isNaN(d) ? new Date() : d; };

function entriesFor(coll, r) {
  const who = String(r.patientId || "").trim();
  const st = String(r.status || "");
  if (!who || st === "Cancelled") return [];
  const base = () => ({ dateTime: when(r), name: who, source: "health", sourceModule: coll, sourceRef: r.ref || "" });
  if (coll === "healthBilling") {
    const net = num(r.amount) - num(r.discount);
    return net > 0 ? [["", Object.assign(base(), { transactionType: "IN", transactionName: "Sales", flowMethod: "Credit", amount: net })]] : [];
  }
  if (coll === "healthPayments") {
    const amt = num(r.amount);
    if (amt <= 0) return [];
    const fm = methodOf(r.method);
    const refund = ["-refund", Object.assign(base(), { transactionType: "OUT", transactionName: "Sales Return", flowMethod: fm, amount: amt })];
    if (/refund/i.test(String(r.kind || ""))) return st === "Refund pending" ? [] : [refund];
    const out = [["", Object.assign(base(), {
      transactionType: "IN",
      transactionName: String(r.invoiceNo || "").trim() ? "Debtors Recover" : "Sales",
      flowMethod: fm, amount: amt
    })]];
    if (st === "Refund approved") out.push(refund);
    return out;
  }
  if (coll === "healthInsurance") {
    const amt = num(r.claimAmount);
    return st === "Paid" && amt > 0
      ? [["", Object.assign(base(), { transactionType: "IN", transactionName: "Debtors Recover", flowMethod: "Bank", amount: amt })]]
      : [];
  }
  return [];
}

const sig = (t) => [t.transactionType, t.transactionName, t.flowMethod, t.name, t.amount,
  t.dateTime && (t.dateTime.toMillis ? t.dateTime.toMillis() : new Date(t.dateTime).getTime()), t.sourceRef].join("|");

let api = null, busy = false, again = false;
async function reconcile() {
  if (busy) { again = true; return; }
  busy = true;
  try {
    const m = api;
    const want = new Map();
    for (const coll of SOURCES) {
      const snap = await m.getDocs(m.collection(m.db, coll));
      snap.docs.forEach((d) => {
        entriesFor(coll, d.data() || {}).forEach(([suffix, e]) => want.set(PREFIX + coll + "-" + d.id + suffix, e));
      });
    }
    const have = new Map();
    (await m.getDocs(m.collection(m.db, "transactions"))).docs.forEach((d) => {
      if (d.id.indexOf(PREFIX) === 0) have.set(d.id, d.data() || {});
    });
    for (const [id, e] of want)
      if (!have.has(id) || sig(have.get(id)) !== sig(e)) await m.setDoc(m.doc(m.db, "transactions", id), e);
    for (const id of have.keys())
      if (!want.has(id)) await m.deleteDoc(m.doc(m.db, "transactions", id));
  } catch (e) {
    console.warn("JAMALI health-books:", (e && e.message) || e);
  } finally {
    busy = false;
    if (again) { again = false; reconcile(); }
  }
}

(async () => {
  api = await import("/sidebar.js");
  let t = null;
  const soon = () => { clearTimeout(t); t = setTimeout(reconcile, 150); };
  SOURCES.forEach((c) => api.onSnapshot(api.collection(api.db, c), soon, () => {}));
})();
})();

// ===================== shared barcode helper =====================
// code39SVG(text, opts) - a Code 39 barcode as an inline SVG string. No CDN,
// no library: the pharmacy unit-dose labels (page 326) print and scan from it.
// Code 39 carries A-Z, 0-9, space and - . $ / + %; anything else is dropped.
// (The password policy lives above: PASSWORD_POLICY + passwordCheck().)
const CODE39 = {
  "0": "101001101101", "1": "110100101011", "2": "101100101011", "3": "110110010101",
  "4": "101001101011", "5": "110100110101", "6": "101100110101", "7": "101001011011",
  "8": "110100101101", "9": "101100101101", "A": "110101001011", "B": "101101001011",
  "C": "110110100101", "D": "101011001011", "E": "110101100101", "F": "101101100101",
  "G": "101010011011", "H": "110101001101", "I": "101101001101", "J": "101011001101",
  "K": "110101010011", "L": "101101010011", "M": "110110101001", "N": "101011010011",
  "O": "110101101001", "P": "101101101001", "Q": "101010110011", "R": "110101011001",
  "S": "101101011001", "T": "101011011001", "U": "110010101011", "V": "100110101011",
  "W": "110011010101", "X": "100101101011", "Y": "110010110101", "Z": "100110110101",
  "-": "100101011011", ".": "110010101101", " ": "100110101101", "$": "100100100101",
  "/": "100100101001", "+": "100101001001", "%": "101001001001", "*": "100101101101"
};

export function code39SVG(text, opts) {
  const o = Object.assign({ height: 46, module: 2, quiet: 10 }, opts || {});
  const raw = String(text || "").toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+%]/g, "");
  let bits = "";
  for (const ch of "*" + raw + "*") bits += (CODE39[ch] || "") + "0";
  const w = bits.length * o.module + o.quiet * 2;
  let bars = "";
  let x = o.quiet;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "1") bars += '<rect x="' + x + '" y="0" width="' + o.module + '" height="' + o.height + '"/>';
    x += o.module;
  }
  return '<svg class="code39" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + o.height +
    '" width="' + w + '" height="' + o.height + '" role="img" aria-label="barcode ' + raw + '">' +
    '<rect width="' + w + '" height="' + o.height + '" fill="#ffffff"/>' +
    '<g fill="#111111">' + bars + "</g></svg>";
}

// ======================================================================
// KEEP THE SYSTEM FROM BEING INSPECTED (demand 24 Nov 2026 - "prevent
// our system from being inspected"): the standard browser deterrent
// layer on every page. The right-click menu, F12 and the DevTools /
// view-source / save-page shortcuts are refused at the capture phase,
// before any page handler can see them. Keyboard paste (Ctrl+V),
// printing (Ctrl+P) and every other interaction stay untouched; this
// is the honest first layer - the server keeps the real authority.
// ======================================================================
(function jamaliNoInspect() {
  function jamaliInspectStop(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  document.addEventListener("contextmenu", jamaliInspectStop, true);
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toUpperCase();
    if (k === "F12") return jamaliInspectStop(e);
    if ((e.ctrlKey || e.metaKey) && e.shiftKey &&
        (k === "I" || k === "J" || k === "C")) return jamaliInspectStop(e);
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey &&
        (k === "U" || k === "S")) return jamaliInspectStop(e);
  }, true);
})();

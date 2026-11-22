#!/usr/bin/env node
// JAMALI - SERVER/sync.js, the settings writer.
// SERVER/server.js is the single settings source: the marked block inside
// it holds the whole content of the settings - hosting, authentication
// and database - and this script writes the one runtime copy the site
// uses: the 502 CORE section inside public/sidebar.js, between the two
// JAMALI_502_BLOCK markers. (The old separate public/502.js is gone -
// sidebar.js is the one shared module of the web root.)
// The old generated settings files (vercel.json, firebase.json,
// .firebaserc, firestore.rules, apply-rules.sh) no longer live in the
// repository: their content stays here in SERVER/server.js, and the
// Firestore rules are published from the Firebase console.
// Run it from anywhere:   node SERVER/sync.js

"use strict";

const fs = require("fs");
const path = require("path");

const START = "// ==== JAMALI SETTINGS SOURCE";
const END = "// ==== END JAMALI SETTINGS SOURCE ====";
const BLOCK_BEGIN = "/* ==== JAMALI_502_BLOCK_BEGIN (generated from SERVER/server.js) ==== */";
const BLOCK_END = "/* ==== JAMALI_502_BLOCK_END ==== */";

function fail(message) {
  console.error("ABORT: " + message);
  process.exit(1);
}

const root = path.resolve(__dirname, "..");
const serverPath = path.join(root, "SERVER", "server.js");
const serverText = fs.readFileSync(serverPath, "utf8");

const a = serverText.indexOf(START);
const b = serverText.indexOf(END);
if (a === -1 || b === -1 || b <= a) fail("the settings block is missing from SERVER/server.js.");
const block = serverText.slice(a, b);

const S = new Function(
  block +
    "\nreturn { DATABASE_PROJECT, VERCEL_SPEC, FIREBASE_JSON_SPEC, FIRESTORE_RULES, APPLY_RULES_SH };"
)();

if (typeof S.DATABASE_PROJECT !== "string" || !S.DATABASE_PROJECT) {
  fail("DATABASE_PROJECT is empty.");
}
if (!S.VERCEL_SPEC || !Array.isArray(S.VERCEL_SPEC.redirects) || !S.VERCEL_SPEC.redirects.length) {
  fail("VERCEL_SPEC.redirects is empty.");
}
if (typeof S.FIRESTORE_RULES !== "string" || S.FIRESTORE_RULES.indexOf("rules_version") !== 0) {
  fail("FIRESTORE_RULES does not look like Firestore rules.");
}
if (typeof S.APPLY_RULES_SH !== "string"
  || S.APPLY_RULES_SH.indexOf("deploy --only firestore:rules") === -1
  || S.APPLY_RULES_SH.indexOf("login") === -1) {
  fail("APPLY_RULES_SH does not look like the rules publisher.");
}

const sidebarPath = path.join(root, "public", "sidebar.js");
if (!fs.existsSync(sidebarPath)) fail("public/sidebar.js is missing - the web root keeps index.html, sidebar.js and 404.html.");
const sidebarText = fs.readFileSync(sidebarPath, "utf8");
const bi = sidebarText.indexOf(BLOCK_BEGIN);
const be = sidebarText.indexOf(BLOCK_END);
if (bi === -1 || be === -1 || be <= bi) {
  fail("the JAMALI_502_BLOCK_BEGIN/END markers are missing from public/sidebar.js - cannot write the 502 core.");
}

const coreText = BLOCK_BEGIN + "\n" + serverText.replace(/\s+$/, "") + "\n" + BLOCK_END;
const newSidebar = sidebarText.slice(0, bi) + coreText + sidebarText.slice(be + BLOCK_END.length);

fs.writeFileSync(sidebarPath, newSidebar);

console.log("JAMALI settings sync - written out of SERVER/server.js (project " + S.DATABASE_PROJECT + "):");
console.log("  public/sidebar.js - the 502 CORE block (" + Buffer.byteLength(coreText) + " bytes)");
console.log("done - commit what changed. Hosting, auth and database settings live in SERVER/server.js content.");

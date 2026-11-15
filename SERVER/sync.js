#!/usr/bin/env node
// JAMALI - SERVER/sync.js, the settings writer.
// SERVER/server.js is the single settings source: the marked block inside it
// holds the whole content of every settings file. This script reads that
// block and writes the files out, so the deploys always match the server:
//   vercel.json, firebase.json, .firebaserc, firestore.rules,
//   apply-rules.sh  and  public/502.js (a verbatim copy of the server).
// Run it from anywhere:   node SERVER/sync.js
// Edit the settings in SERVER/server.js, run the sync, commit what it
// writes - the written files are outputs and are never edited by hand.

"use strict";

const fs = require("fs");
const path = require("path");

const START = "// ==== JAMALI SETTINGS SOURCE";
const END = "// ==== END JAMALI SETTINGS SOURCE ====";

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
if (typeof S.APPLY_RULES_SH !== "string" || S.APPLY_RULES_SH.indexOf("firebase deploy") === -1) {
  fail("APPLY_RULES_SH does not look like the rules publisher.");
}

const json = (value) => JSON.stringify(value, null, 2) + "\n";
const text = (value) => (value.endsWith("\n") ? value : value + "\n");

const files = [
  ["vercel.json", json(S.VERCEL_SPEC)],
  ["firebase.json", json(S.FIREBASE_JSON_SPEC)],
  [".firebaserc", json({ projects: { default: S.DATABASE_PROJECT } })],
  ["firestore.rules", text(S.FIRESTORE_RULES)],
  ["apply-rules.sh", text(S.APPLY_RULES_SH)],
  ["public/502.js", serverText]
];

for (const [name, content] of files) {
  const target = path.join(root, name);
  fs.writeFileSync(target, content);
  if (name === "apply-rules.sh") fs.chmodSync(target, 0o755);
}

console.log("JAMALI settings sync - written out of SERVER/server.js (project " + S.DATABASE_PROJECT + "):");
for (const [name, content] of files) {
  console.log("  " + name + "  (" + Buffer.byteLength(content) + " bytes)");
}
console.log("done - commit what changed; the next deploy runs the same sync on Vercel.");

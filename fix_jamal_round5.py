#!/usr/bin/env python3
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

OK, WARN, FAIL = "[ OK ]", "[WARN]", "[FAIL]"
results = []


def report(level, msg):
    print(level, msg)
    results.append(level == FAIL)


def find_root():
    cwd = Path.cwd()
    for d in [cwd, *cwd.parents]:
        if (d / "public" / "index.html").exists():
            return d
    for d in cwd.rglob("public"):
        if d.is_dir() and (d / "index.html").exists():
            return d.parent
    return None


ROOT = find_root()
if not ROOT:
    print("ERROR: could not find the repo (no public/index.html here).")
    print("Run this script from inside the jamal repository folder.")
    sys.exit(1)

PUB = ROOT / "public"
SRV = ROOT / "server"
print("Repo root:", ROOT)

# ------------------------------------------------------------------ [STEP 1]
# restore the real self-contained firebase.js in server/
FIREBASE_JS = r'''// JAMALI — shared Firebase module (auth + firestore)
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

export { onAuthStateChanged, signInWithPopup, signOut };
export {
  getFirestore, collection, doc, addDoc, writeBatch,
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
'''

print("\n[STEP 1] firebase.js in server/ (out of public/, as you asked)")
SRV.mkdir(exist_ok=True)
fb = SRV / "firebase.js"
good = False
if fb.exists():
    t = fb.read_text(errors="ignore")
    good = (
        "gstatic" in t
        and "401.js" not in t
        and "linker.js" not in t
        and "export const auth" in t
        and "export const db" in t
        and "requireAuth" in t
    )
if good:
    print(OK, "server/firebase.js is already the self-contained version")
else:
    fb.write_text(FIREBASE_JS)
    print(OK, "server/firebase.js restored (was a stub importing ./401.js)")
pub_fb = PUB / "firebase.js"
if pub_fb.exists():
    pub_fb.unlink()
    print(OK, "removed public/firebase.js (kept out of public as you asked)")

# ------------------------------------------------------------------ [STEP 2]
# vercel.json: copy firebase.js into public at BUILD time only
print("\n[STEP 2] vercel.json buildCommand (serves /firebase.js, repo stays clean)")
vj = ROOT / "vercel.json"
try:
    data = json.loads(vj.read_text()) if vj.exists() else {}
except Exception as e:
    data = {}
    report(WARN, "vercel.json is not valid JSON (" + str(e) + "); recreating it")
BC = "cp -f server/firebase.js public/firebase.js"
if data.get("buildCommand") == BC:
    print(OK, "buildCommand already present")
else:
    data["buildCommand"] = BC
    vj.write_text(json.dumps(data, indent=2) + "\n")
    print(OK, 'added "buildCommand": "' + BC + '"')

# ------------------------------------------------------------------ [STEP 3]
# sidebar.js surgery
print("\n[STEP 3] sidebar.js repairs")
sb = PUB / "sidebar.js"
if not sb.exists():
    report(FAIL, "public/sidebar.js is missing — cannot repair the menu")
    sb_src = ""
else:
    sb_src = sb.read_text(errors="ignore")

    GOOD_SEL = 'querySelectorAll("a[' + 'href]")'
    BAD_SEL = 'querySelectorAll("ar' + 'ef]")'
    if BAD_SEL in sb_src:
        sb_src = sb_src.replace(BAD_SEL, GOOD_SEL)
        print(OK, "fixed the broken link-filter selector (it killed every page)")
    elif GOOD_SEL in sb_src:
        print(OK, "link-filter selector is valid")
    else:
        report(WARN, "link-filter selector not recognised — check manually")

    pat_wipe = re.compile(
        r'try\s*\{\s*history\.replaceState\(\s*\{\s*\}\s*,\s*""\s*,\s*"/"\s*\)\s*;?\s*\}'
        r'\s*catch\s*\(\s*[A-Za-z_$][\w$]*\s*\)\s*\{\s*\}')
    new = pat_wipe.sub('/* URL kept: the address bar stays on the real page */', sb_src)
    if new != sb_src:
        sb_src = new
        print(OK, "removed history.replaceState({}, \"/\") — refresh keeps the page")
    elif 'history.replaceState' not in sb_src:
        print(OK, "URL wipe already removed")
    else:
        report(WARN, "replaceState pattern not matched — check manually")

    guard = 'try { filterLinks(document); } catch (flErr) { console.warn("filterLinks skipped:", flErr); }'
    pat_dom = re.compile(
        r'(document\.addEventListener\(\s*"DOMContentLoaded"\s*,\s*function\s*\(\s*\)\s*\{)'
        r'([^{}]*?)(\}\s*\);)', re.S)
    m = pat_dom.search(sb_src)
    if m and 'flErr' not in m.group(2):
        sb_src = sb_src[:m.start(2)] + '\n  ' + guard + '\n  ' + sb_src[m.end(2):]
        print(OK, "guarded the DOMContentLoaded filterLinks call")
    pat_else = re.compile(r'(\}\s*else\s*\{)(\s*)filterLinks\(document\);')
    if pat_else.search(sb_src):
        sb_src = pat_else.sub(r'\1\2' + guard, sb_src, count=1)
        print(OK, "guarded the direct filterLinks call")
    if 'flErr' in sb_src:
        pass
    else:
        report(WARN, "filterLinks guard not applied (check block order)")

    sb.write_text(sb_src)

# ------------------------------------------------------------------ [STEP 3.5]
# remove duplicate import statements — 7 pages carry a SECOND
# import {...} from "/firebase.js" re-importing names already bound at the
# top. ES modules forbid duplicate bindings, so those page scripts died at
# parse time (no listeners, no tables, nothing worked on them).
print("\n[STEP 3.5] duplicate-import cleanup on page scripts")
all_imp = re.compile(
    r'import\s*\{([^}]*)\}\s*from\s*["\'][^"\']+["\']\s*;?', re.S)
dedup_pages = []
for p in sorted(PUB.rglob("*.js")):
    src = p.read_text(errors="ignore")
    bound = set()
    remove_spans = []
    for m in all_imp.finditer(src):
        names = []
        for piece in m.group(1).split(","):
            piece = piece.strip()
            if not piece:
                continue
            parts = [x.strip() for x in piece.split(" as ")]
            # the LOCAL binding of `A as B` is B, not A — aliases must be
            # compared by alias or the engine's aliased firebase import
            # would wrongly shadow the page's own imports on re-runs
            names.append((parts[-1] if len(parts) > 1 else parts[0]))
        if names and all(nm in bound for nm in names):
            remove_spans.append((m.start(), m.end()))
        else:
            bound.update(names)
    if remove_spans:
        out, last = [], 0
        for a, b in remove_spans:
            out.append(src[last:a])
            last = b
        out.append(src[last:])
        p.write_text("".join(out))
        dedup_pages.append(p.relative_to(PUB).as_posix())
if dedup_pages:
    for d in dedup_pages:
        print(OK, "removed duplicate import(s): " + d)
else:
    print(OK, "no duplicate imports found")

# ------------------------------------------------------------------ [STEP 3.4]
# remove imports of modules that do not exist anywhere in the repo
print("\n[STEP 3.4] dead-module imports")
DEAD_FROMS = [
    re.compile(r'import\s*\{[^}]*\}\s*from\s*["\']\./core\.js["\']\s*;?\n?', re.S),
    re.compile(r'import\s*\{[^}]*\}\s*from\s*["\']/reports/507\.js["\']\s*;?\n?', re.S),
]
dead_hits = 0
for p in sorted(PUB.rglob("*.js")):
    src = p.read_text(errors="ignore")
    new = src
    for pat in DEAD_FROMS:
        new = pat.sub("", new)
    if new != src:
        p.write_text(new)
        dead_hits += 1
        print(OK, "removed dead module import: " + p.relative_to(PUB).as_posix())
if not dead_hits:
    print(OK, "no dead module imports found")

# ------------------------------------------------------------------ [STEP 3.6]
# restore the shared engine (see header: ./core.js, /reports/507.js,
# initJournal, buildAccounts, actsHTML... were never committed)
print("\n[STEP 3.6] shared engine inline")
CORE_IMPORT = (
    'import { db as jamaliCoreDb, collection as jamaliCoreCollection, '
    'getDocs as jamaliCoreGetDocs, doc as jamaliCoreDoc, '
    'deleteDoc as jamaliCoreDeleteDoc, requireAuth as jamaliCoreRequireAuth, '
    'onSnapshot as jamaliCoreOnSnapshot } from "/firebase.js";\n')

ENGINE_BODY = r'''(function () {
  if (typeof window === "undefined" || window.JAMALI_CORE) return;
  window.JAMALI_CORE = true;
  var G = window;
  var DAY = 86400000;
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) {
    return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  function num1(n) {
    var v = Number(n || 0);
    return Math.round(v * 10) / 10;
  }
  function asDate(ts) {
    if (!ts) return null;
    if (typeof ts.toDate === "function") return ts.toDate();
    if (ts instanceof Date) return ts;
    var d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  function parseDay(v) {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      var p = v.split("-").map(Number);
      return new Date(p[0], p[1] - 1, p[2]);
    }
    return asDate(v);
  }
  function fmtDay(v) {
    var d = parseDay(v);
    return d ? d.toLocaleDateString("en-GB") : "\u2014";
  }
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function today() { return startOfDay(new Date()); }
  function addDays(d, n) { var x = startOfDay(d); x.setDate(x.getDate() + n); return x; }
  function isoToday() {
    var t = today(), p = function (n) { return String(n).padStart(2, "0"); };
    return t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
  }
  function fmtBal(n) {
    var v = Number(n || 0);
    if (!v) return "0";
    return v > 0 ? money(v) + " Dr" : money(-v) + " Cr";
  }
  var REV_WORDS = ["sales", "interest received", "rent received", "discount received",
    "commission received", "commission receivable", "other income", "service income", "donation"];
  var EXP_WORDS = ["purchases", "rent", "transport", "wages", "salary", "salaries",
    "electricity", "water", "telephone", "internet", "repairs", "insurance", "bank charges",
    "interest allowed", "advertising", "stationery", "postage", "cleaning", "security",
    "fuel", "maintenance", "legal", "accounting fees", "bad debts", "carriage", "customs",
    "licence", "license", "bank fee", "delivery", "printing", "petty expense"];
  function classifyAcct(name) {
    var n = String(name || "").toLowerCase();
    if (n === "cash" || n === "bank" || n === "drawings") return "asset";
    var i;
    for (i = 0; i < REV_WORDS.length; i++) if (n.indexOf(REV_WORDS[i]) !== -1) return "revenue";
    for (i = 0; i < EXP_WORDS.length; i++) if (n.indexOf(EXP_WORDS[i]) !== -1) return "expense";
    if (n.indexOf("loan") !== -1 || n.indexOf("creditor") !== -1 || n.indexOf("accrued") !== -1 ||
        n.indexOf("payable") !== -1 || n.indexOf("unearned") !== -1 || n === "capital") return "liability";
    return "asset";
  }
  function classify(t) {
    var ty = String((t && t.transactionType) || "").toUpperCase();
    var tn = String((t && t.transactionName) || "").trim().toLowerCase();
    var fm = String((t && t.flowMethod) || "").trim().toLowerCase();
    var person = !!(t && String(t.name || "").trim());
    if (ty === "IN") {
      if (tn === "sales") return "sales";
      if (tn === "purchase return" || tn === "purchase returns" ||
          tn === "purchases return" || tn === "purchases returns") return "purchasesReturns";
      if (tn === "debtors recover") return "cashReceipts";
      if (tn === "capital") return (person && fm === "credit") ? "debtorsOpening" : null;
      return null;
    }
    if (ty === "OUT") {
      if (tn === "purchases" || tn === "purchase") return "purchases";
      if (tn === "sales return" || tn === "sales returns") return "salesReturns";
      if (tn === "creditors recover") return "cashPayments";
      if (tn === "capital") return (person && fm === "credit") ? "creditorsOpening" : null;
      return null;
    }
    return null;
  }
  function postingsFor(t) {
    var ty = String((t && t.transactionType) || "").toUpperCase();
    var fm = String((t && t.flowMethod) || "").trim();
    var pot = fm.toLowerCase() === "bank" ? "Bank" : "Cash";
    var amt = Number((t && t.amount) || 0);
    var who = String((t && t.name) || "").trim();
    var tn = String((t && t.transactionName) || "").trim() || "Unclassified";
    var detail = who ? who + " \u2014 " + tn : tn;
    var folio = pot.charAt(0).toUpperCase();
    if (ty === "IN") return { dr: { acct: pot, detail: detail, folio: folio, amt: amt },
      cr: { acct: tn, detail: detail, folio: folio, amt: amt } };
    if (ty === "OUT") return { dr: { acct: tn, detail: detail, folio: folio, amt: amt },
      cr: { acct: pot, detail: detail, folio: folio, amt: amt } };
    var l = tn.toLowerCase();
    if (l === "cash deposit") return { dr: { acct: "Bank", detail: detail, folio: "B", amt: amt },
      cr: { acct: "Cash", detail: detail, folio: "C", amt: amt } };
    if (l === "cash withdrawal") return { dr: { acct: "Cash", detail: detail, folio: "C", amt: amt },
      cr: { acct: "Bank", detail: detail, folio: "B", amt: amt } };
    if (l === "bank charges") return { dr: { acct: "Bank Charges", detail: detail, folio: "B", amt: amt },
      cr: { acct: "Bank", detail: detail, folio: "B", amt: amt } };
    return { dr: { acct: pot, detail: detail, folio: folio, amt: amt },
      cr: { acct: tn, detail: detail, folio: folio, amt: amt } };
  }
  function buildAccounts(txns) {
    var accts = new Map(), people = new Set();
    function post(name, side, row) {
      if (!name) return;
      if (!accts.has(name)) accts.set(name, { kind: "asset", dr: [], cr: [], lastTs: null });
      var a = accts.get(name);
      a[side].push(row);
      var ts = asDate(row.ts);
      if (ts && (!a.lastTs || ts > a.lastTs)) a.lastTs = ts;
    }
    (txns || []).forEach(function (t) {
      var p = postingsFor(t);
      var ts = asDate(t.dateTime);
      var dateStr = t.date || (ts ? fmtDay(ts) : "\u2014");
      post(p.dr.acct, "dr", { id: t.id, date: dateStr, detail: p.dr.detail,
        folio: p.dr.folio, amt: Number(p.dr.amt) || 0, ts: ts });
      post(p.cr.acct, "cr", { id: t.id, date: dateStr, detail: p.cr.detail,
        folio: p.cr.folio, amt: Number(p.cr.amt) || 0, ts: ts });
      var pn = String(t.name || "").trim();
      if (pn && pn.toLowerCase() !== "cash" && pn.toLowerCase() !== "bank") people.add(pn);
    });
    accts.forEach(function (a, n) {
      a.kind = people.has(n) ? "person" : classifyAcct(n);
    });
    var order = Array.from(accts.keys()).sort(function (x, y) { return x.localeCompare(y); });
    var creditPeople = [];
    people.forEach(function (n) { if (accts.has(n)) creditPeople.push(n); });
    return { order: order, accts: accts, creditPeople: creditPeople };
  }
  function accountBalance(accts, name) {
    var a = accts && accts.get ? accts.get(name) : null;
    if (!a) return 0;
    var dr = a.dr.reduce(function (s, r) { return s + (Number(r.amt) || 0); }, 0);
    var cr = a.cr.reduce(function (s, r) { return s + (Number(r.amt) || 0); }, 0);
    return dr - cr;
  }
  function collRef(name) { return jamaliCoreCollection(jamaliCoreDb, name); }
  function jamaliSort(rows) {
    return rows.sort(function (a, b) {
      var da = asDate(a.dateTime || a.date || a.at || a.dueDate) || null;
      var dbb = asDate(b.dateTime || b.date || b.at || b.dueDate) || null;
      return (da ? da.getTime() : 0) - (dbb ? dbb.getTime() : 0);
    });
  }
  function jamaliRows(snap) {
    return snap.docs.map(function (d) {
      return Object.assign({ id: d.id }, d.data({ serverTimestamps: "estimate" }));
    });
  }
  function readColl(name, cb) {
    jamaliCoreGetDocs(collRef(name)).then(function (snap) {
      cb(jamaliSort(jamaliRows(snap)));
    }).catch(function (e) { console.warn("readColl " + name + " failed", e); cb([]); });
  }
  function readTx(cb, errCb) {
    jamaliCoreGetDocs(collRef("transactions")).then(function (snap) {
      cb(jamaliSort(jamaliRows(snap)));
    }).catch(function (e) {
      if (errCb) errCb(e); else console.warn("readTx failed", e);
    });
  }
  function cellHtml(c) {
    if (c == null || c === "") return "<td></td>";
    if (typeof c === "object") {
      var cls = [];
      if (c.strong) cls.push("c-party");
      if (c.amt) cls.push("c-amount");
      if (c.date) cls.push("c-date");
      if (c.num) cls.push("c-num");
      if (c.desc) cls.push("c-desc");
      var inner = (c.raw != null) ? String(c.raw) : esc(c.v);
      return "<td" + (cls.length ? ' class="' + cls.join(" ") + '"' : "") + ">" + inner + "</td>";
    }
    return "<td>" + esc(c) + "</td>";
  }
  function rowCells(cells) {
    return "<tr>" + (cells || []).map(cellHtml).join("") + "</tr>";
  }
  function totalCells(cells) {
    return '<tr class="total-row">' + (cells || []).map(function (c) {
      if (c == null || c === "") return "<td></td>";
      if (typeof c === "object" && c.label != null) {
        return '<td class="c-desc">' + esc(c.label === 1 ? "TOTAL" : c.label) + "</td>";
      }
      return cellHtml(c);
    }).join("") + "</tr>";
  }
  function shell(rootSel, cols, opts) {
    opts = opts || {};
    var root = typeof rootSel === "string" ? document.querySelector(rootSel) : (rootSel || document.body);
    var icon = opts.icon || "\uD83D\uDCCB";
    var card = document.createElement("div");
    card.className = "card";
    card.style.display = "none";
    var tw = document.createElement("div");
    tw.className = "table-wrap";
    var tbl = document.createElement("table");
    tbl.className = "bk";
    var ths = (cols || []).map(function (c) {
      return "<th" + (c && c.amt ? ' class="amt"' : "") + ">" +
        esc(c && c.label != null ? c.label : "") + "</th>";
    }).join("");
    tbl.innerHTML = "<thead><tr>" + ths + "</tr></thead><tbody></tbody><tfoot></tfoot>";
    tw.appendChild(tbl);
    card.appendChild(tw);
    var kv = document.createElement("section");
    kv.className = "card kv-card";
    kv.style.display = "none";
    kv.innerHTML = '<h2 class="kv-title"></h2><div class="kv-rows"></div>';
    var empty = document.createElement("section");
    empty.className = "card";
    empty.innerHTML = '<div class="empty"><div class="empty-icon">' + icon +
      '</div><div class="empty-title">Loading\u2026</div><div class="empty-sub"></div></div>';
    var count = document.createElement("p");
    count.className = "count-line";
    root.appendChild(card);
    root.appendChild(kv);
    root.appendChild(empty);
    root.appendChild(count);
    return { root: root, card: card, tableWrap: tw, tbody: tbl.querySelector("tbody"),
      tfoot: tbl.querySelector("tfoot"), empty: empty, count: count, kv: kv,
      kvTitle: kv.querySelector(".kv-title"), kvRows: kv.querySelector(".kv-rows") };
  }
  function showEmpty(ui, title, sub) {
    if (ui.card) ui.card.style.display = "none";
    if (ui.kv) ui.kv.style.display = "none";
    if (ui.empty) {
      ui.empty.hidden = false;
      var t = ui.empty.querySelector(".empty-title"), s = ui.empty.querySelector(".empty-sub");
      if (t) t.textContent = title;
      if (s) s.textContent = sub || "";
    }
    if (ui.count) ui.count.textContent = "";
  }
  function failState(ui, e, label) {
    if (ui.card) ui.card.style.display = "none";
    if (ui.kv) ui.kv.style.display = "none";
    if (ui.empty) {
      ui.empty.hidden = false;
      var t = ui.empty.querySelector(".empty-title"), s = ui.empty.querySelector(".empty-sub");
      if (t) t.textContent = "Could not load " + label;
      if (s) s.textContent = (e && e.code === "permission-denied")
        ? "Sign in again, then check your Firestore rules."
        : ((e && e.message) || String(e || "unknown error"));
    }
    if (ui.count) ui.count.textContent = "";
  }
  function periodBar(rootSel, mode) {
    var root = typeof rootSel === "string" ? document.querySelector(rootSel) : rootSel;
    var bar = document.createElement("div");
    bar.className = "period-bar";
    bar.style.cssText = "display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;" +
      "background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 16px;" +
      "margin:0 0 14px;font-size:13px;font-weight:700;color:#475569";
    var cbs = [];
    function fire() { cbs.forEach(function (f) { f(); }); }
    function mkField(lab) {
      var w = document.createElement("label");
      w.style.cssText = "display:flex;flex-direction:column;gap:4px";
      w.textContent = lab;
      var i = document.createElement("input");
      i.type = "date";
      i.style.cssText = "border:1px solid #cbd5e1;border-radius:8px;padding:7px 9px;font-size:14px;font-weight:600";
      w.appendChild(i);
      bar.appendChild(w);
      return i;
    }
    var a, b;
    if (mode === "asof") { a = mkField("As at"); }
    else { a = mkField("From"); b = mkField("To"); }
    var clr = document.createElement("button");
    clr.type = "button";
    clr.textContent = "Clear";
    clr.style.cssText = "border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer";
    clr.addEventListener("click", function () { a.value = ""; if (b) b.value = ""; fire(); });
    bar.appendChild(clr);
    a.addEventListener("change", fire);
    if (b) b.addEventListener("change", fire);
    if (root) root.insertBefore(bar, root.firstChild);
    var api = { el: bar, onChange: function (f) { cbs.push(f); } };
    if (mode === "asof") api.asof = function () { return a.value || null; };
    else {
      api.from = function () { return a.value || null; };
      api.to = function () { return b.value || null; };
    }
    return api;
  }
  function acctSelect(ui) {
    var s = document.createElement("select");
    s.style.cssText = "display:none;margin:0 0 14px;border:1px solid #cbd5e1;border-radius:9px;" +
      "padding:9px 12px;font-size:14px;font-weight:700;background:#fff;max-width:100%";
    if (ui && ui.card && ui.card.parentNode) ui.card.parentNode.insertBefore(s, ui.card);
    return s;
  }
  function kvRow(k, v, hl) {
    return '<div class="kv' + (hl ? " hl" : "") + '"><span class="k">' + esc(k) +
      '</span><span class="v">' + esc(v) + "</span></div>";
  }
  function actsHTML(id) {
    if (!id) return "";
    return ' <span class="c-act">' +
      '<button type="button" class="settle-btn" data-act="edit" data-id="' + esc(id) +
      '" title="Edit">\u270F\uFE0F</button>' +
      '<button type="button" class="settle-btn" data-act="del" data-id="' + esc(id) +
      '" title="Delete">\uD83D\uDDD1\uFE0F</button></span>';
  }
  function wireActions(root) {
    if (!root || !root.addEventListener) return;
    root.addEventListener("click", function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest("button[data-act]") : null;
      if (!btn || !root.contains(btn)) return;
      var id = btn.getAttribute("data-id");
      if (!id) return;
      if (btn.getAttribute("data-act") === "edit") {
        location.href = "/add-transaction/3?edit=" + encodeURIComponent(id) +
          "&back=" + encodeURIComponent(location.pathname + location.search);
      } else {
        if (!confirm("Delete this record? It disappears from every book at once.")) return;
        jamaliCoreDeleteDoc(jamaliCoreDoc(jamaliCoreDb, "transactions", id))
          .catch(function (e) { console.warn("delete failed", e); });
      }
    });
  }
  var JOURNAL_ICONS = { petty: "\uD83E\uDDF9", sales: "\uD83D\uDCB0", purchases: "\uD83D\uDED2",
    salesReturns: "\u21A9\uFE0F", purchasesReturns: "\u21AA\uFE0F", general: "\uD83D\uDCD3",
    cashReceipts: "\uD83D\uDCB5", cashPayments: "\uD83D\uDCB4" };
  var JOURNAL_TITLES = { petty: "Petty Cash book", sales: "Sales journal",
    purchases: "Purchases journal", salesReturns: "Sales returns journal",
    purchasesReturns: "Purchases returns journal", general: "General journal",
    cashReceipts: "Cash receipts journal", cashPayments: "Cash payments journal" };
  function journalKindOf(t) {
    var k = classify(t);
    if (k) return k;
    var tn = String(t.transactionName || "").trim().toLowerCase();
    if (tn === "petty expense" || tn === "petty cash") return "petty";
    return "general";
  }
  async function initJournal(kind) {
    await jamaliCoreRequireAuth();
    var jBody = document.getElementById("j-body");
    var jFoot = document.getElementById("j-foot");
    var emptyBox = document.getElementById("empty-state");
    var countLine = document.getElementById("count-line");
    var tableCard = document.getElementById("table-card");
    var ui = null;
    if (!(jBody && jFoot)) {
      ui = shell("#app", [{ label: "Date" }, { label: "Name" }, { label: "Amount", amt: true }],
        { icon: JOURNAL_ICONS[kind] || "\uD83D\uDCD3" });
      jBody = ui.tbody;
      jFoot = ui.tfoot;
      emptyBox = ui.empty;
      countLine = ui.count;
    }
    var cols = 3;
    if (tableCard) {
      var ths = tableCard.querySelectorAll("thead th");
      if (ths.length) cols = ths.length;
    }
    var render = function (txns) {
      var rows = txns.filter(function (t) { return journalKindOf(t) === kind; });
      if (!rows.length) {
        if (tableCard) tableCard.style.display = "none";
        if (emptyBox) {
          emptyBox.hidden = false;
          var te = emptyBox.querySelector(".empty-title"), se = emptyBox.querySelector(".empty-sub");
          if (te) te.textContent = "Nothing in the " + (JOURNAL_TITLES[kind] || "journal") + " yet";
          if (se && !se.textContent) se.textContent =
            "Every matching transaction recorded in Add Transaction lands here automatically.";
        }
        if (countLine) countLine.textContent = "";
        return;
      }
      var tot = 0, html = "";
      rows.forEach(function (t) {
        var amt = Number(t.amount || 0);
        tot += amt;
        var who = String(t.name || "").trim();
        var nameCell = who || (t.transactionName || "\u2014");
        html += rowCells([
          { v: fmtDay(t.dateTime || t.date), date: 1 },
          { v: nameCell },
          { v: money(amt), amt: true, raw: money(amt) + actsHTML(t.id) }
        ]);
      });
      jBody.innerHTML = html;
      var pads = "";
      for (var i = 1; i < cols - 1; i++) pads += "<td></td>";
      jFoot.innerHTML = '<tr class="total-row"><td class="c-desc">TOTAL</td>' + pads +
        '<td class="c-amount">' + money(tot) + "</td></tr>";
      if (tableCard) tableCard.style.display = "";
      if (emptyBox) emptyBox.hidden = true;
      if (countLine) countLine.textContent = rows.length + " records \u00B7 total " + money(tot) + ".";
    };
    jamaliCoreOnSnapshot(collRef("transactions"), function (snap) {
      render(jamaliSort(jamaliRows(snap)));
    }, function (e) {
      if (emptyBox) {
        emptyBox.hidden = false;
        var tf = emptyBox.querySelector(".empty-title"), sf = emptyBox.querySelector(".empty-sub");
        if (tf) tf.textContent = "Could not load the " + (JOURNAL_TITLES[kind] || "journal");
        if (sf) sf.textContent = (e && e.message) || String(e || "unknown error");
      }
      if (countLine) countLine.textContent = "";
    });
  }
  async function initIS(cfg) {
    await jamaliCoreRequireAuth();
    var ui = shell(cfg && cfg.root, [{ label: "Particulars" },
      { label: "Amount", amt: true }, { label: "Total", amt: true }],
      { icon: "\uD83D\uDCC8" });
    var pb = periodBar(cfg && cfg.root, "range");
    var TX = null;
    var render = function () {
      if (!TX) return;
      var f = pb.from() ? parseDay(pb.from()) : null;
      var tt = pb.to() ? parseDay(pb.to()) : null;
      if (tt) tt.setHours(23, 59, 59, 999);
      var rows = TX.filter(function (t) {
        var ts = asDate(t.dateTime);
        if (!ts) return true;
        return (!f || ts >= f) && (!tt || ts <= tt);
      });
      var M = buildAccounts(rows);
      var rev = [], exp = [];
      M.order.forEach(function (n) {
        var a = M.accts.get(n);
        if (a.kind !== "revenue" && a.kind !== "expense") return;
        var bal = accountBalance(M.accts, n);
        if (!bal) return;
        if (a.kind === "revenue") rev.push({ n: n, bal: -bal });
        else exp.push({ n: n, bal: bal });
      });
      if (!rev.length && !exp.length) return showEmpty(ui, "No income or expenses yet",
        "The income statement builds itself from the sales and expense postings.");
      var tRev = rev.reduce(function (s, r) { return s + r.bal; }, 0);
      var tExp = exp.reduce(function (s, r) { return s + r.bal; }, 0);
      var profit = tRev - tExp;
      var html = "";
      rev.forEach(function (r) {
        html += rowCells([{ v: r.n + " A/C", strong: true }, { v: money(r.bal), amt: true }, ""]);
      });
      html += totalCells([{ label: "Total income" }, "", { v: money(tRev), amt: true }]);
      exp.forEach(function (r) {
        html += rowCells([{ v: r.n + " A/C", strong: true }, { v: money(r.bal), amt: true }, ""]);
      });
      ui.tbody.innerHTML = html;
      ui.tfoot.innerHTML =
        totalCells([{ label: "Total expenses" }, "", { v: money(tExp), amt: true }]) +
        totalCells([{ label: profit >= 0 ? "Net profit" : "Net loss" }, "",
          { v: money(Math.abs(profit)), amt: true }]);
      ui.card.style.display = "";
      ui.empty.hidden = true;
      ui.count.textContent = rev.length + " income accounts \u00B7 " + exp.length +
        " expense accounts \u00B7 net " + (profit >= 0 ? money(profit) + " profit" : money(-profit) + " loss") + ".";
    };
    readTx(function (tx) { TX = tx; render(); }, function (e) { failState(ui, e, "the Income Statement"); });
    pb.onChange(render);
  }
  async function initBS(cfg) {
    await jamaliCoreRequireAuth();
    var ui = shell(cfg && cfg.root, [{ label: "Account" }, { label: "Amount", amt: true }],
      { icon: "\u2696\uFE0F" });
    readTx(function (tx) {
      var M = buildAccounts(tx);
      var assets = [], caps = [], profit = 0;
      M.order.forEach(function (n) {
        var a = M.accts.get(n);
        var bal = accountBalance(M.accts, n);
        if (!bal) return;
        if (a.kind === "revenue" || a.kind === "expense") { profit += -bal; return; }
        if (bal > 0) assets.push({ n: n, bal: bal });
        else caps.push({ n: n, bal: -bal });
      });
      if (!assets.length && !caps.length) return showEmpty(ui, "Nothing on the balance sheet yet",
        "Record transactions and the balance sheet balances itself.");
      var tA = assets.reduce(function (s, r) { return s + r.bal; }, 0);
      var tC = caps.reduce(function (s, r) { return s + r.bal; }, 0) + Math.max(profit, 0)
        - Math.max(-profit, 0);
      var html = "";
      assets.forEach(function (r) {
        html += rowCells([{ v: r.n + " A/C", strong: true }, { v: money(r.bal), amt: true }]);
      });
      caps.forEach(function (r) {
        html += rowCells([{ v: r.n + " A/C", strong: true }, { v: money(r.bal), amt: true }]);
      });
      ui.tbody.innerHTML = html;
      ui.tfoot.innerHTML =
        totalCells([{ label: profit >= 0 ? "Net profit" : "Net loss" }, { v: money(Math.abs(profit)), amt: true }]) +
        totalCells([{ label: 1 }, { v: money(tA), amt: true }]) +
        totalCells([{ label: "Total" }, { v: money(tC + Math.max(profit, 0) - Math.max(-profit, 0)), amt: true }]);
      ui.card.style.display = "";
      ui.empty.hidden = true;
      ui.count.textContent = assets.length + " debit balances \u00B7 " + caps.length +
        " credit balances \u00B7 totals " + money(tA) + " = " + money(tC + Math.max(profit, 0) - Math.max(-profit, 0)) +
        (tA === tC + Math.max(profit, 0) - Math.max(-profit, 0) ? " \u2014 balanced." : " \u2014 OUT OF BALANCE.");
    }, function (e) { failState(ui, e, "the Balance Sheet"); });
  }
  G.DAY = DAY;
  G.esc = esc; G.money = money; G.num1 = num1; G.asDate = asDate; G.parseDay = parseDay;
  G.fmtDay = fmtDay; G.startOfDay = startOfDay; G.today = today; G.addDays = addDays;
  G.isoToday = isoToday; G.fmtBal = fmtBal; G.classify = classify;
  G.classifyAcct = classifyAcct; G.postingsFor = postingsFor; G.buildAccounts = buildAccounts;
  G.accountBalance = accountBalance; G.collRef = collRef; G.readColl = readColl;
  G.readTx = readTx; G.rowCells = rowCells; G.totalCells = totalCells; G.shell = shell;
  G.showEmpty = showEmpty; G.failState = failState; G.periodBar = periodBar;
  G.acctSelect = acctSelect; G.kvRow = kvRow; G.actsHTML = actsHTML;
  G.wireActions = wireActions; G.initJournal = initJournal; G.initIS = initIS; G.initBS = initBS;
})();
'''

PREAMBLE = ("/* JAMALI CORE \u2014 restored shared engine, inlined so every folder "
            "keeps 1 html + 1 css + 1 js */\n" + CORE_IMPORT + ENGINE_BODY + "\n")

ENGINE_SYMS = ["DAY", "esc", "money", "num1", "asDate", "parseDay", "fmtDay", "startOfDay",
    "today", "addDays", "isoToday", "fmtBal", "classify", "classifyAcct", "postingsFor",
    "buildAccounts", "accountBalance", "collRef", "readColl", "readTx", "rowCells",
    "totalCells", "shell", "showEmpty", "failState", "periodBar", "acctSelect", "kvRow",
    "actsHTML", "wireActions", "initJournal", "initIS", "initBS"]


def sym_defined(src, s):
    return bool(re.search(
        r'\bfunction\s+' + re.escape(s) + r'\b|\b(?:const|let|var)\s+' + re.escape(s) + r'\b',
        src))


def sym_called(src, s):
    return bool(re.search(r'(?<![\w.$])' + re.escape(s) + r'\s*\(', src))


injected = 0
for p in sorted(PUB.rglob("*.js")):
    if p.name in ("menu.js", "sidebar.js"):
        continue
    src = p.read_text(errors="ignore")
    if "JAMALI_CORE" in src:
        continue
    needs = any(sym_called(src, s) and not sym_defined(src, s) for s in ENGINE_SYMS)
    if not needs:
        continue
    p.write_text(PREAMBLE + src)
    injected += 1
if injected:
    print(OK, "engine inlined into " + str(injected) + " page scripts")
else:
    print(OK, "engine already present everywhere")

# ------------------------------------------------------------------ [STEP 3.7]
# fix duplicate declarations (esc, pad, chip...) — node --check reports the
# duplicate's line, we surgically remove exactly that declaration and repeat
# until the file parses.
print("\n[STEP 3.7] duplicate declarations")
node_bin = shutil.which("node")


def check_esm(path):
    if not node_bin:
        return True, "", None
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / "m.mjs"
        tmp.write_text(path.read_text(errors="ignore"))
        r = subprocess.run([node_bin, "--check", str(tmp)],
                           capture_output=True, text=True)
        err = r.stderr or ""
        line = None
        m = re.search(re.escape(tmp.name) + r":(\d+)", err)
        if m:
            line = int(m.group(1))
        return r.returncode == 0, err, line


def brace_end(src, open_idx):
    depth, j, n = 0, open_idx, len(src)
    while j < n:
        ch = src[j]
        if ch in "\"'`":
            q = ch
            j += 1
            while j < n and src[j] != q:
                j += 2 if src[j] == "\\" else 1
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return j
        j += 1
    return n - 1


def stmt_end(src, start):
    depth, j, n = 0, start, len(src)
    while j < n:
        ch = src[j]
        if ch in "\"'`":
            q = ch
            j += 1
            while j < n and src[j] != q:
                j += 2 if src[j] == "\\" else 1
        elif ch in "{([":
            depth += 1
        elif ch in "})]":
            depth -= 1
        elif ch == ";" and depth <= 0:
            return j
        j += 1
    return n - 1


DECL_RE = re.compile(
    r'\b(?:const|let|var)\s+(?P<names>[A-Za-z_$][\w$]*(?:\s*,\s*[A-Za-z_$][\w$]*)*)\s*[;=]')


def drop_decl_at(src, line_no):
    target_off = None
    lines = src.split("\n")
    if 1 <= line_no <= len(lines):
        target_off = sum(len(x) + 1 for x in lines[:line_no - 1])
    if target_off is None:
        return src, 0
    fn = re.compile(r'(?<![\w.$])function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{')
    for m in fn.finditer(src):
        if m.start() <= target_off <= m.end():
            end = brace_end(src, src.index("{", m.end() - 1)) + 1
            return src[:m.start()] + src[end:], 1
    for m in DECL_RE.finditer(src):
        if m.start() <= target_off <= m.end():
            names = [x.strip() for x in m.group("names").split(",")]
            earlier = src[:m.start()]
            keep = [n for n in names if not re.search(
                r'\b(?:const|let|var|function)\s+' + re.escape(n) +
                r'\b|\b' + re.escape(n) + r'\s*=[^=]', earlier)]
            if len(keep) == len(names):
                return src, 0
            if not keep:
                end = stmt_end(src, m.end(1)) + 1
                return src[:m.start()] + src[end:], 1
            return src[:m.start(1)] + ", ".join(keep) + src[m.end(1):], 1
    return src, 0


if node_bin:
    for p in sorted(PUB.rglob("*.js")):
        if p.name in ("menu.js", "sidebar.js"):
            continue
        ok, err, line = check_esm(p)
        rounds = 0
        while not ok and "has already been declared" in err and line and rounds < 12:
            src = p.read_text(errors="ignore")
            new, dropped = drop_decl_at(src, line)
            if not dropped:
                break
            p.write_text(new)
            rounds += 1
            ok, err, line = check_esm(p)
        if not ok:
            report(FAIL, "syntax still broken: " + p.relative_to(PUB).as_posix() +
                   " :: " + (err.strip().splitlines() or ["?"])[0][:90])
    print(OK, "duplicate-declaration pass finished")
else:
    print(OK, "node not found here \u2014 skipped this pass")

# ------------------------------------------------------------------ [STEP 3.8]
# 13 page htmls never load their own N.js (menu.js + sidebar.js only), so
# the whole health wing / computer page had zero behaviour.
print("\n[STEP 3.8] missing page script tags")
fixed_scripts = 0
for d in sorted(p for p in PUB.iterdir() if p.is_dir()):
    htmls = list(d.glob("*.html"))
    if len(htmls) != 1:
        continue
    n = htmls[0].stem
    src = htmls[0].read_text(errors="ignore")
    want = "/" + d.name + "/" + n + ".js"
    if want in src:
        continue
    if not (d / (n + ".js")).exists():
        continue
    tag = '<script type="module" src="' + want + '"></script>'
    if "</body>" in src:
        src = src.replace("</body>", tag + "\n</body>", 1)
    else:
        src += "\n" + tag + "\n"
    htmls[0].write_text(src)
    fixed_scripts += 1
    print(OK, "wired " + d.name + " to its " + n + ".js")
if not fixed_scripts:
    print(OK, "every page html already loads its own js")

# ------------------------------------------------------------------ [STEP 4]
# the two missing bill folders (menu 19 + 20)
print("\n[STEP 4] bills-receivable (19) + bills-payable (20) placeholder pages")
BILLS = [
    ("bills-receivable", "19", "Bills Receivable", "\U0001F4E5",
     "Bills you have drawn on your customers will be recorded here."),
    ("bills-payable", "20", "Bills Payable", "\U0001F4E4",
     "Bills your suppliers have drawn on you will be recorded here."),
]
for folder, n, label, icon, blurb in BILLS:
    d = PUB / folder
    d.mkdir(exist_ok=True)
    html, css, js = d / (n + ".html"), d / (n + ".css"), d / (n + ".js")
    if not html.exists():
        html.write_text(
            '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
            '<meta charset="UTF-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
            '<title>' + label + ' — JAMALI</title>\n'
            '<link rel="stylesheet" href="/' + folder + '/' + n + '.css">\n'
            '<script src="/menu.js" defer></script>\n'
            '<script src="/sidebar.js" defer></script>\n'
            '</head>\n<body>\n<main class="wrap">\n'
            '  <a class="back" href="/home/1">&larr; Home</a>\n'
            '  <h1><span class="ico">' + icon + '</span> ' + label + '</h1>\n'
            '  <p class="sub">' + blurb + '</p>\n'
            '  <p class="status" id="desk-status">This desk is reserved and opens soon.</p>\n'
            '</main>\n'
            '<script src="/' + folder + '/' + n + '.js" defer></script>\n'
            '</body>\n</html>\n')
        print(OK, folder + "/" + n + ".html created")
    if not css.exists():
        css.write_text(
            'body{margin:0;font-family:Georgia,"Times New Roman",serif;background:#f4f1ea;color:#1f2933}\n'
            '.wrap{max-width:760px;margin:0 auto;padding:48px 20px}\n'
            '.back{display:inline-block;margin-bottom:18px;color:#116149;text-decoration:none}\n'
            'h1{font-size:1.7rem;margin:0 0 10px}\n'
            '.ico{margin-right:8px}\n'
            '.sub{color:#52606d;font-size:1.02rem;line-height:1.5}\n'
            '.status{margin-top:26px;padding:14px 16px;border:1px dashed #9aa5b1;border-radius:8px;color:#52606d}\n')
        print(OK, folder + "/" + n + ".css created")
    if not js.exists():
        js.write_text(
            '(function () {\n'
            '  var el = document.getElementById("desk-status");\n'
            '  if (el) { el.textContent = "' + label + ' — reserved desk, coming soon."; }\n'
            '})();\n')
        print(OK, folder + "/" + n + ".js created")

# ------------------------------------------------------------------ [STEP 5]
# full audit
print("\n[STEP 5] audit")

try:
    data = json.loads(vj.read_text())
    if data.get("buildCommand"):
        print(OK, "vercel.json valid, buildCommand present")
    else:
        report(FAIL, "vercel.json lost its buildCommand")
except Exception as e:
    report(FAIL, "vercel.json unreadable: " + str(e))

needed = set()
for p in list(PUB.rglob("*.js")) + list(PUB.rglob("*.html")):
    src = p.read_text(errors="ignore")
    for m in re.finditer(
            r'import\s*\{([^}]*)\}\s*from\s*["\'][^"\']*firebase\.js["\']', src):
        for nm in m.group(1).split(","):
            nm = nm.strip().split(" as ")[-1].strip()
            if nm:
                needed.add(nm)
have = set()
if fb.exists():
    fsrc = fb.read_text(errors="ignore")
    have = set(re.findall(r'export (?:const|function|class|let|var) (\w+)', fsrc))
    for m in re.finditer(r'export\s*\{([^}]*)\}', fsrc):
        have |= {x.strip().split(" as ")[-1] for x in m.group(1).split(",") if x.strip()}
miss = sorted(needed - have)
if miss:
    report(FAIL, "firebase.js misses exports: " + ", ".join(miss))
else:
    print(OK, "firebase.js exports cover all " + str(len(needed)) +
          " names imported across the site")

allowed = {"index.html", "sidebar.js", "menu.js"}
extras = [f.name for f in PUB.iterdir() if f.is_file() and f.name not in allowed]
if extras:
    report(FAIL, "public root has extra files: " + ", ".join(extras))
else:
    print(OK, "public root = index.html + sidebar.js + menu.js only")

bad_folders = []
for d in sorted(p for p in PUB.iterdir() if p.is_dir()):
    names = {x.name for x in d.iterdir() if x.is_file()}
    subs = [x.name for x in d.iterdir() if x.is_dir()]
    h = [x for x in names if x.endswith(".html")]
    c = [x for x in names if x.endswith(".css")]
    j = [x for x in names if x.endswith(".js")]
    if subs or len(h) != 1 or len(c) != 1 or len(j) != 1:
        bad_folders.append((d.name, sorted(names)))
if bad_folders:
    for name, files in bad_folders:
        report(FAIL, "folder not 1+1+1: " + name + " -> " + ", ".join(files))
else:
    print(OK, "every page folder holds exactly 1 html + 1 css + 1 js")

menu_src = (PUB / "menu.js").read_text(errors="ignore") if (PUB / "menu.js").exists() else ""
dead = []
for m in re.finditer(r'folder:\s*"([^"]+)"\s*,\s*n:\s*(\d+)', menu_src):
    if not (PUB / m.group(1) / (m.group(2) + ".html")).exists():
        dead.append(m.group(1) + "/" + m.group(2))
if dead:
    report(FAIL, "menu items with no page file: " + ", ".join(dead))
else:
    print(OK, "every menu item points to an existing page file")

BAD_SEL_AUDIT = 'querySelectorAll("ar' + 'ef]")'
killers = []
for p in list(PUB.rglob("*.html")) + list(PUB.rglob("*.js")):
    t = p.read_text(errors="ignore")
    if BAD_SEL_AUDIT in t:
        killers.append(str(p) + " has a broken link-filter selector")
    if re.search(r'history\.replaceState\(\s*\{\s*\}\s*,\s*""\s*,\s*"/"\s*\)', t):
        killers.append(str(p) + " wipes the URL")
    if "SERVER/linker.js" in t or "/401.js" in t:
        killers.append(str(p) + " refs a dead module")
    if re.search(r'from\s*["\']\./core\.js["\']', t) or 'from "/reports/507.js"' in t:
        killers.append(str(p) + " imports a module that does not exist")
if killers:
    for k in killers:
        report(FAIL, k)
else:
    print(OK, "no broken selector, no URL wipe, no dead module refs in public/")

node = shutil.which("node")
if node:
    fails = []
    with tempfile.TemporaryDirectory() as td:
        jsfiles = [PUB / "sidebar.js", PUB / "menu.js"] + \
                  sorted(PUB.rglob("*.js"))
        for i, p in enumerate(jsfiles):
            if not p.is_file():
                continue
            tmp = Path(td) / ("m" + str(i) + ".mjs")
            tmp.write_text(p.read_text(errors="ignore"))
            r = subprocess.run([node, "--check", str(tmp)],
                               capture_output=True, text=True)
            if r.returncode != 0:
                fails.append(str(p) + " :: " + r.stderr.strip().splitlines()[0][:100])
    if fails:
        for f in fails[:10]:
            report(FAIL, "syntax: " + f)
    else:
        print(OK, "node --check passed for all " + str(len(jsfiles)) + " JS files")
else:
    report(WARN, "node not installed here — skipped the JS syntax check")

print("\n================ SUMMARY ================")
if any(results):
    print("PROBLEMS remain — read the [FAIL] lines above.")
else:
    print("ALL CHECKS PASSED.")
    print()
    print("Now commit and push so Vercel redeploys:")
    print('  git add -A')
    print('  git commit -m "Fix dead pages: restore firebase.js, remove the URL wipe,')
    print('    rebuild the shared engine, wire the health wing, add bill folders"')
    print('  git push')
    print()
    print("After the deploy opens: sign in (Google or username + token), then")
    print("every menu page opens under its own clean URL like /home/1 and the")
    print("address bar stays on the page you are on. Without a session the")
    print("access check still bounces you to the login screen — that part is")
    print("by design, exactly as you described.")

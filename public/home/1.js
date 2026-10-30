// home (page 1) — T76: the launcher grid is built from the menu tree
// and the account's grants. Home shows ONLY what the administrator
// assigned (main modules + the selected submodules); the administrator
// sees everything. Grants are re-read from the database on every load
// (one source of truth) and the session is updated to stay consistent
// with the sidebar. No grants -> blank home (hidden before paint).
import { requireAuth, db, doc, getDoc } from "/firebase.js";

/* T77: static home - no auth bounce here */ // not logged in? -> bounced to "/"

const SESSION_KEY = "JAMALI_SYSTEM_SESSION";
let S = null;
try { S = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch (e) { S = null; }

const isAdmin = !!(S && S.role === "admin");
let grants = S && Array.isArray(S.grants) ? S.grants.slice() : [];

try {
  if (S && S.id) {
    const snap = await getDoc(doc(db, "systemAccounts", S.id));
    if (snap.exists()) {
      const g = snap.data().grants;
      if (Array.isArray(g) && JSON.stringify(g) !== JSON.stringify(grants)) {
        grants = g.slice();
        S.grants = grants;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(S));
      }
    }
  }
} catch (e) { /* offline — fall back to the session copy */ }

function tree() {
  const M = window.JAMALI_MENU || [];
  const tops = [];
  let c1 = null, c2 = null;
  for (const it of M) {
    if (it.folder === "home" || it.folder === "system-admin") continue;
    if (it.d === 1) { c1 = { folder: it.folder, label: it.label, icon: it.icon, n: it.n, kids: [] }; tops.push(c1); c2 = null; }
    else if (it.d === 2 && c1) { c2 = { folder: it.folder, label: it.label, icon: it.icon, n: it.n, kids: [] }; c1.kids.push(c2); }
    else if (it.d === 3 && c1) { (c2 ? c2.kids : c1.kids).push({ folder: it.folder, label: it.label, icon: it.icon, n: it.n }); }
  }
  return tops;
}

function tile(t, cls) {
  const a = document.createElement("a");
  a.className = "tile" + (cls ? " " + cls : "");
  a.href = "/" + t.folder + "/" + t.n;
  const i = document.createElement("span");
  i.className = "tile-icon"; i.textContent = t.icon || "📄";
  const l = document.createElement("span");
  l.className = "tile-label"; l.textContent = t.label;
  a.appendChild(i); a.appendChild(l);
  return a;
}

const grid = document.getElementById("app-grid");
const subWrap = document.getElementById("sub-wrap");
const subGrid = document.getElementById("sub-grid");
const subs = [];

for (const t of tree()) {
  const mainOn = isAdmin || grants.indexOf(t.folder) !== -1;
  if (mainOn) grid.appendChild(tile(t));
  for (const k of t.kids) {
    if (isAdmin || grants.indexOf(k.folder) !== -1) subs.push(k);
    for (const g3 of k.kids) {
      if (isAdmin || grants.indexOf(g3.folder) !== -1) subs.push(g3);
    }
  }
}
for (const s of subs) subGrid.appendChild(tile(s, "sub"));
if (subs.length) subWrap.hidden = false;

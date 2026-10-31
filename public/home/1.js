// home (page 1) — T78: hierarchical launcher.
// Home shows ONLY the granted main modules. Clicking a module opens
// its submodules in place (drill-down); clicking a submodule opens its
// pages; a page with no children opens directly. Order is exactly the
// menu tree order, filtered by the account grants; the administrator
// sees the whole tree. No redirects, no flat "Modules" dump.
import { db, doc, getDoc } from "/firebase.js";

const SESSION_KEY = "JAMALI_SYSTEM_SESSION";
let S = null;
try { S = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch (e) { S = null; }

const isAdmin = !!(S && S.role === "admin");
let grants = S && Array.isArray(S.grants) ? S.grants.slice() : [];

// fresh grants from the database (one source of truth), silent update
(async () => {
  try {
    if (S && S.id) {
      const snap = await getDoc(doc(db, "systemAccounts", S.id));
      if (snap.exists()) {
        const g = snap.data().grants;
        if (Array.isArray(g) && JSON.stringify(g) !== JSON.stringify(grants)) {
          grants = g.slice();
          S.grants = grants;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(S));
          render();
        }
      }
    }
  } catch (e) { /* offline — the session copy is used */ }
})();

function tree() {
  const M = window.JAMALI_MENU || [];
  const tops = [];
  let c1 = null, c2 = null;
  for (const it of M) {
    if (it.folder === "home" || it.folder === "system-admin") continue;
    if (it.d === 1) { c1 = { folder: it.folder, label: it.label, icon: it.icon, n: it.n, kids: [] }; tops.push(c1); c2 = null; }
    else if (it.d === 2 && c1) { c2 = { folder: it.folder, label: it.label, icon: it.icon, n: it.n, kids: [] }; c1.kids.push(c2); }
    else if (it.d === 3 && c1) { (c2 ? c2.kids : c1.kids).push({ folder: it.folder, label: it.label, icon: it.icon, n: it.n, kids: [] }); }
  }
  return tops;
}

const on = (n) => isAdmin || grants.indexOf(n.folder) !== -1;
const grantedKids = (n) => (n.kids || []).filter(on);

function path() {
  let h = location.hash || "";
  if (h.indexOf("#/") === 0) h = h.slice(2); else h = "";
  return h.split("/").filter(Boolean);
}

function find(pathArr, tops) {
  let list = tops, node = null;
  for (const seg of pathArr) {
    const hit = list.filter((x) => x.folder === seg)[0];
    if (!hit) return null;
    node = hit;
    list = hit.kids || [];
  }
  return { node, kids: list };
}

function render() {
  const grid = document.getElementById("app-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const tops = tree();
  const p = path();
  const cur = p.length ? find(p, tops) : { node: null, kids: tops };
  if (p.length && !cur) { location.hash = "#/"; return; }

  let back = document.getElementById("lvl-back");
  let title = document.getElementById("lvl-title");
  if (!back) {
    back = document.createElement("a");
    back.id = "lvl-back"; back.className = "back"; back.textContent = "← Back";
    title = document.createElement("h2");
    title.id = "lvl-title"; title.className = "lvl-title";
    const wrap = grid.parentNode;
    wrap.insertBefore(title, grid);
    wrap.insertBefore(back, title);
  }
  if (p.length && cur.node) {
    back.hidden = false;
    back.href = p.length > 1 ? "#/" + p.slice(0, -1).join("/") : "#/";
    title.hidden = false;
    title.textContent = (cur.node.icon || "") + " " + cur.node.label;
  } else {
    back.hidden = true;
    title.hidden = true;
  }

  const kids = (p.length ? grantedKids(cur.node) : tops.filter(on)).slice();
  for (const k of kids) {
    const gk = grantedKids(k);
    const a = document.createElement("a");
    a.className = "tile" + (p.length ? " sub" : "");
    const i = document.createElement("span");
    i.className = "tile-icon"; i.textContent = k.icon || "📄";
    const l = document.createElement("span");
    l.className = "tile-label"; l.textContent = k.label;
    a.appendChild(i); a.appendChild(l);
    a.href = gk.length ? "#/" + p.concat([k.folder]).join("/")
                       : "/" + k.folder + "/" + k.n;
    grid.appendChild(a);
  }
  const main = document.querySelector("main.wrap");
  if (main) main.style.display = kids.length ? "" : "none";
}

window.addEventListener("hashchange", render);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", render);
} else {
  render();
}

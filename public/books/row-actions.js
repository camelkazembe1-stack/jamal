
import { db, doc, deleteDoc, writeBatch } from "/firebase.js";



const PEN_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
const BIN_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

const CSS = `
.ra-wrap { display: inline-flex; gap: 4px; margin-left: 8px; vertical-align: middle; align-items: center; }
.ra-btn {
  border: 0; background: none; padding: 3px; border-radius: 6px;
  cursor: pointer; line-height: 0; transition: .15s;
}
.ra-btn:hover { background: rgba(148, 163, 184, .18); }
.ra-btn:disabled { opacity: .4; cursor: wait; }
.ra-edit { color: #38bdf8; }
.ra-del { color: #f87171; }
.ra-pick {
  width: 13px; height: 13px; margin: 0 2px 0 0; cursor: pointer;
  accent-color: #f87171; vertical-align: middle; flex: none;
}
.ra-toast {
  position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%);
  background: #0f172a; color: #e2e8f0; border: 1px solid #334155;
  border-radius: 10px; padding: 10px 16px; font-size: 13px; font-family: system-ui, sans-serif;
  box-shadow: 0 10px 30px rgba(0,0,0,.45); z-index: 9999; max-width: 90vw;
}
.ra-toast.err { border-color: #7f1d1d; color: #fca5a5; }
.ra-bar {
  position: fixed; right: 18px; bottom: 18px; display: flex; gap: 10px; align-items: center;
  background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 12px;
  padding: 10px 14px; font-size: 13px; font-family: system-ui, sans-serif;
  box-shadow: 0 10px 30px rgba(0,0,0,.45); z-index: 9998;
}
.ra-bar[hidden] { display: none; }
.ra-bar-count { font-weight: 700; white-space: nowrap; }
.ra-bar button {
  border: 0; border-radius: 8px; padding: 6px 12px; font-size: 12.5px;
  cursor: pointer; transition: .15s; font-family: inherit; white-space: nowrap;
}
.ra-bar button:hover { filter: brightness(1.15); }
.ra-bar button:disabled { opacity: .5; cursor: wait; }
.ra-bar-mild { background: #1e293b; color: #cbd5e1; }
.ra-bar-del { background: #dc2626; color: #fff; font-weight: 700; }
`;

let styled = false;
function ensureCss() {
  if (styled) return;
  styled = true;
  const s = document.createElement("style");
  s.textContent = CSS;
  document.head.appendChild(s);
}

let toastEl = null;
let toastTimer = null;
function toast(msg, err) {
  ensureCss();
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "ra-toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.className = "ra-toast" + (err ? " err" : "");
  toastEl.style.display = "";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.style.display = "none"; }, 3200);
}

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));



const picked = new Set();
let bar = null;

function uncheckAll() {
  document.querySelectorAll(".ra-pick").forEach((cb) => { cb.checked = false; });
}

function refreshBar() {
  if (!bar) return;
  bar.count.textContent = picked.size + " selected";
  bar.root.hidden = picked.size === 0;
}

function ensureBar() {
  if (bar) return;
  const root = document.createElement("div");
  root.className = "ra-bar";
  root.hidden = true;
  root.setAttribute("role", "toolbar");
  root.setAttribute("aria-label", "Multi delete");
  root.innerHTML =
    '<span class="ra-bar-count">0 selected</span>' +
    '<button type="button" class="ra-bar-mild" data-ra-bar="all">Select all</button>' +
    '<button type="button" class="ra-bar-mild" data-ra-bar="clear">Clear</button>' +
    '<button type="button" class="ra-bar-del" data-ra-bar="del">' + BIN_SVG + " Delete selected</button>";
  document.body.appendChild(root);
  bar = {
    root,
    count: root.querySelector(".ra-bar-count"),
    all: root.querySelector('[data-ra-bar="all"]'),
    clear: root.querySelector('[data-ra-bar="clear"]'),
    del: root.querySelector('[data-ra-bar="del"]')
  };

  bar.all.addEventListener("click", () => {
    document.querySelectorAll(".ra-pick").forEach((cb) => {
      if (!cb.dataset.id) return;
      picked.add(cb.dataset.id);
      cb.checked = true;
    });
    refreshBar();
  });

  bar.clear.addEventListener("click", () => {
    picked.clear();
    uncheckAll();
    refreshBar();
  });

  bar.del.addEventListener("click", async () => {
    const ids = Array.from(picked);
    if (!ids.length || bar.del.disabled) return;
    if (!confirm("Delete " + ids.length + " selected transaction" + (ids.length === 1 ? "" : "s") +
      "? They disappear from every book and report.")) return;
    [bar.all, bar.clear, bar.del].forEach((b) => { b.disabled = true; });
    try {
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db);
        ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, "transactions", id)));
        await batch.commit();
      }
      picked.clear();
      uncheckAll();
      refreshBar();
      toast(ids.length + " transaction" + (ids.length === 1 ? "" : "s") + " deleted - every book is updated.");
    } catch (e) {
      const deny = e && (e.code === "permission-denied" ||
        String(e && e.message).indexOf("insufficient permissions") !== -1);
      toast(deny
        ? "Delete blocked: the database rules are not published yet. Open the Firebase console -> Firestore Database -> Rules, paste the latest rules, press Publish."
        : "Could not delete: " + ((e && e.message) || e), true);
    } finally {
      [bar.all, bar.clear, bar.del].forEach((b) => { b.disabled = false; });
      refreshBar();
    }
  });
}

function reconcile() {
  const present = new Set();
  document.querySelectorAll(".ra-pick").forEach((cb) => {
    if (!cb.dataset.id) return;
    present.add(cb.dataset.id);
    cb.checked = picked.has(cb.dataset.id);
  });
  let dropped = false;
  Array.from(picked).forEach((id) => {
    if (!present.has(id)) { picked.delete(id); dropped = true; }
  });
  if (dropped || picked.size) refreshBar();
}



export function actsHTML(id) {
  if (!id) return "";
  const i = esc(id);
  return '<span class="ra-wrap">' +
    '<input type="checkbox" class="ra-pick" data-id="' + i + '" title="Select for multi delete" aria-label="Select this transaction"' +
    (picked.has(id) ? " checked" : "") + ">" +
    '<button type="button" class="ra-btn ra-edit" data-ra="edit" data-id="' + i + '" title="Edit this transaction" aria-label="Edit this transaction">' + PEN_SVG + "</button>" +
    '<button type="button" class="ra-btn ra-del" data-ra="del" data-id="' + i + '" title="Delete this transaction" aria-label="Delete this transaction">' + BIN_SVG + "</button>" +
    "</span>";
}



export function wireActions(scopeEl) {
  ensureCss();
  if (!scopeEl || scopeEl.__raWired) return;
  scopeEl.__raWired = true;
  scopeEl.addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".ra-btn");
    if (!btn || btn.disabled) return;
    const id = btn.dataset.id;
    if (!id) return;

    if (btn.dataset.ra === "edit") {
      try {
        sessionStorage.setItem("jamaliEditTxn", id);
        sessionStorage.setItem("jamaliEditBack", location.pathname);
      } catch (e) { }
      location.href = "/add-transaction/3?edit=" + encodeURIComponent(id) +
        "&back=" + encodeURIComponent(location.pathname);
      return;
    }

    if (!confirm("Delete this transaction? It disappears from every book and report.")) return;
    btn.disabled = true;
    try {
      await deleteDoc(doc(db, "transactions", id));
      toast("Transaction deleted - every book is updated.");
    } catch (e) {
      btn.disabled = false;
      const deny = e && (e.code === "permission-denied" ||
        String(e && e.message).indexOf("insufficient permissions") !== -1);
      toast(deny
        ? "Delete blocked: the database rules are not published yet. Open the Firebase console -> Firestore Database -> Rules, paste the latest rules, press Publish."
        : "Could not delete: " + ((e && e.message) || e), true);
    }
  });

  scopeEl.addEventListener("change", (ev) => {
    const cb = ev.target.closest(".ra-pick");
    if (!cb || !cb.dataset.id) return;
    if (cb.checked) picked.add(cb.dataset.id);
    else picked.delete(cb.dataset.id);
    ensureBar();
    refreshBar();
  });

  ensureBar();
  const obs = new MutationObserver(() => reconcile());
  obs.observe(scopeEl, { childList: true, subtree: true });
  reconcile();
}

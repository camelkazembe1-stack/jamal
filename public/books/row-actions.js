
import { db, doc, deleteDoc } from "/firebase.js";



const PEN_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
const BIN_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

const CSS = `
.ra-wrap { display: inline-flex; gap: 4px; margin-left: 8px; vertical-align: middle; }
.ra-btn {
  border: 0; background: none; padding: 3px; border-radius: 6px;
  cursor: pointer; line-height: 0; transition: .15s;
}
.ra-btn:hover { background: rgba(148, 163, 184, .18); }
.ra-btn:disabled { opacity: .4; cursor: wait; }
.ra-edit { color: #38bdf8; }
.ra-del { color: #f87171; }
.ra-toast {
  position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%);
  background: #0f172a; color: #e2e8f0; border: 1px solid #334155;
  border-radius: 10px; padding: 10px 16px; font-size: 13px; font-family: system-ui, sans-serif;
  box-shadow: 0 10px 30px rgba(0,0,0,.45); z-index: 9999; max-width: 90vw;
}
.ra-toast.err { border-color: #7f1d1d; color: #fca5a5; }
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



export function actsHTML(id) {
  if (!id) return "";
  const i = esc(id);
  return '<span class="ra-wrap">' +
    '<button type="button" class="ra-btn ra-edit" data-ra="edit" data-id="' + i + '" title="Edit this transaction" aria-label="Edit this transaction">' + PEN_SVG + "</button>" +
    '<button type="button" class="ra-btn ra-del" data-ra="del" data-id="' + i + '" title="Delete this transaction" aria-label="Delete this transaction">' + BIN_SVG + "</button>" +
    "</span>";
}



export function wireActions(scopeEl) {
  ensureCss();
  if (!scopeEl) return;
  scopeEl.addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".ra-btn");
    if (!btn || btn.disabled) return;
    const id = btn.dataset.id;
    if (!id) return;

    if (btn.dataset.ra === "edit") {
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
}

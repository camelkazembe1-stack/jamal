


























import { requireAuth, db, collection, doc, addDoc, updateDoc, onSnapshot, serverTimestamp } from "/firebase.js";

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const money = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

function asDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts instanceof Date) return ts;
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}


function parseDay(v) {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const p = v.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  return asDate(v);
}

function fmtDay(v) {
  const d = parseDay(v);
  return d ? d.toLocaleDateString("en-GB") : "\u2014";
}

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const today = () => startOfDay(new Date());
function isoToday() {
  const t = today();
  const p = (n) => String(n).padStart(2, "0");
  return t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
}

const ST_CLS = {
  "Paid": "st-paid", "Completed": "st-paid", "Delivered": "st-paid", "Cleared": "st-paid",
  "Pending": "st-pending", "Unpaid": "st-pending", "Issued": "st-pending", "Deposited": "st-pending",
  "Confirmed": "st-info",
  "Partially Paid": "st-partial", "Partially Fulfilled": "st-partial",
  "Overdue": "st-overdue", "Bounced": "st-overdue",
  "Cancelled": "st-cancel", "Void": "st-cancel"
};
const stCls = (label) => ST_CLS[label] || "st-pending";

function cellOf(col, docData, row) {
  const raw = col.val ? col.val(docData) : docData[col.key];
  switch (col.fmt) {
    case "money":
      return '<td class="c-amount">' + (raw ? esc(money(raw)) : '<span class="d-none">0</span>') + "</td>";
    case "num":
      return '<td class="c-num">' + (raw == null || raw === "" ? "" : esc(raw)) + "</td>";
    case "date":
      return '<td class="c-date">' + esc(fmtDay(raw)) + "</td>";
    case "badge": {
      const label = row.__status || "";
      return '<td><span class="st ' + stCls(label) + '">' + esc(label) + "</span></td>";
    }
    case "no":
      return '<td class="c-no">' + esc(raw || "\u2014") + "</td>";
    default:
      return '<td class="' + (col.cls || "c-desc") + '">' + esc(raw == null || raw === "" ? "" : raw) + "</td>";
  }
}

export async function initRecords(cfg) {
  await requireAuth(); 

  const root = document.querySelector(cfg.root || "#app");
  const cols = cfg.columns;
  const hasSettle = !!cfg.settle;
  let ROWS = [];

   
  root.innerHTML = [
    cfg.readOnly ? "" :
    '<div class="card add-card">' +
      '<button class="add-toggle r-toggle" type="button">\uFF0B ' + esc(cfg.addLabel || "Add Record") + "</button>" +
      '<form class="r-form" hidden></form>' +
      '<p class="form-err r-err" hidden></p>' +
      '<p class="save-note r-note" hidden></p>' +
    "</div>",
    '<div class="tabs r-tabs" hidden></div>',
    '<div class="card table-card r-card" style="display:none">' +
      '<div class="table-wrap"><table class="bk">' +
        "<thead><tr class=\"r-thead\">" +
          cols.map((c) => '<th scope="col" class="' + (c.fmt === "money" || c.fmt === "num" ? "amt" : "") + '">' + esc(c.label) + "</th>").join("") +
          (hasSettle ? '<th scope="col" aria-hidden="true"></th>' : "") +
        "</tr></thead>" +
        '<tbody class="r-body"></tbody>' +
        '<tfoot class="r-foot"></tfoot>' +
      "</table></div>" +
    "</div>",
    cfg.summary
      ? '<div class="card people-card r-people" style="display:none"><h2>' + esc(cfg.summary.title) + '</h2><table class="people"><tbody class="r-people-body"></tbody></table></div>'
      : "",
    '<div class="card empty r-empty" hidden>' +
      '<div class="empty-icon">' + ((cfg.empty && cfg.empty.icon) || "\uD83D\uDCCB") + "</div>" +
      '<p class="empty-title"></p><p class="empty-sub"></p>' +
    "</div>",
    '<p class="count-line r-count"></p>'
  ].join("");

  const $ = (s) => root.querySelector(s);
  const toggle = $(".r-toggle");
  const form = $(".r-form");
  const formErr = $(".r-err");
  const saveNote = $(".r-note");
  const tabsBox = $(".r-tabs");
  const tableCard = $(".r-card");
  const body = $(".r-body");
  const foot = $(".r-foot");
  const peopleCard = $(".r-people");
  const peopleBody = $(".r-people-body");
  const emptyBox = $(".r-empty");
  const countLine = $(".r-count");

   
  
  if (form) {
    form.innerHTML = '<div class="form-grid">' + cfg.fields.map((f) => {
      const id = ' data-f="' + esc(f.key) + '"';
      const req = f.req ? " required" : "";
      const ph = f.ph ? ' placeholder="' + esc(f.ph) + '"' : "";
      let inp;
      if (f.type === "select") {
        inp = "<select" + id + req + ">" +
          f.opts.map((o) => '<option value="' + esc(o) + '">' + esc(o) + "</option>").join("") +
          "</select>";
      } else if (f.type === "textarea") {
        inp = "<textarea" + id + ' rows="2"' + ph + "></textarea>";
      } else {
        inp = "<input" + id + ' type="' + (f.type || "text") + '"' + (f.pos ? ' min="1"' : "") +
          ' step="any"' + req + ph + (f.ro ? " readonly" : "") + ">";
      }
      return "<label>" + esc(f.label) + inp + "</label>";
    }).join("") + "</div>" +
      '<div class="form-actions">' +
        '<button class="btn-primary r-save" type="submit">' + esc(cfg.saveLabel || "Save") + "</button>" +
        '<button class="btn-ghost r-cancel" type="button">Cancel</button>' +
      "</div>";
    const saveBtn = $(".r-save");
    const inputOf = (key) => form.querySelector('[data-f="' + key + '"]');

    function nextNo() {
      if (!cfg.noField) return null;
      let max = 0;
      ROWS.forEach((r) => {
        const m = String(r[cfg.noField] || "").match(/(\d+)\s*$/);
        if (m) max = Math.max(max, parseInt(m[1], 10));
      });
      return cfg.noPrefix + "-" + String(max + 1).padStart(cfg.noPad || 3, "0");
    }

    function openForm() {
      form.reset();
      if (cfg.noField) inputOf(cfg.noField).value = nextNo() || "";
      cfg.fields.forEach((f) => {
        if (f.def === "today") inputOf(f.key).value = isoToday();
        else if (f.def != null) inputOf(f.key).value = f.def;
      });
      formErr.hidden = true;
      saveNote.hidden = true;
      form.hidden = false;
      toggle.textContent = "\u00D7 Close";
      const first = cfg.fields.find((f) => !f.ro && f.type !== "date");
      if (first) inputOf(first.key).focus();
    }
    function closeForm() {
      form.hidden = true;
      toggle.textContent = "\uFF0B " + (cfg.addLabel || "Add Record");
    }
    toggle.addEventListener("click", () => (form.hidden ? openForm() : closeForm()));
    $(".r-cancel").addEventListener("click", closeForm);

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      formErr.hidden = true;
      const err = (m) => { formErr.textContent = m; formErr.hidden = false; };
      const docData = {};
      for (const f of cfg.fields) {
        const el = inputOf(f.key);
        let v = el.value;
        if (f.type === "number") {
          v = v === "" ? NaN : Number(v);
          if (f.req && (v == null || isNaN(v))) return err("Enter " + f.label.toLowerCase() + ".");
          if (!isNaN(v) && f.pos && v <= 0) return err(f.label + " must be more than zero.");
          if (isNaN(v)) v = null;
        } else {
          v = String(v || "").trim();
          if (f.req && !v) return err("Enter " + f.label.toLowerCase() + ".");
        }
        docData[f.key] = v;
      }
      if (cfg.computed) Object.assign(docData, cfg.computed(docData));
      if (cfg.validate) { const m = cfg.validate(docData); if (m) return err(m); }
      if (cfg.where) docData[cfg.where.field] = cfg.where.equals;
      const no = nextNo();
      if (cfg.noField) docData[cfg.noField] = no;
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving\u2026";
      try {
        await addDoc(collection(db, cfg.collection),
          Object.assign(docData, { createdAt: serverTimestamp() }));
        saveNote.textContent = (cfg.entity || "Record") + " " + (no || "") + " saved.";
        closeForm();
      } catch (e) {
        err("Save failed: " + (e && e.code === "permission-denied"
          ? "check your Firestore rules (" + cfg.collection + " collection) and sign in again."
          : (e && e.message) || e));
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = cfg.saveLabel || "Save";
      }
    });
  }

   
  const balOf = (r) =>
    Math.max(0, Number(r[cfg.settle.baseField] || 0) - Number(r[cfg.settle.amountField] || 0));

  body.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".settle-btn");
    if (btn) openSettle(btn.dataset.id);
  });

  function openSettle(id) {
    const old = body.querySelector("tr.settle-row");
    if (old) old.remove();
    const r = ROWS.find((x) => x.__id === id);
    if (!r) return;
    const out = balOf(r);

    const tr = document.createElement("tr");
    tr.className = "settle-row";
    const td = document.createElement("td");
    td.colSpan = cols.length + 1;
    const f = document.createElement("div");
    f.className = "settle-form";
    const info = document.createElement("span");
    info.textContent = (cfg.settle.label || "Settle") + " " + (r[cfg.noField] || "") +
      " \u00B7 " + (r[cfg.settle.partyField] || "") + " \u2014 outstanding " + money(out);
    const inDate = document.createElement("input");
    inDate.type = "date"; inDate.value = isoToday();
    const inAmt = document.createElement("input");
    inAmt.type = "number"; inAmt.min = "1"; inAmt.step = "any"; inAmt.value = String(out);
    inAmt.style.maxWidth = "130px";
    const ok = document.createElement("button");
    ok.type = "button"; ok.className = "btn-primary"; ok.textContent = cfg.settle.btn || "Save";
    const cancel = document.createElement("button");
    cancel.type = "button"; cancel.className = "btn-ghost"; cancel.textContent = "Cancel";
    const msg = document.createElement("span");
    msg.className = "settle-msg";

    f.append(info, inDate, inAmt, ok, cancel, msg);
    td.appendChild(f); tr.appendChild(td);
    const row = body.querySelector('tr[data-id="' + id + '"]');
    if (row) row.insertAdjacentElement("afterend", tr);

    cancel.addEventListener("click", () => tr.remove());
    ok.addEventListener("click", async () => {
      msg.textContent = "";
      const amt = Number(inAmt.value);
      if (!amt || amt <= 0) { msg.textContent = "Enter a valid amount."; return; }
      if (amt > out + 0.009) { msg.textContent = "More than the outstanding " + money(out) + "."; return; }
      ok.disabled = true; ok.textContent = "Saving\u2026";
      try {
        await updateDoc(doc(db, cfg.collection, id), {
          [cfg.settle.amountField]: Number(r[cfg.settle.amountField] || 0) + amt,
          [cfg.settle.dateField]: inDate.value || isoToday()
        });
        
      } catch (e) {
        ok.disabled = false; ok.textContent = cfg.settle.btn || "Save";
        msg.textContent = "Save failed: " + ((e && e.message) || e);
      }
    });
  }

   
  let TAB = "All";
  function renderTabs() {
    if (!cfg.statusFn) { tabsBox.hidden = true; return; }
    const counts = Object.create(null);
    ROWS.forEach((r) => { const s = cfg.statusFn(r); counts[s] = (counts[s] || 0) + 1; });
    const order = cfg.tabOrder || [];
    const keys = ["All"].concat(order.filter((k) => counts[k]),
      Object.keys(counts).filter((k) => k !== "All" && !order.includes(k)).sort());
    tabsBox.innerHTML = keys.map((k) =>
      '<button type="button" class="tab' + (k === TAB ? " on" : "") + '" data-tab="' + esc(k) + '">' +
      esc(k) + '<span class="n">' + (k === "All" ? ROWS.length : counts[k] || 0) + "</span></button>").join("");
    tabsBox.hidden = false;
    tabsBox.querySelectorAll(".tab").forEach((b) =>
      b.addEventListener("click", () => { TAB = b.dataset.tab; renderTabs(); renderTable(); }));
  }

   
  function renderTable() {
    const rows = ROWS.slice().sort((a, b) => {
      const da = parseDay(a[cfg.dateField || "date"]), db2 = parseDay(b[cfg.dateField || "date"]);
      const ta = da ? da.getTime() : 0, tb = db2 ? db2.getTime() : 0;
      if (ta !== tb) return ta - tb;
      return String(a[cfg.noField || ""] || "").localeCompare(String(b[cfg.noField || ""] || ""));
    }).filter((r) => {
      if (!cfg.statusFn || TAB === "All") return true;
      return cfg.statusFn(r) === TAB;
    });

    let html = "";
    const tot = Object.create(null);
    (cfg.totalCols || []).forEach((k) => (tot[k] = 0));
    const colVal = (r, k) => {
      const c = cols.find((x) => x.key === k);
      return c && c.val ? Number(c.val(r) || 0) : Number(r[k] || 0);
    };
    rows.forEach((r) => {
      if (cfg.statusFn) r.__status = cfg.statusFn(r);
      (cfg.totalCols || []).forEach((k) => (tot[k] += colVal(r, k)));
      html += '<tr data-id="' + esc(r.__id) + '"' + (r.__status === "Overdue" ? ' class="is-overdue"' : "") + ">" +
        cols.map((c) => cellOf(c, r, r)).join("") +
        (hasSettle
          ? '<td class="c-act">' + (balOf(r) > 0.009
              ? '<button class="settle-btn" type="button" data-id="' + esc(r.__id) + '">\uFF0B ' + esc(cfg.settle.btn || "Settle") + "</button>"
              : "") + "</td>"
          : "") +
        "</tr>";
    });
    body.innerHTML = html;

    if (cfg.totalCols && cfg.totalCols.length) {
      const labelKey = cfg.totalLabelKey ||
        (cols.find((c) => c.fmt === "text" || !c.fmt) || cols[0]).key;
      foot.innerHTML = '<tr class="total-row">' +
        cols.map((c) =>
          c.key === labelKey ? '<td class="c-desc">Total</td>'
          : cfg.totalCols.includes(c.key) ? '<td class="c-amount">' + esc(money(tot[c.key])) + "</td>"
          : "<td></td>").join("") +
        (hasSettle ? "<td></td>" : "") +
        "</tr>";
    } else foot.innerHTML = "";

    if (cfg.summary) {
      const byKey = Object.create(null);
      rows.forEach((r) => {
        const k = cfg.summary.key(r) || "\u2014";
        byKey[k] = (byKey[k] || 0) + Number(cfg.summary.val(r) || 0);
      });
      const keys = Object.keys(byKey).sort((a, b) => byKey[b] - byKey[a]);
      peopleBody.innerHTML = keys.map((k) =>
        "<tr><td class=\"c-party\">" + esc(k) + '</td><td class="c-amount">' + esc(money(byKey[k])) + "</td></tr>").join("");
      peopleCard.style.display = keys.length ? "" : "none";
    }

    const has = rows.length > 0;
    tableCard.style.display = has ? "" : "none";
    emptyBox.hidden = has;
    if (!has) {
      emptyBox.querySelector(".empty-title").textContent = (cfg.empty && cfg.empty.title) || "Nothing here yet";
      emptyBox.querySelector(".empty-sub").textContent = (cfg.empty && cfg.empty.sub) || "";
    }
    const parties = cfg.summary
      ? new Set(rows.map((r) => cfg.summary.key(r))).size
      : (cfg.partyField ? new Set(rows.map((r) => r[cfg.partyField])).size : 0);
    const pl = (cfg.partyLabel || "party").toLowerCase();
    const plN = pl === "party" ? "parties" : pl + "s";
    countLine.textContent = has
      ? "Showing " + rows.length + " " + (cfg.entity || "record") + (rows.length === 1 ? "" : "s") +
        (parties ? " across " + parties + " " + (parties === 1 ? pl : plN) : "") +
        ". " + (cfg.countExtra ? cfg.countExtra(rows, tot) : "") +
        (cfg.statusFn && TAB !== "All" ? " Filter: " + TAB + "." : "")
      : "";
  }

  function renderAll() { renderTabs(); renderTable(); }

   
  onSnapshot(collection(db, cfg.collection), (snap) => {
    ROWS = snap.docs
      .map((d) => {
        const r = d.data({ serverTimestamps: "estimate" });
        r.__id = d.id;
        return r;
      })
      .filter((r) => !cfg.where || r[cfg.where.field] === cfg.where.equals);
    renderAll();
  }, (e) => {
    tableCard.style.display = "none";
    if (peopleCard) peopleCard.style.display = "none";
    emptyBox.hidden = false;
    emptyBox.querySelector(".empty-title").textContent = "Could not load the " + (cfg.entity || "records");
    emptyBox.querySelector(".empty-sub").textContent =
      e && e.code === "permission-denied"
        ? "Sign in again, then deploy the updated Firestore rules (" + cfg.collection + " collection)."
        : (e && e.message) || String(e);
    countLine.textContent = "";
  });
}

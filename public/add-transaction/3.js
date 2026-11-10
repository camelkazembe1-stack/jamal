/* JAMALI CORE — restored shared engine, inlined so every folder keeps 1 html + 1 css + 1 js */
import { db as jamaliCoreDb, collection as jamaliCoreCollection, getDocs as jamaliCoreGetDocs, doc as jamaliCoreDoc, deleteDoc as jamaliCoreDeleteDoc, requireAuth as jamaliCoreRequireAuth, onSnapshot as jamaliCoreOnSnapshot } from "/firebase.js";
(function () {
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






import { requireAuth, db, collection, doc, getDoc, updateDoc, writeBatch, serverTimestamp,
         query, orderBy, onSnapshot } from "/firebase.js";


await requireAuth(); 

 
const TRANSACTIONS = {
  IN: [
    { name: "Sales",                 icon: "\u{1F4B0}" },
    { name: "Commission Receivable", icon: "\u{1F9EE}" },
    { name: "Purchase Return",       icon: "\u{21AA}\u{FE0F}" },
    { name: "Petty Cash",            icon: "\u{1FA99}" },
    { name: "Capital",               icon: "\u{1F3E6}" },
    { name: "Debtors Recover",    icon: "\u{1F4B8}" }
  ],
  OUT: [
    { name: "Purchases",     icon: "\u{1F6D2}" },
    { name: "Rent",          icon: "\u{1F3E0}" },
    { name: "Sales Return",  icon: "\u{21A9}\u{FE0F}" },
    { name: "Petty Expense", icon: "\u{1F9F9}" },
    { name: "Transport",     icon: "\u{1F69B}" },
    { name: "Creditors Recover", icon: "\u{1F4B3}" }
  ],
  NEUTRAL: [
    { name: "Loan",  icon: "\u{1F91D}" },
    { name: "Other", icon: "\u{1F4E6}" }
  ],
  CONTRA: [
    { name: "Cash Deposit",    icon: "\u{1F3E6}" },
    { name: "Cash Withdrawal", icon: "\u{1F4B8}" }
  ]
};
 

const $ = (s) => document.querySelector(s);
const state = { type: null, txn: null, method: null, charges: null, person: null, owed: 0 };

const RECOVERS = { "Debtors Recover": 1, "Creditors Recover": 1 };
const isRecover = () => !!RECOVERS[state.txn];

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

const URL_PARAMS = new URLSearchParams(location.search);
let editId = URL_PARAMS.get("edit") ||
  (() => { try { return sessionStorage.getItem("jamaliEditTxn") || ""; } catch (e) { return ""; } })();
const BACK_URL = URL_PARAMS.get("back") ||
  (() => { try { return sessionStorage.getItem("jamaliEditBack") || ""; } catch (e) { return ""; } })();
let editing = Boolean(editId);
let loadingEdit = editing;
let savedBack = "";

 
function showStep(n) {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("is-active"));
  $("#step-" + n).classList.add("is-active");
  window.scrollTo({ top: 0 });
}

 
const TYPE_BADGE = { IN: "b-in", OUT: "b-out", NEUTRAL: "b-neutral", CONTRA: "b-contra" };

 $("#groups").innerHTML = Object.keys(TRANSACTIONS).map((t) =>
  `<section class="group">
     <h2 class="group-label"><span class="badge ${TYPE_BADGE[t]}">${t}</span></h2>
     <div class="grid">
       ${TRANSACTIONS[t].map((x) =>
         `<button class="tile" type="button" data-type="${t}" data-txn="${x.name}">
            <span class="tile-icon">${x.icon}</span>
            <span class="tile-label">${x.name}</span>
          </button>`).join("")}
     </div>
   </section>`).join("");

 
document.querySelectorAll("#groups .tile").forEach((btn) =>
  btn.addEventListener("click", () => {
    if (loadingEdit) return;
    if (editing && !confirm("You are editing a saved transaction. Forget it and record a new one instead?")) return;
    editing = false;
    editId = "";
    state.type = btn.dataset.type;
    state.txn = btn.dataset.txn;
    if (isRecover()) { state.person = null; state.owed = 0; showPick(); return; }
    openForm();
  }));

 
const METHOD_ICONS = { Cash: "\u{1F4B5}", Credit: "\u{1F464}", Bank: "\u{1F3DB}\uFE0F" };

function openForm() {
  state.method = null;
  state.charges = null;
  const rec = isRecover();
  $("#txn-title").textContent = rec && state.person ? state.txn + " \u00B7 " + state.person : state.txn;
  $("#txn-sub").textContent = rec && state.person
    ? "Step 3 of 3 \u00B7 " + (state.type === "IN" ? "owed to you: " : "you owe: ") + fmt(state.owed) +
      " \u2014 enter the paid amount, then Cash or Bank."
    : "Step 2 of 2 \u00B7 " + state.type +
      (state.type === "NEUTRAL" ? " \u00B7 no flow method" : "");
  $("#save-btn").textContent = "Save Transaction";
  $("#back-2").textContent = rec ? "\u2190 Names" : "\u2190 Transactions";
  $("#in-amount").value = "";
  $("#in-person").value = "";
  $("#in-bank").value = "";
  $("#in-charges").value = "";
  $("#form-err").hidden = true;
  $("#amount-label").textContent = rec ? "Paid Amount" : "Amount";

  const needsMethod = state.type === "IN" || state.type === "OUT";
  $("#f-method").hidden = !needsMethod;
  if (needsMethod) {
    $("#method-seg").innerHTML = (rec ? ["Cash", "Bank"] : ["Cash", "Credit", "Bank"]).map((m) =>
      `<button class="seg-btn" type="button" data-v="${m}">${METHOD_ICONS[m]} ${m}</button>`).join("");
    document.querySelectorAll("#method-seg .seg-btn").forEach((b) =>
      b.addEventListener("click", () => {
        state.method = b.dataset.v;
        state.charges = null;
        document.querySelectorAll("#method-seg .seg-btn").forEach((x) => x.classList.toggle("is-on", x === b));
        document.querySelectorAll("#charges-seg .seg-btn").forEach((x) => x.classList.remove("is-on"));
        refreshFields();
      }));
  }
  document.querySelectorAll("#charges-seg .seg-btn").forEach((x) => x.classList.remove("is-on"));
  refreshFields();
  showStep(2);
}

function chargesAllowed() {
  return (state.type === "OUT" && state.method === "Bank") ||
         (state.type === "CONTRA" && state.txn === "Cash Withdrawal");
}

function refreshFields() {
  $("#f-person").hidden =
    !(state.type === "IN" || state.type === "OUT") || state.method !== "Credit";
  $("#f-bank").hidden =
    !(((state.type === "IN" || state.type === "OUT") && state.method === "Bank") || state.type === "CONTRA");
  $("#f-charges").hidden = !chargesAllowed();
  $("#f-charges-amount").hidden = !(chargesAllowed() && state.charges === "WITH");
  updatePreview();
}

document.querySelectorAll("#charges-seg .seg-btn").forEach((b) =>
  b.addEventListener("click", () => {
    state.charges = b.dataset.v;
    document.querySelectorAll("#charges-seg .seg-btn").forEach((x) => x.classList.toggle("is-on", x === b));
    refreshFields();
  }));

["#in-amount", "#in-person", "#in-bank", "#in-charges"].forEach((s) =>
  $(s).addEventListener("input", updatePreview));

// ---- Debtors Recover / Creditors Recover -----------------------------------
// The names and owed figures come straight from the books: a debtor owes
// what the credit sales left after credit returns and everything already
// received from them; a creditor is the mirror image on purchases.
const escAttr = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let TXNS = [];

onSnapshot(query(collection(db, "transactions"), orderBy("dateTime", "asc")), (snap) => {
  TXNS = snap.docs.map((d) => Object.assign({ id: d.id }, d.data({ serverTimestamps: "estimate" })));
  if ($("#step-pick") && $("#step-pick").classList.contains("is-active")) renderPick();
}, () => { TXNS = []; });

function personBalances(kind) {
  const bal = Object.create(null);
  TXNS.forEach((t) => {
    const k = classify(t);
    if (!k || !t.name) return;
    const amt = Number(t.amount || 0);
    if (kind === "debtors") {
      if (k === "sales") bal[t.name] = (bal[t.name] || 0) + amt;
      else if (k === "salesReturns" || k === "cashReceipts") bal[t.name] = (bal[t.name] || 0) - amt;
    } else {
      if (k === "purchases") bal[t.name] = (bal[t.name] || 0) + amt;
      else if (k === "purchasesReturns" || k === "cashPayments") bal[t.name] = (bal[t.name] || 0) - amt;
    }
  });
  return bal;
}

function showPick() {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("is-active"));
  $("#step-pick").classList.add("is-active");
  window.scrollTo({ top: 0 });
  renderPick();
}

function renderPick() {
  const isDebtor = state.type === "IN";
  const bal = personBalances(isDebtor ? "debtors" : "creditors");
  const names = Object.keys(bal).filter((p) => bal[p] > 0)
    .sort((a, b) => bal[b] - bal[a] || a.localeCompare(b));
  $("#pick-title").textContent = isDebtor ? "Pick the debtor" : "Pick the creditor";
  $("#pick-sub").textContent = "Step 2 of 3 \u00B7 " +
    (isDebtor ? "money coming in \u2014 every debtor with the amount owed to you."
              : "money going out \u2014 every creditor with the amount you owe.");
  $("#rec-grid").innerHTML = names.map((p) =>
    '<button class="tile" type="button" data-p="' + escAttr(p) + '">' +
      '<span class="tile-icon">' + (isDebtor ? "\u{1F4B8}" : "\u{1F4B3}") + "</span>" +
      '<span class="tile-label">' + escAttr(p) + "</span>" +
      '<span class="tile-units">' + (isDebtor ? "owes you " : "you owe ") + fmt(bal[p]) + "</span>" +
    "</button>").join("");
  $("#rec-grid").querySelectorAll(".tile").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.person = btn.dataset.p;
      state.owed = bal[btn.dataset.p] || 0;
      openForm();
    }));
  $("#rec-empty-icon").textContent = isDebtor ? "\u{1F4B8}" : "\u{1F4B3}";
  $("#rec-empty").hidden = names.length > 0;
  if (!names.length)
    $("#rec-empty-title").textContent = isDebtor
      ? "No debtor owes the business right now"
      : "The business owes no creditor right now";
}

$("#back-pick").addEventListener("click", () => showStep(1));

function findEntry(name) {
  for (const g of Object.keys(TRANSACTIONS))
    for (const x of TRANSACTIONS[g])
      if (x.name === name) return { type: g, txn: x.name };
  return null;
}

function prefillEdit(d) {
  const name = String(d.transactionName || "");
  const hit = findEntry(name);
  if (hit) {
    state.type = hit.type;
    state.txn = hit.txn;
    if (isRecover()) state.person = String(d.name || "");
  } else if (/charge/i.test(name)) {
    state.type = String(d.transactionType || "").toUpperCase() === "OUT" ? "OUT" : "CONTRA";
    state.txn = name;
  } else {
    state.type = ["IN", "OUT", "NEUTRAL", "CONTRA"].indexOf(String(d.transactionType || "").toUpperCase()) !== -1
      ? String(d.transactionType).toUpperCase() : "NEUTRAL";
    state.txn = name || "Other";
  }
  openForm();
  $("#in-amount").value = Number(d.amount || 0) || "";
  const flow = String(d.flowMethod || "").trim();
  if ((state.type === "IN" || state.type === "OUT") &&
      (flow === "Cash" || flow === "Credit" || flow === "Bank")) {
    state.method = flow;
    document.querySelectorAll("#method-seg .seg-btn").forEach((b) =>
      b.classList.toggle("is-on", b.dataset.v === flow));
    if (flow === "Credit" && d.name) $("#in-person").value = d.name;
    if (flow === "Bank" && d.name) $("#in-bank").value = d.name;
  } else if (state.type === "CONTRA" && d.name) {
    $("#in-bank").value = d.name;
  }
  $("#f-charges").hidden = true;
  $("#f-charges-amount").hidden = true;
  $("#txn-title").textContent = "Edit: " + state.txn +
    (isRecover() && state.person ? " \u00B7 " + state.person : "");
  $("#txn-sub").textContent = "Step 2 of 2 \u00B7 " + state.type +
    " \u2014 change the amount or method, then update. The date stays as it was.";
  $("#save-btn").textContent = "Update Transaction";
  $("#back-2").textContent = "\u2190 Cancel edit";
  updatePreview();
  showStep(2);
}

if (editId) {
  document.querySelector("#step-1 .sub").textContent = "Loading the saved transaction\u2026";
  try {
    const snap = await getDoc(doc(db, "transactions", editId));
    if (!snap.exists()) {
      document.querySelector("#step-1 .sub").textContent =
        "That transaction no longer exists - it may have been deleted. Pick a transaction to record a new one.";
      editing = false;
      editId = "";
      try { sessionStorage.removeItem("jamaliEditTxn"); } catch (e) { }
    } else {
      prefillEdit(snap.data());
      try { sessionStorage.removeItem("jamaliEditTxn"); } catch (e) { }
      try { sessionStorage.removeItem("jamaliEditBack"); } catch (e) { }
    }
  } catch (e) {
    document.querySelector("#step-1 .sub").textContent =
      "Could not load the transaction: " + ((e && e.message) || e);
    editing = false;
    editId = "";
    try { sessionStorage.removeItem("jamaliEditTxn"); } catch (e) { }
  }
}
loadingEdit = false;

function updatePreview() {
  if (!state.type || !state.txn) return;
  let p = state.txn + " \u00B7 " + state.type;
  if (state.type === "NEUTRAL") {
    p += " \u00B7 " + fmt($("#in-amount").value);
  } else if (state.type === "CONTRA") {
    p += " \u00B7 Bank";
    if ($("#in-bank").value.trim()) p += " \u00B7 " + $("#in-bank").value.trim();
    p += " \u00B7 " + fmt($("#in-amount").value);
    if (chargesAllowed() && state.charges === "WITH" && Number($("#in-charges").value) > 0)
      p += "   +   Bank Charges \u00B7 " + fmt($("#in-charges").value);
  } else if (isRecover() && state.person) {
    p += " \u00B7 " + state.person;
    if (state.method) p += " \u00B7 " + state.method;
    if (state.method === "Bank" && $("#in-bank").value.trim()) p += " \u00B7 " + $("#in-bank").value.trim();
    p += " \u00B7 " + fmt($("#in-amount").value);
    const owedV = Math.max(0, Number(state.owed) || 0);
    const paidV = Number($("#in-amount").value) || 0;
    p += "   (owed " + (state.type === "IN" ? "to you" : "by you") + ": " + fmt(owedV) + ")";
    if (paidV > owedV)
      p += "   \u2014 " + fmt(paidV - owedV) + " above it needs confirming as " +
           (state.type === "IN" ? "Interest Received" : "Interest Allowed");
    if (state.type === "OUT" && state.method === "Bank" && state.charges === "WITH" && Number($("#in-charges").value) > 0)
      p += "   +   Bank Charges \u00B7 " + fmt($("#in-charges").value);
  } else {
    if (state.method) p += " \u00B7 " + state.method;
    const nm = state.method === "Credit" ? $("#in-person").value.trim()
             : state.method === "Bank" ? $("#in-bank").value.trim() : "";
    if (nm) p += " \u00B7 " + nm;
    p += " \u00B7 " + fmt($("#in-amount").value);
    if (state.type === "OUT" && state.method === "Bank" && state.charges === "WITH" && Number($("#in-charges").value) > 0)
      p += "   +   Bank Charges \u00B7 " + fmt($("#in-charges").value);
  }
  $("#preview").textContent = (editing ? "Will update: " : "Will save: ") + p;
}

 
 $("#save-btn").addEventListener("click", async () => {
  const err = (m) => { const e = $("#form-err"); e.textContent = m; e.hidden = false; };
  $("#form-err").hidden = true;

  const amount = Number($("#in-amount").value);
  if (!amount || amount <= 0) return err("Enter a valid amount first.");

  const docs = [];

  if (state.type === "NEUTRAL") {
    docs.push({ transactionName: state.txn, dateTime: serverTimestamp(), flowMethod: "N/A",
                transactionType: state.type, name: null, amount });

  } else if (state.type === "CONTRA") {
    const bank = $("#in-bank").value.trim();
    if (!bank) return err("Enter the bank name.");
    docs.push({ transactionName: state.txn, dateTime: serverTimestamp(), flowMethod: "Bank",
                transactionType: state.type, name: bank, amount });
    if (state.txn === "Cash Withdrawal" && !editing && state.charges === "WITH") {
      const c = Number($("#in-charges").value);
      if (!c || c <= 0) return err("Enter the charges amount.");
      docs.push({ transactionName: "Bank Charges", dateTime: serverTimestamp(), flowMethod: "Bank",
                  transactionType: state.type, name: bank, amount: c });
    }

  } else { 
    if (!state.method) return err(isRecover()
      ? "Choose Cash or Bank - Credit is not available here."
      : "Choose Cash, Credit or Bank.");
    let name = null;
    if (isRecover()) {
      name = state.person || null;
      if (!name) return err("Pick the name first.");
    } else if (state.method === "Credit") {
      name = $("#in-person").value.trim();
      if (!name) return err("Enter the person's name.");
    } else if (state.method === "Bank") {
      name = $("#in-bank").value.trim();
      if (!name) return err("Enter the bank name.");
    }

    if (isRecover() && !editing) {
      // The overpay rule: the owed figure is recovered first. Anything
      // above it becomes interest only after a YES - declining saves
      // nothing at all, and the paid amount is never recorded as-is.
      const owed = Math.max(0, Number(state.owed) || 0);
      const over = Math.round((amount - owed) * 100) / 100;
      const isDebtor = state.type === "IN";
      const intName = isDebtor ? "Interest Received" : "Interest Allowed";
      if (over > 0) {
        const oweTxt = owed > 0
          ? (isDebtor ? state.person + " owes you " + fmt(owed)
                      : "you owe " + state.person + " " + fmt(owed))
          : (isDebtor ? state.person + " does not owe you anything right now"
                      : "you do not owe " + state.person + " anything right now");
        const ask = owed > 0
          ? "Save " + fmt(owed) + " as " + state.txn + " and record the extra " + fmt(over) + " as " + intName + "?"
          : "Record the whole " + fmt(amount) + " as " + intName + "?";
        if (!confirm(oweTxt + ". " + ask))
          return err("Nothing was saved - enter an amount up to the " + fmt(owed) +
                     " owed, or confirm to record the extra as " + intName + ".");
        if (owed > 0)
          docs.push({ transactionName: state.txn, dateTime: serverTimestamp(), flowMethod: state.method,
                      transactionType: state.type, name, amount: owed });
        docs.push({ transactionName: intName, dateTime: serverTimestamp(), flowMethod: state.method,
                    transactionType: state.type,
                    name: state.method === "Bank" ? ($("#in-bank").value.trim() || null) : null,
                    amount: over });
      } else {
        docs.push({ transactionName: state.txn, dateTime: serverTimestamp(), flowMethod: state.method,
                    transactionType: state.type, name, amount });
      }
      if (state.type === "OUT" && state.method === "Bank" && state.charges === "WITH") {
        const c = Number($("#in-charges").value);
        if (!c || c <= 0) return err("Enter the charges amount.");
        docs.push({ transactionName: "Bank Charges", dateTime: serverTimestamp(), flowMethod: "Bank",
                    transactionType: state.type, name: $("#in-bank").value.trim() || null, amount: c });
      }
    } else {
      docs.push({ transactionName: state.txn, dateTime: serverTimestamp(), flowMethod: state.method,
                  transactionType: state.type, name, amount });
      if (state.type === "OUT" && !editing && state.method === "Bank" && state.charges === "WITH") {
        const c = Number($("#in-charges").value);
        if (!c || c <= 0) return err("Enter the charges amount.");
        docs.push({ transactionName: "Bank Charges", dateTime: serverTimestamp(), flowMethod: "Bank",
                    transactionType: state.type, name: $("#in-bank").value.trim() || null, amount: c });
      }
    }
  }

  const btn = $("#save-btn");
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    if (editing) {
      const main = docs[0];
      delete main.dateTime;
      await updateDoc(doc(db, "transactions", editId), main);
      editing = false;
      editId = "";
      savedBack = BACK_URL;
      document.querySelector("#step-3 h1").textContent = "Transaction Updated";
      $("#done-note").textContent = "The original record was replaced \u2014 every book now shows the new figures.";
      $("#again-btn").textContent = savedBack ? "Back to the book" : "Add Another";
    } else {
      const batch = writeBatch(db); 
      docs.forEach((d) => batch.set(doc(collection(db, "transactions")), d));
      await batch.commit();
      document.querySelector("#step-3 h1").textContent = "Transaction Saved";
      const parts = docs.map((d) => d.transactionName + " " + fmt(d.amount));
      $("#done-note").textContent = docs.length === 1
        ? "1 record saved to Firestore \u2014 " + parts[0] + "."
        : docs.length + " records saved \u2014 " + parts.join("  +  ") + ".";
      $("#again-btn").textContent = "Add Another";
    }
    showStep(3);
  } catch (e) {
    err("Save failed: " + (e && e.code === "permission-denied"
      ? "check your Firestore rules and sign in again."
      : (e && e.message) || e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Transaction";
  }
});

 
 $("#back-2").addEventListener("click", () => {
  if (editing && savedBack) { location.href = savedBack; return; }
  if (editing) { editing = false; editId = ""; }
  if (isRecover()) { showPick(); return; }
  showStep(1);
});
 $("#again-btn").addEventListener("click", () => {
  if (savedBack) { location.href = savedBack; return; }
  state.type = state.txn = null;
  state.person = null;
  state.owed = 0;
  showStep(1);
});

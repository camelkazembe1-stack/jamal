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



initAgedAP({ root: "#app" });

/* jamali-inline:514.js */
// ---------------------------------------------------------------------------
// JAMALI - People reports (public/514.js)
// Debtors and creditors on one party engine: partyModel builds each person's
// event list from credit sales/purchases, brought-forward openings, returns,
// settlements, register invoices and credit/debit notes.
//   AR and AP Schedules (journal-only proof, pages 44 and 45)
//   AR and AP Reports (with open items, pages 56 and 57)
//   Customer and Supplier Statements (pages 58 and 59)
//   Aged Receivables and Aged Payables (pages 60 and 61)
// ---------------------------------------------------------------------------

import { requireAuth } from "/firebase.js";



function partyModel(txns, invoices, notes, dir) {
  
  const invDir = dir === "sales" ? "sales" : "purchase";
  const ret = dir === "sales" ? "salesReturns" : "purchasesReturns";
  const pay = dir === "sales" ? "cashReceipts" : "cashPayments";
  const noteDir = dir === "sales" ? "credit" : "debit";
  const open = dir === "sales" ? "debtorsOpening" : "creditorsOpening";
  
  
  
  const debtPeople = new Set(
    txns.filter((t) => { const k = classify(t); return (k === dir || k === open) && t.name; })
      .map((t) => t.name));
  invoices.forEach((v) => { if (v.direction === invDir && v.party) debtPeople.add(v.party); });

  const ev = new Map();
  const add = (p, e) => { if (!p) return; let a = ev.get(p); if (!a) { a = []; ev.set(p, a); } a.push(e); };

  txns.forEach((t) => {
    const c = classify(t); if (!c) return;
    const p = t.name; if (!p) return;
    const ts = asDate(t.dateTime);
    const amt = Number(t.amount || 0);
    if (c === dir) add(p, { ts, kind: "main", detail: t.transactionName || "Sale", ref: dir === "sales" ? "SJ" : "PJ", src: "Journal", inc: amt, dec: 0 });
    else if (c === open) add(p, { ts, kind: "main", detail: t.transactionName || "Opening", ref: "OB", src: "Journal", inc: amt, dec: 0 });
    else if (c === ret && debtPeople.has(p)) add(p, { ts, kind: "ret", detail: t.transactionName || "Return", ref: dir === "sales" ? "SR" : "PR", src: "Journal", inc: 0, dec: amt });
    else if (c === pay && debtPeople.has(p)) add(p, { ts, kind: "pay", detail: t.transactionName || "Payment", ref: dir === "sales" ? "CRJ" : "CPJ", src: "Journal", inc: 0, dec: amt });
  });
  invoices.forEach((v) => {
    if (v.direction !== invDir || !v.party) return;
    add(v.party, { ts: parseDay(v.date), kind: "inv", detail: v.description || "Invoice", ref: v.invNo || "\u2014", src: "Register", inc: Number(v.total || 0), dec: 0, due: parseDay(v.dueDate) });
  });
  notes.forEach((n) => {
    if (n.direction !== noteDir || !n.party || !debtPeople.has(n.party)) return;
    add(n.party, { ts: parseDay(n.date), kind: "note", detail: n.reason || (dir === "sales" ? "Credit note" : "Debit note"), ref: n.no || "\u2014", src: dir === "sales" ? "Credit note" : "Debit note", inc: 0, dec: Number(n.amount || 0) });
  });

  const people = [...ev.keys()].filter((p) => ev.get(p).some((e) => e.inc > 0));
  people.forEach((p) => ev.get(p).sort((a, b) => a.ts - b.ts));
  const rows = people.map((p) => {
    const events = ev.get(p);
    const inc = events.reduce((s, e) => s + e.inc, 0);
    const dec = events.reduce((s, e) => s + e.dec, 0);
    const pays = events.filter((e) => e.kind === "pay").reduce((s, e) => s + e.dec, 0);
    return { party: p, events, inc, dec, pays, adj: dec - pays, bal: inc - dec,
             nInv: events.filter((e) => e.inc > 0).length };
  });
  rows.sort((a, b) => b.bal - a.bal || a.party.localeCompare(b.party));
  return rows;
}

function openItems(row) {
  const items = row.events.filter((e) => e.inc > 0).map((e) => ({
    ref: e.ref, date: startOfDay(e.ts),
    due: e.due ? startOfDay(e.due) : addDays(startOfDay(e.ts), 30),
    amt: e.inc,
  })).sort((a, b) => a.due - b.due || a.date - b.date);
  let left = row.events.filter((e) => e.dec > 0).reduce((s, e) => s + e.dec, 0);
  items.forEach((it) => {
    const a = Math.max(0, Math.min(left, it.amt));
    it.settled = a; it.out = it.amt - a; left -= a;
  });
  return { items, unallocated: Math.max(0, left) };
}

function bucketsOf(row, asof) {
  const b = { cur: 0, d30: 0, d60: 0, d90: 0, d90p: 0 };
  openItems(row).items.forEach((it) => {
    if (it.out <= 0) return;
    const over = Math.floor((asof - it.due) / DAY);
    if (over <= 0) b.cur += it.out;
    else if (over <= 30) b.d30 += it.out;
    else if (over <= 60) b.d60 += it.out;
    else if (over <= 90) b.d90 += it.out;
    else b.d90p += it.out;
  });
  return b;
}

function scheduleRows(txns, dir) {
  // The journal-only schedule view, computed on the one party engine: with no
  // register invoices and no notes, partyModel reduces to the old partySchedule.
  return partyModel(txns, [], [], dir).map((r) => ({
    party: r.party,
    main: r.events.filter((e) => e.kind === "main").reduce((s, e) => s + e.inc, 0),
    ret: r.events.filter((e) => e.kind === "ret").reduce((s, e) => s + e.dec, 0),
    pay: r.events.filter((e) => e.kind === "pay").reduce((s, e) => s + e.dec, 0)
  }));
}

export async function initAR(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Customer" }, { label: "Credit Sales", amt: true }, { label: "Sales Returns", amt: true },
    { label: "Receipts", amt: true }, { label: "Balance Due", amt: true }
  ], { icon: "\uD83E\uDD1D" });
  readTx((txns) => {
    const rows = scheduleRows(txns, "sales");
    if (!rows.length) return showEmpty(ui, "No credit sales yet",
      "The Accounts Receivable Schedule is generated from credit sales, sales returns and receipts.");
    let t = [0, 0, 0, 0], html = "";
    rows.forEach((r) => {
      const bal = r.main - r.ret - r.pay;
      html += rowCells([{ v: r.party, strong: true },
        { v: money(r.main), amt: true },
        r.ret ? { v: money(r.ret), amt: true } : "",
        r.pay ? { v: money(r.pay), amt: true } : "",
        { v: money(bal), amt: true, pos: bal <= 0 }]);
      t[0] += r.main; t[1] += r.ret; t[2] += r.pay; t[3] += bal;
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, t[0], t[1], t[2], t[3]]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = rows.length + " customer" + (rows.length === 1 ? "" : "s") +
      " \u00B7 total due " + money(t[3]) + " (matches the Debtors Book).";
  }, (e) => failState(ui, e, "the AR Schedule"));
}

export async function initAP(cfg) {
  await requireAuth();
  const ui = shell(cfg.root, [
    { label: "Supplier" }, { label: "Credit Purchases", amt: true }, { label: "Purchase Returns", amt: true },
    { label: "Payments", amt: true }, { label: "Balance Owed", amt: true }
  ], { icon: "\uD83C\uDFE6" });
  readTx((txns) => {
    const rows = scheduleRows(txns, "purchases");
    if (!rows.length) return showEmpty(ui, "No credit purchases yet",
      "The Accounts Payable Schedule is generated from credit purchases, purchase returns and payments.");
    let t = [0, 0, 0, 0], html = "";
    rows.forEach((r) => {
      const bal = r.main - r.ret - r.pay;
      html += rowCells([{ v: r.party, strong: true },
        { v: money(r.main), amt: true },
        r.ret ? { v: money(r.ret), amt: true } : "",
        r.pay ? { v: money(r.pay), amt: true } : "",
        { v: money(bal), amt: true, pos: bal <= 0 }]);
      t[0] += r.main; t[1] += r.ret; t[2] += r.pay; t[3] += bal;
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, t[0], t[1], t[2], t[3]]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = rows.length + " supplier" + (rows.length === 1 ? "" : "s") +
      " \u00B7 total owed " + money(t[3]) + " (matches the Creditors Book).";
  }, (e) => failState(ui, e, "the AP Schedule"));
}

function openItemsCard(ui) {
  const ic = document.createElement("div");
  ic.className = "card table-card";
  ic.style.display = "none";
  ic.innerHTML = '<h2 class="r2-h2">Open items \u2014 every invoice and journalled sale/purchase, with settlements allocated oldest due date first</h2>' +
    '<div class="table-wrap"><table class="bk"><thead><tr>' +
    "<th>Party</th><th>Ref</th><th>Invoice Date</th><th>Due Date</th><th>Amount</th><th>Settled</th><th>Outstanding</th>" +
    '</tr></thead><tbody class="r2-items"></tbody><tfoot class="r2-items-foot"></tfoot></table></div>';
  ui.root.insertBefore(ic, ui.empty);
  return ic;
}

async function initPartyReport(cfg, dir) {
  await requireAuth();
  const isAR = dir === "sales";
  const ui = shell(cfg.root, [
    { label: isAR ? "Customer" : "Supplier" }, { label: "Invoices" },
    { label: isAR ? "Invoiced" : "Billed", amt: true },
    { label: isAR ? "Payments Received" : "Payments Made", amt: true },
    { label: isAR ? "Credit Notes & Returns" : "Debit Notes & Returns", amt: true },
    { label: isAR ? "Outstanding" : "Owed", amt: true },
  ], { icon: isAR ? "\uD83E\uDD1D" : "\uD83C\uDFE6", side: true });
  const ic = openItemsCard(ui);
  let TX = null, INV = null, NT = null;
  const render = () => {
    if (!TX || !INV || !NT) return;
    const rows = partyModel(TX, INV, NT, dir);
    if (!rows.length) { ic.style.display = "none"; return showEmpty(ui,
      isAR ? "No customer debt yet" : "No supplier debt yet",
      "This report is generated from credit " + (isAR ? "sales" : "purchases") + ", the " +
      (isAR ? "Sales Invoice" : "Purchase Invoice") + " Register, returns, settlements and " +
      (isAR ? "credit" : "debit") + " notes \u2014 no re-entry."); }
    let t = [0, 0, 0, 0, 0], html = "";
    rows.forEach((r) => {
      html += rowCells([{ v: r.party, strong: true }, { v: r.nInv, num: 1 },
        { v: money(r.inc), amt: true },
        r.pays ? { v: money(r.pays), amt: true } : "",
        r.adj ? { v: money(r.adj), amt: true } : "",
        { v: money(r.bal), amt: true, pos: r.bal <= 0 }]);
      t[0] += r.nInv; t[1] += r.inc; t[2] += r.pays; t[3] += r.adj; t[4] += r.bal;
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, t[0], t[1], t[2], t[3], t[4]]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.sideTitle.textContent = isAR ? "Balance due per customer" : "Balance owed per supplier";
    ui.sideBody.innerHTML = rows.map((r) =>
      '<tr><td class="c-party">' + esc(r.party) + '</td><td class="c-amount">' + esc(money(r.bal)) + "</td></tr>").join("");
    ui.side.style.display = "";
    let iAmt = 0, iSet = 0, iOut = 0, unalloc = 0, ih = "";
    rows.forEach((r) => {
      const oi = openItems(r);
      unalloc += oi.unallocated;
      oi.items.forEach((it) => {
        iAmt += it.amt; iSet += it.settled; iOut += it.out;
        ih += rowCells([{ v: r.party, strong: true }, { v: it.ref, num: 1 },
          { v: fmtDay(it.date), date: 1 }, { v: fmtDay(it.due), date: 1 },
          { v: money(it.amt), amt: true },
          it.settled ? { v: money(it.settled), amt: true } : "",
          { v: money(it.out), amt: true, pos: it.out <= 0 }]);
      });
    });
    ic.querySelector(".r2-items").innerHTML = ih;
    ic.querySelector(".r2-items-foot").innerHTML = totalCells([{ label: 1 }, null, null, null, iAmt, iSet, iOut]);
    ic.style.display = iAmt ? "" : "none";
    ui.count.textContent = rows.length + " " + (isAR ? "customer" : "supplier") + (rows.length === 1 ? "" : "s") +
      " \u00B7 invoiced " + money(t[1]) + " \u00B7 payments " + money(t[2]) + " \u00B7 notes & returns " + money(t[3]) +
      " \u00B7 total " + (isAR ? "due " : "owed ") + money(t[4]) +
      " (open items agree: " + money(iOut) + (unalloc ? "; credit balances " + money(unalloc) + " excluded from items" : "") + ").";
  };
  readTx((tx) => { TX = tx; render(); }, (e) => failState(ui, e, "this report"));
  readColl("invoices", (v) => { INV = v; render(); });
  readColl("notes", (n) => { NT = n; render(); });
}

export const initARReport = (cfg) => initPartyReport(cfg, "sales");

export const initAPReport = (cfg) => initPartyReport(cfg, "purchases");

async function initStatement(cfg, dir) {
  await requireAuth();
  const isAR = dir === "sales";
  const ui = shell(cfg.root, [
    { label: "Date" }, { label: "Detail" }, { label: "Ref" }, { label: "Source" },
    { label: "Increase", amt: true }, { label: "Decrease", amt: true }, { label: "Balance", amt: true },
  ], { icon: isAR ? "\uD83D\uDCC4" : "\uD83D\uDCD3", kv: true });
  const pb = periodBar(cfg.root, "range");
  const sel = acctSelect(ui);
  let TX = null, INV = null, NT = null;
  const render = () => {
    if (!TX || !INV || !NT) return;
    const rows = partyModel(TX, INV, NT, dir);
    if (!rows.length) { sel.style.display = "none"; return showEmpty(ui,
      "Nothing to state yet",
      "Statements are generated from credit " + (isAR ? "sales" : "purchases") + ", invoices, settlements and notes."); }
    sel.style.display = "";
    const names = rows.map((r) => r.party).sort((a, b) => a.localeCompare(b));
    const cur = sel.value;
    sel.innerHTML = names.map((n) => "<option>" + esc(n) + "</option>").join("");
    sel.value = cur && names.includes(cur) ? cur : names[0];
    const row = rows.find((r) => r.party === sel.value);
    
    
    const balStr = (b) => (isAR ? fmtBal(b) : fmtBal(-b));
    const f = pb.from() ? parseDay(pb.from()) : null;
    const tt = pb.to() ? parseDay(pb.to()) : null;
    if (tt) tt.setHours(23, 59, 59, 999);
    const opening = row.events.filter((e) => f && e.ts < f).reduce((s, e) => s + e.inc - e.dec, 0);
    const per = row.events.filter((e) => (!f || e.ts >= f) && (!tt || e.ts <= tt));
    let run = opening, tInc = 0, tDec = 0, html = "";
    html += rowCells([{ v: "\u2014", date: 1 }, { v: "Opening balance", strong: true }, "", "", "", "", { v: balStr(opening), amt: true }]);
    per.forEach((e) => {
      run += e.inc - e.dec; tInc += e.inc; tDec += e.dec;
      html += rowCells([{ v: fmtDay(e.ts), date: 1 }, e.detail, e.ref, e.src,
        e.inc ? { v: money(e.inc), amt: true } : "",
        e.dec ? { v: money(e.dec), amt: true } : "",
        { v: balStr(run), amt: true }]);
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = '<tr class="total-row"><td class="c-desc">Period total</td><td></td><td></td><td></td>' +
      '<td class="c-amount">' + esc(money(tInc)) + '</td><td class="c-amount">' + esc(money(tDec)) +
      '</td><td class="c-amount">' + esc(balStr(run)) + "</td></tr>";
    ui.card.style.display = "";
    ui.empty.hidden = true;
    const pays = per.filter((e) => e.kind === "pay").reduce((s, e) => s + e.dec, 0);
    const adj = tDec - pays;
    ui.kvTitle.textContent = sel.value + " \u2014 statement for the selected period";
    ui.kvRows.innerHTML =
      kvRow("Opening balance", balStr(opening)) +
      kvRow(isAR ? "Invoices issued" : "Supplier invoices", money(tInc)) +
      kvRow(isAR ? "Payments received" : "Payments made", money(pays)) +
      kvRow(isAR ? "Credit notes & returns" : "Debit notes & returns", money(adj)) +
      kvRow("Closing balance", balStr(run), true);
    ui.kv.style.display = "";
    ui.count.textContent = per.length + " entries in the period \u00B7 closing balance " + balStr(run) + ".";
  };
  pb.onChange(render);
  sel.addEventListener("change", render);
  readTx((tx) => { TX = tx; render(); }, (e) => failState(ui, e, "the statement"));
  readColl("invoices", (v) => { INV = v; render(); });
  readColl("notes", (n) => { NT = n; render(); });
}

export const initCustomerStatement = (cfg) => initStatement(cfg, "sales");

export const initSupplierStatement = (cfg) => initStatement(cfg, "purchases");

async function initAging(cfg, dir) {
  await requireAuth();
  const isAR = dir === "sales";
  const ui = shell(cfg.root, [
    { label: isAR ? "Customer" : "Supplier" }, { label: "Current", amt: true },
    { label: "1\u201330 days", amt: true }, { label: "31\u201360 days", amt: true },
    { label: "61\u201390 days", amt: true }, { label: "Over 90", amt: true }, { label: "Total", amt: true },
  ], { icon: isAR ? "\uD83D\uDCC6" : "\uD83D\uDDD3\uFE0F" });
  const pb = periodBar(cfg.root, "asof");
  let TX = null, INV = null, NT = null;
  const render = () => {
    if (!TX || !INV || !NT) return;
    const rows = partyModel(TX, INV, NT, dir);
    if (!rows.length) return showEmpty(ui, "Nothing to age yet",
      "Aging is generated from open invoices and credit " + (isAR ? "sales" : "purchases") +
      " \u2014 journalled " + (isAR ? "sales" : "purchases") + " age on 30-day terms; register invoices use their due date.");
    const asof = parseDay(pb.asof()) || today();
    const t = { cur: 0, d30: 0, d60: 0, d90: 0, d90p: 0, tot: 0 };
    let over = 0, overC = 0, html = "";
    rows.forEach((r) => {
      const b = bucketsOf(r, asof);
      const tot = b.cur + b.d30 + b.d60 + b.d90 + b.d90p;
      const late = b.d30 + b.d60 + b.d90 + b.d90p;
      if (late > 0) { overC++; over += late; }
      html += rowCells([{ v: r.party, strong: true },
        b.cur ? { v: money(b.cur), amt: true } : "",
        b.d30 ? { v: money(b.d30), amt: true } : "",
        b.d60 ? { v: money(b.d60), amt: true } : "",
        b.d90 ? { v: money(b.d90), amt: true } : "",
        b.d90p ? { v: money(b.d90p), amt: true } : "",
        { v: money(tot), amt: true }], late > 0 ? "is-overdue" : "");
      t.cur += b.cur; t.d30 += b.d30; t.d60 += b.d60; t.d90 += b.d90; t.d90p += b.d90p; t.tot += tot;
    });
    ui.tbody.innerHTML = html;
    ui.tfoot.innerHTML = totalCells([{ label: 1 }, t.cur, t.d30, t.d60, t.d90, t.d90p, t.tot]);
    ui.card.style.display = "";
    ui.empty.hidden = true;
    ui.count.textContent = rows.length + " " + (isAR ? "customer" : "supplier") + (rows.length === 1 ? "" : "s") +
      " \u00B7 total " + (isAR ? "due " : "owed ") + money(t.tot) + " \u00B7 overdue " + money(over) +
      " across " + overC + " \u00B7 as of " + fmtDay(asof) + ".";
  };
  pb.onChange(render);
  readTx((tx) => { TX = tx; render(); }, (e) => failState(ui, e, "this report"));
  readColl("invoices", (v) => { INV = v; render(); });
  readColl("notes", (n) => { NT = n; render(); });
}

export const initAgedAR = (cfg) => initAging(cfg, "sales");

export const initAgedAP = (cfg) => initAging(cfg, "purchases");

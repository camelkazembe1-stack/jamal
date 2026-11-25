import { requireAuth, db, collection, doc, onSnapshot, updateDoc, deleteDoc,
         getNotifySettings, notifySmsUri } from "/sidebar.js";

await requireAuth();

// NOTIFICATION CENTER (411) - the reading half of the engine. The
// engine in sidebar.js writes one record per event into the per-zone
// "notifications" collection; this page lists them live, feeds the
// alert strip from stockItems, and hands queued SMS / email rows to
// the phone (sms: / mailto:) or the clipboard - no external gateway.

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const LV = {
  low:      { icon: "\u26A0\uFE0F", chip: "Low stock" },
  critical: { icon: "\u26D4", chip: "Critical" },
  out:      { icon: "\u{1F6AB}", chip: "Out of stock" },
  payment:  { icon: "\u{1F4B5}", chip: "Payment" },
  invoice:  { icon: "\u{1F9FE}", chip: "Invoice" },
  info:     { icon: "\u{1F514}", chip: "Info" }
};

function millis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  const t = new Date(ts).getTime();
  return isNaN(t) ? 0 : t;
}
function fmtWhen(ts) {
  const ms = millis(ts);
  if (!ms) return "\u2014";
  return new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit" });
}
function money(n) { return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 }); }

let NTFS = [];
let STOCKS = [];
let TAB = "All";

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); ta.remove();
      return true;
    } catch (e2) { return false; }
  }
}

function smsTarget(n) {
  const s = getNotifySettings();
  return n.phone || s.phone || "";
}
function mailTarget(n) {
  return n.recipient || getNotifySettings().email || "";
}

// ---- the alert strip: live stock positions ---------------------------------
function renderStats() {
  let low = 0, critical = 0, out = 0;
  for (const r of STOCKS) {
    const min = Number(r.minUnits || 0);
    if (!(min > 0)) continue;
    const u = Number(r.units || 0);
    if (u <= 0) out++;
    else if (u < min) critical++;
    else if (u === min) low++;
  }
  $("#st-low").textContent = String(low);
  $("#st-critical").textContent = String(critical);
  $("#st-out").textContent = String(out);
}

onSnapshot(collection(db, "stockItems"), (snap) => {
  STOCKS = (snap.docs || []).map((d) => d.data({ serverTimestamps: "estimate" }) || {});
  renderStats();
});

// ---- the live list ----------------------------------------------------------
const TABS = ["All", "Unread", "Stock", "Payments", "Invoices"];
function tabOf(n) {
  if (n.level === "payment") return "Payments";
  if (n.level === "invoice") return "Invoices";
  if (["low", "critical", "out"].includes(n.level)) return "Stock";
  return "All";
}
function renderTabs() {
  const counts = { All: NTFS.length, Unread: 0, Stock: 0, Payments: 0, Invoices: 0 };
  for (const n of NTFS) {
    if (!n.read) counts.Unread++;
    const t = tabOf(n);
    if (counts[t] !== undefined && t !== "All") counts[t]++;
  }
  $("#tabs").innerHTML = TABS.map((t) =>
    '<button type="button" class="tab' + (t === TAB ? " on" : "") + '" data-tab="' + t + '">' +
    esc(t) + '<span class="n">' + counts[t] + "</span></button>").join("");
  document.querySelectorAll("#tabs .tab").forEach((b) =>
    b.addEventListener("click", () => { TAB = b.dataset.tab; renderTabs(); renderList(); }));
}

function renderList() {
  const rows = NTFS.slice()
    .sort((a, b) => millis(b.createdAt) - millis(a.createdAt))
    .filter((n) => TAB === "All" || (TAB === "Unread" ? !n.read : tabOf(n) === TAB));
  const unread = NTFS.filter((n) => !n.read).length;
  $("#st-unread").textContent = String(unread);

  const box = $("#list");
  const empty = $("#empty");
  if (!rows.length) {
    box.innerHTML = "";
    empty.hidden = NTFS.length ? true : false;
    if (NTFS.length && TAB === "Unread") {
      empty.hidden = false;
      empty.querySelector(".empty-title").textContent = "All caught up";
      empty.querySelector(".empty-sub").textContent = "No unread alerts in this filter. Everything else is in History & delivery below.";
    }
    return;
  }
  empty.hidden = true;
  box.innerHTML = rows.slice(0, 40).map((n) => {
    const lv = LV[n.level] || LV.info;
    const s = getNotifySettings();
    const phone = smsTarget(n);
    const mail = mailTarget(n);
    const acts = [];
    if (!n.read) acts.push('<button class="mini primary" data-act="read" data-id="' + esc(n.id) + '">Mark read</button>');
    if (phone) acts.push('<a class="mini" href="' + esc(notifySmsUri(phone, n.smsText || n.message || "")) + '">SMS</a>');
    if (mail) acts.push('<a class="mini" href="mailto:' + esc(mail) + "?subject=" + encodeURIComponent(n.title || "") + "&body=" + encodeURIComponent(n.smsText || n.message || "") + '">Email</a>');
    acts.push('<button class="mini" data-act="copy" data-id="' + esc(n.id) + '">Copy text</button>');
    acts.push('<button class="mini" data-act="del" data-id="' + esc(n.id) + '">Delete</button>');
    return '<div class="ntf lv-' + esc(n.level || "info") + (n.read ? "" : " is-unread") + '">' +
      '<span class="ntf-ico">' + lv.icon + "</span>" +
      '<div class="ntf-main"><div class="ntf-t">' + esc(n.title || "Notification") + "</div>" +
      '<div class="ntf-m">' + esc(n.message || "") + "</div>" +
      '<div class="ntf-meta"><span class="chip">' + lv.chip + "</span>" +
      '<span class="chip">' + esc(n.module || "System") + "</span>" +
      "<span>" + esc(fmtWhen(n.createdAt)) + "</span>" +
      (n.recipient ? "<span>to " + esc(n.recipient) + "</span>" : "") + "</div></div>" +
      '<div class="ntf-act">' + acts.join("") + "</div></div>";
  }).join("") +
  (NTFS.length > 40 ? '<p class="count-line">Showing the newest 40 of ' + NTFS.length + " - the full history is in the table below.</p>" : "");
}

$("#list").addEventListener("click", async (ev) => {
  const btn = ev.target.closest("[data-act]");
  if (!btn) return;
  const id = btn.dataset.id;
  const n = NTFS.find((x) => x.id === id);
  if (!n) return;
  if (btn.dataset.act === "read") {
    try { await updateDoc(doc(db, "notifications", id), { read: true }); } catch (e) {}
  } else if (btn.dataset.act === "del") {
    try { await deleteDoc(doc(db, "notifications", id)); } catch (e) {}
  } else if (btn.dataset.act === "copy") {
    const ok = await copyText(n.smsText || n.message || "");
    btn.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => { btn.textContent = "Copy text"; }, 1400);
  }
});
$("#read-all").addEventListener("click", async () => {
  for (const n of NTFS) {
    if (!n.read) { try { await updateDoc(doc(db, "notifications", n.id), { read: true }); } catch (e) {} }
  }
});
$("#clear-read").addEventListener("click", async () => {
  for (const n of NTFS) {
    if (n.read) { try { await deleteDoc(doc(db, "notifications", n.id)); } catch (e) {} }
  }
});

onSnapshot(collection(db, "notifications"), (snap) => {
  NTFS = (snap.docs || []).map((d) => {
    const r = d.data({ serverTimestamps: "estimate" }) || {};
    r.id = d.id;
    return r;
  });
  renderTabs();
  renderList();
  renderHistory();
});

// ---- history & delivery -----------------------------------------------------
function renderHistory() {
  const rows = NTFS.slice().sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
  const body = $("#hist-body");
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="9" style="color:#64748b;padding:16px 10px;">Nothing yet - generated alerts appear here with their delivery status.</td></tr>';
    $("#hist-count").textContent = "";
    return;
  }
  body.innerHTML = rows.map((n) => {
    const s = getNotifySettings();
    const d = n.delivery || {};
    const chans = (n.channels && n.channels.length ? n.channels : []).map((c) =>
      ({ dashboard: "Dashboard", inApp: "Bell", sms: "SMS", email: "Email", push: "Push" }[c] || c));
    const stChip = (v) => {
      const cls = v === "delivered" || v === "sent" ? "st-delivered" : v === "queued" ? "st-queued" : "st-off";
      const label = v === "delivered" ? "Delivered" : v === "sent" ? "Sent" : v === "queued" ? "Queued" : "Off";
      return '<span class="st ' + cls + '">' + label + "</span>";
    };
    const phone = smsTarget(n);
    const mail = mailTarget(n);
    const acts = [];
    if (phone) acts.push('<a class="mini" href="' + esc(notifySmsUri(phone, n.smsText || n.message || "")) + '">Send SMS</a>');
    if (mail) acts.push('<a class="mini" href="mailto:' + esc(mail) + "?subject=" + encodeURIComponent(n.title || "") + "&body=" + encodeURIComponent(n.smsText || n.message || "") + '">Send email</a>');
    acts.push('<button class="mini" data-hcopy="' + esc(n.id) + '">Copy</button>');
    return "<tr>" +
      '<td class="c-nowrap"><b>' + esc(n.title || "\u2014") + "</b></td>" +
      '<td class="c-msg">' + esc(n.message || "") + "</td>" +
      '<td class="c-nowrap">' + esc(n.module || "\u2014") + "</td>" +
      '<td class="c-nowrap">' + esc(n.recipient || (s.email || "\u2014")) + "</td>" +
      '<td class="c-nowrap">' + esc(fmtWhen(n.createdAt)) + "</td>" +
      "<td>" + esc(chans.length ? chans.join(", ") : "\u2014") + "</td>" +
      '<td class="c-nowrap">' + stChip(d.sms) + " " + stChip(d.email) + " " + stChip(d.inApp) + "</td>" +
      '<td class="c-nowrap">' + (n.read
        ? '<span class="st st-read">Read</span>'
        : '<span class="st st-unread">Unread</span>') + "</td>" +
      '<td><div class="hist-row-actions">' + acts.join("") + "</div></td>" +
      "</tr>";
  }).join("");
  $("#hist-count").textContent = "Showing " + rows.length + " notification" + (rows.length === 1 ? "" : "s") +
    " - queued SMS rows open the phone's own messaging app with the text filled in; queued email rows open the mail app. Nothing leaves Jamal without a tap.";
}

$("#hist-body").addEventListener("click", async (ev) => {
  const btn = ev.target.closest("[data-hcopy]");
  if (!btn) return;
  const n = NTFS.find((x) => x.id === btn.dataset.hcopy);
  if (!n) return;
  const ok = await copyText(n.smsText || n.message || "");
  btn.textContent = ok ? "Copied" : "Copy failed";
  setTimeout(() => { btn.textContent = "Copy"; }, 1400);
});

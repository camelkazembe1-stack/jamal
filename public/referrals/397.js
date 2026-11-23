import { requireAuth, db, collection, doc, addDoc, updateDoc, onSnapshot,
         serverTimestamp } from "/sidebar.js";

window.__p97.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const who = () => String((localStorage.getItem("jamaliIdentityCache") || "unknown"));

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p97) window.__p97.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
  if (code.indexOf("permission-denied") >= 0) {
    const hint = document.getElementById("h-err-hint");
    if (hint) hint.hidden = false;
  }
}
function bootDone() {
  if (window.__p97) window.__p97.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth();
  window.__p97.auth = true;
} catch (e) {
  herr("the sign-in check", e);
  throw e;
}

let REFS = [];
let REGS = [];
let TAB = "All";
const TABS = ["All", "Pending", "Accepted", "Completed", "Cancelled"];

onSnapshot(collection(db, "healthReferrals"), (snap) => {
  REFS = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderAll();
}, (e) => herr("healthReferrals", e));

onSnapshot(collection(db, "healthRegistrations"), (snap) => {
  REGS = snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }));
  $("#f-regs").innerHTML = REGS
    .filter((r) => r && r.regId)
    .slice(0, 400)
    .map((r) => '<option value="' + esc(r.regId) + '">' + esc(r.fullName || "unidentified") + "</option>").join("");
  renderAll();
}, (e) => herr("healthRegistrations", e));

window.__p97.listeners = 2;

const regOf = (id) => REGS.find((r) => String(r.regId || "") === String(id || ""));
const whoOf = (id) => { const r = regOf(id);
  return r ? (r.isUnidentified ? "Unidentified patient" : String(r.fullName || "—")) : "—"; };
const todayLocal = () => { const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

function err(el, m) { const e = document.getElementById(el); e.textContent = m; e.hidden = !m; }
function ok(el, m) { const e = document.getElementById(el); e.textContent = m; e.hidden = !m; }

// ---- form -------------------------------------------------------------------
const form = document.getElementById("rf");
$(".r-toggle").addEventListener("click", () => {
  form.hidden = !form.hidden;
  $(".r-toggle").textContent = form.hidden ? "\uFF0B New referral" : "\u00D7 Close";
});
$(".r-cancel").addEventListener("click", () => { form.hidden = true;
  $(".r-toggle").textContent = "\uFF0B New referral"; });

$("#f-regid").addEventListener("input", () => {
  const el = $("#f-regid");
  el.value = el.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 8);
  const r = regOf(el.value.trim());
  const line = $("#f-line");
  if (r) {
    line.hidden = false;
    line.textContent = "\u2713 " + whoOf(r.regId) +
      (r.age || r.sex ? " \u00b7 " + [r.age ? r.age + " yrs" : "", r.sex].filter(Boolean).join(" \u00b7 ") : "");
  } else { line.hidden = true; }
});

function nextRefNo() {
  let max = 0;
  REFS.forEach((r) => {
    const m = String(r.refNo || "").match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return "REF-" + todayLocal().replace(/-/g, "").slice(2) + "-" + String(max + 1).padStart(4, "0");
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  err("f-err", "");
  ok("f-ok", "");
  const regId = $("#f-regid").value.trim();
  const facility = $("#f-facility").value.trim();
  const reason = $("#f-reason").value.trim();
  if (!/^[0-9]{4}[A-Z]{4}$/.test(regId)) return err("f-err", "Enter the patient's Registration ID (4 digits and 4 letters).");
  if (!regOf(regId)) return err("f-err", "No patient with Registration ID " + regId + " on this account \u2014 register the patient first.");
  if (!facility) return err("f-err", "Enter the facility the referral is about.");
  if (!reason) return err("f-err", "Enter the reason for the referral.");
  const btn = $("#f-save");
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    const docData = {
      refNo: nextRefNo(),
      regId,
      patientName: whoOf(regId),
      type: $("#f-type").value,
      facility, reason,
      department: $("#f-dept").value.trim(),
      priority: $("#f-priority").value,
      notes: $("#f-notes").value.trim(),
      status: "Pending",
      createdBy: who(),
      savedAt: new Date().toISOString(),
      createdAt: serverTimestamp()
    };
    await addDoc(collection(db, "healthReferrals"), docData);
    ok("f-ok", "Referral " + docData.refNo + " saved \u2014 " + docData.patientName + ", " +
      docData.type.toLowerCase() + ": " + docData.facility + ". Status: Pending.");
    form.reset();
    $("#f-line").hidden = true;
    form.hidden = true;
    $(".r-toggle").textContent = "\uFF0B New referral";
  } catch (e) {
    err("f-err", "Save failed: " + ((e && (e.code || e.message)) || e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Referral";
  }
});

// ---- tabs + table -----------------------------------------------------------
function renderAll() {
  const counts = { All: REFS.length };
  TABS.slice(1).forEach((t) => { counts[t] = REFS.filter((r) => String(r.status || "Pending") === t).length; });
  $("#tabs").innerHTML = TABS.map((t) =>
    '<button type="button" class="tab' + (TAB === t ? " on" : "") + '" data-tab="' + t + '">' + t +
    '<span class="n">' + counts[t] + "</span></button>").join("");

  const rows = TAB === "All" ? REFS : REFS.filter((r) => String(r.status || "Pending") === TAB);
  const has = rows.length > 0;
  document.getElementById("t-card").hidden = !has;
  document.getElementById("t-empty").hidden = has;
  document.getElementById("t-body").innerHTML = rows.map((r) => {
    const st = String(r.status || "Pending");
    const prio = String(r.priority || "Routine").toLowerCase();
    const acts = [];
    if (st === "Pending") acts.push('<button type="button" class="mini-btn" data-act="accept" data-id="' + esc(r.__id) + '">Accept</button>');
    if (st === "Pending" || st === "Accepted")
      acts.push('<button type="button" class="mini-btn" data-act="complete" data-id="' + esc(r.__id) + '">Complete</button>');
    if (st !== "Completed" && st !== "Cancelled")
      acts.push('<button type="button" class="mini-btn danger" data-act="cancel" data-id="' + esc(r.__id) + '">Cancel</button>');
    return "<tr>" +
      '<td class="c-no">' + esc(r.refNo || "—") + "</td>" +
      '<td class="c-date">' + esc(String(r.savedAt || "").slice(0, 10) || "—") + "</td>" +
      '<td class="c-name">' + esc(r.patientName || whoOf(r.regId)) +
        (r.regId ? ' <span class="d-none">(' + esc(r.regId) + ")</span>" : "") + "</td>" +
      "<td>" + esc(r.type || "—") + "</td>" +
      "<td>" + esc(r.facility || "—") + "</td>" +
      "<td>" + esc(r.department || "—") + "</td>" +
      "<td>" + esc(r.reason || "—") + "</td>" +
      '<td><span class="st st-' + esc(prio) + '">' + esc(r.priority || "Routine") + "</span></td>" +
      '<td><span class="st st-' + esc(st.toLowerCase()) + '">' + esc(st) + "</span></td>" +
      '<td class="c-act">' + acts.join(" ") + "</td>" +
      "</tr>";
  }).join("");
  document.getElementById("t-count").textContent = has
    ? rows.length + (rows.length === 1 ? " referral" : " referrals") +
      (TAB === "All" ? "." : " \u00b7 filter: " + TAB + ".")
    : "";
}

$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (b) { TAB = b.getAttribute("data-tab"); renderAll(); }
});

document.getElementById("t-body").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const id = b.getAttribute("data-id");
  const act = b.getAttribute("data-act");
  const st = { accept: "Accepted", complete: "Completed", cancel: "Cancelled" }[act];
  const r = REFS.find((x) => x.__id === id);
  if (!r || !st) return;
  b.disabled = true;
  try {
    await updateDoc(doc(db, "healthReferrals", id), {
      status: st,
      statusBy: who(),
      statusAt: new Date().toISOString()
    });
  } catch (err2) {
    err("f-err", "Could not update the referral: " + ((err2 && (err2.code || err2.message)) || err2));
    b.disabled = false;
  }
});

bootDone();

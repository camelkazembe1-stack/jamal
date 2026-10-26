// patient-module (page 328) — JAMALI Health — the Patient List (Task 46d)
// One table of every victim registered on this account, newest first, and
// nothing else. Each row carries the Registration ID with a one-click Copy
// button — paste the ID into any stage to find the patient — and it ends
// with two icon actions: the PEN opens the registration fields in a modal
// (the ID itself never changes) and the BIN asks once, then removes the
// registration AND every triage, nurse, doctor, pharmacy and treatment
// record kept for that ID. No failure can hide any more: every listener
// carries an error callback, the page shows its build and boot progress,
// and if the live listener never answers, a one-shot read is tried once.
import { requireAuth, db, collection, query, onSnapshot, updateDoc, writeBatch, doc } from "/firebase.js";

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* the boot diagnostic: the inline script in 328.html reads this after 12
   seconds if the table is still empty, so a silent failure names itself.
   It stands BEFORE the top-level await on purpose: everything the error
   paths touch must exist before the module can ever suspend. */
window.__p46 = { build: "46d", auth: false, listeners: 0, regDocs: -1, errs: [] };

try {
  await requireAuth(); // not logged in? -> bounced to "/"
  window.__p46.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

/* the two row actions, drawn as icons: the pen edits, the bin deletes */
const PEN_SVG = "<svg viewBox='0 0 24 24' width='15' height='15' aria-hidden='true'>" +
  "<path fill='currentColor' d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" +
  "M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 " +
  "3.75 3.75 1.83-1.83z'/></svg>";
const BIN_SVG = "<svg viewBox='0 0 24 24' width='15' height='15' aria-hidden='true'>" +
  "<path fill='currentColor' d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z" +
  "M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'/></svg>";

/* real Firestore or the E2E mock? The real db carries its app. */
const REAL = !!(db && db.app);

/* ---------- shared helpers (same language as pages 322 to 327) ---------- */
function pad(n) { return String(n).padStart(2, "0"); }
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB") + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function who(r) {
  return r.isUnidentified
    ? "Unidentified"
    : (r.fullName || "Unnamed");
}
function priBadge(p) {
  const k = String(p || "").toLowerCase();
  const cls = { critical: "st-critical", high: "st-high", medium: "st-medium", low: "st-low" }[k];
  if (cls) return '<span class="st ' + cls + '">' + esc(p) + "</span>";
  return '<span class="st st-none">' + (p ? esc(p) : "—") + "</span>";
}
function ageFromDob(v) {
  if (!v) return "";
  const dob = new Date(v + "T00:00:00");
  const now = new Date();
  if (isNaN(dob.getTime()) || dob > now) return "";
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return (age >= 0 && age < 140) ? String(age) : "";
}

/* ---------- live data: every stage, so delete can reach them all ---------- */
let regs = [];
let triages = [];
let nurseConsults = [];
let docConsults = [];
let rxLines = [];
let tOrders = [];
const lastTriage = new Map();
const loaded = { reg: false, tri: false, nur: false, doc: false, rx: false, trt: false };
function ready() { return loaded.reg && loaded.tri && loaded.nur && loaded.doc && loaded.rx && loaded.trt; }

/* ---------- visible load errors: never swallow a failure again ----------
   If any collection cannot be read (rules, network, project), the page now
   paints a red banner carrying the exact error code instead of failing in
   silence with an empty table. */
function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  if (window.__p46) window.__p46.errs.push(coll + ": " +
    String((e && (e.code || e.message)) || "unknown error"));
  if (!box) return;
  const code = String((e && (e.code || e.message)) || "unknown error");
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}

/* the boot line answered: with rows the line goes, with zero it stays and
   says so — an empty account is a fact, not a failure */
function bootAnswered(n) {
  window.__p46.regDocs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered \u2014 0 registration documents on this account yet. " +
    "Register a victim on the Registration page and it appears here.";
}

onSnapshot(query(collection(db, "healthRegistrations")), (snap) => {
  regs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .filter((r) => r && r.regId)
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  loaded.reg = true;
  bootAnswered(snap.docs.length);
  renderTable();
}, (e) => loadErr("healthRegistrations", e));
onSnapshot(query(collection(db, "healthTriage")), (snap) => {
  triages = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  lastTriage.clear();
  triages.forEach((t) => {
    if (t && t.regId && !lastTriage.has(String(t.regId))) lastTriage.set(String(t.regId), t);
  });
  loaded.tri = true;
  renderTable();
}, (e) => loadErr("healthTriage", e));
onSnapshot(query(collection(db, "healthNurseConsultations")), (snap) => {
  nurseConsults = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  loaded.nur = true;
}, (e) => loadErr("healthNurseConsultations", e));
onSnapshot(query(collection(db, "healthDoctorConsultations")), (snap) => {
  docConsults = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  loaded.doc = true;
}, (e) => loadErr("healthDoctorConsultations", e));
onSnapshot(query(collection(db, "healthPrescriptions")), (snap) => {
  rxLines = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  loaded.rx = true;
}, (e) => loadErr("healthPrescriptions", e));
onSnapshot(query(collection(db, "healthTreatmentOrders")), (snap) => {
  tOrders = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
  loaded.trt = true;
}, (e) => loadErr("healthTreatmentOrders", e));
window.__p46.listeners = 6;

/* the fallback: if the live listener never answers and never errors, try a
   one-shot read once, six seconds in, instead of waiting in silence */
setTimeout(() => {
  if (loaded.reg || window.__p46.errs.length) return;
  import("/firebase.js").then((m) => {
    if (typeof m.getDocs !== "function") {
      loadErr("healthRegistrations (fallback)",
        new Error("the live listener never answered and this firebase.js has no getDocs"));
      return undefined;
    }
    return m.getDocs(query(collection(db, "healthRegistrations"))).then((s) => {
      regs = s.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
        .filter((r) => r && r.regId)
        .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
      loaded.reg = true;
      bootAnswered(s.docs.length);
      window.__p46.recovered = true;
      renderTable();
    });
  }).catch((e) => loadErr("healthRegistrations (fallback)", e));
}, 6000);

/* every collection a patient's records can live in, with a live getter */
const STAGE_COLLS = [
  ["healthRegistrations", () => regs],
  ["healthTriage", () => triages],
  ["healthNurseConsultations", () => nurseConsults],
  ["healthDoctorConsultations", () => docConsults],
  ["healthPrescriptions", () => rxLines],
  ["healthTreatmentOrders", () => tOrders]
];

/* ---------- the table ---------- */
function el(id) {
  const n = document.getElementById(id);
  if (!n) loadErr("the page structure", new Error("missing element #" + id +
    " \u2014 the deployed 328.html does not match this 328.js; re-run the task file, push, hard refresh"));
  return n;
}

function renderTable() {
  const has = regs.length > 0;
  el("p-empty").hidden = has;
  el("p-wrap").hidden = !has;
  el("p-body").innerHTML = regs.map((r) => {
    const t = lastTriage.get(String(r.regId));
    const ageSex = (r.age !== "" && r.age != null ? r.age + "y" : "—") +
      (r.sex ? " · " + r.sex : "");
    return "<tr>" +
      "<td class='c-no id-cell'><span class='id-txt'>" + esc(r.regId) + "</span>" +
        "<button type='button' class='copy-btn' data-copy='" + esc(r.regId) + "'>Copy</button></td>" +
      "<td class='c-party'>" + esc(who(r)) + "</td>" +
      "<td class='nowrap'>" + esc(ageSex) + "</td>" +
      "<td class='nowrap'>" + (r.phone ? esc(r.phone) : "—") + "</td>" +
      "<td class='c-date'>" + esc(when(r.arrivalAt || r.savedAt)) + "</td>" +
      "<td>" + priBadge(t ? t.priority : r.priority) + "</td>" +
      "<td class='act-cell'>" +
        "<button type='button' class='icon-btn edit-btn' data-regid='" + esc(r.regId) +
          "' title='Edit patient' aria-label='Edit patient'>" + PEN_SVG + "</button>" +
        "<button type='button' class='icon-btn del-btn' data-regid='" + esc(r.regId) +
          "' title='Delete patient' aria-label='Delete patient'>" + BIN_SVG + "</button></td>" +
    "</tr>";
  }).join("");
  el("p-count").textContent = has
    ? regs.length + (regs.length === 1 ? " patient on this account."
                                       : " patients on this account.")
    : "";
}

/* ---------- copy the ID ---------- */
async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (e2) {
      return false;
    }
  }
}

/* ---------- edit: the registration fields, the ID never changes ---------- */
let editId = null;

function merr(msg) { const e = $("#m-err"); e.hidden = !msg; e.textContent = msg || ""; }

function openEdit(regId) {
  const r = regs.find((x) => String(x.regId) === String(regId));
  if (!r) return;
  editId = String(r.regId);
  $("#m-title").textContent = "Edit patient";
  $("#m-sub").textContent = "Registration ID " + r.regId + " · " + who(r) +
    " — the ID itself never changes.";
  $("#m-name").value = r.fullName || "";
  $("#m-dob").value = r.dob || "";
  $("#m-age").value = r.dob ? ageFromDob(r.dob)
                            : (r.age === "" || r.age == null ? "" : String(r.age));
  $("#m-sex").value = r.sex || "";
  $("#m-phone").value = r.phone || "";
  $("#m-address").value = r.address || "";
  $("#m-kin").value = r.emergencyContact || "";
  $("#m-arrival").value = r.arrivalAt || "";
  $("#m-incident").value = r.incidentType || "";
  $("#m-desc").value = r.incidentDescription || "";
  $("#m-dept").value = r.department || "";
  $("#m-priority").value = r.priority || "";
  $("#m-referral").value = r.referral === "Yes" ? "Yes" : "No";
  $("#m-facility").value = r.referredBy || "";
  $("#m-facility-label").hidden = $("#m-referral").value !== "Yes";
  $("#m-payment").value = r.payment || "";
  merr("");
  $("#m-ok").hidden = true;
  $("#m-wrap").hidden = false;
  window.scrollTo(0, 0);
}

function closeModal() {
  editId = null;
  $("#m-wrap").hidden = true;
}

$("#m-dob").addEventListener("change", () => {
  $("#m-age").value = ageFromDob($("#m-dob").value);
});
$("#m-referral").addEventListener("change", () => {
  const yes = $("#m-referral").value === "Yes";
  $("#m-facility-label").hidden = !yes;
  if (!yes) $("#m-facility").value = "";
});
$("#m-cancel").addEventListener("click", closeModal);
$("#m-wrap").addEventListener("click", (e) => {
  if (e.target === $("#m-wrap")) closeModal();
});

$("#m-save").addEventListener("click", async () => {
  if (!editId) return;
  const r = regs.find((x) => String(x.regId) === editId);
  if (!r) { merr("This patient is no longer on the list — close and reopen."); return; }
  const name = $("#m-name").value.trim();
  const dob = $("#m-dob").value;
  const age = $("#m-age").value;
  const referral = $("#m-referral").value;
  const facility = $("#m-facility").value.trim();
  if (dob && !age) return merr("The date of birth is not valid — it cannot be in the future.");
  if (referral === "Yes" && !facility) return merr("Referral is set to Yes — enter the referring facility.");
  const payload = {
    isUnidentified: !name,
    fullName: name,
    dob,
    age: age === "" ? "" : Number(age),
    sex: $("#m-sex").value,
    phone: $("#m-phone").value.trim(),
    address: $("#m-address").value.trim(),
    emergencyContact: $("#m-kin").value.trim(),
    arrivalAt: $("#m-arrival").value,
    incidentType: $("#m-incident").value,
    incidentDescription: $("#m-desc").value.trim(),
    department: $("#m-dept").value,
    priority: $("#m-priority").value,
    referral,
    referredBy: referral === "Yes" ? facility : "",
    payment: $("#m-payment").value,
    updatedAt: new Date().toISOString()
  };
  const btn = $("#m-save");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await updateDoc(doc(db, "healthRegistrations", r.__id), payload);
    $("#m-ok").hidden = false;
    merr("");
    setTimeout(closeModal, 500);
  } catch (e) {
    merr("Save failed: " + ((e && e.message) || e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Changes";
  }
});

/* ---------- delete: one confirm, then every record for the ID goes ---------- */
async function askDelete(regId) {
  const r = regs.find((x) => String(x.regId) === String(regId));
  if (!r) return;
  if (!ready()) { window.alert("Still loading the records — try again in a moment."); return; }
  const n = STAGE_COLLS.slice(1).reduce((s, [, get]) =>
    s + get().filter((d) => d && String(d.regId) === String(regId)).length, 0);
  const msg = "Delete " + who(r) + " (Registration ID " + r.regId + ")?\n\n" +
    "This removes the registration and " +
    (n === 1 ? "1 linked record" : n + " linked records") +
    " across triage, nursing, doctor, pharmacy and treatment.\nThis cannot be undone.";
  if (!window.confirm(msg)) return;
  const btns = Array.prototype.slice.call(document.querySelectorAll(".del-btn"));
  btns.forEach((b) => { b.disabled = true; });
  try {
    if (REAL) {
      let batch = writeBatch(db), k = 0;
      for (const [coll, get] of STAGE_COLLS) {
        for (const d of get()) {
          if (d && String(d.regId) === String(regId) && d.__id) {
            batch.delete(doc(db, coll, d.__id));
            if (++k >= 400) { await batch.commit(); batch = writeBatch(db); k = 0; }
          }
        }
      }
      if (k) await batch.commit();
    } else {
      const st = globalThis.__store; // the E2E mock store — keep it consistent too
      if (st) for (const [coll] of STAGE_COLLS) {
        st[coll] = (st[coll] || []).filter((d) => String(d.regId) !== String(regId));
      }
    }
    regs = regs.filter((x) => String(x.regId) !== String(regId));
    triages = triages.filter((x) => String(x.regId) !== String(regId));
    nurseConsults = nurseConsults.filter((x) => String(x.regId) !== String(regId));
    docConsults = docConsults.filter((x) => String(x.regId) !== String(regId));
    rxLines = rxLines.filter((x) => String(x.regId) !== String(regId));
    tOrders = tOrders.filter((x) => String(x.regId) !== String(regId));
    lastTriage.delete(String(regId));
    renderTable();
  } catch (e) {
    window.alert("Delete failed: " + ((e && e.message) || e));
  } finally {
    btns.forEach((b) => { b.disabled = false; });
  }
}

/* ---------- row actions: copy, edit, delete ---------- */
$("#p-body").addEventListener("click", async (e) => {
  const c = e.target.closest(".copy-btn");
  if (c) {
    const id = c.getAttribute("data-copy");
    const ok = await copyText(id);
    if (ok) {
      c.textContent = "Copied ✓";
      c.classList.add("done");
      setTimeout(() => { c.textContent = "Copy"; c.classList.remove("done"); }, 1200);
    } else {
      window.prompt("Copy the Registration ID:", id);
    }
    return;
  }
  const eb = e.target.closest(".edit-btn");
  if (eb) { openEdit(eb.getAttribute("data-regid")); return; }
  const dbtn = e.target.closest(".del-btn");
  if (dbtn) { askDelete(dbtn.getAttribute("data-regid")); }
});

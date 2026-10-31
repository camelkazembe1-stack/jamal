





import { requireAuth, db, collection, addDoc, onSnapshot } from "/firebase.js";

window.__p54 = { page: "371", build: "54", auth: false, listeners: 0, docs: -1, errs: [] };

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadErr(coll, e) {
  const box = document.getElementById("p-err");
  const boot = document.getElementById("p-boot");
  if (boot) boot.hidden = true;
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p54) window.__p54.errs.push(coll + ": " + code);
  if (!box) return;
  box.hidden = false;
  box.innerHTML = "<strong>Could not read " + esc(coll) + "</strong> \u2014 " + esc(code) +
    (code.indexOf("permission-denied") >= 0
      ? "<br><span class='p-err-hint'>Fix: open the Firebase console \u2192 Firestore Database \u2192 Rules, " +
        "paste the rules from the repo file firestore.rules and press Publish, then refresh.</span>"
      : "");
}
function bootAnswered(n) {
  if (window.__p54) window.__p54.docs = n;
  const b = document.getElementById("p-boot");
  if (!b) return;
  if (n > 0) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = "Firestore answered — no registrations on this account yet. Register the patient first (Registration, page 322).";
}

try {
  await requireAuth();
  if (window.__p54) window.__p54.auth = true;
} catch (e) {
  loadErr("the sign-in check", e);
  throw e;
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowISO() { return new Date().toISOString(); }
function todayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function who(r) { return r ? (r.isUnidentified ? "Unidentified" : (r.fullName || "Unnamed")) : "—"; }
function priBadge(p) {
  const k = String(p || "").toLowerCase();
  const cls = { critical: "st-critical", high: "st-high", medium: "st-medium", low: "st-low" }[k];
  return cls ? "<span class='st " + cls + "'>" + esc(p) + "</span>"
             : "<span class='st st-none'>" + (p ? esc(p) : "—") + "</span>";
}
function rememberedStaff() {
  try { return localStorage.getItem("jamaliStaff") || ""; } catch (e) { return ""; }
}
function keepStaff(v) { if (v) { try { localStorage.setItem("jamaliStaff", v); } catch (e) {} } }

 
let regs = [];
let reqs = [];
let selected = null;

onSnapshot(collection(db, "healthRegistrations"), (snap) => {
  regs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }))
    .filter((r) => r && r.regId)
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  renderCands(); renderSel(); maybeAutoOpen();
}, (e) => loadErr("healthRegistrations", e));
window.__p54.listeners++;

onSnapshot(collection(db, "healthImagingRequests"), (snap) => {
  reqs = snap.docs.map((d) => Object.assign({}, d.data(), { __id: d.id }));
}, (e) => loadErr("healthImagingRequests", e));
window.__p54.listeners++;

 
function renderCands() {
  const box = $("#r-cands");
  if (selected) { box.innerHTML = ""; return; }
  const q = $("#r-q").value.trim().toLowerCase();
  if (!q) { box.innerHTML = ""; return; }
  const hits = regs.filter((r) =>
    String(r.regId || "").toLowerCase() === q ||
    String(r.regId || "").toLowerCase().includes(q) ||
    String(who(r)).toLowerCase().includes(q)).slice(0, 8);
  box.innerHTML = hits.length === 0
    ? "<p class='mini-note'>No patient matches &ldquo;" + esc(q) + "&rdquo; — register them first (page 322).</p>"
    : hits.map((r) =>
        "<button type='button' class='cand' data-pick='" + esc(r.__id) + "'>" +
          "<span class='c-id'>" + esc(r.regId) + "</span><b>" + esc(who(r)) + "</b>" +
          "<span class='mini-note'>" + esc([r.age, r.sex].filter(Boolean).join(" · ") || "—") + "</span>" +
          priBadge(r.priority) + "</button>").join("");
}
$("#r-q").addEventListener("input", renderCands);
$("#r-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#r-find").click(); } });
$("#r-find").addEventListener("click", renderCands);
$("#r-cands").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-pick]");
  if (!btn) return;
  selected = regs.find((r) => r.__id === btn.getAttribute("data-pick")) || null;
  $("#r-q").value = selected ? String(selected.regId) : $("#r-q").value;
  renderCands(); renderSel();
});
function renderSel() {
  const box = $("#r-sel");
  if (!selected) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.innerHTML = "Requesting for <b>" + esc(who(selected)) + "</b> · Registration ID <b>" +
    esc(selected.regId) + "</b> · " +
    esc([selected.age, selected.sex].filter(Boolean).join(" · ") || "—") + " " + priBadge(selected.priority);
}

 
function maybeAutoOpen() {
  if (selected) return;
  const pid = new URLSearchParams(location.search).get("patient") || "";
  if (!pid) return;
  const r = regs.find((x) => String(x.regId) === String(pid));
  if (r) { selected = r; $("#r-q").value = String(r.regId); renderCands(); renderSel(); $("#r-formcard").hidden = false; }
}

 
const STANDARD = ["X-ray", "Ultrasound", "CT scan", "MRI"];
const picks = new Set();

function renderPicks() {
  $("#r-picks").innerHTML =
    STANDARD.map((t) =>
      "<label style='display:inline-flex;align-items:center;gap:6px;margin:4px 14px 4px 0;font-weight:700;font-size:13.5px'>" +
        "<input type='checkbox' data-test='" + esc(t) + "'" + (picks.has(t) ? " checked" : "") + "> " + esc(t) + "</label>").join("") +
    Array.from(picks).filter((t) => STANDARD.indexOf(t) < 0).map((t) =>
      "<label style='display:inline-flex;align-items:center;gap:6px;margin:4px 14px 4px 0;font-weight:700;font-size:13.5px;color:#047857'>" +
        "<input type='checkbox' data-test='" + esc(t) + "' checked> " + esc(t) + " (custom)</label>").join("");
}
$("#r-picks").addEventListener("change", (e) => {
  const cb = e.target.closest("input[data-test]");
  if (!cb) return;
  const t = cb.getAttribute("data-test");
  if (cb.checked) picks.add(t); else picks.delete(t);
});
$("#r-addcustom").addEventListener("click", () => {
  const t = $("#r-custom").value.trim().replace(/\s+/g, " ");
  if (!t) return;
  picks.add(t);
  $("#r-custom").value = "";
  renderPicks();
});

 
function ferr(msg) { const e = $("#r-ferr"); e.hidden = !msg; e.textContent = msg || ""; }
function v(sel) { return $(sel).value.trim(); }

function freshNumber() {
  
  for (let t = 0; t < 5; t++) {
    let code = "";
    const D = "0123456789", L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    for (let i = 0; i < 4; i++) code += (i < 2 ? D : L)[Math.floor(Math.random() * (i < 2 ? 10 : 24))];
    const cand = "IMG-" + todayLocal().replace(/-/g, "") + "-" + code;
    if (!reqs.some((x) => x.requestNumber === cand)) return cand;
  }
  return "IMG-" + todayLocal().replace(/-/g, "") + "-" + Date.now().toString(36).toUpperCase().slice(-5);
}

async function saveReq() {
  ferr("");
  if (!selected) return ferr("Find and choose the patient first (step 1).");
  const dept = v("#r-dept");
  const clinician = v("#r-clinician");
  const staff = rememberedStaff() || clinician;
  if (!dept) return ferr("The requesting department is required.");
  if (!clinician) return ferr("The requesting clinician is required — the report must reach someone.");
  const procedures = Array.from(picks);
  if (procedures.length === 0) return ferr("Choose at least one procedure — tick from the list or add your own.");
  keepStaff(clinician);
  const btn = $("#r-save");
  if (btn.disabled) return; 
  btn.disabled = true;
  try {
    const num = freshNumber();
    const ref = await addDoc(collection(db, "healthImagingRequests"), {
      requestNumber: num,
      patientId: String(selected.regId),
      patientName: who(selected),
      patientAge: selected.age === "" || selected.age == null ? "" : selected.age,
      patientSex: selected.sex || "",
      requestingDepartment: dept,
      requestingClinician: clinician,
      clinicalInfo: v("#r-info"),
      priority: $("#r-priority").value,
      status: "Requested",
      appointment: { date: "", time: "", room: "", status: "", reason: "" },
      procedures: procedures.map((t) => ({
        name: t, status: "Pending", note: "",
        performedBy: "", performedAt: "",
        report: { findings: "", reportBy: "", reportedAt: "", verifiedBy: "", verifiedAt: "", corrections: [] }
      })),
      urgent: { flagged: false, notifiedTo: "", notifiedAt: "", notifiedBy: "", acknowledgedBy: "", acknowledgedAt: "" },
      recordedBy: staff,
      statusHistory: [{ status: "Requested", at: nowISO(), by: staff, note: dept + " · " + clinician }],
      createdAt: nowISO(),
      updatedAt: nowISO(),
      completedAt: ""
    });
    $("#r-done-line").textContent = who(selected) + " · " + num +
      " · " + procedures.length + " procedure" + (procedures.length === 1 ? "" : "s") +
      " · " + $("#r-priority").value + " · " + dept + " · " + clinician + ".";
    $("#r-gowork").href = "/radiology/372?patient=" + encodeURIComponent(selected.regId);
    $("#r-formcard").hidden = true;
    $("#r-done").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    ferr("Could not save the request: " + ((e && (e.code || e.message)) || e));
  }
  btn.disabled = false;
}
$("#r-save").addEventListener("click", saveReq);
$("#r-clear").addEventListener("click", () => {
  picks.clear(); renderPicks();
  $("#r-dept").value = ""; $("#r-clinician").value = ""; $("#r-info").value = "";
  ferr("");
});
$("#r-again").addEventListener("click", () => {
  selected = null; picks.clear(); renderPicks();
  $("#r-q").value = "";
  $("#r-dept").value = ""; $("#r-clinician").value = ""; $("#r-info").value = "";
  $("#r-done").hidden = true; $("#r-formcard").hidden = true;
  ferr("");
  renderCands(); renderSel();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderCands(); renderSel(); renderPicks();
maybeAutoOpen();

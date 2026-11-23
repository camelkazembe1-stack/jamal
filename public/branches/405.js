
import { requireAuth, db, collection, doc, addDoc, deleteDoc, onSnapshot } from "/sidebar.js";

window.__p05.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p05) window.__p05.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
}
function bootDone() {
  if (window.__p05) window.__p05.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p05.auth = true; }
catch (e) { herr("the sign-in check", e); throw e; }

let recs = [];
const activeCode = () => {
  try { return localStorage.getItem("jamaliActiveBranchCode") || ""; }
  catch (e) { return ""; }
};
const activeName = () => {
  try { return localStorage.getItem("jamaliActiveBranchName") || ""; }
  catch (e) { return ""; }
};
function paintActive() {
  $("#active-name").textContent =
    (activeName() || "none chosen yet") + (activeCode() ? "  \u00b7  code " + activeCode() : "");
}

onSnapshot(collection(db, "healthBranches"), (snap) => {
  recs = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  if (window.__p05) window.__p05.docs = recs.length;
  paintActive();
  renderAll();
}, (e) => herr("healthBranches", e));

window.__p05.listeners = 1;

function renderAll() {
  const has = recs.length > 0;
  $("#t-card").hidden = !has;
  $("#t-empty").hidden = has;
  $("#t-body").innerHTML = recs.map((r) => {
    const st = String(r.status || "Active");
    const isActive = activeCode() && String(r.code || "") === activeCode();
    return "<tr>" +
      '<td class="c-code">' + esc(r.code || "—") + (isActive ? ' <span class="st st-on">ACTIVE HERE</span>' : "") + "</td>" +
      '<td class="c-name">' + esc(r.name || "—") + "</td>" +
      "<td>" + esc(r.town || "—") + "</td>" +
      "<td>" + esc(r.phone || "—") + "</td>" +
      "<td>" + esc(r.inCharge || "—") + "</td>" +
      '<td><span class="st ' + (st === "Closed" ? "st-off" : "st-clinical") + '">' + esc(st) + "</span></td>" +
      '<td class="c-act"><button type="button" class="mini-btn" data-set="' + esc(r.__id) + '"' +
        (st === "Closed" ? " disabled" : "") + ">Set active</button> " +
      '<button type="button" class="row-del" data-del="' + esc(r.__id) + '">Delete</button></td>' +
      "</tr>";
  }).join("");
  $("#t-count").textContent = has
    ? recs.length + " branch(es) in the registry - the active one stamps certificates, telemedicine and the DHIS2 export."
    : "";
}

// ---- add ----------------------------------------------------------------------
const form = $(".s-form");
$(".s-toggle").addEventListener("click", () => {
  form.hidden = !form.hidden;
  $(".s-toggle").textContent = form.hidden ? "\uFF0B Add a branch" : "\u00D7 Close";
});
$(".s-cancel").addEventListener("click", () => { form.hidden = true;
  $(".s-toggle").textContent = "\uFF0B Add a branch"; });

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = $("#f-err"), ok = $("#f-ok");
  err.hidden = true; ok.hidden = true;
  const name = $("#f-name").value.trim();
  const code = $("#f-code").value.trim();
  if (!name || !code)
    { err.textContent = "Fill in the branch name and its short code."; err.hidden = false; return; }
  if (recs.some((r) => String(r.code || "").toLowerCase() === code.toLowerCase()))
    { err.textContent = "The code " + code + " is already used by " +
      (recs.find((r) => String(r.code || "").toLowerCase() === code.toLowerCase()).name || "another branch") + ".";
      err.hidden = false; return; }
  const data = {
    name, code,
    town: $("#f-town").value.trim(),
    phone: $("#f-phone").value.trim(),
    inCharge: $("#f-incharge").value.trim(),
    status: $("#f-status").value,
    savedAt: new Date().toISOString()
  };
  const btn = $(".s-save");
  btn.disabled = true; btn.textContent = "Saving\u2026";
  try {
    await addDoc(collection(db, "healthBranches"), data);
    ok.textContent = name + " (" + code + ") saved.";
    form.reset(); form.hidden = true;
    $(".s-toggle").textContent = "\uFF0B Add a branch";
  } catch (e) {
    err.textContent = "Save failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Save Branch";
  }
});

// ---- actions -------------------------------------------------------------------
$("#t-body").addEventListener("click", async (e) => {
  const set = e.target.closest("[data-set]");
  if (set) {
    const r = recs.find((x) => x.__id === set.getAttribute("data-set"));
    if (!r) return;
    try {
      localStorage.setItem("jamaliActiveBranchCode", String(r.code || ""));
      localStorage.setItem("jamaliActiveBranchName", String(r.name || ""));
      paintActive();
      renderAll();
    } catch (e2) {
      window.alert("This browser blocks local storage - the active branch cannot be remembered.");
    }
    return;
  }
  const del = e.target.closest("[data-del]");
  if (!del) return;
  const r = recs.find((x) => x.__id === del.getAttribute("data-del"));
  if (!r) return;
  if (!window.confirm("Delete branch " + (r.name || r.code) + " from the registry?")) return;
  try {
    await deleteDoc(doc(db, "healthBranches", r.__id));
    if (activeCode() && String(r.code || "") === activeCode()) {
      try {
        localStorage.removeItem("jamaliActiveBranchCode");
        localStorage.removeItem("jamaliActiveBranchName");
        paintActive();
      } catch (e2) { }
    }
  } catch (e2) {
    window.alert("Delete failed: " + ((e2 && (e2.code || e2.message)) || e2));
  }
});

paintActive();
renderAll();
bootDone();

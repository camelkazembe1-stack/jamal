
import { requireAuth, db, collection, doc, addDoc, deleteDoc, onSnapshot,
         signInWithPopup, auth, provider, authSettled } from "/sidebar.js";

window.__p99.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const normEmail = (v) => String(v || "").trim().toLowerCase();

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p99) window.__p99.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
}
function bootDone() {
  if (window.__p99) window.__p99.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try {
  await requireAuth();
  window.__p99.auth = true;
} catch (e) {
  herr("the sign-in check", e);
  throw e;
}

// ---- live data --------------------------------------------------------------
let STAFF = [];         // healthStaff docs
let BRANCHES = [];      // healthBranches docs (names for the datalist)
let me = { email: "", role: "", isAdmin: false, exists: false, canEdit: false };

function roleClass(r) {
  const v = String(r || "");
  if (v === "Administrator") return "st-admin";
  if (["Doctor", "Nurse", "Pharmacist", "Lab technician"].indexOf(v) >= 0) return "st-clinical";
  if (["Billing officer", "Records officer", "Receptionist"].indexOf(v) >= 0) return "st-support";
  return "st-viewer";
}

function whoAmI() {
  const mail = normEmail(me.email);
  const row = mail && STAFF.find((s) => normEmail(s.email) === mail);
  me.exists = !!row;
  me.role = row ? String(row.role || "Viewer") : "";
  me.isAdmin = !!(row && row.role === "Administrator" && String(row.status || "Active") === "Active");
  // Bootstrap: an empty registry needs its first administrator - whoever is
  // signed in may create it. After that, only Administrators may edit.
  me.canEdit = STAFF.length === 0 ? !!mail : me.isAdmin;
  $("#who-email").textContent = mail || "not signed in (anonymous visitor)";
  $("#who-role").textContent = me.role || (mail ? "not in the registry" : "\u2014");
  const acc = $("#who-access");
  acc.textContent = me.canEdit ? "Full - you may manage the registry"
    : (STAFF.length === 0 ? "Bootstrap - add the first administrator"
    : "Read only - only Administrators manage the registry");
  acc.className = "v " + (me.canEdit ? "allowed" : "denied");
  $("#who-note").textContent = me.canEdit
    ? "Every change you make is recorded in the Health Audit Trail with your email."
    : "Sign in from the footer with an account that holds the Administrator role, or ask an administrator on this device.";
  // the form + delete buttons follow the gate
  document.querySelectorAll(".s-toggle, .s-save, .s-cancel").forEach((el) => { el.disabled = !me.canEdit; });
}

onSnapshot(collection(db, "healthStaff"), (snap) => {
  STAFF = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
  if (window.__p99) window.__p99.docs = STAFF.length;
  whoAmI();
  renderAll();
}, (e) => herr("healthStaff", e));

onSnapshot(collection(db, "healthBranches"), (snap) => {
  BRANCHES = snap.docs.map((d) => d.data());
  $("#f-branches").innerHTML = BRANCHES
    .filter((b) => String(b.status || "Active") !== "Closed")
    .map((b) => '<option value="' + esc(b.name || "") + '">').join("");
}, () => { });

window.__p99.listeners = 2;

// ---- identity: live re-check when the real Google identity settles ----------
(async () => {
  try { await authSettled(); } catch (e) { }
  try {
    const u = auth && auth.currentUser;
    me.email = u && u.email ? u.email : (localStorage.getItem("jamaliIdentityCache") || "");
  } catch (e) { me.email = localStorage.getItem("jamaliIdentityCache") || ""; }
  whoAmI();
  renderAll();
})();
window.__p99.listeners++;

// ---- render -----------------------------------------------------------------
function renderAll() {
  $("#d-total").textContent = String(STAFF.length);
  $("#d-active").textContent = String(STAFF.filter((s) => String(s.status || "Active") === "Active").length);
  $("#d-suspended").textContent = String(STAFF.filter((s) => String(s.status) === "Suspended").length);
  $("#d-admins").textContent = String(STAFF.filter((s) => s.role === "Administrator").length);

  const has = STAFF.length > 0;
  $("#t-card").hidden = !has;
  $("#t-empty").hidden = has;
  $("#t-body").innerHTML = STAFF.map((s) => {
    const st = String(s.status || "Active");
    return "<tr>" +
      '<td class="c-name">' + esc(s.fullName || "—") + "</td>" +
      '<td class="c-mail">' + esc(s.email || "—") + "</td>" +
      '<td><span class="st ' + roleClass(s.role) + '">' + esc(s.role || "Viewer") + "</span></td>" +
      "<td>" + esc(s.branch || "—") + "</td>" +
      "<td><span class=\"st " + (st === "Suspended" ? "st-suspended" : "st-clinical") + '">' + esc(st) + "</span></td>" +
      '<td class="c-act">' + (me.canEdit
        ? '<button type="button" class="mini-btn" data-del="' + esc(s.__id) + '">Delete</button>'
        : "") + "</td>" +
      "</tr>";
  }).join("");
  $("#t-count").textContent = has
    ? STAFF.length + (STAFF.length === 1 ? " member" : " members") + " on this device's registry."
    : "";
}

// ---- add a staff member ------------------------------------------------------
const form = $(".s-form");
$(".s-toggle").addEventListener("click", () => {
  if (!me.canEdit) return;
  form.hidden = !form.hidden;
  $(".s-toggle").textContent = form.hidden ? "\uFF0B Add a staff member" : "\u00D7 Close";
});
$(".s-cancel").addEventListener("click", () => { form.hidden = true;
  $(".s-toggle").textContent = "\uFF0B Add a staff member"; });

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = $("#f-err"), ok = $("#f-ok");
  err.hidden = true; ok.hidden = true;
  if (!me.canEdit) { err.textContent = "Only Administrators manage the registry."; err.hidden = false; return; }
  const fullName = $("#f-name").value.trim();
  const email = normEmail($("#f-email").value);
  if (!fullName || !email) { err.textContent = "Fill in the name and the Google account email."; err.hidden = false; return; }
  if (STAFF.some((s) => normEmail(s.email) === email))
    { err.textContent = email + " is already in the registry - delete the old row first."; err.hidden = false; return; }
  const data = {
    fullName, email,
    role: $("#f-role").value,
    branch: $("#f-branch").value.trim(),
    status: $("#f-status").value,
    savedAt: new Date().toISOString()
  };
  const btn = $(".s-save");
  btn.disabled = true; btn.textContent = "Saving\u2026";
  try {
    await addDoc(collection(db, "healthStaff"), data);
    ok.textContent = fullName + " saved as " + data.role + ".";
    form.reset(); form.hidden = true;
    $(".s-toggle").textContent = "\uFF0B Add a staff member";
  } catch (e) {
    err.textContent = "Save failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Save Staff Member";
  }
});

// ---- delete ------------------------------------------------------------------
$("#t-body").addEventListener("click", async (e) => {
  const del = e.target.closest("[data-del]");
  if (!del || !me.canEdit) return;
  const id = del.getAttribute("data-del");
  const row = STAFF.find((s) => s.__id === id);
  if (!row) return;
  if (row.role === "Administrator" &&
      STAFF.filter((s) => s.role === "Administrator").length <= 1) {
    window.alert("This is the only Administrator. Add another Administrator before removing this one.");
    return;
  }
  if (!window.confirm("Remove " + (row.fullName || row.email) + " from the registry?")) return;
  try { await deleteDoc(doc(db, "healthStaff", id)); }
  catch (e2) { window.alert("Delete failed: " + ((e2 && (e2.code || e2.message)) || e2)); }
});

bootDone();

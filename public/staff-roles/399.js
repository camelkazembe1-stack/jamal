
import { requireAuth, db, collection, doc, addDoc, deleteDoc, setDoc, onSnapshot,
         signInWithPopup, auth, provider, authSettled,
         STAFF_ROLES, roleTemplateFolders } from "/sidebar.js";

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
  if (["Doctor", "Nurse", "Midwife", "Pharmacist", "Lab technician", "Radiographer"].indexOf(v) >= 0) return "st-clinical";
  if (["Billing officer", "Records officer", "Receptionist", "HR officer", "Store keeper", "Support services"].indexOf(v) >= 0) return "st-support";
  return "st-viewer";
}

// ---- the business role catalog drives the form (25 Nov 2026) -----------------
// The select is rebuilt from the one shared catalog (STAFF_ROLES) so the
// login gate, the Account Administration desk and this page always speak
// the same role names. A stored legacy role that has left the catalog is
// appended back so an edit never silently renames anybody.
function fillRoleSelect(current) {
  const sel = $("#f-role");
  const keep = String(current || sel.value || "");
  sel.innerHTML = STAFF_ROLES.map((r) => "<option>" + esc(r) + "</option>").join("");
  if (keep && STAFF_ROLES.indexOf(keep) === -1) {
    const o = document.createElement("option");
    o.textContent = keep;
    sel.appendChild(o);
  }
  sel.value = keep && (STAFF_ROLES.indexOf(keep) >= 0 || keep) ? keep : STAFF_ROLES[0];
}

function folderLabel(folder) {
  const M = window.JAMALI_MENU || [];
  for (const it of M) {
    if (it.folder === folder) return (it.icon ? it.icon + " " : "") + it.label;
  }
  return folder;
}

function folderHasKids(folder) {
  const M = window.JAMALI_MENU || [];
  let open = false, depth = 0;
  for (const it of M) {
    const d = it.d || 0;
    if (open && d <= depth) open = false;
    if (!open && it.folder === folder) { open = true; depth = d; continue; }
    if (open) return true;
  }
  return false;
}

function templatePreview(role) {
  const t = roleTemplateFolders(role);
  if (t === null) return ""; // role not in the catalog - no promise to show
  if (String(role) === "Administrator" && t.length === 0) {
    return "The Administrator opens every module.";
  }
  const names = t.map((f) => folderLabel(f) + (folderHasKids(f) ? " (+ sub-pages)" : ""));
  return "The role opens: " + names.join(", ") + ".";
}

function accessLabel(s) {
  if (String(s.accessMode || "role") === "custom") {
    return "Custom (" + (Array.isArray(s.modules) ? s.modules.length : 0) + ")";
  }
  return String(s.role) === "Administrator" ? "Every module" : "Role template";
}
function accessClass(s) {
  return String(s.accessMode || "role") === "custom" ? "st-support" : "st-viewer";
}

function accessModeNow() {
  const on = document.querySelector('input[name="f-access"]:checked');
  return (on && on.value) === "custom" ? "custom" : "role";
}

const ACCESS_TREE_SKIP = { home: 1, "system-admin": 1, "staff-roles": 1, "file-viewer": 1 };

function buildAccessTree(selected) {
  const M = window.JAMALI_MENU || [];
  const box = $("#f-access-tree");
  box.innerHTML = "";
  const set = {};
  (selected || []).forEach((f) => { set[f] = 1; });
  for (const it of M) {
    const d = it.d || 0;
    if (d > 2) continue; // wings + main modules; their sub-pages ride the parent tick
    if (ACCESS_TREE_SKIP[it.folder]) continue;
    const lab = document.createElement("label");
    lab.className = d === 1 ? "top" : "kid";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = it.folder;
    cb.checked = !!set[it.folder];
    const sp = document.createElement("span");
    sp.textContent = (it.icon ? it.icon + " " : "") + it.label +
      (folderHasKids(it.folder) ? " (with its sub-pages)" : "");
    lab.appendChild(cb);
    lab.appendChild(sp);
    box.appendChild(lab);
  }
  if (!box.children.length) box.textContent = "The menu tree is not loaded yet.";
}

function paintAccessUi() {
  const custom = accessModeNow() === "custom";
  const tree = $("#f-access-tree");
  if (custom && !tree.children.length) buildAccessTree(roleTemplateFolders($("#f-role").value) || []);
  tree.hidden = !custom;
  $("#f-access-note").textContent = custom
    ? "Tick the main modules this member may open - ticking a module carries its sub-pages. Home, Staff Roles and the file viewer always stay open."
    : "The role's template decides which modules the member opens; the sidebar hides and blocks every other module for them.";
}

function paintRoleInfo() {
  const info = $("#f-role-info");
  const t = templatePreview($("#f-role").value);
  info.textContent = t;
  info.hidden = !t;
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
      '<td><span class="st ' + accessClass(s) + '">' + esc(accessLabel(s)) + "</span></td>" +
      "<td>" + esc(s.branch || "—") + "</td>" +
      "<td><span class=\"st " + (st === "Suspended" ? "st-suspended" : "st-clinical") + '">' + esc(st) + "</span></td>" +
      '<td class="c-act">' + (me.canEdit
        ? '<button type="button" class="mini-btn" data-edit="' + esc(s.__id) + '">Edit</button> ' +
          '<button type="button" class="mini-btn" data-del="' + esc(s.__id) + '">Delete</button>'
        : "") + "</td>" +
      "</tr>";
  }).join("");
  $("#t-count").textContent = has
    ? STAFF.length + (STAFF.length === 1 ? " member" : " members") + " on this device's registry."
    : "";
}

// ---- add / edit a staff member -----------------------------------------------
const form = $(".s-form");
let EDIT_ID = ""; // set while the form edits an existing registry row

function resetFormState() {
  EDIT_ID = "";
  $(".s-save").textContent = "Save Staff Member";
  document.querySelector('input[name="f-access"][value="role"]').checked = true;
  $("#f-access-tree").innerHTML = "";
  $("#f-access-tree").hidden = true;
  paintRoleInfo();
  paintAccessUi();
}

$(".s-toggle").addEventListener("click", () => {
  if (!me.canEdit) return;
  form.hidden = !form.hidden;
  $(".s-toggle").textContent = form.hidden ? "\uFF0B Add a staff member" : "\u00D7 Close";
  if (form.hidden) resetFormState();
});
$(".s-cancel").addEventListener("click", () => { form.hidden = true;
  $(".s-toggle").textContent = "\uFF0B Add a staff member";
  resetFormState(); });

$("#f-role").addEventListener("change", () => {
  paintRoleInfo();
  if (accessModeNow() === "custom") {
    buildAccessTree(roleTemplateFolders($("#f-role").value) || []);
  }
});
document.querySelectorAll('input[name="f-access"]').forEach((radio) => {
  radio.addEventListener("change", paintAccessUi);
});

function openEdit(row) {
  EDIT_ID = String(row.__id || "");
  fillRoleSelect(row.role);
  form.hidden = false;
  $(".s-toggle").textContent = "\u00D7 Close";
  $("#f-name").value = row.fullName || "";
  $("#f-email").value = row.email || "";
  $("#f-branch").value = row.branch || "";
  $("#f-status").value = String(row.status || "Active") === "Suspended" ? "Suspended" : "Active";
  const custom = String(row.accessMode || "role") === "custom";
  document.querySelector('input[name="f-access"][value="' + (custom ? "custom" : "role") + '"]').checked = true;
  buildAccessTree(custom ? (Array.isArray(row.modules) ? row.modules : [])
    : (roleTemplateFolders($("#f-role").value) || []));
  $(".s-save").textContent = "Save Changes";
  paintRoleInfo();
  paintAccessUi();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = $("#f-err"), ok = $("#f-ok");
  err.hidden = true; ok.hidden = true;
  if (!me.canEdit) { err.textContent = "Only Administrators manage the registry."; err.hidden = false; return; }
  const fullName = $("#f-name").value.trim();
  const email = normEmail($("#f-email").value);
  if (!fullName || !email) { err.textContent = "Fill in the name and the Google account email."; err.hidden = false; return; }
  if (STAFF.some((s) => normEmail(s.email) === email && String(s.__id) !== EDIT_ID))
    { err.textContent = email + " is already in the registry - each Google account carries one row."; err.hidden = false; return; }
  const data = {
    fullName, email,
    role: $("#f-role").value,
    branch: $("#f-branch").value.trim(),
    status: $("#f-status").value,
    accessMode: accessModeNow(),
    savedAt: new Date().toISOString()
  };
  if (data.accessMode === "custom") {
    data.modules = Array.prototype.slice.call(
      document.querySelectorAll("#f-access-tree input[type=checkbox]:checked")).map((cb) => cb.value);
    if (!data.modules.length) {
      err.textContent = "The custom selection has no modules - tick at least one, or switch back to Follow the role's template.";
      err.hidden = false;
      return;
    }
  }
  const editing = !!EDIT_ID;
  const btn = $(".s-save");
  btn.disabled = true; btn.textContent = "Saving\u2026";
  try {
    if (editing) {
      await setDoc(doc(db, "healthStaff", EDIT_ID), data);
      ok.textContent = fullName + " updated - the sidebar applies the new access the moment the registry refreshes.";
    } else {
      await addDoc(collection(db, "healthStaff"), data);
      ok.textContent = fullName + " saved as " + data.role + ".";
    }
    form.reset(); form.hidden = true;
    $(".s-toggle").textContent = "\uFF0B Add a staff member";
    resetFormState();
  } catch (e) {
    err.textContent = "Save failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = editing ? "Save Changes" : "Save Staff Member";
  }
});

// ---- edit + delete ------------------------------------------------------------
$("#t-body").addEventListener("click", async (e) => {
  const edit = e.target.closest("[data-edit]");
  if (edit && me.canEdit) {
    const row = STAFF.find((s) => String(s.__id) === String(edit.getAttribute("data-edit")));
    if (row) openEdit(row);
    return;
  }
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

// The one shared role catalog drives the form from the first paint:
// the select carries the catalog's roles, the role note shows the
// template's modules, and the access radios start on "follow the role".
fillRoleSelect();
paintRoleInfo();
paintAccessUi();

bootDone();

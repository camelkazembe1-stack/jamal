
import { requireAuth, db, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from "/sidebar.js";

window.__p02.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STATUSES = ["Waiting", "In progress", "Completed", "Cancelled"];
const ST = { "Waiting": "st-wait", "In progress": "st-busy", "Completed": "st-done", "Cancelled": "st-cancel" };

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p02) window.__p02.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
}
function bootDone() {
  if (window.__p02) window.__p02.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p02.auth = true; }
catch (e) { herr("the sign-in check", e); throw e; }

let recs = [];
const todayLocal = () => { const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

onSnapshot(collection(db, "healthTelemedicine"), (snap) => {
  recs = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .sort((a, b) => String(b.scheduledAt || b.createdAt || "").localeCompare(String(a.scheduledAt || a.createdAt || "")));
  if (window.__p02) window.__p02.docs = recs.length;
  renderAll();
}, (e) => herr("healthTelemedicine", e));

window.__p02.listeners = 1;

function safeLink(v) {
  const s = String(v || "").trim();
  return /^(https?:|tel:)/i.test(s) ? s : "";
}

function renderAll() {
  $("#d-waiting").textContent = String(recs.filter((r) => r.status === "Waiting").length);
  $("#d-active").textContent = String(recs.filter((r) => r.status === "In progress").length);
  $("#d-done").textContent = String(recs.filter((r) => r.status === "Completed").length);
  $("#d-cancelled").textContent = String(recs.filter((r) => r.status === "Cancelled").length);

  const q = String(($("#rec-search") || {}).value || "").trim().toLowerCase();
  const rows = !q ? recs : recs.filter((r) =>
    ["ref", "patientName", "phone", "reason", "regId", "doctor"].some((k) =>
      String(r[k] || "").toLowerCase().includes(q)));

  const has = rows.length > 0;
  $("#t-card").hidden = !has;
  $("#t-empty").hidden = has;
  $("#t-body").innerHTML = rows.map((r) => {
    const when = String(r.scheduledAt || "").replace("T", " ").slice(0, 16) || String(r.createdAt || "").slice(0, 10);
    const link = safeLink(r.meetLink);
    return "<tr>" +
      '<td><span class="ref">' + esc(r.ref || "") + "</span></td>" +
      '<td class="c-when">' + esc(when || "—") + "</td>" +
      '<td class="c-name">' + esc(r.patientName || "—") + (r.phone ? '<br><span class="d-none">' + esc(r.phone) + "</span>" : "") + "</td>" +
      "<td>" + esc(r.reason || "—") + "</td>" +
      '<td class="c-link">' + (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener">Open call &rarr;</a>' : '<span class="d-none">no link</span>') + "</td>" +
      '<td><span class="st ' + (ST[r.status] || "st-wait") + '">' + esc(r.status || "Waiting") + "</span></td>" +
      '<td class="c-act"><select class="st-sel" data-id="' + esc(r.__id) + '">' +
        STATUSES.map((s) => "<option" + (s === r.status ? " selected" : "") + ">" + s + "</option>").join("") +
      "</select> <button type=\"button\" class=\"row-del\" data-id=\"" + esc(r.__id) + '">Delete</button></td>' +
      "</tr>";
  }).join("");
  $("#t-count").textContent = has
    ? rows.length + " consultation(s)" + (q ? " matching '" + q + "'" : "") + " on this device's records."
    : "";
}

$("#rec-search").addEventListener("input", renderAll);

const form = $(".s-form");
$(".s-toggle").addEventListener("click", () => {
  form.hidden = !form.hidden;
  $(".s-toggle").textContent = form.hidden ? "\uFF0B Book a remote consultation" : "\u00D7 Close";
});
$(".s-cancel").addEventListener("click", () => { form.hidden = true;
  $(".s-toggle").textContent = "\uFF0B Book a remote consultation"; });

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = $("#f-err"), ok = $("#f-ok");
  err.hidden = true; ok.hidden = true;
  const patientName = $("#f-name").value.trim();
  const reason = $("#f-reason").value.trim();
  if (!patientName || !reason)
    { err.textContent = "Fill in the patient name and the reason."; err.hidden = false; return; }
  const data = {
    regId: $("#f-regid").value.trim(),
    patientName, phone: $("#f-phone").value.trim(), reason,
    scheduledAt: $("#f-when").value,
    meetLink: $("#f-link").value.trim(),
    doctor: $("#f-doctor").value.trim(),
    notes: $("#f-notes").value.trim(),
    status: "Waiting",
    ref: "TEL-" + todayLocal().replace(/-/g, "").slice(2) + "-" + String((recs.length + 1) % 10000).padStart(4, "0"),
    createdAt: new Date().toISOString()
  };
  const btn = $(".s-save");
  btn.disabled = true; btn.textContent = "Saving\u2026";
  try {
    await addDoc(collection(db, "healthTelemedicine"), data);
    ok.textContent = "Booked as " + data.ref + " - status Waiting.";
    form.reset(); form.hidden = true;
    $(".s-toggle").textContent = "\uFF0B Book a remote consultation";
  } catch (e) {
    err.textContent = "Save failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Book Consultation";
  }
});

$("#t-body").addEventListener("change", (ev) => {
  const sel = ev.target.closest("select.st-sel");
  if (!sel) return;
  const id = sel.getAttribute("data-id");
  const rec = recs.find((r) => r.__id === id);
  if (!rec) return;
  updateDoc(doc(db, "healthTelemedicine", id),
    { status: sel.value, updatedAt: new Date().toISOString() })
    .catch(() => { rec.status = sel.value; renderAll(); });
  rec.status = sel.value;
  renderAll();
});

$("#t-body").addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button.row-del");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const rec = recs.find((r) => r.__id === id);
  if (!rec) return;
  if (!window.confirm("Delete consultation " + (rec.ref || "") + "? This cannot be undone.")) return;
  try { await deleteDoc(doc(db, "healthTelemedicine", id)); }
  catch (e) { window.alert("Delete failed: " + ((e && (e.code || e.message)) || e)); }
});

renderAll();
bootDone();

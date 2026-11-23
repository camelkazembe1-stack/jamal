
import { requireAuth, db, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from "/sidebar.js";

window.__p06.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p06) window.__p06.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
}
function bootDone() {
  if (window.__p06) window.__p06.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p06.auth = true; }
catch (e) { herr("the sign-in check", e); throw e; }

let recs = [];

onSnapshot(collection(db, "healthTariff"), (snap) => {
  recs = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .sort((a, b) => String(a.cat || "").localeCompare(String(b.cat || "")) ||
                    String(a.name || "").localeCompare(String(b.name || "")));
  if (window.__p06) window.__p06.docs = recs.length;
  renderDash();
  renderAll();
}, (e) => herr("healthTariff", e));

window.__p06.listeners = 1;

function renderDash() {
  $("#d-total").textContent = String(recs.length);
  $("#d-active").textContent = String(recs.filter((r) => String(r.status || "Active") === "Active").length);
  $("#d-nhif").textContent = String(recs.filter((r) => num(r.nhif) > 0).length);
  $("#d-cats").textContent = String(new Set(recs.map((r) => String(r.cat || "Other"))).size);
}

function renderAll() {
  const q = String(($("#rec-search") || {}).value || "").trim().toLowerCase();
  const rows = !q ? recs : recs.filter((r) =>
    ["code", "name", "cat", "notes"].some((k) => String(r[k] || "").toLowerCase().includes(q)));
  const has = rows.length > 0;
  $("#t-card").hidden = !has;
  $("#t-empty").hidden = has || recs.length > 0;
  $("#t-body").innerHTML = rows.map((r) => {
    const st = String(r.status || "Active");
    return "<tr>" +
      '<td class="c-code">' + esc(r.code || "—") + "</td>" +
      '<td class="c-name">' + esc(r.name || "—") + (r.notes ? '<br><span class="cell-sub">' + esc(r.notes) + "</span>" : "") + "</td>" +
      '<td><span class="st st-support">' + esc(r.cat || "Other") + "</span></td>" +
      '<td class="c-amt">' + num(r.price).toLocaleString() + "</td>" +
      '<td class="c-amt">' + (num(r.nhif) > 0 ? num(r.nhif).toLocaleString() : "—") + "</td>" +
      "<td>" + esc(String(r.eff || "").slice(0, 10) || "—") + "</td>" +
      '<td><span class="st ' + (st === "Active" ? "st-clinical" : "st-viewer") + '">' + esc(st) + "</span></td>" +
      '<td class="c-act"><button type="button" class="row-del" data-id="' + esc(r.__id) + '">Delete</button></td>' +
      "</tr>";
  }).join("");
  $("#t-count").textContent = recs.length
    ? rows.length + " of " + recs.length + " service(s) - the billing page (363) and the claims desk (365) pick prices from this list."
    : "";
}

$("#rec-search").addEventListener("input", renderAll);

// CSV export - the tariff is a document the facility reviews yearly
$("#t-export").addEventListener("click", () => {
  if (!recs.length) { window.alert("The tariff is empty."); return; }
  const lines = ["code,service,category,price,insuranceTariff,effective,status,notes"];
  for (const r of recs) {
    lines.push([r.code, r.name, r.cat, num(r.price), num(r.nhif), String(r.eff || "").slice(0, 10),
      r.status || "Active", String(r.notes || "").replace(/,/g, ";")]
      .map((v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"').join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jamali-tariff-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
});

// ---- add ----------------------------------------------------------------------
const form = $(".s-form");
$(".s-toggle").addEventListener("click", () => {
  form.hidden = !form.hidden;
  $(".s-toggle").textContent = form.hidden ? "\uFF0B Add / price a service" : "\u00D7 Close";
});
$(".s-cancel").addEventListener("click", () => { form.hidden = true;
  $(".s-toggle").textContent = "\uFF0B Add / price a service"; });

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = $("#f-err"), ok = $("#f-ok");
  err.hidden = true; ok.hidden = true;
  const code = $("#f-code").value.trim();
  const name = $("#f-name").value.trim();
  const price = num($("#f-price").value);
  if (!code || !name || price <= 0)
    { err.textContent = "Fill in the code, the service name and a price above zero."; err.hidden = false; return; }
  const clash = recs.find((r) => String(r.code || "").toLowerCase() === code.toLowerCase());
  const data = {
    code, name,
    cat: $("#f-cat").value,
    price,
    nhif: num($("#f-nhif").value),
    eff: $("#f-eff").value,
    status: $("#f-status").value,
    notes: $("#f-notes").value.trim(),
    savedAt: new Date().toISOString()
  };
  const btn = $(".s-save");
  btn.disabled = true; btn.textContent = "Saving\u2026";
  try {
    if (clash) {
      // same code = re-pricing the service: the history is kept in the audit
      await updateDoc(doc(db, "healthTariff", clash.__id), data);
      ok.textContent = code + " re-priced: " + name + " at " + price.toLocaleString() + " TSh.";
    } else {
      await addDoc(collection(db, "healthTariff"), data);
      ok.textContent = code + " \u2014 " + name + " priced at " + price.toLocaleString() + " TSh.";
    }
    form.reset(); form.hidden = true;
    $(".s-toggle").textContent = "\uFF0B Add / price a service";
  } catch (e) {
    err.textContent = "Save failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Save Service";
  }
});

// ---- delete --------------------------------------------------------------------
$("#t-body").addEventListener("click", async (e) => {
  const del = e.target.closest(".row-del");
  if (!del) return;
  const r = recs.find((x) => x.__id === del.getAttribute("data-id"));
  if (!r) return;
  if (!window.confirm("Remove " + (r.code || "") + " \u2014 " + (r.name || "") + " from the tariff?")) return;
  try { await deleteDoc(doc(db, "healthTariff", r.__id)); }
  catch (e2) { window.alert("Delete failed: " + ((e2 && (e2.code || e2.message)) || e2)); }
});

renderAll();
bootDone();

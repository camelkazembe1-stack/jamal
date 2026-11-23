
import { requireAuth, DRUG_INTERACTIONS, checkInteractions } from "/sidebar.js";

window.__p07.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function herr(where, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p07) window.__p07.errs.push(where + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not open the page \u2014 " + code;
}
function bootDone() {
  if (window.__p07) window.__p07.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p07.auth = true; }
catch (e) { herr("the sign-in check", e); throw e; }

const CLS = { Major: "st-bad", Moderate: "st-warn", Minor: "st-info" };
const ORDER = { Major: 0, Moderate: 1, Minor: 2 };

function hitHTML(m) {
  return '<div class="hit"><span class="st ' + (CLS[m.severity] || "st-info") + '">' +
    esc(m.severity) + "</span><b>" + esc(m.a) + " + " + esc(m.b) + "</b> &mdash; " +
    esc(m.effect) + ". <i>What to do: " + esc(m.action) + ".</i></div>";
}

// ---- the pair check -------------------------------------------------------------
$("#p-go").addEventListener("click", () => {
  const a = $("#p-a").value.trim();
  const b = $("#p-b").value.trim();
  const box = $("#p-result");
  box.hidden = false;
  if (!a || !b) { box.innerHTML = '<div class="hit none">Type both medicines first.</div>'; return; }
  const hits = checkInteractions([a, b]);
  box.innerHTML = hits.length
    ? hits.map(hitHTML).join("")
    : '<div class="hit none">No known interaction between "' + esc(a) + '" and "' + esc(b) +
      '" in this table. That is not a guarantee - clinical judgement still decides.</div>';
});

// ---- the sheet check ------------------------------------------------------------
$("#s-go").addEventListener("click", () => {
  const names = $("#s-lines").value.split("\n").map((s) => s.trim()).filter(Boolean);
  const box = $("#s-result");
  box.hidden = false;
  if (names.length < 2) {
    box.innerHTML = '<div class="hit none">Write at least two medicines, one per line.</div>';
    return;
  }
  const hits = checkInteractions(names);
  box.innerHTML = hits.length
    ? '<div class="hit count">' + names.length + " medicines on the sheet, " + hits.length +
      " interaction(s) found:</div>" + hits.map(hitHTML).join("")
    : '<div class="hit ok">' + names.length +
      " medicines on the sheet - no known interaction in this table.</div>";
});

// ---- the full table -------------------------------------------------------------
function renderTable() {
  const q = String(($("#rec-search") || {}).value || "").trim().toLowerCase();
  const rows = !q ? DRUG_INTERACTIONS : DRUG_INTERACTIONS.filter((r) =>
    r.slice(0, 5).some((v) => String(v || "").toLowerCase().includes(q)));
  const sorted = rows.slice().sort((x, y) => ORDER[x[2]] - ORDER[y[2]]);
  $("#t-card").hidden = sorted.length === 0;
  $("#t-body").innerHTML = sorted.map((r) => "<tr>" +
    '<td><span class="st ' + (CLS[r[2]] || "st-info") + '">' + esc(r[2]) + "</span></td>" +
    '<td class="c-name">' + esc(r[0]) + "</td>" +
    '<td class="c-name">' + esc(r[1]) + "</td>" +
    "<td>" + esc(r[3]) + "</td>" +
    "<td>" + esc(r[4]) + "</td></tr>").join("");
  $("#t-count").textContent = sorted.length + " of " + DRUG_INTERACTIONS.length +
    " pairs in the table - the same data every prescribing and dispensing page checks.";
}

$("#rec-search").addEventListener("input", renderTable);
renderTable();
bootDone();

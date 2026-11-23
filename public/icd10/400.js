
import { requireAuth, ICD10_CODES, ICD10_CHAPTERS } from "/sidebar.js";

window.__p00.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function herr(e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p00) window.__p00.errs.push(String(code));
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "The catalogue could not open \u2014 " + code;
}
function bootDone() {
  if (window.__p00) window.__p00.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p00.auth = true; }
catch (e) { herr(e); throw e; }

// ---- catalogue ---------------------------------------------------------------
$("#d-codes").textContent = String(ICD10_CODES.length);
$("#d-chapters").textContent = String(ICD10_CHAPTERS.length);

const q = $("#q"), qCh = $("#q-chapters");

function matchRow(kind, code, title, needle) {
  return code.toLowerCase().includes(needle) || title.toLowerCase().includes(needle);
}

function visibleRows() {
  const needle = String(q.value || "").trim().toLowerCase();
  const rows = [];
  if (qCh.checked) {
    for (const [range, title] of ICD10_CHAPTERS) {
      if (!needle || matchRow("chapter", range, title, needle))
        rows.push(["chapter", range, title]);
    }
  }
  for (const [code, title] of ICD10_CODES) {
    if (!needle || matchRow("code", code, title, needle))
      rows.push(["code", code, title]);
  }
  return rows;
}

function render() {
  const rows = visibleRows();
  $("#d-found").textContent = String(rows.length);
  const has = rows.length > 0;
  $("#t-card").hidden = !has;
  $("#t-empty").hidden = has;
  $("#t-body").innerHTML = rows.map(([kind, code, title]) =>
    "<tr" + (kind === "chapter" ? ' class="ch-row"' : "") + ">" +
    '<td class="c-code' + (kind === "chapter" ? " is-ch" : "") + '">' + esc(code) + "</td>" +
    '<td class="c-title">' + esc(title) + "</td>" +
    '<td class="c-kind"><span class="st ' + (kind === "chapter" ? "st-ch" : "st-code") + '">' +
    (kind === "chapter" ? "Chapter" : "Code") + "</span></td>" +
    '<td class="c-act"><button type="button" class="mini-btn" data-copy="' + esc(code) +
    '" data-both="' + esc(code + " \u2014 " + title) + '">Copy</button></td>' +
    "</tr>").join("");
  $("#t-count").textContent = has
    ? rows.length + " row(s)" + (String(q.value || "").trim() ? " matching '" + q.value.trim() + "'" : " - the whole catalogue") + "."
    : "";
}

q.addEventListener("input", render);
qCh.addEventListener("change", render);

// copy to clipboard - the code alone; hold nothing else
$("#t-body").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  const code = btn.getAttribute("data-copy");
  const done = () => {
    btn.textContent = "Copied";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 1200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(done).catch(() => {
      window.prompt("Copy the code:", code); done();
    });
  } else { window.prompt("Copy the code:", code); done(); }
});

render();
bootDone();

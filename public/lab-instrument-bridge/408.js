
import { requireAuth, db, collection, doc, updateDoc, onSnapshot,
         watchHealthPatients, patientById } from "/sidebar.js";

window.__p08.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p08) window.__p08.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
}
function bootDone() {
  if (window.__p08) window.__p08.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p08.auth = true; }
catch (e) { herr("the sign-in check", e); throw e; }

const who = (p) => (p && p.isUnidentified) ? "Unidentified" : ((p && p.fullName) || "Unnamed");
const CLOSED = new Set(["Completed", "Cancelled"]);

// live requests + patients: the two registries a parsed line is judged against
let REQ = [];
let PARSED = [];   // { regId, test, result, unit, refRange, flag, matchIdx|null, why }

onSnapshot(collection(db, "healthLabRequests"), (snap) => {
  REQ = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .filter((r) => !CLOSED.has(String(r.status || "")));
  if (PARSED.length) paintMatches();
}, (e) => herr("healthLabRequests", e));
window.__p08.listeners = 1;
watchHealthPatients(() => { if (PARSED.length) paintMatches(); });

// ---- parsers --------------------------------------------------------------------
function splitHL7(line) { return line.split("|"); }
function hl7Field(seg, i) { return (seg[i] || "").replace(/\^~\&/g, "").replace(/\^/g, " ").trim(); }

function parseHL7(text) {
  const out = [];
  let regId = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const seg = splitHL7(line);
    const t = seg[0];
    if (t === "PID") {
      regId = (seg[3] || "").split("^")[0].trim() || (seg[2] || "").split("^")[0].trim();
    } else if (t === "OBX") {
      // OBX-3 components are ^code^name^system^... - the readable name is
      // the second component when present, otherwise the whole field.
      const parts = (seg[3] || "").split("^").filter(Boolean);
      const test = (parts.length >= 2 ? parts[1] : parts[0]) || "";
      const result = (seg[5] || "").replace(/\^/g, " ").trim();
      if (test && result) out.push({ regId, test, result,
        unit: (seg[6] || "").replace(/\^/g, " ").trim(),
        refRange: (seg[7] || "").replace(/\^/g, " ").trim(),
        flag: (seg[8] || "").trim() });
    }
  }
  return out;
}

function parseASTM(text) {
  const out = [];
  let regId = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const t = line[0];
    const f = line.split("|");
    if (t === "P") {
      regId = ((f[2] || f[3] || "").replace(/\^/g, " ").trim());
    } else if (t === "R") {
      const idPart = (f[2] || "").split("\\" ).pop().split("^").filter(Boolean);
      const test = idPart[idPart.length - 1] || "";
      const result = (f[3] || "").replace(/\^/g, " ").trim();
      if (test && result) out.push({ regId, test, result,
        unit: (f[4] || "").replace(/\^/g, " ").trim(),
        refRange: (f[5] || "").replace(/\^/g, " ").trim(),
        flag: (f[6] || "").trim() });
    }
  }
  return out;
}

function parseCSV(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (!cells[0]) continue;
    if (/^reg ?id$/i.test(cells[0])) continue;   // header row
    if (cells.length < 3) continue;
    out.push({ regId: cells[0], test: cells[1], result: cells[2],
      unit: cells[3] || "", refRange: cells[4] || "", flag: cells[5] || "" });
  }
  return out;
}

function parseText(text) {
  const head = text.slice(0, 200);
  if (/\bMSH\b/.test(text) || (head.includes("|") && /OBX/.test(text))) return parseHL7(text);
  if (/^\s*[PQRIO]\|/m.test(text)) return parseASTM(text);
  return parseCSV(text);
}

// ---- matching -------------------------------------------------------------------
const normTest = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
function findMatch(regId, test) {
  const want = normTest(test);
  const req = REQ.find((r) => String(r.regId || "") === String(regId || ""));
  if (!req) return { req: null, why: "no open request with this Registration ID" };
  const idx = (req.tests || []).findIndex((t) => {
    const a = normTest(t.name);
    if (!a) return false;
    return a === want || a.includes(want) || want.includes(a);
  });
  if (idx < 0) return { req: null, why: "request exists but has no test named '" + test + "'" };
  if (String((req.tests[idx] || {}).status) === "Completed")
    return { req: null, why: "that test is already Completed on " + (req.ref || "the request") };
  return { req, idx, why: (req.ref || "") + " \u00b7 " + ((req.tests || [])[idx] || {}).name };
}

function paintMatches() {
  const body = $("#p-body");
  let matched = 0;
  body.innerHTML = PARSED.map((r, i) => {
    const m = findMatch(r.regId, r.test);
    r.matchIdx = m.req ? m.idx : null;
    r.matchReqId = m.req ? m.req.__id : null;
    if (m.req) matched++;
    const p = patientById(r.regId);
    return "<tr>" +
      '<td class="c-code">' + esc(r.regId || "—") + "</td>" +
      '<td class="c-name">' + (p ? esc(who(p)) : '<span class="unres">not registered</span>') + "</td>" +
      "<td>" + esc(r.test) + "</td>" +
      "<td><b>" + esc(r.result) + "</b></td>" +
      "<td>" + esc(r.unit || "—") + "</td>" +
      "<td>" + esc(r.refRange || "—") + "</td>" +
      '<td>' + (r.flag ? '<span class="st st-bad">' + esc(r.flag) + "</span>" : "—") + "</td>" +
      "<td>" + (m.req ? '<span class="st st-clinical">' + esc(m.why) + "</span>"
                     : '<span class="unres">' + esc(m.why) + "</span>") + "</td></tr>";
  }).join("");
  $("#p-count").textContent = PARSED.length + " line(s) parsed, " + matched +
    " matched to open requests - only matched lines are accepted.";
  $("#p-accept").disabled = matched === 0;
}

function showParsed(rows, source) {
  PARSED = rows;
  $("#p-card").hidden = rows.length === 0;
  $("#p-title").textContent = source;
  if (!rows.length) {
    iFail("Nothing usable in " + source + " - expected CSV (regId,test,result,unit,refRange), HL7 ORU or ASTM-style lines.");
    return;
  }
  iOk("");
  paintMatches();
}

function iFail(msg) { const e = $("#i-err"); e.hidden = !msg; e.textContent = msg; }
function iOk(msg) { const o = $("#i-ok"); o.hidden = !msg; o.textContent = msg; }

$("#i-parse").addEventListener("click", () => {
  const text = $("#i-paste").value;
  if (!text.trim()) { iFail("Paste the instrument text first."); return; }
  iFail("");
  showParsed(parseText(text), "pasted text");
});

$("#i-file").addEventListener("change", () => {
  const f = ($("#i-file").files || [])[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => showParsed(parseText(String(reader.result || "")), f.name);
  reader.onerror = () => iFail("The file could not be read.");
  reader.readAsText(f);
});

$("#p-clear").addEventListener("click", () => {
  PARSED = [];
  $("#p-card").hidden = true;
  iFail(""); iOk("");
});

// ---- accept: write the results into the real workbench records --------------------
$("#p-accept").addEventListener("click", async () => {
  const rows = PARSED.filter((r) => r.matchReqId != null);
  if (!rows.length) return;
  $("#p-err").hidden = true;
  const btn = $("#p-accept");
  btn.disabled = true; btn.textContent = "Writing\u2026";
  const done = [];
  try {
    // group by request so every request is updated once with its new tests array
    const byReq = new Map();
    for (const r of rows) {
      const key = r.matchReqId;
      if (!byReq.has(key)) byReq.set(key, { req: REQ.find((x) => x.__id === key), rows: [] });
      byReq.get(key).rows.push(r);
    }
    const at = new Date().toISOString();
    for (const [key, group] of byReq) {
      const req = group.req;
      if (!req) continue;
      const staff = "instrument bridge";
      const tests = (req.tests || []).map((t, j) => {
        const hit = group.rows.find((r) => r.matchIdx === j);
        if (!hit) return t;
        return Object.assign({}, t, {
          status: "Completed", result: hit.result,
          unit: hit.unit || t.unit || "", refRange: hit.refRange || t.refRange || "",
          abnormal: /A|H|L|abnorm/i.test(hit.flag || ""),
          critical: /C(ritical)?|VL/i.test(hit.flag || ""),
          enteredBy: staff + " (page 408)", enteredAt: at
        });
      });
      const allDone = tests.length > 0 && tests.every((t) => String(t.status) === "Completed");
      await updateDoc(doc(db, "healthLabRequests", key), {
        tests,
        status: allDone ? "Completed" : String(req.status || ""),
        completedAt: allDone ? at : (req.completedAt || ""),
        updatedAt: at,
        statusHistory: (req.statusHistory || []).concat(allDone
          ? [{ status: "Completed", at, by: "instrument bridge (page 408)", note: "results arrived from the analyser file" }]
          : [])
      });
      done.push(group.rows.length);
    }
    iOk(done.reduce((s, n) => s + n, 0) + " result(s) written into the lab workbench - the requesting clinicians see them immediately.");
    PARSED = [];
    $("#p-card").hidden = true;
  } catch (e) {
    $("#p-err").hidden = false;
    $("#p-err").textContent = "Write failed: " + ((e && (e.code || e.message)) || e);
  } finally {
    btn.disabled = false; btn.textContent = "Accept the matched results";
  }
});

// ---- export ORU -------------------------------------------------------------------
$("#e-from").value = new Date().toISOString().slice(0, 10);
$("#e-to").value = new Date().toISOString().slice(0, 10);

$("#e-go").addEventListener("click", () => {
  const from = $("#e-from").value, to = $("#e-to").value;
  if (!from || !to) { $("#e-count").textContent = "Pick both days first."; return; }
  const inRange = (r) => {
    const d = String(r.completedAt || r.updatedAt || "").slice(0, 10);
    return d >= from && d <= to;
  };
  const reqs = REQ.concat([]);   // open ones only in this listener; completed come from the full list below
  const body = [];
  let n = 0, setId = 1;
  const stamp = (d) => String(d || "").replace(/[-:T]/g, "").slice(0, 14);
  const emit = (r) => {
    const p = patientById(r.regId);
    const now = stamp(new Date().toISOString());
    body.push("MSH|^~\\&|JAMALI|LAB|CONNECTED|SYSTEM|" + now + "||ORU^R01|" + (setId++) + "|P|2.5.1");
    body.push("PID|1||" + (r.regId || "") + "||" + (p ? who(p).toUpperCase() : ""));
    for (const t of (r.tests || [])) {
      if (String(t.status) !== "Completed" || !String(t.result || "").trim()) continue;
      body.push("OBX|1|ST|" + (t.name || "TEST") + "||" + t.result + "|" + (t.unit || "") +
        "|" + (t.refRange || "") + "|" + (t.critical ? "C" : (t.abnormal ? "A" : "N")) +
        "|||F|||" + stamp(t.enteredAt || r.completedAt) + "|||2020001|||" + (r.ref || ""));
      n++;
    }
  };
  // completed requests: a one-shot read beyond the live open list
  import("/sidebar.js").then(async (m) => {
    try {
      const snap = await m.getDocs(m.collection(m.db, "healthLabRequests"));
      const all = snap.docs.map((d) => d.data())
        .filter((r) => String(r.status) === "Completed" && inRange(r) && String(r.regId || "").trim());
      $("#e-count").textContent = all.length + " completed request(s) in range.";
      if (!all.length) return;
      for (const r of all) emit(r);
      const blob = new Blob([body.join("\r\n")], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "jamali-oru-" + from + "-" + to + ".hl7";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    } catch (e) {
      $("#e-count").textContent = "Read failed: " + ((e && (e.code || e.message)) || e);
    }
  });
});

bootDone();

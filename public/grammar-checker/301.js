 
(function () {
"use strict";
  function $(id) { return document.getElementById(id); }
  function st(msg, cls) { var el = $("t-msg"); if (!el) return;
    el.textContent = msg; el.className = "t-msg" + (cls ? " " + cls : ""); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fb(n) { var u = ["B", "KB", "MB", "GB", "TB"], i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i ? n.toFixed(n < 10 ? 2 : 1) : n) + " " + u[i]; }
  function dl(blob, name) { var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function ab(file) { return new Promise(function (res, rej) { var r = new FileReader();
    r.onload = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    r.readAsArrayBuffer(file); }); }
  function rtxt(file) { return new Promise(function (res, rej) { var r = new FileReader();
    r.onload = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    r.readAsText(file); }); }
  function oneFile(inputId) { var f = $(inputId).files[0];
    if (!f) { st("Choose a file first.", "warn"); return null; } return f; }
  function allFiles(inputId) { var f = $(inputId).files;
    if (!f.length) { st("Choose at least one file.", "warn"); return null; } return f; }
  function libFail(name) { st("This tool's engine library (" + name +
    ") loads from the internet and could not be reached. Reconnect and reload the page.", "warn"); }
  function u8(abuf) { return new Uint8Array(abuf); }

  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Type some text first.", "warn"); return; }
    var f = [];
    if (/\b(\w+)\s+\1\b/i.test(t)) f.push("Doubled words: " + (t.match(/\b(\w+)\s+\1\b/gi) || []).join("; "));
    if (/ {2,}/.test(t)) f.push("Double spaces found (" + (t.match(/ {2,}/g) || []).length + " place(s)).");
    if (/\s+[,.;:!?]/.test(t)) f.push("Space before punctuation found.");
    if (/[,;:]\S/.test(t)) f.push("Missing space after punctuation (e.g. 'word,word').");
    var an = t.match(/\ba\s+[aeiou]\w*/gi) || [];
    if (an.length) f.push("Possible a/an issues: " + an.join("; "));
    var ai = t.match(/\ban\s+[^aeiou\s]\w*/gi) || [];
    if (ai.length) f.push("Possible an/a issues: " + ai.join("; "));
    var low = t.match(/(^|[.!?]\s+)([a-z])/g) || [];
    if (low.length) f.push(low.length + " sentence(s) may not start with a capital letter.");
    if (/!!!+|\?\?\?+/.test(t)) f.push("Repeated punctuation (!!! / ???) — consider one mark in formal text.");
    if (/\bi\b/.test(t)) f.push("Lowercase standalone 'i' — should be 'I'.");
    $("out").value = f.length ? f.join("\n") : "No obvious issues found. (Rule-based heuristics — not a full grammar engine.)";
    st(f.length + " finding(s).", f.length ? "warn" : "ok");
  };

})();

/* JAMALI — page 254 · SQL Formatter — the tool's own engine.
   Convertor tool #190 (Web and Code Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   major clauses on their own lines, keywords uppercased, indents*/
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

  var DL_NAME = "formatted.sql";
  $("copy").onclick = function () {
    var t = $("out").value; if (!t) { st("Nothing to copy yet.", "warn"); return; }
    navigator.clipboard && navigator.clipboard.writeText(t).then(function () { st("Copied to the clipboard.", "ok"); },
      function () { $("out").select(); document.execCommand("copy"); st("Copied.", "ok"); });
  };
  $("dl-txt").onclick = function () {
    var t = $("out").value; if (!t) { st("Nothing to download yet.", "warn"); return; }
    dl(new Blob([t], { type: "text/plain;charset=utf-8" }), DL_NAME);
    st("Saved " + DL_NAME + " (" + fb(t.length) + " of text).", "ok");
  };

    var KW = ["SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "AS", "JOIN", "LEFT", "RIGHT",
      "INNER", "OUTER", "FULL", "ON", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET",
      "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM", "UNION", "CASE", "WHEN", "THEN", "ELSE", "END"];
  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste some SQL first.", "warn"); return; }
    var s = t.replace(/\s+/g, " ").trim();
    KW.sort(function (a, b) { return b.length - a.length; }).forEach(function (k) {
      s = s.replace(new RegExp("\\b" + k.replace(/ /g, "\\s+") + "\\b", "gi"), k);
    });
    var lines = [], depth = 0;
    s.split(" ").join(" ");
    ["SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET", "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM"].forEach(function () {});
    var out = s
      .replace(/\bFROM\b/g, "\nFROM").replace(/\bWHERE\b/g, "\nWHERE")
      .replace(/\bLEFT JOIN\b/g, "\nLEFT JOIN").replace(/\bRIGHT JOIN\b/g, "\nRIGHT JOIN")
      .replace(/\bINNER JOIN\b/g, "\nINNER JOIN").replace(/\bOUTER JOIN\b/g, "\nOUTER JOIN")
      .replace(/\bJOIN\b/g, "\nJOIN").replace(/\bGROUP BY\b/g, "\nGROUP BY")
      .replace(/\bORDER BY\b/g, "\nORDER BY").replace(/\bHAVING\b/g, "\nHAVING")
      .replace(/\bLIMIT\b/g, "\nLIMIT").replace(/\bVALUES\b/g, "\nVALUES")
      .replace(/\bAND\b/g, "\n  AND").replace(/\bOR\b/g, "\n  OR")
      .replace(/,\s*(?=[A-Za-z"*'])/g, ",\n       ");
    $("out").value = out;
    st("Formatted (" + out.split("\n").length + " lines).", "ok");
  };

})();

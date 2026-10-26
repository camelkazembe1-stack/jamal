/* JAMALI — page 319 · CSV Validator — the tool's own engine.
   Convertor tool #255 (Number and Data Formats). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   column consistency, quoting, empty rows — a structural report*/
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

    function parseCsv(text, delim) {
      var rows = [[]], f = "", q = false;
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
        else if (ch === '"') q = true;
        else if (ch === delim) { rows[rows.length - 1].push(f); f = ""; }
        else if (ch === "\n" || ch === "\r") {
          if (ch === "\r" && text[i + 1] === "\n") i++;
          rows[rows.length - 1].push(f); f = ""; rows.push([]);
        } else f += ch;
      }
      rows[rows.length - 1].push(f);
      while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") rows.pop();
      return rows;
    }

  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste some CSV first.", "warn"); return; }
    var delim = t.split("\n")[0].indexOf(";") > -1 && t.split("\n")[0].indexOf(",") === -1 ? ";" : ",";
    var rows = parseCsv(t, delim);
    var issues = [];
    var widths = {};
    rows.forEach(function (r, i) { widths[r.length] = (widths[r.length] || 0) + 1; });
    var common = +Object.keys(widths).sort(function (a, b) { return widths[b] - widths[a]; })[0];
    rows.forEach(function (r, i) {
      if (r.length !== common) issues.push("Row " + (i + 1) + " has " + r.length + " fields (expected " + common + ")");
      if (r.every(function (c) { return !c.trim(); })) issues.push("Row " + (i + 1) + " is empty");
    });
    if ((t.match(/"/g) || []).length % 2) issues.push("Odd number of quotes — check quoting");
    var out = "Rows: " + rows.length + "\nColumns: " + common +
      "\nDelimiter detected: " + (delim === ";" ? "semicolon" : "comma") +
      "\n" + (issues.length ? "\nISSUES:\n" + issues.slice(0, 20).join("\n") : "\nNo structural issues found.");
    $("out").value = out;
    st(issues.length ? issues.length + " issue(s)." : "CSV looks structurally sound.", issues.length ? "warn" : "ok");
  };

})();

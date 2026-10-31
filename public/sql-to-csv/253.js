 
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

  var DL_NAME = "data.csv";
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

    function csvCell(v) {
      v = v == null ? "" : String(v);
      if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
      return v;
    }
    function parseValues(s) {
      var vals = [], cur = "", q = false, i = 0;
      while (i < s.length) {
        var ch = s[i];
        if (q) {
          if (ch === "'") { if (s[i + 1] === "'") { cur += "'"; i++; } else q = false; }
          else cur += ch;
        } else if (ch === "'") q = true;
        else if (ch === ",") { vals.push(cur.trim()); cur = ""; }
        else if (ch === ")") break;
        else cur += ch;
        i++;
      }
      vals.push(cur.trim());
      return vals;
    }
  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste the INSERT statements first.", "warn"); return; }
    var re = /INSERT\s+INTO\s+([A-Za-z0-9_.]+)\s*\(([^)]*)\)\s*VALUES\s*\(([^]*?)\);/gi;
    var m, rows = [], cols = null, tbl = "";
    while ((m = re.exec(t))) {
      if (!tbl) tbl = m[1];
      if (!cols) cols = m[2].split(",").map(function (c) { return c.trim(); });
      rows.push(parseValues(m[3]));
    }
    if (!rows.length) { st("No INSERT statements found.", "warn"); return; }
    var out = cols.join(",") + "\n" + rows.map(function (r) { return r.map(csvCell).join(","); }).join("\n");
    $("out").value = out;
    st(rows.length + " row(s) from " + tbl + ".", "ok");
  };

})();

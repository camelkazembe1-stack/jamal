/* JAMALI — page 274 · File Size Converter — the tool's own engine.
   Convertor tool #210 (File Utilities). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   bytes ↔ KB ↔ MB ↔ GB ↔ TB, decimal and binary*/
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
    var v = +$("v").value;
    if (isNaN(v)) { st("Enter a number.", "warn"); return; }
    var units = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12 };
    var bin = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
    var bytes = v * units[$("u").value];
    var rows = [];
    ["B", "KB", "MB", "GB", "TB"].forEach(function (u) {
      rows.push([u + " (decimal)", (bytes / units[u]).toLocaleString(undefined, { maximumFractionDigits: 4 })]);
      rows.push([u + " (binary)", (bytes / bin[u]).toLocaleString(undefined, { maximumFractionDigits: 4 })]);
    });
    var kv = $("kv");
    kv.innerHTML = rows.map(function (r) { return "<tr><th>" + r[0] + "</th><td><b>" + r[1] + "</b></td></tr>"; }).join("");
    kv.hidden = false;
    st("Both conventions shown (1 kB = 1000 B vs 1 KiB = 1024 B).", "ok");
  };

})();

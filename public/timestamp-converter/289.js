/* JAMALI — page 289 · Timestamp Converter — the tool's own engine.
   Convertor tool #225 (File Utilities). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   unix seconds/millis ↔ dates in UTC, local and ISO*/
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


  function show(d) {
    var rows = [
      ["ISO 8601 (UTC)", d.toISOString()],
      ["UTC string", d.toUTCString()],
      ["Local", d.toLocaleString()],
      ["Unix seconds", Math.floor(d.getTime() / 1000).toLocaleString()],
      ["Unix milliseconds", d.getTime().toLocaleString()],
      ["Relative", rel(d)],
    ];
    var kv = $("kv");
    kv.innerHTML = rows.map(function (r) { return "<tr><th>" + esc(r[0]) + "</th><td><b>" + esc(r[1]) + "</b></td></tr>"; }).join("");
    kv.hidden = false;
  }
  function rel(d) {
    var s = (Date.now() - d.getTime()) / 1000, a = Math.abs(s);
    var u = a < 60 ? Math.round(a) + " seconds" : a < 3600 ? Math.round(a / 60) + " minutes" :
      a < 86400 ? Math.round(a / 3600) + " hours" : Math.round(a / 86400) + " days";
    return s >= 0 ? u + " ago" : "in " + u;
  }
  $("now").onclick = function () { show(new Date()); $("ts").value = Math.floor(Date.now() / 1000); st("Current moment loaded.", "ok"); };
  $("run-ts").onclick = function () {
    var v = +$("ts").value;
    if (isNaN(v)) { st("Enter a timestamp number first.", "warn"); return; }
    var ms = $("unit").value === "ms" ? v : v * 1000;
    var d = new Date(ms);
    if (isNaN(d.getTime())) { st("That timestamp is out of range.", "err"); return; }
    show(d); st("Converted.", "ok");
  };
  $("run-dt").onclick = function () {
    if (!$("dt").value) { st("Pick a date/time first.", "warn"); return; }
    show(new Date($("dt").value)); st("Converted.", "ok");
  };

})();

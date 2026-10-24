/* JAMALI — page 307 · Unix Timestamp Converter — the tool's own engine.
   Convertor tool #243 (Number and Data Formats). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   seconds/millis ↔ readable dates, with the live current time*/
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


  $("now").onclick = function () {
    $("ts").value = Math.floor(Date.now() / 1000);
    $("unit").value = "s";
    st("Current second inserted.");
  };
  $("run").onclick = function () {
    var v = +$("ts").value;
    if (isNaN(v)) { st("Enter a number.", "warn"); return; }
    var d = new Date($("unit").value === "ms" ? v : v * 1000);
    if (isNaN(d.getTime())) { st("Out of range.", "err"); return; }
    var rows = [
      ["ISO 8601", d.toISOString()], ["UTC", d.toUTCString()], ["Local", d.toLocaleString()],
      ["Seconds", Math.floor(d.getTime() / 1000).toLocaleString()], ["Millis", d.getTime().toLocaleString()],
    ];
    var kv = $("kv");
    kv.innerHTML = rows.map(function (r) { return "<tr><th>" + esc(r[0]) + "</th><td><b>" + esc(r[1]) + "</b></td></tr>"; }).join("");
    kv.hidden = false;
    st("Converted.", "ok");
  };

})();

/* JAMALI — page 305 · Date Format Converter — the tool's own engine.
   Convertor tool #241 (Number and Data Formats). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   one date -> ISO, US, EU, long form, week number and relative*/
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
    if (!$("d").value) { st("Pick a date first.", "warn"); return; }
    var d = new Date($("d").value + "T" + ($("t").value || "00:00"));
    if (isNaN(d.getTime())) { st("Invalid date.", "err"); return; }
    function pad(n) { return String(n).padStart(2, "0"); }
    function week(d) {
      var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      var day = t.getUTCDay() || 7;
      t.setUTCDate(t.getUTCDate() + 4 - day);
      var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
      return Math.ceil((((t - y0) / 86400000) + 1) / 7);
    }
    var rows = [
      ["ISO 8601", d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())],
      ["US style", pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + "/" + d.getFullYear()],
      ["EU style", pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear()],
      ["Long form", d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
      ["With time", d.toLocaleString()],
      ["Day of week", d.toLocaleDateString(undefined, { weekday: "long" })],
      ["Week number", "W" + week(d)],
      ["Day of year", Math.ceil((d - new Date(d.getFullYear(), 0, 0)) / 86400000)],
    ];
    var kv = $("kv");
    kv.innerHTML = rows.map(function (r) { return "<tr><th>" + esc(r[0]) + "</th><td><b>" + esc(r[1]) + "</b></td></tr>"; }).join("");
    kv.hidden = false;
    st("Converted.", "ok");
  };

})();

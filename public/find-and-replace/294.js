/* JAMALI — page 294 · Find and Replace — the tool's own engine.
   Convertor tool #230 (Document and Office Utilities). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   literal or regex replace, case flag, live match count*/
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

  function buildRe() {
    var f = $("find").value;
    if (!f) return null;
    try {
      return $("re").checked ? new RegExp(f, "g" + ($("ci").checked ? "i" : ""))
        : new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g" + ($("ci").checked ? "i" : ""));
    } catch (e) { st("Bad pattern: " + e.message, "err"); return null; }
  }
  $("run").onclick = function () {
    var re = buildRe(); if (!re) { st("Enter something to find.", "warn"); return; }
    var t = $("in").value;
    var n = (t.match(re) || []).length;
    $("out").value = t.replace(re, $("rep").value);
    st(n + " match(es) replaced.", "ok");
  };
  $("find").addEventListener("input", function () {
    var re = buildRe();
    if (re) { var n = ($("in").value.match(re) || []).length; st(n + " match(es) found."); }
  });

})();

 
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
    if (!t.trim()) { st("Paste some JSON first.", "warn"); return; }
    try {
      var v = JSON.parse(t);
      var desc = Array.isArray(v) ? "array of " + v.length : v === null ? "null" : typeof v === "object" ? "object with " + Object.keys(v).length + " keys" : typeof v;
      $("out").value = "VALID JSON \u2014 " + desc + ". Size: " + fb(t.length) + ".";
      st("Valid.", "ok");
    } catch (e) {
      var m = e.message, pos = (m.match(/position (\d+)/) || [])[1];
      var ctx = "";
      if (pos !== undefined) {
        var p = +pos;
        ctx = "\n\nNear: \"" + t.slice(Math.max(0, p - 20), p) + "◈" + t.slice(p, p + 20) + "\"";
      }
      $("out").value = "INVALID \u2014 " + m + ctx;
      st("Invalid JSON.", "err");
    }
  };

})();

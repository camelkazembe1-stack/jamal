 
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


  $("r24").onclick = function () {
    var m = $("t24").value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) { st("Use HH:MM.", "warn"); return; }
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) { st("Out of range.", "err"); return; }
    var ap = h >= 12 ? "PM" : "AM";
    var h12 = h % 12 || 12;
    $("out").value = h12 + ":" + String(mi).padStart(2, "0") + " " + ap;
    st("Converted.", "ok");
  };
  $("r12").onclick = function () {
    var m = $("t12").value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) { st("Use H:MM AM/PM.", "warn"); return; }
    var h = +m[1] % 12, mi = +m[2];
    if (m[3].toUpperCase() === "PM") h += 12;
    $("out").value = String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0");
    st("Converted.", "ok");
  };

})();

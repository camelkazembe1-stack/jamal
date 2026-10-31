 
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
    var v = $("in").value.trim();
    if (!v) { st("Enter a number or a roman numeral.", "warn"); return; }
    if (/^\d+$/.test(v)) {
      var n = +v;
      if (n < 1 || n > 3999) { st("Use 1-3999.", "warn"); return; }
      var map = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
        [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
      var out = "";
      map.forEach(function (m) { while (n >= m[0]) { out += m[1]; n -= m[0]; } });
      $("out").value = out;
      st("Roman numeral.", "ok");
    } else if (/^[MDCLXVI]+$/i.test(v)) {
      var vals = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      var s = v.toUpperCase(), total = 0;
      for (var i = 0; i < s.length; i++) {
        var c = vals[s[i]], nx = vals[s[i + 1]] || 0;
        total += c < nx ? -c : c;
      }
      $("out").value = total.toLocaleString() + "  (" + total + ")";
      st("Number.", "ok");
    } else st("Not a number and not a roman numeral.", "err");
  };

})();

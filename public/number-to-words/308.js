/* JAMALI — page 308 · Number to Words — the tool's own engine.
   Convertor tool #244 (Number and Data Formats). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   English words up to trillions (negative and decimals handled)*/
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

    var ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
      "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
    var TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
    var GROUPS = ["", " thousand", " million", " billion", " trillion"];
    function u3(n) {
      var s = "";
      if (n >= 100) { s += ONES[Math.floor(n / 100)] + " hundred"; n %= 100; if (n) s += " "; }
      if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += "-" + ONES[n % 10]; }
      else if (n) s += ONES[n];
      return s;
    }
    function words(n) {
      if (n === 0) return "zero";
      var out = "", g = 0;
      while (n > 0) {
        var c = n % 1000;
        if (c) out = u3(c) + GROUPS[g] + (out ? " " + out : "");
        n = Math.floor(n / 1000); g++;
      }
      return out;
    }

  $("run").onclick = function () {
    var v = $("in").value.trim().replace(/,/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(v)) { st("Enter a plain number (e.g. 1234 or -12.5).", "warn"); return; }
    var neg = v[0] === "-";
    var parts = v.replace(/^-/, "").split(".");
    var intPart = +parts[0];
    var out = (neg ? "minus " : "") + words(intPart);
    if (parts[1]) {
      out += " point";
      parts[1].split("").forEach(function (d) { out += " " + (d === "0" ? "zero" : ONES[+d]); });
    }
    $("out").value = out.charAt(0).toUpperCase() + out.slice(1);
    st("Converted.", "ok");
  };

})();

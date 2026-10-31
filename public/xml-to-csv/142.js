 
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

    function csvCell(v) {
      v = v == null ? "" : String(v);
      if (/[",\n\r]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
      return v;
    }

  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste some XML first.", "warn"); return; }
    var doc = new DOMParser().parseFromString(t, "application/xml");
    if (doc.querySelector("parsererror")) { st("Malformed XML: " + doc.querySelector("parsererror").textContent.split("\n")[0], "err"); return; }
    var root = doc.documentElement;
    var kids = Array.prototype.filter.call(root.children, function (el) { return el.nodeType === 1; });
    var groups = {};
    kids.forEach(function (el) { (groups[el.nodeName] = groups[el.nodeName] || []).push(el); });
    var gname = Object.keys(groups).sort(function (a, b) { return groups[b].length - groups[a].length; })[0];
    var records = gname ? groups[gname] : kids;
    var cols = [];
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.children, function (c) { if (cols.indexOf(c.nodeName) < 0) cols.push(c.nodeName); });
    });
    if (!records.length) { st("No repeating records found — expected a structure like <records><row>…</row></records>.", "warn"); return; }
    var out = cols.map(function (c) { return csvCell(c); }).join(",");
    records.forEach(function (r) {
      out += "\n" + cols.map(function (c) {
        var el = r.getElementsByTagName(c)[0];
        return csvCell(el ? el.textContent.trim() : "");
      }).join(",");
    });
    $("out").value = out;
    st(records.length + " records · " + cols.length + " columns (from <" + gname + ">).", "ok");
  };

})();

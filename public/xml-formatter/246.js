/* JAMALI — page 246 · XML Formatter — the tool's own engine.
   Convertor tool #182 (Web and Code Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   indentation rebuilt from the tag tree, text nodes preserved*/
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

  var DL_NAME = "formatted.xml";
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

  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste some XML first.", "warn"); return; }
    var doc = new DOMParser().parseFromString(t, "application/xml");
    if (doc.querySelector("parsererror")) { st("Malformed XML: " + doc.querySelector("parsererror").textContent.split("\n")[0], "err"); return; }
    var out = ['<?xml version="1.0" encoding="UTF-8"?>'];
    (function walk(node, depth) {
      Array.prototype.forEach.call(node.childNodes, function (ch) {
        if (ch.nodeType === 3 || ch.nodeType === 4) {
          var v = ch.nodeValue.trim();
          if (v) out.push("  ".repeat(depth) + (ch.nodeType === 4 ? "<![CDATA[" + ch.nodeValue + "]]>" : esc(v)));
          return;
        }
        if (ch.nodeType !== 1 && ch.nodeType !== 7 && ch.nodeType !== 8) return;
        var pad = "  ".repeat(depth);
        if (ch.nodeType === 8) { out.push(pad + "<!--" + ch.nodeValue + "-->"); return; }
        if (ch.nodeType === 7) { out.push(pad + "<?" + ch.target + " " + ch.nodeValue + "?>"); return; }
        var name = ch.nodeName;
        var attrs = Array.prototype.map.call(ch.attributes || [], function (a) { return " " + a.name + '="' + esc(a.value) + '"'; }).join("");
        var kids = Array.prototype.filter.call(ch.childNodes, function (k) {
          return k.nodeType === 1 || ((k.nodeType === 3 || k.nodeType === 4) && k.nodeValue.trim());
        });
        if (!kids.length) out.push(pad + "<" + name + attrs + "/>");
        else if (kids.length === 1 && kids[0].nodeType === 3 && kids[0].nodeValue.trim().length < 60 && kids[0].nodeValue.indexOf("\n") < 0) {
          out.push(pad + "<" + name + attrs + ">" + esc(kids[0].nodeValue.trim()) + "</" + name + ">");
        } else {
          out.push(pad + "<" + name + attrs + ">");
          walk(ch, depth + 1);
          out.push(pad + "</" + name + ">");
        }
      });
    })(doc, 0);
    var s = out.join("\n");
    $("out").value = s;
    st("Formatted (" + fb(s.length) + ").", "ok");
  };

})();

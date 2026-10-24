/* JAMALI — page 251 · JSON to XML — the tool's own engine.
   Convertor tool #187 (Web and Code Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   @-keys become attributes, #text becomes the node text*/
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

  var DL_NAME = "data.xml";
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

    function json2xml(v, name, ind) {
      var pad = "  ".repeat(ind);
      if (Array.isArray(v)) return v.map(function (x) { return json2xml(x, name, ind); }).join("\n");
      if (v && typeof v === "object") {
        var attrs = "", inner = [], text = "";
        Object.keys(v).forEach(function (k) {
          if (k[0] === "@") attrs += " " + k.slice(1) + '="' + esc(v[k]) + '"';
          else if (k === "#text") text = esc(v[k]);
          else inner.push(json2xml(v[k], k, ind + 1));
        });
        var tag = name.replace(/[^A-Za-z0-9_.-]/g, "_").replace(/^([^A-Za-z_])/, "f$1") || "item";
        return pad + "<" + tag + attrs + ">" + (inner.length ? "\n" + inner.join("\n") + "\n" + pad : text) + "</" + tag + ">";
      }
      var tag2 = name.replace(/[^A-Za-z0-9_.-]/g, "_").replace(/^([^A-Za-z_])/, "f$1") || "item";
      return pad + "<" + tag2 + ">" + esc(v === null || v === undefined ? "" : v) + "</" + tag2 + ">";
    }
  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste some JSON first.", "warn"); return; }
    try {
      var v = JSON.parse(t);
      var root = Array.isArray(v) ? "items" : "root";
      var out = '<?xml version="1.0" encoding="UTF-8"?>\n' + json2xml(v, root, 0);
      $("out").value = out;
      st("XML ready.", "ok");
    } catch (e) { st("Invalid JSON: " + e.message, "err"); }
  };

})();

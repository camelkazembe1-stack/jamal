 
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

  var DL_NAME = "text.rtf";
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
    if (!t.trim()) { st("Type some text first.", "warn"); return; }
    var out = "{\\rtf1\ansi\deff0{\\fonttbl{\\f0 Calibri;}}\fs22";
    t.replace(/\r/g, "").split("\n").forEach(function (ln) {
      out += ln.replace(/[\\{}]/g, "\\$&").replace(/[\u0080-\uFFFF]/g, function (ch) {
        return "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0") + "?";
      }) + "\\par\n";
    });
    out += "}";
    $("out").value = out.length > 4000 ? out.slice(0, 4000) + "\n…" : out;
    dl(new Blob([out], { type: "application/rtf" }), DL_NAME);
    st("text.rtf created (" + fb(out.length) + ").", "ok");
  };

})();

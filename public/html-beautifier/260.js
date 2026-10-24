/* JAMALI — page 260 · HTML Beautifier — the tool's own engine.
   Convertor tool #196 (Web and Code Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   every tag on its own line, indented by depth*/
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

  var DL_NAME = "pretty.html";
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

    var VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste some HTML first.", "warn"); return; }
    var depth = 0, out = [];
    var tokens = t.replace(/>\s+</g, "><").split(/(?=<)|(?<=>)/g);
    tokens.forEach(function (tk) {
      tk = tk.trim();
      if (!tk) return;
      if (/^<\//.test(tk)) { depth = Math.max(0, depth - 1); out.push("  ".repeat(depth) + tk); }
      else if (/^<[a-zA-Z]/.test(tk)) {
        var tag = (tk.match(/^<([a-zA-Z0-9-]+)/) || [])[1] || "";
        var selfClose = tk.slice(-1) === "\/" || VOID.has(tag.toLowerCase());
        out.push("  ".repeat(depth) + tk);
        if (!selfClose) depth++;
      } else out.push("  ".repeat(depth) + tk);
    });
    $("out").value = out.join("\n");
    st("Beautified (" + out.length + " lines).", "ok");
  };

})();

/* JAMALI — page 73 · Markdown to PDF — the tool's own engine.
   Convertor tool #9 (Text Conversion Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   markdown is flattened to text, then typeset into a .pdf via jsPDF*/
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

  var DL_NAME = "document.pdf";
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
    function mdStrip(md) {
      return md
        .replace(/^```[a-zA-Z0-9-]*\n?/gm, "").replace(/\n?```$/gm, "")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^\s*>\s?/gm, "")
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/^\s*\d+\.\s+/gm, "")
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1 ($2)")
        .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, "$1$2")
        .replace(/__([^_]+)__/g, "$1").replace(/(^|\W)_([^_]+)_(?=\W|$)/g, "$1$2")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/^\s*([-*_]\s*){3,}$/gm, "")
        .replace(/\n{3,}/g, "\n\n").trim();
    }

  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste some markdown first.", "warn"); return; }
    if (!window.jspdf) { libFail("jsPDF"); return; }
    try {
      var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
      var lines = doc.splitTextToSize(mdStrip(t), 495);
      var y = 60;
      lines.forEach(function (ln) {
        if (y > 790) { doc.addPage(); y = 60; }
        doc.text(ln, 50, y); y += 17;
      });
      doc.save(DL_NAME);
      $("out").value = lines.slice(0, 40).join("\n") + (lines.length > 40 ? "\n…" : "");
      st("document.pdf created · " + doc.getNumberOfPages() + " page(s).", "ok");
    } catch (e) { st("Could not build the PDF: " + e.message, "err"); }
  };

})();

/* JAMALI — page 302 · Document Watermark — the tool's own engine.
   Convertor tool #238 (Document and Office Utilities). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   text -> PDF with a diagonal watermark behind the content*/
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

  var DL_NAME = "watermarked.pdf";
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
    if (!t.trim()) { st("Type the document text first.", "warn"); return; }
    if (!window.jspdf) { libFail("jsPDF"); return; }
    try {
      var wm = $("wm").value.trim() || "DRAFT";
      var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
      var pages = Math.max(1, Math.ceil(t.length / 3000));
      for (var p = 0; p < pages; p++) {
        if (p) doc.addPage();
        var w = doc.getCurrentPageInfo().pageContext !== undefined ? 0 : 0;
        doc.setTextColor(200, 205, 215);
        doc.setFontSize(60);
        doc.text(wm, 300, 420, { align: "center", angle: 38 });
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        var part = t.slice(p * 3000, (p + 1) * 3000);
        var lines = doc.splitTextToSize(part, 495);
        var y = 60;
        lines.forEach(function (ln) {
          if (y > 790) { y = 60; }
          doc.text(ln, 50, y); y += 15;
        });
      }
      doc.save(DL_NAME);
      $("out").value = "watermarked.pdf created with a diagonal \"" + wm + "\" mark behind the text (" + pages + " page(s)).";
      st(DL_NAME + " saved.", "ok");
    } catch (e) { st("Could not create: " + e.message, "err"); }
  };

})();

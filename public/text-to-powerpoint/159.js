 
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

  var DL_NAME = "slides.pptx";
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
    if (!t.trim()) { st("Type the slide text first.", "warn"); return; }
    if (!window.PptxGenJS) { libFail("PptxGenJS"); return; }
    try {
      var lines = t.replace(/\r/g, "").split("\n").filter(function (l) { return l.trim(); });
      var deckName = lines[0].trim().slice(0, 80);
      var pptx = new PptxGenJS();
      var title = pptx.addSlide();
      title.addText(deckName, { x: 0.5, y: 2.6, w: 9, h: 1.5, fontSize: 40, bold: true, color: "0F172A" });
      var plan = ["[title] " + deckName];
      for (var i = 1; i < lines.length; i += 6) {
        var bullets = lines.slice(i, i + 6).map(function (l) { return l.replace(/^[-*•]\s*/, ""); });
        var s = pptx.addSlide();
        s.addText(bullets, { x: 0.5, y: 0.8, w: 9, h: 5, fontSize: 20, bullet: true, color: "1E293B" });
        plan.push("[slide " + (Math.floor((i - 1) / 6) + 1) + "] " + bullets.join(" · ").slice(0, 90));
      }
      $("out").value = plan.join("\n");
      pptx.writeFile({ fileName: "slides.pptx" }).then(function () {
        st("slides.pptx downloaded · " + plan.length + " slide(s).", "ok");
      });
    } catch (e) { st("Could not build the deck: " + e.message, "err"); }
  };

})();

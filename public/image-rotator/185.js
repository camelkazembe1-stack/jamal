/* JAMALI — page 185 · Image Rotator — the tool's own engine.
   Convertor tool #121 (Image Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   90° steps or any angle, expanded canvas keeps every pixel*/
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

    var drop = $("drop"), fileIn = $("file");
    drop.onclick = function () { fileIn.click(); };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("over"); };
    drop.ondragleave = function () { drop.classList.remove("over"); };
    drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove("over");
      if (e.dataTransfer.files.length) { fileIn.files = e.dataTransfer.files; show(); } };
    fileIn.onchange = show;
    function show() {
      var f = fileIn.files[0]; if (!f) return;
      st(f.name + " \u00b7 " + fb(f.size) + " \u00b7 " + (f.type || "unknown type") + " \u2014 ready.");
      var prev = $("prev");
      if (prev) {
        if (window.__prevUrl) URL.revokeObjectURL(window.__prevUrl);
        window.__prevUrl = URL.createObjectURL(f);
        prev.src = window.__prevUrl; prev.hidden = false;
      }
    }
    function loadImg(blob) {
      return new Promise(function (res, rej) {
        var im = new Image();
        im.onload = function () { res(im); };
        im.onerror = function () { rej(new Error("this browser cannot decode that image")); };
        im.src = URL.createObjectURL(blob);
      });
    }
    function drawTo(im, w, h) {
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      return c;
    }
    function toBlob(c, mime, q) {
      return new Promise(function (res, rej) {
        c.toBlob(function (b) { b ? res(b) : rej(new Error("encoding failed (" + mime + ")")); }, mime, q);
      });
    }

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    try {
      var im = await loadImg(f);
      var rad = ($("deg").value || 0) * Math.PI / 180;
      var sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));
      var expand = $("fit").value === "1";
      var w = expand ? im.naturalWidth * cos + im.naturalHeight * sin : im.naturalWidth;
      var h = expand ? im.naturalWidth * sin + im.naturalHeight * cos : im.naturalHeight;
      var c = document.createElement("canvas");
      c.width = Math.round(w); c.height = Math.round(h);
      var ctx = c.getContext("2d");
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2);
      var blob = await toBlob(c, "image/png");
      dl(blob, f.name.replace(/\.[^.]+$/, "") + "-rotated.png");
      st("Rotated by " + $("deg").value + "° · " + c.width + "×" + c.height + ".", "ok");
    } catch (e) { st("Could not rotate: " + e.message, "err"); }
  };

})();

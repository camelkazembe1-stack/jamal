 
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
    function icoBlob(src) {
      var sizes = [16, 32, 48, 256].filter(function (s) { return s <= Math.max(src.width, src.height); });
      if (!sizes.length) sizes = [16];
      var pngs = sizes.map(function (s) {
        var c = document.createElement("canvas"); c.width = s; c.height = s;
        c.getContext("2d").drawImage(src, 0, 0, s, s);
        var d = c.toDataURL("image/png");
        var bin = atob(d.split(",")[1]), u = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        return u;
      });
      var total = 6 + pngs.length * 16 + pngs.reduce(function (a, p) { return a + p.length; }, 0);
      var buf = new ArrayBuffer(total), v = new DataView(buf);
      v.setUint16(0, 0, true); v.setUint16(2, 1, true); v.setUint16(4, pngs.length, true);
      var off = 6 + pngs.length * 16;
      pngs.forEach(function (p, i) {
        var e = 6 + i * 16, s = sizes[i];
        v.setUint8(e, s >= 256 ? 0 : s); v.setUint8(e + 1, s >= 256 ? 0 : s);
        v.setUint8(e + 2, 0); v.setUint8(e + 3, 0);
        v.setUint16(e + 4, 1, true); v.setUint16(e + 6, 32, true);
        v.setUint32(e + 8, p.length, true); v.setUint32(e + 12, off, true);
        new Uint8Array(buf, off, p.length).set(p);
        off += p.length;
      });
      return new Blob([buf], { type: "image/x-icon" });
    }
  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    try {
      var im = await loadImg(f);
      var out = im.__canvas ? im.__canvas : drawTo(im, im.naturalWidth, im.naturalHeight);
      var blob = await icoBlob(out);
      var name = f.name.replace(/\.[^.]+$/, "") + ".ico";
      dl(blob, name);
      st("Saved " + name + " \u00b7 " + out.width + "\u00d7" + out.height + " \u00b7 " + fb(blob.size) + ".", "ok");
    } catch (e) { st("Could not convert: " + e.message, "err"); }
  };

})();

 
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
    var ul = $("files"); ul.innerHTML = "";
    var fs = fileIn.files; if (!fs.length) return;
    var tot = 0;
    Array.prototype.forEach.call(fs, function (f) {
      tot += f.size;
      var li = document.createElement("li");
      li.innerHTML = "<span>" + esc(f.name) + "</span><span>" + fb(f.size) + "</span>";
      ul.appendChild(li);
    });
    st(fs.length + " file(s) ready · " + fb(tot) + " total.");
  }
    async function loadPdf(file) {
      return await PDFLib.PDFDocument.load(await ab(file), { ignoreEncryption: true });
    }
    async function savePdf(doc, name) {
      var bytes = await doc.save();
      dl(new Blob([bytes], { type: "application/pdf" }), name);
      return bytes.length;
    }
    function ranges(s, max) {
      var out = [];
      String(s).split(",").forEach(function (p) {
        p = p.trim(); if (!p) return;
        var m = p.match(/^(\d+)-(\d+)$/);
        if (m) { for (var i = +m[1]; i <= +m[2]; i++) if (i >= 1 && i <= max && out.indexOf(i - 1) < 0) out.push(i - 1); }
        else if (/^\d+$/.test(p)) { var v = +p; if (v >= 1 && v <= max && out.indexOf(v - 1) < 0) out.push(v - 1); }
      });
      return out;
    }
    function guard() { if (!window.PDFLib) { libFail("pdf-lib"); return false; } return true; }

    var pad = $("pad"), pctx = pad.getContext("2d");
    pad.width = 960; pad.height = 320;
    pctx.lineWidth = 5; pctx.lineCap = "round"; pctx.strokeStyle = "#0f172a";
    var drawing = false, drawn = false;
    function pos(e) { var r = pad.getBoundingClientRect();
      var p = e.touches ? e.touches[0] : e; return { x: (p.clientX - r.left) * pad.width / r.width, y: (p.clientY - r.top) * pad.height / r.height }; }
    function down(e) { e.preventDefault(); drawing = true; drawn = true; var p = pos(e); pctx.beginPath(); pctx.moveTo(p.x, p.y); }
    function move(e) { if (!drawing) return; e.preventDefault(); var p = pos(e); pctx.lineTo(p.x, p.y); pctx.stroke(); }
    function up() { drawing = false; }
    pad.addEventListener("mousedown", down); pad.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    pad.addEventListener("touchstart", down); pad.addEventListener("touchmove", move);
    pad.addEventListener("touchend", up);
    $("clear").onclick = function () { pctx.clearRect(0, 0, pad.width, pad.height); drawn = false; st("Pad cleared."); };

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!window.PDFLib) { libFail("pdf-lib"); return; }
    if (!drawn) { st("Draw your signature on the pad first.", "warn"); return; }
    try {
      var doc = await PDFLib.PDFDocument.load(await ab(f), { ignoreEncryption: true });
      var total = doc.getPageCount();
      var pi = Math.min(Math.max(1, parseInt($("page").value, 10) || 1), total);
      var page = doc.getPage(pi - 1);
      var pngDataUrl = pad.toDataURL("image/png");
      var bin = atob(pngDataUrl.split(",")[1]), u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      var img = await doc.embedPng(u);
      var size = page.getSize();
      var w = size.width * Math.min(100, Math.max(5, parseFloat($("w").value) || 30)) / 100;
      var h = w * pad.height / pad.width;
      page.drawImage(img, { x: size.width - w - size.width * 0.06, y: size.height * 0.08, width: w, height: h });
      var bytes = await doc.save();
      dl(new Blob([bytes], { type: "application/pdf" }), f.name.replace(/\.pdf$/i, "") + "-signed.pdf");
      st("Signed page " + pi + " of " + total + " (bottom-right).", "ok");
    } catch (e) { st("Could not sign: " + e.message, "err"); }
  };

})();

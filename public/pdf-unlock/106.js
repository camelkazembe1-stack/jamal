 
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
    if (!window.pdfjsLib) { libFail("pdf.js"); return; }
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    async function pageCanvas(page, scale) {
      var vp = page.getViewport({ scale: scale });
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.floor(vp.width)); c.height = Math.max(1, Math.floor(vp.height));
      await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
      return c;
    }
    function canvasJpeg(c, q) {
      var d = c.toDataURL("image/jpeg", q);
      var bin = atob(d.split(",")[1]), u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return u;
    }

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!window.PDFLib) { libFail("pdf-lib"); return; }
    try {
      var pdf = await pdfjsLib.getDocument({ data: u8(await ab(f)), password: $("pw").value }).promise;
      var doc = await PDFLib.PDFDocument.create();
      for (var i = 1; i <= pdf.numPages; i++) {
        var page = await pdf.getPage(i);
        var vp = page.getViewport({ scale: 1 });
        var c = await pageCanvas(page, 2);
        var img = await doc.embedJpg(canvasJpeg(c, 0.85));
        var pg = doc.addPage([vp.width, vp.height]);
        pg.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
        st("Rebuilding page " + i + " of " + pdf.numPages + "…");
      }
      var bytes = await doc.save();
      dl(new Blob([bytes], { type: "application/pdf" }), f.name.replace(/\.pdf$/i, "") + "-unlocked.pdf");
      st("Unlocked copy created · " + pdf.numPages + " pages. It opens without a password (pages are images).", "ok");
    } catch (e) {
      st(/password/i.test(e && e.message || "") || (e && e.name === "PasswordException")
        ? "Wrong password — try again." : "Could not unlock: " + (e && e.message || e), "err");
    }
  };

})();

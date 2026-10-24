/* JAMALI — page 154 · PDF to PowerPoint — the tool's own engine.
   Convertor tool #90 (Presentation Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   each PDF page rendered and placed full-bleed on a .pptx slide*/
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
    if (!window.PptxGenJS) { libFail("PptxGenJS"); return; }
    try {
      var pdf = await pdfjsLib.getDocument({ data: u8(await ab(f)) }).promise;
      var pptx = new PptxGenJS();
      pptx.defineLayout({ name: "A4L", width: 10, height: 7.07 });
      pptx.layout = "A4L";
      for (var i = 1; i <= pdf.numPages; i++) {
        var c = await pageCanvas(await pdf.getPage(i), 2);
        var slide = pptx.addSlide();
        slide.addImage({ data: "image/jpeg;base64," + c.toDataURL("image/jpeg", 0.85).split(",")[1],
          x: 0, y: 0, w: 10, h: 7.07 });
        st("Slide " + i + " of " + pdf.numPages + "…");
      }
      var blob = await pptx.write({ outputType: "blob" });
      dl(blob, f.name.replace(/\.pdf$/i, "") + ".pptx");
      st(pdf.numPages + " slide(s) · one PDF page per slide.", "ok");
    } catch (e) { st("Could not convert: " + e.message, "err"); }
  };

})();

 
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
    async function pdfPages(data, on_page) {
      var pdf = await pdfjsLib.getDocument({ data: data }).promise;
      for (var i = 1; i <= pdf.numPages; i++) {
        var page = await pdf.getPage(i);
        await on_page(page, i, pdf.numPages);
      }
      return pdf.numPages;
    }
    async function pageText(page) {
      var tc = await page.getTextContent();
      var out = "", first = true;
      tc.items.forEach(function (it) {
        if (!first) out += it.hasEOL ? "\n" : (out.endsWith(" ") || !it.str ? "" : " ");
        out += it.str; first = false;
      });
      return out;
    }

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    try {
      var bytes = u8(await ab(f));
      var parts = [], pages = 0;
      await pdfPages(bytes, async function (page, i, total) {
        parts.push("--- Page " + i + " ---\n" + (await pageText(page)));
        pages = total; st("Reading page " + i + " of " + total + "…");
      });
      var t = parts.join("\n\n").trim();
      $("out").value = t;
      st("Extracted " + fb(t.length) + " of text from " + pages + " page(s).", "ok");
    } catch (e) { st("Could not read the PDF: " + e.message, "err"); }
  };

})();

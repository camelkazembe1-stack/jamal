/* JAMALI — page 88 · PDF to Excel — the tool's own engine.
   Convertor tool #24 (PDF Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   pdf.js text rows -> SheetJS workbook (.xlsx), columns split on gaps*/
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

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!window.XLSX) { libFail("SheetJS"); return; }
    try {
      var pdf = await pdfjsLib.getDocument({ data: u8(await ab(f)) }).promise;
      var rows = [];
      for (var i = 1; i <= pdf.numPages; i++) {
        var page = await pdf.getPage(i);
        var tc = await page.getTextContent();
        var line = "", lastX = null;
        tc.items.forEach(function (it) {
          var x = it.transform[4];
          if (lastX !== null && x - lastX > 24) { rows.push(line.trim()); line = ""; }
          line += it.str + (x - (lastX === null ? x : lastX) > 12 ? "\t" : "");
          lastX = x;
          if (it.hasEOL) { rows.push(line.trim()); line = ""; lastX = null; }
        });
        if (line.trim()) rows.push(line.trim());
        st("Reading page " + i + " of " + pdf.numPages + "…");
      }
      var aoa = rows.filter(Boolean).map(function (r) { return r.split("\t"); });
      if (!aoa.length) { st("No text rows found.", "warn"); return; }
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PDF data");
      var out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      var name = f.name.replace(/\.pdf$/i, "") + ".xlsx";
      dl(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name);
      st(name + " created · " + aoa.length + " rows · column split is heuristic — check the result.", "ok");
    } catch (e) { st("Could not convert: " + e.message, "err"); }
  };

})();

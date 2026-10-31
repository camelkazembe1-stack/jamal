 
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

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!window.JSZip) { libFail("JSZip"); return; }
    try {
      var zip = await JSZip.loadAsync(await ab(f));
      var name = zip.files["docProps/core.xml"] ? "docProps/core.xml" : null;
      if (!name) { st("This .docx has no core.xml (unusual) — creating one."); name = "docProps/core.xml"; }
      var nowS = new Date().toISOString().replace(/\.\d{3}/, "");
      var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        "<dc:title>" + esc($("ti").value) + "</dc:title>" +
        "<dc:subject>" + esc($("su").value) + "</dc:subject>" +
        "<dc:creator>" + esc($("au").value) + "</dc:creator>" +
        "<cp:keywords>" + esc($("kw").value) + "</cp:keywords>" +
        "<dcterms:created xsi:type=\"dcterms:W3CDTF\">" + nowS + "</dcterms:created>" +
        "<dcterms:modified xsi:type=\"dcterms:W3CDTF\">" + nowS + "</dcterms:modified>" +
        "</cp:coreProperties>";
      zip.file(name, xml);
      var out = await zip.generateAsync({ type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      dl(out, f.name.replace(/\.docx$/i, "") + "-meta.docx");
      st("Metadata written · " + f.name.replace(/\.docx$/i, "") + "-meta.docx.", "ok");
    } catch (e) { st("Could not edit: " + e.message, "err"); }
  };

})();

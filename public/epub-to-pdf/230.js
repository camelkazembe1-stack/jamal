 
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
    async function epubParts(file) {
      var zip = await JSZip.loadAsync(await ab(file));
      var names = Object.keys(zip.files).filter(function (p) {
        return /\.(xhtml|html|htm)$/i.test(p) && !/^(mimetype|META-INF)/i.test(p);
      }).sort();
      var parts = [];
      for (var i = 0; i < names.length; i++) {
        var s = await zip.files[names[i]].async("string");
        var doc = new DOMParser().parseFromString(s, "text/html");
        parts.push({ title: (doc.querySelector("title") || {}).textContent || ("Chapter " + (i + 1)),
          html: doc.body ? doc.body.innerHTML : "", text: doc.body ? doc.body.textContent : "" });
      }
      return parts;
    }
    function guard() { if (!window.JSZip) { libFail("JSZip"); return false; } return true; }
  var DL_NAME = "book.txt";

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!guard()) return;
    if (!window.jspdf) { libFail("jsPDF"); return; }
    try {
      var parts = await epubParts(f);
      if (!parts.length) { st("No chapters found in the EPUB.", "warn"); return; }
      var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
      var y = 70;
      parts.forEach(function (p) {
        doc.setFontSize(15); doc.text(p.title.slice(0, 80) || "Chapter", 50, y); y += 26;
        doc.setFontSize(11);
        var lines = doc.splitTextToSize(p.text.trim() || "(empty)", 495);
        lines.forEach(function (ln) {
          if (y > 780) { doc.addPage(); y = 60; }
          doc.text(ln, 50, y); y += 16;
        });
        y += 12;
        st("Set " + p.title.slice(0, 30) + "…");
      });
      doc.save(f.name.replace(/\.[^.]+$/, "") + ".pdf");
      st(f.name.replace(/\.[^.]+$/, "") + ".pdf saved · " + doc.getNumberOfPages() + " pages.", "ok");
    } catch (e) { st("Could not convert: " + e.message, "err"); }
  };

})();

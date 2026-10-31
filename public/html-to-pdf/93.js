 
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
    if (!window.jspdf) { libFail("jsPDF"); return; }
    try {
      var html = await rtxt(f);
      var doc0 = new DOMParser().parseFromString(html, "text/html");
      doc0.querySelectorAll("script,style,noscript").forEach(function (el) { el.remove(); });
      doc0.body.querySelectorAll("br").forEach(function (el) { el.replaceWith("\n"); });
      doc0.body.querySelectorAll("p,div,li,tr,h1,h2,h3,h4,h5,h6,section,article,blockquote").forEach(function (el) { el.append("\n"); });
      var t = (doc0.body.textContent || "").replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
      if (!t) { st("The page has no visible text.", "warn"); return; }
      var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
      var title = (doc0.title || f.name.replace(/\.[^.]+$/, ""));
      doc.setFontSize(14); doc.text(title, 50, 60);
      doc.setFontSize(11);
      var lines = doc.splitTextToSize(t, 495), y = 84;
      lines.forEach(function (ln) {
        if (y > 790) { doc.addPage(); y = 60; }
        doc.text(ln, 50, y); y += 15;
      });
      doc.save(f.name.replace(/\.[^.]+$/, "") + ".pdf");
      st("PDF created (" + doc.getNumberOfPages() + " pages) — text-based, styling is not reproduced.", "ok");
    } catch (e) { st("Could not convert: " + e.message, "err"); }
  };

})();

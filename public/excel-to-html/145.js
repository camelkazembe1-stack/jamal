 
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
    function guard() { if (!window.XLSX) { libFail("SheetJS"); return false; } return true; }
    var READ_TYPES = { xlsx: "array", xls: "array", ods: "array", csv: "string", tsv: "string" };
    async function readBook(f) {
      if (/\.(csv|tsv)$/i.test(f.name)) return XLSX.read(await rtxt(f), { type: "string" });
      return XLSX.read(new Uint8Array(await ab(f)), { type: "array" });
    }
    function wbBlob(wb, bookType, mime) {
      var out = XLSX.write(wb, { bookType: bookType, type: "array" });
      return new Blob([out], { type: mime });
    }
    function dlBook(wb, name, ext) {
      var mimes = { xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        xls: "application/vnd.ms-excel", ods: "application/vnd.oasis.opendocument.spreadsheet",
        csv: "text/csv", tsv: "text/tab-separated-values", html: "text/html" };
      dl(wbBlob(wb, ext, mimes[ext] || "application/octet-stream"), name);
      return wbBlob(wb, ext, mimes[ext] || "application/octet-stream").size;
    }

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!guard()) return;
    try {
      var wb = await readBook(f);
      var html = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<title>" + esc(f.name) + "</title>\n" +
        "<style>body{font-family:system-ui,sans-serif;margin:24px}table{border-collapse:collapse;margin-bottom:24px}" +
        "th,td{border:1px solid #cbd5e1;padding:6px 10px}th{background:#f1f5f9}h2{margin:18px 0 8px}</style>\n</head>\n<body>\n";
      wb.SheetNames.forEach(function (sn) {
        html += "<h2>" + esc(sn) + "</h2>\n" + XLSX.utils.sheet_to_html(wb.Sheets[sn]) + "\n";
      });
      html += "</body>\n</html>";
      $("out").value = html.slice(0, 3000) + (html.length > 3000 ? "\n…" : "");
      dl(new Blob([html], { type: "text/html" }), f.name.replace(/\.[^.]+$/, "") + ".html");
      st(f.name.replace(/\.[^.]+$/, "") + ".html saved · " + wb.SheetNames.length + " table(s).", "ok");
    } catch (e) { st("Could not convert: " + e.message, "err"); }
  };

})();

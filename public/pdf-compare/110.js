 
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

    var drop2 = $("drop2"), file2 = $("file2");
    drop2.onclick = function () { file2.click(); };
    drop2.ondragover = function (e) { e.preventDefault(); drop2.classList.add("over"); };
    drop2.ondragleave = function () { drop2.classList.remove("over"); };
    drop2.ondrop = function (e) { e.preventDefault(); drop2.classList.remove("over");
      if (e.dataTransfer.files.length) file2.files = e.dataTransfer.files;
      if (file2.files[0]) drop2.querySelector("small").textContent = file2.files[0].name; };
    function diffLines(a, b) {
      var n = a.length, m = b.length;
      if (n * m > 2500000) { var max = 1500; if (n > max) a = a.slice(0, max); if (m > max) b = b.slice(0, max); n = a.length; m = b.length; }
      var dp = new Uint32Array((n + 1) * (m + 1));
      for (var i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--)
        dp[i * (m + 1) + j] = a[i] === b[j] ? dp[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
      var out = [], x = 0, y = 0;
      while (x < n && y < m) {
        if (a[x] === b[y]) { out.push(["=", a[x]]); x++; y++; }
        else if (dp[(x + 1) * (m + 1) + y] >= dp[x * (m + 1) + y + 1]) { out.push(["-", a[x]]); x++; }
        else { out.push(["+", b[y]]); y++; }
      }
      while (x < n) { out.push(["-", a[x++]]); }
      while (y < m) { out.push(["+", b[y++]]); }
      return out;
    }

  $("run").onclick = async function () {
    var f1 = oneFile("file"), f2 = file2.files[0];
    if (!f1 || !f2) { st("Choose both PDFs first.", "warn"); return; }
    try {
      async function textOf(f) {
        var pdf = await pdfjsLib.getDocument({ data: u8(await ab(f)) }).promise;
        var parts = [];
        for (var i = 1; i <= pdf.numPages; i++) parts.push(await pageText(await pdf.getPage(i)));
        return parts.join("\n");
      }
      st("Reading " + f1.name + "…");
      var t1 = await textOf(f1);
      st("Reading " + f2.name + "…");
      var t2 = await textOf(f2);
      var d = diffLines(t1.split("\n"), t2.split("\n"));
      var box = $("out");
      box.innerHTML = "";
      var ins = 0, del = 0, shown = 0;
      d.forEach(function (seg) {
        if (shown > 900) return;
        var el = document.createElement(seg[0] === "=" ? "span" : seg[0] === "+" ? "ins" : "del");
        el.className = seg[0] === "=" ? "ctx" : null;
        el.textContent = (seg[0] === "+" ? "+ " : seg[0] === "-" ? "- " : "  ") + seg[1];
        box.appendChild(el);
        if (seg[0] === "+") ins++; if (seg[0] === "-") del++;
        shown++;
      });
      st(t1 === t2 ? "The two documents have identical text." :
        ins + " line(s) added, " + del + " line(s) removed" + (shown > 900 ? " (first 900 shown)" : "") + ".", t1 === t2 ? "ok" : "");
    } catch (e) { st("Could not compare: " + e.message, "err"); }
  };

})();

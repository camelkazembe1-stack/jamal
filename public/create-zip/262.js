/* JAMALI — page 262 · Create ZIP — the tool's own engine.
   Convertor tool #198 (Archive and Compression Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   any files -> one .zip (deflate), folder structure flattened*/
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
    async function zipList(file) {
      var zip = await JSZip.loadAsync(await ab(file));
      return Object.keys(zip.files)
        .filter(function (p) { return !zip.files[p].dir; })
        .map(function (p) { return { path: p, file: zip.files[p], zip: zip }; });
    }
    function guard() { if (!window.JSZip) { libFail("JSZip"); return false; } return true; }

  $("run").onclick = async function () {
    var fs = allFiles("file"); if (!fs) return;
    if (!guard()) return;
    try {
      var zip = new JSZip();
      var tot = 0;
      Array.prototype.forEach.call(fs, function (f) { zip.file(f.name, f); tot += f.size; });
      st("Compressing " + fs.length + " file(s)…");
      var out = await zip.generateAsync({ type: "blob", compression: "DEFLATE" },
        function (m) { st("Compressing… " + Math.round(m.percent) + "%"); });
      var name = ($("zname").value.trim() || "archive.zip").replace(/[^A-Za-z0-9._-]/g, "_");
      dl(out, name);
      st(name + " created · " + fb(tot) + " -> " + fb(out.size) + ".", "ok");
    } catch (e) { st("Could not create the zip: " + e.message, "err"); }
  };

})();

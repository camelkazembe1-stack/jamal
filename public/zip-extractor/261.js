/* JAMALI — page 261 · ZIP Extractor — the tool's own engine.
   Convertor tool #197 (Archive and Compression Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   every entry extracted and downloadable — straight from the zip*/
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

    function fillList(items) {
      var ul = $("list"); ul.innerHTML = "";
      items.forEach(function (it, i) {
        var li = document.createElement("li");
        li.innerHTML = "<span>" + esc(it.name) + "</span><span>" +
          (it.size === undefined ? "" : fb(it.size)) +
          " <button data-i='" + i + "'>Save</button></span>";
        ul.appendChild(li);
      });
      ul.onclick = function (e) {
        var b = e.target.closest("button"); if (!b) return;
        var it = items[+b.getAttribute("data-i")];
        if (it && it.blob) dl(it.blob, it.name.split("/").pop());
      };
    }

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!guard()) return;
    try {
      var entries = await zipList(f);
      if (!entries.length) { st("The archive is empty.", "warn"); return; }
      var items = [];
      for (var i = 0; i < entries.length; i++) {
        items.push({ name: entries[i].path, size: entries[i].file._data ? entries[i].file._data.uncompressedSize : 0,
          blob: await entries[i].file.async("blob") });
      }
      fillList(items);
      st(entries.length + " file(s) extracted — Save any, or use Extract all.");
      $("run").textContent = "Extract all";
      $("run").onclick = async function () {
        for (var j = 0; j < items.length; j++) {
          setTimeout(function (k) { dl(items[k].blob, items[k].name.split("/").pop()); }, j * 250, j);
        }
        st("Triggered " + items.length + " download(s).", "ok");
      };
    } catch (e) { st("Could not open the zip: " + e.message, "err"); }
  };

})();

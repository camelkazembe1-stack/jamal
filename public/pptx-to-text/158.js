 
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
    async function slideTexts(file) {
      var zip = await JSZip.loadAsync(await ab(file));
      var names = Object.keys(zip.files).filter(function (p) { return /^ppt\/slides\/slide\d+\.xml$/.test(p); })
        .sort(function (a, b) { return (parseInt(a.match(/(\d+)/)[1], 10)) - (parseInt(b.match(/(\d+)/)[1], 10)); });
      var out = [];
      for (var i = 0; i < names.length; i++) {
        var xml = await zip.files[names[i]].async("string");
        var doc = new DOMParser().parseFromString(xml, "application/xml");
        var ts = Array.prototype.map.call(doc.getElementsByTagNameNS("*", "t"), function (el) { return el.textContent; }).join("\n");
        out.push(ts);
      }
      return out;
    }
    async function slideMedia(file) {
      var zip = await JSZip.loadAsync(await ab(file));
      var names = Object.keys(zip.files).filter(function (p) { return /^ppt\/media\//.test(p); });
      var out = [];
      for (var i = 0; i < names.length; i++) {
        var blob = await zip.files[names[i]].async("blob");
        out.push({ name: names[i].split("/").pop(), blob: blob });
      }
      return out;
    }
    function guard() { if (!window.JSZip) { libFail("JSZip"); return false; } return true; }
  var DL_NAME = "slides.txt";

  $("dl-txt").onclick = function () {
    var t = $("out").value; if (!t) { st("Nothing to download yet.", "warn"); return; }
    dl(new Blob([t], { type: "text/plain" }), DL_NAME);
    st("Saved " + DL_NAME + ".", "ok");
  };

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!guard()) return;
    try {
      var texts = await slideTexts(f);
      if (!texts.length) { st("No slides found — is this a .pptx package?", "warn"); return; }
      var out = texts.map(function (t, i) { return "--- Slide " + (i + 1) + " ---\n" + t; }).join("\n\n");
      $("out").value = out;
      DL_NAME = f.name.replace(/\.[^.]+$/, "") + ".txt";
      st(texts.length + " slide(s) extracted.", "ok");
    } catch (e) { st("Could not read the deck: " + e.message, "err"); }
  };

})();

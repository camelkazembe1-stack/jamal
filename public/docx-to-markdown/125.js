/* JAMALI — page 125 · DOCX to Markdown — the tool's own engine.
   Convertor tool #61 (Word and Document Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   mammoth HTML -> markdown (#, **, lists, links) via a mini converter*/
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

    function html2md(node) {
      var out = "";
      node.childNodes.forEach(function (ch) {
        if (ch.nodeType === 3) { out += ch.nodeValue; return; }
        if (ch.nodeType !== 1) return;
        var tag = ch.tagName;
        var inner = html2md(ch);
        if (/^H[1-6]$/.test(tag)) out += "\n" + "#".repeat(+tag[1]) + " " + inner.trim() + "\n\n";
        else if (tag === "STRONG" || tag === "B") out += "**" + inner.trim() + "**";
        else if (tag === "EM" || tag === "I") out += "*" + inner.trim() + "*";
        else if (tag === "A") out += "[" + inner.trim() + "](" + (ch.getAttribute("href") || "") + ")";
        else if (tag === "LI") out += "- " + inner.trim() + "\n";
        else if (tag === "BR") out += "\n";
        else if (tag === "P" || /UL|OL|TABLE|BLOCKQUOTE/.test(tag)) out += "\n" + inner.trim() + "\n\n";
        else out += inner;
      });
      return out;
    }

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!window.mammoth) { libFail("mammoth"); return; }
    try {
      var res = await mammoth.convertToHtml({ arrayBuffer: await ab(f) });
      var doc = new DOMParser().parseFromString("<div>" + res.value + "</div>", "text/html");
      var md = html2md(doc.body.firstChild).replace(/\n{3,}/g, "\n\n").trim();
      $("out").value = md;
      DL_NAME = f.name.replace(/\.docx$/i, "") + ".md";
      st("Markdown ready (" + fb(md.length) + ").", "ok");
    } catch (e) { st("Could not convert: " + e.message, "err"); }
  };
  $("dl-txt").onclick = function () {
    var t = $("out").value; if (!t) { st("Nothing to download yet.", "warn"); return; }
    dl(new Blob([t], { type: "text/plain;charset=utf-8" }), DL_NAME);
    st("Saved " + DL_NAME + ".", "ok");
  };
  var DL_NAME = "document.md";

})();

/* JAMALI — page 68 · Word to Text — the tool's own engine.
   Convertor tool #4 (Text Conversion Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   mammoth.js pulls the plain text out of .docx (and best-effort .doc)*/
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
    try {
      if (/\.docx$/i.test(f.name) && window.mammoth) {
        var res = await mammoth.extractRawText({ arrayBuffer: await ab(f) });
        $("out").value = res.value;
        st("Extracted " + fb(res.value.length) + " of text from " + f.name + ".", "ok");
      } else {
        var buf = u8(await ab(f));
        var s = "", chunk = "";
        for (var i = 0; i < buf.length; i++) {
          var b = buf[i];
          if ((b >= 32 && b < 127) || b === 10 || b === 13 || b === 9) chunk += String.fromCharCode(b);
          else { if (chunk.length >= 4) s += chunk + "\n"; chunk = ""; }
        }
        if (chunk.length >= 4) s += chunk;
        s = s.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
        $("out").value = s;
        st("Old binary .doc: extracted the readable text best-effort (" + fb(s.length) + "). For a clean read, save as .docx first.", "warn");
      }
    } catch (e) { st("Could not read the document: " + e.message, "err"); }
  };

})();

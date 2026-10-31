 
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

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!guard()) return;
    try {
      var zip = await JSZip.loadAsync(await ab(f));
      var opfName = Object.keys(zip.files).find(function (p) { return /\.opf$/i.test(p); });
      if (!opfName) { st("No OPF package document found — is this an EPUB?", "err"); return; }
      var opf = await zip.files[opfName].async("string");
      var doc = new DOMParser().parseFromString(opf, "application/xml");
      var ti = doc.getElementsByTagNameNS("*", "title")[0];
      var au = doc.getElementsByTagNameNS("*", "creator")[0] || doc.getElementsByTagNameNS("*", "author")[0];
      $("ti").value = ti ? ti.textContent : "";
      $("au").value = au ? au.textContent : "";
      st("Loaded: " + ($("ti").value || "(no title)") + " by " + ($("au").value || "(unknown)"));
      $("run").onclick = async function () {
        var changed = false;
        if (ti && $("ti").value !== ti.textContent) { ti.textContent = $("ti").value; changed = true; }
        if (au && $("au").value !== au.textContent) { au.textContent = $("au").value; changed = true; }
        if (!ti || !au) {
          var md = doc.getElementsByTagNameNS("*", "metadata")[0] || doc.getElementsByTagNameNS("*", "title")[0].parentNode;
          if (!ti) {
            var el = doc.createElementNS("http://purl.org/dc/elements/1.1/", "dc:title");
            el.textContent = $("ti").value; md.appendChild(el); changed = true;
          }
          if (!au) {
            var el2 = doc.createElementNS("http://purl.org/dc/elements/1.1/", "dc:creator");
            el2.textContent = $("au").value; md.appendChild(el2); changed = true;
          }
        }
        if (!changed) { st("Nothing to change.", "warn"); return; }
        zip.file(opfName, new XMLSerializer().serializeToString(doc));
        var out = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
        dl(out, f.name.replace(/\.[^.]+$/, "") + "-meta.epub");
        st("Metadata saved · " + f.name.replace(/\.[^.]+$/, "") + "-meta.epub.", "ok");
      };
    } catch (e) { st("Could not process: " + e.message, "err"); }
  };

})();

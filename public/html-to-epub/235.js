 
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
    async function makeDocx(text, title) {
      var paras = String(text).split("\n").map(function (ln) {
        var run = ln.trim().startsWith("#") ? "" : "";
        var xml = esc(ln) || "";
        return "<w:p><w:r><w:t xml:space=\"preserve\">" + xml + "</w:t></w:r></w:p>";
      }).join("");
      var zip = new JSZip();
      zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>');
      zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>');
      zip.file("word/document.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        "<w:body>" + paras + "<w:sectPr/></w:body></w:document>");
      return zip.generateAsync({ type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    }
    async function makeOdt(text) {
      var ps = String(text).split("\n").map(function (ln) {
        return "<text:p>" + esc(ln) + "</text:p>";
      }).join("");
      var zip = new JSZip();
      zip.file("mimetype", "application/vnd.oasis.opendocument.text", { compression: "STORE" });
      zip.file("content.xml", '<?xml version="1.0" encoding="UTF-8"?>' +
        '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
        'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">' +
        "<office:body><office:text>" + ps + "</office:text></office:body></office:document-content>");
      zip.file("META-INF/manifest.xml", '<?xml version="1.0" encoding="UTF-8"?>' +
        '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">' +
        '<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>' +
        '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
        "</manifest:manifest>");
      return zip.generateAsync({ type: "blob", mimeType: "application/vnd.oasis.opendocument.text" });
    }
    async function makeEpub(text, title) {
      var chapters = String(text).split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean);
      if (!chapters.length) chapters = ["(empty)"];
      var zip = new JSZip();
      zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
      zip.file("META-INF/container.xml", '<?xml version="1.0" encoding="UTF-8"?>' +
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
        '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
      var manifest = "", spine = "", files = {};
      chapters.forEach(function (ch, i) {
        var name = "ch" + (i + 1) + ".xhtml";
        files["OEBPS/" + name] = '<?xml version="1.0" encoding="UTF-8"?>' +
          '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>' + esc(title) + " " + (i + 1) + '</title></head>' +
          "<body><p>" + esc(ch).replace(/\n/g, "<br/>") + "</p></body></html>";
        manifest += '<item id="c' + (i + 1) + '" href="' + name + '" media-type="application/xhtml+xml"/>';
        spine += '<itemref idref="c' + (i + 1) + '"/>';
      });
      var navpoints = chapters.map(function (_, i) {
        return '<navPoint id="n' + (i + 1) + '" playOrder="' + (i + 1) + '"><navLabel><text>' +
          esc(title) + " " + (i + 1) + "</text></navLabel><content src=\"ch" + (i + 1) + ".xhtml\"/></navPoint>";
      }).join("");
      zip.file("OEBPS/content.opf", '<?xml version="1.0" encoding="UTF-8"?>' +
        '<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">' +
        "<metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:opf=\"http://www.idpf.org/2007/opf\">" +
        '<dc:title>' + esc(title) + "</dc:title><dc:language>en</dc:language>" +
        '<dc:identifier id="bookid">urn:uuid:' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + "</dc:identifier>" +
        "</metadata><manifest>" + manifest +
        '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest>' +
        '<spine toc="ncx">' + spine + "</spine></package>");
      zip.file("OEBPS/toc.ncx", '<?xml version="1.0" encoding="UTF-8"?>' +
        '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head>' +
        '<meta name="dtb:uid" content="urn:uuid:' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + '"/></head>' +
        "<docTitle><text>" + esc(title) + "</text></docTitle><navMap>" + navpoints + "</navMap></ncx>");
      Object.keys(files).forEach(function (p) { zip.file(p, files[p]); });
      return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
    }
    function guard() { if (!window.JSZip) { libFail("JSZip"); return false; } return true; }
    function rtxt2(file) { return rtxt(file); }

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!guard()) return;
    try {
      var doc = new DOMParser().parseFromString(await rtxt(f), "text/html");
      doc.querySelectorAll("script,style,noscript").forEach(function (el) { el.remove(); });
      var title = (doc.title || f.name.replace(/\.[^.]+$/, ""));
      var text = doc.body.textContent.replace(/\n{3,}/g, "\n\n").trim();
      if (!text) { st("The page has no text.", "warn"); return; }
      var blob = await makeEpub(text, title);
      dl(blob, title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".epub");
      st(title + ".epub created (" + fb(blob.size) + ").", "ok");
    } catch (e) { st("Could not convert: " + e.message, "err"); }
  };

})();

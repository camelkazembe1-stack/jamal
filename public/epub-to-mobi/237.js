/* JAMALI — page 237 · EPUB to MOBI — the tool's own engine.
   Convertor tool #173 (Ebook and Publishing Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   minimal (uncompressed PalmDOC) MOBI writer — Kindle/calibre readable*/
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
    function u16(b, o) { return (b[o] << 8) | b[o + 1]; }
    function u32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }
    function palmdocDecompress(bytes) {
      var out = [], i = 0, n = bytes.length;
      while (i < n) {
        var b = bytes[i++];
        if (b === 0) out.push(0);
        else if (b <= 8) { for (var j = 0; j < b && i < n; j++) out.push(bytes[i++]); }
        else if (b < 0x10) { out.push(32); out.push(b - 8); }
        else if (b < 0x80) out.push(b);
        else if (b < 0xC0) {
          var lz = (b << 8) | bytes[i++];
          var dist = (lz >> 3) & 0x7FF, len = (lz & 7) + 3;
          for (var k = 0; k < len; k++) out.push(out[out.length - dist]);
        } else { out.push(32); out.push(b ^ 0x80); }
      }
      return new Uint8Array(out);
    }
    function mobiText(file) {
      return new Promise(function (res, rej) {
        var r = new FileReader();
        r.onload = function () {
          var b = new Uint8Array(r.result);
          try {
            var numRec = u16(b, 76);
            if (numRec < 1) return rej(new Error("no records in the PalmDB"));
            var recOff = [];
            for (var i = 0; i < numRec; i++) recOff.push(u32(b, 78 + i * 8));
            var rec0 = b.subarray(recOff[0], recOff[1] || b.length);
            var compression = u16(rec0, 0);
            var textLen = u32(rec0, 4);
            var recCount = u16(rec0, 8);
            var encryption = u16(rec0, 12);
            if (encryption) return rej(new Error("this MOBI is DRM-protected — encrypted books cannot be converted"));
            if (compression !== 1 && compression !== 2) return rej(new Error("unsupported compression " + compression));
            var full = [];
            for (var k = 1; k <= Math.min(recCount, recOff.length - 1); k++) {
              var seg = b.subarray(recOff[k], recOff[k + 1] || b.length);
              if (compression === 2) {
                var d = palmdocDecompress(seg);
                for (var q = 0; q < d.length; q++) full.push(d[q]);
              } else for (var q2 = 0; q2 < seg.length; q2++) full.push(seg[q2]);
            }
            var all = new Uint8Array(full);
            var txt = new TextDecoder("utf-8", { fatal: false }).decode(all.subarray(0, Math.min(textLen || all.length, all.length)));
            res(txt.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim());
          } catch (e) { rej(e); }
        };
        r.onerror = function () { rej(new Error("could not read the file")); };
        r.readAsArrayBuffer(file);
      });
    }
    function strPadded(s, n) { var u = []; for (var i = 0; i < s.length && i < n; i++) u.push(s.charCodeAt(i) & 0xFF); while (u.length < n) u.push(0); return u; }
    function makeMobi(text, title) {
      var enc = new TextEncoder().encode(text);
      var recSize = 4096;
      var recCount = Math.max(1, Math.ceil(enc.length / recSize));
      var name = (title || "Book").slice(0, 31);
      var mobiName = strPadded(name, 32);
      function now() { return Math.floor(Date.now() / 1000); }
      var rec0 = [];
      function push16(v) { rec0.push((v >> 8) & 0xFF, v & 0xFF); }
      function push32(v) { rec0.push((v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF); }
      // PalmDOC header (compression 1 = none)
      push16(1); push32(enc.length); push16(recCount); push16(recSize); push16(0); push16(0);
      // MOBI header
      strPaddedInto(rec0, "MOBI", 4);
      push32(0xE8 - 16); // header length (232) incl. this field counted from MOBI start
      push32(2);         // mobi type: book
      push32(65001);     // utf-8
      push32(0x1234);    // unique id
      push32(0);         // file version
      for (var z = 0; z < 32; z++) push32(0xFFFFFFFF); // offsets we do not use
      while (rec0.length < 0xE8) rec0.push(0);
      // EXTH placeholder skipped (optional in readers we target)
      var rec0bytes = new Uint8Array(rec0);
      // records
      var records = [rec0bytes];
      for (var rI = 0; rI < recCount; rI++) records.push(enc.subarray(rI * recSize, Math.min(enc.length, (rI + 1) * recSize)));
      // PDB container
      var numRec = records.length;
      var headerSize = 78 + numRec * 8 + 2;
      var total = headerSize;
      var offs = [];
      records.forEach(function (r) { offs.push(total); total += r.length; });
      var out = new Uint8Array(total);
      var dv = new DataView(out.buffer);
      strPaddedInto(out, name, 32);
      out.set([0, 0], 32); // attributes
      dv.setUint16(34, 0);
      dv.setUint32(36, now()); dv.setUint32(40, now());
      dv.setUint32(44, 0); dv.setUint32(48, 0); dv.setUint32(52, 0);
      strPaddedInto2(out, 60, "BOOK");
      strPaddedInto2(out, 64, "MOBI");
      dv.setUint32(68, 0); dv.setUint32(72, 0);
      dv.setUint16(76, numRec);
      for (var i2 = 0; i2 < numRec; i2++) {
        dv.setUint32(78 + i2 * 8, offs[i2]);
        out.set([0, 0, 0], 78 + i2 * 8 + 4);
      }
      out.set([0, 0], 78 + numRec * 8);
      var p = headerSize;
      records.forEach(function (r) { out.set(r, p); p += r.length; });
      return new Blob([out], { type: "application/x-mobipocket-ebook" });
    }
    function strPaddedInto(arr, s, n) { for (var i = 0; i < s.length && i < n; i++) arr.push(s.charCodeAt(i) & 0xFF); }
    function strPaddedInto2(arr, at, s) { for (var i = 0; i < s.length; i++) arr[at + i] = s.charCodeAt(i) & 0xFF; }

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!guard()) return;
    try {
      var parts = await epubParts(f);
      if (!parts.length) { st("No chapters found.", "warn"); return; }
      var text = parts.map(function (p) { return p.text.trim(); }).join("\n\n");
      var blob = makeMobi(text, f.name.replace(/\.[^.]+$/, ""));
      dl(blob, f.name.replace(/\.[^.]+$/, "") + ".mobi");
      st(f.name.replace(/\.[^.]+$/, "") + ".mobi saved (" + fb(blob.size) + ") — uncompressed PalmDOC, readable by Kindle and calibre.", "ok");
    } catch (e) { st("Could not convert: " + e.message, "err"); }
  };

})();

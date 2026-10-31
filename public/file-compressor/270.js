 
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
    function tarType(u8, off) {
      return String.fromCharCode(u8[off + 156]) || "0";
    }
    function tarParse(u8) {
      var entries = [], off = 0;
      while (off + 512 <= u8.length) {
        var block = u8.subarray(off, off + 512);
        if (block.every(function (b) { return b === 0; })) break;
        var name = "";
        for (var i = 0; i < 100 && block[i]; i++) name += String.fromCharCode(block[i]);
        var prefix = "";
        for (var j = 0; j < 155 && block[345 + j]; j++) prefix += String.fromCharCode(block[345 + j]);
        if (prefix) name = prefix + "/" + name;
        var size = 0, sizeS = "";
        for (var k = 0; k < 12; k++) { if (block[124 + k] === 32 || block[124 + k] === 0) break; sizeS += String.fromCharCode(block[124 + k]); }
        size = parseInt(sizeS, 8) || 0;
        var type = tarType(u8, off);
        var dataStart = off + 512;
        if (type === "L" || type === "K") {
          
          var longName = "";
          var ld = u8.subarray(dataStart, dataStart + size);
          for (var q = 0; q < ld.length && ld[q]; q++) longName += String.fromCharCode(ld[q]);
          off = dataStart + Math.ceil(size / 512) * 512;
          var nb = u8.subarray(off, off + 512);
          var next = "";
          for (var w = 0; w < 100 && nb[w]; w++) next += String.fromCharCode(nb[w]);
          var ns = 0, nsS = "";
          for (var y = 0; y < 12; y++) { if (nb[124 + y] === 32 || nb[124 + y] === 0) break; nsS += String.fromCharCode(nb[124 + y]); }
          var nsize = parseInt(nsS, 8) || 0;
          entries.push({ name: longName, type: tarType(u8, off), data: u8.subarray(off + 512, off + 512 + nsize), size: nsize });
          off = off + 512 + Math.ceil(nsize / 512) * 512;
          continue;
        }
        if (type === "0" || type === "\0" || type === "" || type === "7") {
          entries.push({ name: name, type: "0", data: u8.subarray(dataStart, dataStart + size), size: size });
        } else if (type === "5") {
          entries.push({ name: name, type: "5", data: null, size: 0 });
        }
        off = dataStart + Math.ceil(size / 512) * 512;
      }
      return entries;
    }
    function tarWrite(files) {
      var blocks = [];
      var total = 0;
      files.forEach(function (f) {
        var u8 = new Uint8Array(f.data);
        var head = new Uint8Array(512);
        var nameB = new TextEncoder().encode(f.name);
        if (nameB.length > 100) {
          
          var cut = -1;
          for (var s = 0; s < Math.min(nameB.length, 255); s++) if (nameB[s] === 0x2f && s <= 155) cut = s;
          if (cut > 0 && nameB.length - cut - 1 <= 100) {
            head.set(nameB.subarray(cut + 1), 0);
            head.set(nameB.subarray(0, cut), 345);
          } else head.set(nameB.subarray(0, 100));
        } else head.set(nameB);
        function oct(v, n, at) {
          var s = v.toString(8).padStart(n - 1, "0") + "\0";
          for (var i = 0; i < n; i++) head[at + i] = s.charCodeAt(i) & 0xFF;
        }
        oct(0o644, 8, 100);         
        oct(0, 8, 108);             
        oct(0, 8, 116);             
        oct(u8.length, 12, 124);    
        oct(Math.floor(Date.now() / 1000), 12, 136); 
        head[156] = 0x30;           
        str(head, "ustar\0", 257);  
        str(head, "00", 263);       
        str(head, "jamali", 265);   
        str(head, "jamali", 297);   
        var chk = 0;
        for (var c = 0; c < 512; c++) chk += (c >= 148 && c < 156) ? 32 : head[c];
        var chkS = chk.toString(8).padStart(6, "0") + "\0 ";
        for (var c2 = 0; c2 < 8; c2++) head[148 + c2] = chkS.charCodeAt(c2) & 0xFF;
        blocks.push(head);
        total += 512;
        blocks.push(u8);
        total += u8.length;
        var pad = (512 - (u8.length % 512)) % 512;
        if (pad) { blocks.push(new Uint8Array(pad)); total += pad; }
      });
      blocks.push(new Uint8Array(1024));
      total += 1024;
      var out = new Uint8Array(total), o = 0;
      blocks.forEach(function (b) { out.set(b, o); o += b.length; });
      return out;
    }
    function str(head, s, at) { for (var i = 0; i < s.length; i++) head[at + i] = s.charCodeAt(i) & 0xFF; }
    function gzipStream(u8) {
      var cs = new CompressionStream("gzip");
      var stream = new Blob([u8]).stream().pipeThrough(cs);
      return new Response(stream).arrayBuffer();
    }
    function gunzipStream(u8) {
      var ds = new DecompressionStream("gzip");
      var stream = new Blob([u8]).stream().pipeThrough(ds);
      return new Response(stream).arrayBuffer();
    }

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    try {
      if (!window.CompressionStream) { st("This browser has no CompressionStream.", "err"); return; }
      st("Compressing…");
      var gz = await gzipStream(u8(await ab(f)));
      var blob = new Blob([gz], { type: "application/gzip" });
      dl(blob, f.name + ".gz");
      var cut = Math.round((1 - blob.size / f.size) * 100);
      st(f.name + ".gz · " + fb(f.size) + " -> " + fb(blob.size) + (cut > 0 ? " (-" + cut + "%)" : "") + ".", "ok");
    } catch (e) { st("Could not compress: " + e.message, "err"); }
  };

})();

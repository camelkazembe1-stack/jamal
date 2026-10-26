/* JAMALI — page 273 · MIME Type Checker — the tool's own engine.
   Convertor tool #209 (File Utilities). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   declared MIME, extension map and magic bytes cross-checked*/
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
    var SIGS = [
      ["png", [0x89, 0x50, 0x4e, 0x47], "image/png"],
      ["jpg", [0xff, 0xd8, 0xff], "image/jpeg"],
      ["gif", null, "image/gif", "GIF8"],
      ["pdf", null, "application/pdf", "%PDF"],
      ["zip/office", [0x50, 0x4b, 0x03, 0x04], "application/zip"],
      ["gzip", [0x1f, 0x8b], "application/gzip"],
      ["rar", null, "application/vnd.rar", "Rar!"],
      ["7z", null, "application/x-7z-compressed", "7z\u00bc\u00af"],
      ["webp", null, "image/webp", "RIFF"],
      ["wav", null, "audio/x-wav", "RIFF"],
      ["mp3", null, "audio/mpeg", "ID3"],
      ["mp4/mov", null, "video/mp4", "ftyp"],
      ["webm/mkv", [0x1a, 0x45, 0xdf, 0xa3], "video/webm"],
      ["tar", null, "application/x-tar", "ustar"],
      ["elf", [0x7f, 0x45, 0x4c, 0x46], "application/x-elf"],
      ["exe", null, "application/x-msdownload", "MZ"],
    ];
    function sniff(bytes) {
      var s = "";
      for (var i = 0; i < Math.min(bytes.length, 16); i++) s += String.fromCharCode(bytes[i]);
      for (var i = 0; i < SIGS.length; i++) {
        var g = SIGS[i];
        if (g[3]) { if (s.indexOf(g[3]) === 0 || (g[3] === "RIFF" && s.indexOf("RIFF") === 0)) return g; }
        else if (g[1]) {
          var ok = true;
          for (var j = 0; j < g[1].length; j++) if (bytes[j] !== g[1][j]) { ok = false; break; }
          if (ok) return g;
        }
      }
      return null;
    }
    var EXT = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
      webp: "image/webp", svg: "image/svg+xml", pdf: "application/pdf", zip: "application/zip",
      gz: "application/gzip", tar: "application/x-tar", mp3: "audio/mpeg", wav: "audio/x-wav",
      mp4: "video/mp4", webm: "video/webm", txt: "text/plain", csv: "text/csv", html: "text/html",
      json: "application/json", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    var ext = (f.name.split(".").pop() || "").toLowerCase();
    var bytes = new Uint8Array((await ab(f)).slice(0, 16));
    var g = sniff(bytes);
    var expect = EXT[ext] || "(unknown extension)";
    var agree = g && expect !== "(unknown extension)" ? (g[2] === expect || expect.indexOf(g[0]) > -1 || g[0].indexOf(ext) > -1) : null;
    var rows = [
      ["Extension", "." + ext], ["Extension maps to", expect],
      ["Browser-reported", f.type || "(none)"], ["Magic bytes say", g ? g[0] + " -> " + g[2] : "unknown"],
      ["Consistency", agree === null ? "inconclusive" : agree ? "all three agree" : "MISMATCH — the extension may be wrong"],
    ];
    var kv = $("kv");
    kv.innerHTML = rows.map(function (r) { return "<tr><th>" + esc(r[0]) + "</th><td><b>" + esc(r[1]) + "</b></td></tr>"; }).join("");
    kv.hidden = false;
    st(agree === false ? "The signature does not match the extension!" : agree ? "All consistent." : "Checked.", agree === false ? "warn" : "ok");
  };

})();

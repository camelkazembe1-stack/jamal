
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
  function ab(file) { return new Promise(function (res, rej) { var r = new FileReader();
    r.onload = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    r.readAsArrayBuffer(file); }); }
  function rtxt(file) { return new Promise(function (res, rej) { var r = new FileReader();
    r.onload = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    r.readAsText(file); }); }
  function u8(abuf) { return new Uint8Array(abuf); }
  function blobUrl(b) { return URL.createObjectURL(b); }

  var drop = $("drop"), fileIn = $("file"), runBtn = $("run"), ul = $("files");
  var outcard = $("outcard"), outinfo = $("outinfo"), dlBtn = $("dl"), nohdr = $("nohdr");
  var outBlob = null, outName = "";

  drop.onclick = function () { fileIn.click(); };
  drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = function () { drop.classList.remove("over"); };
  drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove("over");
    if (e.dataTransfer.files.length) { fileIn.files = e.dataTransfer.files; show(); } };
  fileIn.onchange = show;

  function show() {
    ul.innerHTML = ""; outcard.hidden = true; outBlob = null; outName = "";
    var fs = fileIn.files; if (!fs.length) return;
    var tot = 0, exts = {};
    Array.prototype.forEach.call(fs, function (f) {
      tot += f.size;
      var e = ext(f.name) || "(no extension)";
      exts[e.toLowerCase()] = (exts[e.toLowerCase()] || 0) + 1;
      var li = document.createElement("li");
      li.innerHTML = "<span>" + esc(f.name) + "</span><span>" + esc(e) + " · " + fb(f.size) + "</span>";
      ul.appendChild(li);
    });
    var kinds = Object.keys(exts);
    if (kinds.length > 1) {
      var parts = []; for (var k in exts) parts.push(exts[k] + "× " + k);
      st("Mixed extensions selected (" + parts.join(", ") + ") — MERGE only joins files with the SAME extension.", "warn");
    } else {
      st(fs.length + " file(s) ready · " + fb(tot) + " total · extension ." + kinds[0]);
    }
  }

  function ext(n) { var i = n.lastIndexOf("."); return i < 0 ? "" : n.slice(i + 1).toLowerCase(); }
  function base(n) { var i = n.lastIndexOf("."); return i < 0 ? n : n.slice(0, i); }

  /* ---------- WAV tools ---------- */
  function wavParse(u) {
    if (u.length < 44) return null;
    function tag(o) { return String.fromCharCode(u[o], u[o + 1], u[o + 2], u[o + 3]); }
    if (tag(0) !== "RIFF" || tag(8) !== "WAVE") return null;
    var dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
    var off = 12, fmt = null, data = null;
    while (off + 8 <= u.length) {
      var id = tag(off), sz = dv.getUint32(off + 4, true);
      if (id === "fmt " && !fmt) fmt = u.slice(off + 8, off + 8 + Math.min(sz, 40));
      else if (id === "data" && !data) data = u.slice(off + 8, Math.min(off + 8 + sz, u.length));
      off += 8 + sz + (sz % 2);
    }
    if (!fmt || !data || fmt.length < 16) return null;
    var fdv = new DataView(fmt.buffer, fmt.byteOffset, fmt.byteLength);
    return { fmt: fmt, format: fdv.getUint16(0, true), ch: fdv.getUint16(2, true),
      rate: fdv.getUint32(4, true), bits: fdv.getUint16(14, true), data: data };
  }
  function wavMerge(u8s) {
    var parts = [], i;
    for (i = 0; i < u8s.length; i++) { var p = wavParse(u8s[i]); if (!p) return null; parts.push(p); }
    var f = parts[0];
    if (f.format !== 1) return null; /* plain PCM only */
    for (i = 1; i < parts.length; i++) {
      if (parts[i].format !== f.format || parts[i].ch !== f.ch ||
          parts[i].rate !== f.rate || parts[i].bits !== f.bits) return null;
    }
    var total = 0; for (i = 0; i < parts.length; i++) total += parts[i].data.length;
    var out = new Uint8Array(44 + total);
    var dv = new DataView(out.buffer);
    function tag(o, s) { for (var j = 0; j < 4; j++) out[o + j] = s.charCodeAt(j); }
    tag(0, "RIFF"); dv.setUint32(4, 36 + total, true); tag(8, "WAVE"); tag(12, "fmt ");
    dv.setUint32(16, 16, true); dv.setUint16(20, f.format, true); dv.setUint16(22, f.ch, true);
    dv.setUint32(24, f.rate, true); dv.setUint32(28, f.rate * f.ch * f.bits / 8, true);
    dv.setUint16(32, f.ch * f.bits / 8, true); dv.setUint16(34, f.bits, true); tag(36, "data");
    dv.setUint32(40, total, true);
    var o = 44;
    for (i = 0; i < parts.length; i++) { out.set(parts[i].data, o); o += parts[i].data.length; }
    return out;
  }

  /* ---------- MP3 tools ---------- */
  function mp3Trim(u) {
    var s = 0, e = u.length;
    if (u.length > 10 && u[0] === 0x49 && u[1] === 0x44 && u[2] === 0x33) {
      s = 10 + (((u[6] & 0x7f) << 21) | ((u[7] & 0x7f) << 14) | ((u[8] & 0x7f) << 7) | (u[9] & 0x7f));
      if (s >= e) s = 0;
    }
    if (e - s > 128 && u[e - 128] === 0x54 && u[e - 127] === 0x41 && u[e - 126] === 0x47) e -= 128;
    return u.subarray(s, e);
  }

  /* ---------- Image tools ---------- */
  function loadImg(blob) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error("cannot decode this image")); };
      im.src = URL.createObjectURL(blob);
    });
  }
  async function stackImages(fs, e) {
    var imgs = [], w = 0, h = 0, i;
    for (i = 0; i < fs.length; i++) { var im = await loadImg(fs[i]); imgs.push(im);
      w = Math.max(w, im.naturalWidth); h += im.naturalHeight; }
    var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    var ctx = cv.getContext("2d");
    if (e === "jpg" || e === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
    var y = 0;
    for (i = 0; i < imgs.length; i++) { ctx.drawImage(imgs[i], 0, y); y += imgs[i].naturalHeight; }
    var mime = (e === "webp") ? "image/webp" : (e === "jpg" || e === "jpeg") ? "image/jpeg" : "image/png";
    var outExt = (e === "webp") ? "webp" : (e === "jpg" || e === "jpeg") ? "jpg" : "png";
    var blob = await new Promise(function (res) { cv.toBlob(res, mime, 0.92); });
    if (!blob) throw new Error("this browser cannot encode ." + outExt + " images");
    return { blob: blob, outExt: outExt };
  }

  /* ---------- CSV header helper ---------- */
  function splitFirstLine(t) { var i = t.indexOf("\n");
    return i < 0 ? [t, ""] : [t.slice(0, i), t.slice(i + 1)]; }

  runBtn.onclick = async function () {
    var fs = fileIn.files;
    if (!fs || fs.length < 2) { st("Choose at least TWO files to merge.", "warn"); return; }
    var list = Array.prototype.slice.call(fs);
    var e = ext(list[0].name);
    for (var i = 0; i < list.length; i++) {
      if (ext(list[i].name) !== e) { st("All files must share the SAME extension — found ." +
        (ext(list[i].name) || "(none)") + " but expected ." + (e || "(none)") + ".", "err"); return; }
    }
    if (!e) { st("These files have no extension — MERGE needs one to know how to join them.", "err"); return; }
    var txtExt = ["txt","md","markdown","log","html","htm","css","js","mjs","ts","jsx","tsx","py","java","c","h","cpp","hpp","cs","php","rb","go","rs","sh","bash","sql","yml","yaml","toml","ini","cfg","conf","env","srt","vtt","tex","rtf"];
    outcard.hidden = true; outBlob = null;
    runBtn.disabled = true;
    try {
      var blob = null, note = "";
      if (e === "csv" || e === "tsv") {
        var texts = [];
        for (i = 0; i < list.length; i++) { st("Reading " + list[i].name + " (" + (i + 1) + "/" + list.length + ")…");
          texts.push(await rtxt(list[i])); }
        var out = texts[0], first = "", rest0 = "";
        var p = splitFirstLine(out); first = p[0]; rest0 = p[1]; out = rest0;
        for (i = 1; i < texts.length; i++) {
          var t = texts[i]; if (nohdr.checked) { var q = splitFirstLine(t);
            if (q[0].replace(/\r$/, "") === first.replace(/\r$/, "")) t = q[1]; }
          if (t && !/\n$/.test(out)) out += "\n";
          out += t;
        }
        blob = new Blob([first + "\n" + out], { type: "text/plain" });
      } else if (e === "json") {
        var vals = [], ok = true;
        for (i = 0; i < list.length; i++) { st("Parsing " + list[i].name + "…");
          try { vals.push(JSON.parse(await rtxt(list[i]))); } catch (er) { ok = false; break; } }
        if (ok) {
          var allArr = vals.every(function (v) { return Object.prototype.toString.call(v) === "[object Array]"; });
          var allObj = vals.every(function (v) { return v && typeof v === "object" && Object.prototype.toString.call(v) !== "[object Array]"; });
          var merged;
          if (allArr) merged = [].concat.apply([], vals);
          else if (allObj) { merged = {}; vals.forEach(function (v) { for (var k in v) merged[k] = v[k]; }); }
          else { merged = vals; note = "Mixed JSON shapes — wrapped everything in one array."; }
          blob = new Blob([JSON.stringify(merged, null, 2)], { type: "application/json" });
        } else {
          note = "Some files are not valid JSON — joined as plain text instead.";
          var parts2 = [];
          for (i = 0; i < list.length; i++) parts2.push(await rtxt(list[i]));
          blob = new Blob([parts2.join("\n\n")], { type: "text/plain" });
        }
      } else if (txtExt.indexOf(e) !== -1) {
        var parts3 = [];
        for (i = 0; i < list.length; i++) { st("Reading " + list[i].name + " (" + (i + 1) + "/" + list.length + ")…");
          parts3.push(await rtxt(list[i])); }
        blob = new Blob([parts3.join("\n\n")], { type: "text/plain" });
      } else if (e === "pdf") {
        if (!window.PDFLib) throw new Error("pdf-lib engine not loaded — reconnect and reload the page.");
        var doc = await PDFLib.PDFDocument.create();
        for (i = 0; i < list.length; i++) {
          st("Adding " + list[i].name + " (" + (i + 1) + "/" + list.length + ")…");
          var src = await PDFLib.PDFDocument.load(u8(await ab(list[i])), { ignoreEncryption: true });
          var pages = await doc.copyPages(src, src.getPageIndices());
          for (var j = 0; j < pages.length; j++) doc.addPage(pages[j]);
        }
        blob = new Blob([await doc.save()], { type: "application/pdf" });
      } else if (e === "jpg" || e === "jpeg" || e === "png" || e === "webp" || e === "bmp" || e === "gif") {
        st("Stacking " + list.length + " images vertically…");
        var r = await stackImages(list, e);
        blob = r.blob;
        if (r.outExt !== e) note = "This browser cannot encode ." + e + " — the merged image is saved as ." + r.outExt + ".";
        e = r.outExt;
      } else if (e === "wav") {
        var bufs = [];
        for (i = 0; i < list.length; i++) { st("Decoding " + list[i].name + "…"); bufs.push(u8(await ab(list[i]))); }
        var w = wavMerge(bufs);
        if (!w) throw new Error("These WAV files could not be joined — MERGE supports standard PCM WAV files of the same format (same channels, sample rate and bit depth).");
        blob = new Blob([w], { type: "audio/wav" });
      } else if (e === "mp3") {
        var chunks = [];
        for (i = 0; i < list.length; i++) { st("Reading " + list[i].name + "…");
          chunks.push(mp3Trim(u8(await ab(list[i])))); }
        var total3 = 0; chunks.forEach(function (c) { total3 += c.length; });
        var out3 = new Uint8Array(total3), o3 = 0;
        chunks.forEach(function (c) { out3.set(c, o3); o3 += c.length; });
        blob = new Blob([out3], { type: "audio/mpeg" });
        note = "MP3 audio is joined as one continuous stream (tags stripped from parts 2+).";
      } else {
        st("MERGE cannot join ." + e + " files in the browser. Supported: text/code, csv, tsv, json, pdf, jpg, png, webp, wav, mp3.", "err");
        runBtn.disabled = false; return;
      }
      outBlob = blob; outName = "merged." + e;
      outinfo.textContent = outName + " · " + fb(blob.size) + (note ? " · " + note : "");
      outcard.hidden = false;
      st("Merged " + list.length + " files into " + outName + ".", "ok");
    } catch (err) { st("Could not merge: " + (err && err.message ? err.message : err), "err"); }
    runBtn.disabled = false;
  };

  dlBtn.onclick = function () {
    if (!outBlob) return;
    var a = document.createElement("a");
    a.href = blobUrl(outBlob); a.download = outName;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  };
})();

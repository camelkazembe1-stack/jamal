
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
  var imgopts = $("imgopts"), imgLayout = $("img-layout"), imgWidth = $("img-width"), imgPdf = $("img-pdf");
  var outprev = $("outprev");
  var outBlob = null, outName = "", prevUrl = null;
  var IMG_EXTS = ["jpg", "jpeg", "png", "webp", "bmp", "gif"];

  drop.onclick = function () { fileIn.click(); };
  drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = function () { drop.classList.remove("over"); };
  drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove("over");
    if (e.dataTransfer.files.length) { fileIn.files = e.dataTransfer.files; show(); } };
  fileIn.onchange = show;

  function show() {
    ul.innerHTML = ""; outcard.hidden = true; outBlob = null; outName = "";
    clearPreview();
    if (imgopts) imgopts.hidden = true;
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
      if (imgopts && IMG_EXTS.indexOf(kinds[0]) !== -1) imgopts.hidden = false;
    }
  }

  /* ---------- live preview of the merged result ---------- */
  function clearPreview() {
    if (prevUrl) { try { URL.revokeObjectURL(prevUrl); } catch (er) {} prevUrl = null; }
    if (outprev) { outprev.innerHTML = ""; outprev.hidden = true; }
  }
  function showPreview(blob, e) {
    if (!outprev) return;
    clearPreview();
    if (e !== "pdf" && IMG_EXTS.indexOf(e) === -1) return;
    prevUrl = URL.createObjectURL(blob);
    if (e === "pdf") {
      var fr = document.createElement("iframe");
      fr.src = prevUrl; fr.title = "Merged PDF preview";
      outprev.appendChild(fr);
      var cap = document.createElement("div"); cap.className = "t-prevcap";
      cap.textContent = "Live preview — every image sits on its own full page. Download for the real file.";
      outprev.appendChild(cap);
    } else {
      var im = document.createElement("img");
      im.src = prevUrl; im.alt = "Merged image preview";
      im.title = "Tap to open the full-size image in a new tab";
      im.style.cursor = "zoom-in";
      im.onclick = function () { window.open(prevUrl, "_blank"); };
      outprev.appendChild(im);
      var cap2 = document.createElement("div"); cap2.className = "t-prevcap";
      cap2.textContent = "Live preview — scroll to check every part. Tap the image for 1:1 size in a new tab. The downloaded file is full size.";
      outprev.appendChild(cap2);
    }
    outprev.hidden = false;
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
      var u = URL.createObjectURL(blob);
      var im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); res(im); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("cannot decode this image")); };
      im.src = u;
    });
  }

  /* Decode a JPEG's EXIF orientation (1 = normal). The browser applies it when an
     <img> is drawn on a canvas, but raw embedding into a PDF does not — we use this
     to decide when a phone photo must be re-encoded so it does not come out sideways. */
  function jpgOrientation(u) {
    if (!u || u.length < 4 || u[0] !== 0xff || u[1] !== 0xd8) return 1;
    var o = 2;
    while (o + 4 <= u.length) {
      if (u[o] !== 0xff) { o++; continue; }
      var m = u[o + 1];
      if (m === 0xff) { o++; continue; }
      if (m === 0x01 || m === 0xd8 || (m >= 0xd0 && m <= 0xd7)) { o += 2; continue; }
      if (m === 0xd9 || m === 0xda) break;
      var len = (u[o + 2] << 8) | u[o + 3];
      if (len < 2) return 1;
      if (m === 0xe1 && o + 10 <= u.length && u[o + 4] === 0x45 && u[o + 5] === 0x78 &&
          u[o + 6] === 0x69 && u[o + 7] === 0x66 && u[o + 8] === 0x00) {
        var t = o + 10;
        if (t + 8 > u.length) return 1;
        var le = (u[t] === 0x49 && u[t + 1] === 0x49); /* "II" = little endian */
        function g16(p) { return le ? (u[p] | (u[p + 1] << 8)) : ((u[p] << 8) | u[p + 1]); }
        function g32(p) { return le ? ((u[p] | (u[p + 1] << 8) | (u[p + 2] << 16) | (u[p + 3] << 24)) >>> 0)
          : (((u[p] << 24) | (u[p + 1] << 16) | (u[p + 2] << 8) | u[p + 3]) >>> 0); }
        var ifd = t + g32(t + 4);
        if (ifd + 2 > u.length) return 1;
        var n = g16(ifd), k, en;
        for (k = 0; k < n && ifd + 2 + k * 12 + 8 <= u.length; k++) {
          en = ifd + 2 + k * 12;
          if (g16(en) === 0x0112) { var v = g16(en + 8); return (v >= 1 && v <= 8) ? v : 1; }
        }
        return 1;
      }
      o += 2 + len;
    }
    return 1;
  }

  /* Build one merged sheet. Every image is first scaled to a COMMON width (or
     common height / grid cell) so nothing ends up small in a corner of a huge
     canvas — the old raw-pixel stacking is what made results look squeezed.
     Positions are accumulated while placing, so tiles always sit flush. */
  var MAXPX = 16000000;  /* canvas pixel budget that even a phone can draw */
  var MAXSIDE = 16384;   /* phone GPU texture limit - a sheet taller/wider than this will not open in a gallery app */
  async function decodeAll(fs) {
    var imgs = [], i;
    for (i = 0; i < fs.length; i++) {
      st("Decoding " + fs[i].name + " (" + (i + 1) + "/" + fs.length + ")…");
      imgs.push(await loadImg(fs[i]));
    }
    return imgs;
  }
  function planLayout(imgs, opts) {
    var i;
    var maxW = 0;
    for (i = 0; i < imgs.length; i++) maxW = Math.max(maxW, imgs[i].naturalWidth || 1);
    function makeLayout(TW, THx) {
      var items = [], W = Math.max(1, TW), H = 1, i, s, w, h;
      if (opts.layout === "horizontal") {
        var TH = THx || imgs[0].naturalHeight || 1;
        if (!THx) for (i = 0; i < imgs.length; i++) TH = Math.min(TH, imgs[i].naturalHeight || TH);
        var x = 0;
        for (i = 0; i < imgs.length; i++) {
          s = TH / (imgs[i].naturalHeight || 1);
          w = Math.max(1, Math.round(imgs[i].naturalWidth * s));
          items.push({ im: imgs[i], x: x, y: 0, w: w, h: TH });
          x += w;
        }
        W = Math.max(1, x); H = TH;
      } else if (opts.layout === "grid2" || opts.layout === "grid3") {
        var cols = opts.layout === "grid2" ? 2 : 3;
        var cw = Math.max(1, Math.floor(TW / cols));
        var hs = [];
        for (i = 0; i < imgs.length; i++) {
          hs.push(Math.max(1, Math.round(imgs[i].naturalHeight * cw / Math.max(1, imgs[i].naturalWidth))));
        }
        var y = 0, r = 0, rh, c;
        while (r * cols < imgs.length) {
          rh = 0;
          for (c = r * cols; c < Math.min((r + 1) * cols, imgs.length); c++) rh = Math.max(rh, hs[c]);
          for (c = r * cols; c < Math.min((r + 1) * cols, imgs.length); c++) {
            items.push({ im: imgs[c], x: (c % cols) * cw, y: y, w: cw, h: hs[c] });
          }
          y += rh; r++;
        }
        W = Math.max(1, TW); H = Math.max(1, y);
      } else { /* vertical — every image at the same width, stacked edge-to-edge */
        var y2 = 0;
        for (i = 0; i < imgs.length; i++) {
          s = TW / Math.max(1, imgs[i].naturalWidth);
          h = Math.max(1, Math.round(imgs[i].naturalHeight * s));
          items.push({ im: imgs[i], x: 0, y: y2, w: Math.max(1, TW), h: h });
          y2 += h;
        }
        H = Math.max(1, y2);
      }
      return { items: items, W: W, H: H };
    }
    var TW = (opts.width === "orig") ? maxW
      : Math.max(1, Math.min(parseInt(opts.width, 10) || maxW, maxW)); /* never upscale past the widest original */
    var lay = makeLayout(TW, 0), note = "";
    if (lay.W * lay.H > MAXPX) {
      var sc = Math.sqrt(MAXPX / (lay.W * lay.H));
      if (opts.layout === "horizontal") {
        var TH2 = Math.max(1, Math.floor(lay.H * sc));
        lay = makeLayout(TW, TH2);
        while (lay.W * lay.H > MAXPX && TH2 > 1) {
          sc = Math.sqrt(MAXPX / (lay.W * lay.H));
          TH2 = Math.max(1, Math.floor(TH2 * sc));
          lay = makeLayout(TW, TH2);
        }
      } else {
        TW = Math.max(1, Math.floor(TW * sc));
        lay = makeLayout(TW, 0);
        while (lay.W * lay.H > MAXPX && TW > 1) {
          sc = Math.sqrt(MAXPX / (lay.W * lay.H));
          TW = Math.max(1, Math.floor(TW * sc));
          lay = makeLayout(TW, 0);
        }
      }
      note = "The joined sheet was larger than this device can draw, so it was scaled to " + lay.W + "×" + lay.H + " px.";
    }
    return { lay: lay, TW: TW, note: note };
  }
  async function drawLayout(lay, mime) {
    var cv = document.createElement("canvas"); cv.width = lay.W; cv.height = lay.H;
    var ctx = cv.getContext("2d");
    if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, lay.W, lay.H); }
    for (var i = 0; i < lay.items.length; i++) {
      ctx.drawImage(lay.items[i].im, lay.items[i].x, lay.items[i].y, lay.items[i].w, lay.items[i].h);
    }
    var blob = await new Promise(function (res) { cv.toBlob(res, mime, 0.92); });
    if (!blob) throw new Error("this browser cannot encode this image format");
    return blob;
  }
  async function buildImage(fs, opts) {
    var imgs = await decodeAll(fs);
    var p = planLayout(imgs, opts);
    var blob = await drawLayout(p.lay, opts.mime);
    return { blob: blob, outExt: opts.outExt, note: p.note };
  }

  /* one image → one embedded PDF page (orientation-safe) */
  async function pdfImage(doc, f, e) {
    var bytes = u8(await ab(f));
    if ((e === "jpg" || e === "jpeg") && jpgOrientation(bytes) === 1) return doc.embedJpg(bytes);
    if (e === "png") return doc.embedPng(bytes);
    /* rotated phone photo, gif, bmp, webp… — decode + re-encode through the canvas,
       which applies the EXIF rotation for us */
    var im = await loadImg(f);
    var cv = document.createElement("canvas");
    cv.width = Math.max(1, im.naturalWidth); cv.height = Math.max(1, im.naturalHeight);
    var ctx = cv.getContext("2d");
    if (e === "jpg" || e === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.drawImage(im, 0, 0);
    if (e === "jpg" || e === "jpeg") {
      var jb = await new Promise(function (res) { cv.toBlob(res, "image/jpeg", 0.92); });
      return doc.embedJpg(u8(await jb.arrayBuffer()));
    }
    var pb = await new Promise(function (res) { cv.toBlob(res, "image/png"); });
    return doc.embedPng(u8(await pb.arrayBuffer()));
  }
  async function imagesToPdf(list, e) {
    if (!window.PDFLib) throw new Error("pdf-lib engine not loaded — reconnect and reload the page.");
    var doc = await PDFLib.PDFDocument.create();
    for (var i = 0; i < list.length; i++) {
      st("Placing " + list[i].name + " on page " + (i + 1) + "/" + list.length + "…");
      var img = await pdfImage(doc, list[i], e);
      var page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    return new Blob([await doc.save()], { type: "application/pdf" });
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
    outcard.hidden = true; outBlob = null; clearPreview();
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
      } else if (IMG_EXTS.indexOf(e) !== -1) {
        if (imgPdf && imgPdf.checked) {
          st("Building the PDF — one image per full page…");
          blob = await imagesToPdf(list, e);
          note = "Images saved as a PDF — each one fills its own page, easy to read without zooming.";
          e = "pdf";
        } else {
          var mime = (e === "webp") ? "image/webp" : (e === "jpg" || e === "jpeg") ? "image/jpeg" : "image/png";
          var outExt = (e === "webp") ? "webp" : (e === "jpg" || e === "jpeg") ? "jpg" : "png";
          st("Joining " + list.length + " images (" + imgLayout.options[imgLayout.selectedIndex].text.toLowerCase() + ")…");
          var imgs = await decodeAll(list);
          var p = planLayout(imgs, { layout: imgLayout.value, width: imgWidth.value, mime: mime, outExt: outExt });
          var tooBig = Math.max(p.lay.W, p.lay.H) > MAXSIDE;
          if (tooBig && window.PDFLib) {
            /* A sheet over the phone limit would never open in a gallery app —
               give something readable instead: one full PDF page per image. */
            st("The joined image would be " + p.lay.W + "×" + p.lay.H + " px — taller than a phone can display. Building a PDF instead…");
            blob = await imagesToPdf(list, e);
            note = "The joined image would be " + p.lay.W + "×" + p.lay.H + " px — over the " + MAXSIDE + " px phone limit — so every image was placed on its own full PDF page instead (easy to read, opens everywhere). Want an image file after all? Pick a smaller Page width or merge fewer pages at a time.";
            e = "pdf";
          } else {
            blob = await drawLayout(p.lay, mime);
            if (p.note) note = p.note;
            if (tooBig) note = (note ? note + " " : "") + "Careful: the sheet is " + p.lay.W + "×" + p.lay.H + " px — bigger than most phones can display.";
            if (outExt !== e) note = (note ? note + " " : "") + "This browser cannot encode ." + e + " — the merged image is saved as ." + outExt + ".";
            e = outExt;
          }
        }
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
      showPreview(blob, e);
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

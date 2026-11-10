
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
  function rtxt(file) { return new Promise(function (res, rej) { var r = new FileReader();
    r.onload = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    r.readAsText(file); }); }
  function ext(n) { var i = n.lastIndexOf("."); return i < 0 ? "" : n.slice(i + 1).toLowerCase(); }
  function base(n) { var i = n.lastIndexOf("."); return i < 0 ? n : n.slice(0, i); }
  function pad(n, w) { var s = String(n); while (s.length < w) s = "0" + s; return s; }

  var drop = $("drop"), fileIn = $("file"), runBtn = $("run"), ul = $("files");
  var opts = $("opts"), dlallRow = $("dlall-row"), dlallBtn = $("dlall");
  var results = [];

  drop.onclick = function () { fileIn.click(); };
  drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = function () { drop.classList.remove("over"); };
  drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove("over");
    if (e.dataTransfer.files.length) { fileIn.files = e.dataTransfer.files; show(); } };
  fileIn.onchange = show;

  function show() {
    ul.innerHTML = ""; results = []; dlallRow.hidden = true;
    var f = fileIn.files && fileIn.files[0];
    if (!f) { opts.hidden = true; runBtn.disabled = true; st(""); return; }
    var e = ext(f.name);
    var mode;
    if (e === "csv" || e === "tsv") mode = "csv";
    else if (e === "pdf") mode = "pdf";
    else if (["jpg","jpeg","png","webp","bmp","gif"].indexOf(e) !== -1) mode = "img";
    else mode = "text";
    var isTexty = mode === "text";
    if (isTexty && !isProbablyText(f)) mode = "bin";
    ["opt-text","opt-csv","opt-pdf","opt-img","opt-bin"].forEach(function (id) { $(id).style.display = "none"; });
    if (mode === "csv") $("opt-csv").style.display = "";
    else if (mode === "pdf") $("opt-pdf").style.display = "";
    else if (mode === "img") $("opt-img").style.display = "";
    else if (mode === "bin") $("opt-bin").style.display = "";
    else $("opt-text").style.display = "";
    opts.hidden = false; runBtn.disabled = false;
    var msg = f.name + " · " + fb(f.size) + " · extension ." + (e || "(none)") + " — ";
    if (mode === "csv") msg += "will split by rows (header kept in each part if ticked).";
    else if (mode === "pdf") msg += "will split by pages.";
    else if (mode === "img") msg += "will cut the image into horizontal strips of the same format.";
    else if (mode === "bin") msg += "binary file — will split into byte chunks you can re-join with MERGE.";
    else msg += "will split by lines.";
    st(msg);
    runBtn.dataset.mode = mode;
  }

  function isProbablyText(f) {
    var e = ext(f.name);
    var t = (f.type || "").toLowerCase();
    if (t.indexOf("text/") === 0 || /json|xml|javascript|csv|yaml/.test(t)) return true;
    var textExt = ["txt","md","markdown","log","html","htm","xhtml","css","js","mjs","ts","jsx","tsx","py","java","c","h","cpp","hpp","cs","php","rb","go","rs","sh","bash","bat","cmd","ps1","sql","yml","yaml","toml","ini","cfg","conf","env","srt","vtt","tex","rtf"];
    return textExt.indexOf(e) !== -1;
  }

  function addResult(name, blob, meta) {
    results.push({ name: name, blob: blob });
    var li = document.createElement("li");
    var b = document.createElement("button");
    b.type = "button"; b.textContent = "Download";
    b.addEventListener("click", function () { dlOne(name, blob); });
    var sp = document.createElement("span");
    sp.innerHTML = "<span>" + esc(name) + (meta ? " <i>(" + esc(meta) + ")</i>" : "") + "</span><span>" + fb(blob.size) + "</span>";
    li.appendChild(sp); li.appendChild(b);
    ul.appendChild(li);
  }
  function dlOne(name, blob) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  dlallBtn.onclick = async function () {
    dlallBtn.disabled = true;
    for (var i = 0; i < results.length; i++) {
      dlOne(results[i].name, results[i].blob);
      await new Promise(function (r) { setTimeout(r, 300); });
    }
    dlallBtn.disabled = false;
  };

  runBtn.onclick = async function () {
    var f = fileIn.files && fileIn.files[0];
    if (!f) { st("Choose a file first.", "warn"); return; }
    var mode = runBtn.dataset.mode || "text";
    var e = ext(f.name), b = base(f.name);
    ul.innerHTML = ""; results = []; dlallRow.hidden = true;
    runBtn.disabled = true;
    try {
      if (mode === "csv") {
        var per = Math.max(1, parseInt($("rows").value, 10) || 500);
        var t = await rtxt(f);
        if (!t) throw new Error("file is empty");
        var lines = t.replace(/\r/g, "").split("\n");
        if (lines[lines.length - 1] === "") lines.pop();
        if (lines.length < 2) throw new Error("csv needs a header and at least one data row");
        var header = lines[0], body = lines.slice(1);
        var parts = Math.ceil(body.length / per);
        for (var i = 0; i < parts; i++) {
          st("Building part " + (i + 1) + "/" + parts + "…");
          var chunk = body.slice(i * per, (i + 1) * per).join("\n");
          var txt = ($("keephdr").checked ? header + "\n" : "") + chunk + "\n";
          var name = b + "-part-" + pad(i + 1, String(parts).length) + "." + e;
          addResult(name, new Blob([txt], { type: "text/plain" }), "rows " + (i * per + 1) + "–" + Math.min((i + 1) * per, body.length));
        }
      } else if (mode === "pdf") {
        if (!window.PDFLib) throw new Error("pdf-lib engine not loaded — reconnect and reload the page.");
        var perp = Math.max(1, parseInt($("pages").value, 10) || 1);
        st("Reading PDF…");
        var src = await PDFLib.PDFDocument.load(new Uint8Array(await f.arrayBuffer()), { ignoreEncryption: true });
        var n = src.getPageCount(), parts2 = Math.ceil(n / perp);
        for (var i2 = 0; i2 < parts2; i2++) {
          st("Building part " + (i2 + 1) + "/" + parts2 + "…");
          var doc = await PDFLib.PDFDocument.create();
          var from = i2 * perp, to = Math.min((i2 + 1) * perp, n) - 1;
          var idxs = []; for (var k = from; k <= to; k++) idxs.push(k);
          var pages = await doc.copyPages(src, idxs);
          for (var j = 0; j < pages.length; j++) doc.addPage(pages[j]);
          var bytes = await doc.save();
          addResult(b + "-part-" + pad(i2 + 1, String(parts2).length) + "." + e, new Blob([bytes], { type: "application/pdf" }), "pages " + (from + 1) + "–" + (to + 1));
        }
      } else if (mode === "img") {
        var n3 = Math.min(20, Math.max(2, parseInt($("strips").value, 10) || 4));
        st("Loading image…");
        var im = await new Promise(function (res, rej) { var g = new Image();
          g.onload = function () { res(g); }; g.onerror = function () { rej(new Error("cannot decode this image")); };
          g.src = URL.createObjectURL(f); });
        var w = im.naturalWidth, h = im.naturalHeight;
        var step = Math.floor(h / n3) || 1;
        var mime = (e === "webp") ? "image/webp" : (e === "jpg" || e === "jpeg") ? "image/jpeg" : (e === "gif" || e === "bmp" || e === "png") ? "image/png" : "image/png";
        var outExt = (e === "webp") ? "webp" : (e === "jpg" || e === "jpeg") ? "jpg" : "png";
        var note = outExt !== e ? " (saved as ." + outExt + " — this browser cannot encode ." + e + ")" : "";
        for (var i3 = 0; i3 < n3; i3++) {
          st("Cutting strip " + (i3 + 1) + "/" + n3 + "…");
          var y0 = i3 * step;
          var hh = (i3 === n3 - 1) ? (h - y0) : step;
          if (hh <= 0) break;
          var cv = document.createElement("canvas"); cv.width = w; cv.height = hh;
          var ctx = cv.getContext("2d");
          if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, hh); }
          ctx.drawImage(im, 0, y0, w, hh, 0, 0, w, hh);
          var blob = await new Promise(function (res) { cv.toBlob(res, mime, 0.92); });
          if (!blob) throw new Error("this browser cannot encode ." + outExt + " images");
          addResult(b + "-part-" + pad(i3 + 1, String(n3).length) + "." + outExt, blob, hh + "px tall" + note);
        }
      } else if (mode === "bin") {
        var mb = parseFloat($("mb").value) || 5;
        var perb = Math.max(1, Math.round(mb * 1048576));
        var n4 = Math.ceil(f.size / perb);
        if (n4 > 500) throw new Error("that would create " + n4 + " parts — raise the chunk size");
        for (var i4 = 0; i4 < n4; i4++) {
          st("Slicing chunk " + (i4 + 1) + "/" + n4 + "…");
          var s4 = i4 * perb, e4 = Math.min((i4 + 1) * perb, f.size);
          addResult(b + ".part-" + pad(i4 + 1, String(n4).length) + "." + (e || "bin"),
            fileIn.files[0].slice(s4, e4), fb(e4 - s4));
        }
        st(n4 + " chunks created — re-join them (in order, byte-exact) with MERGE by selecting the .part files and merging.", "ok");
      } else {
        var perl = Math.max(1, parseInt($("lines").value, 10) || 200);
        var t5 = await rtxt(f);
        if (!t5) throw new Error("file is empty");
        var ls = t5.replace(/\r/g, "").split("\n");
        if (ls[ls.length - 1] === "") ls.pop();
        var parts5 = Math.ceil(ls.length / perl);
        if (parts5 > 500) throw new Error("that would create " + parts5 + " parts — raise lines per part");
        for (var i5 = 0; i5 < parts5; i5++) {
          st("Building part " + (i5 + 1) + "/" + parts5 + "…");
          var chunk5 = ls.slice(i5 * perl, (i5 + 1) * perl).join("\n") + "\n";
          addResult(b + "-part-" + pad(i5 + 1, String(parts5).length) + "." + (e || "txt"),
            new Blob([chunk5], { type: "text/plain" }), "lines " + (i5 * perl + 1) + "–" + Math.min((i5 + 1) * perl, ls.length));
        }
      }
      if (results.length) {
        dlallRow.hidden = false;
        st(results.length + " part(s) created — every part keeps the ." + (ext(results[0].name) || "bin") + " extension. Download one by one or grab all.", "ok");
      }
    } catch (err) { st("Could not split: " + (err && err.message ? err.message : err), "err"); }
    runBtn.disabled = false;
  };
})();

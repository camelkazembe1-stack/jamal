/* JAMALI — page 157 · PPTX to Video — the tool's own engine.
   Convertor tool #93 (Presentation Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   text slides are drawn on a canvas and recorded to a WebM video*/
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
    async function slideTexts(file) {
      var zip = await JSZip.loadAsync(await ab(file));
      var names = Object.keys(zip.files).filter(function (p) { return /^ppt\/slides\/slide\d+\.xml$/.test(p); })
        .sort(function (a, b) { return (parseInt(a.match(/(\d+)/)[1], 10)) - (parseInt(b.match(/(\d+)/)[1], 10)); });
      var out = [];
      for (var i = 0; i < names.length; i++) {
        var xml = await zip.files[names[i]].async("string");
        var doc = new DOMParser().parseFromString(xml, "application/xml");
        var ts = Array.prototype.map.call(doc.getElementsByTagNameNS("*", "t"), function (el) { return el.textContent; }).join("\n");
        out.push(ts);
      }
      return out;
    }
    async function slideMedia(file) {
      var zip = await JSZip.loadAsync(await ab(file));
      var names = Object.keys(zip.files).filter(function (p) { return /^ppt\/media\//.test(p); });
      var out = [];
      for (var i = 0; i < names.length; i++) {
        var blob = await zip.files[names[i]].async("blob");
        out.push({ name: names[i].split("/").pop(), blob: blob });
      }
      return out;
    }
    function guard() { if (!window.JSZip) { libFail("JSZip"); return false; } return true; }

  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    if (!guard()) return;
    if (!window.MediaRecorder) { st("This browser cannot record video.", "err"); return; }
    try {
      var texts = await slideTexts(f);
      if (!texts.length) { st("No slides found.", "warn"); return; }
      var secs = Math.min(15, Math.max(1, parseFloat($("secs").value) || 3));
      var cv = document.createElement("canvas"); cv.width = 1280; cv.height = 720;
      var ctx = cv.getContext("2d");
      function draw(txt) {
        ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = "#0d9488"; ctx.fillRect(0, 0, 1280, 8);
        ctx.fillStyle = "#f8fafc";
        ctx.font = "600 40px system-ui, sans-serif";
        var lines = (txt || "(empty slide)").split("\n");
        var y = 140;
        lines.forEach(function (ln) {
          if (ctx.measureText(ln).width > 1160) { ln = ln.slice(0, 55) + "…"; }
          ctx.fillText(ln, 80, y); y += 64;
        });
        ctx.fillStyle = "#64748b"; ctx.font = "500 22px system-ui, sans-serif";
        ctx.fillText("JAMALI Convertor", 80, 680);
      }
      draw(texts[0]);
      var stream = cv.captureStream(24);
      var mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
        .filter(function (m) { return MediaRecorder.isTypeSupported(m); })[0];
      if (!mime) { st("No WebM encoder available in this browser.", "err"); return; }
      var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 });
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
      var done = new Promise(function (res) { rec.onstop = res; });
      rec.start(250);
      st("Recording " + texts.length + " slide(s) x " + secs + "s — keep this tab visible…");
      var idx = 0;
      var timer = setInterval(function () {
        idx++;
        if (idx >= texts.length) { clearInterval(timer); setTimeout(function () { rec.stop(); }, 400); return; }
        draw(texts[idx]);
      }, secs * 1000);
      await done;
      var blob = new Blob(chunks, { type: "video/webm" });
      dl(blob, f.name.replace(/\.[^.]+$/, "") + ".webm");
      st(f.name.replace(/\.[^.]+$/, "") + ".webm created · " + fb(blob.size) + " · " + (texts.length * secs) + "s.", "ok");
    } catch (e) { st("Could not record: " + e.message, "err"); }
  };

})();

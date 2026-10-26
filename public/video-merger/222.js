/* JAMALI — page 222 · Video Merger — the tool's own engine.
   Convertor tool #158 (Video Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   clips play back-to-back on one canvas and are recorded in one pass*/
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
    function pickMime(list) {
      if (!window.MediaRecorder) return "";
      for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
      return "";
    }
    function loadVideo(file) {
      return new Promise(function (res, rej) {
        var v = document.createElement("video");
        v.muted = true; v.playsInline = true; v.preload = "auto";
        var url = URL.createObjectURL(file);
        v.src = url;
        v.onloadedmetadata = function () { res(v); };
        v.onerror = function () { rej(new Error("this browser cannot decode that video")); };
      });
    }
    function seek(v, t) {
      return new Promise(function (res) {
        if (Math.abs(v.currentTime - t) < 0.01) return res();
        var h = function () { v.removeEventListener("seeked", h); res(); };
        v.addEventListener("seeked", h);
        v.currentTime = Math.min(t, v.duration - 0.01);
      });
    }
    function recordCanvas(canvas, stream, mimes, vps) {
      var mime = pickMime(mimes);
      if (!mime) throw new Error("no video encoder available in this browser");
      var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: vps || 4000000 });
      var chunks = [];
      rec._chunks = chunks;
      rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
      rec._stopWait = new Promise(function (res) { rec.onstop = res; });
      rec._mime = mime;
      return rec;
    }
    function audioTracksFor(v, stream) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        var ctx = new AC();
        var src = ctx.createMediaElementSource(v);
        var dest = ctx.createMediaStreamDestination();
        src.connect(dest);
        dest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
        return ctx;
      } catch (e) { return null; }
    }
    function extOf(mime) { return /mp4/.test(mime) ? ".mp4" : ".webm"; }
    function noteMime(mime) {
      return /mp4/.test(mime)
        ? "encoded as MP4 (H.264/AAC)"
        : "encoded as WebM (VP8/VP9 + Opus) — the browser's native container";
    }

  $("run").onclick = async function () {
    var fs = allFiles("file"); if (!fs) return;
    if (fs.length < 2) { st("Pick at least two videos.", "warn"); return; }
    try {
      var videos = [];
      for (var i = 0; i < fs.length; i++) { videos.push(await loadVideo(fs[i])); }
      var w = 1280, h = Math.round(w * videos[0].videoHeight / videos[0].videoWidth);
      var canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(videos[0], 0, 0, w, h);
      var stream = canvas.captureStream(30);
      var actx = audioTracksFor(videos[0], stream);
      var rec = recordCanvas(canvas, stream, ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"], 4000000);
      rec.start(300);
      st("Recording " + videos.length + " clip(s) back-to-back — keep the tab visible…");
      var idx = 0;
      async function playNext() {
        if (idx >= videos.length) { setTimeout(function () { rec.stop(); }, 300); return; }
        var v = videos[idx];
        if (idx > 0 && actx) { try { audioTracksFor(v, stream); } catch (e) {} }
        v.currentTime = 0;
        await v.play();
        (function frame() {
          if (v.ended || v.paused) return;
          ctx.drawImage(v, 0, 0, w, h);
          requestAnimationFrame(frame);
        })();
        v.onended = function () { idx++; playNext(); };
      }
      await playNext();
      await rec._stopWait;
      var blob = new Blob(recOnData(rec), { type: rec._mime.split(";")[0] });
      dl(blob, "merged.webm");
      st("merged.webm saved · " + fs.length + " clips · " + fb(blob.size) + ".", "ok");
    } catch (e) { st("Could not merge: " + e.message, "err"); }
  };

})();

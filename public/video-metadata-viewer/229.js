 
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

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  $("run").onclick = async function () {
    var f = oneFile("file"); if (!f) return;
    try {
      var v = await loadVideo(f);
      var g = gcd(v.videoWidth, v.videoHeight) || 1;
      var rows = [
        ["File name", f.name], ["Container type", f.type || "(not reported)"], ["File size", fb(f.size)],
        ["Duration", Math.floor(v.duration / 60) + ":" + String(Math.round(v.duration % 60)).padStart(2, "0") + " (" + v.duration.toFixed(2) + "s)"],
        ["Resolution", v.videoWidth + " × " + v.videoHeight],
        ["Aspect ratio", (v.videoWidth / g) + ":" + (v.videoHeight / g)],
        ["Effective bitrate", Math.round(f.size * 8 / v.duration / 1000) + " kbps"],
        ["Last modified", new Date(f.lastModified).toLocaleString()],
      ];
      var kv = $("kv");
      kv.innerHTML = rows.map(function (r) { return "<tr><th>" + esc(r[0]) + "</th><td><b>" + esc(r[1]) + "</b></td></tr>"; }).join("");
      kv.hidden = false;
      st("Metadata read — the browser can decode this file.", "ok");
    } catch (e) { st("Could not read: " + e.message, "err"); }
  };

})();

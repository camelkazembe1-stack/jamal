/* JAMALI — page 198 · WAV to FLAC — the tool's own engine.
   Convertor tool #134 (Audio Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   honest engine: no browser FLAC encoder — nearest exports offered*/
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
    async function decodeAudio(file) {
      var AC = window.AudioContext || window.webkitAudioContext;
      var ctx = new AC();
      try {
        return await ctx.decodeAudioData(await ab(file));
      } finally { if (ctx.close) ctx.close(); }
    }
    function wavBlob(buf) {
      var nch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
      var bytes = 44 + len * nch * 2;
      var abuf = new ArrayBuffer(bytes), v = new DataView(abuf);
      function ws(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
      ws(0, "RIFF"); v.setUint32(4, bytes - 8, true); ws(8, "WAVE"); ws(12, "fmt ");
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nch, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * nch * 2, true);
      v.setUint16(32, nch * 2, true); v.setUint16(34, 16, true);
      ws(36, "data"); v.setUint32(40, len * nch * 2, true);
      var chs = [], c;
      for (c = 0; c < nch; c++) chs.push(buf.getChannelData(c));
      var o = 44, i, s;
      for (i = 0; i < len; i++) {
        for (c = 0; c < nch; c++) {
          s = Math.max(-1, Math.min(1, chs[c][i]));
          v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true); o += 2;
        }
      }
      return new Blob([abuf], { type: "audio/wav" });
    }
    async function mp3Blob(buf, kbps) {
      if (!window.lamejs) { libFail("lamejs"); return null; }
      var nch = Math.min(2, buf.numberOfChannels);
      var enc = new lamejs.Mp3Encoder(nch, buf.sampleRate, kbps || 128);
      function i16(f) {
        var out = new Int16Array(f.length);
        for (var i = 0; i < f.length; i++) {
          var s = Math.max(-1, Math.min(1, f[i]));
          out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return out;
      }
      var L = i16(buf.getChannelData(0));
      var R = nch > 1 ? i16(buf.getChannelData(1)) : null;
      var chunks = [], step = 1152;
      for (var i = 0; i < L.length; i += step) {
        var l = L.subarray(i, i + step);
        var d = nch > 1 ? enc.encodeBuffer(l, R.subarray(i, i + step)) : enc.encodeBuffer(l);
        if (d.length) chunks.push(new Int8Array(d));
      }
      var end = enc.flush();
      if (end.length) chunks.push(new Int8Array(end));
      return new Blob(chunks, { type: "audio/mpeg" });
    }
    function pickMime(list) {
      if (!window.MediaRecorder) return "";
      for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
      return "";
    }
    async function recordBuffer(buf, mimes) {
      var mime = pickMime(mimes);
      if (!mime) return null;
      var AC = window.AudioContext || window.webkitAudioContext;
      var ctx = new AC();
      var src = ctx.createBufferSource(); src.buffer = buf;
      var dest = ctx.createMediaStreamDestination();
      src.connect(dest);
      var rec = new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 128000 });
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
      var done = new Promise(function (res) { rec.onstop = res; });
      rec.start(250); src.start();
      await new Promise(function (res) { src.onended = res; });
      await new Promise(function (r) { setTimeout(r, 350); });
      rec.stop(); await done; ctx.close && ctx.close();
      return { blob: new Blob(chunks, { type: mime.split(";")[0] }), mime: mime };
    }
    function extOf(mime) {
      if (/mp4|aac/.test(mime)) return ".m4a";
      if (/ogg/.test(mime)) return ".ogg";
      return ".webm";
    }

  async function go(mode) {
    var f = oneFile("file"); if (!f) return;
    try {
      var buf = await decodeAudio(f);
      if (mode === "wav") { dl(wavBlob(buf), f.name.replace(/\.[^.]+$/, "") + ".wav"); st("WAV saved (already lossless).", "ok"); return; }
      var blob = await mp3Blob(buf, 192);
      if (!blob) return;
      dl(blob, f.name.replace(/\.[^.]+$/, "") + ".mp3");
      st("MP3 saved (" + fb(blob.size) + ").", "ok");
    } catch (e) { st("Could not convert: " + e.message, "err"); }
  }
  $("run-mp3").onclick = function () { go("mp3"); };
  $("run-wav").onclick = function () { go("wav"); };

})();

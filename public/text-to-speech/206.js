/* JAMALI — page 206 · Text to Speech — the tool's own engine.
   Convertor tool #142 (Audio Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   browser speech synthesis: voice, speed and pitch controls*/
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


  function fill() {
    var sel = $("voice"), vs = speechSynthesis.getVoices();
    sel.innerHTML = "";
    vs.forEach(function (v, i) {
      var o = document.createElement("option");
      o.value = i; o.textContent = v.name + " (" + v.lang + ")";
      sel.appendChild(o);
    });
    st(vs.length ? vs.length + " voice(s) available." : "Loading voices… (they arrive async)");
  }
  fill();
  speechSynthesis.onvoiceschanged = fill;
  $("rate").oninput = function () { $("rv").textContent = this.value; };
  $("pitch").oninput = function () { $("pv").textContent = this.value; };
  $("run").onclick = function () {
    var t = $("in").value.trim();
    if (!t) { st("Type something first.", "warn"); return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(t);
    var vs = speechSynthesis.getVoices();
    if (vs[$("voice").value]) u.voice = vs[$("voice").value];
    u.rate = +$("rate").value; u.pitch = +$("pitch").value;
    u.onend = function () { st("Finished speaking.", "ok"); };
    speechSynthesis.speak(u);
    st("Speaking…");
  };
  $("stop2").onclick = function () { speechSynthesis.cancel(); st("Stopped."); };

})();

 
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


  var rec = null, finalText = "";
  function SR() { return window.SpeechRecognition || window.webkitSpeechRecognition; }
  $("start").onclick = function () {
    if (!SR()) { st("This browser has no speech recognition (Chrome/Edge do).", "err"); return; }
    rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    finalText = ""; $("out").value = "";
    rec.onresult = function (e) {
      var interim = "";
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      $("out").value = (finalText + interim).trim();
    };
    rec.onerror = function (e) { st("Recognizer: " + e.error, e.error === "not-allowed" ? "err" : "warn"); };
    rec.onend = function () { if (rec && rec.running !== false) { try { rec.start(); } catch (x) {} } };
    try { rec.start(); st("Listening… speak now (the recognizer may need internet).", "ok"); }
    catch (e) { st("Could not start the recognizer: " + e.message, "err"); }
  };
  $("stop2").onclick = function () {
    if (rec) { rec.onend = null; rec.stop(); rec = null; st("Stopped. Copy or download your transcript.", "ok"); }
  };
  $("out").addEventListener("input", function () {});

})();

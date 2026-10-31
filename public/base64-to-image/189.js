 
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

  var DL_NAME = "image";
  $("copy").onclick = function () {
    var t = $("out").value; if (!t) { st("Nothing to copy yet.", "warn"); return; }
    navigator.clipboard && navigator.clipboard.writeText(t).then(function () { st("Copied to the clipboard.", "ok"); },
      function () { $("out").select(); document.execCommand("copy"); st("Copied.", "ok"); });
  };
  $("dl-txt").onclick = function () {
    var t = $("out").value; if (!t) { st("Nothing to download yet.", "warn"); return; }
    dl(new Blob([t], { type: "text/plain;charset=utf-8" }), DL_NAME);
    st("Saved " + DL_NAME + " (" + fb(t.length) + " of text).", "ok");
  };

  $("run").onclick = function () {
    var t = $("in").value.trim();
    if (!t) { st("Paste the base64 first.", "warn"); return; }
    try {
      var url = t.match(/^data:/i) ? t : "data:image/" + sniff(t) + ";base64," + t.replace(/\s+/g, "");
      var bin = atob(url.split(",")[1]);
      var u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      var mime = (url.match(/^data:([^;]+)/) || [])[1] || "image/png";
      var exts = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg" };
      DL_NAME = "image" + (exts[mime] || ".png");
      var blob = new Blob([u], { type: mime });
      if (blob.size < 8) { st("That base64 does not decode to an image.", "err"); return; }
      var urlObj = URL.createObjectURL(blob);
      var img = document.createElement("img");
      img.id = "img-prev"; img.style.display = "block";
      img.src = urlObj;
      var old = document.getElementById("img-prev");
      if (old) old.remove();
      $("out").after(img);
      dl(blob, DL_NAME);
      st("Decoded " + fb(blob.size) + " · " + mime + " · saved " + DL_NAME + ".", "ok");
    } catch (e) { st("Invalid base64: " + e.message, "err"); }
  };
  function sniff(b64) {
    var b = atob(b64.slice(0, 24));
    if (b[0] === "\u0089" && b[1] === "P") return "png";
    if (b[0] === "\u00ff" && b[1] === "\u00d8") return "jpeg";
    if (b[0] === "G") return "gif";
    return "png";
  }

})();

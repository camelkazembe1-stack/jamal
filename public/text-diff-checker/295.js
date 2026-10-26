/* JAMALI — page 295 · Text Diff Checker — the tool's own engine.
   Convertor tool #231 (Document and Office Utilities). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   line-by-line LCS diff, green added / red removed*/
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

  $("run").onclick = function () {
    var A = $("a").value.split("\n"), B = $("b").value.split("\n");
    var n = A.length, m = B.length;
    if (n * m > 2500000) { st("Texts too long to diff (over ~1500 lines each).", "warn"); return; }
    var dp = new Uint32Array((n + 1) * (m + 1));
    for (var i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--)
      dp[i * (m + 1) + j] = A[i] === B[j] ? dp[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
    var box = $("out"); box.innerHTML = "";
    var x = 0, y = 0, ins = 0, del = 0;
    while (x < n && y < m) {
      var el;
      if (A[x] === B[y]) { el = document.createElement("span"); el.className = "ctx"; el.textContent = "  " + A[x]; x++; y++; }
      else if (dp[(x + 1) * (m + 1) + y] >= dp[x * (m + 1) + y + 1]) { el = document.createElement("del"); el.textContent = "- " + A[x]; x++; del++; }
      else { el = document.createElement("ins"); el.textContent = "+ " + B[y]; y++; ins++; }
      box.appendChild(el);
    }
    while (x < n) { var e1 = document.createElement("del"); e1.textContent = "- " + A[x++]; box.appendChild(e1); del++; }
    while (y < m) { var e2 = document.createElement("ins"); e2.textContent = "+ " + B[y++]; box.appendChild(e2); ins++; }
    st(ins === 0 && del === 0 ? "Identical." : ins + " line(s) added, " + del + " removed.", ins || del ? "" : "ok");
  };

})();

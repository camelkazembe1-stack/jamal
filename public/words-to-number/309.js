/* JAMALI — page 309 · Words to Number — the tool's own engine.
   Convertor tool #245 (Number and Data Formats). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   English words parsed back into digits*/
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

    var W2N = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
      ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
      seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
      sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
    var MAG = { hundred: 100, thousand: 1000, million: 1e6, billion: 1e9, trillion: 1e12 };

  $("run").onclick = function () {
    var t = $("in").value.toLowerCase().replace(/-/g, " ").replace(/\band\b/g, " ").replace(/\s+/g, " ").trim();
    if (!t) { st("Type the words first.", "warn"); return; }
    var neg = /^minus |^negative /.test(t);
    t = t.replace(/^(minus|negative) /, "");
    var parts = t.split(" ");
    var total = 0, cur = 0, ok = true;
    parts.forEach(function (p) {
      if (W2N[p]) cur += W2N[p];
      else if (MAG[p]) {
        if (p === "hundred") cur *= 100;
        else { total += (cur || 1) * MAG[p]; cur = 0; }
      } else if (p) { ok = false; }
    });
    if (!ok) { st('Could not parse some words — check the input.', 'err'); return; }
    var n = (total + cur) * (neg ? -1 : 1);
    $("out").value = n.toLocaleString() + "  (" + n + ")";
    st("Parsed.", "ok");
  };

})();

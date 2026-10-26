/* JAMALI — page 242 · Markdown to HTML — the tool's own engine.
   Convertor tool #178 (Web and Code Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   mini markdown engine: headings, lists, fences, inline styles*/
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

  var DL_NAME = "doc.html";
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

    function inline(s) {
      return esc(s)
        .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '<img alt="$1" src="$2">')
        .replace(/\[([^\]]+)\]\(([^)]*)\)/g, '<a href="$2">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, "$1<em>$2</em>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
    }
    function md2html(src) {
      var lines = src.replace(/\r/g, "").split("\n");
      var out = [], i = 0, list = null;
      function closeList() { if (list) { out.push("</" + list + ">"); list = null; } }
      while (i < lines.length) {
        var l = lines[i];
        if (/^```/.test(l)) {
          closeList();
          var code = [];
          i++;
          while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
          i++;
          out.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>");
          continue;
        }
        var h = l.match(/^(#{1,6})\s+(.*)$/);
        if (h) { closeList(); out.push("<h" + h[1].length + ">" + inline(h[2]) + "</h" + h[1].length + ">"); i++; continue; }
        if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(l)) { closeList(); out.push("<hr>"); i++; continue; }
        if (/^>\s?/.test(l)) {
          closeList();
          var q = [];
          while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, "")); i++; }
          out.push("<blockquote>" + inline(q.join(" ")) + "</blockquote>");
          continue;
        }
        var ul = l.match(/^\s*[-*+]\s+(.*)$/);
        var ol = l.match(/^\s*\d+\.\s+(.*)$/);
        if (ul || ol) {
          var want = ul ? "ul" : "ol";
          if (list !== want) { closeList(); out.push("<" + want + ">"); list = want; }
          out.push("<li>" + inline((ul || ol)[1]) + "</li>");
          i++; continue;
        }
        if (!l.trim()) { closeList(); i++; continue; }
        closeList();
        var para = [l];
        i++;
        while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>\s?|\s*[-*+]\s|\s*\d+\.\s)/.test(lines[i])) { para.push(lines[i]); i++; }
        out.push("<p>" + inline(para.join(" ")) + "</p>");
      }
      closeList();
      return out.join("\n");
    }
  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste some markdown first.", "warn"); return; }
    var body = md2html(t);
    $("out").value = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<title>Document</title>\n</head>\n<body>\n" + body + "\n</body>\n</html>";
    st("HTML ready.", "ok");
  };

})();

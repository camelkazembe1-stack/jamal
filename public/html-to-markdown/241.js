/* JAMALI — page 241 · HTML to Markdown — the tool's own engine.
   Convertor tool #177 (Web and Code Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   headings, bold, italics, links, images, lists -> markdown*/
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

  var DL_NAME = "doc.md";
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

    function md(node) {
      var out = "";
      node.childNodes.forEach(function (ch) {
        if (ch.nodeType === 3) { out += ch.nodeValue.replace(/\s+/g, " "); return; }
        if (ch.nodeType !== 1) return;
        var tag = ch.tagName, inner = md(ch);
        if (/^H[1-6]$/.test(tag)) out += "\n\n" + "#".repeat(+tag[1]) + " " + inner.trim() + "\n\n";
        else if (tag === "STRONG" || tag === "B") out += "**" + inner.trim() + "**";
        else if (tag === "EM" || tag === "I") out += "*" + inner.trim() + "*";
        else if (tag === "CODE") out += "`" + inner.trim() + "`";
        else if (tag === "PRE") out += "\n```\n" + ch.textContent + "\n```\n";
        else if (tag === "A") out += "[" + inner.trim() + "](" + (ch.getAttribute("href") || "") + ")";
        else if (tag === "IMG") out += "![" + (ch.getAttribute("alt") || "image") + "](" + (ch.getAttribute("src") || "") + ")";
        else if (tag === "LI") out += "\n- " + inner.trim();
        else if (tag === "BR") out += "  \n";
        else if (tag === "BLOCKQUOTE") out += "\n\n" + inner.trim().split("\n").map(function (l) { return "> " + l; }).join("\n") + "\n\n";
        else if (tag === "HR") out += "\n\n---\n\n";
        else if (tag === "P" || /^UL$|^OL$|^TABLE$|^SECTION$|^ARTICLE$|^DIV$/.test(tag)) out += "\n\n" + inner.trim() + "\n\n";
        else out += inner;
      });
      return out;
    }
  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste some HTML first.", "warn"); return; }
    var doc = new DOMParser().parseFromString(t, "text/html");
    doc.querySelectorAll("script,style,noscript").forEach(function (el) { el.remove(); });
    var out = md(doc.body).replace(/\n{3,}/g, "\n\n").trim();
    $("out").value = out;
    st("Markdown ready (" + fb(out.length) + ").", "ok");
  };

})();

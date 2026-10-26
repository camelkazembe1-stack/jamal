/* JAMALI — page 248 · YAML to JSON — the tool's own engine.
   Convertor tool #184 (Web and Code Tools). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   mini YAML parser (maps, lists, nesting, scalars) -> JSON*/
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

    function yamlScalar(s) {
      s = s.trim();
      if (!s || s === "~" || s === "null") return null;
      if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) return s.slice(1, -1);
      if (s === "true") return true;
      if (s === "false") return false;
      if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
      return s;
    }
    function yamlParse(text) {
      var lines = text.split("\n").filter(function (l) { return l.trim() && l.trim()[0] !== "#"; });
      var pos = 0;
      function indentOf(l) { return l.match(/^\s*/)[0].length; }
      function block(minInd) {
        if (pos >= lines.length) return null;
        var ind = indentOf(lines[pos]);
        if (ind < minInd) return null;
        if (/^\s*-\s/.test(lines[pos]) || lines[pos].trim() === "-") {
          var arr = [];
          while (pos < lines.length) {
            var l = lines[pos], i2 = indentOf(l);
            if (i2 !== ind || !/^\s*(-\s|$)/.test(l)) break;
            var rest = l.trim().slice(1).trim();
            pos++;
            if (!rest) { var v = block(ind + 1); arr.push(v === undefined ? null : v); }
            else if (rest.indexOf(":") > -1 && !/^["']/.test(rest)) {
              var sub = [l.replace(/^(\s*)-\s*/, "$1  ")]; 
              var myInd = indentOf(sub[0]);
              while (pos < lines.length && indentOf(lines[pos]) > ind) { sub.push(lines[pos]); pos++; }
              var saved = lines; lines = sub; var p2 = pos; pos = 1;
              var obj = block(myInd); pos = p2; lines = saved;
              arr.push(obj);
            } else arr.push(yamlScalar(rest));
          }
          return arr;
        }
        var obj = {};
        while (pos < lines.length) {
          var l2 = lines[pos], i3 = indentOf(l2);
          if (i3 !== ind) break;
          var m = l2.trim().match(/^([^:]+):(.*)$/);
          if (!m) break;
          var key = m[1].trim().replace(/^["']|["']$/g, ""), val = m[2].trim();
          pos++;
          if (val) obj[key] = yamlScalar(val);
          else {
            var sub2 = block(i3 + 1);
            obj[key] = sub2 === null ? null : sub2;
          }
        }
        return obj;
      }
      var out = block(0);
      return out === null ? {} : out;
    }

  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste some YAML first.", "warn"); return; }
    try {
      var v = yamlParse(t);
      $("out").value = JSON.stringify(v, null, 2);
      st("Converted (" + (Array.isArray(v) ? v.length + " items" : Object.keys(v).length + " keys") + ").", "ok");
    } catch (e) { st("Could not parse: " + e.message, "err"); }
  };

})();

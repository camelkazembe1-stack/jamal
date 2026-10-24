/* JAMALI — page 320 · Data Format Converter — the tool's own engine.
   Convertor tool #256 (Number and Data Formats). Everything runs in the browser on this
   page — files are processed locally and never leave the device.
   auto-detects JSON/CSV/XML/YAML in, converts to the chosen out format*/
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

    function detect(t) {
      var s = t.trim();
      if (s[0] === "{" || s[0] === "[") return "json";
      if (s[0] === "<") return "xml";
      if (/^[\w"']+\s*[:,\t]|^[^\n]*,/.test(s.split("\n")[0]) && !/:\s/.test(s.split("\n")[0])) return "csv";
      return "yaml";
    }
    function toRows(v) {
      var rows;
      if (Array.isArray(v) && v.length && typeof v[0] === "object" && !Array.isArray(v[0])) {
        var keys = [];
        v.forEach(function (o) { Object.keys(o).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
        rows = [keys].concat(v.map(function (o) { return keys.map(function (k) { return o[k] == null ? "" : String(o[k]); }); }));
      } else if (Array.isArray(v)) rows = v.map(function (r) { return Array.isArray(r) ? r.map(String) : [String(r)]; });
      else if (v && typeof v === "object") rows = Object.keys(v).map(function (k) { return [k, v[k] == null ? "" : String(v[k])]; });
      else rows = [["value", String(v)]];
      return rows;
    }
    function rowsToCsv(rows) {
      return rows.map(function (r) {
        return r.map(function (c) {
          c = String(c == null ? "" : c);
          if (/[",\n]/.test(c)) c = '"' + c.replace(/"/g, '""') + '"';
          return c;
        }).join(",");
      }).join("\n");
    }
    function rowsToXml(rows) {
      var head = rows[0].map(function (h, i) { return (String(h).replace(/[^A-Za-z0-9_-]/g, "_") || ("f" + i)); });
      var out = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n';
      rows.slice(1).forEach(function (r) {
        out += "  <row>\n";
        head.forEach(function (h, i) { out += "    <" + h + ">" + esc(r[i] == null ? "" : r[i]) + "</" + h + ">\n"; });
        return out += "  </row>\n";
      });
      return out + "</records>";
    }
    function yq(v) {
      v = String(v == null ? "" : v);
      if (v === "") return '""';
      if (/^[-?:,\[\]{}#&*!|>'"%@`\s]/.test(v) || /:\s/.test(v)) return "'" + v.replace(/'/g, "''") + "'";
      return v;
    }
    function rowsToYaml(rows) {
      var head = rows[0];
      return rows.slice(1).map(function (r) {
        return "- " + head.map(function (h, i) { return yq(h) + ": " + yq(r[i]); }).join(", ");
      }).join("\n");
    }
    function toYaml2(v, ind) {
      var pad = "  ".repeat(ind), out = [];
      if (Array.isArray(v)) {
        if (!v.length) return pad + "[]";
        v.forEach(function (x) {
          if (x && typeof x === "object") out.push(pad + "-\n" + toYaml2(x, ind + 1));
          else out.push(pad + "- " + yq(x));
        });
        return out.join("\n");
      }
      if (v && typeof v === "object") {
        var keys = Object.keys(v);
        if (!keys.length) return pad + "{}";
        keys.forEach(function (k) {
          var val = v[k];
          if (val && typeof val === "object") out.push(pad + k + ":\n" + toYaml2(val, ind + 1));
          else out.push(pad + k + ": " + yq(val));
        });
        return out.join("\n");
      }
      return pad + yq(v);
    }
    function json2xml2(v, name, ind) {
      var pad = "  ".repeat(ind);
      if (Array.isArray(v)) return v.map(function (x) { return json2xml2(x, name, ind); }).join("\n");
      if (v && typeof v === "object") {
        var inner = [];
        Object.keys(v).forEach(function (k) { inner.push(json2xml2(v[k], k, ind + 1)); });
        var tag = name.replace(/[^A-Za-z0-9_.-]/g, "_").replace(/^([^A-Za-z_])/, "f$1") || "item";
        return pad + "<" + tag + ">" + (inner.length ? "\n" + inner.join("\n") + "\n" + pad : esc(String(v["#text"] || ""))) + "</" + tag + ">";
      }
      var tag2 = name.replace(/[^A-Za-z0-9_.-]/g, "_").replace(/^([^A-Za-z_])/, "f$1") || "item";
      return pad + "<" + tag2 + ">" + esc(v === null || v === undefined ? "" : String(v)) + "</" + tag2 + ">";
    }

  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Paste some data first.", "warn"); return; }
    try {
      var kind = detect(t);
      var v;
      if (kind === "json") v = JSON.parse(t);
      else if (kind === "xml") {
        var doc = new DOMParser().parseFromString(t, "application/xml");
        if (doc.querySelector("parsererror")) throw new Error("malformed XML");
        function n2j(el) {
          var o = {};
          Array.prototype.forEach.call(el.children, function (c) {
            if (o[c.nodeName] === undefined) o[c.nodeName] = el.children.length === 1 || Object.keys(o).indexOf(c.nodeName) < 0 && Array.prototype.filter.call(el.children, function (x) { return x.nodeName === c.nodeName; }).length === 1 ? n2j(c) : [n2j(c)];
            else (o[c.nodeName] = [].concat(o[c.nodeName])).push(n2j(c));
          });
          if (!Object.keys(o).length) return el.textContent.trim();
          return o;
        }
        v = n2j(doc.documentElement);
      } else if (kind === "csv") {
        var delim = t.split("\n")[0].indexOf(";") > -1 && t.split("\n")[0].indexOf(",") === -1 ? ";" : ",";
        var rows = null;
        try {
          var prs = [["a", "b"], ["1", "2"]];
          function parseCsv2(text, delim) {
            var rows = [[]], f = "", q = false;
            for (var i = 0; i < text.length; i++) {
              var ch = text[i];
              if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
              else if (ch === '"') q = true;
              else if (ch === delim) { rows[rows.length - 1].push(f); f = ""; }
              else if (ch === "\n" || ch === "\r") {
                if (ch === "\r" && text[i + 1] === "\n") i++;
                rows[rows.length - 1].push(f); f = ""; rows.push([]);
              } else f += ch;
            }
            rows[rows.length - 1].push(f);
            while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") rows.pop();
            return rows;
          }
          var raw = parseCsv2(t, delim);
          var head = raw[0];
          v = raw.slice(1).map(function (r) {
            var o = {}; head.forEach(function (h, i) { o[h] = r[i] == null ? "" : r[i]; }); return o;
          });
        } catch (e2) { throw new Error("could not parse CSV"); }
      } else {
        v = yamlParse(t);
      }
      var fmt = $("fmt").value, out;
      if (fmt === "json") out = JSON.stringify(v, null, 2);
      else if (fmt === "csv") out = rowsToCsv(toRows(v));
      else if (fmt === "xml") out = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        (kind === "csv" ? rowsToXml(toRows(v)) : json2xml2(v, Array.isArray(v) ? "items" : "root", 0));
      else out = toYaml2(v, 0);
      $("out").value = out;
      st("Detected " + kind.toUpperCase() + " -> converted to " + fmt.toUpperCase() + " (" + fb(out.length) + ").", "ok");
    } catch (e) { st("Could not convert: " + e.message, "err"); }
  };

})();

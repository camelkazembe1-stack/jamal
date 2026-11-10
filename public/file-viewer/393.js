
(function () {
  var input = document.getElementById("afv-input");
  var choose = document.getElementById("afv-choose");
  var count = document.getElementById("afv-count");
  var list = document.getElementById("afv-list");
  var preview = document.getElementById("afv-preview");
  var pname = document.getElementById("afv-pname");
  var pbody = document.getElementById("afv-body");
  var tabBtn = document.getElementById("afv-tab");
  var dlBtn = document.getElementById("afv-dl");
  var closeBtn = document.getElementById("afv-close");
  if (!input || !choose || !list || !pbody) return;
  var files = [], urls = [], current = -1;

  /* ---------- detection tables (extension FIRST, MIME as backup) ---------- */
  var VIDEO_EXT = ["mp4","webm","mov","m4v","3gp","3g2","mkv","avi","wmv","flv","mpeg","mpg","ts","ogv","f4v","asf","divx"];
  var AUDIO_EXT = ["mp3","wav","ogg","oga","m4a","aac","flac","opus","wma","amr","mid","midi","weba","aif","aiff","au","mka"];
  var IMAGE_EXT = ["jpg","jpeg","jfif","pjpeg","png","apng","gif","webp","bmp","svg","ico","avif","tif","tiff","heic","heif"];
  var TEXT_EXT = ["txt","log","md","markdown","json","xml","xhtml","html","htm","css","js","mjs","cjs","ts","jsx","tsx","csv","tsv","py","java","c","h","cpp","hpp","cs","php","rb","go","rs","sh","bash","zsh","bat","cmd","ps1","ini","cfg","conf","env","yml","yaml","toml","sql","swift","kt","scala","pl","r","lua","vue","scss","less","properties","srt","vtt","ass","ssa","tex","rtf","dockerfile","makefile","gitignore","gradle","cmake","lock","patch","diff"];
  var SHEET_EXT = ["xlsx","xlsm","xls"];
  var CSV_EXT = ["csv","tsv"];
  var MD_EXT = ["md","markdown"];

  function ext(n) { var i = n.lastIndexOf("."); return i < 0 ? "" : n.slice(i + 1).toLowerCase(); }
  function inList(L, f) { var e = ext(f.name); return !!e && L.indexOf(e) !== -1; }
  function isVideo(f) { return (f.type || "").indexOf("video/") === 0 || inList(VIDEO_EXT, f); }
  function isAudio(f) { return (f.type || "").indexOf("audio/") === 0 || inList(AUDIO_EXT, f); }
  function isImage(f) { return (f.type || "").indexOf("image/") === 0 || inList(IMAGE_EXT, f); }
  function isPdf(f) { return (f.type || "") === "application/pdf" || ext(f.name) === "pdf"; }
  function isText(f) { var t = (f.type || "").toLowerCase();
    if (t.indexOf("text/") === 0 || /json|xml|javascript|csv|yaml/.test(t)) return true;
    return TEXT_EXT.indexOf(ext(f.name)) !== -1; }
  function ico(f) {
    var e = ext(f.name), t = f.type || "";
    if (isVideo(f)) return "\uD83C\uDFAC";
    if (isAudio(f)) return "\uD83C\uDFB5";
    if (isImage(f)) return "\uD83D\uDDBC\uFE0F";
    if (e === "pdf") return "\uD83D\uDCD5";
    if (e === "doc" || e === "docx") return "\uD83D\uDCDD";
    if (e === "xls" || e === "xlsx" || e === "xlsm" || e === "ods") return "\uD83D\uDCCA";
    if (e === "ppt" || e === "pptx") return "\uD83D\uDCFD\uFE0F";
    if (e === "zip" || e === "rar" || e === "7z" || e === "tar" || e === "gz") return "\uD83D\uDCDC";
    if (isText(f)) return "\uD83D\uDCC4";
    return "\uD83D\uDCE6";
  }
  function size(n) { if (n < 1024) return n + " B"; if (n < 1048576) return (n / 1024).toFixed(1) + " KB"; return (n / 1048576).toFixed(1) + " MB"; }
  function typeLabel(f) {
    var e = ext(f.name), t = (f.type || "").toLowerCase();
    if (e === "pdf") return "PDF document";
    if (e === "doc" || e === "docx" || e === "odt" || e === "rtf" || e === "docm") return "Word document";
    if (e === "xls" || e === "xlsx" || e === "xlsm" || e === "ods") return "Excel spreadsheet";
    if (e === "ppt" || e === "pptx" || e === "pptm" || e === "odp") return "PowerPoint presentation";
    if (inList(CSV_EXT, f)) return e.toUpperCase() + " data file";
    if (e === "epub" || e === "mobi" || e === "azw" || e === "azw3") return e.toUpperCase() + " ebook";
    if (e === "zip" || e === "rar" || e === "7z" || e === "tar" || e === "gz" || e === "bz2" || e === "xz") return e.toUpperCase() + " archive";
    if (inList(MD_EXT, f)) return "Markdown file";
    if (e === "html" || e === "htm" || e === "xhtml") return "HTML file";
    if (e === "json") return "JSON file";
    if (e === "srt" || e === "vtt" || e === "ass" || e === "ssa") return "subtitle file";
    if (e === "txt" || e === "log") return "text file";
    if (isImage(f)) return e ? e.toUpperCase() + " image" : "image";
    if (isVideo(f)) return e ? e.toUpperCase() + " video" : "video";
    if (isAudio(f)) return e ? e.toUpperCase() + " audio" : "audio";
    if (isText(f)) return e ? e.toUpperCase() + " file" : "text file";
    if (e) return e.toUpperCase() + " file";
    return "file";
  }

  function revokeAll() { for (var i = 0; i < urls.length; i++) { try { URL.revokeObjectURL(urls[i]); } catch (e) {} } urls = []; }
  function url(f) { var u = URL.createObjectURL(f); urls.push(u); return u; }

  function note(msg) {
    var d = document.createElement("div"); d.className = "afv-note";
    d.textContent = msg; pbody.appendChild(d);
  }
  function fallback(f, why) {
    var d = document.createElement("div"); d.className = "afv-fallback";
    var big = document.createElement("div"); big.className = "afv-big"; big.textContent = "\uD83D\uDCE6"; d.appendChild(big);
    var line = document.createElement("span");
    line.textContent = (why ? why + " " : "") + "Use \u201COpen in new tab\u201D or \u201CDownload\u201D above.";
    d.appendChild(line);
    pbody.appendChild(d);
  }
  function el(tag, cls) { var x = document.createElement(tag); if (cls) x.className = cls; return x; }

  /* ---------- library loader ---------- */
  function loadLib(src, ok, fail) {
    var s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  }

  /* ---------- docx via mammoth ---------- */
  function docx(v) {
    var msg = el("p", "afv-note"); msg.textContent = "Opening Word document\u2026";
    pbody.innerHTML = ""; pbody.appendChild(msg);
    function fail() { pbody.innerHTML = ""; fallback(files[current]); }
    function run() {
      if (!window.mammoth) { fail(); return; }
      fetch(v).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
        return window.mammoth.convertToHtml({ arrayBuffer: buf });
      }).then(function (res) {
        pbody.innerHTML = "";
        var d = el("div", "afv-doc");
        d.innerHTML = String(res.value || "");
        pbody.appendChild(d);
      }).catch(fail);
    }
    if (window.mammoth) { run(); return; }
    loadLib("https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js", run, fail);
  }

  /* ---------- xlsx / xls via SheetJS ---------- */
  function sheetView(f) {
    var msg = el("div", "afv-note"); msg.textContent = "Opening spreadsheet\u2026";
    pbody.innerHTML = ""; pbody.appendChild(msg);
    function fail() { pbody.innerHTML = ""; fallback(files[current], "The spreadsheet could not be parsed."); }
    function run() {
      if (!window.XLSX) { fail(); return; }
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var wb = window.XLSX.read(new Uint8Array(rd.result), { type: "array" });
          pbody.innerHTML = "";
          var tools = el("div", "afv-tools");
          var sel = el("select", "afv-sel");
          for (var s = 0; s < wb.SheetNames.length; s++) {
            var o = document.createElement("option");
            o.value = wb.SheetNames[s]; o.textContent = wb.SheetNames[s];
            sel.appendChild(o);
          }
          tools.appendChild(sel);
          var wrap = el("div", "afv-twrap");
          pbody.appendChild(tools); pbody.appendChild(wrap);
          function render(name) {
            try {
              var html = window.XLSX.utils.sheet_to_html(wb.Sheets[name], { header: "", footer: "" });
              wrap.innerHTML = html;
            } catch (e) { wrap.textContent = "Sheet could not be rendered."; }
          }
          sel.addEventListener("change", function () { render(sel.value); });
          render(wb.SheetNames[0]);
        } catch (e) { fail(); }
      };
      rd.onerror = fail;
      rd.readAsArrayBuffer(f);
    }
    if (window.XLSX) { run(); return; }
    loadLib("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", run, fail);
  }

  /* ---------- csv / tsv table ---------- */
  function csvTable(f) {
    var rd = new FileReader();
    rd.onload = function () {
      var t = String(rd.result || "");
      if (!t) { fallback(files[current], "The file is empty."); return; }
      var delim = ext(f.name) === "tsv" ? "\t" : ",";
      var lines = t.replace(/\r/g, "").split("\n");
      if (lines[lines.length - 1] === "") lines.pop();
      var MAXR = 300;
      var shown = lines.slice(0, MAXR + 1);
      pbody.innerHTML = "";
      if (lines.length > MAXR) note("Showing the first " + MAXR + " of " + lines.length + " rows — open the whole file in a new tab for the rest.");
      var wrap = el("div", "afv-twrap");
      var tb = el("table", "afv-t");
      for (var i = 0; i < shown.length; i++) {
        var tr = document.createElement("tr");
        var cells = shown[i].split(delim);
        for (var j = 0; j < cells.length; j++) {
          var td = document.createElement(i === 0 ? "th" : "td");
          td.textContent = cells[j];
          tr.appendChild(td);
        }
        tb.appendChild(tr);
      }
      wrap.appendChild(tb);
      pbody.appendChild(wrap);
    };
    rd.onerror = function () { fallback(files[current], "The file could not be read as text."); };
    rd.readAsText(f);
  }

  /* ---------- json pretty ---------- */
  function jsonView(f) {
    var rd = new FileReader();
    rd.onload = function () {
      pbody.innerHTML = "";
      var t = String(rd.result || "");
      var pre = el("pre");
      try { pre.textContent = JSON.stringify(JSON.parse(t), null, 2); }
      catch (e) { pre.textContent = t; note("This JSON is not strictly valid — showing the raw text."); }
      pbody.appendChild(pre);
    };
    rd.onerror = function () { fallback(files[current]); };
    rd.readAsText(f);
  }

  /* ---------- markdown mini renderer ---------- */
  function mdView(f) {
    var rd = new FileReader();
    rd.onload = function () {
      var t = String(rd.result || "");
      var d = el("div", "afv-doc");
      d.innerHTML = mdHtml(t);
      pbody.innerHTML = ""; pbody.appendChild(d);
    };
    rd.onerror = function () { fallback(files[current]); };
    rd.readAsText(f);
  }
  function escHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  var BT = String.fromCharCode(96); /* backtick, kept as char code so this file contains no backticks */
  var INLINE_CODE = new RegExp(BT + "([^" + BT + "]+)" + BT, "g");
  var FENCE = BT + BT + BT;
  function inlineMd(s) {
    return s
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\*([^*]+)\*/g, "<i>$1</i>")
      .replace(INLINE_CODE, "<code>$1</code>");
  }
  function mdHtml(src) {
    var lines = src.replace(/\r/g, "").split("\n"), out = [];
    var inCode = false, listTag = null;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (L.slice(0, 3) === FENCE) { out.push(inCode ? "</code></pre>" : "<pre><code>"); inCode = !inCode; continue; }
      if (inCode) { out.push(escHtml(L)); continue; }
      var h = L.match(/^(#{1,6})\s+(.*)$/);
      if (h) { out.push("<h" + h[1].length + ">" + inlineMd(escHtml(h[2])) + "</h" + h[1].length + ">"); continue; }
      if (/^\s*([-*])\s+/.test(L)) {
        if (listTag !== "ul") { if (listTag) out.push("</" + listTag + ">"); out.push("<ul>"); listTag = "ul"; }
        out.push("<li>" + inlineMd(escHtml(L.replace(/^\s*[-*]\s+/, ""))) + "</li>"); continue;
      }
      if (/^\s*\d+\.\s+/.test(L)) {
        if (listTag !== "ol") { if (listTag) out.push("</" + listTag + ">"); out.push("<ol>"); listTag = "ol"; }
        out.push("<li>" + inlineMd(escHtml(L.replace(/^\s*\d+\.\s+/, ""))) + "</li>"); continue;
      }
      if (listTag) { out.push("</" + listTag + ">"); listTag = null; }
      if (/^\s*(---|\*\*\*|___)\s*$/.test(L)) { out.push("<hr>"); continue; }
      if (/^>\s?/.test(L)) { out.push("<blockquote>" + inlineMd(escHtml(L.replace(/^>\s?/, ""))) + "</blockquote>"); continue; }
      if (!L.trim()) continue;
      out.push("<p>" + inlineMd(escHtml(L)) + "</p>");
    }
    if (listTag) out.push("</" + listTag + ">");
    if (inCode) out.push("</code></pre>");
    return out.join("\n");
  }

  /* ---------- html file: sandboxed iframe ---------- */
  function htmlView(f) {
    var rd = new FileReader();
    rd.onload = function () {
      pbody.innerHTML = "";
      note("HTML opened inside a sandbox — scripts are disabled for your safety.");
      var fr = document.createElement("iframe");
      fr.setAttribute("sandbox", "");
      fr.srcdoc = String(rd.result || "");
      pbody.appendChild(fr);
    };
    rd.onerror = function () { fallback(files[current]); };
    rd.readAsText(f);
  }

  /* ---------- zip listing via JSZip ---------- */
  function zipView(f) {
    var msg = el("div", "afv-note"); msg.textContent = "Opening archive\u2026";
    pbody.innerHTML = ""; pbody.appendChild(msg);
    function fail() { pbody.innerHTML = ""; fallback(files[current], "The archive could not be listed."); }
    function run() {
      if (!window.JSZip) { fail(); return; }
      window.JSZip.loadAsync(f).then(function (zip) {
        pbody.innerHTML = "";
        var names = Object.keys(zip.files);
        note(names.length + " entr" + (names.length === 1 ? "y" : "ies") + " inside — download the file and use ZIP Extractor (Convertor) to unpack it here.");
        var wrap = el("div", "afv-twrap"), tb = el("table", "afv-t");
        var head = document.createElement("tr");
        ["Name", "Size", "Compressed"].forEach(function (h) {
          var th = document.createElement("th"); th.textContent = h; head.appendChild(th);
        });
        tb.appendChild(head);
        var n = Math.min(names.length, 500);
        for (var i = 0; i < n; i++) {
          var e = zip.files[names[i]];
          var tr = document.createElement("tr");
          var td1 = document.createElement("td"); td1.textContent = e.name;
          var td2 = document.createElement("td"); td2.textContent = e.dir ? "—" : size(e._data ? e._data.uncompressedSize || 0 : 0);
          var td3 = document.createElement("td"); td3.textContent = e.dir ? "—" : size(e._data ? e._data.compressedSize || 0 : 0);
          tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
          tb.appendChild(tr);
        }
        wrap.appendChild(tb); pbody.appendChild(wrap);
        if (names.length > 500) note("Showing the first 500 of " + names.length + " entries.");
      }).catch(fail);
    }
    if (window.JSZip) { run(); return; }
    loadLib("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js", run, fail);
  }

  /* ---------- ANY other file: details + hex peek ---------- */
  function binInfo(f) {
    pbody.innerHTML = "";
    var info = el("div", "afv-info");
    var rows = [["File name", f.name], ["Detected type", typeLabel(f)], ["Size", size(f.size)],
      ["Last modified", f.lastModified ? new Date(f.lastModified).toLocaleString() : "—"]];
    rows.forEach(function (r) {
      var kv = el("div", "afv-kv");
      var k = el("div", "k"); k.textContent = r[0];
      var v = el("div", "v"); v.textContent = r[1];
      kv.appendChild(k); kv.appendChild(v);
      info.appendChild(kv);
    });
    pbody.appendChild(info);
    note("No inline preview exists for this format, so here is a hex peek of the first 4 KB — every byte is accounted for. Use \u201COpen in new tab\u201D or \u201CDownload\u201D above.");
    var rd = new FileReader();
    rd.onload = function () {
      var u = new Uint8Array(rd.result || []);
      var pre = el("pre", "afv-hex");
      var lines = [];
      for (var o = 0; o < u.length; o += 16) {
        var hex = [], asc = "";
        for (var i = 0; i < 16; i++) {
          if (o + i < u.length) { var b = u[o + i];
            hex.push((b < 16 ? "0" : "") + b.toString(16));
            asc += (b >= 32 && b < 127) ? String.fromCharCode(b) : "."; }
          else hex.push("  ");
        }
        lines.push(("00000000" + o.toString(16)).slice(-8) + "  " + hex.join(" ") + "  " + asc);
      }
      pre.textContent = lines.join("\n");
      pbody.appendChild(pre);
    };
    rd.onerror = function () { pbody.appendChild(fallback(files[current])); };
    rd.readAsArrayBuffer(f.slice(0, 4096));
  }

  /* ---------- open ---------- */
  function open(i) {
    current = i;
    var f = files[i]; if (!f) return;
    var e = ext(f.name), t = f.type || "";
    for (var k = 0; k < list.children.length; k++) list.children[k].classList.toggle("afv-on", k === i);
    pname.textContent = f.name + " \u2014 " + typeLabel(f);
    pbody.innerHTML = "";
    preview.hidden = false;
    var v = url(f);
    tabBtn.onclick = function () { window.open(v, "_blank"); };
    dlBtn.onclick = function () {
      var a = document.createElement("a");
      a.href = url(f); a.download = f.name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { a.remove(); }, 400);
    };
    var PLAY_NOTE = "If it does not play, your browser does not support this codec — use \u201COpen in new tab\u201D above.";
    if (isVideo(f)) { var vd = document.createElement("video"); vd.src = v; vd.controls = true; vd.style.width = "100%"; pbody.appendChild(vd); note(PLAY_NOTE); return; }
    if (isAudio(f)) { var au = document.createElement("audio"); au.src = v; au.controls = true; au.style.width = "100%"; pbody.appendChild(au); note(PLAY_NOTE); return; }
    if (isImage(f)) {
      var im = document.createElement("img"); im.src = v; im.alt = f.name;
      im.onerror = function () { pbody.innerHTML = ""; fallback(files[current], "This browser cannot decode this image format."); };
      pbody.appendChild(im); return;
    }
    if (isPdf(f)) { var fr = document.createElement("iframe"); fr.src = v; pbody.appendChild(fr); return; }
    if (e === "docx") { docx(v); return; }
    if (SHEET_EXT.indexOf(e) !== -1 || t === "application/vnd.ms-excel" || t === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") { sheetView(f); return; }
    if (inList(CSV_EXT, f)) { csvTable(f); return; }
    if (e === "json") { jsonView(f); return; }
    if (inList(MD_EXT, f)) { mdView(f); return; }
    if (e === "html" || e === "htm") { htmlView(f); return; }
    if (e === "zip") { zipView(f); return; }
    if (isText(f)) {
      var rd = new FileReader();
      rd.onload = function () { var pre = el("pre"); pre.textContent = String(rd.result); pbody.appendChild(pre); };
      rd.onerror = function () { fallback(files[current]); };
      rd.readAsText(f);
      return;
    }
    binInfo(f);
  }

  function renderList() {
    list.innerHTML = "";
    for (var i = 0; i < files.length; i++)(function (i) {
      var f = files[i];
      var li = document.createElement("li"); li.className = "afv-item";
      var ic = document.createElement("span"); ic.className = "afv-ico"; ic.textContent = ico(f);
      var nm = document.createElement("span"); nm.className = "afv-name"; nm.textContent = f.name;
      var mt = document.createElement("span"); mt.className = "afv-meta"; mt.textContent = size(f.size) + " \u00b7 " + typeLabel(f);
      li.appendChild(ic); li.appendChild(nm); li.appendChild(mt);
      li.addEventListener("click", function () { open(i); });
      list.appendChild(li);
    })(i);
    if (!files.length) { count.textContent = ""; }
    else if (files.length === 1) { count.textContent = "Your file is: " + typeLabel(files[0]) + " \u2014 opening it below"; }
    else { var labs = []; for (var t = 0; t < files.length && t < 4; t++) labs.push(typeLabel(files[t])); count.textContent = files.length + " files selected: " + labs.join(", ") + (files.length > 4 ? ", \u2026" : "") + " \u2014 tap one to open it"; }
  }

  choose.addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () {
    revokeAll();
    preview.hidden = true; pbody.innerHTML = ""; current = -1;
    files = Array.prototype.slice.call(input.files || []);
    renderList();
    if (files.length) open(0);
    input.value = "";
  });
  closeBtn.addEventListener("click", function () {
    preview.hidden = true; pbody.innerHTML = ""; current = -1;
    for (var k = 0; k < list.children.length; k++) list.children[k].classList.remove("afv-on");
  });
  window.addEventListener("beforeunload", revokeAll);
})();

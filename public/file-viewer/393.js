/* JAMALI — Computer · All File Viewer (T83)
   Pick file(s) from the device and open them right here:
   video plays, audio plays, images, PDF, text/code and Word (.docx) open
   in place; every other extension opens through a new-tab blob URL.
   100% client side — files never leave the device, nothing uploads. */
(function () {
  var input = document.getElementById("afv-input");
  var choose = document.getElementById("afv-choose");
  var count = document.getElementById("afv-count");
  var list = document.getElementById("afv-list");
  var preview = document.getElementById("afv-preview");
  var pname = document.getElementById("afv-pname");
  var pbody = document.getElementById("afv-body");
  var tabBtn = document.getElementById("afv-tab");
  var closeBtn = document.getElementById("afv-close");
  if (!input || !choose || !list || !pbody) return;
  var files = [], urls = [], current = -1;

  var TEXT_EXT = ["txt", "md", "markdown", "json", "xml", "html", "htm", "css", "js", "mjs", "ts", "jsx", "tsx", "csv", "tsv", "log", "py", "java", "c", "h", "cpp", "hpp", "cs", "php", "rb", "go", "rs", "sh", "bash", "bat", "cmd", "ps1", "ini", "cfg", "conf", "env", "yml", "yaml", "toml", "sql", "swift", "kt", "scala", "pl", "r", "lua", "vue", "scss", "less", "properties"];
  function ext(n) { var i = n.lastIndexOf("."); return i < 0 ? "" : n.slice(i + 1).toLowerCase(); }
  function isText(f) { var t = f.type || ""; if (t.indexOf("text/") === 0) return true; return TEXT_EXT.indexOf(ext(f.name)) !== -1; }
  function ico(f) {
    var e = ext(f.name), t = f.type || "";
    if (t.indexOf("video/") === 0 || e === "mp4" || e === "mkv" || e === "webm" || e === "avi" || e === "mov" || e === "3gp") return "\uD83C\uDFAC";
    if (t.indexOf("audio/") === 0 || e === "mp3" || e === "wav" || e === "ogg" || e === "m4a" || e === "aac" || e === "flac") return "\uD83C\uDFB5";
    if (t.indexOf("image/") === 0 || e === "png" || e === "jpg" || e === "jpeg" || e === "gif" || e === "webp" || e === "bmp" || e === "svg") return "\uD83D\uDDBC\uFE0F";
    if (e === "pdf") return "\uD83D\uDCD5";
    if (e === "doc" || e === "docx") return "\uD83D\uDCDD";
    if (e === "xls" || e === "xlsx") return "\uD83D\uDCCA";
    if (e === "ppt" || e === "pptx") return "\uD83D\uDCFD\uFE0F";
    if (e === "zip" || e === "rar" || e === "7z" || e === "tar" || e === "gz") return "\uD83D\uDCDC";
    if (isText(f)) return "\uD83D\uDCC4";
    return "\uD83D\uDCE6";
  }
  function size(n) { if (n < 1024) return n + " B"; if (n < 1048576) return (n / 1024).toFixed(1) + " KB"; return (n / 1048576).toFixed(1) + " MB"; }

  function revokeAll() { for (var i = 0; i < urls.length; i++) { try { URL.revokeObjectURL(urls[i]); } catch (e) {} } urls = []; }
  function url(f) { var u = URL.createObjectURL(f); urls.push(u); return u; }

  function fallback(f) {
    var d = document.createElement("div"); d.className = "afv-fallback";
    var big = document.createElement("div"); big.className = "afv-big"; big.textContent = "\uD83D\uDCE6"; d.appendChild(big);
    var line = document.createElement("span"); line.textContent = "No inline preview for this type \u2014 use \u201COpen in new tab\u201D above.";
    d.appendChild(line);
    pbody.appendChild(d);
  }

  function docx(v) {
    var msg = document.createElement("p"); msg.className = "afv-count"; msg.textContent = "Opening Word document\u2026";
    pbody.innerHTML = ""; pbody.appendChild(msg);
    function fail() { pbody.innerHTML = ""; fallback(files[current]); }
    function run() {
      if (!window.mammoth) { fail(); return; }
      fetch(v).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
        return window.mammoth.convertToHtml({ arrayBuffer: buf });
      }).then(function (res) {
        pbody.innerHTML = "";
        var d = document.createElement("div"); d.className = "afv-doc";
        d.innerHTML = String(res.value || "");
        pbody.appendChild(d);
      }).catch(fail);
    }
    if (window.mammoth) { run(); return; }
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js";
    s.onload = run; s.onerror = fail;
    document.head.appendChild(s);
  }

  function open(i) {
    current = i;
    var f = files[i]; if (!f) return;
    var e = ext(f.name), t = f.type || "";
    for (var k = 0; k < list.children.length; k++) list.children[k].classList.toggle("afv-on", k === i);
    pname.textContent = f.name;
    pbody.innerHTML = "";
    preview.hidden = false;
    var v = url(f);
    tabBtn.onclick = function () { window.open(v, "_blank"); };
    if (t.indexOf("video/") === 0) { var vd = document.createElement("video"); vd.src = v; vd.controls = true; vd.style.width = "100%"; pbody.appendChild(vd); return; }
    if (t.indexOf("audio/") === 0) { var au = document.createElement("audio"); au.src = v; au.controls = true; au.style.width = "100%"; pbody.appendChild(au); return; }
    if (t.indexOf("image/") === 0) { var im = document.createElement("img"); im.src = v; im.alt = f.name; pbody.appendChild(im); return; }
    if (t === "application/pdf" || e === "pdf") { var fr = document.createElement("iframe"); fr.src = v; pbody.appendChild(fr); return; }
    if (e === "docx") { docx(v); return; }
    if (isText(f)) {
      var rd = new FileReader();
      rd.onload = function () { var pr = document.createElement("pre"); pr.textContent = String(rd.result); pbody.appendChild(pr); };
      rd.onerror = function () { fallback(f); };
      rd.readAsText(f);
      return;
    }
    fallback(f);
  }

  function renderList() {
    list.innerHTML = "";
    for (var i = 0; i < files.length; i++)(function (i) {
      var f = files[i];
      var li = document.createElement("li"); li.className = "afv-item";
      var ic = document.createElement("span"); ic.className = "afv-ico"; ic.textContent = ico(f);
      var nm = document.createElement("span"); nm.className = "afv-name"; nm.textContent = f.name;
      var mt = document.createElement("span"); mt.className = "afv-meta"; mt.textContent = size(f.size);
      li.appendChild(ic); li.appendChild(nm); li.appendChild(mt);
      li.addEventListener("click", function () { open(i); });
      list.appendChild(li);
    })(i);
    count.textContent = files.length ? files.length + " file(s) selected \u2014 tap one to open it" : "";
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

/* jamali-inline:513.js */
 
(function () {
  var PHASE1 = [1,2,21,22,23,24,27,28,31,32,33,67,68,126]; 
  var FAMILIES = [
    ["Text Conversion Tools", "📄", [
      [1, "Text to PDF", "text-to-pdf", 65],
      [2, "PDF to Text", "pdf-to-text", 66],
      [3, "Text to Word", "text-to-word", 67],
      [4, "Word to Text", "word-to-text", 68],
      [5, "Text to HTML", "text-to-html", 69],
      [6, "HTML to Text", "html-to-text", 70],
      [7, "Text to Markdown", "text-to-markdown", 71],
      [8, "Markdown to Text", "markdown-to-text", 72],
      [9, "Markdown to PDF", "markdown-to-pdf", 73],
      [10, "PDF to Markdown", "pdf-to-markdown", 74],
      [11, "Text to RTF", "text-to-rtf", 75],
      [12, "RTF to Text", "rtf-to-text", 76],
      [13, "Text to CSV", "text-to-csv", 77],
      [14, "CSV to Text", "csv-to-text", 78],
      [15, "Text to XML", "text-to-xml", 79],
      [16, "XML to Text", "xml-to-text", 80],
      [17, "Text to JSON", "text-to-json", 81],
      [18, "JSON to Text", "json-to-text", 82],
      [19, "Text to YAML", "text-to-yaml", 83],
      [20, "YAML to Text", "yaml-to-text", 84],
    ]],
    ["PDF Tools", "📕", [
      [21, "Word to PDF", "word-to-pdf", 85],
      [22, "PDF to Word", "pdf-to-word", 86],
      [23, "Excel to PDF", "excel-to-pdf", 87],
      [24, "PDF to Excel", "pdf-to-excel", 88],
      [25, "PowerPoint to PDF", "powerpoint-to-pdf", 89],
      [26, "PDF to PowerPoint", "pdf-to-powerpoint", 90],
      [27, "Image to PDF", "image-to-pdf", 91],
      [28, "PDF to Image", "pdf-to-image", 92],
      [29, "HTML to PDF", "html-to-pdf", 93],
      [30, "PDF to HTML", "pdf-to-html", 94],
      [31, "PDF Merge", "pdf-merge", 95],
      [32, "PDF Split", "pdf-split", 96],
      [33, "PDF Compress", "pdf-compress", 97],
      [34, "PDF Rotate", "pdf-rotate", 98],
      [35, "PDF Crop", "pdf-crop", 99],
      [36, "PDF Delete Pages", "pdf-delete-pages", 100],
      [37, "PDF Extract Pages", "pdf-extract-pages", 101],
      [38, "PDF Reorder Pages", "pdf-reorder-pages", 102],
      [39, "PDF Add Page Numbers", "pdf-add-page-numbers", 103],
      [40, "PDF Add Watermark", "pdf-add-watermark", 104],
      [41, "PDF Protect", "pdf-protect", 105],
      [42, "PDF Unlock", "pdf-unlock", 106],
      [43, "PDF Sign", "pdf-sign", 107],
      [44, "PDF Fill Forms", "pdf-fill-forms", 108],
      [45, "PDF Flatten", "pdf-flatten", 109],
      [46, "PDF Compare", "pdf-compare", 110],
      [47, "PDF Repair", "pdf-repair", 111],
      [48, "PDF Metadata Editor", "pdf-metadata-editor", 112],
      [49, "PDF to PDF/A", "pdf-to-pdf-a", 113],
      [50, "OCR PDF", "ocr-pdf", 114],
    ]],
    ["Word and Document Tools", "📘", [
      [51, "DOC to DOCX", "doc-to-docx", 115],
      [52, "DOCX to DOC", "docx-to-doc", 116],
      [53, "DOCX to PDF", "docx-to-pdf", 117],
      [54, "PDF to DOCX", "pdf-to-docx", 118],
      [55, "DOCX to TXT", "docx-to-txt", 119],
      [56, "TXT to DOCX", "txt-to-docx", 120],
      [57, "DOCX to HTML", "docx-to-html", 121],
      [58, "HTML to DOCX", "html-to-docx", 122],
      [59, "DOCX to RTF", "docx-to-rtf", 123],
      [60, "RTF to DOCX", "rtf-to-docx", 124],
      [61, "DOCX to Markdown", "docx-to-markdown", 125],
      [62, "Markdown to DOCX", "markdown-to-docx", 126],
      [63, "DOCX to ODT", "docx-to-odt", 127],
      [64, "ODT to DOCX", "odt-to-docx", 128],
      [65, "DOCX to EPUB", "docx-to-epub", 129],
      [66, "EPUB to DOCX", "epub-to-docx", 130],
    ]],
    ["Spreadsheet and Data Tools", "📊", [
      [67, "Excel to CSV", "excel-to-csv", 131],
      [68, "CSV to Excel", "csv-to-excel", 132],
      [69, "PDF to Excel", "pdf-to-excel-2", 134],
      [70, "XLS to XLSX", "xls-to-xlsx", 135],
      [71, "XLSX to XLS", "xlsx-to-xls", 136],
      [72, "XLSX to ODS", "xlsx-to-ods", 137],
      [73, "ODS to XLSX", "ods-to-xlsx", 138],
      [74, "CSV to JSON", "csv-to-json", 139],
      [75, "JSON to CSV", "json-to-csv", 140],
      [76, "CSV to XML", "csv-to-xml", 141],
      [77, "XML to CSV", "xml-to-csv", 142],
      [78, "Excel to JSON", "excel-to-json", 143],
      [79, "JSON to Excel", "json-to-excel", 144],
      [80, "Excel to HTML", "excel-to-html", 145],
      [81, "HTML Table to Excel", "html-table-to-excel", 146],
      [82, "TSV to CSV", "tsv-to-csv", 147],
      [83, "CSV to TSV", "csv-to-tsv", 148],
      [84, "Excel to Text", "excel-to-text", 149],
      [85, "Text to Excel", "text-to-excel", 150],
    ]],
    ["Presentation Tools", "📽️", [
      [86, "PPT to PPTX", "ppt-to-pptx", 151],
      [87, "PPTX to PPT", "pptx-to-ppt", 152],
      [88, "PowerPoint to PDF", "powerpoint-to-pdf-2", 153],
      [89, "PDF to PowerPoint", "pdf-to-powerpoint-2", 154],
      [90, "PowerPoint to Images", "powerpoint-to-images", 155],
      [91, "Images to PowerPoint", "images-to-powerpoint", 156],
      [92, "PPTX to Video", "pptx-to-video", 157],
      [93, "PPTX to Text", "pptx-to-text", 158],
      [94, "Text to PowerPoint", "text-to-powerpoint", 159],
      [95, "PPTX to HTML", "pptx-to-html", 160],
    ]],
    ["Image Tools", "🖼️", [
      [96, "JPG to PNG", "jpg-to-png", 161],
      [97, "PNG to JPG", "png-to-jpg", 162],
      [98, "JPG to WebP", "jpg-to-webp", 163],
      [99, "WebP to JPG", "webp-to-jpg", 164],
      [100, "PNG to WebP", "png-to-webp", 165],
      [101, "WebP to PNG", "webp-to-png", 166],
      [102, "JPG to GIF", "jpg-to-gif", 167],
      [103, "GIF to JPG", "gif-to-jpg", 168],
      [104, "GIF to PNG", "gif-to-png", 169],
      [105, "BMP to JPG", "bmp-to-jpg", 170],
      [106, "JPG to BMP", "jpg-to-bmp", 171],
      [107, "TIFF to JPG", "tiff-to-jpg", 172],
      [108, "JPG to TIFF", "jpg-to-tiff", 173],
      [109, "SVG to PNG", "svg-to-png", 174],
      [110, "PNG to SVG", "png-to-svg", 175],
      [111, "SVG to JPG", "svg-to-jpg", 176],
      [112, "HEIC to JPG", "heic-to-jpg", 177],
      [113, "HEIC to PNG", "heic-to-png", 178],
      [114, "AVIF to JPG", "avif-to-jpg", 179],
      [115, "JPG to ICO", "jpg-to-ico", 180],
      [116, "ICO to PNG", "ico-to-png", 181],
      [117, "Image Compressor", "image-compressor", 182],
      [118, "Image Resizer", "image-resizer", 183],
      [119, "Image Cropper", "image-cropper", 184],
      [120, "Image Rotator", "image-rotator", 185],
      [121, "Image Flipper", "image-flipper", 186],
      [122, "Image Watermark", "image-watermark", 187],
      [123, "Image to Base64", "image-to-base64", 188],
      [124, "Base64 to Image", "base64-to-image", 189],
      [125, "Image Metadata Viewer", "image-metadata-viewer", 190],
      [126, "OCR Image to Text", "ocr-image-to-text", 191],
    ]],
    ["Audio Tools", "🎵", [
      [127, "MP3 to WAV", "mp3-to-wav", 192],
      [128, "WAV to MP3", "wav-to-mp3", 193],
      [129, "MP3 to AAC", "mp3-to-aac", 194],
      [130, "AAC to MP3", "aac-to-mp3", 195],
      [131, "MP3 to OGG", "mp3-to-ogg", 196],
      [132, "OGG to MP3", "ogg-to-mp3", 197],
      [133, "WAV to FLAC", "wav-to-flac", 198],
      [134, "FLAC to WAV", "flac-to-wav", 199],
      [135, "M4A to MP3", "m4a-to-mp3", 200],
      [136, "MP3 to M4A", "mp3-to-m4a", 201],
      [137, "Audio Compressor", "audio-compressor", 202],
      [138, "Audio Trimmer", "audio-trimmer", 203],
      [139, "Audio Merger", "audio-merger", 204],
      [140, "Audio to Text", "audio-to-text", 205],
      [141, "Text to Speech", "text-to-speech", 206],
      [142, "Audio Format Inspector", "audio-format-inspector", 207],
      [143, "Audio Speed Changer", "audio-speed-changer", 208],
      [144, "Audio Volume Adjuster", "audio-volume-adjuster", 209],
    ]],
    ["Video Tools", "🎬", [
      [145, "MP4 to AVI", "mp4-to-avi", 210],
      [146, "AVI to MP4", "avi-to-mp4", 211],
      [147, "MP4 to MOV", "mp4-to-mov", 212],
      [148, "MOV to MP4", "mov-to-mp4", 213],
      [149, "MP4 to WebM", "mp4-to-webm", 214],
      [150, "WebM to MP4", "webm-to-mp4", 215],
      [151, "MKV to MP4", "mkv-to-mp4", 216],
      [152, "MP4 to GIF", "mp4-to-gif", 217],
      [153, "Video to Images", "video-to-images", 218],
      [154, "Images to Video", "images-to-video", 219],
      [155, "Video Compressor", "video-compressor", 220],
      [156, "Video Trimmer", "video-trimmer", 221],
      [157, "Video Merger", "video-merger", 222],
      [158, "Video Resizer", "video-resizer", 223],
      [159, "Video Rotator", "video-rotator", 224],
      [160, "Video to Audio", "video-to-audio", 225],
      [161, "Video Subtitle Extractor", "video-subtitle-extractor", 226],
      [162, "SRT to VTT", "srt-to-vtt", 227],
      [163, "VTT to SRT", "vtt-to-srt", 228],
      [164, "Video Metadata Viewer", "video-metadata-viewer", 229],
    ]],
    ["Ebook and Publishing Tools", "📚", [
      [165, "EPUB to PDF", "epub-to-pdf", 230],
      [166, "PDF to EPUB", "pdf-to-epub", 231],
      [167, "EPUB to TXT", "epub-to-txt", 232],
      [168, "TXT to EPUB", "txt-to-epub", 233],
      [169, "EPUB to HTML", "epub-to-html", 234],
      [170, "HTML to EPUB", "html-to-epub", 235],
      [171, "MOBI to EPUB", "mobi-to-epub", 236],
      [172, "EPUB to MOBI", "epub-to-mobi", 237],
      [173, "Ebook Metadata Editor", "ebook-metadata-editor", 238],
    ]],
    ["Web and Code Tools", "🌐", [
      [174, "HTML to XHTML", "html-to-xhtml", 239],
      [175, "XHTML to HTML", "xhtml-to-html", 240],
      [176, "HTML to Markdown", "html-to-markdown", 241],
      [177, "Markdown to HTML", "markdown-to-html", 242],
      [178, "HTML to PDF", "html-to-pdf-2", 243],
      [179, "JSON Formatter", "json-formatter", 244],
      [180, "JSON Minifier", "json-minifier", 245],
      [181, "XML Formatter", "xml-formatter", 246],
      [182, "XML Minifier", "xml-minifier", 247],
      [183, "YAML to JSON", "yaml-to-json", 248],
      [184, "JSON to YAML", "json-to-yaml", 249],
      [185, "XML to JSON", "xml-to-json", 250],
      [186, "JSON to XML", "json-to-xml", 251],
      [187, "CSV to SQL", "csv-to-sql", 252],
      [188, "SQL to CSV", "sql-to-csv", 253],
      [189, "SQL Formatter", "sql-formatter", 254],
      [190, "CSS Minifier", "css-minifier", 255],
      [191, "CSS Beautifier", "css-beautifier", 256],
      [192, "JavaScript Minifier", "javascript-minifier", 257],
      [193, "JavaScript Beautifier", "javascript-beautifier", 258],
      [194, "HTML Minifier", "html-minifier", 259],
      [195, "HTML Beautifier", "html-beautifier", 260],
    ]],
    ["Archive and Compression Tools", "🗜️", [
      [196, "ZIP Extractor", "zip-extractor", 261],
      [197, "Create ZIP", "create-zip", 262],
      [198, "TAR Extractor", "tar-extractor", 263],
      [199, "Create TAR", "create-tar", 264],
      [200, "GZIP Compressor", "gzip-compressor", 265],
      [201, "GZIP Decompressor", "gzip-decompressor", 266],
      [202, "ZIP to TAR", "zip-to-tar", 267],
      [203, "TAR to ZIP", "tar-to-zip", 268],
      [204, "Archive Content Viewer", "archive-content-viewer", 269],
      [205, "File Compressor", "file-compressor", 270],
      [206, "File Extractor", "file-extractor", 271],
    ]],
    ["File Utilities", "🧰", [
      [207, "File Type Detector", "file-type-detector", 272],
      [208, "MIME Type Checker", "mime-type-checker", 273],
      [209, "File Size Converter", "file-size-converter", 274],
      [210, "File Checksum Generator", "file-checksum-generator", 275],
      [211, "Duplicate File Checker", "duplicate-file-checker", 276],
      [212, "File Renamer", "file-renamer", 277],
      [213, "Batch File Renamer", "batch-file-renamer", 278],
      [214, "File Metadata Viewer", "file-metadata-viewer", 279],
      [215, "Base64 Encoder", "base64-encoder", 280],
      [216, "Base64 Decoder", "base64-decoder", 281],
      [217, "URL Encoder", "url-encoder", 282],
      [218, "URL Decoder", "url-decoder", 283],
      [219, "QR Code Generator", "qr-code-generator", 284],
      [220, "QR Code Reader", "qr-code-reader", 285],
      [221, "Barcode Generator", "barcode-generator", 286],
      [222, "Barcode Reader", "barcode-reader", 287],
      [223, "UUID Generator", "uuid-generator", 288],
      [224, "Timestamp Converter", "timestamp-converter", 289],
    ]],
    ["Document and Office Utilities", "🗂️", [
      [225, "Word Counter", "word-counter", 290],
      [226, "Character Counter", "character-counter", 291],
      [227, "Line Counter", "line-counter", 292],
      [228, "Text Case Converter", "text-case-converter", 293],
      [229, "Find and Replace", "find-and-replace", 294],
      [230, "Text Diff Checker", "text-diff-checker", 295],
      [231, "Document Merger", "document-merger", 296],
      [232, "Document Splitter", "document-splitter", 297],
      [233, "Document Page Counter", "document-page-counter", 298],
      [234, "Document Metadata Editor", "document-metadata-editor", 299],
      [235, "Spell Checker", "spell-checker", 300],
      [236, "Grammar Checker", "grammar-checker", 301],
      [237, "Document Watermark", "document-watermark", 302],
      [238, "Page Numbering Tool", "page-numbering-tool", 303],
      [239, "Document Template Generator", "document-template-generator", 304],
    ]],
    ["Number and Data Formats", "🔢", [
      [240, "Date Format Converter", "date-format-converter", 305],
      [241, "Time Format Converter", "time-format-converter", 306],
      [242, "Unix Timestamp Converter", "unix-timestamp-converter", 307],
      [243, "Number to Words", "number-to-words", 308],
      [244, "Words to Number", "words-to-number", 309],
      [245, "Roman Numeral Converter", "roman-numeral-converter", 310],
      [246, "Decimal to Binary", "decimal-to-binary", 311],
      [247, "Binary to Decimal", "binary-to-decimal", 312],
      [248, "Decimal to Hexadecimal", "decimal-to-hexadecimal", 313],
      [249, "Hexadecimal to Decimal", "hexadecimal-to-decimal", 314],
      [250, "Decimal to Octal", "decimal-to-octal", 315],
      [251, "Octal to Decimal", "octal-to-decimal", 316],
      [252, "JSON Validator", "json-validator", 317],
      [253, "XML Validator", "xml-validator", 318],
      [254, "CSV Validator", "csv-validator", 319],
      [255, "Data Format Converter", "data-format-converter", 320],
    ]]
  ];
  window.JAMALI_TOOLS = [];
  FAMILIES.forEach(function (f) {
    var fam = { label: f[0], icon: f[1], tools: [] };
    f[2].forEach(function (t) {
      fam.tools.push({ id: t[0], label: t[1], slug: t[2], n: t[3],
        star: PHASE1.indexOf(t[0]) > -1 });
    });
    window.JAMALI_TOOLS.push(fam);
  });
})();

/* jamali-inline: imgpdf.js — IMG to PDF button on the Convertor page */
 
(function () {
  var btn = document.getElementById("imgpdf-btn");
  var panel = document.getElementById("imgpdf-panel");
  if (!btn || !panel) return;
  var drop = document.getElementById("ip-drop");
  var fileIn = document.getElementById("ip-file");
  var ul = document.getElementById("ip-files");
  var runBtn = document.getElementById("ip-run");
  var msg = document.getElementById("ip-msg");
  var xBtn = document.getElementById("ip-x");

  function say(m, cls) { if (msg) { msg.textContent = m; msg.className = "ip-msg" + (cls ? " " + cls : ""); } }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fb(n) { var u = ["B", "KB", "MB", "GB"], i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i ? n.toFixed(n < 10 ? 2 : 1) : n) + " " + u[i]; }

  btn.addEventListener("click", function () { panel.hidden = !panel.hidden; });
  xBtn.addEventListener("click", function () { panel.hidden = true; });
  drop.addEventListener("click", function () { fileIn.click(); });
  drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", function () { drop.classList.remove("over"); });
  drop.addEventListener("drop", function (e) { e.preventDefault(); drop.classList.remove("over");
    if (e.dataTransfer.files.length) { fileIn.files = e.dataTransfer.files; show(); } });
  fileIn.addEventListener("change", show);

  function show() {
    ul.innerHTML = "";
    var fs = fileIn.files; if (!fs.length) return;
    var tot = 0;
    Array.prototype.forEach.call(fs, function (f) {
      tot += f.size;
      var li = document.createElement("li");
      li.innerHTML = "<span>" + esc(f.name) + "</span><span>" + fb(f.size) + "</span>";
      ul.appendChild(li);
    });
    say(fs.length + " image(s) ready · " + fb(tot) + " total — press Convert to PDF.");
  }

  function ensureLib(ok, fail) {
    if (window.PDFLib) { ok(); return; }
    say("Loading the PDF engine…");
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
    s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  }
  function loadImg(blob) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error("cannot decode " + "this image")); };
      im.src = URL.createObjectURL(blob);
    });
  }
  /* EXIF orientation of a JPEG (1 = normal). Raw bytes embedded into a PDF keep the
     stored rotation, so a phone photo would show sideways — re-encode when != 1. */
  function jpgOrientation(u) {
    if (!u || u.length < 4 || u[0] !== 0xff || u[1] !== 0xd8) return 1;
    var o = 2;
    while (o + 4 <= u.length) {
      if (u[o] !== 0xff) { o++; continue; }
      var m = u[o + 1];
      if (m === 0xff) { o++; continue; }
      if (m === 0x01 || m === 0xd8 || (m >= 0xd0 && m <= 0xd7)) { o += 2; continue; }
      if (m === 0xd9 || m === 0xda) break;
      var len = (u[o + 2] << 8) | u[o + 3];
      if (len < 2) return 1;
      if (m === 0xe1 && o + 10 <= u.length && u[o + 4] === 0x45 && u[o + 5] === 0x78 &&
          u[o + 6] === 0x69 && u[o + 7] === 0x66 && u[o + 8] === 0x00) {
        var t = o + 10;
        if (t + 8 > u.length) return 1;
        var le = (u[t] === 0x49 && u[t + 1] === 0x49);
        function g16(p) { return le ? (u[p] | (u[p + 1] << 8)) : ((u[p] << 8) | u[p + 1]); }
        function g32(p) { return le ? ((u[p] | (u[p + 1] << 8) | (u[p + 2] << 16) | (u[p + 3] << 24)) >>> 0)
          : (((u[p] << 24) | (u[p + 1] << 16) | (u[p + 2] << 8) | u[p + 3]) >>> 0); }
        var ifd = t + g32(t + 4);
        if (ifd + 2 > u.length) return 1;
        var n = g16(ifd), k, en;
        for (k = 0; k < n && ifd + 2 + k * 12 + 8 <= u.length; k++) {
          en = ifd + 2 + k * 12;
          if (g16(en) === 0x0112) { var v = g16(en + 8); return (v >= 1 && v <= 8) ? v : 1; }
        }
        return 1;
      }
      o += 2 + len;
    }
    return 1;
  }
  function u8(abuf) { return new Uint8Array(abuf); }
  async function reencodeJpg(blob) {
    var im = await loadImg(blob);
    var cv = document.createElement("canvas");
    cv.width = Math.max(1, im.naturalWidth); cv.height = Math.max(1, im.naturalHeight);
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(im, 0, 0);
    var b = await new Promise(function (res) { cv.toBlob(res, "image/jpeg", 0.92); });
    return u8(await b.arrayBuffer());
  }
  function dl(blob, name) { var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); }

  runBtn.addEventListener("click", async function () {
    var fs = fileIn.files;
    if (!fs || !fs.length) { say("Choose at least one image first.", "warn"); return; }
    runBtn.disabled = true;
    try {
      await new Promise(function (res, rej) { ensureLib(res, function () {
        rej(new Error("pdf-lib engine could not load — reconnect and reload the page.")); }); });
      var doc = await PDFLib.PDFDocument.create();
      var list = Array.prototype.slice.call(fs);
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        say("Adding " + f.name + " (" + (i + 1) + "/" + list.length + ")…");
        var bytes = new Uint8Array(await f.arrayBuffer());
        var type = f.type, img;
        if (/\.gif$/i.test(f.name)) type = "image/gif";
        if (type === "image/jpeg" || /\.jpe?g$/i.test(f.name)) {
          img = (jpgOrientation(bytes) === 1) ? await doc.embedJpg(bytes)
                                              : await doc.embedJpg(await reencodeJpg(f));
        }
        else if (type === "image/png" || /\.png$/i.test(f.name)) img = await doc.embedPng(bytes);
        else {
          var im = await loadImg(f);
          var cv = document.createElement("canvas");
          cv.width = im.naturalWidth; cv.height = im.naturalHeight;
          cv.getContext("2d").drawImage(im, 0, 0);
          var d = cv.toDataURL("image/png");
          var bin = atob(d.split(",")[1]), u = new Uint8Array(bin.length);
          for (var k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
          img = await doc.embedPng(u);
        }
        var page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      var out = await doc.save();
      dl(new Blob([out], { type: "application/pdf" }), "images.pdf");
      say("Done — images.pdf downloaded · " + list.length + " image(s), one page each at full size.", "ok");
    } catch (e) { say("Could not build the PDF: " + (e && e.message ? e.message : e), "err"); }
    runBtn.disabled = false;
  });
})();

 
(function () {
  var root = document.getElementById("tool-cats");
  var count = document.getElementById("tool-count");
  var search = document.getElementById("tool-search");
  var fams = window.JAMALI_TOOLS || [];

  var total = 0, rows = [];
  fams.forEach(function (fam) {
    var sec = document.createElement("section");
    sec.className = "tool-fam";
    var h = document.createElement("h2");
    h.textContent = fam.icon + " " + fam.label;
    var n = document.createElement("span");
    n.className = "fam-n";
    n.textContent = fam.tools.length;
    h.appendChild(n);
    sec.appendChild(h);
    var grid = document.createElement("div");
    grid.className = "tool-grid";
    var links = [];
    fam.tools.forEach(function (t) {
      var a = document.createElement("a");
      a.className = "tool";
      a.href = "/" + t.slug + "/" + t.n;
      a.title = "#" + t.id + " · " + t.label + " · /" + t.slug + "/" + t.n;
      a.setAttribute("data-search", (t.label + " " + fam.label + " " + t.slug).toLowerCase());
      a.setAttribute("data-page", t.n);
      var name = document.createElement("span");
      name.className = "tool-name";
      name.textContent = t.label;
      a.appendChild(name);
      if (t.star) {
        var s = document.createElement("span");
        s.className = "tool-star";
        s.textContent = "\u2605";
        s.title = "Priority tool";
        a.appendChild(s);
      }
      grid.appendChild(a);
      links.push(a);
      total++;
    });
    sec.appendChild(grid);
    root.appendChild(sec);
    rows.push({ sec: sec, links: links });
  });

  if (!fams.length) {
    root.innerHTML = "<p class=\"tool-empty\">The tool catalogue did not load.</p>";
    return;
  }

  function say(msg) { count.textContent = msg; }
  say(total + " tools \u00b7 " + fams.length + " families");

  if (search) search.addEventListener("input", function () {
    var q = search.value.trim().toLowerCase(), shown = 0;
    rows.forEach(function (row) {
      var famShown = 0;
      row.links.forEach(function (a) {
        var on = !q || a.getAttribute("data-search").indexOf(q) > -1;
        a.style.display = on ? "" : "none";
        if (on) famShown++;
      });
      row.sec.style.display = famShown ? "" : "none";
      shown += famShown;
    });
    say(q ? shown + " of " + total + " tools match" : total + " tools \u00b7 " + fams.length + " families");
  });
})();


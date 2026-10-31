 
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

    var TPL = {
      invoice: function (d) {
        var lines = [];
        lines.push(d.org.toUpperCase()); lines.push("INVOICE"); lines.push("");
        lines.push("Invoice to: " + d.to); lines.push("Reference: " + d.subj);
        lines.push("Date: " + new Date().toLocaleDateString()); lines.push("");
        lines.push("Description                          Amount");
        lines.push("-------------------------------------------");
        lines.push(d.subj + "                     " + d.cur + " " + d.amt);
        lines.push(""); lines.push("TOTAL: " + d.cur + " " + d.amt);
        lines.push(""); lines.push("Payment within 30 days. Thank you for your business. — " + d.org);
        return lines;
      },
      letter: function (d) {
        return [d.org, new Date().toLocaleDateString(), "",
          "To: " + d.to, "", "Dear Partner,", "",
          "Re: " + d.subj, "",
          "We are pleased to confirm the details above. Should anything require",
          "adjustment, please contact our office at your earliest convenience.", "",
          "Kind regards,", d.org];
      },
      memo: function (d) {
        return ["MEMO", "", "From: " + d.org, "To: " + d.to, "Date: " + new Date().toLocaleDateString(),
          "Re: " + d.subj, "", "Please note the following points regarding " + d.subj + ".",
          "Action is requested by the end of the week.", "", d.org];
      },
      minutes: function (d) {
        return ["MEETING MINUTES", "", "Held: " + new Date().toLocaleString(), "Participants: " + d.to,
          "Chair: " + d.org, "Topic: " + d.subj, "", "1. The meeting opened at the scheduled time.",
          "2. The topic '" + d.subj + "' was discussed and decisions recorded.",
          "3. Actions were assigned and deadlines agreed.", "",
          "Next meeting: to be confirmed."];
      },
      receipt: function (d) {
        return [d.org.toUpperCase(), "OFFICIAL RECEIPT", "",
          "Received from: " + d.to, "For: " + d.subj,
          "Amount: " + d.cur + " " + d.amt, "Date: " + new Date().toLocaleDateString(), "",
          "Thank you. — " + d.org];
      },
    };

  $("run").onclick = async function () {
    if (!window.JSZip) { libFail("JSZip"); return; }
    try {
      var d = { org: $("org").value || "JAMALI", to: $("to").value || "Client", subj: $("subj").value || "Subject",
        amt: $("amt").value || "0.00", cur: $("cur").value || "USD" };
      var lines = TPL[$("kind").value](d);
      var text = lines.join("\n");
      $("out").value = text;
      var paras = lines.map(function (ln) {
        var bold = ln === ln.toUpperCase() && ln.trim();
        var xml = esc(ln);
        return "<w:p>" + (bold ? "<w:r><w:rPr><w:b/></w:rPr><w:t xml:space=\"preserve\">" : "<w:r><w:t xml:space=\"preserve\">") + xml + "</w:t></w:r></w:p>";
      }).join("");
      var zip = new JSZip();
      zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
      zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
      zip.file("word/document.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
        paras + "<w:sectPr/></w:body></w:document>");
      var blob = await zip.generateAsync({ type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      dl(blob, $("kind").value + ".docx");
      st($("kind").value + ".docx generated.", "ok");
    } catch (e) { st("Could not generate: " + e.message, "err"); }
  };

})();

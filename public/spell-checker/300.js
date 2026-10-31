 
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

    var COMMON = { teh: "the", recieve: "receive", seperate: "separate", occured: "occurred",
      definately: "definitely", accomodate: "accommodate", beleive: "believe", buisness: "business",
      calender: "calendar", cemetary: "cemetery", changable: "changeable", collegue: "colleague",
      comming: "coming", commited: "committed", concious: "conscious", dutie: "duty",
      embarass: "embarrass", enviroment: "environment", existance: "existence", familar: "familiar",
      finaly: "finally", goverment: "government", gaurd: "guard", happend: "happened",
      immediatly: "immediately", independant: "independent", intrest: "interest", knowlege: "knowledge",
      liason: "liaison", maintainance: "maintenance", managment: "management", neccessary: "necessary",
      noticable: "noticeable", occassion: "occasion", paralel: "parallel", parliment: "parliament",
      persue: "pursue", posession: "possession", prefered: "preferred", publically: "publicly",
      realy: "really", refered: "referred", relevent: "relevant", religous: "religious",
      remeber: "remember", succesful: "successful", supercede: "supersede", supress: "suppress",
      tommorow: "tomorrow", tounge: "tongue", untill: "until", wierd: "weird", writting: "writing" };

  $("run").onclick = function () {
    var t = $("in").value;
    if (!t.trim()) { st("Type some text first.", "warn"); return; }
    var findings = [];
    var words = t.split(/\b/);
    var seen = {};
    words.forEach(function (w, i) {
      var low = w.toLowerCase();
      if (COMMON[low]) findings.push('Line-approx ' + Math.floor(i / 2) + ': "' + w + '" -> did you mean "' + COMMON[low] + '"?');
      if (/^[A-Za-z]+$/.test(w) && seen[low] && words[i - 1].trim() === "" ) findings.push('Repeated word: "' + w + '"');
      seen[low] = /^[A-Za-z]+$/.test(w);
    });
    var rep = t.match(/\b(\w+)\s+\1\b/gi);
    if (rep) rep.forEach(function (r) { findings.push('Doubled words: "' + r + '"'); });
    $("out").value = findings.length ? findings.join("\n") : "No common misspellings or doubled words found. (This is a heuristic checker — for full dictionary checking rely on your editor's spellcheck.)";
    st(findings.length + " finding(s).", findings.length ? "warn" : "ok");
  };

})();

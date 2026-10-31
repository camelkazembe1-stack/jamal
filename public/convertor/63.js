 
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

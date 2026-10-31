 
(function () {
  var box = document.getElementById("tool-page");
  var slug = window.JAMALI_TOOL_SLUG || "";
  var fam = null, tool = null;
  (window.JAMALI_TOOLS || []).forEach(function (f) {
    f.tools.forEach(function (t) { if (t.slug === slug) { fam = f; tool = t; } });
  });

  if (!tool) {
    document.title = "Tool not found — JAMALI Convertor";
    box.innerHTML = "<div class=\"card t-status\"><h2>Tool not found</h2>" +
      "<p>This address is not a tool in the Convertor catalogue" +
      (slug ? " (\u201C" + slug + "\u201D)" : "") +
      ". Open the hub to pick from all 256 tools.</p>" +
      "<div class=\"t-links\"><a class=\"t-btn\" href=\"/convertor/63\">All Convertor tools</a></div></div>";
    return;
  }

  document.title = tool.label + " — JAMALI Convertor";
  box.innerHTML =
    "<div class=\"t-head\"><h1>" + tool.label + "</h1>" +
    (tool.star ? "<span class=\"t-star\">\u2605</span>" : "") + "</div>" +
    "<div class=\"t-chips\">" +
    "<span class=\"t-chip t-fam\">" + fam.icon + " " + fam.label + "</span>" +
    "<span class=\"t-chip\">Tool #" + tool.id + " of 256</span>" +
    "<span class=\"t-chip\">/" + tool.slug + "</span>" +
    (tool.star ? "<span class=\"t-chip\">\u2605 Priority</span>" : "") +
    "</div>" +
    "<div class=\"card t-status\"><h2>Planned — coming soon</h2>" +
    "<p>This page is reserved for the " + tool.label + " tool. Its button, family and " +
    "address are live; the working engine arrives with the Convertor build waves. " +
    "Nothing is uploaded or processed here yet.</p>" +
    (tool.note ? "<div class=\"t-note\">Note: " + tool.note + "</div>" : "") +
    "</div>" +
    "<div class=\"t-links\"><a class=\"t-btn\" href=\"/convertor/63\">All Convertor tools</a>" +
    "<a class=\"t-btn ghost\" href=\"/computer/62\">Computer</a></div>";
})();

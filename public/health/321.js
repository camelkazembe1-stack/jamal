(function () {
  "use strict";
  if (window.__jamalPageReady) { return; }
  window.__jamalPageReady = true;
  function ready(fn) {
    if (document.readyState !== "loading") { fn(); }
    else { document.addEventListener("DOMContentLoaded", fn); }
  }
  ready(function () {
    var form = document.querySelector("form");
    if (!form) { return; }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = form.querySelectorAll(
        "input[required], select[required], textarea[required]");
      for (var i = 0; i < fields.length; i++) {
        if (!String(fields[i].value || "").trim()) {
          fields[i].focus();
          window.alert("Please fill in all required fields.");
          return;
        }
      }
      window.alert("Health record saved successfully.");
      form.reset();
    });
  });
})();

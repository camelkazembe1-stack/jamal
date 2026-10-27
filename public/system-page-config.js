/* JAMALI — system page configuration applier (task 56).
   The administrator can hide EXISTING fields and set default values for
   them, per page (requirement 7). This file never creates new fields —
   it only hides or pre-fills what the page already has.

   How it works:
   - each configured page has a document in the systemPageConfig collection:
       { page: "victim-registration-322", hidden: ["in-sex"], defaults: { "in-priority": "Medium" } }
   - this script reads the session (room keys) and skips everything for the
     administrator — the admin always sees the full form.
   - for everyone else: hidden fields get display:none on their label
     wrapper; defaults are applied to the input/select/textarea.
   - the applier re-runs whenever the page clears its form (Register
     Another / Clear Form), so defaults come back on a fresh form.

   Connection discipline: this file is a classic script, so it reaches the
   database through the linker via a dynamic import of /firebase.js — the
   same single connection point as every module. */
(function () {
  var SESSION_KEY = "JAMALI_SYSTEM_SESSION";
  var PAGE_ID = "victim-registration-322";

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (e) { return null; }
  }

  function wrapperOf(el) {
    // fields live inside a <label> — hide the whole label, never just the input
    return el.closest ? (el.closest("label") || el) : el;
  }

  function applyOne(el, value) {
    if (!el) return;
    if (el.type === "checkbox") { el.checked = !!value; return; }
    if (el.tagName === "SELECT") {
      var has = false;
      for (var i = 0; i < el.options.length; i++) {
        if (el.options[i].value === value || el.options[i].text === value) { has = true; break; }
      }
      if (has) el.value = value; // never invent options that do not exist
      return;
    }
    el.value = value;
  }

  function apply(config) {
    var hidden = (config && Array.isArray(config.hidden)) ? config.hidden : [];
    var defaults = (config && config.defaults) ? config.defaults : {};

    for (var h = 0; h < hidden.length; h++) {
      var el = document.getElementById(hidden[h]);
      if (el) wrapperOf(el).style.display = "none";
    }
    for (var id in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, id)) {
        applyOne(document.getElementById(id), defaults[id]);
      }
    }
  }

  function reapplyDefaults() {
    if (window.__jamalPageConfig) apply({ hidden: [], defaults: window.__jamalPageConfig.defaults || {} });
  }

  // Re-apply defaults after the page clears its own form (decoupled: we do
  // not edit the page's own code — we listen for its clear/again buttons).
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (t && t.id === "clear-btn") setTimeout(reapplyDefaults, 60);
    if (t && t.id === "again-btn") setTimeout(reapplyDefaults, 120);
  });

  var session = readSession();
  if (session && session.role === "admin") return; // administrator sees the full form

  import("/firebase.js").then(function (fb) {
    return fb.getDoc(fb.doc(fb.db, "systemPageConfig", PAGE_ID));
  }).then(function (snap) {
    if (!snap.exists()) return;
    var config = snap.data();
    window.__jamalPageConfig = config;
    apply(config);
  }).catch(function () {
    /* no configuration or no access — the form stays as the page built it */
  });
})();

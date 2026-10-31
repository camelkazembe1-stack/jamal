 
(function () {
  var SESSION_KEY = "JAMALI_SYSTEM_SESSION";
  var PAGE_ID = "victim-registration-322";

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (e) { return null; }
  }

  function wrapperOf(el) {
    
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
      if (has) el.value = value; 
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

  
  
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (t && t.id === "clear-btn") setTimeout(reapplyDefaults, 60);
    if (t && t.id === "again-btn") setTimeout(reapplyDefaults, 120);
  });

  var session = readSession();
  if (session && session.role === "admin") return; 

  import("/firebase.js").then(function (fb) {
    return fb.getDoc(fb.doc(fb.db, "systemPageConfig", PAGE_ID));
  }).then(function (snap) {
    if (!snap.exists()) return;
    var config = snap.data();
    window.__jamalPageConfig = config;
    apply(config);
  }).catch(function () {
     
  });
})();

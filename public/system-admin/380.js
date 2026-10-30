// JAMALI — Account Administration (380) — T71 NAMES BUILD
// Minimal admin page. T70 showed only "Jamal"; T71 keeps that and adds
// ONE thing: the names of every registered account (administrator
// included), read from the systemAccounts collection. Names only —
// no buttons, no panels. systemAccounts is readable by the rules
// (allow read: if true), so this always works.
const SESSION_KEY = "JAMALI_SYSTEM_SESSION";
let session = null;
try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
catch (e) { session = null; }
if (!session || session.role !== "admin") {
  location.replace("/?denied=" + encodeURIComponent("system-admin"));
} else {
  boot();
}

function boot() {
  import("/firebase.js")
    .then((F) => F.getDocs(F.collection(F.db, "systemAccounts")))
    .then((snap) => {
      const list = document.getElementById("reg-list");
      if (!list) return;
      const rows = [];
      snap.forEach((d) => {
        const a = d.data();
        rows.push({
          name: a.usernameDisplay || a.username || d.id,
          isAdmin: a.role === "admin" || a.position === "admin"
        });
      });
      rows.sort((x, y) =>
        (y.isAdmin ? 1 : 0) - (x.isAdmin ? 1 : 0) ||
        String(x.name).toLowerCase().localeCompare(String(y.name).toLowerCase()));
      list.innerHTML = "";
      if (!rows.length) {
        const li = document.createElement("li");
        li.textContent = "No registered accounts yet.";
        list.appendChild(li);
      }
      for (const r of rows) {
        const li = document.createElement("li");
        li.textContent = r.name;
        if (r.isAdmin) {
          li.style.fontWeight = "700";
          const tag = document.createElement("span");
          tag.textContent = " · admin";
          tag.style.color = "#b91c1c";
          tag.style.fontWeight = "400";
          li.appendChild(tag);
        }
        list.appendChild(li);
      }
      const tag = document.getElementById("build-tag");
      if (tag) tag.textContent = "build T71 · names · loaded " + new Date().toISOString();
    })
    .catch((e) => {
      const list = document.getElementById("reg-list");
      if (list) {
        list.innerHTML = "";
        const li = document.createElement("li");
        li.textContent = "Could not read accounts: " +
          (e && (e.code || e.message) ? (e.code || "") + " " + (e.message || "") : String(e));
        list.appendChild(li);
      }
    });
}

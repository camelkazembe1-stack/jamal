// JAMALI — Account Administration (380) — T70 MINIMAL BUILD
// Shows the administrator name only. All dashboard panels (self-test,
// counters, notifications, account requests, users & access, page
// fields) were removed on the administrator's order.
// The admin gate stays: no valid admin session -> bounced to the start.
const SESSION_KEY = "JAMALI_SYSTEM_SESSION";
let session = null;
try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
catch (e) { session = null; }
if (!session || session.role !== "admin") {
  location.replace("/?denied=" + encodeURIComponent("system-admin"));
}

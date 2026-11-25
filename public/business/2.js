import { requireAuth, db, collection, onSnapshot, getNotifySettings } from "/sidebar.js";

await requireAuth();

// BUSINESS DASHBOARD ALERTS (25 Nov 2026) - the dashboard half of the
// notification engine's delivery. A live banner above the tiles shows
// how many stocks sit at / below their Low Units right now plus the
// unread alert count, and the newest notifications are listed with a
// straight link into the Notification Center (411).

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const css = [
  "#biz-alerts{margin:0 0 18px}",
  ".biz-banner{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-radius:14px;padding:14px 18px;",
  "font-size:14px;font-weight:700;text-decoration:none;box-shadow:0 6px 18px rgba(15,23,42,.06)}",
  ".biz-banner.is-quiet{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}",
  ".biz-banner.is-loud{background:#fff5f5;border:1px solid #fecaca;color:#991b1b}",
  ".biz-banner .b-ico{font-size:20px}",
  ".biz-banner .b-go{margin-left:auto;background:rgba(2,132,199,.12);color:#075985;border-radius:9px;padding:7px 14px;font-weight:800;font-size:12.5px}",
  ".biz-banner.is-quiet .b-go{background:#dcfce7;color:#166534}",
  ".biz-feed{margin-top:12px;display:grid;gap:8px}",
  ".biz-feed .bf-row{display:flex;gap:10px;align-items:baseline;background:#fff;border:1px solid #e2e8f0;",
  "border-radius:11px;padding:9px 13px;font-size:13px;box-shadow:0 4px 12px rgba(15,23,42,.05)}",
  ".biz-feed .bf-row.is-unread{border-left:4px solid #0ea5e9;background:#f0f9ff}",
  ".biz-feed .bf-t{font-weight:800}",
  ".biz-feed .bf-m{color:#64748b;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".biz-feed .bf-when{color:#94a3b8;font-size:11.5px;white-space:nowrap}"
].join("");
const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);

const grid = document.getElementById("biz-grid");
if (grid) {
  const box = document.createElement("div");
  box.id = "biz-alerts";
  box.innerHTML =
    '<a class="biz-banner is-quiet" id="biz-banner" href="/notification-center/411">' +
    '<span class="b-ico" id="b-ico">&#128276;</span><span id="b-text">Checking stock alerts&hellip;</span>' +
    '<span class="b-go">Open Notification Center</span></a>' +
    '<div class="biz-feed" id="biz-feed"></div>';
  grid.parentNode.insertBefore(box, grid);

  // the Notification Center tile, so the desk is one tap from Business
  const tile = document.createElement("a");
  tile.className = "tile";
  tile.href = "/notification-center/411";
  tile.innerHTML = '<span class="tile-icon">\uD83D\uDD14</span><span class="tile-label">Notification Center</span>';
  grid.appendChild(tile);

  let STOCKS = [];
  let NTFS = [];
  function millis(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    const t = new Date(ts).getTime();
    return isNaN(t) ? 0 : t;
  }
  function render() {
    const banner = document.getElementById("biz-banner");
    if (!banner) return;
    let low = 0, critical = 0, out = 0;
    for (const r of STOCKS) {
      const min = Number(r.minUnits || 0);
      if (!(min > 0)) continue;
      const u = Number(r.units || 0);
      if (u <= 0) out++;
      else if (u < min) critical++;
      else if (u === min) low++;
    }
    const alerts = low + critical + out;
    const unread = NTFS.filter((n) => !n.read).length;
    const s = getNotifySettings();
    const dashOn = s.dashboard !== false;
    const el = document.getElementById("biz-alerts");
    el.style.display = dashOn ? "" : "none";

    if (alerts > 0) {
      banner.className = "biz-banner is-loud";
      document.getElementById("b-ico").textContent = "\u26A0\uFE0F";
      document.getElementById("b-text").textContent =
        alerts + " stock" + (alerts === 1 ? " is" : "s are") + " at or below the Low Units level" +
        (out ? " (" + out + " out of stock)" : "") +
        (unread ? " - " + unread + " unread alert" + (unread === 1 ? "" : "s") : "");
    } else {
      banner.className = "biz-banner is-quiet";
      document.getElementById("b-ico").textContent = "\uD83D\uDD14";
      document.getElementById("b-text").textContent =
        "All monitored stocks are above their Low Units" +
        (unread ? " - " + unread + " unread notification" + (unread === 1 ? "" : "s") : "");
    }
    const feed = document.getElementById("biz-feed");
    const rows = NTFS.slice().sort((a, b) => millis(b.createdAt) - millis(a.createdAt)).slice(0, 3);
    feed.innerHTML = rows.map((n) =>
      '<div class="bf-row' + (n.read ? "" : " is-unread") + '">' +
      '<span class="bf-t">' + esc(n.title || "Notification") + "</span>" +
      '<span class="bf-m">' + esc(n.message || "") + "</span>" +
      '<span class="bf-when">' + (millis(n.createdAt)
        ? new Date(millis(n.createdAt)).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        : "") + "</span></div>").join("");
  }

  onSnapshot(collection(db, "stockItems"), (snap) => {
    STOCKS = (snap.docs || []).map((d) => d.data({ serverTimestamps: "estimate" }) || {});
    render();
  });
  onSnapshot(collection(db, "notifications"), (snap) => {
    NTFS = (snap.docs || []).map((d) => d.data({ serverTimestamps: "estimate" }) || {});
    render();
  });
}

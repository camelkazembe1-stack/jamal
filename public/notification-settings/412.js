import { requireAuth, db, collection, doc, onSnapshot, updateDoc,
         getDocs, query, where, limit,
         getNotifySettings, saveNotifySettings, NOTIFY_EVENTS, NOTIFY_CHANNELS,
         notifyTest } from "/sidebar.js";

await requireAuth();

// NOTIFICATION SETTINGS (412) - the control half of the engine. The
// toggles and recipients are saved per zone; the minimum-stock table
// edits the stockItems documents live (the same Low Units the Stock
// Register writes), and the engine re-arms on the next snapshot.

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let SETTINGS = getNotifySettings();
let STOCKS = [];
const dirtyRows = new Set();

// ---- toggles ---------------------------------------------------------------
$("#event-toggles").innerHTML = NOTIFY_EVENTS.map((ev) =>
  '<label class="tg"><input type="checkbox" data-ev="' + ev.key + '"' +
  (SETTINGS[ev.key] ? " checked" : "") + ">" +
  '<span class="tg-txt"><span class="tg-l">' + esc(ev.label) + "</span>" +
  '<span class="tg-h">' + esc(ev.hint || "") + "</span></span></label>").join("");

$("#channel-toggles").innerHTML = NOTIFY_CHANNELS.map((ch) =>
  '<label class="tg"><input type="checkbox" data-ch="' + ch.key + '"' +
  (SETTINGS[ch.key] ? " checked" : "") + ">" +
  '<span class="tg-txt"><span class="tg-l">' + esc(ch.label) + "</span></span></label>").join("");

function pushStateText() {
  const el = $("#push-state");
  if (typeof window === "undefined" || !window.Notification) {
    el.textContent = "Push is not supported on this device.";
    el.className = "push-state bad";
    return;
  }
  if (Notification.permission === "granted") {
    el.textContent = "Push permission granted.";
    el.className = "push-state ok";
  } else if (Notification.permission === "denied") {
    el.textContent = "Push permission blocked in the browser settings.";
    el.className = "push-state bad";
  } else {
    el.textContent = "Push permission not asked yet.";
    el.className = "push-state";
  }
}
pushStateText();

$("#push-perm").addEventListener("click", async () => {
  if (typeof window === "undefined" || !window.Notification) return;
  try {
    const p = await Notification.requestPermission();
    pushStateText();
    if (p === "granted") {
      SETTINGS.push = true;
      const box = document.querySelector('[data-ch="push"]');
      if (box) box.checked = true;
      try { new Notification("Jamal notifications", { body: "Push is on - alerts will pop here." }); } catch (e) {}
    }
  } catch (e) { pushStateText(); }
});

// ---- recipients -------------------------------------------------------------
$("#ns-phone").value = SETTINGS.phone || "";
$("#ns-email").value = SETTINGS.email || "";

// Prefill the phone from the registration record when the owner never
// set one: the account row in systemAccounts carries the number.
try {
  const mail = ($("#ns-email").value || (SETTINGS.email || "")).trim();
  if (mail && !$("#ns-phone").value) {
    const snap = await getDocs(query(collection(db, "systemAccounts"),
      where("googleEmail", "==", mail), limit(5)));
    snap.forEach((d) => {
      const a = d.data() || {};
      if (!$("#ns-phone").value && a.phone) $("#ns-phone").value = String(a.phone);
      $("#acct-hint").textContent = "Phone prefilled from the registration record - adjust it here if it changed.";
    });
  }
} catch (e) { /* prefill is best-effort only */ }

// ---- minimum stock levels ---------------------------------------------------
function stateOf(r) {
  const min = Number(r.minUnits || 0);
  if (!(min > 0)) return { label: "Not monitored", cls: "st-off" };
  const u = Number(r.units || 0);
  if (u <= 0) return { label: "Out of stock", cls: "st-out" };
  if (u < min) return { label: "Critical", cls: "st-critical" };
  if (u === min) return { label: "Low", cls: "st-low" };
  return { label: "OK", cls: "st-ok" };
}

function renderMin() {
  const body = $("#min-body");
  if (!STOCKS.length) {
    body.innerHTML = '<tr><td colspan="4" style="color:#64748b;padding:14px 10px;">No stock registered yet - add items in the <a href="/stock-register/348">Stock Register</a> first.</td></tr>';
    return;
  }
  body.innerHTML = STOCKS.slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
    .map((r) => {
      const st = stateOf(r);
      return '<tr data-id="' + esc(r.id) + '">' +
        '<td class="c-name">' + esc(r.name || "\u2014") + "</td>" +
        '<td class="c-nowrap">' + (Number(r.units || 0) || 0).toLocaleString("en-US") + "</td>" +
        '<td class="c-num"><input type="number" inputmode="numeric" min="0" step="1" value="' +
          esc(r.minUnits == null ? 0 : r.minUnits) + '" data-min="' + esc(r.id) + '">' +
          '<button type="button" class="row-save" data-save="' + esc(r.id) + '" hidden>Save</button></td>' +
        '<td class="c-nowrap"><span class="st ' + st.cls + '">' + st.label + "</span></td>" +
        "</tr>";
    }).join("");
}

onSnapshot(collection(db, "stockItems"), (snap) => {
  STOCKS = (snap.docs || []).map((d) => {
    const r = d.data({ serverTimestamps: "estimate" }) || {};
    r.id = d.id;
    return r;
  });
  renderMin();
});

$("#min-body").addEventListener("input", (ev) => {
  const inp = ev.target.closest("[data-min]");
  if (!inp) return;
  const id = inp.dataset.min;
  const row = STOCKS.find((r) => r.id === id);
  if (row && Number(inp.value || 0) !== Number(row.minUnits || 0)) {
    inp.classList.add("dirty");
    const btn = document.querySelector('[data-save="' + id + '"]');
    if (btn) btn.hidden = false;
  } else {
    inp.classList.remove("dirty");
    const btn = document.querySelector('[data-save="' + id + '"]');
    if (btn) btn.hidden = true;
  }
});

$("#min-body").addEventListener("click", async (ev) => {
  const btn = ev.target.closest("[data-save]");
  if (!btn) return;
  const id = btn.dataset.save;
  const inp = document.querySelector('[data-min="' + id + '"]');
  if (!inp) return;
  const min = Math.max(0, Math.round(Number(inp.value || 0)));
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    await updateDoc(doc(db, "stockItems", id), { minUnits: min });
    inp.classList.remove("dirty");
    btn.hidden = true;
    note("Low Units for this stock saved - the engine re-armed on the new level.");
  } catch (e) {
    note("Save failed: " + ((e && e.message) || e), true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save";
  }
});

// ---- save & test ------------------------------------------------------------
function note(msg, bad) {
  const el = $("#save-note");
  el.textContent = msg;
  el.className = "save-note" + (bad ? " bad" : "");
  el.hidden = false;
  clearTimeout(note.t);
  note.t = setTimeout(() => { el.hidden = true; }, 4000);
}

$("#save-btn").addEventListener("click", () => {
  const patch = {};
  document.querySelectorAll("[data-ev]").forEach((c) => { patch[c.dataset.ev] = c.checked; });
  document.querySelectorAll("[data-ch]").forEach((c) => { patch[c.dataset.ch] = c.checked; });
  patch.phone = $("#ns-phone").value.trim();
  patch.email = $("#ns-email").value.trim();
  if (patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) {
    note("That email address does not look right.", true);
    return;
  }
  if (patch.sms && !patch.phone) {
    note("SMS is switched on - add the phone number that should receive the texts.", true);
    return;
  }
  SETTINGS = saveNotifySettings(patch);
  pushStateText();
  note("Settings saved for this zone - the engine applies them from the next event on.");
});

$("#test-btn").addEventListener("click", () => {
  const ok = notifyTest();
  note(ok ? "Test alert generated - check the bell and the Notification Center."
          : "The test alert was skipped - an identical record exists already.", !ok);
});

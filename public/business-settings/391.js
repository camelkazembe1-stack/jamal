import { requireAuth, db, doc, getDoc, setDoc, serverTimestamp, localZone } from "/502.js";

await requireAuth();

const $ = (id) => document.getElementById(id);
const PROFILE_REF = doc(db, "businessProfile", "main");
const BACKUP_FORMAT = "jamali-backup";
const BACKUP_VERSION = 1;
const isJamaliKey = (k) => /^jamali/i.test(k);

function say(el, text, ok) {
  el.textContent = text;
  el.className = "msg " + (ok ? "ok" : "err");
}

/* ---------------- business profile ---------------- */
const form = $("profile-form");
const logoImg = $("logo-preview");
const logoClear = $("logo-clear");
let logoData = "";

function paintLogo() {
  logoImg.hidden = !logoData;
  logoClear.hidden = !logoData;
  if (logoData) logoImg.src = logoData;
}

async function loadProfile() {
  const snap = await getDoc(PROFILE_REF);
  if (!snap.exists()) return;
  const p = snap.data() || {};
  for (const el of form.elements) {
    if (!el.name || el.type === "file") continue;
    if (p[el.name] !== undefined && p[el.name] !== null) el.value = p[el.name];
  }
  logoData = p.logo || "";
  paintLogo();
}

function shrinkImage(file, maxSide) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not an image."));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

form.elements.logoFile.addEventListener("change", async (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  try { logoData = await shrinkImage(f, 320); paintLogo(); }
  catch (err) { say($("profile-msg"), err.message, false); }
});
logoClear.addEventListener("click", () => { logoData = ""; form.elements.logoFile.value = ""; paintLogo(); });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("profile-msg");
  const data = {};
  for (const el of form.elements) {
    if (!el.name || el.type === "file") continue;
    data[el.name] = el.value.trim();
  }
  if (!data.name) { say(msg, "Business name is required.", false); return; }
  data.currency = (data.currency || "").toUpperCase();
  data.fyStartMonth = Number(data.fyStartMonth) || 1;
  data.taxRate = data.taxRate === "" ? null : Number(data.taxRate);
  data.logo = logoData;
  data.updatedAt = serverTimestamp();
  $("profile-save").disabled = true;
  try {
    await setDoc(PROFILE_REF, data, { merge: true });
    say(msg, "Profile saved.", true);
    setTimeout(() => {
      if (window.JAMALI_INTERNAL_GO) window.JAMALI_INTERNAL_GO("/business/2");
      else location.replace("/business/2.html");
    }, 600);
  } catch (err) {
    say(msg, "Not saved: " + (err && err.message || err), false);
  } finally {
    $("profile-save").disabled = false;
  }
});

/* ---------------- backup and restore ---------------- */
function jamaliKeys() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && isJamaliKey(k)) out.push(k);
  }
  return out.sort();
}

function countRecords(keys) {
  let n = 0;
  for (const k of keys) {
    if (!k.startsWith("jamaliLocal::")) continue;
    try { n += Object.keys(JSON.parse(localStorage.getItem(k)) || {}).length; } catch (e) {}
  }
  return n;
}

function paintStats() {
  const box = $("backup-stats");
  let keys = [];
  try { keys = jamaliKeys(); } catch (e) {
    box.textContent = "This browser blocks Local Storage (private window?) - records last only until the page closes, so there is nothing to back up.";
    return;
  }
  const areas = keys.filter((k) => k.startsWith("jamaliLocal::")).length;
  const bytes = keys.reduce((s, k) => s + (localStorage.getItem(k) || "").length, 0);
  const z = localZone();
  box.innerHTML = "<b>" + countRecords(keys).toLocaleString("en-US") + "</b> records in <b>" + areas +
    "</b> areas (about " + (bytes / 1024).toFixed(1) + " KB). Current data zone: <b>" +
    String(z.label).replace(/[&<>]/g, "") + "</b>.";
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes());
}

$("backup-btn").addEventListener("click", () => {
  const msg = $("backup-msg");
  try {
    const data = {};
    for (const k of jamaliKeys()) data[k] = localStorage.getItem(k);
    const payload = { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: new Date().toISOString(),
      origin: location.origin, keys: Object.keys(data).length, data };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "jamali-backup_" + stamp() + ".json";
    a.setAttribute("download", a.download);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    say(msg, "Backup downloaded (" + payload.keys + " areas).", true);
  } catch (err) {
    say(msg, "Backup failed: " + (err && err.message || err), false);
  }
});

$("restore-file").addEventListener("change", (e) => {
  const msg = $("backup-msg");
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  const reader = new FileReader();
  reader.onerror = () => say(msg, "Could not read the file.", false);
  reader.onload = () => {
    let payload;
    try { payload = JSON.parse(reader.result); } catch (err) { say(msg, "This is not a JAMALI backup file.", false); return; }
    if (!payload || payload.format !== BACKUP_FORMAT || typeof payload.data !== "object") {
      say(msg, "This is not a JAMALI backup file.", false); return;
    }
    const entries = Object.entries(payload.data).filter(([k, v]) => isJamaliKey(k) && typeof v === "string");
    if (!entries.length) { say(msg, "The backup file is empty.", false); return; }
    const when = payload.createdAt ? new Date(payload.createdAt).toLocaleString() : "an unknown date";
    if (!confirm("Restore " + entries.length + " areas from the backup made on " + when +
      "?\n\nThe records of those areas in this browser will be replaced.")) return;
    try {
      for (const [k, v] of entries) localStorage.setItem(k, v);
    } catch (err) {
      say(msg, "Restore stopped: this browser's storage is full.", false); return;
    }
    say(msg, "Restored " + entries.length + " areas. Reloading...", true);
    setTimeout(() => location.reload(), 900);
  };
  reader.readAsText(f);
});

loadProfile().catch((err) => say($("profile-msg"), "Could not load the profile: " + (err && err.message || err), false));
paintStats();

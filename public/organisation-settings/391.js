import { requireAuth, db, doc, getDoc, setDoc, serverTimestamp, localZone } from "/sidebar.js";

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
    if (el.type === "checkbox") { const m = p.modules || {}; el.checked = m[el.name.slice(4)] !== false; continue; }
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
    if (!el.name || el.type === "file" || el.type === "checkbox") continue;
    data[el.name] = el.value.trim();
  }
  if (!data.name) { say(msg, "Organisation name is required.", false); return; }
  data.modules = {
    business: form.elements.mod_business.checked,
    health: form.elements.mod_health.checked,
    computer: form.elements.mod_computer.checked
  };
  if (!data.modules.business && !data.modules.health && !data.modules.computer) {
    say(msg, "Keep at least one module switched on.", false); return;
  }
  data.currency = (data.currency || "").toUpperCase();
  data.fyStartMonth = Number(data.fyStartMonth) || 1;
  data.taxRate = data.taxRate === "" ? null : Number(data.taxRate);
  data.logo = logoData;
  data.updatedAt = serverTimestamp();
  $("profile-save").disabled = true;
  try {
    await setDoc(PROFILE_REF, data, { merge: true });
    try { localStorage.setItem("jamaliOrgModules", JSON.stringify(data.modules)); } catch (e) {}
    say(msg, "Profile saved.", true);
    setTimeout(() => {
      if (window.JAMALI_INTERNAL_GO) window.JAMALI_INTERNAL_GO("/home/1");
      else location.replace("/home/1.html");
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

// ================= Security: 2FA (TOTP) + device app lock =================
// Everything runs locally through the sidebar security core - Web Crypto
// only, no outside service. The QR (optional) comes from a tiny CDN
// library; if it cannot load, the base32 secret is typed by hand instead.
import("/sidebar.js").then(async (m) => {
  const { twofaStatus, twofaEnroll, twofaVerify, twofaDisable,
          passwordCheck, lockSet, lockStatus, lockRemove } = m;

  const faMsg = (t, good) => { const el = $("fa-msg"); if (el) { el.textContent = t; el.style.color = good ? "#047857" : "#b91c1c"; } };
  const lkMsg = (t, good) => { const el = $("lock-msg"); if (el) { el.textContent = t; el.style.color = good ? "#047857" : "#b91c1c"; } };

  function paintFa() {
    const st = twofaStatus();
    $("fa-status").textContent = !st.enrolled
      ? "2FA is not set up for this account yet."
      : (st.enabled ? "2FA is ON for this account - the shell asks for the 6-digit code when you reopen the system."
                    : "2FA is enrolled but not confirmed yet - finish the verify step below.");
    $("fa-start-row").hidden = st.enrolled && st.enabled ? true : !!(st.enrolled && !st.enabled);
    $("fa-off-row").hidden = !(st.enrolled && st.enabled);
    $("fa-setup").hidden = st.enrolled && st.enabled ? true : true; // only shown right after enrolling
    if (st.enrolled && !st.enabled) {
      // resume a pending enrollment: re-show the verify row without new secret
      $("fa-setup").hidden = false;
      $("fa-qr").hidden = true;
      $("fa-secret").textContent = "(the secret you saved earlier - scroll up in your authenticator)";
      $("fa-recovery").textContent = "(saved earlier)";
    }
  }
  function paintLock() {
    const st = lockStatus();
    $("lock-status").textContent = st.set
      ? "A device lock is set (since " + String(st.setAt || "").slice(0, 10) + ") - the shell asks for it when the system opens on this browser."
      : "No device lock is set on this browser.";
    $("lock-remove-row").hidden = !st.set;
  }

  let pending = null;
  $("fa-enroll").addEventListener("click", async () => {
    try {
      pending = await twofaEnroll();
      $("fa-setup").hidden = false;
      $("fa-secret").textContent = pending.secret;
      $("fa-recovery").textContent = pending.recovery;
      $("fa-status").textContent = "Scan or type the secret, then verify a 6-digit code to switch 2FA on.";
      // the QR: optional, loads from a CDN; typing the secret by hand works too
      try {
        const lib = await import("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js");
        const qr = window.qrcode ? window.qrcode : (lib.default || lib);
        const q = qr(0, "M");
        q.addData(pending.otpauth);
        q.make();
        $("fa-qr").src = q.createDataURL(4, 8);
        $("fa-qr").hidden = false;
      } catch (e) { $("fa-qr").hidden = true; }
      paintFa();
    } catch (e) { faMsg("Could not create the secret: " + ((e && e.message) || e), false); }
  });

  $("fa-verify").addEventListener("click", async () => {
    const code = $("fa-code").value.trim();
    if (!code) { faMsg("Type the 6-digit code from the authenticator app.", false); return; }
    const r = await twofaVerify(code);
    if (r.ok) {
      faMsg("2FA is ON. Keep the recovery code offline - it works once if the phone is lost." +
        (r.via === "recovery" ? " (verified with the recovery code)" : ""), true);
      pending = null;
      $("fa-setup").hidden = true;
      paintFa();
    } else {
      faMsg("Verification failed (" + (r.reason || "wrong code") + ") - check the code and try again, remember the clock must be right on both devices.", false);
    }
  });

  $("fa-disable").addEventListener("click", async () => {
    const code = $("fa-off-code").value.trim();
    if (!code) { faMsg("Type the current 6-digit code to switch 2FA off.", false); return; }
    const r = await twofaDisable(code);
    if (r.ok) { faMsg("2FA is off for this account.", true); paintFa(); }
    else faMsg("Could not switch it off (" + (r.reason || "wrong code") + ").", false);
  });

  $("lock-set").addEventListener("click", async () => {
    const pw = $("lock-new").value;
    if (!pw) { lkMsg("Type the lock password first.", false); return; }
    const r = await lockSet(pw);
    if (r.ok) {
      lkMsg("Device lock saved - the shell will ask for it when the system opens on this browser." +
        " Do not lose it: it lives only in this browser's storage.", true);
      $("lock-new").value = "";
      paintLock();
    } else {
      lkMsg("The password does not meet the policy - needs " + (r.problems || []).join("; ") + ".", false);
    }
  });
  $("lock-remove").addEventListener("click", async () => {
    const r = await lockRemove($("lock-cur").value);
    if (r.ok) { lkMsg("Device lock removed from this browser.", true); paintLock(); }
    else lkMsg("Wrong current password.", false);
  });

  paintFa();
  paintLock();
});


import { requireAuth, db, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
         watchHealthPatients, patientById } from "/sidebar.js";

window.__p02.ran = true;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STATUSES = ["Waiting", "In progress", "Completed", "Cancelled"];
const ST = { "Waiting": "st-wait", "In progress": "st-busy", "Completed": "st-done", "Cancelled": "st-cancel" };

function herr(coll, e) {
  const code = String((e && (e.code || e.message)) || "unknown error");
  if (window.__p02) window.__p02.errs.push(coll + ": " + code);
  const boot = document.getElementById("h-boot");
  if (boot) boot.hidden = true;
  const box = document.getElementById("h-err");
  if (!box) return;
  box.hidden = false;
  document.getElementById("h-err-txt").textContent = "Could not read " + coll + " \u2014 " + code;
}
function bootDone() {
  if (window.__p02) window.__p02.answered = true;
  const b = document.getElementById("h-boot");
  if (b) b.hidden = true;
}

try { await requireAuth(); window.__p02.auth = true; }
catch (e) { herr("the sign-in check", e); throw e; }

let recs = [];
const todayLocal = () => { const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

// ---- ONE PATIENT ID ----------------------------------------------------------
// A session carries the patient's single Registration ID (4 digits + 4
// letters, e.g. 4827ABCD) from Registration (page 322). The ID box offers
// the live registry as you type and shows the patient under the box; a
// typed ID must be registered, and a name that matches one registered
// patient fills its ID automatically.
const who = (p) => (p && p.isUnidentified) ? "Unidentified" : ((p && p.fullName) || "Unnamed");
let REG_ROWS = [];
const regInput = $("#f-regid");
const regHint = $("#f-regid-hint");
const regList = $("#f-regids");
function regPaint() {
  if (!regInput || !regHint) return;
  const v = String(regInput.value || "").trim();
  if (!v) { regHint.textContent = ""; regHint.className = "f-hint"; return; }
  const p = patientById(v);
  if (p) { regHint.textContent = "\u2713 " + who(p); regHint.className = "f-hint ok"; }
  else { regHint.textContent = "\u2717 Not a registered Registration ID \u2014 pick from the list (e.g. 4827ABCD).";
         regHint.className = "f-hint bad"; }
}
watchHealthPatients((rows) => {
  REG_ROWS = rows;
  if (regList) regList.innerHTML = rows.map((p) =>
    '<option value="' + esc(String(p.regId || "")) + '">' + esc(who(p)) + "</option>").join("");
  regPaint();
});
if (regInput) regInput.addEventListener("input", regPaint);

onSnapshot(collection(db, "healthTelemedicine"), (snap) => {
  recs = snap.docs.map((d) => Object.assign({}, d.data({ serverTimestamps: "estimate" }), { __id: d.id }))
    .sort((a, b) => String(b.scheduledAt || b.createdAt || "").localeCompare(String(a.scheduledAt || a.createdAt || "")));
  if (window.__p02) window.__p02.docs = recs.length;
  renderAll();
}, (e) => herr("healthTelemedicine", e));

window.__p02.listeners = 1;

function safeLink(v) {
  const s = String(v || "").trim();
  return /^(https?:|tel:)/i.test(s) ? s : "";
}

function renderAll() {
  $("#d-waiting").textContent = String(recs.filter((r) => r.status === "Waiting").length);
  $("#d-active").textContent = String(recs.filter((r) => r.status === "In progress").length);
  $("#d-done").textContent = String(recs.filter((r) => r.status === "Completed").length);
  $("#d-cancelled").textContent = String(recs.filter((r) => r.status === "Cancelled").length);

  const q = String(($("#rec-search") || {}).value || "").trim().toLowerCase();
  const rows = !q ? recs : recs.filter((r) =>
    ["ref", "patientName", "phone", "reason", "regId", "doctor"].some((k) =>
      String(r[k] || "").toLowerCase().includes(q)));

  const has = rows.length > 0;
  $("#t-card").hidden = !has;
  $("#t-empty").hidden = has;
  $("#t-body").innerHTML = rows.map((r) => {
    const when = String(r.scheduledAt || "").replace("T", " ").slice(0, 16) || String(r.createdAt || "").slice(0, 10);
    const link = safeLink(r.meetLink);
    return "<tr>" +
      '<td><span class="ref">' + esc(r.ref || "") + "</span></td>" +
      '<td class="c-when">' + esc(when || "—") + "</td>" +
      '<td class="c-name">' + esc(r.patientName || "—") + (r.phone ? '<br><span class="d-none">' + esc(r.phone) + "</span>" : "") + "</td>" +
      "<td>" + esc(r.reason || "—") + "</td>" +
      '<td class="c-link">' + (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener">Open call &rarr;</a>' : '<span class="d-none">no link</span>') + "</td>" +
      '<td><span class="st ' + (ST[r.status] || "st-wait") + '">' + esc(r.status || "Waiting") + "</span></td>" +
      '<td class="c-act"><select class="st-sel" data-id="' + esc(r.__id) + '">' +
        STATUSES.map((s) => "<option" + (s === r.status ? " selected" : "") + ">" + s + "</option>").join("") +
      "</select> <button type=\"button\" class=\"mini-btn v-open\" data-vref=\"" + esc(r.ref || "") + "\"" +
        (r.ref ? "" : " disabled") + ">Video</button> <button type=\"button\" class=\"row-del\" data-id=\"" + esc(r.__id) + '">Delete</button></td>' +
      "</tr>";
  }).join("");
  $("#t-count").textContent = has
    ? rows.length + " consultation(s)" + (q ? " matching '" + q + "'" : "") + " on this device's records."
    : "";
}

$("#rec-search").addEventListener("input", renderAll);

const form = $(".s-form");
$(".s-toggle").addEventListener("click", () => {
  form.hidden = !form.hidden;
  $(".s-toggle").textContent = form.hidden ? "\uFF0B Book a remote consultation" : "\u00D7 Close";
});
$(".s-cancel").addEventListener("click", () => { form.hidden = true;
  $(".s-toggle").textContent = "\uFF0B Book a remote consultation"; });

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = $("#f-err"), ok = $("#f-ok");
  err.hidden = true; ok.hidden = true;
  const patientName = $("#f-name").value.trim();
  const reason = $("#f-reason").value.trim();
  if (!patientName || !reason)
    { err.textContent = "Fill in the patient name and the reason."; err.hidden = false; return; }
  const regTyped = String(($("#f-regid") || {}).value || "").trim();
  if (regTyped && !patientById(regTyped)) {
    err.textContent = "Registration ID must be a registered one (e.g. 4827ABCD) \u2014 pick the patient from the list, or leave it empty and the name will be matched.";
    err.hidden = false; return;
  }
  let regOut = regTyped;
  if (!regOut) {
    const hits = REG_ROWS.filter((p) => !p.isUnidentified &&
      String(p.fullName || "").trim().toLowerCase() === patientName.toLowerCase());
    if (hits.length === 1) regOut = String(hits[0].regId || "");
  }
  const data = {
    regId: regOut,
    patientName, phone: $("#f-phone").value.trim(), reason,
    scheduledAt: $("#f-when").value,
    meetLink: $("#f-link").value.trim(),
    doctor: $("#f-doctor").value.trim(),
    notes: $("#f-notes").value.trim(),
    status: "Waiting",
    ref: "TEL-" + todayLocal().replace(/-/g, "").slice(2) + "-" + String((recs.length + 1) % 10000).padStart(4, "0"),
    createdAt: new Date().toISOString()
  };
  const btn = $(".s-save");
  btn.disabled = true; btn.textContent = "Saving\u2026";
  try {
    await addDoc(collection(db, "healthTelemedicine"), data);
    ok.textContent = "Booked as " + data.ref + " - status Waiting.";
    form.reset(); form.hidden = true;
    $(".s-toggle").textContent = "\uFF0B Book a remote consultation";
  } catch (e) {
    err.textContent = "Save failed: " + ((e && (e.code || e.message)) || e);
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Book Consultation";
  }
});

$("#t-body").addEventListener("change", (ev) => {
  const sel = ev.target.closest("select.st-sel");
  if (!sel) return;
  const id = sel.getAttribute("data-id");
  const rec = recs.find((r) => r.__id === id);
  if (!rec) return;
  updateDoc(doc(db, "healthTelemedicine", id),
    { status: sel.value, updatedAt: new Date().toISOString() })
    .catch(() => { rec.status = sel.value; renderAll(); });
  rec.status = sel.value;
  renderAll();
});

$("#t-body").addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button.row-del");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const rec = recs.find((r) => r.__id === id);
  if (!rec) return;
  if (!window.confirm("Delete consultation " + (rec.ref || "") + "? This cannot be undone.")) return;
  try { await deleteDoc(doc(db, "healthTelemedicine", id)); }
  catch (e) { window.alert("Delete failed: " + ((e && (e.code || e.message)) || e)); }
});

renderAll();
bootDone();

// ======================================================================
//   THE VIDEO ROOM - real WebRTC picture and sound, browser to browser.
//   The handshake travels through PeerJS's free public broker (no server
//   of ours is involved and the clinic records never carry the call);
//   after the handshake the media flows directly between the two devices.
//   Room code = the consultation's ref, so both sides find each other
//   without typing: the doctor presses Video on the row, and any second
//   device (the patient's phone, the remote-branch clinician) opens the
//   same page with ?room=<ref> - the joining-link note in the booking
//   form can carry that address too.
// ======================================================================
const RTC_ROOM_PREFIX = "jmali-tv-";
const PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
let vPeer = null, vCall = null, vLocalStream = null;
let vOpen = false, vLive = false, vMuted = false, vCamOff = false, vRoomRef = "";

const vEl = (id) => document.getElementById(id);
function vState(txt, live) {
  const s = vEl("v-state");
  if (s) { s.textContent = txt; s.className = "v-state" + (live ? " live" : ""); }
}
function vFail(txt) {
  const box = vEl("v-err");
  if (box) { box.hidden = false; box.textContent = txt; }
}
function vClearErr() { const box = vEl("v-err"); if (box) box.hidden = true; }
const vRoomId = (ref) => RTC_ROOM_PREFIX + String(ref || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function vLoadPeerJs() {
  if (window.Peer) return Promise.resolve(window.Peer);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PEERJS_CDN;
    s.async = true;
    s.onload = () => resolve(window.Peer);
    s.onerror = () => reject(new Error("The video broker could not load (network blocked the library) - use the joining link or a phone call instead."));
    document.head.appendChild(s);
  });
}

function openVideoRoom(ref) {
  vRoomRef = String(ref || "");
  if (!vRoomRef) return;
  vEl("v-ref").textContent = vRoomRef;
  vEl("v-card").hidden = false;
  vReset(false);
  vClearErr();
  vState("room open - press Start / join on both devices");
  vEl("v-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

// vReset(full) - teardown. full=true also clears the room and the panel.
function vReset(full) {
  try { if (vCall) vCall.close(); } catch (e) {}
  try { if (vPeer) vPeer.destroy(); } catch (e) {}
  if (vLocalStream) vLocalStream.getTracks().forEach((t) => t.stop());
  vPeer = null; vCall = null; vLocalStream = null;
  vOpen = false; vLive = false; vMuted = false; vCamOff = false;
  const rl = vEl("v-remote"), ll = vEl("v-local");
  if (rl) rl.srcObject = null;
  if (ll) ll.srcObject = null;
  const hold = vEl("v-remote-hold");
  if (hold) hold.hidden = false;
  for (const [id, dis] of [["v-start", false], ["v-mute", true], ["v-cam", true], ["v-end", true]]) {
    const b = vEl(id);
    if (b) b.disabled = dis;
  }
  const mb = vEl("v-mute"); if (mb) mb.textContent = "Mute mic";
  const cb = vEl("v-cam"); if (cb) cb.textContent = "Camera off";
  if (full) { vEl("v-card").hidden = true; vRoomRef = ""; }
}

async function vStart() {
  if (vOpen) return;
  vClearErr();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    vFail("This browser has no camera/microphone access - use the joining link or a phone call.");
    return;
  }
  vEl("v-start").disabled = true;
  vState("asking for camera and microphone\u2026");
  try {
    vLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (e) {
    vFail("Camera/microphone refused (" + ((e && e.name) || e) + ") - allow access, or use the joining link / a phone call.");
    vEl("v-start").disabled = false;
    vState("idle");
    return;
  }
  const ll = vEl("v-local");
  if (ll) ll.srcObject = vLocalStream;
  for (const id of ["v-mute", "v-cam", "v-end"]) { const b = vEl(id); if (b) b.disabled = false; }
  vState("reaching the video broker\u2026");
  let PeerCtor;
  try { PeerCtor = await vLoadPeerJs(); }
  catch (e) { vFail(e.message); vEl("v-start").disabled = false; vState("idle"); return; }

  const roomId = vRoomId(vRoomRef);
  vOpen = true;
  // First device: register as the room. If the id is already taken, this
  // device is the guest and calls the host instead.
  const peer = new PeerCtor(roomId, { debug: 0 });
  vPeer = peer;
  peer.on("open", () => {
    vState("room ready - waiting for the other side");
    peer.on("call", (call) => {
      vCall = call;
      call.answer(vLocalStream);
      call.on("stream", (remote) => vShowRemote(remote));
      call.on("close", () => vReset(false));
    });
  });
  peer.on("call", (call) => {   // may fire before "open" in rare races
    vCall = call;
    call.answer(vLocalStream);
    call.on("stream", (remote) => vShowRemote(remote));
    call.on("close", () => vReset(false));
  });
  peer.on("error", async (err) => {
    const t = String((err && err.type) || "");
    if (t === "unavailable-id") {
      // The room exists - join it as the guest.
      try { peer.destroy(); } catch (e) {}
      const me = new PeerCtor(roomId + "-g" + Math.random().toString(36).slice(2, 8), { debug: 0 });
      vPeer = me;
      me.on("open", () => {
        vState("joining the room\u2026");
        const call = me.call(roomId, vLocalStream);
        vCall = call;
        call.on("stream", (remote) => vShowRemote(remote));
        call.on("close", () => vReset(false));
      });
      me.on("error", (e2) => {
        if (String(e2.type) !== "peer-unavailable") return;
        vFail("Nobody is in the room yet - keep this page open; the other side must press Start / join too.");
        vState("room open - waiting");
      });
      return;
    }
    if (t === "peer-unavailable") {
      vFail("Nobody is in the room yet - keep this page open; the other side must press Start / join too.");
      vState("room open - waiting");
      return;
    }
    if (!vLive) vFail("Video broker error (" + (t || "unknown") + ") - check the network, or use the joining link / a phone call.");
    vState("idle");
  });
}

function vShowRemote(stream) {
  const rl = vEl("v-remote");
  if (rl) rl.srcObject = stream;
  const hold = vEl("v-remote-hold");
  if (hold) hold.hidden = true;
  vLive = true;
  vState("in call", true);
}

function vEnd() {
  if (vLive) vState("ended");
  vReset(false);
  vState("ended - press Start / join to call again");
}

function vToggle(kind, btn) {
  if (!vLocalStream) return;
  const tracks = kind === "audio"
    ? vLocalStream.getAudioTracks() : vLocalStream.getVideoTracks();
  for (const t of tracks) t.enabled = !t.enabled;
  if (kind === "audio") {
    vMuted = !vMuted;
    btn.textContent = vMuted ? "Unmute mic" : "Mute mic";
  } else {
    vCamOff = !vCamOff;
    btn.textContent = vCamOff ? "Camera on" : "Camera off";
  }
}

// buttons
const vStartBtn = vEl("v-start");
if (vStartBtn) vStartBtn.addEventListener("click", () => {
  vStart().catch((e) => { vFail(String((e && e.message) || e)); vEl("v-start").disabled = false; });
});
const vEndBtn = vEl("v-end");
if (vEndBtn) vEndBtn.addEventListener("click", vEnd);
const vCloseBtn = vEl("v-close");
if (vCloseBtn) vCloseBtn.addEventListener("click", () => vReset(true));
const vMuteBtn = vEl("v-mute");
if (vMuteBtn) vMuteBtn.addEventListener("click", () => vToggle("audio", vMuteBtn));
const vCamBtn = vEl("v-cam");
if (vCamBtn) vCamBtn.addEventListener("click", () => vToggle("video", vCamBtn));

// open the room from a table row
$("#t-body").addEventListener("click", (ev) => {
  const vb = ev.target.closest("button.v-open");
  if (vb) { openVideoRoom(vb.getAttribute("data-vref")); return; }
});

// a ?room=<ref> link opens the room itself (the address a patient or the
// remote-branch clinician receives)
try {
  const urlRoom = new URLSearchParams(location.search).get("room");
  if (urlRoom) {
    openVideoRoom(urlRoom);
    const note = vEl("f-ok");
    if (note) { note.hidden = false;
      note.textContent = "Opened the video room " + String(urlRoom) + " from the link - press Start / join the call."; }
  }
} catch (e) {}

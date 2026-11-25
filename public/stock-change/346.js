import { requireAuth, db, collection, doc, getDoc, getDocs, query, orderBy, limit,
         onSnapshot, writeBatch, increment, serverTimestamp } from "/sidebar.js";

await requireAuth();

// The fourteen causes, in the four groups of the spec.
// money: "IN"  -> transaction type IN,  amount at Unit Selling Price (SP)
//        "OUT" -> transaction type OUT, amount at Buying Price (BP)
//        null  -> no money moves,       type NEUTRAL, amount at BP
const GROUPS = [
  { label: "Stock IN \u2013 With Money", badge: "b-in", dir: "IN", causes: [
    { name: "Purchases",     icon: "\u{1F6D2}" },
    { name: "Sales Returns", icon: "\u{21A9}\uFE0F" }
  ]},
  { label: "Stock IN \u2013 Without Money", badge: "b-in", dir: "IN", causes: [
    { name: "Free Stock Received",  icon: "\u{1F381}" },
    { name: "Stock Transfers IN",   icon: "\u{1F4E5}" },
    { name: "Stock Adjustments IN", icon: "\u{2795}" }
  ]},
  { label: "Stock OUT \u2013 With Money", badge: "b-out", dir: "OUT", causes: [
    { name: "Sales",             icon: "\u{1F4B0}" },
    { name: "Purchases Returns", icon: "\u{21AA}\uFE0F" }
  ]},
  { label: "Stock OUT \u2013 Without Money", badge: "b-out", dir: "OUT", causes: [
    { name: "Stock Damage",           icon: "\u{1F6AB}" },
    { name: "Stock Expiry",           icon: "\u{23F0}" },
    { name: "Theft",                  icon: "\u{1F6A8}" },
    { name: "Internal Use",           icon: "\u{1F3E2}" },
    { name: "Pharmacy Dispense",      icon: "\u{1F48A}" },
    { name: "Free Samples",           icon: "\u{1F9FA}" },
    { name: "Stock Transfers OUT",    icon: "\u{1F4E4}" },
    { name: "Stock Adjustments OUT",  icon: "\u{2796}" }
  ]}
];
const MONEY = { "Purchases": "OUT", "Sales Returns": "OUT", "Sales": "IN", "Purchases Returns": "IN" };
const METHOD_ICONS = { Cash: "\u{1F4B5}", Credit: "\u{1F464}", Bank: "\u{1F3DB}\uFE0F" };

const $ = (s) => document.querySelector(s);
const state = { cause: null, dir: null, money: null, method: null, stock: null, batch: null };
let STOCKS = [];
let searchQ = "";

// STOCK CAPTURE (25 Nov 2026): on a Sale the camera photographs the
// item or its price tag, the photo + the BP / SP are saved with the
// sale record, and the sold amount is calculated automatically from
// the (possibly corrected) prices. OCR via Tesseract.js is assistive
// and optional - without it the prices load from the stock record and
// stay fully editable, so the flow works offline too.
const capState = { photo: null, ocrText: "", bpDirty: false, spDirty: false };
let ocrTried = false;
let capStream = null;

const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const round = (n) => Math.round(n * 10000) / 10000;

function showStep(n) {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("is-active"));
  $("#step-" + n).classList.add("is-active");
  window.scrollTo({ top: 0 });
}

// ---- step 1: the fourteen cause buttons -----------------------------------
$("#groups").innerHTML = GROUPS.map((g) =>
  '<section class="group">' +
    '<h2 class="group-label"><span class="badge ' + g.badge + '">' +
      (g.dir === "IN" ? "STOCK IN" : "STOCK OUT") + "</span> " +
      esc(g.label.split("\u2013")[1].trim()) + "</h2>" +
    '<div class="grid">' +
      g.causes.map((c) =>
        '<button class="tile" type="button" data-cause="' + esc(c.name) + '">' +
          '<span class="tile-icon">' + c.icon + "</span>" +
          '<span class="tile-label">' + esc(c.name) + "</span></button>").join("") +
    "</div></section>").join("");

document.querySelectorAll("#groups .tile").forEach((btn) =>
  btn.addEventListener("click", () => {
    state.cause = btn.dataset.cause;
    state.dir = btn.closest(".group").querySelector(".badge").textContent.includes("IN") ? "IN" : "OUT";
    state.money = MONEY[state.cause] || null;
    state.method = null;
    openStocks();
  }));

// ---- step 2: search + the registered stocks as square buttons --------------
function renderStocks() {
  const grid = $("#stock-grid");
  const q = searchQ.trim().toLowerCase();
  const list = STOCKS.filter((r) => !q || String(r.name || "").toLowerCase().includes(q));
  $("#stock-empty").hidden = STOCKS.length > 0;
  grid.style.display = list.length ? "" : "none";
  grid.innerHTML = list.map((r) =>
    '<button class="tile" type="button" data-id="' + esc(r.id) + '">' +
      '<span class="tile-icon">📦</span>' +
      '<span class="tile-label">' + esc(r.name) + "</span>" +
      '<span class="tile-units">' + Number(r.units || 0).toLocaleString("en-US") + " units</span></button>").join("");
  grid.querySelectorAll(".tile").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.stock = STOCKS.find((r) => r.id === btn.dataset.id);
      openForm();
    }));
}

onSnapshot(query(collection(db, "stockItems"), orderBy("name")), (snap) => {
  STOCKS = [];
  snap.forEach((d) => STOCKS.push(Object.assign({ id: d.id }, d.data({ serverTimestamps: "estimate" }))));
  renderStocks();
});

$("#stock-search").addEventListener("input", (e) => { searchQ = e.target.value; renderStocks(); });

function openStocks() {
  $("#cause-title").textContent = state.cause;
  $("#cause-sub").textContent = "Step 2 of 3 \u00B7 " +
    (state.dir === "IN" ? "Stock IN" : "Stock OUT") +
    (state.money ? " \u00B7 with money" : " \u00B7 without money") +
    " \u2014 pick the stock, then enter the quantity.";
  $("#stock-search").value = "";
  searchQ = "";
  renderStocks();
  showStep(2);
}

// ---- step 3: quantity + flow method + preview + save -----------------------
const uppOf = () => Number(state.stock && state.stock.unitsPerPackage) || 0;

// the Cash / Credit / Bank segment: one renderer for the single-item path
// and the scanned-batch path, so both always have working buttons.
function wireMethod() {
  if (!state.money) { state.method = null; return; }
  $("#method-seg").innerHTML = ["Cash", "Credit", "Bank"].map((m) =>
    '<button class="seg-btn" type="button" data-v="' + m + '">' + METHOD_ICONS[m] + " " + m + "</button>").join("");
  document.querySelectorAll("#method-seg .seg-btn").forEach((b) =>
    b.addEventListener("click", () => {
      state.method = b.dataset.v;
      document.querySelectorAll("#method-seg .seg-btn").forEach((x) => x.classList.toggle("is-on", x === b));
      $("#f-person").hidden = state.method !== "Credit";
      $("#f-bank").hidden = state.method !== "Bank";
      updatePreview();
    }));
}

function openForm() {
  const r = state.stock;
  $("#in-packages").value = "";
  $("#in-units").value = "";
  $("#in-person").value = "";
  $("#in-bank").value = "";
  $("#form-err").hidden = true;
  $("#preview").textContent = "";

  // BATCH (scan) mode: confirmed scan results ride this step as a list;
  // the single-item quantity box comes back for the manual path.
  const batchMode = Array.isArray(state.batch) && state.batch.length > 0;
  if (batchMode) {
    $("#form-title").textContent = state.cause + " \u2014 " + state.batch.length + " scanned product(s)";
    $("#form-sub").textContent = "Step 3 of 3 \u00B7 " +
      (state.dir === "IN" ? "Stock IN \u2014 adds units" : "Stock OUT \u2014 deducts units") +
      " \u00B7 enter the quantity for every product, then save them all as one stock change.";
    $("#f-qty-single").hidden = true;
    $("#f-person").hidden = true;
    $("#f-bank").hidden = true;
    $("#f-capture").hidden = true;
    $("#f-batch").hidden = false;
    wireMethod();
    $("#f-method").hidden = !state.money;
    renderBatch();
    showStep(3);
    return;
  }

  $("#form-title").textContent = state.cause + " \u2014 " + r.name;
  $("#form-sub").textContent = "Step 3 of 3 \u00B7 " +
    (state.dir === "IN" ? "Stock IN \u2014 adds units" : "Stock OUT \u2014 deducts units") +
    " \u00B7 " + Number(r.units || 0).toLocaleString("en-US") + " unit(s) present now.";
  $("#f-batch").hidden = true;
  $("#f-qty-single").hidden = false;

  // capture box: a Sales flow photographs the item / price tag and
  // saves BP + SP with the record; everything else hides it again.
  const isSale = state.cause === "Sales";
  $("#f-capture").hidden = !isSale;
  if (isSale) {
    capState.photo = null;
    capState.bpDirty = false;
    capState.spDirty = false;
    $("#cap-photo").hidden = true;
    $("#cap-photo").removeAttribute("src");
    $("#cap-status").textContent = "";
    $("#cap-ocr").hidden = true;
    $("#cap-ocr").textContent = "";
    $("#cap-update-row").hidden = true;
    $("#cap-update").checked = false;
    $("#cap-bp").value = Number(r.buyPrice || 0) || "";
    $("#cap-sp").value = Number(r.unitPrice || 0) || "";
    ocrTried = false;
  }

  const upp = uppOf();
  $("#qty-hint").textContent = upp
    ? "1 package = " + upp + " units \u2014 type the Packages or the Units and the other box calculates itself."
    : "";

  const needsMethod = !!state.money;
  $("#f-method").hidden = !needsMethod;
  $("#f-person").hidden = true;
  $("#f-bank").hidden = true;
  if (needsMethod) {
    wireMethod();
  } else {
    state.method = null;
  }
  showStep(3);
  updatePreview();
}

// Packages and Units are two representations of one quantity, joined by
// Units per Package: packages x unitsPerPackage = units.
let lastQty = "";
function wireQty(which) {
  lastQty = which;
  const upp = uppOf();
  if (!upp) return;
  if (which === "pk") {
    const pk = $("#in-packages").value;
    $("#in-units").value = pk === "" ? "" : round(Number(pk) * upp);
  } else {
    const un = $("#in-units").value;
    $("#in-packages").value = un === "" ? "" : round(Number(un) / upp);
  }
}
$("#in-packages").addEventListener("input", () => { wireQty("pk"); updatePreview(); });
$("#in-units").addEventListener("input", () => { wireQty("un"); updatePreview(); });
["#in-person", "#in-bank"].forEach((s) => $(s).addEventListener("input", updatePreview));

function txnTypeOf() { return state.money ? state.money : "NEUTRAL"; }

function unitPriceOf() {
  const r = state.stock;
  if (state.money === "IN") {
    // a corrected SP from the capture box wins over the stored price
    if (!$("#f-capture").hidden) {
      const v = Number($("#cap-sp").value);
      if (v > 0) return v;
    }
    return Number(r.unitPrice || 0);
  }
  return Number(r.buyPrice || 0) / (uppOf() || 1);
}

function captureUnitBpOf() {
  const r = state.stock;
  const bp = Number($("#cap-bp").value);
  const perPackage = bp > 0 ? bp : Number(r.buyPrice || 0);
  return perPackage / (uppOf() || 1);
}

function updatePreview() {
  if (!state.stock) return;
  const r = state.stock;
  const units = Number($("#in-units").value) || 0;
  const before = Number(r.units || 0);
  const after = state.dir === "IN" ? before + units : before - units;
  const amount = Math.round(units * unitPriceOf() * 100) / 100;

  let p = state.cause + " \u00B7 " + r.name + " \u00B7 " + units + " unit(s) \u00B7 " +
    before.toLocaleString("en-US") + " \u2192 " + after.toLocaleString("en-US");
  p += "   |   transaction: " + state.cause + " \u00B7 " + txnTypeOf();
  if (state.money) {
    p += " \u00B7 " + (state.method || "method\u2026");
    const nm = state.method === "Credit" ? $("#in-person").value.trim()
             : state.method === "Bank" ? $("#in-bank").value.trim() : "";
    if (nm) p += " \u00B7 " + nm;
  } else {
    p += " \u00B7 no flow method";
  }
  p += " \u00B7 " + fmt(amount) + (state.money === "IN" ? " (SP)" : " (BP)");
  if (state.cause === "Sales") {
    const profit = Math.round(units * (Number($("#cap-sp").value || unitPriceOf()) - captureUnitBpOf()) * 100) / 100;
    p += " \u00B7 profit " + fmt(profit) + " (SP \u2212 BP per unit \u00D7 units)";
  }
  $("#preview").textContent = "Will save: " + p;
}

// ---- stock capture: camera + assistive OCR --------------------------------
function ocrNote(msg) {
  const el = $("#cap-ocr");
  el.textContent = msg;
  el.hidden = false;
}

function tryOcr(canvas) {
  if (ocrTried) return;
  ocrTried = true;
  const go = () => {
    if (!window.Tesseract) { ocrNote("OCR unavailable - type the prices from the tag if they changed."); return; }
    Tesseract.recognize(canvas, "eng").then((res) => {
      const text = String((res && res.data && res.data.text) || "").replace(/\s+/g, " ").trim();
      if (!text) { ocrNote("OCR read nothing useful - the prices stay as loaded from the stock."); return; }
      capState.ocrText = text.slice(0, 300);
      const nums = (text.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n > 0);
      if (nums.length >= 2 && !capState.bpDirty && !capState.spDirty) {
        $("#cap-bp").value = nums[0];
        $("#cap-sp").value = nums[1];
        $("#cap-update-row").hidden = false;
        ocrNote("OCR read: \"" + text.slice(0, 140) + "\" - filled BP " + nums[0] + " and SP " + nums[1] + ". Correct them if the tag says otherwise.");
      } else {
        ocrNote("OCR read: \"" + text.slice(0, 140) + "\"");
      }
      updatePreview();
    }).catch(() => ocrNote("OCR failed - the prices stay as loaded from the stock."));
  };
  if (window.Tesseract) { go(); return; }
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  s.onload = go;
  s.onerror = () => ocrNote("OCR library unavailable (offline?) - the prices stay as loaded.");
  document.head.appendChild(s);
  setTimeout(() => { if (!window.Tesseract) ocrNote("OCR timed out - the prices stay as loaded."); }, 15000);
}

$("#cap-btn").addEventListener("click", async () => {
  $("#cap-modal-err").hidden = true;
  $("#cap-modal").hidden = false;
  try {
    capStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } }, audio: false
    });
    $("#cap-video").srcObject = capStream;
  } catch (e) {
    $("#cap-modal-err").textContent = e && e.name === "NotAllowedError"
      ? "Camera permission denied - the sale can still be saved without a capture."
      : "No camera available on this device (" + ((e && e.message) || e) + ").";
    $("#cap-modal-err").hidden = false;
  }
});

function capStop() {
  if (capStream) { capStream.getTracks().forEach((t) => t.stop()); capStream = null; }
  $("#cap-video").srcObject = null;
  $("#cap-modal").hidden = true;
}
$("#cap-close").addEventListener("click", capStop);
$("#cap-modal").addEventListener("click", (e) => { if (e.target === $("#cap-modal")) capStop(); });

$("#cap-shot").addEventListener("click", () => {
  const v = $("#cap-video");
  if (!v.videoWidth) {
    $("#cap-modal-err").textContent = "The camera is not ready yet.";
    $("#cap-modal-err").hidden = false;
    return;
  }
  const w = 480, h = Math.max(1, Math.round(v.videoHeight / v.videoWidth * 480));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(v, 0, 0, w, h);
  const url = c.toDataURL("image/jpeg", 0.55);
  capState.photo = url;
  const img = $("#cap-photo");
  img.src = url;
  img.hidden = false;
  $("#cap-status").textContent = "Captured - the photo rides along with this sale. Re-capture any time before saving.";
  capStop();
  tryOcr(c);
});

["#cap-bp", "#cap-sp"].forEach((s) => $(s).addEventListener("input", () => {
  if (s === "#cap-bp") capState.bpDirty = true; else capState.spDirty = true;
  if (Number($(s).value) > 0) $("#cap-update-row").hidden = false;
  updatePreview();
}));

// ---- automated product recognition: one photo, many products --------------
// (25 Nov 2026) The pipeline per the system demand:
//   1. whole-photo barcode sweep  - BarcodeDetector when the browser has it,
//     ZXing (CDN) as the fallback, so every readable barcode is decoded;
//   2. region proposal            - gradient segmentation separates individual
//     products; every decoded barcode anchors its own product region;
//   3. per-region processing      - crop, barcode retry, assistive OCR
//     (Tesseract, the same loader the sale capture uses) and a visual
//     signature (8x8 aHash + 4x4 colour grid);
//   4. business comparison        - barcode first, then name tokens from the
//     OCR text, then the business's own product photos (sale captures) by
//     signature distance - exact / similar / new / uncertain per the spec;
//   5. external search            - Open Food Facts v2 by barcode (cached in
//     localStorage), name search best-effort; failures degrade to
//     business-only and the system never invents product information;
//   6. bulk results               - Registered / New / Review with confidence
//     and source, products already in this operation flagged, the user
//     confirms, corrects or excludes, then transfers into the normal save.
// External prices are reference only - business prices are never overwritten
// automatically, and the manual selection flow above stays exactly as it was.
const scan = {
  stream: null, devices: [], deviceIdx: 0, canvas: null,
  rows: [], processed: 0, regionCount: 0, bcCount: 0, imgCount: 0,
  bizCount: 0, extCount: 0, extTried: 0, extUnavailable: false
};
const LS_SCAN_OFF = "jamali_scan_off";
const LS_SCAN_SIG = "jamali_scan_photosigs";
const loadLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const saveLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

function scanStage(which) {
  ["live", "review", "progress", "results"].forEach((s) =>
    $("#scan-stage-" + s).hidden = s !== which);
}

async function openScan() {
  $("#scan-err").hidden = true;
  scanStage("live");
  $("#scan-modal").hidden = false;
  $("#scan-title").textContent = state.cause + " \u00B7 scan products";
  try {
    scan.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1600 } }, audio: false
    });
    $("#scan-video").srcObject = scan.stream;
    scan.devices = (await navigator.mediaDevices.enumerateDevices())
      .filter((d) => d.kind === "videoinput");
    scan.deviceIdx = Math.max(0, scan.devices.findIndex((d) => d.label && /back|rear|environment/i.test(d.label)));
    $("#scan-flip").hidden = scan.devices.length < 2;
    $("#scan-torch").hidden = !((scan.stream.getVideoTracks()[0] || {}).getCapabilities
      && ((scan.stream.getVideoTracks()[0].getCapabilities() || {}).torch));
  } catch (e) {
    $("#scan-err").textContent = e && e.name === "NotAllowedError"
      ? "Camera permission denied \u2014 upload a photo instead, or pick the products manually below."
      : "No camera available on this device (" + ((e && e.message) || e) + ") \u2014 upload a photo instead.";
    $("#scan-err").hidden = false;
  }
}

function scanStop() {
  if (scan.stream) { scan.stream.getTracks().forEach((t) => t.stop()); scan.stream = null; }
  $("#scan-video").srcObject = null;
  $("#scan-modal").hidden = true;
}
$("#scan-btn").addEventListener("click", openScan);
$("#scan-close").addEventListener("click", scanStop);
$("#scan-modal").addEventListener("click", (e) => { if (e.target === $("#scan-modal")) scanStop(); });
$("#scan-retake").addEventListener("click", () => { scan.canvas = null; scanStage("live"); });
$("#scan-again").addEventListener("click", () => { scan.canvas = null; scanStage("live"); });

$("#scan-flip").addEventListener("click", async () => {
  if (scan.devices.length < 2) return;
  scan.deviceIdx = (scan.deviceIdx + 1) % scan.devices.length;
  try {
    if (scan.stream) scan.stream.getTracks().forEach((t) => t.stop());
    scan.stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: scan.devices[scan.deviceIdx].deviceId } }, audio: false
    });
    $("#scan-video").srcObject = scan.stream;
  } catch (e) { /* keep the old stream's picture if the flip fails */ }
});

$("#scan-torch").addEventListener("click", async () => {
  const track = (scan.stream || {}).getVideoTracks ? scan.stream.getVideoTracks()[0] : null;
  if (!track) return;
  try {
    const caps = track.getCapabilities ? (track.getCapabilities() || {}) : {};
    await track.applyConstraints({ advanced: [{ torch: !caps.torch }] });
  } catch (e) { $("#scan-err").textContent = "This camera light cannot be switched."; $("#scan-err").hidden = false; }
});

$("#scan-shot").addEventListener("click", () => {
  const v = $("#scan-video");
  if (!v.videoWidth) { $("#scan-err").textContent = "The camera is not ready yet."; $("#scan-err").hidden = false; return; }
  const W = 1280, H = Math.max(1, Math.round(v.videoHeight / v.videoWidth * W));
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  c.getContext("2d").drawImage(v, 0, 0, W, H);
  scan.canvas = c;
  const view = $("#scan-canvas");
  view.width = W; view.height = H;
  view.getContext("2d").drawImage(c, 0, 0);
  scanStage("review");
});

$("#scan-file").addEventListener("change", () => {
  const f = $("#scan-file").files && $("#scan-file").files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    const W = 1280, H = Math.max(1, Math.round(img.height / img.width * W));
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    c.getContext("2d").drawImage(img, 0, 0, W, H);
    scan.canvas = c;
    const view = $("#scan-canvas");
    view.width = W; view.height = H;
    view.getContext("2d").drawImage(c, 0, 0);
    scanStage("review");
    URL.revokeObjectURL(img.src);
  };
  img.onerror = () => { $("#scan-err").textContent = "That file is not a readable picture."; $("#scan-err").hidden = false; scanStage("live"); };
  img.src = URL.createObjectURL(f);
  $("#scan-file").value = "";
});

// ---- barcode engines --------------------------------------------------------
let bdDetect = null;
async function barcodeDetectorOf() {
  if (bdDetect !== null) return bdDetect;
  try {
    if ("BarcodeDetector" in window) {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      const want = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "codabar", "qr_code"]
        .filter((f) => !formats.length || formats.includes(f));
      bdDetect = want.length ? new window.BarcodeDetector({ formats: want }) : false;
    } else bdDetect = false;
  } catch (e) { bdDetect = false; }
  return bdDetect;
}

let zxingLoading = null;
function loadZXing() {
  if (window.ZXing) return Promise.resolve(true);
  if (zxingLoading) return zxingLoading;
  zxingLoading = new Promise((res) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
    s.onload = () => res(true);
    s.onerror = () => res(false);
    document.head.appendChild(s);
    setTimeout(() => res(false), 12000);
  });
  return zxingLoading;
}
let zxingReader = null;
async function decodeBarcodes(canvas) {
  const out = [];
  const bd = await barcodeDetectorOf();
  if (bd) {
    try {
      const found = await bd.detect(canvas);
      (found || []).forEach((r) => out.push({
        text: String(r.rawValue || ""), box: r.boundingBox ? {
          x: r.boundingBox.x, y: r.boundingBox.y,
          w: r.boundingBox.width, h: r.boundingBox.height
        } : null
      }));
    } catch (e) { /* fall through to ZXing */ }
  }
  if (out.length) return out;
  if (!bd && await loadZXing()) {
    try {
      if (!zxingReader) zxingReader = new window.ZXing.BrowserMultiFormatReader();
      const res = await zxingReader.decodeFromCanvas(canvas);
      if (res && res.getText) out.push({ text: String(res.getText()), box: null });
    } catch (e) { /* no symbol in this image */ }
  }
  return out.filter((r) => /^[0-9A-Za-z\-\_]+$/.test(r.text));
}

// ---- region proposal: gradient segmentation ---------------------------------
function iouOf(a, b) {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a.w * a.h + b.w * a.h - inter);
}
function expandBox(b, W, H, f) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  let w = Math.min(W, Math.max(40, b.w * f)), h = Math.min(H, Math.max(40, b.h * f));
  let x = Math.max(0, Math.min(W - w, cx - w / 2)), y = Math.max(0, Math.min(H - h, cy - h / 2));
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}
function proposeRegions(canvas) {
  const W = canvas.width, H = canvas.height;
  const S = 320, sc = S / W, w2 = S, h2 = Math.max(1, Math.round(H * sc));
  const c = document.createElement("canvas");
  c.width = w2; c.height = h2;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, w2, h2);
  const px = ctx.getImageData(0, 0, w2, h2).data;
  const n = w2 * h2;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    gray[i] = 0.299 * px[j] + 0.587 * px[j + 1] + 0.114 * px[j + 2];
  }
  const mag = new Float32Array(n);
  for (let y = 1; y < h2 - 1; y++) for (let x = 1; x < w2 - 1; x++) {
    const i = y * w2 + x;
    const gx = gray[i - w2 - 1] + 2 * gray[i - 1] + gray[i + w2 - 1] - gray[i - w2 + 1] - 2 * gray[i + 1] - gray[i + w2 + 1];
    const gy = gray[i - w2 - 1] + 2 * gray[i - w2] + gray[i - w2 + 1] - gray[i + w2 - 1] - 2 * gray[i + w2] - gray[i + w2 + 1];
    mag[i] = Math.abs(gx) + Math.abs(gy);
  }
  const bins = new Array(256).fill(0);
  for (let i = 0; i < n; i++) bins[Math.min(255, Math.round(mag[i]))]++;
  let sum = 0, sumB = 0, maxVar = 0, thr = 96, wB = 0;
  for (let t = 0; t < 256; t++) sum += t * bins[t];
  for (let t = 0; t < 256; t++) {
    wB += bins[t]; if (!wB) continue;
    const wF = n - wB; if (!wF) break;
    sumB += t * bins[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) { maxVar = v; thr = t; }
  }
  let mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = mag[i] > thr ? 1 : 0;
  for (let pass = 0; pass < 2; pass++) {
    const d = new Uint8Array(n);
    for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
      const i = y * w2 + x;
      d[i] = mask[i] || (x > 0 && mask[i - 1]) || (x < w2 - 1 && mask[i + 1]) ||
             (y > 0 && mask[i - w2]) || (y < h2 - 1 && mask[i + w2]) ? 1 : 0;
    }
    mask = d;
  }
  const seen = new Uint8Array(n);
  const boxes = [];
  const minA = Math.max(80, 0.008 * n), maxA = 0.92 * n;
  for (let i = 0; i < n; i++) {
    if (seen[i] || !mask[i]) continue;
    const q = [i]; seen[i] = 1;
    let x0 = w2, y0 = h2, x1 = 0, y1 = 0, area = 0;
    while (q.length) {
      const p = q.pop(); area++;
      const y = Math.floor(p / w2), x = p % w2;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w2 || ny >= h2) return;
        const ni = ny * w2 + nx;
        if (!seen[ni] && mask[ni]) { seen[ni] = 1; q.push(ni); }
      });
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    if (area < minA || area > maxA || bw < 16 || bh < 16) continue;
    const aspect = bw / bh;
    if (aspect > 6 || aspect < 0.16) continue;
    boxes.push({ x: Math.round(x0 / sc), y: Math.round(y0 / sc), w: Math.round(bw / sc), h: Math.round(bh / sc), area: bw * bh });
  }
  boxes.sort((a, b) => b.area - a.area);
  const kept = [];
  boxes.forEach((b) => {
    if (kept.some((k) => iouOf(k, b) > 0.3)) return;
    if (kept.length < 50) kept.push(b);
  });
  return kept;
}

// ---- visual signature --------------------------------------------------------
function signatureOf(canvas) {
  const c = document.createElement("canvas");
  c.width = 8; c.height = 8;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, 8, 8);
  const d = ctx.getImageData(0, 0, 8, 8).data;
  const grays = [];
  for (let i = 0; i < 64; i++) {
    const j = i * 4;
    grays.push(0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]);
  }
  const sorted = grays.slice().sort((a, b) => a - b);
  const med = (sorted[31] + sorted[32]) / 2;
  let hash = "";
  for (let b = 0; b < 8; b++) {
    let byte = 0;
    for (let k = 0; k < 8; k++) byte = (byte << 1) | (grays[b * 8 + k] > med ? 1 : 0);
    hash += ("0" + byte.toString(16)).slice(-2);
  }
  const g = document.createElement("canvas");
  g.width = 4; g.height = 4;
  const gctx = g.getContext("2d", { willReadFrequently: true });
  gctx.drawImage(canvas, 0, 0, 4, 4);
  const gd = gctx.getImageData(0, 0, 4, 4).data;
  const colors = [];
  for (let i = 0; i < 16; i++) {
    const j = i * 4;
    colors.push(d[j] === undefined ? 0 : Math.round((gd[j] + gd[j + 1] + gd[j + 2]) / 3));
  }
  return { hash, colors };
}
function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}
function sigDist(a, b) {
  if (!a || !b || !a.colors || !b.colors) return 1;
  const h = hamming(a.hash, b.hash) / 64;
  let e = 0;
  for (let i = 0; i < a.colors.length; i++) e += (a.colors[i] - b.colors[i]) * (a.colors[i] - b.colors[i]);
  return h * 0.55 + Math.min(1, Math.sqrt(e / a.colors.length) / 128) * 0.45;
}

// ---- business photo signatures (sale captures are the business's photos) -----
const photoSigs = loadLS(LS_SCAN_SIG, {});
async function businessPhotoSigs() {
  const fresh = [];
  const ids = new Set(STOCKS.map((r) => r.id));
  Object.keys(photoSigs).forEach((id) => {
    if (!ids.has(id) || Date.now() - (photoSigs[id].at || 0) > 86400000) delete photoSigs[id];
    else fresh.push(id);
  });
  const need = ids.size - fresh.length;
  if (need > 0) {
    const collect = (snap) => {
      const photos = {};
      snap.forEach((d) => {
        const v = d.data({ serverTimestamps: "estimate" }) || {};
        const sid = v.stockId;
        if (sid && v.capture && v.capture.photo && !photos[sid]) photos[sid] = v.capture.photo;
      });
      return photos;
    };
    try {
      // the ordered query is the normal path on Firestore; a plain
      // collection read sorted client-side keeps photo matching alive
      // on the local data engine, which may not serve orderBy here.
      let photos = {};
      try {
        const snap = await getDocs(query(collection(db, "stockChanges"), orderBy("createdAt", "desc"), limit(150)));
        photos = collect(snap);
      } catch (e) {
        const snap = await getDocs(collection(db, "stockChanges"));
        photos = collect(snap);
      }
      for (const sid of Object.keys(photos)) {
        if (photoSigs[sid] && Date.now() - photoSigs[sid].at < 86400000) continue;
        try {
          const img = new Image();
          img.src = photos[sid];
          await img.decode();
          const c = document.createElement("canvas");
          const s = Math.min(1, 200 / Math.max(img.width, img.height));
          c.width = Math.max(8, Math.round(img.width * s));
          c.height = Math.max(8, Math.round(img.height * s));
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          photoSigs[sid] = { sig: signatureOf(c), at: Date.now() };
        } catch (e) { /* skip unreadable capture */ }
      }
      saveLS(LS_SCAN_SIG, photoSigs);
    } catch (e) { /* offline or no captures yet - matching by photo is skipped */ }
  }
  return photoSigs;
}

// ---- external product lookup (Open Food Facts, cached, best effort) ----------
const offCache = loadLS(LS_SCAN_OFF, {});
async function fetchJson(url, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 8000);
  try { return await fetch(url, { signal: ctl.signal }); }
  finally { clearTimeout(t); }
}
async function offByBarcode(code) {
  const hit = offCache[code];
  if (hit && Date.now() - hit.at < 604800000) { scan.extTried++; return hit.data; }
  scan.extTried++;
  try {
    const res = await fetchJson("https://world.openfoodfacts.org/api/v2/product/" +
      encodeURIComponent(code) + ".json?fields=product_name,brands,quantity,image_url,categories");
    const j = await res.json();
    const data = (j && j.status === 1 && j.product) ? {
      name: String(j.product.product_name || "").trim(),
      brand: String(j.product.brands || "").trim(),
      qty: String(j.product.quantity || "").trim(),
      img: String(j.product.image_url || "").trim(),
      cats: String(j.product.categories || "").trim()
    } : null;
    offCache[code] = { data, at: Date.now() };
    saveLS(LS_SCAN_OFF, offCache);
    return data;
  } catch (e) { return undefined; } // undefined = external search unavailable
}
async function offByName(text) {
  try {
    const res = await fetchJson("https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
      encodeURIComponent(text.slice(0, 60)) + "&simple=1&page_size=5&json=1");
    const j = await res.json();
    return (j && j.products || []).slice(0, 5).map((p) => ({
      name: String(p.product_name || "").trim(),
      brand: String(p.brands || "").trim(),
      qty: String(p.quantity || "").trim(),
      img: String(p.image_url || "").trim(),
      cats: String(p.categories || "").trim()
    })).filter((p) => p.name);
  } catch (e) { return null; }
}

// ---- OCR (Tesseract, the same loader the sale capture uses) ------------------
let tessLoading = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(true);
  if (tessLoading) return tessLoading;
  tessLoading = new Promise((res) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    s.onload = () => res(true);
    s.onerror = () => res(false);
    document.head.appendChild(s);
    setTimeout(() => res(false), 15000);
  });
  return tessLoading;
}
async function ocrRegion(canvas) {
  if (!await loadTesseract()) return "";
  try {
    const res = await window.Tesseract.recognize(canvas, "eng");
    return String((res && res.data && res.data.text) || "").replace(/\s+/g, " ").trim();
  } catch (e) { return ""; }
}
const STOP_WORDS = new Set(["kg", "g", "ml", "l", "pcs", "pack", "packet", "box", "carton", "bottle", "the", "and", "of", "a"]);
function tokensOf(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));
}
function nameScore(ocrText, name) {
  const a = new Set(tokensOf(ocrText)), b = tokensOf(name);
  if (!b.length) return 0;
  let hit = 0;
  b.forEach((t) => { if (a.has(t)) hit++; });
  let s = hit / b.length;
  if (s > 0 && String(ocrText || "").toLowerCase().includes(String(name || "").toLowerCase().split(" ")[0])) s += 0.18;
  return Math.min(1, s);
}

// ---- the pipeline -------------------------------------------------------------
function cropOf(canvas, box) {
  const maxSide = 320, s = Math.min(1, maxSide / Math.max(box.w, box.h));
  const c = document.createElement("canvas");
  c.width = Math.max(8, Math.round(box.w * s));
  c.height = Math.max(8, Math.round(box.h * s));
  c.getContext("2d").drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
  return c;
}
function thumbOf(canvas, box) {
  const c = cropOf(canvas, box);
  return c.toDataURL("image/jpeg", 0.55);
}

$("#scan-process").addEventListener("click", async () => {
  const canvas = scan.canvas;
  if (!canvas) return;
  scan.rows = []; scan.processed = 0; scan.bcCount = 0; scan.imgCount = 0;
  scan.bizCount = 0; scan.extCount = 0; scan.extTried = 0; scan.extUnavailable = false;
  scanStage("progress");
  const log = (m) => { $("#scan-progress-log").textContent = m; };
  const bar = (p) => { $("#scan-bar-fill").style.width = Math.round(p * 100) + "%"; };
  log("Analyzing the photograph\u2026");
  bar(0.04);
  await new Promise((r) => setTimeout(r, 30));

  const whole = await decodeBarcodes(canvas);
  log("Products detected: analyzing regions\u2026");
  const regions = proposeRegions(canvas);
  const used = new Array(regions.length).fill(false);
  const items = [];
  whole.forEach((r) => {
    if (!r.text) return;
    let best = -1, bestIou = 0.12;
    regions.forEach((b, i) => {
      if (used[i] || !r.box) return;
      const v = iouOf(r.box, b);
      if (v > bestIou) { bestIou = v; best = i; }
    });
    const box = best >= 0 ? (used[best] = true, expandBox(regions[best], canvas.width, canvas.height, 2.2))
      : r.box ? expandBox(r.box, canvas.width, canvas.height, 3.2) : null;
    if (box) items.push({ box, barcode: r.text });
  });
  regions.forEach((b, i) => {
    if (!used[i]) items.push({ box: expandBox(b, canvas.width, canvas.height, 1.25), barcode: "" });
  });
  scan.regionCount = items.length;
  if (!items.length) {
    $("#scan-progress-log").textContent = "No products could be separated from this photo \u2014 move closer, spread the products out, and retake.";
    bar(1);
    setTimeout(() => scanStage("review"), 1800);
    return;
  }
  log("Products detected: " + items.length + "\nBarcode identification: running\u2026");

  const photoSigsLive = await businessPhotoSigs();
  bar(0.1);

  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    const crop = cropOf(canvas, it.box);
    const thumb = thumbOf(canvas, it.box);
    let barcode = it.barcode;
    if (!barcode) {
      const more = await decodeBarcodes(crop);
      barcode = more.length ? more[0].text : "";
    }
    if (barcode) scan.bcCount++;
    let ocrText = "";
    const wantOcr = !barcode || !STOCKS.some((r) => String(r.barcode || "") === barcode);
    if (wantOcr && idx < 40) ocrText = await ocrRegion(crop);
    const sig = signatureOf(crop);

    // business comparison: barcode -> name tokens -> photo signature
    let match = null, matchKind = "none", confidence = 0, source = "";
    if (barcode) {
      const hit = STOCKS.find((r) => String(r.barcode || "") === barcode);
      if (hit) { match = hit; matchKind = "exact"; confidence = 1; source = "Business database \u00B7 barcode"; scan.bizCount++; }
    }
    if (!match && ocrText) {
      let best = null, bestS = 0;
      STOCKS.forEach((r) => { const s = nameScore(ocrText, r.name); if (s > bestS) { bestS = s; best = r; } });
      if (best && bestS >= 0.72) { match = best; matchKind = "exact"; confidence = bestS; source = "Business database \u00B7 name text"; scan.bizCount++; }
      else if (best && bestS >= 0.42) { match = best; matchKind = "similar"; confidence = bestS; source = "Business database \u00B7 similar name"; scan.bizCount++; }
    }
    if (!match && Object.keys(photoSigsLive).length) {
      let bestId = null, bestD = 1;
      Object.keys(photoSigsLive).forEach((sid) => {
        const d = sigDist(sig, photoSigsLive[sid].sig);
        if (d < bestD) { bestD = d; bestId = sid; }
      });
      if (bestId && bestD <= 0.34) {
        const hit = STOCKS.find((r) => r.id === bestId);
        if (hit) { match = hit; matchKind = "similar"; confidence = 1 - bestD; source = "Business database \u00B7 photo match"; scan.imgCount++; scan.bizCount++; }
      }
    }

    // external search: only when the business has no confident record
    let ext = null, extState = "";
    if (!match || matchKind === "similar") {
      if (barcode) {
        const d = await offByBarcode(barcode);
        if (d === undefined) extState = "unavailable";
        else if (d) { ext = d; scan.extCount++; }
      } else if (ocrText && tokensOf(ocrText).length >= 2 && scan.extCount < 10) {
        const list = await offByName(ocrText);
        if (list === null) extState = "unavailable";
        else if (list.length) { ext = list[0]; scan.extCount++; }
      }
    }
    if (extState === "unavailable") scan.extUnavailable = true;

    let status;
    if (matchKind === "exact") status = "registered";
    else if (ext && ext.name) status = "new";
    else if (matchKind === "similar") status = "review";
    else if (extState === "unavailable" && (barcode || ocrText)) status = "new";
    else status = "review";
    if (status === "new" && !barcode && !ocrText) status = "review";

    const displayName = (match && match.name) || (ext && ext.name) ||
      (ocrText ? ocrText.split(" ").slice(0, 5).join(" ") : "") || "Unidentified product " + (idx + 1);
    scan.rows.push({
      thumb, barcode, ocrText, sig, status, match, matchKind, confidence, source, ext, extState,
      name: displayName,
      stockId: match ? match.id : null,
      units: 1, packages: 0,
      present: 0,
      upp: match ? Number(match.unitsPerPackage || 0) : 0,
      bp: match ? Number(match.buyPrice || 0) : 0,
      sp: match ? Number(match.unitPrice || 0) : 0,
      dupOfBatch: false
    });
    scan.processed = idx + 1;
    bar(0.1 + 0.85 * (idx + 1) / items.length);
    const done = scan.rows.filter((r) => r.status !== "review").length;
    const review = scan.rows.filter((r) => r.status === "review").length;
    log("Products detected: " + items.length +
      "\nBarcode identification: " + scan.bcCount + "/" + items.length +
      "\nImage matching: " + scan.imgCount + "/" + items.length +
      "\nBusiness database comparison: " + scan.bizCount + "/" + items.length +
      "\nExternal search: " + (extState === "unavailable" ? "unavailable - business records only" :
        scan.extTried ? scan.extCount + " lookup(s) done" : "not needed yet") +
      "\nCompleted: " + done + " \u00B7 Needs review: " + review);
  }
  renderScanResults();
  scanStage("results");
});

function renderScanResults() {
  const done = scan.rows.filter((r) => r.status !== "review").length;
  const review = scan.rows.filter((r) => r.status === "review").length;
  $("#scan-summary").textContent =
    "Detected " + scan.regionCount + " product region(s) from this photo \u2014 " +
    "Registered: " + scan.rows.filter((r) => r.status === "registered").length +
    " \u00B7 New: " + scan.rows.filter((r) => r.status === "new").length +
    " \u00B7 Needs review: " + review + " \u00B7 Completed: " + done + "/" + scan.rows.length +
    (scan.extUnavailable ? " \u00B7 external search unavailable for some products" : "");
  const box = $("#scan-results");
  box.innerHTML = scan.rows.map((r, i) => {
    const opts = ['<option value="">\u2014 choose the registered product \u2014</option>']
      .concat(STOCKS.map((s) => '<option value="' + esc(s.id) + '"' +
        (r.stockId === s.id ? " selected" : "") + ">" + esc(s.name) + " (" + Number(s.units || 0).toLocaleString("en-US") + " units)</option>"))
      .concat(['<option value="__new__"' + (r.status === "new" && !r.stockId ? " selected" : "") + ">Register as a new product</option>"]);
    const dup = r.dupOfBatch ? '<span class="scan-chip st-new">already in this operation</span>' : "";
    const extBox = r.ext ? '<div class="scan-ext"><p class="scan-ext-line"><b>External reference (Open Food Facts):</b> ' +
      esc([r.ext.name, r.ext.brand, r.ext.qty].filter(Boolean).join(" \u00B7 ")) +
      (r.ext.img ? ' \u00B7 <a href="' + esc(r.ext.img) + '" target="_blank" rel="noopener">image</a>' : "") +
      "<br>External prices are reference only \u2014 business prices are never overwritten automatically.</p></div>" : "";
    const extNote = !r.ext && r.extState === "unavailable" ?
      '<div class="scan-ext"><p class="scan-ext-line">External search is unreachable (offline?) \u2014 identified against business records only.</p></div>' : "";
    const isNew = r.stockId === "__new__" || (!r.stockId && r.status === "new");
    return '<div class="scan-row is-' + esc(r.status) + '" data-i="' + i + '">' +
      '<img class="scan-thumb" src="' + r.thumb + '" alt="product">' +
      '<div class="scan-mid">' +
        '<input class="scan-name-edit" data-f="name" value="' + esc(r.name) + '" style="width:100%;background:#0b1220;color:#e2e8f0;border:1px solid #334155;border-radius:9px;padding:8px 10px;font-size:13.5px;font-weight:800">' +
        '<p class="scan-meta">' + (r.barcode ? "Barcode " + esc(r.barcode) + " \u00B7 " : "No barcode read \u00B7 ") +
          (r.ocrText ? "label text: \u201C" + esc(r.ocrText.slice(0, 60)) + "\u201D \u00B7 " : "") +
          "confidence " + Math.round((r.confidence || 0) * 100) + "%</p>" +
        '<div>' + dup + '<span class="scan-chip st-' + esc(r.status) + '">' +
          (r.status === "registered" ? "Registered" : r.status === "new" ? "New product" : r.status === "review" ? "Needs review" : "Excluded") +
          '</span><span class="scan-chip st-src">' + esc(r.source || "photo region") + '</span></div>' +
        extBox + extNote +
      '</div>' +
      '<div class="scan-side">' +
        '<span class="scan-mini-label">Business match</span>' +
        '<select data-f="match">' + opts.join("") + '</select>' +
        '<span class="scan-mini-label">Quantity (units)</span>' +
        '<input data-f="units" type="number" inputmode="numeric" min="0" step="any" value="' + esc(r.units) + '">' +
        (isNew ?
          '<span class="scan-mini-label">New product \u00B7 BP / package \u00B7 SP / unit \u00B7 units / package</span>' +
          '<div class="qty-mini">' +
            '<input data-f="bp" type="number" min="0" step="any" placeholder="BP" value="' + esc(r.bp || "") + '">' +
            '<input data-f="sp" type="number" min="0" step="any" placeholder="SP" value="' + esc(r.sp || "") + '">' +
          '</div>' +
          '<input data-f="upp" type="number" min="1" step="any" placeholder="units per package" value="' + esc(r.upp || "") + '">' +
          (state.dir === "OUT" ?
            '<span class="scan-mini-label">Units present before this ' + esc(state.cause) + '</span>' +
            '<input data-f="present" type="number" min="0" step="any" value="' + esc(Math.max(Number(r.present) || 0, Number(r.units) || 0)) + '">' : "") : "") +
        '<div class="scan-row-actions">' +
          '<button class="scan-mini-btn" data-act="toggle">' + (r.status === "excluded" ? "Include" : "Exclude") + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join("");

  box.querySelectorAll(".scan-row").forEach((row) => {
    const i = Number(row.dataset.i);
    const r = scan.rows[i];
    row.querySelector('[data-f="match"]').addEventListener("change", (e) => {
      const v = e.target.value;
      if (v === "__new__") { r.stockId = null; r.status = "new"; }
      else if (v) {
        r.stockId = v;
        const s = STOCKS.find((x) => x.id === v);
        if (s) { r.name = s.name; r.match = s; r.matchKind = "exact"; r.confidence = 1; r.source = "Business database \u00B7 confirmed by you"; r.upp = Number(s.unitsPerPackage || 0); r.bp = Number(s.buyPrice || 0); r.sp = Number(s.unitPrice || 0); }
        r.status = "registered";
      } else { r.stockId = null; r.match = null; r.matchKind = "none"; r.status = r.barcode || r.ocrText ? "new" : "review"; }
      renderScanResults();
    });
    row.querySelector('[data-f="name"]').addEventListener("input", (e) => { r.name = e.target.value; });
    row.querySelector('[data-f="units"]').addEventListener("input", (e) => { r.units = Math.max(0, Number(e.target.value) || 0); });
    const bp = row.querySelector('[data-f="bp"]'); if (bp) bp.addEventListener("input", (e) => { r.bp = Number(e.target.value) || 0; });
    const sp = row.querySelector('[data-f="sp"]'); if (sp) sp.addEventListener("input", (e) => { r.sp = Number(e.target.value) || 0; });
    const upp = row.querySelector('[data-f="upp"]'); if (upp) upp.addEventListener("input", (e) => { r.upp = Number(e.target.value) || 0; });
    const present = row.querySelector('[data-f="present"]'); if (present) present.addEventListener("input", (e) => { r.present = Math.max(0, Number(e.target.value) || 0); });
    row.querySelector('[data-act="toggle"]').addEventListener("click", () => {
      r.status = r.status === "excluded" ? (r.stockId ? "registered" : (r.ext || r.barcode ? "new" : "review")) : "excluded";
      renderScanResults();
    });
  });
}

$("#scan-confirm-all").addEventListener("click", () => {
  scan.rows.forEach((r) => { if (r.status === "registered") r.confirmed = true; });
  $("#scan-summary").textContent = $("#scan-summary").textContent.replace(/Confirmed.*$/, "") +
    " \u2014 all Registered products are confirmed. Review the rest or transfer now.";
  renderScanResults();
});

$("#scan-transfer").addEventListener("click", () => {
  const err = $("#scan-transfer-err");
  err.hidden = true;
  // every row must be resolved: registered / new, or explicitly excluded.
  const unresolved = scan.rows.filter((r) => r.status === "review");
  if (unresolved.length) {
    err.textContent = unresolved.length + " product(s) still need review \u2014 match them, register them as new, or exclude them first.";
    err.hidden = false;
    return;
  }
  const taking = scan.rows.filter((r) => r.status !== "excluded" && (r.stockId || r.name) && r.units > 0);
  if (!taking.length) {
    err.textContent = "Nothing to transfer yet \u2014 set a quantity above zero for at least one product.";
    err.hidden = false;
    return;
  }
  // \u00A711: flag products already in the running operation - their quantities add up.
  taking.forEach((r) => {
    r.dupOfBatch = (state.batch || []).some((b) =>
      (r.stockId && b.stockId === r.stockId) || (r.barcode && b.barcode === r.barcode));
  });
  state.batch = (state.batch || []).concat(taking.map((r) => Object.assign({}, r)));
  scanStop();
  openForm();
});


// ---- batch line list (scanned products) -------------------------------------
function renderBatch() {
  const list = $("#batch-list");
  const lines = state.batch || [];
  $("#batch-count").textContent = lines.length + " product(s) \u00B7 one transaction";
  list.innerHTML = lines.map((b, i) => {
    const stock = STOCKS.find((s) => s.id === b.stockId);
    const name = stock ? stock.name : (b.name || "product " + (i + 1));
    const units = Number(b.units || 0);
    const bp = stock ? Number(stock.buyPrice || 0) : Number(b.bp || 0);
    const sp = stock ? Number(stock.unitPrice || 0) : Number(b.sp || 0);
    const dupNote = b.dupOfBatch ? " \u00B7 also in this operation \u2014 quantities add together" : "";
    return '<div class="batch-line">' +
      (b.thumb ? '<img class="batch-thumb" src="' + b.thumb + '" alt="">' : '<span class="batch-thumb"></span>') +
      '<div><p class="batch-name">' + esc(name) + '</p>' +
      '<p class="batch-sub">' + (b.stockId ? "registered stock" : (state.dir === "OUT" ?
        "registers as a new product with " + Number(b.present || 0) + " unit(s) present" :
        "registers as a new product")) +
        " \u00B7 BP " + fmt(bp) + " / SP " + fmt(sp) + (b.barcode ? " \u00B7 barcode " + esc(b.barcode) : "") + dupNote + '</p></div>' +
      '<div class="batch-qty"><label>Units</label><input type="number" inputmode="numeric" min="0" step="any" value="' + esc(units) + '" data-qty="' + i + '"></div>' +
    '</div>';
  }).join("");
  list.querySelectorAll('[data-qty]').forEach((inp) =>
    inp.addEventListener("input", () => { lines[Number(inp.dataset.qty)].units = Math.max(0, Number(inp.value) || 0); }));
}

// ---- save: stock record + transaction record + movement log, one batch -----
// The scanned batch saves as ONE transaction: every line updates its stock
// record, one stockChanges document rides per line, all in one writeBatch.
async function saveBatch(err) {
  const lines = state.batch.filter((b) => b.status !== "excluded" && Number(b.units || 0) > 0);
  if (!lines.length) return err("Every product needs a quantity above zero, or exclude it.");
  if (state.money && !state.method) return err("Choose Cash, Credit or Bank.");
  let person = null;
  if (state.money) {
    person = state.method === "Credit" ? $("#in-person").value.trim()
           : state.method === "Bank" ? $("#in-bank").value.trim() : "";
    if (state.method === "Credit" && !person) return err("Enter the person's name.");
    if (state.method === "Bank" && !person) return err("Enter the bank name.");
  }
  for (const b of lines) {
    if (!b.stockId) {
      if (!String(b.name || "").trim()) return err("A new product still has no name \u2014 type it in the scan results.");
      if (!(Number(b.bp) > 0) || !(Number(b.sp) > 0)) return err("The new product '" + b.name + "' needs its BP and SP before it can be registered.");
      if (!(Number(b.upp) > 0)) return err("The new product '" + b.name + "' needs Units per Package.");
      if (state.dir === "OUT" && Number(b.present || 0) < Number(b.units || 0))
        return err("'" + b.name + "' is new \u2014 set its Units present (at least " + b.units + ") so the stock can start before it is taken out.");
    }
  }
  // fresh units per distinct registered stock; a new product starts at 0
  const cur = {};
  for (const b of lines) {
    if (!b.stockId || cur[b.stockId] !== undefined) continue;
    try {
      const fresh = await getDoc(doc(db, "stockItems", b.stockId));
      if (!fresh.exists()) return err("The stock item behind '" + b.name + "' no longer exists \u2014 it may have been deleted.");
      cur[b.stockId] = Number(fresh.data().units || 0);
    } catch (e) { cur[b.stockId] = null; }
  }
  const deltas = {};
  for (const b of lines) {
    if (!b.stockId) continue;
    deltas[b.stockId] = (deltas[b.stockId] || 0) + Number(b.units || 0);
  }
  for (const sid of Object.keys(deltas)) {
    const c = cur[sid];
    if (c === null || c === undefined) continue;
    if (state.dir === "OUT" && deltas[sid] > c)
      return err("Only " + c.toLocaleString("en-US") + " unit(s) of one scanned product are present, but the batch takes out " + deltas[sid] + ".");
  }

  const btn = $("#save-btn");
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    const txnType = txnTypeOf();
    let total = 0;
    const unitPriceOfLine = (b) => {
      const stock = STOCKS.find((s) => s.id === b.stockId);
      const bp = stock ? Number(stock.buyPrice || 0) : Number(b.bp || 0);
      const sp = stock ? Number(stock.unitPrice || 0) : Number(b.sp || 0);
      const upp = stock ? Number(stock.unitsPerPackage || 0) : (Number(b.upp || 0) || 1);
      return state.money === "IN" ? sp : bp / (upp || 1);
    };
    lines.forEach((b) => { total += Math.round(Number(b.units || 0) * unitPriceOfLine(b) * 100) / 100; });
    total = Math.round(total * 100) / 100;

    const batch = writeBatch(db);
    // new products register first (explicitly confirmed by the user - never automatic)
    for (const b of lines) {
      if (!b.stockId) {
        const ref = doc(collection(db, "stockItems"));
        batch.set(ref, {
          name: String(b.name).trim(),
          barcode: String(b.barcode || "").trim(),
          units: state.dir === "OUT" ? Number(b.present || 0) : 0,
          minUnits: 0,
          buyPrice: Number(b.bp || 0), unitPrice: Number(b.sp || 0),
          unitsPerPackage: Number(b.upp || 0), createdAt: serverTimestamp()
        });
        b.stockId = ref.id;
      }
    }
    batch.set(doc(collection(db, "transactions")), {
      transactionName: state.cause, dateTime: serverTimestamp(),
      flowMethod: state.money ? state.method : "N/A", transactionType: txnType,
      name: person, amount: total, scanned: lines.length
    });
    for (const b of lines) {
      const stock = STOCKS.find((s) => s.id === b.stockId);
      const delta = state.dir === "IN" ? Number(b.units || 0) : -Number(b.units || 0);
      batch.update(doc(db, "stockItems", b.stockId), { units: increment(delta) });
      const changeDoc = {
        stockId: b.stockId,
        stockName: stock ? stock.name : String(b.name || ""),
        cause: state.cause, direction: state.dir,
        units: Number(b.units || 0),
        amount: Math.round(Number(b.units || 0) * unitPriceOfLine(b) * 100) / 100,
        transactionType: txnType,
        flowMethod: state.money ? state.method : "N/A", name: person,
        createdAt: serverTimestamp(), origin: "scan"
      };
      if (state.cause === "Sales" || state.money === "IN") {
        const sp = stock ? Number(stock.unitPrice || 0) : Number(b.sp || 0);
        const bp = stock ? Number(stock.buyPrice || 0) : Number(b.bp || 0);
        const upp = stock ? Number(stock.unitsPerPackage || 0) : (Number(b.upp || 0) || 1);
        changeDoc.spAtSale = Math.round(sp * 10000) / 10000;
        changeDoc.bpAtSale = Math.round((bp / (upp || 1)) * 10000) / 10000;
        changeDoc.profit = Math.round(Number(b.units || 0) * (changeDoc.spAtSale - changeDoc.bpAtSale) * 100) / 100;
      }
      if (b.thumb) changeDoc.capture = { photo: b.thumb, at: new Date().toISOString(), ocrText: b.ocrText || "" };
      if (b.barcode) changeDoc.barcode = String(b.barcode);
      batch.set(doc(collection(db, "stockChanges")), changeDoc);
    }
    await batch.commit();

    const moved = lines.length;
    $("#done-note").textContent = state.cause + " saved for " + moved + " scanned product(s) \u2014 total " +
      fmt(total) + (state.money ? " (" + state.method + ")" : "") +
      ". Every line updated its stock record and logged its movement in one transaction.";
    state.batch = null;
    showStep(4);
  } catch (e) {
    err("Save failed: " + (e && e.code === "permission-denied"
      ? "check your Firestore rules and sign in again."
      : (e && e.message) || e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Stock Change";
  }
}

$("#save-btn").addEventListener("click", async () => {
  const err = (m) => { const e = $("#form-err"); e.textContent = m; e.hidden = false; };
  $("#form-err").hidden = true;

  const batchMode = Array.isArray(state.batch) && state.batch.length > 0;
  if (batchMode) return saveBatch(err);

  const r = state.stock;
  const units = Number($("#in-units").value) || 0;
  if (!units || units <= 0) return err("Enter the number of units first.");

  let cur = Number(r.units || 0);
  try {
    const fresh = await getDoc(doc(db, "stockItems", r.id));
    if (!fresh.exists()) return err("That stock item no longer exists \u2014 it may have been deleted.");
    cur = Number(fresh.data().units || 0);
  } catch (e) { /* keep the snapshot figure if the read fails */ }

  if (state.dir === "OUT" && units > cur)
    return err("Only " + cur.toLocaleString("en-US") + " unit(s) of " + r.name +
               " present \u2014 you cannot take out " + units + ".");

  let flowMethod = "N/A", name = null;
  const txnType = txnTypeOf();
  if (state.money) {
    if (!state.method) return err("Choose Cash, Credit or Bank.");
    flowMethod = state.method;
    if (state.method === "Credit") {
      name = $("#in-person").value.trim();
      if (!name) return err("Enter the person's name.");
    } else if (state.method === "Bank") {
      name = $("#in-bank").value.trim();
      if (!name) return err("Enter the bank name.");
    }
  }

  const amount = Math.round(units * unitPriceOf() * 100) / 100;
  const delta = state.dir === "IN" ? units : -units;
  const after = cur + delta;

  // capture payload for a sale: BP / SP ride with the record (and the
  // profit is frozen at save time), photo included when one was taken.
  const isSale = state.cause === "Sales";
  const capBp = Number($("#cap-bp").value);
  const capSp = Number($("#cap-sp").value);
  let stockPatch = { units: increment(delta) };
  if (isSale && $("#cap-update").checked) {
    if (capBp > 0) stockPatch.buyPrice = capBp;
    if (capSp > 0) stockPatch.unitPrice = capSp;
  }

  const btn = $("#save-btn");
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "stockItems", r.id), stockPatch);
    batch.set(doc(collection(db, "transactions")), {
      transactionName: state.cause, dateTime: serverTimestamp(),
      flowMethod, transactionType: txnType, name, amount
    });
    const changeDoc = {
      stockId: r.id, stockName: r.name, cause: state.cause, direction: state.dir,
      units, amount, transactionType: txnType, flowMethod, name, createdAt: serverTimestamp()
    };
    if (isSale) {
      const sp = capSp > 0 ? capSp : unitPriceOf();
      const bpUnit = captureUnitBpOf();
      changeDoc.spAtSale = Math.round(sp * 10000) / 10000;
      changeDoc.bpAtSale = Math.round(bpUnit * 10000) / 10000;
      changeDoc.profit = Math.round(units * (changeDoc.spAtSale - changeDoc.bpAtSale) * 100) / 100;
      if (capState.photo) {
        changeDoc.capture = {
          photo: capState.photo, at: new Date().toISOString(),
          bp: capBp > 0 ? capBp : null, sp: capSp > 0 ? capSp : null,
          ocrText: capState.ocrText || ""
        };
      }
    }
    batch.set(doc(collection(db, "stockChanges")), changeDoc);
    await batch.commit();
    let note = r.name + " moved from " + cur.toLocaleString("en-US") +
      " to " + after.toLocaleString("en-US") + " units \u2014 the transaction was saved to the business transactions and the movement was logged.";
    if (isSale) note += " Sold for " + fmt(amount) + (changeDoc.profit != null ? " (profit " + fmt(changeDoc.profit) + ")" : "") +
      (capState.photo ? " \u00B7 the captured photo and its BP / SP are stored on the record." : "");
    $("#done-note").textContent = note;
    showStep(4);
  } catch (e) {
    err("Save failed: " + (e && e.code === "permission-denied"
      ? "check your Firestore rules and sign in again."
      : (e && e.message) || e));
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Stock Change";
  }
});

// ---- back navigation -------------------------------------------------------
$("#back-2").addEventListener("click", () => { state.cause = state.dir = state.money = null; showStep(1); });
$("#back-3").addEventListener("click", () => openStocks());
$("#again-btn").addEventListener("click", () => {
  state.cause = state.dir = state.money = state.method = state.stock = null;
  state.batch = null;
  showStep(1);
});

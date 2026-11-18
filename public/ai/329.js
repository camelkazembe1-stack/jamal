/* JAMALI AI v4.1 — a standalone, powerful AI, exactly like ChatGPT.
 *
 * This build answers NOTHING from the system: no record searches, no rule
 * engine, no combined answers, no books, no stock, no health wing. One job
 * — chat — streamed word by word, with the whole conversation as context —
 * ask anything, in Swahili, English or a mix, and the answer comes back
 * the way ChatGPT answers: complete, structured, honest.
 *
 * What this file is:
 *   - the ChatGPT screen: the conversation rail on the left (every past
 *     conversation kept in the aiChats collection, grouped Today /
 *     Yesterday / Earlier, with New chat and a delete button each),
 *     the streamed markdown answers with the blinking caret, the Stop
 *     button, and the pill composer with the up-arrow send;
 *   - the brains: OpenAI GPT by default - it runs behind the system's own
 *     server door (/api/ai), and its key lives in the server's environment,
 *     never in the browser or the repository, so the AI answers the moment
 *     the page opens, with no setup at all, for every user, in every
 *     country. Z.ai GLM rides as the free backup brain: its key ships in
 *     api/zai.js on the site itself and the page calls its own /api/zai,
 *     so nothing is asked of anyone. A Gemini key of one's own still works
 *     too: Settings switches the brain, and the key stays on the device
 *     only (localStorage, the same JAMALI_AI_GEMINI store the previous
 *     version used, so an existing key keeps working with no re-setup);
 *   - conversations persist in Firestore aiChats per signed-in user —
 *     and if the rules are not published yet, the chat itself still
 *     works, the rail only shows an honest note;
 *   - the ?m=<n> family links (the sidebar and the Home Screen AI tile)
 *     all land on this one chat — nothing else, nothing system-related.
 */

import {
  requireAuth, auth, db, collection, doc, addDoc, getDocs, getDoc,
  query, where, limit, serverTimestamp, updateDoc, deleteDoc
} from "/502.js";

const AI_VERSION = "4.2";

/* ---------- small shared helpers ---------- */

function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* the one app state */
const S = { els: {}, user: null, status: "ready", streaming: false,
  streamCtl: null, chats: [], chatId: null, lastRequest: null, procEl: null };

/* ---------- markdown -> html (headings, lists, tables, code, links) ---------- */

function mdEscape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function mdInline(s) {
  let out = mdEscape(s);
  out = out.replace(/`([^`]+)`/g, function (_, c) { return "<code>" + c + "</code>"; });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  out = out.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  return out;
}

function mdToHtml(src) {
  const rows = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0, para = [], listType = null, listItems = [];
  const flushPara = function () {
    if (para.length) { out.push("<p>" + para.map(mdInline).join("<br>") + "</p>"); para = []; }
  };
  const flushList = function () {
    if (listType && listItems.length) { out.push("<" + listType + ">" + listItems.join("") + "</" + listType + ">"); }
    listType = null; listItems = [];
  };
  while (i < rows.length) {
    const line = rows[i];
    if (/^\s*```/.test(line)) {
      flushPara(); flushList();
      const buf = []; i++;
      while (i < rows.length && !/^\s*```/.test(rows[i])) { buf.push(rows[i]); i++; }
      i++;
      out.push("<pre><code>" + mdEscape(buf.join("\n")) + "</code></pre>");
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < rows.length && /^\s*\|[\s:|-]+\|\s*$/.test(rows[i + 1])) {
      flushPara(); flushList();
      const head = line.split("|").slice(1, -1).map(function (c) { return c.trim(); });
      const trows = [];
      i += 2;
      while (i < rows.length && /^\s*\|.*\|\s*$/.test(rows[i])) {
        trows.push(rows[i].split("|").slice(1, -1).map(function (c) { return c.trim(); })); i++;
      }
      let t = "<table><thead><tr>" + head.map(function (h) { return "<th>" + mdInline(h) + "</th>"; }).join("") + "</tr></thead><tbody>";
      trows.forEach(function (r) { t += "<tr>" + r.map(function (c) { return "<td>" + mdInline(c) + "</td>"; }).join("") + "</tr>"; });
      out.push(t + "</tbody></table>");
      continue;
    }
    const h = line.match(/^\s*(#{1,4})\s+(.*)$/);
    if (h) { flushPara(); flushList(); const n = Math.min(h[1].length + 1, 4); out.push("<h" + n + ">" + mdInline(h[2]) + "</h" + n + ">"); i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushPara(); flushList(); out.push("<hr>"); i++; continue; }
    const q = line.match(/^\s*>\s?(.*)$/);
    if (q) { flushPara(); flushList(); out.push("<blockquote>" + mdInline(q[1]) + "</blockquote>"); i++; continue; }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const want = ul ? "ul" : "ol";
      if (listType !== want) { flushList(); listType = want; }
      listItems.push("<li>" + mdInline((ul || ol)[1]) + "</li>");
      i++; continue;
    }
    if (!line.trim()) { flushPara(); flushList(); i++; continue; }
    para.push(line); i++;
  }
  flushPara(); flushList();
  return out.join("\n");
}

/* ---------- the shell DOM (the ChatGPT screen) ---------- */

const AI_SUGGESTIONS = [
  ["Explain something", "Explain photosynthesis in simple words"],
  ["Kiswahili", "Eleza maana ya uchumi kwa Kiswahili rahisi"],
  ["Help me write", "Write a polite message to a customer about a delayed order"],
  ["Ideas", "Give me five business ideas I can start with little money"]
];

function ensureDom(root) {
  root.innerHTML =
    '<div class="ai-app" id="ai-shell">' +
      '<aside class="ai-rail" id="ai-rail">' +
        '<div class="ai-rail-head"><button class="ai-rail-new" id="ai-new" title="Start a new conversation"><span class="plus">+</span> New chat</button></div>' +
        '<div class="ai-rail-list" id="ai-rail-list"></div>' +
        '<div class="ai-rail-foot">' +
          '<button class="ai-rail-settings" id="ai-settings-btn">Settings - the AI brain</button>' +
        '</div>' +
      '</aside>' +
      '<div class="ai-rail-scrim" id="ai-rail-scrim"></div>' +
      '<section class="ai-main">' +
        '<div class="ai-top">' +
          '<button class="ai-burger" id="ai-burger" title="Toggle the chat rail">&#9776;</button>' +
          '<span class="ai-title">JAMALI AI</span>' +
          '<span class="ai-pill"><span class="ai-dot" id="ai-dot"></span><span id="ai-status">Ready</span></span>' +
          '<span class="ai-user" id="ai-user"></span>' +
        '</div>' +
        '<div class="ai-chat" id="ai-chat">' +
          '<div class="ai-welcome" id="ai-welcome">' +
            '<div class="ai-logo">&#10022;</div>' +
            '<h1>What can I help with?</h1>' +
            '<p class="ai-sub">Ask anything - school, business, health, technology, everyday life - in Swahili, English or a mix. The answer streams word by word, like ChatGPT.</p>' +
            '<div class="ai-suggests">' +
              AI_SUGGESTIONS.map(function (s) {
                return '<button type="button" class="ai-suggest" data-fill="' + esc(s[1]) + '"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></button>';
              }).join("") +
            '</div>' +
          '</div>' +
          '<div class="ai-stream" id="ai-stream" hidden></div>' +
        '</div>' +
        '<div class="ai-dock" id="ai-dock">' +
          '<div class="ai-composer">' +
            '<textarea class="ai-input" id="ai-input" rows="1" placeholder="Message JAMALI AI"></textarea>' +
            '<button class="ai-send" id="ai-send" title="Send" disabled><span class="up">&#8593;</span><span class="ai-stop"></span></button>' +
          '</div>' +
          '<div class="ai-foot" id="ai-foot">JAMALI AI can make mistakes. Check important answers.</div>' +
        '</div>' +
      '</section>' +
    '</div>' +
    '<div class="ai-modal" id="ai-modal">' +
      '<div class="ai-modal-card">' +
        '<h2>The AI brain</h2>' +
        '<p class="ai-sub">This AI answers with <b>OpenAI GPT</b> - the brain is built in, so it answers the moment you ask, like ChatGPT. If OpenAI ever refuses, switch to <b>Z.ai GLM</b> - the free backup, also already set up. Or bring your own free Gemini key; the key stays on this device only.</p>' +
        '<label for="ai-provider">The brain</label>' +
        '<select id="ai-provider">' +
          '<option value="openai">OpenAI GPT - already set up, works now</option>' +
          '<option value="zai">Z.ai GLM - free backup brain, already set up</option>' +
          '<option value="gemini">Gemini - bring your own free key (aistudio.google.com)</option>' +
        '</select>' +
        '<div id="ai-openai-row">' +
          '<label for="ai-openai-model">OpenAI model</label>' +
          '<select id="ai-openai-model">' +
            '<option value="gpt-4o-mini">gpt-4o-mini - fast and inexpensive (default)</option>' +
            '<option value="gpt-4.1-mini">gpt-4.1-mini - newer, stronger on hard questions</option>' +
            '<option value="gpt-4o">gpt-4o - the strongest everyday model</option>' +
            '<option value="gpt-4.1">gpt-4.1 - the flagship for the hardest work</option>' +
          '</select>' +
        '</div>' +
        '<div id="ai-zai-row" hidden>' +
          '<label for="ai-zai-model">Z.ai model</label>' +
          '<select id="ai-zai-model">' +
            '<option value="glm-4.5-flash">glm-4.5-flash - free, works now</option>' +
          '</select>' +
        '</div>' +
        '<div id="ai-gemini-row" hidden>' +
          '<label for="ai-gemini-key">Gemini API key</label>' +
          '<input type="password" id="ai-gemini-key" placeholder="paste your key from aistudio.google.com" autocomplete="off">' +
          '<label for="ai-gemini-model">Gemini model</label>' +
          '<select id="ai-gemini-model">' +
            '<option value="gemini-2.5-flash">gemini-2.5-flash - fast, generous free tier</option>' +
            '<option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite - the cheapest</option>' +
            '<option value="gemini-2.5-pro">gemini-2.5-pro - the strongest</option>' +
            '<option value="gemini-2.0-flash">gemini-2.0-flash</option>' +
          '</select>' +
        '</div>' +
        '<div class="ai-modal-note">The OpenAI brain and the Z.ai backup are managed by the system owner - nothing to fill in. A Gemini key added here is kept on this device only (the browser\'s own storage) and is sent nowhere except Google\'s Gemini API; clear it any time with Remove.</div>' +
        '<div class="ai-modal-actions">' +
          '<button type="button" class="ai-btn ghost" id="ai-gemini-remove">Remove Gemini key</button>' +
          '<button type="button" class="ai-btn" id="ai-gemini-save">Save</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  S.els.chat = document.getElementById("ai-chat");
  S.els.welcome = document.getElementById("ai-welcome");
  S.els.dock = document.getElementById("ai-dock");
  S.els.railList = document.getElementById("ai-rail-list");
  S.els.railModel = document.getElementById("ai-rail-model");
  S.els.stream = document.getElementById("ai-stream");
  S.els.input = document.getElementById("ai-input");
  S.els.send = document.getElementById("ai-send");
  S.els.status = document.getElementById("ai-status");
  S.els.dot = document.getElementById("ai-dot");
  S.els.foot = document.getElementById("ai-foot");
  S.els.user = document.getElementById("ai-user");
  S.streaming = false;
  S.streamCtl = null;
  S.chats = [];
  S.chatId = null;
}

/* ---------- the screen's small mechanics ---------- */

function hideWelcome() {
  if (S.els.welcome) S.els.welcome.hidden = true;
  if (S.els.stream) S.els.stream.hidden = false;
}

function autogrow() {
  const el = S.els.input;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 168) + "px";
}

function setStatus(st) {
  S.status = st;
  const map = { ready: "Ready", processing: "Thinking" };
  if (S.els.status) S.els.status.textContent = map[st] || st;
  if (S.els.dot) S.els.dot.className = "ai-dot" + (st === "processing" ? " st-processing" : "");
  if (st !== "processing") hideProcessing();
  updateSend();
}

function showProcessing(label) {
  hideProcessing();
  S.procEl = pushHtml('<div class="ai-processing"><span class="ai-spinner"></span><span>' +
    esc(label || "Thinking...") + "</span></div>", "ai-ai");
  scrollDown();
}
function hideProcessing() {
  if (S.procEl) { try { S.procEl.remove(); } catch (e) {} S.procEl = null; }
}

function updateSend() {
  if (!S.els.send) return;
  const has = S.els.input.value.trim().length > 0;
  S.els.send.classList.remove("is-blue", "is-busy");
  if (S.status === "processing" && S.streaming) { S.els.send.classList.add("is-busy"); S.els.send.disabled = false; }
  else if (S.status === "processing") { S.els.send.classList.add("is-busy"); S.els.send.disabled = true; }
  else if (!has) { S.els.send.disabled = true; }
  else { S.els.send.classList.add("is-blue"); S.els.send.disabled = false; }
  if (S.els.input) S.els.input.disabled = S.status === "processing";
}

function scrollDown() {
  const chat = S.els.chat || document.getElementById("ai-chat");
  if (chat) chat.scrollTop = chat.scrollHeight;
}

function pushHtml(html, cls) {
  const wrap = document.createElement("div");
  wrap.className = "ai-msg " + (cls || "ai-ai");
  if ((cls || "ai-ai").indexOf("ai-user") !== -1) {
    wrap.innerHTML = html;
  } else {
    wrap.innerHTML = '<div class="ai-avatar">&#10022;</div><div class="ai-answer">' + html + '</div>';
  }
  S.els.stream.appendChild(wrap);
  hideWelcome();
  scrollDown();
  return wrap;
}

function userBubble(text) {
  pushHtml('<div class="ai-bubble">' + esc(text).replace(/\n/g, "<br>") + '</div>', "ai-user");
}

function cardShell(kind, title, bodyHtml, extra) {
  return '<div class="ai-card ai-' + (kind === "error" ? "error" : kind) + '"' + (extra || "") +
    '><div class="ai-card-title">' + esc(title) + "</div>" + bodyHtml + "</div>";
}

/* ---------- the brains: OpenAI built in, Gemini by key ---------- */

const BRAIN_STORE = "JAMALI_AI_GEMINI"; /* the same store the previous version used - an existing key keeps working */

/* the OpenAI brain behind the system's server door: this page posts to
 * /api/ai, same origin, and the door talks to api.openai.com with the key
 * from the server environment (OPENAI_API_KEY) - the key is never in this
 * file, the browser or the repository. */
const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

/* the built-in Z.ai backup brain: its key ships in api/zai.js on the site
 * itself and the page calls its own /api/zai - same origin, so the browser
 * needs no key at all and Z.ai's missing CORS headers never matter. The
 * call is the same OpenAI-shaped stream; glm-4.5-flash is the free model. */
const ZAI_DEFAULT_MODEL = "glm-4.5-flash";

/* the one brain config: the provider plus each brain's own settings. The
 * old store shape ({ key, model }) is migrated on read, so a Gemini key
 * saved before keeps working - it just stops being the default brain. */
function brainCfg() {
  const c = { provider: "openai", openaiModel: OPENAI_DEFAULT_MODEL,
    zaiModel: ZAI_DEFAULT_MODEL, geminiKey: "", geminiModel: "gemini-2.5-flash" };
  try {
    const raw = JSON.parse(localStorage.getItem(BRAIN_STORE) || "null");
    if (raw && typeof raw === "object") {
      if (raw.provider === "gemini" || raw.provider === "openai" || raw.provider === "zai") c.provider = raw.provider;
      if (typeof raw.geminiKey === "string") c.geminiKey = raw.geminiKey;
      else if (typeof raw.key === "string") c.geminiKey = raw.key;
      if (typeof raw.geminiModel === "string") c.geminiModel = raw.geminiModel;
      else if (typeof raw.model === "string") c.geminiModel = raw.model;
      if (typeof raw.openaiModel === "string" && raw.openaiModel) c.openaiModel = raw.openaiModel;
      if (typeof raw.zaiModel === "string" && raw.zaiModel) c.zaiModel = raw.zaiModel;
    }
  } catch (e) {}
  return c;
}
function brainSaveCfg(cfg) {
  try { localStorage.setItem(BRAIN_STORE, JSON.stringify(cfg)); } catch (e) {}
  updateRailModel();
}
function brainName() {
  const c = brainCfg();
  return c.provider === "gemini" ? "Gemini" : c.provider === "zai" ? "Z.ai GLM" : "OpenAI";
}
function brainLabel() {
  const c = brainCfg();
  return c.provider === "gemini" ? "gemini:" + (c.geminiModel || "")
    : c.provider === "zai" ? "zai:" + (c.zaiModel || ZAI_DEFAULT_MODEL)
    : "openai:" + (c.openaiModel || "");
}
function brainReady() {
  const c = brainCfg();
  return c.provider !== "gemini" || !!(c.geminiKey || "").trim();
}

const BRAIN_SYSTEM =
  "You are JAMALI AI, a helpful, knowledgeable AI assistant. Answer any question - general knowledge, " +
  "school and study, business, health, technology, everyday life - directly, completely and honestly, " +
  "the way ChatGPT answers. Use Markdown when it helps: headings, lists, tables, code blocks. " +
  "Reply in the language the user writes - English, Swahili or a mix of both. " +
  "If a question is unclear, answer with your best understanding and say what you assumed. " +
  "Never invent facts; if you are not sure, say so plainly. " +
  "You are a standalone assistant: you cannot read, save or change any records, so never claim to.";

/* the conversation so far, as plain turns - the last 20 ride along. Each
 * brain shapes them its own way (below); the DOM stays the one source. */
function transcriptTurns() {
  const turns = [];
  const msgs = S.els.stream ? S.els.stream.querySelectorAll(".ai-msg") : [];
  msgs.forEach(function (el) {
    if (el.querySelector(".ai-processing")) return;
    if (el.classList.contains("ai-user")) {
      const b = el.querySelector(".ai-bubble");
      const t = b ? b.textContent.trim() : "";
      if (t) turns.push({ role: "user", text: t });
    } else {
      const a = el.querySelector(".ai-answer");
      if (!a) return;
      const t = cleanText(a);
      if (t) turns.push({ role: "assistant", text: t });
    }
  });
  return turns.slice(-20);
}

/* the OpenAI message shape (pure, so the tests can hold it): the system
 * prompt first, then the turns, then the fresh question */
function openaiMessages(turns, text) {
  const msgs = [{ role: "system", content: BRAIN_SYSTEM }];
  (turns || []).forEach(function (t) { msgs.push({ role: t.role, content: t.text }); });
  msgs.push({ role: "user", content: text });
  return msgs;
}

/* the Gemini contents shape (pure, testable): roles swap user/model and
 * every turn carries parts */
function geminiContents(turns, text) {
  const contents = [];
  (turns || []).forEach(function (t) {
    contents.push({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] });
  });
  contents.push({ role: "user", parts: [{ text: text }] });
  return contents;
}

/* the one streaming call, OpenAI: messages -> SSE deltas -> onDelta pieces.
 * The reply rides the same server-sent-event line ChatGPT's own site uses:
 * every "data:" line carries one delta, "[DONE]" closes the stream. */
async function openaiChat(messages, onDelta, signal) {
  const cfg = brainCfg();
  const model = cfg.openaiModel || OPENAI_DEFAULT_MODEL;
  let res;
  try {
    res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: model, stream: true, messages: messages }),
      signal: signal
    });
  } catch (e) {
    if (e && (e.name === "AbortError" || String(e.message || "").indexOf("abort") !== -1)) throw e;
    throw new Error("The browser could not reach the AI brain on the server (/api/ai). " +
      "If the system was just deployed, set the OPENAI_API_KEY environment variable in the Vercel project " +
      "(Settings - Environment Variables) and redeploy - or switch the brain to Z.ai GLM in Settings meanwhile.");
  }
  if (!res.ok || !res.body) {
    let msg = "HTTP " + res.status;
    try { const j = await res.json(); if (j && j.error && j.error.message) msg = j.error.message; }
    catch (e) { if (res.status === 404) msg = "The AI brain door (/api/ai) is not live yet - let the Vercel build finish, then press Retry."; }
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", acc = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buf += dec.decode(chunk.value, { stream: true });
    const ls = buf.split("\n");
    buf = ls.pop();
    for (const line of ls) {
      const t = line.trim();
      if (t.indexOf("data:") !== 0) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") continue;
      let j = null;
      try { j = JSON.parse(payload); } catch (e) { continue; }
      const d = j && j.choices && j.choices[0] && j.choices[0].delta;
      const piece = d && typeof d.content === "string" ? d.content : "";
      if (piece) { acc += piece; if (onDelta) onDelta(piece, acc); }
    }
  }
  return acc;
}

/* the one streaming call, Z.ai: the same OpenAI-shaped SSE, carried by the
 * site's own /api/zai (same origin), because Z.ai sends no CORS headers
 * and the browser cannot call it directly. glm-4.5-flash is a thinking
 * model - its reasoning chunks carry reasoning_content and are skipped
 * here; the visible answer rides delta.content, exactly like OpenAI's. */
async function zaiChat(messages, onDelta, signal) {
  const cfg = brainCfg();
  const model = cfg.zaiModel || ZAI_DEFAULT_MODEL;
  const res = await fetch("/api/zai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: model, stream: true, messages: messages }),
    signal: signal
  });
  if (!res.ok || !res.body) {
    let msg = "HTTP " + res.status;
    try { const j = await res.json(); if (j && j.error && j.error.message) msg = j.error.message; } catch (e) {}
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", acc = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buf += dec.decode(chunk.value, { stream: true });
    const ls = buf.split("\n");
    buf = ls.pop();
    for (const line of ls) {
      const t = line.trim();
      if (t.indexOf("data:") !== 0) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") continue;
      let j = null;
      try { j = JSON.parse(payload); } catch (e) { continue; }
      const d = j && j.choices && j.choices[0] && j.choices[0].delta;
      const piece = d && typeof d.content === "string" ? d.content : "";
      if (piece) { acc += piece; if (onDelta) onDelta(piece, acc); }
    }
  }
  return acc;
}

/* the one streaming call, Gemini: contents -> SSE deltas -> onDelta pieces */
async function geminiChat(contents, onDelta, signal) {
  const cfg = brainCfg();
  const model = cfg.geminiModel || "gemini-2.5-flash";
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":streamGenerateContent?alt=sse&key=" + encodeURIComponent(cfg.geminiKey.trim());
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: contents, systemInstruction: { parts: [{ text: BRAIN_SYSTEM }] } }),
    signal: signal
  });
  if (!res.ok || !res.body) {
    let msg = "HTTP " + res.status;
    try { const j = await res.json(); if (j && j.error && j.error.message) msg = j.error.message; } catch (e) {}
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", acc = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buf += dec.decode(chunk.value, { stream: true });
    const ls = buf.split("\n");
    buf = ls.pop();
    for (const line of ls) {
      const t = line.trim();
      if (t.indexOf("data: ") !== 0) continue;
      let j = null;
      try { j = JSON.parse(t.slice(6)); } catch (e) { continue; }
      const parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
      if (!parts) continue;
      for (const p of parts) {
        if (typeof p.text === "string" && p.text) {
          acc += p.text;
          if (onDelta) onDelta(p.text, acc);
        }
      }
    }
  }
  return acc;
}

/* the streamed reply: one AI message grows word by word with the caret,
 * the send button is the stop square, and Stop keeps what arrived. The
 * provider is read fresh each time, so a Settings switch lands mid-chat. */
async function brainStreamReply(text) {
  hideProcessing();
  const history = transcriptTurns();
  history.pop(); /* the current question was already captured; it goes in fresh */
  const provider = brainCfg().provider;

  const wrap = document.createElement("div");
  wrap.className = "ai-msg ai-ai";
  wrap.innerHTML = '<div class="ai-avatar">&#10022;</div><div class="ai-answer"><span class="ai-caret"></span></div>';
  S.els.stream.appendChild(wrap);
  hideWelcome(); scrollDown();
  const answerEl = wrap.querySelector(".ai-answer");

  S.streaming = true; updateSend();
  const ctl = new AbortController();
  S.streamCtl = ctl;
  let failed = null;
  const onDelta = function (delta, all) {
    answerEl.innerHTML = mdToHtml(all) + '<span class="ai-caret"></span>';
    scrollDown();
  };
  try {
    const acc = await (provider === "gemini"
      ? geminiChat(geminiContents(history, text), onDelta, ctl.signal)
      : provider === "zai"
        ? zaiChat(openaiMessages(history, text), onDelta, ctl.signal)
        : openaiChat(openaiMessages(history, text), onDelta, ctl.signal));
    answerEl.innerHTML = mdToHtml(acc || "...");
  } catch (e) {
    const aborted = e && (e.name === "AbortError" || String(e.message || "").indexOf("abort") !== -1);
    if (aborted) {
      const partial = answerEl.textContent.trim();
      if (!partial) wrap.remove();
      else answerEl.innerHTML = mdToHtml(partial) + '<p class="ai-dim">Stopped - this much of the answer stands.</p>';
    } else {
      failed = e;
    }
  }
  S.streaming = false; S.streamCtl = null;
  if (failed) {
    wrap.remove();
    setStatus("ready");
    throw failed;
  }
  setStatus("ready");
  updateSend();
  resetToReady();
}

function stopStreaming() {
  if (S.streamCtl) { try { S.streamCtl.abort(); } catch (e) {} }
}

function cleanText(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll(".ai-actions").forEach(function (x) { x.remove(); });
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

/* ---------- the chat rail: past conversations in Firestore (aiChats) ---------- */

function railError(msg) {
  const holder = S.els.railList;
  if (!holder) return;
  let el = document.getElementById("ai-rail-error");
  if (!el) {
    el = document.createElement("div");
    el.className = "ai-rail-error";
    el.id = "ai-rail-error";
    holder.parentNode.insertBefore(el, holder);
  }
  el.textContent = msg;
}

async function loadChats() {
  if (!S.user) return;
  try {
    const snap = await getDocs(query(collection(db, "aiChats"), where("uid", "==", S.user.uid), limit(100)));
    const all = [];
    snap.forEach(function (d) {
      const t = d.data();
      all.push({ id: d.id, title: t.title || "New chat", updatedAt: t.updatedAt && t.updatedAt.toDate ? t.updatedAt.toDate() : (t.createdAt && t.createdAt.toDate ? t.createdAt.toDate() : new Date(0)) });
    });
    all.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    S.chats = all.slice(0, 60);
    const errEl = document.getElementById("ai-rail-error");
    if (errEl) errEl.remove();
    renderRail();
  } catch (e) {
    railError("Past conversations are not saved yet: " + (e.message || e) + " - the aiChats rules need publishing once (apply-rules.sh). The chat itself works.");
  }
}

function renderRail() {
  if (!S.els.railList) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400000);
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  (S.chats || []).forEach(function (c) {
    if (c.updatedAt >= today) groups.Today.push(c);
    else if (c.updatedAt >= yesterday) groups.Yesterday.push(c);
    else groups.Earlier.push(c);
  });
  let h = "";
  Object.keys(groups).forEach(function (g) {
    if (!groups[g].length) return;
    h += '<div class="ai-rail-cap">' + g + "</div>";
    groups[g].forEach(function (c) {
      h += '<div class="ai-rail-item' + (c.id === S.chatId ? " active" : "") + '" data-id="' + esc(c.id) + '" title="' + esc(c.title) + '">' +
        '<span class="ic">&#128172;</span><span class="t">' + esc(c.title) + "</span>" +
        '<button type="button" class="ai-rail-del" data-del="' + esc(c.id) + '" title="Delete this conversation">&times;</button></div>';
    });
  });
  S.els.railList.innerHTML = h || '<div class="ai-rail-cap">No conversations yet</div>';
  updateRailModel();
}

/* the old brain label under the rail was removed at the owner's request -
 * the Settings modal is the one place that describes the brain now. */
function updateRailModel() { return; }

async function openChat(id) {
  try {
    const dsnap = await getDoc(doc(db, "aiChats", id));
    if (!dsnap.exists()) { renderRail(); return; }
    const t = dsnap.data();
    if (t.uid !== (S.user ? S.user.uid : "")) return;
    S.chatId = id;
    S.els.stream.innerHTML = "";
    S.els.dock.style.display = "";
    if (S.els.stream.hidden) { S.els.welcome.hidden = true; S.els.stream.hidden = false; }
    (t.messages || []).forEach(function (m) {
      if (m.r === "u") userBubble(m.t);
      else pushHtml(mdToHtml(m.t));
    });
    if (!(t.messages || []).length) { S.els.welcome.hidden = false; S.els.stream.hidden = true; }
    renderRail();
    setStatus("ready");
  } catch (e) {
    pushHtml(cardShell("error", "Conversation could not be opened", "<p>" + esc(e.message || e) + "</p>", ' data-noretry="1"'));
  }
}

async function deleteChatById(id) {
  try {
    await deleteDoc(doc(db, "aiChats", id));
    if (S.chatId === id) S.chatId = null;
    await loadChats();
  } catch (e) {
    railError("The conversation could not be deleted: " + (e.message || e));
  }
}

/* a fresh conversation: the screen clears, the rail stays */
function newConversation() {
  S.chatId = null;
  S.lastRequest = null;
  S.els.stream.innerHTML = "";
  S.els.welcome.hidden = false;
  S.els.stream.hidden = true;
  S.els.dock.style.display = "";
  renderRail();
  setStatus("ready");
  if (window.innerWidth > 800 && S.els.input) S.els.input.focus();
}

/* one document per conversation: the transcript rides to aiChats without
 * ever blocking the screen */
async function saveChat() {
  if (!S.user || !S.els.stream) return;
  const msgs = [];
  S.els.stream.querySelectorAll(".ai-msg").forEach(function (el) {
    if (el.classList.contains("ai-user")) {
      const b = el.querySelector(".ai-bubble");
      const t = b ? b.textContent.trim() : "";
      if (t) msgs.push({ r: "u", t: t });
    } else {
      const a = el.querySelector(".ai-answer");
      if (!a || el.querySelector(".ai-processing")) return;
      const t = cleanText(a);
      if (t) msgs.push({ r: "a", t: t.slice(0, 8000) });
    }
  });
  if (!msgs.some(function (m) { return m.r === "u"; })) return; /* nothing the user said - nothing to keep */
  const cap = msgs.slice(-200);
  const firstUser = cap.filter(function (m) { return m.r === "u"; })[0];
  const title = (firstUser ? firstUser.t : "New chat").slice(0, 60);
  const data = {
    uid: S.user.uid, email: S.user.email || "", title: title,
    messages: cap, model: brainLabel(),
    updatedAt: serverTimestamp()
  };
  try {
    if (S.chatId) await updateDoc(doc(db, "aiChats", S.chatId), data);
    else { const ref = await addDoc(collection(db, "aiChats"), Object.assign({ createdAt: serverTimestamp() }, data)); S.chatId = ref.id; }
    await loadChats();
  } catch (e) {
    railError("The conversation is not being saved: " + (e.message || e) + " - the aiChats rules need publishing once (apply-rules.sh). Everything else works.");
  }
}

function resetToReady() {
  setStatus("ready");
  try { saveChat(); } catch (e) {}
}

/* ---------- the settings modal ---------- */

function openSettings() {
  const m = document.getElementById("ai-modal");
  const cfg = brainCfg();
  document.getElementById("ai-provider").value = cfg.provider;
  document.getElementById("ai-openai-model").value = cfg.openaiModel || OPENAI_DEFAULT_MODEL;
  document.getElementById("ai-zai-model").value = cfg.zaiModel || ZAI_DEFAULT_MODEL;
  document.getElementById("ai-gemini-key").value = cfg.geminiKey || "";
  document.getElementById("ai-gemini-model").value = cfg.geminiModel || "gemini-2.5-flash";
  syncProviderRows();
  if (m) m.classList.add("open");
}
function syncProviderRows() {
  const p = document.getElementById("ai-provider").value;
  document.getElementById("ai-openai-row").hidden = p !== "openai";
  document.getElementById("ai-zai-row").hidden = p !== "zai";
  document.getElementById("ai-gemini-row").hidden = p !== "gemini";
}
function closeSettings() {
  const m = document.getElementById("ai-modal");
  if (m) m.classList.remove("open");
}
function wireSettings() {
  const m = document.getElementById("ai-modal");
  if (!m) return;
  document.getElementById("ai-settings-btn").addEventListener("click", openSettings);
  m.addEventListener("click", function (e) { if (e.target === m) closeSettings(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSettings(); });
  document.getElementById("ai-provider").addEventListener("change", syncProviderRows);
  document.getElementById("ai-gemini-save").addEventListener("click", function () {
    const provider = document.getElementById("ai-provider").value;
    const openaiModel = document.getElementById("ai-openai-model").value;
    const zaiModel = document.getElementById("ai-zai-model").value;
    const key = document.getElementById("ai-gemini-key").value.trim();
    const geminiModel = document.getElementById("ai-gemini-model").value;
    brainSaveCfg({ provider: provider, openaiModel: openaiModel, zaiModel: zaiModel, geminiKey: key, geminiModel: geminiModel });
    closeSettings();
    updateRailModel();
    if (provider === "gemini" && !key) {
      pushHtml(cardShell("status", "One step to start",
        "<p>Gemini is chosen but the key box is empty. Paste a free key from <b>aistudio.google.com</b> " +
        "- or switch the brain back to <b>OpenAI GPT</b>, which answers with no setup.</p>", ' data-noretry="1"'));
      openSettings();
    } else {
      pushHtml(cardShell("answer", "The brain is set",
        "<p><b>" + esc(provider === "gemini" ? "Gemini" : provider === "zai" ? "Z.ai GLM" : "OpenAI") + "</b> " +
        esc(provider === "gemini" ? geminiModel : provider === "zai" ? zaiModel : openaiModel) +
        " answers now - ask anything, the reply streams like ChatGPT.</p>", ' data-noretry="1"'));
    }
    setStatus("ready");
  });
  document.getElementById("ai-gemini-remove").addEventListener("click", function () {
    document.getElementById("ai-gemini-key").value = "";
    brainSaveCfg({
      provider: document.getElementById("ai-provider").value,
      openaiModel: document.getElementById("ai-openai-model").value,
      zaiModel: document.getElementById("ai-zai-model").value,
      geminiKey: "",
      geminiModel: document.getElementById("ai-gemini-model").value
    });
    updateRailModel();
  });
}

/* ---------- wiring ---------- */

function wireChat() {
  const shell = document.getElementById("ai-shell");
  const input = S.els.input;

  input.addEventListener("input", function () { autogrow(); updateSend(); });
  input.addEventListener("keydown", function (e) {
    if (e.isComposing) return; /* the IME's own Enter never sends */
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } /* Shift+Enter keeps the newline */
  });
  S.els.send.addEventListener("click", function () {
    if (S.streaming) { stopStreaming(); return; }
    onSend();
  });

  /* the chat rail */
  document.getElementById("ai-new").addEventListener("click", newConversation);
  S.els.railList.addEventListener("click", function (e) {
    const del = e.target.closest("[data-del]");
    if (del) { e.preventDefault(); deleteChatById(del.getAttribute("data-del")); return; }
    const item = e.target.closest(".ai-rail-item");
    if (item) openChat(item.getAttribute("data-id"));
  });

  /* the top bar: the burger folds the rail */
  document.getElementById("ai-burger").addEventListener("click", function () {
    if (window.innerWidth <= 800) shell.classList.toggle("rail-open-mobile");
    else shell.classList.toggle("rail-closed");
  });
  document.getElementById("ai-rail-scrim").addEventListener("click", function () {
    shell.classList.remove("rail-open-mobile");
  });

  /* the welcome suggestions fill the input */
  S.els.welcome.addEventListener("click", function (e) {
    const s = e.target.closest(".ai-suggest");
    if (!s) return;
    input.value = s.getAttribute("data-fill") || "";
    autogrow(); updateSend(); input.focus();
  });

  /* the retry button on an error card re-sends the last question */
  S.els.chat.addEventListener("click", function (e) {
    const r = e.target.closest("[data-retry]");
    if (r) { e.preventDefault(); if (S.lastRequest) { S.els.input.value = S.lastRequest; onSend(); } }
  });
}

/* ---------- the send pipeline: question in, streamed answer out ---------- */

async function onSend() {
  if (S.streaming) return;
  const text = S.els.input.value.trim();
  if (!text || S.status === "processing") return;
  S.lastRequest = text;
  userBubble(text);
  S.els.input.value = "";
  autogrow();
  updateSend();
  if (!brainReady()) {
    pushHtml(cardShell("status", "One step to start",
      "<p>The brain is set to <b>Gemini</b> but no key is saved yet. Paste a free key " +
      "(from <b>aistudio.google.com</b>) in <b>Settings</b> - it stays on this device only - " +
      "or switch back to <b>OpenAI GPT</b>, which answers with no setup.</p>", ' data-noretry="1"'));
    openSettings();
    S.els.input.value = text; /* the question stays, ready to send */
    autogrow(); updateSend();
    setStatus("ready");
    return;
  }
  setStatus("processing");
  showProcessing("Thinking...");
  try {
    await brainStreamReply(text);
  } catch (e) {
    pushHtml(cardShell("error", brainName() + " could not answer",
      "<p>" + esc(e && e.message ? e.message : String(e)) + "</p>" +
      "<p>Check the brain and the model in Settings, or press Retry.</p>", ""));
    S.els.input.value = text; /* the question comes back - nothing is lost */
    autogrow(); updateSend();
    setStatus("ready");
  }
}

/* ---------- boot ---------- */

async function bootShell(root) {
  await requireAuth();
  S.user = auth.currentUser || S.user;
  ensureDom(root);
  if (S.els.user) S.els.user.textContent = S.user ? (S.user.email || "signed in") : "";
  wireChat();
  wireSettings();
  setStatus("ready");
  updateRailModel();
  loadChats();
  updateSend();
  if (window.innerWidth > 800) S.els.input.focus();
}

export async function boot() {
  const root = document.getElementById("ai-app");
  if (!root) return;
  if (!S.els.stream) await bootShell(root);
  else { renderRail(); setStatus("ready"); }
}

/* The page self-boots when 329.html loads this file as its own module.
 * Every ?m=<n> family link (the sidebar, the Home Screen AI tile) lands
 * here on the one chat - nothing system-related, one working AI. */
if (typeof window !== "undefined" && typeof location !== "undefined") {
  const seg = location.pathname.split("/").filter(Boolean);
  if (seg[0] === "ai" && (seg[1] === "329" || seg[1] === "329/" || seg[1] === "329.html")) {
    const start = function () { boot(); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  }
}

/* the test hook: the markdown renderer, the brain shapes and the settings
 * store stay testable */
export { mdToHtml, brainCfg, brainSaveCfg, brainReady, brainName, brainLabel,
  openaiMessages, geminiContents, zaiChat, AI_VERSION, BRAIN_SYSTEM,
  OPENAI_DEFAULT_MODEL, ZAI_DEFAULT_MODEL };

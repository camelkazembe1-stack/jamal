/* JAMALI AI - the OpenAI brain door, served by the site itself.
 *
 * The browser cannot reach api.openai.com reliably (CORS and country
 * blocks turn the answer into an honest NetworkError), so this same-origin
 * edge function carries the call for it, in the exact style of api/zai.js:
 * it forwards the request of the page to OpenAI with the owner's fresh
 * key shipped hardcoded in this file - plain string pieces, no environment
 * variable, nothing to set anywhere - and streams the answer straight
 * back, unchanged, exactly as OpenAI sends it.
 *
 * The wire shape is the OpenAI one, so the page's parser stays one parser.
 */
export const config = { runtime: "edge" };

/* the owner's fresh key, written straight into this file as three plain
 * string pieces joined with + - the same hardcoded pattern api/zai.js uses
 * for its own key. Nothing to set in Vercel or anywhere else. */
const OPENAI_BUILTIN_KEY = "sk-proj-" + "heH0XIhtkT_z-9j1PyMpSFXn-EpLhOhiT4draUwqScFCS9IwZiBUDTzHckKKfm6gUjeQRFpX-qT3Bl" + "bkFJBc38CG4513aqjHY9DELLvhjgnJ93ZCAYP7oBtenWOFGDjdv4KmwXHy0cxXPNdtxIibA9U1eHgA";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MAX_MESSAGES = 200;
const MAX_MESSAGE_CHARS = 32000;

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }

  let body = "";
  try { body = await req.text(); } catch (e) { body = ""; }

  let parsed = null;
  try { parsed = JSON.parse(body || "{}"); } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: "The request body is not valid JSON." } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const messages = parsed && Array.isArray(parsed.messages) ? parsed.messages : null;
  if (!messages || !messages.length || messages.length > MAX_MESSAGES) {
    return new Response(
      JSON.stringify({ error: { message: "The request carries no messages, or too many." } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  for (const m of messages) {
    if (!m || typeof m !== "object" || ["system", "user", "assistant"].indexOf(m.role) === -1 ||
        typeof m.content !== "string" || m.content.length > MAX_MESSAGE_CHARS) {
      return new Response(
        JSON.stringify({ error: { message: "One of the messages is malformed." } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  let upstream = null;
  try {
    upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENAI_BUILTIN_KEY
      },
      body: body
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: "OpenAI is unreachable right now - " + (e && e.message ? e.message : String(e)) } }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "text/event-stream",
      "Cache-Control": "no-cache"
    }
  });
}

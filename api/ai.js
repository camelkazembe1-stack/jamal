/* JAMALI AI - the OpenAI brain door, served by the site itself.
 *
 * The browser cannot reach api.openai.com reliably (CORS and country
 * blocks turn the answer into an honest NetworkError), so this same-origin
 * edge function carries the call for it, in the exact style of api/zai.js:
 * it forwards the page's request to OpenAI with the key from the server
 * environment (OPENAI_API_KEY in the Vercel project) and streams the
 * answer straight back, unchanged. The key never rides in the browser or
 * the repository.
 *
 * The wire shape is the OpenAI one, so the page's parser stays one parser.
 */
export const config = { runtime: "edge" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MAX_MESSAGES = 200;
const MAX_MESSAGE_CHARS = 32000;

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }

  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) {
    return new Response(
      JSON.stringify({ error: { message: "The OpenAI brain is not configured on the server yet: set the OPENAI_API_KEY environment variable in the Vercel project (Settings - Environment Variables), redeploy - or switch the brain to Z.ai GLM in Settings meanwhile." } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
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
        "Authorization": "Bearer " + key
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

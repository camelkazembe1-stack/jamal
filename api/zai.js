/* JAMALI AI - the Z.ai brain, the system's default, served by the site itself.
 *
 * The browser cannot call api.z.ai directly (that API sends no CORS
 * headers), so this same-origin edge function carries the call for it:
 * it forwards the page's request body to Z.ai with the owner's key and
 * streams the answer straight back, unchanged. The key ships in this
 * file, managed by the system owner - nothing for the user to fill in,
 * and the key never even reaches the browser.
 *
 * The wire shape is the OpenAI one (glm-4.5-flash streams the same
 * data: {...delta...} lines), so the page's parser stays one parser.
 */
export const config = { runtime: "edge" };

const ZAI_BUILTIN_KEY = "af3c6b77a2a141fb9144afa366adee33.mnIw2AVVbUwzNdqB";
const ZAI_URL = "https://api.z.ai/api/paas/v4/chat/completions";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }
  let body = "";
  try { body = await req.text(); } catch (e) { body = ""; }
  let upstream = null;
  try {
    upstream = await fetch(ZAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + ZAI_BUILTIN_KEY
      },
      body: body
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: "Z.ai is unreachable right now - " + (e && e.message ? e.message : String(e)) } }),
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

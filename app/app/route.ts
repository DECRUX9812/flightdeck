import html from "../../web/index.html?raw";

/** The universal surface: a plain responsive page any browser can open. */
export function GET(): Response {
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

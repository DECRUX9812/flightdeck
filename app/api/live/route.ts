import { collect, renderText } from "../../../lib/host";

/**
 * Real host telemetry. `?format=text` returns the plain-text board that CI,
 * cron and Slack can consume; anything else returns JSON for the console UI.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = process.env.FLIGHTDECK_TOKEN;
  if (token && url.searchParams.get("token") !== token) {
    return new Response("unauthorized\n", { status: 401, headers: { "content-type": "text/plain" } });
  }

  const snapshot = await collect();

  if (url.searchParams.get("format") === "text") {
    return new Response(`${renderText(snapshot)}\n`, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  return Response.json(snapshot, { headers: { "cache-control": "no-store" } });
}

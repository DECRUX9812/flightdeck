import { journalFor } from "../../../lib/host";

/** Last N journal lines for one unit or container, for the detail page. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const token = process.env.FLIGHTDECK_TOKEN;
  if (token && url.searchParams.get("token") !== token) {
    return new Response(JSON.stringify({ lines: [], error: "unauthorized" }), { status: 401 });
  }
  if (!id) return Response.json({ lines: [], error: "missing id" }, { status: 400 });
  const lines = await journalFor(id, Number(url.searchParams.get("lines") ?? 8));
  return Response.json({ lines }, { headers: { "cache-control": "no-store" } });
}

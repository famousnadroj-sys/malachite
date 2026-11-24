const ALLOWED_ORIGIN = "https://famousnadroj-sys.github.io";

function respond(status: number, body: Record<string, string>, origin: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
  if (origin === ALLOWED_ORIGIN) headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve((req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== ALLOWED_ORIGIN) {
    return respond(403, { error: "origin_not_allowed" }, origin);
  }
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }
    });
  }
  if (req.method !== "POST") {
    return respond(405, { error: "method_not_allowed" }, origin);
  }
  return respond(410, { error: "advertising_generation_disabled" }, origin);
});

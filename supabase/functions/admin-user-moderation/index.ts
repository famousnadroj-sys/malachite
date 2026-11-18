import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ADMIN_EMAIL = "famousnadroj@gmail.com";
const ALLOWED_ORIGIN = "https://famousnadroj-sys.github.io";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function reply(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN,
      "Vary": "Origin",
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
      },
    });
  }
  if (origin && origin !== ALLOWED_ORIGIN) return reply(403, { error: "origin_not_allowed" }, origin);
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" }, origin);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply(401, { error: "authentication_required" }, origin);

  let payload: { user_id?: unknown; action?: unknown };
  try {
    payload = await req.json();
  } catch {
    return reply(400, { error: "invalid_json" }, origin);
  }
  const userId = typeof payload.user_id === "string" ? payload.user_id : "";
  const action = payload.action;
  if (!UUID_RE.test(userId) || (action !== "suspend" && action !== "unsuspend")) {
    return reply(400, { error: "invalid_request" }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return reply(503, { error: "server_configuration_missing" }, origin);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return reply(401, { error: "invalid_session" }, origin);
  if ((authData.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return reply(403, { error: "admin_only" }, origin);
  }
  if (authData.user.id === userId) return reply(400, { error: "cannot_suspend_self" }, origin);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: action === "suspend" ? "876000h" : "none",
  });
  if (error) {
    return reply(400, { error: "moderation_failed", message: error.message }, origin);
  }
  return reply(200, { ok: true, action, user_id: data.user.id }, origin);
});

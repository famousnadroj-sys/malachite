import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ALLOWED_ORIGIN = "https://famousnadroj-sys.github.io";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function response(status: number, body: Record<string, unknown>, origin?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (origin === ALLOWED_ORIGIN) headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== ALLOWED_ORIGIN) return response(403, { error: "origin_not_allowed" }, origin);
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
  if (req.method !== "POST") return response(405, { error: "method_not_allowed" }, origin);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return response(401, { error: "authentication_required" }, origin);

  let payload: { user_id?: unknown; action?: unknown; reason?: unknown };
  try {
    payload = await req.json();
  } catch {
    return response(400, { error: "invalid_json" }, origin);
  }
  const userId = typeof payload.user_id === "string" ? payload.user_id : "";
  const action = payload.action;
  const reason = typeof payload.reason === "string" ? payload.reason.trim().slice(0, 300) : "";
  if (!UUID_RE.test(userId) || (action !== "suspend" && action !== "unsuspend")) {
    return response(400, { error: "invalid_request" }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return response(503, { error: "server_configuration_missing" }, origin);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return response(401, { error: "invalid_session" }, origin);
  if (authData.user.id === userId) return response(400, { error: "cannot_moderate_self" }, origin);

  // The database allow-list is authoritative. It also rejects attempts to
  // suspend another administrator and writes the moderation audit record.
  const { data: moderation, error: moderationError } = await userClient.rpc("moderate_user", {
    p_user_id: userId,
    p_action: action,
    p_reason: reason || null,
  });
  if (moderationError) {
    const code = moderationError.message.includes("admin_only") ? "admin_only"
      : moderationError.message.includes("cannot_moderate_admin") ? "cannot_moderate_admin"
      : moderationError.message.includes("invalid_target") ? "invalid_target"
      : "moderation_failed";
    return response(code === "admin_only" ? 403 : 400, { error: code }, origin);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: action === "suspend" ? "876000h" : "none",
  });
  if (error) {
    // The database suspension is fail-closed: RLS also denies suspended users.
    return response(502, { error: "auth_ban_sync_failed", database_updated: true }, origin);
  }
  return response(200, { ok: true, action, user_id: data.user.id, moderation }, origin);
});

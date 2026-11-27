import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const APP_ORIGIN = "https://famousnadroj-sys.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function encodeJson(value: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(value)));
}

function pemToDer(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, "\n").trim();
  if (!normalized.includes("BEGIN PRIVATE KEY")) {
    throw new Error("JAAS_PRIVATE_KEY must be an unencrypted PKCS#8 PEM key");
  }
  const body = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function signJaasJwt(appId: string, keyId: string, pem: string, roomName: string, userId: string, displayName: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid: appId + "/" + keyId, typ: "JWT" };
  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: appId,
    nbf: now - 5,
    exp: now + 120,
    room: roomName,
    context: {
      user: { id: userId, name: displayName, moderator: "false" },
      features: {
        livestreaming: false,
        recording: false,
        transcription: false,
        "outbound-call": false,
        "inbound-call": false,
        "file-upload": false,
      },
      room: { regex: false },
    },
  };
  const unsigned = encodeJson(header) + "." + encodeJson(payload);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  return unsigned + "." + base64url(new Uint8Array(signature));
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (origin !== APP_ORIGIN) return new Response("forbidden", { status: 403 });
    return new Response("ok", { headers: corsHeaders });
  }
  if (origin !== APP_ORIGIN) return json({ error: "origin_not_allowed" }, 403);
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appId = Deno.env.get("JAAS_APP_ID");
  const keyId = Deno.env.get("JAAS_API_KEY_ID");
  const privateKey = Deno.env.get("JAAS_PRIVATE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "server_configuration_missing" }, 503);

  const authorization = req.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  if (!bearer) return json({ error: "not_authenticated" }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer " + bearer[1] } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  const user = authData?.user;
  if (authError || !user) return json({ error: "not_authenticated" }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "invalid_request_body" }, 400);
  }
  const action = typeof (body as { action?: unknown }).action === "string"
    ? (body as { action: string }).action
    : "token";
  if (action !== "status" && action !== "token") return json({ error: "invalid_action" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (action === "status") {
    const { data: enabled, error: statusError } = await admin.rpc("call_provider_is_enabled");
    if (statusError) return json({ error: "provider_status_unavailable" }, 500);
    const providerConfigured = !!appId && !!keyId && !!privateKey
      && appId.startsWith("vpaas-magic-cookie-") && !appId.includes("/");
    return json({ enabled: enabled === true && providerConfigured, configured: providerConfigured, provider: "jaas" });
  }

  if (!appId || !keyId || !privateKey) return json({ error: "secure_call_provider_not_configured" }, 503);
  if (!appId.startsWith("vpaas-magic-cookie-") || appId.includes("/")) return json({ error: "invalid_jaas_app_id" }, 503);

  const sessionId = typeof (body as { session_id?: unknown }).session_id === "string"
    ? (body as { session_id: string }).session_id
    : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return json({ error: "invalid_session_id" }, 400);
  }

  const { data: session, error: sessionError } = await admin
    .from("call_sessions")
    .select("id,caller_id,callee_id,room,status,expires_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) return json({ error: "session_lookup_failed" }, 500);
  if (!session || (session.caller_id !== user.id && session.callee_id !== user.id)) {
    return json({ error: "call_session_not_found" }, 404);
  }
  if (session.status !== "accepted" || !session.expires_at || new Date(session.expires_at).getTime() <= Date.now()) {
    return json({ error: "call_session_not_active" }, 403);
  }
  const { data: eligible, error: eligibilityError } = await admin.rpc("call_session_token_eligible", {
    p_session_id: sessionId,
    p_user_id: user.id,
  });
  if (eligibilityError) return json({ error: "call_eligibility_check_failed" }, 500);
  if (eligible !== true) return json({ error: "call_participant_not_eligible" }, 403);
  if (typeof session.room !== "string" || !/^Malachite-[a-f0-9]{32}$/i.test(session.room)) {
    return json({ error: "invalid_call_room" }, 403);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("prenom")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = typeof profile?.prenom === "string" && profile.prenom.trim()
    ? profile.prenom.trim().slice(0, 60)
    : "Membre Malachite";
  const roomName = appId + "/" + session.room;

  try {
    const jwt = await signJaasJwt(appId, keyId, privateKey, session.room, user.id, displayName);
    return json({ jwt, domain: "8x8.vc", roomName, expires_in: 120 });
  } catch (error) {
    console.error("JaaS JWT signing failed", error);
    return json({ error: "secure_call_provider_unavailable" }, 503);
  }
});

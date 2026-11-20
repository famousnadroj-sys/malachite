import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ALLOWED_ORIGIN = "https://famousnadroj-sys.github.io";
const MODEL = Deno.env.get("MALACHITE_AI_MODEL") || "gemini-2.5-flash";
const API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

function json(status: number, body: Record<string, unknown>, origin?: string | null) {
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
  if (origin && origin !== ALLOWED_ORIGIN) return json(403, { error: "origin_not_allowed" }, origin);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    }});
  }
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, origin);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json(401, { error: "authentication_required" }, origin);

  let body: { message?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }, origin); }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 2 || message.length > 2000) return json(400, { error: "invalid_message" }, origin);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(503, { error: "server_configuration_missing" }, origin);

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await userClient.auth.getUser(token);
  if (authError || !auth.user) return json(401, { error: "invalid_session" }, origin);
  const { data: isAdmin, error: adminError } = await userClient.rpc("malachite_ai_manager_is_admin");
  if (adminError || isAdmin !== true) return json(403, { error: "admin_only" }, origin);

  if (!API_KEY) return json(503, { error: "ai_provider_not_configured" }, origin);

  const adminClient = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  const { data: recent, error: rateError } = await adminClient.from("ai_manager_audit")
    .select("id").eq("admin_id", auth.user.id).gte("created_at", cutoff);
  if (rateError) return json(503, { error: "audit_unavailable" }, origin);
  if ((recent || []).length >= 10) return json(429, { error: "rate_limited" }, origin);

  const system = "Tu es Malachite AI Manager, assistant de conseil interne pour l’administrateur d’un site de rencontres. Réponds en français, avec précision et brièveté. Tu n’as aucun accès aux bases de données, comptes, paiements, messages privés ou outils d’action. Ne prétends jamais avoir exécuté une action ni vérifié une donnée que l’administrateur ne t’a pas fournie. N’invente pas de métriques. Pour les sanctions, paiements, contestations et décisions sensibles, recommande une validation humaine. Ne demande jamais de mots de passe, PIN ou OTP.";
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(MODEL) + ":generateContent?key=" + encodeURIComponent(API_KEY);
  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return json(502, { error: "ai_provider_unreachable" }, origin);
  }
  if (!upstream.ok) return json(502, { error: "ai_provider_error", provider_status: upstream.status }, origin);
  const result = await upstream.json();
  const reply = result?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();
  if (!reply) return json(502, { error: "empty_ai_response" }, origin);

  const { error: auditError } = await adminClient.from("ai_manager_audit").insert({
    admin_id: auth.user.id, model: MODEL, status: "success",
    input_chars: message.length, output_chars: reply.length,
  });
  if (auditError) return json(503, { error: "audit_write_failed" }, origin);
  return json(200, { reply, model: MODEL }, origin);
});

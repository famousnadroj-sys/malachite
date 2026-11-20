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

async function countRows(client: any, table: string, column: string, filter?: (q: any) => any) {
  let query = client.from(table).select(column, { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error) throw new Error("metrics_query_failed:" + table);
  return count || 0;
}

async function getOperations(adminClient: any) {
  const specs = [
    ["payments", "paiements", "id,offre,statut,created_at,operateur,admin_reason", "created_at"],
    ["reports", "signalements", "id,motif,created_at,statut", "created_at"],
    ["suspensions", "suspensions", "user_id,depuis,motif", "depuis"],
    ["blocks", "blocages", "user_id,cible,created_at", "created_at"],
    ["reviews", "avis_site", "id,note,categorie,message,created_at", "created_at"],
    ["support", "demandes_support", "id,categorie,sujet,message,statut,created_at", "created_at"],
  ] as const;
  const entries = await Promise.all(specs.map(async ([key, table, columns, orderColumn]) => {
    const { data, error } = await adminClient.from(table).select(columns).order(orderColumn, { ascending: false }).limit(25);
    if (error) throw new Error("operations_query_failed:" + table);
    return [key, data || []] as const;
  }));
  return Object.fromEntries(entries);
}

async function getMetrics(adminClient: any) {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const isoNow = now.toISOString();
  const [members, newMembers, premium, pendingPayments, newReports, openSupport, suspended] = await Promise.all([
    countRows(adminClient, "profiles", "id"),
    countRows(adminClient, "profiles", "id", q => q.gte("created_at", since)),
    countRows(adminClient, "statuts", "user_id", q => q.gt("premium_until", isoNow)),
    countRows(adminClient, "paiements", "id", q => q.eq("statut", "attente")),
    countRows(adminClient, "signalements", "id", q => q.eq("statut", "nouveau")),
    countRows(adminClient, "demandes_support", "id", q => q.in("statut", ["nouveau", "en_cours"])),
    countRows(adminClient, "suspensions", "user_id"),
  ]);
  return {
    members, new_members_7d: newMembers, premium_active: premium,
    pending_payments: pendingPayments, new_reports: newReports,
    open_support: openSupport, suspended_members: suspended,
    ai_ready: Boolean(API_KEY), generated_at: isoNow,
  };
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

  let body: { message?: unknown; action?: unknown; history?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }, origin); }
  const action = body.action === "dashboard" ? "dashboard" : body.action === "operations" ? "operations" : "chat";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (action === "chat" && (message.length < 2 || message.length > 2000)) {
    return json(400, { error: "invalid_message" }, origin);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(503, { error: "server_configuration_missing" }, origin);

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await userClient.auth.getUser(token);
  if (authError || !auth.user) return json(401, { error: "invalid_session" }, origin);
  const { data: isAdmin, error: adminError } = await userClient.rpc("malachite_ai_manager_is_admin");
  if (adminError || isAdmin !== true) return json(403, { error: "admin_only" }, origin);

  const adminClient = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  let metrics: Awaited<ReturnType<typeof getMetrics>>;
  try { metrics = await getMetrics(adminClient); }
  catch { return json(503, { error: "metrics_unavailable" }, origin); }

  if (action === "dashboard") return json(200, { metrics }, origin);
  if (action === "operations") {
    try { return json(200, { operations: await getOperations(adminClient) }, origin); }
    catch { return json(503, { error: "operations_unavailable" }, origin); }
  }
  if (!API_KEY) return json(503, { error: "ai_provider_not_configured", metrics }, origin);

  const cutoff = new Date(Date.now() - 60_000).toISOString();
  const { count: recent, error: rateError } = await adminClient.from("ai_manager_audit")
    .select("id", { count: "exact", head: true })
    .eq("admin_id", auth.user.id).gte("created_at", cutoff);
  if (rateError) return json(503, { error: "audit_unavailable" }, origin);
  if ((recent || 0) >= 10) return json(429, { error: "rate_limited" }, origin);

  const system = [
    "Tu es Malachite AI Manager, copilote de gestion du site de rencontres Malachite.",
    "Réponds en français, de façon concise, professionnelle, élégante et orientée décisions.",
    "Voici les seuls indicateurs opérationnels fournis par le serveur, en données agrégées et sans identifiants personnels : " + JSON.stringify(metrics),
    "Utilise exclusivement ces chiffres comme faits. Si une donnée manque, dis-le. N'invente jamais de tendance, revenu, incident ou activité.",
    "Tu peux préparer des briefings, expliquer les priorités, proposer des procédures de vérification des paiements, classer les risques de signalements, aider au support, suggérer des améliorations produit et préparer des plans de croissance.",
    "Tu n'as aucun accès aux messages privés, aux pièces justificatives, aux profils individuels ni à des outils d'action. Ne prétends jamais avoir modifié le site, traité un paiement, contacté un membre ou suspendu un compte.",
    "Toute sanction, décision financière, réponse officielle, modification de compte ou action irréversible doit être examinée et validée manuellement par l'administrateur.",
    "Ne demande jamais de mots de passe, codes OTP, PIN, clés API ou données personnelles sensibles. Signale les limites et donne des étapes concrètes."
  ].join(" ");

  const conversation = Array.isArray(body.history) ? body.history.slice(-8).filter((item: any) => item && (item.role === "user" || item.role === "model") && typeof item.text === "string").map((item: any) => ({ role: item.role, parts: [{ text: item.text.slice(0, 2000) }] })) : [];
  conversation.push({ role: "user", parts: [{ text: message }] });

  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(MODEL) + ":generateContent?key=" + encodeURIComponent(API_KEY);
  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: conversation,
        generationConfig: { temperature: 0.25, maxOutputTokens: 900 },
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch { return json(502, { error: "ai_provider_unreachable" }, origin); }
  if (!upstream.ok) return json(502, { error: "ai_provider_error", provider_status: upstream.status }, origin);
  const result = await upstream.json();
  const reply = result?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();
  if (!reply) return json(502, { error: "empty_ai_response" }, origin);

  const { error: auditError } = await adminClient.from("ai_manager_audit").insert({
    admin_id: auth.user.id, model: MODEL, status: "success",
    input_chars: message.length, output_chars: reply.length,
  });
  if (auditError) return json(503, { error: "audit_write_failed" }, origin);
  return json(200, { reply, model: MODEL, metrics }, origin);
});
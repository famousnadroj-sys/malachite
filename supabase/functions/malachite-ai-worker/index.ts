import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MODEL = Deno.env.get("MALACHITE_AI_MODEL") || "gemini-2.5-flash";
const AI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const AI_AUTONOMY_ENABLED = Deno.env.get("MALACHITE_AI_AUTONOMY_ENABLED") === "true";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function countRows(client: any, table: string, column: string, filter?: (q: any) => any) {
  let query = client.from(table).select(column, { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error) throw new Error("metrics_query_failed:" + table);
  return count || 0;
}

async function collectMetrics(client: any) {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const isoNow = now.toISOString();
  const [members, newMembers, premium, pendingPayments, newReports, openSupport, suspended] =
    await Promise.all([
      countRows(client, "profiles", "id"),
      countRows(client, "profiles", "id", q => q.gte("created_at", since)),
      countRows(client, "statuts", "user_id", q => q.gt("premium_until", isoNow)),
      countRows(client, "paiements", "id", q => q.eq("statut", "attente")),
      countRows(client, "signalements", "id", q => q.eq("statut", "nouveau")),
      countRows(client, "demandes_support", "id", q => q.in("statut", ["nouveau", "en_cours"])),
      countRows(client, "suspensions", "user_id"),
    ]);
  return {
    generated_at: isoNow,
    members,
    new_members_7d: newMembers,
    premium_active: premium,
    payments_waiting_human_review: pendingPayments,
    new_reports_waiting_review: newReports,
    open_support_requests: openSupport,
    suspended_accounts: suspended,
  };
}

async function generateBriefing(metrics: Record<string, unknown>, previous: Record<string, unknown> | null) {
  if (!AI_KEY) throw new Error("gemini_key_not_configured");
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(MODEL) + ":generateContent?key=" + encodeURIComponent(AI_KEY);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text:
        "Tu es l'agent de supervision opérationnelle de Malachite. Rédige un bref rapport en français, factuel et exploitable. Tu ne disposes que de statistiques agrégées. N'invente aucun fait. Tu peux signaler les points à surveiller et proposer des actions, mais tu ne prétends jamais les avoir exécutées. Les paiements, sanctions, suppressions, changements de compte, remboursements et décisions juridiques restent soumis à validation humaine. Ne demande et ne révèle aucune donnée personnelle."
      }] },
      contents: [{ role: "user", parts: [{ text:
        "Indicateurs actuels (agrégés) : " + JSON.stringify(metrics) +
        "\nIndicateurs précédents : " + JSON.stringify(previous || {}) +
        "\nPrépare un rapport : état général, évolutions réellement observables, priorités et limites des données."
      }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("gemini_http_" + response.status);
  const data = await response.json();
  const summary = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();
  if (!summary) throw new Error("empty_ai_response");
  return summary;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json(503, { error: "server_configuration_missing" });

  // Verify a short-lived HMAC signed in Postgres. The Vault key is never exposed to this
  // function or placed in pg_net's request queue.
  const timestamp = req.headers.get("x-mal-timestamp") || "";
  const signature = req.headers.get("x-mal-signature") || "";
  const bodyText = await req.text();
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authorized, error: authError } = await admin.rpc(
    "verify_malachite_ai_worker_signature",
    { p_timestamp: timestamp, p_body: bodyText, p_signature: signature },
  );
  if (authError || authorized !== true) return json(401, { error: "unauthorized" });

  let trigger: "cron" | "manual" = "cron";
  try {
    const body = JSON.parse(bodyText || "{}");
    if (body?.trigger === "manual") trigger = "manual";
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const started = Date.now();
  const { data: run, error: runError } = await admin.from("ai_ops_runs")
    .insert({ trigger_source: trigger, status: "failed" })
    .select("id")
    .single();
  if (runError || !run) return json(503, { error: "run_record_unavailable" });

  try {
    const metrics = await collectMetrics(admin);
    let summary: string | null = null;
    let model: string | null = null;
    let status: "success" | "partial" = "success";
    let errorCode: string | null = null;

    // Polling is inexpensive; generation is capped at one briefing per six hours.
    if (AI_AUTONOMY_ENABLED && AI_KEY) {
      const { data: previousSummary, error: previousError } = await admin.from("ai_ops_runs")
        .select("started_at,metrics")
        .not("summary", "is", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (previousError) throw new Error("previous_run_query_failed");
      const lastSummaryAt = previousSummary?.started_at ? new Date(previousSummary.started_at).getTime() : 0;
      if (Date.now() - lastSummaryAt >= 6 * 60 * 60 * 1000) {
        try {
          summary = await generateBriefing(metrics, previousSummary?.metrics || null);
          model = MODEL;
        } catch (error) {
          status = "partial";
          errorCode = error instanceof Error ? error.message.slice(0, 120) : "ai_generation_failed";
        }
      }
    } else if (AI_AUTONOMY_ENABLED && !AI_KEY) {
      status = "partial";
      errorCode = "gemini_key_not_configured";
    }

    const { error: updateError } = await admin.from("ai_ops_runs").update({
      finished_at: new Date().toISOString(),
      status,
      metrics,
      summary,
      model,
      error_code: errorCode,
      duration_ms: Date.now() - started,
    }).eq("id", run.id);
    if (updateError) throw new Error("run_update_failed");
    return json(200, {
      ok: true,
      run_id: run.id,
      status,
      metrics,
      summary,
      ai_generation_enabled: AI_AUTONOMY_ENABLED,
      next_ai_briefing_window_hours: 6,
      duration_ms: Date.now() - started,
    });
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.slice(0, 120) : "worker_failed";
    await admin.from("ai_ops_runs").update({
      finished_at: new Date().toISOString(),
      status: "failed",
      error_code: errorCode,
      duration_ms: Date.now() - started,
    }).eq("id", run.id);
    return json(503, { error: "worker_failed", run_id: run.id, code: errorCode });
  }
});

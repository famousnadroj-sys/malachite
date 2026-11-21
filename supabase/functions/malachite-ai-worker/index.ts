import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CONFIGURED_MODEL = Deno.env.get("MALACHITE_AI_MODEL") || "";
const MODEL = CONFIGURED_MODEL.startsWith("gemini-2.5-") ? "gemini-3.5-flash-lite" : (CONFIGURED_MODEL || "gemini-3.5-flash-lite");
const AI_KEY = Deno.env.get("GEMINI_API_KEY") || "";

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


async function synchronizeAlerts(admin: any, metrics: Record<string, unknown>) {
  const rules = [
    { key: "pending_payments", count: Number(metrics.payments_waiting_human_review || 0), severity: "warning", title: "Paiements en attente de vérification" },
    { key: "new_reports", count: Number(metrics.new_reports_waiting_review || 0), severity: "critical", title: "Signalements nécessitant un examen" },
    { key: "open_support", count: Number(metrics.open_support_requests || 0), severity: "info", title: "Demandes de support ouvertes" },
  ] as const;
  for (const rule of rules) {
    if (rule.count > 0) {
      const { error } = await admin.from("malachite_ai_alerts").upsert({
        alert_key: rule.key, severity: rule.severity, title: rule.title,
        details: { count: rule.count }, status: "open",
        last_seen_at: new Date().toISOString(), resolved_at: null,
      }, { onConflict: "alert_key" });
      if (error) throw new Error("alert_upsert_failed:" + rule.key);
    } else {
      const { error } = await admin.from("malachite_ai_alerts").update({
        status: "resolved", resolved_at: new Date().toISOString(),
      }).eq("alert_key", rule.key).eq("status", "open");
      if (error) throw new Error("alert_resolve_failed:" + rule.key);
    }
  }
}


async function synchronizeReviewQueue(admin: any) {
  const specs = [
    { table: "paiements", filter: (q: any) => q.eq("statut", "attente"), type: "payment_review", title: "Vérifier un paiement en attente", risk: "high" },
    { table: "signalements", filter: (q: any) => q.eq("statut", "nouveau"), type: "report_review", title: "Examiner un nouveau signalement", risk: "high" },
    { table: "demandes_support", filter: (q: any) => q.in("statut", ["nouveau", "en_cours"]), type: "support_review", title: "Examiner une demande de support", risk: "medium" },
  ];
  for (const spec of specs) {
    const { data, error } = await spec.filter(admin.from(spec.table).select("id").limit(100));
    if (error) throw new Error("review_queue_source_failed:" + spec.table);
    for (const row of data || []) {
      const { error: upsertError } = await admin.from("malachite_ai_review_queue").upsert({
        task_key: spec.type + ":" + String(row.id), task_type: spec.type,
        record_id: String(row.id), title: spec.title, risk_level: spec.risk,
        status: "awaiting_human", updated_at: new Date().toISOString(),
        details: { source: spec.table },
      }, { onConflict: "task_key", ignoreDuplicates: true });
      if (upsertError) throw new Error("review_queue_write_failed:" + spec.table);
    }
  }
}


async function prepareReviewTasks(admin: any) {
  const { data: tasks, error } = await admin.from("malachite_ai_review_queue")
    .select("id,task_type,record_id,title,risk_level,status,details")
    .eq("status","awaiting_human").limit(100);
  if (error) throw new Error("review_queue_read_failed");
  let prepared = 0;
  for (const task of tasks || []) {
    const current = task.details && typeof task.details === "object" ? task.details : {};
    if (current.automation && current.automation.prepared_at) continue;
    let recommendation = "Vérification manuelle requise avant toute décision.";
    let draft: string | null = null;
    if (task.task_type === "payment_review") {
      recommendation = "Comparer la référence et le montant avec la confirmation officielle de l’opérateur. Ne pas activer Premium sur la seule base d’une capture.";
    } else if (task.task_type === "report_review") {
      recommendation = "Examiner le signalement et les éléments disponibles dans l’interface de modération. Ne pas sanctionner automatiquement.";
    } else if (task.task_type === "support_review") {
      const { data: ticket, error: ticketError } = await admin.from("demandes_support")
        .select("categorie").eq("id", Number(task.record_id)).maybeSingle();
      if (ticketError) throw new Error("support_ticket_read_failed");
      const category = String(ticket?.categorie || "").toLowerCase();
      if (category.includes("compte")) draft = "Bonjour, merci d’avoir contacté le support Malachite. Nous examinons votre demande concernant votre compte et reviendrons vers vous dès que possible.";
      else if (category.includes("paiement") || category.includes("premium")) draft = "Bonjour, merci pour votre message. Nous vérifions les informations de votre paiement ou abonnement. Merci de ne pas partager votre PIN, mot de passe ni code OTP.";
      else draft = "Bonjour, merci d’avoir contacté le support Malachite. Votre demande a bien été prise en compte et sera examinée par notre équipe.";
      recommendation = "Brouillon préparé automatiquement. Relire et envoyer manuellement depuis le support; aucune réponse n’a été envoyée au membre.";
    }
    const automation = { prepared_at: new Date().toISOString(), recommendation, response_draft: draft, executed_by: "malachite-ai-worker", execution: "draft_only" };
    const { error: updateError } = await admin.from("malachite_ai_review_queue")
      .update({ details: { ...current, automation }, updated_at: new Date().toISOString() })
      .eq("id", task.id).eq("status","awaiting_human");
    if (updateError) throw new Error("review_task_prepare_failed");
    prepared++;
  }
  return prepared;
}


async function executeApprovedSupportDrafts(admin: any) {
  const { data: tasks, error } = await admin.from("malachite_ai_review_queue")
    .select("id,record_id,details").eq("task_type","support_review").eq("status","approved").limit(50);
  if (error) throw new Error("approved_support_tasks_read_failed");
  let completed = 0;
  for (const task of tasks || []) {
    const details = task.details && typeof task.details === "object" ? task.details : {};
    const automation = details.automation && typeof details.automation === "object" ? details.automation : {};
    const draft = typeof automation.response_draft === "string" ? automation.response_draft.trim() : "";
    if (!draft) throw new Error("approved_support_draft_missing");
    const { error: ticketError } = await admin.from("demandes_support")
      .update({ reponse_admin: draft, statut: "en_cours" })
      .eq("id", Number(task.record_id)).in("statut", ["nouveau","en_cours"]);
    if (ticketError) throw new Error("support_draft_save_failed");
    const { error: taskError } = await admin.from("malachite_ai_review_queue")
      .update({ status: "completed", updated_at: new Date().toISOString(),
        details: { ...details, automation: { ...automation, execution: "draft_saved_to_support", executed_at: new Date().toISOString(), note: "Brouillon enregistré dans le dossier support; non envoyé au membre." } } })
      .eq("id", task.id).eq("status","approved");
    if (taskError) throw new Error("approved_support_task_finalize_failed");
    completed++;
  }
  return completed;
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
    const { data: autonomySetting, error: settingError } = await admin.from("malachite_ai_settings")
      .select("ai_briefings_enabled").eq("id", 1).maybeSingle();
    if (settingError) throw new Error("autonomy_settings_unavailable");
    const briefingEnabled = autonomySetting?.ai_briefings_enabled === true;
    const metrics = await collectMetrics(admin);
    await synchronizeAlerts(admin, metrics);
    await synchronizeReviewQueue(admin);
    const executedSupportDrafts = await executeApprovedSupportDrafts(admin);
    const preparedTasks = await prepareReviewTasks(admin);
    const metricsWithQueue = { ...metrics, review_tasks_prepared: preparedTasks, support_drafts_executed: executedSupportDrafts };
    const metricsWithQueue = { ...metrics, review_tasks_prepared: preparedTasks };
    let summary: string | null = null;
    let model: string | null = null;
    let status: "success" | "partial" = "success";
    let errorCode: string | null = null;

    // Polling is inexpensive; generation is capped at one briefing per six hours.
    if (briefingEnabled && AI_KEY) {
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
          summary = await generateBriefing(metricsWithQueue, previousSummary?.metrics || null);
          model = MODEL;
        } catch (error) {
          status = "partial";
          errorCode = error instanceof Error ? error.message.slice(0, 120) : "ai_generation_failed";
        }
      }
    } else if (briefingEnabled && !AI_KEY) {
      status = "partial";
      errorCode = "gemini_key_not_configured";
    }

    const { error: updateError } = await admin.from("ai_ops_runs").update({
      finished_at: new Date().toISOString(),
      status,
      metrics: metricsWithQueue,
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
      metrics: metricsWithQueue,
      summary,
      ai_generation_enabled: briefingEnabled && Boolean(AI_KEY),
      ai_key_configured: Boolean(AI_KEY),
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

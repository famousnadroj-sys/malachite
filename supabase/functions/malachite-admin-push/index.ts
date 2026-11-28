import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const ALLOWED_ORIGIN = "https://famousnadroj-sys.github.io";
const VAPID_SUBJECT = "https://famousnadroj-sys.github.io/malachite/";
const json = (status: number, body: Record<string, unknown>, origin?: string | null) => {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin" };
  if (origin === ALLOWED_ORIGIN) headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
  return new Response(JSON.stringify(body), { status, headers });
};
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== ALLOWED_ORIGIN) return json(403, { error: "origin_not_allowed" }, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-malachite-hook",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400", "Vary": "Origin"
  }});
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, origin);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !anon || !service) return json(503, { error: "server_configuration_missing" }, origin);
  const adminClient = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }, origin); }

  // Database webhook: only announces a new pending payment. It never validates or activates it.
  if (req.headers.has("x-malachite-hook")) {
    const supplied = req.headers.get("x-malachite-hook") || "";
    const { data: secrets, error: secretError } = await adminClient.rpc("get_malachite_push_secrets");
    const expected = String(secrets?.malachite_push_hook || "");
    if (secretError || !supplied || supplied.length > 256 || !expected || !safeEqual(supplied, expected)) {
      return json(401, { error: "invalid_internal_hook" }, origin);
    }
    if (body.action === "payment") {
      const paymentId = Number(body.payment_id);
      if (!Number.isSafeInteger(paymentId) || paymentId <= 0) return json(400, { error: "invalid_payment_id" }, origin);
      const { data: queued, error: queuedError } = await adminClient.from("admin_push_queue")
        .select("payment_id").eq("payment_id", paymentId).is("delivered_at", null).maybeSingle();
      if (queuedError) return json(503, { error: "payment_queue_lookup_failed" }, origin);
      if (!queued) return json(200, { ok: true, sent: 0, queued: 0, reason: "already_delivered_or_not_queued" }, origin);
      const { data: subscriptions, error: subsError } = await adminClient.from("admin_push_subscriptions")
        .select("id,endpoint,p256dh,auth_key").is("revoked_at", null);
      if (subsError) return json(503, { error: "subscriptions_lookup_failed" }, origin);
      if (!subscriptions?.length) return json(200, { ok: true, sent: 0, queued: 1, reason: "no_registered_devices" }, origin);
      const publicKey = String(secrets.malachite_vapid_public || "");
      const privateKey = String(secrets.malachite_vapid_private || "");
      if (!publicKey || !privateKey) return json(503, { error: "vapid_keys_missing" }, origin);
      webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
      const payload = JSON.stringify({
        title: "Nouveau paiement Malachite",
        body: "Une nouvelle demande de paiement vient d’être soumise. Ouvre Malachite pour la vérifier.",
        tag: "malachite-payment-" + paymentId,
        url: "./",
        payment_id: paymentId
      });
      let sent = 0, removed = 0, failed = 0;
      await Promise.all(subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, payload, { TTL: 180, urgency: "high" });
          sent++;
        } catch (error: any) {
          const status = Number(error?.statusCode || 0);
          if (status === 404 || status === 410) {
            await adminClient.from("admin_push_subscriptions").delete().eq("id", sub.id);
            removed++;
          } else {
            failed++;
            console.error("Push payment delivery failed", status || "unknown");
          }
        }
      }));
      if (sent > 0) {
        await adminClient.from("admin_push_queue").update({ delivered_at: new Date().toISOString() })
          .eq("payment_id", paymentId).is("delivered_at", null);
      }
      return json(200, { ok: true, sent, removed, failed, queued: sent > 0 ? 0 : 1 }, origin);
    }
    if (body.action !== "drain") return json(400, { error: "unknown_internal_action" }, origin);
    const { data: batch, error: batchError } = await adminClient.from("admin_push_queue")
      .select("payment_id").is("delivered_at", null).order("created_at", { ascending: true }).limit(5000);
    if (batchError) return json(503, { error: "push_queue_lookup_failed" }, origin);
    if (!batch?.length) return json(200, { ok: true, sent: 0, queued: 0 }, origin);
    const { data: subscriptions, error: subsError } = await adminClient.from("admin_push_subscriptions")
      .select("id,endpoint,p256dh,auth_key").is("revoked_at", null);
    if (subsError) return json(503, { error: "subscriptions_lookup_failed" }, origin);
    if (!subscriptions?.length) return json(200, { ok: true, sent: 0, queued: batch.length, reason: "no_registered_devices" }, origin);
    const publicKey = String(secrets.malachite_vapid_public || "");
    const privateKey = String(secrets.malachite_vapid_private || "");
    if (!publicKey || !privateKey) return json(503, { error: "vapid_keys_missing" }, origin);
    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
    const payload = JSON.stringify({
      title: "Paiements Malachite à vérifier",
      body: batch.length + " nouveau(x) paiement(s) attend(ent) ta vérification. Ouvre Malachite pour les traiter.",
      tag: "malachite-pending-payments",
      url: "./",
      pending_count: batch.length
    });
    let sent = 0, removed = 0, failed = 0;
    await Promise.all(subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, payload, { TTL: 180, urgency: "high" });
        sent++;
      } catch (error: any) {
        const status = Number(error?.statusCode || 0);
        if (status === 404 || status === 410) {
          await adminClient.from("admin_push_subscriptions").delete().eq("id", sub.id);
          removed++;
        } else {
          failed++;
          console.error("Push delivery failed", status || "unknown");
        }
      }
    }));
    if (sent > 0) {
      await adminClient.from("admin_push_queue").update({ delivered_at: new Date().toISOString() })
        .in("payment_id", batch.map((row: any) => row.payment_id)).is("delivered_at", null);
    }
    return json(200, { ok: true, sent, removed, failed, queued: batch.length }, origin);
  }

  // Device registration/removal: requires a live administrator session on that device.
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json(401, { error: "authentication_required" }, origin);
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: auth, error: authError } = await userClient.auth.getUser(token);
  if (authError || !auth.user) return json(401, { error: "invalid_session" }, origin);
  const { data: isAdmin, error: adminError } = await userClient.rpc("malachite_ai_manager_is_admin");
  if (adminError || isAdmin !== true) return json(403, { error: "admin_only" }, origin);

  if (body.action === "test") {
    const { data: secrets, error: secretError } = await adminClient.rpc("get_malachite_push_secrets");
    if (secretError || !secrets?.malachite_vapid_public || !secrets?.malachite_vapid_private) return json(503, { error: "vapid_keys_missing" }, origin);
    const { data: devices, error: devicesError } = await adminClient.from("admin_push_subscriptions")
      .select("id,endpoint,p256dh,auth_key").eq("admin_user_id", auth.user.id).is("revoked_at", null);
    if (devicesError) return json(503, { error: "subscriptions_lookup_failed" }, origin);
    if (!devices?.length) return json(409, { error: "no_registered_devices" }, origin);
    webpush.setVapidDetails(VAPID_SUBJECT, String(secrets.malachite_vapid_public), String(secrets.malachite_vapid_private));
    const payload = JSON.stringify({ title: "Test Malachite réussi", body: "Les alertes de paiement sont actives sur cet appareil.", tag: "malachite-push-test-" + Date.now(), url: "./" });
    let sent = 0, failed = 0;
    await Promise.all(devices.map(async (device: any) => {
      try { await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth_key } }, payload, { TTL: 60, urgency: "normal" }); sent++; }
      catch (error: any) {
        const status = Number(error?.statusCode || 0);
        if (status === 404 || status === 410) await adminClient.from("admin_push_subscriptions").delete().eq("id", device.id);
        else { failed++; console.error("Push test delivery failed", status || "unknown"); }
      }
    }));
    return json(200, { ok: true, sent, failed }, origin);
  }

  const action = body.action;
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (action === "subscribe") {
    const subscription = body.subscription as any;
    const ep = typeof subscription?.endpoint === "string" ? subscription.endpoint : "";
    const p256dh = typeof subscription?.keys?.p256dh === "string" ? subscription.keys.p256dh : "";
    const authKey = typeof subscription?.keys?.auth === "string" ? subscription.keys.auth : "";
    try { if (new URL(ep).protocol !== "https:") throw new Error("https_required"); } catch { return json(400, { error: "invalid_endpoint" }, origin); }
    if (!p256dh || !authKey || ep.length > 2048) return json(400, { error: "invalid_subscription" }, origin);
    const label = typeof body.device_label === "string" ? body.device_label.slice(0, 80) : "Appareil";
    const { error } = await adminClient.from("admin_push_subscriptions").upsert({
      admin_user_id: auth.user.id, endpoint: ep, p256dh, auth_key: authKey,
      device_label: label || "Appareil", last_seen_at: new Date().toISOString(), revoked_at: null
    }, { onConflict: "endpoint" });
    if (error) return json(503, { error: "subscription_save_failed" }, origin);
    return json(200, { ok: true, registered: true }, origin);
  }
  if (action === "unsubscribe") {
    const subscriptionId = typeof body.subscription_id === "string" ? body.subscription_id : "";
    if (!endpoint && !subscriptionId) return json(400, { error: "subscription_identifier_required" }, origin);
    let query = adminClient.from("admin_push_subscriptions").delete().eq("admin_user_id", auth.user.id);
    query = subscriptionId ? query.eq("id", subscriptionId) : query.eq("endpoint", endpoint);
    const { error } = await query;
    if (error) return json(503, { error: "subscription_remove_failed" }, origin);
    return json(200, { ok: true, removed: true }, origin);
  }
  if (action === "status") {
    const { data: devices, error } = await adminClient.from("admin_push_subscriptions")
      .select("id,device_label,created_at,last_seen_at").eq("admin_user_id", auth.user.id)
      .is("revoked_at", null).order("last_seen_at", { ascending: false });
    if (error) return json(503, { error: "subscription_status_failed" }, origin);
    return json(200, { ok: true, registered_devices: devices?.length || 0, devices: devices || [] }, origin);
  }
  return json(400, { error: "unknown_action" }, origin);
});
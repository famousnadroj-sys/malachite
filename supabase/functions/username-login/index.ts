import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://famousnadroj-sys.github.io";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Vary": "Origin",
};
function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
function keyFromEnv(modern: string, legacy: string): string {
  const raw = Deno.env.get(modern);
  if (raw) {
    try { const parsed = JSON.parse(raw); if (parsed.default) return parsed.default; }
    catch { return raw; }
  }
  return Deno.env.get(legacy) ?? "";
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== ALLOWED_ORIGIN) return reply(403, { error: "origin_not_allowed" });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Méthode non autorisée." });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const secret = keyFromEnv("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  const publishable = keyFromEnv("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  if (!url || !secret || !publishable) return reply(503, { error: "Service temporairement indisponible." });
  let body: { username?: string; password?: string; action?: string };
  try { body = await req.json(); } catch { return reply(400, { error: "Requête invalide." }); }
  const username = String(body.username ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return reply(400, { error: "Nom d’utilisateur invalide." });

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  if (body.action === "check") {
    const checkIp = req.headers.get("cf-connecting-ip")?.trim();
    if (!checkIp) return reply(503, { error: "Protection anti-abus indisponible." });
    const checkHash = await sha256("username-check:" + checkIp);
    const checkThrottle = await admin.rpc("consume_username_login_attempt", {
      p_ip_hash: checkHash,
      p_window_seconds: 60,
      p_max_attempts: 60,
    });
    if (checkThrottle.error || typeof checkThrottle.data !== "boolean") {
      return reply(503, { error: "Protection anti-abus indisponible." });
    }
    if (!checkThrottle.data) return reply(429, { error: "Trop de vérifications. Réessaie dans une minute." });
    const found = await admin.from("login_names").select("user_id").ilike("username", username).maybeSingle();
    if (found.error) return reply(503, { error: "Vérification indisponible." });
    let callerId: string | null = null;
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token && token !== publishable) {
      const caller = await admin.auth.getUser(token);
      callerId = caller.data.user?.id ?? null;
    }
    return reply(200, { available: !found.data || found.data.user_id === callerId });
  }

  const password = String(body.password ?? "");
  if (!password || password.length > 256) return reply(400, { error: "Identifiants incorrects." });
  // Trust only Cloudflare's edge-provided client IP. Never fall back to
  // caller-controlled forwarding headers, which would let clients spoof the key.
  const ip = req.headers.get("cf-connecting-ip")?.trim();
  if (!ip) return reply(503, { error: "Protection anti-abus indisponible." });
  const ipHash = await sha256(ip);
  const throttle = await admin.rpc("consume_username_login_attempt", {
    p_ip_hash: ipHash,
    p_window_seconds: 900,
    p_max_attempts: 15,
  });
  if (throttle.error || typeof throttle.data !== "boolean") {
    return reply(503, { error: "Protection anti-abus indisponible." });
  }
  if (!throttle.data) {
    return reply(429, { error: "Trop de tentatives. Réessaie dans 15 minutes." });
  }
  // Opportunistic cleanup; a cleanup failure must not weaken the rate limit.
  await admin.from("username_login_attempts")
    .delete()
    .lt("attempted_at", new Date(Date.now() - 86400000).toISOString());

  const match = await admin.from("login_names").select("user_id").ilike("username", username).maybeSingle();
  if (match.error || !match.data?.user_id) return reply(400, { error: "Nom d’utilisateur ou mot de passe incorrect." });
  const account = await admin.auth.admin.getUserById(match.data.user_id);
  const email = account.data.user?.email;
  if (account.error || !email) return reply(400, { error: "Nom d’utilisateur ou mot de passe incorrect." });
  const client = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session) return reply(400, { error: "Nom d’utilisateur ou mot de passe incorrect." });
  return reply(200, { session: signed.data.session });
});
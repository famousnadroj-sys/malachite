import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
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
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ??
    (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const ipHash = await sha256(ip || "unknown");
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const rate = await admin.from("username_login_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("attempted_at", since);
  if (rate.error) return reply(503, { error: "Service temporairement indisponible." });
  if ((rate.count ?? 0) >= 15) return reply(429, { error: "Trop de tentatives. Réessaie dans 15 minutes." });
  const logged = await admin.from("username_login_attempts").insert({ ip_hash: ipHash });
  if (logged.error) return reply(503, { error: "Service temporairement indisponible." });
  await admin.from("username_login_attempts").delete().lt("attempted_at", new Date(Date.now() - 86400000).toISOString());

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
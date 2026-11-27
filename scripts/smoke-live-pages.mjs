import process from "node:process";

const siteUrl = process.env.SITE_URL || "https://famousnadroj-sys.github.io/malachite/";
const expectedCache = process.env.EXPECTED_LIVE_CACHE || "malachite-static-v110";
const expectedCallsAsset = process.env.EXPECTED_LIVE_CALLS_ASSET || "calls.js?v=20261126-secure-offers-v4";
const base = new URL(siteUrl);
if (base.protocol !== "https:") throw new Error("The public MALACHITE site must use HTTPS.");
if (!base.pathname.endsWith("/")) base.pathname += "/";

async function get(path, expected) {
  const url = new URL(path, base);
  let lastError;
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const body = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      if (expected && !body.includes(expected)) throw new Error(`Expected live marker missing at ${url}: ${expected}`);
      console.log(`OK ${response.status} ${url.pathname}`);
      return body;
    } catch (error) {
      lastError = error;
      if (attempt < 12) await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  throw lastError;
}

const html = await get("", "Match · aperçu");
if (!/<title>Malachite/i.test(html)) throw new Error("Unexpected public page title.");
if (html.includes("MALACHITE · ENVIRONNEMENT DE TEST") || html.includes("sbawknyxcjslvhknomkd")) {
  throw new Error("Staging marker or staging project reference leaked into the public page.");
}

const app = await get("app-core.js", "https://tscsmemsvgacqioncash.supabase.co");
if (app.includes("sbawknyxcjslvhknomkd")) throw new Error("Staging Supabase reference leaked into production JavaScript.");

if (!html.includes("./" + expectedCallsAsset)) throw new Error("Public homepage is not referencing the expected call-client asset.");
await get("sw.js", expectedCache);
const calls = await get(expectedCallsAsset, "performance.now()");
if (calls.includes("localStorage.getItem('mal_photo_cache:'") ||
    calls.includes("localStorage.setItem('mal_photo_cache:'")) {
  throw new Error("Live call client still persists expiring signed photo URLs.");
}
await get("manifest.webmanifest", '"display"');
await get("icons/malachite.svg", "<svg");
await get("robots.txt", "Sitemap:");
await get("sitemap.xml", "<urlset");

console.log("MALACHITE LIVE PAGES CHECK PASSED: published homepage, production backend reference, signed-photo cache client, " + expectedCache + ", manifest, icon and SEO files verified over HTTPS.");

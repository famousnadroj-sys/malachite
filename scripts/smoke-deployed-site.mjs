import process from "node:process";

const siteUrl = process.env.SITE_URL;
if (!siteUrl) throw new Error("SITE_URL is required from the GitHub Pages deployment output.");

const base = new URL(siteUrl);
if (base.protocol !== "https:") throw new Error("The deployed site must use HTTPS.");
if (!base.pathname.endsWith("/")) base.pathname += "/";

async function get(path, expectedText = null) {
  const url = new URL(path, base);
  let response;
  let body = "";
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      body = await response.text();
      if (response.ok && (!expectedText || body.includes(expectedText))) break;
    } catch (error) {
      if (attempt === 5) throw error;
    }
    if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!response?.ok) throw new Error(`HTTP ${response?.status ?? "network error"} for ${url}`);
  if (expectedText && !body.includes(expectedText)) {
    throw new Error(`Expected deployed content not found at ${url}: ${expectedText}`);
  }
  console.log(`OK ${response.status} ${url.pathname}`);
  return body;
}

const productionHtml = await get("", "MALACHITE");
if (!productionHtml.includes("offres payantes prévues au lancement")) {
  throw new Error("La page d'accueil doit présenter les offres comme prévues, pas comme déjà actives.");
}
if (productionHtml.includes("MALACHITE · ENVIRONNEMENT DE TEST") ||
    productionHtml.includes("sbawknyxcjslvhknomkd")) {
  throw new Error("Staging content or configuration leaked into the production page.");
}

const productionAssets = [
  ["app-core.js", "https://tscsmemsvgacqioncash.supabase.co"],
  ["calls.js", "JitsiMeetExternalAPI"],
  ["sw.js", "malachite-static-v"],
  ["manifest.webmanifest", '"display"'],
  ["icons/malachite.svg", "<svg"],
  ["i18n.js", "LANGS"],
  ["malachite-ai.js", "malAiLoadDashboard"],
  ["malachite-performance.js", "mal-low-power"],
  ["malachite-chat-ui.js", "function matchBox()"],
  ["malachite-avatar-ui.js", "function malAvatarSvg"],
  ["malachite-founder-finance.js", "installFinanceDashboard"],
];
for (const [path, marker] of productionAssets) await get(path, marker);

const discoveryHtml = await get("decouvrir.html", "Pass Appels");
for (const retiredValue of ["2 $", "0,50 $", "1 $", "Pour 30 jours", "Pour 24 heures", "Pour 7 jours"]) {
  if (discoveryHtml.includes(retiredValue)) {
    throw new Error(`Un tarif ou une durée non approuvés sont encore publiés : ${retiredValue}`);
  }
}
await get("404.html", "ERREUR 404");
const sitemap = await get("sitemap.xml", "<urlset");
if (sitemap.includes("partenaires.html")) {
  throw new Error("La page Partenaires retirée est encore présente dans le sitemap public.");
}

const previewHtml = await get("preview/", "MALACHITE · ENVIRONNEMENT DE TEST");
if (!/<meta\s+name="robots"\s+content="noindex,nofollow">/i.test(previewHtml)) {
  throw new Error("La prévisualisation de test doit porter une balise noindex.");
}
await get("robots.txt", "Disallow: /preview/");
if (previewHtml.includes("tscsmemsvgacqioncash") ||
    previewHtml.includes("sb_publishable_XDpqSzsPNeVduv6aGyjuoA_suakeFN0")) {
  throw new Error("Production Supabase configuration leaked into the Match preview HTML.");
}
const previewCore = await get("preview/app-core.js", "sbawknyxcjslvhknomkd.supabase.co");
if (previewCore.includes("tscsmemsvgacqioncash") ||
    previewCore.includes("sb_publishable_XDpqSzsPNeVduv6aGyjuoA_suakeFN0")) {
  throw new Error("Production Supabase configuration leaked into the Match preview JavaScript.");
}
await get("preview/sw.js", "malachite-match-preview-static-v1");
await get("preview/manifest.webmanifest", '"display"');
await get("preview/icons/malachite.svg", "<svg");

console.log("MALACHITE deployed-site smoke checks passed for production and isolated Match preview.");

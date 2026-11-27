import process from "node:process";

const siteUrl = process.env.SITE_URL;
if (!siteUrl) throw new Error("SITE_URL is required from the GitHub Pages deployment output.");

const base = new URL(siteUrl);
const localSmoke = base.hostname === "127.0.0.1" || base.hostname === "localhost";
if (base.protocol !== "https:" && !localSmoke) throw new Error("The deployed site must use HTTPS.");
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

const appCore = await get("app-core.js", "rpc('update_my_preferences'");
if (appCore.includes("from('config').select('cle,valeur')")) {
  throw new Error("Payment destination numbers must not be loaded into the public browser.");
}
const calls = await get("calls.js", "var CALL_PROVIDER_ENABLED=false;");
const avatarUi = await get("malachite-avatar-ui.js", "function malPaymentPanel()");
const offerUi = await get("malachite-user-experience.js", "Paiements temporairement suspendus");
for (const retiredValue of [
  "Premium — 2 USD / mois",
  "Boost — 0,50 USD / 24 h",
  "+243 993 315 532",
  "+243 848 775 992",
]) {
  if ([appCore,calls,avatarUi,offerUi].some(content => content.includes(retiredValue))) {
    throw new Error(`Un prix non approuvé ou un ancien numéro de paiement est encore publié : ${retiredValue}`);
  }
}
if (!avatarUi.includes("if(!airtel&&!orange)") ||
    !avatarUi.includes("Les paiements sont temporairement suspendus") ||
    !offerUi.includes("N’effectue aucun transfert")) {
  throw new Error("Payment intake must fail closed until the owner confirms the launch settings.");
}
if (!calls.includes("var CALL_PROVIDER_ENABLED=false") ||
    !calls.includes("if(!CALL_PROVIDER_ENABLED)") ||
    !calls.includes("if(typeof oldMatch==='function')window.matchBox=oldMatch;") ||
    !calls.includes("if(typeof oldThread==='function')window.thread=oldThread;") ||
    calls.includes('onclick="call(&quot;audio&quot;)')) {
  throw new Error("Call controls must stay unavailable until the secure provider is configured.");
}

const discoveryHtml = await get("decouvrir.html", "Pass Appels");
for (const retiredValue of ["2 $", "0,50 $", "Pour 30 jours", "Pour 24 heures"]) {
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
const robotsTxt = await get("robots.txt", "Sitemap:");
if (/Disallow:\s*\/preview\//i.test(robotsTxt)) {
  throw new Error("The preview must remain crawlable so search engines can read its noindex directive.");
}
if (previewHtml.includes("tscsmemsvgacqioncash") ||
    previewHtml.includes("sb_publishable_XDpqSzsPNeVduv6aGyjuoA_suakeFN0")) {
  throw new Error("Production Supabase configuration leaked into the Match preview HTML.");
}
const previewCore = await get("preview/app-core.js", "sbawknyxcjslvhknomkd.supabase.co");
if (!previewCore.includes("function matchExperience")) {
  throw new Error("Le preview doit charger le parcours Match isolé.");
}
if (previewCore.includes("tscsmemsvgacqioncash") ||
    previewCore.includes("sb_publishable_XDpqSzsPNeVduv6aGyjuoA_suakeFN0")) {
  throw new Error("Production Supabase configuration leaked into the Match preview JavaScript.");
}
await get("preview/sw.js", "malachite-match-preview-static-v1");
await get("preview/manifest.webmanifest", '"display"');
await get("preview/icons/malachite.svg", "<svg");

console.log("MALACHITE deployed-site smoke checks passed for production and isolated Match preview.");

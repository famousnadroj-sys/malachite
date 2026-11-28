import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const html = fs.readFileSync('index.html', 'utf8');
const migrationFiles = fs.readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql'));
const migrationVersions = new Map();
for (const file of migrationFiles) {
  const match = file.match(/^(\d{12,14})_/);
  if (!match) throw new Error('Supabase migration filename must start with a 12–14 digit version: ' + file);
  if (migrationVersions.has(match[1])) {
    throw new Error('Duplicate Supabase migration version ' + match[1] + ': ' + migrationVersions.get(match[1]) + ' and ' + file);
  }
  migrationVersions.set(match[1], file);
}
for (const asset of ['./app-core.js', './calls.js?v=20261127-jaas-dynamic-gate-v1']) {
  const marker = '<link rel="preload" as="script" href="' + asset + '"';
  const matches = html.split(marker).length - 1;
  if (matches !== 1) throw new Error('Critical app module must be preloaded exactly once: ' + asset);
}
if (!html.includes('href="./app-core.js" fetchpriority="high"') ||
    !html.includes('href="./calls.js?v=20261127-jaas-dynamic-gate-v1" fetchpriority="low"')) {
  throw new Error('App core must preload at high priority and calls at low priority without competing with startup.');
}
const frontendFiles = ['app-core.js', 'malachite-avatar-ui.js', 'malachite-chat-ui.js', 'malachite-avatar-helper.js', 'malachite-living-engine.js', 'malachite-premium-profiles.js'];
const frontendScripts = frontendFiles.map((file) => fs.readFileSync(file, 'utf8'));
const frontend = [html, ...frontendScripts].join('\n');
for (const [index, source] of frontendScripts.entries()) {
  const temp = path.join(os.tmpdir(), 'malachite-deferred-' + index + '.js');
  fs.writeFileSync(temp, source);
  const js = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
  if (js.status !== 0) {
    process.stderr.write(js.stderr || js.stdout);
    process.exit(js.status || 1);
  }
}

const requiredFrontend = [
  "profiles').select('id,username,prenom,age",
  "rpc('update_my_preferences',{p_preferences:pr})",
  "from('chat-media').upload",
  "from('profile-photos').upload",
  "createSignedUrl",
  "functions.invoke('admin-user-moderation'",
  'function mascotHint()',
  "persistSession:true",
  "function malStartupView()",
  "malAvatarPanel()+blockedPanel()+",
  "avatar:avatarForSave",
  "mal-discover-avatar",
  'manifest.webmanifest',
  '@media(min-width:760px)',
];
for (const item of requiredFrontend) {
  if (!frontend.includes(item)) throw new Error('Frontend requirement missing: ' + item);
}
if (frontend.includes("profiles').select('*')")) throw new Error('Public profile query must not select private columns.');
if (!frontend.includes("insert({de:me.id,profil:id,motif:motif})")) throw new Error('Report must include the authenticated reporter id.');
if ((frontend.match(/storage\.from\('photos'\)\.upload/g) || []).length) throw new Error('New uploads must not use the legacy public photos bucket.');
if (/service[_-]?role|sb_secret_/i.test(html)) throw new Error('Privileged Supabase credentials must never appear in browser code.');
if (frontend.includes('contact_interdit')) throw new Error('Private message content must not be scanned to block contact details.');
if (!frontend.includes('id="malachite-chat-layout-v9"') || !frontend.includes('body.mal-chat-mode .chtop:before') || !frontend.includes('body.mal-chat-mode .mal-call-head')) throw new Error('Premium chat v9 styles are missing.');
if (!frontend.includes('id="mal-chat-fullscreen-restore-v2"') ||
    !frontend.includes('body.mal-chat-mode>header,body.mal-chat-mode>nav{display:none!important}') ||
    !frontend.includes('body.mal-chat-mode main#v{position:fixed!important;inset:0!important') ||
    !frontend.includes('body.mal-chat-mode .sendbar{position:relative!important') ||
    !frontend.includes('body.mal-chat-mode .sendbar .chat-composer #mi{display:block!important') ||
    !frontend.includes('body.mal-chat-mode .sendbar .chat-composer .chat-tool,body.mal-chat-mode .sendbar .chat-composer .chat-send{display:inline-flex!important')) {
  throw new Error('Full-screen conversation, text input and media controls must remain visible and usable.');
}
if (!frontend.includes('function persistMalView()') || !frontend.includes('function restoreMalView()')) {
  throw new Error('Chat navigation must survive a same-tab refresh.');
}
if (!frontend.includes('function sendSticker(emoji)') || !frontend.includes('m.media_type==="document"')) {
  throw new Error('Chat stickers and document rendering must remain available.');
}
if (!frontend.includes('createSignedUrl(path,3600,{download:true})')) {
  throw new Error('Private document downloads must use signed download URLs.');
}
if (frontend.includes('timer=setInterval(loadChat,4000)')) {
  throw new Error('Chat polling must not run every four seconds.');
}
if (!frontend.includes('target===me.id')) {
  throw new Error('Self-conversations must be blocked before message inserts.');
}


const serviceWorker = fs.readFileSync('sw.js', 'utf8');
const navigationStart = serviceWorker.indexOf('if (request.mode === "navigate") {');
const navigationEnd = serviceWorker.indexOf('const staticPaths', navigationStart);
const navigationSource = navigationStart >= 0 && navigationEnd > navigationStart ? serviceWorker.slice(navigationStart, navigationEnd) : '';
if (!navigationSource.includes('const cachedPage = cachePromise.then') ||
    navigationSource.indexOf('event.waitUntil(networkPage.then(() => undefined))') < 0 ||
    navigationSource.indexOf('event.waitUntil(networkPage.then(() => undefined))') > navigationSource.indexOf('event.respondWith(')) {
  throw new Error('Navigation cache refresh must be registered before respondWith and remain inside the fetch event lifetime.');
}
if (!serviceWorker.includes('cache.match(request, { ignoreSearch: true })') ||
    !serviceWorker.includes('const refresh = fetch(request)') ||
    !serviceWorker.includes('cache.put(request, response.clone())') ||
    !serviceWorker.includes('event.waitUntil(refresh.then(() => undefined))')) {
  throw new Error('Static assets must refresh their cache in the background while serving cached files immediately.');
}
if (!serviceWorker.includes('(auth|rest|storage|functions)') || !serviceWorker.includes('url.pathname')) {
  throw new Error('Supabase API and private data requests must stay outside the static asset cache.');
}
const serviceWorkerTemp = path.join(os.tmpdir(), 'malachite-sw.js');
fs.writeFileSync(serviceWorkerTemp, serviceWorker);
const serviceWorkerCheck = spawnSync(process.execPath, ['--check', serviceWorkerTemp], { encoding: 'utf8' });
if (serviceWorkerCheck.status !== 0) {
  process.stderr.write(serviceWorkerCheck.stderr || serviceWorkerCheck.stdout);
  process.exit(serviceWorkerCheck.status || 1);
}
const chatMediaPatch = fs.readFileSync('app-core.js', 'utf8');
const patchMediaStart = chatMediaPatch.indexOf('function patchMessageMedia(rows){');
const patchMediaEnd = chatMediaPatch.indexOf('async function resolveMessageMedia', patchMediaStart);
const patchMediaSource = patchMediaStart >= 0 && patchMediaEnd > patchMediaStart ? chatMediaPatch.slice(patchMediaStart, patchMediaEnd) : '';
if (!patchMediaSource.includes('new Map()') || !patchMediaSource.includes('nodeById.set') || !patchMediaSource.includes('indexById.set') || patchMediaSource.includes('Array.from(box.querySelectorAll')) {
  throw new Error('Chat media patching must index visible message nodes and message positions once, not rescan the DOM per photo.');
}
if (!frontend.includes("msgs.length-4") || !frontend.includes("fetchpriority") || !frontend.includes("Chargement de la photo")) {
  throw new Error('Recent conversation photos must load eagerly with high priority and show a loading state.');
}
const discoveryStart = frontend.indexOf('function discoverCard(p){');
const discoveryEnd = frontend.indexOf('function home()', discoveryStart);
const discoverySource = discoveryStart >= 0 && discoveryEnd > discoveryStart ? frontend.slice(discoveryStart, discoveryEnd) : '';
if (!discoverySource.includes('class="mal-discover-cover"') ||
    !discoverySource.includes('loading="lazy"') ||
    !discoverySource.includes('decoding="async"') ||
    discoverySource.includes('background-image:url(')) {
  throw new Error('Discovery profile photos must use native lazy-loaded images rather than eager CSS backgrounds.');
}
const i18n = fs.readFileSync('i18n.js', 'utf8');
const i18nTemp = path.join(os.tmpdir(), 'malachite-i18n.js');
fs.writeFileSync(i18nTemp, i18n);
const i18nCheck = spawnSync(process.execPath, ['--check', i18nTemp], { encoding: 'utf8' });
if (i18nCheck.status !== 0) {
  process.stderr.write(i18nCheck.stderr || i18nCheck.stdout);
  process.exit(i18nCheck.status || 1);
}
for (const item of ['<script src="i18n.js" defer></script>', 'option value="en"', 'avatar-builder.html', 'function openMalAvatarBuilder(forSignup)', "a.type==='humanforge-3d'"]) {
  if (!frontend.includes(item)) throw new Error('Personalization/avatar requirement missing: ' + item);
}
if (!frontend.includes("openMalAvatarBuilder(true)") || !frontend.includes('malAttachPendingSignupAvatar') || !frontend.includes('malachite-pending-avatar:')) throw new Error('Signup 3D avatar flow is incomplete.');
const avatarBuilder = fs.readFileSync('avatar-builder.html', 'utf8');
if (!avatarBuilder.includes("textureSize:'512'") || !avatarBuilder.includes("type:'ready'") || !(avatarBuilder.includes('HumanCanvas') || avatarBuilder.includes('AvatarCanvas')) || !avatarBuilder.includes('createHumanEditor') || !avatarBuilder.includes('HumanForge') && !avatarBuilder.includes('humanforge@0.8.1') || !avatarBuilder.includes('malachite-avatar-builder')) {
  throw new Error('Realistic 3D avatar builder integration is incomplete.');
}
const avatarStart = avatarBuilder.indexOf('<script type="module">');
const avatarEnd = avatarBuilder.indexOf('</script>', avatarStart);
if (avatarStart < 0 || avatarEnd < 0 || avatarBuilder.indexOf('<script type="module">', avatarStart + 1) >= 0) throw new Error('3D avatar builder module is missing.');
const avatarTemp = path.join(os.tmpdir(), 'malachite-avatar-builder.mjs');
fs.writeFileSync(avatarTemp, avatarBuilder.slice(avatarStart + '<script type="module">'.length, avatarEnd));
const avatarCheck = spawnSync(process.execPath, ['--check', avatarTemp], { encoding: 'utf8' });
if (avatarCheck.status !== 0) { process.stderr.write(avatarCheck.stderr || avatarCheck.stdout); process.exit(avatarCheck.status || 1); }
for (const item of ['LANGS', "'Découvrir':'Discover'", 'window.malAvatarSvg', 'window.malSaveAvatar', 'MutationObserver']) {
  if (!i18n.includes(item)) throw new Error('Localization/avatar requirement missing: ' + item);
}

const calls = fs.readFileSync('calls.js', 'utf8');
const callsTemp = path.join(os.tmpdir(), 'malachite-calls.js');
fs.writeFileSync(callsTemp, calls);
const callsCheck = spawnSync(process.execPath, ['--check', callsTemp], { encoding: 'utf8' });
if (callsCheck.status !== 0) {
  process.stderr.write(callsCheck.stderr || callsCheck.stdout);
  process.exit(callsCheck.status || 1);
}
if (!calls.includes('performance.now()') ||
    !calls.includes("localStorage.removeItem('mal_photo_cache:'") ||
    calls.includes("localStorage.getItem('mal_photo_cache:'") ||
    calls.includes("localStorage.setItem('mal_photo_cache:'")) {
  throw new Error('Signed photo URLs must not persist in localStorage or depend on the device wall clock.');
}
if (frontend.includes('<script src="calls.js" defer></script>') || !frontend.includes('core.onload=function(){') || !frontend.includes('calls.src="./calls.js?v=20261127-jaas-dynamic-gate-v1"')) throw new Error('Call client must load only after app-core has defined its functions.');
if (calls.includes("me.email==='famousnadroj@gmail.com'") ||
    calls.includes('me.email==="famousnadroj@gmail.com"') ||
    !calls.includes("sb.rpc('malachite_ai_manager_is_admin')") ||
    !calls.includes('function stopPaymentRealtime()') ||
    !calls.includes('if(adminPaymentUserId&&(!next||next.id!==adminPaymentUserId))stopPaymentRealtime()')) {
  throw new Error('Admin payment realtime must use the database admin role and clear its subscription when the session identity changes.');
}
if (calls.includes('window.call=callsUnavailable') ||
    calls.includes('window.startCallInbox=function(){return false}') ||
    !calls.includes('window.call=function(mode){return startCall(mode||\'audio\')}') ||
    !calls.includes('refreshCallProviderStatus(true)') ||
    !calls.includes("functions.invoke('malachite-jaas-token'") ||
    !calls.includes("new JitsiMeetExternalAPI('8x8.vc'") ||
    calls.includes('meet.jit.si') ||
    calls.includes("h=h.replace('<button disabled title=")) {
  throw new Error('Calls must use the dynamic authenticated JaaS status gate, retain server-side fail-closed checks, and never use public Jitsi.');
}
for (const item of [
  "Premium <span>2 $ / 30 jours</span>",
  "Premium — 2 USD / 30 jours (appels dès réactivation du service sécurisé)",
  'id="malReceipt"',
  "malSubmitPayment({offer:offer.value,code:code,operator:network,file:proof.files[0]})",
]) {
  if (!calls.includes(item)) throw new Error('Secure calls/payment override requirement missing: ' + item);
}
const callPassGuard = fs.readFileSync('supabase/migrations/20261126150000_pause_call_pass_sales_until_jaas_activation.sql', 'utf8');
if (!calls.includes("var callOption=CALL_PROVIDER_ENABLED&&!premiumActive?") ||
    !calls.includes('var paymentSection=(NUM||ORANGE)') ||
    !calls.includes('if(!NUM&&!ORANGE)') ||
    !calls.includes('Paiements temporairement suspendus') ||

    !calls.includes('Le Pass Appels est temporairement indisponible') ||
    !callPassGuard.includes("secure_call_provider_not_configured") ||
    !callPassGuard.includes("before insert or update of offre, statut on public.paiements")) {
  throw new Error('Unavailable call passes must be hidden in the client and blocked at the database boundary.');
}
const jaasIssuer = fs.readFileSync('supabase/functions/malachite-jaas-token/index.ts', 'utf8');
if (!jaasIssuer.includes('npm:@supabase/supabase-js@2.45.4') ||
    !jaasIssuer.includes('authClient.auth.getUser()') ||
    !jaasIssuer.includes('call_session_token_eligible') ||
    !jaasIssuer.includes('session.status !== "accepted"') ||
    !jaasIssuer.includes('exp: expiresAt') ||
    !jaasIssuer.includes('Math.min(now + 120, sessionExpiry)') ||
    !jaasIssuer.includes('call_session_expiring') ||
    !jaasIssuer.includes('sub: appId') ||
    !jaasIssuer.includes('room: roomName') ||
    !jaasIssuer.includes('room: { regex: false }') ||
    !jaasIssuer.includes('signJaasJwt(appId, keyId, privateKey, session.room, user.id, displayName, tokenExpiry)') ||
    !jaasIssuer.includes('const roomName = appId + "/" + session.room;') ||
    jaasIssuer.includes('room: "*"') ||
    jaasIssuer.includes('regex: true')) {
  throw new Error('JaaS JWT must authenticate the user and be limited to their accepted, unexpired exact room.');
}
const providerConfigRls = fs.readFileSync('supabase/migrations/20261127214441_reassert_call_provider_config_rls.sql', 'utf8');
if (!providerConfigRls.includes('enable row level security') || !providerConfigRls.includes('revoke all privileges')) {
  throw new Error('Private JaaS provider configuration must remain RLS-enabled and inaccessible to client roles.');
}
const acceptedCallWindow = fs.readFileSync('supabase/migrations/20261127214023_extend_accepted_call_window.sql', 'utf8');
const acceptedCallWindowTest = fs.readFileSync('supabase/tests/call_provider_fail_closed_checks.sql', 'utf8');
if (!acceptedCallWindow.includes("interval '60 minutes'") ||
    !acceptedCallWindow.includes('invalid_accepted_call_window') ||
    !acceptedCallWindowTest.includes('accepted_call_must_receive_60_minute_window')) {
  throw new Error('Accepted JaaS calls must receive a bounded active window and a regression test.');
}
if (calls.includes("Premium <span>3 $ / 30 jours</span>") ||
    calls.includes("Premium — 3 USD / 30 jours") ||
    calls.includes("sb.from('paiements').insert(payload)")) {
  throw new Error('Calls offer override must not show the old price or bypass the shared receipt workflow.');
}
if (!calls.includes("select('id,offre,statut,created_at,reviewed_at,admin_reason,operateur')") ||
    calls.includes('au plus tard sous 2 heures') ||
    calls.includes('réponse visée sous deux heures')) {
  throw new Error('Payment history must show the actual operator and must not promise an unverified review SLA.');
}
for (const item of ['online(targetProfile)', 'malAcceptCall', 'malRejectCall', "executeCommand('toggleAudio')", "executeCommand('toggleVideo')", 'setAudioOutputDevice', 'startInbox']) {
  if (!calls.includes(item)) throw new Error('Call feature requirement missing: ' + item);
}

const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
if (manifest.start_url !== './' || manifest.scope !== './' || manifest.display !== 'standalone') {
  throw new Error('PWA manifest configuration is incomplete.');
}
if (!frontend.includes("createSignedUrls(paths,3600)") || !frontend.includes("profilePhotoSignedCache") || !frontend.includes("if(tab==='me')draw(true)")) {
  throw new Error('Own profile images must be signed in batches and rendered as soon as the profile is ready.');
}
if (!frontend.includes('fetchpriority="high"') || !frontend.includes('mal-own-cover-image')) {
  throw new Error('Own profile hero/avatar images must be prioritized for immediate display.');
}
const copilots = fs.readFileSync('malachite-copilots.js', 'utf8');
const copilotsTemp = path.join(os.tmpdir(), 'malachite-copilots.js');
fs.writeFileSync(copilotsTemp, copilots);
const copilotsCheck = spawnSync(process.execPath, ['--check', copilotsTemp], { encoding: 'utf8' });
if (copilotsCheck.status !== 0) { process.stderr.write(copilotsCheck.stderr || copilotsCheck.stdout); process.exit(copilotsCheck.status || 1); }
for (const item of ['malachite-copilots.js', 'Malachite Pulse', 'AutoCare', 'Malachite Command']) {
  if (!frontend.includes(item) && !copilots.includes(item)) throw new Error('Copilot module requirement missing: ' + item);
}
const serviceWorkerEarly = fs.readFileSync('sw.js', 'utf8');
if (!frontend.includes('function malLoadAdminModules()') ||
    !frontend.includes('./malachite-copilots.js') ||
    serviceWorkerEarly.includes('./malachite-copilots.js') ||
    !serviceWorkerEarly.includes('malachite-static-v88')) {
  throw new Error('Copilot module must be loaded on demand and excluded from the initial PWA shell.');
}

if (!copilots.includes('mode simulation') || !copilots.includes('Finance, Guardian, Support, Intelligence et Creative')) {
  throw new Error('Malachite autonomous mission simulation must coordinate all copilot specialties.');
}

const aiManager = fs.readFileSync('malachite-ai.js', 'utf8');
for (const item of ['malAiLoadDashboard', 'malAiInsights', 'malAiQuickPrompt', 'malachite-ai-manager', 'history.slice(-9,-1)']) {
  if (!aiManager.includes(item)) throw new Error('AI Manager dashboard capability missing: ' + item);
}
const adCreativeFunction = fs.readFileSync('supabase/functions/malachite-ad-creative/index.ts', 'utf8');
if (!adCreativeFunction.includes('advertising_generation_disabled') || !adCreativeFunction.includes('respond(410,')) {
  throw new Error('Retired advertising endpoint must reject requests with HTTP 410.');
}
const adminUi = fs.readFileSync('malachite-avatar-ui.js', 'utf8');
if (adminUi.includes("malAdminPage==='campaigns'") || adminUi.includes("from('campagnes')") || adminUi.includes('📢 Publicité')) {
  throw new Error('Advertising management must not remain available in the admin UI.');
}
const notificationUi = fs.readFileSync('malachite-user-experience.js', 'utf8');
if (notificationUi.includes('value="promotion"') || notificationUi.includes("['promotion','Publicités']")) {
  throw new Error('Promotional announcement category must not be offered at launch.');
}
const adminPushFunction = fs.readFileSync('supabase/functions/malachite-admin-push/index.ts', 'utf8');
if (!adminPushFunction.includes('!supplied') || !adminPushFunction.includes('!expected') || !adminPushFunction.includes('supplied.length > 256')) {
  throw new Error('Internal push hook must fail closed for missing or oversized secrets.');
}
const performanceGuard = fs.readFileSync('malachite-performance.js', 'utf8');
if (!performanceGuard.includes('mal-low-power') || !performanceGuard.includes('navigator.deviceMemory') || !performanceGuard.includes('connection.saveData')) {
  throw new Error('Low-power devices must use the lightweight visual mode.');
}


if (!frontend.includes('async function resolveProfilePhotosBatch(profiles)') ||
    !frontend.includes('Signature groupée des photos de profil') ||
    !frontend.includes('await Promise.all([othersPhotos,loadRdv(),loadAns(),loadMyAvis()])') ||
    !frontend.includes("if(tab==='home'||tab==='search')draw(true);")) {
  throw new Error('Discovery must render before the grouped profile-photo signing finishes.');
}
if (frontend.includes("if(t==='me'&&mine&&me){var uid=me.id,target=mine;resolveProfilePhotos(target)") ||
    !frontend.includes("Les photos personnelles sont déjà résolues une seule fois par load()")) {
  throw new Error('Moi tab must not start a duplicate profile-photo signing request.');
}
const appCore = frontendScripts[0];
if (appCore.includes("['founder','📊','Projet']") ||
    appCore.includes('founder:founderDashboard') ||
    appCore.includes('malFounderLandingDone')) {
  throw new Error('The confusing Projet tab and automatic founder landing must remain removed from the member navigation.');
}

if (!appCore.includes("if(keepWarmCache){sub();return;}")) throw new Error('Warm profile cache must avoid repeat full profile reloads.');
if (!appCore.includes('var malLoadInFlight=null,malLoadInFlightUid=null;') || !appCore.includes('if(malLoadInFlight&&malLoadInFlightUid===uid)return malLoadInFlight;')) throw new Error('Profile reloads must be deduplicated while a tab switch is in flight.');
if (appCore.includes("load().then(draw)")) throw new Error('Tab navigation must not trigger a redundant full render after the immediate draw.');
if (!appCore.includes('var needsLoad=!me||loadedUid!==me.id||!profs.length||Date.now()-profilesLoadedAt>=300000;')) throw new Error('Tab navigation must reuse the five-minute profile cache.');
if (!appCore.includes("if(tab!=='chat'&&!msgRealtimeReady)")) throw new Error('Message polling must be fallback-only when realtime is unavailable.');
if (!appCore.includes('setInterval(poll,120000)') || !appCore.includes('setInterval(beat,120000)')) throw new Error('Background polling must use reduced intervals.');
if (!performanceGuard.includes('html.mal-low-power *{animation:none!important')) throw new Error('Low-power devices must disable costly visual effects.');

const sw = fs.readFileSync('sw.js', 'utf8');
const swTemp = path.join(os.tmpdir(), 'malachite-sw.js');
fs.writeFileSync(swTemp, sw);
const swCheck = spawnSync(process.execPath, ['--check', swTemp], { encoding: 'utf8' });
if (swCheck.status !== 0) {
  process.stderr.write(swCheck.stderr || swCheck.stdout);
  process.exit(swCheck.status || 1);
}
if (!sw.includes('malachite-static-v62')) throw new Error('Static cache version must remain versioned.');
if (!sw.includes('Serve the cached app shell immediately') || !sw.includes('networkPage.then')) throw new Error('Navigation must serve cached app shell immediately and refresh it in the background.');
for (const asset of ['app-core.js','malachite-avatar-ui.js','malachite-chat-ui.js','malachite-avatar-helper.js','malachite-living-engine.js','malachite-premium-profiles.js']) if (!sw.includes(asset)) throw new Error('Deferred application asset missing from service-worker cache: '+asset);
if (!sw.includes('storage') || !sw.includes('Authorization')) throw new Error('Service worker must bypass Supabase private APIs.');
if (!frontend.includes("if(f.size>50*1024*1024){setChatUploadStatus('Vidéo trop lourde : 50 Mo maximum par vidéo.');clear();return}") || !frontend.includes('chunkSize:6*1024*1024') || !frontend.includes('async function uploadChatAsset')) throw new Error('Chat video upload must support 50 MB files through resumable TUS uploads.');
if (!frontend.includes("navigator.serviceWorker.addEventListener('controllerchange'") ||
    !frontend.includes("id='malSwUpdateNotice'") ||
    !frontend.includes("window.location.reload()")) {
  throw new Error('Existing PWA clients must be prompted to refresh after an app update.');
}

const migrations = fs.readdirSync('supabase/migrations')
  .filter((name) => name.endsWith('.sql'))
  .map((name) => fs.readFileSync(path.join('supabase/migrations', name), 'utf8'))
  .join('\n');
for (const item of [
  'private.admin_moderate_user',
  'public.moderate_user',
  'profile-photos',
  'private.is_blocked_with(new.a)',
  'count(distinct m.a)',
]) {
  if (!migrations.includes(item)) throw new Error('Database hardening migration missing: ' + item);
}

const usernameLoginFunction = fs.readFileSync('supabase/functions/username-login/index.ts', 'utf8');
const usernameThrottleMigration = fs.readFileSync('supabase/migrations/20261126210000_atomic_username_login_throttle.sql', 'utf8').toLowerCase().replace(/\s+/g, ' ');
for (const item of [
  'consume_username_login_attempt',
  'pg_advisory_xact_lock',
  'p_window_seconds',
  'p_max_attempts',
  'revoke all on function public.consume_username_login_attempt(text, integer, integer)',
  'grant execute on function public.consume_username_login_attempt(text, integer, integer) to service_role',
]) {
  if (!usernameThrottleMigration.includes(item)) throw new Error('Atomic username throttle migration requirement missing: ' + item);
}
if (!usernameLoginFunction.includes('const checkIp = req.headers.get("cf-connecting-ip")?.trim()') ||
    !usernameLoginFunction.includes('sha256("username-check:" + checkIp)') ||
    !usernameLoginFunction.includes('p_window_seconds: 60') ||
    !usernameLoginFunction.includes('p_max_attempts: 60') ||
    !usernameLoginFunction.includes('const ip = req.headers.get("cf-connecting-ip")?.trim()') ||
    !usernameLoginFunction.includes('p_window_seconds: 900') ||
    !usernameLoginFunction.includes('p_max_attempts: 15') ||
    usernameLoginFunction.includes('x-forwarded-for') ||
    usernameLoginFunction.includes('x-real-ip')) {
  throw new Error('Username checks and login must use separate atomic throttles and only the trusted edge IP header, failing closed when it is absent.');
}

const moderationFunction = fs.readFileSync('supabase/functions/admin-user-moderation/index.ts', 'utf8');
for (const item of [
  'auth.getUser(token)',
  'auth.admin.updateUserById',
  'SUPABASE_SERVICE_ROLE_KEY',
  'moderate_user',
  'cannot_moderate_admin',
]) {
  if (!moderationFunction.includes(item)) throw new Error('Admin moderation security check missing: ' + item);
}
if (moderationFunction.includes('ADMIN_EMAIL')) throw new Error('Admin identity must come from the private database allow-list.');
if (!frontend.includes('function openConv(id){if(!id||!me)return;')) throw new Error('Conversation entry handler missing.');
if (!frontend.includes("persistMalView();draw(true);loadChat();timer=setInterval(function(){if(tab==='chat'&&open&&!document.hidden&&!msgRealtimeReady)loadChat()},30000)")) throw new Error('Conversation must render immediately and use a 30-second fallback only when Realtime is unavailable.');
if (!frontend.includes('if(firstLoad){\n    msgs=msgs.concat(fresh)')) throw new Error('Initial messages must render in the conversation.');
if (!frontend.includes('resolveMessagesMedia(priorityMedia).then(function()') || !frontend.includes('var deferredMedia=firstLoad?mediaRows.slice(0,-12):[]')) throw new Error('Recent chat media must be prioritized and older media resolved in the background.');
if (!frontend.includes("Promise.all([sb.from('avis_match').select('ok')")) throw new Error('Conversation match checks must run concurrently.');
if (!frontend.includes("sb.channel('msgs-'+me.id)")) throw new Error('Per-user Realtime message updates must remain enabled.');
if (!frontend.includes('async function resolveMessagesMedia(rows)') || !frontend.includes("createSignedUrls(paths,3600)")) throw new Error('Chat media URLs must be resolved in batches.');
if (!frontend.includes("filter:'a=eq.'+me.id") || !frontend.includes("filter:'de=eq.'+me.id")) throw new Error('Realtime messages must be filtered to the signed-in user.');
if (!frontend.includes("preload=\"none\"")) throw new Error('Chat videos must not preload all media data.');
if (!frontend.includes('async function loadOlderMessages()')) throw new Error('Chat history must load older messages incrementally.');
if (!frontend.includes("setInterval(poll,120000)")) throw new Error('Background message polling must not overload the chat view.');
if (!frontend.includes("if(tab!=='chat'&&!msgRealtimeReady){\n   var query=sb.from('messages')") || !frontend.includes('messageTask=query')) throw new Error('Realtime chat must avoid duplicate full message polling.');
if (!frontend.includes("chatLoadBusyKeys[key]")) throw new Error('Opening another chat must not wait for a different conversation request.');
if (!frontend.includes("appendChatRows([temp])") || !frontend.includes("pendingNode.replaceWith(holder.firstElementChild)")) throw new Error('Sending text must not redraw and interrupt media playback.');
if (!frontend.includes("String(m.display_url).indexOf('blob:')===0")) throw new Error('Uploaded local media previews must still be replaced with private signed URLs.');
if (frontend.includes("sb.channel('msgs').on('postgres_changes'")) throw new Error('Unfiltered global message realtime subscriptions are forbidden.');
if (!frontend.includes("if(t=='chat'){loadChat();timer=setInterval(function(){if(tab==='chat'&&!document.hidden&&!msgRealtimeReady)loadChat()},30000);if(open)return}")) throw new Error('Chat navigation must load messages and use a conditional fallback sync.');
if (!frontend.includes("id=\"chatSendError\"")) throw new Error('Message errors must update without rebuilding the conversation.');
const insertChatStart = frontend.indexOf('async function insertChatMessage');
const insertChatEnd = frontend.indexOf('async function snd()', insertChatStart);
if (insertChatStart < 0 || insertChatEnd < 0 || frontend.slice(insertChatStart, insertChatEnd).includes('draw(true)')) throw new Error('Sending a message must not rebuild the chat DOM.');
if (!frontend.includes("catch(error){if(localPreview)m.display_url=localPreview;throw error}")) throw new Error('Failed signing must not discard the local media preview.');
if (!frontend.includes('function receiptMarkup(m,pending)') || !frontend.includes('function markIncomingReceipts(rows,asRead)')) throw new Error('Message delivery and read receipt UI is missing.');
const bubbleStarts = [];
let bubbleSearch = 0;
while ((bubbleSearch = frontend.indexOf('function bub(m,i)', bubbleSearch)) !== -1) { bubbleStarts.push(bubbleSearch); bubbleSearch += 1; }
if (bubbleStarts.length < 2) throw new Error('Expected chat bubble implementations were not found.');
const activeBubble = frontend.slice(bubbleStarts[bubbleStarts.length - 1], frontend.indexOf('async function sendVideo', bubbleStarts[bubbleStarts.length - 1]));
if (!activeBubble.includes('receiptMarkup(m,pending)')) throw new Error('The active chat bubble renderer must display delivery/read indicators.');
if (!frontend.includes('body.mal-chat-mode .m .msg-status svg')) throw new Error('Message status icons must have visible chat-scoped styling.');
if (!frontend.includes('aria-label="Envoyé"') || !frontend.includes('aria-label="Reçu"') || !frontend.includes('aria-label="Lu"') || !frontend.includes('aria-label="En attente d’envoi"')) throw new Error('All four message status states must be accessible.');
if (!frontend.includes("table:'message_receipts'") || !frontend.includes('function handleReceiptEvent(payload)')) throw new Error('Realtime message receipt updates are missing.');
if (!frontend.includes("markIncomingReceipts(incoming,document.visibilityState==='visible')")) throw new Error('Opening a conversation must record delivery and read state.');
if (!frontend.includes("msg-status read") || !frontend.includes("aria-label=\"Lu\"")) throw new Error('Read receipts must be visibly distinct from delivered receipts.');
if (!migrations.includes('message_receipts') || !migrations.includes('recipient marks read') || !migrations.includes('revoke all on public.message_receipts')) throw new Error('Secure message receipt migrations are missing.');
if (!migrations.includes('avatar=case when p_profile ?') || !migrations.includes('profile_private,avatar')) throw new Error('Profile avatar persistence migration is missing.');
if (frontend.includes('Ajoute une photo de profil avant d’enregistrer.')) throw new Error('Profile creation must allow a saved avatar instead of requiring a photo.');
if (!frontend.includes('cache.expiresAt=now+3500000')) throw new Error('Signed media URL cache must refresh its expiry after renewal.');
if (!frontend.includes("Signature des médias de la conversation ('+bucket+')")) throw new Error('Media URL resolution must isolate failures by storage bucket.');
if (!sw.match(/malachite-static-v[0-9]+/) || !sw.includes('./calls.js') || sw.includes('./malachite-ad-studio.js')) throw new Error('Service worker must cache a versioned app shell including the call client and exclude retired ad-studio assets.');
if (!frontend.includes("status==='SUBSCRIBED'")) throw new Error('Realtime recovery must immediately resync the active conversation after reconnect.');
if (!frontend.includes("timer=setInterval(function(){if(tab==='chat'&&!document.hidden&&!msgRealtimeReady)loadChat()},30000)")) throw new Error('Fallback chat sync must pause while hidden and run only when Realtime is unavailable.');
if (!frontend.includes("sb.channel('malachite-online-v1'")) throw new Error('Realtime online presence channel is missing.');
if (!frontend.includes('function refreshPresenceUI()') || !frontend.includes('function trackPresence()')) throw new Error('Online presence synchronization is missing.');
if (!frontend.includes("on('broadcast',{event:'typing'}")) throw new Error('Realtime typing indicators are missing.');
if (!frontend.includes('oninput="setTyping()"') || !frontend.includes('class="chat-typing"')) throw new Error('Typing indicator UI and composer hook are missing.');
if (!frontend.includes('class="conv-avatar" onclick="event.stopPropagation();viewProf')) throw new Error('Conversation avatar must open the immersive member profile.');
if (!frontend.includes('async function viewProf(id,startIndex)') || !frontend.includes("window.malOpenProfile=async function(id,startIndex)") || !frontend.includes("layer.className='mal-profile-viewer'")) throw new Error('Immersive profile viewer must remain available.');
if (!frontend.includes('href="https://famousnadroj-sys.github.io/malachite/preview/"') || !frontend.includes('Ouvrir la prévisualisation Match')) throw new Error('Founder dashboard must open the isolated Match preview, not production.');

const appCoreSource = fs.readFileSync('app-core.js', 'utf8');
if (appCoreSource.includes("ADM='famousnadroj@gmail.com'") || appCoreSource.includes('me.email===ADM') || appCoreSource.includes('me.email!==ADM') || appCoreSource.includes('me.email==ADM')) throw new Error('Admin UI must not use a client-side email allow-list.');
if (!appCoreSource.includes("sb.rpc('malachite_ai_manager_is_admin')") || !appCoreSource.includes('malAdminAuthorized')) throw new Error('Admin UI must derive access from the database authorization RPC.');

if (frontend.includes('Aucun changement Match n’a été appliqué à la base de production') || frontend.includes('Code préparé, pas encore publié')) throw new Error('Founder dashboard must not claim Match is absent from production.');
if (!frontend.includes('Agent IA · état vérifié') || !frontend.includes('Worker automatique actif') || !frontend.includes('Aucune alerte ouverte') || !frontend.includes('ne lit ni les messages privés ni les préférences privées')) throw new Error('Founder dashboard must expose verified AI operations and privacy boundaries.');
const privateProfileMigration = fs.readFileSync('supabase/migrations/20261124140129_enforce_private_profile_public_projection.sql', 'utf8').toLowerCase();
for (const item of ['new.profile_private', 'new.age := null', 'new.bio := null', "new.interets := '{}'::text[]", "new.prompts := '[]'::jsonb", 'new.derniere_vue := null', 'new.photos := new.photos[1:1]', 'create trigger enforce_private_profile_public_projection']) {
 if (!privateProfileMigration.includes(item)) throw new Error('Private profile public projection guard missing: ' + item);
}

if (!frontend.includes('Backend Match présent en production') || !frontend.includes('Garde-fou d’expiration pas actif en production') || !frontend.includes('Authentification des salles Jitsi incomplète') || !frontend.includes('restauration réellement testée')) throw new Error('Founder dashboard must expose the verified production state and remaining launch blockers.');

console.log('Malachite frontend, PWA, private media, SQL policy and Admin security checks passed.');


// Malachite launch/payment guardrails (static checks; not a live payment test).
const paymentAvatarUi = fs.readFileSync('malachite-avatar-ui.js', 'utf8');
const paymentOffersUi = fs.readFileSync('malachite-user-experience.js', 'utf8');
const paymentCallsUi = fs.readFileSync('calls.js', 'utf8');
for (const item of [
  "Premium — 2 USD / 30 jours",
  "Boost — 0,50 USD / 24 h",
  "operateur:data.operator",
  "malSubmitPayment({offer:offer.value,code:code,operator:network,file:proof.files[0]})",
]) {
  if (![paymentAvatarUi, paymentOffersUi, paymentCallsUi].some((source) => source.includes(item))) {
    throw new Error('Launch payment requirement missing: ' + item);
  }
}
const hardcodedRecipient = /\\+243\\s?\\d{3}\\s?\\d{3}\\s?\\d{3}|\\+243\\d{9}/;
if ([html, paymentAvatarUi, paymentOffersUi, paymentCallsUi].some((source) => hardcodedRecipient.test(source))) {
  throw new Error('Mobile Money recipient numbers must never be hardcoded in browser assets.');
}
if (paymentAvatarUi.includes("offer:'Contact'") || paymentAvatarUi.includes("contact:'Déblocage contact") ||
    paymentOffersUi.includes('Déblocage contact') || paymentOffersUi.includes('Contact : 1 USD')) {
  throw new Error('Paid contact unlocking is not part of the approved launch offers.');
}
if (!paymentAvatarUi.includes('function malPaymentPanel()') ||
    !paymentAvatarUi.includes('Paiements temporairement suspendus') ||
    !paymentAvatarUi.includes("data.offer==='Appels'&&window.CALL_PROVIDER_ENABLED===true") ||
    !paymentOffersUi.includes('if (!airtel && !orange)') ||
    !paymentOffersUi.includes('Paiements temporairement suspendus')) {
  throw new Error('Payment UI must fail closed while numbers are unconfigured and only allow securely enabled call passes.');
}
if (!paymentAvatarUi.includes('Ne communique jamais ton code PIN Mobile Money.') ||
    !paymentAvatarUi.includes('receipt_path:receipt.path')) {
  throw new Error('Manual payments must protect Mobile Money credentials and store private receipt paths.');
}
if (!frontend.includes("function aiManagerPreview()") || !frontend.includes("moteur IA Malachite existant") || !frontend.includes("actions sensibles restent sous ton contrôle")) {
  throw new Error('AI copilots must describe the existing engine and preserve human approval for sensitive actions.');
}
if (frontend.includes("Premium — 3 $")) {
  throw new Error('Legacy Premium price of 3 USD remains anywhere in the frontend.');
}
if (!frontend.includes("Premium : 2 USD / 30 jours")) {
  throw new Error('The active Premium price must be 2 USD per month.');
}

const paymentMigration = fs.readFileSync('supabase/migrations/20261120130000_restrict_payment_review_rpc.sql', 'utf8');
for (const item of [
  'revoke all on function public.traiter_paiement(bigint, boolean) from public, anon',
  'revoke all on function public.traiter_paiement(bigint, boolean, text) from public, anon',
  'grant execute on function public.traiter_paiement(bigint, boolean, text) to authenticated',
  'payment_review_rpc_must_not_be_executable_by_anon',
]) {
  if (!paymentMigration.toLowerCase().includes(item.toLowerCase())) {
    throw new Error('Payment RPC privilege guard missing: ' + item);
  }
}
const paymentSources = [paymentAvatarUi, paymentOffersUi, paymentCallsUi].join('\n');
if (!paymentSources.includes('maxlength="100"') ||
    !paymentSources.includes('placeholder="Référence exacte du SMS"') ||
    !paymentSources.includes('code.length<4||code.length>100')) {
  throw new Error('Payment reference length must match the database RLS policy (4–100 characters).');
}
if (frontend.includes('maxlength="120" placeholder="Référence de transaction"')) {
  throw new Error('Payment reference input exceeds the database limit.');
}

const receiptMigration = fs.readFileSync('supabase/migrations/20261120140000_private_payment_receipts.sql', 'utf8');
for (const item of [
  "values ('payment-receipts', 'payment-receipts', false, 5242880",
  "private.is_admin()",
  "paiements_operator_reference_uidx",
]) {
  if (!receiptMigration.toLowerCase().includes(item.toLowerCase())) {
    throw new Error('Private payment receipt storage control missing: ' + item);
  }
}
const receiptPolicyMigration = fs.readFileSync('supabase/migrations/20261120170000_enforce_payment_receipt_policy.sql', 'utf8');
for (const item of [
  "receipt_path is not null",
  "operateur in ('airtel','orange')",
  "mutual match",
  "o.bucket_id = 'payment-receipts'",
  "o.name = paiements.receipt_path",
  "(storage.foldername(o.name))[1] = (select auth.uid())::text",
]) {
  if (!receiptPolicyMigration.toLowerCase().includes(item.toLowerCase())) {
    throw new Error('Private payment receipt enforcement missing: ' + item);
  }
}
for (const item of [
  "async function malUploadPaymentReceipt(file)",
  "sb.storage.from('payment-receipts').upload",
  "createSignedUrl(x.receipt_path,300)",
  "id=\"malReceipt\"",
  "receipt_path:receipt.path",
]) {
  if (!paymentSources.includes(item)) throw new Error('Payment receipt workflow missing: ' + item);
}

if (!paymentSources.includes("remove([receipt.path])")) {
  throw new Error('Failed payment inserts must clean up unlinked private receipt files.');
}


for (const item of ['malachite-campaigns.js', 'malachite-ad-studio.js', 'campagnes', 'SPONSORISÉ']) {
  if (frontend.includes(item)) throw new Error('Retired advertising source must not be loaded by the public site: ' + item);
}
const latestPaymentAdmin = frontend.slice(frontend.lastIndexOf('function admin0(){'), frontend.indexOf('function malShowLegal', frontend.lastIndexOf('function admin0(){')));
if (!latestPaymentAdmin.includes('Confirmer reçu') || latestPaymentAdmin.includes('trtBatch()') || latestPaymentAdmin.includes('Valider ce lot')) {
  throw new Error('Payment review must remain individual and simple.');
}

const performanceModule = fs.readFileSync('malachite-performance.js', 'utf8');
const performanceTemp = path.join(os.tmpdir(), 'malachite-performance.js');
fs.writeFileSync(performanceTemp, performanceModule);
const performanceCheck = spawnSync(process.execPath, ['--check', performanceTemp], { encoding: 'utf8' });
if (performanceCheck.status !== 0) { process.stderr.write(performanceCheck.stderr || performanceCheck.stdout); process.exit(performanceCheck.status || 1); }
for (const item of ['malachite-performance.js', 'img.loading', 'img.decoding']) {
  if (!performanceModule.includes(item) && !frontend.includes(item)) throw new Error('Mobile performance requirement missing: ' + item);
}
if (sw.includes('./malachite-campaigns.js') || !sw.includes('./malachite-performance.js') || !sw.includes('malachite-static-v88')) {
  throw new Error('Retired campaign assets must stay out of the PWA shell while the performance guard remains cached.');
}

const aiManagerModule = fs.readFileSync('malachite-ai.js', 'utf8');
const aiTemp = path.join(os.tmpdir(), 'malachite-ai-manager.js');
fs.writeFileSync(aiTemp, aiManagerModule);
const aiCheck = spawnSync(process.execPath, ['--check', aiTemp], { encoding: 'utf8' });
if (aiCheck.status !== 0) { process.stderr.write(aiCheck.stderr || aiCheck.stdout); process.exit(aiCheck.status || 1); }
for (const item of ['malAiLoadOperations', 'action:"operations"', 'Historique des paiements', 'Signalements', 'Comptes suspendus', 'Blocages entre membres', 'Avis et commentaires', 'Demandes de support']) {
  if (!aiManagerModule.includes(item)) throw new Error('AI Manager operations center requirement missing: ' + item);
}
const aiFunction = fs.readFileSync('supabase/functions/malachite-ai-manager/index.ts', 'utf8');
for (const item of ['getOperations', 'body.action === "operations"', 'body.action === "analyze_payment_receipt"', 'analyzePaymentReceipt', 'download(path)', 'reference_match', 'manual_confirmation_required: true', '"avis_site"', '"blocages"', '"demandes_support"', 'malachite_ai_manager_is_admin']) {
  if (!aiFunction.includes(item)) throw new Error('AI Manager secure operations endpoint missing: ' + item);
}
if (aiFunction.includes('from("messages")') || aiFunction.includes('from("prives")')) {
  throw new Error('AI Manager must never query private conversations or private contact records.');
}
if (!sw.includes('malachite-static-v62')) throw new Error('AI Manager operations release must bump the static cache version.');

for (const item of ['malAiAnalyzePayment', 'malAiAutoAnalyzePayments', 'malAiPaymentReview', 'L’IA lit l’image, elle ne vérifie pas l’encaissement']) {
  if (!fs.readFileSync('malachite-avatar-ui.js', 'utf8').includes(item) && !fs.readFileSync('malachite-chat-ui.js', 'utf8').includes(item)) {
    throw new Error('Malakit AI receipt-reading UI requirement missing: ' + item);
  }
}
const aiWorker = fs.readFileSync('supabase/functions/malachite-ai-worker/index.ts', 'utf8');
if (!aiWorker.includes('CONFIGURED_MODEL.startsWith("gemini-2.5-") ? "gemini-3.5-flash-lite"') || !aiWorker.includes('(CONFIGURED_MODEL || "gemini-3.5-flash-lite")')) {
  throw new Error('AI worker must use the verified Gemini model fallback.');
}
for (const item of [
  'async function reconcileResolvedReviewTasks(admin: any)',
  'payment_review: "paiements"',
  'report_review: "signalements"',
  'support_review: "demandes_support"',
  'sourceStatus === "attente"',
  'sourceStatus === "nouveau"',
  '["nouveau", "en_cours"].includes(sourceStatus)',
  '.eq("id", task.id).eq("status", "awaiting_human")',
  'review_tasks_reconciled: reconciledTasks',
]) {
  if (!aiWorker.includes(item)) throw new Error('AI review queue must close only already-resolved source tasks: ' + item);
}

const privilegeMigration = fs.readFileSync('supabase/migrations/20261120223753_revoke_authenticated_table_bypass_privileges.sql', 'utf8').toLowerCase();
for (const item of ['revoke truncate, references, trigger on all tables in schema public from authenticated', 'alter default privileges for role postgres in schema public', 'revoke all on tables from anon', 'revoke all on sequences from anon']) {
  if (!privilegeMigration.includes(item)) throw new Error('Database table privilege hardening missing: ' + item);
}

const blockedCallsMigration = fs.readFileSync('supabase/migrations/20261120224036_prevent_calls_between_blocked_members.sql', 'utf8').toLowerCase();
for (const item of ['private.is_blocked_with(p_callee_id)', "raise exception 'call_blocked'", 'not private.is_blocked_with(call_sessions.callee_id)']) {
  if (!blockedCallsMigration.includes(item)) throw new Error('Blocked-member call protection missing: ' + item);
}

const memberExperience = fs.readFileSync('malachite-user-experience.js', 'utf8');
const memberExperienceTemp = path.join(os.tmpdir(), 'malachite-user-experience.js');
fs.writeFileSync(memberExperienceTemp, memberExperience);
const memberExperienceCheck = spawnSync(process.execPath, ['--check', memberExperienceTemp], { encoding: 'utf8' });
if (memberExperienceCheck.status !== 0) { process.stderr.write(memberExperienceCheck.stderr || memberExperienceCheck.stdout); process.exit(memberExperienceCheck.status || 1); }
const offerUi = fs.readFileSync('malachite-user-experience.js', 'utf8');
const avatarUi = fs.readFileSync('malachite-avatar-ui.js', 'utf8');
const oldPaymentNumbers = /\\+243\\s?\\d{3}\\s?\\d{3}\\s?\\d{3}|\\+243\\d{9}/;
if ([html, appCore, calls, offerUi, avatarUi].some((source) => oldPaymentNumbers.test(source))) {
  throw new Error('Payment recipient numbers must come only from the approved Supabase configuration, never from browser source.');
}
if (avatarUi.includes("offer:'Contact'") || avatarUi.includes("contact:'Déblocage contact") ||
    offerUi.includes('Déblocage contact') || offerUi.includes('Contact : 1 USD') ||
    !avatarUi.includes('function malPaymentPanel()') ||
    !avatarUi.includes('Paiements temporairement suspendus') ||
    !avatarUi.includes("data.offer==='Appels'&&window.CALL_PROVIDER_ENABLED===true")) {
  throw new Error('Launch offers must remain limited to Premium, Boost and securely enabled Pass Appels; payment details must fail closed.');
}
if (!offerUi.includes('var callsAvailable = window.CALL_PROVIDER_ENABLED === true') ||
    !offerUi.includes('if (!airtel && !orange)') ||
    !offerUi.includes('Paiements temporairement suspendus')) {
  throw new Error('Offers page must hide payment submission until a configured recipient number is available.');
}

for (const item of ['malAnnounceUserNotification', 'publish_user_announcement', 'malSetOfferPage', 'visualViewport', 'related_message_id']) {
  if (!memberExperience.includes(item)) throw new Error('Member experience requirement missing: ' + item);
}
if (!frontend.includes('malachite-user-experience.js') || !sw.includes('./malachite-user-experience.js')) {
  throw new Error('Member experience module must be loaded and cached by the PWA.');
}
const inboxMigration = fs.readFileSync('supabase/migrations/20261121105751_user_notification_inbox.sql', 'utf8');
for (const item of ['message_received', 'publish_user_announcement', 'private.notify_new_member_message', 'related_message_id']) {
  if (!inboxMigration.includes(item)) throw new Error('Durable notification migration requirement missing: ' + item);
}

const legacyNoticeMigration = fs.readFileSync('supabase/migrations/20261121110009_persist_app_toast_notifications.sql', 'utf8');
for (const item of ['create_my_notification', 'announcement_key', 'auth.uid()', 'grant execute']) {
  if (!legacyNoticeMigration.includes(item)) throw new Error('Persisted in-app notice RPC requirement missing: ' + item);
}

const notificationHardening = fs.readFileSync('supabase/migrations/20261121110106_harden_notification_rpc_and_indexes.sql', 'utf8').toLowerCase();
for (const item of ['security invoker', 'private.publish_user_announcement', 'private.create_my_notification', 'user_notifications_related_message_idx', 'user_notifications_related_user_idx']) {
  if (!notificationHardening.includes(item)) throw new Error('Notification RPC hardening requirement missing: ' + item);
}

const notificationActionsMigration = fs.readFileSync('supabase/migrations/20261121112030_notification_action_targets_and_indexes.sql', 'utf8').toLowerCase();
for (const item of ['action_type', 'action_id', 'private.create_my_notification', 'security definer', 'user_notifications_user_created_idx']) {
  if (!notificationActionsMigration.includes(item)) throw new Error('Notification action-target migration requirement missing: ' + item);
}
for (const item of ['openLinkedMessage', 'back-to-site', 'p_related_user_id', 'Capture du SMS de confirmation de paiement', 'loadedAt']) {
  if (!memberExperience.includes(item) && !frontend.includes(item)) throw new Error('Notification navigation or performance requirement missing: ' + item);
}

const uniqueActionRpcMigration = fs.readFileSync('supabase/migrations/20261121112701_use_unique_action_notification_rpc.sql', 'utf8').toLowerCase();
for (const item of ['drop function if exists public.create_my_notification', 'create_my_action_notification', 'security invoker']) {
  if (!uniqueActionRpcMigration.includes(item)) throw new Error('Unique notification RPC migration requirement missing: ' + item);
}
if (!memberExperience.includes("rpc('create_my_action_notification'")) throw new Error('Member notification action RPC must use its unique endpoint name.');


// MALACHITE WORLD was intentionally removed; no obsolete prototype files are required by this site build.
console.log('Legacy MALACHITE WORLD checks skipped: feature is not part of the current product.');

// Founder finance UI must require the server-verified admin state before rendering,
// loading finance data, or triggering the founder dashboard.
const founderFinance = fs.readFileSync('malachite-founder-finance.js', 'utf8');
if ((founderFinance.match(/!window\.malAdminAuthorized/g) || []).length < 2 ||
    !founderFinance.includes('window.malAdminAuthorized && window.tab === "founder"')) {
  throw new Error('Founder finance UI must be gated by the server-verified admin authorization state.');
}
const adminRpcMigrationPath = fs.existsSync('supabase/migrations/20261120210922_harden_malachite_ai_admin_rpc.sql')
  ? 'supabase/migrations/20261120210922_harden_malachite_ai_admin_rpc.sql'
  : 'supabase/migrations/202611200002_harden_malachite_ai_admin_rpc.sql';
const adminRpcMigration = fs.readFileSync(adminRpcMigrationPath, 'utf8');
if (!adminRpcMigration.includes('security invoker') ||
    !adminRpcMigration.includes('private.is_admin()') ||
    !adminRpcMigration.includes('revoke all on function public.malachite_ai_manager_is_admin() from public, anon') ||
    !adminRpcMigration.includes('grant execute on function public.malachite_ai_manager_is_admin() to authenticated')) {
  throw new Error('Admin authorization RPC must remain invoker-scoped and unavailable to anon/public.');
}

// The refresh handler must reject an unauthenticated/non-admin UI state before
// making the finance RPC. Keep the check ahead of any request to avoid leaking
// even response metadata through the client.
const financeRefreshStart = founderFinance.indexOf('window.malFounderFinanceRefresh = async function ()');
const financeRefreshEnd = founderFinance.indexOf('    };', financeRefreshStart);
const financeRefreshSource = financeRefreshStart >= 0 && financeRefreshEnd > financeRefreshStart
  ? founderFinance.slice(financeRefreshStart, financeRefreshEnd)
  : '';
const financeAdminGuard = financeRefreshSource.indexOf('!window.malAdminAuthorized');
const financeRpcCall = financeRefreshSource.indexOf('window.sb.rpc("founder_business_overview"');
if (financeAdminGuard < 0 || financeRpcCall < 0 || financeAdminGuard > financeRpcCall) {
  throw new Error('Finance refresh must verify the admin UI state before invoking the finance RPC.');
}

const approvedLaunchFooter = 'Les seules offres payantes prévues au lancement sont Premium, Boost et Pass Appels. Les conditions et tarifs seront communiqués avant leur activation.';
const legacyLaunchFooter = 'Les offres payantes disponibles au lancement sont Premium, Boost et Pass Appels.';
if (!html.includes(approvedLaunchFooter) || html.includes(legacyLaunchFooter)) {
  throw new Error('Public launch pricing copy must use the approved, non-promissory wording.');
}

const mobileNavigationStyle = html.slice(html.indexOf('<style id="mal-mobile-nav-scroll">'), html.indexOf('</style>', html.indexOf('<style id="mal-mobile-nav-scroll">')) + 8);
if (!mobileNavigationStyle.includes('@media(max-width:600px){#nav{justify-content:flex-start;overflow-x:auto') ||
    !mobileNavigationStyle.includes('scrollbar-width:none') ||
    !mobileNavigationStyle.includes('#nav button{flex:0 0 64px;min-width:64px}}') ||
    !mobileNavigationStyle.includes('touch-action:pan-x') ||
    !mobileNavigationStyle.includes('overscroll-behavior-x:contain')) {
  throw new Error('Mobile navigation must scroll horizontally on small screens with stable touch targets and controlled overscroll.');
}

const productionDeployWorkflow = fs.readFileSync('.github/workflows/deploy-production.yml', 'utf8');
const productionTriggerHeader = productionDeployWorkflow.slice(0, productionDeployWorkflow.indexOf('permissions:'));
if (productionTriggerHeader.includes('preview/malachite-match-staging-clean') ||
    !productionTriggerHeader.includes('workflow_dispatch:')) {
  throw new Error('Production Pages must publish automatically only from main and retain manual dispatch.');
}
const requiredProductionReadinessVars = [
  'MALACHITE_DB_SECURITY_READY',
  'MALACHITE_BACKUP_RESTORE_VERIFIED',
  'MALACHITE_AUTH_PASSWORD_PROTECTION_ENABLED',
  'MALACHITE_PRIVATE_JAAS_CALLS_VERIFIED',
  'MALACHITE_LAUNCH_APPROVED',
];
if (!requiredProductionReadinessVars.every(name => productionDeployWorkflow.includes('vars.' + name)) ||
    !productionDeployWorkflow.includes('BACKUP_RESTORE_VERIFIED') ||
    !productionDeployWorkflow.includes('AUTH_PASSWORD_PROTECTION_ENABLED') ||
    !productionDeployWorkflow.includes('PRIVATE_JAAS_CALLS_VERIFIED') ||
    !productionDeployWorkflow.includes('if [ "$LAUNCH_APPROVED" != "true" ]')) {
  throw new Error('Production deployment must fail closed on DB security, backup/restore, Auth password protection, private JaaS verification and explicit launch approval.');
}
const livePagesSmoke = fs.readFileSync('scripts/smoke-live-pages.mjs', 'utf8');
const livePagesWorkflow = fs.readFileSync('.github/workflows/verify-live-pages.yml', 'utf8');
if (!livePagesSmoke.includes('EXPECTED_LIVE_CACHE') ||
    !livePagesSmoke.includes('EXPECTED_LIVE_CALLS_ASSET') ||
    !livePagesSmoke.includes("localStorage.getItem('mal_photo_cache:'") ||
    !livePagesSmoke.includes("localStorage.setItem('mal_photo_cache:'") ||
    !livePagesWorkflow.includes('malachite-static-v108') ||
    !livePagesWorkflow.includes('malachite-static-v115') ||
    !livePagesWorkflow.includes('20261126-photo-cache-v3') ||
    !livePagesWorkflow.includes('20261127-jaas-dynamic-gate-v1')) {
  throw new Error('Live Pages smoke test must verify the signed-photo cache and use the correct live asset version for PR versus production.');
}
const previewDeployWorkflow = fs.readFileSync('.github/workflows/deploy-public-test.yml', 'utf8');
const expectedPreviewBannerInjection = String.raw`re.subn(r"(<body\b[^>]*>)", lambda match: match.group(1) + banner`;
if (!previewDeployWorkflow.includes(expectedPreviewBannerInjection)) {
  throw new Error('Isolated preview banner must match the body tag using a word boundary and preserve the matched tag.');
}


const updateServiceWorker = fs.readFileSync('sw.js', 'utf8');
const installHandlerStart = updateServiceWorker.indexOf('self.addEventListener("install"');
const installHandlerEnd = updateServiceWorker.indexOf('self.addEventListener("message"', installHandlerStart);
const installHandler = installHandlerStart >= 0 && installHandlerEnd > installHandlerStart
  ? updateServiceWorker.slice(installHandlerStart, installHandlerEnd)
  : '';
if (!installHandler || installHandler.includes('skipWaiting') || !updateServiceWorker.includes('event.data.type === "SKIP_WAITING"')) {
  throw new Error('Service worker updates must wait for an explicit user action.');
}
if (!updateServiceWorker.includes('malachite-static-v115')) {
  throw new Error('Static cache version must change when a new release is prepared.');
}
const updateClient = fs.readFileSync('app-core.js', 'utf8');
for (const marker of ['malSwUpdateNotice','reg.waiting.postMessage({type:\'SKIP_WAITING\'})','navigator.serviceWorker.addEventListener(\'controllerchange\'','setInterval(function(){reg.update()']) {
  if (!updateClient.includes(marker)) throw new Error('Reliable update prompt missing: ' + marker);
}
if (!html.includes('malachite-update-notice-v2') || !html.includes('#malSwUpdateNotice button')) {
  throw new Error('The update prompt must have accessible, responsive styling.');
}

const visualPolish = html.slice(html.indexOf('<style id="malachite-visual-polish-v1">'), html.indexOf('</style>', html.indexOf('<style id="malachite-visual-polish-v1">')) + 8);
for (const selector of ['body:not(.mal-chat-mode)>header',' #malUserMenuTrigger',' .mal-discover-card:hover',' nav#nav','@media(max-width:430px)','prefers-reduced-motion:reduce']) {
  if (!visualPolish.includes(selector.trim())) throw new Error('Responsive visual polish is missing: ' + selector);
}

const appShellStart = serviceWorker.indexOf('const APP_SHELL = [');
const appShellEnd = serviceWorker.indexOf('];', appShellStart);
const appShellSource = appShellStart >= 0 && appShellEnd > appShellStart ? serviceWorker.slice(appShellStart, appShellEnd) : '';
if (!appShellSource.includes('"./malachite-share.js"')) {
  throw new Error('First-party share entry script must be included in the versioned app shell cache.');
}
const adminOnlyAssets = ['"./malachite-ai.js"','"./malachite-copilots.js"','"./admin-push.js"','"./malachite-founder-finance.js?v=1"','"./malachite-campaigns.js"','"./malachite-ad-studio.js"'];
if (adminOnlyAssets.some(asset => appShellSource.includes(asset))) {
  throw new Error('Admin-only scripts must not be fetched during initial app-shell installation.');
}
for (const tag of ['<script src="malachite-ai.js" defer>','<script src="malachite-copilots.js" defer>','<script src="admin-push.js" defer>','<script src="./malachite-founder-finance.js?v=1" defer>']) {
  if (html.includes(tag)) throw new Error('Admin-only script remains eagerly loaded: '+tag);
}
if (!appCore.includes('function malLoadAdminModules()') ||
    !appCore.includes("var sources=['./malachite-ai.js','./malachite-copilots.js','./admin-push.js','./malachite-founder-finance.js?v=1']") ||
    !appCore.includes("malLoadAdminModules().then")) {
  throw new Error('Admin modules must load sequentially on demand after admin authorization.');
}
const headMarkup = html.slice(0, html.indexOf('</head>'));
if (!headMarkup.includes('rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces') ||
    !headMarkup.includes('media="print" onload="this.media=\'all\'"') ||
    headMarkup.includes('rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Fraunces')) {
  throw new Error('Optional Google Fonts must remain non-render-blocking with the system-font fallback.');
}
if (!serviceWorker.includes('malachite-static-v115')) {
  throw new Error('App-shell cache version must advance when its contents change.');
}

const supabaseLinkTags = headMarkup.match(/<link\\b[^>]*>/g) || [];
const performanceSource = fs.readFileSync('malachite-performance.js', 'utf8');
if (!html.includes('<script src="malachite-performance.js" defer>') ||
    !performanceSource.includes('img.decoding = "async"') ||
    !performanceSource.includes('img.loading = img.getAttribute("fetchpriority") === "high" ? "eager" : "lazy"') ||
    !performanceSource.includes('var pending = new Set()') ||
    !performanceSource.includes('requestAnimationFrame(flush)') ||
    !performanceSource.includes('rootsSet.has(parent)') ||
    performanceSource.includes('img.getBoundingClientRect()') ||
    !performanceSource.includes('new MutationObserver')) {
  throw new Error('Mobile performance guard must batch image mutations, avoid forced layout, and lazy-load dynamic images.');
}
const supabasePreload = headMarkup.split('<link').filter((tag) =>
  tag.includes('rel="preload"') &&
  tag.includes('as="script"') &&
  tag.includes('href="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"')
);
if (supabasePreload.length !== 1 ||
    !supabasePreload[0].includes('crossorigin="anonymous"') ||
    !supabasePreload[0].includes('fetchpriority="high"')) {
  throw new Error('Supabase startup SDK must have exactly one high-priority, CORS-compatible preload.');
}
const supabaseLoaderStart = html.indexOf('<script id="malachite-dependency-loader">');
const supabaseLoaderEnd = html.indexOf('</script>', supabaseLoaderStart);
const supabaseLoader = supabaseLoaderStart >= 0 && supabaseLoaderEnd > supabaseLoaderStart ? html.slice(supabaseLoaderStart, supabaseLoaderEnd) : '';
if (!supabaseLoader.includes('script.crossOrigin="anonymous"') ||
    !supabaseLoader.includes('script.fetchPriority="high"') ||
    !supabaseLoader.includes('https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js')) {
  throw new Error('Supabase SDK loader must reuse the preload request and preserve its CDN fallback.');
}
if (!supabaseLoader.includes('window.setTimeout(fallback,6000)') || !html.includes('},18000);')) {
  throw new Error('Startup CDN failover and recovery must remain bounded to avoid long mobile stalls.');
}


const profileSource = fs.readFileSync('app-core.js', 'utf8');
const batchStart = profileSource.indexOf('async function resolveProfilePhotosBatch(profiles){');
const batchEnd = profileSource.indexOf('function messageMediaLocation', batchStart);
const batchResolver = batchStart >= 0 && batchEnd > batchStart ? profileSource.slice(batchStart, batchEnd) : '';
const fullStart = profileSource.indexOf('async function resolveProfilePhotos(p){');
const fullResolver = fullStart >= 0 && batchStart > fullStart ? profileSource.slice(fullStart, batchStart) : '';
if (!batchResolver.includes('if(index!==0||!raw)return;') ||
    !batchResolver.includes('job.profile._photoGalleryResolved=false;') ||
    !fullResolver.includes('p._photoGalleryResolved=true;') ||
    !profileSource.includes('else if(!p._photoGalleryResolved)await resolveProfilePhotos(p);')) {
  throw new Error('Discovery must sign only each member primary photo; the full gallery must load only when a profile is opened.');
}

// Owner-scoped profile writes and privacy-safe entitlement reads.
const profileWriteClient = fs.readFileSync('app-core.js', 'utf8');
const avatarWriteClient = fs.readFileSync('malachite-avatar-ui.js', 'utf8');
if (profileWriteClient.includes("sb.from('prives').upsert") ||
    avatarWriteClient.includes("sb.from('profiles').update({avatar:")) {
  throw new Error('Direct client writes to private preferences or profile avatars must remain disabled.');
}
for (const marker of ["rpc('update_my_preferences'", "rpc('update_my_avatar'"]) {
  if (!profileWriteClient.includes(marker) && !avatarWriteClient.includes(marker)) {
    throw new Error('Trusted profile write RPC is missing: ' + marker);
  }
}
if (!avatarWriteClient.includes("var a={type:'pro-vector',version:3,config:Object.assign({},malAvatarState)};") ||
    !avatarWriteClient.includes("sb.rpc('update_my_avatar',{p_avatar:a})")) {
  throw new Error('Vector avatar save must send the constructed avatar object to the owner-scoped RPC.');
}

if (avatarWriteClient.includes("rpc('update_my_avatar',{p_avatar:avatar})") ||
    (avatarWriteClient.match(/rpc\('update_my_avatar',\{p_avatar:\{type:avatar\.type,version:avatar\.version,config:avatar\.config,imagePath:avatar\.imagePath\}\}\)/g) || []).length !== 2) {
  throw new Error('3D avatar RPC must send only the database-allowed fields, never the transient signed image URL.');
}

const retiredCampaignAclMigration = fs.readFileSync('supabase/migrations/20261126230000_revoke_retired_campaign_table_access.sql', 'utf8').toLowerCase();
if (!retiredCampaignAclMigration.includes('revoke all on table public.campagnes from public, anon, authenticated')) {
  throw new Error('Retired campaign table must not retain browser-role grants.');
}
const founderFinanceAclMigration = fs.readFileSync('supabase/migrations/20261126221000_restrict_founder_finance_summary.sql', 'utf8').toLowerCase();
if (!founderFinanceAclMigration.includes('revoke all on function public.founder_finance_summary(timestamptz, timestamptz)') ||
    !founderFinanceAclMigration.includes('from public, anon, authenticated') ||
    !founderFinanceAclMigration.includes('grant execute on function public.founder_finance_summary(timestamptz, timestamptz)') ||
    !founderFinanceAclMigration.includes('to service_role')) {
  throw new Error('Legacy founder finance summary must not be executable by browser roles.');
}
const profileRpcMigration = fs.readFileSync('supabase/migrations/20261124260000_restrict_profile_writes_to_trusted_rpc.sql', 'utf8');
if (!profileWriteClient.includes("profs=r.data||[];profs.forEach(function(p){if(p&&p.avatar&&typeof p.avatar.imageUrl==='string'&&p.avatar.imageUrl.indexOf('/storage/v1/object/sign/')>=0)p.avatar.imageUrl=''});")) {
  throw new Error('Persisted expiring avatar signed URLs must be discarded before first render and re-signed from imagePath.');
}
if (!profileRpcMigration.includes("create or replace function public.save_my_profile(p_profile jsonb, p_private jsonb)") ||
    !profileRpcMigration.includes("v_avatar := v_avatar - 'imageUrl'") ||
    !profileRpcMigration.includes("v_avatar->>'imagePath'") ||
    !profileRpcMigration.includes("array['type','version','config','imagePath']::text[]") ||
    !profileWriteClient.includes("delete avatarForSave.imageUrl")) {
  throw new Error('Profile save must validate avatar ownership and never persist transient signed URLs.');
}

if (profileWriteClient.includes("sb.from('statuts').select('*')") ||
    !profileWriteClient.includes("rpc('public_status_badges'") ||
    profileWriteClient.includes("sb.from('config').select('cle,valeur').in('cle',['airtel','orange'])") ||
    !profileWriteClient.includes('premium_active') ||
    !profileWriteClient.includes('verified_active') ||
    !profileWriteClient.includes('boost_active')) {
  throw new Error('Client must use privacy-safe status badges and keep payment destinations out of the public browser.');
}


// Signed AI worker anti-replay and bounded request body.
const replayMigration = fs.readFileSync('supabase/migrations/20261125170000_prevent_malachite_ai_worker_replay.sql', 'utf8').toLowerCase();
for (const marker of [
  'request_id uuid primary key',
  'v_nonce_hex := lower(p_signature)',
  'on conflict (request_id) do nothing',
  'returning request_id into v_claimed',
  "interval '1 day'",
  "where name = 'malachite_ai_worker_hmac'",
  "where name='malachite_ai_worker_project_ref'",
  'v_url_ref is distinct from v_expected_ref'
]) {
  if (!replayMigration.includes(marker)) throw new Error('AI worker anti-replay requirement missing: ' + marker);
}
const replayPreflight = replayMigration.indexOf('do $preflight_worker_cron$');
const replayHmacPreflight = replayMigration.indexOf("length(coalesce(v_hmac_secret,'')) < 32");
const replayNonceTable = replayMigration.indexOf('create table if not exists private.malachite_ai_worker_nonces');
const replayVerifier = replayMigration.indexOf('create or replace function public.verify_malachite_ai_worker_signature');
if (replayPreflight < 0 || replayHmacPreflight < replayPreflight || replayNonceTable < replayHmacPreflight || replayVerifier < replayNonceTable ||
    replayMigration.includes('cron.unschedule') || replayMigration.includes('cron.schedule(') ||
    replayMigration.includes("p_body::jsonb ->> 'request_id'")) {
  throw new Error('AI worker replay migration must preflight the existing signed cron, install a derived nonce verifier, and preserve the existing schedule without requiring a request_id body field.');
}
const replayWorkerSource = fs.readFileSync('supabase/functions/malachite-ai-worker/index.ts', 'utf8');
if (!replayWorkerSource.includes('readLimitedUtf8Body(req)') || replayWorkerSource.includes('await req.text()')) {
  throw new Error('AI worker must enforce a bounded UTF-8 body reader before HMAC verification.');
}
const replayPreflightBlock = replayMigration.indexOf('do $preflight_worker_cron$');
const replayActiveCronCheck = replayMigration.indexOf("where jobname='malachite-ai-ops-worker' and active", replayPreflightBlock);
const replayHmacSecretCheck = replayMigration.indexOf("where name='malachite_ai_worker_hmac'", replayPreflightBlock);
const replayNonceTablePosition = replayMigration.indexOf('create table if not exists private.malachite_ai_worker_nonces');
const replayVerifierPosition = replayMigration.indexOf('create or replace function public.verify_malachite_ai_worker_signature');
if (replayPreflightBlock < 0 || replayActiveCronCheck < replayPreflightBlock ||
    replayHmacSecretCheck < replayActiveCronCheck || replayNonceTablePosition < replayPreflightBlock ||
    replayVerifierPosition < replayNonceTablePosition || replayMigration.includes('cron.unschedule') ||
    replayMigration.includes('cron.schedule(') || replayMigration.includes('do $replace_legacy_cron$')) {
  throw new Error('AI worker replay migration must validate the existing signed cron before installing anti-replay and must preserve the existing schedule.');
}

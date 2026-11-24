import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const html = fs.readFileSync('index.html', 'utf8');
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
  "from('prives').upsert({id:me.id,prefs:merged})",
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
if (!frontend.includes('createSignedUrl(path,ttl,{download:true})')) {
  throw new Error('Private document downloads must use signed download URLs.');
}
if (frontend.includes('timer=setInterval(loadChat,4000)')) {
  throw new Error('Chat polling must not run every four seconds.');
}
if (!frontend.includes('target===me.id')) {
  throw new Error('Self-conversations must be blocked before message inserts.');
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
if (frontend.includes('<script src="calls.js" defer></script>') || !frontend.includes('core.onload=function(){') || !frontend.includes('calls.src="./calls.js?v=20261122-call-init-v2"')) throw new Error('Call client must load only after app-core has defined its functions.');
if (calls.includes("me.email==='famousnadroj@gmail.com'") ||
    calls.includes('me.email==="famousnadroj@gmail.com"') ||
    !calls.includes("sb.rpc('malachite_ai_manager_is_admin')") ||
    !calls.includes('function stopPaymentRealtime()') ||
    !calls.includes('if(adminPaymentUserId&&(!next||next.id!==adminPaymentUserId))stopPaymentRealtime()')) {
  throw new Error('Admin payment realtime must use the database admin role and clear its subscription when the session identity changes.');
}
if (!calls.includes('Les appels sécurisés seront réactivés après leur mise en place') ||
    !calls.includes("h=h.replace('<button disabled title=")) {
  throw new Error('Mutual-match call actions must replace the legacy disabled call button.');
}
for (const item of [
  "Premium <span>2 $ / 30 jours</span>",
  "Premium — 2 USD / 30 jours (appels inclus)",
  'id="malReceipt"',
  "malSubmitPayment({offer:offer.value,code:code,operator:network,file:proof.files[0]})",
]) {
  if (!calls.includes(item)) throw new Error('Secure calls/payment override requirement missing: ' + item);
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
if (!frontend.includes("createSignedUrls(paths,300)") || !frontend.includes("profilePhotoSignedCache") || !frontend.includes("if(tab==='me')draw(true)")) {
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
if (!serviceWorkerEarly.includes('./malachite-copilots.js') || !serviceWorkerEarly.includes('malachite-static-v88')) {
  throw new Error('Copilot module must be included in the versioned PWA cache.');
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
if (!appCore.includes("if(keepWarmCache){sub();return;}")) throw new Error('Warm profile cache must avoid repeat full profile reloads.');
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
if (!sw.includes('./malachite-ai.js') || !sw.includes('malachite-static-v62')) throw new Error('AI Manager module must be cached and static cache version bumped.');
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
if (!frontend.includes("persistMalView();draw(true);loadChat();timer=setInterval(function(){if(tab==='chat'&&open&&!document.hidden&&!msgRealtimeReady)loadChat()},15000)")) throw new Error('Conversation must render immediately and use a 15-second fallback only when Realtime is unavailable.');
if (!frontend.includes('if(firstLoad){\n    msgs=msgs.concat(fresh)')) throw new Error('Initial messages must render in the conversation.');
if (!frontend.includes('resolveMessagesMedia(priorityMedia).then(function()') || !frontend.includes('var deferredMedia=firstLoad?mediaRows.slice(0,-12):[]')) throw new Error('Recent chat media must be prioritized and older media resolved in the background.');
if (!frontend.includes("Promise.all([sb.from('avis_match').select('ok')")) throw new Error('Conversation match checks must run concurrently.');
if (!frontend.includes("sb.channel('msgs-'+me.id)")) throw new Error('Per-user Realtime message updates must remain enabled.');
if (!frontend.includes('async function resolveMessagesMedia(rows)') || !frontend.includes("createSignedUrls(paths,300)")) throw new Error('Chat media URLs must be resolved in batches.');
if (!frontend.includes("filter:'a=eq.'+me.id") || !frontend.includes("filter:'de=eq.'+me.id")) throw new Error('Realtime messages must be filtered to the signed-in user.');
if (!frontend.includes("preload=\"none\"")) throw new Error('Chat videos must not preload all media data.');
if (!frontend.includes('async function loadOlderMessages()')) throw new Error('Chat history must load older messages incrementally.');
if (!frontend.includes("setInterval(poll,120000)")) throw new Error('Background message polling must not overload the chat view.');
if (!frontend.includes("if(tab!=='chat'&&!msgRealtimeReady){\n   var query=sb.from('messages')") || !frontend.includes('messageTask=query')) throw new Error('Realtime chat must avoid duplicate full message polling.');
if (!frontend.includes("chatLoadBusyKeys[key]")) throw new Error('Opening another chat must not wait for a different conversation request.');
if (!frontend.includes("appendChatRows([temp])") || !frontend.includes("pendingNode.replaceWith(holder.firstElementChild)")) throw new Error('Sending text must not redraw and interrupt media playback.');
if (!frontend.includes("String(m.display_url).indexOf('blob:')===0")) throw new Error('Uploaded local media previews must still be replaced with private signed URLs.');
if (frontend.includes("sb.channel('msgs').on('postgres_changes'")) throw new Error('Unfiltered global message realtime subscriptions are forbidden.');
if (!frontend.includes("if(t=='chat'){loadChat();timer=setInterval(function(){if(tab==='chat'&&!document.hidden&&!msgRealtimeReady)loadChat()},20000);if(open)return}")) throw new Error('Chat navigation must load messages and use a conditional fallback sync.');
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
if (!frontend.includes('cache.expiresAt=now+270000')) throw new Error('Signed media URL cache must refresh its expiry after renewal.');
if (!frontend.includes("Signature des médias de la conversation ('+bucket+')")) throw new Error('Media URL resolution must isolate failures by storage bucket.');
if (!sw.match(/malachite-static-v[0-9]+/) || !sw.includes('./calls.js') || !sw.includes('./malachite-ad-studio.js')) throw new Error('Service worker must cache a versioned app shell including the call client.');
if (!frontend.includes("status==='SUBSCRIBED'")) throw new Error('Realtime recovery must immediately resync the active conversation after reconnect.');
if (!frontend.includes("timer=setInterval(function(){if(tab==='chat'&&!document.hidden&&!msgRealtimeReady)loadChat()},20000)")) throw new Error('Fallback chat sync must pause while hidden and run only when Realtime is unavailable.');
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
const privateProfileAccessMigration = fs.readFileSync('supabase/migrations/20261124150000_secure_private_profile_access.sql', 'utf8').toLowerCase();
for (const item of [
  'drop trigger if exists enforce_private_profile_public_projection on public.profiles',
  'drop policy if exists "voir profils" on public.profiles',
  'profile_private = false',
  'private.is_blocked_with(id)',
  'private.is_suspended(id)',
  'drop policy if exists "profile photos read" on storage.objects',
  'drop policy if exists "profile photos read published paths" on storage.objects',
  'create policy "profile photos read published paths"',
]) {
  if (!privateProfileAccessMigration.includes(item)) throw new Error('Private profile access guard missing: ' + item);
}
if (privateProfileAccessMigration.includes('new.age := null') ||
    privateProfileAccessMigration.includes('new.bio := null') ||
    privateProfileAccessMigration.includes('new.photos :=') ||
    privateProfileAccessMigration.includes('profile_private = true')) {
  throw new Error('Private profile migration must preserve member data and hide all private photos.');
}

const profilePhotoSigningSource = fs.readFileSync('app-core.js', 'utf8');
const profileResolverStart = profilePhotoSigningSource.indexOf('async function resolveProfilePhotos(p)');
const profileResolverEnd = profilePhotoSigningSource.indexOf('function messageMediaLocation', profileResolverStart);
const profileResolvers = profilePhotoSigningSource.slice(profileResolverStart, profileResolverEnd);
if (!profilePhotoSigningSource.includes("bucket==='profile-photos'?300:3600") ||
    (profileResolvers.match(/createSignedUrls\(paths,300\)/g) || []).length !== 2 ||
    profileResolvers.includes('createSignedUrls(paths,3600)') ||
    !profileResolvers.includes('expiresAt:now+270000')) {
  throw new Error('Profile photo signed URLs must expire quickly and use a matching short client cache.');
}

if (!frontend.includes('Backend Match présent en production') || !frontend.includes('Garde-fou d’expiration pas actif en production') || !frontend.includes('Authentification des salles Jitsi incomplète') || !frontend.includes('restauration réellement testée')) throw new Error('Founder dashboard must expose the verified production state and remaining launch blockers.');

console.log('Malachite frontend, PWA, private media, SQL policy and Admin security checks passed.');


// Malachite launch/payment guardrails (static checks; not a live payment test).
for (const item of [
  "Premium — 2 USD / mois",
  "Boost — 0,50 USD / 24 h",
  "+243 993 315 532",
  "+243 848 775 992",
  "operateur:data.operator",
  "Une capture d’écran seule ne déclenche jamais Premium.",
  "Ne communique jamais ton code PIN ni ton OTP.",
]) {
  if (!frontend.includes(item)) throw new Error('Launch payment requirement missing: ' + item);
}
if (!frontend.includes("var payload={offre:data.offer,code:data.code,operateur:data.operator,receipt_path:receipt.path}") ||
    !frontend.includes("sb.from('paiements').insert(payload)")) {
  throw new Error('Payment submission must preserve offer, reference, operator and private receipt path.');
}
if (!frontend.includes("function aiManagerPreview()") || !frontend.includes("moteur IA Malachite existant") || !frontend.includes("actions sensibles restent sous ton contrôle")) {
  throw new Error('AI copilots must describe the existing engine and preserve human approval for sensitive actions.');
}
if (frontend.includes("Premium — 3 $")) {
  throw new Error('Legacy Premium price of 3 USD remains anywhere in the frontend.');
}
if (!frontend.includes("Premium — 2 USD / mois")) {
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
if (!frontend.includes('maxlength="100" placeholder="Référence exacte du SMS"') ||
    !frontend.includes('c.length<4||c.length>100')) {
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
  if (!frontend.includes(item)) throw new Error('Payment receipt workflow missing: ' + item);
}

if (!frontend.includes("remove([receipt.path])")) {
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
if (!sw.includes('./malachite-campaigns.js') || !sw.includes('./malachite-performance.js') || !sw.includes('malachite-static-v88')) {
  throw new Error('Campaign, performance and payment AI modules must be included in the updated PWA cache.');
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

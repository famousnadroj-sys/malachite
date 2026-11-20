import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const html = fs.readFileSync('index.html', 'utf8');
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim().length > 0);
if (inlineScripts.length === 0) throw new Error('No inline application script found.');
const temp = path.join(os.tmpdir(), 'malachite-inline.js');
fs.writeFileSync(temp, inlineScripts.join('\n;\n'));
const js = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
if (js.status !== 0) {
  process.stderr.write(js.stderr || js.stdout);
  process.exit(js.status || 1);
}

const requiredFrontend = [
  "profiles').select('id,prenom,age",
  "from('prives').upsert({id:me.id,prefs:merged})",
  "from('chat-media').upload",
  "from('profile-photos').upload",
  "createSignedUrl",
  "functions.invoke('admin-user-moderation'",
  'function mascotHint()',
  'manifest.webmanifest',
  '@media(min-width:760px)',
];
for (const item of requiredFrontend) {
  if (!html.includes(item)) throw new Error('Frontend requirement missing: ' + item);
}
if (html.includes("profiles').select('*')")) throw new Error('Public profile query must not select private columns.');
if (!html.includes("insert({de:me.id,profil:id,motif:motif})")) throw new Error('Report must include the authenticated reporter id.');
if ((html.match(/storage\.from\('photos'\)\.upload/g) || []).length) throw new Error('New uploads must not use the legacy public photos bucket.');
if (/service[_-]?role|sb_secret_/i.test(html)) throw new Error('Privileged Supabase credentials must never appear in browser code.');
if (html.includes('contact_interdit')) throw new Error('Private message content must not be scanned to block contact details.');
if (!html.includes('function persistMalView()') || !html.includes('function restoreMalView()')) {
  throw new Error('Chat navigation must survive a same-tab refresh.');
}
if (!html.includes('function sendSticker(emoji)') || !html.includes('m.media_type==="document"')) {
  throw new Error('Chat stickers and document rendering must remain available.');
}
if (!html.includes('createSignedUrl(path,3600,{download:true})')) {
  throw new Error('Private document downloads must use signed download URLs.');
}
if (html.includes('timer=setInterval(loadChat,4000)')) {
  throw new Error('Chat polling must not run every four seconds.');
}
if (!html.includes('target===me.id')) {
  throw new Error('Self-conversations must be blocked before message inserts.');
}


const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
if (manifest.start_url !== './' || manifest.scope !== './' || manifest.display !== 'standalone') {
  throw new Error('PWA manifest configuration is incomplete.');
}
const sw = fs.readFileSync('sw.js', 'utf8');
const swTemp = path.join(os.tmpdir(), 'malachite-sw.js');
fs.writeFileSync(swTemp, sw);
const swCheck = spawnSync(process.execPath, ['--check', swTemp], { encoding: 'utf8' });
if (swCheck.status !== 0) {
  process.stderr.write(swCheck.stderr || swCheck.stdout);
  process.exit(swCheck.status || 1);
}
if (!sw.includes('storage') || !sw.includes('Authorization')) throw new Error('Service worker must bypass Supabase private APIs.');

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
if (!html.includes('function openConv(id){if(!id||!me)return;')) throw new Error('Conversation entry handler missing.');
if (!html.includes('persistMalView();draw(true);loadChat();timer=setInterval(function(){if(tab===\'chat\'&&open&&!document.hidden)loadChat()},10000)')) throw new Error('Conversation must render immediately before network loading with a 10-second fallback.');
if (!html.includes('if(firstLoad){\n    msgs=msgs.concat(fresh)')) throw new Error('Initial messages must render in the conversation.');
if (!html.includes('resolveMessagesMedia(mediaRows).then(function()')) throw new Error('Media resolution must run after the first message render.');
if (!html.includes("Promise.all([sb.from('avis_match').select('ok')")) throw new Error('Conversation match checks must run concurrently.');
if (!html.includes("sb.channel('msgs-'+me.id)")) throw new Error('Per-user Realtime message updates must remain enabled.');
if (!html.includes('async function resolveMessagesMedia(rows)') || !html.includes("createSignedUrls(paths,3600)")) throw new Error('Chat media URLs must be resolved in batches.');
if (!html.includes("filter:'a=eq.'+me.id") || !html.includes("filter:'de=eq.'+me.id")) throw new Error('Realtime messages must be filtered to the signed-in user.');
if (!html.includes("preload=\"none\"")) throw new Error('Chat videos must not preload all media data.');
if (!html.includes('async function loadOlderMessages()')) throw new Error('Chat history must load older messages incrementally.');
if (!html.includes("setInterval(poll,30000)")) throw new Error('Background message polling must not overload the chat view.');
if (!html.includes("if(tab!=='chat'){var r=await sb.from('messages')")) throw new Error('Realtime chat must avoid duplicate full message polling.');
if (!html.includes("chatLoadBusyKeys[key]")) throw new Error('Opening another chat must not wait for a different conversation request.');
if (!html.includes("appendChatRows([temp])") || !html.includes("pendingNode.replaceWith(holder.firstElementChild)")) throw new Error('Sending text must not redraw and interrupt media playback.');
if (!html.includes("String(m.display_url).indexOf('blob:')===0")) throw new Error('Uploaded local media previews must still be replaced with private signed URLs.');
if (html.includes("sb.channel('msgs').on('postgres_changes'")) throw new Error('Unfiltered global message realtime subscriptions are forbidden.');
if (!html.includes("if(t=='chat'){loadChat();timer=setInterval(loadChat,15000);if(open)return}")) throw new Error('Chat navigation must load messages and preserve the open conversation.');
if (!html.includes("id=\"chatSendError\"")) throw new Error('Message errors must update without rebuilding the conversation.');
const insertChatStart = html.indexOf('async function insertChatMessage');
const insertChatEnd = html.indexOf('async function snd()', insertChatStart);
if (insertChatStart < 0 || insertChatEnd < 0 || html.slice(insertChatStart, insertChatEnd).includes('draw(true)')) throw new Error('Sending a message must not rebuild the chat DOM.');
if (!html.includes("catch(error){if(localPreview)m.display_url=localPreview;throw error}")) throw new Error('Failed signing must not discard the local media preview.');
if (!html.includes('function receiptMarkup(m,pending)') || !html.includes('function markIncomingReceipts(rows,asRead)')) throw new Error('Message delivery and read receipt UI is missing.');
const bubbleStarts = [];
let bubbleSearch = 0;
while ((bubbleSearch = html.indexOf('function bub(m,i)', bubbleSearch)) !== -1) { bubbleStarts.push(bubbleSearch); bubbleSearch += 1; }
if (bubbleStarts.length < 2) throw new Error('Expected chat bubble implementations were not found.');
const activeBubble = html.slice(bubbleStarts[bubbleStarts.length - 1], html.indexOf('async function sendVideo', bubbleStarts[bubbleStarts.length - 1]));
if (!activeBubble.includes('receiptMarkup(m,pending)')) throw new Error('The active chat bubble renderer must display delivery/read indicators.');
if (!html.includes('body.mal-chat-mode .m .msg-status svg')) throw new Error('Message status icons must have visible chat-scoped styling.');
if (!html.includes('aria-label="Envoyé"') || !html.includes('aria-label="Reçu"') || !html.includes('aria-label="Lu"') || !html.includes('aria-label="En attente d’envoi"')) throw new Error('All four message status states must be accessible.');
if (!html.includes("table:'message_receipts'") || !html.includes('function handleReceiptEvent(payload)')) throw new Error('Realtime message receipt updates are missing.');
if (!html.includes("markIncomingReceipts(incoming,document.visibilityState==='visible')")) throw new Error('Opening a conversation must record delivery and read state.');
if (!html.includes("msg-status read") || !html.includes("aria-label=\"Lu\"")) throw new Error('Read receipts must be visibly distinct from delivered receipts.');
if (!migrations.includes('message_receipts') || !migrations.includes('recipient marks read') || !migrations.includes('revoke all on public.message_receipts')) throw new Error('Secure message receipt migrations are missing.');
if (!html.includes('cache.expiresAt=now+3500000')) throw new Error('Signed media URL cache must refresh its expiry after renewal.');
if (!html.includes("Signature des médias de la conversation ('+bucket+')")) throw new Error('Media URL resolution must isolate failures by storage bucket.');
if (!sw.includes('malachite-static-v20')) throw new Error('Service worker cache must be refreshed after chat changes.');
if (!html.includes("status==='SUBSCRIBED'")) throw new Error('Realtime recovery must immediately resync the active conversation after reconnect.');
if (!html.includes('timer=setInterval(function(){if(tab==="chat"&&!document.hidden)loadChat()},10000)')) throw new Error('Active chat fallback sync must run every 10 seconds.');
if (!html.includes("sb.channel('malachite-online-v1'")) throw new Error('Realtime online presence channel is missing.');
if (!html.includes('function refreshPresenceUI()') || !html.includes('function trackPresence()')) throw new Error('Online presence synchronization is missing.');
if (!html.includes("on('broadcast',{event:'typing'}")) throw new Error('Realtime typing indicators are missing.');
if (!html.includes('oninput="setTyping()"') || !html.includes('class="chat-typing"')) throw new Error('Typing indicator UI and composer hook are missing.');
if (!html.includes('class="conv-avatar" onclick="event.stopPropagation();viewProf')) throw new Error('Conversation avatar must open the immersive member profile.');
if (!html.includes('async function viewProf(id,startIndex)') || !html.includes('class="mal-profile-overlay"')) throw new Error('Immersive profile viewer must remain available.');
console.log('Malachite frontend, PWA, private media, SQL policy and Admin security checks passed.');

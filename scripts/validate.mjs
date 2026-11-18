import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(source => source.trim().length > 0);
if (scripts.length === 0) throw new Error('No inline application script found.');
const temp = path.join(os.tmpdir(), 'malachite-inline.js');
fs.writeFileSync(temp, scripts.join('\n;\n'));
const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}
if (html.includes("profiles').select('*')")) throw new Error('Public profile query must not select private columns.');
if (!html.includes("insert({de:me.id,profil:id,motif:motif})")) throw new Error('Report must include the authenticated reporter id.');
if (!html.includes("from('prives').upsert({id:me.id,prefs:pr})")) throw new Error('Search preferences must be stored in the private table.');
const migration = fs.readFileSync('supabase/migrations/202611180002_moderation_and_blocking.sql', 'utf8');
if (!migration.includes('add column if not exists derniere_vue timestamptz')) throw new Error('Presence timestamp column is missing from the migration.');
if (!migration.includes('create or replace function public.is_blocked_with(p_other uuid)')) throw new Error('Authenticated block-check RPC wrapper is missing.');
if (!migration.includes('create or replace function private.est_premium(u uuid)')) throw new Error('Private premium lookup is missing.');
if (!migration.includes('create or replace function private.contact_de(p_autre uuid)')) throw new Error('Private contact lookup is missing.');
if (!migration.includes('create or replace function private.traiter_paiement(pid bigint, accepter boolean)')) throw new Error('Private payment approval is missing.');
if (!migration.includes('security invoker')) throw new Error('Public RPC wrappers must run as invoker.');
if (!migration.includes('revoke execute on function public.est_premium(uuid) from public, anon, authenticated')) throw new Error('Public premium lookup must not be directly executable.');
if (!html.includes("sb.functions.invoke('admin-user-moderation'")) throw new Error('Admin account suspension must use the server-side function.');
if (/service[_-]?role|sb_secret_/i.test(html)) throw new Error('Privileged Supabase credentials must never appear in browser code.');
const moderationFunction = fs.readFileSync('supabase/functions/admin-user-moderation/index.ts', 'utf8');
for (const required of ['auth.getUser(token)', 'auth.admin.updateUserById', 'ADMIN_EMAIL', 'SUPABASE_SERVICE_ROLE_KEY', 'cannot_suspend_self']) {
  if (!moderationFunction.includes(required)) throw new Error('Admin moderation security check missing: ' + required);
}
console.log('JavaScript syntax, privacy guards, and Admin moderation security checks passed.');

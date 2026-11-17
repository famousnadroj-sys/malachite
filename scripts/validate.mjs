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
console.log('JavaScript syntax and privacy guard checks passed.');

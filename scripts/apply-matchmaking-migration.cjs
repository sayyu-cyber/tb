// Apply only the reviewed matchmaking repair, atomically. Never reads/logs keys.
const fs = require('node:fs'), path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const toolRequire = createRequire(path.join(root, 'supabase/auth-migration/tools/firebase-to-supabase/package.json'));
const { Client } = toolRequire('pg');
async function run() {
  if (!process.argv.includes('--apply')) throw new Error('Use --apply only after reviewing 202609300004_casual_matchmaking.sql');
  const credentials = JSON.parse(fs.readFileSync(path.join(root, 'supabase/auth-migration/secrets/supabase-service.json'), 'utf8'));
  const client = new Client({ ...credentials, connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query(fs.readFileSync(path.join(root, 'supabase/migrations/202609300004_casual_matchmaking.sql'), 'utf8'));
    await client.query('commit');
    console.log('Applied 202609300004_casual_matchmaking.sql: membership policies, participant updates and atomic queue RPCs.');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { await client.end(); }
}
run().catch(error => { console.error(error.code ? `${error.code}: ${error.message}` : error.message); process.exitCode = 1; });

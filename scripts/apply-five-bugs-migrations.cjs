// Apply only the two reviewed repairs; never deploys app code or pushes Git.
const fs = require('node:fs'), path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { Client } = createRequire(path.join(root, 'supabase/auth-migration/tools/firebase-to-supabase/package.json'))('pg');
async function run() {
  if (!process.argv.includes('--apply')) throw new Error('Pass --apply only after reviewing migrations 005 and 006');
  const client = new Client({ ...JSON.parse(fs.readFileSync(path.join(root, 'supabase/auth-migration/secrets/supabase-service.json'), 'utf8')), connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    for (const file of ['202609300005_room_invite_join.sql', '202609300006_authoritative_wallet_rewards.sql']) {
      await client.query(fs.readFileSync(path.join(root, 'supabase/migrations', file), 'utf8'));
    }
    await client.query('commit');
    console.log('Applied migrations 005/006: five-minute invites, atomic room entry, authoritative wallet actions, server top-ups and 24-hour daily claims.');
  } catch (error) { await client.query('rollback'); throw error; }
  finally { await client.end(); }
}
run().catch(error => { console.error(error.code ? `${error.code}: ${error.message}` : error.message); process.exitCode = 1; });

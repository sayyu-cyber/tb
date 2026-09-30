// Read-only diagnosis, or rollback-only integration checks; never deploys.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const toolRequire = createRequire(path.resolve(__dirname, '../supabase/auth-migration/tools/firebase-to-supabase/package.json'));
const { Client } = toolRequire('pg');
const migration = path.resolve(__dirname, '../supabase/migrations/202609300004_casual_matchmaking.sql');

async function run() {
  const credentials = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../supabase/auth-migration/secrets/supabase-service.json'), 'utf8'));
  const client = new Client({ ...credentials, connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query(process.argv.includes('--verify') ? 'begin' : 'begin read only');
    const users = (await client.query('select id from public.profiles order by created_at limit 5')).rows.map(row => row.id);
    if (!process.argv.includes('--verify')) {
      await client.query('set local role authenticated');
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [users[0]]);
      try {
        await client.query('select match_id from public.match_players where user_id = auth.uid()');
        console.log('Match lookup: PASS');
      } catch (error) {
        console.log(`Match lookup: ${error.code} ${error.message}`);
      }
      return;
    }
    assert.equal(users.length, 5, 'Need five existing profiles for rollback-only checks');
    await client.query(fs.readFileSync(migration, 'utf8'));
    await verify(client, users);
  } finally {
    await client.query('rollback');
    await client.end();
  }
}

async function verify(client, users) {
  const players = users.slice(0, 4), outsider = users[4];
  // Existing queue/match rows are restored by the outer ROLLBACK.
  await client.query("update public.matches set status = 'abandoned' where id in (select match_id from public.match_players where user_id = any($1::uuid[]))", [players]);
  async function asUser(uid) {
    await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
  }
  async function admin() { await client.query('reset role'); }
  async function join(uid, game, pool = 'casual') {
    await asUser(uid);
    await client.query('select public.join_matchmaking_queue($1, $2)', [game, pool]);
  }
  async function form(uid, game, seats, pool = 'casual') {
    await asUser(uid);
    return (await client.query('select public.try_form_match($1, $2, $3, $4) as id', [game, pool, seats, { test: 'rollback-only' }])).rows[0].id;
  }
  async function expectError(code, operation) {
    await client.query('savepoint expected_error');
    await assert.rejects(operation, error => error.code === code);
    await client.query('rollback to savepoint expected_error');
  }
  for (const game of ['gin_rummy', 'mindi']) {
    const seats = game === 'mindi' ? players : players.slice(0, 2);
    for (const uid of seats) await join(uid, game);
    await admin();
    // More than two minutes spent waiting remains eligible after refresh.
    await client.query("update public.matchmaking_queue set queued_at = now() - interval '10 minutes', heartbeat_at = now() - interval '3 minutes' where user_id = any($1::uuid[])", [seats]);
    assert.equal(await form(seats[0], game, seats), null, 'Expired heartbeat cannot form a table');
    for (const uid of seats) {
      await asUser(uid);
      assert.equal((await client.query('select public.refresh_matchmaking_queue($1, $2) as queued', [game, 'casual'])).rows[0].queued, true);
    }
    const matchId = await form(seats[0], game, seats);
    assert.ok(matchId, `${game} forms a match`);
    for (const uid of seats) {
      await asUser(uid);
      const membership = (await client.query('select user_id, seat_index from public.match_players where match_id = $1 order by seat_index', [matchId])).rows;
      assert.deepEqual(membership.map(row => row.user_id), seats, 'Every participant sees the same full seat order');
      assert.equal((await client.query('select id from public.matches where id = $1', [matchId])).rowCount, 1, 'Match lookup is readable without policy recursion');
      assert.equal(await form(uid, game, seats), matchId, 'Late duplicate request returns the existing table');
    }
    await asUser(seats[0]);
    assert.equal((await client.query("update public.matches set public_state = '{\"turn\":\"next\"}' where id = $1 returning id", [matchId])).rowCount, 1, 'Participants can advance game state');
    await expectError('42501', () => client.query("update public.matches set pool = 'ranked' where id = $1", [matchId]));
    await asUser(outsider);
    assert.equal((await client.query('select * from public.match_players where match_id = $1', [matchId])).rowCount, 0, 'Outsider cannot read membership');
    assert.equal((await client.query('select * from public.matches where id = $1', [matchId])).rowCount, 0, 'Outsider cannot read the game');
    assert.equal((await client.query("update public.matches set public_state = '{}' where id = $1 returning id", [matchId])).rowCount, 0, 'Outsider cannot change game state');
    await expectError('42501', () => form(outsider, game, seats));
    await admin();
    assert.equal((await client.query('select * from public.matchmaking_queue where user_id = any($1::uuid[])', [seats])).rowCount, 0, 'All queue entries are consumed atomically');
    await client.query("update public.matches set status = 'completed' where id = $1", [matchId]);
    assert.equal(await form(seats[0], game, seats), null, 'Consumed queue cannot create a duplicate');
    for (const uid of seats) await join(uid, game);
    await asUser(seats[0]);
    await expectError('22023', () => form(seats[0], game, seats.map(() => seats[0])));
    await join(seats[seats.length - 1], game, 'ranked');
    assert.equal(await form(seats[0], game, seats), null, 'Pools never mix');
    await join(seats[seats.length - 1], game);
    await admin();
    await client.query("update public.matchmaking_queue set party_id = 'duo-test' where user_id = $1", [seats[seats.length - 1]]);
    assert.equal(await form(seats[0], game, seats), null, 'Solo queue cannot consume a duo');
    await admin();
    await client.query('delete from public.matchmaking_queue where user_id = any($1::uuid[])', [seats]);
    console.log(`PASS ${game}: lookup, full membership, formation, deduplication, queue expiry/refresh, pool/duo separation, participant updates and outsider permissions`);
  }
  console.log('PASS: database checks rolled back; no schema or player data retained');
}
run().catch(error => { console.error(error.code ? `${error.code}: ${error.message}` : error.message); process.exitCode = 1; });

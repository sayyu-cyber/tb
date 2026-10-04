// Run against a LOCAL audit database after the parent applies migrations through 010.
// PRIVATE_ROOM_TEST_DATABASE_URL must name a loopback PostgreSQL endpoint.
// All fixtures, injected failures and test writes are rolled back. No migrations applied.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { createRequire } = require('node:module');

async function run() {
  const connectionString = process.env.PRIVATE_ROOM_TEST_DATABASE_URL;
  if (!connectionString) throw new Error('Set PRIVATE_ROOM_TEST_DATABASE_URL to the local audit database; no credentials are read from files.');
  const url = new URL(connectionString);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol), 'PostgreSQL URL required');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Only loopback databases are permitted');
  assert.equal(url.search, '', 'Connection URL options are not permitted');
  const { Client } = createRequire(path.join(__dirname, '../supabase/auth-migration/tools/firebase-to-supabase/package.json'))('pg');
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query('begin');
    await client.query("set local statement_timeout = '10s'");
    assert.ok((await client.query("select to_regprocedure('public.create_room(public.game_type,text,public.room_mode,public.mindi_room_mode)') as rpc")).rows[0].rpc,
      'Parent must apply migration010 locally before this suite');
    const rpcNames = ['create_room', 'join_room', 'create_room_invite_link', 'set_room_seat_order', 'remove_room_player', 'leave_room'];
    const functions = (await client.query(`select p.proname,p.prosecdef,p.proconfig,
      has_function_privilege('anon',p.oid,'execute') as anonymous,
      has_function_privilege('authenticated',p.oid,'execute') as authenticated
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=any($1::text[])`, [rpcNames])).rows;
    assert.equal(functions.length, rpcNames.length);
    for (const fn of functions) {
      assert.equal(fn.prosecdef, true, fn.proname);
      assert.ok(fn.proconfig.includes('search_path=""'), `${fn.proname}: empty search_path`);
      assert.equal(fn.anonymous, false, fn.proname);
      assert.equal(fn.authenticated, true, fn.proname);
    }
    const users = Array.from({ length: 11 }, () => crypto.randomUUID());
    const [host, a, b, c, outsider, guesser, noCard, unused, expired, future, guest] = users;
    for (const uid of users) {
      await client.query("insert into auth.users(id,email,is_anonymous,raw_user_meta_data) values ($1,$2,$3,$4)",
        [uid, `${uid}@room-test.invalid`, uid === guest, { name: 'Room test' }]);
      await client.query("insert into public.profiles(id,display_name) values($1,'Room test') on conflict(id) do nothing", [uid]);
    }
    await client.query("insert into public.room_cards(user_id,type,activated_at,expires_at) values ($1,'1h',now()-interval '1 minute',now()+interval '59 minutes'), ($2,'1h',null,null), ($3,'1h',now()-interval '2 hours',now()-interval '1 hour'), ($4,'1h',now()+interval '1 hour',now()+interval '2 hours')", [host, unused, expired, future]);
    const admin = () => client.query('reset role');
    async function actor(uid, anonymous = false) {
      await client.query('set local role authenticated');
      await client.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
        [uid || '', JSON.stringify({ sub: uid, role: 'authenticated', is_anonymous: anonymous })]);
    }
    async function rejects(pattern, sql, args = []) {
      await client.query('savepoint expected_failure');
      await assert.rejects(client.query(sql, args), pattern);
      await client.query('rollback to savepoint expected_failure');
      await client.query('release savepoint expected_failure');
    }
    async function value(sql, args = []) { return (await client.query(sql, args)).rows[0].value; }
    async function create(password = 'secret', mode = 'casual', game = 'mindi', mindi = 'team2v2') {
      return value('select public.create_room($1,$2,$3,$4) as value', [game, password, mode, mindi]);
    }
    async function join(code, password = '', token = null) {
      return value('select public.join_room($1,$2,$3) as value', [code, password, token]);
    }
    async function joinFails(code, pattern, password = '', token = null) {
      const result = await join(code, password, token);
      assert.match(result.error, pattern);
    }
    async function seatOrder(code) {
      return (await client.query('select user_id from public.room_players where room_code=$1 order by seat_index', [code])).rows.map(row => row.user_id);
    }

    for (const uid of [noCard, unused, expired, future]) {
      await actor(uid);
      await rejects(/Activate a room card/, "select public.create_room('mindi')");
    }
    await actor(noCard);
    const duo = await create(null, 'rankedDuo');
    assert.equal(await value('select max_players as value from public.game_rooms where code=$1', [duo]), 2);
    await rejects(/require Mindi/, "select public.create_room('gin_rummy',null,'rankedDuo')");
    await actor(host);
    const code = await create();
    assert.deepEqual(await seatOrder(code), [host], 'Owner seat is created atomically');
    const visible = await value('select to_jsonb(r) as value from public.game_rooms r where code=$1', [code]);
    assert.equal(visible.owner_id, host);
    assert.equal(visible.has_password, true);
    assert.equal(visible.max_players, 4);
    assert.equal('password_hash' in visible, false);
    assert.equal(JSON.stringify(visible).includes('secret'), false);
    const open = await create(null, 'casual', 'gin_rummy');
    assert.equal(await value('select has_password as value from public.game_rooms where code=$1', [open]), false);
    assert.equal(await value('select max_players as value from public.game_rooms where code=$1', [open]), 2);
    assert.equal(await value('select max_players as value from public.game_rooms where code=$1', [await create(null, 'casual', 'mindi', 'ffa1v1')]), 2);
    const second = await create();
    await admin();
    const hashes = (await client.query('select password_hash from room_private.credentials where room_code=any($1::text[])', [[code, second]])).rows.map(row => row.password_hash);
    assert.equal(hashes.length, 2);
    assert.ok(hashes.every(hash => hash.startsWith('$2') && hash !== 'secret'));
    assert.notEqual(hashes[0], hashes[1], 'Each credential has its own salt');
    console.log('PASS creation: active-card authority, unused/expired/future denial, duo exemption, capacity, atomic owner seat, salted private credentials');

    await actor(host);
    for (const sql of [
      'select * from room_private.credentials',
      'select * from room_private.join_attempts',
      "select room_private.hash_password('secret')",
      "insert into public.game_rooms(code,game_type,owner_id,max_players) values ('BYPASS','mindi',auth.uid(),4)",
      `insert into public.room_players(room_code,user_id,seat_index) values ('${code}','${outsider}',1)`,
      `update public.game_rooms set status='started' where code='${code}'`,
      `update public.room_players set seat_index=2 where room_code='${code}'`,
      `delete from public.room_players where room_code='${code}'`,
      `insert into public.room_bans(room_code,user_id) values ('${code}','${outsider}')`,
    ]) await rejects(/permission denied/, sql);
    await client.query('set local role anon');
    await rejects(/permission denied/, "select public.create_room('mindi')");
    for (const uid of [guest, null]) {
      await actor(uid);
      await rejects(/permanent account/, "select public.create_room('mindi',null,'rankedDuo')");
      await rejects(/permanent account/, 'select public.join_room($1)', [code]);
      await rejects(/permanent account/, 'select public.create_room_invite_link($1)', [code]);
      await rejects(/permanent account/, 'select public.set_room_seat_order($1,$2)', [code, [host]]);
      await rejects(/permanent account/, 'select public.remove_room_player($1,$2)', [code, a]);
      await rejects(/permanent account/, 'select public.leave_room($1)', [code]);
    }
    await actor(host, true);
    await rejects(/permanent account/, "select public.create_room('mindi')");
    console.log('PASS caller/grants: anonymous and guest denial, private schema denial, direct creation/membership/status/seat bypass denial');

    await actor(guesser);
    for (let i = 0; i < 12; i++) await joinFails(code, /Incorrect room password/, `wrong-${i}`);
    await joinFails(code, /Too many/, 'secret');
    await joinFails(second, /Too many/, 'secret');
    await admin();
    assert.equal(await value('select attempts as value from room_private.join_attempts where user_id=$1', [guesser]), 13,
      'Failed guesses retain the counter rather than rolling it back');
    await client.query("update room_private.join_attempts set window_started_at=now()-interval '2 minutes' where user_id=$1", [guesser]);
    await actor(guesser);
    assert.deepEqual(await join(second, 'secret'), { ok: true });
    await actor(a);
    assert.deepEqual(await join(` ${code.toLowerCase()} `, 'secret'), { ok: true });
    assert.deepEqual(await join(code, 'wrong'), { ok: true }, 'Already-joined calls are idempotent');
    await actor(host);
    const token = await value('select public.create_room_invite_link($1) as value', [code]);
    await actor(b);
    assert.deepEqual(await join(code, '', token), { ok: true });
    await admin();
    const addressed = crypto.randomUUID();
    await client.query('insert into public.room_invites(id,room_code,from_user_id,to_user_id,game_type) values($1,$2,$3,$4,\'mindi\')', [addressed, code, a, c]);
    await actor(outsider);
    await joinFails(code, /expired|valid/, '', addressed);
    await joinFails(second, /expired|valid/, '', token);
    await actor(c);
    assert.deepEqual(await join(code, '', addressed), { ok: true });
    await actor(outsider);
    await joinFails(code, /full/, 'secret');
    await rejects(/room owner/, 'select public.set_room_seat_order($1,$2)', [code, [host, a, b, c]]);
    await rejects(/room owner/, 'select public.remove_room_player($1,$2)', [code, a]);
    await rejects(/room owner/, 'select public.leave_room($1,true)', [code]);
    await rejects(/Join a waiting room/, 'select public.create_room_invite_link($1)', [code]);
    console.log('PASS join: persisted global throttling and recovery, correct/incorrect passwords, idempotency, addressed/shared invites, wrong recipient/room and capacity');

    await actor(host);
    const expected = [host, b, a, c];
    await client.query('select public.set_room_seat_order($1,$2)', [code, expected]);
    assert.deepEqual(await seatOrder(code), expected, 'Occupied seats swap under the existing unique constraint');
    for (const invalid of [[host, host, a, c], [host, a], [host, a, b, outsider], [host, a, b, null], null]) {
      await rejects(/exactly the current players/, 'select public.set_room_seat_order($1,$2)', [code, invalid]);
      assert.deepEqual(await seatOrder(code), expected);
    }
    await admin();
    // Inject an error after NULL staging to prove statement rollback restores all seats.
    await client.query(`create function pg_temp.fail_room_seat_update() returns trigger language plpgsql as $$
      begin if old.seat_index is null and new.seat_index is not null then raise exception 'fixture seat failure'; end if; return new; end $$`);
    await client.query('create trigger private_room_test_failure before update on public.room_players for each row execute function pg_temp.fail_room_seat_update()');
    await actor(host);
    await rejects(/fixture seat failure/, 'select public.set_room_seat_order($1,$2)', [code, [host, a, b, c]]);
    assert.deepEqual(await seatOrder(code), expected, 'Failed reorder restores original seats');
    assert.equal(await value('select count(*)::int as value from public.room_players where room_code=$1 and seat_index is null', [code]), 0);
    await admin();
    await client.query('drop trigger private_room_test_failure on public.room_players');
    // Inject a failed owner-seat insert to prove no room or credential survives.
    const roomCount = await value('select count(*)::int as value from public.game_rooms');
    const hashCount = await value('select count(*)::int as value from room_private.credentials');
    await client.query("create function pg_temp.fail_room_seat_insert() returns trigger language plpgsql as $$ begin raise exception 'fixture owner seat failure'; end $$");
    await client.query('create trigger private_room_test_failure before insert on public.room_players for each row execute function pg_temp.fail_room_seat_insert()');
    await actor(host);
    await rejects(/fixture owner seat failure/, "select public.create_room('mindi','secret')");
    await admin();
    assert.equal(await value('select count(*)::int as value from public.game_rooms'), roomCount);
    assert.equal(await value('select count(*)::int as value from room_private.credentials'), hashCount);
    await client.query('drop trigger private_room_test_failure on public.room_players');
    console.log('PASS atomicity: occupied-seat swap, invalid permutations, rollback after NULL staging, rollback after owner-seat failure');

    await actor(c);
    await client.query('select public.leave_room($1)', [code]);
    assert.equal((await seatOrder(code)).includes(c), false);
    await actor(host);
    await client.query('select public.remove_room_player($1,$2,true)', [code, b]);
    await actor(b);
    await joinFails(code, /banned/, '', token);
    await actor(host);
    await client.query('select public.remove_room_player($1,$2,false)', [code, a]);
    await actor(c);
    await joinFails(code, /expired|valid/, '', addressed);
    await admin();
    await client.query("update public.room_invite_links set expires_at=now()-interval '1 second' where id=$1", [token]);
    await actor(outsider);
    await joinFails(code, /expired|valid/, '', token);
    await actor(a);
    assert.deepEqual(await join(open, 'unneeded password'), { ok: true });
    await admin();
    await client.query("update public.game_rooms set status='started' where code=$1", [open]);
    await actor(a);
    assert.deepEqual(await join(open), { ok: true });
    await actor(outsider);
    await joinFails(open, /already started/);
    await actor(host);
    await rejects(/waiting/, 'select public.set_room_seat_order($1,$2)', [open, [host, a]]);
    await rejects(/waiting/, 'select public.remove_room_player($1,$2)', [open, a]);
    await rejects(/already started/, 'select public.leave_room($1,true)', [open]);
    await client.query('select public.leave_room($1,true)', [code]);
    await joinFails(code, /closed/, 'secret');
    await rejects(/Room not found/, "select public.leave_room('DOESNOTEXIST')");
    console.log('PASS lifecycle: member leave, atomic ban/kick, stale sender and expired invites, started-room guards, host close, leave errors');
  } finally {
    await client.query('rollback');
    await client.end();
  }
  console.log('PASS private-room database integrity; all test writes rolled back');
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });

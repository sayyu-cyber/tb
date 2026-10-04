/**
 * Disposable local integration runner. Never reads .env, credentials or service keys.
 * Usage: node scripts/check-integrity-db.cjs [--check] [--keep-database] [--scoped]
 * Requires the parent's local PostgreSQL container: thaasbai-audit-db.
 * --check validates runner configuration/migration inventory without invoking Docker.
 * Each run creates a NEW database; SQL fixtures ROLLBACK and CAS race rows are deleted. By default the
 * new database is dropped afterward. --keep-database retains its migrated schema.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const CONTAINER = 'thaasbai-audit-db';
const root = path.resolve(__dirname, '..');
const isLocalDocker = endpoint => typeof endpoint === 'string' && (/^unix:\/\/\//.test(endpoint) || /^npipe:\/\/\/\/\.\/pipe\//.test(endpoint));

function options(args, env) {
  if (args.some(arg => !['--check', '--keep-database', '--help', '--scoped'].includes(arg))) {
    throw new Error('Only --check, --keep-database, --help and --scoped are allowed. Container, database and connection targets cannot be overridden.');
  }
  if (env.DOCKER_HOST && !isLocalDocker(env.DOCKER_HOST)) throw new Error('Refusing a nonlocal DOCKER_HOST. Only local Unix sockets or Windows named pipes are allowed.');
  return { check: args.includes('--check'), keep: args.includes('--keep-database'), help: args.includes('--help') };
}

const bootstrap = `
do $$ begin
  if not exists(select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create schema extensions;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}',
  raw_app_meta_data jsonb not null default '{}',
  is_anonymous boolean not null default false,
  aud text not null default 'authenticated',
  role text not null default 'authenticated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    jsonb_build_object('sub', nullif(current_setting('request.jwt.claim.sub', true), ''),
      'role', nullif(current_setting('request.jwt.claim.role', true), ''),
      'email', nullif(current_setting('request.jwt.claim.email', true), '')));
$$;
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), auth.jwt()->>'sub')::uuid;
$$;
create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role'; $$;
grant usage on schema auth, public, extensions to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
revoke create on schema public from public;
-- Set Supabase-like defaults BEFORE migrations so migration revocations remain effective.
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated, service_role;
create publication supabase_realtime;
`;

const policyChecks = `
begin;
set local statement_timeout = '15s';
set local lock_timeout = '5s';
insert into auth.users(id,email,raw_user_meta_data,is_anonymous)
select ('00000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,
  'fixture-' || i || '@example.invalid', jsonb_build_object('full_name','Integrity fixture ' || i), false
from generate_series(1,140) i;
update public.ranked_progress set
  trophies = right(user_id::text,12)::int,
  weekly_trophies = case right(user_id::text,12)::int when 138 then 9999 when 137 then 8000 when 139 then 1000 when 140 then 1000 else right(user_id::text,12)::int end,
  week_start = case when right(user_id::text,12)::int = 138 then date_trunc('week',now() at time zone 'UTC')::date - 7 else date_trunc('week',now() at time zone 'UTC')::date end,
  current_rank = case when right(user_id::text,12)::int = 137 then 'Bronze' else 'Silver' end;
insert into public.chat_rooms(id,type,metadata) values
 ('10000000-0000-4000-8000-000000000001','dm','{}'),
 ('10000000-0000-4000-8000-000000000002','dm','{}');
insert into public.chat_participants(room_id,user_id,display_name) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','One'),
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Two'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Two');
insert into public.matches(id,game_type,pool,status,public_state,completed_at) values
 ('20000000-0000-4000-8000-000000000001','mindi','casual','completed','{"tricksWon":{"A":9,"B":4}}',now()),
 ('20000000-0000-4000-8000-000000000002','mindi','casual','completed','{}',now());
insert into public.match_players(match_id,user_id,seat_index,team,result) values
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',0,'A','win'),
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',1,'B','loss'),
 ('20000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002',0,'A','win');
insert into public.match_results(match_id,winner_team,result) values
 ('20000000-0000-4000-8000-000000000001','A','{"verified":true,"outcome":{"tricksWon":{"A":9,"B":4}}}');
insert into public.player_private_match_state(match_id,user_id,private_state) values
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','{"hand":["own"]}'),
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','{"hand":["opponent"]}');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"fixture-1@example.invalid","is_anonymous":false}',true);
do $$ declare ids uuid[]; changed int; begin
  if current_user <> 'authenticated' or auth.uid() <> '00000000-0000-4000-8000-000000000001'::uuid then raise exception 'Role/JWT fixture failed'; end if;
  if (select count(*) from public.wallets) <> 1 then raise exception 'Wallet RLS leaked another player'; end if;
  if (select count(*) from public.profiles) <> 140 then raise exception 'Authenticated profile reads unavailable'; end if;
  select array_agg(user_id order by weekly_trophies desc,user_id) into ids from (
    select r.user_id,r.weekly_trophies from public.ranked_progress r join public.profiles p on p.id=r.user_id
    where r.week_start=date_trunc('week',now() at time zone 'UTC')::date
    order by r.weekly_trophies desc,r.user_id limit 50
  ) ranked;
  if cardinality(ids) <> 50 or ids[1] <> '00000000-0000-4000-8000-000000000137'::uuid
    or '00000000-0000-4000-8000-000000000138'::uuid = any(ids) then raise exception 'Weekly population/order/filter mismatch'; end if;
  select array_agg(user_id order by weekly_trophies desc,user_id) into ids from (
    select r.user_id,r.weekly_trophies from public.ranked_progress r join public.profiles p on p.id=r.user_id
    where r.week_start=date_trunc('week',now() at time zone 'UTC')::date and r.current_rank in ('Silver','Gold','Platinum')
    order by r.weekly_trophies desc,r.user_id limit 2
  ) ranked;
  if ids <> array['00000000-0000-4000-8000-000000000139','00000000-0000-4000-8000-000000000140']::uuid[] then raise exception 'League ties or qualification mismatch'; end if;
  if (select count(*) from public.chat_rooms) <> 1 or (select count(*) from public.chat_participants) <> 2 then raise exception 'Chat membership visibility mismatch'; end if;
  if (select count(*) from public.matches) <> 1 or (select count(*) from public.match_players) <> 2 then raise exception 'Match membership visibility mismatch'; end if;
  if (select count(*) from public.player_private_match_state) <> 1 then raise exception 'Opponent private state leaked'; end if;
  if (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id
    left join public.match_results mr on mr.match_id=m.id where mp.user_id=auth.uid() and m.status='completed') <> 1 then raise exception 'Completed history unavailable'; end if;
  update public.profiles set display_name='Updated own fixture' where id=auth.uid();
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Own profile update failed'; end if;
  update public.profiles set display_name='Forbidden' where id='00000000-0000-4000-8000-000000000002';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Another player profile can be changed'; end if;
  begin
    update public.wallets set coins=coins+1000 where user_id=auth.uid();
    if found then raise exception 'Authenticated wallet mutation allowed'; end if;
  exception when insufficient_privilege then null; end;
  begin
    update public.ranked_progress set trophies=trophies+1000 where user_id=auth.uid();
    if found then raise exception 'Authenticated trophy mutation allowed'; end if;
  exception when insufficient_privilege then null; end;
  begin
    update public.matches set public_state='{"forged":true}' where id='20000000-0000-4000-8000-000000000001';
    if found then raise exception 'Authenticated match-state mutation allowed'; end if;
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
  begin
    if exists(select 1 from public.wallets) then raise exception 'Anonymous wallet visibility'; end if;
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ begin
  if (select count(*) from public.wallets) <> 140 then raise exception 'Service role bypass fixture failed'; end if;
end $$;
reset role;
rollback;
do $$ begin
  if exists(select 1 from auth.users) then raise exception 'Policy fixtures did not roll back'; end if;
end $$;
`;

async function main() {
  const config = options(process.argv.slice(2), process.env);
  const scoped = process.argv.includes('--scoped');
  if (config.help) { console.log('node scripts/check-integrity-db.cjs [--check] [--keep-database] [--scoped]\nLocal Docker container thaasbai-audit-db only; unique scratch database; test rows always roll back.\n--scoped excludes parent-owned migration 009 and combined game policy checks; does not verify the full chain.'); return; }
  const directory = path.join(root, 'supabase/migrations');
  const migrations = fs.readdirSync(directory).filter(file => /^\d+_[\w-]+\.sql$/.test(file)).sort()
    .filter(file => !scoped || file !== '202610010009_match_authority.sql')
    .map(file => ({ file, sql: fs.readFileSync(path.join(directory, file), 'utf8') }));
  if (!migrations.length) throw new Error('No migrations found');
  if (config.check) {
    console.log(`CHECK ONLY: ${migrations.length} migrations; container ${CONTAINER}; no Docker commands executed.\n${migrations.map(item => item.file).join('\n')}`);
    return;
  }
  function docker(args, input) {
    const result = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 60_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    if (result.error || result.status !== 0) throw new Error(`docker ${args.slice(0, 3).join(' ')} failed: ${result.error?.message || result.stderr || result.stdout}`);
    return result.stdout.trim();
  }
  // Resolve and pin a context. Inspect only its endpoint, never container environment/credentials.
  const context = docker(['context', 'show']);
  const endpoint = JSON.parse(docker(['context', 'inspect', context, '--format', '{{json .Endpoints.docker.Host}}']));
  if (!isLocalDocker(endpoint)) throw new Error('Refusing a nonlocal Docker context endpoint');
  const prefix = ['--context', context];
  const info = JSON.parse(docker([...prefix, 'inspect', '--type', 'container', '--format', '{"name":{{json .Name}},"running":{{json .State.Running}},"image":{{json .Config.Image}}}', CONTAINER]));
  if (info.name !== `/${CONTAINER}` || !info.running || !/^(?:docker\.io\/(?:library\/)?|library\/)?postgres(?::|@|$)/.test(info.image)) {
    throw new Error('Expected a running local official postgres container named thaasbai-audit-db');
  }
  const database = `thaasbai_audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  if (!/^thaasbai_audit_\d+_[a-f0-9]{8}$/.test(database)) throw new Error('Invalid generated scratch database name');
  const psql = (db, sql) => docker([...prefix, 'exec', '-i', '--user', 'postgres', CONTAINER,
    'psql', '-X', '-w', '-h', '/var/run/postgresql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-f', '-'], sql);
  psql('postgres', `do $$ begin if inet_server_addr() is not null then raise exception 'Expected a local Unix socket'; end if; end $$;\ncreate database "${database}";`);
  console.log(`Created local scratch database ${database} in ${CONTAINER}`);
  if (scoped) console.log('SCOPED RUN: migration 009 and combined game policy checks excluded; full-chain verification remains separate.');
  try {
    psql(database, bootstrap);
    for (const migration of migrations) {
      try { psql(database, migration.sql); }
      catch (error) { throw new Error(`Migration ${migration.file}: ${error.message}`); }
      console.log(`PASS migration ${migration.file}`);
    }
    const failures = [];
    async function suite(label, action) {
      try {
        await action();
        psql(database, "do $$ begin if exists(select 1 from auth.users) then raise exception 'Suite fixtures did not roll back'; end if; end $$;");
        console.log(`PASS ${label}; fixture cleanup verified`);
      } catch (error) {
        failures.push(`${label}: ${error.message}`);
        console.error(`FAIL ${label}: ${error.message}`);
      }
    }
    if (!scoped) {
      await suite('ranking/history and authenticated/anon/service-role policies', () => psql(database, policyChecks));
      await suite('match-authority privacy, CAS and settlement', () => psql(database,
        fs.readFileSync(path.join(__dirname, 'check-match-authority-db.sql'), 'utf8')));
      await suite('match-authority concurrent CAS and settlement', () => {
        const { runConcurrentCas } = require('./check-match-authority.cjs');
        const args = [...prefix, 'exec', '-i', '--user', 'postgres', CONTAINER,
          'psql', '-X', '-w', '-h', '/var/run/postgresql', '-U', 'postgres', '-d', database,
          '-v', 'ON_ERROR_STOP=1', '-At', '-f', '-'];
        return runConcurrentCas(sql => docker(args, sql), args);
      });
    }
    for (const file of ['check-social-integrity-db.sql', 'check-economy-integrity.sql']) {
      await suite(file, () => psql(database, fs.readFileSync(path.join(__dirname, file), 'utf8')));
    }
    if (!scoped && migrations.some(({ file }) => file === '202610010011_verified_progress.sql')) {
      const file = 'check-verified-progress-db.sql';
      await suite(file, () => psql(database, fs.readFileSync(path.join(__dirname, file), 'utf8')));
    }
    await suite('private-room database integrity', () => {
      const ports = JSON.parse(docker([...prefix, 'inspect', '--format', '{{json .NetworkSettings.Ports}}', CONTAINER]));
      if (!ports['5432/tcp']?.some(port => port.HostIp === '127.0.0.1' && port.HostPort === '55439')) {
        throw new Error('Expected the audit container on 127.0.0.1:55439');
      }
      const result = spawnSync(process.execPath, [path.join(__dirname, 'check-private-room-integrity-db.cjs')], {
        env: { ...process.env, PRIVATE_ROOM_TEST_DATABASE_URL: `postgresql://postgres:local-audit-only@127.0.0.1:55439/${database}` },
        encoding: 'utf8', timeout: 60_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true,
      });
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || 'Room suite failed');
    });
    if (failures.length) throw new Error(failures.join('\n'));
  } finally {
    if (config.keep) console.log(`Kept local migrated scratch database ${database}; failed fixture transactions roll back on disconnect.`);
    else { psql('postgres', `drop database "${database}";`); console.log(`Dropped only this run's scratch database ${database}`); }
  }
}

module.exports = { isLocalDocker, options, bootstrap, policyChecks };
if (require.main === module) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

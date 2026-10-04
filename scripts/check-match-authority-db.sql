-- ONLY the parent's isolated local PostgreSQL harness, after all migrations.
-- Or: node scripts/check-match-authority.cjs --db (creates its own database).
-- Every fixture and temporary helper in this file rolls back.
\set ON_ERROR_STOP on
begin;
set local statement_timeout = '15s';
set local lock_timeout = '5s';

create temporary table authority_test_users(n integer primary key, id uuid not null);
insert into authority_test_users select n, gen_random_uuid() from generate_series(1,3) n;
insert into auth.users(id,email,raw_user_meta_data)
  select id,'authority-' || id || '@example.invalid',jsonb_build_object('name','Authority fixture ' || n) from authority_test_users;
create temporary table authority_test_match(id uuid);
create temporary table authority_test_baseline as
  select w.user_id,w.coins,w.total_earned,s.total_matches,s.wins,s.losses,r.trophies
  from public.wallets w join public.player_stats s using(user_id) join public.ranked_progress r using(user_id)
  where w.user_id in(select id from authority_test_users);
grant select on authority_test_users,authority_test_baseline to authenticated,anon,service_role;
grant all on authority_test_match to authenticated,anon,service_role;

create function pg_temp.authority_expect_denied(p_sql text)
returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when insufficient_privilege then return;
  end;
  raise exception 'Expected insufficient_privilege: %',p_sql;
end;
$$;

-- These ACL checks include inherited PUBLIC execution rights, not just named grants.
do $$ declare f record; role_name text; object_name text; privilege_name text; begin
  for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in('authority_candidates','authority_start','authority_load','authority_commit') loop
    foreach role_name in array array['anon','authenticated'] loop
      if has_function_privilege(role_name,f.oid,'EXECUTE') then raise exception '% can execute %',role_name,f.proname; end if;
    end loop;
    if not has_function_privilege('service_role',f.oid,'EXECUTE') then raise exception 'Service cannot execute %',f.proname; end if;
  end loop;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
    and p.proname in('authority_candidates','authority_start','authority_load','authority_commit')) <> 4 then raise exception 'Missing authority RPC'; end if;
  foreach role_name in array array['anon','authenticated'] loop
    if has_schema_privilege(role_name,'game_private','USAGE') then raise exception '% can access hidden schema',role_name; end if;
    if has_function_privilege(role_name,'public.try_form_match(public.game_type,public.match_pool,uuid[],jsonb)','EXECUTE') then raise exception '% can call legacy state builder',role_name; end if;
    foreach object_name in array array['matches','match_players'] loop
      foreach privilege_name in array array['INSERT','UPDATE','DELETE'] loop
        if has_table_privilege(role_name,'public.'||object_name,privilege_name) then raise exception '% has % on %',role_name,privilege_name,object_name; end if;
      end loop;
    end loop;
  end loop;
end $$;

-- Exercise the real authenticated queue entrypoint, then service-only formation.
select set_config('request.jwt.claim.sub',(select id::text from authority_test_users where n=1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from authority_test_users where n=1),'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
select public.join_matchmaking_queue('gin_rummy','casual');
select set_config('request.jwt.claim.sub',(select id::text from authority_test_users where n=2),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from authority_test_users where n=2),'role','authenticated','is_anonymous',false)::text,true);
select public.join_matchmaking_queue('gin_rummy','casual');
reset role;

set local role service_role;
do $$
declare a uuid := (select id from authority_test_users where n=1); b uuid := (select id from authority_test_users where n=2);
  ids uuid[]; candidate jsonb; tables jsonb; match_id uuid; replay_id uuid; state jsonb;
begin
  candidate := public.authority_candidates(a,'gin_rummy','casual',null,null);
  if candidate is null then raise exception 'Full queue did not form candidate'; end if;
  select array_agg(value::uuid order by ordinality) into ids from jsonb_array_elements_text(candidate->'players') with ordinality;
  if cardinality(ids)<>2 or not a=any(ids) or not b=any(ids) then raise exception 'Invalid candidate seats'; end if;
  -- Deliberately recognizable hidden cards let the read-policy checks detect leaks.
  state := jsonb_build_object('hands',jsonb_build_object(a::text,'[{"suit":"S","rank":1}]'::jsonb,b::text,'[{"suit":"H","rank":2}]'::jsonb),
    'stock','[{"suit":"D","rank":3}]'::jsonb,'discard','[{"suit":"C","rank":4}]'::jsonb,'turn',a,'phase','draw','result',null);
  tables := jsonb_build_array(jsonb_build_object('players',ids,'state',state,'deadline',extract(epoch from now()+interval '1 minute')*1000,
    'publicState',jsonb_build_object('hands','{}'::jsonb,'stock','[]'::jsonb,'stockCount',1,'discard',state->'discard','turn',a,'phase','draw'),
    'privateStates',jsonb_build_object(a::text,jsonb_build_object('hand',state#>array['hands',a::text]),b::text,jsonb_build_object('hand',state#>array['hands',b::text]))));
  match_id := public.authority_start(a,'gin_rummy','casual',ids,tables,null,null);
  if match_id is null then raise exception 'Service formation returned null'; end if;
  insert into authority_test_match values(match_id);
  replay_id := public.authority_start(a,'gin_rummy','casual',ids,tables,null,null);
  if replay_id is distinct from match_id then raise exception 'Duplicate formation made another table'; end if;
  if exists(select 1 from public.matchmaking_queue where user_id=any(ids)) then raise exception 'Formed users remain queued'; end if;
  if (public.authority_load(a,match_id)->>'revision')::integer<>0 then raise exception 'Initial revision is not zero'; end if;
  perform pg_temp.authority_expect_denied(format('select public.authority_load(%L,%L)',(select id from authority_test_users where n=3),match_id));
end $$;
reset role;

-- Actual reads and writes while impersonating a normal participant, then outsider.
select set_config('request.jwt.claim.sub',(select id::text from authority_test_users where n=1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from authority_test_users where n=1),'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
do $$
declare a uuid := (select id from authority_test_users where n=1); b uuid := (select id from authority_test_users where n=2);
  m uuid := (select id from authority_test_match); view jsonb; changed integer; queue_command text;
begin
  view := public.get_match_view(m);
  -- Casual skips time-dependent ranked eligibility. Both entrypoints must reject
  -- an active participant before they can insert or replace a queue row.
  foreach queue_command in array array[
    'select public.join_matchmaking_queue(''gin_rummy'',''casual'')',
    'select public.join_duo_queue(''ABCDEF'',''gin_rummy'',''casual'')'
  ] loop
    begin
      execute queue_command;
      raise exception 'Active participant was allowed to requeue';
    exception when raise_exception then
      if sqlerrm <> 'Finish or leave your active match before joining another queue' then raise; end if;
    end;
    if exists(select 1 from public.matchmaking_queue where user_id=a)
      or public.get_match_view(m) is distinct from view then raise exception 'Rejected requeue changed queue or match state'; end if;
  end loop;
  if view#>array['state','hands',a::text] is distinct from '[{"suit":"S","rank":1}]'::jsonb then raise exception 'Own hand missing'; end if;
  if (view#>'{state,hands}') ? b::text then raise exception 'Opponent hand leaked'; end if;
  if view#>'{state,stock}' is distinct from '[]'::jsonb then raise exception 'Stock leaked'; end if;
  if (select count(*) from public.player_private_match_state where match_id=m)<>1 then raise exception 'Private hand RLS leak'; end if;
  if (select public_state->'hands' from public.matches where id=m) is distinct from '{}'::jsonb then raise exception 'Raw matches hand leak'; end if;
  perform pg_temp.authority_expect_denied('select * from game_private.matches');
  perform pg_temp.authority_expect_denied(format('select public.authority_load(%L,%L)',a,m));
  perform pg_temp.authority_expect_denied(format('select public.authority_candidates(%L,''gin_rummy'',''casual'',null,null)',a));
  perform pg_temp.authority_expect_denied(format('select public.authority_start(%L,''gin_rummy'',''casual'',array[%L,%L]::uuid[],''[]'',null,null)',a,a,b));
  perform pg_temp.authority_expect_denied(format('select public.authority_commit(%L,%L,0,''{}'',''{}'',''{}'',0,array[%L]::uuid[])',a,m,a));
  perform pg_temp.authority_expect_denied(format('update public.matches set public_state=''{}'',status=''completed'' where id=%L',m));
  perform pg_temp.authority_expect_denied(format('update public.match_players set result=''win'' where match_id=%L',m));
  perform pg_temp.authority_expect_denied('insert into public.matches(game_type,pool) values(''gin_rummy'',''casual'')');
  perform pg_temp.authority_expect_denied(format('delete from public.matches where id=%L',m));
  -- RLS may forbid writes through zero affected rows instead of a grant error.
  begin
    update public.player_private_match_state set private_state='{"forged":true}' where match_id=m;
    get diagnostics changed = row_count;
    if changed<>0 then raise exception 'Participant mutated a private hand'; end if;
  exception when insufficient_privilege then null; end;
  begin
    insert into public.match_results(match_id,winner_user_id,result) values(m,a,'{"forged":true}');
    raise exception 'Participant forged settlement';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from authority_test_users where n=3),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from authority_test_users where n=3),'role','authenticated','is_anonymous',false)::text,true);
do $$ declare m uuid := (select id from authority_test_match); begin
  perform pg_temp.authority_expect_denied(format('select public.get_match_view(%L)',m));
  if exists(select 1 from public.matches where id=m) or exists(select 1 from public.player_private_match_state where match_id=m) then raise exception 'Outsider read match'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ declare m uuid := (select id from authority_test_match); a uuid := (select id from authority_test_users where n=1); begin
  perform pg_temp.authority_expect_denied(format('select public.authority_load(%L,%L)',a,m));
  perform pg_temp.authority_expect_denied(format('select public.get_match_view(%L)',m));
end $$;
reset role;

-- Stale CAS and completed-match retries must have no effect on money or history.
set local role service_role;
do $$
declare a uuid := (select id from authority_test_users where n=1); b uuid := (select id from authority_test_users where n=2);
  m uuid := (select id from authority_test_match); current_state jsonb; private_state jsonb; public_state jsonb; deadline double precision;
begin
  current_state := public.authority_load(a,m)->'state';
  public_state := (select matches.public_state from public.matches where id=m);
  private_state := jsonb_build_object(a::text,jsonb_build_object('hand',current_state#>array['hands',a::text]),b::text,jsonb_build_object('hand',current_state#>array['hands',b::text]));
  deadline := extract(epoch from now()+interval '30 seconds')*1000;
  perform pg_temp.authority_expect_denied(format('select public.authority_commit(%L,%L,0,''{}'',''{}'',''{}'',0,''{}'')',
    (select id from authority_test_users where n=3),m));
  -- An invalid winner fails after state publication inside the RPC. All those
  -- writes must roll back with the failed statement, not just the reward rows.
  begin
    perform public.authority_commit(a,m,0,'{"forged":true}','{"forged":true}',
      jsonb_build_object(a::text,jsonb_build_object('hand','[]'::jsonb)),deadline,
      array[(select id from authority_test_users where n=3)]);
    raise exception 'Invalid winner was accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid winner' then raise; end if;
  end;
  if (public.authority_load(a,m)->>'revision')::integer is distinct from 0
    or public.authority_load(a,m)->'state' is distinct from current_state
    or (select matches.public_state from public.matches where id=m) is distinct from public_state
    or (select p.private_state->'hand' from public.player_private_match_state p where p.match_id=m and p.user_id=a)
      is distinct from current_state#>array['hands',a::text]
    or exists(select 1 from public.match_results where match_id=m) then raise exception 'Failed settlement did not roll back atomically'; end if;
  if not public.authority_commit(a,m,0,current_state,public_state,private_state,deadline,'{}'::uuid[]) then raise exception 'Initial CAS failed'; end if;
  if public.authority_commit(b,m,0,'{"forged":true}','{}',private_state,deadline,array[b]) then raise exception 'Stale CAS accepted'; end if;
  if exists(select 1 from public.match_results where match_id=m) then raise exception 'Stale CAS settled match'; end if;
  if public.authority_load(a,m)->'state' is distinct from current_state then raise exception 'Stale CAS changed state'; end if;
  if exists(select 1 from public.wallets w join authority_test_baseline f using(user_id) where w.coins<>f.coins)
    or exists(select 1 from public.player_stats s join authority_test_baseline f using(user_id) where s.total_matches<>f.total_matches)
    then raise exception 'Unsettled or stale CAS awarded rewards'; end if;
  current_state := current_state||jsonb_build_object('result',jsonb_build_object('winnerUid',a,'score',25));
  if not public.authority_commit(a,m,1,current_state,public_state,private_state,deadline,array[a]) then raise exception 'Completion CAS failed'; end if;
  if public.authority_commit(a,m,1,current_state,public_state,private_state,deadline,array[a]) then raise exception 'Duplicate settlement accepted'; end if;
  if public.authority_commit(a,m,2,current_state,public_state,private_state,deadline,array[b]) then raise exception 'Completed match reopened'; end if;
end $$;
reset role;
do $$
declare a uuid := (select id from authority_test_users where n=1); b uuid := (select id from authority_test_users where n=2);
  m uuid := (select id from authority_test_match); fixture record; reward integer;
begin
  if (select revision from game_private.matches where match_id=m)<>2 or (select revision from public.matches where id=m)<>2 then raise exception 'CAS revision mismatch'; end if;
  if (select count(*) from public.match_results where match_id=m)<>1 then raise exception 'Settlement count mismatch'; end if;
  if (select status from public.matches where id=m)<>'completed' then raise exception 'Completion status missing'; end if;
  if (select count(*) from public.coin_transactions where metadata->>'matchId'=m::text)<>2 then raise exception 'Reward count mismatch'; end if;
  if (select result->>'verified' from public.match_results where match_id=m)<>'true' then raise exception 'Verified result missing'; end if;
  for fixture in select * from authority_test_baseline where user_id in(a,b) loop
    reward := case when fixture.user_id=a then 10 else 2 end;
    if (select coins from public.wallets where user_id=fixture.user_id)<>fixture.coins+reward then raise exception 'Wallet not settled exactly once'; end if;
    if (select total_earned from public.wallets where user_id=fixture.user_id)<>fixture.total_earned+reward then raise exception 'Lifetime earnings mismatch'; end if;
    if (select total_matches from public.player_stats where user_id=fixture.user_id)<>fixture.total_matches+1 then raise exception 'Stats not settled exactly once'; end if;
    if (select wins from public.player_stats where user_id=fixture.user_id)<>fixture.wins+(case when fixture.user_id=a then 1 else 0 end) then raise exception 'Win count mismatch'; end if;
    if (select losses from public.player_stats where user_id=fixture.user_id)<>fixture.losses+(case when fixture.user_id=b then 1 else 0 end) then raise exception 'Loss count mismatch'; end if;
    if (select trophies from public.ranked_progress where user_id=fixture.user_id)<>fixture.trophies then raise exception 'Casual game changed trophies'; end if;
  end loop;
end $$;
rollback;
\echo PASS service-only RPCs, formation replay, active-player requeue denial, private hand RLS, denied client writes, atomic failed settlement, stale CAS and settlement idempotency; fixtures rolled back

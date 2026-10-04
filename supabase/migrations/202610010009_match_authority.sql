-- Deploy together with the match-command Edge Function and the new web client.
-- Legacy active matches cannot be made fair after their hands have been exposed.
begin;
create schema if not exists game_private;
revoke all on schema game_private from public, anon, authenticated;
create table game_private.matches (
  match_id uuid primary key references public.matches(id) on delete cascade,
  state jsonb not null,
  revision bigint not null default 0,
  deadline timestamptz not null
);
revoke all on game_private.matches from public, anon, authenticated;
alter table public.matches add column authority_version integer not null default 0;
alter table public.matches add column revision bigint not null default 0;

-- Remove both table and column privileges left by 004.
revoke insert, update, delete on public.matches, public.match_players from anon, authenticated;
revoke update(public_state, status, completed_at) on public.matches from authenticated;
drop policy if exists "matches participant update" on public.matches;
revoke execute on function public.try_form_match(public.game_type, public.match_pool, uuid[], jsonb) from public, anon, authenticated;
revoke insert, update on public.matchmaking_queue from anon, authenticated;
update public.matches set status = 'abandoned', completed_at = now() where status = 'active';
-- Preserve historical scores, never preserve readable hidden hands/stock.
update public.matches set public_state = public_state - 'hands' - 'handsByUid' - 'stock';

create function game_private.check_eligibility(p_user uuid, p_pool public.match_pool)
returns void language plpgsql security definer set search_path = '' as $$
declare v_local timestamp := now() at time zone 'Indian/Maldives'; v_live boolean; v_daily integer := 3;
begin
  if not exists(select 1 from auth.users where id=p_user and not coalesce(is_anonymous,false)) then
    raise exception 'Sign in with a permanent account to play online' using errcode='42501';
  end if;
  if p_pool='casual' then return; end if;
  v_live := extract(isodow from v_local) in (5,6)
    or (extract(isodow from v_local)=4 and v_local::time >= time '23:59')
    or (extract(isodow from v_local)=7 and v_local::time < time '00:05');
  if p_pool='ranked' and v_live then raise exception 'Ranked is closed during Weekend League'; end if;
  if p_pool='weekend' and (not v_live or not exists(select 1 from public.ranked_progress where user_id=p_user and trophies>=25)) then
    raise exception 'Weekend League is unavailable for this player';
  end if;
  if exists(select 1 from public.vip_entitlements where user_id=p_user and active and expires_at>now()) then v_daily:=4; end if;
  if (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id
      where mp.user_id=p_user and m.pool<>'casual' and m.status<>'abandoned'
      and m.created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') >= v_daily then
    raise exception 'Daily match limit reached';
  end if;
  if (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id
      where mp.user_id=p_user and m.pool<>'casual' and m.status<>'abandoned'
      and m.created_at >= date_trunc('week',now() at time zone 'UTC') at time zone 'UTC') >= 15 then
    raise exception 'Weekly match limit reached';
  end if;
end;
$$;

create or replace function public.join_matchmaking_queue(p_game_type public.game_type,p_pool public.match_pool)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform game_private.check_eligibility(auth.uid(),p_pool);
  if exists(select 1 from public.match_players mp join public.matches m on m.id=mp.match_id where mp.user_id=auth.uid() and m.status='active') then
    raise exception 'Finish or leave your active match before joining another queue'; end if;
  if p_game_type='mindi' and p_pool='ranked' then raise exception 'Choose a partner for ranked Mindi'; end if;
  insert into public.matchmaking_queue(user_id,game_type,pool,party_id,queued_at,heartbeat_at)
  values(auth.uid(),p_game_type,p_pool,null,now(),now()) on conflict(user_id) do update set
    game_type=excluded.game_type,pool=excluded.pool,party_id=null,queued_at=now(),heartbeat_at=now();
end;
$$;
create function public.join_duo_queue(p_party text,p_game_type public.game_type,p_pool public.match_pool)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform game_private.check_eligibility(auth.uid(),p_pool);
  if exists(select 1 from public.match_players mp join public.matches m on m.id=mp.match_id where mp.user_id=auth.uid() and m.status='active') then
    raise exception 'Finish or leave your active match before joining another queue'; end if;
  if p_pool<>'ranked' or not exists(select 1 from public.game_rooms r join public.room_players rp on rp.room_code=r.code
    where r.code=p_party and r.game_type=p_game_type and r.mode='rankedDuo' and r.status='waiting' and rp.user_id=auth.uid()
    and (select count(*) from public.room_players where room_code=r.code)=2) then raise exception 'A full partner room is required'; end if;
  insert into public.matchmaking_queue(user_id,game_type,pool,party_id,queued_at,heartbeat_at)
    values(auth.uid(),p_game_type,p_pool,p_party,now(),now()) on conflict(user_id) do update set
      game_type=excluded.game_type,pool=excluded.pool,party_id=excluded.party_id,queued_at=now(),heartbeat_at=now();
end;
$$;

create function public.authority_candidates(p_actor uuid,p_game public.game_type,p_pool public.match_pool,p_party text default null,p_room text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_players uuid[]; v_other text; v_room public.game_rooms;
begin
  if p_room is not null then
    select * into v_room from public.game_rooms where code=p_room and owner_id=p_actor and mode='casual' and status='waiting';
    if not found then raise exception 'Room is unavailable or you are not its host'; end if;
    select array_agg(user_id order by seat_index) into v_players from public.room_players where room_code=p_room;
    if cardinality(v_players)<>v_room.max_players then raise exception 'The room is not full'; end if;
    p_game:=v_room.game_type; p_pool:='casual';
  else
    update public.matchmaking_queue set heartbeat_at=now() where user_id=p_actor and game_type=p_game and pool=p_pool
      and party_id is not distinct from p_party;
    if not found then return null; end if;
    if p_party is null then
      select array_agg(user_id order by queued_at,user_id) into v_players from (
        select user_id,queued_at from public.matchmaking_queue where game_type=p_game and pool=p_pool and party_id is null
        and heartbeat_at>now()-interval '2 minutes' order by queued_at,user_id limit case when p_game='mindi' then 4 else 2 end
      ) q;
      if cardinality(v_players)<>(case when p_game='mindi' then 4 else 2 end) or not(p_actor=any(v_players)) then return null; end if;
    else
      select party_id into v_other from public.matchmaking_queue where game_type=p_game and pool=p_pool
        and party_id is not null and party_id<>p_party and heartbeat_at>now()-interval '2 minutes'
        group by party_id having count(*)=2 order by min(queued_at),party_id limit 1;
      if v_other is null then return null; end if;
      -- Interleave partnerships: seats 0/2 and 1/3.
      select array_agg(user_id order by member_index,party_order) into v_players from (
        select user_id,row_number() over(partition by party_id order by queued_at,user_id) member_index,
          case when party_id=p_party then 0 else 1 end party_order
        from public.matchmaking_queue where game_type=p_game and pool=p_pool and party_id in(p_party,v_other)
          and heartbeat_at>now()-interval '2 minutes') q;
      if cardinality(v_players)<>4 or not(p_actor=any(v_players)) then return null; end if;
    end if;
  end if;
  perform game_private.check_eligibility(p_actor,p_pool);
  return jsonb_build_object('players',v_players,'game',p_game,'pool',p_pool,'room',p_room,'party',p_party);
end;
$$;

create function game_private.publish(p_match uuid,p_public jsonb,p_private jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.matches set public_state=p_public where id=p_match;
  insert into public.player_private_match_state(match_id,user_id,private_state)
    select p_match,key::uuid,value from jsonb_each(p_private)
    on conflict(match_id,user_id) do update set private_state=excluded.private_state,updated_at=now();
end;
$$;

create function public.authority_start(p_actor uuid,p_game public.game_type,p_pool public.match_pool,p_players uuid[],p_tables jsonb,p_room text default null,p_party text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_mine uuid; v_table jsonb; v_player uuid; v_existing uuid; v_expected integer; v_room public.game_rooms; v_actual uuid[]; v_party text;
begin
  perform pg_advisory_xact_lock(hashtext('authoritative-matchmaking'));
  select m.id into v_existing from public.matches m join public.match_players mp on mp.match_id=m.id where mp.user_id=p_actor and m.status='active' limit 1;
  if v_existing is not null then
    if p_room is not null then
      if exists(select 1 from public.game_rooms where code=p_room and owner_id=p_actor and match_id=v_existing and status='started') then return v_existing; end if;
      raise exception 'You already have an active match';
    end if;
    if exists(select 1 from public.matches where id=v_existing and game_type=p_game and pool=p_pool) then return v_existing; end if;
    raise exception 'You already have an active match';
  end if;
  if not(p_actor=any(p_players)) or (select count(distinct x) from unnest(p_players)x)<>cardinality(p_players) then raise exception 'Invalid players'; end if;
  if jsonb_typeof(p_tables)<>'array' then raise exception 'Invalid table allocation'; end if;
  select array_agg(player::uuid order by table_order,seat_order) into v_actual
    from jsonb_array_elements(p_tables) with ordinality t(tab,table_order)
    cross join lateral jsonb_array_elements_text(tab->'players') with ordinality p(player,seat_order);
  if v_actual is distinct from p_players or jsonb_array_length(p_tables)<>(case when p_game='gin_rummy' and cardinality(p_players)=4 then 2 else 1 end) then
    raise exception 'Invalid table allocation'; end if;
  for v_table in select value from jsonb_array_elements(p_tables) loop
    if jsonb_array_length(v_table->'players')<>(case when p_game='gin_rummy' then 2 else cardinality(p_players) end)
      or (select array_agg(key order by key) from jsonb_each(v_table->'privateStates')) is distinct from
        (select array_agg(value order by value) from jsonb_array_elements_text(v_table->'players')) then raise exception 'Invalid private recipients'; end if;
  end loop;
  if p_room is not null then
    select * into v_room from public.game_rooms where code=p_room for update;
    if not found or v_room.owner_id<>p_actor or v_room.status<>'waiting' or v_room.mode<>'casual' or v_room.game_type<>p_game or p_pool<>'casual' then raise exception 'Invalid room'; end if;
    perform 1 from public.room_players where room_code=p_room order by user_id for update;
    select array_agg(user_id order by seat_index) into v_actual from public.room_players where room_code=p_room;
    if v_actual is distinct from p_players or cardinality(p_players)<>v_room.max_players then raise exception 'Room seats changed'; end if;
    if not exists(select 1 from public.room_cards where user_id=p_actor and activated_at is not null and activated_at<=clock_timestamp() and expires_at>clock_timestamp()) then raise exception 'An active Room Card is required'; end if;
  else
    v_expected:=case when p_party is not null or p_game='mindi' then 4 else 2 end;
    if cardinality(p_players)<>v_expected then raise exception 'Invalid player count'; end if;
    perform 1 from public.matchmaking_queue where user_id=any(p_players) order by user_id for update;
    if (select count(*) from public.matchmaking_queue where user_id=any(p_players) and game_type=p_game and pool=p_pool
      and heartbeat_at>now()-interval '2 minutes' and (p_party is not null or party_id is null))<>v_expected then return null; end if;
    if p_party is not null then
      if (select count(distinct party_id) from public.matchmaking_queue where user_id=any(p_players))<>2 then return null; end if;
      if exists(select 1 from public.matchmaking_queue where user_id=any(p_players) group by party_id having count(*)<>2) then return null; end if;
      if not exists(select 1 from public.matchmaking_queue where user_id=p_actor and party_id=p_party) then return null; end if;
      if p_pool<>'ranked' then raise exception 'Invalid duo pool'; end if;
      for v_party in select distinct party_id from public.matchmaking_queue where user_id=any(p_players) order by party_id loop
        select * into v_room from public.game_rooms where code=v_party for update;
        if not found or v_room.status<>'waiting' or v_room.mode<>'rankedDuo' or v_room.game_type<>p_game then raise exception 'Partner room is no longer available'; end if;
        perform 1 from public.room_players where room_code=v_party order by user_id for update;
        if (select array_agg(user_id order by user_id) from public.room_players where room_code=v_party) is distinct from
           (select array_agg(user_id order by user_id) from public.matchmaking_queue where user_id=any(p_players) and party_id=v_party) then raise exception 'Partner room membership changed'; end if;
      end loop;
      if p_game='mindi' and ((select party_id from public.matchmaking_queue where user_id=p_players[1]) is distinct from
         (select party_id from public.matchmaking_queue where user_id=p_players[3]) or
         (select party_id from public.matchmaking_queue where user_id=p_players[2]) is distinct from
         (select party_id from public.matchmaking_queue where user_id=p_players[4])) then raise exception 'Invalid partnership seating'; end if;
    end if;
  end if;
  foreach v_player in array p_players loop
    perform game_private.check_eligibility(v_player,p_pool);
    if exists(select 1 from public.match_players mp join public.matches m on m.id=mp.match_id where mp.user_id=v_player and m.status='active') then return null; end if;
  end loop;
  for v_table in select value from jsonb_array_elements(p_tables) loop
    insert into public.matches(game_type,pool,authority_version) values(p_game,p_pool,1) returning id into v_id;
    insert into public.match_players(match_id,user_id,seat_index,team)
      select v_id,value::uuid,(ordinality-1)::integer,case when (ordinality-1)%2=0 then 'A' else 'B' end
      from jsonb_array_elements_text(v_table->'players') with ordinality;
    insert into game_private.matches(match_id,state,deadline) values(v_id,v_table->'state',to_timestamp((v_table->>'deadline')::double precision/1000));
    perform game_private.publish(v_id,v_table->'publicState',v_table->'privateStates');
    if (v_table->'players') ? p_actor::text then v_mine:=v_id; end if;
  end loop;
  if v_mine is null then raise exception 'Invalid table allocation'; end if;
  delete from public.matchmaking_queue where user_id=any(p_players);
  if p_room is not null then update public.game_rooms set status='started',match_id=v_mine where code=p_room; end if;
  return v_mine;
end;
$$;

create function public.authority_load(p_actor uuid,p_match uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
  if not exists(select 1 from public.match_players where match_id=p_match and user_id=p_actor) then raise exception 'Not a participant' using errcode='42501'; end if;
  select jsonb_build_object('game',m.game_type,'pool',m.pool,'players',(select jsonb_agg(user_id order by seat_index) from public.match_players where match_id=m.id),
    'state',a.state,'revision',a.revision,'deadline',extract(epoch from a.deadline)*1000,'completed',m.status<>'active') into v_result
    from public.matches m join game_private.matches a on a.match_id=m.id where m.id=p_match;
  if v_result is null then raise exception 'This legacy table has closed. Please join a new match.'; end if;
  return v_result;
end;
$$;

create function public.authority_commit(p_actor uuid,p_match uuid,p_revision bigint,p_state jsonb,p_public jsonb,p_private jsonb,p_deadline double precision,p_winners uuid[])
returns boolean language plpgsql security definer set search_path='' as $$
declare v_authority game_private.matches; v_match public.matches; v_user uuid; v_win boolean; v_delta integer; v_coins integer;
  v_trophies integer; v_peak integer; v_rank text; v_week date:=(date_trunc('week',now() at time zone 'UTC'))::date; v_favorite text;
begin
  if not exists(select 1 from public.match_players where match_id=p_match and user_id=p_actor) then raise exception 'Not a participant' using errcode='42501'; end if;
  select * into v_authority from game_private.matches where match_id=p_match for update;
  select * into v_match from public.matches where id=p_match for update;
  if v_authority.revision is distinct from p_revision or v_match.status<>'active' then return false; end if;
  update game_private.matches set state=p_state,revision=revision+1,deadline=to_timestamp(p_deadline/1000) where match_id=p_match;
  perform game_private.publish(p_match,p_public,p_private);
  update public.matches set revision=revision+1 where id=p_match;
  if cardinality(p_winners)>0 then
    if exists(select 1 from unnest(p_winners)u where not exists(select 1 from public.match_players where match_id=p_match and user_id=u)) then raise exception 'Invalid winner'; end if;
    insert into public.match_results(match_id,winner_user_id,winner_team,result) values(p_match,
      case when cardinality(p_winners)=1 then p_winners[1] else null end,p_state#>>'{outcome,winner}',
      jsonb_build_object('winners',p_winners,'outcome',coalesce(p_state->'outcome',p_state->'result'),'verified',true));
    update public.matches set status='completed',completed_at=now() where id=p_match;
    for v_user in select user_id from public.match_players where match_id=p_match order by user_id loop
      v_win:=v_user=any(p_winners); v_coins:=case when v_win then 10 else 2 end;
      v_delta:=case when v_match.pool='casual' then 0 else (case when v_win then 5 else -2 end)*(case when v_match.pool='weekend' then 2 else 1 end) end;
      update public.match_players set result=case when v_win then 'win' else 'loss' end where match_id=p_match and user_id=v_user;
      -- Lock in stable order; wallet and stats settle in this transaction, once.
      perform 1 from public.wallets where user_id=v_user for update;
      perform public.ensure_economy_missions(v_user);
      update public.wallets set coins=coins+v_coins,total_earned=total_earned+v_coins where user_id=v_user;
      insert into public.coin_transactions(user_id,amount,type,source,description,metadata) values(v_user,v_coins,'earn',case when v_win then 'match_victory' else 'match_defeat' end,
        'Verified match reward',jsonb_build_object('rewardKey','match:'||p_match::text,'matchId',p_match));
      update public.ranked_progress set trophies=greatest(0,trophies+v_delta),
        weekly_trophies=greatest(0,case when week_start=v_week then weekly_trophies else 0 end+v_delta),week_start=v_week,updated_at=now()
        where user_id=v_user returning trophies into v_trophies;
      v_rank:=case when v_trophies>=75 then 'Platinum' when v_trophies>=50 then 'Gold' when v_trophies>=25 then 'Silver' else 'Bronze' end;
      select greatest(peak_trophies,v_trophies) into v_peak from public.player_stats where user_id=v_user for update;
      select case when m.game_type='mindi' then 'Mindi' else 'Gin Rummy' end into v_favorite from public.match_players mp
        join public.matches m on m.id=mp.match_id join public.match_results mr on mr.match_id=m.id
        where mp.user_id=v_user and mr.result->>'verified'='true' group by m.game_type order by count(*) desc,m.game_type limit 1;
      update public.player_stats set total_matches=total_matches+1,wins=wins+case when v_win then 1 else 0 end,
        losses=losses+case when v_win then 0 else 1 end,win_percentage=round(100.0*(wins+case when v_win then 1 else 0 end)/(total_matches+1)),
        favorite_game=v_favorite,peak_trophies=v_peak,highest_rank=case when v_peak>=75 then 'Platinum' when v_peak>=50 then 'Gold' when v_peak>=25 then 'Silver' else 'Bronze' end,updated_at=now() where user_id=v_user;
      update public.ranked_progress set current_rank=v_rank,highest_rank=(select highest_rank from public.player_stats where user_id=v_user) where user_id=v_user;
      update public.user_missions set progress=least(target,progress+1),completed=progress+1>=target,
        completed_at=case when progress+1>=target then now() else null end,verified_at=now()
        where user_id=v_user and not completed and period_start =
          case cadence when 'daily' then (now() at time zone 'UTC')::date else date_trunc('week',now() at time zone 'UTC')::date end
        and (template_id in('dm_play_1','dm_play_3','wm_play_20') or (v_win and template_id in('dm_win_1','dm_win_2','wm_win_10'))
          or (v_match.game_type='mindi' and template_id='dm_play_mindi') or(v_match.game_type='gin_rummy' and template_id='dm_play_gin'));
    end loop;
  end if;
  return true;
end;
$$;

create function public.get_match_view(p_match uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_match public.matches; v_state jsonb; v_hand jsonb;
begin
  if not public.is_match_participant(p_match) then raise exception 'Not a participant' using errcode='42501'; end if;
  select * into v_match from public.matches where id=p_match;
  if v_match.status='abandoned' then return null; end if;
  select private_state->'hand' into v_hand from public.player_private_match_state where match_id=p_match and user_id=auth.uid();
  v_state:=v_match.public_state;
  if v_match.game_type='mindi' then v_state:=v_state||jsonb_build_object('handsByUid',jsonb_build_object(auth.uid()::text,coalesce(v_hand,'[]'::jsonb)));
  else v_state:=v_state||jsonb_build_object('hands',coalesce(v_state->'hands','{}'::jsonb)||jsonb_build_object(auth.uid()::text,coalesce(v_hand,'[]'::jsonb))); end if;
  return jsonb_build_object('gameType',v_match.game_type,'pool',v_match.pool,'status',v_match.status,'createdAt',extract(epoch from v_match.created_at)*1000,
    'revision',v_match.revision,'players',(select jsonb_agg(user_id order by seat_index) from public.match_players where match_id=p_match),'state',v_state);
end;
$$;

revoke all on all functions in schema game_private from public,anon,authenticated;
revoke all on function public.join_duo_queue(text,public.game_type,public.match_pool),public.get_match_view(uuid) from public,anon;
grant execute on function public.join_duo_queue(text,public.game_type,public.match_pool),public.get_match_view(uuid) to authenticated;
revoke all on function public.authority_candidates(uuid,public.game_type,public.match_pool,text,text),
  public.authority_start(uuid,public.game_type,public.match_pool,uuid[],jsonb,text,text),public.authority_load(uuid,uuid),
  public.authority_commit(uuid,uuid,bigint,jsonb,jsonb,jsonb,double precision,uuid[]) from public,anon,authenticated;
grant execute on function public.authority_candidates(uuid,public.game_type,public.match_pool,text,text),
  public.authority_start(uuid,public.game_type,public.match_pool,uuid[],jsonb,text,text),public.authority_load(uuid,uuid),
  public.authority_commit(uuid,uuid,bigint,jsonb,jsonb,jsonb,double precision,uuid[]) to service_role;
do $$ declare t text; begin foreach t in array array['player_stats','ranked_progress'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
    execute format('alter publication supabase_realtime add table public.%I',t); end if;
end loop; end $$;
notify pgrst,'reload schema';
commit;

-- Match membership must bypass its own SELECT policy to avoid 42P17 recursion.
create or replace function public.is_match_participant(p_match_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.match_players
    where match_id = p_match_id and user_id = auth.uid()
  );
$$;
revoke all on function public.is_match_participant(uuid) from public, anon;
grant execute on function public.is_match_participant(uuid) to authenticated;

drop policy if exists "match players participant read" on public.match_players;
create policy "match players participant read" on public.match_players
  for select to authenticated using (public.is_match_participant(match_id));

-- Participants can advance the game, but cannot rewrite its identity or pool.
drop policy if exists "matches participant update" on public.matches;
create policy "matches participant update" on public.matches
  for update to authenticated
  using (public.is_match_participant(id)) with check (public.is_match_participant(id));
revoke update on public.matches from authenticated;
grant update (public_state, status, completed_at) on public.matches to authenticated;

alter table public.matchmaking_queue
  add column if not exists heartbeat_at timestamptz not null default now();
create index if not exists matchmaking_queue_pool_idx
  on public.matchmaking_queue (game_type, pool, queued_at);

create or replace function public.join_matchmaking_queue(p_game_type public.game_type, p_pool public.match_pool)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to find a table' using errcode = '42501'; end if;
  insert into public.matchmaking_queue (user_id, game_type, pool, party_id, queued_at, heartbeat_at)
  values (auth.uid(), p_game_type, p_pool, null, now(), now())
  on conflict (user_id) do update set
    game_type = excluded.game_type, pool = excluded.pool, party_id = null,
    queued_at = excluded.queued_at, heartbeat_at = excluded.heartbeat_at;
end;
$$;

-- Refresh liveness without moving a waiting player to the back of the queue.
create or replace function public.refresh_matchmaking_queue(p_game_type public.game_type, p_pool public.match_pool)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.matchmaking_queue set heartbeat_at = now()
    where user_id = auth.uid() and game_type = p_game_type and pool = p_pool and party_id is null;
  return found;
end;
$$;

-- The client builds the engine state for the selected seat order. Recheck and
-- consume every seat under one lock, so concurrent callers cannot split a table
-- or create matches with the same players. No client-side membership inserts.
create or replace function public.try_form_match(
  p_game_type public.game_type, p_pool public.match_pool, p_players uuid[], p_state jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_needed integer := case when p_game_type = 'mindi' then 4 else 2 end;
  v_count integer;
  v_match_id uuid;
begin
  if auth.uid() is null or not (auth.uid() = any(p_players)) then
    raise exception 'You must be one of the queued players' using errcode = '42501';
  end if;
  if cardinality(p_players) <> v_needed or
     (select count(distinct player) from unnest(p_players) player) <> v_needed or
     p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'Invalid table configuration' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('matchmaking:' || p_game_type::text || ':' || p_pool::text));

  select m.id into v_match_id from public.matches m
    join public.match_players mp on mp.match_id = m.id
    where mp.user_id = auth.uid() and m.status = 'active' and m.game_type = p_game_type and m.pool = p_pool
    order by m.created_at desc limit 1;
  if v_match_id is not null then return v_match_id; end if;

  -- A late caller may already have had its queue entry consumed by another
  -- table. Lock rows before validation to serialize against queue cancellation.
  perform 1 from public.matchmaking_queue
    where user_id = any(p_players) order by user_id for update;
  select count(*) into v_count from public.matchmaking_queue
    where user_id = any(p_players) and game_type = p_game_type and pool = p_pool
      and party_id is null and heartbeat_at >= now() - interval '2 minutes';
  if v_count <> v_needed then return null; end if;
  if exists (
    select 1 from public.match_players mp join public.matches m on m.id = mp.match_id
    where mp.user_id = any(p_players) and m.status = 'active' and m.game_type = p_game_type and m.pool = p_pool
  ) then return null; end if;

  insert into public.matches (game_type, pool, status, public_state)
    values (p_game_type, p_pool, 'active', p_state) returning id into v_match_id;
  insert into public.match_players (match_id, user_id, seat_index)
    select v_match_id, player, seat::integer - 1 from unnest(p_players) with ordinality as seats(player, seat);
  delete from public.matchmaking_queue where user_id = any(p_players);
  return v_match_id;
end;
$$;

revoke all on function public.join_matchmaking_queue(public.game_type, public.match_pool) from public, anon;
revoke all on function public.refresh_matchmaking_queue(public.game_type, public.match_pool) from public, anon;
revoke all on function public.try_form_match(public.game_type, public.match_pool, uuid[], jsonb) from public, anon;
grant execute on function public.join_matchmaking_queue(public.game_type, public.match_pool) to authenticated;
grant execute on function public.refresh_matchmaking_queue(public.game_type, public.match_pool) to authenticated;
grant execute on function public.try_form_match(public.game_type, public.match_pool, uuid[], jsonb) to authenticated;
notify pgrst, 'reload schema';

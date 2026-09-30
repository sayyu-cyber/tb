alter table public.room_invites add column if not exists expires_at timestamptz;
update public.room_invites set expires_at = created_at + interval '5 minutes' where expires_at is null;
alter table public.room_invites alter column expires_at set default (now() + interval '5 minutes');
alter table public.room_invites alter column expires_at set not null;
create or replace function public.set_room_invite_expiry()
returns trigger language plpgsql set search_path = '' as $$
begin new.created_at := now(); new.expires_at := now() + interval '5 minutes'; return new; end;
$$;
drop trigger if exists room_invite_expiry on public.room_invites;
create trigger room_invite_expiry before insert on public.room_invites for each row execute function public.set_room_invite_expiry();
drop policy if exists "room invites sender insert" on public.room_invites;
create policy "room invites sender insert" on public.room_invites for insert to authenticated with check (
  auth.uid() = from_user_id and exists (select 1 from public.room_players where room_code = room_invites.room_code and user_id = auth.uid())
);

create table if not exists public.room_invite_links (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.game_rooms(code) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);
alter table public.room_invite_links enable row level security;

create or replace function public.create_room_invite_link(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.room_players where room_code = p_code and user_id = auth.uid()) then
    raise exception 'Join the room before sharing an invite' using errcode = '42501';
  end if;
  insert into public.room_invite_links (room_code) values (p_code) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.join_room(p_code text, p_password text default '', p_invite uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_room public.game_rooms;
  v_invited boolean := false;
  v_seat integer;
begin
  if auth.uid() is null then raise exception 'Sign in to join a private room' using errcode = '42501'; end if;
  select * into v_room from public.game_rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Room not found. The invite may have expired.'; end if;
  if exists (select 1 from public.room_bans where room_code = v_room.code and user_id = auth.uid()) then
    raise exception 'You have been banned from this room';
  end if;
  if v_room.status = 'closed' then raise exception 'This room has closed'; end if;
  -- Reopening an already joined room is idempotent, even after play starts.
  if exists (select 1 from public.room_players where room_code = v_room.code and user_id = auth.uid()) then return; end if;
  if v_room.status = 'started' then raise exception 'This room has already started'; end if;
  if p_invite is not null then
    v_invited := exists (select 1 from public.room_invites where id = p_invite and room_code = v_room.code
      and to_user_id = auth.uid() and expires_at > now()
      and exists (select 1 from public.room_players where room_code = v_room.code and user_id = room_invites.from_user_id))
      or exists (select 1 from public.room_invite_links where id = p_invite and room_code = v_room.code and expires_at > now());
    if not v_invited then raise exception 'This invite has expired or is no longer valid. Ask the host for a new invite.'; end if;
  end if;
  if not v_invited and coalesce(v_room.password_hash, '') <> coalesce(p_password, '') then
    raise exception 'Incorrect room password';
  end if;
  if (select count(*) from public.room_players where room_code = v_room.code) >= v_room.max_players then
    raise exception 'This room is full';
  end if;
  select seat into v_seat from generate_series(0, v_room.max_players - 1) seat
    where not exists (select 1 from public.room_players where room_code = v_room.code and seat_index = seat)
    order by seat limit 1;
  insert into public.room_players (room_code, user_id, display_name, seat_index)
    select v_room.code, id, display_name, v_seat from public.profiles where id = auth.uid();
  -- Keep the invite row until expiry: repeated clicks remain idempotent.
end;
$$;
drop policy if exists "room players self insert" on public.room_players;
drop policy if exists "room players host insert" on public.room_players;
create policy "room players host insert" on public.room_players for insert to authenticated with check (
  auth.uid() = user_id and exists (select 1 from public.game_rooms where code = room_code and owner_id = auth.uid())
);
revoke all on function public.create_room_invite_link(text) from public, anon;
revoke all on function public.join_room(text, text, uuid) from public, anon;
grant execute on function public.create_room_invite_link(text) to authenticated;
grant execute on function public.join_room(text, text, uuid) to authenticated;
notify pgrst, 'reload schema';

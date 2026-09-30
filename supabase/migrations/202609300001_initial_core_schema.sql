-- Thaasbai Supabase core schema.
-- Firebase remains the live backend until this schema is applied, typed, and
-- individual app features are migrated behind dual-backend adapters.

create extension if not exists pgcrypto;

create type public.friend_request_status as enum ('pending', 'accepted', 'declined');
create type public.game_type as enum ('mindi', 'gin_rummy');
create type public.match_pool as enum ('ranked', 'weekend', 'casual');
create type public.match_status as enum ('active', 'completed', 'abandoned');
create type public.room_status as enum ('waiting', 'started', 'closed');
create type public.room_mode as enum ('casual', 'rankedDuo');
create type public.mindi_room_mode as enum ('team2v2', 'ffa1v1');
create type public.coin_transaction_type as enum ('earn', 'spend');
create type public.topup_status as enum ('pending', 'approved', 'rejected', 'credited');
create type public.report_status as enum ('open', 'actioned', 'dismissed');
create type public.report_reason as enum ('harassment', 'hate', 'sexual', 'spam', 'cheating', 'impersonation', 'other');
create type public.report_context as enum ('message', 'club', 'profile', 'match');
create type public.chat_room_type as enum ('dm', 'club');
create type public.room_card_type as enum ('1h', '3h', '6h', '24h', '1w', '1m');

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = any (array['sayyu9898@gmail.com']);
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  photo_url text,
  avatar_preset text,
  banner_preset text,
  player_code text unique,
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_matches integer not null default 0 check (total_matches >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  win_percentage integer not null default 0 check (win_percentage between 0 and 100),
  favorite_game text,
  peak_trophies integer not null default 0 check (peak_trophies >= 0),
  highest_rank text not null default 'Unranked',
  updated_at timestamptz not null default now()
);

create table public.ranked_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  trophies integer not null default 0 check (trophies >= 0),
  weekly_trophies integer not null default 0 check (weekly_trophies >= 0),
  week_start date,
  current_rank text not null default 'Unranked',
  highest_rank text not null default 'Unranked',
  updated_at timestamptz not null default now()
);

create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  coins integer not null default 100 check (coins >= 0),
  total_earned integer not null default 100 check (total_earned >= 0),
  total_spent integer not null default 0 check (total_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  type public.coin_transaction_type not null,
  source text not null,
  description text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table public.inventory_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null,
  category text not null,
  acquired_at timestamptz not null default now(),
  source text,
  primary key (user_id, item_id)
);

create table public.equipped_cosmetics (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  card_back text not null default 'cb_default',
  table_theme text not null default 'tt_default',
  profile_frame text not null default 'pf_default',
  title text not null default 'Novice',
  victory_animation text not null default 'va_default',
  banner text not null default 'bn_default',
  updated_at timestamptz not null default now()
);

create table public.room_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.room_card_type not null,
  purchased_at timestamptz not null default now(),
  activated_at timestamptz,
  expires_at timestamptz,
  source text
);

create table public.user_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cadence text not null check (cadence in ('daily', 'weekly')),
  template_id text not null,
  title text not null,
  description text not null,
  target integer not null check (target > 0),
  progress integer not null default 0 check (progress >= 0),
  completed boolean not null default false,
  reward integer not null default 0 check (reward >= 0),
  reward_cosmetic_id text,
  generated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  progress integer not null default 0 check (progress >= 0),
  target integer not null default 1 check (target > 0),
  unlocked_at timestamptz,
  primary key (user_id, achievement_id)
);

create table public.daily_rewards (
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_day integer not null check (reward_day between 1 and 7),
  claimed_at timestamptz,
  cycle_started_at timestamptz not null default now(),
  primary key (user_id, reward_day, cycle_started_at)
);

create table public.vip_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  active boolean not null default false,
  activated_at timestamptz,
  expires_at timestamptz
);

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);

create unique index friend_requests_open_pair_idx
  on public.friend_requests (least(from_user_id, to_user_id), greatest(from_user_id, to_user_id))
  where status in ('pending', 'accepted');

create table public.room_invites (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  room_code text not null,
  game_type public.game_type not null,
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  type public.chat_room_type not null,
  created_at timestamptz not null default now(),
  last_message text not null default '',
  last_message_at timestamptz,
  last_sender_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table public.chat_participants (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null default 'Player',
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  tag text not null check (char_length(tag) between 2 and 5),
  description text not null default '' check (char_length(description) <= 200),
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null default 'Player',
  trophies integer not null default 0 check (trophies >= 0),
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create unique index club_members_one_club_per_user_idx on public.club_members (user_id);

create table public.club_messages (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null default 'Player',
  text text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.game_rooms (
  code text primary key,
  game_type public.game_type not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  password_hash text,
  max_players integer not null check (max_players between 2 and 4),
  status public.room_status not null default 'waiting',
  match_id uuid,
  mode public.room_mode not null default 'casual',
  mindi_mode public.mindi_room_mode,
  created_at timestamptz not null default now()
);

create table public.room_players (
  room_code text not null references public.game_rooms(code) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null default 'Player',
  seat_index integer,
  joined_at timestamptz not null default now(),
  primary key (room_code, user_id),
  unique (room_code, seat_index)
);

create table public.room_bans (
  room_code text not null references public.game_rooms(code) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_code, user_id)
);

create table public.matchmaking_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  game_type public.game_type not null,
  pool public.match_pool not null default 'ranked',
  party_id text,
  queued_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  game_type public.game_type not null,
  pool public.match_pool not null default 'ranked',
  status public.match_status not null default 'active',
  public_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.game_rooms
  add constraint game_rooms_match_id_fkey foreign key (match_id) references public.matches(id) on delete set null;

create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seat_index integer not null,
  team text,
  result text,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id),
  unique (match_id, seat_index)
);

create table public.player_private_match_state (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  private_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table public.match_events (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.match_results (
  match_id uuid primary key references public.matches(id) on delete cascade,
  winner_user_id uuid references public.profiles(id) on delete set null,
  winner_team text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.coin_topup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  player_name text not null,
  coins integer not null check (coins > 0),
  price_mvr numeric(10, 2) not null default 0,
  pack_name text not null,
  status public.topup_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  credited_at timestamptz
);

create table public.app_config (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table public.hall_of_fame_manual (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 1 and 40),
  peak_trophies integer not null default 0 check (peak_trophies >= 0),
  note text not null default '' check (char_length(note) <= 100),
  added_at timestamptz not null default now(),
  added_by uuid references public.profiles(id) on delete set null
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  reason public.report_reason not null,
  context public.report_context not null,
  evidence text check (evidence is null or char_length(evidence) <= 500),
  details text check (details is null or char_length(details) <= 500),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  check (reporter_id <> target_id)
);

create index profiles_player_code_idx on public.profiles (player_code);
create index profiles_display_name_idx on public.profiles (display_name);
create index ranked_progress_trophies_idx on public.ranked_progress (trophies desc);
create index ranked_progress_weekly_idx on public.ranked_progress (weekly_trophies desc);
create index match_players_user_idx on public.match_players (user_id, match_id);
create index match_events_match_idx on public.match_events (match_id, created_at);
create index messages_room_idx on public.messages (room_id, created_at);
create index club_messages_club_idx on public.club_messages (club_id, created_at);
create index reports_open_idx on public.reports (status, created_at desc);
create index topups_user_idx on public.coin_topup_requests (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.player_stats enable row level security;
alter table public.ranked_progress enable row level security;
alter table public.wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.inventory_items enable row level security;
alter table public.equipped_cosmetics enable row level security;
alter table public.room_cards enable row level security;
alter table public.user_missions enable row level security;
alter table public.user_achievements enable row level security;
alter table public.daily_rewards enable row level security;
alter table public.vip_entitlements enable row level security;
alter table public.friend_requests enable row level security;
alter table public.room_invites enable row level security;
alter table public.blocks enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_messages enable row level security;
alter table public.game_rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_bans enable row level security;
alter table public.matchmaking_queue enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.player_private_match_state enable row level security;
alter table public.match_events enable row level security;
alter table public.match_results enable row level security;
alter table public.coin_topup_requests enable row level security;
alter table public.app_config enable row level security;
alter table public.hall_of_fame_manual enable row level security;
alter table public.reports enable row level security;

create policy "profiles authenticated read" on public.profiles for select to authenticated using (true);
create policy "profiles owner insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles owner update public fields" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "stats authenticated read" on public.player_stats for select to authenticated using (true);
create policy "ranked authenticated read" on public.ranked_progress for select to authenticated using (true);

create policy "wallet owner or admin read" on public.wallets for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "coin tx owner or admin read" on public.coin_transactions for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "inventory owner read" on public.inventory_items for select to authenticated using (auth.uid() = user_id);
create policy "inventory owner equip read" on public.equipped_cosmetics for select to authenticated using (auth.uid() = user_id);
create policy "inventory owner equip update" on public.equipped_cosmetics for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "room cards owner read" on public.room_cards for select to authenticated using (auth.uid() = user_id);
create policy "missions owner read" on public.user_missions for select to authenticated using (auth.uid() = user_id);
create policy "achievements owner read" on public.user_achievements for select to authenticated using (auth.uid() = user_id);
create policy "daily rewards owner read" on public.daily_rewards for select to authenticated using (auth.uid() = user_id);
create policy "vip owner read" on public.vip_entitlements for select to authenticated using (auth.uid() = user_id);

create policy "friend requests participant read" on public.friend_requests for select to authenticated using (auth.uid() in (from_user_id, to_user_id));
create policy "friend requests sender insert" on public.friend_requests for insert to authenticated with check (auth.uid() = from_user_id);
create policy "friend requests participant update" on public.friend_requests for update to authenticated using (auth.uid() in (from_user_id, to_user_id)) with check (auth.uid() in (from_user_id, to_user_id));
create policy "friend requests participant delete" on public.friend_requests for delete to authenticated using (auth.uid() in (from_user_id, to_user_id));

create policy "room invites participant read" on public.room_invites for select to authenticated using (auth.uid() in (from_user_id, to_user_id));
create policy "room invites sender insert" on public.room_invites for insert to authenticated with check (auth.uid() = from_user_id);
create policy "room invites participant delete" on public.room_invites for delete to authenticated using (auth.uid() in (from_user_id, to_user_id));

create policy "blocks owner read" on public.blocks for select to authenticated using (auth.uid() = blocker_id);
create policy "blocks owner insert" on public.blocks for insert to authenticated with check (auth.uid() = blocker_id);
create policy "blocks owner delete" on public.blocks for delete to authenticated using (auth.uid() = blocker_id);

create policy "chat participant rooms read" on public.chat_rooms for select to authenticated using (
  exists (select 1 from public.chat_participants p where p.room_id = id and p.user_id = auth.uid())
);
create policy "chat participants room read" on public.chat_participants for select to authenticated using (
  exists (select 1 from public.chat_participants p where p.room_id = chat_participants.room_id and p.user_id = auth.uid())
);
create policy "chat participant messages read" on public.messages for select to authenticated using (
  exists (select 1 from public.chat_participants p where p.room_id = messages.room_id and p.user_id = auth.uid())
);
create policy "chat participant messages insert" on public.messages for insert to authenticated with check (
  auth.uid() = sender_id
  and exists (select 1 from public.chat_participants p where p.room_id = messages.room_id and p.user_id = auth.uid())
);

create policy "clubs authenticated read" on public.clubs for select to authenticated using (true);
create policy "clubs owner insert" on public.clubs for insert to authenticated with check (auth.uid() = owner_id);
create policy "clubs owner update" on public.clubs for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "club members authenticated read" on public.club_members for select to authenticated using (true);
create policy "club members self join" on public.club_members for insert to authenticated with check (auth.uid() = user_id);
create policy "club members self or owner delete" on public.club_members for delete to authenticated using (
  auth.uid() = user_id
  or exists (select 1 from public.clubs c where c.id = club_members.club_id and c.owner_id = auth.uid())
);
create policy "club messages members read" on public.club_messages for select to authenticated using (
  exists (select 1 from public.club_members m where m.club_id = club_messages.club_id and m.user_id = auth.uid())
);
create policy "club messages members insert" on public.club_messages for insert to authenticated with check (
  auth.uid() = sender_id
  and exists (select 1 from public.club_members m where m.club_id = club_messages.club_id and m.user_id = auth.uid())
);

create policy "rooms authenticated read" on public.game_rooms for select to authenticated using (true);
create policy "rooms owner insert" on public.game_rooms for insert to authenticated with check (auth.uid() = owner_id);
create policy "rooms owner update" on public.game_rooms for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "rooms owner delete" on public.game_rooms for delete to authenticated using (auth.uid() = owner_id);
create policy "room players room read" on public.room_players for select to authenticated using (true);
create policy "room players self insert" on public.room_players for insert to authenticated with check (auth.uid() = user_id);
create policy "room players self or owner delete" on public.room_players for delete to authenticated using (
  auth.uid() = user_id
  or exists (select 1 from public.game_rooms r where r.code = room_players.room_code and r.owner_id = auth.uid())
);
create policy "room bans owner read" on public.room_bans for select to authenticated using (
  exists (select 1 from public.game_rooms r where r.code = room_bans.room_code and r.owner_id = auth.uid())
);
create policy "room bans owner insert" on public.room_bans for insert to authenticated with check (
  exists (select 1 from public.game_rooms r where r.code = room_bans.room_code and r.owner_id = auth.uid())
);

create policy "queue authenticated read" on public.matchmaking_queue for select to authenticated using (true);
create policy "queue self insert" on public.matchmaking_queue for insert to authenticated with check (auth.uid() = user_id);
create policy "queue self update" on public.matchmaking_queue for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "queue self delete" on public.matchmaking_queue for delete to authenticated using (auth.uid() = user_id);

create policy "matches participant read" on public.matches for select to authenticated using (
  exists (select 1 from public.match_players p where p.match_id = matches.id and p.user_id = auth.uid())
);
create policy "match players participant read" on public.match_players for select to authenticated using (
  exists (select 1 from public.match_players p where p.match_id = match_players.match_id and p.user_id = auth.uid())
);
create policy "private match state owner read" on public.player_private_match_state for select to authenticated using (auth.uid() = user_id);
create policy "match events participant read" on public.match_events for select to authenticated using (
  exists (select 1 from public.match_players p where p.match_id = match_events.match_id and p.user_id = auth.uid())
);
create policy "match results participant read" on public.match_results for select to authenticated using (
  exists (select 1 from public.match_players p where p.match_id = match_results.match_id and p.user_id = auth.uid())
);

create policy "topups owner or admin read" on public.coin_topup_requests for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "topups owner request insert" on public.coin_topup_requests for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
create policy "topups admin update" on public.coin_topup_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "app config authenticated read" on public.app_config for select to authenticated using (true);
create policy "app config admin write" on public.app_config for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "hof authenticated read" on public.hall_of_fame_manual for select to authenticated using (true);
create policy "hof admin write" on public.hall_of_fame_manual for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "reports admin read" on public.reports for select to authenticated using (public.is_admin());
create policy "reports owner create" on public.reports for insert to authenticated with check (auth.uid() = reporter_id and reporter_id <> target_id and status = 'open');
create policy "reports admin update" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'Player'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.player_stats (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.ranked_progress (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.wallets (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.equipped_cosmetics (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.vip_entitlements (user_id) values (new.id) on conflict (user_id) do nothing;

  insert into public.inventory_items (user_id, item_id, category, source)
  values
    (new.id, 'cb_default', 'cardBack', 'default'),
    (new.id, 'tt_default', 'tableTheme', 'default'),
    (new.id, 'pf_default', 'profileFrame', 'default'),
    (new.id, 'va_default', 'victoryAnimation', 'default'),
    (new.id, 'bn_default', 'banner', 'default')
  on conflict (user_id, item_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter publication supabase_realtime add table
  public.profiles,
  public.friend_requests,
  public.room_invites,
  public.chat_rooms,
  public.chat_participants,
  public.messages,
  public.clubs,
  public.club_members,
  public.club_messages,
  public.game_rooms,
  public.room_players,
  public.matchmaking_queue,
  public.matches,
  public.match_players,
  public.player_private_match_state,
  public.match_events,
  public.match_results,
  public.coin_topup_requests,
  public.app_config,
  public.hall_of_fame_manual;


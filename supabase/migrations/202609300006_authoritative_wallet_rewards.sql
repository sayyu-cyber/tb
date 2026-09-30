-- Wallets are the sole balance. Browser caches never write them back.
insert into public.app_config (id, value) values ('economyCatalog', $catalog${"daily":[{"day":1,"coins":25},{"day":2,"coins":50},{"day":3,"coins":75,"bonusItem":"st_gg"},{"day":4,"coins":100},{"day":5,"coins":125,"bonusItem":"bn_maldives_wave"},{"day":6,"coins":150},{"day":7,"coins":250,"bonusItem":"room_card_1h"}],"cosmetics":{"cb_arena":{"id":"cb_arena","price":0,"category":"cardBack"},"cb_default":{"id":"cb_default","price":0,"category":"cardBack"},"cb_maldives":{"id":"cb_maldives","price":200,"category":"cardBack"},"cb_ocean":{"id":"cb_ocean","price":500,"category":"cardBack"},"cb_fire":{"id":"cb_fire","price":500,"category":"cardBack"},"cb_frost":{"id":"cb_frost","price":1200,"category":"cardBack"},"cb_shadow":{"id":"cb_shadow","price":1200,"category":"cardBack"},"cb_dragon":{"id":"cb_dragon","price":3000,"category":"cardBack"},"cb_phoenix":{"id":"cb_phoenix","price":3500,"category":"cardBack"},"cb_vip_gold":{"id":"cb_vip_gold","price":0,"category":"cardBack"},"cb_neon":{"id":"cb_neon","price":1500,"category":"cardBack"},"cb_wood":{"id":"cb_wood","price":150,"category":"cardBack"},"cb_marble":{"id":"cb_marble","price":600,"category":"cardBack"},"tt_default":{"id":"tt_default","price":0,"category":"tableTheme"},"tt_midnight":{"id":"tt_midnight","price":300,"category":"tableTheme"},"tt_red":{"id":"tt_red","price":800,"category":"tableTheme"},"tt_blue":{"id":"tt_blue","price":800,"category":"tableTheme"},"tt_gold":{"id":"tt_gold","price":2000,"category":"tableTheme"},"tt_space":{"id":"tt_space","price":4000,"category":"tableTheme"},"tt_vip":{"id":"tt_vip","price":0,"category":"tableTheme"},"tt_wooden":{"id":"tt_wooden","price":250,"category":"tableTheme"},"tt_ice":{"id":"tt_ice","price":1800,"category":"tableTheme"},"tt_lava":{"id":"tt_lava","price":1800,"category":"tableTheme"},"pf_default":{"id":"pf_default","price":0,"category":"profileFrame"},"pf_gold":{"id":"pf_gold","price":400,"category":"profileFrame"},"pf_silver":{"id":"pf_silver","price":1000,"category":"profileFrame"},"pf_crown":{"id":"pf_crown","price":2500,"category":"profileFrame"},"pf_dragon":{"id":"pf_dragon","price":5000,"category":"profileFrame"},"pf_vip":{"id":"pf_vip","price":0,"category":"profileFrame"},"pf_platinum":{"id":"pf_platinum","price":3000,"category":"profileFrame"},"pf_master":{"id":"pf_master","price":0,"category":"profileFrame"},"pf_animated_gold":{"id":"pf_animated_gold","price":0,"category":"profileFrame"},"em_thumbs":{"id":"em_thumbs","price":300,"category":"emote"},"em_laugh":{"id":"em_laugh","price":300,"category":"emote"},"em_cry":{"id":"em_cry","price":300,"category":"emote"},"em_rage":{"id":"em_rage","price":800,"category":"emote"},"em_cool":{"id":"em_cool","price":800,"category":"emote"},"em_celebrate":{"id":"em_celebrate","price":1500,"category":"emote"},"em_king":{"id":"em_king","price":3000,"category":"emote"},"em_vip_salute":{"id":"em_vip_salute","price":0,"category":"emote"},"va_default":{"id":"va_default","price":0,"category":"victoryAnimation"},"va_fireworks":{"id":"va_fireworks","price":1000,"category":"victoryAnimation"},"va_confetti":{"id":"va_confetti","price":2500,"category":"victoryAnimation"},"va_dragon":{"id":"va_dragon","price":5000,"category":"victoryAnimation"},"va_vip_crown":{"id":"va_vip_crown","price":0,"category":"victoryAnimation"},"st_gg":{"id":"st_gg","price":150,"category":"sticker"},"st_nice":{"id":"st_nice","price":150,"category":"sticker"},"st_oops":{"id":"st_oops","price":400,"category":"sticker"},"st_mindi_gold":{"id":"st_mindi_gold","price":1000,"category":"sticker"},"st_vip_wink":{"id":"st_vip_wink","price":0,"category":"sticker"},"bn_default":{"id":"bn_default","price":0,"category":"banner"},"bn_maldives_wave":{"id":"bn_maldives_wave","price":350,"category":"banner"},"bn_sunset":{"id":"bn_sunset","price":900,"category":"banner"},"bn_royal":{"id":"bn_royal","price":2000,"category":"banner"},"bn_champion":{"id":"bn_champion","price":0,"category":"banner"},"bn_vip_gold":{"id":"bn_vip_gold","price":0,"category":"banner"}},"missions":{"dm_play_1":{"id":"dm_play_1","reward":15},"dm_win_1":{"id":"dm_win_1","reward":30},"dm_play_mindi":{"id":"dm_play_mindi","reward":20},"dm_play_gin":{"id":"dm_play_gin","reward":20},"dm_win_2":{"id":"dm_win_2","reward":50},"dm_play_3":{"id":"dm_play_3","reward":40},"wm_win_10":{"id":"wm_win_10","reward":200,"rewardCosmeticId":"st_nice"},"wm_play_20":{"id":"wm_play_20","reward":150},"wm_reach_silver":{"id":"wm_reach_silver","reward":300},"wm_reach_gold":{"id":"wm_reach_gold","reward":500,"rewardCosmeticId":"bn_sunset"},"wm_reach_platinum":{"id":"wm_reach_platinum","reward":1000,"rewardCosmeticId":"pf_platinum"},"wm_weekend_champ":{"id":"wm_weekend_champ","reward":2000,"rewardCosmeticId":"bn_champion"}},"achievements":{"ach_first_win":{"id":"ach_first_win","reward":50},"ach_10_wins":{"id":"ach_10_wins","reward":100},"ach_50_wins":{"id":"ach_50_wins","reward":500},"ach_100_wins":{"id":"ach_100_wins","reward":1000},"ach_first_gold":{"id":"ach_first_gold","reward":1000},"ach_first_platinum":{"id":"ach_first_platinum","reward":2000},"ach_weekend_champ":{"id":"ach_weekend_champ","reward":3000},"ach_10_cardbacks":{"id":"ach_10_cardbacks","reward":100},"ach_all_tables":{"id":"ach_all_tables","reward":0},"ach_100_collection":{"id":"ach_100_collection","reward":0}},"roomCards":{"1h":50,"3h":120,"6h":200,"24h":350,"1w":1500,"1m":5000},"ranks":{"Bronze":50,"Silver":150,"Gold":350,"Platinum":700}}$catalog$::jsonb) on conflict (id) do nothing;
alter table public.wallets add column if not exists version bigint not null default 0;
create or replace function public.bump_wallet_version()
returns trigger language plpgsql set search_path = '' as $$
begin new.version := old.version + 1; new.updated_at := clock_timestamp(); return new; end;
$$;
drop trigger if exists wallet_version on public.wallets;
create trigger wallet_version before update on public.wallets for each row execute function public.bump_wallet_version();
revoke insert, update, delete on public.wallets from authenticated, anon;

create table if not exists public.wallet_operations (
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  primary key (user_id, request_id)
);
alter table public.wallet_operations enable row level security;
create unique index if not exists coin_reward_once on public.coin_transactions (user_id, (metadata->>'rewardKey'))
  where metadata ? 'rewardKey';

create or replace function public.get_economy_snapshot()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_wallet public.wallets; v_last public.daily_rewards; v_available boolean; v_claimed integer;
begin
  if auth.uid() is null then raise exception 'Sign in to load your balance' using errcode = '42501'; end if;
  select * into v_wallet from public.wallets where user_id = auth.uid();
  if not found then raise exception 'Wallet not found'; end if;
  select * into v_last from public.daily_rewards where user_id = auth.uid() and claimed_at is not null order by claimed_at desc limit 1;
  v_available := v_last.claimed_at is null or v_last.claimed_at <= now() - interval '24 hours';
  v_claimed := case when v_last.reward_day = 7 and v_available then 0 else coalesce(v_last.reward_day, 0) end;
  return jsonb_build_object('wallet', to_jsonb(v_wallet), 'daily', jsonb_build_object(
    'available', v_available, 'claimedThrough', v_claimed, 'nextDay', coalesce(v_last.reward_day % 7 + 1, 1),
    'lastClaimed', v_last.claimed_at, 'nextClaimAt', v_last.claimed_at + interval '24 hours', 'serverNow', clock_timestamp()
  ));
end;
$$;

create or replace function public.apply_economy_action(p_action text, p_payload jsonb, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_wallet public.wallets; v_last public.daily_rewards; v_catalog jsonb; v_item jsonb; v_shop jsonb;
  v_amount integer := 0; v_spend boolean := false; v_source text; v_key text; v_id text;
  v_bonus text; v_day integer; v_cycle timestamptz; v_card uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to change your balance' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'Missing request ID'; end if;
  select * into v_wallet from public.wallets where user_id = auth.uid() for update;
  if not found then raise exception 'Wallet not found'; end if;
  if exists (select 1 from public.wallet_operations where user_id = auth.uid() and request_id = p_request_id) then return public.get_economy_snapshot(); end if;
  select value into v_catalog from public.app_config where id = 'economyCatalog';
  case p_action
    when 'CLAIM_DAILY_REWARD' then
      select * into v_last from public.daily_rewards where user_id = auth.uid() and claimed_at is not null order by claimed_at desc limit 1;
      if v_last.claimed_at > now() - interval '24 hours' then raise exception 'Daily reward already claimed. Come back when the countdown ends.'; end if;
      v_day := coalesce(v_last.reward_day % 7 + 1, 1);
      if (p_payload->>'day')::integer is distinct from v_day then raise exception 'This reward is not available yet'; end if;
      v_item := v_catalog->'daily'->(v_day - 1);
      v_amount := (v_item->>'coins')::integer; v_bonus := v_item->>'bonusItem'; v_source := 'daily_login';
      v_cycle := case when v_day = 1 then now() else v_last.cycle_started_at end;
      insert into public.daily_rewards (user_id, reward_day, claimed_at, cycle_started_at) values (auth.uid(), v_day, now(), v_cycle);
    when 'PURCHASE_COSMETIC' then
      v_id := p_payload->>'itemId'; v_item := v_catalog->'cosmetics'->v_id;
      if v_item is null then raise exception 'Item not found'; end if;
      select value into v_shop from public.app_config where id = 'shopOverrides';
      if coalesce(v_shop->'hiddenItemIds', '[]'::jsonb) ? v_id then raise exception 'This item is no longer available'; end if;
      if exists (select 1 from public.inventory_items where user_id = auth.uid() and item_id = v_id) then raise exception 'You already own this item'; end if;
      v_amount := coalesce((v_shop->'priceOverrides'->>v_id)::integer, (v_item->>'price')::integer);
      v_spend := true; v_source := 'purchase'; v_bonus := v_id;
    when 'PURCHASE_ROOM_CARD' then
      v_amount := (v_catalog->'roomCards'->>(p_payload->>'type'))::integer;
      if v_amount is null then raise exception 'Room Card not found'; end if;
      v_spend := true; v_source := 'purchase';
      insert into public.room_cards (user_id, type, source) values (auth.uid(), (p_payload->>'type')::public.room_card_type, 'purchase') returning id into v_card;
    when 'SPEND_COINS' then
      v_amount := (p_payload->>'amount')::integer; v_spend := true; v_source := 'purchase';
    when 'ADD_COINS' then
      v_source := p_payload->>'source';
      if v_source = 'match_victory' then v_amount := 10;
      elsif v_source = 'match_defeat' then v_amount := 2;
      elsif v_source = 'weekly_rank' then
        select coalesce(current_rank, 'Bronze') into v_id from public.ranked_progress where user_id = auth.uid();
        v_amount := coalesce((select (value->'weeklyRewards'->>v_id)::integer from public.app_config where id = 'rankRewards'), (v_catalog->'ranks'->>v_id)::integer, 50);
        v_key := 'weekly_rank:' || date_trunc('week', now() at time zone 'UTC')::date::text;
      else raise exception 'This credit requires an authoritative reward or top-up'; end if;
    when 'COMPLETE_MISSION' then
      v_id := regexp_replace(p_payload->>'missionId', '_[0-9]+_[0-9]+$', '');
      v_item := v_catalog->'missions'->v_id;
      if v_item is null then raise exception 'Mission not found'; end if;
      v_source := case when (p_payload->>'isWeekly')::boolean then 'weekly_mission' else 'daily_mission' end;
      v_key := v_source || ':' || v_id || ':' || case when v_source = 'weekly_mission' then date_trunc('week', now() at time zone 'UTC')::date::text else (now() at time zone 'UTC')::date::text end;
      v_amount := coalesce((select (value->case when v_source = 'weekly_mission' then 'weeklyRewards' else 'dailyRewards' end->>v_id)::integer from public.app_config where id = 'missionRewards'), (v_item->>'reward')::integer);
      if v_source = 'daily_mission' and (select count(*) from public.coin_transactions where user_id = auth.uid()
        and metadata->>'rewardKey' like 'daily_mission:%:' || (now() at time zone 'UTC')::date::text) = 2 then v_amount := v_amount + 50; end if;
      v_bonus := v_item->>'rewardCosmeticId';
    when 'UNLOCK_ACHIEVEMENT' then
      v_id := p_payload->>'achievementId'; v_item := v_catalog->'achievements'->v_id;
      if v_item is null then raise exception 'Achievement not found'; end if;
      v_amount := (v_item->>'reward')::integer; v_key := 'achievement:' || v_id; v_source := 'achievement';
    else raise exception 'Unsupported balance action';
  end case;
  if v_key is not null and exists (select 1 from public.coin_transactions where user_id = auth.uid() and metadata->>'rewardKey' = v_key) then return public.get_economy_snapshot(); end if;
  if v_amount is null or v_amount < 0 or (p_action = 'SPEND_COINS' and v_amount = 0) then raise exception 'Invalid coin amount'; end if;
  if v_spend and v_wallet.coins < v_amount then raise exception 'Not enough coins'; end if;
  if v_bonus = 'room_card_1h' then
    insert into public.room_cards (user_id, type, source) values (auth.uid(), '1h', v_source) returning id into v_card;
  elsif v_bonus is not null then
    insert into public.inventory_items (user_id, item_id, category, source)
      values (auth.uid(), v_bonus, v_catalog->'cosmetics'->v_bonus->>'category', v_source) on conflict do nothing;
  end if;
  if v_amount > 0 then
    update public.wallets set coins = coins + case when v_spend then -v_amount else v_amount end,
      total_earned = total_earned + case when v_spend then 0 else v_amount end,
      total_spent = total_spent + case when v_spend then v_amount else 0 end where user_id = auth.uid();
    insert into public.coin_transactions (user_id, amount, type, source, description, metadata)
      values (auth.uid(), v_amount, case when v_spend then 'spend'::public.coin_transaction_type else 'earn'::public.coin_transaction_type end,
      v_source, coalesce(p_payload->>'description', p_action), jsonb_strip_nulls(jsonb_build_object('rewardKey', v_key, 'requestId', p_request_id)));
  end if;
  insert into public.wallet_operations values (auth.uid(), p_request_id);
  return public.get_economy_snapshot() || jsonb_build_object('roomCardId', v_card);
end;
$$;

-- Approving a deposit credits its wallet and marks the request in one commit.
create or replace function public.credit_approved_topup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status not in ('approved', 'credited')) then
    update public.wallets set coins = coins + new.coins, total_earned = total_earned + new.coins where user_id = new.user_id;
    if not found then raise exception 'Wallet not found'; end if;
    insert into public.coin_transactions (user_id, amount, type, source, description, metadata)
      values (new.user_id, new.coins, 'earn', 'purchase', new.pack_name, jsonb_build_object('topupId', new.id));
    new.status := 'credited'; new.credited_at := now();
  elsif tg_op = 'UPDATE' and old.status = 'credited' then
    raise exception 'This top-up has already been credited';
  end if;
  return new;
end;
$$;
drop trigger if exists credit_topup on public.coin_topup_requests;
create trigger credit_topup before insert or update on public.coin_topup_requests for each row execute function public.credit_approved_topup();
drop policy if exists "topups owner request insert" on public.coin_topup_requests;
create policy "topups owner request insert" on public.coin_topup_requests for insert to authenticated with check (
  (auth.uid() = user_id and status = 'pending') or (public.is_admin() and status = 'credited')
);
-- Before-insert triggers run before WITH CHECK, so admin approval is 'credited'.
revoke all on function public.get_economy_snapshot() from public, anon;
revoke all on function public.apply_economy_action(text, jsonb, uuid) from public, anon;
grant execute on function public.get_economy_snapshot() to authenticated;
grant execute on function public.apply_economy_action(text, jsonb, uuid) to authenticated;

create or replace function public.admin_top_up(p_user_id uuid, p_coins integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_coins is null or p_coins <= 0 then raise exception 'Invalid coin amount'; end if;
  insert into public.coin_topup_requests (user_id, player_name, coins, price_mvr, pack_name, status, decided_at)
    select id, display_name, p_coins, 0, 'Admin Top-Up', 'approved', now() from public.profiles where id = p_user_id;
  if not found then raise exception 'Player not found'; end if;
  return (select to_jsonb(w) from public.wallets w where user_id = p_user_id);
end;
$$;
revoke all on function public.admin_top_up(uuid, integer) from public, anon;
grant execute on function public.admin_top_up(uuid, integer) to authenticated;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wallets') then
    alter publication supabase_realtime add table public.wallets;
  end if;
end $$;
notify pgrst, 'reload schema';

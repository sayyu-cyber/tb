-- Requires 006. Deploy before the economy client. No live migration is run by tests.
-- 009 contract: service-only settlement writes wallets/coin_transactions atomically
-- with unique match reward keys. ADD_COINS remains denied to browsers.
-- Future trusted progression can write user_missions (completed=true, progress>=target,
-- completed_at and verified_at set) and user_achievements (progress>=target,
-- verified_at set). Browser claims never infer evidence from local match results.
-- Before advancing progress, 009 calls ensure_economy_missions(p_user_id uuid);
-- match processing must be idempotent. Assignments use period_start (UTC date).
-- Trusted earned-only cosmetic grants also set inventory_items.verified_at.
-- 010 contract: activate_room_card(p_card_id uuid) owns immutable activation/expiry.
-- Active access requires activated_at IS NOT NULL AND expires_at > now().
begin;

create table public.economy_reward_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_key text not null,
  primary key (user_id, reward_key)
);
alter table public.economy_reward_claims enable row level security;
revoke all on public.economy_reward_claims from public, anon, authenticated;

alter table public.user_missions add column if not exists verified_at timestamptz;
alter table public.user_missions add column if not exists period_start date;
alter table public.user_missions add column if not exists claimed_at timestamptz;
create unique index economy_mission_assignment_once on public.user_missions
  (user_id,cadence,template_id,period_start) where period_start is not null;
alter table public.user_achievements add column if not exists verified_at timestamptz;
alter table public.inventory_items add column if not exists verified_at timestamptz;
-- Historical rows are deliberately not certified as trusted evidence.
revoke insert, update, delete on public.user_missions, public.user_achievements,
  public.room_cards, public.vip_entitlements, public.inventory_items,
  public.equipped_cosmetics from anon, authenticated;
drop policy if exists "inventory owner equip update" on public.equipped_cosmetics;

-- These flags are copied from data/cosmetics.ts, including all earned-only items.
update public.app_config set value = jsonb_set(value, '{cosmetics}', (
  select jsonb_object_agg(key, item || jsonb_build_object(
    'isVipExclusive', key in ('cb_vip_gold','tt_vip','pf_vip','em_vip_salute','va_vip_crown','st_vip_wink','bn_vip_gold'),
    'earnedOnly', key in ('pf_master','pf_animated_gold','bn_champion')
  )) from jsonb_each(value->'cosmetics') as entry(key,item)
)) where id = 'economyCatalog';

update public.app_config set value = jsonb_set(value, '{missions}', value->'missions' || '{
  "dm_play_1":{"id":"dm_play_1","cadence":"daily","title":"Play 1 Match","description":"Play any match","target":1,"reward":15},
  "dm_win_1":{"id":"dm_win_1","cadence":"daily","title":"Win 1 Match","description":"Win any match","target":1,"reward":30},
  "dm_play_mindi":{"id":"dm_play_mindi","cadence":"daily","title":"Play Mindi","description":"Play a Mindi match","target":1,"reward":20},
  "dm_play_gin":{"id":"dm_play_gin","cadence":"daily","title":"Play Gin Rummy","description":"Play a Gin Rummy match","target":1,"reward":20},
  "dm_win_2":{"id":"dm_win_2","cadence":"daily","title":"Win 2 Matches","description":"Win 2 matches today","target":2,"reward":50},
  "dm_play_3":{"id":"dm_play_3","cadence":"daily","title":"Play 3 Matches","description":"Play 3 matches today","target":3,"reward":40},
  "wm_win_10":{"id":"wm_win_10","cadence":"weekly","title":"Win 10 Matches","description":"Win 10 matches this week","target":10,"reward":200,"rewardCosmeticId":"st_nice"},
  "wm_play_20":{"id":"wm_play_20","cadence":"weekly","title":"Play 20 Matches","description":"Play 20 matches this week","target":20,"reward":150},
  "wm_reach_silver":{"id":"wm_reach_silver","cadence":"weekly","title":"Reach Silver","description":"Achieve Silver rank","target":1,"reward":300},
  "wm_reach_gold":{"id":"wm_reach_gold","cadence":"weekly","title":"Reach Gold","description":"Achieve Gold rank","target":1,"reward":500,"rewardCosmeticId":"bn_sunset"},
  "wm_reach_platinum":{"id":"wm_reach_platinum","cadence":"weekly","title":"Reach Platinum","description":"Achieve Platinum rank","target":1,"reward":1000,"rewardCosmeticId":"pf_platinum"},
  "wm_weekend_champ":{"id":"wm_weekend_champ","cadence":"weekly","title":"Weekend Champion","description":"Become Weekend Champion","target":1,"reward":2000,"rewardCosmeticId":"bn_champion"}
}'::jsonb) where id = 'economyCatalog';

create function public.ensure_economy_missions(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_cadence text; v_period date; v_catalog jsonb; v_overrides jsonb;
begin
  perform 1 from public.wallets where user_id = p_user_id for update;
  if not found then raise exception 'Wallet not found'; end if;
  select value->'missions' into v_catalog from public.app_config where id = 'economyCatalog';
  select value into v_overrides from public.app_config where id = 'missionRewards';
  foreach v_cadence in array array['daily','weekly'] loop
    v_period := case v_cadence when 'daily' then (now() at time zone 'UTC')::date
      else date_trunc('week', now() at time zone 'UTC')::date end;
    -- A period keeps its original assignment even if the catalog changes.
    if exists (select 1 from public.user_missions where user_id = p_user_id
      and cadence = v_cadence and period_start = v_period) then continue; end if;
    insert into public.user_missions(user_id,cadence,template_id,title,description,target,reward,reward_cosmetic_id,period_start)
      select p_user_id,v_cadence,key,item->>'title',item->>'description',(item->>'target')::integer,
        coalesce((v_overrides->case v_cadence when 'daily' then 'dailyRewards' else 'weeklyRewards' end->>key)::integer,
          (item->>'reward')::integer),item->>'rewardCosmeticId',v_period
      from jsonb_each(v_catalog) as templates(key,item)
      where item->>'cadence' = v_cadence
      order by md5(p_user_id::text || ':' || v_period::text || ':' || key),key limit 3
      on conflict do nothing;
  end loop;
end;
$$;
revoke all on function public.ensure_economy_missions(uuid) from public, anon, authenticated;
grant execute on function public.ensure_economy_missions(uuid) to service_role;

create function public.economy_cosmetic_usable(p_user_id uuid, p_item_id text, p_category text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.app_config c
    where c.id = 'economyCatalog' and c.value->'cosmetics'->p_item_id->>'category' = p_category
      and c.value->'cosmetics'->p_item_id ? 'isVipExclusive'
      and c.value->'cosmetics'->p_item_id ? 'earnedOnly'
      and (p_item_id in ('cb_default','tt_default','pf_default','va_default','bn_default')
        or exists (select 1 from public.inventory_items i where i.user_id = p_user_id and i.item_id = p_item_id and i.category = p_category))
      and (not (c.value->'cosmetics'->p_item_id->>'isVipExclusive')::boolean
        or exists (select 1 from public.vip_entitlements v where v.user_id = p_user_id and v.active and v.expires_at > now()))
      and (not (c.value->'cosmetics'->p_item_id->>'earnedOnly')::boolean
        or exists (select 1 from public.inventory_items i where i.user_id = p_user_id and i.item_id = p_item_id and i.verified_at is not null))
  );
$$;
revoke all on function public.economy_cosmetic_usable(uuid,text,text) from public, anon, authenticated;

create function public.get_public_appearance(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  return (select jsonb_build_object(
    'card_back', case when public.economy_cosmetic_usable(p_user_id, e.card_back, 'cardBack') then e.card_back else 'cb_default' end,
    'table_theme', case when public.economy_cosmetic_usable(p_user_id, e.table_theme, 'tableTheme') then e.table_theme else 'tt_default' end)
    from public.equipped_cosmetics e where e.user_id = p_user_id);
end;
$$;
revoke all on function public.get_public_appearance(uuid) from public, anon, authenticated;
grant execute on function public.get_public_appearance(uuid) to authenticated;

alter function public.get_economy_snapshot() rename to economy_snapshot_v6_internal;
revoke all on function public.economy_snapshot_v6_internal() from public, anon, authenticated;
create function public.get_economy_snapshot()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_snapshot jsonb;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  -- The same lock as purchases provides one consistent snapshot of economy writes.
  perform 1 from public.wallets where user_id = v_uid for update;
  perform public.ensure_economy_missions(v_uid);
  v_snapshot := public.economy_snapshot_v6_internal();
  return v_snapshot || jsonb_build_object(
    'integrityVersion', 1,
    'inventory', coalesce((select jsonb_agg(jsonb_build_object('item_id',item_id,'category',category))
      from public.inventory_items where user_id = v_uid), '[]'::jsonb),
    'equipped', (select jsonb_build_object(
      'card_back', case when public.economy_cosmetic_usable(v_uid,e.card_back,'cardBack') then e.card_back else 'cb_default' end,
      'table_theme', case when public.economy_cosmetic_usable(v_uid,e.table_theme,'tableTheme') then e.table_theme else 'tt_default' end,
      'profile_frame', case when public.economy_cosmetic_usable(v_uid,e.profile_frame,'profileFrame') then e.profile_frame else 'pf_default' end,
      'victory_animation', case when public.economy_cosmetic_usable(v_uid,e.victory_animation,'victoryAnimation') then e.victory_animation else 'va_default' end,
      'banner', case when public.economy_cosmetic_usable(v_uid,e.banner,'banner') then e.banner else 'bn_default' end,
      'title', e.title) from public.equipped_cosmetics e where user_id = v_uid),
    'roomCards', coalesce((select jsonb_agg(to_jsonb(c)) from public.room_cards c where user_id = v_uid), '[]'::jsonb),
    'vip', (select to_jsonb(v) from public.vip_entitlements v where user_id = v_uid),
    'missions', coalesce((select jsonb_agg(to_jsonb(m)) from public.user_missions m where user_id = v_uid
      and period_start = case cadence when 'daily' then (now() at time zone 'UTC')::date
        else date_trunc('week', now() at time zone 'UTC')::date end
      and generated_at <= now()), '[]'::jsonb),
    'achievements', coalesce((select jsonb_agg(to_jsonb(a)) from public.user_achievements a where user_id = v_uid), '[]'::jsonb)
  );
end;
$$;

create function public.guard_room_card_lifecycle()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.user_id, new.type, new.purchased_at, new.source) is distinct from
     (old.user_id, old.type, old.purchased_at, old.source) then
    raise exception 'Room card ownership and type are immutable';
  end if;
  if (old.activated_at is not null or old.expires_at is not null)
     and (new.activated_at, new.expires_at) is distinct from (old.activated_at, old.expires_at) then
    raise exception 'Consumed room cards cannot be reset or extended';
  end if;
  if (new.activated_at is null) <> (new.expires_at is null)
     or new.expires_at <= new.activated_at then raise exception 'Invalid room card lifecycle'; end if;
  return new;
end;
$$;
create trigger room_card_lifecycle before update on public.room_cards
for each row execute function public.guard_room_card_lifecycle();

create function public.activate_room_card(p_card_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_card public.room_cards; v_hours integer; v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  perform 1 from public.wallets where user_id = auth.uid() for update;
  select * into v_card from public.room_cards where id = p_card_id and user_id = auth.uid() for update;
  if not found then raise exception 'Room card not found'; end if;
  if v_card.activated_at is not null or v_card.expires_at is not null then
    raise exception 'This room card has already been consumed';
  end if;
  v_hours := case v_card.type when '1h' then 1 when '3h' then 3 when '6h' then 6
    when '24h' then 24 when '1w' then 168 when '1m' then 720 end;
  if v_hours is null then raise exception 'Invalid room card type'; end if;
  update public.room_cards set activated_at = v_now, expires_at = v_now + make_interval(hours => v_hours)
    where id = p_card_id;
  return public.get_economy_snapshot();
end;
$$;

create function public.equip_cosmetic(p_category text, p_item_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_item jsonb; v_owned boolean;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  perform 1 from public.wallets where user_id = auth.uid() for update;
  select value->'cosmetics'->p_item_id into v_item from public.app_config where id = 'economyCatalog';
  if v_item is null or v_item->>'category' is distinct from p_category
    or p_category not in ('cardBack','tableTheme','profileFrame','victoryAnimation','banner') then
    raise exception 'Invalid cosmetic slot';
  end if;
  v_owned := p_item_id in ('cb_default','tt_default','pf_default','va_default','bn_default')
    or exists (select 1 from public.inventory_items where user_id = auth.uid()
      and item_id = p_item_id and category = p_category);
  if not v_owned then raise exception 'Cosmetic not owned'; end if;
  if coalesce((v_item->>'isVipExclusive')::boolean, false) and not exists (
    select 1 from public.vip_entitlements where user_id = auth.uid() and active and expires_at > now()
  ) then raise exception 'Active VIP required'; end if;
  if coalesce((v_item->>'earnedOnly')::boolean, false) and not exists (
    select 1 from public.inventory_items where user_id = auth.uid() and item_id = p_item_id
      and verified_at is not null
  ) then raise exception 'Verified unlock required'; end if;
  update public.equipped_cosmetics set
    card_back = case when p_category = 'cardBack' then p_item_id else card_back end,
    table_theme = case when p_category = 'tableTheme' then p_item_id else table_theme end,
    profile_frame = case when p_category = 'profileFrame' then p_item_id else profile_frame end,
    victory_animation = case when p_category = 'victoryAnimation' then p_item_id else victory_animation end,
    banner = case when p_category = 'banner' then p_item_id else banner end, updated_at = now()
    where user_id = auth.uid();
  if not found then raise exception 'Equipment not found'; end if;
  return public.get_economy_snapshot();
end;
$$;

-- Preserve the already atomic daily/purchase implementation behind an inaccessible helper.
alter function public.apply_economy_action(text,jsonb,uuid) rename to economy_action_v6_internal;
revoke all on function public.economy_action_v6_internal(text,jsonb,uuid) from public, anon, authenticated;
create function public.apply_economy_action(p_action text, p_payload jsonb, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb; v_catalog jsonb; v_mission public.user_missions; v_achievement public.user_achievements;
  v_id text; v_key text; v_source text; v_amount integer; v_bonus text; v_period timestamptz;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'Missing request ID'; end if;
  perform 1 from public.wallets where user_id = auth.uid() for update;
  if not found then raise exception 'Wallet not found'; end if;
  -- Reject before request deduplication: new UUIDs never turn an assertion into proof.
  if p_action in ('ADD_COINS','ACTIVATE_VIP','ADD_ROOM_CARD','GRANT_COSMETIC') then
    raise exception 'Trusted settlement or verified billing required' using errcode = '42501';
  end if;
  if exists (select 1 from public.wallet_operations where user_id = auth.uid() and request_id = p_request_id)
    then return public.get_economy_snapshot(); end if;
  select value into v_catalog from public.app_config where id = 'economyCatalog';
  if p_action = 'ACTIVATE_ROOM_CARD' then
    perform public.activate_room_card((p_payload->>'cardId')::uuid);
  elsif p_action = 'EQUIP_COSMETIC' then
    perform public.equip_cosmetic(p_payload->>'category', p_payload->>'itemId');
  elsif p_action = 'PURCHASE_COSMETIC' then
    v_item := v_catalog->'cosmetics'->(p_payload->>'itemId');
    if v_item is null or not (v_item ? 'earnedOnly' and v_item ? 'isVipExclusive') then raise exception 'Unknown unlock requirements'; end if;
    if (v_item->>'earnedOnly')::boolean then raise exception 'This cosmetic must be earned'; end if;
    if (v_item->>'isVipExclusive')::boolean and not exists (
      select 1 from public.vip_entitlements where user_id = auth.uid() and active and expires_at > now()
    ) then raise exception 'Active VIP required'; end if;
    return public.economy_action_v6_internal(p_action, p_payload, p_request_id);
  elsif p_action in ('CLAIM_DAILY_REWARD','PURCHASE_ROOM_CARD','SPEND_COINS') then
    return public.economy_action_v6_internal(p_action, p_payload, p_request_id);
  elsif p_action = 'COMPLETE_MISSION' then
    -- UUID identifies a server assignment, never a caller-selected template/period.
    select * into v_mission from public.user_missions
      where user_id = auth.uid() and id::text = p_payload->>'missionId' for update;
    if not found or v_mission.verified_at is null or not v_mission.completed
      or v_mission.completed_at is null or v_mission.progress < v_mission.target then
      raise exception 'Mission completion has not been verified' using errcode = '42501';
    end if;
    if (p_payload->>'isWeekly')::boolean is distinct from (v_mission.cadence = 'weekly') then raise exception 'Mission cadence mismatch'; end if;
    v_period := case v_mission.cadence when 'daily' then date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
      else date_trunc('week', now() at time zone 'UTC') at time zone 'UTC' end;
    if v_mission.generated_at < v_period or v_mission.generated_at > now() then raise exception 'Mission period expired'; end if;
    if v_mission.period_start is distinct from (v_period at time zone 'UTC')::date then raise exception 'Mission was not assigned for this period'; end if;
    v_id := v_mission.template_id; v_item := v_catalog->'missions'->v_id;
    if v_item is null or (v_mission.cadence = 'daily') is distinct from (left(v_id,3) = 'dm_') then raise exception 'Invalid mission assignment'; end if;
    v_amount := v_mission.reward; v_bonus := v_mission.reward_cosmetic_id;
    v_source := v_mission.cadence || '_mission';
    v_key := v_source || ':' || v_id || ':' || (v_period at time zone 'UTC')::date::text;
    update public.user_missions set claimed_at=coalesce(claimed_at,now()) where id=v_mission.id;
  elsif p_action = 'UNLOCK_ACHIEVEMENT' then
    v_id := p_payload->>'achievementId'; v_item := v_catalog->'achievements'->v_id;
    select * into v_achievement from public.user_achievements where user_id = auth.uid() and achievement_id = v_id for update;
    if not found or v_item is null or v_achievement.verified_at is null
      or v_achievement.progress < v_achievement.target then
      raise exception 'Achievement eligibility has not been verified' using errcode = '42501';
    end if;
    v_amount := (v_item->>'reward')::integer; v_source := 'achievement'; v_key := 'achievement:' || v_id;
    update public.user_achievements set unlocked_at = coalesce(unlocked_at, now()) where user_id = auth.uid() and achievement_id = v_id;
  else raise exception 'Unsupported economy action';
  end if;
  if v_key is not null then
    if exists (select 1 from public.coin_transactions where user_id = auth.uid() and metadata->>'rewardKey' = v_key)
      then return public.get_economy_snapshot(); end if;
    insert into public.economy_reward_claims(user_id,reward_key) values(auth.uid(),v_key) on conflict do nothing;
    if not found then return public.get_economy_snapshot(); end if;
    if v_amount is null or v_amount < 0 then raise exception 'Invalid reward'; end if;
    if v_source = 'daily_mission' and (select count(*) = 3 and bool_and(completed and progress >= target
      and verified_at is not null and claimed_at is not null)
      from public.user_missions where user_id=auth.uid() and cadence='daily'
        and period_start=(now() at time zone 'UTC')::date) then
      insert into public.economy_reward_claims(user_id,reward_key)
        values(auth.uid(),'daily_mission_bonus:' || (now() at time zone 'UTC')::date::text) on conflict do nothing;
      if found then v_amount := v_amount + 50; end if;
    end if;
    if v_bonus is not null then
      if v_catalog->'cosmetics'->v_bonus is null then raise exception 'Invalid reward cosmetic'; end if;
      insert into public.inventory_items(user_id,item_id,category,source,verified_at) values
        (auth.uid(),v_bonus,v_catalog->'cosmetics'->v_bonus->>'category',v_source,now())
        on conflict (user_id,item_id) do update set verified_at = excluded.verified_at, source = excluded.source;
    end if;
    update public.wallets set coins = coins + v_amount, total_earned = total_earned + v_amount where user_id = auth.uid();
    if v_amount > 0 then
      insert into public.coin_transactions(user_id,amount,type,source,description,metadata)
        values(auth.uid(),v_amount,'earn',v_source,p_action,jsonb_build_object('rewardKey',v_key,'requestId',p_request_id));
    end if;
  end if;
  insert into public.wallet_operations(user_id,request_id) values(auth.uid(),p_request_id);
  return public.get_economy_snapshot();
end;
$$;

revoke all on function public.get_economy_snapshot(), public.activate_room_card(uuid),
  public.equip_cosmetic(text,text), public.apply_economy_action(text,jsonb,uuid),
  public.guard_room_card_lifecycle() from public, anon, authenticated;
grant execute on function public.get_economy_snapshot(), public.activate_room_card(uuid),
  public.equip_cosmetic(text,text), public.apply_economy_action(text,jsonb,uuid) to authenticated;

-- Existing request API remains compatible; the database resolves the SKU and
-- rejects altered amount/price/name combinations before any credit trigger runs.
alter table public.coin_topup_requests add column if not exists pack_id text;
insert into public.app_config(id,value) values ('coinPackCatalog', '[
  {"id":"pack_starter","name":"Starter Pack","coins":100,"priceMVR":10},
  {"id":"pack_small","name":"Small Pack","coins":500,"priceMVR":40},
  {"id":"pack_standard","name":"Standard Pack","coins":1500,"priceMVR":100},
  {"id":"pack_premium","name":"Premium Pack","coins":4000,"priceMVR":250},
  {"id":"pack_mega","name":"Mega Pack","coins":10000,"priceMVR":500}
]'::jsonb) on conflict (id) do nothing;

create function public.validate_topup_catalog()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_pack jsonb;
begin
  if tg_op = 'UPDATE' then
    if (new.id,new.user_id,new.coins,new.price_mvr,new.pack_name,new.player_name,new.created_at,new.pack_id)
      is distinct from (old.id,old.user_id,old.coins,old.price_mvr,old.pack_name,old.player_name,old.created_at,old.pack_id) then
      raise exception 'Top-up purchase details are immutable';
    end if;
    if old.status in ('credited','rejected') then raise exception 'Top-up already finalized'; end if;
  end if;
  -- Admin grants have a separate authenticated, audited RPC; clients cannot use this bypass.
  if new.pack_name = 'Admin Top-Up' and new.price_mvr = 0 and public.is_admin() then
    if tg_op = 'INSERT' and new.status <> 'approved' then raise exception 'Invalid admin grant'; end if;
    return new;
  end if;
  if tg_op = 'INSERT' or new.pack_id is null then
    select item into v_pack from public.app_config c cross join lateral jsonb_array_elements(c.value) item
      where c.id = 'coinPackCatalog' and item->>'name' = new.pack_name
        and (item->>'coins')::integer = new.coins and (item->>'priceMVR')::numeric = new.price_mvr
        and (new.pack_id is null or item->>'id' = new.pack_id);
    if v_pack is null then raise exception 'Top-up does not match a catalog pack'; end if;
    new.pack_id := v_pack->>'id';
    new.coins := (v_pack->>'coins')::integer;
    new.price_mvr := (v_pack->>'priceMVR')::numeric;
    new.pack_name := v_pack->>'name';
  end if;
  if tg_op = 'INSERT' and new.status <> 'pending' then raise exception 'New top-ups must await approval'; end if;
  return new;
end;
$$;
create trigger aa_validate_topup before insert or update on public.coin_topup_requests
for each row execute function public.validate_topup_catalog();
revoke all on function public.validate_topup_catalog() from public, anon, authenticated;

do $$
declare v_table text;
begin
  foreach v_table in array array['room_cards','vip_entitlements','user_missions','user_achievements','inventory_items','equipped_cosmetics'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = v_table) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;

commit;
notify pgrst, 'reload schema';

begin;

insert into public.badges(slug,name,description,active)
values
  ('profile-complete','Profile Complete','Perfil completado con ciudad, país y alias público.',true),
  ('first-referral','First Invitation','Primera invitación validada sin autorreferido.',true),
  ('first-presave','Pre-save Signal','Primer pre-save registrado desde una cuenta confirmada.',true),
  ('set-opener','Set Opener','Primer set abierto desde la biblioteca oficial.',true),
  ('raver-confirmed','Raver Confirmed','Primera asistencia confirmada a una fecha publicada.',true),
  ('first-reward','First Drop','Primera recompensa canjeada desde el IAMJOSHWA PASS.',true)
on conflict(slug) do update set name=excluded.name,description=excluded.description,active=true;

create or replace function public.award_badge(p_user_id uuid,p_slug text,p_source_type text default null,p_source_id uuid default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare badge uuid; inserted integer:=0;
begin
  select id into badge from public.badges where slug=p_slug and active;
  if badge is null then return false; end if;
  insert into public.user_badges(user_id,badge_id,source_type,source_id)
  values(p_user_id,badge,p_source_type,p_source_id)
  on conflict do nothing;
  get diagnostics inserted=row_count;
  return inserted>0;
end $$;
revoke all on function public.award_badge(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.award_badge(uuid,text,text,uuid) to service_role;

create or replace view public.fan_status with (security_invoker=true) as
select
  p.id as user_id,
  coalesce(sum(pl.points),0)::integer as points,
  fl.id as level_id,
  fl.name as level_name,
  fl.min_points as level_min_points,
  next_level.name as next_level_name,
  next_level.min_points as next_level_points
from public.profiles p
left join public.points_ledger pl on pl.user_id=p.id
left join lateral (
  select * from public.fan_levels
  where min_points<=coalesce((select sum(points) from public.points_ledger where user_id=p.id),0)
  order by min_points desc limit 1
) fl on true
left join lateral (
  select * from public.fan_levels
  where min_points>coalesce((select sum(points) from public.points_ledger where user_id=p.id),0)
  order by min_points asc limit 1
) next_level on true
group by p.id,fl.id,fl.name,fl.min_points,next_level.name,next_level.min_points;
grant select on public.fan_status to authenticated;

create or replace function public.claim_profile_completion_points()
returns jsonb language plpgsql security definer set search_path='' as $$
declare affected integer:=0; badge_awarded boolean:=false;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists(
    select 1 from public.profiles
    where id=auth.uid() and onboarding_completed
      and nullif(trim(display_name),'') is not null
      and nullif(trim(city),'') is not null
      and nullif(trim(country),'') is not null
  ) then raise exception 'profile incomplete'; end if;
  insert into public.points_ledger(user_id,points,reason,source_type,idempotency_key)
  values(auth.uid(),50,'Profile completed','profile','profile-complete:'||auth.uid())
  on conflict(idempotency_key) do nothing;
  get diagnostics affected=row_count;
  badge_awarded:=public.award_badge(auth.uid(),'profile-complete','profile',auth.uid());
  return jsonb_build_object('ok',true,'awarded',affected>0,'points',case when affected>0 then 50 else 0 end,'badge_awarded',badge_awarded);
end $$;
revoke all on function public.claim_profile_completion_points() from public,anon;
grant execute on function public.claim_profile_completion_points() to authenticated;

create or replace function public.claim_referral(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare referrer uuid; referral_id uuid; confirmed boolean;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select email_confirmed_at is not null into confirmed from auth.users where id=auth.uid();
  if not coalesce(confirmed,false) then raise exception 'confirmed account required'; end if;
  select id into referrer from public.profiles where referral_code=upper(trim(p_code));
  if referrer is null then raise exception 'invalid referral code'; end if;
  if referrer=auth.uid() then raise exception 'self referral is not allowed'; end if;
  insert into public.referrals(referrer_id,referred_id,status,rewarded_at)
  values(referrer,auth.uid(),'rewarded',now())
  on conflict(referred_id) do nothing returning id into referral_id;
  if referral_id is null then return jsonb_build_object('ok',true,'already_claimed',true); end if;
  insert into public.points_ledger(user_id,points,reason,source_type,source_id,idempotency_key)
  values(referrer,50,'Qualified referral','referral',referral_id,'referrer:'||referral_id),
        (auth.uid(),25,'Joined by referral','referral',referral_id,'referred:'||referral_id);
  perform public.award_badge(referrer,'first-referral','referral',referral_id);
  return jsonb_build_object('ok',true,'already_claimed',false);
end $$;
revoke all on function public.claim_referral(text) from public,anon;
grant execute on function public.claim_referral(text) to authenticated;

create or replace function public.record_fan_action(p_action text,p_source_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare awarded_points integer; key text; affected integer:=0; badge_slug text; badge_awarded boolean:=false;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  awarded_points:=case p_action when 'open_set' then 5 when 'confirm_attendance' then 10 when 'presave_click' then 15 when 'share' then 5 else null end;
  badge_slug:=case p_action when 'open_set' then 'set-opener' when 'confirm_attendance' then 'raver-confirmed' when 'presave_click' then 'first-presave' else null end;
  if awarded_points is null then raise exception 'unsupported action'; end if;
  if p_action='open_set' and not exists(select 1 from public.sets where id=p_source_id and publication_status='published') then raise exception 'invalid source'; end if;
  if p_action='confirm_attendance' and not exists(select 1 from public.event_attendees where event_id=p_source_id and user_id=auth.uid() and status='going') then raise exception 'attendance not confirmed'; end if;
  if p_action='presave_click' and not exists(select 1 from public.releases where id=p_source_id and publication_status='published' and releases_at>now()) then raise exception 'invalid source'; end if;
  if p_action='share' and not exists(
    select 1 from public.events where id=p_source_id and publication_status='published'
    union all select 1 from public.releases where id=p_source_id and publication_status='published'
    union all select 1 from public.sets where id=p_source_id and publication_status='published'
  ) then raise exception 'invalid source'; end if;
  if p_action='share' and (
    select count(*) from public.points_ledger
    where user_id=auth.uid() and source_type='fan_action' and reason='Share'
      and created_at>=date_trunc('day',now())
  )>=3 then raise exception 'daily share limit reached'; end if;
  key:=p_action||':'||auth.uid()||':'||p_source_id||case when p_action='share' then ':'||current_date::text else '' end;
  insert into public.points_ledger(user_id,points,reason,source_type,source_id,idempotency_key)
  values(auth.uid(),awarded_points,replace(initcap(p_action),'_',' '),'fan_action',p_source_id,key)
  on conflict(idempotency_key) do nothing;
  get diagnostics affected=row_count;
  if affected>0 and badge_slug is not null then
    badge_awarded:=public.award_badge(auth.uid(),badge_slug,'fan_action',p_source_id);
  end if;
  return jsonb_build_object('ok',true,'awarded',affected>0,'points',case when affected>0 then awarded_points else 0 end,'badge_awarded',badge_awarded);
end $$;
revoke all on function public.record_fan_action(text,uuid) from public,anon;
grant execute on function public.record_fan_action(text,uuid) to authenticated;

create or replace function public.create_checkin_token(p_event_id uuid,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare raw_token text; row_id uuid;
begin
  if not public.is_editor() then raise exception 'not authorized'; end if;
  if not exists(select 1 from public.events where id=p_event_id) then raise exception 'event not found'; end if;
  if p_expires_at<=now() then raise exception 'expiration must be in future'; end if;
  update public.event_checkin_tokens set active=false,revoked_at=now() where event_id=p_event_id and active;
  raw_token=translate(encode(gen_random_bytes(24),'base64'),'+/','-_');
  insert into public.event_checkin_tokens(event_id,token_hash,expires_at,created_by)
  values(p_event_id,encode(digest(raw_token,'sha256'),'hex'),p_expires_at,auth.uid())
  returning id into row_id;
  update public.events set checkin_enabled=true where id=p_event_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,new_values)
  values(auth.uid(),'checkin_token_created','event_checkin_tokens',row_id,jsonb_build_object('event_id',p_event_id,'expires_at',p_expires_at));
  return jsonb_build_object('id',row_id,'token',raw_token,'expires_at',p_expires_at);
end $$;
grant execute on function public.create_checkin_token(uuid,timestamptz) to authenticated;
revoke all on function public.create_checkin_token(uuid,timestamptz) from public,anon;

create or replace function public.disable_checkin_token(p_token_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare affected_event_id uuid;
begin
  if not public.is_editor() then raise exception 'not authorized'; end if;
  update public.event_checkin_tokens
  set active=false,revoked_at=now()
  where id=p_token_id
  returning event_checkin_tokens.event_id into affected_event_id;
  if affected_event_id is null then raise exception 'token not found'; end if;
  if not exists(select 1 from public.event_checkin_tokens where event_checkin_tokens.event_id=affected_event_id and active and revoked_at is null and expires_at>now()) then
    update public.events set checkin_enabled=false where id=affected_event_id;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,new_values)
  values(auth.uid(),'checkin_token_disabled','event_checkin_tokens',p_token_id,jsonb_build_object('event_id',affected_event_id));
  return jsonb_build_object('ok',true);
end $$;
grant execute on function public.disable_checkin_token(uuid) to authenticated;
revoke all on function public.disable_checkin_token(uuid) from public,anon;

create or replace function public.redeem_reward(p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare reward public.rewards; balance integer; redemption_id uuid; badge_awarded boolean:=false;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into reward from public.rewards where id=p_reward_id and publication_status='published' and (expires_at is null or expires_at>now()) for update;
  if not found then raise exception 'reward unavailable'; end if;
  if reward.inventory is not null and reward.inventory<=0 then raise exception 'out of stock'; end if;
  select coalesce(sum(points),0) into balance from public.points_ledger where user_id=auth.uid();
  if balance<reward.points_cost then raise exception 'insufficient points'; end if;
  insert into public.reward_redemptions(reward_id,user_id,points_spent)
  values(reward.id,auth.uid(),reward.points_cost)
  returning id into redemption_id;
  insert into public.points_ledger(user_id,points,reason,source_type,source_id,idempotency_key)
  values(auth.uid(),-reward.points_cost,'Reward redemption','reward_redemption',redemption_id,'redemption:'||redemption_id);
  if reward.inventory is not null then update public.rewards set inventory=inventory-1 where id=reward.id; end if;
  badge_awarded:=public.award_badge(auth.uid(),'first-reward','reward_redemption',redemption_id);
  return jsonb_build_object('ok',true,'redemption_id',redemption_id,'remaining_points',balance-reward.points_cost,'badge_awarded',badge_awarded);
end $$;
grant execute on function public.redeem_reward(uuid) to authenticated;
revoke all on function public.redeem_reward(uuid) from public,anon;

commit;

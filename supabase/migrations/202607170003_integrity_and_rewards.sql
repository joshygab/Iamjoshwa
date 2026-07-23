begin;

insert into public.badges(slug,name,description,active)
values('first-checkin','First Signal','Otorgada al completar el primer check-in verificado.',true)
on conflict(slug) do nothing;

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
  return jsonb_build_object('ok',true,'already_claimed',false);
end $$;
revoke all on function public.claim_referral(text) from public,anon;
grant execute on function public.claim_referral(text) to authenticated;

create or replace function public.claim_profile_completion_points()
returns jsonb language plpgsql security definer set search_path='' as $$
declare affected integer:=0;
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
  return jsonb_build_object('ok',true,'awarded',affected>0,'points',case when affected>0 then 50 else 0 end);
end $$;
revoke all on function public.claim_profile_completion_points() from public,anon;
grant execute on function public.claim_profile_completion_points() to authenticated;

create or replace function public.record_fan_action(p_action text,p_source_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare awarded_points integer; key text; affected integer:=0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  awarded_points:=case p_action when 'open_set' then 5 when 'confirm_attendance' then 10 when 'presave_click' then 15 when 'share' then 5 else null end;
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
  return jsonb_build_object('ok',true,'awarded',affected>0,'points',case when affected>0 then awarded_points else 0 end);
end $$;
revoke all on function public.record_fan_action(text,uuid) from public,anon;
grant execute on function public.record_fan_action(text,uuid) to authenticated;

create or replace function public.capture_content_version()
returns trigger language plpgsql security definer set search_path='' as $$
declare next_version integer;
begin
  if old is not distinct from new then return new; end if;
  select coalesce(max(version),0)+1 into next_version from public.content_versions where entity_type=tg_table_name and entity_id=old.id;
  insert into public.content_versions(entity_type,entity_id,version,snapshot,created_by)
  values(tg_table_name,old.id,next_version,to_jsonb(old),auth.uid());
  return new;
end $$;

create trigger artist_profiles_version before update on public.artist_profiles for each row execute function public.capture_content_version();
create trigger events_version before update on public.events for each row execute function public.capture_content_version();
create trigger releases_version before update on public.releases for each row execute function public.capture_content_version();
create trigger sets_version before update on public.sets for each row execute function public.capture_content_version();
create trigger page_sections_version before update on public.page_sections for each row execute function public.capture_content_version();
create trigger epk_content_version before update on public.epk_content for each row execute function public.capture_content_version();

create or replace function public.redeem_checkin(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.event_checkin_tokens; c public.event_checkins; badge uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into t from public.event_checkin_tokens where token_hash=encode(digest(p_token,'sha256'),'hex') and active and revoked_at is null and expires_at>now() for update;
  if not found then raise exception 'invalid or expired token'; end if;
  if not exists(select 1 from public.events where id=t.event_id and checkin_enabled) then raise exception 'check-in disabled'; end if;
  insert into public.event_checkins(event_id,user_id,token_id) values(t.event_id,auth.uid(),t.id) on conflict(event_id,user_id) do nothing returning * into c;
  if c.id is null then return jsonb_build_object('ok',true,'already_checked_in',true); end if;
  insert into public.points_ledger(user_id,points,reason,source_type,source_id,idempotency_key)
  values(auth.uid(),100,'Event check-in','event_checkin',c.id,'checkin:'||t.event_id||':'||auth.uid());
  select id into badge from public.badges where slug='first-checkin';
  if badge is not null then insert into public.user_badges(user_id,badge_id,source_type,source_id) values(auth.uid(),badge,'event_checkin',c.id) on conflict do nothing; end if;
  return jsonb_build_object('ok',true,'already_checked_in',false,'points',100,'badge_awarded',badge is not null);
end $$;

commit;

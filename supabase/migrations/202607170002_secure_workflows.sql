begin;
alter table public.rewards add column if not exists created_by uuid references auth.users(id);
insert into public.artist_profiles(project,display_name,tagline,subtitle,short_bio,long_bio,base_city,genres,status,published_at) values
('iamjoshwa','IAMJOSHWA','Ritmos que conectan cuerpos, ciudades y noches.','DJ & Producer — CDMX','DJ y productor de Ciudad de México.','IAMJOSHWA conecta house, tech house, afro house, latin house, disco, nu disco y sonidos electrónicos con energía de club desde Ciudad de México.','Ciudad de México',array['House','Tech House','Afro House','Latin House','Disco','Nu Disco','Reguetón','EDM'],'published',now()),
('afterluv','AFTERLUV','Too fast to forget. Too loud to heal.','The harder side of IAMJOSHWA','El lado más oscuro, rápido y emocional de IAMJOSHWA.','AFTERLUV explora hard bounce, hard trance, hard techno y euro dance desde una estética rave, Y2K y emocional.','Ciudad de México',array['Hard Bounce','Hard Trance','Hard Techno','Euro Dance'],'published',now()) on conflict(project) do nothing;
insert into public.brand_settings(project,primary_color,secondary_color,accent_color,background_color,text_color,gradient_css) values
('iamjoshwa','#b938ff','#ff2d8c','#f7f5fb','#070609','#f7f5fb','linear-gradient(135deg,#b938ff,#ff2d8c)'),
('afterluv','#ff1e35','#e7e7e7','#ffffff','#050505','#ffffff','linear-gradient(135deg,#ff1e35,#5b000b)') on conflict(project) do nothing;
create or replace function public.create_checkin_token(p_event_id uuid,p_expires_at timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare raw_token text; row_id uuid;
begin
  if not public.is_editor() then raise exception 'not authorized'; end if;
  if p_expires_at<=now() then raise exception 'expiration must be in future'; end if;
  update public.event_checkin_tokens set active=false,revoked_at=now() where event_id=p_event_id and active;
  raw_token=encode(gen_random_bytes(24),'base64');
  insert into public.event_checkin_tokens(event_id,token_hash,expires_at,created_by) values(p_event_id,encode(digest(raw_token,'sha256'),'hex'),p_expires_at,auth.uid()) returning id into row_id;
  update public.events set checkin_enabled=true where id=p_event_id;
  return jsonb_build_object('id',row_id,'token',raw_token,'expires_at',p_expires_at);
end $$;

create or replace function public.redeem_reward(p_reward_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare reward public.rewards; balance integer; redemption_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into reward from public.rewards where id=p_reward_id and publication_status='published' and (expires_at is null or expires_at>now()) for update;
  if not found then raise exception 'reward unavailable'; end if;
  if reward.inventory is not null and reward.inventory<=0 then raise exception 'out of stock'; end if;
  select coalesce(sum(points),0) into balance from public.points_ledger where user_id=auth.uid();
  if balance<reward.points_cost then raise exception 'insufficient points'; end if;
  insert into public.reward_redemptions(reward_id,user_id,points_spent) values(reward.id,auth.uid(),reward.points_cost) returning id into redemption_id;
  insert into public.points_ledger(user_id,points,reason,source_type,source_id,idempotency_key) values(auth.uid(),-reward.points_cost,'Reward redemption','reward_redemption',redemption_id,'redemption:'||redemption_id);
  if reward.inventory is not null then update public.rewards set inventory=inventory-1 where id=reward.id; end if;
  return jsonb_build_object('ok',true,'redemption_id',redemption_id,'remaining_points',balance-reward.points_cost);
end $$;

create or replace function public.process_publication_schedule() returns integer language plpgsql security definer set search_path='' as $$
declare job record; processed integer:=0;
begin
  for job in select * from public.publication_schedule where executed_at is null and execute_at<=now() order by execute_at for update skip locked loop
    begin
      if job.entity_type='events' then update public.events set publication_status=case when job.action='publish' then 'published'::public.publication_status else 'archived'::public.publication_status end,published_at=case when job.action='publish' then now() else published_at end where id=job.entity_id;
      elsif job.entity_type='releases' then update public.releases set publication_status=case when job.action='publish' then 'published'::public.publication_status else 'archived'::public.publication_status end where id=job.entity_id;
      elsif job.entity_type='sets' then update public.sets set publication_status=case when job.action='publish' then 'published'::public.publication_status else 'archived'::public.publication_status end where id=job.entity_id;
      elsif job.entity_type='page_sections' then update public.page_sections set publication_status=case when job.action='publish' then 'published'::public.publication_status else 'archived'::public.publication_status end,published_at=case when job.action='publish' then now() else published_at end where id=job.entity_id;
      end if;
      update public.publication_schedule set executed_at=now() where id=job.id; processed:=processed+1;
    exception when others then update public.publication_schedule set error=sqlerrm where id=job.id; end;
  end loop;
  return processed;
end $$;
grant execute on function public.create_checkin_token(uuid,timestamptz) to authenticated;
grant execute on function public.redeem_reward(uuid) to authenticated;
revoke all on function public.create_checkin_token(uuid,timestamptz) from public,anon;
revoke all on function public.redeem_reward(uuid) from public,anon;
revoke all on function public.process_publication_schedule() from public,anon,authenticated;
grant execute on function public.process_publication_schedule() to service_role;
commit;

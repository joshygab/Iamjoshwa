begin;

create or replace function public.restore_content_version(p_version_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  item public.content_versions;
  restored_id uuid;
  event_row public.events;
  release_row public.releases;
  set_row public.sets;
  history_row public.artist_timeline;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select * into item from public.content_versions where id=p_version_id;
  if not found then raise exception 'version not found'; end if;

  if item.entity_type='artist_profiles' then
    update public.artist_profiles set display_name=item.snapshot->>'display_name',tagline=item.snapshot->>'tagline',subtitle=item.snapshot->>'subtitle',short_bio=item.snapshot->>'short_bio',long_bio=item.snapshot->>'long_bio',base_city=item.snapshot->>'base_city',genres=coalesce(array(select jsonb_array_elements_text(item.snapshot->'genres')),'{}'),logo_asset_id=(item.snapshot->>'logo_asset_id')::uuid,alternate_logo_asset_id=(item.snapshot->>'alternate_logo_asset_id')::uuid,hero_desktop_asset_id=(item.snapshot->>'hero_desktop_asset_id')::uuid,hero_mobile_asset_id=(item.snapshot->>'hero_mobile_asset_id')::uuid,updated_at=now() where id=item.entity_id returning id into restored_id;
  elsif item.entity_type='events' then
    select * into event_row from jsonb_populate_record(null::public.events,item.snapshot);
    update public.events set slug=event_row.slug,project=event_row.project,name=event_row.name,flyer_asset_id=event_row.flyer_asset_id,starts_at=event_row.starts_at,doors_at=event_row.doors_at,set_starts_at=event_row.set_starts_at,venue=event_row.venue,address=event_row.address,city=event_row.city,country=event_row.country,latitude=event_row.latitude,longitude=event_row.longitude,lineup=event_row.lineup,genres=event_row.genres,age_restriction=event_row.age_restriction,price_amount=event_row.price_amount,currency=event_row.currency,ticket_url=event_row.ticket_url,promo_code=event_row.promo_code,description=event_row.description,faq=event_row.faq,event_status=event_row.event_status,publication_status=event_row.publication_status,featured=event_row.featured,updated_at=now() where id=item.entity_id returning id into restored_id;
  elsif item.entity_type='releases' then
    select * into release_row from jsonb_populate_record(null::public.releases,item.snapshot);
    update public.releases set slug=release_row.slug,project=release_row.project,name=release_row.name,cover_asset_id=release_row.cover_asset_id,release_type=release_row.release_type,releases_at=release_row.releases_at,preview_asset_id=release_row.preview_asset_id,story=release_row.story,credits=release_row.credits,presave_url=release_row.presave_url,publication_status=release_row.publication_status,featured=release_row.featured,updated_at=now() where id=item.entity_id returning id into restored_id;
  elsif item.entity_type='sets' then
    select * into set_row from jsonb_populate_record(null::public.sets,item.snapshot);
    update public.sets set slug=set_row.slug,project=set_row.project,title=set_row.title,cover_asset_id=set_row.cover_asset_id,description=set_row.description,recorded_at=set_row.recorded_at,location=set_row.location,duration_seconds=set_row.duration_seconds,genres=set_row.genres,bpm_min=set_row.bpm_min,bpm_max=set_row.bpm_max,energy=set_row.energy,category=set_row.category,soundcloud_url=set_row.soundcloud_url,youtube_url=set_row.youtube_url,mixcloud_url=set_row.mixcloud_url,external_url=set_row.external_url,access_level=set_row.access_level,publication_status=set_row.publication_status,featured=set_row.featured,updated_at=now() where id=item.entity_id returning id into restored_id;
  elsif item.entity_type='artist_timeline' then
    select * into history_row from jsonb_populate_record(null::public.artist_timeline,item.snapshot);
    update public.artist_timeline set project=history_row.project,title=history_row.title,body=history_row.body,occurred_at=history_row.occurred_at,asset_id=history_row.asset_id,publication_status=history_row.publication_status,position=history_row.position,updated_at=now() where id=item.entity_id returning id into restored_id;
  elsif item.entity_type='page_sections' then
    update public.page_sections set variant=item.snapshot->>'variant',content=coalesce(item.snapshot->'content','{}'),position=coalesce((item.snapshot->>'position')::integer,0),publication_status=coalesce((item.snapshot->>'publication_status')::public.publication_status,'draft'),updated_at=now() where id=item.entity_id returning id into restored_id;
  elsif item.entity_type='epk_content' then
    update public.epk_content set content=coalesce(item.snapshot->'content','{}'),position=coalesce((item.snapshot->>'position')::integer,0),publication_status=coalesce((item.snapshot->>'publication_status')::public.publication_status,'draft'),updated_at=now() where id=item.entity_id returning id into restored_id;
  else
    raise exception 'restoration is not supported for %',item.entity_type;
  end if;
  if restored_id is null then raise exception 'content no longer exists'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,new_values) values(auth.uid(),'restore_version',item.entity_type,item.entity_id,jsonb_build_object('version_id',item.id,'version',item.version));
  return jsonb_build_object('ok',true,'id',restored_id);
end $$;

revoke all on function public.restore_content_version(uuid) from public,anon,authenticated;
grant execute on function public.restore_content_version(uuid) to authenticated;

commit;

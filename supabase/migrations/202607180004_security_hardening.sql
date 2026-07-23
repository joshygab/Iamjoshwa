begin;

-- Sensitive workflow tables are written only through validated server routes/RPCs.
drop policy if exists waitlist_insert on public.event_waitlist;

-- Fans may edit their public profile fields, but never platform-issued identity fields.
create or replace function public.protect_profile_system_fields()
returns trigger language plpgsql set search_path='' as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    if new.id is distinct from old.id
       or new.member_number is distinct from old.member_number
       or new.referral_code is distinct from old.referral_code
       or new.created_at is distinct from old.created_at then
      raise exception 'system profile fields are immutable';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_protect_system_fields before update on public.profiles
for each row execute function public.protect_profile_system_fields();

-- Editors can upload and update public media; destructive storage operations are admin-only.
drop policy if exists editor_public_media_write on storage.objects;
create policy editor_public_media_insert on storage.objects for insert to authenticated
with check(bucket_id='public-media' and public.is_editor());
create policy editor_public_media_update on storage.objects for update to authenticated
using(bucket_id='public-media' and public.is_editor())
with check(bucket_id='public-media' and public.is_editor());
create policy admin_public_media_delete on storage.objects for delete to authenticated
using(bucket_id='public-media' and public.is_admin());

drop policy if exists private_docs_editor on storage.objects;
create policy private_docs_editor_read on storage.objects for select to authenticated
using(bucket_id='private-documents' and public.is_editor());
create policy private_docs_editor_insert on storage.objects for insert to authenticated
with check(bucket_id='private-documents' and public.is_editor());
create policy private_docs_editor_update on storage.objects for update to authenticated
using(bucket_id='private-documents' and public.is_editor())
with check(bucket_id='private-documents' and public.is_editor());
create policy private_docs_admin_delete on storage.objects for delete to authenticated
using(bucket_id='private-documents' and public.is_admin());

-- Restore a compatible historic snapshot without exposing arbitrary table writes.
create or replace function public.restore_content_version(p_version_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.content_versions; restored_id uuid;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select * into item from public.content_versions where id=p_version_id;
  if not found then raise exception 'version not found'; end if;
  if item.entity_type='artist_profiles' then
    update public.artist_profiles set
      display_name=item.snapshot->>'display_name', tagline=item.snapshot->>'tagline', subtitle=item.snapshot->>'subtitle',
      short_bio=item.snapshot->>'short_bio', long_bio=item.snapshot->>'long_bio', base_city=item.snapshot->>'base_city',
      genres=coalesce(array(select jsonb_array_elements_text(item.snapshot->'genres')),'{}'), updated_at=now()
    where id=item.entity_id returning id into restored_id;
  elsif item.entity_type='page_sections' then
    update public.page_sections set variant=item.snapshot->>'variant',content=coalesce(item.snapshot->'content','{}'),
      position=coalesce((item.snapshot->>'position')::integer,0),publication_status=coalesce((item.snapshot->>'publication_status')::public.publication_status,'draft'),updated_at=now()
    where id=item.entity_id returning id into restored_id;
  elsif item.entity_type='epk_content' then
    update public.epk_content set content=coalesce(item.snapshot->'content','{}'),position=coalesce((item.snapshot->>'position')::integer,0),
      publication_status=coalesce((item.snapshot->>'publication_status')::public.publication_status,'draft'),updated_at=now()
    where id=item.entity_id returning id into restored_id;
  else
    raise exception 'restoration is not supported for %',item.entity_type;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,new_values)
  values(auth.uid(),'restore_version',item.entity_type,item.entity_id,jsonb_build_object('version_id',item.id,'version',item.version));
  return jsonb_build_object('ok',true,'id',restored_id);
end $$;
revoke all on function public.restore_content_version(uuid) from public,anon,authenticated;
grant execute on function public.restore_content_version(uuid) to authenticated;

commit;

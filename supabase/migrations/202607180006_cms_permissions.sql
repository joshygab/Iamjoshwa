begin;

-- Publishing permission is enforced in Postgres, not only in the admin UI.
create or replace function public.can_publish_content()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.user_roles
      where user_id = auth.uid()
        and role = 'editor'
        and can_publish = true
    )
$$;

create or replace function public.enforce_publication_permission()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  previous_status public.publication_status;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    previous_status := old.publication_status;
  end if;

  if new.publication_status in ('published', 'scheduled')
     and (tg_op = 'INSERT' or new.publication_status is distinct from previous_status)
     and not public.can_publish_content() then
    raise exception 'publishing permission required' using errcode = '42501';
  end if;

  return new;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'events', 'releases', 'sets', 'media_items', 'artist_timeline',
    'rewards', 'page_sections', 'epk_content'
  ] loop
    execute format(
      'create trigger %I_enforce_publish before insert or update of publication_status on public.%I for each row execute function public.enforce_publication_permission()',
      table_name,
      table_name
    );
  end loop;
end
$$;

-- artist_profiles uses a status column with the same publication enum.
create or replace function public.enforce_artist_profile_publication()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if auth.role() <> 'service_role'
     and new.status in ('published', 'scheduled')
     and (tg_op = 'INSERT' or new.status is distinct from old.status)
     and not public.can_publish_content() then
    raise exception 'publishing permission required' using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger artist_profiles_enforce_publish
before insert or update of status on public.artist_profiles
for each row execute function public.enforce_artist_profile_publication();

-- Editors may create and edit media metadata, while deletion remains admin-only.
drop policy if exists media_assets_editor_all on public.media_assets;
create policy media_assets_editor_read on public.media_assets
for select to authenticated using(public.is_editor());
create policy media_assets_editor_insert on public.media_assets
for insert to authenticated with check(public.is_editor() and uploaded_by = auth.uid());
create policy media_assets_editor_update on public.media_assets
for update to authenticated using(public.is_editor()) with check(public.is_editor());
create policy media_assets_admin_delete on public.media_assets
for delete to authenticated using(public.is_admin());

-- Avoid deleting or demoting the final administrator account.
create or replace function public.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  admin_count integer;
begin
  if old.role <> 'admin' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.role = 'admin' then
    return new;
  end if;

  select count(*) into admin_count
  from public.user_roles
  where role = 'admin';

  if admin_count <= 1 then
    raise exception 'the last administrator cannot be removed' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create trigger user_roles_protect_last_admin
before update or delete on public.user_roles
for each row execute function public.protect_last_admin();

revoke all on function public.can_publish_content() from public, anon;
grant execute on function public.can_publish_content() to authenticated, service_role;

commit;

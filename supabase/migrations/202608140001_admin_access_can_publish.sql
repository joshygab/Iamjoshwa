begin;

-- Anyone with real CMS access can publish.
-- Fan accounts stay outside the CMS; editor and admin roles can publish without an extra checkbox.
create or replace function public.can_publish_content()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select public.is_editor()
$$;

update public.user_roles
set can_publish = true
where role in ('editor', 'admin')
  and can_publish = false;

update public.user_roles
set can_publish = false
where role = 'fan'
  and can_publish = true;

revoke all on function public.can_publish_content() from public, anon;
grant execute on function public.can_publish_content() to authenticated, service_role;

commit;

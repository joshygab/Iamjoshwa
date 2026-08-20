begin;

create table if not exists public.event_checkin_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code_hash text not null unique,
  active boolean not null default true,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (expires_at > created_at)
);

create unique index if not exists event_checkin_codes_one_active_per_event
  on public.event_checkin_codes(event_id)
  where active and revoked_at is null;

create index if not exists event_checkin_codes_lookup_idx
  on public.event_checkin_codes(code_hash, active, expires_at);

alter table public.event_checkin_codes enable row level security;

drop policy if exists event_checkin_codes_editor_read on public.event_checkin_codes;
create policy event_checkin_codes_editor_read
  on public.event_checkin_codes for select
  using (public.is_editor());

drop policy if exists event_checkin_codes_editor_insert on public.event_checkin_codes;
create policy event_checkin_codes_editor_insert
  on public.event_checkin_codes for insert
  with check (public.is_editor());

drop policy if exists event_checkin_codes_editor_update on public.event_checkin_codes;
create policy event_checkin_codes_editor_update
  on public.event_checkin_codes for update
  using (public.is_editor())
  with check (public.is_editor());

grant select, insert, update on public.event_checkin_codes to authenticated;
grant all on public.event_checkin_codes to service_role;

create or replace function public.normalize_event_checkin_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(upper(coalesce(p_code,'')), '[^A-Z0-9]', '', 'g')
$$;

create or replace function public.redeem_event_checkin_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text;
  checkin_code public.event_checkin_codes;
  target_event public.events;
  checkin_row public.event_checkins;
  badge uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  normalized_code := public.normalize_event_checkin_code(p_code);

  if char_length(normalized_code) < 4 or char_length(normalized_code) > 24 then
    raise exception 'invalid code';
  end if;

  select *
    into checkin_code
    from public.event_checkin_codes
   where code_hash = encode(digest(normalized_code, 'sha256'), 'hex')
     and active
     and revoked_at is null
     and expires_at > now()
   limit 1
   for update;

  if not found then
    raise exception 'invalid or expired code';
  end if;

  select *
    into target_event
    from public.events
   where id = checkin_code.event_id
     and checkin_enabled
     and publication_status = 'published'
     and event_status not in ('cancelled','completed')
   limit 1;

  if not found then
    raise exception 'check-in disabled';
  end if;

  insert into public.event_checkins(event_id, user_id, token_id)
  values(target_event.id, auth.uid(), null)
  on conflict(event_id, user_id) do nothing
  returning * into checkin_row;

  if checkin_row.id is null then
    return jsonb_build_object(
      'ok', true,
      'already_checked_in', true,
      'event_id', target_event.id,
      'event_name', target_event.name
    );
  end if;

  insert into public.points_ledger(user_id, points, reason, source_type, source_id, idempotency_key)
  values(
    auth.uid(),
    100,
    'Event check-in',
    'event_checkin',
    checkin_row.id,
    'checkin:' || target_event.id || ':' || auth.uid()
  )
  on conflict(idempotency_key) do nothing;

  select id into badge from public.badges where slug = 'first-checkin';
  if badge is not null then
    insert into public.user_badges(user_id, badge_id, source_type, source_id)
    values(auth.uid(), badge, 'event_checkin', checkin_row.id)
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'already_checked_in', false,
    'points', 100,
    'event_id', target_event.id,
    'event_name', target_event.name,
    'badge_awarded', badge is not null
  );
end $$;

revoke all on function public.normalize_event_checkin_code(text) from public, anon;
grant execute on function public.normalize_event_checkin_code(text) to authenticated, service_role;

revoke all on function public.redeem_event_checkin_code(text) from public, anon;
grant execute on function public.redeem_event_checkin_code(text) to authenticated;

create or replace function public.disable_checkin_token(p_token_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare affected_event_id uuid;
begin
  if not public.is_editor() then raise exception 'not authorized'; end if;
  update public.event_checkin_tokens
  set active=false,revoked_at=now()
  where id=p_token_id
  returning event_checkin_tokens.event_id into affected_event_id;
  if affected_event_id is null then raise exception 'token not found'; end if;
  if not exists(select 1 from public.event_checkin_tokens where event_checkin_tokens.event_id=affected_event_id and active and revoked_at is null and expires_at>now())
     and not exists(select 1 from public.event_checkin_codes where event_checkin_codes.event_id=affected_event_id and active and revoked_at is null and expires_at>now()) then
    update public.events set checkin_enabled=false where id=affected_event_id;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,new_values)
  values(auth.uid(),'checkin_token_disabled','event_checkin_tokens',p_token_id,jsonb_build_object('event_id',affected_event_id));
  return jsonb_build_object('ok',true);
end $$;

grant execute on function public.disable_checkin_token(uuid) to authenticated;
revoke all on function public.disable_checkin_token(uuid) from public, anon;

commit;

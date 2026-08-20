begin;

alter table public.events
  add column if not exists ends_at timestamptz;

alter table public.events
  drop constraint if exists events_ends_after_starts;

alter table public.events
  add constraint events_ends_after_starts
  check (ends_at is null or ends_at > starts_at) not valid;

alter table public.events
  validate constraint events_ends_after_starts;

create index if not exists events_public_end_idx
  on public.events(publication_status, ends_at);

create or replace function public.complete_past_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  update public.events
     set event_status='completed',
         updated_at=now()
   where coalesce(ends_at, starts_at + interval '6 hours') < now()
     and event_status not in ('completed','cancelled','rescheduled');
  get diagnostics n=row_count;
  return n;
end $$;

commit;

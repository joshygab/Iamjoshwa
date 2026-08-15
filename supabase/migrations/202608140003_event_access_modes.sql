begin;

alter table public.events
  add column if not exists ticket_mode text not null default 'tickets'
    check (ticket_mode in ('tickets','registration','free','none')),
  add column if not exists registration_url text
    check (registration_url is null or registration_url ~ '^https?://');

comment on column public.events.ticket_mode is 'Controls the public event CTA: tickets, registration, free, or none.';
comment on column public.events.registration_url is 'External registration/form URL used when ticket_mode is registration.';

update public.events
set ticket_mode = case
  when registration_url is not null then 'registration'
  when price_amount = 0 then 'free'
  when ticket_url is not null then 'tickets'
  else ticket_mode
end
where ticket_mode = 'tickets';

commit;

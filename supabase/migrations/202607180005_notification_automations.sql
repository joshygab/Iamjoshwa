begin;
alter table public.campaigns add column if not exists system_key text unique;

create or replace function public.enqueue_due_campaigns()
returns integer language plpgsql security definer set search_path='' as $$
declare event record; release record; inserted integer:=0; affected integer; reminder record;
begin
  for event in select * from public.events where publication_status='published' and event_status not in ('cancelled','completed') and starts_at between now() and now()+interval '8 days' loop
    for reminder in select * from (values ('event_7d',interval '7 days'),('event_24h',interval '24 hours'),('event_2h',interval '2 hours')) as r(kind,lead) loop
      if event.starts_at-reminder.lead between now()-interval '15 minutes' and now()+interval '15 minutes' then
        insert into public.campaigns(name,channel,trigger_type,audience_filters,subject,template_key,template_data,status,scheduled_at,system_key)
        values('Recordatorio · '||event.name,'email',reminder.kind,jsonb_build_object('project',event.project,'city',event.city),
          event.name||' se acerca',reminder.kind,jsonb_build_object('title',event.name,'message','Nos vemos en '||coalesce(event.venue,event.city)||'.','url','/fechas/'||event.slug),'scheduled',now(),reminder.kind||':'||event.id)
        on conflict(system_key) do nothing; get diagnostics affected=row_count; inserted:=inserted+affected;
      end if;
    end loop;
  end loop;
  for release in select * from public.releases where publication_status='published' and releases_at between now()-interval '15 minutes' and now()+interval '15 minutes' loop
    insert into public.campaigns(name,channel,trigger_type,audience_filters,subject,template_key,template_data,status,scheduled_at,system_key)
    values('Lanzamiento · '||release.name,'email','release_available',jsonb_build_object('project',release.project),release.name||' ya está disponible','release_available',jsonb_build_object('title',release.name,'message','La nueva señal ya está disponible.','url','/lanzamientos'),'scheduled',now(),'release_available:'||release.id)
    on conflict(system_key) do nothing; get diagnostics affected=row_count; inserted:=inserted+affected;
  end loop;
  return inserted;
end $$;
revoke all on function public.enqueue_due_campaigns() from public,anon,authenticated;
grant execute on function public.enqueue_due_campaigns() to service_role;
commit;

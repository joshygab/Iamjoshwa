begin;

alter table public.campaigns add column if not exists system_key text unique;

create or replace function public.enqueue_due_campaigns()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  event_record record;
  release_record record;
  set_record record;
  reward_record record;
  reminder record;
  inserted integer := 0;
  affected integer := 0;
begin
  for event_record in
    select *
    from public.events
    where publication_status = 'published'
      and event_status not in ('cancelled','completed')
      and starts_at between now() and now() + interval '8 days'
  loop
    insert into public.campaigns(name, channel, trigger_type, audience_filters, subject, template_key, template_data, status, scheduled_at, system_key)
    values (
      'Nueva fecha · ' || event_record.name,
      'email',
      'new_event',
      jsonb_build_object('project', event_record.project, 'city', event_record.city),
      'Nueva fecha: ' || event_record.name,
      'new_event',
      jsonb_build_object(
        'title', event_record.name,
        'message', 'Una nueva fecha está publicada en ' || coalesce(event_record.venue, event_record.city) || '.',
        'url', '/fechas/' || event_record.slug,
        'cta', 'Ver fecha'
      ),
      'scheduled',
      now(),
      'new_event:' || event_record.id
    )
    on conflict(system_key) do nothing;
    get diagnostics affected = row_count;
    inserted := inserted + affected;

    if event_record.event_status = 'last_tickets' then
      insert into public.campaigns(name, channel, trigger_type, audience_filters, subject, template_key, template_data, status, scheduled_at, system_key)
      values (
        'Últimos boletos · ' || event_record.name,
        'email',
        'last_tickets',
        jsonb_build_object('project', event_record.project, 'city', event_record.city),
        'Últimos boletos: ' || event_record.name,
        'last_tickets',
        jsonb_build_object(
          'title', event_record.name,
          'message', 'Quedan pocos boletos para ' || coalesce(event_record.venue, event_record.city) || '.',
          'url', '/fechas/' || event_record.slug,
          'cta', 'Comprar boletos'
        ),
        'scheduled',
        now(),
        'last_tickets:' || event_record.id
      )
      on conflict(system_key) do nothing;
      get diagnostics affected = row_count;
      inserted := inserted + affected;
    end if;

    for reminder in
      select *
      from (values
        ('event_7d', interval '7 days'),
        ('event_24h', interval '24 hours'),
        ('event_2h', interval '2 hours')
      ) as r(kind, lead)
    loop
      if event_record.starts_at - reminder.lead between now() - interval '1 day' and now() + interval '1 day' then
        insert into public.campaigns(name, channel, trigger_type, audience_filters, subject, template_key, template_data, status, scheduled_at, system_key)
        values (
          'Recordatorio · ' || event_record.name,
          'email',
          reminder.kind,
          jsonb_build_object('project', event_record.project, 'city', event_record.city),
          event_record.name || ' se acerca',
          reminder.kind,
          jsonb_build_object(
            'title', event_record.name,
            'message', 'Nos vemos en ' || coalesce(event_record.venue, event_record.city) || '. Revisa horarios y acceso.',
            'url', '/fechas/' || event_record.slug,
            'cta', 'Ver detalles'
          ),
          'scheduled',
          now(),
          reminder.kind || ':' || event_record.id
        )
        on conflict(system_key) do nothing;
        get diagnostics affected = row_count;
        inserted := inserted + affected;
      end if;
    end loop;
  end loop;

  for event_record in
    select *
    from public.events
    where publication_status = 'published'
      and event_status = 'completed'
      and starts_at between now() - interval '2 days' and now() - interval '8 hours'
  loop
    insert into public.campaigns(name, channel, trigger_type, audience_filters, subject, template_key, template_data, status, scheduled_at, system_key)
    values (
      'Post show · ' || event_record.name,
      'email',
      'post_event',
      jsonb_build_object('project', event_record.project, 'city', event_record.city),
      'Gracias por vivir ' || event_record.name,
      'post_event',
      jsonb_build_object(
        'title', event_record.name,
        'message', 'Gracias por ser parte de la noche. Revisa la plataforma para fotos, sets y nuevas señales.',
        'url', '/fechas/' || event_record.slug,
        'cta', 'Revive la fecha'
      ),
      'scheduled',
      now(),
      'post_event:' || event_record.id
    )
    on conflict(system_key) do nothing;
    get diagnostics affected = row_count;
    inserted := inserted + affected;
  end loop;

  for release_record in
    select *
    from public.releases
    where publication_status = 'published'
      and releases_at > now()
      and releases_at <= now() + interval '30 days'
      and nullif(presave_url, '') is not null
  loop
    insert into public.campaigns(name, channel, trigger_type, audience_filters, subject, template_key, template_data, status, scheduled_at, system_key)
    values (
      'Pre-save · ' || release_record.name,
      'email',
      'presave',
      jsonb_build_object('project', release_record.project),
      'Pre-save abierto: ' || release_record.name,
      'presave',
      jsonb_build_object(
        'title', release_record.name,
        'message', 'El pre-save ya está activo. Guarda el lanzamiento antes de que salga.',
        'url', '/lanzamientos/' || release_record.slug,
        'cta', 'Hacer pre-save'
      ),
      'scheduled',
      now(),
      'presave:' || release_record.id
    )
    on conflict(system_key) do nothing;
    get diagnostics affected = row_count;
    inserted := inserted + affected;
  end loop;

  for release_record in
    select *
    from public.releases
    where publication_status = 'published'
      and releases_at between now() - interval '1 day' and now() + interval '1 day'
  loop
    insert into public.campaigns(name, channel, trigger_type, audience_filters, subject, template_key, template_data, status, scheduled_at, system_key)
    values (
      'Lanzamiento · ' || release_record.name,
      'email',
      'release_available',
      jsonb_build_object('project', release_record.project),
      release_record.name || ' ya está disponible',
      'release_available',
      jsonb_build_object(
        'title', release_record.name,
        'message', 'La nueva señal ya está disponible en plataformas.',
        'url', '/lanzamientos/' || release_record.slug,
        'cta', 'Escuchar ahora'
      ),
      'scheduled',
      now(),
      'release_available:' || release_record.id
    )
    on conflict(system_key) do nothing;
    get diagnostics affected = row_count;
    inserted := inserted + affected;
  end loop;

  for set_record in
    select *
    from public.sets
    where publication_status = 'published'
      and access_level = 'public'
      and created_at >= now() - interval '1 day'
  loop
    insert into public.campaigns(name, channel, trigger_type, audience_filters, subject, template_key, template_data, status, scheduled_at, system_key)
    values (
      'Nuevo set · ' || set_record.title,
      'email',
      'new_set',
      jsonb_build_object('project', set_record.project),
      'Nuevo set: ' || set_record.title,
      'new_set',
      jsonb_build_object(
        'title', set_record.title,
        'message', 'Un nuevo set ya está disponible en la plataforma oficial.',
        'url', '/musica/' || set_record.slug,
        'cta', 'Escuchar set'
      ),
      'scheduled',
      now(),
      'new_set:' || set_record.id
    )
    on conflict(system_key) do nothing;
    get diagnostics affected = row_count;
    inserted := inserted + affected;
  end loop;

  for reward_record in
    select *
    from public.rewards
    where publication_status = 'published'
      and created_at >= now() - interval '1 day'
  loop
    insert into public.campaigns(name, channel, trigger_type, audience_filters, subject, template_key, template_data, status, scheduled_at, system_key)
    values (
      'Vault · ' || reward_record.name,
      'email',
      'exclusive',
      jsonb_build_object('project', reward_record.project),
      'Nuevo desbloqueable: ' || reward_record.name,
      'exclusive',
      jsonb_build_object(
        'title', reward_record.name,
        'message', coalesce(reward_record.description, 'Nuevo contenido exclusivo disponible en The Vault.'),
        'url', '/the-vault',
        'cta', 'Entrar al Vault'
      ),
      'scheduled',
      now(),
      'exclusive:' || reward_record.id
    )
    on conflict(system_key) do nothing;
    get diagnostics affected = row_count;
    inserted := inserted + affected;
  end loop;

  return inserted;
end $$;

revoke all on function public.enqueue_due_campaigns() from public, anon, authenticated;
grant execute on function public.enqueue_due_campaigns() to service_role;

commit;

begin;

create table if not exists public.site_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique check(section_key ~ '^[a-z0-9_/-]+$'),
  internal_name text not null,
  public_name text not null,
  slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
  project public.artist_project,
  status text not null default 'draft' check(status in ('draft','published','hidden','coming_soon','members_only','scheduled','archived')),
  show_in_navbar boolean not null default false,
  show_in_footer boolean not null default false,
  show_on_home boolean not null default false,
  show_in_sitemap boolean not null default true,
  requires_auth boolean not null default false,
  requires_pass boolean not null default false,
  min_pass_level smallint references public.fan_levels(id),
  publish_at timestamptz,
  unpublish_at timestamptz,
  position integer not null default 0,
  icon text,
  badge text,
  cta_label text,
  cta_href text check(cta_href is null or cta_href ~ '^(/|https://)'),
  seo_title text,
  seo_description text,
  seo_image_asset_id uuid references public.media_assets(id) on delete set null,
  indexable boolean not null default true,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(unpublish_at is null or publish_at is null or unpublish_at > publish_at)
);

create index if not exists site_sections_public_idx on public.site_sections(status,position);
create index if not exists site_sections_project_idx on public.site_sections(project,position);

alter table public.navigation_items add column if not exists section_id uuid references public.site_sections(id) on delete set null;
alter table public.navigation_items add column if not exists slug text;
alter table public.navigation_items add column if not exists target text not null default '_self' check(target in ('_self','_blank'));
alter table public.navigation_items add column if not exists icon text;
alter table public.navigation_items add column if not exists badge text;
alter table public.navigation_items add column if not exists show_in_navbar boolean not null default true;
alter table public.navigation_items add column if not exists show_in_footer boolean not null default false;
alter table public.navigation_items add column if not exists show_on_desktop boolean not null default true;
alter table public.navigation_items add column if not exists show_on_mobile boolean not null default true;
alter table public.navigation_items add column if not exists status text not null default 'published' check(status in ('draft','published','hidden','coming_soon','members_only','scheduled','archived'));
alter table public.navigation_items add column if not exists publish_at timestamptz;
alter table public.navigation_items add column if not exists unpublish_at timestamptz;

create table if not exists public.content_labels (
  id uuid primary key default gen_random_uuid(),
  label_key text not null unique check(label_key ~ '^[a-z0-9_.-]+$'),
  group_key text not null default 'global',
  default_value text not null,
  current_value text,
  description text,
  status text not null default 'published' check(status in ('draft','published','hidden','archived')),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_labels_group_idx on public.content_labels(group_key,label_key);

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  field_key text not null,
  previous_value jsonb,
  new_value jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists content_revisions_entity_idx on public.content_revisions(entity_type,entity_id,created_at desc);
create index if not exists content_revisions_field_idx on public.content_revisions(field_key,created_at desc);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  project public.artist_project,
  eyebrow text,
  title text not null,
  body text,
  cta_label text,
  cta_href text check(cta_href is null or cta_href ~ '^(/|https://)'),
  audience text not null default 'all' check(audience in ('all','visitors','members','pass','admins')),
  status text not null default 'draft' check(status in ('draft','published','hidden','scheduled','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  position integer not null default 0,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists announcements_public_idx on public.announcements(status,starts_at,ends_at,position);

create table if not exists public.cms_theme_settings (
  id uuid primary key default gen_random_uuid(),
  project public.artist_project not null unique,
  heading_font text not null default 'display',
  body_font text not null default 'body',
  heading_weight smallint not null default 800 check(heading_weight in (400,500,600,700,800)),
  heading_transform text not null default 'uppercase' check(heading_transform in ('normal','uppercase')),
  letter_spacing text not null default 'tight' check(letter_spacing in ('tight','normal','wide','ultra-wide')),
  accent_color text not null default '#a855f7' check(accent_color ~ '^#[0-9a-fA-F]{6}$'),
  background_color text not null default '#050505' check(background_color ~ '^#[0-9a-fA-F]{6}$'),
  surface_style text not null default 'glass' check(surface_style in ('solid','glass','chrome','minimal')),
  border_radius text not null default 'large' check(border_radius in ('none','small','medium','large','pill')),
  glow_intensity smallint not null default 2 check(glow_intensity between 0 and 3),
  animation_intensity smallint not null default 2 check(animation_intensity between 0 and 3),
  noise_intensity smallint not null default 1 check(noise_intensity between 0 and 3),
  glitch_intensity smallint not null default 0 check(glitch_intensity between 0 and 3),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_presets (
  id uuid primary key default gen_random_uuid(),
  preset_key text not null unique check(preset_key ~ '^[a-z0-9_-]+$'),
  name text not null,
  description text,
  config jsonb not null default '{}',
  active boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_sections(section_key,internal_name,public_name,slug,status,show_in_navbar,show_in_footer,show_on_home,show_in_sitemap,position,icon,cta_label,cta_href)
values
('home','Home','Home','home','published',true,false,true,true,0,'home','Enter','/'),
('shows','Shows / Fechas','Shows','fechas','published',true,true,true,true,10,'calendar','Open shows','/fechas'),
('music','Music','Music','musica','published',true,true,true,true,20,'music','Listen','/musica'),
('releases','Releases','Releases','lanzamientos','published',true,true,true,true,30,'disc','Open releases','/lanzamientos'),
('vault','The Vault','The Vault','the-vault','published',true,true,true,true,40,'lock','Enter Vault','/the-vault'),
('pass','Josh Pass / Comunidad','Pass','comunidad','published',true,true,true,true,50,'sparkles','Create Pass','/acceso'),
('media','Media','Media','media','published',true,true,false,true,60,'image','Open media','/media'),
('history','Historia','Historia','historia','published',true,true,false,true,70,'timeline','Read story','/historia'),
('epk','EPK','EPK','epk','published',true,true,false,true,80,'file','Open EPK','/epk'),
('booking','Booking','Booking','booking','published',false,true,true,true,90,'ticket','Book Now','/booking')
on conflict(section_key) do nothing;

insert into public.content_labels(label_key,group_key,default_value,current_value,description)
values
('global.loading','global','CONNECTING TO SIGNAL...',null,'Mensaje global de carga.'),
('global.comingSoon','global','COMING SOON',null,'Estado vacío general.'),
('nav.shows','navigation','Shows',null,'Etiqueta pública para Fechas.'),
('nav.music','navigation','Music',null,'Etiqueta pública para Música.'),
('nav.vault','navigation','The Vault',null,'Etiqueta pública para Vault.'),
('nav.pass','navigation','Pass',null,'Etiqueta pública para Pass.'),
('home.signalFeed.title','home','El pulso de IAMJOSHWA World.',null,'Título del Signal Feed en Home.'),
('shows.empty','shows','La próxima transmisión oficial todavía no fue revelada.',null,'Empty state de shows.'),
('vault.locked','vault','Locked drops. Secret codes. Private signals.',null,'Mensaje editorial de Vault.'),
('pass.join','pass','Create IAMJOSHWA Pass',null,'CTA de Josh Pass.'),
('booking.cta','booking','Book Now',null,'CTA principal de Booking.')
on conflict(label_key) do nothing;

insert into public.cms_theme_settings(project,accent_color,background_color,glow_intensity,animation_intensity,glitch_intensity)
values
('iamjoshwa','#a855f7','#050505',2,2,0),
('afterluv','#ff2b2b','#050505',2,2,2)
on conflict(project) do nothing;

insert into public.app_presets(preset_key,name,description,config)
values
('iamjoshwa_standard','IAMJOSHWA STANDARD','Configuración base del sitio oficial.', '{"mode":"standard"}'),
('show_mode','SHOW MODE','Prioriza countdown, boletos y próximo show.', '{"hero":"next_show","announcement":true,"navbar_priority":["shows","music","pass"]}'),
('release_mode','RELEASE MODE','Prioriza pre-save, plataformas y lanzamiento.', '{"hero":"latest_release","announcement":true,"navbar_priority":["releases","music","pass"]}'),
('afterluv_active','AFTERLUV ACTIVE','Activa prioridad visual y editorial para AFTERLUV.', '{"universe":"afterluv","glitch":true}')
on conflict(preset_key) do nothing;

do $$ declare t text; begin
  foreach t in array array['site_sections','content_labels','announcements','cms_theme_settings','app_presets'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_updated_at') then
      execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
    end if;
  end loop;
end $$;

alter table public.site_sections enable row level security;
alter table public.content_labels enable row level security;
alter table public.content_revisions enable row level security;
alter table public.announcements enable row level security;
alter table public.cms_theme_settings enable row level security;
alter table public.app_presets enable row level security;

drop policy if exists site_sections_public_read on public.site_sections;
create policy site_sections_public_read on public.site_sections for select using(
  status in ('published','coming_soon')
  and (publish_at is null or publish_at <= now())
  and (unpublish_at is null or unpublish_at > now())
);
drop policy if exists content_labels_public_read on public.content_labels;
create policy content_labels_public_read on public.content_labels for select using(status='published');
drop policy if exists announcements_public_read on public.announcements;
create policy announcements_public_read on public.announcements for select using(
  status='published'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);
drop policy if exists cms_theme_settings_public_read on public.cms_theme_settings;
create policy cms_theme_settings_public_read on public.cms_theme_settings for select using(true);
drop policy if exists app_presets_public_read on public.app_presets;
create policy app_presets_public_read on public.app_presets for select using(active=true);

do $$ declare t text; begin
  foreach t in array array['site_sections','content_labels','content_revisions','announcements','cms_theme_settings','app_presets'] loop
    execute format('drop policy if exists %I_editor_all on public.%I', t, t);
    execute format('create policy %I_editor_all on public.%I for all using (public.is_editor()) with check (public.is_editor())', t, t);
  end loop;
end $$;

commit;

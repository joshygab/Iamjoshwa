begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.artist_project as enum ('iamjoshwa','afterluv');
create type public.app_role as enum ('fan','editor','admin');
create type public.publication_status as enum ('draft','scheduled','published','archived');
create type public.booking_status as enum ('new','contacted','negotiating','confirmed','rejected','cancelled','completed');
create type public.delivery_status as enum ('queued','sent','delivered','failed','clicked','skipped');

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  public_alias text check (char_length(public_alias) <= 50), city text, country text,
  avatar_path text, favorite_project public.artist_project default 'iamjoshwa', favorite_genres text[] default '{}',
  member_number bigint generated always as identity unique, referral_code text unique default upper(substr(encode(gen_random_bytes(8),'hex'),1,10)),
  onboarding_completed boolean not null default false, account_deletion_requested_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'fan', can_publish boolean not null default false,
  created_at timestamptz not null default now(), primary key(user_id,role)
);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
$$;
create or replace function public.is_editor() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role in ('editor','admin'))
$$;
create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  event_announcements boolean default true, releases boolean default true, presaves boolean default true,
  sets boolean default true, ticket_alerts boolean default true, secret_events boolean default false,
  exclusive_content boolean default false, iamjoshwa boolean default true, afterluv boolean default true,
  city_based boolean default true, preferred_channel text not null default 'email' check(preferred_channel in ('email','whatsapp','push')),
  updated_at timestamptz not null default now()
);
create table public.notification_consents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check(channel in ('email','whatsapp','push')), granted boolean not null,
  source text not null, ip_hash text, user_agent_hash text, created_at timestamptz not null default now(),
  unique(user_id,channel,created_at)
);

create table public.artist_profiles (
  id uuid primary key default gen_random_uuid(), project public.artist_project not null unique,
  display_name text not null, logo_asset_id uuid, alternate_logo_asset_id uuid, hero_desktop_asset_id uuid, hero_mobile_asset_id uuid,
  tagline text, subtitle text, short_bio text, long_bio text, base_city text, genres text[] default '{}', booking_email citext,
  status public.publication_status not null default 'draft', published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.brand_settings (
  id uuid primary key default gen_random_uuid(), project public.artist_project not null unique,
  primary_color text not null, secondary_color text not null, accent_color text not null,
  background_color text not null, text_color text not null, gradient_css text,
  animation_intensity smallint not null default 2 check(animation_intensity between 0 and 3),
  hero_video_autoplay boolean default false, hero_video_loop boolean default true, hero_video_sound boolean default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.site_settings (
  key text primary key, value jsonb not null default '{}', is_public boolean not null default false,
  updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table public.navigation_items (
  id uuid primary key default gen_random_uuid(), project public.artist_project, label text not null, href text not null,
  position integer not null default 0, visible boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.social_links (
  id uuid primary key default gen_random_uuid(), project public.artist_project, platform text not null, label text not null,
  url text not null check(url ~ '^https?://'), position integer default 0, active boolean default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.media_collections (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text,
  is_private boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.media_assets (
  id uuid primary key default gen_random_uuid(), bucket text not null check(bucket in ('public-media','private-documents','user-avatars')),
  storage_path text not null unique, original_filename text not null, display_name text not null,
  mime_type text not null, extension text not null, byte_size bigint not null check(byte_size > 0), checksum text,
  width integer, height integer, duration_seconds numeric, focal_x numeric check(focal_x between 0 and 1), focal_y numeric check(focal_y between 0 and 1),
  title text, description text, alt_text text, tags text[] default '{}', collection_id uuid references public.media_collections(id),
  project public.artist_project, archived_at timestamptz, uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.artist_profiles add constraint artist_logo_fk foreign key(logo_asset_id) references public.media_assets(id) on delete set null;
alter table public.artist_profiles add constraint artist_alt_logo_fk foreign key(alternate_logo_asset_id) references public.media_assets(id) on delete set null;
alter table public.artist_profiles add constraint artist_hero_desktop_fk foreign key(hero_desktop_asset_id) references public.media_assets(id) on delete set null;
alter table public.artist_profiles add constraint artist_hero_mobile_fk foreign key(hero_mobile_asset_id) references public.media_assets(id) on delete set null;
create table public.media_usage (
  asset_id uuid not null references public.media_assets(id) on delete cascade, entity_type text not null, entity_id uuid not null,
  field_name text not null, created_at timestamptz not null default now(), primary key(asset_id,entity_type,entity_id,field_name)
);

create table public.events (
  id uuid primary key default gen_random_uuid(), slug text not null unique, project public.artist_project not null,
  name text not null, flyer_asset_id uuid references public.media_assets(id), starts_at timestamptz not null, doors_at timestamptz, set_starts_at timestamptz,
  venue text, address text, city text not null, country text not null, latitude numeric, longitude numeric,
  lineup text[] default '{}', genres text[] default '{}', age_restriction text, price_amount numeric check(price_amount >= 0), currency char(3),
  ticket_url text check(ticket_url is null or ticket_url ~ '^https?://'), promo_code text, description text, faq jsonb default '[]',
  event_status text not null default 'upcoming' check(event_status in ('upcoming','registration_open','presale','last_tickets','sold_out','waitlist','cancelled','rescheduled','completed')),
  publication_status public.publication_status not null default 'draft', featured boolean default false, checkin_enabled boolean default false,
  published_at timestamptz, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index events_public_date_idx on public.events(publication_status,starts_at);
create index events_project_date_idx on public.events(project,starts_at);
create table public.event_ticket_phases (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  name text not null, starts_at timestamptz, ends_at timestamptz, price_amount numeric, currency char(3), ticket_url text,
  position integer default 0, created_at timestamptz not null default now()
);
create table public.event_attendees (
  event_id uuid references public.events(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'going' check(status in ('going','interested','cancelled')), created_at timestamptz not null default now(),
  primary key(event_id,user_id)
);
create table public.event_waitlist (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, email citext, created_at timestamptz not null default now(),
  check(user_id is not null or email is not null)
);
create unique index event_waitlist_user_unique on public.event_waitlist(event_id,user_id) where user_id is not null;
create unique index event_waitlist_email_unique on public.event_waitlist(event_id,email) where email is not null;
create table public.event_checkin_tokens (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  token_hash text not null unique, active boolean not null default true, expires_at timestamptz not null,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), revoked_at timestamptz
);
create table public.event_checkins (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, token_id uuid references public.event_checkin_tokens(id),
  checked_in_at timestamptz not null default now(), unique(event_id,user_id)
);

create table public.releases (
  id uuid primary key default gen_random_uuid(), slug text not null unique, project public.artist_project not null, name text not null,
  cover_asset_id uuid references public.media_assets(id), release_type text not null, releases_at timestamptz not null,
  preview_asset_id uuid references public.media_assets(id), story text, credits jsonb default '[]', presave_url text,
  publication_status public.publication_status not null default 'draft', featured boolean default false,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index releases_public_date_idx on public.releases(publication_status,releases_at);
create table public.release_links (
  id uuid primary key default gen_random_uuid(), release_id uuid not null references public.releases(id) on delete cascade,
  platform text not null, url text not null check(url ~ '^https?://'), position integer default 0, created_at timestamptz not null default now(), unique(release_id,platform)
);
create table public.sets (
  id uuid primary key default gen_random_uuid(), slug text not null unique, project public.artist_project not null, title text not null,
  cover_asset_id uuid references public.media_assets(id), description text, recorded_at date, location text, duration_seconds integer,
  genres text[] default '{}', bpm_min integer, bpm_max integer, energy smallint check(energy between 1 and 5), category text,
  soundcloud_url text, youtube_url text, mixcloud_url text, external_url text,
  access_level text not null default 'public' check(access_level in ('public','exclusive')),
  publication_status public.publication_status not null default 'draft', featured boolean default false,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.set_tracks (
  id uuid primary key default gen_random_uuid(), set_id uuid not null references public.sets(id) on delete cascade,
  position integer not null, timestamp_seconds integer, artist text, title text not null, is_unreleased boolean default false, unique(set_id,position)
);
create table public.media_items (
  id uuid primary key default gen_random_uuid(), slug text not null unique, project public.artist_project, asset_id uuid references public.media_assets(id),
  title text, caption text, item_type text not null, occurred_at date, publication_status public.publication_status default 'draft', position integer default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.artist_timeline (
  id uuid primary key default gen_random_uuid(), project public.artist_project, title text not null, body text, occurred_at date,
  asset_id uuid references public.media_assets(id), publication_status public.publication_status default 'draft', position integer default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(), folio text not null unique default ('BK-' || to_char(now(),'YYYYMM') || '-' || upper(substr(encode(gen_random_bytes(5),'hex'),1,8))),
  name text not null, company text not null, email citext not null, whatsapp text, event_type text not null, event_date date not null,
  event_time time, city text not null, venue text, attendance integer check(attendance > 0), set_duration_minutes integer,
  project public.artist_project not null, desired_genres text[] default '{}', budget_text text, equipment text, production text, message text not null,
  contact_consent boolean not null, status public.booking_status not null default 'new', fingerprint_hash text, ip_hash text,
  assigned_to uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index booking_status_created_idx on public.booking_requests(status,created_at desc);
create unique index booking_duplicate_guard on public.booking_requests(email,event_date,project) where status not in ('rejected','cancelled');
create table public.availability (
  id uuid primary key default gen_random_uuid(), project public.artist_project not null, starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null check(status in ('available','hold','booked','unavailable')), notes text, created_at timestamptz default now(), updated_at timestamptz default now(), check(ends_at>starts_at)
);

create table public.fan_levels (
  id smallint primary key, name text not null unique, min_points integer not null unique check(min_points >= 0), position smallint not null unique
);
insert into public.fan_levels(id,name,min_points,position) values (1,'Listener',0,1),(2,'Inner Circle',100,2),(3,'Raver',350,3),(4,'Afterlover',800,4),(5,'Day One',1600,5),(6,'Legend',3000,6);
create table public.points_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null check(points <> 0), reason text not null, source_type text not null, source_id uuid,
  idempotency_key text not null unique, metadata jsonb default '{}', created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create index points_user_created_idx on public.points_ledger(user_id,created_at desc);
create table public.badges (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, description text,
  project public.artist_project, image_asset_id uuid references public.media_assets(id), active boolean default true, created_at timestamptz default now()
);
create table public.user_badges (
  user_id uuid references auth.users(id) on delete cascade, badge_id uuid references public.badges(id) on delete cascade,
  source_type text, source_id uuid, awarded_at timestamptz default now(), primary key(user_id,badge_id)
);
create table public.referrals (
  id uuid primary key default gen_random_uuid(), referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null unique references auth.users(id) on delete cascade, status text default 'pending' check(status in ('pending','qualified','rewarded','rejected')),
  rewarded_at timestamptz, created_at timestamptz default now(), check(referrer_id<>referred_id)
);
create table public.rewards (
  id uuid primary key default gen_random_uuid(), slug text not null unique, project public.artist_project, name text not null,
  image_asset_id uuid references public.media_assets(id), description text, points_cost integer not null check(points_cost>=0),
  inventory integer check(inventory is null or inventory>=0), expires_at timestamptz, requirements jsonb default '{}',
  publication_status public.publication_status default 'draft', created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(), reward_id uuid not null references public.rewards(id), user_id uuid not null references auth.users(id),
  points_spent integer not null, status text default 'pending' check(status in ('pending','approved','fulfilled','cancelled')),
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table public.page_sections (
  id uuid primary key default gen_random_uuid(), page_key text not null, project public.artist_project, block_type text not null,
  variant text not null default 'default', content jsonb not null default '{}', position integer not null default 0,
  publication_status public.publication_status not null default 'draft', publish_at timestamptz, published_at timestamptz,
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create index page_sections_public_idx on public.page_sections(page_key,project,publication_status,position);
create table public.content_versions (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null, version integer not null,
  snapshot jsonb not null, created_by uuid references auth.users(id), created_at timestamptz default now(), unique(entity_type,entity_id,version)
);
create table public.publication_schedule (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null, action text not null check(action in ('publish','archive')),
  execute_at timestamptz not null, executed_at timestamptz, error text, created_by uuid references auth.users(id), created_at timestamptz default now()
);
create index publication_due_idx on public.publication_schedule(execute_at) where executed_at is null;
create table public.seo_metadata (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid, path text not null unique,
  title text, description text, share_asset_id uuid references public.media_assets(id), canonical_url text, indexable boolean default true,
  structured_data jsonb default '{}', created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.epk_content (
  id uuid primary key default gen_random_uuid(), project public.artist_project, section_key text not null, content jsonb not null default '{}',
  publication_status public.publication_status default 'draft', position integer default 0, created_at timestamptz default now(), updated_at timestamptz default now(), unique(project,section_key)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(), name text not null, channel text not null check(channel in ('email','whatsapp','push')),
  trigger_type text, audience_filters jsonb default '{}', subject text, template_key text not null, template_data jsonb default '{}',
  status text default 'draft' check(status in ('draft','scheduled','sending','sent','cancelled')), scheduled_at timestamptz,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.campaign_deliveries (
  id uuid primary key default gen_random_uuid(), campaign_id uuid references public.campaigns(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null, destination_hash text not null, provider_message_id text,
  status public.delivery_status default 'queued', error_code text, sent_at timestamptz, delivered_at timestamptz, clicked_at timestamptz,
  idempotency_key text not null unique, created_at timestamptz default now()
);
create table public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id), action text not null,
  entity_type text not null, entity_id uuid, old_values jsonb, new_values jsonb, ip_hash text, created_at timestamptz default now()
);
create index audit_entity_idx on public.audit_logs(entity_type,entity_id,created_at desc);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'name',split_part(new.email,'@',1)));
  insert into public.user_roles(user_id,role) values(new.id,'fan');
  insert into public.notification_preferences(user_id) values(new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.award_points(p_user_id uuid,p_points integer,p_reason text,p_source_type text,p_source_id uuid,p_idempotency_key text,p_metadata jsonb default '{}')
returns public.points_ledger language plpgsql security definer set search_path = '' as $$
declare result public.points_ledger;
begin
  if p_points = 0 or (auth.uid() <> p_user_id and not public.is_admin()) then raise exception 'not authorized'; end if;
  insert into public.points_ledger(user_id,points,reason,source_type,source_id,idempotency_key,metadata,created_by)
  values(p_user_id,p_points,p_reason,p_source_type,p_source_id,p_idempotency_key,p_metadata,auth.uid()) returning * into result;
  return result;
end $$;
revoke all on function public.award_points(uuid,integer,text,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.award_points(uuid,integer,text,text,uuid,text,jsonb) to service_role;

create or replace function public.redeem_checkin(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.event_checkin_tokens; c public.event_checkins;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into t from public.event_checkin_tokens where token_hash=encode(digest(p_token,'sha256'),'hex') and active and revoked_at is null and expires_at>now() for update;
  if not found then raise exception 'invalid or expired token'; end if;
  insert into public.event_checkins(event_id,user_id,token_id) values(t.event_id,auth.uid(),t.id) on conflict(event_id,user_id) do nothing returning * into c;
  if c.id is null then return jsonb_build_object('ok',true,'already_checked_in',true); end if;
  insert into public.points_ledger(user_id,points,reason,source_type,source_id,idempotency_key)
  values(auth.uid(),100,'Event check-in','event_checkin',c.id,'checkin:'||t.event_id||':'||auth.uid());
  return jsonb_build_object('ok',true,'already_checked_in',false,'points',100);
end $$;

create or replace function public.complete_past_events() returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin update public.events set event_status='completed',updated_at=now() where starts_at<now() and event_status not in ('completed','cancelled','rescheduled'); get diagnostics n=row_count; return n; end $$;

create or replace view public.fan_point_totals with (security_invoker=true) as
select user_id,coalesce(sum(points),0)::integer as points from public.points_ledger group by user_id;

do $$ declare t text; begin foreach t in array array['profiles','notification_preferences','artist_profiles','brand_settings','navigation_items','social_links','media_collections','media_assets','events','releases','sets','media_items','artist_timeline','booking_requests','availability','rewards','page_sections','seo_metadata','epk_content','campaigns'] loop execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t); end loop; end $$;

alter table public.profiles enable row level security; alter table public.user_roles enable row level security;
alter table public.notification_preferences enable row level security; alter table public.notification_consents enable row level security;
do $$ declare t text; begin foreach t in array array['artist_profiles','brand_settings','site_settings','navigation_items','social_links','media_collections','media_assets','media_usage','events','event_ticket_phases','event_attendees','event_waitlist','event_checkin_tokens','event_checkins','releases','release_links','sets','set_tracks','media_items','artist_timeline','booking_requests','availability','points_ledger','fan_levels','badges','user_badges','referrals','rewards','reward_redemptions','page_sections','content_versions','publication_schedule','seo_metadata','epk_content','campaigns','campaign_deliveries','audit_logs'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

create policy profile_self_read on public.profiles for select using(id=auth.uid() or public.is_admin());
create policy profile_self_update on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy roles_self_read on public.user_roles for select using(user_id=auth.uid() or public.is_admin());
create policy roles_admin_all on public.user_roles for all using(public.is_admin()) with check(public.is_admin());
create policy preferences_self on public.notification_preferences for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy consents_self_read on public.notification_consents for select using(user_id=auth.uid() or public.is_admin());
create policy consents_self_insert on public.notification_consents for insert with check(user_id=auth.uid());

create policy artist_profiles_public_read on public.artist_profiles for select using(status='published');
create policy brand_settings_public_read on public.brand_settings for select using(true);
create policy site_settings_public_read on public.site_settings for select using(is_public);
create policy navigation_items_public_read on public.navigation_items for select using(visible);
create policy social_links_public_read on public.social_links for select using(active);
create policy media_assets_public_read on public.media_assets for select using(bucket='public-media' and archived_at is null);
create policy events_public_read on public.events for select using(publication_status='published');
create policy event_ticket_phases_public_read on public.event_ticket_phases for select using(exists(select 1 from public.events e where e.id=event_id and e.publication_status='published'));
create policy releases_public_read on public.releases for select using(publication_status='published');
create policy release_links_public_read on public.release_links for select using(exists(select 1 from public.releases r where r.id=release_id and r.publication_status='published'));
create policy sets_public_read on public.sets for select using(publication_status='published' and access_level='public');
create policy set_tracks_public_read on public.set_tracks for select using(exists(select 1 from public.sets s where s.id=set_id and s.publication_status='published' and s.access_level='public'));
create policy media_items_public_read on public.media_items for select using(publication_status='published');
create policy artist_timeline_public_read on public.artist_timeline for select using(publication_status='published');
create policy page_sections_public_read on public.page_sections for select using(publication_status='published' and (publish_at is null or publish_at<=now()));
create policy seo_metadata_public_read on public.seo_metadata for select using(true);
create policy epk_content_public_read on public.epk_content for select using(publication_status='published');
create policy rewards_public_read on public.rewards for select using(publication_status='published' and (expires_at is null or expires_at>now()));
create policy badges_public_read on public.badges for select using(active);
create policy fan_levels_public_read on public.fan_levels for select using(true);
do $$ declare t text; begin foreach t in array array['artist_profiles','brand_settings','site_settings','navigation_items','social_links','media_collections','media_assets','media_usage','events','event_ticket_phases','releases','release_links','sets','set_tracks','media_items','artist_timeline','availability','rewards','page_sections','content_versions','publication_schedule','seo_metadata','epk_content','campaigns'] loop execute format('create policy %I_editor_all on public.%I for all using (public.is_editor()) with check (public.is_editor())',t,t); end loop; end $$;
create policy attendees_self on public.event_attendees for all using(user_id=auth.uid() or public.is_editor()) with check(user_id=auth.uid() or public.is_editor());
create policy waitlist_self on public.event_waitlist for select using(user_id=auth.uid() or public.is_editor());
create policy waitlist_insert on public.event_waitlist for insert with check(user_id=auth.uid() or user_id is null);
create policy checkins_self_read on public.event_checkins for select using(user_id=auth.uid() or public.is_editor());
create policy points_self_read on public.points_ledger for select using(user_id=auth.uid() or public.is_admin());
create policy badges_self_read on public.user_badges for select using(user_id=auth.uid() or public.is_editor());
create policy referrals_self_read on public.referrals for select using(referrer_id=auth.uid() or referred_id=auth.uid() or public.is_admin());
create policy redemptions_self_read on public.reward_redemptions for select using(user_id=auth.uid() or public.is_editor());
create policy booking_editor_read on public.booking_requests for select using(public.is_editor());
create policy audit_admin_read on public.audit_logs for select using(public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('public-media','public-media',true,52428800,array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml','video/mp4','video/webm','audio/mpeg','audio/wav','application/pdf']),
('private-documents','private-documents',false,52428800,array['application/pdf']),
('user-avatars','user-avatars',true,5242880,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do nothing;
create policy public_media_read on storage.objects for select using(bucket_id='public-media');
create policy editor_public_media_write on storage.objects for all using(bucket_id='public-media' and public.is_editor()) with check(bucket_id='public-media' and public.is_editor());
create policy avatar_read on storage.objects for select using(bucket_id='user-avatars');
create policy avatar_owner_write on storage.objects for all using(bucket_id='user-avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='user-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy private_docs_editor on storage.objects for all using(bucket_id='private-documents' and public.is_editor()) with check(bucket_id='private-documents' and public.is_editor());

commit;

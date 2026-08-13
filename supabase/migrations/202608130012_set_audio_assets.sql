begin;

alter table public.sets add column if not exists audio_asset_id uuid;

do $$
begin
  alter table public.sets
    add constraint sets_audio_asset_fk
    foreign key (audio_asset_id)
    references public.media_assets(id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;

create index if not exists sets_audio_asset_idx on public.sets(audio_asset_id) where audio_asset_id is not null;

create or replace function public.validate_set_audio_asset()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.audio_asset_id is not null and not exists (
    select 1
    from public.media_assets asset
    where asset.id = new.audio_asset_id
      and asset.bucket = 'public-media'
      and asset.archived_at is null
      and asset.mime_type in ('audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav')
  ) then
    raise exception 'set audio asset must be an active public MP3 or WAV file';
  end if;

  return new;
end $$;

drop trigger if exists validate_set_audio_asset_trigger on public.sets;
create trigger validate_set_audio_asset_trigger
before insert or update of audio_asset_id on public.sets
for each row execute function public.validate_set_audio_asset();

revoke all on function public.validate_set_audio_asset() from public, anon, authenticated;
grant execute on function public.validate_set_audio_asset() to service_role;

commit;

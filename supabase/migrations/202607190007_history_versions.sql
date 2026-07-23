begin;
create trigger artist_timeline_version before update on public.artist_timeline
for each row execute function public.capture_content_version();
commit;

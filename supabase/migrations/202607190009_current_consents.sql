begin;

create index if not exists notification_consents_latest_idx
on public.notification_consents(user_id,channel,created_at desc);

create or replace view public.current_notification_consents
with (security_invoker=true)
as
select distinct on (user_id,channel)
  id,user_id,channel,granted,source,created_at
from public.notification_consents
order by user_id,channel,created_at desc,id desc;

commit;

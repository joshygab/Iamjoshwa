begin;

create or replace function public.redeem_reward(p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  reward public.rewards;
  balance integer;
  redemption_id uuid;
  badge_awarded boolean:=false;
  unlock_at timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into reward
  from public.rewards
  where id=p_reward_id
    and publication_status='published'
    and (expires_at is null or expires_at>now())
  for update;

  if not found then raise exception 'reward unavailable'; end if;

  if reward.requirements ? 'unlock_at' then
    unlock_at := nullif(reward.requirements->>'unlock_at','')::timestamptz;
    if unlock_at is not null and unlock_at>now() then
      raise exception 'reward locked';
    end if;
  end if;

  if reward.inventory is not null and reward.inventory<=0 then raise exception 'out of stock'; end if;

  select coalesce(sum(points),0) into balance
  from public.points_ledger
  where user_id=auth.uid();

  if balance<reward.points_cost then raise exception 'insufficient points'; end if;

  insert into public.reward_redemptions(reward_id,user_id,points_spent)
  values(reward.id,auth.uid(),reward.points_cost)
  returning id into redemption_id;

  insert into public.points_ledger(user_id,points,reason,source_type,source_id,idempotency_key)
  values(auth.uid(),-reward.points_cost,'Reward redemption','reward_redemption',redemption_id,'redemption:'||redemption_id);

  if reward.inventory is not null then
    update public.rewards set inventory=inventory-1 where id=reward.id;
  end if;

  badge_awarded:=public.award_badge(auth.uid(),'first-reward','reward_redemption',redemption_id);

  return jsonb_build_object(
    'ok',true,
    'redemption_id',redemption_id,
    'remaining_points',balance-reward.points_cost,
    'badge_awarded',badge_awarded
  );
end $$;

grant execute on function public.redeem_reward(uuid) to authenticated;
revoke all on function public.redeem_reward(uuid) from public,anon;

commit;

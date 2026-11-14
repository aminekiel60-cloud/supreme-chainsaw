-- Daily AI photo limit, used only by the food-photo Edge Function (service role).

-- Takes one credit for today. Returns how many are used now, or -1 when the limit is reached.
create function public.use_ai_credit(p_user uuid, p_day date, p_limit integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  insert into public.ai_usage as u (user_id, day, count) values (p_user, p_day, 1)
  on conflict (user_id, day) do update set count = u.count + 1 where u.count < p_limit
  returning u.count into used;
  return coalesce(used, -1);
end;
$$;

-- Gives a credit back when the AI call failed.
create function public.refund_ai_credit(p_user uuid, p_day date) returns void
language sql security definer set search_path = '' as $$
  update public.ai_usage set count = greatest(count - 1, 0) where user_id = p_user and day = p_day;
$$;

-- Not callable from the app — only the server (service role) may use them.
revoke execute on function public.use_ai_credit(uuid, date, integer) from public, anon, authenticated;
revoke execute on function public.refund_ai_credit(uuid, date) from public, anon, authenticated;
grant execute on function public.use_ai_credit(uuid, date, integer) to service_role;
grant execute on function public.refund_ai_credit(uuid, date) to service_role;

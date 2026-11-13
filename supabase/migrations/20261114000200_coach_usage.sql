-- Weekly coach (AI) usage: a few requests per user per week.
-- Only the server (Edge Function, service role) reads and writes this.
create table public.coach_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  week date not null,
  count integer not null default 0,
  primary key (user_id, week)
);
alter table public.coach_usage enable row level security;

-- Take one request for this week. Returns the new count, or -1 when the limit is reached.
create function public.use_coach_credit(p_user uuid, p_week date, p_limit integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.coach_usage (user_id, week, count) values (p_user, p_week, 1)
  on conflict (user_id, week) do update set count = public.coach_usage.count + 1
  where public.coach_usage.count < p_limit
  returning count into n;
  return coalesce(n, -1);
end;
$$;

create function public.refund_coach_credit(p_user uuid, p_week date) returns void
language sql security definer set search_path = '' as $$
  update public.coach_usage set count = greatest(count - 1, 0) where user_id = p_user and week = p_week;
$$;

revoke execute on function public.use_coach_credit(uuid, date, integer) from public, anon, authenticated;
revoke execute on function public.refund_coach_credit(uuid, date) from public, anon, authenticated;
grant execute on function public.use_coach_credit(uuid, date, integer) to service_role;
grant execute on function public.refund_coach_credit(uuid, date) to service_role;

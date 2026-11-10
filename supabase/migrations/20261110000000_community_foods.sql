-- Community food database: products that users add when a barcode isn't
-- found in Open Food Facts. Shared with all users immediately.
-- Bad entries disappear once 3 different users report them.

create table public.community_foods (
  barcode text primary key check (barcode ~ '^[0-9]{6,14}$'),
  name text not null check (char_length(name) between 1 and 120),
  -- Nutrition per 100 g (or 100 ml)
  kcal numeric not null check (kcal between 0 and 950),
  protein numeric not null check (protein between 0 and 100),
  carbs numeric not null check (carbs between 0 and 100),
  fat numeric not null check (fat between 0 and 100),
  serving_grams numeric check (serving_grams is null or serving_grams between 1 and 2000),
  created_by uuid references auth.users (id) on delete set null,
  reports integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One report per user per product.
create table public.community_food_reports (
  barcode text not null references public.community_foods (barcode) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (barcode, user_id)
);

alter table public.community_foods enable row level security;
alter table public.community_food_reports enable row level security;

-- Everyone signed in can read products that haven't been reported 3+ times.
create policy "read community foods" on public.community_foods
  for select to authenticated using (reports < 3);

-- Anyone signed in can add a product, as themselves.
create policy "add community food" on public.community_foods
  for insert to authenticated with check (created_by = (select auth.uid()) and reports = 0);

-- The person who added it can correct it.
create policy "edit own community food" on public.community_foods
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

-- Users may only change the product details, never the report count or owner.
revoke update on public.community_foods from authenticated, anon;
grant update (name, kcal, protein, carbs, fat, serving_grams, updated_at) on public.community_foods to authenticated;

-- Reports are written only through report_community_food() below.

-- Report a product as wrong. Returns the new report count.
create function public.report_community_food(p_barcode text) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if (select auth.uid()) is null then raise exception 'not signed in'; end if;
  insert into public.community_food_reports (barcode, user_id) values (p_barcode, (select auth.uid()))
  on conflict do nothing;
  select count(*) into n from public.community_food_reports where barcode = p_barcode;
  update public.community_foods set reports = n where barcode = p_barcode;
  return n;
end;
$$;

revoke execute on function public.report_community_food(text) from public, anon;
grant execute on function public.report_community_food(text) to authenticated;

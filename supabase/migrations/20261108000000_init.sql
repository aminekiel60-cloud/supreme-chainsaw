-- Locked in — database schema
-- Every table has Row Level Security (RLS) on: the app ships a public key,
-- so these policies are what keep each user's data private.

-- ───────────────────────── Profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Athlete',
  -- Short code friends type in to add you, e.g. "K7Q2MX"
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  week_start date,
  week_points integer not null default 0,
  streak integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Athlete'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Private app data ─────────────────────────
-- Your full log (food, workouts, habits, goals) as one JSON document,
-- so it survives a new phone and stays in sync.
create table public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Friends ─────────────────────────
create table public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));

-- True when a and b are accepted friends.
create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a))
  );
$$;

-- ───────────────────────── Feed ─────────────────────────
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The local id of what this post is about, so it's only shared once
  ref text not null,
  kind text not null check (kind in ('workout', 'locked_in', 'achievement')),
  title text not null,
  stats jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, ref)
);
create index posts_created on public.posts (created_at desc);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

create table public.post_comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Can the current user see this post? (own post or a friend's)
create function public.can_see_post(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.posts
    where id = p and (user_id = (select auth.uid()) or public.are_friends(user_id, (select auth.uid())))
  );
$$;

-- ───────────────────────── Challenges ─────────────────────────
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  metric text not null check (metric in ('run_km', 'workouts', 'locked_in_days', 'protein_days')),
  target numeric not null check (target > 0),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.challenge_members (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  progress numeric not null default 0,
  primary key (challenge_id, user_id)
);

create function public.can_see_challenge(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.challenges ch
    where ch.id = c and (
      ch.creator = (select auth.uid())
      or public.are_friends(ch.creator, (select auth.uid()))
      or exists (select 1 from public.challenge_members m where m.challenge_id = c and m.user_id = (select auth.uid()))
    )
  );
$$;

-- ───────────────────────── AI photo usage (daily limit) ─────────────────────────
-- Only the server (Edge Function) reads and writes this table.
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.user_data enable row level security;
alter table public.friendships enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;
alter table public.ai_usage enable row level security;

-- Profiles: any signed-in user can look people up (to add friends); you edit only your own.
create policy "profiles readable by signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Private data: only yours.
create policy "own data" on public.user_data
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Friendships: both people can see it; you send requests as yourself;
-- the receiver accepts; either side can remove it.
create policy "see own friendships" on public.friendships
  for select to authenticated using ((select auth.uid()) in (requester, addressee));
create policy "send request" on public.friendships
  for insert to authenticated with check (requester = (select auth.uid()) and status = 'pending');
create policy "accept request" on public.friendships
  for update to authenticated using (addressee = (select auth.uid())) with check (addressee = (select auth.uid()));
create policy "remove friendship" on public.friendships
  for delete to authenticated using ((select auth.uid()) in (requester, addressee));

-- Posts: you and your friends see them; you write and delete your own.
create policy "see own and friends posts" on public.posts
  for select to authenticated
  using (user_id = (select auth.uid()) or public.are_friends(user_id, (select auth.uid())));
create policy "create own posts" on public.posts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "delete own posts" on public.posts
  for delete to authenticated using (user_id = (select auth.uid()));

-- Likes and comments: on posts you can see, as yourself.
create policy "see likes" on public.post_likes
  for select to authenticated using (public.can_see_post(post_id));
create policy "like" on public.post_likes
  for insert to authenticated with check (user_id = (select auth.uid()) and public.can_see_post(post_id));
create policy "unlike" on public.post_likes
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "see comments" on public.post_comments
  for select to authenticated using (public.can_see_post(post_id));
create policy "comment" on public.post_comments
  for insert to authenticated with check (user_id = (select auth.uid()) and public.can_see_post(post_id));
create policy "delete own comment" on public.post_comments
  for delete to authenticated using (user_id = (select auth.uid()));

-- Challenges: visible to the creator, their friends and members.
create policy "see challenges" on public.challenges
  for select to authenticated using (public.can_see_challenge(id));
create policy "create challenge" on public.challenges
  for insert to authenticated with check (creator = (select auth.uid()));
create policy "delete own challenge" on public.challenges
  for delete to authenticated using (creator = (select auth.uid()));

create policy "see members" on public.challenge_members
  for select to authenticated using (public.can_see_challenge(challenge_id));
create policy "join challenge" on public.challenge_members
  for insert to authenticated with check (user_id = (select auth.uid()) and public.can_see_challenge(challenge_id));
create policy "update own progress" on public.challenge_members
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "leave challenge" on public.challenge_members
  for delete to authenticated using (user_id = (select auth.uid()));

-- Column limits: users may only change these columns, never ids or invite codes.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, week_start, week_points, streak, updated_at) on public.profiles to authenticated;
revoke update on public.friendships from authenticated, anon;
grant update (status) on public.friendships to authenticated;
revoke update on public.challenge_members from authenticated, anon;
grant update (progress) on public.challenge_members to authenticated;

-- ai_usage: no policies → no client access. The Edge Function uses the service role.

-- Realtime: live updates for the feed and friend requests.
alter publication supabase_realtime add table public.posts, public.post_likes, public.post_comments, public.friendships;

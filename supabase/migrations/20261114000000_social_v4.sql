-- Social v4
-- 1. Fix: creating a challenge failed. The "see challenges" rule looked the
--    challenge up again in the same statement, where the new row isn't
--    visible yet, so every insert that returned the row was refused.
-- 2. Public posts (opt-in per post) for the "For You" feed.
-- 3. Block and report, required once strangers can see each other's posts.
-- 4. Public challenges, "training now", captions and photo / meal posts.

-- ───────────────────────── Blocks ─────────────────────────
create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;
create policy "see own blocks" on public.blocks
  for select to authenticated using (blocker = (select auth.uid()));
create policy "block someone" on public.blocks
  for insert to authenticated with check (blocker = (select auth.uid()));
create policy "unblock" on public.blocks
  for delete to authenticated using (blocker = (select auth.uid()));

-- Is there a block between the current user and `other`, in either direction?
create function public.is_blocked(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker = (select auth.uid()) and blocked = other)
       or (blocker = other and blocked = (select auth.uid()))
  );
$$;

-- Blocking someone also ends the friendship (and with it any coach access).
create function public.unfriend_on_block() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friendships
  where (requester = new.blocker and addressee = new.blocked)
     or (requester = new.blocked and addressee = new.blocker);
  return new;
end;
$$;
create trigger unfriend_on_block after insert on public.blocks
  for each row execute function public.unfriend_on_block();

-- ───────────────────────── Posts ─────────────────────────
alter table public.posts add column visibility text not null default 'friends'
  check (visibility in ('friends', 'public'));
alter table public.posts add column caption text check (char_length(caption) <= 500);
alter table public.posts drop constraint posts_kind_check;
alter table public.posts add constraint posts_kind_check
  check (kind in ('workout', 'locked_in', 'achievement', 'photo', 'meal', 'run', 'pr'));
create index posts_public on public.posts (created_at desc) where visibility = 'public';
create index posts_photo_path on public.posts (photo_path) where photo_path is not null;

grant update (visibility, caption) on public.posts to authenticated;

create table public.post_reports (
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('spam', 'nudity', 'hate', 'harassment', 'violence', 'other')),
  created_at timestamptz not null default now(),
  primary key (post_id, reporter)
);
-- Nobody reads reports through the API; only the owner of the project does.
alter table public.post_reports enable row level security;

-- Posts with 3 or more reports leave the public feed until someone looks at them.
create function public.report_count(p uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.post_reports where post_id = p;
$$;

drop policy "see own and friends posts" on public.posts;
create policy "see own, friends and public posts" on public.posts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      not public.is_blocked(user_id)
      and (public.are_friends(user_id, (select auth.uid())) or visibility = 'public')
    )
  );

create or replace function public.can_see_post(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.posts
    where id = p and (
      user_id = (select auth.uid())
      or (
        not public.is_blocked(user_id)
        and (public.are_friends(user_id, (select auth.uid())) or visibility = 'public')
      )
    )
  );
$$;

-- Comments from people you blocked (or who blocked you) are hidden.
drop policy "see comments" on public.post_comments;
create policy "see comments" on public.post_comments
  for select to authenticated using (public.can_see_post(post_id) and not public.is_blocked(user_id));

-- Report a post you can see, once. Returns false if you can't see it.
create function public.report_post(p_post uuid, p_reason text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not public.can_see_post(p_post) then
    return false;
  end if;
  insert into public.post_reports (post_id, reporter, reason)
  values (p_post, (select auth.uid()), p_reason)
  on conflict do nothing;
  return true;
end;
$$;
revoke execute on function public.report_post(uuid, text) from public, anon;
grant execute on function public.report_post(uuid, text) to authenticated;

-- Photos of public posts can be opened by every signed-in user.
create function public.is_public_photo(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.posts
    where photo_path = path and visibility = 'public' and not public.is_blocked(user_id)
  );
$$;
create policy "public post photos visible to everyone signed in" on storage.objects
  for select to authenticated using (bucket_id = 'workout-photos' and public.is_public_photo(name));

-- ───────────────────────── Profiles ─────────────────────────
-- Set while you're in a live workout, so friends see "training now".
alter table public.profiles add column training_since timestamptz;
grant update (training_since) on public.profiles to authenticated;

-- ───────────────────────── Feeds ─────────────────────────
-- Older app versions call get_feed(p_limit). It now lists only your own and
-- your friends' posts, exactly as before public posts existed.
create or replace function public.get_feed(p_limit integer default 50)
returns table (
  id uuid, user_id uuid, kind text, title text, stats jsonb, created_at timestamptz,
  workout_type text, photo_path text, tagged uuid[], tagged_names text[],
  author_name text, author_avatar text, author_level integer,
  likes integer, liked_by_me boolean, comments integer
)
language sql stable set search_path = '' as $$
  select
    p.id, p.user_id, p.kind, p.title, p.stats, p.created_at, p.workout_type, p.photo_path, p.tagged,
    coalesce((select array_agg(pr.display_name order by pr.display_name) from public.profiles pr where pr.id = any (p.tagged)), '{}'),
    a.display_name, a.avatar_url, a.level,
    (select count(*)::integer from public.post_likes l where l.post_id = p.id),
    exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = (select auth.uid())),
    (select count(*)::integer from public.post_comments c where c.post_id = p.id)
  from public.posts p
  join public.profiles a on a.id = p.user_id
  where p.user_id = (select auth.uid()) or public.are_friends(p.user_id, (select auth.uid()))
  order by p.created_at desc
  limit greatest(1, least(p_limit, 200));
$$;

-- p_scope 'following': you and your friends. 'for_you': public posts from
-- everyone else, minus blocked people and posts with 3+ reports.
-- p_before: pass the created_at of the last post you have to load older ones.
create function public.get_feed_v2(p_scope text default 'following', p_limit integer default 30, p_before timestamptz default null)
returns table (
  id uuid, user_id uuid, kind text, title text, caption text, stats jsonb, created_at timestamptz,
  workout_type text, photo_path text, visibility text, tagged uuid[], tagged_names text[],
  author_name text, author_avatar text, author_level integer, author_training boolean, is_friend boolean,
  likes integer, liked_by_me boolean, comments integer, latest_comment jsonb
)
language sql stable set search_path = '' as $$
  select
    p.id, p.user_id, p.kind, p.title, p.caption, p.stats, p.created_at, p.workout_type, p.photo_path, p.visibility, p.tagged,
    coalesce((select array_agg(pr.display_name order by pr.display_name) from public.profiles pr where pr.id = any (p.tagged)), '{}'),
    a.display_name, a.avatar_url, a.level,
    coalesce(a.training_since > now() - interval '4 hours', false),
    public.are_friends(p.user_id, (select auth.uid())),
    (select count(*)::integer from public.post_likes l where l.post_id = p.id),
    exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = (select auth.uid())),
    (select count(*)::integer from public.post_comments c where c.post_id = p.id and not public.is_blocked(c.user_id)),
    (select jsonb_build_object('name', ca.display_name, 'body', c.body)
       from public.post_comments c join public.profiles ca on ca.id = c.user_id
      where c.post_id = p.id and not public.is_blocked(c.user_id)
      order by c.created_at desc limit 1)
  from public.posts p
  join public.profiles a on a.id = p.user_id
  where (p_before is null or p.created_at < p_before)
    and case
      when p_scope = 'for_you' then
        p.visibility = 'public'
        and p.user_id <> (select auth.uid())
        and not public.is_blocked(p.user_id)
        and public.report_count(p.id) < 3
      else
        p.user_id = (select auth.uid()) or public.are_friends(p.user_id, (select auth.uid()))
    end
  order by p.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;
revoke execute on function public.get_feed_v2(text, integer, timestamptz) from public, anon;
grant execute on function public.get_feed_v2(text, integer, timestamptz) to authenticated;

-- ───────────────────────── Challenges ─────────────────────────
alter table public.challenges add column visibility text not null default 'friends'
  check (visibility in ('friends', 'public'));

create function public.is_challenge_member(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.challenge_members where challenge_id = c and user_id = (select auth.uid()));
$$;

-- The fix: decide on the row's own columns instead of looking the row up again.
drop policy "see challenges" on public.challenges;
create policy "see challenges" on public.challenges
  for select to authenticated using (
    creator = (select auth.uid())
    or public.is_challenge_member(id)
    or (not public.is_blocked(creator) and (visibility = 'public' or public.are_friends(creator, (select auth.uid()))))
  );

create or replace function public.can_see_challenge(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.challenges ch
    where ch.id = c and (
      ch.creator = (select auth.uid())
      or exists (select 1 from public.challenge_members m where m.challenge_id = c and m.user_id = (select auth.uid()))
      or (not public.is_blocked(ch.creator) and (ch.visibility = 'public' or public.are_friends(ch.creator, (select auth.uid()))))
    )
  );
$$;

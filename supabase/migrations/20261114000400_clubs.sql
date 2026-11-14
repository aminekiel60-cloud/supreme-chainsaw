-- Gym clubs
-- A club is a group of people who train together (a gym, a team, a group of mates).
-- The owner chooses:
--   private: you join with the club code or invite link,
--   public:  anyone can find it by name and join.
-- Members see each other's posts that were shared with friends (the club feed),
-- the weekly ranking and the club's challenges. The owner can remove members.

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  description text not null default '' check (char_length(description) <= 300),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now()
);
create index clubs_public_name on public.clubs (lower(name)) where visibility = 'public';

create table public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index club_members_user on public.club_members (user_id);

-- The join code lives in its own table so only members can read it.
create table public.club_codes (
  club_id uuid primary key references public.clubs (id) on delete cascade,
  code text not null unique
);

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_codes enable row level security;

create function public.is_club_member(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.club_members where club_id = c and user_id = (select auth.uid()));
$$;

create function public.is_club_owner(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clubs where id = c and owner = (select auth.uid()));
$$;

-- Are a and b in at least one club together?
create function public.share_club(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.club_members x
    join public.club_members y on y.club_id = x.club_id
    where x.user_id = a and y.user_id = b
  );
$$;

-- Clubs: members see their clubs, everyone sees public clubs (unless blocked by the owner).
create policy "see own and public clubs" on public.clubs
  for select to authenticated using (
    public.is_club_member(id) or (visibility = 'public' and not public.is_blocked(owner))
  );
create policy "owner edits club" on public.clubs
  for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy "owner deletes club" on public.clubs
  for delete to authenticated using (owner = (select auth.uid()));
-- Only these can change; clubs are created with create_club().
revoke insert, update on public.clubs from authenticated, anon;
grant update (name, description, visibility) on public.clubs to authenticated;

-- Members: you see the members of your clubs. You can leave; the owner can remove anyone but themself.
create policy "see club members" on public.club_members
  for select to authenticated using (public.is_club_member(club_id));
create policy "leave or remove from club" on public.club_members
  for delete to authenticated using (
    (user_id = (select auth.uid()) and not public.is_club_owner(club_id))
    or (public.is_club_owner(club_id) and user_id <> (select auth.uid()))
  );
-- Joining only goes through join_club() / join_public_club().
revoke insert, update on public.club_members from authenticated, anon;

create policy "members read code" on public.club_codes
  for select to authenticated using (public.is_club_member(club_id));
revoke insert, update, delete on public.club_codes from authenticated, anon;

-- A code like "K7M2QX9P": no 0/O or 1/I, easy to read out loud.
create function public.new_club_code_value() returns text
language plpgsql volatile set search_path = '' as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
begin
  loop
    result := '';
    for i in 1..8 loop
      result := result || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.club_codes where code = result);
  end loop;
  return result;
end;
$$;

-- Create a club; you become its owner and first member. Max 10 clubs you own.
create function public.create_club(p_name text, p_description text default '', p_visibility text default 'private')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  new_id uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.clubs where owner = me) >= 10 then
    raise exception 'too_many_clubs';
  end if;
  insert into public.clubs (owner, name, description, visibility)
  values (me, btrim(p_name), coalesce(btrim(p_description), ''), p_visibility)
  returning id into new_id;
  insert into public.club_members (club_id, user_id) values (new_id, me);
  insert into public.club_codes (club_id, code) values (new_id, public.new_club_code_value());
  return new_id;
end;
$$;

-- Shared by both ways of joining. Max 300 members per club, 20 clubs per person.
create function public.add_club_member(p_club uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  c public.clubs;
begin
  select * into c from public.clubs where id = p_club;
  if c.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if public.is_blocked(c.owner) then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if exists (select 1 from public.club_members where club_id = p_club and user_id = me) then
    return jsonb_build_object('ok', true, 'club', p_club, 'name', c.name, 'already', true);
  end if;
  if (select count(*) from public.club_members where club_id = p_club) >= 300 then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;
  if (select count(*) from public.club_members where user_id = me) >= 20 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;
  insert into public.club_members (club_id, user_id) values (p_club, me);
  return jsonb_build_object('ok', true, 'club', p_club, 'name', c.name, 'already', false);
end;
$$;
revoke execute on function public.add_club_member(uuid) from public, anon, authenticated;

-- Join with a code (private or public clubs). Wrong codes count towards the
-- same hourly limit as friend invites, so codes can't be guessed.
create function public.join_club(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  club uuid;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if (select count(*) from public.invite_attempts where user_id = me and created_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'too_many_tries');
  end if;
  select club_id into club from public.club_codes where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if club is null then
    insert into public.invite_attempts (user_id) values (me);
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return public.add_club_member(club);
end;
$$;

-- Join a public club from search.
create function public.join_public_club(p_club uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not exists (select 1 from public.clubs where id = p_club and visibility = 'public') then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return public.add_club_member(p_club);
end;
$$;

-- Owner only: a new code; the old code and links stop working.
create function public.reset_club_code(p_club uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  result text;
begin
  if not public.is_club_owner(p_club) then raise exception 'not the owner'; end if;
  result := public.new_club_code_value();
  update public.club_codes set code = result where club_id = p_club;
  return result;
end;
$$;

-- My clubs, or public clubs matching a name, with the member count.
create function public.list_clubs(p_query text default null)
returns table (id uuid, name text, description text, visibility text, owner uuid, owner_name text, members integer, is_member boolean, created_at timestamptz)
language sql stable set search_path = '' as $$
  select c.id, c.name, c.description, c.visibility, c.owner, o.display_name,
    (select count(*)::integer from public.club_members m where m.club_id = c.id),
    public.is_club_member(c.id), c.created_at
  from public.clubs c
  join public.profiles o on o.id = c.owner
  where case
    when p_query is null then public.is_club_member(c.id)
    else c.visibility = 'public' and c.name ilike '%' || replace(replace(btrim(p_query), '%', ''), '_', '') || '%'
  end
  order by case when p_query is null then 0 else (select count(*) from public.club_members m where m.club_id = c.id) end desc, c.created_at desc
  limit 50;
$$;

-- Posts of club members that were shared with friends (or everyone).
create function public.get_club_feed(p_club uuid, p_limit integer default 30, p_before timestamptz default null)
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
  where public.is_club_member(p_club)
    and p.user_id in (select m.user_id from public.club_members m where m.club_id = p_club)
    and not public.is_blocked(p.user_id)
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;

revoke execute on function public.create_club(text, text, text), public.join_club(text), public.join_public_club(uuid),
  public.reset_club_code(uuid), public.list_clubs(text), public.get_club_feed(uuid, integer, timestamptz) from public, anon;
grant execute on function public.create_club(text, text, text), public.join_club(text), public.join_public_club(uuid),
  public.reset_club_code(uuid), public.list_clubs(text), public.get_club_feed(uuid, integer, timestamptz) to authenticated;

-- ───────────── Posts: clubmates see what you share with friends ─────────────
drop policy "see own, friends and public posts" on public.posts;
create policy "see own, friends, clubmates and public posts" on public.posts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      not public.is_blocked(user_id)
      and (public.are_friends(user_id, (select auth.uid())) or visibility = 'public' or public.share_club(user_id, (select auth.uid())))
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
        and (public.are_friends(user_id, (select auth.uid())) or visibility = 'public' or public.share_club(user_id, (select auth.uid())))
      )
    )
  );
$$;

-- Workout photos of clubmates.
create policy "workout photo visible to clubmates" on storage.objects
  for select to authenticated using (
    bucket_id = 'workout-photos'
    and public.share_club(((storage.foldername(name))[1])::uuid, (select auth.uid()))
    and not public.is_blocked(((storage.foldername(name))[1])::uuid)
  );

-- ───────────── Club challenges ─────────────
alter table public.challenges add column club_id uuid references public.clubs (id) on delete cascade;
create index challenges_club on public.challenges (club_id) where club_id is not null;

drop policy "see challenges" on public.challenges;
create policy "see challenges" on public.challenges
  for select to authenticated using (
    creator = (select auth.uid())
    or public.is_challenge_member(id)
    or (club_id is not null and public.is_club_member(club_id))
    or (club_id is null and not public.is_blocked(creator) and (visibility = 'public' or public.are_friends(creator, (select auth.uid()))))
  );

-- Only members can start a challenge in a club.
drop policy "create challenge" on public.challenges;
create policy "create challenge" on public.challenges
  for insert to authenticated with check (
    creator = (select auth.uid()) and (club_id is null or public.is_club_member(club_id))
  );

create or replace function public.can_see_challenge(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.challenges ch
    where ch.id = c and (
      ch.creator = (select auth.uid())
      or exists (select 1 from public.challenge_members m where m.challenge_id = c and m.user_id = (select auth.uid()))
      or (ch.club_id is not null and public.is_club_member(ch.club_id))
      or (ch.club_id is null and not public.is_blocked(ch.creator) and (ch.visibility = 'public' or public.are_friends(ch.creator, (select auth.uid()))))
    )
  );
$$;

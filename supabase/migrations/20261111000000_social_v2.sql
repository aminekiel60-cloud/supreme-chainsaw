-- Social v2: profile pictures, workout photos, tagging friends, levels and Coach.

-- ───────────── Profiles: picture + level ─────────────
alter table public.profiles add column avatar_url text;
alter table public.profiles add column xp integer not null default 0;
alter table public.profiles add column level integer not null default 1;
grant update (avatar_url, xp, level) on public.profiles to authenticated;

-- ───────────── Posts: sport, photo and tagged friends ─────────────
alter table public.posts add column workout_type text;
-- Path inside the workout-photos storage bucket: "<user id>/<file>.jpg"
alter table public.posts add column photo_path text;
alter table public.posts add column tagged uuid[] not null default '{}';
-- Owners may update their own posts (e.g. add a photo or tag a friend later).
create policy "update own posts" on public.posts
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.posts from authenticated, anon;
grant update (title, stats, photo_path, tagged, workout_type) on public.posts to authenticated;

-- You can only tag accepted friends.
create function public.only_friends_tagged() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from unnest(new.tagged) t where not public.are_friends(new.user_id, t)) then
    raise exception 'You can only tag friends';
  end if;
  return new;
end;
$$;
create trigger posts_only_friends_tagged before insert or update of tagged on public.posts
  for each row execute function public.only_friends_tagged();

-- ───────────── Coach: share your nutrition with chosen friends ─────────────
create table public.coach_access (
  owner uuid not null references public.profiles (id) on delete cascade,
  coach uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner, coach),
  check (owner <> coach)
);
alter table public.coach_access enable row level security;

create policy "see coach links" on public.coach_access
  for select to authenticated using ((select auth.uid()) in (owner, coach));
create policy "grant coach access to a friend" on public.coach_access
  for insert to authenticated with check (owner = (select auth.uid()) and public.are_friends(owner, coach));
create policy "revoke coach access" on public.coach_access
  for delete to authenticated using ((select auth.uid()) in (owner, coach));

-- A coach may read the full log of the people who chose them.
create policy "coach reads shared data" on public.user_data
  for select to authenticated using (
    exists (select 1 from public.coach_access c where c.owner = user_id and c.coach = (select auth.uid()))
  );

-- Ending a friendship also ends coach access both ways.
create function public.end_coach_on_unfriend() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.coach_access
  where (owner = old.requester and coach = old.addressee) or (owner = old.addressee and coach = old.requester);
  return old;
end;
$$;
create trigger friendships_end_coach after delete on public.friendships
  for each row execute function public.end_coach_on_unfriend();

-- ───────────── Storage ─────────────
-- Profile pictures: anyone with the link can view; you only write your own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Workout photos: private; only you and your friends can view them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workout-photos', 'workout-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "avatar upload own folder" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar update own folder" on storage.objects
  for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar delete own folder" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "workout photo upload own folder" on storage.objects
  for insert to authenticated with check (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "workout photo delete own folder" on storage.objects
  for delete to authenticated using (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "workout photo visible to owner and friends" on storage.objects
  for select to authenticated using (
    bucket_id = 'workout-photos' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.are_friends(((storage.foldername(name))[1])::uuid, (select auth.uid()))
    )
  );

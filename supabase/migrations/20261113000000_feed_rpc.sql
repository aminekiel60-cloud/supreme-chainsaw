-- The feed in one call. Runs as the caller (security invoker), so the
-- Row Level Security rules on posts decide what you can see: your own posts
-- and your friends' posts.

create function public.get_feed(p_limit integer default 50)
returns table (
  id uuid,
  user_id uuid,
  kind text,
  title text,
  stats jsonb,
  created_at timestamptz,
  workout_type text,
  photo_path text,
  tagged uuid[],
  tagged_names text[],
  author_name text,
  author_avatar text,
  author_level integer,
  likes integer,
  liked_by_me boolean,
  comments integer
)
language sql stable
set search_path = ''
as $$
  select
    p.id,
    p.user_id,
    p.kind,
    p.title,
    p.stats,
    p.created_at,
    p.workout_type,
    p.photo_path,
    p.tagged,
    coalesce((select array_agg(pr.display_name order by pr.display_name) from public.profiles pr where pr.id = any (p.tagged)), '{}'),
    a.display_name,
    a.avatar_url,
    a.level,
    (select count(*)::integer from public.post_likes l where l.post_id = p.id),
    exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = (select auth.uid())),
    (select count(*)::integer from public.post_comments c where c.post_id = p.id)
  from public.posts p
  join public.profiles a on a.id = p.user_id
  order by p.created_at desc
  limit greatest(1, least(p_limit, 200));
$$;

revoke execute on function public.get_feed(integer) from public, anon;
grant execute on function public.get_feed(integer) to authenticated;

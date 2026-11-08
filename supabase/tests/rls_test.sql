\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
 ('aaaaaaaa-0000-0000-0000-000000000000', '{"display_name":"Amine"}'),
 ('bbbbbbbb-0000-0000-0000-000000000000', '{"display_name":"Sanne"}'),
 ('cccccccc-0000-0000-0000-000000000000', '{}');
select 'profiles created', count(*) from public.profiles;
create function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, false); end $$;
set role authenticated;
-- A sends B a friend request, A writes private data and a post
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
insert into public.friendships (requester, addressee) values ('aaaaaaaa-0000-0000-0000-000000000000','bbbbbbbb-0000-0000-0000-000000000000');
insert into public.user_data (user_id, data) values ('aaaaaaaa-0000-0000-0000-000000000000', '{"x":1}');
insert into public.posts (user_id, ref, kind, title) values ('aaaaaaaa-0000-0000-0000-000000000000','w1','workout','Morning run');
with x as (update public.friendships set status='accepted' returning 1) select 'T1 A cannot accept own request (0 rows)', count(*) from x;
select 'T2 B sees A post before accept (expect 0)', count(*) from (select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000')) s, public.posts;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
with x as (update public.friendships set status='accepted' returning 1) select 'T3 B accepts (1 row)', count(*) from x;
update public.friendships set requester='cccccccc-0000-0000-0000-000000000000'; -- T4 expect permission denied
select 'T5 B sees A post (1)', count(*) from public.posts;
insert into public.post_likes (post_id, user_id) select id, 'bbbbbbbb-0000-0000-0000-000000000000' from public.posts;
select 'T6 B liked (1)', count(*) from public.post_likes;
select 'T7 B reads A private data (0)', count(*) from public.user_data;
update public.profiles set invite_code='HACKED'; -- T8 expect permission denied
with x as (update public.profiles set week_points=50 where id='bbbbbbbb-0000-0000-0000-000000000000' returning 1) select 'T9 B updates own points (1)', count(*) from x;
with x as (update public.profiles set week_points=999 where id='aaaaaaaa-0000-0000-0000-000000000000' returning 1) select 'T10 B cannot update A points (0)', count(*) from x;
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');
select 'T11 C sees A post (0)', count(*) from public.posts;
insert into public.post_likes (post_id, user_id) values ((select id from public.posts limit 1), 'cccccccc-0000-0000-0000-000000000000'); -- null post -> error ok
select 'T12 C sees friendships (0)', count(*) from public.friendships;
select 'T13 C finds A by invite code (1)', count(*) from public.profiles where id='aaaaaaaa-0000-0000-0000-000000000000';
insert into public.posts (user_id, ref, kind, title) values ('aaaaaaaa-0000-0000-0000-000000000000','fake','workout','Fake'); -- T14 expect RLS violation
select 'T15 C reads ai_usage (0, no access)', count(*) from public.ai_usage;
-- challenge: A creates, B (friend) sees and joins, C cannot
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
insert into public.challenges (creator,title,metric,target,start_date,end_date) values ('aaaaaaaa-0000-0000-0000-000000000000','50 km','run_km',50,'2026-11-01','2026-11-30');
insert into public.challenge_members (challenge_id,user_id) select id,'aaaaaaaa-0000-0000-0000-000000000000' from public.challenges;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
insert into public.challenge_members (challenge_id,user_id) select id,'bbbbbbbb-0000-0000-0000-000000000000' from public.challenges;
select 'T16 B sees 2 members', count(*) from public.challenge_members;
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');
select 'T17 C sees challenge (0)', count(*) from public.challenges;

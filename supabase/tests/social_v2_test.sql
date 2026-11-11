\set ON_ERROR_STOP 0
-- Run after all migrations. A and B are friends, C is a stranger.
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000000'),('bbbbbbbb-0000-0000-0000-000000000000'),('cccccccc-0000-0000-0000-000000000000');
insert into public.friendships (requester, addressee, status) values ('aaaaaaaa-0000-0000-0000-000000000000','bbbbbbbb-0000-0000-0000-000000000000','accepted');
insert into public.user_data (user_id, data) values ('aaaaaaaa-0000-0000-0000-000000000000','{"kcal":1800}');
create function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, false); end $$;
set role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
insert into public.posts (user_id, ref, kind, title, tagged) values ('aaaaaaaa-0000-0000-0000-000000000000','w:1','workout','Run with B','{bbbbbbbb-0000-0000-0000-000000000000}');
select 'T1 tag friend ok (1)', count(*) from public.posts;
insert into public.posts (user_id, ref, kind, title, tagged) values ('aaaaaaaa-0000-0000-0000-000000000000','w:2','workout','Fake','{cccccccc-0000-0000-0000-000000000000}'); -- T2 expect "You can only tag friends"
insert into public.coach_access (owner, coach) values ('aaaaaaaa-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-000000000000'); -- T3 expect RLS violation (not friends)
insert into public.coach_access (owner, coach) values ('aaaaaaaa-0000-0000-0000-000000000000','bbbbbbbb-0000-0000-0000-000000000000');
select 'T4 A granted B coach access (1)', count(*) from public.coach_access;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
select 'T5 coach B reads A data (1)', count(*) from public.user_data where user_id='aaaaaaaa-0000-0000-0000-000000000000';
insert into public.coach_access (owner, coach) values ('aaaaaaaa-0000-0000-0000-000000000000','bbbbbbbb-0000-0000-0000-000000000000'); -- T6 expect RLS violation (B can't grant for A)
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');
select 'T7 stranger C reads A data (0)', count(*) from public.user_data;
-- storage
reset role;
insert into storage.objects (bucket_id, name) values ('workout-photos','aaaaaaaa-0000-0000-0000-000000000000/run.jpg');
set role authenticated;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
select 'T8 friend B sees A photo (1)', count(*) from storage.objects;
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');
select 'T9 stranger C sees A photo (0)', count(*) from storage.objects;
insert into storage.objects (bucket_id, name) values ('workout-photos','aaaaaaaa-0000-0000-0000-000000000000/fake.jpg'); -- T10 expect RLS violation
insert into storage.objects (bucket_id, name) values ('avatars','cccccccc-0000-0000-0000-000000000000/avatar.jpg');
select 'T11 C uploads own avatar (ok)';
update public.profiles set xp = 500, level = 3 where id = 'cccccccc-0000-0000-0000-000000000000';
select 'T12 own xp updated', xp from public.profiles where id='cccccccc-0000-0000-0000-000000000000';
-- unfriend ends coach access
reset role;
delete from public.friendships;
select 'T13 coach access gone after unfriend (0)', count(*) from public.coach_access;

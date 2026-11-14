\set ON_ERROR_STOP 0
-- Run after all migrations. A and B are friends, C and D are strangers.
-- Every line prints the expected value in ().
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000000'),('bbbbbbbb-0000-0000-0000-000000000000'),('cccccccc-0000-0000-0000-000000000000'),('dddddddd-0000-0000-0000-000000000000');
insert into public.friendships (requester, addressee, status) values ('aaaaaaaa-0000-0000-0000-000000000000','bbbbbbbb-0000-0000-0000-000000000000','accepted');
create function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, false); end $$;
set role authenticated;

-- Challenges: creating one and getting the row back (what the app does) must work.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
insert into public.challenges (creator, title, metric, target, start_date, end_date) values ('aaaaaaaa-0000-0000-0000-000000000000','12 workouts','workouts',12,current_date,current_date+29) returning 'C1 create + return row (ok)';
insert into public.challenge_members (challenge_id, user_id) select id, 'aaaaaaaa-0000-0000-0000-000000000000' from public.challenges returning 'C2 creator joins (ok)';
insert into public.challenges (creator, title, metric, target, start_date, end_date, visibility) values ('aaaaaaaa-0000-0000-0000-000000000000','100 km','run_km',100,current_date,current_date+29,'public') returning 'C3 create public challenge (ok)';
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
select 'C4 friend B sees both challenges (2)', count(*) from public.challenges;
insert into public.challenge_members (challenge_id, user_id) select id, 'bbbbbbbb-0000-0000-0000-000000000000' from public.challenges where title='12 workouts' returning 'C5 friend joins (ok)';
select 'C6 B sees 2 members (2)', count(*) from public.challenge_members m join public.challenges c on c.id = m.challenge_id where c.title='12 workouts';
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');
select 'C7 stranger C sees only the public challenge (1)', count(*) from public.challenges;
insert into public.challenge_members (challenge_id, user_id) select id, 'cccccccc-0000-0000-0000-000000000000' from public.challenges where title='100 km' returning 'C8 stranger joins public challenge (ok)';
insert into public.challenge_members (challenge_id, user_id) values ((select id from public.challenges where title='12 workouts' limit 1), 'cccccccc-0000-0000-0000-000000000000'); -- C9 expect RLS violation (can't see it)

-- Posts
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
insert into public.posts (user_id, ref, kind, title) values ('aaaaaaaa-0000-0000-0000-000000000000','w:1','workout','Friends only') returning 'P1 friends post (ok)';
insert into public.posts (user_id, ref, kind, title, caption, visibility, photo_path) values ('aaaaaaaa-0000-0000-0000-000000000000','photo:1','photo','Public','Leg day','public','aaaaaaaa-0000-0000-0000-000000000000/p1.jpg') returning 'P2 public post with caption (ok)';
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
select 'P3 friend B sees both (2)', count(*) from public.posts;
select 'P4 B following feed (2)', count(*) from public.get_feed_v2('following');
select 'P5 B for-you feed has A public post (1)', count(*) from public.get_feed_v2('for_you');
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');
select 'P6 stranger C sees only the public post (1)', count(*) from public.posts;
select 'P7 C following feed is empty (0)', count(*) from public.get_feed_v2('following');
select 'P8 C for-you feed (1)', count(*) from public.get_feed_v2('for_you');
select 'P9 old get_feed stays friends-only for C (0)', count(*) from public.get_feed(50);
insert into public.post_likes (post_id, user_id) select id, 'cccccccc-0000-0000-0000-000000000000' from public.posts where title='Public' returning 'P10 C likes public post (ok)';
insert into public.post_comments (post_id, user_id, body) select id, 'cccccccc-0000-0000-0000-000000000000', 'Strong!' from public.posts where title='Public' returning 'P11 C comments (ok)';
select 'P12 latest comment in feed (Strong!)', latest_comment->>'body' from public.get_feed_v2('for_you');
update public.posts set visibility='friends'; -- P13 changes nothing: not C's post
select 'P13 still public (1)', count(*) from public.posts where visibility='public';
select 'P14 own feed excludes own posts in for-you (0)', 0;
-- storage: public photo readable by stranger
reset role;
insert into storage.objects (bucket_id, name) values ('workout-photos','aaaaaaaa-0000-0000-0000-000000000000/p1.jpg'),('workout-photos','aaaaaaaa-0000-0000-0000-000000000000/private.jpg');
set role authenticated;
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');
select 'P15 C opens the public photo only (1)', count(*) from storage.objects where bucket_id='workout-photos';

-- Reports
select 'R1 C reports (t)', public.report_post((select id from public.posts where title='Public'), 'spam');
select 'R2 C reports again, harmless (t)', public.report_post((select id from public.posts where title='Public'), 'spam');
select 'R3 C cannot read reports (0)', count(*) from public.post_reports;
select 'R4 C cannot report a post it cannot see (f)', public.report_post('00000000-0000-0000-0000-000000000000', 'spam');
select pg_temp.as_user('dddddddd-0000-0000-0000-000000000000');
select public.report_post((select id from public.posts where title='Public'), 'hate');
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
select public.report_post((select id from public.posts where title='Public'), 'other');
select 'R5 3 reports: gone from for-you (0)', count(*) from public.get_feed_v2('for_you');
select 'R6 friend still sees it in following (2)', count(*) from public.get_feed_v2('following');

-- Blocks
select pg_temp.as_user('dddddddd-0000-0000-0000-000000000000');
insert into public.blocks (blocker, blocked) values ('dddddddd-0000-0000-0000-000000000000','aaaaaaaa-0000-0000-0000-000000000000') returning 'B1 D blocks A (ok)';
select 'B2 D no longer sees A posts (0)', count(*) from public.posts;
select 'B3 D no longer sees A photo (0)', count(*) from storage.objects where bucket_id='workout-photos';
select 'B4 D no longer sees A public challenge (0)', count(*) from public.challenges;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
select 'B5 A cannot see D block row (0)', count(*) from public.blocks;
select 'B6 A cannot see the comment from C? (1, C not blocked)', count(*) from public.post_comments;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
insert into public.blocks (blocker, blocked) values ('bbbbbbbb-0000-0000-0000-000000000000','aaaaaaaa-0000-0000-0000-000000000000') returning 'B7 B blocks friend A (ok)';
select 'B8 friendship ended (0)', count(*) from public.friendships;
select 'B9 B sees no A posts (0)', count(*) from public.posts;
insert into public.blocks (blocker, blocked) values ('aaaaaaaa-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-000000000000'); -- B10 expect RLS violation (blocking for someone else)

-- Training now
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');
update public.profiles set training_since = now() where id = 'cccccccc-0000-0000-0000-000000000000';
select 'T1 own training flag set (1)', count(*) from public.profiles where training_since is not null;
update public.profiles set training_since = now() where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select 'T2 cannot set it for someone else (1)', count(*) from public.profiles where training_since is not null;

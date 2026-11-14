\set ON_ERROR_STOP 0
-- Run after all migrations. A owns a private club, B joins with the code.
-- C is a stranger, D joins the public club. Every line prints the expected value in ().
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000000'),('bbbbbbbb-0000-0000-0000-000000000000'),('cccccccc-0000-0000-0000-000000000000'),('dddddddd-0000-0000-0000-000000000000');
create function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, false); end $$;
set role authenticated;

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
select 'K1 A creates private club (uuid)', public.create_club('Basic-Fit Gent crew', 'Mornings at 7', 'private') is not null;
select 'K2 A creates public club (uuid)', public.create_club('Ghent lifters', '', 'public') is not null;
insert into public.clubs (owner, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'Direct insert'); -- K3 expect permission denied
select 'K4 A sees 2 clubs, member of both (2)', count(*) from public.list_clubs() where is_member;
select 'K5 A reads the code (8 chars)', length(code) from public.club_codes c join public.clubs k on k.id = c.club_id where k.name like 'Basic%';
select set_config('t.code', (select code from public.club_codes c join public.clubs k on k.id = c.club_id where k.name like 'Basic%'), false);
insert into public.posts (user_id, ref, kind, title) values ('aaaaaaaa-0000-0000-0000-000000000000','w:1','workout','A friends-only workout') returning 'K6 A posts for friends (ok)';

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');
select 'K7 stranger C sees only the public club (1)', count(*) from public.clubs;
select 'K8 C cannot read codes (0)', count(*) from public.club_codes;
select 'K9 C search finds public club (Ghent lifters)', name from public.list_clubs('ghent');
select 'K10 C search does not find private club (0)', count(*) from public.list_clubs('basic');
select 'K11 C cannot see A friends-only post (0)', count(*) from public.posts;
select 'K12 C cannot read club feed (0)', count(*) from public.get_club_feed((select id from public.clubs where name = 'Ghent lifters'));
select 'K13 C wrong code (not_found)', public.join_club('ZZZZZZZZ')->>'error';
select 'K14 C cannot join private by id (not_found)', public.join_public_club((select club_id from public.club_members limit 0))->>'error';

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
select 'K15 B joins with the code, lowercase with spaces (true)', public.join_club(' ' || lower(current_setting('t.code')) || ' ')->>'ok';
select 'K16 B joins again, harmless (true)', public.join_club(current_setting('t.code'))->>'already';
select 'K17 B sees A friends-only post as a clubmate (1)', count(*) from public.posts;
select 'K18 B club feed has it (1)', count(*) from public.get_club_feed((select id from public.clubs where name like 'Basic%'));
select 'K19 B sees 2 members (2)', count(*) from public.club_members m join public.clubs k on k.id = m.club_id where k.name like 'Basic%';
insert into public.post_likes (post_id, user_id) select id, 'bbbbbbbb-0000-0000-0000-000000000000' from public.posts returning 'K20 B fist-bumps clubmate post (ok)';
update public.clubs set name = 'Hijacked'; -- K21 changes nothing
select 'K21 club name unchanged (0)', count(*) from public.clubs where name = 'Hijacked';
delete from public.club_members where user_id = 'aaaaaaaa-0000-0000-0000-000000000000'; -- K22 B can't remove the owner
select 'K22 still 2 members (2)', count(*) from public.club_members m join public.clubs k on k.id = m.club_id where k.name like 'Basic%';
insert into public.club_members (club_id, user_id) select id, 'cccccccc-0000-0000-0000-000000000000' from public.clubs limit 1; -- K23 expect permission denied
insert into public.challenges (creator, title, metric, target, start_date, end_date, club_id) values ('bbbbbbbb-0000-0000-0000-000000000000','Club: 12 workouts','workouts',12,current_date,current_date+29,(select id from public.clubs where name like 'Basic%')) returning 'K24 B starts a club challenge (ok)';

select pg_temp.as_user('dddddddd-0000-0000-0000-000000000000');
select 'K25 D joins public club from search (true)', public.join_public_club((select id from public.clubs where name = 'Ghent lifters'))->>'ok';
select 'K26 D sees A post via public club (1)', count(*) from public.posts;
select 'K27 D does not see the private club challenge (0)', count(*) from public.challenges;
insert into public.challenge_members (challenge_id, user_id) select id, 'dddddddd-0000-0000-0000-000000000000' from public.challenges; -- nothing to join
select 'K28 D is in no challenge (0)', count(*) from public.challenge_members;
select 'K29 D cannot reset the code (error)';
select public.reset_club_code((select id from public.clubs where name = 'Ghent lifters'));

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
select 'K30 A sees the club challenge (1)', count(*) from public.challenges where club_id is not null;
update public.clubs set description = 'New text', visibility = 'public' where name like 'Basic%' returning 'K31 owner edits club (ok)';
select 'K32 owner resets code (new)', public.reset_club_code((select id from public.clubs where name like 'Basic%')) <> current_setting('t.code');
delete from public.club_members where user_id = 'bbbbbbbb-0000-0000-0000-000000000000' returning 'K33 owner removes B (ok)';
delete from public.club_members where user_id = 'aaaaaaaa-0000-0000-0000-000000000000'; -- K34 owner cannot leave own club
select 'K34 A still member of both (2)', count(*) from public.club_members where user_id = 'aaaaaaaa-0000-0000-0000-000000000000';

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
select 'K35 removed B no longer sees A post (0)', count(*) from public.posts;
select 'K36 old code no longer works (not_found)', public.join_club(current_setting('t.code'))->>'error';

-- Blocking: D blocks A, A's public club disappears for D's search but D's membership stays readable.
select pg_temp.as_user('dddddddd-0000-0000-0000-000000000000');
insert into public.blocks (blocker, blocked) values ('dddddddd-0000-0000-0000-000000000000','aaaaaaaa-0000-0000-0000-000000000000');
select 'K37 D no longer sees blocked A post (0)', count(*) from public.posts;
select 'K38 D club feed hides A (0)', count(*) from public.get_club_feed((select id from public.clubs where name = 'Ghent lifters'));

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
delete from public.clubs where name = 'Ghent lifters' returning 'K39 owner deletes club (ok)';
select 'K40 its members are gone (0)', count(*) from public.club_members m where not exists (select 1 from public.clubs c where c.id = m.club_id);

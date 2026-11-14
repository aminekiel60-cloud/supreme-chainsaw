\set ON_ERROR_STOP 0
-- Run after all migrations.
insert into auth.users (id, raw_user_meta_data) values
 ('aaaaaaaa-0000-0000-0000-000000000000', '{"display_name":"Amine"}'),
 ('bbbbbbbb-0000-0000-0000-000000000000', '{"display_name":"Sanne"}'),
 ('cccccccc-0000-0000-0000-000000000000', '{}');
select 'T1 every new user gets a code (3)', count(*) from public.invite_codes;
select 'T2 codes are 8 chars from the safe alphabet (3)', count(*) from public.invite_codes where code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$';
select code as a_code from public.invite_codes where user_id = 'aaaaaaaa-0000-0000-0000-000000000000' \gset
create function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, false); end $$;
set role authenticated;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
select 'T3 B sees only own code (1)', count(*) from public.invite_codes;
select 'T4 wrong code', public.accept_invite('ZZZZZZZZ');
select 'T5 own code', public.accept_invite((select code from public.invite_codes));
select 'T6 B redeems A code (lowercase, with dash)', public.accept_invite(lower(substr(:'a_code', 1, 4)) || '-' || substr(:'a_code', 5));
select 'T7 friendship accepted (1)', count(*) from public.friendships where status = 'accepted';
select 'T8 redeem twice is harmless', public.accept_invite(:'a_code');
select 'T9 still one friendship (1)', count(*) from public.friendships;
update public.invite_codes set code = 'HACKED12'; -- T10 expect 0 rows (no update policy)
select 'T10 B code unchanged (0)', count(*) from public.invite_codes where code = 'HACKED12';
select 'T11 B resets own code (8 chars)', length(public.reset_invite_code());
select public.new_invite_code(); -- T12 expect permission denied
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');
select 'T13 brute force: 11 wrong tries → 10 not_found, 1 too_many', count(*) filter (where r ->> 'error' = 'not_found'), count(*) filter (where r ->> 'error' = 'too_many')
  from (select public.accept_invite('WRONG' || g) as r from generate_series(1, 11) g) x;
select 'T14 even the right code is blocked now', public.accept_invite(:'a_code') ->> 'error';
select 'T15 C cannot read attempts (0)', count(*) from public.invite_attempts;
reset role;
select 'T16 profiles has no invite_code column (0)', count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='invite_code';

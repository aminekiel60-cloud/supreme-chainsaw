insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000000'),('bbbbbbbb-0000-0000-0000-000000000000'),('cccccccc-0000-0000-0000-000000000000'),('dddddddd-0000-0000-0000-000000000000');
create function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, false); end $$;
set role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
insert into public.community_foods (barcode,name,kcal,protein,carbs,fat,created_by) values ('5410000000001','Test yoghurt',60,9,4,0.5,'aaaaaaaa-0000-0000-0000-000000000000');
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');
select 'T1 B sees product (1)', count(*) from public.community_foods;
with x as (update public.community_foods set kcal=999 where barcode='5410000000001' returning 1) select 'T2 B edits A product (0)', count(*) from x;
update public.community_foods set reports=0; -- T3 expect permission denied
insert into public.community_foods (barcode,name,kcal,protein,carbs,fat,created_by) values ('5410000000002','Fake',1,1,1,1,'aaaaaaaa-0000-0000-0000-000000000000'); -- T4 expect RLS violation
select 'T5 B reports (1)', public.report_community_food('5410000000001');
select 'T6 B reports again, still 1', public.report_community_food('5410000000001');
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000'); select 'T7 C reports (2)', public.report_community_food('5410000000001');
select pg_temp.as_user('dddddddd-0000-0000-0000-000000000000'); select 'T8 D reports (3)', public.report_community_food('5410000000001');
select 'T9 hidden after 3 reports (0)', count(*) from public.community_foods;
insert into public.community_foods (barcode,name,kcal,protein,carbs,fat,created_by) values ('abc','Bad',1,1,1,1,'dddddddd-0000-0000-0000-000000000000'); -- T10 expect check violation

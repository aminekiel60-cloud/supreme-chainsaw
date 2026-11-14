-- Invite links with instant friend adding.
--
-- An invite code now makes you friends immediately, so it has to be private.
-- Until now it was a column on profiles, readable by every signed-in user.
-- It moves to its own table that only its owner can read, everyone gets a
-- fresh, longer code, and codes are redeemed through accept_invite().

create table public.invite_codes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  code text not null unique
);
alter table public.invite_codes enable row level security;
create policy "read own invite code" on public.invite_codes
  for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update/delete policies: codes change only through the functions below.

-- 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L).
create function public.new_invite_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  c text;
begin
  loop
    -- gen_random_uuid() is cryptographically random; bytes 0-5 and 10-11 are fully random.
    bytes := uuid_send(gen_random_uuid());
    c := '';
    for i in 0..7 loop
      c := c || substr(alphabet, 1 + get_byte(bytes, case when i < 6 then i else i + 4 end) % length(alphabet), 1);
    end loop;
    exit when not exists (select 1 from public.invite_codes where code = c);
  end loop;
  return c;
end;
$$;
revoke execute on function public.new_invite_code() from public, anon, authenticated;

-- Fresh codes for everyone who already has an account.
do $$
declare p record;
begin
  for p in select id from public.profiles loop
    insert into public.invite_codes (user_id, code) values (p.id, public.new_invite_code());
  end loop;
end;
$$;

-- New accounts get a profile and an invite code.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Athlete'));
  insert into public.invite_codes (user_id, code) values (new.id, public.new_invite_code());
  return new;
end;
$$;

alter table public.profiles drop column invite_code;

-- Wrong guesses are counted, so codes can't be brute-forced.
create table public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.invite_attempts enable row level security;
create index invite_attempts_user on public.invite_attempts (user_id, created_at);

-- Redeem an invite code: you and its owner become friends right away.
-- Returns {"ok": true, "name": "..."} or {"ok": false, "error": "not_found" | "own" | "too_many"}.
create function public.accept_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  inviter uuid;
  inviter_name text;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if (select count(*) from public.invite_attempts where user_id = me and created_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;

  select user_id into inviter from public.invite_codes where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if inviter is null then
    insert into public.invite_attempts (user_id) values (me);
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if inviter = me then
    return jsonb_build_object('ok', false, 'error', 'own');
  end if;

  update public.friendships set status = 'accepted'
  where (requester = inviter and addressee = me) or (requester = me and addressee = inviter);
  if not found then
    insert into public.friendships (requester, addressee, status) values (inviter, me, 'accepted');
  end if;

  select display_name into inviter_name from public.profiles where id = inviter;
  return jsonb_build_object('ok', true, 'name', inviter_name);
end;
$$;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- Get a new code (the old one and old invite links stop working).
create function public.reset_invite_code() returns text
language plpgsql security definer set search_path = '' as $$
declare c text := public.new_invite_code();
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  update public.invite_codes set code = c where user_id = (select auth.uid());
  return c;
end;
$$;
revoke execute on function public.reset_invite_code() from public, anon;
grant execute on function public.reset_invite_code() to authenticated;

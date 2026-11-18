-- 관리자 계정 추가: chrisdo7@naver.com (Supabase SQL Editor 에 붙여 넣고 Run 한 번)
-- 001_init.sql 의 sync_profile() 은 관리자 이메일을 하나만 알고 있어서, 목록으로 바꿔 다시 만든다.
-- 이메일 인증을 마친 계정만 admin 이 된다(아직 가입 전이면 가입·인증하는 순간 자동으로 admin).
-- 여러 번 실행해도 안전하다.

create or replace function public.sync_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare make_admin boolean;
begin
  make_admin := new.email_confirmed_at is not null
    and lower(new.email) = any (array['jeaneeyi2004@gmail.com', 'chrisdo7@naver.com']);
  insert into public.profiles (id, role, consent_at)
  values (new.id, case when make_admin then 'admin' else 'user' end,
          nullif(new.raw_user_meta_data ->> 'consent_at', '')::timestamptz)
  on conflict (id) do update
    set role = case when make_admin then 'admin' else public.profiles.role end;
  return new;
end $$;

-- 이미 가입·인증을 마친 계정이면 지금 바로 admin 으로 올린다
insert into public.profiles (id, role)
select u.id, 'admin' from auth.users u
where u.email_confirmed_at is not null and lower(u.email) = 'chrisdo7@naver.com'
on conflict (id) do update set role = 'admin';

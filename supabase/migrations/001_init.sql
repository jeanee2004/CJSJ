-- 청정 세종: 초기 스키마 (Supabase SQL Editor 에 통째로 붙여 넣고 Run 한 번)
-- 원칙: 설문 응답·행동 기록에는 이메일/이름/전화번호/계정 ID 를 넣지 않는다.
--       계정(auth.users.id) ↔ 응답을 잇는 가명 ID(respondent_id)는 profiles 에만 있고,
--       profiles 는 본인 행만 읽을 수 있다(관리자도 전체 조회 불가).
-- 여러 번 실행해도 안전하도록 작성했다.
feec
-- 1) profiles: 계정별 권한과 가명 ID ------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  respondent_id uuid not null unique default gen_random_uuid(),
  role text not null default 'user' check (role in ('user', 'admin')),
  consent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select to authenticated using (id = auth.uid());
-- insert/update/delete 정책을 일부러 만들지 않는다 → 사용자가 자기 role 을 바꿀 수 없다.

-- 관리자 판정 (RLS 정책과 서버가 함께 사용)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- 가입·이메일 인증 때 profiles 를 만들고, 인증을 마친 관리자 이메일이면 admin 부여
create or replace function public.sync_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare make_admin boolean;
begin
  make_admin := new.email_confirmed_at is not null and lower(new.email) = 'jeaneeyi2004@gmail.com';
  insert into public.profiles (id, role, consent_at)
  values (new.id, case when make_admin then 'admin' else 'user' end,
          nullif(new.raw_user_meta_data ->> 'consent_at', '')::timestamptz)
  on conflict (id) do update
    set role = case when make_admin then 'admin' else public.profiles.role end;
  return new;
end $$;
drop trigger if exists on_auth_user_sync on auth.users;
create trigger on_auth_user_sync after insert or update of email_confirmed_at on auth.users
  for each row execute function public.sync_profile();

-- 이미 가입한 계정이 있으면 profiles 를 채워 둔다
insert into public.profiles (id, role)
select u.id, case when u.email_confirmed_at is not null and lower(u.email) = 'jeaneeyi2004@gmail.com' then 'admin' else 'user' end
from auth.users u on conflict (id) do nothing;

-- 2) survey_responses: 설문 응답 (식별정보 없음) --------------------------------
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  respondent_id uuid references public.profiles(respondent_id) on delete set null, -- 비로그인(간편)은 null
  session_id uuid,                                  -- 브라우저에서 만든 무작위 가명 세션
  survey_type text not null check (survey_type in ('simple', 'deep')),
  answers jsonb not null,                           -- 문항 id → 선택지 코드(구간). 정확한 값은 구간으로 바꿔서 저장
  created_at timestamptz not null default now(),
  constraint answers_size check (pg_column_size(answers) < 20000)
);
create index if not exists survey_responses_created_idx on public.survey_responses (created_at);
alter table public.survey_responses enable row level security;

-- 자유 입력(Q21)에 적힌 전화번호·이메일은 저장 직전에 한 번 더 가린다 (프런트 마스킹의 안전망)
create or replace function public.mask_survey_text() returns trigger
language plpgsql as $$
declare t text;
begin
  t := new.answers ->> 'Q21';
  if t is not null then
    t := regexp_replace(t, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[이메일]', 'g');
    t := regexp_replace(t, '(\+?82[-. ]?)?0?1[0-9][-. ]?[0-9]{3,4}[-. ]?[0-9]{4}', '[전화번호]', 'g');
    new.answers := jsonb_set(new.answers, '{Q21}', to_jsonb(left(t, 500)));
  end if;
  return new;
end $$;
drop trigger if exists survey_mask on public.survey_responses;
create trigger survey_mask before insert on public.survey_responses
  for each row execute function public.mask_survey_text();

drop policy if exists "responses: insert" on public.survey_responses;
create policy "responses: insert" on public.survey_responses for insert to anon, authenticated
  with check (respondent_id is null or respondent_id = (select p.respondent_id from public.profiles p where p.id = auth.uid()));
drop policy if exists "responses: read own" on public.survey_responses;
create policy "responses: read own" on public.survey_responses for select to authenticated
  using (respondent_id = (select p.respondent_id from public.profiles p where p.id = auth.uid()));
drop policy if exists "responses: admin read" on public.survey_responses;
create policy "responses: admin read" on public.survey_responses for select to authenticated using (public.is_admin());
drop policy if exists "responses: delete own" on public.survey_responses;
create policy "responses: delete own" on public.survey_responses for delete to authenticated
  using (respondent_id = (select p.respondent_id from public.profiles p where p.id = auth.uid()));

-- 3) events: 사용 행동 (가명 세션 ID 만, IP·이메일 저장 안 함) ----------------------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  event_type text not null check (event_type in
    ('page_view', 'section_view', 'click', 'survey_start', 'survey_answer', 'survey_complete', 'survey_abandon')),
  name text check (char_length(name) <= 80),        -- 섹션 id, 버튼 data-track 이름, 문항 id 등
  path text check (char_length(path) <= 200),
  survey_type text check (survey_type in ('simple', 'deep')),
  duration_ms integer check (duration_ms between 0 and 86400000),
  props jsonb check (pg_column_size(props) < 2000),
  device text check (device in ('mobile', 'desktop')),
  created_at timestamptz not null default now()
);
create index if not exists events_created_idx on public.events (created_at);
create index if not exists events_type_idx on public.events (event_type, name);
alter table public.events enable row level security;
drop policy if exists "events: insert" on public.events;
create policy "events: insert" on public.events for insert to anon, authenticated with check (true);
drop policy if exists "events: admin read" on public.events;
create policy "events: admin read" on public.events for select to authenticated using (public.is_admin());

-- 4) export_logs: CSV 내려받기 기록 (서버가 service key 로만 기록) -------------------
create table if not exists public.export_logs (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  survey_type text,
  range_from timestamptz,
  range_to timestamptz,
  row_count integer not null,
  created_at timestamptz not null default now()
);
alter table public.export_logs enable row level security;
drop policy if exists "export_logs: admin read" on public.export_logs;
create policy "export_logs: admin read" on public.export_logs for select to authenticated using (public.is_admin());

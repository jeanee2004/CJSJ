-- 청정 세종: 의견 남기기 저장소 (001_init.sql 실행 후 SQL Editor 에서 Run 한 번)
-- 이름·이메일·계정 ID 는 저장하지 않는다. 가명 세션 ID 와 고른 보기, 선택 입력 한마디만 저장한다.
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  session_id uuid,
  choices text[] not null check (cardinality(choices) between 1 and 6),
  comment text check (char_length(comment) <= 300),
  device text check (device in ('mobile', 'desktop')),
  created_at timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at);
alter table public.feedback enable row level security;

-- 한마디에 적힌 이메일·전화번호는 저장 직전에 가린다
create or replace function public.mask_feedback_text() returns trigger
language plpgsql as $$
begin
  if new.comment is not null then
    new.comment := regexp_replace(new.comment, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[이메일]', 'g');
    new.comment := regexp_replace(new.comment, '(\+?82[-. ]?)?0?1[0-9][-. ]?[0-9]{3,4}[-. ]?[0-9]{4}', '[전화번호]', 'g');
    new.comment := nullif(btrim(left(new.comment, 300)), '');
  end if;
  return new;
end $$;
drop trigger if exists feedback_mask on public.feedback;
create trigger feedback_mask before insert on public.feedback for each row execute function public.mask_feedback_text();

drop policy if exists "feedback: insert" on public.feedback;
create policy "feedback: insert" on public.feedback for insert to anon, authenticated with check (true);
drop policy if exists "feedback: admin read" on public.feedback;
create policy "feedback: admin read" on public.feedback for select to authenticated using (public.is_admin());

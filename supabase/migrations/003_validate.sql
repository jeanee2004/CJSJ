-- 청정 세종: 익명 INSERT 값 검증 (001·002 실행 후 SQL Editor 에서 Run 한 번, 여러 번 실행해도 안전)
-- 대상: events / survey_responses / feedback. 규칙에 맞지 않으면 그 행만 거부(예외)한다.
-- 이미 쌓인 행은 건드리지 않는다(트리거는 앞으로의 INSERT 에만 적용).

-- 1) events: name·path 형식, props 키·크기 -------------------------------------
create or replace function public.validate_event() returns trigger
language plpgsql as $$
declare k text;
begin
  -- name: 한글·영문·숫자와 : _ - . , 공백 만 (섹션·버튼 이름, 문항 id, feedback:agent,move 등)
  if new.name is not null and new.name !~ '^[0-9A-Za-z가-힣:_.,\- ]{1,80}$' then
    raise exception 'invalid event name' using errcode = '22023';
  end if;
  -- path: / 로 시작하는 주소 경로(영문·숫자와 / _ - . # 만)
  if new.path is not null and new.path !~ '^/[0-9A-Za-z/_.#\-]{0,199}$' then
    raise exception 'invalid event path' using errcode = '22023';
  end if;
  -- props: 객체이고, 허용 키(ref, utm)만, 값은 문자열 60자 이하
  if new.props is not null then
    if jsonb_typeof(new.props) <> 'object' then
      raise exception 'invalid event props' using errcode = '22023';
    end if;
    for k in select jsonb_object_keys(new.props) loop
      if k not in ('ref', 'utm')
         or jsonb_typeof(new.props -> k) <> 'string'
         or char_length(new.props ->> k) > 60 then
        raise exception 'invalid event props' using errcode = '22023';
      end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists events_validate on public.events;
create trigger events_validate before insert on public.events
  for each row execute function public.validate_event();

-- 2) survey_responses: answers 키는 문항 id(Q1·N1·D1 형식)만, 값 길이 제한 -----------
-- 값은 문자열·숫자·true/false·문자열 배열·객체(행 질문의 중첩 답)를 허용하되 각 문자열은 500자 이하
create or replace function public.validate_survey() returns trigger
language plpgsql as $$
declare k text; v jsonb;
begin
  if jsonb_typeof(new.answers) <> 'object' then
    raise exception 'invalid answers' using errcode = '22023';
  end if;
  for k, v in select key, value from jsonb_each(new.answers) loop
    if k !~ '^(Q|N|D)[0-9]{1,3}$' then
      raise exception 'invalid answer key' using errcode = '22023';
    end if;
    if char_length(v::text) > 1200 then
      raise exception 'answer too long' using errcode = '22023';
    end if;
  end loop;
  return new;
end $$;
-- 트리거 이름 순서: survey_mask(자유 입력 가리기)가 먼저 돌고 survey_validate 가 나중에 돈다
drop trigger if exists survey_validate on public.survey_responses;
create trigger survey_validate before insert on public.survey_responses
  for each row execute function public.validate_survey();

-- 3) feedback: choices 는 허용 보기 id 만, 중복 없이 -----------------------------
create or replace function public.validate_feedback() returns trigger
language plpgsql as $$
begin
  if not (new.choices <@ array['agent', 'move', 'guarantee', 'deposit', 'rent', 'gap']::text[]) then
    raise exception 'invalid feedback choice' using errcode = '22023';
  end if;
  if cardinality(new.choices) <> (select count(distinct c) from unnest(new.choices) as c) then
    raise exception 'duplicate feedback choice' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists feedback_validate on public.feedback;
create trigger feedback_validate before insert on public.feedback
  for each row execute function public.validate_feedback();

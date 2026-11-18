-- 심화 설문 응답이 저장되지 않던 문제 수정 (Supabase SQL Editor 에 붙여 넣고 Run 한 번, 여러 번 실행해도 안전)
-- 원인: 003_validate.sql 의 validate_survey() 가 응답 키를 Q1·N2·D7 형식(^(Q|N|D)[0-9]{1,3}$)만 허용했다.
--       심화 설문에는 Q8-1·Q8-2·Q15-1·Q15-2·Q18-1·Q18-2 처럼 하이픈이 붙은 문항이 있어서
--       심화 응답은 전부 거부(22023)됐고, 브라우저는 형식 오류 응답을 다시 보내지 않도록 버렸다.
-- 수정: 하이픈 뒤 번호(-1, -2 …)가 붙은 문항 id 도 허용한다. 나머지 규칙(값 길이 제한 등)은 그대로다.
-- 이 파일의 정규식은 scripts/surveyKeys.test.ts 가 실제 문항 id 와 대조한다.

create or replace function public.validate_survey() returns trigger
language plpgsql as $$
declare k text; v jsonb;
begin
  if jsonb_typeof(new.answers) <> 'object' then
    raise exception 'invalid answers' using errcode = '22023';
  end if;
  for k, v in select key, value from jsonb_each(new.answers) loop
    if k !~ '^(Q|N|D)[0-9]{1,3}(-[0-9]{1,2})?$' then
      raise exception 'invalid answer key' using errcode = '22023';
    end if;
    if char_length(v::text) > 1200 then
      raise exception 'answer too long' using errcode = '22023';
    end if;
  end loop;
  return new;
end $$;
-- 트리거(survey_validate)는 003 에서 만든 것을 그대로 쓴다. 함수만 바꾸면 바로 적용된다.

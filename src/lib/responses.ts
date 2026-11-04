import type { Survey, SurveyType } from '../data/survey'
import { sanitizeSurvey } from './privacy'
import { sessionId } from './session'
import { supabase } from './supabase'

/** 설문 응답 저장. 이메일·이름 없이 가명 ID(로그인 시)와 구간 값만 보낸다. 실패해도 결과 보기는 막지 않는다 */
export async function saveResponse(sv: Survey, type: SurveyType, respondentId: string | null): Promise<void> {
  if (!supabase) return
  try {
    await supabase.from('survey_responses').insert({
      respondent_id: respondentId, session_id: sessionId(), survey_type: type, answers: sanitizeSurvey(sv),
    })
  } catch { /* noop */ }
}

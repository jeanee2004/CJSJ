import { useState } from 'react'
import { Btn } from '../ui'
import { useStore } from '../store'
import type { Verdict, Warning } from '../lib/eligibility'
import { buildReport, sendReport } from '../lib/report'

// 결과 화면의 "리포트 메일로 받기". 가입·마이페이지에서 이메일을 (선택으로) 적은 회원에게만 보낸다.
export function ReportMail({ verdicts, warns, surveyType, unknown }: { verdicts: Verdict[]; warns: Warning[]; surveyType: 'simple' | 'deep'; unknown: string[] }) {
  const { user, openModal } = useStore()
  const [st, setSt] = useState<{ k: 'idle' | 'busy' | 'sent' | 'fail'; t?: string }>({ k: 'idle' })
  if (!user) return null

  if (!user.reportEmail)
    return (
      <div className="strip ask" data-testid="report-mail">
        <span className="ico" aria-hidden="true">@</span>
        <span>
          <b>결과 리포트를 이메일로 받을 수 있어요</b>
          마이페이지 &lsquo;내 정보&rsquo;에서 리포트 받을 이메일(선택)을 적으면 이 결과를 메일로 보내 드려요.
          <span className="strip-act"><Btn size="sm" variant="light" onClick={() => openModal('mypage')}>이메일 적으러 가기</Btn></span>
        </span>
      </div>
    )

  const send = async () => {
    setSt({ k: 'busy' })
    const r = await sendReport(buildReport({ verdicts, warnings: warns, surveyType, name: user.profile.nickname, unknown }))
    setSt(r.ok ? { k: 'sent', t: `${r.to}(으)로 결과 리포트를 보냈어요. 메일이 안 보이면 스팸함도 확인해 주세요.` } : { k: 'fail', t: r.message })
  }
  return (
    <div className="strip" data-testid="report-mail">
      <span className="ico" aria-hidden="true">@</span>
      <span>
        <b>{st.k === 'sent' ? '리포트를 보냈어요' : '이 결과를 이메일 리포트로 받아 보세요'}</b>
        {st.k === 'sent' || st.k === 'fail' ? <span role="status">{st.t}</span> : <>가입할 때 적은 <b>{user.reportEmail}</b>(으)로 제도별 판정·이유·다음에 할 일을 정리해 보내 드려요.</>}
        {st.k !== 'sent' && (
          <span className="strip-act"><Btn size="sm" variant="light" onClick={() => void send()} disabled={st.k === 'busy'} track="report:email">{st.k === 'busy' ? '보내는 중…' : st.k === 'fail' ? '다시 보내기' : '리포트 메일로 받기'}</Btn></span>
        )}
      </span>
    </div>
  )
}

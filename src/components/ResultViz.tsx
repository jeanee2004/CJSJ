import { accuracy, boardRows, costBars, gauge, progress, tally, STATUS_TEXT } from '../lib/resultViz'
import type { BoardRow } from '../lib/resultViz'
import type { CostCompare, Status } from '../lib/eligibility'
import type { Phase } from '../lib/live'
import './ResultViz.css'

export interface VizSummary { known: number; total: number; ratio?: number; housingCost?: number }
interface Props {
  verdicts: { id: string; status: Status }[]
  names: Record<string, string>
  phases: Record<string, Phase | undefined>
  onJump: (id: string) => void
  cost?: CostCompare | null
  costClosed?: boolean
  summary?: VizSummary | null
  simple?: { answered: number; total: number } | null
}

const won = (n: number) => `${n.toLocaleString()}만원`

function Row({ r, onJump }: { r: BoardRow; onJump: (id: string) => void }) {
  const L = STATUS_TEXT[r.status]
  return (
    <li>
      <a className={`rv-row s-${r.status}`} href={`#vd-${r.id}`} onClick={(e) => { e.preventDefault(); onJump(r.id) }}>
        <span className="rv-ico" aria-hidden="true">{L.g}</span>
        <span className="rv-name">{r.name}</span>
        {r.badge && <span className={`rv-badge p-${r.phase}`}>{r.badge}</span>}
        <span className="rv-st">{L.t}</span>
        <span className="rv-go" aria-hidden="true">↓</span>
      </a>
    </li>
  )
}

export function ResultViz({ verdicts, names, phases, onJump, cost, costClosed, summary, simple }: Props) {
  const t = tally(verdicts)
  const rows = boardRows(verdicts, names, phases)
  const bars = cost ? costBars(cost) : null
  const acc = simple ? accuracy(simple.answered, simple.total) : null
  const g = summary?.ratio !== undefined ? gauge(summary.ratio) : null
  return (
    <div className="rviz">
      {acc && (
        <section className="rv-card rv-acc" aria-label={`결과 정확도 ${acc.pct}%`}>
          <div className="rv-h"><b>대략적인 결과예요</b><span>심화 설문으로 더 정확하게</span></div>
          <div className="rv-track" role="img" aria-label={`전체 ${acc.total}문항 중 ${acc.answered}문항에 답했어요 (${acc.pct}%)`}>
            <i style={{ width: `${acc.pct}%` }} />
          </div>
          <p className="rv-sub">내 상황에 맞는 심화 문항 {acc.total}개 중 <b className="num">{acc.answered}</b>개 응답 · 정확도 약 {acc.pct}%</p>
        </section>
      )}

      <section className="rv-card" aria-labelledby="rv-t1">
        <h2 id="rv-t1" className="rv-h2">한눈에 보기</h2>
        <div className="rv-stack" role="img" aria-label={`제도 ${t.total}개 중 ${t.segs.map((s) => `${STATUS_TEXT[s.status].t} ${s.count}개`).join(', ')}`}>
          {t.segs.filter((s) => s.count > 0).map((s) => <i key={s.status} className={`seg s-${s.status}`} style={{ flexGrow: s.count }} />)}
        </div>
        <ul className="rv-legend">
          {t.segs.map((s) => (
            <li key={s.status} className={`s-${s.status}`}>
              <b className="num">{s.count}</b>
              <span><span className="rv-ico" aria-hidden="true">{STATUS_TEXT[s.status].g}</span> {STATUS_TEXT[s.status].t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rv-card" aria-labelledby="rv-t2">
        <h2 id="rv-t2" className="rv-h2">제도별 상태 <small>눌러서 자세히 보기</small></h2>
        <ul className="rv-board">{rows.map((r) => <Row key={r.id} r={r} onJump={onJump} />)}</ul>
      </section>

      {bars && cost && (
        <section className="rv-card" aria-labelledby="rv-t3">
          <h2 id="rv-t3" className="rv-h2">{cost.years}년 동안 낼 이자 <small>예시 계산 · 적을수록 좋아요</small></h2>
          <div className="rv-bars">
            {bars.map((b) => (
              <div key={b.key} className={`rv-bar ${b.best ? 'best' : ''} ${b.key === 'interest' && costClosed ? 'closed' : ''}`}>
                <div className="rv-bl"><span>{b.label}{b.key === 'interest' && costClosed ? ' · 접수 마감' : ''}</span><b className="num">{won(b.value)}</b></div>
                <div className="rv-track" role="img" aria-label={`${b.label} ${won(b.value)}${b.best ? ', 부담이 더 적어요' : ''}`}><i style={{ width: `${Math.max(b.pct, b.value > 0 ? 2 : 0)}%` }} /></div>
                {b.best && <span className="rv-tag">✓ 부담이 더 적어요</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {summary && (g || summary.total > 0) && (
        <section className="rv-card" aria-labelledby="rv-t4">
          <h2 id="rv-t4" className="rv-h2">내 응답 요약</h2>
          {g && summary.ratio !== undefined && (
            <div className="rv-gauge">
              <div className="rv-bl"><span>소득 대비 주거비{summary.housingCost !== undefined ? ` (월 ${won(summary.housingCost)})` : ''}</span><b className="num">{g.shown}%</b></div>
              <div className={`rv-track g-${g.load}`} role="img" aria-label={`월 소득의 약 ${g.shown}%를 주거비로 써요. ${g.label}`}>
                <i style={{ width: `${Math.max(g.pct, 2)}%` }} />
                <em className="mark" style={{ left: '50%' }} aria-hidden="true" />
              </div>
              <div className="rv-scale" aria-hidden="true"><span>0%</span><span style={{ left: '50%' }}>30%</span><span>60%+</span></div>
              <p className="rv-sub">{g.label} · 보통 소득의 30%를 넘으면 부담이 크다고 봐요.</p>
            </div>
          )}
          {summary.total > 0 && (
            <div className="rv-aw">
              <div className="rv-bl"><span>알고 있거나 써 본 주거정책</span><b className="num">{summary.known} / {summary.total}</b></div>
              <div className="rv-track" role="img" aria-label={`전체 ${summary.total}개 중 ${summary.known}개를 알고 있어요`}><i style={{ width: `${progress(summary.known, summary.total)}%` }} /></div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

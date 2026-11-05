import { useEffect, useMemo, useState } from 'react'
import { Btn } from '../ui'
import { listDocs } from '../lib/docs'
import { policyById } from '../data/policies'
import type { PolicyInfo } from '../data/policies'
import type { Status } from '../lib/eligibility'

// 마이페이지 '신청 준비': 신청할 수 있거나 확인해 볼 제도마다 ① 서류를 챙기고 ② 신청 페이지로 가는 순서를 한 화면에 모았다.
// 체크 표시는 이 기기에만 저장한다(서류 파일 자체는 서류함, 판정은 설문 결과).
const key = (uid: string) => `cjsj.prep.${uid}`
const load = (uid: string): Record<string, string[]> => { try { return JSON.parse(localStorage.getItem(key(uid)) ?? '{}') } catch { return {} } }

interface Props {
  uid: string
  verdict: { id: string; status: Status }[]
  interests: string[]
  hasSaved: boolean
  onDocs: () => void
  onSurvey: () => void
}

export function PrepBoard({ uid, verdict, interests, hasSaved, onDocs, onSurvey }: Props) {
  const [checked, setChecked] = useState<Record<string, string[]>>(() => load(uid))
  const [docCount, setDocCount] = useState<Record<string, number>>({})
  useEffect(() => {
    let off = false
    void listDocs(uid).then((ds) => { if (off) return; const m: Record<string, number> = {}; ds.forEach((d) => { m[d.folder] = (m[d.folder] ?? 0) + 1 }); setDocCount(m) }).catch(() => {})
    return () => { off = true }
  }, [uid])

  const items = useMemo(() => {
    const rank: Record<Status, number> = { ok: 0, maybe: 1, no: 2 }
    const out: { p: PolicyInfo; st: Status | 'interest' }[] = []
    for (const v of verdict) { const p = policyById(v.id); if (p && v.status !== 'no') out.push({ p, st: v.status }) }
    for (const id of interests) { const p = policyById(id); if (p && !out.some((o) => o.p.id === id)) out.push({ p, st: 'interest' }) }
    return out.sort((a, b) => (a.st === 'interest' ? 3 : rank[a.st]) - (b.st === 'interest' ? 3 : rank[b.st]))
  }, [verdict, interests])

  const toggle = (pid: string, item: string) => setChecked((c) => {
    const cur = c[pid] ?? []
    const next = { ...c, [pid]: cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item] }
    try { localStorage.setItem(key(uid), JSON.stringify(next)) } catch { /* noop */ }
    return next
  })

  const prog = (p: PolicyInfo) => { const t = p.checklist?.length ?? 0; const d = (checked[p.id] ?? []).filter((x) => p.checklist?.includes(x)).length; return { t, d, pct: t ? Math.round((d / t) * 100) : 0 } }
  const all = items.reduce((a, o) => { const g = prog(o.p); return { t: a.t + g.t, d: a.d + g.d } }, { t: 0, d: 0 })
  const overall = all.t ? Math.round((all.d / all.t) * 100) : 0
  const next = items.find((o) => prog(o.p).pct < 100 && (o.p.checklist?.length ?? 0) > 0)

  if (!hasSaved && items.length === 0) {
    return (
      <div className="mp-body">
        <p className="mp-big">설문을 하면 신청 준비를 도와드려요</p>
        <p className="mp-sub">맛보기 설문으로 신청할 수 있는 지원을 찾으면, 제도마다 필요한 서류와 신청 순서를 이곳에 모아 보여 드려요.</p>
        <div className="mp-row"><Btn onClick={onSurvey}>맛보기 설문 시작</Btn></div>
      </div>
    )
  }

  return (
    <div className="mp-body prep">
      <div className="prep-top">
        <div className="prep-ring" style={{ ['--p' as string]: `${overall}%` }} role="img" aria-label={`서류 준비 ${overall}%`}><b>{overall}<small>%</small></b></div>
        <div>
          <p className="mp-big">서류 준비 {all.d}/{all.t}개 확인</p>
          <p className="mp-sub">{next ? <>다음은 <b>{next.p.name}</b> 서류예요.</> : all.t ? '체크할 서류를 모두 챙겼어요. 신청 페이지에서 접수해 보세요.' : '심화 설문을 하면 제도별 준비 서류가 나타나요.'}</p>
        </div>
      </div>
      <ol className="prep-flow" aria-label="신청 순서">
        <li><i>1</i><span><b>서류 챙기기</b><small>아래 목록에 체크</small></span></li>
        <li><i>2</i><span><b>서류함에 올리기</b><small>이 기기에만 저장</small></span></li>
        <li><i>3</i><span><b>기관에서 신청</b><small>링크로 이동</small></span></li>
      </ol>
      {items.length === 0 && <p className="mp-sub">지금 결과에서 신청할 수 있거나 확인해 볼 지원이 없어요. 설정에서 관심 지원을 고르면 이곳에 보여 드려요.</p>}
      <ul className="prep-list">
        {items.map(({ p, st }) => {
          const g = prog(p)
          const up = docCount[p.id] ?? 0
          return (
            <li key={p.id} className={`prep-card ${st}`}>
              <div className="prep-head">
                <span className={`prep-badge ${st}`}>{st === 'ok' ? '신청할 수 있어요' : st === 'maybe' ? '확인해 보면 좋아요' : '관심 지원'}</span>
                <b>{p.name}</b>
                <small>{p.easy}</small>
              </div>
              {g.t > 0 ? (
                <>
                  <div className="prep-bar" role="progressbar" aria-valuenow={g.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} 서류 준비`}><i style={{ width: `${g.pct}%` }} /></div>
                  <ul className="prep-check">
                    {p.checklist!.map((c) => (
                      <li key={c}><label><input type="checkbox" checked={(checked[p.id] ?? []).includes(c)} onChange={() => toggle(p.id, c)} /><span>{c}</span></label></li>
                    ))}
                  </ul>
                </>
              ) : <p className="mp-sub">심화 설문을 하면 이 제도에 필요한 서류 목록이 나와요.</p>}
              <div className="prep-act">
                <button type="button" className="prep-link" onClick={onDocs}>서류함 열기{up > 0 ? ` · ${up}개 올림` : ''}</button>
                <a className="prep-go" href={p.apply.url} target="_blank" rel="noreferrer noopener" data-track={`apply:${p.id}`}>{p.apply.general ? '안내 보기' : '신청하러 가기'} ↗</a>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mp-sub">체크 표시는 이 기기에만 저장돼요. 실제 신청과 서류 제출은 각 기관 사이트에서 해요.</p>
    </div>
  )
}

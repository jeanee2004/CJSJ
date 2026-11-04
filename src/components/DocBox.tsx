import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Btn } from '../ui'
import { ACCEPT, addDoc, checkFile, clearDocs, getDocBlob, listDocs, removeDoc, sizeLabel } from '../lib/docs'
import type { DocMeta } from '../lib/docs'
import { ALL_POLICIES } from '../data/policies'
import type { Status } from '../lib/eligibility'

// 마이페이지 서류함: 제도별 폴더에 내 서류를 모아 두는 곳. 파일은 이 기기에만 저장된다 (lib/docs.ts)
const COMMON = 'common'
const COMMON_HINT = ['주민등록등본', '임대차계약서', '소득금액증명', '통장 사본', '건강보험 자격득실확인서']

interface Props { uid: string; verdict: Record<string, Status>; interests: string[] }

export function DocBox({ uid, verdict, interests }: Props) {
  const [docs, setDocs] = useState<DocMeta[] | null>(null)
  const [broken, setBroken] = useState(false)
  const [msg, setMsg] = useState<string[]>([])
  const [all, setAll] = useState(false)
  const [busy, setBusy] = useState('')
  const pick = useRef<HTMLInputElement>(null)
  const target = useRef('')

  const refresh = useCallback(async () => {
    try { setDocs(await listDocs(uid)) } catch { setBroken(true); setDocs([]) }
  }, [uid])
  useEffect(() => { void refresh() }, [refresh])

  const folders = useMemo(() => {
    const has = new Set((docs ?? []).map((d) => d.folder))
    const mine = ALL_POLICIES.filter((p) => has.has(p.id) || interests.includes(p.id) || verdict[p.id] === 'ok' || verdict[p.id] === 'maybe')
    const list = all || mine.length === 0 ? ALL_POLICIES : mine
    return [{ id: COMMON, name: '공통 서류', hint: COMMON_HINT }, ...list.map((p) => ({ id: p.id as string, name: p.name, hint: p.checklist ?? [] }))]
  }, [docs, interests, verdict, all])
  const hiddenCount = ALL_POLICIES.length + 1 - folders.length

  const upload = async (files: FileList | null) => {
    const folder = target.current
    if (!files?.length || !folder) return
    const errs: string[] = []
    let n = (docs ?? []).filter((d) => d.folder === folder).length
    setBusy(folder)
    for (const f of Array.from(files)) {
      const bad = checkFile(f, n)
      if (bad) { errs.push(bad); continue }
      try { await addDoc(uid, folder, f); n++ } catch { errs.push(`${f.name}: 저장하지 못했어요. 저장 공간이 부족할 수 있어요`); break }
    }
    setBusy(''); setMsg(errs); if (pick.current) pick.current.value = ''
    await refresh()
  }
  const view = async (id: string) => {
    const b = await getDocBlob(uid, id)
    if (!b) return setMsg(['파일을 찾지 못했어요'])
    const url = URL.createObjectURL(b)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
  const del = async (d: DocMeta) => {
    if (!window.confirm(`"${d.name}"을 지울까요? 되돌릴 수 없어요.`)) return
    try { await removeDoc(uid, d.id) } catch { setMsg(['지우지 못했어요']) }
    await refresh()
  }
  const wipe = async () => {
    if (!window.confirm('서류함의 모든 파일을 지울까요? 되돌릴 수 없어요.')) return
    try { await clearDocs(uid) } catch { setMsg(['지우지 못했어요']) }
    await refresh()
  }

  if (broken) return <div className="mp-body"><p className="mp-big">이 브라우저에서는 서류함을 쓸 수 없어요</p><p className="mp-sub">시크릿 모드이거나 저장 공간 사용이 막혀 있을 수 있어요. 일반 창에서 다시 열어 보세요.</p></div>

  return (
    <div className="mp-body">
      <p className="mp-sub"><b>파일은 이 기기 브라우저에만 저장돼요.</b> 서버로 보내지 않고, 우리도 볼 수 없어요. 대신 기기를 바꾸거나 브라우저 데이터를 지우면 사라지니, 중요한 원본은 따로 보관하세요.</p>
      <input ref={pick} type="file" multiple accept={ACCEPT} hidden onChange={(e) => void upload(e.target.files)} />
      <div className="mp-folders">
        {folders.map((f) => {
          const mine = (docs ?? []).filter((d) => d.folder === f.id)
          return (
            <details key={f.id} className="mp-folder" open={f.id === COMMON && mine.length > 0 ? true : undefined}>
              <summary><span aria-hidden="true">📁</span><b>{f.name}</b><small>{mine.length > 0 ? `${mine.length}개` : '비어 있어요'}</small></summary>
              <div className="mp-folder-in">
                {f.hint.length > 0 && <p className="mp-sub">필요한 서류: {f.hint.join(' · ')}</p>}
                {mine.length > 0 && (
                  <ul className="mp-files">
                    {mine.map((d) => (
                      <li key={d.id}>
                        <button type="button" className="link-btn" onClick={() => void view(d.id)}>{d.name}</button>
                        <small>{sizeLabel(d.size)} · {new Date(d.at).toLocaleDateString('ko-KR')}</small>
                        <button type="button" className="link-btn" onClick={() => void del(d)}>지우기</button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mp-row">
                  <Btn size="sm" variant="line" onClick={() => { target.current = f.id; pick.current?.click() }}>{busy === f.id ? '올리는 중…' : '서류 올리기'}</Btn>
                </div>
              </div>
            </details>
          )
        })}
      </div>
      {msg.length > 0 && <ul className="mp-errs" role="status">{msg.map((m) => <li key={m}>{m}</li>)}</ul>}
      <div className="mp-row">
        {(hiddenCount > 0 || all) && <button type="button" className="term" onClick={() => setAll((x) => !x)}>{all ? '내게 맞는 제도 폴더만 보기' : `다른 제도 폴더 ${hiddenCount}개 더 보기`}</button>}
        {(docs?.length ?? 0) > 0 && <button type="button" className="term" onClick={() => void wipe()}>서류함 비우기</button>}
      </div>
      <p className="mp-sub">신청 전에는 제도마다 원본 서류가 필요해요. 여기는 어떤 서류를 준비했는지 모아 보는 용도예요. 신청은 각 기관 사이트에서 해요.</p>
    </div>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { Btn, Lines, Reveal, SourceBlock, Term, VBadge, reduced } from '../ui'
import { POLICIES } from '../data/policies'
import type { PolicyInfo } from '../data/policies'
import { TERMS } from '../data/terms'
import { DataSection } from '../components/Charts'
import { Feedback } from '../components/Feedback'
import { useStore } from '../store'

/* ───────── 히어로: 마우스에 반응하는 아치·구슬·로고 (커서와 반대로 깊이별 이동) ───────── */
function Hero() {
  const { hasSaved } = useStore()
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2
    }
    const tick = () => {
      x += (tx - x) * 0.07; y += (ty - y) * 0.07
      el.style.setProperty('--px', x.toFixed(3))
      el.style.setProperty('--py', y.toFixed(3))
      raf = requestAnimationFrame(tick)
    }
    el.addEventListener('mousemove', move)
    raf = requestAnimationFrame(tick)
    return () => { el.removeEventListener('mousemove', move); cancelAnimationFrame(raf) }
  }, [])
  return (
    <section className="hero" ref={ref} aria-labelledby="hero-title">
      <div className="scene" aria-hidden="true">
        <div className="arch a1" /><div className="arch a2" /><div className="arch a3" />
        <div className="stairs" /><div className="orb" />
      </div>
      <img className="hero-logo" src="/logo-lg.png" alt="청정 세종 CJSJ 로고" data-cursor="Hello" />
      <div className="grain" aria-hidden="true" />
      <div className="wrap hero-inner">
        <span className="label" style={{ color: 'var(--ink)' }}>청정 세종 · 세종 주거지원 쉬운 확인 · UPDATED OCT 1, 2026</span>
        <Lines
          as="h1" id="hero-title" className="display" delay={(() => { try { return sessionStorage.getItem('cjsj.seen') ? 0.15 : 2.0 } catch { return 0.15 } })()}
          lines={[<span className="l" key="a">내 집으로 가는 길,</span>, <span key="b">먼저 <span className="it">check</span> 하세요</span>]}
        />
        <p className="lead">경제 용어를 몰라도 괜찮아요. 질문에 답하면 <b>받을 수 있는 지원</b>과 <b>하면 안 되는 일</b>을 순서대로 알려드려요.</p>
        <div className="hero-cta">
          <Btn to="/diagnose">내 상황으로 확인하기</Btn>
          {hasSaved && <Btn to="/result" variant="light">지난 결과 보기</Btn>}
        </div>
      </div>
      <div className="hero-facts">
        <span className="label" style={{ color: 'var(--ink)' }}>3분이면 끝 · 로그인 없이 · 서버 전송 없음</span>
        <span className="label" style={{ color: 'var(--ink)' }}>SCROLL ↓</span>
      </div>
    </section>
  )
}

function Marquee() {
  const items = ['놓치기 쉬운 돈', '잔금 전에 신청', '월세도 지원돼요', '전세 ↔ 월세 다 확인', '택1 이득 비교']
  const row = (
    <span aria-hidden="true">
      {items.map((t) => (<span key={t}>{t}<i>✺</i></span>))}
    </span>
  )
  return (
    <div className="marquee" aria-label="핵심 메시지: 놓치기 쉬운 돈, 잔금 전에 신청, 월세도 지원, 택1 이득 비교">
      <div className="track">{row}{row}</div>
    </div>
  )
}

/* ───────── 이용 3단계 ───────── */
const STEPS = [
  { n: '01', t: '질문에 답해요', d: '나이, 소득, 살고 싶은 집 형태를 한 번에 한 질문씩. 모르면 "모름"을 눌러도 돼요.' },
  { n: '02', t: '결과를 쉬운 말로', d: '"받을 수 있어요 / 확인이 필요해요 / 어려워요"로 알려주고, 이유도 풀어서 설명해요.' },
  { n: '03', t: '순서대로 신청해요', d: '"지금 잔금을 치르면 안 돼요" 같은 순서 실수를 미리 막고, 신청할 곳을 연결해요.' },
]
function How() {
  return (
    <section className="sec" id="how" aria-labelledby="how-t">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow"><i>00</i><span className="label">How it works</span></div>
          <p>경제 용어를 몰라도 돼요. 점선 대신 <b>형광펜 밑줄</b>이 그어진 단어는 눌러 보면 쉬운 말로 풀어줘요. 예를 들어 <Term id="deposit" />이 뭔지 눌러 보세요.</p>
          <Lines id="how-t" lines={[<span className="l" key="1">세 걸음이면</span>, <span key="2">충분해요<span className="it">.</span></span>]} className="display" />
        </div>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="step" data-cursor="Step">
                <span className="big" aria-hidden="true">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────── 제도 인덱스: 호버=채움 스윕+형제 흐림, 클릭=패널 펼침 ───────── */
function IdxItem({ p, i, open, onToggle }: { p: PolicyInfo; i: number; open: boolean; onToggle: () => void }) {
  const pid = useId()
  return (
    <li className={`idx-item ${open ? 'open' : ''}`}>
      <button className="idx-head" type="button" aria-expanded={open} aria-controls={pid} onClick={onToggle} data-cursor={open ? '닫기' : '열기'}>
        <span className="idx-no">{String(i + 1).padStart(2, '0')}</span>
        <span className="idx-name">{p.name}</span>
        <span className="idx-sum">{p.easy}</span>
        <span className="idx-arrow" aria-hidden="true">→</span>
      </button>
      <div className="idx-panel" id={pid} role="region" aria-label={`${p.name} 자세히`}>
        <div inert={!open}>
          <div className="idx-body">
            <span className="spacer" />
            <dl className="facts">
              <div><dt>얼마나 받아요?</dt><dd className="amount">{p.money}</dd></div>
              <div><dt>누가 받아요?</dt><dd>{p.who}</dd></div>
              <div><dt>어떻게 신청해요?</dt><dd>{p.how}</dd></div>
            </dl>
            <div>
              <div className="tags" style={{ marginBottom: 14 }}>{p.type.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
              {p.caution && <div className="note">⚠ {p.caution}</div>}
              <div className="apply"><Btn href={p.apply.url} external variant="light" size="sm">{`${p.apply.name.split(' ')[0]}에서 신청`}</Btn></div>
              <SourceBlock ids={p.sourceIds} />
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

const FILTERS = ['전체', '전세', '월세', '신혼', '청년'] as const
function Policies() {
  const [f, setF] = useState<(typeof FILTERS)[number]>('전체')
  const [open, setOpen] = useState<string | null>(null)
  const list = POLICIES.filter((p) => f === '전체' || p.type.includes(f))
  const count = (x: string) => POLICIES.filter((p) => x === '전체' || p.type.includes(x as never)).length
  return (
    <section className="sec cream2" id="policies" aria-labelledby="pol-t">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow"><i>02</i><span className="label">Policies · Index</span></div>
          <p>집을 <Term id="jeonse" />로 구하는지 <Term id="wolse" />로 구하는지에 따라 받을 수 있는 지원이 달라요. 먼저 내 상황을 고르고, 궁금한 줄을 눌러 열어 보세요.</p>
          <Lines id="pol-t" className="display" lines={[<span className="l" key="1">세종에서 받는</span>, <span key="2"><span className="it">five</span> 가지 지원</span>]} />
        </div>
        <LayoutGroup>
          <div className="filters" role="group" aria-label="제도 필터">
            {FILTERS.map((x) => (
              <button key={x} type="button" className="fchip" aria-pressed={f === x} onClick={() => { setF(x); setOpen(null) }}>
                {f === x && <motion.span layoutId="fchip-bg" className="bg" transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />}
                <span>{x}<sup>{count(x)}</sup></span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <ul className="idx">
          {list.map((p, i) => (
            <IdxItem key={p.id} p={p} i={i} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
          ))}
        </ul>
        <p className="disclaimer">
          참고용 안내예요. 최종 자격은 각 기관이 판단해요. 공고는 수시로 바뀌니 신청 전에 꼭 원문을 확인하세요. 세종 이자지원의 신혼 합산 소득(8,000만원)은 언론 보도 2건이 일치하지만 시청 최신 공고 원문은 확인하지 못했어요 <VBadge v="secondary" />
        </p>
      </div>
    </section>
  )
}

function Glossary() {
  const [q, setQ] = useState('')
  const list = TERMS.filter((t) => (t.word + t.easy).includes(q.trim()))
  return (
    <section className="sec" id="glossary" aria-labelledby="gl-t">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow"><i>04</i><span className="label">Glossary</span></div>
          <p>지원 제도에서 자주 나오는 말을 한 문장으로 풀었어요. 검색해도 되고, 쭉 훑어봐도 돼요.</p>
          <Lines id="gl-t" className="display" lines={[<span className="l" key="1">모르는 말,</span>, <span key="2">여기서 <span className="it">찾아요</span></span>]} />
        </div>
        <label className="sr-only" htmlFor="gq">용어 검색</label>
        <input id="gq" className="gloss-search" placeholder="예: 보증금, 전세, 잔금" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="gloss">
          {list.map((t) => (
            <div className="gl-row" key={t.id}>
              <h3>{t.word}</h3>
              <div><p>{t.easy}</p>{t.example && <p className="ex">예) {t.example}</p>}</div>
            </div>
          ))}
          {list.length === 0 && <p style={{ padding: '24px 0' }}>찾는 말이 없어요. 다른 단어로 검색해 보세요.</p>}
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="mega" aria-label="청정 세종">
          <span>청정</span>
          <img src="/logo-sm.png" alt="" />
          <span className="it">Sejong</span>
        </div>
        <div className="cols">
          <div>
            <h4>About</h4>
            <p>청정(靑定) 세종 — 세종에 정착하려는 청년·신혼부부의 주거지원 확인 서비스.</p>
            <p style={{ marginTop: 8, opacity: 0.7 }}>팀 청정 세종 · 제1회 세종캠퍼스 체인지메이커스</p>
          </div>
          <div>
            <h4>Links</h4>
            <ul>
              <li><a className="ulink" href="https://www.sejong.go.kr" target="_blank" rel="noreferrer noopener">세종특별자치시청 ↗</a></li>
              <li><a className="ulink" href="https://www.bokjiro.go.kr" target="_blank" rel="noreferrer noopener">복지로 ↗</a></li>
              <li><a className="ulink" href="https://nhuf.molit.go.kr" target="_blank" rel="noreferrer noopener">기금e든든 ↗</a></li>
              <li><a className="ulink" href="https://www.myhome.go.kr" target="_blank" rel="noreferrer noopener">마이홈포털 ↗</a></li>
            </ul>
          </div>
          <div className="dark">
            <h4>출처와 검증 기준</h4>
            <ul>
              <li><VBadge v="official" /> 공식 페이지에서 직접 확인</li>
              <li><VBadge v="secondary" /> 언론·2차 자료(공식 발표 인용)</li>
              <li><VBadge v="unverified" /> 이번 조사에서 원문 확인 못한 값</li>
            </ul>
          </div>
        </div>
        <p className="legal">
          이 서비스는 참고용이에요. 대출·지원금의 최종 판정은 각 기관(세종시, 주택도시기금, 복지로 등)이 해요. 제도 수치는 2026년 공고·보도 기준이며 수시로 바뀔 수 있어요. 실제 신청 대행은 하지 않아요. 로그인은 데모이며 입력 정보는 이 기기에만 저장돼요.
        </p>
      </div>
    </footer>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <How />
      <Policies />
      <section className="sec dark" id="data" aria-labelledby="data-t">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow"><i>03</i><span className="label">Data</span></div>
            <p>세종 청년들은 어떤 집에 살고, 왜 지원을 놓칠까요? 출처가 확인된 숫자와 아직 확인 중인 숫자를 구분해서 보여드려요.</p>
            <Lines id="data-t" className="display" lines={[<span className="l" key="1">숫자로 보면</span>, <span key="2">이유가 <span className="it">보여요</span></span>]} />
          </div>
          <DataSection />
        </div>
      </section>
      <Glossary />
      <section className="sec cream2" id="feedback" aria-labelledby="fb-t">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow"><i>05</i><span className="label">Voice</span></div>
            <p>여러분의 답은 이름 없이 모아서, 세종시에 “이런 지원이 필요해요”라고 전할 때 써요.</p>
            <Lines id="fb-t" className="display" lines={[<span className="l" key="1">가장 부담스러운</span>, <span key="2">돈은 <span className="it">뭐예요?</span></span>]} />
          </div>
          <div style={{ maxWidth: 860 }}><Feedback /></div>
        </div>
      </section>
      <Footer />
    </>
  )
}

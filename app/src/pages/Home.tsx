import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MagneticLink, Reveal, SourceBlock, Term, VBadge, reduced, spotlight } from '../ui'
import { POLICIES } from '../data/policies'
import { TERMS } from '../data/terms'
import { DataSection } from '../components/Charts'
import { useStore } from '../store'
import { Feedback } from '../components/Feedback'

function Petals() {
  const ref = useRef<HTMLDivElement>(null)
  const items = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ id: i, x: 5 + ((i * 37) % 90), y: 8 + ((i * 53) % 80), c: ['', 'l', 'm'][i % 3], r: (i * 47) % 360 })),
    [],
  )
  useEffect(() => {
    const host = ref.current?.parentElement
    if (!host || reduced() || !window.matchMedia('(hover: hover)').matches) return
    const els = Array.from(ref.current!.children) as HTMLElement[]
    const pos = els.map(() => ({ x: 0, y: 0 }))
    let mx = -999, my = -999, raf = 0
    const move = (e: MouseEvent) => {
      const r = host.getBoundingClientRect()
      mx = e.clientX - r.left
      my = e.clientY - r.top
    }
    const tick = () => {
      els.forEach((el, i) => {
        const bx = el.offsetLeft, by = el.offsetTop
        const dx = bx + pos[i].x - mx, dy = by + pos[i].y - my
        const d = Math.hypot(dx, dy)
        let tx = 0, ty = 0
        if (d < 160) { tx = (dx / d) * (160 - d) * 0.9; ty = (dy / d) * (160 - d) * 0.9 }
        pos[i].x += (tx - pos[i].x) * 0.08
        pos[i].y += (ty - pos[i].y) * 0.08
        el.style.transform = `translate(${pos[i].x}px, ${pos[i].y}px) rotate(${items[i].r + pos[i].x}deg)`
      })
      raf = requestAnimationFrame(tick)
    }
    host.addEventListener('mousemove', move)
    raf = requestAnimationFrame(tick)
    return () => { host.removeEventListener('mousemove', move); cancelAnimationFrame(raf) }
  }, [items])
  return (
    <div ref={ref} aria-hidden="true">
      {items.map((p) => (
        <i key={p.id} className={`petal ${p.c}`} style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `rotate(${p.r}deg)` }} />
      ))}
    </div>
  )
}

function Hero() {
  const { hasSaved } = useStore()
  return (
    <section className="hero" aria-labelledby="hero-title">
      <Petals />
      <img className="hero-logo" src="/logo-lg.png" alt="청정 세종 CJSJ 로고" />
      <div className="arches" aria-hidden="true" data-cursor="열기"><div className="arch" /><div className="arch" /><div className="arch" /></div>
      <div className="wrap">
        <div className="hero-copy">
          <span className="label">UPDATED OCT 1, 2026 · SEJONG</span>
          <h1 id="hero-title">
            내 집으로 가는 길,<br />먼저 <span className="serif">check</span> 하세요
          </h1>
          <p className="lead">
            세종에서 받을 수 있는 주거지원을 <b>어려운 말 없이</b> 알려드려요. 질문에 답하면, 받을 수 있는 것과 <b>하면 안 되는 일</b>을 순서대로 보여줘요.
          </p>
          <div className="hero-cta">
            <MagneticLink to="/diagnose">내 상황으로 확인하기</MagneticLink>
            {hasSaved && <Link className="pill ghost" to="/result">지난 결과 보기</Link>}
          </div>
          <div className="hero-note">
            <span>3분이면 끝나요</span>
            <span>로그인 없이 가능해요</span>
            <span>입력한 내용은 서버로 보내지 않아요</span>
          </div>
        </div>
      </div>
      <span className="label scroll-hint">SCROLL ↓ 먼저 어떻게 쓰는지 볼까요?</span>
    </section>
  )
}

const STEPS = [
  { n: '01', ico: '💬', t: '질문에 답해요', d: '나이, 소득, 살고 싶은 집 형태를 한 번에 한 질문씩 물어봐요. 모르면 "모름"을 눌러도 돼요.' },
  { n: '02', ico: '✅', t: '결과를 쉬운 말로 봐요', d: '"받을 수 있어요 / 확인이 필요해요 / 어려워요"로 알려주고, 어려운 이유도 풀어서 설명해요.' },
  { n: '03', ico: '🧭', t: '순서대로 신청해요', d: '"지금 잔금을 치르면 안 돼요" 같은 순서 실수를 미리 막고, 신청할 곳을 연결해 드려요.' },
]

function How() {
  return (
    <section className="sec" id="how" aria-labelledby="how-t">
      <div className="wrap">
        <div className="sec-head">
          <span className="num">HOW IT WORKS</span>
          <h2 id="how-t">처음이어도 괜찮아요.<br />세 걸음이면 돼요.</h2>
          <p>경제 용어를 몰라도 돼요. 낯선 단어는 점선 밑줄을 누르면 쉬운 말로 풀어줘요. 예를 들어 <Term id="deposit" />이 뭔지 눌러 보세요.</p>
        </div>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="card step spot" onMouseMove={spotlight}>
                <span className="n">{s.n}</span>
                <div className="ico" aria-hidden="true">{s.ico}</div>
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

const FILTERS = ['전체', '전세', '월세', '신혼', '청년'] as const

function Policies() {
  const [f, setF] = useState<(typeof FILTERS)[number]>('전체')
  const list = POLICIES.filter((p) => f === '전체' || p.type.includes(f))
  return (
    <section className="sec bg-sky" id="policies" aria-labelledby="pol-t">
      <div className="wrap">
        <div className="sec-head">
          <span className="num">02 · POLICIES</span>
          <h2 id="pol-t">세종에서 받을 수 있는 5가지 지원</h2>
          <p>
            집을 <Term id="jeonse" />로 구하는지 <Term id="wolse" />로 구하는지에 따라 받을 수 있는 지원이 달라요. 먼저 내 상황을 골라보세요.
          </p>
        </div>
        <LayoutGroup>
          <div className="chips" role="group" aria-label="제도 필터">
            {FILTERS.map((x) => (
              <button key={x} type="button" className="chip" aria-pressed={f === x} onClick={() => setF(x)}>
                {f === x && <motion.span layoutId="chip-bg" className="bg" transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />}
                <span>{x}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <div className="grid two">
          {list.map((p) => (
            <Reveal key={p.id}>
              <article className="card policy spot" onMouseMove={spotlight} style={{ height: '100%' }}>
                <div className="tags">{p.type.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
                <h3>{p.name}</h3>
                <p className="easy">{p.easy}</p>
                <dl>
                  <div><dt>얼마나?</dt><dd>{p.money}</dd></div>
                  <div><dt>누가?</dt><dd>{p.who}</dd></div>
                  <div><dt>어떻게?</dt><dd>{p.how}</dd></div>
                </dl>
                {p.caution && <div className="caution">⚠ {p.caution}</div>}
                <a className="link-arrow" href={p.apply.url} target="_blank" rel="noreferrer noopener">{p.apply.name}에서 신청·확인 ↗</a>
                <SourceBlock ids={p.sourceIds} />
              </article>
            </Reveal>
          ))}
        </div>
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
          <span className="num">04 · GLOSSARY</span>
          <h2 id="gl-t">모르는 말, 여기서 찾아요</h2>
          <p>지원 제도에서 자주 나오는 말을 한 문장으로 풀었어요.</p>
        </div>
        <label className="sr-only" htmlFor="gq">용어 검색</label>
        <input id="gq" className="gloss-search" placeholder="예: 보증금, 전세, 잔금" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="gloss">
          {list.map((t) => (
            <div className="card" key={t.id}>
              <h3>{t.word}</h3>
              <p>{t.easy}</p>
              {t.example && <p className="ex">예) {t.example}</p>}
            </div>
          ))}
          {list.length === 0 && <p>찾는 말이 없어요. 다른 단어로 검색해 보세요.</p>}
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="cols">
          <div>
            <img className="logo-f" src="/logo-sm.png" alt="청정 세종" />
            <p>청정(靑定) 세종 — 세종에 정착하려는 청년·신혼부부의 주거지원 확인 서비스</p>
            <p style={{ marginTop: 8 }}>팀 청정 세종 · 제1회 세종캠퍼스 체인지메이커스</p>
          </div>
          <div>
            <h4>바로가기</h4>
            <ul>
              <li><a href="https://www.sejong.go.kr" target="_blank" rel="noreferrer noopener">세종특별자치시청</a></li>
              <li><a href="https://www.bokjiro.go.kr" target="_blank" rel="noreferrer noopener">복지로</a></li>
              <li><a href="https://nhuf.molit.go.kr" target="_blank" rel="noreferrer noopener">기금e든든</a></li>
              <li><a href="https://www.myhome.go.kr" target="_blank" rel="noreferrer noopener">마이홈포털</a></li>
            </ul>
          </div>
          <div>
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
      <How />
      <Policies />
      <section className="sec bg-peach" id="data" aria-labelledby="data-t">
        <div className="wrap">
          <div className="sec-head">
            <span className="num">03 · DATA</span>
            <h2 id="data-t">숫자로 보면 이유가 보여요</h2>
            <p>세종 청년들은 어떤 집에 살고, 왜 지원을 놓칠까요? 출처가 확인된 숫자와 아직 확인 중인 숫자를 구분해서 보여드려요.</p>
          </div>
          <DataSection />
        </div>
      </section>
      <Glossary />
      <section className="sec bg-sky" id="feedback" aria-labelledby="fb-t">
        <div className="wrap">
          <div className="sec-head">
            <span className="num">05 · VOICE</span>
            <h2 id="fb-t">가장 부담스러운 돈은 뭐예요?</h2>
            <p>여러분의 답은 이름 없이 모아서, 세종시에 “이런 지원이 필요해요”라고 전할 때 써요.</p>
          </div>
          <div style={{ maxWidth: 760 }}><Feedback /></div>
        </div>
      </section>
      <Footer />
    </>
  )
}

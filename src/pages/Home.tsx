import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { HERO } from '../data/hero'
import { HeroSequence } from '../lib/heroSequence'
import { rank } from '../lib/search'
import { Btn, Lines, Reveal, SourceBlock, Term, VBadge, Wave, reduced } from '../ui'
import { POLICIES } from '../data/policies'
import type { PolicyInfo } from '../data/policies'
import { TERMS } from '../data/terms'
import { DataSection } from '../components/Charts'
import { useStore } from '../store'

/* ───────── 첫 화면: 영상 히어로 ─────────
   · 세션 첫 방문에만 자동 재생: 영상 1(스마트폰) → 영상 0(대학생·결혼) → 영상 2 (각각 1초간 서서히 섞이며 이어짐) → 마지막 장면에서 정지
   · 재방문·모션 줄이기: 정지 장면만 보여주고 "영상 재생" 버튼을 누르면 처음부터 재생
   · 영상·이어 붙이는 지점은 data/hero.ts 에서 바꾼다 */
const HERO_KEY = 'cjsj.heroPlayed'
function HeroVideo() {
  const { openModal, popupOpen } = useStore()
  const openDiagnose = () => openModal('diagnose')
  const v0 = useRef<HTMLVideoElement>(null)
  const va = useRef<HTMLVideoElement>(null)
  const vb = useRef<HTMLVideoElement>(null)
  const seq = useRef<HeroSequence | null>(null)
  const resume = useRef(false)
  const [firstRun] = useState(() => {
    try { return !sessionStorage.getItem(HERO_KEY) } catch { return false }
  })
  const [still] = useState(() => reduced())
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const z = v0.current, a = va.current, b = vb.current
    if (!z || !a || !b) return
    const s = new HeroSequence([a, z, b], [HERO.clip1, HERO.clip0, HERO.clip2], HERO.fade)
    seq.current = s
    const id = setInterval(() => s.tick(), 60)
    // 첫 방문: 로딩 막이 걷힌 뒤(약 2.1초) 처음부터 재생
    const t = firstRun && !still ? setTimeout(() => s.start(), 2100) : undefined
    return () => { clearInterval(id); if (t) clearTimeout(t); s.dispose() }
  }, [firstRun, still])

  // 팝업이 열려 있는 동안에는 뒤의 영상을 잠시 멈췄다가 닫히면 이어서 재생한다
  useEffect(() => {
    const s = seq.current
    if (!s) return
    if (popupOpen) {
      resume.current = playing
      s.pause()
    } else if (resume.current) {
      resume.current = false
      s.resume()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupOpen])

  const autoplay = firstRun && !still
  const showBtn = !playing && (started || !autoplay)
  const mark = () => { try { sessionStorage.setItem(HERO_KEY, '1') } catch { /* noop */ } }
  const onPlay = () => { setPlaying(true); setStarted(true); mark() }
  // 영상 중 하나라도 재생 중이면 재생 중
  const onPause = () => setPlaying([v0, va, vb].some((r) => !(r.current?.paused ?? true)))

  return (
    <section className="vhero" aria-labelledby="vh-title">
      <div className="vhero-media" aria-hidden="true">
        <video ref={v0} className="vhero-video" src={HERO.clip0.src} muted playsInline preload="auto" onPlay={onPlay} onPause={onPause} />
        <video ref={va} className={`vhero-video${autoplay ? ' on' : ''}`} src={HERO.clip1.src} muted playsInline preload="auto" onPlay={onPlay} onPause={onPause} />
        <video ref={vb} className={`vhero-video${autoplay ? '' : ' on'}`} src={`${HERO.clip2.src}#t=${autoplay ? HERO.clip2.start : HERO.still}`} muted playsInline preload="auto" onPlay={onPlay} onPause={onPause} />
      </div>
      <div className="vhero-scrim" aria-hidden="true" />
      <div className="wrap vhero-inner">
        <span className="vh-pill">세종에서 처음 집을 구하는 청년 · 신혼부부를 위해</span>
        <Lines
          as="h1" id="vh-title" className="display"
          delay={(() => { try { return sessionStorage.getItem('cjsj.seen') ? 0.1 : 1.9 } catch { return 0.1 } })()}
          lines={[<span className="l" key="a">청년이 머무는 곳,</span>, <span key="b">세종이 <span className="em">시작</span>되는 곳</span>]}
        />
        <p className="vh-sub">세종에서 첫 집, <b>어디서부터 시작하죠?</b></p>
        <p className="lead">받을 수 있는 지원금, 신청하는 순서, 놓치기 쉬운 함정까지 — 3분이면 쉬운 말로 알려드릴게요.</p>
        <div className="hero-cta">
          <Btn onClick={openDiagnose} variant="light">내 상황 확인해 보기</Btn>
          <Btn to="/#intro" variant="glass">청정 세종 이야기</Btn>
        </div>
      </div>
      <div className="vh-right">
        {showBtn && <button type="button" className="vh-replay" onClick={() => seq.current?.restart()}>{started ? '↺ 처음부터 보기' : '▶ 영상 재생'}</button>}
      </div>
    </section>
  )
}

/* ───────── 두 번째 화면: 인트로 (마우스에 반응하는 아치·구슬·로고) ───────── */
function Intro() {
  const { user, hasSaved, openLogin, openModal } = useStore()
  const navigate = useNavigate()
  // 지난 결과는 회원 전용: 비회원은 회원등록 안내, 회원은 저장된 결과로 이동(없으면 진단 팝업)
  const onPast = () => {
    if (!user) openLogin('history')
    else if (hasSaved) navigate('/result')
    else openModal('diagnose')
  }
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0
    // 마우스가 멈춰 값이 안정되면 계산을 멈춘다 (움직이면 다시 시작)
    const tick = () => {
      x += (tx - x) * 0.16; y += (ty - y) * 0.16
      el.style.setProperty('--px', x.toFixed(3))
      el.style.setProperty('--py', y.toFixed(3))
      raf = Math.abs(tx - x) < 0.002 && Math.abs(ty - y) < 0.002 ? 0 : requestAnimationFrame(tick)
    }
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2
      if (!raf) raf = requestAnimationFrame(tick)
    }
    el.addEventListener('mousemove', move)
    return () => { el.removeEventListener('mousemove', move); cancelAnimationFrame(raf) }
  }, [])
  return (
    <section className="hero hero2" id="intro" ref={ref} aria-labelledby="intro-t">
      <div className="scene" aria-hidden="true">
        <div className="arch a1"><img src="/photos/home-interior.jpg" alt="" loading="lazy" decoding="async" style={{ objectPosition: '50% 38%' }} /></div>
        <div className="arch a2"><img src="/photos/sejong-lake.jpg" alt="" loading="lazy" decoding="async" style={{ objectPosition: '62% 50%' }} /></div>
        <div className="arch a3"><img src="/photos/sejong-skyline.jpg" alt="" loading="lazy" decoding="async" style={{ objectPosition: '50% 55%' }} /></div>
        <div className="stairs" /><div className="orb" />
      </div>
      <div className="grain" aria-hidden="true" />
      <div className="wrap hero-inner">
        <div className="emblem"><img src="/logo-lg.png" alt="청정 세종 CJSJ 로고" /></div>
        <span className="label" style={{ color: 'var(--ink)' }}>청정 세종이라는 이름에는</span>
        <Lines
          as="h2" id="intro-t" className="display"
          lines={[<span className="l" key="a"><Wave text="내 집으로 가는 길," /></span>, <span key="b"><Wave text="함께 " /><Wave text="확인해" accent /><Wave text=" 봐요" /></span>]}
        />
        <p className="lead">청정(靑定)은 푸를 청에 정할 정, 청년이 세종에 마음 편히 자리 잡도록 돕고 싶은 마음을 담았어요. 어려운 경제 용어는 쉬운 말로 풀어서, 받을 수 있는 지원과 조심할 점을 차근차근 안내해 드릴게요.</p>
        <div className="hero-cta">
          <Btn to="/#policies">지원 제도 둘러보기</Btn>
          <Btn onClick={onPast} variant="line">지난 결과 보기</Btn>
        </div>
      </div>
    </section>
  )
}

function Marquee() {
  const items = ['놓치기 쉬운 지원금', '신청 순서가 중요해요', '월세도 지원받을 수 있어요', '전세·월세 한 번에 확인', '나에게 더 이득인 쪽은?']
  const row = (
    <span aria-hidden="true">
      {items.map((t) => (<span key={t}>{t}<i>✺</i></span>))}
    </span>
  )
  return (
    <div className="marquee" aria-label="핵심 메시지: 놓치기 쉬운 지원금, 신청 순서가 중요해요, 월세도 지원받을 수 있어요, 전세·월세 한 번에 확인">
      <div className="track">{row}{row}</div>
    </div>
  )
}

/* ───────── 이용 3단계 ───────── */
const STEPS = [
  { n: '01', t: '편하게 답해 주세요', d: '나이, 소득, 구하는 집 형태를 한 번에 한 가지씩 여쭤볼게요. 잘 모르는 건 "잘 모르겠어요"를 눌러도 괜찮아요.' },
  { n: '02', t: '쉬운 말로 알려드려요', d: '"신청할 수 있어요 / 확인해 보면 좋아요 / 지금은 어려워요"로 알려드리고, 이유도 풀어서 설명해 드려요.' },
  { n: '03', t: '순서대로 신청해요', d: '집값을 다 치르기 전에 신청해야 하는 제도도 있어요. 이런 순서를 미리 알려드리고, 신청할 곳도 이어 드려요.' },
]
function How() {
  return (
    <section className="sec" id="how" aria-labelledby="how-t">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow"><i>00</i><span className="label">이용 방법</span></div>
          <p>경제 용어를 몰라도 괜찮아요. <b>분홍 형광펜</b>이 그어진 단어를 누르면 쉬운 말로 풀어 드려요. 예를 들어 <Term id="deposit" />을 한번 눌러 보세요.</p>
          <Lines id="how-t" lines={[<span className="l" key="1">세 걸음이면</span>, <span key="2">충분해요.</span>]} className="display" />
        </div>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="step">
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
      <button className="idx-head" type="button" aria-expanded={open} aria-controls={pid} onClick={onToggle}>
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
              <div><dt>지원 내용</dt><dd className="amount">{p.money}</dd></div>
              <div><dt>지원 대상</dt><dd>{p.who}</dd></div>
              <div><dt>신청 방법</dt><dd>{p.how}</dd></div>
            </dl>
            <div>
              <div className="tags" style={{ marginBottom: 14 }}>{p.type.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
              {p.caution && <div className="note">⚠ {p.caution}</div>}
              <div className="apply"><Btn href={p.apply.url} external variant="light" size="sm">{`${p.apply.name.split(' ')[0]}에서 신청하기`}</Btn></div>
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
          <div className="eyebrow"><i>02</i><span className="label">지원 제도</span></div>
          <p>집을 <Term id="jeonse" />로 구하는지 <Term id="wolse" />로 구하는지에 따라 받을 수 있는 지원이 달라져요. 내 상황을 먼저 골라 보시고, 궁금한 줄을 눌러 펼쳐 보세요.</p>
          <Lines id="pol-t" className="display" lines={[<span className="l" key="1">세종에서 받을 수 있는</span>, <span key="2">다섯 가지 지원</span>]} />
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
          참고용 안내예요. 최종 자격은 각 기관에서 판단해요. 공고는 자주 바뀌니, 신청하기 전에 원문을 꼭 한 번 확인해 주세요. 세종 이자지원의 신혼 합산 소득(8,000만원)은 언론 보도 2건이 일치하지만 시청 최신 공고 원문은 확인하지 못했어요 <VBadge v="secondary" />
        </p>
      </div>
    </section>
  )
}

const POPULAR = ['deposit', 'jeonse', 'wolse', 'jan', 'pickone']
const SEARCH_ITEMS = TERMS.map((t) => ({ id: t.id, fields: [t.word, ...(t.alias ?? [])], long: t.easy }))
function Glossary() {
  const [q, setQ] = useState('')
  const { hits, suggestions } = useMemo(() => rank(SEARCH_ITEMS, q), [q])
  const byId = (id: string) => TERMS.find((t) => t.id === id)!
  const list = hits.map(byId)
  const typed = q.trim().length > 0
  return (
    <section className="sec" id="glossary" aria-labelledby="gl-t">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow"><i>04</i><span className="label">쉬운 용어</span></div>
          <p>지원 제도에서 자주 나오는 말을 한 문장으로 풀어 두었어요. 검색해 보셔도 좋고, 천천히 훑어보셔도 좋아요. 글자가 조금 틀려도, 초성(ㅂㅈㄱ)만 입력해도 찾아 드려요.</p>
          <Lines id="gl-t" className="display" lines={[<span className="l" key="1">낯선 말은</span>, <span key="2">여기서 <span className="em">쉽게</span> 찾아보세요</span>]} />
        </div>
        <label className="sr-only" htmlFor="gq">용어 검색</label>
        <input id="gq" className="gloss-search" placeholder="예: 보증금, 전세, 잔금, ㅂㅈㄱ" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        {!typed && (
          <p className="gloss-chips" aria-label="자주 찾는 말">
            <span className="hint">자주 찾는 말</span>
            {POPULAR.map((id) => <button key={id} type="button" className="chip-s" onClick={() => setQ(byId(id).word.replace(/ \(.*\)/, ''))}>{byId(id).word.replace(/ \(.*\)/, '')}</button>)}
          </p>
        )}
        {typed && list.length === 0 && (
          <div className="didyou" role="status">
            {suggestions.length > 0 ? (
              <>
                <p>“{q.trim()}”에 맞는 말이 없네요. <b>혹시 이걸 찾으셨나요?</b></p>
                <p className="gloss-chips">
                  {suggestions.map((id) => <button key={id} type="button" className="chip-s on" onClick={() => setQ(byId(id).word.replace(/ \(.*\)/, ''))}>{byId(id).word}</button>)}
                </p>
              </>
            ) : (
              <>
                <p>“{q.trim()}”와 비슷한 말을 찾지 못했어요. 아래 자주 찾는 말을 눌러 보시겠어요?</p>
                <p className="gloss-chips">
                  {POPULAR.map((id) => <button key={id} type="button" className="chip-s" onClick={() => setQ(byId(id).word.replace(/ \(.*\)/, ''))}>{byId(id).word}</button>)}
                </p>
              </>
            )}
          </div>
        )}
        <div className="gloss">
          {list.map((t) => (
            <div className="gl-row" key={t.id}>
              <h3>{t.word}</h3>
              <div><p>{t.easy}</p>{t.example && <p className="ex">예) {t.example}</p>}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Footer({ tone = 'home' }: { tone?: 'home' | 'paper' }) {
  return (
    <footer className={`footer ${tone === 'paper' ? 'from-paper' : ''}`}>
      <div className="wrap">
        <div className="brandblock">
          <img className="bb-logo" src="/logo-lg.png" alt="" />
          <div>
            <p className="bb-name">청정 세종</p>
            <p className="bb-tag">청년이 머무는 곳, 세종이 시작되는 곳</p>
          </div>
        </div>
        <div className="cols">
          <div>
            <h4>소개</h4>
            <p>청정(靑定) 세종 — 세종에 정착하려는 청년·신혼부부의 주거지원 확인 서비스.</p>
            <p style={{ marginTop: 8, opacity: 0.7 }}>팀 청정 세종 · 제1회 세종캠퍼스 체인지메이커스</p>
          </div>
          <div>
            <h4>바로가기</h4>
            <ul>
              <li><a className="ulink" href="https://www.sejong.go.kr" target="_blank" rel="noreferrer noopener">세종특별자치시청 ↗</a></li>
              <li><a className="ulink" href="https://www.bokjiro.go.kr" target="_blank" rel="noreferrer noopener">복지로 ↗</a></li>
              <li><a className="ulink" href="https://nhuf.molit.go.kr" target="_blank" rel="noreferrer noopener">기금e든든 ↗</a></li>
              <li><a className="ulink" href="https://www.myhome.go.kr" target="_blank" rel="noreferrer noopener">마이홈포털 ↗</a></li>
            </ul>
          </div>
          <div className="dark">
            <h4>출처 표시 기준</h4>
            <ul>
              <li><VBadge v="official" /> 공식 페이지에서 직접 확인</li>
              <li><VBadge v="secondary" /> 언론·2차 자료(공식 발표 인용)</li>
              <li><VBadge v="unverified" /> 이번 조사에서 원문 확인 못한 값</li>
            </ul>
          </div>
        </div>
        <p className="legal">
          사진 출처(Pixabay 콘텐츠 라이선스, 상업적 이용 가능): 세종호수공원 <a className="ulink" href="https://pixabay.com/photos/sejong-city-lake-boat-korea-pond-4331956/" target="_blank" rel="noreferrer noopener">YHBae</a> · 호수 너머 도시 풍경 <a className="ulink" href="https://pixabay.com/photos/sejong-city-sejong-city-day-6003866/" target="_blank" rel="noreferrer noopener">BinnaKim714</a> · 집 안 풍경 <a className="ulink" href="https://pixabay.com/photos/interior-room-couch-window-4226020/" target="_blank" rel="noreferrer noopener">atanaspaskalev</a>.
          <br /><br />
          이 서비스는 참고용이에요. 대출·지원금의 최종 판정은 각 기관(세종시, 주택도시기금, 복지로 등)에서 해요. 제도 수치는 2026년 공고·보도 기준이며 자주 바뀔 수 있어요. 신청을 대신해 드리지는 않아요. 로그인은 체험용이며, 입력하신 정보는 이 기기에만 저장돼요.
        </p>
      </div>
    </footer>
  )
}

export default function Home() {
  return (
    <>
      <HeroVideo />
      <Marquee />
      <Intro />
      <How />
      <Policies />
      <section className="sec dark" id="data" aria-labelledby="data-t">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow"><i>03</i><span className="label">숫자로 보기</span></div>
            <p>세종 청년들은 어떤 집에 살고, 왜 지원을 놓칠까요? 출처가 확인된 숫자와 아직 확인 중인 숫자를 구분해서 보여드려요.</p>
            <Lines id="data-t" className="display" lines={[<span className="l" key="1">숫자로 보면</span>, <span key="2">이유가 <span className="em">보여요</span></span>]} />
          </div>
          <DataSection />
        </div>
      </section>
      <Glossary />
      <Footer />
    </>
  )
}

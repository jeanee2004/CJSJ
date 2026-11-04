import { useState } from 'react'
import type { ReactNode } from 'react'
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { HOUSING_META, HOUSING_TYPE, INCOME_LIMITS, INCOME_META, YOUTH_KPIS } from '../data/stats'
import { SOURCES } from '../data/sources'
import { Btn, CountUp, Reveal } from '../ui'
import { useStore } from '../store'
import './Stats.css'

// 다크 배경용 팔레트. 색만으로 구분하지 않도록 값 라벨·범례·표를 함께 둔다.
const C = { lime: '#e8a3bb', mint: '#9fcfb8', aqua: '#86b3d6', peri: '#b0b4d6', coral: '#e8926f', grey: '#8b95a7', text: '#f6eef1' }
const DIM = 0.28

/** 출처는 알약 없이 작은 글씨 한 줄. 이름은 「 앞까지만 쓰고, 2차 자료·확인 중이면 짧게 병기한다. */
function SourceLine({ ids, note }: { ids: string[]; note?: string }) {
  const items = ids.map((id) => SOURCES[id]).filter(Boolean)
  return (
    <p className="stat-src">
      출처:{' '}
      {items.map((s, i) => {
        const name = s.name.split('「')[0].trim()
        const tag = s.verified === 'secondary' ? ' (2차 자료)' : s.verified === 'unverified' ? ' (확인 중)' : ''
        return (
          <span key={s.id}>
            {i > 0 && ', '}
            {s.url ? <a href={s.url} target="_blank" rel="noreferrer noopener">{name}</a> : name}
            {' '}· {s.asOf} 기준{tag}
          </span>
        )
      })}
      {note && <> · {note}</>}
    </p>
  )
}

/** 한 줄 결론(큰 글씨) → 그림 → 쉬운 설명 → 작은 출처 */
function Frame({ title, easy, children, table, legend, ids, srcNote }: { title: string; easy: string; children: ReactNode; table: { k: string; v: string }[]; legend?: ReactNode; ids: string[]; srcNote?: string }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="chart-box" role="img" aria-label={`${title}. ${table.map((t) => `${t.k} ${t.v}`).join(', ')}`}>
        {children}
      </div>
      {legend}
      <p className="stat-easy">{easy}</p>
      <SourceLine ids={ids} note={srcNote} />
    </div>
  )
}

const tipStyle = { background: '#f3efe7', color: '#0b1220', border: 0, borderRadius: 12, fontSize: 13, fontWeight: 600 }

export function DataSection() {
  const { openModal } = useStore()
  const [pie, setPie] = useState<number | null>(null)
  const [bar, setBar] = useState<number | null>(null)
  const PIE = [C.lime, C.mint, C.aqua, C.grey]
  const kpiSrc = SOURCES[YOUTH_KPIS[0].sourceId]

  return (
    <>
      <div className="kpis">
        {YOUTH_KPIS.map((k, i) => {
          const n = parseFloat(k.value.replace(/[^0-9.]/g, ''))
          const suffix = k.value.replace(/[0-9.,]/g, '')
          return (
            <Reveal key={k.label} delay={i * 0.08}>
              <div className="kpi">
                <span>{k.label}</span>
                <b className="num"><CountUp to={n} suffix={suffix} decimals={k.value.includes('.') ? 1 : 0} /></b>
                <span>{k.sub}</span>
              </div>
            </Reveal>
          )
        })}
      </div>
      <SourceLine ids={[kpiSrc.id]} note="세종시 2025 청년통계(2024.12 기준 수치) 인용" />

      <div className="charts">
        <Reveal>
          <Frame
            title={HOUSING_META.title}
            easy="전세 대출만 알아보면 월세 사는 청년이 받을 수 있는 지원을 놓치기 쉬워요."
            ids={HOUSING_META.sourceIds}
            srcNote="기타 5.3%는 100%에서 나머지를 뺀 값"
            table={HOUSING_TYPE.map((h) => ({ k: h.name, v: `${h.value}%` }))}
            legend={
              <ul className="pie-legend">
                {HOUSING_TYPE.map((h, i) => <li key={h.name}><i style={{ background: PIE[i] }} />{h.name} <b>{h.value}%</b></li>)}
              </ul>
            }
          >
            <ResponsiveContainer>
              <PieChart>
                <Pie data={HOUSING_TYPE} dataKey="value" nameKey="name" innerRadius={62} outerRadius={104} paddingAngle={3} stroke="none" isAnimationActive={false}
                  onMouseEnter={(_, i) => setPie(i)} onMouseLeave={() => setPie(null)}
                  label={false} labelLine={false}>
                  {HOUSING_TYPE.map((_, i) => <Cell key={i} fill={PIE[i]} fillOpacity={pie === null || pie === i ? 1 : DIM} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Frame>
        </Reveal>

        <Reveal delay={0.08}>
          <Frame
            title={INCOME_META.title}
            easy="같은 소득이어도 어떤 제도는 받고 어떤 제도는 못 받을 수 있어요. 신혼은 부부 합산 소득이에요."
            ids={INCOME_META.sourceIds}
            table={INCOME_LIMITS.map((i) => ({ k: i.name, v: `연 ${i.value.toLocaleString()}만원 이하` }))}
            legend={<ul className="pie-legend"><li><i style={{ background: C.lime }} />세종시 제도</li><li><i style={{ background: C.aqua }} />나라(주택도시기금) 제도</li><li>단위: 연소득 만원</li></ul>}
          >
            <ResponsiveContainer>
              <BarChart data={INCOME_LIMITS} layout="vertical" margin={{ left: 4, right: 60, top: 10, bottom: 4 }} onMouseLeave={() => setBar(null)}>
                <XAxis type="number" domain={[0, 9000]} hide />
                <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 12, fill: C.text }} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} contentStyle={tipStyle} formatter={(v) => `${Number(v).toLocaleString()}만원 이하`} />
                <Bar dataKey="value" radius={4} isAnimationActive={false} onMouseEnter={(_, i) => setBar(i)}>
                  {INCOME_LIMITS.map((d, i) => <Cell key={i} fill={d.kind === 'sejong' ? C.lime : C.aqua} fillOpacity={bar === null || bar === i ? 1 : DIM} />)}
                  <LabelList dataKey="value" position="right" formatter={(v) => Number(v).toLocaleString()} fontSize={12} fill={C.text} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Frame>
        </Reveal>
      </div>

      <div className="stat-cta">
        <p>그럼 나는 어디에 해당할까요? 몇 가지만 답하면 바로 알려드려요.</p>
        <Btn onClick={() => openModal('survey')} variant="light" track="data_start_survey">내 상황 확인해 보기</Btn>
      </div>
    </>
  )
}

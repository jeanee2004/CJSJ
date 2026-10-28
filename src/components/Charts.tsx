import { useState } from 'react'
import type { ReactNode } from 'react'
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EXAMPLE_COUPLE, HOUSING_META, HOUSING_TYPE, INCOME_LIMITS, INCOME_META, OUTFLOW, OUTFLOW_META, SALE_FALLBACK_YM, SALE_META, SALE_VS_JEONSE, YOUTH_KPIS } from '../data/stats'
import type { ChartMeta } from '../data/stats'
import { CountUp, Reveal, SourceBlock, VBadge } from '../ui'
import { monthsAgo, useApi, ymLabel } from '../lib/api'
import type { TradesRes } from '../lib/api'

// 다크 배경용 팔레트. 색만으로 구분하지 않도록 값 라벨·범례·표를 함께 둔다.
const C = { lime: '#f0a9bf', mint: '#8cf0cf', aqua: '#7ccbff', peri: '#a3afff', coral: '#ff7a59', grey: '#7b8296', text: '#fff8fa' }
const DIM = 0.28

function Frame({ meta, children, table, legend, busy }: { meta: ChartMeta; children: ReactNode; table: { k: string; v: string }[]; legend?: string; busy?: boolean }) {
  return (
    <div className="chart-card" aria-busy={busy || undefined}>
      <VBadge v={meta.verified} />
      <h3>{meta.title}</h3>
      <p className="take">{meta.takeaway}</p>
      <div className="chart-box" role="img" aria-label={`${meta.title}. ${table.map((t) => `${t.k} ${t.v}`).join(', ')}`}>
        {children}
      </div>
      {legend && <p className="chart-note">{legend}</p>}
      {busy && <p className="chart-note">최신 데이터를 불러오는 중이에요…</p>}
      {meta.note && <p className="chart-note">※ {meta.note}</p>}
      <details className="table-alt">
        <summary>표로 보기</summary>
        <table><tbody>{table.map((t) => <tr key={t.k}><th scope="row">{t.k}</th><td>{t.v}</td></tr>)}</tbody></table>
      </details>
      <SourceBlock ids={meta.sourceIds} />
    </div>
  )
}

/**
 * 세종 아파트 매매 vs 전세. /api/trades 로 2개월 전(신고 기한 30일이 지난 가장 최근 달)을 불러오고,
 * 실패하면 stats.ts 폴백값을 보여준다.
 */
function useSaleVsJeonse(): { data: { name: string; value: number }[]; meta: ChartMeta; state: 'loading' | 'ok' | 'error' } {
  const ym = monthsAgo(2)
  const sale = useApi<TradesRes>(`/api/trades?type=apt-trade&dealYmd=${ym}&summary=1`)
  const rent = useApi<TradesRes>(`/api/trades?type=apt-rent&dealYmd=${ym}&summary=1`)
  if (sale.state === 'ok' && rent.state === 'ok') {
    const s = sale.data.summary.sale, j = rent.data.summary.jeonse
    const ratio = s > 0 ? j / s : 0
    const title = s === 0 && j === 0 ? '세종 아파트 매매·전세 거래가 아직 없어요'
      : ratio >= 1.1 ? `세종 아파트는 전세 거래가 매매의 ${ratio.toFixed(1)}배예요`
      : ratio <= 0.9 ? `세종 아파트는 매매 거래가 전세보다 많아요`
      : '세종 아파트 매매와 전세 거래가 비슷해요'
    return {
      state: 'ok',
      data: [{ name: '매매', value: s }, { name: '전세', value: j }],
      meta: { ...SALE_META, title, note: `국토부 실거래가, ${ymLabel(ym)} 계약 기준 (${new Date(sale.data.fetchedAt).toLocaleDateString('ko-KR')} 조회). 매매는 해제 ${sale.data.summary.saleCancelled}건 제외, 전세는 월세 0원 계약만 셌어요. 신고 기한이 남아 있어 조금 늘어날 수 있어요.` },
    }
  }
  const failed = sale.state === 'error' || rent.state === 'error'
  return {
    state: failed ? 'error' : 'loading',
    data: SALE_VS_JEONSE,
    meta: { ...SALE_META, note: `${failed ? '최신 데이터를 불러오지 못했습니다. ' : ''}국토부 실거래가, ${ymLabel(SALE_FALLBACK_YM)} 계약 기준 (2026.10.28 조회) 값이에요.` },
  }
}

const tipStyle = { background: '#f3efe7', color: '#0b1220', border: 0, borderRadius: 12, fontSize: 13, fontWeight: 600 }

export function DataSection() {
  const [pie, setPie] = useState<number | null>(null)
  const [bar, setBar] = useState<number | null>(null)
  const PIE = [C.lime, C.mint, C.aqua, C.grey]
  const live = useSaleVsJeonse()

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
      <p className="chart-note" style={{ marginBottom: 32 }}>세종시 「2025 청년통계」(2024.12 기준) 보도 인용 · <VBadge v="secondary" /></p>

      <div className="charts">
        <Reveal>
          <Frame meta={HOUSING_META} table={HOUSING_TYPE.map((h) => ({ k: h.name, v: `${h.value}%` }))}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={HOUSING_TYPE} dataKey="value" nameKey="name" innerRadius={62} outerRadius={104} paddingAngle={3} stroke="none" isAnimationActive={false}
                  onMouseEnter={(_, i) => setPie(i)} onMouseLeave={() => setPie(null)}
                  label={(p) => `${p.name} ${p.value}%`} labelLine={false}>
                  {HOUSING_TYPE.map((_, i) => <Cell key={i} fill={PIE[i]} fillOpacity={pie === null || pie === i ? 1 : DIM} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Frame>
        </Reveal>

        <Reveal delay={0.08}>
          <Frame meta={INCOME_META} legend="분홍 = 세종시 제도 · 하늘 = 나라(주택도시기금) 제도 · 단위 만원/연" table={[...INCOME_LIMITS.map((i) => ({ k: i.name, v: `${i.value.toLocaleString()}만원` })), { k: '예시 맞벌이 부부', v: `${EXAMPLE_COUPLE.toLocaleString()}만원` }]}>
            <ResponsiveContainer>
              <BarChart data={INCOME_LIMITS} layout="vertical" margin={{ left: 4, right: 52, top: 10, bottom: 4 }} onMouseLeave={() => setBar(null)}>
                <XAxis type="number" domain={[0, 9500]} hide />
                <YAxis type="category" dataKey="name" width={124} tick={{ fontSize: 12, fill: C.text }} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} contentStyle={tipStyle} formatter={(v) => `${Number(v).toLocaleString()}만원`} />
                <ReferenceLine x={EXAMPLE_COUPLE} stroke={C.coral} strokeDasharray="4 3" label={{ value: '예시 8,500', position: 'insideTopRight', fontSize: 11, fill: C.coral }} />
                <Bar dataKey="value" radius={4} isAnimationActive={false} onMouseEnter={(_, i) => setBar(i)}>
                  {INCOME_LIMITS.map((d, i) => <Cell key={i} fill={d.kind === 'sejong' ? C.lime : C.aqua} fillOpacity={bar === null || bar === i ? 1 : DIM} />)}
                  <LabelList dataKey="value" position="right" formatter={(v) => Number(v).toLocaleString()} fontSize={12} fill={C.text} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Frame>
        </Reveal>

        <Reveal>
          <Frame meta={live.meta} busy={live.state === 'loading'} table={live.data.map((s) => ({ k: s.name, v: `${s.value.toLocaleString()}건` }))}>
            <ResponsiveContainer>
              <BarChart data={live.data} margin={{ top: 24 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: C.text, fontSize: 13 }} />
                <YAxis hide />
                <Tooltip cursor={false} contentStyle={tipStyle} formatter={(v) => `${v}건`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  <Cell fill={C.lime} /><Cell fill={C.mint} />
                  <LabelList dataKey="value" position="top" formatter={(v) => `${v}건`} fill={C.text} fontSize={13} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Frame>
        </Reveal>

        <Reveal delay={0.08}>
          <Frame meta={OUTFLOW_META} table={OUTFLOW.map((o) => ({ k: o.name, v: `−${o.value}명` }))}>
            <ResponsiveContainer>
              <BarChart data={OUTFLOW} layout="vertical" margin={{ left: 4, right: 60 }}>
                <XAxis type="number" domain={[0, 600]} hide />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: C.text }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" fill={C.coral} radius={4} isAnimationActive={false} barSize={56}>
                  <LabelList dataKey="value" position="right" formatter={(v) => `−${v}명`} fill={C.text} fontSize={14} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Frame>
        </Reveal>
      </div>
    </>
  )
}

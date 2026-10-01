import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { EXAMPLE_COUPLE, HOUSING_META, HOUSING_TYPE, INCOME_LIMITS, INCOME_META, OUTFLOW, OUTFLOW_META, SALE_META, SALE_VS_JEONSE, YOUTH_KPIS } from '../data/stats'
import type { ChartMeta } from '../data/stats'
import { Reveal, SourceBlock, VBadge, spotlight } from '../ui'

const C = { blue: '#1f5fd6', aqua: '#2a9cc4', mint: '#2f9e7b', peach: '#d9825f', grey: '#8a90a6', ink: '#1e2230' }
const PIE = [C.blue, C.aqua, C.mint, C.grey]

function Frame({ meta, children, table }: { meta: ChartMeta; children: React.ReactNode; table: { k: string; v: string }[] }) {
  return (
    <div className="card chart-card spot" onMouseMove={spotlight}>
      <VBadge v={meta.verified} />
      <h3 style={{ marginTop: 10 }}>{meta.title}</h3>
      <p className="take">{meta.takeaway}</p>
      <div className="chart-box" role="img" aria-label={`${meta.title}. ${table.map((t) => `${t.k} ${t.v}`).join(', ')}`}>
        {children}
      </div>
      {meta.note && <p className="chart-note">※ {meta.note}</p>}
      <details className="table-alt">
        <summary>표로 보기</summary>
        <table>
          <tbody>{table.map((t) => <tr key={t.k}><th scope="row">{t.k}</th><td>{t.v}</td></tr>)}</tbody>
        </table>
      </details>
      <SourceBlock ids={meta.sourceIds} />
    </div>
  )
}

export function DataSection() {
  return (
    <>
      <div className="kpis">
        {YOUTH_KPIS.map((k, i) => (
          <Reveal key={k.label} delay={i * 0.08}>
            <div className="card kpi">
              <span>{k.label}</span>
              <b>{k.value}</b>
              <span>{k.sub}</span>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="chart-note" style={{ marginBottom: 20 }}>
        세종시 「2025 청년통계」(2024.12 기준) 보도 인용 · <VBadge v="secondary" />
      </p>
      <div className="charts">
        <Reveal>
          <Frame meta={HOUSING_META} table={HOUSING_TYPE.map((h) => ({ k: h.name, v: `${h.value}%` }))}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={HOUSING_TYPE} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2} label={(p) => `${p.name} ${p.value}%`} labelLine={false} isAnimationActive={false}>
                  {HOUSING_TYPE.map((_, i) => <Cell key={i} fill={PIE[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Frame>
        </Reveal>
        <Reveal delay={0.08}>
          <Frame meta={INCOME_META} table={[...INCOME_LIMITS.map((i) => ({ k: i.name, v: `${i.value.toLocaleString()}만원` })), { k: '예시 맞벌이 부부', v: `${EXAMPLE_COUPLE.toLocaleString()}만원` }]}>
            <ResponsiveContainer>
              <BarChart data={INCOME_LIMITS} layout="vertical" margin={{ left: 8, right: 56, top: 8, bottom: 8 }}>
                <XAxis type="number" domain={[0, 9000]} hide />
                <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 12, fill: C.ink }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => `${Number(v).toLocaleString()}만원`} />
                <ReferenceLine x={EXAMPLE_COUPLE} stroke={C.peach} strokeDasharray="4 3" label={{ value: '예시 8,500', position: 'insideTopRight', fontSize: 11, fill: C.peach }} />
                <Bar dataKey="value" radius={6} isAnimationActive={false}>
                  {INCOME_LIMITS.map((d, i) => <Cell key={i} fill={d.kind === 'sejong' ? C.aqua : C.blue} />)}
                  <LabelList dataKey="value" position="right" formatter={(v) => `${Number(v).toLocaleString()}`} fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Frame>
          <p className="chart-note">청록 = 세종시 제도 · 파랑 = 나라(주택도시기금) 제도 (단위: 만원, 연소득)</p>
        </Reveal>
        <Reveal>
          <Frame meta={SALE_META} table={SALE_VS_JEONSE.map((s) => ({ k: s.name, v: `${s.value}건` }))}>
            <ResponsiveContainer>
              <BarChart data={SALE_VS_JEONSE} margin={{ top: 20 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                  <Cell fill={C.blue} /><Cell fill={C.mint} />
                  <LabelList dataKey="value" position="top" formatter={(v) => `${v}건`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Frame>
        </Reveal>
        <Reveal delay={0.08}>
          <Frame meta={OUTFLOW_META} table={OUTFLOW.map((o) => ({ k: o.name, v: `−${o.value}명` }))}>
            <ResponsiveContainer>
              <BarChart data={OUTFLOW} layout="vertical" margin={{ left: 8, right: 56 }}>
                <XAxis type="number" domain={[0, 600]} hide />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" fill={C.peach} radius={6} isAnimationActive={false}>
                  <LabelList dataKey="value" position="right" formatter={(v) => `−${v}명`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Frame>
        </Reveal>
      </div>
    </>
  )
}

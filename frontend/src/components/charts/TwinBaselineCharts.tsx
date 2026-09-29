import { useEffect, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetchCompare } from '../../lib/api'
import type { CompareResult } from '../../types/domain'

/** FR11 / TR-B1: from the well's current state, project forward with the loop
 * enabled vs disabled and show the divergence — this is what actually
 * demonstrates the control loop is worth having, beyond "an event fired". */
export default function TwinBaselineCharts({ wellId }: { wellId: string }) {
  const [result, setResult] = useState<CompareResult | null>(null)

  useEffect(() => {
    let cancelled = false
    setResult(null)
    void fetchCompare(wellId).then((r) => {
      if (!cancelled) setResult(r)
    })
    return () => {
      cancelled = true
    }
  }, [wellId])

  if (!result) return <div className="p-3 font-mono text-xs text-hmi-dim">Projecting…</div>

  const merged = result.with_loop.series.map((p, i) => ({
    day: p.day,
    muLoop: p.mu_cp,
    muBase: result.baseline.series[i]?.mu_cp,
    outLoop: p.output,
    outBase: result.baseline.series[i]?.output,
  }))

  const { deltas } = result

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="grid grid-cols-4 gap-3 font-mono text-[11px] text-hmi-dim">
        <span>
          Cumulative &Delta;{' '}
          <span className={deltas.cumulative_bbl >= 0 ? 'text-hmi-green' : 'text-hmi-red'}>
            {deltas.cumulative_bbl >= 0 ? '+' : ''}
            {deltas.cumulative_bbl} bbl
          </span>
        </span>
        <span>
          Days in RED <span className="text-hmi-text">{deltas.days_in_red}</span>
        </span>
        <span>
          First RED (loop / base){' '}
          <span className="text-hmi-text">
            {deltas.first_red_day_with_loop ?? '—'} / {deltas.first_red_day_baseline ?? '—'}
          </span>
        </span>
        <span>
          Actions taken <span className="text-hmi-text">{deltas.actions_with_loop}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="px-1 font-mono text-[10px] uppercase tracking-wide text-hmi-dim">Viscosity — loop vs baseline</span>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={merged} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#232a36" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#6b7688' }} tickLine={false} axisLine={{ stroke: '#232a36' }} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7688' }} tickLine={false} axisLine={{ stroke: '#232a36' }} width={40} />
              <Tooltip contentStyle={{ background: '#10141b', border: '1px solid #232a36', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Line type="monotone" dataKey="muLoop" name="loop on" stroke="#35d0e0" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="muBase" name="baseline" stroke="#6b7688" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <span className="px-1 font-mono text-[10px] uppercase tracking-wide text-hmi-dim">Output — loop vs baseline</span>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={merged} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#232a36" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#6b7688' }} tickLine={false} axisLine={{ stroke: '#232a36' }} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7688' }} tickLine={false} axisLine={{ stroke: '#232a36' }} width={40} />
              <Tooltip contentStyle={{ background: '#10141b', border: '1px solid #232a36', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Line type="monotone" dataKey="outLoop" name="loop on" stroke="#22d17a" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="outBase" name="baseline" stroke="#6b7688" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

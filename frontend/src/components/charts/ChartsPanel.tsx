import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFieldStore } from '../../store/fieldStore'
import { fetchForecast, fetchHistory } from '../../lib/api'
import type { ForecastResult, HistoryPoint } from '../../types/domain'
import { HORIZON_DAYS } from '../../lib/constants'
import TwinBaselineCharts from './TwinBaselineCharts'

const MAX_POINTS = 600

interface ChartPoint {
  day: number
  T?: number
  mu?: number
  muCrit?: number
  out?: number
  R?: number
  muForecast?: number
  outForecast?: number
  RForecast?: number
}

interface Series {
  key: keyof ChartPoint
  color: string
  dashed?: boolean
  stepped?: boolean
}

function MiniChart({
  title,
  data,
  series,
  domain,
  refLine,
}: {
  title: string
  data: ChartPoint[]
  series: Series[]
  domain?: [number, number]
  refLine?: { y: number; label: string }
}) {
  return (
    <div className="flex flex-col">
      <span className="px-1 font-mono text-[10px] uppercase tracking-wide text-hmi-dim">{title}</span>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#232a36" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="day"
            type="number"
            domain={[0, HORIZON_DAYS]}
            tick={{ fontSize: 9, fill: '#6b7688' }}
            tickLine={false}
            axisLine={{ stroke: '#232a36' }}
          />
          <YAxis
            domain={domain ?? ['auto', 'auto']}
            tick={{ fontSize: 9, fill: '#6b7688' }}
            tickLine={false}
            axisLine={{ stroke: '#232a36' }}
            width={40}
          />
          <Tooltip
            contentStyle={{ background: '#10141b', border: '1px solid #232a36', fontSize: 11 }}
            labelFormatter={(v) => `day ${v}`}
          />
          {refLine && (
            <ReferenceLine y={refLine.y} stroke="#f5a524" strokeDasharray="4 4" label={{ value: refLine.label, fontSize: 9, fill: '#f5a524' }} />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type={s.stepped ? 'stepAfter' : 'monotone'}
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={1.5}
              strokeDasharray={s.dashed ? '4 3' : undefined}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function ChartsPanel() {
  const id = useFieldStore((s) => s.selectedWellId)
  const well = useFieldStore((s) => (s.selectedWellId ? s.wells[s.selectedWellId] : undefined))
  const simDay = useFieldStore((s) => s.simDay)
  const historyEpoch = useFieldStore((s) => s.historyEpoch)
  const [data, setData] = useState<ChartPoint[]>([])
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [view, setView] = useState<'history' | 'twin'>('history')

  // Re-fetch full server-side history whenever the well changes OR a reset/seek/step
  // pushes a fresh snapshot (historyEpoch) — today's/yesterday's in-memory points
  // would otherwise silently survive a reset.
  useEffect(() => {
    let cancelled = false
    setData([])
    if (!id) return
    void fetchHistory(id).then((history: HistoryPoint[]) => {
      if (cancelled) return
      const mapped = history.map((h) => ({ day: h.sim_day, T: h.T, mu: h.mu_cp, muCrit: h.mu_crit_cp, out: h.output, R: h.R }))
      setData(mapped.slice(-MAX_POINTS))
    })
    return () => {
      cancelled = true
    }
  }, [id, historyEpoch])

  useEffect(() => {
    if (!well || !id) return
    setData((prev) => {
      const point: ChartPoint = {
        day: Number(useFieldStore.getState().simDay.toFixed(2)),
        T: well.T,
        mu: well.mu,
        muCrit: well.muCrit,
        out: well.output,
        R: well.R,
      }
      if (prev.length && Math.abs(prev[prev.length - 1].day - point.day) < 0.01) return prev
      const next = [...prev, point]
      return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next
    })
  }, [well, id])

  // Forecast: re-fetch on well change or roughly once per sim day (cheap call, but
  // no need to hit it on every 250ms tick).
  const simDayFloor = Math.floor(simDay)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    void fetchForecast(id, 30).then((r) => {
      if (!cancelled) setForecast(r)
    })
    return () => {
      cancelled = true
    }
  }, [id, simDayFloor])

  const merged = useMemo<ChartPoint[]>(() => {
    const base = data.map((d) => ({ ...d }))
    if (!forecast || !forecast.series.length) return base
    const last = base[base.length - 1]
    const anchorDay = last ? last.day : forecast.series[0].day
    const anchor: ChartPoint = last
      ? { day: anchorDay, muForecast: last.mu, outForecast: last.out, RForecast: last.R }
      : { day: anchorDay, muForecast: forecast.series[0].mu_cp, outForecast: forecast.series[0].output, RForecast: forecast.series[0].R }
    const forward = forecast.series
      .filter((p) => p.day > anchorDay)
      .map((p) => ({ day: p.day, muForecast: p.mu_cp, outForecast: p.output, RForecast: p.R }))
    return [...base, anchor, ...forward]
  }, [data, forecast])

  const muDomain = useMemo<[number, number]>(() => {
    const values = merged.flatMap((d) => [d.mu, d.muCrit, d.muForecast].filter((v): v is number => v !== undefined))
    const max = values.length ? Math.max(...values) : 100
    return [0, Math.ceil((max * 1.15) / 100) * 100]
  }, [merged])

  if (!id || !well) {
    return <div className="p-3 font-mono text-xs text-hmi-dim">Select a well to see charts</div>
  }

  const thresholdDay = forecast?.threshold_day ?? null
  const alreadyCrossed = thresholdDay !== null && thresholdDay <= simDay + 0.5

  return (
    <div className="flex flex-col">
      <div className="flex gap-1 px-3 pt-2 font-mono text-[10px] uppercase">
        <button
          onClick={() => setView('history')}
          className={`rounded px-1.5 py-0.5 ${view === 'history' ? 'bg-hmi-accent/20 text-hmi-accent' : 'text-hmi-dim hover:bg-white/5'}`}
        >
          History
        </button>
        <button
          onClick={() => setView('twin')}
          className={`rounded px-1.5 py-0.5 ${view === 'twin' ? 'bg-hmi-accent/20 text-hmi-accent' : 'text-hmi-dim hover:bg-white/5'}`}
        >
          Twin vs Baseline
        </button>
      </div>
      {view === 'history' ? (
        <div className="flex flex-col gap-1 p-3">
          <div className="grid grid-cols-4 gap-3">
            <MiniChart
              title="Viscosity μ vs μ_crit (cP)"
              data={merged}
              domain={muDomain}
              series={[
                { key: 'mu', color: '#35d0e0' },
                { key: 'muCrit', color: '#f5a524', stepped: true },
                { key: 'muForecast', color: '#35d0e0', dashed: true },
              ]}
            />
            <MiniChart
              title="Temperature (°C)"
              data={merged}
              series={[{ key: 'T', color: '#f5a524' }]}
            />
            <MiniChart
              title="Output (bbl/day)"
              data={merged}
              series={[
                { key: 'out', color: '#22d17a' },
                { key: 'outForecast', color: '#22d17a', dashed: true },
              ]}
            />
            <MiniChart
              title="Risk ratio R"
              data={merged}
              domain={[0, 2]}
              refLine={{ y: 1, label: 'critical' }}
              series={[
                { key: 'R', color: '#ef4444' },
                { key: 'RForecast', color: '#ef4444', dashed: true },
              ]}
            />
          </div>
          <div className="px-1 font-mono text-[11px] text-hmi-dim">
            {alreadyCrossed ? (
              <span className="text-hmi-red">Rod-floating risk is already above threshold.</span>
            ) : thresholdDay !== null ? (
              <span className="text-hmi-amber">
                Rod-floating risk expected to cross threshold on day {thresholdDay.toFixed(1)}.
              </span>
            ) : (
              <span>No threshold crossing expected in the next 30 days.</span>
            )}
          </div>
        </div>
      ) : (
        <TwinBaselineCharts wellId={id} />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useFieldStore } from '../../store/fieldStore'
import { fetchRanking } from '../../lib/api'
import type { RankingRow } from '../../types/domain'
import { STATUS_TEXT_CLASS } from '../../lib/colors'

/** TR-R1: rank wells by projected days-to-RED at their current N, ties broken by
 * R then by output lost. Refreshed periodically rather than on every tick since
 * it's a forward-projection, not something that needs to track live state. */
export default function RankingTable() {
  const selectWell = useFieldStore((s) => s.selectWell)
  const selectedWellId = useFieldStore((s) => s.selectedWellId)
  const simDay = useFieldStore((s) => s.simDay)
  const [rows, setRows] = useState<RankingRow[]>([])
  // re-poll roughly every ~10 sim-days rather than every tick
  const pollBucket = Math.floor(simDay / 10)

  useEffect(() => {
    let cancelled = false
    void fetchRanking().then((r) => {
      if (!cancelled) setRows(r)
    })
    return () => {
      cancelled = true
    }
  }, [pollBucket])

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-1 px-1 font-mono text-[9px] uppercase tracking-wide text-hmi-dim">
        <span>#</span>
        <span>Well</span>
        <span>Days→RED</span>
        <span>R</span>
      </div>
      {rows.map((r) => (
        <button
          key={r.well_id}
          onClick={() => selectWell(r.well_id)}
          className={`grid grid-cols-[2rem_1fr_1fr_1fr] gap-1 rounded px-1 py-1 text-left font-mono text-[11px] ${
            selectedWellId === r.well_id ? 'bg-hmi-accent/15' : 'hover:bg-white/5'
          }`}
        >
          <span className="text-hmi-dim">{r.rank}</span>
          <span className="text-hmi-text">{r.well_id}</span>
          <span className={STATUS_TEXT_CLASS[r.status]}>{r.days_to_red === null ? '—' : r.days_to_red.toFixed(1)}</span>
          <span className="text-hmi-dim">{r.R.toFixed(2)}</span>
        </button>
      ))}
      {rows.length === 0 && <div className="px-1 font-mono text-[10px] text-hmi-dim">Loading…</div>}
    </div>
  )
}

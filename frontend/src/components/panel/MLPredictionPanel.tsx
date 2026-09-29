import { useEffect, useState } from 'react'
import { useFieldStore } from '../../store/fieldStore'
import { predictWell } from '../../lib/api'
import type { PredictResult } from '../../types/domain'

/** "What-if" preview (TR-M1 note): live state always comes from physics — this
 * panel just asks the trained regressor/classifier what THEY think, for the
 * well's current S/N/t_since_steam, as a sanity check on the ML layer. */
export default function MLPredictionPanel() {
  const id = useFieldStore((s) => s.selectedWellId)
  const well = useFieldStore((s) => (s.selectedWellId ? s.wells[s.selectedWellId] : undefined))
  const [result, setResult] = useState<PredictResult | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (!id || !well) return
    let cancelled = false
    const timer = setTimeout(() => {
      predictWell(id, { S: well.S, N: well.N, t_since_steam: well.tSinceSteam })
        .then((r) => {
          if (!cancelled) {
            setResult(r)
            setUnavailable(false)
          }
        })
        .catch(() => {
          if (!cancelled) setUnavailable(true)
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [id, well?.S, well?.N, well?.tSinceSteam])

  if (!id || !well) return null
  if (unavailable) {
    return (
      <div className="border-t border-hmi-border p-3 font-mono text-[10px] text-hmi-dim">
        ML models not trained yet — run <code>backend/train.py</code>.
      </div>
    )
  }
  if (!result) return null

  return (
    <div className="flex flex-col gap-1 border-t border-hmi-border p-3 font-mono text-[11px] text-hmi-dim">
      <span className="uppercase tracking-wide">ML what-if (current S/N)</span>
      <div className="grid grid-cols-2 gap-2">
        <span>
          Predicted output <span className="text-hmi-text">{result.output_pred} bbl/d</span>
        </span>
        <span>
          Rod-float risk <span className="text-hmi-text">{(result.risk_prob * 100).toFixed(1)}%</span>
        </span>
      </div>
      <span className="text-[10px]">Top drivers: {result.top_drivers.join(', ')}</span>
    </div>
  )
}

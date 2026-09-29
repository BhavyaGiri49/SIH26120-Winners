import { useEffect, useState } from 'react'
import { useFieldStore } from '../../store/fieldStore'
import { applyOptimization, optimizeWell } from '../../lib/api'
import type { OptimizeResult } from '../../types/domain'

export default function OptimizerPanel() {
  const id = useFieldStore((s) => s.selectedWellId)
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    setResult(null)
    setApplied(false)
  }, [id])

  if (!id) return null

  const run = async () => {
    setLoading(true)
    setApplied(false)
    try {
      setResult(await optimizeWell(id))
    } finally {
      setLoading(false)
    }
  }

  const apply = async () => {
    if (!result) return
    await applyOptimization(id, result.recommended.S, result.recommended.N)
    setApplied(true)
  }

  return (
    <div className="flex flex-col gap-2 border-t border-hmi-border p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wide text-hmi-dim">Optimizer</span>
        <button
          onClick={() => void run()}
          disabled={loading}
          className="rounded border border-hmi-accent/50 bg-hmi-accent/10 px-2 py-1 font-mono text-[10px] uppercase text-hmi-accent hover:bg-hmi-accent/20 disabled:opacity-40"
        >
          {loading ? 'Running…' : 'Run'}
        </button>
      </div>

      {result && (
        <div className="flex flex-col gap-1 font-mono text-[11px] text-hmi-dim">
          <div className="leading-relaxed">
            Current: <span className="text-hmi-text">{result.current.avg_output} bbl/day</span>,{' '}
            <span className="text-hmi-text">{(result.current.risk_share * 100).toFixed(0)}%</span> risk{' '}
            <span className="text-hmi-accent">→</span> Recommended: SPM{' '}
            <span className="text-hmi-green">{result.recommended.N}</span>, stroke{' '}
            <span className="text-hmi-green">{result.recommended.S}in</span>,{' '}
            <span className="text-hmi-green">{result.recommended.avg_output} bbl/day</span>,{' '}
            <span className="text-hmi-green">{(result.recommended.risk_share * 100).toFixed(0)}%</span> risk
            <span className="text-hmi-dim"> (cycle {result.recommended.cycle_days}d)</span>
          </div>
          <div>
            Extra output:{' '}
            <span className={result.delta_bbl_day >= 0 ? 'text-hmi-green' : 'text-hmi-red'}>
              {result.delta_bbl_day >= 0 ? '+' : ''}
              {result.delta_bbl_day} bbl/day
            </span>{' '}
            ≈{' '}
            <span className={result.delta_inr_day >= 0 ? 'text-hmi-green' : 'text-hmi-red'}>
              {result.delta_inr_day >= 0 ? '+' : ''}₹{Math.round(result.delta_inr_day).toLocaleString()}/day
            </span>
            <span className="text-[10px] italic"> ({result.note})</span>
          </div>
          {!result.recommended.constraint_satisfied && (
            <div className="text-[10px] text-hmi-amber">
              No combination met the {(result.max_risk_share * 100).toFixed(0)}% risk cap — showing the lowest-risk option found.
            </div>
          )}
          <button
            onClick={() => void apply()}
            disabled={applied}
            className="mt-1 rounded border border-hmi-green/50 bg-hmi-green/10 px-2 py-1 font-mono text-[10px] uppercase text-hmi-green hover:bg-hmi-green/20 disabled:opacity-40"
          >
            {applied ? 'Applied' : `Apply S=${result.recommended.S}in, N=${result.recommended.N}`}
          </button>
        </div>
      )}
    </div>
  )
}

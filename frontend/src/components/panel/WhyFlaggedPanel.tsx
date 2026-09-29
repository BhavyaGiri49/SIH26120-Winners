import { useFieldStore } from '../../store/fieldStore'

const N_MIN = 2.0 // mirrors backend physics.N_min (config.yaml)

export default function WhyFlaggedPanel() {
  const id = useFieldStore((s) => s.selectedWellId)
  const well = useFieldStore((s) => (s.selectedWellId ? s.wells[s.selectedWellId] : undefined))
  const history = useFieldStore((s) => (s.selectedWellId ? s.muHistory[s.selectedWellId] : undefined)) ?? []

  if (!id || !well) return null

  if (well.status === 'GREEN') {
    return (
      <div className="border-t border-hmi-border p-3 font-mono text-[11px] text-hmi-dim">
        <span className="uppercase tracking-wide text-hmi-green">Healthy</span> — no active risk drivers for {well.id}.
      </div>
    )
  }

  const pctOfCritical = well.muCrit > 0 ? Math.round((well.mu / well.muCrit) * 100) : 0
  const recent = history.slice(-6)
  const trend =
    recent.length >= 2 ? recent[recent.length - 1] - recent[0] : 0
  const trendLabel = trend > 20 ? 'rising' : trend < -20 ? 'falling' : 'steady'

  const spmCut = well.NInitial - well.N
  const atFloor = well.N <= N_MIN + 1e-9

  return (
    <div className="flex flex-col gap-1.5 border-t border-hmi-border p-3 font-mono text-[11px] text-hmi-dim">
      <span className="uppercase tracking-wide text-hmi-amber">Why flagged</span>
      <ul className="flex flex-col gap-1 list-disc pl-4">
        <li>
          Viscosity: <span className="text-hmi-text">{Math.round(well.mu).toLocaleString()} cP</span> —{' '}
          <span className="text-hmi-text">{pctOfCritical}%</span> of critical (
          {Math.round(well.muCrit).toLocaleString()} cP), {trendLabel}
        </li>
        <li>
          SPM: <span className="text-hmi-text">{well.N.toFixed(1)}</span>
          {spmCut > 0.05 ? (
            <> (cut from {well.NInitial.toFixed(1)}{atFloor ? ' — at floor' : ''})</>
          ) : (
            ' (at operator setting, no auto-cuts yet)'
          )}
        </li>
        <li>
          Days since steam: <span className="text-hmi-text">{well.tSinceSteam.toFixed(0)}</span> — reservoir has been
          cooling that whole time
        </li>
      </ul>
    </div>
  )
}

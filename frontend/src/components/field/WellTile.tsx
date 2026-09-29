import { useFieldStore } from '../../store/fieldStore'
import { STATUS_HEX } from '../../lib/colors'
import StatusBadge from '../common/StatusBadge'
import Sparkline from './Sparkline'

export default function WellTile({ id }: { id: string }) {
  const well = useFieldStore((s) => s.wells[id])
  const history = useFieldStore((s) => s.muHistory[id] ?? [])
  const selected = useFieldStore((s) => s.selectedWellId === id)
  const selectWell = useFieldStore((s) => s.selectWell)

  if (!well) return null

  return (
    <button
      onClick={() => selectWell(id)}
      className={`hmi-panel w-full rounded p-2 text-left transition-colors ${
        selected ? 'border-hmi-accent/60 ring-1 ring-hmi-accent/40' : 'hover:border-hmi-dim/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-hmi-text">
          {well.id}
          {well.waxRisk && (
            <span className="rounded bg-hmi-amber/20 px-1 py-0.5 text-[9px] font-semibold text-hmi-amber" title="Below wax threshold">
              WAX
            </span>
          )}
        </span>
        <StatusBadge status={well.status} />
      </div>
      <div className="mt-1 grid grid-cols-3 gap-x-2 font-mono text-[10px] text-hmi-dim">
        <span>
          μ <span className="text-hmi-text">{Math.round(well.mu).toLocaleString()}</span>
        </span>
        <span>
          N <span className="text-hmi-text">{well.N.toFixed(1)}</span>
        </span>
        <span>
          bbl/d <span className="text-hmi-text">{well.output.toFixed(0)}</span>
        </span>
      </div>
      <Sparkline data={history} color={STATUS_HEX[well.status]} />
    </button>
  )
}

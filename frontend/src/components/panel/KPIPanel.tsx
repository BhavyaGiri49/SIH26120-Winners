import { useFieldStore } from '../../store/fieldStore'
import StatusBadge from '../common/StatusBadge'

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded border border-hmi-border bg-hmi-panel-2 px-2 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-hmi-dim">{label}</span>
      <span className="font-mono text-sm text-hmi-text">
        {value}
        {unit && <span className="ml-1 text-hmi-dim">{unit}</span>}
      </span>
    </div>
  )
}

export default function KPIPanel() {
  const id = useFieldStore((s) => s.selectedWellId)
  const well = useFieldStore((s) => (s.selectedWellId ? s.wells[s.selectedWellId] : undefined))

  if (!id || !well) {
    return <div className="p-3 font-mono text-xs text-hmi-dim">Select a well</div>
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-lg font-semibold text-hmi-text">{well.id}</span>
        <StatusBadge status={well.status} />
      </div>
      <div className="font-mono text-[11px] text-hmi-dim">
        {well.phase === 'STEAMING' ? 'STEAMING — rod parked' : 'PRODUCING'}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Temperature" value={well.T.toFixed(1)} unit="°C" />
        <Stat label="Viscosity" value={Math.round(well.mu).toLocaleString()} unit="cP" />
        <Stat label="μ critical" value={Math.round(well.muCrit).toLocaleString()} unit="cP" />
        <Stat label="Risk ratio R" value={well.R.toFixed(2)} />
        <Stat label="Output" value={well.output.toFixed(1)} unit="bbl/d" />
        <Stat label="Cumulative" value={Math.round(well.cumOutput).toLocaleString()} unit="bbl" />
        <Stat label="SPM (N)" value={well.N.toFixed(1)} />
        <Stat label="Stroke (S)" value={well.S.toFixed(0)} unit="in" />
        <Stat label="Fluid level" value={well.fluidPct.toFixed(0)} unit="%" />
        <Stat label="Wax risk" value={well.waxRisk ? 'YES' : 'no'} />
      </div>
    </div>
  )
}

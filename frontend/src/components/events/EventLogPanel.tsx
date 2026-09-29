import { useFieldStore } from '../../store/fieldStore'
import type { Severity } from '../../types/domain'

const SEVERITY_CLASS: Record<Severity, string> = {
  INFO: 'text-hmi-dim',
  WARN: 'text-hmi-amber',
  ALARM: 'text-hmi-red',
}

export default function EventLogPanel() {
  const events = useFieldStore((s) => s.events)
  const reversed = [...events].reverse()

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-3 pb-2 font-mono text-[11px] leading-relaxed">
        {reversed.length === 0 && <div className="text-hmi-dim">No events yet.</div>}
        {reversed.map((e) => (
          <div key={e.id} className="flex gap-2 border-b border-white/5 py-0.5">
            <span className="text-hmi-dim">{e.day.toFixed(2)}</span>
            <span className="text-hmi-text">{e.wellId}</span>
            <span className={SEVERITY_CLASS[e.severity]}>{e.type}</span>
            <span className="flex-1 truncate text-hmi-dim">{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

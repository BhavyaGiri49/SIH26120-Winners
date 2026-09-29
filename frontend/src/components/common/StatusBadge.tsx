import type { Status } from '../../types/domain'
import { STATUS_BG_CLASS } from '../../lib/colors'

export default function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide">
      <span className={`status-dot ${STATUS_BG_CLASS[status]}`} style={{ boxShadow: `0 0 6px currentColor` }} />
      <span>{label ?? status}</span>
    </span>
  )
}

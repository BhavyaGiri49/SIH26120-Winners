import type { ReactNode } from 'react'
import { useUIStore } from '../../store/uiStore'

interface Props {
  id: string
  title: string
  children: ReactNode
  direction: 'horizontal' | 'vertical'
  expandedClass: string
  className?: string
}

/** A panel that collapses to a thin strip (width for 'horizontal' side panels,
 * height for 'vertical' top/bottom panels) instead of just hiding its content —
 * so collapsing it actually frees up screen space for the 3D view / neighbours,
 * and its own content area always scrolls rather than overflowing the shell. */
export default function CollapsibleSection({ id, title, children, direction, expandedClass, className = '' }: Props) {
  const collapsed = useUIStore((s) => s.collapsed[id] ?? false)
  const toggle = useUIStore((s) => s.toggle)

  if (direction === 'horizontal') {
    return (
      <div className={`hmi-panel flex flex-none flex-col border-hmi-border ${collapsed ? 'w-9' : expandedClass} transition-[width] duration-150 ${className}`}>
        <button
          onClick={() => toggle(id)}
          className="flex flex-none items-center justify-between gap-2 border-b border-hmi-border px-2 py-2 font-mono text-[10px] uppercase tracking-wide text-hmi-dim hover:text-hmi-text"
        >
          {collapsed ? (
            <span className="mx-auto rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">{title}</span>
          ) : (
            <>
              <span>{title}</span>
              <span>◂</span>
            </>
          )}
        </button>
        {!collapsed && <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>}
      </div>
    )
  }

  return (
    <div className={`hmi-panel flex flex-col border-t border-hmi-border ${collapsed ? 'h-9' : expandedClass} transition-[height] duration-150 ${className}`}>
      <button
        onClick={() => toggle(id)}
        className="flex flex-none items-center justify-between px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-hmi-dim hover:text-hmi-text"
      >
        <span>{title}</span>
        <span>{collapsed ? '▴' : '▾'}</span>
      </button>
      {!collapsed && <div className="min-h-0 flex-1 overflow-hidden">{children}</div>}
    </div>
  )
}

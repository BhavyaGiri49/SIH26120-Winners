import { useState } from 'react'
import { useFieldStore } from '../../store/fieldStore'
import QualitySelector from '../common/QualitySelector'
import AboutPanel from '../panel/AboutPanel'
import TimelineControls from './TimelineControls'
import DemoModeButton from './DemoModeButton'

export default function TopBar() {
  const connected = useFieldStore((s) => s.connected)
  const [aboutOpen, setAboutOpen] = useState(false)

  return (
    <header className="flex h-14 flex-none items-center gap-4 border-b border-hmi-border bg-hmi-panel px-4">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-hmi-accent shadow-[0_0_8px_var(--color-hmi-accent)]" />
        <span className="font-mono text-sm font-semibold tracking-wide text-hmi-text">DIGITAL TWIN — CSS &amp; SRP</span>
      </div>

      <div className="h-6 w-px bg-hmi-border" />

      <TimelineControls />

      {/* WS connection health, not simulation state — never phrased as an alarm.
          The persistent "Simulation — Not Connected to Field Equipment" banner
          below is the intentional, permanent disclaimer; this is just link status. */}
      <span className={`font-mono text-xs ${connected ? 'text-hmi-green' : 'text-hmi-amber'}`}>
        {connected ? '● LIVE' : '○ CONNECTING…'}
      </span>

      <DemoModeButton />

      <QualitySelector />

      <button
        onClick={() => setAboutOpen(true)}
        className="rounded border border-hmi-border px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-hmi-dim hover:bg-white/5 hover:text-hmi-text"
      >
        About
      </button>

      <div className="ml-auto rounded border border-hmi-amber/40 bg-hmi-amber/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-hmi-amber">
        Simulation — Not Connected to Field Equipment
      </div>

      {aboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}
    </header>
  )
}

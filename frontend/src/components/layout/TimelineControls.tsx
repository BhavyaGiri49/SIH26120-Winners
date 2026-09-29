import { useEffect, useRef, useState } from 'react'
import { useFieldStore } from '../../store/fieldStore'
import { simControl, simSeek, simStep } from '../../lib/api'
import { useDebouncedCallback } from '../../lib/useDebouncedCallback'
import { HORIZON_DAYS } from '../../lib/constants'

const SPEEDS = [0.5, 1, 2, 4, 8]

export default function TimelineControls() {
  const storeDay = useFieldStore((s) => s.simDay)
  const speed = useFieldStore((s) => s.speed)
  const paused = useFieldStore((s) => s.paused)

  const [localDay, setLocalDay] = useState(storeDay)
  const draggingRef = useRef(false)

  useEffect(() => {
    if (!draggingRef.current) setLocalDay(storeDay)
  }, [storeDay])

  const debouncedSeek = useDebouncedCallback((day: number) => void simSeek(day), 150)

  const setDay = (raw: number) => {
    const v = Math.max(0, Math.min(HORIZON_DAYS, raw))
    setLocalDay(v)
    debouncedSeek(v)
  }

  return (
    <div className="flex flex-1 items-center gap-3 font-mono text-xs text-hmi-dim">
      <button
        onClick={() => void simControl(paused ? 'play' : 'pause')}
        className="rounded border border-hmi-border px-2 py-1 text-hmi-text hover:bg-white/5"
      >
        {paused ? '▶ PLAY' : '⏸ PAUSE'}
      </button>
      <button
        onClick={() => void simStep(1)}
        className="rounded border border-hmi-border px-2 py-1 text-hmi-text hover:bg-white/5"
        title="Advance exactly one day, then pause"
      >
        ⏭ STEP
      </button>
      <button
        onClick={() => void simControl('reset')}
        className="rounded border border-hmi-border px-2 py-1 text-hmi-text hover:bg-white/5"
      >
        ⟲ RESET
      </button>

      <div className="flex flex-1 items-center gap-2">
        <span className="whitespace-nowrap">SIM DAY</span>
        <input
          type="range"
          min={0}
          max={HORIZON_DAYS}
          step={0.25}
          value={localDay}
          onPointerDown={() => {
            draggingRef.current = true
          }}
          onPointerUp={() => {
            draggingRef.current = false
            void simSeek(localDay)
          }}
          onChange={(e) => setDay(Number(e.target.value))}
          className="h-1 flex-1 accent-[#35d0e0]"
        />
        <input
          type="number"
          min={0}
          max={HORIZON_DAYS}
          step={0.5}
          value={Number(localDay.toFixed(1))}
          onChange={(e) => setDay(Number(e.target.value))}
          className="w-16 rounded border border-hmi-border bg-transparent px-1 py-0.5 text-right text-hmi-text"
        />
        <span>/ {HORIZON_DAYS}d</span>
      </div>

      <div className="flex items-center gap-1">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => void simControl('play', s)}
            className={`rounded px-1.5 py-0.5 ${
              speed === s ? 'bg-hmi-accent/20 text-hmi-accent' : 'hover:bg-white/5'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  )
}

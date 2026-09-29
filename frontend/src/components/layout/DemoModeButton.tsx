import { useEffect, useRef, useState } from 'react'
import { useFieldStore } from '../../store/fieldStore'
import { simControl } from '../../lib/api'

const HERO_WELL_ID = 'W01'

interface DemoCtx {
  status: string | undefined
  simDay: number
  spmCutCount: number
}

/** Story beats for the hero well, driven entirely by real simulation state — the
 * same physics every run, so it's safe to re-play and re-record. See engine.py's
 * HERO_OVERRIDES for the tuned trajectory this narrates. */
const STAGES: { text: string; test: (ctx: DemoCtx) => boolean }[] = [
  { text: `${HERO_WELL_ID} — healthy, fresh off steam. Watch viscosity climb as it cools.`, test: () => true },
  { text: 'Viscosity rising toward the critical threshold…', test: (c) => c.status === 'AMBER' || c.status === 'RED' },
  { text: 'RED — auto-control is cutting SPM to slow the rod and protect it.', test: (c) => c.status === 'RED' },
  {
    text: 'SPM cut applied — risk falling back below 1 without any manual steam job.',
    test: (c) => c.spmCutCount >= 1 && c.status !== 'RED',
  },
  { text: 'A second automatic cut keeps the well safe as it cools further.', test: (c) => c.spmCutCount >= 2 },
  {
    text: 'Demo complete — auto-control kept the well producing the whole cycle.',
    test: (c) => c.spmCutCount >= 2 && c.simDay >= 88,
  },
]

export default function DemoModeButton() {
  const [active, setActive] = useState(false)
  const [stageIdx, setStageIdx] = useState(0)
  const startedRef = useRef(false)

  const simDay = useFieldStore((s) => s.simDay)
  const status = useFieldStore((s) => s.wells[HERO_WELL_ID]?.status)
  const spmCutCount = useFieldStore(
    (s) => s.events.filter((e) => e.wellId === HERO_WELL_ID && e.type === 'SPM_REDUCED').length,
  )
  const selectWell = useFieldStore((s) => s.selectWell)

  useEffect(() => {
    if (!active || !startedRef.current) return
    const ctx: DemoCtx = { status, simDay, spmCutCount }
    setStageIdx((idx) => {
      let next = idx
      while (next < STAGES.length - 1 && STAGES[next + 1].test(ctx)) next++
      return next
    })
  }, [active, status, simDay, spmCutCount])

  const start = async () => {
    setActive(true)
    setStageIdx(0)
    startedRef.current = false
    await simControl('reset')
    selectWell(HERO_WELL_ID)
    startedRef.current = true
    await simControl('play', 1)
  }

  const stop = () => {
    setActive(false)
    startedRef.current = false
  }

  return (
    <>
      <button
        onClick={() => void (active ? stop() : start())}
        className={`rounded border px-2 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
          active
            ? 'border-hmi-accent/60 bg-hmi-accent/20 text-hmi-accent'
            : 'border-hmi-border text-hmi-dim hover:bg-white/5 hover:text-hmi-text'
        }`}
      >
        {active ? '■ Stop Demo' : '▶ Demo Mode'}
      </button>

      {active && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-[min(90%,560px)] -translate-x-1/2 rounded border border-hmi-accent/40 bg-black/80 px-4 py-3 text-center font-mono text-sm text-hmi-text shadow-lg backdrop-blur-sm">
          {STAGES[stageIdx].text}
        </div>
      )}
    </>
  )
}

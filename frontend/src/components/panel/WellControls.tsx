import { useEffect, useState } from 'react'
import { useFieldStore } from '../../store/fieldStore'
import { patchWell, steamNow } from '../../lib/api'
import { useDebouncedCallback } from '../../lib/useDebouncedCallback'

const S_RANGE = { min: 64, max: 144, step: 4 }
const N_RANGE = { min: 2, max: 8, step: 0.5 }
const T_PEAK_RANGE = { min: 160, max: 200, step: 5 }

export default function WellControls() {
  const id = useFieldStore((s) => s.selectedWellId)
  const well = useFieldStore((s) => (s.selectedWellId ? s.wells[s.selectedWellId] : undefined))
  const patchWellLocal = useFieldStore((s) => s.patchWellLocal)

  const [localS, setLocalS] = useState(well?.S ?? 100)
  const [localN, setLocalN] = useState(well?.N ?? 6)
  const [localTPeak, setLocalTPeak] = useState(180)

  useEffect(() => {
    if (well) {
      setLocalS(well.S)
      setLocalN(well.N)
      setLocalTPeak(well.TPeak)
    }
  }, [well?.id])

  const debouncedPatchS = useDebouncedCallback((value: number) => {
    if (id) void patchWell(id, { S: value })
  }, 150)
  const debouncedPatchN = useDebouncedCallback((value: number) => {
    if (id) void patchWell(id, { N: value })
  }, 150)
  const debouncedPatchTPeak = useDebouncedCallback((value: number) => {
    if (id) void patchWell(id, { T_peak: value })
  }, 150)

  if (!id || !well) return null

  const atFloor = well.N <= N_RANGE.min + 1e-9

  return (
    <div className="flex flex-col gap-3 border-t border-hmi-border p-3">
      <div className="font-mono text-[11px] uppercase tracking-wide text-hmi-dim">Controls</div>

      <label className="flex flex-col gap-1">
        <span className="flex justify-between font-mono text-[11px] text-hmi-dim">
          <span>Stroke length S</span>
          <span className="text-hmi-text">{localS.toFixed(0)} in</span>
        </span>
        <input
          type="range"
          min={S_RANGE.min}
          max={S_RANGE.max}
          step={S_RANGE.step}
          value={localS}
          onChange={(e) => {
            const v = Number(e.target.value)
            setLocalS(v)
            patchWellLocal(id, { S: v })
            debouncedPatchS(v)
          }}
          className="accent-[#35d0e0]"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="flex justify-between font-mono text-[11px] text-hmi-dim">
          <span>SPM N</span>
          <span className="text-hmi-text">{localN.toFixed(1)}</span>
        </span>
        <input
          type="range"
          min={N_RANGE.min}
          max={N_RANGE.max}
          step={N_RANGE.step}
          value={localN}
          onChange={(e) => {
            const v = Number(e.target.value)
            setLocalN(v)
            patchWellLocal(id, { N: v })
            debouncedPatchN(v)
          }}
          className="accent-[#35d0e0]"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="flex justify-between font-mono text-[11px] text-hmi-dim">
          <span>Peak steam temperature</span>
          <span className="text-hmi-text">{localTPeak.toFixed(0)} °C</span>
        </span>
        <input
          type="range"
          min={T_PEAK_RANGE.min}
          max={T_PEAK_RANGE.max}
          step={T_PEAK_RANGE.step}
          value={localTPeak}
          onChange={(e) => {
            const v = Number(e.target.value)
            setLocalTPeak(v)
            debouncedPatchTPeak(v)
          }}
          className="accent-[#35d0e0]"
        />
        <span className="font-mono text-[10px] italic text-hmi-dim">
          Takes effect on the well's next steam injection.
        </span>
      </label>

      <button
        onClick={() => {
          const v = !well.loopEnabled
          patchWellLocal(id, { loopEnabled: v })
          void patchWell(id, { loop_enabled: v })
        }}
        className={`flex items-center justify-between rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
          well.loopEnabled
            ? 'border-hmi-green/50 bg-hmi-green/10 text-hmi-green hover:bg-hmi-green/20'
            : 'border-hmi-border text-hmi-dim hover:bg-white/5'
        }`}
      >
        <span>Auto-control (SPM reduction)</span>
        <span>{well.loopEnabled ? 'ON' : 'OFF'}</span>
      </button>

      {atFloor && well.status !== 'GREEN' && (
        <div className="rounded border border-hmi-red/40 bg-hmi-red/10 px-2 py-1.5 font-mono text-[10px] text-hmi-red">
          At SPM floor — auto-control can't cut further. Re-steam recommended.
        </div>
      )}

      <button
        onClick={() => void steamNow(id)}
        disabled={well.phase === 'STEAMING'}
        className="rounded border border-hmi-amber/50 bg-hmi-amber/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-hmi-amber transition-colors hover:bg-hmi-amber/20 disabled:opacity-40"
      >
        {well.phase === 'STEAMING' ? 'Steaming…' : 'Restart Steam Injection'}
      </button>
    </div>
  )
}

import { useQualityStore, type QualityTier } from '../../store/qualityStore'

const TIERS: QualityTier[] = ['low', 'medium', 'high']

export default function QualitySelector() {
  const tier = useQualityStore((s) => s.tier)
  const setTier = useQualityStore((s) => s.setTier)

  return (
    <div className="flex items-center gap-1 font-mono text-[11px] text-hmi-dim">
      <span className="mr-1 uppercase tracking-wide">Quality</span>
      {TIERS.map((t) => (
        <button
          key={t}
          onClick={() => setTier(t)}
          className={`rounded px-2 py-0.5 uppercase transition-colors ${
            t === tier ? 'bg-hmi-accent/20 text-hmi-accent' : 'hover:bg-white/5'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type QualityTier = 'high' | 'medium' | 'low'

interface QualityStore {
  tier: QualityTier
  setTier: (tier: QualityTier) => void
}

function detectDefaultTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'medium'
  const cores = navigator.hardwareConcurrency ?? 4
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1024
  if (cores <= 4 || isSmallScreen) return 'medium'
  return 'high'
}

export const useQualityStore = create<QualityStore>()(
  persist(
    (set) => ({
      tier: detectDefaultTier(),
      setTier: (tier) => set({ tier }),
    }),
    { name: 'digital-twin-quality' },
  ),
)

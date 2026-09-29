import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  collapsed: Record<string, boolean>
  toggle: (id: string) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      collapsed: {},
      toggle: (id) => set((s) => ({ collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } })),
    }),
    { name: 'digital-twin-ui' },
  ),
)

import { create } from 'zustand'
import {
  type EventItem,
  type FieldSnapshotResponse,
  type RawCompactEvent,
  type SnapshotPayload,
  type TickPayload,
  type WellSummary,
  normalizeEvent,
  summaryFromCompact,
  summaryFromFull,
} from '../types/domain'
import { setTelemetry, telemetryRef } from './telemetryRef'

const MAX_EVENTS = 300
const SPARKLINE_POINTS = 24

interface FieldStore {
  connected: boolean
  simDay: number
  speed: number
  paused: boolean
  wells: Record<string, WellSummary>
  wellOrder: string[]
  muHistory: Record<string, number[]>
  selectedWellId: string | null
  events: EventItem[]
  /** Bumped on every full snapshot (initial connect, reset, seek, step). ChartsPanel
   * depends on this to know when to re-fetch a well's server-side history rather
   * than trusting its own incrementally-appended points. */
  historyEpoch: number

  setConnected: (v: boolean) => void
  applySnapshot: (payload: SnapshotPayload | FieldSnapshotResponse) => void
  applyTick: (payload: TickPayload) => void
  addRawEvents: (events: RawCompactEvent[]) => void
  selectWell: (id: string) => void
  patchWellLocal: (id: string, partial: Partial<WellSummary>) => void
}

export const useFieldStore = create<FieldStore>((set, get) => ({
  connected: false,
  simDay: 0,
  speed: 1,
  paused: false,
  wells: {},
  wellOrder: [],
  muHistory: {},
  selectedWellId: null,
  events: [],
  historyEpoch: 0,

  setConnected: (v) => set({ connected: v }),

  applySnapshot: (payload) => {
    const wells: Record<string, WellSummary> = {}
    const muHistory: Record<string, number[]> = {}
    for (const w of payload.wells) {
      const summary = summaryFromFull(w)
      wells[summary.id] = summary
      muHistory[summary.id] = [summary.mu]
      setTelemetry(summary.id, summary)
    }
    const wellOrder = Object.keys(wells).sort()
    const rawEvents = 'events' in payload ? payload.events : []
    const events = rawEvents.map(normalizeEvent).sort((a, b) => a.id - b.id).slice(-MAX_EVENTS)
    set((state) => ({
      wells,
      wellOrder,
      muHistory,
      simDay: payload.sim_day,
      speed: payload.speed,
      paused: payload.paused,
      selectedWellId: state.selectedWellId && wells[state.selectedWellId] ? state.selectedWellId : wellOrder[0] ?? null,
      events,
      historyEpoch: state.historyEpoch + 1,
    }))
  },

  applyTick: (payload) => {
    const prevWells = get().wells
    const prevHistory = get().muHistory
    const wells: Record<string, WellSummary> = { ...prevWells }
    const muHistory: Record<string, number[]> = { ...prevHistory }

    for (const w of payload.wells) {
      const summary = summaryFromCompact(w, prevWells[w.id])
      wells[w.id] = summary
      setTelemetry(w.id, summary)
      const hist = prevHistory[w.id] ?? []
      const nextHist = [...hist, summary.mu]
      if (nextHist.length > SPARKLINE_POINTS) nextHist.shift()
      muHistory[w.id] = nextHist
    }

    set({
      wells,
      muHistory,
      simDay: payload.sim_day,
      speed: payload.speed,
      paused: payload.paused,
    })
    if (payload.events.length) get().addRawEvents(payload.events)
  },

  addRawEvents: (raw) => {
    const normalized = raw.map(normalizeEvent)
    set((state) => {
      const seen = new Set(state.events.map((e) => e.id))
      const merged = [...state.events]
      for (const e of normalized) {
        if (!seen.has(e.id)) {
          merged.push(e)
          seen.add(e.id)
        }
      }
      merged.sort((a, b) => a.id - b.id)
      return { events: merged.slice(-MAX_EVENTS) }
    })
  },

  selectWell: (id) => set({ selectedWellId: id }),

  patchWellLocal: (id, partial) =>
    set((state) => {
      const existing = state.wells[id]
      if (!existing) return state
      const updated = { ...existing, ...partial }
      setTelemetry(id, updated)
      return { wells: { ...state.wells, [id]: updated } }
    }),
}))

export function lastEventId(): number {
  const events = useFieldStore.getState().events
  return events.length ? events[events.length - 1].id : 0
}

export { telemetryRef }

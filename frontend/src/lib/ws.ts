import { useFieldStore, lastEventId } from '../store/fieldStore'
import type { EventType, FieldSnapshotResponse, Severity, SnapshotPayload, TickPayload } from '../types/domain'

const MAX_BACKOFF_MS = 8000

let socket: WebSocket | null = null
let backoffMs = 500
let intentionallyClosed = false

function wsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws`
}

async function resync(): Promise<void> {
  try {
    const fieldRes = await fetch('/api/field')
    const field: FieldSnapshotResponse = await fieldRes.json()
    useFieldStore.getState().applySnapshot(field)

    const since = lastEventId()
    const eventsRes = await fetch(`/api/events?since_id=${since}`)
    const events = await eventsRes.json()
    if (Array.isArray(events) && events.length) {
      useFieldStore.getState().addRawEvents(
        events.map((e: { event_id: number; sim_day: number; well_id: string; type: EventType; severity: Severity; message: string }) => ({
          id: e.event_id,
          day: e.sim_day,
          w: e.well_id,
          t: e.type,
          sev: e.severity,
          msg: e.message,
        })),
      )
    }
  } catch (err) {
    console.error('resync failed', err)
  }
}

export function connectSocket(): void {
  intentionallyClosed = false
  socket = new WebSocket(wsUrl())

  socket.onopen = () => {
    backoffMs = 500
    useFieldStore.getState().setConnected(true)
  }

  socket.onmessage = (ev) => {
    const data = JSON.parse(ev.data) as SnapshotPayload | TickPayload
    if (data.type === 'snapshot') {
      useFieldStore.getState().applySnapshot(data)
    } else if (data.type === 'tick') {
      useFieldStore.getState().applyTick(data)
    }
  }

  socket.onclose = () => {
    useFieldStore.getState().setConnected(false)
    if (intentionallyClosed) return
    setTimeout(() => {
      void resync().then(connectSocket)
    }, backoffMs)
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS)
  }

  socket.onerror = () => {
    socket?.close()
  }
}

export function disconnectSocket(): void {
  intentionallyClosed = true
  socket?.close()
}

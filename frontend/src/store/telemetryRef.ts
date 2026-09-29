import type { WellSummary } from '../types/domain'

/**
 * Plain mutable cache written directly by the WS handler on every tick (4Hz),
 * deliberately NOT React state. The 3D scene's useFrame (running at render fps,
 * ~60Hz) reads this every frame so rod motion / colors / fluid level respond
 * immediately to new telemetry without going through a React re-render — this is
 * what makes an SPM cut visibly slow the rod within one tick.
 */
export const telemetryRef: Record<string, WellSummary> = {}

export function setTelemetry(id: string, summary: WellSummary): void {
  telemetryRef[id] = summary
}

/** Shared, mutable pumpjack motion state — written once per frame by PumpjackRig's
 * driver useFrame, read by CasingCutaway/DownholePump so the surface beam and the
 * downhole rod stay in lockstep without each maintaining its own phase integrator.
 * Same "module-level mutable ref" pattern as telemetryRef, for the same reason:
 * zero React re-renders on every animation frame. */
export interface PumpMotionState {
  phase: number
  angle: number
  strokeFrac: number
  amplitude: number
  running: boolean
}

export const pumpMotion: PumpMotionState = {
  phase: 0,
  angle: 0,
  strokeFrac: 0.5,
  amplitude: 0.32,
  running: false,
}

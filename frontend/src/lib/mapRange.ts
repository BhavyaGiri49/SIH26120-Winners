export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = (value - inMin) / (inMax - inMin)
  const clamped = Math.min(1, Math.max(0, t))
  return outMin + clamped * (outMax - outMin)
}

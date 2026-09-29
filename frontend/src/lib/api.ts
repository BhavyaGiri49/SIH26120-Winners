export async function patchWell(
  id: string,
  body: { S?: number; N?: number; loop_enabled?: boolean; T_peak?: number },
) {
  await fetch(`/api/wells/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function steamNow(id: string) {
  await fetch(`/api/wells/${id}/steam`, { method: 'POST' })
}

export async function simControl(action: 'play' | 'pause' | 'reset', speed?: number) {
  await fetch('/api/sim/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, speed }),
  })
}

export async function simSeek(day: number) {
  await fetch('/api/sim/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'seek', day }),
  })
}

export async function simStep(stepDays = 1) {
  await fetch('/api/sim/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'step', step_days: stepDays }),
  })
}

export async function fetchHistory(id: string) {
  const res = await fetch(`/api/wells/${id}/history`)
  return res.json()
}

export async function optimizeWell(id: string, maxRiskShare?: number): Promise<import('../types/domain').OptimizeResult> {
  const res = await fetch(`/api/wells/${id}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_risk_share: maxRiskShare }),
  })
  return res.json()
}

export async function applyOptimization(id: string, S: number, N: number) {
  await fetch(`/api/wells/${id}/optimize/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ S, N }),
  })
}

export async function predictWell(
  id: string,
  body: { S: number; N: number; t_since_steam: number },
): Promise<import('../types/domain').PredictResult> {
  const res = await fetch(`/api/wells/${id}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`predict failed: ${res.status}`)
  return res.json()
}

export async function fetchModelsMetrics(): Promise<import('../types/domain').ModelsMetricsResponse> {
  const res = await fetch('/api/models/metrics')
  return res.json()
}

export async function fetchRanking(): Promise<import('../types/domain').RankingRow[]> {
  const res = await fetch('/api/ranking')
  return res.json()
}

export async function fetchCompare(id: string): Promise<import('../types/domain').CompareResult> {
  const res = await fetch(`/api/wells/${id}/compare`)
  return res.json()
}

export async function fetchForecast(id: string, horizonDays = 30): Promise<import('../types/domain').ForecastResult> {
  const res = await fetch(`/api/wells/${id}/forecast?horizon_days=${horizonDays}`)
  return res.json()
}

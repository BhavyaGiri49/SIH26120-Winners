// Mirrors backend/app/models.py + the WS/REST payload shapes in app/engine.py & api/*.

export type Phase = 'PRODUCING' | 'STEAMING'
export type Status = 'GREEN' | 'AMBER' | 'RED'
export type Severity = 'INFO' | 'WARN' | 'ALARM'
export type EventType =
  | 'SPM_REDUCED'
  | 'RISK_AMBER'
  | 'RISK_RED'
  | 'RISK_CLEARED'
  | 'WAX_RISK'
  | 'RESTEAM_RECOMMENDED'
  | 'STEAM_INJECTED'
  | 'OPTIMIZER_APPLIED'
  | 'USER_CHANGE'

export interface WellConfig {
  well_id: string
  T_peak: number
  tau: number
  S: number
  N: number
  N_initial: number
  loop_enabled: boolean
}

export interface WellStateFull {
  well_id: string
  sim_day: number
  t_since_steam: number
  phase: Phase
  T: number
  mu_cp: number
  mu_crit_cp: number
  q_inflow: number
  Q_pump: number
  output: number
  v_terminal: number
  v_required: number
  R: number
  status: Status
  rod_float: boolean
  wax_risk: boolean
  risk_prob: number
  fluid_level_pct: number
  cum_output: number
}

export interface WellFull {
  config: WellConfig
  state: WellStateFull
}

/** Compact per-tick well entry as streamed over /ws (short keys, ~110-130 bytes each). */
export interface WellCompact {
  id: string
  ph: 'P' | 'S'
  st: Status
  T: number
  mu: number
  mc: number
  N: number
  N0: number
  S: number
  tp: number
  out: number
  R: number
  fl: number
  rf: boolean
  wx: boolean
  cum: number
  tss: number
}

/** Flattened, UI-friendly well record kept in the zustand store. */
export interface WellSummary {
  id: string
  phase: Phase
  status: Status
  T: number
  mu: number
  muCrit: number
  N: number
  NInitial: number
  S: number
  TPeak: number
  output: number
  R: number
  fluidPct: number
  rodFloat: boolean
  waxRisk: boolean
  cumOutput: number
  loopEnabled: boolean
  tSinceSteam: number
}

export interface EventItem {
  id: number
  day: number
  wellId: string
  type: EventType
  severity: Severity
  message: string
}

export interface HistoryPoint {
  sim_day: number
  T: number
  mu_cp: number
  mu_crit_cp: number
  output: number
  R: number
}

export interface ForecastPoint {
  day: number
  mu_cp: number
  output: number
  R: number
}

export interface ForecastResult {
  series: ForecastPoint[]
  threshold_day: number | null
  note: string | null
}

export interface TickPayload {
  type: 'tick'
  sim_day: number
  speed: number
  paused: boolean
  wells: WellCompact[]
  events: RawCompactEvent[]
}

export interface SnapshotPayload {
  type: 'snapshot'
  sim_day: number
  speed: number
  paused: boolean
  wells: WellFull[]
  events: RawCompactEvent[]
}

export interface RawCompactEvent {
  id: number
  day: number
  w: string
  t: EventType
  sev: Severity
  msg: string
}

export interface FieldSnapshotResponse {
  sim_day: number
  speed: number
  paused: boolean
  wells: WellFull[]
}

export function normalizeEvent(e: RawCompactEvent): EventItem {
  return { id: e.id, day: e.day, wellId: e.w, type: e.t, severity: e.sev, message: e.msg }
}

export function summaryFromFull(w: WellFull): WellSummary {
  return {
    id: w.config.well_id,
    phase: w.state.phase,
    status: w.state.status,
    T: w.state.T,
    mu: w.state.mu_cp,
    muCrit: w.state.mu_crit_cp,
    N: w.state.phase === 'STEAMING' ? 0 : w.config.N,
    NInitial: w.config.N_initial,
    S: w.config.S,
    TPeak: w.config.T_peak,
    output: w.state.output,
    R: w.state.R,
    fluidPct: w.state.fluid_level_pct,
    rodFloat: w.state.rod_float,
    waxRisk: w.state.wax_risk,
    cumOutput: w.state.cum_output,
    loopEnabled: w.config.loop_enabled,
    tSinceSteam: w.state.t_since_steam,
  }
}

export interface OptimizeResult {
  current: { avg_output: number; risk_share: number }
  recommended: {
    avg_output: number
    risk_share: number
    cycle_days: number
    T_peak: number
    steam_volume_index: number
    S: number
    N: number
    constraint_satisfied: boolean
  }
  delta_bbl_day: number
  delta_inr_day: number
  max_risk_share: number
  note: string
}

export interface PredictResult {
  output_pred: number
  risk_prob: number
  top_drivers: string[]
}

export interface ModelMetricsBlock {
  features: string[]
  target: string
  r2?: number
  recall?: number
  roc_auc?: number
  pass_bar: number
  passed: boolean
  feature_importances: Record<string, number>
}

export interface ModelsMetrics {
  trained_at: string
  elapsed_s: number
  n_rows: number
  n_wells_train: number
  n_wells_test: number
  regressor: ModelMetricsBlock
  classifier: ModelMetricsBlock
}

export interface ModelsMetricsResponse {
  available: boolean
  metrics: ModelsMetrics | null
}

export interface RankingRow {
  well_id: string
  days_to_red: number | null
  R: number
  status: Status
  output_lost: number
  output: number
  rank: number
}

export interface CompareSeriesPoint {
  day: number
  mu_cp: number
  output: number
  R: number
  N: number
}

export interface CompareBranch {
  series: CompareSeriesPoint[]
  cumulative_bbl: number
  days_in_red: number
  first_red_day: number | null
  actions: number
}

export interface CompareResult {
  with_loop: CompareBranch
  baseline: CompareBranch
  deltas: {
    cumulative_bbl: number
    days_in_red: number
    first_red_day_with_loop: number | null
    first_red_day_baseline: number | null
    actions_with_loop: number
  }
}

export function summaryFromCompact(w: WellCompact, prev?: WellSummary): WellSummary {
  return {
    id: w.id,
    phase: w.ph === 'S' ? 'STEAMING' : 'PRODUCING',
    status: w.st,
    T: w.T,
    mu: w.mu,
    muCrit: w.mc,
    N: w.N,
    NInitial: w.N0,
    S: w.S,
    TPeak: w.tp,
    output: w.out,
    R: w.R,
    fluidPct: w.fl,
    rodFloat: w.rf,
    waxRisk: w.wx,
    cumOutput: w.cum,
    loopEnabled: prev?.loopEnabled ?? true,
    tSinceSteam: w.tss,
  }
}

"""Pydantic data model — TRD §5. Four entities: WellConfig, WellState, TelemetryPoint,
Event. TS types on the frontend mirror these by hand (kept in sync manually for
Phase 1; generating from the OpenAPI schema is a later-phase nicety)."""
from enum import Enum
from typing import Dict

from pydantic import BaseModel


class Phase(str, Enum):
    PRODUCING = "PRODUCING"
    STEAMING = "STEAMING"


class Status(str, Enum):
    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"


class Severity(str, Enum):
    INFO = "INFO"
    WARN = "WARN"
    ALARM = "ALARM"


class EventType(str, Enum):
    SPM_REDUCED = "SPM_REDUCED"
    RISK_AMBER = "RISK_AMBER"
    RISK_RED = "RISK_RED"
    RISK_CLEARED = "RISK_CLEARED"
    WAX_RISK = "WAX_RISK"
    RESTEAM_RECOMMENDED = "RESTEAM_RECOMMENDED"
    STEAM_INJECTED = "STEAM_INJECTED"
    OPTIMIZER_APPLIED = "OPTIMIZER_APPLIED"
    USER_CHANGE = "USER_CHANGE"


class WellConfig(BaseModel):
    well_id: str
    T_peak: float
    tau: float
    S: float
    N: float
    N_initial: float
    loop_enabled: bool = True


class WellState(BaseModel):
    well_id: str
    sim_day: float
    t_since_steam: float
    phase: Phase
    T: float
    mu_cp: float
    mu_crit_cp: float
    q_inflow: float
    Q_pump: float
    output: float
    v_terminal: float
    v_required: float
    R: float
    status: Status
    rod_float: bool
    wax_risk: bool
    risk_prob: float = 0.0  # ML stub — always 0 in Phase 1, wired up in a later phase
    fluid_level_pct: float
    cum_output: float


class HistoryPoint(BaseModel):
    sim_day: float
    T: float
    mu_cp: float
    mu_crit_cp: float
    output: float
    R: float


class Event(BaseModel):
    event_id: int
    ts_wall: str
    sim_day: float
    well_id: str
    type: EventType
    severity: Severity
    message: str
    payload: Dict = {}


class WellSnapshot(BaseModel):
    """Combined config + state, as returned by GET /api/field and WS snapshot."""

    config: WellConfig
    state: WellState

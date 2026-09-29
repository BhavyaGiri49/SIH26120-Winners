"""Typed configuration loaded from config.yaml (TRD §4 / NFR-9: every constant editable
without code changes)."""
from pathlib import Path
from typing import Tuple

import yaml
from pydantic import BaseModel


class SimClockConfig(BaseModel):
    dt_days: float
    tick_ms: int
    speed_min: float
    speed_max: float
    speed_default: float
    horizon_days: float


class PhysicsConfig(BaseModel):
    T_base: float
    T_peak_range: Tuple[float, float]
    tau_range: Tuple[float, float]
    visc_A: float
    visc_B: float
    dP_psi: float
    J_default: float
    J_prd_literal: float
    S_range: Tuple[float, float]
    N_range: Tuple[float, float]
    N_min: float
    A_p_in2: float
    E_v: float
    rho_rod: float
    rho_fluid: float
    g: float
    d_rod_m: float
    R_amber: float
    R_red: float
    T_wax: float
    steam_downtime_days: float
    cycle_days: float
    noise_pct: float


class ControlLoopConfig(BaseModel):
    loop_trigger: str
    spm_step: float
    loop_cooldown_days: float
    auto_resteam: bool
    enabled_default: bool


class EconomicsConfig(BaseModel):
    oil_price_inr: float


class VisualConfig(BaseModel):
    rod_speed_visual_multiplier: float


class SimConfig(BaseModel):
    seed: int
    n_wells: int
    sim_clock: SimClockConfig
    physics: PhysicsConfig
    control_loop: ControlLoopConfig
    economics: EconomicsConfig
    visual: VisualConfig


def load_config(path: str = None) -> SimConfig:
    if path is None:
        path = Path(__file__).resolve().parent.parent / "config.yaml"
    with open(path, "r") as f:
        raw = yaml.safe_load(f)
    return SimConfig(**raw)

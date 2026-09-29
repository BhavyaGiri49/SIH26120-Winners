"""Pure, stateless physics functions (TRD §6.1-6.5 / TR-P1..TR-P4).

Every formula here is pinned against the TRD's Section 2 reference values (±1%).
Unit conversions (°C->K, cP->Pa·s, in->m) happen ONLY inside these functions.
No I/O, no config object, no simulation state — these are reused as-is by the
engine's tick loop and (later) the optimizer/ML dataset generator.
"""
import math
from typing import Union

import numpy as np

Number = Union[float, np.ndarray]

IN_TO_M = 0.0254
C_TO_K = 273.15

# Calibrated so pump_capacity(100, 6) == 134.9 bbl/day exactly (the TRD's one
# pinned reference point) rather than hardcoding a rounded constant.
_PUMP_K = 134.9 / (100.0 * 6.0 * 2.41 * 0.8)


def temperature(t_days: Number, T_peak: float, tau_days: float, T_base: float = 50.0) -> Number:
    """Exponential cool-down from T_peak toward T_base with time constant tau_days."""
    return T_base + (T_peak - T_base) * np.exp(-np.asarray(t_days) / tau_days)


def viscosity_cp(T_celsius: Number, visc_A: float = 1.16e-6, visc_B: float = 7434.0) -> Number:
    """Arrhenius-style viscosity law. T in °C, converted to K internally."""
    T_kelvin = np.asarray(T_celsius) + C_TO_K
    return visc_A * np.exp(visc_B / T_kelvin)


def inflow(mu_cp: Number, dP_psi: float, J: float) -> Number:
    """Productivity-index inflow: q = J * dP / mu."""
    return J * dP_psi / np.asarray(mu_cp)


def pump_capacity(S_in: Number, N_spm: Number, A_p_in2: float = 2.41, E_v: float = 0.8) -> Number:
    """Surface-controlled pump displacement capacity, calibrated to the TRD's
    pinned point Q_pump(100, 6) = 134.9 bbl/day."""
    return np.asarray(S_in) * np.asarray(N_spm) * A_p_in2 * E_v * _PUMP_K


def output(q_inflow: Number, Q_pump: Number) -> Number:
    return np.minimum(q_inflow, Q_pump)


def v_terminal(
    mu_cp: Number,
    rho_rod: float = 7850.0,
    rho_fluid: float = 950.0,
    g: float = 9.81,
    d_rod: float = 0.022,
) -> Number:
    """Stokes settling velocity of the rod through the fluid."""
    mu_pa_s = np.asarray(mu_cp) / 1000.0
    return (rho_rod - rho_fluid) * g * d_rod**2 / (18.0 * mu_pa_s)


def v_required(S_in: Number, N_spm: Number) -> Number:
    """Peak sinusoidal rod velocity implied by stroke length and SPM."""
    return math.pi * np.asarray(S_in) * np.asarray(N_spm) / 60.0 * IN_TO_M


def mu_crit(
    S_in: Number,
    N_spm: Number,
    rho_rod: float = 7850.0,
    rho_fluid: float = 950.0,
    g: float = 9.81,
    d_rod: float = 0.022,
) -> Number:
    """Critical viscosity [cP] at which v_terminal(mu_crit) == v_required(S, N)."""
    v_r = v_required(S_in, N_spm)
    return 1000.0 * (rho_rod - rho_fluid) * g * d_rod**2 / (18.0 * v_r)


def risk_ratio(
    S_in: Number,
    N_spm: Number,
    mu_cp: Number,
    rho_rod: float = 7850.0,
    rho_fluid: float = 950.0,
    g: float = 9.81,
    d_rod: float = 0.022,
) -> Number:
    """R = v_required / v_terminal, algebraically identical to mu / mu_crit(S, N)."""
    v_r = v_required(S_in, N_spm)
    v_t = v_terminal(mu_cp, rho_rod, rho_fluid, g, d_rod)
    return v_r / v_t


def status_from_R(R: float, R_amber: float = 0.8, R_red: float = 1.0) -> str:
    if R >= R_red:
        return "RED"
    if R >= R_amber:
        return "AMBER"
    return "GREEN"


def fluid_level_pct(q_inflow: Number, Q_pump: Number) -> Number:
    pct = 100.0 * np.asarray(q_inflow) / np.asarray(Q_pump)
    return np.clip(pct, 0.0, 100.0)

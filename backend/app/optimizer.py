"""Optimizer grid search (TRD §6.6, TR-O1..TR-O5). Reuses physics.py exactly as
the live engine does — no formula is written twice (TR-A5)."""
from typing import Dict, Optional

import numpy as np

from app import physics as ph
from app.config import SimConfig
from app.models import WellConfig

L_VALUES = np.arange(40, 121, 10, dtype=float)  # 40,50,...,120
V_VALUES = np.array([0.25, 0.5, 0.75, 1.0])
S_VALUES = np.array([64.0, 86.0, 108.0, 130.0, 144.0])
N_VALUES = np.arange(2.0, 8.5, 1.0)  # 2,3,...,8


def _evaluate(cfg: SimConfig, tau: float, L: float, T_peak: float, S: float, N: float):
    p = cfg.physics
    days = np.arange(0.0, L, 1.0)
    T = ph.temperature(days, T_peak, tau, p.T_base)
    mu = ph.viscosity_cp(T, p.visc_A, p.visc_B)
    mcrit = float(ph.mu_crit(S, N, p.rho_rod, p.rho_fluid, p.g, p.d_rod_m))
    q = ph.inflow(mu, p.dP_psi, p.J_default)
    Qp = float(ph.pump_capacity(S, N, p.A_p_in2, p.E_v))
    out = ph.output(q, Qp)
    R = mu / mcrit
    risk_share = float(np.mean(R >= p.R_red))
    avg_output = float(np.sum(out) / (L + p.steam_downtime_days))
    return avg_output, risk_share


def optimize_well(cfg: SimConfig, well: WellConfig, max_risk_share: Optional[float] = None) -> Dict:
    p = cfg.physics
    max_risk = max_risk_share if max_risk_share is not None else 0.10

    current_avg, current_risk = _evaluate(cfg, well.tau, p.cycle_days, well.T_peak, well.S, well.N)

    best = None
    fallback = None  # lowest-risk combo, used only if nothing satisfies the constraint
    for L in L_VALUES:
        for v in V_VALUES:
            T_peak = 160.0 + 40.0 * v
            for S in S_VALUES:
                for N in N_VALUES:
                    avg_out, risk = _evaluate(cfg, well.tau, L, T_peak, S, N)
                    candidate = {"L": float(L), "T_peak": T_peak, "v": float(v), "S": float(S), "N": float(N),
                                 "avg_output": avg_out, "risk_share": risk}
                    if risk <= max_risk and (best is None or avg_out > best["avg_output"]):
                        best = candidate
                    if fallback is None or risk < fallback["risk_share"]:
                        fallback = candidate

    recommended = best or fallback
    delta_bbl_day = recommended["avg_output"] - current_avg
    delta_inr_day = delta_bbl_day * cfg.economics.oil_price_inr

    return {
        "current": {"avg_output": round(current_avg, 1), "risk_share": round(current_risk, 3)},
        "recommended": {
            "avg_output": round(recommended["avg_output"], 1),
            "risk_share": round(recommended["risk_share"], 3),
            "cycle_days": recommended["L"],
            "T_peak": round(recommended["T_peak"], 1),
            "steam_volume_index": recommended["v"],
            "S": recommended["S"],
            "N": recommended["N"],
            "constraint_satisfied": best is not None,
        },
        "delta_bbl_day": round(delta_bbl_day, 1),
        "delta_inr_day": round(delta_inr_day, 0),
        "max_risk_share": max_risk,
        "note": f"Illustrative, assumed ₹{cfg.economics.oil_price_inr:,.0f}/bbl",
    }

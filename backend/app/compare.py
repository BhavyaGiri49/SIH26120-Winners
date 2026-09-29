"""Twin vs baseline (TRD §6.11, TR-B1): from the well's current state, project
forward with the control loop enabled vs disabled, and diff the outcomes."""
from typing import Dict, Optional

from app import physics as ph
from app.config import SimConfig
from app.engine import WellRuntime

HORIZON_DAYS = 120


def _simulate(
    cfg: SimConfig,
    tau: float,
    T_peak: float,
    S: float,
    N_start: float,
    loop_enabled: bool,
    horizon_days: int,
    t0: float = 0.0,
):
    p = cfg.physics
    cl = cfg.control_loop
    N = N_start
    t_since_steam = t0
    cum_output = 0.0
    last_action_day: Optional[float] = None
    actions = 0
    first_red_day: Optional[float] = None
    days_in_red = 0
    series = []

    for day in range(horizon_days + 1):
        T = float(ph.temperature(t_since_steam, T_peak, tau, p.T_base))
        mu = float(ph.viscosity_cp(T, p.visc_A, p.visc_B))
        mcrit = float(ph.mu_crit(S, N, p.rho_rod, p.rho_fluid, p.g, p.d_rod_m))
        q = float(ph.inflow(mu, p.dP_psi, p.J_default))
        Qp = float(ph.pump_capacity(S, N, p.A_p_in2, p.E_v))
        out = float(ph.output(q, Qp))
        R = mu / mcrit
        is_red = R >= p.R_red
        if is_red:
            days_in_red += 1
            if first_red_day is None:
                first_red_day = float(day)
        cum_output += out
        series.append({"day": float(day), "mu_cp": round(mu, 1), "output": round(out, 2), "R": round(R, 3), "N": N})

        if loop_enabled and is_red:
            cooldown_ok = last_action_day is None or (day - last_action_day) >= cl.loop_cooldown_days
            if cooldown_ok and N > p.N_min:
                N = max(round(N - cl.spm_step, 2), p.N_min)
                last_action_day = day
                actions += 1

        t_since_steam += 1.0

    return {
        "series": series,
        "cumulative_bbl": round(cum_output, 1),
        "days_in_red": days_in_red,
        "first_red_day": first_red_day,
        "actions": actions,
    }


def compare_well(cfg: SimConfig, w: WellRuntime, horizon_days: int = HORIZON_DAYS) -> Dict:
    c = w.config
    with_loop = _simulate(cfg, c.tau, c.T_peak, c.S, c.N, True, horizon_days)
    baseline = _simulate(cfg, c.tau, c.T_peak, c.S, c.N, False, horizon_days)
    return {
        "with_loop": with_loop,
        "baseline": baseline,
        "deltas": {
            "cumulative_bbl": round(with_loop["cumulative_bbl"] - baseline["cumulative_bbl"], 1),
            "days_in_red": with_loop["days_in_red"] - baseline["days_in_red"],
            "first_red_day_with_loop": with_loop["first_red_day"],
            "first_red_day_baseline": baseline["first_red_day"],
            "actions_with_loop": with_loop["actions"],
        },
    }

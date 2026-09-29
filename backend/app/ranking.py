"""Portfolio ranking (TRD §6.12, TR-R1): rank wells by projected days-to-RED at
their current N, ties broken by R then by output lost."""
from typing import Dict, List, Optional

import numpy as np

from app import physics as ph
from app.config import SimConfig
from app.engine import WellRuntime

HORIZON_DAYS = 250
STEP_DAYS = 0.5


def _days_to_red(cfg: SimConfig, w: WellRuntime) -> Optional[float]:
    p = cfg.physics
    s = w.latest
    if s.status.value == "RED":
        return 0.0
    t0 = s.t_since_steam
    ahead = np.arange(0.0, HORIZON_DAYS, STEP_DAYS)
    T = ph.temperature(t0 + ahead, w.config.T_peak, w.config.tau, p.T_base)
    mu = ph.viscosity_cp(T, p.visc_A, p.visc_B)
    mcrit = float(ph.mu_crit(w.config.S, w.config.N, p.rho_rod, p.rho_fluid, p.g, p.d_rod_m))
    R = mu / mcrit
    crossed = np.where(R >= p.R_red)[0]
    if crossed.size == 0:
        return None
    return float(ahead[crossed[0]])


def rank_wells(cfg: SimConfig, wells: Dict[str, WellRuntime]) -> List[Dict]:
    rows = []
    for well_id, w in wells.items():
        s = w.latest
        days = _days_to_red(cfg, w)
        output_lost = max(0.0, s.Q_pump - s.output)
        rows.append(
            {
                "well_id": well_id,
                "days_to_red": days,
                "R": s.R,
                "status": s.status.value,
                "output_lost": round(output_lost, 2),
                "output": s.output,
            }
        )
    # None (never reaches RED within horizon) sorts last; otherwise ascending days,
    # then higher R first, then more output lost first.
    rows.sort(key=lambda r: (r["days_to_red"] is None, r["days_to_red"] or 0.0, -r["R"], -r["output_lost"]))
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    return rows

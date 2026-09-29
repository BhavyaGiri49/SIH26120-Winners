"""Short-horizon forecast (FR/demo item 6): projects a well forward from its CURRENT
state — not from a fresh steam job, like compare.py's twin-vs-baseline does — using
the same control-loop-aware simulation, so the forecast reflects what will actually
happen if the operator changes nothing. Reuses compare.py's _simulate exactly (TR-A5:
no formula written twice) via its t0 starting-offset parameter."""
from typing import Dict, Optional

from app.compare import _simulate
from app.config import SimConfig
from app.engine import WellRuntime
from app.models import Phase


def forecast_well(cfg: SimConfig, w: WellRuntime, horizon_days: int = 30) -> Dict:
    c, s = w.config, w.latest

    if w.phase == Phase.STEAMING:
        return {"series": [], "threshold_day": None, "note": "Steaming — forecast resumes once producing again."}

    result = _simulate(cfg, c.tau, c.T_peak, c.S, c.N, c.loop_enabled, horizon_days, t0=s.t_since_steam)
    base_day = s.sim_day
    series = [
        {"day": round(base_day + p["day"], 2), "mu_cp": p["mu_cp"], "output": p["output"], "R": p["R"]}
        for p in result["series"]
    ]

    threshold_day: Optional[float] = next((p["day"] for p in series if p["R"] >= cfg.physics.R_red), None)
    return {"series": series, "threshold_day": threshold_day, "note": None}

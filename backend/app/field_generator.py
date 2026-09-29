"""Seeded synthetic field of wells (TRD §6.2 spirit, TR-D1 ranges) — staggered so the
field opens with visual variety (some wells already AMBER/RED, some fresh) instead of
all wells transitioning in lockstep."""
from typing import Dict

import numpy as np

from app.config import SimConfig
from app.models import WellConfig


def _round_to(value: float, step: float) -> float:
    return round(value / step) * step


def generate_field(cfg: SimConfig, rng: np.random.Generator) -> Dict[str, tuple]:
    """Returns {well_id: (WellConfig, initial_t_since_steam)}."""
    p = cfg.physics
    wells: Dict[str, tuple] = {}

    n = cfg.n_wells
    # Stagger starting ages so the field isn't in lockstep: ~1/4 start "old" (near/at
    # risk already), ~1/4 start freshly steamed, the rest spread across the cycle.
    n_old = max(1, round(n * 0.25))
    n_fresh = max(1, round(n * 0.25))
    ages = np.concatenate(
        [
            rng.uniform(70, 105, size=n_old),
            rng.uniform(0, 12, size=n_fresh),
            rng.uniform(15, 90, size=max(0, n - n_old - n_fresh)),
        ]
    )
    rng.shuffle(ages)

    for i in range(n):
        well_id = f"W{i + 1:02d}"
        T_peak = float(rng.uniform(*p.T_peak_range))
        tau = float(rng.uniform(*p.tau_range))
        S = _round_to(float(rng.uniform(*p.S_range)), 4.0)
        N = _round_to(float(rng.uniform(*p.N_range)), 0.5)
        config = WellConfig(
            well_id=well_id,
            T_peak=T_peak,
            tau=tau,
            S=S,
            N=N,
            N_initial=N,
            loop_enabled=cfg.control_loop.enabled_default,
        )
        wells[well_id] = (config, float(ages[i]))
    return wells

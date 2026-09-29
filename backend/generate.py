"""Synthetic offline dataset generator (TRD §6.2, TR-D1..TR-D3).

Distinct from the live 12-well field the app simulates: this draws many
independent (well-params, scenario) combinations, each run for a full CSS
cycle, to build training data for the ML layer (FR3).

    python generate.py --wells 12 --scenarios 20 --seed 42
"""
import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from app import physics as ph  # noqa: E402
from app.config import load_config  # noqa: E402

LOOK_AHEAD_DAYS = 5


def simulate_scenario(rng, cfg, well_id, scenario_id, T_peak, tau, S, N_initial, loop_enabled, cycle_days, dt):
    p = cfg.physics
    cl = cfg.control_loop
    rows = []
    N = N_initial
    t_since_steam = 0.0
    cum_output = 0.0
    last_action_day = None

    n_steps = int(cycle_days / dt) + 1
    for step in range(n_steps):
        sim_day = step * dt
        T = float(ph.temperature(t_since_steam, T_peak, tau, p.T_base))
        mu = float(ph.viscosity_cp(T, p.visc_A, p.visc_B))
        mcrit = float(ph.mu_crit(S, N, p.rho_rod, p.rho_fluid, p.g, p.d_rod_m))
        q = float(ph.inflow(mu, p.dP_psi, p.J_default))
        Qp = float(ph.pump_capacity(S, N, p.A_p_in2, p.E_v))
        raw_out = float(ph.output(q, Qp))
        noise = 1.0 + rng.uniform(-p.noise_pct, p.noise_pct)
        out = max(0.0, raw_out * noise)
        R = mu / mcrit
        v_t = float(ph.v_terminal(mu, p.rho_rod, p.rho_fluid, p.g, p.d_rod_m))
        v_r = float(ph.v_required(S, N))
        rod_float = R >= p.R_red
        wax_risk = T < p.T_wax
        fl = float(ph.fluid_level_pct(q, Qp))
        cum_output += out * dt

        rows.append(
            {
                "well_id": well_id,
                "scenario_id": scenario_id,
                "sim_day": sim_day,
                "t_since_steam": t_since_steam,
                "T_peak": T_peak,
                "tau": tau,
                "S": S,
                "N": N,
                "loop_enabled": loop_enabled,
                "T": T,
                "mu_cp": mu,
                "mu_crit_cp": mcrit,
                "q_inflow": q,
                "Q_pump": Qp,
                "output": out,
                "v_terminal": v_t,
                "v_required": v_r,
                "R": R,
                "rod_float": rod_float,
                "wax_risk": wax_risk,
                "fluid_level_pct": fl,
                "cum_output": cum_output,
            }
        )

        if loop_enabled and R >= p.R_red:
            cooldown_ok = last_action_day is None or (sim_day - last_action_day) >= cl.loop_cooldown_days
            if cooldown_ok and N > p.N_min:
                N = max(round(N - cl.spm_step, 2), p.N_min)
                last_action_day = sim_day

        t_since_steam += dt

    df = pd.DataFrame(rows)
    n = len(df)
    rf = df["rod_float"].to_numpy()
    out_arr = df["output"].to_numpy()
    rod_float_next_k = np.zeros(n, dtype=bool)
    output_next = np.full(n, np.nan)
    for i in range(n):
        rod_float_next_k[i] = rf[i + 1 : i + 1 + LOOK_AHEAD_DAYS].any()
        if i + 1 < n:
            output_next[i] = out_arr[i + 1]
    df["rod_float_next_k"] = rod_float_next_k
    df["output_next"] = output_next
    return df


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--wells", type=int, default=12)
    parser.add_argument("--scenarios", type=int, default=20)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--cycle-days", type=float, default=120.0)
    parser.add_argument("--dt", type=float, default=1.0)
    parser.add_argument("--out-dir", type=str, default="data")
    args = parser.parse_args()

    t0 = time.time()
    cfg = load_config()
    rng = np.random.default_rng(args.seed)

    frames = []
    for w in range(args.wells):
        well_id = f"W{w + 1:02d}"
        for s in range(args.scenarios):
            T_peak = float(rng.uniform(*cfg.physics.T_peak_range))
            tau = float(rng.uniform(*cfg.physics.tau_range))
            S = float(rng.choice(np.arange(cfg.physics.S_range[0], cfg.physics.S_range[1] + 1, 4.0)))
            N_initial = float(rng.choice(np.arange(cfg.physics.N_range[0], cfg.physics.N_range[1] + 0.5, 0.5)))
            loop_enabled = bool(rng.random() < 0.5)
            frames.append(
                simulate_scenario(
                    rng, cfg, well_id, s, T_peak, tau, S, N_initial, loop_enabled, args.cycle_days, args.dt
                )
            )

    data = pd.concat(frames, ignore_index=True)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    data.to_csv(out_dir / "telemetry.csv", index=False)
    data.to_json(out_dir / "telemetry.json", orient="records")

    elapsed = time.time() - t0
    summary = {
        "rows": len(data),
        "wells": args.wells,
        "scenarios": args.scenarios,
        "seed": args.seed,
        "elapsed_s": round(elapsed, 2),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

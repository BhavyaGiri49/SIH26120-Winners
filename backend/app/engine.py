"""FieldState: owns all simulation state, advances the tick loop, and runs the
viscosity-triggered control loop (TRD §6.4, TR-C1..TR-C7 — the demo centerpiece)."""
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, Optional

import numpy as np

from app import physics as ph
from app.config import SimConfig
from app.events_store import EventsStore
from app.field_generator import generate_field
from app.models import (
    Event,
    EventType,
    HistoryPoint,
    Phase,
    Severity,
    Status,
    WellConfig,
    WellState,
)

MAX_HISTORY = 600

# Hero well (FR/demo requirement): one well whose story is guaranteed rather than
# left to the random draw — starts healthy, viscosity rises as it cools, the
# control loop auto-cuts SPM twice, risk falls back below 1 both times, and it
# never needs a manual re-steam within the 120-day horizon. Verified against
# app/physics.py directly (see plan notes): GREEN until day ~46, RED at day 51
# (cut 5.0->3.5), RED again at day 63 (cut 3.5->2.0, floor), stays non-RED through
# day 120 (R=0.996 at the end). Overwritten onto the well AFTER generate_field()
# runs so the RNG stream for every other well is untouched.
HERO_WELL_ID = "W01"
HERO_OVERRIDES = {"T_peak": 160.0, "tau": 25.0, "S": 64.0, "N": 5.0, "N_initial": 5.0, "loop_enabled": True}
HERO_INITIAL_AGE = 0.0


@dataclass
class WellRuntime:
    config: WellConfig
    t_since_steam: float
    initial_t_since_steam: float = 0.0
    phase: Phase = Phase.PRODUCING
    prev_status: Status = Status.GREEN
    prev_wax_risk: bool = False
    last_action_sim_day: Optional[float] = None
    resteam_recommended_active: bool = False
    cum_output: float = 0.0
    T_at_steam_start: float = 50.0
    latest: Optional[WellState] = None
    history: Deque[HistoryPoint] = field(default_factory=lambda: deque(maxlen=MAX_HISTORY))


class FieldState:
    def __init__(self, cfg: SimConfig, events_path: str = None):
        self.cfg = cfg
        self.sim_day = 0.0
        self.speed = cfg.sim_clock.speed_default
        self.paused = False
        self.rng = np.random.default_rng(cfg.seed)
        self.events = EventsStore(events_path)
        self.wells: Dict[str, WellRuntime] = {}
        self._build_field()

    def _build_field(self) -> None:
        generated = generate_field(self.cfg, self.rng)
        self.wells = {}
        for well_id, (config, initial_age) in generated.items():
            if well_id == HERO_WELL_ID:
                for field_name, value in HERO_OVERRIDES.items():
                    setattr(config, field_name, value)
                initial_age = HERO_INITIAL_AGE
            runtime = WellRuntime(config=config, t_since_steam=initial_age, initial_t_since_steam=initial_age)
            self._compute_state(runtime, log_events=False)
            self.wells[well_id] = runtime

    # ------------------------------------------------------------------ tick

    def tick(self) -> Optional[dict]:
        if self.paused:
            return None
        horizon = self.cfg.sim_clock.horizon_days
        dt = self.cfg.sim_clock.dt_days * self.speed
        hit_horizon = self.sim_day + dt >= horizon
        if hit_horizon:
            dt = max(0.0, horizon - self.sim_day)
        self.sim_day = min(self.sim_day + dt, horizon)
        new_events = []
        for runtime in self.wells.values():
            new_events.extend(self._advance_well(runtime, dt))
        if hit_horizon:
            self.paused = True
        return self._tick_payload(new_events)

    def _advance_well(self, w: WellRuntime, dt: float) -> list:
        c, p = w.config, self.cfg.physics
        events = []

        if w.phase == Phase.STEAMING:
            w.t_since_steam += dt
            if w.t_since_steam >= p.steam_downtime_days:
                w.phase = Phase.PRODUCING
                w.t_since_steam = 0.0
                c.N = c.N_initial
                w.last_action_sim_day = None
                w.resteam_recommended_active = False
                events.append(
                    self.events.emit(
                        c.well_id,
                        self.sim_day,
                        EventType.STEAM_INJECTED,
                        Severity.INFO,
                        f"Steam injection complete on {c.well_id} — SPM restored to "
                        f"{c.N_initial:.1f}, temperature reset to peak",
                        {"N_restored": c.N_initial},
                    )
                )
            self._compute_state(w, log_events=False)
            return events

        w.t_since_steam += dt
        events.extend(self._compute_state(w, log_events=True))
        return events

    def _compute_state(self, w: WellRuntime, log_events: bool) -> list:
        c, p = w.config, self.cfg.physics
        events = []

        if w.phase == Phase.STEAMING:
            # Reservoir heats back up toward T_peak over the soak period (visually,
            # this is what makes the reservoir glow hot during steam injection).
            frac = min(1.0, w.t_since_steam / p.steam_downtime_days) if p.steam_downtime_days > 0 else 1.0
            T = w.T_at_steam_start + (c.T_peak - w.T_at_steam_start) * frac
            mu = float(ph.viscosity_cp(T, p.visc_A, p.visc_B))
            mcrit = float(ph.mu_crit(c.S, c.N, p.rho_rod, p.rho_fluid, p.g, p.d_rod_m))
            q = float(ph.inflow(mu, p.dP_psi, p.J_default))
            Qp = float(ph.pump_capacity(c.S, c.N, p.A_p_in2, p.E_v))
            out = 0.0  # rod parked, pump off
            R = 0.0
            status = Status.GREEN
            wax_risk = T < p.T_wax
            fl = 0.0
        else:
            T = float(ph.temperature(w.t_since_steam, c.T_peak, c.tau, p.T_base))
            mu = float(ph.viscosity_cp(T, p.visc_A, p.visc_B))
            mcrit = float(ph.mu_crit(c.S, c.N, p.rho_rod, p.rho_fluid, p.g, p.d_rod_m))
            q = float(ph.inflow(mu, p.dP_psi, p.J_default))
            Qp = float(ph.pump_capacity(c.S, c.N, p.A_p_in2, p.E_v))
            raw_out = float(ph.output(q, Qp))
            noise = 1.0 + self.rng.uniform(-p.noise_pct, p.noise_pct)
            out = max(0.0, raw_out * noise)
            R = mu / mcrit
            status = Status(ph.status_from_R(R, p.R_amber, p.R_red))
            wax_risk = T < p.T_wax
            fl = float(ph.fluid_level_pct(q, Qp))

            if log_events:
                events.extend(self._run_control_loop(w, mu, mcrit, R))
                events.extend(self._log_transitions(w, status, wax_risk, T, R))

            dt = self.cfg.sim_clock.dt_days * self.speed
            w.cum_output += out * dt
            w.history.append(
                HistoryPoint(sim_day=round(self.sim_day, 2), T=T, mu_cp=mu, mu_crit_cp=mcrit, output=out, R=R)
            )

        w.latest = WellState(
            well_id=c.well_id,
            sim_day=round(self.sim_day, 2),
            t_since_steam=round(w.t_since_steam, 2),
            phase=w.phase,
            T=round(T, 2),
            mu_cp=round(mu, 1),
            mu_crit_cp=round(mcrit, 1),
            q_inflow=round(q, 2),
            Q_pump=round(Qp, 2),
            output=round(out, 2),
            v_terminal=round(float(ph.v_terminal(mu, p.rho_rod, p.rho_fluid, p.g, p.d_rod_m)), 4),
            v_required=round(float(ph.v_required(c.S, c.N)), 4),
            R=round(R, 3),
            status=status,
            rod_float=R >= p.R_red,
            wax_risk=wax_risk,
            risk_prob=0.0,
            fluid_level_pct=round(fl, 1),
            cum_output=round(w.cum_output, 1),
        )
        w.prev_wax_risk = wax_risk
        return events

    # ------------------------------------------------------------- control loop

    def _run_control_loop(self, w: WellRuntime, mu: float, mcrit: float, R: float) -> list:
        c, p, cl = w.config, self.cfg.physics, self.cfg.control_loop
        events = []
        trigger_R = p.R_red if cl.loop_trigger == "red" else p.R_amber
        cooldown_ok = (
            w.last_action_sim_day is None
            or (self.sim_day - w.last_action_sim_day) >= cl.loop_cooldown_days
        )

        if not c.loop_enabled or R < trigger_R:
            if R < trigger_R:
                w.resteam_recommended_active = False
            return events

        if not cooldown_ok:
            return events

        if c.N > p.N_min:
            n_old = c.N
            c.N = max(round(c.N - cl.spm_step, 2), p.N_min)
            w.last_action_sim_day = self.sim_day
            w.resteam_recommended_active = False
            events.append(
                self.events.emit(
                    c.well_id,
                    self.sim_day,
                    EventType.SPM_REDUCED,
                    Severity.WARN,
                    f"Viscosity rising on {c.well_id} ({mu:,.0f} cP ≥ {mcrit:,.0f} cP) "
                    f"→ SPM reduced {n_old:.1f} → {c.N:.1f}",
                    {"N_from": n_old, "N_to": c.N, "mu_cp": round(mu, 1)},
                )
            )
        elif not w.resteam_recommended_active:
            w.resteam_recommended_active = True
            w.last_action_sim_day = self.sim_day
            events.append(
                self.events.emit(
                    c.well_id,
                    self.sim_day,
                    EventType.RESTEAM_RECOMMENDED,
                    Severity.ALARM,
                    f"{c.well_id} at SPM floor ({p.N_min:.1f}) and still above threshold "
                    f"({mu:,.0f} cP ≥ {mcrit:,.0f} cP) — re-steam recommended",
                    {"mu_cp": round(mu, 1), "mu_crit_cp": round(mcrit, 1)},
                )
            )
            if cl.auto_resteam:
                events.append(self._start_steam(w))
        return events

    def _log_transitions(self, w: WellRuntime, status: Status, wax_risk: bool, T: float, R: float) -> list:
        c = w.config
        events = []
        if status != w.prev_status:
            if status == Status.GREEN:
                events.append(
                    self.events.emit(
                        c.well_id, self.sim_day, EventType.RISK_CLEARED, Severity.INFO,
                        f"{c.well_id} risk cleared to GREEN (R={R:.2f})",
                    )
                )
            elif status == Status.AMBER:
                events.append(
                    self.events.emit(
                        c.well_id, self.sim_day, EventType.RISK_AMBER, Severity.WARN,
                        f"{c.well_id} risk elevated to AMBER (R={R:.2f})",
                    )
                )
            elif status == Status.RED:
                events.append(
                    self.events.emit(
                        c.well_id, self.sim_day, EventType.RISK_RED, Severity.ALARM,
                        f"{c.well_id} risk escalated to RED (R={R:.2f})",
                    )
                )
            w.prev_status = status

        if wax_risk and not w.prev_wax_risk:
            events.append(
                self.events.emit(
                    c.well_id, self.sim_day, EventType.WAX_RISK, Severity.WARN,
                    f"{c.well_id} below wax threshold ({T:.1f}°C < {self.cfg.physics.T_wax:.0f}°C)",
                )
            )
        return events

    # ---------------------------------------------------------------- commands

    def patch_well(self, well_id: str, S: Optional[float] = None, N: Optional[float] = None,
                    loop_enabled: Optional[bool] = None, T_peak: Optional[float] = None) -> WellRuntime:
        w = self.wells[well_id]
        changes = {}
        if S is not None:
            w.config.S = S
            changes["S"] = S
        if N is not None:
            w.config.N = N
            w.config.N_initial = N
            changes["N"] = N
        if loop_enabled is not None:
            w.config.loop_enabled = loop_enabled
            changes["loop_enabled"] = loop_enabled
        if T_peak is not None:
            w.config.T_peak = T_peak
            changes["T_peak"] = T_peak
        if changes:
            self.events.emit(
                well_id, self.sim_day, EventType.USER_CHANGE, Severity.INFO,
                f"Operator updated {well_id}: {changes}", changes,
            )
        self._compute_state(w, log_events=False)
        return w

    def steam_now(self, well_id: str) -> WellRuntime:
        w = self.wells[well_id]
        self.events.emit(
            well_id, self.sim_day, EventType.USER_CHANGE, Severity.INFO,
            f"Operator initiated steam injection on {well_id}",
        )
        self._start_steam(w)
        return w

    def _start_steam(self, w: WellRuntime) -> Event:
        w.T_at_steam_start = w.latest.T if w.latest else self.cfg.physics.T_base
        w.phase = Phase.STEAMING
        w.t_since_steam = 0.0
        return self.events.emit(
            w.config.well_id, self.sim_day, EventType.STEAM_INJECTED, Severity.INFO,
            f"{w.config.well_id} entering steam injection ({self.cfg.physics.steam_downtime_days:.0f}-day soak)",
        )

    def control(self, action: str, speed: Optional[float] = None) -> None:
        if action == "play":
            self.paused = False
        elif action == "pause":
            self.paused = True
        elif action == "reset":
            self.sim_day = 0.0
            self.paused = False
            self.events.reset()
            self.rng = np.random.default_rng(self.cfg.seed)
            self._build_field()
        if speed is not None:
            self.speed = max(self.cfg.sim_clock.speed_min, min(self.cfg.sim_clock.speed_max, speed))

    def _rewind_well(self, w: WellRuntime) -> None:
        """Reset a well's dynamic runtime state back to its generation-time starting
        point, WITHOUT touching the operator's dial settings (S, N_initial, T_peak,
        loop_enabled) — used by seek() so scrubbing the timeline replays "what
        happens with today's dial settings", not a fresh random draw (that's what
        Reset is for). N itself IS rewound to N_initial: it's the control loop's
        live, auto-reduced value, not a dial setting, so replaying from wherever the
        loop last left it would silently rewrite history every time you seek."""
        w.config.N = w.config.N_initial
        w.phase = Phase.PRODUCING
        w.t_since_steam = w.initial_t_since_steam
        w.prev_status = Status.GREEN
        w.prev_wax_risk = False
        w.last_action_sim_day = None
        w.resteam_recommended_active = False
        w.cum_output = 0.0
        w.T_at_steam_start = self.cfg.physics.T_base
        w.history.clear()

    def seek(self, day: float) -> None:
        horizon = self.cfg.sim_clock.horizon_days
        target = max(0.0, min(day, horizon))
        self.events.reset()
        self.sim_day = 0.0
        for w in self.wells.values():
            self._rewind_well(w)
            self._compute_state(w, log_events=False)

        original_speed = self.speed
        self.speed = 1.0
        dt = self.cfg.sim_clock.dt_days
        steps = int(round(target / dt))
        for _ in range(steps):
            self.sim_day += dt
            for w in self.wells.values():
                self._advance_well(w, dt)
        self.speed = original_speed
        self.paused = True

    def step(self, days: float = 1.0) -> None:
        horizon = self.cfg.sim_clock.horizon_days
        original_speed = self.speed
        self.speed = 1.0
        dt = self.cfg.sim_clock.dt_days
        steps = max(1, int(round(days / dt)))
        for _ in range(steps):
            if self.sim_day >= horizon:
                break
            self.sim_day = min(self.sim_day + dt, horizon)
            for w in self.wells.values():
                self._advance_well(w, dt)
        self.speed = original_speed
        self.paused = True

    # ----------------------------------------------------------------- payloads

    def _tick_payload(self, new_events) -> dict:
        return {
            "type": "tick",
            "sim_day": round(self.sim_day, 2),
            "speed": self.speed,
            "paused": self.paused,
            "wells": [self._compact_well(w) for w in self.wells.values()],
            "events": [self._compact_event(e) for e in new_events],
        }

    def snapshot_payload(self) -> dict:
        return {
            "type": "snapshot",
            "sim_day": round(self.sim_day, 2),
            "speed": self.speed,
            "paused": self.paused,
            "wells": [self._full_well(w) for w in self.wells.values()],
            "events": [self._compact_event(e) for e in self.events.latest(200)],
        }

    def field_snapshot(self) -> dict:
        return {
            "sim_day": round(self.sim_day, 2),
            "speed": self.speed,
            "paused": self.paused,
            "wells": [self._full_well(w) for w in self.wells.values()],
        }

    @staticmethod
    def _compact_well(w: WellRuntime) -> dict:
        s = w.latest
        c = w.config
        return {
            "id": c.well_id,
            "ph": "S" if w.phase == Phase.STEAMING else "P",
            "st": s.status.value,
            "T": s.T,
            "mu": s.mu_cp,
            "mc": s.mu_crit_cp,
            "N": 0.0 if w.phase == Phase.STEAMING else c.N,
            "N0": c.N_initial,
            "S": c.S,
            "tp": c.T_peak,
            "out": s.output,
            "R": s.R,
            "fl": s.fluid_level_pct,
            "rf": s.rod_float,
            "wx": s.wax_risk,
            "cum": s.cum_output,
            "tss": s.t_since_steam,
        }

    @staticmethod
    def _full_well(w: WellRuntime) -> dict:
        return {"config": w.config.model_dump(), "state": w.latest.model_dump()}

    @staticmethod
    def _compact_event(e: Event) -> dict:
        return {
            "id": e.event_id,
            "day": e.sim_day,
            "w": e.well_id,
            "t": e.type.value,
            "sev": e.severity.value,
            "msg": e.message,
        }

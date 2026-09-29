"""Control-loop behavioral tests (TRD §6.4, TR-C1..TR-C7): cut-on-crossing, cooldown,
re-steam floor, steam restore, and transition-only event logging."""
import pytest

from app.config import load_config
from app.engine import FieldState
from app.models import EventType, Phase


@pytest.fixture
def cfg():
    return load_config()


def make_field(cfg, tmp_path, name="events.jsonl"):
    return FieldState(cfg, events_path=str(tmp_path / name))


def _force_well_to_risk(field: FieldState, well_id: str):
    """Push S/N to the most aggressive combo so mu_crit drops and the well reaches
    RED quickly, then fast-forward the sim clock."""
    field.patch_well(well_id, S=144, N=8)
    field.control("play", speed=8.0)


def test_spm_cuts_on_red_crossing_and_respects_cooldown(cfg, tmp_path):
    field = make_field(cfg, tmp_path)
    well_id = next(iter(field.wells))
    _force_well_to_risk(field, well_id)

    cuts = []
    for _ in range(4000):  # plenty of ticks to reach RED and beyond
        field.tick()
        cuts = field.events.since(0, well_id=well_id, type_=EventType.SPM_REDUCED)
        if len(cuts) >= 2:
            break

    assert len(cuts) >= 2
    # cooldown enforced: consecutive cuts must be >= loop_cooldown_days apart
    days_between = cuts[1].sim_day - cuts[0].sim_day
    assert days_between >= cfg.control_loop.loop_cooldown_days - 1e-6


def test_resteam_recommended_fires_once_at_floor(cfg, tmp_path):
    field = make_field(cfg, tmp_path)
    well_id = next(iter(field.wells))
    _force_well_to_risk(field, well_id)

    for _ in range(20000):
        field.tick()
        w = field.wells[well_id]
        if w.config.N <= cfg.physics.N_min + 1e-9:
            break

    # keep ticking well past the floor — RESTEAM_RECOMMENDED must not repeat every tick
    for _ in range(2000):
        field.tick()

    alarms = field.events.since(0, well_id=well_id, type_=EventType.RESTEAM_RECOMMENDED)
    assert len(alarms) == 1


def test_steam_now_parks_rod_and_restores_after_downtime(cfg, tmp_path):
    field = make_field(cfg, tmp_path)
    well_id = next(iter(field.wells))
    field.patch_well(well_id, N=4.5)
    field.steam_now(well_id)

    w = field.wells[well_id]
    assert w.phase == Phase.STEAMING
    field.tick()
    assert field.wells[well_id].latest.output == 0

    # advance well past steam_downtime_days
    days_needed = cfg.physics.steam_downtime_days + 1
    ticks_needed = int(days_needed / cfg.sim_clock.dt_days) + 5
    for _ in range(ticks_needed):
        field.tick()

    w = field.wells[well_id]
    assert w.phase == Phase.PRODUCING
    assert w.config.N == pytest.approx(4.5)


def test_risk_events_log_only_on_transition_not_every_tick(cfg, tmp_path):
    field = make_field(cfg, tmp_path)
    well_id = next(iter(field.wells))
    field.patch_well(well_id, S=144, N=8, loop_enabled=False)  # disable loop: let it sit in RED
    field.control("play", speed=8.0)

    for _ in range(3000):
        field.tick()

    red_events = field.events.since(0, well_id=well_id, type_=EventType.RISK_RED)
    # Even though many ticks pass while status stays RED, only the transition logs.
    assert len(red_events) <= 2

"""Pins every physics.py formula to the TRD's Section 2 / TR-P4 reference values."""
import pytest

from app import physics as ph


def test_temperature_pins():
    assert ph.temperature(0, 180, 30) == pytest.approx(180, rel=0.01)
    assert ph.temperature(120, 180, 30) == pytest.approx(52.4, rel=0.01)
    assert ph.temperature(50, 180, 30) == pytest.approx(74.0, rel=0.03)


def test_viscosity_pins():
    assert ph.viscosity_cp(50) == pytest.approx(11358, rel=0.01)
    assert ph.viscosity_cp(150) == pytest.approx(49.5, rel=0.02)
    assert ph.viscosity_cp(180) == pytest.approx(15.5, rel=0.02)


def test_inflow_pins_j10_default():
    mu_180 = ph.viscosity_cp(180)
    assert ph.inflow(mu_180, 200, 10) == pytest.approx(130, rel=0.05)


def test_inflow_pins_j_prd_literal_matches_prd_check_table():
    # TRD's own Section 2 table (J=0.5): 6.5 bbl/day @180C, 0.19 @100C, 0.009 @50C
    mu_180 = ph.viscosity_cp(180)
    mu_100 = ph.viscosity_cp(100)
    mu_50 = ph.viscosity_cp(50)
    assert ph.inflow(mu_180, 200, 0.5) == pytest.approx(6.5, rel=0.05)
    assert ph.inflow(mu_100, 200, 0.5) == pytest.approx(0.19, rel=0.1)
    assert ph.inflow(mu_50, 200, 0.5) == pytest.approx(0.009, rel=0.1)


def test_pump_capacity_pins():
    assert ph.pump_capacity(100, 6) == pytest.approx(134.9, rel=0.001)
    assert ph.pump_capacity(64, 2) == pytest.approx(29, rel=0.03)
    assert ph.pump_capacity(144, 8) == pytest.approx(259, rel=0.01)


def test_output_is_min_of_inflow_and_pump_capacity():
    assert ph.output(10, 20) == 10
    assert ph.output(30, 20) == 20


def test_v_terminal_pins():
    assert ph.v_terminal(11358) == pytest.approx(0.16, rel=0.02)
    assert ph.v_terminal(2315.7) == pytest.approx(0.79, rel=0.02)
    assert ph.v_terminal(520.8) == pytest.approx(3.5, rel=0.02)


def test_v_required_pins():
    assert ph.v_required(64, 2) == pytest.approx(0.17, rel=0.02)
    assert ph.v_required(144, 8) == pytest.approx(1.53, rel=0.02)


def test_mu_crit_pin():
    assert ph.mu_crit(100, 6) == pytest.approx(2280, rel=0.01)


def test_risk_ratio_identity_matches_mu_over_mu_crit():
    mu = ph.viscosity_cp(74)
    mcrit = ph.mu_crit(100, 6)
    assert ph.risk_ratio(100, 6, mu) == pytest.approx(mu / mcrit, rel=1e-9)


def test_status_bands():
    assert ph.status_from_R(0.5) == "GREEN"
    assert ph.status_from_R(0.8) == "AMBER"
    assert ph.status_from_R(0.99) == "AMBER"
    assert ph.status_from_R(1.0) == "RED"
    assert ph.status_from_R(1.5) == "RED"


def test_default_well_crosses_red_near_day_50():
    """TRD Section 2: 'Risk onset ... S=100,N=6: day 50 at 74°C' — confirms the full
    formula chain (not just individually-pinned values) is internally consistent."""
    day_40 = ph.risk_ratio(100, 6, ph.viscosity_cp(ph.temperature(40, 180, 30)))
    day_60 = ph.risk_ratio(100, 6, ph.viscosity_cp(ph.temperature(60, 180, 30)))
    assert day_40 < 1.0
    assert day_60 > 0.9  # crossing happens within this window, approximately day 50


def test_fluid_level_pct_clamped():
    assert ph.fluid_level_pct(50, 100) == 50
    assert ph.fluid_level_pct(150, 100) == 100
    assert ph.fluid_level_pct(0, 100) == 0

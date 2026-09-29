"""Loads the trained models (TR-M5) and serves predictions. The live tick loop
never depends on this — physics is closed-form and runs in microseconds — this
is only for the "what-if" slider preview and the /predict, /models/metrics
endpoints (see engine.py's note on WellState.risk_prob)."""
import json
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import pandas as pd

from app import physics as ph
from app.config import SimConfig

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

REG_FEATURES = ["t_since_steam", "T_peak", "tau", "S", "N"]
CLF_FEATURES = ["mu_cp", "mu_slope_3d", "mu_cp_lag3", "N", "S", "t_since_steam", "R"]


class MLModels:
    def __init__(self):
        self.regressor = None
        self.classifier = None
        self.metrics: Optional[dict] = None
        self._load()

    def _load(self) -> None:
        try:
            self.regressor = joblib.load(MODELS_DIR / "regressor.joblib")
            self.classifier = joblib.load(MODELS_DIR / "classifier.joblib")
            with open(MODELS_DIR / "metrics.json") as f:
                self.metrics = json.load(f)
        except FileNotFoundError:
            self.regressor = None
            self.classifier = None
            self.metrics = None

    @property
    def available(self) -> bool:
        return self.regressor is not None and self.classifier is not None

    def predict(self, cfg: SimConfig, T_peak: float, tau: float, S: float, N: float, t_since_steam: float) -> Dict:
        p = cfg.physics
        T = float(ph.temperature(t_since_steam, T_peak, tau, p.T_base))
        mu = float(ph.viscosity_cp(T, p.visc_A, p.visc_B))
        mcrit = float(ph.mu_crit(S, N, p.rho_rod, p.rho_fluid, p.g, p.d_rod_m))
        R = mu / mcrit
        # Physics is closed-form, so the classifier's lag/slope features can be
        # computed analytically rather than requiring real history.
        T_lag3 = float(ph.temperature(max(0.0, t_since_steam - 3.0), T_peak, tau, p.T_base))
        mu_lag3 = float(ph.viscosity_cp(T_lag3, p.visc_A, p.visc_B))
        mu_slope_3d = (mu - mu_lag3) / 3.0

        reg_row = pd.DataFrame([{"t_since_steam": t_since_steam, "T_peak": T_peak, "tau": tau, "S": S, "N": N}])
        clf_row = pd.DataFrame(
            [{"mu_cp": mu, "mu_slope_3d": mu_slope_3d, "mu_cp_lag3": mu_lag3, "N": N, "S": S, "t_since_steam": t_since_steam, "R": R}]
        )

        output_pred = float(self.regressor.predict(reg_row[REG_FEATURES])[0])
        risk_prob = float(self.classifier.predict_proba(clf_row[CLF_FEATURES])[0][1])

        top_drivers = self._top_drivers(self.classifier, CLF_FEATURES, n=3)
        return {"output_pred": round(output_pred, 2), "risk_prob": round(risk_prob, 4), "top_drivers": top_drivers}

    @staticmethod
    def _top_drivers(model, features: List[str], n: int = 3) -> List[str]:
        importances = getattr(model, "feature_importances_", None)
        if importances is None:
            return []
        ranked = sorted(zip(features, importances), key=lambda x: x[1], reverse=True)
        return [name for name, _ in ranked[:n]]


ml_models = MLModels()

"""Trains the production regressor (TR-M1) and rod-float classifier (TR-M2) on
the synthetic dataset from generate.py, split BY WELL (TR-M3) so the held-out
set contains wells the models never saw during training.

    python train.py
"""
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.metrics import r2_score, recall_score, roc_auc_score
from sklearn.utils.class_weight import compute_sample_weight

sys.path.insert(0, str(Path(__file__).resolve().parent))

REG_FEATURES = ["t_since_steam", "T_peak", "tau", "S", "N"]
REG_TARGET = "output"
CLF_FEATURES = ["mu_cp", "mu_slope_3d", "mu_cp_lag3", "N", "S", "t_since_steam", "R"]
CLF_TARGET = "rod_float_next_k"
TEST_WELL_FRACTION = 0.25
SEED = 42


def add_classifier_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["well_id", "scenario_id", "sim_day"]).copy()
    grp = df.groupby(["well_id", "scenario_id"])["mu_cp"]
    df["mu_cp_lag3"] = grp.shift(3)
    df["mu_slope_3d"] = (df["mu_cp"] - df["mu_cp_lag3"]) / 3.0
    return df


def well_split(well_ids: np.ndarray, seed: int, test_fraction: float):
    rng = np.random.default_rng(seed)
    wells = np.array(sorted(set(well_ids)))
    rng.shuffle(wells)
    n_test = max(1, int(round(len(wells) * test_fraction)))
    test_wells = set(wells[:n_test])
    train_wells = set(wells[n_test:])
    return train_wells, test_wells


def main():
    t0 = time.time()
    data_path = Path("data/telemetry.csv")
    df = pd.read_csv(data_path)
    df = add_classifier_features(df)
    df_clf = df.dropna(subset=["mu_cp_lag3"])
    df_reg = df.dropna(subset=[REG_TARGET])

    train_wells, test_wells = well_split(df["well_id"].to_numpy(), SEED, TEST_WELL_FRACTION)

    # --- regressor ---
    reg_train = df_reg[df_reg["well_id"].isin(train_wells)]
    reg_test = df_reg[df_reg["well_id"].isin(test_wells)]
    regressor = GradientBoostingRegressor(random_state=SEED)
    regressor.fit(reg_train[REG_FEATURES], reg_train[REG_TARGET])
    reg_pred = regressor.predict(reg_test[REG_FEATURES])
    r2 = r2_score(reg_test[REG_TARGET], reg_pred)

    # --- classifier ---
    clf_train = df_clf[df_clf["well_id"].isin(train_wells)]
    clf_test = df_clf[df_clf["well_id"].isin(test_wells)]
    sample_weight = compute_sample_weight("balanced", clf_train[CLF_TARGET])
    classifier = GradientBoostingClassifier(random_state=SEED)
    classifier.fit(clf_train[CLF_FEATURES], clf_train[CLF_TARGET], sample_weight=sample_weight)
    clf_pred = classifier.predict(clf_test[CLF_FEATURES])
    clf_proba = classifier.predict_proba(clf_test[CLF_FEATURES])[:, 1]
    recall = recall_score(clf_test[CLF_TARGET], clf_pred, pos_label=True)
    auc = roc_auc_score(clf_test[CLF_TARGET], clf_proba)

    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)
    joblib.dump(regressor, models_dir / "regressor.joblib")
    joblib.dump(classifier, models_dir / "classifier.joblib")

    metrics = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "elapsed_s": round(time.time() - t0, 2),
        "n_rows": int(len(df)),
        "n_wells_train": len(train_wells),
        "n_wells_test": len(test_wells),
        "regressor": {
            "features": REG_FEATURES,
            "target": REG_TARGET,
            "r2": round(float(r2), 4),
            "pass_bar": 0.95,
            "passed": bool(r2 >= 0.95),
            "feature_importances": {
                f: round(float(v), 4) for f, v in zip(REG_FEATURES, regressor.feature_importances_)
            },
        },
        "classifier": {
            "features": CLF_FEATURES,
            "target": CLF_TARGET,
            "recall": round(float(recall), 4),
            "roc_auc": round(float(auc), 4),
            "pass_bar": 0.90,
            "passed": bool(recall >= 0.90),
            "feature_importances": {
                f: round(float(v), 4) for f, v in zip(CLF_FEATURES, classifier.feature_importances_)
            },
        },
    }
    with open(models_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()

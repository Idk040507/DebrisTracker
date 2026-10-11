"""XGBoost model loader and inference pipeline for Conjunction Data Message (CDM) risk prediction."""

from __future__ import annotations

from pathlib import Path
import numpy as np

MODEL_PATH = Path(__file__).resolve().parent / "saved_models" / "risk_model.json"
ESA_MODEL_PATH = Path(__file__).resolve().parent / "saved_models" / "risk_model_esa.json"

FEATURE_ORDER = [
    "miss_distance_km",
    "relative_speed_km_s",
    "c_r_r",
    "c_t_t",
    "c_n_n",
    "time_to_tca_hours",
    "primary_rcs",
    "secondary_rcs",
]


def _load_booster():
    try:
        import xgboost as xgb
    except ImportError:
        return None
    model_path = ESA_MODEL_PATH if ESA_MODEL_PATH.exists() else MODEL_PATH
    if not model_path.exists():
        return None
    booster = xgb.Booster()
    try:
        booster.load_model(str(model_path))
        return booster
    except Exception:
        return None


_BOOSTER = None


def get_booster():
    global _BOOSTER
    if _BOOSTER is None:
        _BOOSTER = _load_booster()
    return _BOOSTER


def vectorize(features: dict) -> np.ndarray:
    defaults = {
        "miss_distance_km": 5.0,
        "relative_speed_km_s": 10.0,
        "c_r_r": 50.0,
        "c_t_t": 200.0,
        "c_n_n": 100.0,
        "time_to_tca_hours": 24.0,
        "primary_rcs": 1.0,
        "secondary_rcs": 0.5,
    }
    vec = []
    for name in FEATURE_ORDER:
        val = features.get(name)
        if val is None:
            val = defaults.get(name, 0.0)
        vec.append(float(val))
    return np.array([vec], dtype=np.float32)


def predict_risk(features: dict) -> dict:
    matrix = vectorize(features)
    booster = get_booster()
    if booster is None:
        miss = float(features.get("miss_distance_km", 5.0))
        speed = float(features.get("relative_speed_km_s", 10.0))
        heuristic = 1.0 / (1.0 + miss) * min(speed / 15.0, 1.0)
        return {"risk_score": float(heuristic), "source": "heuristic"}

    import xgboost as xgb

    dmatrix = xgb.DMatrix(matrix, feature_names=FEATURE_ORDER)
    score = float(np.clip(booster.predict(dmatrix)[0], 0.0, 1.0))
    return {"risk_score": score, "source": "xgboost"}

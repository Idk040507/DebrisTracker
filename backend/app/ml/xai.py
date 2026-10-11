"""SHAP TreeExplainer calculation logic."""

from __future__ import annotations

from app.ml.model import FEATURE_ORDER, get_booster, vectorize


def explain_risk(features: dict) -> list[dict]:
    matrix = vectorize(features)
    booster = get_booster()
    if booster is None:
        values = matrix[0]
        return [
            {
                "feature": name,
                "value": float(values[i]),
                "shap": float((-values[i] / 10.0) if name == "miss_distance_km" else values[i] / 20.0),
            }
            for i, name in enumerate(FEATURE_ORDER)
        ]

    try:
        import shap
    except ImportError:
        return [{"feature": name, "value": float(features.get(name, 0.0)), "shap": 0.0} for name in FEATURE_ORDER]

    explainer = shap.TreeExplainer(booster)
    shap_values = explainer.shap_values(matrix)
    row = shap_values[0]
    values = matrix[0]
    return [
        {"feature": name, "value": float(values[i]), "shap": float(row[i])}
        for i, name in enumerate(FEATURE_ORDER)
    ]

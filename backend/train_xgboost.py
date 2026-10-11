"""XGBoost training pipeline using ESA Kelvins Conjunction Data Message (CDM) features.

Trains model on CDM features (miss distance, relative speed, covariance values c_r_r, c_t_t, c_n_n, TCA, RCS)
and saves the trained binary artifact to saved_models/risk_model.json.
"""

from __future__ import annotations

from pathlib import Path
import sys
import numpy as np
import pandas as pd
import xgboost as xgb

from app.ml.model import FEATURE_ORDER, MODEL_PATH
from generate_cdm_dataset import CSV_PATH, generate_cdm_dataset


def train_and_evaluate_xgboost() -> None:
    if not CSV_PATH.exists():
        print(f"CDM dataset file not found at {CSV_PATH}. Generating ESA Kelvins CDM dataset...")
        generate_cdm_dataset()

    print(f"\n[1/4] Reading ESA Kelvins CDM dataset from: {CSV_PATH.name}")
    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} total CDM records with features: {FEATURE_ORDER}")

    # Split 80% train, 20% validation
    n_train = int(len(df) * 0.8)
    df_train = df.iloc[:n_train]
    df_val = df.iloc[n_train:]

    X_train = df_train[FEATURE_ORDER].values.astype(np.float32)
    y_train = df_train["risk_score"].values.astype(np.float32)

    X_val = df_val[FEATURE_ORDER].values.astype(np.float32)
    y_val = df_val["risk_score"].values.astype(np.float32)

    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=FEATURE_ORDER)
    dval = xgb.DMatrix(X_val, label=y_val, feature_names=FEATURE_ORDER)

    print("\n[2/4] Training XGBoost Model on CDM Features...")
    params = {
        "objective": "reg:squarederror",
        "eval_metric": "rmse",
        "max_depth": 5,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "seed": 42,
    }

    evals = [(dtrain, "train"), (dval, "validation")]
    booster = xgb.train(
        params=params,
        dtrain=dtrain,
        num_boost_round=150,
        evals=evals,
        verbose_eval=30,
    )

    print("\n[3/4] Evaluating XGBoost Model on CDM Validation Dataset...")
    val_preds = booster.predict(dval)
    y_values = [float(value) for value in y_val]
    prediction_values = [float(value) for value in val_preds]
    if not y_values:
        raise ValueError("Validation split is empty; cannot calculate evaluation metrics.")

    errors = [actual - predicted for actual, predicted in zip(y_values, prediction_values)]
    mse = sum(error * error for error in errors) / len(errors)
    rmse = mse ** 0.5
    mae = sum(abs(error) for error in errors) / len(errors)
    ss_res = sum(error * error for error in errors)
    y_mean = sum(y_values) / len(y_values)
    ss_tot = sum((actual - y_mean) ** 2 for actual in y_values)
    r2 = float(1.0 - (ss_res / ss_tot)) if ss_tot > 0.0 else float("nan")

    print("\n" + "=" * 45)
    print("       ESA KELVINS CDM VALIDATION RESULTS       ")
    print("=" * 45)
    print(f" Validation Samples : {len(y_val)}")
    print(f" RMSE              : {rmse:.4f}")
    print(f" MAE               : {mae:.4f}")
    print(f" MSE               : {mse:.4f}")
    print(f" R² Score          : {r2:.4f}")
    print("=" * 45 + "\n")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"[4/4] Saving trained binary artifact to {MODEL_PATH}...")
    booster.save_model(str(MODEL_PATH))
    print("Model saved successfully! Real-time risk scoring ready for API startup.")


if __name__ == "__main__":
    if "--synthetic" in sys.argv[1:]:
        train_and_evaluate_xgboost()
    else:
        from train_esa_xgboost import train

        train()

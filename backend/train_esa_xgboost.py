"""Train the app's XGBoost model on the official ESA Kelvins CDM dataset.

Expected input: backend/data/esa_kelvins_raw/train_data.csv
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

from app.ml.model import ESA_MODEL_PATH, FEATURE_ORDER


DATA_PATH = Path(__file__).resolve().parent / "data" / "esa_kelvins_raw" / "train_data.csv"
RANDOM_SEED = 42


def load_training_examples() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"ESA training data not found: {DATA_PATH}\n"
            "Extract the official train_data.csv into backend/data/esa_kelvins_raw/."
        )

    df = pd.read_csv(DATA_PATH)
    required = {
        "event_id", "time_to_tca", "risk", "miss_distance", "relative_speed",
        "t_sigma_r", "t_sigma_t", "t_sigma_n", "t_rcs_estimate", "c_rcs_estimate",
    }
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"ESA file is missing required columns: {missing}")

    numeric_columns = [
        "time_to_tca", "risk", "miss_distance", "relative_speed", "t_sigma_r",
        "t_sigma_t", "t_sigma_n", "t_rcs_estimate", "c_rcs_estimate",
    ]
    for column in numeric_columns:
        df[column] = pd.to_numeric(df[column], errors="coerce")
    df = df.replace([np.inf, -np.inf], np.nan)
    df["event_id"] = df["event_id"].astype("string")

    # A challenge label is the event's final risk, from the CDM nearest TCA.
    labels = df.dropna(subset=["event_id", "time_to_tca", "risk"])
    final_rows = labels.loc[labels.groupby("event_id")["time_to_tca"].idxmin()]
    final_risk = final_rows[["event_id", "risk"]].rename(columns={"risk": "final_log10_risk"})

    # Predict final event risk from CDMs available at least 2 days before TCA.
    examples = df.loc[df["time_to_tca"] >= 2.0].copy()
    examples = examples.merge(final_risk, on="event_id", how="inner", validate="many_to_one")
    examples["miss_distance_km"] = examples["miss_distance"] / 1000.0
    examples["relative_speed_km_s"] = examples["relative_speed"] / 1000.0
    # ESA sigma columns are in metres; square them to match covariance-diagonal inputs.
    examples["c_r_r"] = examples["t_sigma_r"] ** 2
    examples["c_t_t"] = examples["t_sigma_t"] ** 2
    examples["c_n_n"] = examples["t_sigma_n"] ** 2
    examples["time_to_tca_hours"] = examples["time_to_tca"] * 24.0
    examples["primary_rcs"] = examples["t_rcs_estimate"]
    examples["secondary_rcs"] = examples["c_rcs_estimate"]
    # ESA risk is log10(probability); the app's risk_score is a probability in [0, 1].
    examples["risk_score"] = np.power(10.0, examples["final_log10_risk"])
    examples = examples.replace([np.inf, -np.inf], np.nan).dropna(
        subset=["event_id", *FEATURE_ORDER, "risk_score"]
    )
    examples = examples[(examples["risk_score"] >= 0.0) & (examples["risk_score"] <= 1.0)]
    if examples.empty:
        raise ValueError("No usable training rows remain after selecting CDMs at least 2 days before TCA.")
    return examples


def split_by_event(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split by conjunction event so an event cannot leak into validation."""
    event_ids = df["event_id"].drop_duplicates().to_numpy(copy=True)
    if len(event_ids) < 2:
        raise ValueError("At least two distinct event IDs are required for validation.")
    rng = np.random.default_rng(RANDOM_SEED)
    rng.shuffle(event_ids)
    split_at = max(1, min(len(event_ids) - 1, int(len(event_ids) * 0.8)))
    train_ids = set(event_ids[:split_at])
    train = df[df["event_id"].isin(train_ids)]
    validation = df[~df["event_id"].isin(train_ids)]
    return train, validation


def train() -> None:
    print(f"[1/4] Loading official ESA Kelvins data: {DATA_PATH}")
    examples = load_training_examples()
    training, validation = split_by_event(examples)
    print(
        f"Prepared {len(examples):,} earlier-CDM examples from "
        f"{examples['event_id'].nunique():,} events."
    )
    print(
        f"Training: {len(training):,} rows / {training['event_id'].nunique():,} events; "
        f"validation: {len(validation):,} rows / {validation['event_id'].nunique():,} events."
    )

    dtrain = xgb.DMatrix(
        training[FEATURE_ORDER].to_numpy(dtype=np.float32),
        label=training["risk_score"].to_numpy(dtype=np.float32),
        feature_names=FEATURE_ORDER,
    )
    dvalid = xgb.DMatrix(
        validation[FEATURE_ORDER].to_numpy(dtype=np.float32),
        label=validation["risk_score"].to_numpy(dtype=np.float32),
        feature_names=FEATURE_ORDER,
    )

    print("[2/4] Training XGBoost...")
    booster = xgb.train(
        params={
            "objective": "reg:squarederror",
            "eval_metric": "rmse",
            "max_depth": 5,
            "learning_rate": 0.05,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "base_score": float(training["risk_score"].mean()),
            "seed": RANDOM_SEED,
        },
        dtrain=dtrain,
        num_boost_round=300,
        evals=[(dtrain, "train"), (dvalid, "validation")],
        verbose_eval=50,
    )

    print("[3/4] Evaluating held-out events...")
    predictions = np.clip(booster.predict(dvalid), 0.0, 1.0)
    actual = validation["risk_score"].to_numpy(dtype=np.float64)
    rmse = float(np.sqrt(np.mean((actual - predictions) ** 2)))
    mae = float(np.mean(np.abs(actual - predictions)))
    print(f"Validation RMSE: {rmse:.6g}")
    print(f"Validation MAE : {mae:.6g}")
    print("Target: final event collision probability, converted from ESA log10 risk.")

    ESA_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"[4/4] Saving model to {ESA_MODEL_PATH}")
    booster.save_model(str(ESA_MODEL_PATH))
    print("Training complete. The app will load this model on its next backend start.")


if __name__ == "__main__":
    train()

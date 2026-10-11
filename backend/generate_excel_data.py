"""Script to generate historical space debris conjunction dataset into an Excel workbook (.xlsx).

Creates two sheets:
- `train_data`: Historical conjunction records for model training.
- `validation_data`: Past historical conjunction records for validation.
"""

from __future__ import annotations

from pathlib import Path
import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"
EXCEL_PATH = DATA_DIR / "conjunction_historical_data.xlsx"


def generate_conjunction_records(num_records: int, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    # Orbital conjunction features
    miss_distance = rng.uniform(0.01, 15.0, size=num_records)  # km
    relative_speed = rng.uniform(1.0, 16.0, size=num_records)  # km/s
    time_to_tca = rng.uniform(0.5, 72.0, size=num_records)  # hours
    primary_rcs = rng.exponential(scale=2.5, size=num_records) + 0.1  # m^2
    secondary_rcs = rng.exponential(scale=1.5, size=num_records) + 0.05  # m^2
    inclination_diff = rng.uniform(0.0, 45.0, size=num_records)  # deg

    # Synthetic ground-truth collision probability model based on orbital mechanics proxies
    proximity_factor = 1.0 / (1.0 + miss_distance / 2.0)
    speed_factor = np.clip(relative_speed / 12.0, 0.1, 1.0)
    tca_urgency = np.exp(-time_to_tca / 24.0)
    rcs_factor = np.log1p(primary_rcs + secondary_rcs) / 3.0

    raw_risk = (
        0.50 * proximity_factor
        + 0.20 * speed_factor
        + 0.20 * tca_urgency
        + 0.10 * rcs_factor
    )

    # Stochastic variance/noise
    noise = rng.normal(0.0, 0.04, size=num_records)
    risk_score = np.clip(raw_risk + noise, 0.0, 1.0)
    is_high_risk = (risk_score >= 0.65).astype(int)

    timestamps = pd.date_range("2024-01-01", periods=num_records, freq="h").strftime("%Y-%m-%d %H:%M:%S")

    df = pd.DataFrame(
        {
            "event_id": [f"EVT-{10000 + i}" for i in range(num_records)],
            "timestamp": timestamps,
            "primary_object": [f"SAT-{rng.integers(100, 999)}" for _ in range(num_records)],
            "secondary_object": [f"DEBRIS-{rng.integers(1000, 9999)}" for _ in range(num_records)],
            "miss_distance_km": np.round(miss_distance, 4),
            "relative_speed_km_s": np.round(relative_speed, 4),
            "time_to_tca_hours": np.round(time_to_tca, 2),
            "primary_rcs": np.round(primary_rcs, 4),
            "secondary_rcs": np.round(secondary_rcs, 4),
            "inclination_diff_deg": np.round(inclination_diff, 2),
            "risk_score": np.round(risk_score, 4),
            "is_high_risk": is_high_risk,
        }
    )
    return df


def create_excel_dataset() -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print("Generating past conjunction data for training and validation...")

    df_train = generate_conjunction_records(num_records=3000, seed=42)
    df_val = generate_conjunction_records(num_records=1000, seed=101)

    with pd.ExcelWriter(EXCEL_PATH, engine="openpyxl") as writer:
        df_train.to_excel(writer, sheet_name="train_data", index=False)
        df_val.to_excel(writer, sheet_name="validation_data", index=False)

    print(f"Successfully generated Excel dataset at: {EXCEL_PATH}")
    print(f" - Sheet 'train_data': {len(df_train)} records")
    print(f" - Sheet 'validation_data': {len(df_val)} records")
    return EXCEL_PATH


if __name__ == "__main__":
    create_excel_dataset()

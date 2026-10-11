"""Script to generate ESA Kelvins Collision Avoidance Challenge style CDM dataset (class_cdm_data.csv)."""

from __future__ import annotations

from pathlib import Path
import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"
CSV_PATH = DATA_DIR / "class_cdm_data.csv"


def generate_cdm_dataset(num_records: int = 4000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    miss_distance = rng.uniform(0.005, 20.0, size=num_records)  # km
    relative_speed = rng.uniform(0.5, 15.0, size=num_records)  # km/s
    c_r_r = rng.exponential(scale=100.0, size=num_records) + 1.0  # m^2 (Radial covariance)
    c_t_t = rng.exponential(scale=500.0, size=num_records) + 5.0  # m^2 (In-track covariance)
    c_n_n = rng.exponential(scale=200.0, size=num_records) + 2.0  # m^2 (Cross-track covariance)
    time_to_tca = rng.uniform(0.2, 72.0, size=num_records)  # hours
    primary_rcs = rng.exponential(scale=2.0, size=num_records) + 0.1  # m^2
    secondary_rcs = rng.exponential(scale=1.0, size=num_records) + 0.05  # m^2

    # Mahalanobis position variance proxy for CDM collision risk computation
    pos_error_scale = np.sqrt(c_r_r + c_t_t + c_n_n) / 1000.0  # km
    mahalanobis_dist = miss_distance / (pos_error_scale + 0.1)

    proximity_risk = np.exp(-0.5 * (mahalanobis_dist**2))
    speed_factor = np.clip(relative_speed / 12.0, 0.1, 1.0)
    tca_urgency = np.exp(-time_to_tca / 24.0)

    raw_risk = 0.60 * proximity_risk + 0.20 * speed_factor + 0.20 * tca_urgency
    noise = rng.normal(0.0, 0.03, size=num_records)
    risk_score = np.clip(raw_risk + noise, 0.0, 1.0)

    df = pd.DataFrame(
        {
            "event_id": [f"CDM-{20000 + i}" for i in range(num_records)],
            "miss_distance_km": np.round(miss_distance, 4),
            "relative_speed_km_s": np.round(relative_speed, 4),
            "c_r_r": np.round(c_r_r, 4),
            "c_t_t": np.round(c_t_t, 4),
            "c_n_n": np.round(c_n_n, 4),
            "time_to_tca_hours": np.round(time_to_tca, 2),
            "primary_rcs": np.round(primary_rcs, 4),
            "secondary_rcs": np.round(secondary_rcs, 4),
            "risk_score": np.round(risk_score, 4),
        }
    )

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(CSV_PATH, index=False)
    print(f"Generated ESA Kelvins CDM dataset at {CSV_PATH} ({len(df)} records)")
    return df


if __name__ == "__main__":
    generate_cdm_dataset()

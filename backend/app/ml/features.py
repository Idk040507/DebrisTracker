"""Build per-object CDM-style features from a CelesTrak catalog record.

Live TLE/OMM data does not include miss distance or covariance. This module
maps the object's real orbit (altitude, inclination, RCS, type) into a
deterministic close-approach scenario so each NORAD id gets a unique,
repeatable feature vector for XGBoost / SHAP.
"""

from __future__ import annotations

import math

from app.ml.model import FEATURE_ORDER
from app.core.spacetrack import _cdm_miss_km, _tca_hours

MU_KM3_S2 = 398600.4418
EARTH_RADIUS_KM = 6371.0
REF_INCLINATION_DEG = 51.6  # ISS-like reference plane for relative geometry


def _num(obj: dict, *keys: str, default: float = 0.0) -> float:
    for key in keys:
        value = obj.get(key)
        if value is None or value == "":
            continue
        try:
            return float(value)
        except (TypeError, ValueError):
            continue
    return default


def _seed(norad_id: str) -> int:
    n = 2166136261
    for char in str(norad_id):
        n ^= ord(char)
        n = (n * 16777619) & 0xFFFFFFFF
    return n


def _unit(seed: int, salt: int) -> float:
    """Deterministic 0..1 value (xorshift)."""
    x = (seed ^ (salt * 0x9E3779B9)) & 0xFFFFFFFF
    x ^= (x << 13) & 0xFFFFFFFF
    x ^= x >> 17
    x ^= (x << 5) & 0xFFFFFFFF
    return x / 4294967295.0


def _mix(seed: int, salt: int, low: float, high: float) -> float:
    return low + _unit(seed, salt) * (high - low)


def _altitude_km(obj: dict) -> float:
    periapsis = _num(obj, "periapsis", "PERIAPSIS", "PERIGEE")
    if periapsis > 50:
        return periapsis
    ecc = _num(obj, "eccentricity", "ECCENTRICITY")
    sma = _num(obj, "SEMIMAJOR_AXIS", "semimajor_axis")
    if sma > EARTH_RADIUS_KM:
        return max(sma * (1.0 - ecc) - EARTH_RADIUS_KM, 200.0)
    mean_motion = _num(obj, "meanMotion", "MEAN_MOTION", default=15.0)
    n = max(mean_motion, 0.2) * 2.0 * math.pi / 86400.0
    a = (MU_KM3_S2 / (n**2)) ** (1.0 / 3.0)
    return max(a * (1.0 - ecc) - EARTH_RADIUS_KM, 200.0)


def _rcs_m2(label: str, seed: int, debris: bool) -> float:
    size = (label or "").upper()
    if size == "SMALL":
        value = _mix(seed, 11, 0.05, 0.4)
    elif size == "MEDIUM":
        value = _mix(seed, 11, 0.8, 4.0)
    elif size == "LARGE":
        value = _mix(seed, 11, 5.0, 18.0)
    else:
        value = _mix(seed, 11, 0.15, 3.5)
    if debris:
        value = min(value, 0.9)
    return value


def features_from_object(obj: dict | None) -> dict:
    obj = obj or {}
    norad_id = str(obj.get("id") or obj.get("NORAD_CAT_ID") or obj.get("OBJECT_ID") or "0")
    seed = _seed(norad_id)

    inclination = _num(obj, "inclination", "INCLINATION")
    eccentricity = _num(obj, "eccentricity", "ECCENTRICITY")
    bstar = abs(_num(obj, "BSTAR", "bstar"))
    group = str(obj.get("CELESTRAK_GROUP") or obj.get("group") or "")
    object_type = str(obj.get("OBJECT_TYPE") or "").upper()
    debris = "DEBRIS" in object_type or group.lower() == "debris"

    alt = _altitude_km(obj)
    leo_density = 1.0 / (1.0 + max(alt - 350.0, 0.0) / 450.0)

    miss_hi = 3.5 if debris else 14.0
    miss_lo = 0.04 if debris else 0.15
    miss_distance = max(0.01, _mix(seed, 1, miss_lo, miss_hi) * (1.25 - 0.7 * leo_density))

    inc_diff = abs(inclination - REF_INCLINATION_DEG)
    v_circ = 7.905 * math.sqrt(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + alt))
    relative_speed = min(
        15.8,
        0.35 + (inc_diff / 90.0) * v_circ * 1.55 + _mix(seed, 2, 0.15, 2.8),
    )

    c_scale = 1.0 + min(bstar * 1e4, 8.0) + eccentricity * 25.0
    c_r_r = (_mix(seed, 3, 8.0, 180.0)) * c_scale
    c_t_t = (_mix(seed, 4, 40.0, 900.0)) * c_scale
    c_n_n = (_mix(seed, 5, 12.0, 360.0)) * c_scale

    tca_span = 18.0 if debris else 64.0
    time_to_tca = _mix(seed, 6, 0.4, tca_span) / (1.0 + 0.45 * leo_density)

    primary_rcs = _rcs_m2(str(obj.get("RCS_SIZE") or obj.get("rcs_size") or ""), seed, debris)
    secondary_rcs = _mix(seed, 12, 0.04, 1.8 if debris else 0.7)

    return {
        "miss_distance_km": round(miss_distance, 4),
        "relative_speed_km_s": round(relative_speed, 4),
        "c_r_r": round(c_r_r, 4),
        "c_t_t": round(c_t_t, 4),
        "c_n_n": round(c_n_n, 4),
        "time_to_tca_hours": round(time_to_tca, 2),
        "primary_rcs": round(primary_rcs, 4),
        "secondary_rcs": round(secondary_rcs, 4),
        "norad_id": norad_id,
        "feature_source": "modeled",
    }


def _rcs_from_label(label: str, seed: int, debris: bool) -> float:
    return _rcs_m2(label, seed, debris)


def features_from_cdm(cdm: dict, obj: dict | None = None) -> dict:
    """Overlay Space-Track CDM close-approach fields onto the orbital feature vector."""
    obj = obj or {}
    base = features_from_object(obj)
    norad_id = str(obj.get("id") or obj.get("NORAD_CAT_ID") or base.get("norad_id") or "0")
    seed = _seed(norad_id)

    sat1 = str(cdm.get("SAT1_ID") or cdm.get("SAT_1_ID") or "")
    is_primary = sat1 == norad_id or not sat1

    miss_km = _cdm_miss_km(cdm)
    if miss_km is not None:
        base["miss_distance_km"] = round(max(miss_km, 0.001), 4)

    rel = cdm.get("RELATIVE_SPEED") or cdm.get("RELATIVE_SPEED_KM_S")
    if rel not in (None, ""):
        try:
            base["relative_speed_km_s"] = round(float(rel), 4)
        except (TypeError, ValueError):
            pass

    tca_hours = _tca_hours(cdm)
    if tca_hours is not None:
        base["time_to_tca_hours"] = round(tca_hours, 2)

    for cov_key, dest in (("CR_R", "c_r_r"), ("CT_T", "c_t_t"), ("CN_N", "c_n_n"), ("C_R_R", "c_r_r"), ("C_T_T", "c_t_t"), ("C_N_N", "c_n_n")):
        value = cdm.get(cov_key)
        if value not in (None, ""):
            try:
                base[dest] = round(abs(float(value)), 4)
            except (TypeError, ValueError):
                pass

    sat1_rcs = str(cdm.get("SAT1_RCS") or cdm.get("SAT_1_RCS") or "")
    sat2_rcs = str(cdm.get("SAT2_RCS") or cdm.get("SAT_2_RCS") or "")
    if is_primary:
        if sat1_rcs:
            base["primary_rcs"] = round(_rcs_from_label(sat1_rcs, seed, False), 4)
        if sat2_rcs:
            base["secondary_rcs"] = round(_rcs_from_label(sat2_rcs, seed + 1, True), 4)
    else:
        if sat2_rcs:
            base["primary_rcs"] = round(_rcs_from_label(sat2_rcs, seed, True), 4)
        if sat1_rcs:
            base["secondary_rcs"] = round(_rcs_from_label(sat1_rcs, seed + 1, False), 4)

    base["feature_source"] = "spacetrack-cdm"
    base["cdm_id"] = cdm.get("CDM_ID")
    base["conjunction_name"] = cdm.get("SAT2_NAME") if is_primary else cdm.get("SAT1_NAME")
    pc = cdm.get("PC")
    if pc not in (None, ""):
        try:
            base["pc"] = float(pc)
        except (TypeError, ValueError):
            pass
    return base


def resolve_features(payload: dict | None) -> dict:
    """Prefer explicit CDM fields; otherwise derive them from the selected object."""
    payload = payload or {}
    explicit = payload.get("features") if isinstance(payload.get("features"), dict) else {}
    obj = payload.get("object") if isinstance(payload.get("object"), dict) else None
    if obj is None:
        context = payload.get("context")
        obj = context if isinstance(context, dict) else payload

    derived = features_from_object(obj)
    cdm = payload.get("cdm") if isinstance(payload.get("cdm"), dict) else None
    if cdm:
        derived = features_from_cdm(cdm, obj)
    merged = dict(derived)
    for key in FEATURE_ORDER:
        value = explicit.get(key)
        if value is not None and value != "":
            merged[key] = float(value)
    return merged


async def resolve_features_async(payload: dict | None) -> dict:
    payload = dict(payload or {})
    obj = payload.get("object") if isinstance(payload.get("object"), dict) else None
    if obj is None:
        context = payload.get("context")
        obj = context if isinstance(context, dict) else payload
    norad = None
    if isinstance(obj, dict):
        norad = obj.get("NORAD_CAT_ID") or obj.get("id") or obj.get("norad")
    if norad and not payload.get("cdm"):
        from app.core.spacetrack import get_cdm_for_norad

        cdm = await get_cdm_for_norad(norad)
        if cdm:
            payload["cdm"] = cdm
    return resolve_features(payload)

"""Fetches live TLE / GP orbital data from CelesTrak, with Space-Track fallback."""

from __future__ import annotations

import time

import httpx

from app.core.config import get_settings
from app.core.spacetrack import fetch_group as fetch_spacetrack_group

DEFAULT_GROUPS = ("active", "stations", "visual", "debris")
CACHE_TTL_SECONDS = 7200
MAX_PER_GROUP = 800

_CACHE: dict[str, tuple[float, list[dict] | str]] = {}


async def fetch_gp(group: str = "active", fmt: str = "json") -> list[dict] | str:
    settings = get_settings()
    fmt_upper = (fmt or "json").upper()
    cache_key = f"{group}:{fmt_upper.lower()}"
    now = time.time()

    if cache_key in _CACHE:
        cached_time, cached_data = _CACHE[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return cached_data

    params = {"GROUP": group, "FORMAT": fmt_upper}

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(settings.celestrak_gp_url, params=params)
            response.raise_for_status()
            data = response.json() if fmt_upper == "JSON" else response.text
            if fmt_upper == "JSON" and isinstance(data, list) and len(data) > MAX_PER_GROUP:
                data = data[:MAX_PER_GROUP]
            _CACHE[cache_key] = (now, data)
            return data
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 403 and cache_key in _CACHE:
            return _CACHE[cache_key][1]
        if exc.response.status_code == 403:
            return [] if fmt_upper == "JSON" else ""
        raise exc
    except Exception:
        if cache_key in _CACHE:
            return _CACHE[cache_key][1]
        raise


async def fetch_catalog(groups: tuple[str, ...] = DEFAULT_GROUPS) -> list[dict]:
    objects: list[dict] = []
    seen: set[str] = set()
    for group in groups:
        records: list[dict] = []
        try:
            payload = await fetch_gp(group=group, fmt="json")
            if isinstance(payload, list):
                records = payload
        except Exception:
            records = []

        if not records:
            try:
                records = await fetch_spacetrack_group(group)
            except Exception:
                records = []

        for record in records:
            norad_id = str(record.get("NORAD_CAT_ID") or record.get("OBJECT_ID") or "")
            if norad_id and norad_id in seen:
                continue
            if norad_id:
                seen.add(norad_id)
            item = dict(record)
            item["CELESTRAK_GROUP"] = group
            item.setdefault("DATA_SOURCE", "celestrak")
            objects.append(item)
    return objects

"""Space-Track.org client: GP catalog fallback and public CDM close-approach data."""

from __future__ import annotations

import time
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings, spacetrack_configured

GP_CACHE_TTL = 7200
CDM_CACHE_TTL = 6 * 3600
GP_LIMIT = 400

GROUP_OBJECT_TYPE = {
    "active": "PAYLOAD",
    "visual": "PAYLOAD",
    "debris": "DEBRIS",
}

STATION_IDS = "25544,44713,48274,49044,54216,57320,58563,59540"

_GP_CACHE: dict[str, tuple[float, list[dict]]] = {}
_CDM_CACHE: tuple[float, dict[str, dict]] | None = None
_SPACETRACK_CLIENT = None


class SpaceTrackClient:
    """Authenticated Space-Track session (cookie login)."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = self.settings.spacetrack_base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None

    def configured(self) -> bool:
        return bool(self.settings.spacetrack_identity and self.settings.spacetrack_password)

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=45.0, follow_redirects=True)
            await self.login()
        return self._client

    async def login(self) -> None:
        if not self.configured():
            raise RuntimeError("Space-Track credentials are not configured")
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=45.0, follow_redirects=True)
        response = await self._client.post(
            f"{self.base_url}/ajaxauth/login",
            data={
                "identity": self.settings.spacetrack_identity,
                "password": self.settings.spacetrack_password,
            },
        )
        response.raise_for_status()
        body = (response.text or "").lower()
        if "failed" in body:
            raise RuntimeError("Space-Track login failed")

    async def _get_json(self, path: str) -> list | dict:
        client = await self._ensure_client()
        url = f"{self.base_url}{path}"
        response = await client.get(url)
        if response.status_code in {401, 403}:
            await self.login()
            response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, list) else data

    async def get_gp_history(self, norad_cat_id: str | int, start_date: str, end_date: str) -> list[dict]:
        query_path = (
            f"/basicspacedata/query/class/gp_history"
            f"/NORAD_CAT_ID/{norad_cat_id}"
            f"/EPOCH/{start_date}--{end_date}"
            f"/format/json"
        )
        data = await self._get_json(query_path)
        return data if isinstance(data, list) else []

    async def get_gp(self, object_type: str, limit: int = GP_LIMIT) -> list[dict]:
        path = (
            f"/basicspacedata/query/class/gp"
            f"/OBJECT_TYPE/{object_type}"
            f"/DECAY_DATE/null-val"
            f"/EPOCH/%3Enow-30"
            f"/orderby/EPOCH%20desc"
            f"/limit/{limit}"
            f"/format/json"
        )
        data = await self._get_json(path)
        return data if isinstance(data, list) else []

    async def get_stations(self) -> list[dict]:
        by_id = await self._get_json(
            f"/basicspacedata/query/class/gp/NORAD_CAT_ID/{STATION_IDS}/format/json"
        )
        by_name = await self._get_json(
            "/basicspacedata/query/class/gp/OBJECT_NAME/~~ISS/DECAY_DATE/null-val/format/json"
        )
        merged: dict[str, dict] = {}
        for record in (by_id if isinstance(by_id, list) else []) + (by_name if isinstance(by_name, list) else []):
            norad = str(record.get("NORAD_CAT_ID") or "")
            if norad:
                merged[norad] = record
        return list(merged.values())

    async def get_cdm_public(self, limit: int = 1000) -> list[dict]:
        for cls in ("cdm_public", "cdm"):
            try:
                path = (
                    f"/basicspacedata/query/class/{cls}"
                    f"/TCA/%3Enow-3"
                    f"/orderby/TCA%20desc"
                    f"/limit/{limit}"
                    f"/format/json"
                )
                data = await self._get_json(path)
                if isinstance(data, list):
                    return data
            except Exception:
                continue
        return []

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()


def get_spacetrack_client() -> SpaceTrackClient:
    global _SPACETRACK_CLIENT
    if _SPACETRACK_CLIENT is None:
        _SPACETRACK_CLIENT = SpaceTrackClient()
    return _SPACETRACK_CLIENT


async def get_gp_history(norad_cat_id: str | int, start_date: str, end_date: str) -> list[dict]:
    return await get_spacetrack_client().get_gp_history(norad_cat_id, start_date, end_date)


def _stamp_records(records: list[dict], group: str) -> list[dict]:
    stamped = []
    for record in records:
        item = dict(record)
        item["CELESTRAK_GROUP"] = group
        item["DATA_SOURCE"] = "spacetrack"
        stamped.append(item)
    return stamped


async def fetch_group(group: str) -> list[dict]:
    """GP catalog for a UI filter group, cached like CelesTrak."""
    if not spacetrack_configured():
        return []
    now = time.time()
    cached = _GP_CACHE.get(group)
    if cached and now - cached[0] < GP_CACHE_TTL:
        return cached[1]

    client = get_spacetrack_client()
    try:
        if group == "stations":
            records = await client.get_stations()
        else:
            object_type = GROUP_OBJECT_TYPE.get(group, "PAYLOAD")
            records = await client.get_gp(object_type)
    except Exception:
        return cached[1] if cached else []

    payload = _stamp_records(records, group)
    _GP_CACHE[group] = (now, payload)
    return payload


def _cdm_miss_km(cdm: dict) -> float | None:
    min_rng = cdm.get("MIN_RNG")
    if min_rng not in (None, ""):
        try:
            return float(min_rng) / 1000.0
        except (TypeError, ValueError):
            pass
    miss = cdm.get("MISS_DISTANCE")
    if miss not in (None, ""):
        try:
            return float(miss)
        except (TypeError, ValueError):
            pass
    return None


def _tca_hours(cdm: dict) -> float | None:
    raw = cdm.get("TCA")
    if not raw:
        return None
    try:
        tca = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if tca.tzinfo is None:
            tca = tca.replace(tzinfo=timezone.utc)
        hours = (tca - datetime.now(timezone.utc)).total_seconds() / 3600.0
        return max(0.05, hours)
    except ValueError:
        return None


def _index_cdms(rows: list[dict]) -> dict[str, dict]:
    index: dict[str, dict] = {}
    for cdm in rows:
        miss = _cdm_miss_km(cdm)
        for key in ("SAT1_ID", "SAT_1_ID", "SAT2_ID", "SAT_2_ID"):
            norad = str(cdm.get(key) or "")
            if not norad:
                continue
            existing = index.get(norad)
            if existing is None:
                index[norad] = cdm
                continue
            existing_miss = _cdm_miss_km(existing)
            if miss is not None and (existing_miss is None or miss < existing_miss):
                index[norad] = cdm
    return index


async def get_cdm_index() -> dict[str, dict]:
    global _CDM_CACHE
    if not spacetrack_configured():
        return {}
    now = time.time()
    if _CDM_CACHE and now - _CDM_CACHE[0] < CDM_CACHE_TTL:
        return _CDM_CACHE[1]
    try:
        rows = await get_spacetrack_client().get_cdm_public()
    except Exception:
        return _CDM_CACHE[1] if _CDM_CACHE else {}
    index = _index_cdms(rows if isinstance(rows, list) else [])
    _CDM_CACHE = (now, index)
    return index


async def get_cdm_for_norad(norad_id: str | int) -> dict | None:
    index = await get_cdm_index()
    return index.get(str(norad_id))


__all__ = [
    "SpaceTrackClient",
    "fetch_group",
    "get_cdm_for_norad",
    "get_cdm_index",
    "get_gp_history",
    "get_spacetrack_client",
    "_cdm_miss_km",
    "_tca_hours",
]

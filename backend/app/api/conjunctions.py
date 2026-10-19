from fastapi import APIRouter, Query

from app.core.celestrak import fetch_catalog
from app.core.spacetrack import get_cdm_index, get_cdm_objects, get_cdm_status
from app.ml.features import resolve_features_async
from app.ml.model import predict_risk
from app.ml.xai import explain_risk

router = APIRouter()


@router.get("/cdms/status")
async def cdm_status():
    """Refresh the rate-limited CDM cache if needed and report lookup diagnostics."""
    await get_cdm_index()
    return get_cdm_status()


@router.get("/cdms/objects")
async def cdm_objects():
    """List selectable NORAD objects from the rate-limited public CDM cache."""
    await get_cdm_index()
    status = get_cdm_status()
    return {
        "objects": get_cdm_objects(),
        "status": {
            "request_status": status.get("request_status"),
            "last_error": status.get("last_error"),
        },
    }


@router.get("/catalog")
async def catalog(groups: str = Query(default="active,stations,debris")):
    group_list = tuple(g.strip() for g in groups.split(",") if g.strip())
    objects = await fetch_catalog(group_list)
    sources = {str(item.get("DATA_SOURCE") or "celestrak") for item in objects}
    if not sources:
        source = "none"
    elif len(sources) == 1:
        source = next(iter(sources))
    else:
        source = "mixed"
    return {"objects": objects, "source": source, "count": len(objects)}


@router.post("/score")
async def score(payload: dict):
    features = await resolve_features_async(payload)
    prediction = predict_risk(features)
    shap_values = explain_risk(features)
    return {"prediction": prediction, "shap": shap_values, "features": features}

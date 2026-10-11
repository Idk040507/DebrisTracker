from fastapi import APIRouter, Query

from app.core.celestrak import fetch_catalog
from app.ml.features import resolve_features_async
from app.ml.model import predict_risk
from app.ml.xai import explain_risk

router = APIRouter()


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

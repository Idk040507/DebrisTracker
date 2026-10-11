from fastapi import APIRouter, HTTPException

from app.ml.features import resolve_features_async
from app.ml.model import predict_risk
from app.ml.xai import explain_risk
from app.services.gemini_service import generate_briefing

router = APIRouter()


@router.post("/briefing")
async def briefing(payload: dict):
    features = await resolve_features_async(payload)
    context = payload.get("context") or {}
    if isinstance(context, dict):
        context = {**context, "features": features}
    try:
        prediction = predict_risk(features)
        shap_values = explain_risk(features)
        text = await generate_briefing(context=context, prediction=prediction, shap_values=shap_values)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"briefing": text, "prediction": prediction, "shap": shap_values, "features": features}

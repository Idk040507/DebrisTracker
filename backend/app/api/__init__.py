from fastapi import APIRouter

from app.api.conjunctions import router as conjunctions_router
from app.api.explain import router as explain_router

api_router = APIRouter()
api_router.include_router(conjunctions_router, prefix="/conjunctions", tags=["conjunctions"])
api_router.include_router(explain_router, prefix="/explain", tags=["explain"])

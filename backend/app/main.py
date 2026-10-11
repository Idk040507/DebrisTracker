from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from app.api import api_router
from app.core.config import get_settings, spacetrack_configured

settings = get_settings()

app = FastAPI(title="Space Debris Tracker API", version="0.1.0")

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "spacetrack": spacetrack_configured()}

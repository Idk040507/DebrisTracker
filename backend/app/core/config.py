from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_PROJECT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(_PROJECT_DIR / ".env"), str(_BACKEND_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    celestrak_gp_url: str = "https://celestrak.org/NORAD/elements/gp.php"
    spacetrack_identity: str = ""
    spacetrack_password: str = ""
    spacetrack_base_url: str = "https://www.space-track.org"
    cors_origins: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def spacetrack_configured() -> bool:
    settings = get_settings()
    return bool(settings.spacetrack_identity and settings.spacetrack_password)

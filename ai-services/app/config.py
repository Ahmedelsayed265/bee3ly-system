import os
from pathlib import Path

from pydantic_settings import BaseSettings

_ENV_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    PORT: int = 8000
    REDIS_URL: str
    PRODUCTS_API_URL: str = "http://127.0.0.1:5000/products"
    BEE3LY_API_URL: str = "http://127.0.0.1:5000"

    class Config:
        env_file = str(_ENV_DIR / ".env")
        extra = "allow"


settings = Settings()
_key = settings.GEMINI_API_KEY.strip()
if not _key:
    raise ValueError("GEMINI_API_KEY is empty — set it in ai-services/.env")
settings.GEMINI_API_KEY = _key
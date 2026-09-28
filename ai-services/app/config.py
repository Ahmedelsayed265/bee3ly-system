from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

_ENV_DIR = Path(__file__).resolve().parent.parent
# override=True: uvicorn --reload spawns workers that inherit empty env vars on Windows.
load_dotenv(_ENV_DIR / ".env", override=True)


class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_MODEL_FALLBACKS: str = "gemini-3.8-flash,gemini-3.5-flash,gemini-flash-latest"
    GEMINI_HTTP_TIMEOUT_MS: int = 30000
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
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    PORT: int = 8000
    REDIS_URL: str
    PRODUCTS_API_URL: str = "http://127.0.0.1:5000/products"
    BEE3LY_API_URL: str = "http://127.0.0.1:5000"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
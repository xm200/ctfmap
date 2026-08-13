import secrets
import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = os.environ.get("DATABASE_URL") or "postgresql+asyncpg://ctfmap:ctfmap@localhost:5432/ctfmap"
    DATABASE_URL_SYNC: str = os.environ.get("DATABASE_URL_SYNC") or "postgresql+psycopg2://ctfmap:ctfmap@localhost:5432/ctfmap"

    SECRET_KEY: str = os.environ.get("SECRET_KEY") or secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    PARSER_API_TOKEN: str = os.environ.get("PARSER_API_TOKEN") or secrets.token_urlsafe(32)

    LEVEL_WEIGHTS: dict[str, float] = {
        "training": 1.0,
        "local": 2.0,
        "elite": 5.0,
    }

    CATEGORIES: list[str] = ["web", "crypto", "pwn", "reverse", "forensics", "osint", "misc"]

    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

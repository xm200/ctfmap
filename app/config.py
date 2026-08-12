import secrets
import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = os.environ.get('DATABASE_URL') or "postgresql+asyncpg://ctfmap:ctfmap@localhost:5432/ctfmap"
    DATABASE_URL_SYNC: str = os.environ.get('DATABASE_URL_SYNC') or "postgresql+psycopg2://ctfmap:ctfmap@localhost:5432/ctfmap"

    PARSER_API_TOKEN: str = os.environ.get('PARSER_API_TOKEN') or secrets.token_urlsafe(32)

    LEVEL_WEIGHTS: dict[str, float] = {
        "training": 1.0,
        "local": 2.0,
        "elite": 5.0,
    }

    CATEGORIES: list[str] = ["web", "crypto", "pwn", "reverse", "forensics", "osint", "misc"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

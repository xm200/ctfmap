import hashlib
import hmac
import os
import re
import secrets
from contextlib import asynccontextmanager

import psycopg
from fastapi import FastAPI, HTTPException, Response, status
from pydantic import BaseModel, Field, field_validator


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ctfmap:ctfmap_dev_password@localhost:5432/ctfmap",
)
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def get_connection() -> psycopg.Connection:
    return psycopg.connect(DATABASE_URL)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt$n=16384,r=8,p=1${salt.hex()}${digest.hex()}"


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    email: str = Field(max_length=254)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("username", "email")
    @classmethod
    def trim_value(cls, value: str) -> str:
        return value.strip()

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if len(value) < 3:
            raise ValueError("Минимум 3 символа.")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not EMAIL_PATTERN.fullmatch(value):
            raise ValueError("Введите корректный email.")
        return value


@asynccontextmanager
async def lifespan(_: FastAPI):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    yield


app = FastAPI(title="CTFMAP API", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    return {"status": "ok"}


@app.post("/api/auth/register", status_code=status.HTTP_204_NO_CONTENT)
def register(payload: RegisterRequest, response: Response) -> None:
    password_hash = hash_password(payload.password)
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO users (username, email, password_hash)
                    VALUES (%s, %s, %s)
                    RETURNING id
                    """,
                    (payload.username, payload.email, password_hash),
                )
    except psycopg.errors.UniqueViolation as error:
        constraint = getattr(error.diag, "constraint_name", "")
        if "email" in constraint:
            raise HTTPException(status_code=409, detail="Email уже зарегистрирован.") from error
        raise HTTPException(status_code=409, detail="Username уже зарегистрирован.") from error

    response.headers["Cache-Control"] = "no-store"


@app.post("/api/auth/refresh", status_code=status.HTTP_401_UNAUTHORIZED)
def refresh() -> None:
    raise HTTPException(status_code=401, detail="Сессия отсутствует.")


def verify_password(password: str, encoded: str) -> bool:
    """Reserved for the login endpoint; registration never needs to read it."""
    try:
        _, parameters, salt_hex, digest_hex = encoded.split("$")
        values = dict(item.split("=") for item in parameters.split(","))
        actual = hashlib.scrypt(
            password.encode(),
            salt=bytes.fromhex(salt_hex),
            n=int(values["n"]),
            r=int(values["r"]),
            p=int(values["p"]),
        )
        return hmac.compare_digest(actual.hex(), digest_hex)
    except (ValueError, KeyError):
        return False

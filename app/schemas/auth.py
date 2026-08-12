from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.schemas.user import CamelModel, UserOut


class RegisterRequest(CamelModel):
    username: str
    email: str
    password: str


class LoginRequest(CamelModel):
    identifier: str
    password: str


class SessionOut(CamelModel):
    user: UserOut
    expires_at: str | None = None


class AuthResponse(CamelModel):
    access_token: str
    session: SessionOut

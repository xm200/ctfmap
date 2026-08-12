from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class UserOut(CamelModel):
    id: str
    username: str
    email: str
    role: str
    verified: bool
    created_at: str
    city: str | None = None
    organization: str | None = None
    telegram: str | None = None


class ProfileUpdate(CamelModel):
    email: str | None = None
    telegram: str | None = None
    team: str | None = None


class PasswordChange(CamelModel):
    current_password: str
    new_password: str


class UserUpdate(CamelModel):
    username: str | None = None
    email: str | None = None
    role: str | None = None
    verified: bool | None = None
    city: str | None = None
    organization: str | None = None

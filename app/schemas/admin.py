from pydantic import Field, HttpUrl

from app.schemas.user import CamelModel, UserOut


class VerificationTicketOut(CamelModel):
    id: str
    user: UserOut
    submitted_at: str
    status: str
    details: str | None = None
    contact: str | None = None
    comment: str | None = None


class VerificationUpdate(CamelModel):
    status: str
    comment: str | None = None


class RegistrationOut(CamelModel):
    id: str
    title: str
    short_title: str | None = None
    organizer: str | None = None
    contact: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    format: str | None = None
    category: str | None = None
    difficulty: str | None = None
    city: str | None = None
    region: str | None = None
    url: str | None = None
    registration_url: str | None = None
    ctftime_url: str | None = None
    ctf_news_url: str | None = None
    description: str | None = None
    full_description: str | None = None
    team_size: str | None = None
    task_categories: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)
    status: str
    comment: str | None = None


class RegistrationUpdate(CamelModel):
    status: str
    comment: str | None = None


class RegistrationCreate(CamelModel):
    title: str = Field(min_length=3, max_length=256)
    short_title: str = Field(min_length=2, max_length=64)
    organizer: str = Field(min_length=2, max_length=256)
    contact: str = Field(min_length=3, max_length=128)
    start_date: str = Field(min_length=10, max_length=32)
    end_date: str = Field(min_length=10, max_length=32)
    format: str
    category: str
    difficulty: str = Field(max_length=32)
    city: str = Field(max_length=128)
    region: str = Field(min_length=3, max_length=128)
    url: HttpUrl
    registration_url: HttpUrl
    ctftime_url: HttpUrl | None = None
    ctf_news_url: HttpUrl | None = None
    description: str = Field(min_length=30, max_length=1000)
    full_description: str = Field(min_length=50, max_length=5000)
    team_size: str = Field(min_length=2, max_length=80)
    task_categories: list[str] = Field(min_length=1, max_length=30)
    tags: list[str] = Field(min_length=1, max_length=30)
    requirements: list[str] = Field(min_length=1, max_length=30)

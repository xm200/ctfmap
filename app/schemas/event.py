from pydantic import Field

from app.schemas.user import CamelModel


class EventOut(CamelModel):
    id: str
    slug: str
    title: str
    short_title: str | None = None
    category: str
    difficulty: str | None = None
    format: str
    region_id: str | None = None
    city: str | None = None
    lat: float | None = None
    lng: float | None = None
    rating: float = 0.0
    weight: int = 0
    organizer: str | None = None
    url: str | None = None
    registration_url: str | None = None
    ctftime_url: str | None = None
    ctf_news_url: str | None = None
    description: str | None = None
    full_description: str | None = None
    team_size: str | None = None
    task_categories: list[str] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)
    contacts: str | None = None
    tags: list[str] = Field(default_factory=list)
    status: str
    source: str | None = None
    start_date: str | None = None
    end_date: str | None = None


class EventUpdate(CamelModel):
    title: str | None = None
    description: str | None = None
    url: str | None = None
    organizer: str | None = None
    format: str | None = None
    difficulty: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    city: str | None = None
    region: str | None = None
    lat: float | None = None
    lng: float | None = None
    tags: list[str] | None = None

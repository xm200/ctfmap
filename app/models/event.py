import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EventCategory(str, enum.Enum):
    ELITE = "elite"
    LOCAL = "local"
    TRAINING = "training"


class EventFormat(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    HYBRID = "hybrid"


class EventStatus(str, enum.Enum):
    ACTIVE = "active"
    DRAFT = "draft"
    ARCHIVED = "archived"


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(256))
    short_title: Mapped[str | None] = mapped_column(String(64))

    category: Mapped[EventCategory] = mapped_column(Enum(EventCategory), default=EventCategory.LOCAL)
    difficulty: Mapped[str | None] = mapped_column(String(32))
    format: Mapped[EventFormat] = mapped_column(Enum(EventFormat), default=EventFormat.OFFLINE)

    region_id: Mapped[str | None] = mapped_column(String(128))
    city: Mapped[str | None] = mapped_column(String(128))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)

    rating: Mapped[float] = mapped_column(Float, default=0.0)
    weight: Mapped[int] = mapped_column(Integer, default=0)

    organizer: Mapped[str | None] = mapped_column(String(256))
    url: Mapped[str | None] = mapped_column(String(512))
    registration_url: Mapped[str | None] = mapped_column(String(512))
    ctftime_url: Mapped[str | None] = mapped_column(String(512))
    ctf_news_url: Mapped[str | None] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text)
    full_description: Mapped[str | None] = mapped_column(Text)
    team_size: Mapped[str | None] = mapped_column(String(80))
    task_categories: Mapped[list | None] = mapped_column(JSON, default=list)
    requirements: Mapped[list | None] = mapped_column(JSON, default=list)
    contacts: Mapped[str | None] = mapped_column(String(256))
    tags: Mapped[list | None] = mapped_column(JSON, default=list)

    status: Mapped[EventStatus] = mapped_column(Enum(EventStatus), default=EventStatus.DRAFT)
    source: Mapped[str | None] = mapped_column(String(64), default="manual")

    start_date: Mapped[str | None] = mapped_column(String(32))
    end_date: Mapped[str | None] = mapped_column(String(32))

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

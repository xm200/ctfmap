from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.verification import ReviewStatus


class CompetitionRegistration(Base):
    __tablename__ = "competition_registrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(256))
    short_title: Mapped[str | None] = mapped_column(String(64))
    organizer: Mapped[str | None] = mapped_column(String(256))
    contact: Mapped[str | None] = mapped_column(String(128))
    start_date: Mapped[str | None] = mapped_column(String(32))
    end_date: Mapped[str | None] = mapped_column(String(32))
    format: Mapped[str | None] = mapped_column(String(32))
    category: Mapped[str | None] = mapped_column(String(32))
    difficulty: Mapped[str | None] = mapped_column(String(32))
    city: Mapped[str | None] = mapped_column(String(128))
    region: Mapped[str | None] = mapped_column(String(128))
    url: Mapped[str | None] = mapped_column(String(512))
    registration_url: Mapped[str | None] = mapped_column(String(512))
    ctftime_url: Mapped[str | None] = mapped_column(String(512))
    ctf_news_url: Mapped[str | None] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text)
    full_description: Mapped[str | None] = mapped_column(Text)
    team_size: Mapped[str | None] = mapped_column(String(80))
    task_categories: Mapped[list | None] = mapped_column(JSON, default=list)
    tags: Mapped[list | None] = mapped_column(JSON, default=list)
    requirements: Mapped[list | None] = mapped_column(JSON, default=list)
    status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus), default=ReviewStatus.PENDING)
    comment: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ParsedCompetition(Base):
    __tablename__ = "parsed_competitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(256), index=True)
    url: Mapped[str | None] = mapped_column(String(512))
    start_date: Mapped[datetime] = mapped_column(DateTime)
    location: Mapped[str] = mapped_column(String(256))

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class User(Base):
    pass

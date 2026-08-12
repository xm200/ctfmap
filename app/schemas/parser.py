from datetime import datetime

from pydantic import BaseModel, HttpUrl


class ParsedCompetitionIn(BaseModel):
    name: str
    url: str | None = None
    start_date: datetime | None = None
    location: str | None = None
    source_url: str


class ParsedCompetitionOut(BaseModel):
    id: int
    name: str
    url: str | None
    start_date: datetime | None
    location: str | None
    source_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ParsedCompetitionBatch(BaseModel):
    competitions: list[ParsedCompetitionIn]

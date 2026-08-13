from datetime import datetime

from pydantic import BaseModel


class ParsedCompetitionIn(BaseModel):
    name: str
    url: str | None = None
    start_date: datetime | None = None
    location: str | None = None
    source_url: str
    raw_html: str | None = None


class ParsedCompetitionOut(BaseModel):
    id: int
    name: str
    url: str | None = None
    start_date: datetime | None = None
    location: str | None = None
    source_url: str
    raw_json: str | None = None
    analysis_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ParsedCompetitionBatch(BaseModel):
    competitions: list[ParsedCompetitionIn]

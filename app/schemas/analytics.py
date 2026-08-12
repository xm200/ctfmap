from pydantic import BaseModel


class CompetitionResultIn(BaseModel):
    place: int
    total_participants: int
    level: str
    date: str


class UserRatingRequest(BaseModel):
    results: list[CompetitionResultIn]


class UserRatingResponse(BaseModel):
    rating: float


class CompetitionRatingRequest(BaseModel):
    participant_ratings: list[float]


class CompetitionRatingResponse(BaseModel):
    rating: float

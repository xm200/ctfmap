from pydantic import BaseModel


class CompetitionResultIn(BaseModel):
    place: int
    total_participants: int
    level: str


class UserRatingRequest(BaseModel):
    results: list[CompetitionResultIn]


class UserRatingResponse(BaseModel):
    rating: float


class CompetitionRatingRequest(BaseModel):
    participant_ratings: list[float]


class CompetitionRatingResponse(BaseModel):
    rating: float


class CompetitionForRecommendation(BaseModel):
    id: int
    name: str
    level: str | None = None
    rating: float | None = None


class CompetitionsRecommendationRequest(BaseModel):
    user_rating: float
    competitions: list[CompetitionForRecommendation]


class RecommendedCompetition(BaseModel):
    competition_id: int
    name: str
    level: str | None
    comp_rating: float
    match_score: float
    status: str
    warning: str | None


class CompetitionsRecommendationResponse(BaseModel):
    recommendations: list[RecommendedCompetition]

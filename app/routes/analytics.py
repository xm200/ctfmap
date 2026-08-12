from fastapi import APIRouter

from app.schemas.analytics import (
    CompetitionRatingRequest,
    CompetitionRatingResponse,
    UserRatingRequest,
    UserRatingResponse,
)
from app.services.ranking import competition_rating, user_rating

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.post("/rating/user", response_model=UserRatingResponse)
async def calc_user_rating(req: UserRatingRequest):
    results = [r.model_dump() for r in req.results]
    rating = user_rating(results)
    return UserRatingResponse(rating=rating)


@router.post("/rating/competition", response_model=CompetitionRatingResponse)
async def calc_competition_rating(req: CompetitionRatingRequest):
    rating = competition_rating(req.participant_ratings)
    return CompetitionRatingResponse(rating=rating)

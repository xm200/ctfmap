import json

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.parsed_competition import ParsedCompetition
from app.schemas.parser import ParsedCompetitionBatch, ParsedCompetitionIn, ParsedCompetitionOut

router = APIRouter(prefix="/api/parser", tags=["parser"])


def verify_api_token(x_api_token: str = Header(...)) -> None:
    if x_api_token != settings.PARSER_API_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid API token")


@router.post("/competitions", response_model=list[ParsedCompetitionOut])
async def ingest_competitions(
    batch: ParsedCompetitionBatch,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_token),
):
    created = []
    for item in batch.competitions:
        existing = (
            await db.execute(
                select(ParsedCompetition).where(ParsedCompetition.source_url == item.source_url)
            )
        ).scalar_one_or_none()

        if existing:
            existing.name = item.name
            existing.url = item.url
            existing.start_date = item.start_date
            existing.location = item.location
            existing.raw_json = json.dumps(item.model_dump(), default=str)
            created.append(existing)
        else:
            comp = ParsedCompetition(
                name=item.name,
                url=item.url,
                start_date=item.start_date,
                location=item.location,
                source_url=item.source_url,
                raw_json=json.dumps(item.model_dump(), default=str),
            )
            db.add(comp)
            created.append(comp)

    await db.commit()
    for c in created:
        await db.refresh(c)
    return created


@router.post("/competition", response_model=ParsedCompetitionOut)
async def ingest_single(
    item: ParsedCompetitionIn,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_token),
):
    batch_result = await ingest_competitions(
        ParsedCompetitionBatch(competitions=[item]), db
    )
    return batch_result[0]


@router.get("/competitions", response_model=list[ParsedCompetitionOut])
async def list_competitions(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_token),
):
    result = await db.execute(
        select(ParsedCompetition)
        .order_by(ParsedCompetition.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()

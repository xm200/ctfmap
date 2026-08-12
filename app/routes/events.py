"""Публичное чтение соревнований и приём заявок организаторов."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.event import Event, EventStatus
from app.models.registration import CompetitionRegistration
from app.models.user import User
from app.schemas.admin import RegistrationCreate, RegistrationOut
from app.schemas.event import EventOut
from app.utils.security import get_current_user

router = APIRouter(prefix="/events", tags=["events"])

ALLOWED_REGION_IDS = {
    "RU-AD", "RU-ALT", "RU-AL", "RU-AMU", "RU-ARK", "RU-AST", "RU-BA", "RU-BEL", "RU-BRY",
    "RU-BU", "RU-CE", "RU-CHE", "RU-CHU", "RU-CU", "RU-CR", "RU-DA", "RU-DON", "RU-IN",
    "RU-IRK", "RU-IVA", "RU-YEV", "RU-KB", "RU-KGD", "RU-KL", "RU-KLU", "RU-KAM", "RU-KC",
    "RU-KEM", "RU-KHA", "RU-KK", "RU-KHM", "RU-KIR", "RU-KO", "RU-KOS", "RU-KDA", "RU-KYA",
    "RU-KGN", "RU-KRS", "RU-LEN", "RU-LIP", "RU-LUG", "RU-MAG", "RU-ME", "RU-MOW", "RU-MOS",
    "RU-MUR", "RU-NEN", "RU-NIZ", "RU-SE", "RU-NGR", "RU-NVS", "RU-OMS", "RU-ORE", "RU-ORL",
    "RU-PNZ", "RU-PER", "RU-PRI", "RU-PSK", "RU-KR", "RU-MO", "RU-ROS", "RU-RYA", "RU-SPE",
    "RU-SA", "RU-SAK", "RU-SAM", "RU-SAR", "RU-SMO", "RU-STA", "RU-SVE", "RU-TAM", "RU-TA",
    "RU-TOM", "RU-TUL", "RU-TY", "RU-TVE", "RU-TYU", "RU-UD", "RU-ULY", "RU-VLA", "RU-VGG",
    "RU-VLG", "RU-VOR", "RU-YAN", "RU-YAR", "RU-ZAB", "RU-ZAP", "RU-KHE", "RU-SEV",
}


def _event_out(event: Event) -> dict:
    return EventOut(
        id=str(event.id),
        slug=event.slug,
        title=event.title,
        short_title=event.short_title,
        category=event.category.value if hasattr(event.category, "value") else event.category,
        difficulty=event.difficulty,
        format=event.format.value if hasattr(event.format, "value") else event.format,
        region_id=event.region_id,
        city=event.city,
        lat=event.lat,
        lng=event.lng,
        rating=event.rating,
        weight=event.weight,
        organizer=event.organizer,
        url=event.url,
        registration_url=event.registration_url,
        ctftime_url=event.ctftime_url,
        ctf_news_url=event.ctf_news_url,
        description=event.description,
        full_description=event.full_description,
        team_size=event.team_size,
        task_categories=event.task_categories or [],
        requirements=event.requirements or [],
        contacts=event.contacts,
        tags=event.tags or [],
        status=event.status.value if hasattr(event.status, "value") else event.status,
        source=event.source,
        start_date=event.start_date,
        end_date=event.end_date,
    ).model_dump(by_alias=True)


def _registration_out(registration: CompetitionRegistration) -> dict:
    return RegistrationOut(
        id=str(registration.id),
        title=registration.title,
        short_title=registration.short_title,
        organizer=registration.organizer,
        contact=registration.contact,
        start_date=registration.start_date,
        end_date=registration.end_date,
        format=registration.format,
        category=registration.category,
        difficulty=registration.difficulty,
        city=registration.city,
        region=registration.region,
        url=registration.url,
        registration_url=registration.registration_url,
        ctftime_url=registration.ctftime_url,
        ctf_news_url=registration.ctf_news_url,
        description=registration.description,
        full_description=registration.full_description,
        team_size=registration.team_size,
        task_categories=registration.task_categories or [],
        tags=registration.tags or [],
        requirements=registration.requirements or [],
        status=registration.status.value if hasattr(registration.status, "value") else registration.status,
        comment=registration.comment,
    ).model_dump(by_alias=True)


@router.get("")
async def list_public_events(db: AsyncSession = Depends(get_db)):
    query = select(Event).where(Event.status == EventStatus.ACTIVE).order_by(Event.start_date, Event.id)
    published = (await db.execute(query)).scalars().all()
    return [_event_out(event) for event in published]


@router.post("/registrations", status_code=status.HTTP_201_CREATED)
async def submit_registration(
    request: RegistrationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if request.format not in {"online", "offline", "hybrid"}:
        raise HTTPException(422, detail="Неизвестный формат соревнования")
    if request.category not in {"elite", "local", "training"}:
        raise HTTPException(422, detail="Неизвестная категория соревнования")
    if request.region not in ALLOWED_REGION_IDS:
        raise HTTPException(422, detail="Выберите субъект Российской Федерации из списка")
    try:
        start = date.fromisoformat(request.start_date)
        end = date.fromisoformat(request.end_date)
    except ValueError as exc:
        raise HTTPException(422, detail="Некорректная дата соревнования") from exc
    if start < date.today():
        raise HTTPException(422, detail="Дата начала не может быть в прошлом")
    if end < start:
        raise HTTPException(422, detail="Дата завершения не может быть раньше даты начала")

    registration = CompetitionRegistration(
        title=request.title.strip(),
        short_title=request.short_title.strip(),
        organizer=request.organizer.strip(),
        contact=request.contact.strip(),
        start_date=request.start_date,
        end_date=request.end_date,
        format=request.format,
        category=request.category,
        difficulty=request.difficulty,
        city=request.city.strip(),
        region=request.region,
        url=str(request.url),
        registration_url=str(request.registration_url),
        ctftime_url=str(request.ctftime_url) if request.ctftime_url else None,
        ctf_news_url=str(request.ctf_news_url) if request.ctf_news_url else None,
        description=request.description.strip(),
        full_description=request.full_description.strip(),
        team_size=request.team_size.strip(),
        task_categories=request.task_categories,
        tags=request.tags,
        requirements=request.requirements,
    )
    db.add(registration)
    await db.commit()
    await db.refresh(registration)
    return _registration_out(registration)


@router.get("/{slug}")
async def get_public_event(slug: str, db: AsyncSession = Depends(get_db)):
    query = select(Event).where(Event.slug == slug, Event.status == EventStatus.ACTIVE)
    event = (await db.execute(query)).scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Соревнование не найдено")
    return _event_out(event)

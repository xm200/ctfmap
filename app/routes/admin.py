import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.event import Event, EventCategory, EventFormat, EventStatus
from app.models.registration import CompetitionRegistration
from app.models.user import RefreshToken, User, UserRole
from app.models.verification import ReviewStatus, VerificationTicket
from app.routes.auth import _user_out
from app.schemas.admin import (
    RegistrationOut,
    RegistrationUpdate,
    VerificationTicketOut,
    VerificationUpdate,
)
from app.schemas.event import EventOut, EventUpdate
from app.schemas.user import UserOut, UserUpdate
from app.utils.security import get_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])


def _event_out(e: Event) -> dict:
    return EventOut(
        id=str(e.id),
        slug=e.slug,
        title=e.title,
        short_title=e.short_title,
        category=e.category.value if hasattr(e.category, "value") else e.category,
        difficulty=e.difficulty,
        format=e.format.value if hasattr(e.format, "value") else e.format,
        region_id=e.region_id,
        city=e.city,
        lat=e.lat,
        lng=e.lng,
        rating=e.rating,
        weight=e.weight,
        organizer=e.organizer,
        url=e.url,
        registration_url=e.registration_url,
        ctftime_url=e.ctftime_url,
        ctf_news_url=e.ctf_news_url,
        description=e.description,
        full_description=e.full_description,
        team_size=e.team_size,
        task_categories=e.task_categories or [],
        requirements=e.requirements or [],
        contacts=e.contacts,
        tags=e.tags or [],
        status=e.status.value if hasattr(e.status, "value") else e.status,
        source=e.source,
        start_date=e.start_date,
        end_date=e.end_date,
    ).model_dump(by_alias=True)


def _verification_out(t: VerificationTicket, user: User) -> dict:
    return VerificationTicketOut(
        id=str(t.id),
        user=_user_out(user),
        submitted_at=t.submitted_at.isoformat() + "Z" if t.submitted_at else "",
        status=t.status.value if hasattr(t.status, "value") else t.status,
        details=t.details,
        contact=t.contact,
        comment=t.comment,
    ).model_dump(by_alias=True)


def _registration_out(r: CompetitionRegistration) -> dict:
    return RegistrationOut(
        id=str(r.id),
        title=r.title,
        short_title=r.short_title,
        organizer=r.organizer,
        contact=r.contact,
        start_date=r.start_date,
        end_date=r.end_date,
        format=r.format,
        category=r.category,
        difficulty=r.difficulty,
        city=r.city,
        region=r.region,
        url=r.url,
        registration_url=r.registration_url,
        ctftime_url=r.ctftime_url,
        ctf_news_url=r.ctf_news_url,
        description=r.description,
        full_description=r.full_description,
        team_size=r.team_size,
        task_categories=r.task_categories or [],
        tags=r.tags or [],
        requirements=r.requirements or [],
        status=r.status.value if hasattr(r.status, "value") else r.status,
        comment=r.comment,
    ).model_dump(by_alias=True)


# --- Events ---

@router.get("/events")
async def list_events(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    events = (await db.execute(select(Event))).scalars().all()
    return [_event_out(e) for e in events]


@router.get("/events/{event_id}")
async def get_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(404, detail="Соревнование не найдено")
    return _event_out(event)


@router.patch("/events/{event_id}")
async def update_event(
    event_id: int,
    req: EventUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(404, detail="Соревнование не найдено")

    updates = req.model_dump(exclude_unset=True)
    if "region" in updates:
        event.region_id = updates.pop("region")
    for field, value in updates.items():
        if hasattr(event, field):
            setattr(event, field, value)

    await db.commit()
    await db.refresh(event)
    return _event_out(event)


# --- Users ---

@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    users = (await db.execute(select(User))).scalars().all()
    return [_user_out(u).model_dump(by_alias=True) for u in users]


@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="Пользователь не найден")
    return _user_out(user).model_dump(by_alias=True)


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    req: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="Пользователь не найден")

    updates = req.model_dump(exclude_unset=True)
    if updates.get("banned") is True and user.id == admin.id:
        raise HTTPException(409, detail="Администратор не может заблокировать собственную учётную запись")
    if "role" in updates:
        updates["role"] = UserRole(updates["role"])
    if "organization" in updates:
        user.team = updates.pop("organization")
    for field, value in updates.items():
        if hasattr(user, field):
            setattr(user, field, value)

    if user.banned:
        await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))

    await db.commit()
    await db.refresh(user)
    return _user_out(user).model_dump(by_alias=True)


@router.patch("/events/{event_id}/cancel")
async def cancel_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(404, detail="Соревнование не найдено")
    if event.status != EventStatus.ACTIVE:
        raise HTTPException(409, detail="Отменить можно только активное соревнование")

    event.status = EventStatus.ARCHIVED
    await db.commit()
    await db.refresh(event)
    return _event_out(event)


# --- Verification ---

@router.get("/verification")
async def list_verification(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    tickets = (await db.execute(select(VerificationTicket))).scalars().all()
    result = []
    for t in tickets:
        user = await db.get(User, t.user_id)
        if user:
            result.append(_verification_out(t, user))
    return result


@router.patch("/verification/{ticket_id}")
async def update_verification(
    ticket_id: int,
    req: VerificationUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    ticket = await db.get(VerificationTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, detail="Заявка не найдена")
    if ticket.status != ReviewStatus.PENDING:
        raise HTTPException(409, detail="Заявка уже обработана")
    if req.status not in {"approved", "rejected"}:
        raise HTTPException(422, detail="Недопустимый статус заявки")
    if req.status == "rejected" and not req.comment:
        raise HTTPException(422, detail="Для отклонения требуется комментарий")

    ticket.status = ReviewStatus(req.status)
    ticket.comment = req.comment

    if req.status == "approved":
        user = await db.get(User, ticket.user_id)
        if user:
            user.verified = True

    await db.commit()
    await db.refresh(ticket)
    user = await db.get(User, ticket.user_id)
    return _verification_out(ticket, user)


# --- Registrations ---

@router.get("/registrations")
async def list_registrations(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    regs = (await db.execute(select(CompetitionRegistration))).scalars().all()
    return [_registration_out(r) for r in regs]


@router.patch("/registrations/{reg_id}")
async def update_registration(
    reg_id: int,
    req: RegistrationUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    reg = await db.get(CompetitionRegistration, reg_id)
    if not reg:
        raise HTTPException(404, detail="Заявка не найдена")
    if reg.status != ReviewStatus.PENDING:
        raise HTTPException(409, detail="Заявка уже обработана")
    if req.status not in {"approved", "rejected"}:
        raise HTTPException(422, detail="Недопустимый статус заявки")
    if req.status == "rejected" and not req.comment:
        raise HTTPException(422, detail="Для отклонения требуется комментарий")

    reg.status = ReviewStatus(req.status)
    reg.comment = req.comment

    if req.status == "approved":
        base_slug = re.sub(r"[^a-z0-9]+", "-", (reg.short_title or reg.title).lower()).strip("-")
        base_slug = base_slug or f"ctf-event-{reg.id}"
        slug = base_slug
        suffix = 2
        while (await db.execute(select(Event.id).where(Event.slug == slug))).scalar_one_or_none():
            slug = f"{base_slug}-{suffix}"
            suffix += 1

        event = Event(
            slug=slug,
            title=reg.title,
            short_title=reg.short_title,
            category=EventCategory(reg.category or "local"),
            difficulty=reg.difficulty,
            format=EventFormat(reg.format or "offline"),
            region_id=reg.region,
            city=reg.city,
            rating=0.0,
            weight=0,
            organizer=reg.organizer,
            url=reg.url,
            registration_url=reg.registration_url,
            ctftime_url=reg.ctftime_url,
            ctf_news_url=reg.ctf_news_url,
            description=reg.description,
            full_description=reg.full_description,
            team_size=reg.team_size,
            task_categories=reg.task_categories or [],
            requirements=reg.requirements or [],
            contacts=reg.contact,
            tags=reg.tags or [],
            status=EventStatus.ACTIVE,
            source="application",
            start_date=reg.start_date,
            end_date=reg.end_date,
        )
        db.add(event)

    await db.commit()
    await db.refresh(reg)
    return _registration_out(reg)

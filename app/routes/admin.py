from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.event import Event
from app.models.registration import CompetitionRegistration
from app.models.user import User
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
        description=e.description,
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
        organizer=r.organizer,
        contact=r.contact,
        start_date=r.start_date,
        end_date=r.end_date,
        format=r.format,
        city=r.city,
        region=r.region,
        url=r.url,
        description=r.description,
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
        raise HTTPException(404, detail="Event not found")
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
        raise HTTPException(404, detail="Event not found")

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
        raise HTTPException(404, detail="User not found")
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
        raise HTTPException(404, detail="User not found")

    updates = req.model_dump(exclude_unset=True)
    if "organization" in updates:
        user.team = updates.pop("organization")
    for field, value in updates.items():
        if hasattr(user, field):
            setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return _user_out(user).model_dump(by_alias=True)


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
        raise HTTPException(404, detail="Ticket not found")
    if ticket.status != ReviewStatus.PENDING:
        raise HTTPException(409, detail="Ticket already processed")
    if req.status == "rejected" and not req.comment:
        raise HTTPException(422, detail="Comment required for rejection")

    ticket.status = req.status
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
        raise HTTPException(404, detail="Registration not found")
    if reg.status != ReviewStatus.PENDING:
        raise HTTPException(409, detail="Registration already processed")
    if req.status == "rejected" and not req.comment:
        raise HTTPException(422, detail="Comment required for rejection")

    reg.status = req.status
    reg.comment = req.comment

    await db.commit()
    await db.refresh(reg)
    return _registration_out(reg)

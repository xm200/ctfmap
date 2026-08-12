from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import RefreshToken, User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, SessionOut
from app.schemas.user import UserOut
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=str(user.id),
        username=user.username,
        email=user.email,
        role=user.role.value if hasattr(user.role, "value") else user.role,
        verified=user.verified,
        banned=user.banned,
        created_at=user.created_at.isoformat() + "Z" if user.created_at else "",
        organization=user.team,
        telegram=user.telegram,
    )


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        raw_token,
        httponly=True,
        samesite="lax",
        path="/api",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path="/api")


@router.post("/register", status_code=204)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    username = req.username.strip()
    email = req.email.strip().lower()

    if len(username) < 3 or len(username) > 64:
        raise HTTPException(422, detail="Имя пользователя должно содержать от 3 до 64 символов")
    if len(req.password) < 12 or len(req.password) > 128:
        raise HTTPException(422, detail="Пароль должен содержать от 12 до 128 символов")

    existing = (
        await db.execute(
            select(User).where(
                or_(
                    func.lower(User.username) == username.lower(),
                    func.lower(User.email) == email,
                )
            )
        )
    ).scalar_one_or_none()

    if existing:
        field = "Адрес электронной почты" if existing.email == email else "Имя пользователя"
        raise HTTPException(409, detail=f"{field} уже используется")

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    await db.commit()


@router.post("/login")
async def login(req: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    identifier = req.identifier.strip().lower()
    user = (
        await db.execute(
            select(User).where(
                or_(
                    func.lower(User.email) == identifier,
                    func.lower(User.username) == identifier,
                )
            )
        )
    ).scalars().first()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, detail="Неверное имя пользователя, адрес электронной почты или пароль")
    if user.banned:
        raise HTTPException(403, detail="Учётная запись заблокирована администратором")

    access_token, expires_at = create_access_token(user.id, user.role.value)
    raw_refresh, refresh_hash, refresh_expires = create_refresh_token()

    db.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=refresh_expires))
    await db.commit()

    _set_refresh_cookie(response, raw_refresh)

    return AuthResponse(
        access_token=access_token,
        session=SessionOut(
            user=_user_out(user),
            expires_at=expires_at.isoformat() + "Z",
        ),
    ).model_dump(by_alias=True)


@router.post("/refresh")
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(None),
):
    if not refresh_token:
        raise HTTPException(401, detail="Токен обновления отсутствует")

    token_hash = hash_refresh_token(refresh_token)
    stored = (
        await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    ).scalar_one_or_none()

    if not stored or stored.expires_at < datetime.utcnow():
        _clear_refresh_cookie(response)
        raise HTTPException(401, detail="Токен обновления недействителен или истёк")

    user = await db.get(User, stored.user_id)
    if not user:
        await db.delete(stored)
        await db.commit()
        _clear_refresh_cookie(response)
        raise HTTPException(401, detail="Пользователь не найден")
    if user.banned:
        await db.delete(stored)
        await db.commit()
        _clear_refresh_cookie(response)
        raise HTTPException(403, detail="Учётная запись заблокирована администратором")

    await db.delete(stored)
    raw_new, hash_new, expires_new = create_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=hash_new, expires_at=expires_new))
    await db.commit()

    access_token, expires_at = create_access_token(user.id, user.role.value)
    _set_refresh_cookie(response, raw_new)

    return AuthResponse(
        access_token=access_token,
        session=SessionOut(
            user=_user_out(user),
            expires_at=expires_at.isoformat() + "Z",
        ),
    ).model_dump(by_alias=True)


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(None),
):
    if refresh_token:
        token_hash = hash_refresh_token(refresh_token)
        stored = (
            await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        ).scalar_one_or_none()
        if stored:
            await db.delete(stored)
            await db.commit()
    _clear_refresh_cookie(response)

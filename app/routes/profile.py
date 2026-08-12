from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routes.auth import _user_out
from app.schemas.user import PasswordChange, ProfileUpdate, UserOut
from app.utils.security import get_current_user, hash_password, verify_password

router = APIRouter(prefix="/users", tags=["profile"])


@router.get("/me")
async def get_profile(user: User = Depends(get_current_user)):
    return _user_out(user).model_dump(by_alias=True)


@router.patch("/me")
async def update_profile(
    req: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.email is not None:
        email = req.email.strip().lower()
        existing = (
            await db.execute(select(User).where(User.email == email, User.id != user.id))
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(409, detail="Адрес электронной почты уже используется")
        user.email = email
    if req.telegram is not None:
        user.telegram = req.telegram if req.telegram else None
    if req.team is not None:
        user.team = req.team if req.team else None

    await db.commit()
    await db.refresh(user)
    return _user_out(user).model_dump(by_alias=True)


@router.post("/me/password", status_code=204)
async def change_password(
    req: PasswordChange,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(401, detail="Неверный текущий пароль")
    if len(req.new_password) < 12 or len(req.new_password) > 128:
        raise HTTPException(422, detail="Пароль должен содержать от 12 до 128 символов")
    if req.current_password == req.new_password:
        raise HTTPException(422, detail="Новый пароль должен отличаться от текущего")

    user.password_hash = hash_password(req.new_password)
    await db.commit()

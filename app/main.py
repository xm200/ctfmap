from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.config import settings
from app.database import engine, Base, async_session
from app.database_compat import ensure_extended_event_columns
from app.models.user import User, UserRole
from app.routes import admin, analytics, auth, events, parser, profile
from app.utils.security import hash_password


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(ensure_extended_event_columns)

    async with async_session() as db:
        existing = (await db.execute(select(User).where(User.username == "admin"))).scalar_one_or_none()
        if not existing:
            existing = User(
                username="admin",
                email="admin@ctfmap.local",
            )
            db.add(existing)

        # Тестовая учётная запись должна оставаться доступной с фиксированными
        # реквизитами даже при повторном использовании существующей БД.
        existing.password_hash = hash_password("admin")
        existing.role = UserRole.ADMIN
        existing.verified = True
        existing.banned = False
        await db.commit()
        print("Тестовая учётная запись администратора готова: admin / admin")

    print(f"PARSER_API_TOKEN: {settings.PARSER_API_TOKEN}")
    yield


app = FastAPI(title="ctfmap", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    from fastapi.exceptions import HTTPException as FastAPIHTTPException

    if isinstance(exc, FastAPIHTTPException):
        body = {"message": exc.detail}
        if hasattr(exc, "code"):
            body["code"] = exc.code
        return JSONResponse(status_code=exc.status_code, content=body)

    return JSONResponse(status_code=500, content={"message": "Внутренняя ошибка сервера"})


app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(parser.router)
app.include_router(analytics.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

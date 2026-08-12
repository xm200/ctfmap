from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.config import settings
from app.database import engine, Base, async_session
from app.models.user import User
from app.routes import admin, analytics, auth, parser, profile
from app.utils.security import hash_password


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        existing = (await db.execute(select(User).where(User.username == "admin"))).scalar_one_or_none()
        if not existing:
            db.add(User(
                username="admin",
                email="admin@ctfmap.local",
                password_hash=hash_password("admin"),
                role="admin",
                verified=True,
            ))
            await db.commit()
            print("Seeded admin user: admin / admin")

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

    return JSONResponse(status_code=500, content={"message": "Internal server error"})


app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(parser.router)
app.include_router(analytics.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
